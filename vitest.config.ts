import { defineConfig } from 'vitest/config';

/**
 * CI runs the public fixtures only. `test/local/` needs the gitignored corpus and runs
 * under `npm run test:full`. See test/fixtures/public/README.md for why that gap exists.
 */
export default defineConfig({
  test: {
    include: ['test/**/*.test.ts'],
    exclude: ['test/local/**', 'node_modules/**', 'dist/**'],
  },
});
