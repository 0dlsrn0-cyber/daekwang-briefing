// AI(특히 Mistral)가 섞어 내는 잡 마크다운을 보고서용으로 정리한다.
// 보존: 섹션 헤더(## ), 강조(**굵게** / *기울임*), 섹션5의 "- 왜/대응" 대시,
//       가·나·다 / ①②③ / 1) 번호 체계.
// 제거·변환: ### 이상 하위 헤더(→ **굵게**), * · + 불릿(→ - 대시), ---·***·___ 구분선(→ 빈 줄).
export function normalizeReport(text: string): string {
  if (!text) return text;
  return text
    .split("\n")
    .map((line) => {
      // 1) 수평 구분선(--- *** ___ ===) → 빈 줄
      if (/^\s*([-*_=])\1{2,}\s*$/.test(line)) return "";
      // 2) ### 이상 하위 헤더 → 굵게 (## 섹션 헤더는 보존)
      //    선행 ###·후행 # 만 떼고 별표(*)는 절대 건드리지 않는다.
      //    소제목 안에 이미 **굵게**/*기울임* 이 있으면 다시 감싸지 않는다(마커 깨짐 방지).
      const h = line.match(/^\s*#{3,}\s*(.*?)\s*#*\s*$/);
      if (h) {
        const inner = h[1].trim();
        if (!inner) return "";
        return inner.includes("*") ? inner : `**${inner}**`;
      }
      // 3) * / + 불릿 → - 대시 (들여쓰기 보존, **굵게** 줄은 제외)
      const b = line.match(/^(\s*)[*+]\s+(.*)$/);
      if (b) return `${b[1]}- ${b[2]}`;
      return line;
    })
    .join("\n");
}

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
