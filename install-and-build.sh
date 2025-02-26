#!/bin/bash

# Скрипт для установки и сборки проекта на Linux и macOS

echo "Установка зависимостей..."
npm install

echo "Настройка TDLib..."
npm run setup-tdlib

echo "Запуск сборки..."
npm run build

echo "Готово! Проект собран и готов к использованию."
echo "Для запуска в режиме разработки выполните: npm run dev"
echo "Для предпросмотра собранного проекта выполните: npm run preview"