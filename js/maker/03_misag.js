/* ── 조각 03_misag.js — 미사그 대학(4+2) 규칙 ── */
/* ---------- 미사그 대학 (4+2) · 10-28 망령 ----------
   PL 4체 + 각성체 2체(GM 제작). 각성체는 통솔점을 쓰지 않고, 각성 (대가) 1체의 프라이드 등급만큼 PL 쪽이 대가를 치른다(A는 B를 포함).
   숫자는 전부 테이블·계산식 「미사그 대학」(공유 설정 meta/set.rules.misag). 트레이너 t.misag · t.misagPen, 포켓몬 p.awaken('free' | 'c').
   items 행: [이름, 등급(B·A), 설명, 대상(type 타입 · role 역할 · 빈칸)] — 통솔 대가에서 GM이 등급마다 하나씩 고른다 */
const MISAG_CATS = ['지시', '육성', '통솔', '능력'];
const MISAG_ITEMS_DEF = [
  ['B-1', 'B', 'PT에 특정 타입을 3체 이상 필수.', 'type'],
  ['B-2', 'B', 'PT의 역할 중 1개(GM 지정)가 발동하지 않는다.', 'role'],
  [
    'A-1',
    'A',
    '턴 종료 시 자신 이외의 아군 중 특정 타입이 한 체도 없으면 다음 턴 자신은 행동 불능(교대는 가능)이 되고, 그 턴 동안 자신의 포텐셜도 발동하지 않는다 — 특성 : 게으름 꼴. (6체: 필드 위 아군 중 특정 타입 · 2체 기준: 타입을 세지 않고, 필드 위에 자신 이외의 아군이 없거나 자신의 타입이 바뀌어 있으면)',
    'type'
  ],
  ['A-2', 'A', '이 각성체가 필드 위에 나와 있지 않으면 아군의 역할이 전부 무효가 된다.', '']
];
const MISAG_DEF = {
  subRatio: '1/4',
  subRound: 'floor',
  free: '1',
  fixC: '1',
  cmdItems: '통솔점',
  cmdRatio: '4/6',
  cmdUnit: '0.5',
  cmdRound: 'floor',
  distCap: '10',
  grade: 'C:-, C+:-, B:B, B+:B, A:A, EX:EX',
  ordB: '2',
  ordA: '1',
  distB: '10',
  distA: '20',
  typeN: '3',
  exclB: '1',
  uqA: '0.5',
  exclA: '2',
  uqOn: '1',
  uqOnce: '0.5',
  awExcl: '2',
  plCut: 'B-:1, B:2, A:2',
  g3: 'D:2:0, C:3:0, B:3:2, A:3:4',
  twoB1: '1',
  twoRole: '1',
  subPr: 'D:D, C:C, B:B, A:B+, AA:B+',
  items: MISAG_ITEMS_DEF
}; /* 10-30 망령: g3 = 3계제권 「육성:각성체 1체당 계제·속별 개수:PL 4체 중 3개 습득 개체 수」, twoB1 · twoRole = 각성체 2체 몫 검사 켜기 */
const isMisag = t => !!(t && t.misag);
/* 10-28 망령: 「미사그 캠퍼스」 폴더(rule:'misag') — 그 안(하위 폴더 포함)에 넣은 트레이너는 미사그 대학 (4+2) 규칙이 저절로 켜진다.
   폴더가 켠 건 t.misagF 로 표시해 두고, 폴더 밖으로 꺼내면 6체 기준으로 돌려 놓는다. 캠퍼스 폴더는 고정 id 라 여러 브라우저가 만들어도 하나 */
const MISAG_FID = 'misag-campus';
/* 11-26 폴더 규칙(f.rule)을 한 곳에: 그 폴더(하위 폴더 포함)에 넣은 트레이너에게 걸린다 — 가장 가까운 윗 폴더의 규칙 하나. 새 규칙은 F_RULE 에 한 줄 + 아래 is○○ 하나.
   misag = 미사그 대학 (4+2) · mong = 몽환 세계 (11-25 망령 「기존의 통솔점 · 기술 소켓 개념이 없다 · 전원 3계제. 육성 A 는 4계제 — A+ 이상도 4계제에서 멈춘다 · 육성 B 이상이면 포켓몬 전원이 약점회피 · 약점내성 둘 다」) */
const F_RULE = {
  misag: { lab: '미사그 규칙', tip: '이 폴더(하위 폴더 포함)에 넣은 트레이너는 미사그 대학 (4+2) 규칙이 저절로 적용됩니다' },
  mong: {
    lab: '몽환 세계 규칙',
    tip: '이 폴더(하위 폴더 포함)에 넣은 트레이너는 몽환 세계 규칙 — 통솔점 · 기술 소켓 · 기술 할인점 없음 · 전원 3계제(육성 A 이상 4계제) · 육성 B 이상이면 전원 약점회피 · 약점내성'
  }
};
const fRuleOf = f => {
  let c = f,
    n = 0;
  while (c && n++ < 50) {
    if (c.rule) return String(c.rule);
    c = fById(fPar(c));
  }
  return '';
};
const tRule = t => (t ? fRuleOf(fById(tFolder(t))) : '');
const fMisag = f => fRuleOf(f) === 'misag';
const isMong = t => tRule(t) === 'mong';
/* 규칙이 끈 검사: 'lead' = 통솔점 · 'sock' = PT 기술점(기술 소켓) · 'disc' = 「기술 할인점」(11-26 10:32 망령 「응 그것도 꺼」) · 'pride' = 계산 종족치가 프라이드 상한을 넘는다는 경고(11-26 10:43 망령 「응」). 화면 · 경고 · 한 장 요약이 다 이것만 묻는다 */
const RULE_OFF = { mong: ['lead', 'sock', 'disc', 'pride'] };
const ruleOff = (t, k) => (RULE_OFF[tRule(t)] || []).includes(k);
/* 포인트 표의 자동 소모 종류 → 끈 검사 이름 */
const PT_OFF_KEY = { pride: 'lead', disc: 'disc' };
const ptItemOff = (t, a) => !!PT_OFF_KEY[a] && ruleOff(t, PT_OFF_KEY[a]);
const mongRank = t => RV[strip(((t && t.ranks) || {})['육성'])] ?? 0;
const mongGye = t => (mongRank(t) >= RV.A ? 4 : 3);
/* 11-26 17:22 망령 「몽환 방에선 에이스는 레벨 기본적으로 +10. 단 분배레벨로 더 올릴려면 경고」
   폴더 규칙이 주는 레벨 보너스 표 — 규칙마다 { role: 역할 칸 이름, n: 더할 레벨 }. lvBonusList 가 이 줄을 같이 싣는다
   (공유 저장 때 lvUp 으로 나가 웹툴도 같은 레벨이 된다). 그 포켓몬에 분배레벨을 더 주면 ruleLvWarns 가 경고 */
