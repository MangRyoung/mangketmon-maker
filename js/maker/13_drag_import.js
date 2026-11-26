/* ── 조각 13_drag_import.js — 드래그 정렬 · 올드 타입 · 텍스트 불러오기 ── */
/* ---------- 드래그 정렬 (기술·포텐셜·포켓몬) ---------- */
let drag = null,
  dragEnd = 0;
const NOGRAB = 'button,input,select,textarea,label,a,[contenteditable]';
document.addEventListener('pointerdown', e => {
  if (e.button > 0 || drag) return;
  const g = e.target.closest('[data-grab]');
  if (!g || e.target.closest(NOGRAB)) return;
  const item = g.closest('[data-si]'),
    list = item && item.parentElement;
  if (!list || list.dataset.sort == null) return;
  drag = { item, list, id: e.pointerId, x: e.clientX, y: e.clientY, on: false, touch: e.pointerType !== 'mouse' };
  if (e.pointerType === 'mouse') e.preventDefault();
  else
    drag.timer = setTimeout(() => {
      if (drag && !drag.on) startDrag();
    }, 350);
});
function startDrag() {
  drag.on = true;
  drag.item.classList.add('dragging');
  MKROOT().classList.add('drag-on');
  if (navigator.vibrate)
    try {
      navigator.vibrate(15);
    } catch (_) {}
}
document.addEventListener(
  'pointermove',
  e => {
    if (!drag || e.pointerId !== drag.id) return;
    if (!drag.on) {
      const d = Math.hypot(e.clientX - drag.x, e.clientY - drag.y);
      if (drag.touch) {
        if (d > 8) {
          clearTimeout(drag.timer);
          drag = null;
        }
        return;
      }
      if (d < 6) return;
      startDrag();
    }
    e.preventDefault();
    if (drag.list.dataset.sort === 'trainers' && S.folders.length) {
      const el = document.elementFromPoint(e.clientX, e.clientY);
      const fh = el && el.closest('[data-fdrop]');
      $$('.tfh.over').forEach(x => {
        if (x !== fh) x.classList.remove('over');
      });
      if (fh) {
        fh.classList.add('over');
        drag.fdrop = fh.dataset.fdrop;
        if (e.clientY < 70) MKROOT().scrollBy(0, -16);
        else if (e.clientY > innerHeight - 70) MKROOT().scrollBy(0, 16);
        return;
      }
      drag.fdrop = null;
      const ol = el && el.closest('[data-sort="trainers"]');
      if (ol && ol !== drag.list) {
        ol.appendChild(drag.item);
        drag.list = ol;
      }
    }
    /* 10-24 망령: 폴더를 다른 폴더 카드 가운데에 놓으면 그 안으로 (가장자리면 순서만 바꾼다). 「폴더 없음」 카드에 놓으면 맨 위로 꺼낸다 */
    if (drag.list.dataset.sort === 'folders') {
      const el = document.elementFromPoint(e.clientX, e.clientY);
      const fh = el && el.closest('.tfh[data-fdrop]');
      const me = S.folders[+drag.item.dataset.si];
      let ok = null;
      if (fh && me && !drag.item.contains(fh)) {
        const k = fh.dataset.fdrop;
        const r = fh.getBoundingClientRect();
        const mx = r.width * 0.2,
          my = Math.min(r.height * 0.25, 40);
        const mid = e.clientX > r.left + mx && e.clientX < r.right - mx && e.clientY > r.top + my && e.clientY < r.bottom - my;
        if (k === '_none' ? mid && !!fPar(me) : mid && k !== me.id && !fDesc(me.id).includes(k) && fPar(me) !== k) ok = k;
      }
      $$('.tfh.over,.tfh.nest').forEach(x => {
        if (!ok || x !== fh) x.classList.remove('over', 'nest');
      });
      drag.fdrop = ok;
      if (ok) {
        fh.classList.add('over', 'nest');
        if (e.clientY < 70) MKROOT().scrollBy(0, -16);
        else if (e.clientY > innerHeight - 70) MKROOT().scrollBy(0, 16);
        return;
      }
    }
    const { item, list } = drag;
    const sibs = [...list.children].filter(x => x !== item && x.dataset.si != null);
    let before = null;
    for (const x of sibs) {
      const r = x.getBoundingClientRect();
      if (e.clientY < r.top + r.height / 2) {
        before = x;
        break;
      }
    }
    if (before) {
      if (item.nextElementSibling !== before) list.insertBefore(item, before);
    } else {
      const last = sibs[sibs.length - 1];
      if (last && last.nextElementSibling !== item) last.after(item);
    }
    if (e.clientY < 70) MKROOT().scrollBy(0, -16);
    else if (e.clientY > innerHeight - 70) MKROOT().scrollBy(0, 16);
  },
  { passive: false }
);
document.addEventListener(
  'touchmove',
  e => {
    if (drag && drag.on) e.preventDefault();
  },
  { passive: false }
);
document.addEventListener('contextmenu', e => {
  if (drag && drag.touch) e.preventDefault();
});
function endDrag(e) {
  if (!drag || e.pointerId !== drag.id) return;
  const d = drag;
  drag = null;
  clearTimeout(d.timer);
  if (!d.on) return;
  d.item.classList.remove('dragging');
  MKROOT().classList.remove('drag-on');
  dragEnd = Date.now();
  $$('.tfh.over,.tfh.nest').forEach(x => x.classList.remove('over', 'nest'));
  if (d.list.dataset.sort === 'folders' && d.fdrop != null) {
    const f = S.folders[+d.item.dataset.si];
    if (f) {
      const k = d.fdrop === '_none' ? '' : d.fdrop;
      if (k) f.parent = k;
      else delete f.parent;
      S.ui.fclosed = S.ui.fclosed || {};
      if (k) delete S.ui.fclosed[k];
      save();
      renderChar();
      const p = fById(k);
      toast(`「${f.name || '폴더'}」 → ${p ? fPath(p) + ' 안으로' : '맨 위로'}`);
    }
    return;
  }
  if (d.list.dataset.sort === 'trainers' && S.folders.length) {
    moveTrainersFromDom(d);
    return;
  }
  const order = [...d.list.children].filter(x => x.dataset.si != null).map(x => +x.dataset.si);
  if (order.every((v, i) => !i || order[i - 1] < v)) return;
  applySort(d.list, order);
}
document.addEventListener('pointerup', endDrag);
document.addEventListener('pointercancel', endDrag);
/* 폴더가 있을 때: 화면에 보이는 순서·소속대로 트레이너 목록을 다시 짠다 (접힌 폴더의 트레이너는 그대로 유지) */
/* 10-26 망령: 줄의 번호(data-si)가 아니라 id(section#tr-<id>)로 찾는다 — 공유 저장소에서 트레이너가 끼어들어 번호가 밀리면 엉뚱한 트레이너의 폴더가 바뀌던 사고를 막는다 */
const trOfRow = x => {
  const id = x && x.id && x.id.startsWith('tr-') ? x.id.slice(3) : null;
  return (id && S.trainers.find(t => t.id === id)) || (x && x.dataset.si != null ? S.trainers[+x.dataset.si] : null);
};
function moveTrainersFromDom(d) {
  const moved = trOfRow(d.item);
  if (d.fdrop != null) {
    if (moved) {
      moved.folder = d.fdrop === '_none' ? '' : d.fdrop;
      S.trainers = S.trainers.filter(t => t !== moved).concat([moved]);
      S.ui.fclosed = S.ui.fclosed || {};
      const f = S.folders.find(x => x.id === moved.folder);
      toast(`「${moved.name}」 → ${f ? f.name : '폴더 없음'}`);
    }
    save();
    renderChar();
    return;
  }
  const seen = new Set(),
    order = [];
  /* 11-08 22:15 망령 「종종 트레이너가 폴더 이동이 된다」: 예전엔 끌어서 놓을 때마다 화면의 모든 줄을 돌며 「보이는 칸의 폴더」를 모든 트레이너에게 다시 적었다 → 폴더 문서가 아직 안 왔거나(공유 저장소 순서) 지워진 폴더의 트레이너는 「폴더 없음」 칸에 그려져 있다가, 다른 트레이너 하나를 옮기기만 해도 폴더가 비워졌다.
    이제 폴더는 끌어서 옮긴 그 트레이너만 바꾸고, 나머지는 순서만 맞춘다 */
  $$('#trs [data-sort="trainers"]').forEach(l => {
    const fid = l.dataset.fid || '';
    [...l.children].forEach(x => {
      if (x.dataset.si == null) return;
      const t = trOfRow(x);
      if (t && !seen.has(t)) {
        seen.add(t);
        if (t === moved && tFolder(t) !== fid) {
          t.folder = fid;
          const f = S.folders.find(q => q.id === fid);
          toast(`「${t.name}」 → ${f ? f.name : '폴더 없음'}`);
        }
        order.push(t);
      }
    });
  });
  S.trainers.forEach(t => {
    if (!seen.has(t)) order.push(t);
  });
  S.trainers = order;
  save();
  renderChar();
}
function applySort(list, order) {
  const re = a => order.map(i => a[i]);
  const kind = list.dataset.sort;
  if (kind === 'trainers') {
    /* 10-26 점검: 안 보이는(남의 비공개) 트레이너가 정렬에서 빠져 지워지던 것 */ const picked = order.map(i => S.trainers[i]).filter(Boolean);
    const rest = S.trainers.filter(t => !picked.includes(t));
    S.trainers = picked.concat(rest);
    save();
    renderChar();
    return;
  }
  if (kind === 'folders') {
    const slots = [...order].sort((a, b) => a - b);
    const nf = S.folders.slice();
    slots.forEach((p, k) => {
      nf[p] = S.folders[order[k]];
    });
    S.folders = nf;
    save();
    renderChar();
    return;
  }
  /* 10-24: 하위 폴더 줄은 그 폴더들 자리끼리만 */ const T = S.trainers[+list.dataset.i];
  if (!T) return;
  if (kind === 'poke') T.pokemon = re(T.pokemon);
  else {
    const P = T.pokemon[+list.dataset.j];
    if (!P) return;
    if (kind === 'moves') P.moves = re(P.moves);
    else if (kind === 'pots') {
      const full = [...order, ...P.pots.map((_, i) => i).filter(i => !order.includes(i))];
      for (const a of ['pots', 'potEff', 'potKind']) P[a] = full.map(i => P[a][i]);
      for (const f of P.forms || [])
        for (const x of (f && f.pots) || []) {
          const ni = full.indexOf(+x.slot);
          if (ni >= 0) x.slot = ni;
        } /* 11-14 폼의 포텐셜 교체 칸도 따라 옮긴다 */
    }
  }
  save();
  refreshTrainer(T);
}

