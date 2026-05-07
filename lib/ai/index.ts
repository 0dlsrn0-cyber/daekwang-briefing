import type { AiModel, NewsItem, RateData } from "../types";
import { buildPrompt } from "./prompt";
import { callGemini } from "./gemini";
import { callClaude } from "./claude";
import { callOpenAI } from "./openai";
import { callGrok } from "./grok";
import { callMistral } from "./mistral";
import { callPerplexity } from "./perplexity";
import { callGithubModels } from "./github-models";
import { callCohere } from "./cohere";
import { callOpenRouter } from "./openrouter";

export const MODEL_LABELS: Record<AiModel, string> = {
  gemini: "Google Gemini 2.5 Flash",
  claude: "Claude Opus 4.7",
  grok: "xAI Grok-3",
  perplexity: "Perplexity Sonar Pro",
  openai: "OpenAI GPT-4o",
  mistral: "Mistral Large",
  github: "GitHub AI · gpt-4o-mini / Phi-4 / Llama",
  cohere: "Cohere Command A (2025)",
  openrouter: "OpenRouter · Llama 4 / Qwen3 / Mistral (Free)",
};

export async function callAiAnalysis(
  aiKey: string,
  aiModel: AiModel,
  newsList: NewsItem[],
  focusPoint: string | undefined,
  rateData: RateData | null | undefined,
): Promise<string> {
  const prompt = buildPrompt(newsList, focusPoint, rateData);

  switch (aiModel) {
    case "claude":
      return callClaude(aiKey, prompt);
    case "grok":
      return callGrok(aiKey, prompt);
    case "perplexity":
      return callPerplexity(aiKey, prompt);
    case "openai":
      return callOpenAI(aiKey, prompt);
    case "mistral":
      return callMistral(aiKey, prompt);
    case "github":
      return callGithubModels(aiKey, prompt);
    case "cohere":
      return callCohere(aiKey, prompt);
    case "openrouter":
      return callOpenRouter(aiKey, prompt);
    case "gemini":
    default:
      return callGemini(aiKey, prompt);
  }
}
