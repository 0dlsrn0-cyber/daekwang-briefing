# legacy-standalone — 폐기된 브리핑 전용 프로젝트의 마이그레이션 (실행 금지)

이 폴더의 SQL은 **이제 사용하지 않는** 브리핑 전용 Supabase 프로젝트의 `public` 스키마를
만들던 마이그레이션입니다.

브리핑은 `daekwang-sso` 프로젝트의 **`briefing` 스키마**로 통합되었고,
현재 스키마 정의의 단일 출처는 `supabase/sso-briefing-schema.sql` 입니다.

## ⚠️ 절대 실행하지 말 것 (do-not-run)

- 이 SQL은 `public` 스키마에 테이블을 만든다. **daekwang-sso 에서 `public` 은 SSO/포털의 스키마**다.
- `supabase db push` 로 적용되면 공유 프로젝트의 포털 스키마에 중복 테이블이 생긴다.
- 그래서 `supabase/migrations/` (= `db push` 가 읽는 경로) **밖으로** 옮겨 보관한다.
- 과거 기록·참조용으로만 남긴다.
