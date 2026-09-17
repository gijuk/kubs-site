"use client";

import { useState } from "react";
import { useFormState, useFormStatus } from "react-dom";
import { BellRing, Check } from "lucide-react";
import {
  subscribeReminderAction,
  type ReminderState,
} from "@/app/schedule/actions";

const initialState: ReminderState = {};

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="shrink-0 rounded-md bg-crimson px-4 py-2 text-xs font-medium text-ivory transition-colors hover:bg-crimson-deep disabled:opacity-60"
    >
      {pending ? "등록 중..." : "등록"}
    </button>
  );
}

export default function ReminderButton({ scheduleId }: { scheduleId: string }) {
  const [open, setOpen] = useState(false);
  const action = subscribeReminderAction.bind(null, scheduleId);
  const [state, formAction] = useFormState(action, initialState);

  if (state.success) {
    return (
      <p className="flex items-center gap-1.5 text-sm text-crimson">
        <Check size={15} strokeWidth={1.75} />
        하루 전에 이메일로 알려드릴게요
      </p>
    );
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex items-center gap-1.5 rounded-full border border-crimson px-3.5 py-1.5 text-xs text-crimson transition-colors hover:bg-crimson hover:text-ivory"
      >
        <BellRing size={14} strokeWidth={1.75} />
        알림 예약하기
      </button>
    );
  }

  return (
    <form action={formAction} className="flex flex-wrap items-center gap-2">
      <input
        type="email"
        name="email"
        required
        placeholder="you@example.com"
        className="w-48 rounded-md border border-ivory-line bg-ivory px-3 py-2 text-xs focus:border-crimson focus:outline-none"
      />
      <SubmitButton />
      <button
        type="button"
        onClick={() => setOpen(false)}
        className="text-xs text-ink-faint hover:text-ink"
      >
        취소
      </button>
      {state.error && (
        <p className="w-full text-xs text-crimson">{state.error}</p>
      )}
    </form>
  );
}
