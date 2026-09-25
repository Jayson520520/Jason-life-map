"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabaseBrowser } from "@/lib/supabase/client";
import { useSupabaseUser } from "@/lib/supabase/useSession";

const FIELDS: {
  key: string;
  label: string;
  required?: boolean;
  type?: "text" | "textarea" | "select";
  options?: { value: string; label: string }[];
}[] = [
  { key: "name", label: "姓名", required: true },
  { key: "nickname", label: "稱呼" },
  {
    key: "tier",
    label: "客戶級別",
    type: "select",
    options: [
      { value: "", label: "未分級" },
      { value: "A", label: "A（高優先）" },
      { value: "B", label: "B（一般）" },
      { value: "C", label: "C（待觀察）" },
    ],
  },
  { key: "gender", label: "性別（optional）" },
  { key: "birth_year", label: "年齡或出生年份" },
  { key: "occupation", label: "職業" },
  { key: "company", label: "公司／產業" },
  { key: "phone", label: "手機" },
  { key: "contact_info", label: "LINE / 聯絡方式" },
  { key: "notes", label: "備註", type: "textarea" },
];

export default function EditCustomerPage({
  params,
}: {
  params: { id: string };
}) {
  const router = useRouter();
  const { user, loading: userLoading } = useSupabaseUser();
  const [values, setValues] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    let mounted = true;

    async function load() {
      const { data } = await supabaseBrowser
        .from("customers")
        .select("*")
        .eq("id", params.id)
        .single();

      if (!mounted) return;
      if (data) {
        setValues({
          name: data.name ?? "",
          nickname: data.nickname ?? "",
          tier: data.tier ?? "",
          gender: data.gender ?? "",
          birth_year: data.birth_year ? String(data.birth_year) : "",
          occupation: data.occupation ?? "",
          company: data.company ?? "",
          phone: data.phone ?? "",
          contact_info: data.contact_info ?? "",
          notes: data.notes ?? "",
        });
      }
      setLoading(false);
    }

    load();
    return () => {
      mounted = false;
    };
  }, [user, params.id]);

  function update(key: string, value: string) {
    setValues((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!values.name?.trim() || !user) return;

    setSaving(true);
    setError(null);

    const birthYear = values.birth_year ? Number(values.birth_year) : null;

    const { error } = await supabaseBrowser
      .from("customers")
      .update({
        name: values.name.trim(),
        nickname: values.nickname || null,
        tier: values.tier || null,
        gender: values.gender || null,
        birth_year: birthYear,
        occupation: values.occupation || null,
        company: values.company || null,
        phone: values.phone || null,
        contact_info: values.contact_info || null,
        notes: values.notes || null,
      })
      .eq("id", params.id);

    setSaving(false);

    if (error) {
      setError("儲存失敗，請再試一次");
      return;
    }

    router.push(`/customers/${params.id}`);
  }

  if (userLoading || loading) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center px-5">
        <p className="text-sm text-muted">載入中...</p>
      </main>
    );
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
        <h1 className="font-serif text-xl font-medium text-ink">編輯客戶資料</h1>
        <p className="mt-1 text-sm text-muted">只有姓名為必填</p>
      </div>

      <form onSubmit={handleSubmit} className="mt-6 flex flex-col gap-4 px-5">
        {FIELDS.map((field) => (
          <div key={field.key}>
            <label className="mb-1 block text-xs text-muted">
              {field.label}
              {field.required && <span className="text-navy"> *</span>}
            </label>
            {field.type === "textarea" ? (
              <textarea
                value={values[field.key] ?? ""}
                onChange={(e) => update(field.key, e.target.value)}
                rows={3}
                className="w-full rounded-card border border-line bg-surface px-4 py-3 text-sm text-ink focus:border-navy focus:outline-none"
              />
            ) : field.type === "select" ? (
              <select
                value={values[field.key] ?? ""}
                onChange={(e) => update(field.key, e.target.value)}
                className="w-full rounded-card border border-line bg-surface px-4 py-3 text-sm text-ink focus:border-navy focus:outline-none"
              >
                {field.options?.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
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
          {saving ? "儲存中..." : "儲存變更"}
        </button>
      </form>
    </main>
  );
}
