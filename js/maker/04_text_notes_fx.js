/* ── 조각 04_text_notes_fx.js — 복사용 텍스트 · 세션 노트 묶음 · 자동화 구문 불러오기 · 시트 템플릿 ── */
/* ---------- 복사용 텍스트 (더블용 시트 AI118 규칙) ---------- */
const potRow = n => idx.pots.get(n);
const kindCode = k =>
  String(k)
    .replace(/^0|\..*/g, '')
    .trim();
function potKindOf(p, i) {
  const n = p.pots[i];
  if (p.potKind[i]) return p.potKind[i];
  const r = potRow(n);
  return r ? r[0] : '';
}
const AUTO_HELP = `대상: 자신(기본) · 아군전체 · 상대전체 · 자신이외 · 전체 · 아군1체 · 상대1체 · 자신이외무작위 · 상대무작위 · 전원무작위
랭크 [대상] 공격+1 방어-1 … [임시] [강제]        배율 [대상] 공격×1.33 …        초기화 랭크|배율|전부
위력 ×1.3 [대상] [타입:불꽃,물] [물리|특수] [굉장|별로|보통] [단일|전체기] [자속|비자속] [태그:소리,접촉] [위력≥150] [위력≤60] [역할:에이스] [수세|공세] [확정급소|급소없음] [분류최대] [N회] [이번턴] [N턴]
완화 ×0.75 … (받는 쪽, 위력과 같은 조건) · 「견딤」을 붙이면 그 기술로 「빈사」가 되지 않는다 (예: 완화 ×1 1회 견딤)
중첩: 효과 글에 【중첩 (3회)】 가 있으면 같은 포텐셜이 다시 걸릴 때 위력 · 완화 배율(×1.5 → ×2.25 → ×3.375)과 우선도(+1 → +2 → +3)가 그 횟수까지 쌓인다. 없으면 다시 걸 때 덮어쓴다
상태 화상 [대상] [N턴] [강제] · 상태확률 화상 50% [대상] [1체] · 치유 [대상] [독,맹독|이상] [N%] · 상태초기화 [대상] · 효과해제 [대상] [포텐셜|특성|소지품|전부|이름:X]
회복 1/4 [대상] [전부] · 피해 1/8 [대상] [현재|직전|타입:바위] [제외:독] [빈사없음]
날씨 비 5 · 날씨 해제 · 필드 그래스필드 5 · 룸 트릭룸 5 · 필드상태 중력 5 · 설치기 [아군|상대] 리플렉터 5
타입 [대상] 추가|변경|원래 불꽃,비행 · 특성 [대상] 변경 X · 역할 추가 에이스 · 추격 · 하늘위 [N턴]
비례무시 [빈사|설치기|설치기피해|반동] · 우선도 +1 [타입:X] [물리|특수|변화] [이번턴] · 면역 잠듦,마비 · 감소무시 [공격] · 강화무시 [공격시|받음] [방어|회피]
확인 "조건 문장" · 조건 아군빈사 · 조건 HP≤1/2
수세유지 [기술:우드혼,…] [타입:풀] [물리|특수] [HP≤1/2] — 그 기술로 공격해도 자신의 【수세】 효과가 켜진 채
소지품파괴 [대상] · 소지품모두파괴 [대상] · 소지품파괴약탈 [대상] (빈손이면 빼앗고 못 빼앗으면 파괴) · 소지품강탈 [대상] (자신이 받음 · 빈손일 때) · 소지품주기 [대상] (자신의 것을 빈손인 대상에게) · 소지품교환 [대상] · 소지품지정 [대상] 느림보꼬리 · 소지품추가 [대상] 느림보꼬리 (지닌 것은 두고 빈 칸에 하나 더, 3칸까지) — 배틀 한정 · 점착 · 「보호 소지품」 · 못 빼는 소지품(메가스톤 등) · 대역인형이 막는다
선택:  →  - ① 라벨 → 랭크 공격+1  /  - ② 라벨 → 회복 1/4
효과 글의 표식: 【등장】 등장 때 자동 · 【상시】 처음 한 번 자동 · 【N/시】 횟수 · 드물게/저확률/중확률/고확률 확률 판정`;
function autoDsl(p, name) {
  return ((p && p.auto) || {})[String(name || '').replace(/『|』/g, '')] || '';
}
function potEffOf(p, i) {
  if (p.potEff[i] !== '' && p.potEff[i] != null) return p.potEff[i];
  const r = potRow(p.pots[i]);
  return r ? r[2] : '';
}
const nlBr = s => String(s ?? '').replace(/\r?\n|\\n/g, '<br>');
function moveLine(name, r) {
  const g = i => nlBr(r[i] ?? '');
  const en = (typeInfo(g(5)) || [])[3] || 'Normal';
  return [name, g(5), g(6), g(7), g(8), g(9), g(10), g(11), g(12), g(13), g(14), g(15), g(16), g(17), en, g(18) || 1, g(19) || 1].join(';') + ';';
}
/* 전용 포텐셜: 기본 칸(excl) + 추가 칸(exclX). 채워진 것만 */
const exclAll = p => [p.excl, ...(p.exclX || [])].filter(x => x && x.name && x.name !== '전용 포텐셜');
/* 11-25 망령 「고유나 전용 타입별 색으로 꾸밀 수 있게」: 전용은 x.ty(타입 이름) → 그 타입 색, 고유는 꾸미기 창에서 타입 색을 골라 u.color 에 넣는다 */
const tyOpts = sel =>
  S.db.types
    .map(x => x[0])
    .filter(x => x && x !== '-')
    .map(x => `<option value="${esc(x)}" ${x === sel ? 'selected' : ''}>${esc(x)}</option>`)
    .join('');
