# 망켓몬 제작기 (공용판)

트레이너·포켓몬 시트, DB(기술·특성·포텐셜), 테이블·계산식을 한 페이지에서 다루는 제작기입니다.
GitHub Pages에 올라가는 정적 사이트이고, 데이터는 Supabase 테이블 하나(`docs`)에 저장되어 링크를 아는 사람 모두가 같이 보고 고칩니다.

## 구성

| 경로 | 내용 |
|---|---|
| `index.html` | 페이지 뼈대 |
| `css/maker.css` | 스타일 |
| `js/maker.js` | 제작기 본체 (시트·DB·계산·공유 저장) |
| `js/store.js` | 공유 DB 어댑터 (Supabase) |
| `js/fx/` | 배틀 자동화 — `fx.js`(구문 해석·실행) · `fx_ui.js`(구문 편집기·생성기) · `readymade.js`(레디메이드 사전 915) · `states.js`(상태 변화 DB). **여기가 원본**이고 오레마스 웹툴은 이 파일들을 `https://mangryoung.github.io/mangketmon-maker/js/fx/` 에서 불러간다 |
| `js/config.js` | Supabase URL · anon 키 (**여기만 고치면 됨**) |
| `data/db.js` | 기본 DB (기술·특성·소지품·포텐셜·테이블) |
| `supabase/schema.sql` | DB 테이블·권한·실시간 설정 SQL |
| `supabase/seed.json`, `supabase/import.mjs` | 옛 세션 노트에서 옮겨 온 데이터와 넣는 스크립트 |

## 처음 설정 (한 번만)

1. **Supabase 프로젝트 만들기** — https://supabase.com 에서 무료 프로젝트 하나를 만든다.
2. **SQL 실행** — 대시보드의 *SQL Editor* 에 `supabase/schema.sql` 내용을 붙여 넣고 Run.
3. **키 넣기** — *Project Settings → API* 의 `Project URL`과 `anon public` 키를 `js/config.js`에 적는다.
4. **옛 데이터 옮기기** (선택) — `node supabase/import.mjs <Project URL> <anon 키>`
5. **GitHub Pages** — 저장소 *Settings → Pages → Deploy from a branch → main / (root)*.

`js/config.js`를 비워 두면 공유 없이 브라우저(localStorage)에만 저장하는 혼자 쓰기 모드로 돈다.

## 데이터 구조

`docs(kind text, id text, data jsonb)` 한 테이블.

| kind | 문서 하나 | data |
|---|---|---|
| `trainers` | 트레이너 | `{ord, data:{...트레이너, pids:[포켓몬 id 순서]}}` |
| `pokemon` | 포켓몬 시트 | `{tid:트레이너 id, data:{...포켓몬}}` |
| `folders` | 폴더 | `{ord, name}` |
| `dbedit` | 기본 DB와 달라진 행 하나 | `{kind, key, row, custom, pos}` 또는 `{kind, key, deleted:true}` |
| `meta` | `settings` 하나 | 템플릿·태그·포인트 항목·프라이드 규칙 등 |

기본 DB(`data/db.js`) 자체는 저장소에 넣지 않고, 거기서 **바뀐 행만** `dbedit`로 저장한다. 그래서 기본 DB를 갱신해도 각자의 수정이 남는다.

## 권한

지금은 「전원 자유」: anon 키로 읽기·쓰기·삭제가 모두 열려 있다(`schema.sql`의 정책).
보기만 허용하거나 비밀번호를 두고 싶으면 정책을 바꾸면 된다. anon 키는 공개되어도 되는 키이고, 실제 권한은 이 정책이 정한다.

## 백업

파일 ▾ → **백업 저장** 으로 JSON 한 파일에 전부 내려받을 수 있다. 공유 DB가 날아가도 이 파일로 되돌린다.
