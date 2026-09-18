"use server";

import { revalidatePath } from "next/cache";
import { getAdminSupabaseClient } from "@/lib/supabase/adminClient";
import type { SuggestionCategory } from "@/lib/types";

export interface SuggestionFormState {
  error?: string;
  success?: boolean;
}

const VALID_CATEGORIES: SuggestionCategory[] = [
  "학사",
  "시설",
  "학생회 운영",
  "기타",
];

export async function submitSuggestionAction(
  _prev: SuggestionFormState,
  formData: FormData
): Promise<SuggestionFormState> {
  try {
    const category = String(formData.get("category") ?? "") as SuggestionCategory;
    const content = String(formData.get("content") ?? "").trim();
    const contact = String(formData.get("contact") ?? "").trim();

    if (!VALID_CATEGORIES.includes(category)) {
      throw new Error("카테고리를 선택해주세요.");
    }
    if (content.length < 5) {
      throw new Error("건의 내용을 5자 이상 입력해주세요.");
    }

    const supabase = getAdminSupabaseClient();
    const { error } = await supabase.from("suggestions").insert({
      category,
      content,
      contact: contact || null,
    });
    if (error) throw new Error(error.message);

    revalidatePath("/admin");
    return { success: true };
  } catch (err) {
    return {
      error: err instanceof Error ? err.message : "전송에 실패했습니다.",
    };
  }
}

/** 관리자 전용: 읽음 처리 */
export async function markSuggestionReadAction(id: string) {
  const supabase = getAdminSupabaseClient();
  const { error } = await supabase
    .from("suggestions")
    .update({ is_read: true })
    .eq("id", id);
  if (error) throw new Error(error.message);

  revalidatePath("/admin");
}

/** 관리자 전용: 삭제 */
export async function deleteSuggestionAction(id: string) {
  const supabase = getAdminSupabaseClient();
  const { error } = await supabase.from("suggestions").delete().eq("id", id);
  if (error) throw new Error(error.message);

  revalidatePath("/admin");
}
