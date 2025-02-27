/**
 * Модуль-обертка для работы с TDWeb API
 */

// Функция создания клиента TDLib
export function createTdLibClient(options = {}) {
  if (typeof window === 'undefined') {
    throw new Error('TDLib требует браузерное окружение');
  }

  // Проверяем, загружена ли библиотека TDWeb
  if (!window.TdJsClient) {
    // Если библиотека не загружена, подключаем её динамически
    const tdLibScript = document.createElement('script');
    tdLibScript.src = '/tdweb.js';
    tdLibScript.async = true;
    document.head.appendChild(tdLibScript);

    // Возвращаем promise, который разрешится, когда библиотека будет загружена
    return new Promise((resolve, reject) => {
      tdLibScript.onload = () => {
        try {
          // Создаем клиент после загрузки скрипта
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

          // Устанавливаем API ключи
          if (options.apiId && options.apiHash) {
            client.apiId = options.apiId;
            client.apiHash = options.apiHash;
          }

          resolve(client);
        } catch (error) {
          reject(error);
        }
      };

      tdLibScript.onerror = () => {
        reject(new Error('Не удалось загрузить TDWeb библиотеку'));
      };
    });
  } else {
    // Если библиотека уже загружена, просто создаем новый клиент
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

    // Устанавливаем API ключи
    if (options.apiId && options.apiHash) {
      client.apiId = options.apiId;
      client.apiHash = options.apiHash;
    }

    return client;
  }
}
