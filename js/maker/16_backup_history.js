/* ── 조각 16_backup_history.js — 백업 · 엑셀 · 변경 이력 ── */
/* ---------- 백업 · 엑셀 ---------- */
function customDB() {
  const o = {};
  for (const k in DBS) o[k] = S.db[k].filter(r => S.custom[k].includes(r[DBS[k].key]));
  return o;
}
function backupObj() {
  return {
    app: 'mangketmon-maker',
    v: 3,
    saved: new Date().toISOString(),
    trainers: S.trainers,
    folders: S.folders.map(folderOut),
    custom: S.custom,
    customRows: customDB(),
    dbEdits: [...dbEditDocs().values()],
    ban: S.db.ban ?? '',
    tpl: S.db.tpl,
    tplV: S.db.tplV || 0,
    tags: S.db.tags,
    tagsV: S.db.tagsV || 0,
    stpl: S.db.stpl,
    stplV: S.db.stplV || 0,
    oldSock: S.db.oldSock,
    ptItems: S.db.ptItems,
    ptiV: S.db.ptiV || 0,
    pride: S.db.pride,
    prideExV: S.db.prideExV || 0,
    ilock: S.db.ilock || [],
    soloSock: S.db.soloSock || clone(SOLO_SOCK_DEF),
    tplSoloV: S.db.tplSoloV || 0,
    rules: RULES()
  };
}
const folderOut = f => {
  const o = { id: f.id, name: f.name || '' };
  if (f.parent) o.parent = f.parent;
  if (f.deco && typeof f.deco === 'object' && Object.keys(f.deco).length) o.deco = clone(f.deco);
  if (f.priv) o.priv = true;
  if (f.rule) o.rule = f.rule;
  if (f.owner) {
    o.owner = f.owner;
    o.ownerName = f.ownerName || '';
  }
  if (Array.isArray(f.co) && f.co.length) o.co = clone(f.co);
  return o;
};
/* dbEdits: 원본 DB와 다른 행(수정·추가·삭제). 덮어쓰기는 원본에서 다시 짓고, 추가는 지금 DB 위에 얹는다 */
/* 11-06 감우: 기본 DB 에 칸이 새로 생겼을 때(특성 「구분」 · 「비고」) 예전에 고친 행(칸이 모자람)이 그 칸을 빈칸으로 덮지 않게 — 모자란 끝 칸만 기본 행에서 채운다 */
const padRow = (row, base) => {
  const r = clone(row);
  if (Array.isArray(base)) for (let j = r.length; j < base.length; j++) r[j] = base[j];
  return r;
};
function applyDbEdits(edits, fromDefault) {
  for (const k in DBS) {
    const eds = edits.filter(d => d && d.kind === k);
    if (!eds.length && !fromDefault) continue;
    const K = DBS[k].key;
    let rows = fromDefault ? clone(DEF[k] || []) : S.db[k];
    const cust = new Set(fromDefault ? [] : S.custom[k] || []);
    for (const d of eds) {
      const i = rows.findIndex(r => r[K] === d.key);
      if (d.deleted) {
        if (i >= 0) rows.splice(i, 1);
        cust.delete(d.key);
        continue;
      }
      if (!Array.isArray(d.row)) continue;
      if (i >= 0) rows[i] = padRow(d.row, rows[i]);
      else rows.splice(d.pos >= 0 ? Math.min(d.pos, rows.length) : 0, 0, clone(d.row));
      if (d.custom) cust.add(d.key);
    }
    S.db[k] = rows;
    S.custom[k] = [...cust];
  }
}
const freshIds = list =>
  list.map(t => {
    t.id = uid();
    (t.pokemon || []).forEach(p => {
      p.id = uid();
    });
    return t;
  });
