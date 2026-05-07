import nodemailer from "nodemailer";
import { buildBriefingEmailHtml } from "./render";
import type { BriefingResult } from "../types";

interface SendParams {
  result: BriefingResult;
  recipients: string;
  senderName?: string;
  gmailUser: string;
  gmailAppPassword: string;
}

export async function sendBriefingEmail(params: SendParams): Promise<{
  success: boolean;
  sentTo?: number;
  error?: string;
}> {
  const gmailUser = (params.gmailUser || "").trim();
  // 앱 비밀번호는 4자리씩 공백 구분으로 표시되는 경우가 많아 모두 제거
  const appPassword = (params.gmailAppPassword || "").replace(/\s+/g, "");

  if (!gmailUser) return { success: false, error: "Gmail 주소가 없습니다." };
  if (!appPassword)
    return { success: false, error: "Gmail 앱 비밀번호가 없습니다." };
  if (appPassword.length !== 16) {
    return {
      success: false,
      error: "앱 비밀번호는 16자리여야 합니다 (공백 제외).",
    };
  }

  const today = new Date(Date.now() + 9 * 60 * 60 * 1000)
    .toISOString()
    .substring(0, 10);
  const subject = `[로제비앙] 부동산 동향 심층 분석 브리핑 (${today})`;
  const htmlBody = buildBriefingEmailHtml(params.result);

  const emailList = params.recipients
    .split(/[,;]/)
    .map((e) => e.trim())
    .filter(Boolean);

  if (emailList.length === 0) {
    return { success: false, error: "수신자 없음" };
  }

  const senderName = params.senderName || "대광건영 로제비앙";
  const from = `"${senderName}" <${gmailUser}>`;

  const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: { user: gmailUser, pass: appPassword },
  });

  try {
    // 인증 검증을 위해 한 번 verify
    await transporter.verify();
  } catch (err) {
    return {
      success: false,
      error: `Gmail 인증 실패: ${(err as Error).message}. 2단계 인증 + 앱 비밀번호를 확인하세요.`,
    };
  }

  try {
    for (const to of emailList) {
      await transporter.sendMail({
        from,
        to,
        subject,
        html: htmlBody,
      });
    }
    return { success: true, sentTo: emailList.length };
  } catch (err) {
    return { success: false, error: (err as Error).message };
  }
}
