# linkedin-lint — Technical Requirements

**Status:** v1.0, 2026-08-06. Follows [prd.md](./prd.md).

---

## 1. Shape

```
   bin/cli.ts          the ONLY file with I/O
      │ reads a file, reads config, writes stdout, sets an exit code
      ▼
   src/index.ts        lint(text, options) → Finding[]
      │
      ├── escape.ts        escapeCommentary · unescapeCommentary
      ├── fold.ts          foldPositions · hookSurvives
      ├── counts.ts        computeStats
      ├── prohibitions.ts  banned words, em dash, emoji, hashtags, opener
      ├── tells.ts         four detectors, against a baseline
      ├── bold.ts          span budget, code-identifier detection
      └── similarity.ts    compare against a caller-supplied archive
```

Everything under `src/` is a pure function. No `fs`, no `http`, no `path`, no
`Date.now()`, no `Math.random()`.

Where a rule needs data from outside — an archive for similarity, a baseline for
tells — **the caller passes it in**. The core never fetches anything. That is what
makes the whole package testable without mocks and safe for other people to install.

## 2. Types

```ts
export type Severity = 'error' | 'warn' | 'info';

export interface Finding {
  readonly id: string;          // "escape/unescaped-paren" — PUBLIC API
  readonly severity: Severity;
  readonly message: string;     // one line, plain, no emoji
  readonly start?: number;      // zero-based, over the ORIGINAL text
  readonly end?: number;
  readonly suggestion?: string; // what to do instead
  readonly fixable?: boolean;   // whether --fix can apply it
}

export interface Stats {
  readonly chars: number;
  readonly words: number;
  readonly paragraphs: number;
  readonly sentences: number;
  readonly sentenceLenMean: number;
  readonly sentenceLenStdDev: number;
  readonly paragraphLenCv: number;   // coefficient of variation
  readonly hookChars: number;
  readonly boldSpans: number;
  readonly colonsNonLabel: number;
  readonly hashtags: number;
}

export interface Baseline {
  readonly sentenceLenStdDev: { p15: number; median: number };
  readonly paragraphLenCv:    { p15: number; median: number };
  readonly chars:             { min: number; max: number };
  readonly hookChars:         { min: number; max: number };
  readonly tricolonsPer1k:    { p90: number };
}
```

Offsets are always over the **original, unescaped** string. A caller highlighting a
range is highlighting what the user typed, not what will be sent.

## 3. Escaping — the core algorithm

### 3.1 The rule

Reserved in LinkedIn's post-body text format:

```
(  )  [  ]  {  }  <  >  @  #  *  _  ~  |  \
```

Each is escaped by prefixing a single backslash. They must be escaped **even when
mentions and hashtags are not used**.

### 3.2 Implementation

A single left-to-right pass. No regex, deliberately — a character loop is easier to
reason about, cannot backtrack, and is easier to prove idempotent.

```
for each character c at index i:
    if c is '\' and the next character is reserved:
        already escaped — copy both, advance 2
    else if c is reserved:
        emit '\' then c
    else:
        emit c
```

