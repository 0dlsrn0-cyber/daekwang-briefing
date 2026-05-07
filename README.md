# 대광 로제비앙 부동산 동향 일일 AI 브리핑

Google News + 한국은행 ECOS 금리 + AI(9개 모델) 분석을 결합한 디벨로퍼 시각의 일일 부동산 시장 인텔리전스 시스템.

기존 Google Apps Script(`reference/code.gs`, `reference/Index.html`) 버전을 **Vercel + Supabase + GitHub** 스택으로 이전한 결과물.

---

## 기능

- 🗞 4개 카테고리 부동산 뉴스 자동 수집 (Google News RSS)
- 📊 한국은행 ECOS 11대 금리·심리 지표 + 트렌드 + DSR 추산
- 🤖 9개 AI 모델 선택: Gemini, Claude, GPT-4o, Grok, Mistral, Perplexity, GitHub Models, Cohere, OpenRouter
- 📧 Gmail SMTP(nodemailer)로 본인 명의 메일 발송 — 발신자 = 본인 Gmail 주소
- 🔐 Supabase 매직링크 로그인 (이메일 화이트리스트)

---

## 로컬 실행

### 1. 의존성 설치

```bash
npm install
```

### 2. 환경변수 설정

`.env.example`을 `.env.local`로 복사하고 값을 채워 넣습니다.

```bash
cp .env.example .env.local
```

| 변수                            | 설명                                                                 |
| ------------------------------- | -------------------------------------------------------------------- |
| `NEXT_PUBLIC_SUPABASE_URL`      | Supabase Project URL                                                 |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anon key                                                    |
| `SUPABASE_SERVICE_ROLE_KEY`     | Supabase service role (현재 미사용, 향후 admin 작업 대비)            |
| `NEXT_PUBLIC_SITE_URL`          | 사이트 URL (로컬: `http://localhost:3000`)                          |

> 이메일은 사용자가 발송 모달에 본인 Gmail 주소 + 앱 비밀번호를 매번 입력하는 방식입니다. 서버/DB에 저장되지 않습니다.

### 3. 개발 서버

```bash
npm run dev
```

→ http://localhost:3000 접속, `/login`으로 리다이렉트됩니다.

---

## Supabase 셋업

1. https://supabase.com/dashboard → **New Project** 생성
2. Project Settings → **API** 에서 URL, anon key, service_role key 복사 → `.env.local`
3. **Authentication → Providers → Email**:
   - "Enable Email Provider" ON
   - "Confirm email" 토글이 보이면 OFF (없으면 무시 — 매직링크는 무관)
4. **Project Settings → Authentication → User Signups**:
   - "Allow new users to sign up" **ON** (누구나 본인 이메일로 가입 가능)
5. **Authentication → URL Configuration**:
   - Site URL: `https://your-domain.com` (또는 `http://localhost:3000`)
   - Redirect URLs: `https://your-domain.com/auth/callback`, `http://localhost:3000/auth/callback`
6. 사용자는 `/login`에서 본인 이메일 입력 → 매직링크 메일 → 클릭 시 자동 가입 + 로그인

---

## Gmail 앱 비밀번호 발급 (이메일 발송용)

이메일은 발송 모달에서 **본인 Gmail + 앱 비밀번호**를 매번 입력해 본인 명의로 보냅니다. Google이 일반 비번 SMTP 접속을 막아두었기 때문에 별도 16자리 앱 비밀번호가 필요합니다.

1. https://myaccount.google.com/security 접속
2. **2단계 인증** ON (이미 켜져 있으면 스킵)
3. https://myaccount.google.com/apppasswords 접속
4. 앱 이름 입력 (예: `daekwang-briefing`) → **만들기**
5. 16자리 코드(`abcd efgh ijkl mnop` 형태) 복사 — **이 화면을 닫으면 다시 못 봅니다**
6. 발송 모달의 "Gmail 앱 비밀번호" 칸에 붙여넣기 (공백 무시 가능)

> 발급한 앱 비밀번호는 언제든 https://myaccount.google.com/apppasswords 에서 폐기 가능. 문제 생기면 즉시 폐기 후 새로 발급하세요.

