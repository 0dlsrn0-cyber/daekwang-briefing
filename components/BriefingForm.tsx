"use client";

import { useEffect, useState } from "react";
import type { AiModel, BriefingResult } from "@/lib/types";

const MODEL_OPTIONS: { value: AiModel; label: string }[] = [
  { value: "gemini", label: "Google Gemini 2.5 Flash" },
  { value: "gemini-flash-latest", label: "Google Gemini Flash Latest" },
];

function normalizeAiModel(value: string | null): AiModel {
  return value === "gemini-flash-latest" ? "gemini-flash-latest" : "gemini";
}

interface Props {
  onResult: (r: BriefingResult) => void;
  onLog: (line: string) => void;
}

export default function BriefingForm({ onResult, onLog }: Props) {
  const [aiModel, setAiModel] = useState<AiModel>("gemini");
  const [aiKey, setAiKey] = useState("");
  const [ecosKey, setEcosKey] = useState("");
  const [focusPoint, setFocusPoint] = useState("");
  const [running, setRunning] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (typeof window === "undefined") return;
    const savedModel = normalizeAiModel(sessionStorage.getItem("aiModel"));
    setAiModel(savedModel);
    sessionStorage.setItem("aiModel", savedModel);
    setAiKey(sessionStorage.getItem("aiKey") || "");
    setEcosKey(sessionStorage.getItem("ecosKey") || "");
    setFocusPoint(sessionStorage.getItem("focusPoint") || "");
  }, []);

  function persist(name: string, value: string) {
    if (typeof window !== "undefined") sessionStorage.setItem(name, value);
  }

  async function handleRun(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (!aiKey.trim()) {
      setError("AI API 키를 입력해 주세요.");
      return;
    }
    setRunning(true);
    onLog("브리핑 실행을 시작합니다…");
    onLog(`모델: ${aiModel}`);
    onLog("뉴스 수집 + ECOS 금리 + AI 분석 (최대 약 30~40초 소요)");

    try {
      const res = await fetch("/api/briefing", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          aiKey: aiKey.trim(),
          aiModel,
          focusPoint: focusPoint.trim(),
          ecosKey: ecosKey.trim(),
        }),
      });
      const data: BriefingResult = await res.json();
      if (!data.success) {
        setError(data.error || "분석 실패");
        onLog(`❌ ${data.error}`);
      } else {
        onLog(`✅ 완료: 뉴스 ${data.newsCount}건, AI 모델 ${data.aiModel}`);
        onResult(data);
      }
    } catch (err) {
      setError((err as Error).message);
      onLog(`❌ 네트워크 오류: ${(err as Error).message}`);
    } finally {
      setRunning(false);
    }
  }

  return (
    <form onSubmit={handleRun}>
      <div className="form-grid">
        <div className="form-group">
          <label>AI 모델</label>
          <select
            value={aiModel}
            onChange={(e) => {
              const v = e.target.value as AiModel;
              setAiModel(v);
              persist("aiModel", v);
            }}
            disabled={running}
          >
            {MODEL_OPTIONS.map((m) => (
              <option key={m.value} value={m.value}>
                {m.label}
              </option>
            ))}
          </select>
          <span className="input-hint">
            최신 alias는 Google이 Flash 계열 최신 모델로 자동 연결합니다.
          </span>
        </div>

        <div className="form-group">
          <label>AI API 키</label>
          <input
            type="password"
            value={aiKey}
            onChange={(e) => {
              setAiKey(e.target.value);
              persist("aiKey", e.target.value);
            }}
            placeholder="예: AIzaSy..."
            disabled={running}
            required
          />
          <span className="input-hint">
            세션 동안만 브라우저에 저장됨 (서버 저장 안 함).
          </span>
        </div>

        <div className="form-group">
          <label>ECOS API 키 (선택)</label>
          <input
            type="password"
            value={ecosKey}
            onChange={(e) => {
              setEcosKey(e.target.value);
              persist("ecosKey", e.target.value);
            }}
            placeholder="한국은행 ECOS API 키"
            disabled={running}
          />
          <span className="input-hint">
            입력 시 11대 금리·심리 지표가 분석에 통합됩니다.
          </span>
        </div>

        <div className="form-group">
          <label>중점 분석 주제 (선택)</label>
          <input
            type="text"
            value={focusPoint}
            onChange={(e) => {
              setFocusPoint(e.target.value);
              persist("focusPoint", e.target.value);
            }}
            placeholder="예: 1기 신도시 재건축, PF 만기 도래 영향"
            disabled={running}
          />
        </div>
      </div>

      <div className="btn-row">
        <button type="submit" className="btn btn-primary" disabled={running}>
          {running ? "분석 중…" : "브리핑 실행"}
        </button>
      </div>

      {error && <div className="alert">{error}</div>}
    </form>
  );
}
