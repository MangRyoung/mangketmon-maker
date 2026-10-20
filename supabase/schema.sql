-- 망켓몬 제작기 공용 DB. Supabase 대시보드 → SQL Editor 에 통째로 붙여 넣고 Run.
-- 문서 하나 = (kind, id, data). kind 는 trainers / pokemon / dbedit / meta / folders.

create table if not exists public.docs (
  kind        text        not null,
  id          text        not null,
  data        jsonb       not null default '{}'::jsonb,
  updated_at  timestamptz not null default now(),
  primary key (kind, id)
);

create or replace function public.docs_touch() returns trigger
language plpgsql as $$ begin new.updated_at = now(); return new; end $$;
drop trigger if exists docs_touch on public.docs;
create trigger docs_touch before update on public.docs
  for each row execute function public.docs_touch();

-- 링크를 아는 사람은 누구나 읽고 고칠 수 있다 (전원 자유).
alter table public.docs enable row level security;
drop policy if exists "docs read"   on public.docs;
drop policy if exists "docs insert" on public.docs;
drop policy if exists "docs update" on public.docs;
drop policy if exists "docs delete" on public.docs;
create policy "docs read"   on public.docs for select to anon, authenticated using (true);
create policy "docs insert" on public.docs for insert to anon, authenticated with check (true);
create policy "docs update" on public.docs for update to anon, authenticated using (true) with check (true);
create policy "docs delete" on public.docs for delete to anon, authenticated using (true);

-- 실시간 반영 (다른 사람이 고친 것이 바로 보이게)
alter table public.docs replica identity full;
do $$ begin
  if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and tablename = 'docs') then
    alter publication supabase_realtime add table public.docs;
  end if;
end $$;
