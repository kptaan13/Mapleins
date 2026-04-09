import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { callAI } from "@/lib/ai";
import { extractFromText } from "@/lib/resumeUtils";
import { extractTextFromPDF, extractTextFromPDFUrl } from "@/lib/pdfExtract";
import { withApiHandler } from "@/lib/api/route";
import { ApiError } from "@/lib/api/error";

export const runtime = "nodejs";

const JOB_SECTORS = ["Warehouse", "Trucking", "Retail", "IT", "Healthcare"];
const GENERIC_NAMES = ["your name", "junior candidate", "candidate", "applicant"];
const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024;

type ExperienceEntry = {
  role: string;
  company: string;
  dates?: string;
  bullets: string[];
  yearsInRole?: number;
};

type AnalyzeResult = {
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
};

const jsonBodySchema = z.object({
  resumeUrl: z.string().url().max(2048),
});

const multipartSchema = z.object({
  resumeUrl: z.string().url().max(2048).optional().nullable(),
});

function isGenericValue(value: string | undefined, field: "name" | "email" | "phone"): boolean {
  if (!value || !value.trim()) return true;
  const v = value.trim().toLowerCase();
  if (field === "name") return GENERIC_NAMES.some((g) => v === g || v.startsWith(`${g} `));
  if (field === "email") return v.includes("example.com") || v === "your email";
  if (field === "phone") return /^\+?1?-?555/.test(v) || v === "+1-555-0000";
  return false;
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

function mergeWithExtracted(
  ai: AnalyzeResult,
  extracted: ReturnType<typeof extractFromText>
): AnalyzeResult {
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

export const POST = withApiHandler(
  async (request: NextRequest) => {
    const contentType = request.headers.get("content-type") || "";
    let rawText = "";

    if (contentType.includes("multipart/form-data")) {
      const formData = await request.formData();
      const file = formData.get("file") as File | null;
      const parsedForm = multipartSchema.safeParse({
        resumeUrl: (formData.get("resumeUrl") as string) || undefined,
      });
      if (!parsedForm.success) {
        throw new ApiError(400, "Invalid resume URL.", {
          code: "INVALID_RESUME_URL",
          details: parsedForm.error.flatten(),
        });
      }

      const hasFile = !!file && file.size > 0;
      if (!hasFile && !parsedForm.data.resumeUrl) {
        throw new ApiError(400, "Please upload a PDF resume.", { code: "MISSING_RESUME" });
      }
      if (file && file.size > MAX_FILE_SIZE_BYTES) {
        throw new ApiError(400, "Resume file must be 10MB or smaller.", { code: "FILE_TOO_LARGE" });
      }
      if (file && !file.type.includes("pdf") && !file.name.toLowerCase().endsWith(".pdf")) {
        throw new ApiError(400, "Only PDF resumes are supported.", { code: "INVALID_FILE_TYPE" });
      }

      if (hasFile && file) {
        rawText = await extractTextFromPDF(Buffer.from(await file.arrayBuffer()));
      } else if (parsedForm.data.resumeUrl) {
        rawText = await extractTextFromPDFUrl(parsedForm.data.resumeUrl);
      }
    } else {
      let bodyRaw: unknown;
      try {
        bodyRaw = await request.json();
      } catch {
        throw new ApiError(400, "Invalid JSON body.", { code: "INVALID_JSON" });
      }
      const parsedBody = jsonBodySchema.safeParse(bodyRaw);
      if (!parsedBody.success) {
        throw new ApiError(400, "resumeUrl is required and must be a valid URL.", {
          code: "INVALID_BODY",
          details: parsedBody.error.flatten(),
        });
      }
      rawText = await extractTextFromPDFUrl(parsedBody.data.resumeUrl);
    }

    if (!rawText.trim()) {
      throw new ApiError(
        422,
        "Could not read text from this PDF. Please upload a clear text-based PDF (not a scanned image).",
        { code: "PDF_TEXT_EXTRACTION_FAILED" }
      );
    }

    const extracted = extractFromText(rawText);

    let parsed: AnalyzeResult = {
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

    const aiPromptMessage = `You are a Canadian resume data extraction specialist. Your ONLY job is to extract data from the resume exactly as written — do NOT rewrite, improve, summarize, or invent anything.

════════════════════════════════════
EXTRACTION RULES (NON-NEGOTIABLE)
════════════════════════════════════
1. Extract EVERY job role separately. Never merge multiple jobs into one.
2. For each role, copy the job title, company name, and dates EXACTLY as written.
3. Copy every bullet/responsibility for each role exactly — do NOT paraphrase, shorten, or combine.
4. Extract the real name, phone, email, and location from the header.
5. Extract all skills, education entries, and certifications exactly as written.
6. NEVER invent, infer, or add anything not present in the resume text.
7. suggestedSectors MUST only use values from: ${JOB_SECTORS.join(", ")}.

════════════════════════════════════
REQUIRED JSON FORMAT
════════════════════════════════════
Return ONLY valid JSON — no markdown, no commentary:
{
  "name": "Full Name",
  "email": "email@example.com",
  "phone": "+1 (xxx) xxx-xxxx",
  "summary": "professional summary text or empty string",
  "experienceByRole": [
    {
      "role": "EXACT job title from resume",
      "company": "EXACT company name from resume",
      "dates": "EXACT date range from resume",
      "bullets": ["exact bullet 1", "exact bullet 2"]
    }
  ],
  "skills": ["skill1", "skill2"],
  "education": ["education entry 1"],
  "certifications": ["cert 1"],
  "suggestedSectors": ["Retail"],
  "targetJobTitles": ["Job Title 1"],
  "yearsOfExperience": 4
}`;

    const userPromptMessage = `Extract ALL data from this resume. Every job must appear separately with its exact company name and dates. Do not merge jobs or invent anything:\n\n${rawText.slice(0, 12000)}`;

    try {
      const { content } = await callAI([
        { role: "system", content: aiPromptMessage },
        { role: "user", content: userPromptMessage },
      ]);

      const aiParsed = JSON.parse(extractJsonFromResponse(content)) as AnalyzeResult;
      parsed = mergeWithExtracted(aiParsed, extracted);

      if (parsed.experienceByRole?.length && (!parsed.experience?.length || parsed.experience.length < 3)) {
        parsed.experience = parsed.experienceByRole.flatMap((entry) =>
          entry.bullets?.length
            ? entry.bullets
            : [`${entry.role} at ${entry.company}${entry.dates ? ` (${entry.dates})` : ""}`]
        );
      }
    } catch (error) {
      console.warn("AI resume extraction failed, using heuristic fallback.", error);
    }

    const validSectors = (parsed.suggestedSectors || []).filter((s) => JOB_SECTORS.includes(s));
    parsed.suggestedSectors = validSectors.length > 0 ? validSectors : ["Retail"];

    return NextResponse.json({
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
  },
  {
    routeKey: "api:resume-analyze",
    rateLimit: { limit: 12, windowMs: 60_000 },
  }
);

