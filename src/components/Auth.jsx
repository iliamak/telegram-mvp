import { useState, useEffect } from 'react';
import { createTdLibClient } from 'tdweb-js';

function Auth({ onAuthenticated }) {
  const [phoneNumber, setPhoneNumber] = useState('');
  const [verificationCode, setVerificationCode] = useState('');
  const [step, setStep] = useState('phone'); // 'phone' или 'code'
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [client, setClient] = useState(null);

  useEffect(() => {
    const tdLibClient = createTdLibClient({
      apiId: import.meta.env.VITE_TELEGRAM_API_ID,
      apiHash: import.meta.env.VITE_TELEGRAM_API_HASH
    });
    
    setClient(tdLibClient);
    
    // Проверяем, авторизован ли уже пользователь
    tdLibClient.send({
      '@type': 'getAuthorizationState'
    }).then(authState => {
      if (authState['@type'] === 'authorizationStateReady') {
        onAuthenticated(tdLibClient);
      }
    });
  }, [onAuthenticated]);

  const sendPhoneNumber = async () => {
    setIsLoading(true);
    setError('');
    
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
      
      setStep('code');
    } catch (err) {
      setError('Ошибка при отправке номера телефона. Проверьте формат и попробуйте снова.');
      console.error(err);
    } finally {
      setIsLoading(false);
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
      
      // Если мы здесь, значит, аутентификация прошла успешно
      onAuthenticated(client);
    } catch (err) {
      setError('Неверный код. Попробуйте снова.');
      console.error(err);
    } finally {
      setIsLoading(false);
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
      </div>
    </div>
  );
}

export default Auth;