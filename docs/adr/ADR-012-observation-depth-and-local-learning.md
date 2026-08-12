# ADR-012: Observation depth, and what the tool may learn

## Status

🟢 Accepted (2026-08-11). **Supersedes [ADR-008](./ADR-008-webapp-hosting-and-telemetry.md)
§4 and §6** — the flat payload allowlist and the sentence-sharing rules are replaced by the
ladder below. Everything else in ADR-008 stands.

## Context

ADR-008 settled *whether* anything is observed. It answered with a flat allowlist: these
fields yes, these fields never. Two things then became clear.

**The allowlist was leaving signal on the table.** It sent rule ids, counters and a numeric
diagnostic — enough to learn that a rule is badly calibrated, not enough to learn *why*. The
single most useful thing about an accepted-but-edited suggestion is how far the user's
replacement was from ours, and that is a number nobody was collecting.

**"Send more" and "send content" are different axes**, and the allowlist conflated them.
There is a large tier of information that is *derived from* text without *being* text, and it
was sitting unused between "counters" and "the sentence".

Meanwhile the local store was being treated as if it had the same constraints as the network.
It does not. Data that never leaves the machine has a different risk profile from data that
does, and the design was spending the same caution on both.

The maintainer's direction: **get as much to the product as possible, at varying depths.**
With one constraint, stated plainly: *the tool shouldn't lose its purpose in the name of
personalization.*

## Decision

### 1. Observation is a ladder, and local always sits deeper than the server

| Depth | Payload | Local | Server |
| --- | --- | --- | --- |
| **0** Counts | `ruleId`, `fired` / `dismissed` / `accepted` | always | opt-in once |
| **1** Structure | numeric `diagnostic` — indices, lengths, ordinals | always | same opt-in |
| **2** Derived | numbers computed *from* text, never text (§2) | always | same opt-in |
| **3** Fragments | the matched span; the replacement the user typed | yes | separate opt-in, capped |
| **4** Sentences | the triggering sentence; before/after an edit | yes | separate opt-in, 3/session, ledgered |
| **5** Drafts | the whole post, kept across sessions | opt-in, clearable | **never** |

**Depths 0–2 are content-free by type, not by discipline.** `Diagnostic` admits only numbers
under namespaced keys, both compiler-enforced
([ADR-009](./ADR-009-finding-carries-edits.md) §3). Depth is the user's dial, defaulting to
0–2 on and 3–5 off.

### 2. The derived tier — where the signal actually is

All numbers, all new, none of them content:

| Metric | What it tells you |
| --- | --- |
| **Edit distance** between our suggestion and what they wrote | 1 = nearly right, 8 = wrong. The best single signal for improving a suggestion |
| **Rank chosen** | They picked the third of three alternatives — the ranking is wrong |
| **Time to action** | Dismissed in 0.4s is reflex; 20s was a real judgement call. Different findings |
| **Reverted later** | Accepted, then changed back. It looked right and wasn't |
| **Session converged** | Zero findings at the end, or did they give up with eight open |
| **Length delta** | Their replacement versus ours |

### 3. Two payload types, never one type with a depth field

```
DiagnosticEvent   numbers only, compiler-enforced   depth 0–2
SharedFragment    text, capped, ledgered            depth 3–4
```

A single type with an optional `sentence?: string` is a field somebody eventually populates
by accident, and the numbers-only guarantee dies quietly. Separate types, separate consent
gates, separate transport calls, so the mistake is structurally hard rather than discouraged.

### 4. What the tool may learn locally

Local observation feeds local adaptation. This is the answer to the problem ADR-008 left
open: with no content reaching the server, **the aggregate product cannot improve, but every
instance can.**

Learnable, and mostly content-free:

- Dismissal rates per rule → *"you have turned this down 9 times in 10 — disable it?"*
- Chosen-alternative ranks → reorder the suggestions you actually take
- `patternIndex` rejections → drop the one rhetorical-close pattern you keep refusing
- Every linted post → a sample, so the personal baseline sharpens with use
- Your own replacement when it is not in the shipped table → a learned alternative

That last one is the fairness mechanism made automatic. ADR-007 §7 made the personal baseline
the appeal route for a writer the generic baseline misjudges — a formal or second-language
writer. Until now they had to know to build one. Local learning notices it is being overruled
and adjusts.

