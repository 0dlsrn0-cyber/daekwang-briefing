"use client";

import { useState } from "react";
import Link from "next/link";
import type { BriefingResult } from "@/lib/types";
import BriefingForm from "./BriefingForm";
import BriefingResultView from "./BriefingResult";

export default function HomeView() {
  const [result, setResult] = useState<BriefingResult | null>(null);
  const [logs, setLogs] = useState<string[]>([]);

  function appendLog(line: string) {
    const ts = new Date().toLocaleTimeString("ko-KR");
    setLogs((prev) => [...prev, `[${ts}] ${line}`]);
  }

  return (
    <div className="page-wrapper">
      <Link href="/admin" className="admin-link" prefetch={false}>
        🔒 관리자
      </Link>
      <header className="site-header">
        <div className="brand-badge">DAEKWANG · LOGEBIEN</div>
        <h1>
          부동산 동향 <span>일일 AI 브리핑</span>
        </h1>
        <p className="subtitle">
          Google News + 한국은행 ECOS + AI 심층 분석
        </p>
      </header>

      <div className="card form-card">
        <div className="card-header">
          <div className="icon">⚙️</div>
          <div>
            <h2>분석 설정</h2>
            <p>모델과 키를 입력 후 실행하세요</p>
          </div>
        </div>
        <div className="card-body">
          <BriefingForm onResult={setResult} onLog={appendLog} />
          {logs.length > 0 && <div className="log">{logs.join("\n")}</div>}
        </div>
      </div>

      {result && <BriefingResultView result={result} onLog={appendLog} />}
    </div>
  );
}
