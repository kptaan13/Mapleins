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
  atsScore?: number;
};

const STORAGE_KEY = "mapleinsResumeAnalysis";
const CHECKLIST_KEY = "mapleins_checklist";

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

// ── Checklist storage ──
function loadChecklist(): Set<string> {
  try {
    const raw = localStorage.getItem(CHECKLIST_KEY);
    if (!raw) return new Set();
    const arr = JSON.parse(raw) as string[];
    return new Set(arr);
  } catch { return new Set(); }
}
function saveChecklist(checked: Set<string>) {
  try {
    localStorage.setItem(CHECKLIST_KEY, JSON.stringify(Array.from(checked)));
  } catch { /* ignore */ }
}

// ── Checklist data ──
type ChecklistItem = { id: string; label: string };
type ChecklistCategory = { id: string; title: string; items: ChecklistItem[] };

const CHECKLIST_CATEGORIES: ChecklistCategory[] = [
  {
    id: "resume",
    title: "📄 Resume Ready",
    items: [
      { id: "r1", label: "Resume tailored for Canadian market" },
      { id: "r2", label: "ATS score above 70" },
      { id: "r3", label: "Contact info includes LinkedIn URL" },
      { id: "r4", label: "No photos, age, or marital status (Canadian standard)" },
      { id: "r5", label: "One-page (under 5 years exp) or two-page max" },
    ],
  },
  {
    id: "online",
    title: "🌐 Online Presence",
    items: [
      { id: "o1", label: "LinkedIn profile updated and matches resume" },
      { id: "o2", label: "LinkedIn has a professional headshot" },
      { id: "o3", label: 'Set LinkedIn "Open to Work" (visible to recruiters only)' },
      { id: "o4", label: "Google yourself and clean up anything unprofessional" },
    ],
  },
  {
    id: "applications",
    title: "📬 Applications",
    items: [
      { id: "a1", label: "Applied to 5+ jobs today" },
      { id: "a2", label: "Cover letter customized per application" },
      { id: "a3", label: "Used job boards: Indeed, LinkedIn, Workopolis, Job Bank" },
      { id: "a4", label: "Reached out to 2+ people in your network this week" },
      { id: "a5", label: "Followed up on applications older than 1 week" },
    ],
  },
  {
    id: "interview",
    title: "🎤 Interview Ready",
    items: [
      { id: "i1", label: "Researched company before interview" },
      { id: "i2", label: "Prepared 3 STAR stories" },
      { id: "i3", label: "Practiced answers out loud" },
      { id: "i4", label: "Sent thank-you email after last interview" },
    ],
  },
];

const TOTAL_CHECKLIST_ITEMS = CHECKLIST_CATEGORIES.reduce(
  (sum, cat) => sum + cat.items.length,
  0
);

type DashboardSection = "overview" | "mapleins-resume" | "interview" | "checklist" | "jobsearch";

// ── Interview Prep data ──
type InterviewQuestion = { question: string; tip: string; answer: string };

const INTERVIEW_QUESTIONS: InterviewQuestion[] = [
  {
    question: "Tell me about yourself",
    tip: "Focus on Canadian experience first, then international. Keep it under 2 minutes.",
    answer: "Start with your current role or most recent position, then briefly walk through your career highlights that are most relevant to the job. End with why you're excited about this specific opportunity.\n\nExample: \"I'm a retail supervisor with 6 years of experience leading customer-facing teams. Most recently I managed a team of 12 at [Company] where we consistently exceeded our NPS targets. Before moving to Canada, I held a similar role in [country] where I developed strong skills in inventory management and staff training. I'm particularly excited about this role at [Company] because of your focus on community-driven retail — something I'm passionate about.\""
  },
  {
    question: "Why do you want to work here?",
    tip: "Research the company's Canadian operations, values, and recent news.",
    answer: "Show that you've done your homework — mention something specific about the company (a value, recent initiative, or their reputation) and connect it to your own goals.\n\nExample: \"I've followed [Company]'s growth in the Canadian market closely, especially your recent initiative around sustainable sourcing. I've spent years building teams that care about more than just the bottom line, and your culture of accountability and community impact aligns exactly with how I work. I want to bring that energy to your team.\""
  },
  {
    question: "What are your strengths?",
    tip: "Give concrete examples relevant to Canadian workplace culture — collaboration, initiative, adaptability.",
    answer: "Pick 2–3 strengths and back each one with a brief, specific example. Avoid vague answers like \"I'm a hard worker.\"\n\nExample: \"My biggest strength is cross-functional communication. At my last role, I was the link between warehouse operations and the retail floor — I built a shared tracking system that cut stockout incidents by 30%. I'm also highly adaptable; when I moved to Canada, I quickly upskilled on local payroll regulations and had our team fully compliant within 3 weeks.\""
  },
  {
    question: "What is your greatest weakness?",
    tip: "Pick a real weakness, but show you're actively working on it. Never say 'I'm a perfectionist.'",
    answer: "Choose something genuine that isn't critical to the role, and follow it immediately with what you're doing to improve.\n\nExample: \"I used to struggle with delegating — I'd take on too much myself because I wanted things done a certain way. I realized this was limiting my team's growth, so I started assigning ownership of projects with clear outcomes rather than steps. It's made my team more confident and freed me up to focus on strategy.\""
  },
  {
    question: "Describe a challenge you overcame",
    tip: "Use the STAR framework: Situation, Task, Action, Result. Numbers help.",
    answer: "Use the STAR method. Keep it concise — about 90 seconds.\n\nExample: \"In my previous role (S), our busiest location was understaffed heading into the holiday season (T). I coordinated with HR to fast-track hiring, personally trained 8 new staff in 2 weeks, and rescheduled shifts to ensure coverage (A). We hit our December sales target and received zero customer complaints about wait times — a first for that location (R).\""
  },
  {
    question: "Where do you see yourself in 5 years?",
    tip: "Show commitment to Canada and alignment with the company's growth trajectory.",
    answer: "Be ambitious but realistic. Show you want to grow with this company, not just use it as a stepping stone.\n\nExample: \"In 5 years I'd like to be in a senior operations role, ideally having grown with this company. I'm focused on building deep expertise in [relevant area] and developing into someone who can mentor junior team members. Canada is my long-term home and I want to build my career here — this role feels like exactly the right foundation.\""
  },
  {
    question: "Why did you leave your last job?",
    tip: "Stay positive — mention growth opportunities, new challenges, or relocation.",
    answer: "Never speak negatively about a former employer. Frame your departure as a positive step forward.\n\nExample: \"My previous role was a great learning experience, but I reached a point where the growth opportunities were limited. I'm at a stage in my career where I want to take on more responsibility and contribute to a larger operation. When I saw this opening, it felt like the natural next step.\""
  },
  {
    question: "Do you have Canadian experience?",
    tip: "Address it proactively. Bridge international experience to Canadian context with transferable skills.",
    answer: "Acknowledge the question honestly, then pivot to your strengths and transferable skills. Many employers ask this but care more about competence.\n\nExample: \"I'm newer to the Canadian job market, but the skills I bring are directly transferable. Customer service expectations, team leadership, and operational efficiency aren't country-specific — they're universal. I've also been proactive about understanding Canadian workplace norms: I completed [course/certification] and I've been connecting with industry professionals here. I'm a fast learner and I'm ready to contribute from day one.\""
  },
  {
    question: "Are you legally allowed to work in Canada?",
    tip: "Answer clearly and directly with your immigration status. Employers need certainty.",
    answer: "Be clear, confident, and specific. Vague answers create doubt.\n\nExample: \"Yes, absolutely. I hold an open work permit valid until [date], which allows me to work for any employer in Canada without restriction.\" OR \"I'm a permanent resident of Canada, so there are no work restrictions.\" OR \"I'm a Canadian citizen.\"\n\nIf your status has conditions, explain them briefly and reassuringly."
  },
  {
    question: "What are your salary expectations?",
    tip: "Research Canadian market rates on Glassdoor, Payscale, or salary.ca before answering.",
    answer: "Give a range based on research, not a single number. Anchor the range at the top of what's reasonable.\n\nExample: \"Based on my research for this type of role in [city], and considering my [X] years of experience, I'm targeting somewhere in the $55,000–$65,000 range. That said, I'm open to discussing the full compensation package — benefits and growth opportunities matter to me too.\"\n\nResearch tip: Check salary.ca, Glassdoor, and the Government of Canada Job Bank for reliable Canadian salary data."
  },
];

