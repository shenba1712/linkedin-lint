# linkedin-lint — Ticket Board

**Status:** v1.0, 2026-08-06. Breaks [backlog.md](./backlog.md) into pieces workable in
one sitting.

---

## How to read this

**Points:** 1, 2 or 3. Nothing bigger exists. If a ticket turns out larger than 3, split
it before starting and say so.

**Every ticket is independently reviewable, testable and revertible.**

**`Dep`** must be `[x]` before starting. **`Blocks`** is noted on critical-path tickets.

**Id convention.** Only a **bold** `**#id**` in a five-column row is a definition; plain
`#id` is a reference. `scripts/check-docs.mjs` enforces it.

Status: `[ ]` not started · `[~]` in progress · `[x]` done · `[!]` blocked

---

## External blockers

| Id | Blocker | Blocks | Notes |
| --- | --- | --- | --- |
| **B1** | Read the employment contract's IP clause | **#42 only** (npm publish) | Gates publishing, not building. All of Phase 0 can be written and tested privately |
| **B2** | npm account with 2FA, and a granular automation token scoped to this package | #38 | Minutes |
| **B3** | Publish one post by hand and screenshot it on a phone | #12 | The fold is undocumented product behaviour. It can only be calibrated by looking |
| **B4** | Collect the real published posts as fixture files | #07, #26 | **Done 2026-08-11**: 13 LinkedIn posts and 256 Medium articles in `test/fixtures/`, local only. **Published text only** |
| **B5** | Endorse negative fixtures **one file at a time** | #28 | A negative fixture asserts "if the linter fires on this, the linter is wrong" — a judgement about how you want to sound, not a claim about who wrote it (ADR-007 §8). The 13 LinkedIn markers were a bulk edit and were **stripped 2026-08-11**; 33 Medium markers remain. Ten deliberately endorsed posts beat 269 assumed ones |

B1 is the only one that could stall the project, and it stalls exactly one ticket at the
very end. B5 gates the style gate only — escaping is unaffected, because NEG-ESCAPE runs on
every fixture regardless of endorsement.

---

## Phase 0a — Escaping (19 pts)

The suite that justifies the whole package.

| Id | Ticket | Pts | Dep | Acceptance |
| --- | --- | --- | --- | --- |
| **#01** | Scaffold | 2 | — | TypeScript strict, Vitest, ESLint, ESM+CJS build. `npm test` passes on an empty suite. **Blocks everything** |
| **#02a** | The `Finding` contract | 2 | #01 | `Severity`, `Finding`, `Edit`, `Suggestion`, `Diagnostic`. All `readonly`, every export documented — they are public API. **No `fixable`**; `fix?: Edit` replaces it. **`Diagnostic` admits numbers only**, with a type-level test that a string value fails to compile |
| **#03** | `escapeCommentary` | 3 | #02a | Character loop, **code-point aware**. The `\` branch first. Table cases E1–E9 pass. **The most important ticket in the repo** |
| **#04** | `unescapeCommentary` | 2 | #03 | E10–E12 pass. Handles a lone trailing backslash without crashing |
| **#05** | Property tests | 3 | #04 | `escape(escape(s))===escape(s)` and `unescape(escape(s))===s` over 10,000+ generated inputs including all reserved chars, emoji, newlines, astral-plane characters |
| **#06** | Edge-case fixtures | 2 | #04 | E13–E18: empty string, 3,000 `(`, emoji plus reserved, both bold variants, mixed newlines, bracketed URL |
| **#07** | Real-post round-trip fixtures | 2 | #04, B4 | Every published post escapes and unescapes back to itself exactly. **E-REAL-1 is the `pick()` post** |
| **#08** | `escape/*` findings with offsets | 3 | #03 | Findings on the **original** text with correct offsets. `escape/unescaped-paren` is its own id. All `error`, all carry a **`fix`**, **not suppressible**. **Test: no two fixes overlap** across every fixture (ADR-009 §6) |

