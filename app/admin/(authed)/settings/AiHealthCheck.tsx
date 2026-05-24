"use client";

import { useState } from "react";
import type { AiModel } from "@/lib/types";

const MODELS: { value: AiModel; label: string }[] = [
  { value: "gemini", label: "Google Gemini 2.5 Flash" },
  { value: "gemini-flash-latest", label: "Google Gemini Flash Latest" },
];

type Status = "idle" | "running" | "ok" | "err";

interface RowState {
  status: Status;
  ms?: number;
  message?: string;
}

export default function AiHealthCheck() {
  const [aiKey, setAiKey] = useState("");
  const [rows, setRows] = useState<Record<AiModel, RowState>>(
    () =>
      Object.fromEntries(
        MODELS.map((m) => [m.value, { status: "idle" as Status }]),
      ) as Record<AiModel, RowState>,
  );
  const [busy, setBusy] = useState(false);

  async function pingOne(model: AiModel) {
    setRows((r) => ({ ...r, [model]: { status: "running" } }));
    try {
      const res = await fetch("/api/health/ai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ aiModel: model, aiKey: aiKey.trim() }),
        cache: "no-store",
      });
      const data = (await res.json()) as {
        success: boolean;
        duration_ms?: number;
        error?: string;
        preview?: string;
      };
      if (!data.success) {
        setRows((r) => ({
          ...r,
          [model]: {
            status: "err",
            ms: data.duration_ms,
            message: data.error || "실패",
          },
        }));
      } else {
        setRows((r) => ({
          ...r,
          [model]: {
            status: "ok",
            ms: data.duration_ms,
            message: data.preview,
          },
        }));
      }
    } catch (e) {
      setRows((r) => ({
        ...r,
        [model]: { status: "err", message: (e as Error).message },
      }));
    }
  }

  async function pingAll() {
    if (!aiKey.trim()) return;
    setBusy(true);
    for (const m of MODELS) {
      await pingOne(m.value);
    }
    setBusy(false);
  }

  function badge(s: Status) {
    if (s === "ok") return <span className="badge badge-ok">OK</span>;
    if (s === "err") return <span className="badge badge-err">FAIL</span>;
    if (s === "running") return <span className="badge badge-run">…</span>;
    return <span className="badge">-</span>;
  }

  return (
    <div className="card">
      <div className="card-header">
        <div className="icon">🩺</div>
        <div>
          <h2>AI 프로바이더 헬스체크</h2>
          <p>API 키를 입력해 각 모델이 실제로 응답하는지 확인</p>
        </div>
      </div>
      <div className="card-body">
        <div className="form-grid" style={{ marginBottom: 16 }}>
          <div className="form-group">
            <label>테스트할 API 키</label>
            <input
              type="password"
              value={aiKey}
              onChange={(e) => setAiKey(e.target.value)}
              placeholder="Google AI Studio API 키"
              disabled={busy}
            />
            <span className="input-hint">
              두 옵션 모두 Gemini API 키를 사용합니다. 최신 alias는 Google이
              Flash 계열 최신 모델로 자동 연결합니다.
            </span>
          </div>
        </div>

        <div className="btn-row" style={{ marginBottom: 16 }}>
          <button
            type="button"
            className="btn btn-primary"
            onClick={pingAll}
            disabled={busy || !aiKey.trim()}
          >
            {busy ? "테스트 중…" : "모든 모델 순차 테스트"}
          </button>
        </div>

        <ul className="recent-list">
          {MODELS.map((m) => {
            const r = rows[m.value];
            return (
              <li key={m.value}>
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "1fr 90px 70px 80px",
                    gap: 12,
                    alignItems: "center",
                    padding: "8px 0",
                  }}
                >
                  <div>
                    <strong>{m.label}</strong>
                    {r.message && (
                      <div
                        style={{
                          fontSize: 12,
                          color: r.status === "err" ? "#b03a2e" : "#57534e",
                          marginTop: 2,
                          maxWidth: 480,
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {r.message}
                      </div>
                    )}
                  </div>
                  <div>{badge(r.status)}</div>
                  <div style={{ fontSize: 12, color: "#57534e" }}>
                    {r.ms != null ? `${r.ms} ms` : ""}
                  </div>
                  <button
                    type="button"
                    className="btn btn-secondary"
                    style={{ padding: "4px 10px", fontSize: 12 }}
                    onClick={() => pingOne(m.value)}
                    disabled={busy || !aiKey.trim()}
                  >
                    개별 테스트
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}
