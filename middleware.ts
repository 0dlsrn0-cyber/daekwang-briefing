import { NextResponse, type NextRequest } from "next/server";
import { isValidAdminToken } from "@/lib/admin-auth";
import {
  signSsoSession,
  verifySsoSession,
  SSO_COOKIE_NAME,
  SSO_TTL_MS,
} from "@/lib/sso-session";

// 1) 익명 추적용 session_id 쿠키 발급 (모든 경로)
// 2) /admin/* 보호 — login 페이지 + login API만 예외
// 3) 일반 사용자: 포털 SSO 게이트 (홈/브리핑 API)
//    - 포털에서 ?ott=<supabase access_token> 으로 넘어오면 검증 후 sso_session 쿠키 발급
//    - 유효한 sso_session 쿠키가 없으면 포털 로그인으로 리다이렉트
//    - 관리자(admin_token 유효)는 게이트 우회

// 포털(daekwang-sso) 토큰 인트로스펙션 — /auth/v1/user 로 현재 유효성 확인
async function introspectSsoToken(token: string): Promise<string | null> {
  const url = process.env.DAEKWANG_SSO_URL;
  const anon = process.env.DAEKWANG_SSO_ANON_KEY;
  if (!url || !anon) return null;
  try {
    const res = await fetch(`${url}/auth/v1/user`, {
      headers: { Authorization: `Bearer ${token}`, apikey: anon },
    });
    if (!res.ok) return null;
    const user = (await res.json()) as { email?: string; id?: string };
    return user?.email ?? user?.id ?? null;
  } catch {
    return null;
  }
}

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
  const isLocalDev =
    process.env.NODE_ENV === "development" &&
    (request.nextUrl.hostname === "127.0.0.1" ||
      request.nextUrl.hostname === "localhost");

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

  // (B) 포털 SSO 게이트
  if (isGatedPath(path) && !isLocalDev) {
    // 관리자 토큰이 유효하면 게이트 우회
    const adminToken = request.cookies.get("admin_token")?.value;
    const isAdmin =
      secret && adminToken
        ? await isValidAdminToken(adminToken, secret)
        : false;

    if (!isAdmin) {
      const ssoSecret = process.env.SSO_SESSION_SECRET;
      const ott = request.nextUrl.searchParams.get("ott");

      // 1) OTT 핸드오프: 포털에서 넘어온 토큰 검증 → sso_session 쿠키 발급 → ott 제거 리다이렉트
      if (ott && ssoSecret) {
        const email = await introspectSsoToken(ott);
        if (email) {
          const cleanUrl = new URL(request.url);
          cleanUrl.searchParams.delete("ott");
          const res = NextResponse.redirect(cleanUrl);
          const cookie = await signSsoSession(email, ssoSecret);
          res.cookies.set(SSO_COOKIE_NAME, cookie, {
            httpOnly: true,
            sameSite: "lax",
            secure: process.env.NODE_ENV === "production",
            maxAge: Math.floor(SSO_TTL_MS / 1000),
            path: "/",
          });
          return res;
        }
      }

      // 2) 기존 SSO 세션 쿠키 확인
      const ssoCookie = request.cookies.get(SSO_COOKIE_NAME)?.value;
      const session = ssoSecret
        ? await verifySsoSession(ssoCookie, ssoSecret)
        : null;

      if (!session) {
        // API 요청은 401, 페이지 요청은 포털 로그인으로 리다이렉트
        if (path.startsWith("/api/")) {
          return NextResponse.json(
            { success: false, error: "SSO 인증이 필요합니다." },
            { status: 401 },
          );
        }
        const portalUrl =
          process.env.PORTAL_URL || "https://dk-housing-ops.vercel.app";
        return NextResponse.redirect(portalUrl);
      }
    }
  }

  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
