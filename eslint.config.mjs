// @ts-check
import js from '@eslint/js';
import globals from 'globals';
import tseslint from 'typescript-eslint';

/**
 * The non-negotiables from CLAUDE.md, enforced rather than reviewed.
 *
 * Every rule here exists because breaking it silently is the failure mode:
 *  - a network call in src/ would break the "the package cannot phone home"
 *    guarantee that ADR-008 rests on, and nothing else would catch it
 *  - Date.now()/Math.random() would make findings non-deterministic, which is
 *    what makes the linter safe as a CI gate
 *  - `any` in public API is a lie to consumers who pin this exactly
 */

/** Node built-ins that must never be imported under src/. */
const IO_MODULES = [
  'fs', 'node:fs', 'fs/promises', 'node:fs/promises',
  'path', 'node:path',
  'http', 'node:http', 'https', 'node:https',
  'net', 'node:net', 'dgram', 'node:dgram',
  'child_process', 'node:child_process',
  'os', 'node:os',
];

/**
 * Globals src/ may not touch.
 *
 * Network: ADR-008 — the published package cannot reach the network.
 * Runtime: `process`/`Buffer`/`__dirname` are host access by another name, and
 * `process.env` would make findings depend on the environment.
 *
 * tsconfig.build.json also compiles src/ with `"types": []`, so these do not even
 * resolve in the shipped build. Two layers, because this one is load-bearing.
 */
const NETWORK_GLOBALS = [
  'fetch',
  'XMLHttpRequest',
  'WebSocket',
  'EventSource',
  'navigator',
  'process',
  'Buffer',
  '__dirname',
  '__filename',
];

export default tseslint.config(
  { ignores: ['dist/**', 'coverage/**', 'node_modules/**'] },

  js.configs.recommended,
  ...tseslint.configs.recommendedTypeChecked,

  {
    languageOptions: {
      parserOptions: { projectService: true },
    },
  },

  // ── Everywhere, including tests and scripts ────────────────────────────────
  {
    rules: {
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/explicit-module-boundary-types': 'error',
      '@typescript-eslint/consistent-type-imports': 'error',

      // CLAUDE.md: "Do not use `any`, enums, or classes"
      'no-restricted-syntax': [
        'error',
        {
          selector: 'ClassDeclaration',
          message: 'No classes. Functions and plain objects (CLAUDE.md, TypeScript Conventions).',
        },
        {
          selector: 'ClassExpression',
          message: 'No classes. Functions and plain objects (CLAUDE.md, TypeScript Conventions).',
        },
        {
          selector: 'TSEnumDeclaration',
          message: 'String literal unions, not enums (CLAUDE.md, TypeScript Conventions).',
        },
      ],

      // CLAUDE.md: "Do not use Date.now() or Math.random() ANYWHERE".
      // Property tests need a seeded PRNG, not a random source.
      'no-restricted-properties': [
        'error',
        { object: 'Date', property: 'now', message: 'No clock. Determinism is what makes this safe as a CI gate (CLAUDE.md §1).' },
        { object: 'Math', property: 'random', message: 'No randomness. Property tests use a seeded PRNG (CLAUDE.md §1).' },
      ],
    },
  },

  // ── src/ only: the pure core ───────────────────────────────────────────────
  {
    files: ['src/**/*.ts'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          paths: IO_MODULES.map((name) => ({
            name,
            message: 'The core is pure. I/O belongs in bin/cli.ts or an adapter (CLAUDE.md §1, ADR-005).',
          })),
          patterns: [
            {
              group: ['node:*'],
              message: 'The core is pure. I/O belongs in bin/cli.ts or an adapter (CLAUDE.md §1, ADR-005).',
            },
          ],
        },
      ],
      'no-restricted-globals': [
        'error',
        ...NETWORK_GLOBALS.map((name) => ({
          name,
          message: 'The published package can never reach the network. Telemetry lives only in the webapp layer (ADR-008).',
        })),
      ],
    },
  },

  // ── Tests and build scripts may do I/O ─────────────────────────────────────
  {
    files: ['test/**/*.ts', 'scripts/**/*.mjs', '*.config.ts', '*.config.mjs'],
    rules: {
      'no-restricted-imports': 'off',
      'no-restricted-globals': 'off',
    },
  },

  // Plain JS gets no type-aware rules — there is no tsconfig covering it.
  // These run on Node, so they get Node globals. src/ deliberately does NOT:
  // `process` and friends stay undefined there, on top of the restricted-globals ban.
  {
    files: ['**/*.mjs', '**/*.js'],
    extends: [tseslint.configs.disableTypeChecked],
    languageOptions: {
      globals: globals.node,
    },
    rules: {
      '@typescript-eslint/explicit-module-boundary-types': 'off',
    },
  },
);
