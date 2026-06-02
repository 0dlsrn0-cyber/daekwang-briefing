"use client";

import { useState } from "react";
import type { AiAvailability, AiModel, AiTier } from "@/lib/types";
import { MODELS } from "@/lib/ai";

const MODEL_ORDER: AiModel[] = [
  "gemini",
  "gemini-flash-latest",
  "mistral",
  "grok",
];

type Status = "idle" | "running" | "ok" | "err";

interface RowState {
  status: Status;
  ms?: number;
  message?: string;
}

interface Combo {
  key: string;
  aiModel: AiModel;
  tier: AiTier;
  label: string;
}

function buildCombos(availability: AiAvailability): Combo[] {
  const combos: Combo[] = [];
  for (const m of MODEL_ORDER) {
    const a = availability[MODELS[m].provider];
    if (!a) continue;
    (["free", "paid"] as AiTier[]).forEach((tier) => {
      if (!a[tier]) return;
      combos.push({
        key: `${m}:${tier}`,
        aiModel: m,
        tier,
        label: `${MODELS[m].label} · ${tier === "paid" ? "유료" : "무료"}`,
      });
    });
  }
  return combos;
}

export default function AiHealthCheck({
  availability,
}: {
  availability: AiAvailability;
}) {
  const combos = buildCombos(availability);
  const [rows, setRows] = useState<Record<string, RowState>>(() =>
    Object.fromEntries(combos.map((c) => [c.key, { status: "idle" as Status }])),
  );
  const [busy, setBusy] = useState(false);

  async function pingOne(c: Combo) {
    setRows((r) => ({ ...r, [c.key]: { status: "running" } }));
    try {
      const res = await fetch("/api/health/ai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ aiModel: c.aiModel, tier: c.tier }),
        cache: "no-store",
      });
      const data = (await res.json()) as {
        success: boolean;
        duration_ms?: number;
        error?: string;
        preview?: string;
      };
      setRows((r) => ({
        ...r,
        [c.key]: {
          status: data.success ? "ok" : "err",
          ms: data.duration_ms,
          message: data.success ? data.preview : data.error || "실패",
        },
      }));
    } catch (e) {
      setRows((r) => ({
        ...r,
        [c.key]: { status: "err", message: (e as Error).message },
      }));
    }
  }

  async function pingAll() {
    setBusy(true);
    for (const c of combos) {
      await pingOne(c);
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
          <p>서버 환경변수의 키로 각 모델·요금제가 실제로 응답하는지 확인</p>
        </div>
      </div>
      <div className="card-body">
        {combos.length === 0 ? (
          <div className="alert">
            설정된 AI 키가 없습니다. 환경변수
            (GEMINI/MISTRAL/XAI API KEY)를 설정해 주세요.
          </div>
        ) : (
          <>
            <div className="btn-row" style={{ marginBottom: 16 }}>
              <button
                type="button"
                className="btn btn-primary"
                onClick={pingAll}
                disabled={busy}
              >
                {busy ? "테스트 중…" : "설정된 모델 전체 테스트"}
              </button>
            </div>

            <ul className="recent-list">
              {combos.map((c) => {
                const r = rows[c.key];
                return (
                  <li key={c.key}>
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
                        <strong>{c.label}</strong>
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
                        onClick={() => pingOne(c)}
                        disabled={busy}
                      >
                        개별 테스트
                      </button>
                    </div>
                  </li>
                );
              })}
            </ul>
          </>
        )}
      </div>
    </div>
  );
}
