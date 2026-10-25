import { defineConfig } from 'vitest/config'

export default defineConfig({
  // Served at the root of the custom domain chagai-yellow-card.site.
  base: '/',
  test: {
    include: ['tests/**/*.test.ts'],
    passWithNoTests: true,
  },
})
