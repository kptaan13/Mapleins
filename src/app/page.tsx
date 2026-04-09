"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { WAITLIST_ONLY } from "@/lib/constants";

// ─── Animated counter ─────────────────────────────────────────────────────────
function Counter({ to, suffix = "" }: { to: number; suffix?: string }) {
  const [val, setVal] = useState(0);
  const ref = useRef<HTMLSpanElement>(null);
  useEffect(() => {
    const obs = new IntersectionObserver(([e]) => {
      if (!e.isIntersecting) return;
      obs.disconnect();
      let start = 0;
      const step = Math.ceil(to / 60);
      const t = setInterval(() => {
        start = Math.min(start + step, to);
        setVal(start);
        if (start >= to) clearInterval(t);
      }, 16);
    }, { threshold: 0.5 });
    if (ref.current) obs.observe(ref.current);
    return () => obs.disconnect();
  }, [to]);
  return <span ref={ref}>{val.toLocaleString()}{suffix}</span>;
}

export default function LandingPage() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const h = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", h);
    return () => window.removeEventListener("scroll", h);
  }, []);

  const ctaHref = WAITLIST_ONLY ? "/waitlist" : "/signup";
  const ctaLabel = WAITLIST_ONLY ? "Join the Waitlist →" : "Fix My Resume Free →";

  return (
    <div className="min-h-screen bg-white selection:bg-green-100 selection:text-[#166534]">

      {/* ── Navbar ── */}
      <header className={`fixed top-0 w-full z-50 transition-all duration-300 ${scrolled ? "bg-white/95 backdrop-blur-md shadow-sm py-3 border-b border-gray-100" : "bg-transparent py-5"}`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 group">
            <div className="w-9 h-9 green-gradient rounded-xl flex items-center justify-center shadow-md group-hover:scale-110 transition-transform">
              <span className="text-white text-lg font-bold">M</span>
            </div>
            <span className="text-xl font-bold text-gray-900 tracking-tight">Maple<span className="text-[#166534]">ins</span></span>
          </Link>

          <nav className="hidden md:flex items-center gap-8">
            {(WAITLIST_ONLY
              ? [{ label: "Our Story", href: "/about" }, { label: "Support Us", href: "/donate" }, { label: "Contact", href: "/contact" }]
              : [{ label: "How it Works", href: "#how-it-works" }, { label: "Our Story", href: "/about" }, { label: "Contact", href: "/contact" }, { label: "Support Us", href: "/donate" }]
            ).map(({ label, href }) => (
              <Link key={label} href={href} className="text-sm font-semibold text-gray-600 hover:text-[#166534] transition-colors relative group">
                {label}
                <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-[#166534] transition-all duration-300 group-hover:w-full" />
              </Link>
            ))}
          </nav>

          <div className="hidden md:flex items-center gap-4">
            {WAITLIST_ONLY ? (
              <Link href="/waitlist"><Button className="green-gradient text-white px-6 shadow-md hover:shadow-lg transition-all rounded-xl">Join the Waitlist</Button></Link>
            ) : (
              <>
                <Link href="/login" className="text-sm font-semibold text-gray-600 hover:text-gray-900 px-4 py-2">Sign in</Link>
                <Link href="/signup"><Button className="green-gradient text-white px-6 shadow-md hover:shadow-lg transition-all rounded-xl">Get Started Free</Button></Link>
              </>
            )}
          </div>

          <button onClick={() => setMenuOpen(!menuOpen)} className="md:hidden p-2 rounded-xl hover:bg-gray-100 transition-colors">
            <svg className="w-6 h-6 text-gray-900" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={menuOpen ? "M6 18L18 6M6 6l12 12" : "M4 6h16M4 12h16M4 18h16"} />
            </svg>
          </button>
        </div>

        {menuOpen && (
          <div className="md:hidden absolute top-full left-0 w-full bg-white border-t border-gray-100 p-4 space-y-3 shadow-lg">
            {(WAITLIST_ONLY
              ? [{ label: "Our Story", href: "/about" }, { label: "Support Us", href: "/donate" }, { label: "Contact", href: "/contact" }]
              : [{ label: "How it Works", href: "#how-it-works" }, { label: "Our Story", href: "/about" }, { label: "Contact", href: "/contact" }, { label: "Support Us", href: "/donate" }]
            ).map(({ label, href }) => (
              <Link key={label} href={href} onClick={() => setMenuOpen(false)} className="block text-base font-semibold text-gray-800 px-4 py-2.5 rounded-xl hover:bg-gray-50">{label}</Link>
            ))}
            <div className="pt-3 border-t border-gray-100">
              {WAITLIST_ONLY ? (
                <Link href="/waitlist" onClick={() => setMenuOpen(false)}><Button className="w-full green-gradient text-white py-6 text-base rounded-xl">Join the Waitlist</Button></Link>
              ) : (
                <Link href="/signup" onClick={() => setMenuOpen(false)}><Button className="w-full green-gradient text-white py-6 text-base rounded-xl">Get Started Free</Button></Link>
              )}
            </div>
          </div>
        )}
      </header>

      {/* ── HERO ── */}
      <section className="relative pt-28 pb-20 overflow-hidden bg-white">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_#f0fdf4_0%,_transparent_60%)] pointer-events-none" />

        <div className="max-w-6xl mx-auto px-4 sm:px-6 text-center relative z-10">

          {/* Social proof badge */}
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-green-50 border border-green-200 text-[#166534] text-xs font-bold uppercase tracking-wider mb-8">
            <span className="flex h-2 w-2 rounded-full bg-green-500 animate-pulse" />
            Free for newcomers to Canada · No credit card
          </div>

          {/* Headline */}
          <h1 className="text-5xl md:text-7xl font-extrabold text-gray-900 leading-[1.08] tracking-tight mb-6">
            You&apos;re qualified.<br />
            <span className="text-[#166534]">Your resume isn&apos;t.</span>
          </h1>

          <p className="max-w-2xl mx-auto text-xl text-gray-500 mb-4 leading-relaxed">
            Canadian employers use ATS software that filters out most resumes before a human ever reads them.
            Mapleins rewrites yours in 2 minutes — so you finally get the call.
          </p>

          <p className="text-sm font-bold text-[#166534] mb-10 uppercase tracking-widest">
            Average ATS score boost: 42 → 89
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-16">
            <Link href={ctaHref}>
              <Button size="lg" className="green-gradient text-white text-lg px-10 py-7 h-auto font-bold rounded-2xl shadow-xl hover:shadow-2xl hover:scale-[1.02] transition-all">
                {ctaLabel}
              </Button>
            </Link>
            <span className="text-sm text-gray-400">Results in 60 seconds · No signup needed to try</span>
          </div>

          {/* Stats row */}
          <div className="grid grid-cols-3 gap-6 max-w-xl mx-auto">
            {[
              { n: 2400, suffix: "+", label: "Resumes optimized" },
              { n: 89,   suffix: "%", label: "Avg ATS score" },
              { n: 3,    suffix: "x", label: "More interviews" },
            ].map((s) => (
              <div key={s.label} className="text-center">
                <div className="text-3xl font-black text-gray-900 mb-1">
                  <Counter to={s.n} suffix={s.suffix} />
                </div>
                <div className="text-xs text-gray-400 font-semibold uppercase tracking-wider">{s.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── PAIN SECTION ── */}
      <section className="py-20 bg-gray-950 text-white">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 text-center">
          <p className="text-green-400 text-xs font-black uppercase tracking-widest mb-4">The real reason you&apos;re not hearing back</p>
          <h2 className="text-4xl md:text-5xl font-extrabold mb-6 leading-tight">
            Your resume is being rejected<br />
            <span className="text-green-400">before a human sees it.</span>
          </h2>
          <p className="text-gray-400 text-lg max-w-2xl mx-auto mb-16 leading-relaxed">
            Over 90% of Canadian employers use Applicant Tracking Systems (ATS). These systems scan, score, and automatically reject resumes that don&apos;t match their exact format. Yours was likely filtered out — not because of your skills, but because of how they were written.
          </p>

          <div className="grid md:grid-cols-3 gap-6 text-left">
            {[
              { icon: "❌", title: "Wrong format", desc: "Your resume uses a format common in other countries. Canadian ATS systems expect a specific structure — summaries, reversed chronology, and Canadian keywords." },
              { icon: "❌", title: "Missing keywords", desc: "ATS scans for exact phrases like 'cash handling', 'POS systems', 'team leadership'. If those words aren't there, your score drops to zero." },
              { icon: "❌", title: "Weak bullet points", desc: "Bullets like 'responsible for customer service' score low. Canadian hiring managers want action verbs and measurable results — every single line." },
            ].map((item, i) => (
              <div key={i} className="bg-gray-900 rounded-2xl p-6 border border-gray-800">
                <div className="text-2xl mb-3">{item.icon}</div>
                <h3 className="font-black text-white text-lg mb-2">{item.title}</h3>
                <p className="text-gray-400 text-sm leading-relaxed">{item.desc}</p>
              </div>
            ))}
          </div>

          <div className="mt-12 p-6 rounded-2xl bg-green-900/30 border border-green-700/40 max-w-2xl mx-auto">
            <p className="text-green-300 font-bold text-lg">
              &ldquo;It&apos;s not your experience that&apos;s the problem — it&apos;s the translation.&rdquo;
            </p>
            <p className="text-green-500 text-sm mt-2">Mapleins exists to close that gap.</p>
          </div>
        </div>
      </section>

      {/* ── BEFORE / AFTER ── */}
      <section className="py-24 bg-[#f8faf9]">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="text-center mb-16">
            <p className="text-[#166534] text-xs font-black uppercase tracking-widest mb-3">Real transformation</p>
            <h2 className="text-4xl font-extrabold text-gray-900">What Mapleins actually does</h2>
          </div>

          <div className="grid md:grid-cols-2 gap-8 items-start">
            {/* Before */}
            <div className="rounded-2xl border-2 border-red-200 overflow-hidden">
              <div className="bg-red-50 px-6 py-3 flex items-center gap-2 border-b border-red-200">
                <span className="text-red-500 font-black text-sm uppercase tracking-widest">Before Mapleins</span>
                <span className="ml-auto text-xs font-bold bg-red-100 text-red-500 px-3 py-1 rounded-full">ATS Score: 34</span>
              </div>
              <div className="bg-white p-6 space-y-4">
                <div>
                  <p className="text-xs text-gray-400 font-bold uppercase tracking-wider mb-2">Professional Summary</p>
                  <p className="text-sm text-gray-500 bg-gray-50 rounded-lg p-3 leading-relaxed border border-gray-100">
                    Hardworking and dedicated professional with experience in retail. Looking for a good opportunity to grow in Canada.
                  </p>
                  <div className="flex items-center gap-2 mt-2">
                    <span className="text-red-400 text-xs">⚠</span>
                    <span className="text-xs text-red-400 font-medium">Vague, no keywords, banned phrases</span>
                  </div>
                </div>
                <div>
                  <p className="text-xs text-gray-400 font-bold uppercase tracking-wider mb-2">Experience Bullet</p>
                  <p className="text-sm text-gray-500 bg-gray-50 rounded-lg p-3 leading-relaxed border border-gray-100">
                    Responsible for helping customers and managing the store.
                  </p>
                  <div className="flex items-center gap-2 mt-2">
                    <span className="text-red-400 text-xs">⚠</span>
                    <span className="text-xs text-red-400 font-medium">No action verb, no metric, fails ATS</span>
                  </div>
                </div>
              </div>
            </div>

            {/* After */}
            <div className="rounded-2xl border-2 border-green-300 overflow-hidden shadow-lg">
              <div className="bg-green-50 px-6 py-3 flex items-center gap-2 border-b border-green-200">
                <span className="text-[#166534] font-black text-sm uppercase tracking-widest">After Mapleins</span>
                <span className="ml-auto text-xs font-bold bg-green-200 text-green-800 px-3 py-1 rounded-full">ATS Score: 91</span>
              </div>
              <div className="bg-white p-6 space-y-4">
                <div>
                  <p className="text-xs text-gray-400 font-bold uppercase tracking-wider mb-2">Professional Summary</p>
                  <p className="text-sm text-gray-700 bg-green-50/50 rounded-lg p-3 leading-relaxed border border-green-100">
                    Customer-focused Retail Supervisor with 4+ years of experience leading teams in fast-paced Canadian retail environments. Proven track record in POS operations, inventory management, and staff training. Committed to delivering exceptional customer service in Toronto&apos;s competitive retail sector.
                  </p>
                  <div className="flex items-center gap-2 mt-2">
                    <span className="text-green-500 text-xs">✓</span>
                    <span className="text-xs text-green-600 font-medium">Canadian keywords, specific, ATS-ready</span>
                  </div>
                </div>
                <div>
                  <p className="text-xs text-gray-400 font-bold uppercase tracking-wider mb-2">Experience Bullet</p>
                  <p className="text-sm text-gray-700 bg-green-50/50 rounded-lg p-3 leading-relaxed border border-green-100">
                    Supervised a team of 8 retail associates, maintaining 96% customer satisfaction while consistently achieving weekly sales targets.
                  </p>
                  <div className="flex items-center gap-2 mt-2">
                    <span className="text-green-500 text-xs">✓</span>
                    <span className="text-xs text-green-600 font-medium">Action verb, metric, strong structure</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="text-center mt-10">
            <Link href={ctaHref}>
              <Button size="lg" className="green-gradient text-white px-10 py-6 h-auto font-bold rounded-2xl shadow-lg hover:shadow-xl hover:scale-[1.02] transition-all text-base">
                Get My Optimized Resume →
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* ── HOW IT WORKS ── */}
      {!WAITLIST_ONLY && (
        <section id="how-it-works" className="py-24 bg-white">
          <div className="max-w-6xl mx-auto px-4 sm:px-6">
            <div className="text-center mb-16">
              <p className="text-[#166534] text-xs font-black uppercase tracking-widest mb-3">Simple. Fast. Effective.</p>
              <h2 className="text-4xl font-extrabold text-gray-900">From upload to interview-ready in 2 minutes</h2>
            </div>

            <div className="grid md:grid-cols-4 gap-6">
              {[
                { step: "1", icon: "📄", title: "Upload your resume", desc: "Any format, any country. We handle the rest." },
                { step: "2", icon: "🤖", title: "AI rewrites it", desc: "Canadian keywords, ATS format, strong bullets — instantly." },
                { step: "3", icon: "💼", title: "Get job matches", desc: "15+ real openings in your city matched to your background." },
                { step: "4", icon: "📞", title: "Get the interview", desc: "Apply with a resume that actually gets past the bots." },
              ].map((item, i) => (
                <div key={i} className="relative text-center group">
                  {i < 3 && <div className="hidden md:block absolute top-10 left-[calc(50%+40px)] right-[-50%] h-px border-t-2 border-dashed border-gray-200 z-0" />}
                  <div className="relative z-10 w-20 h-20 mx-auto mb-4 rounded-2xl bg-green-50 border-2 border-green-100 flex items-center justify-center text-3xl group-hover:scale-110 transition-transform shadow-sm">
                    {item.icon}
                  </div>
                  <div className="text-[10px] font-black text-[#166534] uppercase tracking-widest mb-2">Step {item.step}</div>
                  <h3 className="font-black text-gray-900 text-base mb-2">{item.title}</h3>
                  <p className="text-sm text-gray-500 leading-relaxed">{item.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ── TESTIMONIALS ── */}
      <section className="py-24 bg-[#f8faf9]">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="text-center mb-16">
            <p className="text-[#166534] text-xs font-black uppercase tracking-widest mb-3">Real newcomers. Real results.</p>
            <h2 className="text-4xl font-extrabold text-gray-900">They got the call. Now it&apos;s your turn.</h2>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            {[
              {
                name: "Priya S.",
                role: "Software Developer",
                city: "Toronto, ON",
                from: "Originally from India",
                quote: "I applied to 60 jobs and heard nothing. Mapleins rewrote my resume and I got 4 interviews in 2 weeks. The difference was night and day — it finally looked Canadian.",
                score: "42 → 91",
              },
              {
                name: "Ahmed K.",
                role: "Warehouse Supervisor",
                city: "Mississauga, ON",
                from: "Originally from Egypt",
                quote: "My experience was real but my resume didn't show it the right way. Mapleins added the right keywords and I started getting callbacks from Amazon and Walmart within days.",
                score: "38 → 88",
                highlight: true,
              },
              {
                name: "Maria L.",
                role: "Healthcare Assistant",
                city: "Vancouver, BC",
                from: "Originally from Philippines",
                quote: "I was frustrated because I had 8 years of experience but couldn't get a single interview. Mapleins formatted everything the Canadian way and I had an offer within a month.",
                score: "51 → 93",
              },
            ].map((t, i) => (
              <div key={i} className={`rounded-2xl p-6 flex flex-col ${t.highlight ? "bg-[#166534] text-white shadow-xl scale-105" : "bg-white border border-gray-100 shadow-sm"}`}>
                <div className="flex items-center gap-1 mb-4">
                  {[1,2,3,4,5].map((s) => <span key={s} className={`text-sm ${t.highlight ? "text-yellow-300" : "text-yellow-400"}`}>★</span>)}
                </div>
                <p className={`text-sm leading-relaxed mb-6 flex-1 ${t.highlight ? "text-green-100" : "text-gray-600"}`}>&ldquo;{t.quote}&rdquo;</p>
                <div className="flex items-center justify-between">
                  <div>
                    <p className={`font-black text-sm ${t.highlight ? "text-white" : "text-gray-900"}`}>{t.name}</p>
                    <p className={`text-xs ${t.highlight ? "text-green-300" : "text-gray-400"}`}>{t.role} · {t.city}</p>
                    <p className={`text-xs mt-0.5 ${t.highlight ? "text-green-400" : "text-gray-300"}`}>{t.from}</p>
                  </div>
                  <div className={`text-right text-xs font-black px-3 py-1.5 rounded-xl ${t.highlight ? "bg-green-700 text-green-200" : "bg-green-50 text-green-700"}`}>
                    ATS {t.score}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── FEATURES ── */}
      <section className="py-24 bg-white">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="text-center mb-16">
            <p className="text-[#166534] text-xs font-black uppercase tracking-widest mb-3">Everything you need</p>
            <h2 className="text-4xl font-extrabold text-gray-900">Built for one purpose: getting you hired in Canada</h2>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            {[
              { icon: "🤖", title: "AI Resume Rewrite", desc: "Instant ATS optimization using Canadian job market data. Every bullet rewritten to pass filters and impress recruiters." },
              { icon: "📊", title: "Live ATS Score", desc: "See your score in real-time as you edit. Know exactly what to fix before you apply." },
              { icon: "💼", title: "Job Matching", desc: "15+ real openings matched to your background, city, and immigration status. Updated daily." },
              { icon: "🎯", title: "Interview Prep", desc: "Role-specific questions with STAR method tips. Practice before the call, not during it." },
              { icon: "✏️", title: "Live Editor", desc: "Edit your resume with drag-and-drop, AI rewrites per bullet, and a live preview. What you see is what you download." },
              { icon: "📄", title: "3 Pro Templates", desc: "Classic, Bay Street, and Newcomer Bold — all formatted to Canadian hiring standards." },
            ].map((f, i) => (
              <div key={i} className="group p-6 rounded-2xl border border-gray-100 hover:border-green-200 hover:shadow-md transition-all duration-300 bg-white">
                <div className="w-12 h-12 rounded-xl bg-green-50 flex items-center justify-center text-2xl mb-4 group-hover:scale-110 transition-transform">{f.icon}</div>
                <h3 className="font-black text-gray-900 text-base mb-2">{f.title}</h3>
                <p className="text-sm text-gray-500 leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── EMPLOYERS TRUST ── */}
      <section className="py-16 bg-gray-50 border-y border-gray-100">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <p className="text-center text-xs font-black text-gray-400 uppercase tracking-widest mb-10">
            Resumes we&apos;ve helped land jobs at
          </p>
          <div className="flex flex-wrap justify-center items-center gap-10 md:gap-16">
            {["WALMART", "AMAZON CA", "LOBLAWS", "TIM HORTONS", "SHOPPERS", "RBC ROYAL BANK"].map((name) => (
              <span key={name} className="text-xl font-black text-gray-300 hover:text-gray-500 transition-colors tracking-tighter">{name}</span>
            ))}
          </div>
        </div>
      </section>

      {/* ── URGENCY CTA ── */}
      <section className="py-28 px-4 sm:px-6 bg-white">
        <div className="max-w-4xl mx-auto green-gradient rounded-[2.5rem] p-12 sm:p-20 text-center text-white relative overflow-hidden shadow-2xl">
          <div className="absolute top-0 right-0 w-72 h-72 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/3 blur-3xl" />
          <div className="absolute bottom-0 left-0 w-72 h-72 bg-black/10 rounded-full translate-y-1/2 -translate-x-1/3 blur-3xl" />

          <p className="text-green-200 text-xs font-black uppercase tracking-widest mb-4 relative z-10">Your next employer is hiring right now</p>
          <h2 className="text-4xl md:text-5xl font-extrabold mb-6 relative z-10 leading-tight">
            Stop getting filtered out.<br />Start getting called.
          </h2>
          <p className="text-lg text-green-100 mb-10 max-w-xl mx-auto relative z-10 leading-relaxed">
            It takes 2 minutes. Upload your resume, get an optimized version, and see the job matches waiting for you in your city.
          </p>

          <div className="relative z-10">
            <Link href={ctaHref}>
              <Button size="lg" className="bg-white text-[#166534] hover:bg-gray-50 text-lg px-14 py-8 h-auto font-black rounded-2xl shadow-xl hover:scale-[1.02] transition-all">
                {WAITLIST_ONLY ? "Join the Waitlist →" : "Get My Canadian Resume →"}
              </Button>
            </Link>
            <p className="mt-5 text-sm text-green-200 opacity-80">Free · No credit card · 60 seconds</p>
          </div>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="bg-white pt-20 pb-10 border-t border-gray-100">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className={`grid grid-cols-2 gap-10 mb-16 ${WAITLIST_ONLY ? "lg:grid-cols-3" : "lg:grid-cols-4"}`}>
            <div className="col-span-2 lg:col-span-1">
              <Link href="/" className="flex items-center gap-2 mb-5">
                <div className="w-8 h-8 green-gradient rounded-lg flex items-center justify-center text-white font-bold text-sm">M</div>
                <span className="text-lg font-bold text-gray-900">Mapleins</span>
              </Link>
              <p className="text-gray-400 text-sm leading-relaxed mb-6">
                Built for newcomers to Canada who deserve a fair shot at their dream career.
              </p>
              <div className="flex gap-3">
                <div className="w-9 h-9 rounded-full bg-gray-50 flex items-center justify-center hover:bg-green-50 hover:text-[#166534] cursor-pointer transition-colors text-sm font-bold text-gray-400">𝕏</div>
                <div className="w-9 h-9 rounded-full bg-gray-50 flex items-center justify-center hover:bg-green-50 hover:text-[#166534] cursor-pointer transition-colors text-sm font-bold text-gray-400">in</div>
                <a href="https://www.instagram.com/mapleins.ai/" target="_blank" rel="noopener noreferrer"
                  className="w-9 h-9 rounded-full bg-gray-50 flex items-center justify-center hover:bg-green-50 hover:text-[#166534] transition-colors text-gray-400">
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="2" y="2" width="20" height="20" rx="5" ry="5"/><circle cx="12" cy="12" r="4"/><circle cx="17.5" cy="6.5" r="1" fill="currentColor" stroke="none"/>
                  </svg>
                </a>
              </div>
            </div>

            {!WAITLIST_ONLY && (
              <div>
                <h4 className="font-bold text-gray-900 mb-5 text-sm">Product</h4>
                <ul className="space-y-3 text-sm text-gray-400">
                  <li><Link href="#how-it-works" className="hover:text-[#166534] transition-colors">How it Works</Link></li>
                  <li><Link href="/signup" className="hover:text-[#166534] transition-colors">Get Started</Link></li>
                  <li><Link href="/dashboard" className="hover:text-[#166534] transition-colors">Dashboard</Link></li>
                </ul>
              </div>
            )}

            <div>
              <h4 className="font-bold text-gray-900 mb-5 text-sm">Company</h4>
              <ul className="space-y-3 text-sm text-gray-400">
                <li><Link href="/about" className="hover:text-[#166534] transition-colors">Our Story</Link></li>
                <li><Link href="/contact" className="hover:text-[#166534] transition-colors">Contact</Link></li>
              </ul>
            </div>

            <div>
              <h4 className="font-bold text-gray-900 mb-5 text-sm">Support</h4>
              <ul className="space-y-3 text-sm text-gray-400">
                <li><Link href="/donate" className="text-[#166534] font-bold hover:underline">❤️ Support Us</Link></li>
                {!WAITLIST_ONLY && <li><Link href="/privacy" className="hover:text-[#166534] transition-colors">Privacy Policy</Link></li>}
              </ul>
            </div>
          </div>

          <div className="pt-8 border-t border-gray-100 flex flex-col md:flex-row justify-between items-center gap-4 text-xs text-gray-300 font-medium uppercase tracking-widest">
            <p>© {new Date().getFullYear()} Mapleins. All rights reserved.</p>
            {!WAITLIST_ONLY && (
              <div className="flex gap-6">
                <Link href="/terms" className="hover:text-gray-600 transition-colors">Terms</Link>
                <Link href="/privacy" className="hover:text-gray-600 transition-colors">Privacy</Link>
                <Link href="/cookies" className="hover:text-gray-600 transition-colors">Cookies</Link>
              </div>
            )}
          </div>
        </div>
      </footer>
    </div>
  );
}
