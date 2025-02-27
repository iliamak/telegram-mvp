import { useState, useEffect } from 'react';
import { createTdLibClient } from 'tdweb-js';

function Auth({ onAuthenticated }) {
  const [phoneNumber, setPhoneNumber] = useState('');
  const [verificationCode, setVerificationCode] = useState('');
  const [passwordValue, setPasswordValue] = useState('');
  const [step, setStep] = useState('init'); // 'init', 'phone', 'code', 'password'
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [client, setClient] = useState(null);
  const [canResendCode, setCanResendCode] = useState(false);
  const [codeInfo, setCodeInfo] = useState(null);

  useEffect(() => {
    if (!import.meta.env.VITE_TELEGRAM_API_ID || !import.meta.env.VITE_TELEGRAM_API_HASH) {
      setError('Ошибка: Отсутствуют API ключи Telegram. Проверьте файл .env');
      return;
    }
    
    try {
      const tdLibClient = createTdLibClient({
        apiId: import.meta.env.VITE_TELEGRAM_API_ID,
        apiHash: import.meta.env.VITE_TELEGRAM_API_HASH
      });
      
      setClient(tdLibClient);
      
      const handleAuthStateUpdate = async (authState) => {
        const type = authState['@type'];
        
        switch (type) {
          case 'authorizationStateWaitTdlibParameters':
            // Инициализация параметров TDLib
            await tdLibClient.send({
              '@type': 'setTdlibParameters',
              'parameters': {
                '@type': 'tdlibParameters',
                'use_test_dc': false,
                'api_id': import.meta.env.VITE_TELEGRAM_API_ID,
                'api_hash': import.meta.env.VITE_TELEGRAM_API_HASH,
                'system_language_code': 'ru',
                'device_model': 'Web Client',
                'application_version': '1.0',
                'enable_storage_optimizer': true
              }
            });
            break;
          case 'authorizationStateWaitEncryptionKey':
            await tdLibClient.send({
              '@type': 'checkDatabaseEncryptionKey',
              'encryption_key': ''
            });
            break;
          case 'authorizationStateWaitPhoneNumber':
            setStep('phone');
            setIsLoading(false);
            break;
          case 'authorizationStateWaitCode':
            setStep('code');
            setIsLoading(false);
            // Включаем повторную отправку кода через 30 секунд
            setTimeout(() => {
              setCanResendCode(true);
            }, 30000);
            break;
          case 'authorizationStateWaitPassword':
            setStep('password'); 
            setIsLoading(false);
            break;
          case 'authorizationStateReady':
            onAuthenticated(tdLibClient);
            break;
          case 'authorizationStateLoggingOut':
          case 'authorizationStateClosing':
          case 'authorizationStateClosed':
            // Обработка выхода из системы
            setStep('phone');
            break;
          default:
            console.log('Unhandled auth state:', type);
        }
      };
      
      // Запрос текущего состояния авторизации
      tdLibClient.send({
        '@type': 'getAuthorizationState'
      }).then(handleAuthStateUpdate);
      
      // Подписка на обновления состояния авторизации
      const updateHandler = tdLibClient.onUpdate((update) => {
        if (update['@type'] === 'updateAuthorizationState') {
          handleAuthStateUpdate(update.authorization_state);
        } else if (update['@type'] === 'updateOption' && update.name === 'authentication_code_info') {
          // Сохраняем информацию о коде для возможности его повторной отправки
          setCodeInfo(update.value);
        }
      });
      
      return () => {
        if (updateHandler) updateHandler();
      };
    } catch (err) {
      setError('Ошибка при инициализации клиента Telegram: ' + err.message);
      console.error('TDLib initialization error:', err);
    }
  }, [onAuthenticated]);

  const sendPhoneNumber = async () => {
    setIsLoading(true);
    setError('');
    setCanResendCode(false);
    
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
      
      // Переход к следующему шагу будет обработан через обновление состояния
    } catch (err) {
      setIsLoading(false);
      setError('Ошибка при отправке номера телефона. Проверьте формат и попробуйте снова.');
      console.error(err);
    }
  };

  const sendVerificationCode = async () => {
    setIsLoading(true);
    setError('');
    
    try {
      await client.send({
        '@type': 'checkAuthenticationCode',
        'code': verificationCode
      });
      
      // Переход к следующему шагу будет обработан через обновление состояния
    } catch (err) {
      setIsLoading(false);
      setError('Неверный код. Попробуйте снова.');
      console.error(err);
    }
  };
  
  const sendPassword = async () => {
    setIsLoading(true);
    setError('');
    
    try {
      await client.send({
        '@type': 'checkAuthenticationPassword',
        'password': passwordValue
      });
      
      // Переход к следующему шагу будет обработан через обновление состояния
    } catch (err) {
      setIsLoading(false);
      setError('Неверный пароль. Попробуйте снова.');
      console.error(err);
    }
  };
  
  const resendCode = async () => {
    setIsLoading(true);
    setError('');
    setCanResendCode(false);
    
    try {
      await client.send({
        '@type': 'resendAuthenticationCode'
      });
      
      // Через 30 секунд снова разрешаем повторную отправку
      setTimeout(() => {
        setCanResendCode(true);
      }, 30000);
      
      setIsLoading(false);
    } catch (err) {
      setIsLoading(false);
      setError('Не удалось повторно отправить код. Попробуйте позже.');
      console.error(err);
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
        
        {step === 'init' && (
          <div className="flex justify-center">
            <div className="loader">Инициализация...</div>
          </div>
        )}
        
        {step === 'phone' && (
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
        )}
        
        {step === 'code' && (
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
            
            {canResendCode && (
              <button
                onClick={resendCode}
                disabled={isLoading}
                className="w-full mt-2 bg-gray-200 hover:bg-gray-300 text-gray-800 font-bold py-2 px-4 rounded focus:outline-none focus:ring-2 focus:ring-gray-500"
              >
                Отправить код повторно
              </button>
            )}
            
            <button
              onClick={() => {
                setStep('phone');
                setVerificationCode('');
              }}
              className="w-full mt-2 bg-gray-200 hover:bg-gray-300 text-gray-800 font-bold py-2 px-4 rounded focus:outline-none focus:ring-2 focus:ring-gray-500"
              disabled={isLoading}
            >
              Назад
            </button>
          </div>
        )}
        
        {step === 'password' && (
          <div>
            <p className="mb-4 text-sm text-gray-700">
              Введите пароль двухфакторной аутентификации
            </p>
            <label className="block text-gray-700 text-sm font-bold mb-2">
              Пароль
            </label>
            <input
              type="password"
              value={passwordValue}
              onChange={(e) => setPasswordValue(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              disabled={isLoading}
            />
            <button
              onClick={sendPassword}
              disabled={isLoading || !passwordValue}
              className="w-full mt-4 bg-blue-500 hover:bg-blue-600 text-white font-bold py-2 px-4 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
            >
              {isLoading ? 'Проверка...' : 'Войти'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export default Auth;