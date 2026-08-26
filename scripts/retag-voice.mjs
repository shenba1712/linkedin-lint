#!/usr/bin/env node
/**
 * Restore <!-- voice: reference --> tags from voice-reference.txt. Idempotent.
 * A re-import once wiped 33 nominations, and they cannot be regenerated.
 *
 *   node scripts/retag-voice.mjs [--dry-run]
 */
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { join, resolve, dirname } from 'node:path';

const ROOT = resolve(dirname(new URL(import.meta.url).pathname), '..');
const LIST = join(ROOT, 'scripts/voice-reference.txt');
const DRY = process.argv.includes('--dry-run');
const TAG = '<!-- voice: reference -->';

if (!existsSync(LIST)) { console.error(`missing ${LIST}`); process.exit(2); }

const names = readFileSync(LIST, 'utf8').split('\n').map((s) => s.trim()).filter(Boolean);
let tagged = 0, already = 0, missing = 0;

for (const n of names) {
  const p = join(ROOT, 'test/fixtures/medium', n);
  if (!existsSync(p)) { console.log(`  missing   ${n}`); missing++; continue; }
  const t = readFileSync(p, 'utf8');
  if (t.includes('voice: reference')) { already++; continue; }
  // sit the tag above any date/genre front matter so it reads first
  if (!DRY) writeFileSync(p, `${TAG}\n${t}`, 'utf8');
  tagged++;
}

console.log(`\n${DRY ? 'DRY RUN  ' : ''}tagged ${tagged} · already ${already} · missing ${missing} · listed ${names.length}`);
if (missing) console.log(`  A missing file usually means a title changed and the slug moved.`);
console.log('');
