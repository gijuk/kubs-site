"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import type { FaqItem } from "@/lib/types";

export default function FaqAccordionItem({
  item,
  index = 0,
}: {
  item: FaqItem;
  index?: number;
}) {
  const [open, setOpen] = useState(false);

  return (
    <div
      className="reveal border-b border-ivory-line"
      style={{ "--reveal-delay": `${Math.min(index, 8) * 50}ms` } as React.CSSProperties}
    >
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between gap-4 py-5 text-left"
        aria-expanded={open}
      >
        <span className="flex items-center gap-3">
          <span className="rounded bg-ivory-soft px-2 py-0.5 text-[11px] text-ink-faint">
            {item.category}
          </span>
          <span className="font-serif text-base text-ink md:text-lg">
            {item.question}
          </span>
        </span>
        <Plus
          size={18}
          strokeWidth={1.75}
          className={`shrink-0 text-ink-faint transition-transform duration-300 ${
            open ? "rotate-45 text-crimson" : ""
          }`}
        />
      </button>

      <div
        className={`grid overflow-hidden transition-all duration-300 ease-out ${
          open ? "grid-rows-[1fr] pb-5 opacity-100" : "grid-rows-[0fr] opacity-0"
        }`}
      >
        <div className="min-h-0">
          <p className="max-w-[62ch] text-sm leading-relaxed text-ink-soft">
            {item.answer}
          </p>
        </div>
      </div>
    </div>
  );
}
