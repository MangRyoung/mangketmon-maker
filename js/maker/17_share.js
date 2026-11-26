/* ── 조각 17_share.js — 공유 저장소 ── */
/* ---------- 공유 저장소 (여러 사람이 함께 보고 고치기) ----------
   trainers/<id>  {ord, data:트레이너(포켓몬 제외, pids=포켓몬 순서)}
   pokemon/<id>   {tid, data:포켓몬}
   dbedit/<kind>.<hex(key)>  {kind,key,row|deleted,custom,pos}  — 원본 DB와 다른 행만
   meta/settings  {tpl,tags,tagsV,ban}
   펼침·탭 같은 화면 상태(open, tab)는 사람마다 따로 둔다. */
const SH = {
  on: false,
  ready: false,
  db: null,
  canWrite: true,
  init: {},
  buf: {},
  ed: new Map(),
  meta: null,
  synced: new Map(),
  flushing: false,
  again: false,
  dbDirty: true,
  dbDocs: null,
  last: ''
};
const SH_KINDS = ['trainers', 'pokemon', 'dbedit', 'meta', 'folders'];
const UIK = new Set([
  'open',
  'tab',
  'effTxt',
  'baseUp',
  'statAdd',
  'statCp',
  'lvUp'
]); /* 10-26 점검: 공유에서 받은 effTxt · baseUp 이 눌러붙어 옛 값이 다시 올라가던 것 */
const nowHM = () => new Date().toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' });
function shStatus(t) {
  SH.last = t;
  const el = $('#saved');
  if (el) el.innerHTML = `<span class="shpill ${SH.canWrite ? '' : 'ro'}">공유</span> ${esc(t)}`;
  shDot();
}
/* 11-03: 상단 상태 점 — 「파일 ▾」 안의 #saved 는 좁은 화면에서 안 보여서. 누르면 자세히(실패한 시트 · 다시 시도 · 다시 연결) */
function shState() {
  const cfg = window.MKM_STORE && MKM_STORE.configured();
  if (!SH.on) {
    if (cfg) return { k: 'off', s: '연결 안 됨', t: '공유 DB 에 연결하지 못했습니다 · 이 브라우저에만 저장 중' };
    return { k: 'local', s: '이 브라우저', t: '공유 DB 설정이 없어 이 브라우저에만 저장합니다' };
  }
  if (!SH.ready) return { k: 'busy', s: '연결 중', t: '공유 저장소를 읽는 중…' };
  if (!SH.canWrite)
    return {
      k: 'ro',
      s: '읽기 전용',
      t: SH.initFail ? '공유 DB 를 다 읽지 못해 읽기 전용 · 「다시 연결」로 다시 시도' : '읽기 전용 · 고친 내용은 공유되지 않습니다'
    };
  if (SH.net === 'off') return { k: 'off', s: '연결 끊김', t: '실시간 연결이 끊겼습니다 · 남의 수정이 안 보일 수 있어요 (「다시 연결」)' };
  const bad = SH.bad ? SH.bad.size : 0;
  if (bad) return { k: 'warn', s: `실패 ${bad}건`, t: `저장 실패 ${bad}건 · ${SH_ERR_KO[SH.lastErr] || SH.lastErr || ''}` };
  if (SH.flushing || (shTimer && SH.retryAt))
    return {
      k: 'busy',
      s: SH.retryAt ? '다시 시도 중' : '저장 중',
      t: SH.retryAt ? `잠시 뒤 다시 저장합니다 (${SH_ERR_KO[SH.lastErr] || SH.lastErr || ''})` : '저장 중…'
    };
  if (SH.pendT) return { k: 'busy', s: '저장 대기', t: '곧 저장합니다' };
  return { k: 'ok', s: '저장됨', t: '공유 DB 와 맞습니다 · ' + (SH.last || '') };
}
function shDot() {
  const el = $('#shdot');
  if (!el) return;
  const st = shState();
  el.className = 'shdot ' + st.k;
  el.title = st.t;
  const b = el.querySelector('b');
  if (b) b.textContent = st.s;
  el.setAttribute('aria-label', '저장 · 연결 상태: ' + st.s);
}
function shBadNames() {
  const out = [];
  for (const p of (SH.bad || new Map()).keys()) {
    const i = p.indexOf('/'),
      kind = p.slice(0, i),
      id = p.slice(i + 1);
    let n = '';
    if (kind === 'trainers') {
      const t = S.trainers.find(x => x.id === id);
      n = '트레이너 ' + (t ? t.name || '이름 없음' : id);
    } else if (kind === 'pokemon') {
      let f = null;
      for (const t of S.trainers) {
        const q = t.pokemon.find(x => x.id === id);
        if (q) {
          f = `${t.name || '이름 없음'} › ${q.name || '이름 없음'}`;
          break;
        }
      }
      n = '포켓몬 ' + (f || id);
    } else if (kind === 'dbedit') {
      const d = (SH.ed && SH.ed.get(id)) || {};
      n = `DB 행 ${d.kind ? (DBS[d.kind] || {}).t || d.kind : ''} ${d.key || id}`;
    } else if (kind === 'meta') n = '설정 ' + id.replace(/^set\./, '');
    else if (kind === 'folders') {
      const f = fById(id);
      n = '폴더 ' + (f ? f.name || '이름 없음' : id);
    } else n = p;
    out.push(n);
  }
  return out;
}
function openShInfo() {
  const st = shState();
  const bad = shBadNames();
  const cfg = window.MKM_STORE && MKM_STORE.configured();
  const l =
    openModal(`<div class="mhead"><h2>저장 · 연결 상태</h2><span class="sp"></span><button class="btn ghost" data-x>닫기</button></div><div class="mbody shinfo">
 <dl><dt>지금</dt><dd><span class="shdot ${st.k}" style="pointer-events:none"><i></i><b>${esc(st.s)}</b></span> ${esc(st.t)}</dd>
 <dt>마지막</dt><dd>${esc(SH.last || '—')}</dd>${SH.lastErr ? `<dt>마지막 오류</dt><dd>${esc(SH_ERR_KO[SH.lastErr] || SH.lastErr)}${SH.netCode ? ` <span class="muted">(${esc(SH.netCode)})</span>` : ''}</dd>` : ''}
 ${bad.length ? `<dt>실패한 항목</dt><dd><ul>${bad.map(x => `<li>${esc(x)}</li>`).join('')}</ul></dd>` : ''}</dl>
 ${!SH.on && !cfg ? '<p class="small muted">js/config.js 에 공유 DB 설정이 없어 혼자 쓰기 모드입니다.</p>' : ''}</div>
 <div class="mfoot"><span class="sp"></span>${SH.on && SH.canWrite ? '<button class="btn" data-retry>다시 시도</button>' : ''}${cfg ? '<button class="btn pri" data-reconn>다시 연결</button>' : ''}</div>`);
  l.addEventListener('click', async e => {
    if (e.target.closest('[data-x]')) return closeModal();
    if (e.target.closest('[data-retry]')) {
      if (SH.bad) SH.bad.clear();
      SH.bigWarn = false;
      closeModal();
      toast('다시 저장합니다…');
      shFlush();
      return;
    }
    if (e.target.closest('[data-reconn]')) {
      closeModal();
      shReconnect();
    }
  });
}
/* 「다시 연결」: 켜져 있으면 실시간 채널을 다시 붙이고 전부 맞춘다 · 처음 연결에 실패했거나 다 못 읽어 읽기 전용이면 새로고침 없이 처음부터 다시 */
async function shReconnect() {
  if (SH.on && SH.ready && !SH.initFail) {
    toast('다시 연결하는 중…');
    SH.net = 'ok';
    try {
      SH.db.reconnect ? SH.db.reconnect() : SH.db.resyncAll();
    } catch (e) {}
    shDot();
    shFlush();
    return;
  }
  if (SH.reconnecting) return;
  SH.reconnecting = true;
  toast('공유 DB 에 다시 연결하는 중…');
  try {
    for (const u of SH.unsubs || [])
      try {
        u();
      } catch (e) {}
    SH.unsubs = [];
    Object.assign(SH, {
      on: false,
      ready: false,
      live: false,
      starting: false,
      initFail: false,
      failed: false,
      canWrite: true,
      init: {},
      buf: {},
      synced: new Map(),
      net: 'ok',
      db: null
    });
    SH.bad = new Map();
    shDot();
    await shInit();
  } finally {
    SH.reconnecting = false;
    shDot();
  }
}
document.addEventListener('click', e => {
  if (e.target.closest && e.target.closest('#shdot')) openShInfo();
});
const canon = o =>
  JSON.stringify(o, (k, v) =>
    v && typeof v === 'object' && !Array.isArray(v)
      ? Object.fromEntries(
          Object.keys(v)
            .sort()
            .map(x => [x, v[x]])
        )
      : v
  );
