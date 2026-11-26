/* ── 조각 02_calc.js — 계산 · 프라이드 · 계산 종족치 ── */
/* ---------- 계산 ---------- */
const strip = r => String(r || '').replace(/[+-]/g, '');
function baseLevel(rank) {
  const r = S.db.lvl.find(x => x[0] === rank) || S.db.lvl.find(x => x[0] === strip(rank));
  return r ? +r[2] : 100;
}
function sockRow(rank) {
  return S.db.sock.find(x => x[0] === strip(rank)) || S.db.sock.find(x => x[0] === 'C');
}
function grade(v) {
  if (v === '' || v == null || isNaN(+v)) return '-';
  let g = '-';
  for (const [b, c] of S.db.grade) {
    if (b === '' || isNaN(+b)) continue;
    if (+b <= +v) g = c;
    else break;
  }
  return g;
}
function gcol(g) {
  const s = strip(g);
  return (
    {
      S: 'var(--g-s)',
      AAA: 'var(--g-aaa)',
      AA: 'var(--g-aa)',
      A: 'var(--g-a)',
      B: 'var(--g-b)',
      C: 'var(--g-c)',
      D: 'var(--g-d)',
      E: 'var(--g-e)',
      EX: 'var(--g-s)'
    }[s] || 'var(--g-e)'
  );
}
function lv(t, p) {
  return baseLevel(t.ranks['육성']) + (Math.round(+p.dist) || 0) + lvBonus(t, p);
}
/* 11-18 망령 「【준비】/PT에 「타입 : 고스트」인 아군의 「LV : +2」 한다 — 이런 류처럼 레벨 보너스도」:
   PT(포켓몬 포텐셜 · 전용 · 트레이너 고유)의 【준비】 줄에 「LV : +N」(「레벨 : +N」)이 있으면 대상의 레벨에 더한다.
   대상: 「타입 : X」인 아군 / PT 전원 · 아군 전원 · 모든 아군 / 자신(그 밖은 자신). 공유 저장 때 pokemon 문서에 lvUp {n, by} 로 남겨 오레마스가 그대로 쓴다 */
function lvBonusList(t, p) {
  const out = [];
  if (!t || !p) return out;
  const tys = [p.t1, p.t2, p.t3].filter(x => x && x !== '-');
  const srcs = [];
  for (const q of t.pokemon || []) {
    if (!q) continue;
    (q.pots || []).forEach((n, i) => {
      if (n) srcs.push({ w: q, n, e: String(potEffOf(q, i) || '') });
    });
    if (q.excl && q.excl.name) srcs.push({ w: q, n: q.excl.name, e: String(q.excl.eff || '') });
  }
  for (const u of t.unique || []) if (u && u.name) srcs.push({ w: null, n: u.name, e: String(u.eff || '') });
  for (const x of srcs) {
    if (!/【\s*준비\s*】/.test(x.e)) continue;
    for (const cl of x.e.replace(/<br\s*\/?>/gi, '\n').split(/(?=[①-⑳])|\n/)) {
      if (!/【\s*준비\s*】/.test(cl)) continue;
      const m = cl.match(/「\s*(?:LV|Lv|lv|레벨)\s*[:：]\s*([+\-−])\s*(\d+)\s*」/);
      if (!m) continue;
      const n = (m[1] === '+' ? 1 : -1) * +m[2];
      /* 대상 = 「LV」 앞 글: 「타입 : X」 · 『역할/분류』(여럿이면 그중 하나) 가 있으면 PT 에서 그 조건에 맞는 아군, 「전원 · 모든 아군」이면 PT 전원, 아무것도 없으면 자신 (14:38 「PT에 「타입 : 고스트」인 『어쌔신』『바운서』『닌자』에게」) */
      const pre = cl.slice(0, cl.search(/「\s*(?:LV|Lv|lv|레벨)\s*[:：]/)).replace(/【(?:[^【】]|【[^【】]*】)*】\s*\/?/g, '');
      const tm = pre.match(/「타입\s*[:：]\s*([^」]+)」/);
      const rs = [...pre.matchAll(/『([^』]+)』/g)].map(z => z[1].trim());
      const nk = z => String(z || '').replace(/[『』\s]/g, '');
      let ok;
      if (tm || rs.length) {
        const w = tm ? tm[1].split(/[,·\/]/).map(z => z.trim()) : [];
        ok = (!tm || tys.some(z => w.includes(z))) && (!rs.length || rs.some(r => nk(r) === nk(roleOf(p)) || nk(r) === nk(classOf(p))));
      } else if (/PT\s*(?:의\s*)?전원|아군\s*전원|모든\s*아군|PT의\s*모든/.test(pre)) ok = true;
      else ok = x.w === p;
      if (ok) out.push({ n, by: '『' + String(x.n).replace(/[『』]/g, '') + '』' + (x.w ? '' : ' (고유)') });
    }
  }
  return out;
}
const lvBonus = (t, p) => lvBonusList(t, p).reduce((a, x) => a + x.n, 0);
/* 11-22 망령 「분배레벨 좀 임의로 조정할 수 있는 기능 — 강자 NPC 나 【육성 : B】【준비】/「분배 레벨 : +10」 한다 이런 거」:
   PT 분배레벨 몫(보유 · 미사그 각성체 2체 몫 · 1체 상한)에 더한다 = 트레이너 「분배레벨 조정」(t.distAdj ± · 사유 t.distNote) + 【준비】 「분배 레벨 : ±N」(포켓몬 포텐셜 · 전용 · 트레이너 고유).
   그 줄의 【육성 : B】 같은 자질 태그는 조건 — 트레이너 자질이 그 랭크 이상일 때만 (종족치 자동화 buCondOk 와 같은 읽기) */
function distBonusList(t) {
  const out = [];
  if (!t) return out;
  const srcs = [];
  for (const q of t.pokemon || []) {
    if (!q) continue;
    (q.pots || []).forEach((n, i) => {
      if (n) srcs.push({ w: q, n, e: String(potEffOf(q, i) || '') });
    });
    for (const x of [q.excl, ...(q.exclX || [])]) if (x && x.eff) srcs.push({ w: q, n: x.name || '전용', e: String(x.eff || '') });
  }
  for (const u of t.unique || []) if (u && u.name) srcs.push({ w: null, n: u.name, e: String(u.eff || '') });
  for (const x of srcs) {
    if (!/【\s*준비\s*】/.test(x.e)) continue;
    const hd = (x.e.match(/^\s*((?:【(?:[^【】]|【[^【】]*】)*】\s*)+)/) || ['', ''])[1];
    for (const cl of x.e.replace(/<br\s*\/?>/gi, '\n').split(/(?=[①-⑳])|\n/)) {
      const m = cl.match(/「\s*분배\s*레벨\s*[:：]\s*([+\-−])\s*(\d+)\s*」/);
      if (!m) continue;
      const tags = /【\s*준비\s*】/.test(cl) ? cl : hd + cl;
      if (!/【\s*준비\s*】/.test(tags)) continue;
      let ok = true;
      for (const r of tags.matchAll(/【(육성|지시|통솔|능력)\s*:\s*(EX|S|AAA|AA|A|B|C|D|E)[+-]?\s*(이상)?】/g)) {
        const have = BU_L.indexOf(strip((t.ranks || {})[r[1]] || ''));
        if (have < BU_L.indexOf(r[2])) ok = false;
      }
      out.push({
        n: (m[1] === '+' ? 1 : -1) * +m[2],
        by: '『' + String(x.n).replace(/[『』]/g, '') + '』' + (x.w ? ' (' + (x.w.name || '?') + ')' : ' (고유)'),
        ok
      });
    }
  }
  return out;
}
const distAdjOf = t => Math.round(+(t || {}).distAdj || 0);
const distExtra = t =>
  distAdjOf(t) +
  distBonusList(t)
    .filter(x => x.ok)
    .reduce((a, x) => a + x.n, 0);
const distItem = () => (ptItems().find(r => r[2] === 'dist') || [])[0];
/* 11-22 04:11 망령 「10+10 에서 20 이면 8 / 12 가 되어야」: 미사그 — 늘린 몫도 기본과 같은 비율(1인 값 / 6체 값, 육성 C·B- 는 4/10)로 각성체 몫 · PL 몫에 나눈다 (반올림) */
function distExtraAw(t) {
  const dx = distExtra(t);
  if (!dx) return 0;
  const r = ((t && t.ranks) || {})['육성'],
    d1 = tplSolo('육성', '분배레벨', r),
    d6 = tplSix('육성', '분배레벨', r);
  return d1 != null && d6 > 0 ? Math.round((dx * +d1) / +d6) : Math.round(dx / 3);
}
function distExtraTip(t) {
  const L = distBonusList(t);
  return [
    distAdjOf(t) ? `조정 ${distAdjOf(t) > 0 ? '+' : ''}${distAdjOf(t)}${t.distNote ? ' (' + t.distNote + ')' : ''}` : '',
    ...L.map(x => `${x.by} ${x.n > 0 ? '+' : ''}${x.n}${x.ok ? '' : ' — 자질 조건 미달이라 안 셈'}`)
  ]
    .filter(Boolean)
    .join(' · ');
}
/* 테이블(더블) Q198:Q203 — 개체치·노력치·성격 미사용(0 / 0 / 1.0) */
/* 10-22 망령: 특성 · 포텐셜 · 전용에 적힌 「○○의 종족치를 N랭크 상승(감소)시킨다」 → 실수치 · 등급 · 종족치 합에 반영.
   10-27 망령 (룰북 「종족치」의 랭크 범위 개정): 1랭크 = 알파벳 등급 하나 (C → B), 칸(- · 무 · +)은 유지하고 그 칸에서 가장 낮은 값이 된다 (A- 110 · 119 → AA- 140).
   「종족치 범위를 최대화」 = 지금 칸(- · 무 · +)의 맨 위 (AA- 140 → 149). 옛 「「+」 보정을 가한다」도 같은 효과로 읽는다.
   「자신을 「X : R」로 만든다」 = 그 종족치 1랭크 상승과 같다 → 지금 칸이 R 보다 한 등급 아래일 때만 (A+ 만들기 = B+ 필요), 아니면 점검 경고.
   「「공격 : C」일 때」 = C0 칸만 (C- · C+ 아님), 「이상 · 이하」도 칸까지 비교. 【육성 : A】 같은 트레이너 랭크 조건은 그대로. 조건은 원래 종족치로 본다.
   예정 합계 경고는 원래 종족치로 본다 (특성으로 오른 몫은 특성 TO 로 낸 값) */
