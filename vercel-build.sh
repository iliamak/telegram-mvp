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

# Дополнительно копируем файлы в корень для сборки
echo "Копирование файлов TDLib в корень для сборки..."
cp -r public/* dist/ 2>/dev/null || true

# Запускаем стандартную сборку Vite
echo "Запуск сборки Vite..."
NODE_ENV=production npm run build

# Проверяем успешность сборки
if [ $? -eq 0 ]; then
    echo "Сборка Vite завершена успешно."
    # Повторно копируем TDLib файлы в директорию dist
    mkdir -p dist/wasm
    cp public/tdweb.js dist/
    cp public/worker.js dist/
    cp public/wasm/td_wasm.js dist/wasm/
    cp public/wasm/td_wasm.wasm dist/wasm/
    # Проверяем содержимое dist
    echo "Проверка содержимого dist после сборки:"
    ls -la dist/
    ls -la dist/wasm/ 2>/dev/null || echo "Директория wasm не найдена в dist!"
else
    echo "Ошибка при сборке Vite!"
    exit 1
fi