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

### 1. The core is pure, and there are three layers

`src/` must not import `fs`, `http`, `path`, or anything that touches a clock or a
random source. No `Date.now()`, no `Math.random()`.

| Layer | Holds | Pure |
| --- | --- | --- |
| Core | `lint`, `escapeCommentary`, `computeStats` | yes |
| **Profile** | baseline, preferences, samples — passed in, returned out | **yes** |
| Adapters | `bin/cli.ts`, the webapp, MCP, Cadence | no |

The Profile is state without I/O: `addSample(profile, stats, meta) → Profile`, dates passed
in as arguments. **A sample is `{date, register, weight, featureVector}` — no id, no text.**

**The published npm package never touches the network.** Telemetry exists only in the webapp
layer. Anyone who runs `npm i linkedin-lint` gets code that cannot phone home, or
[ADR-005](./docs/adr/ADR-005-zero-dependencies-pure-core.md) and threat-model T4 both die.

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

**`scripts/` is not the package.** The zero-dependency rule protects the published tarball
and the pure-core rule protects `src/`; neither governs tooling that never ships. The
profiling spike may be Python with pandas if that measures better — its output is a go/no-go
on 19 points of rules, and measurement quality beats toolchain uniformity
([ADR-010](./docs/adr/ADR-010-typescript-and-the-toolchain-boundary.md)). **The line is the
`files` list: if it is not in the tarball, it is not bound.**

### 3a. Rules here are enforced, not remembered

Anything in this file that can be a failing check **is** one — ESLint, `check-docs.mjs`, or a
test. Where a check and this document disagree, the check wins and this document is stale.
[ADR-011](./docs/adr/ADR-011-rules-are-enforced-not-reviewed.md) lists all 18 and says which
rules are deliberately left to judgement.

Adding a rule now costs writing its check. That is a feature: it filters out rules not worth
enforcing.

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

### 8. Say what was measured, not what it means

A finding reports the observable: *"sentence lengths are 14, 15, 13, 15, 14 words"*. Never
*"this reads as AI"*. The package cannot know who wrote a text, and the writers a heuristic
misjudges are disproportionately people writing formal or second-language English — the
documented failure of every AI detector.

### 9. No author's corpus judges another author

The shipped baseline is measured from **generated** text and is one-sided: *"flatter than
85% of the generated posts measured"*. The maintainer's writing is a test fixture, never a
model. A caller's own corpus adds a second, personal comparison and is never required.
[docs/adr/ADR-007](./docs/adr/ADR-007-flagged-not-banned-measured-baselines.md).

### 10. A measured feature ships only if it passes the discriminant test

It must separate generated-from-written more strongly than formal-from-casual. A feature
that separates register as well as provenance is a register detector, however intuitive it
feels. See [docs/qa-test-plan.md](./docs/qa-test-plan.md) §8a.

### 11. Nothing with content in it is ever transmitted

`diagnostic` is **numbers only, by type**, so content cannot appear in it structurally.
Curated-list rules send an index — `termIndex: 47` — never the matched word. Sentence sharing
is a separate opt-in, capped at three per session, with a ledger the user can read and clear.
[ADR-008](./docs/adr/ADR-008-webapp-hosting-and-telemetry.md) §4.

### 12. `--fix` applies `fix`, never `suggestions`

`fix` is mechanical and currently `escape/*` only. `suggestions` carry a range and a
replacement for an editor to offer, and are never applied automatically. Adding a fixable
style rule means building the overlap-resolution loop that
[ADR-009](./docs/adr/ADR-009-finding-carries-edits.md) §6 deliberately does not build.

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

Every rule needs all six, in this order:

1. An entry in [docs/rules-reference.md](./docs/rules-reference.md) with an id, a
   severity, a threshold and a rationale
2. A pathological-input test proving the pattern cannot backtrack catastrophically
3. Positive fixtures — text that should trigger it
4. **Negative fixtures from explicitly endorsed published posts** — proving it does not
   fire on writing the author stands behind
5. **A discriminant check**, for any rule reading a measured feature (§10)
6. The implementation

If step 4 fails, the rule is wrong, not the writing. If step 5 fails, the rule is measuring
register and does not ship at all.

### Justify Changes

Say what changed, why, and what breaks without it. No drive-by changes.

## Rule ids

`group/name`, lowercase, hyphenated:

```
escape/unescaped-paren
fold/hook-too-long
counts/over-limit
style/em-dash
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
  style.ts          flagged words, em dashes, emoji, hashtags
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
- Do not write a finding message that asserts who wrote the text (§8)
- Do not use the maintainer's corpus as a baseline for anyone else (§9)
- Do not bulk-apply `voice: reference` — endorsement is per file, deliberately
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

- **Print a variable's distribution before using it to split, filter, or control.** Four
  separate times a near-constant was mistaken for a discriminator:

  | Variable | What it did | Actual spread |
  | --- | --- | --- |
  | `inResponseTo` | Passed every article | Constant in the export |
  | `genreHint` regex | One bucket | `explainer` took 131 of 256 |
  | Register keyword list | Undercounted technical | Missed `TTL`, `CDN`, `tombstone` — 4/32 not 13/33 |
  | 12-genre codebook | Controlled nothing | 4 of 12 genres used; `register` `essay` 15 of 16 |

  **A variable whose modal value takes more than about two-thirds cannot separate anything**,
  and one that is constant silently passes everything — which looks like success. One
  `Counter` printed before writing the consumer catches all four. This is the sibling of
  §2.6 in `docs/qa-test-plan.md`: that one says look at the text, this one says look at the
  spread.

- **Do not design around your own constraints.** "I can't read 391k words" led to a plan
  that sampled 1.5% of the corpus. The corpus never needed to fit anywhere — one document
  in, one record out, aggregate the records. Solve the problem, not the limitation.

- **Validate a measurement before reporting it.** The profiler's first run said "closes
  with a question: 1%", contradicting a hand reading of four posts. The measurement was
  wrong (hashtag lines typed as the close); the real figure is 46% on LinkedIn. A number
  that contradicts something you already know is a bug until proven otherwise.

- **Run the cheap check before stating a structural claim.** Three claims were asserted
  confidently in one session and were wrong, each checkable in under a minute:

  | Claim | Reality |
  | --- | --- |
  | Bold identifiers "cannot be copied, will not compile" | TS rejects them; **JS accepts them as a distinct identifier**; Python NFKC-normalises and runs |
  | A fixture was the author's own writing, so a rule firing on it proved the rule wrong | Provenance was never established. The inference did not hold |
  | `{startsWithAuxiliary, wordCount, hasConcreteNoun}` separates rhetorical from genuine questions | Misclassifies `cancun.md`, a fixture already in the repo |

  A plausible claim costs the same to produce as a verified one, and confidence tracks how
  easily the sentence formed rather than whether it was checked. The fix is procedural, not
  vigilance: **if a claim is checkable with a command, run it first** — the data is in
  `test/fixtures/`. **A proposed discriminator ships with the test that would falsify it**, or
  it is a guess and gets labelled one. This is the sibling of the two lessons above: they say
  measure the data, this one says measure your own claims about it.
