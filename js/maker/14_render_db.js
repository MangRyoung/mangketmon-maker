/* ── 조각 14_render_db.js — 렌더: DB 관리 · 맵툴 연동 ── */
/* ---------- 렌더: DB 관리 ---------- */
const dbs = {
  k: 'moves',
  q: '',
  type: '',
  cat: '',
  kind: '',
  mine: false,
  lim: 150,
  f: {},
  pmin: '',
  pmax: '',
  fopen: false,
  src: '',
  fold: {}
}; /* src · fold: 카드 DB 출처 거르기 · 접힌 폴더 (11-01) */
/* 11-01 카드 출처: 비우면 「출처 없음」. 정렬은 공용 → 이름순 → 출처 없음 */
const cardSrc = r => String((r && r[11]) || '').trim();
const srcOrder = (a, b) => (a === '공용' ? -1 : b === '공용' ? 1 : !a ? 1 : !b ? -1 : a.localeCompare(b, 'ko'));
/* 11-01 망령 「카드 DB 는 출처(사용자 이름 혹은 공용)로 폴더링」: 출처별 폴더(접기 · 펼치기) + 출처 거르기 */
function cardResults() {
  const k = 'cards',
    D = DBS[k];
  const all = filterRows(k, dbs);
  const live = S.db.cards.filter(r => r[1] !== '');
  const srcs = [...new Set(live.map(cardSrc))].sort(srcOrder);
  const pick = dbs.src || '';
  const rows = pick === '' ? all : all.filter(r => cardSrc(r) === (pick === '(없음)' ? '' : pick));
  const groups = [...new Set(rows.map(cardSrc))].sort(srcOrder);
  const cell = (r, c) =>
    c === 6
      ? `<td style="width:44px">${cardImg(r[c]) ? `<img src="${esc(cardImg(r[c]))}" alt="" loading="lazy" style="width:36px;height:50px;object-fit:cover;border-radius:4px;display:block">` : `<span style="display:block;width:36px;height:50px;border-radius:4px;background:${cardCol(r[5])}"></span>`}</td>`
      : c === D.eff
        ? `<td class="ef"><div class="efc">${rich(r[c])}</div></td>`
        : c === D.key
          ? `<td class="b">${esc(r[c])}${S.custom[k].includes(r[c]) ? ' <span class="kindb">오리지널</span>' : ''}</td>`
          : c === 10
            ? `<td>${cardIcons(r[10]).length ? `<span class="mkdic" style="--dcc:${cardCol(r[5])}">${cardIcons(r[10]).map(esc).join(' · ')}</span>` : ''}</td>`
            : c === 11
              ? `<td class="small">${esc(cardSrc(r) || '—')}</td>`
              : `<td>${esc(r[c] ?? '')}</td>`;
  const nc = D.show.length;
  const cnt = x => live.filter(r => cardSrc(r) === (x === '(없음)' ? '' : x)).length;
  return `<div class="row" style="gap:6px;flex-wrap:wrap;align-items:center;margin:0 0 6px"><span class="small muted">출처</span>${['', ...srcs.map(x => x || '(없음)')].map(x => `<button type="button" class="btn xs ${pick === x ? 'pri' : 'ghost'}" data-cardsrc="${esc(x)}">${x === '' ? '전체' : esc(x)} <span class="faint">${x === '' ? live.length : cnt(x)}</span></button>`).join('')}<span class="sp"></span><span class="small muted">${rows.length}건 · 폴더 이름을 누르면 접힌다 · 행을 누르면 수정 창</span></div>
 <div class="dbt"><table class="cardsrc"><tr>${D.show.map(c => `<th>${esc(D.cols[c])}</th>`).join('')}</tr>
 ${
   groups
     .map(g => {
       const gr = rows.filter(r => cardSrc(r) === g);
       const gk = g || '(없음)';
       const shut = !!dbs.fold[gk];
       return (
         `<tr class="csrch" data-cardfold="${esc(gk)}" style="cursor:pointer"><td colspan="${nc}">${shut ? '▸' : '▾'} 📁 <b>${esc(g || '출처 없음')}</b> <span class="faint">${gr.length}장</span></td></tr>` +
         (shut
           ? ''
           : gr
               .map(r => {
                 const i = S.db[k].indexOf(r);
                 return `<tr data-dbedit="${i}" tabindex="0" data-kbd style="cursor:pointer">${D.show.map(c => cell(r, c)).join('')}</tr>`;
               })
               .join(''))
       );
     })
     .join('') || `<tr><td colspan="${nc}" class="muted">카드가 없습니다</td></tr>`
 }
 </table></div>`;
}
/* 11-03 감우 (20번 검토 편의 6): DB 표 머리 누르면 그 칸으로 정렬 — 숫자가 많은 칸은 숫자로(빈 칸 · 「-」는 맨 뒤), 아니면 가나다 · 한 번 더 누르면 내림차순 · 세 번째엔 해제. 검색 순위(이름 일치 우선)보다 열 정렬이 우선 */
function dbSorted(k, rows) {
  const so = dbs.sort;
  if (!so || so.k !== k) return rows;
  const c = so.c;
  const nums = rows.map(r => {
    const v = String(r[c] ?? '').trim();
    if (v === '' || v === '-') return null;
    const n = numOf(v);
    return n.length ? n[0] : null;
  });
  const numeric = nums.filter(x => x != null).length >= Math.max(1, rows.length * 0.5);
  return rows
    .map((r, i) => [r, i])
    .sort((a, b) => {
      const va = a[0][c],
        vb = b[0][c];
      if (numeric) {
        const na = nums[a[1]],
          nb = nums[b[1]];
        if (na == null && nb == null) return a[1] - b[1];
        if (na == null) return 1;
        if (nb == null) return -1;
        return (na - nb) * so.d || a[1] - b[1];
      }
      const sa = String(va ?? ''),
        sb = String(vb ?? '');
      if (!sa && sb) return 1;
      if (sa && !sb) return -1;
      return KO.compare(sa, sb) * so.d || a[1] - b[1];
    })
    .map(x => x[0]);
}
/* 수정 창의 ‹ › 가 따라가는 순서 = 표에 보이는 순서 (카드 DB 는 출처 폴더 순, 접힌 폴더는 건너뜀) */
function dbNavKeys() {
  const k = dbs.k,
    D = DBS[k];
  if (k === 'cards') {
    const all = filterRows(k, dbs);
    const pick = dbs.src || '';
    const rows = pick === '' ? all : all.filter(r => cardSrc(r) === (pick === '(없음)' ? '' : pick));
    const groups = [...new Set(rows.map(cardSrc))].sort(srcOrder);
    return groups.flatMap(g => (dbs.fold[g || '(없음)'] ? [] : rows.filter(r => cardSrc(r) === g).map(r => r[D.key])));
  }
  return dbSorted(k, filterRows(k, dbs)).map(r => r[D.key]);
}
/* 11-03 망령 「DB 기술 · 특성 · 포텐셜 쪽에 구문 항목 맨 오른쪽 칸에」: 그 이름의 레디메이드 행(레디메이드 DB = 기본 + 제작기 수정)의 구문을 보여 준다.
   칸을 누르면 그 레디메이드 행 수정 창 · 없으면 새 레디메이드 행(이름 · 효과 글 채움). 구문 자체는 레디메이드 DB 한 곳에만 있다 */
