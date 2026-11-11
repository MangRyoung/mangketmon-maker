/* ---------- 자동화 구문 편집기 + 생성기 (맵툴 「레디메이드 생성기」·포켓몬 관리의 「구문」을 옮긴 것) ----------
   openEditor({mon, kind:'pot'|'trait'|'item', name, text, save(auto|null)})
   · 레디메이드에 같은 이름의 자동화가 있으면 그것이 기본으로 돈다 (읽기 전용 미리보기 · 「복사해서 고치기」)
   · 이 포켓몬만의 구문(m.auto[name]) 을 한국어 구문으로 쓰거나 생성기로 줄을 만든다. 저장하면 레디메이드보다 우선.
   openRm(name?) : 레디메이드 DB 창 (검색 · 보기 · GM 수정 → state.dbx.rm) */
"use strict";
window.OM_FX_UI=(()=>{
 const A=()=>window.OM_APP, FX=()=>window.OM_FX, DB=()=>window.OM_DB||{};
 const $=(q,el)=>(el||document).querySelector(q);
 const esc=s=>String(s==null?'':s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
 const HELP=`한 줄에 명령 하나 (「;」로 이어 써도 된다). 대상을 안 쓰면 자신(상태·피해·특성은 상대 1체).
대상: 자신 · 아군전체 · 상대전체 · 자신이외 · 전체 · 아군1체 · 상대1체 · 자신이외무작위 · 상대무작위 · 전원무작위 · 에리어
랭크 [대상] 공격+1 방어-1 … [임시] [강제]        배율 [대상] 공격×1.33 …        초기화 랭크|배율|전부
위력 ×1.3 [대상] [타입:불꽃,물] [물리|특수] [굉장|별로|보통] [단일|전체기] [자속|비자속] [태그:소리,접촉] [위력≥150] [위력≤60] [역할:에이스] [수세|공세] [급소방호1] [급소+1] [확정급소|급소없음] [분류최대] [N회] [이번턴] [N턴] [해제] [기술:이름] [상대타입:물] [명중×1.2] [상태:배수의진] [상대상태:도발] [날씨:맑음,비] [필드:그래스필드|물놀이] [HP≤1/2|HP≥1/2] [반동기] [아군공격]  (상태 · 날씨 · 필드 · HP 는 그때그때 따진다 · 「완화 ×0」 = 효과가 없다)
완화 ×0.75 … (위력과 같은 조건 — 받는 쪽) [HP가득 = 「HP : 가득」일 때만] [견딤 = 그 기술로 「빈사」 되지 않음] [미룸 = 「빈사」가 될 대미지를 자신의 행동 뒤로 — 줄여서 「미루기 [1회] [이번턴]」]        없음 (배틀 효과가 없는 포텐셜 — 시트 · 파티 규칙뿐)
상태 화상 [대상] [N턴] [강제] (항상 건다)        상태확률 화상 50% [대상] [1체]        치유 [대상] [독,맹독 | 이상] [N%]        상태초기화 [대상] [전부]
효과해제 [대상] [포텐셜 | 특성 | 소지품 | 전부 | 이름:에이스]   (그 출처가 건 배율 · 위력 · 무시 · 우선도 · 역할 효과를 뗀다)
소지품파괴 [대상] · 소지품모두파괴 · 소지품파괴약탈 (빈손이면 빼앗고 못 빼앗으면 파괴) · 소지품강탈 (자신이 받음) · 소지품주기 · 소지품교환 · 소지품지정 [대상] 느림보꼬리 (빈손이면 새로 지님 · 있으면 바꿈) · 소지품추가 [대상] 느림보꼬리 (지닌 것은 두고 빈 칸에 하나 더)   대상을 안 쓰면 상대1체 · 배틀 한정
회복 1/4 [대상] [전부] [타입:독]        피해 1/8 [대상] [현재|직전|타입:바위] [제외:독] [상태:잠듦] [빈사없음] [드레인]  (드레인 = 깎은 만큼 자신이 회복 · 아군 1체에게도)  · 피해 1/3 대상 받은 (받은 대미지의 1/3 — 「공격을 받았을 때」 포텐셜 · 대상 = 공격한 상대)
날씨 비 5 · 날씨 해제        필드 그래스필드 5 · 룸 트릭룸 5 · 필드상태 중력 5        설치기 [아군|상대] 리플렉터 5
타입 [대상] 추가|변경|제거|원래 불꽃,비행        특성 [대상] 변경 X · 특성 원래        역할 추가|제거 에이스,블로커        추격 [숨김]
비례무시 [대상] [빈사|설치기|설치기피해|반동|반동빈사] [조건] [1회] [N턴]  (반동빈사 = 반동으로는 「빈사」가 되지 않음 · 1회 = 한 번 막으면 사라짐)        우선도 +1 [대상] [타입:X] [물리|특수|변화] [태그:회복] [조건] [이번턴]
공통 조건 (위력 · 완화 · 회피 · 비례무시 · 강화무시 · 우선도 · 추가효과 줄 뒤에): 기술:이름 · 상대타입:물 · 상태:X · 상대상태:X · 날씨:밤 · 필드:X · HP≤1/2 · 자진설치:리플렉터 · 적진설치:X · 랭크:방어≥2 · 랭크:급소≥2 (이번 기술의 C) · 필중기 · 소지품:목탄 · 이계:이름 · 턴:4배수 · 특성:배짱 · 해석됨 · 상대해석됨 · 자신역할:에이스 · 자세:날개의자세 (마지막에 쓴 「자세」 기술)        위력 =100 기술:히트스탬프 (고정 위력)
종족치 랭크 조건 (위 줄들 뒤에 · 조건 줄에도): 종족치:공격≤B (자신) · 상대종족치:HP≥A+ (상대) · 종족치:공격=상대 (같은 능력끼리) · 상대종족치:방어<공격 (오른쪽 능력만 쓰면 반대편 것) · 자신X / 상대X — 판정할 때마다 지금 종족치로, 사다리 순서(B+ 는 「B 이하」 아님)
종족치변경 [대상] 공격+1 방어-1 특공=A 스피드=150 복사:상대최고 [N턴 | 이번턴]  (배틀 중 종족치 · 1랭크 = 알파벳 등급 하나 · 해제 · 교대 · 지속 끝에 원래대로)
조건부 배율: 배율 공격×1.5 상태:이상 · 배율 특방×1.33 날씨:밤 · 배율 특공×1.5 아군특성:플러스 (조건이 맞을 때만 곱한다 — 상태:이상 = 상태 이상 아무거나 · 아군타입:X · 아군특성:X = 자신을 뺀 필드 위 아군)
성별 · 타입 비교 (조건 토큰): 성별:♀ (자신) · 상대성별:♂ (수컷 · 암컷 · 무성) · 같은타입 · 다른타입 (자신과 상대의 타입이 하나라도 같은지)
추가효과 ×2 | =5할 | 반드시 | 부여 10할 벌레침략 | 바꾸기 10할 회복봉인 [타입:X] [태그:Y] [조건 · 기술머신] [이번턴]  (자신의 기술 추가 효과)        추가효과면역 [조건 · 위력≤40 · 상대랭크:특공≤-1]  (받는 쪽 — 추가 효과를 받지 않는다)        HP=1
에리어이동 [자신|아군1체|대상] (자리 고르는 창)        폼체인지 [대상] [폼 이름]        이계 이름 [N턴] (그 포켓몬 · 트레이너의 「필드 전개」 칸에서 이름으로 찾아 편다)        조건 이계:이름 · 조건 날씨:밤        끌어오기 · 회피 · 반사 … 줄 끝 「이번턴」 = 이번 턴만        끌어오기무시 [타입:X] [물리|특수|변화기]  (끌어오기 · 「날따름」에 끌려가지 않는다)
우선도 조건 (공통 조건 자리에): 우선도+ · 우선도- · 상대우선도+ · 아군우선도- · 우선도+2이상 · 상대우선도-7 · 우선도-3이하  (아군/상대 = 기술을 쓰는 쪽이 이 효과 주인의 아군인지 상대인지 · 숫자만 쓰면 딱 그 우선도)
지속 줄 앞 확률(저확률: 완화 ×0.75 … · 30% 강화무시 …)은 걸 때가 아니라 판정할 때마다 굴린다 (위력 · 완화 · 회피 · 강화무시 · 우선도 · 비례무시 — 「이번턴」 줄은 걸 때 한 번)
면역 [대상] 잠듦,마비 · 면역 이상 [공통 조건 · HP가득 · 상태:X]        감소무시 [대상] [공격] [N턴]  (내 능력이 깎이지 않음)        강화무시 [공격시|받음|양방향] [방어 회피 공격 명중|양쪽] [감소|모두] [랭크|배율]  (상대 능력 변화를 계산에서 뺌 · 상승·감소 = 랭크 ±N · 강화·저하 = 배율 ×)        하늘위 [대상] [N턴]
랭크 [대상] 무작위2개+1 [명중회피포함]        상태턴 [대상] 혼란|전부|부정 +1|-1|=2        다음기술 [대상] 필중 유턴 추격 우선도+1 급소+1 확정급소 위력×1.5        확률 +20% [대상] [N회] [N턴] · 확률 반드시 · 확률 해제
줄 앞 확률: 5할 상태 혼란 상대1체 · 30% 랭크 공격+1 · 저확률 상태 풀죽음 상대1체        줄 끝 「있는한」: 그 효과는 쓴 포켓몬이 필드를 떠나면 풀린다 (효과 글에 「필드 위에 있는 한」이 있으면 저절로)
종족치 방어,특방 +1 · 종족치 스피드 최대 (시트 종족치에 반영)        상태수정 아쿠아링 1/6 (이 포켓몬의 상태 변화 비율)
예고 미래예지 [위력 120] [기술 미래예지] [대상]        변신 [대상] [그림유지] · 변신 해제        철거 [상대|양쪽] [장벽|전부]        반드시교대 [대상] [N턴]
수세유지 [기술:우드혼,…] [타입:풀] [물리|특수] [HP≤1/2]  (그 기술로 공격해도 자신의 【수세】 효과가 켜진 채)
대상지정 [상대1체|아군1체|자신포함아군1체|아무나1체]  (웹툴 지시 입력에서 이 포텐셜을 선행 입력할 때 기술처럼 대상을 찍어 둔다 · 발동하면 구문의 「1체」가 그 대상)
기술지정 [상대|아군]  (선행 입력할 때 기술 이름 하나를 고른다 · 해석된 기술 + DB 검색) — 위력 · 완화 줄의 「지정기술」 = 그 기술을 이번 턴 나에게 내보낸 상대에게만 · 「상대공격」 = 다른 편의 기술만 · 「급소방호-4」 = 급소에 맞기 쉬워짐(C+4)
확인 "조건 문장"  (발동 때 물어본다)        조건 아군빈사 · 조건 HP≤1/2 · 조건 상태:날따름
기술 분류: 위력 · 완화 · 회피 줄의 물리(기) · 특수(기) · 변화(기) — 「완화 ×0 변화기」 = 변화기 무효 · 우선도 줄도 같음 · 「조건 명중 물리기」 = 자신의 물리기가 맞았을 때
랭크전환 방어↔특방 [상승|감소] (필드에 있는 동안 이 포켓몬의 랭크 변화를 서로 뒤바꿈) · 랭크전환 특방→방어 상승 (대신) · 랭크교환 방어↔특방 (지금 랭크를 한 번 맞바꿈) · 랭크교환 서로 방어/특방 (자신과 대상 — 가드스왑)
미루기: 완화 ×1 미룸 (빈사가 될 대미지) · 완화 ×1 미룸 항상 (받는 대미지 전부) · 앞에 「저확률」이면 맞을 때마다 굴림 · 진영 조건 토큰 자진설치:이때다! · 적진설치:스텔스록
방어 관통 · 해제: 위력 ×1 방어관통|방어해제 [전체기|단일기] [이번턴] (상대 「방어」 상태를 뚫음 · 해제는 풀어 버림) · 맞는 쪽 완화 ×1 관통무시 (관통 · 해제를 받지 않음)
상성 바꾸기: 위력 ×1 상성×2 상대타입:강철 [타입:X|태그:베기] (참철 꼴 — 받는 쪽 그 타입 몫의 상성을 N 배로 · 상성×1 · 상성×1/2 도)
분류 고르기: 위력 ×1 분류최대 (셸암즈 꼴 — 「물리기」「특수기」 중 대상에게 대미지가 큰 쪽으로, 접촉도 따라감) · 조건 토큰 기능확장 = 이번 기술이 「기능 확장」일 때만 (예: 위력 ×1 분류최대 기능확장)
기술자체: 완화 줄 끝에 「기술자체」 = 이 포켓몬이 필드에 있는 동안 상대 편이 내보낸 그 기술 자체에 배율 (누가 맞든 — 자기 편 · 상대 자기 편 모두) · 【수세】는 이 포켓몬 기준 — 예: 병법술 「완화 ×0.8 전체기 수세 기술자체」
소지품 조건 토큰: 소지품:X (자신) · 아군소지품:X (필드 위 다른 아군) · PT에소지품:X[≥N] (PT 필드+벤치 · 살아 있는 포켓몬) · !PT에소지품:X (없거나 다 빈사)
「동안」 줄 = 조건이 맞는 동안만 켜고 안 맞으면 원래대로 (빈사 · 교대 · 부활 때마다 다시 본다): 특성 변경 무기력 !PT에소지품:왕의징표석 동안 · 종족치변경 공격-2 !PT에소지품:왕의징표석 동안 · 포텐셜무효 !PT에소지품:왕의징표석 동안
조건 + 줄 끝 조건 토큰 (발동할 때 한 번 본다 · 상대 = 맞은 대상, 없으면 정면): 조건 랭크:방어≥+1 · 조건 상대랭크:스피드≤-2 · 조건 상대상태:도발 · 조건 필드:그래스필드 · 조건 성별:♀ · 조건 같은타입 · 조건 HP가득        레이드 구간:4
조건 설치기:끈적끈적네트 (자진 · 땅 위 전용 설치기면 땅 위일 때만) · 조건 적진설치기:스텔스록 · 조건 타입:벌레 (자신의 타입) · 조건 소모:나무열매 (방금 다 쓴 소지품 — 「소모했을 때」 효과)
조건 아군타입:풀 (자신 빼고 필드 위 아군에 하나라도) · 조건 PT타입:풀 (소지 전원이 모두 — 벤치 포함) · 조건 PT에타입:풀 (소지에 하나라도) · 조건 적진타입:풀 · 조건 알그룹:괴수 (자신) · 조건 아군알그룹:X · 조건 PT알그룹:X · 조건 PT에알그룹:X · 조건 적진알그룹:X
조건 소지품:생명의구슬 (자신) · 조건 아군소지품:나무열매 · 조건 적진소지품:구애스카프 (상대소지품 도 됨) · 조건 PT소지품:X · 조건 PT에소지품:X   (나무열매 = 「…열매」 · 쥬얼 = 「…쥬얼」 · 빈손 = 아무것도 안 지님)        줄 끝 「대상타입:벌레」: 그 줄의 대상 중 그 타입에게만        감소무시 [대상] [능력] 저하  (랭크 감소에 더해 배율 저하도 막는다)
조건 명중 [기술:돌던지기] [상대타입:물] [타입:바위]  (자신의 기술이 맞았을 때 — 【자동】 이면 웹툴이 맞은 대상마다 저절로, 대상 = 맞은 포켓몬)        강제교대 [대상|상대1체|상대전체]  (배턴터치 없이 나가고 벤치에서 무작위 1마리 · 흡반 · 뿌리박기 · 교대무시는 막힌다)
선택   (여러 효과 중 하나 고르기 · 「선택 여럿」 이면 여러 개를 고른다) — 다음 줄부터 빈 줄까지가 선택지
랭크 아군1체 특공+1
랭크 아군1체 특방+1
또는 이름을 붙여서:  - ① 라벨 → 랭크 공격+1  /  - ② 5할 : 혼란 → 상태 혼란 상대1체
효과 글의 표식: 【등장】 등장 때 자동 · 【상시】 처음 한 번 자동 · 【N/시】 횟수 · 드물게/저확률/중확률/고확률 확률 판정`;
 /* 10-23 망령: 생성기를 무리별 버튼 판으로 — 드롭다운 33개에서 찾지 않게 */
 const GROUPS=[['능력치',[['rank','랭크'],['mult','배율'],['rrand','무작위 능력치'],['statset','실수치 (배틀)'],['reset','초기화']]],
  ['위력 · 급소',[['boost','위력 강화'],['guard','위력 완화'],['eva','회피 강화 (조건)'],['next','다음 기술 부여']]],
  ['상태',[['state','상태 걸기'],['statefx','확률로 걸기'],['cure','치유'],['stcount','턴 조정'],['resetst','상태 초기화'],['immune','면역'],['stmod','회복 · 대미지 비율']]],
  ['HP',[['heal','회복'],['dmg','대미지 (비례 · 타입)'],['future','예고 공격']]],
  ['필드',[['weather','날씨'],['terrain','필드 · 룸'],['etc','필드의 상태'],['object','설치기 · 벽'],['clearobj','철거']]],
  ['행동',[['prio','우선도'],['pursuit','추격'],['freesw','반드시 교대'],['freeswitch','임의 교대'],['forceswitch','강제 교대'],['usemove','기술 내보내기']]],
  ['특수',[['extra','추가 공격'],['mvtype','기술 타입'],['scrappy','무효 관통'],['evade','N할 회피'],['secx','추가 효과 배율'],['redirect','끌어오기'],['bounce','반사'],['mold','특성 무시'],['protect','변경 보호'],['ext','지속 연장'],['nodex','해석 차단'],['keepdef','수세 유지']]],
  ['무시',[['ignoreup','상대 상승·강화 / 감소·저하 무시 (계산에서 뺌)'],['nodrop','감소 무시 (내 능력이 안 깎임)'],['noind','비례 · 설치기 무시'],['float','하늘 위']]],
  ['소지품',[['item','파괴 · 빼앗기 · 건네기'],['itemset','변경'],['itemadd','추가']]],
  ['모습',[['type','타입'],['trait','특성'],['transform','변신'],['role','역할']]],
  ['발동 조건',[['choice','선택지'],['chance','확률 보정'],['confirm','확인 질문'],['cond','자동 조건']]],
  ['시트',[['baseup','종족치'],['statadd','실수치']]]];
 const KINDS=GROUPS.flatMap(g=>g[1]);
 const DESC={item:'상대(대상)의 소지품을 파괴 · 강탈 · 맞바꾸기 하거나, 자신의 것을 건네준다 (배틀 한정 · 점착 · 보호 소지품이 막는다)',itemset:'대상의 1번 칸 소지품을 정한 것으로 바꾼다 — 빈손이면 새로 지닌다 (배틀 한정 · 점착 · 보호 소지품이 막는다)',itemadd:'지닌 소지품은 그대로 두고 빈 칸에 하나 더 지닌다 — 1번 칸이 비면 1번, 아니면 2 · 3번 칸 (3칸까지 · 배틀 한정)',rank:'능력 랭크를 올리거나 내린다',mult:'능력에 배율을 곱한다 (해제하면 되돌린다)',rrand:'정한 능력 중 무작위로 골라 랭크 · 배율을 바꾼다',reset:'랭크 · 배율을 처음으로',
  boost:'조건이 맞는 기술의 위력을 올린다 (공격 쪽)',guard:'조건이 맞는 기술의 대미지를 줄인다 (받는 쪽)',next:'다음에 쓰는 기술 한 번에 필중 · 유턴 · 추격 · 우선도 · 급소를 붙인다',
  state:'상태 변화를 건다 (면역 · 필드 판정 포함)',statefx:'확률로 상태 변화를 건다',cure:'상태 변화를 푼다',stcount:'걸려 있는 상태의 남은 턴을 늘리거나 줄인다 (0이 되면 풀린다)',resetst:'상태 이상 · 부정 상태를 한 번에 푼다',immune:'그 상태에 걸리지 않는다',stmod:'이 포켓몬이 그 상태일 때 턴 종료 회복 · 대미지 비율',
  heal:'HP 를 회복한다',dmg:'최대 HP 비례 · 현재 HP 비례 · 타입 상성 비례 대미지',future:'다음 턴 끝에 덮치는 예고 공격 (미래예지)',
  weather:'날씨를 바꾼다',terrain:'필드 · 룸을 깐다',etc:'중력 · 물놀이 같은 필드의 상태',object:'벽 · 설치기를 깐다',clearobj:'설치기 · 벽을 걷어낸다',
  prio:'기술의 우선도를 바꾼다',pursuit:'따라가때리기 · 추격 무시',freesw:'교대 제한을 받지 않고 반드시 교대',
  ignoreup:'상대의 랭크 상승 · 감소를 무시한다 (천진 · 성스러운칼)',nodrop:'자신의 능력이 내려가지 않는다',noind:'비례 대미지 · 설치기 · 강제 교대를 무시한다',float:'땅 위 효과를 받지 않는다',
  type:'타입을 더하거나 바꾼다',trait:'특성을 바꾼다',transform:'상대로 변신한다',role:'역할(에이스 · 블로커 …) 취급',
  choice:'여러 효과 중 고르게 한다 — 이 다음에 넣는 줄이 하나씩 선택지가 된다',chance:'이 포켓몬의 확률 효과가 더 잘 (또는 반드시) 발동한다',confirm:'발동할 때 조건을 물어본다',cond:'조건이 맞을 때만 자동으로 이어 간다',
  baseup:'시트 종족치를 올린다 (제작기 시트에 반영)',forceswitch:'대상을 강제 교대시킨다 — 배턴터치 없이 나가고 벤치에서 무작위 1마리 (흡반 · 뿌리박기 · 교대무시는 막는다). 「명중했을 때」는 자동 조건 줄을 앞에',freeswitch:'그 자리에서 임의 교대 창을 연다 (맞았을 때 · 턴 종료 뒤 같은 계기에)',usemove:'그 기술을 내보낸다 — 공격 창을 그 기술로 연다 (기술 목록에 없어도 기술 DB 에서)',extra:'맞는 기술이 포켓몬 하나에게 명중하면 1번 더 공격 (난무 · 흡혈귀)',mvtype:'기술의 타입을 바꾼다 (카세트 · 메모리 · 스킨)',scrappy:'무효 타입에도 맞는다 (배짱 · 코어드릴)',evade:'N할로 공격을 피한다',secx:'추가 효과(N할) 발생률을 곱한다',redirect:'상대의 단일 대상 기술을 자신에게 끌어온다 (피뢰침 · 마중물 · 음절초)',bounce:'상대의 변화기를 되받아친다 (매직미러)',keepdef:'그 기술로 공격해도 자신의 【수세】 효과가 켜진 채 (「HP : 1/2 이하」일 때 「우드혼」을 내보낼 때 【수세】가 적용된다)',mold:'자신의 기술이 상대의 특성(완화)을 무시한다 (틀깨기)',protect:'특성 · 소지품이 바뀌거나 없어지지 않는다',ext:'날씨 · 필드 · 벽의 지속 턴을 늘린다',nodex:'자신에 대한 데이터 해석을 막는다',statadd:'시트 실수치에 수를 더하거나 뺀다 (제작기 시트에 반영)',statset:'배틀 중 실수치를 더하기 · 정하기 · 곱하기 · 상대와 교환 · 평균 · 내 두 능력 맞바꿈 (교대하면 원래대로)'};
 const BU_STS=['HP','공격','방어','특공','특방','스피드'];
 const STMOD_STS=[['아쿠아링','1/8'],['뿌리박기','1/16'],['환희의노래','1/16'],['희망사항','1/2'],['씨뿌리기','1/8'],['독','1/8'],['화상','1/16'],['악몽','1/4'],['저주','1/4'],['조이기','1/8']];
 const TG=['self','ally','enemy','others','all','ally1','adj','enemy1','any1','randother','randenemy','randall','area'];
 const TYPES=['Normal','Fire','Water','Electric','Grass','Ice','Fighting','Poison','Ground','Flying','Psychic','Bug','Rock','Ghost','Dragon','Dark','Steel','Fairy'];
 const STATS=['attack','defense','specialattack','specialdefense','speed','accuracy','evasion','critical','critical_buff'];
 const sel=(id,opts,v,extra)=>`<select id="${id}" ${extra||''}>${opts.map(o=>`<option value="${esc(o[0])}" ${String(o[0])===String(v)?'selected':''}>${esc(o[1])}</option>`).join('')}</select>`;
 const tgSel=(id,v)=>sel(id,TG.map(t=>[t,FX().TGT_KO[t]]),v||'self');
 const tySel=(id,v,none)=>sel(id,[...(none?[['',none]]:[]),...TYPES.map(t=>[t,FX().TYPE_KO[t]])],v||'');
 const stOpts=()=>{const st=(DB().states||{}).st||{};return Object.keys(st).map(k=>[k,st[k].ko])};
 const stSel=(id,v)=>sel(id,stOpts(),v||'Burn');
 function genForm(kind){const K=FX();const ko=K.STAT_KO;
  const statsRow=mult=>`<div class="ggrid">${STATS.map(k=>`<label>${ko[k]} <input type="number" step="${mult?'0.01':'1'}" class="n xs" data-g="st_${k}" value="${mult?1:0}"></label>`).join('')}</div>`;
  switch(kind){
   case 'rank':return `<div class="row">대상 ${tgSel('g_tgt')} <label><input type="checkbox" data-g="temp"> 임시 (턴 종료까지)</label> <label><input type="checkbox" data-g="forced"> 강제 (감소 무시·흰안개 무시)</label></div>${statsRow(false)}`;
   case 'mult':return `<div class="row">대상 ${tgSel('g_tgt')} <label><input type="checkbox" data-g="temp"> 임시</label></div>${statsRow(true)}`;
   case 'boost':case 'guard':case 'eva':return `<div class="ggrid"><label>배율 ×<input type="number" step="0.01" class="n" data-g="v" value="${kind==='boost'?1.3:kind==='eva'?1.1:0.75}"></label><label>대상 ${tgSel('g_tgt')}</label><label>타입 (쉼표) <input type="text" data-g="types" placeholder="불꽃,물 (비우면 모든 타입)"></label>
     <label>분류 ${sel('g_cat',[['all','모두'],['physical','물리'],['special','특수']],'all')}</label><label>상성 ${sel('g_eff',[['all','상관없음'],['super','효과 굉장'],['weak','효과 별로'],['normal','1배']],'all')}</label><label>범위 ${sel('g_rng',[['all','모두'],['single','단일기'],['multi','전체기']],'all')}</label>
     <label>타입 일치 ${sel('g_sb',[['','상관없음'],['stab','일치'],['nonstab','비일치']],'')}</label><label>태그 (쉼표) <input type="text" data-g="tg" placeholder="소리,접촉"></label><label>위력 ≥ <input type="number" class="n xs" data-g="pmin" value="0"></label><label>위력 ≤ <input type="number" class="n xs" data-g="pmax" value="0"></label>
     <label>역할 상대 <input type="text" data-g="ro" placeholder="에이스"></label><label>자세 ${sel('g_st',[['','상관없음'],['def','【수세】'],['off','【공세】']],'')}</label><label>급소 ${sel('g_cx',[['','보통'],['sure','확정 급소'],['none','급소에 맞지 않음']],'')}</label><label>급소 방호 <input type="number" class="n xs" data-g="cg" value="0"></label><label>급소 C+ <input type="number" class="n xs" data-g="cr" value="0"></label>
     <label>횟수 <input type="number" class="n xs" data-g="uses" value="-1" title="-1 = 해제 전까지"></label><label><input type="checkbox" data-g="turn"> 이번 턴만</label><label>지속 턴 <input type="number" class="n xs" data-g="tl" value="0"></label><label><input type="checkbox" data-g="remove"> 해제</label></div>`;
   case 'state':return `<div class="row">상태 ${stSel('g_state')} 대상 ${tgSel('g_tgt','enemy1')} <label>턴 <input type="number" class="n xs" data-g="count" value="-1" title="-1 = 기본"></label> <label><input type="checkbox" data-g="forced"> 강제</label></div>`;
   case 'statefx':return `<div class="row">상태 ${stSel('g_state')} 대상 ${tgSel('g_tgt','enemy1')} <label>확률 <input type="number" class="n xs" data-g="chance" value="30">%</label> <label><input type="checkbox" data-g="one"> 1체만</label></div>`;
   case 'cure':return `<div class="row">대상 ${tgSel('g_tgt')} <label>상태 (쉼표, 비우면 모든 이상) <input type="text" data-g="states" placeholder="독,맹독"></label> <label>확률 <input type="number" class="n xs" data-g="chance" value="100">%</label></div>`;
   case 'heal':return `<div class="row">대상 ${tgSel('g_tgt')} <label>양 <input type="text" class="n" data-g="value" value="1/4" placeholder="1/4 · 30 · 전부"></label> <label>타입 한정 ${tySel('g_ytype','', '없음')}</label></div>`;
   case 'dmg':return `<div class="row">대상 ${tgSel('g_tgt','enemy1')} <label>양 <input type="text" class="n" data-g="value" value="1/8"></label> 기준 ${sel('g_basis',[['max','최대 HP'],['cur','현재 HP'],['last','직전에 입힌 대미지'],['type','타입 상성 비례']],'max')} <label>제외 타입 ${tySel('g_xtype','', '없음')}</label> <label><input type="checkbox" data-g="nofaint"> 빈사 없음</label> <label title="깎은 만큼 자신이 회복 (회복봉인이면 없음 · 대상이 해감액이면 반대로 피해)"><input type="checkbox" data-g="drain"> 드레인</label></div>
     <div class="fxg-ty"><span class="small dim">타입 상성 비례 — 누르면 타입 비례가 된다 (여럿이면 상성을 곱한다)</span>${TYPES.map(t=>`<label class="fxg-tyc"><input type="checkbox" data-g="aty_${t}"> ${esc(FX().TYPE_KO[t])}</label>`).join('')}</div>`;
   case 'weather':return `<div class="row">날씨 ${sel('g_w',[['','해제'],['맑음','맑음'],['비','비'],['모래바람','모래바람'],['눈','눈'],['싸라기눈','싸라기눈'],['짙은안개','짙은안개'],['밤','밤'],['별하늘','별하늘'],['폭우','폭우'],['큰가뭄','큰가뭄'],['극한','극한'],['깊은밤','깊은밤'],['난기류','난기류'],['random','무작위']],'비')} <label>턴 <input type="number" class="n xs" data-g="count" value="5"> (1000 = 계속)</label></div>`;
   case 'terrain':return `<div class="row">${sel('g_t',[['','해제'],['그래스필드','그래스필드'],['일렉트릭필드','일렉트릭필드'],['미스트필드','미스트필드'],['사이코필드','사이코필드'],['트릭룸','트릭룸'],['매직룸','매직룸'],['원더룸','원더룸'],['블랙룸','블랙룸']],'그래스필드')} <label>턴 <input type="number" class="n xs" data-g="count" value="5"></label></div>`;
   case 'etc':return `<div class="row">${sel('g_e',[['','해제'],['중력','중력'],['물놀이','물놀이'],['흙놀이','흙놀이']],'중력')} <label>턴 <input type="number" class="n xs" data-g="count" value="5"></label></div>`;
   case 'object':return `<div class="row">진영 ${sel('g_side',[['ally','아군'],['enemy','상대']],'ally')} 설치기 ${sel('g_o',['리플렉터','빛의장막','오로라베일','신비의부적','흰안개','주술','검은숲','얼음의장벽','신기루','순풍','무지개','습원','불바다','돌격','희망사항','압정뿌리기','독압정','스텔스록','끈적끈적네트','기뢰','지뢰원','가시원','장미원','불기둥','아이스번','얼음꼬챙이','전기발판','트램펄린','저주의묘','악의소굴','전파탑'].map(x=>[x,x]),'리플렉터')} <label>턴 <input type="number" class="n xs" data-g="count" value="5"></label></div>`;
   case 'type':return `<div class="row">대상 ${tgSel('g_tgt')} ${sel('g_mode',[['add','타입 추가'],['set','타입 변경'],['reset','원래대로']],'add')} <label>타입 (쉼표) <input type="text" data-g="types" placeholder="불꽃,비행"></label> <label>지속 <input type="number" class="n" data-g="turns" min="0" placeholder="계속" style="width:56px">턴</label></div>`;
   case 'item':return `<div class="row">대상 ${tgSel('g_tgt','enemy1')} ${sel('g_mode',[['break','한 칸 파괴'],['rob','파괴(약탈) — 빈손이면 빼앗고 못 빼앗으면 파괴'],['breakall','모두 파괴'],['steal','강탈 (자신이 받음)'],['give','자신의 것을 건네줌'],['swap','맞바꾸기']],'break')}</div>`;
   case 'itemset':case 'itemadd':return `<div class="row">대상 ${tgSel('g_tgt','self')} <label>소지품 <input type="text" data-g="name" placeholder="느림보꼬리"></label></div>`;
   case 'trait':return `<div class="row">대상 ${tgSel('g_tgt','enemy1')} ${sel('g_mode',[['set','특성 변경'],['reset','원래대로']],'set')} <label>특성 <input type="text" data-g="tn" placeholder="미라"></label> <label>지속 <input type="number" class="n" data-g="turns" min="0" placeholder="계속" style="width:56px">턴</label></div>`;
   case 'prio':return `<div class="row">대상 ${tgSel('g_tgt')} <label>우선도 <input type="number" step="0.5" class="n xs" data-g="v" value="1"></label> ${sel('g_mode',[['add','더하기'],['set','고정'],['off','해제']],'add')} 분류 ${sel('g_cat',[['all','모두'],['물리','물리'],['특수','특수'],['변화','변화']],'all')} 타입 ${tySel('g_type','', '제한 없음')} <label>태그 <input type="text" data-g="tag" placeholder="회복,드레인"></label> ${sel('g_dur',[['keep','해제 전까지'],['turn','이번 턴']],'keep')}</div>`;
   case 'immune':return `<div class="row">대상 ${tgSel('g_tgt')} <label>상태 (쉼표) <input type="text" data-g="states" placeholder="잠듦,마비 · 이상"></label> <label><input type="checkbox" data-g="off"> 해제</label></div>`;
   case 'nodrop':return `<div class="row">대상 ${tgSel('g_tgt')} 능력 ${sel('g_st',[['','모든 능력'],...STATS.slice(0,7).map(k=>[k,ko[k]])],'')} <label>턴 <input type="number" class="n xs" data-g="turns" value="-1"></label> <label><input type="checkbox" data-g="off"> 해제</label></div>`;
   case 'ignoreup':return `<div class="row">${sel('g_dir',[['atk','공격할 때 상대의'],['recv','받을 때 상대의'],['both','주고받을 때 상대의 (천진)']],'atk')} <label><input type="checkbox" data-g="sc_def" checked> 방어</label> <label><input type="checkbox" data-g="sc_eva" checked> 회피</label> <label><input type="checkbox" data-g="sc_atk"> 공격</label> <label><input type="checkbox" data-g="sc_acc"> 명중</label> ${sel('g_iud',[['up','상승·강화 무시'],['down','감소·저하 무시'],['all','변화 모두 무시']],'up')} ${sel('g_lv',[['','랭크 + 배율'],['rank','랭크만 (상승·감소 ±N)'],['mod','배율만 (강화·저하 ×)']],'')} <label>역할 상대 <input type="text" data-g="ro" placeholder="에이스"></label> <label><input type="checkbox" data-g="off"> 해제</label></div><div class="small dim">공격할 때는 상대의 방어 · 회피, 받을 때는 상대의 공격 · 명중이 쓰인다</div>`;
   case 'noind':return `<div class="row">대상 ${tgSel('g_tgt')} ${sel('g_kind',[['','비례 대미지를 받지 않는다'],['noko','비례 대미지로는 빈사가 되지 않는다'],['hazard','설치기를 무시한다'],['hazdmg','설치기의 비례 대미지를 받지 않는다'],['recoil','반동 비례 대미지를 받지 않는다'],['switch','강제 교대를 받지 않는다']],'')} <label>턴 <input type="number" class="n xs" data-g="turns" value="-1"></label> <label><input type="checkbox" data-g="off"> 해제</label></div>`;
   case 'float':return `<div class="row">대상 ${tgSel('g_tgt')} <label>턴 <input type="number" class="n xs" data-g="turns" value="-1"></label> <label><input type="checkbox" data-g="off"> 해제</label></div>`;
   case 'role':return `<div class="row">${sel('g_mode',[['add','추가'],['remove','제거'],['clear','초기화']],'add')} <label>역할 (쉼표) <input type="text" data-g="roles" placeholder="에이스,블로커"></label></div>`;
   case 'pursuit':return `<div class="row"><label><input type="checkbox" data-g="imm"> 추격 무시 (교대해도 상대의 추격을 받지 않는다)</label> <label>대상 ${tgSel('g_tgt')}</label> <label><input type="checkbox" data-g="hide"> 숨김</label> <label><input type="checkbox" data-g="off"> 해제</label></div>`;
   case 'confirm':return `<div class="row"><label>조건 문장 <input type="text" data-g="q" placeholder="자신이 「특성 : ○○오라」일 때" style="width:360px"></label></div>`;
   case 'statadd':return `<div class="row">${BU_STS.map(s=>`<label><input type="checkbox" data-g="sa_${s}"> ${s}</label>`).join(' ')}</div><div class="row">${sel('g_sam',[['add','더하기 ±N'],['copy','다른 능력과 같게']],'add')} <label>N <input type="number" class="n xs" data-g="n" value="10"></label> <label>같게 할 능력 ${sel('g_saf',['공격','방어','특공','특방','스피드'].map(x=>[x,x]),'특공')}</label></div><div class="small dim">제작기 시트의 실수치에 바로 더한다 (종족치 · 등급은 그대로). 배틀로 가져가면 그 실수치로 나온다</div>`;
   case 'statset':return `<div class="row">대상 ${tgSel('g_tgt')} ${sel('g_sm',[['add','더하기 ±N'],['set','N 으로 정하기'],['mul','× N'],['copy','다른 능력과 같게'],['swap','대상과 교환'],['avg','대상과 평균'],['flip','두 능력 맞바꿈']],'add')} <label>N <input type="number" class="n xs" data-g="n" value="10" step="any"></label> <label>같게 할 능력 ${sel('g_ssf',['공격','방어','특공','특방','스피드'].map(x=>[x,x]),'특공')}</label></div><div class="row">${BU_STS.filter(x=>x!=='HP').map(s=>`<label><input type="checkbox" data-g="ss_${s}"> ${s}</label>`).join(' ')}</div><div class="small dim">배틀 중 실수치(랭크 · 배율 전 값)를 바꾼다. 교환 · 평균은 자신과 대상 사이(대상 기본 상대 1체) · 맞바꿈은 능력 두 개만 (파워트릭처럼). 교대하면 원래대로</div>`;
   case 'forceswitch':return `<div class="row">대상 ${tgSel('g_tgt','enemy1')}</div><div class="small dim">「돌던지기가 물 타입에게 명중했을 때」 같은 계기는 「자동 조건 → 기술이 명중했을 때」 줄을 이 줄 앞에. 구문 「강제교대 대상」</div>`;
    case 'freeswitch':return `<div class="small dim">계기(맞았을 때 · 턴 종료 이후 …)는 효과 글의 【】 표식대로. 구문 「임의교대」</div>`;
   case 'usemove':return `<div class="row"><label>기술 이름 <input type="text" data-g="mv" placeholder="김밥말이"></label></div>`;
   case 'extra':return `<div class="row"><label>타입 (쉼표) <input type="text" data-g="types" placeholder="드래곤 (비우면 모든 기술)"></label> <label>태그 <input type="text" data-g="tg" placeholder="베기"></label> 분류 ${sel('g_ecat',[['','모두'],['물리','물리'],['특수','특수']],'')}</div><div class="row"><label>위력 × <input type="number" step="0.05" class="n xs" data-g="pw" value="0.25"></label> <label><input type="checkbox" data-g="sure" checked> 필중</label> <label>횟수 <input type="number" class="n xs" data-g="n" value="1" min="1"></label></div>`;
   case 'mvtype':return `<div class="row"><label>기술 이름 <input type="text" data-g="mv" placeholder="비우면 아래 타입 · 전부"></label> <label>원래 타입 ${tySel('g_from','', '제한 없음')}</label> → <label>바꿀 타입 ${tySel('g_to','Steel')}</label></div>`;
   case 'scrappy':return `<div class="row"><label>기술 타입 ${tySel('g_st','', '모든 기술')}</label> <label>무효였던 타입 (쉼표) <input type="text" data-g="vs" placeholder="노말,격투"></label> <label><input type="checkbox" data-g="float"> 하늘 위에도</label></div>`;
   case 'evade':return `<div class="row"><label>확률 <input type="number" class="n xs" data-g="p" value="2" min="1" max="10">할</label> 분류 ${sel('g_vcat',[['','모두'],['물리','물리'],['특수','특수'],['접촉','접촉기']],'')} <label>타입 (쉼표) <input type="text" data-g="types"></label> <label>태그 <input type="text" data-g="tg"></label></div>`;
   case 'secx':return `<div class="row"><label>배율 × <input type="number" step="0.5" class="n xs" data-g="v" value="2"></label> <label>타입 (쉼표) <input type="text" data-g="types" placeholder="독"></label> <label>태그 <input type="text" data-g="tg"></label></div>`;
   case 'redirect':return `<div class="row"><label>타입 (쉼표) <input type="text" data-g="types" placeholder="전기"></label> <label>태그 <input type="text" data-g="tg" placeholder="소리"></label> 분류 ${sel('g_rcat',[['','모두'],['물리','물리'],['특수','특수'],['변화기','변화기']],'')}</div><div class="small dim">상대의 「1체」 기술만 끌어온다</div>`;
   case 'bounce':case 'mold':case 'nodex':return `<div class="small dim">${esc(DESC[kind]||'')}</div>`;
   case 'keepdef':return `<div class="row"><label>기술 이름 (쉼표) <input type="text" data-g="mv" placeholder="우드혼 — 비우면 모든 공격 기술"></label> <label>타입 (쉼표) <input type="text" data-g="types" placeholder="풀"></label> 분류 ${sel('g_kcat',[['','모두'],['물리','물리'],['특수','특수']],'')} <label>HP 이하 <input type="text" data-g="hp" placeholder="1/2 — 비우면 늘" style="width:70px"></label></div><div class="small dim">${esc(DESC.keepdef)}</div>`;
   case 'protect':return `<div class="row"><label><input type="checkbox" data-g="pt" checked> 특성</label> <label><input type="checkbox" data-g="pi"> 소지품</label></div>`;
   case 'ext':return `<div class="row"><label>무엇 (쉼표) <input type="text" data-g="what" placeholder="눈 · 날씨 · 필드 · 리플렉터 · 벽"></label> <label>+ <input type="number" class="n xs" data-g="n" value="3">턴</label></div>`;
   case 'baseup':return `<div class="row">${BU_STS.map(s=>`<label><input type="checkbox" data-g="bu_${s}"> ${s}</label>`).join(' ')}</div><div class="row">${sel('g_bm',[['up','랭크 상승'],['down','랭크 감소'],['max','범위 최대화'],['top','가장 높은 종족치와 같은 랭크']],'up')} <label>랭크 <input type="number" class="n xs" data-g="n" value="1" min="1"></label></div><div class="small dim">제작기 시트의 종족치 · 실수치 · 합계에 바로 들어간다 (1랭크 = 한 등급, C→B). 배틀 중엔 바뀌지 않는다</div>`;
   case 'stmod':return `<div class="row">${sel('g_sm',STMOD_STS.map(([k,d])=>[k,k+' (기본 '+d+')']),'아쿠아링')} → <label>비율 <input type="text" class="n xs" data-g="frac" value="1/6"></label></div><div class="small dim">이 포켓몬이 그 상태일 때 턴 종료 회복 · 대미지 비율을 바꾼다 (시트에 적어 두는 값)</div>`;
   case 'future':return `<div class="row"><label>상태 <input type="text" data-g="st" value="미래예지" style="width:90px"></label> <label>위력 <input type="number" class="n xs" data-g="pow" value="0" title="0 = 기술 위력"></label> <label>기술 <input type="text" data-g="mv" placeholder="미래예지" style="width:90px"></label> 대상 ${tgSel('g_tgt','enemy1')}</div><div class="small dim">다음 턴 가장 마지막에 대미지 계산 (공격 창의 「지연」 기술은 자동으로 건다)</div>`;
   case 'transform':return `<div class="row">대상 ${tgSel('g_tgt','enemy1')} <label><input type="checkbox" data-g="keep"> 그림 유지</label> <label><input type="checkbox" data-g="off"> 변신 해제</label></div>`;
   case 'reset':return `<div class="row">${sel('g_rw',[['all','랭크 · 배율 전부'],['rank','랭크만'],['mult','배율만']],'all')} 대상 ${tgSel('g_tgt')}</div>`;
   case 'resetst':return `<div class="row">대상 ${tgSel('g_tgt')} <label><input type="checkbox" data-g="all"> 부정 상태 전부 (끄면 상태 이상만)</label></div>`;
   case 'clearobj':return `<div class="row">${sel('g_cs',[['self','자기 쪽'],['enemy','상대 쪽'],['both','양쪽']],'self')} ${sel('g_cw',[['hazard','설치기'],['wall','장벽'],['all','전부']],'hazard')}</div>`;
   case 'freesw':return `<div class="row">대상 ${tgSel('g_tgt')} <label>턴 <input type="number" class="n xs" data-g="turns" value="-1"></label> <label><input type="checkbox" data-g="off"> 해제</label></div>`;
   case 'cond':return `<div class="row">${sel('g_c',[['ally_fainted','「빈사」 상태인 아군이 있을 때'],['hp_le','HP 가 비율 이하일 때'],['self_state','자신이 이 상태일 때'],['on_hit','자신의 기술이 명중했을 때'],['tyx','타입 · 알그룹 · 소지품이 맞을 때'],['haz','설치기가 깔려 있을 때'],['used','이 소지품을 다 썼을 때']],'ally_fainted')} <label>비율 <input type="text" class="n xs" data-g="frac" value="1/2"></label> <label>상태 ${stSel('g_cst','FollowMe')}</label></div><div class="row"><label>명중: 기술 이름 <input type="text" data-g="hmv" placeholder="돌던지기 (비우면 아무 기술)"></label> <label>상대 타입 <input type="text" data-g="hft" placeholder="물 (쉼표)"></label></div><div class="row"><label>누구 ${sel('g_cwho',[['','자신'],['아군','필드 위 아군 (자신 빼고)'],['PT','소지 전원이 모두'],['PT에','소지에 하나라도'],['적진','적진']],'')}</label> ${sel('g_ctk',[['타입','타입'],['알그룹','알그룹'],['소지품','소지품']],'타입')} <input type="text" data-g="cval" placeholder="풀 · 괴수 · 나무열매 · 빈손 (쉼표)"></div><div class="row"><label>설치기 ${sel('g_chs',[['','자진'],['적진','적진']],'')} <input type="text" data-g="chz" placeholder="끈적끈적네트"></label> <label>소지품 <input type="text" data-g="cuse" placeholder="나무열매"></label></div><div class="small dim">「명중했을 때」는 【자동】 이 붙은 효과면 공격을 적용한 뒤 맞은 대상마다 저절로 (【N/시】 횟수도 깎는다) · 「다 썼을 때」는 웹툴 「소지품 소모」 계기가 알려 준다</div>`;
   case 'rrand':return `<div class="row">대상 ${tgSel('g_tgt')} ${sel('g_rk',[['rank','랭크'],['mult','배율']],'rank')} <label>몇 개 <input type="number" class="n xs" data-g="n" value="1" min="1" max="7"></label> <label>값 <input type="number" step="0.01" class="n xs" data-g="v" value="2" title="랭크면 +2 · -1, 배율이면 1.5"></label> ${sel('g_pool',[['5','공격 · 방어 · 특공 · 특방 · 스피드'],['7','+ 명중 · 회피']],'5')} <label><input type="checkbox" data-g="temp"> 임시</label></div>`;
   case 'next':return `<div class="row">대상 ${tgSel('g_tgt')} <label><input type="checkbox" data-g="sure" checked> 필중</label> <label><input type="checkbox" data-g="uturn"> 유턴 (쓴 뒤 교대)</label> <label><input type="checkbox" data-g="pur"> 추격</label> <label><input type="checkbox" data-g="cx"> 확정 급소</label> <label>우선도 <input type="number" class="n xs" data-g="prio" value="0"></label> <label>급소 + <input type="number" class="n xs" data-g="cr" value="0"></label> <label>위력 × <input type="number" step="0.1" class="n xs" data-g="pw" value="1"></label></div><div class="small dim">다음 기술 한 번 쓰면 사라진다 (공격 창이 필중 · 급소 · 위력을 자동으로 넣는다)</div>`;
   case 'stcount':return `<div class="row">대상 ${tgSel('g_tgt','enemy1')} ${sel('g_stc',[['all','걸린 상태 전부'],['neg','부정 상태 전부'],...stOpts()],'all')} ${sel('g_stm',[['add','늘리기 / 줄이기'],['set','이 턴으로 맞추기']],'add')} <label>턴 <input type="number" class="n xs" data-g="v" value="-1" title="+1 늘림 · -1 줄임"></label></div>`;
   case 'chance':return `<div class="row">대상 ${tgSel('g_tgt')} ${sel('g_cm',[['add','발동 확률 + %p'],['sure','반드시 발동'],['off','보정 해제']],'add')} <label>% <input type="number" class="n xs" data-g="v" value="20"></label> <label>횟수 <input type="number" class="n xs" data-g="uses" value="0" title="0 = 해제 전까지"></label> <label>턴 <input type="number" class="n xs" data-g="turns" value="0"></label></div><div class="small dim">그 포켓몬의 포텐셜 · 특성 · 소지품 확률 굴림에 더해진다 (오레마스 발동 창에서도 그때그때 바꿀 수 있다)</div>`;
   case 'choice':return `<div class="row">${sel('g_chm',[['one','하나만 고른다'],['multi','여러 개 고른다']],'one')}</div><div class="small dim">「줄 추가」 뒤에 넣는 줄이 하나씩 선택지가 된다. 선택지에 이름을 붙이려면 아래 「선택지 이름」 칸에 적는다. 다 넣었으면 「선택지 끝」.</div>`;
  }return ''}
 function genLine(kind,md){const K=FX();const g=k=>{const el=md.querySelector(`[data-g="${k}"]`);return el?(el.type==='checkbox'?el.checked:el.value):''};const s=id=>{const el=$('#'+id,md);return el?el.value:''};const tg=t=>t&&t!=='self'?' '+K.TGT_KO[t].replace(/\s/g,''):'';const tga=t=>' '+K.TGT_KO[t||'enemy1'].replace(/\s/g,'');
  const tyK=txt=>String(txt||'').split(/[,，\s]+/).filter(Boolean).join(',');
  switch(kind){
   case 'rank':case 'mult':{const parts=[];for(const k of STATS){const v=+g('st_'+k);if(kind==='rank'?v!==0:v!==1&&v>0)parts.push(K.STAT_KO[k]+(kind==='rank'?(v>0?'+':'')+v:'×'+v))}if(!parts.length)return '';return (kind==='rank'?'랭크':'배율')+tg(s('g_tgt'))+' '+parts.join(' ')+(g('temp')?' 임시':'')+(g('forced')?' 강제':'')}
   case 'boost':case 'guard':case 'eva':{let l=(kind==='boost'?'위력':kind==='eva'?'회피':'완화')+' ×'+(+g('v')||1)+tg(s('g_tgt'));if(tyK(g('types')))l+=' 타입:'+tyK(g('types'));const cat=s('g_cat');if(cat==='physical')l+=' 물리';if(cat==='special')l+=' 특수';const e=s('g_eff');if(e==='super')l+=' 굉장';if(e==='weak')l+=' 별로';if(e==='normal')l+=' 보통';const r=s('g_rng');if(r==='single')l+=' 단일';if(r==='multi')l+=' 전체기';const sb=s('g_sb');if(sb==='stab')l+=' 자속';if(sb==='nonstab')l+=' 비자속';if(tyK(g('tg')))l+=' 태그:'+tyK(g('tg'));if(+g('pmin'))l+=' 위력≥'+g('pmin');if(+g('pmax'))l+=' 위력≤'+g('pmax');if(tyK(g('ro')))l+=' 역할:'+tyK(g('ro'));const st=s('g_st');if(st==='def')l+=' 수세';if(st==='off')l+=' 공세';const cx=s('g_cx');if(cx==='sure')l+=' 확정급소';if(cx==='none')l+=' 급소없음';if(+g('cg'))l+=' 급소방호'+g('cg');if(+g('cr'))l+=' 급소+'+g('cr');if(+g('uses')>0)l+=' '+g('uses')+'회';if(g('turn'))l+=' 이번턴';if(+g('tl')>0)l+=' '+g('tl')+'턴';if(g('remove'))l+=' 해제';return l}
   case 'state':return '상태 '+String(K.stKo(s('g_state'))).replace(/\s+/g,'')+tga(s('g_tgt'))+(+g('count')>0?' '+g('count')+'턴':'')+(g('forced')?' 강제':'');
   case 'statefx':return '상태확률 '+String(K.stKo(s('g_state'))).replace(/\s+/g,'')+' '+(+g('chance')||100)+'%'+tga(s('g_tgt'))+(g('one')?' 1체':'');
   case 'cure':return '치유'+tg(s('g_tgt'))+' '+(tyK(g('states'))||'이상')+(+g('chance')&&+g('chance')<100?' '+g('chance')+'%':'');
   case 'heal':return '회복 '+(g('value')||'1/4')+tg(s('g_tgt'))+(s('g_ytype')?' 타입:'+K.TYPE_KO[s('g_ytype')]:'');
   case 'dmg':{const ats=TYPES.filter(t=>g('aty_'+t));let b=s('g_basis');if(ats.length)b='type';if(b==='type'&&!ats.length)return '';return '피해 '+(g('value')||'1/8')+tga(s('g_tgt'))+(b==='cur'?' 현재':b==='last'?' 직전':b==='type'?' 타입:'+ats.map(t=>K.TYPE_KO[t]).join(','):'')+(s('g_xtype')?' 제외:'+K.TYPE_KO[s('g_xtype')]:'')+(g('nofaint')?' 빈사없음':'')+(g('drain')?' 드레인':'')}
   case 'weather':{const w=s('g_w');return w?'날씨 '+(w==='random'?'무작위':w)+' '+(+g('count')>=1000?'계속':(+g('count')||5)):'날씨 해제'}
   case 'terrain':{const t=s('g_t');return (/룸$/.test(t)?'룸 ':'필드 ')+(t?t+' '+(+g('count')>=1000?'계속':(+g('count')||5)):'해제')}
   case 'etc':{const e=s('g_e');return '필드상태 '+(e?e+' '+(+g('count')>=1000?'계속':(+g('count')||5)):'해제')}
   case 'object':return '설치기 '+(s('g_side')==='enemy'?'상대 ':'아군 ')+s('g_o')+' '+(+g('count')>=1000?'계속':(+g('count')||5));
   case 'type':{const m=s('g_mode');return '타입'+tg(s('g_tgt'))+' '+({add:'추가',set:'변경',reset:'원래'})[m]+(m==='reset'?'':' '+tyK(g('types'))+(+g('turns')>0?' '+(+g('turns'))+'턴':''))}
   case 'itemset':case 'itemadd':{const n=(g('name')||'').trim();return n?(kind==='itemadd'?'소지품추가':'소지품지정')+tga(s('g_tgt'))+' '+n:''}
   case 'item':{const m=s('g_mode');return '소지품'+({rob:'파괴약탈',break:'파괴',breakall:'모두파괴',steal:'강탈',give:'주기',swap:'교환',set:'지정'})[m]+tga(s('g_tgt'))+(m==='set'?' '+(g('name')||''):'')}
   case 'trait':return '특성'+tga(s('g_tgt'))+' '+(s('g_mode')==='reset'?'원래':'변경 '+g('tn')+(+g('turns')>0?' '+(+g('turns'))+'턴':''));   /* 11-03 21:01 망령: 타입 · 특성 변경 턴제 */
   case 'prio':{const m=s('g_mode');return '우선도 '+(m==='set'?'=':(+g('v')>0?'+':''))+(+g('v')||0)+tg(s('g_tgt'))+(s('g_type')?' 타입:'+K.TYPE_KO[s('g_type')]:'')+(s('g_cat')!=='all'?' '+s('g_cat'):'')+(g('tag')?' 태그:'+tyK(g('tag')):'')+(s('g_dur')==='turn'?' 이번턴':'')+(m==='off'?' 해제':'')}
   case 'immune':return '면역'+tg(s('g_tgt'))+' '+(tyK(g('states'))||'이상')+(g('off')?' 해제':'');
   case 'nodrop':return '감소무시'+tg(s('g_tgt'))+(s('g_st')?' '+K.STAT_KO[s('g_st')]:'')+(+g('turns')>0?' '+g('turns')+'턴':'')+(g('off')?' 해제':'');
   case 'ignoreup':{const sc=[['def','방어'],['eva','회피'],['atk','공격'],['acc','명중']].filter(([k])=>g('sc_'+k)).map(x=>x[1]);if(!sc.length)return '';const d=s('g_iud');return '강화무시 '+(s('g_dir')==='both'?'양방향':s('g_dir')==='recv'?'받음':'공격시')+' '+(sc.length===4?'양쪽':sc.join(' '))+(d==='all'?' 모두':d==='down'?' 감소':'')+(s('g_lv')==='rank'?' 랭크':s('g_lv')==='mod'?' 배율':'')+(tyK(g('ro'))?' 역할:'+tyK(g('ro')):'')+(g('off')?' 해제':'')}
   case 'noind':if(s('g_kind')==='switch')return '교대무시'+tg(s('g_tgt'))+(+g('turns')>0?' '+g('turns')+'턴':'')+(g('off')?' 해제':'');return '비례무시'+tg(s('g_tgt'))+({'':'',noko:' 빈사',hazard:' 설치기',hazdmg:' 설치기피해',recoil:' 반동'})[s('g_kind')]+(+g('turns')>0?' '+g('turns')+'턴':'')+(g('off')?' 해제':'');
   case 'float':return '하늘위'+tg(s('g_tgt'))+(+g('turns')>0?' '+g('turns')+'턴':'')+(g('off')?' 해제':'');
   case 'role':return '역할 '+({add:'추가',remove:'제거',clear:'초기화'})[s('g_mode')]+' '+tyK(g('roles'));
   case 'pursuit':return '추격'+(g('imm')?' 무시'+tg(s('g_tgt')):'')+(g('off')?' 해제':'')+(g('hide')?' 숨김':'');
   case 'confirm':return '확인 "'+g('q')+'"';
   case 'statadd':{const st=BU_STS.filter(x=>g('sa_'+x));if(s('g_sam')==='copy'){const f=s('g_saf');const st2=st.filter(x=>x!=='HP'&&x!==f);if(!st2.length)return '';return '실수치 '+st2.join(',')+' ='+f}const n=Math.round(+g('n')||0);if(!st.length||!n)return '';return '실수치 '+st.join(',')+' '+(n>0?'+':'')+n}
   case 'statset':{let st=BU_STS.filter(x=>x!=='HP'&&g('ss_'+x));const m=s('g_sm');if(m==='copy'){st=st.filter(x=>x!==s('g_ssf'));if(!st.length)return '';return '실수치변경 '+st.join(',')+' ='+s('g_ssf')+tg(s('g_tgt'))}const n=+g('n')||0;if(!st.length)return '';if(m==='flip'&&st.length!==2)return '';const t=s('g_tgt');const tgw=(m==='swap'||m==='avg')?tga(t==='self'?'enemy1':t):tg(t);
    return '실수치변경 '+st.join(',')+' '+({add:(n>0?'+':'')+Math.round(n),set:'='+Math.round(n),mul:'×'+n,swap:'교환',avg:'평균',flip:'맞바꿈'}[m])+tgw}
   case 'freeswitch':return '임의교대';
    case 'forceswitch':return '강제교대'+tga(s('g_tgt'));
   case 'usemove':{const v=String(g('mv')||'').trim();return v?'기술사용 '+v:''}
   case 'extra':{const pw=+g('pw')||0.25;const n=Math.max(1,+g('n')||1);return '추가공격'+(g('types').trim()?' 타입:'+tyK(g('types')).replace(/ /g,''):'')+(g('tg').trim()?' 태그:'+g('tg').trim().replace(/\s+/g,''):'')+(s('g_ecat')?' '+s('g_ecat'):'')+(pw!==0.25?' 위력×'+pw:'')+(g('sure')?'':' 명중판정')+(n>1?' '+n+'번':'')}
   case 'mvtype':{const to=s('g_to');if(!to)return '';const mv=String(g('mv')||'').trim();const fr=s('g_from');return '기술타입 '+(mv||(fr?'타입:'+K.TYPE_KO[fr]:'전부'))+' '+K.TYPE_KO[to]}
   case 'scrappy':{const st=s('g_st');const vs=tyK(g('vs')).replace(/ /g,'');if(!vs&&!g('float'))return '';return '명중확장 '+(st?K.TYPE_KO[st]:'전부')+(vs?' '+vs:'')+(g('float')?' 하늘위':'')}
   case 'evade':{const p=Math.max(1,Math.min(10,+g('p')||2));return '회피 '+p+'할'+(s('g_vcat')?' '+s('g_vcat'):'')+(g('types').trim()?' 타입:'+tyK(g('types')).replace(/ /g,''):'')+(g('tg').trim()?' 태그:'+g('tg').trim().replace(/\s+/g,''):'')}
   case 'secx':return '추가효과 ×'+(+g('v')||2)+(g('types').trim()?' 타입:'+tyK(g('types')).replace(/ /g,''):'')+(g('tg').trim()?' 태그:'+g('tg').trim().replace(/\s+/g,''):'');
   case 'redirect':return '끌어오기'+(g('types').trim()?' 타입:'+tyK(g('types')).replace(/ /g,''):'')+(g('tg').trim()?' 태그:'+g('tg').trim().replace(/\s+/g,''):'')+(s('g_rcat')?' '+s('g_rcat'):'');
   case 'bounce':return '반사 변화기';case 'mold':return '특성무시';case 'nodex':return '해석차단';
   case 'keepdef':{const mv=String(g('mv')||'').split(/[,·\s]+/).filter(Boolean).join(',');const hp=String(g('hp')||'').replace(/\s+/g,'');return '수세유지'+(mv?' 기술:'+mv:'')+(g('types').trim()?' 타입:'+tyK(g('types')).replace(/ /g,''):'')+(s('g_kcat')?' '+s('g_kcat'):'')+(/^\d+\/\d+$/.test(hp)?' HP≤'+hp:'')}
   case 'protect':{const w=[g('pt')?'특성':'',g('pi')?'소지품':''].filter(Boolean);return w.length?'보호 '+w.join(' '):''}
   case 'ext':{const w=String(g('what')||'').split(/[,·\s]+/).filter(Boolean).join(',');return '지속연장 '+(w||'날씨')+' +'+(Math.max(1,+g('n')||3))}
   case 'baseup':{const st=BU_STS.filter(x=>g('bu_'+x));if(!st.length)return '';const m=s('g_bm');return '종족치 '+st.join(',')+' '+(m==='top'?'최고':m==='max'?'최대':(m==='down'?'-':'+')+Math.max(1,+g('n')||1))}
   case 'stmod':{const f=String(g('frac')||'').replace(/\s+/g,'');if(!/^\d+\/\d+$/.test(f))return '';return '상태수정 '+s('g_sm')+' '+f}
   case 'future':return '예고 '+String(g('st')||'미래예지').replace(/\s+/g,'')+(+g('pow')>0?' 위력 '+(+g('pow')):'')+(String(g('mv')||'').trim()?' 기술 '+String(g('mv')).trim().replace(/\s+/g,''):'')+tga(s('g_tgt'));
   case 'transform':return g('off')?'변신 해제':'변신'+tga(s('g_tgt'))+(g('keep')?' 그림유지':'');
   case 'reset':return '초기화'+({rank:' 랭크',mult:' 배율',all:''})[s('g_rw')]+tg(s('g_tgt'));
   case 'resetst':return '상태초기화'+tg(s('g_tgt'))+(g('all')?' 전부':'');
   case 'clearobj':return '철거'+({self:'',enemy:' 상대',both:' 양쪽'})[s('g_cs')]+({hazard:'',wall:' 장벽',all:' 전부'})[s('g_cw')];
   case 'freesw':return '반드시교대'+tg(s('g_tgt'))+(+g('turns')>0?' '+g('turns')+'턴':'')+(g('off')?' 해제':'');
   case 'cond':return s('g_c')==='on_hit'?'조건 명중'+(String(g('hmv')||'').trim()?' 기술:'+String(g('hmv')).trim().replace(/\s+/g,''):'')+(String(g('hft')||'').trim()?' 상대타입:'+tyK(g('hft')):''):s('g_c')==='hp_le'?'조건 HP≤'+(g('frac')||'1/2'):s('g_c')==='self_state'?'조건 상태:'+String(K.stKo(s('g_cst'))).replace(/\s+/g,''):s('g_c')==='tyx'?(String(g('cval')||'').trim()?'조건 '+s('g_cwho')+s('g_ctk')+':'+String(g('cval')).trim().replace(/\s+/g,''):''):s('g_c')==='haz'?(String(g('chz')||'').trim()?'조건 '+s('g_chs')+'설치기:'+String(g('chz')).trim().replace(/\s+/g,''):''):s('g_c')==='used'?(String(g('cuse')||'').trim()?'조건 소모:'+String(g('cuse')).trim().replace(/\s+/g,''):''):'조건 아군빈사';
   case 'rrand':{const rk=s('g_rk');const v=+g('v');if(!v||(rk==='mult'&&v<=0))return '';const nn=Math.max(1,Math.min(7,+g('n')||1));return (rk==='rank'?'랭크':'배율')+tg(s('g_tgt'))+' 무작위'+(nn>1?nn+'개':'')+(rk==='rank'?(v>0?'+':'')+v:'×'+v)+(s('g_pool')==='7'?' 명중회피포함':'')+(g('temp')?' 임시':'')}
   case 'next':{let l='다음기술'+tg(s('g_tgt'));if(g('sure'))l+=' 필중';if(g('uturn'))l+=' 유턴';if(g('pur'))l+=' 추격';if(g('cx'))l+=' 확정급소';if(+g('prio'))l+=' 우선도'+(+g('prio')>0?'+':'')+(+g('prio'));if(+g('cr')>0)l+=' 급소+'+(+g('cr'));if(+g('pw')&&+g('pw')!==1)l+=' 위력×'+(+g('pw'));return l===('다음기술'+tg(s('g_tgt')))?'':l}
   case 'stcount':{const v=+g('v');const m=s('g_stm');if(!v&&m!=='set')return '';const st=s('g_stc');return '상태턴'+tg(s('g_tgt'))+' '+(st==='all'?'전부':st==='neg'?'부정':String(K.stKo(st)).replace(/\s+/g,''))+' '+(m==='set'?'='+Math.max(0,v):(v>0?'+':'')+v)}
   case 'chance':{const m=s('g_cm');if(m==='off')return '확률 해제'+tg(s('g_tgt'));return '확률 '+(m==='sure'?'반드시':((+g('v')>0?'+':'')+(+g('v')||0)+'%'))+tg(s('g_tgt'))+(+g('uses')>0?' '+g('uses')+'회':'')+(+g('turns')>0?' '+g('turns')+'턴':'')}
   case 'choice':return s('g_chm')==='multi'?'선택 여럿':'선택'}return ''}
 /* 공통: 줄 앞 확률 · 줄 끝 「있는한」 */
 function decorate(line,host){if(!line)return '';const q=k=>host.querySelector(`[data-gx="${k}"]`);const pk=(q('pk')||{}).value||'';let pre='';if(pk==='pct'){const v=+((q('pn')||{}).value);if(v>0&&v<100)pre=(v%10===0?v/10+'할':v+'%')+' '}else if(pk)pre=pk+' ';const hold=(q('hold')||{}).checked?' 있는한':'';return pre+line+hold}

 /* ===== 편집기 ===== */
 function openEditor(o){const K=FX();const m=o.mon||{};const own=(m.auto||{})[o.name];const base=K.autoOf(Object.assign({},m,{auto:{}}),o.kind,o.name);const text=o.text||(base&&base.text)||'';const tm=K.timing(text);
  const md=A().openModal(`<div class="mhead"><h2>자동화 구문 · ${esc(o.name)}</h2><span class="sp"></span><button class="btn ghost" data-x>닫기</button></div>
   ${text?`<div class="card" style="margin-top:0"><div class="sec">효과</div><div class="small" style="white-space:pre-wrap">${esc(text)}</div><div class="small dim" style="margin-top:4px">표식: ${[tm.entry?'【등장】 자동':'',tm.passive?'【상시】 자동':'',tm.uses?'【'+tm.uses+'/시】':'',tm.percent?tm.percent+' 판정':''].filter(Boolean).join(' · ')||'없음 (카드의 「사용」·「발동」으로)'}</div></div>`:''}
   <div class="card"><div class="sec">레디메이드 자동 <span class="note">${base?(base.manual?'있지만 자동화 미지원 (손으로)':'이 이름의 레디메이드가 있어 구문을 비워 두면 이것이 돈다'):'같은 이름의 레디메이드 없음'}</span></div>
    ${base&&base.ops&&base.ops.length?`<pre class="pm">${esc(K.unparse(base.ops).join('\n'))}</pre><button class="btn xs" id="fxcopy">복사해서 고치기</button>`:'<div class="small dim">없음</div>'}</div>
   <div class="card"><div class="sec">이 포켓몬의 구문 <span class="note">저장하면 레디메이드보다 먼저 쓴다 · 비우고 저장하면 지운다</span></div>
    <textarea id="fxdsl" rows="6" style="width:100%;font-family:var(--mono);font-size:13px">${esc(own?own.dsl||K.unparse(own.ops).join('\n'):'')}</textarea>
    <div id="fxprev" class="small" style="margin-top:6px;white-space:pre-wrap"></div>
    <div id="fxgen" style="margin-top:8px"></div>
    <details class="adv"><summary>구문 도움말</summary><pre class="pm" style="white-space:pre-wrap">${esc(HELP)}</pre></details>
    <div class="row" style="margin-top:10px"><button class="btn ghost" id="fxclear">지우기</button><span class="sp"></span><button class="btn pri" id="fxsave">저장</button></div></div>`);
  const prev=()=>{const r=K.parse($('#fxdsl',md).value);const el=$('#fxprev',md);el.innerHTML=(r.ops.length?`<b>미리보기</b>\n${esc(K.unparse(r.ops).join('\n'))}`:'<span class="dim">(비어 있음 — 레디메이드 자동이 있으면 그것이 돈다)</span>')+(r.errs.length?`\n<span style="color:var(--red)">모르는 줄: ${esc(r.errs.join(' / '))}</span>`:'')};
  prev();$('#fxdsl',md).addEventListener('input',prev);
  const cp=$('#fxcopy',md);if(cp)cp.onclick=()=>{$('#fxdsl',md).value=K.unparse(base.ops).join('\n');prev()};
  mountGen($('#fxgen',md),$('#fxdsl',md),{toast:t=>A().toast(t)});
  $('#fxclear',md).onclick=async()=>{A().closeModal();await o.save(null)};
  $('#fxsave',md).onclick=async()=>{const dsl=$('#fxdsl',md).value.trim();if(!dsl){A().closeModal();return o.save(null)}const r=K.parse(dsl);if(r.errs.length&&!confirm('모르는 줄이 있다:\n'+r.errs.join('\n')+'\n\n그래도 저장할까? (모르는 줄은 무시된다)'))return;A().closeModal();await o.save({dsl,ops:r.ops})}}

 /* 레디메이드 확률 보기 (10-24 망령): {v, src:'p'(적어 둔 값)|'text'(효과 글)}. 글이 비었으면 특성 · 소지품 DB 글에서 */
 function rmPct(name,r){const K=FX();r=r||{};if(r.p!=null&&r.p!==''&&+r.p>0)return {v:Math.min(100,+r.p),src:'p'};let t=r.text||'';if(!t&&K.effOf){const m=String(name||'').match(/^(특성|소지품)\s*:\s*(.+)$/);t=m?K.effOf(m[1]==='특성'?'trait':'item',m[2]):(K.effOf('trait',name)||K.effOf('item',name))}const v=K.rmChance?K.rmChance({text:t}):0;return {v,src:'text'}}
 /* ===== 레디메이드 DB 창 ===== */
 function openRm(q){const K=FX();const all=K.rmAll();const names=Object.keys(all).sort((a,b)=>a.localeCompare(b,'ko'));const gm=A().ST.role==='gm';
  const md=A().openModal(`<div class="mhead"><h2>레디메이드 DB <span class="small dim">${names.length}</span></h2><span class="sp"></span>${gm?'<button class="btn sm" id="rmnew">새로</button><button class="btn sm ghost" id="rmsync" title="제작기의 레디메이드 DB 수정을 이 방에 가져온다">제작기 새로고침</button>'+((window.OM_DB_UI&&window.OM_DB_UI.roomRm)?`<button class="btn sm ${window.OM_DB_UI.roomRm().length?'pri':'ghost'}" id="rmpush" title="이 방에서 직접 고친 레디메이드 구문을 제작기 레디메이드 DB 로 올린다 (11-03 · 0 이면 옮길 것 없음)">방 → 제작기 (${window.OM_DB_UI.roomRm().length})</button>`:''):''}<button class="btn ghost" data-x>닫기</button></div>
   <div class="row"><input type="text" id="rmq" placeholder="이름 · 효과 검색" value="${esc(q||'')}" style="flex:1"><label class="small"><input type="checkbox" id="rmauto" checked> 자동화 있는 것만</label></div><div id="rmlist" class="dblist" style="max-height:60vh;overflow:auto;margin-top:6px"></div>`);
  const draw=()=>{const qq=$('#rmq',md).value.trim().toLowerCase();const onlyAuto=$('#rmauto',md).checked;const ov=((A().ST.state.dbx||{}).rm)||{};
   const rows=names.filter(n=>{const r=all[n];if(onlyAuto&&(!r.ops||!r.ops.length||r.manual))return false;return !qq||n.toLowerCase().includes(qq)||String(r.text||'').toLowerCase().includes(qq)}).slice(0,200);
   $('#rmlist',md).innerHTML=rows.map(n=>{const r=all[n];return `<div class="rmrow"><div class="row"><b>${esc(n)}</b>${ov[n]?'<span class="tag">'+(ov[n].src==='maker'?'제작기':'방 수정')+'</span>':''}${r.manual?'<span class="tag" style="background:#555">손으로</span>':''}${(()=>{const pc=rmPct(n,r);return pc.v?`<span class="tag" title="${pc.src==='p'?'레디메이드에 적어 둔 확률':'효과 글에서 읽은 확률'}" style="background:${pc.src==='p'?'#8a5a00':'#3a4a66'}">🎲 ${pc.v}%${pc.src==='p'?'':' (글)'}</span>`:''})()}<span class="sp"></span>${gm?`<button class="btn xs" data-rmedit="${esc(n)}">수정</button>`:''}</div><div class="small dim" style="white-space:pre-wrap">${esc(r.text||'')}</div>${r.ops&&r.ops.length?`<pre class="pm small">${esc(K.unparse(r.ops).join('\n'))}</pre>`:''}</div>`}).join('')||'<div class="dim small">없음</div>';
   md.querySelectorAll('[data-rmedit]').forEach(b=>b.onclick=()=>editRm(b.dataset.rmedit))};
  draw();$('#rmq',md).addEventListener('input',draw);$('#rmauto',md).onchange=draw;const nb=$('#rmnew',md);if(nb)nb.onclick=()=>editRm('');const pu=$('#rmpush',md);if(pu)pu.onclick=()=>{A().closeModal();window.OM_DB_UI.pushRm()};const sy=$('#rmsync',md);if(sy)sy.onclick=()=>syncRm(()=>{A().closeModal();openRm($('#rmq',md)?$('#rmq',md).value:'')});}
 /* 제작기 dbedit(kind 'rm') → dbx.rm. 방에서 직접 고친 것(src 'room')은 건드리지 않는다 */
 async function syncRm(done){A().toast('제작기에서 읽는 중…');let rows;try{rows=await window.OM_STORE.makerDocs('dbedit')}catch(e){return A().toast('읽지 못했다: '+e.message)}
  const K=FX();const dbx=JSON.parse(JSON.stringify(A().ST.state.dbx||{}));dbx.rm=dbx.rm||{};let n=0;const base=(window.OM_DB||{}).readymade||{};
  for(const r of rows||[]){const d=r.data||{};if(d.kind!=='rm'||!d.key)continue;const cur=dbx.rm[d.key]||{};if(cur.src==='room')continue;
   if(d.deleted){if(base[d.key]&&!cur.deleted){dbx.rm[d.key]={deleted:1,src:'maker'};n++}continue}
   const row=d.row||[];const text=String(row[1]||''),dsl=String(row[2]||''),manual=row[3]==='O';const pc=String(row[4]==null?'':row[4]).trim();const ops=K.parse(dsl).ops;const b=base[d.key];
   if(b&&b.text===text&&K.unparse(b.ops||[]).join('\n')===dsl&&!!b.manual===manual&&String(b.p==null?'':b.p)===pc&&!cur.src)continue;
   const v={text,ops,src:'maker'};if(manual)v.manual=1;if(pc!==''&&+pc>0)v.p=Math.min(100,+pc);if(JSON.stringify(Object.assign({},cur,{src:''}))===JSON.stringify(Object.assign({},v,{src:''})))continue;dbx.rm[d.key]=v;n++}
  dbx.at=Date.now();await A().set(['dbx'],dbx);A().toast(`제작기에서 레디메이드 ${n}개 가져왔다`);if(done)done()}
 function editRm(name){const K=FX();const all=K.rmAll();const r=all[name]||{text:'',ops:[]};A().closeModal();
  const md=A().openModal(`<div class="mhead"><h2>레디메이드 ${name?'수정':'새로'}</h2><span class="sp"></span><button class="btn ghost" data-x>닫기</button></div>
   <div class="row"><label>이름 <input type="text" id="rmn" value="${esc(name)}" ${name?'readonly':''} style="width:260px"></label></div>
   <div class="sec">효과 글</div><textarea id="rmt" rows="3" style="width:100%">${esc(r.text||'')}</textarea>
   <div class="row" style="margin-top:6px;gap:8px;align-items:center"><label>발동 확률 <input type="number" id="rmpc" min="0" max="100" step="1" style="width:70px" value="${r.p!=null&&r.p!==''?esc(r.p):''}"> %</label><span class="small dim" id="rmpch"></span></div>
   <div class="sec">구문</div><textarea id="rmd" rows="6" style="width:100%;font-family:var(--mono);font-size:13px">${esc(K.unparse(r.ops||[]).join('\n'))}</textarea><div id="rmp" class="small" style="white-space:pre-wrap;margin-top:4px"></div>
   <div class="row" style="margin-top:10px">${name&&((A().ST.state.dbx||{}).rm||{})[name]?'<button class="btn ghost" id="rmreset">기본으로</button>':''}<span class="sp"></span><button class="btn pri" id="rmsave">저장 (방)</button></div>`);
  const pch=()=>{const v=$('#rmpc',md).value.trim();const dt=rmPct(name,{text:$('#rmt',md).value}).v;$('#rmpch',md).textContent=v!==''?(+v>=100?'100 — 굴리지 않고 늘 발동':+v>0?`발동할 때 ${+v}% 로 굴린다`:'0 — 비운 것과 같다'):(dt?`비우면 효과 글에서 읽은 ${dt}% 로 굴린다 · 100 이면 굴리지 않는다`:'비우면 확률 없이 늘 발동 (효과 글에 「N할로」 · 「N% 확률」 이 있으면 그걸 쓴다)')};pch();$('#rmpc',md).addEventListener('input',pch);$('#rmt',md).addEventListener('input',pch);
  const prev=()=>{const p=K.parse($('#rmd',md).value);$('#rmp',md).innerHTML=esc(K.unparse(p.ops).join('\n'))+(p.errs.length?`\n<span style="color:var(--red)">모르는 줄: ${esc(p.errs.join(' / '))}</span>`:'')};prev();$('#rmd',md).addEventListener('input',prev);
  $('#rmsave',md).onclick=async()=>{const n=$('#rmn',md).value.trim();if(!n)return A().toast('이름이 필요하다');const p=K.parse($('#rmd',md).value);const ov=Object.assign({},(A().ST.state.dbx||{}).rm||{});ov[n]={text:$('#rmt',md).value,ops:p.ops,src:'room'};{const pv=$('#rmpc',md).value.trim();if(pv!==''&&+pv>0)ov[n].p=Math.min(100,Math.round(+pv))}if(r.manual)ov[n].manual=1;A().closeModal();await A().set(['dbx','rm'],ov);A().toast('저장했다');openRm(n)};
  const rs=$('#rmreset',md);if(rs)rs.onclick=async()=>{const ov=Object.assign({},(A().ST.state.dbx||{}).rm||{});delete ov[name];A().closeModal();await A().set(['dbx','rm'],ov);openRm(name)}}
 /* ===== 생성기 판 (10-23 망령) ===== host 안에 무리별 버튼 · 칸 · 미리보기를 그리고, 「줄 추가」로 ta(textarea) 끝에 줄을 붙인다. 붙이면 ta 에 input 이벤트를 보낸다 */
 const GCSS=`.fxg [hidden]{display:none!important}.fxg-form input[type=number]{width:66px}.fxg-form input[type=text]{min-width:90px}.fxg-form select{max-width:230px}
.fxg{border:1px dashed color-mix(in srgb,currentColor 28%,transparent);border-radius:10px;padding:8px 10px;margin-top:4px}
.fxg-ts{display:flex;flex-wrap:wrap;gap:6px 8px;align-items:center;font-size:12.5px;margin:2px 0 8px;padding:5px 8px;border-radius:8px;background:color-mix(in srgb,currentColor 6%,transparent)}.fxg-ts label{display:inline-flex;gap:4px;align-items:center;font-weight:700}
.fxg-h{display:flex;align-items:center;gap:8px;font-weight:700;font-size:13px;margin-bottom:4px}.fxg-h .dim{font-weight:400}
.fxg-pal{display:grid;grid-template-columns:auto 1fr;gap:4px 8px;align-items:start}
.fxg-gl{font-size:11.5px;opacity:.65;padding-top:5px;white-space:nowrap}.fxg-bs{display:flex;flex-wrap:wrap;gap:4px}
.fxg-k{font:inherit;font-size:12.5px;padding:3px 9px;border-radius:999px;border:1px solid color-mix(in srgb,currentColor 25%,transparent);background:transparent;color:inherit;cursor:pointer;line-height:1.5}
.fxg-k:hover{border-color:currentColor}.fxg-k.on{background:color-mix(in srgb,currentColor 14%,transparent);border-color:currentColor;font-weight:700}
.fxg-form{margin-top:8px;border-top:1px solid color-mix(in srgb,currentColor 15%,transparent);padding-top:8px}
.fxg-ttl{font-size:13px;margin-bottom:6px}.fxg-ttl span{opacity:.7;font-size:12px;margin-left:6px}
.fxg-form .row,.fxg-form .ggrid{flex-wrap:wrap;gap:6px 10px}.fxg-form label{display:inline-flex;align-items:center;gap:4px}
.fxg-ty{display:flex;flex-wrap:wrap;gap:4px 8px;margin-top:6px;align-items:center}.fxg-ty>.small{flex-basis:100%}.fxg-tyc{font-size:12.5px}
.fxg-opt{display:flex;flex-wrap:wrap;gap:6px 12px;align-items:center;margin-top:8px;font-size:12.5px;opacity:.95}
.fxg-out{display:flex;gap:8px;align-items:center;margin-top:8px;flex-wrap:wrap}.fxg-out code{flex:1;min-width:180px;font-family:var(--mono,monospace);font-size:12.5px;padding:5px 8px;border-radius:6px;background:color-mix(in srgb,currentColor 7%,transparent);white-space:pre-wrap;word-break:break-all}
.fxg-ch{margin-top:8px;padding:6px 8px;border-radius:8px;background:color-mix(in srgb,#e6b422 18%,transparent);font-size:12.5px;display:flex;gap:8px;align-items:center;flex-wrap:wrap}
@media(max-width:640px){.fxg-pal{grid-template-columns:1fr}.fxg-gl{padding-top:2px}}`;
 function mountGen(host,ta,opt){if(!host||!ta)return;opt=opt||{};const toast=opt.toast||(t=>{try{A().toast(t)}catch(e){}});
  if(!document.getElementById('fxg-css')){const st=document.createElement('style');st.id='fxg-css';st.textContent=GCSS;document.head.appendChild(st)}
  host.innerHTML=`<div class="fxg"><div class="fxg-h">⚙ 생성기 <span class="small dim">항목을 누르고 칸을 채운 뒤 「줄 추가」</span></div>
   <div class="fxg-ts"><label title="웹툴 지시 입력에서 이 포텐셜(전용 · 고유 · 일반)을 선행 입력할 때 기술처럼 대상을 찍어 둔다 — 발동하면 구문의 「상대 1체」 · 「아군 1체」 가 그 대상"><input type="checkbox" data-gts> ◎ 대상 지정</label> <select data-gtst><option value="상대1체">상대 1체</option><option value="아군1체">아군 1체</option><option value="자신포함아군1체">아군 1체 (자신 포함)</option><option value="아무나1체">아무나 1체</option></select> <span class="small dim">지시 입력 때 대상을 찍어 둔다 (추가 반동 · 상대를 고르는 전용 · 고유)</span></div>
   <div class="fxg-pal">${GROUPS.map(([gl,ks])=>`<span class="fxg-gl">${esc(gl)}</span><div class="fxg-bs">${ks.map(([k,l])=>`<button type="button" class="fxg-k" data-gk="${k}">${esc(l)}</button>`).join('')}</div>`).join('')}</div>
   <div class="fxg-form" hidden><div class="fxg-ttl"><b data-gt></b><span data-gd></span></div><div data-gf></div>
    <div class="fxg-opt"><label>확률 <select data-gx="pk"><option value="">없음 (항상)</option><option value="pct">직접 (할 · %)</option><option>드물게</option><option>저확률</option><option>중확률</option><option>고확률</option></select></label><label data-gpn hidden><input type="number" class="n xs" data-gx="pn" value="30" min="1" max="99">%</label>
     <label title="이 효과를 쓴 포켓몬이 필드를 떠나면(교대 · 퇴장 · 빈사) 되돌린다"><input type="checkbox" data-gx="hold"> 필드 위에 있는 한 (나가면 풀림)</label><label data-glb hidden>선택지 이름 <input type="text" data-gx="lab" placeholder="① 특공 +1" style="width:130px"></label></div>
    <div class="fxg-out"><code data-gline></code><button type="button" class="btn sm pri" data-gadd>+ 줄 추가</button></div></div>
   <div class="fxg-ch" data-gch hidden>🔀 선택지를 넣는 중 — 지금부터 넣는 줄이 하나씩 선택지가 된다 <button type="button" class="btn sm" data-gend>선택지 끝</button></div></div>`;
  const q=s=>host.querySelector(s);let kind='';
  /* 11-07 망령 「전용 · 고유 입력에 대상 지정」: 체크하면 구문 맨 위에 「대상지정 …」 한 줄 (끄면 그 줄을 지운다) */
  {const TS=/^[ \t]*대상지정(?=[ \t]|$)[^\n]*\n?/gm;const cb=q('[data-gts]'),se=q('[data-gtst]');
   const sync=()=>{const mm=String(ta.value||'').match(/^\s*대상지정\s*([^\n]*)/m);cb.checked=!!mm;if(mm){const w=mm[1].replace(/\s/g,'');se.value=/자신포함|본인포함/.test(w)?'자신포함아군1체':/아무나|누구나|전체1체|전원1체/.test(w)?'아무나1체':/아군/.test(w)?'아군1체':'상대1체'}};
   const put=()=>{let v=String(ta.value||'').replace(TS,'');if(cb.checked)v='대상지정 '+se.value+(v.trim()?'\n'+v:'');ta.value=v;ta.dispatchEvent(new Event('input',{bubbles:true}))};
   sync();ta.addEventListener('input',sync);cb.onchange=put;se.onchange=()=>{if(cb.checked)put()}}let inCh=/(^|\n)\s*(선택|선택 여럿|선택:)\s*(\n\s*-[^\n]*)*\s*$/.test(ta.value);
  const drawCh=()=>{q('[data-gch]').hidden=!inCh;q('[data-glb]').hidden=!inCh||kind==='choice'};
  const cur=()=>{if(!kind)return '';const base=genLine(kind,host);if(kind==='choice')return base;let l=decorate(base,host);if(l&&inCh){const lb=String((host.querySelector('[data-gx="lab"]')||{}).value||'').trim();l='- '+(lb||l)+' → '+l}return l};
  const upd=()=>{const l=cur();const el=q('[data-gline]');el.textContent=l||'(칸을 채우면 여기에 줄이 생긴다)';el.style.opacity=l?1:.55;q('[data-gpn]').hidden=q('[data-gx="pk"]').value!=='pct';const pc=kind==='choice';q('.fxg-opt').style.display=pc?'none':''};
  const pick=k=>{kind=k;{const pk=q('[data-gx="pk"]'),hd=q('[data-gx="hold"]');if(pk)pk.value='';if(hd)hd.checked=false}/* 항목을 바꾸면 확률 · 있는한은 처음으로 */host.querySelectorAll('[data-gk]').forEach(b=>b.classList.toggle('on',b.dataset.gk===k));const f=q('.fxg-form');f.hidden=false;q('[data-gt]').textContent=(KINDS.find(x=>x[0]===k)||[])[1]||k;q('[data-gd]').textContent=DESC[k]||'';q('[data-gf]').innerHTML=genForm(k);drawCh();upd()};
  host.querySelectorAll('[data-gk]').forEach(b=>b.onclick=()=>pick(b.dataset.gk));
  host.addEventListener('input',e=>{if(e.target.closest('.fxg-form'))upd()});host.addEventListener('change',e=>{if(e.target.closest('.fxg-form'))upd()});
  const put=l=>{ta.value=(ta.value.trim()?ta.value.replace(/\s+$/,'')+'\n':'')+l;ta.dispatchEvent(new Event('input',{bubbles:true}))};
  q('[data-gadd]').onclick=()=>{const l=cur();if(!l)return toast('칸을 채워 줘');if(kind==='choice'){if(inCh)put('');put(l);inCh=true;drawCh();toast('이제 넣는 줄이 하나씩 선택지가 된다');return}put(l);const lb=host.querySelector('[data-gx="lab"]');if(lb)lb.value='';upd()};
  q('[data-gend]').onclick=()=>{ta.value=ta.value.replace(/\s+$/,'')+'\n\n';ta.dispatchEvent(new Event('input',{bubbles:true}));inCh=false;drawCh();upd()};
  drawCh()}
 /* ---------- 11-09 망령 「필드 전개에도 구문 — 턴 개시 · 턴 종료 확률 발동, 등장(임의 교대 · 죽어내밀기 포함), 복합 효과」 ----------
    필드 한 장의 구문 = auto: {deploy 전개 시, start 턴 개시 시, end 턴 종료 시, entry 등장 시, hold 필드 동안, who 등장 대상(all|own|foe)} — 칸마다 한국어 구문(여러 줄 · 줄 앞 「3할」 「저확률」 확률).
    제작기 · 노트 · 웹툴의 필드 편집 창이 같이 쓴다 (창 위에 창을 띄우지 않고 그 자리에서 고친다 — 웹툴 창은 겹쳐 열리지 않는다).
    실행은 웹툴 battle_ui fieldAuto: 전개 · 턴 개시 · 턴 종료의 「자신」 = 필드 주인 포켓몬(트레이너 필드면 그 트레이너의 나와 있는 첫 포켓몬), 등장의 「자신」 = 나온 포켓몬.
    필드 동안 = 줄의 대상(자신 · 아군 · 상대 · 전체)에 맞는 포켓몬마다 건다 · 나중에 나온 포켓몬에게도 · 필드가 걷히면 그 이름(《필드 이름》)으로 건 효과를 푼다 */
 const FA_K=['deploy','start','end','entry','use','hold'];
 /* 11-09 망령 「필드는 전체에 깔리는 거니까 상대라는 개념은 그다지 없어 — 모든 포켓몬 적용이 디폴트」: 전개 · 턴 개시 · 턴 종료 · 필드 동안은 대상을 안 쓰면 「전체」(필드 위 모든 포켓몬). 아군 · 상대는 주인 기준으로 그대로 쓸 수 있다 */
 const FA_ROWS=[['deploy','전개 시','펼치는 순간 한 번. 대상을 안 쓰면 필드 위 모든 포켓몬 (아군 · 상대 = 필드 주인 기준)'],
  ['start','턴 개시 시','매 턴 개시. 대상을 안 쓰면 모든 포켓몬. 확률 발동은 줄 앞에 「3할」 「30%」 「저확률」'],
  ['end','턴 종료 시','매 턴 종료 — 남은 턴이 줄기 전. 대상을 안 쓰면 모든 포켓몬. 확률 발동은 줄 앞에'],
  ['entry','등장 시','포켓몬이 나올 때마다 (통상 교대 · 임의 교대 · 죽어내밀기 · 강제 교대). 대상을 안 쓰면 나온 그 포켓몬. 「조건 설치기:끈적끈적네트」 처럼 조건 줄을 앞에 두면 맞을 때만'],
  ['use','소지품 소모 시','필드 위 포켓몬이 소지품을 다 썼을 때. 대상을 안 쓰면 쓴 그 포켓몬. 「조건 소모:나무열매」 로 어떤 소지품인지 거른다'],
  ['hold','필드 동안','펼쳐 둔 동안만 걸리는 지속 효과 (배율 · 위력 · 면역 · 감소 무시 …). 대상을 안 쓰면 모든 포켓몬 · 나중에 나온 포켓몬에게도 걸고 · 걷히면 푼다. 줄 끝 「대상타입:벌레」 로 그 타입에게만. 랭크 · 상태처럼 한 번 걸고 끝나는 것은 「전개 시」 · 「등장 시」로']];
 const FA_WHO=[['all','누구든'],['own','주인 편만'],['foe','상대 편만']];
 /* 웹툴 battle_ui faTo 와 같은 규칙: 대상 낱말이 없는 줄 끝에 「전체」(전개 · 턴 · 필드 동안) · 「자신」(등장 · 소지품 소모) — 미리보기도 실제로 도는 대로 */
 const FA_TW=/(^|\s)(자신|아군전체|아군|상대전체|상대|자신이외|전체|아군1체|아군1|상대1체|상대1|무작위1|자신이외무작위|상대무작위|전원무작위|에리어|지정에리어)(?=\s|$)/;
 const faTo=(t,w)=>String(t||'').split('\n').map(l=>{const x=l.trim();if(!x||x.startsWith('#')||/^(조건|확인|선택|-|·|•)/.test(x)||/[;；]/.test(x)||FA_TW.test(x))return l;return l.replace(/\s*(있는한)?\s*$/,m=>' '+w+m)}).join('\n');
 function fieldAutoNorm(a){if(!a||typeof a!=='object')return null;const o={};for(const k of FA_K){const v=String(a[k]==null?'':a[k]).replace(/\r/g,'').trim();if(v)o[k]=v.slice(0,4000)}if(!Object.keys(o).length)return null;if(a.who==='own'||a.who==='foe')o.who=a.who;return o}
 function fieldAutoSum(a){a=fieldAutoNorm(a);if(!a)return '';return FA_ROWS.filter(([k])=>a[k]).map(([,n])=>n).join(' · ')}
 const FAB_CSS=`.fab{border:1px solid var(--line,#8886);border-radius:8px;padding:8px 10px;margin-top:8px}.fab-h{display:flex;gap:6px;align-items:baseline;flex-wrap:wrap;margin-bottom:4px}.fab-h b{font-size:13px}.fab-r{border-top:1px dashed var(--line,#8885);padding:4px 0}.fab-r>summary{cursor:pointer;display:flex;gap:6px;align-items:baseline;flex-wrap:wrap;list-style:none}.fab-r>summary::-webkit-details-marker{display:none}.fab-r>summary::before{content:'▸';opacity:.6}.fab-r[open]>summary::before{content:'▾'}.fab-r b{font-size:12.5px;min-width:5.5em}.fab-s{font-size:11.5px;opacity:.75;flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.fab-s.on{opacity:1;color:var(--acc,#c58b00)}.fab-d{font-size:11.5px;opacity:.7;margin:2px 0 4px}.fab-r textarea{width:100%;box-sizing:border-box;font-family:var(--mono,monospace);font-size:12.5px}.fab-p{font-size:11.5px;white-space:pre-wrap;margin-top:3px;opacity:.85}.fab-p .er{color:var(--red,#e05555)}.fab-w{display:flex;gap:6px;align-items:center;font-size:12px;margin-bottom:4px}`;
 function fieldAutoBox(host,au,o){o=o||{};if(!host)return {get:()=>fieldAutoNorm(au)};au=Object.assign({},fieldAutoNorm(au)||{});
  if(!document.getElementById('fab-css')){const st=document.createElement('style');st.id='fab-css';st.textContent=FAB_CSS;document.head.appendChild(st)}
  const K=FX();
  host.innerHTML=`<div class="fab"><div class="fab-h"><b>⚙ 자동화 구문</b><span class="small dim">웹툴 배틀에서 이 필드를 펼치면 칸마다 저절로 돈다 · 비워 두면 손으로 · 한 칸에 여러 줄(복합 효과)</span></div>
   ${FA_ROWS.map(([k,n,d])=>`<details class="fab-r" data-fak="${k}" ${au[k]?'open':''}><summary><b>${n}</b><span class="fab-s" data-fas="${k}"></span></summary><div class="fab-d">${esc(d)}</div>${k==='entry'?`<label class="fab-w">누가 나올 때 <select data-faw>${FA_WHO.map(([v,l])=>`<option value="${v}" ${(au.who||'all')===v?'selected':''}>${l}</option>`).join('')}</select></label>`:''}<textarea data-fat="${k}" rows="3" placeholder="${k==='hold'?'예) 감소무시 스피드 저하 대상타입:벌레&#10;위력 ×1.3 타입:불꽃':k==='entry'?'예) 조건 설치기:끈적끈적네트&#10;상태 바인드 1턴':k==='use'?'예) 조건 소모:나무열매&#10;타입 변경 고스트':k==='start'||k==='end'?'예) 3할 회복 1/16&#10;저확률 상태 잠듦':'예) 랭크 스피드-1'}">${esc(au[k]||'')}</textarea><div class="fab-p" data-fap="${k}"></div><div data-fag="${k}"></div></details>`).join('')}
   <details class="fab-r"><summary><b>도움말</b><span class="fab-s">구문 꼴 · 대상 · 확률</span></summary><pre class="fab-p" style="white-space:pre-wrap">${esc(HELP)}</pre></details></div>`;
  const draw=k=>{const v=au[k]||'';const sm=host.querySelector(`[data-fas="${k}"]`),pv=host.querySelector(`[data-fap="${k}"]`);let ops=[],errs=[];if(v&&K&&K.parse){try{const r=K.parse(faTo(v,k==='entry'||k==='use'?'자신':'전체'));ops=r.ops||[];errs=r.errs||[]}catch(e){errs=[e.message]}}
   let un=[];try{un=ops.length&&K.unparse?K.unparse(ops):[]}catch(e){}
   if(sm){sm.textContent=v?(un.length?un.join(' / '):v.split('\n')[0]):'없음';sm.classList.toggle('on',!!v)}
   if(pv)pv.innerHTML=v?(un.length?'<b>미리보기</b> '+esc(un.join(' / ')):'')+(errs.length?`<div class="er">모르는 줄: ${esc(errs.join(' / '))}</div>`:''):''};
  host.querySelectorAll('[data-fat]').forEach(ta=>{const k=ta.dataset.fat;ta.addEventListener('input',()=>{au[k]=ta.value;draw(k)});draw(k)});
  host.querySelectorAll('.fab-r[data-fak]').forEach(dt=>dt.addEventListener('toggle',()=>{if(!dt.open)return;const k=dt.dataset.fak;const g=host.querySelector(`[data-fag="${k}"]`);if(g&&!g.dataset.on){g.dataset.on='1';try{const ta=host.querySelector(`[data-fat="${k}"]`);mountGen(g,ta,{toast:o.toast});ta.addEventListener('input',()=>{au[k]=ta.value;draw(k)})}catch(e){}}}));
  const w=host.querySelector('[data-faw]');if(w)w.onchange=()=>{au.who=w.value};
  /* 생성기의 「줄 추가」는 textarea 값을 바꾸고 input 을 안 쏠 수 있다 — 꺼낼 때 textarea 에서 다시 읽는다 */
  return {get:()=>{host.querySelectorAll('[data-fat]').forEach(ta=>{au[ta.dataset.fat]=ta.value});return fieldAutoNorm(au)}}}
 return {openEditor,openRm,HELP,mountGen,fieldAutoBox,fieldAutoNorm,fieldAutoSum,FA_ROWS};
})();
