# ADR-004: Bold on code identifiers is an error, not a warning

## Status

🟢 Accepted (2026-08-06). The only style-adjacent rule promoted to `error`.

## Context

LinkedIn posts are plain text. No bold, no italic, no markup. Every "LinkedIn text
formatter" fakes bold by **substituting Unicode Mathematical Alphanumeric Symbols** —
`𝐩𝐢𝐜𝐤` is four mathematical symbols shaped like p-i-c-k, not the letters.

**Corrected 2026-08-11.** This originally read "the author already uses this,
consistently, with a real grammar: code identifiers, section labels, and one emphasised
sentence per post." The claim was inferred from a four-post sample and was simply wrong.

**Re-measured 2026-08-11 across the whole corpus**, not just the 13 LinkedIn posts: scanning
all 269 published fixtures for U+1D400–U+1D7FF returns **zero matches**. No markdown bold in
the LinkedIn posts either. The only file in the repository containing these characters is
`test/fixtures/public/worst-case.txt`, which is synthetic and contains them on purpose.

The severity contract in this package is tight on purpose: `error` means "do not publish",
and consumers gate on it. Diluting it makes them stop checking. So promoting anything
style-adjacent to `error` needs a strong argument.

### The primary argument: this guards against our own output

The corpus correction above is not a caveat, it is the reasoning. **There is no Unicode
bold anywhere in the author's writing**, so this rule is not policing a human habit. It is
a guard against bold *this project would introduce* — the formatter in `#31`, or a drafting
model imitating LinkedIn convention.

For a guard against your own tooling, `error` is close to free. It has no false-positive
cost on human writing, because human writing here does not contain these characters at all,
and what it blocks is a pipeline mangling the term a post is about. The severity does not
have to be earned by proving catastrophic reader harm; it is earned by the rule costing
nothing to enforce and catching a defect nothing legitimate produces.

That argument stands on its own and does not depend on any of the reader harms below.

### Supporting: the harms to readers

Stated with the confidence each has actually earned, which is not equal.

- **A screen reader cannot announce the term.** A mangled *label* costs a screen-reader user
  a word they can infer from context; a mangled *code identifier* costs them the term the
  post is about. On a post whose point is `keyof`, the word `keyof` is unreadable.
  **Not yet verified on a real screen reader** — see [qa-test-plan.md](../qa-test-plan.md)
  §8. This is the strongest of the three if it holds.
- **LinkedIn search is believed not to match these characters.** A post whose key term is
  `𝐑𝐞𝐚𝐜𝐭` does not literally contain "React". **Untested, and there is a specific reason to
  doubt it:** NFKC normalisation maps every bold variant back to ASCII, and search indexes
  commonly normalise. Test before relying on it — qa-test-plan §8.
- **The bold text is not the word, so nothing that matches words matches it.**
  `"𝐏𝐢𝐜𝐤".includes("Pick")` is `false`, so find-in-page, a search box, and a docs lookup all
  miss it. Mild — a reader can retype six letters — but real.

**Corrected 2026-08-11.** This bullet previously read *"Nobody can copy `𝐏𝐢𝐜𝐤<𝐓, 𝐊>` into an
editor. It will not compile."* Both halves are wrong. The characters copy and paste like any
other text, and compilation was measured across three languages:

| Language | Result |
| --- | --- |
| TypeScript 5.9 | `error TS1127: Invalid character` — a lexical error. The claim holds here only |
| JavaScript (V8) | **Valid identifier.** `const 𝐩𝐢𝐜𝐤 = 1; 𝐩𝐢𝐜𝐤` returns `1`. It compiles and runs, as a *different* binding, failing later with `ReferenceError` |
| Python 3 | Identifiers are NFKC-normalised by the language spec. `𝐩𝐢𝐜𝐤 is pick` returns `True`. It simply works |

TypeScript's scanner uses ES5-era BMP-only identifier tables; V8 implements ES2015+
`ID_Start`, and Mathematical Alphanumeric Symbols are category Lu/Ll. The accurate claim is
the third bullet above, and it is much weaker than what was written. Recorded rather than
quietly edited, because the rule's severity was resting on it.