function fnv(s) {
  let h = 2166136261;
  for (const c of String(s)) {
    h ^= c.codePointAt(0);
    h = Math.imul(h, 16777619) >>> 0;
  }
  return h.toString(16);
}
function keySeg(k) {
  const h = [...new TextEncoder().encode(String(k))].map(b => b.toString(16).padStart(2, '0')).join('');
  return h.length <= 180 ? h : 'h' + fnv(k) + h.slice(0, 40);
}
/* 오레마스가 시트를 가져갈 때 쓰는 효과 글 사본 (10-21 망령): 특성·포텐셜이 오레마스 DB 에 없거나 제작기에서 새로 만든 것이어도 시트에 보이는 글 그대로 */
function effSnap(p) {
  try {
    const ab = p.ability ? idx.abil && idx.abil.get(p.ability) : null;
    const it = itemRow(p);
    return {
      ab: ab ? String(ab[2] || '') : '',
      it: it ? String(it[4] || '') : '',
      itAuto: it ? String(it[7] || '') : '',
      itCons: it && it[3] === 'O' ? 1 : 0,
      its2: (p.items2 || []).map(x => {
        const r = itemRow(x);
        return r ? { it: String(r[4] || ''), itAuto: String(r[7] || ''), itCons: r[3] === 'O' ? 1 : 0 } : null;
      }),
      pots: (p.pots || []).map((n, i) => (n && n !== '-' ? String(potEffOf(p, i) || '') : '')),
      kinds: (p.pots || []).map((n, i) => (n && n !== '-' ? String(potKindOf(p, i) || '') : '')),
      /* 11-03: 폼의 특성 · 포텐셜 글도 (오레마스 formsOf 가 자기 DB 에서만 찾아 제작기 신규 특성이 빈 글이 됐다). p.forms 와 같은 차례 */
      forms: (p.forms || []).map(f => {
        if (!f) return null;
        const fa = f.ability ? idx.abil && idx.abil.get(f.ability) : null;
        return {
          ab: fa ? String(fa[2] || '') : '',
          pots: (f.pots || []).map(x => {
            if (!x || !x.name) return '';
            if (x.eff) return String(x.eff);
            const r = idx.pots && idx.pots.get(x.name);
            return r ? String(r[2] || '') : '';
          }),
          kinds: (f.pots || []).map(x => {
            if (!x || !x.name) return '';
            const r = idx.pots && idx.pots.get(x.name);
            return r ? String(r[0] || '') : '';
          })
        };
      })
    };
  } catch (e) {
    return null;
  }
}
function stripUI(o) {
  const c = {};
  for (const k in o) {
    if (UIK.has(k) || k[0] === '_' || k === 'pokemon') continue;
    c[k] = clone(o[k]);
  }
  return c;
}
let DEFJ = null,
  DEFJN = -1;