const RULE_LV = { mong: [{ role: '에이스', n: 10 }] };
const ruleLvRows = (t, p) => {
  const role = String((p && roleOf(p)) || '').replace(/[『』\s]/g, '');
  return (RULE_LV[tRule(t)] || []).filter(r => r.role === role);
};
const ruleLvList = (t, p) => ruleLvRows(t, p).map(r => ({ n: r.n, by: `${F_RULE[tRule(t)].lab} · 『${r.role}』`, rule: 1 }));
/* 레벨 칸 꼬리표: 【준비】 글에서 온 것 · 폴더 규칙에서 온 것 */
const lvBonusLabel = L => [L.some(x => !x.rule) ? '【준비】' : '', L.some(x => x.rule) ? '규칙' : ''].filter(Boolean).join(' · ');
function ruleLvWarns(t) {
  const out = [];
  for (const p of (t && t.pokemon) || []) {
    const dist = Math.round(+p.dist) || 0;
    for (const r of ruleLvRows(t, p))
      if (dist > 0)
        out.push({
          who: p.name || '이름 없음',
          pid: p.id,
          t: `『${r.role}』는 ${F_RULE[tRule(t)].lab}으로 이미 「LV : +${r.n}」 — 분배레벨 +${dist} 로 더 올렸다`
        });
  }
  return out;
}
/* 시트 템플릿에 얹는 줄 — 종족 포텐셜 ③(전원) · ④(육성 A 이상) · 약점회피 · 약점내성(육성 B 이상) */
function mongRows(t) {
  const L = [{ kind: '04.3. 종족', name: '종족 포텐셜③', tg: '전원' }];
  if (mongGye(t) >= 4) L.push({ kind: '04.4. 종족', name: '종족 포텐셜④', tg: '전원' });
  if (mongRank(t) >= RV.B) L.push({ kind: '08.1. 회피', name: '약점회피', tg: '전원' }, { kind: '09.1. 내성', name: '약점내성', tg: '전원' });
  return L;
}
/* 『계제』 = 종류가 「종족」인 포텐셜 칸 수 (종류가 비면 칸 자리 — 종족 ①~④) */
const gyeCount = p =>
  ((p && p.pots) || []).filter((n, i) => {
    if (!n) return false;
    const k = potKindOf(p, i);
    return k ? potGroup(k) === '종족' : i >= 4 && i <= 7;
  }).length;
/* 「통솔점 u/m · PT 기술점 u/m」 한 줄 — 트레이너 머리줄 · 포켓몬 한 장 보기가 같이 쓴다 */
function tMetaHTML(t, use) {
  const n = (ptItems().find(r => r[2] === 'pride') || [])[0];
  const pu = ptSockets(t),
    pm = ptMax(t);
  const L = [];
  if (ruleOff(t, 'lead') && ruleOff(t, 'sock'))
    return `포켓몬 ${t.pokemon.length}체 · <span title="${esc(F_RULE.mong.tip)}">${mongGye(t)}계제 · 통솔점 · 기술 소켓 없음</span>`;
  if (!n) L.push(`포켓몬 ${t.pokemon.length}체`);
  else if (!ruleOff(t, 'lead')) {
    const u = Math.round(((use || pointUse(t))[n] || 0) * 100) / 100,
      m = +t.base[n] || 0;
    L.push(`통솔점 <b class="${u > m ? 'warn' : ''} num">${u}/${m}</b>`);
  }
  if (!ruleOff(t, 'sock')) L.push(`PT 기술점 <b class="${pu > pm ? 'warn' : ''} num">${pu}/${pm}</b>`);
  return L.join(' · ');
}
const tInMisag = t => !!(t && fMisag(fById(tFolder(t))));
/* 10-30 망령 「미사그 PC 시트 옆에 NPC 시트 — 캠퍼스 폴더 안에 폴더 하나 더, 기본은 GM 에게만」: 「미사그 캠퍼스 / NPC」(고정 id, 🔒). 그 안의 트레이너는 NPC 가 되고, GM 이 열면 비공개가 된다.
   폴더가 바꾼 건 t.npcF · t.npcP 로 표시해 두고, 폴더 밖으로 꺼내면 PC 로 돌린다(비공개는 그대로). 세션 노트는 이 폴더의 트레이너를 NPC 시트(GM만)로 넣는다 */
const MISAG_NPC_FID = 'misag-npc';
const fMisagNpc = f => {
  let c = f,
    n = 0;
  while (c && n++ < 50) {
    if (c.id === MISAG_NPC_FID) return true;
    c = fById(fPar(c));
  }
  return false;
};
const tInMisagNpc = t => !!(t && fMisagNpc(fById(tFolder(t))));
function misagSync() {
  let ch = 0;
  for (const t of S.trainers) {
    const inF = tInMisag(t);
    const go = () => {
      for (const [n, d] of ptItems()) t.base[n] = +d || 0;
      applyTpl(t);
      ch++;
    };
    if (inF && (!t.misag || t.solo)) {
      t.misag = true;
      t.solo = false;
      t.misagF = true;
      go();
    } else if (inF && !t.misagF) t.misagF = true;
    else if (!inF && t.misagF) {
      delete t.misagF;
      t.misag = false;
      go();
    }
  }
  for (const t of S.trainers) {
    if (tInMisagNpc(t)) {
      if (t.kind !== 'npc') {
        t.kind = 'npc';
        t.npcF = true;
        ch++;
      }
      if (!t.priv && !t.npcP && ME.gm && ME.hash) {
        t.priv = true;
        if (!t.owner) {
          t.owner = ME.hash;
          t.ownerName = ME.name;
        }
        t.npcP = true;
        ch++;
      }
    } else if (t.npcF || t.npcP) {
      if (t.npcF) t.kind = 'pc';
      delete t.npcF;
      delete t.npcP;
      ch++;
    }
  }
  return ch;
}
let campusTried = false;
function ensureCampus() {
  if (campusTried) return;
  if ((SH.on || (window.MKM_STORE && MKM_STORE.configured() && !SH.failed)) && !SH.ready) return;
  campusTried = true; /* 공유 DB 를 쓰면 다 불러온 뒤에 */
  if (S.folders.some(f => f.id === MISAG_FID) || lsGet('mkm_misag_campus') === '1') return;
  if (SH.on && SH.canWrite === false) return;
  const f = {
    id: MISAG_FID,
    name: '미사그 캠퍼스',
    rule: 'misag',
    deco: { icon: '🎓', title: '미사그 대학 (4+2) · 이 폴더에 넣은 트레이너는 미사그 규칙' }
  };
  const top = S.folders.filter(x => !x.parent);
  const fgo = top.find(x => /포그오|그랜드\s*오더/.test(x.name || ''));
  if (fgo) S.folders.splice(S.folders.indexOf(fgo) + 1, 0, f);
  else S.folders.unshift(f);
  lsSet('mkm_misag_campus', '1');
  save();
}
/* 10-30: 캠퍼스 안 NPC 폴더 — GM 이 열 때 없으면 한 번 만든다(지운 뒤엔 다시 안 만듦) */
function ensureMisagNpc() {
  const c = S.folders.find(f => f.id === MISAG_FID);
  if (!c) return;
  if (S.folders.some(f => f.id === MISAG_NPC_FID)) {
    lsSet('mkm_misag_npc', '1');
    return;
  }
  if (lsGet('mkm_misag_npc') === '1' || !ME.gm || !ME.hash || (SH.on && SH.canWrite === false)) return;
  if ((SH.on || (window.MKM_STORE && MKM_STORE.configured() && !SH.failed)) && !SH.ready) return;
  S.folders.splice(S.folders.indexOf(c) + 1, 0, {
    id: MISAG_NPC_FID,
    name: 'NPC',
    parent: MISAG_FID,
    priv: true,
    owner: ME.hash,
    ownerName: ME.name,
    deco: { icon: '🗝️', title: '미사그 NPC · 세션 노트 NPC 시트(GM만)로 들어감' }
  });
  lsSet('mkm_misag_npc', '1');
  save();
}
function MR() {
  const R = RULES();
  if (!R.misag || !Array.isArray(R.misag.items) || !(+R.misag.v >= 6)) rulesNormalize(S.db);
  return (S.db.rules && S.db.rules.misag) || MISAG_DEF;
}
const mnum = k => {
  const v = parseFloat(MR()[k]);
  return isNaN(v) ? parseFloat(MISAG_DEF[k]) || 0 : v;
};
function fracNum(x, d) {
  const m = String(x ?? '')
    .trim()
    .match(/^(-?[\d.]+)\s*\/\s*([\d.]+)$/);
  if (m) return +m[2] ? +m[1] / +m[2] : d;
  const v = parseFloat(x);
  return isNaN(v) ? d : v;
}
function mRound(x) {
  const R = MR();
  const u = parseFloat(R.cmdUnit) || 0.5;
  const c = R.cmdRound === 'ceil';
  const f = c ? Math.ceil : R.cmdRound === 'round' ? Math.round : Math.floor;
  return Math.round(f(x / u + (c ? -1e-9 : 1e-9)) * u * 1000) / 1000;
}
const misagCmd = item => ruleList(MR().cmdItems).includes(item);
const awOf = (t, p) => (isMisag(t) && p && (p.awaken === 'free' || p.awaken === 'c') ? p.awaken : '');
const awList = (t, k) => t.pokemon.filter(p => awOf(t, p) && (!k || awOf(t, p) === k));
const AW_LAB = { free: '각성 (대가)', c: '각성 (보조)' };
/* 11-01 망령 「각성체 지정하면 분류 『현대종』이 『각성체』로 저절로」: 각성체면 현대종 → 각성체, 각성체를 풀면 각성체 → 현대종 (분류 칸에 다른 것을 고른 건 건드리지 않는다) */
function awClassSync(t, p) {
  if (!p || !Array.isArray(p.pots)) return false;
  const aw = !!awOf(t, p),
    [from, to] = aw ? ['현대종', '각성체'] : ['각성체', '현대종'];
  const k = p.pots.indexOf(from);
  if (k < 0 || p.pots.includes(to)) return false;
  p.pots[k] = to;
  return true;
} /* 10-28 망령: 보조 각성체는 C 권장일 뿐 프라이드를 묶지 않는다 */
function misagGradeOf(pr) {
  if (!pr) return '';
  const m = {};
  for (const x of String(MR().grade || '').split(/[,，]/)) {
    const [a, b] = x.split(':').map(y => (y || '').trim());
    if (a) m[a.toUpperCase()] = b && b !== '-' ? b.toUpperCase() : '';
  }
  const k = String(pr).toUpperCase();
  return k in m ? m[k] : '?';
}
function misagGrade(t) {
  const f = awList(t, 'free')[0];
  return f ? misagGradeOf(prideOf(f)) : '';
}
/* 11-03 22:49 망령 「통솔형이 통솔점 손해를 많이 보니 대가 없는 각성체(각성 (보조))는 통솔 B 면 B · A 면 B+ 로 짠다」: 룰 상수 미사그 subPr 「통솔:프라이드」 */
function misagSubPr(t) {
  const r = String((t.ranks || {})['통솔'] || '').trim();
  const L = String(MR().subPr ?? MISAG_DEF.subPr)
    .split(/[,，]/)
    .map(x => x.split(':').map(y => (y || '').trim()))
    .filter(x => x[0] && x[1]);
  const hit = L.find(x => x[0].toUpperCase() === r.toUpperCase()) || L.find(x => x[0].toUpperCase() === strip(r).toUpperCase());
  return hit ? hit[1].toUpperCase() : '';
}
/* 11-04 망령 「이 프라이드 왜 통솔에 맞게 변형 안 돼?」: 각성 (보조)의 프라이드는 통솔로 정해진다(subPr) — 예전엔 경고만 띄웠다.
   통솔 · 각성체 종류 · 포인트 방식이 바뀔 때와 시트를 읽을 때 p.pride 를 그 값으로 맞춘다(웹툴 · 노트도 p.pride 를 읽으니 저장 값까지) */
