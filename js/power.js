/* 11-28 망령 「기왕 내구력 계산기 있으니까 결정력 계산기도 제작기에 있으면 좋겠어요 · 세션 노트쪽 시트에도 · 기술 아래에 띄워주는 식으로」
   결정력 = 쓰는 능력치 실수치 × 위력 × 자속 보정(같은 타입 1.5 · 「적응력」 2).
   제작기 시트 기술 탭과 세션 노트 시트 기술 칸이 이 파일 하나를 같이 쓴다 (세션 노트는 /mangketmon-maker/js/power.js 로 부른다).
   실수치 식은 제작기 stat() 과 같다 — 레벨 · 종족치(포텐셜로 오른 값) · 개체값 · 실수치 ±(statAdd) · 능력치 바꾸기(statCp) */
(function () {
  'use strict';
  const STAT_IDX = { HP: 0, 체력: 0, 공격: 1, 방어: 2, 특공: 3, 특방: 4, 스피드: 5 };
  const STAT_KO = ['HP', '공격', '방어', '특공', '특방', '스피드'];
  const num = v => (Number.isFinite(+v) ? +v : 0);

  /* 기술 줄(DB 배열)이 쓰는 능력치 칸: 14번 칸(사용 능력) → 없으면 물리 = 공격 · 특수 = 특공 · 변화 = 없음 */
  function useStat(row) {
    const cat = String((row && row[6]) || '').trim();
    if (cat === '변화' || !row) return -1;
    const u = String(row[14] || '').trim();
    if (u in STAT_IDX) return STAT_IDX[u];
    if (cat === '물리') return 1;
    if (cat === '특수') return 3;
    return -1;
  }

  /* 실수치 — base = 그 포켓몬의 종족치(포텐셜로 오른 값이면 그것), ivs · add · cp 는 제작기 문서 그대로 */
  function realStat(o, i) {
    const raw = k => {
      const b = num((o.base || [])[k]);
      const L = num(o.lv);
      const core = Math.floor((Math.floor(b * 2) + num((o.ivs || [])[k])) * (L / 100));
      return k === 0 ? core + 10 + L : core + 5;
    };
    const cp = o.cp && o.cp[i] != null ? o.cp[i] : i;
    return Math.max(1, raw(cp) + num((o.add || [])[i]));
  }

  /* 기술 타입이 포켓몬 타입과 같으면 자속 — 「(물/불꽃)」처럼 여러 타입 글은 하나라도 같으면 */
  function stabOf(row, types, ability) {
    const mt = String((row && row[5]) || '')
      .split(/[()/,·]/)
      .map(x => x.trim())
      .filter(Boolean);
    if (!mt.some(x => types.includes(x))) return 1;
    return String(ability || '').replace(/[『』\s]/g, '') === '적응력' ? 2 : 1.5;
  }

  /* 결정력 한 줄 — 위력이 없거나 변화기면 null */
  function calc(o, row) {
    const pow = num(row && row[7]);
    const si = useStat(row);
    if (!(pow > 0) || si < 0) return null;
    const st = realStat(o, si);
    const stab = stabOf(row, o.types || [], o.ability);
    const v = Math.floor(st * pow * stab);
    const why = `${STAT_KO[si]} ${st} × 위력 ${pow}${stab > 1 ? ` × 자속 ${stab}` : ''}`;
    return { v, st, pow, stab, stat: STAT_KO[si], why };
  }

  window.MKM_POWER = { calc, realStat, useStat, stabOf };
})();
