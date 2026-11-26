/* ── 조각 11_tune.js — 상세 조정 탭 ── */
/* ---------- 상세 조정 탭 (10-22 망령): 이 포켓몬만의 상태 변화 사양 · 소지품 사양을 한곳에서 보고 고친다 ----------
   p.tune = {st:[{st:'아쿠아링',v:'1/6'}], item:'소지품 구문(js/fx/itemrule.js 꼴)', itemName:'그 구문을 쓴 소지품'}
   오레마스 import.js 가 st → 자동화 「상세 조정」의 「상태수정」 줄로, item → itemTune 으로 가져간다. 효과 글 · 「구문」 버튼으로 걸어 둔 것도 같이 보여 준다 */
const TUNE_ST = [
  ['아쿠아링', 'AquaRing', 1, 8, '회복'],
  ['뿌리박기', 'Ingrain', 1, 16, '회복'],
  ['환희의노래', 'Chant', 1, 16, '회복'],
  ['희망사항', 'Wish', 1, 2, '회복'],
  ['씨뿌리기', 'LeechSeed', 1, 8, '흡수'],
  ['독', 'Poison', 1, 8, '대미지'],
  ['화상', 'Burn', 1, 16, '대미지'],
  ['악몽', 'Nightmare', 1, 4, '대미지'],
  ['저주', 'Curse', 1, 4, '대미지'],
  ['조이기', 'Bind', 1, 8, '대미지']
];
const FRAC_RE = /^\s*(\d+)\s*\/\s*(\d+)\s*$/;
/* 11-03 저녁: 읽기만 할 때는 p.tune 을 만들지 않는다 (펼친 시트마다 문서가 바뀐 것으로 잡혀 열 때마다 다시 올라갔다). 고칠 곳은 tuneOf(p,true) */
function tuneOf(p, w) {
  let t = p.tune;
  if (!t || typeof t !== 'object') {
    if (!w) return { st: [], item: '', itemName: '', crit: {} };
    t = p.tune = {};
  }
  if (!Array.isArray(t.st)) t.st = [];
  t.st = t.st.filter(x => x && TUNE_ST.some(r => r[0] === x.st));
  t.item = String(t.item || '');
  t.itemName = String(t.itemName || '');
  if (!t.crit || typeof t.crit !== 'object' || Array.isArray(t.crit)) t.crit = {};
  return t;
}
function tuneDsl(p) {
  return tuneOf(p)
    .st.filter(x => FRAC_RE.test(x.v || '') && +String(x.v).split('/')[1] > 0)
    .map(x => `상태수정 ${x.st} ${String(x.v).replace(/\s+/g, '')}`)
    .join('\n');
}
function tuneCount(p) {
  const t = tuneOf(p);
  return t.st.length + (t.item.trim() ? 1 : 0) + (Object.keys(t.crit).length ? 1 : 0) + (p.dexFw != null && p.dexFw !== '' ? 1 : 0);
}
/* 10-23 망령: 포켓몬마다 급소 규칙 — 오레마스가 불러오면 공격 창이 자동으로 쓴다 (critRule) */
const CRIT_TBL = [
  ['', '기본 표 (6.25 → 12.5 → 25 → 50 → 100%)'],
  ['2', '5세대 (6.25 → 12.5 → 25 → 33.3 → 50%)'],
  ['1', '6세대 (6.25 → 12.5 → 50 → 100%)'],
  ['3', '7세대 이후 (4.17 → 12.5 → 50 → 100%)']
];
function tuneCritBox(T, D) {
  const c = T.crit;
  return `<section class="tbox"><div class="row"><b>급소 규칙</b><span class="small muted">이 포켓몬만 · 오레마스 공격 창이 자동으로 쓴다</span></div>
  <div class="tcrit"><label>급소 표 <select data-tunecr="tbl" ${D}>${CRIT_TBL.map(([v, l]) => `<option value="${v}" ${String(c.tbl || '') === v ? 'selected' : ''}>${l}</option>`).join('')}</select></label>
   <label>급소 랭크 + <input type="number" class="mono" data-tunecr="add" ${D} value="${esc(c.add || '')}" placeholder="0" style="width:56px"></label>
   <label>받을 때 급소 방호 <input type="number" class="mono" data-tunecr="guard" ${D} value="${esc(c.guard || '')}" placeholder="0" style="width:56px"></label>
   <label>급소 대미지 <select data-tunecr="dmg" ${D}>${[
     ['', '기본 ×1.5 (6세대 이후)'],
     ['2', '×2 (5세대까지)'],
     ['2.25', '×2.25'],
     ['2.5', '×2.5'],
     ['3', '×3']
   ]
     .map(([v, l]) => `<option value="${v}" ${String(c.dmg || '') === v ? 'selected' : ''}>${l}</option>`)
     .join('')}</select></label>
   <label class="row small"><input type="checkbox" data-tunecr="sure" ${D} ${c.sure ? 'checked' : ''}> 공격이 언제나 급소</label>
   <label class="row small"><input type="checkbox" data-tunecr="never" ${D} ${c.never ? 'checked' : ''}> 급소에 맞지 않는다</label></div>
  <p class="small faint" style="margin:6px 0 0">급소 랭크는 공격 창의 급소 단계에 더해지고, 방호는 이 포켓몬이 맞을 때 상대 급소 단계에서 빠진다. 비워 두면 룰 기본.</p></section>`;
}
/* 배틀 쪽 OM_FX.stMod 가 읽는 꼴로 시트를 옮겨 그대로 물어본다 (상세 조정 칸은 빼고: 글 · 구문에서 온 것만) */
function tuneMon(p) {
  const K = OM_FX;
  const auto = {};
  for (const k in p.auto || {}) {
    const v = String(p.auto[k] || '').trim();
    if (v) auto[FXK(k)] = { dsl: v, ops: K.parse(v).ops };
  }
  const ab = idx.abil.get(p.ability),
    it = itemRow(p);
  return {
    auto,
    pots: p.pots.map((n, i) => (n && n !== '-' ? { name: String(n).replace(/『|』/g, ''), eff: potEffOf(p, i) } : null)).filter(Boolean),
    excl: p.excl && p.excl.name ? { name: p.excl.name, eff: p.excl.eff || '' } : null,
    exclX: (p.exclX || []).filter(x => x && x.name),
    ability: p.ability || '',
    abilityEff: ab ? ab[2] : '',
    item: p.item || '',
    itemEff: it ? it[4] : ''
  };
}
function tuneItemBase(p) {
  const it = itemRow(p);
  const IR = window.OM_ITEMRULE;
  if (!it || !IR) return '';
  try {
    return IR.toText(IR.ruleOf(p.item, { eff: it[4], auto: it[7] || '' }));
  } catch (e) {
    return '';
  }
}
function tuneItemPrev(dsl) {
  const IR = window.OM_ITEMRULE;
  if (!IR || !dsl.trim()) return '<span class="faint">비어 있음 — 소지품 DB 의 구문(없으면 효과 글)을 그대로 쓴다</span>';
  const r = IR.parse(dsl);
  const tx = IR.toText(r.rule);
  return (
    (tx ? `<b>읽은 결과</b><pre class="tpre">${esc(tx)}</pre>` : '<span class="warn">읽은 규칙이 없다</span>') +
    (r.errs.length ? `<div class="warn">모르는 줄: ${esc(r.errs.join(' / '))}</div>` : '')
  );
}
/* 10-22 망령: 상세 조정에서 바로 구문을 걸 수 있게 — 이 포켓몬의 포텐셜 · 특성 · 소지품 목록 */
function tuneCands(p) {
  const C = [];
  const add = (kind, name, slot, lab) => {
    if (name && name !== '-' && !C.some(c => FXK(c.name) === FXK(name))) C.push({ kind, name, slot, lab });
  };
  add('pot', p.excl && p.excl.name, 'excl', '전용');
  (p.exclX || []).forEach((x, xi) => add('pot', x && x.name, 'x' + xi, '전용 ' + (xi + 2)));
  (p.pots || []).forEach((n, i) => add('pot', n, i, '#' + (i + 1)));
  add('trait', p.ability, null, '특성');
  add('item', p.item, null, '소지품');
  (p.items2 || []).forEach((x, xi) => add('item', x && x.item, null, '소지품 ' + (xi + 2)));
  return C;
}
function tuneTab(t, ti, p, pi) {
  const T = tuneOf(p);
  const ok = fxReady();
  const D = `data-i="${ti}" data-j="${pi}"`;
  const mon = ok ? tuneMon(p) : null;
  const rows = TUNE_ST.map(([ko, en, n, d, kind]) => {
    const tu = T.st.find(x => x.st === ko);
    let src = null;
    try {
      src = mon ? OM_FX.stMod(mon, en) : null;
    } catch (e) {}
    if (!tu && !src) return '';
    const fin = tu && FRAC_RE.test(tu.v) ? String(tu.v).replace(/\s+/g, '') : src ? `${src.n}/${src.d}` : `${n}/${d}`;
    return `<tr><td><b>${esc(ko)}</b> <span class="small muted">${kind}</span></td><td class="mono">${n}/${d}</td><td>${src ? `<span class="mono">${src.n}/${src.d}</span> <span class="small muted">『${esc(src.name)}』</span>` : '<span class="faint">—</span>'}</td>
   <td>${tu ? `<span class="row" style="gap:4px;flex-wrap:nowrap"><input class="mono" data-tunest="${esc(ko)}" ${D} value="${esc(tu.v)}" style="width:64px" inputmode="numeric"><button class="btn sm ghost danger" data-act="tuneDel" ${D} data-k="${esc(ko)}" aria-label="지우기">✕</button></span>` : '<span class="faint">—</span>'}</td><td class="mono"><b>${esc(fin)}</b></td></tr>`;
  }).join('');
  const left = TUNE_ST.filter(r => !T.st.some(x => x.st === r[0]));
  const it = itemRow(p);
  const base = ok ? tuneItemBase(p) : '';
  const stale = T.item.trim() && T.itemName && T.itemName !== p.item;
  const autos = Object.entries(p.auto || {}).filter(([k, v]) => String(v || '').trim());
  const td = tuneDsl(p);
  return `<div class="tune">
 <section class="tbox"><div class="row"><b>상태 변화 사양</b><span class="small muted">이 포켓몬만 · 배틀의 턴 종료 회복 · 대미지 계산에 쓰인다</span></div>
  ${ok ? '' : '<p class="small warn">자동화 구문 스크립트를 불러오는 중이라 효과 글에서 읽은 것은 아직 못 보여 준다</p>'}
  ${rows ? `<div class="tscroll"><table class="ttbl"><thead><tr><th>상태</th><th>기본</th><th>효과 글 · 구문</th><th>상세 조정</th><th>배틀</th></tr></thead><tbody>${rows}</tbody></table></div>` : '<p class="small faint" style="margin:6px 0">바뀐 상태 변화가 없다 — 모두 기본값</p>'}
  ${left.length ? `<div class="row" style="margin-top:6px;gap:6px"><select data-tuneadd="${p.id}">${left.map(([ko, en, n, d]) => `<option value="${esc(ko)}">${esc(ko)} (기본 ${n}/${d})</option>`).join('')}</select><input class="mono" data-tuneaddv="${p.id}" placeholder="1/6" style="width:64px" inputmode="numeric"><button class="btn pri sm" data-act="tuneAdd" ${D}>+ 추가</button></div>` : ''}
  <p class="small faint" style="margin:6px 0 0">효과 글에 「아쿠아링」에 의한 회복량을 강화(1/8 → 1/6) 처럼 적어 두거나 「구문」에 상태수정 아쿠아링 1/6 을 써도 여기 잡힌다. 상세 조정 칸이 있으면 그것을 먼저 쓴다.</p></section>
 <section class="tbox"><div class="row"><b>소지품 사양</b>${p.item ? `<span class="kindb">${esc(p.item)}</span>` : ''}<span class="small muted">이 포켓몬이 들었을 때만</span></div>
  ${
    !p.item
      ? `<div class="row" style="margin:6px 0;gap:6px"><span class="small faint">소지품이 없다</span><button class="btn pri sm" data-act="pickItem" ${D}>+ 소지품 고르기</button></div>`
      : `
  ${it ? `<div class="small" style="margin:6px 0">${rich(it[4])}</div>` : ''}
  ${base ? `<details class="small"><summary>소지품 DB 구문 ${it && String(it[7] || '').trim() ? '' : '(효과 글에서 읽은 것)'}</summary><pre class="tpre">${esc(base)}</pre></details>` : ''}
  ${stale ? `<p class="small warn">『${esc(T.itemName)}』용으로 적은 구문이다 — 지금 소지품과 달라 배틀에서 쓰이지 않는다</p>` : ''}
  <textarea data-tuneitem="${p.id}" ${D} rows="3" placeholder="비우면 소지품 DB 구문 그대로 · 예) 턴 종료: 회복 1/8" style="width:100%;font-family:var(--mono,monospace);font-size:12.5px;margin-top:6px">${esc(T.item)}</textarea>
  <div class="small" id="tunePrev-${p.id}" style="margin-top:4px">${ok ? tuneItemPrev(T.item) : ''}</div>
  <div class="row" style="margin-top:6px;gap:6px">${base ? `<button class="btn sm" data-act="tuneItemCopy" ${D}>DB 구문 가져와 고치기</button>` : ''}${T.item.trim() ? `<button class="btn sm ghost" data-act="tuneItemClr" ${D}>비우기</button>` : ''}<span class="sp"></span><span class="small muted">구문 꼴은 테이블 탭 · 소지품 DB 「구문」과 같다</span></div>`
  }</section>
 ${tuneCritBox(T, D)}
 ${tuneDexBox(t, p, D)}
 <section class="tbox"><div class="row"><b>걸어 둔 자동화 구문</b><span class="small muted">포텐셜 · 특성 · 소지품 칸의 「구문」 버튼에서 고친다</span></div>
  ${autos.length || td ? `<div class="tauto">${autos.map(([k, v]) => `<div><span class="kindb">${esc(k)}</span> <button class="btn sm ghost" data-act="tuneFxK" ${D} data-name="${esc(k)}">고치기</button><pre class="tpre">${esc(String(v).trim())}</pre></div>`).join('')}${td ? `<div><span class="kindb">상세 조정</span><pre class="tpre">${esc(td)}</pre></div>` : ''}</div>` : '<p class="small faint" style="margin:6px 0">없다 (같은 이름의 레디메이드가 있으면 그것이 돈다)</p>'}
  ${(() => {
    const C = tuneCands(p);
    return C.length
      ? `<div class="row" style="margin-top:6px;gap:6px"><select data-tunefx="${p.id}">${C.map((c, ci) => `<option value="${ci}">${esc(c.lab)} · ${esc(c.name)}${String((p.auto || {})[FXK(c.name)] || '').trim() ? ' (구문 있음)' : ((fxRm(c.kind, c.name) || {}).ops || []).length ? ' (레디메이드)' : ''}</option>`).join('')}</select><button class="btn pri sm" data-act="tuneFx" ${D}>+ 구문 쓰기</button></div>`
      : '<p class="small faint" style="margin:6px 0 0">포텐셜 · 특성 · 소지품을 먼저 넣으면 여기서 구문을 걸 수 있다</p>';
  })()}</section>
 </div>`;
}
/* 10-22 망령: 포텐셜 탭을 웹툴(오레마스 시트) 카드처럼 — 슬롯 번호 · 분류 꼬리표 · 이름 · 효과 전문 (「」【】 강조, ① ② 줄 나눔) */
const POT_HUE = {
  역할: '#e6b422',
  분류: '#8d96a8',
  주인: '#4fbf73',
  종족: '#4fbf73',
  속성: '#4aa3ff',
  속별: '#4aa3ff',
  유대: '#ff8ab4',
  선: '#38c6b4',
  회피: '#7aa3ee',
  내성: '#9b8cff',
  전술: '#ff8a5c',
  특권: '#b07cff',
  성격: '#ff8a5c',
  기술: '#ff5c8a',
  전용: '#ffd84a',
  '4식': '#f0a24a',
  '5식': '#f0a24a',
  '6식': '#f0a24a',
  '5계': '#5fb0ff',
  '6령': '#e06c75',
  '8령': '#e06c75'
};
function potKindP(k) {
  const m = String(k || '')
    .trim()
    .match(/^(\d+(?:\.\d+)*)\.\s*(.+)$/);
  return m ? { no: m[1], lab: m[2].trim() } : { no: '', lab: String(k || '').trim() };
}
function potFmtM(t) {
  let h = esc(brN(t || '')).replace(/\\n/g, '\n');
  h = h
    .replace(/【((?:[^【】]|【[^【】]*】)*)】/g, '<b class="ptbk">【$1】</b>')
    .replace(/「([^」]*)」/g, '<b class="ptqt">「$1」</b>')
    .replace(/『([^』]*)』/g, '<b class="ptqt">『$1』</b>');
  const L = h
    .split('\n')
    .map(x => x.trim())
    .filter(Boolean);
  if (L.length < 2 && !/^[①-⑳]/.test(L[0] || '')) return h;
  return L.map(l => {
    const m = l.match(/^([①-⑳]|\d+[.)])\s*(.*)$/);
    return m ? `<div class="pkl"><i>${m[1]}</i><span>${m[2]}</span></div>` : `<div class="pkl"><span>${l}</span></div>`;
  }).join('');
}
function potCardM(o) {
  const k = potKindP(o.kind);
  const hue = o.ex ? (o.ty && tyCol(o.ty)) || POT_HUE.전용 : POT_HUE[k.lab] || '#3fc7c0';
  return `<div class="pot potc2${o.ex ? ' excl' : ''}${o.vac ? ' vac' : ''}" style="--ph:${hue}" tabindex="0" role="button" data-kbd data-act="editPot" ${o.D} data-k="${o.k}"${o.si != null ? ` data-si="${o.si}" data-grab` : ''}><div class="poth2"><span class="potk2"><em>${esc(o.slot)}</em>${k.lab ? `<span>${esc(k.lab)}</span>` : o.vac || o.ex ? '' : '<span class="nok">종류 미지정</span>'}</span><b class="pn">${esc(o.name)}</b>${o.custom ? '<span class="kindb">직접 작성</span>' : ''}${o.ban ? '<span class="warn small">금지어</span>' : ''}<span class="sp"></span><span class="row pbtns" style="gap:2px;flex-wrap:nowrap">${o.btns || ''}</span></div>${o.eff ? `<div class="pe2">${potFmtM(o.eff)}</div>` : ''}</div>`;
}
/* 11-16 PL 제보 「전용 포텐셜을 야생 포텐셜로 뜨게」: 던전 야생 트레이너(t.wild — 제작기 「던전 생성」 탭이 만든 것)는 전용 칸 이름을 「야생 포텐셜」로 보인다 (데이터는 전용 excl · exclX 그대로) */
const exLab = t => (t && t.wild ? '야생 포텐셜' : '전용 포텐셜'),
  exS = t => (t && t.wild ? '야생' : '전용');
