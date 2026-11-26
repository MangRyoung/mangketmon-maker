/* ── 조각 08_pot_editor.js — 포텐셜 편집기 ── */
/* ---------- 포텐셜 편집기 ---------- */
/* 11-10 망령 「공유는 확인을 위해 미리보기 아래쪽에 무엇이랑 공유되고 있는지」: 웹툴(battle_ui shareTag · shareWhy)과 같은 규칙 — 포켓몬 기준.
   괄호 없는 【공유】끼리 · 【공유 (『X』)】 = 이름에 X 가 들어간 효과 (『전용』 = 전용 포텐셜 또는 이름에 전용 · 한 글자는 그 글자로 끝나는 이름) */
function shareTagOf(e) {
  const m = String(e || '').match(/【\s*공유([^】]*)】/);
  if (!m) return null;
  const g = [...m[1].matchAll(/『([^』)]+)/g)].map(x => x[1].trim()).filter(Boolean);
  return { p: !g.length, g };
}
function shareHas(n, x, g) {
  n = String(n || '');
  if (g === '전용') return !!x || n.includes('전용');
  if (g.length === 1) return new RegExp(g.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '(?=$|\\s|[』,·)])').test(n);
  return n.includes(g);
}
function shareWithHTML(p, slot, name, eff, isEx) {
  const nm = String(name || '')
    .replace(/[『』]/g, '')
    .trim();
  const me = shareTagOf(eff);
  const O = [];
  (p.pots || []).forEach((n, i) => {
    if (!n || i === slot) return;
    O.push({
      n: String(n)
        .replace(/[『』]/g, '')
        .trim(),
      e: potEffOf(p, i),
      x: false
    });
  });
  const ex = [p.excl, ...(p.exclX || [])];
  ex.forEach((q, i) => {
    if (!q || !q.name) return;
    if (isEx && ((slot === 'excl' && i === 0) || (slot && typeof slot === 'object' && slot.ex === i - 1))) return;
    O.push({
      n: String(q.name)
        .replace(/[『』]/g, '')
        .trim(),
      e: q.eff,
      x: true
    });
  });
  const hit = [];
  for (const o of O) {
    if (!o.n || o.n === nm) continue;
    const t = shareTagOf(o.e);
    let why = '';
    if (me && me.p && t && t.p) why = '둘 다 【공유】';
    else {
      const g1 = me ? me.g.find(g => shareHas(o.n, o.x, g)) : null;
      if (g1) why = g1 === '전용' && o.x ? '전용 포텐셜' : `이름에 『${g1}』`;
      else {
        const g2 = t ? t.g.find(g => shareHas(nm, isEx, g)) : null;
        if (g2) why = `저쪽이 【공유 (『${g2}』)】`;
      }
    }
    if (why) hit.push({ n: o.n, why });
  }
  if (!me && !hit.length) return '';
  const head = me ? (me.p ? '【공유】' : `【공유 (${me.g.map(g => '『' + g + '』').join(', ')})】`) : '다른 효과의 【공유】';
  return `<div class="small" style="margin-top:8px;padding-top:6px;border-top:1px dashed var(--line,rgba(127,127,127,.35))"><b>${esc(head)}</b> — 같은 턴에 같이 못 쓰는 것 (이 포켓몬): ${hit.length ? hit.map(h => `『${esc(h.n)}』 <span class="faint">(${esc(h.why)})</span>`).join(' · ') : '<span class="faint">이 포켓몬에는 없음</span>'}</div>`;
}
function openPotEditor(t, p, slot) {
  /* slot: 0..19 or 'excl' or {ex:i} (추가 전용 칸) or {unique:i} */
  const xi = slot && typeof slot === 'object' && slot.ex != null ? slot.ex : null,
    exO = slot === 'excl' ? p.excl : xi != null ? p.exclX[xi] : null;
  const isEx = !!exO,
    isU = !isEx && typeof slot === 'object';
  const cur = isEx
    ? { kind: exS(t), name: exO.name, eff: exO.eff }
    : isU
      ? { kind: '고유', name: t.unique[slot.unique].name, eff: t.unique[slot.unique].eff }
      : { kind: potKindOf(p, slot), name: p.pots[slot], eff: potEffOf(p, slot) };
  const st = { q: '', lim: 120, kind: '', mine: false, nameOnly: false, f: {}, pmin: '', pmax: '' };
  const label = isEx ? (xi != null ? `${exLab(t)} ${xi + 2}` : exLab(t)) : isU ? '고유 포텐셜' : `포텐셜 #${slot + 1}`;
  const l = openModal(
    `<div class="mhead"><h2>포텐셜 편집 · ${esc(label)}</h2>${isEx || isU ? '' : `<label class="small" style="display:inline-flex;align-items:center;gap:4px;margin-left:8px" title="이 포텐셜을 다른 번호 칸으로 옮긴다 — 그 칸에 있던 것과 자리를 바꾼다 (폼체인지의 포텐셜 교체 칸도 따라간다)">칸 옮기기<select id="pe-slot">${p.pots.map((n, i) => `<option value="${i}" ${i === slot ? 'selected' : ''}>#${i + 1}${n ? ' · ' + esc(n) : ''}</option>`).join('')}</select></label>`}<span class="sp"></span><button class="btn ghost" data-x>닫기</button></div>
 <div class="mbody"><div class="segtog" role="tablist"><button type="button" data-seg="pick" role="tab" class="${cur.name ? '' : 'on'}">DB에서 고르기</button><button type="button" data-seg="edit" role="tab" class="${cur.name ? 'on' : ''}">직접 작성 · 수정</button></div>
 <div class="split" data-seg="${cur.name ? 'edit' : 'pick'}"><div class="seg-pick" style="display:flex;flex-direction:column;gap:8px;min-width:0"><b class="small wide-only">DB에서 고르기</b>${pickerShell('pots', st)}</div>
 <div class="seg-edit" style="display:flex;flex-direction:column;gap:8px;min-width:0"><b class="small wide-only">직접 작성 · 수정</b>
  <datalist id="L-kinds2">${[...new Set(S.db.pots.map(r => r[0]))].map(k => `<option value="${esc(k)}">`).join('')}</datalist>
  <div class="fgrid" style="grid-template-columns:minmax(0,1fr) minmax(0,1.4fr)">${isEx || isU ? `<span class="lbl">종류<b style="color:var(--ink);font-size:13px">${isEx ? exS(t) : '고유'}</b></span>` : `<label class="lbl" for="pe-kind">종류(순서)<input id="pe-kind" list="L-kinds2" value="${esc(cur.kind)}" placeholder="예: 04.1. 종족"></label>`}
  <label class="lbl" for="pe-name">이름<input id="pe-name" value="${esc(cur.name)}"></label></div>
  ${
    isEx || isU
      ? (() => {
          /* 11-04 망령 「고유랑 전용은 횟수제인지 무제한인지 따로 지정」: 효과 글 맨 앞 【N/시】 태그를 고르는 칸 — 상시 = 태그 없음 (심도 검사 · 【1/시】 셈 · 웹툴이 같은 태그를 읽는다) */
          const m = String(cur.eff || '').match(/【\s*(\d+|N)\s*\/\s*시\s*】/);
          const v = m ? m[1] : '';
          return `<label class="lbl" for="pe-uses">횟수 <span class="small muted" style="font-weight:400">효과 글 맨 앞 【N/시】 태그로 들어간다</span><select id="pe-uses">${[
            ['', '상시 (무제한 · 태그 없음)'],
            ...['1', '2', '3', '4', '5', '6'].map(k => [k, k + '/시'])
          ]
            .concat(v && !['1', '2', '3', '4', '5', '6'].includes(v) ? [[v, v + '/시']] : [])
            .map(([k, n]) => `<option value="${k}" ${k === v ? 'selected' : ''}>${n}</option>`)
            .join('')}</select></label>`;
        })()
      : ''
  }
  ${
    isEx
      ? `<div class="lbl">색 <span class="small muted" style="font-weight:400">타입 색으로 꾸미기 · 한 장 요약 · 포텐셜 탭에 쓰인다</span></div><input type="hidden" id="pe-ty" value="${esc(exO.ty || '')}"><div class="petys" role="radiogroup" aria-label="전용 포텐셜 색">${[
          ''
        ]
          .concat(S.db.types.map(x => x[0]).filter(x => x && x !== '-'))
          .map(x => {
            const c = x ? tyCol(x) : '';
            const on = x === (exO.ty || '');
            return `<button type="button" class="pety${on ? ' on' : ''}" data-pety="${esc(x)}" role="radio" aria-checked="${on}"${c ? ` style="--pc:${c};--pf:${fgOn(c)}"` : ''}>${x ? esc(x) : '기본'}</button>`;
          })
          .join('')}</div>`
      : ''
  }
  <label class="lbl" for="pe-line">컷인 대사 <span class="small muted" style="font-weight:400">오레마스에서 이 포텐셜 컷인이 뜰 때 큰 글씨 아래에 나오는 한 줄 · 비우면 없음</span><input id="pe-line" maxlength="80" value="${esc(
    isU
      ? String((t.unique[slot.unique] || {}).line || '')
      : String(
          ((p && p.cutLine) || {})[
            String(cur.name || '')
              .replace(/『|』/g, '')
              .trim()
          ] || ''
        )
  )}" placeholder="예: 하늘 끝까지 태워 주마!"></label>
  <label class="lbl" for="pe-eff">효과${tagbarHTML()}<textarea id="pe-eff" rows="6">${esc(brN(cur.eff))}</textarea></label>
  <div class="preview" data-prev></div><div class="small" data-ban></div>
  ${window.MKM_POTLINT ? `<details class="wordbox" data-wordbox><summary>✍ 워딩 도우미 <span class="small muted" data-wcount></span></summary><div data-wbody></div></details>` : ''}
  ${isEx || isU || !ME.gm ? '' : `<label class="row small" title="GM 만"><input type="checkbox" id="pe-db">포텐셜 DB에도 저장 (같은 이름이 있으면 덮어씀 · GM)</label>`}
  ${
    window.OM_FX
      ? `<details class="autobox" ${(isU ? String((t.unique[slot.unique] || {}).auto || '') : autoDsl(p, cur.name)) ? 'open' : ''}><summary>⚙ 자동화 구문 <span class="small muted" data-autohint></span></summary>
   <div class="small muted" style="margin:4px 0">오레마스(배틀 웹툴)에서 이 포텐셜을 쓸 때 자동으로 처리할 내용. 같은 이름의 레디메이드가 있으면 비워 둬도 그것이 돈다. 한 줄에 명령 하나 — 예: <code>랭크 공격+1 임시</code> · <code>위력 ×1.3 타입:불꽃 물리</code> · <code>상태확률 화상 30% 상대1체</code></div>
   <pre class="small" data-autorm style="white-space:pre-wrap;background:var(--bg2,#f4f4f6);padding:6px;border-radius:6px;margin:0 0 6px"></pre>
   <textarea id="pe-auto" rows="4" style="width:100%;font-family:var(--mono,monospace);font-size:12.5px" placeholder="(비우면 레디메이드 자동)">${esc(isU ? String((t.unique[slot.unique] || {}).auto || '') : autoDsl(p, cur.name))}</textarea>
   <div class="small" data-autoprev style="white-space:pre-wrap;margin-top:4px"></div>
   <div data-autogen></div>
   <details><summary class="small">구문 도움말</summary><pre class="small" style="white-space:pre-wrap">${esc(AUTO_HELP)}</pre></details></details>`
      : ''
  }</div></div></div>
 <div class="mfoot"><button class="btn danger" data-clear>슬롯 비우기</button>${isU || PR_HIDDEN ? '' : '<button class="btn" data-rec title="이 포켓몬의 타입·기술·종족치·역할에서 계통별 포텐셜 안을 짜고 수지 검사">✨ 추천</button>'}${isU ? '' : '<button class="btn" data-build title="트리거·조건·효과를 골라 새 포텐셜 문장 만들기">🛠 제작</button>'}<span class="sp"></span><button class="btn" data-x>취소</button><button class="btn pri" data-apply>적용</button></div>`,
    { wide: true }
  );
  const ta = $('#pe-eff', l);
  bindTagbar(l, () => ta);
  {
    const us = $('#pe-uses', l);
    if (us) {
      const setUses = k => {
        let t = String(ta.value || '').replace(/【\s*(\d+|N)\s*\/\s*시\s*】/g, '');
        t = t.replace(/^\s+/, '');
        if (k) {
          t = /^【/.test(t) ? `【${k}/시】` + t : `【${k}/시】/ ` + t.replace(/^\/\s*/, '');
        } else t = t.replace(/^\/\s*/, '');
        ta.value = t;
        ta.dispatchEvent(new Event('input', { bubbles: true }));
      };
      us.onchange = () => setUses(us.value);
      ta.addEventListener('input', () => {
        const m = String(ta.value || '').match(/【\s*(\d+|N)\s*\/\s*시\s*】/);
        const v = m ? m[1] : '';
        if (us.value !== v) {
          if (![...us.options].some(o => o.value === v)) us.add(new Option(v + '/시', v));
          us.value = v;
        }
      });
    }
  }
  const autoUpd = () => {
    const K = window.OM_FX;
    if (!K) return;
    const nm = $('#pe-name', l).value.trim().replace(/『|』/g, '');
    const base = nm ? K.rm(nm) : null;
    const rmEl = $('[data-autorm]', l),
      hint = $('[data-autohint]', l),
      pv = $('[data-autoprev]', l),
      ta2 = $('#pe-auto', l);
    if (!ta2) return;
    rmEl.textContent =
      base && base.ops && base.ops.length
        ? '레디메이드 자동: ' + K.unparse(base.ops).join(' / ') + (base.manual ? ' (자동화 미지원 — 손으로)' : '')
        : '같은 이름의 레디메이드 없음';
    const r = K.parse(ta2.value);
    pv.innerHTML =
      (r.ops.length ? '미리보기: ' + esc(K.unparse(r.ops).join(' / ')) : '') +
      (r.errs.length ? ` <span class="warn">모르는 줄: ${esc(r.errs.join(' / '))}</span>` : '');
    hint.textContent = r.ops.length ? '구문 있음' : base && base.ops && base.ops.length && !base.manual ? '레디메이드 자동' : '없음';
  };
  autoUpd();
  l.addEventListener('input', e => {
    if (e.target.id === 'pe-auto' || e.target.id === 'pe-name') autoUpd();
  });
  /* 11-14 제보 「포텐셜 앞 숫자를 편집할 수 있는 기능이 없다」: 칸 옮기기 — 고른 번호 칸과 자리를 바꾼다 (폼의 포텐셜 교체 칸 번호도 같이) */
  {
    const ss = $('#pe-slot', l);
    if (ss)
      ss.addEventListener('change', () => {
        const a = +slot,
          b = +ss.value;
        if (a === b || !(b >= 0 && b < p.pots.length)) return;
        for (const k of ['pots', 'potEff', 'potKind']) {
          const v = p[k][a];
          p[k][a] = p[k][b];
          p[k][b] = v;
        }
        for (const f of p.forms || [])
          for (const x of (f && f.pots) || []) {
            if (+x.slot === a) x.slot = b;
            else if (+x.slot === b) x.slot = a;
          }
        save();
        refreshTrainer(t);
        closeModal();
        toast(`#${a + 1} ↔ #${b + 1} 자리를 바꿨습니다`);
      });
  }
  {
    const gh = $('[data-autogen]', l),
      ta3 = $('#pe-auto', l);
    if (gh && ta3 && window.OM_FX_UI && OM_FX_UI.mountGen) OM_FX_UI.mountGen(gh, ta3, { toast });
  } /* 10-23 망령: 고유 포함 — 편집 창에서 바로 생성기 */
  const fill = o => {
    $('#pe-name', l).value = o.name || '';
    ta.value = o.eff || '';
    const k = $('#pe-kind', l);
    if (k && o.kind) k.value = o.kind;
    upd();
    seg('edit');
  };
  const upd = () => {
    $('[data-prev]', l).innerHTML =
      `<b>${esc($('#pe-name', l).value || '(이름 없음)')}</b><br>` +
      rich(ta.value) +
      (isU
        ? ''
        : (() => {
            try {
              return shareWithHTML(p, slot, $('#pe-name', l).value, ta.value, isEx);
            } catch (e) {
              return '';
            }
          })());
    const h = banHits(ta.value);
    $('[data-ban]', l).innerHTML =
      (h.length ? `<span class="warn">금지 키워드 감지: ${h.map(esc).join(', ')}</span>` : '<span class="okc">금지 키워드 없음</span>') +
      lintHTML(ta.value);
    wordUpd();
  };
  /* 10-24 망령: 뉴비 워딩 도우미 — DB 문장 꼴로 고칠 곳 · 자동화 구문 추천 (js/potlint.js) */
  let wFind = [],
    wDsl = [];
  const wordUpd = () => {
    const W = window.MKM_POTLINT,
      box = $('[data-wordbox]', l);
    if (!W || !box) return;
    const txt = ta.value;
    wFind = txt.trim() ? W.check(txt) : [];
    const fx = txt.trim() ? W.fixAll(txt) : '';
    const sg = fx ? W.suggest(fx) : { lines: [], why: [], timing: '' };
    wDsl = sg.lines;
    const left = fx ? banHits(fx) : [];
    $('[data-wcount]', l).textContent = !txt.trim()
      ? ''
      : (wFind.length ? `고칠 곳 ${wFind.length}` : '문장 꼴 OK') + (wDsl.length ? ` · 추천 구문 ${wDsl.length}줄` : '');
    box.classList.toggle('has', !!wFind.length);
    const sh = v => (v === '' ? '(없음)' : v.replace(/\n/g, '↵'));
    $('[data-wbody]', l).innerHTML = !txt.trim()
      ? '<div class="small muted">효과를 쓰면 포텐셜 DB 문장 꼴(【1/시】/ · 「공격 : +1」한다 · 강화(1.5배) · 턴 종료 시까지 …)과 비교해 고칠 곳을 알려 준다.</div>'
      : (wFind.length
          ? `<div class="wrow"><b class="small">고칠 곳</b><span class="sp"></span><button type="button" class="btn sm" data-wfixsel>고른 것만 고치기</button><button type="button" class="btn sm" data-wfixall>모두 고치기</button></div><ul class="wlist">${wFind.map((f, i) => `<li><label class="wck"><input type="checkbox" data-wck="${i}" checked><span class="small">${esc(f.msg)}</span></label><br><code>${esc(sh(f.from))}</code> → <code>${esc(sh(f.to))}</code> <button type="button" class="btn sm ghost" data-wfix="${i}">이것만 고치기</button></li>`).join('')}</ul>`
          : '<div class="small okc">DB 문장 꼴과 어긋나는 곳을 못 찾았다</div>') +
        (left.length
          ? `<div class="small warn" style="margin-top:4px">고쳐도 남는 금지 키워드: ${left.map(esc).join(', ')} · 이건 손으로 바꿔야 한다 (표 탭 「금지어」 참고)</div>`
          : '') +
        (wDsl.length
          ? `<div class="wrow" style="margin-top:6px"><b class="small">추천 자동화 구문</b>${wFind.length ? '<span class="small muted">(고친 문장 기준)</span>' : ''}<span class="sp"></span>${$('#pe-auto', l) ? '<button type="button" class="btn sm" data-wdslsel>고른 줄 넣기</button><button type="button" class="btn sm" data-wdsl>모두 바꿔 넣기</button>' : ''}</div><div class="wdsl">${wDsl.map((x, i) => `<label class="wck"><input type="checkbox" data-wdck="${i}" checked><code>${esc(x)}</code></label>`).join('')}</div><div class="small muted">${esc(sg.timing)} · 넣은 뒤 아래 ⚙ 자동화 구문 미리보기로 확인</div>`
          : '<div class="small muted" style="margin-top:6px">자동화 구문으로 옮길 만한 효과는 못 찾았다 (조건 · 특수 효과는 GM이 손으로)</div>');
  };
  l.addEventListener('click', e => {
    const W = window.MKM_POTLINT;
    if (!W) return;
    let b;
    if ((b = e.target.closest('[data-wfix]'))) {
      ta.value = W.fixOne(ta.value, wFind[+b.dataset.wfix]);
      upd();
      return;
    }
    if (e.target.closest('[data-wfixsel]')) {
      const on = $$('[data-wck]', l)
        .filter(c => c.checked)
        .map(c => wFind[+c.dataset.wck])
        .filter(Boolean);
      if (!on.length) return toast('고칠 곳을 하나 이상 골라 주세요');
      /* 뒤쪽부터 고쳐야 앞쪽 위치가 안 밀린다 · 맨 앞에 붙는 사용 횟수 태그는 마지막에 */
      let v = ta.value;
      on.filter(f => f.id !== 'uses-tag')
        .sort((a, b) => (b.at || 0) - (a.at || 0))
        .forEach(f => {
          v = W.fixOne(v, f);
        });
      on.filter(f => f.id === 'uses-tag').forEach(f => {
        v = W.fixOne(v, f);
      });
      ta.value = v;
      upd();
      toast(`고른 ${on.length}곳을 고쳤습니다`);
      return;
    }
    if (e.target.closest('[data-wdslsel]')) {
      const a = $('#pe-auto', l);
      if (!a) return;
      const on = $$('[data-wdck]', l)
        .filter(c => c.checked)
        .map(c => wDsl[+c.dataset.wdck])
        .filter(Boolean);
      if (!on.length) return toast('넣을 줄을 하나 이상 골라 주세요');
      const have = a.value
          .split('\n')
          .map(x => x.trim())
          .filter(Boolean),
        add = on.filter(x => !have.includes(x.trim()));
      if (!add.length) return toast('고른 줄은 이미 구문 칸에 있습니다');
      a.value = [...have, ...add].join('\n');
      const d = a.closest('details');
      if (d) d.open = true;
      autoUpd();
      toast(`${add.length}줄을 구문 칸에 덧붙였습니다`);
      return;
    }
    if (e.target.closest('[data-wfixall]')) {
      ta.value = W.fixAll(ta.value);
      upd();
      toast('DB 문장 꼴로 고쳤습니다 · 뜻이 바뀌지 않았는지 한 번 읽어 보세요');
      return;
    }
    if (e.target.closest('[data-wdsl]')) {
      const a = $('#pe-auto', l);
      if (!a) return;
      const old = a.value.trim();
      if (old && old !== wDsl.join('\n') && !confirm('구문 칸에 이미 쓴 내용이 있습니다. 추천 구문으로 바꿀까요?')) return;
      a.value = wDsl.join('\n');
      const d = a.closest('details');
      if (d) d.open = true;
      autoUpd();
      toast('추천 구문을 넣었습니다');
      return;
    }
  });
  l.addEventListener('input', e => {
    if (e.target.id === 'pe-eff' || e.target.id === 'pe-name') upd();
  });
  upd();
  const seg = v => {
    $('.split', l).dataset.seg = v;
    $$('[data-seg]', l).forEach(b => {
      if (b.tagName === 'BUTTON') b.classList.toggle('on', b.dataset.seg === v);
    });
  };
  l.addEventListener('click', e => {
    const b = e.target.closest('button[data-seg]');
    if (b) seg(b.dataset.seg);
  });
  mountPicker(l, 'pots', st, {
    onPick: n => {
      const r = potRow(n);
      $('#pe-name', l).value = n;
      ta.value = brN(r[2]);
      const k = $('#pe-kind', l);
      if (k) k.value = r[0];
      upd();
      if (matchMedia('(max-width:700px)').matches) {
        seg('edit');
        toast(`「${n}」을(를) 불러왔습니다`);
      }
    }
  });
  /* 11-26 망령 「UI가 구렸던거네 여기 개선좀」: 전용 색 = 고르는 상자 대신 타입 색 칩 (값은 숨은 #pe-ty 그대로) */
  l.querySelectorAll('[data-pety]').forEach(
    b =>
      (b.onclick = () => {
        const h = $('#pe-ty', l);
        if (h) h.value = b.dataset.pety;
        l.querySelectorAll('[data-pety]').forEach(x => {
          x.classList.toggle('on', x === b);
          x.setAttribute('aria-checked', String(x === b));
        });
      })
  );
  const commit = (name, eff, kind) => {
    if (isEx) {
      if (xi != null && !name) p.exclX.splice(xi, 1);
      else {
        exO.name = name;
        exO.eff = eff;
        {
          const ty = (($('#pe-ty', l) || {}).value || '').trim();
          if (ty) exO.ty = ty;
          else delete exO.ty;
        }
      }
    } else if (isU) {
      const ta2 = $('#pe-auto', l);
      const dsl = ta2 ? ta2.value.trim() : '';
      {
        const o0 = t.unique[slot.unique] || {};
        const nu = Object.assign({}, o0, { name, eff });
        if (dsl) nu.auto = dsl;
        else delete nu.auto;
        {
          const ln = (($('#pe-line', l) || {}).value || '').trim();
          if (ln && name) nu.line = ln.slice(0, 80);
          else delete nu.line;
        }
        t.unique[slot.unique] = nu;
      } /* 10-23 망령: 고쳐도 꾸미기(색 · 아이콘 · 부제)는 남긴다 */
    } else {
      const r = potRow(name);
      p.pots[slot] = name;
      p.potEff[slot] = r && brN(r[2]).trim() === eff.trim() ? '' : eff;
      p.potKind[slot] = r && r[0] === kind ? '' : kind;
    }
    if (!isU && p) {
      const ln = (($('#pe-line', l) || {}).value || '').trim();
      const k0 = String(cur.name || '')
          .replace(/『|』/g, '')
          .trim(),
        k1 = String(name || '')
          .replace(/『|』/g, '')
          .trim();
      p.cutLine = p.cutLine || {};
      if (k0 && k0 !== k1) delete p.cutLine[k0];
      if (k1 && ln) p.cutLine[k1] = ln.slice(0, 80);
      else if (k1) delete p.cutLine[k1];
      if (!Object.keys(p.cutLine).length) delete p.cutLine;
    }
    const ta2 = $('#pe-auto', l);
    if (ta2 && !isU && p) {
      p.auto = p.auto || {};
      const key = String(name || '').replace(/『|』/g, '');
      const dsl = ta2.value.trim();
      if (key && dsl) p.auto[key] = dsl;
      else if (key) delete p.auto[key];
    }
    save();
    refreshTrainer(t);
  };
  l.addEventListener('click', e => {
    if (e.target.closest('[data-x]')) return closeModal();
    if (e.target.closest('[data-rec]')) {
      openPotRecommend(t, p, fill, isEx);
      return;
    }
    if (e.target.closest('[data-build]')) {
      openPotBuilder(t, p, fill, isEx);
      return;
    }
    if (e.target.closest('[data-clear]')) {
      commit('', '', '');
      closeModal();
      return;
    }
    if (e.target.closest('[data-apply]')) {
      const name = $('#pe-name', l).value.trim(),
        eff = ta.value,
        kind = $('#pe-kind', l) ? $('#pe-kind', l).value.trim() : '';
      if (ME.gm && $('#pe-db', l) && $('#pe-db', l).checked && name) {
        const i = S.db.pots.findIndex(r => r[1] === name);
        const nr = [kind || '99. 기타', name, eff, i >= 0 ? S.db.pots[i][3] : '오리지널'];
        if (i >= 0) S.db.pots[i] = nr;
        else {
          S.db.pots.unshift(nr);
          S.custom.pots.push(name);
        }
        reindex();
        save(true);
      }
      commit(name, eff, kind);
      closeModal();
      toast('포텐셜을 적용했습니다');
    }
  });
}

