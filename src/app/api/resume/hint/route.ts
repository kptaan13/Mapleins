import { NextRequest } from "next/server";
import { callAI, parseAIJson } from "@/lib/ai";

export type HintResponse = {
  hint: string;
  alternatives: string[]; // 3 improved rewrites the user can click-to-swap
};

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { field, value, context } = body as {
      field: string;
      value: string;
      context?: { jobType?: string; city?: string };
    };

    if (!field || !value?.trim()) {
      return Response.json({ hint: "", alternatives: [] } satisfies HintResponse);
    }

    const jobType = context?.jobType || "General";
    const city = context?.city || "Canada";
    // Editor sends exp_role_0_0 for role bullets; exp_0 for flat experience
    const isExperience = field.startsWith("experience") || field.startsWith("exp_");

    const systemPrompt = `You are a Canadian resume expert specialising in ATS-optimised resumes.

Your job:
1. Give ONE short improvement tip (max 2 sentences) for the provided resume field.
2. Provide exactly 3 improved rewrites the user can choose from.

Rules for rewrites:
- Use strong action verbs (Led, Managed, Delivered, Improved, Achieved, Reduced, Built, Drove, Oversaw, Streamlined).
- Add measurable impact wherever reasonable (%, numbers, team sizes, time saved).
- Keep them concise (1 sentence each for bullets, 2–3 sentences for summaries).
- Tailor to ${jobType} roles in ${city}, Canada.
- Canadian spelling.
- Do NOT fabricate employers, degrees, or dates.

Return ONLY valid JSON, no markdown:
{
  "hint": "one concise tip",
  "alternatives": ["rewrite 1", "rewrite 2", "rewrite 3"]
}`;

    const userPrompt = `Field: ${field}\nContent:\n${value.slice(0, 1000)}\n\nReturn the JSON.`;

    const { content } = await callAI([
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt },
    ]);

    let parsed: HintResponse;
    try {
      parsed = parseAIJson<HintResponse>(content);
      // Validate shape
      if (!parsed.hint) parsed.hint = "";
      if (!Array.isArray(parsed.alternatives)) parsed.alternatives = [];
      parsed.alternatives = parsed.alternatives.slice(0, 3).filter(Boolean);
    } catch {
      // Fallback: return raw content as hint
      parsed = { hint: content.trim().slice(0, 300), alternatives: [] };
    }

    // For summary field, don't show alternatives that are too short
    if (!isExperience) {
      parsed.alternatives = parsed.alternatives.filter((a) => a.length > 30);
    }

    return Response.json(parsed);
  } catch (err) {
    console.error("/api/resume/hint error:", err);
    return Response.json({ hint: "", alternatives: [] } satisfies HintResponse);
  }
}
