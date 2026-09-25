"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { supabaseBrowser } from "@/lib/supabase/client";
import { useSupabaseUser } from "@/lib/supabase/useSession";
import { CustomerCard, CustomerWithAI } from "@/components/CustomerCard";

// AI-judged fields we pull from customer_profiles to show on each card.
// Concerns ("在乎的事情") come first since they're the most decision-useful
// at-a-glance summary; life_goals fills in when a customer has no concerns
// recorded yet.
function buildAiHighlights(profile?: {
  concerns?: string[] | null;
  life_goals?: string[] | null;
}): string[] {
  if (!profile) return [];
  const pool = [...(profile.concerns ?? []), ...(profile.life_goals ?? [])];
  return pool.slice(0, 2);
}

export default function CustomersPage() {
  const { user, loading: userLoading, error: userError } = useSupabaseUser();
  const [customers, setCustomers] = useState<CustomerWithAI[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");

  useEffect(() => {
    if (!user) return;
    let mounted = true;

    async function load() {
      const [customersRes, profilesRes] = await Promise.all([
        supabaseBrowser
          .from("customers")
          .select("*")
          .order("updated_at", { ascending: false }),
        supabaseBrowser
          .from("customer_profiles")
          .select("customer_id, concerns, life_goals"),
      ]);

      if (!customersRes.error && customersRes.data && mounted) {
        const profileByCustomerId = new Map(
          (profilesRes.data ?? []).map((p) => [p.customer_id as string, p])
        );

        setCustomers(
          customersRes.data.map((c) => ({
            ...c,
            last_contact_at: c.updated_at
              ? new Date(c.updated_at)
                  .toISOString()
                  .slice(0, 10)
                  .replace(/-/g, "/")
              : undefined,
            ai_highlights: buildAiHighlights(profileByCustomerId.get(c.id)),
          }))
        );
      }
      if (mounted) setLoading(false);
    }

    load();
    return () => {
      mounted = false;
    };
  }, [user]);

  const filtered = useMemo(() => {
    const q = query.trim();
    if (!q) return customers;
    return customers.filter((c) =>
      [c.name, c.nickname, c.occupation, c.company]
        .filter(Boolean)
        .some((field) => field!.includes(q))
    );
  }, [customers, query]);

  async function handleLogout() {
    await supabaseBrowser.auth.signOut();
  }

  return (
    <main className="flex min-h-screen flex-col bg-paper pb-8">
      <header className="flex items-start justify-between px-5 pb-4 pt-8">
        <div>
          <p className="text-xs tracking-wide text-muted">人生。房產。學</p>
          <h1 className="mt-1 font-serif text-2xl font-medium text-ink">
            客戶人生地圖
          </h1>
        </div>
        <button
          onClick={handleLogout}
          className="mt-1 text-xs text-muted"
        >
          登出
        </button>
      </header>

      <div className="px-5">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="搜尋客戶"
          className="w-full rounded-card border border-line bg-surface px-4 py-3 text-sm text-ink placeholder:text-muted focus:border-navy focus:outline-none"
        />
      </div>

      <div className="px-5 pt-4">
        <Link
          href="/customers/new"
          className="flex w-full items-center justify-center rounded-card bg-navy py-3 text-sm font-medium text-white active:bg-navy-light"
        >
          ＋ 新增客戶
        </Link>
      </div>

      <div className="mt-5 flex flex-col gap-3 px-5">
        {userError && (
          <p className="pt-10 text-center text-sm text-red-600">
            連線失敗：{userError}
          </p>
        )}
        {(userLoading || loading) && !userError && (
          <p className="pt-10 text-center text-sm text-muted">載入中...</p>
        )}
        {!userLoading && !loading && filtered.length === 0 && !userError && (
          <p className="pt-10 text-center text-sm text-muted">
            還沒有客戶，點上面新增第一位
          </p>
        )}
        {filtered.map((customer) => (
          <CustomerCard key={customer.id} customer={customer} />
        ))}
      </div>
    </main>
  );
}
