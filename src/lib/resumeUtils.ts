/**
 * Resume parsing utilities.
 * MVP: Extract text from PDF, parse into structured data for Canadian ATS optimization.
 */

/** One job/role with its own bullets — preserves section structure (Experience by role) */
export type ExperienceEntry = {
  role: string;
  company: string;
  dates?: string;
  bullets: string[];
};

/** A named group of skills for strategic, categorised display */
export type SkillCategory = {
  category: string;
  skills: string[];
};

export type ParsedResume = {
  name: string;
  email: string;
  phone: string;
  summary: string;
  experience: string[];
  /** When present, PDF and UI can render Experience by role with proper headings */
  experienceByRole?: ExperienceEntry[];
  skills: string[];
  /** When present, PDF renders skills grouped by strategic category */
  skillCategories?: SkillCategory[];
  education: string[];
  /** Certifications (e.g. WHMIS, Forklift, ServeIt Right) — often at end of resume */
  certifications?: string[];
  /** Total years of professional experience, extracted by AI from dates */
  yearsOfExperience?: number;
};

/** Fallback when parsing fails or no resume uploaded */
export function getFallbackResume(jobType: string, city: string): ParsedResume {
  return {
    name: "Your Name",
    email: "your.email@example.com",
    phone: "+1-555-0000",
    summary: `Results-oriented professional seeking ${jobType} opportunities in ${city}, Canada.`,
    experience: [
      "Relevant experience - Company Name (Year)",
      "Previous role - Previous Company (Year)",
    ],
    experienceByRole: undefined,
    skills: ["Teamwork", "Communication", "Problem Solving", "Attention to Detail"],
    education: ["Education - Institution (Year)"],
    certifications: undefined,
  };
}

/** Extract structured data from raw resume text using heuristics */
export function extractFromText(rawText: string): Partial<ParsedResume> {
  const text = rawText || "";
  const lines = text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);

  const result: Partial<ParsedResume> = {};

  // Email
  const emailMatch = text.match(/[\w.-]+@[\w.-]+\.\w+/);
  if (emailMatch) result.email = emailMatch[0];

  // Phone (common formats)
  const phoneMatch = text.match(/(?:\+?1[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}/);
  if (phoneMatch) result.phone = phoneMatch[0].trim();

  // Name: First short line that is purely letters, skipping common non-name headers
  const nameLine = lines.find((line) => {
    if (line.length > 50 || line.length < 3) return false;
    if (/[0-9@]/.test(line)) return false;
    const lower = line.toLowerCase();
    if (/^(resume|cv|curriculum vitae|page|contact|email|phone|mobile|location|address|linkedin|github|portfolio)\b/.test(lower)) return false;
    if (lower.includes(".com") || lower.includes("www.") || lower.includes("http")) return false;
    if (/^[A-Za-zÀ-ÖØ-öø-ÿ\s\-']+$/.test(line)) return true;
    return false;
  });

  if (nameLine) {
    if (nameLine === nameLine.toUpperCase() || nameLine === nameLine.toLowerCase()) {
      result.name = nameLine.split(/\s+/).map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(' ');
    } else {
      result.name = nameLine;
    }
  }

  // Extract bullet points / experience lines (• ● - * or numbered)
  const bulletLines = lines.filter(
    (l) => /^[•●\-\*]\s/.test(l) || /^\d+\.\s/.test(l) || (l.length > 25 && l.length < 200)
  );
  if (bulletLines.length > 0) {
    result.experience = bulletLines.slice(0, 12);
  }

  // Summary: text under "PROFESSIONAL SUMMARY" or "Summary"
  const summaryMatch = text.match(/(?:professional\s+)?summary\s*\n([\s\S]*?)(?=\n[A-Z][A-Z\s]+(?:\n|$)|core\s+competencies|experience|education)/i);
  if (summaryMatch) {
    const s = summaryMatch[1].replace(/\s+/g, " ").trim().slice(0, 500);
    if (s) result.summary = s;
  }

  // Skills: look for "Skills:" or "Core Competencies" or bullet lists of skills
  const skillsMatch = text.match(/(?:skills?|core\s+competencies)[:\s]*\n([\s\S]*?)(?=\n[A-Z][a-z]*\s*[:\n]|$)/i);
  if (skillsMatch) {
    const block = skillsMatch[1];
    result.skills = block
      .split(/\n/)
      .flatMap((line) => line.split(/[,;|●•\-]/))
      .map((s) => s.trim())
      .filter((s) => s.length > 1 && s.length < 50)
      .slice(0, 12);
  }

  // Education: look for "Education" section (handles end-of-document case)
  const educationMatch = text.match(/(?:education|academic|qualifications)[:\s]*\n([\s\S]*?)(?=\n[A-Z][A-Z\s]{3,}(?:\n|$)|\n(?:experience|work|skills|summary|projects|certifications)|\s*$)/i);
  if (educationMatch) {
    const block = educationMatch[1];
    result.education = block
      .split(/\n/)
      .map((l) => l.replace(/^[•●\-\*]\s*/, "").trim())
      .filter((l) => l.length > 5 && l.length < 200)
      .slice(0, 8);
  }

  // Certifications: look for "Certifications" section
  const certMatch = text.match(/(?:certifications?|licenses?|professional\s+development)[:\s]*\n([\s\S]*?)(?=\n[A-Z][A-Z\s]{3,}(?:\n|$)|\n(?:experience|work|skills|summary|education|references)|\s*$)/i);
  if (certMatch) {
    const block = certMatch[1];
    result.certifications = block
      .split(/\n/)
      .map((l) => l.replace(/^[•●\-\*]\s*/, "").trim())
      .filter((l) => l.length > 3 && l.length < 150)
      .slice(0, 10);
  }

  return result;
}

/** Merge extracted data with fallback - fills in missing fields */
export function mergeWithFallback(
  extracted: Partial<ParsedResume>,
  fallback: ParsedResume
): ParsedResume {
  return {
    name: extracted.name || fallback.name,
    email: extracted.email || fallback.email,
    phone: extracted.phone || fallback.phone,
    summary: extracted.summary || fallback.summary,
    experience: extracted.experience?.length ? extracted.experience : fallback.experience,
    experienceByRole: extracted.experienceByRole?.length ? extracted.experienceByRole : fallback.experienceByRole,
    skills: extracted.skills?.length ? extracted.skills : fallback.skills,
    education: extracted.education?.length ? extracted.education : fallback.education,
    certifications: extracted.certifications?.length ? extracted.certifications : fallback.certifications,
  };
}
