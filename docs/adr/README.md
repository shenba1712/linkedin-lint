# Architecture Decision Records — linkedin-lint

Decisions that shape the package, and that someone reading the code later would
otherwise have to reverse-engineer.

Format: Status / Context / Decision / Consequences.

| # | Title | Status |
|---|---|---|
| [001](ADR-001-separate-public-package.md) | The linter is a separate public package | 🟢 Accepted |
| [002](ADR-002-escaping-is-the-core.md) | Escaping is the core, and it is a character loop, not a regex | 🟢 Accepted |
| [003](ADR-003-calibrate-against-corpus.md) | Tell detection is calibrated against a corpus, and three "tells" are not flagged | 🟢 Accepted |
| [004](ADR-004-bold-budget-is-an-error.md) | Bold on code identifiers is an error, not a warning | 🟢 Accepted |
| [005](ADR-005-zero-dependencies-pure-core.md) | Zero runtime dependencies and a pure core | 🟢 Accepted |
| [006](ADR-006-lexical-not-semantic-similarity.md) | Similarity is lexical, not semantic | 🟢 Accepted |
| [007](ADR-007-flagged-not-banned-measured-baselines.md) | Flagged, not banned — measured baselines and observable findings | 🟢 Accepted |
| [008](ADR-008-webapp-hosting-and-telemetry.md) | The webapp — hosting, telemetry, and the Profile layer | 🟢 Accepted |
| [009](ADR-009-finding-carries-edits.md) | A Finding carries applicable edits and a safe diagnostic | 🟢 Accepted |
| [010](ADR-010-typescript-and-the-toolchain-boundary.md) | TypeScript, and what the toolchain is exempt from | 🟢 Accepted |
| [011](ADR-011-rules-are-enforced-not-reviewed.md) | Every rule that can be a failing check is one | 🟢 Accepted |

Update this index whenever an ADR is added or its status changes.
