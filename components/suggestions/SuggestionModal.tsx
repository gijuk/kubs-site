"use client";

import { useEffect, useRef } from "react";
import { useFormState, useFormStatus } from "react-dom";
import { CheckCircle2, X } from "lucide-react";
import {
  submitSuggestionAction,
  type SuggestionFormState,
} from "@/app/suggestions/actions";

const initialState: SuggestionFormState = {};

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="rounded-md bg-crimson px-5 py-2.5 text-sm font-medium text-ivory transition-colors hover:bg-crimson-deep disabled:opacity-60"
    >
      {pending ? "전송 중..." : "전송"}
    </button>
  );
}

export default function SuggestionModal({ onClose }: { onClose: () => void }) {
  const [state, formAction] = useFormState(submitSuggestionAction, initialState);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-[60] flex items-end justify-center bg-black/40 backdrop-blur-[2px] md:items-center"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="max-h-[90vh] w-full max-w-md animate-fade-up overflow-y-auto rounded-t-2xl bg-ivory p-8 shadow-xl md:rounded-2xl"
      >
        {state.success ? (
          <div className="flex flex-col items-center py-6 text-center">
            <CheckCircle2 size={40} strokeWidth={1.5} className="text-crimson" />
            <h3 className="mt-4 font-serif text-xl font-semibold text-ink">
              전달되었습니다
            </h3>
            <p className="mt-2 text-sm leading-relaxed text-ink-faint">
              소중한 의견 감사합니다. 학생회가 확인 후 반영하겠습니다.
            </p>
            <button
              onClick={onClose}
              className="mt-6 rounded-md bg-crimson px-5 py-2.5 text-sm font-medium text-ivory transition-colors hover:bg-crimson-deep"
            >
              닫기
            </button>
          </div>
        ) : (
          <>
            <div className="flex items-start justify-between">
              <div>
                <h3 className="font-serif text-xl font-semibold text-ink">
                  익명 건의함
                </h3>
                <p className="mt-1 text-xs text-ink-faint">
                  실명이나 개인정보 없이, 편하게 의견을 남겨주세요.
                </p>
              </div>
              <button
                onClick={onClose}
                aria-label="닫기"
                className="text-ink-faint transition-colors hover:text-ink"
              >
                <X size={20} />
              </button>
            </div>

            <form ref={formRef} action={formAction} className="mt-6 space-y-4">
              <div>
                <label className="mb-1.5 block text-xs text-ink-faint">
                  분류 *
                </label>
                <select
                  name="category"
                  required
                  defaultValue=""
                  className="w-full rounded-md border border-ivory-line bg-ivory px-3 py-2 text-sm focus:border-crimson focus:outline-none"
                >
                  <option value="" disabled>
                    선택해주세요
                  </option>
                  <option value="학사">학사</option>
                  <option value="시설">시설</option>
                  <option value="학생회 운영">학생회 운영</option>
                  <option value="기타">기타</option>
                </select>
              </div>

              <div>
                <label className="mb-1.5 block text-xs text-ink-faint">
                  건의 내용 *
                </label>
                <textarea
                  name="content"
                  required
                  rows={5}
                  minLength={5}
                  placeholder="어떤 점이 개선되면 좋을까요?"
                  className="w-full rounded-md border border-ivory-line bg-ivory px-3 py-2 text-sm focus:border-crimson focus:outline-none"
                />
              </div>

              <div>
                <label className="mb-1.5 block text-xs text-ink-faint">
                  연락처 (선택, 답변받고 싶을 때만)
                </label>
                <input
                  name="contact"
                  placeholder="이메일 또는 인스타 아이디"
                  className="w-full rounded-md border border-ivory-line bg-ivory px-3 py-2 text-sm focus:border-crimson focus:outline-none"
                />
              </div>

              {state.error && (
                <p className="text-xs text-crimson">{state.error}</p>
              )}

              <div className="flex items-center gap-3 pt-2">
                <SubmitButton />
                <button
                  type="button"
                  onClick={onClose}
                  className="text-sm text-ink-faint hover:text-ink"
                >
                  취소
                </button>
              </div>
            </form>
          </>
        )}
      </div>
    </div>
  );
}