function restore(o, mode) {
  if (!o || o.app !== 'mangketmon-maker') {
    if (o && o.db && o.trainers) {
      const tr = (o.trainers || []).map(fixT);
      if (mode === 'add') {
        S.trainers = S.trainers.concat(freshIds(tr));
      } else {
        S.db = o.db;
        for (const k in DEF) if (!S.db[k]) S.db[k] = clone(DEF[k]);
        if (!S.db.tags) S.db.tags = clone(TAGS_DEF);
        if (!S.db.tpl) S.db.tpl = clone(TPL_DEF);
        S.trainers = tr;
      }
    } else throw new Error('형식');
  } else {
    if (Array.isArray(o.dbEdits)) applyDbEdits(o.dbEdits, mode !== 'add');
    if (o.ban != null && mode !== 'add') S.db.ban = o.ban;
    for (const k in DBS) {
      for (const r of (o.customRows && o.customRows[k]) || []) {
        const key = r[DBS[k].key];
        const i = S.db[k].findIndex(x => x[DBS[k].key] === key);
        if (i >= 0) S.db[k][i] = r;
        else S.db[k].unshift(r);
        if (!S.custom[k].includes(key)) S.custom[k].push(key);
      }
    }
    if (o.tpl) {
      S.db.tpl = o.tpl;
      if (o.tplSoloV != null) S.db.tplSoloV = +o.tplSoloV || 0;
    }
    if (o.soloSock && typeof o.soloSock === 'object') S.db.soloSock = o.soloSock;
    if (o.rules && typeof o.rules === 'object') S.db.rules = o.rules;
    if (o.tags) S.db.tags = o.tags;
    if (o.stpl) {
      S.db.stpl = stplMigrate(o.stpl, o.stplV);
      S.db.stplV = STPL_V;
    }
    if (o.oldSock != null) S.db.oldSock = o.oldSock;
    if (o.ptItems) S.db.ptItems = o.ptItems;
    if (o.pride) {
      S.db.pride = o.pride;
      S.db.prideExV = o.prideExV || 0;
      prideMigrate(S.db);
    }
    if (Array.isArray(o.ilock)) S.db.ilock = o.ilock;
    if (Array.isArray(o.folders)) {
      const fs = o.folders
        .filter(f => f && f.id)
        .map(f =>
          folderOut({
            id: String(f.id),
            name: String(f.name || ''),
            parent: f.parent ? String(f.parent) : '',
            deco: f.deco && typeof f.deco === 'object' ? f.deco : null,
            priv: !!f.priv,
            owner: f.owner ? String(f.owner) : '',
            ownerName: String(f.ownerName || ''),
            co: Array.isArray(f.co) ? f.co.filter(c => c && c.h).map(c => ({ h: String(c.h), n: String(c.n || '') })) : []
          })
        );
      if (mode === 'add') {
        for (const f of fs) if (!S.folders.some(x => x.id === f.id)) S.folders.push(f);
      } else S.folders = fs;
    }
    tplNormalize(S.db);
    const tr = (o.trainers || []).map(fixT);
    S.trainers = mode === 'add' ? S.trainers.concat(freshIds(tr)) : tr;
  }
  S.trainers.forEach(fixT);
  dedupeIds();
  reindex();
  save(true);
  refreshAll();
}
/* 백업 불러오기: 바뀌는 내용 미리보기 · 「지금 목록에 추가」가 빨간 기본 버튼 · 덮어쓰기는 두 번 눌러야 함 · 불러오기 전 지금 데이터 자동 백업 */
function impStamp() {
  const d = new Date(),
    p = n => String(n).padStart(2, '0');
  return `${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}_${p(d.getHours())}${p(d.getMinutes())}${p(d.getSeconds())}`;
}
async function impAutoBackup() {
  const j = JSON.stringify(backupObj());
  try {
    localStorage.setItem('mkm_auto_backup_before_import', j);
  } catch (e) {}
  await saveFile(`망켓몬_제작기_자동백업_${impStamp()}.json`, j);
}
function impDiff(o) {
  const ft = o && Array.isArray(o.trainers) ? o.trainers : [],
    cur = S.trainers;
  const pk = l => l.reduce((n, t) => n + ((t && t.pokemon) || []).length, 0);
  const trl = l =>
    l.length
      ? '<ul class="impl">' +
        l
          .map(t => `<li>${esc((t && t.name) || '(이름 없음)')} <span class="muted small">· 포켓몬 ${((t && t.pokemon) || []).length}</span></li>`)
          .join('') +
        '</ul>'
      : '<div class="muted small">없음</div>';
  const fe = o && Array.isArray(o.dbEdits) ? o.dbEdits.filter(d => d && DBS[d.kind]) : [];
  const fk = new Set(fe.map(d => d.kind + '|' + d.key));
  const edl = (d, base) => {
    const K = DBS[d.kind].key,
      has = (base[d.kind] || []).some(r => r[K] === d.key);
    return `<li>${esc(DBS[d.kind].t)} 「${esc(d.key)}」 <b>${d.deleted ? '삭제' : has ? '수정' : '추가'}</b></li>`;
  };
  const cr = [];
  if (o && o.customRows)
    for (const k in DBS) for (const r of o.customRows[k] || []) cr.push(`<li>${esc(DBS[k].t)} 「${esc(r[DBS[k].key])}」 <b>직접 추가한 줄</b></li>`);
  const SETN = {
    tpl: '랭크별 기초 템플릿',
    tags: '포텐셜 태그 사전',
    stpl: '포켓몬 시트 템플릿',
    oldSock: '『올드 타입』 PT 기술점',
    soloSock: '1인 기준 (2체) PT 기술점',
    ptItems: '트레이너 포인트 항목',
    pride: '프라이드 규칙',
    ilock: '소지품 해금 표',
    rules: '룰 상수 (자질 투자 · 포텐셜 개수 · 상성표)'
  };
  const sets = Object.keys(SETN)
    .filter(k => o && o[k] != null)
    .map(k => SETN[k]);
  const lost = [...dbEditDocs().values()].filter(d => !fk.has(d.kind + '|' + d.key) && DBS[d.kind]);
  const DEFB = {};
  for (const k in DBS) DEFB[k] = DEF[k] || [];
  const det = (title, n, body, open) => `<details class="impd"${open ? ' open' : ''}><summary>${title} <b>${n}</b></summary>${body}</details>`;
  const ul = a => (a.length ? '<ul class="impl">' + a.join('') + '</ul>' : '<div class="muted small">없음</div>');
  const add =
    det('추가되는 트레이너', ft.length + '명', trl(ft), true) +
    det('바뀌는 DB 줄', fe.length + cr.length + '줄', ul(fe.map(d => edl(d, S.db)).concat(cr)), fe.length + cr.length <= 30) +
    (sets.length ? det('파일 값으로 바뀌는 설정', sets.length + '종', ul(sets.map(s => `<li>${esc(s)}</li>`)), false) : '') +
    '<div class="small" style="margin-top:4px">지워지는 트레이너 <b>없음</b></div>';
  const rep =
    det('<span class="impbad">지워지는 지금 트레이너</span>', cur.length + '명', trl(cur), true) +
    det('새로 들어오는 트레이너', ft.length + '명', trl(ft), false) +
    det(
      '<span class="impbad">사라지는 지금 DB 수정</span>',
      lost.length + '줄',
      ul(lost.map(d => `<li>${esc(DBS[d.kind].t)} 「${esc(d.key)}」</li>`)),
      false
    ) +
    det('파일에서 들어오는 DB 줄', fe.length + cr.length + '줄', ul(fe.map(d => edl(d, DEFB)).concat(cr)), false);
  return { ft: ft.length, fp: pk(ft), cur: cur.length, cp: pk(cur), add, rep };
}
function chooseMode(o) {
  return new Promise(res => {
    const D = impDiff(o);
    let armed = false;
    const l = openModal(
      `<div class="mhead"><h2>백업 불러오기</h2></div><div class="mbody">
<p style="margin:0 0 8px">파일: 트레이너 <b>${D.ft}</b>명 · 포켓몬 <b>${D.fp}</b>마리${o && o.saved ? ` <span class="muted small">(${esc(String(o.saved).replace('T', ' ').slice(0, 16))} 저장)</span>` : ''}<br>지금: 트레이너 <b>${D.cur}</b>명 · 포켓몬 <b>${D.cp}</b>마리</p>
<div class="impbox"><div class="imph">「지금 목록에 추가」를 누르면</div>${D.add}</div>
<div class="impbox"><div class="imph impbad">「전체 덮어쓰기」를 누르면</div>${D.rep}</div>
<p class="small muted" style="margin:8px 0 0">어느 쪽을 눌러도, 불러오기 전에 지금 데이터를 「망켓몬_제작기_자동백업_날짜.json」 파일로 먼저 저장합니다.</p></div>
<div class="mfoot"><button class="btn" data-m="">취소</button><span class="sp"></span><button class="btn" data-m="replace">전체 덮어쓰기</button><button class="btn impadd" data-m="add" autofocus>지금 목록에 추가</button></div>`,
      { wide: true, onClose: () => res('') }
    );
    l.addEventListener('click', e => {
      const b = e.target.closest('[data-m]');
      if (!b) return;
      const m = b.dataset.m;
      if (m === 'replace' && !armed) {
        armed = true;
        b.classList.add('impbadbtn');
        b.textContent = D.cur ? `정말 덮어쓰기? (지금 트레이너 ${D.cur}명 삭제)` : '정말 덮어쓰기?';
        return;
      }
      layers[layers.length - 1].onClose = null;
      closeModal();
      res(m);
    });
  });
}
document.addEventListener('click', e => {
  const b = e.target.closest('[data-act="bakOut"],[data-act="xlsxOut"],[data-act="deleted"]');
  if (!b) return;
  b.dataset.act === 'bakOut'
    ? saveFile('망켓몬_제작기_백업.json', JSON.stringify(backupObj()))
    : b.dataset.act === 'deleted'
      ? openDeleted()
      : exportXlsx();
});
/* ---------- 11-03 변경 이력 · 최근 지운 것 (supabase/patch_2026-11-03_제작기.sql 의 보안 정의자 RPC) ---------- */
const RPC_HINT = '공유 DB 에 패치 SQL(supabase/patch_2026-11-03_제작기.sql)을 실행해야 쓸 수 있는 기능입니다';
async function shRpc(name, args) {
  if (!SH.on || !SH.db || !SH.db.rpc) throw Object.assign(new Error('공유 DB 에 연결되어 있지 않습니다'), { code: 'no_share' });
  return await SH.db.rpc(name, args);
}
const rpcMsg = e =>
  e && e.code === 'no_rpc'
    ? RPC_HINT
    : e && e.code === 'no_share'
      ? '공유 DB 에 연결되어 있지 않습니다'
      : '불러오지 못했습니다: ' + ((e && e.message) || e);
