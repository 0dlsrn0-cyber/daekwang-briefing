import { buildRateTextForPrompt } from "../ecos";
import type { NewsItem, RateData } from "../types";

export function buildPrompt(
  newsList: NewsItem[],
  focusPoint: string | undefined,
  rateData: RateData | null | undefined,
): string {
  const newsText = newsList
    .map((n) => `[${n.category}] ${n.title}`)
    .join("\n");
  const hasFocus = focusPoint && focusPoint.trim();
  let rateBlock = "";
  if (rateData && rateData.success && rateData.rates) {
    rateBlock =
      "\n\n" +
      buildRateTextForPrompt(rateData.rates, rateData.trends || {}) +
      "\n";
  }

  let mainPrompt =
    "당신은 대광그룹 주택관리팀의 수석 부동산 전략 분석가입니다. 단순 정보 요약이 아니라, **시행사(디벨로퍼) 입장**에서 사업성과 리스크를 입체적으로 판단하는 것이 당신의 핵심 역할입니다.\n\n" +
    "아래 오늘 수집된 4개 카테고리 뉴스" +
    (rateBlock ? "와 **한국은행 ECOS 실시간 금리·심리지표 데이터**" : "") +
    "를 읽고, 내부 임원진이 무릎을 탁 칠 만한 심층 분석 브리핑을 작성하세요.\n\n" +
    "[오늘의 수집 뉴스]\n" +
    newsText +
    "\n" +
    rateBlock +
    "\n" +
    "[★ 디벨로퍼 관점 분석 핵심 지침 ★]\n" +
    '- 시행사는 뉴스를 "어디에 사업지를 잡을 것인가", "지금이 분양 타이밍인가", "원가 구조가 바뀌는가", "수분양자 자금 조달이 가능한가"의 렌즈로 읽습니다.\n' +
    '- 매크로/원자재 뉴스는 반드시 "공사원가 → 사업수지 → 분양가 설정"의 연결고리로 분석하세요.\n';

  if (rateBlock) {
    mainPrompt +=
      "- **데이터 활용 필수**: ECOS 실제 수치를 인용하여 PF 조달금리 및 잔금대출 환경을 정량적으로 진단하세요.\n" +
      "- **CSI 3종 활용 의무**: 아래 3가지 심리지표를 반드시 분석에 통합하세요.\n" +
      "  ① 주택가격전망CSI → 향후 주택가격 상승 기대 수준 (분양 타이밍 판단 기준)\n" +
      "  ② 가계부채전망CSI → 수분양자의 대출 부담 심리 (계약취소·미분양 선행 지표)\n" +
      "  ③ 소비자심리지수(CCSI) → 전반적 소비·구매 심리 (청약수요 온도계)\n" +
      '  → 이 3가지 지표를 금리 데이터와 교차 분석하여 "수분양자 심리 지형도"를 그려주세요.\n';
  }

  mainPrompt +=
    "- PF 대출 환경, 인허가 흐름, 미분양 리스크, 지역별 수급 온도차를 아우르는 종합 시각을 유지하세요.\n" +
    "- 뻔한 뉴스 재나열 금물. 기사들을 관통하는 숨겨진 패러다임 변화와 선제적 대응 방향을 도출하세요.\n\n" +
    "[분석 출력 지침]\n" +
    '- "수신, 참조, 발신" 등 불필요한 서두나 "이상입니다" 같은 맺음말 절대 금지.\n' +
    "- 단락 구분은 '가, 나, 다', '1), 2), 3)', '①, ②, ③' 체계 사용. 마크다운 불릿 금지.\n" +
    "- 핵심 문장은 **굵게** 처리. 표 사용 금지.\n\n" +
    "[필수 구조]\n\n" +
    "## 1. 시장 핵심 인사이트 — 디벨로퍼가 읽어야 할 오늘의 판세\n" +
    "4개 카테고리 뉴스 전체를 꿰뚫는 하나의 거시적 흐름을 4~6문장으로 압축하세요.\n\n";

  if (rateBlock) {
    mainPrompt +=
      "## 2. 원가·정책 리스크와 사업수지 영향\n가, 나, 다로 나누어 각 2~3문장 이상 서술.\n\n" +
      "## 3. 분양·입지 전략 및 선제 대응 방안\n" +
      "핵심 트렌드 3가지를 뽑고 반드시 아래 포맷으로만 작성하세요.\n" +
      "① [전략 키워드]\n- 왜(근거): (내용)\n- 무엇을(액션): (내용)\n\n" +
      "## 4. 금융·심리 환경 정량 진단\n" +
      "ECOS 수치와 CSI 3종을 기반으로 분석하세요.\n" +
      "가. 기준금리·시장금리 추이 (방향, 변동폭, PF금리 추정)\n" +
      "나. 수분양자 자금조달 여건 (주담대 수준, DSR 부담 정량화)\n" +
      "다. 소비자 심리 지형도 (주택가격전망·부채전망·CCSI 종합 진단)\n" +
      "각 항목 2~3문장 이상 서술.\n\n";
  } else {
    mainPrompt +=
      "## 2. 원가·금융 환경 변화와 사업수지 영향 분석\n가, 나, 다 각 2~3문장.\n\n" +
      "## 3. 분양·입지 전략 및 선제 대응 방안\n" +
      "핵심 트렌드 3가지를 뽑고 반드시 아래 포맷으로만 작성하세요.\n" +
      "① [전략 키워드]\n- 왜(근거): (내용)\n- 무엇을(액션): (내용)\n\n";
  }

  mainPrompt += "자, 최고의 브리핑 작성을 시작하세요.";

  if (hasFocus) {
    const focusSectionNum = rateBlock ? "5" : "4";
    mainPrompt +=
      `\n\n## ${focusSectionNum}. 중점 분석 — ${focusPoint!.trim()}\n` +
      "위 분석과 별개로, 이 이슈에 집중한 독자적 심층 분석을 작성하세요.\n" +
      (rateBlock ? "금리·CSI 데이터가 관련되면 반드시 수치를 인용하세요.\n" : "") +
      "리스크와 기회 양면, 실행 가능한 대응 스탠스, 최소 6문장 이상.";
  }

  return mainPrompt;
}