const BU_ST = { 'HP': 0, '공격': 1, '방어': 2, '특공': 3, '특방': 4, '스피드': 5 };
const BU_L = ['E', 'D', 'C', 'B', 'A', 'AA', 'AAA', 'S', 'EX'];
function buRows() {
  const L = [];
  for (const [b, c] of (S.db && S.db.grade) || []) {
    if (b === '' || isNaN(+b) || !c || c === '-') continue;
    L.push([+b, String(c)]);
  }
  L.sort((a, b) => a[0] - b[0]);
  return L.map((r, i) => ({ lo: r[0], hi: L[i + 1] ? L[i + 1][0] - 1 : Math.max(r[0], 255), g: r[1], l: strip(r[1]) }));
}
function buAt(R, v) {
  let k = -1;
  for (let i = 0; i < R.length; i++) if (R[i].lo <= v) k = i;
  return k;
}
/* 칸 이름(C- · C · C+)을 낮은 칸부터의 순번으로 */
function buIdx(g) {
  const R = buRows();
  return R.findIndex(r => r.g === g);
}
function buSub(g) {
  g = String(g || '');
  return g.endsWith('+') ? '+' : g.endsWith('-') ? '-' : '';
}
function gradeStep(v, n) {
  v = +v || 0;
  const R = buRows();
  const k = buAt(R, v);
  if (k < 0 || !n) return v;
  const cur = R[k];
  const L = [...new Set(R.map(r => r.l))];
  const li = L.indexOf(cur.l);
  const tl = L[Math.max(0, Math.min(L.length - 1, li + n))];
  if (tl === cur.l) return v;
  const ts = R.filter(r => r.l === tl);
  const T = ts.find(r => buSub(r.g) === buSub(cur.g)) || ts[Math.min(R.filter(r => r.l === cur.l).indexOf(cur), ts.length - 1)] || ts[0];
  return T.lo;
} /* 10-27: 옮겨 간 칸에서 가장 낮은 값 */
function gradeMax(v) {
  v = +v || 0;
  const R = buRows();
  const k = buAt(R, v);
  if (k < 0) return v;
  return Math.max(v, R[k].hi);
}
/* 11-01 망령 「-보정이나 종족치를 내리는 효과도 자동화?」: 「-」 보정 · 범위 최소화 = 지금 칸의 맨 아래 / 「X」의 종족치가 「E」가 된다 = 그 등급 칸(같은 - · 무 · +, 없으면 첫 칸)의 가장 낮은 값 */
function gradeMin(v) {
  v = +v || 0;
  const R = buRows();
  const k = buAt(R, v);
  if (k < 0) return v;
  return Math.min(v, R[k].lo);
}
function gradeSet(v, g) {
  const R = buRows();
  const l = strip(g),
    sb = buSub(g);
  const L = R.filter(r => r.l === l);
  if (!L.length) return v;
  const T = L.find(r => buSub(r.g) === sb) || L.find(r => buSub(r.g) === '') || L[0];
  return T.lo;
} /* 10-27: 지금 칸(- · 무 · +)의 맨 위 */
function buCondOk(t, p, txt) {
  for (const m of txt.matchAll(/「([^」:]+?)\s*:\s*(EX|S|AAA|AA|A|B|C|D|E)([+-]?)」\s*(이상|이하)?일\s*때/g)) {
    const sts = m[1]
      .split(/[\/,·\s]+/)
      .map(s => BU_ST[s.trim()])
      .filter(x => x != null);
    if (!sts.length) continue;
    const need = buIdx(m[2] + m[3]);
    if (need < 0) continue;
    for (const i of sts) {
      const g = buIdx(grade(p.base[i]));
      if (m[4] === '이상' ? g < need : m[4] === '이하' ? g > need : g !== need) return false;
    }
  }
  for (const m of txt.matchAll(/【(육성|지시|통솔|능력)\s*:\s*(EX|S|AAA|AA|A|B|C|D|E)[+-]?\s*(이상)?】/g)) {
    const have = BU_L.indexOf(strip(((t && t.ranks) || {})[m[1]] || ''));
    if (have < BU_L.indexOf(m[2])) return false;
  }
  return true;
}
const BU_C = new Map();
function baseUp(t, p) {
  const src = [];
  const ab = p.ability && idx.abil ? idx.abil.get(p.ability) : null;
  if (ab && ab[2]) src.push(['특성', p.ability, ab[2]]);
  (p.pots || []).forEach((n, i) => {
    if (n && n !== '-') {
      const e = potEffOf(p, i);
      if (e) src.push(['포텐셜', String(n).replace(/『|』/g, ''), e]);
    }
  });
  for (const x of [p.excl, ...(p.exclX || [])])
    if (x && x.eff && x.name !== '전용 포텐셜')
      src.push([
        '전용',
        x.name || '(이름 없는 전용)',
        x.eff
      ]); /* 11-21 망령 「존 헨리 전용 자동화 왜 안 먹혀」: 이름을 아직 안 정한(보구 이름 고르는 중) 전용도 효과가 있으면 종족치에 반영 — exclAll 은 이름 있는 것만 세서 빠졌음 */
  const key = JSON.stringify([p.base, src.map(s => s[2]), t && t.ranks, p.auto]);
  const hit = BU_C.get(key);
  if (hit) return hit;
  const n = [0, 0, 0, 0, 0, 0],
    mx = [0, 0, 0, 0, 0, 0],
    mn = [0, 0, 0, 0, 0, 0],
    set = [null, null, null, null, null, null],
    by = [[], [], [], [], [], []],
    miss = [];
  const add = [0, 0, 0, 0, 0, 0],
    addBy = [[], [], [], [], [], []],
    cp = [null, null, null, null, null, null],
    top = [0, 0, 0, 0, 0, 0];
  for (const [kind, name, eff] of src) {
    for (const cl of String(eff)
      .replace(/<br\s*\/?>/g, '\n')
      .split(/\n|(?=[①-⑳])/)) {
      /* 11-10 망령 「트랜스처럼 배틀 중 종족치 변경」: 지속(N턴 동안 · 턴 종료 시까지 · 이번 턴) · 계기(했을 때 · 되었을 때 · 받았을 때 · 【선행】【사전】【함성】【보급】【N/시】)가 붙은 마디는 시트에 넣지 않는다 — 웹툴 구문 「종족치변경」이 배틀 중에 걸고 풀면 원래대로 */
      if (/\d턴\s*동안|턴\s*종료\s*시\s*까지|이번\s*턴|했을\s*때|되었을\s*때|받았을\s*때|【(?:선행|사전|함성|보급|\d+\s*\/\s*[시턴])/.test(cl))
        continue;
      for (const m of cl.matchAll(/「([^」]+)」의\s*종족치(?:를|가|도)?\s*(\d+)\s*랭크\s*(상승|감소)/g)) {
        if (!buCondOk(t, p, cl.slice(0, m.index))) continue;
        const d = (+m[2] || 1) * (m[3] === '감소' ? -1 : 1);
        for (const s of m[1].split(/[\/,·\s]+/)) {
          const i = BU_ST[s.trim()];
          if (i == null) continue;
          n[i] += d;
          by[i].push(`${kind} 『${name}』 ${d > 0 ? '+' : ''}${d}랭크`);
        }
      }
      /* 11-03 망령: 「「공격」을 가장 높은 종족치와 같은 랭크로 만든다」 (상시 효과일 때만 — 나이트 쉽 계열 「이때」는 기술 한 번만이라 뺀다) */
      for (const m of cl.matchAll(/「([^」]+)」(?:의\s*종족치)?(?:을|를)\s*가장\s*높은\s*종족치와\s*같은\s*랭크로\s*(?:만든|만들|한다|하고)/g)) {
        if (/이때|내보낸다|(?:내보낼|내보내는|사용할|쓸)\s*때/.test(cl.slice(0, m.index))) continue;
        /* 11-23 21:52 망령 「다이슨 스피어는 특공이 AA-로 올라있는데?」: 「…「스타브레이커」를 내보낼 때 「특공」을 가장 높은 종족치와 같은 랭크로」도 그 기술 한정 → 시트 종족치에 안 넣는다 (웹툴 기술최고) */ /* 11-03 망령: 「기술 X 를 내보낸다. 이때, …」는 그 기술 한 번만 → 시트엔 안 넣는다 (웹툴 기술사용 최고:) */ if (
          !buCondOk(t, p, cl.slice(0, m.index))
        )
          continue;
        for (const s of m[1].split(/[\/,·\s]+/)) {
          const i = BU_ST[s.trim()];
          if (i == null) continue;
          top[i] = 1;
          by[i].push(`${kind} 『${name}』 가장 높은 종족치와 같은 랭크`);
        }
      }
      for (const m of cl.matchAll(/「([^」]+)」의\s*종족치\s*범위를\s*최대화/g)) {
        if (!buCondOk(t, p, cl.slice(0, m.index))) continue;
        for (const s of m[1].split(/[\/,·\s]+/)) {
          const i = BU_ST[s.trim()];
          if (i == null) continue;
          mx[i] = 1;
          by[i].push(`${kind} 『${name}』 범위 최대`);
        }
      }
      /* 옛 「「+」 보정을 가한다」 = 범위 최대화 (10-27 룰북). 11-01 망령 「종족치에 + 보정을 가하는 포텐셜 자동화 안 돼?」: 「「공격」 종족치에 「+」 보정」 · 「「공격」의 종족치에 + 보정」 꼴도 읽는다 */
      for (const m of cl.matchAll(/「([^」]+)」\s*(?:의\s*)?(?:종족치\s*)?에\s*「?\s*[+＋]\s*」?\s*보정/g)) {
        if (!buCondOk(t, p, cl.slice(0, m.index))) continue;
        for (const s of m[1].split(/[\/,·\s]+/)) {
          const i = BU_ST[s.trim()];
          if (i == null) continue;
          mx[i] = 1;
          by[i].push(`${kind} 『${name}』 「+」 보정 = 범위 최대`);
        }
      }
      for (const m of cl.matchAll(/「([^」]+)」\s*(?:의\s*)?(?:종족치\s*)?에\s*「?\s*[-－−]\s*」?\s*보정/g)) {
        if (!buCondOk(t, p, cl.slice(0, m.index))) continue;
        for (const s of m[1].split(/[\/,·\s]+/)) {
          const i = BU_ST[s.trim()];
          if (i == null) continue;
          mn[i] = 1;
          by[i].push(`${kind} 『${name}』 「-」 보정 = 범위 최소`);
        }
      }
      for (const m of cl.matchAll(/「([^」]+)」의\s*종족치\s*범위를\s*최소화/g)) {
        if (!buCondOk(t, p, cl.slice(0, m.index))) continue;
        for (const s of m[1].split(/[\/,·\s]+/)) {
          const i = BU_ST[s.trim()];
          if (i == null) continue;
          mn[i] = 1;
          by[i].push(`${kind} 『${name}』 범위 최소`);
        }
      }
      for (const m of cl.matchAll(
        /「([^」]+)」의\s*종족치(?:가|를|는)?\s*「(EX|S|AAA|AA|A|B|C|D|E)([+-]?)」\s*(?:가|이|로|으로)\s*(?:된다|만든다)/g
      )) {
        const pre = cl.slice(0, m.index);
        if (/(상대|대상|정면|아군)(?:의|을|를)?\s*$/.test(pre) || !buCondOk(t, p, pre)) continue;
        for (const s of m[1].split(/[\/,·\s]+/)) {
          const i = BU_ST[s.trim()];
          if (i == null) continue;
          set[i] = m[2] + m[3];
          by[i].push(`${kind} 『${name}』 ${m[2] + m[3]} 로 고정`);
        }
      }
      /* 「자신을 「방어 : C+」로 만든다」 = 1랭크 상승 — 한 등급 아래 같은 칸(D+)일 때만 */
      for (const m of cl.matchAll(/「([^」:]+?)\s*:\s*(EX|S|AAA|AA|A|B|C|D|E)([+-]?)」\s*(?:으?로|가)\s*(?:만든|된다)/g)) {
        const pre = cl.slice(0, m.index);
        if (!/자신(?:을|의)?\s*$/.test(pre) || !buCondOk(t, p, pre)) continue;
        const tg = m[2] + m[3],
          ti = BU_L.indexOf(m[2]);
        for (const s of m[1].split(/[\/,·\s]+/)) {
          const i = BU_ST[s.trim()];
          if (i == null || p.base[i] === '' || p.base[i] == null) continue;
          const g = grade(p.base[i]);
          if (g === tg) continue;
          const ok = BU_L.indexOf(strip(g)) === ti - 1 && buSub(g) === m[3];
          if (ok) {
            n[i] += 1;
            by[i].push(`${kind} 『${name}』 ${tg} 만들기 (+1랭크)`);
          } else
            miss.push(
              `${kind} 『${name}』: 「${STATS[i]} : ${tg}」 만들기는 「${STATS[i]} : ${BU_L[ti - 1] || '-'}${m[3]}」일 때만 (지금 ${g} ${p.base[i]}) — 반영 안 함`
            );
        }
      }
    }
    /* 그 칸의 자동화 구문: 종족치 방어,특방 +1 · 종족치 스피드 최대 (구문 생성기 「종족치 (시트)」) */
    for (const ln of String(autoDsl(p, name)).split(/\n|;/)) {
      const sc = ln.trim().match(/^실수치\s+(.+?)\s+=\s*(공격|방어|특공|특방|스피드)\s*$/);
      if (sc) {
        const j = BU_ST[sc[2]];
        for (const x of sc[1].split(/[,\/·\s]+/)) {
          const i = BU_ST[x.trim()];
          if (i == null || i === 0 || i === j) continue;
          cp[i] = j;
          addBy[i].push(`${kind} 『${name}』 실수치 = ${sc[2]}`);
        }
        continue;
      } /* 「공격을 특공과 같게」 */
      const sa = ln.trim().match(/^실수치\s+(.+?)\s+([+\-]\d+)\s*$/);
      if (sa) {
        for (const x of sa[1].split(/[,\/·\s]+/)) {
          const i = BU_ST[x.trim().toUpperCase() === 'HP' ? 'HP' : x.trim()];
          if (i == null) continue;
          add[i] += +sa[2];
          addBy[i].push(`${kind} 『${name}』 실수치 ${+sa[2] > 0 ? '+' : ''}${+sa[2]}`);
        }
        continue;
      } /* 11-02 망령: 시트 실수치 ± */
      const m = ln.trim().match(/^종족치\s+(.+?)\s+(최대|최고|[+\-]?\d+)\s*$/);
      if (!m) continue;
      if (m[2] === '최고') {
        for (const s of m[1].split(/[,\/·\s]+/)) {
          const i = BU_ST[s.trim().toUpperCase() === 'HP' ? 'HP' : s.trim()];
          if (i == null) continue;
          top[i] = 1;
          by[i].push(`${kind} 『${name}』 구문 가장 높은 종족치와 같은 랭크`);
        }
        continue;
      }
      const d = m[2] === '최대' ? 0 : +m[2];
      for (const s of m[1].split(/[,\/·\s]+/)) {
        const i = BU_ST[s.trim().toUpperCase() === 'HP' ? 'HP' : s.trim()];
        if (i == null) continue;
        if (m[2] === '최대') {
          mx[i] = 1;
          by[i].push(`${kind} 『${name}』 구문 범위 최대`);
        } else if (d) {
          n[i] += d;
          by[i].push(`${kind} 『${name}』 구문 ${d > 0 ? '+' : ''}${d}랭크`);
        }
      }
    }
  }
  const base = p.base.map((v, i) => {
    if (v === '' || v == null || isNaN(+v)) return v;
    let x = gradeStep(+v, n[i]);
    if (mx[i]) x = gradeMax(x);
    if (mn[i]) x = gradeMin(x);
    if (set[i]) x = gradeSet(x, set[i]);
    return x;
  });
  top.forEach((on, i) => {
    if (!on || base[i] === '' || base[i] == null) return;
    let mx = -1;
    base.forEach((v, j) => {
      if (j !== i && v !== '' && v != null && +v > mx) mx = +v;
    });
    if (mx > +base[i] && grade(mx) !== grade(base[i])) base[i] = gradeSet(+base[i], grade(mx));
  });
  const up = base.map((v, i) => (v !== p.base[i] && +v !== +p.base[i] ? { i, from: +p.base[i], to: +v, by: by[i] } : null)).filter(Boolean);
  const r = { base, up, miss, add, addBy, cp };
  if (BU_C.size > 400) BU_C.clear();
  BU_C.set(key, r);
  return r;
}
const effB = (t, p) => baseUp(t, p).base;
const buTip = (t, p, i) => {
  const u = baseUp(t, p).up.find(x => x.i === i);
  return u ? `${STATS[i]} ${u.from} (${grade(u.from)}) → ${u.to} (${grade(u.to)}) · ${u.by.join(' · ')}` : '';
};
function stat(t, p, i) {
  const bu = t ? baseUp(t, p) : null;
  const raw = k => {
    const b = +effB(t, p)[k] || 0,
      L = lv(t, p);
    const core = Math.floor((Math.floor(b * 2) + (+(p.ivs || [])[k] || 0)) * (L / 100));
    return k === 0 ? core + 10 + L : core + 5;
  };
  const j = bu && bu.cp && bu.cp[i] != null ? bu.cp[i] : i;
  const ad = bu ? +(bu.add || [])[i] || 0 : 0;
  return Math.max(1, raw(j) + ad);
} /* 11-02 망령: 시트 실수치 ± · 「공격을 특공과 같게」(구문 「실수치 공격 =특공」) */ /* 10-23: 개체값(알까기)도 더한다 — 오레마스와 같은 식 */
/* 10-23 망령: 알까기 — 트레이너 육성 랭크만큼 1d32-1 ×6 후보를 굴려 하나 고른다 (오레마스 reroll_list 와 같은 표) */
const IVROLL = { E: 1, D: 3, C: 5, B: 10, A: 15, AA: 20, AAA: 25, S: 30 },
  IVBIG = 130;
const ivCount = t => +(IVROLL[strip((t.ranks || {})['육성'])] || 5);
const ivRoll = () => STATS.map(() => Math.floor(Math.random() * 32));
const ivSum = iv => (iv || []).reduce((a, b) => a + (+b || 0), 0);
function ivHtml(t, ti, p, pi) {
  const iv = p.ivs || [0, 0, 0, 0, 0, 0];
  const has = !!p.ivs;
  const sum = ivSum(iv);
  const lg = p.ivLog;
  return `<div class="ivbox"><div class="ivhd"><b>개체값</b><span class="small muted">${has ? `합 <b class="num ${sum > IVBIG ? 'warn' : ''}">${sum}</b>` : '아직 안 깠다 (0)'}${lg ? ` · ${esc(lg.d || '')} 알까기 ${+lg.n || 0}회${lg.x ? ` + 추가 ${lg.x}` : ''}${lg.r ? ` · 다시 굴림 ${lg.r}` : ''}${lg.e ? ' · 손으로 고침' : ''}` : ''}</span><span class="sp"></span><button class="btn sm pri" data-act="ivHatch" data-i="${ti}" data-j="${pi}">🥚 알까기 <span class="faint">(${ivCount(t)}회)</span></button>${has ? `<button class="btn sm ghost" data-act="ivClear" data-i="${ti}" data-j="${pi}" title="개체값을 비운다 (0)">비우기</button>` : ''}</div>
  <div class="ivrow6">${STATS.map((s, k) => `<label><span>${s}</span><input type="number" min="0" max="31" inputmode="numeric" data-ivs="${ti}.${pi}.${k}" value="${has ? iv[k] : ''}" placeholder="0" class="${iv[k] <= 1 && has ? 'lo' : iv[k] >= 30 ? 'hi' : ''}"></label>`).join('')}</div>
  <div class="faint small">오레마스가 시트를 불러오면 이 값이 들어간다 (여기서 바꾸면 방에서 깐 값보다 우선)</div></div>`;
}
/* 10-24 망령: 굴린 후보는 포켓몬에 남긴다(P.ivRolls = {rolls, x, r}) — 알까기를 다시 열면 그 후보가 그대로 나와 다시 고를 수 있다.
   후보가 바뀌는 건 🎲(하나) · 「전부 다시 굴림」 · 「+ 추가 굴림」을 눌렀을 때뿐. 아직 후보가 없으면 처음 열 때 한 번 굴려서 바로 남긴다 */
