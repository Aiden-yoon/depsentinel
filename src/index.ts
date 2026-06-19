import * as core from "@actions/core";
import { resolveNpmDeps, resolveFromRoot } from "./deps";
import { scanNpm, meetsThreshold, type Severity } from "./osv";
import { assessAdvisory, createClient } from "./ai";
import { buildReport, upsertReportIssue, type Finding } from "./report";
import { openUpgradePr } from "./pr";

async function run(): Promise<void> {
  try {
    const githubToken = core.getInput("github-token", { required: true });
    const openaiApiKey = core.getInput("openai-api-key", { required: true });
    const model = core.getInput("openai-model") || "gpt-5-codex";
    const ecosystem = (core.getInput("ecosystem") || "npm").toLowerCase();
    const manifestPath = resolveFromRoot(core.getInput("manifest-path") || "package.json");
    const lockfilePath = resolveFromRoot(core.getInput("lockfile-path") || "package-lock.json");
    const threshold = (core.getInput("severity-threshold") || "LOW").toUpperCase() as Severity;
    const openPr = core.getBooleanInput("open-pr");
    const failOnFinding = core.getBooleanInput("fail-on-finding");
    const dryRun = core.getBooleanInput("dry-run");

    if (ecosystem !== "npm") {
      throw new Error(`Unsupported ecosystem "${ecosystem}". MVP supports: npm.`);
    }

    core.info(`📦 Resolving npm dependencies from ${manifestPath}`);
    const deps = await resolveNpmDeps(manifestPath, lockfilePath);
    core.info(`Resolved ${deps.length} dependencies.`);

    core.info("🔎 Querying OSV.dev for known advisories...");
    const advisories = await scanNpm(deps);
    const reportable = advisories.filter((a) => meetsThreshold(a.severity, threshold));
    core.info(
      `Found ${advisories.length} advisory record(s); ${reportable.length} met threshold ${threshold}.`
    );

    const findings: Finding[] = [];
    if (reportable.length > 0) {
      core.info("🤖 Running AI impact analysis...");
      const client = createClient(openaiApiKey);
      for (const advisory of reportable) {
        const assessment = await assessAdvisory(client, model, advisory);
        findings.push({ advisory, assessment });
      }
    }

    const report = buildReport(findings);
    core.setOutput("findings-count", String(findings.length));

    if (dryRun) {
      core.info("🧪 dry-run enabled — printing report instead of opening an issue/PR:\n");
      core.info(report);
      core.setOutput("issue-url", "");
      core.setOutput("pr-url", "");
    } else if (findings.length > 0) {
      const issueUrl = await upsertReportIssue(githubToken, report);
      core.info(`📝 Security report issue: ${issueUrl}`);
      core.setOutput("issue-url", issueUrl);

      let prUrl = "";
      if (openPr) {
        core.info("🚀 Opening merge-ready upgrade PR...");
        prUrl = (await openUpgradePr(githubToken, manifestPath, findings)) ?? "";
        if (prUrl) core.info(`🔀 Upgrade PR: ${prUrl}`);
      }
      core.setOutput("pr-url", prUrl);
    } else {
      core.info("✅ No reportable advisories — no issue/PR opened.");
      core.setOutput("issue-url", "");
      core.setOutput("pr-url", "");
    }

    if (failOnFinding && findings.length > 0) {
      core.setFailed(`DepSentinel found ${findings.length} advisory finding(s) at or above ${threshold}.`);
    }
  } catch (err) {
    core.setFailed(`DepSentinel failed: ${(err as Error).message}`);
  }
}

void run();
