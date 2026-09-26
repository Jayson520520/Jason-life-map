import Link from "next/link";
import { Customer } from "@/types";

// Extends Customer with a short AI-derived summary computed by the list
// page from customer_profiles (concerns / life_goals), so the card can
// show real AI-judged content instead of the still-unpopulated
// current_focus / next_step fields.
export type CustomerWithAI = Customer & { ai_highlights?: string[] };

function formatDaysSinceContact(updatedAt?: string) {
  if (!updatedAt) return null;
  const days = Math.floor(
    (Date.now() - new Date(updatedAt).getTime()) / (1000 * 60 * 60 * 24)
  );
  if (days <= 0) return { label: "今天已聯絡", days };
  if (days === 1) return { label: "昨天聯絡過", days };
  return { label: `距上次聯絡 ${days} 天`, days };
}

// Manually-set "next_contact_at" reminder date. Shown on every card that
// has one set, colored by urgency (red = due/overdue, amber = coming up
// within 3 days, neutral = further out) so it matches the detail page.
function formatUpcomingReminder(nextContactAt?: string | null) {
  if (!nextContactAt) return null;
  const target = new Date(nextContactAt + "T00:00:00");
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const days = Math.round(
    (target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
  );
  const dateLabel = `${target.getMonth() + 1}/${target.getDate()}`;

  if (days < 0) {
    return { label: `逾期 ${Math.abs(days)} 天`, className: "bg-red-600 text-white" };
  }
  if (days === 0) {
    return { label: "今天要聯絡", className: "bg-red-600 text-white" };
  }
  if (days <= 3) {
    return { label: `${days} 天後聯絡`, className: "bg-amber-100 text-amber-800" };
  }
  return {
    label: `提醒聯絡：${dateLabel}`,
    className: "bg-surface text-muted border border-line",
  };
}

const TIER_STYLE: Record<string, string> = {
  A: "bg-navy text-white",
  B: "bg-amber-100 text-amber-800",
  C: "bg-surface text-muted border border-line",
};

export function CustomerCard({ customer }: { customer: CustomerWithAI }) {
  const contact = formatDaysSinceContact(customer.updated_at);
  const colorClass =
    contact && contact.days >= 30
      ? "text-red-600"
      : contact && contact.days >= 14
      ? "text-amber-600"
      : "text-muted";
  const reminder = formatUpcomingReminder(customer.next_contact_at);

  return (
    <Link
      href={`/customers/${customer.id}`}
      className="block rounded-card border border-line bg-paper p-4 shadow-card active:bg-surface"
    >
      <div className="flex items-baseline justify-between">
        <div className="flex items-center gap-2">
          {customer.tier && (
            <span
              className={`inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-xs font-semibold ${
                TIER_STYLE[customer.tier] ?? "bg-surface text-muted"
              }`}
            >
              {customer.tier}
            </span>
          )}
          <h3 className="font-serif text-xl font-medium text-ink">
            {customer.name}
          </h3>
        </div>
        {contact && (
          <span className={`text-sm ${colorClass}`}>{contact.label}</span>
        )}
      </div>
      <p className="mt-0.5 text-base text-muted">
        {[
          customer.age ? `${customer.age}歲` : null,
          customer.occupation,
        ]
          .filter(Boolean)
          .join("｜")}
      </p>

      {reminder && (
        <span
          className={`mt-2 inline-block rounded-full px-2.5 py-1 text-xs font-medium ${reminder.className}`}
        >
          ⏰ {reminder.label}
        </span>
      )}

      {customer.current_focus && customer.current_focus.length > 0 && (
        <div className="mt-3">
          <p className="text-sm text-muted">目前焦點</p>
          <p className="mt-0.5 text-base text-ink">
            {customer.current_focus.join("｜")}
          </p>
        </div>
      )}

      {customer.ai_highlights && customer.ai_highlights.length > 0 && (
        <div className="mt-3">
          <p className="text-sm text-muted">AI 觀察</p>
          <p className="mt-0.5 text-base text-ink">
            {customer.ai_highlights.join("｜")}
          </p>
        </div>
      )}

      {customer.next_step && (
        <div className="mt-2">
          <p className="text-sm text-muted">下一步</p>
          <p className="mt-0.5 text-base text-navy">{customer.next_step}</p>
        </div>
      )}
    </Link>
  );
}
