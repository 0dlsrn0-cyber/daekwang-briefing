export async function callPerplexity(aiKey: string, prompt: string): Promise<string> {
  const payload = {
    model: "sonar-pro",
    temperature: 0.6,
    messages: [{ role: "user", content: prompt }],
  };
  const res = await fetch("https://api.perplexity.ai/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${aiKey}`,
    },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error(`Perplexity API 오류: ${await res.text()}`);
  const data = await res.json();
  if (data.choices && data.choices.length > 0) {
    return data.choices[0].message.content;
  }
  throw new Error("Perplexity 응답 구조 오류");
}
