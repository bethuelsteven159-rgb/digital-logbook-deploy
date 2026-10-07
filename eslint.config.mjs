import js from '@eslint/js';
import globals from 'globals';
import eslintConfigPrettier from 'eslint-config-prettier/flat';

export default [
  {
    ignores: [
      'node_modules/**',
      'dist/**',
      'client/dist/**',
      // The root config has no JSX parser configured; client components and
      // their .test.jsx suites are out of scope for root linting.
      'client/**/*.jsx',
      'build/**',
      'coverage/**',
    ],
  },

  js.configs.recommended,

  {
    files: ['**/*.js'],

    languageOptions: {
      globals: {
        ...globals.browser,
        ...globals.node,
      },
    },

    rules: {
      'no-unused-vars': 'warn',
      'no-console': 'off',
    },
  },

  {
    // Client tests run through Vitest with globals enabled (vite.config.js),
    // so the runner injects describe/it/expect/vi without imports.
    files: ['client/src/**/*.test.js', 'client/src/**/*.test.jsx', 'client/test/**/*.js'],

    languageOptions: {
      globals: {
        ...globals.browser,
        describe: 'readonly',
        it: 'readonly',
        test: 'readonly',
        expect: 'readonly',
        vi: 'readonly',
        beforeEach: 'readonly',
        afterEach: 'readonly',
        beforeAll: 'readonly',
        afterAll: 'readonly',
      },
    },
  },

  eslintConfigPrettier,
];
