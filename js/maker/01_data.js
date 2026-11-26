/* ── 조각 01_data.js — 기본 보조 데이터 · 상태 ── */
/* ---------- 기본 보조 데이터 ---------- */
const TAGS_DEF = [
  ['N/시', '조건을 채웠을 때 시합에 N번까지 사용할 수 있다. 무효화되어도 횟수를 소모한다.', '1/시|2/시|3/시|N/시'],
  ['자동', '【N/시】와 함께 쓴다. 조건을 채우면 자동으로 사용되며, 그 시점에 횟수를 소모한다.', ''],
  ['선행', '지시 입력 때 미리 선행 입력해 두고, 조건을 만족하면 반드시 발동한다. 포텐셜 종류별로 1개까지.', ''],
  ['강제', '모든 발동 조건을 무시하고 강제로 발동시켰을 때 붙는다. 횟수를 소모하지 않는다.', ''],
  ['임의', '발동 조건을 무시하고 임의의 타이밍에 발동한다. 횟수를 소모한다.', ''],
  ['사전', '트레이너의 지시 전에 해당하는 효과. 『포켓몬 도감』『스카우터』, 선언계 『고유』 정도.', ''],
  [
    '준비',
    '시합 준비 시(배틀을 시작하기 전, 파티 · 소지품을 정할 때) 한 번 적용한다. 소지품 착용 · 기술 고르기 · 상대 PT 조건 · 종족치처럼 시합 내내 이어지는 효과에 쓴다. 시합 중에는 다시 발동하지 않는다. (11-01 망령 「시합 준비 시」를 태그로)',
    ''
  ],
  ['야생', '『야생』일 때만 발동한다. 포획되면 보통 제거된다.', ''],
  ['방호', '기술의 대미지를 덜 받거나 무효화하는 모든 효과.', ''],
  ['방호 (조건)', '대미지를 덜 받는 데 쓰였을 때만 방호로 취급하는 효과(능력 강화 등).', ''],
  ['동조', '적진의 같은 『역할』에 작동하는 효과. 아군이면 (아군), 상대에게 상시 작용하면 (상대).', '동조|동조 (아군)|동조 (상대)'],
  [
    '등장',
    '필드에 등장했을 때 작동한다. 등장 방식을 괄호로 한정한다. 「다음 기술」 표현과 함께 쓴다.',
    '등장|등장 (통상 교대)|등장 (임의 교대)|등장 (죽어내밀기)|등장 (상대)'
  ],
  [
    '퇴장',
    '필드를 떠날 때 작동한다. 강제 교대는 (강제 교대) 외의 퇴장을 발동하지 않는다.',
    '퇴장|퇴장 (통상 교대)|퇴장 (임의 교대)|퇴장 (강제 교대)|퇴장 (빈사)'
  ],
  [
    '지연',
    '필드에 등장하여 N번째 턴(N은 보통 2 이상). (아군, N턴), (N턴 동안)도 있다.',
    '지연 (2턴)|지연 (3턴)|지연 (아군, 2턴)|지연 (2턴 동안)|지연 (아군, 2턴 동안)'
  ],
  [
    '지원',
    '볼 안(벤치 · 소지 중)에 있을 때만 작동한다 — 필드 위에서는 작동하지 않는다. 「빈사」면 작동하지 않으며, 빈사 중에도 작동하면 (빈사). 필드 위에서도 작동하면 (상위) (11-21).',
    '지원|지원 (빈사)|지원 (상위)'
  ],
  ['수세', '자신이 공격을 지시받지 않았을 때. 자신의 기술 위력과는 연계되지 않는다.', ''],
  ['공세', '대상이 공격을 지시받지 않았을 때. 상대의 기술 위력과는 연계되지 않는다.', ''],
  ['함성', '포켓몬을 쓰러뜨렸을 때. 여러 마리를 한 번에 쓰러뜨리면 그만큼 발동한다.', '함성|함성 (「알그룹 : 인간형」)'],
  [
    '자질',
    '트레이너의 특정 자질이 지정 랭크 이상일 때. 이하 조건은 「지시 : C 이하」처럼.',
    '지시 : B|지시 : A|육성 : B|육성 : A|통솔 : B|통솔 : A|능력 : B|능력 : A|지시 : C 이하'
  ],
  ['유일', '같은 이름·파생 효과와 중첩되지 않고 가장 높은 값만 적용한다. 제약은 중첩된다.', '유일|유일 (『결계』)|유일 (「소지품」)'],
  ['소진', '1턴에 1번. 소지에 들어갔다 다시 나와도 그 턴에는 쓸 수 없다.', ''],
  ['탈진', '연속된 턴에 사용할 수 없다. 발동 후 다음 턴 종료 시까지 사용 불가.', ''],
  ['보급', '필드에 등장하여 1번만. 다시 쓰려면 소지에 들어갔다 나와야 한다.', ''],
  ['공유', '발동한 턴 종료 시까지 다른 【공유】 효과를 발동할 수 없다.', '공유|공유 (『지령』)'],
  ['중첩', '조건을 달성할 때마다 같은 효과가 N번까지 누적된다.', '중첩 (2회)|중첩 (3회)'],
  [
    '연동',
    '자신이 특정 조건을 충족했을 때 연동해서 발동한다. (아군)은 아군에게, (상대)는 상대에게 조건을 달성시켰을 때.',
    '연동 (「특성 : ○○」)|연동 (아군)|연동 (상대)'
  ],
  [
    '은폐',
    '시스템 로그에 공개하지 않을 수 있다. 발동한 로그는 주인(NPC 면 GM)에게만 보이고, 주인이 「출력」으로 따로 공개하지 않는 한 모두에게 알리지 않는다.',
    ''
  ]
];
const TAGS_V = 5; /* 11-22 망령 「태그에 【은폐】 추가」 */
/* 10-27 망령: 태그 사전 · 기초 템플릿의 버전(TAGS_V · TPL_V)을 올려도 고친 표를 기본값으로 갈아끼우지 않는다.
   내 행은 그대로 두고, 기본값에 새로 생긴 행만 뒤에 더한다. 기존 행 문구를 바꿔야 하면 tplSoloV 처럼 단계(마이그레이션)를 따로 쓴다 */
