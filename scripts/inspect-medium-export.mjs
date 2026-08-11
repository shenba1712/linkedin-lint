#!/usr/bin/env node
/**
 * Print the structural fingerprint of every file in a Medium export.
 *
 *   node scripts/inspect-medium-export.mjs <path-to-unzipped-export>
 *
 * This exists because the import classifier has been wrong twice — once too
 * strict, once too permissive — both times because it was built on guessed
 * markup. This reads what is actually there so the filter can be built on
 * evidence instead.
 *
 * Reads only. Writes nothing. Zero dependencies.
 */
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, resolve, basename } from 'node:path';
import { classify, titleDuplicatesBody } from './lib/medium.mjs';
const MIN_IMAGES = Number((process.argv.find((a) => a.startsWith('--min-images=')) || '').split('=')[1] || 1);

const SRC = process.argv[2];
if (!SRC) {
  console.error('Usage: node scripts/inspect-medium-export.mjs <path-to-unzipped-export>');
  process.exit(2);
}

const postsDir = ['posts', 'Posts', '.'].map((d) => join(resolve(SRC), d)).find((d) => {
  try { return statSync(d).isDirectory() && readdirSync(d).some((f) => f.endsWith('.html')); }
  catch { return false; }
});
if (!postsDir) { console.error(`No .html files found under ${SRC}`); process.exit(2); }

const files = readdirSync(postsDir).filter((f) => f.endsWith('.html')).sort();

