/**
 * Competency profiles — map job titles to the skills, metrics, and keywords
 * recruiters look for. Used for:
 *  - Bullet re-ranking (most relevant bullets surface first per role)
 *  - Keyword injection from job description
 *  - Seniority-tone calibration
 *  - Skill gap detection
 */

export type CompetencyProfile = {
  /** Canonical label for matching */
  label: string;
  /** Alternative titles that map to this profile */
  aliases: string[];
  /** Primary metrics that matter for this role */
  metrics: string[];
  /** Must-have skills / keywords for ATS matching */
  coreKeywords: string[];
  /** Buzzwords recruiters in this sector use */
  industryTerms: string[];
  /** Which seniority levels exist and their tone signature */
  seniorityLadder: {
    entry: string[];   // action verbs / tone for 0–3 yrs
    mid: string[];     // 3–8 yrs
    senior: string[];  // 8+ yrs
  };
  /** Bullet topics that are HIGH value for this role (used for re-ranking) */
  highValueTopics: string[];
  /** Bullet topics that are LOW value / generic (deprioritised) */
  lowValueTopics: string[];
};

// ─── Profile definitions ─────────────────────────────────────────────────────

const PROFILES: CompetencyProfile[] = [
  {
    label: "Store Manager",
    aliases: ["store manager", "retail manager", "shop manager", "branch manager", "boutique manager"],
    metrics: ["revenue", "sales", "KPI", "shrink", "loss prevention", "conversion rate", "AOV", "P&L", "EBITDA"],
    coreKeywords: ["P&L", "inventory management", "staff scheduling", "visual merchandising", "customer experience", "sales targets", "loss prevention", "shrinkage", "KPI"],
    industryTerms: ["floor coverage", "planogram", "markdown", "replenishment", "footfall", "basket size", "UPT"],
    seniorityLadder: {
      entry:  ["Assisted", "Supported", "Processed", "Handled", "Served"],
      mid:    ["Coordinated", "Managed", "Supervised", "Achieved", "Drove"],
      senior: ["Directed", "Oversaw", "Grew", "Transformed", "Delivered", "Led"],
    },
    highValueTopics: ["revenue", "sales growth", "team", "P&L", "shrink", "KPI", "target", "budget"],
    lowValueTopics:  ["answered phones", "filed paperwork", "cleaned", "opened store"],
  },
  {
    label: "Operations Manager",
    aliases: ["operations manager", "operations supervisor", "ops manager", "operations lead", "warehouse operations manager"],
    metrics: ["efficiency", "throughput", "on-time delivery", "OEE", "cost reduction", "SLA", "error rate", "headcount"],
    coreKeywords: ["process improvement", "workflow", "SOP", "lean", "KPI", "capacity planning", "compliance", "safety", "cost reduction"],
    industryTerms: ["Six Sigma", "5S", "Kaizen", "CAPA", "SOP", "throughput", "OEE", "turnaround time"],
    seniorityLadder: {
      entry:  ["Supported", "Monitored", "Assisted", "Tracked", "Logged"],
      mid:    ["Implemented", "Coordinated", "Managed", "Optimised", "Streamlined"],
      senior: ["Architected", "Transformed", "Directed", "Scaled", "Led", "Drove"],
    },
    highValueTopics: ["efficiency", "cost reduction", "process improvement", "SLA", "delivery", "compliance", "safety", "headcount"],
    lowValueTopics:  ["answered emails", "attended meetings", "general tasks"],
  },
  {
    label: "Warehouse Supervisor",
    aliases: ["warehouse supervisor", "warehouse lead", "logistics supervisor", "distribution supervisor", "warehouse team lead"],
    metrics: ["pick rate", "accuracy rate", "on-time shipment", "shrinkage", "safety incidents", "throughput"],
    coreKeywords: ["forklift", "WMS", "inventory", "pick and pack", "receiving", "shipping", "safety compliance", "RF scanner", "FIFO", "3PL"],
    industryTerms: ["WMS", "FIFO", "LIFO", "cycle count", "dock", "SKU", "3PL", "inbound", "outbound", "manifest"],
    seniorityLadder: {
      entry:  ["Assisted", "Operated", "Picked", "Processed", "Loaded"],
      mid:    ["Supervised", "Coordinated", "Managed", "Trained", "Ensured"],
      senior: ["Led", "Oversaw", "Directed", "Implemented", "Reduced", "Improved"],
    },
    highValueTopics: ["safety", "accuracy", "throughput", "team", "inventory", "pick rate", "shipment"],
    lowValueTopics:  ["swept floors", "general labour", "basic tasks"],
  },
  {
    label: "Data Analyst",
    aliases: ["data analyst", "business analyst", "BI analyst", "reporting analyst", "analytics specialist"],
    metrics: ["data accuracy", "report delivery time", "query performance", "dashboard adoption", "business impact", "cost savings"],
    coreKeywords: ["SQL", "Python", "Excel", "Power BI", "Tableau", "data modelling", "ETL", "KPI", "dashboard", "reporting"],
    industryTerms: ["ETL", "data warehouse", "OLAP", "pivot", "regression", "A/B testing", "cohort analysis", "data pipeline"],
    seniorityLadder: {
      entry:  ["Assisted", "Compiled", "Prepared", "Extracted", "Maintained"],
      mid:    ["Developed", "Built", "Analysed", "Designed", "Automated"],
      senior: ["Architected", "Led", "Transformed", "Drove", "Delivered", "Owned"],
    },
    highValueTopics: ["dashboard", "SQL", "Python", "model", "automation", "insight", "cost saving", "efficiency"],
    lowValueTopics:  ["data entry", "basic excel", "copy-paste", "manual tasks"],
  },
  {
    label: "Customer Service Representative",
    aliases: ["customer service rep", "customer service agent", "customer support", "client service representative", "call centre agent", "CSR"],
    metrics: ["CSAT", "NPS", "FCR", "AHT", "call volume", "resolution rate", "escalation rate"],
    coreKeywords: ["customer satisfaction", "CSAT", "NPS", "CRM", "conflict resolution", "de-escalation", "SLA", "ticketing system", "upselling"],
    industryTerms: ["CSAT", "NPS", "FCR", "AHT", "Zendesk", "Salesforce", "Freshdesk", "ticketing", "queue"],
    seniorityLadder: {
      entry:  ["Handled", "Resolved", "Assisted", "Responded", "Processed"],
      mid:    ["Managed", "Achieved", "Trained", "Improved", "Coordinated"],
      senior: ["Led", "Drove", "Implemented", "Reduced", "Developed", "Mentored"],
    },
    highValueTopics: ["CSAT", "resolution", "escalation", "training", "upsell", "volume", "satisfaction"],
    lowValueTopics:  ["answered phones", "took messages", "basic tasks"],
  },
  {
    label: "Software Developer",
    aliases: ["software developer", "software engineer", "full stack developer", "backend developer", "frontend developer", "web developer"],
    metrics: ["deployment frequency", "bug reduction", "performance improvement", "test coverage", "sprint velocity", "uptime", "latency"],
    coreKeywords: ["React", "Node.js", "TypeScript", "Python", "REST API", "CI/CD", "Git", "Agile", "unit testing", "cloud", "AWS", "Azure"],
    industryTerms: ["sprint", "Scrum", "Kanban", "pull request", "code review", "microservices", "containerisation", "Docker", "Kubernetes"],
    seniorityLadder: {
      entry:  ["Built", "Implemented", "Developed", "Fixed", "Assisted"],
      mid:    ["Designed", "Architected", "Led", "Delivered", "Optimised"],
      senior: ["Architected", "Drove", "Owned", "Scaled", "Transformed", "Mentored"],
    },
    highValueTopics: ["performance", "deployment", "architecture", "testing", "automation", "scalability", "mentoring"],
    lowValueTopics:  ["updated readme", "basic HTML", "data entry", "general admin"],
  },
  {
    label: "HR Manager",
    aliases: ["hr manager", "human resources manager", "people manager", "hr business partner", "talent manager", "recruitment manager"],
    metrics: ["retention rate", "time to hire", "headcount", "attrition", "engagement score", "cost per hire", "training completion"],
    coreKeywords: ["talent acquisition", "onboarding", "performance management", "HRIS", "labour relations", "compliance", "benefits", "succession planning"],
    industryTerms: ["HRIS", "ATS", "FLSA", "ESA", "WSIB", "OHS", "EAP", "DEIB", "competency framework"],
    seniorityLadder: {
      entry:  ["Assisted", "Supported", "Processed", "Coordinated", "Maintained"],
      mid:    ["Managed", "Developed", "Implemented", "Led", "Reduced"],
      senior: ["Directed", "Transformed", "Built", "Drove", "Owned", "Partnered"],
    },
    highValueTopics: ["retention", "recruitment", "onboarding", "compliance", "engagement", "headcount", "policy"],
    lowValueTopics:  ["filed documents", "answered inquiries", "basic admin"],
  },
  {
    label: "Project Manager",
    aliases: ["project manager", "PM", "program manager", "scrum master", "delivery manager"],
    metrics: ["on-time delivery", "budget variance", "scope creep", "stakeholder satisfaction", "risk resolution", "ROI"],
    coreKeywords: ["PMP", "Agile", "Scrum", "stakeholder management", "risk management", "budget", "scope", "milestone", "cross-functional"],
    industryTerms: ["RACI", "WBS", "sprint", "backlog", "MVP", "KPI", "RAG status", "RAID log", "governance"],
    seniorityLadder: {
      entry:  ["Assisted", "Coordinated", "Tracked", "Reported", "Supported"],
      mid:    ["Managed", "Delivered", "Led", "Coordinated", "Implemented"],
      senior: ["Directed", "Governed", "Drove", "Owned", "Transformed", "Sponsored"],
    },
    highValueTopics: ["on-time", "budget", "stakeholder", "risk", "scope", "delivery", "cross-functional"],
    lowValueTopics:  ["attended stand-ups", "updated spreadsheets", "basic admin"],
  },
  {
    label: "Truck Driver",
    aliases: ["truck driver", "long haul driver", "delivery driver", "transport driver", "AZ driver", "DZ driver", "class 1 driver"],
    metrics: ["on-time delivery", "fuel efficiency", "safety record", "kilometres driven", "load accuracy", "incident-free days"],
    coreKeywords: ["AZ licence", "DZ licence", "Class 1", "Class 3", "logbook", "HOS", "EOBR", "hazmat", "load securement", "trip inspection"],
    industryTerms: ["HOS", "EOBR", "ELD", "CVOR", "Bill of Lading", "manifest", "cross-border", "FAST card", "pre-trip inspection"],
    seniorityLadder: {
      entry:  ["Operated", "Delivered", "Transported", "Completed", "Followed"],
      mid:    ["Managed", "Maintained", "Coordinated", "Achieved", "Ensured"],
      senior: ["Led", "Mentored", "Oversaw", "Trained", "Implemented"],
    },
    highValueTopics: ["on-time", "safety", "incident-free", "fuel", "compliance", "logbook", "cross-border"],
    lowValueTopics:  ["drove truck", "made deliveries", "basic tasks"],
  },
];

