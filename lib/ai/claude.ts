export async function callClaude(aiKey: string, prompt: string): Promise<string> {
  const payload = {
    model: "claude-opus-4-7",
    max_tokens: 8192,
    temperature: 0.6,
    messages: [{ role: "user", content: prompt }],
  };
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": aiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error(`Claude API 오류: ${await res.text()}`);
  const data = await res.json();
  if (data.content && data.content.length > 0) return data.content[0].text;
  throw new Error("Claude 응답 구조 오류");
}
