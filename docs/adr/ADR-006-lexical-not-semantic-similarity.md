# ADR-006: Similarity is lexical, not semantic

## Status

🟢 Accepted (2026-08-06).

## Context

Over a year at two posts a week, an author writes about a hundred posts and **will**
repeat themselves. A repetition check is genuinely useful, and it has a second use: run
in reverse, it finds old posts worth a second pass, which is how a dry week gets filled
without inventing a topic.

The question is how similar "similar" is measured.

**Semantic similarity** — embeddings plus cosine distance — catches the same idea
expressed in completely different words. That is the better answer on quality.

It is the wrong answer for this package. It needs a model, which means either a network
call or a downloaded model file. Either one breaks the pure-core rule and the
zero-dependency rule, both of which exist for reasons that are more important than this
one feature ([ADR-005](ADR-005-zero-dependencies-pure-core.md)). A linter that downloads
a model on install is a different kind of tool, and not one people put in a publishing
pipeline.

**Lexical similarity** — character-trigram Jaccard plus a longest-common-substring check
— needs nothing. It catches repeated framing, reused phrasing, and near-duplicates. It
misses paraphrase.

## Decision

**Lexical similarity, with the limitation stated plainly wherever the feature appears.**

```ts
similarity(text, archive: readonly string[], cfg?): readonly Finding[];
```

- **Character-trigram Jaccard** over normalised text (lowercased, whitespace collapsed,
  punctuation stripped) for the overall near-duplicate check.
- **Longest common substring** for reused phrasing, which catches "I have used this exact
  paragraph before" even when the posts are otherwise different.
- Two findings: `similarity/near-duplicate` at `warn` above 0.6, and
  `similarity/reused-phrase` at `info` for a shared substring over 60 characters.
- **The archive is passed in as an array of strings.** The core reads no files.
- `reused-phrase` is `info`, not `warn`, because a recurring framing can be a deliberate
  signature rather than a mistake.
- **The README, the PRD and the rules reference all say it is lexical and that it misses
  paraphrase.** Stated three times because a silent limitation in a similarity check is a
  false sense of safety.

## Consequences

- **It runs instantly with no setup.** No model, no download, no network, no install
  weight.
- **It misses the same idea in different words.** The honest mitigation is that the tool
  is one input to a human review, not a gate — which is why it is `warn` and `info`, never
  `error`.
- **The archive is the caller's problem**, which is the correct division. Cadence has a
  database of published posts; another consumer might have a directory of text files.
  Neither belongs in this package.
- **It works in reverse for free.** The same index that says "you have written this
  before" answers "which old post is closest to this new idea", which is the
  archive-re-mining feature in the consumer, at no extra cost here.
- **Normalisation choices matter and are documented.** Lowercasing and stripping
  punctuation means `pick()` and `pick` compare as similar, which is the desired
  behaviour for a repetition check even though it loses information.
- **Reconsider only if the constraint changes.** If a local embedding model ever becomes
  a zero-dependency, no-download proposition, this decision is worth revisiting. Nothing
  else about it would change.
