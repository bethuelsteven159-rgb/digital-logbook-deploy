import { vi } from 'vitest';

import '@testing-library/jest-dom/vitest';

// API tests assert the default http://localhost:5000 base URL. A developer's
// gitignored .env may point VITE_API_URL at the deployed backend, so pin the
// variable for every test run (setup runs before test-file imports evaluate
// the API modules). Production builds are unaffected.
vi.stubEnv('VITE_API_URL', 'http://localhost:5000');

Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: (query) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => false,
  }),
});

Object.defineProperty(window, 'scrollTo', {
  writable: true,
  value: () => {},
});
