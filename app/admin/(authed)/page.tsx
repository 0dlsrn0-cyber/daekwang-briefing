import Link from "next/link";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

interface RunRow {
  ai_model: string;
  status: string;
  created_at: string;
}

interface EmailRow {
  status: string;
}

function formatKst(iso: string): string {
  const kst = new Date(new Date(iso).getTime() + 9 * 60 * 60 * 1000);
  return kst.toISOString().replace("T", " ").substring(0, 16);
}

export default async function AdminDashboardPage() {
  let totalRuns = 0;
  let last7d = 0;
  let successRate = 0;
  let totalEmails = 0;
  let topModel: { model: string; count: number } | null = null;
  let recentRuns: { id: string; ai_model: string; status: string; created_at: string }[] = [];
  let staleCount = 0;
  let error: string | null = null;

  try {
    const supabase = getSupabaseAdmin();
    const sevenDaysAgo = new Date(
      Date.now() - 7 * 24 * 60 * 60 * 1000,
    ).toISOString();
    const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000).toISOString();

    const [
      runsRes,
      emailsRes,
      recent7Res,
      recentListRes,
      staleRes,
    ] = await Promise.all([
      supabase
        .from("briefing_runs")
        .select("ai_model, status, created_at"),
      supabase.from("email_sends").select("status"),
      supabase
        .from("briefing_runs")
        .select("ai_model, status, created_at")
        .gte("created_at", sevenDaysAgo),
      supabase
        .from("briefing_runs")
        .select("id, ai_model, status, created_at")
        .order("created_at", { ascending: false })
        .limit(5),
      supabase
        .from("briefing_runs")
        .select("id", { count: "exact", head: true })
        .eq("status", "running")
        .lt("created_at", tenMinutesAgo),
    ]);

    if (runsRes.error) throw runsRes.error;
    const runs = (runsRes.data ?? []) as RunRow[];
    totalRuns = runs.length;
    const successCount = runs.filter((r) => r.status === "success").length;
    successRate = totalRuns > 0 ? (successCount / totalRuns) * 100 : 0;

    const recent7 = (recent7Res.data ?? []) as RunRow[];
    last7d = recent7.length;

    const emails = (emailsRes.data ?? []) as EmailRow[];
    totalEmails = emails.length;

    // 가장 많이 쓴 모델
    const modelCount = new Map<string, number>();
    for (const r of runs) {
      modelCount.set(r.ai_model, (modelCount.get(r.ai_model) ?? 0) + 1);
    }
    let max = 0;
    for (const [model, count] of modelCount) {
      if (count > max) {
        max = count;
        topModel = { model, count };
      }
    }

    recentRuns = (recentListRes.data ?? []) as typeof recentRuns;
    staleCount = staleRes.count ?? 0;
  } catch (e) {
    error = (e as Error).message;
  }

  return (
    <div className="page-wrapper">
      <header className="site-header">
        <div className="brand-badge">ADMIN</div>
        <h1>
          관리자 <span>대시보드</span>
        </h1>
        <p className="subtitle">전체 기록 요약</p>
      </header>

      {error && (
        <div className="card">
          <div className="card-body">
            <div className="alert">{error}</div>
          </div>
        </div>
      )}

      <div className="card">
        <div className="card-header">
          <div className="icon">📈</div>
          <div>
            <h2>핵심 지표</h2>
            <p>실시간 (DB 직접 집계)</p>
          </div>
        </div>
        <div className="card-body">
          <div className="kpi-grid">
            <div className="kpi-big">
              <div className="kpi-label">총 실행</div>
              <div className="kpi-value-big">{totalRuns}</div>
            </div>
            <div className="kpi-big">
              <div className="kpi-label">최근 7일</div>
              <div className="kpi-value-big">{last7d}</div>
            </div>
            <div className="kpi-big">
              <div className="kpi-label">성공률</div>
              <div className="kpi-value-big">
                {successRate.toFixed(0)}
                <span className="kpi-unit">%</span>
              </div>
            </div>
            <div className="kpi-big">
              <div className="kpi-label">메일 발송</div>
              <div className="kpi-value-big">{totalEmails}</div>
            </div>
            <div className="kpi-big">
              <div className="kpi-label">최다 모델</div>
              <div className="kpi-value-big" style={{ fontSize: 16 }}>
                {topModel ? `${topModel.model} (${topModel.count})` : "-"}
              </div>
            </div>
            <div className={`kpi-big ${staleCount > 0 ? "kpi-warn" : ""}`}>
              <div className="kpi-label">stale 실행</div>
              <div className="kpi-value-big">{staleCount}</div>
            </div>
          </div>
        </div>
      </div>

      <div className="card">
        <div className="card-header">
          <div className="icon">🕒</div>
          <div>
            <h2>최근 실행</h2>
            <p>최신 5건</p>
          </div>
        </div>
        <div className="card-body">
          {recentRuns.length === 0 ? (
            <div className="empty-state">기록 없음</div>
          ) : (
            <ul className="recent-list">
              {recentRuns.map((r) => (
                <li key={r.id}>
                  <Link href={`/admin/history/${r.id}`} className="recent-link">
                    <span className="recent-date">{formatKst(r.created_at)}</span>
                    <span className="recent-model">{r.ai_model}</span>
                    <span className={`badge badge-${
                      r.status === "success"
                        ? "ok"
                        : r.status === "partial"
                          ? "warn"
                          : r.status === "failed"
                            ? "err"
                            : "run"
                    }`}>
                      {r.status}
                    </span>
                    <span className="recent-arrow">→</span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
          <div className="action-bar">
            <Link href="/admin/history" className="btn btn-secondary">
              전체 기록 보기
            </Link>
            <Link href="/admin/stats" className="btn btn-secondary">
              통계 대시보드
            </Link>
            <Link href="/admin/settings" className="btn btn-secondary">
              접근키 설정
            </Link>
            <Link
              href="/api/health/stale-runs"
              className="btn btn-secondary"
              target="_blank"
            >
              헬스체크 JSON
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
