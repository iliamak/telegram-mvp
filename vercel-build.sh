#!/bin/bash

# Скрипт для настройки сборки на Vercel

echo "Загрузка TDLib файлов..."

# Создаем директории для TDLib файлов
mkdir -p public/wasm

# Скачиваем основные скрипты для TDWeb
curl -L 'https://github.com/tdlib/td/raw/master/example/web/tdweb.js' -o public/tdweb.js
curl -L 'https://github.com/tdlib/td/raw/master/example/web/worker.js' -o public/worker.js

# Скачиваем WebAssembly файлы с GitHub релизов
curl -L 'https://github.com/tdlib/td/releases/download/v1.8.0/td_wasm.js' -o public/wasm/td_wasm.js
curl -L 'https://github.com/tdlib/td/releases/download/v1.8.0/td_wasm.wasm' -o public/wasm/td_wasm.wasm

# Проверка наличия файлов
echo "Проверка скачанных файлов:"
ls -la public/
ls -la public/wasm/

echo "TDLib файлы успешно загружены."

# Запускаем стандартную сборку Vite
echo "Запуск сборки Vite..."
npm run build