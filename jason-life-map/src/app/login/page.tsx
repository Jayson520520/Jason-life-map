"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabaseBrowser } from "@/lib/supabase/client";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const { error } = await supabaseBrowser.auth.signInWithPassword({
      email,
      password,
    });

    setLoading(false);

    if (error) {
      setError("帳號或密碼不正確，請再試一次");
      return;
    }

    router.push("/customers");
  }

  return (
    <main className="flex min-h-screen flex-col justify-center bg-paper px-6">
      <div className="mb-10">
        <p className="text-xs tracking-wide text-muted">人生。房產。學</p>
        <h1 className="mt-1 font-serif text-2xl font-medium text-ink">
          客戶人生地圖
        </h1>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <div>
          <label className="mb-1 block text-xs text-muted">帳號</label>
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full rounded-card border border-line bg-surface px-4 py-3 text-sm text-ink focus:border-navy focus:outline-none"
            placeholder="you@example.com"
          />
        </div>

        <div>
          <label className="mb-1 block text-xs text-muted">密碼</label>
          <input
            type="password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full rounded-card border border-line bg-surface px-4 py-3 text-sm text-ink focus:border-navy focus:outline-none"
            placeholder="••••••••"
          />
        </div>

        {error && <p className="text-sm text-red-600">{error}</p>}

        <button
          type="submit"
          disabled={loading}
          className="mt-2 w-full rounded-card bg-navy py-3 text-sm font-medium text-white active:bg-navy-light disabled:opacity-60"
        >
          {loading ? "登入中..." : "登入"}
        </button>
      </form>
    </main>
  );
}