function defJ() {
  const rn = (DEF.rm || []).length * 100000 + (DEF.st || []).length;
  if (DEFJ && DEFJN === rn) return DEFJ;
  DEFJN = rn;
  DEFJ = {};
  for (const k in DBS) {
    const m = new Map();
    for (const r of DEF[k] || []) {
      const key = r[DBS[k].key];
      if (key !== '' && !m.has(key)) m.set(key, rowJ(r));
    }
    DEFJ[k] = m;
  }
  return DEFJ;
}
/* 행 비교: 뒤쪽 빈 칸은 없는 것과 같다 (10-24 레디메이드 「확률」 칸을 더해도 예전 행이 「바뀐 행」으로 잡히지 않게) */
function rowJ(r) {
  const a = Array.isArray(r) ? r.slice() : r;
  if (Array.isArray(a)) while (a.length && (a[a.length - 1] === '' || a[a.length - 1] == null)) a.pop();
  return JSON.stringify(a);
}
const MASS_DEL = 30;
/* 공유 모드: 표를 지을 때의 기본 행 수와 지금 기본 행 수가 같아야 비교한다 (레디메이드 · 상태 변화는 기본 행이 늦게 생긴다) */
function builtOk(k) {
  if (!(k === 'rm' || k === 'st')) return true;
  let on = false;
  try {
    on = !!(SH && SH.on && SH.ready);
  } catch (e) {}
  if (!on) return true;
  return !!(SH.builtN && SH.builtN[k] === (DEF[k] || []).length && (DEF[k] || []).length > 0);
}
function dbEditDocs(out = new Map()) {
  const dj = defJ();
  for (const k in DBS) {
    if (!lazyOk(k) || !builtOk(k)) continue;
    /* 레디메이드 기본 행이 아직 없으면 비교하지 않는다 (915행이 전부 「바뀐 행」으로 잡히는 것 방지) */ const seen = new Set(),
      cust = new Set(S.custom[k] || []);
    S.db[k].forEach((r, ix) => {
      const key = r[DBS[k].key];
      if (key === '' || key == null || seen.has(key)) return;
      seen.add(key);
      const d = dj[k].get(key);
      if (d === rowJ(r) && !cust.has(key)) return;
      const ks = k + '.' + keySeg(key);
      const pv = SH && SH.ed && SH.ed.get(ks);
      /* 11-04 21:38 망령 「갑자기 웹툴 렉이 심하다」: 직접 추가한 행(custom)의 pos 를 창마다 자기 줄 번호(ix)로 올려서, 줄 순서가 다른 창끼리 카드 행 수십 개를 1초마다 서로 덮는 줄다리기가 됐다(공유 DB 과부하).
      받은 문서와 행이 같으면 받은 pos 를 그대로 쓴다 — 모든 창이 같은 값으로 멈춘다 */
      /* 11-04 22:01 감우: 남이 그 행을 지우거나 고쳐서 받은 사본(pv)이 내 행과 다르면 ix 로 떨어져, shRebuildDB 가 「마지막으로 올린 것(synced)과 pos 가 다르다 → 아직 안 올린 내 수정」으로 잡고
      지운 카드를 되살리거나 옛 행으로 덮었다(열린 제작기마다 10초 안에). 내가 마지막으로 올린 문서의 행이 지금 내 행과 같으면 그 pos 를 쓴다 */
      let sv = null;
      if (!d && !(pv && !pv.deleted && Array.isArray(pv.row) && rowJ(pv.row) === rowJ(r))) {
        const sj = SH && SH.synced && SH.synced.get('dbedit/' + ks);
        if (sj)
          try {
            const o = JSON.parse(sj);
            if (o && !o.deleted && Array.isArray(o.row) && rowJ(o.row) === rowJ(r) && o.pos != null && +o.pos >= 0) sv = +o.pos;
          } catch (e) {}
      }
      const pos = d
        ? -1
        : pv && !pv.deleted && Array.isArray(pv.row) && rowJ(pv.row) === rowJ(r) && pv.pos != null && +pv.pos >= 0
          ? +pv.pos
          : sv != null
            ? sv
            : ix;
      out.set('dbedit/' + ks, { kind: k, key, row: r, custom: cust.has(key), pos });
    });
    {
      const miss = [...dj[k].keys()].filter(key => !seen.has(key));
      if ((k === 'rm' || k === 'st') && miss.length >= MASS_DEL) {
        console.warn('[DB] ' + k + ' 기본 행 ' + miss.length + '개가 비어 있음 — 한꺼번에 지운 것으로 보지 않는다');
        continue;
      }
      for (const key of miss) out.set('dbedit/' + k + '.' + keySeg(key), { kind: k, key, deleted: true });
    }
  }
  return out;
}
function shDbDocs() {
  if (SH.dbDocs && !SH.dbDirty) return SH.dbDocs;
  const out = dbEditDocs();
  const st = shSettings();
  for (const g in META_G) {
    const o = {};
    for (const k of META_G[g]) o[k] = st[k];
    out.set('meta/set.' + g, o);
  }
  SH.dbDocs = out;
  SH.dbDirty = false;
  return out;
}
/* 테이블 탭 설정은 묶음마다 문서 하나(meta/set.tpl …). 두 사람이 서로 다른 표를 동시에 고쳐도 한쪽이 지워지지 않는다. 예전 문서 meta/settings 는 읽기만 하고 그대로 둔다 */
const META_G = {
  tpl: ['tpl', 'tplV', 'tplSoloV'],
  tags: ['tags', 'tagsV'],
  ban: ['ban'],
  stpl: ['stpl', 'stplV'],
  oldSock: ['oldSock'],
  soloSock: ['soloSock'],
  ptItems: ['ptItems', 'ptiV'],
  pride: ['pride', 'prideExV'],
  ilock: ['ilock'],
  rules: ['rules']
};
function shMetaGroups() {
  const st = shSettings(),
    out = {};
  for (const g in META_G) {
    const o = {};
    for (const k of META_G[g]) o[k] = st[k];
    out[g] = o;
  }
  return out;
}
function shMetaMerge() {
  const L = SH.metaL && typeof SH.metaL === 'object' ? SH.metaL : null;
  const G = SH.metaG || {};
  if (!L && !Object.keys(G).length) return null;
  const m = Object.assign({}, L || {});
  for (const g in G) Object.assign(m, G[g] || {});
  return m;
}
function shSettings() {
  return {
    tpl: S.db.tpl || [],
    tplV: S.db.tplV || 0,
    tags: S.db.tags || [],
    tagsV: S.db.tagsV || 0,
    ban: S.db.ban ?? '',
    stpl: S.db.stpl || [],
    stplV: S.db.stplV || 0,
    oldSock: S.db.oldSock ?? 5.5,
    ptItems: S.db.ptItems || PTI_DEF,
    ptiV: S.db.ptiV || 0,
    pride: S.db.pride || PRIDE_DEF,
    prideExV: S.db.prideExV || 0,
    tplSoloV: S.db.tplSoloV || 0,
    soloSock: S.db.soloSock || SOLO_SOCK_DEF,
    ilock: S.db.ilock || [],
    rules: RULES()
  };
}
function shWant() {
  const out = new Map();
  S.folders.forEach((f, i) => {
    f._ord = i;
    const d = { ord: i, name: f.name || '' };
    if (f.parent) d.parent = f.parent;
    if (f.priv) d.priv = true;
    if (f.rule) d.rule = f.rule;
    if (f.deco && Object.keys(f.deco).length) d.deco = f.deco;
    if (f.owner) {
      d.owner = f.owner;
      d.ownerName = f.ownerName || '';
    }
    if (Array.isArray(f.co) && f.co.length) d.co = f.co;
    if (f.dgRoot) d.dgRoot = true;
    if (f.dgId) d.dgId = String(f.dgId);
    out.set('folders/' + f.id, d);
  }); /* 11-16 던전 야생 폴더 표시 */
  S.trainers.forEach((t, i) => {
    t._ord = i;
    const d = stripUI(t);
    d.pids = t.pokemon.map(p => p.id);
    if (isMisag(t)) d.misagOut = misagOut(t);
    else delete d.misagOut;
    try {
      d.ptUse = ptSnap(t);
    } catch (e) {
      delete d.ptUse;
    }
    try {
      d.ordOut = ordSnap(t);
    } catch (e) {
      delete d.ordOut;
    }
    /* 10-29 노트 대학 시트 PT 서머리가 읽는 사본 */ /* 10-28 미사그 대학: 오레마스가 읽는 각성체 대가 요약 */ out.set('trainers/' + t.id, {
      ord: i,
      data: d
    });
    t.pokemon.forEach(p => {
      const bu = baseUp(t, p);
      out.set('pokemon/' + p.id, {
        tid: t.id,
        data: Object.assign(
          stripUI(p),
          { effTxt: effSnap(p) },
          bu.up.length
            ? { baseUp: { base: bu.base.map(v => (v === '' ? '' : +v)), up: bu.up.map(u => ({ i: u.i, from: u.from, to: u.to, by: u.by })) } }
            : {},
          (bu.add || []).some(v => v) ? { statAdd: bu.add.slice() } : {},
          (bu.cp || []).some(v => v != null) ? { statCp: bu.cp.slice() } : {},
          (() => {
            const L = lvBonusList(t, p);
            return L.length ? { lvUp: { n: L.reduce((a, x) => a + x.n, 0), by: L.map(x => x.by) } } : {};
          })()
        )
      });
    });
  });
  for (const [id, d] of SH.orph_ed || [])
    out.set('dbedit/' + id, d); /* 붙을 행이 없는 수정도 지우지 않는다. 같은 이름 행이 다시 생기면 아래 줄이 덮는다 */
  for (const [p, b] of shDbDocs()) out.set(p, b);
  /* 레디메이드 기본 행을 아직 못 읽었으면, 받아 둔 레디메이드 수정 행은 그대로 둔다 (지우지 않게) */
  for (const lk of ['rm', 'st'])
    if (!lazyOk(lk) || !builtOk(lk))
      for (const [id, d] of SH.ed)
        if (d && d.kind === lk) out.set('dbedit/' + id, d); /* 11-03: 기본 행이 생긴 뒤 아직 다시 짓지 않은 표도 받아 둔 수정 행을 그대로 둔다 */
  if (SH.metaL) out.set('meta/settings', SH.metaL);
  return out;
}
async function runPool(jobs, n) {
  let i = 0;
  const w = async () => {
    while (i < jobs.length) {
      const j = jobs[i++];
      await j();
    }
  };
  await Promise.all(Array.from({ length: Math.min(n, jobs.length) }, w));
}
const SH_ERR_KO = {
  invalid_argument: '저장이 거부됨(권한 없음 또는 항목이 너무 큼)',
  resource_exhausted: '저장 요청이 너무 잦음',
  quota_exceeded: '공유 저장소 용량 초과',
  unavailable: '일시적인 연결 문제',
  revoked: '접근 권한이 바뀜',
  not_granted: '공유 저장소 사용이 허용되지 않음',
  capability_disabled: '공유 저장소를 쓸 수 없는 화면'
};
function shErr(e) {
  const c = (e && e.code) || 'unknown';
  const m = SH_ERR_KO[c] || '알 수 없는 오류: ' + ((e && e.message) || c);
  SH.lastErr = c;
  if (c === 'revoked' || c === 'not_granted' || c === 'capability_disabled') {
    SH.canWrite = false;
  }
  if (c === 'unavailable') {
    SH.net = 'off';
    SH.netCode = (e && e.message) || c;
  }
  shDot();
  if (!SH.toasted) SH.toasted = new Set();
  if (!SH.toasted.has(c) && c !== 'unavailable' && c !== 'resource_exhausted') {
    SH.toasted.add(c);
    toast('공유 저장: ' + m);
  }
  console.warn('[공유 저장소]', c, e && e.message);
  return c;
}
/* 11-03 버그: 올린 뒤 SH.synced 만 갱신하고 SH.ed · SH.metaG(받은 사본)는 그대로 둬서, 뒤에 남의 dbedit · meta 가 오면 shRebuildDB 가 옛 사본으로 S.db 를 다시 지어 화면이 되돌아가고
   다음 저장이 내 dbedit 행을 지우거나 설정 기본값을 다시 올렸다. 올리기(또는 남의 저장이 내 값과 같아 「올라간 것」으로 친 때)에 성공하면 받은 사본에도 같은 값을 적는다 */
