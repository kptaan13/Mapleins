'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabaseClient';

interface ProfileLocation {
  role: string | null;
  to_country: string | null;
  to_province: string | null;
  to_city: string | null;
  current_country: string | null;
  current_province: string | null;
  current_city: string | null;
}

function normalizeLocation(profile: ProfileLocation | null) {
  if (!profile) {
    return { country: '', province: '', city: '', role: null as string | null };
  }

  const role = profile.role;
  const country = profile.current_country || profile.to_country || '';
  const province = profile.current_province || profile.to_province || '';
  const city = profile.current_city || profile.to_city || '';

  return { country, province, city, role };
}

export default function GuidesPage() {
  const [loading, setLoading] = useState(true);
  const [location, setLocation] = useState<{
    country: string;
    province: string;
    city: string;
    role: string | null;
  } | null>(null);

  useEffect(() => {
    const load = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        setLocation(null);
        setLoading(false);
        return;
      }

      const { data } = await supabase
        .from('profiles')
        .select('role, to_country, to_province, to_city, current_country, current_province, current_city')
        .eq('id', user.id)
        .maybeSingle<ProfileLocation>();

      setLocation(normalizeLocation(data ?? null));
      setLoading(false);
    };

    load();
  }, []);

  if (loading) {
    return (
      <div
        className="min-h-screen flex items-center justify-center"
        style={{ background: 'var(--background)' }}
      >
        <p className="text-sm text-[var(--muted)]">Loading guides…</p>
      </div>
    );
  }

  const country = location?.country || '';
  const province = location?.province || '';
  const rawCity = location?.city || '';
  const role = location?.role || null;

  const cityKey = rawCity.trim().toLowerCase();
  const provinceKey = province.trim().toLowerCase();

  const isCanada = country.toLowerCase() === 'canada';

  // City flags for V1
  const isToronto = cityKey === 'toronto';
  const isBrampton = cityKey === 'brampton';
  const isMontreal = cityKey === 'montreal';
  const isCalgary = cityKey === 'calgary';
  const isEdmonton = cityKey === 'edmonton';
  const isVancouver = cityKey === 'vancouver';
  const isSurrey = cityKey === 'surrey';

  const inV1City = isToronto || isBrampton || isMontreal || isCalgary || isEdmonton || isVancouver || isSurrey;

  // Province selection per city
  const showOntario = provinceKey === 'ontario' && (isToronto || isBrampton);
  const showQuebec = provinceKey === 'quebec' && isMontreal;
  const showAlberta = provinceKey === 'alberta' && (isCalgary || isEdmonton);
  const showBC = provinceKey === 'british columbia' && (isVancouver || isSurrey);

  const roleLabel =
    role === 'student' ? 'student' : role === 'worker' ? 'worker' : role === 'visitor' ? 'visitor' : 'newcomer';

  return (
    <div
      className="min-h-screen flex flex-col"
      style={{ background: 'var(--background)' }}
    >
      <header className="sticky top-0 z-10 flex items-center justify-between px-4 sm:px-6 py-4 bg-[var(--card)] shadow-nav border-b border-[var(--border-subtle)]">
        <h1 className="text-lg font-semibold tracking-tight text-[var(--foreground)]">
          Guides
        </h1>
        <Link
          href="/app"
          className="inline-flex items-center gap-1 text-sm text-[var(--muted)] hover:text-[var(--foreground)] transition-colors"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
          Back
        </Link>
      </header>

      <main className="flex-1 max-w-3xl mx-auto w-full px-4 sm:px-6 py-8 space-y-8">
        <header>
          <h2 className="text-xl sm:text-2xl font-semibold text-[var(--foreground)] mb-2">
            Landing in Canada – step by step
          </h2>
          <p className="text-sm text-[var(--muted)]">
            This guide is written for Indian newcomers landing in Canada. It automatically focuses on your
            current setup. Right now we detect you as a <span className="font-medium">{roleLabel}</span>
            {country || province || rawCity ? (
              <>
                {' '}
                in <span className="font-medium">{[rawCity, province, country].filter(Boolean).join(', ')}</span>.
              </>
            ) : (
              ' – set your location in onboarding to see more specific guides.'
            )}
          </p>
          {!inV1City && country && (
            <p className="mt-1 text-xs text-[var(--muted)]">
              For V1 we have detailed city guides for Toronto, Brampton, Montreal, Calgary, Edmonton, Vancouver, and Surrey.
              You&apos;ll still see Canada‑wide and province‑level tips.
            </p>
          )}
        </header>

        {/* 1. Canada-wide documents (by role) */}
        {(!location || isCanada) && (
          <section className="mapleins-card p-6 rounded-2xl space-y-4 shadow-card">
            <h2 className="text-lg font-semibold text-[var(--foreground)]">
              1. Canada-wide documents (federal)
            </h2>
            <p className="text-sm text-[var(--muted)]">
              These are things everyone should know about, but the exact steps depend on your role.
            </p>

            <div className="space-y-3">
              <h3 className="text-sm font-semibold text-[var(--foreground)]">For students (study permit)</h3>
              <ul className="list-disc list-inside space-y-1.5 text-sm text-[var(--foreground)]">
                <li>
                  <span className="font-medium">Study permit:</span> keep your permit and passport together. You
                  must stay enrolled at your designated learning institution (DLI).
                </li>
                <li>
                  <span className="font-medium">GIC / proof of funds:</span> if you used a GIC for your visa, your
                  bank will release an initial amount when you visit a branch. Bring your passport, study permit,
                  and GIC confirmation letter.
                </li>
                <li>
                  <span className="font-medium">Open a bank account:</span> bring passport, study permit, proof of
                  address (rental agreement / college letter). Ask for a student account with no or low monthly fees.
                </li>
                <li>
                  <span className="font-medium">SIN (Social Insurance Number):</span> apply at Service Canada. You
                  need passport, study permit, and Canadian address. Required for off‑campus work.
                </li>
              </ul>
            </div>

            <div className="space-y-3">
              <h3 className="text-sm font-semibold text-[var(--foreground)]">For workers (work permit)</h3>
              <ul className="list-disc list-inside space-y-1.5 text-sm text-[var(--foreground)]">
                <li>
                  <span className="font-medium">Work permit:</span> check if it is employer‑specific or open.
                  Make sure your job matches the conditions written on the permit.
                </li>
                <li>
                  <span className="font-medium">SIN:</span> apply as soon as you land so your employer can pay you
                  legally and deduct taxes.
                </li>
                <li>
                  <span className="font-medium">Bank account + payroll:</span> open a chequing account and give your
                  employer a void cheque or direct deposit form.
                </li>
              </ul>
            </div>

            <div className="space-y-3">
              <h3 className="text-sm font-semibold text-[var(--foreground)]">For visitors (visitor record / TRV)</h3>
              <ul className="list-disc list-inside space-y-1.5 text-sm text-[var(--foreground)]">
                <li>
                  <span className="font-medium">Visitor status:</span> check the stamp or document for your allowed
                  length of stay. You generally cannot work.
                </li>
                <li>
                  <span className="font-medium">Travel insurance:</span> keep proof handy in case of medical emergencies.
                </li>
              </ul>
            </div>
          </section>
        )}

        {/* 2. Province-level tasks – only show the province for the selected city */}
        {(showOntario || showQuebec || showAlberta || showBC || !location) && (
          <section className="mapleins-card p-6 rounded-2xl space-y-4 shadow-card">
            <h2 className="text-lg font-semibold text-[var(--foreground)]">
              2. Province‑level tasks (ID, health, licence)
            </h2>
            <p className="text-sm text-[var(--muted)]">
              Your province controls your health card, provincial ID, and driving licence. Start these in the first
              few weeks.
            </p>

            {(!location || showOntario) && (
              <div className="space-y-3">
                <h3 className="text-sm font-semibold text-[var(--foreground)]">Ontario (Toronto & Brampton)</h3>
                <ul className="list-disc list-inside space-y-1.5 text-sm text-[var(--foreground)]">
                  <li>
                    <span className="font-medium">Ontario Health Card (OHIP):</span> many international students
                    use college/private insurance instead of OHIP. Workers and PRs can apply at ServiceOntario when
                    eligible.
                  </li>
                  <li>
                    <span className="font-medium">Ontario Photo Card:</span> if you don"t drive, you can get a
                    government ID card (useful for banks, SIM cards, etc.).
                  </li>
                  <li>
                    <span className="font-medium">Driving licence (G1/G2/G):</span> if you plan to drive, start the
                    G1 theory test and bring your Indian driving history if you have it.
                  </li>
                  <li>
                    <span className="font-medium">College / institute:</span> finish in‑person registration and keep
                    your student ID handy – it helps with transit and SIM discounts.
                  </li>
                </ul>
              </div>
            )}

            {(!location || showQuebec) && (
              <div className="space-y-3">
                <h3 className="text-sm font-semibold text-[var(--foreground)]">Quebec (Montreal)</h3>
                <ul className="list-disc list-inside space-y-1.5 text-sm text-[var(--foreground)]">
                  <li>
                    <span className="font-medium">RAMQ health card:</span> Quebec&apos;s public health insurance. Some
                    international students may use private/college plans instead.
                  </li>
                  <li>
                    <span className="font-medium">Quebec ID / driving licence:</span> if you&apos;re staying long term,
                    exchange or get a provincial licence and photo ID.
                  </li>
                  <li>
                    <span className="font-medium">Institute:</span> complete registration and keep official
                    letters/attestations handy for admin work.
                  </li>
                </ul>
              </div>
            )}

            {(!location || showAlberta) && (
              <div className="space-y-3">
                <h3 className="text-sm font-semibold text-[var(--foreground)]">Alberta (Calgary & Edmonton)</h3>
                <ul className="list-disc list-inside space-y-1.5 text-sm text-[var(--foreground)]">
                  <li>
                    <span className="font-medium">Alberta Health Care (AHCIP):</span> many newcomers in Alberta can
                    register for AHCIP. Check if your status (student/worker) is eligible and register soon after
                    arrival.
                  </li>
                  <li>
                    <span className="font-medium">Alberta ID card:</span> if you don&apos;t drive, apply for an Alberta
                    ID card for everyday identification.
                  </li>
                  <li>
                    <span className="font-medium">Driving licence:</span> if you plan to drive in Calgary, start the
                    Class 7 learner licence process and bring overseas driving history if available.
                  </li>
                </ul>
              </div>
            )}

            {(!location || showBC) && (
              <div className="space-y-3">
                <h3 className="text-sm font-semibold text-[var(--foreground)]">British Columbia (Vancouver & Surrey)</h3>
                <ul className="list-disc list-inside space-y-1.5 text-sm text-[var(--foreground)]">
                  <li>
                    <span className="font-medium">MSP (Medical Services Plan):</span> BC&apos;s public health insurance.
                    Most newcomers must register and there may be a waiting period – plan private coverage for the
                    gap.
                  </li>
                  <li>
                    <span className="font-medium">BC ID:</span> if you don&apos;t drive, apply for a BC Services Card / ID
                    for everyday use.
                  </li>
                  <li>
                    <span className="font-medium">Driving licence:</span> if you plan to drive in Vancouver/Surrey,
                    learn the Class 5 system and rules for exchanging an international licence.
                  </li>
                </ul>
              </div>
            )}
          </section>
        )}

        {/* 3. City-specific basics – only show the city the user is in (V1 cities only) */}
        {(inV1City || !location) && (
          <section className="mapleins-card p-6 rounded-2xl space-y-4 shadow-card">
            <h2 className="text-lg font-semibold text-[var(--foreground)]">
              3. City‑level basics (bus passes & SIM cards)
            </h2>
            <p className="text-sm text-[var(--muted)]">
              This is where day‑to‑day life happens: how you move around and which network keeps you online.
            </p>

            {(!location || isToronto) && (
              <div className="space-y-3">
                <h3 className="text-sm font-semibold text-[var(--foreground)]">Toronto</h3>
                <ul className="list-disc list-inside space-y-1.5 text-sm text-[var(--foreground)]">
                  <li>
                    <span className="font-medium">Transit:</span> TTC subways, buses, and streetcars. Get a PRESTO
                    card. Students can load a discounted monthly pass once your student ID is verified.
                  </li>
                  <li>
                    <span className="font-medium">SIM & networks:</span> Bell, Rogers, TELUS have the strongest
                    coverage; Koodo, Fido, Virgin, Freedom are cheaper options. Freedom is fine in the city core.
                  </li>
                  <li>
                    <span className="font-medium">Where to get:</span> PRESTO at subway stations and Shoppers
                    Drug Mart; SIMs at carrier kiosks in malls and big stores (Walmart, Best Buy).
                  </li>
                </ul>
              </div>
            )}

            {(!location || isBrampton) && (
              <div className="space-y-3">
                <h3 className="text-sm font-semibold text-[var(--foreground)]">Brampton</h3>
                <ul className="list-disc list-inside space-y-1.5 text-sm text-[var(--foreground)]">
                  <li>
                    <span className="font-medium">Transit:</span> Brampton Transit with PRESTO; connects into TTC and
                    GO Transit for Toronto travel.
                  </li>
                  <li>
                    <span className="font-medium">SIM & networks:</span> similar options as Toronto. Many students use
                    value brands (Freedom, Fido, Koodo) depending on coverage in their area.
                  </li>
                  <li>
                    <span className="font-medium">Where to get:</span> bus terminals, malls, and plazas along
                    Hurontario, Steeles, and Queen.
                  </li>
                </ul>
              </div>
            )}

            {(!location || isMontreal) && (
              <div className="space-y-3">
                <h3 className="text-sm font-semibold text-[var(--foreground)]">Montreal</h3>
                <ul className="list-disc list-inside space-y-1.5 text-sm text-[var(--foreground)]">
                  <li>
                    <span className="font-medium">Transit:</span> STM metro and buses. Get an OPUS card and load a
                    monthly STM pass, with a student discount if you qualify.
                  </li>
                  <li>
                    <span className="font-medium">SIM & networks:</span> Bell, Rogers, TELUS plus Videotron and
                    Freedom. In Montreal core, Videotron/Freedom can offer good value.
                  </li>
                  <li>
                    <span className="font-medium">Where to get:</span> OPUS at metro stations; SIMs at carrier stores
                    on Sainte‑Catherine and in major malls.
                  </li>
                </ul>
              </div>
            )}

            {(!location || isCalgary) && (
              <div className="space-y-3">
                <h3 className="text-sm font-semibold text-[var(--foreground)]">Calgary</h3>
                <ul className="list-disc list-inside space-y-1.5 text-sm text-[var(--foreground)]">
                  <li>
                    <span className="font-medium">Transit:</span> Calgary Transit (C‑Train + buses). Monthly passes
                    and U‑Pass options for eligible students.
                  </li>
                  <li>
                    <span className="font-medium">SIM & networks:</span> major carriers have strong coverage; look at
                    value brands for cheaper plans.
                  </li>
                  <li>
                    <span className="font-medium">Where to get:</span> transit passes at C‑Train stations and
                    convenience stores; SIMs at malls and electronics stores.
                  </li>
                </ul>
              </div>
            )}

            {(!location || isEdmonton) && (
              <div className="space-y-3">
                <h3 className="text-sm font-semibold text-[var(--foreground)]">Edmonton</h3>
                <ul className="list-disc list-inside space-y-1.5 text-sm text-[var(--foreground)]">
                  <li>
                    <span className="font-medium">Transit:</span> Edmonton Transit (LRT + buses). Monthly passes and
                    U‑Pass for eligible students.
                  </li>
                  <li>
                    <span className="font-medium">SIM & networks:</span> major carriers plus value brands. Good
                    coverage across the city.
                  </li>
                  <li>
                    <span className="font-medium">Where to get:</span> transit passes at LRT stations and Shoppers;
                    SIMs at malls and carrier stores.
                  </li>
                </ul>
              </div>
            )}

            {(!location || isVancouver) && (
              <div className="space-y-3">
                <h3 className="text-sm font-semibold text-[var(--foreground)]">Vancouver</h3>
                <ul className="list-disc list-inside space-y-1.5 text-sm text-[var(--foreground)]">
                  <li>
                    <span className="font-medium">Transit:</span> TransLink (SkyTrain, SeaBus, buses). Use a Compass
                    Card and look into U‑Pass if your school offers it.
                  </li>
                  <li>
                    <span className="font-medium">SIM & networks:</span> major carriers plus discount brands; coverage
                    is generally good across Metro Vancouver.
                  </li>
                  <li>
                    <span className="font-medium">Where to get:</span> Compass Cards at SkyTrain stations; SIMs at
                    Robson Street/downtown malls and suburban malls.
                  </li>
                </ul>
              </div>
            )}

            {(!location || isSurrey) && (
              <div className="space-y-3">
                <h3 className="text-sm font-semibold text-[var(--foreground)]">Surrey</h3>
                <ul className="list-disc list-inside space-y-1.5 text-sm text-[var(--foreground)]">
                  <li>
                    <span className="font-medium">Transit:</span> also under TransLink; SkyTrain lines and buses
                    connect Surrey to the rest of Metro Vancouver.
                  </li>
                  <li>
                    <span className="font-medium">SIM & networks:</span> similar options as Vancouver. Many newcomers
                    use value carriers with good coverage in Surrey neighbourhoods.
                  </li>
                  <li>
                    <span className="font-medium">Where to get:</span> Surrey Central and Guildford area malls and
                    plazas have multiple carrier stores.
                  </li>
                </ul>
              </div>
            )}

            <p className="text-xs text-[var(--muted)]">
              We&apos;ll keep expanding these guides for more provinces and cities. For V1, we&apos;ve focused on
              Montreal, Toronto, Brampton, Calgary, Edmonton, Vancouver, and Surrey.
            </p>
          </section>
        )}
      </main>
    </div>
  );
}
