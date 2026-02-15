'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '@/lib/supabaseClient';

type Mode = 'signin' | 'signup';

export default function SignInPage() {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [status, setStatus] = useState<'idle' | 'loading' | 'error'>('idle');
  const [error, setError] = useState<string | null>(null);

  const handlePostAuthRedirect = async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      router.push('/auth/sign-in');
      return;
    }

    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .maybeSingle();

    if (profileError || !profile) {
      router.push('/onboarding');
      return;
    }

    router.push('/');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus('loading');
    setError(null);

    if (mode === 'signin') {
      const { data, error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (signInError) {
        setError('Wrong email or password.');
        setStatus('error');
        return;
      }

      if (!data.session) {
        setError('Login failed.');
        setStatus('error');
        return;
      }

      await handlePostAuthRedirect();
      return;
    }

    const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
      email,
      password,
    });

    if (signUpError || !signUpData.session) {
      setError(signUpError?.message || 'Unable to create account.');
      setStatus('error');
      return;
    }

    await handlePostAuthRedirect();
  };

  const title = mode === 'signin' ? 'Sign in to Asualy' : 'Create your Asualy account';
  const buttonLabel = mode === 'signin' ? 'Sign in' : 'Sign up';

  return (
    <div
      className="min-h-screen flex items-center justify-center px-4 py-12"
      style={{ background: 'var(--background-gradient)' }}
    >
      <div className="w-full max-w-md">
        <Link href="/" className="block text-center mb-8">
          <span className="text-2xl font-bold tracking-tight text-[var(--foreground)]">
            Asualy
          </span>
          <p className="mt-1.5 text-sm text-[var(--muted)]">
            Find your community abroad
          </p>
        </Link>

        <div className="asualy-card p-8 shadow-xl">
          <div className="mb-6 text-center">
            <div
              className="inline-flex h-12 w-12 items-center justify-center rounded-xl font-bold text-lg text-white mb-4"
              style={{ background: 'var(--accent)' }}
            >
              A
            </div>
            <h1 className="text-xl font-semibold text-[var(--foreground)] tracking-tight">
              {title}
            </h1>
            <p className="mt-1.5 text-sm text-[var(--muted)]">
              Your guide and community when you move to a new city.
            </p>
          </div>

          <div className="mb-5 flex rounded-xl bg-[var(--input-bg)] border border-[var(--border-subtle)] p-1">
            <button
              type="button"
              onClick={() => { setMode('signin'); setError(null); }}
              className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all ${
                mode === 'signin'
                  ? 'bg-[var(--accent)] text-white shadow-sm'
                  : 'text-[var(--muted)] hover:text-[var(--foreground)]'
              }`}
            >
              Sign in
            </button>
            <button
              type="button"
              onClick={() => { setMode('signup'); setError(null); }}
              className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all ${
                mode === 'signup'
                  ? 'bg-[var(--accent)] text-white shadow-sm'
                  : 'text-[var(--muted)] hover:text-[var(--foreground)]'
              }`}
            >
              Sign up
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-[var(--foreground)] mb-1.5">
                Email
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="asualy-input w-full rounded-lg px-4 py-3 text-sm placeholder:text-[var(--muted)]"
                placeholder="you@example.com"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-[var(--foreground)] mb-1.5">
                Password
              </label>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="asualy-input w-full rounded-lg px-4 py-3 text-sm placeholder:text-[var(--muted)]"
                placeholder="At least 6 characters"
              />
              <p className="mt-1.5 text-xs text-[var(--muted)]">
                {mode === 'signup'
                  ? "We'll create a new account with these details."
                  : 'Enter the email and password you used to sign up.'}
              </p>
            </div>

            {error && (
              <div
                className="rounded-lg px-4 py-3 text-sm"
                style={{
                  background: 'var(--error-bg)',
                  border: '1px solid var(--error-border)',
                  color: 'var(--error-text)',
                }}
              >
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={status === 'loading'}
              className="asualy-btn-primary w-full rounded-lg py-3 text-sm font-semibold disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {status === 'loading' ? (
                <>
                  <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" aria-hidden>
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  {buttonLabel}…
                </>
              ) : (
                buttonLabel
              )}
            </button>
          </form>

          <p className="mt-6 text-center text-xs text-[var(--muted)]">
            By continuing, you agree to Asualy&apos;s terms.
          </p>
        </div>

        <p className="mt-8 text-center">
          <Link
            href="/"
            className="text-sm text-[var(--muted)] hover:text-[var(--foreground)] transition-colors"
          >
            ← Back to home
          </Link>
        </p>
      </div>
    </div>
  );
}