function shTrack(p, o) {
  const i = p.indexOf('/'),
    kind = p.slice(0, i),
    id = p.slice(i + 1);
  if (kind === 'dbedit') {
    if (o) SH.ed.set(id, clone(o));
    else SH.ed.delete(id);
  } else if (kind === 'meta') {
    if (id === 'settings') SH.metaL = o ? clone(o) : null;
    else if (id.startsWith('set.')) {
      SH.metaG = SH.metaG || {};
      if (o) SH.metaG[id.slice(4)] = clone(o);
      else delete SH.metaG[id.slice(4)];
    } else return;
    SH.meta = shMetaMerge();
  }
}
let shTimer = null,
  shBack = 0,
  shLastFlush = 0;
function shSchedule(ms) {
  clearTimeout(shTimer);
  SH.pendT = true;
  shTimer = setTimeout(() => {
    SH.pendT = false;
    shFlush();
  }, ms);
  shDot();
}
async function shFlush() {
  if (!SH.on || !SH.ready) return;
  if (!SH.canWrite) {
    shStatus('읽기 전용 · 고친 내용은 공유되지 않습니다');
    return;
  }
  if (SH.flushing) {
    SH.again = true;
    return;
  }
  const wait = 800 - (Date.now() - shLastFlush);
  if (wait > 0) {
    shSchedule(wait);
    return;
  }
  /* 11-09 감우 57 (망령 「잎사귀법의 1.33 으로 고쳤는데 2배로 돌아갔다」): 읽기만 하던 낡은 창(제작기를 연 뒤 남이 고친 행을 표에 다시 짓지 못한 창)이 떠날 때(beforeunload) · 시작할 때 「내 표와 올라간 값이 다르다」를 내 수정으로 보고
    남의 수정을 옛 값으로 덮었다(15:12:18 특성 행 · 레디메이드 행 · 포켓몬 시트). 이 창에서 고친 것(save — userEdit)이 없으면 아무것도 올리지 않는다. 처음 빈 DB 를 채울 때(autoOk)만 예외 */
  if (!SH.userEdit && !SH.autoOk) {
    const n = shDirtyPaths().length;
    if (n) {
      console.warn(
        '[공유 저장소] 이 창에서 고친 것이 없는데 올라간 값과 다른 문서가 ' + n + '개 — 남의 수정을 덮지 않게 올리지 않는다',
        shDirtyPaths().slice(0, 10)
      );
      shStatus('연결됨 · 이 창에서 고친 것 없음');
    }
    return;
  }
  const UE0 = SH.userEdit || 0;
  SH.flushing = true;
  shLastFlush = Date.now();
  let retry = false,
    hard = 0,
    did = false;
  SH.bad = SH.bad || new Map();
  try {
    if (SH.db && SH.db.fresh)
      try {
        await SH.db.fresh(60000, SH_KINDS);
      } catch (e) {} /* 11-03: meta · dbedit · folders 도 표 통째 쓰기라 낡은 탭이 덮지 않게 먼저 맞춘다 */
    do {
      SH.again = false;
      const want = shWant();
      const jobs = [];
      for (const [p, b] of want) {
        const j = canon(b);
        if (SH.synced.get(p) === j || SH.bad.get(p) === j) continue;
        if (j.length > 1500000) {
          if (shHostBig(p)) continue;
          if (!SH.bigWarn) {
            SH.bigWarn = true;
            toast('한 항목이 너무 커서 공유 저장하지 못했습니다 · 메모나 효과 글을 줄여 주세요');
          }
          SH.bad.set(p, j);
          continue;
        }
        jobs.push(async () => {
          try {
            const o = JSON.parse(j);
            await SH.db.doc(p).set(o);
            SH.synced.set(p, j);
            shTrack(p, o);
            SH.bad.delete(p);
            if (p.startsWith('trainers/')) rcvNote(p.slice(9), o.data);
          } catch (e) {
            const c = shErr(e);
            if (c === 'unavailable' || c === 'resource_exhausted') retry = true;
            else {
              SH.bad.set(p, j);
              hard++;
            }
          }
        });
      }
      for (const p of [...SH.synced.keys()])
        if (!want.has(p))
          jobs.push(async () => {
            try {
              await SH.db.doc(p).delete();
              SH.synced.delete(p);
              shTrack(p, null);
            } catch (e) {
              const c = shErr(e);
              if (c === 'unavailable' || c === 'resource_exhausted') retry = true;
              else hard++;
            }
          });
      if (jobs.length) {
        shStatus(`저장 중… (${jobs.length})`);
        await runPool(jobs, 2);
        did = true;
      }
    } while (SH.again && !retry);
  } finally {
    SH.flushing = false;
  }
  if (retry) {
    shBack = Math.min(30000, (shBack || 1500) * 2);
    SH.retryAt = Date.now() + shBack;
    shStatus(`잠시 뒤 다시 저장합니다 (${SH_ERR_KO[SH.lastErr] || SH.lastErr})`);
    shSchedule(shBack);
    return;
  }
  if (!hard && !SH.again && (SH.userEdit || 0) === UE0) {
    SH.userEdit = 0;
    SH.autoOk = 0;
  } /* 다 올렸으면 표시를 지운다 — 그 사이에 또 고쳤으면 남긴다 */
  SH.retryAt = 0;
  if (SH.net === 'off' && !hard) SH.net = 'ok';
  shBack = 0;
  shStatus(hard ? `저장 실패 ${hard}건 · ${SH_ERR_KO[SH.lastErr] || SH.lastErr}` : '저장됨 ' + nowHM());
  if (did && !hard) savedFx();
  if (SH.again) shSchedule(300);
}
/* 1.5MB 를 넘는 문서: 안에 든 그림(data URL)을 공유 저장소로 옮기고 주소만 남긴 뒤 다시 저장한다 */
function shHostBig(path) {
  SH.hosting = SH.hosting || new Set();
  if (SH.hosting.has(path)) return true;
  const [kind, id] = [path.slice(0, path.indexOf('/')), path.slice(path.indexOf('/') + 1)];
  let o = null,
    tag = '';
  if (kind === 'trainers') {
    o = S.trainers.find(t => t.id === id);
    tag = 't';
  } else if (kind === 'pokemon') {
    for (const t of S.trainers) {
      o = t.pokemon.find(p => p.id === id);
      if (o) break;
    }
    tag = 'p';
  }
  if (!o || !/^data:/.test(String(o.image || ''))) return false;
  SH.hosting.add(path);
  toast('그림이 커서 공유 저장소로 옮기는 중…');
  hostImg(tag, o.id, o.image)
    .then(u => {
      o.image = u;
      save();
      renderAll();
      toast('그림을 공유 저장소로 옮겼습니다');
    })
    .catch(e => {
      toast('그림을 옮기지 못했습니다: ' + e.message + ' · 이미지를 작게 바꿔 주세요');
      SH.bad.set(path, canon(shWant().get(path)));
    })
    .finally(() => SH.hosting.delete(path));
  return true;
}
function replaceFields(o, d, keep) {
  for (const k of Object.keys(o)) if (!keep.has(k) && k[0] !== '_' && !(k in d)) delete o[k];
  for (const k in d) if (!keep.has(k)) o[k] = clone(d[k]);
}
const KEEP_T = new Set(['open', 'pokemon']),
  KEEP_P = new Set(['open', 'tab']);
