/**
 * Модуль-обертка для работы с TDWeb API
 */

// Функция создания клиента TDLib
export async function createTdLibClient(options = {}) {
  // Проверяем окружение
  if (typeof window === 'undefined') {
    console.warn('TDLib client cannot be initialized in a non-browser environment');
    // Для SSR возвращаем mock-объект
    return {
      send: () => Promise.resolve({}),
      onUpdate: () => () => {}
    };
  }
  
  // Проверка на наличие require TDLib
  console.log('Initializing TDLib client with options:', options);
  console.log('Checking for TdJsClient availability...');
  
  // Пытаемся загрузить скрипт TDWeb, если он не загружен
  if (typeof window.TdJsClient !== 'function') {
    console.log('TdJsClient not found, attempting to load TDWeb script...');
    
    try {
      // Загружаем TDWeb скрипты
      await loadTdwebScript();
      console.log('TDWeb script loaded successfully');
    } catch (error) {
      console.error('Failed to load TDWeb script:', error);
    }
  }
  
  // Повторная проверка после загрузки
  if (typeof window.TdJsClient !== 'function') {
    console.error('TdJsClient still not available after loading attempts');
    
    // Возвращаем временный объект, если TDLib не загружен
    return {
      send: async (params) => {
        console.log('TDLib not loaded, operation pending:', params);
        return Promise.resolve({});
      },
      onUpdate: () => {
        return () => {}; // функция для отписки от обновлений
      },
      // API ключи
      apiId: options.apiId,
      apiHash: options.apiHash
    };
  }
  
  // Создаем экземпляр TDLib клиента
  try {
    console.log('Creating TdJsClient instance...');
    const client = new window.TdJsClient({
      instanceName: options.instanceName || 'tdlib',
      jsLogVerbosityLevel: options.jsLogVerbosityLevel || 2,
      logVerbosityLevel: options.logVerbosityLevel || 2,
      useDatabase: options.useDatabase !== false,
      readOnly: options.readOnly || false,
      isBackground: options.isBackground || false,
      wasmUrl: '/wasm/td_wasm.wasm',
      wasmJsUrl: '/wasm/td_wasm.js',
      workerUrl: '/worker.js',
      mode: options.mode || 'wasm'
    });

    console.log('TdJsClient instance created successfully');
    
    // Сохраняем API ключи
    if (options.apiId && options.apiHash) {
      client.apiId = options.apiId;
      client.apiHash = options.apiHash;
    }

    return client;
  } catch (error) {
    console.error('TDLib initialization failed:', error);
    // Возвращаем объект с ошибкой
    return {
      send: () => Promise.resolve({}),
      onUpdate: () => () => {},
      error: error.message
    };
  }
}

// Вспомогательная функция для загрузки TDWeb скрипта
function loadTdwebScript() {
  return new Promise((resolve, reject) => {
    // Проверяем, не загружен ли скрипт уже
    if (document.querySelector('script[src="/tdweb.js"]')) {
      console.log('TDWeb script already loading...');
      
      // Проверяем каждые 100мс, появился ли TdJsClient
      const checkInterval = setInterval(() => {
        if (typeof window.TdJsClient === 'function') {
          clearInterval(checkInterval);
          resolve();
        }
      }, 100);
      
      // Устанавливаем таймаут для предотвращения бесконечного ожидания
      setTimeout(() => {
        clearInterval(checkInterval);
        if (typeof window.TdJsClient !== 'function') {
          reject(new Error('Timeout waiting for TdJsClient to load'));
        }
      }, 10000);
      
      return;
    }
    
    console.log('Loading TDWeb script...');
    const script = document.createElement('script');
    script.src = '/tdweb.js';
    script.async = true;
    
    script.onload = () => {
      console.log('TDWeb script loaded, waiting for initialization...');
      
      // TdJsClient может быть не сразу доступен после загрузки скрипта
      const checkInterval = setInterval(() => {
        if (typeof window.TdJsClient === 'function') {
          clearInterval(checkInterval);
          resolve();
        }
      }, 100);
      
      // Устанавливаем таймаут
      setTimeout(() => {
        clearInterval(checkInterval);
        if (typeof window.TdJsClient !== 'function') {
          reject(new Error('Timeout waiting for TdJsClient to initialize'));
        }
      }, 5000);
    };
    
    script.onerror = () => {
      reject(new Error('Failed to load TDWeb script'));
    };
    
    document.head.appendChild(script);
  });
}