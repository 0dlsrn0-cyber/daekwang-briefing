// 관리자 전용 — 현재 접근키 조회 / 변경
// (이 경로는 middleware 가 admin_token 쿠키로 이미 보호함)

import { NextResponse, type NextRequest } from "next/server";
import { getStoredAccessKey, setStoredAccessKey } from "@/lib/access-key-store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const key = await getStoredAccessKey();
    return NextResponse.json({ success: true, accessKey: key });
  } catch (e) {
    return NextResponse.json(
      { success: false, error: (e as Error).message },
      { status: 500 },
    );
  }
}

export async function PATCH(request: NextRequest) {
  let body: { newKey?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { success: false, error: "잘못된 요청 본문" },
      { status: 400 },
    );
  }

  const newKey = typeof body.newKey === "string" ? body.newKey.trim() : "";
  if (!newKey) {
    return NextResponse.json(
      { success: false, error: "새 접근키를 입력해 주세요." },
      { status: 400 },
    );
  }
  if (newKey.length < 4 || newKey.length > 64) {
    return NextResponse.json(
      { success: false, error: "접근키는 4~64자여야 합니다." },
      { status: 400 },
    );
  }

  try {
    await setStoredAccessKey(newKey, "admin");
    return NextResponse.json({ success: true });
  } catch (e) {
    return NextResponse.json(
      { success: false, error: (e as Error).message },
      { status: 500 },
    );
  }
}
