"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabaseBrowser } from "@/lib/supabase/client";
import { useSupabaseUser } from "@/lib/supabase/useSession";
import { RelationshipLevel } from "@/components/RelationshipLevel";
import { ProfileCard, TagList } from "@/components/ProfileCard";
import { Customer, CustomerProfile, Conversation } from "@/types";

export default function CustomerDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const router = useRouter();
  const { user, loading: userLoading } = useSupabaseUser();
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [profile, setProfile] = useState<CustomerProfile | null>(null);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);
 const [expandedId, setExpandedId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  async function handleDeleteConversation(id: string) {
    const confirmed = window.confirm("確定要刪除這則談話紀錄嗎？此動作無法復原。");
    if (!confirmed) return;

    setDeletingId(id);
    const { error } = await supabaseBrowser
      .from("conversations")
      .delete()
      .eq("id", id);

    if (!error) {
      setConversations((prev) => prev.filter((c) => c.id !== id));
    }
    setDeletingId(null);
  }
  async function handleDeleteProfileItem(
    field: "family" | "work" | "life_goals" | "concerns" | "resistance" | "decision_makers",
    index: number
  ) {
    if (!profile) return;
    const confirmed = window.confirm("確定要刪除這一項嗎？此動作無法復原。");
    if (!confirmed) return;

    const updatedList = profile[field].filter((_, i) => i !== index);
    const { error } = await supabaseBrowser
      .from("customer_profiles")
      .update({ [field]: updatedList, updated_at: new Date().toISOString() })
      .eq("id", profile.id);

    if (!error) {
      setProfile({ ...profile, [field]: updatedList });
    }
  }

  async function handleDeleteCompetitor(index: number) {
    if (!profile) return;
    const confirmed = window.confirm("確定要刪除這一項嗎？此動作無法復原。");
    if (!confirmed) return;

    const updatedList = profile.competitors.filter((_, i) => i !== index);
    const { error } = await supabaseBrowser
      .from("customer_profiles")
          .update({ competitors: updatedList, updated_at: new Date().toISOString() })
      .eq("id", 
profile.id
);

    if (!error) {
      setProfile({ ...profile, competitors: updatedList });
    }
  }

  async function handleDeleteFinanceItem(key: string) {
    if (!profile) return;
    const confirmed = window.confirm("確定要刪除這一項嗎？此動作無法復原。");
    if (!confirmed) return;

    const updated = { ...profile.finance };
    delete updated[key];
    const { error } = await supabaseBrowser
      .from("customer_profiles")
      .update({ finance: updated, updated_at: new Date().toISOString() })
      .eq("id", 
profile.id
);

    if (!error) {
      setProfile({ ...profile, finance: updated });
    }
  }

  useEffect(() => {
    if (!user) return;
    let mounted = true;

    async function load() {
      const [customerRes, profileRes, conversationsRes] = await Promise.all([
        supabaseBrowser
          .from("customers")
          .select("*")
          .eq("id", params.id)
          .single(),
        supabaseBrowser
          .from("customer_profiles")
          .select("*")
          .eq("customer_id", params.id)
          .maybeSingle(),
        supabaseBrowser
          .from("conversations")
          .select("*")
          .eq("customer_id", params.id)
          .order("conversation_date", { ascending: false }),
      ]);

      if (!mounted) return;
      setCustomer(customerRes.data ?? null);
      setProfile(profileRes.data ?? null);
      setConversations(conversationsRes.data ?? []);
      setLoading(false);
    }

    load();
    return () => {
      mounted = false;
    };
  }, [user, params.id]);

  if (userLoading || loading) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center px-5">
        <p className="text-sm text-muted">載入中...</p>
      </main>
    );
  }

  if (!customer) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center px-5">
        <p className="text-sm text-muted">找不到這位客戶</p>
        <button
          onClick={() => router.push("/customers")}
          className="mt-4 text-sm text-navy"
        >
          回客戶列表
        </button>
      </main>
    );
  }

  const lastContact = customer.updated_at
    ? new Date(customer.updated_at).toISOString().slice(0, 10).replace(/-/g, "/")
    : null;

  return (
    <main className="flex min-h-screen flex-col bg-surface pb-16">
      <header className="bg-paper px-5 pb-5 pt-8">
        <button
          onClick={() => router.push("/customers")}
          className="text-sm text-muted"
        >
          ← 客戶列表
        </button>

        <div className="mt-3 flex items-baseline justify-between">
          <h1 className="font-serif text-2xl font-medium text-ink">
            {customer.name}
          </h1>
          <div className="flex items-center gap-3">
            {lastContact && (
              <span className="text-xs text-muted">最近互動：{lastContact}</span>
            )}
            <Link href={`/customers/${customer.id}/edit`} className="text-xs text-navy">
              編輯
            </Link>
          </div>
        </div>
        <p className="mt-0.5 text-sm text-muted">
          {[
            customer.age ? `${customer.age}歲` : null,
            customer.occupation,
          ]
            .filter(Boolean)
            .join("　")}
        </p>

        <div className="mt-3">
          <RelationshipLevel level={customer.relationship_level} />
        </div>
      </header>

      {/* Primary CTA */}
      <div className="grid grid-cols-2 gap-3 px-5 pt-5">
        <Link
          href={`/customers/${customer.id}/new-voice`}
          className="flex items-center justify-center gap-2 rounded-card bg-navy py-3.5 text-sm font-medium text-white active:bg-navy-light"
        >
          🎙 說一段新的紀錄
        </Link>
        <Link
          href={`/customers/${customer.id}/new-text`}
          className="flex items-center justify-center gap-2 rounded-card border border-line bg-paper py-3.5 text-sm font-medium text-ink active:bg-surface"
        >
          ✏️ 新增文字紀錄
        </Link>
      </div>

      <div className="mt-5 flex flex-col gap-3 px-5">
        <ProfileCard title="家庭" empty={!profile?.family.length}>
          <TagList items={profile?.family ?? []} />
        </ProfileCard>

        <ProfileCard title="工作" empty={!profile?.work.length}>
          <TagList items={profile?.work ?? []} />
        </ProfileCard>

        <ProfileCard
          title="財務輪廓"
          empty={!profile || Object.keys(profile.finance).length === 0}
        >
          <dl className="flex flex-col gap-1.5">
            {profile &&
              Object.entries(profile.finance).map(([k, v]) => (
                <div key={k} className="flex justify-between">
                  <dt className="text-muted">{k}</dt>
                  <dd>{v}</dd>
                </div>
              ))}
          </dl>
        </ProfileCard>

        <ProfileCard title="人生想法" empty={!profile?.life_goals.length}>
          <TagList items={profile?.life_goals ?? []} />
        </ProfileCard>

        <ProfileCard title="在乎的事情" empty={!profile?.concerns.length}>
          <TagList items={profile?.concerns ?? []} />
        </ProfileCard>

        <ProfileCard title="抗拒／雷點" empty={!profile?.resistance.length}>
          <TagList items={profile?.resistance ?? []} />
        </ProfileCard>

        <ProfileCard
          title="決策者"
          empty={!profile?.decision_makers.length}
        >
          <TagList items={profile?.decision_makers ?? []} />
        </ProfileCard>

        <ProfileCard
          title="競爭者／既有金融關係"
          empty={!profile?.competitors.length}
        >
          <ul className="flex flex-col gap-2">
            {profile?.competitors.map((comp, i) => (
              <li key={i} className="rounded-card bg-surface p-3">
                <p className="font-medium">{comp.name}</p>
                <p className="text-xs text-muted">
                  {[comp.company, comp.relationship]
                    .filter(Boolean)
                    .join("｜")}
                </p>
                {comp.trust_level && (
                  <p className="mt-1 text-xs text-muted">
                    客戶信任程度：{comp.trust_level}
                  </p>
                )}
              </li>
            ))}
          </ul>
        </ProfileCard>

        <ProfileCard title="下一步" empty>
          {/* AI-suggested next steps arrive in Phase 4 */}
        </ProfileCard>
      </div>

      {/* History timeline */}
      <div className="mt-6 px-5">
        <h2 className="mb-3 text-sm font-medium text-ink">談話紀錄</h2>
        {conversations.length === 0 && (
          <p className="text-sm text-muted">尚未有談話紀錄</p>
        )}
        <div className="flex flex-col gap-3">
          {conversations.map((conv) => {
            const isOpen = expandedId === conv.id;
            const date = new Date(conv.conversation_date)
              .toISOString()
              .slice(0, 10)
              .replace(/-/g, "/");
            return (
              <div
                key={conv.id}
                className="rounded-card border border-line bg-paper p-4 shadow-card"
              >
                <p className="text-xs text-muted">{date}</p>
                <p className="mt-1 text-sm text-ink">
                  {conv.summary || conv.transcript}
                </p>
               <div className="mt-2 flex items-center gap-3">
                  {conv.transcript && (
                    <button
                      onClick={() => setExpandedId(isOpen ? null : conv.id)}
                      className="text-xs text-navy"
                    >
                      {isOpen ? "收合" : "查看完整紀錄"}
                    </button>
                  )}
                  <button
                    onClick={() => handleDeleteConversation(conv.id)}
                    disabled={deletingId === conv.id}
                    className="text-xs text-red-600 disabled:opacity-50"
                  >
                    {deletingId === conv.id ? "刪除中..." : "刪除"}
                  </button>
                </div>
                {isOpen && (
                  <div className="mt-3 border-t border-line pt-3 text-sm">
                    <p className="text-xs text-muted">原始逐字稿</p>
                    <p className="mt-1 leading-relaxed text-ink">
                      {conv.transcript}
                    </p>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </main>
  );
}
