import type {
  AdminPromotion,
  Promotion,
  PromotionCategory,
  PromotionStatus,
} from "@/lib/types";
import { getPublicSupabaseClient } from "@/lib/supabase/publicClient";
import { getAdminSupabaseClient } from "@/lib/supabase/adminClient";

interface PromotionRow {
  id: string;
  category: PromotionCategory;
  title: string;
  content: string;
  author: string;
  link: string | null;
  image_src: string | null;
  storage_path: string | null;
  status: PromotionStatus;
  created_at: string;
}

function rowToPromotion(row: PromotionRow): Promotion {
  return {
    id: row.id,
    category: row.category,
    title: row.title,
    content: row.content,
    author: row.author,
    link: row.link ?? undefined,
    imageSrc: row.image_src ?? undefined,
    createdAt: row.created_at,
  };
}

interface SubmitterRow {
  promotion_id: string;
  phone: string | null;
  info: string | null;
}

function rowToAdminPromotion(
  row: PromotionRow,
  submitter?: SubmitterRow
): AdminPromotion {
  return {
    ...rowToPromotion(row),
    status: row.status,
    storagePath: row.storage_path,
    submitterPhone: submitter?.phone ?? undefined,
    submitterInfo: submitter?.info ?? undefined,
  };
}

/**
 * 승인된 홍보 게시물만 최신순으로 가져옵니다. (사이트 방문자용)
 * Supabase 환경변수가 없으면 빈 배열을 반환합니다.
 */
export async function getAllPromotions(): Promise<Promotion[]> {
  const supabase = getPublicSupabaseClient();
  if (!supabase) return [];

  const { data, error } = await supabase
    .from("promotions")
    .select("*")
    .eq("status", "approved")
    .order("created_at", { ascending: false });

  if (error) {
    console.error("[getAllPromotions] Supabase 조회 실패:", error.message);
    return [];
  }

  return (data as PromotionRow[]).map(rowToPromotion);
}

/**
 * 승인 대기/승인된 홍보 게시물을 모두 가져옵니다. (관리자 페이지용, Service Role Key 사용)
 * 승인 대기 중인 게시물이 먼저 오도록 정렬합니다.
 */
export async function getAllPromotionsForAdmin(): Promise<AdminPromotion[]> {
  const supabase = getAdminSupabaseClient();

  const { data, error } = await supabase
    .from("promotions")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    console.error("[getAllPromotionsForAdmin] Supabase 조회 실패:", error.message);
    return [];
  }

  // 선택 입력된 연락처/신상은 별도 테이블에 있습니다. 아직 테이블이 없거나 조회가
  // 실패해도 목록 자체는 보이도록, 실패하면 연락처만 비워둡니다.
  const { data: submitters, error: submittersError } = await supabase
    .from("promotion_submitters")
    .select("promotion_id, phone, info");
  if (submittersError) {
    console.error(
      "[getAllPromotionsForAdmin] 업로더 정보 조회 실패:",
      submittersError.message
    );
  }
  const submitterById = new Map(
    ((submitters ?? []) as SubmitterRow[]).map((s) => [s.promotion_id, s])
  );

  const rows = (data as PromotionRow[]).map((row) =>
    rowToAdminPromotion(row, submitterById.get(row.id))
  );
  return rows.sort((a, b) => {
    if (a.status === b.status) return 0;
    return a.status === "pending" ? -1 : 1;
  });
}
