/**
 * Job skills enrichment layer.
 *
 * Flow:
 *  1. Check in-memory cache (24h TTL)
 *  2. Try DataAtWork API (free, no auth) for live skill data
 *  3. Fall back to curated Canadian-market data per sector
 *
 * Result is injected into the AI resume prompt so the model has real,
 * taxonomy-backed skills instead of hallucinating them.
 */

export type JobSkillsData = {
  /** Normalized skill names — injected into AI skills section */
  skills: string[];
  /** Standard duty phrases for this role type */
  duties: string[];
  /** ATS keywords for the sector — injected into AI keyword section */
  keywords: string[];
};

// ─── In-memory cache (server process lifetime + 24h TTL) ─────────────────────

const CACHE = new Map<string, { data: JobSkillsData; fetchedAt: number }>();
const CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

// ─── Curated fallback data per sector (Canadian market) ──────────────────────

const FALLBACK: Record<string, JobSkillsData> = {
  Retail: {
    skills: [
      "customer service", "POS systems", "cash handling", "inventory management",
      "merchandising", "upselling", "product knowledge", "loss prevention",
      "stock replenishment", "visual merchandising", "sales reporting", "team scheduling",
    ],
    duties: [
      "Assist customers with product selection and process transactions accurately",
      "Maintain organized and fully stocked shelves to merchandising standards",
      "Meet and exceed daily and weekly sales targets",
      "Handle customer complaints and resolve concerns professionally",
      "Support opening and closing procedures including cash reconciliation",
    ],
    keywords: [
      "retail sales", "customer experience", "KPI", "sales targets", "store operations",
      "team leadership", "scheduling", "compliance", "shrink reduction", "foot traffic",
    ],
  },

  Warehouse: {
    skills: [
      "forklift operation", "inventory control", "order picking & packing", "shipping & receiving",
      "WMS systems", "RF scanner", "WHMIS compliance", "quality control",
      "pallet stacking", "cycle counting", "logistics coordination", "weight verification",
    ],
    duties: [
      "Pick, pack, and verify orders to accuracy standards",
      "Operate forklift and material handling equipment safely",
      "Maintain inventory accuracy through regular cycle counts",
      "Follow health, safety, and WHMIS procedures at all times",
      "Coordinate inbound and outbound shipments with logistics team",
    ],
    keywords: [
      "warehouse operations", "supply chain", "WHMIS", "inventory accuracy",
      "throughput", "on-time shipping", "PPE compliance", "safety record",
      "pick rate", "receiving accuracy",
    ],
  },

  Trucking: {
    skills: [
      "Class 1 / Class 3 license", "route planning", "logbook maintenance",
      "cargo securement", "pre/post-trip inspection", "GPS navigation",
      "HOS regulations", "defensive driving", "customer delivery", "fleet communication",
    ],
    duties: [
      "Transport goods safely and on schedule across assigned routes",
      "Conduct thorough pre-trip and post-trip vehicle inspections",
      "Maintain accurate driver logs in compliance with HOS regulations",
      "Secure cargo according to provincial and federal safety standards",
      "Communicate proactively with dispatch and customers on ETA",
    ],
    keywords: [
      "DOT compliance", "HOS regulations", "on-time delivery", "cargo securement",
      "route optimization", "safety record", "fleet operations", "customer service",
      "fuel efficiency", "vehicle maintenance",
    ],
  },

  IT: {
    skills: [
      "software development", "system administration", "network configuration",
      "cloud platforms (AWS/Azure/GCP)", "troubleshooting", "cybersecurity",
      "database management", "agile/scrum", "API integration", "CI/CD pipelines",
      "technical documentation", "version control (Git)",
    ],
    duties: [
      "Develop, test, and maintain software applications and services",
      "Manage and monitor cloud infrastructure for uptime and performance",
      "Troubleshoot and resolve technical incidents within SLA targets",
      "Collaborate with cross-functional teams in agile sprint cycles",
      "Document technical processes, architecture decisions, and runbooks",
    ],
    keywords: [
      "CI/CD", "DevOps", "SLA", "uptime", "incident response", "scalability",
      "sprint velocity", "stakeholder management", "technical leadership",
      "security compliance", "disaster recovery",
    ],
  },

  Healthcare: {
    skills: [
      "patient care", "vital signs monitoring", "medication administration",
      "CPR / First Aid", "EMR systems", "infection control", "patient assessment",
      "care planning", "wound care", "clinical documentation",
      "team collaboration", "patient advocacy",
    ],
    duties: [
      "Provide direct patient care aligned with individualized care plans",
      "Monitor, record, and report vital signs and changes in condition",
      "Administer medications and treatments as directed by care team",
      "Maintain accurate and timely patient records in EMR systems",
      "Collaborate with physicians, nurses, and allied health professionals",
    ],
    keywords: [
      "patient outcomes", "care coordination", "regulatory compliance",
      "evidence-based practice", "patient safety", "quality of care",
      "clinical documentation", "infection prevention", "accreditation standards",
    ],
  },
};

