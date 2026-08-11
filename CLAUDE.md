# linkedin-lint

A linter and formatter for LinkedIn posts. Escapes text correctly for the versioned
Posts API, shows where the "see more" fold cuts, counts against the real limits, and
flags prose that reads as machine-written.

**Public npm package. MIT. Pure functions and a CLI. No network, no filesystem in the
core, no accounts.**

Extracted from the [Cadence](https://github.com/shenba1712/cadence) project,
which depends on it.

## Current State

**Phase 0 not started.** Documentation only. No code yet.

`docs/` is complete: PRD, TRD, API spec, rules reference, CLI design, QA plan, threat
model, security audit, devops, disaster recovery, compliance matrix, ADRs, backlog
and tickets.

## The One Thing That Matters

**An unescaped `(` in a LinkedIn post body causes LinkedIn to silently drop
everything from that character to the end of the post.** No error. HTTP `201`. The
post publishes, truncated.

This package exists because of that. Everything else it does is secondary.

If you change anything in `src/escape.ts`, you are changing whether people's
published posts survive. Read
[docs/adr/ADR-002](./docs/adr/ADR-002-escaping-is-the-core.md) first, add a fixture
before you change behaviour, and never relax a test to make a change pass.

## Non-Negotiables

### 1. The core is pure

`src/` must not import `fs`, `http`, `path`, or anything that touches a clock or a
random source. No `Date.now()`, no `Math.random()`.

Only `bin/cli.ts` reads files and writes to stdout. That boundary is what makes this
package trivially testable and safe for other people to install.

If a rule seems to need I/O — the similarity check needs an archive, the tell check
needs a baseline — **the caller passes the data in**. The core never fetches it.

### 2. Escaping is idempotent and round-trip safe

Two properties, both property-tested over generated inputs:

```
escape(escape(s)) === escape(s)
unescape(escape(s)) === s
```

The first matters because the escaper may run more than once in a pipeline. The
second is what proves nothing was lost.

### 3. Zero runtime dependencies

Not "few". Zero. This package holds a correctness guarantee for other people's
published content, and every dependency is a way for that guarantee to change
without anyone deciding to change it.

Dev dependencies are fine.

### 4. Every regex is checked for catastrophic backtracking

Rules are regexes over user-supplied text, so a nested quantifier is a denial of
service in someone else's build pipeline. No nested quantifiers, no
`(a+)+`-shaped patterns. Every new pattern gets a pathological-input test with a
timing assertion. See [docs/threat-model.md](./docs/threat-model.md) T1.

### 5. Severity is a contract

- `error` — the post will be broken or truncated. Callers block publishing on this.
- `warn` — style. The author is meant to overrule these.
- `info` — observation.

**Only three things are errors:** escaping failures, exceeding the platform limit,
and a broken bold budget. Do not promote a style rule to `error`. Consumers rely on
`error` meaning "genuinely unsafe", and diluting it makes them stop checking.

### 6. Fixtures are real posts, and only published ones

Test fixtures use posts that are already public. **No unpublished draft text ever
enters this repo** — it is public, and drafts belong in the private one.

### 7. Do not flag the three false tells

`X is not Y. It is Z.` in the body, closing questions that are real invitations, and
tricolons are **not** flagged by default. They are how good writers write. Details in
[docs/adr/ADR-003](./docs/adr/ADR-003-calibrate-against-corpus.md).

## How to Work

### Plan Before Coding

1. Read the relevant files
2. State what you understand about the current code
3. Propose a plan with specific files and changes
4. Wait for approval
5. Ask rather than guessing

### Verify After Coding

1. `npx tsc --noEmit`
2. `npm run lint`
3. `npm test`
4. If you touched escaping: `npm run test:escape` and confirm the property tests ran

Never say "done" with a failing test or a type error.

### Push Back, Then Discuss

Disagree openly and early. A concern raised before the work is a conversation; the same
concern raised after is wasted effort for both of us.

- **If a request rests on a premise you think is wrong, say so in a sentence or two** —
  then either propose the alternative or proceed under a stated assumption. Do not
  silently comply with something you believe is a mistake.
- **Take a position.** "Here are five options" is not analysis. Pick one, say why, and
  name what it costs.
- **Bring the disagreement, not the hedge.** If two approaches are genuinely equal, say
  that and choose.
- **If the point is reaffirmed after pushback, that is the decision.** Proceed fully and
  without relitigating.
- **Expect to be wrong sometimes.** Pushback is a discussion, not a verdict — the useful
  outcome is often a third option neither side started with.

This is bidirectional and it has already earned its place. In this project, pushback
produced: the approval gate having no bypass, escaping shipping before the app, the
horizons split between *job-ready* and *complete*, voice and topic being separated,
and the corpus default flipping from opt-in to eligible-by-default. Several of those came
from the maintainer correcting an assumption of mine; several from the reverse. None
would have surfaced from agreement.

### Adding a Rule

Every rule needs all five, in this order:

1. An entry in [docs/rules-reference.md](./docs/rules-reference.md) with an id, a
   severity, a threshold and a rationale
2. A pathological-input test proving the pattern cannot backtrack catastrophically
3. Positive fixtures — text that should trigger it
4. **Negative fixtures from the real published posts** — proving it does not fire on
   good writing
5. The implementation

If step 4 fails, the rule is wrong, not the writing.

### Justify Changes

Say what changed, why, and what breaks without it. No drive-by changes.

## Rule ids

`group/name`, lowercase, hyphenated:

```
escape/unescaped-paren
fold/hook-too-long
counts/over-limit
prohibitions/em-dash
tells/flat-rhythm
bold/code-identifier
similarity/near-duplicate
```

**Ids are public API.** Consumers pin and suppress by id. Renaming one is a breaking
change and needs a major version.

## Commands

- `npm run build` — tsc to `dist/`
- `npm test` — Vitest
- `npm run test:escape` — the escaping suite alone, including property tests
- `npm run lint` — ESLint
- `npx tsc --noEmit` — type-check
- `npm run cli -- <file>` — run the CLI from source

## Project Structure

```
src/
  index.ts          lint(text, options) → Finding[]
  types.ts          Finding, Severity, Options, Stats
  escape.ts         reserved-character escaping. THE important file
  fold.ts           where "see more" cuts
  counts.ts         chars, words, paragraphs, sentence-length variance
  prohibitions.ts   banned words, em dashes, emoji, hashtags
  tells.ts          the four detectors
  bold.ts           unicode bold budget, code-identifier detection
  similarity.ts     compare against a caller-supplied archive
bin/
  cli.ts            the ONLY place with I/O
test/
  fixtures/         real published posts
docs/
```

## TypeScript Conventions

- strict mode. No `any` — use `unknown` and narrow
- Exported functions have explicit return types
- String literal unions, not enums
- Every exported type is documented, because they are public API
- No classes. Functions and plain objects
- Character offsets are always zero-based and always over the **original**
  (unescaped) string, so a caller can highlight the range in what the user typed

## Versioning

Semver, and interpreted strictly, because a consumer pins this exactly.

| Change | Bump |
| --- | --- |
| Escaping behaviour changes at all | **major** |
| Rule id renamed or removed | **major** |
| Severity raised, e.g. warn → error | **major** |
| New rule added | minor |
| Threshold default changed | minor |
| Severity lowered | minor |
| Bug fix that does not change escaping | patch |

**A change to escaping is never a patch.** It is a content-integrity change and
consumers must opt in deliberately.

## Do NOT

- Do not add a runtime dependency
- Do not import `fs`, `http`, or `path` outside `bin/`
- Do not use `Date.now()` or `Math.random()` anywhere
- Do not promote a style rule to `error`
- Do not add a regex without a backtracking test
- Do not add a fixture containing unpublished text
- Do not rename a rule id without a major version
- Do not relax a test to make a change pass
- Do not flag the three false tells in §7
- Do not use `any`, enums, or classes

## When Uncertain

1. Ask rather than guessing
2. Prefer the simpler pattern — a linter that is hard to read is a linter nobody
   trusts
3. If a rule would fire on the author's own published writing, the rule is wrong

## Lessons Learned

- **Measure a data format before writing a filter for it.** Inferring Medium's export
  markup produced four wrong classifiers in a row; the one that worked came from reading
  the actual files. Build the inspector first.

- **Do not design around your own constraints.** "I can't read 391k words" led to a plan
  that sampled 1.5% of the corpus. The corpus never needed to fit anywhere — one document
  in, one record out, aggregate the records. Solve the problem, not the limitation.

- **Validate a measurement before reporting it.** The profiler's first run said "closes
  with a question: 1%", contradicting a hand reading of four posts. The measurement was
  wrong (hashtag lines typed as the close); the real figure is 46% on LinkedIn. A number
  that contradicts something you already know is a bug until proven otherwise.
