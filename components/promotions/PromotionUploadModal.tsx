"use client";

import { useEffect, useRef, useState } from "react";
import { useFormState, useFormStatus } from "react-dom";
import { useRouter } from "next/navigation";
import { AlertTriangle, CheckCircle2, X } from "lucide-react";
import { PROMOTION_CATEGORY_LABEL } from "@/lib/types";
import {
  uploadPromotionAction,
  type PromotionUploadState,
} from "@/app/promotions/actions";

const initialState: PromotionUploadState = {};

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="rounded-md bg-crimson px-5 py-2.5 text-sm font-medium text-ivory transition-colors hover:bg-crimson-deep disabled:opacity-60"
    >
      {pending ? "등록 중..." : "등록"}
    </button>
  );
}

export default function PromotionUploadModal({
  onClose,
}: {
  onClose: () => void;
}) {
  const [state, formAction] = useFormState(uploadPromotionAction, initialState);
  const formRef = useRef<HTMLFormElement>(null);
  const confirmedRef = useRef(false);
  const router = useRouter();

  const [showWarning, setShowWarning] = useState(false);
  const [justUploaded, setJustUploaded] = useState(false);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [onClose]);

  useEffect(() => {
    if (state.success) {
      formRef.current?.reset();
      router.refresh();
      setJustUploaded(true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.success]);

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    if (confirmedRef.current) {
      confirmedRef.current = false;
      return;
    }
    e.preventDefault();
    setShowWarning(true);
  };

  const handleConfirmUpload = () => {
    setShowWarning(false);
    confirmedRef.current = true;
    formRef.current?.requestSubmit();
  };

  const handleClose = () => {
    setJustUploaded(false);
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-[60] flex items-end justify-center bg-ink/40 backdrop-blur-[2px] md:items-center"
      onClick={handleClose}
      role="dialog"
      aria-modal="true"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="max-h-[90vh] w-full max-w-lg animate-fade-up overflow-y-auto rounded-t-2xl bg-ivory p-8 shadow-xl md:rounded-2xl"
      >
        {justUploaded ? (
          <div className="flex flex-col items-center py-6 text-center">
            <CheckCircle2 size={40} strokeWidth={1.5} className="text-crimson" />
            <h3 className="mt-4 font-serif text-xl font-semibold text-ink">
              등록이 완료되었습니다
            </h3>
            <p className="mt-2 text-sm leading-relaxed text-ink-faint">
              관리자 승인 후 게시판에 표시됩니다.
            </p>
            <button
              onClick={handleClose}
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
                  홍보물 등록
                </h3>
                <p className="mt-1 text-xs text-ink-faint">
                  등록한 글은 관리자 승인 후 게시판에 게시됩니다.
                </p>
              </div>
              <button
                onClick={handleClose}
                aria-label="닫기"
                className="text-ink-faint transition-colors hover:text-ink"
              >
                <X size={20} />
              </button>
            </div>

            <form
              ref={formRef}
              action={formAction}
              onSubmit={handleSubmit}
              className="mt-6 space-y-4"
            >
              <div>
                <label className="mb-1.5 block text-xs text-ink-faint">
                  카테고리 *
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
                  {Object.entries(PROMOTION_CATEGORY_LABEL).map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="mb-1.5 block text-xs text-ink-faint">
                  제목 *
                </label>
                <input
                  name="title"
                  required
                  className="w-full rounded-md border border-ivory-line bg-ivory px-3 py-2 text-sm focus:border-crimson focus:outline-none"
                />
              </div>

              <div>
                <label className="mb-1.5 block text-xs text-ink-faint">
                  작성자 (동아리/단체명) *
                </label>
                <input
                  name="author"
                  required
                  className="w-full rounded-md border border-ivory-line bg-ivory px-3 py-2 text-sm focus:border-crimson focus:outline-none"
                />
              </div>

              <div>
                <label className="mb-1.5 block text-xs text-ink-faint">
                  내용 *
                </label>
                <textarea
                  name="content"
                  required
                  rows={5}
                  className="w-full rounded-md border border-ivory-line bg-ivory px-3 py-2 text-sm focus:border-crimson focus:outline-none"
                />
              </div>

              <div>
                <label className="mb-1.5 block text-xs text-ink-faint">
                  링크 (선택, 신청폼/인스타그램 등)
                </label>
                <input
                  type="url"
                  name="link"
                  placeholder="https://..."
                  className="w-full rounded-md border border-ivory-line bg-ivory px-3 py-2 text-sm focus:border-crimson focus:outline-none"
                />
              </div>

              <div>
                <label className="mb-1.5 block text-xs text-ink-faint">
                  이미지 (선택, 최대 8MB)
                </label>
                <input
                  type="file"
                  name="image"
                  accept="image/png,image/jpeg,image/webp,image/gif"
                  className="w-full rounded-md border border-ivory-line bg-ivory-soft px-3 py-2 text-sm file:mr-3 file:rounded-md file:border-0 file:bg-crimson file:px-3 file:py-1.5 file:text-xs file:text-ivory"
                />
              </div>

              {state.error && (
                <p className="text-xs text-crimson">{state.error}</p>
              )}

              <div className="flex items-center gap-3 pt-2">
                <SubmitButton />
                <button
                  type="button"
                  onClick={handleClose}
                  className="text-sm text-ink-faint hover:text-ink"
                >
                  취소
                </button>
              </div>
            </form>
          </>
        )}
      </div>

      {showWarning && (
        <div
          className="fixed inset-0 z-[70] flex items-center justify-center bg-ink/50 p-6"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="w-full max-w-sm rounded-2xl bg-ivory p-6 shadow-xl">
            <div className="flex items-center gap-2 text-crimson">
              <AlertTriangle size={20} strokeWidth={1.75} />
              <h4 className="font-serif text-lg font-semibold">
                등록 전 확인해주세요
              </h4>
            </div>
            <p className="mt-3 text-sm leading-relaxed text-ink-soft">
              허위·과장 광고, 타인의 저작물 무단 사용, 특정인을 비방하거나
              불쾌감을 줄 수 있는 내용은 올리지 말아주세요. 초상권이 있는
              사진을 쓸 경우 당사자 동의를 받아주세요. 부적절한 게시물은
              관리자 승인 과정에서 거부되고 삭제될 수 있습니다.
            </p>
            <div className="mt-5 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setShowWarning(false)}
                className="text-sm text-ink-faint hover:text-ink"
              >
                취소
              </button>
              <button
                type="button"
                onClick={handleConfirmUpload}
                className="rounded-md bg-crimson px-4 py-2 text-sm font-medium text-ivory transition-colors hover:bg-crimson-deep"
              >
                동의하고 등록
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
