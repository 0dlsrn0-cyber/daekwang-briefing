export async function callGrok(aiKey: string, prompt: string): Promise<string> {
  const payload = {
    model: "grok-3",
    temperature: 0.6,
    messages: [{ role: "user", content: prompt }],
  };
  const res = await fetch("https://api.x.ai/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${aiKey}`,
    },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error(`Grok API 오류: ${await res.text()}`);
  const data = await res.json();
  if (data.choices && data.choices.length > 0) {
    return data.choices[0].message.content;
  }
  throw new Error("Grok 응답 구조 오류");
}
