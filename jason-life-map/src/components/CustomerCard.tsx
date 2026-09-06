import Link from "next/link";
import { Customer } from "@/types";

export function CustomerCard({ customer }: { customer: Customer }) {
  return (
    <Link
      href={`/customers/${customer.id}`}
      className="block rounded-card border border-line bg-paper p-4 shadow-card active:bg-surface"
    >
      <div className="flex items-baseline justify-between">
        <h3 className="font-serif text-lg font-medium text-ink">
          {customer.name}
        </h3>
        {customer.last_contact_at && (
          <span className="text-xs text-muted">
            最近互動：{customer.last_contact_at}
          </span>
        )}
      </div>
      <p className="mt-0.5 text-sm text-muted">
        {[
          customer.age ? `${customer.age}歲` : null,
          customer.occupation,
        ]
          .filter(Boolean)
          .join("｜")}
      </p>

      {customer.current_focus && customer.current_focus.length > 0 && (
        <div className="mt-3">
          <p className="text-xs text-muted">目前焦點</p>
          <p className="mt-0.5 text-sm text-ink">
            {customer.current_focus.join("｜")}
          </p>
        </div>
      )}

      {customer.next_step && (
        <div className="mt-2">
          <p className="text-xs text-muted">下一步</p>
          <p className="mt-0.5 text-sm text-navy">{customer.next_step}</p>
        </div>
      )}
    </Link>
  );
}
