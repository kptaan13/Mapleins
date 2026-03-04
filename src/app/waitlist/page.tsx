"use client";

import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { WAITLIST_ONLY } from "@/lib/constants";

export default function WaitlistPage() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [jobType, setJobType] = useState("");
  const [city, setCity] = useState("");
  const [status, setStatus] = useState<"idle" | "submitting" | "success" | "error">("idle");
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) {
      setError("Email is required.");
      return;
    }
    setStatus("submitting");
    setError(null);
    try {
      const res = await fetch("/api/waitlist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, jobType, city }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || data.error) {
        throw new Error(data.error || "Something went wrong.");
      }
      setStatus("success");
    } catch (err) {
      setStatus("error");
      setError(err instanceof Error ? err.message : "Something went wrong. Please try again.");
    }
  };

  return (
    <div className="min-h-screen bg-[#f8faf9] overflow-hidden relative">
      {/* Decorative background elements */}
      <div className="absolute top-0 left-1/4 w-[600px] h-[600px] bg-green-50/50 rounded-full blur-3xl -z-10" />
      <div className="absolute bottom-0 right-1/4 w-[500px] h-[500px] bg-green-100/30 rounded-full blur-3xl -z-10" />

      {/* ── Header ── */}
      <header className="glass-morphism sticky top-0 bg-white/95 z-50 border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 group">
            <div className="w-8 h-8 green-gradient rounded-lg flex items-center justify-center text-white font-bold text-xs shadow-md transition-transform group-hover:scale-110">M</div>
            <span className="text-xl font-bold text-gray-900 tracking-tight">Mapleins</span>
          </Link>
          {!WAITLIST_ONLY && (
            <div className="flex items-center gap-6">
              <Link href="/login" className="text-sm font-bold text-gray-500 hover:text-[#166534] transition-colors">Sign in</Link>
              <Link href="/signup" className="text-sm font-bold text-[#166534] hover:underline transition-colors px-4 py-2 bg-green-50 rounded-xl">Get started</Link>
            </div>
          )}
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 sm:px-6 py-20 relative z-10">
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-green-50 border border-green-100 text-[#166534] text-[10px] font-black uppercase tracking-widest mb-6 reveal-up">
            <span className="flex h-2 w-2 rounded-full bg-[#166534] animate-pulse" />
            Limited Early Access
          </div>
          <h1 className="text-4xl md:text-5xl font-black text-gray-900 tracking-tight mb-6 reveal-up stagger-1">
            Join the <span className="text-gradient">Mapleins Priority List</span>
          </h1>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto leading-relaxed reveal-up stagger-2">
            Be the first to access our premium interview prep tools and localized Canadian job search playbooks. We&apos;re onboarding new users in weekly cohorts.
          </p>
        </div>

        <div className="max-w-xl mx-auto reveal-up stagger-3">
          <form onSubmit={handleSubmit} className="glass-card p-8 sm:p-10 bg-white/60 backdrop-blur-xl space-y-6">
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black uppercase tracking-widest text-[#166534] opacity-70 ml-1" htmlFor="name">
                    Full Name
                  </label>
                  <input
                    id="name"
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="E.g. Ali Khan"
                    className="w-full bg-white/50 border border-gray-100 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-[#166534] transition-all outline-none font-medium text-gray-700"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black uppercase tracking-widest text-[#166534] opacity-70 ml-1" htmlFor="email">
                    Email Address *
                  </label>
                  <input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@email.com"
                    required
                    className="w-full bg-white/50 border border-gray-100 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-[#166534] transition-all outline-none font-medium text-gray-700"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black uppercase tracking-widest text-[#166534] opacity-70 ml-1" htmlFor="jobType">
                    Target Role
                  </label>
                  <input
                    id="jobType"
                    type="text"
                    value={jobType}
                    onChange={(e) => setJobType(e.target.value)}
                    placeholder="e.g. Data Analyst"
                    className="w-full bg-white/50 border border-gray-100 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-[#166534] transition-all outline-none font-medium text-gray-700"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black uppercase tracking-widest text-[#166534] opacity-70 ml-1" htmlFor="city">
                    Preferred City
                  </label>
                  <input
                    id="city"
                    type="text"
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    placeholder="e.g. Toronto, ON"
                    className="w-full bg-white/50 border border-gray-100 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-[#166534] transition-all outline-none font-medium text-gray-700"
                  />
                </div>
              </div>
            </div>

            {status === "error" && error && (
              <div className="rounded-xl bg-red-50 border border-red-100 text-red-700 px-4 py-3 text-xs font-bold animate-in fade-in slide-in-from-top-2">
                ⚠ {error}
              </div>
            )}

            {status === "success" ? (
              <div className="rounded-2xl bg-green-50 border border-green-100 text-[#166534] p-6 text-center animate-in zoom-in duration-500">
                <div className="text-4xl mb-4">🍁</div>
                <h3 className="text-lg font-black mb-2">You&apos;re on the list!</h3>
                <p className="text-sm font-medium opacity-80 leading-relaxed">
                  We&apos;ve secured your spot. Keep an eye on your inbox for our next cohort invitation and exclusive job search resources.
                </p>
              </div>
            ) : (
              <Button
                type="submit"
                disabled={status === "submitting"}
                className="w-full green-gradient text-white font-bold py-7 h-auto rounded-2xl shadow-xl hover:shadow-2xl hover:scale-[1.02] transition-all disabled:opacity-50 text-base"
              >
                {status === "submitting" ? (
                  <span className="flex items-center gap-2">
                    <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Securing your spot...
                  </span>
                ) : (
                  "Join the Waitlist →"
                )}
              </Button>
            )}
          </form>

          <p className="mt-8 text-center text-xs font-bold text-gray-300 uppercase tracking-[0.2em] reveal-up stagger-4">
            Privacy First · Built for Canada · No Spam
          </p>
        </div>
      </main>

      <footer className="max-w-4xl mx-auto px-4 py-12 text-center text-[10px] font-bold text-gray-400 uppercase tracking-widest reveal-up stagger-4">
        © {new Date().getFullYear()} Mapleins Technologies. All rights reserved.
      </footer>
    </div>
  );
}
