import type { RateData } from "@/lib/types";

interface Props {
  rateData: RateData;
}

const CSI_KEYS = new Set(["csi", "debtCsi", "ccsi"]);

export default function EcosDashboard({ rateData }: Props) {
  const rd = rateData.rates;

  const cards = [
    { key: "baseRate", label: "기준금리" },
    { key: "mortgage", label: "주택담보대출" },
    { key: "household", label: "가계대출" },
    { key: "corporate", label: "기업대출" },
    { key: "bond3y", label: "국고채 3년" },
    { key: "bond10y", label: "국고채 10년" },
    { key: "cd", label: "CD 91일" },
    { key: "credit", label: "신용대출" },
  ] as const;

  const csiCards = [
    { key: "csi", label: "주택가격전망 CSI" },
    { key: "debtCsi", label: "가계부채전망 CSI" },
    { key: "ccsi", label: "소비자심리 CCSI" },
  ] as const;

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

  const dsr = (() => {
    const m = rd.mortgage?.rate ? parseFloat(rd.mortgage.rate) : null;
    if (!m) return null;
    const r = m / 100 / 12;
    const n = 360;
    return [5, 7, 10].map((eok) => {
      const loan = eok * 1e8 * 0.7;
      const monthly =
        r === 0
          ? loan / n
          : (loan * (r * Math.pow(1 + r, n))) / (Math.pow(1 + r, n) - 1);
      return { eok, monthly: Math.round(monthly / 10000) };
    });
  })();

  return (
    <div className="ecos-section">
      <div className="ecos-title">
        한국은행 ECOS · 11대 금리·심리지표 ({rateData.fetchedAt} 기준)
      </div>

      <div className="rate-grid">
        {cards.map((c) => {
          const v = rd[c.key];
          return (
            <div key={c.key} className="rate-card">
              <div className="rate-card-label">{c.label}</div>
              <div className="rate-card-value">
                {v?.rate ? `${v.rate}%` : "N/A"}
              </div>
            </div>
          );
        })}
      </div>

      <div className="csi-grid">
        {csiCards.map((c) => {
          const v = rd[c.key];
          return (
            <div key={c.key} className="rate-card csi">
              <div className="rate-card-label">{c.label}</div>
              <div className="rate-card-value">
                {v?.rate ? `${v.rate}p` : "N/A"}
              </div>
            </div>
          );
        })}
      </div>

      <div className="ecos-title" style={{ marginTop: 18 }}>
        지표 변화 추이 (3M · 12M 전 대비)
      </div>
      <table className="trend-table">
        <thead>
          <tr>
            <th>지표</th>
            <th>현재</th>
            <th>3M 전</th>
            <th>12M 전</th>
            <th style={{ color: "var(--gold-400)" }}>Δ3M</th>
            <th style={{ color: "var(--gold-400)" }}>Δ12M</th>
          </tr>
        </thead>
        <tbody>
          {trendOrder.map((k) => {
            const t = rateData.trends[k];
            if (!t || !t.current) return null;
            const isCsi = CSI_KEYS.has(k);
            const unit = isCsi ? "p" : "%";
            const dUnit = isCsi ? "p" : "pp";
            return (
              <tr key={k}>
                <td>{t.label}</td>
                <td>
                  {t.current.rate}
                  {unit}
                </td>
                <td>{t.ago3m ? `${t.ago3m.rate}${unit}` : "-"}</td>
                <td>{t.ago12m ? `${t.ago12m.rate}${unit}` : "-"}</td>
                <td>{renderDelta(t.ago3m?.changeFromPastToNowPp, dUnit)}</td>
                <td>{renderDelta(t.ago12m?.changeFromPastToNowPp, dUnit)}</td>
              </tr>
            );
          })}
        </tbody>
      </table>

      {dsr && rd.mortgage?.rate && (
        <>
          <div className="ecos-title" style={{ marginTop: 18 }}>
            DSR 40% 기준 월상환 추산 (주담대 {rd.mortgage.rate}%, 30년 원리금균등, LTV 70%)
          </div>
          <table className="dsr-table">
            <thead>
              <tr>
                {dsr.map((d) => (
                  <th key={d.eok}>분양가 {d.eok}억</th>
                ))}
              </tr>
            </thead>
            <tbody>
              <tr>
                {dsr.map((d) => (
                  <td key={d.eok}>월 {d.monthly.toLocaleString()}만원</td>
                ))}
              </tr>
            </tbody>
          </table>
        </>
      )}
    </div>
  );
}

function renderDelta(v: string | null | undefined, unit: string) {
  if (v == null)
    return <span className="delta-zero">-</span>;
  const n = parseFloat(v);
  const cls = n > 0.005 ? "delta-pos" : n < -0.005 ? "delta-neg" : "delta-zero";
  const prefix = n > 0 ? "+" : "";
  return (
    <span className={cls}>
      {prefix}
      {v}
      {unit}
    </span>
  );
}
