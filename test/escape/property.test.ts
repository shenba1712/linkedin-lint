/**
 * The three escaping properties, over generated input. qa-test-plan §2.2.
 *
 * Worth more than the whole table above them, because they cover the combinations
 * nobody thought to write down.
 *
 * Deterministic on purpose: a fixed seed means CI runs the same 10,000 cases every
 * time and a failure reproduces exactly. `Math.random()` is banned repo-wide, which
 * forces that discipline rather than leaving it to choice.
 */
import { describe, expect, it } from 'vitest';

import { escapeCommentary, isReserved, unescapeCommentary } from '../../src/escape.js';

const CASES = 10_000;
const SEED = 0x5eed;

/** mulberry32 — small, fast, deterministic. Not cryptographic, does not need to be. */
function makeRng(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const RESERVED = [...'()[]{}<>@#*_~|\\'];
const PLAIN = [...'abcXYZ019 .,:;!?\'"-/'];
const EMOJI = ['🏖️', '🐍', '👍🏽', '🇮🇳', '👩‍💻'];
const ASTRAL = [...'𝐩𝐢𝐜𝐤', ...'𝗣𝗶𝗰𝗸', ...'𝑃𝑖𝑐𝑘'];
const NEWLINE = ['\n', '\r\n', '\n\n'];
const ESCAPED = ['\\(', '\\#', '\\\\', '\\_'];

/** Every kind of atom, including already-escaped pairs. */
const ANY = [...RESERVED, ...PLAIN, ...PLAIN, ...EMOJI, ...ASTRAL, ...NEWLINE, ...ESCAPED];

function pick<T>(rng: () => number, xs: readonly T[]): T {
  return xs[Math.floor(rng() * xs.length)] as T;
}

function genAny(rng: () => number): string {
  const n = Math.floor(rng() * 40);
  let s = '';
  for (let i = 0; i < n; i += 1) s += pick(rng, ANY);
  return s;
}

/**
 * Input that is NOT already escaped — no backslash immediately before a reserved
 * character. That is the domain on which losslessness holds; see ADR-002.
 *
 * Backslashes still appear (a Windows path is ordinary prose), just never in a
 * position that reads as an escape sequence.
 */
function genRaw(rng: () => number): string {
  const atoms = [...RESERVED, ...PLAIN, ...PLAIN, ...EMOJI, ...ASTRAL, ...NEWLINE];
  const n = Math.floor(rng() * 40);
  let s = '';
  let prevWasBackslash = false;
  for (let i = 0; i < n; i += 1) {
    let a = pick(rng, atoms);
    if (prevWasBackslash && isReserved(a[0] as string)) a = pick(rng, PLAIN);
    s += a;
    prevWasBackslash = a[a.length - 1] === '\\';
  }
  return s;
}

/** True when `s` contains a backslash directly before a reserved character. */
function hasEscapeSequence(s: string): boolean {
  const chars = [...s];
  for (let i = 0; i < chars.length - 1; i += 1) {
    if (chars[i] === '\\' && isReserved(chars[i + 1] as string)) return true;
  }
  return false;
}

/**
 * Cut the failing input down to something readable before reporting it. A 40-character
 * random string tells you nothing; three characters tells you everything.
 */
function shrink(input: string, fails: (s: string) => boolean): string {
  let best = input;
  let changed = true;
  while (changed) {
    changed = false;
    const chars = [...best];
    for (let i = 0; i < chars.length; i += 1) {
      const candidate = [...chars.slice(0, i), ...chars.slice(i + 1)].join('');
      if (candidate !== best && fails(candidate)) {
        best = candidate;
        changed = true;
        break;
      }
    }
  }
  return best;
}

function forAll(gen: (rng: () => number) => string, holds: (s: string) => boolean): void {
  const rng = makeRng(SEED);
  for (let i = 0; i < CASES; i += 1) {
    const input = gen(rng);
    if (!holds(input)) {
      const minimal = shrink(input, (s) => !holds(s));
      throw new Error(
        `property failed at case ${i} (seed 0x${SEED.toString(16)})\n` +
          `  input:   ${JSON.stringify(input)}\n` +
          `  shrunk:  ${JSON.stringify(minimal)}`,
      );
    }
  }
}

describe(`the three properties, over ${CASES.toLocaleString('en')} generated inputs each`, () => {
  it('escape is idempotent — always', () => {
    forAll(genAny, (s) => escapeCommentary(escapeCommentary(s)) === escapeCommentary(s));
  });

  it('escape is lossless on input that is not already escaped', () => {
    forAll(genRaw, (s) => unescapeCommentary(escapeCommentary(s)) === s);
  });

  it('the escaped form is stable across a round trip — on raw input only', () => {
    forAll(genRaw, (s) => {
      const e = escapeCommentary(s);
      return escapeCommentary(unescapeCommentary(e)) === e;
    });
  });

  it('and is NOT stable once the input contains an escape sequence', () => {
    /* Found by this suite on 2026-08-26, after being asserted as universal in 9 docs.
       `\\<` escapes to `\\\<`; unescape reads `\\`->`\` then `\<`->`<`, giving `\<`;
       re-escaping is idempotent so it stays `\<`. The loss happens at UNESCAPE, not
       escape. Pinned here so the false claim cannot come back. */
    for (const s of ['\\\\<', '\\\\(', '\\\\#']) {
      const e = escapeCommentary(s);
      expect(escapeCommentary(unescapeCommentary(e))).not.toBe(e);
    }
  });

  it('escaped output never contains a bare reserved character', () => {
    forAll(genAny, (s) => {
      const chars = [...escapeCommentary(s)];
      for (let i = 0; i < chars.length; i += 1) {
        if (!isReserved(chars[i] as string)) continue;
        if (chars[i] === '\\' && isReserved(chars[i + 1] as string)) { i += 1; continue; }
        return false;
      }
      return true;
    });
  });
});

/**
 * The generators are only as good as what they actually produce. A corpus that never
 * emits a backslash would pass every property vacuously — the repo has been bitten four
 * times by a variable that looked like a discriminator and was near-constant.
 */
describe('the corpus contains what the properties need', () => {
  const rng = makeRng(SEED);
  const corpus = Array.from({ length: CASES }, () => genAny(rng));
  const share = (p: (s: string) => boolean): number =>
    corpus.filter(p).length / corpus.length;

  it('mostly contains reserved characters', () => {
    /* Measured 0.893 at this seed. The floor is what matters, not the exact figure. */
    expect(share((s) => [...s].some(isReserved))).toBeGreaterThan(0.85);
  });

  it('contains already-escaped sequences — the qualified case', () => {
    expect(share(hasEscapeSequence)).toBeGreaterThan(0.5);
  });

  it('contains emoji, astral-plane characters and newlines', () => {
    expect(share((s) => /\p{Extended_Pictographic}/u.test(s))).toBeGreaterThan(0.4);
    expect(share((s) => [...s].some((c) => (c.codePointAt(0) ?? 0) > 0xffff))).toBeGreaterThan(0.5);
    expect(share((s) => s.includes('\n'))).toBeGreaterThan(0.4);
  });

  it('includes the empty string and long inputs', () => {
    expect(corpus.some((s) => s === '')).toBe(true);
    expect(Math.max(...corpus.map((s) => s.length))).toBeGreaterThan(40);
  });

  it('genRaw never emits an escape sequence — or property 2 tests nothing', () => {
    const r = makeRng(SEED);
    const raw = Array.from({ length: CASES }, () => genRaw(r));
    expect(raw.filter(hasEscapeSequence)).toHaveLength(0);
    /* Measured 0.870 at this seed. */
    expect(raw.filter((s) => [...s].some(isReserved)).length / raw.length).toBeGreaterThan(0.85);
  });
});
