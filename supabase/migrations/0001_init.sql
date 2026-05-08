-- 일일 브리핑 로깅 스키마
-- Supabase Dashboard → SQL Editor 에서 실행

create table public.briefing_runs (
  id uuid primary key default gen_random_uuid(),
  session_id text,
  ai_model text not null,
  focus_point text,
  ecos_used boolean not null default false,
  status text not null default 'running',     -- running | success | partial | failed
  error_message text,
  duration_ms int,
  created_at timestamptz not null default now()
);

create index briefing_runs_created_at_idx
  on public.briefing_runs (created_at desc);

create table public.news_items (
  id uuid primary key default gen_random_uuid(),
  run_id uuid not null references public.briefing_runs(id) on delete cascade,
  category text not null,
  title text not null,
  url text not null,
  url_hash text not null,                     -- sha256(url) — 중복 분석용
  pub_date text,
  created_at timestamptz not null default now()
);

create index news_items_run_id_idx on public.news_items (run_id);
create index news_items_url_hash_idx on public.news_items (url_hash);

create table public.reports (
  id uuid primary key default gen_random_uuid(),
  run_id uuid not null references public.briefing_runs(id) on delete cascade,
  ai_report text not null,
  rate_snapshot jsonb,                        -- ECOS 11대 지표 + 트렌드 스냅샷
  news_count int not null default 0,
  created_at timestamptz not null default now()
);

create index reports_run_id_idx on public.reports (run_id);

create table public.email_sends (
  id uuid primary key default gen_random_uuid(),
  run_id uuid references public.briefing_runs(id) on delete set null,
  recipients text not null,
  sender_name text,
  status text not null,                       -- success | failed
  error_message text,
  sent_at timestamptz not null default now()
);

create index email_sends_run_id_idx on public.email_sends (run_id);

-- RLS: anon/익명 접근 전부 차단. service_role 은 RLS 우회하므로 서버 라우트만 INSERT 가능.
alter table public.briefing_runs enable row level security;
alter table public.news_items     enable row level security;
alter table public.reports        enable row level security;
alter table public.email_sends    enable row level security;
