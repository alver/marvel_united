import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

// BASE_PATH lets the same build be served from a sub-path (e.g. GitHub Pages).
export default defineConfig({
  base: process.env.BASE_PATH || '/',
  plugins: [react()],
  test: {
    environment: 'node',
    testTimeout: 120_000,
  },
});
