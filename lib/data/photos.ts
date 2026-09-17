import type { AdminPhoto, Photo, PhotoStatus } from "@/lib/types";
import { photos as mockPhotos } from "@/lib/mock-data";
import { getPublicSupabaseClient } from "@/lib/supabase/publicClient";
import { getAdminSupabaseClient } from "@/lib/supabase/adminClient";

interface PhotoRow {
  id: string;
  src: string;
  date: string;
  event_name: string;
  photographer: string;
  alt: string;
  status: PhotoStatus;
  storage_path: string | null;
}

function rowToPhoto(row: PhotoRow): Photo {
  return {
    id: row.id,
    src: row.src,
    date: row.date,
    eventName: row.event_name,
    photographer: row.photographer,
    alt: row.alt,
  };
}

function rowToAdminPhoto(row: PhotoRow): AdminPhoto {
  return {
    ...rowToPhoto(row),
    status: row.status,
    storagePath: row.storage_path,
  };
}

/**
 * 승인된 사진만 최신 업로드순으로 가져옵니다. (사이트 방문자용)
 * Supabase 환경변수가 아직 설정되지 않았다면 mock 데이터로 대체합니다.
 */
export async function getAllPhotos(): Promise<Photo[]> {
  const supabase = getPublicSupabaseClient();

  if (!supabase) {
    return mockPhotos;
  }

  const { data, error } = await supabase
    .from("photos")
    .select("*")
    .eq("status", "approved")
    .order("created_at", { ascending: false });

  if (error) {
    console.error("[getAllPhotos] Supabase 조회 실패:", error.message);
    return mockPhotos;
  }

  return (data as PhotoRow[]).map(rowToPhoto);
}

/**
 * 승인 대기/승인된 사진을 모두 가져옵니다. (관리자 페이지용, Service Role Key 사용)
 * 승인 대기 중인 사진이 먼저 오도록 정렬합니다.
 */
export async function getAllPhotosForAdmin(): Promise<AdminPhoto[]> {
  const supabase = getAdminSupabaseClient();

  const { data, error } = await supabase
    .from("photos")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    console.error("[getAllPhotosForAdmin] Supabase 조회 실패:", error.message);
    return [];
  }

  // 안정 정렬(stable sort)을 이용해 created_at desc 순서는 유지한 채
  // 승인 대기(pending) 항목만 앞으로 끌어올립니다.
  const rows = (data as PhotoRow[]).map(rowToAdminPhoto);
  return rows.sort((a, b) => {
    if (a.status === b.status) return 0;
    return a.status === "pending" ? -1 : 1;
  });
}
