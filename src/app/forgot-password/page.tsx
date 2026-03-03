"use client";

import { useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const supabase = createClient();
    const { error: resetError } = await supabase.auth.resetPasswordForEmail(email.trim(), {
      redirectTo: `${window.location.origin}/auth/callback`,
    });

    if (resetError) {
      setError(resetError.message);
      setLoading(false);
      return;
    }

    setSent(true);
    setLoading(false);
  };

  if (sent) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
        <div className="w-full max-w-md">
          <Link href="/" className="block text-center mb-8">
            <span className="text-2xl font-bold text-[#166534]">Mapleins</span>
          </Link>
          <div className="bg-white rounded-xl shadow-sm border p-8 text-center">
            <h1 className="text-xl font-bold text-gray-900">Check your email</h1>
            <p className="mt-2 text-sm text-gray-500">
              If an account exists for that address, we&apos;ve sent a link to reset your password.
            </p>
            <Link href="/login" className="mt-6 inline-block text-sm text-[#166534] font-medium hover:underline">
              ← Back to sign in
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-md">
        <Link href="/" className="block text-center mb-8">
          <span className="text-2xl font-bold text-[#166534]">Mapleins</span>
        </Link>

        <div className="bg-white rounded-xl shadow-sm border p-8">
          <h1 className="text-xl font-bold text-gray-900 text-center">
            Reset your password
          </h1>
          <p className="mt-2 text-sm text-gray-500 text-center">
            Enter your email and we&apos;ll send you a link to set a new password.
          </p>

          <form onSubmit={handleSubmit} className="mt-6 space-y-4">
            <div>
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                required
                className="mt-1"
              />
            </div>

            {error && (
              <div className="rounded-lg bg-red-50 text-red-700 px-4 py-3 text-sm">
                {error}
              </div>
            )}

            <Button
              type="submit"
              disabled={loading}
              className="w-full bg-[#166534] hover:bg-[#15803d]"
            >
              {loading ? "Sending…" : "Send reset link"}
            </Button>
          </form>

          <p className="mt-6 text-center text-sm text-gray-500">
            <Link href="/login" className="text-[#166534] font-medium hover:underline">
              ← Back to sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
