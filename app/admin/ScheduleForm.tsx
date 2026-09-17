"use client";

import { useEffect, useRef } from "react";
import { useFormState, useFormStatus } from "react-dom";
import type { ScheduleItem } from "@/lib/types";
import { CATEGORY_LABEL } from "@/lib/types";
import {
  createScheduleAction,
  updateScheduleAction,
  type ScheduleFormState,
} from "./actions";

const initialState: ScheduleFormState = {};

function SubmitButton({ label }: { label: string }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="rounded-md bg-crimson px-5 py-2.5 text-sm font-medium text-ivory transition-colors hover:bg-crimson-deep disabled:opacity-60"
    >
      {pending ? "저장 중..." : label}
    </button>
  );
}

interface ScheduleFormProps {
  editing?: ScheduleItem | null;
  onDone: () => void;
  onCancel?: () => void;
}

export default function ScheduleForm({
  editing,
  onDone,
  onCancel,
}: ScheduleFormProps) {
  const action = editing
    ? updateScheduleAction.bind(null, editing.id)
    : createScheduleAction;

  const [state, formAction] = useFormState(action, initialState);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state.success) {
      formRef.current?.reset();
      onDone();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.success]);

  return (
    <form
      ref={formRef}
      action={formAction}
      className="grid gap-4 rounded-lg border border-ivory-line bg-ivory-soft p-6 sm:grid-cols-2"
    >
      <div className="sm:col-span-2">
        <label className="mb-1.5 block text-xs text-ink-faint">제목 *</label>
        <input
          name="title"
          required
          defaultValue={editing?.title}
          className="w-full rounded-md border border-ivory-line bg-ivory px-3 py-2 text-sm focus:border-crimson focus:outline-none"
        />
      </div>

      <div>
        <label className="mb-1.5 block text-xs text-ink-faint">카테고리 *</label>
        <select
          name="category"
          required
          defaultValue={editing?.category ?? "academic"}
          className="w-full rounded-md border border-ivory-line bg-ivory px-3 py-2 text-sm focus:border-crimson focus:outline-none"
        >
          {Object.entries(CATEGORY_LABEL).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="mb-1.5 block text-xs text-ink-faint">주최</label>
        <input
          name="organizer"
          defaultValue={editing?.organizer}
          className="w-full rounded-md border border-ivory-line bg-ivory px-3 py-2 text-sm focus:border-crimson focus:outline-none"
        />
      </div>

      <div>
        <label className="mb-1.5 block text-xs text-ink-faint">시작일 *</label>
        <input
          type="date"
          name="date"
          required
          defaultValue={editing?.date}
          className="w-full rounded-md border border-ivory-line bg-ivory px-3 py-2 text-sm focus:border-crimson focus:outline-none"
        />
      </div>

      <div>
        <label className="mb-1.5 block text-xs text-ink-faint">
          종료일 (선택)
        </label>
        <input
          type="date"
          name="endDate"
          defaultValue={editing?.endDate}
          className="w-full rounded-md border border-ivory-line bg-ivory px-3 py-2 text-sm focus:border-crimson focus:outline-none"
        />
      </div>

      <div className="sm:col-span-2">
        <label className="mb-1.5 block text-xs text-ink-faint">장소</label>
        <input
          name="location"
          defaultValue={editing?.location}
          className="w-full rounded-md border border-ivory-line bg-ivory px-3 py-2 text-sm focus:border-crimson focus:outline-none"
        />
      </div>

      <div className="sm:col-span-2">
        <label className="mb-1.5 block text-xs text-ink-faint">설명</label>
        <textarea
          name="description"
          rows={3}
          defaultValue={editing?.description}
          className="w-full rounded-md border border-ivory-line bg-ivory px-3 py-2 text-sm focus:border-crimson focus:outline-none"
        />
      </div>

      {state.error && (
        <p className="text-xs text-crimson sm:col-span-2">{state.error}</p>
      )}

      <div className="flex items-center gap-3 sm:col-span-2">
        <SubmitButton label={editing ? "수정 저장" : "일정 등록"} />
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="text-sm text-ink-faint hover:text-ink"
          >
            취소
          </button>
        )}
      </div>
    </form>
  );
}
