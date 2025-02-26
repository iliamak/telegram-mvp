import { useState, useEffect, useRef } from 'react';

function Chat({ client, chat, onBack }) {
  const [messages, setMessages] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [messageText, setMessageText] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [file, setFile] = useState(null);
  const messagesEndRef = useRef(null);
  const fileInputRef = useRef(null);

  useEffect(() => {
    const fetchMessages = async () => {
      try {
        const result = await client.send({
          '@type': 'getChatHistory',
          'chat_id': chat.id,
          'limit': 50,
          'offset': 0,
          'from_message_id': 0,
          'only_local': false
        });
        
        setMessages(result.messages.reverse());
      } catch (err) {
        setError('Не удалось загрузить сообщения');
        console.error(err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchMessages();
    
    // Слушаем новые сообщения
    const updateHandler = client.onUpdate((update) => {
      if (update['@type'] === 'updateNewMessage' && update.message.chat_id === chat.id) {
        setMessages(prev => [...prev, update.message]);
        scrollToBottom();
      }
    });
    
    return () => {
      if (updateHandler) updateHandler();
    };
  }, [client, chat.id]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const sendMessage = async () => {
    if (!messageText.trim() && !file) return;
    
    setIsSending(true);
    
    try {
      if (file) {
        // Загружаем файл
        const fileBlob = new Blob([file], { type: file.type });
        
        // Определяем тип сообщения на основе типа файла
        if (file.type.startsWith('image/')) {
          // Отправка изображения
          const fileResult = await client.send({
            '@type': 'uploadFile',
            'file': fileBlob,
            'file_type': { '@type': 'fileTypePhoto' },
            'priority': 1
          });
          
          await client.send({
            '@type': 'sendMessage',
            'chat_id': chat.id,
            'input_message_content': {
              '@type': 'inputMessagePhoto',
              'photo': {
                '@type': 'inputFileLocal',
                'path': fileResult.local.path
              },
              'caption': {
                '@type': 'formattedText',
                'text': messageText || ''
              }
            }
          });
        } else if (file.type.startsWith('video/')) {
          // Отправка видео
          const fileResult = await client.send({
            '@type': 'uploadFile',
            'file': fileBlob,
            'file_type': { '@type': 'fileTypeVideo' },
            'priority': 1
          });
          
          await client.send({
            '@type': 'sendMessage',
            'chat_id': chat.id,
            'input_message_content': {
              '@type': 'inputMessageVideo',
              'video': {
                '@type': 'inputFileLocal',
                'path': fileResult.local.path
              },
              'caption': {
                '@type': 'formattedText',
                'text': messageText || ''
              }
            }
          });
        } else {
          // Отправка документа для остальных типов файлов
          const fileResult = await client.send({
            '@type': 'uploadFile',
            'file': fileBlob,
            'file_type': { '@type': 'fileTypeDocument' },
            'priority': 1
          });
          
          await client.send({
            '@type': 'sendMessage',
            'chat_id': chat.id,
            'input_message_content': {
              '@type': 'inputMessageDocument',
              'document': {
                '@type': 'inputFileLocal',
                'path': fileResult.local.path
              },
              'caption': {
                '@type': 'formattedText',
                'text': messageText || ''
              }
            }
          });
        }
        
        setFile(null);
      } else {
        // Отправка текстового сообщения
        await client.send({
          '@type': 'sendMessage',
          'chat_id': chat.id,
          'input_message_content': {
            '@type': 'inputMessageText',
            'text': {
              '@type': 'formattedText',
              'text': messageText
            }
          }
        });
      }
      
      setMessageText('');
    } catch (err) {
      alert('Ошибка при отправке сообщения');
      console.error(err);
    } finally {
      setIsSending(false);
    }
  };

  const handleFileChange = (e) => {
    if (e.target.files.length > 0) {
      setFile(e.target.files[0]);
    }
  };

  const formatMessageContent = (message) => {
    if (!message || !message.content) return '';
    
    if (message.content['@type'] === 'messageText') {
      return message.content.text.text;
    } else if (message.content['@type'] === 'messagePhoto') {
      return (
        <div>
          <img 
            src={message.content.photo.sizes[message.content.photo.sizes.length - 1].photo.remote.id} 
            alt="Фото" 
            className="max-w-full rounded"
            onError={(e) => {
              e.target.onerror = null;
              e.target.src = 'https://via.placeholder.com/300?text=Фото';
            }}
          />
          {message.content.caption && message.content.caption.text && (
            <p className="mt-1 text-sm">{message.content.caption.text}</p>
          )}
        </div>
      );
    } else if (message.content['@type'] === 'messageVideo') {
      return (
        <div>
          <div className="w-full h-48 bg-gray-300 rounded flex items-center justify-center">
            <span>🎥 Видео</span>
          </div>
          {message.content.caption && message.content.caption.text && (
            <p className="mt-1 text-sm">{message.content.caption.text}</p>
          )}
        </div>
      );
    } else if (message.content['@type'] === 'messageDocument') {
      return (
        <div className="p-2 bg-blue-100 rounded">
          <div className="flex items-center">
            <span className="mr-2">📄</span>
            <span>{message.content.document.file_name || 'Документ'}</span>
          </div>
          {message.content.caption && message.content.caption.text && (
            <p className="mt-1 text-sm">{message.content.caption.text}</p>
          )}
        </div>
      );
    } else if (message.content['@type'] === 'messageVoiceNote') {
      return <div className="p-2 bg-gray-100 rounded">🎤 Голосовое сообщение</div>;
    } else if (message.content['@type'] === 'messageSticker') {
      return <div className="p-2">🔖 Стикер</div>;
    } else {
      return <div className="p-2 bg-gray-100 rounded">Неподдерживаемый тип сообщения</div>;
    }
  };

  return (
    <div className="flex flex-col h-screen bg-gray-100">
      {/* Заголовок чата */}
      <div className="bg-blue-500 p-3 text-white flex items-center">
        <button 
          onClick={onBack}
          className="mr-3 text-white"
        >
          ←
        </button>
        <div className="w-10 h-10 rounded-full bg-gray-300 flex-shrink-0 overflow-hidden mr-3">
          {chat.photo ? (
            <img 
              src={chat.photo.small.remote.id} 
              alt={chat.title} 
              className="w-full h-full object-cover"
              onError={(e) => {
                e.target.onerror = null;
                e.target.src = 'https://via.placeholder.com/40';
              }}
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-blue-400 text-white font-bold">
              {chat.title.charAt(0)}
            </div>
          )}
        </div>
        <h1 className="text-lg font-bold truncate">{chat.title}</h1>
      </div>
      
      {/* Сообщения */}
      <div className="flex-grow overflow-y-auto p-4">
        {isLoading ? (
          <div className="flex items-center justify-center h-full">
            <div className="loader">Загрузка сообщений...</div>
          </div>
        ) : error ? (
          <div className="p-4 text-red-500 text-center">
            {error}
          </div>
        ) : messages.length === 0 ? (
          <div className="p-4 text-center text-gray-500">
            Нет сообщений. Начните общение!
          </div>
        ) : (
          <div>
            {messages.map((message) => {
              const isOutgoing = message.is_outgoing;
              
              return (
                <div 
                  key={message.id} 
                  className={`mb-4 flex ${isOutgoing ? 'justify-end' : 'justify-start'}`}
                >
                  <div 
                    className={`max-w-xs md:max-w-md p-3 rounded-lg ${
                      isOutgoing ? 'bg-blue-100' : 'bg-white border border-gray-200'
                    }`}
                  >
                    {formatMessageContent(message)}
                    <div className="text-right mt-1">
                      <span className="text-xs text-gray-500">
                        {new Date(message.date * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
            <div ref={messagesEndRef} />
          </div>
        )}
      </div>
      
      {/* Форма отправки сообщения */}
      <div className="p-3 bg-white border-t border-gray-200">
        {file && (
          <div className="mb-2 p-2 bg-gray-100 rounded flex justify-between items-center">
            <span className="truncate">{file.name}</span>
            <button 
              onClick={() => setFile(null)}
              className="ml-2 text-red-500"
            >
              ✕
            </button>
          </div>
        )}
        <div className="flex">
          <button
            onClick={() => fileInputRef.current.click()}
            className="px-3 py-2 bg-gray-200 rounded-l"
            disabled={isSending}
          >
            📎
          </button>
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileChange}
            className="hidden"
          />
          <input
            type="text"
            value={messageText}
            onChange={(e) => setMessageText(e.target.value)}
            placeholder="Сообщение..."
            className="flex-grow px-3 py-2 border-t border-b border-gray-300 focus:outline-none"
            disabled={isSending}
            onKeyPress={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                sendMessage();
              }
            }}
          />
          <button
            onClick={sendMessage}
            disabled={isSending || (!messageText.trim() && !file)}
            className="px-3 py-2 bg-blue-500 text-white rounded-r disabled:opacity-50"
          >
            {isSending ? "⏳" : "→"}
          </button>
        </div>
      </div>
    </div>
  );
}

export default Chat;