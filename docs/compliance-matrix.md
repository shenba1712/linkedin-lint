# linkedin-lint — Compliance Matrix

**Status:** v1.0, 2026-08-06.

A published open-source package. The obligations are about licensing, honest claims, and
the trademark in the name.

Nothing here is legal advice. Unsettled items are marked as such rather than guessed at.

---

## 1. Licensing

| # | Item | Position |
| --- | --- | --- |
| L1 | Package licence | **MIT.** Maximum reuse for a small utility, and it matches Context Compiler |
| L2 | `LICENSE` file present and the year correct | Required before the first publish |
| L3 | `license` field in `package.json` matches | Required |
| L4 | Runtime dependency licences | **No runtime dependencies**, so nothing to review. Asserted by a CI test |
| L5 | Dev dependency licences | TypeScript (Apache-2.0), Vitest (MIT), ESLint (MIT). Permissive, and dev-only so they are not distributed |
| L6 | Contributed code | MIT by default via the GitHub terms. No CLA — disproportionate for a package this size |

The zero-dependency rule quietly solves most licence compliance. Nothing is
redistributed except this package's own code.

---

## 2. The name and LinkedIn's trademark

The genuinely open question.

| # | Item | Position |
| --- | --- | --- |
| N1 | Using "linkedin" in an npm package name | Common practice for interoperability tools, and nominative use is generally accepted for describing what a tool works with. **Not confirmed against LinkedIn's brand guidelines** |
| N2 | Implying endorsement | **Actively avoided.** The README must never suggest this is official, affiliated, or approved |
| N3 | Using LinkedIn's logo or brand assets | **Never.** No logo, no brand colours, no icons |
| N4 | If LinkedIn objects | Rename. The package is small, the ids are namespaced by rule group not by product name, and a rename costs one major version |

**Action before the first publish:** add a one-line disclaimer to the README —
*"Not affiliated with or endorsed by LinkedIn."* Cheap, and it removes the most likely
objection.

---

## 3. Honest claims

Not a legal obligation, but the thing most likely to damage the project's reputation,
and reputation is the actual asset here.

| # | Claim risk | How it is handled |
| --- | --- | --- |
| C1 | Implying it detects AI-written text | It cannot, and the docs say so. Findings report **flat rhythm**, which is a narrower, true claim |
| C2 | Implying the fold positions are exact | Printed with a `~`, documented as observed rather than specified, configurable, and the CLI footer tells you to calibrate |
| C3 | Implying character limits are official | Documented as defaults to verify, since LinkedIn does not publish them and they drift |
| C4 | Implying escaping guarantees a good post | The verdict is **"Safe to publish"**, never "Good post". No score out of ten |
| C5 | Implying the similarity check is semantic | Stated as lexical, with the limitation spelled out |
| C6 | Overstating maintenance | The README will say what is maintained. If it stops, that gets said too |

C1 is the one that matters. "AI detector" is a claim the whole field gets wrong, and
making it would be both dishonest and easy to disprove.

---

## 4. Platform terms

| # | Item | Position |
| --- | --- | --- |
| P1 | Does this package access LinkedIn? | **No.** No network calls anywhere. It transforms and inspects strings |
| P2 | Does it help anyone violate LinkedIn's terms? | No. It helps people post their own content correctly through the official API |
| P3 | Does it document undocumented behaviour? | Yes — the fold positions. Observed from public product behaviour, marked as approximate, no reverse engineering of anything private |
| P4 | Does it encourage automation LinkedIn prohibits? | No. It has no publishing capability at all, by design |

P1 is why this section is short. A package with no network access has very little
relationship with a platform's API terms.

---

## 5. Accessibility

An unusual entry for a CLI, but the package **takes a position** on accessibility
through the `bold/code-identifier` rule, so it should be consistent.

| # | Commitment | Where |
| --- | --- | --- |
| A1 | Severity is never conveyed by colour alone. The word is always printed | [cli-design.md](./cli-design.md) §8 |
| A2 | `NO_COLOR` and non-TTY are honoured | cli-design.md §8 |
| A3 | No emoji in output — it breaks alignment and reads badly in CI logs | cli-design.md §8 |
| A4 | The `bold/code-identifier` rationale is documented so it is a reasoned position, not a preference | [rules-reference.md](./rules-reference.md) |

A tool that tells people their unicode bold breaks screen readers should not produce
output that is itself hard to read.

---

## 6. Privacy

| # | Item | Position |
| --- | --- | --- |
| D1 | Does it collect anything? | **No.** No telemetry, no analytics, no phone-home. Ever |
| D2 | Does it store anything? | No. Pure functions. The CLI reads a file and writes stdout |
| D3 | Does user text leave the machine? | **No.** No network access exists in the package |
| D4 | Fixtures in the repo | Published posts only. No unpublished drafts, no personal baseline, no style corpus |

D1 deserves emphasis: adding telemetry to a linter would be a betrayal of the one thing
that makes a zero-dependency pure-function package trustworthy.

---

## 7. Open items

| Item | Blocks | Action |
| --- | --- | --- |
| **Employment contract IP clause** | Publishing publicly under the author's own name | Read the contract. Most do not claim personal projects built on personal time and equipment, and German law generally favours the employee, but it should be checked rather than assumed |
| N1 — LinkedIn brand guidelines on the package name | Nothing hard. Worth a read | Skim the guidelines; add the disclaimer regardless |
| Employer social-media or external-contribution policy | Possibly publishing | Read it once |

The first item is the real gate, and it gates **publishing**, not building. All of Phase
0 can be written and tested privately while it is resolved.
