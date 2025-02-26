// Скрипт для копирования необходимых файлов tdweb при сборке проекта
const fs = require('fs');
const path = require('path');

// Копирует файлы из node_modules/tdweb/dist в public
function copyTdwebFiles() {
  console.log('Копирование файлов tdweb...');
  
  const sourcePath = path.resolve(__dirname, 'node_modules/tdweb/dist');
  const targetPath = path.resolve(__dirname, 'public');
  
  if (!fs.existsSync(sourcePath)) {
    console.error('Ошибка: директория tdweb не найдена!');
    console.error('Убедитесь, что пакет tdweb установлен (`npm install tdweb`)');
    return;
  }
  
  if (!fs.existsSync(targetPath)) {
    fs.mkdirSync(targetPath, { recursive: true });
  }
  
  // Список файлов, которые нужно скопировать
  const filesToCopy = [
    'tdweb.js',
    'worker.js',
    'wasm/td_wasm.js',
    'wasm/td_wasm.wasm'
  ];
  
  for (const file of filesToCopy) {
    const source = path.join(sourcePath, file);
    const target = path.join(targetPath, file);
    
    // Создаем целевую директорию, если она не существует
    const targetDir = path.dirname(target);
    if (!fs.existsSync(targetDir)) {
      fs.mkdirSync(targetDir, { recursive: true });
    }
    
    try {
      if (fs.existsSync(source)) {
        fs.copyFileSync(source, target);
        console.log(`Успешно скопирован файл: ${file}`);
      } else {
        console.warn(`Внимание: файл не найден: ${source}`);
      }
    } catch (err) {
      console.error(`Ошибка при копировании ${file}:`, err);
    }
  }
  
  console.log('Копирование завершено.');
}

copyTdwebFiles();