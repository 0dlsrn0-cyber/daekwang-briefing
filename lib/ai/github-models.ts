// GitHub Models — gpt-4o-mini → Phi-4 → Llama-3.3-70B (Rate limit 폴백)
const MODELS = [
  "openai/gpt-4o-mini",
  "microsoft/phi-4",
  "meta/llama-3.3-70b-instruct",
];
const ENDPOINT = "https://models.github.ai/inference/chat/completions";

export async function callGithubModels(
  aiKey: string,
  prompt: string,
): Promise<string> {
  if (!aiKey) throw new Error("GitHub 토큰이 없습니다.");
  let lastError = "";

  for (const model of MODELS) {
    const res = await fetch(ENDPOINT, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${aiKey}`,
      },
      body: JSON.stringify({
        model,
        messages: [{ role: "user", content: prompt }],
        temperature: 0.6,
        max_tokens: 4096,
      }),
    });
    const code = res.status;
    if (code === 429 || code === 503) {
      lastError = `Rate limit (${model})`;
      continue;
    }
    if (code !== 200) {
      const body = await res.text();
      lastError = `${model} HTTP ${code}: ${body.substring(0, 200)}`;
      continue;
    }
    const data = await res.json();
    if (data.choices?.[0]?.message?.content) {
      return data.choices[0].message.content;
    }
    lastError = `${model} 응답 구조 이상`;
  }
  throw new Error(`GitHub Models: 모든 모델 실패. 마지막 오류: ${lastError}`);
}
