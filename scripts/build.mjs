#!/usr/bin/env node
/**
 * Dual build with tsc alone: ESM in dist/, CJS in dist/cjs/ with a "type": "commonjs"
 * marker. Not dist/index.mjs — those filenames would mean rewriting import specifiers
 * inside emitted files. devops-cicd.md §5.
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
