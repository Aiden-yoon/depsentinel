import OpenAI from "openai";
import type { Advisory } from "./osv";

export interface AiAssessment {
  /** One-paragraph, human-readable explanation of real-world impact. */
  impact: string;
  /** Concrete recommended action (e.g. upgrade to x.y.z, or why no action needed). */
  recommendation: string;
  /** Model's confidence that the advisory is actually exploitable here: low | medium | high. */
  reachabilityConfidence: "low" | "medium" | "high";
}

const SYSTEM_PROMPT = `You are DepSentinel, an open-source security maintainer.
Given a vulnerability advisory for a dependency, explain its real-world impact for a
maintainer in plain language, recommend a concrete action, and judge how likely the
vulnerable code path is actually reachable. Be precise and avoid alarmism.
Respond ONLY with strict JSON matching:
{"impact": string, "recommendation": string, "reachabilityConfidence": "low"|"medium"|"high"}`;

export function createClient(apiKey: string): OpenAI {
  return new OpenAI({ apiKey });
}

export async function assessAdvisory(
  client: OpenAI,
  model: string,
  advisory: Advisory
): Promise<AiAssessment> {
  const userPrompt = [
    `Package: ${advisory.packageName}@${advisory.packageVersion}`,
    `Advisory: ${advisory.id}`,
    `Severity: ${advisory.severity}`,
    `Summary: ${advisory.summary}`,
    `Fixed in: ${advisory.fixedVersions.join(", ") || "no fixed version published"}`,
    "",
    "Details:",
    advisory.details || "(none provided)",
  ].join("\n");

  try {
    const completion = await client.chat.completions.create({
      model,
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: userPrompt },
      ],
      response_format: { type: "json_object" },
      temperature: 0.1,
    });

    const raw = completion.choices[0]?.message?.content ?? "{}";
    const parsed = JSON.parse(raw) as Partial<AiAssessment>;
    return {
      impact: parsed.impact ?? "No impact analysis returned.",
      recommendation:
        parsed.recommendation ??
        (advisory.fixedVersions.length
          ? `Upgrade ${advisory.packageName} to ${advisory.fixedVersions[0]} or later.`
          : "Monitor for a patched release."),
      reachabilityConfidence: parsed.reachabilityConfidence ?? "medium",
    };
  } catch (err) {
    // Never let one failed assessment abort the whole scan.
    return {
      impact: `AI assessment unavailable (${(err as Error).message}).`,
      recommendation: advisory.fixedVersions.length
        ? `Upgrade ${advisory.packageName} to ${advisory.fixedVersions[0]} or later.`
        : "Monitor for a patched release.",
      reachabilityConfidence: "medium",
    };
  }
}
