"use client";

import { useState } from "react";
import type { BriefingResult } from "@/lib/types";
import { MODEL_LABELS } from "@/lib/ai";
import EcosDashboard from "./EcosDashboard";
import NewsTabs from "./NewsTabs";
import EmailModal from "./EmailModal";
import ReportSections from "./ReportSections";

interface Props {
  result: BriefingResult;
  onLog: (line: string) => void;
}

export default function BriefingResultView({ result, onLog }: Props) {
  const [showEmail, setShowEmail] = useState(false);
  const modelLabel = result.aiModel
    ? MODEL_LABELS[result.aiModel] || String(result.aiModel)
    : "";

  function copyReport() {
    if (result.aiReport) {
      navigator.clipboard.writeText(result.aiReport);
      onLog("✅ AI 보고서 클립보드 복사 완료");
    }
  }

  function printReport() {
    window.print();
  }

  return (
    <>
      <div className="card">
        <div className="card-header">
          <div className="icon">📊</div>
          <div>
            <h2>분석 결과</h2>
            <p>AI 심층 브리핑 + ECOS 데이터 + 수집 뉴스</p>
          </div>
        </div>
        <div className="card-body">
          <div className="result-meta">
            <div className="kpi">
              <div className="kpi-label">REPORT TIME</div>
              <div className="kpi-value">{result.ts}</div>
            </div>
            <div className="kpi">
              <div className="kpi-label">수집 기사</div>
              <div className="kpi-value">{result.newsCount}건</div>
            </div>
            <div className="kpi">
              <div className="kpi-label">AI ENGINE</div>
              <div className="kpi-value" style={{ fontSize: 12 }}>
                {modelLabel}
              </div>
            </div>
          </div>

          <ReportSections aiReport={result.aiReport || ""} />


          {result.rateData?.success && (
            <EcosDashboard rateData={result.rateData} />
          )}

          {result.news && result.news.length > 0 && (
            <NewsTabs news={result.news} />
          )}

          <div className="action-bar">
            <button
              className="btn btn-primary"
              type="button"
              onClick={() => setShowEmail(true)}
            >
              📧 이메일로 발송
            </button>
            <button
              className="btn btn-secondary"
              type="button"
              onClick={copyReport}
            >
              📋 보고서 복사
            </button>
            <button
              className="btn btn-secondary"
              type="button"
              onClick={printReport}
            >
              🖨 인쇄
            </button>
          </div>
        </div>
      </div>

      {showEmail && (
        <EmailModal
          result={result}
          onClose={() => setShowEmail(false)}
          onLog={onLog}
        />
      )}
    </>
  );
}
