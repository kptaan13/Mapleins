/**
 * Resume PDF generation — Mapleins ATS-optimised format.
 *
 * DATA FLOW:
 * 1. Dashboard: upload PDF → POST /api/resume/analyze → { name, email, phone, summary, experience, skills }
 * 2. Dashboard saves result to sessionStorage as "mapleinsResumeAnalysis"
 * 3. Resume-results page: "Download" POSTs here with body { jobType, city, parsedData }
 * 4. This route renders MapleinsResumePDF → returns PDF bytes
 */
import { NextRequest } from "next/server";

export const runtime = "nodejs";
import React from "react";
import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  renderToStream,
} from "@react-pdf/renderer";
import {
  getFallbackResume,
  extractFromText,
  mergeWithFallback,
  type ParsedResume,
  type ExperienceEntry,
  type SkillCategory,
} from "@/lib/resumeUtils";
import { callAI } from "@/lib/ai";
import {
  getCompetencyProfile,
  rerankBullets,
  getSeniorityTier,
  extractJDKeywords,
} from "@/lib/competencyProfiles";
import { extractTextFromPDFUrl } from "@/lib/pdfExtract";

// ─── Placeholder filter ───────────────────────────────────────────────────────

const PLACEHOLDER_STRINGS = [
  "not provided", "your name", "n/a", "none", "unknown",
  "your email", "your phone", "not available", "placeholder",
];

function isPlaceholder(val: string | undefined): boolean {
  if (!val?.trim()) return true;
  const lower = val.trim().toLowerCase();
  if (PLACEHOLDER_STRINGS.includes(lower)) return true;
  if (lower.includes("example.com")) return true;
  if (/^\+?1?[-.\s]?555/.test(lower)) return true;
  return false;
}

function cleanValue(val: string | undefined, fallback: string): string {
  return isPlaceholder(val) ? fallback : val!.trim();
}

// ─── PDF Styles ───────────────────────────────────────────────────────────────

const GREEN = "#166534";
const DARK  = "#111827";
const MID   = "#374151";
const LIGHT = "#6b7280";

const styles = StyleSheet.create({
  page: {
    paddingTop: 40,
    paddingBottom: 48,
    paddingHorizontal: 48,
    fontFamily: "Helvetica",
    backgroundColor: "#ffffff",
  },

  // ── Header ──────────────────────────────────────────────────────────────────
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 2,
  },
  name: {
    fontSize: 22,
    fontFamily: "Helvetica-Bold",
    color: DARK,
    letterSpacing: 0.3,
  },
  jobTitle: {
    fontSize: 10,
    color: GREEN,
    fontFamily: "Helvetica-Bold",
    letterSpacing: 0.1,
    marginBottom: 4,
  },
  contactRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
    marginBottom: 2,
  },
  contactText: { fontSize: 9, color: LIGHT },

  // ── Divider ─────────────────────────────────────────────────────────────────
  divider: {
    marginVertical: 8,
    height: 1,
    backgroundColor: "#e5e7eb",
  },

  // ── Section ─────────────────────────────────────────────────────────────────
  section: { marginBottom: 10 },
  sectionTitle: {
    fontSize: 9,
    fontFamily: "Helvetica-Bold",
    color: GREEN,
    letterSpacing: 1.2,
    textTransform: "uppercase",
    marginBottom: 5,
  },

  // ── Body text ───────────────────────────────────────────────────────────────
  bodyText: { fontSize: 9.5, color: MID, lineHeight: 1.5 },

  // ── Experience ──────────────────────────────────────────────────────────────
  roleHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 1,
  },
  roleTitle: {
    fontSize: 10,
    fontFamily: "Helvetica-Bold",
    color: DARK,
  },
  roleDates: {
    fontSize: 9,
    color: LIGHT,
    textAlign: "right",
  },
  roleCompany: {
    fontSize: 9.5,
    color: GREEN,
    marginBottom: 5,
  },
  bulletRow: { flexDirection: "row", marginBottom: 4 },
  bulletDot: { fontSize: 9.5, color: GREEN, width: 12 },
  bulletText: { fontSize: 9.5, color: MID, flex: 1, lineHeight: 1.45 },

  // ── Skills ───────────────────────────────────────────────────────────────────
  skillsCategoryLabel: {
    fontSize: 8.5,
    fontFamily: "Helvetica-Bold",
    color: DARK,
    marginBottom: 3,
    marginTop: 5,
  },
  skillsRow: { flexDirection: "row", flexWrap: "wrap", gap: 5 },
  skillChip: {
    fontSize: 8.5,
    color: GREEN,
    backgroundColor: "#f0fdf4",
    borderColor: "#bbf7d0",
    borderWidth: 1,
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 4,
  },

  // ── Footer ──────────────────────────────────────────────────────────────────
  footer: {
    position: "absolute",
    bottom: 20,
    left: 48,
    right: 48,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  footerText: { fontSize: 7.5, color: "#9ca3af" },
});

