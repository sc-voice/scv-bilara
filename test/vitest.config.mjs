import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['test/**/*.mjs'],
    exclude: ['test/vitest.config.mjs', 'test/setup-expect.mjs'],
    setupFiles: ['test/setup-expect.mjs'],
    threads: false,
  },
});
