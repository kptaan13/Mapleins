"use client";

import { Suspense, useState, useEffect, useRef, useCallback } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import type { ExperienceEntry } from "@/lib/resumeUtils";
import { shouldShowPaywall } from "@/lib/paywall";

// ─── Types ───────────────────────────────────────────────────────────────────

type ResumeData = {
  name: string;
  email: string;
  phone: string;
  summary: string;
  experience: string[];
  experienceByRole?: ExperienceEntry[];
  skills: string[];
  education: string[];
  certifications?: string[];
};

type HintState = {
  loading: boolean;
  hint: string;
  alternatives: string[];
  open: boolean;
};

// ─── Constants ────────────────────────────────────────────────────────────────

const ACTION_VERBS = [
  "led","managed","built","developed","delivered","achieved","increased",
  "reduced","improved","streamlined","coordinated","supervised","trained",
  "implemented","oversaw","drove","resolved","established","launched",
  "designed","created","organised","collaborated","accelerated","negotiated",
  "directed","spearheaded","optimized","facilitated","executed","maintained",
];

const SECTOR_KEYWORDS: Record<string, string[]> = {
  warehouse: ["forklift","inventory","shipping","receiving","pallet","logistics","loading","safety","warehouse","stock"],
  trucking:  ["cdl","transport","delivery","route","freight","dispatch","driving","commercial","logistics"],
  retail:    ["customer service","sales","cashier","pos","merchandising","retail","inventory","team","upsell"],
  it:        ["software","developer","api","database","cloud","agile","typescript","python","javascript","sql","git","devops"],
  healthcare:["patient","clinical","nursing","care","hospital","medical","treatment","diagnosis","healthcare"],
  default:   ["managed","led","team","project","customer","support","analysis","data","process"],
};

type ATSBreakdown = {
  contactInfo: number; summary: number; actionVerbs: number;
  quantification: number; keywords: number; length: number; total: number;
};

const PROMO_TRIAL_KEY = "mapleins_promo_trial";
const getPromoTrial = (): boolean => {
  try {
    const raw = localStorage.getItem(PROMO_TRIAL_KEY);
    if (!raw) return false;
    const { expiresAt } = JSON.parse(raw);
    return new Date(expiresAt) > new Date();
  } catch { return false; }
};

// ─── Template configs ─────────────────────────────────────────────────────────

const TEMPLATES = [
  { id: "federal",   label: "Federal",   accent: "#1d4ed8", dark: "#1e3a8a", preview: <svg viewBox="0 0 60 78" fill="none"><rect width="60" height="78" fill="white"/><rect x="4" y="5" width="30" height="2.5" rx="0.5" fill="#1d4ed8"/><rect x="4" y="10" width="20" height="1.5" rx="0.5" fill="#6b7280"/><rect x="4" y="14" width="52" height="0.5" fill="#e5e7eb"/><rect x="4" y="18" width="22" height="2" rx="0.5" fill="#1d4ed8"/><rect x="4" y="21" width="52" height="0.5" fill="#1d4ed8"/><rect x="4" y="24" width="50" height="1.5" rx="0.5" fill="#9ca3af"/><rect x="4" y="27" width="46" height="1.5" rx="0.5" fill="#9ca3af"/><rect x="4" y="30" width="52" height="1.5" rx="0.5" fill="#9ca3af"/><rect x="4" y="35" width="26" height="2" rx="0.5" fill="#1d4ed8"/><rect x="4" y="38" width="52" height="0.5" fill="#1d4ed8"/><rect x="4" y="41" width="20" height="1.5" rx="0.5" fill="#374151"/><rect x="4" y="44" width="50" height="1.5" rx="0.5" fill="#9ca3af"/><rect x="4" y="47" width="44" height="1.5" rx="0.5" fill="#9ca3af"/><rect x="4" y="50" width="52" height="1.5" rx="0.5" fill="#9ca3af"/></svg> },
  { id: "bay-street",label: "Bay Street", accent: "#0f2342", dark: "#0f2342", preview: <svg viewBox="0 0 60 78" fill="none"><rect width="60" height="78" fill="white"/><rect width="20" height="78" fill="#0f2342"/><rect x="2" y="5" width="14" height="2.5" rx="0.5" fill="white"/><rect x="2" y="10" width="12" height="1.5" rx="0.5" fill="#93c5fd"/><rect x="2" y="16" width="8" height="1.5" rx="0.5" fill="#93c5fd"/><rect x="2" y="19" width="14" height="1.5" rx="0.5" fill="#e2e8f0"/><rect x="24" y="5" width="24" height="2" rx="0.5" fill="#1e3a5f"/><rect x="24" y="8" width="32" height="0.5" fill="#1e3a5f"/><rect x="24" y="11" width="32" height="1.5" rx="0.5" fill="#9ca3af"/></svg> },
  { id: "newcomer",  label: "Newcomer",  accent: "#166534", dark: "#14532d", preview: <svg viewBox="0 0 60 78" fill="none"><rect width="60" height="78" fill="white"/><rect width="60" height="22" fill="#166534"/><rect x="4" y="5" width="28" height="3" rx="0.5" fill="white"/><rect x="4" y="11" width="18" height="1.5" rx="0.5" fill="#bbf7d0"/><rect x="4" y="15" width="36" height="1.5" rx="0.5" fill="#d1fae5"/><rect x="0" y="25" width="60" height="7" fill="#f0fdf4"/><rect x="0" y="25" width="3" height="7" fill="#166534"/><rect x="6" y="27" width="22" height="2" rx="0.5" fill="#166534"/><rect x="4" y="35" width="50" height="1.5" rx="0.5" fill="#9ca3af"/></svg> },
  { id: "classic",   label: "Classic",   accent: "#166534", dark: "#14532d", preview: <svg viewBox="0 0 60 78" fill="none"><rect width="60" height="78" fill="white"/><rect x="4" y="5" width="28" height="3" rx="0.5" fill="#166534"/><rect x="4" y="10" width="18" height="1.5" rx="0.5" fill="#6b7280"/><rect x="4" y="15" width="52" height="0.5" fill="#166534"/><rect x="4" y="18" width="20" height="2" rx="0.5" fill="#166534"/><rect x="4" y="22" width="52" height="1.5" rx="0.5" fill="#9ca3af"/><rect x="4" y="26" width="48" height="1.5" rx="0.5" fill="#9ca3af"/><rect x="4" y="31" width="22" height="2" rx="0.5" fill="#166534"/><rect x="4" y="35" width="50" height="1.5" rx="0.5" fill="#9ca3af"/><rect x="4" y="39" width="44" height="1.5" rx="0.5" fill="#9ca3af"/></svg> },
] as const;

// ─── Helpers ──────────────────────────────────────────────────────────────────

