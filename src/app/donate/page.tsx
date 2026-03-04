"use client";

import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { STRIPE_DONATION_LINK, WAITLIST_ONLY } from "@/lib/constants";

const AMOUNTS = [5, 10, 20, 50];

export default function DonatePage() {
  const [donating, setDonating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleDonate = async (amountCad: number) => {
    setError(null);
    setDonating(true);
    try {
      const res = await fetch(`/api/donate/checkout?amount=${amountCad * 100}`, {
        method: "GET",
        credentials: "include",
        headers: { Accept: "application/json" },
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok && data.url) {
        window.location.href = data.url;
        return;
      }
      setError(data.error || (res.status === 401 ? "Please sign in to donate." : "Something went wrong. Try again."));
    } catch {
      setError("Could not start checkout. Please try again.");
    } finally {
      setDonating(false);
    }
  };

  const usePaymentLink = !!STRIPE_DONATION_LINK;

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
            <Link href="/contact" className="px-3 py-2 rounded-md text-gray-700 hover:text-[#166534] hover:bg-green-50 transition-colors">Contact</Link>
          </nav>
          {!WAITLIST_ONLY && (
            <div className="flex items-center gap-3">
              <Link href="/login" className="text-sm font-medium text-gray-700 hover:text-[#166534] px-3 py-2 rounded-md hover:bg-green-50 transition-colors hidden md:inline">Sign in</Link>
              <Link href="/signup">
                <Button className="bg-[#166534] hover:bg-[#15803d] text-white">Get Started →</Button>
              </Link>
            </div>
          )}
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 sm:px-6 py-20 text-center">

        <span className="text-4xl">❤️</span>
        <h1 className="mt-4 text-4xl font-bold text-gray-900">Support Mapleins</h1>
        <p className="mt-5 text-lg text-gray-600 max-w-lg mx-auto">
          Mapleins is completely free. We keep it that way through voluntary donations from users who land interviews.
        </p>
        <p className="mt-3 text-base text-gray-500">
          Every donation — no matter how small — covers AI processing costs and keeps the tool free for the next newcomer who needs it.
        </p>

        {/* Stripe Payment Link: customer chooses amount at checkout */}
        {usePaymentLink ? (
          <div className="mt-10">
            <a
              href={STRIPE_DONATION_LINK!}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 rounded-xl bg-[#166534] hover:bg-[#15803d] text-white font-semibold text-lg px-8 py-4 transition-colors"
            >
              Donate — choose your amount
              <span className="text-white/80" aria-hidden>→</span>
            </a>
            <p className="mt-4 text-sm text-gray-500">
              Opens Stripe Checkout in a new tab. You choose the amount there.
            </p>
          </div>
        ) : (
          <>
            {error && (
              <div className="mt-6 rounded-lg bg-red-50 border border-red-200 text-red-700 px-4 py-3 text-sm">
                {error}
                {error.includes("sign in") && (
                  <span className="block mt-2">
                    <Link href="/login" className="font-medium underline">Sign in</Link>
                    {" or "}
                    <Link href="/signup" className="font-medium underline">create an account</Link>.
                  </span>
                )}
              </div>
            )}
            <div className="mt-10 grid grid-cols-2 sm:grid-cols-4 gap-3">
              {AMOUNTS.map((amt) => (
                <button
                  key={amt}
                  type="button"
                  disabled={donating}
                  onClick={() => handleDonate(amt)}
                  className="rounded-xl border-2 border-green-200 bg-green-50 hover:border-green-500 hover:bg-green-100 transition-colors py-5 text-center cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <p className="text-xl font-bold text-[#166534]">${amt}</p>
                  <p className="text-xs text-gray-500 mt-1">CAD</p>
                </button>
              ))}
            </div>
          </>
        )}

        <p className="mt-5 text-xs text-gray-500">
          Secure payment via Stripe — card, Apple Pay, Google Pay, Link. Receipt by email.
        </p>

        {/* What it covers */}
        <div className="mt-12 bg-gray-50 rounded-2xl p-8 text-left space-y-4">
          <h2 className="text-base font-semibold text-gray-900 text-center mb-5">What your donation covers</h2>
          <div className="flex gap-4 items-start">
            <span className="text-xl shrink-0">⚡</span>
            <div>
              <p className="font-medium text-gray-800">AI processing</p>
              <p className="text-sm text-gray-500">Each resume analysis, generation, and job match costs us real money in API calls. $10 covers ~50 resumes.</p>
            </div>
          </div>
          <div className="flex gap-4 items-start">
            <span className="text-xl shrink-0">🌱</span>
            <div>
              <p className="font-medium text-gray-800">Keeping it free</p>
              <p className="text-sm text-gray-500">We don&apos;t want a paywall. Donations from people like you keep Mapleins accessible to everyone.</p>
            </div>
          </div>
          <div className="flex gap-4 items-start">
            <span className="text-xl shrink-0">🛠️</span>
            <div>
              <p className="font-medium text-gray-800">New features</p>
              <p className="text-sm text-gray-500">Cover letter builder, LinkedIn import, French language support — all on the roadmap, all funded by donations.</p>
            </div>
          </div>
        </div>

        <p className="mt-8 text-sm text-gray-500">
          Not ready to donate?{" "}
          <Link href="/dashboard" className="text-[#166534] hover:underline font-medium">
            Use Mapleins free →
          </Link>
        </p>

      </main>

      {/* Footer */}
      <footer className="border-t border-gray-200 py-6 mt-4">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 flex flex-col sm:flex-row justify-between items-center gap-3 text-sm text-gray-600 font-medium">
          <span>© {new Date().getFullYear()} Mapleins</span>
          <div className="flex gap-6">
            <Link href="/"        className="hover:text-[#166534] transition-colors">Home</Link>
            <Link href="/about"   className="hover:text-[#166534] transition-colors">Our Story</Link>
            <Link href="/contact" className="hover:text-[#166534] transition-colors">Contact</Link>
          </div>
        </div>
      </footer>

    </div>
  );
}
