"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function SignupPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const strongPassword =
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,}$/;

    if (!strongPassword.test(password)) {
      setError(
        "Password must be at least 8 characters and include an uppercase letter, lowercase letter, number, and symbol."
      );
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }
    setLoading(true);
    setError(null);

    const supabase = createClient();
    const { error: signUpError } = await supabase.auth.signUp({
      email,
      password,
      options: { emailRedirectTo: `${window.location.origin}/auth/callback` },
    });

    if (signUpError) {
      console.log("Supabase signup error", {
        message: signUpError.message,
        name: signUpError.name,
      });
      setError(signUpError.message);
      setLoading(false);
      return;
    }

    router.push("/dashboard");
    router.refresh();
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-md">
        <Link href="/" className="block text-center mb-8">
          <span className="text-2xl font-bold text-[#166534]">Mapleins</span>
        </Link>

        <div className="bg-white rounded-xl shadow-sm border p-8">
          <h1 className="text-xl font-bold text-gray-900 text-center">
            Create your Mapleins account
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
                placeholder="At least 8 characters, with A–Z, a–z, 0–9, and a symbol"
                required
                minLength={8}
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="confirmPassword">Confirm password</Label>
              <Input
                id="confirmPassword"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Re-enter your password"
                required
                minLength={8}
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
              {loading ? "Creating account…" : "Sign up"}
            </Button>
          </form>

          <p className="mt-6 text-center text-sm text-gray-500">
            Already have an account?{" "}
            <Link href="/login" className="text-[#166534] font-medium hover:underline">
              Sign in
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
