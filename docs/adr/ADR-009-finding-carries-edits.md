# ADR-009: A Finding carries applicable edits and a safe diagnostic

## Status

🟢 Accepted (2026-08-11). Breaking change to `Finding`, made **before** the first publish.
Extends [ADR-008](./ADR-008-webapp-hosting-and-telemetry.md) §4.

## Context

ESLint has three tiers. This package had one and a half.

| ESLint | Here, before this ADR |
| --- | --- |
| `fix` — deterministic, safe, applied by `--fix` | ✅ `fixable?: boolean`, escaping only |
| `suggestions` — concrete candidate edits, offered, never auto-applied | ❌ **missing** |
| Message describing the problem | ✅ `message`, plus a prose `suggestion?: string` |

The missing tier is the one the editor needs. `suggestion?: string` holds prose — *"put the
signature on its own line with blank lines around it"* — which is an instruction to a human.
No interface can apply it. Click-to-change needs a range and a replacement.

Separately, [ADR-008](./ADR-008-webapp-hosting-and-telemetry.md) §4 needs each surface to
build a telemetry payload without touching the user's text. If the webapp, the CLI and an MCP
server each assemble their own, one of them eventually includes content by accident.

And `fixable: boolean` sits next to the fix it describes without being derived from it, so
the two can disagree.

## Decision

### 1. `fix` replaces `fixable`, and `suggestions` is added

```ts
interface Edit {
  readonly start: number;        // zero-based, over the ORIGINAL text
  readonly end: number;
  readonly replacement: string;
}

interface Suggestion extends Edit {
  readonly label: string;        // "Remove the bold formatting"
}

interface Finding {
  readonly id: string;
  readonly severity: Severity;
  readonly message: string;
  readonly start?: number;
  readonly end?: number;
  readonly advice?: string;                          // prose. was `suggestion`
  readonly fix?: Edit;                               // auto-applicable. escape/* only
  readonly suggestions?: readonly Suggestion[];      // offered, never auto-applied
  readonly diagnostic?: Diagnostic;                  // §3
}
```

`fixable` is **removed**: `fix !== undefined` is the test, and a derived answer cannot
contradict itself. The prose field becomes `advice` so it cannot be mistaken for the
structured `suggestions`.

**`--fix` applies `fix` only, never `suggestions`.** That preserves the existing decision —
only `escape/*` is mechanically fixable, and anything requiring judgement stays with the
author ([core/backlog.md](../core/backlog.md), "Cut").

### 2. What can produce a computable suggestion

The boundary follows ADR-008 §9: **the package proposes edits it can compute. Anything
requiring knowledge of what the author meant needs a model, which is out of scope
([prd](../prd.md) §5.2).**

| Rule | Suggestion | Source |
| --- | --- | --- |
| `escape/*` | Escape it | Deterministic → stays a **`fix`** |
| `bold/code-identifier` | Replace the span with plain ASCII | **NFKC** — verified to produce exactly `Pick<T, K>` from all three variants |
| `style/flagged-word` | 2–3 alternatives per high-signal term | A shipped table. Not a model — the same file as the word list |
| `style/em-dash` | Comma, full stop, or colon | Small candidate set |
| `counts/too-many-hashtags` | Named tags with per-tag reasons (see §5) | Computed from the text plus a shipped generic-tag list |
| `tells/*` | **None.** "Vary your sentence length" is advice, not an edit | Stays `advice`, with a shipped example (§4) |
| `fold/*` | None — showing *where* it cuts beats any suggestion | |
| `similarity/*` | None | |

### 3. `diagnostic` is numbers only

```ts
type Diagnostic = Readonly<Record<string, number | readonly number[]>>;
```

Structural facts about why a rule fired, shaped to be safe to transmit:

```jsonc
{ "id": "tells/flat-rhythm",
  "diagnostic": { "sentenceLengths": [14,15,13,15,14], "stdDev": 0.8, "percentile": 12 } }

{ "id": "style/flagged-word",
  "diagnostic": { "termIndex": 47, "tier": 1, "count": 3, "per1k": 7 } }

{ "id": "tells/rhetorical-close",
  "diagnostic": { "patternIndex": 3, "sentenceOrdinal": 14 } }
```

