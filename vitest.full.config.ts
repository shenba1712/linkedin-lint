import { defineConfig } from 'vitest/config';

/**
 * `npm run test:full` — the public suite plus `test/local/`, which needs the
 * maintainer's corpus. Run before every release (devops-cicd.md §8).
 */
export default defineConfig({
  test: {
    include: ['test/**/*.test.ts'],
    exclude: ['node_modules/**', 'dist/**'],
  },
});