Every other voice rule in the package costs only the author, who is free to overrule it.
This one costs readers who have no say — and, primarily, it costs nothing to enforce.

## Decision

**`bold/code-identifier` is `error`. The other bold rules are `warn`. The budget is three
spans.**

- **Detection:** a bold span is a code identifier if, mapped back to plain ASCII, it
  contains `()`, `<>`, `[]`, `_` or `.` adjacent to alphanumerics; or is camelCase or
  PascalCase; or matches a known-keyword list; or is a single token adjacent to `()` in
  the original text.
- **The ASCII mapping is `String.prototype.normalize('NFKC')`**, not a hand-built range
  table. Measured 2026-08-11: serif, sans-serif and italic variants of `𝐏𝐢𝐜𝐤<𝐓, 𝐊>` all
  normalise to exactly `Pick<T, K>`. Built in, zero dependencies, and it covers variants
  nobody enumerated. Three constraints on its use:
  - **It destroys variant information** — serif and sans-serif both become `Pick`. So
    `bold/mixed-variants` still needs explicit range tables, and NFKC is for the
    *classification* step in `#20`, after `#19` has found the spans.
  - **It is not length-preserving** — `𝐏𝐢𝐜𝐤` is 8 UTF-16 units, `Pick` is 4. Offsets must
    come from the original text, which is already the rule but becomes load-bearing here.
  - **It folds unrelated things** — `ﬁ`→`fi`, `Ａ`→`A`, `¼`→`1⁄4`. Safe on a span already
    known to be bold; wrong as a general text pass, and never near `escape.ts`.
  - The negative fixture survives it: `𝐖𝐡𝐚𝐭 𝐢𝐭 𝐢𝐬:` → `What it is:`, which has no `()`,
    `<>`, `_` or `.`, is not camelCase and is not a keyword. The classifier still does the
    real work.
- **The suggestion names the substitute**, because a prohibition without an alternative
  gets ignored: *put the signature on its own line with blank lines around it.*
  Whitespace isolation does what the bold was doing, better, at zero cost.
- `bold/over-budget` (more than 3 spans), `bold/in-hook`, and `bold/mixed-variants` stay
  `warn` and `info`.
- **Configurable.** `bold.allowOnCodeIdentifiers: true` turns it off entirely, for
  someone who disagrees.
- **Known false positive**, documented: a bolded PascalCase proper noun. The suggestion
  text is worded so it is easy to dismiss, and this is the one rule where a false
  positive is expected.

## Consequences

- **The severity contract stays meaningful**, with exactly three error groups: `escape/*`,
  `counts/over-limit`, `bold/code-identifier`. Each one is a case where publishing causes
  real damage — truncation, rejection, or unreadable-and-unsearchable content.
- **The rule is defensible in a sentence**, which matters for a public package: *"it costs
  other people, not just you."* That is the line between this and every other style rule.
- **It obliges the tool to be accessible itself.** A package that tells people their
  formatting breaks screen readers cannot produce output that is hard to read. Hence:
  severity always spelled out, never colour alone, `NO_COLOR` honoured, no emoji
  ([compliance-matrix.md](../compliance-matrix.md) §5).
- **Three manual tests are required before `#21` ships**, because two of the three reader
  harms are asserted and unverified ([qa-test-plan.md](../qa-test-plan.md) §8): rendering of
  both bold variants on iOS, Android and desktop web; a screen reader on a bold identifier;
  and publishing a post containing `𝐑𝐞𝐚𝐜𝐭` then searching LinkedIn for "React". If either
  empirical claim fails, the rule still stands on the guard argument — which is why that
  argument leads.
- **Negative fixtures matter more here than anywhere else.** The rule must not fire on
  `𝐖𝐡𝐚𝐭 𝐢𝐭 𝐢𝐬:` — a label. A rule that fires on labels as well as identifiers is just a
  ban on bold, which is not the decision.