function calcATS(resume: ResumeData, jobType: string): ATSBreakdown {
  const jt = jobType.toLowerCase();
  const kws = SECTOR_KEYWORDS[jt] ||
    Object.entries(SECTOR_KEYWORDS).find(([k]) => jt.includes(k))?.[1] ||
    SECTOR_KEYWORDS.default;
  const bulletsFromRoles = (resume.experienceByRole ?? []).flatMap((e) => e.bullets ?? []);
  const flatBullets = resume.experience?.filter(Boolean) ?? [];
  const bullets = bulletsFromRoles.length > 0 ? bulletsFromRoles : flatBullets;
  const allText = [resume.summary, ...bullets, ...resume.skills, ...(resume.certifications ?? [])].join(" ").toLowerCase();
  const contactInfo = (resume.name?.trim() ? 7 : 0) + (resume.email?.trim() ? 7 : 0) + (resume.phone?.trim() ? 6 : 0);
  const summary = resume.summary?.length > 80 ? 15 : resume.summary?.length > 40 ? 8 : 0;
  const verbsFound = ACTION_VERBS.filter((v) => allText.includes(v)).length;
  const actionVerbs = Math.min(20, Math.round((verbsFound / 6) * 20));
  const quantBullets = bullets.filter((b) => /\d+%?|\$\d+|[\d,]+\s*(team|employees|staff|users|customers|projects|sku|items|orders)/i.test(b)).length;
  const quantification = Math.min(15, Math.round((quantBullets / Math.max(bullets.length, 1)) * 20));
  const kwMatched = kws.filter((k) => allText.includes(k)).length;
  const keywords = Math.min(20, Math.round((kwMatched / kws.length) * 20));
  const length = (bullets.length >= 3 ? 4 : bullets.length >= 1 ? 2 : 0) + (resume.skills.filter(Boolean).length >= 4 ? 3 : 1) + (resume.education.filter(Boolean).some((e) => e.length > 5) ? 2 : 0) + ((resume.certifications?.filter(Boolean).length ?? 0) >= 1 ? 1 : 0);
  const total = Math.min(100, contactInfo + summary + actionVerbs + quantification + keywords + length);
  return { contactInfo, summary, actionVerbs, quantification, keywords, length, total };
}

function bulletStrength(text: string): "weak" | "good" | "strong" {
  if (!text.trim() || text.length < 15) return "weak";
  const lower = text.toLowerCase().trim();
  const startsWithVerb = ACTION_VERBS.some((v) => lower.startsWith(v));
  const hasMetric = /\d+/.test(text);
  if (startsWithVerb && hasMetric && text.length >= 35) return "strong";
  if (startsWithVerb || hasMetric) return "good";
  return "weak";
}

// ─── Small Components ─────────────────────────────────────────────────────────

function AtsRing({ score }: { score: number }) {
  const r = 45; const circ = 2 * Math.PI * r;
  const offset = circ - (score / 100) * circ;
  const color = score >= 80 ? "#166534" : score >= 60 ? "#f59e0b" : "#ef4444";
  return (
    <div className="relative flex items-center justify-center">
      <svg className="w-28 h-28 transform -rotate-90">
        <circle cx="56" cy="56" r={r} fill="none" stroke="#f1f5f9" strokeWidth="8" />
        <circle cx="56" cy="56" r={r} fill="none" stroke={color} strokeWidth="8"
          strokeDasharray={circ} strokeDashoffset={offset} strokeLinecap="round"
          className="transition-all duration-700 ease-out" />
      </svg>
      <div className="absolute flex flex-col items-center">
        <span className="text-2xl font-black text-gray-900">{score}</span>
        <span className="text-[8px] font-bold text-gray-400 uppercase tracking-widest">ATS</span>
      </div>
    </div>
  );
}

function AtsBar({ label, value, max, color }: { label: string; value: number; max: number; color: string }) {
  return (
    <div className="mb-2.5">
      <div className="flex justify-between text-[9px] font-bold text-gray-400 uppercase tracking-tighter mb-1 px-0.5">
        <span>{label}</span><span>{value}/{max}</span>
      </div>
      <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
        <div className="h-full rounded-full transition-all duration-700" style={{ width: `${(value / max) * 100}%`, backgroundColor: color }} />
      </div>
    </div>
  );
}

function BulletBadge({ text }: { text: string }) {
  if (!text.trim()) return null;
  const s = bulletStrength(text);
  return (
    <span className={`inline-block text-[8px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded-full ${
      s === "strong" ? "bg-green-100 text-green-700" :
      s === "good"   ? "bg-amber-50 text-amber-500" :
                       "bg-red-50 text-red-400"
    }`}>{s}</span>
  );
}

function SectionWarning({ message }: { message: string }) {
  return (
    <div className="flex items-start gap-2 px-4 py-3 bg-amber-50 border border-amber-100 rounded-xl mb-4">
      <span className="text-amber-500 text-sm mt-0.5">⚠</span>
      <p className="text-xs text-amber-700 font-medium leading-snug">{message}</p>
    </div>
  );
}

function SectionCard({
  id, icon, title, badge, children, warning, collapsed, onToggle,
}: {
  id: string; icon: string; title: string; badge?: string;
  children: React.ReactNode; warning?: string;
  collapsed: Record<string, boolean>;
  onToggle: (id: string) => void;
}) {
  return (
    <section className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
      <button
        type="button"
        onClick={() => onToggle(id)}
        className="w-full flex items-center justify-between px-6 py-4 hover:bg-gray-50/50 transition-colors"
      >
        <div className="flex items-center gap-3">
          <span className="text-lg">{icon}</span>
          <span className="font-black text-gray-900 text-sm tracking-tight">{title}</span>
          {badge && <span className="text-[9px] font-black bg-green-100 text-green-700 px-2 py-0.5 rounded-full uppercase tracking-wider">{badge}</span>}
        </div>
        <svg className={`w-4 h-4 text-gray-300 transition-transform duration-200 ${collapsed[id] ? "-rotate-90" : ""}`} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
      </button>
      {!collapsed[id] && (
        <div className="px-6 pb-6">
          {warning && <SectionWarning message={warning} />}
          {children}
        </div>
      )}
    </section>
  );
}

// ─── Live Preview ─────────────────────────────────────────────────────────────