const ivRollsOf = P => {
  const R = P && P.ivRolls;
  return R && Array.isArray(R.rolls)
    ? R.rolls.filter(r => Array.isArray(r) && r.length === 6).map(r => r.map(v => Math.max(0, Math.min(31, Math.round(+v) || 0))))
    : null;
};
async function openIvHatch(T, P) {
  const lg = P.ivLog;
  const had = !!(P.ivs && P.ivs.some(v => +v > 0));
  const count = ivCount(T);
  const saved = ivRollsOf(P);
  const used = { x: +(P.ivRolls || {}).x || 0, r: +(P.ivRolls || {}).r || 0 };
  let rolls = saved && saved.length ? saved : had ? [] : Array.from({ length: count }, ivRoll);
  const keep = () => {
    P.ivRolls = { rolls: rolls.map(r => r.slice()), x: used.x, r: used.r };
    save();
  };
  if (!(saved && saved.length) && rolls.length) keep(); /* 처음 굴린 후보도 바로 남긴다 — 창을 닫았다 열어도 같은 후보 */
  const same = (a, b) => a && b && a.length === b.length && a.every((v, k) => +v === +b[k]);
  let chosen = had ? rolls.findIndex(r => same(r, P.ivs)) : -1;
  const cell = v => `<b class="${v <= 1 ? 'lo' : v >= 30 ? 'hi' : ''}">${v}</b>`;
  const tbl = iv => `<div class="ivt">${STATS.map(k => `<span>${k}</span>`).join('')}${iv.map(cell).join('')}</div>`;
  const l = openModal(
    `<div class="mhead"><h2>알까기 — ${esc(P.name || '포켓몬')}</h2><span class="small muted" data-ivc></span><span class="sp"></span><button class="btn ghost" data-x>닫기</button></div><div class="mbody">
  <div class="ivnow"><span class="small muted">지금</span>${P.ivs ? tbl(P.ivs) + `<span class="small">합 <b>${ivSum(P.ivs)}</b></span>` : '<span class="small muted">없음</span>'}</div>
  <p class="small muted" style="margin:6px 0">굴린 후보는 남아 있어서 다시 열어도 그대로다 · 하나를 눌러 고르고 「적용」 · <b class="ivlg lo">0–1</b> 낮음 · <b class="ivlg hi">30–31</b> 높음 · 🎲 = 그 후보만 다시 굴림 · <b class="ivlg big">★ 합 ${IVBIG} 초과</b> 는 다시 굴리기 전에 한 번 더 묻는다</p>
  <div class="ivhad" data-ivhad><div><b>남아 있는 후보가 없다</b><div class="small muted">${lg && lg.d ? esc(lg.d) + ' 에 깐 값이다 · ' : ''}후보를 남기기 전에 깐 포켓몬이라 지금 값만 있다. 새 후보가 필요하면 「🎲 굴리기」 — 적용을 누르기 전까지 지금 값은 그대로</div></div><button class="btn pri" data-ivroll>🎲 굴리기 (${count}회)</button></div>
  <div class="ivgrid" data-ivg></div></div><div class="mfoot" data-ivfoot><button class="btn ghost" data-ivall>전부 다시 굴림</button><button class="btn ghost" data-ivadd>+ 추가 굴림</button><span class="sp"></span><button class="btn pri" data-ivok>적용</button></div>`,
    { wide: true }
  );
  const draw = () => {
    const empty = !rolls.length;
    $('[data-ivfoot]', l).style.display = empty ? 'none' : '';
    $('[data-ivhad]', l).style.display = empty ? '' : 'none';
    $('[data-ivc]', l).textContent = `육성 ${(T.ranks || {})['육성'] || '-'} → ${count}회${used.x ? ' + 추가 ' + used.x + '회' : ''}`;
    $('[data-ivg]', l).innerHTML = rolls
      .map((r, i) => {
        const s = ivSum(r);
        const cur = had && same(r, P.ivs);
        return `<div class="ivc ${chosen === i ? 'on' : ''} ${s > IVBIG ? 'big' : ''}" data-ivpick="${i}"><div class="ivh"><span class="faint">#${i + 1}</span>${cur ? '<span class="ivcur">지금 값</span>' : ''}<span class="sp"></span><span class="ivsum ${s > IVBIG ? 'big' : ''}">${s > IVBIG ? '★ ' : ''}합 ${s}</span><button class="btn sm ghost" data-ivre="${i}" title="이 후보만 다시 굴림">🎲</button></div>${tbl(r)}</div>`;
      })
      .join('');
  };
  draw();
  l.addEventListener('click', async e => {
    if (e.target.closest('[data-x]')) {
      closeModal();
      return;
    }
    const re = e.target.closest('[data-ivre]');
    if (re) {
      const i = +re.dataset.ivre;
      const s = ivSum(rolls[i]);
      if (s > IVBIG && !(await ask(`#${i + 1} 은 합 ${s} — ${IVBIG} 넘는 후보입니다. 정말 다시 굴릴까요?`, '다시 굴림'))) return;
      rolls[i] = ivRoll();
      used.r++;
      if (chosen === i) chosen = -1;
      keep();
      draw();
      return;
    }
    if (e.target.closest('[data-ivroll]')) {
      rolls = Array.from({ length: count }, ivRoll);
      used.r += rolls.length;
      chosen = -1;
      keep();
      draw();
      return;
    }
    const pk = e.target.closest('[data-ivpick]');
    if (pk) {
      chosen = +pk.dataset.ivpick;
      draw();
      return;
    }
    if (e.target.closest('[data-ivadd]')) {
      rolls.push(ivRoll());
      used.x++;
      keep();
      draw();
      const g = $('[data-ivg]', l);
      g.lastElementChild && g.lastElementChild.scrollIntoView({ block: 'nearest' });
      return;
    }
    if (e.target.closest('[data-ivall]')) {
      const big = rolls.filter(r => ivSum(r) > IVBIG).length;
      if (
        !(await ask(
          `후보 ${rolls.length}개가 전부 새로 바뀝니다.${big ? `<br>합 ${IVBIG} 넘는 후보 ${big}개도 같이 사라집니다.` : ''}`,
          '전부 다시 굴림'
        ))
      )
        return;
      rolls = Array.from({ length: count + used.x }, ivRoll);
      used.r += rolls.length;
      chosen = -1;
      keep();
      draw();
      return;
    }
    if (e.target.closest('[data-ivok]')) {
      if (chosen < 0) {
        toast('하나 골라 주세요');
        return;
      }
      P.ivs = rolls[chosen].slice();
      const d = new Date();
      P.ivLog = { d: `${d.getMonth() + 1}/${d.getDate()}`, n: count, x: used.x, r: used.r };
      P.ivRolls = { rolls: rolls.map(r => r.slice()), x: used.x, r: used.r };
      closeModal();
      save();
      refreshTrainer(T);
      toast(`알까기 → ${P.ivs.join('/')} (합 ${ivSum(P.ivs)})`);
    }
  });
}
const typeInfo = n => S.db.types.find(x => x[0] === String(n || '').replace(/\(.*/, '')) || null;
function tchip(n) {
  if (!n || n === '-') return '';
  const parts = String(n).match(/[^()]+/g) || [n];
  return parts
    .map(x => {
      const ti = typeInfo(x);
      return `<span class="chip" style="background:${(ti && safeCss(ti[1])) || 'var(--sunk2)'};color:${(ti && safeCss(ti[2])) || 'var(--ink)'}">${esc(x)}</span>`;
    })
    .join('');
}
const NOSOCK = ['도우미', '감싸기', '쉬프트업'];
/* 역할·분류 포텐셜: 슬롯 위치가 아니라 종류로 찾는다 (끌어서 순서를 바꿔도 그대로). 종류를 모르는 옛 데이터는 1·2번 슬롯을 본다 */
function potIdx(p, g, slot) {
  for (let i = 0; i < p.pots.length; i++) if (p.pots[i] && potGroup(potKindOf(p, i)) === g) return i;
  return p.pots[slot] && !potKindOf(p, slot) ? slot : -1;
}
const roleOf = p => {
  const i = potIdx(p, '역할', 0);
  return i < 0 ? '' : p.pots[i];
};
const classOf = p => {
  const i = potIdx(p, '분류', 1);
  return i < 0 ? '' : p.pots[i];
};
function moveSock(p, m) {
  if (!m || !m.name) return 0;
  if ((roleOf(p) === '커맨더' || roleOf(p) === '어시스트') && NOSOCK.includes(m.name)) return 0;
  const r = idx.moves.get(m.name);
  return (r && r[0] !== '' && !isNaN(+r[0]) ? +r[0] : 3) - (m.half ? 0.5 : 0);
}
const OLDK = ['올드 타입', '리전 폼', '다이맥스', '메가진화', '고대종', '공명종', '전설종'];
function moveCap(t, p) {
  const k = classOf(p);
  const filled = p.moves.filter(m => m.name);
  let used = filled.reduce((a, m) => a + moveSock(p, m), 0);
  let mode = 'socket',
    cap;
  if (OLDK.includes(k)) {
    mode = 'count';
    cap = 4;
    return { used: filled.length, cap: nz(p.sockMax) ? +p.sockMax : cap, mode, auto: cap, pt: oldSock() };
  }
  if (['적응종', '델타종'].includes(k)) cap = 7;
  else {
    const gs = S.db.sock.map(x => x[0]);
    const g = s => {
      const m = (grade(s) || '').match(/[A-Z]+/);
      const i = m ? gs.indexOf(m[0] === 'EX' && !gs.includes('EX') ? 'S' : m[0]) : -1;
      return i < 0 ? 99 : i;
    };
    const i = Math.min(g(p.base[1]), g(p.base[3]));
    if (i === 99) cap = null;
    else {
      const tot = p.base.reduce((a, b) => a + (+b || 0), 0);
      cap = +S.db.sock[i][tot >= 570 ? 3 : tot >= 525 ? 2 : 1];
    }
  }
  const bon = sockBonus(p).mv;
  if (cap != null && bon) cap = +(cap + bon).toFixed(2);
  if (ruleOff(t, 'sock'))
    return { used, cap: null, mode, auto: null, ov: false, bon, off: true }; /* 폴더 규칙(몽환 세계): 기술 소켓 상한 없음 — 합계만 */
  const ov = nz(p.sockMax);
  return { used, cap: ov ? +p.sockMax : cap, mode, auto: cap, ov, bon };
}
/* 10-27 망령: 육성형 보너스 — 기술 하나의 소켓 상한 (경고만, 막지는 않는다).
   육성 A 이상: 할인 뒤 2.5까지 (소켓 3에 할인 체크 = 2.5 는 된다, 3 은 안 된다)
   육성 B: 할인 뒤 2.5 미만 (소켓 2.5 에 할인 체크하면 된다)
   C 이하: 할인과 상관없이 원래 소켓 2.5 미만. 『올드 타입』 계열(기술 4개 고정)은 예외 */
const BIGMV = 2.5,
  BIGMV_RANK = 'A',
  BIGMV_HALF = 'B';
const brk = t => BU_L.indexOf(strip(((t && t.ranks) || {})['육성']));
const rawSock = (p, m) => moveSock(p, Object.assign({}, m, { half: false }));
const isBigMv = (t, p, m) => {
  if (!(t && m && m.name) || OLDK.includes(classOf(p)) || ruleOff(t, 'sock')) return false;
  const r = brk(t);
  if (r >= BU_L.indexOf(BIGMV_RANK)) return moveSock(p, m) > BIGMV;
  if (r >= BU_L.indexOf(BIGMV_HALF)) return moveSock(p, m) >= BIGMV;
  return rawSock(p, m) >= BIGMV;
};
const bigMvRule = t => {
  const r = brk(t);
  return r >= BU_L.indexOf(BIGMV_RANK)
    ? `육성 ${BIGMV_RANK}는 할인 뒤 소켓 ${BIGMV}까지`
    : r >= BU_L.indexOf(BIGMV_HALF)
      ? `육성 ${BIGMV_HALF}는 소켓 ${BIGMV} 기술에 할인을 체크해야 함`
      : `소켓 ${BIGMV} 이상 기술은 육성 ${BIGMV_HALF}(할인) · ${BIGMV_RANK}부터`;
};
const bigMvs = (t, p) => (p.moves || []).filter(m => isBigMv(t, p, m));
const bigMvTxt = (t, L) =>
  `기술 소켓 상한을 넘는 기술 · ${bigMvRule(t)} (지금 육성 ${(t.ranks || {})['육성'] || '-'}) · ${L.map(m => m.name).join(', ')}`;
/* 10-28 망령: 「날따름」(「분노가루」 등 날따름 상태 기술 포함)과 「와이드가드」는 한 포켓몬이 같이 들 수 없다 (경고만) */
const FOLLOW_MV = ['날따름', '분노가루'],
  WIDE_MV = '와이드가드';
const followWide = p => {
  const n = (p.moves || []).map(m => m.name);
  const f = n.filter(x => FOLLOW_MV.includes(x));
  return f.length && n.includes(WIDE_MV) ? [...f, WIDE_MV] : null;
};
const followWideTxt = L => `「날따름」 계열과 「와이드가드」는 한 포켓몬이 같이 들 수 없습니다 · ${L.join(', ')}`;
const oldSock = () => {
  const v = +(S.db.oldSock ?? 5.5);
  return isNaN(v) ? 5.5 : v;
};
const capTxt = (c, none = '-', sep = ' / ') =>
  c.off ? `${c.used} (상한 없음)` : c.mode === 'count' ? `${c.used}개(${c.pt})` : `${c.used}${sep}${c.cap ?? none}`;
function ptSockets(t, aw) {
  let u = 0;
  const m = isMisag(t);
  for (const p of t.pokemon) {
    if (m && !!awOf(t, p) !== !!aw) continue;
    if (p && p.bench) continue;
    /* 11-07 망령 「기술점도 빼」: 대기(벤치)는 PT 기술점에서 뺀다 */ const c = moveCap(t, p);
    u += c.mode === 'count' ? c.pt : c.used;
  }
  return Math.round(u * 100) / 100;
}
/* ---------- 프라이드 · 계산 종족치 (2026-10-25 종족치 분배 개편) ----------
   룰북 「포켓몬 제작」. 숫자는 전부 테이블·계산식 탭 「종족치 · 프라이드 규칙」에서 고친다 (공유 설정 meta/set.pride).
   커스텀: 계산 종족치 = 실제 합 + 하한분(공격·특공·스피드, 선공 하한) + 내구 할증 + HP 할증(HP 점수 × 내구 비율 · 11-24) + 화력·스피드 할증 − 쌍두 할인 + 특성 TO 조정
           → 그 값을 담을 수 있는 가장 낮은 계단이 프라이드.
   올드 타입: 실제 합을 버림해서 계단을 고른다(할증 없음). 480 미만은 0.5점(짓궂은마음 제외), 『프렌들리 몬스터』는 B 이하일 때 합 −10,
           올드 타입 DB 「프라이드」 칸이 있으면 그 값.
   10-29 망령: 480 미만 0.5점 계단 이름을 「D」(종족치 455)로. 「통솔 : D」 트레이너의 『현대종』은 통솔점은 그 프라이드대로 내고
           계산 종족치는 한 단계 아래 계단까지만 담는다 (A→548 · B+→525 · B→503 · C+→480 · C→455). D 계단은 커스텀이 직접 고르지 않는다. */
const PRIDE_V = 2;
const PRIDE_DEF = {
  v: PRIDE_V,
  rows: [
    ['C', '1', '480', '40', '1', ''],
    ['C+', '1.5', '503', '43', '1', '최소종족치 임시'],
    ['B', '2', '525', '45', '1', ''],
    ['B+', '2.5', '548', '48', '1', '최소종족치 임시'],
    ['A', '3', '570', '50', '1.5', '특성 TO 덤 0.5 · 되팔 수 없음'],
    ['EX', '4', '630', '55', '2', '본가 전설종 또는 그에 준하는 스펙 · 직접 지정']
  ],
  oldLow: { lab: 'D', pt: '0.5', v: '455', prank: '짓궂은마음' },
  oldCap: '600',
  friendly: { name: '프렌들리 몬스터', d: '10', max: 'B' },
  toStep: '45',
  toDown: '25',
  toFloor: '1',
  toMin: '0.5',
  realMin: '400',
  absMin: '31',
  durMin: '150',
  opp: '0.4',
  weakAtk: '60',
  bulk: { lo: '85', hi: '105', k1: '0.5', k2: '0.75' },
  hp: {
    lo: '95',
    hi: '120',
    k1: '0.5',
    k2: '0.75',
    dlo: '60',
    dhi: '90'
  } /* 11-24 망령 「체력 A 에 방어/특방이 D~C 면 그대로 할증은 이상 — 내구와 체력이 양립해야 의미」: HP 점수 × 내구 비율(방어·특방 평균 dlo 에서 0, dhi 에서 1) */,
  fs: { lo: '105', hi: '120', k1: '0.5', k2: '1', slo: '90', shi: '140' },
  dual: { lo: '90', hi: '120', k: '1' },
  prio: {
    pow: '50',
    rows: [
      ['상시', '60', '70', '85'],
      ['조건부', '55', '60', '70']
    ],
    abil: '짓궂은마음:60, 질풍날개:60',
    moves: '구멍함정:초'
  }
}; /* 11-08 망령 「용의분노 우선도 빼고 2소켓」: 선공기가 아니게 되어 이 줄에서 뺌 */ /* 11-06 망령 「구멍함정, 용의분노는 신속이랑 같은 85」: 기술 이름:칸(약 · 강 · 초) 또는 숫자 — 위력 · 우선도와 상관없이 그 칸 */
const PR = () => (S.db && S.db.pride && S.db.pride.v >= PRIDE_V ? S.db.pride : PRIDE_DEF);
/* 옛 프라이드 표(C/B/A/EX · 화력균형 · 최소종족치 1개)는 개편 규칙으로 바꾼다 */
function prideMigrate(db) {
  const pr = db && db.pride;
  if (!pr || !pr.v || pr.v < PRIDE_V) {
    db.pride = clone(PRIDE_DEF);
    db.prideExV = 1;
    return;
  }
  const d = PRIDE_DEF;
  for (const k in d) {
    if (pr[k] == null) pr[k] = clone(d[k]);
    else if (d[k] && typeof d[k] === 'object' && !Array.isArray(d[k])) for (const j in d[k]) if (pr[k][j] == null) pr[k][j] = clone(d[k][j]);
  }
  if (String(pr.oldLow.lab).trim() === '0.5') pr.oldLow.lab = 'D';
} /* 10-29: 옛 「0.5」 표시 → D 계단 */
const pnum = (x, d) => {
  const v = parseFloat(x);
  return isNaN(v) ? d : v;
};
/* 11-24 HP 할증의 내구 비율: 방어·특방 평균이 dlo(60) 이하면 0, dhi(90) 이상이면 1 */
const hpRatio = (b, R) => {
  const o = (R && R.hp) || {},
    lo = pnum(o.dlo, 60),
    hi = pnum(o.dhi, 90);
  return Math.max(0, Math.min(1, ((b[2] + b[4]) / 2 - lo) / Math.max(1, hi - lo)));
};
const two = (x, o) => pnum(o.k1, 0.5) * Math.max(0, Math.min(x, pnum(o.hi, 0)) - pnum(o.lo, 0)) + pnum(o.k2, 1) * Math.max(0, x - pnum(o.hi, 0));
const prSteps = () =>
  PR()
    .rows.filter(r => r && r[0])
    .map(r => ({ lab: String(r[0]).trim(), pt: pnum(r[1], 0), v: pnum(r[2], 0), floor: pnum(r[3], 40), to: pnum(r[4], 1), note: r[5] || '' }))
    .sort((a, b) => a.v - b.v);
const isEX = s => /^EX$/i.test(s.lab);
function prRow(k) {
  if (!k) return null;
  const L = PR().oldLow || {};
  if (String(k) === String(L.lab || 'D') || String(k) === '0.5')
    return [String(L.lab || 'D'), String(L.pt || '0.5'), String(L.v || '455'), '', '', ''];
  return PR().rows.find(r => r[0] === k) || null;
}
const prStep = k => prSteps().find(s => s.lab === k) || null;
const isOld = p => OLDK.includes(classOf(p));
/* 10-29 망령: 「통솔 : D」의 『현대종』 — 한 단계 아래 계단의 종족치까지만. 계단 줄 = D(oldLow) · C … EX */
const DOWN_LEAD = 'D',
  DOWN_CLASS = '현대종';
const lowStep = () => {
  const L = PR().oldLow || PRIDE_DEF.oldLow;
  return { lab: String(L.lab || 'D'), pt: pnum(L.pt, 0.5), v: pnum(L.v, 455), floor: 0, to: 1, note: '' };
};
const trOfPoke = p => (S.trainers || []).find(t => (t.pokemon || []).some(x => x === p || (p && p.id && x && x.id === p.id))) || null;
const leadDown = (p, t) => {
  if (!p) return false;
  const tr = t || trOfPoke(p);
  if (!tr || strip((tr.ranks || {})['통솔'] || '') !== DOWN_LEAD) return false;
  if (typeof isMisag === 'function' && isMisag(tr)) return p.awaken === 'free';
  /* 11-03 22:58 · 11-04 01:52 망령: 미사그 대학에서는 『현대종』 대신 「각성 (대가)」에 한 단계 아래 종족치 (보조는 D) */ return (
    classOf(p) === DOWN_CLASS
  );
};
function stepCap(st, down) {
  if (!st) return 0;
  if (!down) return st.v;
  const L = [lowStep(), ...prSteps()];
  const i = L.findIndex(x => x.lab === st.lab);
  return i > 0 ? L[i - 1].v : st.v;
}
const capLab = (st, down) => {
  if (!st) return '-';
  if (!down) return st.lab;
  const L = [lowStep(), ...prSteps()];
  const i = L.findIndex(x => x.lab === st.lab);
  return i > 0 ? L[i - 1].lab : st.lab;
}; /* 11-18 한 단계 아래면 그 아래 계단 이름(C → D)으로 보인다 */
/* 10-27 망령: 「올드 타입 전용」 기술 — 기술 DB 줄의 21번째 칸(r[20]) 'O'. 칸이 없는 줄(원본 · 예전에 고친 줄 · 엑셀/토큰 가져오기)은
   원본 시트 「기술 목록(더블)」에서 이름이 붉은 글씨인 기술(아래 목록)을 따른다. 올드 타입 계열(isOld)이 아닌 포켓몬의 기술 목록에는 안 뜬다 */
const OLDONLY_DEF = new Set([
  '거대해머',
  '거수참',
  '거수탄',
  '더블펀처',
  '골드러시',
  '타키온커터',
  '액셀브레이크',
  '3연화살',
  '레이징불 (격투)',
  '배수의진',
  '섀도스틸',
  '분노의주먹',
  '성묘',
  '아스트랄비트',
  '레이징불 (노말)',
  '찍찍베기',
  '우유마시기',
  '작아지기',
  '회생의기도',
  '제살깎기',
  '껍질깨기',
  '꼬리자르기',
  '블러드문',
  '폭음파',
  '테라클러스터',
  '한판내기',
  '드래곤애로',
  '소울비트',
  '무한다이빔',
  '다이맥스포',
  '변덕레이저',
  '사우전드애로',
  '덩굴방망이 (물)',
  '레이징불 (물)',
  '아가미물기',
  '수류연타',
  '덩굴방망이 (바위)',
  '암석액스',
  '메테오빔',
  '반딧불',
  'V제너레이트',
  '덩굴방망이 (불꽃)',
  '레이징불 (불꽃)',
  '화염의수호',
  '깜짝헤드',
  '프리폴',
  '데스윙',
  '이차원러시',
  '도각참',
  '암흑강타',
  '비검천중파',
  '블로킹',
  '트집',
  '다크홀',
  '블리자드랜스',
  '포톤가이저 (물리)',
  '초승달의기도',
  '파워셰어',
  '가드셰어',
  '스피드스왑',
  '프리즘레이저',
  '포톤가이저 (특수)',
  '이차원홀',
  '루미나콜리전',
  '사이코웨이브',
  '실리콘번',
  '오라휠',
  '전격부리',
  '일렉트로빔',
  '라이트닝드라이브',
  '지오컨트롤',
  '덩굴방망이 (풀)',
  '트릭플라워',
  '정글힐',
  '버섯포자',
  '코튼가드',
  '힘흡수',
  '클로로블라스트',
  '휘적휘적포'
]);
const MV_OLDONLY = 20;
const mvOldOnly = r => !!r && (r[MV_OLDONLY] != null ? r[MV_OLDONLY] === 'O' : OLDONLY_DEF.has(r[2]));
const baseTot = p => p.base.reduce((a, b) => a + (+b || 0), 0);
const baseNums = p => [0, 1, 2, 3, 4, 5].map(i => +p.base[i] || 0);
const listOf = s =>
  String(s || '')
    .split(/[,，\n]/)
    .map(x => x.trim())
    .filter(Boolean);
/* 특성 소켓. 「1.5/2.5」처럼 둘이면 비자속/자속 — 효과 글의 첫 타입 「X」가 포켓몬 타입에 있으면 뒤 값 (10-26 망령: 트랜지스터 · 용의턱) */
function abStabType(eff) {
  const T = new Set((S.db.types || []).map(x => x[0]));
  for (const m of String(eff || '').matchAll(/「([^」]+)」/g)) if (T.has(m[1])) return m[1];
  return '';
}
/* 11-06 12:04 망령 「오리지널/그 이외보다 GM 전용 / 올타 전용 / 그 이외로 · 클릭 안 해도 알 수 있게 칩」: 특성 6번째 칸 「구분」 — 'GM 전용' · '올타 전용'(예전 'O' 도) · 빈칸 */
/* 11-06 12:32 망령 「그 이외 → 범용 · 오리지널은 기존처럼 GM 전용으로」: 빈칸인 오리지널(S.custom) 은 GM 전용으로 읽는다. 「범용」이라고 적으면 오리지널이어도 범용 */
function abKind(r) {
  const v = String((r && r[5]) || '').replace(/\s/g, '');
  if (/^GM/i.test(v)) return 'gm';
  if (v === 'O' || /^올/.test(v)) return 'old';
  if (v === '범용') return '';
  return r && S.custom && (S.custom.abil || []).includes(r[1]) ? 'gm' : '';
}
function abKindChip(r) {
  const k = abKind(r);
  return k === 'gm' ? '<span class="kindb abk-gm">GM 전용</span>' : k === 'old' ? '<span class="kindb abk-old">올타 전용</span>' : '';
}
function abSock(p) {
  /* 11-03 망령 「특성 소켓을 지정할 수 있는 옵션이 없다」: 시트에 직접 적은 특성 소켓(abSockOv)이 DB 값보다 우선 — DB 에 없는 오리지널 특성도 */ const ov =
    String(p.abSockOv ?? '').trim();
  if (ov !== '' && !isNaN(+ov)) return +ov;
  const ab = idx.abil && idx.abil.get(p.ability);
  if (!ab) return null;
  const v = String(ab[0] ?? '').trim();
  const two = v.match(/^(\d+(?:\.\d+)?)\s*\/\s*(\d+(?:\.\d+)?)$/);
  if (two) {
    const ty = abStabType(ab[2]);
    return +(ty && [p.t1, p.t2, p.t3].includes(ty) ? two[2] : two[1]);
  }
  /* 11-06 망령 「이중 무효화 특성 — 약점 타입이 무효화 대상이면 소켓 상승 비고가 안 걸려 있음」: 1.5 소켓 「A/B」 대미지 무효화(비실체 · 수렁 · 드라이아이스)는 자기 타입이 둘 다 아니거나 둘 중 하나가 자신에게 효과가 굉장하면 2 */
  {
    const m = v === '1.5' && String(ab[2] || '').match(/「([^」\/]+)\/([^」\/]+)」\s*(?:기술|대미지)[^。\n]{0,10}무효화/);
    if (m) {
      const ts = [p.t1, p.t2, p.t3].flatMap(tyParts).filter((x, i, a) => a.indexOf(x) === i);
      const nul = [m[1].trim(), m[2].trim()];
      if (ts.length && (!nul.some(t => ts.includes(t)) || nul.some(t => tyMult(t, ts) > 1))) return 2;
    }
  }
  return v !== '' && !isNaN(+v) ? +v : null;
}
const hasPotName = (p, re) => (p.pots || []).some(n => n && re.test(n));
/* 10-26 망령: 소켓 보너스 — 전용 · 포텐셜 · 특성 글에 「특성」「기술」 소켓에 「+0.5」 같은 문장이 있으면 자동으로 읽고, 칸에 직접 적으면 그 값이 우선. {ab, mv, src:[…]} */
function sockBonus(p) {
  const out = { ab: 0, mv: 0, src: [] };
  const texts = [];
  (p.pots || []).forEach((n, i) => {
    if (n) texts.push([n, String(potEffOf(p, i) || '')]);
  });
  if (p.excl && p.excl.eff) texts.push([p.excl.name || '전용', String(p.excl.eff)]);
  const abr = idx.abil && idx.abil.get(p.ability);
  if (abr) texts.push([p.ability, String(abr[2] || '')]);
  for (const [nm, tx] of texts) {
    for (const m of tx.matchAll(
      /「?(특성|기술)」?(?:\s*(?:과|와|·|,)\s*「?(특성|기술)」?)?\s*소켓」?(?:에|을|를)?\s*「?\s*([+＋])\s*(\d+(?:\.\d+)?)\s*」?/g
    )) {
      const v = +m[4];
      const ks = [m[1], m[2]].filter(Boolean);
      if (ks.includes('특성')) out.ab += v;
      if (ks.includes('기술')) out.mv += v;
      out.src.push(`『${nm}』 ${ks.join('·')} +${v}`);
    }
  }
  if (nz(p.sockBonAb)) {
    out.ab = +p.sockBonAb;
    out.manual = 1;
  }
  if (nz(p.sockBonMv)) {
    out.mv = +p.sockBonMv;
    out.manual = 1;
  }
  return out;
}
/* 쌍두: 물리기·특수기를 각각 1개 이상 */
function dualMoves(p) {
  const cats = new Set((p.moves || []).filter(m => m.name).map(m => (idx.moves.get(m.name) || [])[6]));
  return cats.has('물리') && cats.has('특수');
}
/* 선공 하한: 선공기(우선도 +1 이상 · 자신/자기 진영 대상 제외) · 특성 · 포텐셜에서 가장 높은 스피드 하한 */
const PRIO_SELF = /^(자신|아군|자진|아군 전체|필드 전체|자기 필드|아군 필드|자신 · 아군)$/;
function prioInfo(p) {
  const P = PR().prio || PRIDE_DEF.prio;
  const rows = P.rows || PRIDE_DEF.prio.rows;
  const powT = pnum(P.pow, 50);
  let best = { floor: 0, src: '', kind: '' };
  const take = (f, src, kind) => {
    if (f > best.floor) best = { floor: f, src, kind };
  };
  const MV = new Map();
  for (const pair of listOf(P.moves ?? PRIDE_DEF.prio.moves)) {
    const [n, v] = pair.split(/[:：=]/).map(x => x && x.trim());
    if (n && v) MV.set(n, v);
  }
  const cell = (cond, col) => pnum((rows[cond ? 1 : 0] || [])[col], 0);
  const KN = ['', '약', '강', '초'];
  for (const m of p.moves || []) {
    if (!m.name) continue;
    const r = idx.moves.get(m.name);
    if (!r) continue;
    const pr = String(r[11] ?? '');
    const ns = (pr.match(/-?\d+(\.\d+)?/g) || []).map(Number);
    if (!ns.length) continue;
    const pv = Math.max(...ns);
    if (pv < 1) continue;
    if (PRIO_SELF.test(String(r[9] || '').trim())) continue;
    const cond = /~/.test(pr) || /실패/.test(String(r[13] || ''));
    const pow = +r[7] || 0;
    const col = pv >= 2 && pow >= powT ? 3 : pow >= powT ? 2 : 1;
    const mv = MV.get(m.name),
      mc = mv ? KN.indexOf(mv) : -1;
    if (mv && mc > 0) {
      take(cell(cond, mc), m.name, (cond ? '조건부' : '상시') + '·' + mv + ' (따로)');
      continue;
    }
    if (mv && !isNaN(parseFloat(mv))) {
      take(pnum(mv, 0), m.name, '직접 ' + mv + ' (따로)');
      continue;
    }
    take(cell(cond, col), m.name, (cond ? '조건부' : '상시') + '·' + KN[col]);
  }
  for (const pair of listOf(P.abil)) {
    const [n, v] = pair.split(/[:：=]/).map(x => x && x.trim());
    if (n && p.ability === n) take(pnum(v, 0), '특성 ' + n, '특성');
  }
  (p.pots || []).forEach((n, i) => {
    if (!n) return;
    const eff = String(potEffOf(p, i) || '');
    if (!/우선도\s*[:：]?\s*\+\s*\d/.test(eff)) return;
    const cond = /【\s*\d+\s*\/\s*시\s*】|【\s*1\/시\s*】/.test(eff);
    take(cell(cond, 2), '『' + n + '』', (cond ? '조건부' : '상시') + '·강 (포텐셜)');
  });
  return best;
}
/* 커스텀 포켓몬 계산 종족치 — 계단마다 하한이 달라서 낮은 계단부터 맞춰 본다 */
function customCalc(p, t, at) {
  const R = PR(),
    b = baseNums(p),
    real = b.reduce((a, c) => a + c, 0);
  let down = leadDown(p, t);
  /* 11-18 망령 「(통솔 D 보조) 이거 D로 감소 왜 안 돼」: 미사그 각성 (보조)의 프라이드가 통솔대로 D 면 C 계단 한 단계 아래(D 455) 하나로 고정 — 위 계단으로 넘어가지 않는다 */
  const subD = (() => {
    const tr = t || trOfPoke(p);
    return !!(
      tr &&
      p &&
      p.awaken === 'c' &&
      typeof isMisag === 'function' &&
      isMisag(tr) &&
      typeof misagSubPr === 'function' &&
      subPrOf(tr, p) === String((PR().oldLow || {}).lab || 'D').toUpperCase()
    );
  })();
  if (subD) down = true;
  const main = Math.max(b[1], b[3]);
  const bulk = two(Math.min(b[2], b[4]), R.bulk),
    hpRaw = two(b[0], R.hp),
    hpR = hpRatio(b, R),
    hp = hpRaw * hpR;
  /* 11-19 망령 「HP/방어/특방을 완전히 최소치로 두는 게 이론적으론 가능 — 3개를 아무리 낮춰도 실질 계산으론 150 이상」: 셋의 합이 하한(durMin)보다 낮으면 모자란 만큼을 계산에 더한다 (하나하나 하한은 없음) */
  const dMin = pnum(R.durMin ?? PRIDE_DEF.durMin, 150),
    dSum = b[0] + b[2] + b[4],
    fdur = Math.max(0, dMin - dSum);
  const F = R.fs,
    fs =
      two(main, { lo: F.lo, hi: F.hi, k1: F.k1, k2: F.k2 }) *
      Math.max(0, Math.min(1, (Math.min(b[5], pnum(F.shi, 140)) - pnum(F.slo, 90)) / Math.max(1, pnum(F.shi, 140) - pnum(F.slo, 90))));
  const D = R.dual,
    dualOk = dualMoves(p),
    dualRaw = pnum(D.k, 1) * Math.max(0, Math.min(Math.min(b[1], b[3]), pnum(D.hi, 120)) - pnum(D.lo, 90)),
    dual = dualOk ? dualRaw : 0;
  const pri0 = prioInfo(p),
    ov = String(p.prioOv ?? '').trim(),
    pri =
      ov === '' ? pri0 : { floor: Math.max(0, pnum(ov, 0)), src: pnum(ov, 0) ? '직접 지정' : '직접 지정 · 없음', kind: '예외', auto: pri0, ov: true },
    opp = Math.round(main * pnum(R.opp, 0.4)),
    s0 = abSock(p),
    sb = sockBonus(p).ab,
    s = s0 == null ? null : Math.max(0, +(s0 - sb).toFixed(2)),
    per = pnum(R.toStep, 45) * 2,
    perD = pnum(R.toDown, 25) * 2,
    toF = pnum(R.toFloor, 1);
  /* 11-22 망령 「프라이드 바꿔도 적용이 안 됨」: 직접 지정한 프라이드(at)면 그 계단 하나로만 셈 — 예전엔 늘 「담을 수 있는 가장 낮은 계단」으로 셈해서, 특성 TO 처럼 계단마다 달라지는 할증이 지정한 계단 기준으로 안 보였다 (B 지정인데 머리에 A · 남는 점수 45) */
  const all = prSteps().filter(x => !isEX(x));
  const pin = at && !subD ? all.find(x => x.lab === String(at).trim()) : null;
  const steps = pin ? [pin] : all.slice(0, subD ? 1 : 99);
  let last = null;
  for (const st of steps) {
    const fa = Math.max(0, Math.max(st.floor, b[1] < main ? opp : 0) - b[1]),
      fc = Math.max(0, Math.max(st.floor, b[3] < main ? opp : 0) - b[3]);
    const sf = Math.max(st.floor, pri.floor),
      fsp = Math.max(0, sf - b[5]);
    const to = s == null ? st.to : s;
    const toAdj =
      per * Math.max(0, to - st.to) -
      perD *
        Math.max(
          0,
          toF - Math.max(to, pnum(R.toMin, 0.5))
        ); /* 11-01 망령 「0특 끼면 종족치뻥이 너무 많다 — 0특은 0.5랑 감소치 같게」: 되팔기는 TO 0.5 까지만 (toMin) */ /* 10-27 망령: 1보다 내릴 때(되팔기)는 0.5당 25 (올릴 때 45 와 따로) */
    const ct = real + fa + fc + fsp + fdur + bulk + hp + fs - dual + toAdj,
      cap = stepCap(st, down);
    last = {
      real,
      b,
      fa,
      fc,
      fsp,
      sf,
      fdur,
      dMin,
      dSum,
      off: fa + fc + fsp + fdur,
      opp,
      bulk,
      hp,
      hpRaw,
      hpR,
      fs,
      dual,
      dualRaw,
      dualOk,
      pri,
      to,
      toRaw: s0,
      toBon: sb,
      toBase: st.to,
      toAdj,
      ct,
      step: st,
      cap,
      down,
      ok: ct <= cap + 1e-9
    };
    if (last.ok) return last;
  }
  return (
    last || {
      real,
      b,
      ct: real + fdur,
      fdur,
      dMin,
      dSum,
      step: null,
      cap: 0,
      down,
      ok: false,
      off: fdur,
      bulk: 0,
      hp: 0,
      hpRaw: 0,
      hpR: 0,
      fs: 0,
      dual: 0,
      toAdj: 0,
      pri,
      opp,
      fa: 0,
      fc: 0,
      fsp: 0,
      sf: 0
    }
  );
}
/* 올드 타입 */
function oldDbPride(p) {
  const r = idx.old && idx.old.get(p.name);
  const v = r ? String(r[17] ?? '').trim() : '';
  return v && prRow(v) ? v : '';
}
function oldCalc(p) {
  const R = PR(),
    real = baseTot(p),
    steps = prSteps(),
    L = R.oldLow || PRIDE_DEF.oldLow,
    Fr = R.friendly || PRIDE_DEF.friendly;
  const db = oldDbPride(p);
  if (db) return { real, t: real, lab: db, src: 'db' };
  const stepOf = t => {
    let st = null;
    for (const s of steps) if (!isEX(s) && t >= s.v) st = s;
    return st;
  };
  const cap = pnum(R.oldCap, 600);
  if (real > cap) {
    const ex = steps.find(isEX);
    return { real, t: real, lab: ex ? ex.lab : 'EX', src: 'cap' };
  }
  const st0 = stepOf(real),
    maxS = prStep(String(Fr.max || 'B'));
  const fName = String(Fr.name || '프렌들리 몬스터').replace(/[『』]/g, '');
  const fr = hasPotName(p, new RegExp(fName.replace(/\s+/g, '\\s*'))) && (!st0 || !maxS || st0.v <= maxS.v);
  const t = real - (fr ? pnum(Fr.d, 10) : 0);
  const st = stepOf(t);
  const prank = listOf(L.prank).includes(p.ability);
  if (!st) {
    const low = steps.find(s => !isEX(s));
    return prank
      ? { real, t, lab: low ? low.lab : 'C', src: 'prank', friendly: fr }
      : { real, t, lab: String(L.lab || 'D'), src: 'low', friendly: fr };
  }
  return { real, t, lab: st.lab, src: 'floor', friendly: fr };
}
/* 직접 지정한 프라이드면 그 계단으로 셈한 계산 (자동 · EX · 올드는 그대로) */
function customCalcP(p, t) {
  return customCalc(p, t, prideIsAuto(p) ? null : prideOf(p));
}
function prideAuto(p) {
  if (!baseTot(p)) return (prSteps()[0] || { lab: 'C' }).lab;
  if (isOld(p)) return oldCalc(p).lab;
  const c = customCalc(p);
  return c.step ? c.step.lab : 'C';
}
/* 10-26 망령: C+ · B+ 를 고르면 strip 이 + 를 지워 C · B 로 떨어지던 것 — 계단 이름 그대로 먼저 찾고, 없을 때만 예전처럼 +/- 를 뗀다 */
const prKey = v => {
  const s = String(v || '').trim();
  return prRow(s) ? s : strip(s);
};
function prideOf(p) {
  const v = prKey(p.pride);
  return prRow(v) ? v : prideAuto(p);
}
const prideIsAuto = p => !prRow(prKey(p.pride));
/* 화면용: 커스텀이면 계산 종족치 / 계단 기준 */
function planRange(p) {
  if (isOld(p) || !baseTot(p)) return null;
  const c = customCalcP(p);
  const st = prStep(prideOf(p)) || c.step;
  const v = stepCap(st, c.down);
  return st ? { ct: c.ct, v, lab: capLab(st, c.down), ok: c.ct <= v + 1e-9, down: c.down } : null;
}
/* 룰북: 계단의 통솔점, 통솔 C 이상이면 파트너는 1점 할인 */
/* 11-07 망령 「PT 에 대기 개념 — 벤치 체크 해 두면 통솔점 · 기술 할인점 · 【1/시】 범위에서 계산 안 시킨다」 · 「기술점도 빼」 · 「기술 할인점은 빼면 안 되겠다」: p.bench = 대기(벤치). 셈에서 빼는 곳은 prideCost(통솔점) · 【1/시】(autoUse once · 미사그 몫) · ptSockets(PT 기술점). 「기술 할인점」 · 분배레벨 · 전용은 그대로 센다 */
const onBench = p => !!(p && p.bench);
function prideCost(t, p, raw) {
  if (!raw && onBench(p)) return 0;
  if (awOf(t, p)) return 0;
  const r = prRow(prideOf(p));
  const c = r ? pnum(r[1], 0) : 0;
  return Math.max(0, c - ((p.partner || soloN(t) === 2) && (RV[strip(t.ranks['통솔'])] ?? -9) >= 0 ? 1 : 0));
} /* 2체는 모두 파트너 · 3체는 파트너만 */
const fmtN = x => String(Math.round(x * 100) / 100);
/* 11-06 룰북 「소지품 제약」: 공통 금지 · 역할별 금지 소지품 (역할 포텐셜 이름 그대로 — 룰북 표에 적힌 역할만) */
const ITEM_BAN_ALL = ['생명의구슬', '구애머리띠', '구애안경', '구애스카프', '돌격조끼'];
const ITEM_BAN_ROLE = {
  에이스: ['생명의구슬', '구애머리띠', '구애안경', '진화의휘석', '마제망토'],
  블로커: ['무화열매', '마제망토', '진화의휘석'],
  서포터: ['돌격조끼']
};
/* 같은 계열도 (망령 11-06 「같은 계열도 걸려」) — fx.js ROLE_FAM 과 같은 표. fx 를 아직 안 불렀으면 이 표로 */
const ITEM_BAN_FAM = {
  에이스: ['에이스', '서브 에이스', '링크 에이스', '킬링 에이스'],
  블로커: ['블로커', '하이 블로커', '타이트엔드'],
  서포터: ['서포터', '어시스트', '옵저버', '바운서', '커맨더']
};
function itemBanFams(r) {
  if (!r) return [];
  const k = r.replace(/\s/g, '');
  const F = window.OM_FX && window.OM_FX.roleFams ? window.OM_FX.roleFams(r) : [];
  const out = new Set([r, ...F]);
  for (const f in ITEM_BAN_FAM) if (ITEM_BAN_FAM[f].some(n => n.replace(/\s/g, '') === k) || k.endsWith(f)) out.add(f);
  return [...out].filter(f => ITEM_BAN_ROLE[f]);
}
function pokeChecks(t, p) {
  const out = [],
    R = PR(),
    pk = prideOf(p);
  const tot = baseTot(p);
  const w = (x, k) => out.push({ w: 1, t: x, k }),
    i = (x, k) => out.push({ w: 0, t: x, k });
  {
    const L = bigMvs(t, p);
    if (L.length) w(bigMvTxt(t, L), 'mv');
  }
  {
    const F = followWide(p);
    if (F) w(followWideTxt(F), 'mv');
  }
  {
    const L = [];
    for (let k = 0; k < (p.pots || []).length; k++) {
      const n = p.pots[k];
      if (!n || n === '-') continue;
      const e = String(potEffOf(p, k) || '');
      if (/전체기/.test(e) && WIDE_C4.test(e)) L.push(n);
    }
    if (L.length) w(`「전체기」를 「C : +4」 이상으로 만드는 포텐셜 (대원칙 7) · ${L.join(', ')}`, 'pot');
  } /* 11-03 */
  if (!isOld(p)) {
    const L = (p.moves || []).filter(m => m.name && mvOldOnly(idx.moves.get(m.name)));
    if (L.length) w(`『올드 타입』 전용 기술입니다 (이 포켓몬은 올드 타입 계열이 아님) · ${L.map(m => m.name).join(', ')}`, 'mv');
  }
  {
    const its = [p.item, ...(p.items2 || []).map(x => x && x.item)].filter(Boolean).map(x => String(x).trim());
    const r = String(roleOf(p) || '')
      .replace(/『|』/g, '')
      .trim();
    const gb = its.filter(n => ITEM_BAN_ALL.includes(n));
    if (gb.length) w(`금지 소지품 (공통 1) · ${gb.map(n => '「' + n + '」').join('')} — 포텐셜 등으로 풀린 경우만 예외`, 'item');
    for (const f of itemBanFams(r)) {
      const rb = its.filter(n => (ITEM_BAN_ROLE[f] || []).includes(n));
      if (rb.length)
        w(`『${f}』 금지 소지품 (역할별 제한${f !== r ? ` · 『${r}』 = ${f} 계열` : ''}) · ${rb.map(n => '「' + n + '」').join('')}`, 'item');
    }
  } /* 11-06 망령 「블로커 무화열매 · 마제망토, 에이스 마제망토 안 된다 — 낄 때 경고」 */
  /* 11-23 망령 「고유 「프라이드 : B인 아군을 1체 와일드에 임명할 수 있다」 · 「자신은 에이스를 임명할 수 없다」 자동화」: 트레이너 고유 글을 보고 역할 『와일드』 · 『에이스』 계열을 검사한다 */
  if (t) {
    const U = (t.unique || []).map(u => String((u && u.eff) || '')).join('\n');
    const r = String(roleOf(p) || '')
      .replace(/『|』/g, '')
      .trim();
    const PO = ['E', 'D', 'C', 'C+', 'B', 'B+', 'A', 'EX'];
    const rk = x =>
      PO.indexOf(
        String(x || '')
          .replace(/\s/g, '')
          .toUpperCase()
      );
    const pm = (pr, spec) => {
      const q = String(spec)
        .replace(/\s/g, '')
        .match(/^([A-E]\+?|EX)(이하|이상)?$/i);
      if (!q) return true;
      const a = rk(pr),
        c = rk(q[1]);
      if (a < 0) return false;
      return q[2] === '이하' ? a <= c : q[2] === '이상' ? a >= c : a === c;
    };
    const wq = U.match(/프라이드\s*[:：]\s*([A-Ea-e]\+?|EX)\s*((?:이하|이상)?)\s*인\s*아군을\s*(\d+)?\s*체?\s*와일드에\s*임명/);
    if (r === '와일드' && wq) {
      if (!pm(pk, wq[1] + wq[2]))
        w(`『와일드』 임명은 고유상 「프라이드 : ${wq[1]}${wq[2] ? ' ' + wq[2] : ''}」인 아군만 — 이 포켓몬은 프라이드 ${pk || '?'}`, 'pot');
      const n = +(wq[3] || 1);
      const cnt = (t.pokemon || []).filter(
        x =>
          x &&
          String(roleOf(x) || '')
            .replace(/『|』/g, '')
            .trim() === '와일드'
      ).length;
      if (cnt > n) w(`『와일드』 임명은 고유상 ${n}체까지 — 지금 ${cnt}체`, 'pot');
    }
    if (/자신은\s*에이스를\s*임명할\s*수\s*없다/.test(U) && /에이스/.test(r))
      w(`고유상 이 트레이너는 에이스를 임명할 수 없다 — 이 포켓몬 역할 『${r}』`, 'pot');
  }
  if (!tot) return out;
  const b = baseNums(p);
  if (t) for (const x of baseUp(t, p).miss || []) w(x, 'bu'); /* 10-27: 「X : R」로 만들기 조건이 안 맞음 */
  /* 10-26 망령: 『올드 타입』은 절대 하한도 따지지 않는다 (본가 종족치 그대로) */
  const low = isOld(p) ? [] : b.map((v, k) => [STATS[k], v]).filter(([, v]) => v < pnum(R.absMin, 31));
  if (low.length) w(`절대 하한 ${pnum(R.absMin, 31)} 미만: ${low.map(([n, v]) => n + ' ' + v).join(', ')}`);
  if (isOld(p)) {
    const o = oldCalc(p);
    i(
      `올드 타입 · 실제 합 ${tot}${o.friendly ? ` − 『프렌들리 몬스터』 ${pnum((R.friendly || {}).d, 10)} = ${o.t}` : ''} → ${o.src === 'db' ? 'DB 프라이드 칸' : o.src === 'cap' ? '상한 초과' : o.src === 'low' ? '최저 계단 미만' : o.src === 'prank' ? '짓궂은마음이라 최저 계단' : '버림'} ${o.lab}${prideIsAuto(p) ? '' : ` · 직접 지정 ${pk}`} · 통솔점 ${prideCost(t, p)}`
    );
    if (!prideIsAuto(p) && !ruleOff(t || trOfPoke(p), 'pride')) {
      const a = prStep(o.lab),
        m = prStep(pk);
      if (a && m && m.v < a.v) w(`직접 지정한 프라이드 ${pk}가 계산값 ${o.lab}보다 낮습니다`);
    }
    if (pk === 'EX') i('프라이드 EX · 본가 전설종이나 그에 준하는 스펙 자리입니다');
    if (p.pots.some(n => n && /포켓\s*파워/.test(n))) w('『포켓 파워』 속별은 금지입니다');
    return out;
  }
  const c = customCalcP(p, t);
  const parts = [`실제 합 ${c.real}`];
  if (c.off) parts.push(`하한 +${fmtN(c.off)}`);
  if (c.bulk) parts.push(`내구 +${fmtN(c.bulk)}`);
  if (c.hp) parts.push(`HP +${fmtN(c.hp)}`);
  if (c.fs) parts.push(`화력·스피드 +${fmtN(c.fs)}`);
  if (c.dual) parts.push(`쌍두 −${fmtN(c.dual)}`);
  if (c.toAdj) parts.push(`특성 TO ${c.to} ${c.toAdj > 0 ? '+' : '−'}${fmtN(Math.abs(c.toAdj))}`);
  i(
    `계산 종족치 ${fmtN(c.ct)} (${parts.join(' · ')}) → 프라이드 ${c.step ? c.step.lab : '-'}${c.ok ? ` (남는 점수 ${fmtN(c.cap - c.ct)})` : ''}${prideIsAuto(p) ? '' : ` · 직접 지정 ${pk}`} · 통솔점 ${prideCost(t, p)}`,
    'calc'
  );
  if (c.down && c.step)
    i(
      p.awaken === 'free'
        ? `통솔 D · 각성 (대가): 프라이드 ${c.step.lab}(대가 등급 그대로) · 종족치는 한 단계 아래 ${c.cap}까지`
        : `통솔 D · 『${DOWN_CLASS}』: 프라이드 ${c.step.lab}의 통솔점을 내고 종족치는 한 단계 아래 ${c.cap}까지`,
      'calc'
    );
  if (!c.ok && c.step && !ruleOff(t || trOfPoke(p), 'pride'))
    w(
      `계산 종족치 ${fmtN(c.ct)}가 커스텀 상한 ${c.step.lab}(${c.cap}${c.down ? ' · 통솔 D 한 단계 아래' : ''})를 ${fmtN(c.ct - c.cap)} 넘습니다 · 능력치를 덜거나 특성 소켓을 낮춰 주세요`
    );
  if (!prideIsAuto(p) && !ruleOff(t || trOfPoke(p), 'pride')) {
    const m = prStep(pk);
    if (m && !isEX(m) && stepCap(m, c.down) < c.ct - 1e-9)
      w(`직접 지정한 프라이드 ${pk}(${stepCap(m, c.down)})는 계산 종족치 ${fmtN(c.ct)}를 담지 못합니다`);
  }
  if (c.real < pnum(R.realMin, 400)) w(`실제 종족치 합 ${c.real} · ${pnum(R.realMin, 400)} 이상이어야 합니다`);
  const hint = [];
  if (c.fa) hint.push(`공격 ${b[1]} → ${b[1] + c.fa}`);
  if (c.fc) hint.push(`특공 ${b[3]} → ${b[3] + c.fc}`);
  if (c.fsp) hint.push(`스피드 ${b[5]} → ${c.sf}`);
  if (c.fdur) hint.push(`HP·방어·특방 합 ${c.dSum} → ${c.dMin}`);
  if (hint.length) i(`하한까지 계산: ${hint.join(', ')} (낮게 찍어도 돌려받는 점수는 없습니다)`, 'calc');
  if (c.pri.floor) i(`선공 하한 ${c.pri.floor}: ${c.pri.src} (${c.pri.kind})`, 'calc');
  if (c.dualRaw && !c.dualOk) i(`물리기·특수기를 각각 1개 이상 들면 쌍두 할인 −${fmtN(c.dualRaw)}`, 'calc');
  if (p.pots.some(n => n && /포켓\s*파워/.test(n))) w('『포켓 파워』 속별은 금지입니다');
  return out;
}
/* PT: 공격·특공이 둘 다 기준 미만인 커스텀 포켓몬은 1체까지 (올드 타입은 세지 않음) */
function ptChecks(t) {
  const th = pnum(PR().weakAtk, 60);
  const L = t.pokemon.filter(p => !isOld(p) && baseTot(p) && (+p.base[1] || 0) < th && (+p.base[3] || 0) < th);
  const out =
    L.length > 1
      ? [`공격·특공이 둘 다 ${th} 미만인 포켓몬이 ${L.length}체입니다 (${L.map(p => p.name || '이름 없음').join(', ')}) · PT에 1체까지`]
      : [];
  /* 11-04 망령 「앞으론 6 고정?」 → 「가」: 「기술 할인점」 보유가 템플릿 값(6체 6 · 1인 2체 2 …)과 다르면 경고만 — 일부러 다르게 준 NPC 는 그대로 둔다 */
  {
    const K = '「기술 할인점」';
    if (t.base && t.base[K] != null && t.base[K] !== '') {
      let d = null;
      try {
        const c = Object.assign({}, t, { base: Object.assign({}, t.base), unique: (t.unique || []).slice() });
        applyTpl(c);
        d = +c.base[K];
      } catch (e) {}
      if (d != null && isFinite(d) && +t.base[K] !== d)
        out.push(`${K} ${+t.base[K]} — 기본값은 ${d}입니다 (테이블·계산식 템플릿) · 일부러 다르게 준 거면 그대로 두세요`);
    }
  }
  /* 10-29 망령: 「통솔 : D」는 『올드 타입』 최대 1체 */
  const O = strip((t.ranks || {})['통솔'] || '') === DOWN_LEAD ? t.pokemon.filter(p => p.name && isOld(p)) : [];
  if (O.length > 1) out.push(`통솔 D는 『올드 타입』 계열을 PT에 1체까지 넣을 수 있습니다 · 지금 ${O.length}체 (${O.map(p => p.name).join(', ')})`);
  /* 11-03: 같은 소지품을 둘 이상이 들면(2 · 3번 칸 포함) 경고 · 잠긴(특제 미해금) 소지품 착용 경고 */
  {
    const who = new Map();
    for (const p of t.pokemon)
      for (const n of pokeItems(p)) {
        if (!who.has(n)) who.set(n, []);
        who.get(n).push(p.name || '이름 없음');
      }
    const dup = [...who].filter(([, L]) => L.length > 1);
    if (dup.length) out.push(`같은 소지품을 둘 이상이 들었습니다 · ${dup.map(([n, L]) => `${n} (${L.join(', ')})`).join(' / ')}`);
    /* 11-11 망령: 룰북 「PT 내에 【같은 TO】 소지품은 중복시킬 수 없다」 — 비고의 【TO (그룹, 그룹)】이 같은 다른 소지품을 둘 이상이 들면 경고 (같은 이름은 위 경고가 맡음) */
    {
      const tg = new Map();
      for (const p of t.pokemon)
        for (const n of pokeItems(p))
          for (const g of itemTO(n)) {
            if (!tg.has(g)) tg.set(g, []);
            tg.get(g).push([n, p.name || '이름 없음']);
          }
      const bad = [...tg].filter(([, L]) => new Set(L.map(x => x[0])).size > 1);
      if (bad.length)
        out.push(
          `같은 TO 소지품을 둘 이상이 들었습니다 · ${bad.map(([g, L]) => `【TO (${g})】 ${L.map(([n, w]) => w + ': ' + n).join(', ')}`).join(' / ')}`
        );
    }
    const lk = [];
    for (const p of t.pokemon)
      for (const n of pokeItems(p)) {
        const l = ilockOf(n);
        if (l && !l.open) lk.push(`${p.name || '이름 없음'}: ${n} (${l.place}${l.cond ? ' · ' + l.cond : ''})`);
      }
    if (lk.length) out.push(`아직 잠긴 특제 소지품을 들었습니다 · ${lk.join(' / ')}`);
  }
  return out;
}
const pokeItems = p => [p.item, ...(p.items2 || []).map(x => x && x.item)].filter(Boolean);
const itemTO = n => {
  const r = idx.items && idx.items.get(n);
  if (!r) return [];
  return (String(r[6] || '').match(/【TO \(([^)]+)\)】/g) || []).flatMap(x => x.slice(5, -2).split(/\s*,\s*/)).filter(Boolean);
}; /* 11-11: 소지품 비고의 TO 그룹 */
/* 「전체기 C+4」 꼴 (11-03: 「C : +4」 · 「C:+4」 띄어 쓴 꼴도) */
const WIDE_C4 = /C\s*:?\s*\+\s*([4-9])/;
/* 능력치 막대: 하한·할증·할인 구간 (0~200 눈금) */
/* 10-25 망령: 능력치 막대 표시 — 줄무늬 = 지금 계산에 더해지는(쌍두는 빠지는) 부분, 옅은 칸 = 그 구간이지만 지금은 영향 없음, 빨간 선 = 하한. 오른쪽 끝 작은 글씨 = 이 칸 때문에 붙는 값 */
function statMarks(p, i) {
  if (isOld(p) || !baseTot(p)) return '';
  const R = PR(),
    c = customCalcP(p),
    b = c.b,
    main = Math.max(b[1], b[3]),
    v = b[i];
  const X = x => Math.max(0, Math.min(100, x / 2));
  const seg = (l, r, cls, tip) => (r > l ? `<span class="zn ${cls}" style="left:${X(l)}%;width:${X(r) - X(l)}%" title="${esc(tip)}"></span>` : '');
  const zone = (lo, hi, cls, on, tip) => {
    hi = Math.min(hi, 200);
    if (hi <= lo) return '';
    const m = on ? Math.max(lo, Math.min(v, hi)) : lo;
    return seg(lo, m, cls + ' on', tip) + seg(m, hi, cls, tip);
  };
  const line = (x, tip) => `<span class="fl" style="left:${X(x)}%" title="${esc(tip)}"></span>`;
  const chips = [];
  let h = '';
  if (i === 0) {
    const o = R.hp,
      lo = pnum(o.lo, 95),
      hi = pnum(o.hi, 120),
      dl = pnum(o.dlo, 60),
      dh = pnum(o.dhi, 90),
      act = c.hpR > 0,
      on = act && v > lo,
      why = act ? ` × 내구 비율 ${fmtN(c.hpR)}` : ` · 지금은 방어·특방 평균 ${fmtN((b[2] + b[4]) / 2)}(${dl} 이하)라 0`;
    h +=
      zone(lo, hi, 'z1 hp', on, `HP 할증 · ${lo}~${hi} 구간 ×${o.k1}${why}`) +
      zone(hi, 200, 'z2 hp', act && v > hi, `HP 할증 · ${hi} 초과 ×${o.k2}${why}`);
    if (c.hp) chips.push(['hp', '+' + fmtN(c.hp)]);
  }
  if (i === 0 && c.fdur) chips.push(['off', '내구 하한 +' + fmtN(c.fdur)]);
  if (i === 2 || i === 4) {
    const o = R.bulk,
      lo = pnum(o.lo, 85),
      hi = pnum(o.hi, 105),
      low = Math.min(b[2], b[4]),
      isLow = v === low,
      j = i === 2 ? 4 : 2;
    const why = isLow ? '' : ` · 지금은 ${STATS[j]}(${b[j]})가 낮은 쪽이라 이 칸은 영향 없음`;
    h +=
      zone(lo, hi, 'z1 bulk', isLow && v > lo, `내구 할증 · 방어·특방 중 낮은 쪽 ${lo}~${hi} ×${o.k1}${why}`) +
      zone(hi, 200, 'z2 bulk', isLow && v > hi, `내구 할증 · 낮은 쪽 ${hi} 초과 ×${o.k2}${why}`);
    if (isLow && c.bulk && (i === 2 || b[2] !== b[4])) chips.push(['bulk', '+' + fmtN(c.bulk)]);
  }
  if (i === 1 || i === 3) {
    const isMain = v === main && main > 0;
    if (isMain) {
      const F = R.fs,
        lo = pnum(F.lo, 105),
        hi = pnum(F.hi, 120),
        on = c.fs > 0,
        why = on ? '' : ` · 지금은 스피드 ${b[5]}(${pnum(F.slo, 90)} 이하)라 0`;
      h +=
        zone(lo, hi, 'z1 fs', on && v > lo, `화력·스피드 할증 · 주력 공격 ${lo}~${hi} ×${F.k1} × 스피드 비율${why}`) +
        zone(hi, 200, 'z2 fs', on && v > hi, `화력·스피드 할증 · 주력 공격 ${hi} 초과 ×${F.k2} × 스피드 비율${why}`);
      if (c.fs && (i === 1 || b[1] !== b[3])) chips.push(['fs', '+' + fmtN(c.fs)]);
    } else {
      const D = R.dual,
        lo = pnum(D.lo, 90),
        hi = pnum(D.hi, 120);
      h += zone(
        lo,
        hi,
        'dl',
        c.dualOk && v > lo,
        `쌍두 할인 · 낮은 쪽 공격 ${lo}~${hi} ×${D.k} (빼 줌)${c.dualOk ? '' : ' · 물리기·특수기를 각각 1개 이상 들어야 받음'}`
      );
      if (c.dual) chips.push(['dl', '−' + fmtN(c.dual)]);
    }
    const fl = c.step && !isMain ? Math.max(c.step.floor, c.opp) : c.step ? c.step.floor : 0;
    if (fl && !isMain) h += line(fl, `하한 ${fl}${c.opp >= c.step.floor ? ` (주력 공격 ${main} × ${R.opp})` : ''} · 이보다 낮게 찍어도 ${fl}로 계산`);
    const lack = i === 1 ? c.fa : c.fc;
    if (lack) chips.push(['off', '하한 +' + fmtN(lack)]);
  }
  if (i === 5) {
    const F = R.fs,
      slo = pnum(F.slo, 90),
      shi = pnum(F.shi, 140);
    h += zone(
      slo,
      shi,
      'sp',
      c.fs > 0,
      `화력·스피드 할증의 스피드 비율 · ${slo}에서 0, ${shi}에서 1${c.fs > 0 ? '' : ' · 지금은 주력 공격이 낮아 0'}`
    );
    if (c.sf)
      h += line(
        c.sf,
        `하한 ${c.sf}${c.pri && c.pri.floor >= ((c.step || {}).floor || 0) ? ` (선공: ${c.pri.src})` : ''} · 이보다 낮게 찍어도 ${c.sf}로 계산`
      );
    if (c.fsp) chips.push(['off', '하한 +' + fmtN(c.fsp)]);
  }
  return h + (chips.length ? `<em class="zt">${chips.map(([k, t]) => `<span class="${k}">${esc(t)}</span>`).join('')}</em>` : '');
}

