"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const supabase = createClient();
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (signInError) {
      setError("Invalid email or password.");
      setLoading(false);
      return;
    }

    window.location.href = "/dashboard";
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-md">
        <Link href="/" className="block text-center mb-8">
          <span className="text-2xl font-bold text-[#166534]">Mapleins</span>
        </Link>

        <div className="bg-white rounded-xl shadow-sm border p-8">
          <h1 className="text-xl font-bold text-gray-900 text-center">
            Sign in to Mapleins
          </h1>
          <p className="mt-2 text-sm text-gray-500 text-center">
            Get Canadian job interviews or pay nothing
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
            <div>
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="mt-1"
              />
              <p className="mt-1.5 text-right">
                <Link href="/forgot-password" className="text-sm text-[#166534] hover:underline">
                  Forgot password?
                </Link>
              </p>
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
              {loading ? "Signing in…" : "Sign in"}
            </Button>
          </form>

          <p className="mt-6 text-center text-sm text-gray-500">
            Don&apos;t have an account?{" "}
            <Link href="/signup" className="text-[#166534] font-medium hover:underline">
              Sign up
            </Link>
          </p>
        </div>

        <Link
          href="/"
          className="block mt-6 text-center text-sm text-gray-500 hover:text-gray-700"
        >
          ← Back to home
        </Link>
      </div>
    </div>
  );
}