// ─── PDF Component ────────────────────────────────────────────────────────────

function MapleinsResumePDF({
  parsed,
  jobType,
  city,
}: {
  parsed: ParsedResume;
  jobType: string;
  city: string;
}) {
  const contactParts = [parsed.email, parsed.phone, city].filter(
    (v) => v && !isPlaceholder(v)
  );

  const hasCategories =
    (parsed.skillCategories?.length ?? 0) > 0 &&
    parsed.skillCategories!.some((c) => c.skills.length > 0);

  // Use experienceByRole if available, otherwise fall back to flat experience list
  const useRoleView = (parsed.experienceByRole?.length ?? 0) > 0;
  const hasBullets = useRoleView
    ? parsed.experienceByRole!.some((e) => (e?.bullets?.length ?? 0) > 0)
    : parsed.experience.filter(Boolean).length > 0;

  // Build page children as an array and filter out null/undefined/false
  // @react-pdf/renderer does NOT handle boolean false as a child — must filter explicitly
  const pageChildren = [
    // ── Header
    React.createElement(
      View,
      { style: styles.headerRow },
      React.createElement(Text, { style: styles.name }, parsed.name)
    ),
    React.createElement(Text, { style: styles.jobTitle }, jobType),
    contactParts.length > 0
      ? React.createElement(
          View,
          { style: styles.contactRow },
          ...contactParts.map((part) =>
            React.createElement(Text, { key: part, style: styles.contactText }, part)
          )
        )
      : null,

    // ── Divider
    React.createElement(View, { style: styles.divider }),

    // ── Professional Summary
    parsed.summary && !isPlaceholder(parsed.summary)
      ? React.createElement(
          View,
          { style: styles.section },
          React.createElement(Text, { style: styles.sectionTitle }, "Professional Summary"),
          React.createElement(Text, { style: styles.bodyText }, parsed.summary)
        )
      : null,

    // ── Professional Experience
    hasBullets
      ? React.createElement(
          View,
          { style: styles.section },
          React.createElement(Text, { style: styles.sectionTitle }, "Professional Experience"),
          ...(useRoleView
            ? parsed.experienceByRole!
                .filter((e) => e?.role || (e?.bullets?.length ?? 0) > 0)
                .map((entry, roleIdx) =>
                  React.createElement(
                    View,
                    { key: `role-${roleIdx}`, style: { marginBottom: 10 } },
                    React.createElement(
                      View,
                      { style: styles.roleHeaderRow },
                      React.createElement(Text, { style: styles.roleTitle }, entry.role || ""),
                      entry.dates
                        ? React.createElement(Text, { style: styles.roleDates }, entry.dates)
                        : null
                    ),
                    entry.company
                      ? React.createElement(Text, { style: styles.roleCompany }, entry.company)
                      : null,
                    ...(entry.bullets || [])
                      .filter(Boolean)
                      .slice(0, 12)
                      .map((bullet, bi) =>
                        React.createElement(
                          View,
                          { key: `b-${bi}`, style: styles.bulletRow },
                          React.createElement(Text, { style: styles.bulletDot }, "▸"),
                          React.createElement(Text, { style: styles.bulletText }, bullet)
                        )
                      )
                  )
                )
            : parsed.experience
                .filter(Boolean)
                .slice(0, 20)
                .map((exp, i) =>
                  React.createElement(
                    View,
                    { key: i, style: styles.bulletRow },
                    React.createElement(Text, { style: styles.bulletDot }, "▸"),
                    React.createElement(Text, { style: styles.bulletText }, exp)
                  )
                ))
        )
      : null,

    // ── Core Competencies
    hasCategories || parsed.skills.length > 0
      ? React.createElement(
          View,
          { style: styles.section },
          React.createElement(Text, { style: styles.sectionTitle }, "Core Competencies"),
          ...(hasCategories
            ? parsed.skillCategories!
                .filter((cat) => cat.skills.length > 0)
                .flatMap((cat, ci) => [
                  React.createElement(
                    Text,
                    { key: `cat-${ci}`, style: styles.skillsCategoryLabel },
                    cat.category
                  ),
                  React.createElement(
                    View,
                    { key: `chips-${ci}`, style: { ...styles.skillsRow, marginBottom: 6 } },
                    ...cat.skills
                      .filter(Boolean)
                      .slice(0, 10)
                      .map((skill, si) =>
                        React.createElement(Text, { key: si, style: styles.skillChip }, skill)
                      )
                  ),
                ])
            : [
                React.createElement(
                  View,
                  { key: "flat", style: styles.skillsRow },
                  ...parsed.skills
                    .filter(Boolean)
                    .slice(0, 16)
                    .map((skill, i) =>
                      React.createElement(Text, { key: i, style: styles.skillChip }, skill)
                    )
                ),
              ])
        )
      : null,

    // ── Education
    parsed.education?.length > 0 && !isPlaceholder(parsed.education[0])
      ? React.createElement(
          View,
          { style: styles.section },
          React.createElement(Text, { style: styles.sectionTitle }, "Education"),
          ...parsed.education
            .filter((e) => e && !isPlaceholder(e))
            .map((edu, i) =>
              React.createElement(
                View,
                { key: i, style: styles.bulletRow },
                React.createElement(Text, { style: styles.bulletDot }, "▸"),
                React.createElement(Text, { style: styles.bulletText }, edu)
              )
            )
        )
      : null,

    // ── Certifications
    (parsed.certifications?.length ?? 0) > 0 &&
    !(parsed.certifications ?? []).every((c) => !c || isPlaceholder(c))
      ? React.createElement(
          View,
          { style: styles.section },
          React.createElement(Text, { style: styles.sectionTitle }, "Certifications"),
          ...(parsed.certifications ?? [])
            .filter((c) => c && !isPlaceholder(c))
            .map((cert, i) =>
              React.createElement(
                View,
                { key: i, style: styles.bulletRow },
                React.createElement(Text, { style: styles.bulletDot }, "▸"),
                React.createElement(Text, { style: styles.bulletText }, cert)
              )
            )
        )
      : null,

    // ── Footer
    React.createElement(
      View,
      { style: styles.footer },
      React.createElement(Text, { style: styles.footerText }, "Generated by Mapleins.ca"),
      React.createElement(
        Text,
        { style: styles.footerText },
        `Tailored for ${jobType} roles · ${city}`
      )
    ),
  ].filter(Boolean) as React.ReactElement[];

  return React.createElement(
    Document,
    null,
    React.createElement(Page, { size: "A4", style: styles.page }, ...pageChildren)
  );
}