/* 10-25 망령: 능력치 칸에 커서를 올리면 그 칸에 걸린 규칙 · 선 · 지금 값을 보여 준다 */
function statTip(t, p, i) {
  const nm = STATS[i];
  if (!baseTot(p)) return nm;
  if (isOld(p)) return `${nm} · 『올드 타입』은 종족치를 제약하지 않음 (하한 · 할증 · 할인 없음, 실제 합을 버림한 계단)`;
  const R = PR(),
    c = customCalcP(p),
    b = c.b,
    v = b[i],
    main = Math.max(b[1], b[3]),
    F = c.step ? c.step.floor : 0,
    L = [`${nm} ${v}`],
    n = fmtN;
  const sur = (lo, hi, k1, k2) => `${lo}~${hi} 구간 초과분 ×${k1}, ${hi} 초과분 ×${k2}`;
  if (i === 0) {
    const o = R.hp;
    L.push(
      `HP 할증: HP 점수(${sur(pnum(o.lo, 95), pnum(o.hi, 120), o.k1, o.k2)}) × 내구 비율(방어·특방 평균 ${pnum(o.dlo, 60)}에서 0, ${pnum(o.dhi, 90)}에서 1)`,
      `→ 지금 HP 점수 ${n(c.hpRaw || 0)} × 방어·특방 평균 ${n((b[2] + b[4]) / 2)} 비율 ${n(c.hpR || 0)} = +${n(c.hp)}`,
      `HP·방어·특방 합 하한 ${c.dMin} — 하나하나 하한은 없지만 셋의 합이 이보다 낮으면 모자란 만큼 계산에 더함 · 지금 합 ${c.dSum}${c.fdur ? ` → 부족분 +${c.fdur}` : ''} (절대 하한 ${pnum(R.absMin, 31)})`
    );
  }
  if (i === 2 || i === 4) {
    const o = R.bulk,
      j = i === 2 ? 4 : 2,
      low = Math.min(b[2], b[4]);
    L.push(
      `내구 할증: 방어·특방 중 낮은 쪽 기준 ${sur(pnum(o.lo, 85), pnum(o.hi, 105), o.k1, o.k2)} → 지금 +${n(c.bulk)}`,
      v === low ? `지금 이 칸이 낮은 쪽(${low})` : `지금은 ${STATS[j]}(${b[j]})가 낮은 쪽이라 이 칸 값은 내구 할증에 안 쓰임`,
      `HP 할증의 내구 비율: 방어·특방 평균 ${pnum(R.hp.dlo, 60)}에서 0, ${pnum(R.hp.dhi, 90)}에서 1 → 지금 평균 ${n((b[2] + b[4]) / 2)} · 비율 ${n(c.hpR || 0)}${c.hpRaw ? ` (HP 점수 ${n(c.hpRaw)} → +${n(c.hp)})` : ''}`,
      `HP·방어·특방 합 하한 ${c.dMin} — 하나하나 하한은 없지만 셋의 합이 이보다 낮으면 모자란 만큼 계산에 더함 · 지금 합 ${c.dSum}${c.fdur ? ` → 부족분 +${c.fdur}` : ''} (절대 하한 ${pnum(R.absMin, 31)})`
    );
  }
  if (i === 1 || i === 3) {
    if (v === main && main > 0) {
      const o = R.fs,
        lo = pnum(o.lo, 105),
        hi = pnum(o.hi, 120),
        slo = pnum(o.slo, 90),
        shi = pnum(o.shi, 140),
        r = Math.max(0, Math.min(1, (Math.min(b[5], shi) - slo) / (shi - slo)));
      L.push(
        `주력 공격 · 하한 ${F} (계단 ${c.step ? c.step.lab : '-'} 최소종족치)`,
        `화력·스피드 할증: 화력 점수(${lo}~${hi} ×${o.k1}, ${hi} 초과 ×${o.k2}) × 스피드 비율(${slo}에서 0, ${shi}에서 1)`,
        `→ 지금 화력 점수 ${n(pnum(o.k1, 0.5) * Math.max(0, Math.min(v, hi) - lo) + pnum(o.k2, 1) * Math.max(0, v - hi))} × 스피드 ${b[5]} 비율 ${n(r)} = +${n(c.fs)}`
      );
    } else {
      const o = R.dual,
        fl = Math.max(F, c.opp);
      L.push(
        `하한 ${fl} (최소종족치 ${F}, 주력 공격 ${main} × ${R.opp} = ${c.opp} 중 높은 쪽) · 이보다 낮게 찍어도 하한 값으로 계산${(i === 1 ? c.fa : c.fc) ? ` → 부족분 +${i === 1 ? c.fa : c.fc}` : ''}`,
        `쌍두 할인: 낮은 쪽 공격 ${pnum(o.lo, 90)}~${pnum(o.hi, 120)} 구간 초과분 ×${o.k} 빼 줌 (물리기·특수기 각 1개 이상) → ${c.dualOk ? `지금 −${n(c.dual)}` : c.dualRaw ? `조건 미충족 (받으면 −${n(c.dualRaw)})` : '지금 0'}`
      );
    }
  }
  if (i === 5) {
    const o = R.fs,
      slo = pnum(o.slo, 90),
      shi = pnum(o.shi, 140);
    L.push(
      `하한 ${c.sf} (${c.pri && c.pri.floor > F ? `선공 하한 · ${c.pri.src}${c.pri.ov ? ' · 예외' : ''} (${c.pri.kind || '직접'})` : `계단 최소종족치`}) · 이보다 낮게 찍어도 하한 값으로 계산${c.fsp ? ` → 부족분 +${c.fsp}` : ''}`,
      `화력·스피드 할증의 스피드 비율: ${slo}에서 0, ${shi}에서 1 (${shi} 위로는 같음) → 지금 ${n(Math.max(0, Math.min(1, (Math.min(v, shi) - slo) / (shi - slo))))}`
    );
  }
  return L.join('\n');
}
/* 통솔점 사용 / 보유 */
function leadUM(t) {
  if (ruleOff(t, 'lead')) return null;
  const n = (ptItems().find(r => r[2] === 'pride') || [])[0];
  if (!n) return null;
  return { n, u: Math.round(t.pokemon.reduce((a, p) => a + prideCost(t, p), 0) * 100) / 100, m: +t.base[n] || 0 };
}
const prCls = lab => ({ '0.5': 's05', 'D': 's05', 'C': 'sc', 'C+': 'scp', 'B': 'sb', 'B+': 'sbp', 'A': 'sa', 'EX': 'sex' })[lab] || 'sc';
function leadBar(t) {
  const L = leadUM(t);
  if (!L) return '';
  const ms = t.pokemon;
  const tot = Math.max(L.m, L.u) || 1;
  return `<div class="ldrow"><span class="ldl">통솔점 <b class="num ${L.u > L.m ? 'warn' : ''}">${L.u}</b><span class="muted"> / ${L.m}</span></span><div class="ldbar ${L.u > L.m ? 'over' : ''}">${ms
    .map(p => {
      const c = prideCost(t, p);
      if (!c) return '';
      const lab = prideOf(p);
      return `<i class="${prCls(lab)}" style="width:${(c / tot) * 100}%" title="${esc((p.name || '(이름 없음)') + ' · ' + lab + ' · 통솔점 ' + c)}"><span><em class="nm">${esc(p.name || '?')} </em>${c}</span></i>`;
    })
    .join(
      ''
    )}${L.m > L.u ? `<i class="left" style="width:${((L.m - L.u) / tot) * 100}%" title="남은 통솔점 ${Math.round((L.m - L.u) * 100) / 100}"><span><em class="nm">남음 </em>${Math.round((L.m - L.u) * 100) / 100}</span></i>` : ''}${L.m && L.u > L.m ? `<em class="cap" style="left:${(L.m / tot) * 100}%"></em>` : ''}</div></div>`;
}

