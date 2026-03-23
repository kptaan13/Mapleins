"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

type UserRow = {
  id: string;
  email: string;
  created_at: string;
  has_paid: boolean;
  paid_at: string | null;
};

type PaymentRow = {
  id: string;
  user_id: string;
  stripe_session_id: string;
  amount: number;
  currency: string;
  status: string;
  paid_at: string;
  user_email?: string;
};

type FeedbackRow = {
  id: string;
  rating: number | null;
  category: string | null;
  message: string;
  email: string | null;
  page: string | null;
  created_at: string;
};

type Stats = {
  totalUsers: number;
  paidUsers: number;
  totalRevenue: number;
  recentPayments: PaymentRow[];
  recentUsers: UserRow[];
  recentFeedback: FeedbackRow[];
};

export default function AdminPage() {
  const router = useRouter();
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [emailSending, setEmailSending] = useState(false);
  const [emailResult, setEmailResult] = useState<{ sent: number; failed: number } | null>(null);

  useEffect(() => {
    async function loadStats() {
      const supabase = createClient();

      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        router.push("/login");
        return;
      }

      // Server-side middleware protects /admin; verify admin email client-side too
      const checkRes = await fetch("/api/admin/check");
      if (!checkRes.ok || (await checkRes.json()).admin !== true) {
        router.push("/dashboard");
        return;
      }

      try {
        // Fetch profiles / users
        const { data: profiles, error: profilesErr } = await supabase
          .from("profiles")
          .select("id, email, created_at, has_paid, paid_at")
          .order("created_at", { ascending: false })
          .limit(50);

        if (profilesErr) throw profilesErr;

        // Fetch payments
        const { data: payments, error: paymentsErr } = await supabase
          .from("payments")
          .select("*")
          .order("paid_at", { ascending: false })
          .limit(20);

        if (paymentsErr) throw paymentsErr;

        // Fetch feedback
        const { data: feedback } = await supabase
          .from("feedback")
          .select("*")
          .order("created_at", { ascending: false })
          .limit(50);

        const users = (profiles || []) as UserRow[];
        const pays = (payments || []) as PaymentRow[];

        // Enrich payments with user emails
        const enriched = pays.map((p) => ({
          ...p,
          user_email: users.find((u) => u.id === p.user_id)?.email || "Unknown",
        }));

        setStats({
          totalUsers: users.length,
          paidUsers: users.filter((u) => u.has_paid).length,
          totalRevenue: pays.reduce((sum, p) => sum + (p.amount || 0), 0),
          recentPayments: enriched,
          recentUsers: users.slice(0, 10),
          recentFeedback: (feedback || []) as FeedbackRow[],
        });
      } catch (err) {
        console.error(err);
        setError("Failed to load admin data. Make sure Supabase tables exist.");
      } finally {
        setLoading(false);
      }
    }

    loadStats();
  }, [router]);

  const handleSignOut = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/");
  };

  const downloadCSV = (filename: string, rows: Record<string, unknown>[]) => {
    if (!rows.length) return;
    const headers = Object.keys(rows[0]);
    const csv = [
      headers.join(","),
      ...rows.map((r) =>
        headers.map((h) => {
          const v = String(r[h] ?? "").replace(/"/g, '""');
          return `"${v}"`;
        }).join(",")
      ),
    ].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleDownloadUsers = async () => {
    const supabase = createClient();
    const { data } = await supabase.from("profiles").select("id, email, has_paid, paid_at, created_at").order("created_at", { ascending: false });
    downloadCSV("mapleins-users.csv", (data || []) as Record<string, unknown>[]);
  };

  const handleDownloadPayments = async () => {
    const supabase = createClient();
    const { data } = await supabase.from("payments").select("*").order("paid_at", { ascending: false });
    downloadCSV("mapleins-payments.csv", (data || []) as Record<string, unknown>[]);
  };

  const handleDownloadWaitlist = async () => {
    const supabase = createClient();
    const { data } = await supabase.from("waitlist").select("*").order("created_at", { ascending: false });
    downloadCSV("mapleins-waitlist.csv", (data || []) as Record<string, unknown>[]);
  };

  const handleDownloadFeedback = async () => {
    const supabase = createClient();
    const { data } = await supabase.from("feedback").select("*").order("created_at", { ascending: false });
    downloadCSV("mapleins-feedback.csv", (data || []) as Record<string, unknown>[]);
  };

  const handleSendWaitlistEmail = async () => {
    if (!confirm("Send the promo email to all waitlist members?")) return;
    setEmailSending(true);
    setEmailResult(null);
    try {
      const res = await fetch("/api/admin/send-waitlist-email", { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed");
      setEmailResult({ sent: data.sent, failed: data.failed });
    } catch (err) {
      alert("Error sending emails: " + (err as Error).message);
    } finally {
      setEmailSending(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/dashboard" className="text-xl font-bold text-[#166534]">
              Mapleins
            </Link>
            <span className="text-xs bg-green-100 text-green-800 px-2 py-0.5 rounded-full font-medium">
              Admin
            </span>
          </div>
          <div className="flex items-center gap-4">
            <Link href="/dashboard" className="text-sm text-gray-600 hover:text-gray-900">
              Dashboard
            </Link>
            <button
              onClick={handleSignOut}
              className="text-sm text-gray-600 hover:text-gray-900"
            >
              Sign out
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-10">
        <div className="flex items-start justify-between mb-8 flex-wrap gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 mb-1">Admin Dashboard</h1>
            <p className="text-gray-500 text-sm">Overview of users, donations, and platform activity.</p>
          </div>
          <div className="flex flex-col items-end gap-2">
            <button
              onClick={handleSendWaitlistEmail}
              disabled={emailSending}
              className="flex items-center gap-2 bg-[#166534] text-white text-sm font-bold px-4 py-2.5 rounded-xl hover:bg-[#14532d] disabled:opacity-50 transition-colors"
            >
              {emailSending ? (
                <>
                  <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                  </svg>
                  Sending…
                </>
              ) : (
                <>
                  <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                  Email Waitlist
                </>
              )}
            </button>
            {emailResult && (
              <p className="text-xs text-gray-500">
                <span className="text-green-700 font-semibold">{emailResult.sent} sent</span>
                {emailResult.failed > 0 && <span className="text-red-500 ml-2">{emailResult.failed} failed</span>}
              </p>
            )}
          </div>
        </div>

        {/* Export buttons */}
        <div className="flex flex-wrap gap-2 mb-8">
          <button onClick={handleDownloadUsers} className="flex items-center gap-1.5 text-xs font-semibold text-gray-600 bg-white border border-gray-200 px-3 py-2 rounded-lg hover:border-[#166534] hover:text-[#166534] transition-colors">
            <svg width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"/></svg>
            Users CSV
          </button>
          <button onClick={handleDownloadPayments} className="flex items-center gap-1.5 text-xs font-semibold text-gray-600 bg-white border border-gray-200 px-3 py-2 rounded-lg hover:border-[#166534] hover:text-[#166534] transition-colors">
            <svg width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"/></svg>
            Payments CSV
          </button>
          <button onClick={handleDownloadWaitlist} className="flex items-center gap-1.5 text-xs font-semibold text-gray-600 bg-white border border-gray-200 px-3 py-2 rounded-lg hover:border-[#166534] hover:text-[#166534] transition-colors">
            <svg width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"/></svg>
            Waitlist CSV
          </button>
          <button onClick={handleDownloadFeedback} className="flex items-center gap-1.5 text-xs font-semibold text-gray-600 bg-white border border-gray-200 px-3 py-2 rounded-lg hover:border-[#166534] hover:text-[#166534] transition-colors">
            <svg width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"/></svg>
            Feedback CSV
          </button>
        </div>

        {loading && (
          <div className="text-center py-20 text-gray-400">Loading stats…</div>
        )}

        {error && (
          <div className="rounded-lg bg-red-50 text-red-700 px-4 py-3 text-sm mb-6">
            {error}
          </div>
        )}

        {stats && (
          <>
            {/* KPI Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-10">
              <div className="bg-white rounded-xl border p-6">
                <p className="text-sm text-gray-500 mb-1">Total Users</p>
                <p className="text-3xl font-bold text-gray-900">{stats.totalUsers}</p>
              </div>
              <div className="bg-white rounded-xl border p-6">
                <p className="text-sm text-gray-500 mb-1">Donors</p>
                <p className="text-3xl font-bold text-[#166534]">{stats.paidUsers}</p>
                <p className="text-xs text-gray-400 mt-1">
                  {stats.totalUsers > 0
                    ? Math.round((stats.paidUsers / stats.totalUsers) * 100)
                    : 0}
                  % donated
                </p>
              </div>
              <div className="bg-white rounded-xl border p-6">
                <p className="text-sm text-gray-500 mb-1">Total Donations</p>
                <p className="text-3xl font-bold text-gray-900">
                  ${stats.totalRevenue.toFixed(2)}{" "}
                  <span className="text-base font-normal text-gray-400">CAD</span>
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Recent Donations */}
              <div className="bg-white rounded-xl border p-6">
                <h2 className="text-base font-semibold text-gray-900 mb-4">
                  Recent Donations
                </h2>
                {stats.recentPayments.length === 0 ? (
                  <p className="text-sm text-gray-400">No donations yet.</p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="text-left text-gray-400 border-b">
                          <th className="pb-2 font-medium">User</th>
                          <th className="pb-2 font-medium">Amount</th>
                          <th className="pb-2 font-medium">Date</th>
                        </tr>
                      </thead>
                      <tbody>
                        {stats.recentPayments.map((p) => (
                          <tr key={p.id} className="border-b last:border-0">
                            <td className="py-2 text-gray-700 truncate max-w-[180px]">
                              {p.user_email}
                            </td>
                            <td className="py-2 text-[#166534] font-medium">
                              ${p.amount} {p.currency?.toUpperCase()}
                            </td>
                            <td className="py-2 text-gray-400">
                              {new Date(p.paid_at).toLocaleDateString("en-CA")}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              {/* Recent Users */}
              <div className="bg-white rounded-xl border p-6">
                <h2 className="text-base font-semibold text-gray-900 mb-4">
                  Recent Users
                </h2>
                {stats.recentUsers.length === 0 ? (
                  <p className="text-sm text-gray-400">No users yet.</p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="text-left text-gray-400 border-b">
                          <th className="pb-2 font-medium">Email</th>
                          <th className="pb-2 font-medium">Donated</th>
                          <th className="pb-2 font-medium">Joined</th>
                        </tr>
                      </thead>
                      <tbody>
                        {stats.recentUsers.map((u) => (
                          <tr key={u.id} className="border-b last:border-0">
                            <td className="py-2 text-gray-700 truncate max-w-[200px]">
                              {u.email}
                            </td>
                            <td className="py-2">
                              {u.has_paid ? (
                                <span className="bg-green-100 text-green-700 text-xs px-2 py-0.5 rounded-full">
                                  Yes
                                </span>
                              ) : (
                                <span className="bg-gray-100 text-gray-500 text-xs px-2 py-0.5 rounded-full">
                                  No
                                </span>
                              )}
                            </td>
                            <td className="py-2 text-gray-400">
                              {new Date(u.created_at).toLocaleDateString("en-CA")}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>

            {/* Feedback */}
            <div className="bg-white rounded-xl border p-6 mt-6">
              <h2 className="text-base font-semibold text-gray-900 mb-4">
                User Feedback
                <span className="ml-2 text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-medium">
                  {stats.recentFeedback.length}
                </span>
              </h2>
              {stats.recentFeedback.length === 0 ? (
                <p className="text-sm text-gray-400">No feedback yet.</p>
              ) : (
                <div className="space-y-3">
                  {stats.recentFeedback.map((f) => (
                    <div key={f.id} className="rounded-xl border border-gray-100 p-4">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1 flex-wrap">
                            {f.rating && (
                              <span className="text-yellow-400 text-sm">{"★".repeat(f.rating)}{"☆".repeat(5 - f.rating)}</span>
                            )}
                            {f.category && (
                              <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">{f.category}</span>
                            )}
                            {f.page && (
                              <span className="text-xs text-gray-400">{f.page}</span>
                            )}
                          </div>
                          <p className="text-sm text-gray-800">{f.message}</p>
                          {f.email && (
                            <p className="text-xs text-[#166534] mt-1">{f.email}</p>
                          )}
                        </div>
                        <span className="text-xs text-gray-400 whitespace-nowrap">
                          {new Date(f.created_at).toLocaleDateString("en-CA")}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        )}
      </main>
    </div>
  );
}
