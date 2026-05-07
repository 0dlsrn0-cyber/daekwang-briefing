import { emailMdToHtml } from "../markdown";
import { MODEL_LABELS } from "../ai";
import type { BriefingResult, NewsItem } from "../types";

const SECTION_STYLES = [
  {
    numBg: "#1B365D",
    numColor: "#C9A84C",
    borderColor: "#1B365D",
    headerBg: "#F3F6FB",
    contentBg: "#F7FAFF",
    itemBorder: "#D8E2F2",
  },
  {
    numBg: "#264D85",
    numColor: "#FFFFFF",
    borderColor: "#264D85",
    headerBg: "#F3F7FD",
    contentBg: "#F8FBFF",
    itemBorder: "#D9E6F7",
  },
  {
    numBg: "#1A4D3C",
    numColor: "#FFFFFF",
    borderColor: "#1A4D3C",
    headerBg: "#F3FAF7",
    contentBg: "#F7FCFA",
    itemBorder: "#D8ECE4",
  },
  {
    numBg: "#4D1A3C",
    numColor: "#FFFFFF",
    borderColor: "#4D1A3C",
    headerBg: "#FCF5FA",
    contentBg: "#FFF9FD",
    itemBorder: "#EAD8E4",
  },
];

const FOCUS_STYLE = {
  numBg: "#7B5E2A",
  numColor: "#FFE89A",
  borderColor: "#C9A84C",
  headerBg: "#FFF8E1",
  contentBg: "#FFFCF2",
  itemBorder: "#E8D7A4",
};

