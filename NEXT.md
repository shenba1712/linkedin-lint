# NEXT

**Open this file, do the top unchecked thing, close it.** No deciding required.

Phase 0a is the whole roadmap commitment: **16 points, 8 tickets, roughly 6–8 sessions.**
At that point the package is publishable and Cadence is unblocked.

---

## Before the first session

- [ ] **B4** — collect the four published LinkedIn posts and six Medium pieces as text files
      in `test/fixtures/`. **Published text only.** Blocks #07 and #26
- [ ] **B3** — publish one post by hand, screenshot it on your phone. Blocks #12 (Phase 0b)
- [ ] **B1** — read the employment contract's IP clause. Blocks **only** #42, the npm
      publish. Everything else can be written and tested privately
- [ ] **B2** — npm account with 2FA, granular token scoped to this package. Blocks #42

Only B4 blocks starting. Do it first; it is 20 minutes of copy-paste.

---

## Phase 0a, in dependency order

Each row is one sitting. Do not skip ahead — every one depends on the one above.

| ✓ | # | Pts | Do this | Done when |
| --- | --- | --- | --- | --- |
| [ ] | **#01** | 2 | Scaffold: TS strict, Vitest, ESLint, ESM+CJS build | `npm test` passes on an empty suite |
| [ ] | **#02** | 1 | `src/types.ts` — `Finding`, `Severity`, `Stats`, `Baseline`, `LintOptions` | All `readonly`, all documented. They are public API |
| [ ] | **#03** | 3 | **`escapeCommentary`** — character loop, code-point aware, `\` branch first | Table cases E1–E9 pass. **The most important ticket in the repo** |
| [ ] | **#04** | 2 | `unescapeCommentary` | E10–E12 pass. A lone trailing backslash does not crash |
| [ ] | **#05** | 3 | **Property tests** | `escape(escape(s))===escape(s)` and `unescape(escape(s))===s` over 10,000+ generated inputs |
| [ ] | **#06** | 2 | Edge-case fixtures | E13–E18: empty, 3,000 `(`, emoji, both bold variants, mixed newlines, bracketed URL |
| [ ] | **#07** | 2 | Real-post round-trip fixtures | Every published post round-trips exactly. **E-REAL-1 is the `pick()` post** |
| [ ] | **#08** | 3 | `escape/*` findings with offsets | Offsets over the **original** text. `escape/unescaped-paren` its own id. All `error`, all `fixable`, not suppressible |

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

| Phase | Pts | What |
| --- | --- | --- |
| 0b | 15 | Counts and fold. Needs B3 |
| 0c | 16 | Prohibitions and bold. **#20 is the trickiest ticket in the repo** |
| 0d | 17 | Tells. **#28, the negatives suite, is the most valuable non-escaping test** |
| 0e | 7 | Similarity |
| 0f | 24 | CLI and release. #42 needs B1 and B2 |
| 0g | 13 | The landing page — the linter running client-side |

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