**Exit gate:** `escapeCommentary` on the `pick()` post round-trips, and the property tests
pass. At this point the package is already worth publishing.

---

## Phase 0b — Counts and fold (28 pts)

| Id | Ticket | Pts | Dep | Acceptance |
| --- | --- | --- | --- | --- |
| **#02b** | `Stats` and `Baseline` | 2 | #02a | Every field in [trd](../trd.md) §2. `Baseline` carries percentiles **per statistic and per register**, `lowConfidence`, and the **measurement date** the shipped generated-text distribution needs (ADR-007 §3) |
| **#02c** | `LintOptions`, `PostType`, `StyleConfig` | 2 | #02a | The config surface in [api-specifications](../api-specifications.md) §2. **`PostType` is an open taxonomy** — seven named members plus any string, treated as permissive (ADR-008 §5) |
| **#02d** | `Profile` and `Sample` | 1 | #02b | **A sample is `{date, register, weight, featureVector}`** — no id, no title, no text, asserted by a key-set test. Carries a schema version, because it is public API persisted on users' machines |
| **#09** | Sentence splitter | 2 | #01 | Splits on `.!?` plus whitespace, with an abbreviation exception list. Documented as approximate — it feeds a variance measure, which is robust to miscounts |
| **#10** | `computeStats` | 3 | #09 | Every field in `Stats`. Unit-tested against all 13 published posts with hand-computed expected values |
| **#11** | `counts/*` rules | 2 | #10 | `over-limit` as **error**, `short` and `long` against the baseline, `too-many-hashtags` |
| **#12** | `foldPositions` | 3 | #10, B3 | Line-aware: stops at the character budget or the third line break. Constants in **one place** with a comment saying they are observed, not specified. **Calibrated to the screenshot** |
| **#13** | `fold/*` rules | 2 | #12 | `hook-too-long`, `hook-incomplete`, `nothing-above-fold` |
| **#14** | `computeBaseline` | 3 | #10 | Percentiles per statistic **and per register**. `lowConfidence` when any register has under 5 contributors. **Fit over all 13 LinkedIn posts, not the 4-post sample** — the first envelope was fitted to 4 and 8 of 13 fell outside it (ADR-003 §Recalibration) |
| **#14a** | **Recency weighting + reference nomination** | 2 | #14 | `BaselineInput` with `publishedAt`, `register`, `weight`. 18-month half-life; `reference` weighted 4× and decay-exempt; `exclude` omitted. **The archive spans ~5 years — a flat mean matches no actual voice** |
| **#14b** | Front-matter parser for `<!-- voice: ... -->` | 1 | #14a | Reads the marker out of a fixture file. Absent means `normal` |
| **#52** | **The Profile layer** | 3 | #02d, #14a | `createProfile`, `addSample`, `baselineFrom`, `mergeProfiles`, `migrateProfile` — all **pure**, dates passed in. One JSON format shared by CLI, web, MCP and Cadence. **A sample is `{date, register, weight, featureVector}` — no id, no text**, asserted in a test. Schema is public API and versioned (ADR-008 §8) |
| **#11a** | Hashtag reasons | 2 | #11 | `counts/too-many-hashtags` **names the tags with a reason each** — token overlap, generic-tag list, term-absent (documented as the weakest signal). Ranked by reason count. Worked example is `cancun.md`'s ten tags |

---

## Phase 0c — Style and bold (17 pts)

Renamed from "Prohibitions and bold"
([ADR-007](../adr/ADR-007-flagged-not-banned-measured-baselines.md) §1).