/* 11-02 망령 「대학 시트에서 각성체 · PT 가 날아갔다」: 오래 열어 둔(실시간이 끊겨 남의 새 포켓몬을 못 받은) 제작기가 트레이너 문서를 통째로 다시 올려
   pids · ptUse(노트 PT 서머리) · misagOut 이 그 옛 목록으로 줄어든 일. 포켓몬 문서(tid)는 멀쩡했다.
   ① 받은 트레이너 문서의 pids · ptUse.mons 에 이 화면에 붙어 있는 포켓몬이 빠져 있으면 → 잠시 뒤 지금 값으로 다시 올린다 (shHeal)
   ② 올리기 전에 마지막으로 맞춘 지 1분 넘었으면 공유 DB 와 먼저 맞춘다 (store.fresh) */
function rcvNote(id, data) {
  if (!data) return;
  const pu = data.ptUse && data.ptUse.mons;
  (SH.rcvT = SH.rcvT || new Map()).set(id, { pids: new Set(data.pids || []), mons: pu && typeof pu === 'object' ? new Set(Object.keys(pu)) : null });
}
function shHeal() {
  if (!SH.on || !SH.ready || !SH.canWrite || !SH.rcvT) return;
  let n = 0;
  for (const t of S.trainers) {
    const r = SH.rcvT.get(t.id);
    if (!r) continue;
    if (t.pokemon.some(p => !r.pids.has(p.id) || (r.mons && !r.mons.has(p.id)))) {
      SH.synced.delete('trainers/' + t.id);
      n++;
    }
  }
  if (n) {
    console.info('[공유 저장소] 포켓몬 목록이 빠진 트레이너 ' + n + '명을 다시 올립니다');
    shSchedule(300);
  }
}
function shPutTrainer(id, d) {
  let t = S.trainers.find(x => x.id === id);
  const data = clone(d.data || {});
  rcvNote(id, data);
  const pids = data.pids || [];
  delete data.pids;
  if (!t) {
    t = { id, open: false, pokemon: [] };
    S.trainers.push(t);
  }
  replaceFields(t, data, KEEP_T);
  t.id = id;
  t._ord = +d.ord || 0;
  t._pids = pids;
  fixT(t);
  const all = new Map(t.pokemon.map(p => [p.id, p]));
  for (const [pid, p] of SH.orph)
    if (p._tid === id) {
      all.set(pid, p);
      SH.orph.delete(pid);
    }
  const list = pids.map(x => all.get(x)).filter(Boolean);
  for (const p of all.values()) if (!list.includes(p)) list.push(p);
  t.pokemon = list;
}
function shPutPoke(id, d) {
  let p = null,
    owner = null;
  for (const t of S.trainers) {
    const x = t.pokemon.find(q => q.id === id);
    if (x) {
      p = x;
      owner = t;
      break;
    }
  }
  if (!p) p = SH.orph.get(id);
  if (!p) p = { id, open: false, tab: 'base' };
  {
    const dd = clone(d.data || {});
    delete dd.effTxt;
    delete dd.baseUp;
    delete dd.statAdd;
    delete dd.statCp;
    delete dd.lvUp;
    replaceFields(p, dd, KEEP_P);
  }
  p.id = id;
  p._tid = d.tid;
  fixP(p);
  const t = S.trainers.find(x => x.id === d.tid);
  if (owner && owner !== t) owner.pokemon = owner.pokemon.filter(q => q !== p);
  if (t) {
    if (!t.pokemon.includes(p)) {
      const pos = (t._pids || []).indexOf(id);
      if (pos >= 0) {
        const after = t.pokemon.filter(q => (t._pids || []).indexOf(q.id) >= 0 && (t._pids || []).indexOf(q.id) < pos).length;
        t.pokemon.splice(after, 0, p);
      } else t.pokemon.push(p);
    }
    SH.orph.delete(id);
    try {
      awSubSync(t);
    } catch (e) {}
  } else SH.orph.set(id, p);
}
function shDelTrainer(id) {
  S.trainers = S.trainers.filter(t => t.id !== id);
}
function shDelPoke(id) {
  for (const t of S.trainers) t.pokemon = t.pokemon.filter(p => p.id !== id);
  SH.orph.delete(id);
}
/* 11-03 저녁 버그: 아래 「미전송 보존」은 공유 DB 를 다 읽은 뒤(SH.live)에만. 처음 읽을 때는 SH.synced 가 비어 있어 지난 세션 사본(localStorage)의 dbedit 행 전부가 「미전송」으로 잡혀
   매번 열 때마다 수백 행을 다시 올리고(노트 「저장하고 닫기」가 변경 없이도 9초 대기), 남이 그사이 고친 행을 내 옛 사본으로 덮었다 */
