/* ── 조각 07_db_edit.js — DB 항목 편집 ── */
/* ---------- DB 항목 편집 ---------- */
const IR_HELP = `전용 피카츄/라이츄 · 소모품
공격 강화 ×1.2 · 공격 강화 물리기 ×1.5 · 공격 강화 타입 불꽃/물 ×1.2 · 공격 강화 단일기 불꽃 ×1.3
받는 대미지 ×0.67 · 받는 대미지 특수기 ×0.67 · 급소 +1 · 급소 방호 1
무효 타입 땅 · 반감 타입 불꽃 · 반감 타입 불꽃 효과 굉장 · 반감 물리기 HP 가득 · 반감 전체기
버티기 HP 가득 · 버티기 10%
HP 1/4 이하: 회복 1/4, 공격 +1, 무작위 +2   (회복 20 처럼 수도)
치유 마비/독 · 필드 일렉트릭필드: 방어 +1 · 룸 트릭룸: 스피드 -1 · 날씨 해제 · 필드 철거 · 하락 되돌리기
맞으면: 공격 +1 · 맞으면 (효과 굉장): 공격 +2, 특공 +2 · 맞으면 (타입 물): 특공 +1 · 맞으면 (물리기): 반사 1/8
맞으면 (접촉기): 타입 바꾸기 벌레 / 특성 바꾸기 미라 / 옮겨붙는다 · 맞으면: 가장 높은 능력 -1 · 맞으면: 터진다 · 맞으면: 메모 (글)
턴 종료: 회복 1/16 · 턴 종료: 대미지 1/8 · 턴 종료: 상태 화상 · 턴 종료: 독 타입이면 회복 1/16 아니면 대미지 1/8
명중하면: 회복 1/8 · 명중하면 (태그 소리): 특공 +1 · 빗나가면: 스피드 +2 · 풀죽음 10%
(발동 버튼으로 쓰는 효과는 레디메이드 「소지품 : 이름」에 적는다)`;
/* 카드 색 — 오레마스 덱 창(deck_ui PAL)과 같은 키 */
const CARD_PAL = [
  ['red', '#c8504a', '빨강'],
  ['orange', '#d9822b', '주황'],
  ['gold', '#b8932a', '금색'],
  ['green', '#4f9a5a', '초록'],
  ['teal', '#2f948f', '청록'],
  ['blue', '#4573c4', '파랑'],
  ['purple', '#8a5cc4', '보라'],
  ['pink', '#c45c9a', '분홍'],
  ['gray', '#6b7286', '회색'],
  ['black', '#30343f', '검정']
];
const cardCol = v => {
  v = String(v || '').trim();
  const p = CARD_PAL.find(x => x[0] === v || x[2] === v);
  return p ? p[1] : safeCss(v) || '#6b7286';
};
const cardImg = v => {
  v = String(v || '').trim();
  return /^https?:\/\//.test(v) || /^data:image\//.test(v) ? v : '';
};
/* 11-01 은열쇠: 카드 아이콘 — 지시 · 육성 · 통솔 · 능력 · ★. 「지시·통솔」「지시, 통솔」도 읽는다 */
const CARD_IC = ['지시', '육성', '통솔', '능력', '★'];
const cardIcons = v => [
  ...new Set(
    String(v || '')
      .replace(/[*＊☆]/g, '★')
      .split(/[\s,·\/|]+/)
      .map(x => x.trim())
      .filter(x => CARD_IC.includes(x))
  )
];
function fieldHTML(kind, n, v, row, isNew) {
  const c = DBS[kind].cols[n];
  const id = `f-${kind}-${n}`;
  if (kind === 'cards' && n === 5)
    return `<label class="lbl" for="${id}">${c}<select id="${id}" data-f="${n}">${CARD_PAL.map(p => `<option value="${p[0]}" ${p[0] === v || p[2] === v ? 'selected' : ''}>${p[2]}</option>`).join('')}</select></label>`;
  if (kind === 'cards' && n === 6)
    return `<label class="lbl" for="${id}" style="grid-column:1/-1">${c} <span class="small muted">그림 파일을 고르면 세로 720px 로 줄여 공유 저장소에 올리고 주소를 넣습니다 · 세로 5:7 카드 그림이 잘 맞아요</span><span class="row" style="gap:8px;flex-wrap:nowrap;align-items:center"><img data-cardimg alt="" src="${esc(cardImg(v))}" style="width:56px;height:78px;object-fit:cover;border-radius:6px;border:1px solid var(--line,#ddd);${cardImg(v) ? '' : 'visibility:hidden'}"><input id="${id}" data-f="${n}" value="${esc(v ?? '')}" placeholder="https://… 또는 그림 올리기" style="flex:1;min-width:0"><button type="button" class="btn sm" data-cardimgpick>그림 올리기</button><input type="file" accept="image/*" data-cardimgf hidden></span></label>`;
  if (kind === 'cards' && (n === 0 || n === 2)) {
    const L = [...new Set(S.db.cards.map(r => r[n]).filter(Boolean))];
    return `<label class="lbl" for="${id}">${c}<input id="${id}" data-f="${n}" value="${esc(v ?? '')}" list="L-card${n}" ${n === 0 ? 'placeholder="예) 은열쇠"' : 'placeholder="예) 행동"'}><datalist id="L-card${n}">${L.map(x => `<option value="${esc(x)}">`).join('')}</datalist></label>`;
  }
  if (kind === 'cards' && n === 12)
    return `<label class="lbl" for="${id}">${c} <span class="small muted">열쇠 2 + 준비 6 = 8장 · 증상은 따로</span><select id="${id}" data-f="${n}">${['', '열쇠', '준비', '증상'].map(x => `<option value="${esc(x)}" ${x === String(v ?? '') ? 'selected' : ''}>${x || '(없음)'}</option>`).join('')}</select></label>`;
  if (kind === 'cards' && n === 13)
    return `<label class="lbl" for="${id}">${c} <span class="small muted">같은 카드를 덱에 넣을 수 있는 최대 장수 (비우면 2)</span><input id="${id}" data-f="${n}" value="${esc(v ?? '')}" inputmode="numeric" placeholder="2" style="width:70px"></label>`;
  if (kind === 'cards' && n === 11) {
    const L = [
      ...new Set(['공용', ...S.db.cards.map(r => String(r[11] || '').trim()), ...S.trainers.map(t => String(t.name || '').trim())].filter(Boolean))
    ];
    return `<label class="lbl" for="${id}">${c} <span class="small muted">공용 · 또는 만든 사람(트레이너 이름) — DB 표가 출처별 폴더로 묶는다</span><input id="${id}" data-f="${n}" value="${esc(v ?? '')}" list="L-card11" placeholder="공용"><datalist id="L-card11">${L.map(x => `<option value="${esc(x)}">`).join('')}</datalist></label>`;
  }
  if (kind === 'cards' && n === 10)
    return `<label class="lbl" for="${id}" style="grid-column:1/-1">${c} <span class="small muted">은열쇠 · 스킬 체크에 바칠 때 맞춰 보는 자질 — 지시 · 육성 · 통솔 · 능력 · ★(아무 자질), 1~2개를 띄어 적는다 · 몇 개든 바치면 +1 · 비우면 바칠 수 없는 카드(광기 · 상태)</span><input id="${id}" data-f="${n}" value="${esc(v ?? '')}" placeholder="예) 지시 통솔 · ★"><span class="row" style="gap:4px;flex-wrap:wrap">${CARD_IC.map(x => `<button type="button" class="btn xs" data-cardic="${x}">${x}</button>`).join('')}<button type="button" class="btn xs ghost" data-cardic="">비우기</button></span></label>`;
  if (kind === 'cards' && n === 9)
    return `<label class="lbl" for="${id}" style="grid-column:1/-1">${c} <span class="small muted">오레마스 배틀에서 이 카드를 쓰면 도는 구문 (SP · 포텐셜과 같은 꼴) · 비우면 효과 글만 로그에</span><textarea id="${id}" data-f="${n}" rows="3" style="font-family:var(--mono,monospace);font-size:12.5px" placeholder="예) 회복 1/4 아군1체 · 랭크 공격+1 임시 자신">${esc(v || '')}</textarea><span class="small" data-cardauto style="white-space:pre-wrap"></span></label>`;
  if (kind === 'items' && n === 7)
    return `<label class="lbl" for="${id}" style="grid-column:1/-1">${c} <span class="small muted">오레마스 배틀이 이 소지품을 자동으로 처리하는 법 · 한 줄에 하나 · 비우면 효과 글을 읽는다</span><textarea id="${id}" data-f="${n}" rows="4" style="font-family:var(--mono,monospace);font-size:12.5px" placeholder="예) 공격 강화 타입 불꽃 ×1.2">${esc(v || '')}</textarea><span class="row" style="gap:6px;align-items:center;flex-wrap:wrap"><button type="button" class="btn sm" data-irgen>효과 글에서 만들기</button><span class="small" data-irprev></span></span><details><summary class="small">구문 도움말</summary><pre class="small" style="white-space:pre-wrap">${esc(IR_HELP)}</pre></details></label>`;
  if (kind === 'rm' && n === 2)
    return `<label class="lbl" for="${id}" style="grid-column:1/-1">${c} <span class="small muted">한 줄에 명령 하나 · 오레마스 자동화</span><textarea id="${id}" data-f="${n}" rows="5" style="font-family:var(--mono,monospace);font-size:12.5px">${esc(v || '')}</textarea><span class="small" data-rmprev></span><details><summary class="small">구문 도움말</summary><pre class="small" style="white-space:pre-wrap">${esc(typeof AUTO_HELP === 'string' ? AUTO_HELP : '')}</pre></details></label>`;
  if (kind === 'st' && n === 12)
    return `<label class="lbl" for="${id}" style="grid-column:span 2">${c} <span class="small muted">파일 이름(오레마스 img/state) 또는 그림 주소 · 그림 파일을 고르면 작게 줄여 넣습니다</span><span class="row" style="gap:6px;flex-wrap:nowrap;align-items:center"><img data-sticon src="${esc(stIcon(v))}" alt="" style="width:40px;height:40px;object-fit:contain;border:1px solid var(--line,#ccc);border-radius:6px;${v ? '' : 'visibility:hidden'}"><input id="${id}" data-f="${n}" value="${esc(v ?? '')}" style="flex:1;min-width:0"><input type="file" accept="image/*" data-sticonf hidden><button type="button" class="btn sm" data-sticonpick>그림 고르기</button></span></label>`;
  if (kind === 'st' && n === 6)
    return `<label class="lbl" for="${id}">${c} <span class="small muted">turn 턴 끝마다 · move 기술 낼 때 · once 한 번</span><select id="${id}" data-f="${n}">${[
      'turn',
      'move',
      'once'
    ]
      .concat(v && !['turn', 'move', 'once'].includes(v) ? [v] : [])
      .map(t => `<option ${t === v ? 'selected' : ''}>${esc(t)}</option>`)
      .join('')}</select></label>`;
  if (kind === 'st' && n >= 7 && n <= 9)
    return `<label class="lbl" for="${id}">${c}<select id="${id}" data-f="${n}">${['', 'O'].map(t => `<option value="${t}" ${t === v ? 'selected' : ''}>${t || '아니오'}</option>`).join('')}</select></label>`;
  if (kind === 'st' && n === 2)
    return `<label class="lbl" for="${id}">${c}<input id="${id}" data-f="${n}" value="${esc(v ?? '')}" list="L-stg"><datalist id="L-stg">${[
      ...new Set(S.db.st.map(r => r[2]).concat([ST_HIDE]))
    ]
      .filter(Boolean)
      .map(g => `<option value="${esc(g)}">`)
      .join('')}</datalist></label>`;
  if (kind === 'rm' && n === 4)
    return `<label class="lbl" for="${id}">${c} <span class="small muted">발동 확률 % — 비우면 효과 글(「N할로」 · 「N% 확률」 · 저/중/고확률)에서 읽는다 · 100 = 늘 발동</span><input id="${id}" data-f="${n}" type="number" min="0" max="100" step="1" value="${esc(v == null ? '' : v)}" style="width:90px"><span class="small" data-rmpct></span></label>`;
  if (kind === 'rm' && n === 3)
    return `<label class="lbl" for="${id}">${c} <span class="small muted">(O 면 자동화 미지원 — 손으로 처리)</span><select id="${id}" data-f="${n}">${['', 'O'].map(t => `<option value="${t}" ${t === v ? 'selected' : ''}>${t || '(자동)'}</option>`).join('')}</select></label>`;
  if (n === DBS[kind].eff)
    return `<label class="lbl" for="${id}" style="grid-column:1/-1">${c}${tagbarHTML()}<textarea id="${id}" data-f="${n}" rows="4">${esc(brN(v))}</textarea><span class="small" data-banwarn></span></label>`;
  if (kind === 'moves' && n === 5)
    return `<label class="lbl" for="${id}">${c}<select id="${id}" data-f="${n}">${S.db.types.map(t => `<option value="${esc(t[0])}" ${t[0] === v ? 'selected' : ''}>${esc(t[0])}</option>`).join('')}<option value="무작위" ${v === '무작위' ? 'selected' : ''} title="쓸 때마다 18 타입(다크 · 신 · 와일드 빼고) 중 하나 — 웹툴 공격 창이 굴린다">무작위</option>${v && v !== '무작위' && !S.db.types.some(t => t[0] === v) ? `<option value="${esc(v)}" selected>${esc(v)}</option>` : ''}</select></label>`;
  if (kind === 'moves' && n === 6)
    return `<label class="lbl" for="${id}">${c}<select id="${id}" data-f="${n}">${['물리', '특수', '변화'].map(t => `<option ${t === v ? 'selected' : ''}>${t}</option>`).join('')}</select></label>`;
  if (kind === 'moves' && n === 9)
    return `<label class="lbl" for="${id}">${c}<span class="row" style="gap:6px;flex-wrap:nowrap"><input id="${id}" data-f="${n}" value="${esc(v ?? '')}" list="L-range" style="flex:1;min-width:0"><span data-rg>${rangeGrid(v)}</span></span><datalist id="L-range">${Object.keys(
      RANGE_MAP
    )
      .map(k => `<option value="${k}">`)
      .join('')}</datalist></label>`;
  if (kind === 'moves' && n === 10)
    return `<label class="lbl" for="${id}">${c}<select id="${id}" data-f="${n}">${['O', 'X', '-'].map(t => `<option ${t === v ? 'selected' : ''}>${t}</option>`).join('')}</select></label>`;
  if (kind === 'abil' && n === 5)
    return `<label class="lbl" for="${id}">${c}<select id="${id}" data-f="${n}">${(() => {
      const cur = isNew && !v ? 'gm' : abKind([0, row && row[1], 0, 0, 0, v]);
      return [
        ['범용', '범용'],
        ['올타 전용', '올타 전용'],
        ['GM 전용', 'GM 전용']
      ]
        .map(([t, l]) => `<option value="${t}" ${cur === (t === 'GM 전용' ? 'gm' : t === '올타 전용' ? 'old' : '') ? 'selected' : ''}>${l}</option>`)
        .join('');
    })()}</select></label>`;
  if ((kind === 'abil' && (n === 3 || n === 4)) || (kind === 'items' && n === 3))
    return `<label class="lbl" for="${id}">${c}<select id="${id}" data-f="${n}">${['X', 'O', '-', ''].map(t => `<option value="${t}" ${t === v ? 'selected' : ''}>${t || '(빈칸)'}</option>`).join('')}</select></label>`;
  const list = kind === 'pots' && n === 0 ? 'L-kinds' : kind === 'items' && n === 0 ? 'L-ikinds' : '';
  return `<label class="lbl" for="${id}" ${n === 1 && kind === 'moves' ? 'style="grid-column:span 2"' : ''}>${c}<input id="${id}" data-f="${n}" value="${esc(v ?? '')}" ${list ? `list="${list}"` : ''}></label>`;
}
/* 11-01 망령 「특성 쪽엔 구문 도우미가 없더라고」: 특성 DB 수정 창에도 포텐셜 창처럼
   ✍ 워딩 도우미(js/potlint.js — DB 문장 꼴 점검 · 고치기 · 추천 구문) + ⚙ 자동화 구문(레디메이드 DB 「특성 : 이름」 줄) · 생성기 · 미리보기.
   저장하면 구문 칸이 레디메이드 줄로 들어간다 (비우면 그 줄의 구문만 비움 · 이름을 바꾸면 줄 이름도 따라감). 포켓몬마다 따로 쓴 구문(p.auto)이 있으면 그쪽이 먼저 돈다 */
