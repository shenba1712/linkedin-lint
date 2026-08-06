# linkedin-lint — Rules Reference

**Status:** v1.0, 2026-08-06.

Every rule, with its id, severity, threshold and reason. **Rule ids are public API** —
consumers suppress and pin by id, so renaming one is a breaking change requiring a
major version.

Severity contract: `error` means do not publish. `warn` is style, meant to be
overruled sometimes. `info` is an observation.

---

## escape

The reason this package exists. All `error`.

| Id | Severity | Fires when | Why |
| --- | --- | --- | --- |
| `escape/unescaped-paren` | error | An unescaped `(` or `)` | **The catastrophic one.** LinkedIn silently drops everything from an unescaped `(` to the end of the post. Given its own id, separate from other reserved characters, because the failure mode is so much worse |
| `escape/unescaped-bracket` | error | Unescaped `[` or `]` | Reserved. Breaks the body |
| `escape/unescaped-brace` | error | Unescaped `{` or `}` | Reserved |
| `escape/unescaped-angle` | error | Unescaped `<` or `>` | Reserved. Common in generics: `Pick<T, K>` |
| `escape/unescaped-at` | error | Unescaped `@` | Reserved. Interpreted as a mention |
| `escape/unescaped-hash` | error | Unescaped `#` | Reserved. Interpreted as a hashtag |
| `escape/unescaped-symbol` | error | Unescaped `*`, `_`, `~`, `\|` | Reserved |
| `escape/lone-backslash` | error | A `\` not followed by a reserved character | Ambiguous. Will be consumed as an escape and lose the backslash |
| `escape/double-escaped` | warn | A reserved character escaped twice | Not dangerous, but it will render a literal backslash. Almost always a pipeline running the escaper twice with a non-idempotent implementation |

All `escape/*` rules are `fixable`. `--fix` applies them safely.

---

## counts

| Id | Severity | Threshold | Notes |
| --- | --- | --- | --- |
| `counts/over-limit` | **error** | Post over 3,000 chars; comment over 1,250 | Configurable. Over the limit means the API rejects it or truncates |
| `counts/short` | info | Below the baseline `chars.min` | Observation only. Short posts are often good |
| `counts/long` | warn | Above the baseline `chars.max` | You are outside your own usual range |
| `counts/too-many-hashtags` | warn | More than `maxHashtags` (default 4) | Configurable |

The limits are **defaults, not documented facts.** LinkedIn does not publish them and
they change. Verify and configure.

---

## fold

| Id | Severity | Threshold | Notes |
| --- | --- | --- | --- |
| `fold/hook-too-long` | warn | The first sentence extends past the mobile fold | The single most useful warning in the package. Your opening claim gets cut mid-thought on a phone |
| `fold/hook-incomplete` | warn | The mobile fold lands mid-sentence | Different from the above: the hook is short enough, but the fold still cuts awkwardly |
| `fold/nothing-above-fold` | warn | Fewer than 40 characters before the fold | Usually a stray short first line |

The fold positions are **approximate and configurable**. Publish one post, look at
where it actually cut on your phone, and set the numbers to what you saw. Defaults:
mobile ~140, desktop ~210.

---

## prohibitions

All configurable. Defaults are conservative — the package should not impose one
person's style on everyone.

| Id | Severity | Default | Notes |
| --- | --- | --- | --- |
| `prohibitions/banned-word` | warn | A small default list | `delve`, `game-changer`, `unlock`, `in today's fast-paced`, `navigate the landscape`, `In conclusion`, `I'm excited to share`, `thrilled to announce` |
| `prohibitions/em-dash` | off | Configurable to warn or error | Some authors ban it outright; others use it well. Off by default because it is a genuine style split |
| `prohibitions/emoji` | off | Configurable | Detected by Unicode property, not a hard-coded list |
| `prohibitions/question-opener` | off | Configurable, platform-scoped | A question opener is strong on long-form and weak on LinkedIn. Off by default because it depends on the author |
| `prohibitions/colon-overuse` | warn | More than 1 non-label colon | Label-colons inside an explicit numbered list are exempt, or the rule fires on good structured writing |
| `prohibitions/colon-parallel` | warn | 3+ consecutive paragraphs opening with a label-colon **outside** a numbered list | This specific shape is the generated-listicle tic |
| `prohibitions/self-label-opener` | warn | Opens with `As a/an <role>,` | A weak, very common opening |

**On the default list:** words are only there if they are near-universally regarded as
filler. Anything defensible stays out. `seamless` and `robust` were considered and
left out — they appear in genuinely good technical writing.

---

## tells

Heuristics for prose that reads as machine-written. All `warn`, always — this package
cannot know, and pretending otherwise would be dishonest.

| Id | Severity | Threshold | Notes |
| --- | --- | --- | --- |
| `tells/flat-rhythm` | warn | `sentenceLenStdDev` below baseline `p15` | **The best single signal.** Written prose varies sentence length on purpose; generated prose flattens. Falls back to a conservative constant with no baseline, and the message says so |
| `tells/uniform-paragraphs` | warn | `paragraphLenCv` below 0.25 | Symmetrical blocks are a strong signature |
| `tells/no-stake` | warn | No first-person experience claim | **Only fires when `options.postType` is one that calls for one** — `opinion`, `experiment`, `got-it-wrong`, `build-note`. Off otherwise, because plenty of strong technical posts contain no personal claim |
| `tells/no-specifics` | warn | No number, named tool, API, or failure mode | Abstract prose with nothing concrete in it |
| `tells/cliche-opener` | warn | `X is not Y. It is Z.` **in the first two sentences only** | See below |
| `tells/rhetorical-close` | warn | A closing question that cannot have a specific answer | See below |
| `tells/tricolon-density` | warn | Tricolons per 1,000 words above baseline `p90` | See below |

### The three that are narrowed on purpose

These are widely cited as AI tells, and flagging them naively makes the linter fire on
good writing. Full reasoning in
[ADR-003](./adr/ADR-003-calibrate-against-corpus.md).

| Pattern | Naive rule | What this package does |
| --- | --- | --- |
| `X is not Y. It is Z.` | Ban it everywhere | Flag it **only in the opening two sentences**, where it is a cliché. In the body it is often the clearest way to reframe something |
| Closing question | Ban all closing questions | Flag only **unanswerable** ones. "What's another function whose type is hard to get right?" is a real invitation and good practice. "Isn't that fascinating?" is not |
| Tricolons | Ban lists of three | Flag **density** above the author's own 90th percentile. Never presence — tricolons are everywhere in good prose |

### do-not-normalise

`options.doNotNormalise: string[]` lists patterns the linter must never flag. Intended
for an author's regional English constructions, which are voice rather than error. A
linter that flags them is a linter that sands the author down.

These appear in the output as an `info` note so a consumer's own tooling can carry them
forward.

---

## bold

LinkedIn has no bold. Tools fake it with Unicode Mathematical Alphanumeric Symbols —
`𝐩𝐢𝐜𝐤` is four mathematical symbols shaped like p-i-c-k.

| Id | Severity | Threshold | Notes |
| --- | --- | --- | --- |
| `bold/code-identifier` | **error** | Any bold span that is a code identifier | The only style-adjacent rule promoted to error. Three reasons: a screen reader announces four unrelated codepoints so the term the post is *about* becomes unreadable; **LinkedIn search will not match it**, so your most searchable technical terms go invisible; and nobody can copy `𝐏𝐢𝐜𝐤<𝐓, 𝐊>` into an editor. Suggestion: put the signature on its own line with blank lines around it — whitespace does the same job, better |
| `bold/over-budget` | warn | More than `maxSpans` (default 3) | Heavy pseudo-bold reads as shouting and degrades for anyone using assistive technology |
| `bold/in-hook` | warn | Bold in the first sentence | The hook should work on its own. Bold in it is usually compensating for a weak claim |
| `bold/mixed-variants` | info | Serif and sans-serif bold in one post | Renders inconsistently across platforms |

**Known false positive:** a bolded PascalCase proper noun can look like a code
identifier. The suggestion text is worded so it is easy to dismiss, and this is the one
place a false positive is expected.

---

## similarity

Requires a caller-supplied archive. Silent without one.

| Id | Severity | Threshold | Notes |
| --- | --- | --- | --- |
| `similarity/near-duplicate` | warn | Trigram Jaccard above 0.6 against any archive entry | You have posted this before |
| `similarity/reused-phrase` | info | A shared substring longer than 60 characters | Often fine — a recurring framing can be a signature. Worth knowing |

Lexical, not semantic. Catches repeated framing and reused phrases. **Misses the same
idea expressed completely differently.** Semantic similarity would need embeddings,
which would need a model and a dependency.

---

## Suppression

```
{ "rules": { "prohibitions/em-dash": "off", "counts/short": "off" } }
```

Or inline, on the line above:

```
<!-- linkedin-lint-disable-next-line bold/code-identifier -->
```

**`escape/*` rules cannot be suppressed.** Suppressing them means publishing a broken
post, and there is no legitimate reason to want that.

---

## Adding a rule

Five things, in this order. Steps 2 and 4 are the ones people skip.

1. An entry in this file: id, severity, threshold, rationale
2. A pathological-input test proving the pattern cannot backtrack catastrophically
3. Positive fixtures — text that should trigger it
4. **Negative fixtures from real published posts** — proof it does not fire on good
   writing
5. The implementation

**If step 4 fails, the rule is wrong, not the writing.**
