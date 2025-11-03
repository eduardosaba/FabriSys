/// <reference types="vitest" />
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./jest.setup.ts'],
    include: ['**/*.{test,spec}.{js,ts,jsx,tsx}'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'lcov'],
      exclude: [
        'node_modules/**',
        '.next/**',
        'coverage/**',
        'out/**',
        'dist/**',
        'jest.config.*',
        'next.config.*',
        'postcss.config.*',
        'tailwind.config.*',
        'eslint.config.*',
        'lint-staged.config.*',
        'vitest.config.*',
      ],
    },
  },
  resolve: {
    alias: {
      '@': '/syslari',
    },
  },
});
