export function mdToHtml(text: string): string {
  return text
    .replace(/\*\*\*([^*]+)\*\*\*/g, '<strong style="color:#1B365D;">$1</strong>')
    .replace(/\*\*([^*]+)\*\*/g, '<strong style="color:#1B365D;">$1</strong>')
    .replace(/\*([^*\s][^*]*)\*/g, "<em>$1</em>");
}

export function emailMdToHtml(text: string): string {
  return text
    .replace(
      /\*\*\*([^*]+)\*\*\*/g,
      '<strong style="color:#0D1F3C;font-weight:800;">$1</strong>',
    )
    .replace(
      /\*\*([^*]+)\*\*/g,
      '<strong style="color:#0D1F3C;font-weight:700;">$1</strong>',
    )
    .replace(/\*([^*\s][^*]*)\*/g, '<em style="color:#264D85;">$1</em>');
}