/* 능력치 칸 아래 「계산 종족치」 현황판 — 항목별 값 · 막대 · 선공 하한 예외 입력 */
function calcPanel(t, p, P) {
  if (!baseTot(p)) return '';
  const R = PR();
  if (isOld(p)) {
    const o = oldCalc(p);
    const st = prStep(o.lab);
    return `<div class="cpanel old"><div class="cph"><b>프라이드 계산</b><span class="kindb">올드 타입</span><span class="sp"></span><span class="cpr">${esc(prideOf(p))}</span><span class="small muted">통솔점 ${prideCost(t, p)}</span></div>
  <div class="cprow"><span class="cpc base">실제 합 <b>${o.real}</b></span>${o.friendly ? `<span class="cpc dl">『프렌들리 몬스터』 <b>−${pnum((R.friendly || {}).d, 10)}</b></span>` : ''}<span class="cpop">→</span><span class="cpc tot">${o.src === 'db' ? 'DB 프라이드 칸' : o.src === 'cap' ? '상한 초과' : o.src === 'low' ? '최저 계단 미만 · ' + esc((R.oldLow || {}).pt || '0.5') + '점' : o.src === 'prank' ? '짓궂은마음 · 최저 계단' : '버림'} <b>${esc(o.lab)}</b>${st && o.src === 'floor' ? ` <small>(${st.v} · 격차 ${o.t - st.v})</small>` : ''}</span></div>
  <p class="small muted" style="margin:6px 0 0">올드 타입은 하한·할증·할인을 계산하지 않습니다. 예외는 DB 관리 → 올드 타입 「프라이드」 칸으로 정합니다.</p></div>`;
  }
  const c = customCalcP(p, t);
  const st = prStep(prideOf(p)) || c.step;
  const cap = st ? stepCap(st, c.down) : c.ct;
  const items = [
    ['base', '실제 합', c.real, ''],
    [
      'off',
      '하한',
      c.off,
      [c.fa ? `공격 +${c.fa}` : '', c.fc ? `특공 +${c.fc}` : '', c.fsp ? `스피드 +${c.fsp}` : '', c.fdur ? `HP·방어·특방 +${c.fdur}` : '']
        .filter(Boolean)
        .join(' · ') || '없음'
    ],
    ['bulk', '내구', c.bulk, `방어·특방 중 낮은 쪽 ${Math.min(c.b[2], c.b[4])}`],
    [
      'hp',
      'HP',
      c.hp,
      `HP ${c.b[0]}${c.hpRaw ? ` · 점수 ${fmtN(c.hpRaw)} × 내구 비율 ${fmtN(c.hpR)} (방어·특방 평균 ${fmtN((c.b[2] + c.b[4]) / 2)})` : ''}`
    ],
    ['fs', '화력·스피드', c.fs, `주력 ${Math.max(c.b[1], c.b[3])} · 스피드 ${c.b[5]}`],
    [
      'dl',
      '쌍두',
      -c.dual,
      c.dualOk ? `낮은 쪽 ${Math.min(c.b[1], c.b[3])}` : c.dualRaw ? `물리·특수기 각 1개 필요 (−${fmtN(c.dualRaw)})` : '해당 없음'
    ],
    ['to', '특성 TO', c.toAdj, `TO ${c.to}${c.toBon ? ` (특성 ${c.toRaw} − 보너스 ${c.toBon})` : ''} / 기본 ${c.toBase}`]
  ];
  const pos = items.filter(x => x[0] !== 'dl' && x[2] > 0);
  const W = Math.max(cap, c.ct, 1);
  const bar = pos.map(x => `<i class="${x[0]}" style="width:${(x[2] / W) * 100}%" title="${esc(x[1] + ' ' + fmtN(x[2]))}"></i>`).join('');
  const auto = c.pri.ov ? c.pri.auto : c.pri;
  const ov = String(p.prioOv ?? '');
  return `<div class="cpanel"><div class="cph"><b>계산 종족치</b><span class="sp"></span><span class="cpr ${c.ok ? '' : 'warn'}">${c.step ? esc(capLab(c.step, c.down)) : '-'}</span><span class="small muted">${c.ok ? `남는 점수 <b class="num">${fmtN(c.cap - c.ct)}</b>` : `<b class="warn">상한 초과 ${fmtN(c.ct - (c.cap || 0))}</b>`} · 통솔점 ${prideCost(t, p)}</span></div>
  <div class="cpbar" title="계산 종족치 ${fmtN(c.ct)} / ${cap}">${bar}<span class="cpcap" style="left:${Math.min(100, (cap / W) * 100)}%"></span></div>
  <div class="cpgrid">${items.map(([k, l, v, d]) => `<div class="cpc ${k} ${v ? '' : 'zero'}"><span>${l}</span><b class="num">${k === 'base' ? v : (v > 0 ? '+' : v < 0 ? '−' : '') + fmtN(Math.abs(v))}</b><small>${esc(d)}</small></div>`).join('')}<div class="cpc tot"><span>계산 종족치</span><b class="num">${fmtN(c.ct)}</b><small>${st ? `${esc(capLab(st, c.down))} 계단 ${cap}${c.down ? ' (통솔 D · 한 단계 아래)' : ''}` : ''}</small></div></div>
  <div class="cppri"><span class="small"><b>선공 하한</b> ${auto.floor ? `자동 ${auto.floor} · ${esc(auto.src)} (${esc(auto.kind)})` : '자동: 선공기 없음'}</span><label class="row small" style="gap:4px">예외<select data-p="${P}.prioOv" title="자동 판정이 맞지 않을 때 이 포켓몬만 직접 정합니다"><option value="" ${ov === '' ? 'selected' : ''}>자동</option><option value="0" ${ov === '0' ? 'selected' : ''}>없음 (하한 안 올림)</option>${[
    ...new Set([...(R.prio.rows || []).flatMap(r => r.slice(1)), ov].filter(x => x !== '' && x !== '0' && !isNaN(+x)).map(Number))
  ]
    .sort((a, b) => a - b)
    .map(v => `<option value="${v}" ${ov === String(v) ? 'selected' : ''}>${v}</option>`)
    .join('')}</select></label>${c.pri.ov ? '<span class="kindb">예외 적용 중</span>' : ''}</div></div>`;
}
/* 테이블·계산식 탭 · 종족치 · 프라이드 규칙 (2026-10-25 개편) */
function prideRulePanel() {
  const R = PR();
  const f = (path, v, w, ph) =>
    `<input data-p="db.pride.${path}" value="${esc(v ?? '')}" style="width:${w || '56px'}" ${ph ? `placeholder="${esc(ph)}"` : ''} inputmode="decimal">`;
  const L = (t, path, v, w, note) =>
    `<label class="row small" style="gap:4px">${t}${f(path, v, w)}${note ? `<span class="faint">${note}</span>` : ''}</label>`;
  const grp = (t, o, key, extra) =>
    `<div class="prg"><b>${t}</b>${L('시작', key + '.lo', o.lo)}${L('경계', key + '.hi', o.hi)}${L('시작~경계 ×', key + '.k1', o.k1)}${L('경계 위 ×', key + '.k2', o.k2)}${extra || ''}</div>`;
  return `<div class="panel" style="grid-column:1/-1"><h3>종족치 · 프라이드 규칙 · 룰북 「포켓몬 제작」<span class="sp"></span><button class="btn sm" data-tact="prRowAdd">+ 계단</button><button class="btn sm" data-tact="prReset">기본값</button></h3>
  <p class="small muted" style="margin:0 0 8px">포켓몬 프라이드를 「자동」으로 두면 커스텀은 <b>계산 종족치</b>(실제 합 + 하한분 + 내구·HP·화력·스피드 할증 − 쌍두 할인 + 특성 TO 조정)를 담을 수 있는 가장 낮은 계단, 올드 타입은 실제 합을 버림한 계단이 됩니다. 여기 숫자를 바꾸면 모든 시트의 계산 · 막대 표시 · 경고 · 통솔점 자동 소모가 바로 따라갑니다. EX 계단은 자동으로 고르지 않고 직접 지정할 때만 씁니다.</p>
  <div class="tw"><table><tr><th>계단</th><th class="n">통솔점</th><th class="n">종족치 합</th><th class="n">최소종족치 (하한)</th><th class="n">기본 특성 TO</th><th>비고</th><th></th></tr>${R.rows.map((r, i) => `<tr>${[0, 1, 2, 3, 4, 5].map(j => `<td${j && j < 5 ? ' class="n"' : ''}><input data-p="db.pride.rows.${i}.${j}" value="${esc(r[j] ?? '')}" style="width:${j === 0 ? '52px' : j === 5 ? '100%' : '64px'}" ${j && j < 5 ? 'inputmode="decimal"' : ''}></td>`).join('')}<td><button class="btn sm ghost danger" data-tact="prRowDel" data-i="${i}" aria-label="계단 삭제">✕</button></td></tr>`).join('')}</table></div>
  <div class="prgrid">
   <div class="prg"><b>공통</b>${L('절대 하한', 'absMin', R.absMin)}${L('실제 합 하한', 'realMin', R.realMin)}${L('HP·방어·특방 합 하한', 'durMin', R.durMin ?? PRIDE_DEF.durMin)}${L('반대쪽 공격 하한 = 주력 ×', 'opp', R.opp)}${L('특성 TO 0.5 올릴 때', 'toStep', R.toStep, '', '점')}${L('기준보다 0.5 내릴 때', 'toDown', R.toDown ?? PRIDE_DEF.toDown, '', '점')}${L('되팔기 기준 TO', 'toFloor', R.toFloor)}${L('되팔기 최저 TO (0특 = 이 값)', 'toMin', R.toMin ?? PRIDE_DEF.toMin)}${L('PT 1체 제한: 공·특공 둘 다 미만', 'weakAtk', R.weakAtk)}</div>
   ${grp('내구 할증 · 방어·특방 중 낮은 쪽', R.bulk, 'bulk')}
   ${grp('HP 할증 · HP 점수 × 내구 비율', R.hp, 'hp', `${L('내구 비율 0 (방어·특방 평균)', 'hp.dlo', R.hp.dlo ?? PRIDE_DEF.hp.dlo)}${L('내구 비율 1', 'hp.dhi', R.hp.dhi ?? PRIDE_DEF.hp.dhi)}`)}
   ${grp('화력·스피드 할증 · 화력 점수', R.fs, 'fs', `${L('스피드 비율 0', 'fs.slo', R.fs.slo)}${L('스피드 비율 1', 'fs.shi', R.fs.shi)}`)}
   <div class="prg"><b>쌍두 할인 · 공·특공 중 낮은 쪽</b>${L('시작', 'dual.lo', R.dual.lo)}${L('끝', 'dual.hi', R.dual.hi)}${L('×', 'dual.k', R.dual.k)}<span class="small faint">물리기·특수기 각 1개 이상</span></div>
   <div class="prg"><b>올드 타입</b>${L('최저 계단 미만 통솔점', 'oldLow.pt', R.oldLow.pt)}${L('그 표시', 'oldLow.lab', R.oldLow.lab)}${L('그 계단 종족치 (통솔 D 현대종의 C)', 'oldLow.v', R.oldLow.v ?? '455')}${L('제외 특성 (쉼표)', 'oldLow.prank', R.oldLow.prank, '140px')}${L('A 상한 (넘으면 EX)', 'oldCap', R.oldCap)}${L('『프렌들리』 이름', 'friendly.name', R.friendly.name, '120px')}${L('합 −', 'friendly.d', R.friendly.d)}${L('적용 최대 계단', 'friendly.max', R.friendly.max)}</div>
  </div>
  <div class="prg" style="margin-top:10px"><b>선공 하한 · 선공기가 있으면 스피드 하한을 이 값으로</b>
   <div class="tw" style="margin:6px 0"><table><tr><th>사용 조건</th><th class="n">약 (위력 미만)</th><th class="n">강 (위력 이상 · +1)</th><th class="n">초 (위력 이상 · +2 이상)</th></tr>${(R.prio.rows || []).map((r, i) => `<tr><td><input data-p="db.pride.prio.rows.${i}.0" value="${esc(r[0])}" style="width:80px"></td>${[1, 2, 3].map(j => `<td class="n"><input data-p="db.pride.prio.rows.${i}.${j}" value="${esc(r[j] ?? '')}" style="width:56px" inputmode="decimal"></td>`).join('')}</tr>`).join('')}</table></div>
   <div class="row" style="gap:14px;flex-wrap:wrap">${L('강·초 기준 위력', 'prio.pow', R.prio.pow)}<label class="row small" style="gap:4px;flex:1;min-width:260px">선공 특성 (이름:하한, 쉼표)<input data-p="db.pride.prio.abil" value="${esc(R.prio.abil || '')}" style="flex:1"></label><label class="row small" style="gap:4px;flex:1;min-width:260px" title="위력 · 우선도로 고르는 칸 대신 적은 칸(약 · 강 · 초)이나 숫자를 쓴다">선공 기술 따로 (이름:약·강·초 또는 숫자, 쉼표)<input data-p="db.pride.prio.moves" value="${esc(R.prio.moves ?? PRIDE_DEF.prio.moves)}" style="flex:1"></label></div>
   <p class="small muted" style="margin:6px 0 0">기술 DB의 우선도가 1 이상인 기술(자신·자기 진영 대상 제외)을 자동으로 읽습니다. 우선도에 「~」가 있거나 설명에 「실패」가 있으면 조건부로 봅니다. 포텐셜 효과에 「우선도 : +N」이 있으면 강 칸(【N/시】면 조건부). 맞지 않는 포켓몬은 시트의 「계산 종족치」 칸에서 예외로 바꿉니다.</p></div></div>`;
}
/* 메인: 자질을 C에서 한 단계 올릴 때마다 1점 */
const rankSteps = t => QUAL.reduce((a, q) => a + Math.max(0, RV[strip(t.ranks[q])] ?? 0), 0);
/* 10-30 망령 「2점 상승에 덤프하면 +1」: 「D」 이하로 내린 자질 하나마다 메인(자동 소모 rank 항목) 보유 +1 */
const rankDump = t => QUAL.filter(q => (RV[strip(t.ranks[q])] ?? 0) < 0).length;
const ptHave = (t, n, a) =>
  (+t.base[n] || 0) + (a === 'rank' ? rankDump(t) : 0) + (a === 'dist' ? distExtra(t) : 0); /* 11-22 분배레벨 조정 · 【준비】 「분배 레벨 : ±N」 */
