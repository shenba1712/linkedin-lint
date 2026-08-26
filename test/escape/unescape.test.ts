/**
 * E10–E12 round-trip side, and the properties as they actually hold.
 *
 * Only idempotence is universal. Losslessness needs input that is not already
 * escaped, because `escape` is idempotent and so not invertible. ADR-002.
 */
import { describe, expect, it } from 'vitest';

import { escapeCommentary, unescapeCommentary } from '../../src/escape.js';

const RAW = [
  'pick()',
  "pick(user, ['name'])",
  'Pick<T, K>',
  '{ name: string }',
  'K extends keyof T',
  'a_b_c',
  '#shenbabuilds @someone',
  '~ * |',
  '',
  'plain text with no reserved characters',
  '🏖️ pick() 🐍',
  '𝐩𝐢𝐜𝐤()',
  'a\r\nb\nc',
  'https://x.com/p?a=(b)&c=[d]',
  'Writing pick() is four lines.',
];

describe('unescapeCommentary', () => {
  it('E10 — undoes a single escape', () => {
    expect(unescapeCommentary('\\(')).toBe('(');
  });

  it('undoes every reserved character', () => {
    for (const ch of '()[]{}<>@#*_~|\\') {
      expect(unescapeCommentary(`\\${ch}`)).toBe(ch);
    }
  });

  it('E11 — a lone trailing backslash passes through, no crash', () => {
    expect(unescapeCommentary('a\\')).toBe('a\\');
    expect(unescapeCommentary('\\')).toBe('\\');
  });

  it('leaves a backslash before a non-reserved character alone', () => {
    expect(unescapeCommentary('\\n')).toBe('\\n');
  });

  it('E12 — escaped backslash then escaped paren', () => {
    expect(unescapeCommentary('\\\\\\(')).toBe('\\(');
  });

  it('leaves emoji and bold untouched', () => {
    expect(unescapeCommentary('🏖️ \\( 🐍')).toBe('🏖️ ( 🐍');
    expect(unescapeCommentary('𝐩𝐢𝐜𝐤\\(\\)')).toBe('𝐩𝐢𝐜𝐤()');
  });
});

describe('the properties, as they actually hold', () => {
  it('escape is idempotent — always', () => {
    for (const s of RAW) {
      const once = escapeCommentary(s);
      expect(escapeCommentary(once)).toBe(once);
    }
  });

  it('escape is lossless on UNESCAPED input', () => {
    for (const s of RAW) {
      expect(unescapeCommentary(escapeCommentary(s))).toBe(s);
    }
  });

  it('and is NOT lossless on already-escaped input — this is the documented limit', () => {
    /* `escape` is idempotent, so it maps both of these to the same string. One output,
       two inputs: it cannot be inverted for both, and idempotence is the property
       ADR-002 chose to keep. */
    expect(escapeCommentary('(')).toBe(escapeCommentary('\\('));
    expect(unescapeCommentary(escapeCommentary('\\('))).toBe('(');
    expect(unescapeCommentary(escapeCommentary('\\('))).not.toBe('\\(');
  });

  it('the escaped form survives a round trip for these inputs', () => {
    // NOT a universal property. It was claimed as one and #05 disproved it with
    // `\\<` — see property.test.ts. These particular inputs happen to survive.
    for (const s of [...RAW, '\\(', 'a\\_b', '\\#tag', '\\', 'a\\']) {
      const escaped = escapeCommentary(s);
      expect(escapeCommentary(unescapeCommentary(escaped))).toBe(escaped);
    }
  });

  it('but not for a backslash followed by a reserved character', () => {
    // The counterexample this file's old comment claimed could not exist.
    const escaped = escapeCommentary('\\\\<');
    expect(escapeCommentary(unescapeCommentary(escaped))).not.toBe(escaped);
  });
});
