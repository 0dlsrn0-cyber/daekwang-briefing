// AI 프로바이더 핑 테스트 — 관리자만 사용 (middleware 가 /api/admin 외에는 보호하지 않음)
// 실제 API 키로 짧은 프롬프트를 호출해 응답 가능 여부를 확인한다.
//
// 사용:
//   POST /api/health/ai
//   Body: { aiModel: AiModel, aiKey: string }

import { NextResponse, type NextRequest } from "next/server";
import { callAiAnalysis } from "@/lib/ai";
import type { AiModel, NewsItem } from "@/lib/types";

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

const VALID_MODELS: AiModel[] = ["gemini", "gemini-flash-latest"];

export async function POST(request: NextRequest) {
  let body: { aiModel?: unknown; aiKey?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { success: false, error: "잘못된 요청 본문" },
      { status: 400 },
    );
  }

  const aiModel = body.aiModel as AiModel;
  const aiKey = typeof body.aiKey === "string" ? body.aiKey.trim() : "";

  if (!VALID_MODELS.includes(aiModel)) {
    return NextResponse.json(
      { success: false, error: `알 수 없는 모델: ${aiModel}` },
      { status: 400 },
    );
  }
  if (!aiKey) {
    return NextResponse.json(
      { success: false, error: "aiKey 가 비어 있습니다." },
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
      duration_ms: ms,
      preview: output.substring(0, 200),
    });
  } catch (e) {
    const ms = Date.now() - startedAt;
    return NextResponse.json(
      {
        success: false,
        aiModel,
        duration_ms: ms,
        error: (e as Error).message,
      },
      { status: 502 },
    );
  }
}
