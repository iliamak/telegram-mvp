import { useState, useEffect, useRef } from 'react';

// Отложенная загрузка TDLib без прямого импорта
function Auth({ onAuthenticated }) {
  const [phoneNumber, setPhoneNumber] = useState('');
  const [verificationCode, setVerificationCode] = useState('');
  const [step, setStep] = useState('phone');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [client, setClient] = useState(null);
  const [logs, setLogs] = useState([]);
  const [tdlibLoaded, setTdlibLoaded] = useState(false);
  const logsRef = useRef(null);
  const [showLogs, setShowLogs] = useState(true);

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

  // Динамическая загрузка скрипта TDLib
  useEffect(() => {
    addLog('Начинаем загрузку TDLib...');
    
    // Функция для определения базового пути
    const getBasePath = () => {
      // Проверяем, находимся ли мы в продакшне или в разработке
      const isProduction = window.location.hostname !== 'localhost';
      return isProduction ? '/' : './';
    };
    
    // Функция для динамической загрузки скрипта TDLib
    const loadTdLibScript = () => {
      return new Promise((resolve, reject) => {
        const basePath = getBasePath();
        addLog(`Загрузка tdweb.js из ${basePath}tdweb.js...`);
        
        const script = document.createElement('script');
        script.src = `${basePath}tdweb.js`; // Путь к скрипту с учетом окружения
        script.async = true;
        script.onload = () => {
          addLog('tdweb.js успешно загружен', 'success');
          resolve(true);
        };
        script.onerror = (err) => {
          addLog(`Ошибка загрузки tdweb.js: ${err}`, 'error');
          reject(new Error('Не удалось загрузить TDLib'));
        };
        
        document.body.appendChild(script);
      });
    };
    
    // Проверяем наличие переменных окружения
    if (!import.meta.env.VITE_TELEGRAM_API_ID || !import.meta.env.VITE_TELEGRAM_API_HASH) {
      addLog('Ошибка: API_ID или API_HASH не найдены в переменных окружения', 'error');
      setError('Ошибка инициализации: Отсутствуют ключи API. Проверьте настройки проекта.');
      return;
    }
    
    loadTdLibScript()
      .then(() => {
        // Проверяем, доступен ли TdClient после загрузки скрипта
        if (typeof window.tdweb === 'undefined') {
          throw new Error('TDLib не загружен или недоступен');
        }
        
        addLog('Инициализация TDLib клиента...');
        addLog(`API ID: ${import.meta.env.VITE_TELEGRAM_API_ID}`);
        
        // Создаем TDLib клиент через глобальный объект tdweb
        const tdLibClient = new window.tdweb.TdClient({
          apiId: parseInt(import.meta.env.VITE_TELEGRAM_API_ID),
          apiHash: import.meta.env.VITE_TELEGRAM_API_HASH,
          logVerbosityLevel: 2,
          jsLogVerbosityLevel: 'info',
          mode: 'wasm', // Используем WebAssembly
          instanceName: 'telegram-mvp-instance',
          onUpdate: update => {
            if (update && update['@type'] === 'updateAuthorizationState' && update.authorization_state) {
              addLog(`Обновление статуса авторизации: ${update.authorization_state['@type']}`);
            }
          }
        });
        
        addLog('TDLib клиент успешно создан');
        setClient(tdLibClient);
        setTdlibLoaded(true);
        
        // Проверяем, авторизован ли уже пользователь
        return tdLibClient.send({
          '@type': 'getAuthorizationState'
        });
      })
      .then(authState => {
        if (!authState) return;
        
        addLog(`Получен текущий статус авторизации: ${authState['@type']}`);
        if (authState['@type'] === 'authorizationStateReady') {
          addLog('Пользователь уже авторизован, переход к списку чатов');
          onAuthenticated(client);
        }
      })
      .catch(err => {
        addLog(`Критическая ошибка при инициализации: ${err.message}`, 'error');
        setError(`Ошибка инициализации: ${err.message}`);
        console.error('Полная ошибка:', err);
        
        // Дополнительная отладочная информация
        addLog(`User Agent: ${navigator.userAgent}`, 'info');
        const isWasmSupported = typeof WebAssembly === 'object';
        addLog(`WebAssembly поддерживается: ${isWasmSupported ? 'Да' : 'Нет'}`, isWasmSupported ? 'success' : 'error');
      });
  }, [onAuthenticated]);

  const sendPhoneNumber = async () => {
    if (!client || !tdlibLoaded) {
      addLog('TDLib еще не инициализирован полностью', 'error');
      setError('TDLib не готов. Пожалуйста, подождите или перезагрузите страницу.');
      return;
    }
    
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
    if (!client || !tdlibLoaded) {
      addLog('TDLib еще не инициализирован полностью', 'error');
      setError('TDLib не готов. Пожалуйста, подождите или перезагрузите страницу.');
      return;
    }
    
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

  const toggleLogs = () => setShowLogs(prev => !prev);

  // Функция для тестирования соединения
  const testConnection = () => {
    addLog('Тестирование соединения...', 'info');
    
    // Проверка загрузки скриптов
    addLog(`TDLib объект доступен: ${typeof window.tdweb !== 'undefined' ? 'Да' : 'Нет'}`, 
           typeof window.tdweb !== 'undefined' ? 'success' : 'error');
    
    // Проверка возможности создания клиента
    try {
      if (typeof window.tdweb !== 'undefined') {
        new window.tdweb.TdClient({apiId: 1, apiHash: 'test'});
        addLog('Создание тестового клиента успешно', 'success');
      } else {
        addLog('Невозможно создать тестовый клиент - TDLib не загружен', 'error');
      }
    } catch (err) {
      addLog(`Ошибка при создании тестового клиента: ${err.message}`, 'error');
    }
    
    // Проверка WebAssembly
    try {
      addLog(`WebAssembly поддерживается: ${typeof WebAssembly === 'object' ? 'Да' : 'Нет'}`,
             typeof WebAssembly === 'object' ? 'success' : 'error');
    } catch (err) {
      addLog(`Ошибка при проверке WebAssembly: ${err.message}`, 'error');
    }
  };

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
              disabled={isLoading || !tdlibLoaded}
            />
            <button
              onClick={sendPhoneNumber}
              disabled={isLoading || !phoneNumber || !tdlibLoaded}
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
        
        {/* Кнопки управления */}
        <div className="mt-4 flex justify-between">
          <button 
            onClick={toggleLogs}
            className="text-sm text-blue-500 hover:text-blue-700"
          >
            {showLogs ? 'Скрыть логи' : 'Показать логи'}
          </button>
          
          <button 
            onClick={testConnection}
            className="text-sm text-green-500 hover:text-green-700"
          >
            Проверить соединение
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
                      log.type === 'success' ? 'text-green-400' :
                      'text-blue-400'
                    }`}
                  >
                    <span className="text-gray-500">[{log.timestamp}]</span> {log.message}
                  </div>
                ))
              )}
            </div>
          </div>
        )}
        
        {/* Статус подключения */}
        <div className="mt-4 text-center">
          <div className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
            tdlibLoaded ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
          }`}>
            <span className={`w-2 h-2 mr-2 rounded-full ${
              tdlibLoaded ? 'bg-green-500' : 'bg-yellow-500'
            }`}></span>
            {tdlibLoaded ? 'TDLib загружен' : 'Загрузка TDLib...'}
          </div>
        </div>
      </div>
    </div>
  );
}

export default Auth;