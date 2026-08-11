# ADR-007: Flagged, not banned — measured baselines and observable findings

## Status

🟢 Accepted (2026-08-11). Extends [ADR-003](./ADR-003-calibrate-against-corpus.md); does
not supersede it. The three narrowed tells, `doNotNormalise`, and the negative-fixture
rule all stand unchanged.

## Context

Four problems surfaced together, and they turn out to be the same problem seen from
different sides.

**1. "Prohibitions" is the wrong word.** The group holds banned words, em dashes, emoji,
hashtag counts, colon usage and openers. Three of those ship **off by default**. Nothing
in it is prohibited, and the name promises an authority the package does not want. A
linter that says *banned* invites the author to either obey or disable it; a linter that
says *flagged* invites them to look.

**2. A word list large enough to be useful fires on good writing.** The specified default
is six entries — near-zero false positives and near-zero value. Growing it flat makes
`delve` (a near-unambiguous generated-text signature) count the same as `leverage`
(ordinary business English), and then the rule fires on competent prose and gets turned
off. ADR-003 already solved this shape once for tricolons: flag on **density**, never on
presence.

**3. The thresholds were personal, so a new user got nothing.** `tells/flat-rhythm` asked
*"is your sentence variance below your own 15th percentile?"*, which requires a corpus the
user does not have on first run. Without one it fell back to a constant and said so —
honest, but it meant the group's best rule did almost nothing for anybody new. Four of the
36 rules had this dependency: `counts/short`, `counts/long`, `tells/flat-rhythm`,
`tells/tricolon-density`.

**4. The author's corpus cannot serve as the human reference.** Two independent reasons,
and either alone is sufficient. The maintainer's instruction is explicit — *"you shouldn't
use my writing to gauge anyone else's writing; mine is mine alone."* And the corpus is one
person, so any feature separating it from generated text might be separating *that author*
rather than *human writing*. [qa-test-plan.md](../qa-test-plan.md) §4 also records that the
archive is "some AI-assisted", which means its provenance is not established anyway.

There is a fifth thing, discovered while reading `test/fixtures/linkedin/cancun.md` and
serious enough to gate the work: that post is written in LinkedIn's native register — hook
question, emoji, hashtag stack, closing invitation. Generated LinkedIn posts look the same,
because models learned the register from posts like it. **A rule set built on surface
features may separate register rather than authorship**, and nobody has checked.

## Decision

### 1. `prohibitions/*` becomes `style/*`

| Old id | New id |
| --- | --- |
| `prohibitions/banned-word` | `style/flagged-word` |
| `prohibitions/em-dash` | `style/em-dash` |
| `prohibitions/emoji` | `style/emoji` |
| `prohibitions/question-opener` | `style/question-opener` |
| `prohibitions/colon-overuse` | `style/colon-overuse` |
| `prohibitions/colon-parallel` | `style/colon-parallel` |
| `prohibitions/self-label-opener` | `style/self-label-opener` |

Rule ids are public API and renaming one is a major version — **which is exactly why this
happens now.** Nothing is published, so the rename is free today and permanently expensive
from `#42` onward. `banned-word` also becomes `flagged-word`, because the finding is an
observation, not a verdict.

`scripts/check-docs.mjs` hardcodes the group list in its rule-id check. It must be updated
in the same change or the check silently stops validating the renamed group.

### 2. The flagged-word list is tiered, and the list may be large

| Tier | Behaviour | Examples |
| --- | --- | --- |
| **High-signal** | Fires on presence, `warn` | `delve`, `tapestry`, `in today's fast-paced`, `navigate the landscape` |
| **Contextual** | Contributes to a density score only; never fires alone | `leverage`, `crucial`, `robust`, `seamless`, `foster` |

This keeps ADR-003's constraint intact rather than dropping it: `seamless` and `robust` are
*on* the list, they simply cannot fire by themselves. One `seamless` is writing. Six of
them plus four `leverage`s is a pattern worth a second look. Because size no longer drives
false positives, the list can grow as far as is useful.

**Matching is tokenise-then-set-lookup, not N regexes**, or the ReDoS budget in
[threat-model.md](../threat-model.md) T1 is spent on a word list.

**Output shape:** one `info` per occurrence carrying offsets, so an editor can highlight
inline; plus one `warn` when density crosses the threshold. The CLI collapses the `info`
run into a count; a live editor highlights each one. Same findings, two surfaces.

### 3. The shipped baseline is measured from generated text, and is one-sided

`tells/flat-rhythm` and `tells/tricolon-density` compare against a **percentile within a
measured distribution of generated LinkedIn posts** — not against the user, and not against
any human corpus.

> `tells/flat-rhythm` — sentence rhythm flatter than 85% of the generated posts measured

That statement is complete, checkable, and makes **no claim about human writing at all**.
It needs no human reference corpus, which removes the one-author problem by removing the
requirement. A user with their own corpus still calls `computeBaseline`, and that becomes a
**second, additive** comparison rather than a prerequisite:

- **No corpus:** "flatter than 85% of generated posts measured"
- **With a corpus:** that, plus "and flatter than your own usual range"

`counts/short` and `counts/long` stay personal-only. "Outside your usual length" has no
generic equivalent — post length varies legitimately by author — and they are `info` and
`warn`, so silence costs nothing.

**The generated corpus is a proxy and must be labelled as one.** The tool models how a post
*reads to a reader*, and readers' intuitions were formed by reading generated text — but
"text a model produced" and "text readers perceive as generated" are not the same set. That
gap belongs in Honest Limits, not in a footnote.

### 4. Absence features are worth more than presence features

What separates generated from written prose is mostly what is *missing*:

