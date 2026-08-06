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
| **B4** | Collect the real published posts as fixture files | #07, #26 | Four LinkedIn posts and six Medium pieces. **Published text only** |

B1 is the only one that could stall the project, and it stalls exactly one ticket at the
very end.

---

## Phase 0a — Escaping (16 pts)

The suite that justifies the whole package.

| Id | Ticket | Pts | Dep | Acceptance |
| --- | --- | --- | --- | --- |
| **#01** | Scaffold | 2 | — | TypeScript strict, Vitest, ESLint, ESM+CJS build. `npm test` passes on an empty suite. **Blocks everything** |
| **#02** | `types.ts` | 1 | #01 | `Finding`, `Severity`, `Stats`, `Baseline`, `LintOptions`. All `readonly`. Every export documented — they are public API |
| **#03** | `escapeCommentary` | 3 | #02 | Character loop, **code-point aware**. The `\` branch first. Table cases E1–E9 pass. **The most important ticket in the repo** |
| **#04** | `unescapeCommentary` | 2 | #03 | E10–E12 pass. Handles a lone trailing backslash without crashing |
| **#05** | Property tests | 3 | #04 | `escape(escape(s))===escape(s)` and `unescape(escape(s))===s` over 10,000+ generated inputs including all reserved chars, emoji, newlines, astral-plane characters |
| **#06** | Edge-case fixtures | 2 | #04 | E13–E18: empty string, 3,000 `(`, emoji plus reserved, both bold variants, mixed newlines, bracketed URL |
| **#07** | Real-post round-trip fixtures | 2 | #04, B4 | Every published post escapes and unescapes back to itself exactly. **E-REAL-1 is the `pick()` post** |
| **#08** | `escape/*` findings with offsets | 3 | #03 | Findings on the **original** text with correct offsets. `escape/unescaped-paren` is its own id. All `error`, all `fixable`, **not suppressible** |

**Exit gate:** `escapeCommentary` on the `pick()` post round-trips, and the property tests
pass. At this point the package is already worth publishing.

---

## Phase 0b — Counts and fold (15 pts)

| Id | Ticket | Pts | Dep | Acceptance |
| --- | --- | --- | --- | --- |
| **#09** | Sentence splitter | 2 | #01 | Splits on `.!?` plus whitespace, with an abbreviation exception list. Documented as approximate — it feeds a variance measure, which is robust to miscounts |
| **#10** | `computeStats` | 3 | #09 | Every field in `Stats`. Unit-tested against the four published posts with hand-computed expected values |
| **#11** | `counts/*` rules | 2 | #10 | `over-limit` as **error**, `short` and `long` against the baseline, `too-many-hashtags` |
| **#12** | `foldPositions` | 3 | #10, B3 | Line-aware: stops at the character budget or the third line break. Constants in **one place** with a comment saying they are observed, not specified. **Calibrated to the screenshot** |
| **#13** | `fold/*` rules | 2 | #12 | `hook-too-long`, `hook-incomplete`, `nothing-above-fold` |
| **#14** | `computeBaseline` | 3 | #10 | Percentiles for each statistic. `lowConfidence: true` under 10 texts. Verified against hand-computed values |

---

## Phase 0c — Prohibitions and bold (16 pts)

| Id | Ticket | Pts | Dep | Acceptance |
| --- | --- | --- | --- | --- |
| **#15** | Banned words and phrases | 2 | #02 | Configurable, word-boundary matched, case-insensitive. Conservative defaults. **`seamless` and `robust` are not on the list** — they appear in good writing |
| **#16** | Em dash, emoji, hashtags, question-opener | 2 | #15 | All configurable, **all off or conservative by default**. Emoji by Unicode property, not a hard-coded list |
| **#17** | Colon rules | 3 | #09 | `colon-overuse` and `colon-parallel`. **The numbered-list exception is required**, or it fires on good structured writing |
| **#18** | `self-label-opener` | 1 | #15 | `As a/an <role>,` |
| **#19** | Bold span detection | 3 | #02 | Serif and sans-serif bold ranges, plus italic variants. Contiguous runs are one span. Correct offsets through astral-plane characters |
| **#20** | Code-identifier detection | 3 | #19 | Maps back to ASCII, then checks for `()`/`<>`/`[]`/`_`/`.`, camelCase, PascalCase, keyword list. **Negative case: `𝐖𝐡𝐚𝐭 𝐢𝐭 𝐢𝐬:` must not fire** |
| **#21** | `bold/*` rules | 2 | #20 | `code-identifier` as **error** with the whitespace-isolation suggestion. `over-budget`, `in-hook`, `mixed-variants`. `allowOnCodeIdentifiers` config honoured |

**#20 is the trickiest ticket in the repo.** A rule that fires on labels as well as
identifiers is just a ban on bold, which is not the decision.

---

## Phase 0d — Tells (17 pts)

