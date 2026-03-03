import Link from "next/link";
import { Button } from "@/components/ui/button";

const COMING_SOON_POSTS = [
  {
    title: "How Canadian ATS Systems Actually Work — and How to Beat Them",
    tag: "Resume Tips",
    desc: "Most resumes are rejected before a human ever reads them. Here's exactly what ATS scanners look for in Canadian job applications.",
  },
  {
    title: "The 5 Most Common Resume Mistakes Newcomers Make in Canada",
    tag: "Newcomers",
    desc: "From objective statements to photos on resumes — international formats don't always translate. Learn what Canadian recruiters actually expect.",
  },
  {
    title: "Which Canadian Cities Are Hiring Right Now? (2026 Edition)",
    tag: "Job Market",
    desc: "A city-by-city breakdown of where Canadian employers are actively hiring across warehouse, retail, IT, healthcare, and trucking sectors.",
  },
  {
    title: "How to Write a Canadian Cover Letter That Gets Read",
    tag: "Job Search",
    desc: "Short, specific, and confident. We break down the format Canadian hiring managers actually want to see.",
  },
];

export default function BlogPage() {
  return (
    <div className="min-h-screen bg-white">

      {/* Header */}
      <header className="border-b border-gray-100 sticky top-0 bg-white z-50">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
          <Link href="/" className="text-2xl font-bold text-[#166534] shrink-0">Mapleins</Link>
          <nav className="hidden md:flex items-center gap-1 text-sm font-medium">
            <Link href="/"        className="px-3 py-2 rounded-md text-gray-700 hover:text-[#166534] hover:bg-green-50 transition-colors">Home</Link>
            <Link href="/about"   className="px-3 py-2 rounded-md text-gray-700 hover:text-[#166534] hover:bg-green-50 transition-colors">Our Story</Link>
            <Link href="/blog"    className="px-3 py-2 rounded-md text-[#166534] bg-green-50 font-medium">Blog</Link>
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

      <main className="max-w-4xl mx-auto px-4 sm:px-6 py-16">

        <div className="text-center mb-12">
          <span className="text-sm font-semibold text-[#166534] uppercase tracking-widest">Blog</span>
          <h1 className="mt-3 text-4xl font-bold text-gray-900">Canadian Job Search Tips</h1>
          <p className="mt-4 text-lg text-gray-600 max-w-xl mx-auto">
            Practical advice for newcomers navigating the Canadian job market — ATS, resumes, interviews, and more.
          </p>
        </div>

        {/* Coming soon banner */}
        <div className="mb-10 rounded-xl bg-green-50 border border-green-200 px-6 py-4 text-center">
          <p className="text-sm font-semibold text-green-800">✍️ Articles coming soon — check back shortly!</p>
          <p className="text-xs text-green-700 mt-1">
            Want to be notified when we publish?{" "}
            <Link href="/contact" className="underline">Send us your email →</Link>
          </p>
        </div>

        {/* Post previews */}
        <div className="space-y-5">
          {COMING_SOON_POSTS.map((post, i) => (
            <div key={i} className="rounded-xl border p-6 opacity-60 cursor-default">
              <span className="text-xs font-semibold text-[#166534] uppercase tracking-wide">{post.tag}</span>
              <h2 className="mt-1.5 text-lg font-semibold text-gray-900">{post.title}</h2>
              <p className="mt-1 text-sm text-gray-600">{post.desc}</p>
              <span className="mt-3 inline-block text-xs text-gray-400 italic">Coming soon</span>
            </div>
          ))}
        </div>

      </main>

      {/* Footer */}
      <footer className="border-t border-gray-200 py-6 mt-10">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 flex flex-col sm:flex-row justify-between items-center gap-3 text-sm text-gray-600 font-medium">
          <span>© {new Date().getFullYear()} Mapleins</span>
          <div className="flex gap-6">
            <Link href="/"        className="hover:text-[#166534] transition-colors">Home</Link>
            <Link href="/about"   className="hover:text-[#166534] transition-colors">Our Story</Link>
            <Link href="/contact" className="hover:text-[#166534] transition-colors">Contact</Link>
          </div>
        </div>
      </footer>

    </div>
  );
}