const CSI_KEYS_MAP: Record<string, boolean> = {
  csi: true,
  debtCsi: true,
  ccsi: true,
};

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
    '<!DOCTYPE html><html lang="ko"><head><meta charset="UTF-8"></head>',
    "<body style=\"margin:0;padding:20px;background:#E4EBF5;font-family:'Malgun Gothic','Apple SD Gothic Neo',dotum,sans-serif;\">",
    '<table width="680" align="center" cellpadding="0" cellspacing="0" border="0" style="max-width:680px;width:100%;margin:0 auto;background:#FFFFFF;">',

    // [1] Top classification banner
    '<tr><td style="background:#060F20;padding:6px 24px;">',
    '<table width="100%" cellpadding="0" cellspacing="0"><tr>',
    '<td style="font-size:9px;color:#C9A84C;font-weight:700;letter-spacing:2.5px;">INTERNAL USE ONLY</td>',
    '<td style="font-size:9px;color:#374050;letter-spacing:1px;text-align:right;">DAEKWANG GROUP &middot; HOUSING MANAGEMENT TEAM</td>',
    "</tr></table></td></tr>",

    // [2] Header
    '<tr><td style="background:linear-gradient(135deg,#060F20 0%,#172A45 100%);padding:0;">',
    '<table width="100%" cellpadding="0" cellspacing="0"><tr>',
    '<td style="padding:36px 24px 36px 32px;" valign="top">',
    '<div style="font-size:10px;color:#C9A84C;font-weight:700;letter-spacing:3px;margin-bottom:14px;">DAEKWANG GROUP &middot; LOGEBIEN</div>',
    '<div style="font-size:24px;font-weight:900;color:#FFFFFF;letter-spacing:-1.5px;line-height:1.2;margin-bottom:10px;">부동산 동향<br>심층 분석 브리핑</div>',
    '<div style="font-size:11px;color:#4A5E70;letter-spacing:0.5px;">Real Estate Market Intelligence Report</div>',
    hasEcos
      ? '<div style="margin-top:10px;display:inline-block;background:rgba(201,168,76,0.15);border:1px solid rgba(201,168,76,0.3);border-radius:3px;padding:3px 10px;font-size:10px;color:#C9A84C;letter-spacing:1px;">&#127979; ECOS 11대 지표 통합 분석</div>'
      : "",
    "</td>",
    '<td style="padding:32px 32px 32px 0;vertical-align:top;width:185px;">',
    '<table cellpadding="0" cellspacing="0" align="right" style="background:rgba(255,255,255,0.05);border:1px solid rgba(201,168,76,0.2);border-radius:6px;">',
    '<tr><td style="padding:12px 16px;border-bottom:1px solid rgba(255,255,255,0.06);">',
    '<div style="font-size:9px;color:#4A5E70;letter-spacing:2px;margin-bottom:4px;">REPORT DATE</div>',
    `<div style="font-size:12px;color:#FFFFFF;font-weight:700;">${today}</div>`,
    "</td></tr>",
    '<tr><td style="padding:12px 16px;border-bottom:1px solid rgba(255,255,255,0.06);">',
    '<div style="font-size:9px;color:#4A5E70;letter-spacing:2px;margin-bottom:4px;">수집 기사</div>',
    `<div style="font-size:20px;color:#C9A84C;font-weight:900;line-height:1;">${newsCount}<span style="font-size:10px;color:#4A5E70;font-weight:400;"> 건</span></div>`,
    "</td></tr>",
    '<tr><td style="padding:12px 16px;">',
    '<div style="font-size:9px;color:#4A5E70;letter-spacing:2px;margin-bottom:4px;">AI ENGINE</div>',
    `<div style="font-size:10px;color:#8A9BB0;line-height:1.5;">${modelLabel}</div>`,
    "</td></tr>",
    "</table></td>",
    "</tr></table></td></tr>",

    // [3] Gold accent line
    '<tr><td style="height:3px;font-size:0;line-height:0;background:linear-gradient(90deg,#6A4F28,#C9A84C,#E5C96A,#C9A84C,#6A4F28);">&nbsp;</td></tr>',

    // [4] Report label
    '<tr><td style="padding:18px 32px 12px;background:#FAFBFD;border-bottom:1px solid #EDF0F7;">',
    '<table width="100%" cellpadding="0" cellspacing="0"><tr>',
    '<td><span style="font-size:11px;font-weight:800;color:#C9A84C;letter-spacing:2px;">AI DEEP ANALYSIS REPORT</span>',
    hasEcos
      ? '<span style="font-size:9px;color:#059669;font-weight:600;margin-left:10px;background:#ECFDF5;padding:2px 8px;border-radius:3px;border:1px solid #A7F3D0;">ECOS LIVE</span>'
      : "",
    "</td>",
    '<td style="text-align:right;"><span style="background:#1B365D;border-radius:3px;padding:4px 10px;font-size:9px;color:#FFFFFF;font-weight:700;letter-spacing:1px;">대광그룹 주택관리팀</span></td>',
    "</tr></table></td></tr>",

    // [5] AI report body
    `<tr><td style="padding:24px 32px 20px;background:#FAFBFD;">${reportHtml}</td></tr>`,

    // [6] ECOS section
    hasEcos
      ? `<tr><td style="padding:0 32px 28px;background:#FAFBFD;">` +
        `<div style="border-top:2px solid #1B365D;padding-top:18px;">` +
        `<table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:14px;"><tr>` +
        `<td><span style="background:linear-gradient(135deg,#1B365D,#264D85);color:#FFFFFF;font-size:10px;font-weight:800;padding:4px 10px;border-radius:3px;letter-spacing:1px;">ECOS DATA</span>` +
        `<span style="font-size:13px;font-weight:700;color:#1B365D;margin-left:8px;">한국은행 금융·심리 11대 지표</span></td>` +
        `<td style="text-align:right;"><span style="font-size:10px;color:#9AA3AE;">${rateData?.fetchedAt || today} 기준</span></td>` +
        `</tr></table>${rateHtml}</div></td></tr>`
      : "",

    // [7] Visual break
    '<tr><td style="background:linear-gradient(to right,#DDE3F0,#E8EDF5,#DDE3F0);height:8px;font-size:0;">&nbsp;</td></tr>',

    // [8] News header
    '<tr><td style="padding:26px 32px 14px;background:#FFFFFF;">',
    '<table width="100%" cellpadding="0" cellspacing="0"><tr>',
    '<td><span style="font-size:14px;font-weight:800;color:#0D1F3C;letter-spacing:-0.5px;">수집 뉴스 원문</span></td>',
    `<td style="text-align:right;"><span style="font-size:11px;color:#9AA3AE;">총 ${newsCount}건</span></td>`,
    '</tr><tr><td colspan="2" style="padding-top:6px;"><div style="height:2px;background:linear-gradient(90deg,#1B365D,rgba(27,54,93,0));"></div></td></tr>',
    "</table></td></tr>",

    // [9] News items
    `<tr><td style="padding:0 32px 32px;background:#FFFFFF;">${newsHtml}</td></tr>`,

    // [10] Footer
    '<tr><td style="background:linear-gradient(135deg,#060F20,#0D1F3C);padding:28px 32px;">',
    '<table width="100%" cellpadding="0" cellspacing="0"><tr>',
    '<td valign="top">',
    '<div style="font-size:20px;font-weight:900;color:#FFFFFF;letter-spacing:-1px;margin-bottom:6px;">대광<span style="color:#C9A84C;">로제비앙</span></div>',
    '<div style="font-size:11px;color:#374050;line-height:1.7;">대광그룹 주택관리팀<br>Daekwang Group &middot; Housing Management Team</div>',
    "</td>",
    '<td style="text-align:right;vertical-align:top;padding-left:20px;">',
    `<div style="font-size:10px;color:#374050;line-height:1.9;">본 보고서는 Google News RSS${hasEcos ? ", 한국은행 ECOS API" : ""} 및 AI가<br>자동 생성한 참고 자료입니다. 단독 의사결정에 활용 금지.<br><span style="color:#2A3040;">&copy; Daekwang Group. All rights reserved.</span></div>`,
    "</td></tr></table></td></tr>",

    // [11] Bottom classification strip
    '<tr><td style="background:#C9A84C;padding:5px 24px;">',
    '<table width="100%" cellpadding="0" cellspacing="0"><tr>',
    '<td style="font-size:9px;color:#3A2800;font-weight:800;letter-spacing:2.5px;">CONFIDENTIAL</td>',
    '<td style="font-size:9px;color:#5A4000;letter-spacing:1px;text-align:right;">외부 유출 금지 &middot; For Internal Distribution Only</td>',
    "</tr></table></td></tr>",

    "</table></body></html>",
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
          const bg = rowNum % 2 === 1 ? "#FFFFFF" : "#F8FAFC";
          return (
            `<tr><td style="background:${bg};padding:9px 0;border-bottom:1px solid #EFF2F8;">` +
            '<table width="100%" cellpadding="0" cellspacing="0"><tr>' +
            `<td width="22" valign="top" style="font-size:11px;color:#C9A84C;font-weight:700;padding-top:3px;">${rowNum}.</td>` +
            `<td><a href="${n.link}" style="font-size:13px;color:#1B365D;text-decoration:none;line-height:1.75;font-weight:500;">${n.title}</a></td>` +
            "</tr></table></td></tr>"
          );
        })
        .join("");
      return (
        '<div style="margin-bottom:22px;">' +
        '<div style="margin-bottom:8px;">' +
        `<span style="display:inline-block;background:#1B365D;padding:4px 10px;border-radius:3px;font-size:10px;font-weight:800;color:#FFFFFF;letter-spacing:1.5px;">${cat}</span>` +
        `<span style="font-size:11px;color:#9AA3AE;margin-left:8px;">${items.length}건</span>` +
        "</div>" +
        '<table width="100%" cellpadding="0" cellspacing="0" style="border-top:2px solid #1B365D;">' +
        rows +
        "</table>" +
        "</div>"
      );
    })
    .join("");
}