| Signal | Observable |
| --- | --- |
| No cost — nothing the writer paid for | No number, named tool, failure mode, or first-person experience claim |
| No asymmetry — every section weighted equally | Paragraph-length coefficient of variation |
| No surprise — nothing unpredictable from the opening | Not currently measurable; recorded, not built |
| Even information density | Variance across per-sentence countable features |

Word lists detect presences, which is why they underperform and why they are the layer that
rots fastest. Priority order for effort is the inverse of the order of ease: **variance >
format > phrasing > vocabulary.**

**Absence features must be conditioned on post type; presence features need not be.** "No
first-person claim" is meaningless without knowing what kind of post it is. "Nine flagged
words in 300" means the same thing regardless. `tells/no-specifics` is currently specified
as on-by-default with no type gate, and by this rule it needs one.

### 5. Post type is detected, shown, and overridable

`PostType` becomes an open taxonomy rather than a closed union — the fixture
`cancun.md` fits none of the seven current members. The tool proposes a type, displays it,
and the user changes it. Two guardrails:

- **Low confidence defaults to the permissive type**, so a wrong guess never causes a
  false fire.
- **Print the distribution of detected types before shipping the detector.** A classifier
  that puts most posts in one bucket is not classifying. This project has already built
  three that did exactly that (CLAUDE.md, Lessons Learned).

An overridable, visible guess is a different risk from the silent classifiers that failed
here before, and the override rate is a free, continuous measure of its accuracy.

### 6. Findings report the observable, not the verdict

> ✗ "This reads as AI-generated"
> ✓ "Sentence lengths are unusually uniform — 14, 15, 13, 15, 14 words"

The second is a fact about the text. It is equally true and equally actionable whether the
writer was a model or a careful non-native speaker, and only the second tells anyone what to
change. The aggregate framing, if it appears at all, appears once and by request — never on
an individual finding.

This is the operative form of [compliance-matrix.md](../compliance-matrix.md) C1. The claim
the package may make is *"this reads the way generated text reads"*. The claim it may never
make is *"this is generated"*, which is a fact it cannot know.

### 7. Every candidate feature passes a discriminant test before it ships

The features that make text read as generated overlap almost entirely with the features that
make text read as **formal or second-language English**: uniform sentence length, low
lexical variety, taught connectives, few contractions, few idioms. Published work on AI
detectors found they flagged a large share of TOEFL essays by non-native writers while
flagging almost none by US-born students — those detectors were measuring low perplexity,
and careful non-native prose is low perplexity.

`doNotNormalise` protects regional English from `style/*` by listing patterns. **Nothing
protects it from `tells/*`, because statistical rules have no pattern to list.** So the
protection has to be a measurement:

**For every candidate feature, measure separation on two axes — generated vs written, and
formal vs casual. If a feature separates register as strongly as it separates provenance,
it does not ship.**

The second axis is runnable with data already on hand: the Medium corpus splits by register,
so each feature's separation on the technical/essay axis is one extra column in the same
histogram. No new corpus, no new tooling.

The personal baseline is the appeal mechanism for anyone this still misjudges: a writer whose
natural register is formal computes their own and the generic threshold defers to it. That is
a second job for machinery already being built, and it should not be designed away.

### 8. The corpus is endorsement, not provenance

An earlier draft of this decision added a `source: mine | assisted | generated` label per
fixture. **Rejected.** The test was unanswerable — it required sentence-level recall across
five years — and the premise was wrong. The tool cannot know who wrote a text, and neither
can a reader; modelling the reader is the honest design, so provenance is irrelevant to the
product.

What a negative fixture actually asserts is *"if the linter fires on this, the linter is
wrong"* — a claim about **desirability**, not authorship. The author can answer that today,
about any post, without remembering anything. That is what `<!-- voice: reference -->`
already is, and it needs no replacement.

It does need to be applied deliberately. All 13 LinkedIn fixtures carried the marker from a
bulk edit, which turns an endorsement into a default and makes it meaningless. **Stripped
2026-08-11.** Re-add per file, only where the writing is genuinely what the author wants to
sound like.

### 9. A profiling spike gates Phase 0c and 0d

Before any rule is built on a measured feature: generate a **stratified** corpus of AI
LinkedIn posts over the author's own topics, labelled by prompt sophistication — naive,
well-prompted, human-edited. Extract features. Print every distribution.

Stratification is the experiment, not a nicety. A corpus built from naive prompts measures
lazy output, and a tool calibrated on lazy output flags only what people already spot
unaided. **Features must still separate at the hardest tier**, or they are theatre.

If nothing separates at that tier, that is the finding, and it arrives for the cost of a
spike instead of 32 points of rules.

## Consequences

- **A new user gets real thresholds on the first run.** The gap between having a corpus and
  not having one narrows from "the best rule is disabled" to "you get one comparison instead
  of two".
- **The maintainer's writing is never used to judge anyone else's.** It keeps exactly one
  job: the negative-fixture regression suite, which is development-time validation and is
  never shipped.
- **A recurring maintenance cost is accepted.** The generated corpus dates as models change,
  fastest at the vocabulary layer and slowest at the variance layer. The baseline carries a
  measurement date, and findings that depend on it can say so.
- **Some intuitive features will not survive the discriminant test**, including possibly the
  most intuitive ones. That is the test working.
- **`style/*` and `tells/*` are platform-independent**, unlike `escape/*`. That does not
  change scope — see [prd.md](../prd.md) §5.2, where other platforms stay out because nobody
  has *observed* them — but it does mean the two halves of this package have different
  natural boundaries and should not be planned as one thing.
- **The severity contract is untouched.** Everything here is `warn` or `info`. The three
  error groups are unchanged, which is what keeps the uncertain half of the package from
  contaminating the certain half.
