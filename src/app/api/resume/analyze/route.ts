import { NextRequest } from "next/server";
import { callAI } from "@/lib/ai";
import { extractFromText } from "@/lib/resumeUtils";

export const runtime = "nodejs";

const JOB_SECTORS = ["Warehouse", "Trucking", "Retail", "IT", "Healthcare"];

const GENERIC_NAMES = ["your name", "junior candidate", "candidate", "applicant"];

function isGenericValue(value: string | undefined, field: "name" | "email" | "phone"): boolean {
  if (!value || !value.trim()) return true;
  const v = value.trim().toLowerCase();
  if (field === "name") return GENERIC_NAMES.some((g) => v === g || v.startsWith(g + " "));
  if (field === "email") return v.includes("example.com") || v === "your email";
  if (field === "phone") return /^\+?1?-?555/.test(v) || v === "+1-555-0000";
  return false;
}

import { extractTextFromPDF, extractTextFromPDFUrl } from "@/lib/pdfExtract";

async function parsePDFBuffer(buffer: Buffer): Promise<string> {
  return extractTextFromPDF(buffer);
}

async function fetchAndParsePDF(resumeUrl: string): Promise<string> {
  return extractTextFromPDFUrl(resumeUrl);
}

function extractJsonFromResponse(text: string): string {
  let jsonText = text.trim();
  const jsonMatch = jsonText.match(/\{[\s\S]*\}/);
  if (jsonMatch) jsonText = jsonMatch[0];
  if (jsonText.startsWith("```")) {
    jsonText = jsonText.replace(/^```[a-zA-Z]*\n?/, "").replace(/\n?```$/, "");
  }
  return jsonText;
}

type ExperienceEntry = { role: string; company: string; dates?: string; bullets: string[]; yearsInRole?: number };

/** Merge AI output with rule-based extraction so real resume data always wins over generic placeholders */
function mergeWithExtracted(
  ai: {
    name?: string;
    email?: string;
    phone?: string;
    summary?: string;
    experience?: string[];
    experienceByRole?: ExperienceEntry[];
    skills?: string[];
    education?: string[];
    certifications?: string[];
    suggestedSectors?: string[];
    targetJobTitles?: string[];
    whyTheseJobs?: string;
  },
  extracted: ReturnType<typeof extractFromText>
): typeof ai {
  const out = { ...ai };
  if (extracted.name && isGenericValue(ai.name, "name")) out.name = extracted.name;
  if (extracted.email && isGenericValue(ai.email, "email")) out.email = extracted.email;
  if (extracted.phone && isGenericValue(ai.phone, "phone")) out.phone = extracted.phone;
  if (extracted.summary && (!ai.summary || ai.summary.length < 50)) out.summary = extracted.summary;
  if (extracted.experience?.length && (!ai.experience?.length || ai.experience.length < 2)) {
    out.experience = extracted.experience;
  }
  if (extracted.education?.length && (!ai.education?.length || ai.education.length < 1)) {
    out.education = extracted.education;
  }
  if (extracted.certifications?.length && (!ai.certifications?.length)) {
    out.certifications = extracted.certifications;
  }
  if (extracted.skills?.length && (!ai.skills?.length || ai.skills.length < 3)) {
    out.skills = extracted.skills;
  }
  return out;
}