// ─── Merge helpers ────────────────────────────────────────────────────────────

async function fetchAndParseResume(resumeUrl: string): Promise<string> {
  return extractTextFromPDFUrl(resumeUrl);
}

function buildParsedResume(
  ai: {
    name?: string;
    email?: string;
    phone?: string;
    summary?: string;
    experience?: string[];
    experienceByRole?: ExperienceEntry[];
    skillCategories?: SkillCategory[];
    skills?: string[];
    education?: string[];
    certifications?: string[];
    yearsOfExperience?: number;
  },
  fallback: ParsedResume
): ParsedResume {
  // For name: use whatever the user's resume produced (even "Your Name" — it's their data).
  // Only fall back to the generic default if the field is completely blank.
  const name = ai.name?.trim() || fallback.name;

  return {
    name,
    email: cleanValue(ai.email, fallback.email),
    phone: cleanValue(ai.phone, fallback.phone),
    summary: cleanValue(ai.summary, fallback.summary),
    experience: ai.experience?.filter(Boolean).length
      ? ai.experience.filter(Boolean)
      : fallback.experience,
    experienceByRole: ai.experienceByRole?.length ? ai.experienceByRole : fallback.experienceByRole,
    skillCategories: ai.skillCategories?.length ? ai.skillCategories : fallback.skillCategories,
    skills: ai.skills?.filter(Boolean).length ? ai.skills.filter(Boolean) : fallback.skills,
    education: ai.education?.filter(Boolean).length
      ? ai.education.filter(Boolean)
      : fallback.education,
    certifications: ai.certifications?.filter(Boolean).length
      ? ai.certifications.filter(Boolean)
      : fallback.certifications,
    yearsOfExperience: ai.yearsOfExperience ?? 0,
  };
}

