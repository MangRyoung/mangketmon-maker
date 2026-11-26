/* ── 조각 09_pot_recommend.js — 포텐셜 추천 · 제작 ── */
/* ---------- 포텐셜 추천 · 제작 ---------- */
const PR_STAT_KO = { 0: 'HP', 1: '공격', 2: '방어', 3: '특공', 4: '특방', 5: '스피드' };
const PR_RANKV = {
  '-': 0,
  'E-': 1,
  'E': 2,
  'E+': 3,
  'D-': 4,
  'D': 5,
  'D+': 6,
  'C-': 7,
  'C': 8,
  'C+': 9,
  'B-': 10,
  'B': 11,
  'B+': 12,
  'A-': 13,
  'A': 14,
  'A+': 15,
  'AA-': 16,
  'AA': 17,
  'AA+': 18,
  'AAA-': 19,
  'AAA': 20,
  'AAA+': 21,
  'S-': 22,
  'S': 23,
  'S+': 24,
  'EX': 25
};
function prCtx(t, p) {
  const types = [p.t1, p.t2, p.t3].filter(x => x && x !== '-');
  const g = p.base.map(v => grade(v)),
    gv = g.map(x => PR_RANKV[x] || 0);
  const moves = p.moves
    .filter(m => m.name)
    .map(m => ({ n: m.name, r: idx.moves.get(m.name) }))
    .map(m =>
      Object.assign(m, {
        ty: m.r ? m.r[5] : '',
        cat: m.r ? m.r[6] : '',
        pow: m.r ? +m.r[7] || 0 : 0,
        rng: m.r ? m.r[9] : '',
        prio: m.r ? +m.r[11] || 0 : 0,
        touch: m.r ? m.r[10] === 'O' : false
      })
    );
  const mtypes = new Set(moves.map(m => m.ty).filter(Boolean));
  const cats = {
    phys: moves.some(m => m.cat === '물리'),
    spec: moves.some(m => m.cat === '특수'),
    stat: moves.some(m => m.cat === '변화'),
    wide: moves.some(m => /상대 2체|상대 전체|자신 이외|전체/.test(m.rng)),
    prio: moves.some(m => m.prio > 0),
    touch: moves.some(m => m.touch)
  };
  const roles = p.pots.map((n, i) => (n && /역할/.test(potKindOf(p, i)) ? n : '')).filter(Boolean);
  const others = t.pokemon.filter(x => x !== p);
  const otherPots = [];
  for (const o of others)
    o.pots.forEach((n, i) => {
      if (n) otherPots.push({ who: o.name || '(이름 없음)', n, eff: potEffOf(o, i) });
    });
  const eggs = [p.egg1, p.egg2].filter(x => x && x !== '-');
  const stats = { hp: gv[0], atk: gv[1], def: gv[2], spa: gv[3], spd: gv[4], spe: gv[5] };
  const abr = idx.abil.get(p.ability || '');
  return {
    types,
    g,
    gv,
    stats,
    moves,
    mtypes,
    cats,
    roles,
    others,
    otherPots,
    eggs,
    ability: p.ability || '',
    abilEff: abr ? String(abr[2] || '') : '',
    item: p.item || '',
    old: isOld(p),
    ranks: t.ranks,
    name: p.name || '(이름 없음)'
  };
}
function prTags(s) {
  return (String(s || '').match(/【((?:[^【】]|【[^【】]*】)*)】/g) || []).map(x => x.slice(1, -1).replace(/\s*\(.*$/, ''));
}
function prEffKeys(s) {
  const k = new Set();
  const x = String(s || '');
  if (/강화\(|위력.*(배|강화)|대미지를 강화|2배/.test(x)) k.add('위력 강화');
  if (/완화\(|반감|받을 대미지|무효화/.test(x)) k.add('피해 완화');
  for (const st of ['공격', '방어', '특공', '특방', '스피드', '명중', '회피'])
    if (new RegExp('「[^」]*' + st + '[^」]*: ?[+]').test(x) || new RegExp('「' + st + '」을? 강화').test(x)) k.add(st + ' 상승');
  for (const st of ['공격', '방어', '특공', '특방', '스피드', '명중', '회피'])
    if (new RegExp('「[^」]*' + st + '[^」]*: ?-').test(x) || new RegExp('「' + st + '」을? 저하').test(x)) k.add(st + ' 감소');
  if (/급소/.test(x)) k.add('급소');
  if (/회복/.test(x)) k.add('HP 회복');
  if (/교대/.test(x)) k.add('교대');
  if (/따라가때리기/.test(x)) k.add('추격');
  if (/필중/.test(x)) k.add('필중');
  if (/「(화상|마비|독|맹독|잠듦|얼음|혼란|풀죽음)」/.test(x)) k.add('상태 부여');
  if (/날씨/.test(x)) k.add('날씨');
  if (/필드/.test(x)) k.add('필드');
  if (/우선도/.test(x)) k.add('우선도');
  return k;
}
function prCtxHTML(C) {
  return `<div class="small muted" style="margin:0 0 6px"><b>${esc(C.name)}</b> · ${C.types.map(tchip).join('')} · 종족치 ${C.g.map((x, i) => PR_STAT_KO[i] + ' ' + x).join(' / ')} · 특성 ${esc(C.ability || '-')} · 역할 ${esc(C.roles.join(', ') || '-')} · 기술 ${C.moves.map(m => esc(m.n)).join(', ') || '-'}</div>`;
}

/* ===== 제작기 선택지 ===== */
const PB_TRIG = [
  [
    '횟수·방식',
    [
      ['', '(없음 · 상시)'],
      ['【1/시】', '【1/시】'],
      ['【2/시】', '【2/시】'],
      ['【1/시】【자동】', '【1/시】【자동】'],
      ['【1/시】【선행】', '【1/시】【선행】'],
      ['【1/시】【임의】', '【1/시】【임의】'],
      ['【사전】', '【사전】']
    ]
  ],
  [
    '방호·동조',
    [
      ['【방호】', '【방호】'],
      ['【방호】【수세】', '【방호】【수세】'],
      ['【1/시】【방호】', '【1/시】【방호】'],
      ['【1/시】【자동】【방호】', '【1/시】【자동】【방호】'],
      ['【동조】', '【동조】'],
      ['【동조 (아군)】', '【동조 (아군)】']
    ]
  ],
  [
    '등장·퇴장·지연',
    [
      ['【등장】', '【등장】'],
      ['【등장 (통상 교대)】', '【등장 (통상 교대)】'],
      ['【등장 (죽어내밀기)】', '【등장 (죽어내밀기)】'],
      ['【퇴장 (통상 교대)】', '【퇴장 (통상 교대)】'],
      ['【퇴장 (빈사)】', '【퇴장 (빈사)】'],
      ['【지연 (2턴)】', '【지연 (2턴)】'],
      ['【지연 (3턴)】', '【지연 (3턴)】']
    ]
  ],
  [
    '지원·수세·공세·함성',
    [
      ['【지원】', '【지원】'],
      ['【지원 (빈사)】', '【지원 (빈사)】'],
      ['【지원 (상위)】', '【지원 (상위)】'],
      ['【수세】', '【수세】'],
      ['【공세】', '【공세】'],
      ['【함성】', '【함성】'],
      ['【1/시】【함성】', '【1/시】【함성】']
    ]
  ],
  [
    '제한',
    [
      ['【유일】', '【유일】'],
      ['【소진】', '【소진】'],
      ['【탈진】', '【탈진】'],
      ['【보급】', '【보급】'],
      ['【공유】', '【공유】'],
      ['【중첩 (2회)】', '【중첩 (2회)】'],
      ['【중첩 (3회)】', '【중첩 (3회)】'],
      ['【은폐】', '【은폐】']
    ]
  ]
];
const PB_COND = [
  [
    'HP',
    [
      ['「HP : 가득」일 때 ', '「HP : 가득」일 때'],
      ['「HP : 3/4 이상」일 때 ', '「HP : 3/4 이상」일 때'],
      ['「HP : 1/2 이하」일 때 ', '「HP : 1/2 이하」일 때'],
      ['「HP : 1/3 이하」일 때 ', '「HP : 1/3 이하」일 때'],
      ['「HP : 1/4 이하」일 때 ', '「HP : 1/4 이하」일 때'],
      ['「HP : 1」일 때 ', '「HP : 1」일 때']
    ]
  ],
  [
    '날씨',
    [
      ['「날씨 : 맑음」일 때 ', '맑음'],
      ['「날씨 : 비」일 때 ', '비'],
      ['「날씨 : 모래바람」일 때 ', '모래바람'],
      ['「날씨 : 눈」일 때 ', '눈'],
      ['「날씨 : 짙은안개」일 때 ', '짙은안개'],
      ['「날씨 : 밤」일 때 ', '밤'],
      ['「날씨 : 별하늘」일 때 ', '별하늘'],
      ['「날씨 : 큰가뭄」일 때 ', '큰가뭄 (상위)'],
      ['「날씨 : 폭우」일 때 ', '폭우 (상위)'],
      ['「날씨 : 난기류」일 때 ', '난기류 (상위)'],
      ['「날씨 : 극한」일 때 ', '극한 (상위)'],
      ['「날씨 : 깊은밤」일 때 ', '깊은밤 (상위)'],
      ['「날씨」가 있을 때 ', '어떤 날씨든 있을 때'],
      ['「날씨」가 없을 때 ', '날씨가 없을 때']
    ]
  ],
  [
    '필드·룸',
    [
      ['「필드 : 그래스필드」일 때 ', '그래스필드'],
      ['「필드 : 일렉트릭필드」일 때 ', '일렉트릭필드'],
      ['「필드 : 미스트필드」일 때 ', '미스트필드'],
      ['「필드 : 사이코필드」일 때 ', '사이코필드'],
      ['「룸 : 트릭룸」일 때 ', '트릭룸'],
      ['「룸 : 매직룸」일 때 ', '매직룸'],
      ['「룸 : 원더룸」일 때 ', '원더룸'],
      ['「필드의 상태 : 중력」일 때 ', '중력']
    ]
  ],
  [
    '자신의 상태',
    [
      ['상태 이상일 때 ', '상태 이상일 때'],
      ['「화상」 상태일 때 ', '「화상」 상태일 때'],
      ['「독」「맹독」 상태일 때 ', '「독」「맹독」 상태일 때'],
      ['「마비」 상태일 때 ', '「마비」 상태일 때'],
      ['「잠듦」 상태일 때 ', '「잠듦」 상태일 때'],
      ['「혼란」 상태일 때 ', '「혼란」 상태일 때'],
      ['능력이 상승해 있을 때 ', '능력이 상승해 있을 때'],
      ['능력이 감소해 있을 때 ', '능력이 감소해 있을 때'],
      ['「소지품 : -」일 때 ', '소지품이 없을 때'],
      ['하늘 위에 떠 있을 때 ', '하늘 위에 떠 있을 때']
    ]
  ],
  [
    '상대·아군',
    [
      ['「정면」이 상태 이상일 때 ', '정면이 상태 이상일 때'],
      ['「정면」의 능력이 상승해 있을 때 ', '정면의 능력이 상승해 있을 때'],
      ['「빈사」 상태인 아군이 있을 때 ', '빈사 상태인 아군이 있을 때'],
      ['아군이 「HP : 1/2 이하」일 때 ', '아군이 HP 1/2 이하일 때'],
      ['적진에 같은 『역할』이 있을 때 ', '적진에 같은 역할이 있을 때'],
      ['적진에 「타입 : ○○」이 있을 때 ', '적진에 특정 타입이 있을 때 (○○ 수정)'],
      ['상대가 「전체기」를 내보냈을 때 ', '상대가 전체기를 내보냈을 때'],
      ['상대가 「변화기」를 내보냈을 때 ', '상대가 변화기를 내보냈을 때'],
      ['상대가 교대했을 때 ', '상대가 교대했을 때'],
      ['상대의 공격을 받았을 때 ', '상대의 공격을 받았을 때'],
      ['상대보다 「스피드」가 높을 때 ', '상대보다 스피드가 높을 때']
    ]
  ],
  [
    '행동 순서·명중',
    [
      ['상대보다 먼저 행동했을 때 ', '상대보다 먼저 행동했을 때'],
      ['상대보다 늦게 행동했을 때 ', '상대보다 늦게 행동했을 때'],
      ['자신의 기술이 급소에 맞았을 때 ', '자신의 기술이 급소에 맞았을 때'],
      ['자신의 기술이 명중하지 않았을 때 ', '자신의 기술이 명중하지 않았을 때'],
      ['「상성 : 2배~8배」인 기술을 받았을 때 ', '효과가 굉장한 기술을 받았을 때'],
      ['「상성 : 1/2배 이하」인 기술을 받았을 때 ', '효과가 별로인 기술을 받았을 때'],
      ['「접촉기」를 받았을 때 ', '접촉기를 받았을 때'],
      ['「물리기」를 받았을 때 ', '물리기를 받았을 때'],
      ['「특수기」를 받았을 때 ', '특수기를 받았을 때']
    ]
  ],
  [
    '타이밍',
    [
      ['턴 개시 시 ', '턴 개시 시'],
      ['턴 종료 시 ', '턴 종료 시'],
      ['자신이 「변화기」를 내보냈을 때 ', '자신이 변화기를 내보냈을 때'],
      ['자신이 「전체기」를 내보냈을 때 ', '자신이 전체기를 내보냈을 때'],
      ['「소지품 : 나무열매」를 소모했을 때 ', '나무열매를 소모했을 때'],
      ['「폼체인지」했을 때 ', '폼체인지했을 때']
    ]
  ]
];
const PB_EFF = [
  [
    '위력',
    [
      ['boost', '타입 기술 강화', ({ ty, mul }) => `자신의 「${ty}」 기술의 대미지를 강화(${mul}배)한다.`, ['ty', 'mul']],
      ['boostm', '특정 기술 강화', ({ mv, mul }) => `자신의 기술 「${mv}」의 위력을 강화(${mul}배)한다.`, ['mv', 'mul']],
      ['boostc', '분류 기술 강화', ({ cat, mul }) => `자신의 「${cat}」의 대미지를 강화(${mul}배)한다.`, ['cat', 'mul']],
      ['boostn', '다음 기술 2배', () => `다음 기술의 위력을 2배로 만든다.`, []],
      ['nonstab', '타입 비일치 강화', ({ mul }) => `타입 비일치 기술의 대미지를 강화(${mul}배)한다.`, ['mul']],
      ['nonstabt', '타입 비일치 ○ 강화', ({ ty, mul }) => `자신의 타입 비일치 「${ty}」 기술의 위력을 강화(${mul}배)한다.`, ['ty', 'mul']],
      ['wideup', '전체기 강화', ({ mul }) => `자신의 「전체기」의 위력을 강화(${mul}배)한다.`, ['mul']]
    ]
  ],
  [
    '방어',
    [
      ['guard', '타입 피해 완화', ({ ty, mul }) => `「${ty}」 기술로 받을 대미지를 완화(${mul}배)한다.`, ['ty', 'mul']],
      ['guardc', '분류 피해 완화', ({ cat, mul }) => `「${cat}」로 받을 대미지를 완화(${mul}배)한다.`, ['cat', 'mul']],
      ['guardall', '모든 기술 피해 완화', ({ mul }) => `기술로 받을 대미지를 완화(${mul}배)한다.`, ['mul']],
      ['half', '타입 피해 반감', ({ ty }) => `「${ty}」 기술로 받을 대미지를 반감한다.`, ['ty']],
      ['null', '타입 무효화', ({ ty }) => `「${ty}」 기술을 무효화한다.`, ['ty']],
      ['nullc', '분류 무효화', ({ cat }) => `자신에 대한 「${cat}」를 무효화한다.`, ['cat']],
      ['endure', '빈사 방지', () => `기술 대미지로 「빈사」 상태가 되지 않는다.`, []],
      ['evade', '회피 강화', ({ mul, dur }) => `${dur}자신의 「회피」를 강화(${mul}배)한다.`, ['mul', 'dur']],
      ['critg', '급소 방호', ({ n, dur }) => `${dur}자신에 대한 기술이 급소에 맞기 어려워진다(C-${n}).`, ['n', 'dur']]
    ]
  ],
  [
    '능력치',
    [
      ['rank', '자신 능력 상승', ({ st, n }) => `자신의 「${st} : +${n}」한다.`, ['st', 'n']],
      ['rankally', '아군 능력 상승', ({ st, n }) => `아군의 「${st} : +${n}」한다.`, ['st', 'n']],
      ['rankd', '정면 능력 감소', ({ st, n }) => `「정면」의 「${st} : -${n}」한다.`, ['st', 'n']],
      ['rankall', '상대 전체 감소', ({ st, n }) => `상대 전체의 「${st} : -${n}」한다.`, ['st', 'n']],
      ['rankturn', '턴 종료 시까지 강화', ({ st, mul }) => `턴 종료 시까지 자신의 「${st}」을(를) 강화(${mul}배)한다.`, ['st', 'mul']],
      ['mult', '자신 능력 강화 (배율)', ({ st, mul, dur }) => `${dur}자신의 「${st}」을(를) 강화(${mul}배)한다.`, ['st', 'mul', 'dur']],
      ['multd', '정면 능력 저하 (배율)', ({ st, mul, dur }) => `${dur}「정면」의 「${st}」을(를) 저하(${mul}배)시킨다.`, ['st', 'mul', 'dur']],
      ['reset', '자신 능력 변화 초기화', () => `자신의 능력 변화를 원래대로 되돌린다.`, []],
      ['nodrop', '능력 감소 무시', ({ dur }) => `${dur}자신 이외에 의해 능력이 감소(저하)되지 않는다.`, ['dur']],
      ['ignoreup', '상대 능력 상승 무시', () => `자신의 기술이 상대의 능력 상승(강화)을 무시한다.`, []]
    ]
  ],
  [
    '급소·명중',
    [
      ['crit', '타입 기술 급소', ({ ty, n }) => `자신의 「${ty}」 기술이 급소에 맞기 쉬워진다(C+${n}).`, ['ty', 'n']],
      ['critm', '특정 기술 급소', ({ mv, n }) => `자신의 기술 「${mv}」이(가) 급소에 맞기 쉬워진다(C+${n}).`, ['mv', 'n']],
      ['nextcrit', '다음 기술 급소', ({ n }) => `다음 기술이 급소에 맞기 쉬워진다(C+${n}).`, ['n']],
      ['critall', '모든 기술 급소', ({ n }) => `자신의 기술이 급소에 맞기 쉬워진다(C+${n}).`, ['n']],
      ['sure', '타입 기술 필중', ({ ty }) => `자신의 「${ty}」 기술이 필중한다.`, ['ty']],
      ['surem', '특정 기술 필중', ({ mv }) => `자신의 기술 「${mv}」이(가) 필중한다.`, ['mv']],
      ['acc', '명중 강화', ({ mul, dur }) => `${dur}자신의 「명중」을 강화(${mul}배)한다.`, ['mul', 'dur']]
    ]
  ],
  [
    '상태 이상·변화',
    [
      [
        'status',
        '타입 기술에 상태 부여',
        ({ ty, pr, cond, dur }) => `자신의 「${ty}」 기술이 명중한 상대를 ${pr} ${dur}「${cond}」 상태로 만든다.`,
        ['ty', 'pr', 'cond', 'dur']
      ],
      [
        'statusm',
        '특정 기술에 상태 부여',
        ({ mv, pr, cond, dur }) => `자신의 기술 「${mv}」이(가) 명중한 상대를 ${pr} ${dur}「${cond}」 상태로 만든다.`,
        ['mv', 'pr', 'cond', 'dur']
      ],
      [
        'statusc',
        '접촉한 상대에게 상태',
        ({ pr, cond, dur }) => `자신에게 「접촉기」를 내보낸 상대를 ${pr} ${dur}「${cond}」 상태로 만든다.`,
        ['pr', 'cond', 'dur']
      ],
      ['statusself', '자신에게 상태 변화', ({ cond2, dur }) => `${dur}자신을 「${cond2}」 상태로 만든다.`, ['cond2', 'dur']],
      ['statusally', '아군에게 상태 변화', ({ cond2, dur }) => `${dur}아군을 「${cond2}」 상태로 만든다.`, ['cond2', 'dur']],
      ['statusd', '정면에게 상태 변화', ({ cond2, dur }) => `${dur}「정면」을 「${cond2}」 상태로 만든다.`, ['cond2', 'dur']],
      ['cure', '상태 이상 치유', () => `자신의 상태 이상을 치유한다.`, []],
      ['cureally', '아군 상태 이상 치유', () => `아군 전체의 상태 이상을 치유한다.`, []],
      ['immune', '상태 이상 면역', ({ cond, dur }) => `${dur}「${cond}」 상태가 되지 않는다.`, ['cond', 'dur']],
      ['immuneall', '모든 상태 이상 면역', ({ dur }) => `${dur}상태 이상이 되지 않는다.`, ['dur']]
    ]
  ],
  [
    '특성 변화',
    [
      ['abilself', '자신 특성 변경', ({ abn, dur }) => `${dur}자신을 「특성 : ${abn}」(으)로 변경한다.`, ['abn', 'dur']],
      ['abild', '정면 특성 변경', ({ abn, dur }) => `${dur}「정면」을 「특성 : ${abn}」(으)로 변경한다.`, ['abn', 'dur']],
      ['abilnull', '정면 특성 무효', ({ dur }) => `${dur}「정면」의 「특성」을 무효화한다.`, ['dur']],
      ['abilcopy', '정면 특성 복사', ({ dur }) => `${dur}자신을 「정면」과 같은 「특성」으로 변경한다.`, ['dur']]
    ]
  ],
  [
    'HP',
    [
      ['heal', 'HP 회복', ({ fr }) => `자신의 「HP」를 ${fr}만큼 회복한다.`, ['fr']],
      ['healally', '아군 HP 회복', ({ fr }) => `아군의 「HP」를 ${fr}만큼 회복시킨다.`, ['fr']],
      ['drain', '정면 HP 드레인', ({ fr }) => `「정면」의 「HP」를 ${fr}만큼 드레인한다.`, ['fr']],
      ['drainm', '특정 기술 드레인', ({ mv }) => `자신의 기술 「${mv}」에 입힌 대미지의 1/2만큼 「HP」를 회복하는 효과를 부여한다.`, ['mv']],
      ['dmg', '정면 비례 대미지', ({ fr }) => `「정면」에게 ${fr}의 비례 대미지를 입힌다.`, ['fr']],
      ['cost', 'HP 소비', ({ fr }) => `자신의 「HP」를 ${fr}만큼 소비한다.`, ['fr']],
      ['noind', '비례 대미지 면역', () => `비례 대미지를 받지 않는다.`, []]
    ]
  ],
  [
    '행동',
    [
      ['switch', '임의 교대', () => `임의 교대할 수 있다.`, []],
      ['switchend', '턴 종료 후 교대', () => `턴 종료 이후 아군과 임의 교대할 수 있다.`, []],
      ['move', '기술 내보내기', ({ mv }) => `기술 「${mv}」을(를) 내보낸다.`, ['mv']],
      ['extra', '추가 행동', () => `추가 행동을 얻는다.`, []],
      ['prio', '특정 기술 우선도', ({ mv, n }) => `자신의 기술 「${mv}」의 「우선도 : +${n}」한다.`, ['mv', 'n']],
      ['prioall', '모든 기술 우선도', ({ n }) => `자신의 기술에 「우선도 : +${n}」한다.`, ['n']],
      ['forceswitch', '정면 강제 교대', () => `「정면」을 강제 교대시킨다.`, []],
      ['uturn', '유턴 부여', ({ mv }) => `자신의 기술 「${mv}」에 「유턴」 효과를 부여한다.`, ['mv']],
      ['pursuit', '추격 부여', ({ mv }) => `자신의 기술 「${mv}」에 「따라가때리기」 효과를 부여한다.`, ['mv']],
      ['nopursuit', '추격 무시', () => `교대할 때 상대의 「따라가때리기」 효과를 무시한다.`, []]
    ]
  ],
  [
    '기술 보조',
    [
      ['range', '범위 확장', ({ mv }) => `자신의 기술 「${mv}」을(를) 「범위 : 상대 2체」로 만든다.`, ['mv']],
      ['pierce', '방어 관통', ({ mv }) => `자신의 기술 「${mv}」이(가) 상대의 「방어」 등의 기술을 관통한다.`, ['mv']],
      [
        'piercew',
        '방어 관통 (대미지 1/4배)',
        ({ mv }) => `자신의 기술 「${mv}」이(가) 상대의 「방어」 상태를 무시한다. 이때 기술의 대미지가 1/4배가 된다.`,
        ['mv']
      ],
      ['ignoretrait', '특성 무시', ({ mv }) => `자신의 기술 「${mv}」이(가) 상대의 「특성」을 무시한다.`, ['mv']],
      ['norecoil', '반동 무시', ({ mv }) => `자신의 기술 「${mv}」의 반동을 받지 않는다.`, ['mv']],
      ['nofail', '연속 제한 무시', ({ mv }) => `자신의 기술 「${mv}」의 연속 제한을 무시한다.`, ['mv']],
      ['typechg', '기술 타입 변경', ({ mv, ty, dur }) => `${dur}자신의 기술 「${mv}」을(를) 「타입 : ${ty}」(으)로 만든다.`, ['mv', 'ty', 'dur']],
      ['addtype', '자신 타입 추가', ({ ty, dur }) => `${dur}자신에게 「타입 : ${ty}」을(를) 추가한다.`, ['ty', 'dur']]
    ]
  ],
  [
    '필드 전개',
    [
      ['weather', '날씨 전개', ({ wt, dur }) => `${dur}필드의 상태를 「날씨 : ${wt}」(으)로 만든다.`, ['wt', 'dur']],
      ['field', '필드 전개', ({ fd, dur }) => `${dur}필드의 상태를 「필드 : ${fd}」(으)로 만든다.`, ['fd', 'dur']],
      ['room', '룸 전개', ({ rm, dur }) => `${dur}필드의 상태를 「룸 : ${rm}」(으)로 만든다.`, ['rm', 'dur']],
      ['hazard', '설치기 설치', ({ hz }) => `적진에 「${hz}」을(를) 설치한다.`, ['hz']],
      ['nohazard', '설치물 무시', ({ dur }) => `${dur}자진의 「설치물」의 영향을 받지 않는다.`, ['dur']],
      ['clearobj', '설치기 제거', () => `자진의 「설치기」를 제거한다.`, []],
      ['wall', '장벽 전개', ({ wl, dur }) => `${dur}자진에 「${wl}」을(를) 전개한다.`, ['wl', 'dur']]
    ]
  ],
  [
    '기타',
    [
      ['dexblock', '데이터 해석 차단', () => `자신에 대한 데이터 해석을 차단한다.`, []],
      ['float', '하늘 위', ({ dur }) => `${dur}하늘 위에 떠오른다.`, ['dur']],
      ['basest', '종족치 상승', ({ st }) => `「${st}」의 종족치를 1랭크 상승시킨다.`, ['st']],
      ['role', '역할 취급', ({ rl }) => `이 포텐셜을 『${rl}』(으)로 취급한다.`, ['rl']],
      ['itemkeep', '소지품 보호', () => `「소지품」을 빼앗기거나 파괴되지 않는다.`, []],
      ['custom', '직접 입력', ({ txt }) => txt, ['txt']]
    ]
  ]
];
const PB_FLAT = PB_EFF.flatMap(g => g[1]);
const PB_STATUS = ['화상', '마비', '독', '맹독', '잠듦', '얼음', '혼란', '풀죽음', '조이기', '씨뿌리기', '도발', '앙코르', '회복봉인'];
const PB_STATUS2 = [
  '가열',
  '냉각',
  '충전',
  '집중',
  '대타출동',
  '아쿠아링',
  '뿌리박기',
  '날따름',
  '길동무',
  '회복봉인',
  '도발',
  '앙코르',
  '혼란',
  '풀죽음'
];
const PB_PR = ['반드시', '높은 확률로', '중확률로', '저확률로', '드물게', '1할로', '3할로', '5할로'];
const PB_DEF = {
  ty: '',
  mv: '',
  mul: '1.2',
  cat: '물리기',
  st: '공격',
  n: '1',
  pr: '드물게',
  cond: '화상',
  cond2: '가열',
  fr: '1/8',
  wt: '맑음',
  fd: '그래스필드',
  rm: '트릭룸',
  wl: '리플렉터',
  rl: '어태커',
  hz: '스텔스록',
  dur: '',
  abn: '',
  txt: ''
};
const PB_DUR = [
  ['', '무제한'],
  ['턴 종료 시까지 ', '턴 종료 시까지'],
  ['2턴 동안 ', '2턴 동안'],
  ['3턴 동안 ', '3턴 동안'],
  ['5턴 동안 ', '5턴 동안']
];
const PB_DURV = { '': 1, '턴 종료 시까지 ': 0.5, '2턴 동안 ': 0.7, '3턴 동안 ': 0.8, '5턴 동안 ': 0.9 };
const PB_ST2V = {
  가열: 4,
  냉각: 3.5,
  충전: 3.5,
  집중: 3,
  대타출동: 3.5,
  아쿠아링: 2.5,
  뿌리박기: 2.5,
  날따름: 2,
  길동무: 3,
  회복봉인: 3,
  도발: 3,
  앙코르: 3,
  혼란: 3.5,
  풀죽음: 5
};
const PB_STV = { 풀죽음: 2, 잠듦: 1.5, 얼음: 1.5, 혼란: 0.5, 맹독: 0.5, 조이기: 0.5, 씨뿌리기: 0.5, 도발: 1, 앙코르: 1, 회복봉인: 1 };

function jo(s) {
  const bt = c => {
    const k = c.charCodeAt(0) - 0xac00;
    return k >= 0 && k < 11172 ? k % 28 : /[0-9]/.test(c) ? ([0, 1, 3, 6, 7, 8].includes(+c) ? 1 : 0) : /[A-Za-z]/.test(c) ? 0 : -1;
  };
  return String(s || '').replace(/([^\s])([」』])(이\(가\)|을\(를\)|과\(와\)|은\(는\)|\(으\)로)/g, (m, c, q, j) => {
    const b = bt(c);
    if (b < 0) return m;
    const has = b > 0;
    const r = {
      '이(가)': has ? '이' : '가',
      '을(를)': has ? '을' : '를',
      '과(와)': has ? '과' : '와',
      '은(는)': has ? '은' : '는',
      '(으)로': has && b !== 8 ? '으로' : '로'
    }[j];
    return c + q + r;
  });
}
/* ===== 추천 · 밸류 수지 (효과값 − 조건값 ≤ 예산) ===== */
const PR_HIDDEN = true; /* 추천·수지 계산 보류 · false로 바꾸면 ✨ 추천 버튼, 「← 추천으로」, 제작기의 수지 표시가 다시 나온다 */
const PR_BUDGET = { race: 1.2, excl: 3.0 }; /* 종족 포텐셜은 「델타 포스」(상시 비자속 1.5배)를 2.0으로 보고 그 이하만 허용 */
const PR_PRV = { '반드시': 5, '높은 확률로': 4, '5할로': 3.5, '중확률로': 3, '3할로': 2.5, '저확률로': 2, '1할로': 1.5, '드물게': 1.5 };
const PR_FRV = { '1/16': 1.5, '1/8': 2.5, '1/6': 3, '1/4': 3.5, '1/3': 4, '1/2': 5, '모두': 6 };
const PR_HZV = { '스텔스록': 5, '독압정': 4, '압정뿌리기': 3.5, '끈적끈적네트': 3.5 };
function prEffVal(eff, P) {
  const n = +P.n || 1,
    mul = +P.mul || 1;
  const D = PB_DURV[P.dur || ''] || 1;
  switch (eff) {
    case 'move':
      return 6;
    case 'extra':
      return 6;
    case 'rank':
      return n * 4.5;
    case 'rankally':
      return n * 5;
    case 'rankd':
      return n * 4;
    case 'rankall':
      return n * 5;
    case 'mult':
      return (mul >= 1.5 ? 3.5 : mul >= 1.33 ? 2.5 : 1.5) * D;
    case 'multd':
      return 3 * D;
    case 'rankturn':
      return mul >= 1.5 ? 2.5 : 1.2;
    case 'abilself':
      return 3 * D;
    case 'abild':
      return 4 * D;
    case 'abilnull':
      return 3.5 * D;
    case 'abilcopy':
      return 3 * D;
    case 'statusally':
      return ((PB_ST2V[P.cond2] || 2.5) + 0.5) * D;
    case 'statusd':
      return ((PB_ST2V[P.cond2] || 2.5) + 0.5) * D;
    case 'reset':
      return 2;
    case 'nodrop':
      return 2.5 * D;
    case 'ignoreup':
      return 2.5;
    case 'nextcrit':
      return n * 1.5;
    case 'crit':
      return n * 2.5;
    case 'critm':
      return n * 2;
    case 'critall':
      return n * 3;
    case 'sure':
      return 3;
    case 'surem':
      return 2;
    case 'acc':
      return 1.5 * D;
    case 'status':
      return ((PR_PRV[P.pr] || 3) + (PB_STV[P.cond] || 0)) * D;
    case 'statusm':
      return ((PR_PRV[P.pr] || 3) - 0.5 + (PB_STV[P.cond] || 0)) * D;
    case 'statusc':
      return ((PR_PRV[P.pr] || 3) + (PB_STV[P.cond] || 0)) * D;
    case 'statusself':
      return (PB_ST2V[P.cond2] || 2.5) * D;
    case 'cure':
      return 1.5;
    case 'cureally':
      return 4;
    case 'immune':
      return 1.5 * D;
    case 'immuneall':
      return 3.5 * D;
    case 'heal':
      return PR_FRV[P.fr] || 3;
    case 'healally':
      return (PR_FRV[P.fr] || 3) + 0.5;
    case 'drain':
      return PR_FRV[P.fr] || 3;
    case 'drainm':
      return 2.5;
    case 'dmg':
      return 2.5;
    case 'noind':
      return 1.5;
    case 'cost':
      return 0;
    case 'switch':
      return 3;
    case 'switchend':
      return 2.5;
    case 'forceswitch':
      return 4;
    case 'prio':
      return n * 4;
    case 'prioall':
      return n * 5;
    case 'pursuit':
      return 3.5;
    case 'nopursuit':
      return 1.5;
    case 'uturn':
      return 3.5;
    case 'range':
      return 3;
    case 'pierce':
      return 5;
    case 'piercew':
      return 2.5;
    case 'ignoretrait':
      return 2.5;
    case 'norecoil':
      return 1.5;
    case 'nofail':
      return 1.5;
    case 'typechg':
      return 2 * D;
    case 'addtype':
      return 3 * D;
    case 'weather':
      return 3.5 * D;
    case 'field':
      return 3.5 * D;
    case 'room':
      return 3.5 * D;
    case 'clearobj':
      return 2;
    case 'wall':
      return 4 * D;
    case 'hazard':
      return PR_HZV[P.hz] || 4;
    case 'nohazard':
      return 2 * D;
    case 'dexblock':
      return 1;
    case 'float':
      return 2 * D;
    case 'role':
      return 2;
    case 'itemkeep':
      return 1.5;
    case 'basest':
      return 3.5;
    case 'nonstab':
      return mul >= 1.5 ? 2 : 1.2;
    case 'nonstabt':
      return mul > 1.5 ? 2 : 1.2;
    case 'endure':
      return 3;
    case 'evade':
      return 3 * D;
    case 'critg':
      return n * 1 * D;
    case 'boost':
    case 'boostm':
    case 'boostc':
    case 'boostn':
    case 'wideup':
      return mul >= 1.5 ? 4 : 3;
    case 'guard':
    case 'guardc':
    case 'guardall':
      return 3;
    case 'half':
      return 3.5;
    case 'null':
    case 'nullc':
      return 5;
    default:
      return 3;
  }
}
const PR_TAGV = {
  '1/시': 1,
  '2/시': 0.6,
  '3/시': 0.4,
  'N/시': 0.3,
  '자동': 0,
  '선행': 0,
  '사전': 0,
  '임의': -0.5,
  '강제': 0,
  '방호': 0,
  '방호 (조건)': 0,
  '수세': 1,
  '공세': 1,
  '동조': 1.5,
  '동조 (아군)': 1.2,
  '동조 (상대)': 0.5,
  '등장': 0.4,
  '등장 (통상 교대)': 0.7,
  '등장 (임의 교대)': 1,
  '등장 (죽어내밀기)': 0.7,
  '등장 (상대)': 0.5,
  '퇴장': 0.8,
  '퇴장 (통상 교대)': 0.8,
  '퇴장 (임의 교대)': 1.2,
  '퇴장 (강제 교대)': 1.5,
  '퇴장 (빈사)': 1.5,
  '지연 (2턴)': 1,
  '지연 (3턴)': 1.5,
  '지연 (아군, 2턴)': 1,
  '지원': 0,
  '지원 (빈사)': 0,
  '지원 (상위)': 0,
  '함성': 1.8,
  '유일': 0.2,
  '소진': 0.3,
  '탈진': 0.6,
  '보급': 0.9,
  '공유': 0.3,
  '야생': 0
};
const PR_CONDV = [
  [/「HP : 가득」/, 1],
  [/3\/4 이상/, 0.5],
  [/1\/2 이하/, 1],
  [/1\/3 이하/, 1.5],
  [/1\/4 이하/, 2],
  [/「HP : 1」/, 3],
  [/「날씨 : [^」]+」일 때/, 1],
  [/「날씨」가 있을 때/, 0.5],
  [/「날씨」가 없을 때/, 0.3],
  [/「필드 : [^」]+」일 때/, 1.2],
  [/「룸 : [^」]+」일 때/, 1.5],
  [/중력/, 2],
  [/^상태 이상일 때/, 1.5],
  [/「(화상|독|마비|잠듦|혼란|얼음)」[^일]*상태일 때/, 1.8],
  [/능력이 상승해/, 0.8],
  [/능력이 감소해/, 1],
  [/「소지품 : -」/, 1.5],
  [/하늘 위/, 1],
  [/「정면」이 상태 이상/, 1.2],
  [/「정면」의 능력이 상승/, 1],
  [/「빈사」 상태인 아군/, 1],
  [/아군이 「HP/, 1],
  [/같은 『역할』/, 1.5],
  [/적진에 「타입/, 1.2],
  [/상대가 「전체기」/, 1.5],
  [/상대가 「변화기」/, 1.2],
  [/상대가 교대했을 때/, 1.5],
  [/먼저 행동했을 때/, 0.5],
  [/늦게 행동했을 때/, 0.5],
  [/급소에 맞았을 때/, 2],
  [/명중하지 않았을 때/, 2],
  [/2배~8배/, 1.5],
  [/1\/2배 이하/, 1.5],
  [/「접촉기」를 받았을 때/, 1],
  [/「(물리기|특수기)」를 받았을 때/, 0.7],
  [/턴 개시 시/, 0],
  [/턴 종료 시/, 0],
  [/「변화기」를 내보냈을 때/, 0.7],
  [/「전체기」를 내보냈을 때/, 0.7],
  [/나무열매」를 소모/, 1.5],
  [/「폼체인지」/, 2],
  [/상대의 공격을 받았을 때/, 0.5],
  [/「스피드」가 높을 때/, 0.5],
  [/기술이 명중했을 때/, 0.5]
];
function prTagVal(tag) {
  const t = tag.trim();
  if (PR_TAGV[t] != null) return PR_TAGV[t];
  const m = t.match(/^중첩 \((\d+)회\)$/);
  if (m) return 0;
  const b = t.replace(/\s*\(.*$/, '');
  return PR_TAGV[b] != null ? PR_TAGV[b] : 0;
}
function prStackN(tags) {
  for (const t of tags) {
    const m = t.match(/^중첩 \((\d+)회\)$/);
    if (m) return +m[1];
  }
  return 1;
}
function prBalance(lines, ctx) {
  let ev = 0;
  const credits = [];
  const seenTags = new Set();
  let cost = 0;
  for (const ln of lines) {
    const P = Object.assign({}, PB_DEF, ln.pr);
    const tags = (String(ln.trig || '').match(/【((?:[^【】]|【[^【】]*】)*)】/g) || []).map(x => x.slice(1, -1));
    const n = prStackN(tags);
    let v = prEffVal(ln.eff, P) * n;
    if (ln.eff === 'cost') cost += (PR_FRV[P.fr] || 3) * 0.8;
    else ev += v;
    for (const t of tags) {
      const k = t.trim();
      if (seenTags.has(k)) continue;
      seenTags.add(k);
      const tv = prTagVal(t);
      if (tv) credits.push(tv);
    }
    const c = String(ln.cond || '');
    for (const [re, val] of PR_CONDV)
      if (re.test(c)) {
        let add = val;
        if (ctx && /「날씨 : [^」]+」일 때/.test(c) && ctx.abWt && c.includes(ctx.abWt)) add = 0.7;
        if (ctx && /「필드 : [^」]+」일 때/.test(c) && ctx.abFd && c.includes(ctx.abFd)) add = 0.8;
        if (add) credits.push(add);
      }
  }
  /* 조건을 여러 개 섞어도 수지가 무한정 오르지 않게: 가장 센 조건만 온전히, 다음은 절반, 그다음은 1/4… */
  credits.sort((a, b) => b - a);
  let cc = cost;
  credits.forEach((v, i) => {
    cc += v * Math.pow(0.5, i);
  });
  return { ev: +ev.toFixed(1), cc: +cc.toFixed(1), net: +(ev - cc).toFixed(1), n: credits.length };
}
function prBalanceHTML(b, budget) {
  const ok = b.net <= budget;
  return `<span class="${ok ? 'okc' : 'warn'}" title="효과값 − 조건값 ≤ 예산 ${budget}">수지 ${b.ev} − ${b.cc} = ${b.net}</span>`;
}

/* ===== 추천 (포켓몬 데이터에서 새로 짜기 · 계통별 · 수지 검사) ===== */
function prBuildText(lines) {
  return jo(
    lines
      .map((ln, i) => {
        const E = PB_FLAT.find(e => e[0] === ln.eff);
        const P = Object.assign({}, PB_DEF, ln.pr);
        const body = E[2](P);
        return (lines.length > 1 ? '①②③④⑤'[i] : '') + (ln.trig ? ln.trig + '/' : '') + (ln.cond || '') + body;
      })
      .join('\n')
  );
}
const PR_FAM = [
  '등장',
  '퇴장',
  '함성',
  '지연',
  '교대·바운스',
  '날씨·필드',
  '상태 이상 연계',
  '상태 변화',
  '특성 변화',
  'HP 조건',
  '급소·명중',
  '행동 순서',
  '기술 보조',
  '설치·장벽',
  '동조·역할',
  '소지품',
  '비자속 강화',
  '종족·올드'
];
const PR_TY_WT = {
  불꽃: '맑음',
  물: '비',
  바위: '모래바람',
  땅: '모래바람',
  강철: '모래바람',
  얼음: '눈',
  고스트: '짙은안개',
  악: '밤',
  에스퍼: '별하늘',
  비행: '별하늘',
  드래곤: '맑음',
  풀: '맑음',
  전기: '비',
  벌레: '맑음'
};
const PR_TY_FD = {
  풀: '그래스필드',
  전기: '일렉트릭필드',
  페어리: '미스트필드',
  에스퍼: '사이코필드',
  드래곤: '미스트필드',
  독: '미스트필드',
  격투: '사이코필드',
  노말: '그래스필드'
};
const PR_TY_ST = {
  불꽃: '화상',
  물: '혼란',
  전기: '마비',
  풀: '씨뿌리기',
  얼음: '얼음',
  독: '독',
  격투: '풀죽음',
  비행: '풀죽음',
  에스퍼: '혼란',
  페어리: '잠듦',
  땅: '풀죽음',
  바위: '풀죽음',
  고스트: '혼란',
  악: '풀죽음',
  벌레: '독',
  강철: '풀죽음',
  드래곤: '풀죽음',
  노말: '마비'
};
const PR_TY_HZ = {
  바위: '스텔스록',
  땅: '압정뿌리기',
  강철: '압정뿌리기',
  독: '독압정',
  벌레: '끈적끈적네트',
  고스트: '스텔스록',
  악: '압정뿌리기',
  풀: '끈적끈적네트'
};
function prGenerate(C, excl) {
  const out = [];
  const budget = excl ? PR_BUDGET.excl : PR_BUDGET.race;
  const ab = C.abilEff;
  const abWt = (ab.match(/「날씨 : ([^」]+)」/) || [])[1];
  const abFd = (ab.match(/「필드 : ([^」]+)」/) || [])[1];
  const abSt = (ab.match(/「(화상|마비|독|맹독|잠듦|얼음|혼란)」/) || [])[1];
  /* 같은 아이디어를 조건이 약한 순으로 여러 안 적어 두고, 수지가 예산 안에 드는 첫 안을 고른다 */
  const add = (fam, title, why, variants, score) => {
    for (const lines of variants) {
      const b = prBalance(lines, { abWt, abFd });
      if (b.net > budget) continue;
      const txt = tagFix(prBuildText(lines));
      if (banHits(txt).length) continue;
      if (out.some(o => o.txt === txt)) return;
      out.push({ fam, title, why, lines, txt, bal: b, score: score || 5, kind: excl ? '전용' : '05. 속별' });
      return;
    }
  };
  const R = C.roles.join(',');
  const atkRole = /어태커|어쌔신|킬러|퀄러|디스럽터|타이트엔드/.test(R),
    defRole = /블로커|바운서|타이트엔드/.test(R),
    spdRole = /러너|닌자/.test(R),
    supRole = /어시스트|옵저버|커맨더|서포터|클레릭/.test(R),
    aceRole = /에이스/.test(R),
    noRole = !R;
  const st = C.stats;
  const isPhys = st.atk >= st.spa;
  const atkSt = isPhys ? '공격' : '특공';
  const defSt = st.def >= st.spd ? '방어' : '특방';
  const upSt = defRole ? defSt : atkSt;
  const fast = st.spe >= 13,
    slow = st.spe <= 9,
    bulky = st.hp >= 13 || st.def >= 13 || st.spd >= 13,
    frail = st.hp <= 8 && st.def <= 8 && st.spd <= 8;
  const atkMoves = C.moves.filter(m => m.pow > 0);
  const sig = atkMoves.slice().sort((a, b) => b.pow - a.pow)[0];
  const stMoves = C.moves.filter(m => m.cat === '변화');
  const stMove = stMoves[0];
  const offTypes = [...C.mtypes].filter(x => x && !C.types.includes(x));
  const offType = offTypes[0];
  const prioMove = atkMoves.find(m => m.prio > 0);
  const touchMove = atkMoves.find(m => m.touch);
  const wideMove = C.moves.find(m => /상대 2체|상대 전체|자신 이외|전체/.test(m.rng));
  const nm = C.name;
  const t1 = C.types[0] || '';
  const t2 = C.types[1] || '';
  const stabTy = C.types.find(x => atkMoves.some(m => m.ty === x)) || t1;
  const wt = abWt || PR_TY_WT[t1] || PR_TY_WT[t2];
  const fd = abFd || PR_TY_FD[t1] || PR_TY_FD[t2];
  const cm = abSt || PR_TY_ST[t1] || PR_TY_ST[t2] || '풀죽음';
  const hz = PR_TY_HZ[t1] || PR_TY_HZ[t2];
  const ONE = excl ? '【1/시】【선행】' : '【1/시】【사전】';
  const L = (trig, cond, eff, pr) => ({ trig, cond, eff, pr: pr || {} });
  /* 1. 등장 */
  if (stMove && excl)
    add(
      '등장',
      `${stMove.n} 선수`,
      `전용 한정 · 등장 시 「${stMove.n}」 무료 (종족 칸에는 과한 밸류라 제외)`,
      [[L('【1/시】【선행】【등장 (죽어내밀기)】', '', 'move', { mv: stMove.n })]],
      7
    );
  if (spdRole || aceRole)
    add(
      '등장',
      `가속 등장`,
      `${spdRole ? '러너' : '에이스'} → 죽어내밀기로 나온 턴만 스피드 강화`,
      [[L('【등장 (죽어내밀기)】', '', 'mult', { st: '스피드', mul: '1.5', dur: '턴 종료 시까지 ' })]],
      6
    );
  if (defRole)
    add(
      '등장',
      `장갑 전개`,
      `블로커 → 통상 교대로 나온 턴만 ${defSt} 강화 (장갑형, 1.2배)`,
      [[L('【방호】【등장 (통상 교대)】', '', 'mult', { st: '방어/특방', mul: '1.2', dur: '턴 종료 시까지 ' })]],
      6
    );
  if (aceRole || atkRole)
    add(
      '등장',
      `기세 등장`,
      `${aceRole ? '에이스' : '어태커 계열'} → 죽어내밀기로 나오면 다음 기술 급소 C+1`,
      [[L('【등장 (죽어내밀기)】', '', 'nextcrit', { n: '1' })]],
      6
    );
  if (C.eggs.includes('괴수') || C.eggs.includes('드래곤'))
    add(
      '등장',
      `위압의 ${nm}`,
      `「알그룹 : ${C.eggs.includes('괴수') ? '괴수' : '드래곤'}」 → 등장한 턴 상대 정면 스피드 -1 (1번)`,
      [
        [L('【1/시】【자동】【등장 (통상 교대)】', '', 'rankd', { st: '스피드', n: '1' })],
        [L('【1/시】【자동】【등장 (죽어내밀기)】', '「HP : 가득」일 때 ', 'rankd', { st: '스피드', n: '1' })],
        [L('【1/시】【자동】【동조】', '', 'rankd', { st: '스피드', n: '1' })]
      ],
      4
    );
  /* 2. 퇴장 */
  if (supRole || noRole || bulky)
    add(
      '퇴장',
      `헌신의 ${nm}`,
      `교대로 물러날 때 아군 회복 (특상 상어 지느러미형)`,
      [
        [L('【퇴장 (통상 교대)】', '', 'healally', { fr: '1/8' })],
        [L('【1/시】【퇴장 (통상 교대)】', '', 'healally', { fr: '1/8' })],
        [L('【1/시】【퇴장 (통상 교대)】', '', 'healally', { fr: '1/16' })]
      ],
      supRole ? 8 : 5
    );
  if (supRole || spdRole)
    add(
      '퇴장',
      `바통 ${nm}`,
      `물러나면서 아군에게 ${spdRole ? '스피드' : atkSt} +1 (KMF형) · 예산에 안 들면 「집중」 전달`,
      [
        [L('【1/시】【퇴장 (빈사)】', '', 'rankally', { st: spdRole ? '스피드' : atkSt, n: '1' })],
        [L('【1/시】【퇴장 (빈사)】', '', 'statusally', { cond2: '집중', dur: '턴 종료 시까지 ' })],
        [L('【1/시】【퇴장 (통상 교대)】', '', 'statusally', { cond2: '집중', dur: '턴 종료 시까지 ' })]
      ],
      6
    );
  add(
    '퇴장',
    `유지의 ${nm}`,
    `빈사로 쓰러질 때 다음 아군 치유 (사제형)`,
    [
      [L('【퇴장 (빈사)】', '', 'cureally')],
      [L('【1/시】【퇴장 (빈사)】', '', 'cureally')],
      [L('【1/시】【퇴장 (빈사)】', '', 'healally', { fr: '1/8' })]
    ],
    bulky ? 5 : 4
  );
  if (hz)
    add(
      '퇴장',
      `${hz} 남기기`,
      `「${t1}」 계열 → 쓰러질 때 적진에 「${hz}」 · 설치기는 강해서 빈사 조건`,
      [[L('【1/시】【퇴장 (빈사)】', '', 'hazard', { hz })], [L('【1/시】【퇴장 (빈사)】', '「빈사」 상태인 아군이 있을 때 ', 'hazard', { hz })]],
      6
    );
  /* 3. 함성 */
  if (atkRole || aceRole || noRole)
    add(
      '함성',
      `개가의 ${nm}`,
      `쓰러뜨리면 회복 → 연전형`,
      [
        [L('【함성】', '「HP : 1/2 이하」일 때 ', 'heal', { fr: '1/3' })],
        [L('【함성】', '', 'heal', { fr: '1/4' })],
        [L('【함성】', '', 'heal', { fr: '1/8' })]
      ],
      7
    );
  if (C.eggs.includes('인간형'))
    add('함성', `게릴라 ${nm}`, `「알그룹 : 인간형」 → 쓰러뜨리면 임의 교대 (게릴라형)`, [[L('【1/시】【함성】', '', 'switch')]], 8);
  if (C.types.includes('불꽃'))
    add('함성', `재점화`, `불꽃 타입 → 쓰러뜨리면 「가열」`, [[L('【함성】【탈진】', '', 'statusself', { cond2: '가열' })]], 7);
  if (C.types.includes('물') || C.types.includes('얼음'))
    add('함성', `냉각 ${nm}`, `물·얼음 타입 → 쓰러뜨리면 「냉각」`, [[L('【함성】【탈진】', '', 'statusself', { cond2: '냉각' })]], 6);
  if (C.types.includes('전기'))
    add('함성', `충전 ${nm}`, `전기 타입 → 쓰러뜨리면 「충전」`, [[L('【함성】【탈진】', '', 'statusself', { cond2: '충전' })]], 6);
  if (aceRole || spdRole)
    add(
      '함성',
      `가속 함성`,
      `${aceRole ? '에이스' : '러너'} → 쓰러뜨렸을 때 스피드 +1`,
      [
        [L('【함성】', '', 'rank', { st: '스피드', n: '1' })],
        [L('【1/시】【함성】', '', 'rank', { st: '스피드', n: '1' })],
        [L('【1/시】【함성】', '「HP : 1/4 이하」일 때 ', 'rank', { st: '스피드', n: '1' })],
        [L('【함성】', '', 'mult', { st: '스피드', mul: '1.33', dur: '2턴 동안 ' })]
      ],
      6
    );
  if (frail || atkRole)
    add(
      '함성',
      `기세의 ${nm}`,
      `쓰러뜨리면 ${upSt} +1`,
      [
        [L('【함성】', '', 'rank', { st: upSt, n: '1' })],
        [L('【1/시】【함성】', '', 'rank', { st: upSt, n: '1' })],
        [L('【1/시】【함성】', '「HP : 1/4 이하」일 때 ', 'rank', { st: upSt, n: '1' })],
        [L('【함성】', '', 'mult', { st: upSt, mul: '1.33', dur: '2턴 동안 ' })]
      ],
      5
    );
  if (hz) add('함성', `${hz} 개선`, `「${t1}」 계열 → 쓰러뜨리면 1번 「${hz}」 설치`, [[L('【1/시】【함성】', '', 'hazard', { hz })]], 5);
  if (supRole) add('함성', `개선의 ${nm}`, `서포터 → 쓰러뜨리면 아군 전체 치유`, [[L('【함성】', '', 'cureally')]], 5);
  /* 4. 지연 */
  if (C.eggs.includes('비행') || C.types.includes('비행'))
    add(
      '지연',
      `선회 ${nm}`,
      `비행 계열 → 2턴째부터 턴 종료 후 교대 (링크형)`,
      [[L('【1/시】【지연 (2턴)】', '', 'switchend')], [L('【1/시】【지연 (3턴)】', '', 'switchend')]],
      7
    );
  if (bulky || defRole)
    add(
      '지연',
      `농성의 ${nm}`,
      `오래 버티는 종족치 → 2턴째부터 턴 종료 시 1/16 회복`,
      [[L('【지연 (2턴)】', '턴 종료 시 ', 'heal', { fr: '1/16' })]],
      6
    );
  if (slow)
    add(
      '지연',
      `예열의 ${nm}`,
      `느린 종족치 → 3턴째에 ${upSt} +1 (중검형)`,
      [
        [L('【지연 (3턴)】', '', 'rank', { st: upSt, n: '1' })],
        [L('【지연 (3턴)】', '「HP : 1/2 이하」일 때 ', 'rank', { st: upSt, n: '1' })],
        [L('【1/시】【지연 (3턴)】', '「HP : 1/2 이하」일 때 ', 'rank', { st: upSt, n: '1' })]
      ],
      6
    );
  if (wt)
    add(
      '지연',
      `${wt} 부르기`,
      `「${t1}」 계열 → 2턴째에 「날씨 : ${wt}」 전개 (1번 · 2턴)`,
      [
        [L('【지연 (2턴)】【보급】', '「날씨」가 없을 때 ', 'weather', { wt, dur: '2턴 동안 ' })],
        [L('【1/시】【지연 (2턴)】', '「날씨」가 없을 때 ', 'weather', { wt, dur: '턴 종료 시까지 ' })]
      ],
      5
    );
  /* 5. 교대·바운스 */
  if (defRole || bulky)
    add(
      '교대·바운스',
      `바운스 ${nm}`,
      `공격을 받아낸 뒤 임의 교대 (바운스형)`,
      [
        [L('【1/시】【수세】', '상대의 공격을 받았을 때 ', 'switch')],
        [L('【1/시】【수세】', '「HP : 1/2 이하」일 때 상대의 공격을 받았을 때 ', 'switch')]
      ],
      defRole ? 8 : 5
    );
  if (sig && (atkRole || spdRole || noRole))
    add(
      '교대·바운스',
      `${sig.n} 유턴`,
      `「${sig.n}」에 유턴 효과 → 치고 빠지기 (게릴라형)`,
      [
        [L(ONE, '', 'uturn', { mv: sig.n })],
        [L(ONE, '「HP : 1/2 이하」일 때 ', 'uturn', { mv: sig.n })],
        [L(ONE, '「HP : 1/4 이하」일 때 ', 'uturn', { mv: sig.n })]
      ],
      7
    );
  if (sig)
    add(
      '교대·바운스',
      `${sig.n} 추격`,
      `상대의 교대를 노린다 → 「${sig.n}」에 따라가때리기 (카운터형)`,
      [
        [L(ONE, '', 'pursuit', { mv: sig.n })],
        [L(ONE, '「HP : 1/2 이하」일 때 ', 'pursuit', { mv: sig.n })],
        [L(ONE, '「HP : 1/4 이하」일 때 ', 'pursuit', { mv: sig.n })]
      ],
      atkRole ? 7 : 5
    );
  if (spdRole || fast)
    add('교대·바운스', `이탈의 ${nm}`, `빠름 → 상대가 교대했을 때 턴 종료 후 교대`, [[L('【1/시】', '상대가 교대했을 때 ', 'switchend')]], 5);
  if (C.types.includes('에스퍼') || C.types.includes('고스트'))
    add(
      '교대·바운스',
      `전이의 ${nm}`,
      `${C.types.includes('에스퍼') ? '에스퍼' : '고스트'} 타입 → 등장한 턴 종료 후 교대 (링크형)`,
      [[L('【1/시】【등장】', '', 'switchend')]],
      6
    );
  /* 6. 날씨·필드 */
  if (wt) {
    add(
      '날씨·필드',
      `${wt} 적응`,
      `${abWt ? `특성 「${C.ability}」` : `「${t1}」 타입`} → 「날씨 : ${wt}」일 때 턴 종료 시 회복`,
      [[L('', `「날씨 : ${wt}」일 때 턴 종료 시 `, 'heal', { fr: '1/8' })], [L('', `「날씨 : ${wt}」일 때 턴 종료 시 `, 'heal', { fr: '1/16' })]],
      abWt ? 9 : 6
    );
    add(
      '날씨·필드',
      `${wt} 개막`,
      `등장하면 1번 「날씨 : ${wt}」 전개 (2턴 · 특성 없이도 날씨 파티)`,
      [
        [L('【1/시】【자동】【등장 (죽어내밀기)】', '「날씨」가 없을 때 ', 'weather', { wt, dur: '2턴 동안 ' })],
        [L('【1/시】【자동】【등장 (죽어내밀기)】', '「날씨」가 없을 때 ', 'weather', { wt, dur: '턴 종료 시까지 ' })]
      ],
      abWt ? 7 : 5
    );
    if (atkRole || aceRole)
      add('날씨·필드', `${wt} 질주`, `「날씨 : ${wt}」일 때 다음 기술 급소 C+1`, [[L('', `「날씨 : ${wt}」일 때 `, 'nextcrit', { n: '1' })]], 5);
  }
  if (fd) {
    add(
      '날씨·필드',
      `${fd} 적응`,
      `${abFd ? `특성 「${C.ability}」` : `「${t1}」 타입`} → 「필드 : ${fd}」일 때 상태 이상 면역`,
      [[L('', `「필드 : ${fd}」일 때 `, 'immuneall')], [L('', `「필드 : ${fd}」일 때 `, 'immune', { cond: cm })]],
      abFd ? 8 : 5
    );
    add(
      '날씨·필드',
      `${fd} 개막`,
      `등장하면 1번 「필드 : ${fd}」 전개 (2턴)`,
      [
        [L('【1/시】【자동】【등장 (죽어내밀기)】', '', 'field', { fd, dur: '2턴 동안 ' })],
        [L('【1/시】【자동】【등장 (죽어내밀기)】', '', 'field', { fd, dur: '턴 종료 시까지 ' })]
      ],
      abFd ? 7 : 5
    );
  }
  if (slow)
    add('날씨·필드', `트릭룸 적응`, `느린 종족치 → 「룸 : 트릭룸」일 때 급소 C+1`, [[L('', '「룸 : 트릭룸」일 때 ', 'nextcrit', { n: '1' })]], 6);
  if (C.types.includes('비행') || C.abilEff.includes('부유'))
    add(
      '날씨·필드',
      `난기류 타기`,
      `비행 계열 → 「날씨 : 난기류」일 때 스피드 강화`,
      [
        [L('', '「날씨 : 난기류」일 때 ', 'mult', { st: '스피드', mul: '1.5' })],
        [L('', '「날씨 : 난기류」일 때 ', 'mult', { st: '스피드', mul: '1.2' })]
      ],
      5
    );
  /* 7. 상태 이상 연계 */
  if (sig && cm)
    add(
      '상태 이상 연계',
      `${stabTy}의 여운`,
      `「${stabTy}」 기술 명중 시 2턴 동안 「${cm}」 (익스펜션형 · DB와 같은 지속)`,
      [
        [L('', '', 'status', { ty: stabTy, pr: '저확률로', cond: cm, dur: '2턴 동안 ' })],
        [L('', '', 'status', { ty: stabTy, pr: '드물게', cond: cm, dur: '2턴 동안 ' })]
      ],
      6
    );
  if (defRole || bulky)
    add(
      '상태 이상 연계',
      `가시의 ${nm}`,
      `접촉기를 받으면 2턴 동안 「${cm}」`,
      [
        [L('【방호】', '', 'statusc', { pr: '저확률로', cond: cm, dur: '2턴 동안 ' })],
        [L('【방호】', '', 'statusc', { pr: '드물게', cond: cm, dur: '2턴 동안 ' })]
      ],
      defRole ? 8 : 5
    );
  if (atkRole || aceRole || noRole)
    add(
      '상태 이상 연계',
      `근성의 ${nm}`,
      `자신이 상태 이상일 때 ${atkSt} 강화 (근성형)`,
      [
        [L('', '상태 이상일 때 ', 'mult', { st: atkSt, mul: '1.5' })],
        [L('', '상태 이상일 때 ', 'mult', { st: atkSt, mul: '1.33' })],
        [L('', '상태 이상일 때 ', 'mult', { st: atkSt, mul: '1.2' })]
      ],
      6
    );
  if (abSt || atkRole)
    add(
      '상태 이상 연계',
      `${abSt || '병자'} 사냥`,
      `${abSt ? `특성 「${C.ability}」 연계 → ` : ''}정면이 상태 이상일 때 급소 C+1`,
      [[L('', '「정면」이 상태 이상일 때 ', 'nextcrit', { n: '1' })]],
      abSt ? 8 : 5
    );
  if (sig && (supRole || spdRole))
    add(
      '상태 이상 연계',
      `${sig.n} 필중`,
      `정면이 상태 이상이면 「${sig.n}」 필중`,
      [[L('', '「정면」이 상태 이상일 때 ', 'surem', { mv: sig.n })]],
      5
    );
  if (supRole)
    add(
      '상태 이상 연계',
      `정화의 ${nm}`,
      `아군 전체 치유 · 조건을 세게 (1/시 + HP 1/2 이하)`,
      [
        [L('【1/시】', '「HP : 1/2 이하」일 때 자신이 「변화기」를 내보냈을 때 ', 'cureally')],
        [L('【1/시】【자동】', '「HP : 1/4 이하」일 때 ', 'cureally')]
      ],
      7
    );
  if (C.types.includes('독') || C.types.includes('강철'))
    add('상태 이상 연계', `내독의 ${nm}`, `독·강철 → 「독」「맹독」 면역`, [[L('', '', 'immune', { cond: '독' })]], 4);
  /* 8. HP 조건 */
  if (bulky || defRole)
    add(
      'HP 조건',
      `만전의 ${nm}`,
      `「HP : 가득」일 때 급소에 맞지 않도록 (멀티스케일 변형)`,
      [[L('【방호】', '「HP : 가득」일 때 ', 'critg', { n: '2' })]],
      6
    );
  add(
    'HP 조건',
    `궁지의 ${nm}`,
    `「HP : 1/4 이하」일 때 ${upSt} +1 (맹화형)`,
    [
      [L('【1/시】【자동】', '「HP : 1/4 이하」일 때 ', 'rank', { st: upSt, n: '1' })],
      [L('【1/시】【자동】【탈진】', '「HP : 1/4 이하」일 때 ', 'rank', { st: upSt, n: '1' })],
      [L('【1/시】【자동】', '「HP : 1」일 때 ', 'rank', { st: upSt, n: '1' })]
    ],
    atkRole ? 7 : 5
  );
  if (spdRole || supRole || noRole)
    add('HP 조건', `위기 탈출`, `「HP : 1/4 이하」가 되면 턴 종료 후 교대`, [[L('【1/시】【자동】', '「HP : 1/4 이하」일 때 ', 'switchend')]], 6);
  if (bulky)
    add(
      'HP 조건',
      `끈기의 ${nm}`,
      `「HP : 1/2 이하」일 때 턴 종료 시 회복`,
      [[L('', '「HP : 1/2 이하」일 때 턴 종료 시 ', 'heal', { fr: '1/8' })], [L('', '「HP : 1/2 이하」일 때 턴 종료 시 ', 'heal', { fr: '1/16' })]],
      5
    );
  if (atkRole || aceRole)
    add('HP 조건', `사력의 ${nm}`, `「HP : 1」일 때 추가 행동 (1번)`, [[L('【1/시】【자동】', '「HP : 1」일 때 ', 'extra')]], 5);
  if (sig)
    add(
      'HP 조건',
      `대가의 ${nm}`,
      `HP 1/4를 내고 「${sig.n}」 급소 C+2 (하이리스크)`,
      [[L(ONE, '', 'cost', { fr: '1/4' }), L('', '', 'critm', { mv: sig.n, n: '2' })]],
      atkRole ? 5 : 3
    );
  /* 9. 급소·명중 */
  if (fast && (atkRole || aceRole || noRole))
    add(
      '급소·명중',
      `쾌속 ${nm}`,
      `스피드 ${C.g[5]} → 먼저 행동했을 때 급소 C+1`,
      [[L('', '상대보다 먼저 행동했을 때 ', 'nextcrit', { n: '1' })]],
      7
    );
  if (slow && sig)
    add(
      '급소·명중',
      `후의 선`,
      `느린 종족치 → 늦게 행동했을 때 「${sig.n}」 필중`,
      [[L('', '상대보다 늦게 행동했을 때 ', 'surem', { mv: sig.n })]],
      6
    );
  if (sig && stMove)
    add(
      '급소·명중',
      `${stMove.n} 조준`,
      `변화기 「${stMove.n}」 다음 턴 「${sig.n}」 급소 C+1 (예열형)`,
      [[L('【1/시】【자동】', '자신이 「변화기」를 내보냈을 때 ', 'critm', { mv: sig.n, n: '1' })]],
      6
    );
  if (sig && /킬러|어쌔신/.test(R))
    add('급소·명중', `${sig.n} 예리`, `킬러 계열 → 「${sig.n}」 급소 C+1 (예리형)`, [[L('', '', 'critm', { mv: sig.n, n: '1' })]], 8);
  if (sig && sig.r && +sig.r[8] && +sig.r[8] < 100)
    add('급소·명중', `${sig.n} 보정`, `명중 ${sig.r[8]}의 「${sig.n}」 → 1/시 필중 (사전 예고)`, [[L(ONE, '', 'surem', { mv: sig.n })]], 7);
  if (aceRole)
    add(
      '급소·명중',
      `각성의 ${nm}`,
      `에이스 → 빈사 아군이 있을 때 급소 C+1`,
      [[L('', '「빈사」 상태인 아군이 있을 때 ', 'nextcrit', { n: '1' })]],
      7
    );
  /* 10. 행동 순서 (우선도는 강한 효과라 조건을 세게) */
  if (sig && slow && sig.prio <= 0)
    add(
      '행동 순서',
      `${sig.n} 선제`,
      `느린 종족치 → 「${sig.n}」 우선도 +1 · 우선도는 강해서 HP 1/4 이하 + 1/시`,
      [[L(ONE, '「HP : 1/4 이하」일 때 ', 'prio', { mv: sig.n, n: '1' })], [L(ONE, '「HP : 1」일 때 ', 'prio', { mv: sig.n, n: '1' })]],
      7
    );
  if (prioMove && fast)
    add(
      '행동 순서',
      `${prioMove.n} 가속`,
      `선공기 「${prioMove.n}」 → 먼저 행동했을 때 스피드 +1 (1번)`,
      [
        [L('【1/시】【자동】', '「HP : 1/2 이하」일 때 상대보다 먼저 행동했을 때 ', 'rank', { st: '스피드', n: '1' })],
        [L('【1/시】【자동】', '「HP : 1/4 이하」일 때 상대보다 먼저 행동했을 때 ', 'rank', { st: '스피드', n: '1' })]
      ],
      5
    );
  if (stMove && (supRole || spdRole))
    add(
      '행동 순서',
      `${stMove.n} 속공`,
      `변화기 「${stMove.n}」 우선도 +1 · 1/시 + 사전 예고 + HP 1/2 이하`,
      [[L(ONE, '「HP : 1/2 이하」일 때 ', 'prio', { mv: stMove.n, n: '1' })], [L(ONE, '「HP : 1/4 이하」일 때 ', 'prio', { mv: stMove.n, n: '1' })]],
      6
    );
  if (slow && (defRole || bulky))
    add(
      '행동 순서',
      `후수의 ${nm}`,
      `늦게 행동했을 때 ${defSt} +1 (1번)`,
      [
        [L('【1/시】【자동】', '「HP : 1/2 이하」일 때 상대보다 늦게 행동했을 때 ', 'rank', { st: defSt, n: '1' })],
        [L('【1/시】【자동】', '「HP : 1/4 이하」일 때 상대보다 늦게 행동했을 때 ', 'rank', { st: defSt, n: '1' })]
      ],
      5
    );
  /* 11. 기술 보조 */
  if (sig && sig.rng === '1체' && (st.atk >= 13 || st.spa >= 13) && (atkRole || noRole))
    add(
      '기술 보조',
      `${sig.n} 확산`,
      `고화력 단일기 → 1/시 「상대 2체」 (광역확산형)`,
      [[L(ONE, '', 'range', { mv: sig.n })], [L(ONE, '「HP : 1/2 이하」일 때 ', 'range', { mv: sig.n })]],
      6
    );
  if (sig && sig.pow >= 110)
    add('기술 보조', `${sig.n} 안정`, `위력 ${sig.pow} → 반동·연속 제한 1/시 무시`, [[L(ONE, '', 'norecoil', { mv: sig.n })]], 6);
  if (sig && (atkRole || aceRole))
    add(
      '기술 보조',
      `${sig.n} 관통`,
      jo(
        excl
          ? `「${sig.n}」이(가) 상대의 「방어」 등을 1/시 관통 (전용 · 밸류 5)`
          : `「${sig.n}」이(가) 「방어」 상태를 무시하되 대미지 1/4배 (보이지않는주먹형)`
      ),
      [[L(ONE, '', 'pierce', { mv: sig.n })], [L(ONE, '', 'piercew', { mv: sig.n })], [L(ONE, '「HP : 1/2 이하」일 때 ', 'piercew', { mv: sig.n })]],
      5
    );
  if (touchMove && defRole)
    add(
      '기술 보조',
      `${touchMove.n} 응수`,
      `접촉기를 받았을 때 「${touchMove.n}」 급소 C+1`,
      [[L('【1/시】【자동】', '「접촉기」를 받았을 때 ', 'critm', { mv: touchMove.n, n: '1' })]],
      5
    );
  /* 12. 설치·장벽 (설치기·장벽은 강해서 조건을 세게) */
  if (hz)
    add(
      '설치·장벽',
      `${hz} 설치`,
      `「${stabTy}」 기술 명중 시 1번 「${hz}」 · HP 1/2 이하 조건`,
      [
        [L('【1/시】【자동】', `「HP : 1/2 이하」일 때 자신의 「${stabTy}」 기술이 명중했을 때 `, 'hazard', { hz })],
        [L('【1/시】【자동】', `「HP : 1/4 이하」일 때 자신의 「${stabTy}」 기술이 명중했을 때 `, 'hazard', { hz })]
      ],
      6
    );
  if (supRole)
    add(
      '설치·장벽',
      `${C.types.includes('얼음') ? '오로라베일' : defSt === '방어' ? '리플렉터' : '빛의장막'} 전개`,
      `서포터 → 빈사로 쓰러질 때 1번 장벽 (2턴)`,
      [
        [
          L('【1/시】【퇴장 (빈사)】', '', 'wall', {
            wl: C.types.includes('얼음') ? '오로라베일' : defSt === '방어' ? '리플렉터' : '빛의장막',
            dur: '2턴 동안 '
          })
        ],
        [
          L('【1/시】【퇴장 (빈사)】', '', 'wall', {
            wl: C.types.includes('얼음') ? '오로라베일' : defSt === '방어' ? '리플렉터' : '빛의장막',
            dur: '턴 종료 시까지 '
          })
        ]
      ],
      7
    );
  if (spdRole || fast)
    add('설치·장벽', `소닉 스니커`, `빠름 → 상대보다 스피드가 높을 때 설치물 무시`, [[L('', '상대보다 「스피드」가 높을 때 ', 'nohazard')]], 5);
  if (supRole || spdRole)
    add(
      '설치·장벽',
      `청소의 ${nm}`,
      `죽어내밀기로 나오면 자진의 설치기 제거 (1번)`,
      [[L('【1/시】【자동】【등장 (죽어내밀기)】', '', 'clearobj')]],
      5
    );
  /* 13. 동조·역할 */
  if (R && !noRole) {
    const rl = C.roles[0].replace(/[『』]/g, '');
    add(
      '동조·역할',
      `${rl} 견제`,
      jo(`적진에 같은 『${rl}』이(가) 있을 때 ${upSt} +1 (동조 · 1번)`),
      [
        [L('【1/시】【자동】【동조】', '', 'rank', { st: upSt, n: '1' })],
        [L('【1/시】【자동】【동조】', '「HP : 1/2 이하」일 때 ', 'rank', { st: upSt, n: '1' })],
        [L('【1/시】【자동】【동조】', '「HP : 1/4 이하」일 때 ', 'rank', { st: upSt, n: '1' })]
      ],
      5
    );
    add(
      '동조·역할',
      `${rl} 연대`,
      jo(`아군 같은 『${rl}』과(와) 함께일 때 급소 C+1 (동조 아군)`),
      [[L('【동조 (아군)】', '', 'nextcrit', { n: '1' })]],
      4
    );
  }
  if (!aceRole && (atkRole || noRole))
    add(
      '동조·역할',
      `${nm}의 사명`,
      `빈사 아군이 있을 때 이 포텐셜을 『에이스』로 취급`,
      [[L('', '「빈사」 상태인 아군이 있을 때 ', 'role', { rl: '에이스' })]],
      4
    );
  /* 14. 소지품 */
  add(
    '소지품',
    `열매 애호가`,
    `나무열매를 소모했을 때 ${upSt} +1 (안 되면 추가 회복)`,
    [
      [L('【1/시】【자동】', '「소지품 : 나무열매」를 소모했을 때 ', 'rank', { st: upSt, n: '1' })],
      [L('【1/시】【자동】', '「HP : 1/4 이하」일 때 「소지품 : 나무열매」를 소모했을 때 ', 'rank', { st: upSt, n: '1' })],
      [L('', '「소지품 : 나무열매」를 소모했을 때 ', 'heal', { fr: '1/8' })]
    ],
    4
  );
  if (spdRole || frail)
    add(
      '소지품',
      `맨몸의 ${nm}`,
      `소지품이 없을 때 스피드 강화 (곡예형)`,
      [[L('', '「소지품 : -」일 때 ', 'mult', { st: '스피드', mul: '1.5' })], [L('', '「소지품 : -」일 때 ', 'mult', { st: '스피드', mul: '1.2' })]],
      5
    );
  if (C.item) add('소지품', `${C.item} 사수`, `「${C.item}」 소지 → 빼앗기거나 파괴되지 않음`, [[L('', '', 'itemkeep')]], 4);
  /* 15. 비자속 강화 (위력 계열 중 유일하게 허용 · 예산의 기준점) */
  if (offType)
    add(
      '비자속 강화',
      `델타 포스 : ${offType}`,
      `자속이 아닌 「${offType}」 기술 보유 → 타입 비일치 강화 (DB의 「델타 포스」와 같은 밸류, 예산 기준점)`,
      [[L('', '', 'nonstabt', { ty: offType, mul: '1.5' })]],
      atkRole ? 8 : 6
    );
  if (offTypes.length >= 2)
    add(
      '비자속 강화',
      `만능의 ${nm}`,
      `비자속 기술 ${offTypes.length}종 → 타입 비일치 전체 1.3배 (탈진)`,
      [[L('【탈진】', '', 'nonstab', { mul: '1.3' })]],
      5
    );
  /* 16. 종족·올드 */
  if (C.old) add('종족·올드', `옛것의 ${nm}`, `『올드 타입』 → 능력 감소 무시`, [[L('', '', 'nodrop')]], 7);
  if (st.hp <= 8)
    add(
      '종족·올드',
      `거체의 ${nm}`,
      `HP ${C.g[0]} → 「HP」 종족치 1랭크 상승 (거체형 · 예시 포텐셜과 같은 밸류)`,
      [[L('', '', 'basest', { st: 'HP' })]],
      5
    );
  if (C.eggs.includes('부정형') || C.types.includes('고스트'))
    add('종족·올드', `무형의 ${nm}`, `부정형·고스트 → 「마비」 면역`, [[L('', '', 'immune', { cond: '마비' })]], 4);
  if (C.eggs.some(e => /^수중/.test(e)))
    add(
      '종족·올드',
      `물가의 ${nm}`,
      `수중 알그룹 → 「날씨 : 비」일 때 턴 종료 시 회복`,
      [[L('', '「날씨 : 비」일 때 턴 종료 시 ', 'heal', { fr: '1/16' })]],
      4
    );
  /* 17. 상태 변화 (지속 시간으로 밸류 조절 · 턴 종료 시까지 ×0.5, 2턴 ×0.7, 3턴 ×0.8, 무제한 ×1) */
  const st2 = C.types.includes('불꽃')
    ? '가열'
    : C.types.includes('물') || C.types.includes('얼음')
      ? '냉각'
      : C.types.includes('전기')
        ? '충전'
        : C.types.includes('격투') || C.types.includes('에스퍼')
          ? '집중'
          : '';
  if (st2) {
    add(
      '상태 변화',
      `${st2} 등장`,
      `「${t1}」 계열 → 등장한 턴만 「${st2}」`,
      [[L('【등장】', '', 'statusself', { cond2: st2, dur: '턴 종료 시까지 ' })]],
      6
    );
    add(
      '상태 변화',
      `${st2} 예열`,
      `2턴째부터 2턴 동안 「${st2}」 (지연형)`,
      [
        [L('【지연 (2턴)】', '', 'statusself', { cond2: st2, dur: '2턴 동안 ' })],
        [L('【1/시】【지연 (2턴)】', '', 'statusself', { cond2: st2, dur: '3턴 동안 ' })]
      ],
      6
    );
    add(
      '상태 변화',
      `${st2} 궁지`,
      `「HP : 1/2 이하」가 되면 3턴 동안 「${st2}」 (1번)`,
      [
        [L('【1/시】【자동】', '「HP : 1/2 이하」일 때 ', 'statusself', { cond2: st2, dur: '3턴 동안 ' })],
        [L('【1/시】【자동】', '「HP : 1/2 이하」일 때 ', 'statusself', { cond2: st2, dur: '' })]
      ],
      5
    );
  }
  if (C.types.includes('물'))
    add(
      '상태 변화',
      `아쿠아링 ${nm}`,
      `물 타입 → 「HP : 1/2 이하」일 때 「아쿠아링」 (1번)`,
      [[L('【1/시】【자동】', '「HP : 1/2 이하」일 때 ', 'statusself', { cond2: '아쿠아링', dur: '' })]],
      5
    );
  if (C.types.includes('풀'))
    add(
      '상태 변화',
      `뿌리박기 ${nm}`,
      `풀 타입 → 늦게 행동했을 때 「뿌리박기」 (1번)`,
      [
        [L('【1/시】【자동】', '상대보다 늦게 행동했을 때 ', 'statusself', { cond2: '뿌리박기', dur: '' })],
        [L('【1/시】【자동】', '「HP : 1/2 이하」일 때 ', 'statusself', { cond2: '뿌리박기', dur: '' })]
      ],
      5
    );
  if (C.types.includes('노말') || C.types.includes('고스트') || spdRole)
    add(
      '상태 변화',
      `대타 ${nm}`,
      `죽어내밀기로 나온 턴 「대타출동」 (1번)`,
      [
        [L('【1/시】【자동】【등장 (죽어내밀기)】', '', 'statusself', { cond2: '대타출동', dur: '턴 종료 시까지 ' })],
        [L('【1/시】【자동】【등장 (죽어내밀기)】', '「HP : 가득」일 때 ', 'statusself', { cond2: '대타출동', dur: '턴 종료 시까지 ' })]
      ],
      5
    );
  if (C.types.includes('고스트'))
    add(
      '상태 변화',
      `길동무 ${nm}`,
      `고스트 → 「HP : 1/4 이하」일 때 턴 종료 시까지 「길동무」`,
      [[L('【1/시】【자동】', '「HP : 1/4 이하」일 때 ', 'statusself', { cond2: '길동무', dur: '턴 종료 시까지 ' })]],
      5
    );
  if (supRole || /디스럽터/.test(R)) {
    add(
      '상태 변화',
      `봉인의 ${nm}`,
      `방해형 → 정면을 2턴 동안 「회복봉인」 (사전 예고)`,
      [[L(ONE, '', 'statusd', { cond2: '회복봉인', dur: '2턴 동안 ' })], [L(ONE, '', 'statusd', { cond2: '회복봉인', dur: '턴 종료 시까지 ' })]],
      6
    );
    add(
      '상태 변화',
      `도발의 ${nm}`,
      `방해형 → 상대가 변화기를 내보냈을 때 2턴 동안 「도발」`,
      [[L('【1/시】【자동】', '상대가 「변화기」를 내보냈을 때 ', 'statusd', { cond2: '도발', dur: '2턴 동안 ' })]],
      5
    );
  }
  if (supRole)
    add(
      '상태 변화',
      `집중 전달`,
      `교대로 물러날 때 아군을 턴 종료 시까지 「집중」`,
      [
        [L('【퇴장 (통상 교대)】', '', 'statusally', { cond2: '집중', dur: '턴 종료 시까지 ' })],
        [L('【1/시】【퇴장 (통상 교대)】', '', 'statusally', { cond2: '집중', dur: '턴 종료 시까지 ' })]
      ],
      5
    );
  /* 18. 특성 변화 */
  const WT_AB = { 맑음: '엽록소', 비: '쓱쓱', 모래바람: '모래헤치기', 눈: '눈치우기' };
  const TY_AB = {
    불꽃: '불꽃몸',
    전기: '정전기',
    독: '독가시',
    풀: '포자',
    물: '쓱쓱',
    얼음: '눈치우기',
    바위: '모래헤치기',
    땅: '모래헤치기',
    강철: '하드록',
    노말: '재생력',
    격투: '철주먹',
    에스퍼: '매직가드',
    비행: '가속',
    고스트: '프레셔',
    악: '틀깨기',
    드래곤: '틀깨기',
    페어리: '불면',
    벌레: '탈피'
  };
  const wab = wt && WT_AB[wt];
  if (wab && C.ability !== wab && idx.abil.get(wab))
    add(
      '특성 변화',
      `${wt}의 ${wab}`,
      `「날씨 : ${wt}」일 때만 특성이 「${wab}」로 (날씨 파티 연계)`,
      [
        [L('', `「날씨 : ${wt}」일 때 `, 'abilself', { abn: wab, dur: '' })],
        [L('【1/시】【자동】', `「날씨 : ${wt}」일 때 `, 'abilself', { abn: wab, dur: '3턴 동안 ' })]
      ],
      7
    );
  const tab = TY_AB[t1] || TY_AB[t2];
  if (tab && C.ability !== tab && idx.abil.get(tab))
    add(
      '특성 변화',
      `${tab} 각성`,
      `「${t1}」 계열 → 「HP : 1/2 이하」일 때 2턴 동안 특성이 「${tab}」로 (1번)`,
      [
        [L('【1/시】【자동】', '「HP : 1/2 이하」일 때 ', 'abilself', { abn: tab, dur: '2턴 동안 ' })],
        [L('【1/시】【자동】', '「HP : 1/4 이하」일 때 ', 'abilself', { abn: tab, dur: '2턴 동안 ' })]
      ],
      6
    );
  if (atkRole || /디스럽터/.test(R)) {
    add(
      '특성 변화',
      `특성 봉쇄`,
      `정면의 특성을 턴 종료 시까지 무효 (사전 예고)`,
      [[L(ONE, '', 'abilnull', { dur: '턴 종료 시까지 ' })], [L(ONE, '「HP : 1/2 이하」일 때 ', 'abilnull', { dur: '턴 종료 시까지 ' })]],
      6
    );
    add(
      '특성 변화',
      `무기력 부여`,
      `정면을 2턴 동안 「특성 : 무기력」으로 (HP 1/2 이하 시 공/특공 반감)`,
      [
        [L(ONE, '', 'abild', { abn: '무기력', dur: '2턴 동안 ' })],
        [L(ONE, '「HP : 1/2 이하」일 때 ', 'abild', { abn: '무기력', dur: '2턴 동안 ' })],
        [L(ONE, '「HP : 1/2 이하」일 때 ', 'abild', { abn: '무기력', dur: '턴 종료 시까지 ' })]
      ],
      5
    );
  }
  if (supRole || noRole || C.types.includes('에스퍼') || C.types.includes('고스트'))
    add(
      '특성 변화',
      `모방의 ${nm}`,
      `죽어내밀기로 나오면 3턴 동안 정면의 특성을 복사 (1번)`,
      [
        [L('【1/시】【자동】【등장 (죽어내밀기)】', '', 'abilcopy', { dur: '3턴 동안 ' })],
        [L('【1/시】【자동】【등장 (죽어내밀기)】', '', 'abilcopy', { dur: '2턴 동안 ' })]
      ],
      5
    );
  if (bulky)
    add(
      '특성 변화',
      `재생의 ${nm}`,
      `단단함 → 「HP : 1/4 이하」일 때 「특성 : 재생력」으로 (1번)`,
      [[L('【1/시】【자동】', '「HP : 1/4 이하」일 때 ', 'abilself', { abn: '재생력', dur: '' })]],
      4
    );
  /* 파티 겹침 검사 */
  for (const o of out) {
    const tg = prTags(o.txt),
      ek = prEffKeys(o.txt);
    o.warn = [];
    for (const q of C.otherPots) {
      const ot = prTags(q.eff);
      const shared = tg.filter(x => ot.includes(x) && !/방호|수세|공세|유일|탈진|보급|N\/시|1\/시|자동|사전|선행/.test(x));
      if (shared.length) o.warn.push(`${q.who}의 「${q.n}」과 트리거 겹침`);
      const same = [...ek].filter(x => prEffKeys(q.eff).has(x));
      if (same.length >= 2) o.warn.push(`${q.who}의 「${q.n}」과 효과 겹침`);
    }
    for (const q of C.otherPots) if (q.n === o.title) o.warn.push('같은 이름이 파티에 있음');
  }
  const groups = [];
  for (const f of PR_FAM) {
    const items = out
      .filter(o => o.fam === f)
      .sort((a, b) => b.score - a.score)
      .slice(0, 3);
    if (items.length) groups.push({ fam: f, items });
  }
  return groups;
}
function openPotRecommend(t, p, onPick, excl) {
  const C = prCtx(t, p);
  const groups = prGenerate(C, excl);
  const flat = groups.flatMap(g => g.items);
  const budget = excl ? PR_BUDGET.excl : PR_BUDGET.race;
  const l = openModal(
    `<div class="mhead"><h2>포텐셜 추천 · ${esc(C.name)}</h2><span class="sp"></span><button class="btn ghost" data-x>닫기</button></div>
 <div class="mbody">${prCtxHTML(C)}<p class="small faint" style="margin:0 0 8px">DB를 뒤지지 않고 타입·기술·종족치·역할·특성·알그룹에서 계통별로 새 안을 짭니다. 모든 안은 <b>수지 검사</b>(효과값 − 조건값 ≤ 예산 ${budget})를 통과한 것만 보입니다. 기준점은 DB의 「델타 포스」(상시 비자속 1.5배 = 1.2)이고, 조건을 여러 개 섞으면 가장 센 것만 온전히 치고 나머지는 절반·1/4로만 쳐서, 능력치 상승·우선도·설치기·관통·풀죽음·가열·아군 전체 치유는 값을 높게 잡아 조건이 세지고, 전개·상태 변화·특성 변경은 지속 시간(턴 종료 시까지·2턴)으로 값을 깎습니다. 위력 강화·완화는 「타입 비일치 강화」만, ${excl ? '<b>전용 칸</b>이라 【선행】 입력을 씁니다.' : '종족 포텐셜은 【선행】 대신 【사전】 예고를 씁니다.'}</p>
 ${
   groups
     .map(
       g =>
         `<div class="small" style="margin:10px 0 4px;font-weight:600">${esc(g.fam)} <span class="faint">(${g.items.length})</span></div><div class="egrid">${g.items
           .map(x => {
             const i = flat.indexOf(x);
             return `<div tabindex="0" role="button" data-kbd class="pkr" data-gen="${i}"><div><div class="t1"><b>${esc(x.title)}</b> <span class="small faint">${prBalanceHTML(x.bal, budget)}</span></div><div class="t2">${rich(x.txt)}</div><div class="small" style="margin-top:4px"><span class="okc">${esc(x.why)}</span>${x.warn.map(w => ` <span class="warn">− ${esc(w)}</span>`).join('')}</div></div></div>`;
           })
           .join('')}</div>`
     )
     .join('') || '<div class="empty">기술·타입을 먼저 넣어 주세요. 재료가 있어야 안을 짭니다.</div>'
 }</div>
 <div class="mfoot"><button class="btn" data-build>빈 제작기 열기</button><span class="sp"></span><button class="btn pri" data-x>닫기</button></div>`,
    { wide: true }
  );
  l.addEventListener('click', e => {
    if (e.target.closest('[data-x]')) return closeModal();
    const g = e.target.closest('[data-gen]');
    if (g) {
      const x = flat[+g.dataset.gen];
      closeModal();
      openPotBuilder(t, p, onPick, excl, { name: x.title, lines: x.lines });
      return;
    }
    if (e.target.closest('[data-build]')) {
      closeModal();
      openPotBuilder(t, p, onPick, excl);
    }
  });
}
/* ===== 제작기 ===== */
function openPotBuilder(t, p, onPick, excl, preset) {
  const C = prCtx(t, p);
  const tyOpts = [
    ...C.types,
    ...[...C.mtypes].filter(x => !C.types.includes(x)),
    ...S.db.types.map(x => x[0]).filter(x => !C.types.includes(x) && !C.mtypes.has(x))
  ];
  const mvOpts = C.moves.map(m => m.n);
  const opt = (arr, sel) => arr.map(v => `<option ${v === sel ? 'selected' : ''}>${esc(v)}</option>`).join('');
  const grp = (groups, sel, blank) =>
    (blank ? `<option value="" ${!sel ? 'selected' : ''}>${esc(blank)}</option>` : '') +
    groups
      .map(
        g =>
          `<optgroup label="${esc(g[0])}">${g[1].map(x => `<option value="${esc(x[0])}" ${x[0] === sel ? 'selected' : ''}>${esc(x[1])}</option>`).join('')}</optgroup>`
      )
      .join('');
  const lines = preset && preset.lines ? clone(preset.lines) : [{ trig: '', cond: '', eff: 'boost', pr: {} }];
  const l = openModal(
    `<div class="mhead"><h2>포텐셜 제작 · ${esc(C.name)}</h2><span class="sp"></span><button class="btn ghost" data-x>닫기</button></div>
 <div class="mbody">${prCtxHTML(C)}
 <div class="fgrid" style="grid-template-columns:minmax(0,1fr) minmax(0,1.4fr)"><label class="lbl">종류(순서)<input data-kind value="${excl ? '전용' : '05. 속별'}" list="L-kinds2"></label><label class="lbl">이름<input data-name value="${esc((preset && preset.name) || '')}" placeholder="예: ${esc(C.name)}의 ○○"></label></div>
 <div data-lines></div>
 <div class="row" style="margin:6px 0"><button class="btn sm" data-addline>+ 효과 줄 추가 (①②…)</button><span class="small faint">복합 효과일 때만 줄을 나눕니다. 태그는 사전 순서로 자동 정리됩니다.</span></div>
 <div class="preview" data-prev></div><div class="small" data-chk></div></div>
 <div class="mfoot">${PR_HIDDEN ? '' : '<button class="btn" data-rec>← 추천으로</button>'}<span class="sp"></span><button class="btn" data-x>취소</button><button class="btn pri" data-use>편집기에 넣기</button></div>`,
    { wide: true }
  );
  const lineHTML = (ln, i) => {
    const E = PB_FLAT.find(e => e[0] === ln.eff);
    const need = E[3];
    const P = Object.assign({}, PB_DEF, { ty: tyOpts[0], mv: mvOpts[0] || '○' }, ln.pr);
    const f = k => {
      if (k === 'ty') return `<label class="lbl">타입<select data-f="ty" data-i="${i}">${opt(tyOpts, P.ty)}</select></label>`;
      if (k === 'mv')
        return `<label class="lbl">기술<input data-f="mv" data-i="${i}" list="L-mv${i}" value="${esc(P.mv)}"><datalist id="L-mv${i}">${opt(mvOpts)}</datalist></label>`;
      if (k === 'mul')
        return `<label class="lbl">배율<input data-f="mul" data-i="${i}" value="${esc(ln.pr.mul || (/guard|multd/.test(ln.eff) ? '0.85' : '1.2'))}" inputmode="decimal" style="width:70px"></label>`;
      if (k === 'cat')
        return `<label class="lbl">분류<select data-f="cat" data-i="${i}">${opt(['물리기', '특수기', '변화기', '전체기', '단일기', '접촉기', '선공기', '후공기'], P.cat)}</select></label>`;
      if (k === 'st')
        return `<label class="lbl">능력<select data-f="st" data-i="${i}">${opt(['공격', '방어', '특공', '특방', '스피드', '명중', '회피', '공격/특공', '방어/특방', '모든 능력'], P.st)}</select></label>`;
      if (k === 'n') return `<label class="lbl">N<input data-f="n" data-i="${i}" value="${esc(P.n)}" inputmode="numeric" style="width:56px"></label>`;
      if (k === 'pr') return `<label class="lbl">확률<select data-f="pr" data-i="${i}">${opt(PB_PR, P.pr)}</select></label>`;
      if (k === 'cond') return `<label class="lbl">상태 이상<select data-f="cond" data-i="${i}">${opt(PB_STATUS, P.cond)}</select></label>`;
      if (k === 'cond2') return `<label class="lbl">상태 변화<select data-f="cond2" data-i="${i}">${opt(PB_STATUS2, P.cond2)}</select></label>`;
      if (k === 'fr')
        return `<label class="lbl">비율<select data-f="fr" data-i="${i}">${opt(['1/16', '1/8', '1/6', '1/4', '1/3', '1/2', '모두'], P.fr)}</select></label>`;
      if (k === 'wt')
        return `<label class="lbl">날씨<select data-f="wt" data-i="${i}">${opt(['맑음', '비', '모래바람', '눈', '짙은안개', '밤', '별하늘', '큰가뭄', '폭우', '난기류', '극한', '깊은밤'], P.wt)}</select></label>`;
      if (k === 'fd')
        return `<label class="lbl">필드<select data-f="fd" data-i="${i}">${opt(['그래스필드', '일렉트릭필드', '미스트필드', '사이코필드'], P.fd)}</select></label>`;
      if (k === 'rm')
        return `<label class="lbl">룸<select data-f="rm" data-i="${i}">${opt(['트릭룸', '매직룸', '원더룸', '블랙룸'], P.rm)}</select></label>`;
      if (k === 'dur')
        return `<label class="lbl">지속<select data-f="dur" data-i="${i}">${PB_DUR.map(x => `<option value="${esc(x[0])}" ${x[0] === (ln.pr.dur || '') ? 'selected' : ''}>${esc(x[1])}</option>`).join('')}</select></label>`;
      if (k === 'abn')
        return `<label class="lbl">특성<input data-f="abn" data-i="${i}" list="L-abn" value="${esc(P.abn)}" placeholder="특성 이름"><datalist id="L-abn">${S.db.abil.map(r => `<option>${esc(r[1])}</option>`).join('')}</datalist></label>`;
      if (k === 'hz')
        return `<label class="lbl">설치기<select data-f="hz" data-i="${i}">${opt(['스텔스록', '압정뿌리기', '독압정', '끈적끈적네트'], P.hz)}</select></label>`;
      if (k === 'wl')
        return `<label class="lbl">장벽<select data-f="wl" data-i="${i}">${opt(['리플렉터', '빛의장막', '오로라베일', '신비의부적', '흰안개'], P.wl)}</select></label>`;
      if (k === 'rl')
        return `<label class="lbl">역할<select data-f="rl" data-i="${i}">${opt(['어태커', '블로커', '러너', '킬러', '어시스트', '에이스'], P.rl)}</select></label>`;
      if (k === 'txt')
        return `<label class="lbl" style="grid-column:1/-1">효과 문장<input data-f="txt" data-i="${i}" value="${esc(P.txt)}" placeholder="표기 문법대로 직접 적기"></label>`;
      return '';
    };
    return `<div class="panel" style="margin:6px 0;padding:8px"><div class="row small" style="margin-bottom:4px"><b>${lines.length > 1 ? '①②③④⑤'[i] : '효과'}</b><span class="sp"></span>${lines.length > 1 ? `<button class="btn sm ghost" data-del="${i}">✕</button>` : ''}</div>
   <div class="fgrid" style="grid-template-columns:repeat(auto-fit,minmax(150px,1fr))"><label class="lbl">트리거 태그<select data-f="trig" data-i="${i}">${grp(PB_TRIG, ln.trig, '(없음 · 상시)')}</select></label>
   <label class="lbl">조건<select data-f="cond0" data-i="${i}">${grp(PB_COND, ln.cond, '(없음)')}</select></label>
   <label class="lbl">효과<select data-f="eff" data-i="${i}">${grp(PB_EFF, ln.eff)}</select></label>${need.map(f).join('')}</div></div>`;
  };
  const build = () =>
    tagFix(
      prBuildText(lines.map(ln => ({ trig: ln.trig, cond: ln.cond, eff: ln.eff, pr: Object.assign({ ty: tyOpts[0], mv: mvOpts[0] || '○' }, ln.pr) })))
    );
  const checks = txt => {
    const out = [];
    const ek = prEffKeys(txt);
    const tg = prTags(txt);
    const h = banHits(txt);
    if (h.length) out.push(`<span class="warn">금지 키워드: ${h.map(esc).join(', ')}</span>`);
    tagLint(txt).forEach(x => out.push(`<span class="warn">${esc(x)}</span>`));
    const R = C.roles.join(',');
    if (ek.has('위력 강화') && R && !/어태커|어쌔신|킬러|퀄러|디스럽터|타이트엔드/.test(R))
      out.push(`<span class="warn">위력 강화는 어태커 계열의 영역입니다 (대원칙 3) · 현재 역할 ${esc(R)}</span>`);
    if ((ek.has('공격 상승') || ek.has('특공 상승') || ek.has('스피드 상승')) && R && /어태커/.test(R))
      out.push(`<span class="warn">능력 상승은 에이스·러너·블로커의 영역입니다 (대원칙 3)</span>`);
    const mulm = [...txt.matchAll(/강화\(([\d.]+)배\)/g)].map(m => +m[1]);
    if (mulm.some(v => v >= 1.5) && !tg.length && !/일 때|했을 때/.test(txt))
      out.push(`<span class="warn">조건 없이 1.5배 이상 강화는 「소켓 2」 이상 소지품에 필적합니다 (대원칙 5)</span>`);
    if (/전체기/.test(txt) && WIDE_C4.test(txt)) out.push(`<span class="warn">「전체기」는 「C : +4」 이상으로 만들 수 없습니다 (대원칙 7)</span>`);
    if (/모든 기술|자신의 기술이 급소|자신의 기술에 「우선도/.test(txt) && !/육성/.test(R))
      out.push(`<span class="warn">둘 이상의 기술에 동시에 적용되는 효과는 육성형이 아닌 한 삼갑니다 (대원칙 6)</span>`);
    for (const o of C.otherPots) {
      const ot = prTags(o.eff);
      const shared = tg.filter(x => ot.includes(x) && !/방호|수세|공세|유일|탈진|보급/.test(x));
      if (shared.length)
        out.push(`<span class="warn">${esc(o.who)}의 「${esc(o.n)}」과 트리거 ${shared.map(x => '【' + x + '】').join('')} 겹침 (대원칙 1)</span>`);
      const same = [...ek].filter(x => prEffKeys(o.eff).has(x));
      if (same.length >= 2) out.push(`<span class="warn">${esc(o.who)}의 「${esc(o.n)}」과 효과 겹침: ${esc(same.join('·'))} (대원칙 2)</span>`);
    }
    for (const m of txt.matchAll(/「([^」:]+)」/g)) {
      if (idx.moves.has(m[1]) && !C.moves.some(x => x.n === m[1]))
        out.push(`<span class="warn">기술 「${esc(m[1])}」은 이 포켓몬에게 없습니다</span>`);
    }
    const tyIn = S.db.types
      .map(x => x[0])
      .filter(k =>
        new RegExp(
          '「타입 : ' + k + '」|「' + k + '」(?=「|\\s*기술)|「(공격기|단일기|전체기|물리기|특수기|변화기|접촉기|선공기) : ' + k + '」'
        ).test(txt)
      );
    for (const k of tyIn)
      if (!C.types.includes(k) && !C.mtypes.has(k)) out.push(`<span class="warn">「${esc(k)}」 타입은 자신의 타입·기술에 없습니다</span>`);
    if (/○○/.test(txt)) out.push(`<span class="warn">「○○」 자리를 채워 주세요</span>`);
    return out.length ? out.join('<br>') : '<span class="okc">규칙 점검 이상 없음</span>';
  };
  const upd = () => {
    const txt = build();
    const bal = prBalance(lines, {
      abWt: (C.abilEff.match(/「날씨 : ([^」]+)」/) || [])[1],
      abFd: (C.abilEff.match(/「필드 : ([^」]+)」/) || [])[1]
    });
    const budget = excl ? PR_BUDGET.excl : PR_BUDGET.race;
    $('[data-prev]', l).innerHTML =
      `<b>${esc($('[data-name]', l).value || '(이름 없음)')}</b>${PR_HIDDEN ? '' : ` <span class="small">${prBalanceHTML(bal, budget)}</span>`}<br>` +
      rich(txt);
    $('[data-chk]', l).innerHTML =
      checks(txt) +
      (!PR_HIDDEN && bal.net > budget
        ? `<br><span class="warn">수지 초과: 효과값 ${bal.ev}에 비해 조건값 ${bal.cc}이 약합니다 (예산 ${budget}) · 조건을 더 붙이거나 효과를 줄이세요</span>`
        : '');
  };
  const draw = () => {
    $('[data-lines]', l).innerHTML = lines.map(lineHTML).join('');
    upd();
  };
  draw();
  const setF = el => {
    const ln = lines[+el.dataset.i];
    if (!ln) return;
    const k = el.dataset.f;
    if (k === 'trig') ln.trig = el.value;
    else if (k === 'cond0') ln.cond = el.value;
    else if (k === 'eff') {
      ln.eff = el.value;
      draw();
      return;
    } else ln.pr[k] = el.value;
    upd();
  };
  l.addEventListener('input', e => {
    const el = e.target;
    if (el.dataset.f && el.dataset.i != null && el.tagName !== 'SELECT') setF(el);
    else if (el.matches('[data-name]')) upd();
  });
  l.addEventListener('change', e => {
    const el = e.target;
    if (el.dataset.f && el.dataset.i != null) setF(el);
  });
  l.addEventListener('click', e => {
    if (e.target.closest('[data-x]')) return closeModal();
    if (e.target.closest('[data-rec]')) {
      closeModal();
      openPotRecommend(t, p, onPick, excl);
      return;
    }
    if (e.target.closest('[data-addline]')) {
      if (lines.length < 5) {
        lines.push({ trig: '', cond: '', eff: 'rank', pr: {} });
        draw();
      }
      return;
    }
    const d = e.target.closest('[data-del]');
    if (d) {
      lines.splice(+d.dataset.del, 1);
      draw();
      return;
    }
    if (e.target.closest('[data-use]')) {
      const txt = build();
      const name = $('[data-name]', l).value.trim();
      const kind = $('[data-kind]', l).value.trim();
      closeModal();
      onPick({ kind, name, eff: txt });
    }
  });
}

