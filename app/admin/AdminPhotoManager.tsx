"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Check, Trash2 } from "lucide-react";
import type { AdminPhoto } from "@/lib/types";
import {
  approvePhotoAction,
  deletePhotoAction,
} from "@/app/archive/actions";

function PhotoRow({ photo }: { photo: AdminPhoto }) {
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  const handleApprove = () => {
    startTransition(async () => {
      await approvePhotoAction(photo.id);
      router.refresh();
    });
  };

  const handleDelete = () => {
    if (!confirm(`"${photo.eventName}" 사진을 삭제할까요? 되돌릴 수 없습니다.`))
      return;
    startTransition(async () => {
      await deletePhotoAction(photo.id, photo.storagePath);
      router.refresh();
    });
  };

  return (
    <div className="flex items-center gap-4 py-4">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={photo.src}
        alt={photo.alt}
        className="h-16 w-16 shrink-0 rounded-md object-cover"
      />

      <div className="min-w-0 flex-1">
        <div className="mb-1 flex items-center gap-2">
          {photo.status === "pending" && (
            <span className="rounded-full bg-crimson-tint px-2 py-0.5 text-[11px] text-crimson">
              승인 대기
            </span>
          )}
          <span className="text-xs text-ink-faint">{photo.date}</span>
        </div>
        <p className="truncate font-serif text-base text-ink">
          {photo.eventName}
        </p>
        <p className="truncate text-xs text-ink-faint">{photo.photographer}</p>
        {(photo.submitterPhone || photo.submitterInfo) && (
          <p className="mt-0.5 text-xs text-ink-faint">
            {photo.submitterPhone && <>전화 {photo.submitterPhone}</>}
            {photo.submitterPhone && photo.submitterInfo && " · "}
            {photo.submitterInfo && <>신상 {photo.submitterInfo}</>}
          </p>
        )}
      </div>

      <div className="flex shrink-0 items-center gap-2">
        {photo.status === "pending" && (
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

export default function AdminPhotoManager({
  items,
}: {
  items: AdminPhoto[];
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
            {pending.map((photo) => (
              <PhotoRow key={photo.id} photo={photo} />
            ))}
          </div>
        </div>
      )}

      <p className="text-sm text-ink-faint">
        게시 중인 사진 {approved.length}건
      </p>
      <div className="mt-2 divide-y divide-ivory-line border-t border-ivory-line">
        {approved.map((photo) => (
          <PhotoRow key={photo.id} photo={photo} />
        ))}

        {items.length === 0 && (
          <p className="py-12 text-center text-sm text-ink-faint">
            등록된 사진이 없습니다.
          </p>
        )}
      </div>
    </div>
  );
}
