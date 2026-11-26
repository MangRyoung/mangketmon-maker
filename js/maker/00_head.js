/* ── 조각 00_head.js — 머리 · 불러오기 ── */
'use strict';
const $ = (s, r = document) => r.querySelector(s),
  $$ = (s, r = document) => [...r.querySelectorAll(s)];
const esc = s => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
const uid = () => Math.random().toString(36).slice(2, 10);
const clone = o => JSON.parse(JSON.stringify(o));
/* 이미지는 data:image 만, 색은 #hex · 이름 · rgb() 만 받는다 (백업·공유 저장소로 들어온 값이 HTML을 깨지 않게) */
const safeImg = u =>
  /^data:image\/(png|jpe?g|webp|gif);base64,[A-Za-z0-9+/=]+$/.test(String(u || '')) || /^https:\/\/[^\s"'<>()\\]+$/.test(String(u || ''))
    ? u
    : ''; /* 시트 안 그림(data URL) 또는 공유 저장소에 올린 그림 주소 */
const safeCss = c => (/^(#[0-9a-f]{3,8}|[a-z]{3,20}|rgba?\([\d\s.,%]+\)|var\(--[\w-]+\))$/i.test(String(c || '').trim()) ? String(c).trim() : '');
/* data-p 경로의 한 칸: 「.」과 「%」가 든 이름(포인트 항목 등)도 쓸 수 있게 */
const seg = k => String(k).replace(/%/g, '%25').replace(/\./g, '%2E');
const unseg = k => String(k).replace(/%2E/gi, '.').replace(/%25/g, '%');
const DEF = window.MKM_DB;
if (DEF && !Array.isArray(DEF.cards)) DEF.cards = []; /* 카드 DB (10-26 망령) — 기본 행 없이 오리지널로만 채운다 */
/* 포텐셜 종류 표기를 「번호. 이름」 하나로 (00.1.역할 → 00.1. 역할, 14.특권 → 14. 특권). 필터·템플릿 매칭이 갈라지지 않게 */
const normKind = k => String(k == null ? '' : k).replace(/^(\d+(?:\.\d+)*\.)\s*(?=\S)/, '$1 ');
for (const r of DEF.pots || []) if (r) r[0] = normKind(r[0]);
/* 제작기에서 고친 레디메이드 → fx.js 가 기본 대신 쓴다 (행이 바뀐 것만 다시 파싱) */
const RMC = new Map();
window.MKM_RM = () => {
  const rows = (S && S.db && S.db.rm) || [];
  const out = {};
  for (const r of rows) {
    const key = r[0];
    if (!key) continue;
    const sig = r[1] + '\u0001' + r[2] + '\u0001' + r[3] + '\u0001' + (r[4] || '');
    let c = RMC.get(key);
    if (!c || c.sig !== sig) {
      c = { sig, v: { text: r[1] || '', ops: window.OM_FX ? window.OM_FX.parse(r[2] || '').ops : [], manual: r[3] === 'O' ? 1 : 0 } };
      {
        const pc = String(r[4] == null ? '' : r[4]).trim();
        if (pc !== '' && +pc > 0) c.v.p = Math.min(100, +pc);
      }
      RMC.set(key, c);
    }
    out[key] = c.v;
  }
  return out;
};
/* 레디메이드 DB: data/readymade.js 를 행으로 (이름 · 효과 글 · 구문 · 손으로). 수정은 다른 DB 처럼 dbedit 로 공유되고, 오레마스가 「제작기 새로고침」으로 가져간다 */
if (!Array.isArray(DEF.rm)) DEF.rm = []; /* 행은 fx 스크립트를 불러온 뒤 rmInit 이 채운다 */
function rmInit() {
  if (!(window.OM_DB && window.OM_DB.readymade && window.OM_FX)) return false;
  if (!DEF.rm || !DEF.rm.length) {
    DEFJ = null;
    DEF.rm = Object.keys(window.OM_DB.readymade)
      .sort((a, b) => a.localeCompare(b, 'ko'))
      .map(n => {
        const r = window.OM_DB.readymade[n];
        return [n, String(r.text || ''), window.OM_FX.unparse(r.ops || []).join('\n'), r.manual ? 'O' : '', r.p != null ? String(r.p) : ''];
      });
  }
  /* 공유 모드: 레디메이드 기본 행이 이제 생겼으니 받아 둔 수정 행(dbedit/rm.*)을 그 위에 다시 짠다 */
  let shr = false;
  try {
    shr = SH.ready;
  } catch (e) {}
  if (shr) {
    shRebuildDB();
    return true;
  }
  if (S.db && (!S.db.rm || !S.db.rm.length)) {
    S.db.rm = clone(DEF.rm);
    if (!S.custom.rm) S.custom.rm = [];
    reindex();
  }
  return true;
}
const rmLoaded = () => !!(DEF.rm && DEF.rm.length);
/* 상태 변화 DB: js/fx/states.js ({v,groups,hidden,st}) 를 행으로. 맵툴 「상태 변화 DB」의 백업 JSON 과 같은 꼴이라 그대로 불러오고 내보낼 수 있다.
   수정은 dbedit/st.* 로 공유되고, 오레마스가 「제작기 새로고침」으로 가져간다. 제작기 안의 구문 엔진도 고친 표를 바로 쓴다 */
if (!Array.isArray(DEF.st)) DEF.st = [];
let ST_BASE = null;
const ST_HIDE = '(숨김)';
function stRowsOf(o) {
  o = o || {};
  const st = o.st || {};
  const gOf = {};
  (o.groups || []).forEach(g =>
    (g.s || []).forEach(k => {
      if (!gOf[k]) gOf[k] = g.l;
    })
  );
  const hid = new Set(o.hidden || []);
  const ord = [];
  (o.groups || []).forEach(g =>
    (g.s || []).forEach(k => {
      if (st[k] && !ord.includes(k)) ord.push(k);
    })
  );
  for (const k in st) if (!ord.includes(k)) ord.push(k);
  return ord.map(k => {
    const e = st[k] || {};
    return [
      k,
      String(e.ko || ''),
      gOf[k] || (hid.has(k) ? ST_HIDE : ''),
      String(e.min ?? ''),
      String(e.max ?? ''),
      String(e.roll || ''),
      String(e.prog || ''),
      e.abn ? 'O' : '',
      e.neg ? 'O' : '',
      e.bat ? 'O' : '',
      (Array.isArray(e.desc) ? e.desc : String(e.desc || '').split('\n')).join('\n'),
      String(e.memo || ''),
      String(e.img || '')
    ];
  });
}
function stObjOf(rows) {
  const st = {},
    groups = [],
    gi = {},
    hidden = [];
  const num = v => {
    const n = +v;
    return v === '' || isNaN(n) ? 0 : n;
  };
  for (const r of rows || []) {
    const k = String(r[0] || '').trim();
    if (!k) continue;
    st[k] = {
      ko: r[1] || k,
      min: num(r[3]),
      max: num(r[4]),
      roll: r[5] || '',
      abn: r[7] === 'O' ? 1 : 0,
      neg: r[8] === 'O' ? 1 : 0,
      bat: r[9] === 'O' ? 1 : 0,
      prog: r[6] || 'turn',
      desc: String(r[10] || '')
        .split(/\r?\n/)
        .map(x => x.trim())
        .filter(Boolean),
      memo: r[11] || ''
    };
    if (r[12]) st[k].img = r[12];
    const g = String(r[2] || '').trim();
    if (g === ST_HIDE || !g) {
      hidden.push(k);
      continue;
    }
    if (gi[g] == null) {
      gi[g] = groups.length;
      groups.push({ l: g, s: [] });
    }
    groups[gi[g]].s.push(k);
  }
  return { v: 1, groups, hidden, st };
}
function stInit() {
  const o = window.OM_DB && window.OM_DB.states;
  if (!o || !o.st) return false;
  if (!ST_BASE) ST_BASE = clone(o);
  if (!DEF.st || !DEF.st.length) {
    DEFJ = null;
    DEF.st = stRowsOf(ST_BASE);
  }
  let shr = false;
  try {
    shr = SH.ready;
  } catch (e) {}
  if (shr) {
    shRebuildDB();
    stApply();
    return true;
  }
  if (S.db && (!S.db.st || !S.db.st.length)) {
    S.db.st = clone(DEF.st);
    if (!S.custom.st) S.custom.st = [];
    reindex();
  }
  /* 아이콘 칸이 생기기 전에 저장된 행: 기본 아이콘을 채운다 (안 채우면 모든 행이 「바뀐 행」이 된다) */
  for (const r of (S.db && S.db.st) || [])
    if (r.length < 13) {
      const d = DEF.st.find(x => x[0] === r[0]);
      r[12] = d ? d[12] : '';
    }
  stApply();
  return true;
}
/* 아이콘: 파일 이름이면 오레마스 img/state/ 의 것, 주소(https:·data:)면 그대로 */
const stIcon = v => (!v ? '' : /^(https?:|data:image\/)/.test(v) ? v : 'https://mangryoung.github.io/oremas/img/state/' + encodeURIComponent(v));
const stLoaded = () => !!(DEF.st && DEF.st.length);
function stApply() {
  if (!stLoaded() || !S.db || !S.db.st || !S.db.st.length || !window.OM_DB) return;
  window.OM_DB.states = stObjOf(S.db.st);
}
const lazyOk = k => (k === 'rm' ? rmLoaded() : k === 'st' ? stLoaded() : true);

