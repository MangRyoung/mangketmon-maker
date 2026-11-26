/* ── 조각 10_render_char.js — 서명 · 비공개 · 렌더: 캐릭터 ── */
/* ---------- 내 서명 · 비공개 (화면에서만 숨김: 비밀구가 맞는 브라우저와 GM 만 본다) ---------- */
const ME = { name: '', hash: '', gm: false };
async function sha256hex(s) {
  if (window.crypto && crypto.subtle) {
    const b = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(s));
    return [...new Uint8Array(b)].map(x => x.toString(16).padStart(2, '0')).join('');
  }
  let h1 = 0x811c9dc5,
    h2 = 0x1b873593;
  for (const ch of String(s)) {
    const c = ch.codePointAt(0);
    h1 = Math.imul(h1 ^ c, 16777619) >>> 0;
    h2 = Math.imul(h2 + c, 2246822519) >>> 0;
  }
  return (h1.toString(16).padStart(8, '0') + h2.toString(16).padStart(8, '0')).repeat(4);
}
const meHash = async secret => (await sha256hex('mkm:' + String(secret || ''))).slice(0, 24);
async function meLoad() {
  let o = null;
  try {
    o = JSON.parse(lsGet('mkm_me') || 'null');
  } catch (e) {}
  if (o && o.secret) {
    ME.name = String(o.name || '');
    ME.hash = await meHash(o.secret);
    const gh = (window.MKM_CONFIG && MKM_CONFIG.gmHash) || '';
    ME.gm = !!(gh && ME.hash === gh);
  } else {
    ME.name = '';
    ME.hash = '';
    ME.gm = false;
  }
  renderMe();
  if (S.ui.tab) refreshAll();
}
function renderMe() {
  const b = $('#mebtn');
  if (!b) return;
  b.textContent = ME.hash ? (ME.gm ? 'GM · ' : '서명 · ') + (ME.name || '이름 없음') : '서명 없음';
  b.classList.toggle('on', !!ME.hash);
  b.title = ME.hash ? '비공개 설정에 쓰는 내 서명. 눌러서 바꾸기' : '비공개 트레이너를 만들거나 보려면 서명(이름 + 비밀구)을 적어 두세요';
}
/* 11-25 망령 「같이 보는 사람 지정」: 비공개 폴더에 co=[{h:서명 해시,n:이름}] — 주인 · GM 말고 여기 적힌 서명도 본다. 그 안(하위 폴더 포함)의 비공개 트레이너까지 같이 본다 */
const coHas = o => !!(ME.hash && o && Array.isArray(o.co) && o.co.some(c => c && c.h === ME.hash));
const canSee = o => !o || !o.priv || ME.gm || !!(ME.hash && o.owner === ME.hash) || coHas(o);
const canEditPriv = o => !o.priv || ME.gm || !!(ME.hash && o.owner === ME.hash) || !o.owner;
/* 11-12 08:02 망령 「포켓몬 1체만 숨기기 — 제작기 · 세션 노트 · 웹툴 셋 다, 다른 플레이어에게만 안 보이게」: 포켓몬 문서 p.priv · p.owner(켠 사람 서명). 주인(트레이너 · 포켓몬 서명) · GM 만 본다 */
const canSeeMon = (t, p) =>
  !p ||
  !p.priv ||
  ME.gm ||
  !!(
    ME.hash &&
    (p.owner === ME.hash || (t && t.owner === ME.hash))
  ); /* 서명(owner)이 없으면 GM 만 — 세션 노트에서 켤 때도 같은 브라우저의 제작기 서명을 owner 로 적는다 */
/* 10-24 망령: 폴더 안의 폴더 — 폴더에 parent(상위 폴더 id). 지워졌거나 고리가 생긴 parent 는 맨 위로 본다 */
const fById = id => (id ? S.folders.find(f => f.id === id) : null);
const fPar = f => {
  if (!f || !f.parent) return '';
  const p = fById(f.parent);
  if (!p) return '';
  let c = p,
    n = 0;
  while (c && n++ < 50) {
    if (c.id === f.id) return '';
    c = c.parent ? fById(c.parent) : null;
  }
  return p.id;
};
const fKids = pid => S.folders.filter(f => fPar(f) === (pid || ''));
const fDesc = id => {
  const out = [];
  const walk = p => {
    for (const k of fKids(p)) {
      out.push(k.id);
      walk(k.id);
    }
  };
  walk(id);
  return out;
};
const fPath = f => {
  const a = [];
  let c = f,
    n = 0;
  while (c && n++ < 50) {
    a.unshift(c.name || '이름 없는 폴더');
    c = fById(fPar(c));
  }
  return a.join(' › ');
};
const fVis = f => {
  let c = f,
    n = 0;
  while (c && n++ < 50) {
    if (!canSee(c)) return false;
    c = fById(fPar(c));
  }
  return true;
};
const fShare = f => {
  let c = f,
    n = 0;
  while (c && n++ < 50) {
    if (c.priv && ME.hash && (c.owner === ME.hash || coHas(c))) return true;
    c = fById(fPar(c));
  }
  return false;
}; /* 내가 주인이거나 같이 보는 사람인 비공개 폴더 안 */
const tVis = t => {
  const f = S.folders.find(f => f.id === tFolder(t));
  return (canSee(t) || fShare(f)) && fVis(f);
};
/* 폴더 고르기 목록: 나무 순서 · 들여쓰기 (skip = 그 폴더와 그 아래는 뺀다) */
function fTreeOpts(cur, skip) {
  const out = [];
  const no = new Set(skip ? [skip, ...fDesc(skip)] : []);
  const walk = (p, d) => {
    for (const f of fKids(p)) {
      if (no.has(f.id) || !fVis(f)) continue;
      out.push(
        `<option value="${esc(f.id)}" ${cur === f.id ? 'selected' : ''}>${'  '.repeat(d)}${d ? '└ ' : ''}${esc(f.name || '이름 없는 폴더')}</option>`
      );
      walk(f.id, d + 1);
    }
  };
  walk('', 0);
  return out.join('');
}
function openCo(o) {
  const draw = l => {
    const L = o.co || [];
    $('#co-list', l).innerHTML = L.length
      ? L.map(
          (c, i) =>
            `<div style="display:flex;align-items:center;gap:8px;padding:4px 0"><b>${esc(c.n || '이름 없음')}</b><span class="mono small faint">${esc(String(c.h).slice(0, 12))}…</span><span class="sp"></span><button class="btn sm ghost danger" data-codel="${i}">빼기</button></div>`
        ).join('')
      : '<p class="small muted" style="margin:0">아직 없습니다 — 주인과 GM 만 봅니다.</p>';
  };
  const l =
    openModal(`<div class="mhead"><h2>같이 보는 사람 · ${esc(o.name || '폴더')}</h2><span class="sp"></span><button class="btn ghost" data-x>닫기</button></div>
  <div class="mbody"><p class="small muted" style="margin:0 0 8px">이 비공개 폴더(안의 폴더 · 비공개 트레이너 포함)를 같이 볼 사람의 <b>서명 코드</b>를 적습니다. 상대가 오른쪽 위 「서명」 창에서 「내 서명 코드 보기」를 눌러 나온 글자를 보내 주면 됩니다.</p>
   <div id="co-list" style="margin-bottom:10px"></div>
   <label class="lbl" for="co-n">이름<input id="co-n" maxlength="24" placeholder="표시 이름"></label>
   <label class="lbl" for="co-h" style="margin-top:8px">서명 코드<input id="co-h" class="mono" maxlength="128" placeholder="상대가 보내 준 코드"></label></div>
  <div class="mfoot"><span class="sp"></span><button class="btn pri" data-coadd>넣기</button></div>`);
  draw(l);
  l.addEventListener('click', e => {
    const d = e.target.closest('[data-codel]');
    if (d) {
      o.co = (o.co || []).filter((c, i) => i !== +d.dataset.codel);
      if (!o.co.length) delete o.co;
      save();
      draw(l);
      renderChar();
      return;
    }
    if (e.target.closest('[data-coadd]')) {
      const h = $('#co-h', l).value.trim(),
        n = $('#co-n', l).value.trim();
      if (!/^[0-9a-f]{16,128}$/i.test(h)) {
        toast('서명 코드가 아닙니다 — 상대의 「서명」 창에서 복사한 글자를 그대로 붙여 주세요');
        return;
      }
      if (h === o.owner) {
        toast('이미 주인입니다');
        return;
      }
      o.co = (o.co || []).filter(c => c.h !== h).concat([{ h, n }]);
      save();
      $('#co-h', l).value = '';
      $('#co-n', l).value = '';
      draw(l);
      renderChar();
      toast((n || '그 서명') + ' — 이제 이 폴더를 같이 봅니다');
      return;
    }
    if (e.target.closest('[data-x]')) closeModal();
  });
}
function openMe() {
  let o = null;
  try {
    o = JSON.parse(lsGet('mkm_me') || 'null');
  } catch (e) {}
  o = o || {};
  const l = openModal(`<div class="mhead"><h2>내 서명</h2><span class="sp"></span><button class="btn ghost" data-x>닫기</button></div>
 <div class="mbody"><p class="small muted" style="margin:0 0 8px">비공개로 둔 폴더·트레이너는 같은 비밀구를 적은 브라우저와 GM 에게만 보입니다. 이름은 표시용, 비밀구가 열쇠입니다. 다른 기기에서도 같은 비밀구를 적으면 내 것이 보입니다. (화면에서만 숨기는 방식이라 DB 자체가 비밀이 되지는 않습니다)</p>
  <label class="lbl" for="me-name">이름<input id="me-name" value="${esc(o.name || '')}" maxlength="24" placeholder="표시 이름"></label>
  <label class="lbl" for="me-secret" style="margin-top:8px">비밀구<input id="me-secret" type="password" value="${esc(o.secret || '')}" maxlength="64" placeholder="나만 아는 문장" autocomplete="off"></label>
  <p class="small" style="margin:10px 0 0"><button type="button" class="btn sm" id="me-fhide">🙈 보이는 폴더 고르기</button> <span class="faint">나와 상관없는 폴더를 이 브라우저에서 숨깁니다${FHIDE.count() ? ` (지금 ${FHIDE.count()}개 숨김)` : ''}</span></p>
  <p class="small faint" style="margin:8px 0 0">GM 은 config.js 의 gmHash 와 비밀구가 맞으면 전부 봅니다. <button type="button" class="btn sm" id="me-gmhash" title="비공개 폴더의 「🤝 같이 보는 사람」에 넣을 내 서명 코드 — 폴더 주인에게 보내 주세요">내 서명 코드 보기</button> <span class="mono small" id="me-gmout"></span></p></div>
 <div class="mfoot"><button class="btn ghost" data-x="clear">서명 지우기</button><span class="sp"></span><button class="btn pri" data-x="ok">저장</button></div>`);
  $('#me-fhide', l).onclick = () => {
    closeModal();
    openFHide();
  };
  $('#me-gmhash', l).onclick = async () => {
    $('#me-gmout', l).textContent = await meHash($('#me-secret', l).value);
  };
  l.addEventListener('click', async e => {
    const x = e.target.closest('[data-x]');
    if (!x) return;
    const v = x.dataset.x;
    if (v === 'ok') {
      const name = $('#me-name', l).value.trim(),
        secret = $('#me-secret', l).value;
      if (!secret) {
        toast('비밀구를 적어 주세요');
        return;
      }
      lsSet('mkm_me', JSON.stringify({ name, secret }));
      closeModal();
      await meLoad();
      toast(ME.gm ? 'GM 으로 서명했습니다' : '서명을 저장했습니다');
      return;
    }
    if (v === 'clear') {
      try {
        localStorage.removeItem('mkm_me');
      } catch (e) {}
      closeModal();
      await meLoad();
      return;
    }
    closeModal();
  });
}
document.addEventListener('click', e => {
  if (e.target.closest('#mebtn')) openMe();
});
document.addEventListener('click', e => {
  const b = e.target.closest('[data-tip]');
  if (!b) return;
  openModal(
    `<div class="mhead"><h2>${esc(b.title || '설명')}</h2></div><div class="mbody"><p class="small" style="margin:0;line-height:1.6">${esc(b.dataset.tip)}</p></div><div class="mfoot"><span class="sp"></span><button class="btn pri" data-x>닫기</button></div>`
  ).addEventListener('click', ev => {
    if (ev.target.closest('[data-x]')) closeModal();
  });
});
/* ---------- 렌더: 캐릭터 ---------- */
const FOLDER_SVG =
  '<svg width="18" height="18" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true"><path d="M2 5.5A1.5 1.5 0 0 1 3.5 4h4l1.6 1.8h7.4A1.5 1.5 0 0 1 18 7.3v7.2a1.5 1.5 0 0 1-1.5 1.5h-13A1.5 1.5 0 0 1 2 14.5z"/></svg>';
/* 트레이너가 속한 폴더 id ('' = 폴더 없음 · 지워진 폴더를 가리키면 폴더 없음으로 본다) */
const tFolder = t => (t.folder && S.folders.some(f => f.id === t.folder) ? t.folder : '');
const fOpen = fid => !(S.ui.fclosed || {})[fid || '_none'];
const trVisible = t =>
  tVis(t) &&
  (!S.folders.length ||
    (() => {
      let c = fById(tFolder(t)),
        n = 0;
      if (!c) return fOpen('');
      while (c && n++ < 50) {
        if (!fOpen(c.id)) return false;
        c = fById(fPar(c));
      }
      return true;
    })());
/* 10-24 망령: 폴더 머리를 카드 한 장으로 — 닫힌 폴더는 격자로 촘촘히, 연 폴더만 한 줄 전체. 꾸미기(색 · 아이콘 · 부제 · 무늬 · 배경 그림)는 트레이너 카드와 같은 틀 */
function folderHead(f, name, n, open, pv, kids) {
  const fid = f ? f.id : '',
    key = fid || '_none',
    d = (f && f.deco) || {},
    pk = n.reduce((a, [t]) => a + t.pokemon.length, 0);
  kids = kids || 0;
  const av =
    n
      .slice(0, 8)
      .map(
        ([t]) =>
          `<span class="fch" title="${esc(t.name || '')}"><span class="fav">${safeImg(t.image) ? `<img src="${safeImg(t.image)}" alt="" loading="lazy">` : esc([...(t.name || '?')][0] || '?')}</span><span class="fcn">${esc(t.name || '이름 없음')}</span></span>`
      )
      .join('') + (n.length > 8 ? `<span class="fch more">+${n.length - 8}</span>` : '') || '<span class="fch none">아직 트레이너가 없다</span>';
  const A = pv
    ? ''
    : ` data-ftog="${esc(key)}" data-fdrop="${esc(key)}" ${fid ? 'data-grab' : ''} tabindex="0" role="button" data-kbd aria-expanded="${open}" aria-label="${esc(name)} 폴더 펼치기/접기"`;
  return `<div class="tfh ftile tcard ${f ? tDecoCls(f) : ''} ${fid ? '' : 'fnone'} ${f && f.rule === 'misag' ? 'fmisag' : ''}" style="${f ? tDecoVars(f) : ''}"${A}><span class="caret">▸</span><span class="ficon">${d.icon ? `<b class="fem">${esc(d.icon)}</b>` : FOLDER_SVG}</span>
  <div class="fmain"><div class="fl1">${f && f.rule === 'misag' ? '<span class="fcrest" aria-hidden="true">MISAG<br>UNIV.</span>' : ''}<span class="fname${fid ? '' : ' muted'}">${esc(name)}</span>${f && F_RULE[f.rule] ? `<span class="kindb fmrule" title="${esc(F_RULE[f.rule].tip)}">${esc(F_RULE[f.rule].lab)}</span>` : ''}${fid ? FAV.btn('f', fid) : ''}${f && f.priv ? `<span class="kindb privchip" title="${esc('비공개 · ' + (f.ownerName || '') + (ME.gm ? ' (GM 열람)' : ''))}">🔒</span>` : ''}</div>${d.title ? `<div class="fsub">${esc(d.title)}</div>` : ''}<div class="fmeta" title="${esc((kids ? `하위 폴더 ${kids}개 · ` : '') + `트레이너 ${n.length}명 · 포켓몬 ${pk}체`)}">${kids ? `폴더 ${kids}개 · ${n.length}명 · ${pk}체` : `트레이너 ${n.length}명 · 포켓몬 ${pk}체`}</div></div>
  <div class="fbot"><div class="favs flist" data-n="${n.length}">${av}</div>
  ${pv ? '' : `<div class="facts"><button class="btn sm" data-act="addTin" data-f="${esc(fid)}" title="이 폴더에 트레이너 추가">+ 트레이너</button><button class="btn sm ghost" data-act="chkF" data-f="${esc(fid)}" title="이 폴더 트레이너 · 포켓몬의 ⚠ 경고를 한 화면에">점검</button>${fid ? `<button class="btn sm ghost fsubb" data-act="addFin" data-f="${esc(fid)}" title="이 폴더 안에 폴더 만들기">+ 폴더</button>` : ''}${fid ? `<span class="facts2"><button class="btn sm ghost fic" data-act="moveF" data-f="${esc(fid)}" title="다른 폴더 안으로 옮기기 · 맨 위로 꺼내기" aria-label="폴더 옮기기">📂</button><button class="btn sm ghost fic" data-act="decoF" data-f="${esc(fid)}" title="폴더 꾸미기 (색 · 아이콘 · 부제 · 무늬 · 배경 그림)" aria-label="폴더 꾸미기">🎨</button><button class="btn sm ghost fic" data-act="privF" data-f="${esc(fid)}" title="${f && f.priv ? '지금 비공개 — 눌러서 공개로' : '지금 공개 — 눌러서 비공개로 (만든 사람과 GM 에게만 보임)'}" aria-label="${f && f.priv ? '공개로' : '비공개로'}">${f && f.priv ? '🔒' : '🌐'}</button>${f && f.priv ? `<button class="btn sm ghost fic" data-act="coF" data-f="${esc(fid)}" title="${esc('같이 보는 사람 (' + ((f.co || []).map(c => c.n || '이름 없음').join(' · ') || '없음') + ') — 주인 말고 이 폴더를 볼 서명을 적는다')}" aria-label="같이 보는 사람">🤝${(f.co || []).length || ''}</button>` : ''}<button class="btn sm ghost fic" data-act="renF" data-f="${esc(fid)}" title="이름 바꾸기" aria-label="이름 바꾸기">✏️</button><button class="btn sm ghost fic danger" data-act="delF" data-f="${esc(fid)}" title="폴더 삭제 (안의 트레이너는 「폴더 없음」으로)" aria-label="폴더 삭제">🗑</button></span>` : ''}</div>`}</div></div>`;
}
/* ---------- 즐겨찾기 (10-26 망령): 폴더 · 트레이너에 ★ → 왼쪽 레일에서 바로 가기. 이 브라우저(localStorage mkm_fav)에만 ---------- */
const FAV = {
  get() {
    try {
      return JSON.parse(localStorage.getItem('mkm_fav') || '[]') || [];
    } catch (e) {
      return [];
    }
  },
  set(v) {
    lsSet('mkm_fav', JSON.stringify(v));
  },
  has(k, id) {
    return this.get().some(f => f.k === k && f.id === id);
  },
  toggle(k, id) {
    const L = this.get();
    const i = L.findIndex(f => f.k === k && f.id === id);
    if (i >= 0) L.splice(i, 1);
    else L.push({ k, id });
    this.set(L);
    toast(i >= 0 ? '즐겨찾기에서 뺐습니다' : '즐겨찾기에 넣었습니다 ★');
    renderChar();
  },
  btn(k, id) {
    const on = this.has(k, id);
    return `<button type="button" class="favstar${on ? ' on' : ''}" data-act="fav" data-fk="${k}" data-fid="${esc(id)}" title="${on ? '즐겨찾기에서 빼기' : '즐겨찾기에 넣기'}" aria-label="즐겨찾기">${on ? '★' : '☆'}</button>`;
  },
  label(f) {
    if (f.k === 'f') {
      const x = fById(f.id);
      return x ? x.name || '폴더' : null;
    }
    const t = S.trainers.find(t => t.id === f.id);
    return t ? t.name || '트레이너' : null;
  },
  go(f) {
    S.ui.fclosed = S.ui.fclosed || {};
    const openChain = fid => {
      let c = fById(fid),
        n = 0;
      while (c && n++ < 50) {
        delete S.ui.fclosed[c.id];
        c = c.parent ? fById(c.parent) : null;
      }
    };
    if (f.k === 'f') {
      openChain(f.id);
    } else {
      const t = S.trainers.find(t => t.id === f.id);
      if (!t) return toast('그 트레이너가 없습니다');
      if (t.folder) openChain(t.folder);
      else delete S.ui.fclosed._none;
      t.open = true;
    }
    if (innerWidth < 1500 && localStorage.getItem('mkm_fav_open') === '1')
      lsSet('mkm_fav_open', '0'); /* 11-03: 좁은 화면에선 레일이 본문 위에 떠 있으니 가고 나면 접는다 */
    save();
    renderChar();
    requestAnimationFrame(() => {
      const el = f.k === 'f' ? document.querySelector(`.tfold[data-fold="${CSS.escape(f.id)}"]`) : document.getElementById('tr-' + f.id);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'start' });
        el.classList.add('favflash');
        setTimeout(() => el.classList.remove('favflash'), 1400);
      }
    });
  },
  rail() {
    const L = this.get()
      .map(f => ({ f, lab: this.label(f) }))
      .filter(x => x.lab != null);
    const sv = localStorage.getItem('mkm_fav_open');
    const vis = sv ? sv !== '0' : innerWidth >= 1900; /* 11-03: 펼친 레일(210px)이 main 바깥 여백에 들어가는 폭부터 기본 펼침 */
    return `<aside id="mkFav" class="${vis ? '' : 'closed'}"><button type="button" class="favh" data-act="favtog" title="즐겨찾기 접기 · 펴기">★ 즐겨찾기 <small>${L.length}</small></button>${vis ? `<div class="favl">${L.map((x, i) => `<button type="button" class="favi" data-act="favgo" data-i="${i}"><i>${x.f.k === 'f' ? '📁' : '🧑'}</i><span>${esc(x.lab)}</span><em data-act="favdel" data-i="${i}" title="빼기">×</em></button>`).join('') || '<div class="small faint" style="padding:8px 10px;line-height:1.5">폴더 · 트레이너 머리의 ☆ 를 누르면 여기 모입니다. 누르면 바로 갑니다.</div>'}</div>` : ''}</aside>`;
  }
};
/* ---------- 10-28 망령: 나와 상관없는 폴더 숨기기 — 이 브라우저(localStorage mkm_fhide)에만. 숨긴 폴더는 그 아래 폴더 · 트레이너까지 캐릭터 시트에서 안 보인다 ---------- */
const FHIDE = {
  get() {
    try {
      return JSON.parse(localStorage.getItem('mkm_fhide') || '[]') || [];
    } catch (e) {
      return [];
    }
  },
  set(v) {
    lsSet('mkm_fhide', JSON.stringify(v));
  },
  has(id) {
    return this.get().includes(id || '_none');
  },
  toggle(id, on) {
    id = id || '_none';
    const L = this.get().filter(x => x !== id);
    if (on) L.push(id);
    this.set(L);
  },
  count() {
    const L = this.get();
    return L.filter(id => id === '_none' || fById(id)).length;
  }
};
function openFHide() {
  const rows = [];
  const walk = (p, d) => {
    for (const f of fKids(p)) {
      if (!fVis(f)) continue;
      rows.push([f.id, f.name || '이름 없는 폴더', d]);
      walk(f.id, d + 1);
    }
  };
  walk('', 0);
  rows.push(['', '폴더 없음', 0]);
  const n = id => {
    const ids = id ? [id, ...fDesc(id)] : [''];
    return S.trainers.filter(t => tVis(t) && ids.includes(tFolder(t))).length;
  };
  const l = openModal(`<div class="mhead"><h2>보이는 폴더 고르기</h2><span class="sp"></span><button class="btn ghost" data-x>닫기</button></div>
 <div class="mbody"><p class="small muted" style="margin:0 0 8px">체크를 끈 폴더는 이 브라우저의 캐릭터 시트에서 숨깁니다 (안의 폴더 · 트레이너까지). 지우는 게 아니라 다른 사람 화면과 오레마스에는 그대로 보입니다.</p>
  <div class="row" style="gap:6px;margin:0 0 6px"><button type="button" class="btn sm ghost" data-fh="all">모두 보이기</button><button type="button" class="btn sm ghost" data-fh="none">모두 숨기기</button></div>
  <div class="fhlist">${rows.map(([id, nm, d]) => `<label class="fhrow" style="padding-left:${d * 18}px"><input type="checkbox" data-fhid="${esc(id)}" ${FHIDE.has(id) ? '' : 'checked'}> ${d ? '└ ' : ''}📁 ${esc(nm)} <small class="faint">${n(id)}명</small></label>`).join('')}</div></div>
 <div class="mfoot"><span class="sp"></span><button class="btn pri" data-x>확인</button></div>`);
  l.addEventListener('change', e => {
    const c = e.target.closest('[data-fhid]');
    if (!c) return;
    FHIDE.toggle(c.dataset.fhid, !c.checked);
    renderChar();
  });
  l.addEventListener('click', e => {
    const a = e.target.closest('[data-fh]');
    if (a) {
      const hide = a.dataset.fh === 'none';
      l.querySelectorAll('[data-fhid]').forEach(c => {
        c.checked = !hide;
        FHIDE.toggle(c.dataset.fhid, hide);
      });
      renderChar();
      return;
    }
    if (e.target.closest('[data-x]')) closeModal();
  });
}
function renderChar() {
  ensureCampus();
  ensureMisagNpc();
  if (misagSync()) save();
  const root = $('#v-char');
  if ((EMB.t || EMB.nu) && embRender(root)) return;
  const inF = fid => S.trainers.map((t, ti) => [t, ti]).filter(([t]) => tFolder(t) === fid && tVis(t));
  const hiddenN = S.trainers.filter(t => !tVis(t)).length;
  /* 11-03: 이름 검색 — 폴더를 가로질러 트레이너 · 포켓몬 이름이 맞는 카드만 (맞는 포켓몬만 남기고 나머지 포켓몬 칸은 숨긴다) */
  const cq = CQ.trim().toLowerCase();
  let hitP = null,
    hitT = null;
  let body;
  if (cq) {
    hitT = new Set();
    hitP = new Set();
    const M = [];
    S.trainers.forEach((t, ti) => {
      if (!tVis(t)) return;
      const tn = String(t.name || '')
        .toLowerCase()
        .includes(cq);
      const ps = t.pokemon.filter(
        p =>
          canSeeMon(t, p) &&
          String(p.name || '')
            .toLowerCase()
            .includes(cq)
      );
      if (tn) hitT.add(t.id);
      for (const p of ps) hitP.add(p.id);
      t._q = !!(tn || ps.length);
      if (t._q) M.push([t, ti]);
    });
    body = `<p class="small muted" style="margin:0 0 8px">「${esc(CQ.trim())}」 — 트레이너 ${hitT.size}명 · 포켓몬 ${hitP.size}체${M.length ? '' : ' · 맞는 카드가 없습니다'}</p><div id="trs" data-sort="trainers" data-fid="">${M.map(([t, ti]) => trainerHTML(t, ti)).join('')}</div>`;
  } else {
    for (const t of S.trainers) delete t._q;
    if (!S.folders.length)
      body = `<div id="trs" data-sort="trainers" data-fid="">${S.trainers.map((t, ti) => (tVis(t) ? trainerHTML(t, ti) : '')).join('') || '<div class="empty">트레이너가 없습니다. 「+ 트레이너」를 눌러 시작하세요.</div>'}</div>`;
    else {
      /* 10-24 망령: 폴더 안의 폴더 — 연 폴더 안에 하위 폴더 카드 격자, 그 아래 트레이너. 닫힌 카드의 얼굴 · 수는 하위 폴더까지 다 센다 */
      const grp = (fid, name) => {
        const f = fById(fid);
        if (f && !fVis(f)) return '';
        if (FHIDE.has(fid)) return '';
        const n = inF(fid),
          open = fOpen(fid),
          key = fid || '_none';
        const kids = fid ? fKids(fid).filter(fVis) : [];
        const all = fid ? n.concat(...fDesc(fid).map(inF)) : n;
        return `<div class="tfold ${open ? 'open' : ''} ${f && f.priv ? 'priv' : ''} ${f && fPar(f) ? 'sub' : ''}" ${fid ? `data-si="${S.folders.indexOf(f)}"` : ''} data-fold="${esc(key)}">${folderHead(f, name, all, open, 0, kids.length)}
   ${open ? `${kids.length ? `<div class="tsubf" data-sort="folders">${kids.map(k => grp(k.id, k.name || '이름 없는 폴더')).join('')}</div>` : ''}<div class="tfb" data-sort="trainers" data-fid="${esc(fid)}">${n.map(([t, ti]) => trainerHTML(t, ti)).join('')}</div>` : ''}</div>`;
      };
      body = `<div id="trs" data-sort="folders">${fKids('')
        .map(f => grp(f.id, f.name || '이름 없는 폴더'))
        .join('')}${grp('', '폴더 없음')}</div>`;
    }
  }
  /* 11-03 감우 (20번 검토 편의 9): 소개 문단은 처음 한 번만 펼쳐 보이고 그 뒤엔 「소개 ▸」 로 접어 둔다 (이 브라우저) · 단추 넷은 좁은 화면에서 한 줄 가로 스크롤 */
  const introOpen = INTRO.first || localStorage.getItem('mkm_intro_open') === '1';
  root.innerHTML = `${hiddenN ? `<p class="small faint" style="margin:0 0 8px">🔒 비공개라서 안 보이는 트레이너 ${hiddenN}명 (내 것이면 「서명」에 같은 비밀구를 적으세요)</p>` : ''}<div class="intro ${introOpen ? '' : 'fold'}"><h1>캐릭터 시트 <button type="button" class="introtog" data-act="introtog" aria-expanded="${introOpen}" title="${introOpen ? '소개 접기' : '소개 보기'}">소개 ${introOpen ? '▾' : '▸'}</button></h1>${introOpen ? `<p>트레이너 폴더마다 자질·포인트·PT 서머리를 관리하고, 그 아래에 포켓몬 시트를 자유롭게 추가합니다. 「+ 폴더」로 세션별 대분류를 만들고 트레이너를 끌어다 넣을 수 있습니다. ${SH.on ? '모든 내용은 공유 DB에 자동 저장되어, 링크를 아는 사람 모두가 같이 보고 고칩니다.' : '모든 내용은 이 브라우저에 자동 저장됩니다.'}</p>` : ''}
 <span class="ibtns"><button class="btn pri" data-act="addT">+ 트레이너</button><button class="btn" data-act="addF">+ 폴더</button>${S.folders.length ? `<button class="btn ghost" data-act="fhide" title="나와 상관없는 폴더를 이 브라우저에서 숨기기">🙈 보이는 폴더${FHIDE.count() ? ` <small>(${FHIDE.count()}개 숨김)</small>` : ''}</button>` : ''}<button class="btn" data-act="impText">복사용 텍스트 붙여넣기</button></span><span class="csearch"><input type="search" id="cq" value="${esc(CQ)}" placeholder="이름 검색 (트레이너 · 포켓몬)" autocomplete="off" aria-label="트레이너 · 포켓몬 이름 검색">${cq ? '<button type="button" class="btn sm ghost" data-act="cqClear" title="검색 지우기">✕</button>' : ''}</span></div>
 ${body}${cq ? '' : FAV.rail()}`;
  if (cq) {
    for (const el of root.querySelectorAll('article.pk')) {
      const sec = el.closest('section.folder');
      const tid = sec ? sec.id.slice(3) : '';
      if (!hitP.has(el.id.slice(3)) && !hitT.has(tid)) el.style.display = 'none';
    }
  }
  fitFlist(root);
}
let CQ = '',
  cqT = null;
