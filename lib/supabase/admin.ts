import { createClient, type SupabaseClient } from "@supabase/supabase-js";

// 브리핑 테이블은 daekwang-sso 프로젝트의 briefing 스키마에 위치.
// (Database 타입을 any 로 두는 구조라 schema 제네릭만 briefing 으로 명시)
type AdminClient = SupabaseClient<any, any, "briefing", any, any>;

let cached: AdminClient | null = null;

export function getSupabaseAdmin(): AdminClient {
  if (cached) return cached;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error(
      "Supabase 환경변수 누락 (NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)",
    );
  }
  cached = createClient(url, key, {
    db: { schema: "briefing" },
    auth: { persistSession: false, autoRefreshToken: false },
  });
  return cached;
}
