import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          // Выделяем tdweb в отдельный чанк для лучшей производительности
          'tdweb-vendor': ['tdweb']
        }
      }
    }
  },
  // Правильная настройка для работы со статическими файлами tdweb
  server: {
    headers: {
      'Cross-Origin-Opener-Policy': 'same-origin',
      'Cross-Origin-Embedder-Policy': 'require-corp'
    }
  },
  // Добавляем правильные пути для base path в production
  base: './'
})