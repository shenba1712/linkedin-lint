# linkedin-lint — Landing Page

**Status:** v1.0, 2026-08-06.

Follows PromptMuster's principle (`devops-cicd.md` §3.4): **a landing page is a conversion
surface, distinct from a README's discovery job.** Positioning copy is written once and
reused across both, never written twice and left to drift.

---

## 1. The unfair advantage

Most tool landing pages have to *describe* the problem. This one can **do it to you, on
your own text, in the browser, with no signup.**

`linkedin-lint` is pure functions with zero runtime dependencies and no network. That means
**the entire linter runs client-side**. Paste a real post, watch what LinkedIn would
actually publish.

That is the page. Everything else is supporting material.

It is also the strongest possible proof of the zero-dependency, pure-core claim: the demo
works because the architecture is what it says it is.

---

## 2. Hosting

**GitHub Pages, from this repo.** Static, free, no build infrastructure, and it keeps the
public package self-contained.

- One HTML page plus the bundled linter. No framework needed.
- Custom domain optional; `shenba1712.github.io/linkedin-lint` is fine to start.
- Deployed by the same CI that publishes to npm, from the same tag, **so the demo can never
  run a different version than the package**. That mismatch would be worse than no demo.
- The version is printed in the footer.

Not on Vercel: a static page needs nothing Vercel provides, and keeping the linter's
surface free of a hosting account is consistent with the rest of its design.

---

## 3. Structure

```
┌─ badge line ─────────────────────────────────────────────┐
│  ZERO DEPENDENCIES · NO NETWORK · MIT                     │
├─ hero ───────────────────────────────────────────────────┤
│  Your LinkedIn post is about to lose half its text        │
│  and nobody will tell you.                                │
│  [ install ]  [ see the bug ]                             │
├─ THE DEMO ───────────────────────────────────────────────┤
│  Two panes. Left: paste a post. Right: what LinkedIn      │
│  actually publishes. Prefilled with the pick() post.      │
│  Fold lines drawn. Findings listed live.                  │
├─ why it happens ─────────────────────────────────────────┤
│  the reserved-character rule, in four lines               │
├─ what else it checks ────────────────────────────────────┤
│  four cards: fold · counts · prohibitions · tells         │
├─ severity means something ───────────────────────────────┤
│  the three-errors-only argument                           │
├─ install ────────────────────────────────────────────────┤
│  CLI and library, side by side                            │
├─ honest limits ──────────────────────────────────────────┤
│  the same section as the README. Not buried               │
└─ footer: repo · npm · version · not affiliated ──────────┘
```

---

## 4. The demo, specified

The only interactive part, so it gets specified properly.

**Layout.** Two panes side by side on desktop, stacked on mobile with the output first —
on a phone the *result* is the point, not the input.

**Prefilled** with the `pick()` post, so the page proves itself before anyone types.

**Left pane:** a textarea. Monospace. The reserved characters highlighted inline as you
type.

**Right pane, three tabs:**

| Tab | Shows |
| --- | --- |
| **What LinkedIn publishes** | The post truncated exactly as it would be. Default tab. The truncation point marked with a red rule and "everything after this is silently dropped" |
| **API-safe** | The correctly escaped body, with a copy button |
| **Findings** | Errors, warnings, info, each highlighting its range on hover |

**Below:** the fold preview, with a mobile/desktop toggle and the honest `~` on the numbers.

**Recompute on every keystroke, debounced 120ms.** Budget: under 16ms per run, which the
linter already meets.

**Nothing leaves the browser.** No analytics, no telemetry, no fetch. Stated on the page,
next to the textarea, because someone pasting an unpublished post deserves to know that
before they paste it — and it is the kind of claim that is easy to make and easy to verify
when the CSP blocks every external host.

---

## 5. Copy

Draft copy, in the same register as the README. Hook shapes drawn from the corpus, not the
banned `X is not Y` template.

### Hero

> # Your LinkedIn post is about to lose half its text and nobody will tell you.
>
> LinkedIn's Posts API treats fifteen characters as reserved. Leave one parenthesis
> unescaped and everything after it is silently dropped. The API returns `201`. The post
> publishes. It is just missing.
>
> `linkedin-lint` escapes it correctly, then shows you where the fold cuts your hook.
>
> `npm i -g linkedin-lint`

