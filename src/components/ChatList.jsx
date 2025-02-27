import { useState, useEffect, useCallback } from 'react';

function ChatList({ client, onChatSelect }) {
  const [chats, setChats] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Выносим функцию загрузки чатов для возможности повторного вызова
  const fetchChats = useCallback(async () => {
    try {
      // Получаем список чатов
      const result = await client.send({
        '@type': 'getChats',
        'offset_order': '9223372036854775807',
        'offset_chat_id': 0,
        'limit': 100
      });
      
      // Для каждого чата получаем детальную информацию
      const chatsWithDetails = await Promise.all(
        result.chat_ids.map(async (chatId) => {
          const chatInfo = await client.send({
            '@type': 'getChat',
            'chat_id': chatId
          });
          
          // Получаем последнее сообщение
          let lastMessage = null;
          try {
            const messages = await client.send({
              '@type': 'getChatHistory',
              'chat_id': chatId,
              'limit': 1,
              'offset': 0,
              'from_message_id': 0
            });
            
            if (messages.messages.length > 0) {
              lastMessage = messages.messages[0];
            }
          } catch (e) {
            console.error(`Ошибка при получении сообщений для чата ${chatId}:`, e);
          }
          
          return {
            ...chatInfo,
            lastMessage
          };
        })
      );
      
      setChats(chatsWithDetails);
      setError('');
    } catch (err) {
      setError('Не удалось загрузить список чатов');
      console.error('Ошибка при загрузке чатов:', err);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [client]);

  // Инициализация чатов при монтировании компонента
  useEffect(() => {
    fetchChats();
    
    // Слушаем обновления чатов
    const updateHandler = client.onUpdate((update) => {
      if (
        update['@type'] === 'updateNewMessage' || 
        update['@type'] === 'updateChatLastMessage' || 
        update['@type'] === 'updateChatReadInbox'
      ) {
        // Обновляем список чатов при получении нового сообщения или обновлении состояния чата
        // Устанавливаем флаг обновления, чтобы показать индикатор
        setIsRefreshing(true);
        fetchChats();
      }
    });
    
    return () => {
      // Отписываемся от обновлений
      if (updateHandler) updateHandler();
    };
  }, [client, fetchChats]);

  // Обработчик ручного обновления списка чатов
  const handleRefresh = () => {
    setIsRefreshing(true);
    fetchChats();
  };

  // Функция для форматирования последнего сообщения
  const formatLastMessage = (message) => {
    if (!message) return '';
    
    if (message.content['@type'] === 'messageText') {
      return message.content.text.text.substring(0, 50) + (message.content.text.text.length > 50 ? '...' : '');
    } else if (message.content['@type'] === 'messagePhoto') {
      return '🖼️ Фото';
    } else if (message.content['@type'] === 'messageVideo') {
      return '🎥 Видео';
    } else if (message.content['@type'] === 'messageDocument') {
      return '📄 Документ';
    } else if (message.content['@type'] === 'messageSticker') {
      return '🔖 Стикер';
    } else if (message.content['@type'] === 'messageVoiceNote') {
      return '🎤 Голосовое сообщение';
    } else {
      return 'Сообщение';
    }
  };

  // Функция для отображения времени последнего сообщения
  const formatTime = (timestamp) => {
    if (!timestamp) return '';
    
    const date = new Date(timestamp * 1000);
    const now = new Date();
    
    // Если сообщение сегодня, показываем только время
    if (date.toDateString() === now.toDateString()) {
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }
    
    // Если сообщение вчера
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    if (date.toDateString() === yesterday.toDateString()) {
      return 'Вчера';
    }
    
    // Для более старых сообщений показываем дату
    return date.toLocaleDateString();
  };

  return (
    <div className="flex flex-col h-screen bg-gray-100">
      <div className="bg-blue-500 p-4 text-white flex justify-between items-center">
        <h1 className="text-xl font-bold">Telegram MVP</h1>
        {!isLoading && (
          <button 
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="text-sm bg-blue-600 hover:bg-blue-700 px-3 py-1 rounded transition-colors disabled:opacity-50"
          >
            {isRefreshing ? "Обновление..." : "Обновить"}
          </button>
        )}
      </div>
      
      {isLoading ? (
        <div className="flex items-center justify-center flex-grow">
          <div className="loader">Загрузка чатов...</div>
        </div>
      ) : error ? (
        <div className="p-4 text-red-500 text-center">
          {error}
          <button 
            onClick={handleRefresh}
            className="block mx-auto mt-4 bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 transition-colors"
          >
            Повторить
          </button>
        </div>
      ) : (
        <div className="flex-grow overflow-y-auto">
          {/* Индикатор обновления чатов */}
          {isRefreshing && !isLoading && (
            <div className="p-2 text-center text-blue-500 bg-blue-50 border-b border-blue-100">
              <span className="inline-block animate-spin mr-2">↻</span>
              Обновление чатов...
            </div>
          )}
          
          {chats.length === 0 ? (
            <div className="p-4 text-center text-gray-500">
              У вас пока нет чатов
            </div>
          ) : (
            <ul>
              {chats.map((chat) => (
                <li 
                  key={chat.id}
                  onClick={() => onChatSelect(chat)}
                  className="hover:bg-gray-200 cursor-pointer border-b border-gray-200 transition-colors"
                >
                  <div className="flex items-center p-4">
                    <div className="w-12 h-12 rounded-full bg-gray-300 flex-shrink-0 overflow-hidden">
                      {/* Аватар чата */}
                      {chat.photo ? (
                        <img 
                          src={chat.photo.small.remote.id} 
                          alt={chat.title} 
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            e.target.onerror = null;
                            e.target.src = 'https://via.placeholder.com/48';
                          }}
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center bg-blue-400 text-white font-bold">
                          {chat.title.charAt(0)}
                        </div>
                      )}
                    </div>
                    
                    <div className="ml-4 flex-grow">
                      <div className="flex justify-between">
                        <span className="font-semibold">{chat.title}</span>
                        <span className="text-xs text-gray-500">
                          {chat.lastMessage ? formatTime(chat.lastMessage.date) : ''}
                        </span>
                      </div>
                      <p className="text-sm text-gray-600 mt-1 truncate">
                        {chat.lastMessage ? formatLastMessage(chat.lastMessage) : ''}
                      </p>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}

export default ChatList;