import { emailMdToHtml } from "../markdown";
import { MODEL_LABELS } from "../ai";
import { AI_DX_CATEGORY } from "../news";
import type { BriefingResult, NewsItem } from "../types";

// 코워크브리핑 정본 디자인 (cowork-briefing/tools/render_email.mjs) 이식.
// 이메일 클라이언트 호환: table 레이아웃 + 인라인 style + 색 배경 td에 bgcolor 중복 지정.
const C = {
  cream50: "#faf9f5",
  cream100: "#f5f1e8",
  cream200: "#f0eee6",
  cream300: "#e8e2d5",
  cream400: "#d4cdb8",
  ink900: "#1a1715",
  ink800: "#2c2622",
  ink700: "#3d342f",
  ink600: "#57534e",
  ink500: "#78716c",
  ink400: "#a8a29e",
  terra700: "#b04e30",
  terra600: "#c2603f",
  terra500: "#d97757",
  terra100: "#fbeee6",
  terra50: "#fdf6f1",
  success: "#2d6a4f",
  danger: "#b03a2e",
};

const BAND = "#231916"; // 진한 브랜드 강조색 (헤더 제목 띠 · 푸터)
const BAND_EYE = "#d99a6c"; // 띠 위 eyebrow (라이트 테라)
const BAND_SUB = "#b5a99a"; // 띠 부제 (뮤트)
const STRIP = "#8a6d4b"; // 헤더 상단 얇은 줄

const FONT_STACK =
  "'Noto Sans KR','Pretendard','Apple SD Gothic Neo','Malgun Gothic',-apple-system,BlinkMacSystemFont,sans-serif";
const WORDMARK_FONT = "Georgia,'Times New Roman',serif";

const CSI_KEYS_MAP: Record<string, boolean> = {
  csi: true,
  debtCsi: true,
  ccsi: true,
};

const BASE_CSS = `
  body { -webkit-text-size-adjust: 100%; -ms-text-size-adjust: 100%; }
  table { border-collapse: collapse !important; }
  img { -ms-interpolation-mode: bicubic; }
  a { text-decoration: none; }
`;

// 이메일 안전 로고: 텍스트 워드마크 (base64 이미지는 Gmail 미표시 위험)
function logoWordmark(color: string, size = 30): string {
  const small = Math.round(size * 0.8);
  return (
    `<span style="font-family:${WORDMARK_FONT};font-size:${size}px;font-weight:700;color:${color};letter-spacing:2px;">` +
    `L<span style="font-size:${small}px;">OGEBIEN</span></span>`
  );
}

