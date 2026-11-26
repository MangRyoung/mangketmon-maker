/* ── 조각 15_tables_tabs.js — 렌더: 테이블 · 탭 ── */
/* ---------- 렌더: 테이블 ---------- */
function misagPanel() {
  const M = MR();
  const f = (k, l, w, note) =>
    `<label class="row small" style="gap:4px">${l}<input data-p="db.rules.misag.${k}" value="${esc(M[k] ?? '')}" style="width:${w || '52px'}">${note ? `<span class="faint">${note}</span>` : ''}</label>`;
  const ex = (() => {
    const r = sockRow('C');
    const six = r ? +r[4] || 0 : 0;
    const gm = (() => {
      const v = (S.db.soloSock || {}).C;
      return v != null && v !== '' ? +v : Math.round((six / 3) * 2) / 2;
    })();
    const cmd = TPL_DEF.find(x => x[0] === '통솔' && x[1] === 'C' && misagCmd(x[2]));
    return `예: 육성 C · 통솔 C → PL PT 기술점 ${Math.round((six - gm) * 100) / 100} · 각성체 ${gm}${cmd ? ` · PL 통솔점 ${mRound((+cmd[3] || 0) * fracNum(M.cmdRatio, 4 / 6))}` : ''} · 분배레벨 6체 값 그대로`;
  })();
  return `<div class="panel" style="grid-column:1/-1"><h3>미사그 대학 (4+2) · 각성체와 대가<span class="sp"></span><button class="btn sm" data-tact="ruMgAdd">+ 통솔 항목</button><button class="btn sm" data-tact="ruMgReset">기본값</button></h3>
  <p class="small muted" style="margin:0 0 6px">포인트 칸에서 「미사그 대학 (4+2)」를 고른 트레이너에 쓰입니다. 각성체(GM 제작)는 통솔점을 쓰지 않고, 각성 (대가) 1체의 프라이드 등급만큼 PL 쪽이 대가를 치릅니다. 각성 (보조)는 대가가 없고 프라이드는 통솔을 따릅니다 (아래 「각성 (보조) 프라이드」 · 11-03: D → D · C → C · B → B · A → B+). 미사그에서는 「통솔 D 현대종 한 단계 아래」 보정을 쓰지 않습니다. A는 같은 분류의 B를 포함합니다.</p>
  <div class="row" style="gap:12px;flex-wrap:wrap"><b class="small">구성 · 자원</b>${f('free', '각성 (대가) 수')}${f('fixC', '각성 (보조) 수')}${f('subPr', '각성 (보조) 프라이드 (통솔:프라이드)', '190px')}${f('cmdItems', '4/6로 나눌 항목', '90px')}${f('subRatio', '서브 몫 (PL 4체 대비 · 통솔점 · PT 기술점)', '60px')}${f('subRound', '서브 맞춤 floor/round/ceil', '60px')}${f('cmdRatio', '비율', '52px')}${f('cmdUnit', '단위')}<label class="row small" style="gap:4px">맞춤<select data-p="db.rules.misag.cmdRound">${[
    ['floor', '내림'],
    ['round', '반올림'],
    ['ceil', '올림']
  ]
    .map(([v, l]) => `<option value="${v}" ${M.cmdRound === v ? 'selected' : ''}>${l}</option>`)
    .join('')}</select></label>${f('distCap', '분배레벨 1체 상한 ±')}</div>
  <div class="row" style="gap:12px;flex-wrap:wrap;margin-top:6px"><b class="small">2체 · 3계제권</b>${f('g3', '3계제권 육성:각성체 개수:PL 3개 개체 수 (쉼표)', '230px')}<label class="row small" style="gap:4px">B-1 이면 각성체 둘 다 지정 타입<select data-p="db.rules.misag.twoB1">${[
    ['1', '검사'],
    ['0', '안 함']
  ]
    .map(([v, l]) => `<option value="${v}" ${String(M.twoB1 ?? '1') === v ? 'selected' : ''}>${l}</option>`)
    .join('')}</select></label><label class="row small" style="gap:4px">각성체 역할 중복 불가<select data-p="db.rules.misag.twoRole">${[
    ['1', '검사'],
    ['0', '안 함']
  ]
    .map(([v, l]) => `<option value="${v}" ${String(M.twoRole ?? '1') === v ? 'selected' : ''}>${l}</option>`)
    .join('')}</select></label></div>
  <div class="row" style="gap:12px;flex-wrap:wrap;margin-top:6px"><b class="small">등급</b>${f('grade', '프라이드:등급 (쉼표 · 「-」는 대가 없음)', '300px')}</div>
  <div class="row" style="gap:12px;flex-wrap:wrap;margin-top:6px"><b class="small">대가 숫자</b>${f('ordB', '지시 B · 6령 빼기')}${f('ordA', '지시 A 추가 · 4식 빼기')}${f('distB', '육성 B · 분배레벨 −')}${f('distA', '육성 A 추가 · 분배레벨 −')}${f('typeN', '통솔 B-1 타입 수')}${f('exclB', '능력 B · 전용 −')}${f('awExcl', '각성체 전용 (2체 합 · 1체에도 최대 · 능력 AA 이상은 ×2)')}${f('plCut', '각성체 상시 자유 대신 PL 전용 − (능력:개수)', '150px')}${f('uqA', '능력 A 추가 · 고유 점수 −')}${f('exclA', '능력 A 추가 (전용으로 고르면) · 전용 −')}${f('uqOn', '고유 점수 상시')}${f('uqOnce', '단발')}</div>
  <p class="small muted" style="margin:6px 0">${esc(ex)} · PT 기술점 각성체 몫은 위 「1인 기준 (2체) PT 기술점」 표, 각성체 2체 분배레벨은 기초 템플릿의 「1인」 칸을 씁니다. 전용 포텐셜은 각성체 1체에 「각성체 전용」 개수(능력 D 면 1체만)를 따로 받고, 능력 표 개수는 PL 4체 몫입니다. 3계제권은 시트에 안내만 합니다(계제 · 속별 개수 자동 검사는 아직 없음). 오레마스는 통솔 항목 이름 B-2 · A-1 · A-2 로 배틀 중 포텐셜 발동을 막습니다.</p>
  <div class="tw"><table><tr><th>통솔 항목</th><th>등급</th><th>설명</th><th>대상</th><th></th></tr>${(M.items || [])
    .map(
      (r, i) =>
        `<tr><td><input data-p="db.rules.misag.items.${i}.0" value="${esc(r[0] ?? '')}" style="width:64px"></td><td><select data-p="db.rules.misag.items.${i}.1">${['B', 'A'].map(v => `<option ${String(r[1]).toUpperCase() === v ? 'selected' : ''}>${v}</option>`).join('')}</select></td><td><input data-p="db.rules.misag.items.${i}.2" value="${esc(r[2] ?? '')}" style="width:100%;min-width:260px"></td><td><select data-p="db.rules.misag.items.${i}.3">${[
          ['', '없음'],
          ['type', '특정 타입'],
          ['role', '역할']
        ]
          .map(([v, l]) => `<option value="${v}" ${(r[3] || '') === v ? 'selected' : ''}>${l}</option>`)
          .join('')}</select></td><td><button class="btn sm ghost danger" data-tact="ruMgDel" data-i="${i}">×</button></td></tr>`
    )
    .join('')}</table></div></div>`;
}
function rulesPanels() {
  const R = RULES(),
    I = R.invest;
  const inp = (k, l, w, ph) =>
    `<label class="row small" style="gap:4px">${l}<input data-p="db.rules.invest.${k}" value="${esc(I[k] ?? '')}" style="width:${w || '56px'}" ${ph ? `placeholder="${esc(ph)}"` : ''}></label>`;
  return `${misagPanel()}<div class="panel" style="grid-column:1/-1"><h3>룰 상수 · 자질 투자 규칙<span class="sp"></span><button class="btn sm" data-tact="ruInvReset">기본값</button></h3>
  <p class="small muted" style="margin:0 0 6px">기본·능력치 탭 「자질」의 투자 점검에 쓰입니다. 자질 이름은 지시·육성·통솔·능력, 여러 개는 쉼표, 조합은 「+」로 적습니다.</p>
  <div class="row" style="gap:14px;flex-wrap:wrap">${inp('allow', '투자 횟수 (기본)')}${inp('allowD', '「D」 조정 시 투자 횟수')}${inp('dMax', '「D」로 내릴 수 있는 자질 수')}${inp('dPair', '「D」 조정 시 합산 제한 자질', '110px', '육성+통솔')}${inp('dPairMax', '그 합 상한')}${inp('banPair', '「A」 이상 동시 금지 조합', '150px', '육성+능력')}${inp('banAA', '「AA」 금지 자질', '120px', '육성,통솔')}</div></div>
 <div class="panel" style="grid-column:1/-1"><h3>룰 상수 · 고유·전용 포텐셜 개수<span class="sp"></span><button class="btn sm" data-tact="ruAbilAdd">+ 행</button><button class="btn sm" data-tact="ruAbilReset">기본값</button></h3>
  <p class="small muted" style="margin:0 0 6px">능력 랭크별 『고유 포텐셜』 칸 수와 전용 포텐셜 개수입니다. 「고유 칸 수」만큼 트레이너에 빈 고유 칸이 생기고, 전용 개수는 포켓몬 시트의 점검에 쓰입니다. 1인 기준 (2체) 트레이너는 오른쪽 두 칸을 씁니다.</p>
  <div class="tw"><table><tr><th>능력 랭크</th><th class="n">고유 칸 수</th><th>고유 표시</th><th class="n">전용 개수</th><th>전용 설명</th><th class="n">1인 전용</th><th>1인 전용 설명</th><th></th></tr>${R.abil.map((r, i) => `<tr>${[0, 1, 2, 3, 4, 5, 6].map(j => `<td${j === 1 || j === 3 || j === 5 ? ' class="n"' : ''}><input data-p="db.rules.abil.${i}.${j}" value="${esc(r[j] ?? '')}" style="width:${j === 0 ? '56px' : j === 1 || j === 3 || j === 5 ? '52px' : '100%'};${j === 4 || j === 6 ? 'min-width:200px' : j === 2 ? 'min-width:110px' : ''}"></td>`).join('')}<td><button class="btn sm ghost danger" data-tact="ruAbilDel" data-i="${i}">×</button></td></tr>`).join('')}</table></div></div>
 <div class="panel" style="grid-column:1/-1"><h3>룰 상수 · 타입 상성표 (PT 일관성)<span class="sp"></span><button class="btn sm" data-tact="ruTyAdd">+ 타입</button><button class="btn sm" data-tact="ruTyReset">기본값</button></h3>
  <p class="small muted" style="margin:0 0 6px">타입 배분 탭의 공통 약점 · 못 막는 타입 계산에만 쓰입니다. 공격 타입마다 효과가 굉장한 / 별로인 / 없는 방어 타입을 쉼표로 적습니다.</p>
  <div class="tw" style="max-height:420px;overflow:auto"><table><tr><th>공격 타입</th><th>2배</th><th>1/2배</th><th>무효</th><th></th></tr>${R.ty.map((r, i) => `<tr>${[0, 1, 2, 3].map(j => `<td><input data-p="db.rules.ty.${i}.${j}" value="${esc(r[j] ?? '')}" style="width:${j === 0 ? '72px' : '100%'};${j ? 'min-width:150px' : ''}"></td>`).join('')}<td><button class="btn sm ghost danger" data-tact="ruTyDel" data-i="${i}">×</button></td></tr>`).join('')}</table></div></div>`;
}
function roTable(title, head, rows) {
  return `<div class="panel"><h3>${title}</h3><div class="tw" style="max-height:360px;overflow:auto"><table><tr>${head.map(h => `<th>${h}</th>`).join('')}</tr>${rows.map(r => `<tr>${r.map(x => `<td class="num">${esc(x)}</td>`).join('')}</tr>`).join('')}</table></div></div>`;
}
function renderTbl() {
  $('#v-tbl').innerHTML =
    `<div class="intro"><h1>테이블·계산식</h1><p>시트 「테이블(더블)」의 계산 규칙과 랭크 템플릿, 포텐셜 태그 사전입니다. 템플릿과 태그 사전은 여기서 고치면 바로 적용됩니다.</p></div>
 <div class="cgrid">
 <div class="panel" style="grid-column:1/-1" id="banBox">${banBoxHTML()}</div>
 <div class="panel" style="grid-column:1/-1"><h3>실수치 계산식 · 테이블(더블) Q198:Q203</h3><div class="formula">레벨 = 육성 랭크 레벨(랭크→레벨 표 D열) + 분배 레벨<br>HP = ⌊ ⌊종족치 × 2 + 개체치 + 노력치/4⌋ × 레벨/100 ⌋ + 10 + 레벨<br>그 외 = ⌊ ( ⌊ ⌊종족치 × 2 + 개체치 + 노력치/4⌋ × 레벨/100 ⌋ + 5 ) × 성격 보정 ⌋<br><span class="faint">이 제작기는 개체치·노력치·성격을 쓰지 않으므로 각각 0 · 0 · 1.0으로 계산합니다. 복사용 텍스트의 노력치 칸은 빈칸으로 유지됩니다.</span></div></div>
 <div class="panel" style="grid-column:1/-1"><h3>랭크별 기초 템플릿<span class="sp"></span><button class="btn sm" data-tact="tplAdd">+ 행</button><button class="btn sm" data-tact="tplReset">기본값</button></h3>
  <p class="small muted" style="margin:0 0 6px">자질 랭크를 바꾸면 해당 자질의 행이 트레이너 포인트 기본값에 자동으로 들어갑니다. 「공통 / *」 행은 새 트레이너와 「템플릿 다시 적용」 때 들어갑니다. 트레이너의 「1인 기준 (2체)」가 켜져 있으면 「값 (1인)」을, 꺼져 있으면 「값 (6체)」를 씁니다. 1인 값은 룰북 「1인 기준 (2체)」 장의 시안이 기본값으로 들어가 있고, 빈 칸은 다시 열 때 기본값(없으면 6체 값)으로 채워집니다. 비고가 「추정」「시안」인 값은 룰북을 보고 맞춰 주세요.</p>
  <div class="tw"><table><tr><th>자질</th><th>랭크</th><th>항목</th><th class="n">값 (6체)</th><th class="n">값 (1인)</th><th class="n" title="비워 두면 6체 값 × 비율(아래 「1인 기준 (3체)」)로 계산">값 (3체)</th><th>비고</th><th></th></tr>${S.db.tpl.map((r, i) => `<tr><td>${sel(`db.tpl.${i}.0`, r[0], ['공통', ...QUAL], { style: 'width:76px' })}</td><td><input data-p="db.tpl.${i}.1" value="${esc(r[1])}" style="width:60px"></td><td><input data-p="db.tpl.${i}.2" value="${esc(r[2])}" list="L-tplitems"></td><td class="n"><input data-p="db.tpl.${i}.3" value="${esc(r[3])}" inputmode="decimal" style="width:60px"></td><td class="n"><input data-p="db.tpl.${i}.5" value="${esc(r[5] ?? '')}" inputmode="decimal" style="width:60px"></td><td class="n"><input data-p="db.tpl.${i}.6" value="${esc(r[6] ?? '')}" inputmode="decimal" style="width:60px" placeholder="${esc(String(s3val(r[3], r[5])))}" title="비워 두면 자동 (${esc(String(s3val(r[3], r[5])))})"></td><td><input data-p="db.tpl.${i}.4" value="${esc(r[4])}"></td><td><button class="btn sm ghost danger" data-tact="tplDel" data-i="${i}" aria-label="삭제">✕</button></td></tr>`).join('')}</table></div>
  <datalist id="L-tplitems">${ptItems()
    .map(r => `<option value="${esc(r[0])}">`)
    .join('')}</datalist></div>
 ${prideRulePanel()}
 <div class="panel" style="grid-column:1/-1"><h3>트레이너 포인트 항목<span class="sp"></span><button class="btn sm" data-tact="ptiAdd">+ 항목</button><button class="btn sm" data-tact="ptiApply" title="모든 트레이너의 기본값을 이 표와 랭크 템플릿으로 다시 맞춥니다">모든 트레이너에 적용</button><button class="btn sm" data-tact="ptiReset">기본값</button></h3>
  <p class="small muted" style="margin:0 0 6px">캐릭터 시트의 「포인트」 표에 나오는 항목입니다. 기본값은 새 트레이너에 들어가고, 자질 랭크에 따라 바뀌는 값은 아래 「랭크별 기초 템플릿」이 덮어씁니다. 이름을 바꾸면 모든 트레이너의 같은 항목 이름도 함께 바뀝니다.</p>
  <div class="tw"><table><tr><th>항목 이름</th><th class="n">기본값</th><th>자동 소모</th><th></th></tr>${ptItems()
    .map(
      (r, i) =>
        `<tr><td><input data-pti="${i}.0" value="${esc(r[0])}"></td><td class="n"><input data-pti="${i}.1" value="${esc(r[1])}" inputmode="decimal" style="width:64px"></td><td><select data-pti="${i}.2">${Object.entries(
          PTI_AUTO
        )
          .map(([v, l]) => `<option value="${v}" ${(r[2] || '') === v ? 'selected' : ''}>${esc(l)}</option>`)
          .join('')}</select></td><td><button class="btn sm ghost danger" data-tact="ptiDel" data-i="${i}" aria-label="삭제">✕</button></td></tr>`
    )
    .join('')}</table></div></div>
 <div class="panel" style="grid-column:1/-1"><h3>소지품 해금 표<span class="sp"></span><button class="btn sm" data-tact="ilAdd">+ 장소</button></h3>
  <p class="small muted" style="margin:0 0 6px">비워 두면 모든 소지품이 「기본」입니다. 장소마다 특제 품목을 쉼표로 적고, 조건이 채워지면 「열림」으로 바꾸세요. 소지품 검색 창에 잠김·열림 표시와 「해금」「장소」 필터가 생기고, 포켓몬 시트의 소지품 칸에도 표시됩니다.</p>
  <div class="tw"><table><tr><th>장소</th><th>특제 품목 (쉼표)</th><th>해금 조건</th><th>상태</th><th></th></tr>${(S.db.ilock || []).map((r, i) => `<tr><td><input data-p="db.ilock.${i}.0" value="${esc(r[0])}" style="width:150px"></td><td><input data-p="db.ilock.${i}.1" value="${esc(r[1])}" list="L-inames" style="width:100%;min-width:280px"></td><td><input data-p="db.ilock.${i}.2" value="${esc(r[2])}" style="min-width:200px"></td><td>${sel(`db.ilock.${i}.3`, r[3] || '잠김', ['잠김', '열림'], { style: 'width:76px' })}</td><td><button class="btn sm ghost danger" data-tact="ilDel" data-i="${i}" aria-label="삭제">✕</button></td></tr>`).join('')}</table></div>
  <datalist id="L-inames">${S.db.items
    .filter(r => r[1])
    .map(r => `<option value="${esc(r[1])}">`)
    .join('')}</datalist></div>
 <div class="panel" style="grid-column:1/-1"><h3>기술 소켓 규칙</h3><div class="row"><label class="row small" for="oldsock">『올드 타입』 계열(${OLDK.map(esc).join('·')})의 PT 기술점<input id="oldsock" data-p="db.oldSock" value="${esc(S.db.oldSock ?? 5.5)}" inputmode="decimal" style="width:64px"></label><span class="small muted">룰북: 기술 4개만 익히고 PT 전체 기술 소켓에서 고정 5.5점 소모 · 「기술 할인」을 체크하면 교배기·유전기 1개 습득</span></div>
  <div class="row" style="margin-top:8px;gap:14px"><span class="small"><b>1인 기준 (2체) PT 기술점</b> · 육성 랭크별</span>${['D', 'C', 'B', 'A'].map(r => `<label class="row small" style="gap:4px">${r}<input data-p="db.soloSock.${r}" value="${esc((S.db.soloSock || {})[r] ?? '')}" inputmode="decimal" style="width:56px"></label>`).join('')}<span class="small muted">룰북 「1인 기준 (2체)」 장 시안 · 6체 기준(32 / 34 / 35.5 / 37)의 1/3</span></div>
  <div class="row" style="margin-top:8px;gap:14px">${(() => {
    const R = RULES();
    if (!R.soloOrd) R.soloOrd = clone(SOLO_ORD_DEF);
    return `<span class="small"><b>1인 기준 (2체) 지시 고르기</b> · 트레이너가 고르는 수</span><label class="row small" style="gap:4px">ORDER (4식 중)<input data-p="db.rules.soloOrd.o" value="${esc(R.soloOrd.o ?? '')}" inputmode="numeric" style="width:48px">개</label><label class="row small" style="gap:4px">COMMAND (6령 중)<input data-p="db.rules.soloOrd.c" value="${esc(R.soloOrd.c ?? '')}" inputmode="numeric" style="width:48px">개</label><span class="small muted">「1인 기준 (2체)」을 켠 트레이너는 시트의 지시 체계에서 이만큼만 골라 쓴다 · 고르지 않은 항목은 0회</span>`;
  })()}</div>
  <div class="row" style="margin-top:8px;gap:12px;flex-wrap:wrap">${(() => {
    const R = RULES();
    if (!R.solo3) R.solo3 = clone(SOLO3_DEF);
    const Q = R.solo3;
    const inp3 = (k, w, lab, mode) =>
      `<label class="row small" style="gap:4px">${lab}<input data-p="db.rules.solo3.${k}" value="${esc(Q[k] ?? '')}" inputmode="${mode || 'decimal'}" style="width:${w}px"></label>`;
    return `<span class="small"><b>1인 기준 (3체)</b> · 6체 기준 자원 × 비율</span>${inp3('ratio', 52, '비율')}${inp3('unit', 48, '템플릿 단위')}<label class="row small" style="gap:4px">맞춤<select data-p="db.rules.solo3.round">${[
      ['ceil', '올림'],
      ['round', '반올림'],
      ['floor', '내림']
    ]
      .map(([v, l]) => `<option value="${v}" ${Q.round === v ? 'selected' : ''}>${l}</option>`)
      .join(
        ''
      )}</select></label>${inp3('ptUnit', 48, 'PT 기술점 단위')}<label class="row small" style="gap:4px">2체와 6체가 같은 항목은 그대로<select data-p="db.rules.solo3.keep"><option value="1" ${Q.keep === '1' ? 'selected' : ''}>예</option><option value="0" ${Q.keep !== '1' ? 'selected' : ''}>아니오</option></select></label>${inp3('partner', 40, '파트너', 'numeric')}${inp3('o', 40, 'ORDER 고르기', 'numeric')}${inp3('c', 40, 'COMMAND 고르기', 'numeric')}
    <span class="small muted" style="flex-basis:100%">예: 통솔 C 통솔점 6 → ${s3val(6, '')} · PT 기술점 육성 C ${(sockRow('C') || [])[4] ?? '?'} → ${s3num((+(sockRow('C') || [])[4] || 0) * (+Q.ratio || 0.5), 'ptUnit')} · 【1/시】 3 → ${s3val(3, '1')} · 파트너 할인은 파트너에게만(6체와 같음). 「랭크별 기초 템플릿」의 「값 (3체)」에 숫자를 넣으면 그 값이 먼저다.</span>`;
  })()}</div></div>
 <div class="panel" style="grid-column:1/-1"><h3>포켓몬 시트 템플릿<span class="sp"></span><button class="btn sm" data-tact="stplAll" title="모든 트레이너의 포켓몬 시트에서 빠진 템플릿 포텐셜만 빈 슬롯에 넣습니다 (와일드 역할은 건너뜀)">모든 포켓몬에 적용</button><button class="btn sm" data-tact="stplAdd">+ 행</button><button class="btn sm" data-tact="stplReset">기본값</button></h3>
  <p class="small muted" style="margin:0 0 6px">새 포켓몬 시트를 만들 때와 「시트 템플릿 적용」을 누를 때 들어가는 포텐셜입니다. 자질이 「기본」인 행은 항상, 나머지는 트레이너의 해당 자질이 그 랭크일 때 추가됩니다. 랭크는 「B」라고 쓰면 B 이상, 「C~B」처럼 쓰면 그 범위만입니다. 같은 이름이 여러 행이면 아래 행이 이깁니다.<br><b>대상</b> · 「전원」 「파트너」 「N체」(트레이너 포켓몬 중 N체까지) 「파트너 N체」. 「2체/1체」처럼 「/」로 나누면 1인 기준(2체) 트레이너는 뒤쪽을 씁니다. 1인 기준에서는 2체 모두 파트너로 봅니다.<br>같은 큰 종류(역할·종족 등)가 이미 채워져 있으면 그만큼 빼고 넣습니다. 『전용』은 능력 랭크에 따라 「+ 전용 칸」으로 따로 넣습니다.</p>
  <div class="tw"><table><tr><th>자질</th><th>랭크</th><th>종류(순서)</th><th>포텐셜 이름</th><th>대상</th><th>비고</th><th></th></tr>${(S.db.stpl || []).map((r, i) => `<tr><td>${sel(`db.stpl.${i}.0`, r[0], ['기본', ...QUAL], { style: 'width:76px' })}</td><td><input data-p="db.stpl.${i}.1" value="${esc(r[1])}" style="width:60px" ${r[0] === '기본' ? 'disabled placeholder="-"' : 'placeholder="B · C~B"'}></td><td><input data-p="db.stpl.${i}.2" value="${esc(r[2])}" list="L-stplk" style="width:120px"></td><td><input data-p="db.stpl.${i}.3" value="${esc(r[3])}" list="L-stpln"></td><td><input data-p="db.stpl.${i}.5" value="${esc(r[5] ?? '')}" list="L-stplt" placeholder="전원" style="width:92px"></td><td><input data-p="db.stpl.${i}.4" value="${esc(r[4])}"></td><td><button class="btn sm ghost danger" data-tact="stplDel" data-i="${i}" aria-label="삭제">✕</button></td></tr>`).join('')}</table></div>
  <datalist id="L-stplt">${['전원', '파트너', '1체', '2체', '파트너 1체', '파트너 2체', '2체/1체', '4체/전원'].map(k => `<option value="${k}">`).join('')}</datalist><datalist id="L-stplk">${[...new Set(S.db.pots.map(r => r[0]))].map(k => `<option value="${esc(k)}">`).join('')}</datalist><datalist id="L-stpln">${S.db.pots
    .filter(r => /포텐셜|○/.test(r[1]))
    .map(r => `<option value="${esc(r[1])}">`)
    .join('')}</datalist></div>
 ${rulesPanels()}
 <div class="panel" style="grid-column:1/-1"><h3>포텐셜 태그 사전<span class="sp"></span><button class="btn sm" data-tact="tagAdd">+ 태그</button><button class="btn sm" data-tact="tagReset">기본값</button></h3>
  <p class="small muted" style="margin:0 0 6px">포텐셜·특성 편집 창의 태그 버튼이 이 목록으로 만들어집니다. 변형은 「|」로 구분하면 버튼을 눌렀을 때 고를 수 있습니다.</p>
  <div class="tw"><table><tr><th>태그</th><th>설명</th><th>변형 (| 구분)</th><th></th></tr>${S.db.tags.map((r, i) => `<tr><td><input data-p="db.tags.${i}.0" value="${esc(r[0])}" style="width:110px"></td><td><input data-p="db.tags.${i}.1" value="${esc(r[1])}" style="width:100%;min-width:260px"></td><td><input data-p="db.tags.${i}.2" value="${esc(r[2])}" style="min-width:200px"></td><td><button class="btn sm ghost danger" data-tact="tagDel" data-i="${i}" aria-label="삭제">✕</button></td></tr>`).join('')}</table></div></div>
 ${roTable('소켓 등급표 · B103:H110', ['등급', '종족치 480', '525', '570', '최대치', '개인치', '기술 소켓 상한'], S.db.sock)}
 ${roTable('랭크 → 레벨 · B112:E133', ['랭크', 'C열', '레벨', 'E열'], S.db.lvl)}
 ${roTable('종족치 등급 · B149:C175', ['이상', '등급'], S.db.grade)}
 ${roTable('타입', ['타입', '색', '글자', '영문'], S.db.types)}
 </div>`;
}
$('#v-tbl').addEventListener('input', e => {
  const pt = e.target.dataset.pti;
  if (pt) {
    const [i, c] = pt.split('.').map(Number);
    if (c === 1) {
      S.db.ptItems[i][1] = e.target.value;
      save(true);
    }
    return;
  }
  const p = e.target.dataset.p;
  if (!p) return;
  const [o, k] = getRef(p);
  o[k] = e.target.value;
  save(true);
});
$('#v-tbl').addEventListener('change', e => {
  const pt = e.target.dataset.pti;
  if (pt) {
    const [i, c] = pt.split('.').map(Number);
    const row = S.db.ptItems[i];
    if (c === 0) {
      const old = row[0],
        nw = e.target.value.trim();
      if (!nw || nw === old) {
        e.target.value = old;
        return;
      }
      if (S.db.ptItems.some((r, j) => j !== i && r[0] === nw)) {
        toast('같은 이름의 항목이 있습니다');
        e.target.value = old;
        return;
      }
      row[0] = nw;
      for (const t of S.trainers) {
        if (old in t.base) {
          t.base[nw] = t.base[old];
          delete t.base[old];
        }
        if (t.extra && old in t.extra) {
          t.extra[nw] = t.extra[old];
          delete t.extra[old];
        }
      }
      for (const r of S.db.tpl) if (r[2] === old) r[2] = nw;
      save();
      toast('항목 이름을 바꿨습니다');
    } else if (c === 2) row[2] = e.target.value;
    else row[1] = e.target.value;
    save(true);
    return;
  }
  if (e.target.dataset.p) {
    save(true);
    if (/^db\.stpl\.\d+\.0$/.test(e.target.dataset.p)) renderTbl();
  }
});
/* 금지어 칸 */
$('#v-tbl').addEventListener('click', async e => {
  const b = e.target.closest('[data-bw]');
  if (!b) return;
  const k = b.dataset.bw,
    i = +b.dataset.i;
  const L = banList();
  if (k === 'add') {
    const inp = $('#banNew');
    const ws = inp.value
      .split(/[,，\n]/)
      .map(x => x.trim())
      .filter(Boolean);
    if (!ws.length) return toast('금지어를 적어 주세요');
    const have = new Set(L.map(x => x.w));
    const nw = ws.filter(w => !have.has(w));
    if (!nw.length) return toast('이미 있는 금지어입니다');
    banSet([...L, ...nw.map(w => ({ w }))]);
    inp.value = '';
    banRefresh();
    toast(`금지어 ${nw.length}개 추가`);
    return;
  }
  if (k === 'del') {
    const w = L[i] && L[i].w;
    if (!w) return;
    L.splice(i, 1);
    banSet(L);
    BANED = -1;
    banRefresh();
    toast(`「${w}」 금지어를 뺐습니다`);
    return;
  }
  if (k === 'ed') {
    BANED = i;
    banRefresh();
    return;
  }
  if (k === 'edx') {
    BANED = -1;
    banRefresh();
    return;
  }
  if (k === 'edok') {
    const v = ($('#banEd') || {}).value;
    const w = String(v || '').trim();
    if (!w) {
      BANED = -1;
      return banRefresh();
    }
    if (L.some((x, j) => j !== i && x.w === w)) return toast('이미 있는 금지어입니다');
    const old = L[i].w;
    L[i] = old === w ? L[i] : { w };
    banSet(L);
    BANED = -1;
    banRefresh();
    if (old !== w) toast(`「${old}」 → 「${w}」`);
    return;
  }
  if (k === 'reset') {
    if (!(await ask('금지어를 룰 시트 기본 목록으로 되돌릴까요? 추가하거나 고친 것은 사라집니다.', '되돌리기'))) return;
    S.db.ban = DEF.ban || '';
    save(true);
    BANED = -1;
    banRefresh();
    toast('기본 목록으로 되돌렸습니다');
    return;
  }
  if (k === 'scan') {
    const R = banScan();
    const o = $('#banScanOut');
    o.classList.toggle('muted', !R.length);
    o.innerHTML = R.length
      ? `<b class="warn">${R.length}곳에서 걸렸습니다</b><ul class="banhits">${R.map(r => `<li><b>${esc(r.t)}</b> · ${esc(r.p)} · 『${esc(r.n)}』 — <span class="warn">${r.h.map(esc).join(', ')}</span><div class="faint">${banMark(r.eff).replace(/\\n|\n/g, ' / ')}</div></li>`).join('')}</ul>`
      : '<span class="okc">저장된 캐릭터에는 금지어가 없습니다</span>';
    return;
  }
});
/* 10-22 망령: 한글 조합 중에 다시 그리면 자모가 쪼개진다 (ㄱㅗㅇ…) — 조합이 끝난 뒤에 */
$('#v-tbl').addEventListener('compositionend', e => {
  if (e.target.id === 'banQ') {
    BANQ = e.target.value;
    banRefresh(true);
  }
});
$('#v-tbl').addEventListener('input', e => {
  const id = e.target.id;
  if (id === 'banQ') {
    BANQ = e.target.value;
    if (e.isComposing) return;
    banRefresh(true);
    return;
  }
  if (id === 'banTest') {
    const v = e.target.value;
    const h = banHits(v);
    $('#banTestOut').innerHTML = !v.trim()
      ? ''
      : h.length
        ? `<span class="warn">걸림: ${h.map(esc).join(', ')}</span><div class="bantest">${banMark(v).replace(/\n/g, '<br>')}</div>`
        : '<span class="okc">걸리는 금지어가 없습니다</span>';
  }
});
$('#v-tbl').addEventListener('keydown', e => {
  if (e.isComposing) return;
  if (e.target.id === 'banNew' && e.key === 'Enter') {
    e.preventDefault();
    $('[data-bw="add"]').click();
  }
  if (e.target.id === 'banEd') {
    if (e.key === 'Enter') {
      e.preventDefault();
      $('[data-bw="edok"]').click();
    }
    if (e.key === 'Escape') {
      BANED = -1;
      banRefresh();
    }
  }
});
$('#v-tbl').addEventListener('change', e => {
  if (e.target.id === 'banRawTa') {
    BANED = -1;
    const t = $('#banBox details');
    const open = t && t.open;
    banRefresh();
    const t2 = $('#banBox details');
    if (t2 && open) t2.open = true;
  }
});
$('#v-tbl').addEventListener('click', async e => {
  const b = e.target.closest('[data-tact]');
  if (!b) return;
  const a = b.dataset.tact,
    i = +b.dataset.i;
  if (a === 'tplAdd') S.db.tpl.push(['지시', 'C', '', '', '', '']);
  if (a === 'tplDel') S.db.tpl.splice(i, 1);
  if (a === 'prReset') {
    if (!(await ask('종족치 · 프라이드 규칙을 룰북 기본값으로 되돌릴까요?', '되돌리기'))) return;
    S.db.pride = clone(PRIDE_DEF);
    S.db.prideExV = 1;
  }
  if (a === 'prRowAdd') {
    prideMigrate(S.db);
    S.db.pride.rows.push(['', '', '', '', '1', '']);
  }
  if (a === 'prRowDel') {
    prideMigrate(S.db);
    S.db.pride.rows.splice(i, 1);
  }
  if (a === 'ptiAdd') {
    let n = '새 항목',
      k = 2;
    while (S.db.ptItems.some(r => r[0] === n)) n = '새 항목 ' + k++;
    S.db.ptItems.push([n, '0', '']);
  }
  if (a === 'ptiDel') {
    const n = S.db.ptItems[i][0];
    if (!(await ask(`포인트 항목 「${esc(n)}」을(를) 지울까요? 트레이너에 적힌 값도 함께 지워집니다.`, '삭제'))) return;
    S.db.ptItems.splice(i, 1);
    for (const t of S.trainers) delete t.base[n];
    save();
  }
  if (a === 'ptiReset') {
    if (!(await ask('포인트 항목을 기본값으로 되돌릴까요?', '되돌리기'))) return;
    S.db.ptItems = clone(PTI_DEF);
  }
  if (a === 'ptiApply') {
    if (!(await ask('모든 트레이너의 포인트 기본값을 이 표와 랭크 템플릿 값으로 덮어쓸까요?', '적용', false))) return;
    for (const t of S.trainers) {
      for (const [n, d] of ptItems()) t.base[n] = +d || 0;
      applyTpl(t);
    }
    save();
    toast('모든 트레이너에 적용했습니다');
  }
  if (a === 'ilAdd') {
    S.db.ilock = S.db.ilock || [];
    S.db.ilock.push(['', '', '', '잠김']);
  }
  if (a === 'ilDel') S.db.ilock.splice(i, 1);
  if (a === 'stplAdd') S.db.stpl.push(['육성', 'B', '', '', '', '전원']);
  if (a === 'stplAll') {
    if (
      !(await ask(
        '모든 트레이너의 포켓몬 시트에 템플릿을 적용할까요? 빈 슬롯에 빠진 포텐셜만 넣고, 이미 적힌 포텐셜은 건드리지 않습니다. 와일드 역할 포켓몬은 건너뜁니다.',
        '적용',
        false
      ))
    )
      return;
    const [n, k] = stplApplyAll();
    save(true);
    renderTbl();
    toast(n ? `포켓몬 ${k}체에 포텐셜 ${n}개를 넣었습니다` : '더 넣을 템플릿 포텐셜이 없습니다');
    return;
  }
  if (a === 'stplDel') S.db.stpl.splice(i, 1);
  if (a === 'stplReset') {
    if (!(await ask('포켓몬 시트 템플릿을 기본값으로 되돌릴까요?', '되돌리기'))) return;
    S.db.stpl = clone(STPL_DEF);
    S.db.stplV = STPL_V;
  }
  if (a === 'ruMgReset') {
    if (!(await ask('미사그 대학 규칙을 기본값으로 되돌릴까요?', '되돌리기'))) return;
    RULES().misag = clone(MISAG_DEF);
  }
  if (a === 'ruMgAdd') {
    MR().items.push(['', 'B', '', '']);
  }
  if (a === 'ruMgDel') {
    MR().items.splice(i, 1);
  }
  if (a === 'ruInvReset') {
    if (!(await ask('자질 투자 규칙을 기본값으로 되돌릴까요?', '되돌리기'))) return;
    RULES().invest = clone(INVEST_DEF);
  }
  if (a === 'ruAbilReset') {
    if (!(await ask('고유·전용 포텐셜 개수를 기본값으로 되돌릴까요?', '되돌리기'))) return;
    RULES().abil = clone(ABIL_DEF);
  }
  if (a === 'ruTyReset') {
    if (!(await ask('타입 상성표를 기본값으로 되돌릴까요?', '되돌리기'))) return;
    RULES().ty = rulesDef().ty;
  }
  if (a === 'ruAbilAdd') RULES().abil.push(['', '1', '1', '0', '', '0', '']);
  if (a === 'ruAbilDel') RULES().abil.splice(i, 1);
  if (a === 'ruTyAdd') RULES().ty.push(['', '', '', '']);
  if (a === 'ruTyDel') RULES().ty.splice(i, 1);
  if (a === 'tagAdd') S.db.tags.push(['새 태그', '', '']);
  if (a === 'tagDel') S.db.tags.splice(i, 1);
  if (a === 'tplReset') {
    if (!(await ask('랭크 템플릿을 기본값으로 되돌릴까요?', '되돌리기'))) return;
    S.db.tpl = clone(TPL_DEF);
    S.db.tplV = TPL_V;
  }
  if (a === 'tagReset') {
    if (!(await ask('태그 사전을 기본값으로 되돌릴까요?', '되돌리기'))) return;
    S.db.tags = clone(TAGS_DEF);
  }
  save(true);
  renderTbl();
});

