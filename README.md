# 🛡️ DepSentinel

[![CI](https://github.com/Aiden-yoon/depsentinel/actions/workflows/ci.yml/badge.svg)](https://github.com/Aiden-yoon/depsentinel/actions/workflows/ci.yml)
[![Release](https://img.shields.io/github/v/release/Aiden-yoon/depsentinel?sort=semver)](https://github.com/Aiden-yoon/depsentinel/releases)
[![License: MIT](https://img.shields.io/github/license/Aiden-yoon/depsentinel)](LICENSE)
[![Evidence: 37 real advisories](https://img.shields.io/badge/evidence-37%20real%20advisories-red)](docs/EVIDENCE.md)

> **📊 Proof it works:** against a real fixture, DepSentinel surfaces
> [**37 live advisories across 4 common dependencies**](docs/EVIDENCE.md) —
> including critical prototype-pollution and SSRF/credential-leak issues.

> An AI maintainer that keeps your dependencies safe — it scans for known
> vulnerabilities, explains the **real-world impact** in plain language, and
> opens a single, always-up-to-date security report issue.

Most tools tell you _"a vulnerable version is present."_ DepSentinel adds the
part that actually saves maintainer time: **what the vulnerability means for
your project, how likely it is reachable, and what to do about it** — written
by an AI maintainer in the loop.

## How it works

```
trigger (schedule / manual)
  → resolve dependencies (package-lock.json → exact versions, else package.json ranges)
  → query OSV.dev for known advisories
  → filter by severity threshold
  → AI impact analysis per advisory (impact · recommendation · reachability)
  → open/update one "security report" issue
  → open/update one merge-ready upgrade PR (deps with a fixed version)
```

## Usage

Add a repository secret `OPENAI_API_KEY`, then create
`.github/workflows/depsentinel.yml`:

```yaml
name: DepSentinel security scan
on:
  schedule:
    - cron: "0 6 * * 1"
  workflow_dispatch: {}
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
          openai-api-key: ${{ secrets.OPENAI_API_KEY }}
          severity-threshold: MODERATE
```

## Inputs

| Input | Default | Description |
|-------|---------|-------------|
| `openai-api-key` | _(required)_ | OpenAI/Codex API key (use a secret). |
| `openai-model` | `gpt-5-codex` | Model used for impact analysis. |
| `github-token` | `${{ github.token }}` | Token to read the repo and open the issue. |
| `ecosystem` | `npm` | Dependency ecosystem (MVP: `npm`). |
| `manifest-path` | `package.json` | Manifest location. |
| `lockfile-path` | `package-lock.json` | Lockfile for exact versions (optional). |
| `severity-threshold` | `LOW` | `LOW` \| `MODERATE` \| `HIGH` \| `CRITICAL`. |
| `open-pr` | `true` | Open a merge-ready upgrade PR for fixable advisories. |
| `fail-on-finding` | `false` | Exit non-zero when findings exist. |
| `dry-run` | `false` | Print the report to logs instead of opening an issue. |

## Outputs

| Output | Description |
|--------|-------------|
| `findings-count` | Number of advisories meeting the threshold. |
| `issue-url` | URL of the created/updated report issue. |
| `pr-url` | URL of the created/updated upgrade PR. |

## See it work

```bash
npm run demo   # real OSV scan of the vulnerable demo/ fixture — no keys needed
```

See [docs/EVIDENCE.md](docs/EVIDENCE.md) for a captured run (37 real advisories
across 4 dependencies).

## Develop

```bash
npm install
npm run typecheck   # type safety
npm run build       # bundle to dist/index.js (committed for the runner)
```

> **Note:** GitHub JS actions run `dist/index.js` directly, so `dist/` is
> committed. Always run `npm run build` before tagging a release.

## Releasing (Marketplace)

CI (`.github/workflows/ci.yml`) typechecks, builds, and fails if `dist/` is
stale. To cut a release:

```bash
npm run build && git add dist && git commit -m "build: dist" # if changed
git tag v0.1.0
git push origin main --tags
```

The release workflow then publishes a GitHub Release and moves the floating
`v0` tag, so consumers can pin `uses: Aiden-yoon/depsentinel@v0`. To list it on
the GitHub Marketplace, open the published release and check **"Publish this
Action to the Marketplace"** (requires the repo to be public with a valid
`action.yml`).

## Security & scope

DepSentinel only analyzes the repository it is installed in, against that
repository's own code. It does not scan code you do not own or lack permission
to review.

## Roadmap

- [x] Merge-ready upgrade PRs (not just a report issue)
- [ ] Reachability analysis against actual call sites
- [ ] Additional ecosystems (PyPI, Go, crates.io)
- [ ] Changelog-aware breaking-change migration patches

## License

MIT
