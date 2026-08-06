# ADR-002: Escaping is the core, and it is a character loop, not a regex

## Status

🟢 Accepted (2026-08-06). The reason the package exists.

## Context

LinkedIn's versioned Posts API uses a text format in which
`( ) [ ] { } < > @ # * _ ~ | \` are reserved. Each must be escaped with a backslash,
**even when mentions and hashtags are not being used**.

The failure mode is the problem. **An unescaped `(` causes LinkedIn to silently drop
everything from that character to the end of the post.** The API returns `201`. The post
appears. It is just missing most of its text, and nothing tells you.

For technical writing this is the normal case:

```
Writing pick() is four lines. Typing it well is the difference between code
that merely works and code the compiler protects.
```

Published unescaped, that is `Writing pick`.

Two implementation questions followed.

**Regex or a loop?** A regex is shorter. But `\` is itself reserved, which makes the
naive `text.replace(/[()[\]{}<>@#*_~|\\]/g, '\\$&')` wrong in a specific and dangerous
way: run it twice and every backslash gets escaped again, corrupting the string. Getting
idempotence right with a regex means lookbehind assertions, which are harder to read and
harder to prove correct.

**Transform, or report?** A function that silently fixes text is convenient but hides the
problem. A caller that wants to show the author where the danger is needs positions.

## Decision

**A single left-to-right character loop, and both a transformer and a reporter.**

```
for each code point c at index i:
    if c is '\' and the next code point is reserved:
        already escaped — copy both, advance 2
    else if c is reserved:
        emit '\' then c
    else:
        emit c
```

- **Iterates code points, not UTF-16 units**, so emoji and astral-plane characters pass
  through with correct offsets.
- **The `\` branch comes first**, which is what makes the function idempotent.
- Two exported functions: `escapeCommentary` and `unescapeCommentary`.
- `lint()` separately reports `escape/*` findings **on the original text**, with
  offsets, so a caller can highlight the danger instead of silently transforming.
- **Parentheses get their own rule id**, `escape/unescaped-paren`, separate from other
  reserved characters, because their failure mode is the catastrophic one.
- Two properties, property-tested over at least 10,000 generated inputs:

  ```
  escape(escape(s)) === escape(s)
  unescape(escape(s)) === s
  ```

- All `escape/*` findings are `error` severity, and **cannot be suppressed**.
  Suppressing them means publishing a broken post, and there is no legitimate reason to
  want that.

## Consequences

- **No regex means no ReDoS on the highest-traffic code path.** The most dangerous
  function in the package cannot backtrack, by construction
  ([threat-model.md](../threat-model.md) T1).
- **Idempotence is provable and proven**, which matters because the escaper can run more
  than once in a pipeline. A non-idempotent escaper is a silent corrupter.
- **Losslessness is the real guarantee.** `unescape(escape(s)) === s` is what proves
  nothing was dropped, and it is the property a consumer actually cares about.
- **Every published post becomes a fixture**, so the suite grows with real inputs rather
  than imagined ones. The README asks specifically for reports of posts that published
  truncated, because that is a missing test case.
- **A change to escaping is always a major version.** It is a content-integrity change,
  and a consumer taking a patch has not agreed to one
  ([devops-cicd.md](../devops-cicd.md) §3).
- **It applies to comments too.** A tracking URL with a bracketed query string truncates
  exactly the same way, which is easy to forget when the first comment is the thing
  holding the link.
- **The legacy path stays documented as an option.** `/v2/ugcPosts` takes plain text and
  needs no escaping. The README says so, because a consumer on that endpoint should not
  be escaping at all.