const INTRO = { first: localStorage.getItem('mkm_intro_open') == null };
if (INTRO.first) lsSet('mkm_intro_open', '0'); /* 처음 연 날엔 소개를 펼친 채로, 다음부터는 접힘 */
document.addEventListener('input', e => {
  if (!e.target.matches || !e.target.matches('#cq')) return;
  CQ = e.target.value;
  clearTimeout(cqT);
  cqT = setTimeout(() => {
    renderChar();
    const n = $('#cq');
    if (n) {
      n.focus();
      try {
        n.setSelectionRange(n.value.length, n.value.length);
      } catch (_) {}
    }
  }, 250);
});
/* 폴더 카드 트레이너 칩: 한 줄에 이름까지 안 들어가면 얼굴만 (10-24 망령) — 글꼴이 늦게 오거나 창 크기가 바뀌면 다시 잰다 */
function fitFlist(root) {
  const over = l => l.scrollWidth > l.clientWidth + 1;
  const run = () =>
    (root || document).querySelectorAll('.ftile .flist').forEach(l => {
      l.classList.remove('ico');
      l.querySelectorAll('.fch.fx').forEach(x => x.remove());
      const ch = [...l.querySelectorAll('.fch:not(.more):not(.none)')];
      ch.forEach(x => (x.style.display = ''));
      const mo = l.querySelector('.fch.more');
      if (mo) mo.style.display = '';
      if (!l.clientWidth || !over(l)) return;
      l.classList.add('ico');
      if (!over(l)) return;
      const tot = +l.dataset.n || ch.length;
      const x = document.createElement('span');
      x.className = 'fch more fx';
      l.append(x);
      if (mo) mo.style.display = 'none';
      let vis = ch.length;
      while (vis > 1) {
        ch[--vis].style.display = 'none';
        x.textContent = '+' + (tot - vis);
        if (!over(l)) break;
      }
    });
  run();
  setTimeout(run, 350);
}
{
  let ft = null;
  addEventListener('resize', () => {
    clearTimeout(ft);
    ft = setTimeout(() => {
      const r = document.getElementById('v-char');
      if (r) fitFlist(r);
    }, 150);
  });
}
/* 이름 입력 창 */
function askText(title, label, val = '') {
  return new Promise(res => {
    const l = openModal(
      `<div class="mhead"><h2>${esc(title)}</h2></div><div class="mbody"><label class="lbl" for="ask-txt">${esc(label)}<input id="ask-txt" value="${esc(val)}" maxlength="60" autocomplete="off"></label></div><div class="mfoot"><span class="sp"></span><button class="btn" data-x="no">취소</button><button class="btn pri" data-x="ok">확인</button></div>`,
      { onClose: () => res(null) }
    );
    const inp = $('#ask-txt', l);
    setTimeout(() => {
      inp.focus();
      inp.select();
    }, 40);
    const done = ok => {
      layers[layers.length - 1].onClose = null;
      closeModal();
      res(ok ? inp.value.trim() || null : null);
    };
    inp.addEventListener('keydown', e => {
      if (e.key === 'Enter' && !e.isComposing) {
        e.preventDefault();
        done(true);
      }
    });
    l.addEventListener('click', e => {
      const x = e.target.dataset.x;
      if (x) done(x === 'ok');
    });
  });
}
/* 11-03: 포켓몬을 다른 트레이너로 옮기기 / 복사 — 돌려줌 {tid, copy} · null = 취소 */
function askMoveP(T, P) {
  return new Promise(res => {
    const L = S.trainers.filter(t => t !== T && tVis(t));
    const fname = t => {
      const f = fById(tFolder(t));
      return f ? f.name || '이름 없는 폴더' : '폴더 없음';
    };
    const l = openModal(
      `<div class="mhead"><h2>「${esc(P.name || '이름 없음')}」 옮기기 / 복사</h2></div><div class="mbody">${
        L.length
          ? `<label class="lbl">대상 트레이너<select data-mt style="width:100%">${L.map(t => `<option value="${esc(t.id)}">${esc(t.name || '이름 없음')} — ${esc(fname(t))} · ${t.pokemon.length}체</option>`).join('')}</select></label>
 <div class="row small" style="gap:14px;margin-top:8px"><label class="row" style="gap:4px"><input type="radio" name="mvmode" value="move" checked>옮기기 (${esc(T.name || '이름 없음')}에게서 빠진다)</label><label class="row" style="gap:4px"><input type="radio" name="mvmode" value="copy">복사 (양쪽에 남는다)</label></div>`
          : '<p class="muted" style="margin:0">옮길 수 있는 다른 트레이너가 없습니다</p>'
      }</div><div class="mfoot"><span class="sp"></span><button class="btn" data-x="no">취소</button>${L.length ? '<button class="btn pri" data-x="ok">확인</button>' : ''}</div>`,
      { onClose: () => res(null) }
    );
    l.addEventListener('click', e => {
      const x = e.target.dataset.x;
      if (!x) return;
      layers[layers.length - 1].onClose = null;
      const tid = x === 'ok' ? $('[data-mt]', l).value : '';
      const copy = x === 'ok' && ($('input[name="mvmode"]:checked', l) || {}).value === 'copy';
      closeModal();
      res(x === 'ok' && tid ? { tid, copy } : null);
    });
  });
}
const delHint = () =>
  '<br><span class="small muted">지운 직후 5초 안에는 「실행 취소」로' +
  (SH.on && SH.canWrite ? ', 그 뒤에는 「파일 ▾ → 최근 지운 것」에서 (30일)' : '') +
  ' 되살릴 수 있습니다</span>';
