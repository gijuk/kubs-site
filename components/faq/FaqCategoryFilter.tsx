import type { FaqCategory } from "@/lib/types";

interface FaqCategoryFilterProps {
  categories: FaqCategory[];
  active: FaqCategory | "전체";
  onChange: (category: FaqCategory | "전체") => void;
}

export default function FaqCategoryFilter({
  categories,
  active,
  onChange,
}: FaqCategoryFilterProps) {
  const all: (FaqCategory | "전체")[] = ["전체", ...categories];

  return (
    <div className="flex flex-wrap gap-2">
      {all.map((cat) => (
        <button
          key={cat}
          onClick={() => onChange(cat)}
          className={`rounded-full border px-3.5 py-1.5 text-xs transition-colors ${
            active === cat
              ? "border-crimson bg-crimson text-ivory"
              : "border-ivory-line text-ink-soft hover:border-crimson hover:text-crimson"
          }`}
        >
          {cat}
        </button>
      ))}
    </div>
  );
}
