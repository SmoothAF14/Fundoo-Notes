/// <reference types="vitest/config" />
import path from 'node:path';

import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

const DJANGO = 'http://localhost:8000';

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: { '@': path.resolve(import.meta.dirname, './src') },
  },
  server: {
    // Port 3000 is already trusted by Django's CORS/CSRF settings.
    port: 3000,
    strictPort: true,
    // Only API paths go to Django; /notes, /labels etc. are SPA routes.
    proxy: {
      '/api': DJANGO,
      '/notes/api': DJANGO,
      '/labels/api': DJANGO,
    },
  },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/setupTests.ts'],
    css: false,
  },
});
