# 대광 로제비앙 부동산 동향 일일 AI 브리핑

Google News, 한국은행 ECOS 지표, Gemini 분석을 한 화면에서 실행하고 결과 리포트와 시장 지표를 확인하는 Next.js 앱입니다.

## 기능

- 부동산 뉴스 자동 수집
- 한국은행 ECOS 금리, 심리, 물가, DSR 지표 통합
- Gemini 2.5 Flash 또는 Gemini Flash latest alias 분석
- 결과 리포트, 관리자 기록, AI 상태 점검
- 이메일 발송용 리포트 렌더링

## 로컬 실행

```bash
npm install
npm run dev
```

현재 작업용 로컬 주소:

```text
http://127.0.0.1:3100
```

## AI 모델

활성 모델은 두 개만 유지합니다.

- `gemini`: Google Gemini 2.5 Flash
- `gemini-flash-latest`: Google Gemini Flash latest alias

Google AI Studio에서 발급한 API 키를 입력하면 됩니다.

```text
https://aistudio.google.com/app/apikey
```

`gemini-flash-latest`는 Google이 Flash 계열의 최신 릴리스로 연결하는 latest alias입니다. 안정성을 우선하면 `gemini`를, 자동 최신 추적을 원하면 `gemini-flash-latest`를 선택합니다.

## 디자인

현재 디자인 기준은 [design.md](design.md)에 정리되어 있습니다. 배경 영상은 `public/design/briefing-ambient.mp4`를 사용하며, CSS 마스크와 그라데이션으로 가장자리를 배경에 섞습니다.

## 주요 파일

```text
app/
components/
lib/
  ai/
    gemini.ts
    index.ts
    prompt.ts
public/design/
design.md
middleware.ts
```

## 검증

```bash
npm run typecheck
npm run build
```
