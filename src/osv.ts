import type { ResolvedDep } from "./deps";

export type Severity = "LOW" | "MODERATE" | "HIGH" | "CRITICAL" | "UNKNOWN";

export interface Advisory {
  packageName: string;
  packageVersion: string;
  id: string;
  summary: string;
  details: string;
  severity: Severity;
  references: string[];
  fixedVersions: string[];
}

const OSV_BATCH_URL = "https://api.osv.dev/v1/querybatch";
const OSV_VULN_URL = "https://api.osv.dev/v1/vulns";

const SEVERITY_RANK: Record<Severity, number> = {
  UNKNOWN: 0,
  LOW: 1,
  MODERATE: 2,
  HIGH: 3,
  CRITICAL: 4,
};

export function meetsThreshold(s: Severity, threshold: Severity): boolean {
  return SEVERITY_RANK[s] >= SEVERITY_RANK[threshold];
}

/** Query OSV.dev for advisories affecting the given npm dependencies. */
export async function scanNpm(deps: ResolvedDep[]): Promise<Advisory[]> {
  if (deps.length === 0) return [];

  const queries = deps.map((d) => ({
    package: { name: d.name, ecosystem: "npm" },
    version: d.version,
  }));

  const batchRes = await fetch(OSV_BATCH_URL, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ queries }),
  });
  if (!batchRes.ok) {
    throw new Error(`OSV querybatch failed: ${batchRes.status} ${batchRes.statusText}`);
  }

  const batch = (await batchRes.json()) as {
    results: Array<{ vulns?: Array<{ id: string }> }>;
  };

  const advisories: Advisory[] = [];

  // Resolve full vuln records (querybatch only returns ids).
  for (let i = 0; i < batch.results.length; i++) {
    const dep = deps[i];
    const vulns = batch.results[i]?.vulns ?? [];
    for (const { id } of vulns) {
      const record = await fetchVuln(id);
      if (!record) continue;
      advisories.push(toAdvisory(dep, record));
    }
  }

  return advisories;
}

interface OsvVuln {
  id: string;
  summary?: string;
  details?: string;
  references?: Array<{ url: string }>;
  severity?: Array<{ type: string; score: string }>;
  database_specific?: { severity?: string };
  affected?: Array<{
    ranges?: Array<{ events?: Array<{ fixed?: string }> }>;
  }>;
}

async function fetchVuln(id: string): Promise<OsvVuln | null> {
  const res = await fetch(`${OSV_VULN_URL}/${encodeURIComponent(id)}`);
  if (!res.ok) return null;
  return (await res.json()) as OsvVuln;
}

function toAdvisory(dep: ResolvedDep, v: OsvVuln): Advisory {
  return {
    packageName: dep.name,
    packageVersion: dep.version,
    id: v.id,
    summary: v.summary ?? v.id,
    details: (v.details ?? "").slice(0, 4000),
    severity: extractSeverity(v),
    references: (v.references ?? []).map((r) => r.url).slice(0, 8),
    fixedVersions: extractFixedVersions(v),
  };
}

function extractSeverity(v: OsvVuln): Severity {
  const label = v.database_specific?.severity?.toUpperCase();
  if (label && label in SEVERITY_RANK) return label as Severity;

  // Fall back to CVSS score buckets.
  const cvss = v.severity?.find((s) => s.type.startsWith("CVSS"));
  if (cvss) {
    const score = parseFloat(cvss.score);
    if (!Number.isNaN(score)) {
      if (score >= 9.0) return "CRITICAL";
      if (score >= 7.0) return "HIGH";
      if (score >= 4.0) return "MODERATE";
      return "LOW";
    }
  }
  return "UNKNOWN";
}

function extractFixedVersions(v: OsvVuln): string[] {
  const fixed = new Set<string>();
  for (const aff of v.affected ?? []) {
    for (const range of aff.ranges ?? []) {
      for (const ev of range.events ?? []) {
        if (ev.fixed) fixed.add(ev.fixed);
      }
    }
  }
  return [...fixed];
}
