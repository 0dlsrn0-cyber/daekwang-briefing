import { buildRateTextForPrompt } from "../ecos";
import type { NewsItem, RateData } from "../types";

export function buildPrompt(
  newsList: NewsItem[],
  focusPoint: string | undefined,
  rateData: RateData | null | undefined,
  previousSummary?: string | null,
): string {
  const bodied = newsList.filter((n) => n.body && n.body.trim().length > 0);
  const titleOnly = newsList.filter((n) => !n.body || !n.body.trim());

  const bodiedText = bodied.length
    ? bodied
        .map(
          (n, i) =>
            `${i + 1}. [${n.category}] ${n.title}\nURL: ${n.link}\n본문:\n${n.body}\n`,
        )
        .join("\n")
    : "(본문 추출 실패 — 제목만 참고하세요.)";

  const titleOnlyText = titleOnly.length
    ? titleOnly.map((n) => `- [${n.category}] ${n.title}`).join("\n")
    : "(추가 제목 없음)";

  const hasFocus = focusPoint && focusPoint.trim();
  let rateBlock = "";
  if (rateData && rateData.success && rateData.rates) {
    rateBlock =
      "\n[ECOS 실시간 금리·심리 지표]\n" +
      buildRateTextForPrompt(rateData.rates, rateData.trends || {}) +
      "\n";
  }

  const prevBlock =
    previousSummary && previousSummary.trim()
      ? previousSummary.trim()
      : "(이전 결론 없음 — 오늘이 첫 브리핑입니다.)";

  let mainPrompt =
    "대광그룹 주택관리팀 임원 보고용 일일 부동산 브리핑이다.\n\n" +
    "[내부 사고 방식 — 출력에는 드러내지 말 것]\n" +
    "각 섹션을 작성할 때 다음 6명의 최고 전문가가 된 것처럼 깊이 있게 사고하라:\n" +
    "거시이코노미스트, PF 금융 심사역, 시행 본부장, 분양 마케팅 디렉터, 원가관리 PM, 부동산 전문 변호사·세무사. " +
    "이들의 시각을 동시에 가동해 분석의 정밀도를 끌어올리되, **출력문에는 직함·직책·페르소나를 절대 노출하지 마라**. " +
    "\"본 심사역은\", \"분석가의 견해로는\", \"전문가 패널\", \"필자는\" 같은 표현 금지. " +
    "분석 결과 그 자체만 객관적인 서술로 쓰라.\n\n" +
    "[직전 영업일 종합결론 — 어제 시점의 판단]\n" +
    prevBlock +
    "\n\n" +
    "[오늘의 수집 뉴스 — 풀텍스트 포함 핵심 기사]\n" +
    "다음 기사들은 본문 전체를 읽고 분석에 반영하세요. 제목만 보고 해석하지 말고, " +
    "본문 안의 수치·주체·시점·인용을 직접 인용하면서 분석할 것.\n\n" +
    bodiedText +
    "\n" +
    "[오늘의 수집 뉴스 — 제목만 (참고)]\n" +
    titleOnlyText +
    "\n" +
    rateBlock +
    "\n[★ 디벨로퍼 관점 분석 핵심 지침 ★]\n" +
    '- 시행사는 뉴스를 "어디에 사업지를 잡을 것인가", "지금이 분양 타이밍인가", "원가 구조가 바뀌는가", "수분양자 자금 조달이 가능한가"의 렌즈로 읽습니다.\n' +
    '- 매크로/원자재 뉴스는 반드시 "공사원가 → 사업수지 → 분양가 설정"의 연결고리로 분석하세요.\n' +
    '- 투자·운용 뉴스(리츠·AUM·사옥매각·PF 거래)는 "기관 자금 흐름 → 자산 유동성·캡레이트 → 우리 사업지 인근 거래 시그널" 관점으로 해석하세요.\n';

  if (rateBlock) {
    mainPrompt +=
      "- **데이터 활용 필수**: ECOS 실제 수치를 인용하여 PF 조달금리 및 잔금대출 환경을 정량적으로 진단하세요.\n" +
      "- **CSI 3종 활용 의무**: 주택가격전망CSI·가계부채전망CSI·소비자심리지수(CCSI)를 금리와 교차하여 수분양자 심리 지형도를 그려주세요.\n";
  }

  mainPrompt +=
    "- 부동산 AI/DX 뉴스가 있으면 일반 AI 산업 전망으로 확장하지 말고, 분양·건설·문서·입지 분석 업무에 미치는 영향만 보조 시그널로 반영하세요. AI/DX 전용 섹션은 만들지 마세요 (해당 기사는 이메일 하단에 별도 블록으로 노출됩니다).\n" +
    "- 뻔한 뉴스 재나열 금물. 기사들을 관통하는 숨겨진 패러다임 변화와 선제적 대응 방향을 도출하세요.\n\n" +
    "[출력 규칙]\n" +
    '- "수신, 참조, 발신" 등 서두나 "이상입니다" 같은 맺음말 절대 금지.\n' +
    "- 단락 구분은 '가, 나, 다', '1), 2), 3)', '①, ②, ③' 체계 사용. 마크다운 불릿 금지.\n" +
    "- 핵심 문장은 **굵게** 처리. 표 사용 금지.\n" +
    "- 아래 섹션 헤더(`## 1` ~ `## 5`)를 글자 그대로 사용. 헤더 변형·삭제·번호 재배치 금지.\n" +
    "- ## 1은 맨 위에 배치되지만, 작성 시에는 반드시 ## 2 ~ ## 5의 분석을 먼저 머릿속으로 끝낸 뒤 그 결과를 응축하여 쓸 것.\n\n" +
    "[필수 출력 구조]\n\n" +
    "## 1. 종합결론 — 디벨로퍼가 읽어야 할 오늘의 판세\n" +
    "아래 ## 2 ~ ## 5 분석을 가로지른 종합 판단을 5~8문장 분량의 자연스러운 문단으로 작성하라.\n" +
    "다음을 모두 녹여 쓰되, \"결론1·결론2·결론3\" 같은 번호 라벨이나 불릿은 절대 사용하지 마라:\n" +
    "가. 오늘 시장을 관통하는 메가 시그널 (합의점·대립점·사각지대 포함)\n" +
    "나. 직전 영업일 대비 무엇이 유지·강화·반전됐는지 (직전 결론이 없으면 생략)\n" +
    "다. 디벨로퍼가 즉시 취해야 할 스탠스 한 줄 (핵심 문장만 **굵게**)\n" +
    "이 섹션 본문은 내일 브리핑 프롬프트에 \"직전 영업일 결론\"으로 자동 투입된다. 미래 자신이 어제의 판단을 추적할 수 있게 구체적 수치·키워드·방향을 명시할 것.\n\n" +
    "## 2. 관점별 분석\n" +
    "아래 6개 관점에서 각각 3~4문장으로 분석. 본문 인용·수치 인용을 적극 활용.\n" +
    "① 경제 관점 — 기준금리·시장금리·환율·인플레 채널\n" +
    "② PF 및 금융 관점 — PF 조달가능성·LTV·신용공여 한도·부실 PF 동향\n" +
    "③ 디벨로퍼 관점 — 사업지 선정·인허가·분양 타이밍\n" +
    "④ 마케팅 관점 — 수분양자 심리·청약 경쟁률·계약률·CSI 3종\n" +
    "⑤ 원가 관점 — 자재비·노무비·공기지연·표준건축비\n" +
    "⑥ 규제·세무 관점 — 규제·세제 변화·분쟁·소송 리스크\n\n" +
    "## 3. 어제 대비 변화\n" +
    "위 [직전 영업일 종합결론] 대비 — 변화 없는 항목은 적지 마라.\n" +
    "가. 유지·강화된 시그널\n" +
    "나. 반전·약화된 시그널\n" +
    '직전 결론이 없으면 본 섹션 본문을 "(첫 브리핑이므로 비교 불가)" 한 줄로만 작성하라.\n\n' +
    "## 4. 분양·입지 전략 및 선제 대응\n" +
    "핵심 트렌드 3가지를 뽑고 아래 포맷으로만 작성하라.\n" +
    "① [전략 키워드]\n- 왜(근거): (내용)\n- 무엇을(액션): (내용)\n\n";

  if (rateBlock) {
    mainPrompt +=
      "## 5. 금융·심리 환경 정량 진단\n" +
      "가. 기준금리·시장금리 추이 (방향, 변동폭, PF금리 추정)\n" +
      "나. 수분양자 자금조달 여건 (주담대 수준, DSR 부담 정량화)\n" +
      "다. 소비자 심리 지형도 (주택가격전망·부채전망·CCSI 종합 진단)\n" +
      "각 항목 2~3문장 이상.\n\n";
  } else {
    mainPrompt +=
      "## 5. 금융 환경 정성 진단\n" +
      "ECOS 데이터가 없으므로 뉴스 본문에서 추출 가능한 정성 신호만으로 진단하라. 2~3문장.\n\n";
  }

  if (hasFocus) {
    mainPrompt +=
      `## 6. 중점 분석 — ${focusPoint!.trim()}\n` +
      "위 분석과 별개로 이 이슈에 집중한 독자적 심층 분석을 작성하라. " +
      (rateBlock ? "관련 금리·CSI 수치가 있으면 반드시 인용. " : "") +
      "리스크와 기회 양면, 실행 가능한 대응 스탠스, 최소 6문장 이상.\n";
  }

  mainPrompt += "\n자, 최고의 브리핑 작성을 시작하라.";
  return mainPrompt;
}

const CONCLUSIONS_REGEX = /##\s*1\.\s*종합결론[^\n]*\r?\n([\s\S]*?)(?=\r?\n##\s|\s*$)/;

export function extractConclusions(report: string): string | null {
  const m = report.match(CONCLUSIONS_REGEX);
  if (!m) return null;
  const body = m[1].trim();
  return body || null;
}
