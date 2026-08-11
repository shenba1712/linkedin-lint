# Fixtures

**Published text only.** This repo is public. Nothing unpublished belongs here.

Every file is copied from the published source, not retyped and not reproduced from
memory. Byte-accuracy is the whole point: these feed the escaper's round-trip property
test and the negative-fixture suite, and a file that is 98% right passes while being wrong.

## Layout

```
linkedin/    one .txt per published LinkedIn post
medium/      one .txt per published Medium article
```

Plain UTF-8 text. Keep the Unicode Mathematical Bold characters exactly as published —
they are the input for `bold/code-identifier`. Keep hard line breaks. Strip Medium's
image captions, byline, clap count and "Press enter to view image" artifacts; keep the
prose and code blocks.

## Two jobs, opposite requirements

This corpus spans roughly 2021 to 2026 — different voices, different skill levels,
some AI-assisted and some not. That is fine, and it matters, because the fixtures
serve two purposes that want opposite things:

| Job | Wants | Does date matter? |
| --- | --- | --- |
| **Escaping fixtures** | Maximum diversity. Odd punctuation, unusual characters, code-heavy prose | **No.** A 2021 article with strange characters is an excellent escaping fixture |
| **Voice baseline** | Recency and homogeneity | **Critically.** Averaging five years of prose produces a centroid matching no actual voice |

So **every file is an escaping fixture, and only some are voice fixtures.** They are
different flags, not one.

### Three tiers, and nothing to annotate

**Settled 2026-08-11, after two reversals. This is the final shape.**

```
(no marker)                  normal — eligible, weighted by recency (18-month half-life)
<!-- voice: reference -->    4× weight, EXEMPT from decay. The current-voice anchors
<!-- voice: no -->           explicit exclusion. Rare
```

**All 256 articles are eligible.** It is all the author's writing, and excluding 210
of them threw away real signal. The files nominated as `reference` are what pin the
target to the voice as it is now, so five years of drift does not pull the centroid
backwards.

The history of this decision, since it moved twice and the reasoning matters:

1. First version: absent = eligible with decay. Correct, but I could not see the
   corpus size.
2. Second: absent = excluded, opt in. Chosen to spare the author annotating ~246
   files — but it made "not nominated" mean "not my writing", which is false.
3. Final: back to (1), for the author's reason rather than mine — *"all of these 256
   articles are prime candidates."* Nothing needs annotating, everything contributes,
   and recency weighting does the work the exclusion tier was doing badly.

**Two claims that are easy to collapse and must not be:** every piece being *eligible*
is not the same as every piece being a *decay-exempt anchor*. The second would be a
flat mean across five years of changing voice, which is exactly what the author warned
about when she said the corpus holds "different voices, mindsets, writing skills".

### Current nominations — 33 files

**Corrected 2026-08-11.** This said 46: 13 LinkedIn posts "all of them" plus 33 Medium
articles. The 13 LinkedIn markers were a **bulk edit that was never agreed**, and they have
been stripped. 33 Medium articles remain, which is the figure `NEXT.md` B4 recorded all
along — the discrepancy was the bulk edit, not the record.

**Nomination is per file and deliberate.** A marker means *"if the linter fires on this, the
linter is wrong"* — a judgement about how you want to sound. Applying it in bulk turns an
endorsement into a default, which makes it mean nothing. Re-add one at a time
([ADR-007](../../docs/adr/ADR-007-flagged-not-banned-measured-baselines.md) §8).

**The register split needs re-measuring.** The old "13 technical / 33 essay" figure counted
the stripped LinkedIn posts, which were the technical contributors. Across the remaining 33,
the technical register may now fall under `computeBaseline`'s 5-contributor threshold and be
correctly flagged `lowConfidence`. Measure it before trusting any per-register percentile;
do not carry the old numbers forward.

### Voice and topic are independent — do not conflate them

**Corrected 2026-08-11.** An earlier version of this file read the ~74 unlisted
articles as a quality signal — "pieces you did not want representing you." That was
wrong. They are unlisted because the author no longer writes about those subjects
(true crime), and several are among the best-earning pieces in the archive.

Unlisting is a **topic** decision. It says nothing about the prose.

So:

| Question | Answer |
| --- | --- |
| Are unlisted pieces valid escaping fixtures? | Yes, all of them |
| Are unlisted pieces valid voice fixtures? | **Yes.** Judge by whether the prose still sounds like you, not by listing status |
| Should the tool propose those topics for new posts? | **No** — and that is a separate mechanism entirely |

The last row belongs in Cadence, not here: a retired-topics list on the idea bank.
A linter has no opinion about subject matter.

**And the unlisted set is disproportionately valuable for voice.** The true-crime and
long-form narrative pieces are `essay` register, which the recent technical work
barely covers. Excluding them would leave the essay baseline computed from almost
nothing — the exact failure `Baseline.coverage` exists to surface.

## What each group feeds

| Group | Escaping | Voice |
| --- | --- | --- |
| `linkedin/*` (13 files) | yes | **the strongest candidates** — most recent, closest to the target register. Currently **none are nominated**; the bulk markers were stripped 2026-08-11 and need re-adding one at a time |
| `medium/*` technical, recent | yes, best coverage — most code, most reserved characters | good candidates |
| `medium/*` essay, recent | yes | nominate 2-3, or the essay baseline has nothing |
| `medium/*` unlisted (~74) | yes, keep every one | **yes — strong `essay` candidates.** Unlisted is a topic decision, not a voice one |
| `medium/*` older (2021-23) | yes, keep every one | unlikely |

All 256 are escaping fixtures. Perhaps 10 are voice fixtures. Those are different
jobs and the ratio is supposed to look like this.

## The one that matters most

`linkedin/pick-typescript.txt` — the post containing `pick()`, `pick(user, ['name'])`,
`Pick<T, K>` and `{ name: string }`. Six reserved characters across four kinds. Unescaped
it publishes as two words. It is fixture **E-REAL-1** and the reason this package exists.
