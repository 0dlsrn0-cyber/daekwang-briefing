import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { fetchAllNews } from "@/lib/news";
import { fetchAllRates } from "@/lib/ecos";
import { callAiAnalysis } from "@/lib/ai";
import type {
  AiModel,
  BriefingParams,
  BriefingResult,
  RateData,
} from "@/lib/types";

export const runtime = "nodejs";
export const maxDuration = 300;

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ success: false, error: "인증 필요" }, { status: 401 });

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

  try {
    const newsResult = await fetchAllNews();
    if (!newsResult.success || newsResult.news.length === 0) {
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

    let aiReport = "";
    try {
      aiReport = await callAiAnalysis(
        aiKey,
        aiModel,
        newsResult.news,
        focusPoint,
        rateData,
      );
    } catch (apiErr) {
      aiReport =
        "## [안내] AI 서버 과부하로 인한 분석 일시 지연\n\n" +
        "수집된 뉴스와 금리 데이터를 먼저 확인해 주세요.\n\n" +
        `*오류: ${(apiErr as Error).message}*`;
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
    };

    return NextResponse.json(result);
  } catch (err) {
    return NextResponse.json({
      success: false,
      error: (err as Error).message,
    });
  }
}
