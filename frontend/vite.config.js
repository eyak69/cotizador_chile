import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import { resolve } from 'path'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  // Carga variables del .env en la carpeta raíz del proyecto
  const env = loadEnv(mode, resolve(__dirname, '..'), '')

  return {
    plugins: [react()],
    define: {
      // Exponer explícitamente GOOGLE_CLIENT_ID para el frontend en desarrollo
      'import.meta.env.VITE_GOOGLE_CLIENT_ID': JSON.stringify(env.GOOGLE_CLIENT_ID)
    },
    server: {
      proxy: {
        '/api': {
          target: 'http://localhost:3000',
          changeOrigin: true,
        },
        '/uploads': {
          target: 'http://localhost:3000',
          changeOrigin: true,
        }
      }
    }
  }
})