The `\` handling in the first branch is what makes the function **idempotent**. Order
matters: `\` is itself reserved, so a naive "escape every reserved character"
implementation double-escapes an already-escaped string and corrupts it.

### 3.3 The two properties

Both property-tested over generated inputs containing every reserved character in
random positions:

```
escape(escape(s)) === escape(s)      // idempotent
unescape(escape(s)) === s            // lossless
```

The first matters because the escaper can run more than once in a pipeline. The
second is the proof that nothing was lost.

### 3.4 What is not touched

- Emoji and other multi-byte characters. Not reserved, and offsets must stay correct
  through them, so the pass iterates code points, not UTF-16 units.
- Unicode Mathematical Bold characters. Not reserved.
- Newlines. Preserved exactly.

### 3.5 Findings, not just transformation

`lint()` reports `escape/unescaped-paren` and friends **on the original text**, so a
caller can show the user where the danger is rather than silently transforming. The
transformation is a separate call.

Parentheses get their own rule id, separate from other reserved characters, because
their failure mode is the catastrophic one: everything after them disappears.

## 4. Fold

### 4.1 What it computes

Where LinkedIn truncates a post with "see more", on mobile and on desktop.

```ts
foldPositions(text, cfg): { mobile: number; desktop: number }
hookSurvives(text, cfg): boolean
```

### 4.2 Honesty about the numbers

**LinkedIn does not document this.** It varies by device, font size, layout version,
and whether the post has attached media.

So:

- The defaults are approximations: about 140 characters on mobile, about 210 on
  desktop.
- They are **configurable**, and the docs tell you to calibrate them by publishing one
  post and looking at your phone.
- The constants live in one place with a comment saying they are observed, not
  specified.

A tool that pretends to know an undocumented number precisely is worse than one that
says "about here, check it".

### 4.3 Line-aware, not just character counting

The fold is not purely a character count — a hard line break can end the visible
region early. So the computation walks paragraphs and stops at whichever comes first:
the character budget, or the third line break.

## 5. Counts and statistics

Straightforward, with two decisions worth recording.

**Sentence splitting** is deliberately simple: split on `.`, `!`, `?` followed by
whitespace or end, with an abbreviation exception list. A perfect splitter needs an
NLP model; an imperfect one is fine here because the output feeds a *variance*
measure, and variance is robust to a few miscounts.

**Sentence-length standard deviation is the single most useful number in the
package.** Written prose varies its sentence length deliberately; generated prose
flattens. It is the basis of `tells/flat-rhythm`.

**Paragraph-length coefficient of variation** (standard deviation over mean) rather
than raw deviation, so it is comparable across posts of different lengths.

## 6. Prohibitions

A configurable list, checked case-insensitively with word boundaries.

Categories:

| Check | Notes |
| --- | --- |
| Banned words and phrases | Fully configurable. Defaults are conservative |
| Em dash | Configurable severity. Some authors ban it outright, others use it |
| Emoji | Detected by Unicode property escapes, not a hard-coded list |
| Hashtag count | Above a configured maximum |
| Question as the opening line | Platform-scoped: common and good on long-form, weak as a LinkedIn opener |
| Colon usage | At most one non-label colon; label-colons allowed inside a numbered list; three or more consecutive label-colon paragraphs in flowing prose is flagged |

The colon rule needs the numbered-list exception or it fires on perfectly good
structured writing. That exception is why it is a rule with logic rather than a count.

## 7. Bold

### 7.1 Detecting pseudo-bold

Unicode Mathematical Alphanumeric Symbols. Both the serif (U+1D400) and sans-serif
(U+1D5D4) bold ranges, plus italic and bold-italic variants, because tools produce
different ones.

Contiguous runs are one **span**.

### 7.2 Code-identifier detection

The interesting part. A bold span is a code identifier if, once mapped back to plain
ASCII, it:

- contains `()`, `<>`, `[]`, `_`, or `.` adjacent to alphanumerics, or
- is camelCase or PascalCase, or
- matches a known-keyword list (`keyof`, `extends`, `async`, `await`, and so on), or
- is a single token adjacent to `()` in the original text

False positives are possible — a bolded proper noun in PascalCase. The suggestion
text is worded so an author can dismiss it easily, and the rule is documented as the
one place where a false positive is likely.

### 7.3 Why this is an `error`

Because the cost falls on other people: a screen reader cannot read the term, and
LinkedIn search cannot index it. Every other voice rule costs only the author.
([ADR-004](./adr/ADR-004-bold-budget-is-an-error.md))

## 8. Tells

Four detectors, each comparing a statistic against a baseline the caller supplies.

| Id | Test | Default threshold |
| --- | --- | --- |
| `tells/flat-rhythm` | `sentenceLenStdDev` below baseline `p15` | conservative fallback if no baseline |
| `tells/uniform-paragraphs` | `paragraphLenCv` below 0.25 | fixed |
| `tells/no-stake` | No first-person experience claim, when `options.postType` requires one | off unless `postType` is given |
| `tells/no-specifics` | No number, named tool, API, or failure mode | on |

Without a baseline the thresholds fall back to conservative constants, and the
findings say so in the message. A tool that reports "below your baseline" when it has
no baseline is lying.

`computeBaseline(texts): Baseline` is exported so a caller can generate one from their
own corpus. That is the intended path.

### 8.1 The three patterns that are not flagged

Documented at length in [ADR-003](./adr/ADR-003-calibrate-against-corpus.md) because
it is the decision most likely to be second-guessed.

- `X is not Y. It is Z.` — flagged only in the first two sentences.
- Closing questions — flagged only when unanswerable. Detected by checking for a
  question that could not have a specific answer, e.g. beginning "Isn't it".
- Tricolons — flagged only above a density threshold from the baseline.

### 8.2 do-not-normalise

`options.doNotNormalise: string[]` — patterns the linter must never flag, and which
appear in the output as an explicit note so a consumer's own prompts can carry them
forward. An author's regional English is voice, not error.

## 9. Similarity

Lexical, not semantic. Character trigram Jaccard over normalised text, plus a
longest-common-substring check for reused phrasing.

```ts
similarity(text, archive: readonly string[], cfg): Finding[]
```

The archive is passed in. The core does not read files.

Honest limit, stated in the README: it catches repeated framing and reused phrases. It
misses the same idea expressed completely differently. Semantic similarity would need
embeddings, which would need a model and a dependency, and this package has zero
dependencies for good reasons.

## 10. CLI

The only file with I/O. Shape and output contract in
[cli-design.md](./cli-design.md).

Exit codes:

| Code | Meaning |
| --- | --- |
| 0 | No errors. Warnings may exist |
| 1 | At least one `error` |
| 2 | Bad usage, unreadable file, invalid config |

Exit 1 on errors only, so the tool can sit in a CI pipeline as a gate without
failing on style.

## 11. Performance

Not a concern at real sizes — posts are under 3,000 characters. But **ReDoS is a
concern**, because these are regexes over user-supplied text running inside other
people's pipelines.

- No nested quantifiers. No `(a+)+` shapes.
- The escaper uses a character loop, not a regex.
- Every pattern has a pathological-input test with a timing assertion.

See [threat-model.md](./threat-model.md) T1.

## 12. Build and packaging

- TypeScript to `dist/`, ESM with a CJS fallback, plus `.d.ts`.
- `exports` map with a root entry and `./package.json`.
- `files` limited to `dist/`, `bin/`, `README.md`, `LICENSE`. Fixtures and docs are not
  shipped.
- Node 18+.
- **Zero runtime dependencies**, checked in CI as a hard assertion, not a guideline.
