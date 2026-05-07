import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { sendBriefingEmail } from "@/lib/email/send";
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
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ success: false, error: "인증 필요" }, { status: 401 });

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
  return NextResponse.json(sendResult);
}