/* 11-03 감우 (20번 검토 편의 11): 지운 것을 메모리에 들고 있다가 5초 안에 되돌린다. 되살리면 save() → shWant 에 다시 들어가 공유 DB 에도 그대로 다시 올라간다 */
function undoDel(msg, restore) {
  toastAct(msg, '실행 취소', restore);
}
function rkChip(q, r) {
  return `<span class="rk">${q[0]}<b style="background:${gcol(r)}">${esc(r)}</b></span>`;
}
/* 알그룹 선택지: 올드 타입 일람(실기 포켓몬)에 나오는 알그룹, 원작 도감 순 */
const EGG_ORDER = [
  '괴수',
  '수중1',
  '벌레',
  '비행',
  '육상',
  '요정',
  '식물',
  '인간형',
  '수중3',
  '광물',
  '부정형',
  '수중2',
  '메타몽',
  '드래곤',
  '알미발견'
];
function eggOpts() {
  const g = new Set();
  for (const r of (S.db && S.db.old) || []) for (const x of [r[8], r[9]]) if (x && x !== '-') g.add(String(x).trim());
  const o = i => {
    const k = EGG_ORDER.indexOf(i);
    return k < 0 ? 99 : k;
  };
  return ['-', ...[...g].sort((a, b) => o(a) - o(b) || KO.compare(a, b))];
}
function sel(path, val, opts, o = {}) {
  return `<select data-p="${esc(path)}" ${o.id ? `id="${esc(o.id)}"` : ''} ${o.style ? `style="${o.style}"` : ''}>${opts.map(v => `<option value="${esc(v)}" ${v === val ? 'selected' : ''}>${esc(v)}</option>`).join('')}${val && !opts.includes(val) ? `<option value="${esc(val)}" selected>${esc(val)}</option>` : ''}</select>`;
}
function inp(path, val, o = {}) {
  return `<input data-p="${esc(path)}" value="${esc(val ?? '')}" ${o.id ? `id="${esc(o.id)}"` : ''} ${o.w ? `style="width:${o.w}"` : ''} ${o.ph ? `placeholder="${esc(o.ph)}"` : ''} ${o.num ? 'inputmode="decimal"' : ''} ${o.list ? `list="${o.list}"` : ''}>`;
}
/* 『고유 포텐셜』 카드 — 트레이너의 얼굴이라 크게: 색 · 아이콘 · 부제(칭호)로 꾸민다 (u.color · u.icon · u.sub, 오레마스 시트 카드도 같은 색으로) */
const UQ_COL = ['#7b4fd6', '#d6336c', '#e8590c', '#e0a800', '#2f9e44', '#0c8599', '#1c7ed6', '#495057'];
/* 11-25 망령 「제목 글씨가 색을 그대로 따라가면 가시성 박살 — 검정 아니면 흰색」: 바탕 색의 밝기로 글자색을 검정/흰색 중에서 */
function fgOn(c) {
  const h = String(c || '')
    .trim()
    .replace('#', '');
  const x =
    h.length === 3
      ? h
          .split('')
          .map(z => z + z)
          .join('')
      : h.slice(0, 6);
  if (!/^[0-9a-f]{6}$/i.test(x)) return '#fff';
  const r = parseInt(x.slice(0, 2), 16),
    g = parseInt(x.slice(2, 4), 16),
    b = parseInt(x.slice(4, 6), 16);
  return (r * 299 + g * 587 + b * 114) / 1000 >= 150 ? '#111' : '#fff';
}
function uqCard(u, i, ti) {
  const c = safeCss(u.color) || UQ_COL[0];
  return `<div class="uqc ${u.name ? '' : 'vac'}" style="--uc:${c};--ucf:${fgOn(c)}" tabindex="0" role="button" data-kbd data-act="editU" data-i="${ti}" data-j="${i}"><div class="uqh"><span class="uqs">UNIQUE ${i + 1}</span>${u.icon ? `<span class="uqi">${esc(u.icon)}</span>` : ''}<div class="uqt"><b class="uqn">${esc(u.name || '비어 있음 · 눌러서 작성')}</b>${u.sub ? `<span class="uqsub">${esc(u.sub)}</span>` : ''}</div><span class="sp"></span><button type="button" class="btn sm ghost" data-act="decoU" data-i="${ti}" data-j="${i}" title="색 · 아이콘 · 부제 꾸미기">🎨 꾸미기</button><button type="button" class="btn sm ghost" data-act="delU" data-i="${ti}" data-j="${i}" aria-label="삭제">✕</button></div>${u.name && u.eff ? `<div class="uqe">${rich(u.eff)}</div>` : ''}</div>`;
}
function openUqDeco(T, j, done) {
  const u = T.unique[j];
  if (!u) return;
  const st = { color: safeCss(u.color) || UQ_COL[0], icon: u.icon || '', sub: u.sub || '' };
  const l = openModal(`<div class="mhead"><h2>고유 포텐셜 꾸미기</h2></div><div class="mbody"><div class="uqprev" data-uqprev></div>
  <div class="lbl" style="margin-top:12px">색</div><div class="row uqsw" style="gap:6px;align-items:center">${UQ_COL.map(c => `<button type="button" class="uqsw1" data-uc="${c}" style="background:${c}" aria-label="${c}"></button>`).join('')}<label class="small muted row" style="gap:4px">직접<input type="color" data-ucc value="${st.color.length === 7 ? st.color : '#7b4fd6'}"></label></div>
  <div class="lbl" style="margin-top:10px">타입 색</div><div class="row uqty" style="gap:4px;flex-wrap:wrap">${S.db.types
    .map(x => x[0])
    .filter(x => x && x !== '-' && tyCol(x))
    .map(
      x =>
        `<button type="button" class="uqty1" data-uc="${tyCol(x)}" style="background:${tyCol(x)};color:${(typeInfo(x) && safeCss(typeInfo(x)[2])) || '#fff'}">${esc(x)}</button>`
    )
    .join('')}</div>
  <label class="lbl" style="margin-top:10px">아이콘 <span class="small faint">이모지나 글자 1~2개 (예: ✦ 🜂 龍)</span><input data-uci value="${esc(st.icon)}" maxlength="4" autocomplete="off"></label>
  <label class="lbl" style="margin-top:8px">부제 · 칭호 <span class="small faint">이름 아래 작게 (예: 하늘을 가르는 자)</span><input data-ucs value="${esc(st.sub)}" maxlength="40" autocomplete="off"></label></div>
  <div class="mfoot"><button class="btn ghost" data-ucr>기본으로</button><span class="sp"></span><button class="btn" data-x="no">취소</button><button class="btn pri" data-x="ok">저장</button></div>`);
  const pv = () => {
    $('[data-uqprev]', l).innerHTML = uqCard(Object.assign({}, u, st), j, -1).replace(/<button[^>]*>.*?<\/button>/g, '');
    l.querySelectorAll('[data-uc]').forEach(x => x.classList.toggle('on', x.dataset.uc === st.color));
  };
  pv();
  l.querySelectorAll('[data-uc]').forEach(
    x =>
      (x.onclick = () => {
        st.color = x.dataset.uc;
        $('[data-ucc]', l).value = st.color;
        pv();
      })
  );
  $('[data-ucc]', l).oninput = e => {
    st.color = e.target.value;
    pv();
  };
  $('[data-uci]', l).oninput = e => {
    st.icon = e.target.value.trim();
    pv();
  };
  $('[data-ucs]', l).oninput = e => {
    st.sub = e.target.value.trim();
    pv();
  };
  $('[data-ucr]', l).onclick = () => {
    st.color = UQ_COL[0];
    st.icon = '';
    st.sub = '';
    $('[data-uci]', l).value = '';
    $('[data-ucs]', l).value = '';
    pv();
  };
  $('[data-x="no"]', l).onclick = () => closeModal();
  $('[data-x="ok"]', l).onclick = () => {
    if (st.color && st.color !== UQ_COL[0]) u.color = st.color;
    else delete u.color;
    if (st.icon) u.icon = st.icon;
    else delete u.icon;
    if (st.sub) u.sub = st.sub;
    else delete u.sub;
    closeModal();
    done();
  };
}
/* 10-22 망령: 트레이너 카드 — 꾸미기(색 · 칭호 · 배경 그림 · 무늬) · 소지 포켓몬 초상 6칸 · 고유 포텐셜 */
const cssu = s => String(s ?? '').replace(/[\s"'()\\<>]/g, c => '%' + c.charCodeAt(0).toString(16).padStart(2, '0').toUpperCase());
const TD_PAT = [
  ['', '기본 (옅은 볼 마크)'],
  ['none', '무늬 없음'],
  ['stripe', '줄무늬'],
  ['dot', '점'],
  ['grid', '격자'],
  ['wave', '물결']
]; /* 11-03 (20번 검토 연출 3): 꾸미기 없는 카드도 옅은 볼 마크 — 끄려면 「무늬 없음」 */
function tDecoVars(t) {
  const d = t.deco || {};
  const c = safeCss(d.color);
  const bg = safeImg(d.bg);
  return [c ? `--tc:${c}` : '', bg ? `--tbg:url('${cssu(bg)}')` : ''].filter(Boolean).join(';');
}
function tDecoCls(t) {
  const d = t.deco || {};
  return [safeCss(d.color) ? 'tdc' : '', safeImg(d.bg) ? 'tdb' : '', TD_PAT.some(x => x[0] && x[0] === d.pat) ? 'tdp-' + d.pat : '']
    .filter(Boolean)
    .join(' ');
}
function tPartyHTML(t, ti) {
  const ms = t.pokemon.slice(0, 6);
  if (!ms.length && !isMisag(t)) return '';
  const ring = p => {
    const a = tyCol(p.t1) || 'var(--sunk2)',
      b = tyCol(p.t2) || a;
    return `background:conic-gradient(${a} 0 50%,${b} 50% 100%)`;
  };
  const one = (p, j) =>
    `<button type="button" class="tpm ${p.partner ? 'ptn' : ''} ${onBench(p) ? 'bench' : ''}" data-act="tpk" data-i="${ti}" data-j="${j}" title="${esc((p.name || '(이름 없음)') + ' · ' + [p.t1, p.t2].filter(x => x && x !== '-').join('/') + (p.partner ? ' · 파트너' : ''))}"><span class="tpr" style="${ring(p)}"><span class="tpi">${safeImg(p.image) ? `<img src="${safeImg(p.image)}" alt="" loading="lazy">` : `<b>${esc([...(p.name || '?')][0] || '?')}</b>`}</span></span>${p.partner ? '<i class="tps">★</i>' : ''}<small>${esc(p.name || '')}</small>${baseTot(p) ? `<em class="tpc ${prCls(prideOf(p))}" title="프라이드 ${esc(prideOf(p))} · 통솔점 ${prideCost(t, p)}${(p.partner || soloN(t) === 2) && prideCost(t, p) < pnum((prRow(prideOf(p)) || [])[1], 0) ? ' (파트너 할인)' : ''}"><b>${esc(prideOf(p))}</b><i>${prideCost(t, p)}</i></em>` : ''}${awOf(t, p) ? `<i class="tpaw ${awOf(t, p)}">${awOf(t, p) === 'free' ? '대가' : '보조'}</i>` : ''}</button>`;
  const empty = n =>
    Array.from(
      { length: Math.max(0, n) },
      () => '<span class="tpm empty"><span class="tpr"><span class="tpi"></span></span><small>&nbsp;</small></span>'
    ).join('');
  /* 10-28 망령: 미사그 대학 — PL 4체 | 각성체 2체 칸을 나누고, 각성체 칸 밑에 대가를 띄운다 */
  if (isMisag(t)) {
    const all = t.pokemon.map((p, j) => [p, j]);
    const pl = all.filter(([p]) => !awOf(t, p)),
      aw = all.filter(([p]) => awOf(t, p));
    return `<div class="tparty tpmis" aria-label="소지 포켓몬"><div class="tpg"><span class="tpgl">PL <b>${pl.length}</b>/4</span><div class="tpgr">${pl
      .slice(0, 4)
      .map(([p, j]) => one(p, j))
      .join(
        ''
      )}${empty(4 - pl.length)}${pl.length > 4 ? `<span class="tpm more">+${pl.length - 4}</span>` : ''}</div></div><div class="tpg aw"><span class="tpgl">각성체 <b>${aw.length}</b>/2</span><div class="tpgr">${aw
      .slice(0, 2)
      .map(([p, j]) => one(p, j))
      .join('')}${empty(2 - aw.length)}</div>${misagPenHTML(t, 'tc')}</div></div>`;
  }
  return `<div class="tparty" aria-label="소지 포켓몬">${ms.map((p, j) => one(p, j)).join('')}${empty(6 - ms.length)}</div>`;
}
function tUqHTML(t, ti) {
  const U = (t.unique || []).map((u, j) => ({ u, j })).filter(x => x.u && x.u.name && x.u.name.trim());
  if (!U.length) return '';
  return `<div class="tuql">${U.slice(0, 3)
    .map(({ u, j }) => {
      const c = safeCss(u.color) || UQ_COL[0];
      return `<button type="button" class="tuqc" style="--uc:${c}" data-act="tuq" data-i="${ti}" data-j="${j}" title="${esc(
        String(u.eff || '')
          .replace(/<br\s*\/?>/gi, ' ')
          .slice(0, 300)
      )}"><em>${u.icon ? esc(u.icon) : 'UNIQUE'}</em><b>${esc(u.name)}</b>${u.sub ? `<small>${esc(u.sub)}</small>` : ''}</button>`;
    })
    .join(
      ''
    )}${U.length > 3 ? `<button type="button" class="tuqc more" data-act="tuq" data-i="${ti}" data-j="${U[3].j}" title="나머지 고유 포텐셜 보기">+${U.length - 3}</button>` : ''}</div>`;
}
/* 10-22 망령: 트레이너 카드의 고유 칩 → 고유 정보창. 위쪽 단추로 다른 고유로 넘기고, 편집 · 꾸미기로 바로 간다 */
function openUqInfo(T, j) {
  const U = (T.unique || []).map((u, k) => ({ u, k })).filter(x => x.u && x.u.name && x.u.name.trim());
  if (!U.length) return;
  let cur = U.some(x => x.k === j) ? j : U[0].k;
  const l = openModal(
    `<div class="mhead"><h2>고유 포텐셜 <span class="small muted" style="font-weight:400">${esc(T.name || '')}</span></h2><span class="sp"></span><button class="btn ghost" data-x>닫기</button></div><div class="mbody uqv-body"></div>`
  );
  const body = $('.uqv-body', l);
  const draw = () => {
    const u = T.unique[cur] || {};
    const c = safeCss(u.color) || UQ_COL[0];
    body.innerHTML = `${U.length > 1 ? `<div class="uqv-tabs">${U.map(({ u: x, k }) => `<button type="button" class="uqv-tab ${k === cur ? 'on' : ''}" style="--uc:${safeCss(x.color) || UQ_COL[0]}" data-uqk="${k}">${x.icon ? `<i>${esc(x.icon)}</i>` : ''}${esc(x.name)}</button>`).join('')}</div>` : ''}
   <div class="uqv" style="--uc:${c}"><div class="uqv-h"><span class="uqv-b">${u.icon ? esc(u.icon) : 'UNIQUE'}</span><div><b class="uqv-n">『${esc(u.name)}』</b>${u.sub ? `<div class="uqv-s">${esc(u.sub)}</div>` : ''}</div></div>
    <div class="uqv-e">${u.eff ? fxTxt(u.eff) : '<span class="faint">효과가 비어 있다</span>'}</div>${u.auto ? `<div class="uqv-a small muted">⚙ 자동화 구문 있음</div>` : ''}</div>
   <div class="row" style="margin-top:12px;gap:6px"><span class="sp"></span><button class="btn sm ghost" data-uqdeco>🎨 꾸미기</button><button class="btn sm pri" data-uqedit>편집</button></div>`;
    body.querySelectorAll('[data-uqk]').forEach(
      b =>
        (b.onclick = () => {
          cur = +b.dataset.uqk;
          draw();
        })
    );
    $('[data-uqedit]', body).onclick = () => {
      closeModal();
      openPotEditor(T, null, { unique: cur });
    };
    $('[data-uqdeco]', body).onclick = () => {
      closeModal();
      openUqDeco(T, cur, () => refreshTrainer(T));
    };
  };
  draw();
  l.querySelectorAll('[data-x]').forEach(b => (b.onclick = () => closeModal()));
}
/* 트레이너 상세 (10-26 망령): 백스토리 · 성격 · 말투 · 선호하는 전법 등 — t.bio=[{k,v}] · 오레마스 캐릭터 탭 「상세」에 그대로 */
/* 10-26 망령: 세션 노트 공개 칸과 하나로 — 노트 PC/NPC 시트의 공개 칸 = 이 「상세」(t.bio). 예전 노트 칸(t.rp)은 처음 열 때 여기로 옮겨진다 */
const BIO_DEF = ['백스토리', '성격', '말투', '겉모습', '목표 · 동기', '인간관계', '선호하는 전법', '메모'],
  BIO_NPC = ['PL 이 아는 것'];
const bioDef = t => (t && t.kind === 'npc' ? BIO_DEF.concat(BIO_NPC) : BIO_DEF);
const RP2BIO = (t, k) =>
  ({ bg: '백스토리', goal: '목표 · 동기', bond: '인간관계', style: '말투', note: t && t.kind === 'npc' ? 'PL 이 아는 것' : '메모' })[k];
function bioOf(t) {
  const D = bioDef(t);
  const L = (Array.isArray(t.bio) ? t.bio : []).filter(x => x && (x.k || x.v)).map(x => ({ k: String(x.k || ''), v: String(x.v || '') }));
  const rp = t.rp || {};
  for (const k in rp) {
    const lab = RP2BIO(t, k);
    const v = String(rp[k] || '').trim();
    if (!lab || !v) continue;
    const e = L.find(x => x.k === lab);
    if (!e) L.push({ k: lab, v });
    else if (!String(e.v).trim()) e.v = v;
  }
  for (const k of D) if (!L.some(x => x.k === k)) L.push({ k, v: '' });
  const o = k => {
    const i = D.indexOf(k);
    return i < 0 ? 99 : i;
  };
  return L.sort((a, b) => o(a.k) - o(b.k));
}
const bioN = t => bioOf(t).filter(x => String(x.v || '').trim()).length;
function openBio(T, done) {
  let L = bioOf(T);
  const row = (
    x,
    i
  ) => `<div class="bior" data-bi="${i}" style="border:1px solid var(--line,#ddd);border-radius:8px;padding:8px;display:flex;flex-direction:column;gap:6px">
  <div class="row" style="gap:6px;align-items:center">${bioDef(T).includes(x.k) ? `<b style="flex:1">${esc(x.k)}</b>` : `<input data-bk value="${esc(x.k)}" placeholder="항목 이름 (예: 외모 · 좋아하는 것 · 대사)" style="flex:1;min-width:0">`}${bioDef(T).includes(x.k) ? '' : `<button type="button" class="btn sm ghost danger" data-bdel aria-label="이 항목 지우기">✕</button>`}</div>
  <textarea data-bv rows="${x.k === '백스토리' ? 7 : 3}" placeholder="${esc(x.k === '말투' ? '예) 존댓말 · 말끝을 흐림 · 자주 쓰는 말' : x.k === '선호하는 전법' ? '예) 날씨 파티 · 교대전 · 먼저 깔고 버틴다' : x.k === '성격' ? '예) 겁이 많지만 동료를 위해서는 물러서지 않는다' : '')}">${esc(x.v)}</textarea></div>`;
  const l = openModal(
    `<div class="mhead"><h2>상세 · ${esc(T.name || '트레이너')}</h2><span class="sp"></span><button class="btn ghost" data-x>닫기</button></div>
  <div class="mbody"><p class="small muted" style="margin:0">빈 칸은 보이지 않는다 · 세션 노트 PC/NPC 시트의 공개 칸과 같은 칸 · 오레마스 캐릭터 탭 「상세」에도 나온다 (「제작기 동기화」 뒤)</p><div data-bl style="display:flex;flex-direction:column;gap:8px;margin-top:8px"></div>
   <button type="button" class="btn sm" data-badd style="margin-top:8px">+ 항목</button></div>
  <div class="mfoot"><span class="sp"></span><button class="btn" data-x>취소</button><button class="btn pri" data-bsave>저장</button></div>`,
    { wide: true }
  );
  const read = () => {
    $$('[data-bi]', l).forEach(el => {
      const x = L[+el.dataset.bi];
      if (!x) return;
      const k = $('[data-bk]', el);
      if (k) x.k = k.value.trim();
      x.v = $('[data-bv]', el).value;
    });
  };
  const draw = () => {
    $('[data-bl]', l).innerHTML = L.map(row).join('');
  };
  draw();
  l.addEventListener('click', e => {
    if (e.target.closest('[data-x]')) return closeModal();
    if (e.target.closest('[data-badd]')) {
      read();
      L.push({ k: '', v: '' });
      draw();
      const ins = $$('[data-bk]', l);
      if (ins.length) ins[ins.length - 1].focus();
      return;
    }
    const d = e.target.closest('[data-bdel]');
    if (d) {
      read();
      L.splice(+d.closest('[data-bi]').dataset.bi, 1);
      draw();
      return;
    }
    if (e.target.closest('[data-bsave]')) {
      read();
      T.bio = L.map(x => ({ k: x.k.trim() || '메모', v: x.v.replace(/\s+$/, '') })).filter(x => x.v.trim());
      delete T.rp;
      delete T.rpAt;
      closeModal();
      done && done();
      toast('상세를 저장했습니다');
    }
  });
}
function openTDeco(T, done, FD) {
  const d = T.deco || {};
  const st = {
    color: safeCss(d.color) || '',
    title: d.title || '',
    bg: safeImg(d.bg) || '',
    pat: d.pat || '',
    icon: d.icon || ''
  }; /* FD: 폴더 꾸미기 (10-24) */
  const l =
    openModal(`<div class="mhead"><h2>${FD ? '폴더 꾸미기' : '트레이너 카드 꾸미기'}</h2></div><div class="mbody"><div class="tdprev" data-tdprev></div>
  <div class="lbl" style="margin-top:12px">카드 색</div><div class="row uqsw" style="gap:6px;align-items:center"><button type="button" class="uqsw1 none" data-tc="" aria-label="기본" title="기본">✕</button>${UQ_COL.map(c => `<button type="button" class="uqsw1" data-tc="${c}" style="background:${c}" aria-label="${c}"></button>`).join('')}<label class="small muted row" style="gap:4px">직접<input type="color" data-tcc value="${st.color.length === 7 ? st.color : '#7b4fd6'}"></label></div>
  ${FD ? `<div class="lbl" style="margin-top:10px">아이콘 <span class="small faint">이모지 · 글자 하나 (비우면 폴더 모양)</span></div><div class="row" style="gap:4px;flex-wrap:wrap;align-items:center"><input data-tci value="${esc(st.icon)}" maxlength="4" style="width:64px;text-align:center" autocomplete="off">${['📁', '⭐', '🔥', '💧', '🌿', '⚡', '🌙', '👑', '🎲', '⚔️', '🏆', '🎀'].map(x => `<button type="button" class="btn sm ghost" data-tcip="${x}">${x}</button>`).join('')}</div>` : ''}
  <label class="lbl" style="margin-top:10px">${FD ? '부제 <span class="small faint">이름 아래 작게 (예: 3월 세션 · 화요일 팀)</span>' : '칭호 <span class="small faint">이름 아래 작게 (예: 무진의 떠돌이 박사)</span>'}<input data-tct value="${esc(st.title)}" maxlength="40" autocomplete="off"></label>
  <div class="lbl" style="margin-top:10px">무늬</div><div class="row" style="gap:6px;flex-wrap:wrap">${TD_PAT.map(([k, n]) => `<button type="button" class="btn sm ${st.pat === k ? 'pri' : ''}" data-tp="${k}">${n}</button>`).join('')}</div>
  <div class="lbl" style="margin-top:10px">배경 그림 <span class="small faint">카드 오른쪽에 흐리게 · 클릭 · 끌어다 놓기 · 붙여넣기 · 주소</span></div>
  <div class="row" style="gap:6px;flex-wrap:nowrap"><input data-tcb value="${esc(/^data:/.test(st.bg) ? '' : st.bg)}" placeholder="${/^data:/.test(st.bg) ? '(올린 그림)' : 'https://…'}" style="flex:1;min-width:0" autocomplete="off"><label class="btn sm">파일<input type="file" accept="image/*" data-tcf hidden></label><button type="button" class="btn sm ghost" data-tcx title="배경 그림 지우기">✕</button></div></div>
  <div class="mfoot"><button class="btn ghost" data-tcr>기본으로</button><span class="sp"></span><button class="btn" data-x="no">취소</button><button class="btn pri" data-x="ok">저장</button></div>`);
  const pv = () => {
    const tt = Object.assign({}, T, { deco: st });
    if (FD) {
      const n = S.trainers.map((t, ti) => [t, ti]).filter(([t]) => tFolder(t) === T.id);
      $('[data-tdprev]', l).innerHTML = `<div class="tfold">${folderHead(tt, T.name || '이름 없는 폴더', n, false, 1)}</div>`;
      l.querySelectorAll('[data-tc]').forEach(x => x.classList.toggle('on', x.dataset.tc === st.color));
      l.querySelectorAll('[data-tp]').forEach(x => x.classList.toggle('pri', x.dataset.tp === st.pat));
      return;
    }
    $('[data-tdprev]', l).innerHTML =
      `<div class="folder tdpw"><header class="fh tcard ${tDecoCls(tt)}" style="${tDecoVars(tt)}"><span class="avatar">${safeImg(T.image) ? `<img src="${safeImg(T.image)}" alt="">` : esc([...(T.name || '?')][0] || '?')}</span><div class="tmain"><div class="tl1"><span class="tname">${esc(T.name)}</span></div>${st.title ? `<div class="ttitle">${esc(st.title)}</div>` : ''}<div class="tl3"><span class="row trk">${QUAL.map(q => rkChip(q, T.ranks[q])).join('')}</span></div></div>${tPartyHTML(T, -1).replace(/data-act="tpk"/g, '')}</header></div>`;
    l.querySelectorAll('[data-tc]').forEach(x => x.classList.toggle('on', x.dataset.tc === st.color));
    l.querySelectorAll('[data-tp]').forEach(x => x.classList.toggle('pri', x.dataset.tp === st.pat));
  };
  pv();
  const setBg = f => {
    if (!f || !/^image\//.test(f.type)) return;
    readImg(f, 1000, 'image/webp', u => {
      st.bg = u;
      $('[data-tcb]', l).value = '';
      $('[data-tcb]', l).placeholder = '(올린 그림)';
      pv();
      /* 10-23 이그레스: 고르자마자 공유 저장소에 올려 주소로 바꾼다 (저장을 먼저 누르면 예전처럼 저장 뒤에 옮긴다) */
      if (shHostOn())
        hostImg(FD ? 'fb' : 'tb', T.id, u)
          .then(url => {
            if (st.bg !== u) return;
            st.bg = url;
            $('[data-tcb]', l).value = url;
            pv();
          })
          .catch(e => console.warn('[배경 그림]', e));
    });
  };
  l.querySelectorAll('[data-tc]').forEach(
    x =>
      (x.onclick = () => {
        st.color = x.dataset.tc;
        if (st.color) $('[data-tcc]', l).value = st.color;
        pv();
      })
  );
  $('[data-tcc]', l).oninput = e => {
    st.color = e.target.value;
    pv();
  };
  $('[data-tct]', l).oninput = e => {
    st.title = e.target.value.trim();
    pv();
  };
  if (FD) {
    $('[data-tci]', l).oninput = e => {
      st.icon = e.target.value.trim();
      pv();
    };
    l.querySelectorAll('[data-tcip]').forEach(
      x =>
        (x.onclick = () => {
          st.icon = x.dataset.tcip;
          $('[data-tci]', l).value = st.icon;
          pv();
        })
    );
  }
  l.querySelectorAll('[data-tp]').forEach(
    x =>
      (x.onclick = () => {
        st.pat = x.dataset.tp;
        pv();
      })
  );
  $('[data-tcb]', l).onchange = e => {
    const v = e.target.value.trim();
    if (!v || /^https?:\/\//.test(v)) {
      st.bg = v;
      pv();
    } else toast('https:// 로 시작하는 주소를 넣어 주세요');
  };
  $('[data-tcf]', l).onchange = e => setBg(e.target.files[0]);
  $('[data-tcx]', l).onclick = () => {
    st.bg = '';
    $('[data-tcb]', l).value = '';
    $('[data-tcb]', l).placeholder = 'https://…';
    pv();
  };
  const box = $('.mbox', l) || l;
  box.addEventListener('dragover', e => {
    e.preventDefault();
  });
  box.addEventListener('drop', e => {
    const f = e.dataTransfer && [...e.dataTransfer.files].find(x => /^image\//.test(x.type));
    if (f) {
      e.preventDefault();
      e.stopPropagation();
      setBg(f);
    }
  });
  box.addEventListener('paste', e => {
    const it = [...((e.clipboardData && e.clipboardData.items) || [])].find(x => x.type.startsWith('image/'));
    if (it) {
      e.preventDefault();
      e.stopPropagation();
      setBg(it.getAsFile());
    }
  });
  $('[data-tcr]', l).onclick = () => {
    st.color = '';
    st.title = '';
    st.bg = '';
    st.pat = '';
    st.icon = '';
    if (FD) $('[data-tci]', l).value = '';
    $('[data-tct]', l).value = '';
    $('[data-tcb]', l).value = '';
    pv();
  };
  $('[data-x="no"]', l).onclick = () => closeModal();
  $('[data-x="ok"]', l).onclick = () => {
    const o = {};
    if (st.color) o.color = st.color;
    if (st.title) o.title = st.title;
    if (st.bg) o.bg = st.bg;
    if (st.pat) o.pat = st.pat;
    if (FD && st.icon) o.icon = st.icon;
    if (Object.keys(o).length) T.deco = o;
    else delete T.deco;
    closeModal();
    done();
    if (o.bg && /^data:/.test(o.bg) && shHostOn())
      hostImg(FD ? 'fb' : 'tb', T.id, o.bg)
        .then(url => {
          if (!T.deco || T.deco.bg !== o.bg) return;
          T.deco.bg = url;
          save();
          if (FD) renderChar();
          else refreshTrainer(T);
        })
        .catch(e => toast('배경 그림을 공유 저장소에 올리지 못해 시트 안에 넣었습니다 (' + e.message + ')'));
  };
}
/* html2canvas 1.4 는 color(srgb …) · oklch 같은 새 색 함수를 못 읽는다 (color-mix 의 계산 값이 그 꼴) → 복제본의 계산된 색을 rgba 로 바꿔 넣는다 (::before · ::after 는 규칙으로) */
const PNG_PROPS = [
  'color',
  'background-color',
  'background-image',
  'border-top-color',
  'border-right-color',
  'border-bottom-color',
  'border-left-color',
  'outline-color',
  'text-decoration-color',
  'box-shadow',
  'text-shadow',
  'fill',
  'stroke'
];
const PNG_BAD = /color\(|oklch\(|oklab\(|\blab\(|\blch\(/;
function pngRgb(v) {
  v = String(v).replace(
    /color\(srgb\s+([\d.e-]+)\s+([\d.e-]+)\s+([\d.e-]+)(?:\s*\/\s*([\d.e-]+%?))?\)/g,
    (_, r, g, b, a) =>
      `rgba(${Math.round(r * 255)},${Math.round(g * 255)},${Math.round(b * 255)},${a == null ? 1 : /%$/.test(a) ? parseFloat(a) / 100 : +a})`
  );
  if (PNG_BAD.test(v)) {
    let cx = null;
    try {
      cx = document.createElement('canvas').getContext('2d');
    } catch (e) {}
    v = v.replace(/(color|oklch|oklab|lab|lch)\([^()]*\)/g, m => {
      if (!cx) return 'rgba(0,0,0,0)';
      cx.fillStyle = 'rgba(0,0,0,0)';
      cx.fillStyle = m;
      const f = String(cx.fillStyle);
      return /^(#|rgb)/.test(f) ? f : 'rgba(0,0,0,0)';
    });
  }
  return v;
}
/* 11-03 감우 (20번 검토 연출 2): 한 장 요약 그림 — 테마 배경색 · 바깥 24px 여백 · 아래 각주(트레이너 이름 · 날짜) */
function pngBg() {
  const r = getComputedStyle(MKROOT());
  const v = (r.getPropertyValue('--bg') || '').trim() || (r.getPropertyValue('--surface') || '').trim() || '#fff';
  return PNG_BAD.test(v) ? pngRgb(v) : v;
}
function pngFrame(cdoc, cw, t, p, bg) {
  const W = cdoc.defaultView;
  const ink = W ? W.getComputedStyle(cw).color : '';
  cw.style.padding = '24px';
  cw.style.boxSizing = 'border-box';
  cw.style.background = bg;
  cw.style.overflow = 'visible';
  cw.style.maxHeight = 'none';
  cw.style.height = 'auto';
  cw.style.flex = 'none';
  const f = cdoc.createElement('div');
  f.setAttribute(
    'style',
    `margin-top:14px;padding-top:8px;border-top:1px solid rgba(127,127,127,.35);display:flex;justify-content:space-between;gap:12px;font-size:12px;opacity:.75;color:${ink || 'inherit'}`
  );
  const d = new Date();
  const ds = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  f.innerHTML = `<span>${typeof t === 'string' ? esc(t) : `${esc(t.name || '트레이너')} · ${esc(p.nick || p.name || '포켓몬')}${p.nick && p.name ? ` (${esc(p.name)})` : ''}`}</span><span>망켓몬 제작기 · ${ds}</span>`;
  cw.appendChild(f);
} /* t 가 글이면 그 글이 각주 (11-17 트레이너 · 던전 한 장 요약) */
/* 한 장 요약을 감싼 .pcd-wrap 을 찍는다 (카드 바깥 24px 여백 + 각주). 높이는 카드 + 여백 48 + 각주 자리 */
function pngOpts(el, bg, t, p) {
  const wrap = el.parentNode;
  return {
    backgroundColor: bg,
    scale: 2,
    useCORS: true,
    width: wrap.clientWidth,
    height: el.offsetHeight + 48 + 42,
    scrollX: 0,
    scrollY: 0,
    onclone: (cd, cw) => {
      try {
        pngDetails(cd);
      } catch (e) {}
      try {
        pngFrame(cd, cw, t, p, bg);
        pngFix(cd, cw);
      } catch (e) {}
    }
  };
}
/* 11-25 망령 「PNG 로 한장 요약 내보냈더니 난리」: html2canvas 는 접힌 <details> 안쪽을 자리 없이 겹쳐 그린다 — 복제본에서 접힌 것은 summary 만 남기고, details · summary 를 보통 div 로 바꾼다 (펼친 것은 내용 그대로) */
function pngDetails(cd) {
  for (const d of [...cd.querySelectorAll('details')]) {
    const open = d.open;
    const box = cd.createElement('div');
    for (const a of d.attributes) if (a.name !== 'open') box.setAttribute(a.name, a.value);
    if (open) box.setAttribute('data-open', '1');
    for (const c of [...d.childNodes]) {
      if (c.nodeType === 1 && c.tagName === 'SUMMARY') {
        const s = cd.createElement('div');
        for (const a of c.attributes) s.setAttribute(a.name, a.value);
        s.classList.add('pngsum');
        while (c.firstChild) s.appendChild(c.firstChild);
        box.appendChild(s);
      } else if (open) box.appendChild(c);
    }
    d.replaceWith(box);
  }
}
function pngFix(cdoc, root) {
  const W = cdoc.defaultView;
  if (!W) return;
  const css = [];
  let n = 0;
  const els = [root, ...root.querySelectorAll('*')];
  for (const el of els) {
    const cs = W.getComputedStyle(el);
    for (const p of PNG_PROPS) {
      const v = cs.getPropertyValue(p);
      if (v && PNG_BAD.test(v)) el.style.setProperty(p, pngRgb(v), 'important');
    }
    for (const ps of ['::before', '::after']) {
      const c2 = W.getComputedStyle(el, ps);
      if (!c2 || c2.content === 'none' || c2.content === 'normal') continue;
      const fx = [];
      for (const p of PNG_PROPS) {
        const v = c2.getPropertyValue(p);
        if (v && PNG_BAD.test(v)) fx.push(`${p}:${pngRgb(v)} !important`);
      }
      if (fx.length) {
        const k = 'pngfx' + n++;
        el.classList.add(k);
        css.push(`.${k}${ps}{${fx.join(';')}}`);
      }
    }
  }
  if (css.length) {
    const s = cdoc.createElement('style');
    s.textContent = css.join('\n');
    cdoc.head.appendChild(s);
  }
}

/* 10-22 망령: 포켓몬 한 장 요약 — 이름·타입·특성·기술·능력치·상성·전용·포텐셜을 한 화면에 (PNG 로 저장) */
function fxTxt(s) {
  return esc(brN(s))
    .replace(/\n/g, '<br>')
    .replace(/「([^」<]{1,40})」/g, '<span class="cq">「$1」</span>')
    .replace(/『([^』<]{1,40})』/g, '<span class="cq2">『$1』</span>')
    .replace(/【([^】<]{1,30})】/g, '<span class="cq3">【$1】</span>');
}
/* 11-01 망령 「한 장 보기 — 메모가 보기 어렵고 포텐셜 아래로 가 있다, 위치 조정하고 꾸며」: 메모는 왼쪽 칸(받는 상성 아래) 카드로.
   【제목】 줄은 머리띠(뒤 글은 부제), 「이름: 값」 줄은 이름표 + 값, 그 밖의 줄은 문단 */
function pcdMemoHTML(memo, edBtn) {
  const L = String(memo || '')
    .replace(/\r/g, '')
    .split('\n');
  const out = [];
  let kv = [];
  const flush = () => {
    if (kv.length) {
      out.push(`<dl class="pcd-mkv">${kv.map(([k, v]) => `<dt>${esc(k)}</dt><dd>${fxTxt(v)}</dd>`).join('')}</dl>`);
      kv = [];
    }
  };
  for (const raw of L) {
    const x = raw.trim();
    if (!x) {
      flush();
      continue;
    }
    let m = x.match(/^【([^】]{1,24})】\s*(.*)$/);
    if (m) {
      flush();
      const [nm, ...rest] = m[2].split(/\s*·\s*/);
      out.push(
        `<div class="pcd-mhd"><span class="pcd-mtag">${esc(m[1])}</span>${nm ? `<b>${esc(nm)}</b>` : ''}${rest.length ? `<span class="pcd-msub">${rest.map(esc).join(' · ')}</span>` : ''}</div>`
      );
      continue;
    }
    m = x.match(/^([^:：\s][^:：]{0,11})\s*[:：]\s*(.+)$/);
    if (m && !/^https?$/i.test(m[1])) {
      kv.push([m[1], m[2]]);
      continue;
    }
    flush();
    out.push(`<p>${fxTxt(x)}</p>`);
  }
  flush();
  return `<div class="pcd-memo"><div class="pcd-h">메모${edBtn || ''}</div>${out.length ? `<div class="pcd-mbody">${out.join('')}</div>` : '<div class="small faint">비어 있다</div>'}</div>`;
}
function pokeCardHTML(t, p, ed) {
  const E = (k, v, tt, x) =>
    ed
      ? `<button type="button" class="pce${x ? ' ' + x : ''}" data-pce="${k}"${v != null ? ` data-v="${esc(v)}"` : ''} title="${esc(tt || '고치기')}">${x === 'add' ? '＋' : x === 'del' ? '×' : '✎'}</button>`
      : '';
  /* 10-24 망령: 한 장 요약에서 바로 고치기 · 더하기 (ed) */ const tys = [p.t1, p.t2, p.t3].filter(x => x && x !== '-').flatMap(tyParts);
  const ab = idx.abil.get(p.ability),
    it = itemRow(p);
  const tot = p.base.reduce((a, b) => a + (+b || 0), 0);
  const cap = moveCap(t, p);
  const mv = p.moves
    .filter(m => m.name && !m.hide)
    .map(m => {
      const r = mvRowOv(m) || [];
      /* 「숨김」 기술은 한 장 요약에 안 나온다 */ const g = i => r[i] ?? '';
      const ti = typeInfo(g(5));
      return {
        name: m.name,
        ty: g(5),
        bg: (ti && safeCss(ti[1])) || 'var(--sunk2)',
        fg: (ti && safeCss(ti[2])) || 'var(--ink)',
        cat: g(6),
        pow: g(7),
        acc: g(8),
        range: g(9),
        prio: g(11),
        eff: g(13)
      };
    });
  const all = S.db.types.map(x => x[0]).filter(x => x && x !== '-' && tyChart()[x]);
  const mul = {};
  for (const a of all) mul[a] = tyMult(a, tys);
  const grp = [
    [8, '8배', 'x8'],
    [4, '4배', 'x4'],
    [2, '2배', 'x2'],
    [0.5, '1/2', 'h'],
    [0.25, '1/4', 'q'],
    [0.125, '1/8', 'e'],
    [0, '무효', 'z']
  ]
    .map(([v, l, c]) => ({
      l,
      c,
      list: all.filter(a =>
        v === 8
          ? mul[a] >= 8
          : v === 4
            ? mul[a] === 4
            : v === 2
              ? mul[a] === 2
              : v === 0.5
                ? mul[a] === 0.5
                : v === 0.25
                  ? mul[a] === 0.25
                  : v === 0.125
                    ? mul[a] > 0 && mul[a] <= 0.125
                    : mul[a] === 0
      )
    }))
    .filter(g => g.list.length);
  const pots = p.pots.map((n, i) => ({ n, i, k: potKindOf(p, i), e: potEffOf(p, i) })).filter(x => x.n && x.n !== '-');
  const XL = exclAll(p);
  const sub = [roleOf(p), classOf(p), prideOf(p) ? '프라이드 ' + prideOf(p) : ''].filter(Boolean).join(' · ');
  return `<div class="pcd" style="${pkVars(p)}"><div class="pcd-l">
  <div class="pcd-hd"><div class="pcd-img">${safeImg(p.image) ? `<img src="${safeImg(p.image)}" alt="">` : '<span class="pav ph0"></span>'}</div>
   <div class="pcd-ttl"><div class="pcd-nm">${p.partner ? '<span class="pstar">★</span>' : ''}${esc(p.name || '(이름 없음)')}${genderGlyph(p.gender)}<span class="lvb">Lv.${lv(t, p)}</span>${E('name', null, '이름 고치기')}</div>
    <div class="pcd-sub">${esc(sub)}</div>
    <div class="pcd-tags"><span class="chips">${tchip(p.t1)}${tchip(p.t2)}${tchip(p.t3)}</span>${E('types', null, '타입 · 테라 · 알그룹 고치기')}${p.tera && p.tera !== '-' ? `<span class="pcd-k">테라</span><span class="chips">${tchip(p.tera)}</span>` : ''}${[p.egg1, p.egg2].some(x => x && x !== '-') ? `<span class="pcd-k">알그룹</span><span class="pcd-v">${esc([p.egg1, p.egg2].filter(x => x && x !== '-').join(' · '))}</span>` : ''}</div>
   </div></div>${t.name ? `<div class="pcd-trn"><span class="pcd-k">트레이너</span><b>${esc(t.name)}</b></div>` : ''}${awOf(t, p) ? `<div class="pcd-aw"><span class="tpaw ${awOf(t, p)}">${esc(AW_LAB[awOf(t, p)])}</span>${misagPenHTML(t, 'pcd')}</div>` : ''}
  <div class="pcd-ab"><span class="pcd-k">특성</span><b>${esc(p.ability || '-')}</b>${E('abil', null, '특성 고르기')}${ab ? `<div class="pcd-e">${fxTxt(ab[2])}</div>` : ''}</div>
  ${p.item || ed ? `<div class="pcd-ab"><span class="pcd-k">도구</span><b>${esc(p.item || '-')}</b>${E('item', null, '도구 고르기')}${ed && p.item ? E('itemx', null, '도구 빼기', 'del') : ''}${it ? `<div class="pcd-e">${fxTxt(it[4])}</div>` : ''}</div>` : ''}${(
    p.items2 || []
  )
    .filter(x => x.item)
    .map(x => {
      const r = itemRow(x);
      return `<div class="pcd-ab"><span class="pcd-k">도구</span><b>${esc(x.item)}</b>${r ? `<div class="pcd-e">${fxTxt(r[4])}</div>` : ''}</div>`;
    })
    .join('')}
  <div class="pcd-st">${STATS.map((sn, i) => {
    const eb = effB(t, p)[i];
    const tip = buTip(t, p, i);
    const v = +eb || 0,
      g = grade(eb);
    return `<div class="pcd-sr" ${tip ? `title="${esc(tip)}"` : ''}><span class="pcd-sl">${sn}</span><span class="pcd-bar"><i style="width:${Math.min(100, (v / 180) * 100)}%;background:${gcol(g)}"></i></span><b class="pcd-g" style="background:${gcol(g)}">${tip ? '▲' : ''}${esc(g)}</b><span class="num pcd-sv">${p.base[i] === '' ? '-' : v}</span><span class="num faint pcd-sa">${p.base[i] === '' ? '' : stat(t, p, i)}</span></div>`;
  }).join(
    ''
  )}<div class="pcd-tot small muted">${E('base', null, '종족치 고치기')}종족치 합 <b class="num">${tot}</b>${cap.cap != null ? ` · 기술 ${capTxt(cap, '-', '/')}` : ''}</div></div>
   <div class="pcd-ty"><div class="pcd-h">받는 상성</div>${grp.length ? grp.map(g => `<div class="pcd-tg ${g.c}"><span>${g.l}</span><div class="chips">${g.list.map(a => tchip(a)).join('')}</div></div>`).join('') : '<div class="small faint">타입이 없다</div>'}</div>${p.memo || ed ? pcdMemoHTML(p.memo, E('memo', null, '메모 고치기')) : ''}</div>
  <div class="pcd-flow"><div class="pcd-mvc">${mv.length || ed ? `<div class="pcd-h">기술 <span class="faint">${mv.length}</span>${E('mvadd', null, '기술 검색 · 추가 · 빼기', 'add')}</div>${mv.map(m => `<div class="pcd-m" style="--mb:${m.bg};--mf:${m.fg}"><div class="pcd-mh"><b>${esc(m.name)}</b><span class="pcd-mt">${esc(m.ty)}</span>${E('mved', m.name, '다른 기술로 바꾸기')}${E('mvdel', m.name, '이 기술 빼기', 'del')}</div><div class="pcd-mm">${esc(m.cat || '-')} · 위력 ${esc(m.pow || '-')} · 명중 ${esc(m.acc || '-')} · ${esc(m.range || '-')}${m.prio && +m.prio ? ` · 우선 ${esc(m.prio)}` : ''}</div>${m.eff && m.eff !== '-' ? `<div class="pcd-e">${fxTxt(m.eff)}</div>` : ''}</div>`).join('')}` : ''}
  </div><div class="pcd-ptc">${XL.length || ed ? `<div class="pcd-h">${exLab(t)}${E('exadd', null, exLab(t) + ' 더하기', 'add')}</div>${XL.map(x => `<div class="pcd-x"${x.ty && tyCol(x.ty) ? ` style="--c1:${tyCol(x.ty)}"` : ''}><b>『${esc(x.name)}』</b>${E('exed', x === p.excl ? 'excl' : 'x' + (p.exclX || []).indexOf(x), '전용 포텐셜 고치기')}<div class="pcd-e">${fxTxt(x.eff)}</div></div>`).join('')}` : ''}
  ${(() => {
    /* 11-09 망령 「포켓몬에 필드 전개가 있으면 한 장 요약에서 전용 포텐셜 아래에」 */ const FL = fieldsFix(p.fields);
    if (!FL.length) return '';
    return `<div class="pcd-h">필드 전개 <span class="faint">${FL.length}</span></div>${FL.map(f => {
      const ti = typeInfo(fldTypeKo(f.color));
      const col = ti ? safeCss(ti[1]) : '';
      const img = safeImg(f.img);
      return `<div class="pcd-x pcd-fld" style="${col ? `--fc:${col};` : ''}border-left:3px solid var(--fc,#6a6f7a);padding-left:8px">${img ? `<img class="pcd-fimg" src="${img}" alt="" style="display:block;width:100%;max-height:120px;object-fit:cover;border-radius:6px;margin:2px 0 6px">` : ''}<b><span class="mkfk k${f.type}">${FLD_KINDS[f.type]}</span> 《${esc(f.name)}》</b> <span class="faint small">${esc(f.loc || '')}${f.loc ? ' · ' : ''}${f.count > 0 ? f.count + '턴' : '무한'}${f.auto ? ' · ⚙ 구문' : ''}</span>${f.eff ? `<div class="pcd-e">${fxTxt(f.eff)}</div>` : ''}</div>`;
    }).join('')}`;
  })()}
  ${pots.length || ed ? `<div class="pcd-h">포텐셜 <span class="faint">${pots.length}</span>${p.pots.some(n => !n) ? E('potadd', null, '빈 칸에 포텐셜 더하기', 'add') : ''}</div><div class="pcd-ptg">${pots.map(x => `<div class="pcd-p"><span class="pcd-pk">${esc(x.k || SLOTS[x.i] || '')}</span><b>『${esc(x.n)}』</b>${E('poted', x.i, '포텐셜 고치기')}${E('potdel', x.i, '이 포텐셜 빼기', 'del')}<div class="pcd-e">${fxTxt(x.e)}</div></div>`).join('')}</div>` : ''}
  </div></div></div>`;
}
/* 11-17 망령 「던전도 한 장 요약 · 트레이너도」: 그림 파일 저장을 포켓몬 한 장 요약과 같은 길로 (html2canvas · 테마 배경 · 바깥 여백 · 각주) */
async function h2cLoad() {
  if (window.html2canvas) return;
  await new Promise((ok, no) => {
    const sc = document.createElement('script');
    sc.src = 'https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js';
    sc.onload = ok;
    sc.onerror = () => no(new Error('html2canvas 를 불러오지 못했다'));
    document.head.appendChild(sc);
  });
}
async function cardPng(el, file, foot) {
  try {
    await h2cLoad();
    const bg = pngBg();
    const cv = await window.html2canvas(el.parentNode, pngOpts(el, bg, String(foot || ''), null));
    const a = document.createElement('a');
    a.download = String(file || '한장요약').replace(/[\\/:*?"<>|]/g, '_') + '.png';
    a.href = cv.toDataURL('image/png');
    a.click();
  } catch (err) {
    toast('PNG 로 저장하지 못했습니다 (' + err.message + ')');
  }
}
/* 11-17 망령 「디코로 버튼은 다 만들고」: 트레이너 · 던전 한 장 요약도 포켓몬 요약과 같은 길로 디스코드에 (그림 webp → 저장소 oremas/dc/<방>/ → om_dc_card) */
async function cardDc(b, el, o) {
  if (!b || b.disabled) return;
  const lab = b.textContent;
  b.disabled = true;
  b.textContent = '방 찾는 중…';
  try {
    const tg = await dcTarget();
    if (!tg) throw new Error('이 브라우저가 들어간 웹툴 방이 없어요 — 웹툴 방에 한 번 들어온 뒤 다시 눌러 주세요');
    if (!tg.secret) throw new Error('이 브라우저는 그 웹툴 방(「' + tg.room + '」)에 앉은 적이 없어요 — 웹툴에서 GM 이나 자리로 한 번 들어와 주세요');
    b.textContent = '그리는 중…';
    await h2cLoad();
    const bg = pngBg();
    const cv = await window.html2canvas(el.parentNode, pngOpts(el, bg, String(o.foot || ''), null));
    const blob = await new Promise(r => cv.toBlob(r, 'image/webp', 0.9));
    if (!blob) throw new Error('그림을 만들지 못했어요');
    b.textContent = '올리는 중…';
    const SB = dcSb();
    const path = 'dc/' + tg.room + '/' + String(o.id || 'card').replace(/[^\w-]/g, '') + '_' + Date.now().toString(36) + '.webp';
    const up = await SB.storage.from('oremas').upload(path, blob, { upsert: false, contentType: 'image/webp', cacheControl: '31536000' });
    if (up.error) throw new Error('그림을 올리지 못했어요: ' + up.error.message);
    const url = SB.storage.from('oremas').getPublicUrl(path).data.publicUrl;
    b.textContent = '보내는 중…';
    const r1 = await SB.rpc('om_dc_card', {
      p_room: tg.room,
      p_secret: tg.secret,
      p_title: o.title || '한 장 요약',
      p_sub: o.sub || '',
      p_img: url,
      p_who: o.who || { n: o.title || '' }
    });
    if (r1.error) {
      const m = r1.error.message || '';
      throw new Error(
        /PGRST202|Could not find the function/i.test(m + (r1.error.code || ''))
          ? '디스코드 연동 함수가 아직 없어요 — Supabase 에 supabase/patch_2026-11-02_게시판_디스코드.sql 을 (다시) 실행해 주세요'
          : m
      );
    }
    let r = null;
    for (let i = 0; i < 12; i++) {
      await new Promise(z => setTimeout(z, 900));
      const q = await SB.rpc('om_dc_card_result', { p_room: tg.room, p_secret: tg.secret, p_id: r1.data });
      if (q.error) break;
      r = q.data;
      if (r && !r.wait) break;
    }
    if (!r || r.wait) toast('디스코드로 보냈어요 (대답은 아직 — 디스코드에서 확인해 주세요)');
    else if (r.status >= 200 && r.status < 300) toast('디스코드에 올렸어요');
    else {
      let c = 0,
        m = '';
      try {
        const j = JSON.parse(r.body || '{}');
        c = j.code;
        m = j.message || '';
      } catch (e) {}
      toast(
        '디스코드가 거절했어요 — ' +
          (c === 10003
            ? '스레드를 찾지 못했어요 (웹툴 설정 「디스코드」에서 스레드 링크 다시)'
            : c === 10015
              ? '웹후크가 없어요 (웹툴 설정 「디스코드」에서 다시 이어 주세요)'
              : r.error || m || '오류 ' + r.status)
      );
    }
  } catch (err) {
    toast(String((err && err.message) || err));
  }
  b.disabled = false;
  b.textContent = lab;
}
const TCV = [
  ['ty', '타입'],
  ['bs', '종족치'],
  ['ab', '특성'],
  ['mv', '기술'],
  ['ex', '전용'],
  ['pt', '포텐셜']
]; /* 11-26 트레이너 한 장 요약 요소 보이기 · 숨기기 (숨긴 것 = .pcd.tcv-키) */
/* 트레이너 한 장 요약 — 그림 · 이름 · 칭호 · 자질 · 통솔점 · 기술점 · 지시 체계 · 『고유 포텐셜』 · 필드 전개 · 기능 확장 · SP · 공유 폼체인지 · 파티(포켓몬마다 작은 카드). 상세(백스토리 등)는 넣지 않는다 (공개 범위가 칸마다 달라서) */
function trainerCardHTML(t) {
  const tn = t.name || '(이름 없음)';
  const use = pointUse(t);
  const pu = ptSockets(t),
    pm = ptMax(t);
  const pn = (ptItems().find(r => r[2] === 'pride') || [])[0];
  const pr = pn ? { u: Math.round((use[pn] || 0) * 100) / 100, m: +t.base[pn] || 0 } : null;
  const o = t.orders || {};
  const ordN = o.preset ? (TORD.PRE.find(x => x[0] === o.preset) || [])[1] || o.preset : '';
  const U = (t.unique || []).filter(u => u && ((u.name || '').trim() || (u.eff || '').trim()));
  const FL = fieldsFix(t.fields);
  /* 11-26 망령 「팀 한장 요약에 고유는 왜 없어」: 이름 없이 효과만 적은 고유도 보이게 (이름 칸이 비면 「고유 n」) */ const EX = (t.ext || []).filter(
    e => e && e.mv
  );
  const SP = (t.sps || []).filter(e => e && e.name);
  const SF = (t.sforms || []).filter(f => f && f.name);
  const sub = [
    (t.deco || {}).title,
    t.kind === 'npc' ? 'NPC' : 'PC',
    (t.pl || '').trim() ? 'PL ' + t.pl.trim() : '',
    isMisag(t) ? '미사그 대학 (4+2)' : t.solo ? `1인 기준 (${soloN(t)}체)` : ''
  ]
    .filter(Boolean)
    .join(' · ');
  const mon = p => {
    const tys = [p.t1, p.t2, p.t3].filter(x => x && x !== '-');
    const mv = (p.moves || [])
      .filter(m => m && m.name && !m.hide)
      .map(m => {
        const r = mvRowOv(m) || [];
        const ti = typeInfo(r[5] || '');
        return {
          n: m.name,
          ty: r[5] || '',
          cat: r[6] || '',
          pow: r[7] || '',
          bg: (ti && safeCss(ti[1])) || 'var(--sunk2)',
          fg: (ti && safeCss(ti[2])) || 'var(--ink)'
        };
      });
    const XL = exclAll(p);
    const aw = awOf(t, p);
    /* 11-25 망령 「한장 요약 여백이 많이 남는다 — 포켓몬 카드를 큼직하게 꽉 채우고 특성 · 포텐셜 효과 · 전용 효과도」: 카드 2열, 특성 효과 · 전용 효과 · 포텐셜(이름 + 효과) */
    const ab = idx.abil && idx.abil.get(p.ability);
    const pots = (p.pots || [])
      .map((n, i) => ({ n, i, k: String(potKindOf(p, i) || SLOTS[i] || '').replace(/^[\d.]+\s*/, ''), e: potEffOf(p, i) }))
      .filter(x => x.n && x.n !== '-');
    return `<div class="tcd-m${p.partner ? ' ptn' : ''}" style="${pkVars(p)}"><div class="tcd-mh"><div class="tcd-mi">${safeImg(p.image) ? `<img src="${safeImg(p.image)}" alt="">` : '<span class="pav ph0"></span>'}</div><div class="tcd-mb">
   <div class="tcd-mn">${p.partner ? '<span class="pstar">★</span>' : ''}<b>${esc(p.name || '(이름 없음)')}</b>${genderGlyph(p.gender)}<span class="lvb">Lv.${lv(t, p)}</span>${prideOf(p) ? `<span class="tcd-pr">${esc(prideOf(p))}</span>` : ''}${aw ? `<span class="tpaw ${aw}">${esc(AW_LAB[aw])}</span>` : ''}${onBench(p) ? '<span class="kindb">대기</span>' : ''}${p.sub ? '<span class="kindb">서브</span>' : ''}</div>
   <div class="chips">${tys.map(x => tchip(x)).join('')}${roleOf(p) ? `<span class="pcd-v small">${esc(roleOf(p))}</span>` : ''}</div>
   ${
     mv.length
       ? `<div class="tcd-mvs">${mv
           .map(
             m =>
               `<span class="tcd-mv" style="--mb:${m.bg};--mf:${m.fg}" title="${esc([m.ty, m.cat, m.pow && m.pow !== '-' ? '위력 ' + m.pow : ''].filter(Boolean).join(' · '))}"><i>${esc(
                 String(m.cat || '')
                   .replace(/기$/, '')
                   .slice(0, 2) || '·'
               )}</i>${esc(m.n)}</span>`
           )
           .join('')}</div>`
       : ''
   }
   ${p.item ? `<div class="tcd-ml"><span class="pcd-k">도구</span>${esc(p.item)}</div>` : ''}</div></div>
   ${
     (p.base || []).some(v => v !== '' && v != null)
       ? `<div class="tcd-bs" title="종족치 (괄호 = 실수치)">${STATS.map((sn, i) => {
           const eb = effB(t, p)[i];
           const v = +eb || 0,
             g = grade(eb);
           const tip = buTip(t, p, i);
           return `<span class="tcd-b" style="--gc:${gcol(g)}" title="${esc(sn + ' ' + (p.base[i] === '' ? '-' : v) + (p.base[i] === '' ? '' : ' · 실수치 ' + stat(t, p, i)) + ' · ' + g + (tip ? ' · ' + tip : ''))}"><i>${['H', 'A', 'B', 'C', 'D', 'S'][i]}</i><b class="num">${p.base[i] === '' ? '-' : v}</b><em>${tip ? '▲' : ''}${esc(g)}</em></span>`;
         }).join('')}<span class="tcd-bt"><i>합</i><b class="num">${(p.base || []).reduce((a, v) => a + (+v || 0), 0)}</b></span></div>`
       : ''
   }
   <div class="tcd-s tcd-ab"><div class="tcd-sh"><span class="pcd-k">특성</span><b>${esc(p.ability || '-')}</b></div>${ab && ab[2] ? `<div class="tcd-e">${fxTxt(ab[2])}</div>` : ''}</div>
   ${XL.map(x => `<div class="tcd-s tcd-x"${x.ty && tyCol(x.ty) ? ` style="--c1:${tyCol(x.ty)}"` : ''}><div class="tcd-sh"><span class="pcd-k">${esc(exLab(t))}</span><b>『${esc(x.name)}』</b></div>${x.eff ? `<div class="tcd-e">${fxTxt(x.eff)}</div>` : ''}</div>`).join('')}
   ${pots.length ? `<details class="tcd-s tcd-ps"><summary class="tcd-sh"><span class="pcd-k">포텐셜</span><span class="faint small">${pots.length}</span><span class="tcd-pn">${pots.map(x => esc(x.n)).join(' · ')}</span></summary>${pots.map(x => `<div class="tcd-p"><span class="tcd-pk">${esc(x.k)}</span><b>『${esc(x.n)}』</b>${x.e ? ` <span class="tcd-e">${fxTxt(x.e)}</span>` : ''}</div>`).join('')}</details>` : ''}</div>`;
  };
  const c1 = safeCss((t.deco || {}).color) || '#7b4fd6';
  return `<div class="pcd tcd" style="--c1:${c1};--c2:${c1}">
 <div class="pcd-l">
  <div class="pcd-hd"><div class="pcd-img">${safeImg(t.image) ? `<img src="${safeImg(t.image)}" alt="">` : '<span class="pav ph0"></span>'}</div>
   <div class="pcd-ttl"><div class="pcd-nm">${esc(tn)}</div><div class="pcd-sub">${esc(sub)}</div>
    <div class="pcd-tags">${pr && !ruleOff(t, 'lead') ? `<span class="pcd-k">통솔점</span><span class="pcd-v num">${pr.u}/${pr.m}</span>` : ''}${ruleOff(t, 'sock') ? `<span class="pcd-k">계제</span><span class="pcd-v num">${mongGye(t)}</span>` : `<span class="pcd-k">PT 기술점</span><span class="pcd-v num">${pu}/${pm}</span>`}<span class="pcd-k">기본 Lv</span><span class="pcd-v num">${baseLevel(t.ranks['육성'])}</span></div></div></div>
  <div class="tcd-rk"><div class="pcd-h">자질</div>${QUAL.map(q => `<div class="tcd-rr"><span class="pcd-sl">${esc(q)}</span>${rkChip(q, t.ranks[q])}<span class="small muted">${esc((t.detail || {})[q] || '')}</span></div>`).join('')}${tcdOrdHTML(t)}</div>
  ${isMisag(t) && misagPenHTML(t, 'pcd') ? `<div class="pcd-aw">${misagPenHTML(t, 'pcd')}</div>` : ''}
  ${
    U.length
      ? `<div class="pcd-h">『고유 포텐셜』 <span class="faint">${U.length}</span></div>${U.map((u, ui) => {
          const c = safeCss(u.color) || UQ_COL[0];
          return `<div class="pcd-x tcd-uq" style="--c1:${c};--uc:${c};--ucf:${fgOn(c)}">${u.icon ? `<span class="tcd-uqi">${esc(u.icon)}</span>` : ''}${(u.name || '').trim() ? `<b>『${esc(u.name)}』</b>` : `<b class="faint">고유 ${ui + 1}</b>`}${u.sub ? ` <span class="faint small">${esc(u.sub)}</span>` : ''}<div class="pcd-e">${fxTxt(u.eff || '')}</div></div>`;
        }).join('')}`
      : ''
  }
  </div><div class="tcd-r">
  <div class="pcd-h">파티 <span class="faint">${t.pokemon.length}</span></div><div class="tcd-pt">${t.pokemon.map(mon).join('') || '<div class="small faint">포켓몬이 없다</div>'}</div>
  ${FL.length ? `<div class="pcd-h">필드 전개 <span class="faint">${FL.length}</span></div>${FL.map(f => `<div class="pcd-x"><b><span class="mkfk k${f.type}">${FLD_KINDS[f.type]}</span> 《${esc(f.name)}》</b> <span class="faint small">${esc(f.loc || '')}${f.loc ? ' · ' : ''}${f.count > 0 ? f.count + '턴' : '무한'}</span>${f.eff ? `<div class="pcd-e">${fxTxt(f.eff)}</div>` : ''}</div>`).join('')}` : ''}
  ${
    EX.length
      ? `<div class="pcd-h">기능 확장 <span class="faint">${EX.length}</span></div><div class="tcd-ex">${EX.map(e => {
          const r = idx.moves && idx.moves.get(e.mv);
          return `<div class="pcd-x">${r ? tchip(r[5]) : ''}<b>「기능 확장 : ${esc(e.mv)}」</b>${r ? ` <span class="faint small">${esc(r[6] || '')} · 위력 ${esc(r[7] || '-')} · 명중 ${esc(r[8] || '-')}</span>` : ''}${r && r[13] && r[13] !== '-' ? `<div class="pcd-e">${fxTxt(r[13])}</div>` : ''}</div>`;
        }).join('')}</div>`
      : ''
  }
  ${SP.length ? `<div class="pcd-h">SP · 서포터 <span class="faint">${SP.length}</span></div>${SP.map(e => `<div class="pcd-x"><b>『${esc(e.name)}』</b> <span class="faint small">${e.prob >= 100 ? '확정' : esc(e.prob) + '%'}</span>${e.eff ? `<div class="pcd-e">${fxTxt(e.eff)}</div>` : ''}</div>`).join('')}` : ''}
  ${SF.length ? `<div class="pcd-h">공유 폼체인지 <span class="faint">${SF.length}</span></div>${SF.map(f => `<div class="pcd-x"><b>${esc(f.name)}</b>${f.kind ? ` <span class="faint small">${esc(f.kind)}</span>` : ''}${f.cond ? `<div class="pcd-e">${fxTxt(f.cond)}</div>` : ''}</div>`).join('')}` : ''}
  </div></div>`;
}
/* 11-26 망령 「팀 한장 요약에 트레이너 4식 6령은 왜 없어」: 지시 체계 이름만 있던 자리에 4식(명령) · 6령(지령) 항목과 횟수를 칩으로. 못 쓰는 칸(0)은 흐리게, 1인 기준 · 미사그는 고른 것만 횟수. 지시 체계를 안 정했으면 그렇다고 적는다 (오레마스 방 설정을 따름) */
function tcdOrdHTML(t) {
  let O = null;
  try {
    O = ordSnap(t);
  } catch (e) {}
  if (!O || !O.preset)
    return `<div class="tcd-rr"><span class="pcd-sl">지시 체계</span><span class="small muted">정하지 않음 — 오레마스 방 설정을 따름</span></div>`;
  const row = (kind, lab, nm) => {
    const L = (O[kind] || []).filter(x => x.avail || x.ex);
    if (!L.length) return '';
    return `<div class="tcd-rr tcd-or"><span class="pcd-sl">${lab}</span><span class="tcd-ocs">${nm ? `<span class="faint small">${esc(nm)}</span>` : ''}${L.map(x => `<span class="tcd-oc${x.n ? '' : ' z'}" title="${esc((TORD.KO[x.k] || x.k) + (x.ex ? ' · 예외 계열 ' + x.ex : '') + (x.off ? ' · 각성체 대가로 뺌' : '') + (x.n ? '' : ' · 이번엔 0'))}">${esc(x.nm)}<b class="num">${x.n}</b></span>`).join('')}</span></div>`;
  };
  return `<div class="tcd-rr"><span class="pcd-sl">지시 체계</span><b class="small">${esc(O.presetName)}</b></div>${row('o', '4식', O.oName)}${row('c', '6령', O.cName)}`;
}
function openTrainerCard(t) {
  const TID = t.id;
  const cur = () => S.trainers.find(x => x.id === TID) || t;
  const l = openModal(
    `<div class="mhead"><h2>한 장 요약 <span class="small muted">트레이너</span></h2><span class="sp"></span><span class="tcd-vt" title="요소마다 보이기 · 숨기기 (PNG · 디코로 그림에도 그대로) — 이 브라우저가 기억">${TCV.map(([k, n]) => `<button class="btn xs" data-tcv="${k}">${n}</button>`).join('')}</span><button class="btn sm ghost" data-tcexp title="모든 포켓몬의 포텐셜 효과를 펼치거나 접는다 (PNG · 디코로 그림에도 펼친 그대로)">포텐셜 펼치기</button><button class="btn sm" data-tcdc title="이 요약을 그림으로 만들어 디스코드의 정해 둔 스레드에 올린다 (웹툴 설정 「디스코드」 탭에서 이어 둔 곳)">디코로</button><button class="btn sm" data-tcpng title="이 요약을 그림 파일로 저장">PNG 저장</button><button class="btn ghost" data-x>닫기</button></div><div class="mbody pcd-wrap">${trainerCardHTML(cur())}</div>`,
    { wide: true }
  );
  $('.mbox', l).classList.add('pcdbox');
  l.querySelectorAll('[data-x]').forEach(b => (b.onclick = () => closeModal()));
  l.querySelectorAll('.tcd-m').forEach((el, j) => {
    el.style.cursor = 'pointer';
    el.title = '눌러서 이 포켓몬 한 장 요약';
    el.onclick = e => {
      if (e && e.target && e.target.closest && e.target.closest('details')) return;
      const T = cur();
      const P = T.pokemon[j];
      if (P) openPokeCard(T, P);
    };
  });
  if (RO_EMB) {
    l.querySelectorAll('[data-x]').forEach(
      b =>
        (b.onclick = () => {
          closeModal();
          try {
            window.parent.postMessage({ mkm: 'close' }, '*');
          } catch (_) {}
        })
    );
  }
  $('[data-tcdc]', l) &&
    ($('[data-tcdc]', l).onclick = () => {
      const T = cur();
      cardDc($('[data-tcdc]', l), $('.pcd', l), {
        id: 't_' + T.id,
        title: T.name || '트레이너',
        sub: '트레이너 한 장 요약',
        who: { n: T.name || '', img: /^https?:\/\//.test(T.image || '') ? T.image : '' },
        foot: `${T.name || '트레이너'} · 트레이너 한 장 요약`
      });
    });
  $('[data-tcpng]', l).onclick = () =>
    cardPng($('.pcd', l), (cur().name || '트레이너') + '_한장요약', `${cur().name || '트레이너'} · 트레이너 한 장 요약`);
  /* 11-26 망령 「포텐셜 보이게 한장 요약 해서 디코로」: 포텐셜 접힘 상자를 한꺼번에 펼치기 · 접기 */
  {
    const xb = $('[data-tcexp]', l);
    let X = false;
    try {
      X = localStorage.getItem('mk_tcx') === '1';
    } catch (e) {} /* 11-26 망령 「열기를 눌러둬도 접혀 있어서 두번 열어야」: 펼침도 이 브라우저가 기억 · 열 때 그대로 */
    const D = () => [...l.querySelectorAll('details.tcd-ps')];
    const setX = (o, save) => {
      X = !!o;
      D().forEach(d => (d.open = X));
      if (xb) xb.textContent = X ? '포텐셜 접기' : '포텐셜 펼치기';
      if (save)
        try {
          localStorage.setItem('mk_tcx', X ? '1' : '0');
        } catch (_) {}
    };
    setX(X);
    if (xb)
      xb.onclick = () => {
        const d = D();
        setX(!(d.length && d.every(x => x.open)), true);
      };
    l._tcx = setX;
  }
  /* 11-26 망령 「트레이너 한장 펼치기는 각 요소들 마다 펴고 접을 수 있으면 — 타입/종족치/특성/기술폭/전용」: 요소마다 보이기 · 숨기기 (카드 전체에 · 이 브라우저가 기억) */
  {
    const pcd = $('.pcd', l);
    let H = {};
    try {
      H = JSON.parse(localStorage.getItem('mk_tcv') || '{}') || {};
    } catch (e) {}
    const paint = () => {
      for (const [k] of TCV) {
        pcd.classList.toggle('tcv-' + k, !!H[k]);
        const bt = $(`[data-tcv="${k}"]`, l);
        if (bt) {
          bt.classList.toggle('pri', !H[k]);
          bt.classList.toggle('ghost', !!H[k]);
          bt.setAttribute('aria-pressed', H[k] ? 'false' : 'true');
        }
      }
    };
    paint();
    l.querySelectorAll('[data-tcv]').forEach(
      bt =>
        (bt.onclick = e => {
          e.stopPropagation();
          const k = bt.dataset.tcv;
          H[k] = !H[k];
          try {
            localStorage.setItem('mk_tcv', JSON.stringify(H));
          } catch (_) {}
          paint();
          if (k === 'pt' && !H[k] && l._tcx) l._tcx(true, true);
        })
    );
  }
}
/* 10-22 망령: 로그 탭(logtool/, 같은 출처 iframe)의 「제작기 그림 잇기」가 읽는 캐릭터 그림 목록 */
window.MKM_CHARS = () =>
  S.trainers
    .flatMap(t => [
      { name: t.name, image: safeImg(t.image) || '', kind: 'trainer' },
      ...(t.pokemon || []).map(p => ({ name: p.name, image: safeImg(p.image) || '', kind: 'poke' }))
    ])
    .filter(x => x.name && x.image);
/* 11-03 감우 (20번 검토 편의 1): 새 트레이너 · 포켓몬 카드로 스크롤하고 이름 칸에 커서 (터치 화면에선 자판이 튀어 오르지 않게 초점만 안 준다) */
function goNew(cardId, inputId) {
  requestAnimationFrame(() => {
    const el = document.getElementById(cardId);
    if (!el) return;
    el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    el.classList.add('newflash');
    setTimeout(() => el.classList.remove('newflash'), 1200);
    const inp = document.getElementById(inputId);
    if (inp && !matchMedia('(pointer:coarse)').matches) {
      inp.focus({ preventScroll: true });
      try {
        inp.select();
      } catch (e) {}
    }
  });
}
function goPoke(T, P) {
  T.open = true;
  P.open = true;
  save();
  refreshTrainer(T);
  requestAnimationFrame(() => {
    const el = document.getElementById('pk-' + P.id);
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
  });
}
function openPokeCard(t, p) {
  const l = openModal(
    `<div class="mhead"><h2>한 장 요약</h2><span class="sp"></span><button class="btn sm" data-pced title="이 요약에서 바로 고치고 더한다 (✎ · ＋ · ×)">✎ 편집</button><button class="btn sm ghost" data-pcgo title="제작기에서 이 포켓몬 시트로 이동">시트로</button><button class="btn sm" data-pcdc title="이 요약을 그림으로 만들어 디스코드의 정해 둔 스레드에 올린다 (웹툴 설정 「디스코드」 탭에서 이어 둔 곳)">디코로</button><button class="btn sm" data-pcpng title="이 요약을 그림 파일로 저장">PNG 저장</button><button class="btn sm ghost pcdelb" data-pcmore title="이 포켓몬 시트를 지운다 (5초 안 실행 취소)">삭제</button><button class="btn ghost" data-x>닫기</button></div>${pcdTabs(p, null)}<div class="mbody pcd-wrap">${pokeCardHTML(t, p)}</div>`,
    { wide: true }
  );
  $('.mbox', l).classList.add('pcdbox');
  l.querySelectorAll('[data-x]').forEach(b => (b.onclick = () => closeModal()));
  if (RO_EMB) {
    l.querySelectorAll('[data-pced],[data-pcgo],[data-pcmore]').forEach(b => b.remove());
    /* 11-17 망령 「디코로 버튼은 다 만들고」: 보기 창에도 디코로는 남긴다 */ l.querySelectorAll('[data-x]').forEach(
      b =>
        (b.onclick = () => {
          closeModal();
          try {
            window.parent.postMessage({ mkm: 'close' }, '*');
          } catch (_) {}
        })
    );
  } /* 읽기 전용: 보기 · PNG 저장 · 디코로 · 닫기만, 닫으면 세션 노트 창도 닫는다 */
  /* 10-24 망령: 「✎ 편집」 — 요약 위에서 이름 · 특성 · 도구 · 기술 · 포텐셜 · 메모를 고치고 더한다. 고르기 창은 시트와 같은 것을 쓴다 */
  let ED = false;
  const wrap = $('.pcd-wrap', l);
  const depth = layers.length;
  /* 11-06 망령 「한 장 요약 편집이 저장이 안 되고 날아간다」: 연 뒤에 공유 DB 가 시트를 새 객체로 다시 만들면(처음 연결 · 노트 안 제작기) 붙잡고 있던 t · p 가 떨어져 나가 고친 것이 어디에도 안 남았다 → 매번 id 로 지금 것을 다시 찾는다 */
  const PID = p.id;
  const fresh = () => {
    for (const T of S.trainers) {
      const P = (T.pokemon || []).find(x => x.id === PID);
      if (P) {
        t = T;
        p = P;
        return true;
      }
    }
    return false;
  };
  /* 11-07 망령 「한 장 요약에서 폼 체인지가 있으면 탭을 하나 더 — 그 기준으로도 보게」: FK = 보고 있는 폼 번호 (null 은 원래 모습). 폼 탭에서는 편집을 끈다(고치는 것은 원래 모습 기준) */
  let FK = null;
  const cur = () => (FK == null ? p : formCardView(p, FK));
  const draw = () => {
    if (!fresh()) return;
    if (FK != null && !(p.forms || [])[FK]) FK = null;
    if (FK != null) ED = false;
    const tb = $('.pcd-tabs', l);
    if (tb) tb.outerHTML = pcdTabs(p, FK);
    else if ((p.forms || []).some(f => f)) $('.pcd-wrap', l).insertAdjacentHTML('beforebegin', pcdTabs(p, FK));
    const sc = wrap.scrollTop;
    wrap.innerHTML = pokeCardHTML(t, cur(), ED);
    wrap.classList.toggle('pcd-ed', ED);
    wrap.scrollTop = sc;
    $('[data-pced]', l).classList.toggle('pri', ED);
    $('[data-pced]', l).textContent = ED ? '✓ 편집 끝' : '✎ 편집';
  };
  const done = () => {
    const old = p;
    if (fresh() && old !== p) {
      const keep = JSON.parse(JSON.stringify(old));
      delete keep.open;
      delete keep.tab;
      Object.assign(p, keep);
    }
    save();
    try {
      refreshTrainer(t);
    } catch (e) {}
    draw();
  };
  const back = () => {
    const iv = setInterval(() => {
      if (!l.isConnected) {
        clearInterval(iv);
        return;
      }
      if (layers.length <= depth) {
        clearInterval(iv);
        done();
      }
    }, 200);
  };
  const askStr = (title, v, multi) =>
    new Promise(res => {
      const m = openModal(
        `<div class="mhead"><h2>${esc(title)}</h2></div><div class="mbody">${multi ? `<textarea data-as rows="6" style="width:100%">${esc(v || '')}</textarea>` : `<input data-as value="${esc(v || '')}" style="width:100%">`}</div><div class="mfoot"><span class="sp"></span><button class="btn" data-x="no">취소</button><button class="btn pri" data-x="ok">확인</button></div>`
      );
      const inp = $('[data-as]', m);
      setTimeout(() => {
        inp.focus();
        inp.select && inp.select();
      }, 30);
      if (!multi)
        inp.addEventListener('keydown', e => {
          if (e.key === 'Enter' && !e.isComposing) {
            e.preventDefault();
            const v2 = inp.value;
            closeModal();
            res(v2);
          }
        });
      m.addEventListener('click', e => {
        const x = e.target.closest('[data-x]');
        if (!x) return;
        const v2 = x.dataset.x === 'ok' ? inp.value : null;
        closeModal();
        res(v2);
      });
    });
  $('[data-pced]', l).onclick = () => {
    ED = !ED;
    if (ED) FK = null;
    draw();
  };
  l.addEventListener('click', e => {
    const b = e.target.closest('[data-pcfk]');
    if (!b) return;
    const k = b.dataset.pcfk;
    FK = k === '' ? null : +k;
    draw();
  });
  wrap.addEventListener('click', async e => {
    const b = e.target.closest('[data-pce]');
    if (!b || !ED) return;
    e.preventDefault();
    fresh();
    const k = b.dataset.pce,
      v = b.dataset.v;
    if (k === 'name') {
      const n = await askStr('이름', p.name);
      if (n != null) {
        p.name = n.trim();
        done();
      }
      return;
    }
    if (k === 'memo') {
      const n = await askStr('메모', p.memo, true);
      if (n != null) {
        p.memo = n;
        done();
      }
      return;
    }
    if (k === 'abil') {
      openPicker('abil', {
        hideOldOnly: !isOld(p),
        chosen: () => new Set([p.ability]),
        onPick: n => {
          p.ability = n;
        }
      });
      return back();
    }
    if (k === 'item') {
      openPicker('items', {
        onPick: n => {
          p.item = n;
        }
      });
      return back();
    }
    if (k === 'itemx') {
      p.item = '';
      return done();
    }
    if (k === 'mvadd') {
      openPicker('moves', {
        title: '기술 검색·추가',
        multi: true,
        hideOldOnly: !isOld(p),
        chosen: () => new Set(p.moves.map(m => m.name)),
        onPick: n => {
          const m = { name: n, half: false };
          p.moves.push(m);
          if (isBigMv(t, p, m)) toast(`「${n}」 소켓 ${moveSock(p, m)} · ${bigMvRule(t)} · 경고만 띄우고 넣었습니다`);
          else if (followWide(p)) toast(followWideTxt(followWide(p)));
        },
        onRemove: n => {
          p.moves = p.moves.filter(m => m.name !== n);
        }
      });
      return back();
    }
    if (k === 'mved') {
      const ix = p.moves.findIndex(m => m.name === v);
      if (ix < 0) return;
      openPicker('moves', {
        title: `「${v}」 대신 넣을 기술`,
        hideOldOnly: !isOld(p),
        onPick: n => {
          if (p.moves.some((m, j) => j !== ix && m.name === n)) return toast('이미 있는 기술입니다');
          p.moves[ix] = Object.assign({}, p.moves[ix], { name: n });
        }
      });
      return back();
    }
    if (k === 'types') {
      const TY = S.db.types.map(x => x[0]);
      const ty = TY.includes('-') ? TY : ['-', ...TY];
      const EG = eggOpts();
      const sl = (f, lab, opts) =>
        `<label class="lbl">${lab}<select data-tf="${f}">${opts.map(o => `<option value="${esc(o)}" ${o === (p[f] || '-') ? 'selected' : ''}>${esc(o)}</option>`).join('')}</select></label>`;
      const m = openModal(
        `<div class="mhead"><h2>타입 · 알그룹</h2></div><div class="mbody"><div class="fgrid">${sl('t1', '타입1', ty)}${sl('t2', '타입2', ty)}${sl('t3', '타입3', ty)}${sl('tera', '테라', ty)}${sl('egg1', '알그룹1', EG)}${sl('egg2', '알그룹2', EG)}</div></div><div class="mfoot"><span class="sp"></span><button class="btn" data-x="no">취소</button><button class="btn pri" data-x="ok">확인</button></div>`
      );
      m.addEventListener('click', ev => {
        const x = ev.target.closest('[data-x]');
        if (!x) return;
        if (x.dataset.x === 'ok')
          m.querySelectorAll('[data-tf]').forEach(se => {
            p[se.dataset.tf] = se.value;
          });
        closeModal();
        if (x.dataset.x === 'ok') done();
      });
      return;
    }
    if (k === 'base') {
      const m = openModal(
        `<div class="mhead"><h2>종족치</h2></div><div class="mbody"><div class="fgrid">${STATS.map((sn, i) => `<label class="lbl">${sn}<input type="number" min="0" step="1" data-bs="${i}" value="${esc(p.base[i] ?? '')}"></label>`).join('')}</div><div class="small muted" data-bst style="margin-top:6px"></div></div><div class="mfoot"><span class="sp"></span><button class="btn" data-x="no">취소</button><button class="btn pri" data-x="ok">확인</button></div>`
      );
      const sum = () => {
        $('[data-bst]', m).textContent = '합 ' + [...m.querySelectorAll('[data-bs]')].reduce((a, i) => a + (+i.value || 0), 0);
      };
      sum();
      m.addEventListener('input', sum);
      m.addEventListener('click', ev => {
        const x = ev.target.closest('[data-x]');
        if (!x) return;
        if (x.dataset.x === 'ok')
          m.querySelectorAll('[data-bs]').forEach(i => {
            const v2 = i.value.trim();
            p.base[+i.dataset.bs] = v2 === '' ? '' : String(Math.max(0, Math.round(+v2) || 0));
          });
        closeModal();
        if (x.dataset.x === 'ok') done();
      });
      return;
    }
    if (k === 'mvdel') {
      const ix = p.moves.findIndex(m => m.name === v);
      if (ix >= 0) {
        p.moves.splice(ix, 1);
        done();
      }
      return;
    }
    if (k === 'potadd') {
      const ix = p.pots.findIndex(n => !n);
      if (ix < 0) return toast('포텐셜 빈 칸이 없습니다');
      openPotEditor(t, p, ix);
      return back();
    }
    if (k === 'poted') {
      openPotEditor(t, p, +v);
      return back();
    }
    if (k === 'potdel') {
      const x = +v;
      if (!(await ask(`포텐셜 「${esc(p.pots[x] || '')}」을(를) 뺄까요?`, '빼기'))) return;
      p.pots[x] = '';
      p.potEff[x] = '';
      p.potKind[x] = '';
      return done();
    }
    if (k === 'exadd') {
      if (!p.excl || !p.excl.name) {
        openPotEditor(t, p, 'excl');
        return back();
      }
      p.exclX = p.exclX || [];
      p.exclX.push({ name: '', eff: '' });
      save();
      openPotEditor(t, p, { ex: p.exclX.length - 1 });
      return back();
    }
    if (k === 'exed') {
      openPotEditor(t, p, v === 'excl' ? 'excl' : { ex: +String(v).slice(1) });
      return back();
    }
  });
  $('[data-pcgo]', l).onclick = () => {
    closeModal();
    goPoke(t, p);
  };
  /* 10-24 망령: 트레이너 카드의 포켓몬 동그라미 → 한 장 요약에서도 바로 지울 수 있게 */
  const pcdel = async () => {
    const j = t.pokemon.indexOf(p);
    if (j < 0) return;
    if (
      !(await ask(
        `포켓몬 시트 「${esc(p.name || '이름 없음')}」을(를) 삭제할까요?<br><span class="small muted">${esc(t.name || '')} 의 ${j + 1}번째 포켓몬 · 5초 안에 「실행 취소」로 되돌릴 수 있습니다</span>`,
        '삭제'
      ))
    )
      return;
    t.pokemon.splice(j, 1);
    save();
    closeModal();
    renderChar();
    undoDel(`「${p.name || '이름 없음'}」 삭제`, () => {
      const T2 = S.trainers.find(x => x.id === t.id);
      if (!T2) return toast('트레이너가 사라져 되살리지 못했습니다');
      T2.pokemon.splice(Math.min(j, T2.pokemon.length), 0, p);
      save();
      renderChar();
      goNew('pk-' + p.id);
    });
  };
  $('[data-pcmore]', l).onclick = () =>
    pcdel(); /* 11-03 20:13 망령 「한 장 요약은 왜 ⋯ 로 둬」: ⋯ 메뉴 없이 삭제 단추를 바로 (확인 창 · 5초 실행 취소는 그대로) */
  $('[data-pcpng]', l).onclick = async () => {
    if (ED) {
      ED = false;
      draw();
    }
    const el = $('.pcd', l);
    try {
      if (!window.html2canvas)
        await new Promise((ok, no) => {
          const sc = document.createElement('script');
          sc.src = 'https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js';
          sc.onload = ok;
          sc.onerror = () => no(new Error('html2canvas 를 불러오지 못했다'));
          document.head.appendChild(sc);
        });
      const bg = pngBg();
      const cv = await window.html2canvas(el.parentNode, pngOpts(el, bg, t, cur()));
      const a = document.createElement('a');
      a.download = (cur().name || '포켓몬') + '.png';
      a.href = cv.toDataURL('image/png');
      a.click();
    } catch (err) {
      toast('PNG 로 저장하지 못했습니다 (' + err.message + ')');
    }
  };
  /* 11-02 망령 「한 장 요약 「시트로」 옆에 디코로 — 지정해 둔 스레드에」: 그림(webp) → 저장소 oremas/dc/<방>/ → 웹툴 방의 om_dc_card (서버가 웹후크로 보낸다).
    방 · 신분: 세션 노트 안이면 그 캠페인에 이어 둔 웹툴 방 · 노트의 웹툴 신분, 따로 열었으면 이 브라우저가 들어간 웹툴 방 (supabase/patch_2026-11-02_게시판_디스코드.sql) */
  $('[data-pcdc]', l).onclick = async () => {
    const b = $('[data-pcdc]', l);
    if (b.disabled) return;
    if (ED) {
      ED = false;
      draw();
    }
    const lab = b.textContent;
    b.disabled = true;
    b.textContent = '방 찾는 중…';
    try {
      const tg = await dcTarget();
      if (!tg) throw new Error('이 브라우저가 들어간 웹툴 방이 없어요 — 웹툴 방에 한 번 들어온 뒤 다시 눌러 주세요');
      if (!tg.secret)
        throw new Error('이 브라우저는 그 웹툴 방(「' + tg.room + '」)에 앉은 적이 없어요 — 웹툴에서 GM 이나 자리로 한 번 들어와 주세요');
      b.textContent = '그리는 중…';
      const el = $('.pcd', l);
      if (!window.html2canvas)
        await new Promise((ok, no) => {
          const sc = document.createElement('script');
          sc.src = 'https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js';
          sc.onload = ok;
          sc.onerror = () => no(new Error('html2canvas 를 불러오지 못했다'));
          document.head.appendChild(sc);
        });
      const bg = pngBg();
      const cv = await window.html2canvas(el.parentNode, pngOpts(el, bg, t, cur()));
      const blob = await new Promise(r => cv.toBlob(r, 'image/webp', 0.9));
      if (!blob) throw new Error('그림을 만들지 못했어요');
      b.textContent = '올리는 중…';
      const SB = dcSb();
      const path = 'dc/' + tg.room + '/' + (p.id || 'card') + '_' + Date.now().toString(36) + '.webp';
      const up = await SB.storage.from('oremas').upload(path, blob, { upsert: false, contentType: 'image/webp', cacheControl: '31536000' });
      if (up.error) throw new Error('그림을 올리지 못했어요: ' + up.error.message);
      const url = SB.storage.from('oremas').getPublicUrl(path).data.publicUrl;
      b.textContent = '보내는 중…';
      const av = /^https?:\/\//.test(t.image || '') ? t.image : '';
      const r1 = await SB.rpc('om_dc_card', {
        p_room: tg.room,
        p_secret: tg.secret,
        p_title: p.name || '포켓몬',
        p_sub: t.name || '',
        p_img: url,
        p_who: { n: t.name || p.name || '', img: av }
      });
      if (r1.error) {
        const m = r1.error.message || '';
        throw new Error(
          /PGRST202|Could not find the function/i.test(m + (r1.error.code || ''))
            ? '디스코드 연동 함수가 아직 없어요 — Supabase 에 supabase/patch_2026-11-02_게시판_디스코드.sql 을 (다시) 실행해 주세요'
            : m
        );
      }
      let r = null;
      for (let i = 0; i < 12; i++) {
        await new Promise(z => setTimeout(z, 900));
        const q = await SB.rpc('om_dc_card_result', { p_room: tg.room, p_secret: tg.secret, p_id: r1.data });
        if (q.error) break;
        r = q.data;
        if (r && !r.wait) break;
      }
      if (!r || r.wait) toast('디스코드로 보냈어요 (대답은 아직 — 디스코드에서 확인해 주세요)');
      else if (r.status >= 200 && r.status < 300) toast('디스코드에 올렸어요');
      else {
        let c = 0,
          m = '';
        try {
          const j = JSON.parse(r.body || '{}');
          c = j.code;
          m = j.message || '';
        } catch (e) {}
        toast(
          '디스코드가 거절했어요 — ' +
            (c === 10003
              ? '스레드를 찾지 못했어요 (웹툴 설정 「디스코드」에서 스레드 링크 다시)'
              : c === 10015
                ? '웹후크가 없어요 (웹툴 설정 「디스코드」에서 다시 이어 주세요)'
                : r.error || m || '오류 ' + r.status)
        );
      }
    } catch (err) {
      toast(String((err && err.message) || err));
    }
    b.disabled = false;
    b.textContent = lab;
  };
}
/* ---- 11-02 디코로: 웹툴 방 · 신분 찾기 (세션 노트 · 웹툴과 같은 주소라 localStorage 를 같이 본다) ---- */
let DCSB = null;
const dcSb = () => DCSB || (DCSB = supabase.createClient(MKM_CONFIG.supabaseUrl, MKM_CONFIG.supabaseKey, { auth: { persistSession: false } }));
const dcLS = (k, d) => {
  try {
    const v = localStorage.getItem(k) ?? sessionStorage.getItem(k);
    return v == null ? d : JSON.parse(v);
  } catch (e) {
    return d;
  }
};
async function dcWho(room) {
  const C = [];
  const a = dcLS('om_acct', null);
  if (a && a.token) C.push('u:' + a.token);
  const r = (dcLS('om_rooms', []) || []).find(x => x && x.id === room);
  if (r && r.gm) C.push(r.gm);
  const si = dcLS('om_seat_' + room, null);
  if (si && si.secret) C.push(si.secret);
  let seat = '';
  for (const s of C) {
    try {
      const q = await dcSb().rpc('om_whoami', { p_room: room, p_secret: s });
      if (!q.error && q.data) {
        if (q.data === 'gm') return s;
        if (!seat) seat = s;
      }
    } catch (e) {}
  }
  return seat;
}
async function dcTarget() {
  /* 세션 노트 안(같은 주소의 부모 창): 그 캠페인에 이어 둔 웹툴 방 */
  try {
    const P = window.parent;
    if (P && P !== window && P.NT && P.NT_PHONE) {
      const room = ((((P.NT.ST || {}).campInfo || {}).data || {}).om || {}).room;
      if (room) {
        try {
          await P.NT_PHONE.load();
        } catch (e) {}
        const id = P.NT_PHONE.PH && P.NT_PHONE.PH.id;
        return { room, secret: id && id.room === room && id.secret ? id.secret : await dcWho(room) };
      }
    }
  } catch (e) {}
  /* 따로 연 제작기: 이 브라우저가 들어간 웹툴 방 (하나면 그것, 여럿이면 고른다 — 고른 방은 기억) */
  const rooms = new Map();
  for (const r of dcLS('om_rooms', []) || []) if (r && r.id) rooms.set(r.id, r.name || r.id);
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k && k.startsWith('om_seat_')) {
        const id = k.slice(8);
        if (id && !rooms.has(id)) rooms.set(id, id);
      }
    }
  } catch (e) {}
  if (!rooms.size) return null;
  const last = dcLS('mk_dc_room', '');
  let room = last && rooms.has(last) ? last : rooms.size === 1 ? [...rooms.keys()][0] : '';
  if (!room)
    room = await new Promise(res => {
      const m = openModal(
        `<div class="mhead"><h2>어느 웹툴 방의 디스코드로?</h2></div><div class="mbody"><div class="small muted" style="margin-bottom:8px">그 방의 설정 「디스코드」 탭에서 이어 둔 스레드로 가요. 고른 방은 기억해요.</div>${[...rooms].map(([id, n]) => `<button class="btn" style="display:block;width:100%;margin:4px 0;text-align:left" data-dcr="${esc(id)}">${esc(n)} <span class="small muted">${esc(id)}</span></button>`).join('')}</div><div class="mfoot"><span class="sp"></span><button class="btn" data-x>취소</button></div>`
      );
      m.addEventListener('click', e => {
        const x = e.target.closest('[data-dcr]');
        if (x) {
          closeModal();
          res(x.dataset.dcr);
          return;
        }
        if (e.target.closest('[data-x]')) {
          closeModal();
          res('');
        }
      });
    });
  if (!room) return null;
  const secret = await dcWho(room);
  if (secret)
    try {
      localStorage.setItem('mk_dc_room', JSON.stringify(room));
    } catch (e) {}
  return { room, secret };
}
/* 지시 체계 (10-23 망령): 명령 = ORDER(4식), 지령 = COMMAND(6령). t.orders={preset,tc,base}. 오레마스로 가져가면 이 설정으로 횟수가 채워진다 (오레마스 OM_ORDERS 와 같은 표) */
const TORD = (() => {
  const CL = [
    '기본-일반',
    '기본-숙달',
    '기본-숙달 (지시 A)',
    '십계-영창 (지시 B)',
    '십계-영창 (지시 A)',
    '십계-영창 (지시 AA)',
    '특수-방해',
    '특수-야생',
    '십계-영창 (지시 C)',
    '십계-결계 (지시 D)',
    '기본-4식 (지시 D)'
  ];
  const OL = ['협회식 4식', '5계', '칙령', '주인의 칙령'];
  const LORD = {
    0: ['물러나!', '피해라!', '버텨라!', '바꿔라!', '맞춰라!'],
    1: ['지킬 수 없다!', '피할 수 없다!', '버틸 수 없다!', '맞출 수 없다!'],
    2: ['물리결계', '특수결계', '정화의 법계', '치유의 법계', '윤회의 법계', '파계'],
    3: ['주인의 칙령']
  };
  const OK = {
    0: ['retreat', 'dodge', 'endure', 'return', 'snipe'],
    1: ['retreat', 'dodge', 'endure', 'snipe'],
    2: ['retreat', 'dodge', 'endure', 'return', 'snipe', 'special'],
    3: ['retreat']
  };
  const ALL = ['attack', 'defense', 'specialattack', 'specialdefense', 'speed', 'heal', 'accuracy', 'evasion'];
  const CK = {
    0: ALL,
    1: ALL,
    2: ALL,
    3: ALL.slice(0, 5),
    4: ['attack', 'defense', 'specialattack', 'specialdefense', 'speed', 'accuracy', 'evasion'],
    5: ['attack', 'defense', 'specialattack', 'specialdefense', 'speed', 'accuracy', 'evasion'],
    6: ALL,
    7: ['attack', 'defense'],
    8: ALL.slice(0, 5),
    9: [],
    10: []
  };
  const SP = ['공격', '방어', '특공', '특방', '민첩', '회복', '저격', '회피'];
  const YC = ['검의 영창', '방패의 영창', '관의 영창', '잔의 영창', '날개의 영창', '촛불의 영창', '장막의 영창'];
  const LCMD = {
    0: SP.map(x => x + '지령'),
    1: SP.map(x => '숙달' + x + '지령'),
    2: SP.map(x => '숙달' + x + '지령'),
    3: YC.slice(0, 5),
    4: YC,
    5: YC,
    6: SP.map(x => '방해' + x + '지령'),
    7: ['주인의 호령 : 능력', '주인의 호령 : 회복'],
    8: YC.slice(0, 5),
    9: [],
    10: []
  };
  const PRE = [
    ['assoc', '협회식'],
    ['ten', '십계'],
    ['wild', '야생'],
    ['jam', '방해'],
    ['manual', '직접 고름']
  ];
  const tordOf = tc => ((tc >= 3 && tc <= 5) || tc === 8 || tc === 9 ? 2 : tc === 6 ? 1 : tc === 7 ? 3 : 0);
  const rankLv = r => {
    const b = String(r || '')
      .replace(/[+\-]/g, '')
      .toUpperCase();
    const m = { E: 0, D: 0, C: 1, B: 2, A: 3, AA: 4, AAA: 5, S: 6, EX: 6 };
    return m.hasOwnProperty(b) ? m[b] : 1;
  };
  const presetTc = (p, r) => {
    const lv = rankLv(r);
    if (p === 'assoc') return lv >= 3 ? 2 : lv >= 2 ? 1 : lv >= 1 ? 0 : 10;
    if (p === 'ten') return lv >= 4 ? 5 : lv >= 3 ? 4 : lv >= 2 ? 3 : lv >= 1 ? 8 : 9;
    if (p === 'wild') return 7;
    if (p === 'jam') return 6;
    return NaN;
  };
  const zeros = (o, c) => {
    let z = [];
    if (o === 0) z = ['special'];
    if (o === 1) z = ['return', 'special'];
    if (o === 2) z = ['heal'];
    if (o === 3) z = ['dodge', 'endure', 'return', 'snipe', 'special'];
    if (o === 0 && (c <= 1 || c === 10)) z.push('snipe', 'accuracy', 'evasion');
    if (o === 0 && c === 2) z.push('snipe');
    if (o === 2 && c === 3) z.push('special', 'accuracy', 'evasion');
    if (o === 2 && c === 4) z.push('special');
    if (o === 2 && (c === 8 || c === 9)) z.push('endure', 'return', 'snipe', 'special', 'accuracy', 'evasion');
    return z;
  };
  const LO = ['retreat', 'dodge', 'endure', 'return', 'snipe', 'special'],
    LC = ALL;
  const KO = {
    retreat: '물러나',
    dodge: '피해라',
    endure: '버텨라',
    return: '바꿔라',
    snipe: '맞춰라',
    special: '특수',
    attack: '공격',
    defense: '방어',
    specialattack: '특공',
    specialdefense: '특방',
    speed: '스피드',
    heal: '회복',
    accuracy: '명중',
    evasion: '회피'
  };
  const nameOf = (kind, fam, k) => {
    const keys = (kind === 'o' ? OK : CK)[fam] || [];
    const i = keys.indexOf(k);
    return i < 0 ? '' : ((kind === 'o' ? LORD : LCMD)[fam] || [])[i] || '';
  };
  return { CL, OL, LORD, OK, CK, LCMD, PRE, tordOf, presetTc, zeros, LO, LC, KO, nameOf, rankLv };
})();
/* 1인 기준(2체): ORDER 는 soloOrd.o 개, COMMAND 는 soloOrd.c 개만 골라 쓴다 — 고른 항목만 기준 횟수, 나머지 0. t.orders.pick={o:[키],c:[키]} */
function soloOrdN(kind, t) {
  const n = soloOrdN0(kind, t);
  return kind === 'c' && soloA(t) ? Math.max(n, 3) : n;
}
function soloOrdN0(kind, t) {
  if (soloN(t) === 3) {
    const R3 = RULES().solo3 || SOLO3_DEF;
    const v3 = parseInt(R3[kind], 10);
    return v3 >= 0 ? v3 : +SOLO3_DEF[kind];
  }
  const R = RULES().soloOrd || SOLO_ORD_DEF;
  const v = parseInt(R[kind], 10);
  return v >= 0 ? v : +SOLO_ORD_DEF[kind];
}
/* 10-29 망령: 미사그 대학 트레이너도 「2체 기준」으로 합칠 때 들고 갈 ORDER · COMMAND 를 같은 수만큼 t.orders.pick 에 고른다 (6체 배틀에서는 안 쓴다) */
/* 10-27 망령: 1인 기준(2 · 3체)에서 지시 A 이상은 COMMAND(지령)를 3개 고르고, 그중 하나는 회피나 명중이어야 한다 */
const SOLO_A_MUST = ['evasion', 'accuracy'];
function soloA(t) {
  return (!!soloN(t) || isMisag(t)) && TORD.rankLv((t.ranks || {})['지시']) >= 3;
}
function soloMustOk(t, pk, avail) {
  if (!soloA(t)) return true;
  const can = SOLO_A_MUST.filter(k => avail.includes(k));
  return !can.length || pk.some(k => can.includes(k));
}
function tOrdPick(t, kind) {
  const pk = ((t.orders || {}).pick || {})[kind];
  return Array.isArray(pk) ? pk : [];
}
function ordAvail(t, kind) {
  const o = t.orders || {};
  if (!o.preset) return [];
  const tc = tOrdTc(t),
    to = TORD.tordOf(tc),
    z = TORD.zeros(to, tc),
    ty = o.type || {},
    def = kind === 'o' ? to : tc;
  return (kind === 'o' ? TORD.LO : TORD.LC).filter(k => {
    const v = ty[kind + '_' + k];
    const f = v == null ? def : +v;
    return !!TORD.nameOf(kind, f, k) && (f !== def || !z.includes(k));
  });
}
function tOrdTc(t) {
  const o = t.orders || {};
  if (o.preset === 'manual') return Math.max(0, Math.min(TORD.CL.length - 1, +o.tc || 0));
  return TORD.presetTc(o.preset, (t.ranks || {})['지시']);
}
/* 10-29 망령 「4식 6령 설정도 (노트 학생증의) 고유 아래에」: 노트가 읽는 지시 체계 요약 — tOrdHTML 칩과 같은 규칙.
   {preset, presetName, rk, oName, cName, base, o:[{k,nm,n,ex,off,pick}], c:[…], mode:'solo'|'misag'|'', pickN:{o,c}, offN:{o,c}|null} */
function ordSnap(t) {
  const o = t.orders || {};
  const p = o.preset || '';
  if (!p) return { preset: '' };
  const base = o.base == null || o.base === '' ? 1 : +o.base;
  const tc = tOrdTc(t),
    to = TORD.tordOf(tc),
    z = TORD.zeros(to, tc),
    ty = o.type || {};
  const row = kind => {
    const keys = kind === 'o' ? TORD.LO : TORD.LC,
      def = kind === 'o' ? to : tc,
      L = kind === 'o' ? TORD.OL : TORD.CL;
    const out = [];
    for (const k of keys) {
      const v = ty[kind + '_' + k];
      const f = v == null ? def : +v;
      const ex = f !== def;
      const nm = TORD.nameOf(kind, f, k);
      if (!nm && !ex) continue;
      const avail = !(!nm || (!ex && z.includes(k)));
      const off = isMisag(t) && misagOrdOff(t, kind).includes(k);
      const pick = tOrdPick(t, kind).includes(k);
      const zero = !avail || (t.solo && !pick) || off;
      out.push({ k, nm: nm || TORD.KO[k], n: zero ? 0 : base, ex: ex ? L[f] : '', off, pick, avail });
    }
    return out;
  };
  return {
    preset: p,
    presetName: (TORD.PRE.find(x => x[0] === p) || [])[1] || p,
    rk: (t.ranks || {})['지시'] || '',
    oName: TORD.OL[to] || '',
    cName: TORD.CL[tc] || '',
    base,
    o: row('o'),
    c: row('c'),
    mode: t.solo ? 'solo' : isMisag(t) ? 'misag' : '',
    pickN: { o: soloOrdN('o', t), c: soloOrdN('c', t) },
    offN: isMisag(t) ? misagOrdNeed(t) : null
  };
}
/* 11-11 망령 「4식 6령도 설정에서 3체 때 추가로 들고 갈 거 설정을 할 수 있어야」: 미사그 서브(1인 3체) — 2체 몫(pick) 에 더해 3+3 때 추가로 들고 갈 항목(pick3). 개수 = 1인 기준 (3체) 고르기 수 − 2체 고르기 수 */
function misag3OrdN(kind, t) {
  const R3 = RULES().solo3 || SOLO3_DEF;
  const v3 = parseInt(R3[kind], 10);
  const n3 = (v3 >= 0 ? v3 : +SOLO3_DEF[kind]) + (kind === 'c' && soloA(t) ? 1 : 0);
  return Math.max(0, n3 - soloOrdN(kind, t));
} /* 11-11 망령 「인당 기본 4식 2 · 6령 3, 지시 A 는 추가 지령 하나 더 → 6령 4」 */
function tOrdPick3(t, kind) {
  const pk = ((t.orders || {}).pick3 || {})[kind];
  return Array.isArray(pk) ? pk : [];
}
function pick3Bar(t, ti, kind, L) {
  const n = misag3OrdN(kind, t);
  if (!n || !L.length) return '';
  const pk = tOrdPick3(t, kind).filter(k => L.some(x => x[0] === k));
  const ok = pk.length === Math.min(n, L.length);
  return `<div class="ordpick ${ok ? '' : 'need'}"><span class="small"><b>3체 기준 (서브)</b> <span class="muted" title="2명이서 3+3 으로 합칠 때 — 위 2체 몫에 더해 들고 갈 것">· 3+3 때 추가로 들고 갈 것</span> · ${L.length}개 중 <b>${n}</b>개 <b class="num">${pk.length}/${n}</b></span>${L.map(([k, nm]) => `<button type="button" class="ordpb ${pk.includes(k) ? 'on' : ''}" data-act="tordPick3" data-i="${ti}" data-kind="${kind}" data-key="${k}" aria-pressed="${pk.includes(k)}">${esc(nm)}</button>`).join('')}</div>`;
}
function tOrdHTML(t, ti) {
  const o = t.orders || {};
  const p = o.preset || '';
  const rk = (t.ranks || {})['지시'] || 'C';
  const base = o.base == null || o.base === '' ? 1 : +o.base;
  const opts =
    `<option value="" ${!p ? 'selected' : ''}>정하지 않음 (오레마스 방 설정)</option>` +
    TORD.PRE.map(([k, n]) => {
      const tc = TORD.presetTc(k, rk);
      return `<option value="${k}" ${p === k ? 'selected' : ''}>${n}${isNaN(tc) ? '' : ' → ' + esc(TORD.CL[tc])}</option>`;
    }).join('');
  let prev = '';
  if (p) {
    const tc = tOrdTc(t),
      to = TORD.tordOf(tc),
      z = TORD.zeros(to, tc);
    const ty = o.type || {};
    const avl = { o: [], c: [] };
    const chips = kind => {
      const keys = kind === 'o' ? TORD.LO : TORD.LC,
        def = kind === 'o' ? to : tc,
        L = kind === 'o' ? TORD.OL : TORD.CL;
      let exn = 0;
      const h = keys
        .map(k => {
          const v = ty[kind + '_' + k];
          const f = v == null ? def : +v;
          const ex = f !== def;
          if (ex) exn++;
          const nm = TORD.nameOf(kind, f, k);
          const avail = !(!nm || (!ex && z.includes(k)));
          const zero = !avail || (t.solo && !tOrdPick(t, kind).includes(k)) || (isMisag(t) && misagOrdOff(t, kind).includes(k));
          if (!nm && !ex) return '';
          if (avail) avl[kind].push([k, nm]);
          return `<label class="ordc ed ${zero ? 'z' : ''} ${ex ? 'ex' : ''}" title="${esc(TORD.KO[k])} — 눌러서 이 항목만 다른 계열로${ex ? ' (지금 예외: ' + L[f] + ')' : ''}"><span>${esc(nm || TORD.KO[k])}</span><b>${zero ? 0 : base}</b>${ex ? '<i>예외</i>' : ''}<select data-tordx="${ti}" data-kind="${kind}" data-key="${k}" aria-label="${esc(TORD.KO[k])} 계열">${L.map((n, i) => `<option value="${i}" ${f === i ? 'selected' : ''}>${esc(n)}${i === def ? ' (기본)' : ''} — ${esc(TORD.nameOf(kind, i, k) || '없음')}</option>`).join('')}</select></label>`;
        })
        .join('');
      const add = keys.filter(k => ty[kind + '_' + k] == null && !TORD.nameOf(kind, def, k) && L.some((_, i) => TORD.nameOf(kind, i, k)));
      return (
        h +
        (add.length
          ? `<label class="ordc add" title="이 계열에 없는 항목을 다른 계열에서 가져온다"><span>＋ 다른 계열 항목</span><select data-tordadd="${ti}" data-kind="${kind}"><option value="">고르기</option>${add.map(k => L.map((n, i) => (TORD.nameOf(kind, i, k) ? `<option value="${k}:${i}">${esc(TORD.KO[k])} — ${esc(TORD.nameOf(kind, i, k))} (${esc(n)})</option>` : '')).join('')).join('')}</select></label>`
          : '') +
        (exn
          ? `<button type="button" class="btn xs ghost" data-act="tordReset" data-i="${ti}" data-kind="${kind}" title="예외 계열을 모두 지우고 기본으로">예외 ${exn}개 되돌리기</button>`
          : '')
      );
    };
    /* 1인 기준: 쓸 수 있는 항목 중 정해진 수만 고른다 */
    /* 미사그 대학: 각성체 대가(지시)로 빼는 항목을 GM이 고른다 */
    const offBar = kind => {
      const n = misagOrdNeed(t)[kind];
      if (!isMisag(t) || !n) return '';
      const L = avl[kind],
        pk = misagOrdOff(t, kind).filter(k => L.some(x => x[0] === k));
      return `<div class="ordpick off ${pk.length === Math.min(n, L.length) ? '' : 'need'}"><span class="small"><b>각성체 대가</b> · ${L.length}개 중 <b>${n}</b>개 빼기 <b class="num">${pk.length}/${n}</b></span>${L.map(([k, nm]) => `<button type="button" class="ordpb ${pk.includes(k) ? 'on' : ''}" data-act="tordOff" data-i="${ti}" data-kind="${kind}" data-key="${k}" aria-pressed="${pk.includes(k)}">${esc(nm)}</button>`).join('')}</div>`;
    };
    const pickBar = kind => {
      const mg = isMisag(t) && !t.solo;
      if (!t.solo && !mg) return offBar(kind);
      if (!avl[kind].length) return '';
      const L = mg ? avl[kind].filter(x => !misagOffNow(t, kind).includes(x[0])) : avl[kind],
        n = soloOrdN(kind, t),
        pk = tOrdPick(t, kind).filter(k => L.some(x => x[0] === k));
      const must = kind === 'c' && soloA(t) && L.some(x => SOLO_A_MUST.includes(x[0]));
      const mOk =
        kind !== 'c' ||
        soloMustOk(
          t,
          pk,
          L.map(x => x[0])
        );
      const ok = pk.length === Math.min(n, L.length) && mOk;
      return (
        (mg ? offBar(kind) : '') +
        `<div class="ordpick ${ok ? '' : 'need'}"><span class="small"><b>${mg ? '2체 기준' : '1인 기준' + (soloN(t) === 3 ? ' (3체)' : '')}</b>${mg ? ' <span class="muted" title="6체(4+2) 배틀에서는 위 횟수 그대로 · 2체로 합칠 때만 고른 항목을 쓰고 나머지는 0회">· 2체로 합칠 때 들고 갈 것</span>' : ''} · ${L.length}개 중 <b>${n}</b>개 고르기 <b class="num">${pk.length}/${n}</b>${must ? ` · <b class="${mOk ? '' : 'warn'}" title="지시 A 이상 1인 기준: 지령 셋 중 하나는 회피나 명중">회피 · 명중 중 1개 필수${mOk ? ' ✓' : ''}</b>` : ''}</span>${L.map(([k, nm]) => `<button type="button" class="ordpb ${pk.includes(k) ? 'on' : ''}" data-act="tordPick" data-i="${ti}" data-kind="${kind}" data-key="${k}" aria-pressed="${pk.includes(k)}">${esc(nm)}</button>`).join('')}</div>` +
        (mg
          ? pick3Bar(
              t,
              ti,
              kind,
              L.filter(x => !pk.includes(x[0]))
            )
          : '')
      );
    };
    prev = `<div class="ordp"><div><span class="ordk o">ORDER</span><b>명령 (4식)</b><span class="small muted">${esc(TORD.OL[to])} · 칩을 눌러 항목마다 계열을 바꾼다</span></div><div class="ordl">${chips('o')}</div>${pickBar('o')}
   <div><span class="ordk c">COMMAND</span><b>지령 (6령)</b><span class="small muted">${esc(TORD.CL[tc])}</span></div><div class="ordl">${chips('c') || '<span class="small muted">이 계열엔 지령(『6령』 · 『영창』)이 없다</span>'}</div>${pickBar('c')}</div>`;
  }
  return `<div class="tord"><div class="tordh"><b>지시 체계</b><span class="ordk o">ORDER</span><span class="ordk c">COMMAND</span><span class="small muted">지시 ${esc(rk)}</span></div>
  <label class="plrow"><span>지령 종류</span><select data-tord="${ti}" data-k="preset">${opts}</select></label>
  ${p === 'manual' ? `<label class="plrow"><span>계열</span><select data-tord="${ti}" data-k="tc">${TORD.CL.map((n, i) => `<option value="${i}" ${+o.tc === i ? 'selected' : ''}>${i + 1}. ${esc(n)}</option>`).join('')}</select></label>` : ''}
  ${p ? `<label class="plrow"><span>기준 횟수</span><input type="number" min="0" max="9" style="width:64px;flex:none" data-tord="${ti}" data-k="base" value="${base}"><span class="small muted" style="font-weight:400">항목마다 이 횟수</span></label>${prev}` : '<p class="small muted" style="margin:6px 0 0">고르면 오레마스로 가져갈 때 명령(4식)·지령(6령) 계열과 횟수가 자동으로 맞춰진다.</p>'}</div>`;
}
/* 10-26 망령: 세션 노트와 주고받는 공개 칸(RP). 노트의 「⇪ 제작기로」 · 「⇩ 제작기에서」 와 같은 칸이다 */
const RP_PC = [
    ['bg', '배경 · 설정'],
    ['goal', '목표 · 동기'],
    ['bond', '인간관계'],
    ['style', '말투 · 겉모습'],
    ['note', '메모']
  ],
  RP_NPC = [
    ['bg', '정체 · 설정'],
    ['goal', '원하는 것 · 동기'],
    ['bond', '인간관계'],
    ['style', '말투 · 겉모습'],
    ['note', 'PL 이 아는 것']
  ];
/* 10-28 망령: 미사그 대학 (4+2) 「각성체 대가」 패널 — 등급은 각성 (대가)의 프라이드에서 매번 계산, 고른 것만 t.misagPen 에 */
function misagOut(t) {
  if (!isMisag(t)) return undefined;
  const P = misagPen(t),
    e = misagEff(t);
  const it = [];
  if (e.통솔) {
    for (const k of [...(mHasB(e.통솔) ? [P.b] : []), ...(mHasA(e.통솔) ? [P.a] : [])]) {
      const r = k && misagItem(k);
      if (r) it.push({ key: r[0], grade: r[1], desc: r[2], need: r[3] || '' });
    }
  }
  return {
    grade: misagGrade(t),
    pen: e,
    dist: misagDistPen(t),
    distAw: misagDistAw(t),
    distPl: misagDistPl(t),
    distSolo: (d => (d == null ? d : +d + distExtraAw(t)))(tplSolo('육성', '분배레벨', t.ranks['육성'])),
    /* 11-22 「각성체 분배는 4렙에서 안 늘어나」: 세션 노트 PT 서머리 「각성체 n/m」의 m 에도 조정 · 【준비】 몫 */ excl: misagExclPen(t),
    uq: misagUqPen(t),
    ordOff: e.지시 ? { o: misagOrdOff(t, 'o'), c: misagOrdOff(t, 'c') } : { o: [], c: [] },
    items: it,
    type: P.type || '',
    role: String(P.role || '').trim(),
    note: String(P.note || '').trim(),
    two: misagTwoOut(t)
  };
}
/* 10-30 망령 「세션 노트에도 이어지게」: 2체 기준 요약 — 각성체 2체 몫 검사 글 · 2체 기준으로 고른 4식 · 6령(대가로 뺀 것 제외) · 3계제권 · 검사 켜짐 */
function misagTwoOut(t) {
  let O = null;
  try {
    O = ordSnap(t);
  } catch (e) {}
  const pk = kind => (O && O.preset ? (O[kind] || []).filter(x => x.pick && x.avail && !x.off) : []);
  return {
    checks: misagChecks(t).filter(x => /^(2체 기준|각성체 2체 몫)/.test(x)),
    pick: { o: pk('o').map(x => x.k), c: pk('c').map(x => x.k) },
    names: { o: pk('o').map(x => x.nm), c: pk('c').map(x => x.nm) },
    need: O && O.pickN ? O.pickN : { o: soloOrdN('o', t), c: soloOrdN('c', t) },
    g3: misagG3(t.ranks['육성']) || null,
    b1: mOn('twoB1'),
    role: mOn('twoRole')
  };
}
/* 10-28 망령: 각성체 대가를 짧은 줄로 — 트레이너 카드(서머리)와 각성체 한 장 요약에 띄운다 */
function misagPenLines(t) {
  if (!isMisag(t)) return [];
  const o = misagOut(t),
    e = o.pen,
    out = [];
  const KO = k => TORD.KO[k] || k;
  if (e.지시) {
    const nd = misagOrdNeed(t);
    const off = [...o.ordOff.c, ...o.ordOff.o].map(KO);
    out.push([
      '지시',
      e.지시,
      `${[nd.c ? `지령 −${nd.c}` : '', nd.o ? `명령 −${nd.o}` : ''].filter(Boolean).join(' · ')}${off.length ? ` (${off.join(', ')})` : ''}`
    ]);
  }
  if (e.육성) out.push(['육성', e.육성, `분배레벨 −${o.dist} (각성체 −${misagDistAw(t)} · PL −${misagDistPl(t)})`]);
  if (e.통솔)
    for (const it of o.items)
      out.push([
        '통솔',
        it.grade,
        `${it.key} ${it.desc}${it.need === 'type' && o.type ? ` [${o.type}]` : ''}${it.need === 'role' && o.role ? ` [${o.role}]` : ''}`
      ]);
  if (e.통솔 && !o.items.length) out.push(['통솔', e.통솔, '항목을 아직 안 골랐다']);
  if (e.능력) out.push(['능력', e.능력, `전용 −${o.excl}${o.uq ? ` · 고유 점수 −${o.uq}` : ''}`]);
  return out;
}
function misagPenHTML(t, cls) {
  const L = misagPenLines(t),
    g = misagGrade(t);
  if (!isMisag(t)) return '';
  return `<div class="mpen ${cls || ''}"><span class="mpen-h">각성체 대가 ${g && g !== '?' ? `<b class="mgr g${g}">${g}</b>` : '<i>없음</i>'}</span>${L.map(([c, lv, x]) => `<span class="mpen-i" title="${esc(c + ' ' + lv + ' · ' + x)}"><b>${esc(c)} ${esc(lv)}</b>${esc(x)}</span>`).join('')}${String(misagPen(t).note || '').trim() && g ? `<q class="mpen-q" title="${esc(misagPen(t).note)}">${esc(String(misagPen(t).note).trim())}</q>` : ''}</div>`;
}
function misagHTML(t, ti) {
  const P = misagPen(t),
    R = MR(),
    g = misagGrade(t),
    e = misagEff(t),
    B = `T.${ti}.misagPen`;
  const nm = L =>
    L.map(p => `${esc(p.name || '(이름 없음)')} <span class="faint">${esc(prideOf(p) || '-')}</span>`).join(', ') || '<span class="warn">없음</span>';
  const gLab = g === '?' ? '<span class="warn">등급표에 없음</span>' : g ? `<b class="mgr g${g}">${g}</b>` : '<span class="faint">없음</span>';
  const catHint = {
    지시: `지령 (6령) ${mnum('ordB')}개 · A면 명령 (4식) ${mnum('ordA')}개 더`,
    육성: `분배레벨 −${mnum('distB')} · A면 −${mnum('distA')} 더 (각성체 1/3 · PL 2/3)`,
    통솔: 'B 항목 1택 · A면 A 항목도 1택',
    능력: `전용 포텐셜 총 개수 −${mnum('exclB')} · A면 고유 포텐셜 점수 −${mnum('uqA')} 또는 전용 −${mnum('exclA')} 더`
  };
  const pick =
    g === 'B' || g === 'A'
      ? `<label class="plrow"><span>대가 분류</span><select data-p="${B}.cat"><option value="" ${!P.cat ? 'selected' : ''}>고르기</option>${MISAG_CATS.map(c => `<option value="${c}" ${P.cat === c ? 'selected' : ''}>${c}</option>`).join('')}</select></label>${
          g === 'A' && P.cat
            ? `<label class="plrow"><span>A 몫 분류</span><select data-p="${B}.catA"><option value="" ${!P.catA || P.catA === P.cat ? 'selected' : ''}>B 몫과 같은 분류 (${esc(P.cat)})</option>${MISAG_CATS.filter(
                c => c !== P.cat
              )
                .map(c => `<option value="${c}" ${P.catA === c ? 'selected' : ''}>${c} (A만)</option>`)
                .join('')}</select></label>`
            : ''
        }${P.cat && catHint[P.cat] ? '' : `<p class="small muted" style="margin:2px 0 0">${MISAG_CATS.map(c => `${c}: ${esc(catHint[c])}`).join(' · ')}</p>`}`
      : g === 'EX'
        ? `<div class="mgex"><span class="small muted">EX — GM이 분류마다 대가를 정합니다</span>${MISAG_CATS.map(
            c =>
              `<label class="row small" style="gap:4px">${c}<select data-p="${B}.ex.${c}">${[
                ['', '없음'],
                ['B', 'B'],
                ['A', 'A (B 포함)'],
                ['A만', 'A만']
              ]
                .map(([v, l]) => `<option value="${v}" ${(P.ex[c] || '') === v ? 'selected' : ''}>${l}</option>`)
                .join('')}</select></label>`
          ).join('')}</div>`
        : '';
  const lines = [];
  const nd = misagOrdNeed(t);
  if (e.지시)
    lines.push(
      `<li><b>지시 ${e.지시}</b> · ${[nd.c ? `지령 (6령) ${nd.c}개` : '', nd.o ? `명령 (4식) ${nd.o}개` : ''].filter(Boolean).join(' · ')}를 뺍니다 — 위 「지시 체계」에서 고르기 (지금 ${misagOrdOff(t, 'c').length}${nd.o ? ' · ' + misagOrdOff(t, 'o').length : ''})</li>`
    );
  if (e.육성)
    lines.push(
      `<li><b>육성 ${e.육성}</b> · 분배레벨 −${misagDistPen(t)} — 각성체 2체 몫 −${misagDistAw(t)} · PL 4체 몫 −${misagDistPl(t)} (1/3 반올림 · 포인트 표 「분배레벨」 소모에 들어가고, 모자라면 음수만큼 레벨을 깎습니다)</li>`
    );
  if (e.통솔) {
    const types = S.db.types.map(x => x[0]).filter(x => x && x !== '-');
    const roles = [...new Set(t.pokemon.map(p => roleOf(p)).filter(Boolean))];
    const isel = (lv, k) =>
      `<select data-p="${B}.${k}"><option value="" ${!P[k] ? 'selected' : ''}>${lv} 항목 고르기</option>${misagItems(lv)
        .map(r => `<option value="${esc(r[0])}" ${P[k] === r[0] ? 'selected' : ''}>${esc(r[0])} — ${esc(r[2])}</option>`)
        .join('')}</select>`;
    const used = [...(mHasB(e.통솔) ? [P.b] : []), ...(mHasA(e.통솔) ? [P.a] : [])].map(misagItem).filter(Boolean);
    lines.push(
      `<li><b>통솔 ${e.통솔}</b><div class="mgsel">${mHasB(e.통솔) ? isel('B', 'b') : ''}${mHasA(e.통솔) ? isel('A', 'a') : ''}${used.some(r => r[3] === 'type') ? `<label class="row small" style="gap:4px">특정 타입${sel(B + '.type', P.type || '', ['', ...types])}</label>` : ''}${used.some(r => r[3] === 'role') ? `<label class="row small" style="gap:4px">꺼지는 역할<input data-p="${B}.role" value="${esc(P.role || '')}" list="mg-roles-${t.id}" style="width:120px" placeholder="예: 에이스"></label><datalist id="mg-roles-${t.id}">${roles.map(r => `<option value="${esc(r)}">`).join('')}</datalist>` : ''}</div>${used.length ? `<div class="small muted">${used.map(r => `${esc(r[0])} ${esc(r[2])}`).join(' · ')}${used.some(r => /^A/.test(r[1])) ? ' — 배틀 중 판정은 오레마스' : ''}</div>` : ''}</li>`
    );
  }
  if (e.능력)
    lines.push(
      `<li><b>능력 ${e.능력}</b> · 전용 포텐셜 총 개수 −${misagExclPen(t)}${mHasA(e.능력) ? `<div class="mgsel"><label class="row small" style="gap:4px">A 대가<select data-p="${B}.abA"><option value="" ${misagAbA(t) === 'uq' ? 'selected' : ''}>고유 포텐셜 점수 −${mnum('uqA')}</option><option value="excl" ${misagAbA(t) === 'excl' ? 'selected' : ''}>전용 포텐셜 −${mnum('exclA')} 더</option></select></label></div>${misagAbA(t) === 'uq' ? `<span class="small muted">고유 포텐셜 점수 −${misagUqPen(t)} (지금 ${uqScore(t)} / ${uqScoreCap(t.ranks['능력']) - misagUqPen(t)})</span>` : `<span class="small muted">B 몫 −${mnum('exclB')} + A 몫 −${mnum('exclA')}</span>`}` : ''}</li>`
    );
  const W = misagChecks(t);
  return `<div class="panel misagp"><h3>각성체 대가<span class="small muted" style="font-weight:400">미사그 대학 (4+2) · 등급 ${gLab}</span><span class="sp"></span><button class="btn sm ghost" type="button" data-tip="각성체 2체는 GM이 짜고 통솔점을 쓰지 않습니다. 각성 (대가) 1체의 프라이드가 B면 B 대가 하나, A면 같은 분류의 B + A 대가를 PL 쪽이 치릅니다(C는 없음, EX는 GM이 조합). 숫자는 테이블·계산식 「미사그 대학」에서 고칩니다." title="설명">?</button></h3>
  <p class="small" style="margin:0 0 6px">${AW_LAB.free} ${nm(awList(t, 'free'))} · ${AW_LAB.c} ${nm(awList(t, 'c'))}</p>${(() => {
    const g = misagG3(t.ranks['육성']);
    return g
      ? `<p class="small muted" style="margin:0 0 6px">3계제권 · 육성 ${esc(strip(t.ranks['육성'] || ''))}: 각성체 2체 모두 『계제』『속별』 ${esc(g.aw)}개 · PL 4체 중 3개 습득 개체 ${esc(g.pl)}</p>`
      : '';
  })()}
  ${pick}${lines.length ? `<ul class="mgl">${lines.join('')}</ul>` : ''}
  ${g ? `<label class="lbl mgnote">대가 코멘트 <span class="faint">트레이너 카드 · 목록 · 각성체 한 장 요약에 같이 뜬다 · 오레마스에도 넘어간다</span><textarea data-p="${B}.note" rows="2" maxlength="300" placeholder="예: 각성의 대가로 기억 한 조각을 내주었다. 지시가 가끔 들리지 않는다.">${esc(P.note || '')}</textarea></label>` : ''}
  ${W.map(x => `<p class="small warn" style="margin:6px 0 0">⚠ ${esc(x)}</p>`).join('')}</div>`;
}
function trainerHTML(t, ti) {
  if (EMB.one && t.id === EMB.t && t.pokemon.some(x => x.id === EMB.p)) return embOneHTML(t, ti); /* 10-30 노트 「포켓몬 고치기」 = 그 포켓몬 칸만 */
  const P = `T.${ti}`;
  const use = pointUse(t);
  const iv = investCheck(t);
  const pu = ptSockets(t),
    pm = ptMax(t);
  const tOpen = t.open || !!t._q; /* 11-03 이름 검색 중에는 맞는 트레이너를 펼쳐 보인다 (상태는 안 바꿈) */
  return `<section class="folder ${tOpen ? 'open' : ''}" id="tr-${t.id}" data-ti="${ti}" data-si="${ti}">
 <header class="fh tcard ${tDecoCls(t)}" style="${tDecoVars(t)}" data-tog="${P}" data-grab tabindex="0" role="button" data-kbd aria-expanded="${!!t.open}" aria-label="${esc(t.name || '트레이너')} 펼치기/접기"><span class="caret">▸</span><span class="avatar">${safeImg(t.image) ? `<img src="${safeImg(t.image)}" alt="">` : esc([...(t.name || '?')][0] || '?')}</span>
  <div class="tmain"><div class="tl1"><span class="tname">${esc(t.name)}</span>${FAV.btn('t', t.id)}${t.kind === 'npc' ? '<span class="plchip npc" title="NPC — 오레마스 관계도에 NPC 노드로 들어간다">NPC</span>' : ''}${t.priv ? `<span class="kindb privchip" title="${esc('비공개 · ' + (t.ownerName || '') + (ME.gm ? ' (GM 열람)' : ''))}">🔒</span>` : ''}${(t.pl || '').trim() ? `<span class="plchip" title="PL">PL <b>${esc(t.pl.trim())}</b></span>` : ''}</div>${(t.deco || {}).title ? `<div class="ttitle">${esc(t.deco.title)}</div>` : ''}
   <div class="tl3"><span class="row trk">${QUAL.map(q => rkChip(q, t.ranks[q])).join('')}</span><span class="small muted tmeta">${tMetaHTML(t, use)}</span></div></div>
  ${tPartyHTML(t, ti)}${tUqHTML(t, ti)}<span class="sp"></span>
  <div class="tacts">${S.folders.length ? `<select class="tmove" data-tmove="${ti}" aria-label="폴더 이동" title="폴더 이동"><option value="">폴더 없음</option>${[fTreeOpts(tFolder(t))].join('')}</select>` : ''}<button class="btn sm ghost" data-act="decoT" data-i="${ti}" title="카드 색 · 칭호 · 배경 그림 · 무늬">🎨 꾸미기</button><button class="btn sm ghost" data-act="privT" data-i="${ti}" title="비공개 트레이너는 만든 사람(같은 비밀구)과 GM 에게만 보입니다">${t.priv ? '공개로' : '비공개'}</button><button class="btn sm ghost" data-act="cardT" data-i="${ti}" title="이 트레이너를 한 장으로 — 자질 · 고유 · 파티 · 필드 · 기능 확장 (PNG 저장)">▤ 한 장</button><button class="btn sm ghost" data-act="dupT" data-i="${ti}">복제</button>${SH.on ? `<button class="btn sm ghost" data-act="histT" data-i="${ti}" title="공유 DB 에 남은 옛 판 보기 · 되돌리기">이력</button>` : ''}<button class="btn sm ghost danger" data-act="delT" data-i="${ti}">삭제</button></div></header>
 ${
   tOpen
     ? `<div class="fb"><div class="tgrid">
  <div class="panel"><h3>프로필<span class="sp"></span><button class="btn sm" data-act="bioT" data-i="${ti}" title="백스토리 · 성격 · 말투 · 선호하는 전법 · 그 밖에 — 오레마스 캐릭터 탭에 그대로 보인다">상세${bioN(t) ? ` <b class="num">${bioN(t)}</b>` : ''}</button></h3><label class="lbl" for="tn-${t.id}">이름${inp(P + '.name', t.name, { id: 'tn-' + t.id })}</label>
   <div class="imgbox" style="margin-top:8px">${safeImg(t.image) ? `<img src="${safeImg(t.image)}" alt="트레이너 이미지">` : '<span class="small">이미지 없음</span>'}</div>
   <div class="row" style="margin-top:6px"><label class="btn sm" for="img-${t.id}" tabindex="0" role="button" data-kbd>이미지 삽입</label><input type="file" id="img-${t.id}" accept="image/*" data-img="${ti}" hidden>${t.image ? `<button class="btn sm ghost" data-act="noimg" data-i="${ti}">제거</button>` : ''}</div>
   <h3 style="margin-top:14px"><span style="white-space:nowrap;flex:none">스탠딩</span> <span class="small muted" style="font-weight:normal">오레마스 무대용 · 전신 투명 PNG</span></h3>
   ${standsHtml(t, 't:' + ti)}</div>
  <div class="tright"><div class="panel"><h3>자질<span class="sp"></span><button class="btn sm" data-act="tpl" data-i="${ti}" title="랭크 템플릿(테이블·계산식 탭)을 포인트 기본값에 다시 적용">템플릿 다시 적용</button></h3>
   <table><tr><th>자질</th><th>랭크 <span class="small faint" style="font-weight:400">직접 입력 가능</span></th><th>상세 사항</th></tr>${QUAL.map(q => `<tr><td><b>${q}</b></td><td>${inp(`${P}.ranks.${q}`, t.ranks[q], { w: '76px', list: 'mk-ranks' })}</td><td>${inp(`${P}.detail.${q}`, t.detail[q], { ph: '메모' })}</td></tr>`).join('')}</table>
   <datalist id="mk-ranks">${RANKS.map(r => `<option value="${r}">`).join('')}</datalist><div class="invest ${iv.msg.length ? 'bad' : ''}">${iv.msg.length ? iv.msg.map(esc).join(' · ') : `자질 투자 ${iv.steps}/${iv.allow}회 · 규칙 이상 없음`}</div>
   <p class="small muted" style="margin:6px 0 0">육성 ${esc(t.ranks['육성'])} → 기본 레벨 <b>${baseLevel(t.ranks['육성'])}</b> · 포켓몬 기술 소켓 상한 ${esc((sockRow(t.ranks['육성']) || [])[6] ?? '-')}</p>
   <label class="plrow"><span>PL</span>${inp(P + '.pl', t.pl, { ph: '플레이어 이름' })}</label>
   <label class="plrow" title="오레마스 방으로 가져갈 때 관계도·휴대폰에서 PC(플레이어)인지 NPC 인지"><span>구분</span><select data-p="${P}.kind"><option value="pc" ${t.kind !== 'npc' ? 'selected' : ''}>PC (플레이어 캐릭터)</option><option value="npc" ${t.kind === 'npc' ? 'selected' : ''}>NPC</option></select></label>${tOrdHTML(t, ti)}</div>
  <div class="panel"><h3>포인트<span class="sp"></span>${soloN(t) === 3 ? `<span class="small muted" title="1인 기준 (3체) 파트너 수 — 테이블·계산식 「1인 기준 (3체)」">파트너 ${t.pokemon.filter(p => p.partner).length}/${esc((RULES().solo3 || SOLO3_DEF).partner)}</span>` : ''}${tInMisag(t) ? '<span class="kindb fmrule" title="미사그 캠퍼스 폴더 안이라 미사그 대학 (4+2) 고정 — 폴더 밖으로 옮기면 6체 기준으로 돌아간다">🎓 캠퍼스</span>' : ''}<select data-p="${P}.solo" class="solosel" ${tInMisag(t) ? 'disabled' : ''} title="6체 기준 / 1인 기준 — 바꾸면 포인트 기본값을 그 기준 템플릿으로 다시 맞춘다">${[
    ['', '6체 기준'],
    ['2', '1인 기준 (2체)'],
    ['3', '1인 기준 (3체)'],
    ['m', '미사그 대학 (4+2)']
  ]
    .map(([v, l]) => `<option value="${v}" ${(isMisag(t) ? 'm' : String(soloN(t) || '')) === v ? 'selected' : ''}>${l}</option>`)
    .join('')}</select></h3><table><tr><th>항목</th><th class="n">기본</th><th class="n">소모</th><th class="n">잔여</th></tr>
   ${ptItems()
     .map(([k, d, a]) => {
       if (t.base[k] == null) t.base[k] = +d || 0;
       const dm = (a === 'rank' ? rankDump(t) : 0) + (a === 'dist' ? distExtra(t) : 0);
       const r = (+t.base[k] || 0) + dm - (use[k] || 0);
       if (ptItemOff(t, a))
         return `<tr class="muted"><td>${esc(k)}</td><td class="n" colspan="3" title="${esc(F_RULE.mong.tip)}">몽환 세계 · 쓰지 않음</td></tr>`;
       return `<tr><td>${esc(k)}${
         a === 'dist'
           ? `<div class="row small" style="gap:4px;flex-wrap:nowrap" title="강자 NPC · 보상 등으로 늘리거나 줄인 분배레벨 몫 (−도 된다). 【준비】 「분배 레벨 : ±N」 포텐셜 · 고유는 저절로 더한다"><span class="muted">조정</span>${inp(P + '.distAdj', t.distAdj ?? '', { w: '44px', num: 1, ph: '0' })}${inp(P + '.distNote', t.distNote ?? '', { w: '80px', ph: '사유' })}</div>${(() => {
               const tip = distExtraTip(t);
               return tip
                 ? `<div class="small muted" title="${esc(tip)}">+ ${distExtra(t)} (${esc(tip.length > 36 ? tip.slice(0, 36) + '…' : tip)})</div>`
                 : '';
             })()}`
           : ''
       }</td><td class="n">${inp(`${P}.base.${seg(k)}`, t.base[k], { w: '52px', num: 1 })}</td><td class="n">${use[k] || 0}</td><td class="n ${r < 0 ? 'warn' : ''}">${r}</td></tr>`;
     })
     .join('')}</table>
   <div class="row" style="margin-top:8px"><b class="small">포인트 사용 항목</b><span class="sp"></span><button class="btn sm" data-act="addPt" data-i="${ti}">+ 항목</button></div>
   <p class="small muted" style="margin:6px 0 0">자동 소모 · ${
     ptItems()
       .filter(x => x[2])
       .map(([n, , a]) => `${esc(n)} ${autoUse(t, a)} (${esc(PTI_AUTO[a] || a)})`)
       .join(' · ') || '없음'
   }</p>
   ${
     t.pts
       .map((n, i) => {
         const r = idx.points.get(n);
         return `<div class="row small" style="margin-top:4px"><span style="flex:1;min-width:0"><b>${esc(n)}</b> <span class="muted">${r ? esc(r[3] + ' −' + r[6]) : ''}</span></span><button class="btn sm ghost" data-act="delPt" data-i="${ti}" data-j="${i}" aria-label="삭제">✕</button></div>`;
       })
       .join('') || '<p class="small faint" style="margin:4px 0 0">사용한 항목이 없습니다.</p>'
   }${sk3Html(t, ti)}</div>
 </div></div>
 <div class="panel uqpanel"><h3>『고유 포텐셜』<span class="small muted" style="font-weight:400">능력 ${esc(t.ranks['능력'])} · 최대 ${esc(abilLimits(t.ranks['능력']).u)}개${
   isMisag(t)
     ? (() => {
         const sc = uqScore(t),
           cp = uqScoreCap(t.ranks['능력']) - misagUqPen(t);
         return ` · 점수 <b class="num ${sc > cp ? 'warn' : ''}">${sc}</b> / ${cp}${misagUqPen(t) ? ` <span class="warn">(각성체 대가 −${misagUqPen(t)})</span>` : ''}`;
       })()
     : ''
 }</span><span class="sp"></span><button class="btn sm" data-act="addU" data-i="${ti}">+ 고유 포텐셜</button></h3><div class="uql">
  ${t.unique.map((u, i) => uqCard(u, i, ti)).join('') || '<p class="small faint" style="margin:4px 0 0">아직 없습니다 — 「+ 고유 포텐셜」</p>'}</div></div>
 <div class="panel">${fieldsHtml(t, `data-i="${ti}"`, 't')}</div>
 <div class="panel mksppanel">${spHtml(t, ti)}</div>
 <div class="panel mksppanel">${extHtml(t, ti)}</div>
  <div class="panel mksppanel">${formsHtml(t, ti, null, 's', `T.${ti}`, 1)}</div>   <!-- 11-14 공유 폼체인지 -->   <!-- 10-27 망령: 기능 확장 · 해석 차단 기본값 -->   <!-- 10-26 망령: SP · 서포터는 필드 전개처럼 따로 가로 칸 -->
 ${isMisag(t) ? misagHTML(t, ti) : ''}<div class="panel ptbar"><h3>PT 기술점<b class="num ${pu > pm && !ruleOff(t, 'sock') ? 'warn' : ''}">${pu}</b>${ruleOff(t, 'sock') ? `<span class="kindb fmrule" title="${esc(F_RULE.mong.tip)}">몽환 세계 · 상한 없음 · ${mongGye(t)}계제</span>` : `<span class="small muted">/ 최대치</span>${inp(P + '.ptMax', t.ptMax, { w: '58px', num: 1, ph: String(ptMaxDef(t)) })}`}${t.solo ? `<span class="small muted">1인 기준 (${soloN(t)}체)</span>` : ''}${isMisag(t) ? `<span class="small muted">PL 4체 · 각성체 <b class="num ${ptSockets(t, true) > misagGmCap(t) ? 'warn' : ''}">${ptSockets(t, true)}</b> / ${misagGmCap(t)}</span>` : ''}<button class="btn sm pttyb" type="button" data-act="ptType" data-i="${ti}" title="이 PT의 타입 구성 · 공통 약점 · 보완 후보">🛡 타입 일관성</button><span class="sp"></span>${(() => {
   const L = abilLimits(t.ranks['능력'], t.solo);
   const xp = misagExclPen(t);
   const n = t.pokemon.reduce((a, p) => a + exclAll(p).length, 0);
   const per = strip(t.ranks['능력']) === 'AAA' ? 2 : 1;
   const over = t.pokemon.filter(p => exclAll(p).length > per).map(p => p.name || '(이름 없음)');
   return `<span class="small" style="font-weight:500">전용 포텐셜 <b class="num ${n > L.x - xp ? 'warn' : ''}">${n}</b> / ${esc(L.xs)}${xp ? ` <span class="warn">− ${xp} (각성체 대가)</span>` : ''}${over.length ? ` <span class="warn">· 1체에 ${per}개 초과: ${esc(over.join(', '))}</span>` : ''} <span class="faint">· 능력 ${esc(t.ranks['능력'])}</span></span>`;
 })()}${ruleOff(t, 'disc') ? '' : `<span class="small muted">· 할인 ${discUsed(t)} / ${esc(t.base['「기술 할인점」'] ?? '-')}</span>`}<button class="btn sm ghost" type="button" data-tip="PT 기술점은 각 포켓몬의 기술 소켓 합계이며, 『올드 타입』 계열은 기술 4개에 ${oldSock()}점으로 고정됩니다(테이블·계산식 탭에서 변경). 최대치를 비워 두면 육성 랭크의 「최대치」를 씁니다. 기술 옆 「할인」을 체크하면 「기술 할인점」이 1점씩 소모됩니다. 각 포켓몬의 역할·특성·소지품·종족치·프라이드·기술 소켓·전용 포텐셜은 아래 포켓몬 줄에 있습니다." title="설명">?</button></h3>
  ${ruleOff(t, 'sock') ? '' : `<div class="meter ${pu > pm ? 'over' : ''}"><i style="width:${pm ? Math.min(100, (pu / pm) * 100) : 0}%"></i></div>`}${leadBar(t)}
  ${ptChecks(t)
    .map(x => `<p class="small warn" style="margin:6px 0 0">⚠ ${esc(x)}</p>`)
    .join('')}</div>
 ${(() => {
   const K = itemSockMk(t);
   const over = K.cap != null && K.u > K.cap + 1e-9;
   const left = K.cap != null ? Math.round((K.cap - K.u) * 10) / 10 : null; /* 11-04 망령: PT 소지품 소켓 */
   return `<div class="panel ptbar isockbar"><h3>소지품 소켓<b class="num ${over ? 'warn' : ''}">${K.u}</b><span class="small muted">/ ${K.cap != null ? K.cap : '—'}</span>${left != null ? `<span class="small ${over ? 'warn' : 'muted'}">${over ? `${-left} 넘음` : `${left} 남음`}</span>` : ''}<span class="small muted" title="${esc(K.list.join('\n') || '지닌 소지품 없음')}">지시 ${esc(K.rk || '-')}${K.sn ? ` · 1인 기준 (${K.sn}체)` : ''} 기본 ${K.cap0 != null ? K.cap0 : '—'}${K.unk ? ` · 소켓 모름 ${K.unk}` : ''}</span><span class="sp"></span>
   <label class="small muted" title="보상 · 시나리오 등으로 늘거나 준 소켓 (−도 된다 · 0.5 단위)">조정 ${inp(P + '.isockAdj', t.isockAdj ?? '', { w: '52px', num: 1, ph: '0' })}</label><label class="small muted">사유 ${inp(P + '.isockNote', t.isockNote ?? '', { w: '150px', ph: '예: 호감도 보상' })}</label></h3>
   <div class="meter ${over ? 'over' : ''}"><i style="width:${K.cap ? Math.min(100, (K.u / K.cap) * 100) : 0}%"></i></div>${isMisag(t) ? isockTri(t, K) : ''}</div>`;
 })()}
 <div class="plist" data-sort="poke" data-i="${ti}">${
   isMisag(t)
     ? (() => {
         const all = t.pokemon.map((p, pi) => [p, pi]);
         const pl = all.filter(([p]) => !awOf(t, p)),
           aw = all.filter(([p]) => awOf(t, p));
         return `<div class="pgrp"><b>PL 포켓몬</b><span>${pl.length} / 4 · PL이 짠다</span></div>${pl.map(([p, pi]) => pokeHTML(t, ti, p, pi)).join('') || '<p class="small faint pgrp-e">아직 없다</p>'}<div class="pgrp aw"><b>각성체</b><span>${aw.length} / 2 · GM이 짠다 · 통솔점을 쓰지 않는다</span>${aw.length < 2 ? `<button class="btn sm pgrp-add" type="button" data-act="addAw" data-i="${ti}">+ 각성체</button>` : ''}</div>${misagPenHTML(t, 'pl')}${aw.map(([p, pi]) => pokeHTML(t, ti, p, pi)).join('') || '<p class="small faint pgrp-e">포켓몬 시트의 「각성체」 칸에서 각성 (대가) · (보조)를 고르면 이쪽으로 온다</p>'}`;
       })()
     : t.pokemon.map((p, pi) => pokeHTML(t, ti, p, pi)).join('')
 }</div>
 <div class="row"><button class="btn pri" data-act="addP" data-i="${ti}">+ 포켓몬 시트</button>${isMisag(t) && t.pokemon.filter(p => awOf(t, p)).length < 2 ? `<button class="btn" data-act="addAw" data-i="${ti}" title="미사그 대학 · 각성체 칸에 바로 들어가는 시트">+ 각성체 시트</button>` : ''}<button class="btn" data-act="addOld" data-i="${ti}">+ 올드 타입 일람에서 추가</button><button class="btn" data-act="impP" data-i="${ti}">복사용 텍스트로 불러오기</button></div>
 </div>`
     : ''
 }</section>`;
}
const tyCol = n => {
  const ti = typeInfo(tyParts(n)[0] || '');
  return (ti && safeCss(ti[1])) || '';
};
const pkVars = p => {
  const a = tyCol(p.t1),
    b = tyCol(p.t2) || a;
  return `--c1:${a || 'var(--sunk2)'};--c2:${b || 'var(--sunk2)'}`;
};
/* 능력치 육각형: 위부터 시계 방향 HP·공격·방어·스피드·특방·특공 (원작 순서) */
const RADAR_ORD = [0, 1, 2, 5, 4, 3];
function radarBig(p) {
  const R = 62,
    cx = 90,
    cy = 82;
  const pt = (i, r) => {
    const a = -Math.PI / 2 + (i * Math.PI) / 3;
    return [cx + r * Math.cos(a), cy + r * Math.sin(a)];
  };
  const P2 = a => a.map(v => v.toFixed(1)).join(',');
  const ring = f => [0, 1, 2, 3, 4, 5].map(i => P2(pt(i, R * f))).join(' ');
  const vals = RADAR_ORD.map(i => Math.min(1, (+p.base[i] || 0) / 180));
  const any = vals.some(v => v > 0);
  const lab = RADAR_ORD.map((si, i) => {
    const [x, y] = pt(i, R + 13);
    return `<text x="${x.toFixed(1)}" y="${(y + 4).toFixed(1)}" text-anchor="middle" class="rl">${STATS[si]}</text><text x="${x.toFixed(1)}" y="${(y + 15).toFixed(1)}" text-anchor="middle" class="rn">${esc(p.base[si] || '-')}</text>`;
  }).join('');
  return `<svg class="radar big" viewBox="0 0 180 172" role="img" aria-label="종족치 육각형"><polygon points="${ring(1)}" class="rg"/><polygon points="${ring(2 / 3)}" class="rg"/><polygon points="${ring(1 / 3)}" class="rg"/>${[
    0, 1, 2, 3, 4, 5
  ]
    .map(i => {
      const [x, y] = pt(i, R);
      return `<line x1="${cx}" y1="${cy}" x2="${x.toFixed(1)}" y2="${y.toFixed(1)}" class="rg"/>`;
    })
    .join('')}${any ? `<polygon points="${vals.map((v, i) => P2(pt(i, Math.max(2, v * R)))).join(' ')}" class="rv"/>` : ''}${lab}</svg>`;
}
function radar(p) {
  const R = 25,
    cx = 28,
    cy = 28;
  const pt = (i, r) => {
    const a = -Math.PI / 2 + (i * Math.PI) / 3;
    return (cx + r * Math.cos(a)).toFixed(1) + ',' + (cy + r * Math.sin(a)).toFixed(1);
  };
  const ring = f => [0, 1, 2, 3, 4, 5].map(i => pt(i, R * f)).join(' ');
  const vals = RADAR_ORD.map(i => Math.min(1, (+p.base[i] || 0) / 180));
  const any = vals.some(v => v > 0);
  const poly = vals.map((v, i) => pt(i, Math.max(1.5, v * R))).join(' ');
  return `<svg class="radar" viewBox="0 0 56 56" aria-hidden="true"><polygon points="${ring(1)}" class="rg"/><polygon points="${ring(0.5)}" class="rg"/>${[0, 1, 2, 3, 4, 5].map(i => `<line x1="${cx}" y1="${cy}" x2="${pt(i, R).replace(',', ' ').split(' ')[0]}" y2="${pt(i, R).split(',')[1]}" class="rg"/>`).join('')}${any ? `<polygon points="${poly}" class="rv"/>` : ''}</svg>`;
}
const genderGlyph = g =>
  g === '♂'
    ? '<span class="gen m" title="수컷">♂</span>'
    : g === '♀'
      ? '<span class="gen f" title="암컷">♀</span>'
      : g === '무성'
        ? '<span class="gen n" title="무성">⚲</span>'
        : '';
function miniGrades(p, t) {
  const eb = t ? effB(t, p) : p.base;
  return `<div class="minig">${STATS.map((s, i) => {
    const g = grade(eb[i]);
    const tip = t ? buTip(t, p, i) : '';
    return `<span class="mg" title="${s} ${esc(p.base[i] || '-')}${tip ? ' — ' + esc(tip) : ''}"><small>${s}</small><b style="background:${gcol(g)}">${esc(g)}</b></span>`;
  }).join('')}</div>`;
}
/* 목록 카드의 폼 보기: 폼 이름 버튼을 누르면 카드 요약(이름·타입·특성·종족치·그림)이 그 폼으로 보인다. 저장은 안 하고 한 번 더 누르거나 「원래」로 돌아온다 */
const FV = {};
function formView(p) {
  const k = FV[p.id];
  const f = k != null && (p.forms || [])[k];
  if (!f) return p;
  const has = v => v && v !== '-';
  return Object.assign({}, p, {
    name: f.name || p.name,
    t1: has(f.t1) ? f.t1 : p.t1,
    t2: has(f.t1) ? f.t2 || '-' : p.t2,
    t3: has(f.t1) ? '-' : p.t3,
    ability: f.ability || p.ability,
    base: (f.base || []).some(x => String(x) !== '') ? f.base : p.base,
    image: f.image || p.image,
    _form: f
  });
}
/* 11-07 망령: 한 장 요약의 폼 탭 — formView 와 같게 이름 · 타입 · 특성 · 종족치 · 그림을 바꾸고, 폼 포텐셜은 그 칸에 덮어쓴다 */
function formCardView(p, k) {
  const f = (p.forms || [])[k];
  if (!f) return p;
  const prev = FV[p.id];
  FV[p.id] = k;
  const v = formView(p);
  if (prev == null) delete FV[p.id];
  else FV[p.id] = prev;
  v.pots = (p.pots || []).slice();
  v.potEff = (p.potEff || []).slice();
  v.potKind = (p.potKind || []).slice();
  for (const x of f.pots || [])
    if (x && x.name) {
      const i = +x.slot || 0;
      v.pots[i] = x.name;
      v.potEff[i] = x.eff || '';
      v.potKind[i] = '';
    }
  {
    const mv = f.mvRep ? [] : (p.moves || []).map(m => Object.assign({}, m));
    for (const x of f.mvs || []) {
      if (!x || !x.to) continue;
      const i = x.from && !f.mvRep ? mv.findIndex(m => m && m.name === x.from) : -1;
      if (i >= 0) mv[i] = { name: x.to, half: !!mv[i].half };
      else mv.push({ name: x.to, half: false });
    }
    v.moves = mv;
  } /* 11-14 폼 기술 */
  {
    const ex = (f.exs || []).filter(x => x && x.name);
    if (ex.length || f.exRep) {
      const base = f.exRep ? [] : [...(p.exclX || [])];
      if (f.exRep) v.excl = { name: '', eff: '' };
      v.exclX = [...base, ...ex.map(x => ({ name: x.name, eff: x.eff || '' }))];
    }
  }
  /* 11-14 폼 전용 */ return v;
}
function pcdTabs(p, k) {
  const fs = p.forms || [];
  if (!fs.some(f => f)) return '';
  const b = (v, lab, tt, on) => `<button type="button" class="pcd-tab${on ? ' on' : ''}" data-pcfk="${v}" title="${esc(tt)}">${esc(lab)}</button>`;
  return `<div class="pcd-tabs">${b('', '원래 모습', '원래 모습 기준으로 보기 (편집은 여기서)', k == null)}${fs.map((f, i) => (f ? b(i, f.name || '폼 ' + (i + 1), (f.kind || '폼체인지') + ' 기준으로 보기' + (f.cond ? ' — ' + f.cond : ''), k === i) : '')).join('')}</div>`;
}
function formBtns(p, ti, pi) {
  const fs = (p.forms || []).filter(f => f);
  if (!fs.length) return '';
  const k = FV[p.id];
  return `<div class="fmbs">${(p.forms || []).map((f, i) => (f ? `<button type="button" class="fmb ${k === i ? 'on' : ''}" data-act="fview" data-i="${ti}" data-j="${pi}" data-k="${i}" title="${esc((f.kind || '폼체인지') + (k === i ? ' — 눌러서 원래 모습으로' : ' — 눌러서 이 폼으로 보기'))}">${esc(f.name || '폼 ' + (i + 1))}</button>` : '')).join('')}${k != null && (p.forms || [])[k] ? `<button type="button" class="fmb back" data-act="fview" data-i="${ti}" data-j="${pi}" data-k="-1" title="원래 모습으로">↩ 원래</button>` : ''}</div>`;
}
function pokeHTML(t, ti, p, pi) {
  if (!canSeeMon(t, p))
    return `<article class="pk privp" id="pk-${p.id}" data-si="${pi}"><div class="ph" style="cursor:default"><span class="pno"><small>No.</small>${String(pi + 1).padStart(3, '0')}</span><b class="pname" style="opacity:.7">🔒 숨긴 포켓몬</b><span class="small muted" style="margin-left:8px">주인과 GM 만 볼 수 있어요</span></div></article>`;
  const v = formView(p);
  const P = `T.${ti}.pokemon.${pi}`;
  const c = moveCap(t, p);
  const filled = p.moves.filter(m => m.name).length;
  const npot = p.pots.filter(x => x).length + exclAll(p).length;
  const tot = v.base.reduce((a, b) => a + (+b || 0), 0);
  const XL = exclAll(p);
  const abr = v.ability && idx.abil ? idx.abil.get(v.ability) : null;
  const abE = abr ? oneLn(abr[2]) : '';
  return `<article class="pk ${p.open ? 'open' : ''} ${p.partner ? 'ptnr' : ''} ${onBench(p) ? 'bench' : ''}" id="pk-${p.id}" data-si="${pi}" style="${pkVars(v)}">
 <div class="ph" data-tog="${P}" data-grab tabindex="0" role="button" data-kbd aria-expanded="${!!p.open}"><span class="pno"><small>No.</small>${String(pi + 1).padStart(3, '0')}</span>
  <div class="row pmain" style="min-width:0;gap:9px;flex-wrap:nowrap"><button type="button" class="pavb" data-act="pimgPick" data-i="${ti}" data-j="${pi}" title="포켓몬 이미지 넣기 (클릭 · 끌어다 놓기 · 붙여넣기)">${safeImg(v.image) ? `<img class="pav" src="${safeImg(v.image)}" alt="">` : '<span class="pav ph0" aria-hidden="true"></span>'}${v.partner ? '<i class="pstb" aria-hidden="true">★</i>' : ''}${awOf(t, p) ? `<i class="pawb ${awOf(t, p)}" title="미사그 대학 각성체 · GM 제작 · 통솔점 0">각성<b>${awOf(t, p) === 'c' ? '보조' : '대가'}</b></i>` : ''}</button><div style="min-width:0"><div class="pname">${v.partner ? '<span class="pstar" title="파트너">★</span>' : ''}<span class="pnm">${esc(p.nick || v.name || '(이름 없음)')}</span>${onBench(p) ? '<span class="pbench" title="대기(벤치) — 통솔점 · 【1/시】 · 기술점 셈에서 뺀다">대기</span>' : ''}${p.nick ? `<span class="pnk faint" title="종 이름" style="font-size:11px;font-weight:400;margin-left:5px;white-space:nowrap">${esc(v.name || '')}</span>` : ''}${genderGlyph(v.gender)}${formBtns(p, ti, pi)}</div><div class="pnrow"><span class="chips pntypes">${tchip(v.t1)}${tchip(v.t2)}${tchip(v.t3)}</span><span class="lvb">Lv.${lv(t, v)}</span></div><div class="psub pscs"><span class="psc psr">${esc(roleOf(v) || '역할 없음')}</span>${classOf(v) ? `<span class="psc psk">${esc(classOf(v))}</span>` : ''}${prideOf(p) ? `<span class="psc psp" title="프라이드 ${esc(prideOf(p))}${prideIsAuto(p) ? ' (자동)' : ''} · 통솔점 ${prideCost(t, p)}점"><i>프라이드</i><b>${esc(prideOf(p))}</b></span>` : ''}${pokeChecks(t, p).some(c => c.w) ? ' <span class="warn" title="기본·능력치 탭의 경고를 확인하세요">⚠</span>' : ''}</div></div></div>
  <div class="hide-s ptyab"><div class="pab"><span class="pabk">특성</span><b>${esc(v.ability || '특성 없음')}</b>${v.item ? `<span class="faint"> · ${esc(v.item)}</span>` : ''}</div>${abE ? `<div class="pabe" title="${esc(abE)}">${esc(abE)}</div>` : ''}</div>
  <div class="pexcl ${XL.length ? '' : 'none'} ${XL.length > 1 ? 'multi' : ''}">${XL.map(x => {
    const e = oneLn(x.eff);
    return `<div class="pxi"><div class="pxn"><span class="pxk">전용</span><b>${esc(x.name)}</b></div>${e ? `<div class="pxe" title="${esc(e)}">${esc(e)}</div>` : ''}</div>`;
  }).join('')}</div>
  <div class="hide-s pkstat">${radar(v)}<div style="min-width:0">${miniGrades(v, t)}<div class="psub" style="margin-top:3px">종족치 합 <b class="num">${tot || '-'}</b>${(() => {
    const pl = v._form ? null : planRange(v);
    if (!pl || !tot) return '';
    return `<span class="${pl.ok || ruleOff(t, 'pride') ? 'faint' : 'warn'}" title="계산 종족치 / 계단 기준"> · 계산 ${fmtN(pl.ct)}/${pl.v}</span>`;
  })()} · 기술 <span class="${c.cap != null && c.used > c.cap ? 'warn' : ''}">${capTxt(c, '-', '/')}</span> · 포텐셜 ${npot}</div></div></div>
  <div class="pact"><!-- 11-03 20:06 망령 「칸이 늘어나며 삭제가 … 로 가고 눌러도 안 보인다 · 두 줄로 해서 다 뜨게」: ⋯ 메뉴를 없애고 이력 · 삭제를 바로, 3개씩 두 줄 --><button class="btn sm ghost" data-act="pcard" data-i="${ti}" data-j="${pi}" title="이 포켓몬을 한 장으로 요약해서 본다 (PNG 저장)">한 장</button><button class="btn sm ghost" data-act="copy" data-i="${ti}" data-j="${pi}" title="복사용 텍스트 복사">복사</button><button class="btn sm ${p.priv ? 'pri' : 'ghost'}" data-act="privP" data-i="${ti}" data-j="${pi}" title="${p.priv ? '숨김 — 주인과 GM 만 이 포켓몬을 본다 (제작기 · 세션 노트 · 웹툴). 누르면 공개' : '다른 플레이어에게 이 포켓몬만 숨긴다 (서명 필요)'}">${p.priv ? '🔒 숨김' : '숨기기'}</button><button class="btn sm ghost" data-act="dupP" data-i="${ti}" data-j="${pi}">복제</button><button class="btn sm ghost" data-act="moveP" data-i="${ti}" data-j="${pi}" title="다른 트레이너에게 옮기거나 복사">옮기기</button>${SH.on ? `<button class="btn sm ghost" data-act="histP" data-i="${ti}" data-j="${pi}" title="공유 DB 에 남은 옛 판 보기 · 되돌리기">이력</button>` : ''}<button class="btn sm ghost pdel" data-act="delP" data-i="${ti}" data-j="${pi}" title="이 포켓몬 시트 삭제 (5초 안 실행 취소)">삭제</button></div></div>
 ${
   p.open
     ? `<div class="pbody"><nav class="ptabs">${[
         ['base', '기본<span class="wide-only">·능력치</span>', ''],
         ['moves', '기술', filled],
         ['pots', '포텐셜', npot],
         ['tune', '상세<span class="wide-only"> 조정</span>', tuneCount(p) || ''],
         ['text', '<span class="wide-only">복사용 </span>텍스트', '']
       ]
         .map(
           ([k, n, cn]) =>
             `<button data-ptab="${k}" data-i="${ti}" data-j="${pi}" class="${p.tab === k ? 'on' : ''}">${n}${cn !== '' ? `<span class="cnt">${cn}</span>` : ''}</button>`
         )
         .join('')}</nav>
 ${p.tab === 'moves' ? movesTab(t, ti, p, pi, P, c) : p.tab === 'pots' ? potsTab(t, ti, p, pi) : p.tab === 'tune' ? tuneTab(t, ti, p, pi) : p.tab === 'text' ? textTab(t, ti, p, pi, P) : baseTab(t, ti, p, pi, P)}</div>`
     : ''
 }</article>`;
}
function baseTab(t, ti, p, pi, P) {
  const ab = idx.abil.get(p.ability),
    it = itemRow(p),
    own = ownItem(p) && !idx.items.get(p.item);
  const types = S.db.types.map(x => x[0]);
  const tot = p.base.reduce((a, b) => a + (+b || 0), 0);
  const id = p.id;
  return `<div class="bgrid"><div style="display:flex;flex-direction:column;gap:10px;min-width:0">
  <div class="row" style="gap:12px;align-items:center;flex-wrap:nowrap"><div class="pimg" data-act="pimgPick" data-i="${ti}" data-j="${pi}" data-pdrop="${ti}.${pi}" role="button" tabindex="0" data-kbd title="클릭하거나 그림을 끌어다 놓거나 Ctrl+V로 붙여넣기">${safeImg(p.image) ? `<img src="${safeImg(p.image)}" alt="포켓몬 이미지">` : '<span class="small">이미지<br>클릭 · 끌어다 놓기 · 붙여넣기</span>'}</div>
   <div style="display:flex;flex-direction:column;gap:6px;min-width:0"><div class="row"><label class="btn sm" for="pimg-${id}" tabindex="0" role="button" data-kbd>이미지 삽입</label><input type="file" id="pimg-${id}" accept="image/*" data-pimg="${ti}.${pi}" hidden>${p.image ? `<button class="btn sm ghost" data-act="noPimg" data-i="${ti}" data-j="${pi}">제거</button>` : ''}</div>
   <button class="btn sm" data-act="pickOld" data-i="${ti}" data-j="${pi}" title="시트 「올드 타입 일람」의 타입·특성·알그룹·종족치를 채웁니다">올드 타입 일람에서 자동 입력</button></div></div>
  ${pStandsHtml(p, ti, pi)}
  <div class="fgrid">
   <label class="lbl" for="nm-${id}" style="grid-column:span 2">이름 <span class="faint">종</span>${inp(P + '.name', p.name, { id: 'nm-' + id })}</label>
   <label class="lbl" for="nk-${id}" style="grid-column:span 2">별명 <span class="faint" title="종 이름과 따로 붙이는 이름 — 노트 · 웹툴에도 이 이름으로 보여요">비우면 종 이름</span>${inp(P + '.nick', p.nick || '', { id: 'nk-' + id })}</label>
   <label class="lbl" for="dist-${id}">레벨 <span class="faint">기본 ${baseLevel(t.ranks['육성'])} + 분배${(() => {
     const L = lvBonusList(t, p);
     return L.length
       ? ` <span title="${esc(L.map(x => x.by + ' ' + (x.n > 0 ? '+' : '') + x.n).join(' · '))}">+ 【준비】 ${L.reduce((a, x) => a + x.n, 0)}</span>`
       : '';
   })()}</span><span class="row"><b class="num" style="font-size:15px">${lv(t, p)}</b>${inp(P + '.dist', p.dist, { id: 'dist-' + id, w: '56px', num: 1 })}</span></label>
   ${
     isMisag(t) && p.awaken === 'c' && misagSubPr(t)
       ? `<label class="lbl" for="pr-${id}">프라이드 <span class="faint">${p.subPrX ? '각성 (보조) · 예외로 직접 지정' : `각성 (보조) · 통솔 ${esc(strip(t.ranks['통솔']) || '-')} 로 정해짐`}</span><select data-p="${P}.subPrX" id="pr-${id}" title="각성 (보조) 프라이드는 통솔표(테이블·계산식 「미사그 대학」)대로 정해진다. 학장 같은 특수 NPC 만 예외 값을 골라 둔다"><option value="" ${p.subPrX ? '' : 'selected'}>${esc(misagSubPr(t))} (통솔대로)</option>${[
           [PR().oldLow.lab],
           ...PR().rows
         ]
           .filter(r => r && r[0])
           .map(
             r =>
               `<option value="${esc(r[0])}" ${String(p.subPrX || '').toUpperCase() === String(r[0]).toUpperCase() ? 'selected' : ''}>${esc(r[0])} (예외)</option>`
           )
           .join('')}</select></label>`
       : `<label class="lbl" for="pr-${id}">프라이드 <span class="faint">통솔점 ${prideCost(t, p)}</span><select data-p="${P}.pride" id="pr-${id}"><option value="" ${prideIsAuto(p) ? 'selected' : ''}>자동 (${esc(prideAuto(p))})</option>${[
           ...(isOld(p) || (isMisag(t) && p.awaken === 'c' && misagSubPr(t) === String(PR().oldLow.lab || 'D')) ? [[PR().oldLow.lab]] : []),
           ...PR().rows
         ]
           .filter(r => r && r[0])
           .map(r => `<option ${!prideIsAuto(p) && prKey(p.pride) === r[0] ? 'selected' : ''}>${esc(r[0])}</option>`)
           .join('')}</select></label>`
   }
   <label class="lbl" for="pt-${id}">파트너<span class="row small" style="min-height:30px"><input type="checkbox" id="pt-${id}" data-p="${P}.partner" ${p.partner ? 'checked' : ''}>통솔점 1 할인</span></label>
   <label class="lbl" for="bn-${id}" title="대기(벤치) — 통솔점 · 【1/시】 · PT 기술점 셈에서 뺀다 (기술 할인점 · 분배레벨 · 전용은 그대로)">대기<span class="row small" style="min-height:30px"><input type="checkbox" id="bn-${id}" data-p="${P}.bench" ${p.bench ? 'checked' : ''}>벤치 · 셈에서 뺌</span></label>
   ${isMisag(t) && !awOf(t, p) ? `<label class="lbl" for="sb-${id}" title="서브 — 2명이서 할 때 3+3 으로 합치는 1인 3체(각성체 2 + 서브 1)에 데려가는 PL 포켓몬. 트레이너마다 1체 · 프라이드는 각성체(보조) ${esc(subPrCap(t) || '')} 이하 · PT 기술점은 PL 4체 몫의 ${esc(MR().subRatio || MISAG_DEF.subRatio)} 까지">서브<span class="row small" style="min-height:30px"><input type="checkbox" id="sb-${id}" data-p="${P}.sub" ${p.sub ? 'checked' : ''}>3+3 때 데려감</span></label>` : ''}
   ${
     isMisag(t)
       ? `<label class="lbl" for="aw-${id}">각성체 <span class="faint">미사그 · GM 제작</span><select data-p="${P}.awaken" id="aw-${id}">${[
           ['', '아님 (PL)'],
           ['free', '각성 (대가) · 프라이드로 대가'],
           ['c', `각성 (보조) · 대가 없음 · 프라이드 ${misagSubPr(t) || '통솔대로'}`]
         ]
           .map(([v, l]) => `<option value="${v}" ${(p.awaken || '') === v ? 'selected' : ''}>${l}</option>`)
           .join('')}</select></label>`
       : ''
   }
   ${['t1', 't2', 't3', 'tera'].map((k, n) => `<label class="lbl" for="${k}-${id}"${n ? '' : ' style="grid-column-start:1"'}>${['타입1', '타입2', '타입3', '테라스탈'][n]}${sel(`${P}.${k}`, p[k], types, { id: k + '-' + id })}</label>`).join('')}
   <label class="lbl" for="e1-${id}" style="grid-column-start:1">알그룹1${sel(P + '.egg1', p.egg1 || '-', eggOpts(), { id: 'e1-' + id })}</label><label class="lbl" for="e2-${id}">알그룹2${sel(P + '.egg2', p.egg2 || '-', eggOpts(), { id: 'e2-' + id })}</label>
   <label class="lbl" for="ge-${id}">성별${sel(P + '.gender', p.gender, ['-', '♂', '♀', '무성'], { id: 'ge-' + id })}</label>
  </div>
  <div class="fgrid" style="grid-template-columns:minmax(0,1fr) minmax(0,1fr)">
   <div class="lbl">특성<div class="abrow"><button class="pickbtn" data-act="pickAbil" data-i="${ti}" data-j="${pi}">${p.ability ? `<b>${esc(p.ability)}</b><span class="sp"></span><span class="faint small">${nz(p.abSockOv) ? `소켓 ${esc(p.abSockOv)} <span title="직접 지정 — DB ${ab ? esc(ab[0]) : '없음'}">(직접)</span>` : ab ? '소켓 ' + esc(ab[0]) : 'DB에 없음'}</span>` : '<span class="ph0">특성 검색…</span>'}</button><label class="absock small muted" title="이 포켓몬만 특성 소켓을 직접 정해요 (비우면 특성 DB 값). 계산 종족치의 특성 TO 에 들어가요">소켓${inp(P + '.abSockOv', p.abSockOv, { w: '48px', num: 1, ph: ab ? String(ab[0]) : '-' })}</label></div></div>
   <div class="lbl">소지품<button class="pickbtn" data-act="pickItem" data-i="${ti}" data-j="${pi}">${p.item ? `<b>${esc(p.item)}</b>${ilockChip(p.item)}<span class="sp"></span><span class="faint small">${own ? '오리지널 · 시트에만' : it ? '소켓 ' + esc(it[5]) : 'DB에 없음'}</span>` : '<span class="ph0">소지품 검색…</span>'}</button></div>
  </div>
  ${ab ? `<div class="effbox"><b>${esc(p.ability)}</b> ${rich(ab[2])}<span class="fxrow">${fxAutoBtn(p, 'trait', p.ability, ti, pi)}</span></div>` : p.ability ? `<div class="effbox">DB에 없는 특성입니다. ${ME.gm ? `<button class="btn sm" data-act="newAbil" data-i="${ti}" data-j="${pi}">이 이름으로 오리지널 특성 만들기 (DB)</button>` : '「DB」 탭의 특성 DB 에서 만든다.'}<span class="fxrow">${fxAutoBtn(p, 'trait', p.ability, ti, pi)}</span></div>` : ''}
  ${it ? `<div class="effbox"><b>${esc(p.item)}</b> ${rich(it[4])} ${own ? `<span class="faint">· 오리지널 (이 포켓몬만 · DB 에 없음)${it[3] === 'O' ? ' · 소모품' : ''}</span> <button class="btn sm" data-act="ownItem" data-i="${ti}" data-j="${pi}">수정</button>` : it[6] && it[6] !== '-' ? `<span class="faint">· ${esc(it[6])}</span>` : ''}<span class="fxrow">${fxAutoBtn(p, 'item', p.item, ti, pi)}</span></div>` : p.item ? `<div class="effbox"><b>${esc(p.item)}</b> DB에 없는 소지품입니다. <button class="btn sm" data-act="ownItem" data-i="${ti}" data-j="${pi}">이 포켓몬만 쓰는 오리지널로 효과 적기</button><span class="fxrow">${fxAutoBtn(p, 'item', p.item, ti, pi)}</span></div>` : ''}
  ${itemSlotsHtml(p, ti, pi)}
  ${formsHtml(t, ti, p, pi, P)}
 </div>
 <div class="panel" style="min-width:0"><h3>능력치<span class="sp"></span><span class="small muted">종족치 합 <b class="num">${tot}</b>${(() => {
   const et = effB(t, p).reduce((a, b) => a + (+b || 0), 0);
   return et !== tot ? ` → 특성 · 포텐셜 반영 <b class="num">${et}</b>` : '';
 })()}${(() => {
   const pl = planRange(p);
   if (!pl) return '';
   return ` · 계산 <b class="num${pl.ok ? '' : ' warn'}">${fmtN(pl.ct)}</b> / ${esc(pl.lab)} ${pl.v}`;
 })()}</span></h3>
  <div class="stwrap"><div class="bigr">${radarBig(p)}</div><div class="stats">${STATS.map((s, i) => {
    const eb = effB(t, p)[i];
    const tip = buTip(t, p, i);
    const g = grade(eb);
    const v = +eb || 0;
    return `<div class="st s${i}${tip ? ' bup' : ''}"><span class="k">${s}</span>${inp(`${P}.base.${i}`, p.base[i], { num: 1, ph: '종족치' })}<div class="bar" data-drag="${P}.base.${i}" title="${esc(statTip(t, p, i))}"><i style="width:${Math.min(100, (v / 200) * 100)}%"></i>${statMarks(p, i)}<b class="knob" style="left:${Math.min(100, (v / 200) * 100)}%" aria-hidden="true"></b></div><span class="v">${stat(t, p, i)}</span><span class="gb" style="background:${gcol(g)}" ${tip ? `title="${esc(tip)}"` : ''}>${tip ? '▲' : ''}${esc(g)}</span></div>`;
  }).join('')}</div>${(() => {
    const U = baseUp(t, p).up;
    return U.length
      ? `<div class="bupnote small">${U.map(u => `<span><b>${STATS[u.i]}</b> ${u.from} ${esc(grade(u.from))} → <b class="num">${u.to}</b> ${esc(grade(u.to))} <span class="faint">${esc(u.by.join(' · '))}</span></span>`).join('')}</div>`
      : '';
  })()}</div>
  <div class="stfoot"><span>물리 내구 <b class="num">${(stat(t, p, 0) * stat(t, p, 2)).toLocaleString()}</b></span><span>특수 내구 <b class="num">${(stat(t, p, 0) * stat(t, p, 4)).toLocaleString()}</b></span><span class="faint">실수치 = 테이블(더블) 식 · Lv.${lv(t, p)}${p.ivs ? ' · 개체값 포함' : ''}</span>${isOld(p) ? '' : '<span class="stlg faint"><span><i class="lg-on"></i>줄무늬 = 계산에 더해지는 부분</span><span><i class="lg-dl"></i>쌍두 할인 (빼 줌)</span><span><i class="lg-off"></i>옅은 칸 = 그 구간이지만 지금은 0</span><span><i class="lg-fl"></i>하한</span><span>막대 위 숫자 = 그 칸 때문에 붙는 값</span><span>○ 손잡이를 끌어서 조절</span></span>'}</div>
  ${ivHtml(t, ti, p, pi)}
  ${calcPanel(t, p, P)}${(() => {
    const ck = pokeChecks(t, p).filter(c => c.w || c.k !== 'calc');
    return ck.length
      ? `<div class="checks">${ck.map(c => `<div class="${c.w ? 'warn' : 'muted'}">${c.w ? '⚠ ' : '· '}${esc(c.t)}</div>`).join('')}</div>`
      : '';
  })()}</div></div>`;
}
function movesTab(t, ti, p, pi, P, c) {
  const ms = p.moves;
  const over = c.cap != null && c.used > c.cap;
  return `<div class="capline"><b>${c.mode === 'count' ? '기술 개수' : '기술 소켓'}</b><span class="num ${over ? 'warn' : ''}">${capTxt(c, '종족치 입력 필요')}</span>${c.mode === 'count' ? `<span class="small muted">『${esc(classOf(p))}』 · PT 기술점 ${c.pt} 고정</span>` : ''}${c.cap ? `<div class="meter ${over ? 'over' : ''}"><i style="width:${Math.min(100, (c.used / c.cap) * 100)}%"></i></div>` : ''}
  <span class="small muted">상한 직접 지정</span>${inp(P + '.sockMax', p.sockMax, { w: '56px', num: 1, ph: String(c.auto ?? '') })}${(() => {
    const b = sockBonus(p);
    return `<span class="small muted" title="전용 · 포텐셜 · 특성 글의 「특성/기술 소켓 +0.5」를 자동으로 읽어요. 직접 적으면 그 값이 우선이에요${b.src.length ? '\n' + b.src.join('\n') : ''}">보너스 특성${inp(P + '.sockBonAb', p.sockBonAb, { w: '44px', num: 1, ph: String(b.manual ? '' : b.ab || 0) })} 기술${inp(P + '.sockBonMv', p.sockBonMv, { w: '44px', num: 1, ph: String(b.manual ? '' : b.mv || 0) })}${b.src.length ? ` <span class="faint">${esc(b.src.join(' · '))}</span>` : ''}</span>`;
  })()}<span class="sp"></span><button class="btn pri sm" data-act="pickMove" data-i="${ti}" data-j="${pi}">+ 기술 검색·추가</button></div>
 ${(() => {
   const W = pokeChecks(t, p).filter(c => c.k === 'mv');
   return W.length ? `<div class="checks">${W.map(c => `<div class="warn">⚠ ${esc(c.t)}</div>`).join('')}</div>` : '';
 })()}
 <div class="mlist" data-sort="moves" data-i="${ti}" data-j="${pi}">${
   ms
     .map((m, i) => {
       const r = idx.moves.get(m.name);
       const V = mvView(m, r);
       const OV = mvOvOn(m);
       const R = r || OV;
       const ovc = k =>
         OV && m.ov[k] != null && String(m.ov[k]).trim() !== ''
           ? ' style="color:var(--acc,#c58b00)" title="이 포켓몬만 (DB: ' +
             esc(r ? String(r[{ type: 5, cat: 6, pow: 7, acc: 8, prio: 11, range: 9 }[k]] ?? '') : '-') +
             ')"'
           : '';
       return `<div class="mv" data-si="${i}" data-grab style="border-left-color:${(R && tyCol(V.type)) || 'var(--line)'}"><div class="row mvt" style="gap:3px;flex-wrap:nowrap">${R ? tchip(V.type) + `<span class="mcat ${V.cat === '물리' ? 'phy' : V.cat === '특수' ? 'spe' : 'sta'}">${esc(V.cat || '')}</span>` : '<span class="kindb">DB 없음</span>'}</div><div class="mvn"><div class="nm"><span class="mvchip">${R ? tchip(V.type) : '<span class="kindb">DB 없음</span>'}</span>${esc(m.name)}${
         OV
           ? ` <span class="kindb" title="이 포켓몬만 덮어쓴 칸: ${esc(
               MV_OV_KEYS.filter(k => m.ov[k] != null && String(m.ov[k]).trim() !== '')
                 .map(
                   k =>
                     ({
                       type: '타입',
                       cat: '분류',
                       pow: '위력',
                       acc: '명중',
                       prio: '우선도',
                       range: '범위',
                       contact: '접촉',
                       eff: '효과',
                       auto: '구문'
                     })[k]
                 )
                 .join(' · ')
             )}">개별</span>`
           : ''
       }</div><div class="small muted rgwrap">${R ? rangeGrid(V.range) + esc(V.cat + ' · ' + V.range + (V.contact && V.contact !== '-' ? ' · 접촉 ' + V.contact : '')) : ''}</div></div>
  <div class="st2"${ovc('pow')}>${R ? esc(V.pow) : '-'}<small>위력</small></div><div class="st2"${ovc('acc')}>${R ? esc(V.acc) : '-'}<small>명중</small></div><div class="st2"${ovc('prio')}>${R ? esc(V.prio) : '-'}<small>우선도</small></div><div class="st2${isBigMv(t, p, m) ? ' warn' : ''}"${isBigMv(t, p, m) ? ` title="${esc(bigMvRule(t))}"` : ''}>${isBigMv(t, p, m) ? '⚠ ' : ''}${moveSock(p, m)}<small>소켓</small></div>
  <div class="ef">${R ? rich(V.eff) : ''}</div><div class="row mva" style="gap:2px;flex-wrap:nowrap"><label class="small row" title="「기술 할인점」 1점을 써서 이 기술의 소켓을 0.5 할인합니다 (올드 타입 계열은 교배기·유전기 습득용)" style="gap:2px"><input type="checkbox" data-p="${P}.moves.${i}.half" ${m.half ? 'checked' : ''}>할인</label><label class="small row" title="켜면 이 기술은 한 장 요약 · 오레마스 한 장 요약 · 남의 도감에 안 나온다 (시트 · 배틀에는 그대로)" style="gap:2px"><input type="checkbox" data-p="${P}.moves.${i}.hide" ${m.hide ? 'checked' : ''}>숨김</label>
  ${R ? `<button class="btn sm ghost" data-act="mvOv" data-i="${ti}" data-j="${pi}" data-k="${i}" title="DB 는 그대로 두고 이 포켓몬의 이 기술만 바꾼다 (위력 · 효과 · 구문 …)">이 포켓몬만</button>${ME.gm ? `<button class="btn sm ghost" data-act="mvEdit" data-name="${esc(m.name)}" title="GM — 기술 DB 줄을 고친다 (이 기술을 가진 모든 포켓몬이 같이 바뀐다)">DB 수정</button>` : ''}` : ''}<button class="btn sm ghost danger" data-act="mvDel" data-i="${ti}" data-j="${pi}" data-k="${i}" aria-label="삭제">✕</button></div></div>`;
     })
     .join('') || '<div class="empty">기술이 없습니다. 「기술 검색·추가」로 DB에서 찾거나 오리지널 기술을 만드세요.</div>'
 }</div>${mvExtHtml(t, ti, p, pi)}`;
}
/* 11-01 망령 「제작기에서 기술 추가할 때 기능 확장 설정이 없는 듯」: 포켓몬 기술 탭에도 「기능 확장」 — 이 포켓몬이 쓰는 것(who = 이 포켓몬)과 PT 전원 것을 같이 보이고, 여기서 더하면 who 가 이 포켓몬.
   값은 트레이너 t.ext 그대로(트레이너 「기능 확장」 칸과 같은 목록) — 기술 소켓에는 안 센다 */
function mvExtHtml(t, ti, p, pi) {
  const L = (t.ext || []).map((e, k) => [e, k]).filter(([e]) => !e.who || e.who === p.id);
  return `<div class="mksp mvext"><div class="row" style="gap:6px;align-items:baseline;flex-wrap:wrap"><b class="small">기능 확장</b><span class="small muted">트레이너가 주는 「기능 확장 : 기술」 — 소켓에 안 세고, 오레마스 배틀 기술 목록 맨 뒤에 붙는다 · 트레이너 「기능 확장」 칸과 같은 목록</span><span class="sp"></span><button type="button" class="btn sm" data-act="extAddP" data-i="${ti}" data-j="${pi}">+ 이 포켓몬 기능 확장</button></div>
 ${L.map(([e, k]) => extRow(t, ti, e, k)).join('') || '<p class="small faint" style="margin:4px 0 0">아직 없습니다 — 「+ 이 포켓몬 기능 확장」으로 기술 DB 에서 고른다 (예: 『항법술』 = 안개제거 · 【1/시】)</p>'}</div>`;
}
