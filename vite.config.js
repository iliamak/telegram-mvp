import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { resolve } from 'path'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
      // Добавляем прямой алиас для tdweb-js, чтобы Vite гарантированно его нашел
      'tdweb-js': resolve(__dirname, 'src/lib/tdweb-js.js')
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
    // Для отладки отключаем минификацию
    minify: process.env.NODE_ENV !== 'production',
    rollupOptions: {
      output: {
        manualChunks: {
          // Разделение вендорных библиотек
          'vendor': ['react', 'react-dom']
        }
      },
      // Явно указываем внешние модули, которые не нужно обрабатывать
      external: ['tdweb-js'],
    },
    // Отключаем предупреждения о неразрешенных импортах
    chunkSizeWarningLimit: 1600,
    commonjsOptions: {
      esmExternals: true,
    }
  },
  // Разрешаем импорт статических файлов
  assetsInclude: ['**/*.wasm'],
  
  // Для корректной обработки worker.js и других файлов
  optimizeDeps: {
    exclude: ['tdweb-js'],
    esbuildOptions: {
      // Настройки для предотвращения ошибок импорта
      define: {
        global: 'globalThis'
      },
    }
  }
})