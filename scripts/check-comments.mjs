#!/usr/bin/env node
/**
 * Fail when a comment block is too long. Run: node scripts/check-comments.mjs
 *
 * "Write short" sat in CLAUDE.md and was broken in the next two tickets. ADR-011: a
 * rule that can be a check is one. When it fires, say it shorter or move it to an ADR.
 */
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative, resolve, dirname } from 'node:path';

const ROOT = resolve(dirname(new URL(import.meta.url).pathname), '..');
const MAX_BLOCK = 6;   // lines, delimiters included
const DIRS = ['src', 'test', 'scripts'];
const problems = [];

const walk = (dir) =>
  readdirSync(dir).flatMap((f) => {
    const p = join(dir, f);
    if (statSync(p).isDirectory()) return f === 'fixtures' ? [] : walk(p);
    return /\.(ts|mjs|js)$/.test(f) ? [p] : [];
  });

for (const file of DIRS.flatMap((d) => walk(join(ROOT, d)))) {
  const lines = readFileSync(file, 'utf8').split('\n');
  let start = -1;
  let run = 0;

  const close = () => {
    if (run > MAX_BLOCK) {
      problems.push(`${relative(ROOT, file)}:${start + 1} — ${run} lines, max ${MAX_BLOCK}`);
    }
    start = -1;
    run = 0;
  };

  lines.forEach((line, i) => {
    const t = line.trim();
    const isComment = t.startsWith('//') || t.startsWith('/*') || t.startsWith('*');
    if (!isComment) { if (run) close(); return; }
    if (!run) start = i;
    run += 1;
  });
  if (run) close();
}

const g = (s) => `\x1b[32m${s}\x1b[0m`;
const r = (s) => `\x1b[31m${s}\x1b[0m`;
if (problems.length === 0) {
  console.log(`\n  ${g('comments ok')}. No block over ${MAX_BLOCK} lines.\n`);
  process.exit(0);
}
console.log(`\n  Comment blocks over ${MAX_BLOCK} lines. Say it shorter, or move it to an ADR.\n`);
for (const p of problems) console.log(`  ${r('long')}  ${p}`);
console.log(`\n  ${r(`${problems.length} block${problems.length === 1 ? '' : 's'}`)}.\n`);
process.exit(1);
