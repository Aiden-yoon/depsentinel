/** Minimal semver comparison — enough to pick the highest fixed version. */
export function parseVersion(v: string): number[] {
  const core = v.replace(/^[^\d]*/, "").split(/[-+]/)[0];
  return core.split(".").map((p) => {
    const n = parseInt(p, 10);
    return Number.isNaN(n) ? 0 : n;
  });
}

/** Returns > 0 if a > b, < 0 if a < b, 0 if equal. */
export function compareVersions(a: string, b: string): number {
  const pa = parseVersion(a);
  const pb = parseVersion(b);
  const len = Math.max(pa.length, pb.length);
  for (let i = 0; i < len; i++) {
    const diff = (pa[i] ?? 0) - (pb[i] ?? 0);
    if (diff !== 0) return diff;
  }
  return 0;
}

/** Pick the highest version from a list (used to satisfy all advisories at once). */
export function maxVersion(versions: string[]): string | null {
  if (versions.length === 0) return null;
  return versions.reduce((best, v) => (compareVersions(v, best) > 0 ? v : best));
}
