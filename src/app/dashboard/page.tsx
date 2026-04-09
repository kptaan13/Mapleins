"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { IMMIGRATION_STATUSES } from "@/lib/constants";

type ExperienceEntry = { role: string; company: string; dates?: string; bullets: string[] };

type AnalysisResult = {
  name: string;
  email: string;
  phone: string;
  summary: string;
  experience: string[];
  experienceByRole?: ExperienceEntry[];
  skills: string[];
  education?: string[];
  certifications?: string[];
  suggestedSectors: string[];
  targetJobTitles: string[];
  whyTheseJobs: string;
  yearsOfExperience?: number;
  targetRole?: string;
  city?: string;
  jobDescription?: string;
};

const STORAGE_KEY = "mapleinsResumeAnalysis";

// ── localStorage helpers (cache / offline fallback) ──
function loadLocal(): AnalysisResult | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY) ?? sessionStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as AnalysisResult) : null;
  } catch { return null; }
}
function saveLocal(data: AnalysisResult) {
  const raw = JSON.stringify(data);
  try { localStorage.setItem(STORAGE_KEY, raw); } catch { /* ignore */ }
  try { sessionStorage.setItem(STORAGE_KEY, raw); } catch { /* ignore */ }
}
function clearLocal() {
  try { localStorage.removeItem(STORAGE_KEY); } catch { /* ignore */ }
  try { sessionStorage.removeItem(STORAGE_KEY); } catch { /* ignore */ }
}

