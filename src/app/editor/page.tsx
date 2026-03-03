"use client";

import { Suspense, useState, useEffect, useRef, useCallback } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import type { ExperienceEntry } from "@/lib/resumeUtils";

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
  "led", "managed", "built", "developed", "delivered", "achieved", "increased",
  "reduced", "improved", "streamlined", "coordinated", "supervised", "trained",
  "implemented", "oversaw", "drove", "resolved", "established", "launched",
  "designed", "created", "organised", "collaborated", "accelerated", "negotiated",
];

const SECTOR_KEYWORDS: Record<string, string[]> = {
  warehouse: ["forklift", "inventory", "shipping", "receiving", "pallet", "logistics", "loading", "safety", "warehouse", "stock"],
  trucking: ["cdl", "transport", "delivery", "route", "freight", "dispatch", "driving", "commercial", "logistics"],
  retail: ["customer service", "sales", "cashier", "pos", "merchandising", "retail", "inventory", "team", "upsell"],
  it: ["software", "developer", "api", "database", "cloud", "agile", "typescript", "python", "javascript", "sql", "git", "devops"],
  healthcare: ["patient", "clinical", "nursing", "care", "hospital", "medical", "treatment", "diagnosis", "healthcare"],
  default: ["managed", "led", "team", "project", "customer", "support", "analysis", "data", "process"],
};

type ATSBreakdown = {
  contactInfo: number;
  summary: number;
  actionVerbs: number;
  quantification: number;
  keywords: number;
  length: number;
  total: number;
};

// ─── Logic ────────────────────────────────────────────────────────────────────

