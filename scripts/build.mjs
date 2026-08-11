#!/usr/bin/env node
/**
 * Dual ESM + CJS build, with tsc and nothing else.
 *
 *   dist/         ESM  + .d.ts   (package.json says "type": "module")
 *   dist/cjs/     CJS  + .d.ts   (its own package.json says "type": "commonjs")
 *
 * Why the subdirectory rather than dist/index.mjs and dist/index.cjs: hitting those
 * literal filenames means renaming every emitted file AND rewriting the relative
 * import specifiers inside them, because `./escape.js` would have to become
 * `./escape.mjs`. That is hand-rolled source rewriting in the build of a package
 * whose entire value is not corrupting text. The marker file below costs two lines
 * and needs no rewriting at all. See devops-cicd.md §5.
 */
import { execFileSync } from 'node:child_process';
import { mkdirSync, rmSync, writeFileSync } from 'node:fs';

const tsc = (project) =>
  execFileSync('npx', ['tsc', '-p', project], { stdio: 'inherit' });

rmSync('dist', { recursive: true, force: true });

tsc('tsconfig.build.json');
tsc('tsconfig.cjs.json');

mkdirSync('dist/cjs', { recursive: true });
writeFileSync(
  'dist/cjs/package.json',
  `${JSON.stringify({ type: 'commonjs' }, null, 2)}\n`,
);

console.log('built  dist/ (esm)  dist/cjs/ (cjs)');
