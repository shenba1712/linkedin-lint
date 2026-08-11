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
| 18 | ADR-004 asserted bold identifiers "cannot be copied" and "will not compile". Tested 2026-08-11: TypeScript errors, **JavaScript accepts them as a distinct identifier**, Python NFKC-normalises and they work. The claim was wrong and the rule's severity rested on it | ADR-004 §Context | #21 | measured, three languages |
| 19 | Two of `bold/code-identifier`'s three reader harms are asserted and unverified — screen-reader output and LinkedIn search. NFKC gives specific reason to doubt the search one | ADR-004, qa §8 | #21 | manual checks, qa §8 |
| 20 | The style gate ran on a corpus the same doc calls "some AI-assisted", so rules would be calibrated to stay silent on generated text | qa §4, ADR-007 §8 | #28, B5 | NEG-CURRENT, endorsed files only |
| 21 | 13 LinkedIn fixtures were bulk-tagged `voice: reference`, turning a per-file endorsement into a default and giving them 4× baseline weight | ADR-007 §8 | B5, #14a | stripped 2026-08-11; 33 remain, matching NEXT.md B4 |
| 22 | A generic AI baseline flags formal and non-native English, the documented failure of every detector. `doNotNormalise` cannot protect against a statistical rule | ADR-007 §7, qa §8a, threat-model T9 | #50 | discriminant test, both axes |
| 25 | A `tells/*` finding quoted at a writer becomes an accusation. No attacker needed — the tool working as designed is the mechanism | threat-model T9, ADR-007 §6 | #22, #51 | message-wording test, qa §6 |
| 26 | ADR-003's tricolon figures (99% of articles, 9.68 per 1,000 words) were measured by a script that is not in the repo, so they cannot be reproduced or re-run | ADR-003 §Context | #50 | re-measure in the spike |
| 27 | A telemetry payload assembled per-surface eventually includes user text by accident | ADR-009 §3, ADR-008 §4 | #02, #57 | `diagnostic` is numbers-only by type; test asserts no value is a substring of the input |
| 28 | A compromised web service exfiltrates unpublished drafts; same-origin CSP is no defence when the origin is the attacker | threat-model T10, ADR-008 | #58 | deploy from the release tag only, never by hand |
| 29 | Server access logs hold IP addresses — personal data — where the project previously held none | threat-model T10, compliance D10–D13 | #58 | short retention, truncated IPs, privacy notice |
| 30 | The privacy claim becomes conditional once sentences are shared, and a checkbox nobody remembers is not consent | ADR-008 §6, compliance D8 | #57 | visible ledger, viewable and deletable; 3/session cap |
| 31 | `fixable: boolean` could disagree with the fix it described | ADR-009 §1 | #02, #08 | field removed; `fix !== undefined` is the test |
| 32 | Two `fix` edits overlapping would corrupt the text `--fix` exists to protect | ADR-009 §6 | #08 | test asserts no two fixes overlap across every fixture |
| 33 | The Profile grows into post history and becomes a second Cadence | ADR-008 §8, webapp §4 | #52, #55 | sample shape `{date, register, weight, featureVector}` asserted in a test — no id, no text |
| 34 | The language choice had no record, though it forecloses Rust and is what makes the 60KB browser budget meetable | ADR-010 | #01, #44 | bundle size checked in #44 |
| 35 | UTF-16 makes JS the worst mainstream choice for this package's specific hazard — offsets through astral-plane characters | ADR-010, trd §3.4 | #03, #05, #19 | property tests generate astral-plane input |
| 36 | A rule that lives only in prose erodes silently — nothing breaks, it just stops being true | ADR-011 | #01 | 18 rules now enforced by ESLint, check-docs or a test |
| 37 | A check whose scope is hardcoded data stops checking silently and still reads as green — `check-docs.mjs` nearly did on the group rename | ADR-011 §Consequences | #01 | rename check added; guards verified by probe |
| 23 | Surface "AI tells" may separate LinkedIn's native register rather than authorship — generated posts learned that register from posts like `cancun.md` | ADR-007 §9, qa §8b | #50 | stratified spike, hardest tier |
| 24 | A measured baseline dates as models change, fastest at the vocabulary layer | ADR-007 §3, trd §8.0 | #51 | measurement date shipped with the baseline |
| 9 | A dependency changes escaping behaviour silently | ADR-005 | #40 | DEPS-1 |
| 10 | A broken tarball ships and the package will not import | devops §5 | #39, #40 | PACK-1 |
| 11 | A breaking change ships as a patch | devops §3 | #42 | — see release checklist |
| 12 | npm account compromise reaches every consumer | threat-model T2 | #42 | provenance verified at release |
| 13 | Unpublished draft text lands in a public repo | threat-model T6 | #07 | content-leak check |
| 14 | The demo runs a different version than the package | landing-page §2 | #49 | version printed in footer |
| 15 | Three different point totals existed for the same tickets — headings 108, summary table 111, rows 114. Cadence and the roadmap both copied 108 | tickets §Totals | — | check §3b, `phase-points` |
| 16 | ADR-003 and ADR-004 each asserted a corpus fact that was false at 13 posts: "all four close with a question" (really 3 of 13) and "the author already uses Unicode bold" (zero, anywhere) | ADR-003 §Recalibration, ADR-004 §Context | #14 | re-fit `computeBaseline` over 13 |
| 17 | Root files were never scanned by `check-docs.mjs` | — | — | corpus now includes `CLAUDE.md`, `README.md`, `NEXT.md` |

## 2. The severity contract

Only three groups may produce `error`. The checker enforces it, because a diluted `error`
makes consumers stop gating on it.

| Group | May be `error` | Why |
| --- | --- | --- |
| `escape/*` | yes | The post will be truncated |
| `counts/over-limit` | yes | The API rejects or truncates it |
| `bold/code-identifier` | yes | **It costs nothing to enforce** — zero Unicode bold across all 269 fixtures, so it guards against the tooling's own output. Reader harms are supporting and partly unverified (ADR-004) |
| everything else | **no** | Style. The author overrules it |
