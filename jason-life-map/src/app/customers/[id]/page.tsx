"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabaseBrowser } from "@/lib/supabase/client";
import { useSupabaseUser } from "@/lib/supabase/useSession";
import { RelationshipLevel } from "@/components/RelationshipLevel";
import { ProfileCard, TagList } from "@/components/ProfileCard";
import { Customer, CustomerProfile, Conversation, NextAction } from "@/types";

// Reminder pill for customer.next_contact_at — separate from
// last-contact tracking (updated_at), this is the manually-set "when
// should I follow up next" date from the edit form.
function formatNextContactReminder(nextContactAt?: string | null) {
  if (!nextContactAt) return null;
  const target = new Date(nextContactAt + "T00:00:00");
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const days = Math.round(
    (target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
  );
  const dateLabel = `${target.getMonth() + 1}/${target.getDate()}`;

  if (days < 0) {
    return {
      label: `已逾期 ${Math.abs(days)} 天（${dateLabel}）`,
      className: "bg-red-600 text-white",
    };
  }
  if (days === 0) {
    return { label: "今天該聯絡", className: "bg-red-600 text-white" };
  }
  if (days <= 3) {
    return {
      label: `${days} 天後要聯絡（${dateLabel}）`,
      className: "bg-amber-100 text-amber-800",
    };
  }
  return {
    label: `提醒聯絡：${dateLabel}`,
    className: "bg-surface text-muted border border-line",
  };
}

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
  const [nextActions, setNextActions] = useState<NextAction[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [updatingActionId, setUpdatingActionId] = useState<string | null>(null);
  const [showAllNextActions, setShowAllNextActions] = useState(false);

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

    const updatedList = (profile[field] ?? []).filter((_, i) => i !== index);
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

    const updatedList = (profile.competitors ?? []).filter((_, i) => i !== index);
    const { error } = await supabaseBrowser
      .from("customer_profiles")
      .update({ competitors: updatedList, updated_at: new Date().toISOString() })
      .eq("id", profile.id);

    if (!error) {
      setProfile({ ...profile, competitors: updatedList });
    }
  }

  async function handleDeleteFinanceItem(key: string) {
    if (!profile) return;
    const confirmed = window.confirm("確定要刪除這一項嗎？此動作無法復原。");
    if (!confirmed) return;

    const updated = { ...(profile.finance ?? {}) };
    delete updated[key];
    const { error } = await supabaseBrowser
      .from("customer_profiles")
      .update({ finance: updated, updated_at: new Date().toISOString() })
      .eq("id", profile.id);

    if (!error) {
      setProfile({ ...profile, finance: updated });
    }
  }

  async function handleDeletePropertyItem(key: string) {
    if (!profile) return;
    const confirmed = window.confirm("確定要刪除這一項嗎？此動作無法復原。");
    if (!confirmed) return;

    const updated = { ...(profile.property ?? {}) };
    delete updated[key];
    const { error } = await supabaseBrowser
      .from("customer_profiles")
      .update({ property: updated, updated_at: new Date().toISOString() })
      .eq("id", profile.id);

    if (!error) {
      setProfile({ ...profile, property: updated });
    }
  }

  function formatDaysAgo(dateStr: string) {
    const days = Math.floor(
      (Date.now() - new Date(dateStr).getTime()) / (1000 * 60 * 60 * 24)
    );
    if (days <= 0) return "今天";
    if (days === 1) return "昨天";
    return `${days}天前`;
  }

  async function handleUpdateNextActionStatus(id: string, status: "done" | "dismissed") {
    setUpdatingActionId(id);
    const { error } = await supabaseBrowser
      .from("next_actions")
      .update({ status })
      .eq("id", id);

    if (!error) {
      setNextActions((prev) => prev.filter((a) => a.id !== id));
    }
    setUpdatingActionId(null);
  }

  useEffect(() => {
    if (!user) return;
    let mounted = true;

    async function load() {
      const [customerRes, profileRes, conversationsRes, nextActionsRes] = await Promise.all([
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
        supabaseBrowser
          .from("next_actions")
          .select("*")
          .eq("customer_id", params.id)
          .eq("status", "open")
          .order("created_at", { ascending: true }),
      ]);

      if (!mounted) return;
      setCustomer(customerRes.data ?? null);
      setProfile(profileRes.data ?? null);
      setConversations(conversationsRes.data ?? []);
      setNextActions(nextActionsRes.data ?? []);
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

  const daysSinceContact = customer.updated_at
    ? Math.floor(
        (Date.now() - new Date(customer.updated_at).getTime()) /
          (1000 * 60 * 60 * 24)
      )
    : null;
  const lastContactLabel =
    daysSinceContact === null
      ? null
      : daysSinceContact <= 0
      ? "今天已聯絡"
      : daysSinceContact === 1
      ? "昨天聯絡過"
      : `距上次聯絡 ${daysSinceContact} 天`;
  const lastContactColor =
    daysSinceContact !== null && daysSinceContact >= 30
      ? "text-red-600"
      : daysSinceContact !== null && daysSinceContact >= 14
      ? "text-amber-600"
      : "text-muted";
  const reminder = formatNextContactReminder(customer.next_contact_at);
  const TIER_STYLE: Record<string, string> = {
    A: "bg-navy text-white",
    B: "bg-amber-100 text-amber-800",
    C: "bg-surface text-muted border border-line",
  };

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
          <div className="flex items-center gap-2">
            {customer.tier && (
              <span
                className={`inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-sm font-semibold ${
                  TIER_STYLE[customer.tier] ?? "bg-surface text-muted"
                }`}
              >
                {customer.tier}
              </span>
            )}
            <h1 className="font-serif text-2xl font-medium text-ink">
              {customer.name}
            </h1>
          </div>
          <div className="flex items-center gap-3">
            {lastContactLabel && (
              <span className={`text-sm ${lastContactColor}`}>
                {lastContactLabel}
              </span>
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

        <div className="mt-3 flex flex-wrap items-center gap-2">
          <RelationshipLevel level={customer.relationship_level} />
          {reminder ? (
            <Link
              href={`/customers/${customer.id}/edit`}
              className={`rounded-full px-2.5 py-1 text-xs font-medium ${reminder.className}`}
            >
              ⏰ {reminder.label}
            </Link>
          ) : (
            <Link
              href={`/customers/${customer.id}/edit`}
              className="rounded-full border border-line px-2.5 py-1 text-xs text-muted"
            >
              ＋ 設定下次提醒
            </Link>
          )}
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

      <div className="px-5 pt-3">
        <Link
          href={`/customers/${customer.id}/summary`}
          className="flex items-center justify-center gap-2 rounded-card border border-line bg-paper py-3 text-sm font-medium text-ink active:bg-surface"
        >
          🖨 匯出客戶摘要
        </Link>
      </div>

      <div className="mt-5 flex flex-col gap-3 px-5">
        <ProfileCard title="家庭" empty={!(profile?.family ?? []).length}>
          <TagList
            items={profile?.family ?? []}
            onDelete={(i) => handleDeleteProfileItem("family", i)}
          />
        </ProfileCard>

        <ProfileCard title="工作" empty={!(profile?.work ?? []).length}>
          <TagList
            items={profile?.work ?? []}
            onDelete={(i) => handleDeleteProfileItem("work", i)}
          />
        </ProfileCard>

        <ProfileCard
          title="財務輪廓"
          empty={!profile || Object.keys(profile.finance ?? {}).length === 0}
        >
          <dl className="flex flex-col gap-1.5">
            {profile &&
              Object.entries(profile.finance ?? {}).map(([k, v]) => (
                <div key={k} className="flex items-center justify-between gap-2">
                  <dt className="text-muted">{k}</dt>
                  <div className="flex items-center gap-2">
                    <dd>{v}</dd>
                    <button
                      onClick={() => handleDeleteFinanceItem(k)}
                      className="text-xs text-red-600"
                    >
                      刪除
                    </button>
                  </div>
                </div>
              ))}
          </dl>
        </ProfileCard>

        <ProfileCard
          title="房產"
          empty={!profile || Object.keys(profile.property ?? {}).length === 0}
        >
          <dl className="flex flex-col gap-1.5">
            {profile &&
              Object.entries(profile.property ?? {}).map(([k, v]) => (
                <div key={k} className="flex items-center justify-between gap-2">
                  <dt className="text-muted">{k}</dt>
                  <div className="flex items-center gap-2">
                    <dd>{v}</dd>
                    <button
                      onClick={() => handleDeletePropertyItem(k)}
                      className="text-xs text-red-600"
                    >
                      刪除
                    </button>
                  </div>
                </div>
              ))}
          </dl>
        </ProfileCard>

        <ProfileCard title="人生想法" empty={!(profile?.life_goals ?? []).length}>
          <TagList
            items={profile?.life_goals ?? []}
            onDelete={(i) => handleDeleteProfileItem("life_goals", i)}
          />
        </ProfileCard>

        <ProfileCard title="在乎的事情" empty={!(profile?.concerns ?? []).length}>
          <TagList
            items={profile?.concerns ?? []}
            onDelete={(i) => handleDeleteProfileItem("concerns", i)}
          />
        </ProfileCard>

        <ProfileCard title="抗拒／雷點" empty={!(profile?.resistance ?? []).length}>
          <TagList
            items={profile?.resistance ?? []}
            onDelete={(i) => handleDeleteProfileItem("resistance", i)}
          />
        </ProfileCard>

        <ProfileCard
          title="決策者"
          empty={!(profile?.decision_makers ?? []).length}
        >
          <TagList
            items={profile?.decision_makers ?? []}
            onDelete={(i) => handleDeleteProfileItem("decision_makers", i)}
          />
        </ProfileCard>

        <ProfileCard
          title="競爭者／既有金融關係"
          empty={!(profile?.competitors ?? []).length}
        >
          <ul className="flex flex-col gap-2">
            {(profile?.competitors ?? []).map((comp, i) => (
              <li key={i} className="rounded-card bg-surface p-3">
                <div className="flex items-start justify-between gap-2">
                  <p className="font-medium">{comp.name}</p>
                  <button
                    onClick={() => handleDeleteCompetitor(i)}
                    className="shrink-0 text-xs text-red-600"
                  >
                    刪除
                  </button>
                </div>
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

        <ProfileCard
          title={nextActions.length ? `下一步（${nextActions.length}）` : "下一步"}
          empty={nextActions.length === 0}
        >
          <ul className="flex flex-col gap-2">
            {(showAllNextActions ? nextActions : nextActions.slice(0, 3)).map(
              (action) => (
                <li
                  key={action.id}
                  className="rounded-card bg-surface p-3"
                >
                  <p className="text-sm text-ink">{action.question}</p>
                  <div className="mt-2 flex items-center justify-between">
                    <span className="text-xs text-muted">
                      {formatDaysAgo(action.created_at)}
                    </span>
                    <div className="flex items-center gap-3">
                      <button
                        onClick={() =>
                          handleUpdateNextActionStatus(action.id, "done")
                        }
                        disabled={updatingActionId === action.id}
                        className="text-xs text-navy disabled:opacity-50"
                      >
                        完成
                      </button>
                      <button
                        onClick={() =>
                          handleUpdateNextActionStatus(action.id, "dismissed")
                        }
                        disabled={updatingActionId === action.id}
                        className="text-xs text-red-600 disabled:opacity-50"
                      >
                        忽略
                      </button>
                    </div>
                  </div>
                </li>
              )
            )}
          </ul>
          {nextActions.length > 3 && (
            <button
              onClick={() => setShowAllNextActions((v) => !v)}
              className="mt-2 text-xs text-navy"
            >
              {showAllNextActions
                ? "收合"
                : `顯示全部（還有 ${nextActions.length - 3} 則）`}
            </button>
          )}
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
