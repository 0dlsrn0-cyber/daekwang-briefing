// AI 프로바이더 핑 테스트 — 관리자만 사용 (middleware 가 /api/admin 외에는 보호하지 않음)
// 키는 서버 환경변수에서 해석한다. 짧은 프롬프트를 호출해 응답 가능 여부를 확인한다.
//
// 사용:
//   POST /api/health/ai
//   Body: { aiModel: AiModel, tier: "free" | "paid" }

import { NextResponse, type NextRequest } from "next/server";
import { callAiAnalysis, MODELS } from "@/lib/ai";
import { resolveAiKey } from "@/lib/ai/keys";
import type { AiModel, AiTier, NewsItem } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

const PING_NEWS: NewsItem[] = [
  {
    category: "테스트",
    title: "헬스체크: 모델이 응답하는지 확인",
    link: "https://example.com",
    pubDate: new Date().toISOString(),
  },
];

export async function POST(request: NextRequest) {
  let body: { aiModel?: unknown; tier?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { success: false, error: "잘못된 요청 본문" },
      { status: 400 },
    );
  }

  const aiModel = body.aiModel as AiModel;
  const tier: AiTier = body.tier === "paid" ? "paid" : "free";

  if (typeof aiModel !== "string" || !(aiModel in MODELS)) {
    return NextResponse.json(
      { success: false, error: `알 수 없는 모델: ${String(aiModel)}` },
      { status: 400 },
    );
  }

  const aiKey = resolveAiKey(MODELS[aiModel].provider, tier);
  if (!aiKey) {
    return NextResponse.json(
      {
        success: false,
        aiModel,
        tier,
        error: `${tier === "paid" ? "유료" : "무료"} API 키가 서버 환경변수에 설정되지 않았습니다.`,
      },
      { status: 400 },
    );
  }

  const startedAt = Date.now();
  try {
    const output = await callAiAnalysis(
      aiKey,
      aiModel,
      PING_NEWS,
      "헬스체크. 한 문장으로 OK라고 답하세요.",
      null,
    );
    const ms = Date.now() - startedAt;
    return NextResponse.json({
      success: true,
      aiModel,
      tier,
      duration_ms: ms,
      preview: output.substring(0, 200),
    });
  } catch (e) {
    const ms = Date.now() - startedAt;
    return NextResponse.json(
      {
        success: false,
        aiModel,
        tier,
        duration_ms: ms,
        error: (e as Error).message,
      },
      { status: 502 },
    );
  }
}