function verMerge(mine, def, keyOf) {
  if (!Array.isArray(mine)) return clone(def);
  const have = new Set(mine.map(keyOf));
  return clone(mine).concat(clone(def.filter(r => !have.has(keyOf(r)))));
}
const tagKey = r => String(r && r[0]),
  tplKey = r => [r && r[0], r && r[1], r && r[2]].join('|');
const TPL_DEF = [
  ['공통', '*', '메인', '2', '룰북 · 자질 투자 2점 (덤프 1개당 +1)', '2'],
  ['통솔', 'D', '통솔점', '6', '룰북 · 1인(2체) 3/3/4/5에서 파트너 할인 2점(D는 없음)을 뺀 값', '3'],
  ['통솔', 'C', '통솔점', '6', '룰북 · 1인(2체) 3/3/4/5에서 파트너 할인 2점(D는 없음)을 뺀 값', '1'],
  ['통솔', 'B-', '통솔점', '7', '룰북 · 1인(2체) 3/3/4/5에서 파트너 할인 2점(D는 없음)을 뺀 값', '1.5'],
  ['통솔', 'B', '통솔점', '8', '룰북 · 1인(2체) 3/3/4/5에서 파트너 할인 2점(D는 없음)을 뺀 값', '2'],
  ['통솔', 'A', '통솔점', '10', '룰북 · 1인(2체) 3/3/4/5에서 파트너 할인 2점(D는 없음)을 뺀 값', '3'],
  ['통솔', 'AA', '통솔점', '12', '룰북 · 1인(2체) 3/3/4/5에서 파트너 할인 2점(D는 없음)을 뺀 값', '4'],
  ['육성', 'D', '분배레벨', '0', '룰북 (11-01 망령: 육성 D 는 0)', '0'],
  ['육성', 'C', '분배레벨', '10', '룰북 「1인 기준 (2체)」 표 (+2 / +4 / +5 / +7)', '4'],
  ['육성', 'B-', '분배레벨', '10', '룰북 「1인 기준 (2체)」 표 (+2 / +4 / +5 / +7)', '4'],
  ['육성', 'B', '분배레벨', '15', '룰북 · 1인(2체)은 6체의 1/3 반올림', '5'],
  ['육성', 'A', '분배레벨', '20', '룰북 · 1인(2체)은 6체의 1/3 반올림', '7'],
  ['공통', '*', '「기술 할인점」', '6', '공통 요소 · 1인(2체)은 6의 1/3 = 2', '2'],
  ['공통', '*', '【1/시】', '3', '공통 요소 · 1인은 1', '1']
];
const TPL_V = 3;
/* 1인 기준(2체)의 PT 기술점 · 육성 랭크별. 테이블·계산식 탭에서 고친다 */
const SOLO_SOCK_DEF = { D: '11', C: '11.5', B: '12', A: '12.5' };
/* 템플릿 행을 [자질,랭크,항목,값(6체),비고,값(1인)] 6칸으로 맞추고, 빈 1인 값은 기본값(없으면 6체 값)으로 채운다. 로컬·공유 저장소 어느 쪽에서 왔든 같은 처리 */
function tplNormalize(db) {
  const strip0 = r => String(r || '').replace(/[+-]/g, '');
  if (!Array.isArray(db.tpl)) db.tpl = clone(TPL_DEF);
  for (const r of db.tpl) while (r.length < 7) r.push('');
  /* 「기술 할인점」·【1/시】는 능력과 관계없는 공통 요소 */
  for (const r of db.tpl)
    if (r[0] === '능력' && (r[2] === '「기술 할인점」' || r[2] === '【1/시】')) {
      r[0] = '공통';
      r[1] = '*';
    }
  if ((db.tplSoloV || 0) < 2) {
    const solo = db.tpl.filter(r => r[5] === '1인');
    db.tpl = db.tpl.filter(r => r[5] !== '1인');
    for (const r of solo) {
      const m =
        db.tpl.find(x => x[0] === r[0] && x[1] === r[1] && x[2] === r[2]) ||
        db.tpl.find(x => x[2] === r[2] && strip0(x[1]) === strip0(r[1])) ||
        db.tpl.find(x => x[2] === r[2]);
      if (m) m[5] = r[3];
      else db.tpl.push([r[0], r[1], r[2], r[3], r[4], r[3]]);
    }
    db.tplSoloV = 2;
  }
  if ((db.tplSoloV || 0) < 3) {
    for (const r of db.tpl) if (r[2] === '「기술 할인점」' && String(r[5]) === '2') r[5] = '3';
    db.tplSoloV = 3;
  }
  /* 1인(2체) 통솔점 = 6체의 1/3 반올림: D·C·B- 2, B·A 3, AA 4 */
  if ((db.tplSoloV || 0) < 4) {
    const T = { D: '2', C: '2', 'B-': '2', B: '3', A: '3', AA: '4' };
    for (const r of db.tpl)
      if (r[2] === '통솔점' && T[r[1]] != null) {
        r[5] = T[r[1]];
        r[4] = '룰북 · 1인(2체)은 6체의 1/3 반올림';
      }
    db.tplSoloV = 4;
  }
  /* 1인(2체) 분배레벨 = 6체의 1/3 반올림: D 2 · C·B- 3 · B 5 · A 7, 「기술 할인점」 2 */
  if ((db.tplSoloV || 0) < 5) {
    const T = { D: '2', C: '3', 'B-': '3', B: '5', A: '7' };
    for (const r of db.tpl) {
      if (r[2] === '분배레벨' && T[r[1]] != null) r[5] = T[r[1]];
      if (r[2] === '「기술 할인점」' && String(r[5]) === '3') r[5] = '2';
    }
    db.tplSoloV = 5;
  }
  /* 10-25 종족치 개편: 1인(2체) 통솔점 = 룰북 표 D 3 / C 3 / B 4 / A 5 에서 파트너 할인(2체 × 1점, D는 없음)을 뺀 값 */
  if ((db.tplSoloV || 0) < 6) {
    const T = { D: '3', C: '1', 'B-': '1.5', B: '2', A: '3', AA: '4' };
    for (const r of db.tpl)
      if (r[2] === '통솔점' && T[r[1]] != null) {
        r[5] = T[r[1]];
        r[4] = '룰북 · 1인(2체) 3/3/4/5에서 파트너 할인 2점(D는 없음)을 뺀 값';
      }
    db.tplSoloV = 6;
  }
  /* 10-30 망령 「1인 기준 2체 값은 표」: 분배레벨 C · B- 를 룰북 표 +4 로 (예전 1/3 계산값 3 일 때만) */
  if ((db.tplSoloV || 0) < 7) {
    for (const r of db.tpl)
      if (r[2] === '분배레벨' && (r[1] === 'C' || r[1] === 'B-') && String(r[5]) === '3') {
        r[5] = '4';
        r[4] = '룰북 「1인 기준 (2체)」 표 (+2 / +4 / +5 / +7)';
      }
    db.tplSoloV = 7;
  }
  /* 10-30 망령 「메인은 2점 상승에 덤프하면 +1 — 총합이 4로 잘못」 (전체 룰): 공통 · 메인 4 → 2 */
  if ((db.tplSoloV || 0) < 8) {
    for (const r of db.tpl)
      if (r[0] === '공통' && r[2] === '메인' && String(r[3]) === '4') {
        r[3] = '2';
        r[5] = '2';
        r[4] = '룰북 · 자질 투자 2점 (덤프 1개당 +1)';
      }
    db.tplSoloV = 8;
  }
  for (const r of db.tpl) {
    if (r[5] == null || r[5] === '' || r[5] === '1인') {
      const d =
        TPL_DEF.find(d => d[0] === r[0] && d[1] === r[1] && d[2] === r[2]) || TPL_DEF.find(d => d[2] === r[2] && strip0(d[1]) === strip0(r[1]));
      r[5] = d ? d[5] : r[3];
    }
  }
  if (!Array.isArray(db.ilock)) db.ilock = [];
  for (const r of db.tpl) if (typeof r[4] === 'string') r[4] = r[4].replace(/\s*\(\d{4}-\d{2}-\d{2}[^)]*\)/g, '');
  if (!db.soloSock) db.soloSock = clone(SOLO_SOCK_DEF);
  for (const k in SOLO_SOCK_DEF) if (db.soloSock[k] == null || db.soloSock[k] === '') db.soloSock[k] = SOLO_SOCK_DEF[k];
  rulesNormalize(db);
}
/* 포켓몬 시트 템플릿: 자질 '기본'은 항상, 그 밖에는 트레이너 자질이 해당 랭크 이상일 때 추가 */
const STPL_DEF = [
  ['기본', '', '00. 역할', '역할 포텐셜', '기본', '전원'],
  ['기본', '', '01.0. 분류', '현대종', '기본', '전원'],
  ['기본', '', '04.1. 종족', '종족 포텐셜①', '기본', '전원'],
  ['기본', '', '04.2. 종족', '종족 포텐셜②', '기본', '전원'],
  ['기본', '', '05. 속별', '속별 포텐셜', '기본', '전원'],
  ['육성', 'A', '08.1. 회피', '약점회피', '룰북: 육성 A · 전원 『계제』『속별』『회피+내성』 중 3개', '전원'],
  ['육성', 'A', '09.1. 내성', '약점내성', '룰북: 육성 A · 전원 『계제』『속별』『회피+내성』 중 3개', '전원'],
  ['지시', 'A', '12.1. 전술', '전술 포텐셜①', '룰북: 지시 A · 파트너 전원 『전술』', '파트너'],
  ['통솔', 'C', '06. 유대', '유대 포텐셜', '룰북: 통솔 C · 파트너 『유대』 1체', '파트너 1체'],
  ['통솔', 'B', '14. 특권', '익스펜션 : ○○', '룰북: 통솔 B · PT 전원 『익스펜션』', '전원'],
  ['통솔', 'A', '06. 유대', '유대 포텐셜', '룰북: 통솔 A · 『영혼의 유대』 1체 추가 (1인 기준 2체 모두)', '파트너 2체']
];
const STPL_V = 4;
/* v2 → v3: 기본값은 새 표로, 사용자가 더한 행은 뒤에 남긴다. 대상 칸(6번째)이 없으면 「전원」. v3 → v4: 『계제』 행 제거(종족 포텐셜로 대체) */
const STPL_V2 = [
  ['기본', '', '00. 역할', '역할 포텐셜'],
  ['기본', '', '01.0. 분류', '현대종'],
  ['기본', '', '04.1. 종족', '종족 포텐셜①'],
  ['기본', '', '04.2. 종족', '종족 포텐셜②'],
  ['기본', '', '05. 속별', '속별 포텐셜'],
  ['육성', 'A', '08.1. 회피', '약점회피'],
  ['육성', 'A', '09.1. 내성', '약점내성'],
  ['지시', 'A', '12.1. 전술', '전술 포텐셜①'],
  ['통솔', 'B', '14. 특권', '익스펜션 : ○○']
];
const stplIsGyeje = r => r && (/계제 포텐셜/.test(String(r[3] || '')) || /^05\.1\./.test(String(r[2] || '')));
function stplMigrate(old, v) {
  if (!Array.isArray(old)) return clone(STPL_DEF);
  if ((v || 0) >= STPL_V)
    return old.map(r => {
      const x = r.slice();
      if (x[5] == null) x[5] = '전원';
      return x;
    });
  if ((v || 0) >= 3)
    return old
      .filter(r => !stplIsGyeje(r))
      .map(r => {
        const x = r.slice();
        if (x[5] == null) x[5] = '전원';
        return x;
      });
  const key = r => [r[0], r[1], r[2], r[3]].join('|');
  const base = new Set(STPL_V2.map(key)),
    now = new Set(STPL_DEF.map(key));
  return [
    ...clone(STPL_DEF),
    ...old
      .filter(r => r && !base.has(key(r)) && !now.has(key(r)) && !stplIsGyeje(r))
      .map(r => {
        const x = r.slice();
        if (x[5] == null) x[5] = '전원';
        return x;
      })
  ];
}
/* 템플릿으로 자동 삽입됐던 『계제 포텐셜』 슬롯 비우기 (효과를 직접 쓴 칸은 남긴다) */
const STPL_PURGE = ['계제 포텐셜①', '계제 포텐셜②', '계제 포텐셜③'];
function stplPurge() {
  let n = 0;
  for (const t of S.trainers)
    for (const p of t.pokemon || [])
      (p.pots || []).forEach((x, i) => {
        if (STPL_PURGE.includes(x) && !(p.potEff && p.potEff[i])) {
          p.pots[i] = '';
          if (p.potKind) p.potKind[i] = '';
          n++;
        }
      });
  return n;
}
const STATS = ['HP', '공격', '방어', '특공', '특방', '스피드'];
const RANKS = ['S', 'AAA+', 'AAA', 'AAA-', 'AA+', 'AA', 'AA-', 'A+', 'A', 'A-', 'B+', 'B', 'B-', 'C+', 'C', 'C-', 'D+', 'D', 'D-', 'E+', 'E', 'E-'];
const QUAL = ['지시', '육성', '통솔', '능력'];
const SLOTS = [
  '역할',
  '분류',
  '주인',
  '이명',
  '종족①',
  '종족②',
  '종족③',
  '종족④',
  '속별',
  '정/유대',
  '선',
  '회피',
  '내성',
  '격',
  '범용',
  '전술①',
  '전술②',
  '부수',
  '특권',
  'PT'
];
const DBS = {
  moves: {
    t: '기술',
    key: 2,
    cols: [
      '소켓',
      '기술 태그',
      '기술명',
      '일명',
      '영명',
      '타입',
      '분류',
      '위력',
      '명중',
      '범위',
      '접촉',
      '우선도',
      '분류(태그)',
      '추가 효과',
      '공격 스탯',
      '방어 스탯',
      '비고',
      '등장 시기',
      '최소 공격 횟수',
      '최대 공격 횟수'
    ],
    show: [2, 5, 6, 7, 8, 9, 10, 11, 0, 13],
    eff: 13
  },
  abil: {
    t: '특성',
    key: 1,
    cols: ['소켓', '특성', '효과', '틀깨기', '방호 특성', '구분', '비고'],
    show: [1, 0, 3, 4, 5, 2, 6],
    eff: 2
  } /* 11-06 망령 「올타 전용 특성 표기 · 비고란(조건부 소켓 등)」: 5 올타 전용(O/X) · 6 비고 */,
  items: {
    t: '소지품',
    key: 1,
    cols: ['종류', '도구', '별칭', '소모(O)', '효과', '소켓', '비고', '구문'],
    show: [1, 0, 2, 3, 5, 4, 7, 6],
    eff: 4
  } /* 구문 = 오레마스 소지품 자동화 (js/fx/itemrule.js, 10-24 망령) */,
  pots: { t: '포텐셜', key: 1, cols: ['종류(순서)', '이름', '효과', '비고'], show: [1, 0, 2, 3], eff: 2 },
  old: {
    t: '올드 타입',
    key: 1,
    cols: [
      '지역',
      '포켓몬',
      'Name',
      '타입1',
      '타입2',
      '특성1',
      '특성2',
      '숨겨진 특성',
      '알그룹1',
      '알그룹2',
      '메가',
      'HP',
      '공격',
      '방어',
      '특공',
      '특방',
      '스피드',
      '프라이드'
    ],
    show: [1, 0, 3, 4, 5, 6, 7, 8, 9, 11, 12, 13, 14, 15, 16, 17],
    eff: -1
  },
  points: {
    t: '포인트',
    key: 4,
    cols: ['번호', '분류', '세부', '소모 항목', '이름', '효과', '소모 포인트', '상시 공개'],
    show: [4, 1, 2, 3, 6, 5, 7],
    eff: 5
  },
  rm: {
    t: '레디메이드',
    key: 0,
    cols: ['이름', '효과 글', '구문', '손으로', '확률'],
    show: [0, 1, 4, 2, 3],
    eff: 1
  } /* 확률 = 발동 확률 % (비우면 효과 글의 「N할로」 등에서, 10-24 망령) */,
  cards: {
    t: '카드',
    key: 1,
    cols: ['덱', '이름', '종류', '비용', '효과', '색', '그림 주소', '기본 장수', '비고', '자동화 구문', '아이콘', '출처', '분류', '덱 제한'],
    show: [6, 1, 11, 12, 10, 0, 2, 3, 7, 13, 4, 8],
    eff: 4
  } /* 11-03 망령 「은열쇠 카드 양식」: 분류(12, cls) = 열쇠 · 준비 · 증상, 덱 제한(13, deckMax) = 같은 카드 최대 장수(비우면 2) */ /* 11-01 망령 「카드 DB 출처로 폴더링」: 출처(11) = 공용 · 만든 사람(트레이너 이름) — DB 표가 출처별 폴더로 묶는다 */ /* 11-01 망령 「은열쇠」: 아이콘 칸(10) — 지시 · 육성 · 통솔 · 능력 · ★, 스킬 체크에 바치면 +1 */ /* 카드 DB (10-26 망령): 오레마스 덱 카드와 같은 칸 — 이름 n · 종류 t · 비용 c · 효과 x · 색 col · 그림 img · 장수 q. 트레이너 시트 「덱 관리」가 여기서 고른다 */,
  st: {
    t: '상태 변화',
    key: 0,
    cols: ['키(영문)', '이름', '그룹', '기본 턴', '최대 턴', '턴 굴림', '진행', '상태 이상', '불리', '배턴', '설명', '메모', '아이콘'],
    show: [12, 1, 0, 2, 3, 4, 6, 7, 8, 9, 10],
    eff: 10
  }
};

