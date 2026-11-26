/* ── 조각 06_ui_common.js — 공통 UI · 태그 툴바 · DB 피커 · DB 필터 ── */
/* ---------- 공통 UI ---------- */
function toast(m) {
  const t = $('#toast');
  t.textContent = m;
  t.classList.add('on');
  t.classList.remove('act');
  clearTimeout(toast.t);
  toast.t = setTimeout(() => t.classList.remove('on'), 1800);
}
/* 11-03 감우 (20번 검토 편의 11): 단추 달린 토스트 — 「실행 취소」 5초. 누르면 fn, 지나면 사라진다 */
function toastAct(m, label, fn, ms = 5000) {
  const t = $('#toast');
  t.innerHTML = `<span>${esc(m)}</span><button type="button" class="tact">${esc(label)}</button>`;
  t.classList.add('on', 'act');
  clearTimeout(toast.t);
  const b = t.querySelector('.tact');
  b.onclick = () => {
    t.classList.remove('on', 'act');
    clearTimeout(toast.t);
    try {
      fn();
    } catch (e) {
      console.warn('[toastAct]', e);
    }
  };
  toast.t = setTimeout(() => t.classList.remove('on', 'act'), ms);
}
/* 11-03 감우 (20번 검토 편의 4): 「⋯」 작은 메뉴 — 잘 안 쓰는 · 위험한 단추(이력 · 삭제)를 한 겹 안에. attrs 가 있으면 바깥 위임(data-act)으로, run 이 있으면 바로 */
function popMenu(anchor, items) {
  document.querySelectorAll('.popmenu').forEach(x => x.remove());
  const m = document.createElement('div');
  m.className = 'popmenu';
  m.setAttribute('role', 'menu');
  m.innerHTML = items
    .filter(Boolean)
    .map(
      x =>
        `<button type="button" role="menuitem" class="${x.danger ? 'danger' : ''}" ${x.attrs || ''} title="${esc(x.title || '')}">${x.label}</button>`
    )
    .join('');
  const host = anchor.parentNode;
  host.classList.add('pophost');
  host.appendChild(m);
  anchor.setAttribute('aria-expanded', 'true');
  {
    const L = Math.max(0, Math.min(anchor.offsetLeft + anchor.offsetWidth - m.offsetWidth, host.clientWidth - m.offsetWidth));
    m.style.left = L + 'px';
    m.style.right = 'auto';
    m.style.top = anchor.offsetTop + anchor.offsetHeight + 4 + 'px';
  } /* 누른 단추의 오른쪽 끝에 맞춰 바로 아래 */
  const close = () => {
    m.remove();
    host.classList.remove('pophost');
    anchor.setAttribute('aria-expanded', 'false');
    document.removeEventListener('pointerdown', onDoc, true);
    document.removeEventListener('keydown', onKey, true);
  };
  const onDoc = e => {
    if (!m.contains(e.target) && !anchor.contains(e.target)) close();
  };
  const onKey = e => {
    if (e.key === 'Escape') {
      e.stopPropagation();
      close();
      anchor.focus();
    }
  };
  setTimeout(() => {
    document.addEventListener('pointerdown', onDoc, true);
    document.addEventListener('keydown', onKey, true);
  }, 0);
  m.querySelectorAll('button').forEach((b, i) => {
    const it = items.filter(Boolean)[i];
    if (it.run)
      b.addEventListener('click', e => {
        e.stopPropagation();
        close();
        it.run();
      });
    else b.addEventListener('click', () => setTimeout(close, 0));
  });
  const f = m.querySelector('button');
  if (f && !matchMedia('(pointer:coarse)').matches) f.focus();
  return m;
}
const layers = [];
function openModal(html, { wide = false, onClose } = {}) {
  const l = document.createElement('div');
  l.className = 'layer';
  l.innerHTML = `<div class="mbox ${wide ? 'wide' : ''}" role="dialog" aria-modal="true" tabindex="-1">${html}</div>`;
  const opener = document.activeElement;
  MKROOT().appendChild(l);
  document.documentElement.classList.add('modal-on');
  layers.push({ l, onClose, opener });
  l.addEventListener('mousedown', e => {
    if (e.target === l) closeModal();
  });
  setTimeout(() => {
    const touch = matchMedia('(pointer:coarse)').matches;
    const f = $('[autofocus]', l) || (!touch && $('input,textarea', l));
    if (f && !(touch && f.matches('input,textarea'))) f.focus();
    else $('.mbox', l).focus();
  }, 30);
  return l;
}
function closeAllModals() {
  while (layers.length) closeModal();
}
function closeModal() {
  const o = layers.pop();
  if (!o) return;
  o.l.remove();
  if (!layers.length) document.documentElement.classList.remove('modal-on');
  o.onClose && o.onClose();
  if (o.opener && o.opener.isConnected && !layers.length)
    try {
      o.opener.focus({ preventScroll: true });
    } catch (e) {}
}
document.addEventListener('keydown', e => {
  if (e.key !== 'Escape') return;
  const m = $('.menu');
  if (m) {
    m.remove();
    return;
  }
  const tm = MTOP();
  if (tm && tm.classList.contains('tools-open')) {
    toolsOpen(false);
    return;
  }
  if (layers.length) closeModal();
});
/* 10-24 망령: 폴더 고르기 창 (cur = 지금 상위, skip = 이 폴더와 그 아래는 고를 수 없다). 돌려줌: 폴더 id · '' = 맨 위 · null = 취소 */
function askFolder(title, msg, cur, skip) {
  return new Promise(res => {
    const l = openModal(
      `<div class="mhead"><h2>${esc(title)}</h2></div><div class="mbody"><p class="small muted" style="margin:0 0 8px">${esc(msg)}</p><select data-af style="width:100%"><option value="">(맨 위 — 다른 폴더 밖)</option>${fTreeOpts(cur, skip)}</select></div><div class="mfoot"><span class="sp"></span><button class="btn ghost" data-x="no">취소</button><button class="btn pri" data-x="ok">옮기기</button></div>`
    );
    l.addEventListener('click', e => {
      const x = e.target.closest('[data-x]');
      if (!x) return;
      const v = x.dataset.x === 'ok' ? $('[data-af]', l).value : null;
      closeModal();
      res(v);
    });
  });
}
function ask(msg, okLabel = '확인', danger = true) {
  return new Promise(res => {
    const l = openModal(
      `<div class="mhead"><h2>확인</h2></div><div class="mbody"><p style="margin:0">${msg}</p></div><div class="mfoot"><span class="sp"></span><button class="btn" data-x="no" ${danger ? 'autofocus' : ''}>취소</button><button class="btn ${danger ? 'acc' : 'pri'}" data-x="ok" ${danger ? '' : 'autofocus'}>${okLabel}</button></div>`,
      { onClose: () => res(false) }
    );
    l.addEventListener('click', e => {
      const x = e.target.dataset.x;
      if (!x) return;
      layers[layers.length - 1].onClose = null;
      closeModal();
      res(x === 'ok');
    });
  });
}
async function copyStr(s) {
  try {
    await navigator.clipboard.writeText(s);
    toast('복사했습니다');
  } catch (e) {
    const l = openModal(
      `<div class="mhead"><h2>직접 복사</h2></div><div class="mbody"><p class="small muted" style="margin:0">자동 복사가 막혀 있습니다. 아래 내용을 선택해 복사하세요.</p><textarea rows="6" readonly>${esc(s)}</textarea></div><div class="mfoot"><span class="sp"></span><button class="btn" data-x>닫기</button></div>`
    );
    const ta = $('textarea', l);
    ta.select();
    l.addEventListener('click', e => {
      if (e.target.dataset.x != null) closeModal();
    });
  }
}
async function saveFile(filename, data) {
  try {
    if (window.claude && claude.use) {
      const d = await claude.use('downloads');
      if (d) {
        await d.save({ filename, data });
        return;
      }
    }
  } catch (e) {
    if (e && e.code === 'declined') return toast('저장을 취소했습니다');
  }
  try {
    const blob = data instanceof Blob ? data : new Blob([data]);
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 4000);
  } catch (e) {
    toast('이 화면에서는 파일 저장을 할 수 없습니다');
  }
}
function rich(s) {
  return esc(brN(s))
    .replace(/\\n|\n/g, '<br>')
    .replace(/【((?:[^【】]|【[^【】]*】)*)】/g, '<span class="tg">$1</span>');
}
const banRe = () => {
  try {
    return S.db.ban ? new RegExp(S.db.ban) : null;
  } catch (e) {
    return null;
  }
};
function banHits(s) {
  const re = banRe();
  if (!re || !s) return [];
  const g = new RegExp(re.source, 'g');
  return [...new Set(String(s).match(g) || [])];
}
/* 금지어 목록 ↔ S.db.ban 정규식 (10-23 망령: 표 탭 「금지어」 칸에서 보기 · 추가 · 고치기 · 지우기).
   한 단어 = 글자 그대로 (괄호 · 점도 글자). \ [ * + ? { 가 들어간 것만 정규식 조각으로 그대로 둔다 */
