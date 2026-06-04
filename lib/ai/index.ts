import type { AiModel, AiProvider, NewsItem, RateData } from "../types";
import { buildPrompt } from "./prompt";
import { normalizeReport } from "../markdown";
import { callGemini } from "./gemini";
import { callOpenAiCompat } from "./openai-compat";

interface ModelDef {
  provider: AiProvider;
  apiModel: string;
  label: string;
}

// 폼·헬스체크·결과·이메일 화면이 공유하는 단일 모델 레지스트리.
// env 키는 여기서 다루지 않는다 (서버 전용 lib/ai/keys.ts).
export const MODELS: Record<AiModel, ModelDef> = {
  gemini: {
    provider: "gemini",
    apiModel: "gemini-2.5-flash",
    label: "Google Gemini 2.5 Flash",
  },
  "gemini-flash-latest": {
    provider: "gemini",
    apiModel: "gemini-flash-latest",
    label: "Google Gemini Flash Latest",
  },
  mistral: {
    provider: "mistral",
    apiModel: "mistral-small-latest",
    label: "Mistral Small",
  },
  grok: {
    provider: "grok",
    apiModel: "grok-3-mini",
    label: "Grok 3 mini",
  },
};

export const MODEL_LABELS: Record<AiModel, string> = Object.fromEntries(
  (Object.keys(MODELS) as AiModel[]).map((m) => [m, MODELS[m].label]),
) as Record<AiModel, string>;

const MISTRAL_URL = "https://api.mistral.ai/v1/chat/completions";
const GROK_URL = "https://api.x.ai/v1/chat/completions";

export async function callAiAnalysis(
  aiKey: string,
  aiModel: AiModel,
  newsList: NewsItem[],
  focusPoint: string | undefined,
  rateData: RateData | null | undefined,
  previousSummary?: string | null,
): Promise<string> {
  const prompt = buildPrompt(newsList, focusPoint, rateData, previousSummary);
  const def = MODELS[aiModel] ?? MODELS.gemini;

  let raw: string;
  switch (def.provider) {
    case "mistral":
      raw = await callOpenAiCompat(MISTRAL_URL, aiKey, def.apiModel, prompt);
      break;
    case "grok":
      raw = await callOpenAiCompat(GROK_URL, aiKey, def.apiModel, prompt);
      break;
    case "gemini":
    default:
      raw = await callGemini(aiKey, prompt, def.apiModel);
      break;
  }
  return normalizeReport(raw);
}
