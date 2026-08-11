# linkedin-lint — Security Audit

**Status:** v1.0, 2026-08-06.

Short, because the surface is small. But it is a **public package other people
install**, so the few items here matter more than their number suggests.

§2–§4 are the recurring checklists. §5 is the log, which starts empty.

---

## 1. How this is used

| Checklist | When |
| --- | --- |
| Pre-release (§2) | Every release. Non-negotiable |
| Quarterly (§3) | Once a quarter |
| Annual (§4) | Once a year |

Record every run in §5, including clean ones. A log of clean runs is what makes a dirty
one meaningful.

---

## 2. Pre-release

Every item maps to a threat in [threat-model.md](./threat-model.md).

- [ ] Zero runtime dependencies. The `deps` CI job is green (T4)
- [ ] Every new or changed regex has a pathological-input test with a timing assertion
      (T1)
- [ ] No `fs`, `http`, `path`, `Date.now()` or `Math.random()` anywhere under `src/`
      (T5)
- [ ] `lint()` does not throw on any content fixture, including empty string, 100KB,
      lone surrogates, and a trailing backslash (T5)
- [ ] Property tests green: idempotent, and lossless (T3)
- [ ] Every real published post round-trips through escape and unescape (T3)
- [ ] **If escaping behaviour changed, this is a major version** (T3)
- [ ] No fixture contains unpublished text (T6)
- [ ] No personal word list, and **no baseline computed from human writing**, shipped in the
      package defaults. The generated-text distribution is the one baseline that may ship,
      and it carries a measurement date (T6, ADR-007 §3)
- [ ] `npm pack`, install the tarball in a clean directory, run the CLI
- [ ] Publishing from CI only, with provenance enabled (T2)

---

## 3. Quarterly

- [ ] Rotate the npm automation token. Confirm it is still granular and scoped to this
      package alone
- [ ] Confirm 2FA is still required for writes on the npm account
- [ ] `npm audit` on dev dependencies. Any high or critical findings?
- [ ] Review Dependabot PRs. Dev-only, but a compromised dev dependency can still reach
      a published tarball
- [ ] Check the published version list. Is every version one you published?
- [ ] Verify provenance is recorded on the latest release
- [ ] Read the `files` list. Has anything new been added to the repo that would now be
      shipped by accident?
- [ ] Re-run the negative-fixture suite against any newly published posts. New writing
      is new evidence about whether the rules are right

---

## 4. Annual

- [ ] **Re-verify the reserved-character list** against LinkedIn's little-text-format
      documentation. If LinkedIn adds a reserved character, every consumer's posts start
      truncating and this package is the reason they trusted otherwise. **This is the
      item that matters most in this file**
- [ ] Re-verify the post and comment character limits
- [ ] Re-read [threat-model.md](./threat-model.md). Are the accepted risks still
      acceptable?
- [ ] Node version support: is the `engines` floor still sensible?
- [ ] Dev dependency major-version sweep
- [ ] Honest maintenance question: is this still maintained? If not, follow
      [disaster-recovery.md](./disaster-recovery.md) §8 and say so in the README rather
      than leaving it looking alive

---

## 5. Audit log

Newest first. One entry per run, even when clean.

| Date | Checklist | Findings | Actions |
| --- | --- | --- | --- |
| _(nothing yet — Phase 0 has not started)_ | | |

### Entry template

```
### 2026-MM-DD — <checklist>

Findings:
- <what you found, or "none">

Actions:
- <what changed, with a ticket id if it became work>
```

---

## 6. Findings register

Anything found and not yet fixed stays here until closed.

| Id | Found | Severity | Description | Status |
| --- | --- | --- | --- | --- |
| _(empty)_ | | | | |

**A critical finding means do not release.** For this package that specifically means:
if escaping is wrong, nothing else ships until it is right.

---

## 7. Deliberately not audited

- Penetration testing. There is no network surface to test.
- Access reviews. One maintainer, one npm account.
- Licence scanning tooling. Zero runtime dependencies, and dev dependencies are checked
  by hand when added ([compliance-matrix.md](./compliance-matrix.md) §3).
- Secret scanning beyond GitHub's default, which is on. There are no secrets in the
  repo — the npm token lives in Actions secrets.
