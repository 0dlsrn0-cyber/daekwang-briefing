// Edge 호환 — Web Crypto + HMAC 토큰만 다룬다.
// (Supabase에서 키를 읽거나 저장하는 함수는 lib/access-key-store.ts 로 분리되어 있다.)

const ENC = new TextEncoder();
const COOKIE_NAME = "access_token";
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

function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let result = 0;
  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return result === 0;
}

export async function signAccessToken(
  secret: string,
  ttlMs: number = DEFAULT_TTL_MS,
): Promise<string> {
  const payload = String(Date.now() + ttlMs);
  const key = await getKey(secret);
  const sig = await crypto.subtle.sign("HMAC", key, ENC.encode(payload));
  return `${payload}.${toB64Url(sig)}`;
}

export async function isValidAccessToken(
  token: string | undefined,
  secret: string,
): Promise<boolean> {
  if (!token) return false;
  const dot = token.lastIndexOf(".");
  if (dot < 1) return false;
  const payload = token.substring(0, dot);
  const sig = token.substring(dot + 1);
  const expiry = parseInt(payload, 10);
  if (!expiry || Number.isNaN(expiry)) return false;
  if (Date.now() >= expiry) return false;
  try {
    const key = await getKey(secret);
    const expectedBuf = await crypto.subtle.sign(
      "HMAC",
      key,
      ENC.encode(payload),
    );
    return timingSafeEqual(sig, toB64Url(expectedBuf));
  } catch {
    return false;
  }
}

export const ACCESS_COOKIE_NAME = COOKIE_NAME;
export const ACCESS_TTL_MS = DEFAULT_TTL_MS;
