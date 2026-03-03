"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { WAITLIST_ONLY } from "@/lib/constants";

export default function LandingPage() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <div className="min-h-screen bg-[#f8faf9] selection:bg-green-100 selection:text-[#166534]">
      {/* ── Navbar ── */}
      <header
        className={`fixed top-0 w-full z-50 transition-all duration-300 ${scrolled ? "glass-morphism py-3 shadow-md" : "bg-transparent py-5"
          }`}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 flex items-center justify-between">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2 group">
            <div className="w-10 h-10 green-gradient rounded-xl flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform duration-300">
              <span className="text-white text-xl font-bold">M</span>
            </div>
            <span className="text-2xl font-bold text-gray-900 tracking-tight">
              Maple<span className="text-[#166534]">ins</span>
            </span>
          </Link>

          {/* Desktop nav: when waitlist-only, only Our Story, Donation, Contact */}
          <nav className="hidden md:flex items-center gap-8">
            {(WAITLIST_ONLY
              ? [
                  { label: "Our Story", href: "/about" },
                  { label: "Donation", href: "/donate" },
                  { label: "Contact", href: "/contact" },
                ]
              : [
                  { label: "How it Works", href: "#how-it-works" },
                  { label: "Our Story", href: "/about" },
                  { label: "Blog", href: "/blog" },
                  { label: "Contact", href: "/contact" },
                  { label: "Support Us", href: "/donate" },
                ]
            ).map(({ label, href }) => (
              <Link
                key={label}
                href={href}
                className="text-sm font-semibold text-gray-600 hover:text-[#166534] transition-colors relative group"
              >
                {label}
                <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-[#166534] transition-all duration-300 group-hover:w-full" />
              </Link>
            ))}
          </nav>

          {/* Desktop auth: when waitlist-only only "Join the Waitlist", else Sign in + Get Started */}
          <div className="hidden md:flex items-center gap-4">
            {WAITLIST_ONLY ? (
              <Link href="/waitlist">
                <Button className="green-gradient hover:opacity-90 text-white px-6 shadow-md hover:shadow-lg transition-all rounded-xl">
                  Join the Waitlist
                </Button>
              </Link>
            ) : (
              <>
                <Link href="/login" className="text-sm font-semibold text-gray-600 hover:text-gray-900 px-4 py-2">
                  Sign in
                </Link>
                <Link href="/signup">
                  <Button className="green-gradient hover:opacity-90 text-white px-6 shadow-md hover:shadow-lg transition-all rounded-xl">
                    Get Started Free
                  </Button>
                </Link>
              </>
            )}
          </div>

          {/* Mobile hamburger */}
          <button
            onClick={() => setMenuOpen(!menuOpen)}
            className="md:hidden p-2 rounded-xl hover:bg-gray-100 transition-colors"
          >
            <svg className="w-6 h-6 text-gray-900" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={menuOpen ? "M6 18L18 6M6 6l12 12" : "M4 6h16M4 12h16M4 18h16"} />
            </svg>
          </button>
        </div>

        {/* Mobile menu */}
        {menuOpen && (
          <div className="md:hidden absolute top-full left-0 w-full glass-morphism border-t border-gray-100 p-4 space-y-4 animate-in fade-in slide-in-from-top-4">
            {(WAITLIST_ONLY
              ? [
                  { label: "Our Story", href: "/about" },
                  { label: "Donation", href: "/donate" },
                  { label: "Contact", href: "/contact" },
                ]
              : [
                  { label: "How it Works", href: "#how-it-works" },
                  { label: "Our Story", href: "/about" },
                  { label: "Blog", href: "/blog" },
                  { label: "Contact", href: "/contact" },
                  { label: "Support Us", href: "/donate" },
                ]
            ).map(({ label, href }) => (
              <Link
                key={label}
                href={href}
                onClick={() => setMenuOpen(false)}
                className="block text-lg font-medium text-gray-900 px-4 py-2"
              >
                {label}
              </Link>
            ))}
            <div className="pt-4 border-t border-gray-100 flex flex-col gap-3">
              {WAITLIST_ONLY ? (
                <Link href="/waitlist" onClick={() => setMenuOpen(false)}>
                  <Button className="w-full green-gradient text-white py-6 text-lg rounded-xl">Join the Waitlist</Button>
                </Link>
              ) : (
                <>
                  <Link href="/login" onClick={() => setMenuOpen(false)} className="text-center py-2 font-medium">Sign in</Link>
                  <Link href="/signup" onClick={() => setMenuOpen(false)}>
                    <Button className="w-full green-gradient text-white py-6 text-lg rounded-xl">Get Started Free</Button>
                  </Link>
                </>
              )}
            </div>
          </div>
        )}
      </header>

      {/* ── Hero ── */}
      <section className="relative pt-32 pb-20 overflow-hidden">
        {/* Decorative background elements */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[1000px] h-[600px] bg-green-50/50 rounded-full blur-3xl -z-10" />
        <div className="absolute -top-20 -right-20 w-80 h-80 bg-green-100/30 rounded-full blur-3xl -z-10" />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-green-50 border border-green-100 text-[#166534] text-xs font-bold uppercase tracking-wider mb-8 reveal-up stagger-1">
            <span className="flex h-2 w-2 rounded-full bg-[#166534] animate-pulse" />
            Built for Canadian job seekers
          </div>

          <h1 className="text-5xl md:text-7xl font-extrabold text-gray-900 leading-[1.1] mb-8 reveal-up stagger-2">
            Struggling to get <br />
            <span className="text-gradient">interviews in Canada?</span>
          </h1>

          <p className="max-w-2xl mx-auto text-xl text-gray-600 mb-12 reveal-up stagger-3">
            Mapleins optimizes your resume for Canadian ATS systems and matches you with openings at top employers like Walmart, Tim Hortons, and RBC.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 reveal-up stagger-4">
            <Link href={WAITLIST_ONLY ? "/waitlist" : "/signup"}>
              <Button size="lg" className="green-gradient text-white text-lg px-10 py-7 h-auto font-bold rounded-2xl shadow-xl hover:shadow-2xl hover:scale-[1.02] transition-all">
                {WAITLIST_ONLY ? "Join the Waitlist →" : "Fix My Resume Free →"}
              </Button>
            </Link>
            <p className="text-sm text-gray-400">
              No credit card required <br className="hidden sm:block" /> Results in 60 seconds
            </p>
          </div>

          {/* Hero glass card preview */}
          <div className="mt-20 relative max-w-4xl mx-auto reveal-up stagger-4">
            <div className="glass-card p-4 sm:p-8 animate-float backdrop-blur-xl bg-white/30">
              <div className="flex flex-col md:flex-row items-center gap-8">
                <div className="flex-1 text-left">
                  <div className="h-4 w-32 bg-gray-200 rounded-full mb-4 animate-pulse" />
                  <div className="h-8 w-64 bg-gray-100 rounded-lg mb-6" />
                  <div className="space-y-3">
                    <div className="h-3 w-full bg-gray-100/50 rounded-full" />
                    <div className="h-3 w-5/6 bg-gray-100/50 rounded-full" />
                    <div className="h-3 w-4/6 bg-gray-100/50 rounded-full" />
                  </div>
                </div>
                <div className="w-full md:w-64 aspect-square rounded-2xl bg-white/50 border border-white/50 shadow-inner flex flex-col items-center justify-center p-6 text-center">
                  <div className="w-24 h-24 rounded-full border-8 border-green-500/20 border-t-green-500 flex items-center justify-center mb-4 transition-all duration-1000">
                    <span className="text-2xl font-bold text-[#166534]">82%</span>
                  </div>
                  <p className="text-sm font-bold text-gray-900">ATS Score</p>
                  <p className="text-xs text-gray-500 mt-1">Ready for application</p>
                </div>
              </div>
            </div>
            {/* Floating badges */}
            <div className="absolute -top-6 -right-6 glass-morphism p-3 rounded-xl shadow-lg animate-float stagger-2">
              <span className="text-[#166534] font-bold text-xs flex items-center gap-1">✅ ATS Optimized</span>
            </div>
            <div className="absolute -bottom-6 -left-6 glass-morphism p-3 rounded-xl shadow-lg animate-float stagger-4">
              <span className="text-[#166534] font-bold text-xs flex items-center gap-1">🍁 Built for Canada</span>
            </div>
          </div>
        </div>
      </section>

      {/* ── Trust ── */}
      <section className="py-20 bg-white reveal-up">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <p className="text-center text-sm font-bold text-gray-400 uppercase tracking-widest mb-12">
            Examples of Canadian employers Mapleins targets
          </p>
          <div className="flex flex-wrap justify-center items-center gap-12 opacity-50 grayscale hover:grayscale-0 transition-all duration-500">
            {/* Note: In a real app we'd use icons, here we use stylized text for the premium look */}
            <span className="text-2xl font-black tracking-tighter text-gray-900 hover:scale-110 transition-transform">WALMART</span>
            <span className="text-2xl font-black tracking-tighter text-gray-900 hover:scale-110 transition-transform">LOBLAWS</span>
            <span className="text-2xl font-black tracking-tighter text-gray-900 hover:scale-110 transition-transform">TIM HORTONS</span>
            <span className="text-2xl font-black tracking-tighter text-gray-900 hover:scale-110 transition-transform">RBC ROYAL BANK</span>
            <span className="text-2xl font-black tracking-tighter text-gray-900 hover:scale-110 transition-transform">AMAZON CA</span>
          </div>
        </div>
      </section>

      {/* ── Features ── (hidden when waitlist-only) */}
      {!WAITLIST_ONLY && (
      <section id="how-it-works" className="py-24 bg-green-50/50 overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="text-center max-w-3xl mx-auto mb-20 reveal-up">
            <h2 className="text-4xl font-bold text-gray-900 mb-6">How Mapleins works</h2>
            <p className="text-lg text-gray-600">
              Three simple steps to bridge the gap between your experience and Canadian job offers.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-10">
            {[
              {
                step: "01",
                title: "Upload & Scan",
                desc: "Securely upload your resume. Our AI scans it against thousands of Canadian job descriptions.",
                icon: "📄"
              },
              {
                step: "02",
                title: "Optimize Context",
                desc: "We rephrase your experience using Canadian ATS-friendly keywords and formatting.",
                icon: "⚡"
              },
              {
                step: "03",
                title: "Match & Apply",
                desc: "Get 15+ tailored job matches and your optimized resume. Apply with confidence.",
                icon: "🍁"
              }
            ].map((item, idx) => (
              <div key={idx} className="glass-card p-10 hover:bg-white shadow-sm hover:shadow-xl group transition-all duration-500 reveal-up" style={{ animationDelay: `${0.2 + idx * 0.1}s` }}>
                <div className="text-5xl mb-6 group-hover:scale-110 transition-transform">{item.icon}</div>
                <div className="text-xs font-black text-[#166534]/40 mb-4">{item.step}</div>
                <h3 className="text-2xl font-bold text-gray-900 mb-4">{item.title}</h3>
                <p className="text-gray-600 leading-relaxed">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
      )}

      {/* ── Final CTA ── */}
      <section className="py-24 px-4 sm:px-6">
        <div className="max-w-5xl mx-auto green-gradient rounded-[3rem] p-12 sm:p-20 text-center text-white relative overflow-hidden shadow-2xl">
          <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2 blur-3xl" />
          <div className="absolute bottom-0 left-0 w-64 h-64 bg-black/10 rounded-full translate-y-1/2 -translate-x-1/2 blur-3xl" />

          <h2 className="text-4xl md:text-5xl font-bold mb-8 relative z-10">
            Ready to land your dream <br className="hidden md:block" /> job in Canada?
          </h2>
          <p className="text-xl text-green-50 mb-12 max-w-2xl mx-auto relative z-10">
            Join newcomers using Mapleins to start their Canadian career journey.
          </p>
          <Link href={WAITLIST_ONLY ? "/waitlist" : "/signup"} className="relative z-10">
            <Button size="lg" className="bg-white text-[#166534] hover:bg-gray-100 text-lg px-12 py-8 h-auto font-black rounded-2xl shadow-xl transition-all">
              {WAITLIST_ONLY ? "Join the Waitlist →" : "Land More Interviews Now →"}
            </Button>
          </Link>
          <p className="mt-8 text-sm text-green-100 relative z-10 opacity-70">
            Free to use · No credit card required
          </p>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="bg-white pt-24 pb-12 border-t border-gray-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className={`grid grid-cols-2 gap-12 mb-20 ${WAITLIST_ONLY ? "lg:grid-cols-3" : "lg:grid-cols-4"}`}>
            <div className="col-span-2 lg:col-span-1">
              <Link href="/" className="flex items-center gap-2 mb-6">
                <div className="w-8 h-8 green-gradient rounded-lg flex items-center justify-center text-white font-bold">M</div>
                <span className="text-xl font-bold text-gray-900">Mapleins</span>
              </Link>
              <p className="text-gray-500 text-sm leading-relaxed mb-6">
                Bridging the gap for Canadian newcomers with AI-powered resume optimization and job matching.
              </p>
              <div className="flex gap-4">
                <div className="w-10 h-10 rounded-full bg-gray-50 flex items-center justify-center hover:bg-green-50 hover:text-[#166534] cursor-pointer transition-colors">𝕏</div>
                <div className="w-10 h-10 rounded-full bg-gray-50 flex items-center justify-center hover:bg-green-50 hover:text-[#166534] cursor-pointer transition-colors">in</div>
              </div>
            </div>

            {!WAITLIST_ONLY && (
              <div>
                <h4 className="font-bold text-gray-900 mb-6">Product</h4>
                <ul className="space-y-4 text-sm text-gray-500 font-medium">
                  <li><Link href="#how-it-works" className="hover:text-[#166534] transition-colors">How it Works</Link></li>
                  <li><Link href="/signup" className="hover:text-[#166534] transition-colors">Get Started</Link></li>
                  <li><Link href="/waitlist" className="hover:text-[#166534] transition-colors">Join Waitlist</Link></li>
                </ul>
              </div>
            )}

            <div>
              <h4 className="font-bold text-gray-900 mb-6">Company</h4>
              <ul className="space-y-4 text-sm text-gray-500 font-medium">
                <li><Link href="/about" className="hover:text-[#166534] transition-colors">Our Story</Link></li>
                {!WAITLIST_ONLY && <li><Link href="/blog" className="hover:text-[#166534] transition-colors">Blog</Link></li>}
                <li><Link href="/contact" className="hover:text-[#166534] transition-colors">{WAITLIST_ONLY ? "Contact" : "Careers"}</Link></li>
              </ul>
            </div>

            <div>
              <h4 className="font-bold text-gray-900 mb-6">Support</h4>
              <ul className="space-y-4 text-sm text-gray-500 font-medium">
                {!WAITLIST_ONLY && <li><Link href="/contact" className="hover:text-[#166534] transition-colors">Help Center</Link></li>}
                {!WAITLIST_ONLY && <li><Link href="/privacy" className="hover:text-[#166534] transition-colors">Privacy Policy</Link></li>}
                <li><Link href="/donate" className="text-[#166534] font-bold">❤️ Donation</Link></li>
              </ul>
            </div>
          </div>

          <div className="pt-12 border-t border-gray-100 flex flex-col md:flex-row justify-between items-center gap-6 text-xs text-gray-400 font-medium uppercase tracking-widest">
            <p>© {new Date().getFullYear()} Mapleins. All rights reserved.</p>
            {!WAITLIST_ONLY && (
              <div className="flex gap-8">
                <Link href="/terms" className="hover:text-gray-900 transition-colors">Terms</Link>
                <Link href="/privacy" className="hover:text-gray-900 transition-colors">Privacy</Link>
                <Link href="/cookies" className="hover:text-gray-900 transition-colors">Cookies</Link>
              </div>
            )}
          </div>
        </div>
      </footer>
    </div>
  );
}