const discUsed = t => t.pokemon.reduce((a, p) => a + p.moves.filter(m => m.name && m.half).length, 0); /* 11-07 망령 「기술 할인점은 대기도 센다」 */
function ptMaxDef(t) {
  if (isMisag(t)) {
    const r = sockRow(t.ranks['육성']);
    return r ? Math.round(((+r[4] || 0) - misagGmCap(t)) * 100) / 100 : 0;
  }
  if (soloN(t) === 3) {
    const r = sockRow(t.ranks['육성']);
    return r ? s3num((+r[4] || 0) * (+(RULES().solo3 || SOLO3_DEF).ratio || 0.5), 'ptUnit') : 0;
  }
  if (t.solo) {
    const v = (S.db.soloSock || {})[strip(t.ranks['육성'])];
    if (v != null && v !== '') return +v;
  }
  const r = sockRow(t.ranks['육성']);
  return r ? +r[4] : 0;
}
const nz = v => v !== '' && v != null && !isNaN(+v);
function ptMax(t) {
  if (nz(t.ptMax)) return +t.ptMax;
  return ptMaxDef(t);
}
/* 트레이너 포인트 항목: [이름, 기본값, 자동 소모 방식] — 테이블·계산식 탭에서 고친다 */
const PTI_DEF = [
  ['메인', '2', 'rank'],
  ['통솔점', '6', 'pride'],
  ['「기술 할인점」', '6', 'disc'],
  ['【1/시】', '3', 'once'],
  ['분배레벨', '10', 'dist']
];
function ptiMigrate(db) {
  if ((db.ptiV || 0) < 1) {
    for (const r of db.ptItems || []) if (r[0] === '【1/시】' && !r[2]) r[2] = 'once';
    db.ptiV = 1;
  }
  /* 10-25 망령: 통솔점은 기본적으로 포켓몬 프라이드에서 자동 계산 */
  if ((db.ptiV || 0) < 2) {
    db.ptItems = db.ptItems || clone(PTI_DEF);
    if (!db.ptItems.some(r => r[2] === 'pride')) {
      const r = db.ptItems.find(r => /통솔/.test(r[0] || ''));
      if (r) r[2] = 'pride';
      else db.ptItems.splice(1, 0, ['통솔점', '6', 'pride']);
    }
    db.ptiV = 2;
  }
  /* 10-30 망령 「메인 2점 + 덤프 1점」: 메인 기본 4 → 2 (예전 기본값일 때만) */
  if ((db.ptiV || 0) < 3) {
    for (const r of db.ptItems || []) if (r[2] === 'rank' && String(r[1]) === '4') r[1] = '2';
    db.ptiV = 3;
  }
}
const PTI_AUTO = {
  '': '없음',
  rank: '자질 투자 (C에서 한 단계당 1 · 덤프 1개당 보유 +1)',
  pride: '포켓몬 프라이드 (계단별 통솔점, 파트너 −1)',
  disc: '기술 「할인」 체크 수',
  dist: '포켓몬 분배 레벨 합',
  once: '포켓몬 【1/시】 포텐셜 수 (종족 · 속별만 — 범용 · 전술 · 전용 등 제외)'
};
const ptItems = () => (S.db && S.db.ptItems) || PTI_DEF;
function autoUse(t, a) {
  if (a === 'rank') return rankSteps(t);
  if (a === 'pride') return t.pokemon.reduce((x, p) => x + prideCost(t, p), 0);
  if (a === 'disc') return discUsed(t);
  if (a === 'dist')
    return isMisag(t)
      ? t.pokemon.reduce((x, p) => x + (Math.round(+p.dist) || 0), 0) + misagDistPen(t)
      : t.pokemon.reduce((x, p) => x + Math.max(0, +p.dist || 0), 0);
  if (a === 'once') return t.pokemon.reduce((x, p) => x + (onBench(p) ? 0 : onceCount(p)), 0);
  return 0;
}
/* 11-04 22:15 망령 「1/시 갯수를 세는건 종족/속별만. 범용 포텐이나 뭐 이런건 제외」: 【1/시】 셈은 종류가 「종족」 · 「속별」인 포텐셜만 (종류가 비면 칸 자리 — 종족①~④ · 속별) */
const onceSlot = (p, i) => {
  const k = potKindOf(p, i);
  if (k) {
    const g = potGroup(k);
    return g === '종족' || g === '속별';
  }
  return i >= 4 && i <= 8;
};
const onceCount = p => p.pots.reduce((n, name, i) => n + (name && onceSlot(p, i) && /【1\s*\/\s*시】/.test(potEffOf(p, i) || '') ? 1 : 0), 0);
function pointUse(t) {
  const u = {};
  for (const [n] of ptItems()) u[n] = 0;
  for (const n of t.pts) {
    const r = idx.points.get(n);
    if (r) {
      const k = r[3] === '-' || !(r[3] in u) ? (ptItems()[0] || ['메인'])[0] : r[3];
      u[k] = (u[k] || 0) + (+r[6] || 0);
    }
  }
  for (const k in t.extra) if (k in u) u[k] += +t.extra[k] || 0;
  for (const [n, , a] of ptItems()) u[n] += autoUse(t, a);
  return u;
}
const RV = { E: -2, D: -1, C: 0, B: 1, A: 2, AA: 3, AAA: 4, S: 5 };
/* 11-04 20:52 망령 「노트랑 제작기에서 소지품 소켓 보여주고 어느 정도 임의로 추가/변경 · PT 서머리에」: PT 소지품 소켓 = 소지품 DB 소켓 합(오리지널은 시트 소켓) / 「지시」 랭크 상한
   (룰북 D 7 · C 9 · B 10 · A 11 · AA 12 · 1인 기준 2체 2.5~4.5 · 3체 3.5~6 — 오레마스 시트 탭과 같은 표) + 트레이너마다 조정(t.isockAdj, ± · 사유 t.isockNote — 보상 · 시나리오 등) */
