/* ── 조각 18_notes_link.js — 세션 노트 연동 ── */
/* ---------- 세션 노트 연동: 같은 페이지의 세션 노트가 트레이너를 바로 읽는다 ---------- */
let mkmT = null;
function mkmChanged() {
  clearTimeout(mkmT);
  mkmT = setTimeout(() => window.dispatchEvent(new CustomEvent('mkm-change')), 120);
}
/* 11-15 던전 생성 탭(js/dungen.js)이 쓰는 것 */
/* 11-16 망령 「세션 노트에 잘 정비해 둔 포켓몬 제작 UI 를 왜 내다 버리나」: 던전 야생 시트 = 제작기 트레이너 · 포켓몬 그대로 (던전 탭이 만들고, 고치기는 노트처럼 ?focus=&p=&embed=1 한 장 창) */
async function flushNow(ms) {
  const t0 = Date.now();
  ms = ms || 9000;
  let need;
  try {
    need = shDirtyPaths();
  } catch (e) {
    return false;
  }
  if (!need.length) return true;
  clearTimeout(shTimer);
  SH.pendT = false;
  let kicked = false;
  while (shDirtyPaths(need).length) {
    if (!SH.flushing) {
      shLastFlush = 0;
      shFlush();
    } else if (!kicked) SH.again = true;
    kicked = true;
    await new Promise(r => setTimeout(r, 100));
    if (Date.now() - t0 > ms) return false;
  }
  return true;
}
window.MKM_ENV = {
  db: () => SH.db,
  me: () => ME,
  toast,
  openModal,
  closeModal,
  cardPng,
  cardDc,
  openTrainerCard: t => openTrainerCard(t),
  data: () => S.db,
  prideCost: k => {
    const r = prRow(k);
    return r ? pnum(r[1], null) : null;
  },
  S: () => S,
  newTrainer,
  newPoke,
  fixP,
  save,
  uid,
  flushNow,
  closeLayer: l => {
    const i = layers.findIndex(o => o.l === l);
    if (i < 0) {
      if (l && l.remove) l.remove();
      return;
    }
    const [o] = layers.splice(i, 1);
    o.l.remove();
    if (!layers.length) document.documentElement.classList.remove('modal-on');
    o.onClose && o.onClose();
  },
  shOn: () => !!(SH.on && SH.ready),
  canWrite: () => !!(SH.on && SH.ready && SH.canWrite),
  lvOf: (t, p) => {
    try {
      return lv(t, p);
    } catch (e) {
      return null;
    }
  },
  prideOf: p => {
    try {
      return prideOf(p);
    } catch (e) {
      return p.pride || '';
    }
  }
};
window.MKM = {
  bundle: () => sessionBundle(S.trainers),
  open(id) {
    const t = S.trainers.find(x => x.id === id);
    if (!t) return false;
    if (S.ui.tab !== 'char') showTab('char');
    t.open = true;
    save();
    renderChar();
    const el = document.getElementById('tr-' + id);
    if (el) {
      const r = MKROOT(),
        hd = r.querySelector('.top');
      r.scrollTo({
        top: Math.max(0, el.getBoundingClientRect().top - r.getBoundingClientRect().top + r.scrollTop - (hd ? hd.offsetHeight : 0) - 10)
      });
      el.classList.add('flash');
      setTimeout(() => el.classList.remove('flash'), 1600);
    }
    return true;
  }
};

/* ---------- 세션 노트에서 고치기 (10-29 망령 「포켓몬 고치기는 제작기 기능 참고」) ----------
   ?focus=<트레이너 id>&p=<포켓몬 id>&embed=1 — 노트가 iframe 으로 연다. 그 트레이너 한 명만 펼쳐 보여 주고(위 막대 · 다른 트레이너 숨김), 포켓몬을 펼쳐 그 자리로 간다.
   노트가 닫기 전에 {mkm:'flush'} 를 보내면 공유 DB 에 다 올린 뒤 {mkm:'flushed', ok} 로 답한다 */