### 5. The floor — where personalization stops

**`escape/*` is exempt from all of it.** No learning, no adaptation, no depth-dependent
behaviour. It is a correctness guarantee, not a preference.

**Learning may affect `warn` and `info` only. Never `error`.** Errors are identical for every
user of a version, forever, so the publishing gate cannot be learned away and
*"the linter said X"* stays reproducible.

**Adaptation is never silent.** It proposes, the user confirms. A rule that goes quiet without
saying so is indistinguishable from a rule that broke.

### 6. Four guards against learning the tool into uselessness

The stated risk — *the tool shouldn't lose its purpose in the name of personalization* —
needs mechanisms, not intent.

1. **A muted linter must not look like a clean post.** Output must distinguish silence by
   choice from silence by cleanliness: `4 rules muted for you` alongside the verdict. "Safe to
   publish" with everything muted is true and misleading.
2. **Learning is resettable and inspectable.** A user who over-dismissed in their first
   session must be able to see what was learned and undo it.
3. **The negatives suite runs against shipped defaults, never a learned profile.** Otherwise
   `#28` tests a muted linter and calls it calibrated.
4. **A profile is preferences, never calibration.** Exporting one shares settings, not
   thresholds anyone else is judged against — or ADR-007 §9 is defeated through the
   personalization door.

**The dismissal-driven risk is real and worth naming**: the tool learns what a user *ignores*,
not what is *right*. Someone who ignores good advice gets a tool that stops giving it. Hemingway
never adapts, and that is plausibly why it stays useful. Guards 1 and 2 are what keep that
visible rather than silent.

### 7. Scope now versus later

**Now, in `#57`:** depths 0–2, and the cheap local loop — count dismissals, and when a rule
crosses a threshold, ask once. That is roughly twenty lines on top of machinery `#57` already
builds, and it captures most of the value.

**Deferred, recorded as not-yet-taken:** learned alternatives, per-sentence memory, adaptive
thresholds. That is a personalization engine, and it is what would justify moving from
`localStorage` to IndexedDB.

### 8. Storage

`localStorage`, measured rather than assumed: a realistic ten-post profile is **7.4 KB**, and
the entire 256-article archive is **161 KB** — about 3% of a typical ~5 MB quota. The samples
carry no text, which is why they are small.

IndexedDB's advantages do not apply at that size: capacity is irrelevant, writes are per-change
rather than per-keystroke, and its structured-clone benefit is cancelled by the profile having
to serialise to JSON anyway for `--profile`, MCP and Cadence.

**Neither store is durable** — Safari's ITP evicts script-writable storage after about a week
without interaction, and "clear site data" takes both. So the durability story is
**export-to-file**, and the in-browser store is a cache. Which makes the choice a cache-format
question, and for a 7 KB JSON blob `localStorage` is the smaller correct answer.

**Switch to IndexedDB when** a profile exceeds ~1 MB (≈1,500 posts), or multiple profiles are
stored per origin, or **anything text-bearing is persisted** — which depth 3–5 and the deferred
learning both do.

### 9. The ledger stores what was shared, not the sentences

ADR-008 §6 required a visible, clearable ledger and never said whether it survives the session.
It does — but it records **what** left the machine, not the text that left: rule id, timestamp,
depth, a stable id. The trust property (*"here is everything that ever left"*) survives without
the browser accumulating drafts.

## Consequences

- **The server learns considerably more than ADR-008 allowed, and still receives no content.**
  The derived tier is the gain, and it costs one new set of numeric diagnostic keys.
- **`DiagnosticEvent` and `SharedFragment` are both public API**, versioned like everything
  else. Two types is more surface than one, deliberately.
- **Depth is a user-facing setting**, so the privacy claim becomes "here is the dial, here is
  what each notch sends" rather than a single sentence.
- **Local adaptation makes two users of the same version behave differently** on `warn` and
  `info`. Accepted, bounded by §5, and the reason `error` is excluded.
- **Guard 3 is a testing constraint that is easy to forget and expensive to discover**: a
  maintainer running `#28` against their own learned install would get a false green.
- **`#57` grows.** The depth dial, two payload types, the ledger and the local loop are more
  than the original ticket described.
