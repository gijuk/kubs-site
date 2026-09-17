import { NextResponse } from "next/server";
import { Resend } from "resend";
import { getAdminSupabaseClient } from "@/lib/supabase/adminClient";
import { CATEGORY_LABEL, type ScheduleCategory } from "@/lib/types";

export const dynamic = "force-dynamic";

const KST_OFFSET_MS = 9 * 60 * 60 * 1000;

/** 오늘(KST) 기준으로 offsetDays일 뒤 날짜를 "YYYY-MM-DD"로 반환합니다. */
function kstDateString(offsetDays: number): string {
  const kstNow = new Date(Date.now() + KST_OFFSET_MS);
  kstNow.setUTCDate(kstNow.getUTCDate() + offsetDays);
  return kstNow.toISOString().slice(0, 10);
}

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
 */
export async function GET(request: Request) {
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret) {
    const authHeader = request.headers.get("authorization");
    if (authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }
  }

  const resendApiKey = process.env.RESEND_API_KEY;
  if (!resendApiKey) {
    return NextResponse.json(
      { error: "RESEND_API_KEY가 설정되지 않았습니다." },
      { status: 500 }
    );
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
  const resend = new Resend(resendApiKey);
  const fromAddress =
    process.env.REMINDER_FROM_EMAIL || "KUBS, in one place <onboarding@resend.dev>";

  let sent = 0;
  const notifiedIds: string[] = [];

  for (const reminder of reminders) {
    const schedule = scheduleById.get(reminder.schedule_id);
    if (!schedule) continue;

    try {
      await resend.emails.send({
        from: fromAddress,
        to: reminder.email,
        subject: `[내일 일정] ${schedule.title}`,
        html: `
          <div style="font-family: -apple-system, sans-serif; line-height: 1.7; color: #1d1b18;">
            <p style="color:#7a0c2e; font-size: 13px; margin-bottom: 4px;">${CATEGORY_LABEL[schedule.category]}</p>
            <h2 style="margin: 0 0 12px;">${schedule.title}</h2>
            <p>내일(${schedule.date}) 예정된 일정을 알려드려요.</p>
            ${schedule.location ? `<p>장소: ${schedule.location}</p>` : ""}
            <p style="margin-top: 24px; font-size: 12px; color: #6b675f;">
              KUBS, in one place — 경영대 학생회가 운영하는 비공식 정보 사이트
            </p>
          </div>
        `,
      });
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
