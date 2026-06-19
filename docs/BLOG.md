# Let AI maintain your dependency security — meet DepSentinel

> A longer-form article for sharing. Post it to a blog/newsletter/community, or excerpt it.

## "Your code never changed, but what was safe yesterday is a vulnerability today"

The apps we build today run more on **other people's open-source libraries** than on code we wrote ourselves. `lodash`, `axios`, `react`… even a small project pulls in dozens; a big one, hundreds.

And that's where the trouble starts. **New security vulnerabilities are found in those libraries constantly.** You didn't change a single line, yet a dependency that was fine yesterday can be classified as a critical CVE today.

So every time, a developer has to repeat this tedious loop:

1. **Notice** the advisory (usually missed)
2. **Decode** the English security note
3. Judge whether it **actually affects** your project
4. **Find** which version is safe to move to
5. Patch, **test, and open a PR**

It's tedious and hard. So — **most of the time it just gets ignored.** Especially on volunteer-run open source and solo projects.

## Why existing tools fall short

Tools like Dependabot and Renovate already exist. They mechanically file a PR: "bump lodash to 4.17.21." That's automation, sure.

But they leave out the part that matters — **"Is this urgent? Is it safe to upgrade? Can I ignore it?"** That judgment is still on you. PRs pile up, developers burn out, and eventually they're ignored.

## DepSentinel: AI fills the missing judgment

DepSentinel doesn't stop at detection. **An AI (Codex) reasons like a maintainer.**

For each vulnerability it:
- 🧠 **Explains the risk in plain language** — "an attacker could pollute the object prototype and alter app behavior"
- 🎯 **Judges reachability** — is it actually exploitable, or only theoretical?
- 🔧 **Opens a merge-ready fix PR** — bumps to a safe version and refreshes the lockfile

### Before / After

**Existing bot:**
> 📬 "Bump lodash from 4.17.4 to 4.17.21"
> → (Do I really have to? I'll look later…) → ignored

**DepSentinel:**
> 🛡️ "Security report — 10 advisories in lodash 4.17.4"
> 🔴 CRITICAL: prototype pollution. Fixed in 4.17.21.
> 🔧 PR: version bumped + lockfile refreshed → **just review and merge**

When the "why" is visible, you **act instead of ignoring**. That's the key difference.

## How it works (briefly)

Install it as a GitHub Action (say, every Monday) and six stages run automatically:

```
resolve deps → query OSV → filter by severity → AI impact analysis → security report issue → upgrade PR
```

- Finds vulnerabilities via **OSV.dev** (Google's public vulnerability database)
- Analyzes impact with **Codex**
- Keeps **a single, always-current issue** (no pile-up when run weekly) + opens an **upgrade PR**
- Runs only on the repo that installs it, **against its own code** (safe and within terms)

And — **even without an OpenAI key**, detection + summaries + the upgrade PR work **for free**. The key only toggles the AI explanations on.

## It actually works

On a demo fixture, DepSentinel detected **37 real advisories** across 4 libraries (critical prototype pollution in lodash/minimist, SSRF and credential leaks in axios) and **automatically opened a security issue and an upgrade PR.**

## Get started (5 minutes)

`.github/workflows/depsentinel.yml`:

```yaml
name: DepSentinel
on:
  schedule: [{ cron: "0 6 * * 1" }]
permissions:
  contents: write
  issues: write
  pull-requests: write
jobs:
  scan:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: Aiden-yoon/depsentinel@v0
        with:
          openai-api-key: ${{ secrets.OPENAI_API_KEY }}  # optional — free mode without it
```

## Closing

Dependency security is the textbook "I know it matters, but I never get to it" chore. DepSentinel removes the friction — it **finds, explains, and opens the fix** for you.

🛡️ **GitHub Marketplace:** github.com/marketplace/actions/depsentinel-security-scanner
⭐ **Repo:** github.com/Aiden-yoon/depsentinel