export function buildBriefingEmailHtml(result: BriefingResult): string {
  const news = result.news || [];
  const aiReport = result.aiReport || "";
  const ts = result.ts || "";
  const newsCount = result.newsCount || news.length;
  const rateData = result.rateData;
  const aiModel = result.aiModel;

  const modelLabel = aiModel
    ? MODEL_LABELS[aiModel] || String(aiModel)
    : "AI 분석 엔진";
  const today = (ts || "").split(/[ T]/)[0] || ts;
  const hasEcos = !!(rateData && rateData.success && rateData.rates);

  const newsHtml = renderNewsHtml(news);
  const rateHtml = hasEcos ? renderRateHtml(rateData!) : "";
  const reportHtml = renderReportHtml(aiReport);

  const ecosBlock = hasEcos
    ? `<div style="margin-bottom:16px;background-color:${C.cream50};border:1px solid ${C.cream300};border-radius:12px;padding:22px 24px;overflow:hidden;">` +
      `<div class="eyebrow" style="font-size:11px;font-weight:700;color:${C.terra700};letter-spacing:2.2px;margin-bottom:6px;text-transform:uppercase;">ECOS · 한국은행 11대 지표</div>` +
      `<div style="font-size:11px;color:${C.ink400};margin-bottom:16px;">${rateData?.fetchedAt || today} 기준</div>` +
      rateHtml +
      `</div>`
    : "";

  const newsBlock =
    `<div style="margin-bottom:16px;background-color:${C.cream50};border:1px solid ${C.cream300};border-radius:12px;padding:24px 26px;overflow:hidden;">` +
    `<div class="eyebrow" style="font-size:11px;font-weight:700;color:${C.terra700};letter-spacing:2.2px;margin-bottom:20px;text-transform:uppercase;">수집 뉴스 원문 <span style="color:${C.ink400};font-weight:500;margin-left:6px;letter-spacing:0.5px;">· 총 ${newsCount}건</span></div>` +
    newsHtml +
    `</div>`;

  return [
    `<!DOCTYPE html><html lang="ko"><head>`,
    `<meta charset="UTF-8">`,
    `<meta name="viewport" content="width=860,initial-scale=1,user-scalable=yes">`,
    `<meta name="x-apple-disable-message-reformatting">`,
    `<meta http-equiv="X-UA-Compatible" content="IE=edge">`,
    `<title>대광 로제비앙 부동산 동향 브리핑</title>`,
    `<style>${BASE_CSS}</style>`,
    `</head>`,
    `<body style="margin:0;padding:0;background-color:${C.cream100};font-family:${FONT_STACK};color:${C.ink800};-webkit-font-smoothing:antialiased;">`,

    // 받은편지함 미리보기 텍스트
    `<div style="display:none;max-height:0;overflow:hidden;mso-hide:all;color:${C.cream100};">부동산 동향 심층 분석 브리핑 · ${today} · 수집 뉴스 ${newsCount}건${hasEcos ? " · ECOS 11대 지표" : ""}</div>`,

    `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:${C.cream100};">`,
    `<tr><td align="center" style="padding:28px 16px;">`,

    // ===== 헤더 860 (자체 라운드 배너) =====
    `<table role="presentation" width="860" cellpadding="0" cellspacing="0" border="0" style="width:860px;max-width:100%;border:1px solid ${C.cream300};border-radius:14px;overflow:hidden;word-break:keep-all;">`,
    `<tr><td bgcolor="${STRIP}" style="background-color:${STRIP};height:6px;line-height:6px;font-size:0;">&nbsp;</td></tr>`,
    `<tr><td bgcolor="#ffffff" style="background-color:#ffffff;padding:22px 40px;">`,
    `<table width="100%" cellpadding="0" cellspacing="0" role="presentation"><tr>`,
    `<td valign="middle" align="left">${logoWordmark("#a9834e", 30)}</td>`,
    `<td valign="middle" align="right">`,
    `<div style="font-size:11px;color:${C.terra700};letter-spacing:2px;font-weight:700;">DAILY BRIEFING</div>`,
    `<div style="font-size:16px;color:${C.ink900};font-weight:700;margin-top:3px;letter-spacing:-0.2px;">${today}</div>`,
    `</td></tr></table>`,
    `</td></tr>`,
    `<tr><td bgcolor="${BAND}" style="background-color:${BAND};padding:30px 40px 28px;">`,
    `<div class="eyebrow" style="font-size:11px;font-weight:700;color:${BAND_EYE};letter-spacing:3px;margin-bottom:10px;">AI DEEP ANALYSIS REPORT</div>`,
    `<div class="h1" style="font-size:28px;font-weight:800;color:#ffffff;letter-spacing:-1px;line-height:1.2;">부동산 동향 심층 분석 브리핑</div>`,
    `<div style="font-size:13px;color:${BAND_SUB};margin-top:9px;">수집 뉴스 ${newsCount}건${hasEcos ? " · 한국은행 ECOS 11대 지표" : ""} · 대광그룹 주택관리팀</div>`,
    `</td></tr>`,
    `</table>`,

    // ===== 본문: 흰 박스 wrapper 없이 780 폭 카드들이 배경 위에 나열 =====
    `<table role="presentation" class="container" width="780" cellpadding="0" cellspacing="0" border="0" style="width:780px;max-width:100%;word-break:keep-all;">`,
    `<tr><td style="padding:20px 0 4px;">`,
    reportHtml,
    ecosBlock,
    `<div style="margin-bottom:16px;">${renderAiDxHtml(news)}</div>`,
    newsBlock,
    `</td></tr>`,
    `</table>`,

    // ===== 푸터 860 (진한 배너) =====
    `<table role="presentation" width="860" cellpadding="0" cellspacing="0" border="0" style="width:860px;max-width:100%;background-color:${BAND};border-radius:14px;overflow:hidden;word-break:keep-all;">`,
    `<tr><td bgcolor="${BAND}" style="background-color:${BAND};padding:28px 40px;">`,
    `<table class="footer-row" role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr>`,
    `<td valign="top">`,
    `<div style="margin-bottom:8px;">${logoWordmark("#c9a978", 24)}</div>`,
    `<div style="font-size:11px;color:${BAND_SUB};line-height:1.7;">대광그룹 주택관리팀<br>Daekwang Group · Housing Management Team</div>`,
    `</td>`,
    `<td class="footer-right" valign="top" align="right" style="padding-left:16px;">`,
    `<div style="margin-bottom:10px;">`,
    `<span style="display:inline-block;background-color:rgba(255,255,255,0.10);border:1px solid rgba(255,255,255,0.22);border-radius:14px;padding:3px 10px;font-size:10px;color:#efe7dc;font-weight:600;margin:0 0 4px 4px;">수집 ${newsCount}건</span>`,
    `<span style="display:inline-block;background-color:rgba(255,255,255,0.10);border:1px solid rgba(255,255,255,0.22);border-radius:14px;padding:3px 10px;font-size:10px;color:#efe7dc;font-weight:600;margin:0 0 4px 4px;">${modelLabel}</span>`,
    hasEcos
      ? `<span style="display:inline-block;background-color:rgba(217,151,108,0.18);border:1px solid rgba(217,151,108,0.4);border-radius:14px;padding:3px 10px;font-size:10px;color:${BAND_EYE};font-weight:700;margin:0 0 4px 4px;">● ECOS LIVE</span>`
      : "",
    `</div>`,
    `<div style="font-size:10px;color:#a89a8c;line-height:1.7;">본 보고서는 네이버·다음 뉴스${hasEcos ? ", 한국은행 ECOS API" : ""} 및 AI가<br>자동 생성한 참고 자료입니다. 단독 의사결정에 활용 금지.</div>`,
    `<div style="font-size:10px;color:#8a7d6f;margin-top:10px;letter-spacing:0.5px;">CONFIDENTIAL · INTERNAL USE ONLY · © Daekwang Group</div>`,
    `</td></tr></table>`,
    `</td></tr>`,
    `</table>`,

    `</td></tr></table>`,
    `</body></html>`,
  ].join("");
}