/* 11-22 망령 「묘선공주 A 로 바꾸고 싶은데 왜 안 돼」 → 「2 로 — 좀 수정할 수 있게」: 각성 (보조) 프라이드 예외 p.subPrX — 비우면 통솔표(subPr)대로, 고르면 그 포켓몬만 그 값 (학장 같은 특수 NPC 용) */
function subPrOf(t, p) {
  const x = String((p && p.subPrX) || '')
    .trim()
    .toUpperCase();
  return x || misagSubPr(t);
}
function awSubSync(t) {
  if (!t || !isMisag(t)) return false;
  if (!misagSubPr(t)) return false;
  let ch = false;
  for (const p of t.pokemon || []) {
    if (!p || p.awaken !== 'c') continue;
    const w = subPrOf(t, p);
    if (w && String(p.pride || '') !== w) {
      p.pride = w;
      ch = true;
    }
  }
  return ch;
}
function misagPen(t) {
  if (!t.misagPen || typeof t.misagPen !== 'object') t.misagPen = {};
  const P = t.misagPen;
  if (!P.ex || typeof P.ex !== 'object') P.ex = {};
  if (!P.ordOff || typeof P.ordOff !== 'object') P.ordOff = {};
  return P;
}
/* 실제로 걸린 대가 {분류: 'B' | 'A'} — B·A 등급은 고른 분류 하나, EX 는 GM이 분류마다 직접 */
function misagEff(t) {
  const e = {};
  if (!isMisag(t)) return e;
  const g = misagGrade(t),
    P = misagPen(t);
  if (g === 'B' || g === 'A') {
    if (MISAG_CATS.includes(P.cat)) {
      if (g === 'A' && MISAG_CATS.includes(P.catA) && P.catA !== P.cat) {
        e[P.cat] = 'B';
        e[P.catA] = 'A만';
      } else e[P.cat] = g;
    }
  } /* 11-09 망령 「A 등급도 (통솔 B + 육성 A 처럼) 나눠 고를 수 있게」: misagPen.catA = A 몫 분류 (비우면 B 몫과 같은 분류) */ else if (g === 'EX') {
    for (const c of MISAG_CATS) if (P.ex[c] === 'B' || P.ex[c] === 'A' || P.ex[c] === 'A만') e[c] = P.ex[c];
  }
  return e;
} /* 11-09 망령 「EX는 애초에 B랑 A 패널티를 각자 고를 수 있는 거」: EX 는 분류마다 B 몫 · A 몫을 따로 — 「A만」(B 몫 없이) */
const mHasB = v => v === 'B' || v === 'A',
  mHasA = v => v === 'A' || v === 'A만';