const EMB = (() => {
  try {
    const q = new URLSearchParams(location.search);
    const t = q.get('focus') || '';
    const p = q.get('p') || '';
    const add = q.get('add') || '',
      nu = q.get('new') || '';
    return {
      t,
      p,
      sec: q.get('sec') || '',
      embed: q.get('embed') === '1',
      one: (!!p || !!add) && q.get('all') !== '1',
      done: false,
      add: t && /^(pl|aw)$/.test(add) ? add : '',
      nu: /^(misag|misagnpc)$/.test(nu) ? nu : '',
      made: false
    };
  } catch (e) {
    return { t: '' };
  }
})();
if (EMB.embed) {
  document.documentElement.classList.add('mk-emb');
  const st = document.createElement('style');
  st.textContent =
    'html.mk-emb header.top{display:none!important}html.mk-emb main{padding-top:10px!important}html.mk-emb .favrail,html.mk-emb #verbar,html.mk-emb #tabs{display:none!important}html.mk-emb .embtrs>.folder{margin-top:0}.embone{border:0!important;background:none!important;box-shadow:none!important;padding:0!important}.embhd{display:flex;align-items:center;gap:10px;flex-wrap:wrap;margin:0 0 10px;padding:8px 10px;border:1px solid var(--line,#444);border-radius:8px;background:var(--panel,transparent)}.embhd>b{font-size:15px}.embone .plist{margin:0}.embone .pk>.ph .caret{display:none}';
  document.head.appendChild(st);
}
/* 10-30 망령 「미사그에서 아예 제작할 수 있도록 트레이너 추가, 포켓몬/각성체 추가」: 노트가 iframe 으로 연다.
   ?new=misag&embed=1 = 미사그 캠퍼스 폴더에 새 트레이너를 만들어 펼친다. ?focus=<트레이너>&add=pl|aw&embed=1 = 그 트레이너에 PL 포켓몬 · 각성체 시트를 하나 더해 그 한 장만 연다.
   공유 DB 를 다 읽은 뒤 한 번만 만든다(그 전에 만들면 공유 DB 내용으로 바뀌며 사라진다). 만든 것은 부모(노트)에 {mkm:'made', kind, id, tid} 로 알린다 */
const embReady = () => !((SH.on || (window.MKM_STORE && MKM_STORE.configured() && !SH.failed)) && !SH.ready);
function embMake() {
  if (EMB.made || !(EMB.nu || EMB.add)) return '';
  if (!embReady()) return '공유 DB 에서 불러오는 중…';
  if (SH.on && SH.canWrite === false) return '읽기 전용으로 열려 있어 만들 수 없습니다 (서명 · 공유 DB 연결을 확인하세요)';
  const tell = o => {
    try {
      if (window.parent !== window) window.parent.postMessage(Object.assign({ mkm: 'made' }, o), '*');
    } catch (_) {}
  };
  if (EMB.nu) {
    EMB.made = true;
    const NPC = EMB.nu === 'misagnpc' && S.folders.some(f => f.id === MISAG_NPC_FID);
    const t = newTrainer();
    t.name = NPC ? '새 NPC' : '새 학생';
    t.open = true;
    t.folder = NPC ? MISAG_NPC_FID : MISAG_FID;
    t.misag = true;
    t.misagF = true;
    t.solo = false;
    for (const [n, d] of ptItems()) t.base[n] = +d || 0;
    applyTpl(t);
    if (NPC) {
      t.kind = 'npc';
      t.npcF = true;
      if (ME.gm && ME.hash) {
        t.priv = true;
        t.owner = ME.hash;
        t.ownerName = ME.name;
        t.npcP = true;
      }
    } /* 10-30: 노트 「＋ 새 NPC」 = 캠퍼스 / NPC 폴더에 비공개 NPC */
    S.trainers.push(t);
    save();
    EMB.t = t.id;
    EMB.p = '';
    EMB.one = false;
    tell({ kind: 'trainer', id: t.id, name: t.name });
    return '';
  }
  const T = S.trainers.find(x => x.id === EMB.t);
  if (!T) return '';
  EMB.made = true;
  const p = newPoke();
  applySheetTpl(T, p);
  if (EMB.add === 'aw') {
    p.awaken = T.pokemon.some(x => x.awaken === 'free') ? 'c' : 'free';
    awClassSync(T, p);
  }
  T.open = true;
  T.pokemon.push(p);
  save();
  EMB.p = p.id;
  EMB.one = true;
  tell({ kind: 'poke', id: p.id, tid: T.id, aw: p.awaken || '' });
  return '';
}
/* 11-09 망령 「노트 카드에서 그 칸을 누르면 바로 그 칸을 고치게」: 노트가 ?sec= 로 보낸다 (포켓몬 한 장 embed)
   head = 이름 · 레벨 · 프라이드 · 타입 · 알그룹 · stat = 능력치 · ab = 특성(고르는 창까지) · item = 소지품 · ex.<excl|x0…> = 전용(편집 창까지) · pot.<n> = 포텐셜(편집 창까지) · mv.<n> = 기술 */