// ─── Pre-processing: bullet re-ranking + seniority prep ───────────────────────

function applyCompetencyEnhancements(
  parsed: ParsedResume,
  jobType: string
): ParsedResume {
  const profile = getCompetencyProfile(jobType);
  if (!profile || !parsed.experienceByRole?.length) return parsed;

  const reranked = parsed.experienceByRole.map((entry) => ({
    ...entry,
    bullets: rerankBullets(entry.bullets, profile),
  }));

  return { ...parsed, experienceByRole: reranked };
}

// ─── AI Refinement ────────────────────────────────────────────────────────────

const WEAK_PHRASES = [
  "responsible for", "helped with", "assisted in", "worked on",
  "participated in", "involved in", "duties included", "tasks included",
  "was part of", "supported the team",
];

type ResumeVersion = "ats" | "leadership" | "concise";

async function refineResumeForATS(
  parsed: ParsedResume,
  jobType: string,
  city: string,
  version: ResumeVersion = "ats",
  jobDescriptionKeywords: string[] = []
): Promise<ParsedResume> {
  const years = parsed.yearsOfExperience ?? 0;
  const tier = getSeniorityTier(years);

  const seniorityInstruction =
    tier === "entry"
      ? `The candidate is early-career (${years} yrs). Use action verbs like: Assisted, Supported, Coordinated, Processed, Achieved. Focus on accuracy, learning, and volume.`
      : tier === "mid"
      ? `The candidate is mid-career (${years} yrs). Use action verbs like: Managed, Delivered, Improved, Led, Developed, Implemented. Focus on team ownership and measurable results.`
      : `The candidate is senior (${years}+ yrs). Use executive verbs like: Directed, Oversaw, Drove, Transformed, Owned, Scaled, Built. Focus on P&L, leadership scope, and business transformation.`;

  const versionInstruction =
    version === "leadership"
      ? `VERSION: Leadership-Focused. Emphasise team size, budget ownership, stakeholder management, and strategic decisions. Use executive language throughout. For the summary, lead with leadership scope.`
      : version === "concise"
      ? `VERSION: Concise 1-Page. Use maximum 3 bullets per role. Summary must be exactly 2 sentences. Skills: max 10 total. Keep everything tight.`
      : `VERSION: ATS Optimised. Maximise keyword density for "${jobType}" roles. Include all technical skills, tools, and certifications. Use industry-standard terminology throughout.`;

  const kwInstruction =
    jobDescriptionKeywords.length > 0
      ? `KEYWORD INJECTION: The hiring manager's job description uses these key terms — naturally weave as many as possible into the summary, bullets, and skills (do NOT keyword-stuff, maintain readability): ${jobDescriptionKeywords.join(", ")}.`
      : "";

  const experienceByRoleForAI =
    parsed.experienceByRole?.length
      ? parsed.experienceByRole
      : [{ role: "", company: "", bullets: parsed.experience.filter(Boolean) }];

  const resumeForAI = {
    summary: parsed.summary,
    experienceByRole: experienceByRoleForAI,
    skills: parsed.skills,
    education: parsed.education,
  };

  const systemPrompt = `You are a senior Canadian resume writer. Rewrite this resume for "${jobType}" roles in ${city}, Canada.

${versionInstruction}

${seniorityInstruction}

${kwInstruction}

━━━ PROFESSIONAL SUMMARY ━━━
Write 4–5 sentences — no filler, no clichés:
• Sentence 1: ${years > 0 ? years : "Several"} years of [specialisation] experience, targeting "${jobType}" roles.
• Sentence 2: Include 1–2 specific, measurable achievements (team size, revenue, %, $ budget).
• Sentence 3: Value you bring to a ${city} employer — sector insight, leadership scope, or domain expertise.
• Sentences 4–5: Briefly mention 2–3 core strengths or domains (tools, industries, leadership scope) that matter for "${jobType}" in ${city}.
BANNED: "passionate", "results-oriented", "dynamic", "team player", "hardworking", "dedicated", "seeking opportunities".

━━━ EXPERIENCE BULLETS ━━━
1. Start EVERY bullet with a strong past-tense action verb.
2. NEVER use: ${WEAK_PHRASES.map((p) => `"${p}"`).join(", ")}.
3. Target 5–8 bullets per role. When the original role has 5+ bullets, you MUST return at least 5 improved bullets for that role (never collapse a detailed role down to only 1–2 bullets).
4. AT LEAST 2 of the bullets for each role must include hard numbers (team size, %, $, volume, timeframe).
   Formula: Action Verb + Scope + Result + Metric (+ Timeframe if available)
   Examples:
   • "Managed a team of 14 across 3 store departments, exceeding sales targets by 22% in Q4."
   • "Streamlined inbound logistics process, reducing receiving errors by 38% over 6 months."
   • "Coordinated 180+ daily deliveries across GTA, maintaining 97% on-time rate."
5. Add KPI/ownership language: "P&L ownership", "budget accountability of $X", "reporting to Director".
6. Bullet = 1 sentence, under 25 words. Specific beats vague.
7. If no numbers exist in original: estimate realistic ones based on typical company size and role. DO NOT invent employers, titles, or dates.

━━━ CREDIBILITY CHECK ━━━
Before including any achievement, verify:
- Revenue claims over $10M: add "annualised" or "cumulative" qualifier
- Team sizes over 50: add department or division context
- % improvements over 60%: add timeframe and baseline context
If a claim seems extreme and unverifiable, soften it with a qualifier, don't remove it.

━━━ SKILLS (STRATEGIC CATEGORIES) ━━━
Group into exactly 4 named categories. Most "${jobType}"-relevant categories first. Max 8 skills each. Remove filler ("hard-working", "fast learner"):
- "Leadership & Management"
- "Technical & Domain Skills"
- "Operations & Process"
- "Communication & Interpersonal"

━━━ EXPERIENCE STRUCTURE ━━━
For EVERY role in experienceByRole, you MUST return ALL three fields:
- "role": copy EXACTLY from input — never rename or invent titles
- "company": copy EXACTLY from input — never rename, leave blank, or invent employers
- "dates": copy EXACTLY from input — never change dates
Only the "bullets" array may be rewritten.

━━━ EDUCATION ━━━
Return EXACTLY as provided — zero changes.

Return ONLY valid JSON. No markdown:
{
  "summary": "3 sentences, numbers included",
  "experienceByRole": [
    { "role": "Title", "company": "Company", "dates": "Month Year – Month Year",
      "bullets": ["Action verb bullet with metric", "Action verb bullet with metric"] }
  ],
  "skillCategories": [
    { "category": "Leadership & Management", "skills": ["skill1"] },
    { "category": "Technical & Domain Skills", "skills": ["skill1"] },
    { "category": "Operations & Process", "skills": ["skill1"] },
    { "category": "Communication & Interpersonal", "skills": ["skill1"] }
  ],
  "skills": ["flat list, most relevant first"],
  "education": ["unchanged"]
}`;

  const userPrompt = `Rewrite for ${jobType} in ${city}, Canada.\nIMPORTANT: The JSON below is the ONLY source of truth. Copy every "role", "company", and "dates" field EXACTLY — do not rename, merge, omit, or leave blank.\n\n${JSON.stringify(resumeForAI)}`;

  try {
    const { content } = await callAI([
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt.slice(0, 12000) },
    ]);

    let raw = content.trim();
    raw = raw.replace(/^```\w*\n?/, "").replace(/\n?```$/, "");
    // AI may return "Here is the JSON:" or similar — extract the JSON object
    const firstBrace = raw.indexOf("{");
    const lastBrace = raw.lastIndexOf("}");
    if (firstBrace >= 0 && lastBrace > firstBrace) {
      raw = raw.slice(firstBrace, lastBrace + 1);
    }
    const json = JSON.parse(raw) as {
      summary?: string;
      experienceByRole?: ExperienceEntry[];
      skillCategories?: SkillCategory[];
      skills?: string[];
      education?: string[];
    };

    const flatSkills =
      json.skillCategories?.flatMap((c) => c.skills) ??
      (json.skills?.length ? json.skills : parsed.skills);

    // Merge AI-rewritten bullets back onto ORIGINAL role/company/dates metadata.
    // The AI is only trusted to improve bullet text — never to rename or drop employers.
    const originalRoles = parsed.experienceByRole ?? [];
    const aiRoles = json.experienceByRole ?? [];

    const MIN_BULLETS_PER_ROLE = 5;
    const MAX_BULLETS_PER_ROLE = 8;

    const mergedByRole: ExperienceEntry[] = aiRoles.map((aiEntry, idx) => {
      const original = originalRoles[idx];
      const originalBullets = (original?.bullets ?? []).filter(Boolean);
      const aiBullets = (aiEntry.bullets ?? []).filter(Boolean);

      let bullets = aiBullets;

      // If the original role had 5+ bullets, we want to keep that richness.
      if (originalBullets.length >= MIN_BULLETS_PER_ROLE) {
        if (aiBullets.length === 0) {
          // AI failed to return bullets — fall back to original, capped at MAX_BULLETS_PER_ROLE
          bullets = originalBullets.slice(0, MAX_BULLETS_PER_ROLE);
        } else {
          // Start with AI bullets, then top up with original ones until we reach 5–8
          const combined = [...aiBullets];
          for (const b of originalBullets) {
            if (combined.length >= MAX_BULLETS_PER_ROLE) break;
            if (!combined.includes(b)) combined.push(b);
          }
          if (combined.length < MIN_BULLETS_PER_ROLE) {
            for (const b of originalBullets) {
              if (combined.length >= MIN_BULLETS_PER_ROLE) break;
              if (!combined.includes(b)) combined.push(b);
            }
          }
          bullets = combined;
        }
      } else if (aiBullets.length < MIN_BULLETS_PER_ROLE && originalBullets.length > aiBullets.length) {
        // Original had fewer than 5, but still more than AI: gently top up from original
        const target = Math.min(MIN_BULLETS_PER_ROLE, originalBullets.length);
        const combined = [...aiBullets];
        for (const b of originalBullets) {
          if (combined.length >= target) break;
          if (!combined.includes(b)) combined.push(b);
        }
        bullets = combined;
      }

      return {
        role:    original?.role    || aiEntry.role    || "",
        company: original?.company || aiEntry.company || "",
        dates:   original?.dates   || aiEntry.dates   || "",
        bullets,
      };
    });
    // If AI returned fewer roles than original, append remaining originals
    if (originalRoles.length > aiRoles.length) {
      for (let i = aiRoles.length; i < originalRoles.length; i++) {
        mergedByRole.push(originalRoles[i]);
      }
    }

    const refined: ParsedResume = {
      name:             parsed.name,
      email:            parsed.email,
      phone:            parsed.phone,
      summary:          json.summary?.trim() || parsed.summary,
      experience:       mergedByRole.flatMap((e) => e.bullets),
      experienceByRole: mergedByRole.length ? mergedByRole : parsed.experienceByRole,
      skillCategories:  json.skillCategories?.length ? json.skillCategories : parsed.skillCategories,
      skills:           flatSkills.filter(Boolean),
      education:        json.education?.length ? json.education : parsed.education,
      certifications:   parsed.certifications?.length ? parsed.certifications : undefined,
      yearsOfExperience: parsed.yearsOfExperience,
    };

    if (!refined.experienceByRole?.length && refined.experience.length > 0) {
      refined.experienceByRole = [{ role: "", company: "", bullets: refined.experience }];
    }

    return refined;
  } catch (err) {
    console.warn("AI refinement failed, using original content:", err);
    return parsed;
  }
}