const misagItems = lv => (MR().items || []).filter(r => r && r[0] && (!lv || String(r[1] || '').toUpperCase() === lv));
const misagItem = k => (MR().items || []).find(r => r && r[0] === k) || null;
function misagDistPen(t) {
  const e = misagEff(t).육성;
  return e === 'A' ? mnum('distB') + mnum('distA') : e === 'B' ? mnum('distB') : e === 'A만' ? mnum('distA') : 0;
}
/* 11-09 망령 「2/6 + 4/6 으로 나눠 각성체 / PL 분배레벨로 · 패널티도 그렇게 · 반올림」: 육성 대가를 각성체 몫 1/3(반올림) · PL 몫 나머지로. B 와 A 를 따로 반올림해 더한다 — B −3/−7 · A만 −7/−13 · B+A −10/−20 */
function misagDistAw(t) {
  const e = misagEff(t).육성,
    r = x => Math.round(x / 3);
  return e === 'A' ? r(mnum('distB')) + r(mnum('distA')) : e === 'B' ? r(mnum('distB')) : e === 'A만' ? r(mnum('distA')) : 0;
}
function misagDistPl(t) {
  return misagDistPen(t) - misagDistAw(t);
}
function tplSix(q, item, rank) {
  const k = strip(rank || '');
  const L = (S.db.tpl || []).filter(r => r[0] === q && r[2] === item);
  const r = L.find(x => x[1] === rank) || L.find(x => strip(x[1]) === k && !/[+-]/.test(x[1])) || L.find(x => strip(x[1]) === k);
  return r && !isNaN(+r[3]) ? +r[3] : null;
}
/* 11-01 망령: 지시 D 는 『6령』(교회식이면 『영창』)이 없으므로 B부터 『4식』(『결계』)을 뺀다 — 『4식』 1 = 『6령』 2 */
function misagOrdNeed(t) {
  const e = misagEff(t).지시;
  if (!e) return { c: 0, o: 0 };
  const c = mHasB(e) ? mnum('ordB') : 0,
    o = mHasA(e) ? mnum('ordA') : 0;
  if ((t.orders || {}).preset && !ordAvail(t, 'c').length) return { c: 0, o: Math.ceil(c / 2) + o };
  return { c, o };
}
const misagOrdOff = (t, kind) => {
  const L = misagPen(t).ordOff[kind];
  return Array.isArray(L) ? L : [];
};
const misagOffNow = (t, kind) => (misagOrdNeed(t)[kind] ? misagOrdOff(t, kind) : []); /* 지금 걸린 지시 대가로 빠진 것만 */
/* 11-05 19:46 망령 「능력 A 대가는 고유를 뺄지 전용 2개를 뺄지 정할 수 있도록」: misagPen.abA = '' · 'uq'(고유 점수 −uqA, 기본) | 'excl'(전용 −exclA 더) */
const misagAbA = t => (mHasA(misagEff(t).능력) && misagPen(t).abA === 'excl' ? 'excl' : 'uq');
const misagExclPen = t => {
  const e = misagEff(t).능력;
  return e ? (mHasB(e) ? mnum('exclB') : 0) + (mHasA(e) && misagAbA(t) === 'excl' ? mnum('exclA') : 0) : 0;
};
/* 11-01 망령 「각성체는 (능력 표의) 상시 제한을 받지 않게 하는 대신 기본 전체 수를 깐다 — B-1 에서 1개 · B-2 에서 2개 · A 에서 2개」: PL 4체 몫(능력 표 6체 개수)에서 뺀다. 룰 상수 미사그 plCut 「능력:개수」 */
function misagPlCut(t) {
  const r = String((t.ranks || {})['능력'] || '').trim();
  const L = String(MR().plCut ?? MISAG_DEF.plCut)
    .split(/[,，]/)
    .map(x => x.split(':').map(y => (y || '').trim()))
    .filter(x => x[0]);
  const hit = L.find(x => x[0] === r) || L.find(x => x[0] === strip(r) && !/[+-]$/.test(x[0]));
  return hit ? Math.max(0, +hit[1] || 0) : 0;
}
const misagUqPen = t => (mHasA(misagEff(t).능력) && misagAbA(t) === 'uq' ? mnum('uqA') : 0);
/* 고유 포텐셜 점수: 상시 1 · 단발(【N/시】) 0.5. 능력 랭크의 「고유 표시」(예: 2 (상시1+단발1))에서 상한을 읽는다 */
const uqIsOnce = u => /【\s*\d+\s*\/\s*시\s*】/.test(String((u && u.eff) || ''));
function uqScore(t) {
  return (
    Math.round(
      (t.unique || []).filter(u => u && u.name && u.name.trim()).reduce((a, u) => a + (uqIsOnce(u) ? mnum('uqOnce') : mnum('uqOn')), 0) * 100
    ) / 100
  );
}
function uqScoreCap(r) {
  const a = abilRow(r);
  const s = String(a[2] || '');
  const on = s.match(/상시\s*(\d+)/),
    once = s.match(/단발\s*(\d+)/);
  if (on || once) return (on ? +on[1] : 0) * mnum('uqOn') + (once ? +once[1] : 0) * mnum('uqOnce');
  const n = parseInt(a[1], 10);
  return (n >= 0 ? n : 1) * mnum('uqOn');
}
/* 각성체 쪽 PT 기술점 상한 = 1인 기준 (2체) 표. PL 4체 = 6체 최대치 − 이 값 */
function misagGmCap(t) {
  const v = (S.db.soloSock || {})[strip(t.ranks['육성'])];
  if (v != null && v !== '') return +v;
  const r = sockRow(t.ranks['육성']);
  return r ? Math.round(((+r[4] || 0) / 3) * 2) / 2 : 0;
}
/* 10-30 망령: 각성체는 처음부터 「1인 기준 (2체)」 값 안에서 짠다 → 6체(4+2)에서 2체로 합칠 때 바뀌는 것이 없다. 6체 모드에서는 남는 몫을 PL 4체가 쓴다.
   분배레벨 합 · 전용 포텐셜 개수(상시) · 역할 중복 · 통솔 대가 B-1(각성체 둘 다 지정 타입). 파트너 없음 · 각성체 통솔점 검사 없음 (10-30 망령 「룰이 그래」) */
function tplSolo(q, item, rank) {
  const k = strip(rank || '');
  const L = (S.db.tpl || []).filter(r => r[0] === q && r[2] === item);
  const r = L.find(x => x[1] === rank) || L.find(x => strip(x[1]) === k && !/[+-]/.test(x[1])) || L.find(x => strip(x[1]) === k);
  if (!r) return null;
  const v = r[5] != null && r[5] !== '' ? r[5] : r[3];
  return isNaN(+v) ? null : +v;
}
const mOn = k => String(MR()[k] ?? MISAG_DEF[k]) !== '0';
function misagG3(rank) {
  const k = strip(rank || '');
  for (const x of String(MR().g3 ?? MISAG_DEF.g3).split(/[,，]/)) {
    const [r, a, b] = x.split(':').map(y => (y || '').trim());
    if (r && r.toUpperCase() === k.toUpperCase()) return { aw: a, pl: b };
  }
  return null;
}
/* 11-11 망령 「6체 덱에서 서브 — 2명이서 할 때 3+3 합치기를 위해 PL 4체 중 하나를 서브로」: 1인 3체 = 각성체 2 + 서브 1 (시트에 고정, 「서브」 체크).
   서브는 PL 4체 몫의 1/4 만 가져간다 — 통솔점 · PT 기술점 (「통솔점 자체는 정해야 — 아니면 A 를 서브로 박으면 되니까」 · 「서브가 4체 기술점의 1/4」). 비율 · 맞춤은 테이블·계산식 「미사그」 subRatio · subRound */
