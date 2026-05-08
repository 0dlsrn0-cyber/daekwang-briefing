import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

// 10분 넘게 'running' 상태로 고착된 행 검출
// curl http://localhost:3000/api/health/stale-runs

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const minutes = Math.max(
    1,
    parseInt(url.searchParams.get("minutes") ?? "10", 10),
  );

  try {
    const supabase = getSupabaseAdmin();
    const cutoff = new Date(Date.now() - minutes * 60 * 1000).toISOString();
    const { data, error } = await supabase
      .from("briefing_runs")
      .select("id, ai_model, focus_point, created_at")
      .eq("status", "running")
      .lt("created_at", cutoff)
      .order("created_at", { ascending: true });
    if (error) throw error;

    const stale = data ?? [];
    return NextResponse.json({
      stale_count: stale.length,
      threshold_minutes: minutes,
      stale,
    });
  } catch (e) {
    return NextResponse.json(
      { error: (e as Error).message },
      { status: 500 },
    );
  }
}