발송 한도: 개인 Gmail 일일 500건, Workspace 2,000건.

---

## GitHub + Vercel 배포

### 1. GitHub 저장소

```bash
git init
git add .
git commit -m "Initial migration from Google Apps Script"
git branch -M main
git remote add origin https://github.com/<your-account>/<repo>.git
git push -u origin main
```

### 2. Vercel 프로젝트

1. https://vercel.com/new 에서 GitHub 저장소 import
2. Framework Preset: **Next.js** (자동 감지)
3. Environment Variables에 `.env.local`의 모든 값을 등록
   - `NEXT_PUBLIC_*`은 Production / Preview / Development 모두에 추가
4. Deploy 클릭
5. 배포 완료 후 Supabase Dashboard에 운영 URL을 Site URL / Redirect URL로 추가

이후 `git push origin main` 시 자동 배포됩니다.

---

## API 키 안내

각 모델별 API 키 발급처:

| 모델       | 발급처                                                              |
| ---------- | ------------------------------------------------------------------- |
| Gemini     | https://aistudio.google.com/app/apikey (무료 한도 제공)             |
| Claude     | https://console.anthropic.com/settings/keys                         |
| OpenAI     | https://platform.openai.com/api-keys                                |
| Grok       | https://console.x.ai                                                |
| Mistral    | https://console.mistral.ai/api-keys                                 |
| Perplexity | https://www.perplexity.ai/settings/api                              |
| GitHub     | https://github.com/settings/personal-access-tokens (Models 권한)   |
| Cohere     | https://dashboard.cohere.com/api-keys                               |
| OpenRouter | https://openrouter.ai/keys (무료 모델 사용 가능)                    |
| ECOS       | https://ecos.bok.or.kr/api/#/AuthKeyApply (한국은행 발급, 무료)     |

> AI / ECOS 키는 **서버에 저장되지 않습니다**. 매번 폼에 입력하며, 세션 동안만 브라우저 sessionStorage에 보존됩니다.

---

## 디렉토리 구조

```
.
├── app/
│   ├── api/
│   │   ├── briefing/route.ts       # POST: 뉴스+ECOS+AI
│   │   └── send-email/route.ts     # POST: Resend 발송
│   ├── auth/callback/route.ts      # Supabase OAuth 콜백
│   ├── login/page.tsx              # 매직링크 로그인
│   ├── actions.ts                  # 서버 액션 (signOut)
│   ├── globals.css
│   ├── layout.tsx
│   └── page.tsx                    # 메인
├── components/
│   ├── BriefingForm.tsx
│   ├── BriefingResult.tsx
│   ├── EcosDashboard.tsx
│   ├── EmailModal.tsx
│   ├── HomeView.tsx
│   └── NewsTabs.tsx
├── lib/
│   ├── ai/                         # 9개 AI 모델 + 라우터 + 프롬프트
│   ├── email/                      # render.ts (이메일 HTML), send.ts (Resend)
│   ├── supabase/                   # client / server / middleware
│   ├── ecos.ts                     # 한국은행 API + 트렌드 + DSR
│   ├── markdown.ts                 # md→HTML
│   ├── news.ts                     # Google News RSS
│   └── types.ts
├── reference/                      # 원본 GAS 코드 (참고용)
├── middleware.ts                   # 인증 보호
└── package.json
```

---

## 검증 체크리스트

- [ ] `npm run dev` 후 `/login` 접속 가능
- [ ] 본인 이메일로 매직링크 수신, 클릭 시 `/`로 진입
- [ ] Gemini API 키 입력 후 "브리핑 실행" → 결과 카드 표시
- [ ] ECOS 키 입력 후 재실행 → 11대 지표 + 트렌드 + DSR 표시
- [ ] 이메일 모달에서 본인 메일로 발송 → Navy/Gold 디자인 수신
- [ ] 다른 AI 모델(Claude, OpenAI 등) 키로 회귀 테스트
- [ ] 결과 화면 Ctrl+P → 인쇄 미리보기 정상

---

## 라이선스

내부 사용 — 대광그룹 주택관리팀
