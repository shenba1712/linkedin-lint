/**
 * The worst-case fixture, plus edge cases the inline table misses. qa-test-plan §2.4.
 *
 * File-based because a string literal in a test drifts; the fixture is the bytes.
 */
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

import { escapeCommentary, isReserved, unescapeCommentary } from '../../src/escape.js';

const worstCase = readFileSync(
  new URL('../fixtures/public/worst-case.txt', import.meta.url),
  'utf8',
);

describe('worst-case.txt — E13–E18 in one file', () => {
  it('contains every hazard it claims to', () => {
    // §2.4 said "mixed newlines" and the file had none until 2026-08-26.
    const cp = [...worstCase];
    expect(new Set(cp.filter(isReserved)).size).toBe(15);
    expect(cp.some((c) => (c.codePointAt(0) ?? 0) >= 0x1d400 && (c.codePointAt(0) ?? 0) <= 0x1d433)).toBe(true);
    expect(cp.some((c) => (c.codePointAt(0) ?? 0) >= 0x1d5d4 && (c.codePointAt(0) ?? 0) <= 0x1d607)).toBe(true);
    expect(/\p{Extended_Pictographic}/u.test(worstCase)).toBe(true);
    expect(worstCase).toContain('\r\n');
    expect(/(?<!\r)\n/.test(worstCase)).toBe(true);
    expect(worstCase).toContain('\\(');
  });

  it('escapes every reserved character', () => {
    const escaped = [...escapeCommentary(worstCase)];
    for (let i = 0; i < escaped.length; i += 1) {
      if (!isReserved(escaped[i] as string)) continue;
      expect(escaped[i]).toBe('\\');
      expect(isReserved(escaped[i + 1] as string)).toBe(true);
      i += 1;
    }
  });

  it('is idempotent', () => {
    const once = escapeCommentary(worstCase);
    expect(escapeCommentary(once)).toBe(once);
  });

  it('preserves newlines, emoji and bold exactly', () => {
    const escaped = escapeCommentary(worstCase);
    expect((escaped.match(/\r\n/g) ?? []).length).toBe((worstCase.match(/\r\n/g) ?? []).length);
    expect(escaped).toContain('𝐩𝐢𝐜𝐤');
    expect(escaped).toContain('𝗽𝗶𝗰𝗸');
    expect(escaped).toContain('🚀');
  });

  it('does NOT round-trip — it contains an already-escaped pair', () => {
    // The file has `\(` on purpose — the class `unescape` cannot recover (ADR-002).
    // Asserted so nobody "fixes" the fixture to make a round-trip test pass.
    expect(unescapeCommentary(escapeCommentary(worstCase))).not.toBe(worstCase);
  });

  it('round-trips once the escape sequence is removed', () => {
    const raw = worstCase.replace('\\(', '(');
    expect(unescapeCommentary(escapeCommentary(raw))).toBe(raw);
  });
});

describe('edge cases the table does not reach', () => {
  it('survives a lone unpaired surrogate', () => {
    // `\uD800` alone is not a valid code point. for-of yields it as one element.
    const lone = 'a\uD800(b';
    expect(() => escapeCommentary(lone)).not.toThrow();
    expect(escapeCommentary(lone)).toBe('a\uD800\\(b');
    expect(unescapeCommentary(escapeCommentary(lone))).toBe(lone);
  });

  it('survives a lone surrogate at either end', () => {
    for (const s of ['\uD800', '\uDC00', '(\uD800', '\uDC00)']) {
      expect(() => escapeCommentary(s)).not.toThrow();
      expect(unescapeCommentary(escapeCommentary(s))).toBe(s);
    }
  });

  it('handles 100KB of mixed content without blowing up', () => {
    const big = (worstCase.replace('\\(', '(') + '\n').repeat(200);
    expect(big.length).toBeGreaterThan(100_000);
    const started = performance.now();
    const escaped = escapeCommentary(big);
    const elapsed = performance.now() - started;
    expect(unescapeCommentary(escaped)).toBe(big);
    expect(elapsed).toBeLessThan(500);
  });

  it('escapes 3,000 of every reserved character except the backslash', () => {
    for (const ch of '()[]{}<>@#*_~|') {
      expect(escapeCommentary(ch.repeat(3000))).toBe(`\\${ch}`.repeat(3000));
    }
  });

  it('a run of backslashes is read as already-escaped pairs, and left alone', () => {
    // `\` is both the escape char and reserved, so a run reads as escaped pairs.
    // Even runs are unchanged; odd runs gain one for the unpaired last backslash.
    expect(escapeCommentary('\\'.repeat(3000))).toBe('\\'.repeat(3000));
    expect(escapeCommentary('\\\\')).toBe('\\\\');
    expect(escapeCommentary('\\\\\\')).toBe('\\\\\\\\');
    expect(escapeCommentary('\\')).toBe('\\\\');
  });
});