const ISOCK_CAP = { D: 7, C: 9, B: 10, A: 11, AA: 12 },
  ISOCK_CAP1 = { D: 2.5, C: 3, B: 3.5, A: 4, AA: 4.5 },
  ISOCK_CAP3 = { D: 3.5, C: 4.5, B: 5, A: 5.5, AA: 6 };
/* 11-11 망령 「소지품 소켓은 바 하나에 2체 / 3체 / 6체 기준을 각자 보여줘야겠네」: 미사그 — 2체 = 각성체 2, 3체 = 각성체 2 + 서브, 6체 = 전부. 상한은 지시 랭크 표(1인 2체 · 3체 · 6체) + 조정 */
function isockOfList(L) {
  let u = 0;
  for (const p of L)
    for (const x of [p, ...(p.items2 || [])]) {
      if (!x || !x.item) continue;
      const r = itemRow(x);
      const v = parseFloat(r ? r[5] : '');
      if (isFinite(v)) u += v;
    }
  return Math.round(u * 10) / 10;
}
function isockTri(t, K) {
  const rk = K.rk,
    adj = K.adj || 0;
  const A = awList(t),
    Sb = subOf(t).slice(0, 1);
  const cap = T => (T[rk] != null ? Math.round((T[rk] + adj) * 10) / 10 : null);
  const rows = [
    ['2체', '각성체 2', isockOfList(A), cap(ISOCK_CAP1)],
    ['3체', Sb.length ? '각성체 2 + 서브 ' + (Sb[0].name || '') : '서브를 고르면 셈', Sb.length ? isockOfList([...A, ...Sb]) : null, cap(ISOCK_CAP3)],
    ['6체', '전부', K.u, cap(ISOCK_CAP)]
  ];
  return `<div class="row small" style="gap:10px;flex-wrap:wrap;margin-top:6px">${rows
    .map(([n, d, u, c]) => {
      const ov = u != null && c != null && u > c + 1e-9;
      return `<span class="row" style="gap:5px;min-width:150px;flex:1" title="${esc(d)}"><b>${n}</b><span class="num ${ov ? 'warn' : ''}">${u == null ? '—' : u}</span><span class="muted">/ ${c == null ? '—' : c}</span><span class="meter ${ov ? 'over' : ''}" style="flex:1;min-width:50px;height:6px"><i style="width:${u != null && c ? Math.min(100, (u / c) * 100) : 0}%"></i></span></span>`;
    })
    .join('')}</div>`;
}
function itemSockMk(t) {
  let used = 0,
    unk = 0;
  const L = [];
  for (const p of t.pokemon || [])
    for (const x of [p, ...(p.items2 || [])]) {
      if (!x || !x.item) continue;
      const r = itemRow(x);
      const v = parseFloat(r ? r[5] : '');
      if (isFinite(v)) used += v;
      else unk++;
      L.push(`${p.name || '?'}: ${x.item} ${isFinite(v) ? v : '?'}`);
    }
  used = Math.round(used * 10) / 10;
  const rk = strip((t.ranks || {})['지시']);
  const sn = soloN(t);
  const cap0 = (sn === 3 ? ISOCK_CAP3 : sn ? ISOCK_CAP1 : ISOCK_CAP)[rk] ?? null;
  const adj = Math.round((+t.isockAdj || 0) * 10) / 10;
  const cap = cap0 != null ? Math.round((cap0 + adj) * 10) / 10 : null;
  return { u: used, cap, cap0, adj, note: String(t.isockNote || ''), unk, list: L, rk, sn };
}
/* 10-29 망령: 세션 노트 대학 시트 「PT 서머리」용 사본 — 기본 요소마다 보유 · 사용 · 자동 소모 종류, 포켓몬마다 프라이드 · 통솔점 · 레벨 · 분배 · 할인 · 【1/시】 · 기술 소켓, PT 기술점 */
function ptSnap(t) {
  const use = pointUse(t);
  const items = ptItems().map(([n, , a]) => ({ n, max: ptHave(t, n, a), use: Math.round((use[n] || 0) * 100) / 100, auto: a || '' }));
  const mons = {};
  for (const p of t.pokemon) {
    const c = moveCap(t, p);
    mons[p.id] = {
      pride: prideOf(p) || '',
      cost: prideCost(t, p, true),
      bench: onBench(p) || undefined,
      lv: lv(t, p),
      dist: Math.round(+p.dist) || 0,
      disc: p.moves.filter(m => m.name && m.half).length,
      once: onceCount(p),
      excl: exclAll(p).length,
      sock: c.mode === 'count' ? c.pt : c.used,
      sockCap: c.cap ?? null,
      aw: awOf(t, p) || ''
    };
  }
  return Object.assign(
    {
      items,
      mons,
      rank: rankSteps(t),
      sock: { u: ptSockets(t), m: ptMax(t) },
      isock: (() => {
        try {
          const k = itemSockMk(t);
          return { u: k.u, cap: k.cap, cap0: k.cap0, adj: k.adj, note: k.note, unk: k.unk, list: k.list };
        } catch (e) {
          return null;
        }
      })(),
      misagDist: isMisag(t) ? misagDistPen(t) : 0,
      excl: exclSnap(t)
    },
    isMisag(t) ? { sockAw: { u: ptSockets(t, true), m: misagGmCap(t) } } : {},
    isMong(t) ? { rule: 'mong', off: RULE_OFF.mong.slice(), gye: mongGye(t) } : {}
  );
}
/* 11-05 망령 「PT 서머리에 전용 갯수도」: 전용 포텐셜 개수 / 능력 표 상한 (각성체 대가 −n). 미사그는 PL 4체 몫(상시 자유 −n)과 각성체 몫(1체에 awExcl개 · 능력 D 는 1체만)을 따로 */
const awExclCap = t => mnum('awExcl') * (['AA', 'AAA', 'S'].includes(strip((t.ranks || {})['능력'] || '')) ? 2 : 1);
function exclSnap(t) {
  const xp = misagExclPen(t);
  if (isMisag(t)) {
    const A = awList(t),
      PL = t.pokemon.filter(p => !awOf(t, p));
    const per = mnum('awExcl'),
      dOne = strip(t.ranks['능력']) === 'D';
    return {
      u: PL.reduce((a, p) => a + exclAll(p).length, 0),
      m: Math.max(0, abilLimitsBase(t.ranks['능력']).x - xp - misagPlCut(t)),
      aw: { u: A.reduce((a, p) => a + exclAll(p).length, 0), m: A.length ? awExclCap(t) : 0 }
    };
  }
  /* 11-05 19:44 망령 「각성체는 2개가 기본 · 능력 AA 만 4」 */ const L = abilLimits(t.ranks['능력'], t.solo);
  return { u: t.pokemon.reduce((a, p) => a + exclAll(p).length, 0), m: Math.max(0, (+L.x || 0) - xp) };
} /* 11-01 망령: 노트 서머리가 각성체 2체 몫 기술점을 따로 */
/* 룰 상수 (테이블·계산식 탭 「룰 상수」에서 고친다 · 공유 설정 meta/set.rules 와 백업에 들어간다)
   abil 행: [능력 랭크, 고유 칸 수, 고유 표시, 전용 개수, 전용 설명, 1인 전용 개수, 1인 전용 설명] — 룰북 「능력」 · 「1인 기준 (2체)」 */