### Above the demo

> ## Try it on a real post
>
> This is a post that was actually published. Watch what the API would have done to it.
>
> Everything below runs in your browser. Nothing is sent anywhere.

### Why it happens

> ## Fifteen characters, one silent failure
>
> The `commentary` field uses LinkedIn's little text format, where
> `( ) [ ] { } < > @ # * _ ~ | \` are reserved and must each be escaped with a backslash —
> **even when you are not using mentions or hashtags.**
>
> Unescaped, a `(` does not throw an error. It ends your post.
>
> Every technical post has `useState()` or `.filter()` or `[]` in it. This is the default
> case, not an edge case.

### What else it checks

Four cards, one line each:

| Card | Line |
| --- | --- |
| **The fold** | Your hook gets cut at ~140 characters on mobile. See exactly where |
| **Counts** | Characters against the real post and comment limits, and your own length range |
| **Prohibitions** | Banned phrases, em dashes, emoji, hashtag count — all configurable |
| **Tells** | Flat sentence rhythm, uniform paragraphs, no specifics. Calibrated to *your* writing, not a generic list |

### Severity

> ## Three things are errors. Everything else is a suggestion.
>
> Escaping failures, being over the limit, and unicode bold on a code identifier. That is
> the whole list.
>
> Everything about voice is a warning, because a linter should not have the final say on
> how you write — and because a severity level that means everything means nothing.

### Honest limits

Reused verbatim from the README. **Above the footer, not hidden**: the fold numbers are
observed rather than documented, tell detection is heuristic and cannot identify
AI-generated text, similarity is lexical and misses paraphrase.

---

## 6. Design

Shares tokens with Cadence's design system so the two look related, at a fraction of the
component surface.

- System font stack. **No web fonts** — a CDN request would break the "nothing leaves your
  browser" claim.
- Light and dark via `prefers-color-scheme`, plus a toggle.
- One accent colour. Red only for errors.
- The demo panes are the widest thing on the page; everything else is a 62-character
  measure.
- No illustrations, no stock photography, no logos.
- Two screenshots at most, and **only of synthetic content**.

---

## 7. Meta and SEO

The realistic search intent is someone typing *"linkedin post truncated"* or *"linkedin api
post cut off"* at 11pm having just watched it happen.

```html
<title>linkedin-lint — stop the LinkedIn API silently truncating your posts</title>
<meta name="description" content="An unescaped parenthesis makes LinkedIn drop
  everything after it from your published post, with no error. Paste a post and see
  what would actually publish.">
```

- OG image: the demo's own before/after, generated at build time from the `pick()` post.
- One `<h1>`, and headings that match the questions people ask.
- The phrases *"LinkedIn post truncated"*, *"post cut off"* and *"silently dropped"* appear
  in body copy naturally — that is what someone searches.
- No tracking. **No analytics at all.** Adding telemetry to a package whose selling point
  is that nothing leaves your machine would be self-defeating.

---

## 8. Requirements

| Requirement | Target |
| --- | --- |
| First-load JS | **< 60KB gzipped**, linter included |
| LCP mobile 4G | < 1.5s |
| Demo recompute | < 16ms, debounced 120ms |
| Lighthouse, all four | ≥ 95 |
| Works with JS disabled | Static content readable; the demo shows a "needs JavaScript" note |
| Accessibility | WCAG AA. Textarea labelled, tabs are real ARIA tabs, findings a list with severity in text, results announced via `aria-live` |
| CSP | `default-src 'self'`. No external host. This is what makes the privacy claim checkable |
| Demo version | Matches the published npm version, printed in the footer |

---

## 9. Not doing

- **No analytics or telemetry.** See §7.
- **No email capture.** There is nothing to send anyone.
- **No comparison table** against Buffer or Taplio. This is a linter, not a scheduler.
- **No testimonials.** Nobody has used it yet, and inventing social proof would undercut
  the one thing being sold, which is trustworthiness.
- **No "trusted by" logos.**
- **No pricing page.** It is MIT.
- **No blog.** Long-form goes on Medium, and links back.
