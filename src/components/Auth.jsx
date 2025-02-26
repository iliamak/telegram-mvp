import { useState, useEffect, useRef } from 'react';
import TdClient from 'tdweb';

function Auth({ onAuthenticated }) {
  const [phoneNumber, setPhoneNumber] = useState('');
  const [verificationCode, setVerificationCode] = useState('');
  const [step, setStep] = useState('phone'); // 'phone' или 'code'
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [client, setClient] = useState(null);
  const [logs, setLogs] = useState([]);
  const logsRef = useRef(null);

  // Функция для добавления логов
  const addLog = (message, type = 'info') => {
    const timestamp = new Date().toLocaleTimeString();
    setLogs(prevLogs => [...prevLogs, { message, type, timestamp }]);
    
    // Прокрутка вниз при новых логах
    setTimeout(() => {
      if (logsRef.current) {
        logsRef.current.scrollTop = logsRef.current.scrollHeight;
      }
    }, 100);
  };

  useEffect(() => {
    addLog('Инициализация TDLib клиента...');
    
    try {
      // Проверяем, что переменные окружения доступны
      if (!import.meta.env.VITE_TELEGRAM_API_ID || !import.meta.env.VITE_TELEGRAM_API_HASH) {
        addLog('Ошибка: API_ID или API_HASH не найдены в переменных окружения', 'error');
        setError('Ошибка инициализации: Отсутствуют ключи API. Проверьте настройки проекта.');
        return;
      }
      
      addLog(`API ID: ${import.meta.env.VITE_TELEGRAM_API_ID}`);
      
      // Создаем TDLib клиент
      const tdLibClient = new TdClient({
        apiId: parseInt(import.meta.env.VITE_TELEGRAM_API_ID),
        apiHash: import.meta.env.VITE_TELEGRAM_API_HASH,
        logVerbosityLevel: 2,
        jsLogVerbosityLevel: 'info',
        mode: 'wasm',
        onUpdate: update => {
          if (update['@type'] === 'updateAuthorizationState') {
            addLog(`Обновление статуса авторизации: ${update.authorization_state['@type']}`);
          }
        }
      });
      
      addLog('TDLib клиент успешно создан');
      setClient(tdLibClient);
      
      // Проверяем, авторизован ли уже пользователь
      tdLibClient.send({
        '@type': 'getAuthorizationState'
      }).then(authState => {
        addLog(`Получен текущий статус авторизации: ${authState['@type']}`);
        if (authState['@type'] === 'authorizationStateReady') {
          addLog('Пользователь уже авторизован, переход к списку чатов');
          onAuthenticated(tdLibClient);
        }
      }).catch(err => {
        addLog(`Ошибка при проверке статуса авторизации: ${err.message}`, 'error');
      });
    } catch (err) {
      addLog(`Критическая ошибка при инициализации: ${err.message}`, 'error');
      setError(`Ошибка инициализации: ${err.message}`);
    }
  }, [onAuthenticated]);

  const sendPhoneNumber = async () => {
    setIsLoading(true);
    setError('');
    addLog(`Отправка номера телефона: ${phoneNumber}`);
    
    try {
      await client.send({
        '@type': 'setAuthenticationPhoneNumber',
        'phone_number': phoneNumber,
        'settings': {
          '@type': 'phoneNumberAuthenticationSettings',
          'allow_flash_call': false,
          'allow_missed_call': false,
          'is_current_phone_number': true,
          'allow_sms_retriever_api': false
        }
      });
      
      addLog('Запрос на номер телефона успешно отправлен, ожидание кода');
      setStep('code');
    } catch (err) {
      const errorMessage = err.message || 'Неизвестная ошибка';
      addLog(`Ошибка при отправке номера: ${errorMessage}`, 'error');
      setError('Ошибка при отправке номера телефона. Проверьте формат и попробуйте снова.');
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const sendVerificationCode = async () => {
    setIsLoading(true);
    setError('');
    addLog(`Отправка кода подтверждения: ${verificationCode}`);
    
    try {
      await client.send({
        '@type': 'checkAuthenticationCode',
        'code': verificationCode
      });
      
      addLog('Аутентификация успешна, переход к списку чатов');
      // Если мы здесь, значит, аутентификация прошла успешно
      onAuthenticated(client);
    } catch (err) {
      const errorMessage = err.message || 'Неизвестная ошибка';
      addLog(`Ошибка при проверке кода: ${errorMessage}`, 'error');
      setError('Неверный код. Попробуйте снова.');
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  // Переключатель для отображения/скрытия логов
  const [showLogs, setShowLogs] = useState(true);
  const toggleLogs = () => setShowLogs(prev => !prev);

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-100 p-4">
      <div className="bg-white p-8 rounded-lg shadow-md w-full max-w-md">
        <h1 className="text-2xl font-bold text-center mb-6">Вход в Telegram MVP</h1>
        
        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
            {error}
          </div>
        )}
        
        {step === 'phone' ? (
          <div>
            <label className="block text-gray-700 text-sm font-bold mb-2">
              Номер телефона
            </label>
            <input
              type="tel"
              value={phoneNumber}
              onChange={(e) => setPhoneNumber(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="+79001234567"
              disabled={isLoading}
            />
            <button
              onClick={sendPhoneNumber}
              disabled={isLoading || !phoneNumber}
              className="w-full mt-4 bg-blue-500 hover:bg-blue-600 text-white font-bold py-2 px-4 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
            >
              {isLoading ? 'Отправка...' : 'Отправить код'}
            </button>
          </div>
        ) : (
          <div>
            <label className="block text-gray-700 text-sm font-bold mb-2">
              Код подтверждения
            </label>
            <input
              type="text"
              value={verificationCode}
              onChange={(e) => setVerificationCode(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="12345"
              disabled={isLoading}
            />
            <button
              onClick={sendVerificationCode}
              disabled={isLoading || !verificationCode}
              className="w-full mt-4 bg-blue-500 hover:bg-blue-600 text-white font-bold py-2 px-4 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
            >
              {isLoading ? 'Проверка...' : 'Войти'}
            </button>
            <button
              onClick={() => setStep('phone')}
              className="w-full mt-2 bg-gray-200 hover:bg-gray-300 text-gray-800 font-bold py-2 px-4 rounded focus:outline-none focus:ring-2 focus:ring-gray-500"
              disabled={isLoading}
            >
              Назад
            </button>
          </div>
        )}
        
        {/* Кнопка для переключения логов */}
        <div className="mt-4 text-center">
          <button 
            onClick={toggleLogs}
            className="text-sm text-blue-500 hover:text-blue-700"
          >
            {showLogs ? 'Скрыть логи' : 'Показать логи'}
          </button>
        </div>
        
        {/* Лог-консоль */}
        {showLogs && (
          <div className="mt-4">
            <div 
              ref={logsRef}
              className="p-2 bg-gray-900 text-gray-200 rounded text-xs font-mono h-40 overflow-y-auto"
            >
              {logs.length === 0 ? (
                <div className="text-gray-500">Логи загрузки будут отображаться здесь...</div>
              ) : (
                logs.map((log, index) => (
                  <div 
                    key={index} 
                    className={`mb-1 ${
                      log.type === 'error' ? 'text-red-400' : 
                      log.type === 'warning' ? 'text-yellow-400' : 
                      'text-green-400'
                    }`}
                  >
                    <span className="text-gray-500">[{log.timestamp}]</span> {log.message}
                  </div>
                ))
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default Auth;