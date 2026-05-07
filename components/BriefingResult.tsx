"use client";

import { useMemo, useState } from "react";
import type { BriefingResult } from "@/lib/types";
import { mdToHtml } from "@/lib/markdown";
import { MODEL_LABELS } from "@/lib/ai";
import EcosDashboard from "./EcosDashboard";
import NewsTabs from "./NewsTabs";
import EmailModal from "./EmailModal";

interface Props {
  result: BriefingResult;
  onLog: (line: string) => void;
}

interface Section {
  title: string;
  body: string;
  isFocus: boolean;
}

function parseReport(aiReport: string): Section[] {
  const sections: Section[] = [];
  let curTitle = "";
  let curLines: string[] = [];
  let inSec = false;

  aiReport.split("\n").forEach((line) => {
    if (line.startsWith("## ")) {
      if (inSec) {
        sections.push({
          title: curTitle,
          body: curLines.join("\n"),
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
      body: curLines.join("\n"),
      isFocus: curTitle.indexOf("중점 분석") >= 0,
    });
  }
  return sections;
}

function renderSectionBody(body: string): string {
  return body
    .split("\n")
    .map((line) => {
      const t = line.trim();
      if (!t) return "<br/>";
      const processed = mdToHtml(t);
      const isLvl1 =
        /^[가-하]\./.test(t) || /^[①-⑨]/.test(t) || /^\d+\)/.test(t);
      if (isLvl1) {
        return `<div class="indent">${processed}</div>`;
      }
      return `<div>${processed}</div>`;
    })
    .join("");
}

export default function BriefingResultView({ result, onLog }: Props) {
  const sections = useMemo(
    () => parseReport(result.aiReport || ""),
    [result.aiReport],
  );
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

          {sections.length > 0 ? (
            sections.map((sec, idx) => (
              <div
                key={idx}
                className={`report-section ${sec.isFocus ? "focus" : ""}`}
              >
                <div className="report-section-header">
                  <div className="report-section-num">
                    {sec.isFocus ? "★" : String(idx + 1).padStart(2, "0")}
                  </div>
                  <div className="report-section-title">{sec.title}</div>
                </div>
                <div
                  className="report-section-body"
                  dangerouslySetInnerHTML={{
                    __html: renderSectionBody(sec.body),
                  }}
                />
              </div>
            ))
          ) : (
            <div
              className="report-section-body"
              dangerouslySetInnerHTML={{
                __html: mdToHtml(result.aiReport || ""),
              }}
            />
          )}

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