// ─── Lookup helpers ───────────────────────────────────────────────────────────

/** Find the best matching profile for a job title string (case-insensitive fuzzy) */
export function getCompetencyProfile(jobTitle: string): CompetencyProfile | null {
  const lower = jobTitle.toLowerCase().trim();
  // Exact alias match first
  for (const p of PROFILES) {
    if (p.aliases.some((a) => lower === a)) return p;
  }
  // Partial match
  for (const p of PROFILES) {
    if (p.aliases.some((a) => lower.includes(a) || a.includes(lower))) return p;
  }
  // Label match
  for (const p of PROFILES) {
    if (lower.includes(p.label.toLowerCase())) return p;
  }
  return null;
}

/** Score a bullet for relevance to a profile (0–100) */
export function scoreBullet(bullet: string, profile: CompetencyProfile): number {
  const lower = bullet.toLowerCase();
  let score = 0;

  // High-value topic match
  for (const topic of profile.highValueTopics) {
    if (lower.includes(topic.toLowerCase())) score += 15;
  }
  // Core keyword match
  for (const kw of profile.coreKeywords) {
    if (lower.includes(kw.toLowerCase())) score += 10;
  }
  // Industry term match
  for (const term of profile.industryTerms) {
    if (lower.includes(term.toLowerCase())) score += 8;
  }
  // Contains a number (metric present)
  if (/\d/.test(bullet)) score += 12;
  // Contains $ or %
  if (/[$%]/.test(bullet)) score += 8;
  // Low-value topic penalty
  for (const bad of profile.lowValueTopics) {
    if (lower.includes(bad.toLowerCase())) score -= 20;
  }
  // Weak phrase penalty
  const WEAK = ["responsible for", "helped", "assisted", "worked on", "participated in", "involved in"];
  for (const w of WEAK) {
    if (lower.startsWith(w)) score -= 15;
  }

  return Math.max(0, Math.min(100, score));
}

