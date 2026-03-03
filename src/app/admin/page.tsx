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

type Stats = {
  totalUsers: number;
  paidUsers: number;
  totalRevenue: number;
  recentPayments: PaymentRow[];
  recentUsers: UserRow[];
};

export default function AdminPage() {
  const router = useRouter();
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Admin Dashboard</h1>
        <p className="text-gray-500 text-sm mb-8">Overview of users, donations, and platform activity.</p>

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
          </>
        )}
      </main>
    </div>
  );
}
