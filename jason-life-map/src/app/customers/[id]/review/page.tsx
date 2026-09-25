"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabaseBrowser } from "@/lib/supabase/client";
import { useSupabaseUser } from "@/lib/supabase/useSession";
import {
  Customer,
  CustomerProfile,
  Conversation,
  AiAnalysis,
  RelationshipLevel as Level,
} from "@/types";

const LEVEL_LABELS: Record<Level, string> = {
  1: "陌生",
  2: "初步認識",
  3: "有基本信任",
  4: "可以談需求",
  5: "深度信任",
};

type Editable = { text: string; checked: boolean };

function toEditable(items: string[]): Editable[] {
  return items.map((text) => ({ text, checked: true }));
}

function picked(list: Editable[]): string[] {
  return list.filter((i) => i.checked && i.text.trim()).map((i) => i.text.trim());
}

function normalize(s: string): string {
  return s.replace(/[，。,\.\s、；;:：!！?？"'「」『』()（）]/g, "").toLowerCase();
}

function isSimilar(a: string, b: string): boolean {
  const na = normalize(a);
  const nb = normalize(b);
  if (!na || !nb) return false;
  if (na === nb) return true;
  const shorter = na.length <= nb.length ? na : nb;
  const longer = na.length <= nb.length ? nb : na;
  if (longer.includes(shorter) && shorter.length / longer.length > 0.6) return true;
  return false;
}

function mergeUnique(existing: string[], additions: string[]): string[] {
  const result = [...existing];
  for (const item of additions) {
    const trimmed = item.trim();
    if (!trimmed) continue;
    const isDuplicate = result.some((r) => isSimilar(r, trimmed));
    if (!isDuplicate) {
      result.push(trimmed);
    }
  }
  return result;
}

function parseKeyValue(line: string): [string, string] | null {
  const sep = line.includes("：") ? "：" : line.includes(":") ? ":" : null;
  if (!sep) return null;
  const [k, ...rest] = line.split(sep);
  const v = rest.join(sep).trim();
  if (!k.trim() || !v) return null;
  return [k.trim(), v];
}

// Merges this conversation's picked updates into the existing profile.
// Used both for the live "熟悉度" preview while reviewing, and for the
// actual save in handleConfirm, so the two never drift apart.
function buildMergedProfile(
  profile: CustomerProfile | null,
  picks: {
    family: string[];
    work: string[];
    financeLines: string[];
    propertyLines: string[];
    lifeGoals: string[];
    concerns: string[];
    resistance: string[];
    decisionMakers: string[];
    competitors: string[];
  }
) {
  const financeUpdates: Record<string, string> = { ...(profile?.finance ?? {}) };
  for (const line of picks.financeLines) {
    const parsed = parseKeyValue(line);
    if (parsed) financeUpdates[parsed[0]] = parsed[1];
  }
  const propertyUpdates: Record<string, string> = { ...(profile?.property ?? {}) };
  for (const line of picks.propertyLines) {
    const parsed = parseKeyValue(line);
    if (parsed) propertyUpdates[parsed[0]] = parsed[1];
  }

  const existingCompetitorNames = (profile?.competitors ?? []).map((c) => c.name.trim());
  const mergedCompetitors = [...(profile?.competitors ?? [])];
  for (const c of picks.competitors) {
    if (!existingCompetitorNames.includes(c.trim())) {
      mergedCompetitors.push({ name: c.trim() });
    }
  }

  return {
    family: mergeUnique(profile?.family ?? [], picks.family),
    work: mergeUnique(profile?.work ?? [], picks.work),
    finance: financeUpdates,
    property: propertyUpdates,
    life_goals: mergeUnique(profile?.life_goals ?? [], picks.lifeGoals),
    concerns: mergeUnique(profile?.concerns ?? [], picks.concerns),
    resistance: mergeUnique(profile?.resistance ?? [], picks.resistance),
    decision_makers: mergeUnique(profile?.decision_makers ?? [], picks.decisionMakers),
    competitors: mergedCompetitors,
  };
}

// 熟悉度 is no longer a manual guess — it's how many of the 8 profile
// categories actually have data in them (equal weight, see discussion:
// weighting bakes in a subjective call, so keep it simple and transparent).
function computeRelationshipLevel(merged: {
  family: string[];
  work: string[];
  finance: Record<string, string>;
  life_goals: string[];
  concerns: string[];
  resistance: string[];
  decision_makers: string[];
  competitors: unknown[];
}): Level {
  const filled = [
    merged.family.length > 0,
    merged.work.length > 0,
    Object.keys(merged.finance).length > 0,
    merged.life_goals.length > 0,
    merged.concerns.length > 0,
    merged.resistance.length > 0,
    merged.decision_makers.length > 0,
    merged.competitors.length > 0,
  ].filter(Boolean).length;
  return Math.min(5, 1 + Math.floor((filled / 8) * 4)) as Level;
}

function EditableSection({
  title,
  list,
  setList,
}: {
  title: string;
  list: Editable[];
  setList: (v: Editable[]) => void;
}) {
  if (list.length === 0) return null;

  function updateItem(index: number, patch: Partial<Editable>) {
    setList(list.map((item, i) => (i === index ? { ...item, ...patch } : item)));
  }

  return (
    <section className="rounded-card border border-line bg-paper p-4 shadow-card">
      <h3 className="text-xs font-medium tracking-wide text-muted">{title}</h3>
      <div className="mt-2 flex flex-col gap-2">
        {list.map((item, i) => (
          <div key={i} className="flex items-start gap-2">
            <input
              type="checkbox"
              checked={item.checked}
              onChange={(e) => updateItem(i, { checked: e.target.checked })}
              className="mt-1"
            />
            <textarea
              value={item.text}
              onChange={(e) => updateItem(i, { text: e.target.value })}
              rows={1}
              className={`flex-1 rounded-md border border-line bg-white px-2 py-1 text-sm ${
                item.checked ? "text-ink" : "text-muted line-through"
              }`}
            />
          </div>
        ))}
      </div>
    </section>
  );
}

export default function ReviewPage({
  params,
  searchParams,
}: {
  params: { id: string };
  searchParams: { conversationId?: string };
}) {
  const router = useRouter();
  const { user, loading: userLoading } = useSupabaseUser();

  const [loading, setLoading] = useState(true);
  const [analyzing, setAnalyzing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [customer, setCustomer] = useState<Customer | null>(null);
  const [profile, setProfile] = useState<CustomerProfile | null>(null);
  const [conversation, setConversation] = useState<Conversation | null>(null);
  const [analysis, setAnalysis] = useState<AiAnalysis | null>(null);

  const [family, setFamily] = useState<Editable[]>([]);
  const [work, setWork] = useState<Editable[]>([]);
  const [finance, setFinance] = useState<Editable[]>([]);
  const [property, setProperty] = useState<Editable[]>([]);
  const [lifeGoals, setLifeGoals] = useState<Editable[]>([]);
  const [concerns, setConcerns] = useState<Editable[]>([]);
  const [resistance, setResistance] = useState<Editable[]>([]);
  const [decisionMakers, setDecisionMakers] = useState<Editable[]>([]);
  const [competitors, setCompetitors] = useState<Editable[]>([]);
  const [nextQuestions, setNextQuestions] = useState<Editable[]>([]);

  const conversationId = searchParams.conversationId;

  useEffect(() => {
    if (!user || !conversationId) return;
    let mounted = true;

    async function load() {
      const [customerRes, profileRes, conversationRes] = await Promise.all([
        supabaseBrowser.from("customers").select("*").eq("id", params.id).single(),
        supabaseBrowser
          .from("customer_profiles")
          .select("*")
          .eq("customer_id", params.id)
          .maybeSingle(),
        supabaseBrowser.from("conversations").select("*").eq("id", conversationId).single(),
      ]);

      if (!mounted) return;

      const cust = customerRes.data as Customer | null;
      const prof = profileRes.data as CustomerProfile | null;
      const conv = conversationRes.data as Conversation | null;

      setCustomer(cust);
      setProfile(prof);
      setConversation(conv);
      setLoading(false);

      if (!conv?.transcript) {
        setError("這則紀錄沒有文字內容可以分析");
        return;
      }

      setAnalyzing(true);
      try {
        const res = await fetch("/api/analyze", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            transcript: conv.transcript,
            existingProfile: prof,
          }),
        });
        const data = await res.json();
        if (!res.ok) {
          setError(data.error || "分析失敗");
          setAnalyzing(false);
          return;
        }
        const a: AiAnalysis = data.analysis;
        setAnalysis(a);
        setFamily(toEditable(a.family_updates || []));
        setWork(toEditable(a.work_updates || []));
        setFinance(toEditable(a.financial_updates || []));
        setProperty(toEditable(a.property_updates || []));
        setLifeGoals(toEditable(a.life_goal_updates || []));
        setConcerns(toEditable(a.concerns || []));
        setResistance(toEditable(a.resistance || []));
        setDecisionMakers(toEditable(a.decision_makers || []));
        setCompetitors(toEditable(a.competitors || []));
        setNextQuestions(toEditable(a.next_questions || []));
      } catch {
        setError("分析失敗，請再試一次");
      } finally {
        setAnalyzing(false);
      }
    }

    load();
    return () => {
      mounted = false;
    };
  }, [user, params.id, conversationId]);

  const previewMerged = buildMergedProfile(profile, {
    family: picked(family),
    work: picked(work),
    financeLines: picked(finance),
    propertyLines: picked(property),
    lifeGoals: picked(lifeGoals),
    concerns: picked(concerns),
    resistance: picked(resistance),
    decisionMakers: picked(decisionMakers),
    competitors: picked(competitors),
  });
  const previewLevel = computeRelationshipLevel(previewMerged);

  async function handleConfirm() {
    if (!customer || !user) return;
    setSaving(true);
    setError(null);

    try {
      const newNextQuestions = picked(nextQuestions);

      const merged = buildMergedProfile(profile, {
        family: picked(family),
        work: picked(work),
        financeLines: picked(finance),
        propertyLines: picked(property),
        lifeGoals: picked(lifeGoals),
        concerns: picked(concerns),
        resistance: picked(resistance),
        decisionMakers: picked(decisionMakers),
        competitors: picked(competitors),
      });

      const profilePayload = {
        customer_id: customer.id,
        ...merged,
        preferences: profile?.preferences ?? {},
        updated_at: new Date().toISOString(),
      };

      const computedLevel = computeRelationshipLevel(merged);

      if (profile?.id) {
        await supabaseBrowser.from("customer_profiles").update(profilePayload).eq("id", profile.id);
      } else {
        await supabaseBrowser.from("customer_profiles").insert(profilePayload);
      }

      await supabaseBrowser
        .from("customers")
        .update({ relationship_level: computedLevel, updated_at: new Date().toISOString() })
        .eq("id", customer.id);

      if (conversation) {
        await supabaseBrowser
          .from("conversations")
          .update({
            ai_analysis: analysis,
            summary: conversation.summary || analysis?.summary || null,
          })
          .eq("id", conversation.id);
      }

      if (newNextQuestions.length > 0) {
        await supabaseBrowser.from("next_actions").insert(
          newNextQuestions.map((q) => ({
            customer_id: customer.id,
            conversation_id: conversation?.id ?? null,
            question: q,
            status: "open",
          }))
        );
      }

      router.push(`/customers/${customer.id}`);
    } catch {
      setError("儲存失敗，請再試一次");
    } finally {
      setSaving(false);
    }
  }

  if (userLoading || loading) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center px-5">
        <p className="text-sm text-muted">載入中...</p>
      </main>
    );
  }

  if (!conversationId || !customer) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center px-5">
        <p className="text-sm text-muted">找不到這則紀錄</p>
        <button onClick={() => router.push(`/customers/${params.id}`)} className="mt-4 text-sm text-navy">
          回客戶詳情
        </button>
      </main>
    );
  }

  return (
    <main className="flex min-h-screen flex-col bg-surface pb-24">
      <header className="bg-paper px-5 pb-5 pt-8">
        <button onClick={() => router.push(`/customers/${customer.id}`)} className="text-sm text-muted">
          ← 取消
        </button>
        <h1 className="mt-3 font-serif text-xl font-medium text-ink">確認 AI 分析結果</h1>
        <p className="mt-1 text-sm text-muted">
          勾選要採用的內容，可以直接編輯文字，確認後才會存進客戶檔案
        </p>
      </header>

      {analyzing && (
        <div className="px-5 pt-6">
          <p className="text-sm text-muted">AI 分析中，請稍候...</p>
        </div>
      )}

      {error && (
        <div className="px-5 pt-4">
          <p className="text-sm text-red-600">{error}</p>
        </div>
      )}

      {analysis && (
        <div className="mt-4 flex flex-col gap-3 px-5">
          <section className="rounded-card border border-line bg-paper p-4 shadow-card">
            <h3 className="text-xs font-medium tracking-wide text-muted">
              熟悉度（依已知資料自動計算，不用手動設定）
            </h3>
            <div className="mt-2 flex items-center gap-2">
              <div className="flex gap-1">
                {[1, 2, 3, 4, 5].map((n) => (
                  <span
                    key={n}
                    className={`h-6 w-8 rounded-full ${n <= previewLevel ? "bg-navy" : "bg-line"}`}
                  />
                ))}
              </div>
              <span className="text-xs text-muted">{LEVEL_LABELS[previewLevel]}</span>
            </div>
          </section>

          <EditableSection title="家庭" list={family} setList={setFamily} />
          <EditableSection title="工作" list={work} setList={setWork} />
          <EditableSection title="財務輪廓（格式：項目：內容）" list={finance} setList={setFinance} />
          <EditableSection title="房產（格式：項目：內容）" list={property} setList={setProperty} />
          <EditableSection title="人生想法" list={lifeGoals} setList={setLifeGoals} />
          <EditableSection title="在乎的事情" list={concerns} setList={setConcerns} />
          <EditableSection title="抗拒／雷點" list={resistance} setList={setResistance} />
          <EditableSection title="決策者" list={decisionMakers} setList={setDecisionMakers} />
          <EditableSection title="競爭者／既有金融關係" list={competitors} setList={setCompetitors} />
          <EditableSection title="下一步該問的問題" list={nextQuestions} setList={setNextQuestions} />

          {analysis.follow_up_suggestion && (
            <section className="rounded-card border border-line bg-paper p-4 shadow-card">
              <h3 className="text-xs font-medium tracking-wide text-muted">追蹤建議</h3>
              <p className="mt-2 text-sm text-ink">{analysis.follow_up_suggestion}</p>
            </section>
          )}
        </div>
      )}

      {analysis && (
        <div className="fixed bottom-0 left-0 right-0 bg-paper p-4 shadow-card">
          <button
            onClick={handleConfirm}
            disabled={saving}
            className="flex w-full items-center justify-center rounded-card bg-navy py-3.5 text-sm font-medium text-white active:bg-navy-light disabled:opacity-50"
          >
            {saving ? "儲存中..." : "確認並儲存"}
          </button>
        </div>
      )}
    </main>
  );
}
