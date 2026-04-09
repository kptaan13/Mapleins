"use client";

import { useState, useRef } from "react";
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
};

export default function DashboardPage() {
  const router = useRouter();
  const [step, setStep] = useState<"upload" | "form">("upload");
  const [resumeFile, setResumeFile] = useState<File | null>(null);
  const [resumeUrl, setResumeUrl] = useState("");
  const [analysis, setAnalysis] = useState<AnalysisResult | null>(null);

  // Free-text inputs
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

  const handleUploadAndAnalyze = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resumeFile) {
      setError("Please upload your resume first.");
      return;
    }

    setLoading(true);
    setError(null);
    setStorageFailed(false);

    try {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        setError("Please sign in to continue.");
        return;
      }

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
        const { data: urlData } = supabase.storage
          .from("resumes")
          .getPublicUrl(fileName);
        url = urlData.publicUrl;
        setResumeUrl(url);
      }

      setAnalyzing(true);

      const formData = new FormData();
      formData.append("file", resumeFile);
      if (url) formData.append("resumeUrl", url);

      const res = await fetch("/api/resume/analyze", {
        method: "POST",
        body: formData,
      });

      let data: AnalysisResult & { error?: string };
      try {
        data = await res.json();
      } catch {
        setError("Server returned invalid response. Try again.");
        return;
      }

      if (!res.ok) {
        setError(data?.error || `Analysis failed (${res.status})`);
        return;
      }

      setAnalysis(data);
      // Pre-fill target role from AI suggestion if user hasn't typed one
      if (!targetRole && data.targetJobTitles?.length) {
        setTargetRole(data.targetJobTitles[0]);
      }
      setStep("form");
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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetRole.trim() || !city.trim() || !immigrationStatus) {
      setError("Please fill in all fields.");
      return;
    }

    if (analysis) {
      const payload = JSON.stringify({
        name: analysis.name,
        email: analysis.email,
        phone: analysis.phone,
        summary: analysis.summary,
        experience: analysis.experience,
        experienceByRole: analysis.experienceByRole,
        skills: analysis.skills,
        education: analysis.education,
        certifications: analysis.certifications,
        targetRole: targetRole.trim(),
        city: city.trim(),
        yearsOfExperience: analysis.yearsOfExperience ?? 0,
        jobDescription: jobDescription.trim(),
      });
      // Write to both storages so the data survives tab close / page refresh
      sessionStorage.setItem("mapleinsResumeAnalysis", payload);
      try { localStorage.setItem("mapleinsResumeAnalysis", payload); } catch { /* ignore */ }
    }

    const params = new URLSearchParams({
      jobType: targetRole.trim(),
      city: city.trim(),
      immigrationStatus,
      ...(resumeUrl && { resumeUrl }),
    });
    router.push(`/resume-results?${params.toString()}`);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#f0fdf4] via-white to-[#f0f9ff]">
      {/* ── Header ── */}
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

      <main className="max-w-xl mx-auto px-4 py-10">
        {/* ── Step indicator ── */}
        <div className="flex items-center gap-2 mb-8 reveal-up">
          <div className={`flex items-center justify-center w-7 h-7 rounded-full text-xs font-bold transition-all ${step === "upload" ? "green-gradient text-white shadow-md" : "bg-green-100 text-[#166534]"}`}>1</div>
          <div className={`h-0.5 flex-1 rounded transition-all ${step === "form" ? "bg-[#166534]" : "bg-gray-200"}`} />
          <div className={`flex items-center justify-center w-7 h-7 rounded-full text-xs font-bold transition-all ${step === "form" ? "green-gradient text-white shadow-md" : "bg-gray-100 text-gray-400"}`}>2</div>
        </div>

        {step === "upload" ? (
          <div className="reveal-up">
            {/* Hero text */}
            <h1 className="text-3xl font-black text-gray-900 leading-tight">
              Let&apos;s fix your<br />
              <span className="text-gradient">Canadian resume</span>
            </h1>
            <p className="mt-3 text-gray-500 leading-relaxed">
              AI scans for ATS gaps, weak bullet points, and missing Canadian keywords — then rebuilds your resume to actually get past the filters.
            </p>

            {/* Trust badges */}
            <div className="mt-5 flex flex-wrap gap-2">
              {[
                { icon: "⚡", text: "Under 60 seconds" },
                { icon: "🔒", text: "Never shared" },
                { icon: "🍁", text: "Canadian ATS" },
              ].map((b) => (
                <span key={b.text} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white border border-gray-200 shadow-sm text-xs font-semibold text-gray-600">
                  <span>{b.icon}</span>{b.text}
                </span>
              ))}
            </div>

            <form onSubmit={handleUploadAndAnalyze} className="mt-7 space-y-5">
              {/* Upload zone */}
              <div>
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
              </div>

              {error && (
                <div className="flex items-center gap-2 rounded-xl bg-red-50 border border-red-100 text-red-700 px-4 py-3 text-sm font-medium">
                  <span className="text-base">⚠</span> {error}
                </div>
              )}

              {/* CTA button + loading state */}
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
                <Button
                  type="submit"
                  disabled={!resumeFile}
                  className="w-full green-gradient hover:opacity-90 text-white py-6 text-base font-bold rounded-2xl shadow-lg hover:shadow-xl transition-all disabled:opacity-40"
                >
                  Analyse My Resume →
                </Button>
              )}


              <button
                type="button"
                onClick={() => { setAnalysis(null); setStorageFailed(false); setError(null); router.push("/editor"); }}
                className="w-full text-center text-xs text-[#166534] font-semibold hover:underline"
              >
                I don&apos;t have a resume yet — build from scratch →
              </button>
            </form>
          </div>
        ) : (
          <div className="reveal-up">
            <h1 className="text-3xl font-black text-gray-900 leading-tight">
              Almost there —<br />
              <span className="text-gradient">target your role</span>
            </h1>
            <p className="mt-3 text-gray-500 leading-relaxed">
              We&apos;ll rebuild your resume around that exact role and city, inject the right ATS keywords, and surface 12–15 best-matched Canadian jobs.
            </p>

            {storageFailed && (
              <div className="mt-5 flex items-start gap-3 p-4 bg-amber-50 rounded-2xl border border-amber-200 text-amber-800 text-sm">
                <span className="text-lg mt-0.5">⚠</span>
                <span>Resume analyzed but we couldn&apos;t save a copy. You can still download your tailored PDF this session.</span>
              </div>
            )}

            {analysis && (
              <div className="mt-5 rounded-2xl overflow-hidden border border-green-200 shadow-sm">
                <div className="green-gradient px-5 py-4">
                  <p className="font-bold text-white text-sm">
                    ✓ Resume read — {analysis.name && analysis.name !== "Your Name" ? `${analysis.name}, we` : "We"}&apos;ve found your strengths
                  </p>
                  <p className="mt-1 text-green-100 text-xs leading-relaxed">
                    {analysis.whyTheseJobs || "Strong signals detected. Point your resume at the right role."}
                  </p>
                </div>
                {analysis.targetJobTitles?.length > 0 && (
                  <div className="bg-white px-5 py-4">
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2.5">Best-fit roles we spotted</p>
                    <div className="flex flex-wrap gap-1.5">
                      {analysis.targetJobTitles.slice(0, 5).map((t) => (
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
                  <Label className="text-sm font-semibold text-gray-700">Job description <span className="text-gray-400 font-normal text-xs">(optional — boosts ATS match)</span></Label>
                  <button
                    type="button"
                    onClick={() => setShowJDInput((v) => !v)}
                    className="text-xs font-semibold text-[#166534] hover:underline"
                  >
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
                  onClick={() => { setStep("upload"); setStorageFailed(false); }}
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
          </div>
        )}
      </main>
    </div>
  );
}