function shRebuildDB() {
  /* 아직 올리지 않은 내 설정 묶음은 받은 값으로 덮지 않는다 */ const keepG = {};
  SH.kept = new Set();
  if (SH.live) {
    const loc = shMetaGroups();
    for (const g in loc) {
      const p = 'meta/set.' + g;
      if (SH.synced.has(p) && SH.synced.get(p) !== canon(loc[g])) {
        keepG[g] = clone(loc[g]);
        SH.kept.add(p);
      }
    }
  }
  const keepNonDb = {};
  for (const k in DEF) if (!(k in DBS)) keepNonDb[k] = clone(DEF[k]);
  /* 11-03: 아직 못 올린 내 DB 수정 행(dbedit)도 받은 사본 위에 얹는다 — 올리기 전에 남의 dbedit 가 오면 내 수정이 화면에서 사라지고 다음 저장이 그 행을 지우던 버그 */
  const ED = new Map(SH.ed);
  if (SH.live) {
    try {
      const okK = k => lazyOk(k) && Array.isArray(S.db[k]) && S.db[k].length > 0 && builtOk(k);
      /* 아직 한 번도 짓지 않은 표(레디메이드 · 상태 변화 기본 행이 방금 생긴 때)는 비교하지 않는다 */ const loc = dbEditDocs();
      for (const [p, d] of loc) {
        if (!okK(d.kind)) continue;
        if (SH.synced.get(p) !== canon(d)) {
          ED.set(p.slice(7), d);
          SH.kept.add(p);
        }
      }
      for (const p of SH.synced.keys())
        if (p.startsWith('dbedit/') && !loc.has(p)) {
          const d = ED.get(p.slice(7));
          if (d && okK(d.kind)) {
            ED.delete(p.slice(7));
            SH.kept.add(p);
          }
        }
    } catch (e) {
      console.warn('[공유 저장소] 미전송 수정 행 보존 실패', e);
    }
  }
  /* 11-03 23:35 망령 「레디메이드 DB 다 어디 갔니?」(제작기 레디메이드 DB 1행): 레디메이드 · 상태 변화의 기본 행은 fx 스크립트를 읽은 뒤에야 생기는데, 그 전에 직접 추가한 행(작살잡이) 하나만 있는 표를
    「다 지운 것」으로 잘못 읽어 기본 행 전부에 「지움」 수정 행(dbedit deleted)을 올렸다. 한 번에 이렇게 많이 지운 것은 사람이 한 일이 아니니 지움 표시를 버린다 — 다음 저장 때 공유 DB 에서도 그 문서가 지워진다 */
  SH.healed = SH.healed || {};
  for (const lk of ['rm', 'st']) {
    if (!lazyOk(lk)) continue;
    const dels = [...ED].filter(([id, d]) => d && d.kind === lk && d.deleted);
    if (dels.length >= MASS_DEL) {
      for (const [id] of dels) ED.delete(id);
      if (!SH.healed[lk]) {
        SH.healed[lk] = dels.length;
        SH.autoOk = 1;
        setTimeout(() => {
          try {
            shSchedule(1500);
          } catch (e) {}
        }, 600);
        setTimeout(() => toast(`${DBS[lk].t} DB 기본 행 ${dels.length}개에 잘못 붙은 「지움」 표시를 되돌렸습니다 (공유 DB 에도 저장)`), 400);
      }
    }
  }
  const byKind = {};
  for (const [id, d] of ED) {
    if (d && d.kind) (byKind[d.kind] = byKind[d.kind] || []).push([id, d]);
  }
  /* 10-27 망령: DB 새 판이 올라와도 고친 것을 잃지 않게.
    · 기본 DB에 이름이 없어진 수정 → 버리지 않고 SH.orph_ed 에 남긴다 (공유 DB 에서도 지우지 않음 · DB 탭에서 살리기/옮겨 붙이기/버리기)
    · 직접 추가한 행과 같은 이름이 기본 DB에 생기면 → 추가한 행이 그 자리의 기본 행을 덮는다 (줄 순서와 상관없이)
    · 기본 DB 안에 같은 이름이 둘이면 수정은 첫 줄에만 */
  SH.orph_ed = new Map();
  for (const k in DBS) {
    const eds = byKind[k] || [];
    const mods = new Map(),
      del = new Set(),
      adds = [],
      cust = [];
    const key = r => r[DBS[k].key];
    const has = new Set((DEF[k] || []).map(key));
    for (const [id, d] of eds) {
      if (d.deleted) del.add(d.key);
      else if (Array.isArray(d.row)) {
        if (d.pos >= 0 && !has.has(d.key)) adds.push(d);
        else if (has.has(d.key)) mods.set(d.key, d.row);
        else if (lazyOk(k)) SH.orph_ed.set(id, d);
      }
      if (d.custom && !d.deleted && (has.has(d.key) || d.pos >= 0)) cust.push(d.key);
    }
    const used = new Set();
    let rows = (DEF[k] || [])
      .filter(r => !del.has(key(r)))
      .map(r => {
        const kk = key(r);
        if (mods.has(kk) && !used.has(kk)) {
          used.add(kk);
          return padRow(mods.get(kk), r);
        }
        return clone(r);
      });
    adds.sort((a, b) => a.pos - b.pos);
    for (const a of adds) rows.splice(Math.min(a.pos, rows.length), 0, clone(a.row));
    S.db[k] = rows;
    S.custom[k] = cust;
  }
  Object.assign(S.db, keepNonDb);
  const m = SH.meta;
  S.db.tpl = m && m.tpl ? ((m.tplV || 0) >= TPL_V ? clone(m.tpl) : verMerge(m.tpl, TPL_DEF, tplKey)) : clone(TPL_DEF);
  S.db.tplV = TPL_V;
  S.db.tags = m && m.tags ? ((m.tagsV || 0) >= TAGS_V ? clone(m.tags) : verMerge(m.tags, TAGS_DEF, tagKey)) : clone(TAGS_DEF);
  S.db.tagsV = TAGS_V;
  S.db.ban = m && m.ban != null ? m.ban : DEF.ban;
  {
    const _sv = (m && m.stplV) || 0;
    S.db.stpl = stplMigrate(m && m.stpl ? clone(m.stpl) : null, _sv);
    S.db.stplV = STPL_V;
    if (_sv < 4 && _sv > 0) SH.purge = true;
  }
  S.db.oldSock = m && m.oldSock != null ? m.oldSock : 5.5;
  S.db.ptItems = m && m.ptItems ? clone(m.ptItems) : clone(PTI_DEF);
  S.db.ptiV = (m && m.ptiV) || 0;
  ptiMigrate(S.db);
  S.db.pride = m && m.pride ? clone(m.pride) : clone(PRIDE_DEF);
  S.db.prideExV = (m && m.prideExV) || 0;
  prideMigrate(S.db);
  S.db.tplSoloV = (m && m.tplSoloV) || 0;
  S.db.soloSock = m && m.soloSock ? clone(m.soloSock) : null;
  S.db.ilock = m && Array.isArray(m.ilock) ? clone(m.ilock) : [];
  S.db.rules = m && m.rules && typeof m.rules === 'object' ? clone(m.rules) : null;
  tplNormalize(S.db);
  for (const g in keepG) Object.assign(S.db, keepG[g]);
  SH.builtN = {};
  for (const k in DBS)
    SH.builtN[k] = (DEF[k] || []).length; /* 이 표를 기본 행 몇 줄로 지었나 — 기본 행이 나중에 생긴 표는 다시 짓기 전까지 비교하지 않는다 */
  SH.dbDirty = true;
  reindex();
}
/* base = 마지막으로 맞춘 문서, mine = 지금 내 화면의 문서, theirs = 방금 받은 남의 문서. 문서 칸과 data 안의 칸 하나하나를 비교해 내가 바꾼 칸만 내 값으로. 바꾼 칸이 없으면 null */
function shMerge(base, mine, theirs) {
  const out = clone(theirs);
  let any = false;
  const M = (o, b, m, top) => {
    b = b || {};
    m = m || {};
    for (const k of new Set([...Object.keys(m), ...Object.keys(b)])) {
      if (top && k === 'data') continue;
      if (canon(m[k]) === canon(b[k])) continue;
      any = true;
      if (m[k] === undefined) delete o[k];
      else o[k] = clone(m[k]);
    }
  };
  M(out, base, mine, true);
  out.data = out.data || {};
  M(out.data, base.data, mine.data, false);
  return any ? out : null;
}
function shApplyDoc(kind, id, d) {
  if (kind === 'trainers') {
    d ? shPutTrainer(id, d) : shDelTrainer(id);
    return 't';
  }
  if (kind === 'pokemon') {
    d ? shPutPoke(id, d) : shDelPoke(id);
    return 't';
  }
  if (kind === 'dbedit') {
    d ? SH.ed.set(id, d) : SH.ed.delete(id);
    return 'd';
  }
  if (kind === 'meta') {
    if (id === 'settings') SH.metaL = d || null;
    else if (id.startsWith('set.')) {
      SH.metaG = SH.metaG || {};
      if (d) SH.metaG[id.slice(4)] = d;
      else delete SH.metaG[id.slice(4)];
    } else return '';
    SH.meta = shMetaMerge();
    return 'd';
  }
  if (kind === 'folders') {
    if (d) {
      let f = S.folders.find(x => x.id === id);
      if (!f) {
        f = { id };
        S.folders.push(f);
      }
      f.name = String(d.name || '');
      f._ord = +d.ord || 0;
      f.priv = !!d.priv;
      if (d.rule) f.rule = String(d.rule);
      else delete f.rule;
      if (d.parent) f.parent = String(d.parent);
      else delete f.parent;
      if (d.deco && typeof d.deco === 'object') f.deco = d.deco;
      else delete f.deco;
      if (d.owner) {
        f.owner = String(d.owner);
        f.ownerName = String(d.ownerName || '');
      } else {
        delete f.owner;
        delete f.ownerName;
      }
      if (Array.isArray(d.co) && d.co.length) f.co = d.co.filter(c => c && c.h).map(c => ({ h: String(c.h), n: String(c.n || '') }));
      else delete f.co;
      if (d.dgRoot) f.dgRoot = true;
      else delete f.dgRoot;
      if (d.dgId) f.dgId = String(d.dgId);
      else delete f.dgId;
    } else {
      S.folders = S.folders.filter(x => x.id !== id);
    }
    return 't';
  }
}
/* 11-02 망령 「트레이너 문서가 1초마다 다시 써진다」: 같은 ord 가 둘 이상이면(예: 49 칼데아스 · 카구야 히메) 창마다 지금 순서대로 남아 서로 다른 ord 를 올리고, 그걸 받은 창이 또 고쳐 올리는 줄다리기가 됐다.
   ord 가 같으면 id 순 → 모든 창이 같은 순서 · 같은 ord 로 한 번 맞춘 뒤 멈춘다. 이 줄다리기 중에 옛 화면의 창이 트레이너 문서를 통째로 덮은 것이 21:18 사고 */
