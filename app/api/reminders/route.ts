import { NextResponse } from "next/server";
import { getAdminSupabaseClient } from "@/lib/supabase/adminClient";
import { kstDateString, sendReminderEmail } from "@/lib/reminderEmail";
import type { ScheduleCategory } from "@/lib/types";

export const dynamic = "force-dynamic";

interface ScheduleRow {
  id: string;
  title: string;
  category: ScheduleCategory;
  date: string;
  location: string | null;
}

/**
 * 매일 한 번(vercel.json cron) 호출되어, 내일(KST) 예정된 일정에 등록된
 * 이메일 알림을 Resend로 발송합니다. Vercel Cron이 자동으로 붙이는
 * `Authorization: Bearer $CRON_SECRET` 헤더로만 실행을 허용합니다.
 *
 * (일정 당일까지 하루도 안 남은 상태에서 새로 등록된 알림은 다음 크론을
 *  기다리면 이미 늦으므로, 그런 경우는 /schedule/actions.ts 의 구독
 *  액션에서 등록 즉시 발송합니다.)
 */
export async function GET(request: Request) {
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret) {
    const authHeader = request.headers.get("authorization");
    if (authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }
  }

  const supabase = getAdminSupabaseClient();
  const targetDate = kstDateString(1);

  const { data: schedules, error: schedulesError } = await supabase
    .from("schedules")
    .select("id, title, category, date, location")
    .eq("date", targetDate);

  if (schedulesError) {
    return NextResponse.json({ error: schedulesError.message }, { status: 500 });
  }
  if (!schedules || schedules.length === 0) {
    return NextResponse.json({ targetDate, sent: 0 });
  }

  const scheduleRows = schedules as ScheduleRow[];
  const scheduleIds = scheduleRows.map((s) => s.id);

  const { data: reminders, error: remindersError } = await supabase
    .from("schedule_reminders")
    .select("id, schedule_id, email")
    .in("schedule_id", scheduleIds)
    .is("notified_at", null);

  if (remindersError) {
    return NextResponse.json({ error: remindersError.message }, { status: 500 });
  }
  if (!reminders || reminders.length === 0) {
    return NextResponse.json({ targetDate, sent: 0 });
  }

  const scheduleById = new Map(scheduleRows.map((s) => [s.id, s]));

  let sent = 0;
  const notifiedIds: string[] = [];

  for (const reminder of reminders) {
    const schedule = scheduleById.get(reminder.schedule_id);
    if (!schedule) continue;

    try {
      await sendReminderEmail(reminder.email, schedule);
      sent += 1;
      notifiedIds.push(reminder.id);
    } catch (err) {
      console.error(`[reminders] ${reminder.email} 발송 실패:`, err);
    }
  }

  if (notifiedIds.length > 0) {
    await supabase
      .from("schedule_reminders")
      .update({ notified_at: new Date().toISOString() })
      .in("id", notifiedIds);
  }

  return NextResponse.json({ targetDate, sent, totalPending: reminders.length });
}
