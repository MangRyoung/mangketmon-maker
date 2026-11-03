-- 망켓몬 제작기 패치 2026-11-03 — 변경 이력 · 최근 지운 것 되살리기
-- Supabase 대시보드 → SQL Editor 에 통째로 붙여 넣고 Run. 여러 번 돌려도 안전하다 (create or replace · if not exists).
--
-- 배경: docs_history 표와 docs_audit 트리거(schema.sql, 10-20 보호 패치)는 이미 있지만 RLS 정책이 없어 anon 이 볼 수 없다.
-- 여기서는 표를 열지 않고, 필요한 만큼만 돌려주는 보안 정의자(security definer) 함수 셋을 둔다.
--   mk_history(doc_path, lim)   : 문서 하나의 옛 판 목록 (최근 것부터 lim 개, 기본 30 · 최대 200)
--   mk_deleted(kind, since)     : 지워진 뒤 아직 되살리지 않은 문서 목록 (기본 30일, docs_history 보관 기간과 같다)
--   mk_snapshot(doc_path)       : 지금 값을 이력에 한 줄 남긴다 (「이 판으로 되돌리기」 직전에 — docs_audit 은 5분 안의 수정은 남기지 않으므로)
-- 제작기(js/maker.js)는 함수가 없으면 「패치 SQL 을 실행해 달라」 안내만 하고 깨지지 않는다.

-- ★ 11-03 11:51 망령: 「relation docs_history does not exist」 — 10-20 보호 패치가 실제 DB 에 안 들어가 있었다.
--   그래서 이력 표 · docs_audit 트리거(20행 보호 · 그림 삭제 정책 제외)를 여기에 같이 둔다. 10-20 패치를 이미 돌렸어도 안전하다.
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
alter table public.docs_history enable row level security;   -- 정책 없음 → anon 직접 접근 불가(아래 함수로만)

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

-- 이력 조회: doc_path = 'kind/id' (id 안에 '/' 가 있어도 첫 '/' 에서만 자른다)
create or replace function public.mk_history(doc_path text, lim int default 30)
returns table (hid bigint, op text, at timestamptz, data jsonb)
language sql security definer set search_path = public stable as $$
  select h.hid, h.op, h.at, h.data
    from public.docs_history h
   where h.kind = split_part(doc_path, '/', 1)
     and h.id   = substr(doc_path, length(split_part(doc_path, '/', 1)) + 2)
   order by h.at desc, h.hid desc
   limit greatest(1, least(coalesce(lim, 30), 200))
$$;

-- 최근 지운 것: 같은 (kind,id) 의 마지막 DELETE 기록 중, 지금 docs 에 없는 것만
create or replace function public.mk_deleted(doc_kind text, since timestamptz default now() - interval '30 days')
returns table (id text, at timestamptz, data jsonb)
language sql security definer set search_path = public stable as $$
  select d.id, d.at, d.data
    from (
      select distinct on (h.id) h.id, h.at, h.data
        from public.docs_history h
       where h.kind = doc_kind and h.op = 'DELETE' and h.at >= coalesce(since, now() - interval '30 days')
       order by h.id, h.at desc, h.hid desc
    ) d
   where not exists (select 1 from public.docs x where x.kind = doc_kind and x.id = d.id)
   order by d.at desc
   limit 300
$$;

-- 지금 값을 이력에 남기기 (op = 'SNAPSHOT'). 문서가 없으면 아무것도 하지 않고 false
create or replace function public.mk_snapshot(doc_path text)
returns boolean
language plpgsql security definer set search_path = public as $$
declare k text := split_part(doc_path, '/', 1); i text := substr(doc_path, length(split_part(doc_path, '/', 1)) + 2); n int;
begin
  insert into public.docs_history(kind, id, data, op)
    select d.kind, d.id, d.data, 'SNAPSHOT' from public.docs d where d.kind = k and d.id = i;
  get diagnostics n = row_count;
  return n > 0;
end $$;

revoke all on function public.mk_history(text, int) from public;
revoke all on function public.mk_deleted(text, timestamptz) from public;
revoke all on function public.mk_snapshot(text) from public;
grant execute on function public.mk_history(text, int) to anon, authenticated;
grant execute on function public.mk_deleted(text, timestamptz) to anon, authenticated;
grant execute on function public.mk_snapshot(text) to anon, authenticated;

-- 이력 조회가 (kind, op, at) 로도 빠르게
create index if not exists docs_history_kind_op_at on public.docs_history (kind, op, at desc);
