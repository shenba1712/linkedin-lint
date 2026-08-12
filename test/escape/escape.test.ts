/**
 * E1–E9 from qa-test-plan §2.1, plus the idempotence and code-point cases #03 owns.
 *
 * Round-trip cases wait for #04 (`unescapeCommentary`) and the generated ones for #05.
 */
import { describe, expect, it } from 'vitest';

import { escapeCommentary, isReserved } from '../../src/escape.js';

describe('table cases', () => {
  it('E1 — pick()', () => {
    expect(escapeCommentary('pick()')).toBe('pick\\(\\)');
  });

  it('E2 — pick(user, [\'name\'])', () => {
    expect(escapeCommentary("pick(user, ['name'])")).toBe("pick\\(user, \\['name'\\]\\)");
  });

  it('E3 — Pick<T, K>', () => {
    expect(escapeCommentary('Pick<T, K>')).toBe('Pick\\<T, K\\>');
  });

  it('E4 — { name: string }', () => {
    expect(escapeCommentary('{ name: string }')).toBe('\\{ name: string \\}');
  });

  it('E5 — no reserved characters, unchanged', () => {
    expect(escapeCommentary('K extends keyof T')).toBe('K extends keyof T');
  });

  it('E6 — a_b_c', () => {
    expect(escapeCommentary('a_b_c')).toBe('a\\_b\\_c');
  });

  it('E7 — #shenbabuilds', () => {
    expect(escapeCommentary('#shenbabuilds')).toBe('\\#shenbabuilds');
  });

  it('E8 — @someone', () => {
    expect(escapeCommentary('@someone')).toBe('\\@someone');
  });

  it('E9 — ~ * |', () => {
    expect(escapeCommentary('~ * |')).toBe('\\~ \\* \\|');
  });

  it('escapes all 15 reserved characters and nothing else', () => {
    const reserved = '()[]{}<>@#*_~|\\';
    for (const ch of reserved) expect(escapeCommentary(ch)).toBe(`\\${ch}`);
    for (const ch of 'aZ0 .,;:!?\'"/-+=%$&^`') expect(escapeCommentary(ch)).toBe(ch);
  });
});

describe('idempotence — the reason the backslash branch comes first', () => {
  it('E10 — an already-escaped pair is left alone', () => {
    expect(escapeCommentary('\\(')).toBe('\\(');
  });

  it('a second pass changes nothing', () => {
    for (const s of ['pick()', 'a_b', '\\(', '#tag @me', 'Pick<T, K>', '', 'plain text']) {
      const once = escapeCommentary(s);
      expect(escapeCommentary(once)).toBe(once);
    }
  });

  it('E12 — escaped backslash then paren', () => {
    /* `\\(` is an escaped backslash followed by a bare `(`. The pair is copied,
       then the paren is escaped on its own. */
    expect(escapeCommentary('\\\\(')).toBe('\\\\\\(');
  });

  it('E11 — a lone trailing backslash does not crash', () => {
    expect(escapeCommentary('a\\')).toBe('a\\\\');
    expect(escapeCommentary('\\')).toBe('\\\\');
  });

  it('a backslash before a non-reserved character is escaped', () => {
    expect(escapeCommentary('\\n')).toBe('\\\\n');
  });
});

describe('characters that must pass through untouched', () => {
  it('E15 — emoji survive, and are not split', () => {
    expect(escapeCommentary('🏖️ pick() 🐍')).toBe('🏖️ pick\\(\\) 🐍');
  });

  it('E16 — Unicode Mathematical Bold survives', () => {
    expect(escapeCommentary('𝐩𝐢𝐜𝐤()')).toBe('𝐩𝐢𝐜𝐤\\(\\)');
  });

  it('astral-plane characters are not corrupted', () => {
    /* The UTF-16 trap: '𝐩'.length is 2. Indexing by unit would insert a backslash
       between the surrogates and produce mojibake. */
    const s = '𝐩𝐢𝐜𝐤';
    expect(s.length).toBe(8);
    expect([...s]).toHaveLength(4);
    expect(escapeCommentary(s)).toBe(s);
  });

  it('E17 — newlines are preserved exactly', () => {
    expect(escapeCommentary('a\r\nb\nc')).toBe('a\r\nb\nc');
  });

  it('E13 — empty string', () => {
    expect(escapeCommentary('')).toBe('');
  });
});

describe('real inputs', () => {
  it('E18 — a tracking URL in a first comment survives', () => {
    expect(escapeCommentary('https://x.com/p?a=(b)&c=[d]')).toBe(
      'https://x.com/p?a=\\(b\\)&c=\\[d\\]',
    );
  });

  it('the pick() post opening — the reason this package exists', () => {
    const post = 'Writing pick() is four lines.';
    /* Unescaped, LinkedIn publishes this as "Writing pick". */
    expect(escapeCommentary(post)).toBe('Writing pick\\(\\) is four lines.');
  });

  it('E14 — 3,000 parens, all escaped, fast', () => {
    const input = '('.repeat(3000);
    const started = performance.now();
    const out = escapeCommentary(input);
    expect(performance.now() - started).toBeLessThan(50);
    expect(out).toBe('\\('.repeat(3000));
  });
});

describe('isReserved', () => {
  it('covers exactly the 15 documented characters', () => {
    const reserved = [...'()[]{}<>@#*_~|\\'];
    expect(reserved).toHaveLength(15);
    for (const ch of reserved) expect(isReserved(ch)).toBe(true);
    for (const ch of 'aZ0 .,!?-') expect(isReserved(ch)).toBe(false);
  });
});
