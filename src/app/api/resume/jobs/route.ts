import { NextRequest } from "next/server";
import { callAI, parseAIJson } from "@/lib/ai";

export type JobSuggestion = {
  title: string;       // e.g. "Data Analyst"
  reason: string;      // 1 sentence: why this person fits
  searchTip: string;   // where/how to search (LinkedIn, Indeed, company type)
  salaryRange: string; // e.g. "$55,000–$75,000 CAD/yr"
  match: "Strong" | "Good" | "Stretch";
};

export type JobsResponse = {
  jobs: JobSuggestion[];
  summary: string; // 1–2 sentences overall career fit summary
};

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { name, summary, skills, experience, targetRole, city, immigrationStatus } = body as {
      name?: string;
      summary?: string;
      skills?: string[];
      experience?: string[];
      targetRole?: string;
      city?: string;
      immigrationStatus?: string;
    };

    const cityStr = city || "Canada";
    const roleStr = targetRole || "any field";
    const immiStr = immigrationStatus || "not specified";

    const systemPrompt = `You are a Canadian career counsellor and labour market expert. Your job is to analyse a candidate's resume and suggest the best job titles they should be applying for in Canada right now.

RULES
- Suggest 12–15 specific job titles, not generic categories.
- Base suggestions ONLY on the actual skills, experience, and education in the resume.
- Consider the candidate's stated target role: "${roleStr}" (if provided, weight these heavily).
- Consider the city/region: ${cityStr}, Canada — mention local employers or sectors where relevant.
- Consider immigration status (${immiStr}) to flag any requirements if relevant.
- Label each as "Strong" (direct match), "Good" (solid transferable), or "Stretch" (aspirational with growth).
- Salary ranges should be realistic for ${cityStr}, Canada in 2026.
- searchTip: Be specific — name actual job boards, company types, or Canadian-specific tips (e.g., LinkedIn Canada, WorkBC, job bank.gc.ca, specific company names).

Return ONLY valid JSON, no markdown:
{
  "summary": "1–2 sentence overall career fit assessment for this person in Canada",
  "jobs": [
    {
      "title": "Specific Job Title",
      "reason": "1 sentence: what in their background directly supports this role",
      "searchTip": "Specific search advice for Canada",
      "salaryRange": "$XX,000–$XX,000 CAD/yr",
      "match": "Strong | Good | Stretch"
    }
  ]
}`;

    const userPrompt = `CANDIDATE: ${name || "Candidate"}
TARGET ROLE: ${roleStr}
CITY: ${cityStr}, Canada
IMMIGRATION STATUS: ${immiStr}

SUMMARY: ${summary?.slice(0, 500) || "Not provided"}

SKILLS: ${(skills || []).join(", ").slice(0, 600) || "Not provided"}

EXPERIENCE HIGHLIGHTS:
${(experience || [])
  .filter(Boolean)
  .slice(0, 10)
  .map((e, i) => `${i + 1}. ${e}`)
  .join("\n") || "Not provided"}

Based on this profile, suggest 12–15 job titles. Return only the JSON.`;

    const { content } = await callAI([
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt },
    ]);

    let parsed: JobsResponse;
    try {
      parsed = parseAIJson<JobsResponse>(content);
      if (!Array.isArray(parsed.jobs)) parsed.jobs = [];
      if (!parsed.summary) parsed.summary = "";
    } catch (err) {
      console.error("Jobs JSON parse error:", err, content.slice(0, 200));
      return Response.json({ jobs: [], summary: "" } satisfies JobsResponse);
    }

    return Response.json(parsed);
  } catch (err) {
    console.error("/api/resume/jobs error:", err);
    return Response.json({ jobs: [], summary: "" } satisfies JobsResponse);
  }
}
