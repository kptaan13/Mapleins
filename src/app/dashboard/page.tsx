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
      if (file.type !== "application/pdf") {
        setError("Please upload a PDF file.");
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
      sessionStorage.setItem(
        "mapleinsResumeAnalysis",
        JSON.stringify({
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
        })
      );
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
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
          <Link href="/dashboard" className="text-xl font-bold text-[#166534]">
            Mapleins
          </Link>
          <button
            onClick={async () => {
              const supabase = createClient();
              await supabase.auth.signOut();
              router.push("/");
              router.refresh();
            }}
            className="text-sm text-gray-600 hover:text-gray-900"
          >
            Sign out
          </button>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-12">
        {step === "upload" ? (
          <>
            <h1 className="text-2xl font-bold text-gray-900">Let&apos;s fix your resume</h1>
            <p className="mt-2 text-gray-600">
              Our AI scans for ATS gaps, weak bullet points, and missing Canadian keywords — then builds you a resume that actually gets past the filters.
            </p>

            {/* Trust strip */}
            <div className="mt-5 flex flex-wrap gap-x-5 gap-y-1.5 text-xs text-gray-400">
              <span>⚡ Results in under 60 seconds</span>
              <span>🔒 Your resume is never shared</span>
              <span>🍁 Optimised for Canadian employers</span>
            </div>

            <form onSubmit={handleUploadAndAnalyze} className="mt-6 space-y-6">
              <div>
                <Label className="text-sm font-medium text-gray-700">Upload your resume (PDF)</Label>
                <div className="mt-2">
                  <label className="flex flex-col items-center justify-center w-full h-40 border-2 border-dashed border-gray-300 rounded-xl cursor-pointer bg-white hover:bg-green-50 hover:border-green-400 transition-colors">
                    <div className="flex flex-col items-center justify-center pt-5 pb-6">
                      <svg className="w-10 h-10 text-gray-400 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                      </svg>
                      <span className="text-sm font-medium text-gray-700">
                        {resumeFile ? resumeFile.name : "Drop your PDF here, or click to browse"}
                      </span>
                      <span className="text-xs text-gray-400 mt-1">PDF only · Max 10 MB</span>
                    </div>
                    <input
                      ref={fileInputRef}
                      type="file"
                      className="hidden"
                      accept=".pdf"
                      onChange={handleFileChange}
                    />
                  </label>
                </div>
              </div>

              {error && (
                <div className="rounded-lg bg-red-50 text-red-700 px-4 py-3 text-sm">{error}</div>
              )}

              <Button
                type="submit"
                disabled={loading || !resumeFile}
                className="w-full bg-[#22c55e] hover:bg-[#16a34a] text-white py-6 text-lg font-semibold"
              >
                {loading
                  ? analyzing
                    ? "AI is reading your resume…"
                    : "Uploading…"
                  : "Analyse My Resume →"}
              </Button>
              <p className="text-center text-xs text-gray-400 -mt-2">Free · No credit card needed</p>
              <button
                type="button"
                onClick={() => {
                  setAnalysis(null);
                  setStorageFailed(false);
                  setError(null);
                  router.push("/editor");
                }}
                className="w-full text-center text-xs text-[#166534] font-medium mt-4 hover:underline"
              >
                I don&apos;t have a resume yet — build from scratch →
              </button>
            </form>
          </>
        ) : (
          <>
            <h1 className="text-2xl font-bold text-gray-900">Almost there — tell us your target</h1>
            <p className="mt-2 text-gray-600">
              We&apos;ll rebuild your resume around that exact role and city, inject the right ATS keywords, and find the 12–15 best-matched Canadian jobs for you right now.
            </p>

            {storageFailed && (
              <div className="mt-4 p-4 bg-amber-50 rounded-xl border border-amber-200 text-amber-800 text-sm">
                Your resume was analyzed, but we couldn&apos;t save a copy to your account. You can still continue and download your tailored PDF from the results page this session.
              </div>
            )}
            {analysis && (
              <div className="mt-4 p-4 bg-green-50 rounded-xl border border-green-200">
                <p className="font-semibold text-green-900">
                  ✓ Resume read — {analysis.name && analysis.name !== "Your Name" ? `${analysis.name}, we` : "We"}&apos;ve found your strengths
                </p>
                <p className="mt-1 text-sm text-gray-700">
                  {analysis.whyTheseJobs || "Strong signals detected. Now let's point your resume at the right role."}
                </p>
                {analysis.targetJobTitles?.length > 0 && (
                  <>
                    <p className="mt-3 text-xs font-medium text-gray-500 uppercase tracking-wide">Best-fit roles we spotted:</p>
                    <div className="mt-1.5 flex flex-wrap gap-1.5">
                      {analysis.targetJobTitles.slice(0, 5).map((t) => (
                        <button
                          key={t}
                          type="button"
                          onClick={() => setTargetRole(t)}
                          className="text-xs px-2.5 py-1 rounded-full bg-white border border-green-300 text-green-700 hover:bg-green-100 transition-colors"
                        >
                          {t}
                        </button>
                      ))}
                    </div>
                    <p className="mt-2 text-xs text-gray-500">Tap one to auto-fill, or type your own target below.</p>
                  </>
                )}
              </div>
            )}

            <form onSubmit={handleSubmit} className="mt-6 space-y-5">
              {/* Target Role - free text */}
              <div>
                <Label htmlFor="targetRole">Target role <span className="text-red-500">*</span></Label>
                <input
                  id="targetRole"
                  type="text"
                  value={targetRole}
                  onChange={(e) => setTargetRole(e.target.value)}
                  placeholder="e.g. Data Analyst, Store Supervisor, Software Developer…"
                  maxLength={120}
                  className="mt-1.5 w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                />
              </div>

              {/* City - free text */}
              <div>
                <Label htmlFor="city">City or province <span className="text-red-500">*</span></Label>
                <input
                  id="city"
                  type="text"
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  placeholder="e.g. Toronto, ON · Vancouver, BC · Prince Albert, SK…"
                  maxLength={80}
                  className="mt-1.5 w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                />
              </div>

              {/* Job Description - optional keyword extraction */}
              <div>
                <div className="flex items-center justify-between">
                  <Label>Job description <span className="text-gray-400 font-normal">(optional)</span></Label>
                  <button
                    type="button"
                    onClick={() => setShowJDInput((v) => !v)}
                    className="text-xs text-[#166534] hover:underline"
                  >
                    {showJDInput ? "Hide ▲" : "Paste job posting ▼"}
                  </button>
                </div>
                {showJDInput && (
                  <div className="mt-1.5">
                    <textarea
                      value={jobDescription}
                      onChange={(e) => setJobDescription(e.target.value)}
                      placeholder="Paste the job posting here — AI will extract keywords and weave them into your resume for higher ATS match scores."
                      rows={5}
                      className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-500 resize-none"
                    />
                    {jobDescription.trim().length > 50 && (
                      <p className="mt-1 text-xs text-green-700">
                        ✓ Keywords will be extracted and injected into your resume automatically.
                      </p>
                    )}
                  </div>
                )}
              </div>

              {/* Immigration status - still dropdown (important for accuracy) */}
              <div>
                <Label>Immigration status <span className="text-red-500">*</span></Label>
                <Select value={immigrationStatus} onValueChange={setImmigrationStatus}>
                  <SelectTrigger className="mt-1.5">
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
                <div className="rounded-lg bg-red-50 text-red-700 px-4 py-3 text-sm">{error}</div>
              )}

              <div className="flex gap-3 pt-2">
                <Button type="button" variant="outline" onClick={() => { setStep("upload"); setStorageFailed(false); }}>
                  ← Back
                </Button>
                <Button
                  type="submit"
                  className="flex-1 bg-[#22c55e] hover:bg-[#16a34a] text-white py-6 text-lg font-semibold"
                >
                  Build My ATS Resume + Job Matches →
                </Button>
              </div>
            </form>
          </>
        )}
      </main>
    </div>
  );
}