function renderAiDxHtml(news: NewsItem[]): string {
  const allItems = (news || []).filter((n) => n.category === AI_DX_CATEGORY);
  const items = allItems.slice(0, 3);
  const hasItems = allItems.length > 0;

  const itemHtml = hasItems
    ? items
        .map(
          (n, idx) =>
            `<tr><td style="padding:11px 0;border-bottom:1px solid ${C.cream300};">` +
            `<table width="100%" cellpadding="0" cellspacing="0" role="presentation"><tr>` +
            `<td valign="top" width="32" style="padding-top:2px;">` +
            `<table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr><td bgcolor="${C.ink800}" width="24" height="24" align="center" valign="middle" style="width:24px;height:24px;background-color:${C.ink800};color:${C.cream50};border-radius:6px;font-size:11px;font-weight:700;line-height:24px;">${idx + 1}</td></tr></table>` +
            `</td>` +
            `<td valign="top">` +
            `<a href="${n.link}" target="_blank" rel="noopener noreferrer" style="font-size:14px;color:${C.ink900};text-decoration:none;line-height:1.55;font-weight:600;">${n.title}</a>` +
            `<div style="font-size:11px;color:${C.ink500};line-height:1.7;margin-top:4px;">검토 포인트: 분양 상담, 마케팅 자동화, 원가·공정, 문서 검토, 입지 분석 업무와의 연결성</div>` +
            `</td>` +
            `</tr></table></td></tr>`,
        )
        .join("")
    : `<tr><td style="padding:14px 0;">` +
      `<div style="background-color:${C.cream100};border:1px dashed ${C.cream400};border-radius:8px;padding:16px 18px;font-size:13px;color:${C.ink700};line-height:1.7;">` +
      `<strong style="color:${C.ink900};">오늘은 부동산·건설·분양 업무와 직접 연결되는 AI/DX 주요 기사가 확인되지 않았습니다.</strong><br>` +
      `금일 브리핑은 정책, 금리, 분양시장, 원가 리스크 판단을 우선합니다.` +
      `</div></td></tr>`;

  return (
    `<div style="background-color:${C.cream50};border:1px solid ${C.cream300};border-radius:12px;overflow:hidden;">` +
    `<table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="background-color:${C.terra50};">` +
    `<tr><td valign="middle" style="padding:14px 18px;">` +
    `<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="display:inline-block;vertical-align:middle;"><tr><td bgcolor="${C.ink800}" style="background-color:${C.ink800};color:#ffffff;font-size:10px;font-weight:700;padding:4px 10px;border-radius:4px;letter-spacing:1.2px;white-space:nowrap;">AI/DX SIGNAL</td></tr></table>` +
    `<span style="font-size:14px;font-weight:700;color:${C.ink900};margin-left:10px;letter-spacing:-0.3px;">오늘의 부동산 AI/DX 시그널</span>` +
    `</td><td valign="middle" align="right" style="padding:14px 18px;">` +
    `<span style="font-size:11px;color:${hasItems ? C.success : C.ink500};font-weight:700;white-space:nowrap;">${hasItems ? allItems.length + "건 감지" : "직접 관련 기사 없음"}</span>` +
    `</td></tr></table>` +
    `<div style="padding:4px 18px 16px;background-color:${C.cream50};">` +
    `<table width="100%" cellpadding="0" cellspacing="0" role="presentation">${itemHtml}</table>` +
    `</div></div>`
  );
}

