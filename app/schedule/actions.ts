"use server";

import { getAdminSupabaseClient } from "@/lib/supabase/adminClient";

export interface ReminderState {
  error?: string;
  success?: boolean;
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * 관심 일정에 이메일 알림을 등록합니다. D-1일에 /api/reminders 크론이
 * Resend로 메일을 발송합니다. 이미 등록된 이메일이면 조용히 성공 처리합니다.
 */
export async function subscribeReminderAction(
  scheduleId: string,
  _prev: ReminderState,
  formData: FormData
): Promise<ReminderState> {
  try {
    const email = String(formData.get("email") ?? "").trim().toLowerCase();

    if (!EMAIL_RE.test(email)) {
      throw new Error("올바른 이메일 주소를 입력해주세요.");
    }

    const supabase = getAdminSupabaseClient();
    const { error } = await supabase
      .from("schedule_reminders")
      .upsert(
        { schedule_id: scheduleId, email },
        { onConflict: "schedule_id,email", ignoreDuplicates: true }
      );

    if (error) throw new Error(error.message);

    return { success: true };
  } catch (err) {
    return {
      error: err instanceof Error ? err.message : "알림 등록에 실패했습니다.",
    };
  }
}
