# ⚠️ Intentionally vulnerable demo fixture

This folder pins dependencies to **old versions with known published advisories**
so DepSentinel has real findings to demonstrate against:

| Package | Pinned | Known issue (example) |
|---------|--------|-----------------------|
| `lodash` | 4.17.4 | Prototype pollution (fixed 4.17.12+) |
| `minimist` | 1.2.0 | Prototype pollution (fixed 1.2.6) |
| `axios` | 0.21.0 | SSRF / credential leak (fixed 0.21.1+) |
| `node-fetch` | 2.6.0 | Information exposure (fixed 2.6.7) |

**Do not install or use this in production.** It exists only to generate
evidence artifacts (a security report issue + an upgrade PR) for the project's
documentation and program application.
