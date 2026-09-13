import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  base: '/',

  plugins: [react(), tailwindcss()],

  server: {
    host: '0.0.0.0',
    port: 8443,
    strictPort: true,
  },

  preview: {
    host: '0.0.0.0',
    port: 8443,
  },

  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: './test/setup.js',
    css: false,
    exclude: [
      '**/node_modules/**',
      '**/dist/**',
      'src/pages/Projects/entryViews.test.js',
    ],
  },
});