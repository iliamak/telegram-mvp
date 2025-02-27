/**
 * Этот файл создан для успешной сборки проекта
 * Он заменяет отсутствующий модуль tdweb-js при сборке
 */

// Эта функция будет использоваться только при сборке
export function createTdLibClient() {
  console.warn('Mock TDLib client used during build');
  return {
    send: () => Promise.resolve({}),
    onUpdate: () => () => {}
  };
}

// Экспортируем заглушку для предотвращения ошибок при сборке
export default {
  createTdLibClient
};