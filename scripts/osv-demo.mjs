#!/usr/bin/env node
// Local evidence generator: runs the real OSV.dev scan against demo/package.json
// and prints the advisories DepSentinel would feed to the AI layer.
// No OpenAI key or GitHub context required — proves the detection core works.
//
//   node scripts/osv-demo.mjs
//
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const here = dirname(fileURLToPath(import.meta.url));
const manifestPath = join(here, "..", "demo", "package.json");

const manifest = JSON.parse(readFileSync(manifestPath, "utf8"));
const deps = Object.entries({
  ...manifest.dependencies,
  ...manifest.devDependencies,
}).map(([name, version]) => ({ name, version: version.replace(/^[\^~>=<\s]+/, "") }));

const SEV_RANK = { UNKNOWN: 0, LOW: 1, MODERATE: 2, HIGH: 3, CRITICAL: 4 };

function severityOf(v) {
  const label = v.database_specific?.severity?.toUpperCase();
  if (label && label in SEV_RANK) return label;
  const cvss = (v.severity ?? []).find((s) => s.type?.startsWith("CVSS"));
  if (cvss) {
    const score = parseFloat(cvss.score);
    if (!Number.isNaN(score)) {
      if (score >= 9) return "CRITICAL";
      if (score >= 7) return "HIGH";
      if (score >= 4) return "MODERATE";
      return "LOW";
    }
  }
  return "UNKNOWN";
}

function fixedVersions(v) {
  const out = new Set();
  for (const aff of v.affected ?? [])
    for (const r of aff.ranges ?? [])
      for (const e of r.events ?? []) if (e.fixed) out.add(e.fixed);
  return [...out];
}

const batch = await fetch("https://api.osv.dev/v1/querybatch", {
  method: "POST",
  headers: { "content-type": "application/json" },
  body: JSON.stringify({
    queries: deps.map((d) => ({ package: { name: d.name, ecosystem: "npm" }, version: d.version })),
  }),
}).then((r) => r.json());

let total = 0;
console.log(`\n🛡️  DepSentinel — OSV scan of demo/package.json (${deps.length} deps)\n`);

for (let i = 0; i < batch.results.length; i++) {
  const dep = deps[i];
  const vulns = batch.results[i]?.vulns ?? [];
  if (vulns.length === 0) {
    console.log(`  ✅ ${dep.name}@${dep.version} — no known advisories`);
    continue;
  }
  for (const { id } of vulns) {
    const v = await fetch(`https://api.osv.dev/v1/vulns/${id}`).then((r) => r.json());
    total++;
    console.log(
      `  🔴 ${dep.name}@${dep.version} — ${v.id} [${severityOf(v)}]\n` +
        `     ${(v.summary ?? "").slice(0, 100)}\n` +
        `     fixed in: ${fixedVersions(v).join(", ") || "n/a"}`
    );
  }
}

console.log(`\n→ ${total} advisory record(s) found. In CI, each is sent to Codex for impact analysis.\n`);