const CANADIAN_TIPS = [
  { icon: "🍁", tip: "Address the \"Canadian experience\" question upfront — employers respect candidates who acknowledge it proactively." },
  { icon: "🤝", tip: "Canadians value humility — don't oversell. Use \"we\" to credit your team, not just \"I\"." },
  { icon: "⏰", tip: "Punctuality is highly valued — arrive 10 minutes early to every interview, never late." },
  { icon: "📧", tip: "Always send a thank-you email within 24 hours of your interview. It sets you apart." },
  { icon: "🌍", tip: "Diversity is celebrated — your international background is an asset. Own it confidently." },
  { icon: "💬", tip: "Direct but polite — Canadians appreciate honesty wrapped in politeness. No aggressive negotiating." },
];

// ── Job boards data ──
type JobBoard = { icon: string; name: string; description: string; urlTemplate: string };

const JOB_BOARDS: JobBoard[] = [
  {
    icon: "💼",
    name: "Indeed Canada",
    description: "Canada's #1 job site with millions of listings updated daily.",
    urlTemplate: "https://ca.indeed.com/jobs?q={role}&l={city}",
  },
  {
    icon: "🔗",
    name: "LinkedIn Jobs",
    description: "Professional network jobs + direct recruiter connections.",
    urlTemplate: "https://www.linkedin.com/jobs/search/?keywords={role}&location={city}",
  },
  {
    icon: "🍁",
    name: "Job Bank (Government)",
    description: "Official Government of Canada job board — free and trusted.",
    urlTemplate: "https://www.jobbank.gc.ca/jobsearch/jobsearch?searchstring={role}&locationstring={city}",
  },
  {
    icon: "🏢",
    name: "Workopolis",
    description: "Canadian-focused job board with curated postings.",
    urlTemplate: "https://workopolis.com/jobsearch/find-jobs?ak={role}&l={city}",
  },
  {
    icon: "🎯",
    name: "Monster Canada",
    description: "Global platform with strong Canadian employer presence.",
    urlTemplate: "https://www.monster.ca/jobs/search/?q={role}&where={city}",
  },
  {
    icon: "🏛️",
    name: "Glassdoor",
    description: "Jobs + salary data + company reviews by employees.",
    urlTemplate: "https://www.glassdoor.ca/Job/jobs.htm?suggestCount=0&suggestChosen=false&clickSource=searchBtn&typedKeyword={role}&locT=C&locId=&jobType=",
  },
];

function buildJobUrl(template: string, role: string, city: string): string {
  return template
    .replace("{role}", encodeURIComponent(role))
    .replace("{city}", encodeURIComponent(city));
}

// ── ATS Score color ──
function atsColor(score: number | undefined): string {
  if (score === undefined) return "text-gray-400";
  if (score >= 70) return "text-green-600";
  if (score >= 50) return "text-amber-500";
  return "text-red-500";
}

