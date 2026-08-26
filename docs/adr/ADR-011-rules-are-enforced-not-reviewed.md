# ADR-011: Every rule that can be a failing check is one

## Status

🟢 Accepted (2026-08-11), recorded retroactively. The pattern was already in the repo three
times over before it had a name.

## Context

`CLAUDE.md` is a list of rules that matter: zero runtime dependencies, no `fs` in `src/`, no
`Date.now()`, only three rule groups may be `error`, every regex gets a timing test. NEXT.md
repeats six of them under the heading *"Rules that do not bend — repeated because they are
the ones that get eroded at 11pm."*

That heading is the whole problem. **Prose does not enforce anything.** A rule written in a
document is followed exactly as long as someone remembers it, and the failure mode is silent:
nothing breaks, the rule just quietly stops being true.

The repo had already discovered this independently, several times:

- `scripts/check-docs.mjs` exists because *"the same failure happened three times during
  authoring: something specified in one doc and never propagated to the others."*
- [ADR-005](./ADR-005-zero-dependencies-pure-core.md) makes zero-dependencies **a failing CI
  test**, not a policy note, because *"the value of the guarantee is that it cannot drift."*
- [devops-cicd.md](../devops-cicd.md) §2 says the same of the `deps` job, in the same words.
- The negatives suite and the ReDoS timing assertions are the same move applied to rules.

Four instances of one idea, never stated as the idea.

## Decision

**Any rule in `CLAUDE.md` that can be expressed as a failing check must be one. A rule that
exists only as prose is a rule that will erode.**

### What this already means, concretely

| Rule | Enforced by | Added |
| --- | --- | --- |
| Zero runtime dependencies | `test/scaffold.test.ts` + the `deps` CI job | #01 |
| No `fs`/`path`/`http` in `src/` | ESLint `no-restricted-imports` | #01 |
| **The package cannot reach the network** | ESLint `no-restricted-globals` — `fetch`, `WebSocket`, `process`, `Buffer` | #01 |
| Same, second layer | `tsconfig.build.json` `"types": []` — the globals do not resolve | #01 |
| No `Date.now()` / `Math.random()` anywhere | ESLint `no-restricted-properties` | #01 |
| No classes, no enums | ESLint `no-restricted-syntax` | #01 |
| No `any` in public API | `@typescript-eslint/no-explicit-any` as an error | #01 |
| Only three groups may be `error` | `check-docs.mjs` severity check | pre-existing |
| Rule ids are documented | `check-docs.mjs` rule-id check | pre-existing |
| The `prohibitions/*` rename completes | `check-docs.mjs` rename check | ADR-007 |
| Ticket points reconcile | `check-docs.mjs` §3, §3b | pre-existing |
| Every doc link resolves | `check-docs.mjs` §6, §6b | pre-existing |
| No unpublished text in a public repo | `check-docs.mjs` content-leak check | pre-existing |
| **No `diagnostic` value is a substring of the input** | DIAG-1 | ADR-009 |
| **No two `fix` edits overlap** | FIX-1 | ADR-009 |
| A profile sample carries no id and no text | Key-set assertion | ADR-008 |
| Every regex survives pathological input | ReDoS timing tests, `#33` | pre-existing |
| Rules do not fire on endorsed writing | The negatives suite, `#28` | pre-existing |
| **Comments stay short** | `check-comments.mjs` — no block over 6 lines | 2026-08-26 |

### The two properties a good check has

**It fails loudly when the rule stops being true**, and **it is impossible to satisfy
accidentally.** The `diagnostic` field is the clearest example: its type admits only numbers,
so content cannot appear in it *structurally* — the test exists to catch someone widening the
type, not to catch a careless value.

The `PLANNED` allowlist in `check-docs.mjs` is the same shape from the other direction: it
suppresses a check for two named files, and **a planned file that now exists is itself a
failure**, so landing the ticket forces removing the line. A bypass that cannot rot.

### Where this does not apply

- **Judgement rules.** "If a rule fires on good writing, the rule is wrong" cannot be
  automated — it needs a human to decide what good writing is. The negatives suite is as
  close as it gets, and it depends on B5, which is a person making per-file judgements.
- **Empirical claims.** Whether a screen reader announces Unicode bold is a manual check
  ([qa-test-plan.md](../qa-test-plan.md) §8), not a test.
- **Rules whose check would cost more than the rule is worth.** Not everything earns a gate.

The test for adding one: *would this failing silently cost someone something?* Zero
dependencies drifting costs every consumer. A style preference drifting costs nobody.

## Consequences

- **`CLAUDE.md` becomes partly redundant, and that is the point.** The document explains
  *why*; the checks enforce *what*. Where the two disagree, the check wins and the doc is
  stale.
- **A new rule now has a cost** — writing its check — which is a useful filter on adding
  rules that do not matter enough to enforce.
- **The checks are themselves code that can be wrong.** `check-docs.mjs` had a real gap this
  session: its rule-group list was hardcoded, so renaming `prohibitions/*` would have silently
  stopped validating the group. A check that stops checking is worse than no check, because it
  reads as green. **When a check's scope is data — a list of groups, of phases, of paths — that
  data is the thing most likely to go stale.**
- **Verified 2026-08-11:** every ESLint guard above was tested with a probe file that violates
  each rule. All fired, each with its CLAUDE.md citation. A guard that has never been seen to
  fail is a guard nobody has tested.