const EMB_SECT = { head: 'base', stat: 'base', ab: 'base', item: 'base', ex: 'pots', pot: 'pots', mv: 'moves' };
function embSec() {
  const m = /^(head|stat|ab|item|ex|pot|mv)(?:\.([\w-]+))?$/.exec(EMB.sec || '');
  return m ? { k: m[1], a: m[2] || '' } : null;
}
function embGoSec(p, es) {
  const pk = document.getElementById('pk-' + p.id);
  if (!pk || !es) return;
  const q = s => {
    try {
      return pk.querySelector(s);
    } catch (e) {
      return null;
    }
  };
  let el = null,
    go = null;
  if (es.k === 'head') {
    const n = q('#nm-' + CSS.escape(p.id));
    el = n && n.closest('.fgrid');
  } else if (es.k === 'stat') {
    const s = q('.stwrap');
    el = s && (s.closest('.panel') || s);
  } else if (es.k === 'ab') {
    el = q('[data-act="pickAbil"]');
    go = el;
  } else if (es.k === 'item') el = q('[data-act="pickItem"]');
  else if (es.k === 'ex' || es.k === 'pot') {
    el = q(`[data-act="editPot"][data-k="${CSS.escape(es.a)}"]`);
    go = el;
  } else if (es.k === 'mv') el = q(`.mv[data-si="${CSS.escape(es.a)}"]`);
  el = el || pk;
  try {
    el.scrollIntoView({ block: 'center' });
  } catch (e) {}
  el.classList.add('flash');
  setTimeout(() => el.classList.remove('flash'), 1600);
  if (go && !RO_EMB) setTimeout(() => go.click(), 250);
}
function embRender(root) {
  const wait = embMake();
  if (wait) {
    root.innerHTML = `<div class="empty">${esc(wait)}</div>`;
    return true;
  }
  const ti = S.trainers.findIndex(x => x.id === EMB.t);
  if (ti < 0) {
    root.innerHTML = `<div class="empty">${SH.on && !SH.ready ? '공유 DB 에서 트레이너를 불러오는 중…' : '이 트레이너를 찾지 못했습니다 (비공개라면 「서명」을 확인하세요)'}</div>`;
    return true;
  }
  const t = S.trainers[ti];
  if (!EMB.done) {
    t.open = true;
    const p = EMB.p && t.pokemon.find(x => x.id === EMB.p);
    if (p) {
      p.open = true;
      if (!p.tab) p.tab = 'base';
      const es = embSec();
      if (es) p.tab = EMB_SECT[es.k];
    }
  }
  root.innerHTML = `<div id="trs" class="embtrs">${trainerHTML(t, ti)}</div>`;
  fitFlist(root);
  if (
    !EMB.done &&
    !((EMB.sec === 'pcard' || EMB.sec === 'tcard') && SH.on && !SH.ready) &&
    !(embSec() && EMB.p && !t.pokemon.some(x => x.id === EMB.p))
  ) {
    EMB.done = true;
    if (EMB.sec === 'tcard') {
      /* 11-17 세션 노트 「▤ 한 장 요약」(트레이너) */ setTimeout(() => openTrainerCard(t), 150);
    } else if (EMB.sec === 'pcard') {
      const pp = EMB.p && t.pokemon.find(x => x.id === EMB.p);
      if (pp) setTimeout(() => openPokeCard(t, pp), 150);
    } else if (embSec() && EMB.p) {
      const pp = t.pokemon.find(x => x.id === EMB.p);
      if (pp) setTimeout(() => embGoSec(pp, embSec()), 150);
    } else if (!EMB.one)
      setTimeout(() => {
        const el =
          (EMB.sec && document.querySelector('#tr-' + t.id + ' .' + EMB.sec.replace(/[^a-z]/g, ''))) ||
          document.getElementById(EMB.p ? 'pk-' + EMB.p : 'tr-' + t.id);
        if (el && EMB.sec) {
          el.classList.add('flash');
          setTimeout(() => el.classList.remove('flash'), 1600);
        }
        if (el) {
          const hd = document.querySelector('header.top');
          const off = EMB.embed || !hd ? 0 : hd.offsetHeight;
          window.scrollTo({ top: Math.max(0, el.getBoundingClientRect().top + window.scrollY - off - 8) });
        }
      }, 120);
  }
  return true;
}
/* 10-30 망령 「포켓몬 고치기를 누르면 제작기가 이상하게 떠 — 그 포켓몬 고치는 칸만 나오면 될 거 아니야」:
   ?p= 가 있으면 그 포켓몬 시트 한 장만 (위에 트레이너 이름 · 통솔점 · PT 기술점 한 줄). 「트레이너 전체 보기」로 예전처럼 */