/* ---------- 올드 타입 일람 자동 입력 ---------- */
const REGF = ['알로라', '가라르', '히스이', '팔데아'];
function oldKind(r) {
  if (r[10] === 'O') return '메가진화';
  if (REGF.some(x => String(r[1]).startsWith(x + ' '))) return '리전 폼';
  return '올드 타입';
}
function abilName(a) {
  if (!a || a === '-') return '';
  if (idx.abil.has(a)) return a;
  const n = a.replace(/\s/g, '');
  for (const k of idx.abil.keys()) if (k.replace(/\s/g, '') === n) return k;
  return a;
}
function applyOld(p, r, ab, setKind) {
  p.pride = '';
  p.name = r[1];
  p.t1 = r[3] || '-';
  p.t2 = r[4] || '-';
  p.t3 = '-';
  p.ability = ab;
  p.egg1 = r[8] || '-';
  p.egg2 = r[9] || '-';
  p.base = r.slice(11, 17).map(v => String(v ?? ''));
  if (setKind) {
    let i = potIdx(p, '분류', 1);
    if (i < 0) i = !p.pots[1] ? 1 : p.pots.findIndex(x => !x);
    if (i >= 0) {
      p.pots[i] = oldKind(r);
      p.potEff[i] = '';
      p.potKind[i] = '';
    }
  }
}
function openOldFill(T, P) {
  openPicker('old', {
    title: '올드 타입 일람에서 포켓몬 선택',
    onPick: n => {
      const r = idx.old.get(n);
      if (r) setTimeout(() => openOldConfirm(T, P, r), 0);
    }
  });
}
function openOldConfirm(T, P, r) {
  const abs = [
    [r[5], '특성1'],
    [r[6], '특성2'],
    [r[7], '숨겨진 특성']
  ].filter(([a]) => a && a !== '-');
  const k = oldKind(r);
  const tot = r.slice(11, 17).reduce((a, b) => a + (+b || 0), 0);
  const l =
    openModal(`<div class="mhead"><h2>「${esc(r[1])}」 자동 입력</h2><span class="sp"></span><button class="btn ghost" data-x>닫기</button></div>
 <div class="mbody"><div class="row">${tchip(r[3])}${tchip(r[4])}<span class="small muted">${esc(r[0])} · ${esc(r[2])} · 알그룹 ${esc(r[8])}${r[9] && r[9] !== '-' ? ' / ' + esc(r[9]) : ''}</span></div>
 <div class="small num">${STATS.map((s, i) => esc(s) + ' <b>' + esc(r[11 + i]) + '</b>').join(' · ')} · 합 <b>${tot}</b></div>
 <b class="small">특성 선택</b><div class="olab">${
   abs
     .map(([a, lab], i) => {
       const n = abilName(a);
       const ar = idx.abil.get(n);
       return `<label class="oab"><input type="radio" name="oab" value="${esc(n)}" ${i === 0 ? 'checked' : ''}><span><b>${esc(n)}</b> <span class="kindb">${lab}</span>${ar ? '' : ' <span class="warn small">DB에 없음</span>'}<br><span class="small muted">${ar ? rich(ar[2]) : ''}</span></span></label>`;
     })
     .join('') || '<span class="small muted">특성 정보가 없습니다.</span>'
 }</div>
 <label class="row small"><input type="checkbox" id="ok-kind" ${!P || !classOf(P) || OLDK.includes(classOf(P)) ? 'checked' : ''}>포텐셜 #2(분류)를 『${esc(k)}』로 지정</label>
 ${P && P.name ? '<p class="small muted" style="margin:0">이름·타입·특성·알그룹·종족치를 덮어씁니다. 기술·다른 포텐셜·이미지는 그대로 둡니다.</p>' : ''}</div>
 <div class="mfoot"><span class="sp"></span><button class="btn" data-x>취소</button><button class="btn pri" data-ok autofocus>${P ? '입력' : '새 시트로 추가'}</button></div>`);
  l.addEventListener('click', e => {
    if (e.target.closest('[data-x]')) return closeModal();
    if (!e.target.closest('[data-ok]')) return;
    const ab = ($('input[name=oab]:checked', l) || {}).value || '';
    let p = P;
    if (!p) {
      p = newPoke();
      applySheetTpl(T, p);
      T.pokemon.push(p);
    }
    applyOld(p, r, ab, $('#ok-kind', l).checked);
    p.open = true;
    p.tab = 'base';
    T.open = true;
    save();
    closeModal();
    refreshTrainer(T);
    toast(`「${r[1]}」 데이터를 입력했습니다`);
  });
}

