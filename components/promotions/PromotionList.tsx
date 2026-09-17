"use client";

import { useState } from "react";
import type { Promotion } from "@/lib/types";
import PromotionCard from "./PromotionCard";
import PromotionDetailModal from "./PromotionDetailModal";

export default function PromotionList({
  promotions,
}: {
  promotions: Promotion[];
}) {
  const [selected, setSelected] = useState<Promotion | null>(null);

  if (promotions.length === 0) {
    return (
      <p className="py-12 text-center text-sm text-ink-faint">
        아직 등록된 홍보물이 없습니다. 첫 번째 홍보물을 올려보세요!
      </p>
    );
  }

  return (
    <>
      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {promotions.map((promotion) => (
          <PromotionCard
            key={promotion.id}
            promotion={promotion}
            onSelect={setSelected}
          />
        ))}
      </div>

      {selected && (
        <PromotionDetailModal
          promotion={selected}
          onClose={() => setSelected(null)}
        />
      )}
    </>
  );
}
