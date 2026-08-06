# linkedin-lint — DevOps and CI/CD

**Status:** v1.0, 2026-08-06.

A published package, so the release process is the part that matters. Everything else is
a normal TypeScript library.

---

## 1. Environments

There is one: the developer's machine, plus CI. No servers, no deploys, no staging.

That is the practical benefit of a pure library. There is nothing to host.

---

## 2. CI

GitHub Actions, on every push and pull request. Node 18, 20 and 22.

```
lint          eslint
types         tsc --noEmit
test          vitest run
escape        the escaping suite alone, including property tests
redos         timing assertions on every pattern
negatives     real published posts → zero errors, no false warnings
deps          assert ZERO runtime dependencies
pack          npm pack → install the tarball in a temp dir → run the CLI
```

Three of these are unusual enough to justify:

**`deps`** is a failing test, not a policy note. `package.json` must have no
`dependencies` key or an empty one. The value of "zero dependencies" is that it cannot
drift, and the only way to guarantee that is to break the build when it does.

**`negatives`** runs the author's real published posts through the linter and fails if
any produces an `error`, or any of the three narrowed tell rules fires. If a rule
triggers on genuinely good writing, the rule is wrong. This is the test that keeps the
tool usable rather than something people disable.

**`pack`** installs the actual tarball and runs the CLI. It is the only thing that
catches a broken `files` list or a wrong `exports` map, which are invisible locally and
total failures for a consumer.

No secrets in CI except the npm token, and that is only available to the release
workflow.

---

## 3. Versioning

Semver, interpreted strictly, because consumers pin this exactly.

| Change | Bump | Why |
| --- | --- | --- |
| **Escaping behaviour changes at all** | **major** | It is a content-integrity change. A consumer must opt in deliberately |
| Rule id renamed or removed | **major** | Ids are public API. People suppress by id |
| Severity raised, e.g. `warn` → `error` | **major** | It will start blocking someone's pipeline |
| `Finding` field removed or retyped | **major** | |
| `--json` field removed or changed | **major** | |
| New rule added | minor | It may add warnings, but it will not block |
| Default threshold changed | minor | Documented as defaults |
| Severity lowered | minor | |
| Fold constants adjusted | minor | Documented as approximate and configurable |
| New optional `Finding` field | minor | |
| Bug fix that does not change escaping | patch | |
| Docs, tests, internal refactor | patch | |

**A change to escaping is never a patch.** That is the single most important line in
this document. A consumer who takes a patch expecting a bug fix and gets different
escaping behaviour has had their content-safety guarantee changed without deciding to.

---

## 4. Release

Tag-triggered, published from CI only. Never from a laptop.

```bash
# 1. everything green on main
npm test && npm run lint && npx tsc --noEmit

# 2. bump, per the table above
npm version minor          # or major / patch

# 3. push the tag — this triggers the release workflow
git push --follow-tags
```

The release workflow:

```
1. re-run the full CI matrix
2. npm pack
3. install the tarball in a clean temp dir and run the CLI
4. npm publish --provenance --access public
5. create the GitHub release from the tag
```

Step 3 runs again in the release workflow even though CI already did it. Publishing a
broken tarball is not recoverable in the same way a bad commit is.

**Provenance is on.** It records which workflow and which commit produced the tarball,
so anyone can verify a version came from this repository. It is the only real mitigation
for typosquatting and account compromise
([threat-model.md](./threat-model.md) T2, T7).

### Release requirements

- npm account with **two-factor authentication** required for writes
- A **granular automation token scoped to this package only**, in GitHub Actions
  secrets
- The token is never in a `.npmrc`, never on a developer machine

---

## 5. Package contents

```jsonc
{
  "files": ["dist", "bin", "README.md", "LICENSE"],
  "exports": {
    ".": { "types": "./dist/index.d.ts", "import": "./dist/index.mjs", "require": "./dist/index.cjs" },
    "./package.json": "./package.json"
  },
  "bin": { "linkedin-lint": "./bin/cli.js" },
  "engines": { "node": ">=18" },
  "sideEffects": false
}
```

Fixtures, docs and tests are **not** shipped. Fixtures in particular contain post text,
and while it is all published text, there is no reason to distribute it.

`sideEffects: false` so bundlers can tree-shake a consumer that only wants
`escapeCommentary`.

---

## 6. Local development

```bash
git clone git@github.com:shenba1712/linkedin-lint.git
cd linkedin-lint
npm install
npm test
npm run cli -- test/fixtures/pick-post.txt
```

Working against Cadence at the same time:

```bash
# in linkedin-lint
npm link
# in cadence
npm link linkedin-lint
```

Unlink before committing anything in Cadence. A linked package in a lockfile is a
confusing bug later.

---

## 7. Branching

Small solo project, so: work on `main`, or a short branch for anything touching
escaping.

The one rule: **anything touching `src/escape.ts` goes on a branch and gets a PR**, even
solo. Not for review, but because the diff deserves to be looked at once on its own,
away from other changes.

---

## 8. Release checklist

- [ ] Full CI matrix green on Node 18, 20 and 22
- [ ] `deps` check passing — still zero runtime dependencies
- [ ] `negatives` check passing — real posts produce no errors or false warnings
- [ ] The version bump matches the table in §3. **If escaping changed, is this a
      major?**
- [ ] `npm pack`, install the tarball in a clean directory, run the CLI
- [ ] `README.md` reflects any new rule or flag
- [ ] `docs/rules-reference.md` updated for any new or changed rule
- [ ] `CHANGELOG.md` entry, with anything breaking called out first

---

## 9. Costs

Nothing. GitHub Actions on a public repo, and npm publishing, are both free.

The only recurring obligation is attention: an npm package other people install is a
small ongoing commitment, and the README's contributing section deliberately asks for
one specific thing — a post that published truncated — because that is the report worth
responding to.