function renderNewsHtml(news: NewsItem[]): string {
  const categories: Record<string, NewsItem[]> = {};
  news.forEach((n) => {
    if (!categories[n.category]) categories[n.category] = [];
    categories[n.category].push(n);
  });

  let rowNum = 0;
  return Object.keys(categories)
    .map((cat) => {
      const items = categories[cat];
      const rows = items
        .map((n) => {
          rowNum++;
          return (
            `<tr><td style="padding:11px 0;border-bottom:1px solid ${C.cream300};">` +
            `<table width="100%" cellpadding="0" cellspacing="0" role="presentation"><tr>` +
            `<td valign="top" width="32" style="font-size:11px;color:${C.terra600};font-weight:700;padding-top:3px;letter-spacing:0;">${String(rowNum).padStart(2, "0")}</td>` +
            `<td><a href="${n.link}" target="_blank" rel="noopener noreferrer" class="news-title" style="font-size:14px;color:${C.ink800};text-decoration:none;line-height:1.6;font-weight:500;">${n.title}</a></td>` +
            `</tr></table></td></tr>`
          );
        })
        .join("");
      return (
        `<div style="margin-bottom:24px;">` +
        `<div style="margin-bottom:8px;">` +
        `<span style="display:inline-block;width:6px;height:6px;background-color:${C.terra500};border-radius:50%;margin-right:8px;vertical-align:middle;"></span>` +
        `<span style="font-size:12px;color:${C.ink800};font-weight:700;letter-spacing:0.2px;vertical-align:middle;">${cat}</span>` +
        `<span style="font-size:11px;color:${C.ink400};font-weight:500;margin-left:8px;vertical-align:middle;">${items.length}건</span>` +
        `</div>` +
        `<table width="100%" cellpadding="0" cellspacing="0" role="presentation">` +
        rows +
        `</table>` +
        `</div>`
      );
    })
    .join("");
}

