# linkedin-lint — QA and Test Plan

**Status:** v1.0, 2026-08-06.

One thing must never be wrong: **escaping**. Everything else is ordinary. Test effort
is allocated accordingly, and the escaping suite is allowed to be larger than the rest
of the tests combined.

---

## 1. Tooling

Vitest. Nothing else.

Every function under `src/` is pure, so there are **no mocks anywhere**. That is the
main practical payoff of the pure-core rule — a test is an input and an expected
output.

`bin/cli.ts` is tested by running it as a subprocess against fixture files and
asserting on stdout, stderr and the exit code.

---

## 2. Escaping — the suite that matters

### 2.1 Table cases

| Id | Input | Expected |
| --- | --- | --- |
| E1 | `pick()` | `pick\(\)` |
| E2 | `pick(user, ['name'])` | every `(`, `)`, `[`, `]` escaped |
| E3 | `Pick<T, K>` | `<` and `>` escaped |
| E4 | `{ name: string }` | `{` and `}` escaped |
| E5 | `K extends keyof T` | unchanged — no reserved characters |
| E6 | `a_b_c` | each `_` escaped |
| E7 | `#shenbabuilds` | `#` escaped |
| E8 | `@someone` | `@` escaped |
| E9 | `~`, `*`, `\|` | each escaped |
| E10 | `\(` (already escaped) | **unchanged.** No double escaping |
| E11 | `\` alone at end of string | flagged `escape/lone-backslash`, handled without crashing |
| E12 | `\\(` (escaped backslash then paren) | both handled correctly |
| E13 | `""` empty string | `""`, no findings |
| E14 | 3,000 characters of only `(` | every one escaped, completes fast |
| E15 | Emoji plus reserved characters | emoji untouched, offsets still correct |
| E16 | Unicode Mathematical Bold plus reserved | bold untouched |
| E17 | `\r\n` and `\n` mixed | newlines preserved exactly |
| E18 | A URL with `?a=(b)&c=[d]` | escaped, so a first comment with a tracking link survives |

### 2.2 Property tests

The guarantees, over generated inputs that include every reserved character at
random positions, plus emoji, newlines and astral-plane characters:

```
escape(escape(s)) === escape(s)     // idempotent, ALWAYS
unescape(escape(s)) === s           // lossless, s has NO `\` before a reserved char
```

Plus two boundary tests: stability holds on raw input, and **fails** on input containing
an escape sequence — pinned so the false universal claim cannot return.

**And the generators are asserted too.** A corpus that never emitted a backslash would
pass every property vacuously; the share of inputs containing reserved characters,
escape sequences, emoji, astral-plane characters and newlines is checked. That check
caught two wrong thresholds of mine on its first run.

At least 10,000 generated cases. These properties are worth more than the whole
table above, because they cover the combinations nobody thought to write down.

### 2.3 Real-post fixtures

Every published post is a fixture. For each one:

1. `escape` it
2. `unescape` the result
3. Assert it equals the original exactly

Valid here because published posts are not already escaped — which is exactly the
qualification §2.2 carries.

**E-REAL-1** is the `pick()` post, because it is the reason the package exists. It
contains `(`, `)`, `[`, `]`, `<`, `>`, `{`, `}` — eight reserved characters across six
kinds — and unescaped it would publish as two words.

### 2.4 The worst-case fixture

`test/fixtures/public/worst-case.txt` — every reserved character, emoji, both unicode
bold variants, a bracketed URL, mixed newlines, and an already-escaped sequence.

**The fixture's contents are asserted, not assumed.** It claimed mixed newlines and had
13 LF and zero CRLF until 2026-08-26; the spec was right and the file had drifted from
it. `fixtures.test.ts` now checks all 15 reserved characters, both bold ranges, emoji,
CRLF *and* bare LF, and the escape sequence are present — so the next drift fails a test
instead of quietly weakening every assertion built on the file.

**It deliberately does not round-trip.** It contains `\(` on purpose, which is the input
class `unescape` cannot recover (ADR-002). That limit is asserted too, so nobody
"fixes" the fixture to make a round-trip test pass.

### 2.5 The regression rule

**Every post that publishes truncated becomes a fixture before the bug is fixed.** A
bug report with the exact text is the most valuable contribution this project can
receive, and the README asks for it.

---

## 2.6 Inspect the segment before trusting the metric

Three wrong numbers were reported during the 2026-08 corpus spike, all the same species:
**non-authorial text sitting where prose was expected.**

| Bug | Wrong number | Real answer |
| --- | --- | --- |
| Hashtag lines typed as the close | "closes with a question: 1%" | 46% on LinkedIn |
| Inline code counted as prose | "sentence variance rose 6.5 → 12" | 6.35 → 7.73 — medium, not large |
| `Exported from Medium on…` left in all 256 files | every close-shape measurement | — |

**The standing check, before reporting any corpus statistic:** print the actual text of
the segment being measured for three documents and read it. If the segment is not what the
metric name claims, the metric is wrong.

Ten seconds each. It would have caught all three.

## 2.7 The two invariants that keep content from leaking

Both from [ADR-009](./adr/ADR-009-finding-carries-edits.md), both cheap, both silently stop
being true when someone adds a rule.

| Test | Asserts |
| --- | --- |
| **DIAG-1** | No value in any `diagnostic` is a substring of the input text, across every fixture. The numbers-only type makes this true by construction; the test catches anyone widening the type |
| **FIX-1** | No two `fix` edits overlap, across every fixture. True today because each `escape/*` fix inserts one `\` at one reserved character's index — **reasoned, not proven**, which is why it is asserted |

FIX-1 is the tripwire for `--fix`: the moment a second rule becomes fixable, it fails, and
whoever added it has to build the overlap-resolution loop ADR-009 §6 deliberately does not
build.

---

## 3. ReDoS tests

Rules are patterns over user-supplied text, running inside other people's pipelines.
A catastrophic backtrack is a denial of service in someone's CI.

Every regex in the package gets:

- A **pathological input** test: long runs of the characters the pattern cares about,
  nested repeats, and near-matches that fail at the last character.
- A **timing assertion**: the call completes in under 50ms for a 3,000-character input.

The escaper has no regex at all — it is a character loop — which removes the highest
risk surface by construction. That is one of the reasons it is written that way.

New rules cannot merge without this test. It is item 2 of the five in
[rules-reference.md](./rules-reference.md) §"Adding a rule".

---

## 4. The negative-fixture rule

**The most important test in the package after escaping.**

Run every real published post through `lint()` with the author's own configuration and
baseline, and assert:

- **Zero `error` findings**
- **Zero findings from the three narrowed tells** (`tells/cliche-opener`,
  `tells/rhetorical-close`, `tells/tricolon-density`)
- No `style/*` finding that contradicts the author's actual usage

If a rule fires on genuinely good published writing, **the rule is wrong, not the
writing.** This test is what keeps the linter usable rather than something you disable
after a week.

**Scoped 2026-08-11.** The rule needed qualifying. The archive spans ~2021-2026 —
different voices, different skill levels, some AI-assisted. "Must not fire on any
published work" is too strong: a 2021 piece may legitimately trip `tells/flat-rhythm`
because the author's rhythm genuinely was different then, and loosening a good rule to
accommodate a voice they have moved on from makes the linter useless.

**Corrected 2026-08-11 (second pass).** The paragraph above and the gate below were in direct
conflict: the archive is acknowledged as "some AI-assisted", and the same archive was then
used as the hard gate asserting that style rules must **not** fire. If any of those files are
generated, tuning rules to stay silent on them trains the linter to accept exactly what it
exists to flag.

The fix is not a provenance label. The tool cannot know who wrote a text and neither can a
reader, so provenance is irrelevant to the product
([ADR-007](./adr/ADR-007-flagged-not-banned-measured-baselines.md) §8). What a negative
fixture actually asserts is **"if the linter fires on this, the linter is wrong"** — a claim
about *desirability*, which the author can answer today about any post without recalling how
it was written.

That is what `<!-- voice: reference -->` already means. It has to be applied **deliberately,
per file.** All 13 LinkedIn fixtures carried it from a bulk edit, which turned an endorsement
into a default; **stripped 2026-08-11**, to be re-added one at a time.

So the suite splits:

| Suite | Fixtures | Assertion |
| --- | --- | --- |
| **NEG-CURRENT** | Files **explicitly** marked `voice: reference` — deliberate, per-file endorsement. Not "unset", which means nothing was decided | **Zero errors, zero findings from the three narrowed tell rules.** This is the hard gate |
| **NEG-ESCAPE** | **Every** fixture, all years, endorsed or not | **Zero `escape/*` errors, and every file round-trips.** Age and provenance are both irrelevant here |
| NEG-ARCHIVE | Everything not endorsed | Reported, not asserted. A finding here is information, not a bug |

NEG-ESCAPE is the one that must never fail and it uses the whole archive — old,
odd-punctuation pieces are the *best* escaping fixtures. NEG-CURRENT is the one that
governs whether a style rule is well-calibrated.

**NEG-CURRENT now has 33 eligible fixtures**, all Medium articles — the count NEXT.md B4
recorded all along. The discrepancy was the 13 LinkedIn tags added on top of it.

**One consequence needs measuring before `#14` runs.** The 13 LinkedIn posts were the
endorsed set's technical-register contributors. With them removed, the technical register may
have too few endorsed contributors to clear `computeBaseline`'s five-contributor threshold,
which would correctly flag it `lowConfidence`. The register split across the remaining 33 has
**not** been re-measured — do that before trusting any per-register percentile, and do not
carry forward the old "13 technical / 33 essay" figure, which counted the stripped files.

---

## 5. Rule tests

Each rule needs positive and negative cases.

| Group | Positive | Negative |
| --- | --- | --- |
| `counts/*` | A post over the limit, one under the baseline minimum | Posts inside the measured range |
| `fold/*` | A 200-character first sentence; a fold landing mid-word | The DynamoDB post, whose 94-character hook survives comfortably |
| `style/*` | Each high-signal flagged word; 5 hashtags; a question opener; a post over the contextual-density threshold | Endorsed posts. Specifically: a single `seamless` or `robust` must **not** fire — they are contextual-tier and cannot fire alone |
| `tells/flat-rhythm` | Generated prose with uniform sentences | Every endorsed fixture |
| `tells/no-stake` | A `postType: 'opinion'` post with no first-person claim | A `postType: 'mechanism'` post with none — must **not** fire |
| `tells/cliche-opener` | `X is not Y. It is Z.` as sentence one | The same shape in paragraph four — must **not** fire |
| `tells/rhetorical-close` | "Isn't that fascinating?" | "What's another function whose type is hard to get right?" — a real invitation, must **not** fire |
| `bold/code-identifier` | `𝐩𝐢𝐜𝐤()`, `𝐏𝐢𝐜𝐤<𝐓, 𝐊>` | `𝐖𝐡𝐚𝐭 𝐢𝐭 𝐢𝐬:` — a label, must **not** fire |
| `counts/too-many-hashtags` | `cancun.md`'s ten tags — each dropped tag names its own reason | A post with four specific, non-overlapping tags |
| `style/hashtag-not-camelcase` | `#traveltrivia` | `#TravelTrivia`, and single-word `#Cancun` |
| `Profile` | A sample round-trips through export and import | **A sample contains no id and no text** — assert the key set |
| `bold/over-budget` | 5 spans | 3 spans |
| `similarity/*` | The same post twice | Two different posts on the same topic |

The `bold/code-identifier` negative case matters: the whole point of the rule is that
labels are fine and identifiers are not. A rule that fires on both is just a ban on
bold.

---

## 6. Baseline tests

| Case | Expected |
| --- | --- |
| `computeBaseline` over all 13 published posts | Percentiles match hand-computed values |
| `computeBaseline` over fewer than 10 texts | `lowConfidence: true` |
| `computeBaseline` where a register has under 5 contributors | `lowConfidence: true` for that register. **Likely to fire on the technical register now that the 13 LinkedIn tags are stripped** — see §4 |
| `lint` with **no** caller baseline | `tells/flat-rhythm` and `tells/tricolon-density` still fire, against the **measured generated-text distribution**, and say which distribution they used. `counts/short` and `counts/long` stay silent — they are personal-only |
| `lint` with a caller baseline | Messages quote both comparisons: the measured percentile *and* the author's own range |
| Any tell finding | Message states the **observable** — "sentence lengths are 14, 15, 13, 15, 14 words" — never a verdict about who wrote it |

Rows four and six are correctness cases, not niceties. A tool reporting "below your
baseline" when it has no baseline is lying to the user, and a tool reporting "this is AI" is
asserting a fact it cannot know.

---

## 7. CLI tests

Run as a subprocess. Assert stdout, stderr and exit code.

| Id | Case | Expected |
| --- | --- | --- |
| C1 | Clean post | Exit 0, two lines, "Safe to publish" |
| C2 | Post with an escaping error | Exit 1, "Not safe to publish" |
| C3 | Post with warnings only | **Exit 0.** The CI-gate decision |
| C4 | Missing file | Exit 2, message on stderr |
| C5 | Invalid config | Exit 2, names the bad key |
| C6 | Unknown config key | Exit 2. **Not a silent ignore** |
| C7 | `--escape` | Only the escaped body on stdout; diagnostics on stderr |
| C8 | `--json` | Valid JSON matching the documented shape |
| C9 | `--fix` on a dirty git tree | Refuses without `--force` |
| C10 | `--no-color`, `NO_COLOR`, non-TTY | No ANSI codes, severity words still present |
| C11 | `--stdin` | Reads stdin, same output |

C3 and C7 are the two that make it usable in a pipeline.

---

## 8. Manual checks

Things tests cannot cover. **The first three are not optional polish** — each one is an
empirical claim a shipped rule currently rests on.

- [ ] **Calibrate the fold.** Publish one post, screenshot on a phone, compare against
      `foldPositions`. **Adjust the constants to the observation**, not the other way
      round. It is undocumented product behaviour, so looking is the only method
- [ ] **Screen reader on a bold code identifier.** VoiceOver or NVDA on `𝐩𝐢𝐜𝐤()`. Record what
      is actually announced. This is the strongest of `bold/code-identifier`'s reader-harm
      arguments and it is **currently unverified** (ADR-004)
- [ ] **LinkedIn search against Unicode bold.** Publish a post containing `𝐑𝐞𝐚𝐜𝐭`, then search
      LinkedIn for "React". **Currently unverified, and NFKC normalisation is a specific
      reason to doubt it** — search indexes commonly normalise, which is the same mechanism
      that makes `𝐩𝐢𝐜𝐤` and `pick` the same identifier in Python. If it matches, delete the
      claim from ADR-004 and rules-reference
- [ ] Unicode bold rendering on iOS, Android and desktop web
- [ ] Install the published tarball in a clean directory and run the CLI. Catches a
      broken `files` list or `exports` map
- [ ] Confirm the installed package has **zero** `node_modules` entries of its own

If either bold claim fails, `bold/code-identifier` stays `error` on the guard argument —
there is no Unicode bold in any of the 269 fixtures, so the rule costs nothing to enforce
(ADR-004). Verifying them changes the *rationale*, not the severity.

---

## 8a. The discriminant test

**Required for every rule that reads a measured feature**
([ADR-007](./adr/ADR-007-flagged-not-banned-measured-baselines.md) §7).

The features that make text read as generated overlap almost entirely with the features that
make it read as **formal or second-language English**: uniform sentence length, low lexical
variety, taught connectives, few contractions. Published work on AI detectors found they
flagged a large share of TOEFL essays by non-native writers while flagging almost none by
US-born students — those detectors were measuring low perplexity, and careful non-native
prose is low perplexity. `doNotNormalise` protects regional English from `style/*` by listing
patterns; a statistical rule has no pattern to list, so the protection has to be a
measurement.

For each candidate feature, measure separation on **two** axes:

| Axis | Question |
| --- | --- |
| Provenance | Does it separate generated from written? |
| Register | Does it separate formal from casual? |

**A feature that separates register as strongly as it separates provenance does not ship.**

The second axis needs no new corpus: the Medium archive splits by register, so it is one
extra column in the same histogram.

---

## 8b. The profiling spike, and what gates it

Before any rule is built on a measured feature, run the spike in #50:

1. Generate a **stratified** corpus of AI LinkedIn posts over the author's own topics,
   labelled by prompt sophistication — naive, well-prompted, human-edited
2. Extract features. Print **every** distribution, both axes
3. Keep only features that separate **at the hardest tier**

Stratification is the experiment, not a nicety. A corpus built from naive prompts measures
lazy output, and a tool calibrated on lazy output flags only what people already spot
unaided.

**One prediction to test first, because it may end the whole line of work.**
`test/fixtures/linkedin/cancun.md` is written in LinkedIn's native register — hook question,
emoji, hashtag stack, closing invitation. Generated LinkedIn posts look the same, because
models learned that register from posts like it. So the surface features may not separate at
all, and the separation, if any, will live in the absence features — no cost, no asymmetry,
no surprise — which are register-independent.

If nothing separates at the hardest tier, that is the finding, and it arrives for the cost of
a spike instead of 32 points of rules that do not work.

Standing rule from §2.6 applies throughout: **print the actual text of three generated posts
and read them** before trusting any number measured over them.

---

## 9. CI gates

Every push and PR:

```
lint          eslint
types         tsc --noEmit
test          vitest run
escape        the escaping suite alone, including property tests
redos         timing assertions
negatives     real posts produce zero errors and no false warnings
deps          assert zero runtime dependencies — a hard failure, not a warning
pack          npm pack, then install the tarball and run the CLI
```

`deps` is a real test, not a policy note. The value of "zero dependencies" is that it
cannot drift, and the only way to guarantee that is to fail the build.

---

## 10. Coverage intent

**Must be covered:** escaping in every branch, every rule with positive and negative
cases, the negative-fixture suite, ReDoS timing, CLI exit codes.

**Should be covered:** baseline percentiles, fold line-awareness, similarity
thresholds.

**Need not be covered:** terminal colour output, the exact column alignment of the
human-readable format.
