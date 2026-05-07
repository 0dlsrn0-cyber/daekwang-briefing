"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "sending" | "sent" | "error">(
    "idle",
  );
  const [errorMsg, setErrorMsg] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStatus("sending");
    setErrorMsg("");

    const supabase = createClient();
    const { error } = await supabase.auth.signInWithOtp({
      email: email.trim(),
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback`,
        shouldCreateUser: true,
      },
    });

    if (error) {
      setStatus("error");
      setErrorMsg(error.message);
    } else {
      setStatus("sent");
    }
  }

  return (
    <main className="login-page">
      <div className="login-card">
        <div className="login-brand">DAEKWANG · LOGEBIEN</div>
        <h1>일일 부동산 동향 브리핑</h1>
        <p className="login-sub">로그인 이메일로 1회용 링크를 보내드립니다.</p>
        <form onSubmit={handleSubmit}>
          <input
            type="email"
            required
            placeholder="등록된 이메일 주소"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            disabled={status === "sending" || status === "sent"}
          />
          <button
            type="submit"
            disabled={status === "sending" || status === "sent"}
          >
            {status === "sending"
              ? "발송 중…"
              : status === "sent"
                ? "발송 완료"
                : "매직링크 보내기"}
          </button>
        </form>
        {status === "sent" && (
          <p className="login-msg ok">
            메일함을 확인해 주세요. (스팸함 포함)
          </p>
        )}
        {status === "error" && <p className="login-msg err">{errorMsg}</p>}
      </div>
    </main>
  );
}
