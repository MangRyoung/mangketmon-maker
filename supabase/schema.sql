-- 망켓몬 제작기 공용 DB. Supabase 대시보드 → SQL Editor 에 통째로 붙여 넣고 Run.
-- 문서 하나 = (kind, id, data). kind 는 trainers / pokemon / dbedit / meta / folders.
-- 그림(스탠딩 · 큰 시트 이미지)은 아래 Storage 버킷 oremas 에 올린다 (오레마스와 같은 버킷 — 어느 쪽 schema.sql 을 실행해도 같다).

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

-- ---------- 그림 저장소 (Storage 버킷 oremas) ----------
-- 스탠딩 그림과, 문서가 1.5MB 를 넘지 않게 옮긴 시트 이미지가 여기 들어간다. 공개 버킷, 링크를 아는 사람은 누구나 올릴 수 있다 ('전원 자유').
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
  values ('oremas', 'oremas', true, 5242880, array['image/jpeg','image/png','image/webp','image/gif'])
  on conflict (id) do update set public = true, file_size_limit = 5242880, allowed_mime_types = array['image/jpeg','image/png','image/webp','image/gif'];
drop policy if exists "oremas img read"   on storage.objects;
drop policy if exists "oremas img insert" on storage.objects;
drop policy if exists "oremas img update" on storage.objects;
drop policy if exists "oremas img delete" on storage.objects;
create policy "oremas img read"   on storage.objects for select to anon, authenticated using (bucket_id = 'oremas');
create policy "oremas img insert" on storage.objects for insert to anon, authenticated with check (bucket_id = 'oremas');
create policy "oremas img update" on storage.objects for update to anon, authenticated using (bucket_id = 'oremas') with check (bucket_id = 'oremas');
-- (2026-10-20) 그림 지우기 정책은 두지 않는다 — 두 앱 모두 그림을 지우지 않고, 링크만 아는 사람이 남의 그림을 지우지 못하게. 위의 drop 이 예전 정책을 없앤다.

-- ---------- 보호 (2026-10-20): 이력 · 한꺼번 삭제 막기 — 설명은 supabase/patch_2026-10-20_보호.sql ----------
create table if not exists public.docs_history (
  hid  bigserial primary key,
  kind text not null,
  id   text not null,
  data jsonb,
  op   text not null,
  at   timestamptz not null default now()
);
create index if not exists docs_history_kind_id on public.docs_history (kind, id, at desc);
create index if not exists docs_history_at on public.docs_history (at);
alter table public.docs_history enable row level security;   -- 정책 없음 → anon 접근 불가

create or replace function public.docs_audit() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if tg_op = 'DELETE' or old.updated_at < now() - interval '5 minutes' then
    insert into public.docs_history(kind, id, data, op) values (old.kind, old.id, old.data, tg_op);
  end if;
  if random() < 0.01 then delete from public.docs_history where at < now() - interval '30 days'; end if;
  return null;
end $$;
drop trigger if exists docs_audit on public.docs;
create trigger docs_audit after update or delete on public.docs
  for each row execute function public.docs_audit();

create or replace function public.docs_guard_bulk() returns trigger
language plpgsql as $$
begin
  if (select count(*) from old_rows) > 20 then
    raise exception '한 번에 20행 넘게 지우거나 고칠 수 없습니다 (제작기 보호)';
  end if;
  return null;
end $$;
drop trigger if exists docs_guard_bulk_d on public.docs;
create trigger docs_guard_bulk_d after delete on public.docs
  referencing old table as old_rows for each statement execute function public.docs_guard_bulk();
drop trigger if exists docs_guard_bulk_u on public.docs;
create trigger docs_guard_bulk_u after update on public.docs
  referencing old table as old_rows for each statement execute function public.docs_guard_bulk();
