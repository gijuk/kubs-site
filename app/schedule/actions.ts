"use server";

import { getAdminSupabaseClient } from "@/lib/supabase/adminClient";
import { kstDateString, sendReminderEmail } from "@/lib/reminderEmail";
import type { ScheduleCategory } from "@/lib/types";

export interface ReminderState {
  error?: string;
  success?: boolean;
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function daysUntil(dateStr: string): number {
  const toUtcDays = (s: string) => {
    const [y, m, d] = s.split("-").map(Number);
    return Date.UTC(y, m - 1, d) / 86_400_000;
  };
  return toUtcDays(dateStr) - toUtcDays(kstDateString(0));
}

/**
 * 관심 일정에 이메일 알림을 등록합니다.
 * - 일정이 이틀 이상 남았으면: 매일 도는 /api/reminders 크론이 D-1 아침에 발송합니다.
 * - 일정이 내일이거나 오늘이면(등록 시점에 이미 크론을 기다릴 여유가 없으므로):
 *   등록 즉시 발송합니다.
 * 이미 등록/발송된 이메일이면 조용히 성공 처리합니다.
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

    const { data: schedule, error: scheduleError } = await supabase
      .from("schedules")
      .select("title, category, date, location")
      .eq("id", scheduleId)
      .single();
    if (scheduleError) throw new Error(scheduleError.message);

    const { error: upsertError } = await supabase
      .from("schedule_reminders")
      .upsert(
        { schedule_id: scheduleId, email },
        { onConflict: "schedule_id,email", ignoreDuplicates: true }
      );
    if (upsertError) throw new Error(upsertError.message);

    // 이미 늦을 수 있는 임박한 일정(오늘/내일)은 다음 크론을 기다리지 않고 바로 발송합니다.
    // 등록 자체는 이미 끝났으므로, 발송이 실패해도 등록 성공 응답에는 영향을 주지 않습니다.
    if (daysUntil(schedule.date) <= 1) {
      try {
        const { data: reminder, error: fetchError } = await supabase
          .from("schedule_reminders")
          .select("id, notified_at")
          .eq("schedule_id", scheduleId)
          .eq("email", email)
          .single();

        if (!fetchError && reminder && !reminder.notified_at) {
          await sendReminderEmail(email, {
            title: schedule.title,
            category: schedule.category as ScheduleCategory,
            date: schedule.date,
            location: schedule.location,
          });
          await supabase
            .from("schedule_reminders")
            .update({ notified_at: new Date().toISOString() })
            .eq("id", reminder.id);
        }
      } catch (sendErr) {
        console.error("[subscribeReminderAction] 즉시 발송 실패:", sendErr);
      }
    }

    return { success: true };
  } catch (err) {
    return {
      error: err instanceof Error ? err.message : "알림 등록에 실패했습니다.",
    };
  }
}
