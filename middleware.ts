import { NextResponse, type NextRequest } from "next/server";
import { isValidAdminToken } from "@/lib/admin-auth";
import { isValidAccessToken, ACCESS_COOKIE_NAME } from "@/lib/access-key";

// 1) 익명 추적용 session_id 쿠키 발급 (모든 경로)
// 2) /admin/* 보호 — login 페이지 + login API만 예외
// 3) 일반 사용자: 사이트 접근키 게이트 (홈/브리핑 API)
//    - 관리자(admin_token 유효)는 게이트 우회

function isAdminAreaPath(path: string): boolean {
  return (
    path === "/admin" ||
    path.startsWith("/admin/") ||
    path.startsWith("/api/admin/")
  );
}

// 접근키 게이트가 적용되는 경로 (관리자 영역, 게이트 API, 정적 자산 제외)
function isGatedPath(path: string): boolean {
  if (path === "/") return true;
  if (path === "/gate") return false;
  if (path.startsWith("/api/access-key/")) return false;
  if (isAdminAreaPath(path)) return false; // 관리자 영역은 별도 인증
  if (path === "/api/briefing") return true;
  if (path === "/api/send-email") return true;
  return false;
}

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
  const secret = process.env.ADMIN_SESSION_SECRET;

  // (A) 관리자 영역 보호
  const isAdminPage = path === "/admin" || path.startsWith("/admin/");
  const isAdminApi = path === "/api/health/ai";
  const isAdminBypass =
    path === "/admin/login" || path === "/api/admin/login";

  if ((isAdminPage || isAdminApi) && !isAdminBypass) {
    if (!secret) {
      if (isAdminApi) {
        return NextResponse.json(
          { success: false, error: "ADMIN_SESSION_SECRET 누락" },
          { status: 500 },
        );
      }
      const url = new URL("/admin/login", request.url);
      url.searchParams.set("err", "env_missing");
      return NextResponse.redirect(url);
    }
    const token = request.cookies.get("admin_token")?.value;
    const ok = await isValidAdminToken(token, secret);
    if (!ok) {
      if (isAdminApi) {
        return NextResponse.json(
          { success: false, error: "관리자 인증이 필요합니다." },
          { status: 401 },
        );
      }
      const url = new URL("/admin/login", request.url);
      if (path !== "/admin") url.searchParams.set("from", path);
      return NextResponse.redirect(url);
    }
  }

  // (B) 일반 사용자 접근키 게이트
  if (isGatedPath(path) && secret) {
    // 관리자 토큰이 유효하면 게이트 우회
    const adminToken = request.cookies.get("admin_token")?.value;
    const isAdmin = adminToken
      ? await isValidAdminToken(adminToken, secret)
      : false;

    if (!isAdmin) {
      const accessToken = request.cookies.get(ACCESS_COOKIE_NAME)?.value;
      const hasAccess = await isValidAccessToken(accessToken, secret);
      if (!hasAccess) {
        if (path === "/") {
          const url = new URL("/gate", request.url);
          return NextResponse.redirect(url);
        }
        // API 요청은 401
        return NextResponse.json(
          { success: false, error: "접근키 인증이 필요합니다." },
          { status: 401 },
        );
      }
    }
  }

  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
