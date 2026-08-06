# ADR-004: Bold on code identifiers is an error, not a warning

## Status

🟢 Accepted (2026-08-06). The only style-adjacent rule promoted to `error`.

## Context

LinkedIn posts are plain text. No bold, no italic, no markup. Every "LinkedIn text
formatter" fakes bold by **substituting Unicode Mathematical Alphanumeric Symbols** —
`𝐩𝐢𝐜𝐤` is four mathematical symbols shaped like p-i-c-k, not the letters.

The author already uses this, consistently, with a real grammar: code identifiers,
section labels, and one emphasised sentence per post.

The severity contract in this package is tight on purpose: `error` means "do not publish",
and consumers gate on it. Diluting it makes them stop checking. So promoting anything
style-adjacent to `error` needs a strong argument.

The argument is that the three uses do not carry equal cost, and one of them harms people
other than the author:

- A mangled **label** costs a screen-reader user a word they can infer from context.
- A mangled **code identifier** costs them the term the post is *about*. On a post whose
  point is `keyof`, the word `keyof` is unreadable.
- **LinkedIn search does not match these characters.** A post whose key term is `𝐑𝐞𝐚𝐜𝐭`
  does not contain the word "React". The most searchable technical terms go invisible,
  which defeats the purpose of writing the post.
- **Nobody can copy `𝐏𝐢𝐜𝐤<𝐓, 𝐊>` into an editor.** It will not compile. On a
  code-teaching post that is a functional failure, not an aesthetic one.

Every other voice rule in the package costs only the author, who is free to overrule it.
This one costs readers who have no say.

## Decision

**`bold/code-identifier` is `error`. The other bold rules are `warn`. The budget is three
spans.**

- **Detection:** a bold span is a code identifier if, mapped back to plain ASCII, it
  contains `()`, `<>`, `[]`, `_` or `.` adjacent to alphanumerics; or is camelCase or
  PascalCase; or matches a known-keyword list; or is a single token adjacent to `()` in
  the original text.
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
- **A manual test is required**, because rendering varies: check both bold variants on
  iOS, Android and desktop web ([qa-test-plan.md](../qa-test-plan.md) §8).
- **Negative fixtures matter more here than anywhere else.** The rule must not fire on
  `𝐖𝐡𝐚𝐭 𝐢𝐭 𝐢𝐬:` — a label. A rule that fires on labels as well as identifiers is just a
  ban on bold, which is not the decision.
