// Edge 호환 — 포털 SSO 세션 쿠키 (HMAC). lib/access-key.ts 와 동일한 패턴.
// (Web Crypto, b64url, 재서명-후-비교로 Edge runtime verify 이슈 우회)
//
// 토큰 = "<emailB64url>.<expiryMs>.<sig(base64url)>"

const ENC = new TextEncoder();
const COOKIE_NAME = "sso_session";
const DEFAULT_TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30일

async function getKey(secret: string): Promise<CryptoKey> {
  return crypto.subtle.importKey(
    "raw",
    ENC.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign", "verify"],
  );
}

function toB64Url(buf: ArrayBuffer): string {
  const bytes = new Uint8Array(buf);
  let s = "";
  for (const b of bytes) s += String.fromCharCode(b);
  return btoa(s).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function strToB64Url(str: string): string {
  return toB64Url(ENC.encode(str).buffer as ArrayBuffer);
}

function b64UrlToStr(b64: string): string {
  const padded = b64.replace(/-/g, "+").replace(/_/g, "/");
  const bin = atob(padded);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return new TextDecoder().decode(bytes);
}

function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let result = 0;
  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return result === 0;
}

export async function signSsoSession(
  email: string,
  secret: string,
  ttlMs: number = DEFAULT_TTL_MS,
): Promise<string> {
  const payload = `${strToB64Url(email)}.${Date.now() + ttlMs}`;
  const key = await getKey(secret);
  const sig = await crypto.subtle.sign("HMAC", key, ENC.encode(payload));
  return `${payload}.${toB64Url(sig)}`;
}

export interface SsoSession {
  email: string;
}

export async function verifySsoSession(
  token: string | undefined,
  secret: string,
): Promise<SsoSession | null> {
  if (!token) return null;
  const dot = token.lastIndexOf(".");
  if (dot < 1) return null;
  const payload = token.substring(0, dot);
  const sig = token.substring(dot + 1);
  const parts = payload.split(".");
  if (parts.length !== 2) return null;
  const [emailB64, expiryStr] = parts;
  const expiry = parseInt(expiryStr, 10);
  if (!expiry || Number.isNaN(expiry)) return null;
  if (Date.now() >= expiry) return null;
  try {
    const key = await getKey(secret);
    const expectedBuf = await crypto.subtle.sign(
      "HMAC",
      key,
      ENC.encode(payload),
    );
    if (!timingSafeEqual(sig, toB64Url(expectedBuf))) return null;
    return { email: b64UrlToStr(emailB64) };
  } catch {
    return null;
  }
}

export const SSO_COOKIE_NAME = COOKIE_NAME;
export const SSO_TTL_MS = DEFAULT_TTL_MS;
