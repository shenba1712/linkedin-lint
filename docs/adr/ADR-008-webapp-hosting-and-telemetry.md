# ADR-008: The webapp — hosting, telemetry, and the Profile layer

## Status

🟢 Accepted (2026-08-11). Supersedes the GitHub Pages decision in
[landing-page.md](../landing-page.md) §2. Extends
[ADR-005](./ADR-005-zero-dependencies-pure-core.md) with a third layer; does not weaken it.

## Context

Four questions arrived together and turned out to be one decision.

**1. How does the product improve with no telemetry?** The honest answer was: it doesn't,
much. Bug reports are a trickle — people leave quietly — and a "report this" button reaches
1–2% at best. Neither is a feedback loop. What remains is the maintainer's own daily use
through Cadence, which is high-fidelity and bounded by one person, the same limitation the
corpus already has.

The earlier argument against counters — *"a few hundred users' dismissal rates are noise"* —
was wrong, and worth recording as wrong. It applied a statistical test to a non-statistical
question. You are not estimating a parameter; you are looking for **a rule that fires
constantly and is always dismissed**, which is visible at n=20.

**2. Where does a returning user's baseline live?** "Store the percentiles, discard the
text" fails: you cannot add an eleventh post to a percentile, and a new statistic in v1.2
makes the stored value incomplete. Either answer forces a re-paste, which is the thing it
was supposed to avoid.

**3. Where is the line with Cadence?** `lint(text, options)` says *what* the boundary is but
not *why*, and it pushes identical work — where does the baseline live, how is it updated,
how is config merged — onto every surface. Webapp, CLI, MCP and Cadence would each invent a
format, and the formats would drift.

**4. Can analytics carry content safely?** A snippet per finding means a post with eight
findings sends most of itself. And people paste **unpublished drafts** — that is the whole
use case.

## Decision

### 1. Render, not GitHub Pages

Static assets are still served to the browser and **the linter still runs client-side** —
that is unchanged and remains the pitch. What a server adds is logs, and an endpoint that
can receive counters.

Costs accepted: a recurring bill, a service that can be down where static hosting cannot,
and a new attack surface (T10 below).

### 2. The telemetry endpoint is same-origin

`default-src 'self'` **stays intact**. No external host is contacted, so the CSP still
proves no third party receives anything — a stronger position than most static sites, which
load a font or a script from a CDN.

### 3. The claim is reworded, and it gets more specific rather than weaker

| Old | New |
| --- | --- |
| "Nothing leaves your browser" | "**Your writing never leaves your browser.**" Verifiable in devtools in ten seconds |

With sentence sharing enabled (§6) it becomes conditional and says so: *"off by default;
when on, here is exactly what is sent, and you can see and delete every one."*

### 4. The payload is an allowlist, not a promise

> **Superseded 2026-08-11 by [ADR-012](./ADR-012-observation-depth-and-local-learning.md).**
> The flat allowlist below became a **depth ladder**, and the local store was freed from the
> network's constraints. The rules here still hold for what the server receives at depths 0–2;
> what changed is that there is more of it, and that local sits deeper. §6 is superseded the
> same way.

| Sent | Never sent |
| --- | --- |
| Rule id | **The matched word** — that is one word of their text |
| Action: `fired` / `dismissed` / `accepted` | Character offsets — they leak structure |
| Numeric `diagnostic` ([ADR-009](./ADR-009-finding-carries-edits.md)) | Any hash or digest of the text |
| Post type, if set | Referrer, or anything derived from the paste |
| Coarse length bucket, session id | A user id. There are no accounts |

**Prefer an index into something already shipped over any description of the user's text.**
`style/flagged-word` sends `termIndex: 47`; you look up entry 47 in your own list and get
`delve`. You learn which word without receiving any writing. The same applies to every
curated-list rule — flagged words, rhetorical-close patterns, self-label patterns, generic
hashtags.

That covers more of the rule set than expected. **`tells/rhetorical-close` is a pattern list,
not a semantic test** ([trd](../trd.md) §8.1), so `patternIndex` tells you exactly which
pattern over-fires — a more precise diagnosis than a sentence would give, because it names
the pattern instead of requiring you to infer it.

### 5. Structural features are not a substitute for text, and must be measured first

An earlier draft proposed distinguishing rhetorical from genuine closing questions with
`{ startsWithAuxiliary, wordCount, hasConcreteNoun }`. **Disproved against
`test/fixtures/linkedin/cancun.md`**, whose genuine invitation *"Have you ever heard a story
like this…"* scores `startsWithAuxiliary: 1` and would be misread. Those features are thin
proxies for a semantic property and do not carry it.

Recorded because the failure mode is the one this project has a table about: a discriminator
proposed without measuring its distribution. **A proposed feature ships with the test that
would falsify it, or it is a guess.**

### 6. Sentence sharing: opt-in, capped, visible

Counters cannot answer *"is the tool doing its job?"* A dismissal means the rule was wrong.
An acceptance means the user clicked something — not that the post improved. Only text
answers that, so a bounded amount of text moves:

- **Opt-in once**, worded for the purpose — *"send the sentences that trigger findings, and
  the edits you make to them"* — never a vague analytics toggle
- **Hard cap of three per session**, so a post cannot be reassembled however many findings
  fire
- **Sentence granularity only.** Never a paragraph, never the post
- **Spread deterministically** — first, middle, last — so it does not bias to openers
- **A visible ledger**: "3 sentences shared this session", viewable and deletable. This is
  what makes the opt-in real rather than a checkbox someone forgot
