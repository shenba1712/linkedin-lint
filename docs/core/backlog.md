# linkedin-lint — Backlog

**Status:** v1.0, 2026-08-06. Tickets are in [tickets.md](./tickets.md).

Legend: `[ ]` not started · `[~]` in progress · `[x]` done · `[-]` cut

---

## Phase 0a — Escaping

**This alone is worth publishing.** A package that only escapes correctly is already more
useful than what exists.

- [ ] `escapeCommentary` — character loop, code-point aware, idempotent
- [ ] `unescapeCommentary`
- [ ] Property tests: idempotent and lossless, 10,000+ generated cases
- [ ] Table fixtures E1–E18
- [ ] Real published posts as round-trip fixtures
- [ ] The synthetic worst-case fixture
- [ ] `escape/*` findings on the original text, with offsets
- [ ] `escape/unescaped-paren` as its own rule id

**Exit:** `escapeCommentary` on the `pick()` post produces text that round-trips, and the
property tests pass.

---

## Phase 0b — Counts and fold

- [ ] `computeStats` — chars, words, paragraphs, sentences, mean and standard deviation
- [ ] Sentence splitter with an abbreviation exception list
- [ ] Paragraph-length coefficient of variation
- [ ] `counts/over-limit`, `counts/short`, `counts/long`
- [ ] `foldPositions` — line-aware, configurable
- [ ] `hookSurvives`
- [ ] `fold/hook-too-long`, `fold/hook-incomplete`, `fold/nothing-above-fold`
- [ ] `computeBaseline` with `lowConfidence`

**Exit:** the fold preview matches a real screenshot, and the constants are set to what
was observed rather than what was assumed.

---

## Phase 0c — Prohibitions and bold

- [ ] Banned words and phrases, configurable
- [ ] Em dash, emoji, hashtag count, question-opener — all configurable, conservative
      defaults
- [ ] Colon rules, including the numbered-list exception
- [ ] `prohibitions/self-label-opener`
- [ ] Unicode pseudo-bold span detection, both serif and sans-serif ranges
- [ ] Code-identifier detection
- [ ] `bold/code-identifier` as **error**, with the whitespace-isolation suggestion
- [ ] `bold/over-budget`, `bold/in-hook`, `bold/mixed-variants`

**Exit:** `𝐖𝐡𝐚𝐭 𝐢𝐭 𝐢𝐬:` does not fire, `𝐩𝐢𝐜𝐤()` does.

---

## Phase 0d — Tells

- [ ] `tells/flat-rhythm` against a baseline
- [ ] `tells/uniform-paragraphs`
- [ ] `tells/no-stake`, scoped by `postType`
- [ ] `tells/no-specifics`
- [ ] `tells/cliche-opener` — **first two sentences only**
- [ ] `tells/rhetorical-close` — unanswerable questions only
- [ ] `tells/tricolon-density` — density, never presence
- [ ] `doNotNormalise` support
- [ ] Fallback constants with honest messages when there is no baseline
- [ ] **The negative-fixture suite** — real posts produce zero errors and no false
      warnings

**Exit:** all four published posts and six Medium pieces pass clean.

---

## Phase 0e — Similarity

- [ ] Text normalisation
- [ ] Character-trigram Jaccard
- [ ] Longest-common-substring for reused phrasing
- [ ] `similarity/near-duplicate`, `similarity/reused-phrase`

---

## Phase 0f — CLI and release

- [ ] `bin/cli.ts` — the only I/O
- [ ] Default human-readable output
- [ ] `--escape`, `--fold`, `--fix`, `--json`, `--baseline`, `--stdin`
- [ ] Config discovery, with unknown keys as an error
- [ ] Colour, `NO_COLOR`, non-TTY handling
- [ ] Exit codes 0, 1, 2
- [ ] ESM plus CJS build, `exports` map, `files` list
- [ ] `deps` CI job — zero runtime dependencies, hard failure
- [ ] `pack` CI job — install the tarball and run the CLI
- [ ] ReDoS timing assertions on every pattern
- [ ] README, LICENSE, CHANGELOG
- [ ] npm publish from CI with provenance and 2FA

**Exit:** `npm i -g linkedin-lint`, run it on the `pick()` post, see the escaping it
needs.

---

## Phase 1 — Whatever real usage asks for

Deliberately empty. The package is small and finished at v1.0; anything added should come
from a real report rather than from imagination.

The one thing actively wanted: **a post that published truncated.** That is a missing test
case and the most valuable contribution the project can receive.

---

## Cut, or not doing

Recorded so they are decisions rather than gaps.

- [-] **Other platforms.** X, Threads and Mastodon have different formats and different
      fold behaviour. One tool covering all of them is wrong everywhere
- [-] **Semantic similarity.** Needs a model, breaking both the zero-dependency and
      pure-core rules. [ADR-006](../adr/ADR-006-lexical-not-semantic-similarity.md)
- [-] **Publishing.** No HTTP client, no token concept. That is the consumer's job
- [-] **Drafting or rewriting.** No LLM. `--fix` applies only mechanical fixes
- [-] **A score out of ten.** A number invites optimising for the number
- [-] **Claiming to detect AI-written text.** It cannot, and saying so would be dishonest
- [-] **Telemetry.** Never. It would betray the one thing that makes a zero-dependency
      pure-function package trustworthy
- [-] **A rule auto-fixer for style findings.** Only `escape/*` is `fixable`. Anything
      needing judgement stays with the author
