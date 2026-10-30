import react from '@vitejs/plugin-react';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': new URL('./src', import.meta.url).pathname,
    },
  },
  cacheDir: '/tmp/claimlens-vite',
  test: {
    environment: 'jsdom',
    setupFiles: ['./vitest.setup.ts'],
    fsModuleCachePath: '/tmp/claimlens-vitest-cache',
    pool: 'threads',
    coverage: {
      reporter: ['text', 'json', 'html'],
    },
  },
});