/* ---------- 상태 ---------- */
const K_T = 'mkm_trainers_v2',
  K_DB = 'mkm_db_v2',
  K_OLD = 'mangketmon_maker_v1';
/* 11-08 22:28 망령 「시트에서 권한 없는 것도 한 장으로 보기 — 비밀로 잠금 처리해 둔 게 아니면 볼 수 있게」: 세션 노트가 ?embed=1&ro=1 로 열면 읽기 전용 — 저장 · 공유 올리기를 하지 않고, 한 장 요약에서 고치기 단추를 뺀다 */
const RO_EMB = (() => {
  try {
    const q = new URLSearchParams(location.search);
    return q.get('embed') === '1' && q.get('ro') === '1';
  } catch (e) {
    return false;
  }
})();
function lsGet(k) {
  try {
    return localStorage.getItem(k);
  } catch (e) {
    return null;
  }
}
function lsSet(k, v) {
  try {
    localStorage.setItem(k, v);
    return true;
  } catch (e) {
    return false;
  }
}
let S = { db: null, custom: { moves: [], abil: [], items: [], pots: [], points: [], old: [] }, trainers: [], folders: [], ui: { tab: 'char' } };
function load() {
  let db = null,
    tr = null;
  try {
    db = JSON.parse(lsGet(K_DB) || 'null');
  } catch (e) {}
  try {
    tr = JSON.parse(lsGet(K_T) || 'null');
  } catch (e) {}
  if (!tr) {
    try {
      const o = JSON.parse(lsGet(K_OLD) || 'null');
      if (o) {
        tr = { trainers: o.trainers || [] };
        if (o.db) db = { db: o.db, custom: {} };
      }
    } catch (e) {}
  }
  S.db = db && db.db ? db.db : clone(DEF);
  if (db && db.custom) Object.assign(S.custom, db.custom);
  if (tr) {
    S.trainers = tr.trainers || [];
    if (tr.ui) S.ui = Object.assign(S.ui, tr.ui);
  }
  S.folders = tr && Array.isArray(tr.folders) ? tr.folders.filter(f => f && f.id) : [];
  for (const k in DEF) if (S.db[k] == null) S.db[k] = clone(DEF[k]);
  /* 11-05 망령 「종족치는 200 부터 그냥 S · 여긴 −+ 없음」: 예전 등급 표(S- 200 · S 220 · S+ 241)를 저장해 둔 브라우저도 새 표로 (읽기 전용 표라 손댄 값 없음) */ if (
    Array.isArray(S.db.grade) &&
    S.db.grade.some(r => r && (r[1] === 'S-' || r[1] === 'S+'))
  )
    S.db.grade = clone(DEF.grade);
  if (!S.db.tags || (S.db.tagsV || 0) < TAGS_V) {
    S.db.tags = verMerge(S.db.tags, TAGS_DEF, tagKey);
    S.db.tagsV = TAGS_V;
  }
  S.custom.old = S.custom.old || [];
  for (const k in DBS) if (!S.custom[k]) S.custom[k] = [];
  if (S.db.oldSock == null) S.db.oldSock = 5.5;
  if (!S.db.ptItems) S.db.ptItems = clone(PTI_DEF);
  if (!S.db.pride) S.db.pride = clone(PRIDE_DEF);
  prideMigrate(S.db);
  ptiMigrate(S.db);
  if (!S.db.tpl || (S.db.tplV || 0) < TPL_V) {
    S.db.tpl = verMerge(S.db.tpl, TPL_DEF, tplKey);
    S.db.tplV = TPL_V;
  }
  tplNormalize(S.db);
  {
    const _sv = S.db.stplV || 0;
    S.db.stpl = stplMigrate(S.db.stpl, S.db.stplV);
    S.db.stplV = STPL_V;
    if (_sv < 4 && _sv > 0) stplPurge();
  }
  reindex();
  S.trainers.forEach(fixT);
  dedupeIds();
  if (!S.trainers.length) S.trainers.push(sampleTrainer());
}
let dbDirty = false,
  svT = null;