function renderRateHtml(
  rateData: NonNullable<BriefingResult["rateData"]>,
): string {
  const rd = rateData.rates;
  const rateItems = [
    { label: "기준금리", rate: rd.baseRate, csi: false },
    { label: "주택담보대출", rate: rd.mortgage, csi: false },
    { label: "가계대출", rate: rd.household, csi: false },
    { label: "기업대출", rate: rd.corporate, csi: false },
    { label: "국고채 3년", rate: rd.bond3y, csi: false },
    { label: "국고채 10년", rate: rd.bond10y, csi: false },
    { label: "CD 91일", rate: rd.cd, csi: false },
    { label: "신용대출", rate: rd.credit, csi: false },
    { label: "주택가격전망CSI", rate: rd.csi, csi: true },
    { label: "가계부채전망CSI", rate: rd.debtCsi, csi: true },
    { label: "소비자심리(CCSI)", rate: rd.ccsi, csi: true },
  ];

  let html = `<table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="border-collapse:collapse;">`;
  for (let i = 0; i < rateItems.length; i += 4) {
    html += `<tr>`;
    for (let j = 0; j < 4; j++) {
      const item = rateItems[i + j];
      if (!item) {
        html += `<td class="rate-cell" width="25%" style="background-color:transparent;border:0;"></td>`;
        continue;
      }
      const val =
        item.rate && item.rate.rate
          ? item.rate.rate + (item.csi ? "p" : "%")
          : "N/A";
      const valColor = item.csi ? C.success : C.ink900;
      html +=
        `<td class="rate-cell" width="25%" style="padding:14px 8px;text-align:center;border:1px solid ${C.cream300};background-color:${C.cream50};vertical-align:middle;">` +
        `<div style="font-size:10px;color:${C.ink500};font-weight:600;margin-bottom:6px;letter-spacing:0.3px;">${item.label}</div>` +
        `<div style="font-size:18px;font-weight:700;color:${valColor};line-height:1;letter-spacing:-0.3px;">${val}</div>` +
        `</td>`;
    }
    html += `</tr>`;
  }
  html += `</table>`;

  if (rateData.trends) {
    const trendOrder = [
      "baseRate",
      "mortgage",
      "bond3y",
      "bond10y",
      "cd",
      "csi",
      "debtCsi",
      "ccsi",
    ] as const;

    let trendRows = "";
    trendOrder.forEach((key) => {
      const t = rateData.trends[key];
      if (!t || !t.current) return;
      const isCsi = !!CSI_KEYS_MAP[key];
      const unit = isCsi ? "p" : "%";
      const dUnit = isCsi ? "p" : "pp";
      const d3 =
        t.ago3m && t.ago3m.changeFromPastToNowPp != null
          ? t.ago3m.changeFromPastToNowPp
          : null;
      const d12 =
        t.ago12m && t.ago12m.changeFromPastToNowPp != null
          ? t.ago12m.changeFromPastToNowPp
          : null;
      const colorDelta = (v: string | null) => {
        if (v === null)
          return `<td style="text-align:right;color:${C.ink400};border-bottom:1px solid ${C.cream300};padding:9px 10px;font-size:11px;">-</td>`;
        const n = parseFloat(v);
        const color = n > 0.005 ? C.danger : n < -0.005 ? C.success : C.ink400;
        return `<td style="text-align:right;color:${color};font-weight:700;border-bottom:1px solid ${C.cream300};padding:9px 10px;font-size:11px;">${n > 0 ? "+" : ""}${v}${dUnit}</td>`;
      };
      trendRows +=
        `<tr>` +
        `<td style="padding:9px 10px;font-weight:600;border-bottom:1px solid ${C.cream300};font-size:11px;color:${C.ink800};">${t.label || key}</td>` +
        `<td style="text-align:right;border-bottom:1px solid ${C.cream300};padding:9px 10px;font-size:11px;color:${C.ink800};font-weight:600;">${t.current.rate ? t.current.rate + unit : "-"}</td>` +
        `<td style="text-align:right;border-bottom:1px solid ${C.cream300};padding:9px 10px;font-size:11px;color:${C.ink500};">${t.ago3m ? t.ago3m.rate + unit : "-"}</td>` +
        `<td style="text-align:right;border-bottom:1px solid ${C.cream300};padding:9px 10px;font-size:11px;color:${C.ink500};">${t.ago12m ? t.ago12m.rate + unit : "-"}</td>` +
        colorDelta(d3) +
        colorDelta(d12) +
        `</tr>`;
    });

    html +=
      `<div style="margin-top:24px;">` +
      `<div style="font-size:11px;font-weight:700;color:${C.ink700};margin-bottom:10px;letter-spacing:0.5px;">지표 변화 추이 <span style="color:${C.ink400};font-weight:500;">(3M · 12M 전 대비)</span></div>` +
      `<table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="border-collapse:collapse;background-color:${C.cream50};border:1px solid ${C.cream300};">` +
      `<tr style="background-color:${C.cream200};">` +
      `<th style="padding:9px 10px;text-align:left;color:${C.ink700};font-size:10px;font-weight:700;border-bottom:1px solid ${C.cream300};letter-spacing:0.3px;">지표</th>` +
      `<th style="padding:9px 10px;text-align:right;color:${C.ink700};font-size:10px;font-weight:700;border-bottom:1px solid ${C.cream300};letter-spacing:0.3px;">현재</th>` +
      `<th style="padding:9px 10px;text-align:right;color:${C.ink500};font-size:10px;font-weight:700;border-bottom:1px solid ${C.cream300};letter-spacing:0.3px;">3M 전</th>` +
      `<th style="padding:9px 10px;text-align:right;color:${C.ink500};font-size:10px;font-weight:700;border-bottom:1px solid ${C.cream300};letter-spacing:0.3px;">12M 전</th>` +
      `<th style="padding:9px 10px;text-align:right;color:${C.terra700};font-size:10px;font-weight:700;border-bottom:1px solid ${C.cream300};letter-spacing:0.3px;">Δ3M</th>` +
      `<th style="padding:9px 10px;text-align:right;color:${C.terra700};font-size:10px;font-weight:700;border-bottom:1px solid ${C.cream300};letter-spacing:0.3px;">Δ12M</th>` +
      `</tr>` +
      trendRows +
      `</table></div>`;

    if (rd.mortgage && rd.mortgage.rate) {
      const annualRate = parseFloat(rd.mortgage.rate);
      const r = annualRate / 100 / 12;
      const n = 360;
      let dsrCells = "";
      let dsrHeaders = "";
      [
        [5, "5억"],
        [7, "7억"],
        [10, "10억"],
      ].forEach((pair) => {
        const loan = (pair[0] as number) * 1e8 * 0.7;
        const monthly =
          r === 0
            ? loan / n
            : (loan * (r * Math.pow(1 + r, n))) / (Math.pow(1 + r, n) - 1);
        dsrHeaders += `<th style="padding:10px 8px;text-align:center;border:1px solid ${C.cream300};font-size:10px;color:${C.ink600};font-weight:600;background-color:${C.cream200};">분양가 ${pair[1]}</th>`;
        dsrCells += `<td style="text-align:center;border:1px solid ${C.cream300};padding:14px 8px;font-weight:700;color:${C.ink900};font-size:14px;background-color:${C.cream50};">월 ${Math.round(monthly / 10000).toLocaleString()}만원</td>`;
      });
      html +=
        `<div style="margin-top:22px;">` +
        `<div style="font-size:11px;font-weight:700;color:${C.ink700};margin-bottom:10px;letter-spacing:0.5px;">DSR 40% 기준 월상환 추산 <span style="color:${C.ink400};font-weight:500;">(주담대 ${rd.mortgage.rate}%, 30년 원리금균등, LTV 70%)</span></div>` +
        `<table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="border-collapse:collapse;">` +
        `<tr>` +
        dsrHeaders +
        `</tr><tr>` +
        dsrCells +
        `</tr></table></div>`;
    }
  }

  return html;
}