// ─── DataAtWork API fetcher ───────────────────────────────────────────────────

type DataAtWorkJob = { suggestion: string; uuid: string };
type DataAtWorkSkill = { skill_name: string; importance: number };
type DataAtWorkSkillsResponse = { job: { uuid: string; title: string }; skills: DataAtWorkSkill[] };

async function fetchFromDataAtWork(jobTitle: string): Promise<Partial<JobSkillsData> | null> {
  try {
    // Step 1 — find the closest matching job UUID
    const searchRes = await fetch(
      `http://api.dataatwork.org/v1/jobs/autocomplete?contains=${encodeURIComponent(jobTitle)}&limit=1`,
      { signal: AbortSignal.timeout(5000) }
    );
    if (!searchRes.ok) return null;

    const jobs = (await searchRes.json()) as DataAtWorkJob[];
    if (!jobs?.length) return null;

    const uuid = jobs[0].uuid;

    // Step 2 — fetch skills for that job
    const skillsRes = await fetch(
      `http://api.dataatwork.org/v1/jobs/${uuid}/related_skills`,
      { signal: AbortSignal.timeout(5000) }
    );
    if (!skillsRes.ok) return null;

    const data = (await skillsRes.json()) as DataAtWorkSkillsResponse;
    const skills = (data.skills ?? [])
      .sort((a, b) => b.importance - a.importance)
      .slice(0, 12)
      .map((s) => s.skill_name.toLowerCase());

    return { skills, keywords: skills.slice(0, 8) };
  } catch {
    // Network error, timeout, or parse failure — silently fall back
    return null;
  }
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Returns enriched skills, duties, and ATS keywords for a given job type.
 * Always returns data — API failures fall back to curated sector data.
 */
export async function getJobSkills(jobType: string): Promise<JobSkillsData> {
  const cacheKey = jobType.toLowerCase().trim();

  const cached = CACHE.get(cacheKey);
  if (cached && Date.now() - cached.fetchedAt < CACHE_TTL_MS) {
    return cached.data;
  }

  const fallback = FALLBACK[jobType] ?? FALLBACK.Retail;

  // Try live API — merge with fallback, deduplicate
  const apiData = await fetchFromDataAtWork(jobType);

  const dedupe = (arr: string[]) => Array.from(new Set(arr));

  const merged: JobSkillsData = {
    skills: apiData?.skills?.length
      ? dedupe([...apiData.skills, ...fallback.skills]).slice(0, 15)
      : fallback.skills,
    duties: fallback.duties, // DataAtWork doesn't return structured duties
    keywords: apiData?.keywords?.length
      ? dedupe([...apiData.keywords, ...fallback.keywords]).slice(0, 12)
      : fallback.keywords,
  };

  CACHE.set(cacheKey, { data: merged, fetchedAt: Date.now() });
  return merged;
}
