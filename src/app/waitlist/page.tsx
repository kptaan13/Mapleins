'use client';

import { useState } from 'react';
import Link from 'next/link';

const cities = ['Montreal', 'Toronto', 'Brampton', 'Calgary', 'Edmonton', 'Vancouver', 'Surrey', 'Other'];

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function isValidEmail(value: string): boolean {
  return EMAIL_REGEX.test(value.trim().toLowerCase());
}

export default function WaitlistPage() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<'student' | 'worker' | 'visitor' | 'other'>('student');
  const [city, setCity] = useState<string>('Montreal');
  const [cityOther, setCityOther] = useState('');
  const [intake, setIntake] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const emailTrimmed = email.trim().toLowerCase();
    if (!emailTrimmed) {
      setError('Please enter your email.');
      return;
    }

    if (!isValidEmail(emailTrimmed)) {
      setError('Please enter a valid email address.');
      return;
    }

    if (city === 'Other' && !cityOther.trim()) {
      setError('Please enter your city.');
      return;
    }

    const cityValue = city === 'Other' ? cityOther.trim() : city;

    setSubmitting(true);

    try {
      const res = await fetch('/api/waitlist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: emailTrimmed,
          name: name.trim() || '',
          role,
          city: cityValue,
          intake: intake.trim() || '',
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to join waitlist');
      }

      setSubmitted(true);
      setName('');
      setEmail('');
      setCityOther('');
      setIntake('');
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Something went wrong. Please try again or DM me on Instagram.',
      );
    } finally {
      setSubmitting(false);
    }
  };

  if (submitted) {
    return (
      <div
        className="min-h-screen flex flex-col"
        style={{ background: 'var(--background)' }}
      >
        <header className="sticky top-0 z-10 flex items-center justify-between px-4 sm:px-6 py-4 bg-[var(--card)] shadow-nav border-b border-[var(--border-subtle)]">
          <h1 className="text-lg font-semibold tracking-tight text-[var(--foreground)]">
            Mapleins
          </h1>
          <Link
            href="/"
            className="inline-flex items-center gap-1 text-sm text-[var(--muted)] hover:text-[var(--foreground)] transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
            Back
          </Link>
        </header>

        <main className="flex-1 flex items-center justify-center px-4 py-8">
          <div className="w-full max-w-md mapleins-card p-8 rounded-2xl shadow-card text-center space-y-3">
            <h1 className="text-xl font-semibold text-[var(--foreground)]">
              You’re on the waitlist ✨
            </h1>
            <p className="text-sm text-[var(--muted)]">
              I’ll be inviting people city by city, starting with Montreal, Toronto, Brampton,
              Calgary, Edmonton, Vancouver, and Surrey.
            </p>
            <p className="text-xs text-[var(--muted)]">
              If you came from Instagram, you can also DM me any questions directly.
            </p>
            <Link
              href="/app"
              className="inline-flex justify-center mt-2 mapleins-btn-primary rounded-lg px-5 py-2.5 text-sm font-medium"
            >
              Go to app
            </Link>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div
      className="min-h-screen flex flex-col"
      style={{ background: 'var(--background)' }}
    >
      <header className="sticky top-0 z-10 flex items-center justify-between px-4 sm:px-6 py-4 bg-[var(--card)] shadow-nav border-b border-[var(--border-subtle)]">
        <h1 className="text-lg font-semibold tracking-tight text-[var(--foreground)]">
          Mapleins
        </h1>
        <Link
          href="/"
          className="inline-flex items-center gap-1 text-sm text-[var(--muted)] hover:text-[var(--foreground)] transition-colors"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
          Back
        </Link>
      </header>

      <main className="flex-1 flex items-center justify-center px-4 py-8">
        <div className="w-full max-w-md mapleins-card p-8 rounded-2xl shadow-card space-y-6">
          <header className="space-y-2">
            <p className="text-xs uppercase tracking-wide text-[var(--muted)]">
              Early access
            </p>
            <h1 className="text-xl font-semibold text-[var(--foreground)]">
              Find your community when you land in Canada
            </h1>
            <p className="text-sm text-[var(--muted)]">
              City‑specific groups and checklists for Indian newcomers landing in Montreal,
              Toronto, Brampton, Calgary, Edmonton, Vancouver, and Surrey.
            </p>
          </header>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-[var(--foreground)] mb-1.5">
                Name (optional)
              </label>
              <input
                type="text"
                className="mapleins-input w-full rounded-lg px-4 py-2.5 text-sm placeholder:text-[var(--muted)]"
                placeholder="e.g. Rohan"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-[var(--foreground)] mb-1.5">
                Email
              </label>
              <input
                type="email"
                required
                className="mapleins-input w-full rounded-lg px-4 py-2.5 text-sm placeholder:text-[var(--muted)]"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-[var(--foreground)] mb-1.5">
                Your role
              </label>
              <select
                className="mapleins-input w-full rounded-lg px-4 py-2.5 text-sm"
                value={role}
                onChange={(e) => setRole(e.target.value as any)}
              >
                <option value="student">Student</option>
                <option value="worker">Worker</option>
                <option value="visitor">Visitor</option>
                <option value="other">Other</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-[var(--foreground)] mb-1.5">
                City you’re going to (V1)
              </label>
              <select
                className="mapleins-input w-full rounded-lg px-4 py-2.5 text-sm"
                value={city}
                onChange={(e) => setCity(e.target.value)}
              >
                {cities.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
              {city === 'Other' && (
                <input
                  type="text"
                  className="mapleins-input w-full rounded-lg px-4 py-2.5 text-sm placeholder:text-[var(--muted)] mt-2"
                  placeholder="Enter your city"
                  value={cityOther}
                  onChange={(e) => setCityOther(e.target.value)}
                  required={city === 'Other'}
                />
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-[var(--foreground)] mb-1.5">
                When are you landing? (optional)
              </label>
              <input
                type="text"
                className="mapleins-input w-full rounded-lg px-4 py-2.5 text-sm placeholder:text-[var(--muted)]"
                placeholder="e.g. Jan 2026, Fall 2026"
                value={intake}
                onChange={(e) => setIntake(e.target.value)}
              />
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
              disabled={submitting}
              className="mapleins-btn-primary w-full rounded-xl py-3 text-sm font-semibold disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {submitting ? 'Joining waitlist…' : 'Join the waitlist'}
            </button>
          </form>

          <p className="text-xs text-[var(--muted)] text-center">
            I’ll use this to invite people in small batches and to decide which city to prioritize
            next. No spam, no sharing your email.
          </p>
        </div>
      </main>
    </div>
  );
}
