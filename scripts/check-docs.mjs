#!/usr/bin/env node
/**
 * Doc consistency checker. No dependencies. Run: node scripts/check-docs.mjs
 *
 * Exists because the same failure happened three times during authoring: something
 * specified in one doc and never propagated to the others. Prose cannot enforce that.
 * This can.
 *
 * Exit 0 = consistent. Exit 1 = drift. Exit 2 = the checker itself broke.
 */
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { join, dirname, resolve, relative } from 'node:path';

const ROOT = resolve(dirname(new URL(import.meta.url).pathname), '..');
const DOCS = join(ROOT, 'docs');
const problems = [];
const notes = [];
const fail = (check, msg) => problems.push(`${check}: ${msg}`);
const note = (msg) => notes.push(msg);

const read = (p) => readFileSync(p, 'utf8');
const mdFiles = (dir) =>
  existsSync(dir) ? readdirSync(dir).filter((f) => f.endsWith('.md')).map((f) => join(dir, f)) : [];

const allDocs = [
  ...mdFiles(DOCS),
  ...mdFiles(join(DOCS, 'adr')),
  ...mdFiles(join(DOCS, 'core')),
];
const rootDocs = ['CLAUDE.md', 'README.md', 'NEXT.md']
  .map((f) => join(ROOT, f))
  .filter((f) => existsSync(f));
/* Root files were previously unscanned. Cadence had two stale claims survive in
   CLAUDE.md for exactly that reason. */
const corpus = new Map([...allDocs, ...rootDocs].map((p) => [p, read(p)]));
const rel = (p) => relative(ROOT, p);

/* ── 1. Ticket ids are unique ───────────────────────────────────────────────
   Nearly collided #43 twice during authoring. */