**The type admits no strings, so content cannot appear in it structurally.** That decides
"what is safe to send" once, in one reviewed place, instead of three times in three surfaces.

**The invariant, asserted as a test:** no value in any `diagnostic` may be a substring of the
input text. The numbers-only type makes it true by construction; the test catches anyone
widening the type later.

### 4. Tell findings carry a shipped example

Not the user's text, and not generated — a canned illustration in the rule's message:

> Sentence lengths: 14, 15, 13, 15, 14 — variance 0.8
> Written prose usually varies more. For example: 4, 19, 8, 22, 6.

Free, needs no server and no model, and it is the Hemingway model exactly: never rewrite the
sentence, show the pattern and let the author learn it. **For a non-native English speaker a
concrete before/after generalises better than personalised output**, which is the case that
motivated it.

Generated suggestions on the author's own sentence would need a model on the server, a
per-request bill, and would break [prd](../prd.md) §5.2. Worth noting it would break the
*product scope*, not the architecture — the npm package would stay pure either way. That is a
separate decision with a bill attached, not taken here.

### 5. `counts/too-many-hashtags` names the tags and says why

"Drop the last N" is arbitrary. Four computable signals, applied to `cancun.md`'s ten tags:

```
#TravelHistory    token "travel" already used in #TravelTrivia
#Tourism          term does not appear in the post
#Innovation       generic engagement tag; term does not appear in the post
#TechMeetsTravel  token "travel" already used; term does not appear
#ViralTrivia      token "trivia" already used; generic tag; term does not appear
```

- **Token overlap** — split CamelCase, flag repeated tokens
- **Generic engagement tag** — a shipped list, so telemetry sends `tagIndex`, not the tag
- **Term absent from the post** — the weakest signal, and documented as a hint rather than a
  reason: hashtags exist for discovery *beyond* the text
- **Not CamelCase** — `#traveltrivia` runs together in a screen reader. Promoted to its own
  rule, `style/hashtag-not-camelcase`, because it is an accessibility finding and belongs
  beside `bold/code-identifier` rather than inside a count

Ranking is reason-count; drop from the bottom until the limit is met.

### 6. Overlapping edits

General policy, ESLint's: sort by start offset, apply greedily, **skip any edit overlapping
one already applied**, re-lint, repeat up to a small pass cap. A fix changes offsets and can
create or remove other findings.

Two simplifications hold today:

- **`--fix` cannot produce an overlap.** Every `escape/*` fix inserts one `\` before one
  reserved character at that character's index; two cannot target the same position, and a
  backslash already followed by a reserved character produces no finding. **Reasoned, not
  proven** — a test asserting no two fixes overlap across every fixture is required, because
  this silently stops being true the moment a second rule becomes fixable.
- **The editor applies one suggestion at a time and re-lints.** User-initiated, so there is
  no batch to resolve.

The multi-pass loop is therefore not built. **Recorded here as the reason**, so that adding a
fixable style rule is understood to require it.

## Consequences

- **A breaking change to public API, taken before publish.** Free today, a major version from
  `#42` onward. This is the second such change after the `prohibitions/*` → `style/*` rename,
  which argues for a **deliberate API pass before the first publish** rather than discovering
  a third one after.
- **`#02` (`types.ts`) grows**, and `#08` must emit `fix` rather than set `fixable`.
- **The editor becomes buildable.** Structured suggestions are what make click-to-change
  possible; prose never could.
- **Every surface gets the same safe payload**, and `--json` carries `diagnostic` too, so a
  CI consumer sees the same structure as the webapp.
- **`Suggestion` offsets are over the original text**, consistent with every other offset in
  the package, so an editor highlights what the user typed.
- **A shipped alternatives table is new data to maintain**, and it dates the way the word
  list does. It is data, not a dependency.