async function buildPdfResponse(
  parsed: ParsedResume,
  jobType: string,
  city: string,
  filename = "Mapleins-Resume.pdf"
) {
  const doc = MapleinsResumePDF({ parsed, jobType, city });
  const stream = await renderToStream(doc);
  const chunks: Buffer[] = [];
  for await (const chunk of stream) {
    chunks.push(Buffer.from(chunk));
  }
  const buffer = Buffer.concat(chunks);

  return new Response(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}

// ─── Route handlers ───────────────────────────────────────────────────────────

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const jobType = searchParams.get("jobType") || "Retail";
  const city = searchParams.get("city") || "Toronto";
  const resumeUrl = searchParams.get("resumeUrl") || "";

  let parsed: ParsedResume = getFallbackResume(jobType, city);

  if (resumeUrl) {
    try {
      const rawText = await fetchAndParseResume(resumeUrl);
      if (rawText?.trim()) {
        const extracted = extractFromText(rawText);
        parsed = mergeWithFallback(extracted, getFallbackResume(jobType, city));
      }
    } catch (err) {
      console.error("Resume parse error:", err);
    }
  }

  const enhanced = applyCompetencyEnhancements(parsed, jobType);
  const refined = await refineResumeForATS(enhanced, jobType, city);
  return buildPdfResponse(refined, jobType, city);
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { jobType, city, parsedData, version, jobDescription, skipRefinement } = body as {
      jobType?: string;
      city?: string;
      version?: ResumeVersion;
      jobDescription?: string;
      skipRefinement?: boolean;
      parsedData?: {
        name?: string;
        email?: string;
        phone?: string;
        summary?: string;
        experience?: string[];
        experienceByRole?: ExperienceEntry[];
        skillCategories?: SkillCategory[];
        skills?: string[];
        certifications?: string[];
        education?: string[];
        yearsOfExperience?: number;
      };
    };

    const jt = jobType || "Retail";
    const c = city || "Toronto";
    const v: ResumeVersion = version || "ats";
    const jdKeywords = jobDescription ? extractJDKeywords(jobDescription) : [];

    const fallback = getFallbackResume(jt, c);
    const parsed = parsedData ? buildParsedResume(parsedData, fallback) : fallback;

    // When skipRefinement is true (e.g. from Live Editor), use content as-is so the PDF matches what the user saved
    if (skipRefinement) {
      return buildPdfResponse(parsed, jt, c, "Mapleins-Resume.pdf");
    }

    // Apply pre-processing: re-rank bullets by relevance to target role
    const enhanced = applyCompetencyEnhancements(parsed, jt);

    // AI refinement with version + JD keyword injection
    const refined = await refineResumeForATS(enhanced, jt, c, v, jdKeywords);

    const versionLabel =
      v === "leadership" ? "Leadership" : v === "concise" ? "Concise" : "ATS";
    const filename = `Mapleins-Resume-${versionLabel}.pdf`;

    return buildPdfResponse(refined, jt, c, filename);
  } catch (err) {
    console.error("Generate POST error:", err);
    return Response.json(
      { error: err instanceof Error ? err.message : "Generation failed" },
      { status: 500 }
    );
  }
}