| Id | Ticket | Pts | Dep | Acceptance |
| --- | --- | --- | --- | --- |
| **#22** | `tells/flat-rhythm` | 2 | #14 | Below baseline p15. **Without a baseline, uses a fallback constant and the message says so** |
| **#23** | `tells/uniform-paragraphs` | 1 | #10 | `paragraphLenCv` below 0.25 |
| **#24** | `tells/no-stake` | 3 | #02 | First-person claim detection. **Only fires when `postType` requires one.** Negative case: a `mechanism` post with no personal claim must not fire |
| **#25** | `tells/no-specifics` | 2 | #09 | No number, named tool, API, or failure mode |
| **#26** | The three narrowed rules | 3 | #09, B4 | `cliche-opener` **first two sentences only**; `rhetorical-close` **unanswerable only**; `tricolon-density` **density only**. Negative cases from the real posts must not fire |
| **#27** | `doNotNormalise` | 2 | #02 | Listed patterns never flagged, and surfaced as an `info` note |
| **#28** | **The negative-fixture suite** | 3 | #26, B4 | All four LinkedIn posts and six Medium pieces: **zero errors, zero findings from the three narrowed rules.** Runs in CI as `negatives`. If a rule fires here, the rule is wrong |

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

## Phase 0f — CLI and release (24 pts)

| Id | Ticket | Pts | Dep | Acceptance |
| --- | --- | --- | --- | --- |
| **#32** | `lint()` orchestration | 3 | #08, #11, #13, #21, #28 | Runs every enabled rule, sorts errors first then by offset. **Never throws on content.** Throws only on a bad options key or unknown rule id |
| **#33** | ReDoS timing tests | 3 | #32 | Every pattern: pathological input completes in under 50ms on 3,000 chars. **A new rule cannot merge without one** |
| **#34** | CLI default output | 3 | #32 | The format in cli-design.md §3. Fixed-width severity and id columns. Verdict on the last line. Clean output is two lines |
| **#35** | CLI flags | 3 | #34 | `--escape` (stdout only, diagnostics to stderr), `--fold`, `--fix` (refuses on a dirty git tree), `--json`, `--baseline`, `--stdin`, `--quiet`, `--verbose` |
| **#36** | Config discovery | 2 | #34 | `.linkedinlintrc.json` searched upward. **An unknown key is an error, not a silent ignore** |
| **#37** | Colour and TTY | 1 | #34 | `NO_COLOR`, `--no-color`, non-TTY. Severity word always present. **No emoji** |
| **#38** | Exit codes | 1 | #35 | 0 clean, 1 on any error, 2 on bad usage. **Warnings exit 0** — the CI-gate decision |
| **#39** | Build and packaging | 3 | #01 | ESM+CJS, `exports` map, `files` limited to `dist`, `bin`, README, LICENSE. `sideEffects: false` |
| **#40** | CI pipeline | 3 | #39 | All nine jobs from devops-cicd.md §2 on Node 18, 20, 22. **`deps` and `pack` are hard failures** |
| **#41** | Docs and licence | 2 | #40 | README with the Honest Limits section and the **"Not affiliated with LinkedIn"** disclaimer. LICENSE, CHANGELOG |
| **#42** | npm publish | 2 | #41, B1, B2 | Tag-triggered, from CI only, `--provenance`. **Blocked by B1** |

---

## Phase 0g — Landing page (13 pts)

Static, GitHub Pages, from this repo. Spec in
[landing-page.md](../landing-page.md).

| Id | Ticket | Pts | Dep | Acceptance |
| --- | --- | --- | --- | --- |
| **#43** | Static page shell | 2 | #41 | One HTML page, no framework. System fonts, **no web fonts** — a CDN request would break the "nothing leaves your browser" claim. Light and dark |
| **#44** | Bundle the linter for the browser | 2 | #39 | The published build, running client-side. Under **60KB gzipped total** |
| **#45** | **The live demo** | 3 | #44 | Two panes, prefilled with the `pick()` post. Three tabs: what LinkedIn publishes (default), API-safe, findings. Recompute under 16ms, debounced 120ms |
| **#46** | Fold preview on the page | 2 | #45 | Mobile/desktop toggle, with the honest `~` on the numbers |
| **#47** | Copy and honest limits | 1 | #43 | §5 of the spec. **Honest limits above the footer, not hidden.** Copy shared with the README, not duplicated |
| **#48** | Meta, OG image, a11y | 2 | #45 | OG image generated at build from the `pick()` post. Real ARIA tabs, `aria-live` results, labelled textarea. Lighthouse ≥ 95 on all four |
| **#49** | Deploy from the release tag | 1 | #42 | Same CI, same tag as the npm publish, so **the demo can never run a different version than the package**. Version printed in the footer |

**Exit gate:** paste a post containing `pick()` into the live page and see it truncate to
two words. `default-src 'self'` with no external host, so the privacy claim is checkable.

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

| Phase | Points |
| --- | --- |
| 0a Escaping | 16 |
| 0b Counts and fold | 15 |
| 0c Prohibitions and bold | 16 |
| 0d Tells | 17 |
| 0e Similarity | 7 |
| 0f CLI and release | 24 |
| 0g Landing page | 13 |
| **Total** | **111** |

**Phase 0a alone (16 points) is publishable.** A package that only escapes correctly is
already more useful than what exists, and it is the piece Cadence needs before its own
ticket #25 can start.

That is the sequencing worth protecting: ship 0a, unblock Cadence, then continue.