const ticketsPath = join(DOCS, 'core/tickets.md');
const tickets = existsSync(ticketsPath) ? read(ticketsPath) : '';
const ticketRows = [...tickets.matchAll(/^\|\s*\*\*#(H?[0-9]+[a-z]?)\*\*\s*\|[^|]*\|[^|]*\|[^|]*\|/gm)].map((m) => m[1]);
const seen = new Set();
for (const id of ticketRows) {
  if (seen.has(id)) fail('ticket-unique', `#${id} defined more than once`);
  seen.add(id);
}
note(`${ticketRows.length} tickets, ${seen.size} unique`);

/* ── 2. Every ticket dependency resolves ────────────────────────────────────
   B1 pointed at #38 when it meant #42. Caught by hand; should not have been. */
const blockerIds = new Set([...tickets.matchAll(/\*\*(B[0-9]+)\*\*/g)].map((m) => m[1]));
for (const row of tickets.split('\n')) {
  const m = row.match(/^\|\s*\*\*#(H?[0-9]+[a-z]?)\*\*\s*\|[^|]*\|[^|]*\|([^|]*)\|/);
  if (!m) continue;
  const [, self, depCell] = m;
  for (const dep of depCell.matchAll(/#(H?[0-9]+[a-z]?)/g)) {
    if (!seen.has(dep[1])) fail('ticket-deps', `#${self} depends on #${dep[1]}, which does not exist`);
    if (dep[1] === self) fail('ticket-deps', `#${self} depends on itself`);
  }
  for (const b of depCell.matchAll(/\b(B[0-9]+)\b/g)) {
    if (!blockerIds.has(b[1])) fail('ticket-deps', `#${self} depends on ${b[1]}, which is not defined`);
  }
}
/* Blockers must name a real ticket in their Blocks column. */
for (const row of tickets.split('\n')) {
  const m = row.match(/^\|\s*\*\*(B[0-9]+)\*\*\s*\|[^|]*\|([^|]*)\|/);
  if (!m) continue;
  const refs = [...m[2].matchAll(/#(H?[0-9]+[a-z]?)/g)].map((x) => x[1]);
  for (const r of refs) {
    if (!seen.has(r)) fail('blocker-deps', `${m[1]} says it blocks #${r}, which does not exist`);
  }
}

/* ── 3. Point totals match the sum of the rows ───────────────────────────────
   Hand-maintained totals were edited five times. Exactly what rots silently. */
const rowPoints = [...tickets.matchAll(/^\|\s*\*\*#H?[0-9]+[a-z]?\*\*\s*\|[^|]*\|\s*([0-9]+)\s*\|/gm)]
  .reduce((a, m) => a + Number(m[1]), 0);
const declared = tickets.match(/^\|\s*\*\*Total\*\*\s*\|\s*\*\*([0-9]+)\*\*/m);
if (declared) {
  if (Number(declared[1]) !== rowPoints) {
    fail('points', `summary says ${declared[1]} but the ticket rows sum to ${rowPoints}`);
  } else {
    note(`points reconcile: ${rowPoints}`);
  }
} else {
  fail('points', 'no **Total** row found in the summary table');
}

/* ── 3b. Phase headings and the summary table reconcile with the rows ────────
   Three different sets of numbers existed for the same tickets: headings summed to
   108, the summary table to 111, the rows to 114. Cadence had copied the 108. */
{
  const lines = tickets.split('\n');
  let cur = null;
  const rowSum = {}, fromHeading = {};
  for (const l of lines) {
    const h = l.match(/^## Phase (0[a-i]) — .*?\((\d+) pts\)/);
    if (h) { cur = h[1]; fromHeading[cur] = Number(h[2]); rowSum[cur] ??= 0; continue; }
    if (/^## /.test(l)) { cur = null; continue; }
    const m = l.match(/^\|\s*\*\*#?([A-Z]?\d+[a-z]?)\*\*\s*\|[^|]*\|\s*(\d+)\s*\|/);
    if (m && cur) rowSum[cur] += Number(m[2]);
  }
  const fromTable = {};
  for (const m of tickets.matchAll(/^\| (0[a-i]) [^|]*\|\s*(\d+)\s*\|/gm)) fromTable[m[1]] = Number(m[2]);
  for (const k of Object.keys(rowSum)) {
    if (fromHeading[k] !== rowSum[k]) {
      fail('phase-points', `Phase ${k} heading says ${fromHeading[k]} pts but its rows sum to ${rowSum[k]}`);
    }
    if (fromTable[k] !== undefined && fromTable[k] !== rowSum[k]) {
      fail('phase-points', `summary table says Phase ${k} is ${fromTable[k]} but its rows sum to ${rowSum[k]}`);
    }
  }
  const t = Object.values(rowSum).reduce((a, b) => a + b, 0);
  if (t) note(`phase points reconcile: ${t}`);
}

/* ── 4. Rule ids are consistent, and every rule is documented ───────────────
   Rule ids are PUBLIC API — consumers suppress by id. A rename is a breaking
   change, and an undocumented rule is one nobody can suppress. */
const rrPath = join(DOCS, 'rules-reference.md');
if (existsSync(rrPath)) {
  const rr = read(rrPath);
  const documented = new Set([...rr.matchAll(/`([a-z]+\/[a-z-]+)`/g)].map((m) => m[1]));
  note(`${documented.size} rules documented in rules-reference.md`);
  const OTHERS = ['prd.md', 'trd.md', 'api-specifications.md', 'cli-design.md', 'qa-test-plan.md',
                  'landing-page.md', 'core/tickets.md'];
  for (const f of OTHERS) {
    const p = join(DOCS, f);
    if (!existsSync(p)) continue;
    /* `style` replaced `prohibitions` in ADR-007. `prohibitions` stays in this list so a
       stale id anywhere is still caught by the "not documented" branch below, rather than
       silently ignored because its group is unknown. */
    for (const m of read(p).matchAll(/`((?:escape|fold|counts|style|prohibitions|tells|bold|similarity)\/[a-z-]+)`/g)) {
      if (!documented.has(m[1])) {
        fail('rule-ids', `${f} references \`${m[1]}\` but rules-reference.md does not document it`);
      }
    }
  }
  /* Severity contract: only three groups may be `error`. */
  for (const line of rr.split('\n')) {
    const m = line.match(/^\|\s*`([a-z]+)\/([a-z-]+)`\s*\|\s*\*?\*?error/);
    if (m && !['escape', 'counts', 'bold'].includes(m[1])) {
      fail('severity', `\`${m[1]}/${m[2]}\` is error severity; only escape/*, counts/over-limit and bold/code-identifier may be`);
    }
  }
  /* ADR-007 renamed prohibitions/* to style/*. Rule ids are public API, so a half-done
     rename is worse than none: it leaves two names for one rule in a consumer's config.

     An old id is allowed only on a line that also names its replacement — the shape of a
     migration row. A bare mention anywhere else is a rename that was missed. */
  for (const [p, text] of corpus) {
    for (const line of text.split('\n')) {
      const old = line.match(/`(prohibitions\/[a-z-]+)`/);
      if (old && !/`style\/[a-z-]+`/.test(line)) {
        fail('rule-rename', `${rel(p)} still uses \`${old[1]}\` with no replacement named on the same line; ADR-007 renamed the group to style/*`);
      }
    }
  }
}

/* ── 5. ADR index and files agree, both directions ─────────────────────────── */
const adrDir = join(DOCS, 'adr');
const adrIndexPath = join(adrDir, 'README.md');
if (existsSync(adrIndexPath)) {
  const idx = read(adrIndexPath);
  const files = readdirSync(adrDir).filter((f) => /^ADR-[0-9]+.*\.md$/.test(f));
  for (const f of files) {
    if (!idx.includes(f)) fail('adr-index', `${f} exists but is not in adr/README.md`);
  }
  for (const m of idx.matchAll(/\((ADR-[0-9]+[^)]*\.md)\)/g)) {
    if (!files.includes(m[1])) fail('adr-index', `adr/README.md links ${m[1]}, which does not exist`);
  }
  note(`${files.length} ADRs, all indexed`);
}

/* ── 6. Every relative markdown link resolves ───────────────────────────────
   Catches a doc renamed without updating its referrers. */
for (const [p, text] of corpus) {
  for (const m of text.matchAll(/\]\((\.[^)#\s]*\.md)(#[^)]*)?\)/g)) {
    const target = resolve(dirname(p), m[1]);
    if (!existsSync(target)) fail('links', `${rel(p)} → ${m[1]} does not exist`);
  }
}

/* ── 6b. Inline-code file paths resolve ──────────────────────────────────────
   Finding #25 — docs referencing `seed/linkedin-content-queue.md` after it moved out
   of the tree — was logged as fixed by check 6. It was not: check 6 only reads
   markdown links, and the reference was in backticks. It survived in five places.

   Only paths whose PARENT directory already exists are checked, so planned files
   (`src/...`, `migrations/...`) are correctly ignored until their directory appears.

   That heuristic breaks the moment a directory is created for its FIRST file: #01 adds
   `src/index.ts`, and every other `src/*.ts` the docs mention becomes a failure even
   though its ticket has not been worked yet. Hence PLANNED — files the docs describe and
   a named ticket will create.

   A PLANNED entry that now EXISTS is itself a failure, so the list cannot rot into a
   permanent bypass: landing the ticket forces removing the line. */
const PLANNED = new Map([
  ['src/types.ts', '#02'],
  ['src/escape.ts', '#03'],
]);
for (const [p, ticket] of PLANNED) {
  if (existsSync(join(ROOT, p))) {
    fail('planned', `${p} now exists — ${ticket} has landed, so remove it from PLANNED in scripts/check-docs.mjs`);
  }
}
note(`${PLANNED.size} planned files not yet built: ${[...PLANNED].map(([f, t]) => `${f} (${t})`).join(', ')}`);

for (const [p, text] of corpus) {
  for (const m of text.matchAll(/`([a-z0-9_.-]+(?:\/[a-z0-9_.-]+)+\.[a-z]{2,4})`/gi)) {
    const path = m[1];
    if (/^https?:|^\.\/|node_modules|^@/.test(path)) continue;
    if (PLANNED.has(path)) continue;
    const abs = join(ROOT, path);
    if (existsSync(abs)) continue;
    if (!existsSync(dirname(abs))) continue; // directory not created yet — planned file
    fail('inline-paths', `${rel(p)} references \`${path}\`, whose directory exists but the file does not`);
  }
}

/* ── 7. docs/README.md indexes every doc, and only real ones ───────────────── */
const indexPath = join(DOCS, 'README.md');
if (existsSync(indexPath)) {
  const idx = read(indexPath);
  for (const p of allDocs) {
    const base = p.split('/').slice(-1)[0];
    if (base === 'README.md') continue;
    const inAdr = p.includes('/adr/');
    if (inAdr) continue; // ADRs are indexed by adr/README.md
    if (!idx.includes(base)) fail('doc-index', `docs/${base} is not linked from docs/README.md`);
  }
}

/* ── 8. Traceability: every finding has doc + ticket + test, and ids resolve ── */
const tracePath = join(DOCS, 'traceability.md');
if (existsSync(tracePath)) {
  const trace = read(tracePath);
  const qa = existsSync(join(DOCS, 'qa-test-plan.md')) ? read(join(DOCS, 'qa-test-plan.md')) : '';
  let rows = 0;
  for (const line of trace.split('\n')) {
    const m = line.match(/^\|\s*([0-9]+)\s*\|([^|]*)\|([^|]*)\|([^|]*)\|([^|]*)\|/);
    if (!m) continue;
    rows++;
    const [, id, , docCell, ticketCell, testCell] = m;
    if (!docCell.trim() || docCell.includes('TODO')) fail('traceability', `finding ${id} has no doc`);
    if (!ticketCell.trim() || ticketCell.includes('TODO')) fail('traceability', `finding ${id} has no ticket`);
    if (!testCell.trim() || testCell.includes('TODO')) fail('traceability', `finding ${id} has no test`);
    for (const t of ticketCell.matchAll(/#(H?[0-9]+[a-z]?)/g)) {
      if (!seen.has(t[1])) fail('traceability', `finding ${id} cites #${t[1]}, which does not exist`);
    }
    for (const t of testCell.matchAll(/\b((?:HRD|ARC|PUB|SEC|E|C)-[0-9]+)\b/g)) {
      if (qa && !qa.includes(t[1])) {
        fail('traceability', `finding ${id} cites test ${t[1]}, which is not in qa-test-plan.md`);
      }
    }
  }
  note(`${rows} findings traced`);
} else {
  fail('traceability', 'docs/traceability.md is missing');
}

/* ── 9. No unpublished content in a public repo ──────────────────────────────
   A real leak was found by hand during authoring: a draft line quoted in the PRD. */
const FORBIDDEN = [/parental leave/i];
for (const [p, text] of corpus) {
  for (const pat of FORBIDDEN) {
    if (pat.test(text)) fail('content-leak', `${rel(p)} matches ${pat} — this repo is public`);
  }
}


/* ── report ──────────────────────────────────────────────────────────────── */
const g = (s) => `\x1b[32m${s}\x1b[0m`;
const r = (s) => `\x1b[31m${s}\x1b[0m`;
const d = (s) => `\x1b[2m${s}\x1b[0m`;
console.log(`\n${d('docs consistency')}  ${allDocs.length} files\n`);
for (const n of notes) console.log(`  ${d('·')} ${n}`);
if (problems.length === 0) {
  console.log(`\n  ${g('consistent')}. ${allDocs.length} docs, no drift.\n`);
  process.exit(0);
}
console.log('');
for (const p of problems) console.log(`  ${r('drift')}  ${p}`);
console.log(`\n  ${r(`${problems.length} problem${problems.length === 1 ? '' : 's'}`)}.\n`);
process.exit(1);