/* ---------- 텍스트 불러오기 ---------- */
function openImport(T) {
  const l = openModal(`<div class="mhead"><h2>복사용 텍스트 불러오기</h2><span class="sp"></span><button class="btn ghost" data-x>닫기</button></div>
 <div class="mbody"><p class="small muted" style="margin:0">시트의 「복사용 텍스트」를 붙여넣으세요. 한 줄에 하나씩 여러 체를 한 번에 넣을 수 있습니다. DB에 없는 기술은 텍스트 안의 데이터로 오리지널 기술이 자동 등록됩니다.</p>
 ${T ? '' : `<label class="lbl" for="imp-t">넣을 트레이너<select id="imp-t">${S.trainers.map((t, i) => `<option value="${i}">${esc(t.name)}</option>`).join('')}<option value="new">새 트레이너 만들기</option></select></label>`}
 <textarea id="imp-txt" rows="8" placeholder="싱잉 플로라;105;풀;독;-;-;음절초;…#" autofocus></textarea><div class="small" id="imp-info"></div></div>
 <div class="mfoot"><button class="btn" data-ex>예시 텍스트 넣기</button><span class="sp"></span><button class="btn" data-x>취소</button><button class="btn pri" data-go>불러오기</button></div>`);
  const ta = $('#imp-txt', l);
  const info = () => {
    const n = splitCopies(ta.value).length;
    $('#imp-info', l).innerHTML = n ? `<span class="okc">포켓몬 ${n}체 인식</span>` : '<span class="muted">인식된 텍스트가 없습니다</span>';
  };
  ta.addEventListener('input', info);
  l.addEventListener('click', e => {
    if (e.target.closest('[data-x]')) return closeModal();
    if (e.target.closest('[data-ex]')) {
      ta.value = EXAMPLE;
      info();
      return;
    }
    if (e.target.closest('[data-go]')) {
      const list = splitCopies(ta.value);
      if (!list.length) return toast('복사용 텍스트를 찾지 못했습니다');
      let tr = T;
      if (!tr) {
        const v = $('#imp-t', l).value;
        if (v === 'new') {
          tr = newTrainer();
          S.trainers.push(tr);
        } else tr = S.trainers[+v];
      }
      list.forEach(s => {
        const p = parseCopy(s, tr);
        tr.pokemon.push(p);
      });
      tr.open = true;
      save();
      closeModal();
      renderChar();
      toast(`${list.length}체를 불러왔습니다`);
    }
  });
}
function splitCopies(txt) {
  return String(txt)
    .split(/\r?\n/)
    .map(s => s.trim())
    .filter(isCopyText);
}

