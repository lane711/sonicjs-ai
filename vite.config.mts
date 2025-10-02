import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { fileURLToPath } from 'url'
import { dirname, resolve } from 'path'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  root: './src/frontend',
  publicDir: '../../public',
  build: {
    outDir: '../../dist/frontend',
    emptyOutDir: true,
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'src/frontend/index.html'),
      },
    },
  },
  server: {
    port: 3000,
    proxy: {
      // Proxy API and auth API requests to Hono backend
      '/api': {
        target: 'http://localhost:8787',
        changeOrigin: true,
        rewrite: (path) => {
          // Rewrite /api/auth/* to /auth/* on the backend
          if (path.startsWith('/api/auth')) {
            return path.replace(/^\/api\/auth/, '/auth')
          }
          return path
        },
      },
      // Note: /auth and /admin routes are handled by React Router, not proxied
    },
  },
  resolve: {
    alias: {
      '@': resolve(__dirname, './src/frontend'),
      '@shared': resolve(__dirname, './src/shared'),
    },
  },
  define: {
    'process.env': {},
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: './src/frontend/test/setup.ts',
    css: true,
  },
})
