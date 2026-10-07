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
    // Coverage instrumentation roughly doubles DOM-heavy test runtimes;
    // the heaviest flows need more than the 5s default.
    testTimeout: 15000,
    exclude: [
      '**/node_modules/**',
      '**/dist/**',
      'src/pages/Projects/entryViews.test.js',
      'src/pages/Profile/profilePicture.test.js',
    ],
    coverage: {
      // 'lcov' writes coverage/lcov.info, which the CI workflow
      // uploads to Codecov alongside coverage-node/lcov.info (c8).
      reporter: ['text', 'html', 'clover', 'json', 'lcov'],
    },
  },
});