- **On acceptance, send the sentence only when the user's edit diverges from the
  suggestion.** A verbatim acceptance is `accepted: true` plus an index — no text. The
  divergent cases are both the smaller set and the more informative one

**Escalation, not default.** A rule only starts asking for its sentence once its dismissal
rate crosses a threshold over a minimum sample. The cheap signal decides when to spend the
expensive one, and nobody is asked for text until the numbers say something is broken.

Note what telemetry structurally cannot see: **false negatives.** Nobody dismisses a finding
that never fired. Missing patterns are found by reading posts — the corpus and `#50` — not
by the network.

### 7. Published aggregates

Rule-fire and dismissal rates go **on the site**. Three reasons, in order of importance:

1. **It is an outside check the project otherwise lacks.** The negative-fixture suite is
   bounded by one person's corpus. A public dismissal rate means a badly calibrated rule is
   visible to everyone, including the maintainer.
2. It is the proof of §4. "We collect rule ids and counters" is a promise; publishing
   exactly what you hold is a demonstration.
3. It is data nobody else has — real numbers on which supposed "AI tells" actually fire.

### 8. The Profile layer

The missing third layer. `src/` was described as pure core plus `bin/cli.ts` for I/O, which
left every surface to invent its own state handling.

| Layer | Holds | Pure |
| --- | --- | --- |
| **Core** | `lint`, `escapeCommentary`, `computeStats` — text in, findings out | yes |
| **Profile** | baseline, preferences, `doNotNormalise`, rule overrides, samples | **yes** |
| **Adapters** | a file, `localStorage`, an MCP resource, a Cadence row | no — that is their job |

State does not require I/O when it is passed in and returned out:

```ts
createProfile()                    → Profile
addSample(profile, stats, meta)    → Profile
baselineFrom(profile)              → Baseline
mergeProfiles(a, b)                → Profile
migrateProfile(old)                → Profile
```

No `fs`, no clock, no randomness — dates arrive as arguments. ADR-005 is untouched and
`lint(text, options)` is unchanged; the package now ships the code to *manage* the argument
instead of leaving three surfaces to reinvent it.

**A sample is `{ date, register, weight, featureVector }` — no id, no title, no text.** A
post cannot be reconstructed from it. That shape is the firewall that stops
profile → preferences → history → queue, and unlike a policy sentence it can be asserted in
a test.

One serialization format, one JSON file, the same bytes everywhere: `--profile` for the CLI,
`localStorage` plus export/import for the web, a resource for MCP, a column for Cadence.
That also retires "paste your ten posts again" — the profile is portable between machines
*and* between surfaces.

**These pieces already existed, unnamed:** `#14a`'s `BaselineInput` with `publishedAt` /
`register` / `weight`, `#14b`'s marker parser, `doNotNormalise` and `rules` in `LintOptions`,
and the CLI's `--baseline`. Four unrelated-looking tickets, one artifact.

### 9. The Cadence line, restated

> **linkedin-lint knows about your writing. Cadence knows about your posts.**

A profile describes how you write: portable, small, no identity. A post history describes
what you published and when: a database, a queue, OAuth, a clock. Yes, this merges the two
at one level — the merge *is* the Profile, and everything past it stays Cadence.

### 10. Two routes

- **`/`** — landing page with the escaping demo inline. Journey from "my post got cut" to
  "here is the escaped version" in **zero clicks**. A click in the middle of that loses
  people who arrived angry.
- **`/app`** — the editor. All rule groups, post-type selector, profile import, no marketing
  furniture. Bookmarkable.

Small proof surface for acquisition, large tool for retention — matching the fact that the
escaping audience is a strict subset (API publishers only) but holds all the search intent,
while the style audience is everyone and searches for nothing.

It also **splits the bundle**: `/` needs only the escaper, `/app` carries the whole linter,
and the 60KB budget applies to first load. At build step 3, only `/` exists.

### 11. What this obliges

- A **privacy notice** — mandatory, and separate from T&C, which is a contract and does not
  discharge it
- **Opt-in consent** for counters and again for sentence sharing. The `localStorage` profile
  is arguably strictly necessary (the user asked for that feature); telemetry is not
- **Short, deliberate log retention**, with IPs truncated where Render allows. Server access
  logs capture IPs whether or not you want them, and that is personal data
- **Deletion and data-subject handling** once sentences are held
- [compliance-matrix.md](../compliance-matrix.md) §6 currently reads *"Does it collect
  anything? No. Ever."* — that section is rewritten, not amended

## Consequences

- **The npm package stays zero-dependency, pure and network-free.** Telemetry lives in the
  webapp layer only. The linter cannot emit events; the app records what it decided to show.
  Slightly more awkward, and non-negotiable — otherwise ADR-005 and threat-model T4 are both
  dead.
- **A new threat, T10:** a compromised web service can exfiltrate unpublished drafts, and
  same-origin CSP is no defence when the origin is the attacker. Mitigations are deploy-from-
  tag only, never by hand, and the provenance discipline already applied to npm.
- **A new threat, T11:** availability. Static hosting does not go down; a service does.
- **The privacy claim is now conditional**, and the ledger is what keeps it defensible.
  Reconstruction moves from *impossible* to *capped and visible*, which is a real downgrade
  taken deliberately.
- **The Profile schema is public API**, versioned under the same semver discipline as rule
  ids. Hence `migrateProfile` in the list rather than assumed.
- **A profile is not fully anonymous.** Sentence-length distributions are a weak fingerprint.
  Not prose, not nothing — said plainly rather than called anonymous.
- **Improvement is deliberate, not continuous.** For a package holding a correctness
  guarantee that is correct: escaping must not drift toward what telemetry suggests.
