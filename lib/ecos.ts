import type { Rate, RateData, RatesMap, Trend, TrendsMap } from "./types";

interface EcosRow {
  TIME: string;
  DATA_VALUE: string | null;
  ITEM_CODE1?: string;
  ITEM_NAME1?: string;
  ITEM_NAME2?: string;
  ITEM_NAME3?: string;
  ITEM_NAME4?: string;
}

const MONTHS = 18;

function formatYearMonth(d: Date): string {
  const seoul = new Date(d.getTime() + 9 * 60 * 60 * 1000);
  const y = seoul.getUTCFullYear();
  const m = String(seoul.getUTCMonth() + 1).padStart(2, "0");
  return `${y}${m}`;
}

function formatDate_(time?: string): string {
  if (!time || time.length < 6) return "-";
  return `${time.substring(0, 4)}년 ${time.substring(4, 6)}월`;
}

async function fetchECOS(
  apiKey: string,
  statCode: string,
  cycle: string,
  months?: number,
  item1?: string,
  item2?: string,
): Promise<EcosRow[]> {
  const today = new Date();
  const endM = formatYearMonth(today);
  const startObj = new Date();
  startObj.setMonth(startObj.getMonth() - (months || MONTHS));
  const startM = formatYearMonth(startObj);

  let url = `https://ecos.bok.or.kr/api/StatisticSearch/${apiKey}/json/kr/1/500/${statCode}/${cycle}/${startM}/${endM}/`;
  if (item1) url += `${item1}/`;
  if (item1 && item2) url += `${item2}/`;

  const res = await fetch(url);
  const json = await res.json();
  if (json.RESULT && json.RESULT.CODE && json.RESULT.CODE.startsWith("INFO-")) {
    throw new Error(`인증 오류: ${json.RESULT.MESSAGE}`);
  }
  return json?.StatisticSearch?.row ?? [];
}

function getLatest(rows: EcosRow[]): EcosRow | null {
  if (!rows?.length) return null;
  return [...rows].sort((a, b) => b.TIME.localeCompare(a.TIME))[0];
}

function getLatestByName(rows: EcosRow[], ...kws: string[]): EcosRow | null {
  if (!rows?.length) return null;
  const matched = rows.filter((r) => {
    const allNames = [r.ITEM_NAME1, r.ITEM_NAME2, r.ITEM_NAME3, r.ITEM_NAME4]
      .filter(Boolean)
      .join("|");
    return kws.every((kw) => allNames.indexOf(kw) >= 0);
  });
  if (!matched.length) return null;
  return matched.sort((a, b) => b.TIME.localeCompare(a.TIME))[0];
}

function getSortedRowsForItem(rows: EcosRow[], itemCode1: string): EcosRow[] {
  if (!rows?.length) return [];
  const code = String(itemCode1);
  return rows
    .filter((r) => String(r.ITEM_CODE1 || "") === code)
    .sort((a, b) => String(b.TIME).localeCompare(String(a.TIME)));
}

function getSortedRowsByName(rows: EcosRow[], ...keywords: string[]): EcosRow[] {
  if (!rows?.length) return [];
  return rows
    .filter((r) => {
      const allNames = [r.ITEM_NAME1, r.ITEM_NAME2, r.ITEM_NAME3, r.ITEM_NAME4]
        .filter(Boolean)
        .join("|");
      return keywords.every((kw) => allNames.indexOf(kw) >= 0);
    })
    .sort((a, b) => String(b.TIME).localeCompare(String(a.TIME)));
}

function getSortedUniqueByTime(rows: EcosRow[]): EcosRow[] {
  if (!rows?.length) return [];
  const sorted = [...rows].sort((a, b) =>
    String(b.TIME).localeCompare(String(a.TIME)),
  );
  const seen = new Set<string>();
  const out: EcosRow[] = [];
  for (const r of sorted) {
    const t = String(r.TIME || "");
    if (!t || seen.has(t)) continue;
    seen.add(t);
    out.push(r);
  }
  return out;
}