function save(dbToo) {
  if (RO_EMB) return;
  SH.userEdit = (SH.userEdit || 0) + 1;
  /* 11-09 감우 57: 이 창에서 고친 것이 있다는 표시 — shFlush 는 이것이 있을 때만 올린다 */ if (dbToo) {
    dbDirty = true;
    SH.dbDirty = true;
  }
  clearTimeout(svT);
  svT = setTimeout(() => {
    mkmChanged();
    if (SH.failed) lsSet('mkm_unsynced', '1');
    let ok = lsSet(K_T, JSON.stringify({ trainers: S.trainers, folders: S.folders, ui: S.ui }));
    if (dbDirty) {
      ok = lsSet(K_DB, JSON.stringify({ db: S.db, custom: S.custom })) && ok;
      dbDirty = false;
    }
    if (SH.on) {
      shFlush();
      return;
    }
    $('#saved').textContent = ok
      ? '자동 저장 ' + new Date().toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })
      : '브라우저 저장 실패 · 백업 저장을 눌러 파일로 보관하세요';
    shDot();
    if (ok) savedFx();
  }, 300);
}
/* 11-03 감우 (20번 검토 연출 4): 저장 피드백 — 상태 점 한 번 깜빡 + 방금 고친 카드 테두리 0.6초 반짝 (입력한 칸이 든 포켓몬 · 트레이너 카드) */
const SVF = { id: null };
function savedFx() {
  const d = $('#shdot');
  if (d) {
    d.classList.remove('blink');
    void d.offsetWidth;
    d.classList.add('blink');
    setTimeout(() => d.classList.remove('blink'), 700);
  }
  const id = SVF.id;
  SVF.id = null;
  if (!id) return;
  const el = document.getElementById(id);
  if (!el) return;
  el.classList.remove('savedflash');
  void el.offsetWidth;
  el.classList.add('savedflash');
  setTimeout(() => el.classList.remove('savedflash'), 700);
}
const idx = {};
function reindex() {
  for (const r of (S.db && S.db.pots) || []) if (r && r[0]) r[0] = normKind(r[0]);
  for (const r of (S.db && S.db.stpl) || []) if (r && r[2]) r[2] = normKind(r[2]);
  for (const k in DBS) {
    const m = new Map();
    for (const r of S.db[k]) if (r[DBS[k].key] !== '' && !m.has(r[DBS[k].key])) m.set(r[DBS[k].key], r);
    idx[k] = m;
  }
}

