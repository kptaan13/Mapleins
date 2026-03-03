import Link from "next/link";
import { Button } from "@/components/ui/button";

export const metadata = { title: "Privacy Policy — Mapleins" };

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-white">

      {/* Header */}
      <header className="border-b border-gray-100 sticky top-0 bg-white z-50">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
          <Link href="/" className="text-2xl font-bold text-[#166534] shrink-0">Mapleins</Link>
          <nav className="hidden md:flex items-center gap-1 text-sm font-medium">
            <Link href="/"        className="px-3 py-2 rounded-md text-gray-700 hover:text-[#166534] hover:bg-green-50 transition-colors">Home</Link>
            <Link href="/about"   className="px-3 py-2 rounded-md text-gray-700 hover:text-[#166534] hover:bg-green-50 transition-colors">Our Story</Link>
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

      <main className="max-w-3xl mx-auto px-4 sm:px-6 py-16">

        <div className="mb-10">
          <span className="text-sm font-semibold text-[#166534] uppercase tracking-widest">Legal</span>
          <h1 className="mt-3 text-4xl font-bold text-gray-900">Privacy Policy</h1>
          <p className="mt-3 text-sm text-gray-500">Last updated: {new Date().getFullYear()}</p>
        </div>

        <div className="prose prose-gray max-w-none space-y-8 text-gray-700 leading-relaxed">

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">1. What we collect</h2>
            <p>
              When you use Mapleins, we collect information you provide directly — your name, email address, and the resume
              you upload. We also collect information about your target job type and city so we can tailor our AI recommendations.
            </p>
            <p className="mt-3">
              We do not collect payment card numbers. All payments are processed securely by Stripe; we only receive
              a confirmation that a payment was made.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">2. How we use your information</h2>
            <p>We use your information to:</p>
            <ul className="list-disc list-inside mt-2 space-y-1 text-gray-600">
              <li>Generate your optimised, ATS-ready resume</li>
              <li>Match you with relevant Canadian job listings</li>
              <li>Send you a receipt for any donation made</li>
              <li>Improve the Mapleins service over time</li>
            </ul>
            <p className="mt-3">
              We do not sell, rent, or share your personal information or resume content with third parties for
              marketing purposes.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">3. AI processing</h2>
            <p>
              Your resume content is sent to a third-party AI provider (Groq) for analysis and optimisation.
              We send only the text content of your resume — no personally identifying metadata. Groq&apos;s data
              handling is governed by their own privacy policy.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">4. Data storage</h2>
            <p>
              Your account information and resume data are stored securely using Supabase, a GDPR-compliant
              database platform. Data is stored on servers in the United States or Canada.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">5. Cookies</h2>
            <p>
              We use cookies solely to maintain your login session. We do not use advertising cookies or
              third-party tracking cookies.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">6. Your rights</h2>
            <p>
              You may request deletion of your account and associated data at any time by contacting us at{" "}
              <a href="mailto:hello@mapleins.ca" className="text-[#166534] hover:underline">hello@mapleins.ca</a>.
              We will process deletion requests within 30 days.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">7. Contact</h2>
            <p>
              If you have questions about this policy, email us at{" "}
              <a href="mailto:hello@mapleins.ca" className="text-[#166534] hover:underline">hello@mapleins.ca</a>{" "}
              or use our <Link href="/contact" className="text-[#166534] hover:underline">contact form</Link>.
            </p>
          </section>

        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-gray-200 py-6 mt-4">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 flex flex-col sm:flex-row justify-between items-center gap-3 text-sm text-gray-600 font-medium">
          <span>© {new Date().getFullYear()} Mapleins</span>
          <div className="flex gap-6">
            <Link href="/"       className="hover:text-[#166534] transition-colors">Home</Link>
            <Link href="/terms"  className="hover:text-[#166534] transition-colors">Terms of Use</Link>
            <Link href="/contact" className="hover:text-[#166534] transition-colors">Contact</Link>
          </div>
        </div>
      </footer>

    </div>
  );
}
