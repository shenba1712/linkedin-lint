# public fixtures

**The only fixtures committed to this repo.** Everything else in `test/fixtures/`
is gitignored and lives on the maintainer's machine.

## Why

The full corpus is 256 published articles. Committing it would mirror an entire
Medium archive into a public, search-indexed GitHub repo — including ~74 pieces
the author unlisted precisely so they would not be distributed. Unlisting is a
topic decision, not a quality one, and republishing them here would quietly
override it.

Test fixtures do not need to be public to be useful.

## What belongs here

| File | Purpose |
| --- | --- |
| `worst-case.txt` | Every reserved character, emoji, both Unicode bold variants, a bracketed URL, mixed newlines, an already-escaped sequence. **If this round-trips, the escaper works** |
| `pick-post.txt` | The `pick()` post — fixture E-REAL-1, the reason the package exists. Published on LinkedIn, and the author is happy for it to be mirrored |
| a handful of others | Only with explicit consent, one file at a time |

## What CI can and cannot check

**Can:** escaping correctness in every branch, round-trip properties, ReDoS timing,
rule unit tests, the CLI contract. The synthetic worst-case file covers every
reserved character, so escaping regressions are caught here.

**Cannot:** the negative-fixture suite against the real corpus, or the voice
baseline. Those are the maintainer's own calibration and they run locally.

```bash
npm test              # public fixtures — what CI runs
npm run test:full     # + the local 256. Run before every release
```

That split is a real gap, named rather than hidden: a rule that fires on the
author's own writing would pass CI and fail locally. `test:full` is on the release
checklist for exactly that reason.
