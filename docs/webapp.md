# linkedin-lint — The webapp

**Status:** v1.0, 2026-08-11. Decisions in
[ADR-008](./adr/ADR-008-webapp-hosting-and-telemetry.md).
Split from [landing-page.md](./landing-page.md), which was specifying two products in one
document: a marketing page, and a tool.

---

## 1. Two routes, two jobs

| Route | Job | Built |
| --- | --- | --- |
| **`/`** | The escaping proof. Paste a post, watch it truncate | Step 3 of the build order — right after 0a and 0f |
| **`/app`** | The editor. All rule groups, live | After 0c and 0d, when there are rules worth an editor |

**The escaping demo stays on `/`.** The journey from "my post got cut" to "here is the escaped
version" must be **zero clicks** — a click in the middle loses someone who arrived angry at
11pm. `/app` is where they go if they want more.

### Why this split matches the audiences

The two halves of this package do not serve the same people.

- **Escaping only matters if you publish through the API.** Type into LinkedIn's own box and
  the reserved-character bug cannot touch you. So it serves a strict subset.
- **Style and tells serve every writer.**

And the asymmetry that decides the page structure: **the small audience has the acute problem
and all the search intent.** Someone whose post published truncated is searching for it right
now. Nobody has ever searched for "is my writing too uniform".

**Escaping is acquisition. The editor is retention.**

It also splits the bundle: `/` carries only the escaper, `/app` carries the whole linter, and
the 60KB budget applies to first load.

---

## 2. Hosting

**Render**, not GitHub Pages. Reversed 2026-08-11 (ADR-008 §1).

The linter still runs **client-side** — that is unchanged and is the whole pitch. What a
server adds is logs and an endpoint that can receive counters.

- **The telemetry endpoint is same-origin.** `default-src 'self'` stays intact, so the CSP
  still proves no third party receives anything.
- Deploy from the release tag only, never by hand — the demo must never run a different
  version than the package.
- The version is printed in the footer.

Accepted costs: a recurring bill, a service that can be down where static hosting cannot, and
a new attack surface (threat-model T10, T11).

---

## 3. The journey that matters

The 11pm searcher, who arrives having just watched half a post disappear:

1. Headline confirms they are not imagining it
2. The demo is **already showing** the truncation, prefilled with the `pick()` post
3. **They paste their own post** and watch their own text die at a specific character
4. They copy the escaped version
5. They leave

**Step 4 is the conversion, not `npm install`.** Someone who pastes, copies and never installs
anything has been completely served. That is a success, not a funnel leak. `npm i` is for the
tool builder, who is a different visitor with a different need.

Two things this requires:

- **Show the dropped text as actually gone** — greyed or struck through, not merely marked
  with a rule. The visceral moment is seeing it vanish.
- **"Your writing never leaves your browser" sits against the textarea**, not in the footer.
  Someone pasting an unpublished draft needs that before they paste.

---

## 4. `/app` — the editor

Hemingway's model: highlight, explain, offer, never rewrite.

- Inline highlighting per finding, with severity in text and not by colour alone
- Click a `suggestion` to apply it. `fix` and `suggestions` come from the library as ranges
  and replacements ([ADR-009](./adr/ADR-009-finding-carries-edits.md)), so the app applies
  rather than composes
- **Apply one, re-lint, re-render.** Offsets move; there is no batch to resolve
- A post-type selector: detected, displayed, overridable. Low confidence defaults to the
  permissive type so a bad guess never causes a false fire
- Profile import and export

### What `/app` may never hold

> **It may store a profile and preferences. It may never store posts.**

The moment it wants history, a queue or scheduling it has become Cadence, and the answer is
"self-host Cadence". That line maps exactly onto `lint(text, options)`: a profile is an
argument, a post history is an application.

---

## 5. The Profile

Where a returning user's baseline lives, and why they are not asked to paste ten posts twice.

- Computed in the browser, kept in `localStorage`, **exportable to a file** so it survives a
  cleared browser, moves between machines, and feeds the CLI's `--baseline`
- **Measured, not assumed:** a realistic ten-post profile is **7.4 KB**; the entire
  256-article archive is **161 KB**, about 3% of a typical ~5 MB quota. Small because samples
  carry no text
- **`localStorage`, not IndexedDB** — capacity is irrelevant at that size, writes are
  per-change not per-keystroke, and structured-clone buys nothing when the profile has to
  serialise to JSON anyway for `--profile`, MCP and Cadence. **Neither store is durable**
  (Safari evicts script-writable storage after ~a week idle), so export-to-file is the
  durability story and this is a cache-format choice. Switch to IndexedDB at ~1 MB, multiple
  profiles, or **anything text-bearing** — which depths 3–5 are (ADR-012 §8)
- **Prompt to export after the first profile is built.** A user who never exports loses it
  silently to browser eviction and blames the tool
- **Samples are `{ date, register, weight, featureVector }`** — no id, no title, no text. A
  post cannot be reconstructed from one