| Id | Ticket | Pts | Dep | Acceptance |
| --- | --- | --- | --- | --- |
| **#15** | Flagged words and phrases | 2 | #02c | Configurable, word-boundary matched, case-insensitive. **Two tiers**: high-signal fires on presence, contextual counts toward density only. **`seamless` and `robust` are contextual-tier — a single one must not fire.** Tokenise-then-set-lookup, not N regexes. One `info` per occurrence with offsets, one `warn` when density crosses |
| **#16** | Em dash, emoji, hashtags, question-opener | 2 | #15 | All configurable, **all off or conservative by default**. Emoji by Unicode property, not a hard-coded list |
| **#17** | Colon rules | 3 | #09 | `colon-overuse` and `colon-parallel`. **The numbered-list exception is required**, or it fires on good structured writing |
| **#18** | `style/self-label-opener` | 1 | #15 | `As a/an <role>,`. **Decide first whether "opens with" means the first sentence or the first body paragraph** — `cancun.md` has the pattern in paragraph two |
| **#19** | Bold span detection | 3 | #02a | Serif and sans-serif bold ranges, plus italic variants. Contiguous runs are one span. Correct offsets through astral-plane characters. **Explicit range tables, not NFKC** — `mixed-variants` needs the variant identity NFKC destroys |
| **#20** | Code-identifier detection | 3 | #19 | **ASCII mapping is `normalize('NFKC')`** — verified to fold serif, sans and italic to the same string. Then checks for `()`/`<>`/`[]`/`_`/`.`, camelCase, PascalCase, keyword list. **Negative case: `𝐖𝐡𝐚𝐭 𝐢𝐭 𝐢𝐬:` must not fire** |
| **#21** | `bold/*` rules | 2 | #20 | `code-identifier` as **error** with the whitespace-isolation advice **and a `suggestion` that replaces the span with its NFKC plain-ASCII form**. `over-budget`, `in-hook`, `mixed-variants`. `allowOnCodeIdentifiers` config honoured. **Blocked on the two manual checks in qa §8** — the screen-reader and LinkedIn-search claims are unverified |
| **#54** | `style/hashtag-not-camelcase` | 1 | #16 | A multi-word all-lowercase hashtag runs together in a screen reader. An accessibility rule, sitting beside `bold/code-identifier` rather than inside a count |

**#20 is the trickiest ticket in the repo.** A rule that fires on labels as well as
identifiers is just a ban on bold, which is not the decision.

---

## Phase 0d — Tells (22 pts)

| Id | Ticket | Pts | Dep | Acceptance |
| --- | --- | --- | --- | --- |
| **#50** | **The profiling spike** | 3 | #10 | **Gates this whole phase.** Generate a *stratified* AI corpus over the author's own topics — naive, well-prompted, human-edited. Extract features. Print every distribution on **both** axes per qa-test-plan §8a. Keep only what separates **at the hardest tier**. If nothing does, that is the finding and #22/#26 are cut |
| **#51** | Ship the measured baseline | 3 | #50 | The generated-text distribution shipped as data with a **measurement date**. `tells/flat-rhythm` and `tells/tricolon-density` read percentiles from it. No user corpus required |
| **#22** | `tells/flat-rhythm` | 2 | #51 | Below p15 of the **measured generated-text distribution**. A caller baseline adds a second, personal comparison. Message states the observable, never a verdict |
| **#23** | `tells/uniform-paragraphs` | 1 | #10 | `paragraphLenCv` below 0.25. Fixed constant, no baseline |
| **#24** | `tells/no-stake` | 3 | #02c | First-person claim detection. **Only fires when `postType` requires one.** Negative case: a `mechanism` post with no personal claim must not fire |
| **#25** | `tells/no-specifics` | 2 | #09 | No number, named tool, API, or failure mode. **Gated by post type** — it is an absence feature (ADR-007 §4) |
| **#26** | The three narrowed rules | 3 | #09, #51 | `cliche-opener` **first two sentences only**; `rhetorical-close` **unanswerable only**; `tricolon-density` **density only**, against the measured distribution. Negative cases from endorsed posts must not fire |
| **#27** | `doNotNormalise` | 2 | #02c | Listed patterns never flagged, and surfaced as an `info` note. **Covers `style/*` only** — the `tells/*` gap is closed by #50's discriminant test, not by this |
| **#28** | **The negative-fixture suite** | 3 | #26, #14b, B5 | Three tiers per qa-test-plan §4. **NEG-ESCAPE across every fixture, all years** — must never fail. **NEG-CURRENT on explicitly endorsed files only** — the style gate. NEG-ARCHIVE reported, not asserted |

