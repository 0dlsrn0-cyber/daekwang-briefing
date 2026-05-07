// Cohere Command A (2025-03) — v2 Chat API
export async function callCohere(aiKey: string, prompt: string): Promise<string> {
  if (!aiKey) throw new Error("Cohere API 키가 없습니다.");
  const res = await fetch("https://api.cohere.com/v2/chat", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${aiKey}`,
    },
    body: JSON.stringify({
      model: "command-a-03-2025",
      messages: [{ role: "user", content: prompt }],
      max_tokens: 8192,
      temperature: 0.6,
    }),
  });
  const code = res.status;
  if (code !== 200) {
    throw new Error(`Cohere API 오류 (HTTP ${code}): ${await res.text()}`);
  }
  const data = await res.json();
  if (data.message?.content?.length > 0) {
    const textParts = data.message.content.filter(
      (c: { type: string; text?: string }) => c.type === "text" && c.text,
    );
    if (textParts.length > 0) return textParts[0].text;
  }
  if (data.text) return data.text;
  throw new Error(
    `Cohere 응답 구조 오류: ${JSON.stringify(data).substring(0, 300)}`,
  );
}
