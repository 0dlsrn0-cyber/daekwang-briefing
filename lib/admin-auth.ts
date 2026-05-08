// Edge 호환 (Web Crypto만 사용). middleware / route handler 양쪽에서 import 가능.

const ENC = new TextEncoder();

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

// 토큰 = "<expiryMs>.<signature(base64url)>"
export async function signAdminToken(
  secret: string,
  ttlMs: number = 24 * 60 * 60 * 1000,
): Promise<string> {
  const payload = String(Date.now() + ttlMs);
  const key = await getKey(secret);
  const sig = await crypto.subtle.sign("HMAC", key, ENC.encode(payload));
  return `${payload}.${toB64Url(sig)}`;
}

// 검증: 같은 시크릿으로 다시 서명해서 문자열 비교
// (crypto.subtle.verify에 BufferSource 넘기는 부분에서 Edge runtime 호환 이슈가 있어 우회)
export async function isValidAdminToken(
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
    const expectedSig = toB64Url(expectedBuf);
    return timingSafeEqual(sig, expectedSig);
  } catch {
    return false;
  }
}

// 비밀번호 비교 (timing-safe)
export function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let result = 0;
  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return result === 0;
}
