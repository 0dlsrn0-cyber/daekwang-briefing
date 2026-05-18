const TIMEOUT_MS = 12000;
const MAX_CHARS = 3500;

export async function fetchArticleBody(url: string): Promise<string | null> {
  if (!url) return null;
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(`https://r.jina.ai/${url}`, {
      headers: { Accept: "text/plain" },
      signal: ctrl.signal,
    });
    if (!res.ok) return null;
    const text = (await res.text()).trim();
    if (!text) return null;
    return text.length > MAX_CHARS ? text.slice(0, MAX_CHARS) + "…" : text;
  } catch {
    return null;
  } finally {
    clearTimeout(t);
  }
}
