"use client";

import { useState } from "react";

interface Props {
  initialKey: string;
}

export default function SettingsView({ initialKey }: Props) {
  const [currentKey, setCurrentKey] = useState(initialKey);
  const [newKey, setNewKey] = useState("");
  const [confirmKey, setConfirmKey] = useState("");
  const [reveal, setReveal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [msg, setMsg] = useState<{ kind: "ok" | "err"; text: string } | null>(
    null,
  );

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setMsg(null);
    if (newKey.trim().length < 4) {
      setMsg({ kind: "err", text: "접근키는 4자 이상이어야 합니다." });
      return;
    }
    if (newKey !== confirmKey) {
      setMsg({ kind: "err", text: "확인 입력이 일치하지 않습니다." });
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch("/api/admin/access-key", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ newKey: newKey.trim() }),
        cache: "no-store",
      });
      const data = (await res.json()) as {
        success: boolean;
        error?: string;
      };
      if (!data.success) {
        setMsg({ kind: "err", text: data.error || "변경 실패" });
      } else {
        setMsg({ kind: "ok", text: "접근키가 변경되었습니다." });
        setCurrentKey(newKey.trim());
        setNewKey("");
        setConfirmKey("");
      }
    } catch (err) {
      setMsg({ kind: "err", text: (err as Error).message });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="card">
      <div className="card-header">
        <div className="icon">🔑</div>
        <div>
          <h2>사이트 접근키</h2>
          <p>이 키를 모르는 사람은 홈 화면에 진입할 수 없습니다.</p>
        </div>
      </div>
      <div className="card-body">
        <div className="form-grid" style={{ marginBottom: 16 }}>
          <div className="form-group">
            <label>현재 접근키</label>
            <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
              <input
                type={reveal ? "text" : "password"}
                value={currentKey}
                readOnly
                style={{ flex: 1 }}
              />
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => setReveal((v) => !v)}
              >
                {reveal ? "숨기기" : "보기"}
              </button>
            </div>
            <span className="input-hint">최초값: 880831</span>
          </div>
        </div>

        <form onSubmit={submit}>
          <div className="form-grid">
            <div className="form-group">
              <label>새 접근키</label>
              <input
                type="password"
                value={newKey}
                onChange={(e) => setNewKey(e.target.value)}
                placeholder="새 접근키"
                disabled={submitting}
                required
                minLength={4}
                maxLength={64}
              />
            </div>
            <div className="form-group">
              <label>새 접근키 확인</label>
              <input
                type="password"
                value={confirmKey}
                onChange={(e) => setConfirmKey(e.target.value)}
                placeholder="다시 입력"
                disabled={submitting}
                required
              />
            </div>
          </div>
          <div className="btn-row">
            <button type="submit" className="btn btn-primary" disabled={submitting}>
              {submitting ? "변경 중…" : "접근키 변경"}
            </button>
          </div>
          {msg && (
            <div className={`login-msg ${msg.kind}`}>{msg.text}</div>
          )}
        </form>
      </div>
    </div>
  );
}
