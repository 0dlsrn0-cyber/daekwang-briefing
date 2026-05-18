-- 시계열 비교: 직전 영업일 결론 3줄을 다음 브리핑 프롬프트에 자동 주입
alter table public.reports
  add column if not exists conclusions_3lines text;

create index if not exists reports_conclusions_recent_idx
  on public.reports (created_at desc)
  where conclusions_3lines is not null;