function makeRate(
  row: EcosRow | null | undefined,
  label: string,
  sublabel: string,
): Rate {
  if (!row || row.DATA_VALUE === null || row.DATA_VALUE === "") {
    return { label, sublabel, rate: null };
  }
  return {
    label,
    sublabel,
    rate: parseFloat(row.DATA_VALUE).toFixed(2),
    date: formatDate_(row.TIME),
    rawTime: row.TIME,
  };
}

function buildTrend(sortedRows: EcosRow[], label: string): Trend {
  const pick = (idx: number) => {
    const row = sortedRows[idx];
    if (!row || row.DATA_VALUE === null || row.DATA_VALUE === "") return null;
    return {
      rate: parseFloat(row.DATA_VALUE).toFixed(2),
      date: formatDate_(row.TIME),
      rawTime: row.TIME,
    };
  };
  const deltaPp = (a: { rate: string } | null, b: { rate: string } | null) => {
    if (!a || !b) return null;
    return (parseFloat(a.rate) - parseFloat(b.rate)).toFixed(2);
  };
  const cur = pick(0);
  const m3 = pick(3);
  const m6 = pick(6);
  const m12 = pick(12);
  return {
    label,
    current: cur,
    ago3m: m3
      ? { ...m3, changeFromPastToNowPp: cur ? deltaPp(cur, m3) : null }
      : null,
    ago6m: m6
      ? { ...m6, changeFromPastToNowPp: cur ? deltaPp(cur, m6) : null }
      : null,
    ago12m: m12
      ? { ...m12, changeFromPastToNowPp: cur ? deltaPp(cur, m12) : null }
      : null,
    monthsAvailable: sortedRows.length,
  };
}