const subOf = t => (isMisag(t) ? t.pokemon.filter(p => p && p.sub) : []);
function mSub(x) {
  const R = MR();
  const r = String(R.subRound || MISAG_DEF.subRound);
  const f = r === 'ceil' ? Math.ceil : r === 'round' ? Math.round : Math.floor;
  return Math.round((f(x * 2 + (r === 'ceil' ? -1e-9 : 1e-9)) / 2) * 1000) / 1000;
} /* 0.5 단위 */
const subFrac = () => fracNum(MR().subRatio || MISAG_DEF.subRatio, 1 / 4);
function subCaps(t) {
  const n = (ptItems().find(r => r[2] === 'pride') || [])[0];
  const lead = n ? +t.base[n] || 0 : 0;
  return { lead: mSub(lead * subFrac()), leadAll: lead, pt: mSub(ptMax(t) * subFrac()), ptAll: ptMax(t) };
}
/* 서브 프라이드 상한: 각성 (보조) 프라이드 — 통솔로 정한 값(subPr), 없으면 시트의 각성 (보조) 포켓몬 프라이드 */
function subPrCap(t) {
  const w = misagSubPr(t);
  if (w) return w;
  const c = awList(t, 'c')[0];
  return c ? prideOf(c) : '';
}
function misagThreeChecks(t) {
  const out = [];
  if (!isMisag(t)) return out;
  const S = subOf(t);
  if (!S.length) return out;
  const tag = '3체 기준 (서브)';
  if (S.length > 1) out.push(`${tag} — 서브는 1체만 (지금 ${S.length}체: ${S.map(p => p.name || '이름 없음').join(', ')})`);
  const sp = S[0];
  if (awOf(t, sp)) out.push(`${tag} — 각성체(${sp.name || '이름 없음'})는 서브가 될 수 없다 · PL 포켓몬 중에서 고른다`);
  const C =
    subCaps(
      t
    ); /* 11-12 01:14 망령 「통솔점 1/4 면 통솔형이 손해를 많이 본다 — 서브 프라이드는 각성체(보조) 이하」: 통솔점 1/4 대신 프라이드 상한 = 각성 (보조) 프라이드(subPr) */
  {
    const cap = subPrCap(t),
      have = prideOf(sp);
    const pv = k => {
      const r = prRow(k);
      return r ? pnum(r[1], 0) : 0;
    };
    if (cap && have && pv(have) > pv(cap) + 1e-9)
      out.push(`${tag} — ${sp.name || '이름 없음'} 프라이드 ${have} — 서브는 각성체(보조) 프라이드 ${cap} 이하`);
  }
  {
    const c = moveCap(t, sp);
    const u = c.mode === 'count' ? c.pt : c.used;
    if (u > C.pt + 1e-9)
      out.push(`${tag} — ${sp.name || '이름 없음'} PT 기술점 ${u} / ${C.pt} (PL 4체 PT 기술점 ${C.ptAll} × ${MR().subRatio || MISAG_DEF.subRatio})`);
  }
  /* 11-11 망령 「B-1 는 데려온 3체 기준」: 통솔 대가 B-1(특정 타입 3체 이상)이면 각성체 2 + 서브 셋 다 지정 타입 · A-1 은 2체 규칙과 같게 · A-2 는 짝 PC 도 꺼짐(웹툴은 원래 「아군」 전부) */
  {
    const e = misagEff(t),
      P = misagPen(t);
    if (mHasB(e.통솔) && P.type && misagItem(P.b) && misagItem(P.b)[3] === 'type') {
      const no = [...awList(t), sp].filter(p => ![p.t1, p.t2, p.t3].some(x => x && x !== '-' && String(x).split(/[()]/).includes(P.type)));
      if (no.length)
        out.push(
          `${tag} — 통솔 대가 ${P.b}: 데려가는 3체(각성체 2 + 서브) 모두 ${P.type} 타입이어야 합니다 (${no.map(p => p.name || '이름 없음').join(', ')})`
        );
    }
  }
  if (mOn('twoRole')) {
    const r = roleOf(sp);
    const hit = awList(t).filter(a => roleOf(a) && roleOf(a) === r && r !== '역할 포텐셜');
    if (r && hit.length) out.push(`${tag} — 서브와 각성체의 역할이 같습니다 (『${r}』) · 3체 안에서는 역할 중복 불가`);
  }
  return out;
}
function misagTwoChecks(t) {
  const out = [],
    A = awList(t);
  if (!A.length) return out;
  const tag = '각성체 2체 몫';
  {
    const d1 = tplSolo('육성', '분배레벨', t.ranks['육성']),
      d6 = tplSix('육성', '분배레벨', t.ranks['육성']),
      pa = misagDistAw(t),
      pp = misagDistPl(t);
    const ds = A.reduce((a, p) => a + (Math.round(+p.dist) || 0), 0),
      dx = distExtraAw(t),
      dxp =
        distExtra(t) -
        dx; /* 11-22: 분배레벨 조정 · 【준비】 몫은 기본 비율대로 각성체 · PL 에 나눈다 · 11-09: 각성체 2체 = 1인 값 − 육성 대가 각성체 몫, PL 4체 = (6체 − 1인) − PL 몫 */
    if (d1 != null && ds > d1 - pa + dx)
      out.push(
        `${tag} — 분배레벨 합 ${ds} / ${d1 - pa + dx} (1인 기준 (2체) ${d1} · 육성 ${strip(t.ranks['육성'])}${pa ? ` · 육성 대가 각성체 몫 −${pa}` : ''}${dx ? ` · 조정 · 【준비】 ${dx > 0 ? '+' : ''}${dx}` : ''})`
      );
    if (d1 != null && d6 != null) {
      const PL = t.pokemon.filter(p => !awOf(t, p)),
        pcap = d6 - d1 - pp + dxp,
        ps = PL.reduce((a, p) => a + (Math.round(+p.dist) || 0), 0);
      if (ps > pcap)
        out.push(
          `PL 4체 — 분배레벨 합 ${ps} / ${pcap} (6체 ${d6} − 각성체 몫 ${d1}${pp ? ` · 육성 대가 PL 몫 −${pp}` : ''}${dxp ? ` · 조정 · 【준비】 ${dxp > 0 ? '+' : ''}${dxp}` : ''})`
        );
    }
  }
  /* 10-30 망령 「전용도 기본적으로 각성체에 2개가 부여 돼 · D 는 각성체 1체만」 · 「따로 받음 (상한에 안 셈)」: 각성체는 능력 표와 따로 1체에 전용 2개(룰 상수 미사그 awExcl).
    능력 D 면 각성체 1체만 받는다. 능력 표의 전용 개수(6체 기준, 능력 대가 −n 포함)는 PL 4체 몫으로 센다 */
  {
    const per = mnum('awExcl'),
      dOne = strip(t.ranks['능력']) === 'D';
    const has = A.map(p => exclAll(p).length);
    A.forEach((p, i) => {
      if (has[i] > per) out.push(`${tag} — ${p.name || '이름 없음'} 전용 포텐셜 ${has[i]} / ${per}개 (각성체는 1체에 ${per}개)`);
    });
    {
      const capT = awExclCap(t),
        tot = has.reduce((a, b) => a + b, 0);
      if (tot > capT) out.push(`${tag} — 전용 포텐셜 합 ${tot} / ${capT}개 (2체 합 · 능력 AA 이상 ${per * 2}개)`);
    } /* 11-05 19:44 망령 「각성체는 2개가 기본 · 능력 AA 만 4」 */
    if (dOne && has.filter(n => n > 0).length > 1)
      out.push(`${tag} — 능력 D 는 각성체 1체만 전용 포텐셜을 받습니다 (지금 ${has.filter(n => n > 0).length}체)`);
    const PL = t.pokemon.filter(p => !awOf(t, p)),
      pc = misagPlCut(t),
      xcap = Math.max(0, abilLimitsBase(t.ranks['능력']).x - misagExclPen(t) - pc),
      xn = PL.reduce((a, p) => a + exclAll(p).length, 0);
    if (xn > xcap)
      out.push(
        `PL 4체 — 전용 포텐셜 ${xn} / ${xcap}개 (능력 ${t.ranks['능력'] || '-'}${pc ? ` · 각성체 상시 자유 −${pc}` : ''}${misagExclPen(t) ? ` · 능력 대가 −${misagExclPen(t)}` : ''} · 각성체 몫은 따로)`
      );
  }
  if (A.length === 2 && mOn('twoRole')) {
    const r1 = roleOf(A[0]),
      r2 = roleOf(A[1]);
    if (r1 && r1 === r2 && r1 !== '역할 포텐셜') out.push(`${tag} — 각성체 둘의 역할이 같습니다 (『${r1}』) · 2체 기준은 역할 중복 불가`);
  }
  /* 11-01 망령 「PL 은 할인점 4점」: 「기술 할인점」 · 【1/시】는 각성체 2체가 1/3(6 → 2 · 3 → 1), PL 4체가 나머지 — 노트 PT 서머리와 같은 셈 */
  for (const [n, , a] of ptItems()) {
    if (a !== 'disc' && a !== 'once') continue;
    const max = ptHave(t, n, a);
    if (!(max > 0)) continue;
    const awM = Math.round(max / 3),
      f = a === 'disc' ? p => p.moves.filter(m => m.name && m.half).length : p => (onBench(p) ? 0 : onceCount(p));
    const au = A.reduce((x, p) => x + f(p), 0),
      pu = t.pokemon.filter(p => !awOf(t, p)).reduce((x, p) => x + f(p), 0);
    if (au > awM) out.push(`${tag} — ${n} ${au} / ${awM}`);
    if (pu > max - awM) out.push(`PL 4체 — ${n} ${pu} / ${max - awM} (각성체 몫 ${awM} 따로)`);
  }
  const e = misagEff(t),
    P = misagPen(t);
  if (mOn('twoB1') && mHasB(e.통솔) && P.type && misagItem(P.b) && misagItem(P.b)[3] === 'type') {
    const no = A.filter(p => ![p.t1, p.t2, p.t3].some(x => x && x !== '-' && String(x).split(/[()]/).includes(P.type)));
    if (no.length) out.push(`${tag} — 통솔 대가 ${P.b}: 각성체 둘 다 ${P.type} 타입이어야 합니다 (${no.map(p => p.name || '이름 없음').join(', ')})`);
  }
  return out;
}
function partyTypeN(t, ty) {
  return t.pokemon.filter(p => [p.t1, p.t2, p.t3].some(x => x && x !== '-' && String(x).split(/[()]/).includes(ty))).length;
}
function misagChecks(t) {
  if (!isMisag(t)) return [];
  const out = [],
    R = MR(),
    P = misagPen(t),
    e = misagEff(t),
    g = misagGrade(t);
  const nf = awList(t, 'free').length,
    nc = awList(t, 'c').length,
    wf = parseInt(R.free, 10) || 0,
    wc = parseInt(R.fixC, 10) || 0;
  if (nf !== wf || nc !== wc)
    out.push(`각성체는 ${AW_LAB.free} ${wf}체 · ${AW_LAB.c} ${wc}체여야 합니다 (지금 ${nf} · ${nc}) — 포켓몬 「기본」 탭의 각성체 칸`);
  {
    if (misagSubPr(t))
      for (const p of awList(t, 'c')) {
        const want = subPrOf(t, p);
        const have = String(prideOf(p) || '').toUpperCase();
        if (have !== want)
          out.push(
            p.subPrX
              ? `${AW_LAB.c} ${p.name || '이름 없음'} — 프라이드 ${have || '?'} · 예외로 지정한 값은 ${want}`
              : `${AW_LAB.c} ${p.name || '이름 없음'} — 프라이드 ${have || '?'} · 통솔 ${strip(t.ranks['통솔']) || '-'} 이면 ${want} (룰 「각성체와 대가」 11-03)`
          );
      }
  }
  if (g === '?') out.push(`${AW_LAB.free} 프라이드 ${prideOf(awList(t, 'free')[0])}는 대가 등급표에 없습니다 (테이블·계산식 「미사그 대학」)`);
  if ((g === 'B' || g === 'A') && !MISAG_CATS.includes(P.cat)) out.push(`각성체 대가 ${g} — 분류를 하나 골라야 합니다`);
  if (g === 'EX' && !Object.keys(e).length) out.push('EX 각성체 — GM이 대가를 하나 이상 골라야 합니다');
  if (e.지시) {
    const nd = misagOrdNeed(t);
    if (!(t.orders && t.orders.preset)) out.push('지시 대가 — 지시 체계(지령 종류)를 먼저 골라야 뺄 항목을 고를 수 있습니다');
    else
      for (const [k, lab] of [
        ['c', '지령 (6령)'],
        ['o', '명령 (4식)']
      ])
        if (nd[k] && misagOrdOff(t, k).length !== nd[k])
          out.push(`지시 대가 — ${lab}에서 ${nd[k]}개를 빼야 합니다 (지금 ${misagOrdOff(t, k).length}개)`);
  }
  if (e.통솔) {
    const need = [...(mHasB(e.통솔) ? ['B'] : []), ...(mHasA(e.통솔) ? ['A'] : [])];
    for (const lv of need) {
      const k = lv === 'A' ? P.a : P.b;
      const r = k && misagItem(k);
      if (!r) out.push(`통솔 대가 — ${lv} 항목을 하나 골라야 합니다`);
    }
    const used = need.map(lv => misagItem(lv === 'A' ? P.a : P.b)).filter(Boolean);
    if (used.some(r => r[3] === 'type') && !P.type) out.push('통솔 대가 — 특정 타입을 정해야 합니다');
    if (used.some(r => r[3] === 'role') && !String(P.role || '').trim()) out.push('통솔 대가 — 발동하지 않는 역할을 정해야 합니다');
    if (P.type && used.some(r => r[0] === P.b && r[3] === 'type')) {
      const n = partyTypeN(t, P.type),
        need2 = parseInt(R.typeN, 10) || 2;
      if (n < need2) out.push(`통솔 대가 ${P.b} — ${P.type} 타입이 ${need2}체 이상 필요합니다 (지금 ${n}체)`);
    }
  }
  const cap0 = mnum('distCap');
  if (cap0 > 0) {
    const cap = cap0 + Math.max(0, distExtra(t));
    const L = t.pokemon.filter(p => Math.abs(Math.round(+p.dist) || 0) > cap);
    /* 11-22: 조정 · 【준비】로 늘린 몫만큼 1체 상한도 */ if (L.length)
      out.push(`분배레벨은 1체에 −${cap} ~ +${cap}까지입니다 (${L.map(p => (p.name || '이름 없음') + ' ' + (Math.round(+p.dist) || 0)).join(', ')})`);
  }
  if (t.orders && t.orders.preset)
    for (const [k, lab] of [
      ['o', '명령 (4식)'],
      ['c', '지령 (6령)']
    ]) {
      const L = ordAvail(t, k).filter(x => !misagOffNow(t, k).includes(x)),
        n = Math.min(soloOrdN(k, t), L.length),
        pk = tOrdPick(t, k).filter(x => L.includes(x));
      if (pk.length !== n) out.push(`2체 기준 — ${lab}에서 ${n}개를 골라야 합니다 (지금 ${pk.length}개) · 지시 체계의 「2체 기준」 줄`);
      else if (k === 'c' && !soloMustOk(t, pk, L)) out.push('2체 기준 — 지시 A 이상은 지령 셋 중 하나가 회피나 명중이어야 합니다');
    }
  const gu = ptSockets(t, true),
    gm = misagGmCap(t);
  if (gu > gm) out.push(`각성체 PT 기술점 ${gu} / ${gm} 초과`);
  for (const x of misagTwoChecks(t)) out.push(x);
  for (const x of misagThreeChecks(t)) out.push(x);
  if (mHasA(e.능력)) {
    const sc = uqScore(t),
      cp = uqScoreCap(t.ranks['능력']) - misagUqPen(t);
    if (sc > cp)
      out.push(`능력 대가 — 고유 포텐셜 점수 ${sc} / ${cp} (상시 ${mnum('uqOn')} · 단발 ${mnum('uqOnce')}) · 단발 하나를 빼거나 상시를 단발로`);
  }
  return out;
}
function rulesDef() {
  return {
    misag: clone(MISAG_DEF),
    solo3: clone(SOLO3_DEF),
    soloOrd: clone(SOLO_ORD_DEF),
    invest: clone(INVEST_DEF),
    abil: clone(ABIL_DEF),
    ty: Object.entries(TY_CHART).map(([a, c]) => [a, c[0].join(','), c[1].join(','), c[2].join(',')])
  };
}
function rulesNormalize(db) {
  const d = rulesDef();
  if (!db.rules || typeof db.rules !== 'object' || Array.isArray(db.rules)) db.rules = {};
  const R = db.rules;
  if (!R.soloOrd || typeof R.soloOrd !== 'object') R.soloOrd = {};
  for (const k in d.soloOrd) if (R.soloOrd[k] == null || R.soloOrd[k] === '') R.soloOrd[k] = d.soloOrd[k];
  if (!R.solo3 || typeof R.solo3 !== 'object') R.solo3 = {};
  for (const k in d.solo3) if (R.solo3[k] == null || R.solo3[k] === '') R.solo3[k] = d.solo3[k];
  if (!R.misag || typeof R.misag !== 'object' || Array.isArray(R.misag)) R.misag = {};
  for (const k in d.misag) if (R.misag[k] == null || R.misag[k] === '') R.misag[k] = clone(d.misag[k]);
  if (!(+R.misag.v >= 2)) {
    /* 11-02 망령 「분배레벨 −15 / 15 로 바꿨는데 A 가 −20」: 11-01 기본값을 10 · 10 · 2 → 15 · 15 · 3 으로 바꿨지만 공유 DB 규칙에 옛 기본값이 남아 덮고 있었다. 옛 기본값 그대로인 칸만 새 기본값으로 (손으로 바꾼 값은 둔다) */ const OLD =
      { distB: '10', distA: '10', typeN: '2' };
    for (const k in OLD) if (String(R.misag[k]) === OLD[k]) R.misag[k] = MISAG_DEF[k];
    R.misag.v = 2;
  }
  if (!Array.isArray(R.misag.items)) R.misag.items = clone(MISAG_ITEMS_DEF);
  for (const r of R.misag.items) while (r.length < 4) r.push('');
  /* 11-03 22:30 망령 「통솔 B-1 3체로 강화한 거 룰북이랑 자동화 적용 안 시켰어?」: 11-01 에 기본 설명을 B-1 「3체 이상」 · A-1 「행동 불능」으로 바꿨지만 공유 DB 규칙(테이블·계산식 「미사그 대학」 통솔 항목)에 옛 설명이 남아 대가 고르기 · 오레마스로 넘기는 설명(misagOut)을 덮고 있었다. 옛 글 그대로인 칸만 새 기본 설명으로 */
  if (!(+R.misag.v >= 4)) {
    if (String(R.misag.subPr || '').replace(/\s/g, '') === 'D:C,C:C,B:B,A:B+,AA:B+') R.misag.subPr = MISAG_DEF.subPr;
  } /* 11-03 22:58 망령 「통솔 D 각성 (보조)는 D」: 30분 사이 옛 기본값으로 저장됐으면 새 기본값으로 */
  if (!(+R.misag.v >= 3)) {
    for (const r of R.misag.items) {
      const d = MISAG_ITEMS_DEF.find(x => x[0] === r[0]);
      if (!d) continue;
      const t = String(r[2] || '');
      if ((r[0] === 'B-1' && /2\s*체\s*이상/.test(t)) || (r[0] === 'A-1' && !/행동\s*불능/.test(t) && /발동/.test(t))) r[2] = d[2];
    }
    R.misag.v = 3;
  }
  if (!(+R.misag.v >= 5)) {
    for (const r of R.misag.items)
      if (r[0] === 'A-1' && String(r[2] || '').trim() === '자신 이외의 아군 중 특정 타입이 한 체도 없으면 자신은 행동 불능이 된다.')
        r[2] = MISAG_ITEMS_DEF.find(x => x[0] === 'A-1')[2];
  }
  /* 11-06 망령 「포텐셜도 막자」: A-1 기본 설명이 옛 글 그대로면 새 글로 */ if (!(+R.misag.v >= 6)) {
    for (const r of R.misag.items)
      if (
        r[0] === 'A-1' &&
        String(r[2] || '').trim() === '자신 이외의 아군 중 특정 타입이 한 체도 없으면 자신은 행동 불능이 되고, 자신의 포텐셜도 발동하지 않는다.'
      )
        r[2] = MISAG_ITEMS_DEF.find(x => x[0] === 'A-1')[2];
  }
  /* 11-09 망령 「짝 기준 채용」: 2체 기준 A-1 은 짝으로 — 기본 설명이 11-06 글 그대로면 새 글로 */ if (!(+R.misag.v >= 7)) {
    for (const r of R.misag.items)
      if (r[0] === 'A-1' && String(r[2] || '').indexOf('(6체: 필드 위 아군 · 2체 기준: 살아 있는 자기 포켓몬)') >= 0)
        r[2] = MISAG_ITEMS_DEF.find(x => x[0] === 'A-1')[2];
  }
  /* 11-10 망령 「2체 기준을 바꾸자 — 짝 말고 필드 위에 아군이 없을 때 혹은 자신의 타입이 변경되어 있을 때」: 기본 설명이 11-09 짝 글이면 새 글로 */ R.misag.v =
    Math.max(+R.misag.v || 0, 7);
  /* 11-14 제보 「룰북이 수정 안 됐대 — A-2 반대잖아」: 공유 규칙 표의 A-2 설명이 11-05 뒤집기 전 글(「나와 있는 동안 · 나와 있는 한 무효」)이면 새 글로 */ for (const r of R
    .misag.items || [])
    if (r && r[0] === 'A-2' && /나와\s*있는\s*(동안|한)/.test(String(r[2] || ''))) r[2] = MISAG_ITEMS_DEF.find(x => x[0] === 'A-2')[2];
  /* 11-11 망령 「A-1 은 게으름 마냥 다음 턴 행동 불능」: 공유 DB 규칙의 A-1 설명이 옛 기본 글이면 새 글로 */ for (const r of R.misag.items || [])
    if (
      r &&
      r[0] === 'A-1' &&
      String(r[2] || '').trim() ===
        '자신 이외의 아군 중 특정 타입이 한 체도 없으면 자신은 행동 불능이 되고, 자신의 포텐셜도 발동하지 않는다. (6체: 필드 위 아군 중 특정 타입 · 2체 기준: 타입을 세지 않고, 필드 위에 자신 이외의 아군이 없거나 자신의 타입이 바뀌어 있으면 행동 불능)'
    )
      r[2] = MISAG_ITEMS_DEF.find(x => x[0] === 'A-1')[2];
  if (!R.invest || typeof R.invest !== 'object') R.invest = {};
  for (const k in d.invest) if (R.invest[k] == null) R.invest[k] = d.invest[k];
  /* 10-30 망령 「메인 2점 + 덤프 1점은 전체 룰」: 투자 3회 · D 4회 → 2회 · D 3회 (예전 기본값일 때만) */
  if (!R.investV) {
    if (String(R.invest.allow) === '3') R.invest.allow = '2';
    if (String(R.invest.allowD) === '4') R.invest.allowD = '3';
    R.investV = 1;
  }
  if (!Array.isArray(R.abil) || !R.abil.length) R.abil = d.abil;
  for (const r of R.abil) while (r.length < 7) r.push('');
  if (!Array.isArray(R.ty) || !R.ty.length) R.ty = d.ty;
  for (const r of R.ty) while (r.length < 4) r.push('');
  return R;
}
const RULES = () => {
  const R = S.db && S.db.rules;
  return R && R.invest && Array.isArray(R.abil) && Array.isArray(R.ty) ? R : rulesNormalize(S.db);
};
function abilRow(r) {
  const L = RULES().abil;
  return L.find(x => x[0] === r) || L.find(x => x[0] === strip(r)) || L.find(x => x[0] === 'C') || ABIL_DEF[1];
}
const uniqNeed = r => {
  const n = parseInt(abilRow(r)[1], 10);
  return n >= 0 ? n : 1;
};
function abilLimits(r, solo) {
  const a = abilRow(r);
  if (solo === 3)
    return {
      u: a[2],
      x: s3num((+a[3] || 0) * (+(RULES().solo3 || SOLO3_DEF).ratio || 0.5)),
      xs: '6체 기준 × ' + (RULES().solo3 || SOLO3_DEF).ratio + ' · 1인 기준 (3체)'
    };
  if (solo) return { u: a[2], x: +a[5] || 0, xs: a[6] + ' · 1인 기준' };
  return abilLimitsBase(r);
}
function abilLimitsBase(r) {
  const a = abilRow(r);
  return { u: a[2], x: +a[3] || 0, xs: a[4] };
}
const ruleList = s =>
  String(s || '')
    .split(/[+,，·\s]+/)
    .map(x => x.trim())
    .filter(Boolean);