function potsTab(t, ti, p, pi) {
  const exE = p.excl.eff;
  const D = `data-i="${ti}" data-j="${pi}"`;
  const XS = exS(t),
    XL = exLab(t);
  return `<div class="potl potl2" data-sort="pots" ${D}>${potCardM({ ex: 1, ty: p.excl.ty, vac: !p.excl.name, D, k: 'excl', slot: XS, kind: '', name: p.excl.name || XL + ' · 눌러서 작성', eff: exE, ban: banHits(exE).length, btns: fxAutoBtn(p, 'pot', p.excl.name, ti, pi, 'excl') })}
 ${(p.exclX || []).map((x, xi) => potCardM({ ex: 1, ty: x.ty, vac: !x.name, D, k: 'x' + xi, slot: XS + ' ' + (xi + 2), kind: '', name: x.name || '추가 ' + XL + ' · 눌러서 작성', eff: x.eff, ban: banHits(x.eff).length, btns: fxAutoBtn(p, 'pot', x.name, ti, pi, 'x' + xi) + `<button class="btn sm ghost danger" data-act="potDel" ${D} data-k="x${xi}" aria-label="${XS} 칸 지우기">✕</button>` })).join('')}
 ${p.pots
   .map((n, i) => {
     if (!n) return '';
     const r = potRow(n);
     const e = potEffOf(p, i);
     return potCardM({
       D,
       k: i,
       si: i,
       slot: '#' + (i + 1),
       kind: potKindOf(p, i),
       name: n,
       eff: e,
       custom: !r || p.potEff[i],
       ban: banHits(e).length,
       btns:
         fxAutoBtn(p, 'pot', n, ti, pi, i) + `<button class="btn sm ghost danger" data-act="potDel" ${D} data-k="${i}" aria-label="비우기">✕</button>`
     });
   })
   .join('')}</div>
 <div class="row" style="margin-top:8px">${p.pots.some(n => !n) ? `<button class="btn pri sm" data-act="addPot" data-i="${ti}" data-j="${pi}">+ 포텐셜 추가</button>` : ''}<button class="btn sm" data-act="addEx" data-i="${ti}" data-j="${pi}" title="${t.wild ? '이 야생 포켓몬에 야생 포텐셜 칸을 하나 더 만듭니다 (『계제』 · 야생 포텐셜)' : '이 포켓몬에 전용 포텐셜 칸을 하나 더 만듭니다 (능력 AAA: 1체에게 2개까지)'}">+ ${XS} 칸</button><button class="btn sm" data-act="stpl" data-i="${ti}" data-j="${pi}" title="테이블·계산식 탭의 포켓몬 시트 템플릿(트레이너 자질 반영)으로 빠진 포텐셜 슬롯을 채웁니다">시트 템플릿 적용</button><span class="small muted">트레이너 자질에 맞는 기본 포텐셜 중 빠진 것만 빈 슬롯에 넣습니다</span></div>
 <p class="small faint" style="margin:8px 0 0">오른쪽 「구문」 버튼은 오레마스 배틀 자동화입니다 — <b>구문 ✓</b> 이 포켓몬만의 구문 있음 · <b>자동</b> 같은 이름의 레디메이드가 자동으로 돎 · <b>구문</b> 자동화 없음(써 넣을 수 있음). 줄을 누르면 편집 창이 열리고, 줄을 잡고 위아래로 끌면 순서를 바꿀 수 있습니다(휴대폰은 길게 누른 뒤 끌기). DB에서 고르거나, 태그 버튼을 써서 직접 작성할 수 있습니다. 복사용 텍스트에는 채워진 슬롯만 위에서부터 순서대로 들어갑니다.</p>
 ${fieldsHtml(p, `data-i="${ti}" data-j="${pi}"`, 'p')}`;
}
function textTab(t, ti, p, pi, P) {
  const s = copyText(t, p);
  return `<div class="row" style="margin-bottom:8px"><b>복사용 텍스트</b><span class="small muted">시트 「복사용 텍스트」 칸과 같은 규칙</span><span class="sp"></span><button class="btn pri sm" data-act="copy" data-i="${ti}" data-j="${pi}">복사</button></div>
 <div class="copybox">${esc(s)}</div><label class="lbl" for="memo-${p.id}" style="margin-top:10px">메모<textarea id="memo-${p.id}" data-p="${P}.memo" rows="3">${esc(p.memo)}</textarea></label>`;
}

