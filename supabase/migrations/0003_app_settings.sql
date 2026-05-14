-- 앱 설정 (접근키 등) — 관리자 화면에서 변경 가능한 단일 KV 스토어
-- Supabase Dashboard → SQL Editor 에서 실행

create table if not exists public.app_settings (
  key         text primary key,
  value       text not null,
  updated_at  timestamptz not null default now(),
  updated_by  text
);

alter table public.app_settings enable row level security;

-- 최초 접근키 (관리자가 추후 변경)
insert into public.app_settings (key, value, updated_by)
values ('access_key', '880831', 'seed')
on conflict (key) do nothing;
