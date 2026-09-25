import Link from "next/link";
import { Customer } from "@/types";

function formatDaysSinceContact(updatedAt?: string) {
  if (!updatedAt) return null;
  const days = Math.floor(
    (Date.now() - new Date(updatedAt).getTime()) / (1000 * 60 * 60 * 24)
  );
  if (days <= 0) return { label: "今天已聯絡", days };
  if (days === 1) return { label: "昨天聯絡過", days };
  return { label: `距上次聯絡 ${days} 天`, days };
}

export function CustomerCard({ customer }: { customer: Customer }) {
  const contact = formatDaysSinceContact(customer.updated_at);
  const colorClass =
    contact && contact.days >= 30
      ? "text-red-600"
      : contact && contact.days >= 14
      ? "text-amber-600"
      : "text-muted";

  return (
    <Link
      href={`/customers/${customer.id}`}
      className="block rounded-card border border-line bg-paper p-4 shadow-card active:bg-surface"
    >
      <div className="flex items-baseline justify-between">
        <h3 className="font-serif text-xl font-medium text-ink">
          {customer.name}
        </h3>
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

      {customer.current_focus && customer.current_focus.length > 0 && (
        <div className="mt-3">
          <p className="text-sm text-muted">目前焦點</p>
          <p className="mt-0.5 text-base text-ink">
            {customer.current_focus.join("｜")}
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
