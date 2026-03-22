"use client";

import { Suspense, useCallback, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import type { JobSuggestion, JobsResponse } from "@/app/api/resume/jobs/route";
import { getCompetencyProfile, detectSkillGaps, extractJDKeywords } from "@/lib/competencyProfiles";
import { STRIPE_DONATION_LINK } from "@/lib/constants";

// ─── Version History ──────────────────────────────────────────────────────────

const VERSION_HISTORY_KEY = "mapleins_version_history";
const FREE_DOWNLOAD_KEY = "mapleins_free_downloads";
const FREE_DOWNLOAD_LIMIT = 3;
const UNLIMITED_EMAILS = ["rohan61034kakkar@gmail.com"];

type ResumeVersion = {
  id: string;
  timestamp: number;
  jobType: string;
  city: string;
  theme: string;
  name: string;
  resumeData: Record<string, unknown>;
};

function loadVersionHistory(): ResumeVersion[] {
  try {
    const raw = localStorage.getItem(VERSION_HISTORY_KEY);
    return raw ? (JSON.parse(raw) as ResumeVersion[]) : [];
  } catch { return []; }
}

function saveVersion(v: ResumeVersion) {
  try {
    const history = loadVersionHistory();
    const updated = [v, ...history.filter((h) => h.id !== v.id)].slice(0, 5);
    localStorage.setItem(VERSION_HISTORY_KEY, JSON.stringify(updated));
  } catch { /* ignore */ }
}

function getFreeDownloadCount(): number {
  try { return parseInt(localStorage.getItem(FREE_DOWNLOAD_KEY) || "0", 10); }
  catch { return 0; }
}

function incrementFreeDownloadCount() {
  try { localStorage.setItem(FREE_DOWNLOAD_KEY, String(getFreeDownloadCount() + 1)); }
  catch { /* ignore */ }
}

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
  const [selectedTheme, setSelectedTheme] = useState("federal");
  const [downloadDataMissing, setDownloadDataMissing] = useState(false);
  const [downloadError, setDownloadError] = useState<string | null>(null);
  const [donating, setDonating] = useState(false);
  const [donationError, setDonationError] = useState<string | null>(null);

  // Post-download success + email capture
  const [downloadSuccess, setDownloadSuccess] = useState(false);
  const [showEmailCapture, setShowEmailCapture] = useState(false);
  const [captureEmail, setCaptureEmail] = useState("");
  const [emailSaved, setEmailSaved] = useState(false);

  // Re-target role
  const [showRetarget, setShowRetarget] = useState(false);
  const [retargetRole, setRetargetRole] = useState(jobType);
  const [retargetCity, setRetargetCity] = useState(city);

  const [jobsData, setJobsData] = useState<JobsResponse | null>(null);
  const [jobsLoading, setJobsLoading] = useState(false);
  const [jobsError, setJobsError] = useState(false);
  const [jobsSkippedNoData, setJobsSkippedNoData] = useState(false);

  const [skillGap, setSkillGap] = useState<{
    missing: string[];
    transferable: string[];
  } | null>(null);

  const [atsScore, setAtsScore] = useState<number | null>(null);

  // JD match
  const [jdKeywords, setJdKeywords] = useState<string[]>([]);
  const [jdMatched, setJdMatched] = useState<string[]>([]);
  const [jdMissing, setJdMissing] = useState<string[]>([]);

  // Interview prep
  const [interviewPrep, setInterviewPrep] = useState<{
    questions: { question: string; tip: string }[];
    generalTips: string[];
  } | null>(null);
  const [interviewLoading, setInterviewLoading] = useState(false);
  const [openQuestion, setOpenQuestion] = useState<number | null>(null);
  const [checklistItems, setChecklistItems] = useState<Record<string, boolean>>({});

  // Version history & paywall
  const [versionHistory, setVersionHistory] = useState<ResumeVersion[]>([]);
  const [showPaywall, setShowPaywall] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [redownloading, setRedownloading] = useState<string | null>(null);

  useEffect(() => {
    setVersionHistory(loadVersionHistory());
    try {
      const saved = localStorage.getItem("mapleins_checklist");
      if (saved) setChecklistItems(JSON.parse(saved) as Record<string, boolean>);
    } catch { /* ignore */ }
  }, []);

  useEffect(() => {
    const stored = (sessionStorage.getItem("mapleinsResumeAnalysis") ?? localStorage.getItem("mapleinsResumeAnalysis"));
    if (!stored || !jobType) return;
    try {
      const data = JSON.parse(stored) as Partial<SimpleResume> & { jobDescription?: string };

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

      // JD match
      const jd = data.jobDescription || "";
      if (jd.trim().length > 50) {
        const kws = extractJDKeywords(jd);
        setJdKeywords(kws);
        const allResumeText = [
          resumeForScore.summary,
          ...resumeForScore.experience,
          ...(resumeForScore.experienceByRole ?? []).flatMap((r) => r.bullets ?? []),
          ...resumeForScore.skills,
        ].join(" ").toLowerCase();
        const matched = kws.filter((k) => allResumeText.includes(k));
        setJdMatched(matched);
        setJdMissing(kws.filter((k) => !matched.includes(k)));
      }
    } catch {
      // ignore parse/score issues, keep default score
    }
  }, [jobType]);

  const loadJobs = useCallback(async () => {
    const stored = (sessionStorage.getItem("mapleinsResumeAnalysis") ?? localStorage.getItem("mapleinsResumeAnalysis"));
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

  const loadInterviewPrep = useCallback(async () => {
    const stored = (sessionStorage.getItem("mapleinsResumeAnalysis") ?? localStorage.getItem("mapleinsResumeAnalysis"));
    let resumeData: Record<string, unknown> = {};
    try { resumeData = stored ? JSON.parse(stored) : {}; } catch { /* ignore */ }
    if (!jobType) return;
    setInterviewLoading(true);
    try {
      const res = await fetch("/api/resume/interview-prep", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          jobType,
          city,
          skills: Array.isArray(resumeData.skills) ? resumeData.skills : [],
          summary: typeof resumeData.summary === "string" ? resumeData.summary : "",
        }),
      });
      if (!res.ok) throw new Error("Failed");
      const data = await res.json() as { questions: { question: string; tip: string }[]; generalTips: string[] };
      setInterviewPrep(data);
    } catch {
      setInterviewPrep({ questions: [], generalTips: [] });
    } finally {
      setInterviewLoading(false);
    }
  }, [jobType, city]);

  useEffect(() => {
    loadInterviewPrep();
  }, [loadInterviewPrep]);

  const handleDownload = async (skipPaywallCheck = false) => {
    // Freemium gate: soft paywall after FREE_DOWNLOAD_LIMIT
    const savedEmail = (() => { try { return localStorage.getItem("mapleins_capture_email") || ""; } catch { return ""; } })();
    const isUnlimited = UNLIMITED_EMAILS.includes(savedEmail.toLowerCase().trim());
    if (!skipPaywallCheck && !isUnlimited && getFreeDownloadCount() >= FREE_DOWNLOAD_LIMIT) {
      setShowPaywall(true);
      return;
    }

    const rawData = (sessionStorage.getItem("mapleinsResumeAnalysis") ?? localStorage.getItem("mapleinsResumeAnalysis"));
    setDownloadDataMissing(false);
    setDownloadError(null);
    setIsDownloading(true);
    setShowPaywall(false);
    const DOWNLOAD_TIMEOUT_MS = 45000;

    const triggerBrowserDownload = (blob: Blob, filename: string) => {
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      // Delay revoke slightly so the browser can consume the object URL.
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    };

    try {
      const fetchWithTimeout = async (input: RequestInfo | URL, init?: RequestInit) => {
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), DOWNLOAD_TIMEOUT_MS);
        try {
          return await fetch(input, { ...init, signal: controller.signal });
        } finally {
          clearTimeout(timer);
        }
      };

      if (rawData) {
        const stored = JSON.parse(rawData);
        const res = await fetchWithTimeout("/api/resume/generate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            jobType,
            city,
            version: "ats",
            theme: selectedTheme,
            jobDescription: stored.jobDescription || "",
            parsedData: stored,
          }),
        });
        if (!res.ok) {
          let message = `Download failed (${res.status})`;
          try {
            const errData = (await res.json()) as { error?: string };
            if (errData?.error) message = errData.error;
          } catch {
            // keep default message
          }
          throw new Error(message);
        }
        const blob = await res.blob();
        triggerBrowserDownload(blob, "Mapleins-Resume.pdf");
        // Save version + track count
        incrementFreeDownloadCount();
        const version: ResumeVersion = {
          id: crypto.randomUUID(),
          timestamp: Date.now(),
          jobType,
          city,
          theme: selectedTheme,
          name: (stored.name as string) || "Resume",
          resumeData: stored,
        };
        saveVersion(version);
        setVersionHistory(loadVersionHistory());
        setDownloadSuccess(true);
        // Show email capture if they haven't saved one yet
        if (!localStorage.getItem("mapleins_capture_email")) {
          setTimeout(() => setShowEmailCapture(true), 1200);
        }
        return;
      }

      // Fallback path: allow download after page refresh/new tab, when sessionStorage is empty.
      if (!resumeUrl) {
        setDownloadDataMissing(true);
        setDownloadError("Resume session expired. Please re-upload your resume from Dashboard.");
        return;
      }

      const query = new URLSearchParams({
        jobType: jobType || "Retail",
        city: city || "Toronto",
        resumeUrl,
        theme: selectedTheme,
      });
      const res = await fetchWithTimeout(`/api/resume/generate?${query.toString()}`);
      if (!res.ok) {
        let message = `Download failed (${res.status})`;
        try {
          const errData = (await res.json()) as { error?: string };
          if (errData?.error) message = errData.error;
        } catch {
          // keep default message
        }
        throw new Error(message);
      }
      const blob = await res.blob();
      triggerBrowserDownload(blob, "Mapleins-Resume.pdf");
      incrementFreeDownloadCount();
      setDownloadSuccess(true);
    } catch (err) {
      setDownloadDataMissing(true);
      if (err instanceof DOMException && err.name === "AbortError") {
        setDownloadError("Download timed out. Please try again.");
      } else {
        setDownloadError(err instanceof Error ? err.message : "Could not generate PDF.");
      }
    } finally {
      setIsDownloading(false);
    }
  };

  const editorHref = `/editor?jobType=${encodeURIComponent(jobType)}&city=${encodeURIComponent(city)}${resumeUrl ? `&resumeUrl=${encodeURIComponent(resumeUrl)}` : ""}${immigrationStatus ? `&immigrationStatus=${encodeURIComponent(immigrationStatus)}` : ""}`;

  const redownloadVersion = async (v: ResumeVersion) => {
    setRedownloading(v.id);
    const TIMEOUT = 45000;
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), TIMEOUT);
      const res = await fetch("/api/resume/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal: controller.signal,
        body: JSON.stringify({
          jobType: v.jobType,
          city: v.city,
          version: "ats",
          theme: v.theme,
          parsedData: v.resumeData,
        }),
      });
      clearTimeout(timer);
      if (!res.ok) throw new Error();
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `Mapleins-${v.jobType}-${v.theme}.pdf`;
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch { /* ignore */ }
    finally { setRedownloading(null); }
  };

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
                <div className="w-40 h-40 rounded-full border-8 border-gray-100 flex items-center justify-center">
                  <svg className="w-8 h-8 text-gray-300 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                  </svg>
                </div>
              ) : (
                <div className="flex flex-col items-center gap-2">
                  <CircularProgress score={atsScore} />
                  <div className={`text-xs font-bold px-3 py-1 rounded-full ${atsScore >= 72 ? "bg-green-100 text-green-700" : atsScore >= 50 ? "bg-amber-100 text-amber-700" : "bg-red-100 text-red-600"}`}>
                    {atsScore >= 72 ? "Above average — strong candidate" : atsScore >= 50 ? "Below average — use editor to improve" : "Low — most hired scores are 72+"}
                  </div>
                </div>
              )}
              <div className="flex-1 text-center md:text-left reveal-up stagger-1">
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-green-100 text-[#166534] text-xs font-bold mb-3">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#166534] animate-pulse inline-block" />
                  Analysis complete
                </div>
                <h1 className="text-3xl font-black text-gray-900 mb-3">Your ATS score is ready</h1>
                <p className="text-gray-500 mb-8 max-w-lg text-sm leading-relaxed">
                  Analysed for <strong className="text-gray-700">{jobType || "Canadian Employers"}</strong>. Download your optimized PDF below — tailored to beat Canadian ATS filters.
                </p>
                <div className="space-y-3">
                  <div className="space-y-1.5">
                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Choose Template</span>
                    <div className="grid grid-cols-4 gap-2">
                      {([
                        {
                          id: "federal", label: "Federal / Gov't",
                          preview: (
                            <svg viewBox="0 0 60 78" fill="none" xmlns="http://www.w3.org/2000/svg">
                              <rect width="60" height="78" fill="white"/>
                              <rect x="4" y="5" width="30" height="2.5" rx="0.5" fill="#1d4ed8"/>
                              <rect x="4" y="10" width="20" height="1.5" rx="0.5" fill="#6b7280"/>
                              <rect x="4" y="14" width="52" height="0.5" fill="#e5e7eb"/>
                              <rect x="4" y="18" width="22" height="2" rx="0.5" fill="#1d4ed8"/>
                              <rect x="4" y="21" width="52" height="0.5" fill="#1d4ed8"/>
                              <rect x="4" y="24" width="50" height="1.5" rx="0.5" fill="#9ca3af"/>
                              <rect x="4" y="27" width="46" height="1.5" rx="0.5" fill="#9ca3af"/>
                              <rect x="4" y="30" width="52" height="1.5" rx="0.5" fill="#9ca3af"/>
                              <rect x="4" y="35" width="26" height="2" rx="0.5" fill="#1d4ed8"/>
                              <rect x="4" y="38" width="52" height="0.5" fill="#1d4ed8"/>
                              <rect x="4" y="41" width="20" height="1.5" rx="0.5" fill="#374151"/>
                              <rect x="4" y="44" width="50" height="1.5" rx="0.5" fill="#9ca3af"/>
                              <rect x="4" y="47" width="44" height="1.5" rx="0.5" fill="#9ca3af"/>
                              <rect x="4" y="50" width="52" height="1.5" rx="0.5" fill="#9ca3af"/>
                              <rect x="4" y="53" width="40" height="1.5" rx="0.5" fill="#9ca3af"/>
                              <rect x="4" y="59" width="20" height="2" rx="0.5" fill="#1d4ed8"/>
                              <rect x="4" y="62" width="52" height="0.5" fill="#1d4ed8"/>
                              <rect x="4" y="66" width="14" height="3" rx="1.5" fill="#eff6ff" stroke="#bfdbfe" strokeWidth="0.5"/>
                              <rect x="20" y="66" width="12" height="3" rx="1.5" fill="#eff6ff" stroke="#bfdbfe" strokeWidth="0.5"/>
                              <rect x="34" y="66" width="14" height="3" rx="1.5" fill="#eff6ff" stroke="#bfdbfe" strokeWidth="0.5"/>
                            </svg>
                          ),
                        },
                        {
                          id: "bay-street", label: "Bay Street",
                          preview: (
                            <svg viewBox="0 0 60 78" fill="none" xmlns="http://www.w3.org/2000/svg">
                              <rect width="60" height="78" fill="white"/>
                              <rect width="20" height="78" fill="#0f2342"/>
                              <rect x="2" y="5" width="14" height="2.5" rx="0.5" fill="white"/>
                              <rect x="2" y="10" width="12" height="1.5" rx="0.5" fill="#93c5fd"/>
                              <rect x="2" y="16" width="8" height="1.5" rx="0.5" fill="#93c5fd"/>
                              <rect x="2" y="19" width="14" height="1.5" rx="0.5" fill="#e2e8f0"/>
                              <rect x="2" y="22" width="12" height="1.5" rx="0.5" fill="#e2e8f0"/>
                              <rect x="2" y="28" width="8" height="1.5" rx="0.5" fill="#93c5fd"/>
                              <rect x="2" y="31" width="14" height="1.5" rx="0.5" fill="#e2e8f0"/>
                              <rect x="2" y="34" width="10" height="1.5" rx="0.5" fill="#e2e8f0"/>
                              <rect x="2" y="37" width="12" height="1.5" rx="0.5" fill="#e2e8f0"/>
                              <rect x="2" y="43" width="8" height="1.5" rx="0.5" fill="#93c5fd"/>
                              <rect x="2" y="46" width="14" height="1.5" rx="0.5" fill="#e2e8f0"/>
                              <rect x="2" y="49" width="10" height="1.5" rx="0.5" fill="#e2e8f0"/>
                              <rect x="24" y="5" width="24" height="2" rx="0.5" fill="#1e3a5f"/>
                              <rect x="24" y="8" width="32" height="0.5" fill="#1e3a5f"/>
                              <rect x="24" y="11" width="32" height="1.5" rx="0.5" fill="#9ca3af"/>
                              <rect x="24" y="14" width="28" height="1.5" rx="0.5" fill="#9ca3af"/>
                              <rect x="24" y="22" width="28" height="2" rx="0.5" fill="#1e3a5f"/>
                              <rect x="24" y="25" width="32" height="0.5" fill="#1e3a5f"/>
                              <rect x="24" y="28" width="20" height="1.5" rx="0.5" fill="#374151"/>
                              <rect x="24" y="31" width="32" height="1.5" rx="0.5" fill="#9ca3af"/>
                              <rect x="24" y="34" width="28" height="1.5" rx="0.5" fill="#9ca3af"/>
                              <rect x="24" y="37" width="32" height="1.5" rx="0.5" fill="#9ca3af"/>
                              <rect x="24" y="43" width="18" height="1.5" rx="0.5" fill="#374151"/>
                              <rect x="24" y="46" width="32" height="1.5" rx="0.5" fill="#9ca3af"/>
                              <rect x="24" y="49" width="26" height="1.5" rx="0.5" fill="#9ca3af"/>
                              <rect x="24" y="52" width="30" height="1.5" rx="0.5" fill="#9ca3af"/>
                            </svg>
                          ),
                        },
                        {
                          id: "vancouver", label: "Vancouver Tech",
                          preview: (
                            <svg viewBox="0 0 60 78" fill="none" xmlns="http://www.w3.org/2000/svg">
                              <rect width="60" height="78" fill="white"/>
                              <rect x="4" y="5" width="30" height="2.5" rx="0.5" fill="#0f172a"/>
                              <rect x="4" y="9" width="22" height="1.5" rx="0.5" fill="#0891b2"/>
                              <rect x="4" y="13" width="52" height="0.5" fill="#e5e7eb"/>
                              <rect x="4" y="18" width="2.5" height="8" rx="1" fill="#0891b2"/>
                              <rect x="9" y="19" width="18" height="2" rx="0.5" fill="#0f172a"/>
                              <rect x="9" y="23" width="44" height="1.5" rx="0.5" fill="#9ca3af"/>
                              <rect x="9" y="26" width="40" height="1.5" rx="0.5" fill="#9ca3af"/>
                              <rect x="4" y="32" width="2.5" height="22" rx="1" fill="#0891b2"/>
                              <rect x="9" y="33" width="22" height="2" rx="0.5" fill="#0f172a"/>
                              <rect x="9" y="37" width="18" height="1.5" rx="0.5" fill="#0891b2"/>
                              <rect x="9" y="40" width="44" height="1.5" rx="0.5" fill="#9ca3af"/>
                              <rect x="9" y="43" width="40" height="1.5" rx="0.5" fill="#9ca3af"/>
                              <rect x="9" y="46" width="44" height="1.5" rx="0.5" fill="#9ca3af"/>
                              <rect x="9" y="49" width="38" height="1.5" rx="0.5" fill="#9ca3af"/>
                              <rect x="4" y="58" width="2.5" height="7" rx="1" fill="#0891b2"/>
                              <rect x="9" y="59" width="14" height="2" rx="0.5" fill="#0f172a"/>
                              <rect x="9" y="63" width="13" height="3" rx="1.5" fill="#ecfeff" stroke="#a5f3fc" strokeWidth="0.5"/>
                              <rect x="24" y="63" width="11" height="3" rx="1.5" fill="#ecfeff" stroke="#a5f3fc" strokeWidth="0.5"/>
                              <rect x="37" y="63" width="14" height="3" rx="1.5" fill="#ecfeff" stroke="#a5f3fc" strokeWidth="0.5"/>
                            </svg>
                          ),
                        },
                        {
                          id: "newcomer", label: "Newcomer Bold",
                          preview: (
                            <svg viewBox="0 0 60 78" fill="none" xmlns="http://www.w3.org/2000/svg">
                              <rect width="60" height="78" fill="white"/>
                              <rect width="60" height="22" fill="#166534"/>
                              <rect x="4" y="5" width="28" height="3" rx="0.5" fill="white"/>
                              <rect x="4" y="11" width="18" height="1.5" rx="0.5" fill="#bbf7d0"/>
                              <rect x="4" y="15" width="36" height="1.5" rx="0.5" fill="#d1fae5"/>
                              <rect x="0" y="25" width="60" height="7" fill="#f0fdf4"/>
                              <rect x="0" y="25" width="3" height="7" fill="#166534"/>
                              <rect x="6" y="27" width="22" height="2" rx="0.5" fill="#166534"/>
                              <rect x="4" y="35" width="50" height="1.5" rx="0.5" fill="#9ca3af"/>
                              <rect x="4" y="38" width="46" height="1.5" rx="0.5" fill="#9ca3af"/>
                              <rect x="0" y="43" width="60" height="7" fill="#f0fdf4"/>
                              <rect x="0" y="43" width="3" height="7" fill="#166534"/>
                              <rect x="6" y="45" width="28" height="2" rx="0.5" fill="#166534"/>
                              <rect x="4" y="53" width="18" height="1.5" rx="0.5" fill="#374151"/>
                              <rect x="4" y="56" width="50" height="1.5" rx="0.5" fill="#9ca3af"/>
                              <rect x="4" y="59" width="44" height="1.5" rx="0.5" fill="#9ca3af"/>
                              <rect x="4" y="65" width="13" height="3" rx="1.5" fill="#f0fdf4" stroke="#bbf7d0" strokeWidth="0.5"/>
                              <rect x="19" y="65" width="11" height="3" rx="1.5" fill="#f0fdf4" stroke="#bbf7d0" strokeWidth="0.5"/>
                              <rect x="32" y="65" width="14" height="3" rx="1.5" fill="#f0fdf4" stroke="#bbf7d0" strokeWidth="0.5"/>
                            </svg>
                          ),
                        },
                      ] as const).map((t) => (
                        <button
                          key={t.id}
                          type="button"
                          onClick={() => setSelectedTheme(t.id)}
                          className={`flex flex-col items-center gap-1 p-1.5 rounded-xl border-2 transition-all hover:shadow-md ${selectedTheme === t.id ? "border-[#166534] shadow-md bg-green-50" : "border-gray-200 hover:border-gray-400"}`}
                        >
                          <div className="w-full rounded overflow-hidden shadow-sm">{t.preview}</div>
                          <span className={`text-[9px] font-semibold text-center leading-tight pb-0.5 ${selectedTheme === t.id ? "text-[#166534]" : "text-gray-500"}`}>{t.label}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center justify-center md:justify-start gap-3">
                    {isDownloading ? (
                      <div className="flex items-center gap-3 px-8 py-4 rounded-2xl bg-green-50 border-2 border-[#166534]">
                        <svg className="w-5 h-5 text-[#166534] animate-spin" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                        </svg>
                        <span className="font-bold text-[#166534] text-sm">Building your resume…</span>
                      </div>
                    ) : (
                      <button
                        onClick={() => handleDownload()}
                        className="green-gradient text-white px-8 py-4 rounded-2xl font-bold shadow-xl hover:shadow-2xl hover:scale-[1.02] transition-all flex items-center gap-2.5"
                      >
                        Download Optimized PDF
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                        </svg>
                      </button>
                    )}
                    <Link href={editorHref}>
                      <Button variant="outline" className="px-6 py-4 h-auto border-2 border-gray-200 text-gray-700 font-bold rounded-2xl hover:border-[#166534] hover:text-[#166534] hover:bg-green-50 transition-all">
                        AI Live Editor
                      </Button>
                    </Link>
                  </div>
                </div>
                {(downloadDataMissing || downloadError) && (
                  <div className="mt-4 rounded-xl bg-red-50 border border-red-100 text-red-700 px-4 py-3 text-xs font-bold">
                    {downloadError || "Could not download PDF. Please retry from Dashboard."}
                  </div>
                )}

                {/* Post-download success banner */}
                {downloadSuccess && (
                  <div className="mt-4 rounded-2xl bg-green-50 border border-green-200 px-5 py-4 flex items-start gap-3 animate-in fade-in slide-in-from-bottom-4 duration-300">
                    <div className="w-7 h-7 green-gradient rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                      <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" /></svg>
                    </div>
                    <div className="flex-1">
                      <p className="font-bold text-[#166534] text-sm">Resume downloaded! Check your Downloads folder.</p>
                      <p className="text-xs text-gray-500 mt-0.5">Targeting a different role? Change your target below without re-uploading.</p>
                      <button
                        type="button"
                        onClick={() => setShowRetarget((v) => !v)}
                        className="mt-2 text-xs font-bold text-[#166534] hover:underline"
                      >
                        {showRetarget ? "Hide ▲" : "Change target role / city ▼"}
                      </button>
                      {showRetarget && (
                        <div className="mt-3 flex flex-wrap gap-2">
                          <input
                            value={retargetRole}
                            onChange={(e) => setRetargetRole(e.target.value)}
                            placeholder="New target role…"
                            className="flex-1 min-w-[140px] rounded-xl border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#166534]"
                          />
                          <input
                            value={retargetCity}
                            onChange={(e) => setRetargetCity(e.target.value)}
                            placeholder="City…"
                            className="w-32 rounded-xl border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#166534]"
                          />
                          <button
                            type="button"
                            onClick={() => {
                              if (retargetRole.trim() && retargetCity.trim()) {
                                const rawData = (sessionStorage.getItem("mapleinsResumeAnalysis") ?? localStorage.getItem("mapleinsResumeAnalysis"));
                                if (rawData) {
                                  try {
                                    const data = JSON.parse(rawData);
                                    data.targetRole = retargetRole.trim();
                                    data.city = retargetCity.trim();
                                    sessionStorage.setItem("mapleinsResumeAnalysis", JSON.stringify(data));
                                    try { localStorage.setItem("mapleinsResumeAnalysis", JSON.stringify(data)); } catch { /* ignore */ }
                                  } catch { /* ignore */ }
                                }
                                window.location.href = `/resume-results?jobType=${encodeURIComponent(retargetRole.trim())}&city=${encodeURIComponent(retargetCity.trim())}`;
                              }
                            }}
                            className="green-gradient text-white px-4 py-2 rounded-xl text-sm font-bold shadow-sm hover:opacity-90 transition-all"
                          >
                            Re-optimise →
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Social proof strip */}
                <div className="mt-4 flex flex-wrap gap-3">
                  {[
                    { icon: "🇨🇦", text: "Built for Canada" },
                    { icon: "✓", text: "ATS-optimised" },
                    { icon: "⚡", text: "AI-rewritten bullets" },
                  ].map((b) => (
                    <span key={b.text} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-gray-50 border border-gray-200 text-xs font-semibold text-gray-500">
                      <span>{b.icon}</span>{b.text}
                    </span>
                  ))}
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

            {/* JD Match */}
            {jdKeywords.length > 0 && (
              <div className="glass-card p-8 bg-white reveal-up stagger-3">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                    <span className="text-blue-500">🎯</span> Job Description Match
                  </h3>
                  <span className={`text-2xl font-black ${jdMatched.length / jdKeywords.length >= 0.7 ? "text-green-600" : jdMatched.length / jdKeywords.length >= 0.4 ? "text-amber-500" : "text-red-500"}`}>
                    {Math.round((jdMatched.length / jdKeywords.length) * 100)}%
                  </span>
                </div>
                <div className="w-full bg-gray-100 rounded-full h-2 mb-6">
                  <div
                    className="h-2 rounded-full transition-all duration-1000"
                    style={{
                      width: `${Math.round((jdMatched.length / jdKeywords.length) * 100)}%`,
                      backgroundColor: jdMatched.length / jdKeywords.length >= 0.7 ? "#166534" : jdMatched.length / jdKeywords.length >= 0.4 ? "#f59e0b" : "#ef4444",
                    }}
                  />
                </div>
                {jdMatched.length > 0 && (
                  <div className="mb-4">
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">Matched keywords</p>
                    <div className="flex flex-wrap gap-1.5">
                      {jdMatched.map((k) => (
                        <span key={k} className="px-2.5 py-1 rounded-lg bg-green-50 border border-green-200 text-green-700 text-xs font-semibold">✓ {k}</span>
                      ))}
                    </div>
                  </div>
                )}
                {jdMissing.length > 0 && (
                  <div>
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">Missing from resume</p>
                    <div className="flex flex-wrap gap-1.5">
                      {jdMissing.map((k) => (
                        <span key={k} className="px-2.5 py-1 rounded-lg bg-red-50 border border-red-100 text-red-600 text-xs font-semibold">✗ {k}</span>
                      ))}
                    </div>
                    <p className="mt-3 text-xs text-gray-500 italic">Add these to your resume in the Live Editor to boost your match score.</p>
                  </div>
                )}
              </div>
            )}

            {/* AI Recommendation Summary */}
            {jobsData?.summary && (
              <div className="glass-card p-8 green-gradient text-white border-none reveal-up stagger-4">
                <h3 className="text-xl font-bold mb-4">AI Profile Summary</h3>
                <p className="text-green-50 leading-relaxed font-medium">
                  {jobsData.summary}
                </p>
              </div>
            )}

            {/* Interview Prep */}
            <div className="glass-card p-8 bg-white border-[#166534]/10 reveal-up stagger-4">
              <h3 className="text-xl font-bold text-gray-900 mb-6 flex items-center gap-2">
                <span>🎯</span> Interview Prep
              </h3>

              {interviewLoading ? (
                <div className="space-y-4">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="animate-pulse space-y-2">
                      <div className="h-4 w-3/4 bg-gray-200 rounded-full" />
                      <div className="h-3 w-full bg-gray-100 rounded-full" />
                    </div>
                  ))}
                </div>
              ) : interviewPrep && interviewPrep.questions.length > 0 ? (
                <>
                  <div className="space-y-3 mb-6">
                    {interviewPrep.questions.map((item, idx) => (
                      <div key={idx} className="border border-gray-100 rounded-xl overflow-hidden">
                        <button
                          type="button"
                          onClick={() => setOpenQuestion(openQuestion === idx ? null : idx)}
                          className="w-full flex items-center justify-between px-5 py-4 text-left hover:bg-gray-50 transition-colors"
                        >
                          <span className="font-semibold text-gray-800 text-sm pr-4">{item.question}</span>
                          <span className={`text-gray-400 flex-shrink-0 transition-transform ${openQuestion === idx ? "rotate-180" : ""}`}>▾</span>
                        </button>
                        {openQuestion === idx && (
                          <div className="px-5 pb-4">
                            <p className="text-sm text-[#166534] bg-green-50 rounded-lg px-4 py-3 font-medium">{item.tip}</p>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>

                  {interviewPrep.generalTips.length > 0 && (
                    <div>
                      <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">General Tips for {jobType} Roles</p>
                      <ul className="space-y-2">
                        {interviewPrep.generalTips.map((tip, idx) => (
                          <li key={idx} className="flex items-start gap-2 text-sm text-gray-600">
                            <span className="text-[#166534] mt-0.5 flex-shrink-0">✓</span>
                            {tip}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </>
              ) : (
                <p className="text-sm text-gray-400 italic">No interview questions available. Try refreshing.</p>
              )}
            </div>

            {/* Interview Checklist */}
            {(() => {
              const CHECKLIST = [
                { id: "research", label: "Research the company and the role", category: "Before" },
                { id: "questions", label: "Prepare 3–5 questions to ask the interviewer", category: "Before" },
                { id: "resume_copies", label: "Print 2–3 copies of your resume", category: "Before" },
                { id: "address", label: "Confirm the interview location and transit route", category: "Before" },
                { id: "charge_phone", label: "Charge your phone and set an alarm", category: "Before" },
                { id: "arrive_early", label: "Arrive 10–15 minutes early", category: "Day of" },
                { id: "bring_id", label: "Bring government-issued ID", category: "Day of" },
                { id: "attire", label: "Dress appropriately for the role and company culture", category: "Day of" },
                { id: "sin", label: "Bring your SIN card if applying for a first job", category: "Day of" },
                { id: "thank_you", label: "Send a thank-you email within 24 hours", category: "After" },
                { id: "follow_up", label: "Follow up if you haven't heard back in one week", category: "After" },
              ];
              const categories = ["Before", "Day of", "After"];
              const completed = CHECKLIST.filter((c) => checklistItems[c.id]).length;
              const pct = Math.round((completed / CHECKLIST.length) * 100);

              const toggleItem = (id: string) => {
                const updated = { ...checklistItems, [id]: !checklistItems[id] };
                setChecklistItems(updated);
                try { localStorage.setItem("mapleins_checklist", JSON.stringify(updated)); } catch { /* ignore */ }
              };

              return (
                <div className="glass-card p-8 bg-white border-[#166534]/10 reveal-up stagger-4">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                      <span>✅</span> Interview Checklist
                    </h3>
                    <span className="text-sm font-bold text-[#166534]">{completed}/{CHECKLIST.length}</span>
                  </div>
                  <div className="w-full bg-gray-100 rounded-full h-2 mb-6">
                    <div
                      className="bg-[#166534] h-2 rounded-full transition-all duration-500"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  {categories.map((cat) => (
                    <div key={cat} className="mb-5">
                      <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">{cat} the Interview</p>
                      <ul className="space-y-2">
                        {CHECKLIST.filter((c) => c.category === cat).map((item) => (
                          <li key={item.id}>
                            <label className="flex items-center gap-3 cursor-pointer group">
                              <input
                                type="checkbox"
                                checked={!!checklistItems[item.id]}
                                onChange={() => toggleItem(item.id)}
                                className="w-4 h-4 accent-[#166534] rounded"
                              />
                              <span className={`text-sm transition-colors ${checklistItems[item.id] ? "line-through text-gray-400" : "text-gray-700 group-hover:text-gray-900"}`}>
                                {item.label}
                              </span>
                            </label>
                          </li>
                        ))}
                      </ul>
                    </div>
                  ))}
                </div>
              );
            })()}
            {/* Version History */}
            {versionHistory.length > 0 && (
              <div className="glass-card p-8 bg-white reveal-up stagger-4">
                <button
                  type="button"
                  onClick={() => setShowHistory((v) => !v)}
                  className="w-full flex items-center justify-between"
                >
                  <h3 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                    <span>🗂</span> Resume History
                    <span className="ml-1 text-xs font-bold bg-gray-100 text-gray-500 rounded-full px-2 py-0.5">{versionHistory.length}</span>
                  </h3>
                  <span className={`text-gray-400 transition-transform ${showHistory ? "rotate-180" : ""}`}>▾</span>
                </button>
                {showHistory && (
                  <div className="mt-5 space-y-3">
                    {versionHistory.map((v) => {
                      const date = new Date(v.timestamp);
                      const label = date.toLocaleDateString("en-CA", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
                      const themeLabels: Record<string, string> = { federal: "Federal", "bay-street": "Bay Street", vancouver: "Vancouver", newcomer: "Newcomer Bold" };
                      return (
                        <div key={v.id} className="flex items-center justify-between p-3 rounded-xl border border-gray-100 hover:bg-gray-50 transition-colors">
                          <div>
                            <p className="text-sm font-bold text-gray-800">{v.jobType} · {v.city}</p>
                            <p className="text-xs text-gray-400">{label} · {themeLabels[v.theme] ?? v.theme}</p>
                          </div>
                          <button
                            type="button"
                            onClick={() => redownloadVersion(v)}
                            disabled={redownloading === v.id}
                            className="text-xs font-bold text-[#166534] hover:underline disabled:opacity-50 flex items-center gap-1"
                          >
                            {redownloading === v.id ? "…" : "⬇ Re-download"}
                          </button>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
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
            onClick={() => handleDownload()}
            className="green-gradient text-white p-5 rounded-2xl shadow-2xl hover:scale-110 active:scale-95 transition-all flex items-center gap-3 font-bold"
          >
            <span className="text-2xl">⬇</span>
            <span>Download PDF</span>
          </button>
        </div>
      )}

      {/* ── Paywall Modal ── */}
      {showPaywall && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm px-4">
          <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="green-gradient px-8 pt-8 pb-6 text-center">
              <div className="text-4xl mb-3">🍁</div>
              <h2 className="text-2xl font-black text-white mb-1">You&apos;ve used {FREE_DOWNLOAD_LIMIT} free resumes</h2>
              <p className="text-green-100 text-sm">Your resume history is saved — download any version anytime.</p>
            </div>
            <div className="px-8 py-6">
              <div className="grid grid-cols-3 gap-3 mb-6 text-center">
                {[
                  { icon: "🎯", label: "ATS optimised" },
                  { icon: "📄", label: "4 templates" },
                  { icon: "💼", label: "Job matches" },
                ].map((f) => (
                  <div key={f.label} className="rounded-xl bg-green-50 p-3">
                    <div className="text-xl mb-1">{f.icon}</div>
                    <p className="text-[10px] font-bold text-[#166534]">{f.label}</p>
                  </div>
                ))}
              </div>
              <div className="space-y-3">
                <Link
                  href="/donate"
                  className="block w-full green-gradient text-white py-4 rounded-2xl font-bold shadow-lg hover:shadow-xl hover:scale-[1.02] transition-all text-center"
                >
                  ❤️ Support Mapleins — keep it free
                </Link>
                <button
                  type="button"
                  onClick={() => handleDownload(true)}
                  className="w-full py-3 rounded-2xl border-2 border-gray-100 text-gray-500 font-semibold hover:bg-gray-50 transition-colors text-sm"
                >
                  Continue for free →
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Email Capture Modal ── */}
      {showEmailCapture && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 backdrop-blur-sm px-4 pb-4 sm:pb-0">
          <div className="bg-white rounded-3xl shadow-2xl max-w-sm w-full p-7 animate-in fade-in slide-in-from-bottom-8 sm:zoom-in-95 duration-300">
            <button
              type="button"
              onClick={() => setShowEmailCapture(false)}
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 text-lg font-bold"
            >
              ×
            </button>
            {emailSaved ? (
              <div className="text-center py-4">
                <div className="w-12 h-12 green-gradient rounded-full flex items-center justify-center mx-auto mb-3">
                  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" /></svg>
                </div>
                <p className="font-bold text-gray-900">You&apos;re in!</p>
                <p className="text-sm text-gray-500 mt-1">We&apos;ll send updates when new templates and features drop.</p>
              </div>
            ) : (
              <>
                <div className="text-3xl mb-3">📬</div>
                <h3 className="text-lg font-black text-gray-900 mb-1">Get notified when we add new features</h3>
                <p className="text-sm text-gray-500 mb-4 leading-relaxed">
                  Cover letters, interview prep, French templates — all coming soon. We&apos;ll email you first.
                </p>
                <div className="flex gap-2">
                  <input
                    type="email"
                    value={captureEmail}
                    onChange={(e) => setCaptureEmail(e.target.value)}
                    placeholder="your@email.com"
                    className="flex-1 rounded-xl border border-gray-200 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#166534]"
                    onKeyDown={async (e) => {
                      if (e.key === "Enter" && captureEmail.includes("@")) {
                        try { localStorage.setItem("mapleins_capture_email", captureEmail); } catch { /* ignore */ }
                        await fetch("/api/email-capture", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email: captureEmail }) });
                        setEmailSaved(true);
                      }
                    }}
                  />
                  <button
                    type="button"
                    disabled={!captureEmail.includes("@")}
                    onClick={async () => {
                      try { localStorage.setItem("mapleins_capture_email", captureEmail); } catch { /* ignore */ }
                      await fetch("/api/email-capture", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email: captureEmail }) });
                      setEmailSaved(true);
                    }}
                    className="green-gradient text-white px-4 py-2.5 rounded-xl font-bold text-sm shadow-sm hover:opacity-90 transition-all disabled:opacity-40"
                  >
                    Notify me
                  </button>
                </div>
                <button
                  type="button"
                  onClick={() => setShowEmailCapture(false)}
                  className="w-full mt-3 text-xs text-gray-400 hover:text-gray-600"
                >
                  No thanks
                </button>
              </>
            )}
          </div>
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
