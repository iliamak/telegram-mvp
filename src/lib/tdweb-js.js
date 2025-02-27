/**
 * Упрощенная версия модуля-обертки для работы с TDWeb API
 */

// Функция создания клиента TDLib
export function createTdLibClient(options = {}) {
  // Проверяем окружение
  if (typeof window === 'undefined') {
    // Для SSR возвращаем mock-объект
    return {
      send: () => Promise.resolve({}),
      onUpdate: () => () => {}
    };
  }
  
  // Создаем заглушку TDLib клиента для сборки
  if (!window.TdJsClient) {
    console.warn('TDLib not loaded yet, loading dynamically');
    
    // Загружаем скрипт TDWeb
    const script = document.createElement('script');
    script.src = './tdweb.js';
    script.async = true;
    document.head.appendChild(script);
    
    // Возвращаем временный объект-обещание
    return {
      send: async (params) => {
        console.log('TDLib not yet loaded, operation pending:', params);
        return {};
      },
      onUpdate: () => {
        return () => {}; // функция для отписки от обновлений
      },
      // API ключи
      apiId: options.apiId,
      apiHash: options.apiHash
    };
  }
  
  // Если библиотека загружена, создаем реальный клиент
  try {
    const client = new window.TdJsClient({
      instanceName: options.instanceName || 'tdlib',
      jsLogVerbosityLevel: options.jsLogVerbosityLevel || 2,
      logVerbosityLevel: options.logVerbosityLevel || 2,
      useDatabase: options.useDatabase !== false,
      readOnly: options.readOnly || false,
      isBackground: options.isBackground || false,
      wasmUrl: './wasm/td_wasm.wasm',
      wasmJsUrl: './wasm/td_wasm.js',
      workerUrl: './worker.js',
      mode: options.mode || 'wasm'
    });

    // Сохраняем API ключи
    if (options.apiId && options.apiHash) {
      client.apiId = options.apiId;
      client.apiHash = options.apiHash;
    }

    return client;
  } catch (error) {
    console.error('TDLib initialization failed:', error);
    // Возвращаем нулевой клиент в случае ошибки
    return {
      send: () => Promise.resolve({}),
      onUpdate: () => () => {},
      error: error.message
    };
  }
}
