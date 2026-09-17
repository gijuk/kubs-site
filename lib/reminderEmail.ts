import "server-only";
import { Resend } from "resend";
import { CATEGORY_LABEL, type ScheduleCategory } from "@/lib/types";

export interface ReminderScheduleInfo {
  title: string;
  category: ScheduleCategory;
  date: string;
  location: string | null;
}

/**
 * 일정 알림 메일을 발송합니다. RESEND_API_KEY가 없으면 예외를 던집니다.
 * 크론(/api/reminders)과 즉시 발송(구독 시점) 양쪽에서 재사용합니다.
 */
export async function sendReminderEmail(to: string, schedule: ReminderScheduleInfo) {
  const resendApiKey = process.env.RESEND_API_KEY;
  if (!resendApiKey) {
    throw new Error("RESEND_API_KEY가 설정되지 않았습니다.");
  }

  const resend = new Resend(resendApiKey);
  const fromAddress =
    process.env.REMINDER_FROM_EMAIL || "KUBS, in one place <onboarding@resend.dev>";

  await resend.emails.send({
    from: fromAddress,
    to,
    subject: `[일정 알림] ${schedule.title}`,
    html: `
      <div style="font-family: -apple-system, sans-serif; line-height: 1.7; color: #1d1b18;">
        <p style="color:#7a0c2e; font-size: 13px; margin-bottom: 4px;">${CATEGORY_LABEL[schedule.category]}</p>
        <h2 style="margin: 0 0 12px;">${schedule.title}</h2>
        <p>${schedule.date} 예정된 일정을 알려드려요.</p>
        ${schedule.location ? `<p>장소: ${schedule.location}</p>` : ""}
        <p style="margin-top: 24px; font-size: 12px; color: #6b675f;">
          KUBS, in one place — 경영대 학생회가 운영하는 비공식 정보 사이트
        </p>
      </div>
    `,
  });
}

const KST_OFFSET_MS = 9 * 60 * 60 * 1000;

/** 오늘(KST) 기준으로 offsetDays일 뒤 날짜를 "YYYY-MM-DD"로 반환합니다. */
export function kstDateString(offsetDays: number): string {
  const kstNow = new Date(Date.now() + KST_OFFSET_MS);
  kstNow.setUTCDate(kstNow.getUTCDate() + offsetDays);
  return kstNow.toISOString().slice(0, 10);
}
