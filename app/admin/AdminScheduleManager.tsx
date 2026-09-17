"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Pencil, Plus, Trash2, X } from "lucide-react";
import type { ScheduleItem } from "@/lib/types";
import { CATEGORY_LABEL } from "@/lib/types";
import { formatKoreanDate } from "@/hooks/useCountdown";
import ScheduleForm from "./ScheduleForm";
import { deleteScheduleAction } from "./actions";

export default function AdminScheduleManager({
  items,
}: {
  items: ScheduleItem[];
}) {
  const [mode, setMode] = useState<"idle" | "create" | string>("idle");
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  const handleDone = () => {
    setMode("idle");
    router.refresh();
  };

  const handleDelete = (id: string, title: string) => {
    if (!confirm(`"${title}" 일정을 삭제할까요? 되돌릴 수 없습니다.`)) return;
    startTransition(async () => {
      await deleteScheduleAction(id);
      router.refresh();
    });
  };

  return (
    <div>
      <div className="flex items-center justify-between">
        <p className="text-sm text-ink-faint">
          총 {items.length}건의 일정이 등록되어 있습니다.
        </p>
        {mode === "idle" && (
          <button
            onClick={() => setMode("create")}
            className="flex items-center gap-1.5 rounded-full bg-crimson px-4 py-2 text-sm text-ivory transition-colors hover:bg-crimson-deep"
          >
            <Plus size={15} strokeWidth={1.75} />
            새 일정 추가
          </button>
        )}
      </div>

      {mode === "create" && (
        <div className="mt-6">
          <ScheduleForm onDone={handleDone} onCancel={() => setMode("idle")} />
        </div>
      )}

      <div className="mt-8 divide-y divide-ivory-line border-t border-ivory-line">
        {items.map((item) =>
          mode === item.id ? (
            <div key={item.id} className="py-6">
              <ScheduleForm
                editing={item}
                onDone={handleDone}
                onCancel={() => setMode("idle")}
              />
            </div>
          ) : (
            <div
              key={item.id}
              className="flex flex-col gap-3 py-5 sm:flex-row sm:items-center sm:justify-between"
            >
              <div>
                <div className="mb-1 flex items-center gap-2">
                  <span className="rounded bg-ivory-soft px-2 py-0.5 text-[11px] text-ink-faint">
                    {CATEGORY_LABEL[item.category]}
                  </span>
                  <span className="text-xs text-ink-faint">
                    {formatKoreanDate(item.date)}
                    {item.endDate && ` – ${formatKoreanDate(item.endDate)}`}
                  </span>
                </div>
                <p className="font-serif text-base text-ink">{item.title}</p>
              </div>

              <div className="flex shrink-0 items-center gap-2">
                <button
                  onClick={() => setMode(item.id)}
                  aria-label="수정"
                  className="rounded-md p-2 text-ink-faint transition-colors hover:bg-ivory-soft hover:text-crimson"
                >
                  <Pencil size={16} strokeWidth={1.75} />
                </button>
                <button
                  onClick={() => handleDelete(item.id, item.title)}
                  disabled={isPending}
                  aria-label="삭제"
                  className="rounded-md p-2 text-ink-faint transition-colors hover:bg-ivory-soft hover:text-crimson disabled:opacity-50"
                >
                  <Trash2 size={16} strokeWidth={1.75} />
                </button>
              </div>
            </div>
          )
        )}

        {items.length === 0 && mode !== "create" && (
          <p className="py-12 text-center text-sm text-ink-faint">
            등록된 일정이 없습니다. 위 버튼으로 새 일정을 추가해보세요.
          </p>
        )}
      </div>

      {mode !== "idle" && (
        <button
          onClick={() => setMode("idle")}
          className="mt-4 flex items-center gap-1 text-xs text-ink-faint hover:text-ink"
        >
          <X size={13} strokeWidth={1.75} />
          편집 닫기
        </button>
      )}
    </div>
  );
}
