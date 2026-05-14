"use client";

import { Suspense, useState } from "react";

function GateForm() {
  const [key, setKey] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setSubmitting(true);
    try {
      const res = await fetch("/api/access-key/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key }),
        cache: "no-store",
      });
      const data = (await res.json()) as {
        success: boolean;
        error?: string;
      };
      if (!data.success) {
        setError(data.error || "접근 실패");
        setSubmitting(false);
        return;
      }
      window.location.href = "/";
    } catch (e) {
      setError((e as Error).message);
      setSubmitting(false);
    }
  }

  return (
    <div className="login-page">
      <div className="login-card">
        <div className="login-brand">DAEKWANG · LOGEBIEN</div>
        <h1>접근키 인증</h1>
        <p className="login-sub">
          서비스 이용을 위해 사이트 접근키를 입력해 주세요.
        </p>
        <form onSubmit={submit}>
          <input
            type="password"
            inputMode="numeric"
            value={key}
            onChange={(e) => setKey(e.target.value)}
            placeholder="접근키"
            autoFocus
            disabled={submitting}
            required
          />
          <button type="submit" disabled={submitting}>
            {submitting ? "확인 중…" : "입장"}
          </button>
        </form>
        {error && <div className="login-msg err">{error}</div>}
      </div>
    </div>
  );
}

export default function GatePage() {
  return (
    <Suspense fallback={null}>
      <GateForm />
    </Suspense>
  );
}
