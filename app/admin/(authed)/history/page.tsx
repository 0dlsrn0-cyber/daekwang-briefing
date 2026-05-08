import Link from "next/link";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { MODEL_LABELS } from "@/lib/ai";
import type { AiModel } from "@/lib/types";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

interface RunRow {
  id: string;
  created_at: string;
  ai_model: AiModel;
  focus_point: string | null;
  status: string;
  duration_ms: number | null;
  ecos_used: boolean;
}

function formatKst(iso: string): string {
  const kst = new Date(new Date(iso).getTime() + 9 * 60 * 60 * 1000);
  return kst.toISOString().replace("T", " ").substring(0, 16);
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    success: "badge-ok",
    partial: "badge-warn",
    failed: "badge-err",
    running: "badge-run",
  };
  const label =
    {
      success: "성공",
      partial: "부분",
      failed: "실패",
      running: "진행중",
    }[status] ?? status;
  return (
    <span className={`badge ${map[status] ?? "badge-default"}`}>{label}</span>
  );
}

export default async function HistoryPage() {
  let runs: RunRow[] = [];
  const reportNewsCount = new Map<string, number>();
  const emailCount = new Map<string, number>();
  let error: string | null = null;

  try {
    const supabase = getSupabaseAdmin();
    const { data: runRows, error: runErr } = await supabase
      .from("briefing_runs")
      .select(
        "id, created_at, ai_model, focus_point, status, duration_ms, ecos_used",
      )
      .order("created_at", { ascending: false })
      .limit(50);
    if (runErr) throw runErr;
    runs = (runRows ?? []) as RunRow[];

    if (runs.length > 0) {
      const ids = runs.map((r) => r.id);
      const [reportsRes, emailsRes] = await Promise.all([
        supabase.from("reports").select("run_id, news_count").in("run_id", ids),
        supabase.from("email_sends").select("run_id").in("run_id", ids),
      ]);
      for (const r of (reportsRes.data ?? []) as {
        run_id: string;
        news_count: number;
      }[]) {
        reportNewsCount.set(r.run_id, r.news_count);
      }
      for (const e of (emailsRes.data ?? []) as { run_id: string }[]) {
        emailCount.set(e.run_id, (emailCount.get(e.run_id) ?? 0) + 1);
      }
    }
  } catch (e) {
    error = (e as Error).message;
  }

  return (
    <div className="page-wrapper">
      <header className="site-header">
        <div className="brand-badge">ADMIN</div>
        <h1>
          분석 <span>기록</span>
        </h1>
        <p className="subtitle">과거 브리핑 실행 / 보고서 / 메일 발송 이력</p>
      </header>

      <div className="card">
        <div className="card-header">
          <div className="icon">📚</div>
          <div>
            <h2>최근 50건</h2>
            <p>최신순 정렬</p>
          </div>
        </div>
        <div className="card-body">
          {error && <div className="alert">{error}</div>}
          {!error && runs.length === 0 && (
            <div className="empty-state">
              아직 기록이 없습니다.{" "}
              <Link href="/" className="link-inline">
                홈
              </Link>
              에서 브리핑을 한 번 실행해 보세요.
            </div>
          )}
          {runs.length > 0 && (
            <div className="records-wrap">
              <table className="records-table">
                <thead>
                  <tr>
                    <th>실행 시각 (KST)</th>
                    <th>모델</th>
                    <th>상태</th>
                    <th className="num">뉴스</th>
                    <th className="num">소요</th>
                    <th className="center">ECOS</th>
                    <th className="num">메일</th>
                    <th>중점</th>
                    <th className="center"></th>
                  </tr>
                </thead>
                <tbody>
                  {runs.map((r) => (
                    <tr key={r.id}>
                      <td className="mono">{formatKst(r.created_at)}</td>
                      <td>{MODEL_LABELS[r.ai_model] ?? r.ai_model}</td>
                      <td>
                        <StatusBadge status={r.status} />
                      </td>
                      <td className="num">
                        {reportNewsCount.get(r.id) ?? "-"}
                      </td>
                      <td className="num">
                        {r.duration_ms
                          ? `${(r.duration_ms / 1000).toFixed(1)}s`
                          : "-"}
                      </td>
                      <td className="center">{r.ecos_used ? "✓" : ""}</td>
                      <td className="num">{emailCount.get(r.id) ?? 0}</td>
                      <td className="truncate" title={r.focus_point ?? ""}>
                        {r.focus_point ?? ""}
                      </td>
                      <td className="center">
                        <Link
                          className="link-inline"
                          href={`/admin/history/${r.id}`}
                        >
                          보기 →
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
