"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabaseBrowser } from "@/lib/supabase/client";
import { useSupabaseUser } from "@/lib/supabase/useSession";

export default function NewTextConversationPage({
  params,
}: {
  params: { id: string };
}) {
  const router = useRouter();
  const { user, loading: userLoading } = useSupabaseUser();
  const [text, setText] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!text.trim() || !user) return;

    setSaving(true);
    setError(null);

    // Phase 2: store the raw note as-is. AI analysis (structured
    // summary, profile updates, next questions) is wired in Phase 4.
    const { error: insertError } = await supabaseBrowser
      .from("conversations")
      .insert({
        customer_id: params.id,
        user_id: user.id,
        input_type: "text",
        transcript: text.trim(),
        summary: text.trim().slice(0, 60),
      });

    if (insertError) {
      setSaving(false);
      setError("儲存失敗，請再試一次");
      return;
    }

    await supabaseBrowser
      .from("customers")
      .update({ updated_at: new Date().toISOString() })
      .eq("id", params.id);

    setSaving(false);
    router.push(`/customers/${params.id}`);
  }

  return (
    <main className="flex min-h-screen flex-col bg-paper pb-10">
      <header className="flex items-center gap-3 px-5 pb-4 pt-8">
        <button
          onClick={() => router.back()}
          className="text-sm text-muted"
          aria-label="返回"
        >
          ← 返回
        </button>
      </header>

      <div className="px-5">
        <h1 className="font-serif text-xl font-medium text-ink">
          新增文字紀錄
        </h1>
        <p className="mt-1 text-sm text-muted">
          寫下這次談話的重點，AI 自動整理功能將在下一階段開放
        </p>
      </div>

      <form onSubmit={handleSubmit} className="mt-6 flex flex-col gap-4 px-5">
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          rows={10}
          placeholder="例如：今天跟陳小姐吃飯，她說女兒明年就大學畢業，最近自己工作也覺得很累..."
          className="w-full rounded-card border border-line bg-surface px-4 py-3 text-sm text-ink placeholder:text-muted focus:border-navy focus:outline-none"
        />

        {error && <p className="text-sm text-red-600">{error}</p>}

        <button
          type="submit"
          disabled={saving || userLoading || !text.trim()}
          className="mt-2 w-full rounded-card bg-navy py-3 text-sm font-medium text-white active:bg-navy-light disabled:opacity-60"
        >
          {saving ? "儲存中..." : "儲存紀錄"}
        </button>
      </form>
    </main>
  );
}
