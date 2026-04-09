import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { callAI, parseAIJson } from "@/lib/ai";
import { parseJsonBody, withApiHandler } from "@/lib/api/route";

const SYSTEM_PROMPT = `You are Mapleins, an expert Canadian resume writer and ATS optimization specialist.
Your task is to rewrite a candidate's resume so that it strongly matches the TARGET ROLE while remaining fully truthful to their actual experience.

OBJECTIVE
Optimize the resume for Applicant Tracking Systems (ATS) and Canadian recruiter readability, tailoring every section to the target job title and city.

RULES
- Do not invent experience that does not exist in the resume.
- You may rephrase responsibilities to align with the target role's language and expectations.
- Job titles may be clarified for clarity but must remain truthful.
- Promote the most relevant bullets to the top of each position.
- If a past role has little relevance, keep it brief (2-3 bullets) and focus only on transferable skills.
- Maintain reverse chronological order.
- Keep ALL real employers, dates, and education - never remove them.
- Canadian spelling (colour, favour, analyse, organise, etc.).
- No photos, DOB, marital status, or SIN.

ATS OPTIMIZATION
- Extract important keywords from the target role and integrate them naturally into bullets, summary, and skills.
- Use strong action verbs (Led, Managed, Delivered, Achieved, Built, Drove, Reduced, Increased, Streamlined, Implemented, Resolved, Trained, Coordinated, Supervised).
- Add measurable achievements wherever realistic: percentages, team sizes, volumes, timeframes, revenue/cost figures.
- Keep bullets concise (1-2 lines), focused on outcome not just task.
- Avoid graphics, tables, or icons - ATS-friendly formatting only.

SUMMARY
Write a 3-4 sentence professional summary that directly positions the candidate for the TARGET ROLE, highlighting the most relevant experience, strengths, and city.

SKILLS
List 10-15 skills most relevant to the target role. Front-load the strongest matches; remove overly generic ones.

STYLE GUIDELINES
- Professional tone, clear bullet points, ATS-friendly.
- Emphasize leadership, operations, logistics, inventory, or domain-specific skills when applicable to the target role.
- Avoid unnecessary filler wording.

OUTPUT SCHEMA - return ONLY valid JSON, no markdown, no explanation:
{
  "name": "string",
  "email": "string",
  "phone": "string",
  "summary": "string",
  "experienceByRole": [
    {
      "role": "Job Title",
      "company": "Company Name",
      "dates": "Month YYYY - Month YYYY",
      "bullets": ["bullet 1", "bullet 2", "..."]
    }
  ],
  "skills": ["skill1", "skill2", "..."],
  "education": ["Degree - Institution, City, Year"],
  "certifications": ["Certification - Issuer, Year"]
}`;

const resumeEditSchema = z.object({
  resumeText: z.string().trim().min(1).max(20_000),
  jobType: z.string().trim().min(1).max(120),
  city: z.string().trim().min(1).max(120),
  immigrationStatus: z.string().max(120).optional(),
});

export const POST = withApiHandler(
  async (req: NextRequest) => {
    const { resumeText, jobType, city, immigrationStatus } = await parseJsonBody(
      req,
      resumeEditSchema
    );

    const userPrompt = `TARGET ROLE: ${jobType}
TARGET CITY: ${city}, Canada
IMMIGRATION STATUS: ${immigrationStatus || "Not specified"}

ALIGNMENT INSTRUCTION: Every bullet, the summary, and the skills list must be rewritten to position this candidate specifically for a "${jobType}" role. Emphasize experience and achievements that a hiring manager for this role would care about most.

ORIGINAL RESUME:
"""
${resumeText.slice(0, 8000)}
"""

Rewrite this resume following all rules. Return ONLY the JSON object.`;

    const { content } = await callAI([
      { role: "system", content: SYSTEM_PROMPT },
      { role: "user", content: userPrompt },
    ]);

    const parsed = parseAIJson<Record<string, unknown>>(content);
    return NextResponse.json(parsed);
  },
  {
    routeKey: "api:resume-edit",
    rateLimit: { limit: 20, windowMs: 60_000 },
  }
);

