# linkedin-lint — API Specification

**Status:** v1.0, 2026-08-06.

This is a published package, so everything here is a **compatibility contract**.
Breaking any of it needs a major version. See [devops-cicd.md](./devops-cicd.md) §3
for exactly what counts as breaking.

---

## 1. Entry point

```ts
import {
  lint,
  escapeCommentary,
  unescapeCommentary,
  foldPositions,
  hookSurvives,
  computeStats,
  computeBaseline,
  similarity,
  type Finding,
  type Severity,
  type Stats,
  type Baseline,
  type LintOptions,
} from 'linkedin-lint';
```

ESM with a CJS fallback. Node 18+. **Zero runtime dependencies.**

---

## 2. `lint`

```ts
function lint(text: string, options?: LintOptions): readonly Finding[];
```

The main entry point. Runs every enabled rule and returns findings sorted by severity
(errors first), then by start offset.

Never throws on content. Throws only on an invalid options object, which is a
programming error rather than a content problem.

```ts
interface LintOptions {
  readonly platform?: 'linkedin';           // default 'linkedin'
  readonly kind?: 'post' | 'comment';       // default 'post'. Sets the limit
  readonly postType?: PostType;             // enables tells/no-stake
  readonly limits?: { post?: number; comment?: number };
  readonly fold?: { mobile?: number; desktop?: number };
  readonly bold?: { maxSpans?: number; allowOnCodeIdentifiers?: boolean };
  readonly prohibitions?: ProhibitionConfig;
  readonly rules?: Readonly<Record<string, Severity | 'off'>>;
  readonly baseline?: Baseline;             // from computeBaseline
  readonly archive?: readonly string[];     // enables similarity
  readonly doNotNormalise?: readonly string[];
}

type PostType =
  | 'opinion' | 'experiment' | 'got-it-wrong' | 'build-note'
  | 'mechanism' | 'reference' | 'announcement';
```

`postType` is the switch for `tells/no-stake`. The first four require a first-person
claim; the rest do not. **Without `postType`, that rule does not fire** — plenty of
strong technical posts contain no personal claim, so defaulting it on would be wrong.

`rules` overrides severity per id, including `'off'`. **`escape/*` cannot be turned
off**; an attempt is ignored and produces an `info` finding saying so.

---

## 3. `escapeCommentary`

```ts
function escapeCommentary(text: string): string;
function unescapeCommentary(text: string): string;
```

The function that stops posts truncating. Escapes
`( ) [ ] { } < > @ # * _ ~ | \` for LinkedIn's post-body text format.

Two guaranteed properties, both property-tested:

```ts
escapeCommentary(escapeCommentary(s)) === escapeCommentary(s)   // idempotent
unescapeCommentary(escapeCommentary(s)) === s                   // lossless
```

Idempotence matters because the escaper may run more than once in a pipeline.
Losslessness is the proof nothing was dropped.

```ts
escapeCommentary('Writing pick() is four lines.')
// → 'Writing pick\\(\\) is four lines.'

escapeCommentary('Pick<T, K> and { name: string }')
// → 'Pick\\<T, K\\> and \\{ name: string \\}'
```

Not touched: emoji and other multi-byte characters, Unicode Mathematical Bold,
newlines. The pass iterates code points, not UTF-16 units, so offsets stay correct
through astral-plane characters.

**Use this on the comment body too.** A tracking URL with a bracketed query string
truncates exactly the same way.

> Only needed for the versioned `/rest/posts` API. The legacy `/v2/ugcPosts` endpoint
> takes plain text and needs no escaping.

---

## 4. `foldPositions` and `hookSurvives`

```ts
function foldPositions(
  text: string,
  cfg?: { mobile?: number; desktop?: number },
): { readonly mobile: number; readonly desktop: number };

