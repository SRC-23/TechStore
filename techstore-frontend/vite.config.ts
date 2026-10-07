import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import path from 'path';

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  // "npm run build" publica la web dentro de la API (wwwroot) para desplegar
  // todo junto en un solo Azure App Service.
  build: {
    outDir: path.resolve(__dirname, '../src/TechStore.API/wwwroot'),
    emptyOutDir: true,
  },
  server: {
    port: 5173,
    proxy: {
      // El backend corre SIEMPRE en http://localhost:5000 (ver
      // src/TechStore.API/Properties/launchSettings.json). Debe ser HTTP:
      // apuntar a HTTPS causaba el error "ssl3_get_record: wrong version number".
      '/api': {
        target: 'http://localhost:5000',
        changeOrigin: true,
        secure: false,
      },
    },
  },
});
