import { createClient } from "@supabase/supabase-js";

/**
 * 공개(anon key) 클라이언트 — 누구나 조회 가능한 데이터를 읽을 때 사용합니다.
 * 서버 컴포넌트에서 일정을 조회할 때 이 클라이언트를 씁니다.
 *
 * 환경변수가 설정되지 않은 경우(로컬에서 아직 Supabase 연동 전)에는
 * null을 반환하고, 호출부에서 mock 데이터로 대체합니다.
 */
export function getPublicSupabaseClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !anonKey) {
    return null;
  }

  return createClient(url, anonKey, {
    auth: { persistSession: false },
  });
}
