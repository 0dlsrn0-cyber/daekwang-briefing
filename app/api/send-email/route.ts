import { NextResponse, type NextRequest } from "next/server";
import { sendBriefingEmail } from "@/lib/email/send";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import type { BriefingResult } from "@/lib/types";

export const runtime = "nodejs";
export const maxDuration = 60;

interface RequestBody {
  result: BriefingResult;
  recipients: string;
  senderName?: string;
  gmailUser: string;
  gmailAppPassword: string;
}

export async function POST(request: NextRequest) {
  let body: RequestBody;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { success: false, error: "잘못된 요청 본문" },
      { status: 400 },
    );
  }

  if (!body.result || !body.recipients) {
    return NextResponse.json({
      success: false,
      error: "분석 결과 또는 수신자가 없습니다.",
    });
  }
  if (!body.gmailUser || !body.gmailAppPassword) {
    return NextResponse.json({
      success: false,
      error: "Gmail 주소와 앱 비밀번호가 필요합니다.",
    });
  }

  const sendResult = await sendBriefingEmail({
    result: body.result,
    recipients: body.recipients,
    senderName: body.senderName,
    gmailUser: body.gmailUser,
    gmailAppPassword: body.gmailAppPassword,
  });

  // DB 기록 — 실패해도 발송 결과는 그대로 반환
  try {
    const supabase = getSupabaseAdmin();
    const recipientList = body.recipients
      .split(/[,;]/)
      .map((e) => e.trim())
      .filter(Boolean);
    const { error } = await supabase.from("email_sends").insert({
      run_id: body.result.runId ?? null,
      recipients: recipientList,
      sender_name: body.senderName || null,
      status: sendResult.success ? "success" : "failed",
      error_message: sendResult.success ? null : sendResult.error || null,
    });
    if (error) throw error;
  } catch (e) {
    console.error("[supabase] email_sends insert 실패:", e);
  }

  return NextResponse.json(sendResult);
}