function renderRateHtml(rateData: NonNullable<BriefingResult["rateData"]>): string {
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

  let html =
    '<table width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;font-family:Malgun Gothic,Apple SD Gothic Neo,dotum,sans-serif;">';
  for (let ri = 0; ri < rateItems.length; ri++) {
    if (ri % 4 === 0) html += "<tr>";
    const item = rateItems[ri];
    const val =
      item.rate && item.rate.rate
        ? item.rate.rate + (item.csi ? "p" : "%")
        : "N/A";
    const valColor = item.csi ? "#059669" : "#1B365D";
    html +=
      `<td width="25%" style="padding:10px 6px;text-align:center;border:1px solid #E8EDF5;background:#FFFFFF;">` +
      `<div style="font-size:10px;color:#8892A4;font-weight:700;margin-bottom:4px;letter-spacing:-0.3px;">${item.label}</div>` +
      `<div style="font-size:16px;font-weight:900;color:${valColor};line-height:1;font-family:Malgun Gothic,Apple SD Gothic Neo,dotum,sans-serif;letter-spacing:0;">${val}</div>` +
      "</td>";
    if (ri % 4 === 3 || ri === rateItems.length - 1) html += "</tr>";
  }
  html += "</table>";

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
          return '<td style="text-align:right;color:#9CA3AF;border:1px solid #E8EDF5;padding:6px 8px;">-</td>';
        const n = parseFloat(v);
        const color = n > 0.005 ? "#DC2626" : n < -0.005 ? "#059669" : "#9CA3AF";
        return `<td style="text-align:right;color:${color};font-weight:700;border:1px solid #E8EDF5;padding:6px 8px;font-size:11px;">${n > 0 ? "+" : ""}${v}${dUnit}</td>`;
      };
      trendRows +=
        "<tr>" +
        `<td style="padding:6px 8px;font-weight:600;border:1px solid #E8EDF5;font-size:11px;color:#1B365D;">${t.label || key}</td>` +
        `<td style="text-align:right;border:1px solid #E8EDF5;padding:6px 8px;font-size:11px;">${t.current.rate ? t.current.rate + unit : "-"}</td>` +
        `<td style="text-align:right;border:1px solid #E8EDF5;padding:6px 8px;font-size:11px;">${t.ago3m ? t.ago3m.rate + unit : "-"}</td>` +
        `<td style="text-align:right;border:1px solid #E8EDF5;padding:6px 8px;font-size:11px;">${t.ago12m ? t.ago12m.rate + unit : "-"}</td>` +
        colorDelta(d3) +
        colorDelta(d12) +
        "</tr>";
    });

    html +=
      '<div style="margin-top:14px;font-family:Malgun Gothic,Apple SD Gothic Neo,dotum,sans-serif;">' +
      '<div style="font-size:10px;font-weight:700;color:#1B365D;margin-bottom:6px;letter-spacing:0.5px;">지표 변화 추이 (3M · 12M 전 대비)</div>' +
      '<table width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;">' +
      '<tr style="background:#1B365D;">' +
      '<th style="padding:7px 8px;text-align:left;color:#FFFFFF;font-size:10px;font-weight:600;border:1px solid #264D85;">지표</th>' +
      '<th style="padding:7px 8px;text-align:right;color:#FFFFFF;font-size:10px;font-weight:600;border:1px solid #264D85;">현재</th>' +
      '<th style="padding:7px 8px;text-align:right;color:#FFFFFF;font-size:10px;font-weight:600;border:1px solid #264D85;">3M 전</th>' +
      '<th style="padding:7px 8px;text-align:right;color:#FFFFFF;font-size:10px;font-weight:600;border:1px solid #264D85;">12M 전</th>' +
      '<th style="padding:7px 8px;text-align:right;color:#C9A84C;font-size:10px;font-weight:600;border:1px solid #264D85;">Δ3M</th>' +
      '<th style="padding:7px 8px;text-align:right;color:#C9A84C;font-size:10px;font-weight:600;border:1px solid #264D85;">Δ12M</th>' +
      "</tr>" +
      trendRows +
      "</table></div>";

    if (rd.mortgage && rd.mortgage.rate) {
      const annualRate = parseFloat(rd.mortgage.rate);
      const r = annualRate / 100 / 12;
      const n = 360;
      let dsrRows = "";
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
        dsrRows += `<td style="text-align:center;border:1px solid #E8EDF5;padding:8px;font-weight:700;color:#1B365D;font-size:13px;">월 ${Math.round(monthly / 10000).toLocaleString()}만원</td>`;
      });
      html +=
        '<div style="margin-top:14px;font-family:Malgun Gothic,Apple SD Gothic Neo,dotum,sans-serif;">' +
        `<div style="font-size:10px;font-weight:700;color:#1B365D;margin-bottom:6px;">DSR 40% 기준 월상환 추산 <span style="font-weight:400;color:#6B7280;">(주담대 ${rd.mortgage.rate}%, 30년 원리금균등, LTV 70%)</span></div>` +
        '<table width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;">' +
        '<tr style="background:#F8FAFC;">' +
        '<th style="padding:7px 8px;text-align:center;border:1px solid #E8EDF5;font-size:10px;color:#6B7280;font-weight:600;">분양가 5억</th>' +
        '<th style="padding:7px 8px;text-align:center;border:1px solid #E8EDF5;font-size:10px;color:#6B7280;font-weight:600;">분양가 7억</th>' +
        '<th style="padding:7px 8px;text-align:center;border:1px solid #E8EDF5;font-size:10px;color:#6B7280;font-weight:600;">분양가 10억</th>' +
        "</tr><tr>" +
        dsrRows +
        "</tr></table></div>";
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
    return `<div style="font-size:13.5px;color:#2D3748;line-height:1.85;padding:18px 20px;border:1px solid #D8E2F2;border-top:4px solid #1B365D;background:#F7FAFF;border-radius:6px;">${emailMdToHtml(aiReport || "")}</div>`;
  }

  return sections
    .map((sec, idx) => {
      const s = sec.isFocus
        ? FOCUS_STYLE
        : SECTION_STYLES[idx % SECTION_STYLES.length];
      let num = idx < 9 ? "0" + (idx + 1) : String(idx + 1);
      if (sec.isFocus) num = "★";

      const contentHtml = sec.lines
        .map((line) => {
          const t = line.trim();
          if (!t) return '<div style="height:5px;"></div>';
          if (/^[-─━=]{3,}$/.test(t)) return '<div style="height:6px;"></div>';
          const processed = emailMdToHtml(t).replace(
            /^-\s*(왜[^:]*:|무엇을[^:]*:)/,
            `- <strong style="color:${s.borderColor};">$1</strong>`,
          );
          const isLvl1 =
            /^[가-하]\./.test(t) || /^[①-⑨]/.test(t) || /^\d+\)/.test(t);
          const isLvl2 = /^[-·•]\s/.test(t);
          if (isLvl1) {
            return `<div style="margin:8px 0;padding:9px 12px;background:#FFFFFF;border:1px solid ${s.itemBorder};border-radius:4px;font-size:13px;color:#2D3748;line-height:1.85;letter-spacing:-0.2px;">${processed}</div>`;
          }
          if (isLvl2) {
            return `<div style="margin:5px 0 5px 12px;font-size:12.5px;color:#4A5568;line-height:1.8;">${processed}</div>`;
          }
          return `<div style="font-size:13.5px;color:#2D3748;line-height:1.85;margin:5px 0;letter-spacing:-0.3px;">${processed}</div>`;
        })
        .join("");

      const contentWrapper = `<div style="background:${s.contentBg};border-top:1px solid ${s.itemBorder};padding:16px 18px 18px;">${contentHtml}</div>`;

      return (
        `<div style="margin-bottom:24px;background:#FFFFFF;border:1px solid ${s.itemBorder};border-top:4px solid ${s.borderColor};border-radius:6px;">` +
        `<table width="100%" cellpadding="0" cellspacing="0" style="background:${s.headerBg};">` +
        `<tr>` +
        `<td width="42" valign="middle" style="padding:13px 0 13px 16px;">` +
        `<div style="width:30px;height:30px;background:${s.numBg};border-radius:4px;text-align:center;line-height:30px;font-size:${sec.isFocus ? "14" : "12"}px;font-weight:900;color:${s.numColor};font-family:Malgun Gothic,Apple SD Gothic Neo,dotum,sans-serif;letter-spacing:0;">${num}</div>` +
        `</td>` +
        `<td valign="middle" style="padding:13px 16px 13px 10px;">` +
        `<div style="font-size:15px;font-weight:800;color:#0D1F3C;letter-spacing:-0.5px;line-height:1.45;">${sec.title}</div>` +
        `</td></tr></table>` +
        contentWrapper +
        `</div>`
      );
    })
    .join("");
}