**#50 comes first and can end the phase.** The features that read as generated overlap
heavily with LinkedIn's native register — `cancun.md` is the worked example — so surface
features may not separate at all. Finding that out costs a spike; not finding it out costs
the phase.

**#28 is the most valuable non-escaping test in the package.** It is what keeps the linter
usable rather than something disabled after a week.

---

## Phase 0e — Similarity (7 pts)

| Id | Ticket | Pts | Dep | Acceptance |
| --- | --- | --- | --- | --- |
| **#29** | Text normalisation | 1 | #01 | Lowercase, collapse whitespace, strip punctuation. Documented, because it means `pick()` and `pick` compare as similar |
| **#30** | Trigram Jaccard | 3 | #29 | `similarity/near-duplicate` at `warn` above 0.6. Negative case: two different posts on the same topic must not fire |
| **#31** | Longest common substring | 3 | #29 | `similarity/reused-phrase` at `info` above 60 chars |

---

## Phase 0f — Release (9 pts)

**Split from the old "CLI and release" on 2026-08-11.** Bundling these with the CLI was the
sequencing error: #39–#42 are needed by Cadence, by the npm publish *and* by the landing
page, while #32–#38 are needed by none of them. One phase forced 16 points of CLI ahead of
everything that reaches another human. See "Build order" below.

| Id | Ticket | Pts | Dep | Acceptance |
| --- | --- | --- | --- | --- |
| **#39** | Packaging verification | 2 | #01 | **The build itself landed in #01** — ESM to `dist/`, CJS to `dist/cjs/`, `exports` map, `files`, `sideEffects: false`, both entry points loading. What remains: `npm pack`, inspect the tarball contents, install it in a clean directory and **import `escapeCommentary`**. **Not** "run the CLI" — there is no CLI until 0h |
| **#40** | CI pipeline | 3 | #39 | All nine jobs from devops-cicd.md §2 on Node 18, 20, 22. **`deps` and `pack` are hard failures.** The `pack` job imports the library; the CLI half of that job is added by #34 |
| **#41** | Docs and licence | 2 | #40 | README with the Honest Limits section and the **"Not affiliated with LinkedIn"** disclaimer. LICENSE, CHANGELOG |
| **#42** | npm publish | 2 | #41, B1, B2 | Tag-triggered, from CI only, `--provenance`. **Blocked by B1** |

---

## Phase 0h — CLI (16 pts)

Deliberately last. Every other surface — the library for Cadence, the browser demo for
everyone else — reaches someone without it. The CLI's user is the maintainer, and once the
live page exists it does the same job better, on any machine, with no install.

| Id | Ticket | Pts | Dep | Acceptance |
| --- | --- | --- | --- | --- |
| **#32** | `lint()` orchestration | 3 | #08, #11, #13, #21, #28 | Runs every enabled rule, sorts errors first then by offset. **Never throws on content.** Throws only on a bad options key or unknown rule id |
| **#33** | ReDoS timing audit | 3 | #32 | **Each rule ships its own pathological-input test at merge time** — CLAUDE.md and rules-reference both require it before a rule lands, so this ticket is the *audit*, not the batch: sweep every pattern in the package and fail if any lacks a timing assertion. Under 50ms on 3,000 chars |
| **#34** | CLI default output | 3 | #32 | The format in cli-design.md §3. Fixed-width severity and id columns. Verdict on the last line. Clean output is two lines. **Adds the `bin` field to package.json and extends the `pack` CI job to run the CLI** — neither can exist in 0f, because 0h is now last |
| **#35** | CLI flags | 3 | #34 | `--escape` (stdout only, diagnostics to stderr), `--fold`, `--fix` (refuses on a dirty git tree), `--json`, `--baseline`, `--stdin`, `--quiet`, `--verbose` |
| **#36** | Config discovery | 2 | #34 | `.linkedinlintrc.json` searched upward. **An unknown key is an error, not a silent ignore** |
| **#37** | Colour and TTY | 1 | #34 | `NO_COLOR`, `--no-color`, non-TTY. Severity word always present. **No emoji** |
| **#38** | Exit codes | 1 | #35 | 0 clean, 1 on any error, 2 on bad usage. **Warnings exit 0** — the CI-gate decision |

