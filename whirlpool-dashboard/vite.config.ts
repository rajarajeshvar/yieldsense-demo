import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    tailwindcss(),
    react(),
  ],
  // resolve: {
  //   alias: {
  //     'vite-plugin-node-polyfills/shims/process': path.resolve(__dirname, 'node_modules/vite-plugin-node-polyfills/shims/process/dist/index.js'),
  //     'vite-plugin-node-polyfills/shims/buffer': path.resolve(__dirname, 'node_modules/vite-plugin-node-polyfills/shims/buffer/dist/index.js'),
  //     'vite-plugin-node-polyfills/shims/global': path.resolve(__dirname, 'node_modules/vite-plugin-node-polyfills/shims/global/dist/index.js'),
  //   },
  // },
  define: {
    'process.env': {},
    'global': 'window',
  },
  server: {
    port: 3005,
    open: true, // auto open browser
  }
})