function hookSurvives(text: string, cfg?: ...): boolean;
```

Character offsets where "see more" truncates. Line-aware: a hard break can end the
visible region before the character budget is reached.

**These are approximations.** LinkedIn does not document the fold and it varies by
device, font and layout version. Defaults are about 140 mobile and 210 desktop.
Publish one post, look at where it actually cut, and configure the numbers to what you
observed.

`hookSurvives` returns whether the first sentence completes before the mobile fold.

---

## 5. `computeStats` and `computeBaseline`

```ts
function computeStats(text: string): Stats;
function computeBaseline(texts: readonly string[]): Baseline;
```

`computeStats` is deterministic and pure. `computeBaseline` is the intended path for
calibrating the `tells` thresholds: pass your own published posts, keep the result, and
hand it back in `LintOptions.baseline`.

Without a baseline, the tell detectors fall back to conservative constants **and say so
in their messages**. A tool reporting "below your baseline" when it has no baseline is
lying.

Ten or more texts are recommended. Fewer produces a `Baseline` with a
`lowConfidence: true` flag.

---

## 6. `similarity`

```ts
function similarity(
  text: string,
  archive: readonly string[],
  cfg?: { threshold?: number; minPhraseLen?: number },
): readonly Finding[];
```

Character-trigram Jaccard plus a longest-common-substring check. The archive is passed
in — the core never reads files.

Lexical, not semantic. Catches repeated framing and reused phrasing; misses the same
idea expressed differently.

---

## 7. The `Finding` contract

```ts
interface Finding {
  readonly id: string;
  readonly severity: Severity;
  readonly message: string;
  readonly start?: number;
  readonly end?: number;
  readonly suggestion?: string;
  readonly fixable?: boolean;
}
```

Guarantees consumers may rely on:

- **`id` is stable.** `group/name`, lowercase, hyphenated. Renaming is a major version.
- **Offsets are zero-based and over the original text**, not the escaped output, so a
  highlighted range matches what the user typed.
- **`message` is one line, plain, no emoji, no trailing period.**
- **`severity: 'error'` means do not publish.** Only `escape/*`,
  `counts/over-limit` and `bold/code-identifier` can produce it. Nothing about voice
  ever will, so consumers can safely gate on it.
- **`fixable: true` means `--fix` can apply it mechanically** without judgement.
  Currently all `escape/*` rules and nothing else.

---

## 8. Errors

The package throws only for programming errors:

| Condition | Behaviour |
| --- | --- |
| `text` is not a string | `TypeError` |
| Unknown key in options | `TypeError`, listing the key. Catches typos in config rather than silently ignoring them |
| Unknown rule id in `rules` | `TypeError`, listing it. Catches renamed ids after an upgrade |
| Any content whatsoever | **Never throws.** Content produces findings |

That last row is the important one: a linter that crashes on strange input is a linter
that breaks a publish pipeline at the worst moment.

---

## 9. CLI contract

Full detail in [cli-design.md](./cli-design.md). The parts that are a contract:

| Exit code | Meaning |
| --- | --- |
| 0 | No errors. Warnings may exist |
| 1 | At least one `error` |
| 2 | Bad usage, unreadable file, invalid config |

`--json` output shape:

```jsonc
{
  "version": "1.0.0",
  "file": "post.txt",
  "stats": { /* Stats */ },
  "findings": [ /* Finding[] */ ],
  "summary": { "errors": 2, "warnings": 3, "info": 1 }
}
```

The `--json` shape is a contract. Adding a field is a minor version; changing or
removing one is major.

---

## 10. Stability

| Surface | Stability |
| --- | --- |
| `escapeCommentary` / `unescapeCommentary` behaviour | **Highest.** A change is always a major version, never a patch |
| Rule ids | Stable. Renaming is major |
| Severity of an existing rule | Raising it is major. Lowering it is minor |
| `Finding` shape | Adding an optional field is minor |
| Default thresholds | Changing one is minor. They are documented as defaults |
| Fold constants | Documented as approximate and configurable. Changing them is minor |
| Internal modules under `dist/` | Not public. Do not import them directly |
