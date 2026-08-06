# linkedin-lint — CLI Design

**Status:** v1.0, 2026-08-06.

There is no visual design system here — this is a library with a terminal front end.
What it has instead is an **output contract**, because people put linters in
pipelines and read them at speed.

---

## 1. Principles

1. **The verdict is the last line.** People read the bottom of terminal output first.
2. **Errors and warnings are visually different**, and not by colour alone. Colour is
   absent in CI.
3. **Every finding has a location** where one exists. A finding you cannot locate is
   a finding you ignore.
4. **Quiet on success.** A clean post prints two lines.
5. **Machine-readable is first-class**, not an afterthought. `--json` is a contract.

---

## 2. Commands

```
linkedin-lint <file>              lint it
linkedin-lint <file> --escape     print the API-safe body, nothing else
linkedin-lint <file> --fold       print the post with fold lines drawn
linkedin-lint <file> --fix        apply the safe fixes, write in place
linkedin-lint <file> --json       machine-readable
linkedin-lint --baseline <glob>   compute a baseline from a corpus, print JSON
linkedin-lint --stdin             read from stdin instead of a file
```

Flags:

```
--kind post|comment      which limit applies (default post)
--type <postType>        enables tells/no-stake
--config <path>          default .linkedinlintrc.json, searched upward
--archive <glob>         enables the similarity check
--baseline-file <path>   a previously computed baseline
--no-color               also honours NO_COLOR and non-TTY stdout
--quiet                  errors only
--verbose                include info findings
```

One file at a time. Posts are written and reviewed one at a time, and batch mode would
mean designing a summary format nobody asked for.

---

## 3. Default output

```
post.txt  1,412 chars · 218 words · 11 paragraphs · hook 127

  error  escape/unescaped-paren      12:18   "(" will truncate the post from here
  error  bold/code-identifier          1:9   bold on a code identifier: "pick"
  warn   fold/hook-too-long          1:152   hook is 152 chars, mobile cuts at ~140
  warn   tells/flat-rhythm               -   sentence variance 3.1, your baseline is 6.8

  2 errors, 2 warnings. Not safe to publish.
```

Column order is severity, id, location, message. Fixed-width severity and id columns
so the messages line up and can be scanned vertically.

Location is `line:col`, or `-` for a whole-post finding.

The last line is the verdict, and it is unambiguous: **"Not safe to publish"** or
**"Safe to publish"**. Never a score.

### Clean output

```
post.txt  1,318 chars · 204 words · 9 paragraphs · hook 118

  Safe to publish.
```

Two lines. A linter that congratulates you at length is a linter you stop reading.

### With suggestions

Suggestions print indented beneath their finding, only when one exists:

```
  error  bold/code-identifier          1:9   bold on a code identifier: "pick"
         → use plain text and put the signature on its own line with blank
           lines around it. Whitespace does the same job and stays searchable.
```

---

## 4. `--escape`

```bash
linkedin-lint post.txt --escape > body.txt
```

Prints **only** the escaped body to stdout. No header, no findings, no verdict —
diagnostics go to stderr. That makes it safe in a pipe.

Exit code is still 1 if there are errors other than the escaping it just fixed, so a
pipeline cannot accidentally publish an over-limit post.

---

## 5. `--fold`

Draws the post with the fold positions marked:

```
The hardest part of DynamoDB is not the API. It is unlearning how you
think about a database.
──────────────────────────────────────────── mobile fold (~140)

With a relational database you model the data, then query it however you
like later.
──────────────────────────────────────────────────── desktop fold (~210)

DynamoDB flips that.
```

The `(~140)` is deliberate. **The tilde is the honesty.** LinkedIn does not document
the fold, so the tool shows an approximation and says so, and the footer reminds you:

```
Fold positions are approximate. Publish one post, check your phone, and set
mobile/desktop in .linkedinlintrc.json to what you actually saw.
```

---

## 6. `--fix`

Applies **only** `fixable: true` findings, which today means the `escape/*` rules.
Nothing that requires judgement is ever auto-applied.

```
post.txt  applied 6 fixes

  escape/unescaped-paren    4 fixes
  escape/unescaped-angle    2 fixes

  3 warnings remain. They need a human.
```

Writes in place. Refuses without a clean git working tree unless `--force` is passed —
overwriting an unsaved draft is not a thing a linter should be able to do quietly.

---

## 7. `--json`

```jsonc
{
  "version": "1.0.0",
  "file": "post.txt",
  "stats": { "chars": 1412, "words": 218, "sentenceLenStdDev": 3.1 },
  "findings": [
    {
      "id": "escape/unescaped-paren",
      "severity": "error",
      "message": "\"(\" will truncate the post from here",
      "start": 412,
      "end": 413,
      "suggestion": "escape as \\(",
      "fixable": true
    }
  ],
  "summary": { "errors": 2, "warnings": 2, "info": 0 }
}
```

Offsets here are **character offsets over the original text**, not line and column.
Line and column are a display concern; offsets are what a programme wants.

Adding a field is a minor version. Changing or removing one is major.

---

## 8. Colour and TTY

| Severity | Colour | Symbol fallback |
| --- | --- | --- |
| error | red | `error` in the column, always spelled out |
| warn | yellow | `warn` |
| info | dim | `info` |

Colour is **decoration only**. The severity word is always present, so piping to a
file loses nothing. Disabled automatically when stdout is not a TTY, when `NO_COLOR`
is set, or with `--no-color`.

No emoji, ever. It breaks alignment in half the terminals in use and reads badly in
CI logs.

---

## 9. Exit codes

| Code | Meaning |
| --- | --- |
| 0 | No errors. Warnings may exist |
| 1 | At least one `error` |
| 2 | Bad usage, unreadable file, invalid config |

**Exit 1 on errors only.** This is the decision that makes the tool usable as a CI
gate: it fails when a post would break, and stays quiet about style, so nobody has to
disable it to get work done.

---

## 10. Config discovery

`.linkedinlintrc.json`, searched from the file's directory upward to the git root.
`--config` overrides. No config at all is fine — defaults are conservative.

An unknown key in the config is an **error**, not a silent ignore. A typo in a config
key is otherwise invisible, and the user believes a rule is on when it is off.
