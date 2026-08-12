import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    open: true
  },
  test: {
    environment: 'node',
    include: ['src/**/*.test.{js,jsx}'],
    // Limpia las variables de entorno del servidor antes de cada test. Desde la
    // spec 004 la suite corre dentro del build de Netlify, donde TODAS las
    // variables del sitio están cargadas: sin esto, los tests que verifican
    // "qué pasa cuando la variable no está" fallarían en el deploy.
    setupFiles: ['./src/test-setup.js']
  }
});
