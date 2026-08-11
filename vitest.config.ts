import { defineConfig } from 'vitest/config';

/**
 * What CI runs: the public fixtures only.
 *
 * `test/local/` holds suites that need the maintainer's local corpus — 13 LinkedIn
 * posts and 256 Medium articles, gitignored because this repo is public. Those run
 * under `npm run test:full`, which is on the release checklist.
 *
 * That split is a real gap, named rather than hidden: a rule that fires on the
 * author's own writing would pass CI and fail locally.
 * See test/fixtures/public/README.md.
 */
export default defineConfig({
  test: {
    include: ['test/**/*.test.ts'],
    exclude: ['test/local/**', 'node_modules/**', 'dist/**'],
  },
});
