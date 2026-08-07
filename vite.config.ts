import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  // Relative asset paths so the built dist/ works from any subpath -
  // GitHub Pages project sites serve from https://user.github.io/repo-name/,
  // and the exact repo name isn't known until the repo exists.
  base: './',
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
  },
})
