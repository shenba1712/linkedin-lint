# linkedin-lint — Disaster Recovery

**Status:** v1.0, 2026-08-06.

There is no database, no server and no user data, so this is not really about recovery.
It is about **what to do when a bad version reaches other people**.

Once a version is published, it is in other people's lockfiles. That is the only
irreversible thing this project can do.

---

## 1. What could actually go wrong

| # | Scenario | Likelihood | Impact | Playbook |
| --- | --- | --- | --- | --- |
| 1 | An escaping bug ships | Low | **Severe.** Consumers publish truncated posts | §2 |
| 2 | A rule hangs on some input (ReDoS) | Low | High. Breaks consumer builds | §3 |
| 3 | A broken tarball — bad `files` or `exports` | Medium | High. The package will not import | §4 |
| 4 | A breaking change shipped as a minor or patch | Medium | High. Silently breaks pinned consumers | §5 |
| 5 | npm account or token compromise | Very low | Critical | §6 |
| 6 | Repo lost locally | Low | Low. It is on GitHub | §7 |
| 7 | Maintainer stops maintaining | Certain, eventually | Medium | §8 |

Scenario 3 is the most likely of the serious ones, and also the cheapest to prevent —
which is why `npm pack` plus a tarball install runs in both CI and the release workflow.

---

## 2. An escaping bug shipped

The worst case. Consumers trusted `escapeCommentary` and their posts truncated in
public.

```
1. Reproduce it. Add the exact reported text as a fixture FIRST,
   before touching the implementation. The fixture is the deliverable
2. Fix, and confirm the property tests still hold:
      escape(escape(s)) === escape(s)
      unescape(escape(s)) === s          # s not already escaped
      escape(unescape(escape(s))) === escape(s)
3. Publish a patch immediately if the fix restores previously-correct
   behaviour. Publish a MAJOR if the fix changes what correct output
   looks like
4. npm deprecate the broken versions with a message that names the
   SYMPTOM, not the cause:
      "Posts containing ( may publish truncated. Upgrade to 1.2.1."
   Someone searching "my LinkedIn post truncated" needs to find that string
5. Open a GitHub advisory
6. Tell consumers to re-run --escape on anything already queued.
   Text escaped by the broken version is still wrong even after upgrading
```

Step 6 is the one that is easy to forget. Fixing the library does not fix the strings
already sitting in someone's scheduling queue.

---

## 3. A rule hangs

```
1. Identify the pattern from the reported input
2. Add the input as a pathological-input test with a 50ms timing assertion
3. Rewrite the pattern without nested quantifiers, or replace it with a
   character loop as the escaper already does
4. Patch release
5. If a fix is not quick, ship a patch that DISABLES the rule by default
   and say so in the release notes. A missing warning is much better than
   a hung build
```

Step 5 is the right instinct in general: when a rule is the problem, turning it off is
an acceptable ship. When escaping is the problem, it is not.

---

## 4. A broken tarball

The package will not import, or the CLI is missing.

```
1. Reproduce: npm pack, then install the tarball in a clean temp directory
2. Almost always the `files` list or the `exports` map
3. Patch release
4. npm deprecate the broken version — it is useless, so nobody should resolve to it
```

Prevention is the `pack` job, which installs the real tarball and runs the CLI. It runs
in CI **and** again in the release workflow, because a broken publish is not recoverable
the way a bad commit is.

---

## 5. A breaking change shipped as a minor

Someone pinned `^1.2.0`, got `1.3.0`, and their build broke.

```
1. Do not try to "unbreak" it by reverting behaviour in another minor.
   That breaks the people who already adapted
2. Publish the breaking change properly as the next major
3. Publish a patch to the previous minor that restores the old behaviour
4. npm deprecate the mis-versioned minor, pointing at both options
```

Prevention is the table in [devops-cicd.md](./devops-cicd.md) §3 and the release
checklist item that asks directly: **if escaping changed, is this a major?**

---

## 6. npm account or token compromise

```
1. Revoke the automation token immediately
2. Change the npm password, confirm 2FA is required for writes
3. Read the version list. Is there a version you did not publish?
4. If yes:
     - npm deprecate it with a security message
     - npm unpublish ONLY inside the 72-hour window and only if nothing
       depends on it
     - open a GitHub advisory
     - publish a clean version
5. Verify provenance is still enabled, and check which workflow ran
6. Rotate the token, scoped to this package only
```

Provenance is what makes step 5 possible at all: it records the workflow and commit that
built each tarball, so a publish that did not come from this repository is visible.

---

## 7. Local repo lost

`git clone`. There is nothing else. No state, no data, no environment to rebuild.

The only irreplaceable thing is uncommitted work, so commit often — which is normal
advice, and here it is the entire backup strategy.

---

## 8. Unmaintained

This will happen eventually, and pretending otherwise is how packages become traps.

The honest handling:

- The README's "Honest limits" section already tells people what the package does not
  do, so nobody is surprised later.
- If it goes unmaintained, **say so in the README and deprecate on npm** with a message
  pointing at the fork-friendly MIT licence. A clear "not maintained" is far better than
  a package that looks alive.
- The design makes it forkable on purpose: zero dependencies, pure functions, one I/O
  file, and a rules reference that documents every threshold. Someone can pick it up
  without asking anything.

---

## 9. Recovery targets

| Thing | Target |
| --- | --- |
| Escaping bug: fixture added, fixed, published | Same day |
| Deprecate a bad version | Within an hour of confirming |
| Broken tarball fixed | Same day |
| Token revoked after suspected compromise | Immediately |
| Repo restored | Minutes. `git clone` |

The escaping target is same-day because the harm continues while the version is live.
Everything else can wait a day without anyone being hurt.
