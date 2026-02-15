'use client';

import { FormEvent, useMemo, useState } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabaseClient';

const countries = ['India', 'Canada'];
const provincesCanada = ['Quebec', 'Ontario', 'Alberta', 'British Columbia'];

const provinceCities: Record<string, string[]> = {
  Quebec: ['Montreal', 'Quebec City', 'Laval', 'Gatineau', 'Sherbrooke'],
  Ontario: ['Toronto', 'Ottawa', 'Brampton', 'Mississauga', 'London'],
  Alberta: ['Calgary', 'Edmonton', 'Red Deer', 'Lethbridge'],
  'British Columbia': ['Vancouver', 'Surrey', 'Burnaby', 'Richmond', 'Victoria'],
};

export default function OnboardingPage() {
  const [mode, setMode] = useState<'start' | 'moving' | 'local'>('start');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  const [fromCountry, setFromCountry] = useState('India');
  const [toCountry, setToCountry] = useState('Canada');
  const [toProvince, setToProvince] = useState<string>('');
  const [toCity, setToCity] = useState<string>('');
  const [role, setRole] = useState('student');

  const [currentCountry, setCurrentCountry] = useState('Canada');
  const [currentProvince, setCurrentProvince] = useState<string>('');
  const [currentCity, setCurrentCity] = useState<string>('');
  const [intent, setIntent] = useState('help_newcomers');

  const toProvinceCities = useMemo(
    () => (toProvince && provinceCities[toProvince] ? provinceCities[toProvince] : []),
    [toProvince],
  );

  const currentProvinceCities = useMemo(
    () => (currentProvince && provinceCities[currentProvince] ? provinceCities[currentProvince] : []),
    [currentProvince],
  );

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const {
      data: { user },
      error: sessionError,
    } = await supabase.auth.getUser();

    if (sessionError || !user) {
      setError('You need to be signed in to complete onboarding.');
      setLoading(false);
      return;
    }

    try {
      const payload: Record<string, unknown> = {
        id: user.id,
        is_moving: mode === 'moving',
      };

      if (mode === 'moving') {
        if (!toProvince || !toCity) {
          setError('Please select both province and city.');
          setLoading(false);
          return;
        }
        payload.from_country = fromCountry;
        payload.to_country = toCountry;
        payload.to_province = toProvince;
        payload.to_city = toCity;
        payload.role = role;
      } else if (mode === 'local') {
        if (!currentProvince || !currentCity) {
          setError('Please select both province and city.');
          setLoading(false);
          return;
        }
        payload.current_country = currentCountry;
        payload.current_province = currentProvince;
        payload.current_city = currentCity;
        payload.reasons = intent;
      }

      const { error: upsertError } = await supabase
        .from('profiles')
        .upsert(payload, { onConflict: 'id' });

      if (upsertError) {
        setError(upsertError.message);
        setLoading(false);
        return;
      }

      setDone(true);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Something went wrong.');
    } finally {
      setLoading(false);
    }
  };

  if (done) {
    return (
      <div
        className="min-h-screen flex items-center justify-center px-4"
        style={{ background: 'var(--background-gradient)' }}
      >
        <div className="max-w-md text-center">
          <div
            className="inline-flex h-16 w-16 items-center justify-center rounded-2xl text-3xl mb-6"
            style={{ background: 'var(--peach-muted)', color: 'var(--peach)' }}
          >
            ✨
          </div>
          <h1 className="text-2xl font-semibold text-[var(--foreground)]">
            You&apos;re all set 🎉
          </h1>
          <p className="mt-3 text-sm text-[var(--muted)]">
            Your profile is saved. We&apos;ll connect you with the right rooms and city groups.
          </p>
          <Link
            href="/"
            className="asualy-btn-primary mt-8 inline-flex items-center justify-center rounded-xl px-6 py-3 text-sm font-semibold"
          >
            Go to Asualy
          </Link>
        </div>
      </div>
    );
  }

  const selectClassName =
    'asualy-input w-full rounded-lg px-4 py-2.5 text-sm';
  const labelClassName = 'block text-sm font-medium text-[var(--foreground)] mb-1.5';

  return (
    <div
      className="min-h-screen flex items-center justify-center px-4 py-12"
      style={{ background: 'var(--background-gradient)' }}
    >
      <div className="w-full max-w-xl asualy-card p-8 shadow-xl">
        <h1 className="text-2xl font-semibold text-[var(--foreground)] mb-2">
          Welcome to Asualy
        </h1>
        <p className="text-sm text-[var(--muted)] mb-6">
          We&apos;ll use this to connect you with the right country, province, and city communities.
        </p>

        {mode === 'start' && (
          <div className="space-y-5">
            <p className="text-sm text-[var(--foreground)]">
              Are you moving to another country, or are you already living there?
            </p>
            <div className="flex flex-col sm:flex-row gap-3">
              <button
                className="asualy-btn-primary flex-1 rounded-xl py-3 text-sm font-medium"
                onClick={() => setMode('moving')}
              >
                I&apos;m moving / planning to move
              </button>
              <button
                className="asualy-btn-secondary flex-1 rounded-xl py-3 text-sm font-medium"
                onClick={() => setMode('local')}
              >
                I already live here (I&apos;m a local)
              </button>
            </div>
          </div>
        )}

        {mode === 'moving' && (
          <form onSubmit={handleSubmit} className="space-y-5">
            <p className="text-sm text-[var(--foreground)]">
              Tell us a bit about your move.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className={labelClassName}>From country</label>
                <select
                  className={selectClassName}
                  value={fromCountry}
                  onChange={(e) => setFromCountry(e.target.value)}
                >
                  <option value="">Select</option>
                  {countries.map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className={labelClassName}>To country</label>
                <select
                  className={selectClassName}
                  value={toCountry}
                  onChange={(e) => setToCountry(e.target.value)}
                >
                  <option value="">Select</option>
                  {countries.map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className={labelClassName}>To province / state</label>
                <select
                  className={selectClassName}
                  value={toProvince}
                  onChange={(e) => { setToProvince(e.target.value); setToCity(''); }}
                >
                  <option value="">Select</option>
                  {provincesCanada.map((p) => (
                    <option key={p} value={p}>{p}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className={labelClassName}>To city</label>
                <select
                  className={selectClassName}
                  value={toCity}
                  onChange={(e) => setToCity(e.target.value)}
                  disabled={!toProvince}
                >
                  <option value="">Select</option>
                  {toProvinceCities.map((city) => (
                    <option key={city} value={city}>{city}</option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className={labelClassName}>Your role</label>
              <select
                className={selectClassName}
                value={role}
                onChange={(e) => setRole(e.target.value)}
              >
                <option value="">Select</option>
                <option value="student">Student</option>
                <option value="worker">Worker</option>
                <option value="pr">PR</option>
                <option value="visitor">Visitor</option>
                <option value="service_provider">Service provider</option>
                <option value="other">Other</option>
              </select>
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

            <div className="flex items-center justify-between gap-3 pt-2">
              <button
                type="button"
                className="text-sm text-[var(--muted)] hover:text-[var(--foreground)] transition-colors"
                onClick={() => setMode('start')}
              >
                ← Back
              </button>
              <button
                type="submit"
                disabled={loading}
                className="asualy-btn-primary inline-flex items-center justify-center rounded-lg px-5 py-2.5 text-sm font-medium disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {loading ? 'Saving…' : 'Continue'}
              </button>
            </div>
          </form>
        )}

        {mode === 'local' && (
          <form onSubmit={handleSubmit} className="space-y-5">
            <p className="text-sm text-[var(--foreground)]">
              Tell us where you live and how you want to use Asualy.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className={labelClassName}>Country</label>
                <select
                  className={selectClassName}
                  value={currentCountry}
                  onChange={(e) => setCurrentCountry(e.target.value)}
                >
                  <option value="">Select</option>
                  {countries.map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className={labelClassName}>Province / state</label>
                <select
                  className={selectClassName}
                  value={currentProvince}
                  onChange={(e) => { setCurrentProvince(e.target.value); setCurrentCity(''); }}
                >
                  <option value="">Select</option>
                  {provincesCanada.map((p) => (
                    <option key={p} value={p}>{p}</option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className={labelClassName}>City</label>
              <select
                className={selectClassName}
                value={currentCity}
                onChange={(e) => setCurrentCity(e.target.value)}
                disabled={!currentProvince}
              >
                <option value="">Select</option>
                {currentProvinceCities.map((city) => (
                  <option key={city} value={city}>{city}</option>
                ))}
              </select>
            </div>

            <div>
              <label className={labelClassName}>What do you want to do here?</label>
              <select
                className={selectClassName}
                value={intent}
                onChange={(e) => setIntent(e.target.value)}
              >
                <option value="">Select</option>
                <option value="help_newcomers">Help newcomers</option>
                <option value="offer_services">Offer services</option>
                <option value="buy_sell">Buy / sell items</option>
                <option value="just_explore">Just explore</option>
              </select>
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

            <div className="flex items-center justify-between gap-3 pt-2">
              <button
                type="button"
                className="text-sm text-[var(--muted)] hover:text-[var(--foreground)] transition-colors"
                onClick={() => setMode('start')}
              >
                ← Back
              </button>
              <button
                type="submit"
                disabled={loading}
                className="asualy-btn-primary inline-flex items-center justify-center rounded-lg px-5 py-2.5 text-sm font-medium disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {loading ? 'Saving…' : 'Continue'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
