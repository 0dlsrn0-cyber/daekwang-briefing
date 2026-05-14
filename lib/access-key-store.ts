// Supabase 의존 — Node 런타임 라우트 전용 (Edge 미들웨어에서 import 금지)
import { getSupabaseAdmin } from "./supabase/admin";

export async function getStoredAccessKey(): Promise<string> {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("app_settings")
    .select("value")
    .eq("key", "access_key")
    .maybeSingle();
  if (error) throw error;
  if (data?.value) return data.value as string;
  // 시드 누락 시 안전한 fallback (env > 기본값)
  return process.env.ACCESS_KEY_DEFAULT ?? "880831";
}

export async function setStoredAccessKey(
  newKey: string,
  updatedBy: string | null,
): Promise<void> {
  const supabase = getSupabaseAdmin();
  const { error } = await supabase.from("app_settings").upsert(
    {
      key: "access_key",
      value: newKey,
      updated_by: updatedBy,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "key" },
  );
  if (error) throw error;
}
