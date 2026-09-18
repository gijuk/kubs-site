"use client";

import { useEffect, useState } from "react";
import Portal from "@/components/common/Portal";
import { GAME_COHORTS } from "@/lib/data/gameCohorts";
import { NICKNAME_MAX } from "./gamePlayer";

export type NicknameModalMode = "start" | "edit";

export interface PlayerProfile {
  nickname: string;
  /** 학번 코드 (선택 안 했으면 빈 문자열) */
  cohort: string;
}

/**
 * 게임 시작 전 "닉네임 + 학번" 설정 팝업. 둘 다 선택사항이고,
 * 닉네임은 개인 랭킹에, 학번은 학번 대항전 합산에 쓰입니다.
 */
export default function NicknameModal({
  mode,
  initial,
  onSave,
  onSkip,
  onClose,
}: {
  mode: NicknameModalMode;
  initial: PlayerProfile;
  onSave: (profile: PlayerProfile) => void;
  /** mode === "start" 일 때만: 설정 없이 그냥 시작 */
  onSkip: () => void;
  onClose: () => void;
}) {
  const [nickname, setNickname] = useState(initial.nickname);
  const [cohort, setCohort] = useState(initial.cohort);
  const trimmed = nickname.trim();
  // 시작할 때는 하나라도 정해야 저장할 수 있고(정하기 싫으면 "그냥 시작하기"), 수정할 때는 비워서 설정을 지울 수도 있습니다.
  const canSave = mode === "edit" || trimmed.length > 0 || cohort !== "";

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
    if (!canSave) return;
    onSave({ nickname: trimmed, cohort });
  };

  return (
    <Portal>
      <div
        className="fixed inset-0 z-[80] flex items-center justify-center overflow-y-auto bg-black/80 p-6 backdrop-blur-sm"
        role="dialog"
        aria-modal="true"
        aria-labelledby="nickname-modal-title"
      >
        <form
          onSubmit={submit}
          className="my-auto w-full max-w-md animate-fade-up rounded-2xl border border-ivory-fixed/15 bg-[#161217] p-6 text-left shadow-2xl sm:p-8"
        >
          <span className="rounded-full bg-crimson px-3 py-1 text-xs font-medium text-ivory-fixed">
            KUBS RANKING
          </span>
          <h3
            id="nickname-modal-title"
            className="mt-4 font-serif text-xl font-semibold text-ivory-fixed"
          >
            {mode === "start" ? "닉네임·학번을 설정하고 시작할까요?" : "닉네임·학번 설정"}
          </h3>
          <p className="mt-3 text-sm leading-relaxed text-ivory-fixed/70">
            설정하면 <b className="text-ivory-fixed">기록이 자동으로 집계</b>돼요. 닉네임은 개인 랭킹에,
            학번은 <b className="text-ivory-fixed">우리 학번이 넘은 장애물 개수의 합계</b>에 더해집니다.
            1등이 아니어도 한 판 한 판이 우리 학번 점수예요. 둘 다 선택사항이에요.
          </p>

          <label className="mt-5 block text-xs text-ivory-fixed/55" htmlFor="nickname-input">
            닉네임 (선택, {NICKNAME_MAX}자 이내)
          </label>
          <input
            id="nickname-input"
            autoFocus
            value={nickname}
            onChange={(e) => setNickname(e.target.value.replace(/^\s+/, ""))}
            maxLength={NICKNAME_MAX}
            placeholder="예: 경영대 호랑이"
            autoComplete="off"
            className="mt-2 w-full rounded-full border border-ivory-fixed/25 bg-transparent px-4 py-2.5 text-sm text-ivory-fixed placeholder:text-ivory-fixed/35 focus:border-crimson-bright focus:outline-none"
          />

          <p className="mt-5 text-xs text-ivory-fixed/55">학번 (선택)</p>
          <div className="mt-2 flex flex-wrap gap-2" role="group" aria-label="학번 선택">
            {GAME_COHORTS.map((c) => {
              const selected = cohort === c.code;
              return (
                <button
                  key={c.code}
                  type="button"
                  aria-pressed={selected}
                  onClick={() => setCohort(selected ? "" : c.code)}
                  className={`rounded-full border px-3.5 py-1.5 text-sm transition-colors ${
                    selected
                      ? "border-crimson bg-crimson text-ivory-fixed"
                      : "border-ivory-fixed/25 text-ivory-fixed/75 hover:border-ivory-fixed/60 hover:text-ivory-fixed"
                  }`}
                >
                  {c.label}
                </button>
              );
            })}
          </div>

          <div className="mt-6 flex flex-col gap-2 sm:flex-row-reverse">
            <button
              type="submit"
              disabled={!canSave}
              className="rounded-full bg-crimson px-5 py-2.5 text-sm font-medium text-ivory-fixed transition-colors hover:bg-crimson-deep disabled:cursor-not-allowed disabled:opacity-50"
            >
              {mode === "start" ? "저장하고 시작" : "저장"}
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
              ? "그냥 시작하면 기록이 순위에 올라가지 않아요. 나중에 랭킹 패널에서 언제든 설정할 수 있어요. "
              : ""}
            닉네임·학번·점수만 저장되며 계정은 필요 없어요.
          </p>
        </form>
      </div>
    </Portal>
  );
}
