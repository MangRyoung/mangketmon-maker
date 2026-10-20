-- 망켓몬 제작기 공용 DB 보호 (2026-10-20 반디) — Supabase 대시보드 → SQL Editor 에 이 파일 전체를 붙여 넣고 Run. 여러 번 실행해도 된다.
-- 하는 일
--   1) 이력 표 docs_history: 문서가 지워지면 지우기 전 내용을, 고쳐지면 (마지막 수정에서 5분 넘게 지난 경우) 고치기 전 내용을 남긴다.
--      이 표는 정책이 없어서 링크를 아는 사람(anon)은 읽지도 고치지도 못한다. 대시보드에서만 보인다. 30일 지난 이력은 저절로 지운다.
--   2) 한꺼번에 20행 넘게 지우거나 고치는 요청은 막는다. 제작기는 한 번에 한 행씩만 쓰므로 평소 사용에는 영향이 없다.
--      (supabase/import.mjs 로 seed 를 다시 올리는 것도 막힌다 — 처음 한 번만 쓰는 스크립트다)
--   3) 그림 저장소(oremas 버킷)에서 anon 이 그림을 지우는 권한을 없앤다. 두 앱 모두 그림을 지우지 않는다.

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

drop policy if exists "oremas img delete" on storage.objects;

-- ---------- 되살리기 (필요할 때만, 대시보드 SQL Editor 에서) ----------
-- 최근 2시간 안에 지워진 문서를 지워지기 직전 내용으로 되살리기:
--   insert into public.docs(kind, id, data)
--   select distinct on (kind, id) kind, id, data from public.docs_history
--    where op = 'DELETE' and at > now() - interval '2 hours' order by kind, id, at desc
--   on conflict (kind, id) do nothing;
-- 문서 하나의 옛 내용 보기:
--   select at, op, data from public.docs_history where kind = 'trainers' and id = '<트레이너 id>' order by at desc;
