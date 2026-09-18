"use client";

import { useEffect } from "react";
import type { KubsHistoryEntry } from "@/lib/data/kubsHistory";

function Sprockets() {
  return (
    <div className="flex justify-between px-3">
      {Array.from({ length: 14 }).map((_, i) => (
        <span
          key={i}
          className="h-2.5 w-2.5 rounded-[2px] bg-black/80"
          aria-hidden
        />
      ))}
    </div>
  );
}

export default function HistoryFilmModal({
  entry,
  onContinue,
}: {
  entry: KubsHistoryEntry;
  onContinue: () => void;
}) {
  useEffect(() => {
    // 점프하려고 연타하던 스페이스바로 팝업이 열리자마자 닫히지 않도록 잠깐 입력을 무시합니다.
    const openedAt = performance.now();
    const onKey = (e: KeyboardEvent) => {
      if (e.repeat || performance.now() - openedAt < 600) return;
      if (
        e.code === "Space" ||
        e.code === "Enter" ||
        e.code === "Escape" ||
        e.key === " " ||
        e.key === "Enter" ||
        e.key === "Escape"
      ) {
        e.preventDefault();
        onContinue();
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onContinue]);

  return (
    <div
      className="fixed inset-0 z-[80] flex items-center justify-center bg-black/85 p-6 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
    >
      <div className="w-full max-w-xl">
        {/* 필름 스트립: 좌우로 살짝 보이는 이전/다음 프레임 느낌 */}
        <div className="flex items-center gap-2">
          <div className="hidden h-40 w-8 shrink-0 rounded-md bg-ivory-fixed/5 sm:block" />

          <div className="min-w-0 flex-1 animate-fade-up rounded-lg bg-[#161217] shadow-2xl">
            <div className="pt-3">
              <Sprockets />
            </div>

            <div className="px-6 py-6 sm:px-8 sm:py-8">
              <div className="mb-4 flex items-center gap-2">
                <span className="rounded-full bg-crimson px-3 py-1 text-xs font-medium text-ivory-fixed">
                  KUBS HISTORY
                </span>
                <span className="h-px flex-1 bg-ivory-fixed/15" />
              </div>

              <p className="font-serif text-5xl font-bold leading-none tracking-tight text-crimson-bright sm:text-6xl">
                {entry.year}
              </p>
              <h3 className="mt-3 font-serif text-xl font-semibold text-ivory-fixed sm:text-2xl">
                {entry.title}
              </h3>
              <p className="mt-4 text-sm leading-relaxed text-ivory-fixed/70">
                {entry.description}
              </p>

              <div className="mt-7 flex justify-end">
                <button
                  onClick={onContinue}
                  className="rounded-full bg-crimson px-6 py-2.5 text-sm font-medium text-ivory-fixed transition-colors hover:bg-crimson-deep"
                >
                  게임 계속하기 →
                </button>
              </div>
            </div>

            <div className="pb-3">
              <Sprockets />
            </div>
          </div>

          <div className="hidden h-40 w-8 shrink-0 rounded-md bg-ivory-fixed/5 sm:block" />
        </div>
      </div>
    </div>
  );
}
