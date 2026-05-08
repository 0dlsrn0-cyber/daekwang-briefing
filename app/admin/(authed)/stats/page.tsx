import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { MODEL_LABELS } from "@/lib/ai";
import type { AiModel } from "@/lib/types";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

interface RunRow {
  ai_model: AiModel;
  status: string;
  duration_ms: number | null;
  created_at: string;
}

interface NewsRow {
  url_hash: string;
  title: string;
  category: string;
  created_at: string;
}

interface ModelStat {
  ai_model: AiModel;
  runs: number;
  ok: number;
  partial: number;
  failed: number;
  running: number;
  avgMs: number | null;
}

interface DailyStat {
  day: string;
  runs: number;
  ok: number;
}

interface NewsTopRow {
  url_hash: string;
  title: string;
  category: string;
  appearances: number;
  lastSeen: string;
}

function formatKstDay(iso: string): string {
  const kst = new Date(new Date(iso).getTime() + 9 * 60 * 60 * 1000);
  return kst.toISOString().substring(0, 10);
}

export default async function StatsPage() {
  let modelStats: ModelStat[] = [];
  let daily: DailyStat[] = [];
  let newsTop: NewsTopRow[] = [];
  let runsCount = 0;
  let error: string | null = null;

  try {
    const supabase = getSupabaseAdmin();
    const [runsRes, newsRes] = await Promise.all([
      supabase
        .from("briefing_runs")
        .select("ai_model, status, duration_ms, created_at")
        .order("created_at", { ascending: false })
        .limit(2000),
      supabase
        .from("news_items")
        .select("url_hash, title, category, created_at")
        .order("created_at", { ascending: false })
        .limit(10000),
    ]);
    if (runsRes.error) throw runsRes.error;
    if (newsRes.error) throw newsRes.error;

    const runs = (runsRes.data ?? []) as RunRow[];
    const news = (newsRes.data ?? []) as NewsRow[];
    runsCount = runs.length;

    const byModel = new Map<AiModel, ModelStat>();
    for (const r of runs) {
      let s = byModel.get(r.ai_model);
      if (!s) {
        s = {
          ai_model: r.ai_model,
          runs: 0,
          ok: 0,
          partial: 0,
          failed: 0,
          running: 0,
          avgMs: null,
        };
        byModel.set(r.ai_model, s);
      }
      s.runs++;
      if (r.status === "success") s.ok++;
      else if (r.status === "partial") s.partial++;
      else if (r.status === "failed") s.failed++;
      else if (r.status === "running") s.running++;
    }
    for (const s of byModel.values()) {
      const samples = runs.filter(
        (r) =>
          r.ai_model === s.ai_model && r.status === "success" && r.duration_ms,
      );
      if (samples.length > 0) {
        const sum = samples.reduce(
          (acc, r) => acc + (r.duration_ms ?? 0),
          0,
        );
        s.avgMs = Math.round(sum / samples.length);
      }
    }
    modelStats = Array.from(byModel.values()).sort((a, b) => b.runs - a.runs);

    const dayMap = new Map<string, DailyStat>();
    for (const r of runs) {
      const day = formatKstDay(r.created_at);
      let d = dayMap.get(day);
      if (!d) {
        d = { day, runs: 0, ok: 0 };
        dayMap.set(day, d);
      }
      d.runs++;
      if (r.status === "success") d.ok++;
    }
    daily = Array.from(dayMap.values())
      .sort((a, b) => b.day.localeCompare(a.day))
      .slice(0, 30)
      .reverse();

    const newsMap = new Map<string, NewsTopRow>();
    for (const n of news) {
      let entry = newsMap.get(n.url_hash);
      if (!entry) {
        entry = {
          url_hash: n.url_hash,
          title: n.title,
          category: n.category,
          appearances: 0,
          lastSeen: n.created_at,
        };
        newsMap.set(n.url_hash, entry);
      }
      entry.appearances++;
      if (n.created_at > entry.lastSeen) entry.lastSeen = n.created_at;
    }
    newsTop = Array.from(newsMap.values())
      .filter((e) => e.appearances >= 2)
      .sort((a, b) => b.appearances - a.appearances)
      .slice(0, 20);
  } catch (e) {
    error = (e as Error).message;
  }

  const maxDailyRuns = Math.max(1, ...daily.map((d) => d.runs));

  return (
    <div className="page-wrapper">
      <header className="site-header">
        <div className="brand-badge">ADMIN</div>
        <h1>
          통계 <span>대시보드</span>
        </h1>
        <p className="subtitle">
          전체 실행 {runsCount}건 기준 (모델·일자·뉴스 중복)
        </p>
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
          <div className="icon">🤖</div>
          <div>
            <h2>모델별 실행 / 성공률 / 평균 시간</h2>
            <p>success 만 평균 시간 집계</p>
          </div>
        </div>
        <div className="card-body">
          {modelStats.length === 0 ? (
            <div className="empty-state">데이터 없음</div>
          ) : (
            <table className="records-table">
              <thead>
                <tr>
                  <th>모델</th>
                  <th className="num">실행</th>
                  <th className="num">성공</th>
                  <th className="num">부분</th>
                  <th className="num">실패</th>
                  <th className="num">진행중</th>
                  <th className="num">성공률</th>
                  <th className="num">평균(s)</th>
                </tr>
              </thead>
              <tbody>
                {modelStats.map((s) => {
                  const rate = s.runs > 0 ? (s.ok / s.runs) * 100 : 0;
                  return (
                    <tr key={s.ai_model}>
                      <td>{MODEL_LABELS[s.ai_model] ?? s.ai_model}</td>
                      <td className="num">{s.runs}</td>
                      <td className="num">{s.ok}</td>
                      <td className="num">{s.partial}</td>
                      <td className="num">{s.failed}</td>
                      <td className="num">{s.running}</td>
                      <td className="num">{rate.toFixed(0)}%</td>
                      <td className="num">
                        {s.avgMs ? (s.avgMs / 1000).toFixed(1) : "-"}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>

      <div className="card">
        <div className="card-header">
          <div className="icon">📅</div>
          <div>
            <h2>일자별 실행 추이</h2>
            <p>최근 30일</p>
          </div>
        </div>
        <div className="card-body">
          {daily.length === 0 ? (
            <div className="empty-state">데이터 없음</div>
          ) : (
            <div className="bar-chart">
              {daily.map((d) => (
                <div className="bar-row" key={d.day}>
                  <div className="bar-label mono">{d.day}</div>
                  <div className="bar-track">
                    <div
                      className="bar-fill"
                      style={{
                        width: `${(d.runs / maxDailyRuns) * 100}%`,
                      }}
                    />
                  </div>
                  <div className="bar-value">
                    {d.runs} <span className="muted">({d.ok} ✓)</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="card">
        <div className="card-header">
          <div className="icon">🔁</div>
          <div>
            <h2>반복 등장 뉴스 TOP 20</h2>
            <p>같은 url_hash 가 2회 이상 잡힌 기사</p>
          </div>
        </div>
        <div className="card-body">
          {newsTop.length === 0 ? (
            <div className="empty-state">
              아직 중복 등장한 기사가 없습니다 (최소 2회 이상 노출 필요).
            </div>
          ) : (
            <table className="records-table">
              <thead>
                <tr>
                  <th className="num">#</th>
                  <th>카테고리</th>
                  <th>제목</th>
                  <th className="num">노출</th>
                  <th className="num">마지막</th>
                </tr>
              </thead>
              <tbody>
                {newsTop.map((n, i) => (
                  <tr key={n.url_hash}>
                    <td className="num">{i + 1}</td>
                    <td>
                      <span className="cat-pill">{n.category}</span>
                    </td>
                    <td className="truncate-2" title={n.title}>
                      {n.title}
                    </td>
                    <td className="num">{n.appearances}</td>
                    <td className="num mono">{formatKstDay(n.lastSeen)}</td>
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