export async function POST(request: NextRequest) {
  try {
    const contentType = request.headers.get("content-type") || "";
    let rawText = "";
    let resumeUrl: string | null = null;

    const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024; // 10MB

    if (contentType.includes("multipart/form-data")) {
      const formData = await request.formData();
      const file = formData.get("file") as File | null;
      resumeUrl = (formData.get("resumeUrl") as string) || null;
      if (file && file.size > MAX_FILE_SIZE_BYTES) {
        return Response.json(
          { error: "Resume file must be 10MB or smaller." },
          { status: 400 }
        );
      }
      // Use only the uploaded file for parsing when present — do not fall back to resumeUrl,
      // so we never read a different/cached PDF by mistake.
      if (file && file.size > 0) {
        const buffer = Buffer.from(await file.arrayBuffer());
        rawText = await parsePDFBuffer(buffer);
      }
    } else {
      const body = await request.json();
      resumeUrl = (body.resumeUrl as string) || null;
      if (!resumeUrl) {
        return Response.json({ error: "resumeUrl or file required" }, { status: 400 });
      }
      rawText = await fetchAndParsePDF(resumeUrl);
    }

    const extracted = rawText ? extractFromText(rawText) : {};

    let parsed: {
      name?: string;
      email?: string;
      phone?: string;
      summary?: string;
      experience?: string[];
      experienceByRole?: ExperienceEntry[];
      skills?: string[];
      education?: string[];
      certifications?: string[];
      suggestedSectors?: string[];
      targetJobTitles?: string[];
      whyTheseJobs?: string;
      yearsOfExperience?: number;
    } = {
      name: extracted.name || "Your Name",
      email: extracted.email || "",
      phone: extracted.phone || "",
      summary: extracted.summary || "",
      experience: extracted.experience || [],
      experienceByRole: [],
      skills: extracted.skills || [],
      education: extracted.education || [],
      certifications: extracted.certifications || [],
      suggestedSectors: ["Retail"],
      targetJobTitles: [],
      whyTheseJobs: "",
      yearsOfExperience: 0,
    };

    const aiPromptMessage = `You are a Canadian career advisor. Extract the resume EXACTLY as written — do NOT simplify, condense, or combine bullet points.

RULES:
- Use the REAL name, email, phone, job titles, companies, dates, and every responsibility/achievement from the resume.
- Do NOT merge multiple bullets into one. Each responsibility or achievement must stay as its own bullet.
- Preserve full detail: keep 5–15+ bullets per job if that is what the resume shows.
- Extract proper sections: Experience (by role), Education, Skills.
- suggestedSectors MUST be from: ${JOB_SECTORS.join(", ")}.

Return ONLY valid JSON, no markdown. Use this exact structure:
{
  "name": "string",
  "email": "string",
  "phone": "string",
  "summary": "1-2 sentence professional summary from the resume",
  "experienceByRole": [
    {
      "role": "Job Title",
      "company": "Company Name",
      "dates": "e.g. Jan 2020 – Present",
      "bullets": ["bullet 1", "bullet 2", "bullet 3", ...]
    }
  ],
  "experience": ["flat list of all bullets from all roles for backward compatibility"],
  "education": ["Degree, Institution (Year)", "Key Coursework: ... if present", ...],
  "certifications": ["WHMIS Certified", "Forklift Operator", ...],
  "skills": ["skill1", "skill2", ...],
  "suggestedSectors": ["Sector1", "Sector2"],
  "targetJobTitles": ["Job 1", "Job 2", ...],
  "whyTheseJobs": "1-2 sentences",
  "yearsOfExperience": 7
}
Include every role in experienceByRole with its own bullets. Do not shorten or omit bullets.
Extract certifications if present (e.g. WHMIS, Forklift, ServeIt Right). Include Key Coursework under education when present.
For yearsOfExperience: calculate the total professional work experience in years by summing the durations of all roles.`;

    const userPromptMessage = rawText?.trim()
      ? `Extract from this resume (use REAL name, contact, roles, skills, certifications):\n\n${rawText.slice(0, 12000)}`
      : "No text extracted. Return generic analysis for a junior candidate.";

    let aiContent: string | undefined = undefined;

    try {
      const { content } = await callAI([
        { role: "system", content: aiPromptMessage },
        { role: "user", content: userPromptMessage },
      ]);
      aiContent = content;
    } catch (e) {
      console.warn("AI extraction failed, falling back to heuristic", e);
    }

    if (aiContent) {
      const jsonText = extractJsonFromResponse(aiContent);
      try {
        const aiParsed = JSON.parse(jsonText) as typeof parsed;
        parsed = mergeWithExtracted(aiParsed, extracted) as typeof parsed;
        const valid = (parsed.suggestedSectors || []).filter((s) => JOB_SECTORS.includes(s));
        if (valid.length > 0) parsed.suggestedSectors = valid;
        if (parsed.targetJobTitles?.length) parsed.targetJobTitles = parsed.targetJobTitles;
        if (parsed.whyTheseJobs) parsed.whyTheseJobs = parsed.whyTheseJobs;
        // Flatten experience from experienceByRole if AI returned structured data but few flat bullets
        if (parsed.experienceByRole?.length && (!parsed.experience?.length || parsed.experience.length < 3)) {
          parsed.experience = parsed.experienceByRole.flatMap((e) =>
            e.bullets?.length ? e.bullets : [`${e.role} at ${e.company}${e.dates ? ` (${e.dates})` : ""}`]
          );
        }
      } catch {
        console.warn("AI response parse failed, using rule-based extraction only");
      }
    } else {
      console.warn("No AI content generated, using rule-based extraction only");
    }

    const validSectors = (parsed.suggestedSectors || []).filter((s) => JOB_SECTORS.includes(s));
    if (validSectors.length === 0) parsed.suggestedSectors = ["Retail"];
    else parsed.suggestedSectors = validSectors;

    return Response.json({
      name: parsed.name || "Your Name",
      email: parsed.email || "",
      phone: parsed.phone || "",
      summary: parsed.summary || "",
      experience: parsed.experience || [],
      experienceByRole: parsed.experienceByRole || [],
      skills: parsed.skills || [],
      education: parsed.education || [],
      certifications: parsed.certifications || [],
      suggestedSectors: parsed.suggestedSectors,
      targetJobTitles: parsed.targetJobTitles || [],
      whyTheseJobs: parsed.whyTheseJobs || "",
      yearsOfExperience: parsed.yearsOfExperience ?? 0,
    });
  } catch (err) {
    console.error("Resume analyze error:", err);
    const message =
      err instanceof Error ? err.message : typeof err === "string" ? err : "Analysis failed";
    return Response.json({ error: message }, { status: 500 });
  }
}
