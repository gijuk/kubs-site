"use server";

import { revalidatePath } from "next/cache";
import { getAdminSupabaseClient } from "@/lib/supabase/adminClient";
import type { ScheduleCategory } from "@/lib/types";

export interface ScheduleFormState {
  error?: string;
  success?: boolean;
}

function readScheduleForm(formData: FormData) {
  const title = String(formData.get("title") ?? "").trim();
  const category = String(formData.get("category") ?? "") as ScheduleCategory;
  const date = String(formData.get("date") ?? "");
  const endDateRaw = String(formData.get("endDate") ?? "").trim();
  const location = String(formData.get("location") ?? "").trim();
  const organizer = String(formData.get("organizer") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();

  if (!title || !date || !category) {
    throw new Error("제목, 카테고리, 날짜는 필수입니다.");
  }

  return {
    title,
    category,
    date,
    end_date: endDateRaw || null,
    location: location || null,
    organizer: organizer || null,
    description,
  };
}

function refreshScheduleCaches() {
  revalidatePath("/");
  revalidatePath("/schedule");
  revalidatePath("/admin");
}

export async function createScheduleAction(
  _prev: ScheduleFormState,
  formData: FormData
): Promise<ScheduleFormState> {
  try {
    const payload = readScheduleForm(formData);
    const supabase = getAdminSupabaseClient();
    const { error } = await supabase.from("schedules").insert(payload);
    if (error) throw new Error(error.message);

    refreshScheduleCaches();
    return { success: true };
  } catch (err) {
    return { error: err instanceof Error ? err.message : "등록에 실패했습니다." };
  }
}

export async function updateScheduleAction(
  id: string,
  _prev: ScheduleFormState,
  formData: FormData
): Promise<ScheduleFormState> {
  try {
    const payload = readScheduleForm(formData);
    const supabase = getAdminSupabaseClient();
    const { error } = await supabase
      .from("schedules")
      .update(payload)
      .eq("id", id);
    if (error) throw new Error(error.message);

    refreshScheduleCaches();
    return { success: true };
  } catch (err) {
    return { error: err instanceof Error ? err.message : "수정에 실패했습니다." };
  }
}

export async function deleteScheduleAction(id: string) {
  const supabase = getAdminSupabaseClient();
  const { error } = await supabase.from("schedules").delete().eq("id", id);
  if (error) throw new Error(error.message);

  refreshScheduleCaches();
}
