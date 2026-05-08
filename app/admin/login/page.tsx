"use client";

import { Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";

function LoginForm() {
  const searchParams = useSearchParams();
  const fromParam = searchParams.get("from") || "";
  const errParam = searchParams.get("err");

  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string>(
    errParam === "env_missing"
      ? "서버에 관리자 환경변수가 설정되지 않았습니다. ADMIN_PASSWORD / ADMIN_SESSION_SECRET 추가 필요."
      : "",
  );

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setSubmitting(true);
    try {
      const res = await fetch("/api/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password, from: fromParam }),
        cache: "no-store",
      });
      const data = (await res.json()) as {
        success: boolean;
        error?: string;
        redirect?: string;
      };
      if (!data.success) {
        setError(data.error || "로그인 실패");
        setSubmitting(false);
        return;
      }
      // 풀 페이지 이동 — 쿠키가 다음 요청에 확실히 포함됨
      window.location.href = data.redirect || "/admin";
    } catch (e) {
      setError((e as Error).message);
      setSubmitting(false);
    }
  }

  return (
    <div className="login-page">
      <div className="login-card">
        <div className="login-brand">DAEKWANG · LOGEBIEN</div>
        <h1>관리자 로그인</h1>
        <p className="login-sub">
          기록·통계 페이지 접근에는 비밀번호가 필요합니다.
        </p>
        <form onSubmit={submit}>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="관리자 비밀번호"
            autoFocus
            disabled={submitting}
            required
          />
          <button type="submit" disabled={submitting}>
            {submitting ? "확인 중…" : "로그인"}
          </button>
        </form>
        {error && <div className="login-msg err">{error}</div>}
        <div className="login-back">
          <Link href="/" className="link-inline">
            ← 홈으로 돌아가기
          </Link>
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginForm />
    </Suspense>
  );
}
