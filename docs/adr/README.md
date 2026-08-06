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

Update this index whenever an ADR is added or its status changes.