const ABIL_DEF = [
  ['D', '1', '1', '0', '0', '0', '0'],
  ['C', '1', '1', '2', '2 (템플릿 전용만 · 상시 1)', '1', '1 (템플릿 전용만 · 상시 1)'],
  ['B-', '2', '2 (상시1+단발1)', '3', '3 (커스텀 1 · 상시 1)', '1', '1 (커스텀 1 · 상시 1)'],
  ['B', '2', '2', '4', '2 (템플릿만) 또는 4 (커스텀 2 · 상시 2)', '2', 'a) 1 (템플릿만 · 상시 1) 또는 b) 2 (커스텀 1 · 상시 1)'],
  ['A', '2', '2 (상시2)', '6', '6 (상시 3)', '2', '2 (상시 1)'],
  ['AA', '3', '3 (상시2+단발1)', '8', '8 (상시 4)', '3', '3 (상시 2)'],
  ['AAA', '3', '3 (상시2+단발1)', '10', '10 (1체에게 2개까지 부여 가능)', '4', '4 (1체에게 2개까지 부여 가능)']
];
/* invest: 자질 투자 규칙 — 투자 횟수 · D 조정 · 금지 조합 */
const INVEST_DEF = { allow: '2', allowD: '3', dMax: '1', dPair: '육성+통솔', dPairMax: '2', banPair: '육성+능력', banAA: '육성,통솔' };
/* soloOrd: 1인 기준(2체)에서 고르는 지시 수 — ORDER(4식) o 개 · COMMAND(6령) c 개 (10-26 망령) */
const SOLO_ORD_DEF = { o: '1', c: '2' };
/* solo3: 1인 기준 (3체) — 6체 기준 자원 × ratio (10-27 망령: 「6체 메리트의 절반」). 템플릿 항목은 unit 단위로 round(올림 ceil · 반올림 round · 내림 floor),
   PT 기술점 · 소지품 소켓처럼 0.5 단위인 것은 ptUnit. keep='1' 이면 2체 값이 6체 값과 같은 항목(메인 등)은 그대로. 파트너 수 partner · 지시 고르기 o · c */
const SOLO3_DEF = { ratio: '0.5', unit: '1', round: 'ceil', ptUnit: '0.5', keep: '1', partner: '1', o: '2', c: '3' };
function soloN(t) {
  const v = t && t.solo;
  return v === 3 || v === '3' ? 3 : v ? 2 : 0;
}
function s3num(x, unitKey) {
  const R = RULES().solo3 || SOLO3_DEF;
  const u = +R[unitKey || 'unit'] || +SOLO3_DEF[unitKey || 'unit'] || 1;
  const f = R.round === 'floor' ? Math.floor : R.round === 'round' ? Math.round : Math.ceil;
  return Math.round(f(x / u - 1e-9 * (R.round === 'ceil' ? 1 : 0)) * u * 1000) / 1000;
}
function s3val(v6, v1, unitKey) {
  const R = RULES().solo3 || SOLO3_DEF;
  if (R.keep === '1' && v1 != null && v1 !== '' && +v1 === +v6) return +v6;
  return s3num((+v6 || 0) * (+R.ratio || 0.5), unitKey);
}
