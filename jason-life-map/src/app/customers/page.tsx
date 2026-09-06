"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { mockCustomers } from "@/lib/mockData";
import { CustomerCard } from "@/components/CustomerCard";

export default function CustomersPage() {
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const q = query.trim();
    if (!q) return mockCustomers;
    return mockCustomers.filter((c) =>
      [c.name, c.nickname, c.occupation, c.company]
        .filter(Boolean)
        .some((field) => field!.includes(q))
    );
  }, [query]);

  return (
    <main className="flex min-h-screen flex-col bg-paper pb-8">
      <header className="px-5 pb-4 pt-8">
        <p className="text-xs tracking-wide text-muted">人生。房產。學</p>
        <h1 className="mt-1 font-serif text-2xl font-medium text-ink">
          客戶人生地圖
        </h1>
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
        {filtered.length === 0 && (
          <p className="pt-10 text-center text-sm text-muted">
            找不到符合的客戶
          </p>
        )}
        {filtered.map((customer) => (
          <CustomerCard key={customer.id} customer={customer} />
        ))}
      </div>
    </main>
  );
}
