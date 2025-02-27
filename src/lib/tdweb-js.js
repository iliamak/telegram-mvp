/**
 * Модуль-обертка для работы с TDWeb API
 */

// CDN URL для запасной загрузки TDWeb
const TDWEB_CDN_URL = 'https://cdn.jsdelivr.net/gh/tdlib/td@master/example/web/tdweb.js';
const WORKER_CDN_URL = 'https://cdn.jsdelivr.net/gh/tdlib/td@master/example/web/worker.js';
const WASM_JS_CDN_URL = 'https://cdn.jsdelivr.net/gh/tdlib/td@v1.8.0/td_wasm.js';
const WASM_WASM_CDN_URL = 'https://cdn.jsdelivr.net/gh/tdlib/td@v1.8.0/td_wasm.wasm';

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
  
  // Проверка наличия TDLib
  console.log('Initializing TDLib client with options:', options);
  console.log('Checking for TdJsClient availability...');
  
  // Если TdJsClient недоступен, пытаемся загрузить его
  if (typeof window.TdJsClient !== 'function') {
    console.log('TdJsClient not found, attempting multiple loading strategies...');
    
    try {
      // 1. Сначала пытаемся использовать локальные файлы
      try {
        await loadTdwebScript('/tdweb.js');
        console.log('Local TDWeb script loaded successfully');
      } catch (localError) {
        console.warn('Failed to load local TDWeb script:', localError);
        
        // 2. Если локальная загрузка не удалась, пробуем CDN
        console.log('Attempting to load TDWeb from CDN...');
        await loadTdwebScript(TDWEB_CDN_URL);
        console.log('CDN TDWeb script loaded successfully');
      }
    } catch (error) {
      console.error('All TDWeb loading attempts failed:', error);
    }
  }
  
  // Повторная проверка после загрузки
  if (typeof window.TdJsClient !== 'function') {
    console.error('TdJsClient still not available after all loading attempts');
    
    // Возвращаем временную заглушку
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
  
  // Создаем реальный клиент TDLib
  try {
    console.log('Creating TdJsClient instance...');
    
    // Определяем, использовать локальные пути или CDN
    const wasmUrl = '/wasm/td_wasm.wasm';
    const wasmJsUrl = '/wasm/td_wasm.js';
    const workerUrl = '/worker.js';
    
    const client = new window.TdJsClient({
      instanceName: options.instanceName || 'tdlib',
      jsLogVerbosityLevel: options.jsLogVerbosityLevel || 2,
      logVerbosityLevel: options.logVerbosityLevel || 2,
      useDatabase: options.useDatabase !== false,
      readOnly: options.readOnly || false,
      isBackground: options.isBackground || false,
      wasmUrl: wasmUrl,
      wasmJsUrl: wasmJsUrl,
      workerUrl: workerUrl,
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
    
    // Пробуем создать клиент с CDN URL в случае ошибки
    try {
      console.log('Retrying with CDN paths...');
      const client = new window.TdJsClient({
        instanceName: options.instanceName || 'tdlib',
        jsLogVerbosityLevel: options.jsLogVerbosityLevel || 2,
        logVerbosityLevel: options.logVerbosityLevel || 2,
        useDatabase: options.useDatabase !== false,
        readOnly: options.readOnly || false,
        isBackground: options.isBackground || false,
        wasmUrl: WASM_WASM_CDN_URL,
        wasmJsUrl: WASM_JS_CDN_URL,
        workerUrl: WORKER_CDN_URL,
        mode: options.mode || 'wasm'
      });
      
      console.log('TdJsClient instance created successfully with CDN resources');
      
      if (options.apiId && options.apiHash) {
        client.apiId = options.apiId;
        client.apiHash = options.apiHash;
      }
      
      return client;
    } catch (cdnError) {
      console.error('Failed to create TDLib client with CDN resources:', cdnError);
      // Возвращаем объект с ошибкой
      return {
        send: () => Promise.resolve({}),
        onUpdate: () => () => {},
        error: `${error.message}, CDN fallback failed: ${cdnError.message}`
      };
    }
  }
}

// Вспомогательная функция для загрузки TDWeb скрипта
function loadTdwebScript(url) {
  return new Promise((resolve, reject) => {
    // Проверяем, не загружен ли скрипт уже
    if (document.querySelector(`script[src="${url}"]`)) {
      console.log(`Script already loading: ${url}`);
      
      // Проверяем каждые 100мс, появился ли TdJsClient
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
          reject(new Error('Timeout waiting for TdJsClient to load'));
        }
      }, 5000);
      
      return;
    }
    
    console.log(`Loading script: ${url}`);
    const script = document.createElement('script');
    script.src = url;
    script.crossOrigin = 'anonymous';
    script.async = true;
    
    script.onload = () => {
      console.log(`Script loaded: ${url}, waiting for initialization...`);
      
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
      }, 3000);
    };
    
    script.onerror = (e) => {
      console.error(`Failed to load script: ${url}`, e);
      reject(new Error(`Failed to load TDWeb script from ${url}`));
    };
    
    document.head.appendChild(script);
  });
}