function ordCmp(a, b) {
  return a._ord - b._ord || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0);
}
function shAfter(paths, what) {
  if (what.t) {
    S.trainers.forEach((t, i) => {
      if (t._ord == null) t._ord = i;
    });
    S.trainers.sort(ordCmp);
    S.folders.forEach((f, i) => {
      if (f._ord == null) f._ord = i;
    });
    S.folders.sort(ordCmp);
  }
  if (what.d) shRebuildDB();
  const want = shWant();
  let reup = false;
  for (const p of paths) {
    if (SH.kept && SH.kept.has(p)) {
      /* 11-03: 내 미전송 수정을 남긴 문서 — 서버 값과 다르므로 다음 저장 때 내 값을 다시 올린다 */ SH.synced.delete(p);
      reup = true;
      continue;
    }
    if (want.has(p)) SH.synced.set(p, canon(want.get(p)));
    else SH.synced.delete(p);
  }
  if (reup) shSchedule(300);
  /* 병합한 문서는 「받은 그대로」를 올라간 값으로 적어 둔다 → 합친 결과가 다음 저장 때 올라간다 */
  if (SH.mergeBase && SH.mergeBase.size) {
    for (const [p, j] of SH.mergeBase) SH.synced.set(p, j);
    SH.mergeBase.clear();
    shSchedule(300);
  }
  try {
    lsSet(K_T, JSON.stringify({ trainers: S.trainers, folders: S.folders, ui: S.ui }));
    if (what.d) lsSet(K_DB, JSON.stringify({ db: S.db, custom: S.custom }));
  } catch (e) {}
  shRender(what);
  mkmChanged();
  if (what.t && SH.ready) {
    clearTimeout(SH.healT);
    SH.healT = setTimeout(shHeal, 4000);
  }
}
let shRT = null,
  shRW = {};
