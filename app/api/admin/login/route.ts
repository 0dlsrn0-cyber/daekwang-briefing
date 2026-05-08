import { NextResponse, type NextRequest } from "next/server";
import { signAdminToken, timingSafeEqual } from "@/lib/admin-auth";

export const runtime = "edge";

export async function POST(request: NextRequest) {
  let body: { password?: unknown; from?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { success: false, error: "잘못된 요청 본문" },
      { status: 400 },
    );
  }

  const expected = process.env.ADMIN_PASSWORD;
  const secret = process.env.ADMIN_SESSION_SECRET;

  if (!expected || !secret) {
    return NextResponse.json(
      {
        success: false,
        error:
          "관리자 환경변수 누락 (ADMIN_PASSWORD / ADMIN_SESSION_SECRET). Vercel Project Settings → Environment Variables 확인.",
      },
      { status: 500 },
    );
  }

  const password = typeof body.password === "string" ? body.password : "";
  if (!password || !timingSafeEqual(password, expected)) {
    return NextResponse.json(
      { success: false, error: "비밀번호가 틀렸습니다." },
      { status: 401 },
    );
  }

  const token = await signAdminToken(secret);
  const fromInput = typeof body.from === "string" ? body.from : "";
  const safeFrom =
    fromInput.startsWith("/admin") && !fromInput.startsWith("//")
      ? fromInput
      : "/admin";

  const res = NextResponse.json({ success: true, redirect: safeFrom });
  res.cookies.set("admin_token", token, {
    httpOnly: true,
    sameSite: "lax",
    maxAge: 60 * 60 * 24,
    secure: process.env.NODE_ENV === "production",
    path: "/",
  });
  return res;
}