const RMAB = n =>
  '특성 : ' +
  String(n || '')
    .replace(/『|』/g, '')
    .trim();
function wordHelpHTML() {
  return window.MKM_POTLINT
    ? `<details class="wordbox" data-wordbox><summary>✍ 워딩 도우미 <span class="small muted" data-wcount></span></summary><div data-wbody></div></details>`
    : '';
}
/* 고칠 곳 · 추천 구문 상자. ta = 효과 글, auto() = 구문 칸(없으면 null), onAuto = 구문 칸을 바꾼 뒤 */
function wordHelpBind(l, ta, auto, onAuto) {
  const W = window.MKM_POTLINT,
    box = $('[data-wordbox]', l);
  if (!W || !box || !ta) return () => {};
  let F = [],
    DS = [];
  const sh = v => (v === '' ? '(없음)' : v.replace(/\n/g, '↵'));
  const upd = () => {
    const txt = ta.value;
    F = txt.trim() ? W.check(txt) : [];
    const fx = txt.trim() ? W.fixAll(txt) : '';
    const sg = fx ? W.suggest(fx) : { lines: [], timing: '' };
    DS = sg.lines || [];
    $('[data-wcount]', l).textContent = !txt.trim()
      ? ''
      : (F.length ? `고칠 곳 ${F.length}` : '문장 꼴 OK') + (DS.length ? ` · 추천 구문 ${DS.length}줄` : '');
    box.classList.toggle('has', !!F.length);
    $('[data-wbody]', l).innerHTML = !txt.trim()
      ? '<div class="small muted">효과를 쓰면 DB 문장 꼴(【1/시】/ · 「공격 : +1」한다 · 강화(1.5배) · 턴 종료 시까지 …)과 비교해 고칠 곳을 알려 준다.</div>'
      : (F.length
          ? `<div class="wrow"><b class="small">고칠 곳</b><span class="sp"></span><button type="button" class="btn sm" data-wfa>모두 고치기</button></div><ul class="wlist">${F.map((f, i) => `<li><span class="small">${esc(f.msg)}</span><br><code>${esc(sh(f.from))}</code> → <code>${esc(sh(f.to))}</code> <button type="button" class="btn sm ghost" data-wf1="${i}">이것만 고치기</button></li>`).join('')}</ul>`
          : '<div class="small okc">DB 문장 꼴과 어긋나는 곳을 못 찾았다</div>') +
        (DS.length
          ? `<div class="wrow" style="margin-top:6px"><b class="small">추천 자동화 구문</b>${F.length ? '<span class="small muted">(고친 문장 기준)</span>' : ''}<span class="sp"></span>${auto() ? '<button type="button" class="btn sm" data-wds>구문 칸에 덧붙이기</button>' : ''}</div><div class="wdsl">${DS.map(x => `<code>${esc(x)}</code>`).join('')}</div>`
          : '<div class="small muted" style="margin-top:6px">자동화 구문으로 옮길 만한 효과는 못 찾았다 (조건 · 특수 효과는 GM이 손으로 · 아래 생성기)</div>');
  };
  l.addEventListener('click', e => {
    let b;
    if ((b = e.target.closest('[data-wf1]'))) {
      ta.value = W.fixOne(ta.value, F[+b.dataset.wf1]);
      ta.dispatchEvent(new Event('input', { bubbles: true }));
      return;
    }
    if (e.target.closest('[data-wfa]')) {
      ta.value = W.fixAll(ta.value);
      ta.dispatchEvent(new Event('input', { bubbles: true }));
      toast('DB 문장 꼴로 고쳤습니다 · 뜻이 바뀌지 않았는지 한 번 읽어 보세요');
      return;
    }
    if (e.target.closest('[data-wds]')) {
      const a = auto();
      if (!a) return;
      const have = a.value
          .split('\n')
          .map(x => x.trim())
          .filter(Boolean),
        add = DS.filter(x => !have.includes(x.trim()));
      if (!add.length) return toast('추천 줄은 이미 구문 칸에 있습니다');
      a.value = [...have, ...add].join('\n');
      const d = a.closest('details');
      if (d) d.open = true;
      if (onAuto) onAuto();
      toast(`${add.length}줄을 구문 칸에 덧붙였습니다`);
    }
  });
  ta.addEventListener('input', upd);
  upd();
  return upd;
}
function abilAssist(l, oldName) {
  const host = $('[data-abassist]', l),
    ta = $('[data-f="2"]', l),
    nm = $('[data-f="1"]', l);
  if (!host || !ta || !nm) return null;
  const row = n => (S.db.rm || []).find(x => x[0] === RMAB(n));
  const r0 = oldName ? row(oldName) : null;
  host.innerHTML = `${wordHelpHTML()}<details class="autobox" ${r0 && String(r0[2] || '').trim() ? 'open' : ''}><summary>⚙ 자동화 구문 <span class="small muted" data-autohint></span></summary>
  <div class="small muted" style="margin:4px 0">오레마스(배틀 웹툴)에서 이 특성을 자동으로 처리할 내용 — 레디메이드 DB 「특성 : 이름」 줄에 저장된다. 한 줄에 명령 하나 — 예: <code>랭크 공격+1 임시</code> · <code>완화 ×0.5 타입:불꽃</code> · <code>상태확률 마비 30% 상대1체</code></div>
  <textarea data-abauto rows="4" style="width:100%;font-family:var(--mono,monospace);font-size:12.5px" placeholder="(비우면 손으로 · 레디메이드 줄이 있으면 그 구문만 비운다)">${esc(r0 ? r0[2] || '' : '')}</textarea>
  <div class="small" data-autoprev style="white-space:pre-wrap;margin-top:4px"></div><div data-autogen></div>
  <details><summary class="small">구문 도움말</summary><pre class="small" style="white-space:pre-wrap">${esc(AUTO_HELP)}</pre></details></details>`;
  const at = $('[data-abauto]', l),
    pv = $('[data-autoprev]', l),
    hint = $('[data-autohint]', l);
  const prev = () => {
    const K = window.OM_FX;
    const v = at.value.trim();
    if (!K) {
      pv.innerHTML =
        FXST === 'fail'
          ? '<span class="warn">구문 스크립트를 불러오지 못했다</span> ' + fxRetryBtn()
          : '<span class="muted">구문 스크립트를 불러오는 중…</span>';
      hint.textContent = v ? '구문 있음' : '없음';
      return;
    }
    if (!v) {
      pv.innerHTML = '';
      hint.textContent = '없음';
      return;
    }
    const r = K.parse(v);
    pv.innerHTML =
      (r.ops.length ? '미리보기: ' + esc(K.unparse(r.ops).join(' / ')) : '') +
      (r.errs && r.errs.length ? ` <span class="warn">모르는 줄: ${esc(r.errs.join(' / '))}</span>` : '');
    hint.textContent = r.ops.length ? `구문 ${r.ops.length}줄` : '구문 없음';
  };
  at.addEventListener('input', prev);
  wordHelpBind(l, ta, () => at, prev);
  prev();
  loadFx().then(() => {
    prev();
    const gh = $('[data-autogen]', l);
    if (gh && window.OM_FX_UI && OM_FX_UI.mountGen && !gh.childElementCount) OM_FX_UI.mountGen(gh, at, { toast });
  });
  return {
    save(name) {
      const dsl = at.value.trim();
      const key = RMAB(name),
        ok = oldName ? RMAB(oldName) : '';
      if (!Array.isArray(S.db.rm)) S.db.rm = [];
      S.custom.rm = S.custom.rm || [];
      let r = S.db.rm.find(x => x[0] === key);
      const ro = ok && ok !== key ? S.db.rm.find(x => x[0] === ok) : null;
      if (ro && !r) {
        if (!dsl) return;
        ro[0] = key;
        r = ro;
        const ci = S.custom.rm.indexOf(ok);
        if (ci >= 0) S.custom.rm[ci] = key;
      }
      if (r) {
        if (String(r[2] || '').trim() === dsl) return;
        r[2] = dsl;
        if (!r[1]) r[1] = ta.value;
        return;
      }
      if (!dsl) return;
      S.db.rm.unshift([key, ta.value, dsl, '', '']);
      if (!S.custom.rm.includes(key)) S.custom.rm.push(key);
    }
  };
}
/* 11-08 망령 「기술 쪽에도 구문 · 구문 추천기 · 지금 들어간 구문 확인」: 기술 구문 칸 상자 (DB 기술 수정 창 · 포켓몬별 「이 포켓몬만」 창 공용)
   host 안에 그린다. getMv() = 지금 창의 기술 {name,type,cat,range,tag,eff}. base = 이 칸이 비었을 때 도는 구문 {dsl,lab} (포켓몬별 창에서는 DB 레디메이드) */