function shRender(what) {
  shRW.t = shRW.t || what.t;
  shRW.d = shRW.d || what.d;
  clearTimeout(shRT);
  shRT = setTimeout(() => {
    const w = shRW;
    shRW = {};
    if (drag) return shRender(w);
    if (S.ui.tab === 'char') {
      if (w.t || w.d) {
        const a = document.activeElement;
        const typing = a && a.matches && a.matches('input,textarea,select') && $('#v-char').contains(a);
        if (typing) {
          const t = trOf(a);
          for (const tr of S.trainers)
            if (tr !== t) {
              const el = $('#tr-' + tr.id);
              if (el) refreshTrainer(tr);
            }
          if (t) RF_PEND.add(t);
          if ($$('#trs section.folder').length !== S.trainers.filter(trVisible).length) renderChar();
        } else renderChar();
      }
    } else if (S.ui.tab === 'type') {
      if ((w.t || w.d) && !layers.length) renderType();
    } else if (w.d && !layers.length) {
      if (S.ui.tab === 'db') {
        const q = $('#dbq');
        const f = q && document.activeElement === q;
        renderDB();
        if (f) {
          const n = $('#dbq');
          n.focus();
          n.setSelectionRange(n.value.length, n.value.length);
        }
      } else if (!$('#v-tbl').contains(document.activeElement)) renderTbl();
    }
  }, 120);
}
async function shInit() {
  let db = null;
  try {
    db = window.MKM_STORE ? await MKM_STORE.connect() : null;
  } catch (e) {
    console.warn('[공유 DB]', e);
    toast('공유 DB에 연결하지 못했습니다: ' + ((e && e.message) || e));
  }
  if (!db) {
    if (window.MKM_RULEBOOK)
      try {
        MKM_RULEBOOK.attach(null);
      } catch (e) {}
    if (window.MKM_STORE && MKM_STORE.configured()) SH.failed = true;
    const el = $('#saved');
    if (el)
      el.textContent =
        window.MKM_STORE && MKM_STORE.configured()
          ? '공유 DB 연결 실패 · 이 브라우저에만 저장'
          : '이 브라우저에만 저장 (js/config.js에 공유 DB 설정 없음)';
    shDot();
    return;
  }
  SH.db = db;
  SH.on = true;
  SH.orph = new Map();
  SH.unsubs = [];
  SH.net = 'ok';
  if (db.onState)
    try {
      db.onState((st, code) => {
        SH.net = st === 'off' ? 'off' : 'ok';
        if (st === 'off') SH.netCode = code || '';
        shDot();
      });
    } catch (e) {}
  if (window.MKM_NOTES)
    try {
      MKM_NOTES.attach(db);
    } catch (e) {}
  if (window.MKM_RULEBOOK)
    try {
      MKM_RULEBOOK.attach(db, () => SH.canWrite !== false);
    } catch (e) {}
  shStatus('공유 저장소 연결 중…');
  SH.canWrite = db.canWrite !== false && !RO_EMB;
  for (const kind of SH_KINDS) {
    SH.init[kind] = false;
    SH.unsubs.push(
      db.collection(kind).onSnapshot(
        snap => {
          if (!SH.ready) {
            SH.buf[kind] = snap.docs.map(d => [d.id, d.data()]);
            SH.init[kind] = true;
            if (SH_KINDS.every(k => SH.init[k])) shStart();
            return;
          }
          const paths = [],
            what = {};
          let W = null;
          for (const ch of snap.docChanges()) {
            const id = ch.doc.id,
              p = kind + '/' + id;
            let d = ch.type === 'removed' ? null : ch.doc.data();
            if (d) {
              const dj = canon(d);
              if (SH.synced.get(p) === dj) continue;
              W = W || shWant();
              const w = W.get(p);
              if (w && canon(w) === dj) {
                SH.synced.set(p, dj);
                shTrack(p, d);
                continue;
              }
            }
            if (!d && !SH.synced.has(p)) continue;
            /* 칸 단위 3-way 병합 (점검 6-3): 아직 못 올린 내 수정이 있는 시트에 남의 저장이 오면, 내가 바꾼 칸은 내 것으로 두고 나머지 칸만 받는다. 합친 결과는 shAfter 뒤에 다시 올린다 */
            if (d && (kind === 'trainers' || kind === 'pokemon')) {
              W = W || shWant();
              const mine = W.get(p),
                bj = SH.synced.get(p);
              if (mine && bj && canon(mine) !== bj) {
                const theirs = canon(d);
                const mg = shMerge(JSON.parse(bj), mine, d);
                if (mg) {
                  d = mg;
                  (SH.mergeBase = SH.mergeBase || new Map()).set(p, theirs);
                }
              }
            }
            const w = shApplyDoc(kind, id, d ? clone(d) : null);
            if (w) what[w] = true;
            paths.push(p);
          }
          if (paths.length) shAfter(paths, what);
        },
        e => {
          shErr(e);
          if (!SH.ready && !SH.init[kind]) {
            SH.initFail = true;
            SH.buf[kind] = [];
            SH.init[kind] = true;
            if (SH_KINDS.every(k => SH.init[k])) shStart();
          }
        }
      )
    );
  }
} /* 처음 읽기에 실패한 종류가 있으면 읽기 전용으로 시작한다 — 빈 목록으로 보고 기본값을 올려 모두의 설정을 덮지 않게. 이미 읽은 종류의 실시간 오류는 받은 내용을 지우지 않는다 */
async function shStart() {
  if (SH.ready || SH.starting) return;
  SH.starting = true;
  if (SH.initFail) {
    SH.canWrite = false;
    toast('공유 DB를 다 읽지 못해 읽기 전용으로 열었습니다 · 새로고침해 주세요');
  }
  const B = SH.buf;
  const empty = SH_KINDS.every(k => !(B[k] || []).length);
  const ui = new Map();
  for (const t of S.trainers) {
    ui.set(t.id, { open: t.open });
    for (const p of t.pokemon) ui.set(p.id, { open: p.open, tab: p.tab });
  }
  if (empty) {
    const has = S.trainers.length || Object.keys(DBS).some(k => (S.custom[k] || []).length);
    let up = false;
    if (!up && has && !SH.initFail) {
      lsSet('mkm_local_before_share', JSON.stringify(backupObj()));
      saveFile('망켓몬_제작기_이_브라우저_백업.json', JSON.stringify(backupObj()));
    }
    if (!up && !SH.initFail) {
      S.trainers = SH.canWrite ? [sampleTrainer()] : [];
      S.folders = [];
      SH.ed = new Map();
      SH.meta = null;
      SH.metaL = null;
      SH.metaG = {};
      shRebuildDB();
    }
    SH.synced = new Map();
    SH.ready = true;
    SH.live = true;
    SH.dbDirty = true;
    renderAll();
    SH.autoOk = 1;
    await shFlush();
    return;
  }
  /* 지난번 공유 DB 에 못 붙어 이 브라우저에만 저장한 수정이 있으면, 공유 DB 내용으로 바꾸기 전에 백업 파일로 남긴다 (백업 불러오기 「지금 목록에 추가」로 되살린다) */
  if (lsGet('mkm_unsynced') && S.trainers.length) {
    const j = JSON.stringify(backupObj());
    lsSet('mkm_local_before_share', j);
    try {
      saveFile(`망켓몬_제작기_미전송_${impStamp()}.json`, j);
    } catch (e) {}
    toast('지난번 공유 DB에 못 올린 수정을 백업 파일로 저장했습니다');
  }
  lsSet('mkm_unsynced', '');
  S.trainers = [];
  S.folders = [];
  SH.orph = new Map();
  SH.ed = new Map();
  SH.meta = null;
  SH.metaL = null;
  SH.metaG = {};
  for (const [id, d] of B.folders || []) shApplyDoc('folders', id, clone(d));
  S.folders.sort(ordCmp);
  for (const [id, d] of B.meta || []) shApplyDoc('meta', id, d);
  for (const [id, d] of B.dbedit || []) shApplyDoc('dbedit', id, clone(d));
  for (const [id, d] of B.trainers || []) shApplyDoc('trainers', id, clone(d));
  for (const [id, d] of B.pokemon || []) shApplyDoc('pokemon', id, clone(d));
  for (const t of S.trainers) {
    const u = ui.get(t.id);
    if (u) t.open = u.open;
    for (const p of t.pokemon) {
      const v = ui.get(p.id);
      if (v) {
        p.open = v.open;
        p.tab = v.tab;
      }
    }
  }
  const paths = [];
  for (const k of SH_KINDS) for (const [id] of B[k] || []) paths.push(k + '/' + id);
  SH.synced = new Map();
  SH.ready = true;
  shAfter(paths, { t: true, d: true });
  SH.live = true;
  if (SH.purge) {
    SH.purge = false;
    SH.synced.delete('meta/set.stpl');
    const n = stplPurge();
    if (n) {
      SH.dbDirty = true;
      toast(`템플릿 『계제 포텐셜』 칸 ${n}개를 비웠습니다 (종족 포텐셜로 대체)`);
    }
  }
  renderAll();
  shStatus(SH.canWrite ? '연결됨 · 함께 수정 중' : '읽기 전용 · 보기만 가능합니다');
  shFlush();
  setTimeout(shMigrateImgs, 4000);
}
function renderAll() {
  if (S.ui.tab === 'char') renderChar();
  else refreshAll();
}

const MKROOT = () => document.getElementById('mk') || document.body;
