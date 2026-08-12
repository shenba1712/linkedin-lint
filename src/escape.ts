/**
 * Reserved-character escaping for LinkedIn's versioned Posts API.
 *
 * An unescaped `(` makes LinkedIn drop everything from it to the end of the post.
 * No error, HTTP 201, the post just publishes truncated. That is why this file exists.
 *
 * Read ADR-002 before changing anything here. A change to escaping is always a major
 * version — it is a content-integrity change, never a patch.
 */

/**
 * The 15 characters LinkedIn's little text format reserves. Each needs a backslash,
 * **even when mentions and hashtags are not in use**.
 *
 * One place, one Set. `\` is in here too, which is what makes order matter below.
 */
const RESERVED = new Set(['(', ')', '[', ']', '{', '}', '<', '>', '@', '#', '*', '_', '~', '|', '\\']);

/** Whether a character must be escaped. Exported for the `escape/*` rules in #08. */
export function isReserved(ch: string): boolean {
  return RESERVED.has(ch);
}

/**
 * Escape reserved characters so the post survives the API.
 *
 * Idempotent: `escapeCommentary(escapeCommentary(s)) === escapeCommentary(s)`.
 * Lossless: `unescapeCommentary(escapeCommentary(s)) === s`.
 *
 * ```ts
 * escapeCommentary('pick()')      // 'pick\\(\\)'
 * escapeCommentary('pick\\(\\)')  // unchanged — already escaped
 * ```
 *
 * Emoji, Unicode bold and newlines pass through untouched.
 */
export function escapeCommentary(text: string): string {
  /* Code points, not UTF-16 units. Indexing would split an emoji in half and put a
     backslash inside it. A for-of over a string iterates code points; text[i] does not. */
  const chars = [...text];
  let out = '';

  for (let i = 0; i < chars.length; i += 1) {
    const ch = chars[i] as string;
    const next = chars[i + 1];

    /* This branch MUST come first. It is the whole reason the function is idempotent:
       an already-escaped pair is copied through instead of having its backslash escaped
       again. Swap the two branches and a second pass corrupts the string. */
    if (ch === '\\' && next !== undefined && RESERVED.has(next)) {
      out += ch + next;
      i += 1;
      continue;
    }

    /* A lone trailing `\`, or one before a non-reserved character, is escaped like any
       other reserved character — it round-trips and loses nothing. #08 reports it as
       `escape/lone-backslash` separately, because reporting is not this function's job. */
    out += RESERVED.has(ch) ? `\\${ch}` : ch;
  }

  return out;
}
