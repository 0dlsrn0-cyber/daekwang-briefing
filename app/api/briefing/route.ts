import { NextResponse, type NextRequest } from "next/server";
import { cookies } from "next/headers";
import { createHash } from "node:crypto";
import { fetchAllNews } from "@/lib/news";
import { fetchAllRates } from "@/lib/ecos";
import { callAiAnalysis } from "@/lib/ai";
import { extractConclusions } from "@/lib/ai/prompt";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import type {
  AiModel,
  BriefingParams,
  BriefingResult,
  RateData,
} from "@/lib/types";

export const runtime = "nodejs";
export const maxDuration = 300;

function hashUrl(url: string): string {
  return createHash("sha256").update(url).digest("hex");
}

async function logSafely(label: string, fn: () => unknown) {
  try {
    await fn();
  } catch (e) {
    console.error(`[supabase] ${label} 실패:`, e);
  }
}

export async function POST(request: NextRequest) {
  let params: BriefingParams;
  try {
    params = await request.json();
  } catch {
    return NextResponse.json(
      { success: false, error: "잘못된 요청 본문" },
      { status: 400 },
    );
  }

  const aiKey = (params.aiKey || "").trim();
  const aiModel: AiModel = params.aiModel || "gemini";
  const focusPoint = params.focusPoint?.trim() || "";
  const ecosKey = params.ecosKey?.trim() || "";

  if (!aiKey) {
    return NextResponse.json({
      success: false,
      error: "AI API 키가 입력되지 않았습니다.",
    });
  }

  const startTime = Date.now();

  let supabase: ReturnType<typeof getSupabaseAdmin> | null = null;
  try {
    supabase = getSupabaseAdmin();
  } catch (e) {
    console.error("[supabase] init 실패:", e);
  }

  const sessionId =
    (await cookies()).get("session_id")?.value ?? null;

  // 실행 시작 행 INSERT
  let runId: string | null = null;
  if (supabase) {
    try {
      const { data, error } = await supabase
        .from("briefing_runs")
        .insert({
          session_id: sessionId,
          ai_model: aiModel,
          focus_point: focusPoint || null,
          ecos_used: !!ecosKey,
          status: "running",
        })
        .select("id")
        .single();
      if (error) throw error;
      runId = (data as { id: string } | null)?.id ?? null;
    } catch (e) {
      console.error("[supabase] briefing_runs insert 실패:", e);
    }
  }

  async function markRun(status: string, errorMessage: string | null) {
    if (!supabase || !runId) return;
    await logSafely("briefing_runs update", () =>
      supabase!
        .from("briefing_runs")
        .update({
          status,
          error_message: errorMessage,
          duration_ms: Date.now() - startTime,
        })
        .eq("id", runId!),
    );
  }

  try {
    const newsResult = await fetchAllNews();
    if (!newsResult.success || newsResult.news.length === 0) {
      await markRun("failed", "뉴스 수집 실패 또는 오늘 기사 없음");
      return NextResponse.json({
        success: false,
        error: "뉴스 수집 실패 또는 오늘 기사 없음",
      });
    }

    let rateData: RateData | null = null;
    if (ecosKey) {
      try {
        rateData = await fetchAllRates(ecosKey);
      } catch (e) {
        rateData = {
          success: false,
          rates: {},
          trends: {},
          errors: [(e as Error).message],
        };
      }
    }

    let previousSummary: string | null = null;
    if (supabase) {
      try {
        const { data } = await supabase
          .from("reports")
          .select("conclusions_3lines")
          .not("conclusions_3lines", "is", null)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();
        previousSummary =
          (data as { conclusions_3lines: string | null } | null)
            ?.conclusions_3lines ?? null;
      } catch (e) {
        console.error("[supabase] previous conclusions fetch 실패:", e);
      }
    }

    let aiReport = "";
    let aiFailed = false;
    let aiError: string | null = null;
    try {
      aiReport = await callAiAnalysis(
        aiKey,
        aiModel,
        newsResult.news,
        focusPoint,
        rateData,
        previousSummary,
      );
    } catch (apiErr) {
      aiFailed = true;
      aiError = (apiErr as Error).message;
      aiReport =
        "## [안내] AI 서버 과부하로 인한 분석 일시 지연\n\n" +
        "수집된 뉴스와 금리 데이터를 먼저 확인해 주세요.\n\n" +
        `*오류: ${aiError}*`;
    }

    // DB 기록 (실패해도 응답은 그대로 반환)
    if (supabase && runId) {
      const rid = runId;
      const newsRows = newsResult.news.map((n) => ({
        run_id: rid,
        category: n.category,
        title: n.title,
        url: n.link,
        url_hash: hashUrl(n.link),
        pub_date: n.pubDate || null,
      }));
      await logSafely("news_items insert", () =>
        supabase!.from("news_items").insert(newsRows),
      );
      const conclusions = aiFailed ? null : extractConclusions(aiReport);
      await logSafely("reports insert", () =>
        supabase!.from("reports").insert({
          run_id: rid,
          ai_report: aiReport,
          rate_snapshot: rateData ?? null,
          news_count: newsResult.news.length,
          conclusions_3lines: conclusions,
        }),
      );
      await markRun(aiFailed ? "partial" : "success", aiError);
    }

    const ts = new Date(Date.now() + 9 * 60 * 60 * 1000)
      .toISOString()
      .replace("T", " ")
      .substring(0, 16);

    const result: BriefingResult = {
      success: true,
      news: newsResult.news,
      aiReport,
      ts,
      newsCount: newsResult.news.length,
      focusPoint,
      rateData,
      aiModel,
      runId: runId ?? undefined,
    };

    return NextResponse.json(result);
  } catch (err) {
    await markRun("failed", (err as Error).message);
    return NextResponse.json({
      success: false,
      error: (err as Error).message,
    });
  }
}
