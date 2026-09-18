"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Check, Trash2 } from "lucide-react";
import type { Suggestion } from "@/lib/types";
import {
  markSuggestionReadAction,
  deleteSuggestionAction,
} from "@/app/suggestions/actions";

function formatDateTime(iso: string) {
  const d = new Date(iso);
  return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, "0")}.${String(
    d.getDate()
  ).padStart(2, "0")} ${String(d.getHours()).padStart(2, "0")}:${String(
    d.getMinutes()
  ).padStart(2, "0")}`;
}

function SuggestionRow({ suggestion }: { suggestion: Suggestion }) {
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  const handleMarkRead = () => {
    startTransition(async () => {
      await markSuggestionReadAction(suggestion.id);
      router.refresh();
    });
  };

  const handleDelete = () => {
    if (!confirm("이 건의를 삭제할까요? 되돌릴 수 없습니다.")) return;
    startTransition(async () => {
      await deleteSuggestionAction(suggestion.id);
      router.refresh();
    });
  };

  return (
    <div className="flex items-start gap-4 py-5">
      <div className="min-w-0 flex-1">
        <div className="mb-1.5 flex items-center gap-2">
          {!suggestion.isRead && (
            <span className="rounded-full bg-crimson-tint px-2 py-0.5 text-[11px] text-crimson">
              안 읽음
            </span>
          )}
          <span className="rounded bg-ivory-soft px-1.5 py-0.5 text-[10px] text-ink-faint">
            {suggestion.category}
          </span>
          <span className="text-xs text-ink-faint">
            {formatDateTime(suggestion.createdAt)}
          </span>
        </div>
        <p className="whitespace-pre-line text-sm leading-relaxed text-ink">
          {suggestion.content}
        </p>
        {suggestion.contact && (
          <p className="mt-1.5 text-xs text-ink-faint">
            연락처: {suggestion.contact}
          </p>
        )}
      </div>

      <div className="flex shrink-0 items-center gap-2">
        {!suggestion.isRead && (
          <button
            onClick={handleMarkRead}
            disabled={isPending}
            aria-label="읽음 처리"
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

export default function AdminSuggestionManager({
  items,
}: {
  items: Suggestion[];
}) {
  const unreadCount = items.filter((s) => !s.isRead).length;

  return (
    <div>
      <p className="text-sm text-ink-faint">
        총 {items.length}건
        {unreadCount > 0 && (
          <span className="ml-1 text-crimson">· 안 읽음 {unreadCount}건</span>
        )}
      </p>

      <div className="mt-4 divide-y divide-ivory-line border-t border-ivory-line">
        {items.map((suggestion) => (
          <SuggestionRow key={suggestion.id} suggestion={suggestion} />
        ))}

        {items.length === 0 && (
          <p className="py-12 text-center text-sm text-ink-faint">
            아직 접수된 건의가 없습니다.
          </p>
        )}
      </div>
    </div>
  );
}
