# linkedin-lint — Documentation Index

Reading order, and the gate that has to pass before code starts.

---

## 1. Read in this order

| # | Doc | What it settles |
| --- | --- | --- |
| 1 | [adr/ADR-002](./adr/ADR-002-escaping-is-the-core.md) | **The escaping rule and why it is a character loop, not a regex.** Start here — everything else is secondary |
| 2 | [prd.md](./prd.md) | Scope, the severity contract, what is deliberately out |
| 3 | [trd.md](./trd.md) | Algorithms, the pure-core rule, packaging |
| 4 | [rules-reference.md](./rules-reference.md) | Every rule with its id, severity and threshold |
| 5 | [adr/ADR-003](./adr/ADR-003-calibrate-against-corpus.md) | Why three "AI tells" are not flagged |
| 6 | [adr/ADR-007](./adr/ADR-007-flagged-not-banned-measured-baselines.md) | Flagged not banned, where thresholds come from, and what a finding may claim |

Then as needed:

| Doc | When |
| --- | --- |
| [api-specifications.md](./api-specifications.md) | Touching a public export. Everything there is a compatibility contract |
| [cli-design.md](./cli-design.md) | Touching `bin/cli.ts` |
| [qa-test-plan.md](./qa-test-plan.md) | Writing tests. §2 is the escaping suite, §4 is the negative-fixture rule |
| [threat-model.md](./threat-model.md) | ReDoS, npm publishing, supply chain |
| [devops-cicd.md](./devops-cicd.md) | Releasing. §3 is the versioning table |
| [disaster-recovery.md](./disaster-recovery.md) | A bad version reached other people |
| [security-audit.md](./security-audit.md) | The recurring checklists |
| [compliance-matrix.md](./compliance-matrix.md) | Licence, the trademark question, honest claims |
| [landing-page.md](./landing-page.md) | `/` — the escaping proof. The linter runs client-side, which is the whole pitch |
| [webapp.md](./webapp.md) | `/app`, hosting, the Profile, and telemetry. Split from landing-page.md, which was specifying two products |
| [traceability.md](./traceability.md) | **Every risk → doc → ticket → test.** Checked by CI |
| [core/backlog.md](./core/backlog.md) · [core/tickets.md](./core/tickets.md) | What to build next |

---

## 2. Definition of Done

### Phase 0a — Escaping (publishable alone)
- [ ] `escape(escape(s)) === escape(s)` over 10,000+ generated inputs
- [ ] `unescape(escape(s)) === s` over the same, **for input with no `\` before a
      reserved character** — `escape` is idempotent so it is not injective (ADR-002)
- [ ] The non-stability of `escape(unescape(escape(s)))` is pinned by a test, so the
      false universal claim cannot return
- [ ] All table cases E1–E18 pass
- [ ] Every real published post round-trips exactly
- [ ] The `pick()` post is a fixture
- [ ] The synthetic worst-case fixture round-trips
- [ ] `escape/*` findings carry correct offsets **over the original text**
- [ ] `escape/unescaped-paren` is its own rule id
- [ ] `escape/*` cannot be suppressed

### Phase 0b–0e — The rest of the rules
- [ ] Every rule has: a rules-reference entry, a ReDoS timing test, positive fixtures, and
      **negative fixtures from explicitly endorsed posts**
- [ ] **The profiling spike (#50) has run** and every measured feature passed the
      discriminant test on both axes
- [ ] The shipped generated-text baseline carries a measurement date
- [ ] `computeBaseline` verified against hand-computed percentiles
- [ ] With **no caller baseline**, `tells/flat-rhythm` still fires against the measured
      distribution and names which distribution it used
- [ ] **No finding message asserts who wrote the text**
- [ ] `bold/code-identifier` fires on `𝐩𝐢𝐜𝐤()` and **not** on `𝐖𝐡𝐚𝐭 𝐢𝐭 𝐢𝐬:`
- [ ] Both unverified bold claims resolved by manual check, or the rationale corrected
- [ ] **The negatives suite:** all endorsed posts produce zero errors and no findings from
      the three narrowed tell rules

### Phase 0f — Release (built second, right after 0a)
- [ ] `lint()` never throws on content, including empty string, 100KB, lone surrogates,
      trailing backslash
- [ ] Every pattern completes in under 50ms on a 3,000-char pathological input
- [ ] Exit codes: 0 clean, 1 on error, **0 on warnings only**
- [ ] Unknown config key is an error, not a silent ignore
- [ ] Zero runtime dependencies, asserted by a **failing** CI job
- [ ] `npm pack`, install the tarball in a clean dir, run the CLI — in CI and again at release
- [ ] `npm ci`, never `npm install`, in CI
- [ ] README carries the Honest Limits section and **"Not affiliated with LinkedIn"**
- [ ] Published from CI only, with provenance, 2FA on the account, token scoped to this
      package

---

## 3. The pre-build gate

- [ ] **Employment contract IP clause read.** Gates publishing, not building
- [ ] npm account with 2FA and a granular automation token
- [ ] Real published posts collected as fixture files — **published text only**
- [ ] One post published by hand and screenshotted on a phone, to calibrate the fold

---

## 4. Cross-doc invariants

| Invariant | Stated in |
| --- | --- |
| Escaping is idempotent always, and lossless on input with no `\` before a reserved character. **No universal round-trip property exists** | ADR-002, trd §3.3, qa §2.2, CLAUDE.md §2 |
| Only three rule groups produce `error` | prd §6, rules-reference, ADR-004, CLAUDE.md |
| Zero runtime dependencies | ADR-005, trd §12, devops §2, CLAUDE.md |
| The core is pure — no I/O, no clock, no randomness | ADR-005, trd §1, CLAUDE.md |
| Rule ids are public API | api-spec §7, devops §3, CLAUDE.md |
| A change to escaping is never a patch | ADR-002, devops §3, disaster-recovery §2 |
| Three "tells" are narrowed, not banned | ADR-003, prd §7, rules-reference, qa §4.2 |
| Fixtures use published text only | threat-model T6, CLAUDE.md |
| If a rule fires on good published writing, the rule is wrong | ADR-003, qa §4, rules-reference |
| Nothing is banned — findings are observations | ADR-007 §1, rules-reference, README |
| A finding states the observable, never who wrote the text | ADR-007 §6, api-spec §7, compliance C1, CLAUDE.md §8 |
| No author's corpus is used to judge another author | ADR-007 §3, trd §8.0, CLAUDE.md §9 |
| A measured feature ships only if it passes the discriminant test | ADR-007 §7, qa §8a, CLAUDE.md §10 |
| Endorsement is per file and deliberate, never bulk | ADR-007 §8, qa §4, fixtures/README, B5 |
| The **package** is network-free; telemetry lives only in the webapp | ADR-008 §Consequences, compliance §6.1, landing-page §9 |
| No content in any telemetry payload — prefer an index into a shipped list | ADR-008 §4, webapp §6, compliance D7 |
| `diagnostic` is numbers only, so content cannot appear structurally | ADR-009 §3, api-spec §7, devops §3 |
| `--fix` applies `fix` only, never `suggestions` | ADR-009 §1, rules-reference, backlog "Cut" |
| A profile sample carries no id and no text | ADR-008 §8, trd §1.1, webapp §5 |
| Any rule that can be a failing check is one | ADR-011, CLAUDE.md, check-docs.mjs |
| `scripts/` is not the package — tooling is exempt from the language and dependency rules | ADR-010, CLAUDE.md |
