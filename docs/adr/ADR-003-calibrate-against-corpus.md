# ADR-003: Tell detection is calibrated against a corpus, and three "tells" are not flagged

## Status

🟢 Accepted (2026-08-06). The decision most likely to be second-guessed, so the reasoning
is written out in full.

**Extended 2026-08-11 by [ADR-007](./ADR-007-flagged-not-banned-measured-baselines.md).**
Everything below stands. What changed is the *source* of the default threshold: it is no
longer "the caller's corpus, or a fallback constant", but a percentile within a measured
distribution of **generated** text, with the caller's own corpus as an optional second
comparison. The reason is in ADR-007 §3 — the maintainer's corpus may not be used to gauge
anyone else's writing, and a personal baseline left a new user with the best rule disabled.
ADR-007 §7 adds a discriminant test every feature here must now pass before it ships.

## Context

The package flags prose that reads as machine-written. The obvious approach is a list of
known AI tells: the `X is not Y. It is Z.` construction, closing rhetorical questions,
tricolons, em-dash-heavy pivots.

**Amended 2026-08-11.** The corpus is now **13 published LinkedIn posts and 256 Medium
articles**, imported as local fixtures. The decision below is unchanged and one supporting
claim inverted — see "Recalibration" at the end. The detectors were calibrated on the
four posts available in August 2026 and have **not** been re-fitted to all 13.

That approach was tried against a real corpus — four published LinkedIn posts and about
twenty Medium pieces by one author — and it failed badly. Three of the "tells" turned out
to be the author's own native moves:

**The negation-reframe.** One of the author's strongest published hooks is *"The hardest
part of DynamoDB is not the API. It is unlearning how you think about a database."* That
is the banned template, and it is the best sentence in the post. Worse, the underlying
*move* — reframing something the reader assumes — is the hook requirement, not a defect.

**Closing questions.** *"So, what's another function whose body is trivial but whose type
is genuinely hard to get right?"* is a specific, answerable invitation and it is good
practice. A naive rule would flag it.

> **Amended.** This section originally read "all four published posts end with one." Across
> all 13 the real figure is **3 of 13**. So a closing question is not the author's habit —
> but the conclusion holds for a better reason: the rule must distinguish an *answerable
> invitation* from a rhetorical one, and that distinction does not depend on frequency.

**Tricolons.** They are everywhere in the author's prose, and in most good prose. Lists
of three are how English works. **Measured across the 256-article archive: tricolon-shaped
triples appear in 99% of articles at 9.68 per 1,000 words.** This is the one calibration
claim that survived contact with the full corpus unchanged.

> **Reproducibility gap, noted 2026-08-11.** The script that produced those two numbers is
> not in this repository, and "tricolon-shaped triple" has no recorded definition, so the
> figures cannot be re-run or checked. They are reported here as measured, and the
> conclusion does not depend on them — the rule flags density rather than presence because
> presence is universal, which the numbers illustrate rather than establish. Re-measure with
> a committed script during #50, where the definition has to be written down anyway.

Meanwhile the things that *do* separate generated from written prose were not on the
usual list at all: flattened sentence-length variance, uniform paragraph blocks, missing
personal stake, and an absence of anything concrete.

There was a fourth discovery. The author writes recurring regional English constructions
— *"let's understand why is the redirect path so easy"*. A model's instinct is to "fix"
these, and fixing them is precisely how a draft stops sounding like the author. A linter
that flags them is a linter that sands the writer down.

## Recalibration owed

Measured across all 13 posts (`prd.md` §5.2 in Cadence carries the full table):

| Claim, as first written | Measured across 13 |
| --- | --- |
| Closing question in all four | **3 of 13** |
| Zero emoji | **Present in 7 of 13**, up to 11 |
| Never opens with a question | **3 of 13 do** |
| Bold spans, up to 3 | **Zero, in any post** |
| Question openers "common on Medium" | **6 of 256 (2%)** vs 3 of 13 (23%) on LinkedIn — backwards |

**None of these change a decision in this ADR**, because every rule here is `warn` or
configurable and each is justified by a mechanism rather than a frequency. They do mean the
four *thresholds* were fitted to a sample that was not representative, so `#14`
(`computeBaseline`) must be fitted against all 13 before any percentile is trusted.

## Decision

**Thresholds come from a corpus the caller supplies. Three patterns are narrowed rather
than banned. Regional constructions are explicitly protected.**

### The four detectors that work

| Id | Test |
| --- | --- |
| `tells/flat-rhythm` | `sentenceLenStdDev` below the baseline's 15th percentile. **The single best signal** |
| `tells/uniform-paragraphs` | `paragraphLenCv` below 0.25 |
| `tells/no-stake` | No first-person experience claim — **only when `postType` calls for one** |
| `tells/no-specifics` | No number, named tool, API, or failure mode anywhere |

### The three that are narrowed

| Pattern | Naive rule | This package |
| --- | --- | --- |
| `X is not Y. It is Z.` | Ban everywhere | Flag **only in the first two sentences**, where it is a cliché opener. Never in the body |
| Closing question | Ban all | Flag **only unanswerable** ones. A specific invitation is good writing |
| Tricolons | Ban lists of three | Flag **density** above the baseline's 90th percentile. Never presence |

### Calibration

- `computeBaseline(texts)` is exported. The caller passes their own published work.
- With no baseline, thresholds fall back to conservative constants **and the finding
  messages say so.** A tool reporting "below your baseline" without a baseline is lying.
- `Baseline` carries `lowConfidence: true` under ten texts.

### Protection

- `options.doNotNormalise: string[]` lists patterns the linter must never flag, and which
  surface as an `info` note so a consumer's own tooling can carry them forward.

### The test that enforces all of this

**Every real published post, run through `lint()`, must produce zero `error` findings and
zero findings from the three narrowed rules.** It runs in CI as the `negatives` job.

**If a rule fires on genuinely good published writing, the rule is wrong, not the
writing.**

## Consequences

- **The linter is usable rather than something you disable after a week.** That is the
  whole point. A linter with a 30% false-positive rate gets turned off, and then it
  catches nothing.
- **Tell detection is weaker without a baseline**, and honestly labelled as such. Accepted:
  the fallback still catches the worst cases, and the fix is one function call.
- **It cannot claim to detect AI-written text**, and does not. It reports that rhythm is
  flat, which is a narrower and true claim
  ([compliance-matrix.md](../compliance-matrix.md) C1).
- **`tells/no-stake` needs `postType` from the caller**, which is more API surface than a
  simple rule would need. Justified: several strong published posts contain no personal
  claim at all — the URL shortener sizing post, the click-tracking piece — so firing on
  all of them would be wrong.
- **The negative-fixture suite is the most valuable non-escaping test in the package**,
  and it grows every time the author publishes.
