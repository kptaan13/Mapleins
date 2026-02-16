'use client';

import { FormEvent, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';

const countries = ['India', 'Canada'];
const provincesCanada = ['Quebec', 'Ontario', 'Alberta', 'British Columbia'];

const indiaStates = [
  'Andhra Pradesh', 'Arunachal Pradesh', 'Assam', 'Bihar', 'Chhattisgarh',
  'Goa', 'Gujarat', 'Haryana', 'Himachal Pradesh', 'Jharkhand', 'Karnataka',
  'Kerala', 'Madhya Pradesh', 'Maharashtra', 'Manipur', 'Meghalaya', 'Mizoram',
  'Nagaland', 'Odisha', 'Punjab', 'Rajasthan', 'Sikkim', 'Tamil Nadu', 'Telangana',
  'Tripura', 'Uttar Pradesh', 'Uttarakhand', 'West Bengal', 'Delhi',
  'Jammu and Kashmir', 'Ladakh',
];

// V1 cities only: Toronto, Brampton, Montreal, Calgary, Edmonton, Vancouver, Surrey
const provinceCities: Record<string, string[]> = {
  Quebec: ['Montreal'],
  Ontario: ['Toronto', 'Brampton'],
  Alberta: ['Calgary', 'Edmonton'],
  'British Columbia': ['Vancouver', 'Surrey'],
};

const USERNAME_PATTERN = /^[a-zA-Z0-9_]+$/;

interface ProfilePayload {
  id: string;
  is_moving: boolean;
  display_name: string;
  full_name: string;
  date_of_birth: string;
  username: string;
  from_country?: string;
  from_state?: string;
  to_country?: string;
  to_province?: string;
  to_city?: string;
  current_country?: string;
  current_province?: string;
  current_city?: string;
  role?: string;
  reasons?: string;
  phone?: string;
}

interface ExistingProfile {
  display_name: string | null;
  full_name: string | null;
  date_of_birth: string | null;
  username: string | null;
  from_country: string | null;
  from_state: string | null;
  to_country: string | null;
  to_province: string | null;
  to_city: string | null;
  current_country: string | null;
  current_province: string | null;
  current_city: string | null;
  role: string | null;
  reasons: string | null;
  phone: string | null;
}

export default function OnboardingPage() {
  const router = useRouter();
  const [mode, setMode] = useState<'profile' | 'start' | 'moving' | 'local'>('profile');
  const [loading, setLoading] = useState(false);
  const [profileLoaded, setProfileLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  const [displayName, setDisplayName] = useState('');
  const [fullName, setFullName] = useState('');
  const [dateOfBirth, setDateOfBirth] = useState('');
  const [username, setUsername] = useState('');

  const [fromCountry, setFromCountry] = useState('India');
  const [fromProvince, setFromProvince] = useState<string>('');
  const [toCountry, setToCountry] = useState('Canada');
  const [toProvince, setToProvince] = useState<string>('');
  const [toCity, setToCity] = useState<string>('');
  const [role, setRole] = useState('student');

  const [currentCountry, setCurrentCountry] = useState('Canada');
  const [currentProvince, setCurrentProvince] = useState<string>('');
  const [currentCity, setCurrentCity] = useState<string>('');
  const [intent, setIntent] = useState('help_newcomers');
  const [phone, setPhone] = useState('');

  useEffect(() => {
    const prefill = async () => {
      const {
        data: { user },
        error: sessionError,
      } = await supabase.auth.getUser();
      if (sessionError || !user) {
        setProfileLoaded(true);
        return;
      }
      const { data: profile } = await supabase
        .from('profiles')
        .select('display_name, full_name, date_of_birth, username, from_country, from_state, to_country, to_province, to_city, current_country, current_province, current_city, role, reasons, phone')
        .eq('id', user.id)
        .maybeSingle<ExistingProfile>();
      if (profile) {
        setDisplayName(profile.display_name ?? '');
        setFullName(profile.full_name ?? '');
        setDateOfBirth(profile.date_of_birth ?? '');
        setUsername(profile.username ?? '');
        setFromCountry(profile.from_country ?? 'India');
        setFromProvince(profile.from_state ?? '');
        setToCountry(profile.to_country ?? 'Canada');
        setToProvince(profile.to_province ?? '');
        setToCity(profile.to_city ?? '');
        setCurrentCountry(profile.current_country ?? 'Canada');
        setCurrentProvince(profile.current_province ?? '');
        setCurrentCity(profile.current_city ?? '');
        setRole(profile.role ?? 'student');
        setIntent(profile.reasons ?? 'help_newcomers');
        setPhone(profile.phone ?? '');
      }
      setProfileLoaded(true);
    };
    prefill();
  }, []);

  const toProvinceCities = useMemo(
    () => (toProvince && provinceCities[toProvince] ? provinceCities[toProvince] : []),
    [toProvince],
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
      const fullNameTrimmed = fullName.trim();
      const dateOfBirthTrimmed = dateOfBirth.trim();
      const usernameTrimmed = username.trim().toLowerCase();
      const displayNameTrimmed = displayName.trim()
        || (fullNameTrimmed ? fullNameTrimmed.split(/\s+/)[0] ?? fullNameTrimmed : '');

      if (!fullNameTrimmed) {
        setError('Please enter your full name.');
        setLoading(false);
        return;
      }
      if (!dateOfBirthTrimmed) {
        setError('Please enter your date of birth.');
        setLoading(false);
        return;
      }
      if (!usernameTrimmed) {
        setError('Please enter a username.');
        setLoading(false);
        return;
      }
      if (!USERNAME_PATTERN.test(usernameTrimmed)) {
        setError('Username can only contain letters, numbers, and underscores. No spaces.');
        setLoading(false);
        return;
      }

      // Username uniqueness check
      const { data: existing, error: usernameError } = await supabase
        .from('profiles')
        .select('id')
        .eq('username', usernameTrimmed)
        .neq('id', user.id)
        .maybeSingle();

      if (usernameError) {
        setError(usernameError.message);
        setLoading(false);
        return;
      }
      if (existing) {
        setError('This username is already taken. Please choose another one.');
        setLoading(false);
        return;
      }

      const payload: ProfilePayload = {
        id: user.id,
        is_moving: mode === 'moving',
        display_name: displayNameTrimmed,
        full_name: fullNameTrimmed,
        date_of_birth: dateOfBirthTrimmed,
        username: usernameTrimmed,
      };

      let targetCountry: string;
      let targetProvince: string | null = null;
      let targetCity: string | null = null;

      if (mode === 'moving') {
        if (!fromCountry || !fromProvince) {
          setError('Please select your hometown country and province.');
          setLoading(false);
          return;
        }
        if (!toCountry || !toProvince || !toCity) {
          setError('Please fill your destination country, province, and city.');
          setLoading(false);
          return;
        }
        payload.from_country = fromCountry;
        payload.from_state = fromProvince;
        payload.to_country = toCountry;
        payload.to_province = toProvince;
        payload.to_city = toCity;
        payload.role = role;
        targetCountry = toCountry;
        targetProvince = toProvince;
        targetCity = toCity;
      } else {
        payload.role = role;
        payload.reasons = intent;
        payload.phone = phone.trim() || undefined;
        targetCountry = '';
        targetProvince = null;
        targetCity = null;
      }

      const { error: upsertError } = await supabase
        .from('profiles')
        .upsert(payload, { onConflict: 'id' });

      if (upsertError) {
        setError(upsertError.message);
        setLoading(false);
        return;
      }

      // Auto-join rooms only for moving users: country, province, city
      if (targetCountry && targetProvince) {
        const { data: existingMemberships } = await supabase
          .from('room_memberships')
          .select('room_id')
          .eq('user_id', user.id);
        const existingRoomIds = new Set((existingMemberships ?? []).map((m: { room_id: string }) => m.room_id));

        const { data: allMatchingRooms } = await supabase
          .from('rooms')
          .select('id, type, province, city')
          .eq('country', targetCountry)
          .eq('is_active', true);

        interface RoomRow {
          id: string;
          type: string;
          province: string | null;
          city: string | null;
        }
        const matching = (allMatchingRooms ?? []) as RoomRow[];
        const countryRoom = matching.find((r) => r.type === 'country');
        const provinceRoom = matching.find((r) => r.type === 'province' && r.province === targetProvince);
        const cityRoom =
          targetCity
            ? matching.find((r) => r.type === 'city' && r.province === targetProvince && r.city === targetCity)
            : null;

        const toJoin = [countryRoom, provinceRoom, cityRoom].filter(Boolean) as RoomRow[];

        for (const r of toJoin) {
          if (existingRoomIds.has(r.id)) continue;
          await supabase.from('room_memberships').insert({ room_id: r.id, user_id: user.id });
          existingRoomIds.add(r.id);
        }
      }

      setDone(true);
      setTimeout(() => router.push('/app'), 1500);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong.');
    } finally {
      setLoading(false);
    }
  };

  if (done) {
    return (
      <div
        className="min-h-screen flex items-center justify-center px-4"
        style={{ background: 'var(--background)' }}
      >
        <div className="max-w-md text-center mapleins-card p-10 rounded-2xl shadow-card">
          <div
            className="inline-flex h-16 w-16 items-center justify-center rounded-2xl text-2xl mb-6"
            style={{ background: 'var(--accent-muted)', color: 'var(--accent)' }}
          >
            ✨
          </div>
          <h1 className="text-2xl font-semibold text-[var(--foreground)]">You&apos;re all set 🎉</h1>
          <p className="mt-2 text-sm text-[var(--muted)]">
            {mode === 'moving'
              ? "Your profile is saved and we've added you to your community rooms. Taking you to the app…"
              : "Your profile is saved. Taking you to the app…"}
          </p>
        </div>
      </div>
    );
  }

  const errorBlock = error ? (
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
  ) : null;

  if (!profileLoaded) {
    return (
      <div
        className="min-h-screen flex items-center justify-center"
        style={{ background: 'var(--background)' }}
      >
        <p className="text-sm text-[var(--muted)]">Loading…</p>
      </div>
    );
  }

  return (
    <div
      className="min-h-screen flex items-center justify-center px-4 py-12"
      style={{ background: 'var(--background)' }}
    >
      <div className="w-full max-w-xl mapleins-card p-8 rounded-2xl shadow-card">
        <h1 className="text-2xl font-semibold text-[var(--foreground)] mb-2">Welcome</h1>
        <p className="text-sm text-[var(--muted)] mb-6">
          {mode === 'profile'
            ? 'Tell us a bit about yourself first.'
            : 'We\'ll use this information to connect you with the right country, province, and city communities.'}
        </p>

        {mode === 'profile' && (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-[var(--foreground)] mb-1.5">Choose your username</label>
              <input
                type="text"
                className="mapleins-input w-full rounded-lg px-4 py-2.5 text-sm placeholder:text-[var(--muted)]"
                placeholder="e.g. rohan123"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-[var(--foreground)] mb-1.5">Full name</label>
              <input
                type="text"
                className="mapleins-input w-full rounded-lg px-4 py-2.5 text-sm placeholder:text-[var(--muted)]"
                placeholder="e.g. Rohan Kakkar"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-[var(--foreground)] mb-1.5">Name to show in chat (optional)</label>
              <input
                type="text"
                className="mapleins-input w-full rounded-lg px-4 py-2.5 text-sm placeholder:text-[var(--muted)]"
                placeholder="If empty, uses first name from full name"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-[var(--foreground)] mb-1.5">Date of birth</label>
              <input
                type="date"
                className="mapleins-input w-full rounded-lg px-4 py-2.5 text-sm"
                value={dateOfBirth}
                onChange={(e) => setDateOfBirth(e.target.value)}
              />
            </div>
            {errorBlock}
            <div className="flex justify-end pt-2">
              <button
                type="button"
                onClick={() => {
                  const fn = fullName.trim();
                  const dob = dateOfBirth.trim();
                  const un = username.trim().toLowerCase();
                  if (!un) {
                    setError('Please enter a username.');
                    return;
                  }
                  if (!USERNAME_PATTERN.test(un)) {
                    setError('Username can only contain letters, numbers, and underscores. No spaces.');
                    return;
                  }
                  if (!fn) {
                    setError('Please enter your full name.');
                    return;
                  }
                  if (!dob) {
                    setError('Please enter your date of birth.');
                    return;
                  }
                  setError(null);
                  setMode('start');
                }}
                className="mapleins-btn-primary rounded-lg px-5 py-2.5 text-sm font-medium"
              >
                Continue
              </button>
            </div>
          </div>
        )}

        {mode === 'start' && (
          <div className="space-y-4">
            <p className="text-sm text-[var(--foreground)]">
              Are you moving to another country, or are you already living there?
            </p>
            <div className="flex flex-col sm:flex-row gap-3">
              <button
                type="button"
                className="mapleins-btn-primary flex-1 rounded-xl py-3 text-sm font-medium"
                onClick={() => setMode('moving')}
              >
                I&apos;m moving / planning to move
              </button>
              <button
                type="button"
                className="mapleins-btn-secondary flex-1 rounded-xl py-3 text-sm font-medium"
                onClick={() => setMode('local')}
              >
                I already live here (I&apos;m a local)
              </button>
            </div>
            <button type="button" className="inline-flex items-center gap-1 text-sm text-[var(--muted)] hover:text-[var(--foreground)] transition-colors mt-2" onClick={() => setMode('profile')}>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
              Back
            </button>
          </div>
        )}

        {mode === 'moving' && (
          <form onSubmit={handleSubmit} className="space-y-4">
            <p className="text-sm text-[var(--foreground)]">Tell us a bit about your move.</p>
            <div className="space-y-2">
              <h2 className="text-sm font-semibold text-[var(--foreground)]">Where are you coming from?</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-[var(--foreground)] mb-1.5">From country</label>
                  <select
                    className="mapleins-input w-full rounded-lg px-4 py-2.5 text-sm"
                    value={fromCountry}
                    onChange={(e) => setFromCountry(e.target.value)}
                  >
                    <option value="">Select</option>
                    {countries.map((c) => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-[var(--foreground)] mb-1.5">From province</label>
                  <select
                    className="mapleins-input w-full rounded-lg px-4 py-2.5 text-sm"
                    value={fromProvince}
                    onChange={(e) => setFromProvince(e.target.value)}
                    disabled={fromCountry !== 'India'}
                  >
                    <option value="">Select</option>
                    {indiaStates.map((s) => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
              </div>
            </div>
            <div className="space-y-2 pt-2">
              <h2 className="text-sm font-semibold text-[var(--foreground)]">Where are you going?</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-[var(--foreground)] mb-1.5">To country</label>
                  <select className="mapleins-input w-full rounded-lg px-4 py-2.5 text-sm" value={toCountry} onChange={(e) => setToCountry(e.target.value)}>
                    <option value="">Select</option>
                    {countries.map((c) => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-[var(--foreground)] mb-1.5">To province / state</label>
                  <select className="mapleins-input w-full rounded-lg px-4 py-2.5 text-sm" value={toProvince} onChange={(e) => { setToProvince(e.target.value); setToCity(''); }}>
                    <option value="">Select</option>
                    {provincesCanada.map((p) => <option key={p} value={p}>{p}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-[var(--foreground)] mb-1.5">To city</label>
                <select className="mapleins-input w-full rounded-lg px-4 py-2.5 text-sm" value={toCity} onChange={(e) => setToCity(e.target.value)} disabled={!toProvince}>
                  <option value="">Select</option>
                  {toProvinceCities.map((city) => <option key={city} value={city}>{city}</option>)}
                </select>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-[var(--foreground)] mb-1.5">Your role</label>
              <select className="mapleins-input w-full rounded-lg px-4 py-2.5 text-sm" value={role} onChange={(e) => setRole(e.target.value)}>
                <option value="student">Student</option>
                <option value="worker">Worker</option>
                <option value="pr">PR</option>
                <option value="visitor">Visitor</option>
                <option value="service_provider">Service provider</option>
                <option value="other">Other</option>
              </select>
            </div>
            {errorBlock}
            <div className="flex items-center justify-between gap-3 pt-2">
              <button type="button" className="inline-flex items-center gap-1 text-sm text-[var(--muted)] hover:text-[var(--foreground)] transition-colors" onClick={() => setMode('start')}>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
                Back
              </button>
              <button type="submit" disabled={loading} className="mapleins-btn-primary rounded-lg px-5 py-2.5 text-sm font-medium disabled:opacity-60 disabled:cursor-not-allowed">
                {loading ? 'Saving…' : 'Continue'}
              </button>
            </div>
          </form>
        )}

        {mode === 'local' && (
          <form onSubmit={handleSubmit} className="space-y-4">
            <p className="text-sm text-[var(--foreground)]">Tell us how you want to use the app.</p>
            <div>
              <label className="block text-sm font-medium text-[var(--foreground)] mb-1.5">Phone number (optional)</label>
              <input
                type="tel"
                className="mapleins-input w-full rounded-lg px-4 py-2.5 text-sm placeholder:text-[var(--muted)]"
                placeholder="e.g. +1 234 567 8900"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-[var(--foreground)] mb-1.5">Your role</label>
              <select className="mapleins-input w-full rounded-lg px-4 py-2.5 text-sm" value={role} onChange={(e) => setRole(e.target.value)}>
                <option value="student">Student</option>
                <option value="worker">Worker</option>
                <option value="pr">PR</option>
                <option value="visitor">Visitor</option>
                <option value="service_provider">Service provider</option>
                <option value="other">Other</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-[var(--foreground)] mb-1.5">What do you want to do here?</label>
              <select className="mapleins-input w-full rounded-lg px-4 py-2.5 text-sm" value={intent} onChange={(e) => setIntent(e.target.value)}>
                <option value="help_newcomers">Help newcomers</option>
                <option value="offer_services">Offer services</option>
                <option value="buy_sell">Buy / sell items</option>
                <option value="just_explore">Just explore</option>
              </select>
            </div>
            {errorBlock}
            <div className="flex items-center justify-between gap-3 pt-2">
              <button type="button" className="inline-flex items-center gap-1 text-sm text-[var(--muted)] hover:text-[var(--foreground)] transition-colors" onClick={() => setMode('start')}>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
                Back
              </button>
              <button type="submit" disabled={loading} className="mapleins-btn-primary rounded-lg px-5 py-2.5 text-sm font-medium disabled:opacity-60 disabled:cursor-not-allowed">
                {loading ? 'Saving…' : 'Continue'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}