const fmtAt = t => {
  const d = new Date(t);
  return isNaN(d) ? String(t || '') : d.toLocaleString('ko-KR', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' });
};
const OP_KO = { UPDATE: '고침', DELETE: '삭제', SNAPSHOT: '되돌리기 전' };
function histSummary(kind, doc) {
  const d = (doc && doc.data) || {};
  try {
    if (kind === 'trainers')
      return `${d.name || '이름 없음'} · 포켓몬 ${(d.pids || []).length}체${
        d.ranks
          ? ` · ${Object.entries(d.ranks)
              .filter(([, v]) => v)
              .map(([k, v]) => k[0] + v)
              .join(' ')}`
          : ''
      }`;
    if (kind === 'pokemon') {
      const b = (d.base || []).map(v => +v || 0);
      return `${d.name || '이름 없음'} · 종족치 합 ${b.reduce((a, v) => a + v, 0)} · 기술 ${(d.moves || []).filter(m => m && m.name).length} · 포텐셜 ${(d.pots || []).filter(x => x && x !== '-').length}${d.ability ? ' · ' + d.ability : ''}${d.item ? ' · ' + d.item : ''}`;
    }
    if (kind === 'folders') return `${doc.name || '이름 없는 폴더'}`;
  } catch (e) {}
  return '';
}
async function openHistory(kind, id, label) {
  const path = kind + '/' + id;
  toast('이력을 불러오는 중…');
  let L;
  try {
    L = await shRpc('mk_history', { doc_path: path, lim: 40 });
  } catch (e) {
    toast(rpcMsg(e));
    return;
  }
  L = Array.isArray(L) ? L : [];
  const cur = shWant().get(path);
  const l = openModal(
    `<div class="mhead"><h2>이력 — ${esc(label)}</h2><span class="small muted">${L.length}판 · 30일 보관 · 5분 안에 거듭 고친 것은 한 판으로 남습니다</span><span class="sp"></span><button class="btn ghost" data-x>닫기</button></div>
 <div class="mbody">${cur ? `<div class="hrow now"><b>지금</b><span class="small muted">${esc(histSummary(kind, cur))}</span></div>` : ''}${L.length ? L.map(h => `<div class="hrow"><span class="small"><b>${esc(fmtAt(h.at))}</b> <span class="muted">${esc(OP_KO[h.op] || h.op)}</span></span><span class="small muted" style="flex:1;min-width:0">${esc(histSummary(kind, h.data))}</span><button type="button" class="btn xs" data-hid="${esc(h.hid)}">이 판으로 되돌리기</button></div>`).join('') : '<div class="empty">남은 옛 판이 없습니다</div>'}</div>`,
    { wide: true }
  );
  l.addEventListener('click', async e => {
    if (e.target.closest('[data-x]')) return closeModal();
    const b = e.target.closest('[data-hid]');
    if (!b) return;
    const h = L.find(x => String(x.hid) === b.dataset.hid);
    if (!h || !h.data) return;
    if (!SH.canWrite) return toast('읽기 전용이라 되돌릴 수 없습니다');
    if (!(await ask(`${esc(fmtAt(h.at))} 판으로 되돌릴까요?<br><span class="small muted">지금 값은 이력에 먼저 남깁니다</span>`, '되돌리기', false)))
      return;
    try {
      await shRpc('mk_snapshot', { doc_path: path });
    } catch (e) {
      console.warn('[이력] 스냅샷 실패', e);
    }
    histRestore(kind, id, h.data);
    closeAllModals();
    toast('되돌렸습니다 — 곧 공유 DB 에 저장됩니다');
  });
}
/* 옛 판 · 지운 문서를 지금 화면에 적용 (받은 문서와 같은 길로 → 다음 저장 때 shWant 가 올린다) */
function histRestore(kind, id, doc) {
  const d = clone(doc);
  if (kind === 'trainers') {
    shPutTrainer(id, d);
    const t = S.trainers.find(x => x.id === id);
    if (t) t.open = true;
  } else if (kind === 'pokemon') {
    shPutPoke(id, d);
    for (const t of S.trainers) {
      const p = t.pokemon.find(x => x.id === id);
      if (p) {
        p.open = true;
        t.open = true;
      }
    }
  } else if (kind === 'folders') shApplyDoc('folders', id, d);
  SH.synced.delete(kind + '/' + id);
  save();
  renderChar();
}
async function openDeleted() {
  if (!SH.on) return toast('공유 DB 에 연결되어 있지 않습니다');
  toast('최근 지운 것을 불러오는 중…');
  let T, P, F;
  try {
    [T, P, F] = await Promise.all([
      shRpc('mk_deleted', { doc_kind: 'trainers' }),
      shRpc('mk_deleted', { doc_kind: 'pokemon' }),
      shRpc('mk_deleted', { doc_kind: 'folders' })
    ]);
  } catch (e) {
    toast(rpcMsg(e));
    return;
  }
  T = Array.isArray(T) ? T : [];
  P = Array.isArray(P) ? P : [];
  F = Array.isArray(F) ? F : [];
  const pById = new Map(P.map(x => [x.id, x]));
  const tname = tid => {
    const t = S.trainers.find(x => x.id === tid);
    if (t) return t.name || '이름 없음';
    const d = T.find(x => x.id === tid);
    return d ? `${(d.data && d.data.data && d.data.data.name) || '이름 없음'} (지워짐)` : '(트레이너 없음)';
  };
  const row = (kind, x, extra) =>
    `<div class="hrow"><span class="small"><b>${esc(fmtAt(x.at))}</b></span><span class="small" style="flex:1;min-width:0"><b>${esc(histSummary(kind, x.data).split(' · ')[0])}</b> <span class="muted">${esc(histSummary(kind, x.data).split(' · ').slice(1).join(' · '))}${extra ? ' · ' + esc(extra) : ''}</span></span><button type="button" class="btn xs" data-rs="${kind}" data-id="${esc(x.id)}">되살리기</button></div>`;
  const l = openModal(
    `<div class="mhead"><h2>최근 지운 것</h2><span class="small muted">30일 안에 지운 문서 · 트레이너 ${T.length} · 포켓몬 ${P.length} · 폴더 ${F.length}</span><span class="sp"></span><button class="btn ghost" data-x>닫기</button></div>
 <div class="mbody">${T.length ? `<h3 class="small" style="margin:0 0 4px">트레이너 <span class="muted">(같이 지운 포켓몬도 함께 되살린다)</span></h3>${T.map(x => row('trainers', x, `지운 포켓몬 ${((x.data && x.data.data && x.data.data.pids) || []).filter(id => pById.has(id)).length}체 함께`)).join('')}` : ''}
 ${P.length ? `<h3 class="small" style="margin:10px 0 4px">포켓몬</h3>${P.map(x => row('pokemon', x, '→ ' + tname(x.data && x.data.tid))).join('')}` : ''}
 ${F.length ? `<h3 class="small" style="margin:10px 0 4px">폴더</h3>${F.map(x => row('folders', x)).join('')}` : ''}
 ${T.length || P.length || F.length ? '' : '<div class="empty">최근 30일 안에 지운 것이 없습니다</div>'}</div>`,
    { wide: true }
  );
  l.addEventListener('click', async e => {
    if (e.target.closest('[data-x]')) return closeModal();
    const b = e.target.closest('[data-rs]');
    if (!b) return;
    if (!SH.canWrite) return toast('읽기 전용이라 되살릴 수 없습니다');
    const kind = b.dataset.rs,
      id = b.dataset.id;
    const L = kind === 'trainers' ? T : kind === 'pokemon' ? P : F;
    const x = L.find(y => y.id === id);
    if (!x || !x.data) return;
    if (kind === 'trainers') {
      const d = clone(x.data);
      const pids = (d.data && d.data.pids) || [];
      histRestore('trainers', id, d);
      let n = 0;
      for (const pid of pids) {
        const pd = pById.get(pid);
        if (pd && pd.data && !S.trainers.some(t => t.pokemon.some(p => p.id === pid))) {
          histRestore('pokemon', pid, pd.data);
          n++;
        }
      }
      toast(`트레이너를 되살렸습니다${n ? ` · 포켓몬 ${n}체 함께` : ''}`);
    } else if (kind === 'pokemon') {
      const d = clone(x.data);
      if (!S.trainers.some(t => t.id === d.tid)) {
        const to = await askTrainerPick('되살릴 포켓몬을 넣을 트레이너');
        if (!to) return;
        d.tid = to;
      }
      histRestore('pokemon', id, d);
      toast('포켓몬을 되살렸습니다');
    } else {
      histRestore('folders', id, x.data);
      toast('폴더를 되살렸습니다');
    }
    closeAllModals();
  });
}
function askTrainerPick(title) {
  return new Promise(res => {
    const L = S.trainers.filter(tVis);
    if (!L.length) {
      toast('트레이너가 없습니다');
      return res(null);
    }
    const l = openModal(
      `<div class="mhead"><h2>${esc(title)}</h2></div><div class="mbody"><select data-tp style="width:100%">${L.map(t => `<option value="${esc(t.id)}">${esc(t.name || '이름 없음')} · ${t.pokemon.length}체</option>`).join('')}</select></div><div class="mfoot"><span class="sp"></span><button class="btn" data-x="no">취소</button><button class="btn pri" data-x="ok">확인</button></div>`,
      { onClose: () => res(null) }
    );
    l.addEventListener('click', e => {
      const x = e.target.dataset.x;
      if (!x) return;
      layers[layers.length - 1].onClose = null;
      const v = $('[data-tp]', l).value;
      closeModal();
      res(x === 'ok' ? v : null);
    });
  });
}
$('#bakIn').addEventListener('change', async e => {
  const f = e.target.files[0];
  e.target.value = '';
  if (!f) return;
  let o;
  try {
    o = JSON.parse(await f.text());
  } catch (err) {
    toast('백업 파일 형식이 맞지 않습니다');
    return;
  }
  if (!o || (o.app !== 'mangketmon-maker' && !(o.db && o.trainers))) {
    toast('백업 파일 형식이 맞지 않습니다');
    return;
  }
  const m = await chooseMode(o);
  if (!m) return;
  try {
    await impAutoBackup();
  } catch (err) {}
  try {
    restore(o, m);
    toast(
      m === 'add' ? '지금 목록에 추가했습니다 · 이전 데이터는 자동 백업 파일로 저장됨' : '전체 덮어썼습니다 · 이전 데이터는 자동 백업 파일로 저장됨'
    );
  } catch (err) {
    toast('백업 파일 형식이 맞지 않습니다');
  }
});
/* 엑셀(xlsx) 읽기·쓰기 — 외부 라이브러리 없이 JSZip으로 직접 처리 (오프라인 동작) */
const xlCol = i => {
  let s = '';
  i++;
  while (i) {
    const m = (i - 1) % 26;
    s = String.fromCharCode(65 + m) + s;
    i = Math.floor((i - 1) / 26);
  }
  return s;
};
const xlIdx = ref => {
  const m = String(ref).match(/^[A-Z]+/);
  let n = 0;
  for (const ch of m ? m[0] : 'A') n = n * 26 + ch.charCodeAt(0) - 64;
  return n - 1;
};
const xlEsc = v =>
  String(v)
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F]/g, '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
function xlSheet(aoa, cols) {
  let x = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">';
  if (cols && cols.length)
    x +=
      '<cols>' + cols.map((c, i) => `<col min="${i + 1}" max="${i + 1}" width="${((c && c.wch) || 10) + 1}" customWidth="1"/>`).join('') + '</cols>';
  x += '<sheetData>';
  aoa.forEach((row, r) => {
    if (!row || !row.length) return;
    x += `<row r="${r + 1}">`;
    row.forEach((v, c) => {
      if (v == null || v === '') return;
      const ref = xlCol(c) + (r + 1);
      if (typeof v === 'number' && isFinite(v)) x += `<c r="${ref}"><v>${v}</v></c>`;
      else {
        const t = String(v).slice(0, 32767);
        x += `<c r="${ref}" t="inlineStr"${/\n/.test(t) ? ' s="1"' : ''}><is><t xml:space="preserve">${xlEsc(t)}</t></is></c>`;
      }
    });
    x += '</row>';
  });
  return x + '</sheetData></worksheet>';
}
async function xlWrite(sheets) {
  const Z = await loadJSZip();
  const z = new Z();
  const H = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n';
  z.file(
    '[Content_Types].xml',
    H +
      '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>' +
      sheets
        .map(
          (_, i) =>
            `<Override PartName="/xl/worksheets/sheet${i + 1}.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>`
        )
        .join('') +
      '</Types>'
  );
  z.file(
    '_rels/.rels',
    H +
      '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>'
  );
  z.file(
    'xl/workbook.xml',
    H +
      '<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets>' +
      sheets.map((s, i) => `<sheet name="${xlEsc(s.name).replace(/"/g, '&quot;')}" sheetId="${i + 1}" r:id="rId${i + 1}"/>`).join('') +
      '</sheets></workbook>'
  );
  z.file(
    'xl/_rels/workbook.xml.rels',
    H +
      '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">' +
      sheets
        .map(
          (_, i) =>
            `<Relationship Id="rId${i + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet${i + 1}.xml"/>`
        )
        .join('') +
      `<Relationship Id="rId${sheets.length + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>`
  );
  z.file(
    'xl/styles.xml',
    H +
      '<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><fonts count="1"><font><sz val="11"/><name val="맑은 고딕"/></font></fonts><fills count="2"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill></fills><borders count="1"><border><left/><right/><top/><bottom/><diagonal/></border></borders><cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs><cellXfs count="2"><xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/><xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0" applyAlignment="1"><alignment wrapText="1" vertical="top"/></xf></cellXfs><cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles></styleSheet>'
  );
  sheets.forEach((s, i) => z.file(`xl/worksheets/sheet${i + 1}.xml`, xlSheet(s.aoa, s.cols)));
  return z.generateAsync({ type: 'blob', compression: 'DEFLATE', mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
}
async function xlRead(buf) {
  const Z = await loadJSZip();
  const z = await Z.loadAsync(buf);
  const DP = new DOMParser();
  const X = async p => {
    const f = z.file(p) || z.file(Object.keys(z.files).find(n => n.toLowerCase() === p.toLowerCase()) || '\0');
    return f ? DP.parseFromString(await f.async('string'), 'application/xml') : null;
  };
  const tag = (el, n) => [...el.getElementsByTagNameNS('*', n)];
  const wb = await X('xl/workbook.xml');
  if (!wb) throw new Error('notxlsx');
  const rels = await X('xl/_rels/workbook.xml.rels');
  const rm = {};
  if (rels) for (const r of tag(rels, 'Relationship')) rm[r.getAttribute('Id')] = r.getAttribute('Target');
  const ssd = await X('xl/sharedStrings.xml');
  const ss = ssd
    ? tag(ssd, 'si').map(si =>
        tag(si, 't')
          .filter(t => !t.parentNode || t.parentNode.localName !== 'rPh')
          .map(t => t.textContent)
          .join('')
      )
    : [];
  const out = { SheetNames: [], rows: {} };
  for (const sh of tag(wb, 'sheet')) {
    const name = sh.getAttribute('name');
    const id = sh.getAttribute('r:id') || sh.getAttributeNS('http://schemas.openxmlformats.org/officeDocument/2006/relationships', 'id');
    let t = rm[id] || '';
    t = t.startsWith('/') ? t.slice(1) : 'xl/' + t.replace(/^\.\//, '');
    const d = t ? await X(t) : null;
    const rows = [];
    if (d)
      for (const row of tag(d, 'row')) {
        const ri = (+row.getAttribute('r') || rows.length + 1) - 1;
        const arr = [];
        for (const c of tag(row, 'c')) {
          const ref = c.getAttribute('r');
          const ci = ref ? xlIdx(ref) : arr.length;
          const ty = c.getAttribute('t');
          let v = null;
          if (ty === 'inlineStr')
            v = tag(c, 't')
              .map(x => x.textContent)
              .join('');
          else {
            const ve = tag(c, 'v')[0];
            v = ve ? ve.textContent : null;
            if (ty === 's' && v != null) v = ss[+v] ?? '';
          }
          if (v != null) arr[ci] = v;
        }
        rows[ri] = arr;
      }
    out.SheetNames.push(name);
    out.rows[name] = rows;
  }
  return out;
}
const shName = (s, used) => {
  let n =
    String(s || '시트')
      .replace(/[\[\]:*?/\\]/g, ' ')
      .replace(/^'+|'+$/g, '')
      .slice(0, 28)
      .trim() || '시트';
  let b = n,
    i = 2;
  while (used.has(n.toLowerCase())) n = b.slice(0, 25) + ' ' + i++;
  used.add(n.toLowerCase());
  return n;
};
async function exportXlsx() {
  const wb = [],
    used = new Set(['_backup']);
  const all = [
    [
      '트레이너',
      '#',
      '이름',
      'Lv',
      '타입1',
      '타입2',
      '타입3',
      '테라',
      '특성',
      '소지품',
      ...STATS.map(s => s + ' 종족치'),
      ...STATS.map(s => s + ' 실수치'),
      '역할',
      '분류',
      '기술',
      '포텐셜',
      '전용 포텐셜',
      '복사용 텍스트'
    ]
  ];
  for (const t of S.trainers) {
    const aoa = [
      ['트레이너', t.name],
      ['지시', t.ranks['지시'], '육성', t.ranks['육성'], '통솔', t.ranks['통솔'], '능력', t.ranks['능력']],
      ['포인트', ...Object.entries(t.base).flatMap(([k, v]) => [k, v])],
      ['PT 기술점', ptSockets(t), '최대치', ptMax(t)],
      ['고유 포텐셜', ...t.unique.filter(u => u.name).flatMap(u => [u.name, brN(u.eff)])],
      [],
      all[0].slice(1)
    ];
    t.pokemon.forEach((p, i) => {
      const r = [
        i + 1,
        p.name,
        lv(t, p),
        p.t1,
        p.t2,
        p.t3,
        p.tera,
        p.ability,
        p.item,
        ...p.base.map(v => (v === '' ? '' : +v)),
        ...STATS.map((_, k) => stat(t, p, k)),
        roleOf(p),
        classOf(p),
        p.moves.map(m => m.name).join('\n'),
        p.pots.filter(x => x).join('\n'),
        exclAll(p)
          .map(x => x.name)
          .join('\n'),
        copyText(t, p)
      ];
      aoa.push(r);
      all.push([t.name, ...r]);
    });
    wb.push({
      name: shName(t.name, used),
      aoa,
      cols: [
        { wch: 6 },
        { wch: 16 },
        { wch: 5 },
        ...Array(6).fill({ wch: 7 }),
        { wch: 12 },
        ...Array(12).fill({ wch: 7 }),
        { wch: 10 },
        { wch: 10 },
        { wch: 18 },
        { wch: 18 },
        { wch: 16 },
        { wch: 60 }
      ]
    });
  }
  wb.push({ name: shName('전체 포켓몬', used), aoa: all });
  const cr = customDB();
  const ca = [];
  for (const k in DBS) {
    if (!cr[k].length) continue;
    ca.push([DBS[k].t + ' DB (오리지널)']);
    ca.push(DBS[k].cols);
    cr[k].forEach(r => ca.push(r));
    ca.push([]);
  }
  if (ca.length) wb.push({ name: shName('오리지널 DB', used), aoa: ca });
  const js = JSON.stringify(backupObj());
  const ch = [['이 시트는 제작기로 다시 불러올 때 쓰는 백업 데이터입니다. 수정하지 마세요.']];
  for (let i = 0; i < js.length; i += 30000) ch.push([js.slice(i, i + 30000)]);
  wb.push({ name: '_backup', aoa: ch });
  let blob;
  try {
    blob = await xlWrite(wb);
  } catch (e) {
    return toast('엑셀 파일을 만들지 못했습니다');
  }
  await saveFile('망켓몬_캐릭터시트.xlsx', blob);
}
$('#xlsxIn').addEventListener('change', async e => {
  const f = e.target.files[0];
  e.target.value = '';
  if (!f) return;
  try {
    const wb = await xlRead(await f.arrayBuffer());
    if (wb.rows['_backup']) {
      const js = wb.rows['_backup']
        .slice(1)
        .map(r => (r && r[0]) || '')
        .join('');
      const o = JSON.parse(js);
      const m = await chooseMode(o);
      if (m) {
        try {
          await impAutoBackup();
        } catch (err) {}
        restore(o, m);
        toast('엑셀을 불러왔습니다 · 이전 데이터는 자동 백업 파일로 저장됨');
      }
      return;
    }
    const found = [];
    for (const sn of wb.SheetNames) {
      const rows = wb.rows[sn];
      const list = [];
      for (const r of rows)
        for (const c of r || []) {
          if (c == null) continue;
          for (const s of String(c).split(/\r?\n/)) if (isCopyText(s)) list.push(s.trim());
        }
      if (list.length) found.push([sn, list]);
    }
    if (!found.length) return toast('엑셀에서 복사용 텍스트를 찾지 못했습니다');
    const tot = found.reduce((a, [, l]) => a + l.length, 0);
    if (
      !(await ask(
        `시트 ${found.length}개에서 포켓몬 ${tot}체의 복사용 텍스트를 찾았습니다. 시트마다 트레이너 폴더를 새로 만들어 불러올까요?`,
        '불러오기',
        false
      ))
    )
      return;
    for (const [sn, list] of found) {
      const t = newTrainer();
      t.name = sn;
      list.forEach(s => t.pokemon.push(Object.assign(parseCopy(s, t), { open: false })));
      S.trainers.push(t);
    }
    save();
    showTab('char');
    toast(`${tot}체를 불러왔습니다`);
  } catch (err) {
    toast('엑셀 파일을 읽지 못했습니다');
  }
});