export async function fetchAllRates(ecosApiKey: string): Promise<RateData> {
  const key = (ecosApiKey || "").trim();
  if (!key) {
    return {
      success: false,
      rates: {},
      trends: {},
      errors: ["ECOS API 키 없음"],
    };
  }

  const rates: RatesMap = {};
  const trends: TrendsMap = {};
  const errors: string[] = [];

  // 121Y006 — 예금은행 가중평균금리
  try {
    const rows121 = await fetchECOS(key, "121Y006", "M", MONTHS);
    const mortgageRows = getSortedRowsForItem(rows121, "1020000");
    const householdRows = getSortedRowsForItem(rows121, "1010000");
    const creditRows = getSortedRowsForItem(rows121, "1020200");
    const corpRows = getSortedRowsForItem(rows121, "1030000");

    rates.mortgage = makeRate(
      mortgageRows[0] || getLatestByName(rows121, "주택담보대출"),
      "주택담보대출",
      "예금은행 가중평균 (신규취급액)",
    );
    trends.mortgage = buildTrend(
      mortgageRows.length
        ? mortgageRows
        : getSortedRowsByName(rows121, "주택담보대출"),
      "주택담보대출",
    );

    rates.household = makeRate(
      householdRows[0] || getLatestByName(rows121, "가계대출"),
      "가계대출",
      "예금은행 가중평균 (신규취급액)",
    );
    trends.household = buildTrend(
      householdRows.length ? householdRows : getSortedRowsByName(rows121, "가계대출"),
      "가계대출",
    );

    rates.credit = makeRate(
      creditRows[0] || getLatestByName(rows121, "신용대출"),
      "신용대출",
      "예금은행 가중평균 (신규취급액)",
    );
    trends.credit = buildTrend(
      creditRows.length ? creditRows : getSortedRowsByName(rows121, "신용대출"),
      "신용대출",
    );

    rates.corporate = makeRate(
      corpRows[0] || getLatestByName(rows121, "기업대출"),
      "기업대출",
      "예금은행 가중평균 (신규취급액)",
    );
    trends.corporate = buildTrend(
      corpRows.length ? corpRows : getSortedRowsByName(rows121, "기업대출"),
      "기업대출",
    );
  } catch (e) {
    errors.push(`121Y006: ${(e as Error).message}`);
  }

  // 722Y001 — 기준금리
  try {
    const rows722 = await fetchECOS(key, "722Y001", "M", MONTHS);
    const series722 = getSortedUniqueByTime(rows722);
    rates.baseRate = makeRate(
      series722[0] || getLatest(rows722),
      "기준금리",
      "통화정책 기준금리",
    );
    trends.baseRate = buildTrend(
      series722.length
        ? series722
        : [...rows722].sort((a, b) =>
            String(b.TIME).localeCompare(String(a.TIME)),
          ),
      "기준금리",
    );
  } catch (e) {
    errors.push(`722Y001: ${(e as Error).message}`);
  }

  // 721Y001 — 시장금리
  try {
    const rows721 = await fetchECOS(key, "721Y001", "M", MONTHS);
    const bond3Rows = getSortedRowsByName(rows721, "국고채(3년)").length
      ? getSortedRowsByName(rows721, "국고채(3년)")
      : getSortedRowsByName(rows721, "국고채", "3년");
    const bond10Rows = getSortedRowsByName(rows721, "국고채(10년)").length
      ? getSortedRowsByName(rows721, "국고채(10년)")
      : getSortedRowsByName(rows721, "국고채", "10년");
    const cdRows = getSortedRowsByName(rows721, "CD(91일)").length
      ? getSortedRowsByName(rows721, "CD(91일)")
      : rows721
          .filter((r) => (r.ITEM_NAME1 || "").indexOf("CD") >= 0)
          .sort((a, b) => String(b.TIME).localeCompare(String(a.TIME)));

    rates.bond3y = makeRate(
      bond3Rows[0] || getLatestByName(rows721, "국고채(3년)"),
      "국고채 3년",
      "시장 지표금리",
    );
    trends.bond3y = buildTrend(bond3Rows, "국고채 3년");

    rates.bond10y = makeRate(
      bond10Rows[0] || getLatestByName(rows721, "국고채(10년)"),
      "국고채 10년",
      "장기 지표금리",
    );
    trends.bond10y = buildTrend(bond10Rows, "국고채 10년");

    rates.cd = makeRate(
      cdRows[0] || getLatestByName(rows721, "CD(91일)"),
      "CD 91일",
      "단기 지표금리",
    );
    trends.cd = buildTrend(cdRows, "CD 91일물");
  } catch (e) {
    errors.push(`721Y001: ${(e as Error).message}`);
  }

  // 511Y002 FMFB — 주택가격전망 CSI
  try {
    const csiRows = await fetchECOS(key, "511Y002", "M", MONTHS, "FMFB", "99988");
    csiRows.sort((a, b) => String(b.TIME).localeCompare(String(a.TIME)));
    rates.csi = makeRate(
      csiRows[0],
      "주택가격전망CSI",
      "소비자동향 · 100 초과=상승 전망",
    );
    trends.csi = buildTrend(csiRows, "주택가격전망CSI");
  } catch (e) {
    errors.push(`511Y002_FMFB: ${(e as Error).message}`);
  }

  // 511Y002 FMDD — 가계부채전망 CSI
  try {
    const debtRows = await fetchECOS(key, "511Y002", "M", MONTHS, "FMDD", "99988");
    debtRows.sort((a, b) => String(b.TIME).localeCompare(String(a.TIME)));
    rates.debtCsi = makeRate(
      debtRows[0],
      "가계부채전망CSI",
      "소비자동향 · 100 초과=부채증가 전망",
    );
    trends.debtCsi = buildTrend(debtRows, "가계부채전망CSI");
  } catch (e) {
    errors.push(`511Y002_FMDD: ${(e as Error).message}`);
  }

  // 511Y002 FME — 소비자심리지수
  try {
    const ccsiRows = await fetchECOS(key, "511Y002", "M", MONTHS, "FME");
    ccsiRows.sort((a, b) => String(b.TIME).localeCompare(String(a.TIME)));
    rates.ccsi = makeRate(
      ccsiRows[0],
      "소비자심리(CCSI)",
      "복합심리지수 · 100=장기평균",
    );
    trends.ccsi = buildTrend(ccsiRows, "소비자심리(CCSI)");
  } catch (e) {
    errors.push(`511Y002_FME: ${(e as Error).message}`);
  }

  const fetchedAt = new Date(Date.now() + 9 * 60 * 60 * 1000)
    .toISOString()
    .replace("T", " ")
    .substring(0, 16);

  const anyRate = Object.values(rates).some((v) => v && v.rate);

  return {
    success: errors.length === 0 || anyRate,
    rates,
    trends,
    errors: errors.length ? errors : null,
    fetchedAt,
  };
}

