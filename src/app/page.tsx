import Link from 'next/link';

export default function Home() {
  return (
    <div
      className="min-h-screen flex flex-col"
      style={{ background: 'var(--background-gradient)' }}
    >
      <header className="flex items-center justify-between px-6 py-5 border-b border-[var(--border-subtle)]">
        <span className="text-xl font-bold tracking-tight text-[var(--foreground)]">
          Asualy
        </span>
        <Link
          href="/auth/sign-in"
          className="asualy-btn-primary rounded-xl px-5 py-2.5 text-sm font-semibold"
        >
          Sign in
        </Link>
      </header>

      <main className="flex-1 flex flex-col items-center justify-center px-6 py-24 text-center relative overflow-hidden">
        {/* Decorative glow */}
        <div
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] rounded-full opacity-20 blur-3xl pointer-events-none"
          style={{ background: 'var(--accent)' }}
        />
        <div
          className="absolute top-1/3 right-1/4 w-64 h-64 rounded-full opacity-10 blur-2xl pointer-events-none"
          style={{ background: 'var(--peach)' }}
        />

        <div className="relative z-10">
          <h1 className="max-w-2xl text-4xl sm:text-5xl md:text-6xl font-bold tracking-tight text-[var(--foreground)] leading-[1.1]">
            Find your community abroad
          </h1>
          <p className="mt-6 max-w-xl mx-auto text-lg text-[var(--muted)] leading-relaxed">
            Guides, housing, local services — everything you need when moving to a new country.
            <span className="block mt-1 text-[var(--muted-strong)]">
              Starting with Indian students in Canada.
            </span>
          </p>
          <div className="mt-12 flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/auth/sign-in"
              className="asualy-btn-primary rounded-xl px-8 py-4 text-base font-semibold inline-flex items-center justify-center"
            >
              Get started
            </Link>
            <Link
              href="/auth/sign-in"
              className="asualy-btn-secondary rounded-xl px-8 py-4 text-base font-medium inline-flex items-center justify-center"
            >
              Sign in
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}
