"use client";

import { useEffect, useState } from "react";
import type {
  AiAvailability,
  AiModel,
  AiTier,
  BriefingResult,
} from "@/lib/types";
import { MODELS } from "@/lib/ai";

const MODEL_ORDER: AiModel[] = [
  "gemini",
  "gemini-flash-latest",
  "mistral",
  "grok",
];

interface Props {
  availability: AiAvailability;
  onResult: (r: BriefingResult) => void;
  onLog: (line: string) => void;
}

export default function BriefingForm({ availability, onResult, onLog }: Props) {
  // 사용 가능한 모델 = 프로바이더에 무료/유료 키 중 하나라도 설정된 것
  const usableModels = MODEL_ORDER.filter((m) => {
    const a = availability[MODELS[m].provider];
    return a && (a.free || a.paid);
  });

  const [aiModel, setAiModel] = useState<AiModel>(usableModels[0] ?? "gemini");
  const [tier, setTier] = useState<AiTier>("free");
  const [focusPoint, setFocusPoint] = useState("");
  const [running, setRunning] = useState(false);
  const [error, setError] = useState("");

  function tiersFor(m: AiModel) {
    return availability[MODELS[m].provider] ?? { free: false, paid: false };
  }

  // 선호 요금제가 없으면 설정된 다른 요금제로 보정
  function pickTier(m: AiModel, preferred: AiTier): AiTier {
    const a = tiersFor(m);
    if (a[preferred]) return preferred;
    return a.free ? "free" : "paid";
  }

  useEffect(() => {
    if (typeof window === "undefined") return;
    const savedModel = sessionStorage.getItem("aiModel") as AiModel | null;
    const savedTier = sessionStorage.getItem("aiTier") as AiTier | null;
    const model =
      savedModel && usableModels.includes(savedModel)
        ? savedModel
        : usableModels[0] ?? "gemini";
    const t = pickTier(model, savedTier === "paid" ? "paid" : "free");
    setAiModel(model);
    setTier(t);
    sessionStorage.setItem("aiModel", model);
    sessionStorage.setItem("aiTier", t);
    setFocusPoint(sessionStorage.getItem("focusPoint") || "");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function changeModel(m: AiModel) {
    const t = pickTier(m, tier);
    setAiModel(m);
    setTier(t);
    sessionStorage.setItem("aiModel", m);
    sessionStorage.setItem("aiTier", t);
  }

  function changeTier(t: AiTier) {
    if (!tiersFor(aiModel)[t]) return;
    setTier(t);
    sessionStorage.setItem("aiTier", t);
  }

  async function handleRun(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setRunning(true);
    onLog("브리핑 실행을 시작합니다…");
    onLog(`모델: ${MODELS[aiModel].label} (${tier === "paid" ? "유료" : "무료"})`);
    onLog("뉴스 수집 + ECOS 금리 + AI 분석 (최대 약 30~40초 소요)");

    try {
      const res = await fetch("/api/briefing", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          aiModel,
          tier,
          focusPoint: focusPoint.trim(),
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

  if (usableModels.length === 0) {
    return (
      <div className="alert">
        사용 가능한 AI 키가 서버에 설정되지 않았습니다. 환경변수
        (GEMINI/MISTRAL/XAI · ECOS API KEY)를 설정해 주세요.
      </div>
    );
  }

  const avail = tiersFor(aiModel);

  return (
    <form onSubmit={handleRun}>
      <div className="form-grid">
        <div className="form-group">
          <label>AI 프로바이더</label>
          <select
            value={aiModel}
            onChange={(e) => changeModel(e.target.value as AiModel)}
            disabled={running}
          >
            {usableModels.map((m) => (
              <option key={m} value={m}>
                {MODELS[m].label}
              </option>
            ))}
          </select>
          <span className="input-hint">
            API 키는 서버 환경변수로 관리됩니다 (브라우저에 저장하지 않음).
          </span>
        </div>

        <div className="form-group">
          <label>요금제</label>
          <div className="tier-toggle" role="radiogroup" aria-label="요금제">
            <label
              className={`tier-option${tier === "free" ? " is-active" : ""}${
                !avail.free ? " is-disabled" : ""
              }`}
            >
              <input
                type="radio"
                name="tier"
                value="free"
                checked={tier === "free"}
                disabled={running || !avail.free}
                onChange={() => changeTier("free")}
              />
              무료
            </label>
            <label
              className={`tier-option${tier === "paid" ? " is-active" : ""}${
                !avail.paid ? " is-disabled" : ""
              }`}
            >
              <input
                type="radio"
                name="tier"
                value="paid"
                checked={tier === "paid"}
                disabled={running || !avail.paid}
                onChange={() => changeTier("paid")}
              />
              유료
            </label>
          </div>
          <span className="input-hint">
            설정된 키가 있는 요금제만 선택할 수 있습니다.
          </span>
        </div>

        <div className="form-group">
          <label>중점 분석 주제 (선택)</label>
          <input
            type="text"
            value={focusPoint}
            onChange={(e) => {
              setFocusPoint(e.target.value);
              if (typeof window !== "undefined")
                sessionStorage.setItem("focusPoint", e.target.value);
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