function calcATS(resume: ResumeData, jobType: string): ATSBreakdown {
  const jt = jobType.toLowerCase();
  const kws = SECTOR_KEYWORDS[jt] ||
    Object.entries(SECTOR_KEYWORDS).find(([k]) => jt.includes(k))?.[1] ||
    SECTOR_KEYWORDS.default;

  const bulletsFromRoles = (resume.experienceByRole ?? []).flatMap((e) => e.bullets ?? []);
  const flatBullets = resume.experience?.filter(Boolean) ?? [];
  const bullets = bulletsFromRoles.length > 0 ? bulletsFromRoles : flatBullets;
  const allText = [
    resume.summary,
    ...bullets,
    ...resume.skills,
    ...(resume.certifications ?? []),
  ].join(" ").toLowerCase();

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

// ─── Components ───────────────────────────────────────────────────────────────

function AtsRing({ score }: { score: number }) {
  const r = 45;
  const circ = 2 * Math.PI * r;
  const offset = circ - (score / 100) * circ;
  const color = score >= 80 ? "#166534" : score >= 60 ? "#f59e0b" : "#ef4444";
  return (
    <div className="relative flex items-center justify-center">
      <svg className="w-32 h-32 transform -rotate-90">
        <circle cx="64" cy="64" r={r} fill="none" stroke="#f1f5f9" strokeWidth="8" />
        <circle
          cx="64" cy="64" r={r} fill="none" stroke={color}
          strokeWidth="8" strokeDasharray={circ} strokeDashoffset={offset}
          strokeLinecap="round" className="transition-all duration-1000 ease-out"
        />
      </svg>
      <div className="absolute flex flex-col items-center">
        <span className="text-3xl font-black text-gray-900">{score}</span>
        <span className="text-[9px] font-bold text-gray-400 uppercase tracking-widest">ATS Score</span>
      </div>
    </div>
  );
}

function AtsBar({ label, value, max, color }: { label: string; value: number; max: number; color: string }) {
  return (
    <div className="mb-3">
      <div className="flex justify-between text-[10px] font-bold text-gray-400 uppercase tracking-tighter mb-1.5 px-0.5">
        <span>{label}</span>
        <span>{value}/{max}</span>
      </div>
      <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-700"
          style={{ width: `${(value / max) * 100}%`, backgroundColor: color }}
        />
      </div>
    </div>
  );
}

function AIHint({ hintKey, h, applyAlt, onToggle }: { hintKey: string; h?: HintState; applyAlt?: (v: string) => void; onToggle: (k: string) => void }) {
  if (!h || (!h.loading && !h.hint && !h.alternatives.length)) return null;
  return (
    <div className="mt-3 rounded-xl bg-green-50/50 border border-green-100 overflow-hidden reveal-up">
      {h.loading ? (
        <p className="px-4 py-3 text-gray-400 italic text-xs animate-pulse">Consulting Mapleins AI…</p>
      ) : (
        <>
          {h.hint && (
            <div className="px-4 py-3 flex items-start gap-3">
              <span className="text-green-600 shrink-0 text-lg">💡</span>
              <span className="text-green-900 text-xs leading-relaxed font-medium">{h.hint}</span>
            </div>
          )}
          {h.alternatives.length > 0 && applyAlt && (
            <>
              <button
                type="button"
                onClick={() => onToggle(hintKey)}
                className="w-full text-left px-4 py-2.5 text-[10px] font-black uppercase tracking-widest text-[#166534] hover:bg-green-100/50 border-t border-green-100 flex items-center justify-between transition-colors"
              >
                <span>{h.open ? "Hide" : "Show"} AI Alternatives ({h.alternatives.length})</span>
                <span className={`transform transition-transform ${h.open ? "rotate-180" : ""}`}>▾</span>
              </button>
              {h.open && (
                <div className="bg-white/50 border-t border-green-50 divide-y divide-green-50">
                  {h.alternatives.map((alt, ai) => (
                    <button
                      key={ai}
                      type="button"
                      onClick={() => applyAlt(alt)}
                      className="w-full text-left px-4 py-3 text-xs text-gray-700 hover:bg-white hover:text-[#166534] transition-all flex gap-3 items-start"
                    >
                      <span className="text-green-500 shrink-0 font-bold">↺</span>
                      <span className="leading-relaxed">{alt}</span>
                    </button>
                  ))}
                </div>
              )}
            </>
          )}
        </>
      )}
    </div>
  );
}

// ─── Main Content ─────────────────────────────────────────────────────────────

function EditorContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const jobType = searchParams.get("jobType") || "";
  const city = searchParams.get("city") || "";
  const immigrationStatus = searchParams.get("immigrationStatus") || "";

  const [resume, setResume] = useState<ResumeData>({
    name: "", email: "", phone: "", summary: "",
    experience: [""], experienceByRole: undefined, skills: [""], education: [""], certifications: undefined,
  });

  const [hints, setHints] = useState<Record<string, HintState>>({});
  const [ats, setAts] = useState<ATSBreakdown>({ contactInfo: 0, summary: 0, actionVerbs: 0, quantification: 0, keywords: 0, length: 0, total: 0 });
  const [downloading, setDownloading] = useState(false);
  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "saved">("idle");
  const [aiGenerating, setAiGenerating] = useState(false);
  const hintTimers = useRef<Record<string, ReturnType<typeof setTimeout>>>({});

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

  useEffect(() => { setAts(calcATS(resume, jobType)); }, [resume, jobType]);

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
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ field, value, context: { jobType, city } }),
        });
        const data = await res.json();
        setHints((h) => ({
          ...h,
          [field]: { loading: false, hint: data.hint || "", alternatives: data.alternatives || [], open: false },
        }));
      } catch {
        setHints((h) => ({ ...h, [field]: { loading: false, hint: "", alternatives: [], open: false } }));
      }
    }, 1200);
  }, [jobType, city]);

  const toggleAlternatives = (field: string) => {
    setHints((h) => ({ ...h, [field]: { ...(h[field] || { loading: false, hint: "", alternatives: [] }), open: !h[field]?.open } }));
  };

  const setField = (field: keyof ResumeData, value: string) => {
    setResume((r) => ({ ...r, [field]: value }));
    if (field === "summary") requestHint("summary", value);
  };

  const setRoleField = (roleIdx: number, field: keyof ExperienceEntry, value: string | string[]) =>
    setResume((r) => {
      const roles = [...(r.experienceByRole ?? [])];
      roles[roleIdx] = { ...roles[roleIdx], [field]: value };
      return { ...r, experienceByRole: roles };
    });

  const setRoleBullet = (roleIdx: number, bulletIdx: number, value: string) =>
    setResume((r) => {
      const roles = [...(r.experienceByRole ?? [])];
      const bullets = [...(roles[roleIdx]?.bullets ?? [])];
      bullets[bulletIdx] = value;
      roles[roleIdx] = { ...roles[roleIdx], bullets };
      return { ...r, experienceByRole: roles };
    });

  const setListItem = (field: "skills" | "education", idx: number, value: string) =>
    setResume((r) => {
      const arr = [...(r[field] as string[])];
      arr[idx] = value;
      return { ...r, [field]: arr };
    });

  const addListItem = (field: "skills" | "education") =>
    setResume((r) => {
      const arr = [...(r[field] as string[])];
      arr.push("");
      return { ...r, [field]: arr };
    });

  const addRole = () =>
    setResume((r) => {
      const roles = [...(r.experienceByRole ?? [])];
      roles.push({ role: "", company: "", dates: "", bullets: [""] });
      return { ...r, experienceByRole: roles };
    });

  const addRoleBullet = (roleIdx: number) =>
    setResume((r) => {
      const roles = [...(r.experienceByRole ?? [])];
      const current = roles[roleIdx] ?? { role: "", company: "", dates: "", bullets: [] };
      const bullets = [...(current.bullets ?? []), ""];
      roles[roleIdx] = { ...current, bullets };
      return { ...r, experienceByRole: roles };
    });

  const _saveResume = () => {
    setSaveStatus("saving");
    try {
      const existingRaw = sessionStorage.getItem("mapleinsResumeAnalysis");
      const existing = existingRaw ? JSON.parse(existingRaw) : {};
      const toStore = { ...existing, ...resume, targetRole: jobType, city };
      sessionStorage.setItem("mapleinsResumeAnalysis", JSON.stringify(toStore));
      setTimeout(() => setSaveStatus("saved"), 300);
      setTimeout(() => setSaveStatus("idle"), 2000);
    } catch { setSaveStatus("idle"); }
  };

  const generateWithAI = async () => {
    setAiGenerating(true);
    try {
      const lines = [resume.name, resume.email, resume.phone, "", "SUMMARY:", resume.summary, "", "EXPERIENCE:"];
      (resume.experienceByRole ?? []).forEach(r => {
        lines.push(`${r.role} at ${r.company} (${r.dates})`);
        r.bullets?.forEach(b => lines.push(`- ${b}`));
        lines.push("");
      });
      lines.push("SKILLS:", resume.skills.join(", "), "", "EDUCATION:", ...resume.education);

      const res = await fetch("/api/resume/edit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ resumeText: lines.join("\n"), jobType, city, immigrationStatus }),
      });
      if (!res.ok) throw new Error();
      const data = await res.json();
      const next = { ...resume, ...data, experience: data.experienceByRole?.flatMap((e: ExperienceEntry) => e.bullets ?? []) ?? resume.experience };
      setResume(next);
      setSaveStatus("saved");
      setTimeout(() => setSaveStatus("idle"), 2000);
    } catch { /* ignore */ }
    finally { setAiGenerating(false); }
  };

  const downloadPdf = async () => {
    setDownloading(true);
    try {
      const res = await fetch("/api/resume/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ jobType, city, skipRefinement: true, parsedData: resume }),
      });
      if (!res.ok) throw new Error();
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a"); a.href = url; a.download = "Mapleins-Optimized.pdf"; a.click();
    } catch { /* ignore */ }
    finally { setDownloading(false); }
  };

  const scoreColor = ats.total >= 80 ? "#166534" : ats.total >= 60 ? "#ea580c" : "#dc2626";
  const matchedKeywords = (SECTOR_KEYWORDS[jobType.toLowerCase()] || SECTOR_KEYWORDS.default);

  return (
    <div className="min-h-screen bg-[#f8faf9]">
      {/* ── Fixed Action Header ── */}
      <header className="glass-morphism sticky top-0 z-50 bg-white/95 border-b border-gray-100 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/dashboard" className="flex items-center gap-2 group">
              <div className="w-8 h-8 green-gradient rounded-lg flex items-center justify-center text-white font-bold text-xs shadow-md transition-transform group-hover:scale-110">M</div>
              <span className="text-xl font-bold text-gray-900">Mapleins <span className="text-[#166534] italic opacity-50">Editor</span></span>
            </Link>
            <div className="hidden md:flex items-center gap-2 h-6 px-3 bg-green-50 rounded-full border border-green-100">
              <span className="flex h-1.5 w-1.5 rounded-full bg-green-500 animate-pulse" />
              <span className="text-[10px] font-bold text-green-700 uppercase tracking-wider">{jobType || "General Role"} · {city || "Canada"}</span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="hidden sm:flex items-center mr-4">
              <span className={`text-[10px] font-black uppercase tracking-widest transition-all ${saveStatus.includes("saved") ? "text-green-500" : "text-gray-300"}`}>
                {saveStatus.includes("saved") ? "● Auto-saved" : "○ Draft"}
              </span>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={generateWithAI}
              disabled={aiGenerating}
              className="h-10 px-6 border-2 border-[#166534] text-[#166534] font-bold rounded-xl hover:bg-green-50 transition-all hidden md:flex"
            >
              {aiGenerating ? "Generating..." : "AI Improve Content"}
            </Button>
            <Button
              size="sm"
              onClick={downloadPdf}
              disabled={downloading}
              className="h-10 px-6 green-gradient text-white font-bold rounded-xl shadow-lg hover:shadow-xl hover:scale-105 transition-all"
            >
              {downloading ? "Preparing..." : "Download PDF"}
            </Button>
            <button onClick={() => router.back()} className="p-2 text-gray-400 hover:text-gray-900 transition-colors ml-2" title="Close Editor">
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-10">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">

          {/* ── Left Profile Edit ── */}
          <div className="lg:col-span-8 space-y-8">

            {/* Contact Card */}
            <section className="glass-card p-8 bg-white reveal-up">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-xl bg-green-50 flex items-center justify-center text-xl">👤</div>
                <h2 className="text-xl font-black text-gray-900 tracking-tight">Contact Details</h2>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {(["name", "email", "phone"] as const).map((f) => (
                  <div key={f} className="space-y-2">
                    <Label className="text-[10px] font-black uppercase tracking-widest text-[#166534] opacity-70 ml-1">{f}</Label>
                    <input
                      type="text"
                      value={resume[f]}
                      onChange={(e) => setField(f, e.target.value)}
                      placeholder={`Provide ${f}...`}
                      className="w-full bg-gray-50/50 border border-gray-100 rounded-xl px-4 py-3 text-sm focus:bg-white focus:ring-2 focus:ring-[#166534] transition-all outline-none font-medium text-gray-700"
                    />
                  </div>
                ))}
              </div>
            </section>

            {/* Summary Card */}
            <section className="glass-card p-8 bg-white reveal-up">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-green-50 flex items-center justify-center text-xl">✨</div>
                  <h2 className="text-xl font-black text-gray-900 tracking-tight">Professional Summary</h2>
                </div>
                <span className="text-[10px] font-bold text-gray-300 uppercase italic">Goal: 80+ words</span>
              </div>
              <textarea
                value={resume.summary}
                onChange={(e) => setField("summary", e.target.value)}
                placeholder="Hook the employer in 4 sentences. Mention your core expertise, recent success in Canada, and specific value prop..."
                rows={4}
                className="w-full bg-gray-50/50 border border-gray-100 rounded-2xl px-5 py-4 text-sm focus:bg-white focus:ring-2 focus:ring-[#166534] transition-all outline-none font-medium leading-relaxed text-gray-700 resize-none"
              />
              <AIHint hintKey="summary" h={hints["summary"]} applyAlt={(v) => setField("summary", v)} onToggle={toggleAlternatives} />
            </section>

            {/* Exp Card */}
            <section className="glass-card p-8 bg-white reveal-up">
              <div className="flex items-center justify-between mb-8">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-orange-50 flex items-center justify-center text-xl">💼</div>
                  <h2 className="text-xl font-black text-gray-900 tracking-tight">Work Experience</h2>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  onClick={addRole}
                  className="text-xs font-black uppercase tracking-widest text-[#166534] hover:bg-green-50 rounded-xl"
                >
                  + Add Role
                </Button>
              </div>

              <div className="space-y-10">
                {(resume.experienceByRole ?? []).map((role, rIdx) => (
                  <div key={rIdx} className="relative pl-8 border-l border-gray-100 space-y-6 reveal-up">
                    <div className="absolute top-0 -left-[5px] w-2.5 h-2.5 rounded-full bg-green-200 border-2 border-white shadow-sm" />
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <input
                        type="text"
                        value={role.role}
                        onChange={(e) => setRoleField(rIdx, "role", e.target.value)}
                        placeholder="Job Title"
                        className="font-bold text-gray-900 bg-transparent border-none focus:ring-0 p-0 placeholder:text-gray-200 text-lg"
                      />
                      <input
                        type="text"
                        value={role.company}
                        onChange={(e) => setRoleField(rIdx, "company", e.target.value)}
                        placeholder="Company Name"
                        className="font-medium text-gray-400 bg-transparent border-none focus:ring-0 p-0 placeholder:text-gray-100"
                      />
                      <input
                        type="text"
                        value={role.dates ?? ""}
                        onChange={(e) => setRoleField(rIdx, "dates", e.target.value)}
                        placeholder="Dates (e.g. 2022 - Present)"
                        className="text-right text-xs font-bold text-[#166534] bg-transparent border-none focus:ring-0 p-0 placeholder:text-gray-100 uppercase italic tracking-widest"
                      />
                    </div>

                    <div className="space-y-4">
                      {role.bullets?.map((bull, bIdx) => (
                        <div key={bIdx} className="group">
                          <div className="flex gap-4">
                            <span className="text-[#166534] mt-2.5 opacity-30 select-none">•</span>
                            <textarea
                              value={bull}
                              onChange={(e) => {
                                setRoleBullet(rIdx, bIdx, e.target.value);
                                requestHint(`exp_role_${rIdx}_${bIdx}`, e.target.value);
                              }}
                              rows={2}
                              className="w-full bg-transparent border-none focus:ring-0 p-0 text-sm leading-relaxed text-gray-600 font-medium placeholder:text-gray-200 resize-none"
                              placeholder="Managed inventory flow for 500+ items daily, reducing waste by 12%..."
                            />
                          </div>
                          <AIHint
                            hintKey={`exp_role_${rIdx}_${bIdx}`}
                            h={hints[`exp_role_${rIdx}_${bIdx}`]}
                            applyAlt={(v) => setRoleBullet(rIdx, bIdx, v)}
                            onToggle={toggleAlternatives}
                          />
                        </div>
                      ))}
                      <button
                        type="button"
                        onClick={() => addRoleBullet(rIdx)}
                        className="text-[10px] font-black uppercase tracking-widest text-green-700/50 hover:text-green-700 transition-colors ml-7"
                      >
                        + New Bullet Point
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </section>

            {/* Skills & Education */}
            <div className="grid md:grid-cols-2 gap-8">
              <section className="glass-card p-8 bg-white reveal-up">
                <div className="flex items-center justify-between mb  -6">
                  <h3 className="text-sm font-black text-gray-900 uppercase tracking-widest">Hard Skills</h3>
                  <button
                    type="button"
                    onClick={() => addListItem("skills")}
                    className="text-[10px] font-black text-[#166534]/50 hover:text-[#166534] uppercase tracking-widest"
                  >
                    + Add
                  </button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {resume.skills.map((s, i) => (
                    <input
                      key={i}
                      type="text"
                      value={s}
                      onChange={(e) => setListItem("skills", i, e.target.value)}
                      className="px-3 py-1.5 rounded-xl bg-gray-50/50 border border-gray-100 text-[11px] font-bold text-gray-600 uppercase tracking-tight focus:bg-white focus:ring-1 focus:ring-[#166534] outline-none transition-all w-24 text-center"
                    />
                  ))}
                </div>
              </section>

              <section className="glass-card p-8 bg-white reveal-up">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-sm font-black text-gray-900 uppercase tracking-widest">Education</h3>
                  <button
                    type="button"
                    onClick={() => addListItem("education")}
                    className="text-[10px] font-black text-[#166534]/50 hover:text-[#166534] uppercase tracking-widest"
                  >
                    + Add
                  </button>
                </div>
                <div className="space-y-3">
                  {resume.education.map((e, i) => (
                    <input
                      key={i}
                      type="text"
                      value={e}
                      onChange={(e) => setListItem("education", i, e.target.value)}
                      className="w-full bg-gray-50/50 border border-gray-100 rounded-xl px-4 py-2 text-xs font-semibold text-gray-500 focus:bg-white outline-none"
                      placeholder="e.g. Diploma, Matrix College (2024)"
                    />
                  ))}
                </div>
              </section>
            </div>
          </div>

          {/* ── Right Analysis ── */}
          <aside className="lg:col-span-4 space-y-6">
            <div className="glass-morphism bg-white/80 p-8 rounded-3xl border border-green-50 shadow-2xl sticky top-28">
              <div className="flex flex-col items-center mb-10 text-center">
                <AtsRing score={ats.total} />
                <p className="mt-6 text-sm font-bold text-gray-900 tracking-tight italic line-clamp-2">
                  {ats.total >= 80 ? "Perfectly balanced for Canada." : ats.total >= 60 ? "Solid base. Add more metrics." : "Focus on 'Impact' to rank higher."}
                </p>
              </div>

              <div className="space-y-4 mb-8">
                <AtsBar label="Contact Precision" value={ats.contactInfo} max={20} color="#166534" />
                <AtsBar label="Executive Summary" value={ats.summary} max={15} color="#4ade80" />
                <AtsBar label="Action Verb usage" value={ats.actionVerbs} max={20} color="#166534" />
                <AtsBar label="Quantified Results" value={ats.quantification} max={15} color="#ea580c" />
                <AtsBar label="Canadian Keywords" value={ats.keywords} max={20} color={scoreColor} />
                <AtsBar label="Layout Structure" value={ats.length} max={10} color="#94a3b8" />
              </div>

              <div className="p-4 bg-green-50/50 rounded-2xl border border-green-100 mb-8">
                <h4 className="text-[10px] font-black text-[#166534] uppercase tracking-[0.2em] mb-3">Matching Keywords</h4>
                <div className="flex flex-wrap gap-1.5">
                  {matchedKeywords.slice(0, 8).map(kw => (
                    <span key={kw} className={`text-[9px] font-bold px-2 py-0.5 rounded-full border ${resume.skills.includes(kw) ? 'bg-green-100 border-green-200 text-green-700' : 'bg-white border-gray-100 text-gray-300 italic'}`}>
                      {kw}
                    </span>
                  ))}
                </div>
              </div>

              <div className="hidden md:block">
                <Link href="/dashboard" className="block w-full p-4 green-gradient rounded-2xl text-center text-white shadow-lg font-bold hover:scale-[1.02] transition-transform">
                  <span className="block text-[10px] font-black uppercase tracking-widest mb-1 opacity-70">New Role?</span>
                  Restart Analysis
                </Link>
              </div>
            </div>
          </aside>
        </div>
      </main>
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
