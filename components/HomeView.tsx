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
    <div className="app-shell briefing-shell">
      <header className="topbar">
        <Link href="/" className="brand" aria-label="대광 로제비앙 브리핑 홈">
          <span className="brand-mark" aria-hidden="true" />
          <span className="brand-text">DAEKWANG Briefing</span>
        </Link>

        <nav className="top-nav" aria-label="주요 메뉴">
          <a href="#setup">분석 설정</a>
          <a href="#results">결과 리포트</a>
          <Link href="/admin" prefetch={false}>
            관리자
          </Link>
        </nav>

        <div className="top-actions">
          <Link href="/admin" className="primary-button" prefetch={false}>
            관리자
          </Link>
        </div>
      </header>

      <main className="briefing-main" id="top">
        <section className="briefing-hero" id="setup">
          <div className="hero-ambient" aria-hidden="true">
            <video
              className="hero-ambient-video"
              autoPlay
              muted
              loop
              playsInline
              preload="metadata"
            >
              <source src="/design/briefing-ambient.mp4" type="video/mp4" />
            </video>
          </div>

          <div className="hero-copy">
            <p className="eyebrow eyebrow--brand">Daekwang · Logebien</p>
            <h1 className="hero-wordmark">Real Estate Briefing</h1>
            <p className="hero-tagline">부동산 동향 일일 AI 브리핑</p>
            <p className="hero-lead">
              Google News, 한국은행 ECOS, AI 심층 분석을 한 화면에서 실행하고
              결과 리포트와 시장 지표를 바로 확인합니다.
            </p>

            <div className="hero-actions">
              <a className="cta-button cta-button--primary" href="#setup">
                브리핑 실행
              </a>
              <a className="cta-button cta-button--ghost" href="#results">
                결과 보기
              </a>
            </div>

            <div className="briefing-meta-grid" aria-label="브리핑 구성">
              <div className="briefing-meta-card">
                <strong>NEWS</strong>
                <span>실시간 기사 수집</span>
              </div>
              <div className="briefing-meta-card">
                <strong>ECOS</strong>
                <span>금리·심리 지표</span>
              </div>
              <div className="briefing-meta-card">
                <strong>AI</strong>
                <span>심층 분석 리포트</span>
              </div>
            </div>
          </div>

          <div className="card form-card hero-form-card">
            <div className="card-header">
              <div className="icon">AI</div>
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
        </section>

        <div id="results" className="results-anchor">
          {result && (
            <BriefingResultView result={result} onLog={appendLog} />
          )}
        </div>
      </main>
    </div>
  );
}
