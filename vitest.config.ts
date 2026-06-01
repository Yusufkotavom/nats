import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./vitest.setup.ts'],
    alias: {
      '@': path.resolve(__dirname, './'),
      'next/navigation': path.resolve(__dirname, './__mocks__/next-navigation.ts'),
      'next/navigation.js': path.resolve(__dirname, './__mocks__/next-navigation.ts'),
    },
    server: {
      deps: {
        inline: ['next-intl', 'next'],
      },
    },
    exclude: ['tests/e2e/**', 'node_modules/**', 'dist/**', '.next/**'],
  },
  resolve: {
    alias: {
      'next/navigation': path.resolve(__dirname, './__mocks__/next-navigation.ts'),
      'next/navigation.js': path.resolve(__dirname, './__mocks__/next-navigation.ts'),
    },
  },
})
