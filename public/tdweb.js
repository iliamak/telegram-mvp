// Эта заглушка будет заменена после выполнения команды npm run setup-tdlib
(function() {
  console.log('TDWeb заглушка загружена. Пожалуйста, выполните команду npm run setup-tdlib для установки TDLib');
  
  // Создаем простой объект-заглушку
  window.tdweb = {
    TdClient: function() {
      console.error('TDLib не установлен. Выполните npm run setup-tdlib');
      return {
        send: function() {
          return Promise.reject(new Error('TDLib не установлен'));
        }
      };
    }
  };
})();