import { ArrowUpRight } from "lucide-react";
import type { Promotion } from "@/lib/types";
import { PROMOTION_CATEGORY_LABEL } from "@/lib/types";

const CATEGORY_STYLE: Record<Promotion["category"], string> = {
  club: "bg-ink text-ivory",
  event: "bg-crimson text-ivory",
  ilhof: "bg-crimson-tint text-crimson",
  recruit: "bg-ivory-line text-ink-soft",
  etc: "bg-ivory-line text-ink-soft",
};

export default function PromotionCard({
  promotion,
  onSelect,
}: {
  promotion: Promotion;
  onSelect: (promotion: Promotion) => void;
}) {
  return (
    <button
      onClick={() => onSelect(promotion)}
      className="group flex w-full flex-col overflow-hidden rounded-xl border border-ivory-line bg-ivory text-left transition-colors hover:border-crimson/40"
    >
      {promotion.imageSrc ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={promotion.imageSrc}
          alt={promotion.title}
          className="h-40 w-full object-cover transition-transform duration-500 group-hover:scale-105"
        />
      ) : (
        <div className="flex h-40 w-full items-center justify-center bg-ivory-soft">
          <span className="font-serif text-sm text-ink-faint">
            {PROMOTION_CATEGORY_LABEL[promotion.category]}
          </span>
        </div>
      )}

      <div className="flex flex-1 flex-col gap-2 p-5">
        <span
          className={`w-fit rounded px-1.5 py-0.5 text-[10px] font-medium ${CATEGORY_STYLE[promotion.category]}`}
        >
          {PROMOTION_CATEGORY_LABEL[promotion.category]}
        </span>

        <p className="font-serif text-base font-medium text-ink transition-colors group-hover:text-crimson">
          {promotion.title}
        </p>

        <p className="line-clamp-2 text-sm leading-relaxed text-ink-faint">
          {promotion.content}
        </p>

        <div className="mt-auto flex items-center justify-between pt-1 text-xs text-ink-faint">
          <span>{promotion.author}</span>
          <ArrowUpRight
            size={14}
            strokeWidth={1.75}
            className="text-ink-faint transition-colors group-hover:text-crimson"
          />
        </div>
      </div>
    </button>
  );
}
