/* ── 조각 05_model.js — 모델 · 기술 범위 그림 ── */
/* ---------- 모델 ---------- */
function newPoke() {
  return {
    id: uid(),
    open: true,
    tab: 'base',
    name: '',
    gender: '-',
    pride: '',
    egg1: '-',
    egg2: '-',
    t1: '-',
    t2: '-',
    t3: '-',
    tera: '-',
    ability: '',
    item: '',
    dist: 0,
    base: Array(6).fill(''),
    ev: Array(6).fill(''),
    pots: Array(20).fill(''),
    potEff: Array(20).fill(''),
    potKind: Array(20).fill(''),
    excl: { name: '', eff: '' },
    exclX: [],
    moves: [],
    sockMax: '',
    memo: '',
    image: '',
    stands: [],
    standActive: 0,
    partner: false,
    awaken: '',
    auto: {},
    forms: [],
    fields: []
  };
}
function fixP(p) {
  const n = newPoke();
  for (const k in n) if (p[k] == null) p[k] = n[k];
  for (const k of ['pots', 'potEff', 'potKind']) while (p[k].length < 20) p[k].push('');
  p.moves = (p.moves || []).filter(m => m && m.name);
  p.exclX = (Array.isArray(p.exclX) ? p.exclX : [])
    .filter(x => x && typeof x === 'object')
    .map(x => ({ name: String(x.name || ''), eff: String(x.eff || '') }));
  delete p.iv;
  delete p.nature;
  if (Array.isArray(p.ivs) && p.ivs.length === 6) p.ivs = ivNorm(p.ivs, p); /* 11-26 분류 고정(천부 · 금관)도 여기서 */
  else delete p.ivs;
  if (p.ivLog && typeof p.ivLog !== 'object') delete p.ivLog;
  {
    const R = ivRollsOf(p);
    if (R && R.length) p.ivRolls = { rolls: R, x: +p.ivRolls.x || 0, r: +p.ivRolls.r || 0 };
    else delete p.ivRolls;
  }
  p.image = safeImg(p.image);
  p.stands = standsFix(p.stands);
  p.fields = fieldsFix(p.fields);
  if (!(+p.standActive >= 0) || +p.standActive >= p.stands.length) p.standActive = 0;
  p.potKind = p.potKind.map(k => (k ? normKind(k) : ''));
  if (!p.auto || typeof p.auto !== 'object') p.auto = {};
  if (p.tune) tuneOf(p);
  p.forms = (Array.isArray(p.forms) ? p.forms : []).filter(f => f && typeof f === 'object').map(fixForm);
  p.items2 = (Array.isArray(p.items2) ? p.items2 : [])
    .filter(x => x && typeof x === 'object')
    .slice(0, 2)
    .map(x => Object.assign({ item: String(x.item || '') }, x.itemOwn && typeof x.itemOwn === 'object' ? { itemOwn: x.itemOwn } : {}));
  if (!p.id) p.id = uid();
  return p;
}
/* 폼체인지·메가진화: 오레마스 배틀에서 바꿔 들어갈 모습 (이름·타입·특성·종족치·그림) */
const FORM_KINDS = ['폼체인지', '메가진화', '원시회귀', '일루젼', '기타'];
function newForm() {
  return {
    name: '',
    kind: '폼체인지',
    t1: '-',
    t2: '-',
    ability: '',
    base: Array(6).fill(''),
    image: '',
    cond: '',
    revert: true,
    pots: [],
    mvs: [],
    mvRep: false
  };
} /* 11-14 mvs: 폼일 때 바뀌는 기술 [{from:원래 기술 이름('' = 추가), to:새 기술}] · 11-26 망령 「아예 교체 될 수도 있도록」 mvRep: 원래 기술은 다 빼고 이 폼 기술(mvs 의 to)만 */
function fixForm(f) {
  const n = newForm();
  for (const k in n) if (f[k] == null) f[k] = n[k];
  f.base = Array.from({ length: 6 }, (_, i) => String((f.base || [])[i] ?? ''));
  f.image = safeImg(f.image);
  f.revert = !!f.revert;
  f.pots = (Array.isArray(f.pots) ? f.pots : [])
    .filter(x => x && typeof x === 'object')
    .map(x =>
      Object.assign(
        { slot: Math.max(0, Math.min(19, +x.slot || 0)), name: String(x.name || ''), eff: String(x.eff || '') },
        String(x.auto || '').trim() ? { auto: String(x.auto).trim().slice(0, 1500) } : {}
      )
    );
  f.mvs = (Array.isArray(f.mvs) ? f.mvs : [])
    .filter(x => x && typeof x === 'object')
    .map(x => ({ from: String(x.from || ''), to: String(x.to || '') }));
  f.exs = (Array.isArray(f.exs) ? f.exs : [])
    .filter(x => x && typeof x === 'object')
    .slice(0, 6)
    .map(x =>
      Object.assign(
        { name: String(x.name || ''), eff: String(x.eff || '') },
        String(x.auto || '').trim() ? { auto: String(x.auto).trim().slice(0, 1500) } : {}
      )
    );
  f.exRep = !!f.exRep;
  f.mvRep = !!f.mvRep;
  return f;
} /* 11-14 exs: 이 폼일 때만 생기는 전용 포텐셜 · exRep: 원래 전용은 쓰지 않음 */
/* 11-26 05:38 망령 「폼체인지 포텐셜에 추천기나 구문 제작」: 공유 폼(트레이너 sforms)의 교체 포텐셜 · 전용 칸은 구문을 그 칸(x.auto)에 둔다 — 개별 포켓몬 폼은 예전처럼 p.auto(이름) */
function fxFormBtn(ti, pi, k, fk, xi, x) {
  if (!x || !x.name) return '';
  if (!fxReady()) return fxRetryBtn();
  const has = !!String(x.auto || '').trim();
  let ttl = '자동화 없음 — 구문을 써 넣거나 추천을 받을 수 있다';
  try {
    if (has) ttl = OM_FX.unparse(OM_FX.parse(x.auto).ops).join(' / ');
  } catch (e) {}
  return `<button type="button" class="btn sm fxb ${has ? 'pri' : 'ghost'}" data-act="fxForm" data-i="${ti}" data-j="${pi}" data-k="${k}" data-fk="${fk}" data-x="${xi}" title="${esc(ttl)}">${has ? '구문 ✓' : '구문'}</button>`;
}
function formFromOld(r) {
  const mega = r[10] === 'O';
  return fixForm({
    name: r[1],
    kind: mega ? '메가진화' : '폼체인지',
    t1: r[3] || '-',
    t2: r[4] || '-',
    ability: abilName(r[5]),
    base: r.slice(11, 17).map(v => String(v ?? '')),
    revert: !mega
  });
}
/* 11-14 망령 「고유로 기능 확장처럼 아군 전원에게 공유시키는 폼체인지」: SH=1 이면 트레이너의 공유 폼(t.sforms) — 같은 편집 칸을 쓰되 data-j="s" · 경로 T.i.sforms.k. 오레마스에서 이 트레이너의 모든 포켓몬 폼 목록 뒤에 붙는다 */
const SF_P = () => ({
  base: Array(6).fill(''),
  pots: Array(20).fill(''),
  potEff: Array(20).fill(''),
  potKind: Array(20).fill(''),
  moves: [],
  forms: []
});
function formsHtml(t, ti, p, pi, P, SH) {
  const FK = SH ? 'sforms' : 'forms';
  if (SH) p = Object.assign(SF_P(), { forms: t.sforms || [] });
  const fs = p.forms || [];
  const types = S.db.types.map(x => x[0]);
  const A = (act, k) => `data-act="${act}" data-i="${ti}" data-j="${pi}"${k != null ? ` data-k="${k}"` : ''}`;
  return `<div class="${SH ? 'mksp' : 'panel'} fmp"><h3>${SH ? '공유 폼체인지 <span class="small muted" style="font-weight:400">PT 전원이 쓸 수 있는 폼 — 오레마스에서 이 트레이너의 모든 포켓몬 폼 목록에 붙는다 · 비워 둔 칸(이름 · 타입 · 특성 · 종족치)은 그 포켓몬 것 그대로</span>' : '폼체인지 · 메가진화'}<span class="sp"></span><button class="btn sm" ${A('addFormOld')} title="올드 타입 일람(메가진화·리전 폼 등)의 타입·특성·종족치를 채웁니다">+ 일람에서</button><button class="btn sm" ${A('addForm')}>+ 빈 폼</button></h3>
 ${
   fs.length
     ? fs
         .map((f, k) => {
           const F = `${P}.${FK}.${k}`;
           const ab = idx.abil.get(f.ability);
           const tot = f.base.reduce((a, b) => a + (+b || 0), 0);
           return `<div class="fmrow" data-fdrop="${ti}.${pi}.${k}"><div class="fmhd"><div class="fmimgb ${safeImg(f.image) ? '' : 'none'}" ${A('fimgPick', k)} role="button" tabindex="0" data-kbd title="폼 그림 넣기 — 클릭 · 끌어다 놓기 · 붙여넣기 (이 폼 칸 위에서 Ctrl+V)">${safeImg(f.image) ? `<img src="${safeImg(f.image)}" alt="">` : '<span>그림<br>＋</span>'}</div>${inp(F + '.name', f.name, { ph: '폼 이름 (예: 메가 리자몽 X)' })}${sel(F + '.kind', f.kind, FORM_KINDS)}<button class="btn sm ghost" ${A('delForm', k)} title="이 폼 지우기">✕</button></div>
  <div class="fmgrid"><label class="lbl">타입1${sel(F + '.t1', f.t1, types)}</label><label class="lbl">타입2${sel(F + '.t2', f.t2, types)}</label><div class="lbl" style="grid-column:span 2">특성<button class="pickbtn" ${A('pickFormAbil', k)}>${f.ability ? `<b>${esc(f.ability)}</b>${ab ? '' : '<span class="sp"></span><span class="faint small">DB에 없음</span>'}` : '<span class="ph0">그대로 (원래 특성)</span>'}</button>${f.ability && !SH ? fxAutoBtn(p, 'trait', f.ability, ti, pi) : ''}</div></div>
  <div class="fmst">${STATS.map((sn, i) => `<label><span>${sn}</span>${inp(`${F}.base.${i}`, f.base[i], { num: 1, ph: String(p.base[i] || '') })}</label>`).join('')}<span class="small muted">합 <b class="num">${tot}</b></span></div>
  <div class="fmpots"><div class="row small"><b>포텐셜 교체</b><span class="muted">이 폼일 때만 바뀌는 칸 (종족·속별 등)</span><span class="sp"></span><button class="btn sm" ${A('addFormPot', k)}>+ 교체 칸</button></div>
   ${f.pots
     .map((x, xi) => {
       const r = potRow(x.name);
       return `<div class="fmpot">${`<select data-p="${F}.pots.${xi}.slot">${SLOTS.map((sn, si) => `<option value="${si}" ${si === +x.slot ? 'selected' : ''}>${SH ? `#${si + 1} 칸` : `#${si + 1} ${esc((p.pots[si] && potKindP(potKindOf(p, si)).lab) || sn)} · ${esc(p.pots[si] || '빈 칸')}`}</option>`).join('')}</select>`}<span class="faint">→</span><span class="fmpn">${inp(`${F}.pots.${xi}.name`, x.name, { ph: '새 포텐셜 이름 (직접 입력 가능)' })}<button class="btn sm" ${A('pickFormPot', k)} data-x="${xi}" title="포텐셜 DB에서 고르기">DB</button>${x.name ? (SH ? fxFormBtn(ti, pi, k, 'p', xi, x) : fxAutoBtn(p, 'pot', x.name, ti, pi, 'f' + k + '.' + xi)) : ''}</span><button class="btn sm ghost" ${A('delFormPot', k)} data-x="${xi}">✕</button>
    <textarea class="fmpeff" data-p="${F}.pots.${xi}.eff" rows="2" placeholder="${esc(r ? String(r[2]).replace(/<br\s*\/?>/gi, ' ') : '효과를 적어 주세요')}">${esc(x.eff)}</textarea>${r ? '' : x.name ? '<div class="small faint fmpeff">DB에 없는 포텐셜 — 효과를 직접 적어 두면 배틀에서 그대로 보입니다</div>' : ''}</div>`;
     })
     .join('')}</div>
  <div class="fmpots fmmvs"><div class="row small"><b>기술 교체</b><span class="muted fmmv-n">이 폼일 때만 바뀌는 기술 — 오레마스에서 폼이 바뀌면 그쪽 기술이 된다</span><span class="muted fmmv-r">원래 기술은 모두 빠지고 아래 기술만 남는다</span><span class="sp"></span><label class="small row" style="gap:4px" title="켜면 원래 기술을 하나도 쓰지 않고, 아래 적은 기술만 이 폼의 기술이 된다"><input type="checkbox" class="fmmvrep" data-p="${F}.mvRep" ${f.mvRep ? 'checked' : ''}> 기술 전부 교체</label><button class="btn sm" ${A('addFormMv', k)}>+ 교체 기술</button></div>
   ${(f.mvs || [])
     .map((x, xi) => {
       const has = !x.to || idx.moves.has(x.to);
       const names = (p.moves || []).map(m => m && m.name).filter(Boolean);
       return `<div class="fmpot"><select class="fmmvfrom" data-p="${F}.mvs.${xi}.from"><option value="" ${x.from ? '' : 'selected'}>(추가 — 원래 기술은 그대로)</option>${names.map(n => `<option value="${esc(n)}" ${n === x.from ? 'selected' : ''}>${esc(n)}</option>`).join('')}${x.from && !names.includes(x.from) ? `<option value="${esc(x.from)}" selected>${esc(x.from)} (지금 없는 기술)</option>` : ''}</select><span class="faint fmmvfrom">→</span><span class="fmpn">${inp(`${F}.mvs.${xi}.to`, x.to, { ph: '새 기술 이름' })}<button class="btn sm" ${A('pickFormMv', k)} data-x="${xi}" title="기술 DB에서 고르기">DB</button></span><button class="btn sm ghost" ${A('delFormMv', k)} data-x="${xi}">✕</button>${has ? '' : '<div class="small faint fmpeff">DB에 없는 기술</div>'}</div>`;
     })
     .join('')}</div>
  <div class="fmpots"><div class="row small"><b>전용 포텐셜</b><span class="muted">이 폼일 때만 생기는 전용 — 오레마스에서 폼이 바뀌면 전용 칸에 붙는다</span><span class="sp"></span><label class="small row" style="gap:4px"><input type="checkbox" data-p="${F}.exRep" ${f.exRep ? 'checked' : ''}> 원래 전용은 쓰지 않음</label><button class="btn sm" ${A('addFormEx', k)}>+ 전용</button></div>
   ${(f.exs || []).map((x, xi) => `<div class="fmpot"><span class="fmpn">${inp(`${F}.exs.${xi}.name`, x.name, { ph: '전용 포텐셜 이름' })}${x.name ? (SH ? fxFormBtn(ti, pi, k, 'e', xi, x) : fxAutoBtn(p, 'pot', x.name, ti, pi, 'e' + k + '.' + xi)) : ''}</span><button class="btn sm ghost" ${A('delFormEx', k)} data-x="${xi}">✕</button><textarea class="fmpeff" data-p="${F}.exs.${xi}.eff" rows="2" placeholder="효과를 적어 주세요 (【1/시】… / …)">${esc(x.eff)}</textarea></div>`).join('')}</div>
  <div class="fmgrid"><label class="lbl" style="grid-column:span 2">조건 · 메모${inp(F + '.cond', f.cond, { ph: '예: 메가스톤 지니고 1회 / HP 절반 이하' })}</label><div class="lbl" style="grid-column:span 2">그림<span class="row fmimgr">${inp(F + '.image', /^data:/.test(f.image) ? '' : f.image, { ph: /^data:/.test(f.image) ? '(올린 그림)' : 'https://… 또는 파일 · 끌어다 놓기 (비우면 원래 그림)' })}<button class="btn sm" ${A('fimgPick', k)}>파일</button>${f.image ? `<button class="btn sm ghost" ${A('fimgDel', k)} title="그림 지우기 — 원래 그림을 쓴다">✕</button>` : ''}</span></div></div>
  <label class="row small"><input type="checkbox" data-p="${F}.revert" ${f.revert ? 'checked' : ''}> 교대(퇴장)하면 원래 모습으로 돌아온다 (메가진화는 보통 끔)</label></div>`;
         })
         .join('')
     : '<div class="small muted">배틀에서 바꿀 모습을 적어 두면 오레마스 배틀에서 폼체인지·메가진화했다가 돌아올 수 있습니다. 비운 종족치·특성·그림은 원래 것을 씁니다.</div>'
 }</div>`;
}
const standsFix = a =>
  (Array.isArray(a) ? a : [])
    .filter(x => x && typeof x === 'object' && /^https?:\/\//.test(String(x.src || '')))
    .map(x =>
      Object.assign(
        { label: String(x.label || '기본').slice(0, 40), src: String(x.src), point: +x.point || 0 },
        x.kind === 'stand' || x.kind === 'portrait' ? { kind: x.kind } : {}
      )
    );
/* 필드 전개 (오레마스 배틀 뒤에 까는 무대) — 트레이너·포켓몬 각자의 능력. [{type:0 필드|1 스타디움|2 이계, name, loc, img, eff, count(-1 무한), color(타입 영문)}] */
const FLD_KINDS = ['필드', '스타디움', '이계'];
/* 11-09 망령 「필드에도 구문」: auto = {deploy · start · end · entry · hold · who} (js/fx/fx_ui.js fieldAutoBox 와 같은 정리 — 그 스크립트가 아직 없어도 지우지 않게 여기서도) */
const FLD_AK = ['deploy', 'start', 'end', 'entry', 'use', 'hold'];
const fldAutoN = a => {
  if (!a || typeof a !== 'object') return null;
  const o = {};
  for (const k of FLD_AK) {
    const v = String(a[k] == null ? '' : a[k])
      .replace(/\r/g, '')
      .trim();
    if (v) o[k] = v.slice(0, 4000);
  }
  if (!Object.keys(o).length) return null;
  if (a.who === 'own' || a.who === 'foe') o.who = a.who;
  return o;
};
const fieldsFix = a =>
  (Array.isArray(a) ? a : [])
    .filter(x => x && typeof x === 'object' && String(x.name || '').trim())
    .map(x =>
      Object.assign(
        {
          type: [0, 1, 2].includes(+x.type) ? +x.type : 0,
          name: String(x.name).trim().slice(0, 60),
          loc: String(x.loc || '').slice(0, 60),
          img: String(x.img || '').slice(0, 600),
          eff: String(x.eff || '').slice(0, 4000),
          count: +x.count > 0 ? Math.min(99, Math.round(+x.count)) : -1,
          color: String(x.color || '').slice(0, 20)
        },
        fldAutoN(x.auto) ? { auto: fldAutoN(x.auto) } : {},
        [1, 2].includes(+x.h) ? { h: +x.h } : {}
      )
    ); /* 11-15 망령 「필드 전개에 H」: h 1 = H 는 필드 효과를 받지 않음 · 2 = H 의 상대가 받는 효과는 무효 (전개 때 H 파티 기본값 = 주인) */
const fldTypeKo = en => {
  const r = (S.db.types || []).find(x => x[3] === en);
  return r ? r[0] : '';
};
function fieldsHtml(o, D, who) {
  const L = o.fields || [];
  return `<div class="mkflds"><div class="row" style="gap:6px;align-items:baseline"><b class="small">필드 전개</b><span class="small muted">${who === 't' ? '이 트레이너가' : '이 포켓몬이'} 오레마스 배틀에서 직접 펼치는 필드 · 스타디움 · 이계</span><span class="sp"></span><button type="button" class="btn sm" data-act="fldAdd" ${D}>+ 필드</button></div>
 ${
   L.length
     ? `<div class="mkfl">${L.map((f, k) => {
         const ti = typeInfo(fldTypeKo(f.color));
         const img = /^https?:\/\//.test(f.img) ? f.img : '';
         return `<div class="mkf" tabindex="0" role="button" data-kbd data-act="fldEdit" ${D} data-k="${k}"><div class="mkfp" ${img ? `style="background-image:url('${esc(img)}')"` : ''}>${img ? '' : esc(f.img ? '배경: ' + f.img : '그림 없음')}</div><div class="mkfb"><div class="row" style="gap:5px;flex-wrap:wrap"><span class="mkfk k${f.type}">${FLD_KINDS[f.type]}</span><b>《${esc(f.name)}》</b>${ti ? `<span class="chip" style="background:${safeCss(ti[1]) || 'var(--sunk2)'}">${esc(ti[0])}</span>` : ''}<span class="small muted">${esc(f.loc || '')}${f.loc ? ' · ' : ''}${f.count > 0 ? f.count + '턴' : '무한'}</span>${+f.h ? `<span class="kindb" title="${+f.h === 1 ? 'H 는 필드 효과를 받지 않음' : 'H 의 상대가 받는 효과는 무효'}">H ${+f.h === 1 ? '받지 않음' : '상대 무효'}</span>` : ''}${
           f.auto
             ? `<span class="kindb" title="자동화 구문: ${esc(
                 Object.keys(f.auto)
                   .filter(x => x !== 'who')
                   .map(
                     x =>
                       ({ deploy: '전개 시', start: '턴 개시 시', end: '턴 종료 시', entry: '등장 시', use: '소지품 소모 시', hold: '필드 동안' })[x]
                   )
                   .join(' · ')
               )}">구문 ✓</span>`
             : ''
         }</div><div class="small mkfe">${esc(f.eff || '효과 글 없음')}</div></div><button type="button" class="btn sm ghost danger" data-act="fldDel" ${D} data-k="${k}" aria-label="필드 지우기">✕</button></div>`;
       }).join('')}</div>`
     : '<div class="small faint" style="margin-top:4px">아직 없음 — 「+ 필드」로 넣으면 배틀의 「필드 전개」에서 주인이 펼칠 수 있다</div>'
 }</div>`;
}
/* 필드 등록 · 수정 창 (10-22 망령: 꾸미기) — 오른쪽에 오레마스 「필드 전개」 컷인 · 로그 카드 미리보기, 그림은 끌어다 놓기 · 붙여넣기 · 파일 · 주소 */
const FLD_EN = ['FIELD', 'STADIUM', 'ANOTHER WORLD'];
const lightCol = c => {
  const m = String(c || '').match(/^#([0-9a-f]{3}|[0-9a-f]{6})$/i);
  if (!m) return false;
  let h = m[1];
  if (h.length === 3) h = [...h].map(x => x + x).join('');
  const [r, g, b] = [0, 2, 4].map(i => parseInt(h.slice(i, i + 2), 16));
  return (r * 299 + g * 587 + b * 114) / 1000 > 165;
};
function openFieldEditor(o, k, done) {
  const isNew = k == null;
  const f = isNew ? { type: 0, name: '', loc: '', img: '', eff: '', count: -1, color: '' } : Object.assign({}, o.fields[k]);
  const types = (S.db.types || []).filter(x => x[3] && x[0] && x[0] !== '-');
  let busy = false;
  const l = openModal(
    `<div class="mhead"><h2>${isNew ? '필드 추가' : '필드 수정'}</h2><span class="small muted">${esc(o.name || '')}</span><span class="sp"></span><button class="btn ghost" data-x="no">닫기</button></div><div class="mbody"><div class="fed">
  <div class="fedf">
   <div class="lbl">종류</div><div class="row fedk" style="gap:6px">${FLD_KINDS.map((n, i) => `<button type="button" class="btn sm k${i} ${f.type === i ? 'on' : ''}" data-fk="${i}">${n}</button>`).join('')}</div>
   <label class="lbl">이름<input id="fe-n" value="${esc(f.name)}" placeholder="예) 세가지 재앙" maxlength="60" autocomplete="off"></label>
   <div class="row" style="gap:10px;flex-wrap:nowrap"><label class="lbl" style="flex:2;min-width:0">지역<input id="fe-l" value="${esc(f.loc)}" placeholder="예) 재앙, 종말" maxlength="60" autocomplete="off"></label><label class="lbl" style="flex:1;min-width:0">지속 턴<input id="fe-c" type="number" min="1" max="99" value="${f.count > 0 ? f.count : ''}" placeholder="비우면 무한"></label></div>
   <label class="lbl">H <span class="small faint" style="font-weight:400">전개할 때 H 파티(기본 = 펼친 주인)를 정한다 — 오레마스 전개 창에서 바꿀 수 있다</span><select id="fe-h">${['없음', 'H 는 필드 효과를 받지 않음', 'H 의 상대가 받는 효과는 무효 (H 편만 받음)'].map((n, i) => `<option value="${i}" ${(+f.h || 0) === i ? 'selected' : ''}>${n}</option>`).join('')}</select></label>
   <div class="lbl">색상 타입 <span class="small faint" style="font-weight:400">컷인 띠 · 카드 테두리 색</span></div>
   <div class="fedc"><button type="button" class="fedc1 none" data-fc="" title="없음">✕</button>${types.map(x => `<button type="button" class="fedc1" data-fc="${esc(x[3])}" title="${esc(x[0])}" style="background:${safeCss(x[1]) || 'var(--sunk2)'}${lightCol(x[1]) ? ';color:#1d2433;text-shadow:none' : ''}">${esc(x[0])}</button>`).join('')}</div>
   <div class="lbl">그림 <span class="small faint" style="font-weight:400">끌어다 놓기 · 붙여넣기(Ctrl+V) · 파일 · 주소 https://… · 오레마스 배경 목록 이름</span></div>
   <div class="feddrop" id="fe-d" tabindex="0" role="button" data-kbd title="눌러서 파일 고르기"><span id="fe-dt">여기에 그림을 끌어다 놓거나 눌러서 고르기</span></div>
   <div class="row" style="gap:4px;flex-wrap:nowrap"><input id="fe-i" value="${esc(f.img)}" placeholder="https://… 또는 배경 이름" style="flex:1;min-width:0" autocomplete="off"><button type="button" class="btn sm ghost" id="fe-c" title="포트레이트 따기에서 자른 뒤 올린다">✂</button><button type="button" class="btn sm ghost" id="fe-x" title="그림 지우기">✕</button><input type="file" id="fe-f" accept="image/*" hidden></div>
   <div class="lbl">효과 <span class="small faint" style="font-weight:400">한 줄에 하나 — 배틀 로그 카드에 그대로 나온다</span><span class="sp"></span><button type="button" class="btn xs" id="fe-num" title="줄 앞에 ① ② ③ … 를 붙인다">① 번호 매기기</button></div>
   <textarea id="fe-e" rows="6" placeholder="① …&#10;② …">${esc(f.eff)}</textarea>
   <div id="fe-a"></div>
  </div>
  <div class="fedp"><div class="small muted">미리보기 — 오레마스 「필드 전개」</div><div id="fe-p"></div></div>
 </div></div><div class="mfoot"><span class="small faint">Ctrl+Enter 로 ${isNew ? '추가' : '저장'}</span><span class="sp"></span><button class="btn" data-x="no">취소</button><button class="btn pri" id="fe-ok">${isNew ? '추가' : '저장'}</button></div>`,
    { wide: true }
  );
  const st = { type: f.type, color: f.color };
  /* 11-09 자동화 구문 칸 (js/fx/fx_ui.js fieldAutoBox) — 스크립트가 늦게 오면 온 뒤에 그린다 */ let FAB = null;
  const fabDraw = () => {
    const h = $('#fe-a', l);
    if (!h || FAB) return;
    if (window.OM_FX_UI && OM_FX_UI.fieldAutoBox) {
      FAB = OM_FX_UI.fieldAutoBox(h, f.auto, { toast });
    } else {
      h.innerHTML = `<div class="small faint" style="margin-top:8px">⚙ 자동화 구문 칸을 불러오는 중…${f.auto ? ' (지금 구문은 그대로 남는다)' : ''}</div>`;
    }
  };
  fabDraw();
  if (!FAB)
    loadFx()
      .then(fabDraw)
      .catch(() => {});
  const prev = () => {
    const u = $('#fe-i', l).value.trim();
    const img = /^https?:\/\//.test(u) ? u : '';
    const ti = typeInfo(fldTypeKo(st.color));
    const col = ti ? safeCss(ti[1]) : '';
    const name = $('#fe-n', l).value.trim() || '이름 없음',
      loc = $('#fe-l', l).value.trim(),
      cnt = +$('#fe-c', l).value;
    const eff = $('#fe-e', l)
      .value.replace(/\r/g, '')
      .split('\n')
      .map(x => x.trim())
      .filter(Boolean);
    $('#fe-p', l).innerHTML =
      `<div class="fedcut k${st.type}" style="${col ? `--fc:${col}` : ''}"><div class="fedbar"></div><div class="fedimg" ${img ? `style="background-image:url('${esc(img)}')"` : ''}>${img ? '' : `<span>${u ? '「' + esc(u) + '」 — 배경 목록 이름은 오레마스에서 보인다' : '그림 없음'}</span>`}<div class="fedtx"><div class="fedkn">${FLD_EN[st.type]}</div><div class="fednm">《${esc(name)}》</div>${loc ? `<div class="fedlc">${esc(loc)}</div>` : ''}<div class="fedlc">${esc(o.name || '')}</div></div></div><div class="fedbar"></div></div>
   <div class="fedlog k${st.type}" style="${col ? `--fc:${col}` : ''}"><div class="row" style="gap:6px;flex-wrap:wrap"><span class="mkfk k${st.type}">${FLD_KINDS[st.type]}</span><b>《${esc(name)}》</b>${ti ? `<span class="chip" style="background:${col || 'var(--sunk2)'}">${esc(ti[0])}</span>` : ''}<span class="small muted">${cnt > 0 ? cnt + '턴' : '무한'}</span></div>${eff.length ? `<div class="small fedeff">${eff.map(x => `<div>${esc(x)}</div>`).join('')}</div>` : '<div class="small faint">효과 글 없음</div>'}</div>`;
    l.querySelectorAll('[data-fk]').forEach(b => b.classList.toggle('on', +b.dataset.fk === st.type));
    l.querySelectorAll('[data-fc]').forEach(b => b.classList.toggle('on', b.dataset.fc === st.color));
    $('#fe-dt', l).textContent = busy ? '올리는 중…' : img ? '다른 그림을 끌어다 놓거나 눌러서 바꾸기' : '여기에 그림을 끌어다 놓거나 눌러서 고르기';
    $('#fe-d', l).classList.toggle('has', !!img);
  };
  for (const id of ['#fe-n', '#fe-l', '#fe-c', '#fe-e', '#fe-i']) $(id, l).addEventListener('input', prev);
  prev();
  l.querySelectorAll('[data-fk]').forEach(
    b =>
      (b.onclick = () => {
        st.type = +b.dataset.fk;
        prev();
      })
  );
  l.querySelectorAll('[data-fc]').forEach(
    b =>
      (b.onclick = () => {
        st.color = b.dataset.fc;
        prev();
      })
  );
  const up = async fl => {
    if (!fl) return;
    if (!/^image\//.test(fl.type)) return toast('그림 파일만');
    if (fl.size > 8 * 1024 * 1024) return toast('8MB 이하만');
    busy = true;
    prev();
    try {
      $('#fe-i', l).value = await putImg(`fields/${o.id}_${Date.now().toString(36)}`, fl);
      toast('올렸습니다');
    } catch (e) {
      toast('올리지 못했습니다: ' + e.message);
    }
    busy = false;
    prev();
  };
  $('#fe-d', l).onclick = () => $('#fe-f', l).click();
  $('#fe-f', l).onchange = ev => {
    const fl = ev.target.files[0];
    ev.target.value = '';
    up(fl);
  };
  $('#fe-c', l).onclick = () => cutImage('필드 그림', $('#fe-i', l).value, up);
  $('#fe-x', l).onclick = () => {
    $('#fe-i', l).value = '';
    prev();
  };
  const box = $('.mbox', l) || l;
  const dz = $('#fe-d', l);
  box.addEventListener('dragover', e => {
    if ([...((e.dataTransfer && e.dataTransfer.items) || [])].some(x => x.kind === 'file')) {
      e.preventDefault();
      dz.classList.add('over');
    }
  });
  box.addEventListener('dragleave', e => {
    if (e.target === dz) dz.classList.remove('over');
  });
  box.addEventListener('drop', e => {
    dz.classList.remove('over');
    const fl = e.dataTransfer && [...e.dataTransfer.files].find(x => /^image\//.test(x.type));
    if (fl) {
      e.preventDefault();
      e.stopPropagation();
      up(fl);
      return;
    }
    const u = e.dataTransfer && (e.dataTransfer.getData('text/uri-list') || e.dataTransfer.getData('text/plain'));
    if (u && /^https?:\/\//.test(u.trim())) {
      e.preventDefault();
      $('#fe-i', l).value = u.trim().split('\n')[0];
      prev();
    }
  });
  box.addEventListener('paste', e => {
    const it = [...((e.clipboardData && e.clipboardData.items) || [])].find(x => x.type.startsWith('image/'));
    if (it) {
      e.preventDefault();
      e.stopPropagation();
      up(it.getAsFile());
    }
  });
  $('#fe-num', l).onclick = () => {
    const N = '①②③④⑤⑥⑦⑧⑨⑩⑪⑫⑬⑭⑮⑯⑰⑱⑲⑳';
    const ta = $('#fe-e', l);
    let i = 0;
    ta.value = ta.value
      .replace(/\r/g, '')
      .split('\n')
      .map(x => x.trim())
      .filter(Boolean)
      .map(x => (N[i++] || '') + x.replace(/^[①-⑳]\s*/, ''))
      .join('\n');
    prev();
  };
  l.querySelectorAll('[data-x="no"]').forEach(b => (b.onclick = () => closeModal()));
  const ok = () => {
    if (busy) return toast('그림을 올리는 중입니다');
    const name = $('#fe-n', l).value.trim();
    if (!name) {
      toast('이름을 적어 주세요');
      $('#fe-n', l).focus();
      return;
    }
    const v = fieldsFix([
      {
        type: st.type,
        name,
        loc: $('#fe-l', l).value.trim(),
        img: $('#fe-i', l).value.trim(),
        eff: $('#fe-e', l).value.replace(/\r/g, '').trim(),
        count: +$('#fe-c', l).value,
        color: st.color,
        h: +$('#fe-h', l).value || 0,
        auto: FAB ? FAB.get() : f.auto
      }
    ])[0];
    o.fields = o.fields || [];
    if (isNew) o.fields.push(v);
    else o.fields[k] = v;
    closeModal();
    done && done();
    toast(isNew ? '필드를 넣었습니다' : '고쳤습니다');
  };
  $('#fe-ok', l).onclick = ok;
  box.addEventListener('keydown', e => {
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      ok();
    }
  });
}
/* 덱 관리 (10-26 망령) — 트레이너가 가진 카드 덱. 카드는 DB 관리 「카드 DB」에서 고른다. t.deck = [{n 카드 이름, q 장수}] · t.deckName */
/* 11-03 은열쇠 덱 검사: 준비 6 + 열쇠 2 = 8장 기준 · 같은 카드는 「덱 제한」(기본 2) 까지 · 증상 카드는 따로 센다 */
const cardMax = r => {
  const v = r && String(r[13] == null ? '' : r[13]).trim();
  const n = v === '' ? 2 : Math.round(+v);
  return isNaN(n) || n < 1 ? 2 : n;
};
function deckChecks(t) {
  const L = t.deck || [];
  if (!L.length) return [];
  const out = [];
  const cnt = { 열쇠: 0, 준비: 0, 증상: 0, '': 0 };
  for (const x of L) {
    const r = idx.cards && idx.cards.get(x.n);
    const q = +x.q || 0;
    if (!q) continue;
    const c = r ? String(r[12] || '').trim() : '';
    cnt[c in cnt ? c : ''] += q;
    const mx = cardMax(r);
    if (q > mx) out.push(mx === 1 ? `「${x.n}」은(는) 덱에 1장만 넣을 수 있습니다 (지금 ${q}장)` : `「${x.n}」 ${q}장 — 같은 카드는 ${mx}장까지`);
  }
  const main = cnt.열쇠 + cnt.준비 + cnt[''];
  if (!(cnt.열쇠 || cnt.준비 || cnt.증상)) {
    /* 아직 분류를 안 쓴 카드 DB: 예전처럼 10장 넘을 때만 */ if (main > 10)
      out.push(`덱 ${main}장 — 열쇠 2 + 준비 6 = 8장, 증상까지 10장 상한 (카드 DB 에 「분류」를 넣으면 자세히 검사합니다)`);
    return out;
  }
  if (cnt.열쇠 > 2) out.push(`열쇠 카드 ${cnt.열쇠}장 — 2장 기준`);
  if (cnt.준비 > 6) out.push(`준비 카드 ${cnt.준비}장 — 6장 기준`);
  if (main > 8) out.push(`열쇠 · 준비 ${main}장 — 열쇠 2 + 준비 6 = 8장 기준${cnt[''] ? ` (분류 없는 카드 ${cnt['']}장 포함)` : ''}`);
  if (main + cnt.증상 > 10) out.push(`덱 ${main + cnt.증상}장 — 증상까지 10장 상한`);
  return out;
}
const deckFix = a =>
  (Array.isArray(a) ? a : [])
    .filter(x => x && typeof x === 'object' && String(x.n || '').trim())
    .map(x => ({ n: String(x.n).trim().slice(0, 60), q: Math.max(0, Math.min(99, Math.round(+x.q) || 0)) }));
/* 카드 DB 한 줄 → 은열쇠 카드 그림 (웹툴 손패와 같은 모양) */
function skcOf(n, o) {
  const r = idx.cards && idx.cards.get(n);
  if (!window.SKCARD) return esc(n);
  return SKCARD.html(
    r
      ? {
          n,
          t: r[2],
          c: r[3] == null ? '' : String(r[3]),
          x: String(r[4] || '').replace(/<br\s*\/?>/g, '\n'),
          col: cardCol(r[5]),
          img: cardImg(r[6]),
          ic: cardIcons(r[10]),
          src: String(r[11] || ''),
          auto: !!String(r[9] || '').trim(),
          cls: String(r[12] || ''),
          lim: cardMax(r) !== 2 ? `최대 ${cardMax(r)}` : ''
        }
      : { n, t: '카드 DB 에 없음', col: '#6b7286' },
    o || { cls: 'skc-mini' }
  );
}
/* 11-04 망령 「시트의 카드칸 = 크게 네 칸, 누르면 그 분류 카드 목록에서 고른다 · 시나리오 · 호감도 보상으로 얻는 개별 특수 카드는 카드 보관소」
   은열쇠 세 칸 (노트 27): t.sk3 = {c 체크, d 던전, b 배틀, r 예비} = 카드 이름 한 장씩. 예비는 어느 종류든 한 장 · 같은 카드는 한 칸에만.
   t.vault = [{n 카드 이름, src 얻은 곳, at 받은 날}] — 그 트레이너만의 카드. 「특수 카드라도 슬롯은 같게」: 보관소 카드도 같은 종류 칸에 넣는다.
   고를 수 있는 카드 = 카드 DB 덱 「은열쇠 · 공통」(분류 「시작」이 붙은 줄이 있으면 그것만) + 보관소. 종류는 카드 DB 「종류」 글로 (체크 · 던전 · 배틀 — 「던전 / 배틀 · 선행」은 둘 다) */
const SK3 = [
  ['c', '스킬', '판정에 문양이 맞으면 +1 · 결과를 보고 붙여도 된다'],
  ['d', '던전', '탐사 중에 쓴다'],
  ['b', '배틀', '내 포켓몬에게만 · 억까 막기'],
  ['r', '예비', '어느 종류든 한 장 · 파티가 모으면 예비 덱']
];
const SK3N = { c: '스킬', d: '던전', b: '배틀', r: '예비' };
const SK_COMMON = '은열쇠 · 공통';
const skKinds = r => {
  const t = String((r && r[2]) || '');
  const o = [];
  if (/체크|스킬/.test(t)) o.push('c');
  if (/던전/.test(t)) o.push('d');
  if (/배틀/.test(t)) o.push('b');
  return o;
};
function skCommon() {
  const L = (S.db.cards || []).filter(r => r && r[0] === SK_COMMON && r[1] && skKinds(r).length);
  const st = L.filter(r => String(r[12] || '').trim() === '시작');
  return st.length ? st : L;
}
const sk3Fix = o => {
  const r = {};
  if (o && typeof o === 'object' && !Array.isArray(o))
    for (const [k] of SK3) {
      const v = String(o[k] || '')
        .trim()
        .slice(0, 60);
      if (v) r[k] = v;
    }
  return r;
};
const vaultFix = a => {
  const seen = new Set();
  return (Array.isArray(a) ? a : [])
    .filter(x => x && typeof x === 'object' && String(x.n || '').trim())
    .map(x => ({ n: String(x.n).trim().slice(0, 60), src: String(x.src || '').slice(0, 80), at: String(x.at || '').slice(0, 10) }))
    .filter(x => !seen.has(x.n) && seen.add(x.n))
    .slice(0, 40);
};
/* 이 칸에 넣을 수 있는 카드 [{n, v 보관소인지}] */
function skChoices(t, k) {
  const ok = r => {
    const ks = skKinds(r);
    return k === 'r' ? ks.length > 0 : ks.includes(k);
  };
  const out = [];
  for (const r of skCommon()) if (ok(r)) out.push({ n: r[1], v: false });
  for (const v of t.vault || []) {
    const r = idx.cards && idx.cards.get(v.n);
    if (r && ok(r) && !out.some(x => x.n === v.n)) out.push({ n: v.n, v: true, src: v.src });
  }
  return out;
}
function sk3Checks(t) {
  const s = t.sk3 || {};
  const out = [];
  const seen = {};
  for (const [k, lab] of SK3) {
    const n = s[k];
    if (!n) continue;
    const r = idx.cards && idx.cards.get(n);
    if (!r) {
      out.push(`${lab} 칸 「${n}」 — 카드 DB 에 없습니다`);
      continue;
    }
    if (!skChoices(t, k).some(x => x.n === n))
      out.push(
        `${lab} 칸 「${n}」 — ${k !== 'r' && !skKinds(r).includes(k) ? `${lab} 카드가 아닙니다 (종류 ${r[2] || '-'})` : '공통 카드도 보관소 카드도 아닙니다'}`
      );
    if (seen[n]) out.push(`「${n}」 이(가) ${seen[n]} · ${lab} 두 칸에 있습니다 — 같은 카드는 한 칸에만`);
    seen[n] = lab;
  }
  return out;
}
function sk3Html(t, ti) {
  const s = t.sk3 || {};
  const V = t.vault || [];
  const used = new Set(Object.values(s));
  const ck = sk3Checks(t);
  const slot = ([k, lab, hint]) => {
    const n = s[k];
    return `<div class="mksk k-${k}"><div class="mksk-h"><b>${lab}</b><span>${esc(hint)}</span></div><button type="button" class="mksk-c${n ? '' : ' empty'}" data-act="sk3Pick" data-i="${ti}" data-k="${k}" aria-label="${lab} 칸 — ${n ? esc(n) + ' · 바꾸기' : '카드 고르기'}">${n ? skcOf(n, { cls: '' }) : `<span class="mksk-e">＋<br>${lab} 카드</span>`}</button></div>`;
  };
  return `<div class="mkdeck mksk3"><div class="row" style="margin-top:14px;gap:6px;align-items:baseline"><b class="small">은열쇠 카드</b><span class="small muted">칸을 누르면 그 종류 카드에서 고릅니다 · 체크 · 던전 · 배틀 한 장씩 + 예비 한 장</span></div>
 ${ck.map(x => `<p class="small warn" style="margin:4px 0 0">⚠ ${esc(x)}</p>`).join('')}
 <div class="mksk-grid">${SK3.map(slot).join('')}</div>
 <div class="row" style="margin-top:14px;gap:6px;align-items:baseline"><b class="small">카드 보관소</b><span class="small muted">시나리오 · 호감도 보상으로 얻은 이 트레이너만의 카드 · <b class="num">${V.length}</b>장 — 같은 종류 칸에 넣어 쓴다</span><span class="sp"></span><button type="button" class="btn sm" data-act="vaultAdd" data-i="${ti}">+ 특수 카드</button></div>
 ${
   V.length
     ? `<div class="mkdgrid">${V.map(
         (
           v,
           k
         ) => `<div class="mkdt ${idx.cards && idx.cards.get(v.n) ? '' : 'miss'}"><button type="button" class="mkdtc2" data-act="vaultCard" data-i="${ti}" data-k="${k}" aria-label="${esc(v.n)} 카드 보기 · 고치기">${skcOf(v.n, { cls: 'skc-mini', badge: used.has(v.n) ? '칸' : '' })}</button>
   <input class="mkv-src" data-p="T.${ti}.vault.${k}.src" value="${esc(v.src || '')}" placeholder="얻은 곳" aria-label="${esc(v.n)} 얻은 곳">${v.at ? `<span class="small faint">${esc(v.at)}</span>` : ''}<div class="mkdtb"><button type="button" class="danger" data-act="vaultDel" data-i="${ti}" data-k="${k}" aria-label="보관소에서 빼기">✕</button></div></div>`
       ).join('')}</div>`
     : '<p class="small faint" style="margin:4px 0 0">아직 없습니다 — GM 이 웹툴 시트에서 「카드 건네주기」로 주거나, 여기 「+ 특수 카드」로 넣습니다</p>'
 }
 ${(t.deck || []).length ? `<details class="mkold"><summary class="small muted">예전 덱 관리 (덱 · 드로우 방식 — ${(t.deck || []).length}종)</summary>${deckHtml(t, ti)}</details>` : ''}</div>`;
}
/* 칸 고르기 창: 그 종류 공통 카드 + 보관소 카드를 카드 그림으로 */
function openSk3Pick(T, k, rf) {
  const L = skChoices(T, k);
  const s = T.sk3 || {};
  const lab = SK3N[k];
  const other = n => Object.entries(s).find(([kk, v]) => kk !== k && v === n);
  const tile = x => {
    const o = other(x.n);
    return `<button type="button" class="mksk-p${s[k] === x.n ? ' on' : ''}${o ? ' dim' : ''}" data-pk="${esc(x.n)}" ${o ? 'disabled' : ''} title="${esc(x.n)}${o ? ` — ${SK3N[o[0]]} 칸에 있음` : ''}">${skcOf(x.n, { cls: '', badge: x.v ? '보관소' : '' })}${o ? `<span class="small faint">${SK3N[o[0]]} 칸</span>` : ''}</button>`;
  };
  const com = L.filter(x => !x.v),
    va = L.filter(x => x.v);
  const l = openModal(
    `<div class="mhead"><h2>${esc(T.name || '트레이너')} · ${lab} 칸</h2><span class="sp"></span><button class="btn ghost" data-x>닫기</button></div>
  <div class="mbody"><p class="small muted" style="margin:0 0 8px">${esc((SK3.find(x => x[0] === k) || [])[2] || '')}</p>
  <b class="small">공통 카드 ${com.length}</b><div class="mksk-pg">${com.map(tile).join('') || '<p class="small faint mksk-none">카드 DB 에 「은열쇠 · 공통」 ' + lab + ' 카드가 없습니다</p>'}</div>
  <b class="small" style="display:block;margin-top:12px">보관소 ${va.length}</b><div class="mksk-pg">${va.map(tile).join('') || '<p class="small faint mksk-none">이 종류의 보관소 카드가 없습니다 — GM 이 웹툴에서 건네주면 여기 뜹니다</p>'}</div></div>
  <div class="mfoot">${s[k] ? '<button class="btn danger" data-clr>칸 비우기</button>' : ''}<span class="sp"></span><button class="btn pri" data-x>닫기</button></div>`,
    { wide: true }
  );
  l.addEventListener('click', e => {
    if (e.target.closest('[data-x]')) return closeModal();
    if (e.target.closest('[data-clr]')) {
      T.sk3 = Object.assign({}, T.sk3 || {});
      delete T.sk3[k];
      closeModal();
      return rf();
    }
    const b = e.target.closest('[data-pk]');
    if (!b || b.disabled) return;
    T.sk3 = Object.assign({}, T.sk3 || {}, { [k]: b.dataset.pk });
    closeModal();
    rf();
  });
}
/* 11-04 망령 「카드 받기에 공용 카드풀이 필요해? · 카드 받기 의의가 뭐지」: 보관소 = 그 트레이너만의 특수 카드(시나리오 · 호감도 보상). 공통 카드는 칸에서 바로 고르니 여기엔 안 보인다.
   고를 수 있는 것 = 카드 DB 중 「은열쇠 · 공통」 · 광기(증상)가 아니고 종류가 체크 · 던전 · 배틀인 카드. 새 특수 카드는 덱 「은열쇠 · 특수」로 만든다 */
const SK_SPECIAL = '은열쇠 · 특수';
const skSpecial = () => (S.db.cards || []).filter(r => r && r[1] && r[0] !== SK_COMMON && !/광기/.test(String(r[0] || '')) && skKinds(r).length);
function openVaultPick(T, rf) {
  T.vault = T.vault || [];
  let q = '';
  const add = n => {
    if ((T.vault || []).some(x => x.n === n)) return toast('이미 보관소에 있습니다');
    if (T.vault.length >= 40) return toast('보관소는 40장까지');
    T.vault.push({ n, src: '', at: new Date().toISOString().slice(0, 10) });
    rf();
    toast(`「${n}」 — 얻은 곳을 적어 두세요`);
  };
  const l = openModal(
    `<div class="mhead"><h2>${esc(T.name || '트레이너')} · 특수 카드 받기</h2><span class="sp"></span><button class="btn ghost" data-x>닫기</button></div>
  <div class="mbody"><p class="small muted" style="margin:0 0 8px">시나리오 · 호감도 보상으로 얻은 <b>이 트레이너만의 카드</b>를 보관소에 넣어요. 공통 카드는 칸에서 바로 고르니 여기엔 없어요. 보관소 카드도 같은 종류 칸에 넣어 써요. (웹툴에서는 GM 이 시트 탭 「카드 건네주기」로 줘요)</p>
  <input type="search" data-vq placeholder="이름 · 효과 찾기" style="width:100%"><div class="mksk-pg" data-vl style="margin-top:8px"></div></div>
  <div class="mfoot">${ME.gm ? '<button class="btn" data-vnew title="GM — 카드 DB 에 새 줄">＋ 새 특수 카드 (DB)</button>' : '<span class="small muted">새 카드는 「DB」 탭에서 만든다</span>'}<span class="sp"></span><button class="btn pri" data-x>닫기</button></div>`,
    { wide: true }
  );
  const draw = () => {
    const s = q.trim().toLowerCase();
    const have = new Set((T.vault || []).map(x => x.n));
    const L = skSpecial().filter(
      r =>
        !s ||
        [r[1], r[4], r[2]].some(v =>
          String(v || '')
            .toLowerCase()
            .includes(s)
        )
    );
    $('[data-vl]', l).innerHTML =
      L.map(
        r =>
          `<button type="button" class="mksk-p${have.has(r[1]) ? ' dim' : ''}" data-vn="${esc(r[1])}" ${have.has(r[1]) ? 'disabled' : ''} title="${esc(r[1])}">${skcOf(r[1], { cls: '', badge: have.has(r[1]) ? '있음' : '' })}<span class="small faint">${esc(r[0] || '덱 없음')}</span></button>`
      ).join('') ||
      `<p class="small faint mksk-none">${s ? '맞는 카드가 없어요' : '아직 특수 카드가 없어요 — 「＋ 새 특수 카드 만들기」로 카드 DB 에 「' + SK_SPECIAL + '」 카드를 만들어요'}</p>`;
  };
  draw();
  $('[data-vq]', l).oninput = e => {
    q = e.target.value;
    draw();
  };
  l.addEventListener('click', e => {
    if (e.target.closest('[data-x]')) return closeModal();
    if (ME.gm && e.target.closest('[data-vnew]'))
      return openEdit('cards', -1, {
        preset: { 0: SK_SPECIAL, 1: q.trim(), 2: '스킬', 5: 'gold' },
        onSaved: n => {
          if (n) add(n);
          draw();
        }
      });
    const b = e.target.closest('[data-vn]');
    if (b && !b.disabled) {
      add(b.dataset.vn);
      draw();
    }
  });
}
function deckHtml(t, ti) {
  const L = t.deck || [];
  const P = `T.${ti}`;
  const tot = L.reduce((a, x) => a + (+x.q || 0), 0);
  /* 카드 한 종류 = 세로 5:7 타일 하나 (그림 · 비용 · 이름 · 종류 · ×장수). 10~20장 덱이 한눈에 들어오게 (10-26 망령) */
  const tile = (x, k) => {
    const r = idx.cards && idx.cards.get(x.n);
    const q = +x.q || 0;
    /* 11-02 감우: 타일 = 은열쇠 카드 (웹툴 손패와 같은 모양) · 누르면 카드 DB 에서 고친다 */
    const card = skcOf(x.n, { cls: 'skc-mini', badge: '×' + q });
    return `<div class="mkdt ${r ? '' : 'miss'}" title="${esc(x.n)}${r && r[4] ? ' — ' + esc(String(r[4]).replace(/<br\s*\/?>/g, ' ')) : ''}"><button type="button" class="mkdtc2" data-act="deckCard" data-i="${ti}" data-k="${k}" aria-label="${esc(x.n)} 카드 보기 · 고치기">${card}</button>
   <div class="mkdtb"><button type="button" data-act="deckQ" data-i="${ti}" data-k="${k}" data-d="-1" aria-label="한 장 빼기">−</button><button type="button" data-act="deckQ" data-i="${ti}" data-k="${k}" data-d="1" aria-label="한 장 더">+</button><button type="button" class="danger" data-act="deckDel" data-i="${ti}" data-k="${k}" aria-label="덱에서 빼기">✕</button></div></div>`;
  };
  return `<div class="mkdeck"><div class="row" style="margin-top:12px;gap:6px;align-items:baseline"><b class="small">덱 관리</b><span class="small muted">카드 DB 에서 골라 넣는다 · <b class="num">${L.length}</b>종 <b class="num">${tot}</b>장</span><span class="sp"></span><button type="button" class="btn sm" data-act="deckAdd" data-i="${ti}">+ 카드</button></div>
 ${deckChecks(t)
   .map(x => `<p class="small warn" style="margin:4px 0 0">⚠ ${esc(x)}</p>`)
   .join('')}
 ${L.length ? `<label class="plrow" style="margin-top:6px"><span>덱 이름</span>${inp(P + '.deckName', t.deckName, { ph: (t.name || '트레이너') + '의 덱' })}</label><div class="mkdgrid">${L.map(tile).join('')}</div>` : '<p class="small faint" style="margin:4px 0 0">아직 없습니다 — 「+ 카드」 (카드는 DB 관리 → 카드 DB 에서 만들고 그림도 붙인다)</p>'}</div>`;
}
/* SP · 서포터 (10-25 망령) — 오레마스 배틀에서 밖의 조력자가 돕는 한 수. 트레이너마다 여러 개. 발동하면 확률을 굴려 고유 포텐셜처럼 컷인 + 로그.
   t.sps = [{name, prob(%), theme(한 줄), eff(한 줄에 하나), img(컷 그림), line(컷인 대사), color, auto(자동화 구문 DSL — 고유 포텐셜과 같은 꼴)}] */
const SP_COLS = ['#e4002b', '#ff8a00', '#ffd12e', '#3ddc84', '#4aa3ff', '#9b5cff', '#ff4fa3', '#222'];
const spFix = a =>
  (Array.isArray(a) ? a : [])
    .filter(x => x && typeof x === 'object' && String(x.name || '').trim())
    .map(x => ({
      name: String(x.name).trim().slice(0, 60),
      prob: x.prob === '' || x.prob == null ? 100 : Math.max(0, Math.min(100, Math.round(+x.prob) || 0)),
      theme: String(x.theme || '').slice(0, 120),
      eff: String(x.eff || '').slice(0, 4000),
      img: String(x.img || '').slice(0, 600),
      line: String(x.line || '').slice(0, 80),
      color: String(x.color || '').slice(0, 20),
      auto: String(x.auto || '').slice(0, 4000),
      tg: x.tg === 'party' ? 'party' : '',
      tn: Math.max(0, Math.min(6, Math.round(+x.tn) || 0))
    })); /* 11-09 tg='party' 소지 포켓몬(기본 전원 · 발동 때 고름) · tn 몇 체까지 */
/* 기능 확장 (10-27 망령) — 트레이너가 주는 「기능 확장 : 기술」. 룰북 『항법술』(【1/시】/「기능 확장 : 안개제거」를 내보낸다 · PT 전원) 같은 것.
   t.ext = [{mv 기술 이름, lim 【N/시】(0 = 제한 없음), kind 'act' 행동으로 | 'extra' 추가 행동, who 쓰는 포켓몬 id(비우면 PT 전원), src 출처(포텐셜 이름)}]
   오레마스 import.js 가 배틀 트레이너 ext 로 가져가고, 배틀 지시 · 공격 창 기술 목록 맨 뒤에 붙는다 (적용할 때 횟수 1) */
const extFix = a =>
  (Array.isArray(a) ? a : [])
    .filter(x => x && typeof x === 'object' && String(x.mv || '').trim())
    .slice(0, 12)
    .map(x => ({
      mv: String(x.mv).trim().slice(0, 60),
      lim: x.lim === '' || x.lim == null ? 1 : Math.max(0, Math.min(9, Math.round(+x.lim) || 0)),
      kind: x.kind === 'extra' ? 'extra' : 'act',
      who: String(x.who || '').slice(0, 40),
      src: String(x.src || '').slice(0, 60)
    }));
/* 해석 차단 (10-27 망령) — 상대의 『포켓몬 도감』 · 데이터 해석을 막는 정도. 오레마스 도감(dex_ui)의 mon.dexFw 와 같은 값.
   트레이너 t.dexFw = 기본값, 포켓몬 p.dexFw ('' = 트레이너 기본값). 일부 차단(3)이면 dexFwParts {move,type,trait} = 해석되는 부분 */
const DEXFW = [
  ['0', '없음'],
  ['1', '1회 차단 — 첫 해석을 막고 풀린다'],
  ['2', '완전 차단 — 강제 해석(데이터 해석 효과)만 통한다'],
  ['3', '일부 차단 — 고른 부분만 해석된다'],
  ['4', '노이즈 — 해석은 되지만 글자가 ■ 로 으깨진다']
];
const DEXP = [
  ['move', '기술'],
  ['type', '타입'],
  ['trait', '특성']
];
const dexName = v => (DEXFW.find(x => x[0] === String(v)) || DEXFW[0])[1].split(' — ')[0];
function dexPartsHtml(o, attr) {
  const P = o.dexFwParts || {};
  return `<span class="row small" style="gap:8px">${DEXP.map(([k, n]) => `<label class="row" style="gap:3px"><input type="checkbox" ${attr} data-dexp="${k}" ${P[k] ? 'checked' : ''}>${n}</label>`).join('')}<span class="faint">← 일부 차단일 때 해석되는 부분</span></span>`;
}
function extRow(t, ti, e, k) {
  const mons = t.pokemon || [];
  {
    const r = idx.moves && idx.moves.get(e.mv);
    const A = `data-i="${ti}" data-k="${k}"`;
    return `<div class="mkext"><div class="row" style="gap:6px;align-items:center;flex-wrap:wrap">${r ? tchip(r[5]) : '<span class="kindb">DB 없음</span>'}<b>「기능 확장 : ${esc(e.mv)}」</b>${r ? `<span class="small muted">${esc(r[6] || '')} · 위력 ${esc(r[7] || '-')} · 명중 ${esc(r[8] || '-')} · ${esc(r[9] || '')}</span>` : ''}<span class="sp"></span><button type="button" class="btn sm ghost danger" data-act="extDel" ${A} aria-label="삭제">✕</button></div>
   <div class="row small" style="gap:10px;flex-wrap:wrap;margin-top:4px">
    <label class="row" style="gap:4px">횟수 <select data-ext="lim" ${A}>${[0, 1, 2, 3, 4, 5, 6].map(n => `<option value="${n}" ${+e.lim === n ? 'selected' : ''}>${n ? `【${n}/시】` : '제한 없음'}</option>`).join('')}</select></label>
    <label class="row" style="gap:4px">방식 <select data-ext="kind" ${A}><option value="act" ${e.kind !== 'extra' ? 'selected' : ''}>행동으로 (그 턴 기술 대신)</option><option value="extra" ${e.kind === 'extra' ? 'selected' : ''}>추가 행동 (행동과 따로)</option></select></label>
    <label class="row" style="gap:4px">쓰는 포켓몬 <select data-ext="who" ${A}><option value="">PT 전원</option>${mons.map(p => `<option value="${esc(p.id)}" ${e.who === p.id ? 'selected' : ''}>${esc(p.name || '(이름 없음)')}</option>`).join('')}${e.who && !mons.some(p => p.id === e.who) ? `<option value="${esc(e.who)}" selected>(없는 포켓몬)</option>` : ''}</select></label>
    <label class="row" style="gap:4px;flex:1;min-width:160px">출처 <input data-ext="src" ${A} value="${esc(e.src)}" placeholder="예) 『항법술』" maxlength="60" style="flex:1;min-width:0"></label></div>
   ${r ? `<div class="small faint" style="margin-top:3px">${rich(r[13] || '')}</div>` : ''}</div>`;
  }
}
function extHtml(t, ti) {
  const L = t.ext || [];
  const row = (e, k) => extRow(t, ti, e, k);
  return `<div class="mksp"><div class="row" style="gap:6px;align-items:baseline"><b class="small">기능 확장</b><span class="small muted">트레이너가 주는 「기능 확장 : 기술」 — 오레마스 배틀의 지시 · 공격 창 기술 목록 맨 뒤에 붙는다</span><span class="sp"></span><button type="button" class="btn sm" data-act="extAdd" data-i="${ti}">+ 기능 확장</button></div>
 ${L.map(row).join('') || '<p class="small faint" style="margin:4px 0 0">아직 없습니다 — 「+ 기능 확장」으로 기술 DB 에서 고른다 (예: 『항법술』 = 안개제거 · 【1/시】 · PT 전원)</p>'}
 <div class="row" style="margin-top:12px;gap:8px;align-items:center;flex-wrap:wrap"><b class="small">해석 차단</b><span class="small muted">기본값 — 포켓몬마다 「상세 조정」 탭에서 따로 정할 수 있다</span>
  <select data-tdexfw data-i="${ti}">${DEXFW.map(([v, l]) => `<option value="${v}" ${String(t.dexFw || '0') === v ? 'selected' : ''}>${esc(l)}</option>`).join('')}</select>
  ${String(t.dexFw) === '3' ? dexPartsHtml(t, `data-tdexp data-i="${ti}"`) : ''}</div></div>`;
}
function tuneDexBox(t, p, D) {
  const own = p.dexFw != null && p.dexFw !== '';
  const cur = own ? String(p.dexFw) : String(t.dexFw || '0');
  return `<section class="tbox"><div class="row"><b>해석 차단</b><span class="small muted">상대의 『포켓몬 도감』 · 데이터 해석을 막는다 · 오레마스가 불러오면 배틀에 그대로 걸린다</span></div>
  <div class="tcrit"><label>차단 <select data-dexfw="lv" ${D}><option value="" ${own ? '' : 'selected'}>트레이너 기본값 따름 (지금: ${esc(dexName(t.dexFw || '0'))})</option>${DEXFW.map(([v, l]) => `<option value="${v}" ${own && String(p.dexFw) === v ? 'selected' : ''}>${esc(l)}</option>`).join('')}</select></label>
   ${own && cur === '3' ? dexPartsHtml(p, `data-dexfw="p" ${D}`) : ''}</div>
  <p class="small faint" style="margin:6px 0 0">배틀 중에는 GM 이 도감 창에서 바꿀 수 있다. 「1회 차단」은 첫 해석을 막으면 저절로 풀린다.</p></section>`;
}
function spHtml(t, ti) {
  const L = t.sps || [];
  return `<div class="mksp"><div class="row" style="margin-top:12px;gap:6px;align-items:baseline"><b class="small">SP · 서포터</b><span class="small muted">밖에서 돕는 조력자 — 오레마스 배틀에서 확률로 발동</span><span class="sp"></span><button type="button" class="btn sm" data-act="spAdd" data-i="${ti}">+ SP</button></div>
 ${
   L.map((e, k) => {
     const img = /^https?:\/\//.test(e.img) ? e.img : '';
     return `<div class="mksc" tabindex="0" role="button" data-kbd data-act="spEdit" data-i="${ti}" data-k="${k}" style="--spc:${safeCss(e.color) || '#ffd12e'}"><i class="mkspi" ${img ? `style="background-image:url('${esc(img)}')"` : ''}>${img ? '' : 'SP'}</i><div class="mkspb"><div class="row" style="gap:6px"><b>『${esc(e.name)}』</b><span class="mkspp">${e.prob >= 100 ? '확정' : e.prob + '%'}</span>${String(e.auto || '').trim() ? '<span class="kindb" title="자동화 구문 있음">⚙ 구문</span>' : ''}<span class="sp"></span><button type="button" class="btn sm ghost danger" data-act="spDel" data-i="${ti}" data-k="${k}" aria-label="삭제">✕</button></div>${e.theme ? `<div class="small muted mkspt">${esc(e.theme)}</div>` : ''}${e.eff ? `<div class="small">${esc(e.eff).replace(/\n/g, '<br>')}</div>` : ''}</div></div>`;
   }).join('') || '<p class="small faint" style="margin:4px 0 0">아직 없습니다 — 「+ SP」</p>'
 }</div>`;
}
function openSpEditor(t, k, done) {
  const isNew = k == null;
  const e = isNew
    ? { name: '', prob: 100, theme: '', eff: '', img: '', line: '', color: '#ffd12e', auto: '', tg: 'party', tn: 0 }
    : Object.assign({}, t.sps[k]);
  let busy = false;
  let col = e.color || '#ffd12e';
  const l = openModal(
    `<div class="mhead"><h2>${isNew ? 'SP 추가' : 'SP 수정'}</h2><span class="small muted">${esc(t.name || '')}</span><span class="sp"></span><button class="btn ghost" data-x="no">닫기</button></div><div class="mbody"><div class="fed">
  <div class="fedf">
   <label class="lbl">이름<input id="sp-n" value="${esc(e.name)}" placeholder="예) 옛 동료의 지원 사격" maxlength="60" autocomplete="off"></label>
   <div class="row" style="gap:10px;flex-wrap:nowrap"><label class="lbl" style="flex:1;min-width:0">확률 (%)<input id="sp-p" type="number" min="0" max="100" value="${e.prob}"></label><label class="lbl" style="flex:3;min-width:0">테마<input id="sp-t" value="${esc(e.theme)}" placeholder="누가 · 어떻게 돕는지 한 줄" maxlength="120" autocomplete="off"></label></div>
   <div class="small faint" style="margin:-4px 0 4px">확률 100 이면 굴리지 않고 바로 발동 · 그 밖에는 d100 을 굴려 그 값 이하면 성공</div>
   <label class="lbl">효과 <span class="small faint" style="font-weight:400">한 줄에 하나 — 배틀 로그에 그대로</span><textarea id="sp-e" rows="4" placeholder="예) 상대 전체 방어 −1 랭크">${esc(e.eff)}</textarea></label>
   <label class="lbl">컷인 대사 <span class="small faint" style="font-weight:400">비우면 테마가 나온다</span><input id="sp-l" value="${esc(e.line)}" maxlength="80" autocomplete="off"></label>
   <div class="lbl">색</div><div class="row" style="gap:6px">${SP_COLS.map(c => `<button type="button" class="mkspcol ${c === col ? 'on' : ''}" data-spc="${c}" style="background:${c}"></button>`).join('')}</div>
   <div class="lbl">컷 그림 <span class="small faint" style="font-weight:400">끌어다 놓기 · 붙여넣기(Ctrl+V) · 파일 · 주소 — 비우면 트레이너 그림</span></div>
   <div class="feddrop" id="sp-d" tabindex="0" role="button" data-kbd><span id="sp-dt">여기에 그림을 끌어다 놓거나 눌러서 고르기</span></div>
   <div class="row" style="gap:4px;flex-wrap:nowrap"><input id="sp-i" value="${esc(e.img)}" placeholder="https://…" style="flex:1;min-width:0" autocomplete="off"><button type="button" class="btn sm ghost" id="sp-c" title="포트레이트 따기에서 자른 뒤 올린다">✂</button><button type="button" class="btn sm ghost" id="sp-x" title="그림 지우기">✕</button><input type="file" id="sp-f" accept="image/*" hidden></div>
   <details class="autobox" ${String(e.auto || '').trim() ? 'open' : ''}><summary>⚙ 자동화 구문 <span class="small muted" id="sp-ah"></span></summary>
    <div class="small muted" style="margin:4px 0">발동에 성공하면 오레마스가 자동으로 처리할 내용 — 「구문 대상」이 소지면 발동할 때 내 포켓몬(벤치 포함)을 고르고, 기준 포켓몬이면 필드 위 한 마리를 골라 거기서 대상(자신 · 상대1체 · 아군전체 …)을 잡는다. 한 줄에 명령 하나 — 예: <code>랭크 공격+1 임시 아군전체</code> · <code>상태확률 화상 30% 상대1체</code></div>
    <div class="row small" style="gap:8px;margin:2px 0 6px;flex-wrap:wrap"><label>구문 대상 <select id="sp-g"><option value="party" ${e.tg === 'party' ? 'selected' : ''}>소지 포켓몬 — 기본 전원, 발동할 때 고른다</option><option value="" ${e.tg !== 'party' ? 'selected' : ''}>기준 포켓몬 한 마리 (필드 위)</option></select></label><label>몇 체까지 <input id="sp-tn" type="number" min="0" max="6" value="${+e.tn || ''}" placeholder="전원" style="width:64px"></label><span class="faint">소지 = 벤치 포함 · 준비 단계에서도 · 「자신」 줄은 고른 포켓몬마다, 나머지 줄(상대 · 아군전체 …)은 한 번 · 줄 앞 「3할」 「저확률」 은 줄마다 굴린다</span></div>
    <textarea id="sp-a" rows="4" style="width:100%;font-family:var(--mono,monospace);font-size:12.5px" placeholder="(비우면 효과 글만 로그에)">${esc(e.auto || '')}</textarea>
    <div class="small" id="sp-ap" style="white-space:pre-wrap;margin-top:4px"></div><div id="sp-ag"></div>
    <details><summary class="small">구문 도움말</summary><pre class="small" style="white-space:pre-wrap">${esc(AUTO_HELP)}</pre></details></details>
  </div>
  <div class="fedp"><div class="small muted">미리보기 — 오레마스 「SP」</div><div id="sp-pv"></div></div>
 </div></div><div class="mfoot"><span class="small faint">Ctrl+Enter 로 ${isNew ? '추가' : '저장'}</span><span class="sp"></span><button class="btn" data-x="no">취소</button><button class="btn pri" id="sp-ok">${isNew ? '추가' : '저장'}</button></div>`,
    { wide: true }
  );
  const prev = () => {
    const u = $('#sp-i', l).value.trim();
    const img = /^https?:\/\//.test(u) ? u : /^https?:\/\//.test(t.image || '') ? t.image : '';
    const nm = $('#sp-n', l).value.trim() || '이름 없음';
    const p = Math.max(0, Math.min(100, Math.round(+$('#sp-p', l).value) || 0));
    const th = $('#sp-t', l).value.trim(),
      ln = $('#sp-l', l).value.trim();
    const eff = $('#sp-e', l)
      .value.replace(/\r/g, '')
      .split('\n')
      .map(x => x.trim())
      .filter(Boolean);
    $('#sp-pv', l).innerHTML =
      `<div class="mkspcut" style="--spc:${col}"><i ${img ? `style="background-image:url('${esc(img)}')"` : ''}></i><div><span class="mkspcut-t">${esc(t.name || '')}의 서포터!</span><b>『${esc(nm)}』</b>${ln || th ? `<span class="mkspcut-l">${esc(ln || th)}</span>` : ''}</div></div>
   <div class="fedlog" style="--fc:${col}"><div class="row" style="gap:6px"><span class="mkspp" style="--spc:${col}">SP</span><b>${esc(t.name || '')}의 서포터 『${esc(nm)}』</b><span class="small muted">${p >= 100 ? '확정' : p + '%'}</span></div>${th ? `<div class="small muted" style="font-style:italic">${esc(th)}</div>` : ''}${eff.length ? `<div class="small fedeff">${eff.map(x => `<div>· ${esc(x)}</div>`).join('')}</div>` : '<div class="small faint">효과 글 없음</div>'}</div>`;
    l.querySelectorAll('[data-spc]').forEach(b => b.classList.toggle('on', b.dataset.spc === col));
    $('#sp-dt', l).textContent = busy ? '올리는 중…' : u ? '다른 그림을 끌어다 놓거나 눌러서 바꾸기' : '여기에 그림을 끌어다 놓거나 눌러서 고르기';
    const K = window.OM_FX,
      ta = $('#sp-a', l);
    if (K && ta) {
      const r = K.parse(ta.value);
      $('#sp-ap', l).innerHTML =
        (r.ops.length ? '미리보기: ' + esc(K.unparse(r.ops).join(' / ')) : '') +
        (r.errs.length ? ` <span class="warn">모르는 줄: ${esc(r.errs.join(' / '))}</span>` : '');
      $('#sp-ah', l).textContent = r.ops.length ? '구문 있음' : '없음';
    } else $('#sp-ah', l).textContent = String((ta && ta.value) || '').trim() ? '구문 있음' : '없음';
  };
  l.addEventListener('input', prev);
  prev();
  l.querySelectorAll('[data-spc]').forEach(
    b =>
      (b.onclick = () => {
        col = b.dataset.spc;
        prev();
      })
  );
  {
    const gh = $('#sp-ag', l),
      ta = $('#sp-a', l);
    if (gh && ta && window.OM_FX_UI && OM_FX_UI.mountGen) OM_FX_UI.mountGen(gh, ta, { toast });
  }
  const up = async fl => {
    if (!fl) return;
    if (!/^image\//.test(fl.type)) return toast('그림 파일만');
    if (fl.size > 8 * 1024 * 1024) return toast('8MB 이하만');
    busy = true;
    prev();
    try {
      $('#sp-i', l).value = await putImg(`sp/${t.id}_${Date.now().toString(36)}`, fl);
      toast('올렸습니다');
    } catch (err) {
      toast('올리지 못했습니다: ' + err.message);
    }
    busy = false;
    prev();
  };
  $('#sp-d', l).onclick = () => $('#sp-f', l).click();
  $('#sp-f', l).onchange = ev => {
    const fl = ev.target.files[0];
    ev.target.value = '';
    up(fl);
  };
  $('#sp-c', l).onclick = () => cutImage('그림', $('#sp-i', l).value, up);
  $('#sp-x', l).onclick = () => {
    $('#sp-i', l).value = '';
    prev();
  };
  const box = $('.mbox', l) || l;
  const dz = $('#sp-d', l);
  box.addEventListener('dragover', ev => {
    if ([...((ev.dataTransfer && ev.dataTransfer.items) || [])].some(x => x.kind === 'file')) {
      ev.preventDefault();
      dz.classList.add('over');
    }
  });
  box.addEventListener('dragleave', ev => {
    if (ev.target === dz) dz.classList.remove('over');
  });
  box.addEventListener('drop', ev => {
    dz.classList.remove('over');
    const fl = ev.dataTransfer && [...ev.dataTransfer.files].find(x => /^image\//.test(x.type));
    if (fl) {
      ev.preventDefault();
      ev.stopPropagation();
      up(fl);
    }
  });
  box.addEventListener('paste', ev => {
    const it = [...((ev.clipboardData && ev.clipboardData.items) || [])].find(x => x.type.startsWith('image/'));
    if (it) {
      ev.preventDefault();
      ev.stopPropagation();
      up(it.getAsFile());
    }
  });
  l.querySelectorAll('[data-x="no"]').forEach(b => (b.onclick = () => closeModal()));
  const ok = () => {
    if (busy) return toast('그림을 올리는 중입니다');
    const name = $('#sp-n', l).value.trim();
    if (!name) {
      toast('이름을 적어 주세요');
      $('#sp-n', l).focus();
      return;
    }
    const v = spFix([
      {
        name,
        prob: $('#sp-p', l).value,
        theme: $('#sp-t', l).value.trim(),
        eff: $('#sp-e', l).value.replace(/\r/g, '').trim(),
        img: $('#sp-i', l).value.trim(),
        line: $('#sp-l', l).value.trim(),
        color: col,
        auto: $('#sp-a', l).value.trim(),
        tg: $('#sp-g', l).value,
        tn: $('#sp-tn', l).value
      }
    ])[0];
    t.sps = t.sps || [];
    if (isNew) t.sps.push(v);
    else t.sps[k] = v;
    closeModal();
    done && done();
    toast(isNew ? 'SP 를 넣었습니다' : '고쳤습니다');
  };
  $('#sp-ok', l).onclick = ok;
  box.addEventListener('keydown', ev => {
    if (ev.key === 'Enter' && (ev.ctrlKey || ev.metaKey)) {
      ev.preventDefault();
      ok();
    }
  });
}
function newTrainer() {
  const t = {
    id: uid(),
    open: true,
    name: '새 트레이너',
    kind: 'pc',
    pl: '',
    folder: '',
    image: '',
    ranks: { 지시: 'C', 육성: 'C', 통솔: 'C', 능력: 'C' },
    detail: { 지시: '', 육성: '', 통솔: '', 능력: '' },
    solo: false,
    misag: false,
    misagPen: {},
    pts: [],
    extra: {},
    base: Object.fromEntries(ptItems().map(([n, d]) => [n, +d || 0])),
    unique: [{ name: '', eff: '' }],
    ptMax: '',
    fields: [],
    sps: [],
    ext: [],
    dexFw: '',
    pokemon: []
  };
  applyTpl(t);
  return t;
}
function fixT(t) {
  if (t.base) delete t.base['소지품 소켓'];
  if (t.base && !t.mainV) {
    const rn = (ptItems().find(r => r[2] === 'rank') || [])[0];
    if (rn && +t.base[rn] === 4) t.base[rn] = 2;
    t.mainV = 1;
  } /* 10-30 메인 4 → 2 (예전 기본값일 때만) */
  const n = newTrainer();
  for (const k in n) if (t[k] == null) t[k] = n[k];
  for (const k in n.base) if (t.base[k] == null) t.base[k] = n.base[k];
  if (t.extra) {
    for (const k in t.extra) if (!+t.extra[k]) delete t.extra[k];
  }
  t.image = safeImg(t.image);
  if (!t.id) t.id = uid();
  t.stands = standsFix(t.stands);
  t.fields = fieldsFix(t.fields);
  t.sps = spFix(t.sps);
  t.ext = extFix(t.ext);
  t.sforms = (Array.isArray(t.sforms) ? t.sforms : [])
    .filter(f => f && typeof f === 'object')
    .slice(0, 6)
    .map(fixForm);
  /* 11-14 공유 폼체인지 */ t.deck = deckFix(t.deck);
  t.sk3 = sk3Fix(t.sk3);
  t.vault = vaultFix(t.vault);
  if (!(+t.standActive >= 0)) t.standActive = 0;
  t.pokemon.forEach(fixP);
  try {
    awSubSync(t);
  } catch (e) {}
  return t;
}
/* 같은 id가 두 번 나오면(예전 백업을 「추가」로 불러온 경우 등) 뒤의 것에 새 id를 준다 */
function dedupeIds() {
  const seen = new Set();
  for (const t of S.trainers) {
    if (seen.has('t' + t.id)) t.id = uid();
    seen.add('t' + t.id);
    for (const p of t.pokemon) {
      if (seen.has('p' + p.id)) p.id = uid();
      seen.add('p' + p.id);
    }
  }
}
function applyTpl(t, only) {
  const rows = S.db.tpl;
  const n = soloN(t);
  for (const r of rows) {
    const [q, rk, item, v6, , v1, v3] = r;
    let val = n === 3 ? (v3 != null && v3 !== '' ? v3 : s3val(v6, v1)) : n === 2 && v1 != null && v1 !== '' ? v1 : v6;
    if (!item) continue;
    if (isMisag(t) && misagCmd(item)) val = mRound((+v6 || 0) * fracNum(MR().cmdRatio, 4 / 6));
    if (q === '공통' && !only) {
      t.base[item] = +val || 0;
      continue;
    }
    if (only && q !== only) continue;
    if (!QUAL.includes(q)) continue;
    const cur = t.ranks[q];
    const exact = rows.some(x => x[0] === q && x[2] === item && x[1] === cur);
    if (exact ? rk === cur : strip(rk) === strip(cur)) t.base[item] = +val || 0;
  }
  const need = uniqNeed(t.ranks['능력']);
  while (t.unique.length < need) t.unique.push({ name: '', eff: '' });
}
const EXAMPLE =
  '싱잉 플로라;105;풀;독;-;-;음절초;150;65;100;40;100;70;;;;;;;C;식물;-#어시스트;현대종;귀를 기울여요;함께 춤춰요;마음을 추스려요;조화로운 멜로디;유인술;#【탈진】/「기능 확장 : 도우미, 감싸기, 쉬프트업」을 내보낼 수 있다.;최근에 발견된 새로운 종.;「씨뿌리기」 상태인 상대의 「변화기」에 저확률로 「특성 : 음절초」가 발동한다.;【지시 : B】/이 포텐셜을 「유인술」로 취급한다.;「정화」가 아군의 「혼란」「도발」도 치유할 수 있다.;「소리」 기술의 대상이 되었을 때 중확률로 「HP」를 1/6만큼 회복한다.;【1/시】【등장 (통상 교대)】/「날따름」「분노가루」「사이드체인지」에 의한 추가 행동을 얻는다.;#0;1;4;4;4;5;12;999;999;999;999;999;999;999;999;999;999;999;999;999;#-#-#크로스포이즌;독;물리;70;100;1체;O;0;베기;1할 「독」. 기술이 급소에 맞기 쉽다(C+1).;공격;방어;;4세대;Poison;1;1;\\씨뿌리기;풀;변화;0;90;1체;-;0;-;대상을 「씨뿌리기」 상태로 만들어 대상이 매 턴 종료 시 이 에리어의 포켓몬에게 「HP」를 1/8만큼 드레인당하게 만든다. 「타입 : 풀」에게 무효.;-;-;;1세대;Grass;1;1;\\정화;독;변화;0;100;1체;-;0;-;대상의 상태 이상을 치유한다. 그 후, 자신의 「HP」를 1/2만큼 회복한다.;-;-;;7세대;Poison;1;1;\\분노가루;벌레;변화;0;0;자신;-;2;가루, 선공;「우선도」+2. 대상이 자신을 공격하게 만든다. 「가루」 기술.「연속 제한 : 실패 확률 증가」.;-;-;「날따름」 상태와 동일 처리.;5세대;Bug;1;1;\\도우미;노말;변화;0;0;아군;-;5;선공;「우선도」+5. 아군을 턴 종료 시까지 「도우미」 상태로 만들어 기술 대미지를 강화(1.5배)한다.;-;-;;3세대;Normal;1;1;\\감싸기;노말;변화;0;0;아군;-;3;방어;「우선도」+3. 턴 종료 시까지 아군을 「유사 방어」 상태로 만들어 받는 대미지를 반감시킨다. 「연속 제한 (방어) : 실패 확률 증가」.;-;-;;3기;Normal;1;1;\\쉬프트업;노말;변화;0;0;아군;-;2;-;「우선도」+2. 턴 종료 시까지 아군의 「스피드」를 강화(1.5배)한다. 「연속 제한 : 실패 확률 증가」.;-;-;;3기;Normal;1;1;#';
function sampleTrainer() {
  const t = newTrainer();
  t.name = '예시 트레이너';
  const p = parseCopy(EXAMPLE, t);
  p.open = true;
  t.pokemon.push(p);
  return t;
}

/* ---------- 기술 범위 그림 (더블: 왼쪽 열 아군 · 오른쪽 열 상대 / 윗줄 = 자신·정면, 아랫줄 = 아군·대각) ---------- */
const RANGE_MAP = {
  '1체': 'AFD1',
  '자신': 'S',
  '상대 전체': 'FD',
  '자신 이외': 'AFD',
  '필드 전체': 'SAFD',
  '전체': 'SAFD',
  '정면': 'F',
  '자진': 'SA',
  '적진': 'FD',
  '아군 전체': 'SA',
  '아군': 'A',
  '대각': 'D'
};
function rangeGrid(v) {
  v = String(v ?? '').trim();
  const m = RANGE_MAP[v] || '';
  const one = m.includes('1');
  const c = (k, lab, full) => `<i class="${m.includes(k) ? (one ? 'pick' : 'on') : ''}${k === 'S' ? ' me' : ''}" title="${full}">${lab}</i>`;
  return `<span class="rgrid" title="범위: ${esc(v || '-')}${one ? ' · 이 중 1체를 고름' : ''}${m ? '' : ' · 그림 없음'}">${c('S', '아군', '자신')}${c('F', '상대', '정면의 상대')}${c('A', '아군', '옆의 아군')}${c('D', '상대', '대각선의 상대')}</span>`;
}

