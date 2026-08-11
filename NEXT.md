# NEXT

**Open this file, do the top unchecked thing, close it.** No deciding required.

Phase 0a is the whole roadmap commitment: **18 points, 8 tickets, roughly 6–8 sessions.**
At that point the package is publishable and Cadence is unblocked.

---

## Before the first session

- [x] **B4** — done 2026-08-11. 13 LinkedIn posts and 256 Medium articles in
      `test/fixtures/`, local only. 33 tagged `voice: reference`
      in `test/fixtures/`. **Published text only.** Blocks #07 and #26
- [ ] **B5** — endorse negative fixtures **one file at a time**. Blocks #28 (Phase 0d).
      A marker means *"if the linter fires on this, the linter is wrong"* — a judgement
      about how you want to sound, not a claim about who wrote it. The 13 LinkedIn markers
      were a bulk edit and were **stripped 2026-08-11**; the 33 Medium ones remain, which
      is what B4 recorded. Ten deliberate endorsements beat 269 assumed ones
- [ ] **B3** — publish one post by hand, screenshot it on your phone. Blocks #12 (Phase 0b).
      **Two more things to check while you are there**, both currently unverified claims
      that `bold/code-identifier` rests on: what a screen reader announces for `𝐩𝐢𝐜𝐤()`, and
      whether LinkedIn search finds a post containing `𝐑𝐞𝐚𝐜𝐭` when you search "React"
- [ ] **B1** — read the employment contract's IP clause. Blocks **only** #42, the npm
      publish. Everything else can be written and tested privately
- [ ] **B2** — npm account with 2FA, granular token scoped to this package. Blocks #42

None of these block starting — B4 is done. B5 blocks only the style gate at the very end of
0d; escaping never depends on it.

---

## Phase 0a, in dependency order

Each row is one sitting. Do not skip ahead — every one depends on the one above.

| ✓ | # | Pts | Do this | Done when |
| --- | --- | --- | --- | --- |
| [x] | **#01** | 2 | Scaffold: TS strict, Vitest, ESLint, ESM+CJS build | **Done 2026-08-11.** tsc, lint, test and check-docs all green. ESLint enforces the non-negotiables — verified by probe |
| [ ] | **#02** | 1 | `src/types.ts` — `Finding`, `Severity`, `Stats`, `Baseline`, `LintOptions`, `Edit`, `Suggestion`, `Diagnostic`, `Profile` | All `readonly`, all documented. They are public API. **No `fixable`** — `fix?: Edit` replaces it |
| [ ] | **#03** | 3 | **`escapeCommentary`** — character loop, code-point aware, `\` branch first | Table cases E1–E9 pass. **The most important ticket in the repo** |
| [ ] | **#04** | 2 | `unescapeCommentary` | E10–E12 pass. A lone trailing backslash does not crash |
| [ ] | **#05** | 3 | **Property tests** | `escape(escape(s))===escape(s)` and `unescape(escape(s))===s` over 10,000+ generated inputs |
| [ ] | **#06** | 2 | Edge-case fixtures | E13–E18: empty, 3,000 `(`, emoji, both bold variants, mixed newlines, bracketed URL |
| [ ] | **#07** | 2 | Real-post round-trip fixtures | Every published post round-trips exactly. **E-REAL-1 is the `pick()` post** |
| [ ] | **#08** | 3 | `escape/*` findings with offsets | Offsets over the **original** text. `escape/unescaped-paren` its own id. All `error`, all carry a `fix`, not suppressible. Test: no two fixes overlap |

**Exit gate:** `escapeCommentary` on the `pick()` post round-trips, and the property tests
pass. Stop here and reassess — this alone is worth publishing.

---

## Session kickoff

Paste this into Claude Code at the start of a session:

```
Read CLAUDE.md and docs/README.md. I'm working ticket #NN from NEXT.md.
Propose a plan before writing code. When done: tsc --noEmit, lint, test,
and node scripts/check-docs.mjs.
```

## Session close

```bash
npm test && npx tsc --noEmit && npm run lint
node scripts/check-docs.mjs      # docs still consistent?
```

Then tick the box above, tick the ticket in `docs/core/tickets.md`, and commit.

---

## After Phase 0a

Do not start these without deciding the roadmap slot can carry them
(`engineeros-roadmap/core/preset.md` §3.3 commits to 0a only).

**Resequenced 2026-08-11.** The phase letters were being read as a build order, which put 89
points between "0a is publishable" and the only surface that lets anyone find it. The letters
are content groups; this is the order.

| Do | Phase | Pts | What |
| --- | --- | --- | --- |
| 2nd | **0f** | 9 | Release: verify the tarball, CI, docs, publish. **The build itself landed in #01.** **Unblocks Cadence.** #42 needs B1 and B2 |
| 3rd | **0g** minus #46 | 11 | The landing page. The escaping demo needs nothing beyond 0a and 0f — this is what reaches someone who is not you |
| 4th | **0b** | 23 | Counts and fold. Needs B3. Unblocks #46, then finish 0g. Carries the Profile (#52) that every later surface needs |
| 5th | **#50** | 3 | The profiling spike. **Go/no-go on the whole tells direction** — run it before building 0c and 0d, not after |
| 6th | **0c** | 17 | Style and bold. **#20 is the trickiest ticket in the repo** |
| 7th | **0d** minus #50 | 19 | Tells, only if #50 found anything. #28, the negatives suite, is the most valuable non-escaping test. Needs B5 |
| 8th | **0e** | 7 | Similarity |
| 9th | **0i** | 10 | `/app` — the editor and telemetry. Needs rules worth editing |
| 10th | **0h** | 16 | The CLI. Last — nobody but you needs it, and the live page does the same job with no install |

**0a + 0f + 0g is 38 points to a published package with a working public demo.** The old
order needed 107.

Three of these totals were also wrong before (0b said 15, 0d 17, 0f 24). They now match
[docs/core/tickets.md](./docs/core/tickets.md), which `check-docs.mjs` verifies against the
ticket rows. Total is **135**.

---

## Rules that do not bend

From `CLAUDE.md`, repeated because they are the ones that get eroded at 11pm:

1. **Zero runtime dependencies.** Not few. Zero
2. **No `fs`, `http`, `path`, `Date.now()`, `Math.random()` outside `bin/`**
3. **Only `escape/*`, `counts/over-limit` and `bold/code-identifier` may be `error`**
4. **Every regex gets a pathological-input timing test** before it merges
5. **Negative fixtures from real published posts.** If a rule fires on good writing, the
   rule is wrong — not the writing
6. **A change to escaping is never a patch version**
