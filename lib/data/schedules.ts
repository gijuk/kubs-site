import type { ScheduleCategory, ScheduleItem } from "@/lib/types";
import { scheduleItems as mockScheduleItems } from "@/lib/mock-data";
import { getPublicSupabaseClient } from "@/lib/supabase/publicClient";

interface ScheduleRow {
  id: string;
  title: string;
  category: ScheduleCategory;
  date: string;
  end_date: string | null;
  location: string | null;
  organizer: string | null;
  description: string;
}

function rowToScheduleItem(row: ScheduleRow): ScheduleItem {
  return {
    id: row.id,
    title: row.title,
    category: row.category,
    date: row.date,
    endDate: row.end_date ?? undefined,
    location: row.location ?? undefined,
    organizer: row.organizer ?? undefined,
    description: row.description,
  };
}

/**
 * 모든 일정을 최신순(날짜 오름차순)으로 가져옵니다.
 * Supabase 환경변수가 아직 설정되지 않았다면 mock 데이터로 대체합니다.
 */
export async function getAllSchedules(): Promise<ScheduleItem[]> {
  const supabase = getPublicSupabaseClient();

  if (!supabase) {
    return [...mockScheduleItems].sort((a, b) => (a.date > b.date ? 1 : -1));
  }

  const { data, error } = await supabase
    .from("schedules")
    .select("*")
    .order("date", { ascending: true });

  if (error) {
    console.error("[getAllSchedules] Supabase 조회 실패:", error.message);
    return [...mockScheduleItems].sort((a, b) => (a.date > b.date ? 1 : -1));
  }

  return (data as ScheduleRow[]).map(rowToScheduleItem);
}

/**
 * 오늘 이후(진행 중 포함)의 일정만 날짜순으로 최대 limit개 가져옵니다.
 * 메인 페이지 "This Week" 섹션에서 사용합니다.
 */
export async function getUpcomingSchedules(limit = 5): Promise<ScheduleItem[]> {
  const all = await getAllSchedules();
  const todayStr = new Date().toISOString().slice(0, 10);

  return all
    .filter((item) => (item.endDate ?? item.date) >= todayStr)
    .slice(0, limit);
}
