'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '@/lib/supabaseClient';

interface Profile {
  id: string;
  display_name: string | null;
  username: string | null;
  role: string | null;
  to_country: string | null;
  to_province: string | null;
  to_city: string | null;
  current_country: string | null;
  current_province: string | null;
  current_city: string | null;
}

export default function AppHomePage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<Profile | null>(null);

  useEffect(() => {
    const load = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        router.push('/auth/sign-in');
        return;
      }

      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .maybeSingle<Profile>();

      if (error || !data) {
        router.push('/onboarding');
        return;
      }

      setProfile(data);
      setLoading(false);
    };

    load();
  }, [router]);

  if (loading || !profile) {
    return (
      <div
        className="min-h-screen flex items-center justify-center"
        style={{ background: 'var(--background)' }}
      >
        <p className="text-sm text-[var(--muted)]">Loading your home…</p>
      </div>
    );
  }

  const roleLabel = profile.role
    ? profile.role.charAt(0).toUpperCase() + profile.role.slice(1)
    : 'Member';
  const displayName = profile.display_name?.trim() || roleLabel;
  const username = profile.username?.trim();

  // Prefer current_* location if set, otherwise fall back to to_*
  const country = profile.current_country || profile.to_country || '';
  const province = profile.current_province || profile.to_province || '';
  const city = profile.current_city || profile.to_city || '';

  const locationText = [city, province, country].filter(Boolean).join(', ');

  return (
    <div
      className="min-h-screen flex flex-col"
      style={{ background: 'var(--background)' }}
    >
      <header className="sticky top-0 z-10 flex items-center justify-between px-4 sm:px-6 py-4 bg-[var(--card)] shadow-nav border-b border-[var(--border-subtle)]">
        <span className="text-lg font-semibold tracking-tight text-[var(--foreground)]">
          Mapleins
        </span>
        <Link
          href="/auth/sign-in"
          className="text-sm text-[var(--muted)] hover:text-[var(--foreground)] transition-colors"
        >
          Switch account
        </Link>
      </header>

      <main className="flex-1 px-4 sm:px-6 py-8 max-w-3xl mx-auto w-full">
        <section className="mb-10">
          <p className="text-xs font-medium uppercase tracking-wider text-[var(--muted)] mb-2">
            Overview
          </p>
          <h1 className="text-2xl sm:text-3xl font-semibold text-[var(--foreground)] tracking-tight mb-2">
            Welcome, {displayName}{username ? ` (@${username})` : ''}
          </h1>
          {locationText && (
            <p className="text-sm text-[var(--muted)]">
              You&apos;re set up for <span className="font-medium">{locationText}</span>.
            </p>
          )}
          {!locationText && (
            <p className="text-sm text-[var(--muted)]">
              Your location isn&apos;t fully set yet. You can update it in onboarding.
            </p>
          )}
        </section>

        <section className="grid gap-4 sm:grid-cols-3">
          <Link href="/rooms" className="mapleins-card mapleins-card-interactive p-5 flex flex-col justify-between rounded-2xl group">
            <div>
              <p className="text-xs font-medium uppercase tracking-wider text-[var(--muted)] mb-2">
                Communities
              </p>
              <h2 className="text-base font-semibold text-[var(--foreground)] mb-2">
                My groups
              </h2>
              <p className="text-sm text-[var(--muted)] leading-relaxed">
                Country, province, and city rooms where you can ask questions and meet people.
              </p>
            </div>
            <span className="mt-4 text-sm font-medium text-[var(--accent)] group-hover:translate-x-0.5 transition-transform inline-flex items-center gap-1">
              Open groups
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
            </span>
          </Link>

          <Link href="/guides" className="mapleins-card mapleins-card-interactive p-5 flex flex-col justify-between rounded-2xl group">
            <div>
              <p className="text-xs font-medium uppercase tracking-wider text-[var(--muted)] mb-2">
                Guides
              </p>
              <h2 className="text-base font-semibold text-[var(--foreground)] mb-2">
                Landing guide
              </h2>
              <p className="text-sm text-[var(--muted)] leading-relaxed">
                Step-by-step checklists for landing, documents, housing, and more.
              </p>
            </div>
            <span className="mt-4 text-sm font-medium text-[var(--accent)] group-hover:translate-x-0.5 transition-transform inline-flex items-center gap-1">
              View guides
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
            </span>
          </Link>

          <div className="mapleins-card p-5 flex flex-col justify-between rounded-2xl opacity-75 cursor-default">
            <div>
              <p className="text-xs font-medium uppercase tracking-wider text-[var(--muted)] mb-2">
                Services
              </p>
              <h2 className="text-base font-semibold text-[var(--foreground)] mb-2">
                Services & marketplace
              </h2>
              <p className="text-sm text-[var(--muted)] leading-relaxed">
                Soon: find rated tiffin, housing, immigration help, and more near you.
              </p>
            </div>
            <span className="mt-4 text-sm font-medium text-[var(--muted)]">
              Coming soon
            </span>
          </div>
        </section>
      </main>
    </div>
  );
}
