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

All `escape/*` rules carry a `fix`. `--fix` applies them safely, and applies **nothing else** —
every other rule offers `suggestions`, which are never automatic
([ADR-009](./adr/ADR-009-finding-carries-edits.md)).

`escape/*` fixes cannot overlap: each inserts one `\` before one reserved character at that
character's index. **Reasoned, not proven** — a test asserting no two fixes overlap across
every fixture is required, because it silently stops being true the moment a second rule
becomes fixable.

---

## counts

| Id | Severity | Threshold | Notes |
| --- | --- | --- | --- |
| `counts/over-limit` | **error** | Post over 3,000 chars; comment over 1,250 | Configurable. Over the limit means the API rejects it or truncates |
| `counts/short` | info | Below the caller's baseline `chars.min` | Observation only. Short posts are often good. **Personal baseline only** — silent without one |
| `counts/long` | warn | Above the caller's baseline `chars.max` | You are outside your own usual range. **Personal baseline only** — "outside your usual length" has no generic equivalent, since post length varies legitimately by author |
| `counts/too-many-hashtags` | warn | More than `maxHashtags` (default 4) | Configurable. **Names the specific tags with a reason each**, not "drop the last N" — see below |

The limits are **defaults, not documented facts.** LinkedIn does not publish them and
they change. Verify and configure.

### Which hashtags to drop, and why

Four computable signals, no model
([ADR-009](./adr/ADR-009-finding-carries-edits.md) §5). Worked against
`test/fixtures/linkedin/cancun.md`, which carries ten:

```
#TravelHistory    token "travel" already used in #TravelTrivia
#Tourism          term does not appear in the post
#Innovation       generic engagement tag; term does not appear in the post
#TechMeetsTravel  token "travel" already used; term does not appear
#ViralTrivia      token "trivia" already used; generic tag; term does not appear
```

| Signal | Notes |
| --- | --- |
| Token overlap | Split CamelCase, flag repeated tokens across tags |
| Generic engagement tag | A shipped list, so telemetry sends `tagIndex`, never the tag |
| Term absent from the post | **The weakest of the four.** A hint, not a reason — hashtags exist for discovery *beyond* your text |
| Not CamelCase | Its own rule, `style/hashtag-not-camelcase` — it is an accessibility finding |

Ranking is reason-count. Drop from the bottom until the limit is met.

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

## style

Renamed from `prohibitions/*` on 2026-08-11
([ADR-007](./adr/ADR-007-flagged-not-banned-measured-baselines.md) §1). Nothing here is
prohibited — three of these ship off by default — and a linter that says *banned* invites
the author to obey or disable it, where one that says *flagged* invites them to look.

All configurable.

| Id | Severity | Default | Notes |
| --- | --- | --- | --- |
| `style/flagged-word` | warn | Tiered list, see below | Was `prohibitions/banned-word` |
| `style/em-dash` | off | Configurable to warn or error | Some authors avoid it entirely; others use it well. Off by default because it is a genuine style split |
| `style/emoji` | off | Configurable | Detected by Unicode property, not a hard-coded list |
| `style/question-opener` | off | Configurable, platform-scoped | A question opener is strong on long-form and weak on LinkedIn. Off by default because it depends on the author |
| `style/colon-overuse` | warn | More than 1 non-label colon | Label-colons inside an explicit numbered list are exempt, or the rule fires on good structured writing |
| `style/colon-parallel` | warn | 3+ consecutive paragraphs opening with a label-colon **outside** a numbered list | This specific shape is the generated-listicle tic |
| `style/self-label-opener` | warn | Opens with `As a/an <role>,` | A weak, very common opening. **Threshold decision outstanding:** whether "opens with" means the first sentence or the first body paragraph. `test/fixtures/linkedin/cancun.md` has it in paragraph two |
| `style/hashtag-not-camelcase` | warn | A multi-word hashtag with no internal capitals | `#traveltrivia` runs together in a screen reader; `#TravelTrivia` is announced as three words. Sits beside `bold/code-identifier` — an accessibility finding, not a style preference |

### The flagged-word list is tiered

A flat list large enough to be useful fires on good writing, because it makes `delve` count
the same as `leverage`. Two tiers, so the list can be as large as is useful:

| Tier | Behaviour | Examples |
| --- | --- | --- |
| **High-signal** | Fires on presence | `delve`, `tapestry`, `in today's fast-paced`, `navigate the landscape`, `In conclusion`, `I'm excited to share`, `thrilled to announce` |
| **Contextual** | Counts toward density only; never fires alone | `leverage`, `crucial`, `robust`, `seamless`, `foster` |

`seamless` and `robust` are **on** the list and **cannot fire by themselves.** One is
writing; ten contextual hits in 400 words is a pattern worth a second look. That satisfies
ADR-003's constraint rather than dropping it.

**The message is an observation, not a verdict.** *"10 flagged words in 400 — worth a
read-through in your own voice"*, never anything implying the author cheated. A high density
often means a draft that needs a human pass, which is a thing to help with.

**Output shape:** one `info` per occurrence with offsets, so an editor can highlight inline;
one `warn` when density crosses. The CLI collapses the `info` run into a count.

**Matching is tokenise-then-set-lookup, not N regexes**, or a large list spends the entire
ReDoS budget ([threat-model.md](./threat-model.md) T1).

---

## tells

Heuristics for prose that reads as machine-written. All `warn`, always — this package
cannot know, and pretending otherwise would be dishonest.

**Findings report the observable, not the verdict**
([ADR-007](./adr/ADR-007-flagged-not-banned-measured-baselines.md) §6). *"Sentence lengths
are unusually uniform — 14, 15, 13, 15, 14 words"*, never *"this reads as AI-generated"*.
The first is a fact about the text, equally true and equally actionable whether the writer
was a model or a careful non-native speaker. The second is an interpretation the reader can
draw for themselves, and it lands as an accusation on the writer it misjudges.

**And each tell carries a shipped example**
([ADR-009](./adr/ADR-009-finding-carries-edits.md) §4) — a canned illustration, not the
user's text and not generated:

> Sentence lengths: 14, 15, 13, 15, 14 — variance 0.8
> Written prose usually varies more. For example: 4, 19, 8, 22, 6.

No server, no model, and it is the Hemingway model exactly: show the pattern rather than
rewrite the sentence. For a non-native English speaker a concrete before/after generalises
better than personalised output, which is why it is here rather than in `advice` alone.

**None of the `tells/*` rules produce a `suggestion`.** "Vary your sentence length" is advice,
not an edit — there is no range and no replacement to compute without a model.

| Id | Severity | Threshold | Notes |
| --- | --- | --- | --- |
| `tells/flat-rhythm` | warn | `sentenceLenStdDev` below the 15th percentile **of the measured generated-text distribution** | **The best single signal.** Written prose varies sentence length on purpose; generated prose flattens. A caller-supplied baseline adds a second, personal comparison; it is not required |
| `tells/uniform-paragraphs` | warn | `paragraphLenCv` below 0.25 | Fixed constant, no baseline needed. Symmetrical blocks are a strong signature |
| `tells/no-stake` | warn | No first-person experience claim | **Only fires when `options.postType` is one that calls for one** — `opinion`, `experiment`, `got-it-wrong`, `build-note`. Off otherwise, because plenty of strong technical posts contain no personal claim |
| `tells/no-specifics` | warn | No number, named tool, API, or failure mode | Abstract prose with nothing concrete in it. **Needs a post-type gate** — it is an absence feature, and absence features are meaningless without knowing what kind of post it is (ADR-007 §4) |
| `tells/cliche-opener` | warn | `X is not Y. It is Z.` **in the first two sentences only** | See below |
| `tells/rhetorical-close` | warn | A closing question that cannot have a specific answer | See below |
| `tells/tricolon-density` | warn | Tricolons per 1,000 words above the 90th percentile **of the measured generated-text distribution** | See below |

### The three that are narrowed on purpose

These are widely cited as AI tells, and flagging them naively makes the linter fire on
good writing. Full reasoning in
[ADR-003](./adr/ADR-003-calibrate-against-corpus.md).

| Pattern | Naive rule | What this package does |
| --- | --- | --- |
| `X is not Y. It is Z.` | Ban it everywhere | Flag it **only in the opening two sentences**, where it is a cliché. In the body it is often the clearest way to reframe something |
| Closing question | Ban all closing questions | Flag only **unanswerable** ones. "What's another function whose type is hard to get right?" is a real invitation and good practice. "Isn't that fascinating?" is not. **Implemented as a curated pattern list** — stock rhetorical openers — not a semantic test, which is why `diagnostic.patternIndex` identifies exactly which pattern fired |
| Tricolons | Ban lists of three | Flag **density** above the 90th percentile of the measured distribution. Never presence — tricolons are everywhere in good prose |

### do-not-normalise

`options.doNotNormalise: string[]` lists patterns the linter must never flag. Intended
for an author's regional English constructions, which are voice rather than error. A
linter that flags them is a linter that sands the author down.

These appear in the output as an `info` note so a consumer's own tooling can carry them
forward.

**It only covers `style/*`.** `doNotNormalise` works by listing patterns, and a statistical
rule has no pattern to list, so nothing here protects regional or non-native English from
`tells/*`. That gap is real and it matters: the features that make text read as generated
overlap almost entirely with the features that make it read as formal or second-language
English — uniform sentence length, low lexical variety, taught connectives, few
contractions. Published work on AI detectors found they flagged a large share of TOEFL
essays by non-native writers while flagging almost none by US-born students.

Two mechanisms close it, both in
[ADR-007](./adr/ADR-007-flagged-not-banned-measured-baselines.md) §7:

1. **No feature ships without passing a discriminant test** — it must separate
   generated-from-written more strongly than it separates formal-from-casual. A feature that
   separates register as well as provenance is a register detector and does not ship.
2. **The personal baseline is the appeal mechanism.** A writer whose natural register is
   formal computes their own, and the generic threshold defers to it.

---

## bold

LinkedIn has no bold. Tools fake it with Unicode Mathematical Alphanumeric Symbols —
`𝐩𝐢𝐜𝐤` is four mathematical symbols shaped like p-i-c-k.

| Id | Severity | Threshold | Notes |
| --- | --- | --- | --- |
| `bold/code-identifier` | **error** | Any bold span that is a code identifier | The only style-adjacent rule promoted to error. **Primary reason: there is no Unicode bold anywhere in the author's 269 fixtures**, so this guards against bold *the tooling* would insert — and blocking output nothing legitimate produces costs nothing. Supporting, in descending confidence: a screen reader cannot announce the term (**unverified**, qa §8); LinkedIn search is believed not to match it (**unverified**, and NFKC gives reason to doubt it); and the text is not the word, so find-in-page and search boxes miss it — `"𝐏𝐢𝐜𝐤".includes("Pick")` is `false`. Suggestion: put the signature on its own line with blank lines around it — whitespace does the same job, better |
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
{ "rules": { "style/em-dash": "off", "counts/short": "off" } }
```

Or inline, on the line above:

```
<!-- linkedin-lint-disable-next-line bold/code-identifier -->
```

**`escape/*` rules cannot be suppressed.** Suppressing them means publishing a broken
post, and there is no legitimate reason to want that.

---

## Adding a rule

Six things, in this order. Steps 2, 4 and 5 are the ones people skip.

1. An entry in this file: id, severity, threshold, rationale
2. A pathological-input test proving the pattern cannot backtrack catastrophically
3. Positive fixtures — text that should trigger it
4. **Negative fixtures from endorsed published posts** — proof it does not fire on writing
   the author stands behind
5. **A discriminant check**, for any rule reading a measured feature: it must separate
   generated-from-written more strongly than formal-from-casual
   ([ADR-007](./adr/ADR-007-flagged-not-banned-measured-baselines.md) §7)
6. The implementation

**If step 4 fails, the rule is wrong, not the writing. If step 5 fails, the rule is
measuring register and does not ship at all.**
