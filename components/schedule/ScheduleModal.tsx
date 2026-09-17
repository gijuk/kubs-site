"use client";

import { useEffect } from "react";
import { X, CalendarDays, MapPin, Users } from "lucide-react";
import type { ScheduleItem } from "@/lib/types";
import { CATEGORY_LABEL } from "@/lib/types";
import { formatKoreanDate, getDday } from "@/hooks/useCountdown";

interface ScheduleModalProps {
  item: ScheduleItem;
  onClose: () => void;
}

export default function ScheduleModal({ item, onClose }: ScheduleModalProps) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [onClose]);

  const dday = getDday(item.date);

  return (
    <div
      className="fixed inset-0 z-[60] flex items-end justify-center bg-ink/40 backdrop-blur-[2px] md:items-center"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-lg animate-fade-up rounded-t-2xl bg-ivory p-8 shadow-xl md:rounded-2xl"
      >
        <div className="flex items-start justify-between">
          <span className="rounded-full bg-crimson-tint px-3 py-1 text-xs font-medium text-crimson">
            {CATEGORY_LABEL[item.category]}
          </span>
          <button
            onClick={onClose}
            aria-label="닫기"
            className="text-ink-faint transition-colors hover:text-ink"
          >
            <X size={20} />
          </button>
        </div>

        <h3 className="mt-4 font-serif text-2xl font-semibold text-ink">
          {item.title}
        </h3>

        <p className="mt-1 text-sm text-crimson">{dday.label}</p>

        <div className="mt-6 space-y-3 border-t border-ivory-line pt-6 text-sm text-ink-soft">
          <p className="flex items-center gap-2">
            <CalendarDays size={16} strokeWidth={1.75} />
            {formatKoreanDate(item.date)}
            {item.endDate && ` – ${formatKoreanDate(item.endDate)}`}
          </p>
          {item.location && (
            <p className="flex items-center gap-2">
              <MapPin size={16} strokeWidth={1.75} />
              {item.location}
            </p>
          )}
          {item.organizer && (
            <p className="flex items-center gap-2">
              <Users size={16} strokeWidth={1.75} />
              {item.organizer}
            </p>
          )}
        </div>

        <p className="mt-6 text-sm leading-relaxed text-ink-soft">
          {item.description}
        </p>
      </div>
    </div>
  );
}