function investCheck(t) {
  const I = RULES().invest;
  const v = q => RV[strip(t.ranks[q])] ?? 0;
  const steps = QUAL.reduce((a, q) => a + Math.max(0, v(q)), 0);
  const ds = QUAL.filter(q => v(q) < 0).length;
  const allow = ds ? +I.allowD || 0 : +I.allow || 0;
  const dMax = +I.dMax || 0;
  const msg = [];
  if (ds > dMax) msg.push(dMax ? `「D」로 내릴 수 있는 자질은 ${dMax}개입니다` : '「D」로 내릴 수 있는 자질이 없습니다');
  if (steps > allow) msg.push(`투자 횟수 초과 (${steps}/${allow})`);
  const dp = ruleList(I.dPair).filter(q => QUAL.includes(q));
  if (ds && dp.length && dp.reduce((a, q) => a + Math.max(0, v(q)), 0) > (+I.dPairMax || 0))
    msg.push(`「D」 조정 시 ${dp.join('+')} 투자는 합쳐서 ${+I.dPairMax || 0}회까지`);
  for (const pr of String(I.banPair || '').split(/[,，]/)) {
    const qs = ruleList(pr).filter(q => QUAL.includes(q));
    if (qs.length > 1 && qs.every(q => v(q) >= 2)) msg.push(`${qs.join('·')} 모두 「A」 이상은 금지 조합`);
  }
  for (const q of ruleList(I.banAA)) if (QUAL.includes(q) && v(q) >= 3) msg.push(`「${q} : AA」는 사용 금지`);
  return { steps, allow, msg };
}

