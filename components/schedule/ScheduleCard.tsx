"use client";

import { CalendarDays, MapPin } from "lucide-react";
import type { ScheduleItem } from "@/lib/types";
import { CATEGORY_LABEL } from "@/lib/types";
import { getDday, formatKoreanDate } from "@/hooks/useCountdown";

const CATEGORY_STYLE: Record<ScheduleItem["category"], string> = {
  academic: "bg-ink text-ivory",
  council: "bg-crimson text-ivory",
  event: "bg-ivory-line text-ink-soft",
};

interface ScheduleCardProps {
  item: ScheduleItem;
  onSelect: (item: ScheduleItem) => void;
  index?: number;
}

export default function ScheduleCard({
  item,
  onSelect,
  index = 0,
}: ScheduleCardProps) {
  const dday = getDday(item.date);

  return (
    <button
      onClick={() => onSelect(item)}
      className="reveal group flex w-full flex-col gap-4 border-b border-ivory-line py-6 text-left transition-colors last:border-b-0 hover:bg-ivory-soft md:flex-row md:items-center md:justify-between md:px-2"
      style={{ "--reveal-delay": `${Math.min(index, 6) * 70}ms` } as React.CSSProperties}
    >
      <div className="flex items-start gap-4 md:items-center">
        <span
          className={`shrink-0 rounded-full px-2.5 py-1 text-[11px] font-medium ${
            dday.isToday
              ? "bg-crimson text-ivory"
              : dday.isPast
              ? "bg-ivory-line text-ink-faint"
              : "bg-crimson-tint text-crimson"
          }`}
        >
          {dday.label}
        </span>

        <div>
          <div className="mb-1.5 flex items-center gap-2">
            <span
              className={`rounded px-1.5 py-0.5 text-[10px] font-medium ${CATEGORY_STYLE[item.category]}`}
            >
              {CATEGORY_LABEL[item.category]}
            </span>
          </div>
          <p className="font-serif text-base font-medium text-ink transition-colors group-hover:text-crimson md:text-lg">
            {item.title}
          </p>
        </div>
      </div>

      <div className="flex shrink-0 flex-col gap-1 pl-[3.25rem] text-xs text-ink-faint md:items-end md:pl-0">
        <span className="flex items-center gap-1.5">
          <CalendarDays size={13} strokeWidth={1.75} />
          {formatKoreanDate(item.date)}
        </span>
        {item.location && (
          <span className="flex items-center gap-1.5">
            <MapPin size={13} strokeWidth={1.75} />
            {item.location}
          </span>
        )}
      </div>
    </button>
  );
}
