import { defineConfig } from '@sc-voice/vitest/config';

export default defineConfig({
  test: {
    include: ['vtest/**/*.mjs'],
    exclude: ['vtest/vitest.config.mjs'],
    setupFiles: [],
    threads: false,
  },
});
