"use client";

import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function ContactPage() {
  const [form, setForm] = useState({ name: "", email: "", type: "general", message: "" });
  const [status, setStatus] = useState<"idle" | "sending" | "sent" | "error">("idle");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim() || !form.email.trim() || !form.message.trim()) return;
    setStatus("sending");
    // TODO: wire up to /api/contact or a mailto: fallback
    await new Promise((r) => setTimeout(r, 900));
    setStatus("sent");
  };

  return (
    <div className="min-h-screen bg-white">

      {/* Header */}
      <header className="border-b border-gray-100 sticky top-0 bg-white z-50">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
          <Link href="/" className="text-2xl font-bold text-[#166534] shrink-0">Mapleins</Link>
          <nav className="hidden md:flex items-center gap-1 text-sm font-medium">
            <Link href="/"        className="px-3 py-2 rounded-md text-gray-700 hover:text-[#166534] hover:bg-green-50 transition-colors">Home</Link>
            <Link href="/about"   className="px-3 py-2 rounded-md text-gray-700 hover:text-[#166534] hover:bg-green-50 transition-colors">Our Story</Link>
            <Link href="/blog"    className="px-3 py-2 rounded-md text-gray-700 hover:text-[#166534] hover:bg-green-50 transition-colors">Blog</Link>
            <Link href="/contact" className="px-3 py-2 rounded-md text-[#166534] bg-green-50 font-medium">Contact</Link>
          </nav>
          <div className="flex items-center gap-3">
            <Link href="/login" className="text-sm font-medium text-gray-700 hover:text-[#166534] px-3 py-2 rounded-md hover:bg-green-50 transition-colors hidden md:inline">Sign in</Link>
            <Link href="/signup">
              <Button className="bg-[#166534] hover:bg-[#15803d] text-white">Get Started →</Button>
            </Link>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 sm:px-6 py-16">

        {/* Page title */}
        <div className="text-center mb-12">
          <span className="text-sm font-semibold text-[#166534] uppercase tracking-widest">Contact</span>
          <h1 className="mt-3 text-4xl font-bold text-gray-900">We&apos;d love to hear from you</h1>
          <p className="mt-4 text-lg text-gray-600 max-w-xl mx-auto">
            Questions, feedback, success stories, or just want to say hi — reach out and we&apos;ll get back to you within 24 hours.
          </p>
        </div>

        <div className="grid sm:grid-cols-[1fr_380px] gap-12 items-start">

          {/* Contact form */}
          <div className="bg-white border rounded-2xl p-8 shadow-sm">
            {status === "sent" ? (
              <div className="text-center py-8">
                <div className="text-5xl mb-4">🎉</div>
                <h2 className="text-xl font-bold text-gray-900">Message sent!</h2>
                <p className="mt-2 text-gray-600">We&apos;ll get back to you within 24 hours.</p>
                <button
                  onClick={() => { setStatus("idle"); setForm({ name: "", email: "", type: "general", message: "" }); }}
                  className="mt-6 text-sm text-[#166534] hover:underline"
                >
                  Send another message
                </button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-5">
                <div className="grid sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Your name <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={form.name}
                      onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                      placeholder="Rohan Kakkar"
                      required
                      className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Email <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="email"
                      value={form.email}
                      onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                      placeholder="you@example.com"
                      required
                      className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">What is this about?</label>
                  <select
                    value={form.type}
                    onChange={(e) => setForm((f) => ({ ...f, type: e.target.value }))}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-500 bg-white"
                  >
                    <option value="general">General question</option>
                    <option value="feedback">Feedback / suggestion</option>
                    <option value="success">I got an interview! 🎉</option>
                    <option value="bug">Something isn&apos;t working</option>
                    <option value="other">Other</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Message <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    value={form.message}
                    onChange={(e) => setForm((f) => ({ ...f, message: e.target.value }))}
                    placeholder="Tell us what's on your mind…"
                    rows={5}
                    required
                    className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-500 resize-none"
                  />
                </div>

                {status === "error" && (
                  <p className="text-sm text-red-600">Something went wrong. Please try again.</p>
                )}

                <Button
                  type="submit"
                  disabled={status === "sending"}
                  className="w-full bg-[#166534] hover:bg-[#15803d] text-white py-5 h-auto font-semibold"
                >
                  {status === "sending" ? "Sending…" : "Send Message →"}
                </Button>
              </form>
            )}
          </div>

          {/* Side info cards */}
          <div className="space-y-4">

            <div className="rounded-xl border p-5 flex gap-4 items-start">
              <span className="text-2xl">💬</span>
              <div>
                <p className="font-semibold text-gray-900">Give Feedback</p>
                <p className="text-sm text-gray-500 mt-1">
                  Spotted a bug, have an idea, or want to tell us what to improve next? We read everything.
                </p>
              </div>
            </div>

            <div className="rounded-xl border p-5 flex gap-4 items-start">
              <span className="text-2xl">🎉</span>
              <div>
                <p className="font-semibold text-gray-900">Share a Success Story</p>
                <p className="text-sm text-gray-500 mt-1">
                  Got an interview or landed a job? Tell us — it genuinely makes our day and helps motivate the next user.
                </p>
              </div>
            </div>

            <div className="rounded-xl border p-5 flex gap-4 items-start">
              <span className="text-2xl">❤️</span>
              <div>
                <p className="font-semibold text-gray-900">Support Mapleins</p>
                <p className="text-sm text-gray-500 mt-1">
                  Mapleins is free. If it helped you, consider a small donation to keep it free for the next newcomer.
                </p>
                <Link href="/donate" className="mt-2 inline-block text-sm font-semibold text-[#166534] hover:underline">
                  Donate →
                </Link>
              </div>
            </div>

            <div className="rounded-xl border p-5 flex gap-4 items-start">
              <span className="text-2xl">📧</span>
              <div>
                <p className="font-semibold text-gray-900">Email us directly</p>
                <a
                  href="mailto:hello@mapleins.ca"
                  className="text-sm text-[#166534] hover:underline mt-1 block"
                >
                  hello@mapleins.ca
                </a>
              </div>
            </div>

          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-gray-200 py-6 mt-10">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 flex flex-col sm:flex-row justify-between items-center gap-3 text-sm text-gray-600 font-medium">
          <span>© {new Date().getFullYear()} Mapleins</span>
          <div className="flex gap-6">
            <Link href="/"      className="hover:text-[#166534] transition-colors">Home</Link>
            <Link href="/about" className="hover:text-[#166534] transition-colors">Our Story</Link>
            <Link href="/blog"  className="hover:text-[#166534] transition-colors">Blog</Link>
          </div>
        </div>
      </footer>

    </div>
  );
}
