import { NextResponse, type NextRequest } from "next/server";
import { isValidAdminToken } from "@/lib/admin-auth";

// 1) 익명 추적용 session_id 쿠키 발급 (모든 경로)
// 2) /admin/* 보호 — login 페이지 + login API만 예외

export async function middleware(request: NextRequest) {
  const response = NextResponse.next();

  if (!request.cookies.get("session_id")?.value) {
    response.cookies.set("session_id", crypto.randomUUID(), {
      httpOnly: true,
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 365,
      path: "/",
    });
  }

  const path = request.nextUrl.pathname;
  const isAdminPath = path === "/admin" || path.startsWith("/admin/");
  const isAdminBypass =
    path === "/admin/login" || path === "/api/admin/login";

  if (isAdminPath && !isAdminBypass) {
    const secret = process.env.ADMIN_SESSION_SECRET;
    if (!secret) {
      const url = new URL("/admin/login", request.url);
      url.searchParams.set("err", "env_missing");
      return NextResponse.redirect(url);
    }
    const token = request.cookies.get("admin_token")?.value;
    const ok = await isValidAdminToken(token, secret);
    if (!ok) {
      const url = new URL("/admin/login", request.url);
      if (path !== "/admin") url.searchParams.set("from", path);
      return NextResponse.redirect(url);
    }
  }

  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
