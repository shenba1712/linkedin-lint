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
- No **personal** baseline, no archive, no style guide is committed here. Those are
  caller-supplied data, which is one of the reasons the core takes them as arguments.
- No configuration containing the author's personal word list ships in the package.
  Defaults are deliberately generic.

**Sharpened by [ADR-007](./adr/ADR-007-flagged-not-banned-measured-baselines.md).** One
baseline now *does* ship — the distribution measured from **generated** text — and the
distinction is the point of the decision, so it must not blur:

| Ships | Never ships |
| --- | --- |
| The generated-text distribution, with a measurement date | Any distribution computed from the author's own writing |
| Generic flagged-word tiers | The author's personal word list |

The shipped baseline describes generated posts. It describes no human's writing, which is
what makes it safe to ship and is also why *"you shouldn't use my writing to gauge anyone
else's"* is satisfied by construction rather than by policy. A future change that computes
the shipped baseline from human text — the author's or anyone's — reopens T6 and is a
decision, not a refactor.

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

### T9 — A tell finding used against a writer

The mirror of T8, and the one with a named victim. A `tells/*` finding says something about
*text*. Quoted at someone — by a manager, an editor, a reviewer — it becomes a claim about a
*person*, and the people it misjudges are disproportionately those writing formal or
second-language English, whose prose shares nearly every feature with generated text.
Published work on AI detectors found they flagged a large share of TOEFL essays by non-native
writers while flagging almost none by US-born students.

Unlike T1 and T2, no attacker is required. The harm arrives through the tool working exactly
as designed and being read as more than it is.

- **Message wording is the primary control**, not documentation. A finding states the
  observable — "sentence lengths are 14, 15, 13, 15, 14 words" — never a verdict about
  authorship ([ADR-007](./adr/ADR-007-flagged-not-banned-measured-baselines.md) §6). A
  message that cannot be quoted as an accusation cannot be misused as one.
- **The discriminant test** keeps register out of the feature set: a feature separating
  formal-from-casual as strongly as generated-from-written does not ship
  ([qa-test-plan.md](./qa-test-plan.md) §8a).
- **Everything here is `warn` or `info`, permanently.** No `tells/*` rule may ever become
  `error`, so no consumer can gate publishing on it.
- **No aggregate "AI score"** — see [core/backlog.md](./core/backlog.md), where a score out
  of ten is already cut. A single number is the form most easily quoted at someone.

This is the risk that argues hardest against ever adding a real detector, independent of
whether the zero-dependency rule already makes one impossible.

### T10 — A compromised web service exfiltrating unpublished drafts

Added 2026-08-11 with the move to Render
([ADR-008](./adr/ADR-008-webapp-hosting-and-telemetry.md)).

People paste drafts they have **not decided to publish** — that is the use case, not an edge
case. A modified bundle could ship them anywhere, and **same-origin CSP is no defence when the
origin is the attacker.** Static hosting had the same failure mode with a much smaller surface
to own; a service adds an account, a deploy pipeline and a runtime to compromise.

- **Deploy from the release tag only, never by hand.** The same discipline already applied to
  npm publishing, for the same reason
- The bundle is built by the same CI that publishes the package, from the same commit
- **The server never lints.** It serves files and accepts counters. There is no code path in
  which post text reaches it except sentence sharing, which is opt-in, capped and logged in a
  user-visible ledger
- Sentence-sharing retention is short and deletion is answerable, so a compromise has a small
  window of held content to take

### T11 — Availability

Static hosting does not go down. A service does, and a free tier spins down cold.

The exposure is bounded: the package is unaffected, Cadence is unaffected, and only the demo
is lost. Worth stating because the previous hosting choice made this risk zero, and the
decision to accept it should be visible rather than discovered during an outage.

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
