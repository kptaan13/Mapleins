"use client";

import Link from "next/link";

export default function CookiesPage() {
  return (
    <div className="min-h-screen bg-white">
      <header className="border-b border-gray-100">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
          <Link href="/" className="text-xl font-bold text-[#166534]">
            Mapleins
          </Link>
          <Link href="/dashboard" className="text-sm text-gray-600 hover:text-gray-900">
            Go to app
          </Link>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 sm:px-6 py-10">
        <h1 className="text-2xl font-bold text-gray-900 mb-4">Cookies</h1>
        <p className="text-sm text-gray-600 mb-6">
          Mapleins uses only essential cookies needed to keep you signed in and secure your account. We do not use
          advertising cookies or third-party tracking cookies.
        </p>
        <p className="text-sm text-gray-600 mb-2">
          For full details, see our{" "}
          <Link href="/privacy" className="text-[#166534] hover:underline">
            Privacy Policy
          </Link>
          .
        </p>
      </main>
    </div>
  );
}

