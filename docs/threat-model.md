# linkedin-lint — Threat Model

**Status:** v1.0, 2026-08-06.

A pure-function package with no network and no credentials has a small threat surface.
But it is **public, installed by other people, and it runs inside their pipelines** —
so the risks it does have point outward rather than inward.

The asset is not data. It is **other people's trust that installing this is safe and
that its output is correct.**

---

## 1. Assets

| # | Asset | Why it matters |
| --- | --- | --- |
| A1 | The npm publishing rights | A compromised publish reaches every consumer's build |
| A2 | The correctness of `escapeCommentary` | Consumers gate publishing on it. A wrong answer means their posts truncate |
| A3 | Availability inside consumer pipelines | A hang or crash breaks their build, not ours |
| A4 | The repo's reputation | It is a portfolio artifact as much as a tool |

There is no user data, no token, no database and no network call anywhere in the
package. That is by design and it removes most of what a threat model normally covers.

---

## 2. Threats

### T1 — Catastrophic regex backtracking (highest real risk)

Rules are patterns over arbitrary user text, executing inside someone else's CI. A
nested quantifier turns a 3,000-character post into a hang.

This is the most likely way this package causes real harm, because it needs no attacker
— an unusual post is enough.

- **No nested quantifiers.** No `(a+)+`-shaped patterns. Reviewed on every rule.
- **The escaper uses a character loop, not a regex**, which removes the highest-value
  target by construction.
- Every pattern has a pathological-input test with a **50ms timing assertion** on a
  3,000-character input.
- A new rule cannot merge without that test.

### T2 — npm account or token compromise (highest impact)

Publishing rights are the crown jewels. A malicious version reaches everyone.

- **Publish only from CI**, using a scoped automation token in GitHub Actions secrets.
  No publishing from a laptop.
- **npm provenance** enabled, so the registry records which workflow and commit built
  the tarball.
- **Two-factor authentication** on the npm account, required for writes.
- Tag-triggered releases only, so a stray push to `main` cannot publish.
- Granular access token scoped to this package alone.

### T3 — An incorrect escaper (the quiet one)

Not an attack, but the same outcome as one: consumers publish truncated posts and blame
their own code.

Two ways it happens: a wrong initial implementation, or a later change that alters
behaviour without anyone noticing it was a behaviour change.

- Property tests for idempotence and losslessness.
- Every real published post as a round-trip fixture.
- **A change to escaping is always a major version**, never a patch
  ([devops-cicd.md](./devops-cicd.md) §3).
- Consumers are told to pin exactly, and Cadence does.

### T4 — Dependency compromise

- **Zero runtime dependencies**, asserted as a **failing CI test** rather than a
  policy note. The guarantee only holds if it cannot drift.
- Dev dependencies are limited to TypeScript, Vitest and ESLint.
- Lockfile committed. `npm audit` in CI. Dependabot on.

### T5 — Malicious or hostile input causing a crash

A linter that throws breaks a publish pipeline at the worst moment.

- `lint()` **never throws on content**. Any content produces findings.
- It throws only on programming errors: a non-string input, an unknown options key, an
  unknown rule id.
- Fuzz-adjacent cases in the test suite: empty string, only reserved characters, only
  emoji, 100KB of text, lone surrogates, mixed newlines, a trailing backslash.

### T6 — Unpublished content leaking into a public repo

The package is extracted from a private project that holds unpublished drafts and a
personal style corpus.

- **Fixtures use already-published posts only.** Stated as a rule in `CLAUDE.md` and
  checked at review.
- No baseline file, no archive, no style guide is committed here. Those are caller-
  supplied data, which is one of the reasons the core takes them as arguments.
- No configuration containing the author's personal prohibition list ships in the
  package. Defaults are deliberately generic.

### T7 — Typosquatting

`linkedin-lint` invites `linkedin-lint-js`, `linkedinlint`, `linkedln-lint`.

Nothing can be done pre-emptively at zero cost, and reserving names is noise. The
mitigations are the README stating the canonical repo, and npm provenance letting
anyone verify a tarball came from this repository.

### T8 — Over-trusted output

A subtler risk: someone reads "0 errors" as "this post is good", or reads a passing
`tells` check as "not AI-written".

The package cannot know either of those things, and implying it can would be dishonest.

- The verdict is **"Safe to publish"**, never "Good post". No score out of ten, because
  a number invites optimising for the number.
- Fold positions print with a `~` and a footer saying they are approximate.
- Tell findings say plainly that they measure rhythm, not authorship.
- The README has an explicit "Honest limits" section.

---

## 3. Not applicable

Recorded so the absence is a decision.

- **No authentication or authorisation.** No accounts exist.
- **No data at rest.** The library holds nothing.
- **No network.** No `fetch`, no `http`. Enforced by the pure-core rule.
- **No secrets in the package.** The only secret in the project is the npm token, which
  lives in CI.
- **No PII.** Text passes through function arguments and is never stored.

---

## 4. Boundaries

```
  consumer's build / CI
       │  passes text, baseline, archive as ARGUMENTS
       ▼
  src/*  ── pure. no fs, no http, no clock, no randomness
       │
       ▼
  Finding[]  ── consumer decides what to do with severity

  bin/cli.ts ── the ONLY I/O boundary: reads a file, reads config,
                writes stdout/stderr, sets an exit code
```

One I/O boundary, in one file, is what makes this model short.

---

## 5. If something goes wrong

**A malicious version was published:**
1. `npm deprecate` the affected versions with a message pointing at the advisory
2. Publish a clean patch immediately
3. Revoke the automation token, rotate it, re-check the provenance settings
4. Open a GitHub advisory
5. `npm unpublish` only within the 72-hour window, and only if nothing depends on it

**An escaping bug shipped:**
1. Add the exact text as a fixture **before** fixing the bug
2. Fix, release a patch, and note in the release that consumers should re-run
   `--escape` on anything queued
3. `npm deprecate` the broken versions with a message naming the symptom, so anyone
   searching "my post truncated" finds it

See [disaster-recovery.md](./disaster-recovery.md) for the full playbooks.
