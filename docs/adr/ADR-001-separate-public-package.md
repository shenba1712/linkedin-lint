# ADR-001: The linter is a separate public package

## Status

🟢 Accepted (2026-08-06). Mirrors ADR-008 in the Cadence repo, from the other side.

## Context

This code was written for [Cadence](https://github.com/shenba1712/cadence), a
self-hosted LinkedIn content pipeline. The question was whether any of it should be
public.

**Amended 2026-08-11.** The original text said "Cadence itself should not be
[public]". That was superseded the same week: Cadence is public and self-hostable
under Apache-2.0. What it is not is a *business* — the 60-day token wall with no
programmatic refresh, a consolidated competitor set, and a voice model that cannot
transfer to a new user all point that way. Those are different claims, and
conflating them was the error.

So the question this ADR answers is narrower than it first appeared: not "should
any of it be public" but "should the linter be a **separate package**".

It should, because the linter is different in kind from the app:

- No OAuth, no tokens, no expiry, no per-user state, no multi-tenancy
- No network and no filesystem in the core. Pure functions
- Zero marginal cost to run
- It solves a problem that visibly bites, and the proof is a real published post that
  would have been truncated to two words

It is also the only part that works as a portfolio artifact, and a portfolio artifact
needs readable source. Publishing a package from a private repo gives people something
to install but nothing to read.

The counter-argument is real: two repos means two CI pipelines, two release processes,
and a version pin to manage. A monorepo would let a linter change be felt immediately.

## Decision

**A separate public repository, MIT licensed, published to npm.**

- No content, no unpublished text, no credentials. **Fixtures use already-published
  posts only.**
- Cadence depends on the published package, **pinned to an exact version, no `^`**.
- Local development uses `npm link`, which recovers most of the monorepo convenience.
- The escaping fixtures run in **both** repositories' CI. The duplication is deliberate:
  this repo is where a bug would be introduced, Cadence is where the damage would land.
- This repo gets a full doc set — PRD, TRD, rules reference, threat model, test plan,
  release playbook, ADRs, tickets. A public package other people install deserves the
  same rigour as the private app, and arguably more, because the failures land on
  strangers.

## Consequences

- **Phase 0 delivers something usable before a LinkedIn app exists.** No OAuth, no
  database, no cron. Immediately useful on posts written by hand, which is how the
  author works today.
- **The threat model changes shape.** ReDoS inside someone else's CI, npm account
  compromise, and a bad release reaching other people's lockfiles are now real concerns
  that did not exist for a private tool. They drive the zero-dependency rule, the
  provenance requirement, and the timing assertions on every pattern.
- **Rule ids become public API.** People will suppress by id, so renaming one is a
  breaking change. That constraint did not exist internally.
- **Versioning has to be strict.** A change to escaping behaviour is never a patch,
  because a consumer taking a patch has not agreed to a content-integrity change.
- **One open item gates publishing, not building.** The employment contract's IP clause
  needs reading before anything goes public under the author's name
  ([compliance-matrix.md](../compliance-matrix.md) §7). All of Phase 0 can be written
  and tested privately while that is resolved.
