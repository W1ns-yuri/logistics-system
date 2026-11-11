import path from 'node:path'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  // Рабочая сборка на своём компьютере: запросы /api идут на сервер (cd server && npm run dev)
  // Сервер сверяет Origin с адресом сайта (защита от CSRF): адрес передаём в X-Forwarded-Host (xfwd)
  server: { proxy: { '/api': { target: 'http://127.0.0.1:3000', xfwd: true } } },
  preview: { proxy: { '/api': { target: 'http://127.0.0.1:3000', xfwd: true } } },
  resolve: {
    alias: {
      '@': path.resolve(import.meta.dirname, './src'),
    },
  },
})