function renderReportHtml(aiReport: string): string {
  const sections: { title: string; lines: string[]; isFocus: boolean }[] = [];
  let curTitle = "";
  let curLines: string[] = [];
  let inSec = false;

  (aiReport || "").split("\n").forEach((line) => {
    if (line.indexOf("## ") === 0) {
      if (inSec) {
        sections.push({
          title: curTitle,
          lines: curLines.slice(),
          isFocus: curTitle.indexOf("중점 분석") >= 0,
        });
      }
      curTitle = line
        .replace(/^##\s+/, "")
        .replace(/^\d+\.\s*/, "")
        .replace(/^★\s*/, "");
      curLines = [];
      inSec = true;
    } else if (inSec) {
      curLines.push(line);
    }
  });
  if (inSec && curTitle) {
    sections.push({
      title: curTitle,
      lines: curLines,
      isFocus: curTitle.indexOf("중점 분석") >= 0,
    });
  }

  if (sections.length === 0) {
    return `<div style="font-size:14px;color:${C.ink800};line-height:1.85;padding:22px 24px;background-color:${C.cream100};border:1px solid ${C.cream300};border-radius:12px;">${emailMdToHtml(aiReport || "")}</div>`;
  }

  return sections
    .map((sec, idx) => {
      const isFocus = sec.isFocus;
      const num = isFocus ? "★" : String(idx + 1).padStart(2, "0");
      const cardBg = isFocus ? C.terra50 : C.cream50;
      const cardBorder = isFocus ? C.terra100 : C.cream300;
      const badgeBg = isFocus ? C.terra600 : C.ink800;
      const badgeColor = isFocus ? "#ffffff" : C.cream50;

      const contentHtml = sec.lines
        .map((line) => {
          const t = line.trim();
          if (!t)
            return `<div style="height:12px;line-height:12px;font-size:0;">&nbsp;</div>`;
          if (/^[-─━=]{3,}$/.test(t))
            return `<div style="height:8px;line-height:8px;font-size:0;">&nbsp;</div>`;
          const processed = emailMdToHtml(t).replace(
            /^-\s*(왜[^:]*:|무엇을[^:]*:)/,
            `- <strong style="color:${C.ink700};">$1</strong>`,
          );
          const isLvl1 =
            /^[가-하]\./.test(t) || /^[①-⑨]/.test(t) || /^\d+\)/.test(t);
          const isLvl2 = /^[-·•]\s/.test(t);
          if (isLvl1)
            return `<div style="margin:10px 0 2px;font-size:14px;color:${C.ink800};line-height:1.9;">${processed}</div>`;
          if (isLvl2)
            return `<div style="margin:4px 0 4px 14px;font-size:14px;color:${C.ink800};line-height:1.9;">${processed}</div>`;
          return `<div style="font-size:14px;color:${C.ink800};line-height:1.9;margin:3px 0;">${processed}</div>`;
        })
        .join("");

      return (
        `<div style="margin-bottom:20px;background-color:${cardBg};border:1px solid ${cardBorder};border-radius:12px;overflow:hidden;">` +
        `<table width="100%" cellpadding="0" cellspacing="0" role="presentation"><tr>` +
        `<td valign="middle" style="padding:16px 0 14px 18px;width:50px;">` +
        `<table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr><td bgcolor="${badgeBg}" width="34" height="34" align="center" valign="middle" style="width:34px;height:34px;background-color:${badgeBg};color:${badgeColor};border-radius:8px;font-size:${isFocus ? "15" : "13"}px;font-weight:700;line-height:34px;">${num}</td></tr></table>` +
        `</td>` +
        `<td valign="middle" style="padding:16px 18px 14px 12px;">` +
        `<div class="h2" style="font-size:16px;font-weight:700;color:${C.ink900};letter-spacing:-0.3px;line-height:1.4;">${sec.title}</div>` +
        `</td></tr></table>` +
        `<div style="padding:0 18px 18px;">${contentHtml}</div>` +
        `</div>`
      );
    })
    .join("");
}