const RMMV = n =>
  '기술 : ' +
  String(n || '')
    .replace(/『|』/g, '')
    .trim();
const MV_ITEM_RE = [
  ['떨구기 (위력 ×1.5)', /「소지품」을\s*전부\s*파괴/],
  ['모두 파괴', /「소지품」을\s*모두\s*파괴/],
  ['파괴(약탈)', /「소지품」을\s*파괴\s*\(\s*약탈\s*\)/],
  ['한 칸 파괴', /대상의\s*「소지품」을\s*파괴/],
  ['강탈', /「소지품」을\s*강탈/],
  ['맞바꾸기', /서로의\s*「소지품」을\s*뒤바꾼다/],
  ['나무열매 먹기', /「나무열매」를\s*먹는다/],
  ['내던지기', /자신의\s*「소지품」을\s*소비하여\s*공격/],
  ['건네주기', /자신의\s*「소지품」을\s*대상에게\s*건네/]
];
const mvItemKind = e => {
  e = String(e || '');
  for (const [k, re] of MV_ITEM_RE) if (re.test(e)) return k;
  return '';
};
/* 효과 글에서 읽지 못한(손으로) 문장 중 소지품 문장 → 구문 줄 */
function mvItemRec(s) {
  s = String(s || '');
  const tg = /상대 전체/.test(s) ? '상대전체' : /자신의\s*「소지품」을\s*(아군|대상)/.test(s) && /아군/.test(s) ? '아군1체' : '상대1체';
  let m;
  if (/「소지품」을\s*파괴\s*\(\s*약탈\s*\)/.test(s)) return '소지품파괴약탈 ' + tg;
  if (/「소지품」을\s*(모두|전부)\s*(파괴|잃)/.test(s)) return '소지품모두파괴 ' + tg;
  if (/「소지품」을\s*(파괴|잃게)/.test(s)) return '소지품파괴 ' + tg;
  if (/「소지품」을\s*(강탈|약탈|빼앗)/.test(s)) return '소지품강탈 ' + tg;
  if (/서로의\s*「소지품」을\s*(뒤바꾼|맞바꾼|교환)/.test(s)) return '소지품교환 ' + tg;
  if (/자신의\s*「소지품」을\s*[^.]*?(건네|준다)/.test(s)) return '소지품주기 ' + tg;
  if ((m = s.match(/「소지품\s*:\s*([^」]+)」(?:으로|로)\s*(?:만든다|바꾼다|변경한다)/))) return '소지품지정 ' + tg + ' ' + m[1].trim();
  return '';
}
function mvAutoBox(host, getMv, init, base, onUp) {
  const K = () => window.OM_FX,
    MA = () => window.OM_MOVEAUTO;
  host.innerHTML = `<details class="autobox" ${String(init || '').trim() ? 'open' : ''}><summary>⚙ 자동화 구문 <span class="small muted" data-mvhint></span></summary>
  <div class="small muted" style="margin:4px 0">오레마스(배틀 웹툴)가 이 기술을 쓸 때 돌리는 명령 — 비우면 ${base && base.dsl ? esc(base.lab) + '(아래 「지금 상태」)' : '효과 글을 읽어 자동으로'} 처리한다. 구문을 넣으면 효과 글 자동 대신 구문만 돈다. 「상대1체」 줄은 맞은 대상마다 걸린다.</div>
  <textarea data-mvauto rows="4" style="width:100%;font-family:var(--mono,monospace);font-size:12.5px" placeholder="예) 소지품파괴 상대1체 · 3할 상태 화상 상대1체 · 랭크 공격+1">${esc(init || '')}</textarea>
  <div class="small" data-mvprev style="white-space:pre-wrap;margin-top:4px"></div>
  <div class="mksp" style="margin-top:6px"><b class="small">지금 상태</b><div class="small" data-mvnow style="white-space:pre-wrap"></div></div>
  <div class="mksp" style="margin-top:6px"><div class="row" style="gap:6px;align-items:baseline"><b class="small">추천 구문</b><span class="small muted">효과 글에서 읽은 것을 구문으로 옮긴 것</span><span class="sp"></span><button type="button" class="btn sm" data-mvrecadd>구문 칸에 덧붙이기</button></div><div class="wdsl" data-mvrec></div></div>
  <div data-autogen></div>
  <details><summary class="small">구문 도움말</summary><pre class="small" style="white-space:pre-wrap">${esc(AUTO_HELP)}</pre></details></details>`;
  const at = $('[data-mvauto]', host),
    pv = $('[data-mvprev]', host),
    now = $('[data-mvnow]', host),
    rec = $('[data-mvrec]', host),
    hint = $('[data-mvhint]', host);
  let REC = [];
  const lines = (ops, n) => {
    const F = K();
    return F.unparse((ops || []).map(o => (o && o.tgt === 'target' ? Object.assign({}, o, { tgt: 'enemy1' }) : o))).map(
      x => (n && n < 10 ? n + '할 ' : '') + x
    );
  };
  const up = () => {
    const F = K(),
      A = MA();
    const v = at.value.trim();
    if (!F || !A) {
      pv.innerHTML =
        FXST === 'fail'
          ? '<span class="warn">구문 스크립트를 불러오지 못했다</span> ' + fxRetryBtn()
          : '<span class="muted">구문 스크립트를 불러오는 중…</span>';
      now.textContent = '';
      rec.innerHTML = '';
      hint.textContent = v ? '구문 있음' : '';
      return;
    }
    const r = v ? F.parse(v) : { ops: [], errs: [] };
    pv.innerHTML = v
      ? (r.ops.length ? '미리보기: ' + esc(F.unparse(r.ops).join(' / ')) : '') +
        (r.errs && r.errs.length ? ` <span class="warn">모르는 줄: ${esc(r.errs.join(' / '))}</span>` : '')
      : '';
    const mv = getMv();
    const T = A.parse(mv, { text: 1 });
    const N = [];
    const ik = mvItemKind(mv.eff);
    const lost = [
      T.recoil ? '반동' : '',
      T.drain ? '드레인' : '',
      T.selfFaint ? '사용 후 빈사' : '',
      T.critSure ? '확정 급소' : '',
      T.forceSwitch ? '강제 교대' : '',
      T.selfSwitch ? '교대' : ''
    ].filter(Boolean);
    if (r.ops.length) {
      N.push(`● 이 칸의 구문 ${r.ops.length}줄이 돈다 — ${F.unparse(r.ops).join(' / ')}`);
      if (lost.length) N.push(`  ⚠ 효과 글에서 읽던 ${lost.join(' · ')}은(는) 구문을 넣으면 돌지 않는다`);
      {
        const have = new Set(F.unparse(r.ops));
        const miss = [];
        for (const g of T.groups || []) {
          if (g.oneOf) continue;
          for (const x of lines(g.ops)) if (!have.has(x)) miss.push((g.n < 10 ? g.n + '할 ' : '') + x);
        }
        if (miss.length) N.push(`  ⚠ 효과 글에서 읽던 ${miss.join(' / ')} 은(는) 구문에 없어서 돌지 않는다 — 「추천 구문」을 덧붙이면 같이 돈다`);
      }
      if (ik && r.ops.some(o => o.k === 'item')) N.push(`  · 「소지품」 줄이 있어 효과 글 소지품 자동(${ik})은 꺼진다`);
      else if (ik) N.push(`  · 소지품 「${ik}」 는 효과 글로 따로 자동 처리 (구문과 함께)`);
    } else if (base && base.dsl) {
      const br = F.parse(base.dsl);
      N.push(`● ${base.lab} ${br.ops.length}줄이 돈다 — ${F.unparse(br.ops).join(' / ')}`);
    } else {
      const d = A.auto(T) ? A.describe(T) : '';
      N.push(d ? `● 효과 글에서 읽어 자동: ${d}` : '● 효과 글에서 자동으로 읽은 것 없음');
      if (ik) N.push(`● 소지품 「${ik}」 — 효과 글로 자동 (적용 때)`);
    }
    const man = (T.notes || []).filter(x => !mvItemRec(x));
    if (!r.ops.length && !(base && base.dsl) && man.length) N.push(`○ 손으로 처리: ${man.join(' / ')}`);
    now.textContent = N.join('\n');
    REC = [];
    for (const g of T.groups || []) {
      if (g.oneOf) {
        REC.push('# 「' + g.label + '」 — 여러 개 중 하나 (선택지 구문으로)');
        continue;
      }
      REC.push(...lines(g.ops, g.n));
    }
    if (!ik)
      for (const x of T.notes || []) {
        const q = mvItemRec(x);
        if (q) REC.push(q);
      } /* 효과 글로 이미 자동인 소지품 기술(ik)은 추천하지 않는다 — 구문에 넣으면 탁쳐서떨구기 ×1.5 같은 글 자동이 꺼진다 */
    REC = [...new Set(REC)];
    rec.innerHTML = REC.length
      ? REC.map(x => `<code>${esc(x)}</code>`).join('')
      : '<span class="small muted">옮길 만한 효과를 못 찾았다 — 아래 생성기로 만든다</span>';
    hint.textContent = r.ops.length ? `구문 ${r.ops.length}줄` : base && base.dsl ? '비움 — DB 구문' : '비움 — 효과 글';
    if (onUp) onUp();
  };
  host.addEventListener('click', e => {
    if (!e.target.closest('[data-mvrecadd]')) return;
    const add0 = REC.filter(x => !x.startsWith('#'));
    const have = at.value
      .split('\n')
      .map(x => x.trim())
      .filter(Boolean);
    const add = add0.filter(x => !have.includes(x));
    if (!add.length) return toast(REC.length ? '추천 줄은 이미 구문 칸에 있습니다' : '추천할 줄이 없습니다');
    at.value = [...have, ...add].join('\n');
    up();
    toast(`${add.length}줄을 덧붙였습니다`);
  });
  at.addEventListener('input', up);
  up();
  loadFx().then(() => {
    up();
    const gh = $('[data-autogen]', host);
    if (gh && window.OM_FX_UI && OM_FX_UI.mountGen && !gh.childElementCount) OM_FX_UI.mountGen(gh, at, { toast });
  });
  return { up, val: () => at.value.trim() };
}
/* DB 기술 수정 창: 레디메이드 「기술 : 이름」 줄에 저장 (abilAssist 와 같은 규칙) */
function mvAssist(l, oldName) {
  const host = $('[data-mvassist]', l);
  if (!host) return null;
  const f = n => {
    const el = $(`[data-f="${n}"]`, l);
    return el ? el.value : '';
  };
  const row = n => (S.db.rm || []).find(x => x[0] === RMMV(n));
  const r0 = oldName ? row(oldName) : null;
  const box = mvAutoBox(
    host,
    () => ({ name: f(2), type: f(5), cat: f(6), range: f(9), tag: f(12) || f(1), eff: f(13) }),
    r0 ? r0[2] || '' : '',
    null
  );
  l.addEventListener('input', e => {
    if (e.target.matches('[data-f="13"],[data-f="6"],[data-f="9"],[data-f="2"]')) box.up();
  });
  return {
    save(name) {
      const dsl = box.val();
      const key = RMMV(name),
        ok = oldName ? RMMV(oldName) : '';
      if (!Array.isArray(S.db.rm)) S.db.rm = [];
      S.custom.rm = S.custom.rm || [];
      let r = S.db.rm.find(x => x[0] === key);
      const ro = ok && ok !== key ? S.db.rm.find(x => x[0] === ok) : null;
      if (ro && !r) {
        if (!dsl) return;
        ro[0] = key;
        r = ro;
        const ci = S.custom.rm.indexOf(ok);
        if (ci >= 0) S.custom.rm[ci] = key;
      }
      if (r) {
        if (String(r[2] || '').trim() === dsl) return;
        r[2] = dsl;
        if (!r[1]) r[1] = f(13);
        return;
      }
      if (!dsl) return;
      S.db.rm.unshift([key, f(13), dsl, '', '']);
      if (!S.custom.rm.includes(key)) S.custom.rm.push(key);
    }
  };
}
/* 11-08 망령 「포켓몬마다 기술을 따로 · 웹툴에서도 그대로」: 이 포켓몬의 기술 칸 덮어쓰기 p.moves[k].ov = {type,cat,pow,acc,prio,range,contact,eff,auto}
   빈 칸은 DB 값을 따른다 (DB 가 바뀌면 따라감). 오레마스 가져오기(import.js withOv)가 DB 기술 위에 덮는다 */
