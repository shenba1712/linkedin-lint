# ADR-005: Zero runtime dependencies and a pure core

## Status

🟢 Accepted (2026-08-06).

## Context

The package would be quicker to write with a few dependencies. A Unicode-aware
segmenter for sentence splitting, a glob library for the CLI's `--archive` flag, a
colour library for terminal output, a schema validator for the config file. All small,
all normal.

Two things argue against, and they are specific to what this package is.

**It holds a correctness guarantee for other people's published words.** Consumers gate
publishing on `severity === 'error'`. Every dependency is a way for that guarantee to
change without anyone deciding to change it — a transitive patch alters a regex, and
suddenly escaping behaves differently in someone's pipeline. The whole point of pinning
exactly and treating escaping changes as major versions is undone by a dependency that
does not follow the same discipline.

**It runs inside other people's CI.** A compromised dependency in a package installed by
a publishing pipeline is a good place for an attacker to be.

Separately, there was a question of where I/O belongs. Rules need data — similarity needs
an archive, tell detection needs a baseline. The convenient design has the library read
files. The alternative makes the caller pass data in.

## Decision

**Zero runtime dependencies, asserted by a failing CI test. A pure core, with all I/O in
one file.**

### Zero dependencies

- `package.json` has no `dependencies`, or an empty object.
- **CI asserts it**, as a test that fails the build. It is not a policy note, because the
  value of the guarantee is that it cannot drift.
- Dev dependencies are limited to TypeScript, Vitest and ESLint.
- Consequences accepted: sentence splitting is a hand-written heuristic, colour is raw
  ANSI codes, globbing is a small hand-rolled matcher, config validation is hand-written.

The sentence splitter being imperfect is fine, and worth stating: its output feeds a
*variance* measure, and variance is robust to a few miscounts.

### Pure core

- Nothing under `src/` may import `fs`, `http`, `path`, or use `Date.now()` or
  `Math.random()`.
- **`bin/cli.ts` is the only file with I/O.** It reads files, reads config, writes stdout
  and stderr, sets the exit code.
- Where a rule needs external data, **the caller passes it in**: `options.baseline`,
  `options.archive`, `options.doNotNormalise`.

## Consequences

- **No mocks anywhere in the test suite.** A test is an input and an expected output. This
  is the largest practical payoff and it makes the escaping property tests trivial to
  write.
- **Deterministic by construction.** No clock and no randomness means the same input
  always gives the same findings, which is what makes it safe as a CI gate.
- **Install is instant and the tree is one node.** For a tool that runs before every post,
  that matters more than it sounds.
- **Tree-shakeable**, with `sideEffects: false`, so a consumer who only wants
  `escapeCommentary` gets only that.
- **More code to write and own.** Accepted. The hand-written pieces are small, and each
  one is a place where a dependency could otherwise change behaviour silently.
- **The threat model shrinks a lot.** No network, no filesystem in the core, no secrets, no
  dependencies. What remains is ReDoS and npm publishing rights, which is a short list
  ([threat-model.md](../threat-model.md)).
- **`--archive` globbing is deliberately basic.** If it ever needs to be sophisticated,
  the right answer is for the caller to pass an array of strings, not for the package to
  take a dependency.