const DB_FXK = { moves: n => ['기술 : ' + n], abil: n => ['특성 : ' + n, n], pots: n => [n] };
function dbFxRow(k, name) {
  const f = DB_FXK[k];
  if (!f || !name) return null;
  const rows = S.db.rm || [];
  for (const key of f(String(name).replace(/『|』/g, '').trim())) {
    const r = rows.find(x => x && x[0] === key);
    if (r) return r;
  }
  return null;
}
function dbFxCell(k, r) {
  const D = DBS[k];
  const name = r[D.key];
  if (!lazyOk('rm')) return `<td class="ef"><span class="faint">…</span></td>`;
  const x = dbFxRow(k, name);
  const key = x
    ? x[0]
    : DB_FXK[k](
        String(name || '')
          .replace(/『|』/g, '')
          .trim()
      )[0];
  let tip = x ? '눌러서 레디메이드 구문 고치기' : '구문 없음 — 눌러서 레디메이드 행 만들기';
  /* 기술은 레디메이드가 없으면 오레마스가 효과 글을 읽어 자동으로 돌린다(moveauto.js) — 그 결과를 흐리게 보여 준다 */
  let auto = '';
  if (!(x && String(x[2] || '').trim()) && k === 'moves' && window.OM_MOVEAUTO) {
    try {
      const MA = window.OM_MOVEAUTO;
      const a = MA.parse({ name: r[2], type: r[5], cat: r[6], range: r[9], tag: r[12] || r[1], eff: r[13] });
      const d = MA.auto(a) ? MA.describe(a) : '';
      const nn = (a.notes || []).length;
      if (d || nn) {
        auto = `<span class="muted">글에서 읽음 · </span>${esc(d || '자동 없음')}${nn ? ` <span class="kindb">손으로 ${nn}</span>` : ''}`;
        tip = '효과 글에서 자동으로 읽은 것 (레디메이드 없음) — 눌러서 레디메이드 구문으로 덮어쓰기';
      }
    } catch (e) {}
  }
  return `<td class="ef dbfx" data-rmgo="${esc(key)}" data-rmeff="${esc(r[D.eff] || '')}" title="${esc(tip)}"><div class="efc" style="white-space:pre-line;font-size:12px">${x && String(x[2] || '').trim() ? esc(x[2]) : auto || '<span class="faint">—</span>'}${x && x[3] === 'O' ? ' <span class="kindb">손으로</span>' : ''}</div></td>`;
}
function dbResults() {
  const k = dbs.k,
    D = DBS[k];
  if (k === 'cards') return cardResults();
  const rows = dbSorted(k, filterRows(k, dbs));
  const so = dbs.sort && dbs.sort.k === k ? dbs.sort : null;
  return `<p class="small muted" style="margin:0 0 6px">${rows.length}건${rows.length > dbs.lim ? ` · 앞 ${dbs.lim}건 표시` : ''} · 행을 누르면 수정 창이 열립니다${so ? ` · 「${esc(D.cols[so.c])}」 ${so.d > 0 ? '오름차순' : '내림차순'}` : ' · 표 머리를 누르면 정렬'}</p>
 <div class="dbt"><table><tr>${D.show.map(c => `<th class="dbth ${so && so.c === c ? 'on' : ''}" data-dbsort="${c}" title="${esc(D.cols[c])} 기준으로 정렬 (다시 누르면 내림차순 · 한 번 더 누르면 해제)" tabindex="0" data-kbd>${esc(D.cols[c])}${so && so.c === c ? `<i>${so.d > 0 ? '▲' : '▼'}</i>` : ''}</th>`).join('')}${DB_FXK[k] ? '<th title="그 이름의 레디메이드 자동화 구문 (레디메이드 DB) — 칸을 누르면 고친다">구문</th>' : ''}</tr>
 ${rows
   .slice(0, dbs.lim)
   .map(r => {
     const i = S.db[k].indexOf(r);
     return `<tr data-dbedit="${i}" tabindex="0" data-kbd style="cursor:pointer">${D.show
       .map(c =>
         c === D.eff
           ? `<td class="ef"><div class="efc">${rich(r[c])}</div></td>`
           : c === D.key
             ? `<td class="b">${esc(r[c])}${k !== 'abil' && S.custom[k].includes(r[c]) ? ' <span class="kindb">오리지널</span>' : ''}${k === 'moves' && mvOldOnly(r) ? ' <span class="kindb">올드 전용</span>' : ''}</td>`
             : k === 'abil' && c === 5
               ? `<td>${abKindChip(r)}</td>`
               : k === 'cards' && c === 6
                 ? `<td style="width:44px">${cardImg(r[c]) ? `<img src="${esc(cardImg(r[c]))}" alt="" loading="lazy" style="width:36px;height:50px;object-fit:cover;border-radius:4px;display:block">` : `<span style="display:block;width:36px;height:50px;border-radius:4px;background:${cardCol(r[5])}"></span>`}</td>`
                 : k === 'st' && c === 12
                   ? `<td style="width:40px">${r[c] ? `<img src="${esc(stIcon(r[c]))}" alt="" loading="lazy" style="width:32px;height:32px;object-fit:contain;display:block">` : ''}</td>`
                   : k === 'rm' && c === 4
                     ? `<td style="white-space:nowrap">${(() => {
                         const v = String(r[4] == null ? '' : r[4]).trim();
                         if (v !== '' && +v > 0) return `<b>${esc(v)}%</b>`;
                         const F = window.OM_FX;
                         if (!F || !F.rmChance) return '<span class="faint">—</span>';
                         let t = r[1] || '';
                         if (!t && F.effOf) {
                           const mm = String(r[0] || '').match(/^(특성|소지품)\s*:\s*(.+)$/);
                           t = mm ? F.effOf(mm[1] === '특성' ? 'trait' : 'item', mm[2]) : F.effOf('trait', r[0]) || '';
                         }
                         const d = F.rmChance({ text: t });
                         return d ? `<span class="muted" title="효과 글에서 읽은 확률">글 ${d}%</span>` : '<span class="faint">—</span>';
                       })()}</td>`
                     : k === 'items' && c === 7
                       ? `<td class="ef"><div class="efc" style="white-space:pre-line;font-size:12px">${r[c] ? esc(r[c]) : '<span class="faint">—</span>'}</div></td>`
                       : (k === 'moves' && c === 5) || (k === 'old' && (c === 3 || c === 4))
                         ? `<td>${tchip(r[c])}</td>`
                         : `<td>${esc(r[c])}</td>`
       )
       .join('')}${DB_FXK[k] ? dbFxCell(k, r) : ''}</tr>`;
   })
   .join('')}</table>
 ${rows.length > dbs.lim ? `<div style="padding:8px"><button class="btn" data-dbmore>더 보기</button></div>` : ''}</div>`;
}
function renderDB() {
  const k = dbs.k;
  const head = `<div class="intro"><h1>DB 관리</h1><p>기술·특성·소지품·포텐셜·올드 타입·포인트·레디메이드·상태 변화 DB를 검색하고 추가·수정·삭제합니다. 바뀐 내용은 캐릭터 시트의 검색 창과 계산, 맵툴 토큰 갱신에 바로 반영됩니다.</p></div>
 <div class="subtabs">${Object.entries(DBS)
   .map(
     ([kk, d]) =>
       `<button data-dbk="${kk}" class="${kk === k ? 'on' : ''}">${d.t} DB<span class="c">${(kk === 'rm' || kk === 'st') && !lazyOk(kk) ? (FXST === 'fail' ? '!' : '…') : S.db[kk].length}</span></button>`
   )
   .join('')}<button data-dbk="mt" class="${k === 'mt' ? 'on' : ''}">맵툴 DB 갱신</button></div>`;
  if (k === 'mt') {
    dbs.ex = mtStrings();
    $('#v-db').innerHTML = head + mtPanel();
    return;
  }
  const D = DBS[k];
  $('#v-db').innerHTML =
    head +
    `
 ${k === 'rm' && !rmLoaded() ? `<div class="panel row" style="margin-bottom:10px"><span class="small ${FXST === 'fail' ? 'warn' : 'muted'}" style="flex:1;min-width:200px">${FXST === 'fail' ? '레디메이드 기본 행(자동화 스크립트 js/fx/)을 불러오지 못했습니다. 아래에는 이 DB에서 직접 추가한 행만 보입니다.' : '레디메이드 기본 행을 불러오는 중입니다…'}</span>${FXST === 'fail' ? '<button class="btn sm" data-fxretry>다시 불러오기</button>' : ''}</div>` : ''}
 ${k === 'st' ? `<div class="panel row" style="margin-bottom:10px;gap:6px;flex-wrap:wrap"><span class="small muted" style="flex:1;min-width:220px">${stLoaded() ? '오레마스는 배틀 화면 DB 창의 「제작기 새로고침」으로 고친 상태를 가져갑니다. 맵툴 「상태 변화 DB」의 「백업 · 불러오기」 JSON 과 같은 꼴이에요.' : FXST === 'fail' ? '<span class="warn">상태 변화 기본 표(js/fx/states.js)를 불러오지 못했습니다.</span>' : '상태 변화 기본 표를 불러오는 중입니다…'}</span><button class="btn sm" data-dbact="stimp">맵툴 JSON 불러오기</button><button class="btn sm" data-dbact="stexp">JSON 내보내기</button></div>` : ''}
 ${k === 'abil' || k === 'items' || k === 'old' || k === 'moves' ? `<div class="panel row" style="margin-bottom:10px"><span class="small muted" style="flex:1;min-width:200px">이 DB는 맵툴 라이브러리 토큰(${k === 'abil' ? 'Lib:traits_multiple · Lib:pokemon' : k === 'items' ? 'Lib:item' : k === 'moves' ? 'Lib:skill · 기술 목록 문자열' : 'Lib:pokemon 「list_oldtype」'})과 연동됩니다. 고친 뒤 「맵툴 DB 갱신」에서 토큰을 새로 받으세요.</span><button class="btn sm" data-dbk="mt">맵툴 DB 갱신 열기</button></div>` : ''}
 ${orphPanel(k)}
 <div class="row dbbar"><input id="dbq" type="search" enterkeyhint="search" placeholder="${D.t} 검색" value="${esc(dbs.q)}" style="flex:1 1 220px"><button type="button" class="btn ftog" data-dbftog aria-expanded="${dbs.fopen}">필터<b class="fn">${fCount(k, dbs) ? ' ' + fCount(k, dbs) : ''}</b></button><button class="btn pri" data-dbact="add">+ 새 항목</button></div>
 <div class="row xfrow fwrap ${dbs.fopen ? 'on' : ''}" style="margin-bottom:8px">
  ${k === 'moves' ? `<select id="dbtype"><option value="">모든 타입</option>${S.db.types.map(t => `<option ${dbs.type === t[0] ? 'selected' : ''}>${esc(t[0])}</option>`).join('')}</select><select id="dbcat"><option value="">모든 분류</option>${['물리', '특수', '변화'].map(c => `<option ${dbs.cat === c ? 'selected' : ''}>${c}</option>`).join('')}</select>` : ''}
  ${k === 'pots' ? xfHTML(k, dbs) + kindSelect(k, dbs, 'id="dbkind"') : k === 'items' || k === 'old' ? kindSelect(k, dbs, 'id="dbkind"') + xfHTML(k, dbs) : xfHTML(k, dbs)}
  ${k === 'abil' ? '' : `<label class="row small"><input type="checkbox" id="dbmine" ${dbs.mine ? 'checked' : ''}>오리지널만 (${S.custom[k].length})</label>`}
  <span class="sp"></span><button class="btn" data-dbact="reset">원본으로 되돌리기</button></div>
 <div id="dbres">${dbResults()}</div>`;
}
function renderDBkeep() {
  keepFocus($('#v-db'), renderDB);
}
/* 10-27 망령: 기본 DB 새 판에서 이름이 바뀌었거나 빠져 붙을 행이 없는 수정. 지우지 않고 여기 모아 둔다 */
const orphOf = k => [...(SH.orph_ed || new Map())].filter(([, d]) => d && d.kind === k);
function orphPanel(k) {
  const L = orphOf(k);
  if (!L.length) return '';
  const D = DBS[k];
  return `<div class="panel" style="margin-bottom:10px;border-color:var(--warn)"><div class="small" style="margin-bottom:6px"><b class="warn">붙을 행이 없는 수정 ${L.length}개</b> <span class="muted">· 기본 DB 새 판에서 이름이 바뀌었거나 빠진 행입니다. 공유 DB 에 그대로 남아 있어요. 새 이름에 옮겨 붙이거나, 추가 행으로 살리거나, 버리세요.</span></div>
 ${L.map(
   ([id, d]) =>
     `<div class="row" style="gap:6px;flex-wrap:wrap;padding:4px 0;border-top:1px solid var(--line)"><b style="min-width:120px">${esc(d.key)}</b><span class="small muted" style="flex:1 1 200px;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${
       D.eff >= 0
         ? esc(
             String(d.row[D.eff] || '')
               .replace(/\s+/g, ' ')
               .slice(0, 80)
           )
         : ''
     }</span><button class="btn sm" data-orph="move" data-id="${esc(id)}">옮겨 붙이기</button><button class="btn sm" data-orph="add" data-id="${esc(id)}">추가 행으로 살리기</button><button class="btn sm danger" data-orph="drop" data-id="${esc(id)}">버리기</button></div>`
 ).join('')}</div>`;
}
async function orphAct(act, id) {
  const d = SH.orph_ed && SH.orph_ed.get(id);
  if (!d) return;
  const k = d.kind,
    D = DBS[k];
  if (act === 'drop') {
    if (!(await ask(`「${esc(d.key)}」 수정을 버릴까요? 공유 DB 에서도 지워집니다.`, '버리기'))) return;
  } else if (act === 'add') {
    if (S.db[k].some(r => r[D.key] === d.key)) return toast('같은 이름 행이 이미 있습니다 · 「옮겨 붙이기」를 쓰세요');
    S.db[k].unshift(clone(d.row));
    if (d.custom && !S.custom[k].includes(d.key)) S.custom[k].push(d.key);
  } else if (act === 'move') {
    const n = ((await askText('옮겨 붙이기', `「${d.key}」 수정을 붙일 ${D.cols[D.key]} (지금 DB에 있는 이름)`, d.key)) || '').trim();
    if (!n) return;
    const i = S.db[k].findIndex(r => r[D.key] === n);
    if (i < 0) return toast(`「${n}」 이(가) ${D.t} DB에 없습니다`);
    if (!(await ask(`「${esc(n)}」 행을 「${esc(d.key)}」 수정 내용으로 바꿀까요? (이름은 「${esc(n)}」 그대로)`, '옮겨 붙이기', false))) return;
    const nr = clone(d.row);
    nr[D.key] = n;
    S.db[k][i] = nr;
    if (d.custom && !S.custom[k].includes(n)) S.custom[k].push(n);
  }
  SH.orph_ed.delete(id);
  SH.ed.delete(id);
  reindex();
  save(true);
  renderDB();
  toast(act === 'drop' ? '버렸습니다' : '반영했습니다');
}
$('#v-db').addEventListener('click', async e => {
  const t = e.target;
  const kb = t.closest('[data-dbk]');
  if (kb) {
    Object.assign(dbs, { k: kb.dataset.dbk, q: '', type: '', cat: '', kind: '', mine: false, lim: 150, f: {}, pmin: '', pmax: '', sort: null });
    renderDB();
    return;
  }
  {
    const cs = t.closest('[data-cardsrc]');
    if (cs) {
      dbs.src = cs.dataset.cardsrc;
      const r = $('#dbres');
      if (r) r.innerHTML = dbResults();
      return;
    }
    const cf = t.closest('[data-cardfold]');
    if (cf) {
      const g = cf.dataset.cardfold;
      dbs.fold[g] = !dbs.fold[g];
      const r = $('#dbres');
      if (r) r.innerHTML = dbResults();
      return;
    }
  } /* 11-01 카드 출처 폴더 */
  if (t.closest('[data-dbmore]')) {
    dbs.lim += 300;
    const r = $('#dbres');
    if (r) r.innerHTML = dbResults();
    return;
  }
  {
    const th = t.closest('[data-dbsort]');
    if (th) {
      const c = +th.dataset.dbsort;
      const so = dbs.sort && dbs.sort.k === dbs.k ? dbs.sort : null;
      dbs.sort = !so || so.c !== c ? { k: dbs.k, c, d: 1 } : so.d > 0 ? { k: dbs.k, c, d: -1 } : null;
      const r = $('#dbres');
      if (r) r.innerHTML = dbResults();
      return;
    }
  }
  const ft = t.closest('[data-dbftog]');
  if (ft) {
    dbs.fopen = !dbs.fopen;
    $('#v-db .fwrap').classList.toggle('on', dbs.fopen);
    ft.setAttribute('aria-expanded', dbs.fopen);
    return;
  }
  if (t.closest('[data-xfreset]')) {
    Object.assign(dbs, { f: {}, pmin: '', pmax: '', kind: '', type: '', cat: '', lim: 150 });
    renderDB();
    return;
  }
  const ce = t.closest('[data-copyex]');
  if (ce) {
    copyStr(dbs.ex[+ce.dataset.copyex][1]);
    return;
  }
  const rg = t.closest('[data-rmgo]');
  if (rg) {
    e.stopPropagation && e.stopPropagation();
    const key = rg.dataset.rmgo;
    const i = (S.db.rm || []).findIndex(x => x && x[0] === key);
    if (i >= 0) openEdit('rm', i);
    else openEdit('rm', -1, { preset: { 0: key, 1: rg.dataset.rmeff || '' } });
    return;
  }
  const ed = t.closest('[data-dbedit]');
  if (ed) {
    openEdit(dbs.k, +ed.dataset.dbedit, { nav: dbNavKeys });
    return;
  }
  const ob = t.closest('[data-orph]');
  if (ob) {
    orphAct(ob.dataset.orph, ob.dataset.id);
    return;
  }
  const mb = t.closest('[data-mt]');
  if (mb) {
    mb.dataset.mt === 'build' ? mtDownload(mb.dataset.k) : mtImport(mb.dataset.k);
    return;
  }
  const a = t.closest('[data-dbact]');
  if (!a) return;
  const k = dbs.k;
  if (a.dataset.dbact === 'add') openEdit(k, -1);
  if (a.dataset.dbact === 'stexp') {
    const o = stObjOf(S.db.st);
    const txt = JSON.stringify(o);
    try {
      await navigator.clipboard.writeText(txt);
    } catch (err) {}
    const u = URL.createObjectURL(new Blob([JSON.stringify(o, null, 1)], { type: 'application/json' }));
    const el = document.createElement('a');
    el.href = u;
    el.download = '상태변화DB.json';
    document.body.appendChild(el);
    el.click();
    el.remove();
    setTimeout(() => URL.revokeObjectURL(u), 2000);
    toast(`상태 ${Object.keys(o.st).length}개를 내보냈습니다 (클립보드에도 복사)`);
    return;
  }
  if (a.dataset.dbact === 'stimp') {
    const l = openModal(
      `<div class="mhead"><h2>맵툴 상태 변화 DB 불러오기</h2><span class="sp"></span><button class="btn ghost" data-x>닫기</button></div>
  <div class="mbody"><p class="small muted" style="margin:0 0 6px">맵툴 「상태 변화 DB」 창의 「백업 · 불러오기」에서 내보낸 JSON 을 붙여 넣거나 파일을 고르세요. 지금 표를 통째로 바꿉니다 (모두에게 공유).</p><input type="file" accept=".json,.txt,application/json" data-stf><textarea data-stt rows="10" placeholder='{"v":1,"groups":[…],"st":{…}}' style="width:100%;font-family:var(--mono,monospace);font-size:12px"></textarea><div class="small" data-stmsg></div></div>
  <div class="mfoot"><span class="sp"></span><button class="btn" data-x>취소</button><button class="btn pri" data-stgo>불러오기</button></div>`,
      { wide: true }
    );
    const ta = $('[data-stt]', l),
      msg = $('[data-stmsg]', l);
    const chk = () => {
      try {
        let o = JSON.parse(ta.value);
        if (o && o.db && o.db.st) o = o.db;
        if (!o || !o.st || typeof o.st !== 'object') throw new Error('st 칸이 없습니다');
        const n = Object.keys(o.st).length;
        const old = new Set(S.db.st.map(r => r[0]));
        const add = Object.keys(o.st).filter(k => !old.has(k)).length;
        const gone = [...old].filter(k => !o.st[k]).length;
        msg.innerHTML = `상태 ${n}개 · 새로 ${add}${gone ? ` · JSON 에 없는 ${gone}개는 그대로 둠` : ''}`;
        return o;
      } catch (err) {
        msg.innerHTML = ta.value.trim() ? `<span class="warn">읽지 못했습니다: ${esc(err.message)}</span>` : '';
        return null;
      }
    };
    ta.addEventListener('input', chk);
    $('[data-stf]', l).addEventListener('change', async e => {
      const f = e.target.files[0];
      if (!f) return;
      ta.value = await f.text();
      chk();
    });
    l.addEventListener('click', async e => {
      if (e.target.closest('[data-x]')) return closeModal();
      if (!e.target.closest('[data-stgo]')) return;
      const o = chk();
      if (!o) return toast('JSON 을 확인해 주세요');
      const keep = S.db.st.filter(r => r[0] && !o.st[r[0]]);
      const icon = new Map(S.db.st.map(r => [r[0], r[12] || '']));
      S.db.st = stRowsOf(o)
        .map(r => {
          if (!r[12] && icon.get(r[0])) r[12] = icon.get(r[0]);
          return r;
        })
        .concat(keep);
      const base = new Set((DEF.st || []).map(r => r[0]));
      S.custom.st = S.db.st.map(r => r[0]).filter(k => !base.has(k));
      reindex();
      save(true);
      stApply();
      closeModal();
      renderDB();
      toast(`상태 변화 DB 를 불러왔습니다 (${S.db.st.length}개)`);
    });
    return;
  }
  if (
    a.dataset.dbact === 'reset' &&
    (await ask(
      `${DBS[k].t} DB를 원본 시트 값으로 되돌릴까요? 추가하거나 고친 내용(오리지널 ${S.custom[k].length}건 포함)이 사라집니다.<br><span class="small muted">되돌리기 전에 백업 파일을 먼저 내려받습니다</span>`,
      '되돌리기'
    ))
  ) {
    try {
      await impAutoBackup();
    } catch (e) {}
    S.db[k] = clone(DEF[k]);
    S.custom[k] = [];
    reindex();
    save(true);
    renderDB();
    toast('원본으로 되돌렸습니다');
  }
});
let dqT;
$('#v-db').addEventListener('input', e => {
  if (e.target.id === 'dbq') {
    clearTimeout(dqT);
    dqT = setTimeout(() => {
      dbs.q = e.target.value;
      dbs.lim = 150;
      const r = $('#dbres');
      if (r) r.innerHTML = dbResults();
    }, 220);
  } else if (e.target.dataset.pr) {
    clearTimeout(dqT);
    dqT = setTimeout(() => {
      dbs[e.target.dataset.pr] = e.target.value.trim();
      dbs.lim = 150;
      const r = $('#dbres');
      if (r) r.innerHTML = dbResults();
      const fb = $('[data-dbftog] .fn');
      if (fb) fb.textContent = fCount(dbs.k, dbs) ? ' ' + fCount(dbs.k, dbs) : '';
    }, 300);
  }
});
$('#v-db').addEventListener('change', e => {
  const id = e.target.id;
  if (e.target.dataset.xf) {
    dbs.f[e.target.dataset.xf] = e.target.value;
    if (e.target.dataset.xf === 'grp') dbs.kind = '';
    dbs.lim = 150;
    renderDBkeep();
    return;
  }
  if (e.target.dataset.pr) {
    if (dbs[e.target.dataset.pr] === e.target.value.trim()) return;
    dbs[e.target.dataset.pr] = e.target.value.trim();
    dbs.lim = 150;
    renderDBkeep();
    return;
  }
  if (e.target.dataset.mtfile) {
    const fs = [...e.target.files];
    e.target.value = '';
    (async () => {
      for (const f of fs) await mtLoad(f, e.target.dataset.mtfile);
    })();
    return;
  }
  if (e.target.dataset.mtopt) {
    const [kk, o] = e.target.dataset.mtopt.split('.');
    if (MT[kk]) {
      MT[kk].opt[o] = e.target.checked;
      renderDB();
    }
    return;
  }
  if (id === 'dbtype') dbs.type = e.target.value;
  else if (id === 'dbcat') dbs.cat = e.target.value;
  else if (id === 'dbkind') dbs.kind = e.target.value;
  else if (id === 'dbmine') dbs.mine = e.target.checked;
  else return;
  renderDBkeep();
});

