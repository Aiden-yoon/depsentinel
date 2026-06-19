# DepSentinel — 3-Slide Deck

> For presentations. Render with Marp / reveal.js / Slidev, or just read it.
> Each `---` is one slide.

---

## Slide 1 — The Problem

# Nobody is maintaining open source's security

- Modern apps are **~80% third-party libraries** (dependencies)
- New vulnerabilities in those libraries are **found every day** — even when your own code never changes
- Doing it by hand means: spot the advisory → decode the English security note → judge the impact → find the safe version → patch, test, open a PR
- **Too tedious → mostly ignored.** Worst for solo devs and small open-source projects

> 💡 "Security debt builds up silently — then breaks all at once."

---

## Slide 2 — The Solution

# DepSentinel — an AI security maintainer that *judges*

Existing bots (Dependabot) only file *"bump this version"* PRs. **No judgment.**

DepSentinel fills the missing judgment:

| | Existing bots | **DepSentinel** |
|---|---|---|
| Detect | ✅ | ✅ |
| **Explain why it matters** | ❌ | ✅ (AI, in plain language) |
| **Merge-ready fix PR** | partial | ✅ (incl. lockfile) |
| **Reachability judgment** | ❌ | ✅ |

- One GitHub Action = 5-minute setup
- **Works for free even without an API key** (uses the public OSV vulnerability database)

---

## Slide 3 — How it works & getting started

# Automatic, every week

```
schedule → resolve deps → query OSV → filter by severity
        → AI impact analysis → security report issue → upgrade PR
```

**Proof:** on a demo fixture it detected & explained **37 real advisories** and opened a real issue + PR.

**Get started**
```yaml
- uses: Aiden-yoon/depsentinel@v0
  with:
    openai-api-key: ${{ secrets.OPENAI_API_KEY }}  # optional
```

🛡️ **github.com/marketplace/actions/depsentinel-security-scanner**
