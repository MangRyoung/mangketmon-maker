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
위력 ×1.3 [대상] [타입:불꽃,물] [물리|특수] [굉장|별로|보통] [단일|전체기] [자속|비자속] [태그:소리,접촉] [위력≥150] [위력≤60] [역할:에이스] [수세|공세] [급소방호1] [급소+1] [확정급소|급소없음] [N회] [이번턴] [N턴] [해제]
완화 ×0.75 … (위력과 같은 조건 — 받는 쪽)
상태 화상 [대상] [N턴] [강제] (항상 건다)        상태확률 화상 50% [대상] [1체]        치유 [대상] [독,맹독 | 이상] [N%]        상태초기화 [대상] [전부]
회복 1/4 [대상] [전부] [타입:독]        피해 1/8 [대상] [현재|직전|타입:바위] [제외:독] [상태:잠듦] [빈사없음]
날씨 비 5 · 날씨 해제        필드 그래스필드 5 · 룸 트릭룸 5 · 필드상태 중력 5        설치기 [아군|상대] 리플렉터 5
타입 [대상] 추가|변경|원래 불꽃,비행        특성 [대상] 변경 X · 특성 원래        역할 추가|제거 에이스,블로커        추격 [숨김]
비례무시 [대상] [빈사|설치기|설치기피해|반동] [N턴]        우선도 +1 [대상] [타입:X] [물리|특수|변화] [태그:회복] [이번턴]
면역 [대상] 잠듦,마비 · 면역 이상        감소무시 [대상] [공격] [N턴]  (내 능력이 깎이지 않음)        강화무시 [공격시|받음|양방향] [방어 회피 공격 명중|양쪽] [감소|모두] [랭크|배율]  (상대 능력 변화를 계산에서 뺌 · 상승·감소 = 랭크 ±N · 강화·저하 = 배율 ×)        하늘위 [대상] [N턴]
랭크 [대상] 무작위2개+1 [명중회피포함]        상태턴 [대상] 혼란|전부|부정 +1|-1|=2        다음기술 [대상] 필중 유턴 추격 우선도+1 급소+1 확정급소 위력×1.5        확률 +20% [대상] [N회] [N턴] · 확률 반드시 · 확률 해제
줄 앞 확률: 5할 상태 혼란 상대1체 · 30% 랭크 공격+1 · 저확률 상태 풀죽음 상대1체        줄 끝 「있는한」: 그 효과는 쓴 포켓몬이 필드를 떠나면 풀린다 (효과 글에 「필드 위에 있는 한」이 있으면 저절로)
종족치 방어,특방 +1 · 종족치 스피드 최대 (시트 종족치에 반영)        상태수정 아쿠아링 1/6 (이 포켓몬의 상태 변화 비율)
예고 미래예지 [위력 120] [기술 미래예지] [대상]        변신 [대상] [그림유지] · 변신 해제        철거 [상대|양쪽] [장벽|전부]        반드시교대 [대상] [N턴]
확인 "조건 문장"  (발동 때 물어본다)        조건 아군빈사 · 조건 HP≤1/2 · 조건 상태:날따름        레이드 구간:4
선택   (여러 효과 중 하나 고르기 · 「선택 여럿」 이면 여러 개를 고른다) — 다음 줄부터 빈 줄까지가 선택지
랭크 아군1체 특공+1
랭크 아군1체 특방+1
또는 이름을 붙여서:  - ① 라벨 → 랭크 공격+1  /  - ② 5할 : 혼란 → 상태 혼란 상대1체
효과 글의 표식: 【등장】 등장 때 자동 · 【상시】 처음 한 번 자동 · 【N/시】 횟수 · 드물게/저확률/중확률/고확률 확률 판정`;
 /* 10-23 망령: 생성기를 무리별 버튼 판으로 — 드롭다운 33개에서 찾지 않게 */
 const GROUPS=[['능력치',[['rank','랭크'],['mult','배율'],['rrand','무작위 능력치'],['reset','초기화']]],
  ['위력 · 급소',[['boost','위력 강화'],['guard','위력 완화'],['next','다음 기술 부여']]],
  ['상태',[['state','상태 걸기'],['statefx','확률로 걸기'],['cure','치유'],['stcount','턴 조정'],['resetst','상태 초기화'],['immune','면역'],['stmod','회복 · 대미지 비율']]],
  ['HP',[['heal','회복'],['dmg','대미지 (비례 · 타입)'],['future','예고 공격']]],
  ['필드',[['weather','날씨'],['terrain','필드 · 룸'],['etc','필드의 상태'],['object','설치기 · 벽'],['clearobj','철거']]],
  ['행동',[['prio','우선도'],['pursuit','추격'],['freesw','반드시 교대']]],
  ['무시',[['ignoreup','상대 상승·강화 / 감소·저하 무시 (계산에서 뺌)'],['nodrop','감소 무시 (내 능력이 안 깎임)'],['noind','비례 · 설치기 무시'],['float','하늘 위']]],
  ['모습',[['type','타입'],['trait','특성'],['transform','변신'],['role','역할']]],
  ['발동 조건',[['choice','선택지'],['chance','확률 보정'],['confirm','확인 질문'],['cond','자동 조건']]],
  ['시트',[['baseup','종족치']]]];
 const KINDS=GROUPS.flatMap(g=>g[1]);
 const DESC={rank:'능력 랭크를 올리거나 내린다',mult:'능력에 배율을 곱한다 (해제하면 되돌린다)',rrand:'정한 능력 중 무작위로 골라 랭크 · 배율을 바꾼다',reset:'랭크 · 배율을 처음으로',
  boost:'조건이 맞는 기술의 위력을 올린다 (공격 쪽)',guard:'조건이 맞는 기술의 대미지를 줄인다 (받는 쪽)',next:'다음에 쓰는 기술 한 번에 필중 · 유턴 · 추격 · 우선도 · 급소를 붙인다',
  state:'상태 변화를 건다 (면역 · 필드 판정 포함)',statefx:'확률로 상태 변화를 건다',cure:'상태 변화를 푼다',stcount:'걸려 있는 상태의 남은 턴을 늘리거나 줄인다 (0이 되면 풀린다)',resetst:'상태 이상 · 부정 상태를 한 번에 푼다',immune:'그 상태에 걸리지 않는다',stmod:'이 포켓몬이 그 상태일 때 턴 종료 회복 · 대미지 비율',
  heal:'HP 를 회복한다',dmg:'최대 HP 비례 · 현재 HP 비례 · 타입 상성 비례 대미지',future:'다음 턴 끝에 덮치는 예고 공격 (미래예지)',
  weather:'날씨를 바꾼다',terrain:'필드 · 룸을 깐다',etc:'중력 · 물놀이 같은 필드의 상태',object:'벽 · 설치기를 깐다',clearobj:'설치기 · 벽을 걷어낸다',
  prio:'기술의 우선도를 바꾼다',pursuit:'따라가때리기 · 추격 무시',freesw:'교대 제한을 받지 않고 반드시 교대',
  ignoreup:'상대의 랭크 상승 · 감소를 무시한다 (천진 · 성스러운칼)',nodrop:'자신의 능력이 내려가지 않는다',noind:'비례 대미지 · 설치기 · 강제 교대를 무시한다',float:'땅 위 효과를 받지 않는다',
  type:'타입을 더하거나 바꾼다',trait:'특성을 바꾼다',transform:'상대로 변신한다',role:'역할(에이스 · 블로커 …) 취급',
  choice:'여러 효과 중 고르게 한다 — 이 다음에 넣는 줄이 하나씩 선택지가 된다',chance:'이 포켓몬의 확률 효과가 더 잘 (또는 반드시) 발동한다',confirm:'발동할 때 조건을 물어본다',cond:'조건이 맞을 때만 자동으로 이어 간다',
  baseup:'시트 종족치를 올린다 (제작기 시트에 반영)'};
 const BU_STS=['HP','공격','방어','특공','특방','스피드'];
 const STMOD_STS=[['아쿠아링','1/8'],['뿌리박기','1/16'],['환희의노래','1/16'],['희망사항','1/2'],['씨뿌리기','1/8'],['독','1/8'],['화상','1/16'],['악몽','1/4'],['저주','1/4'],['조이기','1/8']];
 const TG=['self','ally','enemy','others','all','ally1','adj','enemy1','randother','randenemy','randall','area'];
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
   case 'boost':case 'guard':return `<div class="ggrid"><label>배율 ×<input type="number" step="0.01" class="n" data-g="v" value="${kind==='boost'?1.3:0.75}"></label><label>대상 ${tgSel('g_tgt')}</label><label>타입 (쉼표) <input type="text" data-g="types" placeholder="불꽃,물 (비우면 모든 타입)"></label>
     <label>분류 ${sel('g_cat',[['all','모두'],['physical','물리'],['special','특수']],'all')}</label><label>상성 ${sel('g_eff',[['all','상관없음'],['super','효과 굉장'],['weak','효과 별로'],['normal','1배']],'all')}</label><label>범위 ${sel('g_rng',[['all','모두'],['single','단일기'],['multi','전체기']],'all')}</label>
     <label>타입 일치 ${sel('g_sb',[['','상관없음'],['stab','일치'],['nonstab','비일치']],'')}</label><label>태그 (쉼표) <input type="text" data-g="tg" placeholder="소리,접촉"></label><label>위력 ≥ <input type="number" class="n xs" data-g="pmin" value="0"></label><label>위력 ≤ <input type="number" class="n xs" data-g="pmax" value="0"></label>
     <label>역할 상대 <input type="text" data-g="ro" placeholder="에이스"></label><label>자세 ${sel('g_st',[['','상관없음'],['def','【수세】'],['off','【공세】']],'')}</label><label>급소 ${sel('g_cx',[['','보통'],['sure','확정 급소'],['none','급소에 맞지 않음']],'')}</label><label>급소 방호 <input type="number" class="n xs" data-g="cg" value="0"></label><label>급소 C+ <input type="number" class="n xs" data-g="cr" value="0"></label>
     <label>횟수 <input type="number" class="n xs" data-g="uses" value="-1" title="-1 = 해제 전까지"></label><label><input type="checkbox" data-g="turn"> 이번 턴만</label><label>지속 턴 <input type="number" class="n xs" data-g="tl" value="0"></label><label><input type="checkbox" data-g="remove"> 해제</label></div>`;
   case 'state':return `<div class="row">상태 ${stSel('g_state')} 대상 ${tgSel('g_tgt','enemy1')} <label>턴 <input type="number" class="n xs" data-g="count" value="-1" title="-1 = 기본"></label> <label><input type="checkbox" data-g="forced"> 강제</label></div>`;
   case 'statefx':return `<div class="row">상태 ${stSel('g_state')} 대상 ${tgSel('g_tgt','enemy1')} <label>확률 <input type="number" class="n xs" data-g="chance" value="30">%</label> <label><input type="checkbox" data-g="one"> 1체만</label></div>`;
   case 'cure':return `<div class="row">대상 ${tgSel('g_tgt')} <label>상태 (쉼표, 비우면 모든 이상) <input type="text" data-g="states" placeholder="독,맹독"></label> <label>확률 <input type="number" class="n xs" data-g="chance" value="100">%</label></div>`;
   case 'heal':return `<div class="row">대상 ${tgSel('g_tgt')} <label>양 <input type="text" class="n" data-g="value" value="1/4" placeholder="1/4 · 30 · 전부"></label> <label>타입 한정 ${tySel('g_ytype','', '없음')}</label></div>`;
   case 'dmg':return `<div class="row">대상 ${tgSel('g_tgt','enemy1')} <label>양 <input type="text" class="n" data-g="value" value="1/8"></label> 기준 ${sel('g_basis',[['max','최대 HP'],['cur','현재 HP'],['last','직전에 입힌 대미지'],['type','타입 상성 비례']],'max')} <label>제외 타입 ${tySel('g_xtype','', '없음')}</label> <label><input type="checkbox" data-g="nofaint"> 빈사 없음</label></div>
     <div class="fxg-ty"><span class="small dim">타입 상성 비례 — 누르면 타입 비례가 된다 (여럿이면 상성을 곱한다)</span>${TYPES.map(t=>`<label class="fxg-tyc"><input type="checkbox" data-g="aty_${t}"> ${esc(FX().TYPE_KO[t])}</label>`).join('')}</div>`;
   case 'weather':return `<div class="row">날씨 ${sel('g_w',[['','해제'],['맑음','맑음'],['비','비'],['모래바람','모래바람'],['눈','눈'],['싸라기눈','싸라기눈'],['짙은안개','짙은안개'],['밤','밤'],['별하늘','별하늘'],['폭우','폭우'],['큰가뭄','큰가뭄'],['극한','극한'],['깊은밤','깊은밤'],['난기류','난기류'],['random','무작위']],'비')} <label>턴 <input type="number" class="n xs" data-g="count" value="5"> (1000 = 계속)</label></div>`;
   case 'terrain':return `<div class="row">${sel('g_t',[['','해제'],['그래스필드','그래스필드'],['일렉트릭필드','일렉트릭필드'],['미스트필드','미스트필드'],['사이코필드','사이코필드'],['트릭룸','트릭룸'],['매직룸','매직룸'],['원더룸','원더룸'],['블랙룸','블랙룸']],'그래스필드')} <label>턴 <input type="number" class="n xs" data-g="count" value="5"></label></div>`;
   case 'etc':return `<div class="row">${sel('g_e',[['','해제'],['중력','중력'],['물놀이','물놀이'],['흙놀이','흙놀이']],'중력')} <label>턴 <input type="number" class="n xs" data-g="count" value="5"></label></div>`;
   case 'object':return `<div class="row">진영 ${sel('g_side',[['ally','아군'],['enemy','상대']],'ally')} 설치기 ${sel('g_o',['리플렉터','빛의장막','오로라베일','신비의부적','흰안개','주술','검은숲','얼음의장벽','신기루','순풍','무지개','습원','불바다','돌격','희망사항','압정뿌리기','독압정','스텔스록','끈적끈적네트','기뢰','지뢰원','가시원','장미원','불기둥','아이스번','얼음꼬챙이','전기발판','트램펄린','저주의묘','악의소굴','전파탑'].map(x=>[x,x]),'리플렉터')} <label>턴 <input type="number" class="n xs" data-g="count" value="5"></label></div>`;
   case 'type':return `<div class="row">대상 ${tgSel('g_tgt')} ${sel('g_mode',[['add','타입 추가'],['set','타입 변경'],['reset','원래대로']],'add')} <label>타입 (쉼표) <input type="text" data-g="types" placeholder="불꽃,비행"></label></div>`;
   case 'trait':return `<div class="row">대상 ${tgSel('g_tgt','enemy1')} ${sel('g_mode',[['set','특성 변경'],['reset','원래대로']],'set')} <label>특성 <input type="text" data-g="tn" placeholder="미라"></label></div>`;
   case 'prio':return `<div class="row">대상 ${tgSel('g_tgt')} <label>우선도 <input type="number" step="0.5" class="n xs" data-g="v" value="1"></label> ${sel('g_mode',[['add','더하기'],['set','고정'],['off','해제']],'add')} 분류 ${sel('g_cat',[['all','모두'],['물리','물리'],['특수','특수'],['변화','변화']],'all')} 타입 ${tySel('g_type','', '제한 없음')} <label>태그 <input type="text" data-g="tag" placeholder="회복,드레인"></label> ${sel('g_dur',[['keep','해제 전까지'],['turn','이번 턴']],'keep')}</div>`;
   case 'immune':return `<div class="row">대상 ${tgSel('g_tgt')} <label>상태 (쉼표) <input type="text" data-g="states" placeholder="잠듦,마비 · 이상"></label> <label><input type="checkbox" data-g="off"> 해제</label></div>`;
   case 'nodrop':return `<div class="row">대상 ${tgSel('g_tgt')} 능력 ${sel('g_st',[['','모든 능력'],...STATS.slice(0,7).map(k=>[k,ko[k]])],'')} <label>턴 <input type="number" class="n xs" data-g="turns" value="-1"></label> <label><input type="checkbox" data-g="off"> 해제</label></div>`;
   case 'ignoreup':return `<div class="row">${sel('g_dir',[['atk','공격할 때 상대의'],['recv','받을 때 상대의'],['both','주고받을 때 상대의 (천진)']],'atk')} <label><input type="checkbox" data-g="sc_def" checked> 방어</label> <label><input type="checkbox" data-g="sc_eva" checked> 회피</label> <label><input type="checkbox" data-g="sc_atk"> 공격</label> <label><input type="checkbox" data-g="sc_acc"> 명중</label> ${sel('g_iud',[['up','상승·강화 무시'],['down','감소·저하 무시'],['all','변화 모두 무시']],'up')} ${sel('g_lv',[['','랭크 + 배율'],['rank','랭크만 (상승·감소 ±N)'],['mod','배율만 (강화·저하 ×)']],'')} <label>역할 상대 <input type="text" data-g="ro" placeholder="에이스"></label> <label><input type="checkbox" data-g="off"> 해제</label></div><div class="small dim">공격할 때는 상대의 방어 · 회피, 받을 때는 상대의 공격 · 명중이 쓰인다</div>`;
   case 'noind':return `<div class="row">대상 ${tgSel('g_tgt')} ${sel('g_kind',[['','비례 대미지를 받지 않는다'],['noko','비례 대미지로는 빈사가 되지 않는다'],['hazard','설치기를 무시한다'],['hazdmg','설치기의 비례 대미지를 받지 않는다'],['recoil','반동 비례 대미지를 받지 않는다'],['switch','강제 교대를 받지 않는다']],'')} <label>턴 <input type="number" class="n xs" data-g="turns" value="-1"></label> <label><input type="checkbox" data-g="off"> 해제</label></div>`;
   case 'float':return `<div class="row">대상 ${tgSel('g_tgt')} <label>턴 <input type="number" class="n xs" data-g="turns" value="-1"></label> <label><input type="checkbox" data-g="off"> 해제</label></div>`;
   case 'role':return `<div class="row">${sel('g_mode',[['add','추가'],['remove','제거'],['clear','초기화']],'add')} <label>역할 (쉼표) <input type="text" data-g="roles" placeholder="에이스,블로커"></label></div>`;
   case 'pursuit':return `<div class="row"><label><input type="checkbox" data-g="imm"> 추격 무시 (교대해도 상대의 추격을 받지 않는다)</label> <label>대상 ${tgSel('g_tgt')}</label> <label><input type="checkbox" data-g="hide"> 숨김</label> <label><input type="checkbox" data-g="off"> 해제</label></div>`;
   case 'confirm':return `<div class="row"><label>조건 문장 <input type="text" data-g="q" placeholder="자신이 「특성 : ○○오라」일 때" style="width:360px"></label></div>`;
   case 'baseup':return `<div class="row">${BU_STS.map(s=>`<label><input type="checkbox" data-g="bu_${s}"> ${s}</label>`).join(' ')}</div><div class="row">${sel('g_bm',[['up','랭크 상승'],['down','랭크 감소'],['max','범위 최대화']],'up')} <label>랭크 <input type="number" class="n xs" data-g="n" value="1" min="1"></label></div><div class="small dim">제작기 시트의 종족치 · 실수치 · 합계에 바로 들어간다 (1랭크 = 한 등급, C→B). 배틀 중엔 바뀌지 않는다</div>`;
   case 'stmod':return `<div class="row">${sel('g_sm',STMOD_STS.map(([k,d])=>[k,k+' (기본 '+d+')']),'아쿠아링')} → <label>비율 <input type="text" class="n xs" data-g="frac" value="1/6"></label></div><div class="small dim">이 포켓몬이 그 상태일 때 턴 종료 회복 · 대미지 비율을 바꾼다 (시트에 적어 두는 값)</div>`;
   case 'future':return `<div class="row"><label>상태 <input type="text" data-g="st" value="미래예지" style="width:90px"></label> <label>위력 <input type="number" class="n xs" data-g="pow" value="0" title="0 = 기술 위력"></label> <label>기술 <input type="text" data-g="mv" placeholder="미래예지" style="width:90px"></label> 대상 ${tgSel('g_tgt','enemy1')}</div><div class="small dim">다음 턴 가장 마지막에 대미지 계산 (공격 창의 「지연」 기술은 자동으로 건다)</div>`;
   case 'transform':return `<div class="row">대상 ${tgSel('g_tgt','enemy1')} <label><input type="checkbox" data-g="keep"> 그림 유지</label> <label><input type="checkbox" data-g="off"> 변신 해제</label></div>`;
   case 'reset':return `<div class="row">${sel('g_rw',[['all','랭크 · 배율 전부'],['rank','랭크만'],['mult','배율만']],'all')} 대상 ${tgSel('g_tgt')}</div>`;
   case 'resetst':return `<div class="row">대상 ${tgSel('g_tgt')} <label><input type="checkbox" data-g="all"> 부정 상태 전부 (끄면 상태 이상만)</label></div>`;
   case 'clearobj':return `<div class="row">${sel('g_cs',[['self','자기 쪽'],['enemy','상대 쪽'],['both','양쪽']],'self')} ${sel('g_cw',[['hazard','설치기'],['wall','장벽'],['all','전부']],'hazard')}</div>`;
   case 'freesw':return `<div class="row">대상 ${tgSel('g_tgt')} <label>턴 <input type="number" class="n xs" data-g="turns" value="-1"></label> <label><input type="checkbox" data-g="off"> 해제</label></div>`;
   case 'cond':return `<div class="row">${sel('g_c',[['ally_fainted','「빈사」 상태인 아군이 있을 때'],['hp_le','HP 가 비율 이하일 때'],['self_state','자신이 이 상태일 때']],'ally_fainted')} <label>비율 <input type="text" class="n xs" data-g="frac" value="1/2"></label> <label>상태 ${stSel('g_cst','FollowMe')}</label></div>`;
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
   case 'boost':case 'guard':{let l=(kind==='boost'?'위력':'완화')+' ×'+(+g('v')||1)+tg(s('g_tgt'));if(tyK(g('types')))l+=' 타입:'+tyK(g('types'));const cat=s('g_cat');if(cat==='physical')l+=' 물리';if(cat==='special')l+=' 특수';const e=s('g_eff');if(e==='super')l+=' 굉장';if(e==='weak')l+=' 별로';if(e==='normal')l+=' 보통';const r=s('g_rng');if(r==='single')l+=' 단일';if(r==='multi')l+=' 전체기';const sb=s('g_sb');if(sb==='stab')l+=' 자속';if(sb==='nonstab')l+=' 비자속';if(tyK(g('tg')))l+=' 태그:'+tyK(g('tg'));if(+g('pmin'))l+=' 위력≥'+g('pmin');if(+g('pmax'))l+=' 위력≤'+g('pmax');if(tyK(g('ro')))l+=' 역할:'+tyK(g('ro'));const st=s('g_st');if(st==='def')l+=' 수세';if(st==='off')l+=' 공세';const cx=s('g_cx');if(cx==='sure')l+=' 확정급소';if(cx==='none')l+=' 급소없음';if(+g('cg'))l+=' 급소방호'+g('cg');if(+g('cr'))l+=' 급소+'+g('cr');if(+g('uses')>0)l+=' '+g('uses')+'회';if(g('turn'))l+=' 이번턴';if(+g('tl')>0)l+=' '+g('tl')+'턴';if(g('remove'))l+=' 해제';return l}
   case 'state':return '상태 '+String(K.stKo(s('g_state'))).replace(/\s+/g,'')+tga(s('g_tgt'))+(+g('count')>0?' '+g('count')+'턴':'')+(g('forced')?' 강제':'');
   case 'statefx':return '상태확률 '+String(K.stKo(s('g_state'))).replace(/\s+/g,'')+' '+(+g('chance')||100)+'%'+tga(s('g_tgt'))+(g('one')?' 1체':'');
   case 'cure':return '치유'+tg(s('g_tgt'))+' '+(tyK(g('states'))||'이상')+(+g('chance')&&+g('chance')<100?' '+g('chance')+'%':'');
   case 'heal':return '회복 '+(g('value')||'1/4')+tg(s('g_tgt'))+(s('g_ytype')?' 타입:'+K.TYPE_KO[s('g_ytype')]:'');
   case 'dmg':{const ats=TYPES.filter(t=>g('aty_'+t));let b=s('g_basis');if(ats.length)b='type';if(b==='type'&&!ats.length)return '';return '피해 '+(g('value')||'1/8')+tga(s('g_tgt'))+(b==='cur'?' 현재':b==='last'?' 직전':b==='type'?' 타입:'+ats.map(t=>K.TYPE_KO[t]).join(','):'')+(s('g_xtype')?' 제외:'+K.TYPE_KO[s('g_xtype')]:'')+(g('nofaint')?' 빈사없음':'')}
   case 'weather':{const w=s('g_w');return w?'날씨 '+(w==='random'?'무작위':w)+' '+(+g('count')>=1000?'계속':(+g('count')||5)):'날씨 해제'}
   case 'terrain':{const t=s('g_t');return (/룸$/.test(t)?'룸 ':'필드 ')+(t?t+' '+(+g('count')>=1000?'계속':(+g('count')||5)):'해제')}
   case 'etc':{const e=s('g_e');return '필드상태 '+(e?e+' '+(+g('count')>=1000?'계속':(+g('count')||5)):'해제')}
   case 'object':return '설치기 '+(s('g_side')==='enemy'?'상대 ':'아군 ')+s('g_o')+' '+(+g('count')>=1000?'계속':(+g('count')||5));
   case 'type':{const m=s('g_mode');return '타입'+tg(s('g_tgt'))+' '+({add:'추가',set:'변경',reset:'원래'})[m]+(m==='reset'?'':' '+tyK(g('types')))}
   case 'trait':return '특성'+tga(s('g_tgt'))+' '+(s('g_mode')==='reset'?'원래':'변경 '+g('tn'));
   case 'prio':{const m=s('g_mode');return '우선도 '+(m==='set'?'=':(+g('v')>0?'+':''))+(+g('v')||0)+tg(s('g_tgt'))+(s('g_type')?' 타입:'+K.TYPE_KO[s('g_type')]:'')+(s('g_cat')!=='all'?' '+s('g_cat'):'')+(g('tag')?' 태그:'+tyK(g('tag')):'')+(s('g_dur')==='turn'?' 이번턴':'')+(m==='off'?' 해제':'')}
   case 'immune':return '면역'+tg(s('g_tgt'))+' '+(tyK(g('states'))||'이상')+(g('off')?' 해제':'');
   case 'nodrop':return '감소무시'+tg(s('g_tgt'))+(s('g_st')?' '+K.STAT_KO[s('g_st')]:'')+(+g('turns')>0?' '+g('turns')+'턴':'')+(g('off')?' 해제':'');
   case 'ignoreup':{const sc=[['def','방어'],['eva','회피'],['atk','공격'],['acc','명중']].filter(([k])=>g('sc_'+k)).map(x=>x[1]);if(!sc.length)return '';const d=s('g_iud');return '강화무시 '+(s('g_dir')==='both'?'양방향':s('g_dir')==='recv'?'받음':'공격시')+' '+(sc.length===4?'양쪽':sc.join(' '))+(d==='all'?' 모두':d==='down'?' 감소':'')+(s('g_lv')==='rank'?' 랭크':s('g_lv')==='mod'?' 배율':'')+(tyK(g('ro'))?' 역할:'+tyK(g('ro')):'')+(g('off')?' 해제':'')}
   case 'noind':if(s('g_kind')==='switch')return '교대무시'+tg(s('g_tgt'))+(+g('turns')>0?' '+g('turns')+'턴':'')+(g('off')?' 해제':'');return '비례무시'+tg(s('g_tgt'))+({'':'',noko:' 빈사',hazard:' 설치기',hazdmg:' 설치기피해',recoil:' 반동'})[s('g_kind')]+(+g('turns')>0?' '+g('turns')+'턴':'')+(g('off')?' 해제':'');
   case 'float':return '하늘위'+tg(s('g_tgt'))+(+g('turns')>0?' '+g('turns')+'턴':'')+(g('off')?' 해제':'');
   case 'role':return '역할 '+({add:'추가',remove:'제거',clear:'초기화'})[s('g_mode')]+' '+tyK(g('roles'));
   case 'pursuit':return '추격'+(g('imm')?' 무시'+tg(s('g_tgt')):'')+(g('off')?' 해제':'')+(g('hide')?' 숨김':'');
   case 'confirm':return '확인 "'+g('q')+'"';
   case 'baseup':{const st=BU_STS.filter(x=>g('bu_'+x));if(!st.length)return '';const m=s('g_bm');return '종족치 '+st.join(',')+' '+(m==='max'?'최대':(m==='down'?'-':'+')+Math.max(1,+g('n')||1))}
   case 'stmod':{const f=String(g('frac')||'').replace(/\s+/g,'');if(!/^\d+\/\d+$/.test(f))return '';return '상태수정 '+s('g_sm')+' '+f}
   case 'future':return '예고 '+String(g('st')||'미래예지').replace(/\s+/g,'')+(+g('pow')>0?' 위력 '+(+g('pow')):'')+(String(g('mv')||'').trim()?' 기술 '+String(g('mv')).trim().replace(/\s+/g,''):'')+tga(s('g_tgt'));
   case 'transform':return g('off')?'변신 해제':'변신'+tga(s('g_tgt'))+(g('keep')?' 그림유지':'');
   case 'reset':return '초기화'+({rank:' 랭크',mult:' 배율',all:''})[s('g_rw')]+tg(s('g_tgt'));
   case 'resetst':return '상태초기화'+tg(s('g_tgt'))+(g('all')?' 전부':'');
   case 'clearobj':return '철거'+({self:'',enemy:' 상대',both:' 양쪽'})[s('g_cs')]+({hazard:'',wall:' 장벽',all:' 전부'})[s('g_cw')];
   case 'freesw':return '반드시교대'+tg(s('g_tgt'))+(+g('turns')>0?' '+g('turns')+'턴':'')+(g('off')?' 해제':'');
   case 'cond':return s('g_c')==='hp_le'?'조건 HP≤'+(g('frac')||'1/2'):s('g_c')==='self_state'?'조건 상태:'+String(K.stKo(s('g_cst'))).replace(/\s+/g,''):'조건 아군빈사';
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
  const md=A().openModal(`<div class="mhead"><h2>레디메이드 DB <span class="small dim">${names.length}</span></h2><span class="sp"></span>${gm?'<button class="btn sm" id="rmnew">새로</button><button class="btn sm ghost" id="rmsync" title="제작기의 레디메이드 DB 수정을 이 방에 가져온다">제작기 새로고침</button>':''}<button class="btn ghost" data-x>닫기</button></div>
   <div class="row"><input type="text" id="rmq" placeholder="이름 · 효과 검색" value="${esc(q||'')}" style="flex:1"><label class="small"><input type="checkbox" id="rmauto" checked> 자동화 있는 것만</label></div><div id="rmlist" class="dblist" style="max-height:60vh;overflow:auto;margin-top:6px"></div>`);
  const draw=()=>{const qq=$('#rmq',md).value.trim().toLowerCase();const onlyAuto=$('#rmauto',md).checked;const ov=((A().ST.state.dbx||{}).rm)||{};
   const rows=names.filter(n=>{const r=all[n];if(onlyAuto&&(!r.ops||!r.ops.length||r.manual))return false;return !qq||n.toLowerCase().includes(qq)||String(r.text||'').toLowerCase().includes(qq)}).slice(0,200);
   $('#rmlist',md).innerHTML=rows.map(n=>{const r=all[n];return `<div class="rmrow"><div class="row"><b>${esc(n)}</b>${ov[n]?'<span class="tag">'+(ov[n].src==='maker'?'제작기':'방 수정')+'</span>':''}${r.manual?'<span class="tag" style="background:#555">손으로</span>':''}${(()=>{const pc=rmPct(n,r);return pc.v?`<span class="tag" title="${pc.src==='p'?'레디메이드에 적어 둔 확률':'효과 글에서 읽은 확률'}" style="background:${pc.src==='p'?'#8a5a00':'#3a4a66'}">🎲 ${pc.v}%${pc.src==='p'?'':' (글)'}</span>`:''})()}<span class="sp"></span>${gm?`<button class="btn xs" data-rmedit="${esc(n)}">수정</button>`:''}</div><div class="small dim" style="white-space:pre-wrap">${esc(r.text||'')}</div>${r.ops&&r.ops.length?`<pre class="pm small">${esc(K.unparse(r.ops).join('\n'))}</pre>`:''}</div>`}).join('')||'<div class="dim small">없음</div>';
   md.querySelectorAll('[data-rmedit]').forEach(b=>b.onclick=()=>editRm(b.dataset.rmedit))};
  draw();$('#rmq',md).addEventListener('input',draw);$('#rmauto',md).onchange=draw;const nb=$('#rmnew',md);if(nb)nb.onclick=()=>editRm('');const sy=$('#rmsync',md);if(sy)sy.onclick=()=>syncRm(()=>{A().closeModal();openRm($('#rmq',md)?$('#rmq',md).value:'')});}
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
   <div class="fxg-pal">${GROUPS.map(([gl,ks])=>`<span class="fxg-gl">${esc(gl)}</span><div class="fxg-bs">${ks.map(([k,l])=>`<button type="button" class="fxg-k" data-gk="${k}">${esc(l)}</button>`).join('')}</div>`).join('')}</div>
   <div class="fxg-form" hidden><div class="fxg-ttl"><b data-gt></b><span data-gd></span></div><div data-gf></div>
    <div class="fxg-opt"><label>확률 <select data-gx="pk"><option value="">없음 (항상)</option><option value="pct">직접 (할 · %)</option><option>드물게</option><option>저확률</option><option>중확률</option><option>고확률</option></select></label><label data-gpn hidden><input type="number" class="n xs" data-gx="pn" value="30" min="1" max="99">%</label>
     <label title="이 효과를 쓴 포켓몬이 필드를 떠나면(교대 · 퇴장 · 빈사) 되돌린다"><input type="checkbox" data-gx="hold"> 필드 위에 있는 한 (나가면 풀림)</label><label data-glb hidden>선택지 이름 <input type="text" data-gx="lab" placeholder="① 특공 +1" style="width:130px"></label></div>
    <div class="fxg-out"><code data-gline></code><button type="button" class="btn sm pri" data-gadd>+ 줄 추가</button></div></div>
   <div class="fxg-ch" data-gch hidden>🔀 선택지를 넣는 중 — 지금부터 넣는 줄이 하나씩 선택지가 된다 <button type="button" class="btn sm" data-gend>선택지 끝</button></div></div>`;
  const q=s=>host.querySelector(s);let kind='';let inCh=/(^|\n)\s*(선택|선택 여럿|선택:)\s*(\n\s*-[^\n]*)*\s*$/.test(ta.value);
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
 return {openEditor,openRm,HELP,mountGen};
})();
