// Mistral · xAI Grok 공통 — 둘 다 OpenAI 호환 chat/completions 스펙.
// (reference/code.gs 의 callMistral·callGrok 과 동일한 계약: Bearer 인증, choices[0].message.content)
export async function callOpenAiCompat(
  baseUrl: string,
  apiKey: string,
  model: string,
  prompt: string,
): Promise<string> {
  const res = await fetch(baseUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      messages: [{ role: "user", content: prompt }],
      temperature: 0.6,
      max_tokens: 16384,
    }),
  });
  if (!res.ok) throw new Error(`${model} API 오류: ${await res.text()}`);
  const data = await res.json();
  const text = data?.choices?.[0]?.message?.content;
  if (typeof text !== "string" || !text.trim()) {
    throw new Error(`${model} 응답 구조 오류`);
  }
  return text;
}
