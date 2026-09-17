"use client";

import { useMemo, useState } from "react";
import type { ScheduleCategory, ScheduleItem } from "@/lib/types";
import { CATEGORY_LABEL } from "@/lib/types";
import ScheduleList from "./ScheduleList";

const CATEGORIES: ScheduleCategory[] = ["academic", "council", "event"];

export default function ScheduleFilterList({
  items,
}: {
  items: ScheduleItem[];
}) {
  const [active, setActive] = useState<ScheduleCategory | "전체">("전체");

  const filtered = useMemo(
    () => (active === "전체" ? items : items.filter((i) => i.category === active)),
    [items, active]
  );

  return (
    <div>
      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => setActive("전체")}
          className={`rounded-full border px-3.5 py-1.5 text-xs transition-colors ${
            active === "전체"
              ? "border-crimson bg-crimson text-ivory"
              : "border-ivory-line text-ink-soft hover:border-crimson hover:text-crimson"
          }`}
        >
          전체
        </button>
        {CATEGORIES.map((cat) => (
          <button
            key={cat}
            onClick={() => setActive(cat)}
            className={`rounded-full border px-3.5 py-1.5 text-xs transition-colors ${
              active === cat
                ? "border-crimson bg-crimson text-ivory"
                : "border-ivory-line text-ink-soft hover:border-crimson hover:text-crimson"
            }`}
          >
            {CATEGORY_LABEL[cat]}
          </button>
        ))}
      </div>

      <div className="mt-8">
        <ScheduleList items={filtered} />
      </div>
    </div>
  );
}
