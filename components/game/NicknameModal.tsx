"use client";

import { useEffect, useState } from "react";
import Portal from "@/components/common/Portal";
import { NICKNAME_MAX } from "./gamePlayer";

export type NicknameModalMode = "start" | "edit";

export default function NicknameModal({
  mode,
  initial,
  onSave,
  onSkip,
  onClose,
}: {
  mode: NicknameModalMode;
  initial: string;
  onSave: (nickname: string) => void;
  /** mode === "start" 일 때만: 닉네임 없이 그냥 시작 */
  onSkip: () => void;
  onClose: () => void;
}) {
  const [value, setValue] = useState(initial);
  const trimmed = value.trim();

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
        return;
      }
      // 입력창 밖에 포커스가 있을 때 스페이스바로 뒤 페이지가 스크롤되지 않게
      const target = e.target as HTMLElement | null;
      if ((e.key === " " || e.code === "Space") && !target?.closest("input, button")) {
        e.preventDefault();
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (trimmed.length === 0) return;
    onSave(trimmed);
  };

  return (
    <Portal>
      <div
        className="fixed inset-0 z-[80] flex items-center justify-center bg-black/80 p-6 backdrop-blur-sm"
        role="dialog"
        aria-modal="true"
        aria-labelledby="nickname-modal-title"
      >
        <form
          onSubmit={submit}
          className="w-full max-w-md animate-fade-up rounded-2xl border border-ivory-fixed/15 bg-[#161217] p-6 text-left shadow-2xl sm:p-8"
        >
          <span className="rounded-full bg-crimson px-3 py-1 text-xs font-medium text-ivory-fixed">
            KUBS RANKING
          </span>
          <h3
            id="nickname-modal-title"
            className="mt-4 font-serif text-xl font-semibold text-ivory-fixed"
          >
            {mode === "start" ? "닉네임을 설정하고 시작할까요?" : "닉네임 설정"}
          </h3>
          <p className="mt-3 text-sm leading-relaxed text-ivory-fixed/70">
            닉네임을 입력하면 <b className="text-ivory-fixed">게임 기록이 자동으로 전체 순위에 집계</b>
            돼요. 1등이 아니어도 괜찮아요. 내 순위를 확인하고 다른 친구들과 기록을 비교해보세요.
          </p>

          <label className="mt-5 block text-xs text-ivory-fixed/55" htmlFor="nickname-input">
            닉네임 (선택, {NICKNAME_MAX}자 이내)
          </label>
          <input
            id="nickname-input"
            autoFocus
            value={value}
            onChange={(e) => setValue(e.target.value.replace(/^\s+/, ""))}
            maxLength={NICKNAME_MAX}
            placeholder="예: 경영대 호랑이"
            autoComplete="off"
            className="mt-2 w-full rounded-full border border-ivory-fixed/25 bg-transparent px-4 py-2.5 text-sm text-ivory-fixed placeholder:text-ivory-fixed/35 focus:border-crimson-bright focus:outline-none"
          />

          <div className="mt-6 flex flex-col gap-2 sm:flex-row-reverse">
            <button
              type="submit"
              disabled={trimmed.length === 0}
              className="rounded-full bg-crimson px-5 py-2.5 text-sm font-medium text-ivory-fixed transition-colors hover:bg-crimson-deep disabled:cursor-not-allowed disabled:opacity-50"
            >
              {mode === "start" ? "닉네임 저장하고 시작" : "저장"}
            </button>
            {mode === "start" ? (
              <button
                type="button"
                onClick={onSkip}
                className="rounded-full border border-ivory-fixed/25 px-5 py-2.5 text-sm text-ivory-fixed/80 transition-colors hover:border-ivory-fixed/60 hover:text-ivory-fixed"
              >
                그냥 시작하기
              </button>
            ) : (
              <button
                type="button"
                onClick={onClose}
                className="rounded-full border border-ivory-fixed/25 px-5 py-2.5 text-sm text-ivory-fixed/80 transition-colors hover:border-ivory-fixed/60 hover:text-ivory-fixed"
              >
                취소
              </button>
            )}
          </div>

          <p className="mt-4 text-[11px] leading-relaxed text-ivory-fixed/40">
            {mode === "start"
              ? "그냥 시작하면 기록이 순위에 올라가지 않아요. 나중에 랭킹 패널에서 언제든 닉네임을 설정할 수 있어요. "
              : ""}
            닉네임과 점수만 저장되며 계정은 필요 없어요.
          </p>
        </form>
      </div>
    </Portal>
  );
}