const MV_OV_KEYS = ['type', 'cat', 'pow', 'acc', 'prio', 'range', 'contact', 'eff', 'auto'];
const mvOvOn = m => !!(m && m.ov && MV_OV_KEYS.some(k => m.ov[k] != null && String(m.ov[k]).trim() !== ''));
/* 11-08 망령 「노트 앱 · 한 장 요약 · 복사 글도 덮어쓴 값으로」: DB 기술 줄(배열)에 이 포켓몬의 ov 를 덮은 사본. ov 없으면 DB 줄 그대로 */
const MV_OV_IDX = { type: 5, cat: 6, pow: 7, acc: 8, range: 9, contact: 10, prio: 11, eff: 13 };
function mvRowOv(m) {
  const r = m && idx.moves.get(m.name);
  if (!mvOvOn(m)) return r;
  const a = r ? r.slice() : [];
  for (const k in MV_OV_IDX) {
    const v = m.ov[k];
    if (v != null && String(v).trim() !== '') a[MV_OV_IDX[k]] = String(v);
  }
  return a;
}
function mvView(m, r) {
  const o = (m && m.ov) || {};
  const v = (k, i) => (o[k] != null && String(o[k]).trim() !== '' ? String(o[k]) : r ? r[i] : '');
  return {
    type: v('type', 5),
    cat: v('cat', 6),
    pow: v('pow', 7),
    acc: v('acc', 8),
    prio: v('prio', 11),
    range: v('range', 9),
    contact: v('contact', 10),
    eff: v('eff', 13)
  };
}
function openMvOv(T, P, k, done) {
  const m = P.moves[+k];
  if (!m) return;
  const r = idx.moves.get(m.name);
  const o = Object.assign({}, m.ov || {});
  const dv = i => (r ? String(r[i] ?? '') : '');
  const ph = i => esc(dv(i) || '-');
  const val = k2 => esc(o[k2] == null ? '' : String(o[k2]));
  const rm0 = (S.db.rm || []).find(x => x[0] === RMMV(m.name));
  const base = rm0 && String(rm0[2] || '').trim() ? { dsl: String(rm0[2]), lab: 'DB 구문(레디메이드 「기술 : ' + m.name + '」)' } : null;
  const l = openModal(
    `<div class="mhead"><h2>「${esc(m.name)}」 · 이 포켓몬만</h2><span class="sp"></span><button class="btn ghost" data-x>닫기</button></div>
 <div class="mbody"><p class="small muted" style="margin:0">기술 DB 는 그대로 두고 <b>${esc(P.name || '이 포켓몬')}</b> 의 이 기술만 바꾼다. 빈 칸은 DB 값(흐린 글씨)을 따른다 — DB 가 나중에 바뀌면 빈 칸은 따라가고, 적은 칸은 그대로. 오레마스로 가져가면 배틀에서도 이 값으로 돈다.</p>
 <div class="fgrid">
  <label class="lbl">타입<select data-ov="type"><option value="">(DB: ${ph(5)})</option>${S.db.types.map(t => `<option value="${esc(t[0])}" ${o.type === t[0] ? 'selected' : ''}>${esc(t[0])}</option>`).join('')}<option value="무작위" ${o.type === '무작위' ? 'selected' : ''}>무작위</option></select></label>
  <label class="lbl">분류<select data-ov="cat"><option value="">(DB: ${ph(6)})</option>${['물리', '특수', '변화'].map(t => `<option ${o.cat === t ? 'selected' : ''}>${t}</option>`).join('')}</select></label>
  <label class="lbl">위력<input data-ov="pow" inputmode="numeric" value="${val('pow')}" placeholder="${ph(7)}"></label>
  <label class="lbl">명중<input data-ov="acc" inputmode="numeric" value="${val('acc')}" placeholder="${ph(8)}"></label>
  <label class="lbl">우선도<input data-ov="prio" inputmode="numeric" value="${val('prio')}" placeholder="${ph(11)}"></label>
  <label class="lbl">범위<input data-ov="range" value="${val('range')}" placeholder="${ph(9)}"></label>
  <label class="lbl">접촉<input data-ov="contact" value="${val('contact')}" placeholder="${ph(10)}"></label>
  <label class="lbl" style="grid-column:1/-1">효과 <span class="small muted">비우면 DB 글</span>${tagbarHTML()}<textarea data-ov="eff" rows="3" placeholder="${esc(brN(dv(13)))}">${esc(brN(o.eff || ''))}</textarea></label></div>
  <div data-ovauto></div><div class="preview" data-prev></div></div>
 <div class="mfoot">${mvOvOn(m) ? '<button class="btn danger" data-ovclr>덮어쓰기 지우기 (DB 그대로)</button>' : ''}<span class="sp"></span><button class="btn" data-x>취소</button><button class="btn pri" data-ovsave>저장</button></div>`,
    { wide: true }
  );
  const g = k2 => {
    const el = $(`[data-ov="${k2}"]`, l);
    return el ? el.value : '';
  };
  const ta = $('[data-ov="eff"]', l);
  bindTagbar(l, () => ta);
  const getMv = () => ({
    name: m.name,
    type: g('type') || dv(5),
    cat: g('cat') || dv(6),
    range: g('range') || dv(9),
    tag: dv(12) || dv(1),
    eff: g('eff').trim() || dv(13)
  });
  const prev = () => {
    $('[data-prev]', l).innerHTML = '<span class="small faint">미리보기 (이 포켓몬)</span><br>' + rich(getMv().eff);
  };
  const box = mvAutoBox($('[data-ovauto]', l), getMv, o.auto || '', base);
  l.addEventListener('input', e => {
    if (e.target.matches('[data-ov]')) {
      box.up();
      prev();
    }
  });
  prev();
  l.addEventListener('click', e => {
    if (e.target.closest('[data-ovclr]')) {
      delete m.ov;
      closeModal();
      toast('덮어쓰기를 지웠습니다 — DB 그대로');
      done && done();
      return;
    }
    if (!e.target.closest('[data-ovsave]')) return;
    const nv = {};
    for (const k2 of MV_OV_KEYS) {
      const v = k2 === 'auto' ? box.val() : String(g(k2)).trim();
      if (v === '') continue;
      if (['pow', 'acc', 'prio'].includes(k2) && isNaN(+v)) return toast(`${{ pow: '위력', acc: '명중', prio: '우선도' }[k2]}은 숫자로 적어 주세요`);
      if (k2 !== 'auto' && k2 !== 'eff' && String(v) === dv({ type: 5, cat: 6, pow: 7, acc: 8, prio: 11, range: 9, contact: 10 }[k2])) continue;
      if (k2 === 'eff' && v === brN(dv(13)).trim()) continue;
      if ((k2 === 'eff' || k2 === 'auto') && v.length > 1500)
        return toast(`${k2 === 'eff' ? '효과' : '구문'}은 1500자까지 — 트레이너 문서가 커지면 제작기 · 웹툴 불러오기가 느려진다`);
      nv[k2] = ['pow', 'acc', 'prio'].includes(k2) ? +v : v;
    }
    if (Object.keys(nv).length) m.ov = nv;
    else delete m.ov;
    closeModal();
    toast(Object.keys(nv).length ? `「${m.name}」 이 포켓몬만 ${Object.keys(nv).length}칸 덮어썼습니다` : '바뀐 칸이 없어 DB 그대로 둡니다');
    done && done();
  });
}
function openEdit(kind, i, { preset = {}, onSaved, nav } = {}) {
  const D = DBS[kind];
  const r =
    i < 0
      ? D.cols.map(
          (_, n) =>
            preset[n] ??
            (kind === 'moves'
              ? ({
                  0: '1.5',
                  1: '#오리지널',
                  5: '노말',
                  6: '물리',
                  7: '0',
                  8: '100',
                  9: '1체',
                  10: 'O',
                  11: '0',
                  12: '-',
                  14: '공격',
                  15: '방어',
                  17: '오리지널',
                  18: '1',
                  19: '1'
                }[n] ?? '')
              : kind === 'abil'
                ? ({ 0: '1', 3: 'X', 4: 'X', 5: '' }[n] ?? '')
                : kind === 'items'
                  ? ({ 0: '기타', 3: '-', 5: '1', 6: '-' }[n] ?? '')
                  : kind === 'cards'
                    ? ({ 11: '공용' }[n] ?? '')
                    : '')
        )
      : S.db[kind][i];
  const order = kind === 'moves' ? [2, 5, 6, 0, 7, 8, 9, 10, 11, 12, 14, 15, 18, 19, 1, 17, 3, 4, 16, 13] : D.cols.map((_, n) => n);
  const l = openModal(
    `<div class="mhead"><h2>${D.t} ${i < 0 ? '오리지널 만들기' : '수정'}</h2>${nav && i >= 0 ? `<span class="row dbnav" style="gap:2px;align-items:center"><button type="button" class="btn sm ghost" data-nav="-1" title="이전 행 (Ctrl+←)" aria-label="이전 행">‹</button><span class="small muted num" data-navpos></span><button type="button" class="btn sm ghost" data-nav="1" title="다음 행 (Ctrl+→)" aria-label="다음 행">›</button></span>` : ''}<span class="sp"></span><button class="btn ghost" data-x>닫기</button></div>
 <div class="mbody"><datalist id="L-kinds">${[...new Set(S.db.pots.map(r => r[0]))].map(k => `<option value="${esc(k)}">`).join('')}</datalist><datalist id="L-ikinds">${[...new Set(S.db.items.map(r => r[0]))].map(k => `<option value="${esc(k)}">`).join('')}</datalist>
 <div class="fgrid">${order.map(n => fieldHTML(kind, n, r[n], r, i < 0)).join('')}</div><div class="preview" data-prev></div>${kind === 'abil' ? '<div data-abassist></div>' : ''}${kind === 'moves' ? '<div data-mvassist></div>' : ''}${i >= 0 && ['abil', 'items', 'pots', 'moves', 'points', 'cards'].includes(kind) ? `<div data-rowrefs>${rowRefsHtml(kind, r[D.key])}</div>` : ''}</div>
 <div class="mfoot">${i >= 0 ? '<button class="btn danger" data-del>삭제</button>' : ''}<label class="row small" style="gap:4px" title="오리지널로 표시 · 포켓몬 만들 때 특성 · 기술 목록에서는 「오리지널 보기」를 눌러야 보인다"><input type="checkbox" data-origchk ${i < 0 || S.custom[kind].includes(r[D.key]) ? 'checked' : ''}>오리지널</label>${kind === 'moves' ? `<label class="row small" style="gap:4px" title="켜면 『올드 타입』 계열이 아닌 포켓몬의 기술 목록에는 안 뜬다"><input type="checkbox" data-oldchk ${i >= 0 && mvOldOnly(r) ? 'checked' : ''}>올드 타입 전용</label>` : ''}<span class="sp"></span><button class="btn" data-x>취소</button><button class="btn pri" data-save>저장</button></div>`,
    { wide: true }
  );
  const rgi = kind === 'moves' ? $('[data-f="9"]', l) : null;
  if (rgi)
    rgi.addEventListener('input', () => {
      $('[data-rg]', l).innerHTML = rangeGrid(rgi.value);
    });
  if (kind === 'st') {
    const inp = $('[data-f="12"]', l),
      im = $('[data-sticon]', l),
      fi = $('[data-sticonf]', l);
    const show = () => {
      im.src = stIcon(inp.value.trim());
      im.style.visibility = inp.value.trim() ? 'visible' : 'hidden';
    };
    inp.addEventListener('input', show);
    $('[data-sticonpick]', l).addEventListener('click', () => fi.click());
    fi.addEventListener('change', async () => {
      const f = fi.files[0];
      if (!f) return;
      try {
        const bmp = await createImageBitmap(f);
        const S2 = 64,
          sc = Math.min(1, S2 / Math.max(bmp.width, bmp.height));
        const cv = document.createElement('canvas');
        cv.width = Math.max(1, Math.round(bmp.width * sc));
        cv.height = Math.max(1, Math.round(bmp.height * sc));
        cv.getContext('2d').drawImage(bmp, 0, 0, cv.width, cv.height);
        let u = cv.toDataURL('image/webp', 0.85);
        if (!u.startsWith('data:image/webp')) u = cv.toDataURL('image/png');
        inp.value = u;
        show();
      } catch (err) {
        toast('그림을 읽지 못했습니다');
      }
    });
  }
  if (kind === 'cards') {
    const inp = $('[data-f="6"]', l),
      im = $('[data-cardimg]', l),
      fi = $('[data-cardimgf]', l);
    const show = () => {
      const u = cardImg(inp.value);
      im.src = u;
      im.style.visibility = u ? 'visible' : 'hidden';
    };
    inp.addEventListener('input', show);
    $('[data-cardimgpick]', l).addEventListener('click', () => fi.click());
    fi.addEventListener('change', async () => {
      const f = fi.files[0];
      fi.value = '';
      if (!f) return;
      if (!/^image\//.test(f.type)) return toast('그림 파일만');
      toast('올리는 중…');
      /* 카드 그림은 세로 720px 까지 줄여 webp 로 올린다 (한 장 수십 KB) */
      const shrink = async (maxH, q) => {
        const bmp = await createImageBitmap(f);
        const sc = Math.min(1, maxH / bmp.height);
        const cv = document.createElement('canvas');
        cv.width = Math.max(1, Math.round(bmp.width * sc));
        cv.height = Math.max(1, Math.round(bmp.height * sc));
        cv.getContext('2d').drawImage(bmp, 0, 0, cv.width, cv.height);
        return cv;
      };
      try {
        const cv = await shrink(720);
        const blob = await new Promise(r => cv.toBlob(r, 'image/webp', 0.88));
        const u = await putImg(`cards/${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`, blob || f);
        inp.value = u;
        show();
        toast('올렸습니다 — 「저장」을 누르세요');
      } catch (err) {
        toast('그림을 올리지 못했습니다: ' + ((err && err.message) || err) + ' — 주소를 직접 넣어 주세요');
      }
    });
  } /* 10-26: 글자 주소(data:) 로 넣지 않는다 — 카드 DB 줄은 공유 DB(docs)에 들어가 모든 제작기 · 오레마스가 처음에 통째로 받으니 용량이 커진다 */
  const abA = kind === 'abil' ? abilAssist(l, i >= 0 ? r[1] : '') : null;
  const mvA =
    kind === 'moves'
      ? mvAssist(l, i >= 0 ? r[2] : '')
      : null; /* 11-08 망령 「기술 쪽에도 구문 · 추천 · 지금 상태」 */ /* 11-01 망령 「특성 쪽엔 구문 도우미가 없더라고」 */
  if (kind === 'rm' && window.OM_FX) {
    const ds = $('[data-f="2"]', l),
      pv = $('[data-rmprev]', l);
    const up = () => {
      const r = window.OM_FX.parse(ds.value);
      pv.innerHTML =
        (r.ops.length ? '미리보기: ' + esc(window.OM_FX.unparse(r.ops).join(' / ')) : '<span class="muted">구문 없음</span>') +
        (r.errs && r.errs.length ? ` <span class="warn">모르는 줄: ${esc(r.errs.join(' / '))}</span>` : '');
    };
    ds.addEventListener('input', up);
    up();
  }
  if (kind === 'rm' && window.OM_FX && window.OM_FX.rmChance) {
    const pi = $('[data-f="4"]', l),
      tx = $('[data-f="1"]', l),
      nm = $('[data-f="0"]', l),
      ph = $('[data-rmpct]', l);
    const up2 = () => {
      if (!pi || !ph) return;
      const F = window.OM_FX;
      const v = pi.value.trim();
      let t = tx ? tx.value : '';
      if (!t && F.effOf && nm) {
        const mm = nm.value.match(/^(특성|소지품)\s*:\s*(.+)$/);
        t = mm ? F.effOf(mm[1] === '특성' ? 'trait' : 'item', mm[2]) : '';
      }
      const d = F.rmChance({ text: t });
      ph.textContent =
        v !== '' && +v > 0
          ? +v >= 100
            ? ' 늘 발동 (굴리지 않음)'
            : ` ${+v}% 로 굴린다`
          : d
            ? ` 지금은 글에서 읽은 ${d}% 로 굴린다`
            : ' 확률 없음 — 늘 발동';
    };
    [pi, tx, nm].forEach(x => x && x.addEventListener('input', up2));
    up2();
  } /* 10-24 망령: 레디메이드 확률 칸 */
  if (kind === 'cards') {
    const ic = $('[data-f="10"]', l);
    l.querySelectorAll('[data-cardic]').forEach(
      b =>
        (b.onclick = () => {
          if (!ic) return;
          const x = b.dataset.cardic;
          if (!x) {
            ic.value = '';
            return;
          }
          const L = cardIcons(ic.value);
          const i = L.indexOf(x);
          if (i >= 0) L.splice(i, 1);
          else {
            if (x === '★') L.length = 0;
            else {
              const j = L.indexOf('★');
              if (j >= 0) L.splice(j, 1);
            }
            L.push(x);
          }
          ic.value = L.slice(-2).join(' ');
        })
    );
  }
  if (kind === 'cards') {
    const ta = $('[data-f="9"]', l),
      pv = $('[data-cardauto]', l);
    if (ta && pv) {
      const up = () => {
        const K = window.OM_FX;
        const v = ta.value.trim();
        if (!K || !v) {
          pv.innerHTML = '';
          return;
        }
        const r = K.parse(v);
        pv.innerHTML =
          (r.ops.length ? '미리보기: ' + esc(K.unparse(r.ops).join(' / ')) : '') +
          (r.errs && r.errs.length ? ` <span class="warn">모르는 줄: ${esc(r.errs.join(' / '))}</span>` : '');
      };
      ta.addEventListener('input', up);
      up();
    }
  }
  if (kind === 'items') {
    const ds = $('[data-f="7"]', l),
      pv = $('[data-irprev]', l);
    const IR = () => window.OM_ITEMRULE;
    const up = () => {
      if (!IR()) {
        pv.innerHTML = '<span class="muted">구문 스크립트를 불러오는 중…</span>';
        return;
      }
      const t = ds.value.trim();
      if (!t) {
        const g = IR().fromEff($('[data-f="1"]', l).value, ($('[data-f="3"]', l).value === 'O' ? '소모품/' : '') + $('[data-f="4"]', l).value);
        pv.innerHTML = IR().has(g)
          ? '<span class="muted">비어 있음 — 효과 글로 자동 처리 (「효과 글에서 만들기」로 꺼내 볼 수 있다)</span>'
          : '<span class="muted">자동 처리 없음 — 손으로</span>';
        return;
      }
      const r = IR().parse(t);
      pv.innerHTML =
        (IR().has(r.rule) ? '<span class="ok">✓ 읽었다</span>' : '<span class="muted">자동으로 하는 일이 없다</span>') +
        (r.errs.length ? ` <span class="warn">모르는 줄: ${esc(r.errs.join(' / '))}</span>` : '');
    };
    ds.addEventListener('input', up);
    l.addEventListener('input', e => {
      if (e.target.matches('[data-f="1"],[data-f="3"],[data-f="4"]')) up();
    });
    $('[data-irgen]', l).addEventListener('click', () => {
      if (!IR()) return toast('구문 스크립트를 아직 불러오는 중입니다');
      const g = IR().fromEff($('[data-f="1"]', l).value, ($('[data-f="3"]', l).value === 'O' ? '소모품/' : '') + $('[data-f="4"]', l).value);
      if (!IR().has(g)) return toast('효과 글에서 자동으로 읽을 수 있는 것이 없습니다 — 도움말을 보고 직접 써 주세요');
      ds.value = IR().toText(g);
      up();
    });
    up();
    loadFx().then(up);
  }
  const ta = D.eff >= 0 ? $(`[data-f="${D.eff}"]`, l) : null;
  if (ta) {
    bindTagbar(l, () => ta);
    const upd = () => {
      $('[data-prev]', l).innerHTML = '<span class="small faint">미리보기</span><br>' + rich(ta.value);
      const h = banHits(ta.value);
      $('[data-banwarn]', l).innerHTML = (h.length ? `<span class="warn">금지 키워드: ${h.map(esc).join(', ')}</span>` : '') + lintHTML(ta.value);
    };
    ta.addEventListener('input', upd);
    upd();
  }
  /* 11-02 감우: 카드 DB 고치기 — 미리보기를 은열쇠 카드 그대로 (웹툴 손패와 같은 모양) */
  if (kind === 'cards' && window.SKCARD) {
    const pv = $('[data-prev]', l);
    {
      const fg = $('.fgrid', l);
      if (fg && pv) {
        const w = document.createElement('div');
        w.className = 'mkcrow';
        fg.before(w);
        w.append(fg, pv);
      }
    }
    const g = n => {
      const e = $(`[data-f="${n}"]`, l);
      return e ? String(e.value || '') : '';
    };
    const up = () => {
      if (!pv) return;
      pv.classList.add('mkcprev');
      pv.innerHTML =
        SKCARD.html({
          n: g(1).trim() || '(이름)',
          t: g(2),
          c: g(3).trim(),
          x: g(4),
          col: cardCol(g(5)),
          img: cardImg(g(6)),
          ic: cardIcons(g(10)),
          src: g(11).trim() || '공용',
          auto: !!g(9).trim(),
          cls: g(12).trim(),
          lim: (() => {
            const m = cardMax([, , , , , , , , , , , , , g(13)]);
            return m !== 2 ? `최대 ${m}` : '';
          })()
        }) + '<span class="small faint">웹툴 손패 · 덱 관리에 이렇게 보입니다</span>';
    };
    l.addEventListener('input', up);
    l.addEventListener('change', up);
    l.addEventListener('click', e => {
      if (e.target.closest('[data-cardic]')) setTimeout(up, 0);
    });
    const im = $('[data-cardimg]', l);
    if (im) im.addEventListener('load', up);
    up();
  }
  const okey = i >= 0 ? r[D.key] : null;
  const cur = () => (okey == null ? -1 : S.db[kind].findIndex(x => x[D.key] === okey));
  /* 11-03 감우 (20번 검토 편의 5): ‹ › 이전 · 다음 행 — DB 표에 보이는 순서(지금 필터 · 정렬) 그대로. Ctrl+← → (입력칸 밖에선 ← → 만으로도) */
  const snap = () =>
    D.cols
      .map((_, n) => {
        const el = $(`[data-f="${n}"]`, l);
        return el ? String(el.value) : '';
      })
      .join('\u0001');
  const snap0 = snap();
  const dirty = () => snap() !== snap0;
  const navKeys = () => {
    try {
      return nav() || [];
    } catch (e) {
      return [];
    }
  };
  const navPos = () => {
    const ps = $('[data-navpos]', l);
    if (!ps || okey == null) return;
    const K = navKeys();
    const at = K.indexOf(okey);
    ps.textContent = at >= 0 ? `${at + 1} / ${K.length}` : '';
    l.querySelectorAll('[data-nav]').forEach(b => {
      const d = +b.dataset.nav;
      b.disabled = at < 0 || at + d < 0 || at + d >= K.length;
    });
  };
  navPos();
  const goNav = async d => {
    if (okey == null) return;
    const K = navKeys();
    const at = K.indexOf(okey);
    const nk = K[at + d];
    if (at < 0 || nk == null) return toast(d < 0 ? '첫 행입니다' : '마지막 행입니다');
    if (dirty() && !(await ask('고친 내용을 저장하지 않았습니다. 그대로 두고 다음 행으로 넘어갈까요?', '넘어가기'))) return;
    const ii = S.db[kind].findIndex(x => x[D.key] === nk);
    if (ii < 0) return toast('그 행이 사라졌습니다');
    closeModal();
    openEdit(kind, ii, { onSaved, nav });
  };
  if (nav && i >= 0)
    l.addEventListener('keydown', e => {
      if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return;
      const inInput = e.target.matches('input,textarea,select');
      if (inInput && !e.ctrlKey && !e.metaKey) return;
      if (layers[layers.length - 1] && layers[layers.length - 1].l !== l) return;
      e.preventDefault();
      goNav(e.key === 'ArrowLeft' ? -1 : 1);
    });
  l.addEventListener('click', async e => {
    if (e.target.closest('[data-x]')) return closeModal();
    {
      const nb = e.target.closest('[data-nav]');
      if (nb) {
        goNav(+nb.dataset.nav);
        return;
      }
    }
    if (e.target.closest('[data-del]')) {
      const used = rowRefs(kind, r[D.key]);
      if (
        await ask(
          `「${esc(r[D.key])}」을(를) DB에서 삭제할까요?${used.length ? `<br><span class="warn">이 행을 쓰는 시트가 ${used.length}곳 있습니다 (${esc([...new Set(used.map(x => x.t.name || '이름 없음'))].slice(0, 5).join(', '))}${used.length > 5 ? ' …' : ''}) — 시트의 이름은 남고 효과 글만 비게 됩니다</span>` : ''}`,
          '삭제'
        )
      ) {
        const ii = cur();
        if (ii >= 0) S.db[kind].splice(ii, 1);
        reindex();
        save(true);
        closeModal();
        refreshAll();
      }
      return;
    }
    if (e.target.closest('[data-save]')) {
      if (okey != null) {
        i = cur();
        if (i < 0) return toast('이 항목은 다른 사람이 지웠습니다');
      }
      const nr = D.cols.map((_, n) => {
        const el = $(`[data-f="${n}"]`, l);
        return el ? el.value : '';
      });
      nr[D.key] = nr[D.key].trim();
      if (kind === 'moves') {
        const oc = $('[data-oldchk]', l);
        nr[MV_OLDONLY] = oc && oc.checked ? 'O' : '';
      }
      if (!nr[D.key]) return toast(D.cols[D.key] + '을(를) 입력하세요');
      if (kind === 'abil' && /\s/.test(nr[D.key]))
        setTimeout(
          () => toast('특성 이름에 띄어쓰기가 있습니다 — 「특성 : 이름」 구문 · 오레마스 DB 와 안 맞을 수 있어요'),
          1900
        ); /* 11-03: 막지는 않는다 */
      const dup = S.db[kind].findIndex(x => x[D.key] === nr[D.key]);
      if (dup >= 0 && dup !== i) return toast('같은 이름이 이미 DB에 있습니다');
      if (i < 0) {
        S.db[kind].unshift(nr);
        if (!S.custom[kind].includes(nr[D.key])) S.custom[kind].push(nr[D.key]);
      } else {
        const old = S.db[kind][i][D.key];
        S.db[kind][i] = nr;
        const ci = S.custom[kind].indexOf(old);
        if (ci >= 0) S.custom[kind][ci] = nr[D.key];
        if (old !== nr[D.key]) {
          const n = renameRefs(kind, old, nr[D.key]);
          if (n) {
            save();
            setTimeout(() => toast(`캐릭터 시트 ${n}곳의 이름도 바꿨습니다`), 1900);
          }
        }
      }
      {
        const oc = $('[data-origchk]', l);
        if (oc) {
          const ci = S.custom[kind].indexOf(nr[D.key]);
          if (oc.checked && ci < 0) S.custom[kind].push(nr[D.key]);
          else if (!oc.checked && ci >= 0) S.custom[kind].splice(ci, 1);
        }
      } /* 10-26 망령: 오리지널 구분을 직접 */
      if (kind === 'abil' && String(nr[5] || '') === '범용' && !S.custom.abil.includes(nr[1]))
        nr[5] = ''; /* 11-06: 「범용」은 오리지널일 때만 적어 둔다 (보통 특성은 빈칸 = 범용) */
      if (abA) abA.save(nr[1]);
      if (mvA) mvA.save(nr[2]);
      reindex();
      save(true);
      closeModal();
      toast('DB에 저장했습니다');
      onSaved ? onSaved(nr[D.key]) : refreshAll();
    }
  });
}
/* 오리지널 소지품 (시트에만) — DB 는 건드리지 않고 p.item · p.itemOwn 만 바꾼다. 오레마스로는 시트 그대로 넘어간다 */
function openOwnItem(P, name, done) {
  const o0 = ownItem(P) && (!name || name === P.item) ? ownItem(P) : null;
  const o = Object.assign({ name: name || '', kind: '오리지널', cons: false, sock: '-', eff: '', auto: '' }, o0 ? clone(o0) : { name: name || '' });
  const l = openModal(
    `<div class="mhead"><h2>오리지널 소지품 · 이 포켓몬만</h2><span class="sp"></span><button class="btn ghost" data-x>닫기</button></div>
 <div class="mbody"><p class="small muted" style="margin:0">소지품 DB 에는 넣지 않고 이 포켓몬 시트에만 적어 둔다. 오레마스(배틀 웹툴)로 가져가면 특성 · 포텐셜처럼 여기 적은 이름 · 효과 · 구문이 그대로 들어간다.</p>
 <datalist id="L-ikinds3">${[...new Set(S.db.items.map(r => r[0]))].map(k => `<option value="${esc(k)}">`).join('')}</datalist>
 <div class="fgrid"><label class="lbl" for="oi-name">이름<input id="oi-name" value="${esc(o.name)}"></label><label class="lbl" for="oi-kind">종류<input id="oi-kind" list="L-ikinds3" value="${esc(o.kind)}"></label>
 <label class="lbl" for="oi-cons">소모품<select id="oi-cons"><option value="" ${o.cons ? '' : 'selected'}>아니오</option><option value="O" ${o.cons ? 'selected' : ''}>소모품 (쓰면 없어짐)</option></select></label><label class="lbl" for="oi-sock">소켓<input id="oi-sock" value="${esc(o.sock)}"></label>
 <label class="lbl" for="oi-eff" style="grid-column:1/-1">효과${tagbarHTML()}<textarea id="oi-eff" rows="4">${esc(brN(o.eff))}</textarea><span class="small" data-banwarn></span></label>
 <label class="lbl" for="oi-auto" style="grid-column:1/-1">구문 <span class="small muted">오레마스 배틀이 자동으로 처리하는 법 · 한 줄에 하나 · 비우면 효과 글을 읽는다</span><textarea id="oi-auto" rows="3" style="font-family:var(--mono,monospace);font-size:12.5px" placeholder="예) 턴 종료: 회복 1/16">${esc(o.auto)}</textarea><span class="row" style="gap:6px;align-items:center;flex-wrap:wrap"><button type="button" class="btn sm" data-irgen>효과 글에서 만들기</button><span class="small" data-irprev></span></span><details><summary class="small">구문 도움말</summary><pre class="small" style="white-space:pre-wrap">${esc(IR_HELP)}</pre></details></label></div>
 <div class="preview" data-prev></div></div>
 <div class="mfoot">${o0 ? '<button class="btn danger" data-oidel>소지품 빼기</button>' : ''}<span class="sp"></span><button class="btn" data-x>취소</button><button class="btn pri" data-oisave>저장</button></div>`,
    { wide: true }
  );
  const ta = $('#oi-eff', l),
    ds = $('#oi-auto', l),
    pv = $('[data-irprev]', l),
    IR = () => window.OM_ITEMRULE;
  bindTagbar(l, () => ta);
  const gen = () => IR().fromEff($('#oi-name', l).value, ($('#oi-cons', l).value === 'O' ? '소모품/' : '') + ta.value);
  const up = () => {
    $('[data-prev]', l).innerHTML = '<span class="small faint">미리보기</span><br>' + rich(ta.value);
    const h = banHits(ta.value);
    $('[data-banwarn]', l).innerHTML = (h.length ? `<span class="warn">금지 키워드: ${h.map(esc).join(', ')}</span>` : '') + lintHTML(ta.value);
    if (!IR()) {
      pv.innerHTML = '<span class="muted">구문 스크립트를 불러오는 중…</span>';
      return;
    }
    const t = ds.value.trim();
    if (!t) {
      pv.innerHTML = IR().has(gen())
        ? '<span class="muted">비어 있음 — 효과 글로 자동 처리</span>'
        : '<span class="muted">자동 처리 없음 — 손으로</span>';
      return;
    }
    const r = IR().parse(t);
    pv.innerHTML =
      (IR().has(r.rule) ? '<span class="ok">✓ 읽었다</span>' : '<span class="muted">자동으로 하는 일이 없다</span>') +
      (r.errs.length ? ` <span class="warn">모르는 줄: ${esc(r.errs.join(' / '))}</span>` : '');
  };
  l.addEventListener('input', up);
  l.addEventListener('change', up);
  up();
  loadFx().then(up);
  $('[data-irgen]', l).addEventListener('click', () => {
    if (!IR()) return toast('구문 스크립트를 아직 불러오는 중입니다');
    const g = gen();
    if (!IR().has(g)) return toast('효과 글에서 자동으로 읽을 수 있는 것이 없습니다 — 도움말을 보고 직접 써 주세요');
    ds.value = IR().toText(g);
    up();
  });
  l.addEventListener('click', async e => {
    if (e.target.closest('[data-x]')) return closeModal();
    if (e.target.closest('[data-oidel]')) {
      if (await ask(`「${esc(P.item)}」을(를) 이 포켓몬에서 뺄까요?`, '빼기')) {
        P.item = '';
        delete P.itemOwn;
        closeModal();
        save();
        done && done();
      }
      return;
    }
    if (e.target.closest('[data-oisave]')) {
      const nm = $('#oi-name', l).value.trim();
      if (!nm) return toast('이름을 입력하세요');
      if (
        idx.items.get(nm) &&
        !(await ask(
          `소지품 DB 에 「${esc(nm)}」이(가) 이미 있어서 여기 적은 효과보다 DB 의 것이 먼저 쓰입니다. 그래도 이 이름으로 둘까요?`,
          '그대로 두기'
        ))
      )
        return;
      if (Array.isArray(P.pots)) {
        const T = tuneOf(P);
        if (T.itemName && T.itemName === P.item && P.item !== nm) T.itemName = nm;
      }
      P.item = nm;
      P.itemOwn = {
        name: nm,
        kind: $('#oi-kind', l).value.trim() || '오리지널',
        cons: $('#oi-cons', l).value === 'O',
        sock: $('#oi-sock', l).value.trim() || '-',
        eff: ta.value,
        auto: ds.value.trim()
      };
      closeModal();
      save();
      toast('이 포켓몬 시트에만 적었습니다 (DB 는 그대로)');
      done && done();
    }
  });
}
function renameRefs(kind, a, b) {
  let n = 0;
  for (const t of S.trainers) {
    if (kind === 'points') t.pts = t.pts.map(x => (x === a ? (n++, b) : x));
    for (const p of t.pokemon) {
      if (kind === 'moves')
        p.moves.forEach(m => {
          if (m.name === a) {
            m.name = b;
            n++;
          }
        });
      if (kind === 'abil' && p.ability === a) {
        p.ability = b;
        n++;
      }
      if (kind === 'items' && p.item === a) {
        p.item = b;
        n++;
      }
      if (kind === 'pots')
        p.pots.forEach((x, i) => {
          if (x === a) {
            p.pots[i] = b;
            n++;
          }
        });
    }
  }
  return n;
}

/* 11-03: 이 DB 행을 쓰는 시트 — [{t, p?, where}] (특성 · 소지품(2 · 3번 칸 · 폼 포함) · 포텐셜(폼 포함) · 기술 · 포인트 · 카드) */
function rowRefs(kind, key) {
  const out = [];
  const add = (t, p, where) => out.push({ t, p, where });
  for (const t of S.trainers) {
    if (kind === 'points' && (t.pts || []).includes(key)) add(t, null, '포인트');
    if (kind === 'cards' && (t.deck || []).some(x => x && x.n === key)) add(t, null, '덱');
    for (const p of t.pokemon || []) {
      if (kind === 'moves' && (p.moves || []).some(m => m && m.name === key)) add(t, p, '기술');
      if (kind === 'abil') {
        if (p.ability === key) add(t, p, '특성');
        (p.forms || []).forEach((f, k) => {
          if (f && f.ability === key) add(t, p, `폼 ${k + 1} 특성`);
        });
      }
      if (kind === 'items') {
        if (p.item === key) add(t, p, '소지품');
        (p.items2 || []).forEach((x, k) => {
          if (x && x.item === key) add(t, p, `소지품 ${k + 2}`);
        });
      }
      if (kind === 'pots') {
        if ((p.pots || []).includes(key)) add(t, p, '포텐셜');
        (p.forms || []).forEach((f, k) => {
          if (f && (f.pots || []).some(x => x && x.name === key)) add(t, p, `폼 ${k + 1} 포텐셜`);
        });
      }
      if (kind === 'old' && (p.forms || []).some(f => f && f.name === key)) add(t, p, '폼 (올드 타입)');
    }
  }
  return out;
}
function rowRefsHtml(kind, key) {
  const L = rowRefs(kind, key);
  if (!L.length) return '<span class="small muted">이 행을 쓰는 시트가 없습니다</span>';
  return `<div class="small" style="margin-top:6px"><b>이 행을 쓰는 시트</b> <span class="muted">${L.length}곳 · 누르면 그 시트로</span><div class="row" style="flex-wrap:wrap;gap:4px;margin-top:4px">${L.map(x => `<button type="button" class="btn xs ghost" data-goto-t="${esc(x.t.id)}" data-goto-p="${esc(x.p ? x.p.id : '')}">${esc(x.t.name || '이름 없음')}${x.p ? ' › ' + esc(x.p.name || '이름 없음') : ''} <span class="muted">${esc(x.where)}</span></button>`).join('')}</div></div>`;
}
/* 시트로 가기: 캐릭터 탭 → 트레이너 펼치고 (포켓몬이면 그 포켓몬도) 스크롤 */
function gotoSheet(tid, pid) {
  const t = S.trainers.find(x => x.id === tid);
  if (!t) return false;
  closeAllModals();
  if (S.ui.tab !== 'char') showTab('char');
  t.open = true;
  if (pid) {
    const p = t.pokemon.find(x => x.id === pid);
    if (p) p.open = true;
  }
  save();
  renderChar();
  const el = document.getElementById(pid ? 'pk-' + pid : 'tr-' + tid) || document.getElementById('tr-' + tid);
  if (el) {
    const r = MKROOT(),
      hd = r.querySelector('.top');
    r.scrollTo({ top: Math.max(0, el.getBoundingClientRect().top - r.getBoundingClientRect().top + r.scrollTop - (hd ? hd.offsetHeight : 0) - 10) });
    el.classList.add('flash');
    setTimeout(() => el.classList.remove('flash'), 1600);
  }
  return true;
}
document.addEventListener('click', e => {
  const b = e.target.closest && e.target.closest('[data-goto-t]');
  if (!b) return;
  e.preventDefault();
  gotoSheet(b.dataset.gotoT, b.dataset.gotoP || '');
});

