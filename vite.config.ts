/// <reference types="vitest/config" />
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

export default defineConfig({
  plugins: [react()],
  test: {
    // Unit tests live next to the code. Browser tests in tests/e2e run with Playwright.
    include: ['src/**/*.test.ts', 'src/**/*.test.tsx'],
  },
})
