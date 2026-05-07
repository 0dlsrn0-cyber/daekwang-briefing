export async function callMistral(aiKey: string, prompt: string): Promise<string> {
  const payload = {
    model: "mistral-large-latest",
    temperature: 0.6,
    max_tokens: 8192,
    messages: [{ role: "user", content: prompt }],
  };
  const res = await fetch("https://api.mistral.ai/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${aiKey}`,
    },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error(`Mistral API 오류: ${await res.text()}`);
  const data = await res.json();
  if (data.choices && data.choices.length > 0) {
    return data.choices[0].message.content;
  }
  throw new Error("Mistral 응답 구조 오류");
}
