-- ============================================================================
-- 브리핑 앱 → daekwang-sso 프로젝트로 통합 (전용 프로젝트 폐기)
-- ============================================================================
-- 실행 위치: daekwang-sso 프로젝트 → SQL Editor 에서 STEP 1, STEP 2 순서대로.
-- ⚠️ 이 파일은 수동 실행 전용. `supabase db push` / `config push` 로 적용하지 말 것.
--    (config push 는 프로젝트 전체 노출 스키마를 덮어써 다른 앱을 죽인 전례가 있음)
-- 데이터 이관 없음 — 이력은 새로 시작. app_settings 접근키만 시드.
-- 보안: service_role 에만 권한 부여. anon/authenticated 에는 grant 하지 않음
--       (대시보드에서 briefing 스키마가 "custom grants" 주황색으로 보이는 게 정상.
--        "override with standard Data API grants" 누르면 anon 에 CRUD 열려 공개 쓰기
--        구멍이 생기므로 절대 누르지 말 것).
-- ============================================================================


-- ─── STEP 1 : 스키마 · 테이블 · 권한 ───────────────────────────────────────

create schema if not exists briefing;

-- 브리핑 실행 로그
create table if not exists briefing.briefing_runs (
  id            uuid primary key default gen_random_uuid(),
  session_id    text,
  ai_model      text not null,
  focus_point   text,
  ecos_used     boolean not null default false,
  status        text not null default 'running',   -- running | success | partial | failed
  error_message text,
  duration_ms   int,
  created_at    timestamptz not null default now()
);
create index if not exists briefing_runs_created_at_idx
  on briefing.briefing_runs (created_at desc);

-- 수집된 뉴스 항목
create table if not exists briefing.news_items (
  id         uuid primary key default gen_random_uuid(),
  run_id     uuid not null references briefing.briefing_runs(id) on delete cascade,
  category   text not null,
  title      text not null,
  url        text not null,
  url_hash   text not null,                         -- sha256(url) — 중복 분석용
  pub_date   text,
  created_at timestamptz not null default now()
);
create index if not exists news_items_run_id_idx   on briefing.news_items (run_id);
create index if not exists news_items_url_hash_idx on briefing.news_items (url_hash);

-- AI 리포트 (+ ECOS 스냅샷, 결론 3줄)
create table if not exists briefing.reports (
  id                 uuid primary key default gen_random_uuid(),
  run_id             uuid not null references briefing.briefing_runs(id) on delete cascade,
  ai_report          text not null,
  rate_snapshot      jsonb,                          -- ECOS 11대 지표 + 트렌드 스냅샷
  news_count         int not null default 0,
  conclusions_3lines text,                           -- 직전 영업일 결론 자동 주입용
  created_at         timestamptz not null default now()
);
create index if not exists reports_run_id_idx on briefing.reports (run_id);
create index if not exists reports_conclusions_recent_idx
  on briefing.reports (created_at desc)
  where conclusions_3lines is not null;

-- 이메일 발송 로그 (recipients 는 배열)
create table if not exists briefing.email_sends (
  id            uuid primary key default gen_random_uuid(),
  run_id        uuid references briefing.briefing_runs(id) on delete set null,
  recipients    text[] not null,
  sender_name   text,
  status        text not null,                       -- success | failed
  error_message text,
  sent_at       timestamptz not null default now()
);
create index if not exists email_sends_run_id_idx on briefing.email_sends (run_id);

-- 앱 설정 (접근키 등) — 단일 KV
create table if not exists briefing.app_settings (
  key        text primary key,
  value      text not null,
  updated_at timestamptz not null default now(),
  updated_by text
);

-- RLS: 전 테이블 켜고 anon/authenticated 정책 없음 → service_role(우회)만 접근
alter table briefing.briefing_runs enable row level security;
alter table briefing.news_items    enable row level security;
alter table briefing.reports       enable row level security;
alter table briefing.email_sends   enable row level security;
alter table briefing.app_settings  enable row level security;

-- 권한: service_role 에만. anon/authenticated 에는 주지 않음.
grant usage on schema briefing to service_role;
grant all on all tables    in schema briefing to service_role;
grant all on all sequences in schema briefing to service_role;
alter default privileges in schema briefing grant all on tables    to service_role;
alter default privileges in schema briefing grant all on sequences to service_role;

-- 접근키 시드 (이력은 새로 시작)
insert into briefing.app_settings (key, value, updated_by)
values ('access_key', '880831', 'seed')
on conflict (key) do nothing;


-- ─── STEP 2 : briefing 스키마를 Data API 에 노출 (PostgREST) ────────────────
-- ⚠️ 노출 목록은 "덮어쓰기"다. 기존 6개를 그대로 두고 briefing 만 추가해야 한다.
--    하나라도 빠지면 그 앱이 PGRST106(Invalid schema)로 조용히 먹통.
alter role authenticator set pgrst.db_schemas =
  'public, graphql_public, contract_review, budget, reservation, pt, briefing';
notify pgrst, 'reload config';
notify pgrst, 'reload schema';


-- ─── (검증) 노출 확인 — STEP 2 실행 후 ─────────────────────────────────────
-- 주의: pgrst.db_schemas 는 authenticator 롤에 설정된다. SQL Editor 는 postgres
--       세션이라 current_setting('pgrst.db_schemas', true) 는 빈값이 나올 수 있다.
--       (설정 성공/실패와 무관하게 NULL일 수 있으므로 이 방법은 쓰지 말 것.)
--       아래처럼 롤 설정을 직접 조회해서 확인한다:
--
--   select r.rolname, s.setconfig
--   from pg_db_role_setting s
--   join pg_roles r on r.oid = s.setrole
--   where r.rolname = 'authenticator';
--
--   → setconfig 배열에 다음이 들어 있으면 OK:
--     pgrst.db_schemas=public, graphql_public, contract_review, budget, reservation, pt, briefing
--
-- 엔드투엔드 확인(권장): anon 공개키로 Accept-Profile 헤더를 붙여 probe.
--   - 기존 앱(예: budget) → 여전히 200/PGRST205 (PGRST106 아니어야)
--   - briefing → service_role 만 grant 했으므로 anon 은 권한 거부(정상)
