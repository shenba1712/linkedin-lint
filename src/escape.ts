/**
 * Reserved-character escaping for LinkedIn's Posts API.
 *
 * An unescaped `(` makes LinkedIn drop the rest of the post. No error, HTTP 201.
 * Read ADR-002 before changing anything here; a change is always a major version.
 */

/** LinkedIn reserves these 15, with or without mentions and hashtags. */
const RESERVED = new Set(['(', ')', '[', ']', '{', '}', '<', '>', '@', '#', '*', '_', '~', '|', '\\']);

/** Exported so the `escape/*` rules can find positions without copying the set. */
export function isReserved(ch: string): boolean {
  return RESERVED.has(ch);
}

/**
 * Escape reserved characters. Idempotent, so running it twice is safe.
 * `pick()` -> `pick\(\)`, and `pick\(\)` is left alone.
 * Emoji, Unicode bold and newlines pass through.
 */
export function escapeCommentary(text: string): string {
  // Code points, not UTF-16 units — indexing would split an emoji in half.
  const chars = [...text];
  let out = '';

  for (let i = 0; i < chars.length; i += 1) {
    const ch = chars[i] as string;
    const next = chars[i + 1];

    // Must come first. Copying an escaped pair instead of re-escaping it is what
    // makes this idempotent. Swap the branches and a second pass corrupts the text.
    if (ch === '\\' && next !== undefined && RESERVED.has(next)) {
      out += ch + next;
      i += 1;
      continue;
    }

    // Everything else: prefix reserved characters, copy the rest. A lone `\` lands
    // here too and gets escaped — reporting it is a rule's job, not this function's.
    out += RESERVED.has(ch) ? `\\${ch}` : ch;
  }

  return out;
}

/**
 * Turn `\X` back into `X` for reserved `X`. A `\` before anything else is left alone.
 *
 * **Does not recover already-escaped input.** `escape` is idempotent, so `(` and `\(`
 * both become `\(` and cannot be told apart. ADR-002.
 */
export function unescapeCommentary(text: string): string {
  const chars = [...text];
  let out = '';

  for (let i = 0; i < chars.length; i += 1) {
    const ch = chars[i] as string;
    const next = chars[i + 1];

    // Same pair test as escape, opposite result: drop the backslash, keep the character.
    if (ch === '\\' && next !== undefined && RESERVED.has(next)) {
      out += next;
      i += 1;
      continue;
    }

    out += ch;
  }

  return out;
}
