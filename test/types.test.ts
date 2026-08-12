/**
 * The `Finding` contract, asserted at compile time.
 *
 * The `@ts-expect-error` lines are the real tests: each fails the build if the code
 * below it stops erroring. Two guarantees depend on that — `Diagnostic` admits no
 * strings (ADR-008 §4), and `Finding` has no `fixable` (ADR-009 §1).
 */
import { describe, expect, it } from 'vitest';

import type { Diagnostic, Edit, Finding, Suggestion } from '../src/types.js';

describe('Diagnostic', () => {
  it('accepts namespaced numeric keys', () => {
    const d: Diagnostic = {
      'flaggedWord.termIndex': 47,
      'flaggedWord.per1k': 7,
      'rhythm.sentenceLengths': [14, 15, 13, 15, 14],
    };
    expect(Object.keys(d)).toHaveLength(3);
  });

  it('rejects a string value — a string is content, and content never leaves', () => {
    // @ts-expect-error - TS2322: a string value would put the user's writing in a payload
    const d: Diagnostic = { 'flaggedWord.term': 'delve' };
    expect(d).toBeDefined();
  });

  it('rejects an un-namespaced key — 38 rules share this key space', () => {
    // @ts-expect-error - TS2353: `count` has no `group.` prefix, so it collides
    const d: Diagnostic = { count: 2 };
    expect(d).toBeDefined();
  });
});

describe('Finding', () => {
  it('describes an escape error carrying a fix', () => {
    const f: Finding = {
      id: 'escape/unescaped-paren',
      severity: 'error',
      message: '"(" will truncate the post from here',
      start: 412,
      end: 413,
      advice: 'escape as \\(',
      fix: { start: 412, end: 413, replacement: '\\(' },
      diagnostic: { 'escape.charCode': 40 },
    };
    expect(f.fix?.replacement).toBe('\\(');
  });

  it('has no `fixable` — `fix !== undefined` answers the same question', () => {
    // @ts-expect-error - ADR-009 §1 removed it: a boolean can disagree with the fix
    const f: Finding = { id: 'x/y', severity: 'warn', message: 'm', fixable: true };
    expect(f).toBeDefined();
  });

  it('rejects a severity outside the three-value contract', () => {
    // @ts-expect-error - consumers gate on these exact three values
    const f: Finding = { id: 'x/y', severity: 'critical', message: 'm' };
    expect(f).toBeDefined();
  });
});

describe('Suggestion', () => {
  it('is an Edit plus a label, so an editor can offer and apply it', () => {
    const s: Suggestion = {
      label: 'use "look at"',
      start: 88,
      end: 93,
      replacement: 'look at',
    };
    const asEdit: Edit = s;
    expect(asEdit.replacement).toBe('look at');
  });
});

describe('the types module', () => {
  it('contributes no runtime code', async () => {
    /* Every export is a type, so this compiles to an empty module. Asserted because
       the browser bundle has a 60KB budget and `/` ships only the escaper — a stray
       runtime constant here would be paid for on every page load. */
    const mod: Record<string, unknown> = await import('../src/types.js');
    expect(Object.keys(mod)).toEqual([]);
  });
});
