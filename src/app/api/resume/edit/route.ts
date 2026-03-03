import { NextRequest } from "next/server";
import { callAI, parseAIJson } from "@/lib/ai";

const SYSTEM_PROMPT = `You are Mapleins, a senior Canadian resume writer and ATS specialist with 15 years of experience helping newcomers and professionals land jobs in Canada.

YOUR TASK
Rewrite this resume to be highly competitive for Canadian employers and applicant tracking systems (ATS), tailored to the specified job target and city.

WRITING STANDARDS
- Lead every experience bullet with a strong action verb (Led, Managed, Delivered, Achieved, Built, Drove, Reduced, Increased, Streamlined, Collaborated, Supervised, Implemented, Resolved, Trained, Coordinated).
- Add quantifiable impact wherever realistic: team sizes, percentages, volumes, timeframes, revenue/cost figures.
- Keep bullets concise (1–2 lines max), focused on outcome not just task.
- Write a punchy 4–5 sentence summary with the target job title, key strengths, and city.
- Skills: front-load the most relevant ones for the target role; remove overly generic ones.
- Canadian spelling (colour, favour, analyse, organise, etc.).
- No photos, DOB, marital status, or SIN.
- Keep ALL real employers, dates, and education — do not invent or remove any.

OUTPUT SCHEMA — return ONLY valid JSON, no markdown, no explanation:
{
  "name": "string",
  "email": "string",
  "phone": "string",
  "summary": "string",
  "experienceByRole": [
    {
      "role": "Job Title",
      "company": "Company Name",
      "dates": "Month YYYY – Month YYYY",
      "bullets": ["bullet 1", "bullet 2", "..."]
    }
  ],
  "skills": ["skill1", "skill2", "..."],
  "education": ["Degree – Institution, City, Year"]
}`;

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { resumeText, jobType, city, immigrationStatus } = body as {
      resumeText: string;
      jobType: string;
      city: string;
      immigrationStatus?: string;
    };

    if (!resumeText || !jobType || !city) {
      return new Response("Missing required fields", { status: 400 });
    }

    const userPrompt = `TARGET ROLE: ${jobType}
TARGET CITY: ${city}, Canada
IMMIGRATION STATUS: ${immigrationStatus || "Not specified"}

ORIGINAL RESUME:
"""
${resumeText.slice(0, 8000)}
"""

Rewrite this resume following all rules. Return ONLY the JSON object.`;

    const { content } = await callAI([
      { role: "system", content: SYSTEM_PROMPT },
      { role: "user", content: userPrompt },
    ]);

    let parsed;
    try {
      parsed = parseAIJson(content);
    } catch (err) {
      console.error("Failed to parse edit JSON:", err, content.slice(0, 200));
      return new Response("Invalid JSON from model", { status: 500 });
    }

    return new Response(JSON.stringify(parsed), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("/api/resume/edit error:", err);
    return new Response("Server error", { status: 500 });
  }
}
