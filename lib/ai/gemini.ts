export async function callGemini(
  aiKey: string,
  prompt: string,
  model: string = "gemini-2.5-flash",
): Promise<string> {
  const payload = {
    contents: [{ parts: [{ text: prompt }] }],
    generationConfig: {
      temperature: 0.6,
      maxOutputTokens: 16384,
      // 2.5 Flash는 thinking·본문이 maxOutputTokens를 함께 쓴다.
      // thinking을 묶어 본문(보고서) 토큰을 확보 → 마지막 섹션 잘림 방지.
      thinkingConfig: { thinkingBudget: 4096 },
    },
  };
  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${aiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    },
  );
  if (!res.ok) throw new Error(`Gemini API 오류: ${await res.text()}`);
  const data = await res.json();
  const cand = data?.candidates?.[0];
  const parts = cand?.content?.parts;
  // 일부 파트가 thinking이거나 MAX_TOKENS로 잘릴 수 있어 text를 모두 이어 붙인다.
  const text = Array.isArray(parts)
    ? parts.map((p: { text?: string }) => p?.text ?? "").join("")
    : "";
  if (text.trim()) return text;
  throw new Error(
    `Gemini 응답 없음 (finishReason: ${cand?.finishReason ?? "unknown"})`,
  );
}
