'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '@/lib/supabaseClient';

export default function AuthCallbackPage() {
  const router = useRouter();
  const [message, setMessage] = useState('Checking your session…');
  const [isError, setIsError] = useState(false);

  useEffect(() => {
    const handle = async () => {
      const { data, error } = await supabase.auth.getSession();

      if (error || !data.session) {
        setMessage('Login failed. Redirecting you back…');
        setIsError(true);
        setTimeout(() => router.push('/auth/sign-in'), 2000);
        return;
      }

      // Match sign-in logic: profile missing → onboarding, profile exists → app
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('id')
        .eq('id', data.session.user.id)
        .maybeSingle();

      if (profileError || !profile) {
        router.push('/onboarding');
        return;
      }

      router.push('/app');
    };

    handle();
  }, [router]);

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center px-4"
      style={{ background: 'var(--background)' }}
    >
      <div className="text-center max-w-sm">
        {!isError ? (
          <div className="flex justify-center mb-6">
            <svg
              className="h-12 w-12 animate-spin"
              style={{ color: 'var(--accent)' }}
              viewBox="0 0 24 24"
              aria-hidden
            >
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
          </div>
        ) : null}
        <p
          className={`text-base ${isError ? 'text-[var(--error-text)]' : 'text-[var(--muted)]'}`}
        >
          {message}
        </p>
        {isError && (
          <Link
            href="/auth/sign-in"
            className="mt-6 inline-block text-sm font-medium text-[var(--accent)] hover:text-[var(--accent-hover)] transition-colors"
          >
            Return to sign in
          </Link>
        )}
      </div>
    </div>
  );
}
