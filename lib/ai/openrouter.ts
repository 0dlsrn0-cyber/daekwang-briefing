// OpenRouter — Llama 4 Scout → Qwen3 30B → Mistral Small (무료 폴백)
const MODELS = [
  "meta-llama/llama-4-scout:free",
  "qwen/qwen3-30b-a3b:free",
  "mistralai/mistral-small-3.1-24b-instruct:free",
];
const OR_URL = "https://openrouter.ai/api/v1/chat/completions";

export async function callOpenRouter(
  aiKey: string,
  prompt: string,
): Promise<string> {
  if (!aiKey) throw new Error("OpenRouter API 키가 없습니다.");
  let lastError = "";

  for (const model of MODELS) {
    const res = await fetch(OR_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${aiKey}`,
        "HTTP-Referer": "https://daekwang.com",
        "X-Title": "Daekwang Briefing System",
      },
      body: JSON.stringify({
        model,
        messages: [{ role: "user", content: prompt }],
        temperature: 0.6,
        max_tokens: 4096,
      }),
    });
    const code = res.status;
    if (code === 429 || code === 404 || code >= 500) {
      const body = await res.text();
      lastError = `${model} HTTP ${code}: ${body.substring(0, 200)}`;
      continue;
    }
    if (code !== 200) {
      const body = await res.text();
      lastError = `${model} HTTP ${code}: ${body.substring(0, 200)}`;
      continue;
    }
    const data = await res.json();
    if (data.error) {
      lastError = `${model} error: ${JSON.stringify(data.error).substring(0, 200)}`;
      continue;
    }
    if (data.choices?.[0]?.message?.content) {
      return data.choices[0].message.content;
    }
    lastError = `${model} 응답 구조 이상`;
  }
  throw new Error(`OpenRouter: 모든 모델 실패. 마지막 오류: ${lastError}`);
}