/* ---------- 맵툴 연동 (Lib:traits_multiple · Lib:item · Lib:pokemon) ---------- */
const MT = { traits: null, item: null, pokemon: null, move: null };
const MT_INFO = {
  traits: { lib: 'Lib:traits_multiple', t: '특성 DB → 특성별 속성' },
  item: { lib: 'Lib:item', t: '소지품 DB → 소지품별 속성' },
  pokemon: { lib: 'Lib:pokemon', t: 'list_trait_name · list_trait_effect · list_oldtype' },
  move: { lib: 'Lib:skill', t: '기술 DB → 기술별 속성 · skill_meta · skill_info', re: /^lib:(moves?|skills?|waza|기술)$/i }
};
const xesc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&apos;');
const xun = s =>
  String(s).replace(/&(lt|gt|quot|apos|amp|#\d+|#x[0-9a-f]+);/gi, (m, a) =>
    a[0] === '#'
      ? String.fromCodePoint(a[1] === 'x' || a[1] === 'X' ? parseInt(a.slice(2), 16) : +a.slice(1))
      : { lt: '<', gt: '>', quot: '"', apos: "'", amp: '&' }[a.toLowerCase()]
  );
const mtTxt = s =>
  String(s ?? '')
    .replace(/\r/g, '')
    .replace(/\\n|\n/g, '<br>');
const mtSemi = s => mtTxt(s).replace(/;/g, '；');
const mtProtected = k => /^[A-Za-z0-9_\-]/.test(k) || /list$/i.test(k) || k === 'entry_ment';
const mtGarbage = k => (/[,;]/.test(k) && k.length > 30) || /[<>]/.test(k);
const KO = new Intl.Collator('ko');
function mtTraitNames() {
  return [...new Set(S.db.abil.map(r => r[1]).filter(Boolean))].sort(KO.compare);
}
function oldNames() {
  return [...new Set(S.db.old.filter(r => r[1] && r[10] !== 'O').map(r => r[1]))];
}
function mvVal(r) {
  const g = i => String(r[i] ?? '').trim(),
    d = i => g(i) || '-';
  let pw = g(7),
    nt = g(16);
  if (pw && !/^-?\d+$/.test(pw)) {
    nt = '위력 ' + pw + (nt && nt !== '-' ? ' / ' + nt : '');
    pw = '0';
  }
  const t = g(5),
    en = !t || t === '-' ? '' : (typeInfo(t) || [])[3] || '';
  return mtTxt(
    [g(2), d(5), d(6), pw || '-', d(8), d(9), d(10), d(11), d(12), d(13), d(14), d(15), nt || '-', d(17), en, g(18) || 1, g(19) || 1].join(';')
  );
}
const pyJson = v =>
  Array.isArray(v)
    ? '[' + v.map(pyJson).join(', ') + ']'
    : v && typeof v === 'object'
      ? '{' +
        Object.entries(v)
          .map(([k, x]) => JSON.stringify(k) + ': ' + pyJson(x))
          .join(', ') +
        '}'
      : JSON.stringify(v);
function itemVal(r) {
  return (r[3] === 'O' ? '소모품/' : '') + mtSemi(r[4]) + ';' + mtSemi(r[5]) + ';' + mtSemi(r[6]) + ';';
}
function mtWant(kind) {
  const m = new Map();
  if (kind === 'traits')
    for (const r of S.db.abil) {
      if (r[1] && !m.has(r[1])) m.set(r[1], mtTxt(r[2]));
    }
  if (kind === 'item')
    for (const r of S.db.items) {
      if (r[1] && !m.has(r[1])) m.set(r[1], itemVal(r));
    }
  if (kind === 'move') {
    const meta = {};
    for (const r of S.db.moves) {
      if (r[2] && !m.has(r[2])) {
        m.set(r[2], mvVal(r));
        meta[r[2]] = [r[0], r[1], r[3], r[4]].map(x => String(x ?? ''));
      }
    }
    m.set('skill_meta', pyJson(meta));
    m.set('skill_info', pyJson({ src: '망켓몬 캐릭터 제작기', n: Object.keys(meta).length }));
  }
  if (kind === 'pokemon') {
    const n = mtTraitNames();
    m.set('list_trait_name', n.join(','));
    m.set('list_trait_effect', n.map(x => mtSemi(idx.abil.get(x)[2])).join(';'));
    m.set('list_oldtype', JSON.stringify(oldNames()));
  }
  return m;
}
function mtStrings() {
  const it = S.db.items.filter(r => r[1]);
  const w = mtWant('pokemon');
  return [
    ['특성 이름 목록 · Lib:pokemon list_trait_name', w.get('list_trait_name')],
    ['특성 효과 목록 · Lib:pokemon list_trait_effect', w.get('list_trait_effect')],
    ['소지품 이름 목록 (「;」 구분 · 소지품 DB 입력 매크로 이름 칸)', it.map(r => r[1]).join(';')],
    ['소지품 효과 목록 (「#」 구분 · 효과;소켓;비고;)', it.map(itemVal).join('#')],
    ['올드 타입 목록 · Lib:pokemon list_oldtype (메가진화 제외)', w.get('list_oldtype')],
    [
      '기술 목록 · Lib:skill 「데이터 입력」에 붙여넣기',
      [...new Map(S.db.moves.filter(r => r[2]).map(r => [r[2], r])).values()].map(mvVal).join('\n')
    ]
  ];
}
function mtParse(xml) {
  const a = xml.indexOf('<propertyMapCI>');
  if (a < 0) return null;
  const s0 = xml.indexOf('<store>', a),
    e = xml.indexOf('</store>', s0);
  if (s0 < 0 || e < 0) return null;
  const s = s0 + 7;
  const body = xml.slice(s, e);
  const re =
    /<entry>\s*<string>([^<]*)<\/string>\s*<net\.rptools\.CaseInsensitiveHashMap_-KeyValue>\s*<key>([^<]*)<\/key>(?:\s*<value class="string">([^<]*)<\/value>)?\s*<\/net\.rptools\.CaseInsensitiveHashMap_-KeyValue>\s*<\/entry>/g;
  const ents = [];
  let m;
  while ((m = re.exec(body))) ents.push({ a: m.index, b: re.lastIndex, str: m[1], key: xun(m[2]), val: m[3] == null ? null : xun(m[3]) });
  return { s, e, ents, ind: (body.match(/\n([ \t]*)<entry>/) || [0, '      '])[1] };
}
function mtEntry(ind, key, val, str) {
  const i2 = ind + '  ',
    i3 = ind + '    ';
  return `<entry>\n${i2}<string>${str != null ? str : xesc(key.toLowerCase())}</string>\n${i2}<net.rptools.CaseInsensitiveHashMap_-KeyValue>\n${i3}<key>${xesc(key)}</key>\n${i3}<value class="string">${xesc(val)}</value>\n${i2}</net.rptools.CaseInsensitiveHashMap_-KeyValue>\n${ind}</entry>`;
}
function mtCompare(kind) {
  const T = MT[kind],
    want = mtWant(kind);
  const byK = new Map();
  for (const en of T.p.ents) {
    const lk = en.key.toLowerCase();
    if (!byK.has(lk)) byK.set(lk, en);
  }
  const add = [],
    chg = [];
  let same = 0;
  for (const [k, v] of want) {
    const en = byK.get(k.toLowerCase());
    if (!en) add.push(k);
    else if (en.val !== v) chg.push(k);
    else same++;
  }
  const only = [],
    garbage = [];
  if (kind !== 'pokemon') {
    const wl = new Set([...want.keys()].map(k => k.toLowerCase()));
    for (const en of T.p.ents) {
      if (mtGarbage(en.key)) garbage.push(en.key);
      else if (!wl.has(en.key.toLowerCase()) && !mtProtected(en.key)) only.push(en.key);
    }
  }
  return { want, tok: T.p.ents.length, same, add, chg, only, garbage };
}
function mtBuildXml(kind) {
  const T = MT[kind],
    c = mtCompare(kind);
  const wl = new Map();
  for (const [k, v] of c.want) wl.set(k.toLowerCase(), v);
  const chg = new Set(c.chg.map(k => k.toLowerCase()));
  const del = new Set([...(T.opt.garbage ? c.garbage : []), ...(T.opt.delOnly ? c.only : [])]);
  const body = T.xml.slice(T.p.s, T.p.e);
  let out = '',
    last = 0;
  const done = new Set();
  for (const en of T.p.ents) {
    const gap = body.slice(last, en.a);
    last = en.b;
    const lk = en.key.toLowerCase();
    if (del.has(en.key)) {
      if (gap.trim()) out += gap;
      continue;
    }
    out += gap;
    if (chg.has(lk) && !done.has(lk)) {
      out += mtEntry(T.p.ind, en.key, wl.get(lk), en.str);
      done.add(lk);
    } else out += body.slice(en.a, en.b);
  }
  for (const k of c.add) out += '\n' + T.p.ind + mtEntry(T.p.ind, k, c.want.get(k));
  out += body.slice(last);
  return { xml: T.xml.slice(0, T.p.s) + out + T.xml.slice(T.p.e), c, del: del.size };
}
function loadJSZip() {
  return window.JSZip ? Promise.resolve(window.JSZip) : Promise.reject(new Error('nozip'));
}
async function mtLoad(file, hint) {
  let Z;
  try {
    Z = await loadJSZip();
  } catch (e) {
    return toast('압축 라이브러리를 불러오지 못했습니다');
  }
  try {
    const zip = await Z.loadAsync(await file.arrayBuffer());
    const path = Object.keys(zip.files).find(n => /(^|\/)content\.xml$/.test(n));
    if (!path) throw new Error('nocontent');
    const xml = await zip.file(path).async('string');
    mtSet(xml, { fileName: file.name, zip, path }, hint);
  } catch (e) {
    toast('rptok 파일을 읽지 못했습니다');
  }
}
function mtSet(xml, o, hint) {
  const name = xun((xml.match(/<name>([^<]*)<\/name>/) || [])[1] || '');
  const kind =
    Object.keys(MT_INFO).find(k => MT_INFO[k].lib.toLowerCase() === name.toLowerCase() || (MT_INFO[k].re && MT_INFO[k].re.test(name))) ||
    (MT_INFO[hint] ? hint : null);
  if (!kind) {
    toast(`「${name || o.fileName}」은(는) 연동하는 라이브러리 토큰이 아닙니다`);
    return null;
  }
  const p = mtParse(xml);
  if (!p) {
    toast('토큰 속성을 찾지 못했습니다');
    return null;
  }
  MT[kind] = Object.assign({ name, xml, p, opt: { garbage: true, delOnly: false } }, o);
  if (dbs.k === 'mt') renderDB();
  toast(`${MT_INFO[kind].lib} 토큰을 읽었습니다 · 속성 ${p.ents.length}개`);
  return kind;
}
function mtCard(kind) {
  const I = MT_INFO[kind],
    T = MT[kind];
  let body;
  if (!T)
    body = `<p class="small muted" style="margin:0">맵툴에서 「${I.lib}」 토큰을 오른쪽 클릭 → 「Save…」로 저장한 .rptok 파일을 올려 주세요.</p>`;
  else {
    const c = mtCompare(kind);
    const pk = kind === 'pokemon';
    body = `<div class="small"><b>${esc(T.fileName)}</b> <span class="muted">· ${esc(T.name)}</span></div>
  <div class="mtstat"><span>DB에서 만든 항목</span><b class="num">${c.want.size}</b><span>토큰 속성 수</span><b class="num">${c.tok}</b><span>내용 같음</span><b class="num">${c.same}</b><span>새로 추가</span><b class="num ${c.add.length ? 'okc' : ''}">${c.add.length}</b><span>내용 변경</span><b class="num ${c.chg.length ? 'okc' : ''}">${c.chg.length}</b>${pk ? '' : `<span>토큰에만 있음</span><b class="num">${c.only.length}</b><span>잘못 들어간 목록형 키</span><b class="num ${c.garbage.length ? 'warn' : ''}">${c.garbage.length}</b>`}</div>
  ${c.add.length || c.chg.length ? `<details><summary class="small">바뀌는 항목 ${c.add.length + c.chg.length}개 보기</summary><div class="small mtlist">${[...c.add.map(k => '＋ ' + k), ...c.chg.map(k => '～ ' + k)].slice(0, 400).map(esc).join('<br>')}</div></details>` : '<span class="small okc">DB와 토큰 내용이 같습니다.</span>'}
  ${
    pk
      ? ''
      : `${c.garbage.length ? `<label class="row small"><input type="checkbox" data-mtopt="${kind}.garbage" ${T.opt.garbage ? 'checked' : ''}>잘못 들어간 목록형 키 ${c.garbage.length}개 지우기</label>` : ''}
  ${c.only.length ? `<label class="row small"><input type="checkbox" data-mtopt="${kind}.delOnly" ${T.opt.delOnly ? 'checked' : ''}>DB에 없는 항목 ${c.only.length}개 지우기 <span class="faint">(영문·…List 같은 매크로용 키는 제외)</span></label><details><summary class="small">토큰에만 있는 항목</summary><div class="small mtlist">${c.only.map(esc).join(', ')}</div></details>` : ''}`
  }
  <div class="row"><button class="btn pri sm" data-mt="build" data-k="${kind}">갱신한 토큰 받기</button><button class="btn sm" data-mt="imp" data-k="${kind}" title="토큰에만 있는 항목을 이 제작기 DB로 가져옵니다">토큰 → DB 가져오기</button></div>`;
  }
  return `<div class="panel"><h3>${I.lib}</h3><span class="small muted" style="margin-top:-6px">${I.t}</span>${body}<div class="row"><label class="btn sm ${T ? 'ghost' : ''}" for="mtf-${kind}">${T ? '다른 파일 올리기' : '토큰 파일 올리기'}</label><input type="file" id="mtf-${kind}" data-mtfile="${kind}" accept=".rptok,.zip" hidden></div></div>`;
}
function mtPanel() {
  return `<div class="panel" style="margin-bottom:10px"><h3>맵툴 라이브러리 토큰 갱신<span class="sp"></span><label class="btn pri sm" for="mtf-all">토큰 파일 한꺼번에 올리기</label><input type="file" id="mtf-all" data-mtfile="auto" accept=".rptok,.zip" multiple hidden></h3>
 <p class="small muted" style="margin:0">맵툴에서 라이브러리 토큰을 .rptok으로 저장해 올리면, 이 제작기의 특성·소지품·올드 타입·기술 DB로 토큰 속성을 고친 새 토큰 파일을 만들어 줍니다. 토큰 이름(Lib:…)을 읽어 알맞은 칸에 자동으로 들어갑니다. 받은 파일을 맵툴 맵에 끌어다 놓고 예전 라이브러리 토큰을 지우면 갱신이 끝납니다. 매크로·이미지·다른 속성은 그대로 둡니다.</p></div>
 <div class="mtgrid">${Object.keys(MT_INFO).map(mtCard).join('')}</div>
 <div class="panel" style="margin-top:10px"><h3>문자열 직접 복사<span class="small muted" style="font-weight:400">토큰 파일 없이 맵툴의 DB 입력 매크로에 붙여넣을 때</span></h3><div class="exgrid">${dbs.ex.map(([l, v], n) => `<div><div class="row"><b class="small">${esc(l)}</b><span class="sp"></span><span class="small faint num">${v.length.toLocaleString()}자</span><button class="btn sm" data-copyex="${n}">복사</button></div><textarea readonly>${esc(v.length > 20000 ? v.slice(0, 20000) + ' …(복사 버튼을 쓰세요)' : v)}</textarea></div>`).join('')}</div></div>`;
}
async function saveBlob(name, blob, alt) {
  try {
    if (window.claude && claude.use) {
      const d = await claude.use('downloads');
      if (d) {
        try {
          await d.save({ filename: name, data: blob });
          return 'ok';
        } catch (e) {
          if (e && e.code === 'declined') return 'declined';
          if (!alt) throw e;
          await d.save({ filename: alt, data: blob });
          return 'alt';
        }
      }
    }
  } catch (e) {
    if (e && e.code === 'declined') return 'declined';
  }
  try {
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = name;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 4000);
    return 'ok';
  } catch (e) {
    return 'fail';
  }
}
async function mtDownload(kind) {
  const T = MT[kind];
  if (!T) return;
  const { xml, c, del } = mtBuildXml(kind);
  if (!c.add.length && !c.chg.length && !del) return toast('바뀐 내용이 없습니다');
  if (!T.zip) return toast('압축 파일 정보가 없습니다');
  T.zip.file(T.path, xml);
  const blob = await T.zip.generateAsync({ type: 'blob', compression: 'DEFLATE', mimeType: 'application/octet-stream' });
  const base = String(T.fileName || MT_INFO[kind].lib.replace(':', '_')).replace(/\.(rptok|zip)$/i, '');
  const r = await saveBlob(base + '.rptok', blob, base + '.rptok.zip');
  if (r === 'alt') toast('.rptok 저장이 막혀 .zip으로 받았습니다 · 끝의 .zip을 지우고 맵툴에 넣으세요');
  else if (r === 'ok') toast(`추가 ${c.add.length} · 변경 ${c.chg.length}${del ? ` · 삭제 ${del}` : ''} — 토큰을 만들었습니다`);
  else if (r === 'fail') toast('이 화면에서는 파일 저장을 할 수 없습니다');
}
async function mtImport(kind) {
  const T = MT[kind];
  if (!T) return;
  let rows = [],
    dk = kind === 'item' ? 'items' : kind === 'move' ? 'moves' : 'abil';
  if (kind === 'pokemon') {
    const g = k => {
      const e = T.p.ents.find(x => x.key.toLowerCase() === k);
      return (e && e.val) || '';
    };
    const n = g('list_trait_name').split(','),
      ef = g('list_trait_effect').split(';');
    if (n.length !== ef.length) return toast('list_trait_name과 list_trait_effect의 개수가 달라 가져올 수 없습니다');
    n.forEach((k, i) => {
      if (k.trim()) rows.push([k.trim(), ef[i]]);
    });
  } else for (const en of T.p.ents) if (en.val != null && !mtGarbage(en.key) && !mtProtected(en.key)) rows.push([en.key, en.val]);
  const br = v => String(v).replace(/<br\s*\/?>/gi, '\n');
  const parseItem = v => {
    const c = v.startsWith('소모품/');
    const p = (c ? v.slice(4) : v).split(';');
    return { c, eff: br(p[0] || ''), sock: p[1] || '', note: p[2] || '' };
  };
  const isNew = ([k]) => !idx[dk].has(k);
  const mvF = v => {
    const f = br(v)
      .split(';')
      .map(x => x.trim());
    while (f.length < 17) f.push('');
    return f;
  };
  const tmeta = (() => {
    if (kind !== 'move') return {};
    const e = T.p.ents.find(x => x.key === 'skill_meta');
    try {
      return e && e.val ? JSON.parse(e.val) : {};
    } catch (_) {
      return {};
    }
  })();
  const mvRow = (k, f, old) => {
    const r = old || [String(3), '#오리지널, #가져옴', k, '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', ''];
    [5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17].forEach((c, j) => (r[c] = f[j + 1]));
    const pm = /^위력 (.+?)(?: \/ (.*))?$/.exec(r[16]);
    if (r[7] === '0' && pm) {
      r[7] = pm[1];
      r[16] = pm[2] || '-';
    }
    r[18] = f[15];
    r[19] = f[16];
    const mm = tmeta[k];
    if (Array.isArray(mm)) {
      if (mm[0] != null) r[0] = String(mm[0]);
      if (mm[1]) r[1] = String(mm[1]);
      if (mm[2] != null) r[3] = String(mm[2]);
      if (mm[3] != null) r[4] = String(mm[3]);
    }
    return r;
  };
  const differs = ([k, v]) => {
    const r = idx[dk].get(k);
    if (!r) return false;
    if (dk === 'moves') return mvVal(r) !== v;
    return dk === 'abil' ? (kind === 'pokemon' ? mtSemi(r[2]) : mtTxt(r[2])) !== v : itemVal(r) !== v;
  };
  const nNew = rows.filter(isNew).length,
    nDiff = rows.filter(differs).length;
  if (!nNew && !nDiff) return toast('가져올 항목이 없습니다');
  const m = await new Promise(res => {
    const l = openModal(
      `<div class="mhead"><h2>토큰 → DB 가져오기</h2></div><div class="mbody"><p style="margin:0">${esc(T.name)}에서 DB에 없는 항목 <b>${nNew}</b>개, 내용이 다른 항목 <b>${nDiff}</b>개를 찾았습니다.</p><p class="small muted" style="margin:0">가져온 새 항목은 「오리지널」로 표시됩니다.${dk === 'abil' ? ' 특성 소켓 값은 비어 있으니 DB에서 채워 주세요.' : ''}</p></div><div class="mfoot"><button class="btn" data-m="">취소</button><span class="sp"></span><button class="btn" data-m="new" ${nNew ? '' : 'disabled'}>새 항목만 추가</button><button class="btn acc" data-m="all">다른 내용도 토큰 값으로 덮어쓰기</button></div>`,
      { onClose: () => res('') }
    );
    l.addEventListener('click', e => {
      const v = e.target.dataset.m;
      if (v == null) return;
      layers[layers.length - 1].onClose = null;
      closeModal();
      res(v);
    });
  });
  if (!m) return;
  let add = 0,
    chg = 0;
  for (const row of rows) {
    const [k, v] = row;
    if (isNew(row)) {
      if (dk === 'moves') S.db.moves.push(mvRow(k, mvF(v)));
      else if (dk === 'abil') S.db.abil.push(['', k, br(v), 'X', 'X']);
      else {
        const p = parseItem(v);
        S.db.items.push(['기타', k, '', p.c ? 'O' : '-', p.eff, p.sock, p.note]);
      }
      if (!S.custom[dk].includes(k)) S.custom[dk].push(k);
      add++;
      reindex();
    } else if (m === 'all' && differs(row)) {
      const r = idx[dk].get(k);
      if (dk === 'moves') mvRow(k, mvF(v), r);
      else if (dk === 'abil') r[2] = br(v);
      else {
        const p = parseItem(v);
        r[3] = p.c ? 'O' : r[3] === 'O' ? '-' : r[3];
        r[4] = p.eff;
        r[5] = p.sock;
        r[6] = p.note;
      }
      chg++;
    }
  }
  reindex();
  save(true);
  renderDB();
  toast(`DB에 추가 ${add} · 덮어쓰기 ${chg}`);
}

