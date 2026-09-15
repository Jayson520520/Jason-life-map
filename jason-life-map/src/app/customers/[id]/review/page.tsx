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

function mergeUnique(existing: string[], additions: string[]): string[] {
  const result = [...existing];
  const seen = new Set(existing.map((s) => s.trim()));
  for (const item of additions) {
    const trimmed = item.trim();
    if (trimmed && !seen.has(trimmed)) {
      result.push(trimmed);
      seen.add(trimmed);
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
  const [level, setLevel] = useState<Level>(1);

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
      setLevel(cust?.relationship_level ?? 1);
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
  }, [user, params.id, conversationId]);"use client";

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

function mergeUnique(existing: string[], additions: string[]): string[] {
  const result = [...existing];
  const seen = new Set(existing.map((s) => s.trim()));
  for (const item of additions) {
    const trimmed = item.trim();
    if (trimmed && !seen.has(trimmed)) {
      result.push(trimmed);
      seen.add(trimmed);
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
  const [level, setLevel] = useState<Level>(1);

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
      setLevel(cust?.relationship_level ?? 1);
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
  }, [user, params.id, conversationId]);async function handleConfirm() {
    if (!customer || !user) return;
    setSaving(true);
    setError(null);

    try {
      const picked = (list: Editable[]) =>
        list.filter((i) => i.checked && i.text.trim()).map((i) => i.text.trim());

      const newFamily = picked(family);
      const newWork = picked(work);
      const newFinanceLines = picked(finance);
      const newPropertyLines = picked(property);
      const newLifeGoals = picked(lifeGoals);
      const newConcerns = picked(concerns);
      const newResistance = picked(resistance);
      const newDecisionMakers = picked(decisionMakers);
      const newCompetitors = picked(competitors);
      const newNextQuestions = picked(nextQuestions);

      const financeUpdates: Record<string, string> = { ...(profile?.finance ?? {}) };
      for (const line of newFinanceLines) {
        const parsed = parseKeyValue(line);
        if (parsed) financeUpdates[parsed[0]] = parsed[1];
      }
      const propertyUpdates: Record<string, string> = { ...(profile?.property ?? {}) };
      for (const line of newPropertyLines) {
        const parsed = parseKeyValue(line);
        if (parsed) propertyUpdates[parsed[0]] = parsed[1];
      }

      const existingCompetitorNames = (profile?.competitors ?? []).map((c) => c.name.
