import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { resolve } from 'path'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
    },
  },
  // Правильная настройка для работы со статическими файлами tdweb
  server: {
    headers: {
      'Cross-Origin-Opener-Policy': 'same-origin',
      'Cross-Origin-Embedder-Policy': 'require-corp'
    }
  },
  // Добавляем правильные пути для base path в production
  base: './',
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
    // Отключаем минификацию для отладки
    minify: false,
    rollupOptions: {
      output: {
        manualChunks: {
          // Разделение вендорных библиотек
          'vendor': ['react', 'react-dom']
        }
      }
    }
  },
  // Разрешаем импорт статических файлов
  assetsInclude: ['**/*.wasm']
})