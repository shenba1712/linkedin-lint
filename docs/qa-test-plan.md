# linkedin-lint — QA and Test Plan

**Status:** v1.0, 2026-08-06.

One thing must never be wrong: **escaping**. Everything else is ordinary. Test effort
is allocated accordingly, and the escaping suite is allowed to be larger than the rest
of the tests combined.

---

## 1. Tooling

Vitest. Nothing else.

Every function under `src/` is pure, so there are **no mocks anywhere**. That is the
main practical payoff of the pure-core rule — a test is an input and an expected
output.

`bin/cli.ts` is tested by running it as a subprocess against fixture files and
asserting on stdout, stderr and the exit code.

---

## 2. Escaping — the suite that matters

### 2.1 Table cases

| Id | Input | Expected |
| --- | --- | --- |
| E1 | `pick()` | `pick\(\)` |
| E2 | `pick(user, ['name'])` | every `(`, `)`, `[`, `]` escaped |
| E3 | `Pick<T, K>` | `<` and `>` escaped |
| E4 | `{ name: string }` | `{` and `}` escaped |
| E5 | `K extends keyof T` | unchanged — no reserved characters |
| E6 | `a_b_c` | each `_` escaped |
| E7 | `#shenbabuilds` | `#` escaped |
| E8 | `@someone` | `@` escaped |
| E9 | `~`, `*`, `\|` | each escaped |
| E10 | `\(` (already escaped) | **unchanged.** No double escaping |
| E11 | `\` alone at end of string | flagged `escape/lone-backslash`, handled without crashing |
| E12 | `\\(` (escaped backslash then paren) | both handled correctly |
| E13 | `""` empty string | `""`, no findings |
| E14 | 3,000 characters of only `(` | every one escaped, completes fast |
| E15 | Emoji plus reserved characters | emoji untouched, offsets still correct |
| E16 | Unicode Mathematical Bold plus reserved | bold untouched |
| E17 | `\r\n` and `\n` mixed | newlines preserved exactly |
| E18 | A URL with `?a=(b)&c=[d]` | escaped, so a first comment with a tracking link survives |

### 2.2 Property tests

The two guarantees, over generated inputs that include every reserved character at
random positions, plus emoji, newlines and astral-plane characters:

```
escape(escape(s)) === escape(s)        // idempotent
unescape(escape(s)) === s              // lossless
```

At least 10,000 generated cases. These two properties are worth more than the whole
table above, because they cover the combinations nobody thought to write down.

### 2.3 Real-post fixtures

Every published post is a fixture. For each one:

1. `escape` it
2. `unescape` the result
3. Assert it equals the original exactly

**E-REAL-1** is the `pick()` post, because it is the reason the package exists. It
contains `(`, `)`, `[`, `]`, `<`, `>`, `{`, `}` — eight reserved characters across six
kinds — and unescaped it would publish as two words.

### 2.4 The worst-case fixture

One synthetic post containing every reserved character, emoji, both unicode bold
variants, a bracketed URL, mixed newlines, and an already-escaped sequence. If that
round-trips, the escaper works.

### 2.5 The regression rule

**Every post that publishes truncated becomes a fixture before the bug is fixed.** A
bug report with the exact text is the most valuable contribution this project can
receive, and the README asks for it.

---

## 3. ReDoS tests

Rules are patterns over user-supplied text, running inside other people's pipelines.
A catastrophic backtrack is a denial of service in someone's CI.

Every regex in the package gets:

- A **pathological input** test: long runs of the characters the pattern cares about,
  nested repeats, and near-matches that fail at the last character.
- A **timing assertion**: the call completes in under 50ms for a 3,000-character input.

The escaper has no regex at all — it is a character loop — which removes the highest
risk surface by construction. That is one of the reasons it is written that way.

New rules cannot merge without this test. It is item 2 of the five in
[rules-reference.md](./rules-reference.md) §"Adding a rule".

---

## 4. The negative-fixture rule

**The most important test in the package after escaping.**

Run every real published post through `lint()` with the author's own configuration and
baseline, and assert:

- **Zero `error` findings**
- **Zero findings from the three narrowed tells** (`tells/cliche-opener`,
  `tells/rhetorical-close`, `tells/tricolon-density`)
- No `prohibitions/*` finding that contradicts the author's actual usage

If a rule fires on genuinely good published writing, **the rule is wrong, not the
writing.** This test is what keeps the linter usable rather than something you disable
after a week.

Fixtures: the four published LinkedIn posts, plus six Medium pieces for the longer-form
register.

---

## 5. Rule tests

Each rule needs positive and negative cases.

| Group | Positive | Negative |
| --- | --- | --- |
| `counts/*` | A post over the limit, one under the baseline minimum | Posts inside the measured range |
| `fold/*` | A 200-character first sentence; a fold landing mid-word | The DynamoDB post, whose 94-character hook survives comfortably |
| `prohibitions/*` | Each banned word; 5 hashtags; a question opener | Real posts. Specifically: `seamless` and `robust` must **not** fire, since they appear in good writing |
| `tells/flat-rhythm` | Generated prose with uniform sentences | All ten real fixtures |
| `tells/no-stake` | A `postType: 'opinion'` post with no first-person claim | A `postType: 'mechanism'` post with none — must **not** fire |
| `tells/cliche-opener` | `X is not Y. It is Z.` as sentence one | The same shape in paragraph four — must **not** fire |
| `tells/rhetorical-close` | "Isn't that fascinating?" | "What's another function whose type is hard to get right?" — a real invitation, must **not** fire |
| `bold/code-identifier` | `𝐩𝐢𝐜𝐤()`, `𝐏𝐢𝐜𝐤<𝐓, 𝐊>` | `𝐖𝐡𝐚𝐭 𝐢𝐭 𝐢𝐬:` — a label, must **not** fire |
| `bold/over-budget` | 5 spans | 3 spans |
| `similarity/*` | The same post twice | Two different posts on the same topic |

The `bold/code-identifier` negative case matters: the whole point of the rule is that
labels are fine and identifiers are not. A rule that fires on both is just a ban on
bold.

---

## 6. Baseline tests

| Case | Expected |
| --- | --- |
| `computeBaseline` over the four published posts | Percentiles match hand-computed values |
| `computeBaseline` over fewer than 10 texts | `lowConfidence: true` |
| `lint` with no baseline | Tell findings still work, and their **messages say the fallback was used** |
| `lint` with a baseline | Messages quote the actual baseline number |

That third row is a correctness case, not a nicety. A tool reporting "below your
baseline" when it has no baseline is lying to the user.

---

## 7. CLI tests

Run as a subprocess. Assert stdout, stderr and exit code.

| Id | Case | Expected |
| --- | --- | --- |
| C1 | Clean post | Exit 0, two lines, "Safe to publish" |
| C2 | Post with an escaping error | Exit 1, "Not safe to publish" |
| C3 | Post with warnings only | **Exit 0.** The CI-gate decision |
| C4 | Missing file | Exit 2, message on stderr |
| C5 | Invalid config | Exit 2, names the bad key |
| C6 | Unknown config key | Exit 2. **Not a silent ignore** |
| C7 | `--escape` | Only the escaped body on stdout; diagnostics on stderr |
| C8 | `--json` | Valid JSON matching the documented shape |
| C9 | `--fix` on a dirty git tree | Refuses without `--force` |
| C10 | `--no-color`, `NO_COLOR`, non-TTY | No ANSI codes, severity words still present |
| C11 | `--stdin` | Reads stdin, same output |

C3 and C7 are the two that make it usable in a pipeline.

---

## 8. Manual checks

Things tests cannot cover.

- [ ] **Calibrate the fold.** Publish one post, screenshot on a phone, compare against
      `foldPositions`. **Adjust the constants to the observation**, not the other way
      round. It is undocumented product behaviour, so looking is the only method
- [ ] Unicode bold rendering on iOS, Android and desktop web
- [ ] Install the published tarball in a clean directory and run the CLI. Catches a
      broken `files` list or `exports` map
- [ ] Confirm the installed package has **zero** `node_modules` entries of its own

---

## 9. CI gates

Every push and PR:

```
lint          eslint
types         tsc --noEmit
test          vitest run
escape        the escaping suite alone, including property tests
redos         timing assertions
negatives     real posts produce zero errors and no false warnings
deps          assert zero runtime dependencies — a hard failure, not a warning
pack          npm pack, then install the tarball and run the CLI
```

`deps` is a real test, not a policy note. The value of "zero dependencies" is that it
cannot drift, and the only way to guarantee that is to fail the build.

---

## 10. Coverage intent

**Must be covered:** escaping in every branch, every rule with positive and negative
cases, the negative-fixture suite, ReDoS timing, CLI exit codes.

**Should be covered:** baseline percentiles, fold line-awareness, similarity
thresholds.

**Need not be covered:** terminal colour output, the exact column alignment of the
human-readable format.