function copyText(t, p) {
  const basic =
    [p.name, lv(t, p), p.t1, p.t2, p.t3, p.tera, p.ability, ...p.base, ...(p.ev || Array(6).fill('')), prideOf(p), p.egg1, p.egg2]
      .map(x => x ?? '')
      .join(';') + '#';
  const fill = p.pots.map((n, i) => i).filter(i => p.pots[i] && p.pots[i] !== '-');
  const xs = (p.exclX || []).filter(x => x && x.name).slice(0, Math.max(0, 20 - fill.length));
  const names = (fill.map(i => p.pots[i] + ';').join('') + xs.map(x => x.name + ';').join('')).replace(/『|』/g, '');
  const effs = fill.map(i => nlBr(potEffOf(p, i)) + ';').join('') + xs.map(x => nlBr(x.eff || '-') + ';').join('');
  const ord = Array.from({ length: 20 }, (_, j) => {
    const i = fill[j];
    if (i == null) return '999;';
    const k = potKindOf(p, i);
    return (k ? kindCode(k) || '999' : '999') + ';';
  }).join('');
  const xn = p.excl.name && p.excl.name !== '전용 포텐셜' ? p.excl.name : '-';
  const ex = xn + '#' + (xn === '-' ? '-' : nlBr(p.excl.eff || '-')) + '#';
  const mvs = [];
  for (const m of p.moves.filter(m => m.name)) {
    const r = mvRowOv(m) || [];
    mvs.push(moveLine(m.name, r));
  }
  const mv = mvs.join('\\');
  return (nlBr(basic) + names + '#' + effs + '#' + ord + '#' + ex + mv + '#').trim();
}
const cleanF = s => String(s ?? '').replace(/^[\s\\"'​﻿]+|[\s\\"'​﻿]+$/g, '');
const brN = s => String(s ?? '').replace(/<br\s*\/?>/gi, '\n');
const oneLn = s =>
  brN(s)
    .replace(/<[^>]*>/g, '')
    .replace(/\s*\n+\s*/g, ' ')
    .trim();
function isCopyText(s) {
  s = String(s || '').trim();
  return s.split('#').length >= 7 && /^[^#;]+;\s*-?\d+\s*;/.test(cleanF(s));
}
function parseCopy(txt, t) {
  txt = String(txt)
    .trim()
    .replace(/^"+|"+$/g, '')
    .replace(/""/g, '"');
  const seg = txt.split('#');
  const p = newPoke();
  const added = { moves: 0 };
  const b = seg[0].split(';').map(cleanF);
  p.name = b[0] || '';
  const L = +b[1] || 0;
  p.t1 = b[2] || '-';
  p.t2 = b[3] || '-';
  p.t3 = b[4] || '-';
  p.tera = b[5] || '-';
  p.ability = b[6] || '';
  p.base = Array.from({ length: 6 }, (_, i) => b[7 + i] ?? '');
  p.ev = Array.from({ length: 6 }, (_, i) => b[13 + i] ?? '');
  p.pride = b[19] || '';
  p.egg1 = b[20] || '-';
  p.egg2 = b[21] || '-';
  p.dist = t ? L - baseLevel(t.ranks['육성']) : 0;
  const names = (seg[1] || '')
    .split(';')
    .map(cleanF)
    .filter(x => x !== '' && x !== '-');
  const effs = (seg[2] || '').split(';').map(x => brN(cleanF(x)));
  const ords = (seg[3] || '').split(';').map(cleanF);
  const kinds = [...new Set(S.db.pots.map(r => r[0]))];
  names.slice(0, 20).forEach((n, i) => {
    p.pots[i] = n;
    const r = potRow(n);
    const e = effs[i] ?? '';
    p.potEff[i] = r && brN(r[2]).replace(/\\n/g, '\n').trim() === e.trim() ? '' : e;
    const o = ords[i];
    if (o && o !== '999' && (!r || kindCode(r[0]) !== o)) {
      p.potKind[i] = kinds.find(k => kindCode(k) === o) || o;
    }
  });
  const xn = cleanF(seg[4]);
  if (xn && xn !== '-') {
    p.excl.name = xn;
    p.excl.eff = brN(cleanF(seg[5]));
  }
  const mvRaw = seg.slice(6).join('#');
  let blocks = [];
  if (mvRaw.includes('\\')) blocks = mvRaw.split('\\').map(b => b.split(';'));
  else {
    const a = mvRaw.split(';');
    for (let i = 0; i + 16 < a.length; i += 17) blocks.push(a.slice(i, i + 17));
  }
  p.moves = [];
  for (const blk of blocks) {
    const f = blk.slice(0, 17).map((x, j) => (j === 9 ? brN(cleanF(x)) : cleanF(x)));
    while (f.length < 17) f.push('');
    if (!f[0]) continue;
    /* 11-08 망령 「토큰 붙여넣기도 DB 대신 이 포켓몬만으로」: DB 에 없는 기술은 GM 이면 예전처럼 DB 에 오리지널로, PL 이면 그 포켓몬의 기술 덮어쓰기(ov)로만 */
    if (!idx.moves.has(f[0]) && !ME.gm) {
      const ov = { type: f[1], cat: f[2], pow: f[3], acc: f[4], range: f[5], contact: f[6], prio: f[7], eff: f[9] };
      for (const k of Object.keys(ov)) {
        const v = String(ov[k] ?? '').trim();
        if (v === '' || (v === '-' && k !== 'contact')) {
          delete ov[k];
          continue;
        }
        if (['pow', 'acc', 'prio'].includes(k)) {
          if (isNaN(+v)) {
            delete ov[k];
            continue;
          }
          ov[k] = +v;
        } else ov[k] = k === 'eff' ? v.slice(0, 1500) : v;
      }
      p.moves.push(Object.assign({ name: f[0], half: false }, Object.keys(ov).length ? { ov } : {}));
      continue;
    }
    if (!idx.moves.has(f[0])) {
      S.db.moves.push([
        String(3),
        '#오리지널, #가져옴',
        f[0],
        '',
        '',
        f[1],
        f[2],
        f[3],
        f[4],
        f[5],
        f[6],
        f[7],
        f[8],
        f[9],
        f[10],
        f[11],
        f[12],
        f[13],
        f[15],
        f[16]
      ]);
      S.custom.moves.push(f[0]);
      idx.moves.set(f[0], S.db.moves[S.db.moves.length - 1]);
      added.moves++;
    }
    {
      const r = idx.moves.get(f[0]);
      const ov = {}; /* 11-08: 복사 글의 값이 DB 와 다르면 그 칸만 이 포켓몬 덮어쓰기로 (복사 → 붙여넣기로 ov 가 이어진다) */
      if (r)
        for (const [k, j, i] of [
          ['type', 1, 5],
          ['cat', 2, 6],
          ['pow', 3, 7],
          ['acc', 4, 8],
          ['range', 5, 9],
          ['contact', 6, 10],
          ['prio', 7, 11],
          ['eff', 9, 13]
        ]) {
          const v = String(f[j] ?? '').trim();
          const d = cleanF(nlBr(String(r[i] ?? '')));
          if (v === '' || v === (i === 13 ? brN(d) : d).trim()) continue;
          if (['pow', 'acc', 'prio'].includes(k)) {
            if (isNaN(+v)) continue;
            if (+v === +r[i]) continue;
            ov[k] = +v;
          } else ov[k] = k === 'eff' ? v.slice(0, 1500) : v;
        }
      p.moves.push(Object.assign({ name: f[0], half: false }, Object.keys(ov).length ? { ov } : {}));
    }
  }
  if (added.moves) save(true);
  return p;
}

/* ---------- 세션 노트 연동: 트레이너·파티를 계산된 값과 함께 묶어 복사 ---------- */
function sessionPoke(t, p, types) {
  const useT = n => {
    if (!n || n === '-') return;
    String(n)
      .split(/[()]/)
      .filter(Boolean)
      .forEach(x => {
        const ti = typeInfo(x);
        if (ti) types[ti[0]] = [ti[1], ti[2]];
      });
  };
  const tys = [p.t1, p.t2, p.t3].filter(x => x && x !== '-');
  tys.forEach(useT);
  useT(p.tera);
  const fill = p.pots.map((n, i) => i).filter(i => p.pots[i] && p.pots[i] !== '-');
  const ab = idx.abil && idx.abil.get(p.ability),
    it = itemRow(p);
  const hasBase = p.base.some(v => v !== '' && v != null);
  const moves = p.moves
    .filter(m => m.name)
    .map(m => {
      const r = mvRowOv(m) || [];
      const g = i => r[i] ?? '';
      useT(g(5));
      return {
        name: m.name,
        type: g(5),
        cat: g(6),
        pow: String(g(7)),
        acc: String(g(8)),
        range: g(9),
        contact: g(10),
        prio: String(g(11)),
        eff: brN(g(13)),
        sock: String(g(0))
      };
    });
  return {
    id: p.id,
    name: p.name || '',
    gender: p.gender || '-',
    lv: lv(t, p),
    types: tys,
    tera: p.tera || '-',
    ability: p.ability || '',
    abilEff: ab ? brN(ab[2]) : '',
    item: p.item || '',
    itemEff: it ? brN(it[4]) : '',
    items2: (p.items2 || [])
      .filter(x => x.item)
      .map(x => {
        const r = itemRow(x);
        return { item: x.item, itemEff: r ? brN(r[4]) : '' };
      }),
    pride: prideOf(p),
    partner: !!p.partner,
    bench: onBench(p) || undefined,
    awaken: awOf(t, p) || undefined,
    base: p.base.map(v => (v === '' || v == null ? '' : +v)),
    stats: hasBase ? [0, 1, 2, 3, 4, 5].map(i => stat(t, p, i)) : [],
    role: roleOf(p) || '',
    pots: fill.map(i => ({ name: String(p.pots[i]).replace(/『|』/g, ''), kind: potKindOf(p, i) || '', eff: brN(potEffOf(p, i)) })),
    excl: p.excl && p.excl.name && p.excl.name !== '전용 포텐셜' ? { name: p.excl.name, eff: brN(p.excl.eff || '') } : null,
    exclX: (p.exclX || []).filter(x => x && x.name).map(x => ({ name: x.name, eff: brN(x.eff || '') })),
    moves,
    memo: p.memo || '',
    image: safeImg(p.image) && p.image.length < 60000 ? p.image : '',
    stands: standsFix(p.stands),
    standActive: +p.standActive || 0,
    copy: copyText(t, p)
  };
}
function sessionBundle(ts) {
  const types = {};
  const trainers = ts.map(t => ({
    id: t.id,
    name: t.name || '트레이너',
    kind: t.kind === 'npc' ? 'npc' : 'pc',
    image: safeImg(t.image) && t.image.length < 90000 ? t.image : '',
    ranks: Object.assign({}, t.ranks),
    unique: (t.unique || []).filter(u => u && u.name).map(u => ({ name: u.name, eff: brN(u.eff || '') })),
    misag: misagOut(t),
    pokemon: t.pokemon.map(p => sessionPoke(t, p, types))
  }));
  return { kind: 'mkm-session', v: 1, at: Date.now(), from: '망켓몬 제작기', types, trainers };
}
async function copySession(ts) {
  if (!ts.length) return toast('트레이너가 없습니다');
  const s = JSON.stringify(sessionBundle(ts));
  const msg = ts.length === 1 ? `「${ts[0].name}」를 세션 노트용으로 복사했습니다` : `트레이너 ${ts.length}명을 세션 노트용으로 복사했습니다`;
  try {
    await navigator.clipboard.writeText(s);
    toast(msg);
  } catch (e) {
    copyStr(s);
  }
}

/* ---------- 자동화 구문 (js/fx/ 의 fx.js · fx_ui.js · 레디메이드 사전 · 상태 DB — 이 저장소가 원본이고 오레마스 웹툴이 여기서 불러간다) ----------
   포켓몬마다 p.auto[이름] = 구문(DSL 문자열). 오레마스가 시트를 가져갈 때 그대로 읽는다. 같은 이름의 레디메이드가 있으면 구문을 비워 둬도 자동으로 돈다. */
const FX_SRC = (window.MKM_CONFIG && MKM_CONFIG.fxBase) || 'js/fx/';
const FXK = n =>
  String(n || '')
    .replace(/『|』/g, '')
    .trim();
const fxReady = () => !!(window.OM_FX && window.OM_FX_UI);
/* fx_ui 창의 「닫기」(data-x)는 오레마스 창이 알아서 닫지만 제작기 창은 직접 이어 줘야 한다 */
window.OM_APP = window.OM_APP || {
  openModal: h => {
    const l = openModal(h, { wide: true });
    l.addEventListener('click', e => {
      if (e.target.closest('[data-x]')) closeModal();
    });
    return l;
  },
  closeModal: () => closeModal(),
  toast: t => toast(t),
  ST: { role: 'player', state: {} },
  set: async () => false
};
let fxLoadP = null,
  FXST = ''; /* '' 불러오는 중 · ok · fail */
function loadFx() {
  if (fxReady()) return Promise.resolve(true);
  if (fxLoadP) return fxLoadP;
  const one = src =>
    new Promise((res, rej) => {
      const s = document.createElement('script');
      s.src = FX_SRC + src + '?v=202611290025pw';
      s.onload = () => res();
      s.onerror = () => rej(new Error(src));
      document.head.appendChild(s);
    });
  FXST = '';
  fxLoadP = (async () => {
    try {
      await one('states.js');
      await one('readymade.js');
      await one('fx.js');
      await one('fx_ui.js');
      await one('itemrule.js');
      try {
        await one('moveauto.js');
      } catch (e) {}
      FXST = 'ok';
      rmInit();
      stInit();
      if (S.ui && S.ui.tab) refreshAll();
      return true;
    } catch (e) {
      console.warn('[구문] 자동화 스크립트를 불러오지 못함', e);
      FXST = 'fail';
      toast('자동화 구문 스크립트를 불러오지 못했습니다 · 「구문 ⟳」을 눌러 다시 시도');
      if (S.ui && S.ui.tab) refreshAll();
      return false;
    }
  })();
  return fxLoadP;
}
function fxRetry() {
  if (fxReady()) return;
  fxLoadP = null;
  toast('구문 스크립트를 다시 불러옵니다…');
  loadFx();
  if (S.ui && S.ui.tab) refreshAll();
}
document.addEventListener(
  'click',
  e => {
    const b = e.target.closest && e.target.closest('[data-fxretry]');
    if (!b) return;
    e.preventDefault();
    e.stopPropagation();
    fxRetry();
  },
  true
);
const fxRetryBtn = () =>
  FXST === 'fail'
    ? '<button type="button" class="btn sm ghost" data-fxretry title="자동화 구문 스크립트를 불러오지 못했습니다 — 눌러서 다시 시도">구문 ⟳</button>'
    : '';
/* 오리지널 소지품: DB 에 넣지 않고 그 포켓몬 시트(p.itemOwn)에만 둔다 (10-24 망령). DB 행과 같은 꼴로 돌려준다 */
function ownItem(p) {
  const o = p && p.itemOwn;
  return o && typeof o === 'object' && o.name && o.name === p.item ? o : null;
}
function itemRow(p) {
  if (!p || !p.item) return null;
  const r = idx.items && idx.items.get(p.item);
  if (r) return r;
  const o = ownItem(p);
  return o ? [o.kind || '오리지널', o.name, '', o.cons ? 'O' : '-', o.eff || '', o.sock || '-', '이 포켓몬만 (DB 에 없음)', o.auto || ''] : null;
}
/* 소지품 칸 (10-24 망령): 기본 1칸(p.item) + 조건에 따라 2 · 3번 칸(p.items2 = [{item, itemOwn}]) */
function itemSlotsHtml(p, ti, pi) {
  const X = p.items2 || [];
  const A = (act, k) => `data-act="${act}" data-i="${ti}" data-j="${pi}" data-k="${k}"`;
  return `${X.map((x, k) => {
    const r = itemRow(x),
      ow = ownItem(x) && !idx.items.get(x.item);
    return `<div class="islot"><span class="islk">소지품 ${k + 2}</span><button class="pickbtn" ${A('pickItemX', k)}>${x.item ? `<b>${esc(x.item)}</b>${ilockChip(x.item)}<span class="sp"></span><span class="faint small">${ow ? '오리지널 · 시트에만' : r ? '소켓 ' + esc(r[5]) : 'DB에 없음'}</span>` : '<span class="ph0">소지품 검색…</span>'}</button><button type="button" class="btn sm ghost danger" ${A('delItemX', k)} aria-label="소지품 ${k + 2}번 칸 지우기" title="이 칸 지우기">×</button></div>
  ${r ? `<div class="effbox"><b>${esc(x.item)}</b> ${rich(r[4])} ${ow ? `<span class="faint">· 오리지널 (이 포켓몬만 · DB 에 없음)${r[3] === 'O' ? ' · 소모품' : ''}</span> <button class="btn sm" ${A('ownItemX', k)}>수정</button>` : r[6] && r[6] !== '-' ? `<span class="faint">· ${esc(r[6])}</span>` : ''}<span class="fxrow">${fxAutoBtn(p, 'item', x.item, ti, pi)}</span></div>` : x.item ? `<div class="effbox"><b>${esc(x.item)}</b> DB에 없는 소지품입니다. <button class="btn sm" ${A('ownItemX', k)}>이 포켓몬만 쓰는 오리지널로 효과 적기</button></div>` : ''}`;
  }).join('')}
 <div class="row islot-add"><button type="button" class="btn sm" data-act="addItemX" data-i="${ti}" data-j="${pi}" ${X.length >= 2 ? 'disabled' : ''}>＋ 소지품 칸</button><span class="small faint">기본 1칸 · 조건에 따라 최대 3칸 (${1 + X.length}/3)</span></div>`;
}
function fxEffOf(p, kind, name, slot) {
  if (kind === 'trait') {
    const r = idx.abil.get(name);
    return r ? r[2] : '';
  }
  if (kind === 'item') {
    const x = name === p.item ? p : (p.items2 || []).find(q => q.item === name);
    const r = x ? itemRow(x) : idx.items.get(name);
    return r ? r[4] : '';
  }
  if (slot === 'excl') return p.excl.eff || '';
  if (typeof slot === 'string' && slot[0] === 'x') {
    const x = (p.exclX || [])[+slot.slice(1)];
    return x ? x.eff : '';
  }
  if (typeof slot === 'number') return potEffOf(p, slot);
  if (typeof slot === 'string' && slot[0] === 'e') {
    const [fk, xi] = slot.slice(1).split('.').map(Number);
    const x = (((p.forms || [])[fk] || {}).exs || [])[xi];
    return x ? x.eff || '' : '';
  } /* 11-26 폼 전용(exs) 구문 */
  if (typeof slot === 'string' && slot[0] === 'f') {
    const [fk, xi] = slot.slice(1).split('.').map(Number);
    const x = ((p.forms || [])[fk] || {}).pots;
    const it = x && x[xi];
    if (it) {
      if (it.eff) return it.eff;
      const r = potRow(it.name);
      return r ? r[2] : '';
    }
    return '';
  }
  const i = p.pots.indexOf(name);
  return i >= 0 ? potEffOf(p, i) : '';
}
function fxRm(kind, name) {
  if (!fxReady() || !name) return null;
  try {
    return OM_FX.autoOf({ auto: {} }, kind, name);
  } catch (e) {
    return null;
  }
}
function fxAutoBtn(p, kind, name, ti, pi, slot) {
  if (!name) return '';
  if (!fxReady()) return fxRetryBtn();
  const K = OM_FX;
  const own = String((p.auto || {})[FXK(name)] || '').trim();
  const base = fxRm(kind, name);
  const has = !!own;
  const rmHas = !!(base && base.ops && base.ops.length && !base.manual);
  let ttl = '';
  try {
    ttl = has
      ? K.unparse(K.parse(own).ops).join(' / ')
      : rmHas
        ? '레디메이드 자동: ' + K.unparse(base.ops).join(' / ')
        : base && base.manual
          ? '레디메이드는 있지만 자동화 미지원 (손으로)'
          : '자동화 없음 — 구문을 써 넣을 수 있다';
  } catch (e) {}
  return `<button type="button" class="btn sm fxb ${has ? 'pri' : rmHas ? '' : 'ghost'}" data-act="fx" data-i="${ti}" data-j="${pi}" data-kind="${kind}" data-name="${esc(name)}" data-slot="${slot == null ? '' : esc(String(slot))}" title="${esc(ttl)}">${has ? '구문 ✓' : rmHas ? '자동' : '구문'}</button>`;
}
function fxRmChip(kind, name) {
  const base = fxRm(kind, name);
  if (!base || !base.ops || !base.ops.length) return '';
  let ttl = '';
  try {
    ttl = OM_FX.unparse(base.ops).join(' / ');
  } catch (e) {}
  return `<span class="kindb fx-rm" title="${esc('레디메이드 자동화: ' + ttl)}">${base.manual ? '자동화 (손으로)' : '자동화'}</span>`;
}
function fxOpen(t, p, kind, name, slot) {
  if (!fxReady()) return toast('구문 편집기를 아직 불러오는 중입니다');
  const K = OM_FX;
  const mon = { auto: {} };
  for (const k in p.auto || {}) {
    const v = String(p.auto[k] || '').trim();
    if (v) mon.auto[k] = { dsl: v, ops: K.parse(v).ops };
  }
  OM_FX_UI.openEditor({
    mon,
    kind,
    name,
    text: fxEffOf(p, kind, name, slot),
    save: auto => {
      p.auto = p.auto || {};
      const key = FXK(name);
      if (auto && auto.dsl) p.auto[key] = auto.dsl;
      else delete p.auto[key];
      save();
      refreshTrainer(t);
      toast(auto ? '구문을 저장했습니다' : '구문을 지웠습니다');
    }
  });
}
/* ---------- 시트 템플릿 ---------- */
function stplRankOk(rk, have) {
  if (have == null) return false;
  const ps = String(rk || '')
    .split('~')
    .map(x => RV[strip(x.trim())]);
  if (ps[0] == null || have < ps[0]) return false;
  if (ps.length > 1 && ps[1] != null && have > ps[1]) return false;
  return true;
}
/* 대상: 「전원」 「파트너」 「N체」 「파트너 N체」. 「6체 기준/1인 기준」처럼 「/」로 나누면 1인 기준(2체) 트레이너는 뒤쪽을 씁니다. 1인 기준은 모두 파트너. */
function stplTarget(tg, solo) {
  const sp = String(tg || '')
    .split('/')
    .map(x => x.trim());
  const v = (solo && sp[1] ? sp[1] : sp[0]) || '전원';
  const m = v.match(/(\d+)\s*체/);
  return { partner: /파트너/.test(v) && !solo, cap: m ? +m[1] : Infinity };
}
function stplRows(t) {
  const m = new Map();
  for (const r of S.db.stpl || []) {
    const [q, rk, kind, name, , tg] = r;
    if (!name) continue;
    if (q !== '기본' && !stplRankOk(rk, RV[strip(t && t.ranks ? t.ranks[q] : 'C')])) continue;
    m.set(name, { kind: kind || '', name, tg: tg || '전원' });
  }
  if (isMong(t)) for (const r of mongRows(t)) m.set(r.name, r);
  return [...m.values()];
}
function stplCount(q) {
  const h = {};
  q.pots.forEach((n, i) => {
    if (!n) return;
    const k = potKindOf(q, i);
    const g = k ? potGroup(k) : n;
    h[g] = (h[g] || 0) + 1;
  });
  return h;
}
function applySheetTpl(t, p) {
  const all = stplRows(t).sort((a, b) => String(a.kind).localeCompare(String(b.kind), 'ko', { numeric: true }));
  const grp = r => (r.kind ? potGroup(r.kind) : r.name);
  const pos = {},
    nth = {};
  all.forEach(r => {
    const g = grp(r);
    pos[g] = (pos[g] || 0) + 1;
    nth[r.name] = pos[g];
  });
  const sibs = ((t && t.pokemon) || []).filter(x => x !== p && x.id !== p.id).map(stplCount);
  const rows = all.filter(r => {
    const tg = stplTarget(r.tg, soloN(t) === 2);
    if (tg.partner && !p.partner) return false;
    if (tg.cap < Infinity) {
      const g = grp(r);
      if (sibs.filter(h => (h[g] || 0) >= nth[r.name]).length >= tg.cap) return false;
    }
    return true;
  });
  const have = stplCount(p);
  const names = new Set(p.pots.filter(Boolean));
  const byG = {};
  rows.forEach(r => {
    (byG[grp(r)] = byG[grp(r)] || []).push(r);
  });
  const add = [];
  for (const r of rows) {
    const g = grp(r);
    if (names.has(r.name)) continue;
    const list = byG[g];
    const deficit = list.length - (have[g] || 0);
    if (deficit <= 0) continue;
    if (list.indexOf(r) < list.length - deficit) continue;
    add.push(r);
  }
  let n = 0;
  for (const r of add) {
    const i = p.pots.findIndex(x => !x);
    if (i < 0) break;
    const row = potRow(r.name);
    p.pots[i] = r.name;
    p.potEff[i] = '';
    p.potKind[i] = row && row[0] === r.kind ? '' : r.kind;
    n++;
  }
  return n;
}
const STPL_SKIP = ['와일드', '와일드 보스', '디멘션 보스'];
function stplApplyAll() {
  let n = 0,
    k = 0;
  for (const t of S.trainers)
    for (const p of t.pokemon || []) {
      if (p.pots.some(x => STPL_SKIP.includes(x))) continue;
      const a = applySheetTpl(t, p);
      if (a) {
        n += a;
        k++;
      }
    }
  return [n, k];
}

