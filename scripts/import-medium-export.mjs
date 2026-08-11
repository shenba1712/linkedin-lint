#!/usr/bin/env node
/**
 * Turn a Medium export into clean fixture files.
 *
 *   node scripts/import-medium-export.mjs <export-dir> [--dry-run] [--expect=29]
 *
 * Get the export: Medium → Settings → Account → "Download your information".
 * Unzip the emailed archive and point this at the folder.
 *
 * Classification logic lives in scripts/lib/medium.mjs, shared with
 * inspect-medium-export.mjs so both scripts always agree on the count.
 *
 * Zero dependencies.
 */
import { readFileSync, writeFileSync, readdirSync, existsSync, mkdirSync, statSync } from 'node:fs';
import { join, resolve, dirname } from 'node:path';
import { classify, titleOf, slug, dateOf, genreHint } from './lib/medium.mjs';

const args = process.argv.slice(2);
const DRY = args.includes('--dry-run');
const INCLUDE_UNKNOWN = args.includes('--include-unknown');
const EXPECT = Number((args.find((a) => a.startsWith('--expect=')) || '').split('=')[1] || 0);
const MIN_IMAGES = Number((args.find((a) => a.startsWith('--min-images=')) || '').split('=')[1] || 1);
const SRC = args.find((a) => !a.startsWith('--'));
const OUT = resolve(dirname(new URL(import.meta.url).pathname), '../test/fixtures/medium');

if (!SRC) {
  console.error(`
Usage: node scripts/import-medium-export.mjs <export-dir> [--dry-run] [--expect=N]

  Medium → Settings → Account → Download your information
  Unzip, then point this at the folder. Run --dry-run first.
`);
  process.exit(2);
}

const postsDir = ['posts', 'Posts', '.'].map((d) => join(resolve(SRC), d)).find((d) => {
  try { return statSync(d).isDirectory() && readdirSync(d).some((f) => f.endsWith('.html')); }
  catch { return false; }
});
if (!postsDir) { console.error(`No .html posts found under ${SRC}`); process.exit(2); }

const files = readdirSync(postsDir).filter((f) => f.endsWith('.html')).sort();
if (!DRY && !existsSync(OUT)) mkdirSync(OUT, { recursive: true });

const results = [];
for (const f of files) {
  const html = readFileSync(join(postsDir, f), 'utf8');
  const r = classify(html, f, { minImages: MIN_IMAGES });
  const write = r.kind === 'article' || (r.kind === 'unknown' && INCLUDE_UNKNOWN);
  const name = write ? `${slug(titleOf(html, f))}.md` : null;
  if (write && !DRY) {
    // Carry forward hand-made voice tags. Re-importing once wiped 33 of them;
    // nominations are the only artifact here that cannot be regenerated.
    let carried = '';
    const target = join(OUT, name);
    if (existsSync(target)) {
      const prev = readFileSync(target, 'utf8');
      const m = prev.match(/<!--\s*voice:\s*(reference|no)\s*-->/);
      if (m) carried = m[0] + '\n';
    }
    const date = dateOf(f);
    const genre = genreHint(html, r.text);
    const fm = [
      '<!-- date: ' + (date ?? 'unknown') + ' -->',
      '<!-- genre: ' + genre + ' -->',
      '<!-- words: ' + r.words + ' -->',
      '<!-- source: ' + f + ' -->',
    ].join('\n');
    writeFileSync(target, carried + fm + '\n\n' + r.text, 'utf8');
  }
  results.push({ f, title: titleOf(html, f), ...r, name });
}

const w = (s, n) => String(s).padEnd(n);
console.log(`\n${DRY ? 'DRY RUN — nothing written' : 'writing to test/fixtures/medium/'}\n`);

for (const group of ['article', 'unknown', 'response', 'draft']) {
  const rows = results.filter((r) => r.kind === group).sort((a, b) => b.words - a.words);
  if (!rows.length) continue;
  const label = {
    article: `ARTICLES — imported (${rows.length})`,
    unknown: `UNCERTAIN — excluded (${rows.length})`,
    response: `RESPONSES/COMMENTS — excluded (${rows.length})`,
    draft: `DRAFTS — excluded (${rows.length})`,
  }[group];
  console.log(`  ${label}`);
  const show = group === 'article' ? rows : rows.slice(0, 5);
  for (const r of show) {
    console.log(`    ${w(r.words + 'w', 8)}${w(r.name || '(not written)', 62)}${r.title.slice(0, 46)}`);
    if (group !== 'response' && group !== 'draft') for (const y of r.why) console.log(`    ${' '.repeat(8)}· ${y}`);
  }
  if (rows.length > show.length) console.log(`    ${' '.repeat(8)}… and ${rows.length - show.length} more`);
  console.log('');
}

const n = (k) => results.filter((r) => r.kind === k).length;
const written = results.filter((r) => r.name).length;
console.log(`  ${written} written · ${n('response')} responses · ${n('draft')} drafts · ${n('unknown')} uncertain · ${files.length} total`);
if (EXPECT) {
  console.log(written === EXPECT
    ? `  ✓ matches the expected ${EXPECT}`
    : `\n  ⚠  expected ${EXPECT}, classified ${written}. Run inspect-medium-export.mjs and compare.`);
}
if (n('unknown') && !INCLUDE_UNKNOWN) {
  console.log(`  Read the UNCERTAIN reasons. If they are real articles, re-run with --include-unknown.`);
}
console.log('');
