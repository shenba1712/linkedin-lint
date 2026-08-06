# linkedin-lint — Product Requirements

**Status:** v1.0, 2026-08-06. Master product document for this package.

---

## 1. What this is

A linter and formatter for LinkedIn posts, published as an npm package with a CLI.

It answers one question with certainty and several with judgement:

- **Certainly:** is this text safe to send to LinkedIn's API without losing part of
  it?
- **With judgement:** does the hook survive the fold, is it the right length, does it
  contain the phrases that read as machine-written, does it repeat something already
  posted?

## 2. Why it exists

LinkedIn's versioned Posts API uses a text format where
`( ) [ ] { } < > @ # * _ ~ | \` are reserved and must each be escaped with a
backslash. They must be escaped even when mentions and hashtags are not in use.

**An unescaped `(` causes LinkedIn to silently drop everything from that character to
the end of the post.** The API returns `201`. The post appears. It is just missing
most of its text, and nothing anywhere tells you.

For anyone writing about code, this is the normal case rather than an edge case. A
real example:

```
Writing pick() is four lines. Typing it well is the difference between code
that merely works and code the compiler protects.
```

Published unescaped, that post reads `Writing pick`. A post containing
`pick(user, ['name'])`, `Pick<T, K>` and `{ name: string }` touches six reserved
characters and loses almost everything.

Once a tool is handling text on the way to the API, the other pre-publish checks are
nearly free, and they are the ones people actually want: where does the fold cut, is
this too long, does this read like it was generated.

## 3. Who it is for

- **Anyone posting to LinkedIn through the API** — the escaping problem is universal
  and undocumented outside a footnote.
- **Developers writing technical content**, who hit it hardest because their posts are
  full of parentheses and brackets.
- **Tool builders** — the package is a library first, so a scheduler or CMS can use it
  as a pre-flight check.
- **Cadence**, the private project it was extracted from, which is its first consumer
  and its main test bed.

## 4. Principles

1. **Certainty where certainty is possible, judgement labelled as judgement.**
   Escaping is verifiable and is an `error`. Voice is not, and stays a `warn`.
2. **Pure core.** No network, no filesystem, no clock, no randomness. Callers pass
   data in. This is what makes it testable and safe to depend on.
3. **Zero runtime dependencies.** Not few. Zero. The package holds a correctness
   guarantee for other people's published words.
4. **Never fire on good writing.** Every rule has negative fixtures from real
   published posts. If a rule fires on those, the rule is wrong.
5. **Honest about approximation.** The fold positions are observed, not documented.
   The docs say so, and the numbers are configurable.
6. **Rule ids are public API.** People suppress by id, so renaming one is a breaking
   change.

## 5. Scope

### 5.1 In scope

| Group | What it does |
| --- | --- |
| **escape** | Escapes reserved characters for `/rest/posts` and comments. Idempotent, round-trip safe. Also `unescape` |
| **fold** | Computes where "see more" truncates on mobile and desktop, and whether the hook survives |
| **counts** | Characters against post and comment limits, words, paragraphs, sentence-length mean and variance, hook length |
| **prohibitions** | Configurable banned words and phrases, em dashes, emoji, hashtag count, question-as-opening-line |
| **tells** | Four heuristics for machine-written prose: flat sentence rhythm, uniform paragraphs, missing first-person stake, missing named specifics |
| **bold** | Unicode pseudo-bold span budget, and detection of bold applied to code identifiers |
| **similarity** | Lexical comparison against a caller-supplied archive |
| **CLI** | Human-readable output, `--json`, `--escape`, `--fold`, `--fix` |
| **baseline** | A helper that computes statistics over a corpus, so thresholds can be calibrated to a real author |

### 5.2 Out of scope

Written down so they do not creep in.

- **Publishing.** This package never talks to LinkedIn. It has no HTTP client and no
  concept of a token.
- **Drafting or rewriting.** No LLM, no suggestions beyond the mechanical fixes in
  `--fix`.
- **Other platforms.** The name says LinkedIn. X, Threads and Mastodon have different
  formats and different fold behaviour, and pretending one tool covers all of them
  produces a tool that is wrong everywhere.
- **Semantic similarity.** Embeddings would mean a model, a dependency and a
  download. Lexical comparison catches reused framing, which is the common case, and
  the docs are honest that it misses paraphrase.
- **Scoring a post out of ten.** A number invites optimising for the number.
- **Telling you whether a post is AI-generated.** It cannot, and claiming it can would
  be dishonest. It reports that the rhythm is flat, which is a narrower and true
  claim.

## 6. Severity contract

This is the most important interface decision, because consumers act on it.

| Severity | Meaning | Consumer behaviour |
| --- | --- | --- |
| `error` | The post will be broken, truncated, or over the limit | Block publishing |
| `warn` | Style judgement | Show it, allow overrule |
| `info` | Observation | Display only |

**Only three rule groups can produce `error`:** `escape/*`, `counts/over-limit`, and
`bold/code-identifier`.

`bold/code-identifier` is the debatable one. It is an error because its cost falls on
*other people* — a screen-reader user cannot read the term the post is about, and
LinkedIn search cannot index it. Everything else about voice costs only the author,
so it is a warning.
([ADR-004](./adr/ADR-004-bold-budget-is-an-error.md))

## 7. The tells problem

Three patterns get widely cited as AI tells and are **not flagged by default**,
because they are also how good writers write:

| Pattern | Default behaviour |
| --- | --- |
| `X is not Y. It is Z.` | Flagged **only in the first two sentences**, where it is a cliché opener. Never in the body |
| A closing question | Flagged **only when unanswerable**. A specific invitation is good writing |
| Tricolons | Flagged on **density** above a threshold, never on presence |

What is flagged instead is what actually separates generated prose from written
prose:

| Id | Detector |
| --- | --- |
| `tells/flat-rhythm` | Sentence-length standard deviation below the baseline |
| `tells/uniform-paragraphs` | Paragraph-length coefficient of variation below 0.25 |
| `tells/no-stake` | No first-person experience claim, **where the post type calls for one** |
| `tells/no-specifics` | No number, named tool, API, or failure mode anywhere |

`tells/no-stake` is scoped by post type on purpose. Plenty of strong technical posts
contain no personal claim at all, and requiring one everywhere would be wrong.

There is also a **do-not-normalise** concept: an author's regional English
constructions are part of their voice, and a linter that flags them is a linter that
sands the author down. Configurable, and never on by default.
([ADR-003](./adr/ADR-003-calibrate-against-corpus.md))

## 8. Success criteria

| Criterion | How you would know |
| --- | --- |
| No truncated posts | Zero bug reports of a post publishing truncated after the escaper ran |
| It does not annoy | Running it on the author's four published posts yields zero errors and no false warnings |
| It is trusted | `error` still means "unsafe" a year later, because nothing was promoted into it |
| Someone else uses it | A download from an account that is not the author's, and ideally an issue with a real broken post |
| It stays small | Still zero runtime dependencies at v1.0 |

## 9. Roadmap

| Phase | What lands |
| --- | --- |
| **0a** | `escape` and `unescape`, with property tests and real fixtures. This alone is worth publishing |
| **0b** | `counts` and `fold`, plus the baseline helper |
| **0c** | `prohibitions` and `bold` |
| **0d** | `tells`, calibrated against a supplied baseline |
| **0e** | `similarity` |
| **0f** | CLI, docs, npm release with provenance |
| **1** | Whatever real usage asks for. Nothing planned, deliberately |

Phase 0a is publishable on its own. A package that only escapes correctly is already
more useful than what exists.

## 10. Related documents

- [trd.md](./trd.md) — architecture and algorithms
- [api-specifications.md](./api-specifications.md) — the public API surface
- [rules-reference.md](./rules-reference.md) — every rule with thresholds
- [cli-design.md](./cli-design.md) — command shape and output contract
- [qa-test-plan.md](./qa-test-plan.md) — tests, including the property tests
- [threat-model.md](./threat-model.md) — ReDoS, supply chain, npm provenance
- [security-audit.md](./security-audit.md) — checklist and log
- [devops-cicd.md](./devops-cicd.md) — CI, versioning, release
- [disaster-recovery.md](./disaster-recovery.md) — the bad-release playbook
- [compliance-matrix.md](./compliance-matrix.md) — licences, platform terms, claims
- [adr/README.md](./adr/README.md) — decisions
- [core/tickets.md](./core/tickets.md) — the board
