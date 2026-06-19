# DepSentinel — Architecture

> A one-glance view of the system. GitHub renders ```mermaid``` blocks automatically.

## Pipeline (end-to-end)

```mermaid
flowchart TD
    T([Trigger: schedule / manual / push]) --> D
    D[1. deps.ts<br/>Resolve dependencies<br/>package.json + lockfile] --> O
    O[2. osv.ts<br/>Query OSV.dev<br/>severity, fixed versions] --> F
    F[3. index.ts<br/>Filter by severity<br/>at/above threshold] --> A
    A{4. ai.ts<br/>Produce judgment}
    A -->|API key present| AI[Codex analysis<br/>impact, recommendation, reachability]
    A -->|no key| TPL[Template summary<br/>free fallback]
    AI --> R
    TPL --> R
    R[5. report.ts<br/>Security report issue<br/>idempotent, single issue] --> P
    P[6. pr.ts<br/>Upgrade PR<br/>version bump + lockfile + branch]
    P --> OUT([Issue #1 + PR #2])
```

## Component responsibilities

| Module | Role | Input → Output |
|---|---|---|
| `deps.ts` | Resolve dependencies | `package.json`/`lock` → `{name, version}[]` |
| `osv.ts` | Query vulnerabilities | deps → `Advisory[]` (severity, fixedVersions) |
| `ai.ts` | Produce judgment | advisory → `{impact, recommendation, reachability}` |
| `version.ts` | semver comparison | fixedVersions → best target version |
| `report.ts` | Write the issue | findings → GitHub Issue (idempotent) |
| `pr.ts` | Open the PR | upgrades → branch + commit + PR |
| `index.ts` | Orchestration | inputs → coordinates all of the above |

## Core design principles

```mermaid
flowchart LR
    subgraph Reliability
      I1[Idempotent issue<br/>one issue, even weekly]
      I2[Failure isolation<br/>one bad analysis doesn't stop the run]
      I3[dry-run<br/>preview mode]
    end
    subgraph Safety_and_Terms
      S1[Permission isolation<br/>own code only]
      S2[Free fallback<br/>works without a key]
    end
```

- **Idempotency:** a hidden marker + label let it find and update the existing issue → zero noise
- **Permission isolation:** runs on the installing repo's own code only (never scans others' code)
- **Free fallback:** with no OpenAI key, it builds template summaries from OSV data → issue/PR still work
- **Safety net:** passing the test suite after an upgrade is the recommended merge gate

## External dependencies

```mermaid
flowchart LR
    DS[DepSentinel] -->|vulnerability DB| OSV[(OSV.dev<br/>public API, free)]
    DS -->|AI analysis, optional| OAI[(OpenAI / Codex API)]
    DS -->|issues and PRs| GH[(GitHub API)]
```

- **OSV.dev** — required, free, no key
- **OpenAI/Codex** — optional (for AI explanations)
- **GitHub** — issue/PR creation (workflow `GITHUB_TOKEN`)
