import { defineConfig } from 'vitest/config'

export default defineConfig({
  // Served from GitHub Pages at /<repo-name>/; must match the repo name.
  base: '/chagai/',
  test: {
    include: ['tests/**/*.test.ts'],
    passWithNoTests: true,
  },
})
