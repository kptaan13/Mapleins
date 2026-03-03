import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-white">

      {/* Header */}
      <header className="border-b border-gray-100 sticky top-0 bg-white z-50">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
          <Link href="/" className="text-2xl font-bold text-[#166534] shrink-0">Mapleins</Link>
          <nav className="hidden md:flex items-center gap-1 text-sm font-medium">
            <Link href="/"        className="px-3 py-2 rounded-md text-gray-700 hover:text-[#166534] hover:bg-green-50 transition-colors">Home</Link>
            <Link href="/about"   className="px-3 py-2 rounded-md text-[#166534] bg-green-50 font-medium">Our Story</Link>
            <Link href="/blog"    className="px-3 py-2 rounded-md text-gray-700 hover:text-[#166534] hover:bg-green-50 transition-colors">Blog</Link>
            <Link href="/contact" className="px-3 py-2 rounded-md text-gray-700 hover:text-[#166534] hover:bg-green-50 transition-colors">Contact</Link>
          </nav>
          <div className="flex items-center gap-3">
            <Link href="/login" className="text-sm font-medium text-gray-700 hover:text-[#166534] px-3 py-2 rounded-md hover:bg-green-50 transition-colors hidden md:inline">Sign in</Link>
            <Link href="/signup">
              <Button className="bg-[#166534] hover:bg-[#15803d] text-white">Get Started →</Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="max-w-3xl mx-auto px-4 sm:px-6 pt-16 pb-10 text-center">
        <span className="text-sm font-semibold text-[#166534] uppercase tracking-widest">Our Story</span>
        <h1 className="mt-3 text-4xl font-bold text-gray-900 leading-tight">
          We built the tool we wished we had when we were applying in Canada
        </h1>
        <p className="mt-5 text-lg text-gray-600">
          Mapleins started from a simple frustration: sending dozens of applications to Canadian jobs, getting silence back, and having no idea what we were doing wrong.
        </p>
      </section>

      {/* Story body */}
      <section className="max-w-2xl mx-auto px-4 sm:px-6 pb-16 space-y-6 text-gray-700 text-base leading-relaxed">
        <p>
          When newcomers arrive in Canada with years of solid experience, they often find themselves stuck. The Canadian job market has its own rhythm — ATS filters, keyword density, bullet-point formatting, and even how you phrase accomplishments all matter in ways that aren&apos;t obvious if you grew up with a different resume style.
        </p>
        <p>
          Resume consultants charge $200–$400. LinkedIn Premium is $50 a month. Career coaches are even more expensive. And after all that, there&apos;s still no guarantee of a single interview.
        </p>
        <p>
          We thought that was wrong. Good people shouldn&apos;t miss good jobs just because they don&apos;t know the &quot;right&quot; Canadian format or ATS tricks.
        </p>
        <p>
          So we built Mapleins — an AI-powered resume editor and job matcher specifically for the Canadian market. You upload your resume, tell us your target role and city, and we rebuild it with the right keywords, bullet structure, and ATS signals for Canadian employers. Then we surface 12–15 roles that actually match your background instead of throwing you at every posting on the internet.
        </p>
        <p className="font-semibold text-gray-900">
          Mapleins is free. We keep it running through optional donations from users who land interviews and want to pay it forward.
        </p>
        <p>
          If Mapleins helped you get an interview or a job, we&apos;d love to hear your story — and if you can, a small donation helps us keep it free for the next person who needs it.
        </p>

        <div className="pt-4 flex flex-col sm:flex-row gap-3">
          <Link href="/signup">
            <Button className="bg-[#22c55e] hover:bg-[#16a34a] text-white font-semibold px-6 py-5 h-auto">
              Try Mapleins Free →
            </Button>
          </Link>
          <Link href="/contact">
            <Button variant="outline" className="px-6 py-5 h-auto font-semibold">
              Get in Touch
            </Button>
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-gray-200 py-6">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 flex flex-col sm:flex-row justify-between items-center gap-3 text-sm text-gray-600 font-medium">
          <span>© {new Date().getFullYear()} Mapleins</span>
          <div className="flex gap-6">
            <Link href="/"        className="hover:text-[#166534] transition-colors">Home</Link>
            <Link href="/contact" className="hover:text-[#166534] transition-colors">Contact</Link>
            <Link href="/blog"    className="hover:text-[#166534] transition-colors">Blog</Link>
          </div>
        </div>
      </footer>

    </div>
  );
}
