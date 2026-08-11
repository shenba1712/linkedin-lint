# ADR-010: TypeScript, and what the toolchain is exempt from

## Status

🟢 Accepted (2026-08-11), recorded retroactively. The choice was made implicitly when the
package was extracted from Cadence; this writes down the reasoning, because it is the most
fundamental technical decision in the repo and had no record at all.

## Context

The package is pure string processing with zero runtime dependencies. On that description
alone, almost any language would do — which is exactly why the real constraint is easy to
miss.

**One requirement decides it.** [landing-page.md](../landing-page.md) and
[webapp.md](../webapp.md) commit to the linter **running in the browser, under 60KB
gzipped**. That is not a nice-to-have: it is what makes "your writing never leaves your
browser" true, what makes the CSP claim checkable, and what makes hosting cost nothing. It
is also, per landing-page §1, *the strongest possible proof of the zero-dependency pure-core
claim — the demo works because the architecture is what it says it is.*

Everything else is secondary to that.

Two further pulls, both weaker but aligned: **Cadence is a Node project** and calls this on
every post, and **the people this bug bites are already on npm** — they are writing
`useState()` and `.filter()` into their posts, which is why the parentheses are there.

## Decision

**TypeScript, compiled to ESM and CJS, published to npm.**

### Alternatives, and why they lose

| Option | Verdict |
| --- | --- |
| **Python** | Dead for the browser. Pyodide is measured in megabytes — off by orders of magnitude, not a tuning problem. Better than TS for the *corpus analysis*, which is handled by the carve-out below |
| **Java / Kotlin** | Awkward in the browser, distributed through Maven rather than npm, and verbose for what is fundamentally string processing. No compensating advantage |
| **Go** | Standard Go's WASM output carries a runtime measured in megabytes; TinyGo is smaller but constrained. Not npm-native |
| **Rust → WASM** | **The only real contender**, and better on correctness: exhaustive matching, no null, `proptest` for the two escaping properties |

Rust loses on two things specific to this package:

- **The shipped artifact becomes a binary blob.** [ADR-001](./ADR-001-separate-public-package.md)
  argues this is a portfolio artifact and *"a portfolio artifact needs readable source"*. Part
  of the pitch is that you can read the whole escaper — about 200 lines — before trusting it
  with your published words. A `.wasm` file cannot be read that way.
- **Cadence would need a WASM loading boundary** on a function called before every post.

### The accepted cost: UTF-16

**JavaScript is arguably the worst mainstream choice for this package's specific hazard.**
Strings are UTF-16, so:

- the escaper must iterate **code points, not units** ([trd](../trd.md) §3.4)
- offsets through astral-plane characters are a named risk in `#19`
- `normalize('NFKC')` is not length-preserving, which
  [ADR-009](./ADR-009-finding-carries-edits.md) has to call out explicitly

In Python 3 that entire class of bug does not exist — strings are code points. In Rust it is
explicit in the type system. Here it is a tax, paid with discipline: `[...str]` iterates code
points correctly, and the property tests in `#05` generate astral-plane input precisely to
cover it.

**Three separate warnings about this already exist across the docs.** That is the evidence
the tax is real, not the reassurance that it is handled.

### Packaging

ESM to `dist/`, CJS to `dist/cjs/` with a `{"type": "commonjs"}` marker, `tsc` and nothing
else. Rationale and the rejected `.mjs`/`.cjs` naming are in
[devops-cicd.md](../devops-cicd.md) §5.

**`src/` compiles with `"types": []`**, so `process`, `Buffer` and every other Node global do
not resolve in the shipped build — on top of the ESLint ban. Two layers, because the "cannot
phone home" guarantee in [ADR-008](./ADR-008-webapp-hosting-and-telemetry.md) rests on it.

### The carve-out: analysis tooling is not bound by any of this

**`scripts/` is not the package.** The zero-dependency rule protects the published tarball;
the pure-core rule protects `src/`. Neither governs tooling that never ships.

So the profiling spike in `#50` — stratified distributions, percentile fitting, overlap
coefficients on two axes — **may be written in Python with pandas and matplotlib**, and
probably should be. Hand-rolling statistics in dependency-free TypeScript to measure whether
a feature separates two populations is the wrong trade: the output of that spike is a
go/no-go on 19 points of rules, and the measurement quality matters more than toolchain
uniformity.

This is the project's own lesson applied to itself: *"Do not design around your own
constraints. Solve the problem, not the limitation."*

Cost accepted: a contributor running the spike needs Python as well as Node. The
package, its tests and its CI gates stay pure Node.

## Consequences

- **The browser budget is now load-bearing on a language choice**, so a future change that
  breaks it — a heavy dependency, a WASM rewrite — is a decision about the landing page too,
  not just about the package.
- **Unverified:** nobody has measured whether the full linter actually fits in 60KB gzipped.
  It is plausible for pure string processing with no dependencies, and it is checked in `#44`.
  If it fails, the fix is bundling only what `/` needs — which the route split in ADR-008 §10
  already provides.
- **Rust stays a legitimate future option for `escape.ts` alone**, if correctness ever
  demands it, at the cost of the readability argument. Recorded so it is a decision rather
  than a rediscovery.
- **The carve-out needs guarding.** "Tooling may use dependencies" is one careless step from
  "the package may use dependencies". The line is the `files` list: if it is not in the
  tarball, it is not bound.