- Feature vectors rather than percentiles, so an eleventh post can be added and a new
  statistic in v1.2 does not force a re-paste

**A profile is not fully anonymous.** Sentence-length distributions are a weak fingerprint —
not prose, not nothing. Said plainly wherever export is offered.

---

## 6. Observation and learning

Full rationale in [ADR-012](./adr/ADR-012-observation-depth-and-local-learning.md), which
supersedes ADR-008 §4 and §6. **Local always sits deeper than the server.**

| Depth | Payload | Local | Server |
| --- | --- | --- | --- |
| **0** Counts | `ruleId`, `fired`/`dismissed`/`accepted` | always | opt-in once |
| **1** Structure | numeric `diagnostic` | always | same opt-in |
| **2** Derived | numbers computed *from* text, never text | always | same opt-in |
| **3** Fragments | matched span, the replacement typed | yes | separate opt-in, capped |
| **4** Sentences | the triggering sentence, before/after | yes | separate opt-in, 3/session |
| **5** Drafts | the whole post, across sessions | opt-in, clearable | **never** |

Depth is a user-facing dial, defaulting to **0–2 on, 3–5 off**. Depths 0–2 are content-free
**by type** — `Diagnostic` admits only numbers under namespaced keys, both compiler-enforced.

**Two payload types, never one with a depth field:** `DiagnosticEvent` (numbers) and
`SharedFragment` (text, capped, ledgered). A single type with an optional `sentence?: string`
is a field somebody eventually populates by accident.

**Prefer an index into something already shipped.** `flaggedWord.termIndex: 47` tells you
`delve` fired because you shipped the list. Every curated-list rule works this way.

### The derived tier is where the signal is

Edit distance between our suggestion and what they wrote; which rank they chose; time to
action; whether they reverted it later; whether the session converged. All numbers, all new,
none of them content.

### Sentence sharing — separate opt-in, depth 3–4

- Opt-in once, worded for the purpose. Never a vague analytics toggle
- **At most three sentences per session**, so a post cannot be reassembled
- Sentence granularity only. Spread first / middle / last, deterministically
- **On acceptance, send the sentence only when the edit diverges from the suggestion**
- **Escalation, not default:** a rule asks only once its dismissal rate crosses a threshold
- **A visible ledger**, viewable and clearable — and it records **what** was shared, not the
  sentences. The trust property survives without the browser accumulating drafts

### Local learning, and where it stops

Depth 0–2 locally feeds adaptation: dismissal rates propose disabling a rule, chosen ranks
reorder suggestions, rejected `patternIndex` values drop a pattern. Every linted post adds a
sample, so the personal baseline sharpens with use — which makes ADR-007 §7's fairness appeal
automatic instead of a chore.

**The floor, because the tool must not lose its purpose to personalization:**

- **`escape/*` is exempt from all of it.** A correctness guarantee, not a preference
- **Learning affects `warn` and `info` only. Never `error`** — the publishing gate cannot be
  learned away, and `lint()` stays reproducible across users of a version
- **Adaptation is never silent.** It proposes, the user confirms
- **A muted linter must not look like a clean post** — `4 rules muted for you` alongside the
  verdict, so silence by choice is distinguishable from silence by cleanliness
- **Learning is resettable and inspectable**
- **A profile is preferences, never calibration.** Exporting one shares settings, not
  thresholds anyone else is judged against

### Published aggregates

Rule-fire and dismissal rates go on the site. It is the outside check the project otherwise
lacks — the negative-fixture suite is bounded by one person's corpus, and a public dismissal
rate makes a badly calibrated rule visible to everyone.

---

## 7. Obligations

- A **privacy notice**. Mandatory, and separate from T&C
- **Opt-in consent** for counters, and again for sentence sharing. The `localStorage` profile
  is arguably strictly necessary; telemetry is not
- **Short log retention**, IPs truncated where Render allows — server access logs capture
  them regardless, and that is personal data
- **Deletion and data-subject handling** once sentences are held

See [compliance-matrix.md](./compliance-matrix.md) §6.

---

## 8. Requirements

| Requirement | Target |
| --- | --- |
| First-load JS on `/` | Escaper only — well under **60KB gzipped** |
| First-load JS on `/app` | Full linter, under **60KB gzipped** |
| Demo recompute | < 16ms, debounced 120ms |
| Lighthouse, all four | ≥ 95 |
| CSP | `default-src 'self'`. Telemetry same-origin, so no external host |
| Accessibility | WCAG AA. Severity in text, never colour alone. Real ARIA tabs, `aria-live` results |
| Version | Matches the published npm version, printed in the footer |

---

## 9. Not doing

- **No account.** No user id anywhere
- **No score out of ten.** Cut in [core/backlog.md](./core/backlog.md), and threat-model T9
  makes it worse — a single number is the most quotable, most misusable output possible
- **No generated rewrites.** That needs a model, a bill and a different product scope
  ([prd.md](./prd.md) §5.2). It would break the product scope, not the architecture — a
  separate decision, not taken
- **No post storage, no queue, no scheduling.** That is Cadence
