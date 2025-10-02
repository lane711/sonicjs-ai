import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

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
        main: path.resolve(__dirname, 'src/frontend/index.html'),
      },
    },
  },
  server: {
    port: 3000,
    proxy: {
      // Proxy API requests to Hono backend
      '/api': {
        target: 'http://localhost:8787',
        changeOrigin: true,
      },
      '/auth': {
        target: 'http://localhost:8787',
        changeOrigin: true,
      },
      '/admin': {
        target: 'http://localhost:8787',
        changeOrigin: true,
        // Don't proxy admin routes that should be handled by React
        bypass: (req) => {
          // Let React handle these routes
          if (req.url?.match(/\.(js|css|png|jpg|jpeg|gif|svg|ico|woff|woff2|ttf|eot)$/)) {
            return req.url
          }
          return null
        },
      },
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src/frontend'),
      '@shared': path.resolve(__dirname, './src/shared'),
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
