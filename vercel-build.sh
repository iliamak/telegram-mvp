#!/bin/bash

# Скрипт для настройки сборки на Vercel

echo "Создание директорий для TDLib файлов..."
mkdir -p public/wasm
mkdir -p dist
mkdir -p dist/wasm

echo "Загрузка TDLib файлов..."

# Скачиваем основные скрипты для TDWeb
curl -L 'https://github.com/tdlib/td/raw/master/example/web/tdweb.js' -o public/tdweb.js
curl -L 'https://github.com/tdlib/td/raw/master/example/web/worker.js' -o public/worker.js
curl -L 'https://github.com/tdlib/td/releases/download/v1.8.0/td_wasm.js' -o public/wasm/td_wasm.js
curl -L 'https://github.com/tdlib/td/releases/download/v1.8.0/td_wasm.wasm' -o public/wasm/td_wasm.wasm

# Также скачиваем напрямую в dist, чтобы гарантировать их наличие
cp public/tdweb.js dist/tdweb.js
cp public/worker.js dist/worker.js
cp public/wasm/td_wasm.js dist/wasm/td_wasm.js
cp public/wasm/td_wasm.wasm dist/wasm/td_wasm.wasm

# Проверка наличия файлов
echo "Проверка скачанных файлов в public:"
ls -la public/
ls -la public/wasm/

echo "Проверка скачанных файлов в dist:"
ls -la dist/
ls -la dist/wasm/

# Запускаем стандартную сборку Vite
echo "Запуск сборки Vite..."
NODE_ENV=production npm run build

# Проверяем успешность сборки
if [ $? -eq 0 ]; then
    echo "Сборка Vite завершена успешно."
    
    # Гарантируем, что TDLib файлы есть в корне dist
    echo "Копирование TDLib файлов в dist после сборки..."
    cp -f public/tdweb.js dist/
    cp -f public/worker.js dist/
    mkdir -p dist/wasm
    cp -f public/wasm/td_wasm.js dist/wasm/
    cp -f public/wasm/td_wasm.wasm dist/wasm/
    
    # Создаем файл мета-информации, чтобы Vercel не изменил типы файлов
    echo "Создание .vercel/output/config.json для защиты статических файлов..."
    mkdir -p .vercel/output
    cat > .vercel/output/config.json << EOL
{
  "version": 3,
  "routes": [
    { "src": "/tdweb.js", "dest": "/tdweb.js", "headers": { "content-type": "application/javascript" } },
    { "src": "/worker.js", "dest": "/worker.js", "headers": { "content-type": "application/javascript" } },
    { "src": "/wasm/td_wasm.wasm", "dest": "/wasm/td_wasm.wasm", "headers": { "content-type": "application/wasm" } },
    { "src": "/wasm/td_wasm.js", "dest": "/wasm/td_wasm.js", "headers": { "content-type": "application/javascript" } }
  ]
}
EOL
    
    # Финальная проверка
    echo "Проверка содержимого dist после сборки:"
    ls -la dist/
    ls -la dist/wasm/ 2>/dev/null || echo "Директория wasm не найдена в dist!"
    
    # Проверка типов файлов
    echo "Проверка типов файлов:"
    file dist/tdweb.js
    file dist/worker.js
    file dist/wasm/td_wasm.js 2>/dev/null || echo "Файл td_wasm.js не найден!"
    file dist/wasm/td_wasm.wasm 2>/dev/null || echo "Файл td_wasm.wasm не найден!"
else
    echo "Ошибка при сборке Vite!"
    exit 1
fi