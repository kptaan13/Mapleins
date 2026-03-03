"use client";

import { Suspense, useCallback, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import type { JobSuggestion, JobsResponse } from "@/app/api/resume/jobs/route";
import { getCompetencyProfile, detectSkillGaps } from "@/lib/competencyProfiles";
import { STRIPE_DONATION_LINK } from "@/lib/constants";

// ─── ATS Scoring (shared with editor) ──────────────────────────────────────────

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

type ExperienceRole = { role?: string; company?: string; dates?: string; bullets?: string[] };

type SimpleResume = {
  name?: string;
  email?: string;
  phone?: string;
  summary: string;
  experience: string[];
  experienceByRole?: ExperienceRole[];
  skills: string[];
  education: string[];
  certifications?: string[];
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

function calcATSForResults(resume: SimpleResume, jobType: string): ATSBreakdown {
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

  // Contact info (20 pts)
  const contactInfo =
    (resume.name?.trim() ? 7 : 0) +
    (resume.email?.trim() ? 7 : 0) +
    (resume.phone?.trim() ? 6 : 0);

  // Summary (15 pts)
  const summary = resume.summary?.length > 80 ? 15 : resume.summary?.length > 40 ? 8 : 0;

  // Action verbs (20 pts)
  const verbsFound = ACTION_VERBS.filter((v) => allText.includes(v)).length;
  const actionVerbs = Math.min(20, Math.round((verbsFound / 6) * 20));

  // Quantification (15 pts) — look for numbers/% in bullets
  const quantBullets = bullets.filter((b) => /\d+%?|\$\d+|[\d,]+\s*(team|employees|staff|users|customers|projects|sku|items|orders)/i.test(b)).length;
  const quantification = Math.min(15, Math.round((quantBullets / Math.max(bullets.length, 1)) * 20));

  // Keywords (20 pts)
  const kwMatched = kws.filter((k) => allText.includes(k)).length;
  const keywords = Math.min(20, Math.round((kwMatched / kws.length) * 20));

  // Length/structure (10 pts)
  const length =
    (bullets.length >= 3 ? 4 : bullets.length >= 1 ? 2 : 0) +
    (resume.skills.filter(Boolean).length >= 4 ? 3 : 1) +
    (resume.education.filter(Boolean).some((e) => e.length > 5) ? 2 : 0) +
    ((resume.certifications?.filter(Boolean).length ?? 0) >= 1 ? 1 : 0);

  const total = Math.min(100, contactInfo + summary + actionVerbs + quantification + keywords + length);
  return { contactInfo, summary, actionVerbs, quantification, keywords, length, total };
}

// ─── Match badge ──────────────────────────────────────────────────────────────

function MatchBadge({ match }: { match: JobSuggestion["match"] }) {
  const styles: Record<string, string> = {
    Strong: "bg-green-100 text-green-700 border-green-200",
    Good: "bg-blue-100 text-blue-700 border-blue-200",
    Stretch: "bg-amber-100 text-amber-700 border-amber-200",
  };
  return (
    <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border ${styles[match] ?? ""}`}>
      {match} Match
    </span>
  );
}

// ─── Circular Progress ────────────────────────────────────────────────────────

function CircularProgress({ score }: { score: number }) {
  const radius = 70;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (score / 100) * circumference;

  return (
    <div className="relative flex items-center justify-center">
      <svg className="w-40 h-40 transform -rotate-90">
        <circle
          cx="80"
          cy="80"
          r={radius}
          stroke="currentColor"
          strokeWidth="12"
          fill="transparent"
          className="text-gray-100"
        />
        <circle
          cx="80"
          cy="80"
          r={radius}
          stroke="currentColor"
          strokeWidth="12"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          fill="transparent"
          className="text-[#166534] transition-all duration-1000 ease-out"
        />
      </svg>
      <div className="absolute flex flex-col items-center">
        <span className="text-4xl font-black text-gray-900">{score}</span>
        <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Score</span>
      </div>
    </div>
  );
}

// ─── Main content ─────────────────────────────────────────────────────────────

function ResumeResultsContent() {
  const searchParams = useSearchParams();
  const jobType = searchParams.get("jobType") || "";
  const city = searchParams.get("city") || "";
  const immigrationStatus = searchParams.get("immigrationStatus") || "";
  const resumeUrl = searchParams.get("resumeUrl") || "";

  const [isDownloading, setIsDownloading] = useState(false);
  const [downloadDataMissing, setDownloadDataMissing] = useState(false);
  const [donating, setDonating] = useState(false);
  const [donationError, setDonationError] = useState<string | null>(null);

  const [jobsData, setJobsData] = useState<JobsResponse | null>(null);
  const [jobsLoading, setJobsLoading] = useState(false);
  const [jobsError, setJobsError] = useState(false);
  const [jobsSkippedNoData, setJobsSkippedNoData] = useState(false);

  const [skillGap, setSkillGap] = useState<{
    missing: string[];
    transferable: string[];
  } | null>(null);

  const [atsScore, setAtsScore] = useState<number | null>(null);

  useEffect(() => {
    const stored = sessionStorage.getItem("mapleinsResumeAnalysis");
    if (!stored || !jobType) return;
    try {
      const data = JSON.parse(stored) as any;

      // Skill gaps
      const profile = getCompetencyProfile(jobType);
      if (profile && Array.isArray(data.skills) && data.skills.length) {
        setSkillGap(detectSkillGaps(data.skills, profile));
      }

      // ATS score based on current stored resume
      const resumeForScore: SimpleResume = {
        name: typeof data.name === "string" ? data.name : "",
        email: typeof data.email === "string" ? data.email : "",
        phone: typeof data.phone === "string" ? data.phone : "",
        summary: typeof data.summary === "string" ? data.summary : "",
        experience: Array.isArray(data.experience) ? data.experience.filter(Boolean) : [],
        experienceByRole: Array.isArray(data.experienceByRole) ? data.experienceByRole : [],
        skills: Array.isArray(data.skills) ? data.skills.filter(Boolean) : [],
        education: Array.isArray(data.education) ? data.education.filter(Boolean) : [],
        certifications: Array.isArray(data.certifications) ? data.certifications.filter(Boolean) : [],
      };
      const breakdown = calcATSForResults(resumeForScore, jobType);
      setAtsScore(breakdown.total);
    } catch {
      // ignore parse/score issues, keep default score
    }
  }, [jobType]);

  const loadJobs = useCallback(async () => {
    const stored = sessionStorage.getItem("mapleinsResumeAnalysis");
    let resumeData: Record<string, unknown> = {};
    try {
      resumeData = stored ? JSON.parse(stored) : {};
    } catch { /* ignore */ }
    const hasData = (typeof resumeData.name === "string" && resumeData.name.trim().length > 0) ||
      (Array.isArray(resumeData.experience) && resumeData.experience.some(Boolean)) ||
      (Array.isArray(resumeData.experienceByRole) && (resumeData.experienceByRole as { bullets?: unknown[] }[]).some((e) => (e?.bullets?.length ?? 0) > 0));

    if (!hasData) {
      setJobsData({ jobs: [], summary: "" });
      setJobsSkippedNoData(true);
      setJobsLoading(false);
      return;
    }
    setJobsSkippedNoData(false);

    setJobsLoading(true);
    setJobsError(false);
    try {
      const res = await fetch("/api/resume/jobs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: resumeData.name,
          summary: resumeData.summary,
          skills: resumeData.skills,
          experience: resumeData.experience,
          targetRole: jobType,
          city,
          immigrationStatus,
        }),
      });
      if (!res.ok) throw new Error("Failed");
      const data: JobsResponse = await res.json();
      setJobsData(data);
    } catch {
      setJobsError(true);
    } finally {
      setJobsLoading(false);
    }
  }, [jobType, city, immigrationStatus]);

  useEffect(() => {
    loadJobs();
  }, [loadJobs]);

  const handleDownload = async () => {
    const rawData = sessionStorage.getItem("mapleinsResumeAnalysis");
    if (!rawData) {
      setDownloadDataMissing(true);
      return;
    }
    setIsDownloading(true);
    try {
      const stored = JSON.parse(rawData);
      const res = await fetch("/api/resume/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          jobType,
          city,
          version: "ats",
          jobDescription: stored.jobDescription || "",
          parsedData: stored,
        }),
      });
      if (!res.ok) throw new Error("Download failed");
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "Mapleins-Resume.pdf";
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      setDownloadDataMissing(true);
    } finally {
      setIsDownloading(false);
    }
  };

  const editorHref = `/editor?jobType=${encodeURIComponent(jobType)}&city=${encodeURIComponent(city)}${resumeUrl ? `&resumeUrl=${encodeURIComponent(resumeUrl)}` : ""}${immigrationStatus ? `&immigrationStatus=${encodeURIComponent(immigrationStatus)}` : ""}`;

  return (
    <div className="min-h-screen bg-[#f8faf9]">
      {/* ── Header ── */}
      <header className="glass-morphism sticky top-0 bg-white/80 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
          <Link href="/dashboard" className="flex items-center gap-2">
            <div className="w-8 h-8 green-gradient rounded-lg flex items-center justify-center text-white font-bold text-xs shadow-md">M</div>
            <span className="text-xl font-bold text-gray-900">Mapleins</span>
          </Link>
          <div className="flex items-center gap-6">
            <Link href="/dashboard" className="text-sm font-bold text-gray-500 hover:text-[#166534] transition-colors">New Scan</Link>
            <button
              type="button"
              onClick={async () => {
                const { createClient } = await import("@/lib/supabase/client");
                const supabase = createClient();
                await supabase.auth.signOut();
                window.location.href = "/";
              }}
              className="text-sm font-bold text-[#166534] hover:underline transition-colors px-4 py-2 bg-green-50 rounded-xl"
            >
              Sign out
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-12">
        <div className="grid lg:grid-cols-3 gap-8">

          {/* ── Left Column: Analysis ── */}
          <div className="lg:col-span-2 space-y-8 overflow-hidden">

            {/* Summary Hero */}
            <div className="glass-card p-10 bg-white/40 flex flex-col md:flex-row items-center gap-10 reveal-up">
              {atsScore === null ? (
                <div className="w-40 h-40 rounded-full border-8 border-gray-100 flex items-center justify-center text-xs font-semibold text-gray-400">
                  Loading…
                </div>
              ) : (
                <CircularProgress score={atsScore} />
              )}
              <div className="flex-1 text-center md:text-left reveal-up stagger-1">
                <h1 className="text-3xl font-black text-gray-900 mb-4">Your ATS Analysis is Ready</h1>
                <p className="text-gray-600 mb-8 max-w-lg">
                  We&apos;ve analyzed your resume for <strong>{jobType || "Canadian Employers"}</strong>. Your current score is strong, but there are critical improvements to increase your interview chances.
                </p>
                <div className="flex flex-wrap items-center justify-center md:justify-start gap-4">
                  <button
                    onClick={handleDownload}
                    disabled={isDownloading}
                    className="green-gradient text-white px-8 py-4 rounded-2xl font-bold shadow-xl hover:shadow-2xl hover:scale-[1.02] transition-all disabled:opacity-50 flex items-center gap-2"
                  >
                    {isDownloading ? "Preparing..." : "Download Optimized PDF"}
                    {!isDownloading && <span className="text-xl">⬇</span>}
                  </button>
                  <Link href={editorHref}>
                    <Button variant="outline" className="px-8 py-4 h-auto border-2 border-[#166534] text-[#166534] font-bold rounded-2xl hover:bg-green-50 transition-all">
                      Open AI Live Editor
                    </Button>
                  </Link>
                </div>
              </div>
            </div>

            {/* Skill Gaps */}
            <div className="grid md:grid-cols-2 gap-6">
              <div className="glass-card p-8 bg-white reveal-up stagger-2">
                <h3 className="text-xl font-bold text-gray-900 mb-6 flex items-center gap-2">
                  <span className="text-red-500">⚠</span> Critical Skill Gaps
                </h3>
                <div className="flex flex-wrap gap-2">
                  {skillGap?.missing.map(s => (
                    <span key={s} className="px-3 py-1.5 rounded-xl bg-red-50 border border-red-100 text-red-700 text-xs font-bold uppercase tracking-wider">{s}</span>
                  )) || <span className="text-sm text-gray-400">No major gaps detected.</span>}
                </div>
                <p className="mt-6 text-sm text-gray-500 leading-relaxed italic border-t border-gray-100 pt-6">
                  &quot;Adding these specific keywords can increase your ATS ranking by up to 45% for Canadian roles.&quot;
                </p>
              </div>

              <div className="glass-card p-8 bg-white reveal-up stagger-3">
                <h3 className="text-xl font-bold text-gray-900 mb-6 flex items-center gap-2">
                  <span className="text-amber-500">💡</span> Transferable Skills
                </h3>
                <div className="flex flex-wrap gap-2">
                  {skillGap?.transferable.map(s => (
                    <span key={s} className="px-3 py-1.5 rounded-xl bg-amber-50 border border-amber-100 text-amber-700 text-xs font-bold uppercase tracking-wider">{s}</span>
                  )) || <span className="text-sm text-gray-400">Perfect skill alignment detected!</span>}
                </div>
                <p className="mt-6 text-sm text-gray-500 leading-relaxed border-t border-gray-100 pt-6">
                  Highlight these using Canadian terminology in the Live Editor to stand out to hiring managers.
                </p>
              </div>
            </div>

            {/* AI Recommendation Summary */}
            {jobsData?.summary && (
              <div className="glass-card p-8 green-gradient text-white border-none reveal-up stagger-4">
                <h3 className="text-xl font-bold mb-4">AI Profile Summary</h3>
                <p className="text-green-50 leading-relaxed font-medium">
                  {jobsData.summary}
                </p>
              </div>
            )}

            {/* Interview Prep / Resources */}
            <div className="glass-card p-8 bg-white border-[#166534]/10 reveal-up stagger-4">
              <div className="flex flex-col md:flex-row items-center gap-8">
                <div className="w-16 h-16 rounded-2xl bg-green-50 flex items-center justify-center text-4xl">📚</div>
                <div className="flex-1">
                  <h3 className="text-xl font-bold text-gray-900 mb-2">Canadian Workplace Etiquette Guide</h3>
                  <p className="text-gray-500 text-sm mb-4">
                    Free resource for newcomers: Learn how to handle interviews, networking, and the Canadian &quot;hidden job market&quot;.
                  </p>
                  <a href="/api/interview-prep">
                    <Button className="bg-[#166534] hover:bg-[#15803d] text-white font-bold rounded-xl shadow-md">
                      Download Guide PDF
                    </Button>
                  </a>
                </div>
              </div>
            </div>
          </div>

          {/* ── Right Column: Job Matches ── */}
          <div className="lg:col-span-1 space-y-8">
            <div className="glass-morphism bg-white/80 rounded-3xl p-8 sticky top-24 border border-green-100 shadow-2xl reveal-up stagger-2">
              <div className="flex items-center justify-between mb-8">
                <h2 className="text-2xl font-black text-gray-900 italic tracking-tight underline decoration-[#166534] decoration-4">Top Matches</h2>
                <button onClick={loadJobs} className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
                  <svg className={`w-5 h-5 text-gray-400 ${jobsLoading ? "animate-spin" : ""}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                </button>
              </div>

              {jobsLoading ? (
                <div className="space-y-6">
                  {[1, 2, 3].map(i => (
                    <div key={i} className="animate-pulse space-y-3">
                      <div className="h-4 w-3/4 bg-gray-200 rounded-full" />
                      <div className="h-3 w-1/2 bg-gray-100 rounded-full" />
                      <div className="h-8 w-full bg-gray-50 rounded-xl" />
                    </div>
                  ))}
                </div>
              ) : jobsData && jobsData.jobs.length > 0 ? (
                <div className="space-y-6">
                  {jobsData.jobs.map((job, i) => (
                    <div key={i} className="group p-5 rounded-2xl hover:bg-white hover:shadow-xl transition-all duration-300 border border-transparent hover:border-green-100 reveal-up" style={{ animationDelay: `${0.3 + i * 0.1}s` }}>
                      <div className="flex items-start justify-between mb-3">
                        <MatchBadge match={job.match} />
                        <span className="text-[10px] font-black text-gray-300 uppercase italic">{job.salaryRange}</span>
                      </div>
                      <h4 className="font-bold text-gray-900 mb-2 group-hover:text-[#166534] transition-colors">{job.title}</h4>
                      <p className="text-xs text-gray-500 mb-4 line-clamp-2 leading-relaxed italic">
                        &quot;{job.reason}&quot;
                      </p>
                      <p className="text-[10px] text-gray-400 font-semibold uppercase tracking-widest">
                        {job.searchTip}
                      </p>
                    </div>
                  ))}
                  <Link href="/donate" className="block p-6 green-gradient rounded-2xl text-center text-white shadow-lg reveal-up stagger-4">
                    <span className="block text-xs font-black uppercase tracking-widest mb-2">Help us keep it free</span>
                    <span className="text-lg font-bold">❤️ Buy us a coffee</span>
                  </Link>
                </div>
              ) : (
                <div className="text-center py-12 reveal-up stagger-2">
                  <div className="text-4xl mb-4">🔍</div>
                  <p className="text-sm text-gray-400 font-medium">Upload resume and add city to see matched jobs.</p>
                  <Link href="/dashboard" className="inline-block mt-4 text-[#166534] font-bold underline">Go to Dashboard</Link>
                </div>
              )}
            </div>
          </div>
        </div>
      </main>

      {/* ── Floating CTA ── */}
      {!isDownloading && (
        <div className="fixed bottom-8 right-8 z-40 hidden md:block animate-in fade-in slide-in-from-bottom-8 duration-700">
          <button
            onClick={handleDownload}
            className="green-gradient text-white p-5 rounded-2xl shadow-2xl hover:scale-110 active:scale-95 transition-all flex items-center gap-3 font-bold"
          >
            <span className="text-2xl">⬇</span>
            <span>Download PDF</span>
          </button>
        </div>
      )}
    </div>
  );
}

export default function ResumeResultsPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-[#f8faf9] flex flex-col items-center justify-center text-gray-400">
        <div className="w-12 h-12 rounded-full border-4 border-gray-200 border-t-[#166534] animate-spin mb-4" />
        <span className="font-bold uppercase tracking-widest text-xs">Analyzing Your Career Path…</span>
      </div>
    }>
      <ResumeResultsContent />
    </Suspense>
  );
}
