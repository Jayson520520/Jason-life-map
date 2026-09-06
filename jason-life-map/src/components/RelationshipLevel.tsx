import { RelationshipLevel as Level } from "@/types";

const LABELS: Record<Level, string> = {
  1: "陌生",
  2: "初步認識",
  3: "有基本信任",
  4: "可以談需求",
  5: "深度信任",
};

export function RelationshipLevel({ level }: { level: Level }) {
  return (
    <div className="flex items-center gap-2">
      <div className="flex gap-1">
        {[1, 2, 3, 4, 5].map((n) => (
          <span
            key={n}
            className={`h-1.5 w-4 rounded-full ${
              n <= level ? "bg-navy" : "bg-line"
            }`}
          />
        ))}
      </div>
      <span className="text-xs text-muted">{LABELS[level]}</span>
    </div>
  );
}