export default function DashboardPage() {
  const router = useRouter();

  // "home" = show saved-resume panel (if any) + upload option
  // "upload" = upload new resume flow
  // "form"   = target-role / city form
  const [view, setView] = useState<"home" | "upload" | "form">("home");

  const [saved, setSaved] = useState<AnalysisResult | null>(null);
  const [resumeFile, setResumeFile] = useState<File | null>(null);
  const [resumeUrl, setResumeUrl] = useState("");
  const [analysis, setAnalysis] = useState<AnalysisResult | null>(null);

  const [targetRole, setTargetRole] = useState("");
  const [city, setCity] = useState("");
  const [immigrationStatus, setImmigrationStatus] = useState("");
  const [jobDescription, setJobDescription] = useState("");
  const [showJDInput, setShowJDInput] = useState(false);

  const [loading, setLoading] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [storageFailed, setStorageFailed] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // ── Load saved resume on mount (Supabase first, localStorage fallback) ──
  useEffect(() => {
    async function load() {
      // 1. Show localStorage instantly (no flicker)
      const local = loadLocal();
      if (local) {
        setSaved(local);
        if (local.targetRole) setTargetRole(local.targetRole);
        if (local.city) setCity(local.city);
      }
      // 2. Fetch from Supabase (cross-device, more reliable)
      try {
        const supabase = createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;
        const { data } = await supabase
          .from("resumes")
          .select("analysis")
          .eq("user_id", user.id)
          .single();
        if (data?.analysis) {
          const r = data.analysis as AnalysisResult;
          setSaved(r);
          saveLocal(r); // keep local cache in sync
          if (r.targetRole) setTargetRole(r.targetRole);
          if (r.city) setCity(r.city);
        }
      } catch { /* fall back to localStorage silently */ }
    }
    load();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── File handling ──
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const isPdf =
        file.type === "application/pdf" ||
        (file.name && file.name.toLowerCase().endsWith(".pdf"));
      if (!isPdf) {
        setError("Please upload a PDF file.");
        setResumeFile(null);
        if (fileInputRef.current) fileInputRef.current.value = "";
        return;
      }
      if (file.size > 10 * 1024 * 1024) {
        setError("PDF must be 10MB or smaller.");
        setResumeFile(null);
        if (fileInputRef.current) fileInputRef.current.value = "";
        return;
      }
      setResumeFile(file);
      setError(null);
    }
  };

  // ── Upload + analyze ──
  const handleUploadAndAnalyze = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resumeFile) { setError("Please upload your resume first."); return; }
    setLoading(true);
    setError(null);
    setStorageFailed(false);
    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setError("Please sign in to continue."); return; }

      let url = "";
      const fileExt = resumeFile.name.split(".").pop();
      const fileName = `${user.id}/${Date.now()}.${fileExt}`;
      const { error: uploadError } = await supabase.storage
        .from("resumes")
        .upload(fileName, resumeFile, { cacheControl: "3600", upsert: false });

      if (uploadError) {
        console.warn("Storage upload failed, analyzing file only:", uploadError.message);
        setStorageFailed(true);
      } else {
        const { data: urlData } = supabase.storage.from("resumes").getPublicUrl(fileName);
        url = urlData.publicUrl;
        setResumeUrl(url);
      }

      setAnalyzing(true);
      const formData = new FormData();
      formData.append("file", resumeFile);
      if (url) formData.append("resumeUrl", url);

      const res = await fetch("/api/resume/analyze", { method: "POST", body: formData });
      let data: AnalysisResult & { error?: string };
      try { data = await res.json(); } catch {
        setError("Server returned invalid response. Try again."); return;
      }
      if (!res.ok) { setError(data?.error || `Analysis failed (${res.status})`); return; }

      setAnalysis(data);
      if (!targetRole && data.targetJobTitles?.length) setTargetRole(data.targetJobTitles[0]);

      // Save to Supabase + localStorage
      saveLocal(data);
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          await supabase.from("resumes").upsert(
            { user_id: user.id, analysis: data, updated_at: new Date().toISOString() },
            { onConflict: "user_id" }
          );
        }
      } catch { /* non-fatal — local cache is enough */ }

      setView("form");
      setError(null);
      setResumeFile(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong. Try again.");
    } finally {
      setAnalyzing(false);
      setLoading(false);
    }
  };

  // ── Submit (go to results) ──
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetRole.trim() || !city.trim() || !immigrationStatus) {
      setError("Please fill in all fields."); return;
    }
    const activeAnalysis = analysis ?? saved;
    if (activeAnalysis) {
      const updated = {
        ...activeAnalysis,
        targetRole: targetRole.trim(),
        city: city.trim(),
        jobDescription: jobDescription.trim(),
      };
      saveLocal(updated);
      // Persist updated preferences to Supabase in the background
      (async () => {
        try {
          const supabase = createClient();
          const { data: { user } } = await supabase.auth.getUser();
          if (user) {
            await supabase.from("resumes").upsert(
              { user_id: user.id, analysis: updated, updated_at: new Date().toISOString() },
              { onConflict: "user_id" }
            );
          }
        } catch { /* non-fatal */ }
      })();
    }
    const params = new URLSearchParams({
      jobType: targetRole.trim(),
      city: city.trim(),
      immigrationStatus,
      ...(resumeUrl && { resumeUrl }),
    });
    router.push(`/resume-results?${params.toString()}`);
  };

  // ── Shared header ──
  const Header = () => (
    <header className="glass-morphism sticky top-0 z-50">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
        <Link href="/dashboard" className="flex items-center gap-2">
          <div className="w-8 h-8 green-gradient rounded-lg flex items-center justify-center text-white font-bold text-xs shadow-md">M</div>
          <span className="text-xl font-bold text-gray-900">Mapleins</span>
        </Link>
        <button
          onClick={async () => {
            const supabase = createClient();
            await supabase.auth.signOut();
            router.push("/");
            router.refresh();
          }}
          className="text-sm font-semibold text-gray-500 hover:text-[#166534] transition-colors px-3 py-1.5 rounded-lg hover:bg-green-50"
        >
          Sign out
        </button>
      </div>
    </header>
  );

  // ── VIEW: Home (saved resume panel) ──
  if (view === "home") {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#f0fdf4] via-white to-[#f0f9ff]">
        <Header />
        <main className="max-w-xl mx-auto px-4 py-10 space-y-6 reveal-up">
          <div>
            <h1 className="text-3xl font-black text-gray-900 leading-tight">
              {saved ? "Welcome back 👋" : "Let's build your"}<br />
              <span className="text-gradient">{saved ? "Your resume is ready" : "Canadian resume"}</span>
            </h1>
            <p className="mt-3 text-gray-500 text-sm leading-relaxed">
              {saved
                ? "Pick up where you left off — no upload needed. Or start fresh with a new resume."
                : "AI scans for ATS gaps, weak bullet points, and missing Canadian keywords — then rebuilds your resume."}
            </p>
          </div>

          {/* ── Saved resume card ── */}
          {saved && (
            <div className="rounded-2xl border border-green-200 bg-white shadow-sm overflow-hidden">
              {/* Card header */}
              <div className="green-gradient px-5 py-4 flex items-center justify-between">
                <div>
                  <p className="font-black text-white text-sm">
                    📄 {saved.name && saved.name !== "Your Name" ? saved.name : "Your Resume"}
                  </p>
                  <p className="text-green-100 text-xs mt-0.5">
                    {saved.email && <span className="mr-3">{saved.email}</span>}
                    {saved.yearsOfExperience ? `${saved.yearsOfExperience}y experience` : ""}
                  </p>
                </div>
                <button
                  onClick={async () => {
                  clearLocal();
                  setSaved(null);
                  setTargetRole("");
                  setCity("");
                  try {
                    const supabase = createClient();
                    const { data: { user } } = await supabase.auth.getUser();
                    if (user) await supabase.from("resumes").delete().eq("user_id", user.id);
                  } catch { /* non-fatal */ }
                }}
                  className="text-green-200 hover:text-white text-xs font-semibold transition-colors"
                  title="Clear saved resume"
                >
                  Clear ✕
                </button>
              </div>

              {/* Roles preview */}
              {(saved.experienceByRole ?? []).length > 0 && (
                <div className="px-5 pt-4 pb-2">
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">Work experience</p>
                  <div className="space-y-1.5">
                    {(saved.experienceByRole ?? []).slice(0, 3).map((r, i) => (
                      <div key={i} className="flex items-start gap-2">
                        <span className="mt-1 w-1.5 h-1.5 rounded-full bg-green-400 flex-shrink-0" />
                        <p className="text-xs text-gray-700 leading-snug">
                          <span className="font-semibold">{r.role}</span>
                          {r.company && <span className="text-gray-400"> · {r.company}</span>}
                          {r.dates && <span className="text-gray-400"> · {r.dates}</span>}
                        </p>
                      </div>
                    ))}
                    {(saved.experienceByRole ?? []).length > 3 && (
                      <p className="text-[11px] text-gray-400 pl-3.5">+{(saved.experienceByRole ?? []).length - 3} more roles</p>
                    )}
                  </div>
                </div>
              )}

              {/* Skills preview */}
              {saved.skills?.filter(Boolean).length > 0 && (
                <div className="px-5 pt-3 pb-4">
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">Skills</p>
                  <div className="flex flex-wrap gap-1.5">
                    {saved.skills.filter(Boolean).slice(0, 6).map((s) => (
                      <span key={s} className="text-[11px] px-2.5 py-1 rounded-full bg-green-50 border border-green-200 text-[#166534] font-semibold">{s}</span>
                    ))}
                    {saved.skills.filter(Boolean).length > 6 && (
                      <span className="text-[11px] px-2.5 py-1 rounded-full bg-gray-50 border border-gray-200 text-gray-400 font-semibold">+{saved.skills.filter(Boolean).length - 6}</span>
                    )}
                  </div>
                </div>
              )}

              {/* Actions */}
              <div className="border-t border-gray-100 px-5 py-4 flex gap-3">
                <Button
                  onClick={() => {
                    setAnalysis(saved);
                    if (saved.targetRole) setTargetRole(saved.targetRole);
                    if (saved.city) setCity(saved.city);
                    setView("form");
                  }}
                  className="flex-1 green-gradient text-white font-bold rounded-xl py-5 text-sm shadow hover:opacity-90 transition-all"
                >
                  Continue with this resume →
                </Button>
                <Button
                  variant="outline"
                  onClick={() => {
                    // Go straight to editor with saved data
                    router.push("/editor");
                  }}
                  className="border-gray-200 text-gray-600 hover:bg-gray-50 font-semibold rounded-xl px-4 text-sm"
                >
                  ✏️ Edit
                </Button>
              </div>
            </div>
          )}

          {/* ── Upload new resume ── */}
          <div className={`rounded-2xl border ${saved ? "border-gray-200 bg-white/70" : "border-green-200 bg-white shadow-sm"} overflow-hidden`}>
            <button
              type="button"
              onClick={() => setView("upload")}
              className="w-full flex items-center gap-4 px-5 py-5 hover:bg-green-50/50 transition-colors text-left"
            >
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${saved ? "bg-gray-100" : "green-gradient shadow-md"}`}>
                <svg className={`w-5 h-5 ${saved ? "text-gray-400" : "text-white"}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                </svg>
              </div>
              <div className="flex-1 min-w-0">
                <p className={`font-bold text-sm ${saved ? "text-gray-600" : "text-gray-900"}`}>
                  {saved ? "Upload a different resume" : "Upload your resume"}
                </p>
                <p className="text-xs text-gray-400 mt-0.5">PDF · AI reads it in ~30 seconds</p>
              </div>
              <svg className="w-4 h-4 text-gray-300 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </div>

          {/* Build from scratch */}
          <button
            type="button"
            onClick={() => router.push("/editor")}
            className="w-full text-center text-xs text-[#166534] font-semibold hover:underline"
          >
            I don&apos;t have a resume yet — build from scratch →
          </button>
        </main>
      </div>
    );
  }

  // ── VIEW: Upload new resume ──
  if (view === "upload") {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#f0fdf4] via-white to-[#f0f9ff]">
        <Header />
        <main className="max-w-xl mx-auto px-4 py-10 reveal-up">
          {/* Step indicator */}
          <div className="flex items-center gap-2 mb-8">
            <div className="flex items-center justify-center w-7 h-7 rounded-full text-xs font-bold green-gradient text-white shadow-md">1</div>
            <div className="h-0.5 flex-1 rounded bg-gray-200" />
            <div className="flex items-center justify-center w-7 h-7 rounded-full text-xs font-bold bg-gray-100 text-gray-400">2</div>
          </div>

          <h1 className="text-3xl font-black text-gray-900 leading-tight">
            Upload your<br />
            <span className="text-gradient">resume</span>
          </h1>
          <p className="mt-3 text-gray-500 leading-relaxed text-sm">
            AI scans for ATS gaps, weak bullet points, and missing Canadian keywords — then rebuilds your resume.
          </p>

          <div className="mt-5 flex flex-wrap gap-2">
            {[{ icon: "⚡", text: "Under 60 seconds" }, { icon: "🔒", text: "Never shared" }, { icon: "🍁", text: "Canadian ATS" }].map((b) => (
              <span key={b.text} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white border border-gray-200 shadow-sm text-xs font-semibold text-gray-600">
                <span>{b.icon}</span>{b.text}
              </span>
            ))}
          </div>

          <form onSubmit={handleUploadAndAnalyze} className="mt-7 space-y-5">
            <label className={`group relative flex flex-col items-center justify-center w-full h-48 border-2 border-dashed rounded-2xl cursor-pointer transition-all duration-200 ${resumeFile ? "border-[#166534] bg-green-50 shadow-sm soft-glow" : "border-gray-200 bg-white hover:border-[#166534] hover:bg-green-50"}`}>
              <div className="flex flex-col items-center gap-3">
                {resumeFile ? (
                  <>
                    <div className="w-12 h-12 green-gradient rounded-xl flex items-center justify-center shadow-md">
                      <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                    <div className="text-center">
                      <p className="text-sm font-bold text-[#166534]">{resumeFile.name}</p>
                      <p className="text-xs text-gray-400 mt-0.5">Ready to analyse</p>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="w-12 h-12 bg-gray-100 group-hover:bg-green-100 rounded-xl flex items-center justify-center transition-colors">
                      <svg className="w-6 h-6 text-gray-400 group-hover:text-[#166534] transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                      </svg>
                    </div>
                    <div className="text-center">
                      <p className="text-sm font-semibold text-gray-700">Drop your PDF here, or <span className="text-[#166534]">browse</span></p>
                      <p className="text-xs text-gray-400 mt-0.5">PDF only · Max 10 MB</p>
                    </div>
                  </>
                )}
              </div>
              <input ref={fileInputRef} type="file" className="hidden" accept=".pdf" onChange={handleFileChange} />
            </label>

            {error && (
              <div className="flex items-center gap-2 rounded-xl bg-red-50 border border-red-100 text-red-700 px-4 py-3 text-sm font-medium">
                <span className="text-base">⚠</span> {error}
              </div>
            )}

            {loading ? (
              <div className="w-full rounded-2xl border border-green-200 bg-green-50 px-6 py-5">
                <div className="space-y-3">
                  {[
                    { label: analyzing ? "Uploading resume…" : "Uploading resume", done: analyzing },
                    { label: analyzing ? "AI reading your resume…" : "AI reading your resume", active: analyzing },
                  ].map((s, i) => (
                    <div key={i} className="flex items-center gap-3">
                      <div className={`w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 ${s.done ? "green-gradient" : s.active ? "border-2 border-[#166534] animate-spin" : "bg-gray-100"}`}>
                        {s.done && <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>}
                      </div>
                      <span className={`text-sm font-medium ${s.done ? "text-[#166534]" : s.active ? "text-gray-900" : "text-gray-400"}`}>{s.label}</span>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                <Button
                  type="submit"
                  disabled={!resumeFile}
                  className="w-full green-gradient hover:opacity-90 text-white py-6 text-base font-bold rounded-2xl shadow-lg hover:shadow-xl transition-all disabled:opacity-40"
                >
                  Analyse My Resume →
                </Button>
                <button
                  type="button"
                  onClick={() => setView("home")}
                  className="w-full text-center text-xs text-gray-400 font-semibold hover:text-gray-600 transition-colors"
                >
                  ← Back
                </button>
              </div>
            )}
          </form>
        </main>
      </div>
    );
  }

  // ── VIEW: Form (target role / city) ──
  const activeAnalysis = analysis ?? saved;
  return (
    <div className="min-h-screen bg-gradient-to-br from-[#f0fdf4] via-white to-[#f0f9ff]">
      <Header />
      <main className="max-w-xl mx-auto px-4 py-10 reveal-up">
        {/* Step indicator */}
        <div className="flex items-center gap-2 mb-8">
          <div className="flex items-center justify-center w-7 h-7 rounded-full text-xs font-bold bg-green-100 text-[#166534]">1</div>
          <div className="h-0.5 flex-1 rounded bg-[#166534]" />
          <div className="flex items-center justify-center w-7 h-7 rounded-full text-xs font-bold green-gradient text-white shadow-md">2</div>
        </div>

        <h1 className="text-3xl font-black text-gray-900 leading-tight">
          Almost there —<br />
          <span className="text-gradient">target your role</span>
        </h1>
        <p className="mt-3 text-gray-500 leading-relaxed text-sm">
          We&apos;ll rebuild your resume around that exact role and city, inject the right ATS keywords, and surface 12–15 best-matched Canadian jobs.
        </p>

        {storageFailed && (
          <div className="mt-5 flex items-start gap-3 p-4 bg-amber-50 rounded-2xl border border-amber-200 text-amber-800 text-sm">
            <span className="text-lg mt-0.5">⚠</span>
            <span>Resume analyzed but we couldn&apos;t save a copy. You can still download your tailored PDF this session.</span>
          </div>
        )}

        {activeAnalysis && (
          <div className="mt-5 rounded-2xl overflow-hidden border border-green-200 shadow-sm">
            <div className="green-gradient px-5 py-4">
              <p className="font-bold text-white text-sm">
                ✓ Resume ready — {activeAnalysis.name && activeAnalysis.name !== "Your Name" ? `${activeAnalysis.name}, we` : "We"}&apos;ve found your strengths
              </p>
              <p className="mt-1 text-green-100 text-xs leading-relaxed">
                {activeAnalysis.whyTheseJobs || "Strong signals detected. Point your resume at the right role."}
              </p>
            </div>
            {(activeAnalysis.targetJobTitles ?? []).length > 0 && (
              <div className="bg-white px-5 py-4">
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2.5">Best-fit roles we spotted</p>
                <div className="flex flex-wrap gap-1.5">
                  {activeAnalysis.targetJobTitles.slice(0, 5).map((t) => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => setTargetRole(t)}
                      className="text-xs px-3 py-1.5 rounded-xl bg-green-50 border border-green-200 text-[#166534] font-semibold hover:bg-green-100 transition-colors"
                    >
                      {t}
                    </button>
                  ))}
                </div>
                <p className="mt-2.5 text-[11px] text-gray-400">Tap to auto-fill, or type your own below.</p>
              </div>
            )}
          </div>
        )}

        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <div>
            <Label htmlFor="targetRole" className="text-sm font-semibold text-gray-700">Target role <span className="text-red-400">*</span></Label>
            <input
              id="targetRole"
              type="text"
              value={targetRole}
              onChange={(e) => setTargetRole(e.target.value)}
              placeholder="e.g. Data Analyst, Store Supervisor, Software Developer…"
              maxLength={120}
              className="mt-1.5 w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-[#166534] focus:border-transparent transition-all"
            />
          </div>

          <div>
            <Label htmlFor="city" className="text-sm font-semibold text-gray-700">City or province <span className="text-red-400">*</span></Label>
            <input
              id="city"
              type="text"
              value={city}
              onChange={(e) => setCity(e.target.value)}
              placeholder="e.g. Toronto, ON · Vancouver, BC · Prince Albert, SK…"
              maxLength={80}
              className="mt-1.5 w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-[#166534] focus:border-transparent transition-all"
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <Label className="text-sm font-semibold text-gray-700">
                Job description <span className="text-gray-400 font-normal text-xs">(optional — boosts ATS match)</span>
              </Label>
              <button type="button" onClick={() => setShowJDInput((v) => !v)} className="text-xs font-semibold text-[#166534] hover:underline">
                {showJDInput ? "Hide ▲" : "Paste job posting ▼"}
              </button>
            </div>
            {showJDInput && (
              <div>
                <textarea
                  value={jobDescription}
                  onChange={(e) => setJobDescription(e.target.value)}
                  placeholder="Paste the job posting here — AI will extract keywords and weave them into your resume."
                  rows={4}
                  className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-[#166534] focus:border-transparent resize-none transition-all"
                />
                {jobDescription.trim().length > 50 && (
                  <p className="mt-1.5 text-xs font-semibold text-[#166534]">✓ Keywords will be extracted and injected automatically.</p>
                )}
              </div>
            )}
          </div>

          <div>
            <Label className="text-sm font-semibold text-gray-700">Immigration status <span className="text-red-400">*</span></Label>
            <Select value={immigrationStatus} onValueChange={setImmigrationStatus}>
              <SelectTrigger className="mt-1.5 rounded-xl border-gray-200 shadow-sm">
                <SelectValue placeholder="Select your status" />
              </SelectTrigger>
              <SelectContent>
                {IMMIGRATION_STATUSES.map((s) => (
                  <SelectItem key={s} value={s}>{s}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {error && (
            <div className="flex items-center gap-2 rounded-xl bg-red-50 border border-red-100 text-red-700 px-4 py-3 text-sm font-medium">
              <span>⚠</span> {error}
            </div>
          )}

          <div className="flex gap-3 pt-1">
            <Button
              type="button"
              variant="outline"
              onClick={() => { setView(saved ? "home" : "upload"); setStorageFailed(false); setError(null); }}
              className="rounded-xl border-gray-200 text-gray-600 hover:bg-gray-50 font-semibold"
            >
              ← Back
            </Button>
            <Button
              type="submit"
              className="flex-1 green-gradient hover:opacity-90 text-white py-6 text-base font-bold rounded-2xl shadow-lg hover:shadow-xl transition-all"
            >
              Build My ATS Resume →
            </Button>
          </div>
        </form>
      </main>
    </div>
  );
}
