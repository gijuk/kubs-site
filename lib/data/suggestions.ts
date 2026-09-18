import type { Suggestion, SuggestionCategory } from "@/lib/types";
import { getAdminSupabaseClient } from "@/lib/supabase/adminClient";

interface SuggestionRow {
  id: string;
  category: SuggestionCategory;
  content: string;
  contact: string | null;
  is_read: boolean;
  created_at: string;
}

function rowToSuggestion(row: SuggestionRow): Suggestion {
  return {
    id: row.id,
    category: row.category,
    content: row.content,
    contact: row.contact ?? undefined,
    isRead: row.is_read,
    createdAt: row.created_at,
  };
}

/**
 * 모든 익명 건의를 최신순으로 가져옵니다. (관리자 페이지 전용, Service Role Key 사용)
 * 사이트 방문자에게 노출되는 목록이 아니므로 공개용 조회 함수는 따로 없습니다.
 */
export async function getAllSuggestionsForAdmin(): Promise<Suggestion[]> {
  const supabase = getAdminSupabaseClient();

  const { data, error } = await supabase
    .from("suggestions")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    console.error("[getAllSuggestionsForAdmin] Supabase 조회 실패:", error.message);
    return [];
  }

  return (data as SuggestionRow[]).map(rowToSuggestion);
}