/* 11-03: 트레이너 한 명의 ⚠ 경고 모음 (폴더 점검표 · 시트의 경고 생성 함수를 그대로 다시 쓴다) */
function trainerWarns(t) {
  const out = [];
  try {
    const iv = investCheck(t);
    for (const m of iv.msg) out.push({ who: '', t: m });
    const use = pointUse(t);
    const offK = new Set(
      ptItems()
        .filter(r => ptItemOff(t, r[2]))
        .map(r => r[0])
    );
    for (const k in use) {
      if (offK.has(k)) continue;
      const m = (+t.base[k] || 0) + (k === distItem() ? distExtra(t) : 0);
      if (k && (use[k] || 0) > m) out.push({ who: '', t: `${k} 초과 (${Math.round((use[k] || 0) * 100) / 100}/${m})` });
    }
    const pu = ptSockets(t),
      pm = ptMax(t);
    if (pu > pm && !ruleOff(t, 'sock')) out.push({ who: '', t: `PT 기술점 초과 (${pu}/${pm})` });
    if (isMong(t))
      for (const p of t.pokemon) {
        const g = gyeCount(p),
          c = mongGye(t);
        if (g > c)
          out.push({ who: p.name || '이름 없음', pid: p.id, t: `『계제』(종족 포텐셜) ${g} / ${c}개 — 몽환 세계는 전원 3계제 · 육성 A 이상 4계제` });
      }
    out.push(...ruleLvWarns(t));
    for (const x of ptChecks(t)) out.push({ who: '', t: x });
    if (typeof deckChecks === 'function') for (const x of deckChecks(t)) out.push({ who: '', t: x });
    if (typeof sk3Checks === 'function') for (const x of sk3Checks(t)) out.push({ who: '', t: x });
    for (const p of t.pokemon) for (const c of pokeChecks(t, p)) if (c.w) out.push({ who: p.name || '이름 없음', pid: p.id, t: c.t });
  } catch (e) {
    out.push({ who: '', t: '점검 중 오류: ' + ((e && e.message) || e) });
  }
  return out;
}
function openFolderCheck(fid) {
  const f = fid ? fById(fid) : null;
  const ids = fid ? [fid, ...fDesc(fid)] : [''];
  const L = S.trainers.filter(t => tVis(t) && ids.includes(tFolder(t)));
  const rows = L.map(t => [t, trainerWarns(t)]);
  const n = rows.reduce((a, [, w]) => a + w.length, 0);
  const l = openModal(
    `<div class="mhead"><h2>점검 — ${esc(f ? f.name || '이름 없는 폴더' : '폴더 없음')}</h2><span class="small muted">트레이너 ${L.length}명 · 경고 ${n}건</span><span class="sp"></span><button class="btn ghost" data-x>닫기</button></div>
 <div class="mbody">${L.length ? rows.map(([t, w]) => `<div class="fchk"><div class="row" style="gap:6px;align-items:center"><b>${esc(t.name || '이름 없음')}</b><span class="small muted">포켓몬 ${t.pokemon.length}체 · ${w.length ? `<span class="warn">⚠ ${w.length}건</span>` : '<span class="ok">✓ 이상 없음</span>'}</span><span class="sp"></span><button type="button" class="btn xs ghost" data-goto-t="${esc(t.id)}">시트로</button></div>${w.length ? `<ul class="small fchkl">${w.map(x => `<li>${x.who ? `<button type="button" class="lnk" data-goto-t="${esc(t.id)}" data-goto-p="${esc(x.pid || '')}">${esc(x.who)}</button> · ` : ''}${esc(x.t)}</li>`).join('')}</ul>` : ''}</div>`).join('') : '<div class="empty">이 폴더에 (보이는) 트레이너가 없습니다</div>'}</div>`,
    { wide: true }
  );
  l.addEventListener('click', e => {
    if (e.target.closest('[data-x]')) closeModal();
  });
}

