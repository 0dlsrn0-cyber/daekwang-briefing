"use client";

import { useEffect, useState } from "react";
import type { BriefingResult } from "@/lib/types";

interface Props {
  result: BriefingResult;
  onClose: () => void;
  onLog: (line: string) => void;
}

export default function EmailModal({ result, onClose, onLog }: Props) {
  const [senderName, setSenderName] = useState("대광건영 주택관리팀 강인구");
  const [gmailUser, setGmailUser] = useState("");
  const [gmailAppPassword, setGmailAppPassword] = useState("");
  const [recipients, setRecipients] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (typeof window === "undefined") return;
    setSenderName(
      sessionStorage.getItem("senderName") || "대광건영 주택관리팀 강인구",
    );
    setGmailUser(sessionStorage.getItem("gmailUser") || "");
    setGmailAppPassword(sessionStorage.getItem("gmailAppPassword") || "");
    setRecipients(sessionStorage.getItem("recipients") || "");
  }, []);

  async function handleSend() {
    setError("");
    if (!gmailUser.trim()) {
      setError("본인 Gmail 주소를 입력해 주세요.");
      return;
    }
    if (!gmailAppPassword.trim()) {
      setError("Gmail 앱 비밀번호를 입력해 주세요.");
      return;
    }
    if (!recipients.trim()) {
      setError("수신자 이메일을 입력해 주세요.");
      return;
    }
    setSending(true);
    try {
      sessionStorage.setItem("senderName", senderName);
      sessionStorage.setItem("gmailUser", gmailUser);
      sessionStorage.setItem("gmailAppPassword", gmailAppPassword);
      sessionStorage.setItem("recipients", recipients);
      const res = await fetch("/api/send-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          result,
          recipients,
          senderName,
          gmailUser: gmailUser.trim(),
          gmailAppPassword,
        }),
      });
      const data = await res.json();
      if (!data.success) {
        setError(data.error || "발송 실패");
        onLog(`❌ 메일 발송 실패: ${data.error}`);
      } else {
        onLog(`✅ 메일 발송 완료 (${data.sentTo}명, 발신: ${gmailUser})`);
        onClose();
      }
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSending(false);
    }
  }

  return (
    <div
      className="modal-backdrop"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="modal">
        <div className="modal-header">📧 Gmail로 발송</div>
        <div className="modal-body">
          <div className="form-group">
            <label>발신자 이름</label>
            <input
              type="text"
              value={senderName}
              onChange={(e) => setSenderName(e.target.value)}
            />
          </div>
          <div className="form-group">
            <label>본인 Gmail 주소</label>
            <input
              type="email"
              value={gmailUser}
              onChange={(e) => setGmailUser(e.target.value)}
              placeholder="yourname@gmail.com"
            />
          </div>
          <div className="form-group">
            <label>Gmail 앱 비밀번호 (16자리)</label>
            <input
              type="password"
              value={gmailAppPassword}
              onChange={(e) => setGmailAppPassword(e.target.value)}
              placeholder="abcd efgh ijkl mnop"
            />
            <span className="input-hint">
              일반 Gmail 비번이 아닙니다.{" "}
              <a
                href="https://myaccount.google.com/apppasswords"
                target="_blank"
                rel="noopener noreferrer"
                style={{ color: "var(--navy-500)", textDecoration: "underline" }}
              >
                앱 비밀번호 발급
              </a>{" "}
              (2단계 인증 필수). 서버에 저장되지 않으며, 발송 시점에만 사용됩니다.
            </span>
          </div>
          <div className="form-group">
            <label>수신자 (쉼표 또는 세미콜론 구분)</label>
            <input
              type="text"
              value={recipients}
              onChange={(e) => setRecipients(e.target.value)}
              placeholder="boss@daekwang.com, team@daekwang.com"
            />
          </div>
          {error && <div className="alert">{error}</div>}
        </div>
        <div className="modal-footer">
          <button
            className="btn btn-secondary"
            type="button"
            onClick={onClose}
            disabled={sending}
          >
            취소
          </button>
          <button
            className="btn btn-primary"
            type="button"
            onClick={handleSend}
            disabled={sending}
          >
            {sending ? "발송 중…" : "발송"}
          </button>
        </div>
      </div>
    </div>
  );
}