const strip = (h) => h.replace(/<[^>]+>/g, ' ').replace(/&[a-z#0-9]+;/gi, ' ')
  .replace(/\s+/g, ' ').trim();

function fingerprint(html) {
  const f = {};

  // Which title-ish elements exist, and what do they contain?
  f.h1 = (html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i) || [])[1];
  f.h1 = f.h1 ? strip(f.h1).slice(0, 70) : null;
  f.h3first = (html.match(/<h3[^>]*>([\s\S]*?)<\/h3>/i) || [])[1];
  f.h3first = f.h3first ? strip(f.h3first).slice(0, 70) : null;
  f.title = (html.match(/<title[^>]*>([\s\S]*?)<\/title>/i) || [])[1];
  f.title = f.title ? strip(f.title).slice(0, 70) : null;

  // Medium's export markup conventions, whichever are present.
  f.classes = [...new Set(
    [...html.matchAll(/class="([^"]+)"/g)]
      .flatMap((m) => m[1].split(/\s+/))
      .filter((c) => /graf|section|response|subtitle|title|postField|p-summary|p-name/i.test(c))
  )].slice(0, 12);

  f.dataFields = [...new Set([...html.matchAll(/data-field="([^"]+)"/g)].map((m) => m[1]))];

  // Canonical URL shape often differs between an article and a response.
  const canon = (html.match(/<link[^>]+rel="canonical"[^>]+href="([^"]+)"/i)
              || html.match(/<footer[\s\S]*?href="(https:\/\/medium\.com[^"]+)"/i) || [])[1];
  f.canonical = canon ? canon.replace(/^https?:\/\//, '').slice(0, 78) : null;

  // Explicit reply markers, if Medium emits any.
  f.replyMarkers = [
    /inResponseTo/i.test(html) && 'inResponseTo',
    /\bin response to\b/i.test(html) && '"in response to"',
    /class="[^"]*response/i.test(html) && 'class~=response',
    /parentPost|inResponseToPost/i.test(html) && 'parentPost',
  ].filter(Boolean);

  const body = strip(html);
  f.words = body.split(' ').filter(Boolean).length;

  // ── wider net. With 180+ articles vs ~280 responses, the discriminator has
  // to split roughly 180/280 — none of the earlier fields did. ──
  f.figures    = (html.match(/<figure/gi) || []).length;
  f.images     = (html.match(/<img/gi) || []).length;
  f.h3count    = (html.match(/<h3/gi) || []).length;
  f.h4count    = (html.match(/<h4/gi) || []).length;
  f.paragraphs = (html.match(/<p[ >]/gi) || []).length;
  f.listItems  = (html.match(/<li[ >]/gi) || []).length;
  f.preBlocks  = (html.match(/<pre/gi) || []).length;
  f.links      = (html.match(/<a [^>]*href/gi) || []).length;
  f.blockquote = (html.match(/<blockquote/gi) || []).length;

  // subtitle: does the section exist AND contain text?
  const sub = html.match(/data-field="subtitle"[^>]*>([\s\S]*?)<\/section>/i);
  f.subtitleText = sub ? strip(sub[1]).slice(0, 40) : null;

  // any link back to another medium post from a footer/header region
  f.parentLink = /<footer[\s\S]{0,600}medium\.com/i.test(html);

  // filename shape is measured at the call site, where the filename is in scope —
  // the `nameLen` set here was overwritten by the spread below and never survived.
  f.titleIsBodyPrefix = titleDuplicatesBody(html);
  return f;
}

const VERBOSE = process.argv.includes('--verbose');
console.log(`\n${files.length} files in ${postsDir}\n`);

const rows = files.map((f) => {
  const html = readFileSync(join(postsDir, f), 'utf8');
  return { f, ...fingerprint(html), nameLen: f.length, kind: classify(html, f, { minImages: MIN_IMAGES }).kind };
});

for (const r of VERBOSE ? rows : []) {
  const draft = /^draft_/i.test(r.f);
  console.log(`── ${basename(r.f)}${draft ? '   [draft_ prefix]' : ''}`);
  console.log(`     words        ${r.words}`);
  console.log(`     <h1>         ${r.h1 ?? '(none)'}`);
  if (r.h3first) console.log(`     first <h3>   ${r.h3first}`);
  console.log(`     <title>      ${r.title ?? '(none)'}`);
  console.log(`     canonical    ${r.canonical ?? '(none)'}`);
  console.log(`     data-field   ${r.dataFields.length ? r.dataFields.join(', ') : '(none)'}`);
  console.log(`     classes      ${r.classes.length ? r.classes.join(' ') : '(none)'}`);
  console.log(`     reply marks  ${r.replyMarkers.length ? r.replyMarkers.join(', ') : '(none)'}`);
  console.log(`     h1 == body opening?  ${r.titleIsBodyPrefix === null ? 'n/a' : r.titleIsBodyPrefix}`);
  console.log('');
}

/* ── titles by group. THE decisive check: you recognise your own articles. ── */
const byKind = (k) => rows.filter((r) => r.kind === k);
const label = (r) => (r.title || r.h1 || basename(r.f)).slice(0, 78);

for (const [kind, heading] of [
  ['article', 'CLASSIFIED AS ARTICLE — would be imported'],
  ['unknown', 'UNCERTAIN — excluded'],
]) {
  const g = byKind(kind);
  if (!g.length) continue;
  console.log('─'.repeat(72));
  console.log(`${heading}  (${g.length})\n`);
  for (const r of g.sort((a, b) => b.words - a.words)) {
    console.log(`  ${String(r.words + 'w').padEnd(8)}${label(r)}`);
  }
  console.log('');
}

const resp = byKind('response');
if (resp.length) {
  console.log('─'.repeat(72));
  console.log(`CLASSIFIED AS RESPONSE — excluded  (${resp.length})`);
  console.log(`\n  Longest 30 shown. If you recognise ARTICLES here, the discriminator`);
  console.log(`  is wrong and these are the ones to look at.\n`);
  for (const r of resp.sort((a, b) => b.words - a.words).slice(0, 30)) {
    console.log(`  ${String(r.words + 'w').padEnd(8)}${label(r)}`);
  }
  if (resp.length > 30) console.log(`  ${' '.repeat(8)}… and ${resp.length - 30} more`);
  console.log('');
}

/* ── what varies across the corpus is what can discriminate ─────────────── */
console.log('─'.repeat(72));
console.log('WHAT VARIES — only a field that differs between files can classify them\n');

const vary = (label, fn) => {
  const vals = new Map();
  for (const r of rows) {
    const k = String(fn(r));
    vals.set(k, (vals.get(k) ?? 0) + 1);
  }
  const parts = [...vals.entries()].sort((a, b) => b[1] - a[1])
    .map(([k, n]) => `${n}× ${k.length > 40 ? k.slice(0, 40) + '…' : k}`);
  console.log(`  ${label.padEnd(22)}${vals.size === 1 ? 'CONSTANT — useless for classifying' : parts.join('  |  ')}`);
};

const bucket = (n, edges) => {
  for (const e of edges) if (n <= e) return `<=${e}`;
  return `>${edges[edges.length - 1]}`;
};

vary('has <h1>', (r) => Boolean(r.h1));
vary('has <title>', (r) => Boolean(r.title));
vary('data-field set', (r) => r.dataFields.join('+') || 'none');
vary('reply markers', (r) => r.replyMarkers.join('+') || 'none');
vary('canonical has slug', (r) => (r.canonical ? /\/[a-z0-9-]{12,}-[0-9a-f]{8,}/.test(r.canonical) : 'no-canonical'));
vary('h1 == body opening', (r) => r.titleIsBodyPrefix);
vary('draft_ prefix', (r) => /^draft_/i.test(r.f));
vary('CLASSIFIED AS', (r) => r.kind);
console.log('');
vary('has subtitle text', (r) => Boolean(r.subtitleText));
vary('figures', (r) => bucket(r.figures, [0, 1, 3]));
vary('images', (r) => bucket(r.images, [0, 1, 3]));
vary('<h3> count', (r) => bucket(r.h3count, [0, 1, 3, 8]));
vary('<h4> count', (r) => bucket(r.h4count, [0, 1, 3]));
vary('paragraphs', (r) => bucket(r.paragraphs, [1, 3, 6, 12, 25]));
vary('list items', (r) => bucket(r.listItems, [0, 3, 10]));
vary('<pre> blocks', (r) => bucket(r.preBlocks, [0, 1]));
vary('links', (r) => bucket(r.links, [0, 2, 6, 15]));
vary('blockquotes', (r) => bucket(r.blockquote, [0, 1]));
vary('footer medium link', (r) => r.parentLink);
vary('words', (r) => bucket(r.words, [200, 400, 700, 1200, 2000]));
vary('filename length', (r) => bucket(r.nameLen, [40, 60, 80, 110]));

console.log(`\n  words: min ${Math.min(...rows.map((r) => r.words))}, max ${Math.max(...rows.map((r) => r.words))}`);
/* ── TSV for spreadsheet triage ──────────────────────────────────────────── */
if (process.argv.includes('--tsv')) {
  const cols = ['f','words','paragraphs','h3count','h4count','figures','images','listItems',
                'preBlocks','links','blockquote','subtitleText','parentLink','titleIsBodyPrefix','kind','title'];
  console.log('\n' + cols.join('\t'));
  for (const r of rows) {
    console.log(cols.map((c) => String(r[c] ?? '').replace(/\t/g, ' ')).join('\t'));
  }
  process.exit(0);
}

console.log(`
  ────────────────────────────────────────────────────────────────────
  READ THE TITLE LISTS ABOVE, not the counts.

  You recognise your own articles. The question is only which group they
  are in. Three possibilities:

    · all your articles are under ARTICLE   → the discriminator works
    · some are under RESPONSE               → it is wrong, and those titles
                                              say which signal to change
    · articles are spread across both       → h1-vs-body is the wrong idea
                                              entirely and something else is
                                              needed

  Run with --verbose for the per-file structural dump.
`);
