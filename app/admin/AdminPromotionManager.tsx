"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Check, Trash2 } from "lucide-react";
import type { AdminPromotion } from "@/lib/types";
import { PROMOTION_CATEGORY_LABEL } from "@/lib/types";
import {
  approvePromotionAction,
  deletePromotionAction,
} from "@/app/promotions/actions";

function PromotionRow({ promotion }: { promotion: AdminPromotion }) {
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  const handleApprove = () => {
    startTransition(async () => {
      await approvePromotionAction(promotion.id);
      router.refresh();
    });
  };

  const handleDelete = () => {
    if (!confirm(`"${promotion.title}" 게시물을 삭제할까요? 되돌릴 수 없습니다.`))
      return;
    startTransition(async () => {
      await deletePromotionAction(promotion.id, promotion.storagePath);
      router.refresh();
    });
  };

  return (
    <div className="flex items-center gap-4 py-4">
      {promotion.imageSrc ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={promotion.imageSrc}
          alt={promotion.title}
          className="h-16 w-16 shrink-0 rounded-md object-cover"
        />
      ) : (
        <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-md bg-ivory-soft text-[10px] text-ink-faint">
          이미지 없음
        </div>
      )}

      <div className="min-w-0 flex-1">
        <div className="mb-1 flex items-center gap-2">
          {promotion.status === "pending" && (
            <span className="rounded-full bg-crimson-tint px-2 py-0.5 text-[11px] text-crimson">
              승인 대기
            </span>
          )}
          <span className="text-xs text-ink-faint">
            {PROMOTION_CATEGORY_LABEL[promotion.category]}
          </span>
        </div>
        <p className="truncate font-serif text-base text-ink">
          {promotion.title}
        </p>
        <p className="truncate text-xs text-ink-faint">{promotion.author}</p>
      </div>

      <div className="flex shrink-0 items-center gap-2">
        {promotion.status === "pending" && (
          <button
            onClick={handleApprove}
            disabled={isPending}
            aria-label="승인"
            className="rounded-md p-2 text-ink-faint transition-colors hover:bg-ivory-soft hover:text-crimson disabled:opacity-50"
          >
            <Check size={16} strokeWidth={1.75} />
          </button>
        )}
        <button
          onClick={handleDelete}
          disabled={isPending}
          aria-label="삭제"
          className="rounded-md p-2 text-ink-faint transition-colors hover:bg-ivory-soft hover:text-crimson disabled:opacity-50"
        >
          <Trash2 size={16} strokeWidth={1.75} />
        </button>
      </div>
    </div>
  );
}

export default function AdminPromotionManager({
  items,
}: {
  items: AdminPromotion[];
}) {
  const pending = items.filter((p) => p.status === "pending");
  const approved = items.filter((p) => p.status === "approved");

  return (
    <div>
      {pending.length > 0 && (
        <div className="mb-8">
          <p className="mb-2 text-sm font-medium text-crimson">
            승인 대기 중 {pending.length}건
          </p>
          <div className="divide-y divide-ivory-line border-y border-ivory-line">
            {pending.map((promotion) => (
              <PromotionRow key={promotion.id} promotion={promotion} />
            ))}
          </div>
        </div>
      )}

      <p className="text-sm text-ink-faint">
        게시 중인 홍보물 {approved.length}건
      </p>
      <div className="mt-2 divide-y divide-ivory-line border-t border-ivory-line">
        {approved.map((promotion) => (
          <PromotionRow key={promotion.id} promotion={promotion} />
        ))}

        {items.length === 0 && (
          <p className="py-12 text-center text-sm text-ink-faint">
            등록된 홍보물이 없습니다.
          </p>
        )}
      </div>
    </div>
  );
}
