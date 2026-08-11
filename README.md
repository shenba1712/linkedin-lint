# linkedin-lint

**Your LinkedIn post is about to lose half its text and nobody will tell you.**

LinkedIn's Posts API treats `( ) [ ] { } < > @ # * _ ~ | \` as reserved characters
in the post body. Every one must be escaped with a backslash. Leave a parenthesis
unescaped and **everything from that character to the end of your post is silently
dropped**. The API returns `201`. The post publishes. It is just missing.

Here is a real post:

```
Writing pick() is four lines. Typing it well is the difference between code
that merely works and code the compiler protects.
```

Posted through the API without escaping, that is:

```
Writing pick
```

`linkedin-lint` escapes correctly, and then does the other things you want before
you press publish: shows you where the "see more" fold cuts your hook on mobile
versus desktop, counts characters against the real limits, and flags the phrases
that make a post read as machine-written.

No network. No API keys. No accounts. Pure functions and a CLI.

## Install

```bash
npm i -g linkedin-lint
```

Or as a library:

```bash
npm i linkedin-lint
```

## Use it

```bash
linkedin-lint post.txt
```

```
post.txt  1,412 chars · 218 words · 11 paragraphs

  error  escape/unescaped-paren      12:18   "(" will truncate the post from here
  error  bold/code-identifier         1:9    bold on a code identifier: "pick"
  warn   fold/hook-too-long         1:1-152  hook is 152 chars; mobile cuts at ~140
  warn   tells/flat-rhythm              —    sentence-length variance below baseline
  info   counts/short                   —    1,412 chars is at the low end

  2 errors, 2 warnings. Not safe to publish.
```

```bash
linkedin-lint post.txt --escape        # print the API-safe body
linkedin-lint post.txt --fold          # show the post with the fold lines drawn
linkedin-lint post.txt --json          # machine-readable findings
linkedin-lint post.txt --fix           # apply the safe fixes only
```

As a library:

```ts
import { lint, escapeCommentary, foldPositions } from 'linkedin-lint';

const findings = lint(text, { platform: 'linkedin', kind: 'post' });
if (findings.some(f => f.severity === 'error')) throw new Error('not safe');

const body = escapeCommentary(text);   // send this to /rest/posts
```

## What it checks

| Group | Checks |
| --- | --- |
| **escape** | Reserved-character escaping for the versioned Posts API. Idempotent, and round-trip safe |
| **fold** | Where "see more" cuts on mobile and desktop. Whether the hook survives it |
| **counts** | Characters against the post and comment limits, words, paragraphs, sentence-length variance |
| **style** | Flagged words and phrases, em dashes, emoji, hashtag count, question-as-opener. *Flagged* means look at it, not you may not use it |
| **tells** | The four signals that actually indicate machine-written prose |
| **bold** | Unicode pseudo-bold budget, and bold on code identifiers |
| **similarity** | Compare against an archive you supply, to catch repeating yourself |

Full list with ids, severities and thresholds:
[docs/rules-reference.md](./docs/rules-reference.md).

## Severity means something

| Severity | Meaning |
| --- | --- |
| `error` | **Do not publish.** The post will be broken or truncated |
| `warn` | Style. You are meant to overrule these sometimes |
| `info` | Observation. No action implied |

Only three things are errors: escaping failures, exceeding the platform limit, and
a broken bold budget. Everything about voice is a warning, because a linter should
not have the final say on how you write.

## About the unicode bold check

LinkedIn has no bold. Tools fake it by substituting Mathematical Alphanumeric
Symbols — `𝐩𝐢𝐜𝐤` is four mathematical symbols that look like p-i-c-k.

That is usually fine on a label. It is genuinely bad on a **code identifier**, and
the primary reason is simple: **almost nobody types these characters by hand.** They
come from a formatter, so blocking them costs no real writing anything, and what it
catches is your tooling mangling the term your post is about.

What the mangling costs a reader:

- **The bold text is not the word.** `"𝐏𝐢𝐜𝐤".includes("Pick")` is `false`, so
  find-in-page, a search box and a docs lookup all miss it.
- A screen reader announces unrelated mathematical codepoints rather than the term.
  *We have not verified this on a real screen reader yet — it is on the check list.*
- LinkedIn's search may not match it. *Also unverified, and there is reason to doubt
  it: NFKC normalisation maps every bold variant back to plain ASCII, and search
  indexes commonly normalise.*

We would rather say which of these we have measured than assert all three. An earlier
version of this README claimed the characters "cannot be copied into an editor and will
not compile". That was wrong: TypeScript rejects them, **JavaScript accepts them as a
different identifier**, and Python normalises them back and runs fine.

So `bold/code-identifier` is an error, and the tool suggests the substitute that
costs nothing: put the signature on its own line with blank lines around it.
Whitespace does what the bold was doing, better.

Labels and one emphasised sentence are fine. The budget is three spans.
([ADR-004](./docs/adr/ADR-004-bold-budget-is-an-error.md))

## About the "tells" check

Three patterns that get widely called AI tells are **not** flagged by default,
because they are also how good writers write:

- `X is not Y. It is Z.` — flagged only in the opening two sentences, where it is
  a cliché, not in the body.
- A closing question — flagged only when it is unanswerable. A real invitation is
  fine.
- Tricolons — flagged on density, never on presence.

What is flagged instead is what actually separates generated prose: flattened
sentence-length variance, uniform paragraph blocks, no first-person stake where the
post type calls for one, and no named specifics.

