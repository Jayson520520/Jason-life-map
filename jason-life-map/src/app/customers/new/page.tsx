"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabaseBrowser } from "@/lib/supabase/client";
import { useSupabaseUser } from "@/lib/supabase/useSession";

const FIELDS: {
  key: string;
  label: string;
  required?: boolean;
}[] = [
  { key: "name", label: "姓名", required: true },
  { key: "nickname", label: "稱呼" },
  { key: "gender", label: "性別（optional）" },
  { key: "birth_year", label: "年齡或出生年份" },
  { key: "occupation", label: "職業" },
  { key: "company", label: "公司／產業" },
  { key: "phone", label: "手機" },
  { key: "contact_info", label: "LINE / 聯絡方式" },
  { key: "notes", label: "備註" },
];

export default function NewCustomerPage() {
  const router = useRouter();
  const { user, loading: userLoading } = useSupabaseUser();
  const [values, setValues] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function update(key: string, value: string) {
    setValues((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!values.name?.trim() || !user) return;

    setSaving(true);
    setError(null);

    const birthYear = values.birth_year ? Number(values.birth_year) : null;

    const { data, error } = await supabaseBrowser
      .from("customers")
      .insert({
        user_id: user.id,
        name: values.name.trim(),
        nickname: values.nickname || null,
        gender: values.gender || null,
        birth_year: birthYear,
        occupation: values.occupation || null,
        company: values.company || null,
        phone: values.phone || null,
        contact_info: values.contact_info || null,
        notes: values.notes || null,
      })
      .select()
      .single();

    setSaving(false);

    if (error || !data) {
      setError("新增失敗，請再試一次");
      return;
    }

    router.push(`/customers/${data.id}`);
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
        <h1 className="font-serif text-xl font-medium text-ink">新增客戶</h1>
        <p className="mt-1 text-sm text-muted">只有姓名為必填</p>
      </div>

      <form onSubmit={handleSubmit} className="mt-6 flex flex-col gap-4 px-5">
        {FIELDS.map((field) => (
          <div key={field.key}>
            <label className="mb-1 block text-xs text-muted">
              {field.label}
              {field.required && <span className="text-navy"> *</span>}
            </label>
            {field.key === "notes" ? (
              <textarea
                value={values[field.key] ?? ""}
                onChange={(e) => update(field.key, e.target.value)}
                rows={3}
                className="w-full rounded-card border border-line bg-surface px-4 py-3 text-sm text-ink focus:border-navy focus:outline-none"
              />
            ) : (
              <input
                required={field.required}
                value={values[field.key] ?? ""}
                onChange={(e) => update(field.key, e.target.value)}
                className="w-full rounded-card border border-line bg-surface px-4 py-3 text-sm text-ink focus:border-navy focus:outline-none"
              />
            )}
          </div>
        ))}

        {error && <p className="text-sm text-red-600">{error}</p>}

        <button
          type="submit"
          disabled={saving || userLoading}
          className="mt-2 w-full rounded-card bg-navy py-3 text-sm font-medium text-white active:bg-navy-light disabled:opacity-60"
        >
          {saving ? "儲存中..." : "新增完成"}
        </button>
      </form>
    </main>
  );
}
