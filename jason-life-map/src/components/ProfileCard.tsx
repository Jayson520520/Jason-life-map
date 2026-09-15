export function ProfileCard({
  title,
  children,
  empty,
}: {
  title: string;
  children?: React.ReactNode;
  empty?: boolean;
}) {
  return (
    <section className="rounded-card border border-line bg-paper p-4 shadow-card">
      <h3 className="text-sm font-medium tracking-wide text-muted">
        {title}
      </h3>
      <div className="mt-2 text-base text-ink">
        {empty ? <p className="text-muted">待了解</p> : children}
      </div>
    </section>
  );
}

export function TagList({ items }: { items: string[] }) {
  if (items.length === 0) return <p className="text-muted">待了解</p>;
  return (
    <ul className="flex flex-col gap-2">
      {items.map((item, i) => (
        <li key={i} className="leading-relaxed">
          {item}
        </li>
      ))}
    </ul>
  );
}
