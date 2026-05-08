import { notFound } from "next/navigation";
import Link from "next/link";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { MODEL_LABELS } from "@/lib/ai";
import EcosDashboard from "@/components/EcosDashboard";
import NewsTabs from "@/components/NewsTabs";
import ReportSections from "@/components/ReportSections";
import type { AiModel, NewsItem, RateData } from "@/lib/types";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

interface RunRow {
  id: string;
  session_id: string | null;
  created_at: string;
  ai_model: AiModel;
  focus_point: string | null;
  ecos_used: boolean;
  status: string;
  error_message: string | null;
  duration_ms: number | null;
}

interface ReportRow {
  ai_report: string;
  rate_snapshot: RateData | null;
  news_count: number;
  created_at: string;
}

interface NewsRow {
  category: string;
  title: string;
  url: string;
  pub_date: string | null;
}

interface EmailRow {
  id: string;
  recipients: string[] | null;
  sender_name: string | null;
  status: string;
  error_message: string | null;
  sent_at: string;
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

export default async function HistoryDetailPage({
  params,
}: {
  params: Promise<{ runId: string }>;
}) {
  const { runId } = await params;
  const supabase = getSupabaseAdmin();

  const [runRes, reportRes, newsRes, emailsRes] = await Promise.all([
    supabase
      .from("briefing_runs")
      .select(
        "id, session_id, created_at, ai_model, focus_point, ecos_used, status, error_message, duration_ms",
      )
      .eq("id", runId)
      .maybeSingle(),
    supabase
      .from("reports")
      .select("ai_report, rate_snapshot, news_count, created_at")
      .eq("run_id", runId)
      .maybeSingle(),
    supabase
      .from("news_items")
      .select("category, title, url, pub_date")
      .eq("run_id", runId)
      .order("category"),
    supabase
      .from("email_sends")
      .select("id, recipients, sender_name, status, error_message, sent_at")
      .eq("run_id", runId)
      .order("sent_at", { ascending: false }),
  ]);

  const run = runRes.data as RunRow | null;
  if (!run) notFound();
  const report = reportRes.data as ReportRow | null;
  const newsRows = (newsRes.data ?? []) as NewsRow[];
  const emails = (emailsRes.data ?? []) as EmailRow[];

  const newsItems: NewsItem[] = newsRows.map((n) => ({
    category: n.category,
    title: n.title,
    link: n.url,
    pubDate: n.pub_date ?? "",
  }));

  return (
    <div className="page-wrapper">
      <header className="site-header">
        <div className="brand-badge">ADMIN</div>
        <h1>
          기록 <span>상세</span>
        </h1>
        <p className="subtitle">
          <Link href="/admin/history" className="link-inline">
            ← 목록으로
          </Link>
        </p>
      </header>

      <div className="card">
        <div className="card-header">
          <div className="icon">🧾</div>
          <div>
            <h2>실행 메타</h2>
            <p>{formatKst(run.created_at)} (KST)</p>
          </div>
        </div>
        <div className="card-body">
          <div className="result-meta">
            <div className="kpi">
              <div className="kpi-label">상태</div>
              <div className="kpi-value">
                <StatusBadge status={run.status} />
              </div>
            </div>
            <div className="kpi">
              <div className="kpi-label">AI ENGINE</div>
              <div className="kpi-value" style={{ fontSize: 12 }}>
                {MODEL_LABELS[run.ai_model] ?? run.ai_model}
              </div>
            </div>
            <div className="kpi">
              <div className="kpi-label">소요시간</div>
              <div className="kpi-value">
                {run.duration_ms
                  ? `${(run.duration_ms / 1000).toFixed(1)} s`
                  : "-"}
              </div>
            </div>
          </div>
          {run.focus_point && (
            <div className="meta-line">
              <span className="meta-label">중점 분석:</span> {run.focus_point}
            </div>
          )}
          {run.error_message && (
            <div className="alert">{run.error_message}</div>
          )}
          {run.session_id && (
            <div className="meta-line muted-line">
              <span className="meta-label">세션:</span>{" "}
              <code>{run.session_id.substring(0, 8)}…</code>
            </div>
          )}
        </div>
      </div>

      {report && (
        <div className="card">
          <div className="card-header">
            <div className="icon">📊</div>
            <div>
              <h2>AI 보고서</h2>
              <p>뉴스 {report.news_count}건 분석</p>
            </div>
          </div>
          <div className="card-body">
            <ReportSections aiReport={report.ai_report} />

            {report.rate_snapshot?.success && (
              <EcosDashboard rateData={report.rate_snapshot} />
            )}

            {newsItems.length > 0 && <NewsTabs news={newsItems} />}
          </div>
        </div>
      )}

      {!report && (
        <div className="card">
          <div className="card-body">
            <div className="empty-state">
              이 실행에는 보고서가 저장되지 않았습니다 (실패 또는 진행중).
            </div>
          </div>
        </div>
      )}

      <div className="card">
        <div className="card-header">
          <div className="icon">📧</div>
          <div>
            <h2>메일 발송 이력</h2>
            <p>{emails.length}건</p>
          </div>
        </div>
        <div className="card-body">
          {emails.length === 0 && (
            <div className="empty-state">발송 이력 없음</div>
          )}
          {emails.length > 0 && (
            <table className="records-table">
              <thead>
                <tr>
                  <th>시각 (KST)</th>
                  <th>발신자</th>
                  <th>수신자</th>
                  <th>상태</th>
                  <th>오류</th>
                </tr>
              </thead>
              <tbody>
                {emails.map((e) => (
                  <tr key={e.id}>
                    <td className="mono">{formatKst(e.sent_at)}</td>
                    <td>{e.sender_name ?? "-"}</td>
                    <td>{(e.recipients ?? []).join(", ")}</td>
                    <td>
                      <StatusBadge status={e.status} />
                    </td>
                    <td className="truncate" title={e.error_message ?? ""}>
                      {e.error_message ?? ""}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