---

## Phase 0g — Landing page (13 pts)

`/` only — the escaping proof. Hosted on **Render** (ADR-008), deployed from the release tag.
Spec in [landing-page.md](../landing-page.md); the editor and telemetry are
[webapp.md](../webapp.md) and Phase 0i.

| Id | Ticket | Pts | Dep | Acceptance |
| --- | --- | --- | --- | --- |
| **#43** | Static page shell | 2 | #41 | One HTML page, no framework. System fonts, **no web fonts** — a CDN request would break the "nothing leaves your browser" claim. Light and dark |
| **#44** | Bundle the linter for the browser | 2 | #39 | The published build, running client-side. Under **60KB gzipped total** |
| **#45** | **The live demo** | 3 | #44 | Two panes, prefilled with the `pick()` post. Three tabs: what LinkedIn publishes (default), API-safe, findings. Recompute under 16ms, debounced 120ms |
| **#46** | Fold preview on the page | 2 | #45, #12 | Mobile/desktop toggle, with the honest `~` on the numbers. **Dependency on #12 added 2026-08-11** — it listed only #45, but a fold preview needs `foldPositions`. This is the one 0g ticket that has to wait for 0b |
| **#47** | Copy and honest limits | 1 | #43 | §5 of the spec. **Honest limits above the footer, not hidden.** Copy shared with the README, not duplicated |
| **#48** | Meta, OG image, a11y | 2 | #45 | OG image generated at build from the `pick()` post. Real ARIA tabs, `aria-live` results, labelled textarea. Lighthouse ≥ 95 on all four |
| **#49** | Deploy from the release tag | 1 | #42 | Same CI, same tag as the npm publish, so **the demo can never run a different version than the package**. Version printed in the footer |

**Exit gate:** paste a post containing `pick()` into the live page and see it truncate to
two words. `default-src 'self'` with no external host, so the privacy claim is checkable.

**Everything except #46 needs only Phase 0a and Phase 0f.** The headline demo — paste a post,
watch it truncate — is escaping, and escaping is done at 0a. The findings tab shows `escape/*`
only until the other rule groups land, which is honest and still the strongest thing the
package does.

---

## Phase 0i — The editor and telemetry (10 pts)

`/app`, per [webapp.md](../webapp.md). Built after 0c and 0d, when there are rules worth an
editor. `/` ships far earlier, in 0g.

| Id | Ticket | Pts | Dep | Acceptance |
| --- | --- | --- | --- | --- |
| **#55** | `/app` shell and route split | 2 | #43, #52 | Two routes. `/` carries the escaper only, `/app` the full linter — the bundle split is how the 60KB first-load budget is met. Profile import and export |
| **#56** | The editor | 3 | #55, #32 | Inline highlighting. Click a `suggestion` to apply it, then **re-lint and re-render** — offsets move. Post-type selector: detected, shown, overridable, permissive on low confidence. **Local learning, cheap version**: count dismissals locally, propose disabling a rule once it crosses a threshold. Never silent, never `error`, never `escape/*`. **`N rules muted for you` beside the verdict**, so a learned-quiet tool is distinguishable from a clean post (ADR-012 §6) |
| **#57** | Telemetry client, depth dial and ledger | 3 | #56 | **Depths 0–2** as `DiagnosticEvent` — numbers only, same-origin. **Separate type and opt-in** for `SharedFragment` (depths 3–4): max 3 sentences/session, spread first/middle/last, sent on acceptance **only when the edit diverges**. **Ledger records what was shared, not the sentences.** User-facing depth dial, default 0–2 on. **The derived tier** — edit distance, rank chosen, time to action, reverted, converged (ADR-012) |
| **#58** | Endpoint, privacy notice, published aggregates | 2 | #57 | Same-origin endpoint so `default-src 'self'` holds. Short log retention, IPs truncated. **Privacy notice, separate from T&C.** Rule-fire and dismissal rates published on the site |