function embOneHTML(t, ti) {
  const pi = t.pokemon.findIndex(x => x.id === EMB.p);
  const p = t.pokemon[pi];
  p.open = true;
  if (!p.tab) p.tab = 'base';
  return `<section class="folder open embone" id="tr-${t.id}" data-ti="${ti}" data-si="${ti}"><div class="embhd"><b>${esc(t.name || '')}</b><span class="small muted">${tMetaHTML(t)}</span><span class="sp" style="flex:1"></span><button type="button" class="btn sm ghost" data-emball title="이 트레이너의 다른 포켓몬 · 자질 · 포인트까지 펼쳐 봐요">트레이너 전체 보기</button></div><div class="plist">${pokeHTML(t, ti, p, pi)}</div></section>`;
}
document.addEventListener('click', e => {
  if (e.target.closest && e.target.closest('[data-emball]')) {
    e.preventDefault();
    EMB.one = false;
    renderChar();
    setTimeout(() => {
      const el = document.getElementById('pk-' + EMB.p);
      if (el) window.scrollTo({ top: Math.max(0, el.getBoundingClientRect().top + window.scrollY - 8) });
    }, 60);
  }
});
/* 아직 안 올라간 문서 경로 목록 (only 를 주면 그 경로만 본다) */
function shDirtyPaths(only) {
  const out = [];
  if (!SH.on || !SH.ready || !SH.canWrite) return out;
  try {
    const W = shWant();
    if (only) {
      for (const p of only) {
        const b = W.get(p);
        const j = b ? canon(b) : null;
        if (j == null ? SH.synced.has(p) : SH.synced.get(p) !== j && !(SH.bad && SH.bad.get(p) === j)) out.push(p);
      }
      return out;
    }
    for (const [p, b] of W) {
      const j = canon(b);
      if (SH.synced.get(p) !== j && !(SH.bad && SH.bad.get(p) === j)) out.push(p);
    }
    for (const p of SH.synced.keys()) if (!W.has(p)) out.push(p);
  } catch (_) {}
  return out;
}
function shDirty() {
  if (!SH.on || !SH.ready || !SH.canWrite) return false;
  if (SH.flushing) return true;
  return shDirtyPaths().length > 0;
}
/* 11-03 저녁: 올릴 게 없으면 바로 답하고, 있으면 「지금 안 올라간 것」만 올라갈 때까지 기다린다 (다른 올리기 · fresh 재동기화가 돌고 있어도 응답을 막지 않게) */
window.addEventListener('message', async e => {
  const d = e.data;
  if (!d || d.mkm !== 'flush' || e.source !== window.parent) return;
  if (RO_EMB) {
    try {
      e.source.postMessage({ mkm: 'flushed', ok: true, ro: true }, '*');
    } catch (_) {}
    return;
  }
  const t0 = Date.now();
  let ok = true;
  try {
    const need = shDirtyPaths();
    if (need.length) {
      clearTimeout(shTimer);
      SH.pendT = false;
      let kicked = false;
      while (shDirtyPaths(need).length) {
        if (!SH.flushing) {
          shLastFlush = 0;
          shFlush();
        } else if (!kicked) {
          SH.again = true;
        }
        kicked = true;
        await new Promise(r => setTimeout(r, 100));
        if (Date.now() - t0 > 9000) {
          ok = false;
          break;
        }
      }
    }
  } catch (x) {
    ok = false;
  }
  try {
    e.source.postMessage({ mkm: 'flushed', ok, ro: SH.on && SH.ready && !SH.canWrite }, '*');
  } catch (_) {}
});