const BAN_RAW = /\\|\[|[*+?{]/;
function banSplit(src) {
  const out = [];
  let cur = '',
    bs = false,
    depth = 0;
  for (const ch of String(src || '')) {
    if (bs) {
      cur += '\\' + ch;
      bs = false;
      continue;
    }
    if (ch === '\\') {
      bs = true;
      continue;
    }
    if (ch === '[' || ch === '(') depth++;
    if (ch === ']' || ch === ')') depth = Math.max(0, depth - 1);
    if (ch === '|' && !depth) {
      out.push(cur);
      cur = '';
      continue;
    }
    cur += ch;
  }
  out.push(cur);
  return out
    .map(w => w.trim())
    .filter(Boolean)
    .map(w => {
      const plain = w.replace(/\\([^A-Za-z0-9])/g, '$1');
      return BAN_RAW.test(plain) || /\\[A-Za-z0-9]/.test(w) ? { w, raw: true } : { w: plain };
    });
}
function banJoin(list) {
  const seen = new Set();
  return list
    .filter(x => x && x.w && !seen.has(x.w) && seen.add(x.w))
    .map(x => (x.raw ? x.w : x.w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')))
    .join('|');
}
function banList() {
  return banSplit(S.db.ban);
}
function banSet(list) {
  S.db.ban = banJoin(list);
  save(true);
}
function banMark(s) {
  const re = banRe();
  if (!re || !s) return esc(s || '');
  const g = new RegExp(re.source, 'g');
  let out = '',
    i = 0;
  for (const m of String(s).matchAll(g)) {
    if (!m[0]) {
      g.lastIndex++;
      continue;
    }
    out += esc(s.slice(i, m.index)) + '<mark>' + esc(m[0]) + '</mark>';
    i = m.index + m[0].length;
  }
  return out + esc(s.slice(i));
}
/* 저장된 캐릭터 전체에서 금지어 찾기: 포켓몬 포텐셜 · 전용 · 트레이너 고유 */
function banScan() {
  const rows = [];
  for (const t of S.trainers) {
    const tn = t.name || '(이름 없는 트레이너)';
    (t.unique || []).forEach((u, i) => {
      if (u && u.eff) {
        const h = banHits(u.eff);
        if (h.length) rows.push({ t: tn, p: '트레이너 고유', n: u.name || '고유 ' + (i + 1), h, eff: u.eff });
      }
    });
    for (const p of t.pokemon || []) {
      const pn = p.name || p.species || '(포켓몬)';
      (p.pots || []).forEach((n, i) => {
        if (!n) return;
        const e = potEffOf(p, i);
        const h = banHits(e);
        if (h.length) rows.push({ t: tn, p: pn, n, h, eff: e });
      });
      for (const x of [p.excl, ...(p.exclX || [])])
        if (x && x.eff) {
          const h = banHits(x.eff);
          if (h.length) rows.push({ t: tn, p: pn, n: (x.name || '전용') + ' (전용)', h, eff: x.eff });
        }
    }
  }
  return rows;
}
let BANQ = '',
  BANED = -1;
function banBoxHTML() {
  const L = banList();
  const q = BANQ.trim();
  const vis = L.map((x, i) => [x, i]).filter(([x]) => !q || x.w.includes(q));
  return `<h3>금지어 <span class="small muted" style="font-weight:400">${L.length}개 · 포텐셜 효과 글에 들어가면 편집 창과 슬롯에 경고</span><span class="sp"></span><button class="btn sm ghost" data-bw="reset">기본값으로</button></h3>
  <div class="row" style="gap:6px;flex-wrap:wrap;margin-bottom:8px"><input type="text" id="banNew" placeholder="새 금지어 — 여러 개는 쉼표(,)나 줄바꿈으로" style="flex:1;min-width:220px"><button class="btn sm pri" data-bw="add">추가</button><input type="search" id="banQ" value="${esc(BANQ)}" placeholder="목록에서 찾기" style="width:160px"></div>
  <div class="banlist">${vis.map(([x, i]) => (i === BANED ? `<span class="banw ed"><input type="text" id="banEd" value="${esc(x.w)}" data-i="${i}"><button class="btn xs pri" data-bw="edok" data-i="${i}">확인</button><button class="btn xs ghost" data-bw="edx">취소</button></span>` : `<span class="banw ${x.raw ? 'raw' : ''}" title="${x.raw ? '정규식 조각 — 글자 그대로가 아니다' : '눌러서 고치기'}"><b data-bw="ed" data-i="${i}">${esc(x.w)}</b><button class="bx" data-bw="del" data-i="${i}" aria-label="지우기">✕</button></span>`)).join('') || `<span class="small muted">${q ? '찾는 금지어가 없습니다' : '금지어가 없습니다'}</span>`}</div>
  <div class="cgrid" style="margin-top:10px"><div><label class="lbl">문구로 확인하기<textarea id="banTest" rows="3" placeholder="효과 글을 붙여 넣으면 걸리는 표현에 표시가 붙습니다"></textarea></label><div id="banTestOut" class="small" style="margin-top:4px"></div></div>
   <div><div class="row" style="gap:6px"><b class="small">내 캐릭터에서 찾기</b><span class="sp"></span><button class="btn sm" data-bw="scan">찾기</button></div><div id="banScanOut" class="small muted" style="margin-top:4px">저장된 트레이너 · 포켓몬의 포텐셜 · 전용 · 고유 효과 글을 훑습니다.</div></div></div>
  <details style="margin-top:8px"><summary class="small">고급: 정규식 그대로 고치기</summary><textarea data-p="db.ban" id="banRawTa" rows="4" class="mono" style="font-size:12px;width:100%">${esc(S.db.ban)}</textarea><div class="small muted">| 로 나눈 정규식입니다. 위 목록에서 고치면 괄호 · 점 같은 글자는 알아서 글자 그대로 처리됩니다.</div></details>`;
}
function banRefresh(keepFocus) {
  const b = $('#banBox');
  if (!b) return;
  b.innerHTML = banBoxHTML();
  if (keepFocus) {
    const q = $('#banQ');
    if (q) {
      q.focus();
      q.setSelectionRange(q.value.length, q.value.length);
    }
  }
  const e = $('#banEd');
  if (e) {
    e.focus();
    e.select();
  }
}

/* ---------- 태그 툴바 ---------- */
function tagbarHTML() {
  return `<div class="tagbar" data-tagbar>${S.db.tags.map((t, i) => `<button type="button" data-tagi="${i}" title="${esc(t[1])}">【${esc(t[0])}】${t[2] ? ' ▾' : ''}</button>`).join('')}<span class="sep"></span>
 <button type="button" data-ins="/" title="태그와 본문 구분">/</button><button type="button" data-ins="「」" title="용어 괄호">「」</button><button type="button" data-ins="『』" title="포텐셜 괄호">『』</button><button type="button" data-ins="\n①" title="효과 번호">①</button><button type="button" data-ins="\n②">②</button><button type="button" data-ins="\n③">③</button><span class="sep"></span><button type="button" data-tagfix title="줄 앞의 태그를 규칙 순서로 정렬하고 빠진 「/」를 보충합니다">태그 순서 정리</button></div><div class="taghelp" data-taghelp>태그를 누르면 커서 위치에 들어가고, 여기에 그 태그의 설명이 나옵니다.</div>`;
}
function insertAt(ta, s) {
  if (!ta) return;
  const a = ta.selectionStart ?? ta.value.length,
    b = ta.selectionEnd ?? a;
  let ins = s;
  if (s === '「」' || s === '『』') {
    ins = s[0] + ta.value.slice(a, b) + s[1];
  }
  ta.value = ta.value.slice(0, a) + ins + ta.value.slice(b);
  const pos = (s === '「」' || s === '『』') && a === b ? a + 1 : a + ins.length;
  ta.focus();
  ta.setSelectionRange(pos, pos);
  ta.dispatchEvent(new Event('input', { bubbles: true }));
}
function bindTagbar(root, getTa) {
  root.addEventListener('mouseover', e => {
    const b = e.target.closest('[data-tagi]');
    if (b) {
      const h = $('[data-taghelp]', root);
      if (h) h.innerHTML = `<span class="tg">${esc(S.db.tags[+b.dataset.tagi][0])}</span> ${esc(S.db.tags[+b.dataset.tagi][1])}`;
    }
  });
  root.addEventListener('mousedown', e => {
    if (e.target.closest('[data-tagi],[data-ins],[data-tagfix]')) e.preventDefault();
  });
  root.addEventListener('click', e => {
    const b = e.target.closest('[data-tagi],[data-ins],[data-tagfix]');
    if (!b) return;
    const ta = getTa();
    if (b.dataset.tagfix != null) {
      if (!ta) return;
      const v = tagFix(ta.value);
      if (v !== ta.value) {
        ta.value = v;
        ta.dispatchEvent(new Event('input', { bubbles: true }));
        toast('태그 순서를 정리했습니다');
      } else toast('고칠 태그가 없습니다');
      return;
    }
    if (b.dataset.ins != null) return insertAt(ta, b.dataset.ins);
    const t = S.db.tags[+b.dataset.tagi];
    {
      const h = $('[data-taghelp]', root);
      if (h) h.innerHTML = `<span class="tg">${esc(t[0])}</span> ${esc(t[1])}`;
    }
    if (!t[2]) return insertAt(ta, '【' + t[0] + '】');
    $$('.menu').forEach(m => m.remove());
    const m = document.createElement('div');
    m.className = 'menu';
    m.innerHTML = t[2]
      .split('|')
      .map(v => `<button type="button" data-v="${esc(v)}">【${esc(v)}】</button>`)
      .join('');
    MKROOT().appendChild(m);
    const r = b.getBoundingClientRect();
    m.style.left = Math.min(r.left, innerWidth - 190) + 'px';
    m.style.top = r.bottom + 4 + 'px';
    m.addEventListener('mousedown', ev => ev.preventDefault());
    m.addEventListener('click', ev => {
      const v = ev.target.dataset.v;
      if (v != null) {
        insertAt(ta, '【' + v + '】');
        m.remove();
      }
    });
    setTimeout(
      () =>
        document.addEventListener('click', function off(ev) {
          if (!m.contains(ev.target)) {
            m.remove();
            document.removeEventListener('click', off);
          }
        }),
      0
    );
  });
}

/* 태그 순서 규칙: 태그는 연속해서 쓰고 마지막에 「/」, 순서는 태그 사전 순 */
function tagOrderIdx(tag) {
  const tags = S.db.tags.map(t => t[0]);
  let i = tags.indexOf(tag);
  if (i >= 0) return i;
  if (/^(\d+|N)\s*\/\s*시$/.test(tag)) return tags.indexOf('N/시');
  if (/^(지시|육성|통솔|능력)\s*:/.test(tag)) return tags.indexOf('자질');
  return tags.indexOf(tag.replace(/\s*\(.*$/, '').trim());
}
const LINE_RE = /^(\s*[①-⑳]?\s*)((?:【(?:[^【】]|【[^【】]*】)*】\s*)+)([\s\S]*)$/;
function lineTags(m) {
  return [...m[2].matchAll(/【((?:[^【】]|【[^【】]*】)*)】/g)].map(x => x[1].trim());
}
function tagLint(s) {
  const msg = [];
  String(s || '')
    .split('\n')
    .forEach((ln, n) => {
      const m = ln.match(LINE_RE);
      if (!m) return;
      const tags = lineTags(m);
      const ix = tags.map(tagOrderIdx);
      const unk = tags.filter((t, i) => ix[i] < 0);
      const L = String(s).includes('\n') ? n + 1 + '줄: ' : '';
      if (unk.length) msg.push(L + '사전에 없는 태그 ' + unk.map(t => '【' + t + '】').join(''));
      const known = ix.filter(i => i >= 0);
      if (known.some((v, i) => i && v < known[i - 1])) msg.push(L + '태그 순서가 규칙과 다릅니다');
      if (m[3].trim() && !m[3].startsWith('/')) msg.push(L + '태그 뒤에 「/」가 없습니다');
    });
  return msg;
}
function tagFix(s) {
  return String(s || '')
    .split('\n')
    .map(ln => {
      const m = ln.match(LINE_RE);
      if (!m) return ln;
      const sorted = lineTags(m)
        .map((t, i) => ({ t, i, k: tagOrderIdx(t) }))
        .sort((a, b) => (a.k < 0 ? 999 : a.k) - (b.k < 0 ? 999 : b.k) || a.i - b.i)
        .map(x => '【' + x.t + '】')
        .join('');
      let rest = m[3];
      if (rest.trim() && !rest.startsWith('/')) rest = '/' + rest.replace(/^\s+/, '');
      return m[1] + sorted + rest;
    })
    .join('\n');
}
function lintHTML(s) {
  const l = tagLint(s);
  return l.length ? `<div class="taglint">${l.map(esc).join('<br>')} · 「태그 순서 정리」 버튼으로 고칠 수 있습니다</div>` : '';
}

/* ---------- DB 검색 피커 ---------- */
function rowHTML(kind, r, sel) {
  const D = DBS[kind];
  if (kind === 'moves')
    return `<div tabindex="0" role="button" data-kbd class="pkr ${sel ? 'sel' : ''}" data-pick="${esc(r[2])}"><div><div class="t1">${tchip(r[5])}<b>${esc(r[2])}</b><span class="kindb">${esc(r[6])}</span>${S.custom.moves.includes(r[2]) ? '<span class="kindb">오리지널</span>' : ''}${mvOldOnly(r) ? '<span class="kindb">올드 전용</span>' : ''}</div><div class="t2">${rich(r[13])}</div></div><div class="meta">${rangeGrid(r[9])}<span>위력 ${esc(r[7])} · 명중 ${esc(r[8])}</span><span>${esc(r[9])} · 우선도 ${esc(r[11])} · 소켓 <b>${esc(r[0])}</b></span></div></div>`;
  if (kind === 'abil')
    return `<div tabindex="0" role="button" data-kbd class="pkr ${sel ? 'sel' : ''}" data-pick="${esc(r[1])}"><div><div class="t1"><b>${esc(r[1])}</b>${r[3] === 'O' ? '<span class="kindb">틀깨기 대상</span>' : ''}${r[4] === 'O' ? '<span class="kindb">방호</span>' : ''}${abKindChip(r)}${fxRmChip('trait', r[1])}</div><div class="t2">${rich(r[2])}</div>${r[6] ? `<div class="t2 muted small">비고 · ${esc(r[6])}</div>` : ''}</div><div class="meta">소켓 <b>${esc(r[0])}</b></div></div>`;
  if (kind === 'items')
    return `<div tabindex="0" role="button" data-kbd class="pkr ${sel ? 'sel' : ''}" data-pick="${esc(r[1])}"><div><div class="t1"><b>${esc(r[1])}</b><span class="kindb">${esc(r[0])}</span>${r[3] === 'O' ? '<span class="kindb">소모</span>' : ''}${ilockChip(r[1])}${fxRmChip('item', r[1])}</div><div class="t2">${rich(r[4])}${r[6] && r[6] !== '-' ? ` <span class="faint">· ${esc(r[6])}</span>` : ''}</div></div><div class="meta">소켓 <b>${esc(r[5])}</b></div></div>`;
  if (kind === 'old') {
    const tot = r.slice(11, 17).reduce((a, b) => a + (+b || 0), 0);
    return `<div tabindex="0" role="button" data-kbd class="pkr ${sel ? 'sel' : ''}" data-pick="${esc(r[1])}"><div><div class="t1">${tchip(r[3])}${tchip(r[4])}<b>${esc(r[1])}</b>${r[10] === 'O' ? '<span class="kindb">메가</span>' : ''}<span class="kindb">${esc(r[0])}</span></div><div class="t2">${[
      r[5],
      r[6],
      r[7]
    ]
      .filter(a => a && a !== '-')
      .map(esc)
      .join(
        ' / '
      )} · 알그룹 ${esc(r[8])}${r[9] && r[9] !== '-' ? ' / ' + esc(r[9]) : ''} <span class="faint">${esc(r[2])}</span></div></div><div class="meta num"><span>${r.slice(11, 17).map(esc).join('-')}</span><span>합 <b>${tot}</b>${String(r[17] ?? '').trim() ? ` · 프라이드 <b>${esc(r[17])}</b>` : ''}</span></div></div>`;
  }
  if (kind === 'points')
    return `<div tabindex="0" role="button" data-kbd class="pkr" data-pick="${esc(r[4])}"><div><div class="t1"><b>${esc(r[4])}</b><span class="kindb">${esc(r[1])}</span></div><div class="t2">${esc(r[5])}</div></div><div class="meta">${esc(r[3])} −${esc(r[6])}</div></div>`;
  return `<div tabindex="0" role="button" data-kbd class="pkr ${sel ? 'sel' : ''}" data-pick="${esc(r[1])}"><div><div class="t1"><span class="kindb">${esc(r[0])}</span><b>${esc(r[1])}</b>${kind === 'pots' ? fxRmChip('pot', r[1]) : ''}</div><div class="t2">${rich(r[2])}${r[3] ? ` <span class="faint">· ${esc(r[3])}</span>` : ''}</div></div><div class="meta"></div></div>`;
}
/* ---------- 소지품 해금 표: [장소, 품목(쉼표), 조건 메모, '열림'|'잠김'] ---------- */
function ilockMap() {
  const mp = new Map();
  for (const r of S.db.ilock || []) {
    if (!r) continue;
    for (const n of String(r[1] || '')
      .split(/[,，·]/)
      .map(x => x.trim())
      .filter(Boolean))
      mp.set(n, { place: String(r[0] || ''), cond: String(r[2] || ''), open: r[3] === '열림' });
  }
  return mp;
}
const ilockOf = n => (n ? ilockMap().get(String(n).trim()) || null : null);
const ilockChip = n => {
  const l = ilockOf(n);
  return l
    ? `<span class="kindb ${l.open ? 'lk-open' : 'lk-lock'}" title="${esc(l.cond || '')}">${l.open ? '열림' : '잠김'} · ${esc(l.place)}</span>`
    : '';
};
/* ---------- DB 필터 ---------- */
const numOf = v => (String(v ?? '').match(/-?\d+(\.\d+)?/g) || []).map(Number);
const splitTags = v =>
  String(v || '')
    .split(/[,，/]/)
    .map(x => x.trim())
    .filter(x => x && x !== '-');
const hashTags = v => String(v || '').match(/#[^\s,#]+/g) || [];
const abTags = v => [
  ...new Set(
    (String(v || '').match(/【(?:[^【】]|【[^【】]*】)*】/g) || []).map(x =>
      x
        .slice(1, -1)
        .replace(/\s*\(.*$/, '')
        .replace(/^\d+\s*\/\s*시$/, 'N/시')
        .trim()
    )
  )
];
const potGroup = k =>
  String(k || '')
    .replace(/^\d+(\.\d+)*\.\s*/, '')
    .trim() || '-';
const potGroupCode = k => {
  const m = String(k || '').match(/^(\d+)/);
  return m ? +m[1] : 9999;
};
const FILT = {
  moves: [
    { id: 'sock', label: '소켓', get: r => [r[0]], sort: 'num' },
    { id: 'acc', label: '명중', get: r => [r[8]], sort: 'numd' },
    {
      id: 'prio',
      label: '우선도',
      get: r => [r[11]],
      sort: 'num',
      extra: [
        ['>0', '＋ 선공 (1 이상)'],
        ['<0', '－ 후공 (-1 이하)']
      ]
    },
    { id: 'tagc', label: '분류 태그', get: r => splitTags(r[12]), sort: 'cnt' },
    { id: 'htag', label: '# 태그', get: r => hashTags(r[1]), sort: 'cnt' },
    { id: 'rng', label: '범위', get: r => [String(r[9]).trim()], sort: 'cnt' },
    { id: 'con', label: '접촉', get: r => [r[10]], sort: 'cnt' }
  ],
  abil: [
    { id: 'sock', label: '소켓', get: r => [r[0]], sort: 'num' },
    { id: 'tag', label: '태그', get: r => abTags(r[2]), sort: 'cnt', none: '태그 없음' },
    { id: 'brk', label: '틀깨기 대상', get: r => [r[3]], sort: 'cnt' },
    { id: 'prot', label: '방호 특성', get: r => [r[4]], sort: 'cnt' },
    { id: 'kind', label: '구분', get: r => [{ gm: 'GM 전용', old: '올타 전용' }[abKind(r)] || '범용'], sort: 'cnt' }
  ] /* 11-06 12:34 망령 「구분도 소켓 · 태그처럼 항목 필터로 · 체크 말고」 */,
  pots: [{ id: 'grp', label: '큰 종류', get: r => [potGroup(r[0])], sort: 'code' }],
  items: [
    { id: 'sock', label: '소켓', get: r => [r[5]], sort: 'num' },
    { id: 'cons', label: '소모', get: r => [r[3]], sort: 'cnt' },
    {
      id: 'lock',
      label: '해금',
      get: r => {
        const l = ilockOf(r[1]);
        return [l ? (l.open ? '특제 · 열림' : '특제 · 잠김') : '기본'];
      },
      sort: 'cnt',
      when: () => (S.db.ilock || []).length > 0
    },
    {
      id: 'place',
      label: '장소',
      get: r => {
        const l = ilockOf(r[1]);
        return l ? [l.place] : [];
      },
      sort: 'cnt',
      none: '기본 (장소 없음)',
      when: () => (S.db.ilock || []).length > 0
    }
  ],
  old: [
    { id: 'mega', label: '메가', get: r => [r[10] === 'O' ? '메가진화' : '일반'], sort: 'cnt' },
    { id: 't', label: '타입', get: r => [r[3], r[4]].filter(x => x && x !== '-'), sort: 'cnt' },
    { id: 'egg', label: '알그룹', get: r => [r[8], r[9]].filter(x => x && x !== '-'), sort: 'cnt' }
  ]
};
function xfOptions(kind, F) {
  const cnt = new Map(),
    code = new Map();
  for (const r of S.db[kind]) {
    if (r[DBS[kind].key] === '') continue;
    const vs = F.get(r);
    if (!vs.length && F.none) cnt.set('∅', (cnt.get('∅') || 0) + 1);
    for (const v of vs) {
      if (v === '' || v == null) continue;
      cnt.set(v, (cnt.get(v) || 0) + 1);
      if (F.sort === 'code') {
        const c = potGroupCode(r[0]);
        code.set(v, Math.min(code.get(v) ?? 9999, c));
      }
    }
  }
  const ks = [...cnt.keys()];
  const n = v => {
    const x = numOf(v);
    return x.length ? x[0] : 1e9;
  };
  if (F.sort === 'num') ks.sort((a, b) => n(a) - n(b) || KO.compare(a, b));
  else if (F.sort === 'numd') ks.sort((a, b) => n(b) - n(a));
  else if (F.sort === 'code') ks.sort((a, b) => code.get(a) - code.get(b) || KO.compare(a, b));
  else ks.sort((a, b) => cnt.get(b) - cnt.get(a));
  return ks.map(k => [k, (k === '∅' ? F.none : k === '0' && F.id === 'acc' ? '0 (필중·변화)' : k) + ` (${cnt.get(k)})`]);
}
function xfActive(kind, st) {
  return (
    (FILT[kind] || []).some(F => st.f && st.f[F.id]) ||
    (kind === 'moves' && ((st.pmin !== '' && st.pmin != null) || (st.pmax !== '' && st.pmax != null)))
  );
}
function xfHTML(kind, st) {
  st.f = st.f || {};
  const F = (FILT[kind] || []).filter(x => !x.when || x.when());
  return (
    F.map(
      x =>
        `<select data-xf="${x.id}" title="${esc(x.label)}" class="${st.f[x.id] ? 'xfon' : ''}"><option value="">${esc(x.label)}: 전체</option>${(x.extra || []).map(([v, l]) => `<option value="${esc(v)}" ${st.f[x.id] === v ? 'selected' : ''}>${esc(x.label + ': ' + l)}</option>`).join('')}${xfOptions(
          kind,
          x
        )
          .map(([v, l]) => `<option value="${esc(v)}" ${st.f[x.id] === v ? 'selected' : ''}>${esc(x.label + ': ' + l)}</option>`)
          .join('')}</select>`
    ).join('') +
    (kind === 'moves'
      ? `<span class="row small xfpow" style="gap:4px;flex-wrap:nowrap">위력<input data-pr="pmin" inputmode="numeric" value="${esc(st.pmin ?? '')}" placeholder="최소" style="width:58px">~<input data-pr="pmax" inputmode="numeric" value="${esc(st.pmax ?? '')}" placeholder="최대" style="width:58px"></span>`
      : '') +
    (xfActive(kind, st) ? `<button type="button" class="btn sm ghost" data-xfreset>필터 초기화</button>` : '')
  );
}
function filterRows(kind, st) {
  const D = DBS[kind];
  const q = String(st.q || '')
    .trim()
    .toLowerCase();
  const F = (FILT[kind] || []).filter(x => st.f && st.f[x.id]);
  const pmin = st.pmin !== '' && st.pmin != null && !isNaN(+st.pmin) ? +st.pmin : null,
    pmax = st.pmax !== '' && st.pmax != null && !isNaN(+st.pmax) ? +st.pmax : null;
  return rankSort(
    S.db[kind].filter(r => {
      if (r[D.key] === '') return false;
      if (kind !== 'abil' && st.hideOrig && !st.orig && !st.mine && S.custom[kind].includes(r[D.key]) && !(st.has && st.has(r[D.key]))) return false;
      if (kind === 'abil' && st.hideOrig && !st.orig && abKind(r) === 'gm' && !(st.f && st.f.kind === 'GM 전용') && !(st.has && st.has(r[1])))
        return false; /* 11-06 망령: 특성은 오리지널 대신 「GM 전용」을 숨긴다 (예전 시즌 오리지널은 구분이 없어서) */ /* 10-26 망령: 포켓몬 만들 때 특성 목록엔 오리지널을 「오리지널 보기」를 눌러야 보인다 · 10-27 기술도 같게 (이미 든 기술은 보인다) */
      if (kind === 'moves' && st.hideOldOnly && !st.oldShow && mvOldOnly(r) && !(st.has && st.has(r[2]))) return false;
      if (
        kind === 'abil' &&
        st.hideOldOnly &&
        !st.oldShow &&
        abKind(r) === 'old' &&
        !(st.f && st.f.kind === '올타 전용') &&
        !(st.has && st.has(r[1]))
      )
        return false; /* 11-06: 올드 타입이 아닌 포켓몬에겐 올타 전용 특성도 숨긴다 */ /* 10-27 망령: 올드 타입이 아닌 포켓몬에겐 올드 타입 전용 기술을 숨긴다 */
      if (st.type && kind === 'moves' && !String(r[5]).startsWith(st.type)) return false;
      if (st.cat && kind === 'moves' && r[6] !== st.cat) return false;
      if (st.kind && (kind === 'pots' || kind === 'items' || kind === 'old') && r[0] !== st.kind) return false;
      for (const x of F) {
        const v = st.f[x.id];
        if (x.id === 'prio' && (v === '>0' || v === '<0')) {
          const ns = numOf(r[11]);
          if (!ns.some(n => (v === '>0' ? n > 0 : n < 0))) return false;
          continue;
        }
        const vs = x.get(r);
        if (v === '∅') {
          if (vs.length) return false;
          continue;
        }
        if (!vs.includes(v)) return false;
      }
      if (kind === 'moves' && (pmin != null || pmax != null)) {
        const ns = numOf(r[7]);
        if (!ns.length) return false;
        const lo = Math.min(...ns),
          hi = Math.max(...ns);
        if (pmin != null && hi < pmin) return false;
        if (pmax != null && lo > pmax) return false;
      }
      if (st.mine && kind !== 'abil' && !S.custom[kind].includes(r[D.key])) return false; /* 특성은 「오리지널만」 대신 「구분」 필터 */
      if (!q) return true;
      if (st.nameOnly) return String(r[D.key]).toLowerCase().includes(q);
      return r.join(' ').toLowerCase().includes(q);
    }),
    q && !st.noRank ? qRank(kind, q) : null
  );
}
/* 11-03 감우 (20번 검토 편의 2): 검색어가 있으면 이름 완전 일치 → 이름 시작 → 이름 포함 → 효과문만 맞는 것 순 (같은 등급 안에서는 원래 순서) */
function qRank(kind, q) {
  const D = DBS[kind];
  return r => {
    const n = String(r[D.key]).toLowerCase();
    return n === q ? 0 : n.startsWith(q) ? 1 : n.includes(q) ? 2 : 3;
  };
}
function rankSort(rows, rk) {
  if (!rk) return rows;
  return rows
    .map((r, i) => [rk(r), i, r])
    .sort((a, b) => a[0] - b[0] || a[1] - b[1])
    .map(x => x[2]);
}
function kindSelect(kind, st, attr) {
  const ks = [...new Set(S.db[kind].map(r => r[0]))].filter(x => x !== '');
  const g = kind === 'pots' && st.f && st.f.grp ? ks.filter(k => potGroup(k) === st.f.grp) : ks;
  return `<select ${attr} style="max-width:240px"><option value="">${kind === 'old' ? '모든 지역' : kind === 'pots' ? '세부 종류: 전체' : '모든 종류'}</option>${g.map(k => `<option value="${esc(k)}" ${st.kind === k ? 'selected' : ''}>${esc(k)}</option>`).join('')}</select>`;
}
function pickerFilters(kind, st) {
  const chk = `<label class="row small"><input type="checkbox" data-fn ${st.nameOnly ? 'checked' : ''}>이름만 검색</label>${kind === 'abil' ? '' : `<label class="row small"><input type="checkbox" data-fm ${st.mine ? 'checked' : ''}>오리지널만</label>`}`;
  if (kind === 'moves')
    return `<div class="tchips">${S.db.types
      .filter(t => !['-', '와일드', '다크'].includes(t[0]))
      .map(
        t =>
          `<button type="button" data-ft="${esc(t[0])}" class="${st.type === t[0] ? 'on' : ''}" style="background:${safeCss(t[1])};color:${safeCss(t[2])}">${esc(t[0])}</button>`
      )
      .join('')}</div>
  <div class="row xfrow"><select data-fc><option value="">분류: 전체</option>${['물리', '특수', '변화'].map(c => `<option ${st.cat === c ? 'selected' : ''}>${c}</option>`).join('')}</select>${xfHTML(kind, st)}</div><div class="row">${chk}</div>`;
  if (kind === 'pots' || kind === 'items' || kind === 'old')
    return `<div class="row xfrow">${kind === 'pots' ? xfHTML(kind, st) + kindSelect(kind, st, 'data-fk') : kindSelect(kind, st, 'data-fk') + xfHTML(kind, st)}${chk}</div>`;
  return `<div class="row xfrow">${xfHTML(kind, st)}${chk}</div>`;
}
function mountPicker(root, kind, st, { chosen, onPick }) {
  const draw = () => {
    const rows = filterRows(kind, st);
    const ch = chosen ? chosen() : new Set();
    keepFocus(root, () => {
      $('[data-pkfilters]', root).innerHTML = pickerFilters(kind, st);
    });
    const fc = fCount(kind, st);
    const fb = $('[data-pkfn]', root);
    if (fb) fb.textContent = fc ? ' ' + fc : '';
    $('[data-pkcount]', root).textContent = `${rows.length}건`;
    $('[data-pkrows]', root).innerHTML =
      rows
        .slice(0, st.lim)
        .map(r => rowHTML(kind, r, ch.has(r[DBS[kind].key])))
        .join('') +
      (rows.length > st.lim
        ? `<button type="button" class="btn ghost" data-more style="margin:6px">더 보기 (${rows.length - st.lim}건 남음)</button>`
        : '') +
      (rows.length ? '' : '<div class="empty" style="border:0">검색 결과가 없습니다. 아래에서 오리지널로 직접 만들 수 있습니다.</div>');
  };
  root.addEventListener('input', e => {
    if (e.target.matches('[data-pkq]')) {
      st.q = e.target.value;
      st.lim = 120;
      clearTimeout(st.t);
      st.t = setTimeout(draw, 120);
    } else if (e.target.matches('[data-pr]')) {
      st[e.target.dataset.pr] = e.target.value.trim();
      st.lim = 120;
      clearTimeout(st.t);
      st.t = setTimeout(draw, 300);
    }
  });
  root.addEventListener('change', e => {
    const t = e.target;
    if (t.matches('[data-fc]')) st.cat = t.value;
    else if (t.matches('[data-fk]')) st.kind = t.value;
    else if (t.matches('[data-fn]')) st.nameOnly = t.checked;
    else if (t.matches('[data-fm]')) st.mine = t.checked;
    else if (t.matches('[data-xf]')) {
      st.f = st.f || {};
      st.f[t.dataset.xf] = t.value;
      if (t.dataset.xf === 'grp') st.kind = '';
    } else if (t.matches('[data-pr]')) st[t.dataset.pr] = t.value.trim();
    else return;
    st.lim = 120;
    draw();
  });
  root.addEventListener('click', e => {
    const ft = e.target.closest('[data-ft]');
    if (ft) {
      st.type = st.type === ft.dataset.ft ? '' : ft.dataset.ft;
      draw();
      return;
    }
    const tg = e.target.closest('[data-pkftog]');
    if (tg) {
      const w = $('[data-pkfwrap]', root);
      const on = !w.classList.contains('on');
      w.classList.toggle('on', on);
      tg.setAttribute('aria-expanded', on);
      return;
    }
    const oo = e.target.closest('[data-pkold]');
    if (oo) {
      st.oldShow = !st.oldShow;
      oo.classList.toggle('on', st.oldShow);
      oo.setAttribute('aria-pressed', st.oldShow ? 'true' : 'false');
      st.lim = 120;
      draw();
      return;
    }
    const og = e.target.closest('[data-pkorig]');
    if (og) {
      st.orig = !st.orig;
      og.classList.toggle('on', st.orig);
      og.setAttribute('aria-pressed', st.orig ? 'true' : 'false');
      st.lim = 120;
      draw();
      return;
    }
    if (e.target.closest('[data-more]')) {
      st.lim += 200;
      draw();
      return;
    }
    if (e.target.closest('[data-xfreset]')) {
      st.f = {};
      st.pmin = '';
      st.pmax = '';
      st.kind = '';
      st.cat = '';
      st.type = '';
      draw();
      return;
    }
    const r = e.target.closest('[data-pick]');
    if (r) {
      onPick(r.dataset.pick);
      draw();
    }
  });
  draw();
  return draw;
}
function pickerShell(kind, st) {
  return `<div class="row pkhead"><input data-pkq type="search" enterkeyhint="search" placeholder="${DBS[kind].t} 이름·효과 검색" value="${esc(st.q)}" style="flex:1" autofocus><span class="small muted" data-pkcount></span>${st.hideOrig ? `<button type="button" class="btn sm ftog${st.orig ? ' on' : ''}" data-pkorig aria-pressed="${st.orig ? 'true' : 'false'}" title="${kind === 'abil' ? 'GM 전용 특성도' : '오리지널 ' + DBS[kind].t + '도'} 목록에 보이기">${kind === 'abil' ? 'GM 전용 보기' : '오리지널 보기'}</button>` : ''}${st.hideOldOnly ? `<button type="button" class="btn sm ftog${st.oldShow ? ' on' : ''}" data-pkold aria-pressed="${st.oldShow ? 'true' : 'false'}" title="『올드 타입』 전용 ${kind === 'abil' ? '특성' : '기술'}도 목록에 보이기 (이 포켓몬은 올드 타입 계열이 아님)">올드 전용 보기</button>` : ''}<button type="button" class="btn sm ftog" data-pkftog aria-expanded="false">필터<b class="fn" data-pkfn></b></button></div><div class="fwrap" data-pkfwrap><div data-pkfilters></div></div><div class="pkrows" data-pkrows></div>`;
}
/* 필터를 다시 그려도 쓰던 칸에 초점과 커서를 돌려놓는다 */
function keepFocus(root, fn) {
  const a = document.activeElement;
  let key = null,
    ss = null,
    se = null;
  if (a && root.contains(a)) {
    for (const at of ['data-xf', 'data-pr', 'data-fc', 'data-fk', 'data-fn', 'data-fm', 'data-ft', 'data-pkq'])
      if (a.hasAttribute(at)) {
        key = `[${at}${a.getAttribute(at) ? `="${CSS.escape(a.getAttribute(at))}"` : ''}]`;
        break;
      }
    if (!key && a.id) key = '#' + CSS.escape(a.id);
    try {
      ss = a.selectionStart;
      se = a.selectionEnd;
    } catch (e) {}
  }
  fn();
  if (!key) return;
  const n = root.querySelector(key);
  if (n && n !== document.activeElement) {
    n.focus({ preventScroll: true });
    try {
      if (ss != null) n.setSelectionRange(ss, se);
    } catch (e) {}
  }
}
function fCount(kind, st) {
  let n = Object.values(st.f || {}).filter(Boolean).length;
  for (const k of ['type', 'cat', 'kind']) if (st[k]) n++;
  if (st.pmin !== '' && st.pmin != null) n++;
  if (st.pmax !== '' && st.pmax != null) n++;
  if (st.mine && kind !== 'abil') n++;
  return n;
}
function openPicker(
  kind,
  { title, multi, chosen, onPick, onRemove, onOrig, hideOrig = kind === 'abil' || kind === 'moves', hideOldOnly = false } = {}
) {
  const st = {
    q: '',
    lim: 120,
    type: '',
    cat: '',
    kind: '',
    mine: false,
    nameOnly: false,
    f: {},
    pmin: '',
    pmax: '',
    hideOrig,
    orig: false,
    hideOldOnly,
    oldShow: false,
    has: chosen ? n => chosen().has(n) : null
  };
  const l = openModal(
    `<div class="mhead"><h2>${esc(title || DBS[kind].t + ' 선택')}</h2><span class="sp"></span><button class="btn ghost" data-x>닫기</button></div>
  <div class="mbody">${pickerShell(kind, st)}${multi ? '<p class="small muted" style="margin:0">클릭하면 추가되고, 이미 추가된 항목(파란색)을 다시 누르면 빠집니다. 창은 닫기 전까지 열려 있습니다.</p>' : ''}</div>
  <div class="mfoot">${onOrig ? `<button class="btn" data-orig>+ 오리지널 ${DBS[kind].t} (이 포켓몬만)</button>` : ME.gm ? `<button class="btn" data-orig title="GM — ${DBS[kind].t} DB 에 새 줄을 만든다">+ 오리지널 ${DBS[kind].t} 만들기 (DB)</button>` : '<span class="small muted">새 항목은 「DB」 탭에서 만든다</span>'}<span class="sp"></span><button class="btn pri" data-x>${multi ? '완료' : '닫기'}</button></div>`,
    { wide: true }
  );
  const redraw = mountPicker(l, kind, st, {
    chosen,
    onPick: n => {
      if (multi && chosen && chosen().has(n) && onRemove) onRemove(n);
      else onPick(n);
      if (!multi) closeModal();
    }
  });
  l.addEventListener('click', e => {
    if (e.target.closest('[data-x]')) closeModal();
    if (e.target.closest('[data-orig]') && onOrig) return onOrig(st.q);
    /* 11-08 망령 「DB는 DB 직접 간 거 아니면 못 건드리게. 그게 DB야」 → 「GM은 할 수 있게. PL만」: 고르기 창에서 DB 줄은 GM(ME.gm)만 만든다 */
    if (ME.gm && !onOrig && e.target.closest('[data-orig]'))
      openEdit(kind, -1, {
        preset: { [DBS[kind].key]: st.q },
        onSaved: n => {
          onPick(n);
          if (multi) redraw();
          else closeModal();
        }
      });
  });
}