**#57 is where the privacy claim is kept or lost.** The ledger is what makes the opt-in real
rather than a checkbox someone forgot.

---

## Build order

**Phase letters are content groups, not a sequence.** They were read as a sequence, and that
put 89 points between "0a is publishable" and the only surface that lets anyone find it.

| # | Phase | Pts | Why here |
| --- | --- | --- | --- |
| 1 | **0a** Escaping | 18 | The reason the package exists. Publishable alone |
| 2 | **0f** Release | 9 | Build, CI, docs, publish. **Unblocks Cadence** and is a prerequisite for the page. #42 needs B1 |
| 3 | **0g** Landing page, minus #46 | 11 | The escaping demo needs nothing else. This is what reaches someone who is not you |
| 4 | **0b** Counts and fold | 23 | Needs B3. Unblocks #46, then finish 0g. Carries the Profile (#52), which every later surface depends on |
| 5 | **#50** The profiling spike | 3 | **Go/no-go on the whole tells direction.** Runs before 0c and 0d are built, not after |
| 6 | **0c** Style and bold | 16 | |
| 7 | **0d** Tells, minus #50 | 19 | Only if #50 found features that separate at the hardest tier |
| 8 | **0e** Similarity | 7 | |
| 9 | **0i** The editor and telemetry | 10 | `/app`. Needs rules worth editing, so it follows 0c and 0d |
| 10 | **0h** CLI | 16 | Last. Nobody but the maintainer needs it, and the live page does the same job |

**38 points to a published package with a working public demo** — steps 1–3. The old order
needed 107.

Two things this deliberately puts *before* the large investment: the release pipeline, because
Cadence is blocked on it and a broken tarball is invisible until someone installs it; and the
spike, because 35 points of 0c/0d rest on features that may not separate at all.

---

## The five highest-risk tickets

| Ticket | Why |
| --- | --- |
| #03 | If escaping is wrong, consumers publish truncated posts and trust the tool that told them it was safe |
| #05 | The property tests are worth more than every table fixture combined. They cover the combinations nobody thought to write down |
| #20 | A false-positive-heavy code-identifier rule makes an `error` untrustworthy, which makes consumers stop gating on `error` |
| #28 | Without it, the linter fires on good writing and gets disabled |
| #33 | A hang inside someone else's CI is the most likely way this package causes real harm |

---

## Totals

Listed by phase letter. For the order they are built in, see "Build order" above.

| Phase | Points |
| --- | --- |
| 0a Escaping | 19 |
| 0b Counts and fold | 28 |
| 0c Style and bold | 17 |
| 0d Tells | 22 |
| 0e Similarity | 7 |
| 0f Release | 9 |
| 0g Landing page | 13 |
| 0h CLI | 16 |
| 0i Editor and telemetry | 10 |
| **Total** | **141** |

**Phase 0a alone (18 points) is publishable.** A package that only escapes correctly is
already more useful than what exists, and it is the piece Cadence needs before its own
ticket #25 can start.

That is the sequencing worth protecting, and it now extends one step further: ship 0a, run
0f so Cadence is unblocked and the package is real, put the escaping demo on a page so
someone other than the author can see the bug, **then** continue.
