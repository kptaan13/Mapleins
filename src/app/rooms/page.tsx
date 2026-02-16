'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';

interface Room {
  id: string;
  name: string;
  type: string;
  country: string;
  province: string | null;
  city: string | null;
}

interface ProfileSummary {
  display_name: string | null;
  username: string | null;
  current_country: string | null;
  current_province: string | null;
  current_city: string | null;
  to_country: string | null;
  to_province: string | null;
  to_city: string | null;
}

export default function RoomsPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [profile, setProfile] = useState<ProfileSummary | null>(null);

  useEffect(() => {
    const load = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        router.push('/auth/sign-in');
        return;
      }

      const { data: profileData } = await supabase
        .from('profiles')
        .select('display_name, username, current_country, current_province, current_city, to_country, to_province, to_city')
        .eq('id', user.id)
        .maybeSingle<ProfileSummary>();
      if (profileData) setProfile(profileData);

      const { data, error } = await supabase
        .from('room_memberships')
        .select(
          `
          room:rooms (
            id,
            name,
            type,
            country,
            province,
            city
          )
        `,
        )
        .eq('user_id', user.id);

      if (error) {
        setLoading(false);
        return;
      }

      interface MembershipRow {
        room: Room | null;
      }

      const rows = (data ?? []) as unknown as MembershipRow[];

      const flattened: Room[] = rows
        .map((row) => row.room)
        .filter((r): r is Room => !!r);

      setRooms(flattened);
      setLoading(false);
    };

    load();
  }, [router]);

  if (loading) {
    return (
      <div
        className="min-h-screen flex items-center justify-center"
        style={{ background: 'var(--background)' }}
      >
        <p className="text-sm text-[var(--muted)]">Loading your groups…</p>
      </div>
    );
  }

  return (
    <div
      className="min-h-screen flex flex-col"
      style={{ background: 'var(--background)' }}
    >
      <header className="sticky top-0 z-10 flex flex-col gap-1 px-4 sm:px-6 py-4 bg-[var(--card)] shadow-nav border-b border-[var(--border-subtle)]">
        <div className="flex items-center justify-between">
          <h1 className="text-lg font-semibold tracking-tight text-[var(--foreground)]">
            My groups
          </h1>
          <Link
            href="/app"
            className="inline-flex items-center gap-1 text-sm text-[var(--muted)] hover:text-[var(--foreground)] transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
            Back
          </Link>
        </div>
        {profile && (
          <p className="text-xs text-[var(--muted)]">
            {profile.display_name?.trim() || 'Member'}{profile.username?.trim() ? ` (@${profile.username.trim()})` : ''}
            {(profile.current_city || profile.current_province || profile.current_country || profile.to_city || profile.to_province || profile.to_country) && (
              <> · {[profile.current_city || profile.to_city, profile.current_province || profile.to_province, profile.current_country || profile.to_country].filter(Boolean).join(', ')}</>
            )}
          </p>
        )}
      </header>

      <main className="flex-1 px-4 sm:px-6 py-6 max-w-2xl mx-auto w-full">
        {rooms.length === 0 ? (
          <div className="mapleins-card p-8 text-center rounded-2xl">
            <div className="w-14 h-14 rounded-full flex items-center justify-center text-xl font-semibold text-[var(--muted)] mx-auto mb-4" style={{ background: 'var(--accent-muted)' }}>
              ?
            </div>
            <p className="text-sm font-medium text-[var(--foreground)]">No groups yet</p>
            <p className="text-sm text-[var(--muted)] mt-2">
              After onboarding we&apos;ll connect you to your country, province, and city rooms.
            </p>
          </div>
        ) : (
          <ul className="space-y-3">
            {rooms.map((room) => {
              const location = [room.city, room.province, room.country]
                .filter(Boolean)
                .join(', ');

              return (
                <li key={room.id}>
                  <Link
                    href={`/rooms/${room.id}`}
                    className="mapleins-card mapleins-card-interactive flex items-center justify-between px-4 py-4 rounded-xl group"
                  >
                    <div className="flex items-center gap-4">
                      <div
                        className="w-12 h-12 rounded-xl flex items-center justify-center text-lg font-semibold text-white flex-shrink-0"
                        style={{ background: 'var(--accent)' }}
                      >
                        {room.name.charAt(0)}
                      </div>
                      <div>
                        <p className="text-[10px] font-medium uppercase tracking-wider text-[var(--muted)] mb-0.5">
                          {room.type}
                        </p>
                        <p className="text-sm font-semibold text-[var(--foreground)]">
                          {room.name}
                        </p>
                        {location && (
                          <p className="text-xs text-[var(--muted)] mt-0.5">{location}</p>
                        )}
                      </div>
                    </div>
                    <svg className="w-5 h-5 text-[var(--accent)] group-hover:translate-x-0.5 transition-transform flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </main>
    </div>
  );
}
