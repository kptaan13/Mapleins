import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { callAI, parseAIJson } from "@/lib/ai";
import { parseJsonBody, withApiHandler } from "@/lib/api/route";

export type HintResponse = {
  hint: string;
  alternatives: string[];
};

const hintSchema = z.object({
  field: z.string().min(1).max(100),
  value: z.string().max(4000),
  context: z
    .object({
      jobType: z.string().max(120).optional(),
      city: z.string().max(120).optional(),
    })
    .optional(),
});

export const POST = withApiHandler(
  async (req: NextRequest) => {
    const { field, value, context } = await parseJsonBody(req, hintSchema);

    if (!value.trim()) {
      return NextResponse.json({ hint: "", alternatives: [] } satisfies HintResponse);
    }

    const jobType = context?.jobType || "General";
    const city = context?.city || "Canada";
    const isExperience = field.startsWith("experience") || field.startsWith("exp_");

    const systemPrompt = `You are a Canadian resume expert specialising in ATS-optimised resumes.

Your job:
1. Give ONE short improvement tip (max 2 sentences) for the provided resume field.
2. Provide exactly 3 improved rewrites the user can choose from.

Rules for rewrites:
- Use strong action verbs (Led, Managed, Delivered, Improved, Achieved, Reduced, Built, Drove, Oversaw, Streamlined).
- Add measurable impact wherever reasonable (%, numbers, team sizes, time saved).
- Keep them concise (1 sentence each for bullets, 2-3 sentences for summaries).
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
      if (!parsed.hint) parsed.hint = "";
      if (!Array.isArray(parsed.alternatives)) parsed.alternatives = [];
      parsed.alternatives = parsed.alternatives.slice(0, 3).filter(Boolean);
    } catch {
      parsed = { hint: content.trim().slice(0, 300), alternatives: [] };
    }

    if (!isExperience) {
      parsed.alternatives = parsed.alternatives.filter((a) => a.length > 30);
    }

    return NextResponse.json(parsed);
  },
  {
    routeKey: "api:resume-hint",
    rateLimit: { limit: 60, windowMs: 60_000 },
  }
);