/* ---------- 탭 ---------- */
/* 타입 배분 */
const TY_BASE = 18;
function tyParts(v) {
  if (!v || v === '-') return [];
  return (String(v).match(/[^()]+/g) || []).map(x => x.trim()).filter(x => x && x !== '-');
}
function tyOpt() {
  const o = S.ui.ty || (S.ui.ty = {});
  if (o.scope == null) o.scope = '';
  if (!o.mode) o.mode = 'slot';
  if (o.t3 == null) o.t3 = 1;
  if (o.tera == null) o.tera = 0;
  if (!o.sort) o.sort = 'cnt';
  if (!Array.isArray(o.pick)) o.pick = [];
  return o;
}
function tyMonTypes(p, o) {
  const ks = ['t1', 't2'];
  if (o.t3) ks.push('t3');
  if (o.tera) ks.push('tera');
  const out = [];
  for (const k of ks) for (const x of tyParts(p[k])) if (!out.includes(x)) out.push(x);
  return out;
}
function tyFmt(n) {
  return Math.abs(n - Math.round(n)) < 1e-9 ? String(Math.round(n)) : n.toFixed(1);
}
function tyPct(n, d) {
  return d ? ((n / d) * 100).toFixed(1) + '%' : '-';
}

/* 원작 18타입 상성표 기본값 (공격 타입 → {2배 타입, 1/2배 타입, 무효 타입}). PT 일관성(공통 약점) 계산에만 쓴다 · 고치는 곳은 테이블·계산식 탭 「룰 상수」 */
const TY_CHART = {
  '노말': [[], ['바위', '강철'], ['고스트']],
  '불꽃': [['풀', '얼음', '벌레', '강철'], ['불꽃', '물', '바위', '드래곤'], []],
  '물': [['불꽃', '땅', '바위'], ['물', '풀', '드래곤'], []],
  '전기': [['물', '비행'], ['전기', '풀', '드래곤'], ['땅']],
  '풀': [['물', '땅', '바위'], ['불꽃', '풀', '독', '비행', '벌레', '드래곤', '강철'], []],
  '얼음': [['풀', '땅', '비행', '드래곤'], ['불꽃', '물', '얼음', '강철'], []],
  '격투': [['노말', '얼음', '바위', '악', '강철'], ['독', '비행', '에스퍼', '벌레', '페어리'], ['고스트']],
  '독': [['풀', '페어리'], ['독', '땅', '바위', '고스트'], ['강철']],
  '땅': [['불꽃', '전기', '독', '바위', '강철'], ['풀', '벌레'], ['비행']],
  '비행': [['풀', '격투', '벌레'], ['전기', '바위', '강철'], []],
  '에스퍼': [['격투', '독'], ['에스퍼', '강철'], ['악']],
  '벌레': [['풀', '에스퍼', '악'], ['불꽃', '격투', '독', '비행', '고스트', '강철', '페어리'], []],
  '바위': [['불꽃', '얼음', '비행', '벌레'], ['격투', '땅', '강철'], []],
  '고스트': [['에스퍼', '고스트'], ['악'], ['노말']],
  '드래곤': [['드래곤'], ['강철'], ['페어리']],
  '악': [['에스퍼', '고스트'], ['격투', '악', '페어리'], []],
  '강철': [['얼음', '바위', '페어리'], ['불꽃', '물', '전기', '강철'], []],
  '페어리': [['격투', '드래곤', '악'], ['불꽃', '독', '강철'], []]
};
/* 방어 타입 목록(t1·t2)에 공격 타입 atk 가 들어갈 때의 배율 */
let TYC = null,
  TYCK = '';
