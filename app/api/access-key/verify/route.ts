import { NextResponse, type NextRequest } from "next/server";
import {
  signAccessToken,
  ACCESS_COOKIE_NAME,
  ACCESS_TTL_MS,
} from "@/lib/access-key";
import { getStoredAccessKey } from "@/lib/access-key-store";

export const runtime = "nodejs";

function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let result = 0;
  for (let i = 0; i < a.length; i++) result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return result === 0;
}

export async function POST(request: NextRequest) {
  let body: { key?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { success: false, error: "잘못된 요청 본문" },
      { status: 400 },
    );
  }

  const secret = process.env.ADMIN_SESSION_SECRET;
  if (!secret) {
    return NextResponse.json(
      {
        success: false,
        error: "서버 환경변수 누락 (ADMIN_SESSION_SECRET)",
      },
      { status: 500 },
    );
  }

  const submitted = typeof body.key === "string" ? body.key.trim() : "";
  if (!submitted) {
    return NextResponse.json(
      { success: false, error: "접근키를 입력해 주세요." },
      { status: 400 },
    );
  }

  let stored: string;
  try {
    stored = await getStoredAccessKey();
  } catch (e) {
    return NextResponse.json(
      { success: false, error: `접근키 조회 실패: ${(e as Error).message}` },
      { status: 500 },
    );
  }

  if (!timingSafeEqual(submitted, stored)) {
    return NextResponse.json(
      { success: false, error: "접근키가 일치하지 않습니다." },
      { status: 401 },
    );
  }

  const token = await signAccessToken(secret, ACCESS_TTL_MS);
  const res = NextResponse.json({ success: true });
  res.cookies.set(ACCESS_COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: "lax",
    maxAge: Math.floor(ACCESS_TTL_MS / 1000),
    secure: process.env.NODE_ENV === "production",
    path: "/",
  });
  return res;
}