export default function DashboardPage() {
  const router = useRouter();

  const [view, setView] = useState<"home" | "upload" | "form" | "dashboard">("home");
  const [activeSection, setActiveSection] = useState<DashboardSection>("overview");
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const [saved, setSaved] = useState<AnalysisResult | null>(null);
  const [savedUpdatedAt, setSavedUpdatedAt] = useState<string | null>(null);
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

  // ── Checklist state ──
  const [checkedItems, setCheckedItems] = useState<Set<string>>(new Set());
  const [openCategories, setOpenCategories] = useState<Set<string>>(
    new Set(CHECKLIST_CATEGORIES.map((c) => c.id))
  );

  // ── Mapleins Resume: create by title ──
  const [newResumeTitle, setNewResumeTitle] = useState("");
  const [newResumeCity, setNewResumeCity] = useState("");

  // ── Mapleins Resume: create by job description ──
  const [newResumeJD, setNewResumeJD] = useState("");
  const [jdParsing, setJdParsing] = useState(false);
  const [jdError, setJdError] = useState<string | null>(null);

  const handleCreateFromJD = async () => {
    if (newResumeJD.trim().length < 30) return;
    setJdParsing(true);
    setJdError(null);
    try {
      const res = await fetch("/api/resume/hint", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          field: "jobTitle",
          value: newResumeJD.trim().slice(0, 1500),
          context: { jobType: "General", city: "Canada" },
        }),
      });
      const data = await res.json();
      // Extract a job title from the hint or alternatives
      const extracted: string =
        (data.alternatives ?? []).find((a: string) => a.length > 3 && a.length < 80) ??
        (data.hint?.length > 3 && data.hint.length < 80 ? data.hint : "");
      const title = extracted || "General";
      const params = new URLSearchParams({ jobType: title, city: "Canada", jobDescription: newResumeJD.trim().slice(0, 800) });
      router.push(`/editor?${params.toString()}`);
    } catch {
      setJdError("Could not parse the job description. Try the Job Title option instead.");
    } finally {
      setJdParsing(false);
    }
  };

  // ── Interview prep tab ──
  const [interviewTab, setInterviewTab] = useState<"questions" | "tips" | "star">("questions");
  const [openQuestion, setOpenQuestion] = useState<number | null>(null);

  // ── Load saved resume on mount ──
  useEffect(() => {
    async function load() {
      const local = loadLocal();
      if (local) {
        setSaved(local);
        if (local.targetRole) setTargetRole(local.targetRole);
        if (local.city) setCity(local.city);
      }
      try {
        const supabase = createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;
        const { data } = await supabase
          .from("resumes")
          .select("analysis, updated_at")
          .eq("user_id", user.id)
          .single();
        if (data?.analysis) {
          const r = data.analysis as AnalysisResult;
          setSaved(r);
          saveLocal(r);
          if (r.targetRole) setTargetRole(r.targetRole);
          if (r.city) setCity(r.city);
          if (data.updated_at) setSavedUpdatedAt(data.updated_at as string);
        }
        // Always go to dashboard — new users get empty state, returning users see their resume
        setView("dashboard");
      } catch {
        // Even if Supabase fails, still show dashboard
        setView("dashboard");
      }
    }
    load();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Load checklist from localStorage ──
  useEffect(() => {
    setCheckedItems(loadChecklist());
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

      saveLocal(data);
      try {
        const { data: { user: u2 } } = await supabase.auth.getUser();
        if (u2) {
          await supabase.from("resumes").upsert(
            { user_id: u2.id, analysis: data, updated_at: new Date().toISOString() },
            { onConflict: "user_id" }
          );
        }
      } catch { /* non-fatal */ }

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

  // ── Sign out ──
  const handleSignOut = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/");
    router.refresh();
  };

  // ── Checklist helpers ──
  const toggleCheck = (id: string) => {
    setCheckedItems((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      saveChecklist(next);
      return next;
    });
  };

  const toggleCategory = (id: string) => {
    setOpenCategories((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const completedCount = checkedItems.size;

  // ── Shared header (used in upload/form/home views) ──
  const Header = () => (
    <header className="glass-morphism sticky top-0 z-50">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
        <Link href="/dashboard" className="flex items-center gap-2">
          <div className="w-8 h-8 green-gradient rounded-lg flex items-center justify-center text-white font-bold text-xs shadow-md">M</div>
          <span className="text-xl font-bold text-gray-900">Mapleins</span>
        </Link>
        <button
          onClick={handleSignOut}
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

          {saved && (
            <div className="rounded-2xl border border-green-200 bg-white shadow-sm overflow-hidden">
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
                  onClick={() => router.push("/editor")}
                  className="border-gray-200 text-gray-600 hover:bg-gray-50 font-semibold rounded-xl px-4 text-sm"
                >
                  ✏️ Edit
                </Button>
              </div>
            </div>
          )}

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
            <label className={`group relative flex flex-col items-center justify-center w-full h-48 border-2 border-dashed rounded-2xl cursor-pointer transition-all duration-200 ${resumeFile ? "border-[#166534] bg-green-50 shadow-sm" : "border-gray-200 bg-white hover:border-[#166534] hover:bg-green-50"}`}>
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
                  onClick={() => setView(saved ? "dashboard" : "home")}
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
  if (view === "form") {
    const activeAnalysis = analysis ?? saved;
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#f0fdf4] via-white to-[#f0f9ff]">
        <Header />
        <main className="max-w-xl mx-auto px-4 py-10 reveal-up">
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
                onClick={() => { setView(saved ? "dashboard" : "upload"); setStorageFailed(false); setError(null); }}
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

  // ── VIEW: Dashboard ──
  const dashSaved = saved;
  const displayRole = dashSaved?.targetRole ?? targetRole ?? "your target role";
  const displayCity = dashSaved?.city ?? city ?? "Canada";

  const navItems: { id: DashboardSection; icon: string; label: string }[] = [
    { id: "overview", icon: "🏠", label: "Overview" },
    { id: "mapleins-resume", icon: "🍁", label: "Mapleins Resume" },
    { id: "interview", icon: "🎤", label: "Interview Prep" },
    { id: "checklist", icon: "✅", label: "Job Checklist" },
    { id: "jobsearch", icon: "🔍", label: "Job Search" },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#f0fdf4] via-white to-[#f0f9ff] flex flex-col">
      {/* ── Dashboard top header ── */}
      <header className="glass-morphism sticky top-0 z-50 border-b border-gray-100">
        <div className="px-4 sm:px-6 py-3 flex items-center justify-between gap-4">
          {/* Left: Logo + hamburger (mobile) */}
          <div className="flex items-center gap-3">
            <button
              className="sm:hidden p-1.5 rounded-lg hover:bg-green-50 transition-colors"
              onClick={() => setSidebarOpen((v) => !v)}
              aria-label="Toggle sidebar"
            >
              <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
            <Link href="/dashboard" className="flex items-center gap-2">
              <div className="w-8 h-8 green-gradient rounded-lg flex items-center justify-center text-white font-bold text-xs shadow-md">M</div>
              <span className="text-xl font-bold text-gray-900 hidden sm:block">Mapleins</span>
            </Link>
          </div>

          {/* Right: User info + sign out */}
          <div className="flex items-center gap-3">
            {dashSaved?.name && (
              <div className="text-right hidden sm:block">
                <p className="text-sm font-semibold text-gray-800 leading-tight">{dashSaved.name}</p>
                {dashSaved.email && <p className="text-xs text-gray-400 leading-tight">{dashSaved.email}</p>}
              </div>
            )}
            <div className="w-8 h-8 green-gradient rounded-full flex items-center justify-center text-white font-bold text-xs shadow-sm flex-shrink-0">
              {dashSaved?.name ? dashSaved.name[0].toUpperCase() : "U"}
            </div>
            <button
              onClick={handleSignOut}
              className="text-sm font-semibold text-gray-500 hover:text-[#166534] transition-colors px-3 py-1.5 rounded-lg hover:bg-green-50 hidden sm:block"
            >
              Sign out
            </button>
          </div>
        </div>
      </header>

      <div className="flex flex-1 relative">
        {/* ── Sidebar overlay (mobile) ── */}
        {sidebarOpen && (
          <div
            className="fixed inset-0 bg-black/30 z-30 sm:hidden"
            onClick={() => setSidebarOpen(false)}
          />
        )}

        {/* ── Sidebar ── */}
        <aside
          className={`
            fixed sm:sticky top-[57px] sm:top-0 left-0 h-[calc(100vh-57px)] sm:h-auto
            w-60 bg-white border-r border-gray-100 flex flex-col z-40
            transition-transform duration-200
            ${sidebarOpen ? "translate-x-0" : "-translate-x-full sm:translate-x-0"}
            sm:flex
          `}
        >
          <nav className="flex-1 py-4 overflow-y-auto">
            {navItems.map((item) => (
              <button
                key={item.id}
                onClick={() => { setActiveSection(item.id); setSidebarOpen(false); }}
                className={`w-full flex items-center gap-3 px-4 py-3 text-sm font-semibold transition-colors text-left ${
                  activeSection === item.id
                    ? "bg-green-50 text-[#166534] border-r-2 border-[#166534]"
                    : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                }`}
              >
                <span className="text-base">{item.icon}</span>
                {item.label}
              </button>
            ))}
          </nav>
          <div className="border-t border-gray-100 p-4">
            <button
              onClick={handleSignOut}
              className="w-full flex items-center gap-3 px-2 py-2 text-sm font-semibold text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
            >
              <span>🚪</span> Sign out
            </button>
          </div>
        </aside>

        {/* ── Main content ── */}
        <main className="flex-1 min-w-0 px-4 sm:px-6 lg:px-8 py-6 pb-24 sm:pb-6 overflow-y-auto">

          {/* ── SECTION: Overview ── */}
          {activeSection === "overview" && (
            <div className="max-w-3xl mx-auto space-y-6">
              {/* Welcome card */}
              <div className="green-gradient rounded-2xl p-6 text-white shadow-lg">
                <h1 className="text-2xl font-black leading-tight">
                  Welcome back, {dashSaved?.name?.split(" ")[0] ?? "there"} 👋
                </h1>
                <p className="mt-1 text-green-100 text-sm">
                  {displayRole !== "your target role" && displayCity !== "Canada"
                    ? `Targeting ${displayRole} roles in ${displayCity}`
                    : "Your Canadian job dashboard is ready."}
                </p>
                {savedUpdatedAt && (
                  <p className="mt-2 text-green-200 text-xs">
                    Last updated: {new Date(savedUpdatedAt).toLocaleDateString("en-CA", { month: "short", day: "numeric", year: "numeric" })}
                  </p>
                )}
              </div>

              {/* Stat cards */}
              <div className="grid grid-cols-3 gap-3">
                {/* ATS Score */}
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 flex flex-col items-center text-center">
                  <p className={`text-3xl font-black ${atsColor(dashSaved?.atsScore)}`}>
                    {dashSaved?.atsScore !== undefined ? dashSaved.atsScore : "--"}
                  </p>
                  <p className="text-xs text-gray-400 font-semibold mt-1">ATS Score</p>
                  {dashSaved?.atsScore !== undefined && (
                    <div className="mt-2 w-full bg-gray-100 rounded-full h-1.5">
                      <div
                        className={`h-1.5 rounded-full ${dashSaved.atsScore >= 70 ? "bg-green-500" : dashSaved.atsScore >= 50 ? "bg-amber-400" : "bg-red-400"}`}
                        style={{ width: `${Math.min(100, dashSaved.atsScore)}%` }}
                      />
                    </div>
                  )}
                </div>

                {/* Checklist Progress */}
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 flex flex-col items-center text-center">
                  <p className="text-3xl font-black text-[#166534]">{completedCount}</p>
                  <p className="text-xs text-gray-400 font-semibold mt-1">/ {TOTAL_CHECKLIST_ITEMS} complete</p>
                  <div className="mt-2 w-full bg-gray-100 rounded-full h-1.5">
                    <div
                      className="h-1.5 rounded-full bg-green-500 transition-all"
                      style={{ width: `${(completedCount / TOTAL_CHECKLIST_ITEMS) * 100}%` }}
                    />
                  </div>
                </div>

                {/* Experience */}
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 flex flex-col items-center text-center">
                  <p className="text-3xl font-black text-gray-800">
                    {dashSaved?.yearsOfExperience ?? "--"}
                  </p>
                  <p className="text-xs text-gray-400 font-semibold mt-1">
                    {dashSaved?.yearsOfExperience ? "years exp." : "Experience"}
                  </p>
                </div>
              </div>

              {/* Quick actions */}
              <div>
                <h2 className="text-sm font-bold text-gray-500 uppercase tracking-widest mb-3">Quick Actions</h2>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    onClick={() => router.push("/editor")}
                    className="flex items-center gap-3 bg-white rounded-2xl border border-gray-100 shadow-sm p-4 hover:border-green-300 hover:bg-green-50 transition-all text-left group"
                  >
                    <span className="text-2xl">✏️</span>
                    <div>
                      <p className="text-sm font-bold text-gray-800 group-hover:text-[#166534]">Edit Resume</p>
                      <p className="text-xs text-gray-400">Open the editor</p>
                    </div>
                  </button>
                  <button
                    onClick={() => router.push(`/resume-results?jobType=${encodeURIComponent(displayRole)}`)}
                    className="flex items-center gap-3 bg-white rounded-2xl border border-gray-100 shadow-sm p-4 hover:border-green-300 hover:bg-green-50 transition-all text-left group"
                  >
                    <span className="text-2xl">⬇</span>
                    <div>
                      <p className="text-sm font-bold text-gray-800 group-hover:text-[#166534]">Download PDF</p>
                      <p className="text-xs text-gray-400">Get tailored resume</p>
                    </div>
                  </button>
                  <button
                    onClick={() => setView("form")}
                    className="flex items-center gap-3 bg-white rounded-2xl border border-gray-100 shadow-sm p-4 hover:border-green-300 hover:bg-green-50 transition-all text-left group"
                  >
                    <span className="text-2xl">🎯</span>
                    <div>
                      <p className="text-sm font-bold text-gray-800 group-hover:text-[#166534]">Retarget Role</p>
                      <p className="text-xs text-gray-400">Change job target</p>
                    </div>
                  </button>
                  <button
                    onClick={() => setView("upload")}
                    className="flex items-center gap-3 bg-white rounded-2xl border border-gray-100 shadow-sm p-4 hover:border-green-300 hover:bg-green-50 transition-all text-left group"
                  >
                    <span className="text-2xl">📤</span>
                    <div>
                      <p className="text-sm font-bold text-gray-800 group-hover:text-[#166534]">New Resume</p>
                      <p className="text-xs text-gray-400">Upload a new PDF</p>
                    </div>
                  </button>
                </div>
              </div>

              {/* No resume yet — CTA nudge */}
              {!dashSaved && (
                <div className="bg-white rounded-2xl border-2 border-dashed border-green-200 p-6 text-center">
                  <p className="text-2xl mb-2">🍁</p>
                  <p className="font-bold text-gray-800 text-sm">No resume yet</p>
                  <p className="text-xs text-gray-400 mt-1 mb-4">Create or upload a resume to unlock your ATS score, job matches, and more.</p>
                  <Button
                    onClick={() => setActiveSection("mapleins-resume")}
                    className="green-gradient text-white font-bold rounded-xl px-6 text-sm"
                  >
                    Get Started →
                  </Button>
                </div>
              )}

              {/* Suggested sectors */}
              {(dashSaved?.suggestedSectors ?? []).length > 0 && (
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
                  <h2 className="text-sm font-bold text-gray-500 uppercase tracking-widest mb-3">Suggested Sectors</h2>
                  <div className="flex flex-wrap gap-2">
                    {dashSaved!.suggestedSectors.map((s) => (
                      <span key={s} className="text-xs px-3 py-1.5 rounded-full bg-green-50 border border-green-200 text-[#166534] font-semibold">{s}</span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ── SECTION: Mapleins Resume ── */}
          {activeSection === "mapleins-resume" && (
            <div className="max-w-3xl mx-auto space-y-5">
              <div>
                <h1 className="text-2xl font-black text-gray-900">🍁 Mapleins Resume</h1>
                <p className="text-sm text-gray-500 mt-1">Create a Canadian ATS-optimized resume from scratch, or manage your existing one.</p>
              </div>

              {/* ── Create new resume ── */}
              <div>
                <h2 className="text-xs font-black text-gray-400 uppercase tracking-widest mb-3">Create New Resume</h2>
                <div className="grid sm:grid-cols-2 gap-4">

                  {/* By Job Title */}
                  <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 flex flex-col gap-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 green-gradient rounded-xl flex items-center justify-center text-white text-lg shadow flex-shrink-0">🎯</div>
                      <div>
                        <p className="font-black text-gray-900 text-sm">By Job Title</p>
                        <p className="text-xs text-gray-400">Enter the role you&apos;re targeting</p>
                      </div>
                    </div>
                    <input
                      type="text"
                      value={newResumeTitle}
                      onChange={(e) => setNewResumeTitle(e.target.value)}
                      placeholder="e.g. Store Manager, Data Analyst…"
                      maxLength={100}
                      className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#166534] focus:border-transparent"
                    />
                    <input
                      type="text"
                      value={newResumeCity}
                      onChange={(e) => setNewResumeCity(e.target.value)}
                      placeholder="City or province (e.g. Toronto, ON)"
                      maxLength={80}
                      className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#166534] focus:border-transparent"
                    />
                    <Button
                      disabled={!newResumeTitle.trim()}
                      onClick={() => {
                        const params = new URLSearchParams({ jobType: newResumeTitle.trim(), city: newResumeCity.trim() || "Canada" });
                        router.push(`/editor?${params.toString()}`);
                      }}
                      className="w-full green-gradient text-white font-bold rounded-xl py-2.5 text-sm disabled:opacity-40"
                    >
                      Create Resume →
                    </Button>
                  </div>

                  {/* By Job Description */}
                  <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 flex flex-col gap-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-blue-50 border border-blue-200 rounded-xl flex items-center justify-center text-lg flex-shrink-0">📋</div>
                      <div>
                        <p className="font-black text-gray-900 text-sm">By Job Description</p>
                        <p className="text-xs text-gray-400">Paste a job posting — AI extracts the role</p>
                      </div>
                    </div>
                    <textarea
                      value={newResumeJD}
                      onChange={(e) => setNewResumeJD(e.target.value)}
                      placeholder="Paste the full job description here. AI will extract the title, required skills, and keywords to build your resume around."
                      rows={4}
                      className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#166534] focus:border-transparent resize-none"
                    />
                    <Button
                      disabled={newResumeJD.trim().length < 30 || jdParsing}
                      onClick={handleCreateFromJD}
                      className="w-full green-gradient text-white font-bold rounded-xl py-2.5 text-sm disabled:opacity-40"
                    >
                      {jdParsing
                        ? <><span className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin mr-2 inline-block" />Extracting role…</>
                        : "Build from Job Description →"}
                    </Button>
                    {jdError && <p className="text-xs text-red-500 font-medium">{jdError}</p>}
                  </div>
                </div>
              </div>

              {/* ── Upload existing ── */}
              <div>
                <h2 className="text-xs font-black text-gray-400 uppercase tracking-widest mb-3">Have an existing resume?</h2>
                <button
                  onClick={() => setView("upload")}
                  className="w-full flex items-center gap-4 bg-white rounded-2xl border border-gray-100 shadow-sm px-5 py-4 hover:border-green-300 hover:bg-green-50/50 transition-all text-left"
                >
                  <div className="w-10 h-10 bg-gray-100 rounded-xl flex items-center justify-center text-lg flex-shrink-0">📤</div>
                  <div className="flex-1">
                    <p className="font-bold text-gray-800 text-sm">Upload PDF Resume</p>
                    <p className="text-xs text-gray-400 mt-0.5">AI reads it, fixes ATS gaps, and rebuilds it for the Canadian market</p>
                  </div>
                  <svg className="w-4 h-4 text-gray-300 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </button>
              </div>

              {/* ── Saved resume ── */}
              {dashSaved && (
                <div>
                  <h2 className="text-xs font-black text-gray-400 uppercase tracking-widest mb-3">Your Saved Resume</h2>
                  <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                    <div className="green-gradient px-6 py-5 flex items-start justify-between">
                      <div>
                        <h2 className="text-lg font-black text-white">{dashSaved.name || "Your Resume"}</h2>
                        <div className="flex flex-wrap gap-3 mt-1">
                          {dashSaved.email && <span className="text-green-100 text-xs">{dashSaved.email}</span>}
                          {dashSaved.phone && <span className="text-green-100 text-xs">{dashSaved.phone}</span>}
                        </div>
                        {dashSaved.targetRole && (
                          <p className="mt-1.5 text-white text-xs font-semibold opacity-90">
                            🎯 {dashSaved.targetRole}{dashSaved.city ? ` · ${dashSaved.city}` : ""}
                          </p>
                        )}
                      </div>
                      {savedUpdatedAt && (
                        <span className="text-green-200 text-[10px] font-semibold flex-shrink-0 mt-1">
                          Updated {new Date(savedUpdatedAt).toLocaleDateString("en-CA", { month: "short", day: "numeric" })}
                        </span>
                      )}
                    </div>

                    {/* Experience preview */}
                    {(dashSaved.experienceByRole ?? []).length > 0 && (
                      <div className="px-6 py-4 border-b border-gray-50">
                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2.5">Work Experience</p>
                        <div className="space-y-2">
                          {(dashSaved.experienceByRole ?? []).slice(0, 3).map((exp, i) => (
                            <div key={i} className="flex items-start gap-2">
                              <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-green-400 flex-shrink-0" />
                              <p className="text-xs text-gray-700">
                                <span className="font-semibold">{exp.role}</span>
                                {exp.company && <span className="text-gray-400"> · {exp.company}</span>}
                              </p>
                            </div>
                          ))}
                          {(dashSaved.experienceByRole ?? []).length > 3 && (
                            <p className="text-[11px] text-gray-400 pl-3.5">+{(dashSaved.experienceByRole ?? []).length - 3} more</p>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Skills preview */}
                    {dashSaved.skills.filter(Boolean).length > 0 && (
                      <div className="px-6 py-4">
                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2.5">Skills</p>
                        <div className="flex flex-wrap gap-1.5">
                          {dashSaved.skills.filter(Boolean).slice(0, 8).map((s) => (
                            <span key={s} className="text-[11px] px-2.5 py-1 rounded-full bg-green-50 border border-green-200 text-[#166534] font-semibold">{s}</span>
                          ))}
                          {dashSaved.skills.filter(Boolean).length > 8 && (
                            <span className="text-[11px] px-2.5 py-1 rounded-full bg-gray-50 border border-gray-200 text-gray-400">+{dashSaved.skills.filter(Boolean).length - 8}</span>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Actions */}
                    <div className="border-t border-gray-100 px-6 py-4 flex flex-wrap gap-2">
                      <Button onClick={() => router.push("/editor")} className="green-gradient text-white font-bold rounded-xl px-4 text-sm">
                        ✏️ Edit
                      </Button>
                      <Button variant="outline" onClick={() => router.push(`/resume-results?jobType=${encodeURIComponent(displayRole)}&city=${encodeURIComponent(displayCity)}&immigrationStatus=`)} className="border-gray-200 text-gray-700 hover:bg-gray-50 font-semibold rounded-xl px-4 text-sm">
                        ⬇ Download PDF
                      </Button>
                      <Button variant="outline" onClick={() => setView("form")} className="border-gray-200 text-gray-700 hover:bg-gray-50 font-semibold rounded-xl px-4 text-sm">
                        🎯 Retarget Role
                      </Button>
                      <Button
                        variant="outline"
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
                        className="border-red-100 text-red-400 hover:bg-red-50 font-semibold rounded-xl px-4 text-sm"
                      >
                        ✕ Clear
                      </Button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ── SECTION: Interview Prep ── */}
          {activeSection === "interview" && (
            <div className="max-w-3xl mx-auto space-y-5">
              <h1 className="text-2xl font-black text-gray-900">🎤 Interview Prep</h1>

              {/* Tabs */}
              <div className="flex gap-1 bg-gray-100 rounded-xl p-1">
                {(["questions", "tips", "star"] as const).map((tab) => (
                  <button
                    key={tab}
                    onClick={() => setInterviewTab(tab)}
                    className={`flex-1 py-2 px-3 rounded-lg text-sm font-semibold transition-colors ${
                      interviewTab === tab
                        ? "bg-white text-[#166534] shadow-sm"
                        : "text-gray-500 hover:text-gray-700"
                    }`}
                  >
                    {tab === "questions" ? "Common Questions" : tab === "tips" ? "Canadian Tips" : "STAR Method"}
                  </button>
                ))}
              </div>

              {/* Common Questions */}
              {interviewTab === "questions" && (
                <div className="space-y-2">
                  {INTERVIEW_QUESTIONS.map((q, i) => (
                    <div key={i} className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                      <button
                        onClick={() => setOpenQuestion(openQuestion === i ? null : i)}
                        className="w-full flex items-center justify-between px-5 py-4 text-left gap-3 hover:bg-gray-50/50 transition-colors"
                      >
                        <div className="flex items-center gap-3">
                          <span className="flex-shrink-0 w-6 h-6 rounded-full bg-green-100 text-[#166534] text-[10px] font-black flex items-center justify-center">{i + 1}</span>
                          <p className="text-sm font-semibold text-gray-800">{q.question}</p>
                        </div>
                        <svg
                          className={`w-4 h-4 text-gray-400 flex-shrink-0 transition-transform duration-200 ${openQuestion === i ? "rotate-180" : ""}`}
                          fill="none" viewBox="0 0 24 24" stroke="currentColor"
                        >
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                      </button>
                      {openQuestion === i && (
                        <div className="border-t border-gray-100">
                          {/* Tip banner */}
                          <div className="flex items-start gap-2 px-5 py-3 bg-amber-50 border-b border-amber-100">
                            <span className="text-amber-500 text-sm mt-0.5 flex-shrink-0">💡</span>
                            <p className="text-xs text-amber-800 font-medium leading-relaxed">{q.tip}</p>
                          </div>
                          {/* Answer */}
                          <div className="px-5 py-4 space-y-3">
                            <p className="text-[11px] font-black text-[#166534] uppercase tracking-widest">Sample Answer</p>
                            {q.answer.split("\n\n").map((para, pi) => (
                              <p key={pi} className={`text-sm leading-relaxed ${para.startsWith("Example:") || para.startsWith("Research tip:") ? "text-gray-800 bg-green-50 border border-green-100 rounded-xl px-4 py-3" : "text-gray-600"}`}>
                                {para}
                              </p>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {/* Canadian Tips */}
              {interviewTab === "tips" && (
                <div className="grid gap-3 sm:grid-cols-2">
                  {CANADIAN_TIPS.map((tip, i) => (
                    <div key={i} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
                      <div className="text-2xl mb-2">{tip.icon}</div>
                      <p className="text-sm text-gray-700 leading-relaxed">{tip.tip}</p>
                    </div>
                  ))}
                </div>
              )}

              {/* STAR Method */}
              {interviewTab === "star" && (
                <div className="space-y-4">
                  <div className="grid gap-3 sm:grid-cols-2">
                    {[
                      { letter: "S", label: "Situation", desc: "Set the scene — where were you, what was the context?", color: "bg-blue-50 border-blue-200 text-blue-800" },
                      { letter: "T", label: "Task", desc: "What was your specific responsibility or challenge?", color: "bg-amber-50 border-amber-200 text-amber-800" },
                      { letter: "A", label: "Action", desc: "What did YOU specifically do? Focus on your contribution.", color: "bg-green-50 border-green-200 text-green-800" },
                      { letter: "R", label: "Result", desc: "What was the outcome? Use numbers whenever possible.", color: "bg-purple-50 border-purple-200 text-purple-800" },
                    ].map((item) => (
                      <div key={item.letter} className={`rounded-2xl border p-5 ${item.color}`}>
                        <div className="flex items-center gap-3 mb-2">
                          <span className="text-2xl font-black">{item.letter}</span>
                          <span className="font-bold text-sm">{item.label}</span>
                        </div>
                        <p className="text-sm leading-relaxed opacity-80">{item.desc}</p>
                      </div>
                    ))}
                  </div>

                  {/* Sample STAR answer */}
                  <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
                    <h3 className="text-sm font-bold text-gray-500 uppercase tracking-widest mb-3">Sample STAR Answer</h3>
                    <p className="text-sm font-semibold text-gray-700 mb-3">Q: &quot;Tell me about a time you improved a process.&quot;</p>
                    <div className="space-y-2.5">
                      <p className="text-sm text-gray-600 leading-relaxed"><span className="font-bold text-blue-700">S:</span> In my previous role as a logistics coordinator, our order tracking was done manually via spreadsheets, causing frequent errors and delays.</p>
                      <p className="text-sm text-gray-600 leading-relaxed"><span className="font-bold text-amber-700">T:</span> I was tasked with reducing order errors by 20% within one quarter.</p>
                      <p className="text-sm text-gray-600 leading-relaxed"><span className="font-bold text-green-700">A:</span> I researched affordable tracking tools, proposed a solution to management, and led a 2-week pilot with the team, training 8 staff members.</p>
                      <p className="text-sm text-gray-600 leading-relaxed"><span className="font-bold text-purple-700">R:</span> Order errors dropped by 35% in the first month, saving approximately $12,000 in rework costs per quarter.</p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ── SECTION: Job Checklist ── */}
          {activeSection === "checklist" && (
            <div className="max-w-3xl mx-auto space-y-5">
              <div className="flex items-center justify-between">
                <h1 className="text-2xl font-black text-gray-900">✅ Job Checklist</h1>
                <span className="text-sm font-semibold text-gray-500">{completedCount} / {TOTAL_CHECKLIST_ITEMS}</span>
              </div>

              {/* Progress bar */}
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-semibold text-gray-700">Overall Progress</span>
                  <span className="text-sm font-bold text-[#166534]">{Math.round((completedCount / TOTAL_CHECKLIST_ITEMS) * 100)}%</span>
                </div>
                <div className="w-full bg-gray-100 rounded-full h-3">
                  <div
                    className="h-3 rounded-full green-gradient transition-all duration-300"
                    style={{ width: `${(completedCount / TOTAL_CHECKLIST_ITEMS) * 100}%` }}
                  />
                </div>
                {completedCount === TOTAL_CHECKLIST_ITEMS && (
                  <p className="mt-3 text-sm font-bold text-[#166534] text-center">🎉 All done! You&apos;re job-search ready.</p>
                )}
              </div>

              {/* Categories */}
              {CHECKLIST_CATEGORIES.map((cat) => {
                const catCompleted = cat.items.filter((item) => checkedItems.has(item.id)).length;
                const isOpen = openCategories.has(cat.id);
                return (
                  <div key={cat.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                    <button
                      onClick={() => toggleCategory(cat.id)}
                      className="w-full flex items-center justify-between px-5 py-4 hover:bg-gray-50 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <span className="text-sm font-bold text-gray-800">{cat.title}</span>
                        <span className="text-xs font-semibold text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">
                          {catCompleted}/{cat.items.length}
                        </span>
                      </div>
                      <svg
                        className={`w-4 h-4 text-gray-400 transition-transform ${isOpen ? "rotate-180" : ""}`}
                        fill="none" viewBox="0 0 24 24" stroke="currentColor"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </button>
                    {isOpen && (
                      <div className="border-t border-gray-50 divide-y divide-gray-50">
                        {cat.items.map((item) => (
                          <label
                            key={item.id}
                            className="flex items-start gap-3 px-5 py-3.5 hover:bg-gray-50 cursor-pointer transition-colors"
                          >
                            <input
                              type="checkbox"
                              checked={checkedItems.has(item.id)}
                              onChange={() => toggleCheck(item.id)}
                              className="mt-0.5 h-4 w-4 rounded border-gray-300 text-[#166534] focus:ring-[#166534] flex-shrink-0 accent-[#166534]"
                            />
                            <span className={`text-sm leading-relaxed ${checkedItems.has(item.id) ? "line-through text-gray-400" : "text-gray-700"}`}>
                              {item.label}
                            </span>
                          </label>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {/* ── SECTION: Job Search ── */}
          {activeSection === "jobsearch" && (
            <div className="max-w-3xl mx-auto space-y-5">
              <div>
                <h1 className="text-2xl font-black text-gray-900">🔍 Job Search</h1>
                <p className="mt-1 text-sm text-gray-500">
                  Top job boards for <span className="font-semibold text-gray-700">{displayRole}</span> in <span className="font-semibold text-gray-700">{displayCity}</span>
                </p>
              </div>

              {/* Job board cards */}
              <div className="grid gap-3 sm:grid-cols-2">
                {JOB_BOARDS.map((board) => (
                  <div key={board.name} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 flex flex-col gap-3">
                    <div className="flex items-start gap-3">
                      <span className="text-2xl flex-shrink-0">{board.icon}</span>
                      <div className="flex-1 min-w-0">
                        <p className="font-bold text-gray-800 text-sm">{board.name}</p>
                        <p className="text-xs text-gray-500 mt-0.5 leading-relaxed">{board.description}</p>
                      </div>
                    </div>
                    <a
                      href={buildJobUrl(board.urlTemplate, displayRole, displayCity)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-auto inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl bg-green-50 border border-green-200 text-[#166534] text-sm font-bold hover:bg-green-100 transition-colors"
                    >
                      Search → <span className="text-xs opacity-70">↗</span>
                    </a>
                  </div>
                ))}
              </div>

              {/* Pro tip */}
              <div className="bg-amber-50 rounded-2xl border border-amber-200 p-5 flex items-start gap-3">
                <span className="text-xl flex-shrink-0">💡</span>
                <div>
                  <p className="text-sm font-bold text-amber-800">Pro tip</p>
                  <p className="text-sm text-amber-700 mt-0.5">Apply within 48 hours of posting — Canadian employers move fast and often close roles early.</p>
                </div>
              </div>
            </div>
          )}

        </main>
      </div>

      {/* ── Mobile bottom tab bar ── */}
      <nav className="sm:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-100 z-30 flex">
        {navItems.map((item) => (
          <button
            key={item.id}
            onClick={() => setActiveSection(item.id)}
            className={`flex-1 flex flex-col items-center justify-center py-2.5 gap-0.5 transition-colors ${
              activeSection === item.id ? "text-[#166534]" : "text-gray-400 hover:text-gray-600"
            }`}
          >
            <span className="text-lg leading-none">{item.icon}</span>
            <span className="text-[10px] font-semibold leading-none">{item.label.split(" ").pop()}</span>
          </button>
        ))}
      </nav>
    </div>
  );
}