/** Re-rank bullets in a role from most to least relevant for the profile */
export function rerankBullets(bullets: string[], profile: CompetencyProfile): string[] {
  return [...bullets]
    .map((b) => ({ b, score: scoreBullet(b, profile) }))
    .sort((a, z) => z.score - a.score)
    .map((x) => x.b);
}

/** Determine seniority tier from years of experience */
export function getSeniorityTier(yearsOfExperience: number): "entry" | "mid" | "senior" {
  if (yearsOfExperience <= 3) return "entry";
  if (yearsOfExperience <= 8) return "mid";
  return "senior";
}

/** Extract keywords from a raw job description text */
export function extractJDKeywords(jobDescription: string): string[] {
  if (!jobDescription?.trim()) return [];
  const lower = jobDescription.toLowerCase();
  // Remove common stop words and HTML tags
  const cleaned = lower.replace(/<[^>]+>/g, " ").replace(/[^a-z0-9\s\+\#\.]/g, " ");
  const words = cleaned.split(/\s+/).filter((w) => w.length > 3);

  // Count word frequencies
  const freq: Record<string, number> = {};
  for (const w of words) {
    if (STOP_WORDS.has(w)) continue;
    freq[w] = (freq[w] || 0) + 1;
  }

  // Also extract 2-word phrases
  const tokens = cleaned.split(/\s+/);
  for (let i = 0; i < tokens.length - 1; i++) {
    const phrase = `${tokens[i]} ${tokens[i + 1]}`;
    if (tokens[i].length > 3 && tokens[i + 1].length > 3 && !STOP_WORDS.has(tokens[i]) && !STOP_WORDS.has(tokens[i + 1])) {
      freq[phrase] = (freq[phrase] || 0) + 1;
    }
  }

  // Return top 15 by frequency, min count 2
  return Object.entries(freq)
    .filter(([, count]) => count >= 2)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 15)
    .map(([word]) => word);
}

/** Detect skill gaps: skills in the profile that aren't in the resume */
export function detectSkillGaps(
  resumeSkills: string[],
  profile: CompetencyProfile
): { missing: string[]; transferable: string[] } {
  const lowerSkills = resumeSkills.map((s) => s.toLowerCase());
  const missing: string[] = [];
  const transferable: string[] = [];

  for (const kw of profile.coreKeywords) {
    const lower = kw.toLowerCase();
    const found = lowerSkills.some((s) => s.includes(lower) || lower.includes(s));
    if (!found) {
      missing.push(kw);
    }
  }

  // Mark some missing skills as "transferable" if there's a related skill in resume
  const TRANSFERABLE_MAP: Record<string, string[]> = {
    "SQL": ["database", "excel", "spreadsheet", "data"],
    "Python": ["programming", "coding", "scripting", "VBA"],
    "Power BI": ["excel", "reporting", "analytics", "tableau"],
    "Tableau": ["excel", "reporting", "analytics", "power bi"],
    "Agile": ["project management", "scrum", "sprint", "kanban"],
    "PMP": ["project management", "project coordinator"],
    "Six Sigma": ["process improvement", "lean", "quality"],
  };

  const finalMissing: string[] = [];
  for (const m of missing) {
    const related = TRANSFERABLE_MAP[m];
    if (related && related.some((r) => lowerSkills.some((s) => s.includes(r)))) {
      transferable.push(m);
    } else {
      finalMissing.push(m);
    }
  }

  return {
    missing: finalMissing.slice(0, 6),
    transferable: transferable.slice(0, 4),
  };
}

const STOP_WORDS = new Set([
  "about", "above", "after", "also", "and", "are", "been", "being",
  "both", "but", "can", "come", "could", "did", "does", "each",
  "even", "for", "from", "get", "had", "has", "have", "here",
  "him", "his", "how", "into", "its", "just", "know", "like",
  "make", "many", "more", "most", "must", "need", "not", "now",
  "only", "other", "our", "out", "over", "per", "put", "said",
  "see", "she", "some", "such", "than", "that", "the", "their",
  "them", "then", "there", "they", "this", "time", "to", "up",
  "use", "was", "we", "well", "were", "what", "when", "where",
  "which", "while", "who", "will", "with", "work", "would", "you",
  "your", "role", "will", "must", "ability", "experience", "years",
  "required", "preferred", "minimum", "including", "strong",
  "excellent", "position", "team", "candidates",
]);
