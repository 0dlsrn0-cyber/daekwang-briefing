import type { AiModel, NewsItem, RateData } from "../types";
import { buildPrompt } from "./prompt";
import { callGemini } from "./gemini";

export const MODEL_LABELS: Record<AiModel, string> = {
  gemini: "Google Gemini 2.5 Flash",
  "gemini-flash-latest": "Google Gemini Flash Latest",
};

export async function callAiAnalysis(
  aiKey: string,
  aiModel: AiModel,
  newsList: NewsItem[],
  focusPoint: string | undefined,
  rateData: RateData | null | undefined,
  previousSummary?: string | null,
): Promise<string> {
  const prompt = buildPrompt(newsList, focusPoint, rateData, previousSummary);

  switch (aiModel) {
    case "gemini-flash-latest":
      return callGemini(aiKey, prompt, "gemini-flash-latest");
    case "gemini":
    default:
      return callGemini(aiKey, prompt);
  }
}