function ResumePreview({ resume, theme }: { resume: ResumeData; theme: string }) {
  const t = TEMPLATES.find((x) => x.id === theme) ?? TEMPLATES[0];
  const accent = t.accent;
  const isNewcomer = theme === "newcomer";
  const isBayStreet = theme === "bay-street";

  return (
    <div
      style={{
        width: 794,
        minHeight: 1123,
        fontFamily: "'Helvetica Neue', Helvetica, Arial, sans-serif",
        fontSize: 11,
        color: "#1f2937",
        backgroundColor: "#fff",
        lineHeight: 1.5,
        position: "relative",
      }}
    >
      {/* ── Header ── */}
      {isNewcomer ? (
        <div style={{ backgroundColor: accent, padding: "36px 50px 28px", color: "#fff" }}>
          <div style={{ fontSize: 28, fontWeight: 900, letterSpacing: -1, marginBottom: 4 }}>{resume.name || "Your Name"}</div>
          <div style={{ fontSize: 12, color: "#bbf7d0", marginBottom: 8 }}>
            {[resume.email, resume.phone].filter(Boolean).join("  ·  ")}
          </div>
        </div>
      ) : isBayStreet ? (
        <div style={{ display: "flex", minHeight: "100%" }}>
          <div style={{ width: 200, backgroundColor: "#0f2342", padding: "36px 20px", flexShrink: 0, minHeight: 1123 }}>
            <div style={{ fontSize: 18, fontWeight: 900, color: "#fff", marginBottom: 6 }}>{resume.name || "Your Name"}</div>
            <div style={{ fontSize: 9, color: "#93c5fd", marginBottom: 16 }}>{resume.email}</div>
            <div style={{ fontSize: 9, color: "#93c5fd", marginBottom: 24 }}>{resume.phone}</div>
            {resume.skills.filter(Boolean).length > 0 && (
              <>
                <div style={{ fontSize: 9, fontWeight: 700, color: "#93c5fd", textTransform: "uppercase", letterSpacing: 2, marginBottom: 8 }}>Skills</div>
                {resume.skills.filter(Boolean).map((s, i) => (
                  <div key={i} style={{ fontSize: 9, color: "#e2e8f0", marginBottom: 4 }}>• {s}</div>
                ))}
              </>
            )}
          </div>
          {/* right column handled below */}
        </div>
      ) : (
        <div style={{ padding: "40px 50px 20px" }}>
          <div style={{ fontSize: 28, fontWeight: 900, color: accent, letterSpacing: -1, marginBottom: 4 }}>{resume.name || "Your Name"}</div>
          <div style={{ fontSize: 11, color: "#6b7280" }}>
            {[resume.email, resume.phone].filter(Boolean).join("   ·   ")}
          </div>
          <div style={{ height: 1, backgroundColor: accent, marginTop: 14, opacity: 0.3 }} />
        </div>
      )}

      {/* ── Body ── */}
      <div style={{ padding: isNewcomer ? "24px 50px" : isBayStreet ? "24px 24px 24px 220px" : "0 50px 40px", marginTop: isBayStreet ? -1123 : 0 }}>

        {/* Summary */}
        {resume.summary && (
          <div style={{ marginBottom: 20 }}>
            <SectionHeading label="Professional Summary" accent={accent} isNewcomer={isNewcomer} />
            <p style={{ fontSize: 10.5, color: "#374151", lineHeight: 1.6 }}>{resume.summary}</p>
          </div>
        )}

        {/* Experience */}
        {(resume.experienceByRole ?? []).filter((r) => r.role || r.company).length > 0 && (
          <div style={{ marginBottom: 20 }}>
            <SectionHeading label="Professional Experience" accent={accent} isNewcomer={isNewcomer} />
            {(resume.experienceByRole ?? []).map((role, i) => (
              <div key={i} style={{ marginBottom: 14 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 2 }}>
                  <div>
                    <span style={{ fontWeight: 700, fontSize: 11, color: "#111827" }}>{role.role || "Role"}</span>
                    {role.company && <span style={{ fontSize: 10, color: "#6b7280" }}> · {role.company}</span>}
                  </div>
                  <span style={{ fontSize: 9, color: accent, fontWeight: 600, whiteSpace: "nowrap", marginLeft: 8 }}>{role.dates}</span>
                </div>
                {role.bullets?.filter(Boolean).map((b, bi) => (
                  <div key={bi} style={{ display: "flex", gap: 8, marginBottom: 3 }}>
                    <span style={{ color: accent, flexShrink: 0, marginTop: 1 }}>–</span>
                    <span style={{ fontSize: 10, color: "#374151", lineHeight: 1.55 }}>{b}</span>
                  </div>
                ))}
              </div>
            ))}
          </div>
        )}

        {/* Skills */}
        {resume.skills.filter(Boolean).length > 0 && !isBayStreet && (
          <div style={{ marginBottom: 20 }}>
            <SectionHeading label="Core Skills" accent={accent} isNewcomer={isNewcomer} />
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
              {resume.skills.filter(Boolean).map((s, i) => (
                <span key={i} style={{ fontSize: 9, padding: "3px 10px", border: `1px solid ${accent}33`, borderRadius: 20, color: accent, fontWeight: 600 }}>{s}</span>
              ))}
            </div>
          </div>
        )}

        {/* Education */}
        {resume.education.filter(Boolean).length > 0 && (
          <div style={{ marginBottom: 16 }}>
            <SectionHeading label="Education" accent={accent} isNewcomer={isNewcomer} />
            {resume.education.filter(Boolean).map((e, i) => (
              <div key={i} style={{ fontSize: 10, color: "#374151", marginBottom: 3 }}>– {e}</div>
            ))}
          </div>
        )}

        {/* Certifications */}
        {(resume.certifications ?? []).filter(Boolean).length > 0 && (
          <div>
            <SectionHeading label="Certifications" accent={accent} isNewcomer={isNewcomer} />
            {(resume.certifications ?? []).filter(Boolean).map((c, i) => (
              <div key={i} style={{ fontSize: 10, color: "#374151", marginBottom: 3 }}>– {c}</div>
            ))}
          </div>
        )}
      </div>

      {/* Footer */}
      <div style={{ position: "absolute", bottom: 20, left: 50, right: 50, display: "flex", justifyContent: "space-between", borderTop: "1px solid #f3f4f6", paddingTop: 8 }}>
        <span style={{ fontSize: 8, color: "#d1d5db" }}>Generated by Mapleins.ca</span>
      </div>
    </div>
  );
}

function SectionHeading({ label, accent, isNewcomer }: { label: string; accent: string; isNewcomer: boolean }) {
  if (isNewcomer) {
    return (
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
        <div style={{ width: 4, height: 18, backgroundColor: accent, borderRadius: 2, flexShrink: 0 }} />
        <span style={{ fontSize: 11, fontWeight: 800, color: accent, textTransform: "uppercase", letterSpacing: 2 }}>{label}</span>
      </div>
    );
  }
  return (
    <div style={{ marginBottom: 8 }}>
      <span style={{ fontSize: 10, fontWeight: 800, color: accent, textTransform: "uppercase", letterSpacing: 2 }}>{label}</span>
      <div style={{ height: 1, backgroundColor: accent, marginTop: 3, opacity: 0.25 }} />
    </div>
  );
}

// ─── Main Editor ─────────────────────────────────────────────────────────────

function EditorContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const jobType = searchParams.get("jobType") || "";
  const city = searchParams.get("city") || "";
  const immigrationStatus = searchParams.get("immigrationStatus") || "";

  const [resume, setResume] = useState<ResumeData>({
    name: "", email: "", phone: "", summary: "",
    experience: [""], experienceByRole: undefined,
    skills: [""], education: [""], certifications: undefined,
  });

  const [hints, setHints] = useState<Record<string, HintState>>({});
  const [ats, setAts] = useState<ATSBreakdown>({ contactInfo: 0, summary: 0, actionVerbs: 0, quantification: 0, keywords: 0, length: 0, total: 0 });
  const [downloading, setDownloading] = useState(false);
  const [selectedTheme, setSelectedTheme] = useState("federal");
  const [saveStatus, setSaveStatus] = useState<"idle" | "saved">("idle");
  const [aiGenerating, setAiGenerating] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);
  const [showEditorPaywall, setShowEditorPaywall] = useState(false);
  const [showPromoInput, setShowPromoInput] = useState(false);
  const [promoCode, setPromoCode] = useState("");
  const [promoError, setPromoError] = useState("");
  const [promoLoading, setPromoLoading] = useState(false);
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});
  const [rewritingBullet, setRewritingBullet] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"edit" | "preview">("edit");
  const [previewScale, setPreviewScale] = useState(0.55);
  const previewContainerRef = useRef<HTMLDivElement>(null);
  const hintTimers = useRef<Record<string, ReturnType<typeof setTimeout>>>({});
  const dragBullet = useRef<{ roleIdx: number; bulletIdx: number } | null>(null);

  // ── Load from sessionStorage ──
  useEffect(() => {
    try {
      const stored = sessionStorage.getItem("mapleinsResumeAnalysis");
      if (stored) {
        const p = JSON.parse(stored) as Partial<ResumeData>;
        let exByRole = p.experienceByRole?.length ? p.experienceByRole : undefined;
        if (!exByRole?.length && p.experience?.filter(Boolean).length) {
          exByRole = [{ role: "", company: "", dates: "", bullets: p.experience.filter(Boolean) }];
        }
        setResume((prev) => ({
          ...prev,
          name: p.name ?? prev.name,
          email: p.email ?? prev.email,
          phone: p.phone ?? prev.phone,
          summary: p.summary ?? prev.summary,
          experience: p.experience?.length ? p.experience : prev.experience,
          experienceByRole: exByRole ?? prev.experienceByRole,
          skills: p.skills?.length ? p.skills : prev.skills,
          education: p.education?.length ? p.education : prev.education,
          certifications: p.certifications?.length ? p.certifications : prev.certifications,
        }));
      }
    } catch { /* ignore */ }
  }, []);

  // ── ATS recalc ──
  useEffect(() => { setAts(calcATS(resume, jobType)); }, [resume, jobType]);

  // ── Preview scale ──
  useEffect(() => {
    const measure = () => {
      if (previewContainerRef.current) {
        const w = previewContainerRef.current.clientWidth - 32;
        setPreviewScale(Math.min(0.65, w / 794));
      }
    };
    measure();
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, []);

  // ── Hint request (debounced) ──
  const requestHint = useCallback((field: string, value: string) => {
    if (hintTimers.current[field]) clearTimeout(hintTimers.current[field]);
    if (!value.trim() || value.length < 15) {
      setHints((h) => ({ ...h, [field]: { loading: false, hint: "", alternatives: [], open: false } }));
      return;
    }
    setHints((h) => ({ ...h, [field]: { ...(h[field] || { hint: "", alternatives: [], open: false }), loading: true } }));
    hintTimers.current[field] = setTimeout(async () => {
      try {
        const res = await fetch("/api/resume/hint", {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ field, value, context: { jobType, city } }),
        });
        const data = await res.json();
        setHints((h) => ({ ...h, [field]: { loading: false, hint: data.hint || "", alternatives: data.alternatives || [], open: false } }));
      } catch {
        setHints((h) => ({ ...h, [field]: { loading: false, hint: "", alternatives: [], open: false } }));
      }
    }, 1200);
  }, [jobType, city]);

  // ── Inline bullet rewrite ──
  const rewriteBullet = useCallback(async (roleIdx: number, bulletIdx: number, current: string) => {
    if (!current.trim() || current.trim().length < 5) return;
    const key = `${roleIdx}_${bulletIdx}`;
    setRewritingBullet(key);
    try {
      const res = await fetch("/api/resume/hint", {
        method: "POST", headers: { "Content-Type": "application/json" },
        // field must start with "exp_" so the hint route treats it as experience
        body: JSON.stringify({ field: "exp_bullet", value: current, context: { jobType: jobType || "General", city: city || "Canada" } }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      // prefer first alternative, fall back to hint text
      const best = (data.alternatives ?? []).find((a: string) => a.length > 10) ?? (data.hint?.length > 10 ? data.hint : null);
      if (best) {
        setResume((r) => {
          const roles = [...(r.experienceByRole ?? [])];
          const bullets = [...(roles[roleIdx]?.bullets ?? [])];
          bullets[bulletIdx] = best;
          roles[roleIdx] = { ...roles[roleIdx], bullets };
          return { ...r, experienceByRole: roles };
        });
        setSaveStatus("saved");
        setTimeout(() => setSaveStatus("idle"), 2000);
      }
    } catch (err) {
      console.error("Bullet rewrite failed:", err);
    } finally {
      setRewritingBullet(null);
    }
  }, [jobType, city]);

  // ── Setters ──
  const setField = (field: keyof ResumeData, value: string) => {
    setResume((r) => ({ ...r, [field]: value }));
    if (field === "summary") requestHint("summary", value);
  };
  const setRoleField = (i: number, f: keyof ExperienceEntry, v: string | string[]) =>
    setResume((r) => { const roles = [...(r.experienceByRole ?? [])]; roles[i] = { ...roles[i], [f]: v }; return { ...r, experienceByRole: roles }; });
  const setRoleBullet = (ri: number, bi: number, v: string) =>
    setResume((r) => { const roles = [...(r.experienceByRole ?? [])]; const bullets = [...(roles[ri]?.bullets ?? [])]; bullets[bi] = v; roles[ri] = { ...roles[ri], bullets }; return { ...r, experienceByRole: roles }; });
  const setListItem = (f: "skills" | "education", i: number, v: string) =>
    setResume((r) => { const arr = [...(r[f] as string[])]; arr[i] = v; return { ...r, [f]: arr }; });
  const addListItem = (f: "skills" | "education") =>
    setResume((r) => { const arr = [...(r[f] as string[]), ""]; return { ...r, [f]: arr }; });
  const removeListItem = (f: "skills" | "education", i: number) =>
    setResume((r) => { const arr = (r[f] as string[]).filter((_, idx) => idx !== i); return { ...r, [f]: arr.length ? arr : [""] }; });
  const addRole = () =>
    setResume((r) => ({ ...r, experienceByRole: [...(r.experienceByRole ?? []), { role: "", company: "", dates: "", bullets: [""] }] }));
  const removeRole = (i: number) =>
    setResume((r) => ({ ...r, experienceByRole: (r.experienceByRole ?? []).filter((_, idx) => idx !== i) }));
  const addRoleBullet = (ri: number) =>
    setResume((r) => { const roles = [...(r.experienceByRole ?? [])]; const bullets = [...(roles[ri]?.bullets ?? []), ""]; roles[ri] = { ...roles[ri], bullets }; return { ...r, experienceByRole: roles }; });
  const removeRoleBullet = (ri: number, bi: number) =>
    setResume((r) => { const roles = [...(r.experienceByRole ?? [])]; const bullets = (roles[ri]?.bullets ?? []).filter((_, idx) => idx !== bi); roles[ri] = { ...roles[ri], bullets: bullets.length ? bullets : [""] }; return { ...r, experienceByRole: roles }; });

  // ── Drag-to-reorder bullets ──
  const onBulletDragStart = (roleIdx: number, bulletIdx: number) => {
    dragBullet.current = { roleIdx, bulletIdx };
  };
  const onBulletDrop = (roleIdx: number, targetIdx: number) => {
    if (!dragBullet.current || dragBullet.current.roleIdx !== roleIdx) return;
    const from = dragBullet.current.bulletIdx;
    if (from === targetIdx) return;
    setResume((r) => {
      const roles = [...(r.experienceByRole ?? [])];
      const bullets = [...(roles[roleIdx]?.bullets ?? [])];
      const [moved] = bullets.splice(from, 1);
      bullets.splice(targetIdx, 0, moved);
      roles[roleIdx] = { ...roles[roleIdx], bullets };
      return { ...r, experienceByRole: roles };
    });
    dragBullet.current = null;
  };

  // ── Drag-to-reorder roles ──
  const dragRole = useRef<number | null>(null);
  const onRoleDragStart = (i: number) => { dragRole.current = i; };
  const onRoleDrop = (targetIdx: number) => {
    if (dragRole.current === null || dragRole.current === targetIdx) return;
    const from = dragRole.current;
    setResume((r) => {
      const roles = [...(r.experienceByRole ?? [])];
      const [moved] = roles.splice(from, 1);
      roles.splice(targetIdx, 0, moved);
      return { ...r, experienceByRole: roles };
    });
    dragRole.current = null;
  };

  // ── Section toggle ──
  const toggleSection = (id: string) => setCollapsed((c) => ({ ...c, [id]: !c[id] }));

  // ── AI improve all ──
  const generateWithAI = async () => {
    setAiGenerating(true);
    setAiError(null);
    try {
      const lines = [resume.name, resume.email, resume.phone, "", "SUMMARY:", resume.summary, "", "EXPERIENCE:"];
      (resume.experienceByRole ?? []).forEach((r) => {
        lines.push(`${r.role} at ${r.company} (${r.dates})`);
        r.bullets?.forEach((b) => lines.push(`- ${b}`));
        lines.push("");
      });
      lines.push("SKILLS:", resume.skills.join(", "), "", "EDUCATION:", ...resume.education);
      const res = await fetch("/api/resume/edit", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          resumeText: lines.join("\n"),
          jobType: jobType || "General",
          city: city || "Canada",
          immigrationStatus,
        }),
      });
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData?.error || `Server error (${res.status})`);
      }
      const data = await res.json();
      setResume((prev) => ({ ...prev, ...data, experience: data.experienceByRole?.flatMap((e: ExperienceEntry) => e.bullets ?? []) ?? prev.experience }));
      setSaveStatus("saved");
      setTimeout(() => setSaveStatus("idle"), 2500);
    } catch (err) {
      setAiError(err instanceof Error ? err.message : "AI improvement failed. Please try again.");
      setTimeout(() => setAiError(null), 5000);
    }
    finally { setAiGenerating(false); }
  };

  // ── Download ──
  const FREE_DOWNLOAD_KEY = "mapleins_free_downloads";
  const FREE_DOWNLOAD_LIMIT = 3;
  const getFreeDownloadCount = () => { try { return parseInt(localStorage.getItem(FREE_DOWNLOAD_KEY) || "0", 10); } catch { return 0; } };
  const incrementFreeDownloadCount = () => { try { localStorage.setItem(FREE_DOWNLOAD_KEY, String(getFreeDownloadCount() + 1)); } catch { /* ignore */ } };
  const downloadPdf = async (skip = false) => {
    if (!skip && shouldShowPaywall({ freeDownloadCount: getFreeDownloadCount(), freeDownloadLimit: FREE_DOWNLOAD_LIMIT, hasPromoTrial: getPromoTrial(), isUnlimited: false })) {
      setShowEditorPaywall(true); return;
    }
    setShowEditorPaywall(false); setDownloading(true);
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 45000);
      const res = await fetch("/api/resume/generate", {
        method: "POST", headers: { "Content-Type": "application/json" }, signal: controller.signal,
        body: JSON.stringify({ jobType, city, skipRefinement: true, theme: selectedTheme, parsedData: resume }),
      });
      clearTimeout(timer);
      if (!res.ok) throw new Error();
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a"); a.href = url; a.download = "Mapleins-Optimized.pdf"; a.click();
      incrementFreeDownloadCount();
    } catch { /* ignore */ }
    finally { setDownloading(false); }
  };

  const scoreColor = ats.total >= 80 ? "#166534" : ats.total >= 60 ? "#ea580c" : "#dc2626";

  return (
    <div className="min-h-screen bg-[#f5f7f6]">

      {/* ── Header ── */}
      <header className="sticky top-0 z-50 bg-white border-b border-gray-100 shadow-sm">
        <div className="max-w-[1600px] mx-auto px-4 py-3 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 shrink-0">
            <Link href="/dashboard" className="flex items-center gap-2 group">
              <div className="w-8 h-8 green-gradient rounded-lg flex items-center justify-center text-white font-bold text-xs shadow-md transition-transform group-hover:scale-110">M</div>
              <span className="text-lg font-bold text-gray-900 hidden sm:block">Mapleins <span className="text-[#166534] opacity-50 italic">Editor</span></span>
            </Link>
            {(jobType || city) && (
              <div className="hidden md:flex items-center gap-1.5 px-3 py-1 bg-green-50 rounded-full border border-green-100">
                <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                <span className="text-[10px] font-bold text-green-700 uppercase tracking-wider">{jobType || "General"}{city ? ` · ${city}` : ""}</span>
              </div>
            )}
          </div>

          {/* Mobile tab toggle */}
          <div className="flex lg:hidden items-center gap-1 bg-gray-100 rounded-xl p-1">
            <button onClick={() => setActiveTab("edit")} className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${activeTab === "edit" ? "bg-white shadow-sm text-gray-900" : "text-gray-400"}`}>Edit</button>
            <button onClick={() => setActiveTab("preview")} className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${activeTab === "preview" ? "bg-white shadow-sm text-gray-900" : "text-gray-400"}`}>Preview</button>
          </div>

          <div className="flex items-center gap-2">
            {saveStatus === "saved" && <span className="hidden sm:block text-[10px] font-bold text-green-500 uppercase tracking-widest">● Saved</span>}

            {/* Template picker */}
            <div className="hidden sm:flex items-center gap-1 border border-gray-100 rounded-xl p-1.5" title="Template">
              {TEMPLATES.map((t) => (
                <button key={t.id} type="button" onClick={() => setSelectedTheme(t.id)} title={t.label}
                  className={`rounded-md overflow-hidden border-2 transition-all hover:scale-105 ${selectedTheme === t.id ? "border-[#166534] shadow-md" : "border-gray-200 opacity-60 hover:opacity-100"}`}
                  style={{ width: 26, height: 34 }}>
                  {t.preview}
                </button>
              ))}
            </div>

            <div className="hidden md:flex flex-col items-end gap-1">
              <Button variant="outline" size="sm" onClick={generateWithAI} disabled={aiGenerating}
                className="h-9 px-4 border-2 border-[#166534] text-[#166534] font-bold rounded-xl hover:bg-green-50 text-xs">
                {aiGenerating ? <><span className="w-3 h-3 border-2 border-[#166534] border-t-transparent rounded-full animate-spin mr-2" />Improving…</> : "✨ AI Improve"}
              </Button>
              {aiError && <p className="text-[10px] text-red-500 max-w-[160px] text-right leading-tight">{aiError}</p>}
            </div>

            <Button size="sm" onClick={() => downloadPdf()} disabled={downloading}
              className="h-9 px-5 green-gradient text-white font-bold rounded-xl shadow hover:shadow-lg hover:scale-105 transition-all text-xs">
              {downloading ? <><span className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />Preparing…</> : "⬇ Download PDF"}
            </Button>

            <button onClick={() => router.back()} className="p-2 text-gray-300 hover:text-gray-700 transition-colors ml-1">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
            </button>
          </div>
        </div>
      </header>

      {/* ── Main layout ── */}
      <div className="max-w-[1600px] mx-auto flex h-[calc(100vh-57px)]">

        {/* ── Left: Editor panel ── */}
        <div className={`w-full lg:w-[500px] xl:w-[540px] shrink-0 overflow-y-auto px-4 py-6 space-y-4 ${activeTab === "preview" ? "hidden lg:block" : ""}`}>

          {/* Contact */}
          <SectionCard id="contact" icon="👤" title="Contact Details" collapsed={collapsed} onToggle={toggleSection}>
            <div className="grid grid-cols-1 gap-4">
              {(["name", "email", "phone"] as const).map((f) => (
                <div key={f}>
                  <label className="block text-[9px] font-black uppercase tracking-widest text-[#166534] opacity-70 mb-1.5">{f}</label>
                  <input type="text" value={resume[f]} onChange={(e) => setField(f, e.target.value)}
                    placeholder={f === "name" ? "Full Name" : f === "email" ? "email@example.com" : "+1 (xxx) xxx-xxxx"}
                    className="w-full bg-gray-50 border border-gray-100 rounded-xl px-4 py-2.5 text-sm focus:bg-white focus:ring-2 focus:ring-[#166534] transition-all outline-none font-medium text-gray-700" />
                </div>
              ))}
            </div>
          </SectionCard>

          {/* Summary */}
          <SectionCard id="summary" icon="✨" title="Professional Summary"
            warning={!resume.summary.trim() ? "Add a summary — it adds up to 15 ATS points and is read first by recruiters." : undefined}
            collapsed={collapsed} onToggle={toggleSection}>
            <div className="relative">
              <textarea value={resume.summary} onChange={(e) => setField("summary", e.target.value)} rows={4}
                placeholder="Hook the employer in 4 sentences. Mention your expertise, a key achievement, and your value in Canada..."
                className="w-full bg-gray-50 border border-gray-100 rounded-xl px-4 py-3 text-sm focus:bg-white focus:ring-2 focus:ring-[#166534] transition-all outline-none font-medium leading-relaxed text-gray-700 resize-none" />
              <div className="flex items-center justify-between mt-2">
                <span className={`text-[9px] font-bold ${resume.summary.split(" ").filter(Boolean).length >= 80 ? "text-green-500" : "text-gray-300"}`}>
                  {resume.summary.split(" ").filter(Boolean).length} / 80 words
                </span>
                {hints["summary"]?.loading && <span className="text-[9px] text-gray-400 italic animate-pulse">AI reading…</span>}
                {hints["summary"]?.hint && !hints["summary"]?.loading && (
                  <span className="text-[9px] text-[#166534] font-bold">💡 {hints["summary"].hint.slice(0, 60)}…</span>
                )}
              </div>
              {hints["summary"]?.alternatives?.length > 0 && (
                <div className="mt-3 space-y-2">
                  {hints["summary"].alternatives.slice(0, 2).map((alt, i) => (
                    <button key={i} type="button" onClick={() => setField("summary", alt)}
                      className="w-full text-left text-xs text-gray-600 bg-green-50/50 border border-green-100 rounded-xl px-3 py-2.5 hover:bg-green-50 hover:text-[#166534] transition-all leading-relaxed">
                      <span className="font-bold text-green-600 mr-1">↺</span> {alt}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </SectionCard>

          {/* Experience */}
          <SectionCard id="experience" icon="💼" title="Work Experience"
            badge={`${(resume.experienceByRole ?? []).length} roles`}
            collapsed={collapsed} onToggle={toggleSection}>
            <div className="space-y-6">
              {(resume.experienceByRole ?? []).map((role, rIdx) => (
                <div key={rIdx}
                  draggable onDragStart={() => onRoleDragStart(rIdx)}
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={() => onRoleDrop(rIdx)}
                  className="relative border border-gray-100 rounded-xl p-4 bg-gray-50/30 hover:border-gray-200 transition-colors">

                  {/* Drag handle + remove */}
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2 cursor-grab text-gray-200 hover:text-gray-400 transition-colors">
                      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><circle cx="9" cy="5" r="1.5"/><circle cx="9" cy="12" r="1.5"/><circle cx="9" cy="19" r="1.5"/><circle cx="15" cy="5" r="1.5"/><circle cx="15" cy="12" r="1.5"/><circle cx="15" cy="19" r="1.5"/></svg>
                      <span className="text-[9px] font-bold uppercase tracking-wider">drag to reorder</span>
                    </div>
                    <button type="button" onClick={() => removeRole(rIdx)} className="text-gray-200 hover:text-red-400 transition-colors text-xs font-bold">✕ Remove</button>
                  </div>

                  {/* Role fields */}
                  <div className="grid grid-cols-2 gap-3 mb-4">
                    <input type="text" value={role.role} onChange={(e) => setRoleField(rIdx, "role", e.target.value)}
                      placeholder="Job Title" className="col-span-2 font-bold text-gray-900 bg-white border border-gray-100 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-[#166534] outline-none" />
                    <input type="text" value={role.company} onChange={(e) => setRoleField(rIdx, "company", e.target.value)}
                      placeholder="Company Name" className="bg-white border border-gray-100 rounded-lg px-3 py-2 text-sm text-gray-600 focus:ring-2 focus:ring-[#166534] outline-none" />
                    <input type="text" value={role.dates ?? ""} onChange={(e) => setRoleField(rIdx, "dates", e.target.value)}
                      placeholder="2022 – Present" className="bg-white border border-gray-100 rounded-lg px-3 py-2 text-xs font-bold text-[#166534] focus:ring-2 focus:ring-[#166534] outline-none text-right" />
                  </div>

                  {/* Bullets */}
                  <div className="space-y-2">
                    {role.bullets?.map((bull, bIdx) => {
                      const bKey = `${rIdx}_${bIdx}`;
                      const isRewriting = rewritingBullet === bKey;
                      return (
                        <div key={bIdx}
                          draggable onDragStart={() => onBulletDragStart(rIdx, bIdx)}
                          onDragOver={(e) => e.preventDefault()}
                          onDrop={() => onBulletDrop(rIdx, bIdx)}
                          className="flex items-start gap-2 group bg-white border border-gray-100 rounded-lg px-3 py-2 hover:border-gray-200 transition-all cursor-grab">
                          <span className="text-gray-200 mt-2.5 select-none text-xs">⠿</span>
                          <textarea value={bull} rows={2} onChange={(e) => setRoleBullet(rIdx, bIdx, e.target.value)}
                            className="flex-1 bg-transparent border-none focus:ring-0 p-0 text-xs leading-relaxed text-gray-600 font-medium placeholder:text-gray-200 resize-none outline-none"
                            placeholder="Led a team of X to achieve Y result by doing Z..." />
                          <div className="flex flex-col items-end gap-1.5 shrink-0 ml-1">
                            <BulletBadge text={bull} />
                            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                              <button type="button" onClick={() => rewriteBullet(rIdx, bIdx, bull)} disabled={isRewriting}
                                title="AI Rewrite"
                                className="text-[9px] font-black bg-green-50 text-[#166534] border border-green-100 rounded-md px-1.5 py-0.5 hover:bg-green-100 transition-colors disabled:opacity-50">
                                {isRewriting ? "…" : "✨"}
                              </button>
                              <button type="button" onClick={() => removeRoleBullet(rIdx, bIdx)}
                                className="text-[9px] text-gray-200 hover:text-red-400 transition-colors font-bold">✕</button>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                    <button type="button" onClick={() => addRoleBullet(rIdx)}
                      className="w-full text-[10px] font-black uppercase tracking-widest text-green-700/40 hover:text-green-700 transition-colors py-2 border-2 border-dashed border-gray-100 hover:border-green-200 rounded-lg">
                      + Add Bullet
                    </button>
                  </div>
                </div>
              ))}
              <button type="button" onClick={addRole}
                className="w-full py-3 border-2 border-dashed border-gray-200 hover:border-[#166534] text-gray-400 hover:text-[#166534] rounded-xl text-xs font-bold uppercase tracking-widest transition-all">
                + Add Role
              </button>
            </div>
          </SectionCard>

          {/* Skills */}
          <SectionCard id="skills" icon="⚡" title="Skills"
            warning={resume.skills.filter(Boolean).length < 4 ? "Add at least 4 skills — this section adds up to 3 ATS points." : undefined}
            collapsed={collapsed} onToggle={toggleSection}>
            <div className="flex flex-wrap gap-2">
              {resume.skills.map((s, i) => (
                <div key={i} className="flex items-center gap-1 group bg-gray-50 border border-gray-100 rounded-xl overflow-hidden">
                  <input type="text" value={s} onChange={(e) => setListItem("skills", i, e.target.value)}
                    className="bg-transparent border-none px-3 py-1.5 text-[11px] font-bold text-gray-600 uppercase tracking-tight focus:ring-0 outline-none w-24 text-center" />
                  <button type="button" onClick={() => removeListItem("skills", i)}
                    className="pr-2 text-gray-200 hover:text-red-400 transition-colors text-xs opacity-0 group-hover:opacity-100">✕</button>
                </div>
              ))}
              <button type="button" onClick={() => addListItem("skills")}
                className="px-3 py-1.5 bg-green-50 border border-green-100 rounded-xl text-[11px] font-bold text-[#166534] hover:bg-green-100 transition-colors">+ Add</button>
            </div>
          </SectionCard>

          {/* Education */}
          <SectionCard id="education" icon="🎓" title="Education"
            warning={resume.education.filter(Boolean).length === 0 ? "Add your education — it contributes 2 ATS points." : undefined}
            collapsed={collapsed} onToggle={toggleSection}>
            <div className="space-y-2">
              {resume.education.map((e, i) => (
                <div key={i} className="flex gap-2 group">
                  <input type="text" value={e} onChange={(e2) => setListItem("education", i, e2.target.value)}
                    placeholder="e.g. Diploma, Matrix College (2023)"
                    className="flex-1 bg-gray-50 border border-gray-100 rounded-xl px-4 py-2.5 text-xs font-semibold text-gray-600 focus:bg-white focus:ring-2 focus:ring-[#166534] outline-none transition-all" />
                  <button type="button" onClick={() => removeListItem("education", i)}
                    className="text-gray-200 hover:text-red-400 transition-colors opacity-0 group-hover:opacity-100 text-sm px-1">✕</button>
                </div>
              ))}
              <button type="button" onClick={() => addListItem("education")}
                className="text-[10px] font-black text-[#166534]/50 hover:text-[#166534] uppercase tracking-widest transition-colors">+ Add Entry</button>
            </div>
          </SectionCard>

          {/* Certifications */}
          <SectionCard id="certs" icon="🏅" title="Certifications"
            warning={!resume.certifications?.filter(Boolean).length ? "WHMIS, First Aid, Serve It Right — certifications add 1 ATS point and stand out to recruiters." : undefined}
            collapsed={collapsed} onToggle={toggleSection}>
            <div className="space-y-2">
              {(resume.certifications ?? []).map((c, i) => (
                <div key={i} className="flex gap-2 group">
                  <input type="text" value={c}
                    onChange={(e) => setResume((r) => { const certs = [...(r.certifications ?? [])]; certs[i] = e.target.value; return { ...r, certifications: certs }; })}
                    placeholder="e.g. WHMIS Certification — Canada"
                    className="flex-1 bg-gray-50 border border-gray-100 rounded-xl px-4 py-2.5 text-xs font-semibold text-gray-600 focus:bg-white focus:ring-2 focus:ring-[#166534] outline-none transition-all" />
                  <button type="button"
                    onClick={() => setResume((r) => ({ ...r, certifications: (r.certifications ?? []).filter((_, idx) => idx !== i) }))}
                    className="text-gray-200 hover:text-red-400 transition-colors opacity-0 group-hover:opacity-100 text-sm px-1">✕</button>
                </div>
              ))}
              <button type="button"
                onClick={() => setResume((r) => ({ ...r, certifications: [...(r.certifications ?? []), ""] }))}
                className="text-[10px] font-black text-[#166534]/50 hover:text-[#166534] uppercase tracking-widest transition-colors">+ Add Certification</button>
            </div>
          </SectionCard>

          <div className="h-8" />
        </div>

        {/* ── Right: Preview + ATS ── */}
        <div className={`flex-1 flex flex-col overflow-hidden border-l border-gray-100 ${activeTab === "edit" ? "hidden lg:flex" : ""}`}>

          {/* Preview header */}
          <div className="flex items-center justify-between px-6 py-3 bg-white border-b border-gray-100 shrink-0">
            <div className="flex items-center gap-3">
              <span className="text-xs font-black text-gray-900 uppercase tracking-widest">Live Preview</span>
              <span className="text-[9px] bg-green-100 text-green-700 font-black px-2 py-0.5 rounded-full uppercase tracking-wider animate-pulse">Live</span>
            </div>
            {/* Template picker (right panel) */}
            <div className="flex items-center gap-1.5">
              <span className="text-[9px] text-gray-300 font-bold uppercase tracking-wider mr-1">Template</span>
              {TEMPLATES.map((t) => (
                <button key={t.id} type="button" onClick={() => setSelectedTheme(t.id)} title={t.label}
                  className={`rounded overflow-hidden border-2 transition-all hover:scale-105 ${selectedTheme === t.id ? "border-[#166534]" : "border-gray-200 opacity-50"}`}
                  style={{ width: 22, height: 28 }}>
                  {t.preview}
                </button>
              ))}
            </div>
          </div>

          {/* Preview + ATS side by side */}
          <div className="flex flex-1 overflow-hidden">

            {/* Live resume preview */}
            <div ref={previewContainerRef} className="flex-1 overflow-y-auto bg-gray-100 p-4 flex justify-center">
              <div style={{ width: 794 * previewScale, height: "auto", transformOrigin: "top center" }}>
                <div style={{ transform: `scale(${previewScale})`, transformOrigin: "top left", width: 794 }}>
                  <div className="shadow-2xl">
                    <ResumePreview resume={resume} theme={selectedTheme} />
                  </div>
                </div>
              </div>
            </div>

            {/* ATS score panel */}
            <div className="w-52 xl:w-60 shrink-0 overflow-y-auto bg-white border-l border-gray-100 p-4">
              <div className="flex flex-col items-center mb-6 pt-2">
                <AtsRing score={ats.total} />
                <p className={`mt-3 text-[10px] font-bold text-center leading-snug px-2 ${ats.total >= 80 ? "text-green-700" : ats.total >= 60 ? "text-amber-600" : "text-red-500"}`}>
                  {ats.total >= 80 ? "Excellent — ready to submit." : ats.total >= 60 ? "Good base. Add metrics." : "Needs improvement."}
                </p>
              </div>

              <div className="space-y-2.5 mb-6">
                <AtsBar label="Contact" value={ats.contactInfo} max={20} color="#166534" />
                <AtsBar label="Summary" value={ats.summary} max={15} color="#4ade80" />
                <AtsBar label="Action Verbs" value={ats.actionVerbs} max={20} color="#166534" />
                <AtsBar label="Metrics" value={ats.quantification} max={15} color="#ea580c" />
                <AtsBar label="Keywords" value={ats.keywords} max={20} color={scoreColor} />
                <AtsBar label="Structure" value={ats.length} max={10} color="#94a3b8" />
              </div>

              {/* Quick tips based on score */}
              <div className="space-y-2">
                {ats.summary < 10 && (
                  <div className="text-[9px] text-amber-700 bg-amber-50 border border-amber-100 rounded-lg px-3 py-2 leading-snug">
                    📝 Summary needs 80+ words
                  </div>
                )}
                {ats.actionVerbs < 12 && (
                  <div className="text-[9px] text-amber-700 bg-amber-50 border border-amber-100 rounded-lg px-3 py-2 leading-snug">
                    💪 Start bullets with action verbs
                  </div>
                )}
                {ats.quantification < 8 && (
                  <div className="text-[9px] text-amber-700 bg-amber-50 border border-amber-100 rounded-lg px-3 py-2 leading-snug">
                    📊 Add numbers to bullets (%, $, team size)
                  </div>
                )}
                {ats.keywords < 12 && (
                  <div className="text-[9px] text-amber-700 bg-amber-50 border border-amber-100 rounded-lg px-3 py-2 leading-snug">
                    🔑 Add more {jobType || "sector"} keywords to skills
                  </div>
                )}
                {ats.total >= 80 && (
                  <div className="text-[9px] text-green-700 bg-green-50 border border-green-100 rounded-lg px-3 py-2 leading-snug font-bold">
                    ✅ Great score — download your resume!
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── Paywall Modal ── */}
      {showEditorPaywall && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm px-4">
          <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full p-8 text-center animate-in fade-in zoom-in-95 duration-200">
            <div className="text-5xl mb-4">🍁</div>
            <h2 className="text-2xl font-black text-gray-900 mb-2">You&apos;ve used {FREE_DOWNLOAD_LIMIT} free resumes!</h2>
            <p className="text-gray-500 text-sm mb-6 leading-relaxed">
              Mapleins is free for newcomers. If it&apos;s helped your job search, consider supporting us so we can keep building.
            </p>
            <div className="space-y-3">
              <Link href="/donate" className="block w-full green-gradient text-white py-4 rounded-2xl font-bold shadow-lg hover:shadow-xl hover:scale-[1.02] transition-all text-center">
                ❤️ Support Mapleins
              </Link>
              {!showPromoInput ? (
                <button type="button" onClick={() => { setShowPromoInput(true); setPromoError(""); }}
                  className="w-full py-2 text-sm text-[#166534] font-semibold hover:underline transition-colors">
                  Have a promo code?
                </button>
              ) : (
                <div className="space-y-2 text-left">
                  <div className="flex gap-2">
                    <input type="text" value={promoCode} onChange={(e) => { setPromoCode(e.target.value); setPromoError(""); }}
                      placeholder="Enter promo code"
                      className="flex-1 rounded-xl border border-gray-200 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#166534]" />
                    <button type="button" disabled={promoLoading || !promoCode.trim()}
                      onClick={async () => {
                        setPromoLoading(true); setPromoError("");
                        try {
                          const res = await fetch("/api/promo/redeem", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ code: promoCode }) });
                          const data = await res.json();
                          if (data.valid) {
                            try { localStorage.setItem(PROMO_TRIAL_KEY, JSON.stringify({ expiresAt: data.expiresAt })); } catch { /* ignore */ }
                            setShowEditorPaywall(false); setShowPromoInput(false); setPromoCode("");
                            downloadPdf(true);
                          } else { setPromoError(data.error || "Invalid promo code."); }
                        } catch { setPromoError("Something went wrong. Please try again."); }
                        finally { setPromoLoading(false); }
                      }}
                      className="px-4 py-2.5 rounded-xl bg-[#166534] text-white text-sm font-bold disabled:opacity-50 hover:bg-[#14532d] transition-colors">
                      {promoLoading ? "..." : "Apply"}
                    </button>
                  </div>
                  {promoError && <p className="text-red-500 text-xs font-medium">{promoError}</p>}
                </div>
              )}
              <button type="button" onClick={() => downloadPdf(true)}
                className="w-full py-3 rounded-2xl border-2 border-gray-200 text-gray-600 font-bold hover:bg-gray-50 transition-colors text-sm">
                Continue for free
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function EditorPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-[#f8faf9] flex flex-col items-center justify-center text-gray-400">
        <div className="w-12 h-12 rounded-full border-4 border-gray-200 border-t-[#166534] animate-spin mb-4" />
        <span className="font-bold uppercase tracking-widest text-xs">Loading Editor…</span>
      </div>
    }>
      <EditorContent />
    </Suspense>
  );
}
