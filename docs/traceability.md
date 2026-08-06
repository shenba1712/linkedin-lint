# linkedin-lint — Traceability

**Status:** v1.0, 2026-08-06. Checked by `scripts/check-docs.mjs`.

Every design risk, mapped to the doc that settles it, the ticket that builds it, and the
test that proves it. Add a row when a risk is accepted; never delete one.

## 1. Design risks

| # | Risk | Doc | Ticket | Test |
| --- | --- | --- | --- | --- |
| 1 | An unescaped `(` silently truncates a published post | ADR-002, trd §3 | #03, #08 | E1, E11 |
| 2 | A non-idempotent escaper corrupts on a second pass | ADR-002 §3.3 | #05 | E10 |
| 3 | Escaping could lose characters without anyone noticing | trd §3.3 | #05 | E-PROP |
| 4 | A regex hangs inside a consumer's CI | threat-model T1 | #33 | REDOS-1 |
| 5 | The linter fires on the author's own good writing | ADR-003 | #26, #28 | NEG-1 |
| 6 | Three common "AI tells" are actually native voice | ADR-003 | #26 | NEG-2 |
| 7 | A style rule promoted to `error` makes `error` untrustworthy | ADR-004, prd §6 | #21 | SEV-1 |
| 8 | Bold on a code identifier is unreadable and unsearchable | ADR-004 | #20, #21 | BOLD-1 |
| 9 | A dependency changes escaping behaviour silently | ADR-005 | #40 | DEPS-1 |
| 10 | A broken tarball ships and the package will not import | devops §5 | #39, #40 | PACK-1 |
| 11 | A breaking change ships as a patch | devops §3 | #42 | — see release checklist |
| 12 | npm account compromise reaches every consumer | threat-model T2 | #42 | provenance verified at release |
| 13 | Unpublished draft text lands in a public repo | threat-model T6 | #07 | content-leak check |
| 14 | The demo runs a different version than the package | landing-page §2 | #49 | version printed in footer |

## 2. The severity contract

Only three groups may produce `error`. The checker enforces it, because a diluted `error`
makes consumers stop gating on it.

| Group | May be `error` | Why |
| --- | --- | --- |
| `escape/*` | yes | The post will be truncated |
| `counts/over-limit` | yes | The API rejects or truncates it |
| `bold/code-identifier` | yes | **The cost falls on other people** — unreadable to a screen reader, unmatchable by search |
| everything else | **no** | Style. The author overrules it |
