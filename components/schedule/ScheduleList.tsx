"use client";

import { useState } from "react";
import type { ScheduleItem } from "@/lib/types";
import ScheduleCard from "./ScheduleCard";
import Portal from "@/components/common/Portal";
import ScheduleModal from "./ScheduleModal";

export default function ScheduleList({ items }: { items: ScheduleItem[] }) {
  const [selected, setSelected] = useState<ScheduleItem | null>(null);

  if (items.length === 0) {
    return (
      <p className="py-12 text-center text-sm text-ink-faint">
        표시할 일정이 없습니다.
      </p>
    );
  }

  return (
    <>
      <div>
        {items.map((item, index) => (
          <ScheduleCard
            key={item.id}
            item={item}
            onSelect={setSelected}
            index={index}
          />
        ))}
      </div>

      {selected && (
        <Portal>
          <ScheduleModal item={selected} onClose={() => setSelected(null)} />
        </Portal>
      )}
    </>
  );
}
