import { emailMdToHtml } from "../markdown";
import { MODEL_LABELS } from "../ai";
import type { BriefingResult, NewsItem } from "../types";

// 웹과 통일된 Anthropic 톤 (globals.css 토큰과 동기화)
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

const FONT_STACK =
  "'Noto Sans KR','Pretendard','Apple SD Gothic Neo','Malgun Gothic',-apple-system,BlinkMacSystemFont,sans-serif";

const CSI_KEYS_MAP: Record<string, boolean> = {
  csi: true,
  debtCsi: true,
  ccsi: true,
};

// 600px 이하에서 적용되는 모바일 보정. 인라인 스타일을 미디어쿼리로 오버라이드한다.
const RESPONSIVE_CSS = `
  body { -webkit-text-size-adjust: 100%; -ms-text-size-adjust: 100%; }
  table { border-collapse: collapse !important; }
  img { -ms-interpolation-mode: bicubic; }
  a { text-decoration: none; }

  @media only screen and (max-width: 600px) {
    .container { width: 100% !important; max-width: 100% !important; border-radius: 0 !important; border-left: 0 !important; border-right: 0 !important; }
    .px-outer { padding-left: 20px !important; padding-right: 20px !important; }
    .py-block { padding-top: 24px !important; padding-bottom: 24px !important; }
    .h1 { font-size: 24px !important; line-height: 1.22 !important; }
    .h2 { font-size: 15px !important; }
    .eyebrow { font-size: 10px !important; letter-spacing: 1.8px !important; }
    .header-row > tbody > tr > td.right-meta {
      display: block !important;
      width: 100% !important;
      text-align: left !important;
      padding: 14px 0 0 0 !important;
    }
    .rate-cell {
      width: 50% !important;
      display: inline-block !important;
      box-sizing: border-box !important;
    }
    .trend-hide { display: none !important; }
    .footer-row > tbody > tr > td.footer-right {
      display: block !important;
      width: 100% !important;
      text-align: left !important;
      padding: 14px 0 0 0 !important;
    }
    .section-num { width: 30px !important; height: 30px !important; line-height: 30px !important; font-size: 12px !important; }
    .news-title { font-size: 14px !important; }
    .chip { margin-bottom: 6px !important; }
  }
`;

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
  const today = (ts || "").split(" ")[0] || ts;
  const hasEcos = !!(rateData && rateData.success && rateData.rates);

  const newsHtml = renderNewsHtml(news);
  const rateHtml = hasEcos ? renderRateHtml(rateData!) : "";
  const reportHtml = renderReportHtml(aiReport);

  return [
    `<!DOCTYPE html><html lang="ko"><head>`,
    `<meta charset="UTF-8">`,
    `<meta name="viewport" content="width=device-width,initial-scale=1">`,
    `<meta name="x-apple-disable-message-reformatting">`,
    `<meta http-equiv="X-UA-Compatible" content="IE=edge">`,
    `<title>대광 로제비앙 부동산 동향 브리핑</title>`,
    `<style>${RESPONSIVE_CSS}</style>`,
    `</head>`,
    `<body style="margin:0;padding:0;background:${C.cream100};font-family:${FONT_STACK};color:${C.ink800};-webkit-font-smoothing:antialiased;">`,

    // 받은편지함 미리보기 텍스트
    `<div style="display:none;max-height:0;overflow:hidden;mso-hide:all;color:${C.cream100};">부동산 동향 심층 분석 브리핑 · ${today} · 수집 뉴스 ${newsCount}건${hasEcos ? " · ECOS 11대 지표" : ""}</div>`,

    // 바깥 래퍼
    `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:${C.cream100};">`,
    `<tr><td align="center" style="padding:28px 16px;">`,
    `<table role="presentation" class="container" width="600" cellpadding="0" cellspacing="0" border="0" style="max-width:600px;width:100%;background:${C.cream50};border:1px solid ${C.cream300};border-radius:14px;overflow:hidden;">`,

    // [1] HEADER
    `<tr><td class="px-outer py-block" style="padding:36px 40px 28px;">`,
    `<table class="header-row" role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr>`,
    `<td valign="top">`,
    `<div class="eyebrow" style="font-size:11px;font-weight:700;color:${C.terra700};letter-spacing:2.5px;text-transform:uppercase;margin-bottom:14px;">DAEKWANG · LOGEBIEN</div>`,
    `<div class="h1" style="font-size:30px;font-weight:700;color:${C.ink900};letter-spacing:-1px;line-height:1.18;margin-bottom:10px;">부동산 동향<br>심층 분석 브리핑</div>`,
    `<div style="font-size:13px;color:${C.ink500};letter-spacing:0.2px;">Real Estate Market Intelligence Report</div>`,
    `</td>`,
    `<td class="right-meta" valign="top" align="right" style="padding-left:16px;width:130px;">`,
    `<div style="font-size:10px;color:${C.ink400};letter-spacing:1.8px;font-weight:600;margin-bottom:4px;">REPORT DATE</div>`,
    `<div style="font-size:15px;color:${C.ink800};font-weight:700;letter-spacing:-0.3px;">${today}</div>`,
    `</td>`,
    `</tr></table>`,

    // 메타 칩 (수집 건수, AI 엔진, ECOS)
    `<div style="margin-top:20px;line-height:0;">`,
    `<span class="chip" style="display:inline-block;background:${C.cream100};border:1px solid ${C.cream300};border-radius:20px;padding:6px 14px;font-size:11px;color:${C.ink700};font-weight:600;letter-spacing:0.3px;margin-right:6px;line-height:1.4;">수집 ${newsCount}건</span>`,
    `<span class="chip" style="display:inline-block;background:${C.cream100};border:1px solid ${C.cream300};border-radius:20px;padding:6px 14px;font-size:11px;color:${C.ink700};font-weight:600;letter-spacing:0.3px;margin-right:6px;line-height:1.4;">${modelLabel}</span>`,
    hasEcos
      ? `<span class="chip" style="display:inline-block;background:${C.terra50};border:1px solid ${C.terra100};border-radius:20px;padding:6px 14px;font-size:11px;color:${C.terra700};font-weight:700;letter-spacing:0.3px;line-height:1.4;">● ECOS 11대 지표 LIVE</span>`
      : "",
    `</div>`,
    `</td></tr>`,

    // [2] divider
    `<tr><td class="px-outer" style="padding:0 40px;"><div style="height:1px;background:${C.cream300};"></div></td></tr>`,

    // [3] AI REPORT
    `<tr><td class="px-outer py-block" style="padding:30px 40px;">`,
    `<div class="eyebrow" style="font-size:11px;font-weight:700;color:${C.terra700};letter-spacing:2.2px;margin-bottom:20px;text-transform:uppercase;">AI Deep Analysis Report</div>`,
    reportHtml,
    `</td></tr>`,

    // [4] ECOS
    hasEcos
      ? `<tr><td class="px-outer" style="padding:0 40px 30px;">` +
        `<div style="height:1px;background:${C.cream300};margin-bottom:26px;"></div>` +
        `<div class="eyebrow" style="font-size:11px;font-weight:700;color:${C.terra700};letter-spacing:2.2px;margin-bottom:14px;text-transform:uppercase;">ECOS · 한국은행 11대 지표</div>` +
        `<div style="font-size:11px;color:${C.ink400};margin-bottom:14px;">${rateData?.fetchedAt || today} 기준</div>` +
        rateHtml +
        `</td></tr>`
      : "",

    // [5] divider
    `<tr><td class="px-outer" style="padding:0 40px;"><div style="height:1px;background:${C.cream300};"></div></td></tr>`,

    // [6] NEWS
    `<tr><td class="px-outer py-block" style="padding:30px 40px;">`,
    `<div class="eyebrow" style="font-size:11px;font-weight:700;color:${C.terra700};letter-spacing:2.2px;margin-bottom:20px;text-transform:uppercase;">수집 뉴스 원문 <span style="color:${C.ink400};font-weight:500;margin-left:6px;letter-spacing:0.5px;">· 총 ${newsCount}건</span></div>`,
    newsHtml,
    `</td></tr>`,

    // [7] FOOTER
    `<tr><td class="px-outer" style="padding:28px 40px;background:${C.cream200};">`,
    `<table class="footer-row" role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr>`,
    `<td valign="top">`,
    `<div style="font-size:18px;font-weight:700;color:${C.ink800};letter-spacing:-0.5px;margin-bottom:4px;">대광<span style="color:${C.terra600};">로제비앙</span></div>`,
    `<div style="font-size:11px;color:${C.ink500};line-height:1.7;">대광그룹 주택관리팀<br>Daekwang Group · Housing Management Team</div>`,
    `</td>`,
    `<td class="footer-right" valign="top" align="right" style="padding-left:16px;">`,
    `<div style="font-size:10px;color:${C.ink500};line-height:1.7;">본 보고서는 Google News RSS${hasEcos ? ", 한국은행 ECOS API" : ""} 및 AI가<br>자동 생성한 참고 자료입니다. 단독 의사결정에 활용 금지.</div>`,
    `<div style="font-size:10px;color:${C.ink400};margin-top:10px;letter-spacing:0.5px;">CONFIDENTIAL · INTERNAL USE ONLY · © Daekwang Group</div>`,
    `</td></tr></table>`,
    `</td></tr>`,

    `</table>`,
    `</td></tr></table>`,
    `</body></html>`,
  ].join("");
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
            `<td><a href="${n.link}" class="news-title" style="font-size:14px;color:${C.ink800};text-decoration:none;line-height:1.6;font-weight:500;">${n.title}</a></td>` +
            `</tr></table></td></tr>`
          );
        })
        .join("");
      return (
        `<div style="margin-bottom:24px;">` +
        `<div style="margin-bottom:8px;">` +
        `<span style="display:inline-block;width:6px;height:6px;background:${C.terra500};border-radius:50%;margin-right:8px;vertical-align:middle;"></span>` +
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
        html += `<td class="rate-cell" width="25%" style="background:transparent;border:0;"></td>`;
        continue;
      }
      const val =
        item.rate && item.rate.rate
          ? item.rate.rate + (item.csi ? "p" : "%")
          : "N/A";
      const valColor = item.csi ? C.success : C.ink900;
      html +=
        `<td class="rate-cell" width="25%" style="padding:14px 8px;text-align:center;border:1px solid ${C.cream300};background:${C.cream50};vertical-align:middle;">` +
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
        `<td class="trend-hide" style="text-align:right;border-bottom:1px solid ${C.cream300};padding:9px 10px;font-size:11px;color:${C.ink500};">${t.ago3m ? t.ago3m.rate + unit : "-"}</td>` +
        `<td class="trend-hide" style="text-align:right;border-bottom:1px solid ${C.cream300};padding:9px 10px;font-size:11px;color:${C.ink500};">${t.ago12m ? t.ago12m.rate + unit : "-"}</td>` +
        colorDelta(d3) +
        colorDelta(d12) +
        `</tr>`;
    });

    html +=
      `<div style="margin-top:24px;">` +
      `<div style="font-size:11px;font-weight:700;color:${C.ink700};margin-bottom:10px;letter-spacing:0.5px;">지표 변화 추이 <span style="color:${C.ink400};font-weight:500;">(3M · 12M 전 대비)</span></div>` +
      `<table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="border-collapse:collapse;background:${C.cream50};border:1px solid ${C.cream300};">` +
      `<tr style="background:${C.cream200};">` +
      `<th style="padding:9px 10px;text-align:left;color:${C.ink700};font-size:10px;font-weight:700;border-bottom:1px solid ${C.cream300};letter-spacing:0.3px;">지표</th>` +
      `<th style="padding:9px 10px;text-align:right;color:${C.ink700};font-size:10px;font-weight:700;border-bottom:1px solid ${C.cream300};letter-spacing:0.3px;">현재</th>` +
      `<th class="trend-hide" style="padding:9px 10px;text-align:right;color:${C.ink500};font-size:10px;font-weight:700;border-bottom:1px solid ${C.cream300};letter-spacing:0.3px;">3M 전</th>` +
      `<th class="trend-hide" style="padding:9px 10px;text-align:right;color:${C.ink500};font-size:10px;font-weight:700;border-bottom:1px solid ${C.cream300};letter-spacing:0.3px;">12M 전</th>` +
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
        dsrHeaders += `<th style="padding:10px 8px;text-align:center;border:1px solid ${C.cream300};font-size:10px;color:${C.ink600};font-weight:600;background:${C.cream200};">분양가 ${pair[1]}</th>`;
        dsrCells += `<td style="text-align:center;border:1px solid ${C.cream300};padding:14px 8px;font-weight:700;color:${C.ink900};font-size:14px;background:${C.cream50};">월 ${Math.round(monthly / 10000).toLocaleString()}만원</td>`;
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
    return `<div style="font-size:14px;color:${C.ink800};line-height:1.85;padding:22px 24px;background:${C.cream100};border:1px solid ${C.cream300};border-radius:12px;">${emailMdToHtml(aiReport || "")}</div>`;
  }

  return sections
    .map((sec, idx) => {
      const isFocus = sec.isFocus;
      const accentColor = isFocus ? C.terra700 : C.terra600;
      const num = isFocus ? "★" : String(idx + 1).padStart(2, "0");
      const cardBg = isFocus ? C.terra50 : C.cream50;
      const cardBorder = isFocus ? C.terra100 : C.cream300;
      const badgeBg = isFocus ? C.terra600 : C.ink800;
      const badgeColor = isFocus ? "#ffffff" : C.cream50;

      const contentHtml = sec.lines
        .map((line) => {
          const t = line.trim();
          if (!t) return `<div style="height:6px;line-height:6px;font-size:0;">&nbsp;</div>`;
          if (/^[-─━=]{3,}$/.test(t))
            return `<div style="height:8px;line-height:8px;font-size:0;">&nbsp;</div>`;
          const processed = emailMdToHtml(t).replace(
            /^-\s*(왜[^:]*:|무엇을[^:]*:)/,
            `- <strong style="color:${accentColor};">$1</strong>`,
          );
          const isLvl1 =
            /^[가-하]\./.test(t) || /^[①-⑨]/.test(t) || /^\d+\)/.test(t);
          const isLvl2 = /^[-·•]\s/.test(t);
          if (isLvl1) {
            return `<div style="margin:8px 0;padding:11px 14px;background:#ffffff;border:1px solid ${C.cream300};border-left:3px solid ${accentColor};border-radius:8px;font-size:14px;color:${C.ink800};line-height:1.75;">${processed}</div>`;
          }
          if (isLvl2) {
            return `<div style="margin:5px 0 5px 14px;font-size:13.5px;color:${C.ink700};line-height:1.7;">${processed}</div>`;
          }
          return `<div style="font-size:14px;color:${C.ink800};line-height:1.75;margin:6px 0;">${processed}</div>`;
        })
        .join("");

      return (
        `<div style="margin-bottom:20px;background:${cardBg};border:1px solid ${cardBorder};border-radius:12px;overflow:hidden;">` +
        `<table width="100%" cellpadding="0" cellspacing="0" role="presentation"><tr>` +
        `<td valign="middle" style="padding:16px 0 14px 18px;width:50px;">` +
        `<div class="section-num" style="width:34px;height:34px;background:${badgeBg};color:${badgeColor};border-radius:8px;text-align:center;line-height:34px;font-size:${isFocus ? "15" : "13"}px;font-weight:700;letter-spacing:0;">${num}</div>` +
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