**The thresholds work out of the box.** They are measured from a corpus of *generated*
LinkedIn posts, so a finding says "sentence rhythm flatter than 85% of the generated posts
we measured" — a statement about the text, needing no corpus of yours and asserting nothing
about human writing. Supplying your own posts adds a second comparison; it is never
required.

**Findings say what was measured, not who wrote it.** *"Sentence lengths are 14, 15, 13, 15,
14 words"*, never *"this reads as AI"*. That is deliberate. Uniform rhythm, plain vocabulary
and few contractions are also what careful and second-language English looks like, and AI
detectors have done real damage by calling that authorship. This tool reports the
observation and leaves the conclusion to you.
([ADR-003](./docs/adr/ADR-003-calibrate-against-corpus.md),
[ADR-007](./docs/adr/ADR-007-flagged-not-banned-measured-baselines.md))

## Configuration

```jsonc
// .linkedinlintrc.json
{
  "platform": "linkedin",
  "limits":     { "post": 3000, "comment": 1250 },
  "fold":       { "mobile": 140, "desktop": 210 },
  "bold":       { "maxSpans": 3, "allowOnCodeIdentifiers": false },
  "style": {
    "emDash": "error",
    "emoji": "warn",
    "maxHashtags": 4,
    // high-signal terms fire on their own
    "words": ["delve", "game-changer", "unlock", "in today's fast-paced"],
    // contextual terms only count toward a density threshold, never alone
    "contextualWords": ["leverage", "crucial", "robust", "seamless"],
    "contextualPer1k": 12
  },
  "baseline": "./baseline.json",   // OPTIONAL. Adds a second, personal comparison
  "archive":  "./archive/*.txt"    // for the similarity check
}
```

**The limit and fold numbers are defaults, not documented facts.** LinkedIn does not
publish them and they drift. Publish one post, look at where it actually cut on your
phone, and set the numbers to what you observed.

## Honest limits

- **The fold positions are approximate.** They depend on device, font, and LinkedIn's
  current layout. Calibrate them yourself.
- **The escaping is verified against the versioned `/rest/posts` API.** The legacy
  `/v2/ugcPosts` endpoint takes plain text and needs no escaping at all — if you use
  that one, skip the escaper.
- **Tell detection is heuristic.** It cannot tell you whether a post is machine
  written. It can tell you that its rhythm is flat, which is a different and more
  useful claim.
- **A flat rhythm is not evidence of anything on its own.** Uniform sentence length, plain
  vocabulary and few contractions are also what careful, formal and second-language English
  look like. AI detectors have caused real harm by treating that as authorship — one study
  found they flagged a large share of TOEFL essays by non-native writers while flagging
  almost none by US-born students. Every measured feature here has to prove it separates
  generated-from-written more strongly than formal-from-casual before it ships, and if the
  tool misjudges your register you can override it with a baseline from your own posts.
- **The tell baseline is measured from generated text**, used as a stand-in for *text a
  reader perceives as generated*. Those are close but not the same set. It carries a
  measurement date, and it will date — vocabulary signals fastest, rhythm slowest.
- **The similarity check is lexical**, not semantic. It catches repeated framing and
  reused phrases. It will miss the same idea expressed completely differently.
- **It does not know your voice.** It knows the rules you gave it. The defaults are a
  starting point.
- **Two claims behind the bold rule are still unverified** — what a screen reader announces,
  and whether LinkedIn search matches Unicode bold. They are marked as unverified everywhere
  they appear rather than stated as fact.
- **The package never touches the network.** No telemetry, no analytics, no phone-home, ever.
  The hosted web app does collect anonymous rule counters — opt-in, no content, and the
  aggregates are published — but **none of that exists in what you install.**

## Why this exists

It was extracted from [Cadence](https://github.com/shenba1712/cadence), a
self-hosted LinkedIn content pipeline. Cadence is open too, but running it means a
LinkedIn app, a database, and a 60-day token you re-authorise by hand — worth it if
you want the whole pipeline, and a lot of setup if you only want your posts to survive
the API.

This part needs none of that. No accounts, no tokens, no network, works in thirty
seconds. So it lives here as its own package.
([ADR-001](./docs/adr/ADR-001-separate-public-package.md))

## Docs

- [prd.md](./docs/prd.md) — scope, and what this deliberately is not
- [trd.md](./docs/trd.md) — architecture and the algorithms
- [api-specifications.md](./docs/api-specifications.md) — the public API surface
- [rules-reference.md](./docs/rules-reference.md) — every rule, id, severity, threshold
- [cli-design.md](./docs/cli-design.md) — command shape and output contract
- [qa-test-plan.md](./docs/qa-test-plan.md) — the test strategy, and the property tests
- [threat-model.md](./docs/threat-model.md) — ReDoS, supply chain, npm provenance
- [security-audit.md](./docs/security-audit.md) — recurring checklist and log
- [devops-cicd.md](./docs/devops-cicd.md) — CI, versioning, release
- [disaster-recovery.md](./docs/disaster-recovery.md) — the bad-release playbook
- [compliance-matrix.md](./docs/compliance-matrix.md) — licences, platform terms, claims
- [landing-page.md](./docs/landing-page.md) · [webapp.md](./docs/webapp.md) — the hosted app
- [adr/](./docs/adr/README.md) — decisions
- [core/tickets.md](./docs/core/tickets.md) — the board

## Contributing

Bug reports very welcome, especially **a post that published truncated**. That is a
missing test case, and it is the most valuable thing you can send.

Include the exact text. Escaping bugs are almost always about one character in one
position.

## Licence

[MIT](./LICENSE)
