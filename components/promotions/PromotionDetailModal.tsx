"use client";

import { useEffect } from "react";
import { X, ExternalLink } from "lucide-react";
import type { Promotion } from "@/lib/types";
import { PROMOTION_CATEGORY_LABEL } from "@/lib/types";

export default function PromotionDetailModal({
  promotion,
  onClose,
}: {
  promotion: Promotion;
  onClose: () => void;
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-[60] flex items-end justify-center bg-black/40 backdrop-blur-[2px] md:items-center"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="max-h-[90vh] w-full max-w-lg animate-fade-up overflow-y-auto rounded-t-2xl bg-ivory shadow-xl md:rounded-2xl"
      >
        {promotion.imageSrc && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={promotion.imageSrc}
            alt={promotion.title}
            className="h-56 w-full object-cover md:rounded-t-2xl"
          />
        )}

        <div className="p-8">
          <div className="flex items-start justify-between">
            <span className="rounded-full bg-crimson-tint px-3 py-1 text-xs font-medium text-crimson">
              {PROMOTION_CATEGORY_LABEL[promotion.category]}
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
            {promotion.title}
          </h3>
          <p className="mt-1 text-sm text-ink-faint">{promotion.author}</p>

          <p className="mt-6 whitespace-pre-line text-sm leading-relaxed text-ink-soft">
            {promotion.content}
          </p>

          {promotion.link && (
            <a
              href={promotion.link}
              target="_blank"
              rel="noreferrer"
              className="mt-6 flex w-fit items-center gap-1.5 rounded-full bg-crimson px-4 py-2 text-sm text-ivory transition-colors hover:bg-crimson-deep"
            >
              자세히 보기
              <ExternalLink size={14} strokeWidth={1.75} />
            </a>
          )}
        </div>
      </div>
    </div>
  );
}
