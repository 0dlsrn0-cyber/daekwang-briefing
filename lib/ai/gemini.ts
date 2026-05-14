export async function callGemini(
  aiKey: string,
  prompt: string,
  model: string = "gemini-2.5-flash",
): Promise<string> {
  const payload = {
    contents: [{ parts: [{ text: prompt }] }],
    generationConfig: { temperature: 0.6, maxOutputTokens: 8192 },
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
  if (data.candidates && data.candidates.length > 0) {
    return data.candidates[0].content.parts[0].text;
  }
  throw new Error("Gemini 응답 구조 오류");
}
