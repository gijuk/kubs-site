import "server-only";
import { createClient } from "@supabase/supabase-js";

/**
 * 서버 전용 클라이언트 — Service Role Key를 사용해 RLS를 우회합니다.
 * 절대 클라이언트 컴포넌트나 브라우저로 값을 전달하지 마세요.
 * 관리자 페이지의 등록/수정/삭제 서버 액션에서만 사용합니다.
 */
export function getAdminSupabaseClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceRoleKey) {
    throw new Error(
      "Supabase 서버 환경변수(NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)가 설정되지 않았습니다. .env.local을 확인하세요."
    );
  }

  return createClient(url, serviceRoleKey, {
    auth: { persistSession: false },
  });
}
