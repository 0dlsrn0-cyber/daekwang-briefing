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

// 선택된 모델로 임의 프롬프트 1회 호출(분석·관련성 판정이 공유).
async function callLlm(
  aiKey: string,
  aiModel: AiModel,
  prompt: string,
): Promise<string> {
  const def = MODELS[aiModel] ?? MODELS.gemini;
  switch (def.provider) {
    case "mistral":
      return callOpenAiCompat(MISTRAL_URL, aiKey, def.apiModel, prompt);
    case "grok":
      return callOpenAiCompat(GROK_URL, aiKey, def.apiModel, prompt);
    case "gemini":
    default:
      return callGemini(aiKey, prompt, def.apiModel);
  }
}

export async function callAiAnalysis(
  aiKey: string,
  aiModel: AiModel,
  newsList: NewsItem[],
  focusPoint: string | undefined,
  rateData: RateData | null | undefined,
  previousSummary?: string | null,
): Promise<string> {
  const prompt = buildPrompt(newsList, focusPoint, rateData, previousSummary);
  return normalizeReport(await callLlm(aiKey, aiModel, prompt));
}

// 하이브리드 관련성 필터 2단계: 키워드(lib/news.ts isRelevant)로 1차 걸러진
// 후보를 LLM이 제목+본문까지 읽고 대광 시행사 브리핑에 관련된 기사만 남긴다.
// 호출 실패·파싱 실패·전부 탈락(과필터 의심)이면 키워드 결과를 그대로 돌려준다.
const RELEVANCE_SNIPPET = 600;

export async function selectRelevantNews(
  aiKey: string,
  aiModel: AiModel,
  candidates: NewsItem[],
): Promise<NewsItem[]> {
  if (candidates.length === 0) return candidates;

  const list = candidates
    .map((n, i) => {
      const body = (n.body || "").trim().slice(0, RELEVANCE_SNIPPET);
      return `[${i}] (${n.category}) ${n.title}\n${body || "(본문 없음 — 제목으로만 판단)"}`;
    })
    .join("\n\n");

  const prompt =
    "너는 대광그룹 주택관리팀 임원 보고용 '일일 부동산 브리핑'의 기사 선별 담당이다.\n" +
    "아래 후보 기사들 중 디벨로퍼(시행사) 브리핑에 실제로 관련 있는 기사만 골라라.\n\n" +
    "[남길 것] 정책·세제, 분양·청약, 주택 시장·가격, PF·건설금융·공사원가, 부동산 투자·운용(리츠 등), " +
    "부동산·건설·입지에 직접 영향을 주는 거시(금리·환율·원자재) 및 프롭테크/건설 DX.\n" +
    "[버릴 것] ① 언론 기사가 아닌 것(포털 안내·위키·통계포털·공공데이터·상품/분양 광고·블로그). " +
    "② 부동산과 무관한 잡음(철도공단·지자체 채무·개별 증시종목·코인·스포츠·연예 등 부동산 본질과 무관한 것). " +
    "③ '그날의 변화'가 아닌 에버그린(연간전망·결산·제도 일반해설·용어풀이).\n" +
    "제목만 보지 말고 본문 내용까지 보고 판단하라. 개수를 채우려 애매한 것을 남기지 말고, 관련성이 분명한 것만 남겨라. " +
    "같은 사안을 다룬 기사가 여러 건이면 내용이 가장 충실한 1건만 남겨라.\n\n" +
    "후보:\n" +
    list +
    "\n\n남길 기사의 번호만 JSON 배열로 출력하라. 다른 말·설명·코드펜스 없이 배열만. 예: [0,2,5,7]";

  let raw: string;
  try {
    raw = await callLlm(aiKey, aiModel, prompt);
  } catch {
    return candidates;
  }
  // 모델이 군말을 붙여도 '숫자 배열'만 정확히 집어낸다([0,2,5] / [] 매칭, "[참고]" 무시).
  const m = raw.match(/\[[\d\s,]*\]/);
  if (!m) return candidates;
  let parsed: unknown;
  try {
    parsed = JSON.parse(m[0]);
  } catch {
    return candidates;
  }
  if (!Array.isArray(parsed)) return candidates;
  const keep = new Set(
    parsed.filter(
      (x): x is number =>
        Number.isInteger(x) && x >= 0 && x < candidates.length,
    ),
  );
  if (keep.size === 0) return candidates;
  return candidates.filter((_, i) => keep.has(i));
}
