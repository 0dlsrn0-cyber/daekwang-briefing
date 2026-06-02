// 서버 전용 — AI/ECOS API 키를 환경변수에서만 해석한다.
// 절대 클라이언트 컴포넌트에서 import 하지 말 것 (라우트 핸들러·서버 컴포넌트 전용).
//
// env 슬롯: <PREFIX>_API_KEY_FREE / <PREFIX>_API_KEY_PAID
//   gemini → GEMINI_*, mistral → MISTRAL_*, grok → XAI_*
import type { AiAvailability, AiProvider, AiTier } from "../types";

const ENV_PREFIX: Record<AiProvider, string> = {
  gemini: "GEMINI",
  mistral: "MISTRAL",
  grok: "XAI",
};

const PROVIDERS: AiProvider[] = ["gemini", "mistral", "grok"];

export function resolveAiKey(provider: AiProvider, tier: AiTier): string | null {
  const v = process.env[`${ENV_PREFIX[provider]}_API_KEY_${tier.toUpperCase()}`];
  return v && v.trim() ? v.trim() : null;
}

// 설정된 키 슬롯만 boolean 으로 노출 (키 값 자체는 클라이언트로 보내지 않는다).
export function aiAvailability(): AiAvailability {
  const out = {} as AiAvailability;
  for (const p of PROVIDERS) {
    out[p] = {
      free: !!resolveAiKey(p, "free"),
      paid: !!resolveAiKey(p, "paid"),
    };
  }
  return out;
}

export function ecosKeyFromEnv(): string {
  return process.env.ECOS_API_KEY?.trim() || "";
}
