-- email_sends.recipients: text → text[] 정규화
-- 콤마/세미콜론 구분으로 들어가던 단일 문자열을 배열로 변환

do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'email_sends'
      and column_name = 'recipients' and data_type = 'text'
  ) then
    alter table public.email_sends
      alter column recipients type text[]
      using regexp_split_to_array(recipients, '\s*[,;]\s*');
  end if;
end $$;
