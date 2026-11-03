import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    environment: 'node',
    globals: true,
    include: ['tests/**/*.test.ts'],
  },
  resolve: {
    alias: {
      'server-only': path.resolve(__dirname, './node_modules/next/dist/compiled/server-only/empty.js'),
      '@': path.resolve(__dirname, './src'),
    },
  },
});