export function buildRateTextForPrompt(
  ratesData: RatesMap,
  trendsData: TrendsMap,
): string {
  const lines: string[] = [];
  lines.push("【한국은행 ECOS 최신 금리 및 심리지표 스냅샷】");
  const CSI_KEYS: Record<string, boolean> = {
    csi: true,
    debtCsi: true,
    ccsi: true,
  };
  const rateKeys = [
    "baseRate",
    "mortgage",
    "household",
    "corporate",
    "bond3y",
    "bond10y",
    "cd",
    "credit",
    "csi",
    "debtCsi",
    "ccsi",
  ] as const;

  rateKeys.forEach((k) => {
    const v = ratesData[k];
    if (!v || !v.label) return;
    const isCsi = !!CSI_KEYS[k];
    const rateStr = v.rate ? v.rate + (isCsi ? "p" : "%") : "조회불가";
    lines.push(
      `  · ${v.label}: ${rateStr}${v.date ? ` (${v.date} 기준)` : ""}`,
    );
  });

  lines.push("");
  lines.push("【CSI 해석 기준】");
  lines.push(
    "  · 주택가격전망CSI: 100 초과 → 향후 주택가격 상승 응답자 > 하락 응답자",
  );
  lines.push(
    "  · 가계부채전망CSI: 100 초과 → 향후 가계부채 증가 전망 응답자 우세 (수분양자 자금조달 압박 신호)",
  );
  lines.push(
    "  · 소비자심리지수(CCSI): 100=장기평균, 100 초과 → 소비심리 낙관 (청약·계약 의향 긍정적 영향)",
  );
  lines.push("");
  lines.push("【지표 변화 추이 (3·6·12개월 전 대비)】");

  const trendKeys = [
    "baseRate",
    "mortgage",
    "bond3y",
    "bond10y",
    "cd",
    "household",
    "corporate",
    "credit",
    "csi",
    "debtCsi",
    "ccsi",
  ] as const;

  trendKeys.forEach((k) => {
    const t = trendsData[k];
    if (!t || !t.current) return;
    const isCsi = !!CSI_KEYS[k];
    const unit = isCsi ? "p" : "%";
    const dUnit = isCsi ? "p" : "pp";
    const cur = `${t.current.rate}${unit} (${t.current.date || ""})`;
    const p3 = t.ago3m ? t.ago3m.rate + unit : "n/a";
    const p12 = t.ago12m ? t.ago12m.rate + unit : "n/a";
    const d3 =
      t.ago3m && t.ago3m.changeFromPastToNowPp != null
        ? `${parseFloat(t.ago3m.changeFromPastToNowPp) > 0 ? "+" : ""}${t.ago3m.changeFromPastToNowPp}${dUnit}`
        : "-";
    const d12 =
      t.ago12m && t.ago12m.changeFromPastToNowPp != null
        ? `${parseFloat(t.ago12m.changeFromPastToNowPp) > 0 ? "+" : ""}${t.ago12m.changeFromPastToNowPp}${dUnit}`
        : "-";
    lines.push(
      `  · ${t.label || k}: 현재 ${cur} | 3M전 ${p3} (Δ${d3}) | 12M전 ${p12} (Δ${d12})`,
    );
  });

  const mort = ratesData.mortgage;
  const mortRate = mort && mort.rate ? parseFloat(mort.rate) : null;
  if (mortRate) {
    lines.push("");
    lines.push(
      `【DSR 40% 기준 월상환 추산 (주담대 ${mortRate}%, 30년 원리금균등)】`,
    );
    const r = mortRate / 100 / 12;
    const n = 360;
    [5, 7, 10].forEach((eok) => {
      const loan = eok * 1e8 * 0.7;
      const monthly =
        r === 0
          ? loan / n
          : (loan * (r * Math.pow(1 + r, n))) / (Math.pow(1 + r, n) - 1);
      lines.push(
        `  · 분양가 ${eok}억 (LTV 70%): 월 약 ${Math.round(monthly / 10000)}만원`,
      );
    });
  }

  return lines.join("\n");
}
