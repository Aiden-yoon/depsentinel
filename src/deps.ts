import { promises as fs } from "node:fs";
import * as path from "node:path";

export interface ResolvedDep {
  /** Package name, e.g. "lodash". */
  name: string;
  /** Resolved exact version when known (from lockfile), else the manifest range. */
  version: string;
  /** True when the version came from a lockfile (exact), false when from a range. */
  exact: boolean;
}

/** Strip a semver range prefix down to a concrete-ish version for OSV querying. */
function normalizeRange(range: string): string {
  // Handles "^1.2.3", "~1.2.3", ">=1.2.3", "1.2.x" -> "1.2.3" best-effort.
  const match = range.match(/\d+\.\d+\.\d+(?:[-+][0-9A-Za-z.-]+)?/);
  return match ? match[0] : range.replace(/^[\^~>=<\s]+/, "").trim();
}

/**
 * Resolve the dependency set for an npm project.
 * Prefers exact versions from package-lock.json; falls back to manifest ranges.
 */
export async function resolveNpmDeps(
  manifestPath: string,
  lockfilePath: string
): Promise<ResolvedDep[]> {
  const manifestRaw = await fs.readFile(manifestPath, "utf8");
  const manifest = JSON.parse(manifestRaw) as {
    dependencies?: Record<string, string>;
    devDependencies?: Record<string, string>;
    optionalDependencies?: Record<string, string>;
  };

  const declared: Record<string, string> = {
    ...manifest.dependencies,
    ...manifest.devDependencies,
    ...manifest.optionalDependencies,
  };

  // Try to upgrade ranges to exact versions from the lockfile (npm v2/v3 format).
  const exactVersions = await readLockfileVersions(lockfilePath);

  return Object.entries(declared).map(([name, range]) => {
    const exact = exactVersions.get(name);
    return exact
      ? { name, version: exact, exact: true }
      : { name, version: normalizeRange(range), exact: false };
  });
}

async function readLockfileVersions(
  lockfilePath: string
): Promise<Map<string, string>> {
  const versions = new Map<string, string>();
  let raw: string;
  try {
    raw = await fs.readFile(lockfilePath, "utf8");
  } catch {
    return versions; // No lockfile — fine, we fall back to ranges.
  }

  const lock = JSON.parse(raw) as {
    packages?: Record<string, { version?: string }>;
    dependencies?: Record<string, { version?: string }>;
  };

  // npm lockfile v2/v3: keys look like "node_modules/lodash".
  if (lock.packages) {
    for (const [key, value] of Object.entries(lock.packages)) {
      if (!key.startsWith("node_modules/") || !value.version) continue;
      const name = key.slice("node_modules/".length).split("/node_modules/").pop()!;
      if (!versions.has(name)) versions.set(name, value.version);
    }
  }

  // npm lockfile v1 fallback.
  if (lock.dependencies) {
    for (const [name, value] of Object.entries(lock.dependencies)) {
      if (value.version && !versions.has(name)) versions.set(name, value.version);
    }
  }

  return versions;
}

export function resolveFromRoot(p: string): string {
  const workspace = process.env.GITHUB_WORKSPACE || process.cwd();
  return path.isAbsolute(p) ? p : path.join(workspace, p);
}