function tyChart() {
  const rows = RULES().ty;
  const k = JSON.stringify(rows);
  if (TYC && TYCK === k) return TYC;
  const out = {};
  for (const r of rows) if (r && String(r[0] || '').trim()) out[String(r[0]).trim()] = [ruleList(r[1]), ruleList(r[2]), ruleList(r[3])];
  TYC = out;
  TYCK = k;
  return out;
}
function tyMult(atk, defs) {
  const c = tyChart()[atk];
  if (!c) return 1;
  let m = 1;
  for (const d of defs) {
    if (c[2].includes(d)) return 0;
    if (c[0].includes(d)) m *= 2;
    else if (c[1].includes(d)) m *= 0.5;
  }
  return m;
}
/* PT 한 벌의 타입 일관성: 구성·공통 약점·못 막는 타입 */
function ptTypeReport(t) {
  const ps = t.pokemon.filter(p => canSeeMon(t, p));
  const n = ps.length;
  const cnt = {},
    who = {};
  const atkTypes = Object.keys(tyChart());
  const defs = ps.map(p => [...tyParts(p.t1), ...tyParts(p.t2)].filter((x, i, a) => a.indexOf(x) === i));
  ps.forEach((p, i) => {
    for (const x of defs[i]) {
      cnt[x] = (cnt[x] || 0) + 1;
      (who[x] = who[x] || []).push(p.name || '(이름 없음)');
    }
  });
  const comp = Object.keys(cnt)
    .sort((a, b) => cnt[b] - cnt[a] || KO.compare(a, b))
    .map(x => ({ x, n: cnt[x], who: who[x] }));
  const weak = [],
    open = [];
  for (const a of atkTypes) {
    const w = [],
      r = [];
    ps.forEach((p, i) => {
      if (!defs[i].length) return;
      const mu = tyMult(a, defs[i]);
      if (mu >= 2) w.push(p.name || '(이름 없음)');
      if (mu < 1) r.push(p.name || '(이름 없음)');
    });
    if (w.length >= 2 || (n > 0 && w.length === n)) weak.push({ x: a, n: w.length, who: w });
    if (!r.length && n) open.push(a);
  }
  weak.sort((a, b) => b.n - a.n || KO.compare(a.x, b.x));
  return { n, kinds: comp.length, comp, weak, open, typed: defs.filter(d => d.length).length };
}
function ptTypeCard(t) {
  const r = ptTypeReport(t);
  const nm = esc(t.name || '트레이너');
  if (!r.n)
    return `<div class="ptc"><div class="ptch"><button type="button" class="lk" data-yact="open" data-v="${esc(t.id)}">${nm}</button><span class="small faint">포켓몬 없음</span></div></div>`;
  const half = Math.max(2, Math.ceil(r.n / 2));
  const weakTxt = r.weak.length
    ? r.weak
        .map(
          w =>
            `<span class="cb ${w.n >= half ? 'bad' : ''}" title="${w.who.map(esc).join('\n')}">${tchip(w.x)}<b>${w.n}</b>${w.n === r.n ? '<small>전원</small>' : ''}</span>`
        )
        .join('')
    : '<span class="small ok">2체 이상이 같이 약한 타입 없음</span>';
  const openTxt = r.open.length ? r.open.map(tchip).join('') : '<span class="small ok">모든 타입을 누군가는 반감·무효로 받습니다</span>';
  return `<div class="ptc"><div class="ptch"><button type="button" class="lk" data-yact="open" data-v="${esc(t.id)}" title="캐릭터 시트에서 열기">${nm}</button><span class="small muted">${r.n}체 · 타입 ${r.kinds}종${t.solo ? ' · 1인 기준 (' + soloN(t) + '체)' : ''}${isMisag(t) ? ' · 미사그 (4+2)' + (misagGrade(t) ? ' · 대가 ' + misagGrade(t) : '') : ''}${r.typed < r.n ? ` · 타입 미입력 ${r.n - r.typed}체` : ''}</span><span class="ptstrip">${t.pokemon
    .map(p => {
      const a = typeInfo(tyParts(p.t1)[0]),
        b = typeInfo(tyParts(p.t2)[0]) || a;
      return `<i style="background:linear-gradient(135deg,${(a && safeCss(a[1])) || 'var(--sunk2)'} 50%,${(b && safeCss(b[1])) || 'var(--sunk2)'} 50%)" title="${esc(p.name || '')} · ${esc([p.t1, p.t2].filter(x => x && x !== '-').join('/'))}"></i>`;
    })
    .join('')}</span></div>
  <div class="ptcr"><span class="k">구성</span><span class="v">${r.comp.map(e => `<span class="cb" title="${e.who.map(esc).join('\n')}">${tchip(e.x)}<b>${e.n}</b></span>`).join('')}</span></div>
  <div class="ptcr"><span class="k">공통 약점</span><span class="v">${weakTxt}</span></div>
  <div class="ptcr"><span class="k">못 막는 타입</span><span class="v">${openTxt}</span></div></div>`;
}
/* 10-24 망령: 캐릭터 시트 PT 기술점 칸 「🛡 타입 일관성」 — 지금 PT 카드 + 보완 후보(공통 약점 · 못 막는 타입을 반감·무효로 받는 단일 타입) */
function ptTypeFill(t) {
  const r = ptTypeReport(t);
  const tg = [...new Set([...r.weak.map(w => w.x), ...r.open])];
  if (!tg.length) return { tg, list: [] };
  const wk = new Set(r.weak.map(w => w.x));
  const list = Object.keys(tyChart())
    .map(d => {
      const cov = tg.filter(a => tyMult(a, [d]) < 1);
      const worse = [...wk].filter(a => tyMult(a, [d]) >= 2);
      return { d, cov, worse };
    })
    .filter(x => x.cov.length)
    .sort((a, b) => b.cov.length - b.worse.length - (a.cov.length - a.worse.length) || b.cov.length - a.cov.length || KO.compare(a.d, b.d))
    .slice(0, 6);
  return { tg, list };
}
function ptTypeModal(t) {
  const r = ptTypeReport(t);
  const f = ptTypeFill(t);
  const fill = !r.n
    ? ''
    : !f.tg.length
      ? '<p class="small ok" style="margin:0">공통 약점도 못 막는 타입도 없어서 따로 보완할 곳이 없습니다</p>'
      : f.list.length
        ? `<div class="ptfill">${f.list.map(x => `<div class="ptcr"><span class="k">${tchip(x.d)}</span><span class="v"><span class="small muted">막아 줌</span>${x.cov.map(tchip).join('')}${x.worse.length ? `<span class="small warn" style="margin-left:4px">겹치는 약점</span>${x.worse.map(tchip).join('')}` : ''}</span></div>`).join('')}</div>`
        : '<p class="small muted" style="margin:0">단일 타입 하나로 막을 수 있는 게 없습니다</p>';
  const l =
    openModal(`<div class="mhead"><h2>타입 일관성 · ${esc(t.name || '트레이너')}</h2><span class="sp"></span><button class="btn ghost" data-x>닫기</button></div><div class="mbody">${ptTypeCard(t)}
  ${r.n ? `<h3 class="small" style="margin:12px 0 6px">보완 후보 <span class="faint" style="font-weight:400">공통 약점 · 못 막는 타입을 반감·무효로 받는 타입 (막는 수 − 겹치는 약점 순)</span></h3>${fill}` : ''}
  <p class="small faint" style="margin:10px 0 0">원작 18타입 상성 · 타입1·타입2만 봅니다. 타입 탭에서 다른 트레이너와 같이 볼 수 있습니다.</p></div>`);
  l.addEventListener('click', e => {
    if (e.target.closest('[data-x]')) return closeModal();
    if (e.target.closest('[data-yact="open"]')) closeModal();
  });
}
function renderType() {
  const root = $('#v-type');
  if (!root) return;
  const o = tyOpt();
  const folders = S.folders.filter(f => S.trainers.some(t => tFolder(t) === f.id));
  const hasNone = S.trainers.some(t => !tFolder(t));
  const tsel = o.scope.startsWith('t:') ? o.scope.slice(2) : '';
  if (tsel && !S.trainers.some(t => t.id === tsel)) o.scope = '';
  if (o.scope && !tsel && o.scope !== '_none' && !S.folders.some(f => f.id === o.scope)) o.scope = '';
  const inScope = t => !o.scope || (tsel ? t.id === tsel : o.scope === '_none' ? !tFolder(t) : tFolder(t) === o.scope);
  const groups = [];
  for (const f of S.folders) {
    if (!fVis(f)) continue;
    const ts = S.trainers.filter(t => tFolder(t) === f.id && inScope(t) && tVis(t));
    if (ts.length) groups.push([f.name || '이름 없는 폴더', ts]);
  }
  {
    const ts = S.trainers.filter(t => !tFolder(t) && inScope(t) && tVis(t));
    if (ts.length) groups.push([S.folders.length ? '폴더 없음' : '', ts]);
  }
  const base = S.db.types.slice(0, TY_BASE).map(x => x[0]);
  const rows = [];
  const tot = {};
  const names = {};
  let mons = 0,
    slots = 0;
  const combos = new Map();
  for (const [, ts] of groups)
    for (const t of ts) {
      const r = { t, c: {}, n: t.pokemon.length, mn: {} };
      for (const p of t.pokemon) {
        const ty = tyMonTypes(p, o);
        mons++;
        if (!ty.length) continue;
        const w = o.mode === 'mon' ? 1 / ty.length : 1;
        for (const x of ty) {
          r.c[x] = (r.c[x] || 0) + w;
          tot[x] = (tot[x] || 0) + w;
          slots += w;
          (r.mn[x] = r.mn[x] || []).push(p.name || '(이름 없음)');
          (names[x] = names[x] || []).push((p.name || '(이름 없음)') + ' · ' + (t.name || '트레이너'));
        }
        const ck = [...tyParts(p.t1), ...tyParts(p.t2)].filter((x, i, a) => a.indexOf(x) === i);
        if (ck.length) {
          const key = ck.join('/');
          const e = combos.get(key) || { k: ck, n: 0, who: [] };
          e.n++;
          e.who.push((p.name || '(이름 없음)') + ' · ' + (t.name || '트레이너'));
          combos.set(key, e);
        }
      }
      rows.push(r);
    }
  const extra = Object.keys(tot)
    .filter(x => !base.includes(x))
    .sort((a, b) => KO.compare(a, b));
  const cols = base.concat(extra);
  const used = base.filter(x => tot[x] > 0).length;
  const avg = slots / TY_BASE;
  const missing = base.filter(x => !tot[x]);
  const many = avg > 0 ? cols.filter(x => (tot[x] || 0) >= avg * 2 && (tot[x] || 0) >= 2) : [];
  const few = base.filter(x => tot[x] > 0 && tot[x] <= Math.max(1, avg / 2));
  const order = o.sort === 'cnt' ? cols.slice().sort((a, b) => (tot[b] || 0) - (tot[a] || 0) || cols.indexOf(a) - cols.indexOf(b)) : cols;
  const mx = Math.max(1, ...cols.map(x => tot[x] || 0));
  const seg = (act, cur, list, label) =>
    `<span class="tyseg" role="radiogroup" aria-label="${esc(label)}">${list.map(([v, l]) => `<button type="button" role="radio" aria-checked="${cur === v}" data-yact="${act}" data-v="${esc(v)}">${esc(l)}</button>`).join('')}</span>`;
  const scopes = [['', '전체']]
    .concat(folders.map(f => [f.id, f.name || '이름 없는 폴더']))
    .concat(hasNone && S.folders.length ? [['_none', '폴더 없음']] : []);
  const scopeCur = tsel ? 't' : o.scope;
  const bar = x => {
    const v = tot[x] || 0;
    return `<div class="tybar ${v ? '' : 'zero'}" title="${esc(x)} ${tyFmt(v)} · ${tyPct(v, slots)}${names[x] ? '\n' + names[x].map(esc).join('\n') : ''}"><span>${tchip(x)}</span><span class="tr"><span class="fl" style="width:${((v / mx) * 100).toFixed(1)}%;background:${(typeInfo(x) && safeCss(typeInfo(x)[1])) || 'var(--muted)'}"></span>${avg > 0 && !extra.includes(x) ? `<span class="avg" style="left:${Math.min(100, (avg / mx) * 100).toFixed(1)}%"></span>` : ''}</span><span class="nv">${tyFmt(v)}<span>${tyPct(v, slots)}</span></span></div>`;
  };
  const cmx = Math.max(1, ...rows.flatMap(r => cols.map(x => r.c[x] || 0)));
  const cell = (r, x) => {
    const v = r.c[x] || 0;
    if (!v) return `<td class="c z">·</td>`;
    const a = Math.round(14 + (v / cmx) * 40);
    return `<td class="c" style="background:color-mix(in srgb,var(--blue) ${a}%,transparent)" title="${esc(r.t.name || '트레이너')} · ${esc(x)} ${tyFmt(v)}\n${(r.mn[x] || []).map(esc).join(', ')}">${tyFmt(v)}</td>`;
  };
  const head = `<tr><th class="tn">트레이너</th>${cols.map(x => `<th>${tchip(x)}</th>`).join('')}<th class="n">포켓몬</th><th class="n">타입 종류</th></tr>`;
  let body = '';
  for (const [gn, ts] of groups) {
    if (gn && groups.length > 1) body += `<tr class="tyfh"><td class="tn">${esc(gn)}</td><td colspan="${cols.length + 2}"></td></tr>`;
    for (const t of ts) {
      const r = rows.find(z => z.t === t);
      const kinds = cols.filter(x => r.c[x]).length;
      body += `<tr><td class="tn"><button type="button" class="lk" data-yact="open" data-v="${esc(t.id)}" title="캐릭터 시트에서 열기">${esc(t.name || '트레이너')}</button></td>${cols.map(x => cell(r, x)).join('')}<td class="n">${r.n}</td><td class="n">${kinds}</td></tr>`;
    }
  }
  const foot = `<tfoot><tr><td class="tn">합계</td>${cols.map(x => `<td>${tyFmt(tot[x] || 0)}</td>`).join('')}<td class="n">${mons}</td><td class="n">${used}</td></tr><tr><td class="tn">비율</td>${cols.map(x => `<td class="small">${tot[x] ? tyPct(tot[x], slots) : '-'}</td>`).join('')}<td></td><td></td></tr></tfoot>`;
  const cl = [...combos.values()].sort((a, b) => b.n - a.n || KO.compare(a.k.join('/'), b.k.join('/')));
  const empty = !mons;
  root.innerHTML = `<div class="intro"><h1>타입 배분</h1><p>트레이너별 포켓몬 타입 현황입니다. 캐릭터 시트의 타입1·타입2(·타입3)를 그대로 셉니다. 막대의 점선은 18타입에 고르게 나눴을 때의 평균입니다. 칸에 마우스를 올리면 해당 포켓몬이 보입니다.</p></div>
 <div class="tyctl"><span><span class="lab">범위</span>${seg('scope', scopeCur, scopes, '범위')}</span>
  <span><span class="lab">세는 방법</span>${seg(
    'mode',
    o.mode,
    [
      ['slot', '타입마다 1'],
      ['mon', '포켓몬당 1']
    ],
    '세는 방법'
  )}</span>
  <span><span class="lab">정렬</span>${seg(
    'sort',
    o.sort,
    [
      ['cnt', '많은 순'],
      ['dex', '타입 순']
    ],
    '정렬'
  )}</span>
  <label class="small row" style="gap:4px"><input type="checkbox" data-yact="t3" ${o.t3 ? 'checked' : ''}>타입3 포함</label>
  <label class="small row" style="gap:4px"><input type="checkbox" data-yact="tera" ${o.tera ? 'checked' : ''}>테라스탈 포함</label>
  <span><span class="lab">트레이너</span><select data-ysel="trainer" style="max-width:220px"><option value="">전체 (폴더 범위)</option>${(S.folders
    .length
    ? [
        ...S.folders.filter(fVis).map(f => [f.name || '이름 없는 폴더', S.trainers.filter(t => tFolder(t) === f.id && tVis(t))]),
        ['폴더 없음', S.trainers.filter(t => !tFolder(t) && tVis(t))]
      ]
    : [['', S.trainers.filter(tVis)]]
  )
    .filter(([, ts]) => ts.length)
    .map(
      ([g, ts]) =>
        (g ? `<optgroup label="${esc(g)}">` : '') +
        ts.map(t => `<option value="t:${esc(t.id)}" ${o.scope === 't:' + t.id ? 'selected' : ''}>${esc(t.name || '트레이너')}</option>`).join('') +
        (g ? '</optgroup>' : '')
    )
    .join('')}</select></span></div>
 ${(() => {
   const all = groups.flatMap(([, ts]) => ts);
   const picked = tsel ? all : all.filter(t => o.pick.includes(t.id));
   return `<div class="panel" style="margin-bottom:12px"><h3>PT별 타입 일관성 <span class="small muted" style="font-weight:400">타입 구성과 공통 약점 (원작 18타입 상성 · 타입1·타입2만)</span></h3>
  <p class="small faint" style="margin:2px 0 8px">보고 싶은 트레이너를 골라 주세요. 「구성」은 PT 안의 타입별 마릿수, 「공통 약점」은 2체 이상이 함께 2배 이상으로 맞는 공격 타입, 「못 막는 타입」은 PT의 누구도 반감·무효로 받지 못하는 공격 타입입니다.</p>
  ${tsel ? '' : `<div class="tchips" style="margin-bottom:8px">${all.map(t => `<button type="button" class="${o.pick.includes(t.id) ? 'on' : ''}" data-yact="pick" data-v="${esc(t.id)}">${esc(t.name || '트레이너')}<span class="faint"> ${t.pokemon.length}</span></button>`).join('')}${all.length > 1 ? `<button type="button" class="ghost" data-yact="pickAll">모두</button><button type="button" class="ghost" data-yact="pickNone">지우기</button>` : ''}</div>`}
  ${picked.length ? `<div class="ptcs">${picked.map(ptTypeCard).join('')}</div>` : `<div class="empty">위에서 트레이너를 고르면 그 PT의 타입 일관성이 여기에 뜹니다.</div>`}</div>`;
 })()}
 ${
   empty
     ? `<div class="empty">${rows.length ? '이 범위의 트레이너에게 아직 포켓몬 시트가 없습니다. 캐릭터 시트에서 포켓몬을 추가하고 타입을 고르면 여기에 바로 집계됩니다.' : '이 범위에 트레이너가 없습니다.'}</div>`
     : `
 <div class="tystats"><div class="tystat"><div class="k">트레이너</div><div class="v">${rows.length}<small>명</small></div></div>
  <div class="tystat"><div class="k">포켓몬</div><div class="v">${mons}<small>체</small></div></div>
  <div class="tystat"><div class="k">${o.mode === 'mon' ? '타입 점수 합' : '타입 슬롯'}</div><div class="v">${tyFmt(slots)}</div></div>
  <div class="tystat"><div class="k">쓰인 타입</div><div class="v">${used}<small>/ 18</small></div></div>
  <div class="tystat"><div class="k">타입당 평균</div><div class="v">${avg.toFixed(1)}</div></div></div>
 <div class="tynotes">
  ${missing.length ? `<div class="tynote"><b>아직 없는 타입 ${missing.length}</b>${missing.map(tchip).join('')}</div>` : `<div class="tynote"><b>18타입이 모두 한 번 이상 나왔습니다.</b></div>`}
  ${many.length ? `<div class="tynote"><b>평균의 2배 이상</b>${many.map(x => tchip(x) + `<span class="small muted">${tyFmt(tot[x])}</span>`).join('')}</div>` : ''}
  ${few.length ? `<div class="tynote"><b>평균의 절반 이하</b>${few.map(x => tchip(x) + `<span class="small muted">${tyFmt(tot[x])}</span>`).join('')}</div>` : ''}
 </div>
 <div class="tygrid"><div class="panel"><h3>전체 타입 분포${(() => {
   const z = order.filter(x => !(tot[x] > 0)).length;
   return z
     ? `<span class="sp"></span><button type="button" class="btn sm ghost" data-yact="zero" data-v="${o.zero ? '' : '1'}" aria-pressed="${!!o.zero}" title="0 인 타입 막대 보이기 · 숨기기">${o.zero ? '0 인 타입 숨기기' : `0 인 타입 ${z}개 보기`}</button>`
     : '';
 })()}</h3><div class="tybars">${
   order
     .filter(x => o.zero || tot[x] > 0)
     .map(bar)
     .join('') || '<div class="small faint">아직 타입이 없습니다</div>'
 }</div>${!o.zero && order.some(x => !(tot[x] > 0)) ? `<p class="small faint" style="margin:6px 0 0">0 인 타입 ${order.filter(x => !(tot[x] > 0)).length}개는 숨겼습니다 — 위 「아직 없는 타입」 칩에 있어요</p>` : ''}</div>
  <div class="panel"><h3>타입 조합 <span class="small muted">(타입1/타입2)</span></h3><p class="small faint" style="margin:2px 0 0">같은 조합이 2체 이상이면 붉게 표시합니다.</p><div class="tycombo">${cl.map(e => `<span class="cb ${e.n > 1 ? 'dup' : ''}" title="${e.who.map(esc).join('\n')}">${e.k.map(tchip).join('')}<b>${e.n}</b></span>`).join('') || '<span class="small faint">없음</span>'}</div></div></div>
 <div class="panel"><h3>트레이너별 현황</h3><div class="tw"><table class="tymx"><thead>${head}</thead><tbody>${body}</tbody>${foot}</table></div></div>`
 }`;
}
$('#v-type').addEventListener('click', e => {
  const b = e.target.closest('[data-yact]');
  if (!b || b.tagName === 'INPUT') return;
  const o = tyOpt(),
    a = b.dataset.yact,
    v = b.dataset.v;
  if (a === 'open') {
    const t = S.trainers.find(x => x.id === v);
    if (!t) return;
    t.open = true;
    showTab('char');
    setTimeout(() => {
      const el = document.getElementById('tr-' + t.id);
      if (el) el.scrollIntoView({ block: 'start' });
    }, 30);
    return;
  }
  if (a === 'pick') {
    const i = o.pick.indexOf(v);
    if (i < 0) o.pick.push(v);
    else o.pick.splice(i, 1);
    save();
    renderType();
    return;
  }
  if (a === 'pickAll') {
    o.pick = S.trainers.map(t => t.id);
    save();
    renderType();
    return;
  }
  if (a === 'pickNone') {
    o.pick = [];
    save();
    renderType();
    return;
  }
  if (a === 'zero') {
    o.zero = v ? 1 : 0;
    save();
    renderType();
    return;
  } /* 11-03 (20번 검토 연출 5): 0 인 타입 막대는 숨기고 「전부 보기」 */
  if (a === 'scope' || a === 'mode' || a === 'sort') {
    o[a] = v;
    save();
    renderType();
  }
});
$('#v-type').addEventListener('change', e => {
  const a = e.target.dataset.yact;
  if (a === 't3' || a === 'tera') {
    tyOpt()[a] = e.target.checked ? 1 : 0;
    save();
    renderType();
  }
  if (e.target.dataset.ysel === 'trainer') {
    tyOpt().scope = e.target.value || '';
    save();
    renderType();
  }
});
function showTab(tab) {
  if (!$('#v-' + tab)) tab = 'char';
  S.ui.tab = tab;
  $$('#tabs button').forEach(b => b.classList.toggle('on', b.dataset.tab === tab));
  $('#v-char').hidden = tab !== 'char';
  $('#v-type').hidden = tab !== 'type';
  $('#v-db').hidden = tab !== 'db';
  $('#v-tbl').hidden = tab !== 'tbl';
  {
    const vn = $('#v-notes');
    if (vn) vn.hidden = tab !== 'notes';
  }
  {
    const vr = $('#v-rule');
    if (vr) vr.hidden = tab !== 'rule';
  }
  {
    const vl = $('#v-log');
    if (vl) vl.hidden = tab !== 'log';
  }
  {
    const vd = $('#v-dg');
    if (vd) vd.hidden = tab !== 'dg';
  }
  refreshAll();
  save();
  MKROOT().scrollTo(0, 0);
}
$('#tabs').addEventListener('click', e => {
  const b = e.target.closest('[data-tab]');
  if (b) showTab(b.dataset.tab);
});
/* 좁은 화면: 파일 메뉴(엑셀·백업)는 「파일」 버튼으로 펼친다 */
const MTOP = () => $('[data-toolsbtn]').closest('.top');
function toolsOpen(on) {
  const top = MTOP();
  top.classList.toggle('tools-open', on);
  $('[data-toolsbtn]').setAttribute('aria-expanded', on);
}
document.addEventListener('click', e => {
  const tb = e.target.closest('[data-toolsbtn]');
  if (tb) {
    toolsOpen(!MTOP().classList.contains('tools-open'));
    return;
  }
  if (MTOP().classList.contains('tools-open') && (!e.target.closest('.tools') || e.target.closest('.tools .btn')))
    setTimeout(() => toolsOpen(false), 0);
});
/* 버튼이 아닌 줄(포켓몬 머리·포텐셜 줄·검색 결과·파일 라벨)도 Enter·Space로 누를 수 있게 */
document.addEventListener('keydown', e => {
  if ((e.key === 'Enter' || e.key === ' ') && e.target.matches && e.target.matches('[data-kbd]') && !e.repeat) {
    e.preventDefault();
    e.target.click();
  }
});

