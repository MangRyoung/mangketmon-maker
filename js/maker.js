"use strict";
const $=(s,r=document)=>r.querySelector(s), $$=(s,r=document)=>[...r.querySelectorAll(s)];
const esc=s=>String(s??'').replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const uid=()=>Math.random().toString(36).slice(2,10);
const clone=o=>JSON.parse(JSON.stringify(o));
/* 이미지는 data:image 만, 색은 #hex · 이름 · rgb() 만 받는다 (백업·공유 저장소로 들어온 값이 HTML을 깨지 않게) */
const safeImg=u=>/^data:image\/(png|jpe?g|webp|gif);base64,[A-Za-z0-9+/=]+$/.test(String(u||''))||/^https:\/\/[^\s"'<>()\\]+$/.test(String(u||''))?u:'';/* 시트 안 그림(data URL) 또는 공유 저장소에 올린 그림 주소 */
const safeCss=c=>/^(#[0-9a-f]{3,8}|[a-z]{3,20}|rgba?\([\d\s.,%]+\)|var\(--[\w-]+\))$/i.test(String(c||'').trim())?String(c).trim():'';
/* data-p 경로의 한 칸: 「.」과 「%」가 든 이름(포인트 항목 등)도 쓸 수 있게 */
const seg=k=>String(k).replace(/%/g,'%25').replace(/\./g,'%2E');
const unseg=k=>String(k).replace(/%2E/gi,'.').replace(/%25/g,'%');
const DEF=window.MKM_DB;
if(DEF&&!Array.isArray(DEF.cards))DEF.cards=[];   /* 카드 DB (10-26 망령) — 기본 행 없이 오리지널로만 채운다 */
/* 포텐셜 종류 표기를 「번호. 이름」 하나로 (00.1.역할 → 00.1. 역할, 14.특권 → 14. 특권). 필터·템플릿 매칭이 갈라지지 않게 */
const normKind=k=>String(k==null?'':k).replace(/^(\d+(?:\.\d+)*\.)\s*(?=\S)/,'$1 ');
for(const r of DEF.pots||[])if(r)r[0]=normKind(r[0]);
/* 제작기에서 고친 레디메이드 → fx.js 가 기본 대신 쓴다 (행이 바뀐 것만 다시 파싱) */
const RMC=new Map();window.MKM_RM=()=>{const rows=(S&&S.db&&S.db.rm)||[];const out={};for(const r of rows){const key=r[0];if(!key)continue;const sig=r[1]+'\u0001'+r[2]+'\u0001'+r[3]+'\u0001'+(r[4]||'');let c=RMC.get(key);if(!c||c.sig!==sig){c={sig,v:{text:r[1]||'',ops:window.OM_FX?window.OM_FX.parse(r[2]||'').ops:[],manual:r[3]==='O'?1:0}};{const pc=String(r[4]==null?'':r[4]).trim();if(pc!==''&&+pc>0)c.v.p=Math.min(100,+pc)}RMC.set(key,c)}out[key]=c.v}return out};
/* 레디메이드 DB: data/readymade.js 를 행으로 (이름 · 효과 글 · 구문 · 손으로). 수정은 다른 DB 처럼 dbedit 로 공유되고, 오레마스가 「제작기 새로고침」으로 가져간다 */
if(!Array.isArray(DEF.rm))DEF.rm=[];/* 행은 fx 스크립트를 불러온 뒤 rmInit 이 채운다 */
function rmInit(){if(!(window.OM_DB&&window.OM_DB.readymade&&window.OM_FX))return false;if(!DEF.rm||!DEF.rm.length){DEFJ=null;DEF.rm=Object.keys(window.OM_DB.readymade).sort((a,b)=>a.localeCompare(b,'ko')).map(n=>{const r=window.OM_DB.readymade[n];return [n,String(r.text||''),window.OM_FX.unparse(r.ops||[]).join('\n'),r.manual?'O':'',r.p!=null?String(r.p):'']})}
 /* 공유 모드: 레디메이드 기본 행이 이제 생겼으니 받아 둔 수정 행(dbedit/rm.*)을 그 위에 다시 짠다 */
 let shr=false;try{shr=SH.ready}catch(e){}if(shr){shRebuildDB();return true}
 if(S.db&&(!S.db.rm||!S.db.rm.length)){S.db.rm=clone(DEF.rm);if(!S.custom.rm)S.custom.rm=[];reindex()}return true}
const rmLoaded=()=>!!(DEF.rm&&DEF.rm.length);
/* 상태 변화 DB: js/fx/states.js ({v,groups,hidden,st}) 를 행으로. 맵툴 「상태 변화 DB」의 백업 JSON 과 같은 꼴이라 그대로 불러오고 내보낼 수 있다.
   수정은 dbedit/st.* 로 공유되고, 오레마스가 「제작기 새로고침」으로 가져간다. 제작기 안의 구문 엔진도 고친 표를 바로 쓴다 */
if(!Array.isArray(DEF.st))DEF.st=[];let ST_BASE=null;const ST_HIDE='(숨김)';
function stRowsOf(o){o=o||{};const st=o.st||{};const gOf={};(o.groups||[]).forEach(g=>(g.s||[]).forEach(k=>{if(!gOf[k])gOf[k]=g.l}));const hid=new Set(o.hidden||[]);const ord=[];(o.groups||[]).forEach(g=>(g.s||[]).forEach(k=>{if(st[k]&&!ord.includes(k))ord.push(k)}));for(const k in st)if(!ord.includes(k))ord.push(k);
 return ord.map(k=>{const e=st[k]||{};return [k,String(e.ko||''),gOf[k]||(hid.has(k)?ST_HIDE:''),String(e.min??''),String(e.max??''),String(e.roll||''),String(e.prog||''),e.abn?'O':'',e.neg?'O':'',e.bat?'O':'',(Array.isArray(e.desc)?e.desc:String(e.desc||'').split('\n')).join('\n'),String(e.memo||''),String(e.img||'')]})}
function stObjOf(rows){const st={},groups=[],gi={},hidden=[];const num=v=>{const n=+v;return v===''||isNaN(n)?0:n};
 for(const r of rows||[]){const k=String(r[0]||'').trim();if(!k)continue;st[k]={ko:r[1]||k,min:num(r[3]),max:num(r[4]),roll:r[5]||'',abn:r[7]==='O'?1:0,neg:r[8]==='O'?1:0,bat:r[9]==='O'?1:0,prog:r[6]||'turn',desc:String(r[10]||'').split(/\r?\n/).map(x=>x.trim()).filter(Boolean),memo:r[11]||''};if(r[12])st[k].img=r[12];
  const g=String(r[2]||'').trim();if(g===ST_HIDE||!g){hidden.push(k);continue}if(gi[g]==null){gi[g]=groups.length;groups.push({l:g,s:[]})}groups[gi[g]].s.push(k)}
 return {v:1,groups,hidden,st}}
function stInit(){const o=window.OM_DB&&window.OM_DB.states;if(!o||!o.st)return false;if(!ST_BASE)ST_BASE=clone(o);if(!DEF.st||!DEF.st.length){DEFJ=null;DEF.st=stRowsOf(ST_BASE)}
 let shr=false;try{shr=SH.ready}catch(e){}if(shr){shRebuildDB();stApply();return true}
 if(S.db&&(!S.db.st||!S.db.st.length)){S.db.st=clone(DEF.st);if(!S.custom.st)S.custom.st=[];reindex()}
 /* 아이콘 칸이 생기기 전에 저장된 행: 기본 아이콘을 채운다 (안 채우면 모든 행이 「바뀐 행」이 된다) */
 for(const r of (S.db&&S.db.st)||[])if(r.length<13){const d=DEF.st.find(x=>x[0]===r[0]);r[12]=d?d[12]:''}stApply();return true}
/* 아이콘: 파일 이름이면 오레마스 img/state/ 의 것, 주소(https:·data:)면 그대로 */
const stIcon=v=>!v?'':/^(https?:|data:image\/)/.test(v)?v:'https://mangryoung.github.io/oremas/img/state/'+encodeURIComponent(v);
const stLoaded=()=>!!(DEF.st&&DEF.st.length);
function stApply(){if(!stLoaded()||!S.db||!S.db.st||!S.db.st.length||!window.OM_DB)return;window.OM_DB.states=stObjOf(S.db.st)}
const lazyOk=k=>k==='rm'?rmLoaded():k==='st'?stLoaded():true;

/* ---------- 기본 보조 데이터 ---------- */
const TAGS_DEF=[
 ['N/시','조건을 채웠을 때 시합에 N번까지 사용할 수 있다. 무효화되어도 횟수를 소모한다.','1/시|2/시|3/시|N/시'],
 ['자동','【N/시】와 함께 쓴다. 조건을 채우면 자동으로 사용되며, 그 시점에 횟수를 소모한다.',''],
 ['선행','지시 입력 때 미리 선행 입력해 두고, 조건을 만족하면 반드시 발동한다. 포텐셜 종류별로 1개까지.',''],
 ['강제','모든 발동 조건을 무시하고 강제로 발동시켰을 때 붙는다. 횟수를 소모하지 않는다.',''],
 ['임의','발동 조건을 무시하고 임의의 타이밍에 발동한다. 횟수를 소모한다.',''],
 ['사전','트레이너의 지시 전에 해당하는 효과. 『포켓몬 도감』『스카우터』, 선언계 『고유』 정도.',''],
 ['야생','『야생』일 때만 발동한다. 포획되면 보통 제거된다.',''],
 ['방호','기술의 대미지를 덜 받거나 무효화하는 모든 효과.',''],
 ['방호 (조건)','대미지를 덜 받는 데 쓰였을 때만 방호로 취급하는 효과(능력 강화 등).',''],
 ['동조','적진의 같은 『역할』에 작동하는 효과. 아군이면 (아군), 상대에게 상시 작용하면 (상대).','동조|동조 (아군)|동조 (상대)'],
 ['등장','필드에 등장했을 때 작동한다. 등장 방식을 괄호로 한정한다. 「다음 기술」 표현과 함께 쓴다.','등장|등장 (통상 교대)|등장 (임의 교대)|등장 (죽어내밀기)|등장 (상대)'],
 ['퇴장','필드를 떠날 때 작동한다. 강제 교대는 (강제 교대) 외의 퇴장을 발동하지 않는다.','퇴장|퇴장 (통상 교대)|퇴장 (임의 교대)|퇴장 (강제 교대)|퇴장 (빈사)'],
 ['지연','필드에 등장하여 N번째 턴(N은 보통 2 이상). (아군, N턴), (N턴 동안)도 있다.','지연 (2턴)|지연 (3턴)|지연 (아군, 2턴)|지연 (2턴 동안)|지연 (아군, 2턴 동안)'],
 ['지원','PT에 참여하고 있을 때(소지 중 포함). 「빈사」면 작동하지 않으며, 빈사 중에도 작동하면 (빈사).','지원|지원 (빈사)'],
 ['수세','자신이 공격을 지시받지 않았을 때. 자신의 기술 위력과는 연계되지 않는다.',''],
 ['공세','대상이 공격을 지시받지 않았을 때. 상대의 기술 위력과는 연계되지 않는다.',''],
 ['함성','포켓몬을 쓰러뜨렸을 때. 여러 마리를 한 번에 쓰러뜨리면 그만큼 발동한다.','함성|함성 (「알그룹 : 인간형」)'],
 ['자질','트레이너의 특정 자질이 지정 랭크 이상일 때. 이하 조건은 「지시 : C 이하」처럼.','지시 : B|지시 : A|육성 : B|육성 : A|통솔 : B|통솔 : A|능력 : B|능력 : A|지시 : C 이하'],
 ['유일','같은 이름·파생 효과와 중첩되지 않고 가장 높은 값만 적용한다. 제약은 중첩된다.','유일|유일 (『결계』)|유일 (「소지품」)'],
 ['소진','1턴에 1번. 소지에 들어갔다 다시 나와도 그 턴에는 쓸 수 없다.',''],
 ['탈진','연속된 턴에 사용할 수 없다. 발동 후 다음 턴 종료 시까지 사용 불가.',''],
 ['보급','필드에 등장하여 1번만. 다시 쓰려면 소지에 들어갔다 나와야 한다.',''],
 ['공유','발동한 턴 종료 시까지 다른 【공유】 효과를 발동할 수 없다.','공유|공유 (『지령』)'],
 ['중첩','조건을 달성할 때마다 같은 효과가 N번까지 누적된다.','중첩 (2회)|중첩 (3회)'],
 ['연동','자신이 특정 조건을 충족했을 때 연동해서 발동한다. (아군)은 아군에게, (상대)는 상대에게 조건을 달성시켰을 때.','연동 (「특성 : ○○」)|연동 (아군)|연동 (상대)']
];
const TAGS_V=3;
/* 10-27 망령: 태그 사전 · 기초 템플릿의 버전(TAGS_V · TPL_V)을 올려도 고친 표를 기본값으로 갈아끼우지 않는다.
   내 행은 그대로 두고, 기본값에 새로 생긴 행만 뒤에 더한다. 기존 행 문구를 바꿔야 하면 tplSoloV 처럼 단계(마이그레이션)를 따로 쓴다 */
function verMerge(mine,def,keyOf){if(!Array.isArray(mine))return clone(def);const have=new Set(mine.map(keyOf));return clone(mine).concat(clone(def.filter(r=>!have.has(keyOf(r)))))}
const tagKey=r=>String(r&&r[0]),tplKey=r=>[r&&r[0],r&&r[1],r&&r[2]].join('|');
const TPL_DEF=[
 ['공통','*','메인','4','기존 시트 기본값','4'],
 ['통솔','D','통솔점','6','룰북 · 1인(2체) 3/3/4/5에서 파트너 할인 2점(D는 없음)을 뺀 값','3'],['통솔','C','통솔점','6','룰북 · 1인(2체) 3/3/4/5에서 파트너 할인 2점(D는 없음)을 뺀 값','1'],['통솔','B-','통솔점','7','룰북 · 1인(2체) 3/3/4/5에서 파트너 할인 2점(D는 없음)을 뺀 값','1.5'],['통솔','B','통솔점','8','룰북 · 1인(2체) 3/3/4/5에서 파트너 할인 2점(D는 없음)을 뺀 값','2'],['통솔','A','통솔점','10','룰북 · 1인(2체) 3/3/4/5에서 파트너 할인 2점(D는 없음)을 뺀 값','3'],['통솔','AA','통솔점','12','룰북 · 1인(2체) 3/3/4/5에서 파트너 할인 2점(D는 없음)을 뺀 값','4'],
 ['육성','D','분배레벨','5','룰북 · 1인(2체)은 6체의 1/3 반올림','2'],['육성','C','분배레벨','10','룰북 · 1인(2체)은 6체의 1/3 반올림','3'],['육성','B-','분배레벨','10','룰북 · 1인(2체)은 6체의 1/3 반올림','3'],['육성','B','분배레벨','15','룰북 · 1인(2체)은 6체의 1/3 반올림','5'],['육성','A','분배레벨','20','룰북 · 1인(2체)은 6체의 1/3 반올림','7'],
 ['공통','*','「기술 할인점」','6','공통 요소 · 1인(2체)은 6의 1/3 = 2','2'],['공통','*','【1/시】','3','공통 요소 · 1인은 1','1']
];
const TPL_V=3;
/* 1인 기준(2체)의 PT 기술점 · 육성 랭크별. 테이블·계산식 탭에서 고친다 */
const SOLO_SOCK_DEF={D:'11',C:'11.5',B:'12',A:'12.5'};
/* 템플릿 행을 [자질,랭크,항목,값(6체),비고,값(1인)] 6칸으로 맞추고, 빈 1인 값은 기본값(없으면 6체 값)으로 채운다. 로컬·공유 저장소 어느 쪽에서 왔든 같은 처리 */
function tplNormalize(db){const strip0=r=>String(r||'').replace(/[+-]/g,'');
 if(!Array.isArray(db.tpl))db.tpl=clone(TPL_DEF);
 for(const r of db.tpl)while(r.length<7)r.push('');
 /* 「기술 할인점」·【1/시】는 능력과 관계없는 공통 요소 */
 for(const r of db.tpl)if(r[0]==='능력'&&(r[2]==='「기술 할인점」'||r[2]==='【1/시】')){r[0]='공통';r[1]='*'}
 if((db.tplSoloV||0)<2){const solo=db.tpl.filter(r=>r[5]==='1인');db.tpl=db.tpl.filter(r=>r[5]!=='1인');
  for(const r of solo){const m=db.tpl.find(x=>x[0]===r[0]&&x[1]===r[1]&&x[2]===r[2])||db.tpl.find(x=>x[2]===r[2]&&strip0(x[1])===strip0(r[1]))||db.tpl.find(x=>x[2]===r[2]);if(m)m[5]=r[3];else db.tpl.push([r[0],r[1],r[2],r[3],r[4],r[3]])}
  db.tplSoloV=2}
 if((db.tplSoloV||0)<3){for(const r of db.tpl)if(r[2]==='「기술 할인점」'&&String(r[5])==='2')r[5]='3';db.tplSoloV=3}
 /* 1인(2체) 통솔점 = 6체의 1/3 반올림: D·C·B- 2, B·A 3, AA 4 */
 if((db.tplSoloV||0)<4){const T={D:'2',C:'2','B-':'2',B:'3',A:'3',AA:'4'};for(const r of db.tpl)if(r[2]==='통솔점'&&T[r[1]]!=null){r[5]=T[r[1]];r[4]='룰북 · 1인(2체)은 6체의 1/3 반올림'}db.tplSoloV=4}
 /* 1인(2체) 분배레벨 = 6체의 1/3 반올림: D 2 · C·B- 3 · B 5 · A 7, 「기술 할인점」 2 */
 if((db.tplSoloV||0)<5){const T={D:'2',C:'3','B-':'3',B:'5',A:'7'};for(const r of db.tpl){if(r[2]==='분배레벨'&&T[r[1]]!=null)r[5]=T[r[1]];if(r[2]==='「기술 할인점」'&&String(r[5])==='3')r[5]='2'}db.tplSoloV=5}
 /* 10-25 종족치 개편: 1인(2체) 통솔점 = 룰북 표 D 3 / C 3 / B 4 / A 5 에서 파트너 할인(2체 × 1점, D는 없음)을 뺀 값 */
 if((db.tplSoloV||0)<6){const T={D:'3',C:'1','B-':'1.5',B:'2',A:'3',AA:'4'};for(const r of db.tpl)if(r[2]==='통솔점'&&T[r[1]]!=null){r[5]=T[r[1]];r[4]='룰북 · 1인(2체) 3/3/4/5에서 파트너 할인 2점(D는 없음)을 뺀 값'}db.tplSoloV=6}
 for(const r of db.tpl){if(r[5]==null||r[5]===''||r[5]==='1인'){const d=TPL_DEF.find(d=>d[0]===r[0]&&d[1]===r[1]&&d[2]===r[2])||TPL_DEF.find(d=>d[2]===r[2]&&strip0(d[1])===strip0(r[1]));r[5]=d?d[5]:r[3]}}
 if(!Array.isArray(db.ilock))db.ilock=[];
 for(const r of db.tpl)if(typeof r[4]==='string')r[4]=r[4].replace(/\s*\(\d{4}-\d{2}-\d{2}[^)]*\)/g,'');
 if(!db.soloSock)db.soloSock=clone(SOLO_SOCK_DEF);for(const k in SOLO_SOCK_DEF)if(db.soloSock[k]==null||db.soloSock[k]==='')db.soloSock[k]=SOLO_SOCK_DEF[k];
 rulesNormalize(db)}
/* 포켓몬 시트 템플릿: 자질 '기본'은 항상, 그 밖에는 트레이너 자질이 해당 랭크 이상일 때 추가 */
const STPL_DEF=[
 ['기본','','00. 역할','역할 포텐셜','기본','전원'],['기본','','01.0. 분류','현대종','기본','전원'],['기본','','04.1. 종족','종족 포텐셜①','기본','전원'],['기본','','04.2. 종족','종족 포텐셜②','기본','전원'],['기본','','05. 속별','속별 포텐셜','기본','전원'],
 ['육성','A','08.1. 회피','약점회피','룰북: 육성 A · 전원 『계제』『속별』『회피+내성』 중 3개','전원'],['육성','A','09.1. 내성','약점내성','룰북: 육성 A · 전원 『계제』『속별』『회피+내성』 중 3개','전원'],
 ['지시','A','12.1. 전술','전술 포텐셜①','룰북: 지시 A · 파트너 전원 『전술』','파트너'],
 ['통솔','C','06. 유대','유대 포텐셜','룰북: 통솔 C · 파트너 『유대』 1체','파트너 1체'],
 ['통솔','B','14. 특권','익스펜션 : ○○','룰북: 통솔 B · PT 전원 『익스펜션』','전원'],
 ['통솔','A','06. 유대','유대 포텐셜','룰북: 통솔 A · 『영혼의 유대』 1체 추가 (1인 기준 2체 모두)','파트너 2체']
];
const STPL_V=4;
/* v2 → v3: 기본값은 새 표로, 사용자가 더한 행은 뒤에 남긴다. 대상 칸(6번째)이 없으면 「전원」. v3 → v4: 『계제』 행 제거(종족 포텐셜로 대체) */
const STPL_V2=[['기본','','00. 역할','역할 포텐셜'],['기본','','01.0. 분류','현대종'],['기본','','04.1. 종족','종족 포텐셜①'],['기본','','04.2. 종족','종족 포텐셜②'],['기본','','05. 속별','속별 포텐셜'],['육성','A','08.1. 회피','약점회피'],['육성','A','09.1. 내성','약점내성'],['지시','A','12.1. 전술','전술 포텐셜①'],['통솔','B','14. 특권','익스펜션 : ○○']];
const stplIsGyeje=r=>r&&(/계제 포텐셜/.test(String(r[3]||''))||/^05\.1\./.test(String(r[2]||'')));
function stplMigrate(old,v){if(!Array.isArray(old))return clone(STPL_DEF);if((v||0)>=STPL_V)return old.map(r=>{const x=r.slice();if(x[5]==null)x[5]='전원';return x});
 if((v||0)>=3)return old.filter(r=>!stplIsGyeje(r)).map(r=>{const x=r.slice();if(x[5]==null)x[5]='전원';return x});
 const key=r=>[r[0],r[1],r[2],r[3]].join('|');const base=new Set(STPL_V2.map(key)),now=new Set(STPL_DEF.map(key));
 return [...clone(STPL_DEF),...old.filter(r=>r&&!base.has(key(r))&&!now.has(key(r))&&!stplIsGyeje(r)).map(r=>{const x=r.slice();if(x[5]==null)x[5]='전원';return x})]}
/* 템플릿으로 자동 삽입됐던 『계제 포텐셜』 슬롯 비우기 (효과를 직접 쓴 칸은 남긴다) */
const STPL_PURGE=['계제 포텐셜①','계제 포텐셜②','계제 포텐셜③'];
function stplPurge(){let n=0;for(const t of S.trainers)for(const p of t.pokemon||[])(p.pots||[]).forEach((x,i)=>{if(STPL_PURGE.includes(x)&&!(p.potEff&&p.potEff[i])){p.pots[i]='';if(p.potKind)p.potKind[i]='';n++}});return n}
const STATS=['HP','공격','방어','특공','특방','스피드'];
const RANKS=['S','AAA+','AAA','AAA-','AA+','AA','AA-','A+','A','A-','B+','B','B-','C+','C','C-','D+','D','D-','E+','E','E-'];
const QUAL=['지시','육성','통솔','능력'];
const SLOTS=['역할','분류','주인','이명','종족①','종족②','종족③','종족④','속별','정/유대','선','회피','내성','격','범용','전술①','전술②','부수','특권','PT'];
const DBS={
 moves:{t:'기술',key:2,cols:['소켓','기술 태그','기술명','일명','영명','타입','분류','위력','명중','범위','접촉','우선도','분류(태그)','추가 효과','공격 스탯','방어 스탯','비고','등장 시기','최소 공격 횟수','최대 공격 횟수'],show:[2,5,6,7,8,9,10,11,0,13],eff:13},
 abil:{t:'특성',key:1,cols:['소켓','특성','효과','틀깨기','방호 특성'],show:[1,0,3,4,2],eff:2},
 items:{t:'소지품',key:1,cols:['종류','도구','별칭','소모(O)','효과','소켓','비고','구문'],show:[1,0,2,3,5,4,7,6],eff:4},   /* 구문 = 오레마스 소지품 자동화 (js/fx/itemrule.js, 10-24 망령) */
 pots:{t:'포텐셜',key:1,cols:['종류(순서)','이름','효과','비고'],show:[1,0,2,3],eff:2},
 old:{t:'올드 타입',key:1,cols:['지역','포켓몬','Name','타입1','타입2','특성1','특성2','숨겨진 특성','알그룹1','알그룹2','메가','HP','공격','방어','특공','특방','스피드','프라이드'],show:[1,0,3,4,5,6,7,8,9,11,12,13,14,15,16,17],eff:-1},
 points:{t:'포인트',key:4,cols:['번호','분류','세부','소모 항목','이름','효과','소모 포인트','상시 공개'],show:[4,1,2,3,6,5,7],eff:5},
 rm:{t:'레디메이드',key:0,cols:['이름','효과 글','구문','손으로','확률'],show:[0,1,4,2,3],eff:1},   /* 확률 = 발동 확률 % (비우면 효과 글의 「N할로」 등에서, 10-24 망령) */
 cards:{t:'카드',key:1,cols:['덱','이름','종류','비용','효과','색','그림 주소','기본 장수','비고','자동화 구문'],show:[6,1,0,2,3,7,4,8],eff:4},   /* 카드 DB (10-26 망령): 오레마스 덱 카드와 같은 칸 — 이름 n · 종류 t · 비용 c · 효과 x · 색 col · 그림 img · 장수 q. 트레이너 시트 「덱 관리」가 여기서 고른다 */
 st:{t:'상태 변화',key:0,cols:['키(영문)','이름','그룹','기본 턴','최대 턴','턴 굴림','진행','상태 이상','불리','배턴','설명','메모','아이콘'],show:[12,1,0,2,3,4,6,7,8,9,10],eff:10}
};

/* ---------- 상태 ---------- */
const K_T='mkm_trainers_v2',K_DB='mkm_db_v2',K_OLD='mangketmon_maker_v1';
function lsGet(k){try{return localStorage.getItem(k)}catch(e){return null}}
function lsSet(k,v){try{localStorage.setItem(k,v);return true}catch(e){return false}}
let S={db:null,custom:{moves:[],abil:[],items:[],pots:[],points:[],old:[]},trainers:[],folders:[],ui:{tab:'char'}};
function load(){
 let db=null,tr=null;
 try{db=JSON.parse(lsGet(K_DB)||'null')}catch(e){}
 try{tr=JSON.parse(lsGet(K_T)||'null')}catch(e){}
 if(!tr){try{const o=JSON.parse(lsGet(K_OLD)||'null');if(o){tr={trainers:o.trainers||[]};if(o.db)db={db:o.db,custom:{}}}}catch(e){}}
 S.db=db&&db.db?db.db:clone(DEF);
 if(db&&db.custom)Object.assign(S.custom,db.custom);
 if(tr){S.trainers=tr.trainers||[];if(tr.ui)S.ui=Object.assign(S.ui,tr.ui)}
 S.folders=tr&&Array.isArray(tr.folders)?tr.folders.filter(f=>f&&f.id):[];
 for(const k in DEF)if(S.db[k]==null)S.db[k]=clone(DEF[k]);
 if(!S.db.tags||(S.db.tagsV||0)<TAGS_V){S.db.tags=verMerge(S.db.tags,TAGS_DEF,tagKey);S.db.tagsV=TAGS_V}
 S.custom.old=S.custom.old||[];for(const k in DBS)if(!S.custom[k])S.custom[k]=[];
 if(S.db.oldSock==null)S.db.oldSock=5.5;
 if(!S.db.ptItems)S.db.ptItems=clone(PTI_DEF);
 if(!S.db.pride)S.db.pride=clone(PRIDE_DEF);prideMigrate(S.db);ptiMigrate(S.db);
 if(!S.db.tpl||(S.db.tplV||0)<TPL_V){S.db.tpl=verMerge(S.db.tpl,TPL_DEF,tplKey);S.db.tplV=TPL_V}
 tplNormalize(S.db);
 {const _sv=S.db.stplV||0;S.db.stpl=stplMigrate(S.db.stpl,S.db.stplV);S.db.stplV=STPL_V;if(_sv<4&&_sv>0)stplPurge()}
 reindex();
 S.trainers.forEach(fixT);dedupeIds();
 if(!S.trainers.length)S.trainers.push(sampleTrainer());
}
let dbDirty=false,svT=null;
function save(dbToo){if(dbToo){dbDirty=true;SH.dbDirty=true}clearTimeout(svT);svT=setTimeout(()=>{
 mkmChanged();if(SH.failed)lsSet('mkm_unsynced','1');let ok=lsSet(K_T,JSON.stringify({trainers:S.trainers,folders:S.folders,ui:S.ui}));
 if(dbDirty){ok=lsSet(K_DB,JSON.stringify({db:S.db,custom:S.custom}))&&ok;dbDirty=false}
 if(SH.on){shFlush();return}
 $('#saved').textContent=ok?'자동 저장 '+new Date().toLocaleTimeString('ko-KR',{hour:'2-digit',minute:'2-digit'}):'브라우저 저장 실패 · 백업 저장을 눌러 파일로 보관하세요'},300)}
const idx={};
function reindex(){for(const r of (S.db&&S.db.pots)||[])if(r&&r[0])r[0]=normKind(r[0]);for(const r of (S.db&&S.db.stpl)||[])if(r&&r[2])r[2]=normKind(r[2]);
 for(const k in DBS){const m=new Map();for(const r of S.db[k])if(r[DBS[k].key]!==''&&!m.has(r[DBS[k].key]))m.set(r[DBS[k].key],r);idx[k]=m}}

/* ---------- 계산 ---------- */
const strip=r=>String(r||'').replace(/[+-]/g,'');
function baseLevel(rank){const r=S.db.lvl.find(x=>x[0]===rank)||S.db.lvl.find(x=>x[0]===strip(rank));return r?+r[2]:100}
function sockRow(rank){return S.db.sock.find(x=>x[0]===strip(rank))||S.db.sock.find(x=>x[0]==='C')}
function grade(v){if(v===''||v==null||isNaN(+v))return '-';let g='-';for(const [b,c] of S.db.grade){if(b===''||isNaN(+b))continue;if(+b<=+v)g=c;else break}return g}
function gcol(g){const s=strip(g);return {S:'var(--g-s)',AAA:'var(--g-aaa)',AA:'var(--g-aa)',A:'var(--g-a)',B:'var(--g-b)',C:'var(--g-c)',D:'var(--g-d)',E:'var(--g-e)',EX:'var(--g-s)'}[s]||'var(--g-e)'}
function lv(t,p){return baseLevel(t.ranks['육성'])+(Math.round(+p.dist)||0)}
/* 테이블(더블) Q198:Q203 — 개체치·노력치·성격 미사용(0 / 0 / 1.0) */
/* 10-22 망령: 특성 · 포텐셜 · 전용에 적힌 「○○의 종족치를 N랭크 상승(감소)시킨다」 → 실수치 · 등급 · 종족치 합에 반영.
   10-27 망령 (룰북 「종족치」의 랭크 범위 개정): 1랭크 = 알파벳 등급 하나 (C → B), 칸(- · 무 · +)은 유지하고 그 칸에서 가장 낮은 값이 된다 (A- 110 · 119 → AA- 140).
   「종족치 범위를 최대화」 = 지금 칸(- · 무 · +)의 맨 위 (AA- 140 → 149). 옛 「「+」 보정을 가한다」도 같은 효과로 읽는다.
   「자신을 「X : R」로 만든다」 = 그 종족치 1랭크 상승과 같다 → 지금 칸이 R 보다 한 등급 아래일 때만 (A+ 만들기 = B+ 필요), 아니면 점검 경고.
   「「공격 : C」일 때」 = C0 칸만 (C- · C+ 아님), 「이상 · 이하」도 칸까지 비교. 【육성 : A】 같은 트레이너 랭크 조건은 그대로. 조건은 원래 종족치로 본다.
   예정 합계 경고는 원래 종족치로 본다 (특성으로 오른 몫은 특성 TO 로 낸 값) */
const BU_ST={'HP':0,'공격':1,'방어':2,'특공':3,'특방':4,'스피드':5};
const BU_L=['E','D','C','B','A','AA','AAA','S','EX'];
function buRows(){const L=[];for(const [b,c] of (S.db&&S.db.grade)||[]){if(b===''||isNaN(+b)||!c||c==='-')continue;L.push([+b,String(c)])}L.sort((a,b)=>a[0]-b[0]);return L.map((r,i)=>({lo:r[0],hi:L[i+1]?L[i+1][0]-1:Math.max(r[0],255),g:r[1],l:strip(r[1])}))}
function buAt(R,v){let k=-1;for(let i=0;i<R.length;i++)if(R[i].lo<=v)k=i;return k}
/* 칸 이름(C- · C · C+)을 낮은 칸부터의 순번으로 */
function buIdx(g){const R=buRows();return R.findIndex(r=>r.g===g)}
function buSub(g){g=String(g||'');return g.endsWith('+')?'+':g.endsWith('-')?'-':''}
function gradeStep(v,n){v=+v||0;const R=buRows();const k=buAt(R,v);if(k<0||!n)return v;const cur=R[k];const L=[...new Set(R.map(r=>r.l))];const li=L.indexOf(cur.l);const tl=L[Math.max(0,Math.min(L.length-1,li+n))];if(tl===cur.l)return v;
 const ts=R.filter(r=>r.l===tl);const T=ts.find(r=>buSub(r.g)===buSub(cur.g))||ts[Math.min(R.filter(r=>r.l===cur.l).indexOf(cur),ts.length-1)]||ts[0];
 return T.lo}   /* 10-27: 옮겨 간 칸에서 가장 낮은 값 */
function gradeMax(v){v=+v||0;const R=buRows();const k=buAt(R,v);if(k<0)return v;return Math.max(v,R[k].hi)}   /* 10-27: 지금 칸(- · 무 · +)의 맨 위 */
function buCondOk(t,p,txt){
 for(const m of txt.matchAll(/「([^」:]+?)\s*:\s*(EX|S|AAA|AA|A|B|C|D|E)([+-]?)」\s*(이상|이하)?일\s*때/g)){const sts=m[1].split(/[\/,·\s]+/).map(s=>BU_ST[s.trim()]).filter(x=>x!=null);if(!sts.length)continue;const need=buIdx(m[2]+m[3]);if(need<0)continue;
  for(const i of sts){const g=buIdx(grade(p.base[i]));if(m[4]==='이상'?g<need:m[4]==='이하'?g>need:g!==need)return false}}
 for(const m of txt.matchAll(/【(육성|지시|통솔|능력)\s*:\s*(EX|S|AAA|AA|A|B|C|D|E)[+-]?\s*(이상)?】/g)){const have=BU_L.indexOf(strip((t&&t.ranks||{})[m[1]]||''));if(have<BU_L.indexOf(m[2]))return false}
 return true}
const BU_C=new Map();
function baseUp(t,p){const src=[];const ab=p.ability&&idx.abil?idx.abil.get(p.ability):null;if(ab&&ab[2])src.push(['특성',p.ability,ab[2]]);
 (p.pots||[]).forEach((n,i)=>{if(n&&n!=='-'){const e=potEffOf(p,i);if(e)src.push(['포텐셜',String(n).replace(/『|』/g,''),e])}});
 for(const x of exclAll(p))if(x.eff)src.push(['전용',x.name,x.eff]);
 const key=JSON.stringify([p.base,src.map(s=>s[2]),t&&t.ranks,p.auto]);const hit=BU_C.get(key);if(hit)return hit;
 const n=[0,0,0,0,0,0],mx=[0,0,0,0,0,0],by=[[],[],[],[],[],[]],miss=[];
 for(const [kind,name,eff] of src){for(const cl of String(eff).replace(/<br\s*\/?>/g,'\n').split(/\n|(?=[①-⑳])/)){
  for(const m of cl.matchAll(/「([^」]+)」의\s*종족치(?:를|가|도)?\s*(\d+)\s*랭크\s*(상승|감소)/g)){if(!buCondOk(t,p,cl.slice(0,m.index)))continue;const d=(+m[2]||1)*(m[3]==='감소'?-1:1);
   for(const s of m[1].split(/[\/,·\s]+/)){const i=BU_ST[s.trim()];if(i==null)continue;n[i]+=d;by[i].push(`${kind} 『${name}』 ${d>0?'+':''}${d}랭크`)}}
  for(const m of cl.matchAll(/「([^」]+)」의\s*종족치\s*범위를\s*최대화/g)){if(!buCondOk(t,p,cl.slice(0,m.index)))continue;for(const s of m[1].split(/[\/,·\s]+/)){const i=BU_ST[s.trim()];if(i==null)continue;mx[i]=1;by[i].push(`${kind} 『${name}』 범위 최대`)}}
  /* 옛 「「+」 보정을 가한다」 = 범위 최대화 (10-27 룰북) */
  for(const m of cl.matchAll(/「([^」]+)」에\s*「\+」\s*보정/g)){if(!buCondOk(t,p,cl.slice(0,m.index)))continue;for(const s of m[1].split(/[\/,·\s]+/)){const i=BU_ST[s.trim()];if(i==null)continue;mx[i]=1;by[i].push(`${kind} 『${name}』 「+」 보정 = 범위 최대`)}}
  /* 「자신을 「방어 : C+」로 만든다」 = 1랭크 상승 — 한 등급 아래 같은 칸(D+)일 때만 */
  for(const m of cl.matchAll(/「([^」:]+?)\s*:\s*(EX|S|AAA|AA|A|B|C|D|E)([+-]?)」\s*(?:으?로|가)\s*(?:만든|된다)/g)){const pre=cl.slice(0,m.index);if(!/자신(?:을|의)?\s*$/.test(pre)||!buCondOk(t,p,pre))continue;const tg=m[2]+m[3],ti=BU_L.indexOf(m[2]);
   for(const s of m[1].split(/[\/,·\s]+/)){const i=BU_ST[s.trim()];if(i==null||p.base[i]===''||p.base[i]==null)continue;const g=grade(p.base[i]);if(g===tg)continue;
    const ok=BU_L.indexOf(strip(g))===ti-1&&buSub(g)===m[3];if(ok){n[i]+=1;by[i].push(`${kind} 『${name}』 ${tg} 만들기 (+1랭크)`)}
    else miss.push(`${kind} 『${name}』: 「${STATS[i]} : ${tg}」 만들기는 「${STATS[i]} : ${BU_L[ti-1]||'-'}${m[3]}」일 때만 (지금 ${g} ${p.base[i]}) — 반영 안 함`)}}}
  /* 그 칸의 자동화 구문: 종족치 방어,특방 +1 · 종족치 스피드 최대 (구문 생성기 「종족치 (시트)」) */
  for(const ln of String(autoDsl(p,name)).split(/\n|;/)){const m=ln.trim().match(/^종족치\s+(.+?)\s+(최대|[+\-]?\d+)\s*$/);if(!m)continue;const d=m[2]==='최대'?0:+m[2];
   for(const s of m[1].split(/[,\/·\s]+/)){const i=BU_ST[s.trim().toUpperCase()==='HP'?'HP':s.trim()];if(i==null)continue;if(m[2]==='최대'){mx[i]=1;by[i].push(`${kind} 『${name}』 구문 범위 최대`)}else if(d){n[i]+=d;by[i].push(`${kind} 『${name}』 구문 ${d>0?'+':''}${d}랭크`)}}}}
 const base=p.base.map((v,i)=>{if(v===''||v==null||isNaN(+v))return v;let x=gradeStep(+v,n[i]);if(mx[i])x=gradeMax(x);return x});
 const up=base.map((v,i)=>v!==p.base[i]&&+v!==+p.base[i]?{i,from:+p.base[i],to:+v,by:by[i]}:null).filter(Boolean);
 const r={base,up,miss};if(BU_C.size>400)BU_C.clear();BU_C.set(key,r);return r}
const effB=(t,p)=>baseUp(t,p).base;
const buTip=(t,p,i)=>{const u=baseUp(t,p).up.find(x=>x.i===i);return u?`${STATS[i]} ${u.from} (${grade(u.from)}) → ${u.to} (${grade(u.to)}) · ${u.by.join(' · ')}`:''};
function stat(t,p,i){const b=+effB(t,p)[i]||0,L=lv(t,p);const core=Math.floor((Math.floor(b*2)+(+(p.ivs||[])[i]||0))*(L/100));return i===0?core+10+L:core+5}   /* 10-23: 개체값(알까기)도 더한다 — 오레마스와 같은 식 */
/* 10-23 망령: 알까기 — 트레이너 육성 랭크만큼 1d32-1 ×6 후보를 굴려 하나 고른다 (오레마스 reroll_list 와 같은 표) */
const IVROLL={E:1,D:3,C:5,B:10,A:15,AA:20,AAA:25,S:30},IVBIG=130;
const ivCount=t=>+(IVROLL[strip((t.ranks||{})['육성'])]||5);const ivRoll=()=>STATS.map(()=>Math.floor(Math.random()*32));const ivSum=iv=>(iv||[]).reduce((a,b)=>a+(+b||0),0);
function ivHtml(t,ti,p,pi){const iv=p.ivs||[0,0,0,0,0,0];const has=!!p.ivs;const sum=ivSum(iv);const lg=p.ivLog;
 return `<div class="ivbox"><div class="ivhd"><b>개체값</b><span class="small muted">${has?`합 <b class="num ${sum>IVBIG?'warn':''}">${sum}</b>`:'아직 안 깠다 (0)'}${lg?` · ${esc(lg.d||'')} 알까기 ${+lg.n||0}회${lg.x?` + 추가 ${lg.x}`:''}${lg.r?` · 다시 굴림 ${lg.r}`:''}${lg.e?' · 손으로 고침':''}`:''}</span><span class="sp"></span><button class="btn sm pri" data-act="ivHatch" data-i="${ti}" data-j="${pi}">🥚 알까기 <span class="faint">(${ivCount(t)}회)</span></button>${has?`<button class="btn sm ghost" data-act="ivClear" data-i="${ti}" data-j="${pi}" title="개체값을 비운다 (0)">비우기</button>`:''}</div>
  <div class="ivrow6">${STATS.map((s,k)=>`<label><span>${s}</span><input type="number" min="0" max="31" inputmode="numeric" data-ivs="${ti}.${pi}.${k}" value="${has?iv[k]:''}" placeholder="0" class="${iv[k]<=1&&has?'lo':iv[k]>=30?'hi':''}"></label>`).join('')}</div>
  <div class="faint small">오레마스가 시트를 불러오면 이 값이 들어간다 (여기서 바꾸면 방에서 깐 값보다 우선)</div></div>`}
/* 10-24 망령: 굴린 후보는 포켓몬에 남긴다(P.ivRolls = {rolls, x, r}) — 알까기를 다시 열면 그 후보가 그대로 나와 다시 고를 수 있다.
   후보가 바뀌는 건 🎲(하나) · 「전부 다시 굴림」 · 「+ 추가 굴림」을 눌렀을 때뿐. 아직 후보가 없으면 처음 열 때 한 번 굴려서 바로 남긴다 */
const ivRollsOf=P=>{const R=P&&P.ivRolls;return R&&Array.isArray(R.rolls)?R.rolls.filter(r=>Array.isArray(r)&&r.length===6).map(r=>r.map(v=>Math.max(0,Math.min(31,Math.round(+v)||0)))):null};
async function openIvHatch(T,P){const lg=P.ivLog;const had=!!(P.ivs&&P.ivs.some(v=>+v>0));
 const count=ivCount(T);const saved=ivRollsOf(P);const used={x:+((P.ivRolls||{}).x)||0,r:+((P.ivRolls||{}).r)||0};
 let rolls=saved&&saved.length?saved:(had?[]:Array.from({length:count},ivRoll));
 const keep=()=>{P.ivRolls={rolls:rolls.map(r=>r.slice()),x:used.x,r:used.r};save()};
 if(!(saved&&saved.length)&&rolls.length)keep();   /* 처음 굴린 후보도 바로 남긴다 — 창을 닫았다 열어도 같은 후보 */
 const same=(a,b)=>a&&b&&a.length===b.length&&a.every((v,k)=>+v===+b[k]);let chosen=had?rolls.findIndex(r=>same(r,P.ivs)):-1;
 const cell=v=>`<b class="${v<=1?'lo':v>=30?'hi':''}">${v}</b>`;const tbl=iv=>`<div class="ivt">${STATS.map(k=>`<span>${k}</span>`).join('')}${iv.map(cell).join('')}</div>`;
 const l=openModal(`<div class="mhead"><h2>알까기 — ${esc(P.name||'포켓몬')}</h2><span class="small muted" data-ivc></span><span class="sp"></span><button class="btn ghost" data-x>닫기</button></div><div class="mbody">
  <div class="ivnow"><span class="small muted">지금</span>${P.ivs?tbl(P.ivs)+`<span class="small">합 <b>${ivSum(P.ivs)}</b></span>`:'<span class="small muted">없음</span>'}</div>
  <p class="small muted" style="margin:6px 0">굴린 후보는 남아 있어서 다시 열어도 그대로다 · 하나를 눌러 고르고 「적용」 · <b class="ivlg lo">0–1</b> 낮음 · <b class="ivlg hi">30–31</b> 높음 · 🎲 = 그 후보만 다시 굴림 · <b class="ivlg big">★ 합 ${IVBIG} 초과</b> 는 다시 굴리기 전에 한 번 더 묻는다</p>
  <div class="ivhad" data-ivhad><div><b>남아 있는 후보가 없다</b><div class="small muted">${lg&&lg.d?esc(lg.d)+' 에 깐 값이다 · ':''}후보를 남기기 전에 깐 포켓몬이라 지금 값만 있다. 새 후보가 필요하면 「🎲 굴리기」 — 적용을 누르기 전까지 지금 값은 그대로</div></div><button class="btn pri" data-ivroll>🎲 굴리기 (${count}회)</button></div>
  <div class="ivgrid" data-ivg></div></div><div class="mfoot" data-ivfoot><button class="btn ghost" data-ivall>전부 다시 굴림</button><button class="btn ghost" data-ivadd>+ 추가 굴림</button><span class="sp"></span><button class="btn pri" data-ivok>적용</button></div>`,{wide:true});
 const draw=()=>{const empty=!rolls.length;$('[data-ivfoot]',l).style.display=empty?'none':'';$('[data-ivhad]',l).style.display=empty?'':'none';$('[data-ivc]',l).textContent=`육성 ${(T.ranks||{})['육성']||'-'} → ${count}회${used.x?' + 추가 '+used.x+'회':''}`;
  $('[data-ivg]',l).innerHTML=rolls.map((r,i)=>{const s=ivSum(r);const cur=had&&same(r,P.ivs);return `<div class="ivc ${chosen===i?'on':''} ${s>IVBIG?'big':''}" data-ivpick="${i}"><div class="ivh"><span class="faint">#${i+1}</span>${cur?'<span class="ivcur">지금 값</span>':''}<span class="sp"></span><span class="ivsum ${s>IVBIG?'big':''}">${s>IVBIG?'★ ':''}합 ${s}</span><button class="btn sm ghost" data-ivre="${i}" title="이 후보만 다시 굴림">🎲</button></div>${tbl(r)}</div>`}).join('')};draw();
 l.addEventListener('click',async e=>{if(e.target.closest('[data-x]')){closeModal();return}
  const re=e.target.closest('[data-ivre]');if(re){const i=+re.dataset.ivre;const s=ivSum(rolls[i]);if(s>IVBIG&&!(await ask(`#${i+1} 은 합 ${s} — ${IVBIG} 넘는 후보입니다. 정말 다시 굴릴까요?`,'다시 굴림')))return;rolls[i]=ivRoll();used.r++;if(chosen===i)chosen=-1;keep();draw();return}
  if(e.target.closest('[data-ivroll]')){rolls=Array.from({length:count},ivRoll);used.r+=rolls.length;chosen=-1;keep();draw();return}
  const pk=e.target.closest('[data-ivpick]');if(pk){chosen=+pk.dataset.ivpick;draw();return}
  if(e.target.closest('[data-ivadd]')){rolls.push(ivRoll());used.x++;keep();draw();const g=$('[data-ivg]',l);g.lastElementChild&&g.lastElementChild.scrollIntoView({block:'nearest'});return}
  if(e.target.closest('[data-ivall]')){const big=rolls.filter(r=>ivSum(r)>IVBIG).length;if(!(await ask(`후보 ${rolls.length}개가 전부 새로 바뀝니다.${big?`<br>합 ${IVBIG} 넘는 후보 ${big}개도 같이 사라집니다.`:''}`,'전부 다시 굴림')))return;rolls=Array.from({length:count+used.x},ivRoll);used.r+=rolls.length;chosen=-1;keep();draw();return}
  if(e.target.closest('[data-ivok]')){if(chosen<0){toast('하나 골라 주세요');return}P.ivs=rolls[chosen].slice();const d=new Date();P.ivLog={d:`${d.getMonth()+1}/${d.getDate()}`,n:count,x:used.x,r:used.r};P.ivRolls={rolls:rolls.map(r=>r.slice()),x:used.x,r:used.r};closeModal();save();refreshTrainer(T);toast(`알까기 → ${P.ivs.join('/')} (합 ${ivSum(P.ivs)})`)}})}
const typeInfo=n=>S.db.types.find(x=>x[0]===String(n||'').replace(/\(.*/,''))||null;
function tchip(n){if(!n||n==='-')return '';const parts=String(n).match(/[^()]+/g)||[n];return parts.map(x=>{const ti=typeInfo(x);return `<span class="chip" style="background:${ti&&safeCss(ti[1])||'var(--sunk2)'};color:${ti&&safeCss(ti[2])||'var(--ink)'}">${esc(x)}</span>`}).join('')}
const NOSOCK=['도우미','감싸기','쉬프트업'];
/* 역할·분류 포텐셜: 슬롯 위치가 아니라 종류로 찾는다 (끌어서 순서를 바꿔도 그대로). 종류를 모르는 옛 데이터는 1·2번 슬롯을 본다 */
function potIdx(p,g,slot){for(let i=0;i<p.pots.length;i++)if(p.pots[i]&&potGroup(potKindOf(p,i))===g)return i;return p.pots[slot]&&!potKindOf(p,slot)?slot:-1}
const roleOf=p=>{const i=potIdx(p,'역할',0);return i<0?'':p.pots[i]};
const classOf=p=>{const i=potIdx(p,'분류',1);return i<0?'':p.pots[i]};
function moveSock(p,m){if(!m||!m.name)return 0;if((roleOf(p)==='커맨더'||roleOf(p)==='어시스트')&&NOSOCK.includes(m.name))return 0;const r=idx.moves.get(m.name);return (r&&r[0]!==''&&!isNaN(+r[0])?+r[0]:3)-(m.half?0.5:0)}
const OLDK=['올드 타입','리전 폼','다이맥스','메가진화','고대종','공명종','전설종'];
function moveCap(t,p){const k=classOf(p);const filled=p.moves.filter(m=>m.name);let used=filled.reduce((a,m)=>a+moveSock(p,m),0);
 let mode='socket',cap;
 if(OLDK.includes(k)){mode='count';cap=4;return {used:filled.length,cap:nz(p.sockMax)?+p.sockMax:cap,mode,auto:cap,pt:oldSock()}}
 if(['적응종','델타종'].includes(k))cap=7;
 else{const gs=S.db.sock.map(x=>x[0]);const g=s=>{const m=(grade(s)||'').match(/[A-Z]+/);const i=m?gs.indexOf(m[0]==='EX'&&!gs.includes('EX')?'S':m[0]):-1;return i<0?99:i};
  const i=Math.min(g(p.base[1]),g(p.base[3]));
  if(i===99)cap=null;else{const tot=p.base.reduce((a,b)=>a+(+b||0),0);cap=+S.db.sock[i][tot>=570?3:tot>=525?2:1]}}
 const bon=sockBonus(p).mv;if(cap!=null&&bon)cap=+(cap+bon).toFixed(2);const ov=nz(p.sockMax);return {used,cap:ov?+p.sockMax:cap,mode,auto:cap,ov,bon}}
/* 10-27 망령: 육성형 보너스 — 기술 하나의 소켓 상한 (경고만, 막지는 않는다).
   육성 A 이상: 할인 뒤 2.5까지 (소켓 3에 할인 체크 = 2.5 는 된다, 3 은 안 된다)
   육성 B: 할인 뒤 2.5 미만 (소켓 2.5 에 할인 체크하면 된다)
   C 이하: 할인과 상관없이 원래 소켓 2.5 미만. 『올드 타입』 계열(기술 4개 고정)은 예외 */
const BIGMV=2.5,BIGMV_RANK='A',BIGMV_HALF='B';
const brk=t=>BU_L.indexOf(strip(((t&&t.ranks)||{})['육성']));
const rawSock=(p,m)=>moveSock(p,Object.assign({},m,{half:false}));
const isBigMv=(t,p,m)=>{if(!(t&&m&&m.name)||OLDK.includes(classOf(p)))return false;const r=brk(t);
 if(r>=BU_L.indexOf(BIGMV_RANK))return moveSock(p,m)>BIGMV;
 if(r>=BU_L.indexOf(BIGMV_HALF))return moveSock(p,m)>=BIGMV;
 return rawSock(p,m)>=BIGMV};
const bigMvRule=t=>{const r=brk(t);return r>=BU_L.indexOf(BIGMV_RANK)?`육성 ${BIGMV_RANK}는 할인 뒤 소켓 ${BIGMV}까지`:r>=BU_L.indexOf(BIGMV_HALF)?`육성 ${BIGMV_HALF}는 소켓 ${BIGMV} 기술에 할인을 체크해야 함`:`소켓 ${BIGMV} 이상 기술은 육성 ${BIGMV_HALF}(할인) · ${BIGMV_RANK}부터`};
const bigMvs=(t,p)=>(p.moves||[]).filter(m=>isBigMv(t,p,m));
const bigMvTxt=(t,L)=>`기술 소켓 상한을 넘는 기술 · ${bigMvRule(t)} (지금 육성 ${(t.ranks||{})['육성']||'-'}) · ${L.map(m=>m.name).join(', ')}`;
const oldSock=()=>{const v=+(S.db.oldSock??5.5);return isNaN(v)?5.5:v};
const capTxt=(c,none='-',sep=' / ')=>c.mode==='count'?`${c.used}개(${c.pt})`:`${c.used}${sep}${c.cap??none}`;
function ptSockets(t){let u=0;for(const p of t.pokemon){const c=moveCap(t,p);u+=c.mode==='count'?c.pt:c.used}return Math.round(u*100)/100}
/* ---------- 프라이드 · 계산 종족치 (2026-10-25 종족치 분배 개편) ----------
   룰북 「포켓몬 제작」. 숫자는 전부 테이블·계산식 탭 「종족치 · 프라이드 규칙」에서 고친다 (공유 설정 meta/set.pride).
   커스텀: 계산 종족치 = 실제 합 + 하한분(공격·특공·스피드, 선공 하한) + 내구 할증 + HP 할증 + 화력·스피드 할증 − 쌍두 할인 + 특성 TO 조정
           → 그 값을 담을 수 있는 가장 낮은 계단이 프라이드.
   올드 타입: 실제 합을 버림해서 계단을 고른다(할증 없음). 480 미만은 0.5점(짓궂은마음 제외), 『프렌들리 몬스터』는 B 이하일 때 합 −10,
           올드 타입 DB 「프라이드」 칸이 있으면 그 값. */
const PRIDE_V=2;
const PRIDE_DEF={v:PRIDE_V,
 rows:[['C','1','480','40','1',''],['C+','1.5','503','43','1','최소종족치 임시'],['B','2','525','45','1',''],['B+','2.5','548','48','1','최소종족치 임시'],['A','3','570','50','1.5','특성 TO 덤 0.5 · 되팔 수 없음'],['EX','4','630','55','2','본가 전설종 또는 그에 준하는 스펙 · 직접 지정']],
 oldLow:{lab:'0.5',pt:'0.5',prank:'짓궂은마음'},oldCap:'600',
 friendly:{name:'프렌들리 몬스터',d:'10',max:'B'},
 toStep:'45',toDown:'25',toFloor:'1',realMin:'400',absMin:'31',opp:'0.4',weakAtk:'60',
 bulk:{lo:'85',hi:'105',k1:'0.5',k2:'0.75'},
 hp:{lo:'95',hi:'120',k1:'0.5',k2:'0.75'},
 fs:{lo:'105',hi:'120',k1:'0.5',k2:'1',slo:'90',shi:'140'},
 dual:{lo:'90',hi:'120',k:'1'},
 prio:{pow:'50',rows:[['상시','60','70','85'],['조건부','55','60','70']],abil:'짓궂은마음:60, 질풍날개:60'}};
const PR=()=>(S.db&&S.db.pride&&S.db.pride.v>=PRIDE_V)?S.db.pride:PRIDE_DEF;
/* 옛 프라이드 표(C/B/A/EX · 화력균형 · 최소종족치 1개)는 개편 규칙으로 바꾼다 */
function prideMigrate(db){const pr=db&&db.pride;if(!pr||!pr.v||pr.v<PRIDE_V){db.pride=clone(PRIDE_DEF);db.prideExV=1;return}
 const d=PRIDE_DEF;for(const k in d){if(pr[k]==null)pr[k]=clone(d[k]);else if(d[k]&&typeof d[k]==='object'&&!Array.isArray(d[k]))for(const j in d[k])if(pr[k][j]==null)pr[k][j]=clone(d[k][j])}}
const pnum=(x,d)=>{const v=parseFloat(x);return isNaN(v)?d:v};
const two=(x,o)=>pnum(o.k1,0.5)*Math.max(0,Math.min(x,pnum(o.hi,0))-pnum(o.lo,0))+pnum(o.k2,1)*Math.max(0,x-pnum(o.hi,0));
const prSteps=()=>PR().rows.filter(r=>r&&r[0]).map(r=>({lab:String(r[0]).trim(),pt:pnum(r[1],0),v:pnum(r[2],0),floor:pnum(r[3],40),to:pnum(r[4],1),note:r[5]||''})).sort((a,b)=>a.v-b.v);
const isEX=s=>/^EX$/i.test(s.lab);
function prRow(k){if(!k)return null;const L=PR().oldLow||{};if(String(k)===String(L.lab||'0.5'))return [String(L.lab||'0.5'),String(L.pt||'0.5'),'','','',''];return PR().rows.find(r=>r[0]===k)||null}
const prStep=k=>prSteps().find(s=>s.lab===k)||null;
const isOld=p=>OLDK.includes(classOf(p));
/* 10-27 망령: 「올드 타입 전용」 기술 — 기술 DB 줄의 21번째 칸(r[20]) 'O'. 칸이 없는 줄(원본 · 예전에 고친 줄 · 엑셀/토큰 가져오기)은
   원본 시트 「기술 목록(더블)」에서 이름이 붉은 글씨인 기술(아래 목록)을 따른다. 올드 타입 계열(isOld)이 아닌 포켓몬의 기술 목록에는 안 뜬다 */
const OLDONLY_DEF=new Set(["거대해머", "거수참", "거수탄", "더블펀처", "골드러시", "타키온커터", "액셀브레이크", "3연화살", "레이징불 (격투)", "배수의진", "섀도스틸", "분노의주먹", "성묘", "아스트랄비트", "레이징불 (노말)", "찍찍베기", "우유마시기", "작아지기", "회생의기도", "제살깎기", "껍질깨기", "꼬리자르기", "블러드문", "폭음파", "테라클러스터", "한판내기", "드래곤애로", "소울비트", "무한다이빔", "다이맥스포", "변덕레이저", "사우전드애로", "덩굴방망이 (물)", "레이징불 (물)", "아가미물기", "수류연타", "덩굴방망이 (바위)", "암석액스", "메테오빔", "반딧불", "V제너레이트", "덩굴방망이 (불꽃)", "레이징불 (불꽃)", "화염의수호", "깜짝헤드", "프리폴", "데스윙", "이차원러시", "도각참", "암흑강타", "비검천중파", "블로킹", "트집", "다크홀", "블리자드랜스", "포톤가이저 (물리)", "초승달의기도", "파워셰어", "가드셰어", "스피드스왑", "프리즘레이저", "포톤가이저 (특수)", "이차원홀", "루미나콜리전", "사이코웨이브", "실리콘번", "오라휠", "전격부리", "일렉트로빔", "라이트닝드라이브", "지오컨트롤", "덩굴방망이 (풀)", "트릭플라워", "정글힐", "버섯포자", "코튼가드", "힘흡수", "클로로블라스트", "휘적휘적포"]);
const MV_OLDONLY=20;
const mvOldOnly=r=>!!r&&(r[MV_OLDONLY]!=null?r[MV_OLDONLY]==='O':OLDONLY_DEF.has(r[2]));
const baseTot=p=>p.base.reduce((a,b)=>a+(+b||0),0);
const baseNums=p=>[0,1,2,3,4,5].map(i=>+p.base[i]||0);
const listOf=s=>String(s||'').split(/[,，\n]/).map(x=>x.trim()).filter(Boolean);
/* 특성 소켓. 「1.5/2.5」처럼 둘이면 비자속/자속 — 효과 글의 첫 타입 「X」가 포켓몬 타입에 있으면 뒤 값 (10-26 망령: 트랜지스터 · 용의턱) */
function abStabType(eff){const T=new Set((S.db.types||[]).map(x=>x[0]));for(const m of String(eff||'').matchAll(/「([^」]+)」/g))if(T.has(m[1]))return m[1];return ''}
function abSock(p){const ab=idx.abil&&idx.abil.get(p.ability);if(!ab)return null;const v=String(ab[0]??'').trim();
 const two=v.match(/^(\d+(?:\.\d+)?)\s*\/\s*(\d+(?:\.\d+)?)$/);if(two){const ty=abStabType(ab[2]);return +(ty&&[p.t1,p.t2,p.t3].includes(ty)?two[2]:two[1])}
 return v!==''&&!isNaN(+v)?+v:null}
const hasPotName=(p,re)=>(p.pots||[]).some(n=>n&&re.test(n));
/* 10-26 망령: 소켓 보너스 — 전용 · 포텐셜 · 특성 글에 「특성」「기술」 소켓에 「+0.5」 같은 문장이 있으면 자동으로 읽고, 칸에 직접 적으면 그 값이 우선. {ab, mv, src:[…]} */
function sockBonus(p){const out={ab:0,mv:0,src:[]};const texts=[];(p.pots||[]).forEach((n,i)=>{if(n)texts.push([n,String(potEffOf(p,i)||'')])});if(p.excl&&p.excl.eff)texts.push([p.excl.name||'전용',String(p.excl.eff)]);const abr=idx.abil&&idx.abil.get(p.ability);if(abr)texts.push([p.ability,String(abr[2]||'')]);
 for(const [nm,tx] of texts){for(const m of tx.matchAll(/「?(특성|기술)」?(?:\s*(?:과|와|·|,)\s*「?(특성|기술)」?)?\s*소켓」?(?:에|을|를)?\s*「?\s*([+＋])\s*(\d+(?:\.\d+)?)\s*」?/g)){const v=+m[4];const ks=[m[1],m[2]].filter(Boolean);if(ks.includes('특성'))out.ab+=v;if(ks.includes('기술'))out.mv+=v;out.src.push(`『${nm}』 ${ks.join('·')} +${v}`)}}
 if(nz(p.sockBonAb)){out.ab=+p.sockBonAb;out.manual=1}if(nz(p.sockBonMv)){out.mv=+p.sockBonMv;out.manual=1}return out}
/* 쌍두: 물리기·특수기를 각각 1개 이상 */
function dualMoves(p){const cats=new Set((p.moves||[]).filter(m=>m.name).map(m=>(idx.moves.get(m.name)||[])[6]));return cats.has('물리')&&cats.has('특수')}
function dualType(p){const D=PR().dual;const b=baseNums(p);return dualMoves(p)&&Math.min(b[1],b[3])>pnum(D.lo,90)}
/* 선공 하한: 선공기(우선도 +1 이상 · 자신/자기 진영 대상 제외) · 특성 · 포텐셜에서 가장 높은 스피드 하한 */
const PRIO_SELF=/^(자신|아군|자진|아군 전체|필드 전체|자기 필드|아군 필드|자신 · 아군)$/;
function prioInfo(p){const P=PR().prio||PRIDE_DEF.prio;const rows=P.rows||PRIDE_DEF.prio.rows;const powT=pnum(P.pow,50);let best={floor:0,src:'',kind:''};
 const take=(f,src,kind)=>{if(f>best.floor)best={floor:f,src,kind}};const cell=(cond,col)=>pnum((rows[cond?1:0]||[])[col],0);const KN=['','약','강','초'];
 for(const m of p.moves||[]){if(!m.name)continue;const r=idx.moves.get(m.name);if(!r)continue;const pr=String(r[11]??'');const ns=(pr.match(/-?\d+(\.\d+)?/g)||[]).map(Number);if(!ns.length)continue;const pv=Math.max(...ns);if(pv<1)continue;if(PRIO_SELF.test(String(r[9]||'').trim()))continue;
  const cond=/~/.test(pr)||/실패/.test(String(r[13]||''));const pow=+r[7]||0;const col=pv>=2&&pow>=powT?3:pow>=powT?2:1;take(cell(cond,col),m.name,(cond?'조건부':'상시')+'·'+KN[col])}
 for(const pair of listOf(P.abil)){const [n,v]=pair.split(/[:：=]/).map(x=>x&&x.trim());if(n&&p.ability===n)take(pnum(v,0),'특성 '+n,'특성')}
 (p.pots||[]).forEach((n,i)=>{if(!n)return;const eff=String(potEffOf(p,i)||'');if(!/우선도\s*[:：]?\s*\+\s*\d/.test(eff))return;const cond=/【\s*\d+\s*\/\s*시\s*】|【\s*1\/시\s*】/.test(eff);take(cell(cond,2),'『'+n+'』',(cond?'조건부':'상시')+'·강 (포텐셜)')});
 return best}
/* 커스텀 포켓몬 계산 종족치 — 계단마다 하한이 달라서 낮은 계단부터 맞춰 본다 */
function customCalc(p){const R=PR(),b=baseNums(p),real=b.reduce((a,c)=>a+c,0);const main=Math.max(b[1],b[3]);
 const bulk=two(Math.min(b[2],b[4]),R.bulk),hp=two(b[0],R.hp);
 const F=R.fs,fs=two(main,{lo:F.lo,hi:F.hi,k1:F.k1,k2:F.k2})*Math.max(0,Math.min(1,(Math.min(b[5],pnum(F.shi,140))-pnum(F.slo,90))/Math.max(1,pnum(F.shi,140)-pnum(F.slo,90))));
 const D=R.dual,dualOk=dualMoves(p),dualRaw=pnum(D.k,1)*Math.max(0,Math.min(Math.min(b[1],b[3]),pnum(D.hi,120))-pnum(D.lo,90)),dual=dualOk?dualRaw:0;
 const pri0=prioInfo(p),ov=String(p.prioOv??'').trim(),pri=ov===''?pri0:{floor:Math.max(0,pnum(ov,0)),src:pnum(ov,0)?'직접 지정':'직접 지정 · 없음',kind:'예외',auto:pri0,ov:true},opp=Math.round(main*pnum(R.opp,0.4)),s0=abSock(p),sb=sockBonus(p).ab,s=s0==null?null:Math.max(0,+(s0-sb).toFixed(2)),per=pnum(R.toStep,45)*2,perD=pnum(R.toDown,25)*2,toF=pnum(R.toFloor,1);
 const steps=prSteps().filter(x=>!isEX(x));let last=null;
 for(const st of steps){const fa=Math.max(0,Math.max(st.floor,b[1]<main?opp:0)-b[1]),fc=Math.max(0,Math.max(st.floor,b[3]<main?opp:0)-b[3]);const sf=Math.max(st.floor,pri.floor),fsp=Math.max(0,sf-b[5]);
  const to=s==null?st.to:s;const toAdj=per*Math.max(0,to-st.to)-perD*Math.max(0,toF-to);   /* 10-27 망령: 1보다 내릴 때(되팔기)는 0.5당 25 (올릴 때 45 와 따로) */
  const ct=real+fa+fc+fsp+bulk+hp+fs-dual+toAdj;last={real,b,fa,fc,fsp,sf,off:fa+fc+fsp,opp,bulk,hp,fs,dual,dualRaw,dualOk,pri,to,toRaw:s0,toBon:sb,toBase:st.to,toAdj,ct,step:st,ok:ct<=st.v+1e-9};if(last.ok)return last}
 return last||{real,b,ct:real,step:null,ok:false,off:0,bulk:0,hp:0,fs:0,dual:0,toAdj:0,pri,opp,fa:0,fc:0,fsp:0,sf:0}}
/* 올드 타입 */
function oldDbPride(p){const r=idx.old&&idx.old.get(p.name);const v=r?String(r[17]??'').trim():'';return v&&prRow(v)?v:''}
function oldCalc(p){const R=PR(),real=baseTot(p),steps=prSteps(),L=R.oldLow||PRIDE_DEF.oldLow,Fr=R.friendly||PRIDE_DEF.friendly;
 const db=oldDbPride(p);if(db)return {real,t:real,lab:db,src:'db'};
 const stepOf=t=>{let st=null;for(const s of steps)if(!isEX(s)&&t>=s.v)st=s;return st};
 const cap=pnum(R.oldCap,600);if(real>cap){const ex=steps.find(isEX);return {real,t:real,lab:ex?ex.lab:'EX',src:'cap'}}
 const st0=stepOf(real),maxS=prStep(String(Fr.max||'B'));const fName=String(Fr.name||'프렌들리 몬스터').replace(/[『』]/g,'');
 const fr=hasPotName(p,new RegExp(fName.replace(/\s+/g,'\\s*')))&&(!st0||!maxS||st0.v<=maxS.v);const t=real-(fr?pnum(Fr.d,10):0);
 const st=stepOf(t);const prank=listOf(L.prank).includes(p.ability);
 if(!st){const low=steps.find(s=>!isEX(s));return prank?{real,t,lab:low?low.lab:'C',src:'prank',friendly:fr}:{real,t,lab:String(L.lab||'0.5'),src:'low',friendly:fr}}
 return {real,t,lab:st.lab,src:'floor',friendly:fr}}
function prideAuto(p){if(!baseTot(p))return (prSteps()[0]||{lab:'C'}).lab;if(isOld(p))return oldCalc(p).lab;const c=customCalc(p);return c.step?c.step.lab:'C'}
/* 10-26 망령: C+ · B+ 를 고르면 strip 이 + 를 지워 C · B 로 떨어지던 것 — 계단 이름 그대로 먼저 찾고, 없을 때만 예전처럼 +/- 를 뗀다 */
const prKey=v=>{const s=String(v||'').trim();return prRow(s)?s:strip(s)};
function prideOf(p){const v=prKey(p.pride);return prRow(v)?v:prideAuto(p)}
const prideIsAuto=p=>!prRow(prKey(p.pride));
/* 화면용: 커스텀이면 계산 종족치 / 계단 기준 */
function planRange(p){if(isOld(p)||!baseTot(p))return null;const c=customCalc(p);const st=prStep(prideOf(p))||c.step;return st?{ct:c.ct,v:st.v,lab:st.lab,ok:c.ct<=st.v+1e-9}:null}
/* 룰북: 계단의 통솔점, 통솔 C 이상이면 파트너는 1점 할인 */
function prideCost(t,p){const r=prRow(prideOf(p));const c=r?pnum(r[1],0):0;return Math.max(0,c-((p.partner||soloN(t)===2)&&(RV[strip(t.ranks['통솔'])]??-9)>=0?1:0))}   /* 2체는 모두 파트너 · 3체는 파트너만 */
const fmtN=x=>String(Math.round(x*100)/100);
function pokeChecks(t,p){const out=[],R=PR(),pk=prideOf(p);const tot=baseTot(p);const w=(x,k)=>out.push({w:1,t:x,k}),i=(x,k)=>out.push({w:0,t:x,k});
 {const L=bigMvs(t,p);if(L.length)w(bigMvTxt(t,L),'mv')}
 if(!isOld(p)){const L=(p.moves||[]).filter(m=>m.name&&mvOldOnly(idx.moves.get(m.name)));if(L.length)w(`『올드 타입』 전용 기술입니다 (이 포켓몬은 올드 타입 계열이 아님) · ${L.map(m=>m.name).join(', ')}`,'mv')}
 if(!tot)return out;const b=baseNums(p);
 if(t)for(const x of baseUp(t,p).miss||[])w(x,'bu');   /* 10-27: 「X : R」로 만들기 조건이 안 맞음 */
 /* 10-26 망령: 『올드 타입』은 절대 하한도 따지지 않는다 (본가 종족치 그대로) */
 const low=isOld(p)?[]:b.map((v,k)=>[STATS[k],v]).filter(([,v])=>v<pnum(R.absMin,31));if(low.length)w(`절대 하한 ${pnum(R.absMin,31)} 미만: ${low.map(([n,v])=>n+' '+v).join(', ')}`);
 if(isOld(p)){const o=oldCalc(p);
  i(`올드 타입 · 실제 합 ${tot}${o.friendly?` − 『프렌들리 몬스터』 ${pnum((R.friendly||{}).d,10)} = ${o.t}`:''} → ${o.src==='db'?'DB 프라이드 칸':o.src==='cap'?'상한 초과':o.src==='low'?'최저 계단 미만':o.src==='prank'?'짓궂은마음이라 최저 계단':'버림'} ${o.lab}${prideIsAuto(p)?'':` · 직접 지정 ${pk}`} · 통솔점 ${prideCost(t,p)}`);
  if(!prideIsAuto(p)){const a=prStep(o.lab),m=prStep(pk);if(a&&m&&m.v<a.v)w(`직접 지정한 프라이드 ${pk}가 계산값 ${o.lab}보다 낮습니다`)}
  if(pk==='EX')i('프라이드 EX · 본가 전설종이나 그에 준하는 스펙 자리입니다');
  if(p.pots.some(n=>n&&/포켓\s*파워/.test(n)))w('『포켓 파워』 속별은 금지입니다');
  return out}
 const c=customCalc(p);const parts=[`실제 합 ${c.real}`];if(c.off)parts.push(`하한 +${fmtN(c.off)}`);if(c.bulk)parts.push(`내구 +${fmtN(c.bulk)}`);if(c.hp)parts.push(`HP +${fmtN(c.hp)}`);if(c.fs)parts.push(`화력·스피드 +${fmtN(c.fs)}`);if(c.dual)parts.push(`쌍두 −${fmtN(c.dual)}`);if(c.toAdj)parts.push(`특성 TO ${c.to} ${c.toAdj>0?'+':'−'}${fmtN(Math.abs(c.toAdj))}`);
 i(`계산 종족치 ${fmtN(c.ct)} (${parts.join(' · ')}) → 프라이드 ${c.step?c.step.lab:'-'}${c.ok?` (남는 점수 ${fmtN(c.step.v-c.ct)})`:''}${prideIsAuto(p)?'':` · 직접 지정 ${pk}`} · 통솔점 ${prideCost(t,p)}`,'calc');
 if(!c.ok&&c.step)w(`계산 종족치 ${fmtN(c.ct)}가 커스텀 상한 ${c.step.lab}(${c.step.v})를 ${fmtN(c.ct-c.step.v)} 넘습니다 · 능력치를 덜거나 특성 소켓을 낮춰 주세요`);
 if(!prideIsAuto(p)){const m=prStep(pk);if(m&&!isEX(m)&&m.v<c.ct-1e-9)w(`직접 지정한 프라이드 ${pk}(${m.v})는 계산 종족치 ${fmtN(c.ct)}를 담지 못합니다`)}
 if(c.real<pnum(R.realMin,400))w(`실제 종족치 합 ${c.real} · ${pnum(R.realMin,400)} 이상이어야 합니다`);
 const hint=[];if(c.fa)hint.push(`공격 ${b[1]} → ${b[1]+c.fa}`);if(c.fc)hint.push(`특공 ${b[3]} → ${b[3]+c.fc}`);if(c.fsp)hint.push(`스피드 ${b[5]} → ${c.sf}`);if(hint.length)i(`하한까지 계산: ${hint.join(', ')} (낮게 찍어도 돌려받는 점수는 없습니다)`,'calc');
 if(c.pri.floor)i(`선공 하한 ${c.pri.floor}: ${c.pri.src} (${c.pri.kind})`,'calc');
 if(c.dualRaw&&!c.dualOk)i(`물리기·특수기를 각각 1개 이상 들면 쌍두 할인 −${fmtN(c.dualRaw)}`,'calc');
 if(p.pots.some(n=>n&&/포켓\s*파워/.test(n)))w('『포켓 파워』 속별은 금지입니다');
 return out}
/* PT: 공격·특공이 둘 다 기준 미만인 커스텀 포켓몬은 1체까지 (올드 타입은 세지 않음) */
function ptChecks(t){const th=pnum(PR().weakAtk,60);const L=t.pokemon.filter(p=>!isOld(p)&&baseTot(p)&&(+p.base[1]||0)<th&&(+p.base[3]||0)<th);return L.length>1?[`공격·특공이 둘 다 ${th} 미만인 포켓몬이 ${L.length}체입니다 (${L.map(p=>p.name||'이름 없음').join(', ')}) · PT에 1체까지`]:[]}
/* 능력치 막대: 하한·할증·할인 구간 (0~200 눈금) */
/* 10-25 망령: 능력치 막대 표시 — 줄무늬 = 지금 계산에 더해지는(쌍두는 빠지는) 부분, 옅은 칸 = 그 구간이지만 지금은 영향 없음, 빨간 선 = 하한. 오른쪽 끝 작은 글씨 = 이 칸 때문에 붙는 값 */
function statMarks(p,i){if(isOld(p)||!baseTot(p))return '';const R=PR(),c=customCalc(p),b=c.b,main=Math.max(b[1],b[3]),v=b[i];const X=x=>Math.max(0,Math.min(100,x/2));
 const seg=(l,r,cls,tip)=>r>l?`<span class="zn ${cls}" style="left:${X(l)}%;width:${X(r)-X(l)}%" title="${esc(tip)}"></span>`:'';
 const zone=(lo,hi,cls,on,tip)=>{hi=Math.min(hi,200);if(hi<=lo)return '';const m=on?Math.max(lo,Math.min(v,hi)):lo;return seg(lo,m,cls+' on',tip)+seg(m,hi,cls,tip)};
 const line=(x,tip)=>`<span class="fl" style="left:${X(x)}%" title="${esc(tip)}"></span>`;const chips=[];let h='';
 if(i===0){const o=R.hp,lo=pnum(o.lo,95),hi=pnum(o.hi,120),on=v>lo;h+=zone(lo,hi,'z1 hp',on,`HP 할증 · ${lo}~${hi} 구간 ×${o.k1}`)+zone(hi,200,'z2 hp',v>hi,`HP 할증 · ${hi} 초과 ×${o.k2}`);if(c.hp)chips.push(['hp','+'+fmtN(c.hp)])}
 if(i===2||i===4){const o=R.bulk,lo=pnum(o.lo,85),hi=pnum(o.hi,105),low=Math.min(b[2],b[4]),isLow=v===low,j=i===2?4:2;
  const why=isLow?'':` · 지금은 ${STATS[j]}(${b[j]})가 낮은 쪽이라 이 칸은 영향 없음`;
  h+=zone(lo,hi,'z1 bulk',isLow&&v>lo,`내구 할증 · 방어·특방 중 낮은 쪽 ${lo}~${hi} ×${o.k1}${why}`)+zone(hi,200,'z2 bulk',isLow&&v>hi,`내구 할증 · 낮은 쪽 ${hi} 초과 ×${o.k2}${why}`);if(isLow&&c.bulk&&(i===2||b[2]!==b[4]))chips.push(['bulk','+'+fmtN(c.bulk)])}
 if(i===1||i===3){const isMain=v===main&&main>0;
  if(isMain){const F=R.fs,lo=pnum(F.lo,105),hi=pnum(F.hi,120),on=c.fs>0,why=on?'':` · 지금은 스피드 ${b[5]}(${pnum(F.slo,90)} 이하)라 0`;h+=zone(lo,hi,'z1 fs',on&&v>lo,`화력·스피드 할증 · 주력 공격 ${lo}~${hi} ×${F.k1} × 스피드 비율${why}`)+zone(hi,200,'z2 fs',on&&v>hi,`화력·스피드 할증 · 주력 공격 ${hi} 초과 ×${F.k2} × 스피드 비율${why}`);if(c.fs&&(i===1||b[1]!==b[3]))chips.push(['fs','+'+fmtN(c.fs)])}
  else{const D=R.dual,lo=pnum(D.lo,90),hi=pnum(D.hi,120);h+=zone(lo,hi,'dl',c.dualOk&&v>lo,`쌍두 할인 · 낮은 쪽 공격 ${lo}~${hi} ×${D.k} (빼 줌)${c.dualOk?'':' · 물리기·특수기를 각각 1개 이상 들어야 받음'}`);if(c.dual)chips.push(['dl','−'+fmtN(c.dual)])}
  const fl=c.step&&!isMain?Math.max(c.step.floor,c.opp):c.step?c.step.floor:0;if(fl&&!isMain)h+=line(fl,`하한 ${fl}${c.opp>=c.step.floor?` (주력 공격 ${main} × ${R.opp})`:''} · 이보다 낮게 찍어도 ${fl}로 계산`);
  const lack=i===1?c.fa:c.fc;if(lack)chips.push(['off','하한 +'+fmtN(lack)])}
 if(i===5){const F=R.fs,slo=pnum(F.slo,90),shi=pnum(F.shi,140);h+=zone(slo,shi,'sp',c.fs>0,`화력·스피드 할증의 스피드 비율 · ${slo}에서 0, ${shi}에서 1${c.fs>0?'':' · 지금은 주력 공격이 낮아 0'}`);
  if(c.sf)h+=line(c.sf,`하한 ${c.sf}${c.pri&&c.pri.floor>=((c.step||{}).floor||0)?` (선공: ${c.pri.src})`:''} · 이보다 낮게 찍어도 ${c.sf}로 계산`);if(c.fsp)chips.push(['off','하한 +'+fmtN(c.fsp)])}
 return h+(chips.length?`<em class="zt">${chips.map(([k,t])=>`<span class="${k}">${esc(t)}</span>`).join('')}</em>`:'')}

/* 10-25 망령: 능력치 칸에 커서를 올리면 그 칸에 걸린 규칙 · 선 · 지금 값을 보여 준다 */
function statTip(t,p,i){const nm=STATS[i];if(!baseTot(p))return nm;if(isOld(p))return `${nm} · 『올드 타입』은 종족치를 제약하지 않음 (하한 · 할증 · 할인 없음, 실제 합을 버림한 계단)`;
 const R=PR(),c=customCalc(p),b=c.b,v=b[i],main=Math.max(b[1],b[3]),F=c.step?c.step.floor:0,L=[`${nm} ${v}`],n=fmtN;
 const sur=(lo,hi,k1,k2)=>`${lo}~${hi} 구간 초과분 ×${k1}, ${hi} 초과분 ×${k2}`;
 if(i===0){const o=R.hp;L.push(`HP 할증: ${sur(pnum(o.lo,95),pnum(o.hi,120),o.k1,o.k2)} → 지금 +${n(c.hp)}`,`하한 없음 (절대 하한 ${pnum(R.absMin,31)})`)}
 if(i===2||i===4){const o=R.bulk,j=i===2?4:2,low=Math.min(b[2],b[4]);L.push(`내구 할증: 방어·특방 중 낮은 쪽 기준 ${sur(pnum(o.lo,85),pnum(o.hi,105),o.k1,o.k2)} → 지금 +${n(c.bulk)}`,v===low?`지금 이 칸이 낮은 쪽(${low})`:`지금은 ${STATS[j]}(${b[j]})가 낮은 쪽이라 이 칸 값은 할증에 안 쓰임`,`하한 없음 (절대 하한 ${pnum(R.absMin,31)})`)}
 if(i===1||i===3){if(v===main&&main>0){const o=R.fs,lo=pnum(o.lo,105),hi=pnum(o.hi,120),slo=pnum(o.slo,90),shi=pnum(o.shi,140),r=Math.max(0,Math.min(1,(Math.min(b[5],shi)-slo)/(shi-slo)));
   L.push(`주력 공격 · 하한 ${F} (계단 ${c.step?c.step.lab:'-'} 최소종족치)`,`화력·스피드 할증: 화력 점수(${lo}~${hi} ×${o.k1}, ${hi} 초과 ×${o.k2}) × 스피드 비율(${slo}에서 0, ${shi}에서 1)`,`→ 지금 화력 점수 ${n(pnum(o.k1,.5)*Math.max(0,Math.min(v,hi)-lo)+pnum(o.k2,1)*Math.max(0,v-hi))} × 스피드 ${b[5]} 비율 ${n(r)} = +${n(c.fs)}`)}
  else{const o=R.dual,fl=Math.max(F,c.opp);L.push(`하한 ${fl} (최소종족치 ${F}, 주력 공격 ${main} × ${R.opp} = ${c.opp} 중 높은 쪽) · 이보다 낮게 찍어도 하한 값으로 계산${(i===1?c.fa:c.fc)?` → 부족분 +${i===1?c.fa:c.fc}`:''}`,
   `쌍두 할인: 낮은 쪽 공격 ${pnum(o.lo,90)}~${pnum(o.hi,120)} 구간 초과분 ×${o.k} 빼 줌 (물리기·특수기 각 1개 이상) → ${c.dualOk?`지금 −${n(c.dual)}`:c.dualRaw?`조건 미충족 (받으면 −${n(c.dualRaw)})`:'지금 0'}`)}}
 if(i===5){const o=R.fs,slo=pnum(o.slo,90),shi=pnum(o.shi,140);L.push(`하한 ${c.sf} (${c.pri&&c.pri.floor>F?`선공 하한 · ${c.pri.src}${c.pri.ov?' · 예외':''} (${c.pri.kind||'직접'})`:`계단 최소종족치`}) · 이보다 낮게 찍어도 하한 값으로 계산${c.fsp?` → 부족분 +${c.fsp}`:''}`,
  `화력·스피드 할증의 스피드 비율: ${slo}에서 0, ${shi}에서 1 (${shi} 위로는 같음) → 지금 ${n(Math.max(0,Math.min(1,(Math.min(v,shi)-slo)/(shi-slo))))}`)}
 return L.join('\n')}
/* 통솔점 사용 / 보유 */
function leadUM(t){const n=(ptItems().find(r=>r[2]==='pride')||[])[0];if(!n)return null;return {n,u:Math.round(t.pokemon.reduce((a,p)=>a+prideCost(t,p),0)*100)/100,m:+t.base[n]||0}}
const prCls=lab=>({'0.5':'s05','C':'sc','C+':'scp','B':'sb','B+':'sbp','A':'sa','EX':'sex'})[lab]||'sc';
function leadBar(t){const L=leadUM(t);if(!L)return '';const ms=t.pokemon;const tot=Math.max(L.m,L.u)||1;
 return `<div class="ldrow"><span class="ldl">통솔점 <b class="num ${L.u>L.m?'warn':''}">${L.u}</b><span class="muted"> / ${L.m}</span></span><div class="ldbar ${L.u>L.m?'over':''}">${ms.map(p=>{const c=prideCost(t,p);if(!c)return '';const lab=prideOf(p);return `<i class="${prCls(lab)}" style="width:${c/tot*100}%" title="${esc((p.name||'(이름 없음)')+' · '+lab+' · 통솔점 '+c)}"><span><em class="nm">${esc(p.name||'?')} </em>${c}</span></i>`}).join('')}${L.m>L.u?`<i class="left" style="width:${(L.m-L.u)/tot*100}%" title="남은 통솔점 ${Math.round((L.m-L.u)*100)/100}"><span><em class="nm">남음 </em>${Math.round((L.m-L.u)*100)/100}</span></i>`:''}${L.m&&L.u>L.m?`<em class="cap" style="left:${L.m/tot*100}%"></em>`:''}</div></div>`}

/* 능력치 칸 아래 「계산 종족치」 현황판 — 항목별 값 · 막대 · 선공 하한 예외 입력 */
function calcPanel(t,p,P){if(!baseTot(p))return '';const R=PR();
 if(isOld(p)){const o=oldCalc(p);const st=prStep(o.lab);return `<div class="cpanel old"><div class="cph"><b>프라이드 계산</b><span class="kindb">올드 타입</span><span class="sp"></span><span class="cpr">${esc(prideOf(p))}</span><span class="small muted">통솔점 ${prideCost(t,p)}</span></div>
  <div class="cprow"><span class="cpc base">실제 합 <b>${o.real}</b></span>${o.friendly?`<span class="cpc dl">『프렌들리 몬스터』 <b>−${pnum((R.friendly||{}).d,10)}</b></span>`:''}<span class="cpop">→</span><span class="cpc tot">${o.src==='db'?'DB 프라이드 칸':o.src==='cap'?'상한 초과':o.src==='low'?'최저 계단 미만 · '+esc((R.oldLow||{}).pt||'0.5')+'점':o.src==='prank'?'짓궂은마음 · 최저 계단':'버림'} <b>${esc(o.lab)}</b>${st&&o.src==='floor'?` <small>(${st.v} · 격차 ${o.t-st.v})</small>`:''}</span></div>
  <p class="small muted" style="margin:6px 0 0">올드 타입은 하한·할증·할인을 계산하지 않습니다. 예외는 DB 관리 → 올드 타입 「프라이드」 칸으로 정합니다.</p></div>`}
 const c=customCalc(p);const st=prStep(prideOf(p))||c.step;const cap=st?st.v:c.ct;
 const items=[['base','실제 합',c.real,''],['off','하한',c.off,[c.fa?`공격 +${c.fa}`:'',c.fc?`특공 +${c.fc}`:'',c.fsp?`스피드 +${c.fsp}`:''].filter(Boolean).join(' · ')||'없음'],['bulk','내구',c.bulk,`방어·특방 중 낮은 쪽 ${Math.min(c.b[2],c.b[4])}`],['hp','HP',c.hp,`HP ${c.b[0]}`],['fs','화력·스피드',c.fs,`주력 ${Math.max(c.b[1],c.b[3])} · 스피드 ${c.b[5]}`],['dl','쌍두',-c.dual,c.dualOk?`낮은 쪽 ${Math.min(c.b[1],c.b[3])}`:c.dualRaw?`물리·특수기 각 1개 필요 (−${fmtN(c.dualRaw)})`:'해당 없음'],['to','특성 TO',c.toAdj,`TO ${c.to}${c.toBon?` (특성 ${c.toRaw} − 보너스 ${c.toBon})`:''} / 기본 ${c.toBase}`]];
 const pos=items.filter(x=>x[0]!=='dl'&&x[2]>0);const W=Math.max(cap,c.ct,1);
 const bar=pos.map(x=>`<i class="${x[0]}" style="width:${x[2]/W*100}%" title="${esc(x[1]+' '+fmtN(x[2]))}"></i>`).join('');
 const auto=c.pri.ov?c.pri.auto:c.pri;const ov=String(p.prioOv??'');
 return `<div class="cpanel"><div class="cph"><b>계산 종족치</b><span class="sp"></span><span class="cpr ${c.ok?'':'warn'}">${c.step?esc(c.step.lab):'-'}</span><span class="small muted">${c.ok?`남는 점수 <b class="num">${fmtN(c.step.v-c.ct)}</b>`:`<b class="warn">상한 초과 ${fmtN(c.ct-(c.step||{v:0}).v)}</b>`} · 통솔점 ${prideCost(t,p)}</span></div>
  <div class="cpbar" title="계산 종족치 ${fmtN(c.ct)} / ${cap}">${bar}<span class="cpcap" style="left:${Math.min(100,cap/W*100)}%"></span></div>
  <div class="cpgrid">${items.map(([k,l,v,d])=>`<div class="cpc ${k} ${v?'':'zero'}"><span>${l}</span><b class="num">${k==='base'?v:(v>0?'+':v<0?'−':'')+fmtN(Math.abs(v))}</b><small>${esc(d)}</small></div>`).join('')}<div class="cpc tot"><span>계산 종족치</span><b class="num">${fmtN(c.ct)}</b><small>${st?`${esc(st.lab)} 계단 ${st.v}`:''}</small></div></div>
  <div class="cppri"><span class="small"><b>선공 하한</b> ${auto.floor?`자동 ${auto.floor} · ${esc(auto.src)} (${esc(auto.kind)})`:'자동: 선공기 없음'}</span><label class="row small" style="gap:4px">예외<select data-p="${P}.prioOv" title="자동 판정이 맞지 않을 때 이 포켓몬만 직접 정합니다"><option value="" ${ov===''?'selected':''}>자동</option><option value="0" ${ov==='0'?'selected':''}>없음 (하한 안 올림)</option>${[...new Set([...(R.prio.rows||[]).flatMap(r=>r.slice(1)),ov].filter(x=>x!==''&&x!=='0'&&!isNaN(+x)).map(Number))].sort((a,b)=>a-b).map(v=>`<option value="${v}" ${ov===String(v)?'selected':''}>${v}</option>`).join('')}</select></label>${c.pri.ov?'<span class="kindb">예외 적용 중</span>':''}</div></div>`}
/* 테이블·계산식 탭 · 종족치 · 프라이드 규칙 (2026-10-25 개편) */
function prideRulePanel(){const R=PR();const f=(path,v,w,ph)=>`<input data-p="db.pride.${path}" value="${esc(v??'')}" style="width:${w||'56px'}" ${ph?`placeholder="${esc(ph)}"`:''} inputmode="decimal">`;
 const L=(t,path,v,w,note)=>`<label class="row small" style="gap:4px">${t}${f(path,v,w)}${note?`<span class="faint">${note}</span>`:''}</label>`;
 const grp=(t,o,key,extra)=>`<div class="prg"><b>${t}</b>${L('시작',key+'.lo',o.lo)}${L('경계',key+'.hi',o.hi)}${L('시작~경계 ×',key+'.k1',o.k1)}${L('경계 위 ×',key+'.k2',o.k2)}${extra||''}</div>`;
 return `<div class="panel" style="grid-column:1/-1"><h3>종족치 · 프라이드 규칙 · 룰북 「포켓몬 제작」<span class="sp"></span><button class="btn sm" data-tact="prRowAdd">+ 계단</button><button class="btn sm" data-tact="prReset">기본값</button></h3>
  <p class="small muted" style="margin:0 0 8px">포켓몬 프라이드를 「자동」으로 두면 커스텀은 <b>계산 종족치</b>(실제 합 + 하한분 + 내구·HP·화력·스피드 할증 − 쌍두 할인 + 특성 TO 조정)를 담을 수 있는 가장 낮은 계단, 올드 타입은 실제 합을 버림한 계단이 됩니다. 여기 숫자를 바꾸면 모든 시트의 계산 · 막대 표시 · 경고 · 통솔점 자동 소모가 바로 따라갑니다. EX 계단은 자동으로 고르지 않고 직접 지정할 때만 씁니다.</p>
  <div class="tw"><table><tr><th>계단</th><th class="n">통솔점</th><th class="n">종족치 합</th><th class="n">최소종족치 (하한)</th><th class="n">기본 특성 TO</th><th>비고</th><th></th></tr>${R.rows.map((r,i)=>`<tr>${[0,1,2,3,4,5].map(j=>`<td${j&&j<5?' class="n"':''}><input data-p="db.pride.rows.${i}.${j}" value="${esc(r[j]??'')}" style="width:${j===0?'52px':j===5?'100%':'64px'}" ${j&&j<5?'inputmode="decimal"':''}></td>`).join('')}<td><button class="btn sm ghost danger" data-tact="prRowDel" data-i="${i}" aria-label="계단 삭제">✕</button></td></tr>`).join('')}</table></div>
  <div class="prgrid">
   <div class="prg"><b>공통</b>${L('절대 하한','absMin',R.absMin)}${L('실제 합 하한','realMin',R.realMin)}${L('반대쪽 공격 하한 = 주력 ×','opp',R.opp)}${L('특성 TO 0.5 올릴 때','toStep',R.toStep,'','점')}${L('기준보다 0.5 내릴 때','toDown',R.toDown??PRIDE_DEF.toDown,'','점')}${L('되팔기 기준 TO','toFloor',R.toFloor)}${L('PT 1체 제한: 공·특공 둘 다 미만','weakAtk',R.weakAtk)}</div>
   ${grp('내구 할증 · 방어·특방 중 낮은 쪽',R.bulk,'bulk')}
   ${grp('HP 할증',R.hp,'hp')}
   ${grp('화력·스피드 할증 · 화력 점수',R.fs,'fs',`${L('스피드 비율 0','fs.slo',R.fs.slo)}${L('스피드 비율 1','fs.shi',R.fs.shi)}`)}
   <div class="prg"><b>쌍두 할인 · 공·특공 중 낮은 쪽</b>${L('시작','dual.lo',R.dual.lo)}${L('끝','dual.hi',R.dual.hi)}${L('×','dual.k',R.dual.k)}<span class="small faint">물리기·특수기 각 1개 이상</span></div>
   <div class="prg"><b>올드 타입</b>${L('최저 계단 미만 통솔점','oldLow.pt',R.oldLow.pt)}${L('그 표시','oldLow.lab',R.oldLow.lab)}${L('제외 특성 (쉼표)','oldLow.prank',R.oldLow.prank,'140px')}${L('A 상한 (넘으면 EX)','oldCap',R.oldCap)}${L('『프렌들리』 이름','friendly.name',R.friendly.name,'120px')}${L('합 −','friendly.d',R.friendly.d)}${L('적용 최대 계단','friendly.max',R.friendly.max)}</div>
  </div>
  <div class="prg" style="margin-top:10px"><b>선공 하한 · 선공기가 있으면 스피드 하한을 이 값으로</b>
   <div class="tw" style="margin:6px 0"><table><tr><th>사용 조건</th><th class="n">약 (위력 미만)</th><th class="n">강 (위력 이상 · +1)</th><th class="n">초 (위력 이상 · +2 이상)</th></tr>${(R.prio.rows||[]).map((r,i)=>`<tr><td><input data-p="db.pride.prio.rows.${i}.0" value="${esc(r[0])}" style="width:80px"></td>${[1,2,3].map(j=>`<td class="n"><input data-p="db.pride.prio.rows.${i}.${j}" value="${esc(r[j]??'')}" style="width:56px" inputmode="decimal"></td>`).join('')}</tr>`).join('')}</table></div>
   <div class="row" style="gap:14px;flex-wrap:wrap">${L('강·초 기준 위력','prio.pow',R.prio.pow)}<label class="row small" style="gap:4px;flex:1;min-width:260px">선공 특성 (이름:하한, 쉼표)<input data-p="db.pride.prio.abil" value="${esc(R.prio.abil||'')}" style="flex:1"></label></div>
   <p class="small muted" style="margin:6px 0 0">기술 DB의 우선도가 1 이상인 기술(자신·자기 진영 대상 제외)을 자동으로 읽습니다. 우선도에 「~」가 있거나 설명에 「실패」가 있으면 조건부로 봅니다. 포텐셜 효과에 「우선도 : +N」이 있으면 강 칸(【N/시】면 조건부). 맞지 않는 포켓몬은 시트의 「계산 종족치」 칸에서 예외로 바꿉니다.</p></div></div>`}
/* 메인: 자질을 C에서 한 단계 올릴 때마다 1점 */
const rankSteps=t=>QUAL.reduce((a,q)=>a+Math.max(0,RV[strip(t.ranks[q])]??0),0);
const discUsed=t=>t.pokemon.reduce((a,p)=>a+p.moves.filter(m=>m.name&&m.half).length,0);
function ptMaxDef(t){if(soloN(t)===3){const r=sockRow(t.ranks['육성']);return r?s3num((+r[4]||0)*(+(RULES().solo3||SOLO3_DEF).ratio||0.5),'ptUnit'):0}if(t.solo){const v=(S.db.soloSock||{})[strip(t.ranks['육성'])];if(v!=null&&v!=='')return +v}const r=sockRow(t.ranks['육성']);return r?+r[4]:0}
const nz=v=>v!==''&&v!=null&&!isNaN(+v);
function ptMax(t){if(nz(t.ptMax))return +t.ptMax;return ptMaxDef(t)}
/* 트레이너 포인트 항목: [이름, 기본값, 자동 소모 방식] — 테이블·계산식 탭에서 고친다 */
const PTI_DEF=[['메인','4','rank'],['통솔점','6','pride'],['「기술 할인점」','6','disc'],['【1/시】','3','once'],['분배레벨','10','dist']];
function ptiMigrate(db){if((db.ptiV||0)<1){for(const r of db.ptItems||[])if(r[0]==='【1/시】'&&!r[2])r[2]='once';db.ptiV=1}
 /* 10-25 망령: 통솔점은 기본적으로 포켓몬 프라이드에서 자동 계산 */
 if((db.ptiV||0)<2){db.ptItems=db.ptItems||clone(PTI_DEF);if(!db.ptItems.some(r=>r[2]==='pride')){const r=db.ptItems.find(r=>/통솔/.test(r[0]||''));if(r)r[2]='pride';else db.ptItems.splice(1,0,['통솔점','6','pride'])}db.ptiV=2}}
const PTI_AUTO={'':'없음',rank:'자질 투자 (C에서 한 단계당 1)',pride:'포켓몬 프라이드 (계단별 통솔점, 파트너 −1)',disc:'기술 「할인」 체크 수',dist:'포켓몬 분배 레벨 합',once:'포켓몬 【1/시】 포텐셜 수 (전용 제외)'};
const ptItems=()=>(S.db&&S.db.ptItems)||PTI_DEF;
function autoUse(t,a){if(a==='rank')return rankSteps(t);if(a==='pride')return t.pokemon.reduce((x,p)=>x+prideCost(t,p),0);if(a==='disc')return discUsed(t);if(a==='dist')return t.pokemon.reduce((x,p)=>x+Math.max(0,+p.dist||0),0);if(a==='once')return t.pokemon.reduce((x,p)=>x+onceCount(p),0);return 0}
const onceCount=p=>p.pots.reduce((n,name,i)=>n+(name&&/【1\s*\/\s*시】/.test(potEffOf(p,i)||'')?1:0),0);
function pointUse(t){const u={};for(const [n] of ptItems())u[n]=0;
 for(const n of t.pts){const r=idx.points.get(n);if(r){const k=r[3]==='-'||!(r[3] in u)?(ptItems()[0]||['메인'])[0]:r[3];u[k]=(u[k]||0)+(+r[6]||0)}}
 for(const k in t.extra)if(k in u)u[k]+=(+t.extra[k]||0);
 for(const [n,,a] of ptItems())u[n]+=autoUse(t,a);return u}
const RV={E:-2,D:-1,C:0,B:1,A:2,AA:3,AAA:4,S:5};
/* 룰 상수 (테이블·계산식 탭 「룰 상수」에서 고친다 · 공유 설정 meta/set.rules 와 백업에 들어간다)
   abil 행: [능력 랭크, 고유 칸 수, 고유 표시, 전용 개수, 전용 설명, 1인 전용 개수, 1인 전용 설명] — 룰북 「능력」 · 「1인 기준 (2체)」 */
const ABIL_DEF=[['D','1','1','0','0','0','0'],['C','1','1','2','2 (템플릿 전용만 · 상시 1)','1','1 (템플릿 전용만 · 상시 1)'],['B-','2','2 (상시1+단발1)','3','3 (커스텀 1 · 상시 1)','1','1 (커스텀 1 · 상시 1)'],['B','2','2','4','2 (템플릿만) 또는 4 (커스텀 2 · 상시 2)','2','a) 1 (템플릿만 · 상시 1) 또는 b) 2 (커스텀 1 · 상시 1)'],['A','2','2 (상시2)','6','6 (상시 3)','2','2 (상시 1)'],['AA','3','3 (상시2+단발1)','8','8 (상시 4)','3','3 (상시 2)'],['AAA','3','3 (상시2+단발1)','10','10 (1체에게 2개까지 부여 가능)','4','4 (1체에게 2개까지 부여 가능)']];
/* invest: 자질 투자 규칙 — 투자 횟수 · D 조정 · 금지 조합 */
const INVEST_DEF={allow:'3',allowD:'4',dMax:'1',dPair:'육성+통솔',dPairMax:'2',banPair:'육성+능력',banAA:'육성,통솔'};
/* soloOrd: 1인 기준(2체)에서 고르는 지시 수 — ORDER(4식) o 개 · COMMAND(6령) c 개 (10-26 망령) */
const SOLO_ORD_DEF={o:'1',c:'2'};
/* solo3: 1인 기준 (3체) — 6체 기준 자원 × ratio (10-27 망령: 「6체 메리트의 절반」). 템플릿 항목은 unit 단위로 round(올림 ceil · 반올림 round · 내림 floor),
   PT 기술점 · 소지품 소켓처럼 0.5 단위인 것은 ptUnit. keep='1' 이면 2체 값이 6체 값과 같은 항목(메인 등)은 그대로. 파트너 수 partner · 지시 고르기 o · c */
const SOLO3_DEF={ratio:'0.5',unit:'1',round:'ceil',ptUnit:'0.5',keep:'1',partner:'1',o:'2',c:'3'};
function soloN(t){const v=t&&t.solo;return v===3||v==='3'?3:v?2:0}
function s3num(x,unitKey){const R=RULES().solo3||SOLO3_DEF;const u=+R[unitKey||'unit']||+SOLO3_DEF[unitKey||'unit']||1;const f=R.round==='floor'?Math.floor:R.round==='round'?Math.round:Math.ceil;return Math.round(f(x/u-1e-9*(R.round==='ceil'?1:0))*u*1000)/1000}
function s3val(v6,v1,unitKey){const R=RULES().solo3||SOLO3_DEF;if(R.keep==='1'&&v1!=null&&v1!==''&&+v1===+v6)return +v6;return s3num((+v6||0)*(+R.ratio||0.5),unitKey)}
function rulesDef(){return {solo3:clone(SOLO3_DEF),soloOrd:clone(SOLO_ORD_DEF),invest:clone(INVEST_DEF),abil:clone(ABIL_DEF),ty:Object.entries(TY_CHART).map(([a,c])=>[a,c[0].join(','),c[1].join(','),c[2].join(',')])}}
function rulesNormalize(db){const d=rulesDef();if(!db.rules||typeof db.rules!=='object'||Array.isArray(db.rules))db.rules={};const R=db.rules;
 if(!R.soloOrd||typeof R.soloOrd!=='object')R.soloOrd={};for(const k in d.soloOrd)if(R.soloOrd[k]==null||R.soloOrd[k]==='')R.soloOrd[k]=d.soloOrd[k];
 if(!R.solo3||typeof R.solo3!=='object')R.solo3={};for(const k in d.solo3)if(R.solo3[k]==null||R.solo3[k]==='')R.solo3[k]=d.solo3[k];
 if(!R.invest||typeof R.invest!=='object')R.invest={};for(const k in d.invest)if(R.invest[k]==null)R.invest[k]=d.invest[k];
 if(!Array.isArray(R.abil)||!R.abil.length)R.abil=d.abil;for(const r of R.abil)while(r.length<7)r.push('');
 if(!Array.isArray(R.ty)||!R.ty.length)R.ty=d.ty;for(const r of R.ty)while(r.length<4)r.push('');return R}
const RULES=()=>{const R=S.db&&S.db.rules;return R&&R.invest&&Array.isArray(R.abil)&&Array.isArray(R.ty)?R:rulesNormalize(S.db)};
function abilRow(r){const L=RULES().abil;return L.find(x=>x[0]===r)||L.find(x=>x[0]===strip(r))||L.find(x=>x[0]==='C')||ABIL_DEF[1]}
const uniqNeed=r=>{const n=parseInt(abilRow(r)[1],10);return n>=0?n:1};
function abilLimits(r,solo){const a=abilRow(r);if(solo===3)return {u:a[2],x:s3num((+a[3]||0)*(+(RULES().solo3||SOLO3_DEF).ratio||0.5)),xs:'6체 기준 × '+(RULES().solo3||SOLO3_DEF).ratio+' · 1인 기준 (3체)'};if(solo)return {u:a[2],x:+a[5]||0,xs:a[6]+' · 1인 기준'};return abilLimitsBase(r)}
function abilLimitsBase(r){const a=abilRow(r);return {u:a[2],x:+a[3]||0,xs:a[4]}}
const ruleList=s=>String(s||'').split(/[+,，·\s]+/).map(x=>x.trim()).filter(Boolean);
function investCheck(t){const I=RULES().invest;const v=q=>RV[strip(t.ranks[q])]??0;const steps=QUAL.reduce((a,q)=>a+Math.max(0,v(q)),0);const ds=QUAL.filter(q=>v(q)<0).length;
 const allow=ds?(+I.allowD||0):(+I.allow||0);const dMax=+I.dMax||0;const msg=[];if(ds>dMax)msg.push(dMax?`「D」로 내릴 수 있는 자질은 ${dMax}개입니다`:'「D」로 내릴 수 있는 자질이 없습니다');if(steps>allow)msg.push(`투자 횟수 초과 (${steps}/${allow})`);
 const dp=ruleList(I.dPair).filter(q=>QUAL.includes(q));if(ds&&dp.length&&dp.reduce((a,q)=>a+Math.max(0,v(q)),0)>(+I.dPairMax||0))msg.push(`「D」 조정 시 ${dp.join('+')} 투자는 합쳐서 ${+I.dPairMax||0}회까지`);
 for(const pr of String(I.banPair||'').split(/[,，]/)){const qs=ruleList(pr).filter(q=>QUAL.includes(q));if(qs.length>1&&qs.every(q=>v(q)>=2))msg.push(`${qs.join('·')} 모두 「A」 이상은 금지 조합`)}
 for(const q of ruleList(I.banAA))if(QUAL.includes(q)&&v(q)>=3)msg.push(`「${q} : AA」는 사용 금지`);
 return {steps,allow,msg}}

/* ---------- 복사용 텍스트 (더블용 시트 AI118 규칙) ---------- */
const potRow=n=>idx.pots.get(n);
const kindCode=k=>String(k).replace(/^0|\..*/g,'').trim();
function potKindOf(p,i){const n=p.pots[i];if(p.potKind[i])return p.potKind[i];const r=potRow(n);return r?r[0]:''}
const AUTO_HELP=`대상: 자신(기본) · 아군전체 · 상대전체 · 자신이외 · 전체 · 아군1체 · 상대1체 · 자신이외무작위 · 상대무작위 · 전원무작위
랭크 [대상] 공격+1 방어-1 … [임시] [강제]        배율 [대상] 공격×1.33 …        초기화 랭크|배율|전부
위력 ×1.3 [대상] [타입:불꽃,물] [물리|특수] [굉장|별로|보통] [단일|전체기] [자속|비자속] [태그:소리,접촉] [위력≥150] [위력≤60] [역할:에이스] [수세|공세] [확정급소|급소없음] [N회] [이번턴] [N턴]
완화 ×0.75 … (받는 쪽, 위력과 같은 조건) · 「견딤」을 붙이면 그 기술로 「빈사」가 되지 않는다 (예: 완화 ×1 1회 견딤)
중첩: 효과 글에 【중첩 (3회)】 가 있으면 같은 포텐셜이 다시 걸릴 때 위력 · 완화 배율(×1.5 → ×2.25 → ×3.375)과 우선도(+1 → +2 → +3)가 그 횟수까지 쌓인다. 없으면 다시 걸 때 덮어쓴다
상태 화상 [대상] [N턴] [강제] · 상태확률 화상 50% [대상] [1체] · 치유 [대상] [독,맹독|이상] [N%] · 상태초기화 [대상]
회복 1/4 [대상] [전부] · 피해 1/8 [대상] [현재|직전|타입:바위] [제외:독] [빈사없음]
날씨 비 5 · 날씨 해제 · 필드 그래스필드 5 · 룸 트릭룸 5 · 필드상태 중력 5 · 설치기 [아군|상대] 리플렉터 5
타입 [대상] 추가|변경|원래 불꽃,비행 · 특성 [대상] 변경 X · 역할 추가 에이스 · 추격 · 하늘위 [N턴]
비례무시 [빈사|설치기|설치기피해|반동] · 우선도 +1 [타입:X] [물리|특수|변화] [이번턴] · 면역 잠듦,마비 · 감소무시 [공격] · 강화무시 [공격시|받음] [방어|회피]
확인 "조건 문장" · 조건 아군빈사 · 조건 HP≤1/2
선택:  →  - ① 라벨 → 랭크 공격+1  /  - ② 라벨 → 회복 1/4
효과 글의 표식: 【등장】 등장 때 자동 · 【상시】 처음 한 번 자동 · 【N/시】 횟수 · 드물게/저확률/중확률/고확률 확률 판정`;
function autoDsl(p,name){return ((p&&p.auto)||{})[String(name||'').replace(/『|』/g,'')]||''}
function autoBadge(p,name){const K=window.OM_FX;if(!K||!name)return '';const own=autoDsl(p,name);if(own)return ' <span class="kindb" title="자동화 구문 있음">⚙ 구문</span>';const r=K.rm(name);return r&&r.ops&&r.ops.length&&!r.manual?' <span class="kindb" title="레디메이드 자동">⚙ 자동</span>':''}
function potEffOf(p,i){if(p.potEff[i]!==''&&p.potEff[i]!=null)return p.potEff[i];const r=potRow(p.pots[i]);return r?r[2]:''}
const nlBr=s=>String(s??'').replace(/\r?\n|\\n/g,'<br>');
function moveLine(name,r){const g=i=>nlBr(r[i]??'');const en=(typeInfo(g(5))||[])[3]||'Normal';
 return [name,g(5),g(6),g(7),g(8),g(9),g(10),g(11),g(12),g(13),g(14),g(15),g(16),g(17),en,g(18)||1,g(19)||1].join(';')+';'}
/* 전용 포텐셜: 기본 칸(excl) + 추가 칸(exclX). 채워진 것만 */
const exclAll=p=>[p.excl,...(p.exclX||[])].filter(x=>x&&x.name&&x.name!=='전용 포텐셜');
function copyText(t,p){
 const basic=[p.name,lv(t,p),p.t1,p.t2,p.t3,p.tera,p.ability,...p.base,...(p.ev||Array(6).fill('')),prideOf(p),p.egg1,p.egg2].map(x=>x??'').join(';')+'#';
 const fill=p.pots.map((n,i)=>i).filter(i=>p.pots[i]&&p.pots[i]!=='-');
 const xs=(p.exclX||[]).filter(x=>x&&x.name).slice(0,Math.max(0,20-fill.length));
 const names=(fill.map(i=>p.pots[i]+';').join('')+xs.map(x=>x.name+';').join('')).replace(/『|』/g,'');
 const effs=fill.map(i=>nlBr(potEffOf(p,i))+';').join('')+xs.map(x=>nlBr(x.eff||'-')+';').join('');
 const ord=Array.from({length:20},(_,j)=>{const i=fill[j];if(i==null)return '999;';const k=potKindOf(p,i);return (k?kindCode(k)||'999':'999')+';'}).join('');
 const xn=p.excl.name&&p.excl.name!=='전용 포텐셜'?p.excl.name:'-';
 const ex=xn+'#'+(xn==='-'?'-':nlBr(p.excl.eff||'-'))+'#';
 const mvs=[];
 for(const m of p.moves.filter(m=>m.name)){const r=idx.moves.get(m.name)||[];const g=i=>r[i]??'';
  mvs.push(moveLine(m.name,r))}
 const mv=mvs.join('\\');
 return (nlBr(basic)+names+'#'+effs+'#'+ord+'#'+ex+mv+'#').trim()}
const cleanF=s=>String(s??'').replace(/^[\s\\"'​﻿]+|[\s\\"'​﻿]+$/g,'');
const brN=s=>String(s??'').replace(/<br\s*\/?>/gi,'\n');
const oneLn=s=>brN(s).replace(/<[^>]*>/g,'').replace(/\s*\n+\s*/g,' ').trim();
function isCopyText(s){s=String(s||'').trim();return s.split('#').length>=7&&/^[^#;]+;\s*-?\d+\s*;/.test(cleanF(s))}
function parseCopy(txt,t){
 txt=String(txt).trim().replace(/^"+|"+$/g,'').replace(/""/g,'"');
 const seg=txt.split('#');const p=newPoke();const added={moves:0};
 const b=seg[0].split(';').map(cleanF);
 p.name=b[0]||'';const L=+b[1]||0;p.t1=b[2]||'-';p.t2=b[3]||'-';p.t3=b[4]||'-';p.tera=b[5]||'-';p.ability=b[6]||'';
 p.base=Array.from({length:6},(_,i)=>b[7+i]??'');p.ev=Array.from({length:6},(_,i)=>b[13+i]??'');p.pride=b[19]||'';p.egg1=b[20]||'-';p.egg2=b[21]||'-';
 p.dist=t?L-baseLevel(t.ranks['육성']):0;
 const names=(seg[1]||'').split(';').map(cleanF).filter(x=>x!==''&&x!=='-');
 const effs=(seg[2]||'').split(';').map(x=>brN(cleanF(x)));
 const ords=(seg[3]||'').split(';').map(cleanF);
 const kinds=[...new Set(S.db.pots.map(r=>r[0]))];
 names.slice(0,20).forEach((n,i)=>{p.pots[i]=n;const r=potRow(n);const e=effs[i]??'';
  p.potEff[i]=r&&brN(r[2]).replace(/\\n/g,'\n').trim()===e.trim()?'':e;
  const o=ords[i];if(o&&o!=='999'&&(!r||kindCode(r[0])!==o)){p.potKind[i]=kinds.find(k=>kindCode(k)===o)||o}});
 const xn=cleanF(seg[4]);if(xn&&xn!=='-'){p.excl.name=xn;p.excl.eff=brN(cleanF(seg[5]))}
 const mvRaw=seg.slice(6).join('#');let blocks=[];
 if(mvRaw.includes('\\'))blocks=mvRaw.split('\\').map(b=>b.split(';'));
 else{const a=mvRaw.split(';');for(let i=0;i+16<a.length;i+=17)blocks.push(a.slice(i,i+17))}
 p.moves=[];
 for(const blk of blocks){const f=blk.slice(0,17).map((x,j)=>j===9?brN(cleanF(x)):cleanF(x));while(f.length<17)f.push('');if(!f[0])continue;
  if(!idx.moves.has(f[0])){S.db.moves.push([String(3),'#오리지널, #가져옴',f[0],'','',f[1],f[2],f[3],f[4],f[5],f[6],f[7],f[8],f[9],f[10],f[11],f[12],f[13],f[15],f[16]]);S.custom.moves.push(f[0]);idx.moves.set(f[0],S.db.moves[S.db.moves.length-1]);added.moves++}
  p.moves.push({name:f[0],half:false})}
 if(added.moves)save(true);
 return p}

/* ---------- 세션 노트 연동: 트레이너·파티를 계산된 값과 함께 묶어 복사 ---------- */
function sessionPoke(t,p,types){
 const useT=n=>{if(!n||n==='-')return;String(n).split(/[()]/).filter(Boolean).forEach(x=>{const ti=typeInfo(x);if(ti)types[ti[0]]=[ti[1],ti[2]]})};
 const tys=[p.t1,p.t2,p.t3].filter(x=>x&&x!=='-');tys.forEach(useT);useT(p.tera);
 const fill=p.pots.map((n,i)=>i).filter(i=>p.pots[i]&&p.pots[i]!=='-');
 const ab=idx.abil&&idx.abil.get(p.ability),it=itemRow(p);
 const hasBase=p.base.some(v=>v!==''&&v!=null);
 const moves=p.moves.filter(m=>m.name).map(m=>{const r=idx.moves.get(m.name)||[];const g=i=>r[i]??'';useT(g(5));
  return {name:m.name,type:g(5),cat:g(6),pow:String(g(7)),acc:String(g(8)),range:g(9),contact:g(10),prio:String(g(11)),eff:brN(g(13)),sock:String(g(0))}});
 return {id:p.id,name:p.name||'',gender:p.gender||'-',lv:lv(t,p),types:tys,tera:p.tera||'-',ability:p.ability||'',abilEff:ab?brN(ab[2]):'',item:p.item||'',itemEff:it?brN(it[4]):'',items2:(p.items2||[]).filter(x=>x.item).map(x=>{const r=itemRow(x);return {item:x.item,itemEff:r?brN(r[4]):''}}),
  pride:prideOf(p),partner:!!p.partner,base:p.base.map(v=>v===''||v==null?'':+v),stats:hasBase?[0,1,2,3,4,5].map(i=>stat(t,p,i)):[],role:roleOf(p)||'',
  pots:fill.map(i=>({name:String(p.pots[i]).replace(/『|』/g,''),kind:potKindOf(p,i)||'',eff:brN(potEffOf(p,i))})),
   excl:p.excl&&p.excl.name&&p.excl.name!=='전용 포텐셜'?{name:p.excl.name,eff:brN(p.excl.eff||'')}:null,
   exclX:(p.exclX||[]).filter(x=>x&&x.name).map(x=>({name:x.name,eff:brN(x.eff||'')})),
  moves,memo:p.memo||'',image:safeImg(p.image)&&p.image.length<60000?p.image:'',stands:standsFix(p.stands),standActive:+p.standActive||0,copy:copyText(t,p)}}
function sessionBundle(ts){const types={};
 const trainers=ts.map(t=>({id:t.id,name:t.name||'트레이너',kind:t.kind==='npc'?'npc':'pc',image:safeImg(t.image)&&t.image.length<90000?t.image:'',ranks:Object.assign({},t.ranks),
  unique:(t.unique||[]).filter(u=>u&&u.name).map(u=>({name:u.name,eff:brN(u.eff||'')})),pokemon:t.pokemon.map(p=>sessionPoke(t,p,types))}));
 return {kind:'mkm-session',v:1,at:Date.now(),from:'망켓몬 제작기',types,trainers}}
async function copySession(ts){if(!ts.length)return toast('트레이너가 없습니다');const s=JSON.stringify(sessionBundle(ts));
 const msg=ts.length===1?`「${ts[0].name}」를 세션 노트용으로 복사했습니다`:`트레이너 ${ts.length}명을 세션 노트용으로 복사했습니다`;
 try{await navigator.clipboard.writeText(s);toast(msg)}catch(e){copyStr(s)}}

/* ---------- 자동화 구문 (js/fx/ 의 fx.js · fx_ui.js · 레디메이드 사전 · 상태 DB — 이 저장소가 원본이고 오레마스 웹툴이 여기서 불러간다) ----------
   포켓몬마다 p.auto[이름] = 구문(DSL 문자열). 오레마스가 시트를 가져갈 때 그대로 읽는다. 같은 이름의 레디메이드가 있으면 구문을 비워 둬도 자동으로 돈다. */
const FX_SRC=(window.MKM_CONFIG&&MKM_CONFIG.fxBase)||'js/fx/';
const FXK=n=>String(n||'').replace(/『|』/g,'').trim();
const fxReady=()=>!!(window.OM_FX&&window.OM_FX_UI);
/* fx_ui 창의 「닫기」(data-x)는 오레마스 창이 알아서 닫지만 제작기 창은 직접 이어 줘야 한다 */
window.OM_APP=window.OM_APP||{openModal:h=>{const l=openModal(h,{wide:true});l.addEventListener('click',e=>{if(e.target.closest('[data-x]'))closeModal()});return l},closeModal:()=>closeModal(),toast:t=>toast(t),ST:{role:'player',state:{}},set:async()=>false};
let fxLoadP=null,FXST='';/* '' 불러오는 중 · ok · fail */
function loadFx(){if(fxReady())return Promise.resolve(true);if(fxLoadP)return fxLoadP;
 const one=src=>new Promise((res,rej)=>{const s=document.createElement('script');s.src=FX_SRC+src+'?v=202611030700';s.onload=()=>res();s.onerror=()=>rej(new Error(src));document.head.appendChild(s)});
 FXST='';fxLoadP=(async()=>{try{await one('states.js');await one('readymade.js');await one('fx.js');await one('fx_ui.js');await one('itemrule.js');FXST='ok';rmInit();stInit();if(S.ui&&S.ui.tab)refreshAll();return true}catch(e){console.warn('[구문] 자동화 스크립트를 불러오지 못함',e);FXST='fail';toast('자동화 구문 스크립트를 불러오지 못했습니다 · 「구문 ⟳」을 눌러 다시 시도');if(S.ui&&S.ui.tab)refreshAll();return false}})();return fxLoadP}
function fxRetry(){if(fxReady())return;fxLoadP=null;toast('구문 스크립트를 다시 불러옵니다…');loadFx();if(S.ui&&S.ui.tab)refreshAll()}
document.addEventListener('click',e=>{const b=e.target.closest&&e.target.closest('[data-fxretry]');if(!b)return;e.preventDefault();e.stopPropagation();fxRetry()},true);
const fxRetryBtn=()=>FXST==='fail'?'<button type="button" class="btn sm ghost" data-fxretry title="자동화 구문 스크립트를 불러오지 못했습니다 — 눌러서 다시 시도">구문 ⟳</button>':'';
/* 오리지널 소지품: DB 에 넣지 않고 그 포켓몬 시트(p.itemOwn)에만 둔다 (10-24 망령). DB 행과 같은 꼴로 돌려준다 */
function ownItem(p){const o=p&&p.itemOwn;return o&&typeof o==='object'&&o.name&&o.name===p.item?o:null}
function itemRow(p){if(!p||!p.item)return null;const r=idx.items&&idx.items.get(p.item);if(r)return r;const o=ownItem(p);return o?[o.kind||'오리지널',o.name,'',o.cons?'O':'-',o.eff||'',o.sock||'-','이 포켓몬만 (DB 에 없음)',o.auto||'']:null}
/* 소지품 칸 (10-24 망령): 기본 1칸(p.item) + 조건에 따라 2 · 3번 칸(p.items2 = [{item, itemOwn}]) */
function itemSlotsHtml(p,ti,pi){const X=p.items2||[];const A=(act,k)=>`data-act="${act}" data-i="${ti}" data-j="${pi}" data-k="${k}"`;
 return `${X.map((x,k)=>{const r=itemRow(x),ow=ownItem(x)&&!idx.items.get(x.item);return `<div class="islot"><span class="islk">소지품 ${k+2}</span><button class="pickbtn" ${A('pickItemX',k)}>${x.item?`<b>${esc(x.item)}</b>${ilockChip(x.item)}<span class="sp"></span><span class="faint small">${ow?'오리지널 · 시트에만':r?'소켓 '+esc(r[5]):'DB에 없음'}</span>`:'<span class="ph0">소지품 검색…</span>'}</button><button type="button" class="btn sm ghost danger" ${A('delItemX',k)} aria-label="소지품 ${k+2}번 칸 지우기" title="이 칸 지우기">×</button></div>
  ${r?`<div class="effbox"><b>${esc(x.item)}</b> ${rich(r[4])} ${ow?`<span class="faint">· 오리지널 (이 포켓몬만 · DB 에 없음)${r[3]==='O'?' · 소모품':''}</span> <button class="btn sm" ${A('ownItemX',k)}>수정</button>`:r[6]&&r[6]!=='-'?`<span class="faint">· ${esc(r[6])}</span>`:''}<span class="fxrow">${fxAutoBtn(p,'item',x.item,ti,pi)}</span></div>`:x.item?`<div class="effbox"><b>${esc(x.item)}</b> DB에 없는 소지품입니다. <button class="btn sm" ${A('ownItemX',k)}>이 포켓몬만 쓰는 오리지널로 효과 적기</button></div>`:''}`}).join('')}
 <div class="row islot-add"><button type="button" class="btn sm" data-act="addItemX" data-i="${ti}" data-j="${pi}" ${X.length>=2?'disabled':''}>＋ 소지품 칸</button><span class="small faint">기본 1칸 · 조건에 따라 최대 3칸 (${1+X.length}/3)</span></div>`}
function fxEffOf(p,kind,name,slot){if(kind==='trait'){const r=idx.abil.get(name);return r?r[2]:''}if(kind==='item'){const x=name===p.item?p:(p.items2||[]).find(q=>q.item===name);const r=x?itemRow(x):idx.items.get(name);return r?r[4]:''}
 if(slot==='excl')return p.excl.eff||'';if(typeof slot==='string'&&slot[0]==='x'){const x=(p.exclX||[])[+slot.slice(1)];return x?x.eff:''}if(typeof slot==='number')return potEffOf(p,slot);if(typeof slot==='string'&&slot[0]==='f'){const [fk,xi]=slot.slice(1).split('.').map(Number);const x=((p.forms||[])[fk]||{}).pots;const it=x&&x[xi];if(it){if(it.eff)return it.eff;const r=potRow(it.name);return r?r[2]:''}return ''}const i=p.pots.indexOf(name);return i>=0?potEffOf(p,i):''}
function fxRm(kind,name){if(!fxReady()||!name)return null;try{return OM_FX.autoOf({auto:{}},kind,name)}catch(e){return null}}
function fxAutoBtn(p,kind,name,ti,pi,slot){if(!name)return '';if(!fxReady())return fxRetryBtn();const K=OM_FX;const own=String((p.auto||{})[FXK(name)]||'').trim();const base=fxRm(kind,name);
 const has=!!own;const rmHas=!!(base&&base.ops&&base.ops.length&&!base.manual);let ttl='';try{ttl=has?K.unparse(K.parse(own).ops).join(' / '):rmHas?'레디메이드 자동: '+K.unparse(base.ops).join(' / '):base&&base.manual?'레디메이드는 있지만 자동화 미지원 (손으로)':'자동화 없음 — 구문을 써 넣을 수 있다'}catch(e){}
 return `<button type="button" class="btn sm fxb ${has?'pri':rmHas?'':'ghost'}" data-act="fx" data-i="${ti}" data-j="${pi}" data-kind="${kind}" data-name="${esc(name)}" data-slot="${slot==null?'':esc(String(slot))}" title="${esc(ttl)}">${has?'구문 ✓':rmHas?'자동':'구문'}</button>`}
function fxRmChip(kind,name){const base=fxRm(kind,name);if(!base||!base.ops||!base.ops.length)return '';let ttl='';try{ttl=OM_FX.unparse(base.ops).join(' / ')}catch(e){}return `<span class="kindb fx-rm" title="${esc('레디메이드 자동화: '+ttl)}">${base.manual?'자동화 (손으로)':'자동화'}</span>`}
function fxOpen(t,p,kind,name,slot){if(!fxReady())return toast('구문 편집기를 아직 불러오는 중입니다');const K=OM_FX;const mon={auto:{}};for(const k in (p.auto||{})){const v=String(p.auto[k]||'').trim();if(v)mon.auto[k]={dsl:v,ops:K.parse(v).ops}}
 OM_FX_UI.openEditor({mon,kind,name,text:fxEffOf(p,kind,name,slot),save:auto=>{p.auto=p.auto||{};const key=FXK(name);if(auto&&auto.dsl)p.auto[key]=auto.dsl;else delete p.auto[key];save();refreshTrainer(t);toast(auto?'구문을 저장했습니다':'구문을 지웠습니다')}})}
/* ---------- 시트 템플릿 ---------- */
function stplRankOk(rk,have){if(have==null)return false;const ps=String(rk||'').split('~').map(x=>RV[strip(x.trim())]);if(ps[0]==null||have<ps[0])return false;if(ps.length>1&&ps[1]!=null&&have>ps[1])return false;return true}
/* 대상: 「전원」 「파트너」 「N체」 「파트너 N체」. 「6체 기준/1인 기준」처럼 「/」로 나누면 1인 기준(2체) 트레이너는 뒤쪽을 씁니다. 1인 기준은 모두 파트너. */
function stplTarget(tg,solo){const sp=String(tg||'').split('/').map(x=>x.trim());const v=(solo&&sp[1]?sp[1]:sp[0])||'전원';const m=v.match(/(\d+)\s*체/);return{partner:/파트너/.test(v)&&!solo,cap:m?+m[1]:Infinity}}
function stplRows(t){const m=new Map();for(const r of S.db.stpl||[]){const [q,rk,kind,name,,tg]=r;if(!name)continue;
  if(q!=='기본'&&!stplRankOk(rk,RV[strip(t&&t.ranks?t.ranks[q]:'C')]))continue;
  m.set(name,{kind:kind||'',name,tg:tg||'전원'})}return [...m.values()]}
function stplCount(q){const h={};q.pots.forEach((n,i)=>{if(!n)return;const k=potKindOf(q,i);const g=k?potGroup(k):n;h[g]=(h[g]||0)+1});return h}
function applySheetTpl(t,p){const all=stplRows(t).sort((a,b)=>String(a.kind).localeCompare(String(b.kind),'ko',{numeric:true}));const grp=r=>r.kind?potGroup(r.kind):r.name;
 const pos={},nth={};all.forEach(r=>{const g=grp(r);pos[g]=(pos[g]||0)+1;nth[r.name]=pos[g]});
 const sibs=((t&&t.pokemon)||[]).filter(x=>x!==p&&x.id!==p.id).map(stplCount);
 const rows=all.filter(r=>{const tg=stplTarget(r.tg,soloN(t)===2);if(tg.partner&&!p.partner)return false;
  if(tg.cap<Infinity){const g=grp(r);if(sibs.filter(h=>(h[g]||0)>=nth[r.name]).length>=tg.cap)return false}return true});
 const have=stplCount(p);
 const names=new Set(p.pots.filter(Boolean));const byG={};rows.forEach(r=>{(byG[grp(r)]=byG[grp(r)]||[]).push(r)});
 const add=[];for(const r of rows){const g=grp(r);if(names.has(r.name))continue;const list=byG[g];const deficit=list.length-(have[g]||0);if(deficit<=0)continue;
  if(list.indexOf(r)<list.length-deficit)continue;add.push(r)}
 let n=0;for(const r of add){const i=p.pots.findIndex(x=>!x);if(i<0)break;const row=potRow(r.name);p.pots[i]=r.name;p.potEff[i]='';p.potKind[i]=row&&row[0]===r.kind?'':r.kind;n++}
 return n}
const STPL_SKIP=['와일드','와일드 보스','디멘션 보스'];
function stplApplyAll(){let n=0,k=0;for(const t of S.trainers)for(const p of t.pokemon||[]){if(p.pots.some(x=>STPL_SKIP.includes(x)))continue;const a=applySheetTpl(t,p);if(a){n+=a;k++}}return [n,k]}

/* ---------- 모델 ---------- */
function newPoke(){return{id:uid(),open:true,tab:'base',name:'',gender:'-',pride:'',egg1:'-',egg2:'-',t1:'-',t2:'-',t3:'-',tera:'-',ability:'',item:'',dist:0,
 base:Array(6).fill(''),ev:Array(6).fill(''),pots:Array(20).fill(''),potEff:Array(20).fill(''),potKind:Array(20).fill(''),excl:{name:'',eff:''},exclX:[],moves:[],sockMax:'',memo:'',image:'',stands:[],standActive:0,partner:false,auto:{},forms:[],fields:[]}}
function fixP(p){const n=newPoke();for(const k in n)if(p[k]==null)p[k]=n[k];
 for(const k of ['pots','potEff','potKind'])while(p[k].length<20)p[k].push('');
 p.moves=(p.moves||[]).filter(m=>m&&m.name);p.exclX=(Array.isArray(p.exclX)?p.exclX:[]).filter(x=>x&&typeof x==='object').map(x=>({name:String(x.name||''),eff:String(x.eff||'')}));delete p.iv;delete p.nature;if(Array.isArray(p.ivs)&&p.ivs.length===6)p.ivs=p.ivs.map(v=>Math.max(0,Math.min(31,Math.round(+v)||0)));else delete p.ivs;if(p.ivLog&&typeof p.ivLog!=='object')delete p.ivLog;{const R=ivRollsOf(p);if(R&&R.length)p.ivRolls={rolls:R,x:+(p.ivRolls.x)||0,r:+(p.ivRolls.r)||0};else delete p.ivRolls}p.image=safeImg(p.image);p.stands=standsFix(p.stands);p.fields=fieldsFix(p.fields);if(!(+p.standActive>=0)||+p.standActive>=p.stands.length)p.standActive=0;p.potKind=p.potKind.map(k=>k?normKind(k):'');if(!p.auto||typeof p.auto!=='object')p.auto={};if(p.tune)tuneOf(p);p.forms=(Array.isArray(p.forms)?p.forms:[]).filter(f=>f&&typeof f==='object').map(fixForm);p.items2=(Array.isArray(p.items2)?p.items2:[]).filter(x=>x&&typeof x==='object').slice(0,2).map(x=>Object.assign({item:String(x.item||'')},x.itemOwn&&typeof x.itemOwn==='object'?{itemOwn:x.itemOwn}:{}));if(!p.id)p.id=uid();return p}
/* 폼체인지·메가진화: 오레마스 배틀에서 바꿔 들어갈 모습 (이름·타입·특성·종족치·그림) */
const FORM_KINDS=['폼체인지','메가진화','원시회귀','기타'];
function newForm(){return {name:'',kind:'폼체인지',t1:'-',t2:'-',ability:'',base:Array(6).fill(''),image:'',cond:'',revert:true,pots:[]}}
function fixForm(f){const n=newForm();for(const k in n)if(f[k]==null)f[k]=n[k];f.base=Array.from({length:6},(_,i)=>String((f.base||[])[i]??''));f.image=safeImg(f.image);f.revert=!!f.revert;f.pots=(Array.isArray(f.pots)?f.pots:[]).filter(x=>x&&typeof x==='object').map(x=>({slot:Math.max(0,Math.min(19,+x.slot||0)),name:String(x.name||''),eff:String(x.eff||'')}));return f}
function formFromOld(r){const mega=r[10]==='O';return fixForm({name:r[1],kind:mega?'메가진화':'폼체인지',t1:r[3]||'-',t2:r[4]||'-',ability:abilName(r[5]),base:r.slice(11,17).map(v=>String(v??'')),revert:!mega})}
function formsHtml(t,ti,p,pi,P){const fs=p.forms||[];const types=S.db.types.map(x=>x[0]);const A=(act,k)=>`data-act="${act}" data-i="${ti}" data-j="${pi}"${k!=null?` data-k="${k}"`:''}`;
 return `<div class="panel fmp"><h3>폼체인지 · 메가진화<span class="sp"></span><button class="btn sm" ${A('addFormOld')} title="올드 타입 일람(메가진화·리전 폼 등)의 타입·특성·종족치를 채웁니다">+ 일람에서</button><button class="btn sm" ${A('addForm')}>+ 빈 폼</button></h3>
 ${fs.length?fs.map((f,k)=>{const F=`${P}.forms.${k}`;const ab=idx.abil.get(f.ability);const tot=f.base.reduce((a,b)=>a+(+b||0),0);return `<div class="fmrow" data-fdrop="${ti}.${pi}.${k}"><div class="fmhd"><div class="fmimgb ${safeImg(f.image)?'':'none'}" ${A('fimgPick',k)} role="button" tabindex="0" data-kbd title="폼 그림 넣기 — 클릭 · 끌어다 놓기 · 붙여넣기 (이 폼 칸 위에서 Ctrl+V)">${safeImg(f.image)?`<img src="${safeImg(f.image)}" alt="">`:'<span>그림<br>＋</span>'}</div>${inp(F+'.name',f.name,{ph:'폼 이름 (예: 메가 리자몽 X)'})}${sel(F+'.kind',f.kind,FORM_KINDS)}<button class="btn sm ghost" ${A('delForm',k)} title="이 폼 지우기">✕</button></div>
  <div class="fmgrid"><label class="lbl">타입1${sel(F+'.t1',f.t1,types)}</label><label class="lbl">타입2${sel(F+'.t2',f.t2,types)}</label><div class="lbl" style="grid-column:span 2">특성<button class="pickbtn" ${A('pickFormAbil',k)}>${f.ability?`<b>${esc(f.ability)}</b>${ab?'':'<span class="sp"></span><span class="faint small">DB에 없음</span>'}`:'<span class="ph0">그대로 (원래 특성)</span>'}</button></div></div>
  <div class="fmst">${STATS.map((sn,i)=>`<label><span>${sn}</span>${inp(`${F}.base.${i}`,f.base[i],{num:1,ph:String(p.base[i]||'')})}</label>`).join('')}<span class="small muted">합 <b class="num">${tot}</b></span></div>
  <div class="fmpots"><div class="row small"><b>포텐셜 교체</b><span class="muted">이 폼일 때만 바뀌는 칸 (종족·속별 등)</span><span class="sp"></span><button class="btn sm" ${A('addFormPot',k)}>+ 교체 칸</button></div>
   ${f.pots.map((x,xi)=>{const r=potRow(x.name);return `<div class="fmpot">${`<select data-p="${F}.pots.${xi}.slot">${SLOTS.map((sn,si)=>`<option value="${si}" ${si===+x.slot?'selected':''}>${si+1}. ${esc(sn)} · ${esc(p.pots[si]||'빈 칸')}</option>`).join('')}</select>`}<span class="faint">→</span><span class="fmpn">${inp(`${F}.pots.${xi}.name`,x.name,{ph:'새 포텐셜 이름 (직접 입력 가능)'})}<button class="btn sm" ${A('pickFormPot',k)} data-x="${xi}" title="포텐셜 DB에서 고르기">DB</button>${x.name?fxAutoBtn(p,'pot',x.name,ti,pi,'f'+k+'.'+xi):''}</span><button class="btn sm ghost" ${A('delFormPot',k)} data-x="${xi}">✕</button>
    <textarea class="fmpeff" data-p="${F}.pots.${xi}.eff" rows="2" placeholder="${esc(r?String(r[2]).replace(/<br\s*\/?>/gi,' '):'효과를 적어 주세요')}">${esc(x.eff)}</textarea>${r?'':x.name?'<div class="small faint fmpeff">DB에 없는 포텐셜 — 효과를 직접 적어 두면 배틀에서 그대로 보입니다</div>':''}</div>`}).join('')}</div>
  <div class="fmgrid"><label class="lbl" style="grid-column:span 2">조건 · 메모${inp(F+'.cond',f.cond,{ph:'예: 메가스톤 지니고 1회 / HP 절반 이하'})}</label><div class="lbl" style="grid-column:span 2">그림<span class="row fmimgr">${inp(F+'.image',/^data:/.test(f.image)?'':f.image,{ph:/^data:/.test(f.image)?'(올린 그림)':'https://… 또는 파일 · 끌어다 놓기 (비우면 원래 그림)'})}<button class="btn sm" ${A('fimgPick',k)}>파일</button>${f.image?`<button class="btn sm ghost" ${A('fimgDel',k)} title="그림 지우기 — 원래 그림을 쓴다">✕</button>`:''}</span></div></div>
  <label class="row small"><input type="checkbox" data-p="${F}.revert" ${f.revert?'checked':''}> 교대(퇴장)하면 원래 모습으로 돌아온다 (메가진화는 보통 끔)</label></div>`}).join(''):'<div class="small muted">배틀에서 바꿀 모습을 적어 두면 오레마스 배틀에서 폼체인지·메가진화했다가 돌아올 수 있습니다. 비운 종족치·특성·그림은 원래 것을 씁니다.</div>'}</div>`}
const standsFix=a=>(Array.isArray(a)?a:[]).filter(x=>x&&typeof x==='object'&&/^https?:\/\//.test(String(x.src||''))).map(x=>Object.assign({label:String(x.label||'기본').slice(0,40),src:String(x.src),point:+x.point||0},x.kind==='stand'||x.kind==='portrait'?{kind:x.kind}:{}));
/* 필드 전개 (오레마스 배틀 뒤에 까는 무대) — 트레이너·포켓몬 각자의 능력. [{type:0 필드|1 스타디움|2 이계, name, loc, img, eff, count(-1 무한), color(타입 영문)}] */
const FLD_KINDS=['필드','스타디움','이계'];
const fieldsFix=a=>(Array.isArray(a)?a:[]).filter(x=>x&&typeof x==='object'&&String(x.name||'').trim()).map(x=>({type:[0,1,2].includes(+x.type)?+x.type:0,name:String(x.name).trim().slice(0,60),loc:String(x.loc||'').slice(0,60),img:String(x.img||'').slice(0,600),eff:String(x.eff||'').slice(0,4000),count:+x.count>0?Math.min(99,Math.round(+x.count)):-1,color:String(x.color||'').slice(0,20)}));
const fldTypeKo=en=>{const r=(S.db.types||[]).find(x=>x[3]===en);return r?r[0]:''};
function fieldsHtml(o,D,who){const L=o.fields||[];
 return `<div class="mkflds"><div class="row" style="gap:6px;align-items:baseline"><b class="small">필드 전개</b><span class="small muted">${who==='t'?'이 트레이너가':'이 포켓몬이'} 오레마스 배틀에서 직접 펼치는 필드 · 스타디움 · 이계</span><span class="sp"></span><button type="button" class="btn sm" data-act="fldAdd" ${D}>+ 필드</button></div>
 ${L.length?`<div class="mkfl">${L.map((f,k)=>{const ti=typeInfo(fldTypeKo(f.color));const img=/^https?:\/\//.test(f.img)?f.img:'';return `<div class="mkf" tabindex="0" role="button" data-kbd data-act="fldEdit" ${D} data-k="${k}"><div class="mkfp" ${img?`style="background-image:url('${esc(img)}')"`:''}>${img?'':esc(f.img?'배경: '+f.img:'그림 없음')}</div><div class="mkfb"><div class="row" style="gap:5px;flex-wrap:wrap"><span class="mkfk k${f.type}">${FLD_KINDS[f.type]}</span><b>《${esc(f.name)}》</b>${ti?`<span class="chip" style="background:${safeCss(ti[1])||'var(--sunk2)'}">${esc(ti[0])}</span>`:''}<span class="small muted">${esc(f.loc||'')}${f.loc?' · ':''}${f.count>0?f.count+'턴':'무한'}</span></div><div class="small mkfe">${esc(f.eff||'효과 글 없음')}</div></div><button type="button" class="btn sm ghost danger" data-act="fldDel" ${D} data-k="${k}" aria-label="필드 지우기">✕</button></div>`}).join('')}</div>`:'<div class="small faint" style="margin-top:4px">아직 없음 — 「+ 필드」로 넣으면 배틀의 「필드 전개」에서 주인이 펼칠 수 있다</div>'}</div>`}
/* 필드 등록 · 수정 창 (10-22 망령: 꾸미기) — 오른쪽에 오레마스 「필드 전개」 컷인 · 로그 카드 미리보기, 그림은 끌어다 놓기 · 붙여넣기 · 파일 · 주소 */
const FLD_EN=['FIELD','STADIUM','ANOTHER WORLD'];
const lightCol=c=>{const m=String(c||'').match(/^#([0-9a-f]{3}|[0-9a-f]{6})$/i);if(!m)return false;let h=m[1];if(h.length===3)h=[...h].map(x=>x+x).join('');const [r,g,b]=[0,2,4].map(i=>parseInt(h.slice(i,i+2),16));return (r*299+g*587+b*114)/1000>165};
function openFieldEditor(o,k,done){const isNew=k==null;const f=isNew?{type:0,name:'',loc:'',img:'',eff:'',count:-1,color:''}:Object.assign({},o.fields[k]);
 const types=(S.db.types||[]).filter(x=>x[3]&&x[0]&&x[0]!=='-');let busy=false;
 const l=openModal(`<div class="mhead"><h2>${isNew?'필드 추가':'필드 수정'}</h2><span class="small muted">${esc(o.name||'')}</span><span class="sp"></span><button class="btn ghost" data-x="no">닫기</button></div><div class="mbody"><div class="fed">
  <div class="fedf">
   <div class="lbl">종류</div><div class="row fedk" style="gap:6px">${FLD_KINDS.map((n,i)=>`<button type="button" class="btn sm k${i} ${f.type===i?'on':''}" data-fk="${i}">${n}</button>`).join('')}</div>
   <label class="lbl">이름<input id="fe-n" value="${esc(f.name)}" placeholder="예) 세가지 재앙" maxlength="60" autocomplete="off"></label>
   <div class="row" style="gap:10px;flex-wrap:nowrap"><label class="lbl" style="flex:2;min-width:0">지역<input id="fe-l" value="${esc(f.loc)}" placeholder="예) 재앙, 종말" maxlength="60" autocomplete="off"></label><label class="lbl" style="flex:1;min-width:0">지속 턴<input id="fe-c" type="number" min="1" max="99" value="${f.count>0?f.count:''}" placeholder="비우면 무한"></label></div>
   <div class="lbl">색상 타입 <span class="small faint" style="font-weight:400">컷인 띠 · 카드 테두리 색</span></div>
   <div class="fedc"><button type="button" class="fedc1 none" data-fc="" title="없음">✕</button>${types.map(x=>`<button type="button" class="fedc1" data-fc="${esc(x[3])}" title="${esc(x[0])}" style="background:${safeCss(x[1])||'var(--sunk2)'}${lightCol(x[1])?';color:#1d2433;text-shadow:none':''}">${esc(x[0])}</button>`).join('')}</div>
   <div class="lbl">그림 <span class="small faint" style="font-weight:400">끌어다 놓기 · 붙여넣기(Ctrl+V) · 파일 · 주소 https://… · 오레마스 배경 목록 이름</span></div>
   <div class="feddrop" id="fe-d" tabindex="0" role="button" data-kbd title="눌러서 파일 고르기"><span id="fe-dt">여기에 그림을 끌어다 놓거나 눌러서 고르기</span></div>
   <div class="row" style="gap:4px;flex-wrap:nowrap"><input id="fe-i" value="${esc(f.img)}" placeholder="https://… 또는 배경 이름" style="flex:1;min-width:0" autocomplete="off"><button type="button" class="btn sm ghost" id="fe-x" title="그림 지우기">✕</button><input type="file" id="fe-f" accept="image/*" hidden></div>
   <div class="lbl">효과 <span class="small faint" style="font-weight:400">한 줄에 하나 — 배틀 로그 카드에 그대로 나온다</span><span class="sp"></span><button type="button" class="btn xs" id="fe-num" title="줄 앞에 ① ② ③ … 를 붙인다">① 번호 매기기</button></div>
   <textarea id="fe-e" rows="6" placeholder="① …&#10;② …">${esc(f.eff)}</textarea>
  </div>
  <div class="fedp"><div class="small muted">미리보기 — 오레마스 「필드 전개」</div><div id="fe-p"></div></div>
 </div></div><div class="mfoot"><span class="small faint">Ctrl+Enter 로 ${isNew?'추가':'저장'}</span><span class="sp"></span><button class="btn" data-x="no">취소</button><button class="btn pri" id="fe-ok">${isNew?'추가':'저장'}</button></div>`,{wide:true});
 const st={type:f.type,color:f.color};
 const prev=()=>{const u=$('#fe-i',l).value.trim();const img=/^https?:\/\//.test(u)?u:'';const ti=typeInfo(fldTypeKo(st.color));const col=ti?safeCss(ti[1]):'';
  const name=$('#fe-n',l).value.trim()||'이름 없음',loc=$('#fe-l',l).value.trim(),cnt=+$('#fe-c',l).value;const eff=$('#fe-e',l).value.replace(/\r/g,'').split('\n').map(x=>x.trim()).filter(Boolean);
  $('#fe-p',l).innerHTML=`<div class="fedcut k${st.type}" style="${col?`--fc:${col}`:''}"><div class="fedbar"></div><div class="fedimg" ${img?`style="background-image:url('${esc(img)}')"`:''}>${img?'':`<span>${u?'「'+esc(u)+'」 — 배경 목록 이름은 오레마스에서 보인다':'그림 없음'}</span>`}<div class="fedtx"><div class="fedkn">${FLD_EN[st.type]}</div><div class="fednm">《${esc(name)}》</div>${loc?`<div class="fedlc">${esc(loc)}</div>`:''}<div class="fedlc">${esc(o.name||'')}</div></div></div><div class="fedbar"></div></div>
   <div class="fedlog k${st.type}" style="${col?`--fc:${col}`:''}"><div class="row" style="gap:6px;flex-wrap:wrap"><span class="mkfk k${st.type}">${FLD_KINDS[st.type]}</span><b>《${esc(name)}》</b>${ti?`<span class="chip" style="background:${col||'var(--sunk2)'}">${esc(ti[0])}</span>`:''}<span class="small muted">${cnt>0?cnt+'턴':'무한'}</span></div>${eff.length?`<div class="small fedeff">${eff.map(x=>`<div>${esc(x)}</div>`).join('')}</div>`:'<div class="small faint">효과 글 없음</div>'}</div>`;
  l.querySelectorAll('[data-fk]').forEach(b=>b.classList.toggle('on',+b.dataset.fk===st.type));l.querySelectorAll('[data-fc]').forEach(b=>b.classList.toggle('on',b.dataset.fc===st.color));
  $('#fe-dt',l).textContent=busy?'올리는 중…':img?'다른 그림을 끌어다 놓거나 눌러서 바꾸기':'여기에 그림을 끌어다 놓거나 눌러서 고르기';$('#fe-d',l).classList.toggle('has',!!img)};
 for(const id of ['#fe-n','#fe-l','#fe-c','#fe-e','#fe-i'])$(id,l).addEventListener('input',prev);prev();
 l.querySelectorAll('[data-fk]').forEach(b=>b.onclick=()=>{st.type=+b.dataset.fk;prev()});
 l.querySelectorAll('[data-fc]').forEach(b=>b.onclick=()=>{st.color=b.dataset.fc;prev()});
 const up=async fl=>{if(!fl)return;if(!/^image\//.test(fl.type))return toast('그림 파일만');if(fl.size>8*1024*1024)return toast('8MB 이하만');busy=true;prev();
  try{$('#fe-i',l).value=await putImg(`fields/${o.id}_${Date.now().toString(36)}`,fl);toast('올렸습니다')}catch(e){toast('올리지 못했습니다: '+e.message)}busy=false;prev()};
 $('#fe-d',l).onclick=()=>$('#fe-f',l).click();$('#fe-f',l).onchange=ev=>{const fl=ev.target.files[0];ev.target.value='';up(fl)};
 $('#fe-x',l).onclick=()=>{$('#fe-i',l).value='';prev()};
 const box=$('.mbox',l)||l;const dz=$('#fe-d',l);
 box.addEventListener('dragover',e=>{if([...(e.dataTransfer&&e.dataTransfer.items||[])].some(x=>x.kind==='file')){e.preventDefault();dz.classList.add('over')}});box.addEventListener('dragleave',e=>{if(e.target===dz)dz.classList.remove('over')});
 box.addEventListener('drop',e=>{dz.classList.remove('over');const fl=e.dataTransfer&&[...e.dataTransfer.files].find(x=>/^image\//.test(x.type));if(fl){e.preventDefault();e.stopPropagation();up(fl);return}const u=e.dataTransfer&&(e.dataTransfer.getData('text/uri-list')||e.dataTransfer.getData('text/plain'));if(u&&/^https?:\/\//.test(u.trim())){e.preventDefault();$('#fe-i',l).value=u.trim().split('\n')[0];prev()}});
 box.addEventListener('paste',e=>{const it=[...(e.clipboardData&&e.clipboardData.items||[])].find(x=>x.type.startsWith('image/'));if(it){e.preventDefault();e.stopPropagation();up(it.getAsFile())}});
 $('#fe-num',l).onclick=()=>{const N='①②③④⑤⑥⑦⑧⑨⑩⑪⑫⑬⑭⑮⑯⑰⑱⑲⑳';const ta=$('#fe-e',l);let i=0;ta.value=ta.value.replace(/\r/g,'').split('\n').map(x=>x.trim()).filter(Boolean).map(x=>(N[i++]||'')+x.replace(/^[①-⑳]\s*/,'')).join('\n');prev()};
 l.querySelectorAll('[data-x="no"]').forEach(b=>b.onclick=()=>closeModal());
 const ok=()=>{if(busy)return toast('그림을 올리는 중입니다');const name=$('#fe-n',l).value.trim();if(!name){toast('이름을 적어 주세요');$('#fe-n',l).focus();return}
  const v=fieldsFix([{type:st.type,name,loc:$('#fe-l',l).value.trim(),img:$('#fe-i',l).value.trim(),eff:$('#fe-e',l).value.replace(/\r/g,'').trim(),count:+$('#fe-c',l).value,color:st.color}])[0];
  o.fields=o.fields||[];if(isNew)o.fields.push(v);else o.fields[k]=v;closeModal();done&&done();toast(isNew?'필드를 넣었습니다':'고쳤습니다')};
 $('#fe-ok',l).onclick=ok;box.addEventListener('keydown',e=>{if(e.key==='Enter'&&(e.ctrlKey||e.metaKey)){e.preventDefault();ok()}})}
/* 덱 관리 (10-26 망령) — 트레이너가 가진 카드 덱. 카드는 DB 관리 「카드 DB」에서 고른다. t.deck = [{n 카드 이름, q 장수}] · t.deckName */
const deckFix=a=>(Array.isArray(a)?a:[]).filter(x=>x&&typeof x==='object'&&String(x.n||'').trim()).map(x=>({n:String(x.n).trim().slice(0,60),q:Math.max(0,Math.min(99,Math.round(+x.q)||0))}));
function deckHtml(t,ti){const L=t.deck||[];const P=`T.${ti}`;const tot=L.reduce((a,x)=>a+(+x.q||0),0);
 /* 카드 한 종류 = 세로 5:7 타일 하나 (그림 · 비용 · 이름 · 종류 · ×장수). 10~20장 덱이 한눈에 들어오게 (10-26 망령) */
 const tile=(x,k)=>{const r=idx.cards&&idx.cards.get(x.n);const img=r?cardImg(r[6]):'';const col=r?cardCol(r[5]):'#6b7286';const cost=r&&r[3]!==''&&r[3]!=null?r[3]:'';
  return `<div class="mkdt ${r?'':'miss'}" style="--dcc:${col}" title="${esc(x.n)}${r&&r[4]?' — '+esc(String(r[4]).replace(/<br\s*\/?>/g,' ')):''}"><button type="button" class="mkdti" data-act="deckCard" data-i="${ti}" data-k="${k}" style="${img?`background-image:url('${esc(img)}')`:''}" aria-label="${esc(x.n)} 카드 보기 · 고치기">${img?'':`<span class="mkdtl">${esc(Array.from(x.n)[0]||'?')}</span>`}${r&&r[4]&&!img?`<span class="mkdtx">${esc(String(r[4]).replace(/<br\s*\/?>/g,' ').slice(0,60))}</span>`:''}</button>${cost!==''?`<b class="mkdtc">${esc(cost)}</b>`:''}<b class="mkdtq">×${+x.q||0}</b>
   <div class="mkdtn">${esc(x.n)}</div><div class="mkdtk">${r?esc(r[2]||'카드'):'<span class="warn">카드 DB 에 없음</span>'}${r&&String(r[9]||'').trim()?' <span title="자동화 구문이 있다">⚙</span>':''}</div>
   <div class="mkdtb"><button type="button" data-act="deckQ" data-i="${ti}" data-k="${k}" data-d="-1" aria-label="한 장 빼기">−</button><button type="button" data-act="deckQ" data-i="${ti}" data-k="${k}" data-d="1" aria-label="한 장 더">+</button><button type="button" class="danger" data-act="deckDel" data-i="${ti}" data-k="${k}" aria-label="덱에서 빼기">✕</button></div></div>`};
 return `<div class="mkdeck"><div class="row" style="margin-top:12px;gap:6px;align-items:baseline"><b class="small">덱 관리</b><span class="small muted">카드 DB 에서 골라 넣는다 · <b class="num">${L.length}</b>종 <b class="num">${tot}</b>장</span><span class="sp"></span><button type="button" class="btn sm" data-act="deckAdd" data-i="${ti}">+ 카드</button></div>
 ${L.length?`<label class="plrow" style="margin-top:6px"><span>덱 이름</span>${inp(P+'.deckName',t.deckName,{ph:(t.name||'트레이너')+'의 덱'})}</label><div class="mkdgrid">${L.map(tile).join('')}</div>`:'<p class="small faint" style="margin:4px 0 0">아직 없습니다 — 「+ 카드」 (카드는 DB 관리 → 카드 DB 에서 만들고 그림도 붙인다)</p>'}</div>`}
/* SP · 서포터 (10-25 망령) — 오레마스 배틀에서 밖의 조력자가 돕는 한 수. 트레이너마다 여러 개. 발동하면 확률을 굴려 고유 포텐셜처럼 컷인 + 로그.
   t.sps = [{name, prob(%), theme(한 줄), eff(한 줄에 하나), img(컷 그림), line(컷인 대사), color, auto(자동화 구문 DSL — 고유 포텐셜과 같은 꼴)}] */
const SP_COLS=['#e4002b','#ff8a00','#ffd12e','#3ddc84','#4aa3ff','#9b5cff','#ff4fa3','#222'];
const spFix=a=>(Array.isArray(a)?a:[]).filter(x=>x&&typeof x==='object'&&String(x.name||'').trim()).map(x=>({name:String(x.name).trim().slice(0,60),prob:x.prob===''||x.prob==null?100:Math.max(0,Math.min(100,Math.round(+x.prob)||0)),theme:String(x.theme||'').slice(0,120),eff:String(x.eff||'').slice(0,4000),img:String(x.img||'').slice(0,600),line:String(x.line||'').slice(0,80),color:String(x.color||'').slice(0,20),auto:String(x.auto||'').slice(0,4000)}));
/* 기능 확장 (10-27 망령) — 트레이너가 주는 「기능 확장 : 기술」. 룰북 『항법술』(【1/시】/「기능 확장 : 안개제거」를 내보낸다 · PT 전원) 같은 것.
   t.ext = [{mv 기술 이름, lim 【N/시】(0 = 제한 없음), kind 'act' 행동으로 | 'extra' 추가 행동, who 쓰는 포켓몬 id(비우면 PT 전원), src 출처(포텐셜 이름)}]
   오레마스 import.js 가 배틀 트레이너 ext 로 가져가고, 배틀 지시 · 공격 창 기술 목록 맨 뒤에 붙는다 (적용할 때 횟수 1) */
const extFix=a=>(Array.isArray(a)?a:[]).filter(x=>x&&typeof x==='object'&&String(x.mv||'').trim()).slice(0,12).map(x=>({mv:String(x.mv).trim().slice(0,60),lim:x.lim===''||x.lim==null?1:Math.max(0,Math.min(9,Math.round(+x.lim)||0)),kind:x.kind==='extra'?'extra':'act',who:String(x.who||'').slice(0,40),src:String(x.src||'').slice(0,60)}));
/* 해석 차단 (10-27 망령) — 상대의 『포켓몬 도감』 · 데이터 해석을 막는 정도. 오레마스 도감(dex_ui)의 mon.dexFw 와 같은 값.
   트레이너 t.dexFw = 기본값, 포켓몬 p.dexFw ('' = 트레이너 기본값). 일부 차단(3)이면 dexFwParts {move,type,trait} = 해석되는 부분 */
const DEXFW=[['0','없음'],['1','1회 차단 — 첫 해석을 막고 풀린다'],['2','완전 차단 — 강제 해석(데이터 해석 효과)만 통한다'],['3','일부 차단 — 고른 부분만 해석된다'],['4','노이즈 — 해석은 되지만 글자가 ■ 로 으깨진다']];
const DEXP=[['move','기술'],['type','타입'],['trait','특성']];
const dexName=v=>((DEXFW.find(x=>x[0]===String(v))||DEXFW[0])[1]).split(' — ')[0];
function dexPartsHtml(o,attr){const P=o.dexFwParts||{};return `<span class="row small" style="gap:8px">${DEXP.map(([k,n])=>`<label class="row" style="gap:3px"><input type="checkbox" ${attr} data-dexp="${k}" ${P[k]?'checked':''}>${n}</label>`).join('')}<span class="faint">← 일부 차단일 때 해석되는 부분</span></span>`}
function extHtml(t,ti){const L=t.ext||[];const mons=t.pokemon||[];
 const row=(e,k)=>{const r=idx.moves&&idx.moves.get(e.mv);const A=`data-i="${ti}" data-k="${k}"`;
  return `<div class="mkext"><div class="row" style="gap:6px;align-items:center;flex-wrap:wrap">${r?tchip(r[5]):'<span class="kindb">DB 없음</span>'}<b>「기능 확장 : ${esc(e.mv)}」</b>${r?`<span class="small muted">${esc(r[6]||'')} · 위력 ${esc(r[7]||'-')} · 명중 ${esc(r[8]||'-')} · ${esc(r[9]||'')}</span>`:''}<span class="sp"></span><button type="button" class="btn sm ghost danger" data-act="extDel" ${A} aria-label="삭제">✕</button></div>
   <div class="row small" style="gap:10px;flex-wrap:wrap;margin-top:4px">
    <label class="row" style="gap:4px">횟수 <select data-ext="lim" ${A}>${[0,1,2,3,4,5,6].map(n=>`<option value="${n}" ${+e.lim===n?'selected':''}>${n?`【${n}/시】`:'제한 없음'}</option>`).join('')}</select></label>
    <label class="row" style="gap:4px">방식 <select data-ext="kind" ${A}><option value="act" ${e.kind!=='extra'?'selected':''}>행동으로 (그 턴 기술 대신)</option><option value="extra" ${e.kind==='extra'?'selected':''}>추가 행동 (행동과 따로)</option></select></label>
    <label class="row" style="gap:4px">쓰는 포켓몬 <select data-ext="who" ${A}><option value="">PT 전원</option>${mons.map(p=>`<option value="${esc(p.id)}" ${e.who===p.id?'selected':''}>${esc(p.name||'(이름 없음)')}</option>`).join('')}${e.who&&!mons.some(p=>p.id===e.who)?`<option value="${esc(e.who)}" selected>(없는 포켓몬)</option>`:''}</select></label>
    <label class="row" style="gap:4px;flex:1;min-width:160px">출처 <input data-ext="src" ${A} value="${esc(e.src)}" placeholder="예) 『항법술』" maxlength="60" style="flex:1;min-width:0"></label></div>
   ${r?`<div class="small faint" style="margin-top:3px">${rich(r[13]||'')}</div>`:''}</div>`};
 return `<div class="mksp"><div class="row" style="gap:6px;align-items:baseline"><b class="small">기능 확장</b><span class="small muted">트레이너가 주는 「기능 확장 : 기술」 — 오레마스 배틀의 지시 · 공격 창 기술 목록 맨 뒤에 붙는다</span><span class="sp"></span><button type="button" class="btn sm" data-act="extAdd" data-i="${ti}">+ 기능 확장</button></div>
 ${L.map(row).join('')||'<p class="small faint" style="margin:4px 0 0">아직 없습니다 — 「+ 기능 확장」으로 기술 DB 에서 고른다 (예: 『항법술』 = 안개제거 · 【1/시】 · PT 전원)</p>'}
 <div class="row" style="margin-top:12px;gap:8px;align-items:center;flex-wrap:wrap"><b class="small">해석 차단</b><span class="small muted">기본값 — 포켓몬마다 「상세 조정」 탭에서 따로 정할 수 있다</span>
  <select data-tdexfw data-i="${ti}">${DEXFW.map(([v,l])=>`<option value="${v}" ${String(t.dexFw||'0')===v?'selected':''}>${esc(l)}</option>`).join('')}</select>
  ${String(t.dexFw)==='3'?dexPartsHtml(t,`data-tdexp data-i="${ti}"`):''}</div></div>`}
function tuneDexBox(t,p,D){const own=p.dexFw!=null&&p.dexFw!=='';const cur=own?String(p.dexFw):String(t.dexFw||'0');
 return `<section class="tbox"><div class="row"><b>해석 차단</b><span class="small muted">상대의 『포켓몬 도감』 · 데이터 해석을 막는다 · 오레마스가 불러오면 배틀에 그대로 걸린다</span></div>
  <div class="tcrit"><label>차단 <select data-dexfw="lv" ${D}><option value="" ${own?'':'selected'}>트레이너 기본값 따름 (지금: ${esc(dexName(t.dexFw||'0'))})</option>${DEXFW.map(([v,l])=>`<option value="${v}" ${own&&String(p.dexFw)===v?'selected':''}>${esc(l)}</option>`).join('')}</select></label>
   ${own&&cur==='3'?dexPartsHtml(p,`data-dexfw="p" ${D}`):''}</div>
  <p class="small faint" style="margin:6px 0 0">배틀 중에는 GM 이 도감 창에서 바꿀 수 있다. 「1회 차단」은 첫 해석을 막으면 저절로 풀린다.</p></section>`}
function spHtml(t,ti){const L=t.sps||[];
 return `<div class="mksp"><div class="row" style="margin-top:12px;gap:6px;align-items:baseline"><b class="small">SP · 서포터</b><span class="small muted">밖에서 돕는 조력자 — 오레마스 배틀에서 확률로 발동</span><span class="sp"></span><button type="button" class="btn sm" data-act="spAdd" data-i="${ti}">+ SP</button></div>
 ${L.map((e,k)=>{const img=/^https?:\/\//.test(e.img)?e.img:'';return `<div class="mksc" tabindex="0" role="button" data-kbd data-act="spEdit" data-i="${ti}" data-k="${k}" style="--spc:${safeCss(e.color)||'#ffd12e'}"><i class="mkspi" ${img?`style="background-image:url('${esc(img)}')"`:''}>${img?'':'SP'}</i><div class="mkspb"><div class="row" style="gap:6px"><b>『${esc(e.name)}』</b><span class="mkspp">${e.prob>=100?'확정':e.prob+'%'}</span>${String(e.auto||'').trim()?'<span class="kindb" title="자동화 구문 있음">⚙ 구문</span>':''}<span class="sp"></span><button type="button" class="btn sm ghost danger" data-act="spDel" data-i="${ti}" data-k="${k}" aria-label="삭제">✕</button></div>${e.theme?`<div class="small muted mkspt">${esc(e.theme)}</div>`:''}${e.eff?`<div class="small">${esc(e.eff).replace(/\n/g,'<br>')}</div>`:''}</div></div>`}).join('')||'<p class="small faint" style="margin:4px 0 0">아직 없습니다 — 「+ SP」</p>'}</div>`}
function openSpEditor(t,k,done){const isNew=k==null;const e=isNew?{name:'',prob:100,theme:'',eff:'',img:'',line:'',color:'#ffd12e',auto:''}:Object.assign({},t.sps[k]);let busy=false;let col=e.color||'#ffd12e';
 const l=openModal(`<div class="mhead"><h2>${isNew?'SP 추가':'SP 수정'}</h2><span class="small muted">${esc(t.name||'')}</span><span class="sp"></span><button class="btn ghost" data-x="no">닫기</button></div><div class="mbody"><div class="fed">
  <div class="fedf">
   <label class="lbl">이름<input id="sp-n" value="${esc(e.name)}" placeholder="예) 옛 동료의 지원 사격" maxlength="60" autocomplete="off"></label>
   <div class="row" style="gap:10px;flex-wrap:nowrap"><label class="lbl" style="flex:1;min-width:0">확률 (%)<input id="sp-p" type="number" min="0" max="100" value="${e.prob}"></label><label class="lbl" style="flex:3;min-width:0">테마<input id="sp-t" value="${esc(e.theme)}" placeholder="누가 · 어떻게 돕는지 한 줄" maxlength="120" autocomplete="off"></label></div>
   <div class="small faint" style="margin:-4px 0 4px">확률 100 이면 굴리지 않고 바로 발동 · 그 밖에는 d100 을 굴려 그 값 이하면 성공</div>
   <label class="lbl">효과 <span class="small faint" style="font-weight:400">한 줄에 하나 — 배틀 로그에 그대로</span><textarea id="sp-e" rows="4" placeholder="예) 상대 전체 방어 −1 랭크">${esc(e.eff)}</textarea></label>
   <label class="lbl">컷인 대사 <span class="small faint" style="font-weight:400">비우면 테마가 나온다</span><input id="sp-l" value="${esc(e.line)}" maxlength="80" autocomplete="off"></label>
   <div class="lbl">색</div><div class="row" style="gap:6px">${SP_COLS.map(c=>`<button type="button" class="mkspcol ${c===col?'on':''}" data-spc="${c}" style="background:${c}"></button>`).join('')}</div>
   <div class="lbl">컷 그림 <span class="small faint" style="font-weight:400">끌어다 놓기 · 붙여넣기(Ctrl+V) · 파일 · 주소 — 비우면 트레이너 그림</span></div>
   <div class="feddrop" id="sp-d" tabindex="0" role="button" data-kbd><span id="sp-dt">여기에 그림을 끌어다 놓거나 눌러서 고르기</span></div>
   <div class="row" style="gap:4px;flex-wrap:nowrap"><input id="sp-i" value="${esc(e.img)}" placeholder="https://…" style="flex:1;min-width:0" autocomplete="off"><button type="button" class="btn sm ghost" id="sp-x" title="그림 지우기">✕</button><input type="file" id="sp-f" accept="image/*" hidden></div>
   <details class="autobox" ${String(e.auto||'').trim()?'open':''}><summary>⚙ 자동화 구문 <span class="small muted" id="sp-ah"></span></summary>
    <div class="small muted" style="margin:4px 0">발동에 성공하면 오레마스가 자동으로 처리할 내용 — 배틀에서 기준이 될 내 포켓몬을 고르고, 거기서 대상(자신 · 상대1체 · 아군전체 …)을 잡는다. 한 줄에 명령 하나 — 예: <code>랭크 공격+1 임시 아군전체</code> · <code>상태확률 화상 30% 상대1체</code></div>
    <textarea id="sp-a" rows="4" style="width:100%;font-family:var(--mono,monospace);font-size:12.5px" placeholder="(비우면 효과 글만 로그에)">${esc(e.auto||'')}</textarea>
    <div class="small" id="sp-ap" style="white-space:pre-wrap;margin-top:4px"></div><div id="sp-ag"></div>
    <details><summary class="small">구문 도움말</summary><pre class="small" style="white-space:pre-wrap">${esc(AUTO_HELP)}</pre></details></details>
  </div>
  <div class="fedp"><div class="small muted">미리보기 — 오레마스 「SP」</div><div id="sp-pv"></div></div>
 </div></div><div class="mfoot"><span class="small faint">Ctrl+Enter 로 ${isNew?'추가':'저장'}</span><span class="sp"></span><button class="btn" data-x="no">취소</button><button class="btn pri" id="sp-ok">${isNew?'추가':'저장'}</button></div>`,{wide:true});
 const prev=()=>{const u=$('#sp-i',l).value.trim();const img=/^https?:\/\//.test(u)?u:(/^https?:\/\//.test(t.image||'')?t.image:'');const nm=$('#sp-n',l).value.trim()||'이름 없음';const p=Math.max(0,Math.min(100,Math.round(+$('#sp-p',l).value)||0));const th=$('#sp-t',l).value.trim(),ln=$('#sp-l',l).value.trim();const eff=$('#sp-e',l).value.replace(/\r/g,'').split('\n').map(x=>x.trim()).filter(Boolean);
  $('#sp-pv',l).innerHTML=`<div class="mkspcut" style="--spc:${col}"><i ${img?`style="background-image:url('${esc(img)}')"`:''}></i><div><span class="mkspcut-t">${esc(t.name||'')}의 서포터!</span><b>『${esc(nm)}』</b>${ln||th?`<span class="mkspcut-l">${esc(ln||th)}</span>`:''}</div></div>
   <div class="fedlog" style="--fc:${col}"><div class="row" style="gap:6px"><span class="mkspp" style="--spc:${col}">SP</span><b>${esc(t.name||'')}의 서포터 『${esc(nm)}』</b><span class="small muted">${p>=100?'확정':p+'%'}</span></div>${th?`<div class="small muted" style="font-style:italic">${esc(th)}</div>`:''}${eff.length?`<div class="small fedeff">${eff.map(x=>`<div>· ${esc(x)}</div>`).join('')}</div>`:'<div class="small faint">효과 글 없음</div>'}</div>`;
  l.querySelectorAll('[data-spc]').forEach(b=>b.classList.toggle('on',b.dataset.spc===col));$('#sp-dt',l).textContent=busy?'올리는 중…':u?'다른 그림을 끌어다 놓거나 눌러서 바꾸기':'여기에 그림을 끌어다 놓거나 눌러서 고르기';
  const K=window.OM_FX,ta=$('#sp-a',l);if(K&&ta){const r=K.parse(ta.value);$('#sp-ap',l).innerHTML=(r.ops.length?'미리보기: '+esc(K.unparse(r.ops).join(' / ')):'')+(r.errs.length?` <span class="warn">모르는 줄: ${esc(r.errs.join(' / '))}</span>`:'');$('#sp-ah',l).textContent=r.ops.length?'구문 있음':'없음'}else $('#sp-ah',l).textContent=String(ta&&ta.value||'').trim()?'구문 있음':'없음'};
 l.addEventListener('input',prev);prev();
 l.querySelectorAll('[data-spc]').forEach(b=>b.onclick=()=>{col=b.dataset.spc;prev()});
 {const gh=$('#sp-ag',l),ta=$('#sp-a',l);if(gh&&ta&&window.OM_FX_UI&&OM_FX_UI.mountGen)OM_FX_UI.mountGen(gh,ta,{toast})}
 const up=async fl=>{if(!fl)return;if(!/^image\//.test(fl.type))return toast('그림 파일만');if(fl.size>8*1024*1024)return toast('8MB 이하만');busy=true;prev();
  try{$('#sp-i',l).value=await putImg(`sp/${t.id}_${Date.now().toString(36)}`,fl);toast('올렸습니다')}catch(err){toast('올리지 못했습니다: '+err.message)}busy=false;prev()};
 $('#sp-d',l).onclick=()=>$('#sp-f',l).click();$('#sp-f',l).onchange=ev=>{const fl=ev.target.files[0];ev.target.value='';up(fl)};$('#sp-x',l).onclick=()=>{$('#sp-i',l).value='';prev()};
 const box=$('.mbox',l)||l;const dz=$('#sp-d',l);
 box.addEventListener('dragover',ev=>{if([...(ev.dataTransfer&&ev.dataTransfer.items||[])].some(x=>x.kind==='file')){ev.preventDefault();dz.classList.add('over')}});box.addEventListener('dragleave',ev=>{if(ev.target===dz)dz.classList.remove('over')});
 box.addEventListener('drop',ev=>{dz.classList.remove('over');const fl=ev.dataTransfer&&[...ev.dataTransfer.files].find(x=>/^image\//.test(x.type));if(fl){ev.preventDefault();ev.stopPropagation();up(fl)}});
 box.addEventListener('paste',ev=>{const it=[...(ev.clipboardData&&ev.clipboardData.items||[])].find(x=>x.type.startsWith('image/'));if(it){ev.preventDefault();ev.stopPropagation();up(it.getAsFile())}});
 l.querySelectorAll('[data-x="no"]').forEach(b=>b.onclick=()=>closeModal());
 const ok=()=>{if(busy)return toast('그림을 올리는 중입니다');const name=$('#sp-n',l).value.trim();if(!name){toast('이름을 적어 주세요');$('#sp-n',l).focus();return}
  const v=spFix([{name,prob:$('#sp-p',l).value,theme:$('#sp-t',l).value.trim(),eff:$('#sp-e',l).value.replace(/\r/g,'').trim(),img:$('#sp-i',l).value.trim(),line:$('#sp-l',l).value.trim(),color:col,auto:$('#sp-a',l).value.trim()}])[0];
  t.sps=t.sps||[];if(isNew)t.sps.push(v);else t.sps[k]=v;closeModal();done&&done();toast(isNew?'SP 를 넣었습니다':'고쳤습니다')};
 $('#sp-ok',l).onclick=ok;box.addEventListener('keydown',ev=>{if(ev.key==='Enter'&&(ev.ctrlKey||ev.metaKey)){ev.preventDefault();ok()}})}
function newTrainer(){const t={id:uid(),open:true,name:'새 트레이너',kind:'pc',pl:'',folder:'',image:'',ranks:{지시:'C',육성:'C',통솔:'C',능력:'C'},detail:{지시:'',육성:'',통솔:'',능력:''},solo:false,
 pts:[],extra:{},base:Object.fromEntries(ptItems().map(([n,d])=>[n,+d||0])),unique:[{name:'',eff:''}],ptMax:'',fields:[],sps:[],ext:[],dexFw:'',pokemon:[]};applyTpl(t);return t}
function fixT(t){if(t.base)delete t.base['소지품 소켓'];const n=newTrainer();for(const k in n)if(t[k]==null)t[k]=n[k];for(const k in n.base)if(t.base[k]==null)t.base[k]=n.base[k];
 if(t.extra){for(const k in t.extra)if(!+t.extra[k])delete t.extra[k]}t.image=safeImg(t.image);if(!t.id)t.id=uid();t.stands=standsFix(t.stands);t.fields=fieldsFix(t.fields);t.sps=spFix(t.sps);t.ext=extFix(t.ext);t.deck=deckFix(t.deck);if(!(+t.standActive>=0))t.standActive=0;t.pokemon.forEach(fixP);return t}
/* 같은 id가 두 번 나오면(예전 백업을 「추가」로 불러온 경우 등) 뒤의 것에 새 id를 준다 */
function dedupeIds(){const seen=new Set();for(const t of S.trainers){if(seen.has('t'+t.id))t.id=uid();seen.add('t'+t.id);for(const p of t.pokemon){if(seen.has('p'+p.id))p.id=uid();seen.add('p'+p.id)}}}
function applyTpl(t,only){const rows=S.db.tpl;const n=soloN(t);for(const r of rows){const [q,rk,item,v6,,v1,v3]=r;const val=n===3?(v3!=null&&v3!==''?v3:s3val(v6,v1)):n===2&&v1!=null&&v1!==''?v1:v6;if(!item)continue;
 if(q==='공통'&&!only){t.base[item]=+val||0;continue}
 if(only&&q!==only)continue;if(!QUAL.includes(q))continue;const cur=t.ranks[q];
  const exact=rows.some(x=>x[0]===q&&x[2]===item&&x[1]===cur);if(exact?rk===cur:strip(rk)===strip(cur))t.base[item]=+val||0}
 const need=uniqNeed(t.ranks['능력']);while(t.unique.length<need)t.unique.push({name:'',eff:''})}
const EXAMPLE='싱잉 플로라;105;풀;독;-;-;음절초;150;65;100;40;100;70;;;;;;;C;식물;-#어시스트;현대종;귀를 기울여요;함께 춤춰요;마음을 추스려요;조화로운 멜로디;유인술;#【탈진】/기술 배치에 「도우미」「감싸기」「쉬프트업」을 추가한다.;최근에 발견된 새로운 종.;「씨뿌리기」 상태인 상대의 「변화기」에 저확률로 「특성 : 음절초」가 발동한다.;【지시 : B】/이 포텐셜을 「유인술」로 취급한다.;「정화」가 아군의 「혼란」「도발」도 치유할 수 있다.;「소리」 기술의 대상이 되었을 때 중확률로 「HP」를 1/6만큼 회복한다.;【1/시】【등장 (통상 교대)】/「날따름」「분노가루」「사이드체인지」에 의한 추가 행동을 얻는다.;#0;1;4;4;4;5;12;999;999;999;999;999;999;999;999;999;999;999;999;999;#-#-#크로스포이즌;독;물리;70;100;1체;O;0;베기;1할 「독」. 기술이 급소에 맞기 쉽다(C+1).;공격;방어;;4세대;Poison;1;1;\\씨뿌리기;풀;변화;0;90;1체;-;0;-;대상을 「씨뿌리기」 상태로 만들어 대상이 매 턴 종료 시 이 에리어의 포켓몬에게 「HP」를 1/8만큼 드레인당하게 만든다. 「타입 : 풀」에게 무효.;-;-;;1세대;Grass;1;1;\\정화;독;변화;0;100;1체;-;0;-;대상의 상태 이상을 치유한다. 그 후, 자신의 「HP」를 1/2만큼 회복한다.;-;-;;7세대;Poison;1;1;\\분노가루;벌레;변화;0;0;자신;-;2;가루, 선공;「우선도」+2. 대상이 자신을 공격하게 만든다. 「가루」 기술.「연속 제한 : 실패 확률 증가」.;-;-;「날따름」 상태와 동일 처리.;5세대;Bug;1;1;\\도우미;노말;변화;0;0;아군;-;5;선공;「우선도」+5. 아군을 턴 종료 시까지 「도우미」 상태로 만들어 기술 대미지를 강화(1.5배)한다.;-;-;;3세대;Normal;1;1;\\감싸기;노말;변화;0;0;아군;-;3;방어;「우선도」+3. 턴 종료 시까지 아군을 「유사 방어」 상태로 만들어 받는 대미지를 반감시킨다. 「연속 제한 (방어) : 실패 확률 증가」.;-;-;;3기;Normal;1;1;\\쉬프트업;노말;변화;0;0;아군;-;2;-;「우선도」+2. 턴 종료 시까지 아군의 「스피드」를 강화(1.5배)한다. 「연속 제한 : 실패 확률 증가」.;-;-;;3기;Normal;1;1;#';
function sampleTrainer(){const t=newTrainer();t.name='예시 트레이너';const p=parseCopy(EXAMPLE,t);p.open=true;t.pokemon.push(p);return t}

/* ---------- 기술 범위 그림 (더블: 왼쪽 열 아군 · 오른쪽 열 상대 / 윗줄 = 자신·정면, 아랫줄 = 아군·대각) ---------- */
const RANGE_MAP={'1체':'AFD1','자신':'S','상대 전체':'FD','자신 이외':'AFD','필드 전체':'SAFD','전체':'SAFD','정면':'F','자진':'SA','적진':'FD','아군 전체':'SA','아군':'A','대각':'D'};
function rangeGrid(v){v=String(v??'').trim();const m=RANGE_MAP[v]||'';const one=m.includes('1');
 const c=(k,lab,full)=>`<i class="${m.includes(k)?(one?'pick':'on'):''}${k==='S'?' me':''}" title="${full}">${lab}</i>`;
 return `<span class="rgrid" title="범위: ${esc(v||'-')}${one?' · 이 중 1체를 고름':''}${m?'':' · 그림 없음'}">${c('S','아군','자신')}${c('F','상대','정면의 상대')}${c('A','아군','옆의 아군')}${c('D','상대','대각선의 상대')}</span>`}

/* ---------- 공통 UI ---------- */
function toast(m){const t=$('#toast');t.textContent=m;t.classList.add('on');clearTimeout(toast.t);toast.t=setTimeout(()=>t.classList.remove('on'),1800)}
const layers=[];
function openModal(html,{wide=false,onClose}={}){const l=document.createElement('div');l.className='layer';l.innerHTML=`<div class="mbox ${wide?'wide':''}" role="dialog" aria-modal="true" tabindex="-1">${html}</div>`;
 const opener=document.activeElement;MKROOT().appendChild(l);document.documentElement.classList.add('modal-on');layers.push({l,onClose,opener});l.addEventListener('mousedown',e=>{if(e.target===l)closeModal()});
 setTimeout(()=>{const touch=matchMedia('(pointer:coarse)').matches;const f=$('[autofocus]',l)||(!touch&&$('input,textarea',l));if(f&&!(touch&&f.matches('input,textarea')))f.focus();else $('.mbox',l).focus()},30);return l}
function closeModal(){const o=layers.pop();if(!o)return;o.l.remove();if(!layers.length)document.documentElement.classList.remove('modal-on');o.onClose&&o.onClose();
 if(o.opener&&o.opener.isConnected&&!layers.length)try{o.opener.focus({preventScroll:true})}catch(e){}}
document.addEventListener('keydown',e=>{if(e.key!=='Escape')return;const m=$('.menu');if(m){m.remove();return}const tm=MTOP();if(tm&&tm.classList.contains('tools-open')){toolsOpen(false);return}if(layers.length)closeModal()});
/* 10-24 망령: 폴더 고르기 창 (cur = 지금 상위, skip = 이 폴더와 그 아래는 고를 수 없다). 돌려줌: 폴더 id · '' = 맨 위 · null = 취소 */
function askFolder(title,msg,cur,skip){return new Promise(res=>{const l=openModal(`<div class="mhead"><h2>${esc(title)}</h2></div><div class="mbody"><p class="small muted" style="margin:0 0 8px">${esc(msg)}</p><select data-af style="width:100%"><option value="">(맨 위 — 다른 폴더 밖)</option>${fTreeOpts(cur,skip)}</select></div><div class="mfoot"><span class="sp"></span><button class="btn ghost" data-x="no">취소</button><button class="btn pri" data-x="ok">옮기기</button></div>`);
 l.addEventListener('click',e=>{const x=e.target.closest('[data-x]');if(!x)return;const v=x.dataset.x==='ok'?$('[data-af]',l).value:null;closeModal();res(v)})})}
function ask(msg,okLabel='확인',danger=true){return new Promise(res=>{const l=openModal(`<div class="mhead"><h2>확인</h2></div><div class="mbody"><p style="margin:0">${msg}</p></div><div class="mfoot"><span class="sp"></span><button class="btn" data-x="no" ${danger?'autofocus':''}>취소</button><button class="btn ${danger?'acc':'pri'}" data-x="ok" ${danger?'':'autofocus'}>${okLabel}</button></div>`,{onClose:()=>res(false)});
 l.addEventListener('click',e=>{const x=e.target.dataset.x;if(!x)return;layers[layers.length-1].onClose=null;closeModal();res(x==='ok')})})}
async function copyStr(s){try{await navigator.clipboard.writeText(s);toast('복사했습니다')}catch(e){const l=openModal(`<div class="mhead"><h2>직접 복사</h2></div><div class="mbody"><p class="small muted" style="margin:0">자동 복사가 막혀 있습니다. 아래 내용을 선택해 복사하세요.</p><textarea rows="6" readonly>${esc(s)}</textarea></div><div class="mfoot"><span class="sp"></span><button class="btn" data-x>닫기</button></div>`);const ta=$('textarea',l);ta.select();l.addEventListener('click',e=>{if(e.target.dataset.x!=null)closeModal()})}}
async function saveFile(filename,data){
 try{if(window.claude&&claude.use){const d=await claude.use('downloads');if(d){await d.save({filename,data});return}}}catch(e){if(e&&e.code==='declined')return toast('저장을 취소했습니다');}
 try{const blob=data instanceof Blob?data:new Blob([data]);const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=filename;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(a.href),4000)}catch(e){toast('이 화면에서는 파일 저장을 할 수 없습니다')}}
function rich(s){return esc(brN(s)).replace(/\\n|\n/g,'<br>').replace(/【([^】]*)】/g,'<span class="tg">$1</span>')}
const banRe=()=>{try{return S.db.ban?new RegExp(S.db.ban):null}catch(e){return null}};
function banHits(s){const re=banRe();if(!re||!s)return [];const g=new RegExp(re.source,'g');return [...new Set(String(s).match(g)||[])]}
/* 금지어 목록 ↔ S.db.ban 정규식 (10-23 망령: 표 탭 「금지어」 칸에서 보기 · 추가 · 고치기 · 지우기).
   한 단어 = 글자 그대로 (괄호 · 점도 글자). \ [ * + ? { 가 들어간 것만 정규식 조각으로 그대로 둔다 */
const BAN_RAW=/\\|\[|[*+?{]/;
function banSplit(src){const out=[];let cur='',bs=false,depth=0;for(const ch of String(src||'')){if(bs){cur+='\\'+ch;bs=false;continue}if(ch==='\\'){bs=true;continue}if(ch==='['||ch==='(')depth++;if(ch===']'||ch===')')depth=Math.max(0,depth-1);if(ch==='|'&&!depth){out.push(cur);cur='';continue}cur+=ch}out.push(cur);
 return out.map(w=>w.trim()).filter(Boolean).map(w=>{const plain=w.replace(/\\([^A-Za-z0-9])/g,'$1');return BAN_RAW.test(plain)||/\\[A-Za-z0-9]/.test(w)?{w,raw:true}:{w:plain}})}
function banJoin(list){const seen=new Set();return list.filter(x=>x&&x.w&&!seen.has(x.w)&&seen.add(x.w)).map(x=>x.raw?x.w:x.w.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')).join('|')}
function banList(){return banSplit(S.db.ban)}
function banSet(list){S.db.ban=banJoin(list);save(true)}
function banMark(s){const re=banRe();if(!re||!s)return esc(s||'');const g=new RegExp(re.source,'g');let out='',i=0;for(const m of String(s).matchAll(g)){if(!m[0]){g.lastIndex++;continue}out+=esc(s.slice(i,m.index))+'<mark>'+esc(m[0])+'</mark>';i=m.index+m[0].length}return out+esc(s.slice(i))}
/* 저장된 캐릭터 전체에서 금지어 찾기: 포켓몬 포텐셜 · 전용 · 트레이너 고유 */
function banScan(){const rows=[];for(const t of S.trainers){const tn=t.name||'(이름 없는 트레이너)';
  (t.unique||[]).forEach((u,i)=>{if(u&&u.eff){const h=banHits(u.eff);if(h.length)rows.push({t:tn,p:'트레이너 고유',n:u.name||('고유 '+(i+1)),h,eff:u.eff})}});
  for(const p of t.pokemon||[]){const pn=p.name||p.species||'(포켓몬)';(p.pots||[]).forEach((n,i)=>{if(!n)return;const e=potEffOf(p,i);const h=banHits(e);if(h.length)rows.push({t:tn,p:pn,n,h,eff:e})});
   for(const x of [p.excl,...(p.exclX||[])])if(x&&x.eff){const h=banHits(x.eff);if(h.length)rows.push({t:tn,p:pn,n:(x.name||'전용')+' (전용)',h,eff:x.eff})}}}
 return rows}
let BANQ='',BANED=-1;
function banBoxHTML(){const L=banList();const q=BANQ.trim();const vis=L.map((x,i)=>[x,i]).filter(([x])=>!q||x.w.includes(q));
 return `<h3>금지어 <span class="small muted" style="font-weight:400">${L.length}개 · 포텐셜 효과 글에 들어가면 편집 창과 슬롯에 경고</span><span class="sp"></span><button class="btn sm ghost" data-bw="reset">기본값으로</button></h3>
  <div class="row" style="gap:6px;flex-wrap:wrap;margin-bottom:8px"><input type="text" id="banNew" placeholder="새 금지어 — 여러 개는 쉼표(,)나 줄바꿈으로" style="flex:1;min-width:220px"><button class="btn sm pri" data-bw="add">추가</button><input type="search" id="banQ" value="${esc(BANQ)}" placeholder="목록에서 찾기" style="width:160px"></div>
  <div class="banlist">${vis.map(([x,i])=>i===BANED?`<span class="banw ed"><input type="text" id="banEd" value="${esc(x.w)}" data-i="${i}"><button class="btn xs pri" data-bw="edok" data-i="${i}">확인</button><button class="btn xs ghost" data-bw="edx">취소</button></span>`:`<span class="banw ${x.raw?'raw':''}" title="${x.raw?'정규식 조각 — 글자 그대로가 아니다':'눌러서 고치기'}"><b data-bw="ed" data-i="${i}">${esc(x.w)}</b><button class="bx" data-bw="del" data-i="${i}" aria-label="지우기">✕</button></span>`).join('')||`<span class="small muted">${q?'찾는 금지어가 없습니다':'금지어가 없습니다'}</span>`}</div>
  <div class="cgrid" style="margin-top:10px"><div><label class="lbl">문구로 확인하기<textarea id="banTest" rows="3" placeholder="효과 글을 붙여 넣으면 걸리는 표현에 표시가 붙습니다"></textarea></label><div id="banTestOut" class="small" style="margin-top:4px"></div></div>
   <div><div class="row" style="gap:6px"><b class="small">내 캐릭터에서 찾기</b><span class="sp"></span><button class="btn sm" data-bw="scan">찾기</button></div><div id="banScanOut" class="small muted" style="margin-top:4px">저장된 트레이너 · 포켓몬의 포텐셜 · 전용 · 고유 효과 글을 훑습니다.</div></div></div>
  <details style="margin-top:8px"><summary class="small">고급: 정규식 그대로 고치기</summary><textarea data-p="db.ban" id="banRawTa" rows="4" class="mono" style="font-size:12px;width:100%">${esc(S.db.ban)}</textarea><div class="small muted">| 로 나눈 정규식입니다. 위 목록에서 고치면 괄호 · 점 같은 글자는 알아서 글자 그대로 처리됩니다.</div></details>`}
function banRefresh(keepFocus){const b=$('#banBox');if(!b)return;b.innerHTML=banBoxHTML();if(keepFocus){const q=$('#banQ');if(q){q.focus();q.setSelectionRange(q.value.length,q.value.length)}}const e=$('#banEd');if(e){e.focus();e.select()}}

/* ---------- 태그 툴바 ---------- */
function tagbarHTML(){return `<div class="tagbar" data-tagbar>${S.db.tags.map((t,i)=>`<button type="button" data-tagi="${i}" title="${esc(t[1])}">【${esc(t[0])}】${t[2]?' ▾':''}</button>`).join('')}<span class="sep"></span>
 <button type="button" data-ins="/" title="태그와 본문 구분">/</button><button type="button" data-ins="「」" title="용어 괄호">「」</button><button type="button" data-ins="『』" title="포텐셜 괄호">『』</button><button type="button" data-ins="\n①" title="효과 번호">①</button><button type="button" data-ins="\n②">②</button><button type="button" data-ins="\n③">③</button><span class="sep"></span><button type="button" data-tagfix title="줄 앞의 태그를 규칙 순서로 정렬하고 빠진 「/」를 보충합니다">태그 순서 정리</button></div><div class="taghelp" data-taghelp>태그를 누르면 커서 위치에 들어가고, 여기에 그 태그의 설명이 나옵니다.</div>`}
function insertAt(ta,s){if(!ta)return;const a=ta.selectionStart??ta.value.length,b=ta.selectionEnd??a;
 let ins=s;if(s==='「」'||s==='『』'){ins=s[0]+ta.value.slice(a,b)+s[1]}
 ta.value=ta.value.slice(0,a)+ins+ta.value.slice(b);const pos=(s==='「」'||s==='『』')&&a===b?a+1:a+ins.length;ta.focus();ta.setSelectionRange(pos,pos);ta.dispatchEvent(new Event('input',{bubbles:true}))}
function bindTagbar(root,getTa){
 root.addEventListener('mouseover',e=>{const b=e.target.closest('[data-tagi]');if(b){const h=$('[data-taghelp]',root);if(h)h.innerHTML=`<span class="tg">${esc(S.db.tags[+b.dataset.tagi][0])}</span> ${esc(S.db.tags[+b.dataset.tagi][1])}`}});
 root.addEventListener('mousedown',e=>{if(e.target.closest('[data-tagi],[data-ins],[data-tagfix]'))e.preventDefault()});
 root.addEventListener('click',e=>{const b=e.target.closest('[data-tagi],[data-ins],[data-tagfix]');if(!b)return;const ta=getTa();
  if(b.dataset.tagfix!=null){if(!ta)return;const v=tagFix(ta.value);if(v!==ta.value){ta.value=v;ta.dispatchEvent(new Event('input',{bubbles:true}));toast('태그 순서를 정리했습니다')}else toast('고칠 태그가 없습니다');return}
  if(b.dataset.ins!=null)return insertAt(ta,b.dataset.ins);const t=S.db.tags[+b.dataset.tagi];{const h=$('[data-taghelp]',root);if(h)h.innerHTML=`<span class="tg">${esc(t[0])}</span> ${esc(t[1])}`}
  if(!t[2])return insertAt(ta,'【'+t[0]+'】');
  $$('.menu').forEach(m=>m.remove());const m=document.createElement('div');m.className='menu';m.innerHTML=t[2].split('|').map(v=>`<button type="button" data-v="${esc(v)}">【${esc(v)}】</button>`).join('');
  MKROOT().appendChild(m);const r=b.getBoundingClientRect();m.style.left=Math.min(r.left,innerWidth-190)+'px';m.style.top=(r.bottom+4)+'px';
  m.addEventListener('mousedown',ev=>ev.preventDefault());
  m.addEventListener('click',ev=>{const v=ev.target.dataset.v;if(v!=null){insertAt(ta,'【'+v+'】');m.remove()}});
  setTimeout(()=>document.addEventListener('click',function off(ev){if(!m.contains(ev.target)){m.remove();document.removeEventListener('click',off)}}),0)})}

/* 태그 순서 규칙: 태그는 연속해서 쓰고 마지막에 「/」, 순서는 태그 사전 순 */
function tagOrderIdx(tag){const tags=S.db.tags.map(t=>t[0]);let i=tags.indexOf(tag);if(i>=0)return i;
 if(/^(\d+|N)\s*\/\s*시$/.test(tag))return tags.indexOf('N/시');
 if(/^(지시|육성|통솔|능력)\s*:/.test(tag))return tags.indexOf('자질');
 return tags.indexOf(tag.replace(/\s*\(.*$/,'').trim())}
const LINE_RE=/^(\s*[①-⑳]?\s*)((?:【[^】]*】\s*)+)([\s\S]*)$/;
function lineTags(m){return [...m[2].matchAll(/【([^】]*)】/g)].map(x=>x[1].trim())}
function tagLint(s){const msg=[];String(s||'').split('\n').forEach((ln,n)=>{const m=ln.match(LINE_RE);if(!m)return;const tags=lineTags(m);
 const ix=tags.map(tagOrderIdx);const unk=tags.filter((t,i)=>ix[i]<0);const L=(String(s).includes('\n')?(n+1)+'줄: ':'');
 if(unk.length)msg.push(L+'사전에 없는 태그 '+unk.map(t=>'【'+t+'】').join(''));
 const known=ix.filter(i=>i>=0);if(known.some((v,i)=>i&&v<known[i-1]))msg.push(L+'태그 순서가 규칙과 다릅니다');
 if(m[3].trim()&&!m[3].startsWith('/'))msg.push(L+'태그 뒤에 「/」가 없습니다')});return msg}
function tagFix(s){return String(s||'').split('\n').map(ln=>{const m=ln.match(LINE_RE);if(!m)return ln;
 const sorted=lineTags(m).map((t,i)=>({t,i,k:tagOrderIdx(t)})).sort((a,b)=>((a.k<0?999:a.k)-(b.k<0?999:b.k))||a.i-b.i).map(x=>'【'+x.t+'】').join('');
 let rest=m[3];if(rest.trim()&&!rest.startsWith('/'))rest='/'+rest.replace(/^\s+/,'');return m[1]+sorted+rest}).join('\n')}
function lintHTML(s){const l=tagLint(s);return l.length?`<div class="taglint">${l.map(esc).join('<br>')} · 「태그 순서 정리」 버튼으로 고칠 수 있습니다</div>`:''}

/* ---------- DB 검색 피커 ---------- */
function rowHTML(kind,r,sel){const D=DBS[kind];
 if(kind==='moves')return `<div tabindex="0" role="button" data-kbd class="pkr ${sel?'sel':''}" data-pick="${esc(r[2])}"><div><div class="t1">${tchip(r[5])}<b>${esc(r[2])}</b><span class="kindb">${esc(r[6])}</span>${S.custom.moves.includes(r[2])?'<span class="kindb">오리지널</span>':''}${mvOldOnly(r)?'<span class="kindb">올드 전용</span>':''}</div><div class="t2">${rich(r[13])}</div></div><div class="meta">${rangeGrid(r[9])}<span>위력 ${esc(r[7])} · 명중 ${esc(r[8])}</span><span>${esc(r[9])} · 우선도 ${esc(r[11])} · 소켓 <b>${esc(r[0])}</b></span></div></div>`;
 if(kind==='abil')return `<div tabindex="0" role="button" data-kbd class="pkr ${sel?'sel':''}" data-pick="${esc(r[1])}"><div><div class="t1"><b>${esc(r[1])}</b>${r[3]==='O'?'<span class="kindb">틀깨기 대상</span>':''}${r[4]==='O'?'<span class="kindb">방호</span>':''}${fxRmChip('trait',r[1])}</div><div class="t2">${rich(r[2])}</div></div><div class="meta">소켓 <b>${esc(r[0])}</b></div></div>`;
 if(kind==='items')return `<div tabindex="0" role="button" data-kbd class="pkr ${sel?'sel':''}" data-pick="${esc(r[1])}"><div><div class="t1"><b>${esc(r[1])}</b><span class="kindb">${esc(r[0])}</span>${r[3]==='O'?'<span class="kindb">소모</span>':''}${ilockChip(r[1])}${fxRmChip('item',r[1])}</div><div class="t2">${rich(r[4])}${r[6]&&r[6]!=='-'?` <span class="faint">· ${esc(r[6])}</span>`:''}</div></div><div class="meta">소켓 <b>${esc(r[5])}</b></div></div>`;
 if(kind==='old'){const tot=r.slice(11,17).reduce((a,b)=>a+(+b||0),0);return `<div tabindex="0" role="button" data-kbd class="pkr ${sel?'sel':''}" data-pick="${esc(r[1])}"><div><div class="t1">${tchip(r[3])}${tchip(r[4])}<b>${esc(r[1])}</b>${r[10]==='O'?'<span class="kindb">메가</span>':''}<span class="kindb">${esc(r[0])}</span></div><div class="t2">${[r[5],r[6],r[7]].filter(a=>a&&a!=='-').map(esc).join(' / ')} · 알그룹 ${esc(r[8])}${r[9]&&r[9]!=='-'?' / '+esc(r[9]):''} <span class="faint">${esc(r[2])}</span></div></div><div class="meta num"><span>${r.slice(11,17).map(esc).join('-')}</span><span>합 <b>${tot}</b>${String(r[17]??'').trim()?` · 프라이드 <b>${esc(r[17])}</b>`:''}</span></div></div>`}
 if(kind==='points')return `<div tabindex="0" role="button" data-kbd class="pkr" data-pick="${esc(r[4])}"><div><div class="t1"><b>${esc(r[4])}</b><span class="kindb">${esc(r[1])}</span></div><div class="t2">${esc(r[5])}</div></div><div class="meta">${esc(r[3])} −${esc(r[6])}</div></div>`;
 return `<div tabindex="0" role="button" data-kbd class="pkr ${sel?'sel':''}" data-pick="${esc(r[1])}"><div><div class="t1"><span class="kindb">${esc(r[0])}</span><b>${esc(r[1])}</b>${kind==='pots'?fxRmChip('pot',r[1]):''}</div><div class="t2">${rich(r[2])}${r[3]?` <span class="faint">· ${esc(r[3])}</span>`:''}</div></div><div class="meta"></div></div>`}
/* ---------- 소지품 해금 표: [장소, 품목(쉼표), 조건 메모, '열림'|'잠김'] ---------- */
function ilockMap(){const mp=new Map();for(const r of S.db.ilock||[]){if(!r)continue;for(const n of String(r[1]||'').split(/[,，·]/).map(x=>x.trim()).filter(Boolean))mp.set(n,{place:String(r[0]||''),cond:String(r[2]||''),open:r[3]==='열림'})}return mp}
const ilockOf=n=>n?ilockMap().get(String(n).trim())||null:null;
const ilockChip=n=>{const l=ilockOf(n);return l?`<span class="kindb ${l.open?'lk-open':'lk-lock'}" title="${esc(l.cond||'')}">${l.open?'열림':'잠김'} · ${esc(l.place)}</span>`:''};
/* ---------- DB 필터 ---------- */
const numOf=v=>(String(v??'').match(/-?\d+(\.\d+)?/g)||[]).map(Number);
const splitTags=v=>String(v||'').split(/[,，/]/).map(x=>x.trim()).filter(x=>x&&x!=='-');
const hashTags=v=>String(v||'').match(/#[^\s,#]+/g)||[];
const abTags=v=>[...new Set((String(v||'').match(/【[^】]*】/g)||[]).map(x=>x.slice(1,-1).replace(/\s*\(.*$/,'').replace(/^\d+\s*\/\s*시$/,'N/시').trim()))];
const potGroup=k=>String(k||'').replace(/^\d+(\.\d+)*\.\s*/,'').trim()||'-';
const potGroupCode=k=>{const m=String(k||'').match(/^(\d+)/);return m?+m[1]:9999};
const FILT={
 moves:[{id:'sock',label:'소켓',get:r=>[r[0]],sort:'num'},{id:'acc',label:'명중',get:r=>[r[8]],sort:'numd'},{id:'prio',label:'우선도',get:r=>[r[11]],sort:'num',extra:[['>0','＋ 선공 (1 이상)'],['<0','－ 후공 (-1 이하)']]},
  {id:'tagc',label:'분류 태그',get:r=>splitTags(r[12]),sort:'cnt'},{id:'htag',label:'# 태그',get:r=>hashTags(r[1]),sort:'cnt'},{id:'rng',label:'범위',get:r=>[String(r[9]).trim()],sort:'cnt'},{id:'con',label:'접촉',get:r=>[r[10]],sort:'cnt'}],
 abil:[{id:'sock',label:'소켓',get:r=>[r[0]],sort:'num'},{id:'tag',label:'태그',get:r=>abTags(r[2]),sort:'cnt',none:'태그 없음'},{id:'brk',label:'틀깨기 대상',get:r=>[r[3]],sort:'cnt'},{id:'prot',label:'방호 특성',get:r=>[r[4]],sort:'cnt'}],
 pots:[{id:'grp',label:'큰 종류',get:r=>[potGroup(r[0])],sort:'code'}],
 items:[{id:'sock',label:'소켓',get:r=>[r[5]],sort:'num'},{id:'cons',label:'소모',get:r=>[r[3]],sort:'cnt'},{id:'lock',label:'해금',get:r=>{const l=ilockOf(r[1]);return [l?(l.open?'특제 · 열림':'특제 · 잠김'):'기본']},sort:'cnt',when:()=>(S.db.ilock||[]).length>0},{id:'place',label:'장소',get:r=>{const l=ilockOf(r[1]);return l?[l.place]:[]},sort:'cnt',none:'기본 (장소 없음)',when:()=>(S.db.ilock||[]).length>0}],
 old:[{id:'mega',label:'메가',get:r=>[r[10]==='O'?'메가진화':'일반'],sort:'cnt'},{id:'t',label:'타입',get:r=>[r[3],r[4]].filter(x=>x&&x!=='-'),sort:'cnt'},{id:'egg',label:'알그룹',get:r=>[r[8],r[9]].filter(x=>x&&x!=='-'),sort:'cnt'}]};
function xfOptions(kind,F){const cnt=new Map(),code=new Map();
 for(const r of S.db[kind]){if(r[DBS[kind].key]==='')continue;const vs=F.get(r);if(!vs.length&&F.none)cnt.set('∅',(cnt.get('∅')||0)+1);
  for(const v of vs){if(v===''||v==null)continue;cnt.set(v,(cnt.get(v)||0)+1);if(F.sort==='code'){const c=potGroupCode(r[0]);code.set(v,Math.min(code.get(v)??9999,c))}}}
 const ks=[...cnt.keys()];const n=v=>{const x=numOf(v);return x.length?x[0]:1e9};
 if(F.sort==='num')ks.sort((a,b)=>n(a)-n(b)||KO.compare(a,b));else if(F.sort==='numd')ks.sort((a,b)=>n(b)-n(a));else if(F.sort==='code')ks.sort((a,b)=>(code.get(a)-code.get(b))||KO.compare(a,b));else ks.sort((a,b)=>cnt.get(b)-cnt.get(a));
 return ks.map(k=>[k,(k==='∅'?F.none:k==='0'&&F.id==='acc'?'0 (필중·변화)':k)+` (${cnt.get(k)})`])}
function xfActive(kind,st){return (FILT[kind]||[]).some(F=>st.f&&st.f[F.id])||(kind==='moves'&&(st.pmin!==''&&st.pmin!=null||st.pmax!==''&&st.pmax!=null))}
function xfHTML(kind,st){st.f=st.f||{};const F=(FILT[kind]||[]).filter(x=>!x.when||x.when());
 return F.map(x=>`<select data-xf="${x.id}" title="${esc(x.label)}" class="${st.f[x.id]?'xfon':''}"><option value="">${esc(x.label)}: 전체</option>${(x.extra||[]).map(([v,l])=>`<option value="${esc(v)}" ${st.f[x.id]===v?'selected':''}>${esc(x.label+': '+l)}</option>`).join('')}${xfOptions(kind,x).map(([v,l])=>`<option value="${esc(v)}" ${st.f[x.id]===v?'selected':''}>${esc(x.label+': '+l)}</option>`).join('')}</select>`).join('')
 +(kind==='moves'?`<span class="row small xfpow" style="gap:4px;flex-wrap:nowrap">위력<input data-pr="pmin" inputmode="numeric" value="${esc(st.pmin??'')}" placeholder="최소" style="width:58px">~<input data-pr="pmax" inputmode="numeric" value="${esc(st.pmax??'')}" placeholder="최대" style="width:58px"></span>`:'')
 +(xfActive(kind,st)?`<button type="button" class="btn sm ghost" data-xfreset>필터 초기화</button>`:'')}
function filterRows(kind,st){const D=DBS[kind];const q=String(st.q||'').trim().toLowerCase();const F=(FILT[kind]||[]).filter(x=>st.f&&st.f[x.id]);
 const pmin=st.pmin!==''&&st.pmin!=null&&!isNaN(+st.pmin)?+st.pmin:null,pmax=st.pmax!==''&&st.pmax!=null&&!isNaN(+st.pmax)?+st.pmax:null;
 return S.db[kind].filter(r=>{if(r[D.key]==='')return false;
  if(st.hideOrig&&!st.orig&&!st.mine&&S.custom[kind].includes(r[D.key])&&!(st.has&&st.has(r[D.key])))return false;   /* 10-26 망령: 포켓몬 만들 때 특성 목록엔 오리지널을 「오리지널 보기」를 눌러야 보인다 · 10-27 기술도 같게 (이미 든 기술은 보인다) */
  if(kind==='moves'&&st.hideOldOnly&&!st.oldShow&&mvOldOnly(r)&&!(st.has&&st.has(r[2])))return false;   /* 10-27 망령: 올드 타입이 아닌 포켓몬에겐 올드 타입 전용 기술을 숨긴다 */
  if(st.type&&kind==='moves'&&!String(r[5]).startsWith(st.type))return false;
  if(st.cat&&kind==='moves'&&r[6]!==st.cat)return false;
  if(st.kind&&(kind==='pots'||kind==='items'||kind==='old')&&r[0]!==st.kind)return false;
  for(const x of F){const v=st.f[x.id];
   if(x.id==='prio'&&(v==='>0'||v==='<0')){const ns=numOf(r[11]);if(!ns.some(n=>v==='>0'?n>0:n<0))return false;continue}
   const vs=x.get(r);if(v==='∅'){if(vs.length)return false;continue}if(!vs.includes(v))return false}
  if(kind==='moves'&&(pmin!=null||pmax!=null)){const ns=numOf(r[7]);if(!ns.length)return false;const lo=Math.min(...ns),hi=Math.max(...ns);if(pmin!=null&&hi<pmin)return false;if(pmax!=null&&lo>pmax)return false}
  if(st.mine&&!S.custom[kind].includes(r[D.key]))return false;
  if(!q)return true;
  if(st.nameOnly)return String(r[D.key]).toLowerCase().includes(q);
  return r.join(' ').toLowerCase().includes(q)})}
function kindSelect(kind,st,attr){const ks=[...new Set(S.db[kind].map(r=>r[0]))].filter(x=>x!=='');
 const g=kind==='pots'&&st.f&&st.f.grp?ks.filter(k=>potGroup(k)===st.f.grp):ks;
 return `<select ${attr} style="max-width:240px"><option value="">${kind==='old'?'모든 지역':kind==='pots'?'세부 종류: 전체':'모든 종류'}</option>${g.map(k=>`<option value="${esc(k)}" ${st.kind===k?'selected':''}>${esc(k)}</option>`).join('')}</select>`}
function pickerFilters(kind,st){const chk=`<label class="row small"><input type="checkbox" data-fn ${st.nameOnly?'checked':''}>이름만 검색</label><label class="row small"><input type="checkbox" data-fm ${st.mine?'checked':''}>오리지널만</label>`;
 if(kind==='moves')return `<div class="tchips">${S.db.types.filter(t=>!['-','와일드','다크'].includes(t[0])).map(t=>`<button type="button" data-ft="${esc(t[0])}" class="${st.type===t[0]?'on':''}" style="background:${safeCss(t[1])};color:${safeCss(t[2])}">${esc(t[0])}</button>`).join('')}</div>
  <div class="row xfrow"><select data-fc><option value="">분류: 전체</option>${['물리','특수','변화'].map(c=>`<option ${st.cat===c?'selected':''}>${c}</option>`).join('')}</select>${xfHTML(kind,st)}</div><div class="row">${chk}</div>`;
 if(kind==='pots'||kind==='items'||kind==='old')return `<div class="row xfrow">${kind==='pots'?xfHTML(kind,st)+kindSelect(kind,st,'data-fk'):kindSelect(kind,st,'data-fk')+xfHTML(kind,st)}${chk}</div>`;
 return `<div class="row xfrow">${xfHTML(kind,st)}${chk}</div>`}
function mountPicker(root,kind,st,{chosen,onPick}){
 const draw=()=>{const rows=filterRows(kind,st);const ch=chosen?chosen():new Set();
  keepFocus(root,()=>{$('[data-pkfilters]',root).innerHTML=pickerFilters(kind,st)});const fc=fCount(kind,st);const fb=$('[data-pkfn]',root);if(fb)fb.textContent=fc?' '+fc:'';
  $('[data-pkcount]',root).textContent=`${rows.length}건`;
  $('[data-pkrows]',root).innerHTML=rows.slice(0,st.lim).map(r=>rowHTML(kind,r,ch.has(r[DBS[kind].key]))).join('')+(rows.length>st.lim?`<button type="button" class="btn ghost" data-more style="margin:6px">더 보기 (${rows.length-st.lim}건 남음)</button>`:'')+(rows.length?'':'<div class="empty" style="border:0">검색 결과가 없습니다. 아래에서 오리지널로 직접 만들 수 있습니다.</div>')};
 root.addEventListener('input',e=>{if(e.target.matches('[data-pkq]')){st.q=e.target.value;st.lim=120;clearTimeout(st.t);st.t=setTimeout(draw,120)}else if(e.target.matches('[data-pr]')){st[e.target.dataset.pr]=e.target.value.trim();st.lim=120;clearTimeout(st.t);st.t=setTimeout(draw,300)}});
 root.addEventListener('change',e=>{const t=e.target;if(t.matches('[data-fc]'))st.cat=t.value;else if(t.matches('[data-fk]'))st.kind=t.value;else if(t.matches('[data-fn]'))st.nameOnly=t.checked;else if(t.matches('[data-fm]'))st.mine=t.checked;else if(t.matches('[data-xf]')){st.f=st.f||{};st.f[t.dataset.xf]=t.value;if(t.dataset.xf==='grp')st.kind=''}else if(t.matches('[data-pr]'))st[t.dataset.pr]=t.value.trim();else return;st.lim=120;draw()});
 root.addEventListener('click',e=>{const ft=e.target.closest('[data-ft]');if(ft){st.type=st.type===ft.dataset.ft?'':ft.dataset.ft;draw();return}
  const tg=e.target.closest('[data-pkftog]');if(tg){const w=$('[data-pkfwrap]',root);const on=!w.classList.contains('on');w.classList.toggle('on',on);tg.setAttribute('aria-expanded',on);return}
  const oo=e.target.closest('[data-pkold]');if(oo){st.oldShow=!st.oldShow;oo.classList.toggle('on',st.oldShow);oo.setAttribute('aria-pressed',st.oldShow?'true':'false');st.lim=120;draw();return}
  const og=e.target.closest('[data-pkorig]');if(og){st.orig=!st.orig;og.classList.toggle('on',st.orig);og.setAttribute('aria-pressed',st.orig?'true':'false');st.lim=120;draw();return}
  if(e.target.closest('[data-more]')){st.lim+=200;draw();return}
  if(e.target.closest('[data-xfreset]')){st.f={};st.pmin='';st.pmax='';st.kind='';st.cat='';st.type='';draw();return}
  const r=e.target.closest('[data-pick]');if(r){onPick(r.dataset.pick);draw()}});
 draw();return draw}
function pickerShell(kind,st){return `<div class="row pkhead"><input data-pkq type="search" enterkeyhint="search" placeholder="${DBS[kind].t} 이름·효과 검색" value="${esc(st.q)}" style="flex:1" autofocus><span class="small muted" data-pkcount></span>${st.hideOrig?`<button type="button" class="btn sm ftog${st.orig?' on':''}" data-pkorig aria-pressed="${st.orig?'true':'false'}" title="오리지널 ${DBS[kind].t}도 목록에 보이기">오리지널 보기</button>`:''}${st.hideOldOnly?`<button type="button" class="btn sm ftog${st.oldShow?' on':''}" data-pkold aria-pressed="${st.oldShow?'true':'false'}" title="『올드 타입』 전용 기술도 목록에 보이기 (이 포켓몬은 올드 타입 계열이 아님)">올드 전용 보기</button>`:''}<button type="button" class="btn sm ftog" data-pkftog aria-expanded="false">필터<b class="fn" data-pkfn></b></button></div><div class="fwrap" data-pkfwrap><div data-pkfilters></div></div><div class="pkrows" data-pkrows></div>`}
/* 필터를 다시 그려도 쓰던 칸에 초점과 커서를 돌려놓는다 */
function keepFocus(root,fn){const a=document.activeElement;let key=null,ss=null,se=null;
 if(a&&root.contains(a)){for(const at of ['data-xf','data-pr','data-fc','data-fk','data-fn','data-fm','data-ft','data-pkq'])if(a.hasAttribute(at)){key=`[${at}${a.getAttribute(at)?`="${CSS.escape(a.getAttribute(at))}"`:''}]`;break}
  if(!key&&a.id)key='#'+CSS.escape(a.id);try{ss=a.selectionStart;se=a.selectionEnd}catch(e){}}
 fn();if(!key)return;const n=root.querySelector(key);if(n&&n!==document.activeElement){n.focus({preventScroll:true});try{if(ss!=null)n.setSelectionRange(ss,se)}catch(e){}}}
function fCount(kind,st){let n=Object.values(st.f||{}).filter(Boolean).length;for(const k of ['type','cat','kind'])if(st[k])n++;if(st.pmin!==''&&st.pmin!=null)n++;if(st.pmax!==''&&st.pmax!=null)n++;if(st.mine)n++;return n}
function openPicker(kind,{title,multi,chosen,onPick,onRemove,onOrig,hideOrig=kind==='abil'||kind==='moves',hideOldOnly=false}={}){
 const st={q:'',lim:120,type:'',cat:'',kind:'',mine:false,nameOnly:false,f:{},pmin:'',pmax:'',hideOrig,orig:false,hideOldOnly,oldShow:false,has:chosen?n=>chosen().has(n):null};
 const l=openModal(`<div class="mhead"><h2>${esc(title||DBS[kind].t+' 선택')}</h2><span class="sp"></span><button class="btn ghost" data-x>닫기</button></div>
  <div class="mbody">${pickerShell(kind,st)}${multi?'<p class="small muted" style="margin:0">클릭하면 추가되고, 이미 추가된 항목(파란색)을 다시 누르면 빠집니다. 창은 닫기 전까지 열려 있습니다.</p>':''}</div>
  <div class="mfoot"><button class="btn" data-orig>+ 오리지널 ${DBS[kind].t} 만들기</button><span class="sp"></span><button class="btn pri" data-x>${multi?'완료':'닫기'}</button></div>`,{wide:true});
 const redraw=mountPicker(l,kind,st,{chosen,onPick:n=>{if(multi&&chosen&&chosen().has(n)&&onRemove)onRemove(n);else onPick(n);if(!multi)closeModal()}});
 l.addEventListener('click',e=>{if(e.target.closest('[data-x]'))closeModal();
  if(e.target.closest('[data-orig]')&&onOrig)return onOrig(st.q);
  if(e.target.closest('[data-orig]'))openEdit(kind,-1,{preset:{[DBS[kind].key]:st.q},onSaved:n=>{onPick(n);if(multi)redraw();else closeModal()}})})}

/* ---------- DB 항목 편집 ---------- */
const IR_HELP=`전용 피카츄/라이츄 · 소모품
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
const CARD_PAL=[['red','#c8504a','빨강'],['orange','#d9822b','주황'],['gold','#b8932a','금색'],['green','#4f9a5a','초록'],['teal','#2f948f','청록'],['blue','#4573c4','파랑'],['purple','#8a5cc4','보라'],['pink','#c45c9a','분홍'],['gray','#6b7286','회색'],['black','#30343f','검정']];
const cardCol=v=>{v=String(v||'').trim();const p=CARD_PAL.find(x=>x[0]===v||x[2]===v);return p?p[1]:(safeCss(v)||'#6b7286')};
const cardImg=v=>{v=String(v||'').trim();return /^https?:\/\//.test(v)||/^data:image\//.test(v)?v:''};
function fieldHTML(kind,n,v){const c=DBS[kind].cols[n];const id=`f-${kind}-${n}`;
 if(kind==='cards'&&n===5)return `<label class="lbl" for="${id}">${c}<select id="${id}" data-f="${n}">${CARD_PAL.map(p=>`<option value="${p[0]}" ${p[0]===v||p[2]===v?'selected':''}>${p[2]}</option>`).join('')}</select></label>`;
 if(kind==='cards'&&n===6)return `<label class="lbl" for="${id}" style="grid-column:1/-1">${c} <span class="small muted">그림 파일을 고르면 세로 720px 로 줄여 공유 저장소에 올리고 주소를 넣습니다 · 세로 5:7 카드 그림이 잘 맞아요</span><span class="row" style="gap:8px;flex-wrap:nowrap;align-items:center"><img data-cardimg alt="" src="${esc(cardImg(v))}" style="width:56px;height:78px;object-fit:cover;border-radius:6px;border:1px solid var(--line,#ddd);${cardImg(v)?'':'visibility:hidden'}"><input id="${id}" data-f="${n}" value="${esc(v??'')}" placeholder="https://… 또는 그림 올리기" style="flex:1;min-width:0"><button type="button" class="btn sm" data-cardimgpick>그림 올리기</button><input type="file" accept="image/*" data-cardimgf hidden></span></label>`;
 if(kind==='cards'&&(n===0||n===2)){const L=[...new Set(S.db.cards.map(r=>r[n]).filter(Boolean))];return `<label class="lbl" for="${id}">${c}<input id="${id}" data-f="${n}" value="${esc(v??'')}" list="L-card${n}" ${n===0?'placeholder="예) 은열쇠"':'placeholder="예) 행동"'}><datalist id="L-card${n}">${L.map(x=>`<option value="${esc(x)}">`).join('')}</datalist></label>`}
 if(kind==='cards'&&n===9)return `<label class="lbl" for="${id}" style="grid-column:1/-1">${c} <span class="small muted">오레마스 배틀에서 이 카드를 쓰면 도는 구문 (SP · 포텐셜과 같은 꼴) · 비우면 효과 글만 로그에</span><textarea id="${id}" data-f="${n}" rows="3" style="font-family:var(--mono,monospace);font-size:12.5px" placeholder="예) 회복 1/4 아군1체 · 랭크 공격+1 임시 자신">${esc(v||'')}</textarea><span class="small" data-cardauto style="white-space:pre-wrap"></span></label>`;
 if(kind==='items'&&n===7)return `<label class="lbl" for="${id}" style="grid-column:1/-1">${c} <span class="small muted">오레마스 배틀이 이 소지품을 자동으로 처리하는 법 · 한 줄에 하나 · 비우면 효과 글을 읽는다</span><textarea id="${id}" data-f="${n}" rows="4" style="font-family:var(--mono,monospace);font-size:12.5px" placeholder="예) 공격 강화 타입 불꽃 ×1.2">${esc(v||'')}</textarea><span class="row" style="gap:6px;align-items:center;flex-wrap:wrap"><button type="button" class="btn sm" data-irgen>효과 글에서 만들기</button><span class="small" data-irprev></span></span><details><summary class="small">구문 도움말</summary><pre class="small" style="white-space:pre-wrap">${esc(IR_HELP)}</pre></details></label>`;
 if(kind==='rm'&&n===2)return `<label class="lbl" for="${id}" style="grid-column:1/-1">${c} <span class="small muted">한 줄에 명령 하나 · 오레마스 자동화</span><textarea id="${id}" data-f="${n}" rows="5" style="font-family:var(--mono,monospace);font-size:12.5px">${esc(v||'')}</textarea><span class="small" data-rmprev></span><details><summary class="small">구문 도움말</summary><pre class="small" style="white-space:pre-wrap">${esc(typeof AUTO_HELP==='string'?AUTO_HELP:'')}</pre></details></label>`;
 if(kind==='st'&&n===12)return `<label class="lbl" for="${id}" style="grid-column:span 2">${c} <span class="small muted">파일 이름(오레마스 img/state) 또는 그림 주소 · 그림 파일을 고르면 작게 줄여 넣습니다</span><span class="row" style="gap:6px;flex-wrap:nowrap;align-items:center"><img data-sticon src="${esc(stIcon(v))}" alt="" style="width:40px;height:40px;object-fit:contain;border:1px solid var(--line,#ccc);border-radius:6px;${v?'':'visibility:hidden'}"><input id="${id}" data-f="${n}" value="${esc(v??'')}" style="flex:1;min-width:0"><input type="file" accept="image/*" data-sticonf hidden><button type="button" class="btn sm" data-sticonpick>그림 고르기</button></span></label>`;
 if(kind==='st'&&n===6)return `<label class="lbl" for="${id}">${c} <span class="small muted">turn 턴 끝마다 · move 기술 낼 때 · once 한 번</span><select id="${id}" data-f="${n}">${['turn','move','once'].concat(v&&!['turn','move','once'].includes(v)?[v]:[]).map(t=>`<option ${t===v?'selected':''}>${esc(t)}</option>`).join('')}</select></label>`;
 if(kind==='st'&&n>=7&&n<=9)return `<label class="lbl" for="${id}">${c}<select id="${id}" data-f="${n}">${['','O'].map(t=>`<option value="${t}" ${t===v?'selected':''}>${t||'아니오'}</option>`).join('')}</select></label>`;
 if(kind==='st'&&n===2)return `<label class="lbl" for="${id}">${c}<input id="${id}" data-f="${n}" value="${esc(v??'')}" list="L-stg"><datalist id="L-stg">${[...new Set(S.db.st.map(r=>r[2]).concat([ST_HIDE]))].filter(Boolean).map(g=>`<option value="${esc(g)}">`).join('')}</datalist></label>`;
 if(kind==='rm'&&n===4)return `<label class="lbl" for="${id}">${c} <span class="small muted">발동 확률 % — 비우면 효과 글(「N할로」 · 「N% 확률」 · 저/중/고확률)에서 읽는다 · 100 = 늘 발동</span><input id="${id}" data-f="${n}" type="number" min="0" max="100" step="1" value="${esc(v==null?'':v)}" style="width:90px"><span class="small" data-rmpct></span></label>`;
 if(kind==='rm'&&n===3)return `<label class="lbl" for="${id}">${c} <span class="small muted">(O 면 자동화 미지원 — 손으로 처리)</span><select id="${id}" data-f="${n}">${['','O'].map(t=>`<option value="${t}" ${t===v?'selected':''}>${t||'(자동)'}</option>`).join('')}</select></label>`;
 if(n===DBS[kind].eff)return `<label class="lbl" for="${id}" style="grid-column:1/-1">${c}${tagbarHTML()}<textarea id="${id}" data-f="${n}" rows="4">${esc(brN(v))}</textarea><span class="small" data-banwarn></span></label>`;
 if(kind==='moves'&&n===5)return `<label class="lbl" for="${id}">${c}<select id="${id}" data-f="${n}">${S.db.types.map(t=>`<option value="${esc(t[0])}" ${t[0]===v?'selected':''}>${esc(t[0])}</option>`).join('')}${v&&!S.db.types.some(t=>t[0]===v)?`<option value="${esc(v)}" selected>${esc(v)}</option>`:''}</select></label>`;
 if(kind==='moves'&&n===6)return `<label class="lbl" for="${id}">${c}<select id="${id}" data-f="${n}">${['물리','특수','변화'].map(t=>`<option ${t===v?'selected':''}>${t}</option>`).join('')}</select></label>`;
 if(kind==='moves'&&n===9)return `<label class="lbl" for="${id}">${c}<span class="row" style="gap:6px;flex-wrap:nowrap"><input id="${id}" data-f="${n}" value="${esc(v??'')}" list="L-range" style="flex:1;min-width:0"><span data-rg>${rangeGrid(v)}</span></span><datalist id="L-range">${Object.keys(RANGE_MAP).map(k=>`<option value="${k}">`).join('')}</datalist></label>`;
 if(kind==='moves'&&n===10)return `<label class="lbl" for="${id}">${c}<select id="${id}" data-f="${n}">${['O','X','-'].map(t=>`<option ${t===v?'selected':''}>${t}</option>`).join('')}</select></label>`;
 if((kind==='abil'&&(n===3||n===4))||(kind==='items'&&n===3))return `<label class="lbl" for="${id}">${c}<select id="${id}" data-f="${n}">${['X','O','-',''].map(t=>`<option value="${t}" ${t===v?'selected':''}>${t||'(빈칸)'}</option>`).join('')}</select></label>`;
 const list=kind==='pots'&&n===0?'L-kinds':kind==='items'&&n===0?'L-ikinds':'';
 return `<label class="lbl" for="${id}" ${n===1&&kind==='moves'?'style="grid-column:span 2"':''}>${c}<input id="${id}" data-f="${n}" value="${esc(v??'')}" ${list?`list="${list}"`:''}></label>`}
function openEdit(kind,i,{preset={},onSaved}={}){const D=DBS[kind];
 const r=i<0?D.cols.map((_,n)=>preset[n]??(kind==='moves'?({0:'1.5',1:'#오리지널',5:'노말',6:'물리',7:'0',8:'100',9:'1체',10:'O',11:'0',12:'-',14:'공격',15:'방어',17:'오리지널',18:'1',19:'1'}[n]??''):kind==='abil'?({0:'1',3:'X',4:'X'}[n]??''):kind==='items'?({0:'기타',3:'-',5:'1',6:'-'}[n]??''):'')):S.db[kind][i];
 const order=kind==='moves'?[2,5,6,0,7,8,9,10,11,12,14,15,18,19,1,17,3,4,16,13]:D.cols.map((_,n)=>n);
 const l=openModal(`<div class="mhead"><h2>${D.t} ${i<0?'오리지널 만들기':'수정'}</h2><span class="sp"></span><button class="btn ghost" data-x>닫기</button></div>
 <div class="mbody"><datalist id="L-kinds">${[...new Set(S.db.pots.map(r=>r[0]))].map(k=>`<option value="${esc(k)}">`).join('')}</datalist><datalist id="L-ikinds">${[...new Set(S.db.items.map(r=>r[0]))].map(k=>`<option value="${esc(k)}">`).join('')}</datalist>
 <div class="fgrid">${order.map(n=>fieldHTML(kind,n,r[n])).join('')}</div><div class="preview" data-prev></div></div>
 <div class="mfoot">${i>=0?'<button class="btn danger" data-del>삭제</button>':''}<label class="row small" style="gap:4px" title="오리지널로 표시 · 포켓몬 만들 때 특성 · 기술 목록에서는 「오리지널 보기」를 눌러야 보인다"><input type="checkbox" data-origchk ${i<0||S.custom[kind].includes(r[D.key])?'checked':''}>오리지널</label>${kind==='moves'?`<label class="row small" style="gap:4px" title="켜면 『올드 타입』 계열이 아닌 포켓몬의 기술 목록에는 안 뜬다"><input type="checkbox" data-oldchk ${i>=0&&mvOldOnly(r)?'checked':''}>올드 타입 전용</label>`:''}<span class="sp"></span><button class="btn" data-x>취소</button><button class="btn pri" data-save>저장</button></div>`,{wide:true});
 const rgi=kind==='moves'?$('[data-f="9"]',l):null;if(rgi)rgi.addEventListener('input',()=>{$('[data-rg]',l).innerHTML=rangeGrid(rgi.value)});
 if(kind==='st'){const inp=$('[data-f="12"]',l),im=$('[data-sticon]',l),fi=$('[data-sticonf]',l);const show=()=>{im.src=stIcon(inp.value.trim());im.style.visibility=inp.value.trim()?'visible':'hidden'};inp.addEventListener('input',show);
  $('[data-sticonpick]',l).addEventListener('click',()=>fi.click());
  fi.addEventListener('change',async()=>{const f=fi.files[0];if(!f)return;try{const bmp=await createImageBitmap(f);const S2=64,sc=Math.min(1,S2/Math.max(bmp.width,bmp.height));const cv=document.createElement('canvas');cv.width=Math.max(1,Math.round(bmp.width*sc));cv.height=Math.max(1,Math.round(bmp.height*sc));cv.getContext('2d').drawImage(bmp,0,0,cv.width,cv.height);let u=cv.toDataURL('image/webp',0.85);if(!u.startsWith('data:image/webp'))u=cv.toDataURL('image/png');inp.value=u;show()}catch(err){toast('그림을 읽지 못했습니다')}})}
 if(kind==='cards'){const inp=$('[data-f="6"]',l),im=$('[data-cardimg]',l),fi=$('[data-cardimgf]',l);const show=()=>{const u=cardImg(inp.value);im.src=u;im.style.visibility=u?'visible':'hidden'};inp.addEventListener('input',show);
  $('[data-cardimgpick]',l).addEventListener('click',()=>fi.click());
  fi.addEventListener('change',async()=>{const f=fi.files[0];fi.value='';if(!f)return;if(!/^image\//.test(f.type))return toast('그림 파일만');toast('올리는 중…');
   /* 카드 그림은 세로 720px 까지 줄여 webp 로 올린다 (한 장 수십 KB) */
   const shrink=async(maxH,q)=>{const bmp=await createImageBitmap(f);const sc=Math.min(1,maxH/bmp.height);const cv=document.createElement('canvas');cv.width=Math.max(1,Math.round(bmp.width*sc));cv.height=Math.max(1,Math.round(bmp.height*sc));cv.getContext('2d').drawImage(bmp,0,0,cv.width,cv.height);return cv};
   try{const cv=await shrink(720);const blob=await new Promise(r=>cv.toBlob(r,'image/webp',0.88));const u=await putImg(`cards/${Date.now().toString(36)}${Math.random().toString(36).slice(2,6)}`,blob||f);inp.value=u;show();toast('올렸습니다 — 「저장」을 누르세요')}
   catch(err){toast('그림을 올리지 못했습니다: '+(err&&err.message||err)+' — 주소를 직접 넣어 주세요')}})}   /* 10-26: 글자 주소(data:) 로 넣지 않는다 — 카드 DB 줄은 공유 DB(docs)에 들어가 모든 제작기 · 오레마스가 처음에 통째로 받으니 용량이 커진다 */
 if(kind==='rm'&&window.OM_FX){const ds=$('[data-f="2"]',l),pv=$('[data-rmprev]',l);const up=()=>{const r=window.OM_FX.parse(ds.value);pv.innerHTML=(r.ops.length?'미리보기: '+esc(window.OM_FX.unparse(r.ops).join(' / ')):'<span class="muted">구문 없음</span>')+(r.errs&&r.errs.length?` <span class="warn">모르는 줄: ${esc(r.errs.join(' / '))}</span>`:'')};ds.addEventListener('input',up);up()}
 if(kind==='rm'&&window.OM_FX&&window.OM_FX.rmChance){const pi=$('[data-f="4"]',l),tx=$('[data-f="1"]',l),nm=$('[data-f="0"]',l),ph=$('[data-rmpct]',l);const up2=()=>{if(!pi||!ph)return;const F=window.OM_FX;const v=pi.value.trim();let t=tx?tx.value:'';if(!t&&F.effOf&&nm){const mm=nm.value.match(/^(특성|소지품)\s*:\s*(.+)$/);t=mm?F.effOf(mm[1]==='특성'?'trait':'item',mm[2]):''}const d=F.rmChance({text:t});ph.textContent=v!==''&&+v>0?(+v>=100?' 늘 발동 (굴리지 않음)':` ${+v}% 로 굴린다`):(d?` 지금은 글에서 읽은 ${d}% 로 굴린다`:' 확률 없음 — 늘 발동')};[pi,tx,nm].forEach(x=>x&&x.addEventListener('input',up2));up2()}   /* 10-24 망령: 레디메이드 확률 칸 */
 if(kind==='cards'){const ta=$('[data-f="9"]',l),pv=$('[data-cardauto]',l);if(ta&&pv){const up=()=>{const K=window.OM_FX;const v=ta.value.trim();if(!K||!v){pv.innerHTML='';return}const r=K.parse(v);pv.innerHTML=(r.ops.length?'미리보기: '+esc(K.unparse(r.ops).join(' / ')):'')+(r.errs&&r.errs.length?` <span class="warn">모르는 줄: ${esc(r.errs.join(' / '))}</span>`:'')};ta.addEventListener('input',up);up()}}
 if(kind==='items'){const ds=$('[data-f="7"]',l),pv=$('[data-irprev]',l);const IR=()=>window.OM_ITEMRULE;
  const up=()=>{if(!IR()){pv.innerHTML='<span class="muted">구문 스크립트를 불러오는 중…</span>';return}const t=ds.value.trim();if(!t){const g=IR().fromEff($('[data-f="1"]',l).value,($('[data-f="3"]',l).value==='O'?'소모품/':'')+$('[data-f="4"]',l).value);pv.innerHTML=IR().has(g)?'<span class="muted">비어 있음 — 효과 글로 자동 처리 (「효과 글에서 만들기」로 꺼내 볼 수 있다)</span>':'<span class="muted">자동 처리 없음 — 손으로</span>';return}
   const r=IR().parse(t);pv.innerHTML=(IR().has(r.rule)?'<span class="ok">✓ 읽었다</span>':'<span class="muted">자동으로 하는 일이 없다</span>')+(r.errs.length?` <span class="warn">모르는 줄: ${esc(r.errs.join(' / '))}</span>`:'')};
  ds.addEventListener('input',up);l.addEventListener('input',e=>{if(e.target.matches('[data-f="1"],[data-f="3"],[data-f="4"]'))up()});
  $('[data-irgen]',l).addEventListener('click',()=>{if(!IR())return toast('구문 스크립트를 아직 불러오는 중입니다');const g=IR().fromEff($('[data-f="1"]',l).value,($('[data-f="3"]',l).value==='O'?'소모품/':'')+$('[data-f="4"]',l).value);if(!IR().has(g))return toast('효과 글에서 자동으로 읽을 수 있는 것이 없습니다 — 도움말을 보고 직접 써 주세요');ds.value=IR().toText(g);up()});
  up();loadFx().then(up)}
 const ta=D.eff>=0?$(`[data-f="${D.eff}"]`,l):null;
 if(ta){bindTagbar(l,()=>ta);
 const upd=()=>{$('[data-prev]',l).innerHTML='<span class="small faint">미리보기</span><br>'+rich(ta.value);const h=banHits(ta.value);$('[data-banwarn]',l).innerHTML=(h.length?`<span class="warn">금지 키워드: ${h.map(esc).join(', ')}</span>`:'')+lintHTML(ta.value)};
 ta.addEventListener('input',upd);upd()}
 const okey=i>=0?r[D.key]:null;const cur=()=>okey==null?-1:S.db[kind].findIndex(x=>x[D.key]===okey);
 l.addEventListener('click',async e=>{if(e.target.closest('[data-x]'))return closeModal();
  if(e.target.closest('[data-del]')){if(await ask(`「${esc(r[D.key])}」을(를) DB에서 삭제할까요?`,'삭제')){const ii=cur();if(ii>=0)S.db[kind].splice(ii,1);reindex();save(true);closeModal();refreshAll()}return}
  if(e.target.closest('[data-save]')){if(okey!=null){i=cur();if(i<0)return toast('이 항목은 다른 사람이 지웠습니다')}const nr=D.cols.map((_,n)=>{const el=$(`[data-f="${n}"]`,l);return el?el.value:''});nr[D.key]=nr[D.key].trim();
   if(kind==='moves'){const oc=$('[data-oldchk]',l);nr[MV_OLDONLY]=oc&&oc.checked?'O':''}
   if(!nr[D.key])return toast(D.cols[D.key]+'을(를) 입력하세요');
   const dup=S.db[kind].findIndex(x=>x[D.key]===nr[D.key]);if(dup>=0&&dup!==i)return toast('같은 이름이 이미 DB에 있습니다');
   if(i<0){S.db[kind].unshift(nr);if(!S.custom[kind].includes(nr[D.key]))S.custom[kind].push(nr[D.key])}
   else{const old=S.db[kind][i][D.key];S.db[kind][i]=nr;const ci=S.custom[kind].indexOf(old);if(ci>=0)S.custom[kind][ci]=nr[D.key];
    if(old!==nr[D.key]){const n=renameRefs(kind,old,nr[D.key]);if(n){save();setTimeout(()=>toast(`캐릭터 시트 ${n}곳의 이름도 바꿨습니다`),1900)}}}
   {const oc=$('[data-origchk]',l);if(oc){const ci=S.custom[kind].indexOf(nr[D.key]);if(oc.checked&&ci<0)S.custom[kind].push(nr[D.key]);else if(!oc.checked&&ci>=0)S.custom[kind].splice(ci,1)}}   /* 10-26 망령: 오리지널 구분을 직접 */
   reindex();save(true);closeModal();toast('DB에 저장했습니다');onSaved?onSaved(nr[D.key]):refreshAll()}})}
/* 오리지널 소지품 (시트에만) — DB 는 건드리지 않고 p.item · p.itemOwn 만 바꾼다. 오레마스로는 시트 그대로 넘어간다 */
function openOwnItem(P,name,done){const o0=ownItem(P)&&(!name||name===P.item)?ownItem(P):null;const o=Object.assign({name:name||'',kind:'오리지널',cons:false,sock:'-',eff:'',auto:''},o0?clone(o0):{name:name||''});
 const l=openModal(`<div class="mhead"><h2>오리지널 소지품 · 이 포켓몬만</h2><span class="sp"></span><button class="btn ghost" data-x>닫기</button></div>
 <div class="mbody"><p class="small muted" style="margin:0">소지품 DB 에는 넣지 않고 이 포켓몬 시트에만 적어 둔다. 오레마스(배틀 웹툴)로 가져가면 특성 · 포텐셜처럼 여기 적은 이름 · 효과 · 구문이 그대로 들어간다.</p>
 <datalist id="L-ikinds3">${[...new Set(S.db.items.map(r=>r[0]))].map(k=>`<option value="${esc(k)}">`).join('')}</datalist>
 <div class="fgrid"><label class="lbl" for="oi-name">이름<input id="oi-name" value="${esc(o.name)}"></label><label class="lbl" for="oi-kind">종류<input id="oi-kind" list="L-ikinds3" value="${esc(o.kind)}"></label>
 <label class="lbl" for="oi-cons">소모품<select id="oi-cons"><option value="" ${o.cons?'':'selected'}>아니오</option><option value="O" ${o.cons?'selected':''}>소모품 (쓰면 없어짐)</option></select></label><label class="lbl" for="oi-sock">소켓<input id="oi-sock" value="${esc(o.sock)}"></label>
 <label class="lbl" for="oi-eff" style="grid-column:1/-1">효과${tagbarHTML()}<textarea id="oi-eff" rows="4">${esc(brN(o.eff))}</textarea><span class="small" data-banwarn></span></label>
 <label class="lbl" for="oi-auto" style="grid-column:1/-1">구문 <span class="small muted">오레마스 배틀이 자동으로 처리하는 법 · 한 줄에 하나 · 비우면 효과 글을 읽는다</span><textarea id="oi-auto" rows="3" style="font-family:var(--mono,monospace);font-size:12.5px" placeholder="예) 턴 종료: 회복 1/16">${esc(o.auto)}</textarea><span class="row" style="gap:6px;align-items:center;flex-wrap:wrap"><button type="button" class="btn sm" data-irgen>효과 글에서 만들기</button><span class="small" data-irprev></span></span><details><summary class="small">구문 도움말</summary><pre class="small" style="white-space:pre-wrap">${esc(IR_HELP)}</pre></details></label></div>
 <div class="preview" data-prev></div></div>
 <div class="mfoot">${o0?'<button class="btn danger" data-oidel>소지품 빼기</button>':''}<span class="sp"></span><button class="btn" data-x>취소</button><button class="btn pri" data-oisave>저장</button></div>`,{wide:true});
 const ta=$('#oi-eff',l),ds=$('#oi-auto',l),pv=$('[data-irprev]',l),IR=()=>window.OM_ITEMRULE;bindTagbar(l,()=>ta);
 const gen=()=>IR().fromEff($('#oi-name',l).value,($('#oi-cons',l).value==='O'?'소모품/':'')+ta.value);
 const up=()=>{$('[data-prev]',l).innerHTML='<span class="small faint">미리보기</span><br>'+rich(ta.value);const h=banHits(ta.value);$('[data-banwarn]',l).innerHTML=(h.length?`<span class="warn">금지 키워드: ${h.map(esc).join(', ')}</span>`:'')+lintHTML(ta.value);
  if(!IR()){pv.innerHTML='<span class="muted">구문 스크립트를 불러오는 중…</span>';return}const t=ds.value.trim();if(!t){pv.innerHTML=IR().has(gen())?'<span class="muted">비어 있음 — 효과 글로 자동 처리</span>':'<span class="muted">자동 처리 없음 — 손으로</span>';return}
  const r=IR().parse(t);pv.innerHTML=(IR().has(r.rule)?'<span class="ok">✓ 읽었다</span>':'<span class="muted">자동으로 하는 일이 없다</span>')+(r.errs.length?` <span class="warn">모르는 줄: ${esc(r.errs.join(' / '))}</span>`:'')};
 l.addEventListener('input',up);l.addEventListener('change',up);up();loadFx().then(up);
 $('[data-irgen]',l).addEventListener('click',()=>{if(!IR())return toast('구문 스크립트를 아직 불러오는 중입니다');const g=gen();if(!IR().has(g))return toast('효과 글에서 자동으로 읽을 수 있는 것이 없습니다 — 도움말을 보고 직접 써 주세요');ds.value=IR().toText(g);up()});
 l.addEventListener('click',async e=>{if(e.target.closest('[data-x]'))return closeModal();
  if(e.target.closest('[data-oidel]')){if(await ask(`「${esc(P.item)}」을(를) 이 포켓몬에서 뺄까요?`,'빼기')){P.item='';delete P.itemOwn;closeModal();save();done&&done()}return}
  if(e.target.closest('[data-oisave]')){const nm=$('#oi-name',l).value.trim();if(!nm)return toast('이름을 입력하세요');
   if(idx.items.get(nm)&&!await ask(`소지품 DB 에 「${esc(nm)}」이(가) 이미 있어서 여기 적은 효과보다 DB 의 것이 먼저 쓰입니다. 그래도 이 이름으로 둘까요?`,'그대로 두기'))return;
   if(Array.isArray(P.pots)){const T=tuneOf(P);if(T.itemName&&T.itemName===P.item&&P.item!==nm)T.itemName=nm}
   P.item=nm;P.itemOwn={name:nm,kind:$('#oi-kind',l).value.trim()||'오리지널',cons:$('#oi-cons',l).value==='O',sock:$('#oi-sock',l).value.trim()||'-',eff:ta.value,auto:ds.value.trim()};
   closeModal();save();toast('이 포켓몬 시트에만 적었습니다 (DB 는 그대로)');done&&done()}})}
function renameRefs(kind,a,b){let n=0;for(const t of S.trainers){if(kind==='points')t.pts=t.pts.map(x=>x===a?(n++,b):x);
  for(const p of t.pokemon){if(kind==='moves')p.moves.forEach(m=>{if(m.name===a){m.name=b;n++}});if(kind==='abil'&&p.ability===a){p.ability=b;n++}if(kind==='items'&&p.item===a){p.item=b;n++}
   if(kind==='pots')p.pots.forEach((x,i)=>{if(x===a){p.pots[i]=b;n++}})}}return n}

/* ---------- 포텐셜 편집기 ---------- */
function openPotEditor(t,p,slot){/* slot: 0..19 or 'excl' or {ex:i} (추가 전용 칸) or {unique:i} */
 const xi=slot&&typeof slot==='object'&&slot.ex!=null?slot.ex:null,exO=slot==='excl'?p.excl:xi!=null?p.exclX[xi]:null;
 const isEx=!!exO,isU=!isEx&&typeof slot==='object';
 const cur=isEx?{kind:'전용',name:exO.name,eff:exO.eff}:isU?{kind:'고유',name:t.unique[slot.unique].name,eff:t.unique[slot.unique].eff}:{kind:potKindOf(p,slot),name:p.pots[slot],eff:potEffOf(p,slot)};
 const st={q:'',lim:120,kind:'',mine:false,nameOnly:false,f:{},pmin:'',pmax:''};
 const label=isEx?(xi!=null?`전용 포텐셜 ${xi+2}`:'전용 포텐셜'):isU?'고유 포텐셜':`포텐셜 #${slot+1}`;
 const l=openModal(`<div class="mhead"><h2>포텐셜 편집 · ${esc(label)}</h2><span class="sp"></span><button class="btn ghost" data-x>닫기</button></div>
 <div class="mbody"><div class="segtog" role="tablist"><button type="button" data-seg="pick" role="tab" class="${cur.name?'':'on'}">DB에서 고르기</button><button type="button" data-seg="edit" role="tab" class="${cur.name?'on':''}">직접 작성 · 수정</button></div>
 <div class="split" data-seg="${cur.name?'edit':'pick'}"><div class="seg-pick" style="display:flex;flex-direction:column;gap:8px;min-width:0"><b class="small wide-only">DB에서 고르기</b>${pickerShell('pots',st)}</div>
 <div class="seg-edit" style="display:flex;flex-direction:column;gap:8px;min-width:0"><b class="small wide-only">직접 작성 · 수정</b>
  <datalist id="L-kinds2">${[...new Set(S.db.pots.map(r=>r[0]))].map(k=>`<option value="${esc(k)}">`).join('')}</datalist>
  <div class="fgrid" style="grid-template-columns:minmax(0,1fr) minmax(0,1.4fr)">${isEx||isU?`<span class="lbl">종류<b style="color:var(--ink);font-size:13px">${isEx?'전용':'고유'}</b></span>`:`<label class="lbl" for="pe-kind">종류(순서)<input id="pe-kind" list="L-kinds2" value="${esc(cur.kind)}" placeholder="예: 04.1. 종족"></label>`}
  <label class="lbl" for="pe-name">이름<input id="pe-name" value="${esc(cur.name)}"></label></div>
  <label class="lbl" for="pe-line">컷인 대사 <span class="small muted" style="font-weight:400">오레마스에서 이 포텐셜 컷인이 뜰 때 큰 글씨 아래에 나오는 한 줄 · 비우면 없음</span><input id="pe-line" maxlength="80" value="${esc(isU?String((t.unique[slot.unique]||{}).line||''):String(((p&&p.cutLine)||{})[String(cur.name||'').replace(/『|』/g,'').trim()]||''))}" placeholder="예: 하늘 끝까지 태워 주마!"></label>
  <label class="lbl" for="pe-eff">효과${tagbarHTML()}<textarea id="pe-eff" rows="6">${esc(brN(cur.eff))}</textarea></label>
  <div class="preview" data-prev></div><div class="small" data-ban></div>
  ${window.MKM_POTLINT?`<details class="wordbox" data-wordbox><summary>✍ 워딩 도우미 <span class="small muted" data-wcount></span></summary><div data-wbody></div></details>`:''}
  ${isEx||isU?'':`<label class="row small"><input type="checkbox" id="pe-db">포텐셜 DB에도 저장 (같은 이름이 있으면 덮어씀)</label>`}
  ${window.OM_FX?`<details class="autobox" ${(isU?String((t.unique[slot.unique]||{}).auto||''):autoDsl(p,cur.name))?'open':''}><summary>⚙ 자동화 구문 <span class="small muted" data-autohint></span></summary>
   <div class="small muted" style="margin:4px 0">오레마스(배틀 웹툴)에서 이 포텐셜을 쓸 때 자동으로 처리할 내용. 같은 이름의 레디메이드가 있으면 비워 둬도 그것이 돈다. 한 줄에 명령 하나 — 예: <code>랭크 공격+1 임시</code> · <code>위력 ×1.3 타입:불꽃 물리</code> · <code>상태확률 화상 30% 상대1체</code></div>
   <pre class="small" data-autorm style="white-space:pre-wrap;background:var(--bg2,#f4f4f6);padding:6px;border-radius:6px;margin:0 0 6px"></pre>
   <textarea id="pe-auto" rows="4" style="width:100%;font-family:var(--mono,monospace);font-size:12.5px" placeholder="(비우면 레디메이드 자동)">${esc(isU?String((t.unique[slot.unique]||{}).auto||''):autoDsl(p,cur.name))}</textarea>
   <div class="small" data-autoprev style="white-space:pre-wrap;margin-top:4px"></div>
   <div data-autogen></div>
   <details><summary class="small">구문 도움말</summary><pre class="small" style="white-space:pre-wrap">${esc(AUTO_HELP)}</pre></details></details>`:''}</div></div></div>
 <div class="mfoot"><button class="btn danger" data-clear>슬롯 비우기</button>${isU||PR_HIDDEN?'':'<button class="btn" data-rec title="이 포켓몬의 타입·기술·종족치·역할에서 계통별 포텐셜 안을 짜고 수지 검사">✨ 추천</button>'}${isU?'':'<button class="btn" data-build title="트리거·조건·효과를 골라 새 포텐셜 문장 만들기">🛠 제작</button>'}<span class="sp"></span><button class="btn" data-x>취소</button><button class="btn pri" data-apply>적용</button></div>`,{wide:true});
 const ta=$('#pe-eff',l);bindTagbar(l,()=>ta);
 const autoUpd=()=>{const K=window.OM_FX;if(!K)return;const nm=$('#pe-name',l).value.trim().replace(/『|』/g,'');const base=nm?K.rm(nm):null;const rmEl=$('[data-autorm]',l),hint=$('[data-autohint]',l),pv=$('[data-autoprev]',l),ta2=$('#pe-auto',l);if(!ta2)return;
  rmEl.textContent=base&&base.ops&&base.ops.length?'레디메이드 자동: '+K.unparse(base.ops).join(' / ')+(base.manual?' (자동화 미지원 — 손으로)':''):'같은 이름의 레디메이드 없음';
  const r=K.parse(ta2.value);pv.innerHTML=(r.ops.length?'미리보기: '+esc(K.unparse(r.ops).join(' / ')):'')+(r.errs.length?` <span class="warn">모르는 줄: ${esc(r.errs.join(' / '))}</span>`:'');hint.textContent=r.ops.length?'구문 있음':(base&&base.ops&&base.ops.length&&!base.manual?'레디메이드 자동':'없음')};
 autoUpd();l.addEventListener('input',e=>{if(e.target.id==='pe-auto'||e.target.id==='pe-name')autoUpd()});
 {const gh=$('[data-autogen]',l),ta3=$('#pe-auto',l);if(gh&&ta3&&window.OM_FX_UI&&OM_FX_UI.mountGen)OM_FX_UI.mountGen(gh,ta3,{toast})}   /* 10-23 망령: 고유 포함 — 편집 창에서 바로 생성기 */
 const fill=o=>{$('#pe-name',l).value=o.name||'';ta.value=o.eff||'';const k=$('#pe-kind',l);if(k&&o.kind)k.value=o.kind;upd();seg('edit')};
 const upd=()=>{$('[data-prev]',l).innerHTML=`<b>${esc($('#pe-name',l).value||'(이름 없음)')}</b><br>`+rich(ta.value);const h=banHits(ta.value);$('[data-ban]',l).innerHTML=(h.length?`<span class="warn">금지 키워드 감지: ${h.map(esc).join(', ')}</span>`:'<span class="okc">금지 키워드 없음</span>')+lintHTML(ta.value);wordUpd()};
 /* 10-24 망령: 뉴비 워딩 도우미 — DB 문장 꼴로 고칠 곳 · 자동화 구문 추천 (js/potlint.js) */
 let wFind=[],wDsl=[];
 const wordUpd=()=>{const W=window.MKM_POTLINT,box=$('[data-wordbox]',l);if(!W||!box)return;const txt=ta.value;wFind=txt.trim()?W.check(txt):[];const fx=txt.trim()?W.fixAll(txt):'';const sg=fx?W.suggest(fx):{lines:[],why:[],timing:''};wDsl=sg.lines;const left=fx?banHits(fx):[];
  $('[data-wcount]',l).textContent=!txt.trim()?'':(wFind.length?`고칠 곳 ${wFind.length}`:'문장 꼴 OK')+(wDsl.length?` · 추천 구문 ${wDsl.length}줄`:'');box.classList.toggle('has',!!wFind.length);
  const sh=v=>v===''?'(없음)':v.replace(/\n/g,'↵');
  $('[data-wbody]',l).innerHTML=(!txt.trim()?'<div class="small muted">효과를 쓰면 포텐셜 DB 문장 꼴(【1/시】/ · 「공격 : +1」한다 · 강화(1.5배) · 턴 종료 시까지 …)과 비교해 고칠 곳을 알려 준다.</div>':
   (wFind.length?`<div class="wrow"><b class="small">고칠 곳</b><span class="sp"></span><button type="button" class="btn sm" data-wfixsel>고른 것만 고치기</button><button type="button" class="btn sm" data-wfixall>모두 고치기</button></div><ul class="wlist">${wFind.map((f,i)=>`<li><label class="wck"><input type="checkbox" data-wck="${i}" checked><span class="small">${esc(f.msg)}</span></label><br><code>${esc(sh(f.from))}</code> → <code>${esc(sh(f.to))}</code> <button type="button" class="btn sm ghost" data-wfix="${i}">이것만 고치기</button></li>`).join('')}</ul>`:'<div class="small okc">DB 문장 꼴과 어긋나는 곳을 못 찾았다</div>')+
   (left.length?`<div class="small warn" style="margin-top:4px">고쳐도 남는 금지 키워드: ${left.map(esc).join(', ')} · 이건 손으로 바꿔야 한다 (표 탭 「금지어」 참고)</div>`:'')+
   (wDsl.length?`<div class="wrow" style="margin-top:6px"><b class="small">추천 자동화 구문</b>${wFind.length?'<span class="small muted">(고친 문장 기준)</span>':''}<span class="sp"></span>${$('#pe-auto',l)?'<button type="button" class="btn sm" data-wdslsel>고른 줄 넣기</button><button type="button" class="btn sm" data-wdsl>모두 바꿔 넣기</button>':''}</div><div class="wdsl">${wDsl.map((x,i)=>`<label class="wck"><input type="checkbox" data-wdck="${i}" checked><code>${esc(x)}</code></label>`).join('')}</div><div class="small muted">${esc(sg.timing)} · 넣은 뒤 아래 ⚙ 자동화 구문 미리보기로 확인</div>`:'<div class="small muted" style="margin-top:6px">자동화 구문으로 옮길 만한 효과는 못 찾았다 (조건 · 특수 효과는 GM이 손으로)</div>'))};
 l.addEventListener('click',e=>{const W=window.MKM_POTLINT;if(!W)return;let b;
  if((b=e.target.closest('[data-wfix]'))){ta.value=W.fixOne(ta.value,wFind[+b.dataset.wfix]);upd();return}
  if(e.target.closest('[data-wfixsel]')){const on=$$('[data-wck]',l).filter(c=>c.checked).map(c=>wFind[+c.dataset.wck]).filter(Boolean);if(!on.length)return toast('고칠 곳을 하나 이상 골라 주세요');
   /* 뒤쪽부터 고쳐야 앞쪽 위치가 안 밀린다 · 맨 앞에 붙는 사용 횟수 태그는 마지막에 */
   let v=ta.value;on.filter(f=>f.id!=='uses-tag').sort((a,b)=>(b.at||0)-(a.at||0)).forEach(f=>{v=W.fixOne(v,f)});on.filter(f=>f.id==='uses-tag').forEach(f=>{v=W.fixOne(v,f)});ta.value=v;upd();toast(`고른 ${on.length}곳을 고쳤습니다`);return}
  if(e.target.closest('[data-wdslsel]')){const a=$('#pe-auto',l);if(!a)return;const on=$$('[data-wdck]',l).filter(c=>c.checked).map(c=>wDsl[+c.dataset.wdck]).filter(Boolean);if(!on.length)return toast('넣을 줄을 하나 이상 골라 주세요');
   const have=a.value.split('\n').map(x=>x.trim()).filter(Boolean),add=on.filter(x=>!have.includes(x.trim()));if(!add.length)return toast('고른 줄은 이미 구문 칸에 있습니다');a.value=[...have,...add].join('\n');const d=a.closest('details');if(d)d.open=true;autoUpd();toast(`${add.length}줄을 구문 칸에 덧붙였습니다`);return}
  if(e.target.closest('[data-wfixall]')){ta.value=W.fixAll(ta.value);upd();toast('DB 문장 꼴로 고쳤습니다 · 뜻이 바뀌지 않았는지 한 번 읽어 보세요');return}
  if(e.target.closest('[data-wdsl]')){const a=$('#pe-auto',l);if(!a)return;const old=a.value.trim();if(old&&old!==wDsl.join('\n')&&!confirm('구문 칸에 이미 쓴 내용이 있습니다. 추천 구문으로 바꿀까요?'))return;a.value=wDsl.join('\n');const d=a.closest('details');if(d)d.open=true;autoUpd();toast('추천 구문을 넣었습니다');return}});
 l.addEventListener('input',e=>{if(e.target.id==='pe-eff'||e.target.id==='pe-name')upd()});upd();
 const seg=v=>{$('.split',l).dataset.seg=v;$$('[data-seg]',l).forEach(b=>{if(b.tagName==='BUTTON')b.classList.toggle('on',b.dataset.seg===v)})};
 l.addEventListener('click',e=>{const b=e.target.closest('button[data-seg]');if(b)seg(b.dataset.seg)});
 mountPicker(l,'pots',st,{onPick:n=>{const r=potRow(n);$('#pe-name',l).value=n;ta.value=brN(r[2]);const k=$('#pe-kind',l);if(k)k.value=r[0];upd();if(matchMedia('(max-width:700px)').matches){seg('edit');toast(`「${n}」을(를) 불러왔습니다`)}}});
 const commit=(name,eff,kind)=>{if(isEx){if(xi!=null&&!name)p.exclX.splice(xi,1);else{exO.name=name;exO.eff=eff}}else if(isU){const ta2=$('#pe-auto',l);const dsl=ta2?ta2.value.trim():'';{const o0=t.unique[slot.unique]||{};const nu=Object.assign({},o0,{name,eff});if(dsl)nu.auto=dsl;else delete nu.auto;{const ln=(($('#pe-line',l)||{}).value||'').trim();if(ln&&name)nu.line=ln.slice(0,80);else delete nu.line}t.unique[slot.unique]=nu}   /* 10-23 망령: 고쳐도 꾸미기(색 · 아이콘 · 부제)는 남긴다 */}else{
   const r=potRow(name);p.pots[slot]=name;p.potEff[slot]=r&&brN(r[2]).trim()===eff.trim()?'':eff;p.potKind[slot]=r&&r[0]===kind?'':kind}
  if(!isU&&p){const ln=(($('#pe-line',l)||{}).value||'').trim();const k0=String(cur.name||'').replace(/『|』/g,'').trim(),k1=String(name||'').replace(/『|』/g,'').trim();p.cutLine=p.cutLine||{};if(k0&&k0!==k1)delete p.cutLine[k0];if(k1&&ln)p.cutLine[k1]=ln.slice(0,80);else if(k1)delete p.cutLine[k1];if(!Object.keys(p.cutLine).length)delete p.cutLine}
  const ta2=$('#pe-auto',l);if(ta2&&!isU&&p){p.auto=p.auto||{};const key=String(name||'').replace(/『|』/g,'');const dsl=ta2.value.trim();if(key&&dsl)p.auto[key]=dsl;else if(key)delete p.auto[key]}
  save();refreshTrainer(t)};
 l.addEventListener('click',e=>{if(e.target.closest('[data-x]'))return closeModal();
  if(e.target.closest('[data-rec]')){openPotRecommend(t,p,fill,isEx);return}
  if(e.target.closest('[data-build]')){openPotBuilder(t,p,fill,isEx);return}
  if(e.target.closest('[data-clear]')){commit('','','');closeModal();return}
  if(e.target.closest('[data-apply]')){const name=$('#pe-name',l).value.trim(),eff=ta.value,kind=$('#pe-kind',l)?$('#pe-kind',l).value.trim():'';
   if($('#pe-db',l)&&$('#pe-db',l).checked&&name){const i=S.db.pots.findIndex(r=>r[1]===name);const nr=[kind||'99. 기타',name,eff,i>=0?S.db.pots[i][3]:'오리지널'];if(i>=0)S.db.pots[i]=nr;else{S.db.pots.unshift(nr);S.custom.pots.push(name)}reindex();save(true)}
   commit(name,eff,kind);closeModal();toast('포텐셜을 적용했습니다')}})}


/* ---------- 포텐셜 추천 · 제작 ---------- */
const PR_STAT_KO={0:'HP',1:'공격',2:'방어',3:'특공',4:'특방',5:'스피드'};
const PR_RANKV={'-':0,'E-':1,'E':2,'E+':3,'D-':4,'D':5,'D+':6,'C-':7,'C':8,'C+':9,'B-':10,'B':11,'B+':12,'A-':13,'A':14,'A+':15,'AA-':16,'AA':17,'AA+':18,'AAA-':19,'AAA':20,'AAA+':21,'S-':22,'S':23,'S+':24,'EX':25};
function prCtx(t,p){
 const types=[p.t1,p.t2,p.t3].filter(x=>x&&x!=='-');
 const g=p.base.map(v=>grade(v)),gv=g.map(x=>PR_RANKV[x]||0);
 const moves=p.moves.filter(m=>m.name).map(m=>({n:m.name,r:idx.moves.get(m.name)})).map(m=>Object.assign(m,{ty:m.r?m.r[5]:'',cat:m.r?m.r[6]:'',pow:m.r?+m.r[7]||0:0,rng:m.r?m.r[9]:'',prio:m.r?+m.r[11]||0:0,touch:m.r?m.r[10]==='O':false}));
 const mtypes=new Set(moves.map(m=>m.ty).filter(Boolean));
 const cats={phys:moves.some(m=>m.cat==='물리'),spec:moves.some(m=>m.cat==='특수'),stat:moves.some(m=>m.cat==='변화'),wide:moves.some(m=>/상대 2체|상대 전체|자신 이외|전체/.test(m.rng)),prio:moves.some(m=>m.prio>0),touch:moves.some(m=>m.touch)};
 const roles=p.pots.map((n,i)=>n&&/역할/.test(potKindOf(p,i))?n:'').filter(Boolean);
 const others=t.pokemon.filter(x=>x!==p);
 const otherPots=[];for(const o of others)o.pots.forEach((n,i)=>{if(n)otherPots.push({who:o.name||'(이름 없음)',n,eff:potEffOf(o,i)})});
 const eggs=[p.egg1,p.egg2].filter(x=>x&&x!=='-');
 const stats={hp:gv[0],atk:gv[1],def:gv[2],spa:gv[3],spd:gv[4],spe:gv[5]};
 const abr=idx.abil.get(p.ability||'');
 return {types,g,gv,stats,moves,mtypes,cats,roles,others,otherPots,eggs,ability:p.ability||'',abilEff:abr?String(abr[2]||''):'',item:p.item||'',old:isOld(p),ranks:t.ranks,name:p.name||'(이름 없음)'};
}
function prTags(s){return (String(s||'').match(/【([^】]*)】/g)||[]).map(x=>x.slice(1,-1).replace(/\s*\(.*$/,''))}
function prEffKeys(s){const k=new Set();const x=String(s||'');
 if(/강화\(|위력.*(배|강화)|대미지를 강화|2배/.test(x))k.add('위력 강화');
 if(/완화\(|반감|받을 대미지|무효화/.test(x))k.add('피해 완화');
 for(const st of ['공격','방어','특공','특방','스피드','명중','회피'])if(new RegExp('「[^」]*'+st+'[^」]*: ?[+]').test(x)||new RegExp('「'+st+'」을? 강화').test(x))k.add(st+' 상승');
 for(const st of ['공격','방어','특공','특방','스피드','명중','회피'])if(new RegExp('「[^」]*'+st+'[^」]*: ?-').test(x)||new RegExp('「'+st+'」을? 저하').test(x))k.add(st+' 감소');
 if(/급소/.test(x))k.add('급소');if(/회복/.test(x))k.add('HP 회복');if(/교대/.test(x))k.add('교대');if(/따라가때리기/.test(x))k.add('추격');if(/필중/.test(x))k.add('필중');
 if(/「(화상|마비|독|맹독|잠듦|얼음|혼란|풀죽음)」/.test(x))k.add('상태 부여');if(/날씨/.test(x))k.add('날씨');if(/필드/.test(x))k.add('필드');if(/우선도/.test(x))k.add('우선도');
 return k}
function prCtxHTML(C){return `<div class="small muted" style="margin:0 0 6px"><b>${esc(C.name)}</b> · ${C.types.map(tchip).join('')} · 종족치 ${C.g.map((x,i)=>PR_STAT_KO[i]+' '+x).join(' / ')} · 특성 ${esc(C.ability||'-')} · 역할 ${esc(C.roles.join(', ')||'-')} · 기술 ${C.moves.map(m=>esc(m.n)).join(', ')||'-'}</div>`}

/* ===== 제작기 선택지 ===== */
const PB_TRIG=[
 ['횟수·방식',[['','(없음 · 상시)'],['【1/시】','【1/시】'],['【2/시】','【2/시】'],['【1/시】【자동】','【1/시】【자동】'],['【1/시】【선행】','【1/시】【선행】'],['【1/시】【임의】','【1/시】【임의】'],['【사전】','【사전】']]],
 ['방호·동조',[['【방호】','【방호】'],['【방호】【수세】','【방호】【수세】'],['【1/시】【방호】','【1/시】【방호】'],['【1/시】【자동】【방호】','【1/시】【자동】【방호】'],['【동조】','【동조】'],['【동조 (아군)】','【동조 (아군)】']]],
 ['등장·퇴장·지연',[['【등장】','【등장】'],['【등장 (통상 교대)】','【등장 (통상 교대)】'],['【등장 (죽어내밀기)】','【등장 (죽어내밀기)】'],['【퇴장 (통상 교대)】','【퇴장 (통상 교대)】'],['【퇴장 (빈사)】','【퇴장 (빈사)】'],['【지연 (2턴)】','【지연 (2턴)】'],['【지연 (3턴)】','【지연 (3턴)】']]],
 ['지원·수세·공세·함성',[['【지원】','【지원】'],['【지원 (빈사)】','【지원 (빈사)】'],['【수세】','【수세】'],['【공세】','【공세】'],['【함성】','【함성】'],['【1/시】【함성】','【1/시】【함성】']]],
 ['제한',[['【유일】','【유일】'],['【소진】','【소진】'],['【탈진】','【탈진】'],['【보급】','【보급】'],['【공유】','【공유】'],['【중첩 (2회)】','【중첩 (2회)】'],['【중첩 (3회)】','【중첩 (3회)】']]]
];
const PB_COND=[
 ['HP',[['「HP : 가득」일 때 ','「HP : 가득」일 때'],['「HP : 3/4 이상」일 때 ','「HP : 3/4 이상」일 때'],['「HP : 1/2 이하」일 때 ','「HP : 1/2 이하」일 때'],['「HP : 1/3 이하」일 때 ','「HP : 1/3 이하」일 때'],['「HP : 1/4 이하」일 때 ','「HP : 1/4 이하」일 때'],['「HP : 1」일 때 ','「HP : 1」일 때']]],
 ['날씨',[['「날씨 : 맑음」일 때 ','맑음'],['「날씨 : 비」일 때 ','비'],['「날씨 : 모래바람」일 때 ','모래바람'],['「날씨 : 눈」일 때 ','눈'],['「날씨 : 짙은안개」일 때 ','짙은안개'],['「날씨 : 밤」일 때 ','밤'],['「날씨 : 별하늘」일 때 ','별하늘'],['「날씨 : 큰가뭄」일 때 ','큰가뭄 (상위)'],['「날씨 : 폭우」일 때 ','폭우 (상위)'],['「날씨 : 난기류」일 때 ','난기류 (상위)'],['「날씨 : 극한」일 때 ','극한 (상위)'],['「날씨 : 깊은밤」일 때 ','깊은밤 (상위)'],['「날씨」가 있을 때 ','어떤 날씨든 있을 때'],['「날씨」가 없을 때 ','날씨가 없을 때']]],
 ['필드·룸',[['「필드 : 그래스필드」일 때 ','그래스필드'],['「필드 : 일렉트릭필드」일 때 ','일렉트릭필드'],['「필드 : 미스트필드」일 때 ','미스트필드'],['「필드 : 사이코필드」일 때 ','사이코필드'],['「룸 : 트릭룸」일 때 ','트릭룸'],['「룸 : 매직룸」일 때 ','매직룸'],['「룸 : 원더룸」일 때 ','원더룸'],['「필드의 상태 : 중력」일 때 ','중력']]],
 ['자신의 상태',[['상태 이상일 때 ','상태 이상일 때'],['「화상」 상태일 때 ','「화상」 상태일 때'],['「독」「맹독」 상태일 때 ','「독」「맹독」 상태일 때'],['「마비」 상태일 때 ','「마비」 상태일 때'],['「잠듦」 상태일 때 ','「잠듦」 상태일 때'],['「혼란」 상태일 때 ','「혼란」 상태일 때'],['능력이 상승해 있을 때 ','능력이 상승해 있을 때'],['능력이 감소해 있을 때 ','능력이 감소해 있을 때'],['「소지품 : -」일 때 ','소지품이 없을 때'],['하늘 위에 떠 있을 때 ','하늘 위에 떠 있을 때']]],
 ['상대·아군',[['「정면」이 상태 이상일 때 ','정면이 상태 이상일 때'],['「정면」의 능력이 상승해 있을 때 ','정면의 능력이 상승해 있을 때'],['「빈사」 상태인 아군이 있을 때 ','빈사 상태인 아군이 있을 때'],['아군이 「HP : 1/2 이하」일 때 ','아군이 HP 1/2 이하일 때'],['적진에 같은 『역할』이 있을 때 ','적진에 같은 역할이 있을 때'],['적진에 「타입 : ○○」이 있을 때 ','적진에 특정 타입이 있을 때 (○○ 수정)'],['상대가 「전체기」를 내보냈을 때 ','상대가 전체기를 내보냈을 때'],['상대가 「변화기」를 내보냈을 때 ','상대가 변화기를 내보냈을 때'],['상대가 교대했을 때 ','상대가 교대했을 때'],['상대의 공격을 받았을 때 ','상대의 공격을 받았을 때'],['상대보다 「스피드」가 높을 때 ','상대보다 스피드가 높을 때']]],
 ['행동 순서·명중',[['상대보다 먼저 행동했을 때 ','상대보다 먼저 행동했을 때'],['상대보다 늦게 행동했을 때 ','상대보다 늦게 행동했을 때'],['자신의 기술이 급소에 맞았을 때 ','자신의 기술이 급소에 맞았을 때'],['자신의 기술이 명중하지 않았을 때 ','자신의 기술이 명중하지 않았을 때'],['「상성 : 2배~8배」인 기술을 받았을 때 ','효과가 굉장한 기술을 받았을 때'],['「상성 : 1/2배 이하」인 기술을 받았을 때 ','효과가 별로인 기술을 받았을 때'],['「접촉기」를 받았을 때 ','접촉기를 받았을 때'],['「물리기」를 받았을 때 ','물리기를 받았을 때'],['「특수기」를 받았을 때 ','특수기를 받았을 때']]],
 ['타이밍',[['턴 개시 시 ','턴 개시 시'],['턴 종료 시 ','턴 종료 시'],['자신이 「변화기」를 내보냈을 때 ','자신이 변화기를 내보냈을 때'],['자신이 「전체기」를 내보냈을 때 ','자신이 전체기를 내보냈을 때'],['「소지품 : 나무열매」를 소모했을 때 ','나무열매를 소모했을 때'],['「폼체인지」했을 때 ','폼체인지했을 때']]]
];
const PB_EFF=[
 ['위력',[
  ['boost','타입 기술 강화',({ty,mul})=>`자신의 「${ty}」 기술의 대미지를 강화(${mul}배)한다.`,['ty','mul']],
  ['boostm','특정 기술 강화',({mv,mul})=>`자신의 기술 「${mv}」의 위력을 강화(${mul}배)한다.`,['mv','mul']],
  ['boostc','분류 기술 강화',({cat,mul})=>`자신의 「${cat}」의 대미지를 강화(${mul}배)한다.`,['cat','mul']],
  ['boostn','다음 기술 2배',()=>`다음 기술의 위력을 2배로 만든다.`,[]],
  ['nonstab','타입 비일치 강화',({mul})=>`타입 비일치 기술의 대미지를 강화(${mul}배)한다.`,['mul']],
  ['nonstabt','타입 비일치 ○ 강화',({ty,mul})=>`자신의 타입 비일치 「${ty}」 기술의 위력을 강화(${mul}배)한다.`,['ty','mul']],
  ['wideup','전체기 강화',({mul})=>`자신의 「전체기」의 위력을 강화(${mul}배)한다.`,['mul']]]],
 ['방어',[
  ['guard','타입 피해 완화',({ty,mul})=>`「${ty}」 기술로 받을 대미지를 완화(${mul}배)한다.`,['ty','mul']],
  ['guardc','분류 피해 완화',({cat,mul})=>`「${cat}」로 받을 대미지를 완화(${mul}배)한다.`,['cat','mul']],
  ['guardall','모든 기술 피해 완화',({mul})=>`기술로 받을 대미지를 완화(${mul}배)한다.`,['mul']],
  ['half','타입 피해 반감',({ty})=>`「${ty}」 기술로 받을 대미지를 반감한다.`,['ty']],
  ['null','타입 무효화',({ty})=>`「${ty}」 기술을 무효화한다.`,['ty']],
  ['nullc','분류 무효화',({cat})=>`자신에 대한 「${cat}」를 무효화한다.`,['cat']],
  ['endure','빈사 방지',()=>`기술 대미지로 「빈사」 상태가 되지 않는다.`,[]],
  ['evade','회피 강화',({mul,dur})=>`${dur}자신의 「회피」를 강화(${mul}배)한다.`,['mul','dur']],
  ['critg','급소 방호',({n,dur})=>`${dur}자신에 대한 기술이 급소에 맞기 어려워진다(C-${n}).`,['n','dur']]]],
 ['능력치',[
  ['rank','자신 능력 상승',({st,n})=>`자신의 「${st} : +${n}」한다.`,['st','n']],
  ['rankally','아군 능력 상승',({st,n})=>`아군의 「${st} : +${n}」한다.`,['st','n']],
  ['rankd','정면 능력 감소',({st,n})=>`「정면」의 「${st} : -${n}」한다.`,['st','n']],
  ['rankall','상대 전체 감소',({st,n})=>`상대 전체의 「${st} : -${n}」한다.`,['st','n']],
  ['rankturn','턴 종료 시까지 강화',({st,mul})=>`턴 종료 시까지 자신의 「${st}」을(를) 강화(${mul}배)한다.`,['st','mul']],
  ['mult','자신 능력 강화 (배율)',({st,mul,dur})=>`${dur}자신의 「${st}」을(를) 강화(${mul}배)한다.`,['st','mul','dur']],
  ['multd','정면 능력 저하 (배율)',({st,mul,dur})=>`${dur}「정면」의 「${st}」을(를) 저하(${mul}배)시킨다.`,['st','mul','dur']],
  ['reset','자신 능력 변화 초기화',()=>`자신의 능력 변화를 원래대로 되돌린다.`,[]],
  ['nodrop','능력 감소 무시',({dur})=>`${dur}자신 이외에 의해 능력이 감소(저하)되지 않는다.`,['dur']],
  ['ignoreup','상대 능력 상승 무시',()=>`자신의 기술이 상대의 능력 상승(강화)을 무시한다.`,[]]]],
 ['급소·명중',[
  ['crit','타입 기술 급소',({ty,n})=>`자신의 「${ty}」 기술이 급소에 맞기 쉬워진다(C+${n}).`,['ty','n']],
  ['critm','특정 기술 급소',({mv,n})=>`자신의 기술 「${mv}」이(가) 급소에 맞기 쉬워진다(C+${n}).`,['mv','n']],
  ['nextcrit','다음 기술 급소',({n})=>`다음 기술이 급소에 맞기 쉬워진다(C+${n}).`,['n']],
  ['critall','모든 기술 급소',({n})=>`자신의 기술이 급소에 맞기 쉬워진다(C+${n}).`,['n']],
  ['sure','타입 기술 필중',({ty})=>`자신의 「${ty}」 기술이 필중한다.`,['ty']],
  ['surem','특정 기술 필중',({mv})=>`자신의 기술 「${mv}」이(가) 필중한다.`,['mv']],
  ['acc','명중 강화',({mul,dur})=>`${dur}자신의 「명중」을 강화(${mul}배)한다.`,['mul','dur']]]],
 ['상태 이상·변화',[
  ['status','타입 기술에 상태 부여',({ty,pr,cond,dur})=>`자신의 「${ty}」 기술이 명중한 상대를 ${pr} ${dur}「${cond}」 상태로 만든다.`,['ty','pr','cond','dur']],
  ['statusm','특정 기술에 상태 부여',({mv,pr,cond,dur})=>`자신의 기술 「${mv}」이(가) 명중한 상대를 ${pr} ${dur}「${cond}」 상태로 만든다.`,['mv','pr','cond','dur']],
  ['statusc','접촉한 상대에게 상태',({pr,cond,dur})=>`자신에게 「접촉기」를 내보낸 상대를 ${pr} ${dur}「${cond}」 상태로 만든다.`,['pr','cond','dur']],
  ['statusself','자신에게 상태 변화',({cond2,dur})=>`${dur}자신을 「${cond2}」 상태로 만든다.`,['cond2','dur']],
  ['statusally','아군에게 상태 변화',({cond2,dur})=>`${dur}아군을 「${cond2}」 상태로 만든다.`,['cond2','dur']],
  ['statusd','정면에게 상태 변화',({cond2,dur})=>`${dur}「정면」을 「${cond2}」 상태로 만든다.`,['cond2','dur']],
  ['cure','상태 이상 치유',()=>`자신의 상태 이상을 치유한다.`,[]],
  ['cureally','아군 상태 이상 치유',()=>`아군 전체의 상태 이상을 치유한다.`,[]],
  ['immune','상태 이상 면역',({cond,dur})=>`${dur}「${cond}」 상태가 되지 않는다.`,['cond','dur']],
  ['immuneall','모든 상태 이상 면역',({dur})=>`${dur}상태 이상이 되지 않는다.`,['dur']]]],
 ['특성 변화',[
  ['abilself','자신 특성 변경',({abn,dur})=>`${dur}자신을 「특성 : ${abn}」(으)로 변경한다.`,['abn','dur']],
  ['abild','정면 특성 변경',({abn,dur})=>`${dur}「정면」을 「특성 : ${abn}」(으)로 변경한다.`,['abn','dur']],
  ['abilnull','정면 특성 무효',({dur})=>`${dur}「정면」의 「특성」을 무효화한다.`,['dur']],
  ['abilcopy','정면 특성 복사',({dur})=>`${dur}자신을 「정면」과 같은 「특성」으로 변경한다.`,['dur']]]],
 ['HP',[
  ['heal','HP 회복',({fr})=>`자신의 「HP」를 ${fr}만큼 회복한다.`,['fr']],
  ['healally','아군 HP 회복',({fr})=>`아군의 「HP」를 ${fr}만큼 회복시킨다.`,['fr']],
  ['drain','정면 HP 드레인',({fr})=>`「정면」의 「HP」를 ${fr}만큼 드레인한다.`,['fr']],
  ['drainm','특정 기술 드레인',({mv})=>`자신의 기술 「${mv}」에 입힌 대미지의 1/2만큼 「HP」를 회복하는 효과를 부여한다.`,['mv']],
  ['dmg','정면 비례 대미지',({fr})=>`「정면」에게 ${fr}의 비례 대미지를 입힌다.`,['fr']],
  ['cost','HP 소비',({fr})=>`자신의 「HP」를 ${fr}만큼 소비한다.`,['fr']],
  ['noind','비례 대미지 면역',()=>`비례 대미지를 받지 않는다.`,[]]]],
 ['행동',[
  ['switch','임의 교대',()=>`임의 교대할 수 있다.`,[]],
  ['switchend','턴 종료 후 교대',()=>`턴 종료 이후 아군과 임의 교대할 수 있다.`,[]],
  ['move','기술 내보내기',({mv})=>`기술 「${mv}」을(를) 내보낸다.`,['mv']],
  ['extra','추가 행동',()=>`추가 행동을 얻는다.`,[]],
  ['prio','특정 기술 우선도',({mv,n})=>`자신의 기술 「${mv}」의 「우선도 : +${n}」한다.`,['mv','n']],
  ['prioall','모든 기술 우선도',({n})=>`자신의 기술에 「우선도 : +${n}」한다.`,['n']],
  ['forceswitch','정면 강제 교대',()=>`「정면」을 강제 교대시킨다.`,[]],
  ['uturn','유턴 부여',({mv})=>`자신의 기술 「${mv}」에 「유턴」 효과를 부여한다.`,['mv']],
  ['pursuit','추격 부여',({mv})=>`자신의 기술 「${mv}」에 「따라가때리기」 효과를 부여한다.`,['mv']],
  ['nopursuit','추격 무시',()=>`교대할 때 상대의 「따라가때리기」 효과를 무시한다.`,[]]]],
 ['기술 보조',[
  ['range','범위 확장',({mv})=>`자신의 기술 「${mv}」을(를) 「범위 : 상대 2체」로 만든다.`,['mv']],
  ['pierce','방어 관통',({mv})=>`자신의 기술 「${mv}」이(가) 상대의 「방어」 등의 기술을 관통한다.`,['mv']],
  ['piercew','방어 관통 (대미지 1/4배)',({mv})=>`자신의 기술 「${mv}」이(가) 상대의 「방어」 상태를 무시한다. 이때 기술의 대미지가 1/4배가 된다.`,['mv']],
  ['ignoretrait','특성 무시',({mv})=>`자신의 기술 「${mv}」이(가) 상대의 「특성」을 무시한다.`,['mv']],
  ['norecoil','반동 무시',({mv})=>`자신의 기술 「${mv}」의 반동을 받지 않는다.`,['mv']],
  ['nofail','연속 제한 무시',({mv})=>`자신의 기술 「${mv}」의 연속 제한을 무시한다.`,['mv']],
  ['typechg','기술 타입 변경',({mv,ty,dur})=>`${dur}자신의 기술 「${mv}」을(를) 「타입 : ${ty}」(으)로 만든다.`,['mv','ty','dur']],
  ['addtype','자신 타입 추가',({ty,dur})=>`${dur}자신에게 「타입 : ${ty}」을(를) 추가한다.`,['ty','dur']]]],
 ['필드 전개',[
  ['weather','날씨 전개',({wt,dur})=>`${dur}필드의 상태를 「날씨 : ${wt}」(으)로 만든다.`,['wt','dur']],
  ['field','필드 전개',({fd,dur})=>`${dur}필드의 상태를 「필드 : ${fd}」(으)로 만든다.`,['fd','dur']],
  ['room','룸 전개',({rm,dur})=>`${dur}필드의 상태를 「룸 : ${rm}」(으)로 만든다.`,['rm','dur']],
  ['hazard','설치기 설치',({hz})=>`적진에 「${hz}」을(를) 설치한다.`,['hz']],
  ['nohazard','설치물 무시',({dur})=>`${dur}자진의 「설치물」의 영향을 받지 않는다.`,['dur']],
  ['clearobj','설치기 제거',()=>`자진의 「설치기」를 제거한다.`,[]],
  ['wall','장벽 전개',({wl,dur})=>`${dur}자진에 「${wl}」을(를) 전개한다.`,['wl','dur']]]],
 ['기타',[
  ['dexblock','데이터 해석 차단',()=>`자신에 대한 데이터 해석을 차단한다.`,[]],
  ['float','하늘 위',({dur})=>`${dur}하늘 위에 떠오른다.`,['dur']],
  ['basest','종족치 상승',({st})=>`「${st}」의 종족치를 1랭크 상승시킨다.`,['st']],
  ['role','역할 취급',({rl})=>`이 포텐셜을 『${rl}』(으)로 취급한다.`,['rl']],
  ['itemkeep','소지품 보호',()=>`「소지품」을 빼앗기거나 파괴되지 않는다.`,[]],
  ['custom','직접 입력',({txt})=>txt,['txt']]]]
];
const PB_FLAT=PB_EFF.flatMap(g=>g[1]);
const PB_STATUS=['화상','마비','독','맹독','잠듦','얼음','혼란','풀죽음','조이기','씨뿌리기','도발','앙코르','회복봉인'];
const PB_STATUS2=['가열','냉각','충전','집중','대타출동','아쿠아링','뿌리박기','날따름','길동무','회복봉인','도발','앙코르','혼란','풀죽음'];
const PB_PR=['반드시','높은 확률로','중확률로','저확률로','드물게','1할로','3할로','5할로'];
const PB_DEF={ty:'',mv:'',mul:'1.2',cat:'물리기',st:'공격',n:'1',pr:'드물게',cond:'화상',cond2:'가열',fr:'1/8',wt:'맑음',fd:'그래스필드',rm:'트릭룸',wl:'리플렉터',rl:'어태커',hz:'스텔스록',dur:'',abn:'',txt:''};
const PB_DUR=[['','무제한'],['턴 종료 시까지 ','턴 종료 시까지'],['2턴 동안 ','2턴 동안'],['3턴 동안 ','3턴 동안'],['5턴 동안 ','5턴 동안']];
const PB_DURV={'':1,'턴 종료 시까지 ':0.5,'2턴 동안 ':0.7,'3턴 동안 ':0.8,'5턴 동안 ':0.9};
const PB_ST2V={가열:4,냉각:3.5,충전:3.5,집중:3,대타출동:3.5,아쿠아링:2.5,뿌리박기:2.5,날따름:2,길동무:3,회복봉인:3,도발:3,앙코르:3,혼란:3.5,풀죽음:5};
const PB_STV={풀죽음:2,잠듦:1.5,얼음:1.5,혼란:0.5,맹독:0.5,조이기:0.5,씨뿌리기:0.5,도발:1,앙코르:1,회복봉인:1};

function jo(s){const bt=c=>{const k=c.charCodeAt(0)-0xAC00;return k>=0&&k<11172?(k%28):(/[0-9]/.test(c)?([0,1,3,6,7,8].includes(+c)?1:0):(/[A-Za-z]/.test(c)?0:-1))};
 return String(s||'').replace(/([^\s])([」』])(이\(가\)|을\(를\)|과\(와\)|은\(는\)|\(으\)로)/g,(m,c,q,j)=>{const b=bt(c);if(b<0)return m;const has=b>0;const r={'이(가)':has?'이':'가','을(를)':has?'을':'를','과(와)':has?'과':'와','은(는)':has?'은':'는','(으)로':(has&&b!==8)?'으로':'로'}[j];return c+q+r})}
/* ===== 추천 · 밸류 수지 (효과값 − 조건값 ≤ 예산) ===== */
const PR_HIDDEN=true;/* 추천·수지 계산 보류 · false로 바꾸면 ✨ 추천 버튼, 「← 추천으로」, 제작기의 수지 표시가 다시 나온다 */
const PR_BUDGET={race:1.2,excl:3.0};/* 종족 포텐셜은 「델타 포스」(상시 비자속 1.5배)를 2.0으로 보고 그 이하만 허용 */
const PR_PRV={'반드시':5,'높은 확률로':4,'5할로':3.5,'중확률로':3,'3할로':2.5,'저확률로':2,'1할로':1.5,'드물게':1.5};
const PR_FRV={'1/16':1.5,'1/8':2.5,'1/6':3,'1/4':3.5,'1/3':4,'1/2':5,'모두':6};
const PR_HZV={'스텔스록':5,'독압정':4,'압정뿌리기':3.5,'끈적끈적네트':3.5};
function prEffVal(eff,P){const n=+P.n||1,mul=+P.mul||1;const D=PB_DURV[P.dur||'']||1;switch(eff){
 case 'move':return 6;case 'extra':return 6;
 case 'rank':return n*4.5;case 'rankally':return n*5;case 'rankd':return n*4;case 'rankall':return n*5;
 case 'mult':return (mul>=1.5?3.5:mul>=1.33?2.5:1.5)*D;case 'multd':return 3*D;case 'rankturn':return mul>=1.5?2.5:1.2;
 case 'abilself':return 3*D;case 'abild':return 4*D;case 'abilnull':return 3.5*D;case 'abilcopy':return 3*D;case 'statusally':return ((PB_ST2V[P.cond2]||2.5)+0.5)*D;case 'statusd':return ((PB_ST2V[P.cond2]||2.5)+0.5)*D;
 case 'reset':return 2;case 'nodrop':return 2.5*D;case 'ignoreup':return 2.5;
 case 'nextcrit':return n*1.5;case 'crit':return n*2.5;case 'critm':return n*2;case 'critall':return n*3;case 'sure':return 3;case 'surem':return 2;case 'acc':return 1.5*D;
 case 'status':return ((PR_PRV[P.pr]||3)+(PB_STV[P.cond]||0))*D;case 'statusm':return ((PR_PRV[P.pr]||3)-0.5+(PB_STV[P.cond]||0))*D;case 'statusc':return ((PR_PRV[P.pr]||3)+(PB_STV[P.cond]||0))*D;case 'statusself':return (PB_ST2V[P.cond2]||2.5)*D;
 case 'cure':return 1.5;case 'cureally':return 4;case 'immune':return 1.5*D;case 'immuneall':return 3.5*D;
 case 'heal':return PR_FRV[P.fr]||3;case 'healally':return (PR_FRV[P.fr]||3)+0.5;case 'drain':return PR_FRV[P.fr]||3;case 'drainm':return 2.5;case 'dmg':return 2.5;case 'noind':return 1.5;case 'cost':return 0;
 case 'switch':return 3;case 'switchend':return 2.5;case 'forceswitch':return 4;case 'prio':return n*4;case 'prioall':return n*5;case 'pursuit':return 3.5;case 'nopursuit':return 1.5;case 'uturn':return 3.5;
 case 'range':return 3;case 'pierce':return 5;case 'piercew':return 2.5;case 'ignoretrait':return 2.5;case 'norecoil':return 1.5;case 'nofail':return 1.5;case 'typechg':return 2*D;case 'addtype':return 3*D;
 case 'weather':return 3.5*D;case 'field':return 3.5*D;case 'room':return 3.5*D;case 'clearobj':return 2;case 'wall':return 4*D;case 'hazard':return PR_HZV[P.hz]||4;case 'nohazard':return 2*D;
 case 'dexblock':return 1;case 'float':return 2*D;case 'role':return 2;case 'itemkeep':return 1.5;case 'basest':return 3.5;case 'nonstab':return mul>=1.5?2:1.2;case 'nonstabt':return mul>1.5?2:1.2;
 case 'endure':return 3;case 'evade':return 3*D;case 'critg':return n*1*D;
 case 'boost':case 'boostm':case 'boostc':case 'boostn':case 'wideup':return mul>=1.5?4:3;case 'guard':case 'guardc':case 'guardall':return 3;case 'half':return 3.5;case 'null':case 'nullc':return 5;
 default:return 3}}
const PR_TAGV={'1/시':1,'2/시':0.6,'3/시':0.4,'N/시':0.3,'자동':0,'선행':0,'사전':0,'임의':-0.5,'강제':0,'방호':0,'방호 (조건)':0,'수세':1,'공세':1,'동조':1.5,'동조 (아군)':1.2,'동조 (상대)':0.5,
 '등장':0.4,'등장 (통상 교대)':0.7,'등장 (임의 교대)':1,'등장 (죽어내밀기)':0.7,'등장 (상대)':0.5,'퇴장':0.8,'퇴장 (통상 교대)':0.8,'퇴장 (임의 교대)':1.2,'퇴장 (강제 교대)':1.5,'퇴장 (빈사)':1.5,
 '지연 (2턴)':1,'지연 (3턴)':1.5,'지연 (아군, 2턴)':1,'지원':0,'지원 (빈사)':0,'함성':1.8,'유일':0.2,'소진':0.3,'탈진':0.6,'보급':0.9,'공유':0.3,'야생':0};
const PR_CONDV=[[/「HP : 가득」/,1],[/3\/4 이상/,0.5],[/1\/2 이하/,1],[/1\/3 이하/,1.5],[/1\/4 이하/,2],[/「HP : 1」/,3],
 [/「날씨 : [^」]+」일 때/,1],[/「날씨」가 있을 때/,0.5],[/「날씨」가 없을 때/,0.3],[/「필드 : [^」]+」일 때/,1.2],[/「룸 : [^」]+」일 때/,1.5],[/중력/,2],
 [/^상태 이상일 때/,1.5],[/「(화상|독|마비|잠듦|혼란|얼음)」[^일]*상태일 때/,1.8],[/능력이 상승해/,0.8],[/능력이 감소해/,1],[/「소지품 : -」/,1.5],[/하늘 위/,1],
 [/「정면」이 상태 이상/,1.2],[/「정면」의 능력이 상승/,1],[/「빈사」 상태인 아군/,1],[/아군이 「HP/,1],[/같은 『역할』/,1.5],[/적진에 「타입/,1.2],[/상대가 「전체기」/,1.5],[/상대가 「변화기」/,1.2],[/상대가 교대했을 때/,1.5],
 [/먼저 행동했을 때/,0.5],[/늦게 행동했을 때/,0.5],[/급소에 맞았을 때/,2],[/명중하지 않았을 때/,2],[/2배~8배/,1.5],[/1\/2배 이하/,1.5],[/「접촉기」를 받았을 때/,1],[/「(물리기|특수기)」를 받았을 때/,0.7],
 [/턴 개시 시/,0],[/턴 종료 시/,0],[/「변화기」를 내보냈을 때/,0.7],[/「전체기」를 내보냈을 때/,0.7],[/나무열매」를 소모/,1.5],[/「폼체인지」/,2],[/상대의 공격을 받았을 때/,0.5],[/「스피드」가 높을 때/,0.5],[/기술이 명중했을 때/,0.5]];
function prTagVal(tag){const t=tag.trim();if(PR_TAGV[t]!=null)return PR_TAGV[t];const m=t.match(/^중첩 \((\d+)회\)$/);if(m)return 0;const b=t.replace(/\s*\(.*$/,'');return PR_TAGV[b]!=null?PR_TAGV[b]:0}
function prStackN(tags){for(const t of tags){const m=t.match(/^중첩 \((\d+)회\)$/);if(m)return +m[1]}return 1}
function prBalance(lines,ctx){let ev=0;const credits=[];const seenTags=new Set();let cost=0;
 for(const ln of lines){const P=Object.assign({},PB_DEF,ln.pr);const tags=(String(ln.trig||'').match(/【([^】]*)】/g)||[]).map(x=>x.slice(1,-1));
  const n=prStackN(tags);let v=prEffVal(ln.eff,P)*n;if(ln.eff==='cost')cost+=(PR_FRV[P.fr]||3)*0.8;else ev+=v;
  for(const t of tags){const k=t.trim();if(seenTags.has(k))continue;seenTags.add(k);const tv=prTagVal(t);if(tv)credits.push(tv)}
  const c=String(ln.cond||'');for(const [re,val] of PR_CONDV)if(re.test(c)){let add=val;if(ctx&&/「날씨 : [^」]+」일 때/.test(c)&&ctx.abWt&&c.includes(ctx.abWt))add=0.7;if(ctx&&/「필드 : [^」]+」일 때/.test(c)&&ctx.abFd&&c.includes(ctx.abFd))add=0.8;if(add)credits.push(add)}}
 /* 조건을 여러 개 섞어도 수지가 무한정 오르지 않게: 가장 센 조건만 온전히, 다음은 절반, 그다음은 1/4… */
 credits.sort((a,b)=>b-a);let cc=cost;credits.forEach((v,i)=>{cc+=v*Math.pow(0.5,i)});
 return {ev:+ev.toFixed(1),cc:+cc.toFixed(1),net:+(ev-cc).toFixed(1),n:credits.length}}
function prBalanceHTML(b,budget){const ok=b.net<=budget;return `<span class="${ok?'okc':'warn'}" title="효과값 − 조건값 ≤ 예산 ${budget}">수지 ${b.ev} − ${b.cc} = ${b.net}</span>`}

/* ===== 추천 (포켓몬 데이터에서 새로 짜기 · 계통별 · 수지 검사) ===== */
function prBuildText(lines){return jo(lines.map((ln,i)=>{const E=PB_FLAT.find(e=>e[0]===ln.eff);const P=Object.assign({},PB_DEF,ln.pr);const body=E[2](P);return (lines.length>1?'①②③④⑤'[i]:'')+(ln.trig?ln.trig+'/':'')+(ln.cond||'')+body}).join('\n'))}
const PR_FAM=['등장','퇴장','함성','지연','교대·바운스','날씨·필드','상태 이상 연계','상태 변화','특성 변화','HP 조건','급소·명중','행동 순서','기술 보조','설치·장벽','동조·역할','소지품','비자속 강화','종족·올드'];
const PR_TY_WT={불꽃:'맑음',물:'비',바위:'모래바람',땅:'모래바람',강철:'모래바람',얼음:'눈',고스트:'짙은안개',악:'밤',에스퍼:'별하늘',비행:'별하늘',드래곤:'맑음',풀:'맑음',전기:'비',벌레:'맑음'};
const PR_TY_FD={풀:'그래스필드',전기:'일렉트릭필드',페어리:'미스트필드',에스퍼:'사이코필드',드래곤:'미스트필드',독:'미스트필드',격투:'사이코필드',노말:'그래스필드'};
const PR_TY_ST={불꽃:'화상',물:'혼란',전기:'마비',풀:'씨뿌리기',얼음:'얼음',독:'독',격투:'풀죽음',비행:'풀죽음',에스퍼:'혼란',페어리:'잠듦',땅:'풀죽음',바위:'풀죽음',고스트:'혼란',악:'풀죽음',벌레:'독',강철:'풀죽음',드래곤:'풀죽음',노말:'마비'};
const PR_TY_HZ={바위:'스텔스록',땅:'압정뿌리기',강철:'압정뿌리기',독:'독압정',벌레:'끈적끈적네트',고스트:'스텔스록',악:'압정뿌리기',풀:'끈적끈적네트'};
function prGenerate(C,excl){const out=[];const budget=excl?PR_BUDGET.excl:PR_BUDGET.race;
 const ab=C.abilEff;const abWt=(ab.match(/「날씨 : ([^」]+)」/)||[])[1];const abFd=(ab.match(/「필드 : ([^」]+)」/)||[])[1];const abSt=(ab.match(/「(화상|마비|독|맹독|잠듦|얼음|혼란)」/)||[])[1];
 /* 같은 아이디어를 조건이 약한 순으로 여러 안 적어 두고, 수지가 예산 안에 드는 첫 안을 고른다 */
 const add=(fam,title,why,variants,score)=>{for(const lines of variants){const b=prBalance(lines,{abWt,abFd});if(b.net>budget)continue;const txt=tagFix(prBuildText(lines));if(banHits(txt).length)continue;if(out.some(o=>o.txt===txt))return;out.push({fam,title,why,lines,txt,bal:b,score:score||5,kind:excl?'전용':'05. 속별'});return}};
 const R=C.roles.join(',');const atkRole=/어태커|어쌔신|킬러|퀄러|디스럽터|타이트엔드/.test(R),defRole=/블로커|바운서|타이트엔드/.test(R),spdRole=/러너|닌자/.test(R),supRole=/어시스트|옵저버|커맨더|서포터|클레릭/.test(R),aceRole=/에이스/.test(R),noRole=!R;
 const st=C.stats;const isPhys=st.atk>=st.spa;const atkSt=isPhys?'공격':'특공';const defSt=st.def>=st.spd?'방어':'특방';const upSt=defRole?defSt:atkSt;const fast=st.spe>=13,slow=st.spe<=9,bulky=st.hp>=13||st.def>=13||st.spd>=13,frail=st.hp<=8&&st.def<=8&&st.spd<=8;
 const atkMoves=C.moves.filter(m=>m.pow>0);const sig=atkMoves.slice().sort((a,b)=>b.pow-a.pow)[0];const stMoves=C.moves.filter(m=>m.cat==='변화');const stMove=stMoves[0];
 const offTypes=[...C.mtypes].filter(x=>x&&!C.types.includes(x));const offType=offTypes[0];const prioMove=atkMoves.find(m=>m.prio>0);const touchMove=atkMoves.find(m=>m.touch);const wideMove=C.moves.find(m=>/상대 2체|상대 전체|자신 이외|전체/.test(m.rng));
 const nm=C.name;const t1=C.types[0]||'';const t2=C.types[1]||'';const stabTy=C.types.find(x=>atkMoves.some(m=>m.ty===x))||t1;
 const wt=abWt||PR_TY_WT[t1]||PR_TY_WT[t2];const fd=abFd||PR_TY_FD[t1]||PR_TY_FD[t2];const cm=abSt||PR_TY_ST[t1]||PR_TY_ST[t2]||'풀죽음';const hz=PR_TY_HZ[t1]||PR_TY_HZ[t2];
 const ONE=excl?'【1/시】【선행】':'【1/시】【사전】';const L=(trig,cond,eff,pr)=>({trig,cond,eff,pr:pr||{}});
 /* 1. 등장 */
 if(stMove&&excl)add('등장',`${stMove.n} 선수`,`전용 한정 · 등장 시 「${stMove.n}」 무료 (종족 칸에는 과한 밸류라 제외)`,[[L('【1/시】【선행】【등장 (죽어내밀기)】','','move',{mv:stMove.n})]],7);
 if(spdRole||aceRole)add('등장',`가속 등장`,`${spdRole?'러너':'에이스'} → 죽어내밀기로 나온 턴만 스피드 강화`,[[L('【등장 (죽어내밀기)】','','mult',{st:'스피드',mul:'1.5',dur:'턴 종료 시까지 '})]],6);
 if(defRole)add('등장',`장갑 전개`,`블로커 → 통상 교대로 나온 턴만 ${defSt} 강화 (장갑형, 1.2배)`,[[L('【방호】【등장 (통상 교대)】','','mult',{st:'방어/특방',mul:'1.2',dur:'턴 종료 시까지 '})]],6);
 if(aceRole||atkRole)add('등장',`기세 등장`,`${aceRole?'에이스':'어태커 계열'} → 죽어내밀기로 나오면 다음 기술 급소 C+1`,[[L('【등장 (죽어내밀기)】','','nextcrit',{n:'1'})]],6);
 if(C.eggs.includes('괴수')||C.eggs.includes('드래곤'))add('등장',`위압의 ${nm}`,`「알그룹 : ${C.eggs.includes('괴수')?'괴수':'드래곤'}」 → 등장한 턴 상대 정면 스피드 -1 (1번)`,[[L('【1/시】【자동】【등장 (통상 교대)】','','rankd',{st:'스피드',n:'1'})],[L('【1/시】【자동】【등장 (죽어내밀기)】','「HP : 가득」일 때 ','rankd',{st:'스피드',n:'1'})],[L('【1/시】【자동】【동조】','','rankd',{st:'스피드',n:'1'})]],4);
 /* 2. 퇴장 */
 if(supRole||noRole||bulky)add('퇴장',`헌신의 ${nm}`,`교대로 물러날 때 아군 회복 (특상 상어 지느러미형)`,[[L('【퇴장 (통상 교대)】','','healally',{fr:'1/8'})],[L('【1/시】【퇴장 (통상 교대)】','','healally',{fr:'1/8'})],[L('【1/시】【퇴장 (통상 교대)】','','healally',{fr:'1/16'})]],supRole?8:5);
 if(supRole||spdRole)add('퇴장',`바통 ${nm}`,`물러나면서 아군에게 ${spdRole?'스피드':atkSt} +1 (KMF형) · 예산에 안 들면 「집중」 전달`,[[L('【1/시】【퇴장 (빈사)】','','rankally',{st:spdRole?'스피드':atkSt,n:'1'})],[L('【1/시】【퇴장 (빈사)】','','statusally',{cond2:'집중',dur:'턴 종료 시까지 '})],[L('【1/시】【퇴장 (통상 교대)】','','statusally',{cond2:'집중',dur:'턴 종료 시까지 '})]],6);
 add('퇴장',`유지의 ${nm}`,`빈사로 쓰러질 때 다음 아군 치유 (사제형)`,[[L('【퇴장 (빈사)】','','cureally')],[L('【1/시】【퇴장 (빈사)】','','cureally')],[L('【1/시】【퇴장 (빈사)】','','healally',{fr:'1/8'})]],bulky?5:4);
 if(hz)add('퇴장',`${hz} 남기기`,`「${t1}」 계열 → 쓰러질 때 적진에 「${hz}」 · 설치기는 강해서 빈사 조건`,[[L('【1/시】【퇴장 (빈사)】','','hazard',{hz})],[L('【1/시】【퇴장 (빈사)】','「빈사」 상태인 아군이 있을 때 ','hazard',{hz})]],6);
 /* 3. 함성 */
 if(atkRole||aceRole||noRole)add('함성',`개가의 ${nm}`,`쓰러뜨리면 회복 → 연전형`,[[L('【함성】','「HP : 1/2 이하」일 때 ','heal',{fr:'1/3'})],[L('【함성】','','heal',{fr:'1/4'})],[L('【함성】','','heal',{fr:'1/8'})]],7);
 if(C.eggs.includes('인간형'))add('함성',`게릴라 ${nm}`,`「알그룹 : 인간형」 → 쓰러뜨리면 임의 교대 (게릴라형)`,[[L('【1/시】【함성】','','switch')]],8);
 if(C.types.includes('불꽃'))add('함성',`재점화`,`불꽃 타입 → 쓰러뜨리면 「가열」`,[[L('【함성】【탈진】','','statusself',{cond2:'가열'})]],7);
 if(C.types.includes('물')||C.types.includes('얼음'))add('함성',`냉각 ${nm}`,`물·얼음 타입 → 쓰러뜨리면 「냉각」`,[[L('【함성】【탈진】','','statusself',{cond2:'냉각'})]],6);
 if(C.types.includes('전기'))add('함성',`충전 ${nm}`,`전기 타입 → 쓰러뜨리면 「충전」`,[[L('【함성】【탈진】','','statusself',{cond2:'충전'})]],6);
 if(aceRole||spdRole)add('함성',`가속 함성`,`${aceRole?'에이스':'러너'} → 쓰러뜨렸을 때 스피드 +1`,[[L('【함성】','','rank',{st:'스피드',n:'1'})],[L('【1/시】【함성】','','rank',{st:'스피드',n:'1'})],[L('【1/시】【함성】','「HP : 1/4 이하」일 때 ','rank',{st:'스피드',n:'1'})],[L('【함성】','','mult',{st:'스피드',mul:'1.33',dur:'2턴 동안 '})]],6);
 if(frail||atkRole)add('함성',`기세의 ${nm}`,`쓰러뜨리면 ${upSt} +1`,[[L('【함성】','','rank',{st:upSt,n:'1'})],[L('【1/시】【함성】','','rank',{st:upSt,n:'1'})],[L('【1/시】【함성】','「HP : 1/4 이하」일 때 ','rank',{st:upSt,n:'1'})],[L('【함성】','','mult',{st:upSt,mul:'1.33',dur:'2턴 동안 '})]],5);
 if(hz)add('함성',`${hz} 개선`,`「${t1}」 계열 → 쓰러뜨리면 1번 「${hz}」 설치`,[[L('【1/시】【함성】','','hazard',{hz})]],5);
 if(supRole)add('함성',`개선의 ${nm}`,`서포터 → 쓰러뜨리면 아군 전체 치유`,[[L('【함성】','','cureally')]],5);
 /* 4. 지연 */
 if(C.eggs.includes('비행')||C.types.includes('비행'))add('지연',`선회 ${nm}`,`비행 계열 → 2턴째부터 턴 종료 후 교대 (링크형)`,[[L('【1/시】【지연 (2턴)】','','switchend')],[L('【1/시】【지연 (3턴)】','','switchend')]],7);
 if(bulky||defRole)add('지연',`농성의 ${nm}`,`오래 버티는 종족치 → 2턴째부터 턴 종료 시 1/16 회복`,[[L('【지연 (2턴)】','턴 종료 시 ','heal',{fr:'1/16'})]],6);
 if(slow)add('지연',`예열의 ${nm}`,`느린 종족치 → 3턴째에 ${upSt} +1 (중검형)`,[[L('【지연 (3턴)】','','rank',{st:upSt,n:'1'})],[L('【지연 (3턴)】','「HP : 1/2 이하」일 때 ','rank',{st:upSt,n:'1'})],[L('【1/시】【지연 (3턴)】','「HP : 1/2 이하」일 때 ','rank',{st:upSt,n:'1'})]],6);
 if(wt)add('지연',`${wt} 부르기`,`「${t1}」 계열 → 2턴째에 「날씨 : ${wt}」 전개 (1번 · 2턴)`,[[L('【지연 (2턴)】【보급】','「날씨」가 없을 때 ','weather',{wt,dur:'2턴 동안 '})],[L('【1/시】【지연 (2턴)】','「날씨」가 없을 때 ','weather',{wt,dur:'턴 종료 시까지 '})]],5);
 /* 5. 교대·바운스 */
 if(defRole||bulky)add('교대·바운스',`바운스 ${nm}`,`공격을 받아낸 뒤 임의 교대 (바운스형)`,[[L('【1/시】【수세】','상대의 공격을 받았을 때 ','switch')],[L('【1/시】【수세】','「HP : 1/2 이하」일 때 상대의 공격을 받았을 때 ','switch')]],defRole?8:5);
 if(sig&&(atkRole||spdRole||noRole))add('교대·바운스',`${sig.n} 유턴`,`「${sig.n}」에 유턴 효과 → 치고 빠지기 (게릴라형)`,[[L(ONE,'','uturn',{mv:sig.n})],[L(ONE,'「HP : 1/2 이하」일 때 ','uturn',{mv:sig.n})],[L(ONE,'「HP : 1/4 이하」일 때 ','uturn',{mv:sig.n})]],7);
 if(sig)add('교대·바운스',`${sig.n} 추격`,`상대의 교대를 노린다 → 「${sig.n}」에 따라가때리기 (카운터형)`,[[L(ONE,'','pursuit',{mv:sig.n})],[L(ONE,'「HP : 1/2 이하」일 때 ','pursuit',{mv:sig.n})],[L(ONE,'「HP : 1/4 이하」일 때 ','pursuit',{mv:sig.n})]],atkRole?7:5);
 if(spdRole||fast)add('교대·바운스',`이탈의 ${nm}`,`빠름 → 상대가 교대했을 때 턴 종료 후 교대`,[[L('【1/시】','상대가 교대했을 때 ','switchend')]],5);
 if(C.types.includes('에스퍼')||C.types.includes('고스트'))add('교대·바운스',`전이의 ${nm}`,`${C.types.includes('에스퍼')?'에스퍼':'고스트'} 타입 → 등장한 턴 종료 후 교대 (링크형)`,[[L('【1/시】【등장】','','switchend')]],6);
 /* 6. 날씨·필드 */
 if(wt){add('날씨·필드',`${wt} 적응`,`${abWt?`특성 「${C.ability}」`:`「${t1}」 타입`} → 「날씨 : ${wt}」일 때 턴 종료 시 회복`,[[L('',`「날씨 : ${wt}」일 때 턴 종료 시 `,'heal',{fr:'1/8'})],[L('',`「날씨 : ${wt}」일 때 턴 종료 시 `,'heal',{fr:'1/16'})]],abWt?9:6);
  add('날씨·필드',`${wt} 개막`,`등장하면 1번 「날씨 : ${wt}」 전개 (2턴 · 특성 없이도 날씨 파티)`,[[L('【1/시】【자동】【등장 (죽어내밀기)】','「날씨」가 없을 때 ','weather',{wt,dur:'2턴 동안 '})],[L('【1/시】【자동】【등장 (죽어내밀기)】','「날씨」가 없을 때 ','weather',{wt,dur:'턴 종료 시까지 '})]],abWt?7:5);
  if(atkRole||aceRole)add('날씨·필드',`${wt} 질주`,`「날씨 : ${wt}」일 때 다음 기술 급소 C+1`,[[L('',`「날씨 : ${wt}」일 때 `,'nextcrit',{n:'1'})]],5)}
 if(fd){add('날씨·필드',`${fd} 적응`,`${abFd?`특성 「${C.ability}」`:`「${t1}」 타입`} → 「필드 : ${fd}」일 때 상태 이상 면역`,[[L('',`「필드 : ${fd}」일 때 `,'immuneall')],[L('',`「필드 : ${fd}」일 때 `,'immune',{cond:cm})]],abFd?8:5);
  add('날씨·필드',`${fd} 개막`,`등장하면 1번 「필드 : ${fd}」 전개 (2턴)`,[[L('【1/시】【자동】【등장 (죽어내밀기)】','','field',{fd,dur:'2턴 동안 '})],[L('【1/시】【자동】【등장 (죽어내밀기)】','','field',{fd,dur:'턴 종료 시까지 '})]],abFd?7:5)}
 if(slow)add('날씨·필드',`트릭룸 적응`,`느린 종족치 → 「룸 : 트릭룸」일 때 급소 C+1`,[[L('','「룸 : 트릭룸」일 때 ','nextcrit',{n:'1'})]],6);
 if(C.types.includes('비행')||C.abilEff.includes('부유'))add('날씨·필드',`난기류 타기`,`비행 계열 → 「날씨 : 난기류」일 때 스피드 강화`,[[L('','「날씨 : 난기류」일 때 ','mult',{st:'스피드',mul:'1.5'})],[L('','「날씨 : 난기류」일 때 ','mult',{st:'스피드',mul:'1.2'})]],5);
 /* 7. 상태 이상 연계 */
 if(sig&&cm)add('상태 이상 연계',`${stabTy}의 여운`,`「${stabTy}」 기술 명중 시 2턴 동안 「${cm}」 (익스펜션형 · DB와 같은 지속)`,[[L('','','status',{ty:stabTy,pr:'저확률로',cond:cm,dur:'2턴 동안 '})],[L('','','status',{ty:stabTy,pr:'드물게',cond:cm,dur:'2턴 동안 '})]],6);
 if(defRole||bulky)add('상태 이상 연계',`가시의 ${nm}`,`접촉기를 받으면 2턴 동안 「${cm}」`,[[L('【방호】','','statusc',{pr:'저확률로',cond:cm,dur:'2턴 동안 '})],[L('【방호】','','statusc',{pr:'드물게',cond:cm,dur:'2턴 동안 '})]],defRole?8:5);
 if(atkRole||aceRole||noRole)add('상태 이상 연계',`근성의 ${nm}`,`자신이 상태 이상일 때 ${atkSt} 강화 (근성형)`,[[L('','상태 이상일 때 ','mult',{st:atkSt,mul:'1.5'})],[L('','상태 이상일 때 ','mult',{st:atkSt,mul:'1.33'})],[L('','상태 이상일 때 ','mult',{st:atkSt,mul:'1.2'})]],6);
 if(abSt||atkRole)add('상태 이상 연계',`${abSt||'병자'} 사냥`,`${abSt?`특성 「${C.ability}」 연계 → `:''}정면이 상태 이상일 때 급소 C+1`,[[L('','「정면」이 상태 이상일 때 ','nextcrit',{n:'1'})]],abSt?8:5);
 if(sig&&(supRole||spdRole))add('상태 이상 연계',`${sig.n} 필중`,`정면이 상태 이상이면 「${sig.n}」 필중`,[[L('','「정면」이 상태 이상일 때 ','surem',{mv:sig.n})]],5);
 if(supRole)add('상태 이상 연계',`정화의 ${nm}`,`아군 전체 치유 · 조건을 세게 (1/시 + HP 1/2 이하)`,[[L('【1/시】','「HP : 1/2 이하」일 때 자신이 「변화기」를 내보냈을 때 ','cureally')],[L('【1/시】【자동】','「HP : 1/4 이하」일 때 ','cureally')]],7);
 if(C.types.includes('독')||C.types.includes('강철'))add('상태 이상 연계',`내독의 ${nm}`,`독·강철 → 「독」「맹독」 면역`,[[L('','','immune',{cond:'독'})]],4);
 /* 8. HP 조건 */
 if(bulky||defRole)add('HP 조건',`만전의 ${nm}`,`「HP : 가득」일 때 급소에 맞지 않도록 (멀티스케일 변형)`,[[L('【방호】','「HP : 가득」일 때 ','critg',{n:'2'})]],6);
 add('HP 조건',`궁지의 ${nm}`,`「HP : 1/4 이하」일 때 ${upSt} +1 (맹화형)`,[[L('【1/시】【자동】','「HP : 1/4 이하」일 때 ','rank',{st:upSt,n:'1'})],[L('【1/시】【자동】【탈진】','「HP : 1/4 이하」일 때 ','rank',{st:upSt,n:'1'})],[L('【1/시】【자동】','「HP : 1」일 때 ','rank',{st:upSt,n:'1'})]],atkRole?7:5);
 if(spdRole||supRole||noRole)add('HP 조건',`위기 탈출`,`「HP : 1/4 이하」가 되면 턴 종료 후 교대`,[[L('【1/시】【자동】','「HP : 1/4 이하」일 때 ','switchend')]],6);
 if(bulky)add('HP 조건',`끈기의 ${nm}`,`「HP : 1/2 이하」일 때 턴 종료 시 회복`,[[L('','「HP : 1/2 이하」일 때 턴 종료 시 ','heal',{fr:'1/8'})],[L('','「HP : 1/2 이하」일 때 턴 종료 시 ','heal',{fr:'1/16'})]],5);
 if(atkRole||aceRole)add('HP 조건',`사력의 ${nm}`,`「HP : 1」일 때 추가 행동 (1번)`,[[L('【1/시】【자동】','「HP : 1」일 때 ','extra')]],5);
 if(sig)add('HP 조건',`대가의 ${nm}`,`HP 1/4를 내고 「${sig.n}」 급소 C+2 (하이리스크)`,[[L(ONE,'','cost',{fr:'1/4'}),L('','','critm',{mv:sig.n,n:'2'})]],atkRole?5:3);
 /* 9. 급소·명중 */
 if(fast&&(atkRole||aceRole||noRole))add('급소·명중',`쾌속 ${nm}`,`스피드 ${C.g[5]} → 먼저 행동했을 때 급소 C+1`,[[L('','상대보다 먼저 행동했을 때 ','nextcrit',{n:'1'})]],7);
 if(slow&&sig)add('급소·명중',`후의 선`,`느린 종족치 → 늦게 행동했을 때 「${sig.n}」 필중`,[[L('','상대보다 늦게 행동했을 때 ','surem',{mv:sig.n})]],6);
 if(sig&&stMove)add('급소·명중',`${stMove.n} 조준`,`변화기 「${stMove.n}」 다음 턴 「${sig.n}」 급소 C+1 (예열형)`,[[L('【1/시】【자동】','자신이 「변화기」를 내보냈을 때 ','critm',{mv:sig.n,n:'1'})]],6);
 if(sig&&(/킬러|어쌔신/.test(R)))add('급소·명중',`${sig.n} 예리`,`킬러 계열 → 「${sig.n}」 급소 C+1 (예리형)`,[[L('','','critm',{mv:sig.n,n:'1'})]],8);
 if(sig&&sig.r&&+sig.r[8]&&+sig.r[8]<100)add('급소·명중',`${sig.n} 보정`,`명중 ${sig.r[8]}의 「${sig.n}」 → 1/시 필중 (사전 예고)`,[[L(ONE,'','surem',{mv:sig.n})]],7);
 if(aceRole)add('급소·명중',`각성의 ${nm}`,`에이스 → 빈사 아군이 있을 때 급소 C+1`,[[L('','「빈사」 상태인 아군이 있을 때 ','nextcrit',{n:'1'})]],7);
 /* 10. 행동 순서 (우선도는 강한 효과라 조건을 세게) */
 if(sig&&slow&&sig.prio<=0)add('행동 순서',`${sig.n} 선제`,`느린 종족치 → 「${sig.n}」 우선도 +1 · 우선도는 강해서 HP 1/4 이하 + 1/시`,[[L(ONE,'「HP : 1/4 이하」일 때 ','prio',{mv:sig.n,n:'1'})],[L(ONE,'「HP : 1」일 때 ','prio',{mv:sig.n,n:'1'})]],7);
 if(prioMove&&fast)add('행동 순서',`${prioMove.n} 가속`,`선공기 「${prioMove.n}」 → 먼저 행동했을 때 스피드 +1 (1번)`,[[L('【1/시】【자동】','「HP : 1/2 이하」일 때 상대보다 먼저 행동했을 때 ','rank',{st:'스피드',n:'1'})],[L('【1/시】【자동】','「HP : 1/4 이하」일 때 상대보다 먼저 행동했을 때 ','rank',{st:'스피드',n:'1'})]],5);
 if(stMove&&(supRole||spdRole))add('행동 순서',`${stMove.n} 속공`,`변화기 「${stMove.n}」 우선도 +1 · 1/시 + 사전 예고 + HP 1/2 이하`,[[L(ONE,'「HP : 1/2 이하」일 때 ','prio',{mv:stMove.n,n:'1'})],[L(ONE,'「HP : 1/4 이하」일 때 ','prio',{mv:stMove.n,n:'1'})]],6);
 if(slow&&(defRole||bulky))add('행동 순서',`후수의 ${nm}`,`늦게 행동했을 때 ${defSt} +1 (1번)`,[[L('【1/시】【자동】','「HP : 1/2 이하」일 때 상대보다 늦게 행동했을 때 ','rank',{st:defSt,n:'1'})],[L('【1/시】【자동】','「HP : 1/4 이하」일 때 상대보다 늦게 행동했을 때 ','rank',{st:defSt,n:'1'})]],5);
 /* 11. 기술 보조 */
 if(sig&&sig.rng==='1체'&&(st.atk>=13||st.spa>=13)&&(atkRole||noRole))add('기술 보조',`${sig.n} 확산`,`고화력 단일기 → 1/시 「상대 2체」 (광역확산형)`,[[L(ONE,'','range',{mv:sig.n})],[L(ONE,'「HP : 1/2 이하」일 때 ','range',{mv:sig.n})]],6);
 if(sig&&sig.pow>=110)add('기술 보조',`${sig.n} 안정`,`위력 ${sig.pow} → 반동·연속 제한 1/시 무시`,[[L(ONE,'','norecoil',{mv:sig.n})]],6);
 if(sig&&(atkRole||aceRole))add('기술 보조',`${sig.n} 관통`,jo(excl?`「${sig.n}」이(가) 상대의 「방어」 등을 1/시 관통 (전용 · 밸류 5)`:`「${sig.n}」이(가) 「방어」 상태를 무시하되 대미지 1/4배 (보이지않는주먹형)`),[[L(ONE,'','pierce',{mv:sig.n})],[L(ONE,'','piercew',{mv:sig.n})],[L(ONE,'「HP : 1/2 이하」일 때 ','piercew',{mv:sig.n})]],5);
 if(touchMove&&defRole)add('기술 보조',`${touchMove.n} 응수`,`접촉기를 받았을 때 「${touchMove.n}」 급소 C+1`,[[L('【1/시】【자동】','「접촉기」를 받았을 때 ','critm',{mv:touchMove.n,n:'1'})]],5);
 /* 12. 설치·장벽 (설치기·장벽은 강해서 조건을 세게) */
 if(hz)add('설치·장벽',`${hz} 설치`,`「${stabTy}」 기술 명중 시 1번 「${hz}」 · HP 1/2 이하 조건`,[[L('【1/시】【자동】',`「HP : 1/2 이하」일 때 자신의 「${stabTy}」 기술이 명중했을 때 `,'hazard',{hz})],[L('【1/시】【자동】',`「HP : 1/4 이하」일 때 자신의 「${stabTy}」 기술이 명중했을 때 `,'hazard',{hz})]],6);
 if(supRole)add('설치·장벽',`${C.types.includes('얼음')?'오로라베일':defSt==='방어'?'리플렉터':'빛의장막'} 전개`,`서포터 → 빈사로 쓰러질 때 1번 장벽 (2턴)`,[[L('【1/시】【퇴장 (빈사)】','','wall',{wl:C.types.includes('얼음')?'오로라베일':defSt==='방어'?'리플렉터':'빛의장막',dur:'2턴 동안 '})],[L('【1/시】【퇴장 (빈사)】','','wall',{wl:C.types.includes('얼음')?'오로라베일':defSt==='방어'?'리플렉터':'빛의장막',dur:'턴 종료 시까지 '})]],7);
 if(spdRole||fast)add('설치·장벽',`소닉 스니커`,`빠름 → 상대보다 스피드가 높을 때 설치물 무시`,[[L('','상대보다 「스피드」가 높을 때 ','nohazard')]],5);
 if(supRole||spdRole)add('설치·장벽',`청소의 ${nm}`,`죽어내밀기로 나오면 자진의 설치기 제거 (1번)`,[[L('【1/시】【자동】【등장 (죽어내밀기)】','','clearobj')]],5);
 /* 13. 동조·역할 */
 if(R&&!noRole){const rl=C.roles[0].replace(/[『』]/g,'');add('동조·역할',`${rl} 견제`,jo(`적진에 같은 『${rl}』이(가) 있을 때 ${upSt} +1 (동조 · 1번)`),[[L('【1/시】【자동】【동조】','','rank',{st:upSt,n:'1'})],[L('【1/시】【자동】【동조】','「HP : 1/2 이하」일 때 ','rank',{st:upSt,n:'1'})],[L('【1/시】【자동】【동조】','「HP : 1/4 이하」일 때 ','rank',{st:upSt,n:'1'})]],5);
  add('동조·역할',`${rl} 연대`,jo(`아군 같은 『${rl}』과(와) 함께일 때 급소 C+1 (동조 아군)`),[[L('【동조 (아군)】','','nextcrit',{n:'1'})]],4)}
 if(!aceRole&&(atkRole||noRole))add('동조·역할',`${nm}의 사명`,`빈사 아군이 있을 때 이 포텐셜을 『에이스』로 취급`,[[L('','「빈사」 상태인 아군이 있을 때 ','role',{rl:'에이스'})]],4);
 /* 14. 소지품 */
 add('소지품',`열매 애호가`,`나무열매를 소모했을 때 ${upSt} +1 (안 되면 추가 회복)`,[[L('【1/시】【자동】','「소지품 : 나무열매」를 소모했을 때 ','rank',{st:upSt,n:'1'})],[L('【1/시】【자동】','「HP : 1/4 이하」일 때 「소지품 : 나무열매」를 소모했을 때 ','rank',{st:upSt,n:'1'})],[L('','「소지품 : 나무열매」를 소모했을 때 ','heal',{fr:'1/8'})]],4);
 if(spdRole||frail)add('소지품',`맨몸의 ${nm}`,`소지품이 없을 때 스피드 강화 (곡예형)`,[[L('','「소지품 : -」일 때 ','mult',{st:'스피드',mul:'1.5'})],[L('','「소지품 : -」일 때 ','mult',{st:'스피드',mul:'1.2'})]],5);
 if(C.item)add('소지품',`${C.item} 사수`,`「${C.item}」 소지 → 빼앗기거나 파괴되지 않음`,[[L('','','itemkeep')]],4);
 /* 15. 비자속 강화 (위력 계열 중 유일하게 허용 · 예산의 기준점) */
 if(offType)add('비자속 강화',`델타 포스 : ${offType}`,`자속이 아닌 「${offType}」 기술 보유 → 타입 비일치 강화 (DB의 「델타 포스」와 같은 밸류, 예산 기준점)`,[[L('','','nonstabt',{ty:offType,mul:'1.5'})]],atkRole?8:6);
 if(offTypes.length>=2)add('비자속 강화',`만능의 ${nm}`,`비자속 기술 ${offTypes.length}종 → 타입 비일치 전체 1.3배 (탈진)`,[[L('【탈진】','','nonstab',{mul:'1.3'})]],5);
 /* 16. 종족·올드 */
 if(C.old)add('종족·올드',`옛것의 ${nm}`,`『올드 타입』 → 능력 감소 무시`,[[L('','','nodrop')]],7);
 if(st.hp<=8)add('종족·올드',`거체의 ${nm}`,`HP ${C.g[0]} → 「HP」 종족치 1랭크 상승 (거체형 · 예시 포텐셜과 같은 밸류)`,[[L('','','basest',{st:'HP'})]],5);
 if(C.eggs.includes('부정형')||C.types.includes('고스트'))add('종족·올드',`무형의 ${nm}`,`부정형·고스트 → 「마비」 면역`,[[L('','','immune',{cond:'마비'})]],4);
 if(C.eggs.some(e=>/^수중/.test(e)))add('종족·올드',`물가의 ${nm}`,`수중 알그룹 → 「날씨 : 비」일 때 턴 종료 시 회복`,[[L('','「날씨 : 비」일 때 턴 종료 시 ','heal',{fr:'1/16'})]],4);
 /* 17. 상태 변화 (지속 시간으로 밸류 조절 · 턴 종료 시까지 ×0.5, 2턴 ×0.7, 3턴 ×0.8, 무제한 ×1) */
 const st2=C.types.includes('불꽃')?'가열':(C.types.includes('물')||C.types.includes('얼음'))?'냉각':C.types.includes('전기')?'충전':(C.types.includes('격투')||C.types.includes('에스퍼'))?'집중':'';
 if(st2){add('상태 변화',`${st2} 등장`,`「${t1}」 계열 → 등장한 턴만 「${st2}」`,[[L('【등장】','','statusself',{cond2:st2,dur:'턴 종료 시까지 '})]],6);
  add('상태 변화',`${st2} 예열`,`2턴째부터 2턴 동안 「${st2}」 (지연형)`,[[L('【지연 (2턴)】','','statusself',{cond2:st2,dur:'2턴 동안 '})],[L('【1/시】【지연 (2턴)】','','statusself',{cond2:st2,dur:'3턴 동안 '})]],6);
  add('상태 변화',`${st2} 궁지`,`「HP : 1/2 이하」가 되면 3턴 동안 「${st2}」 (1번)`,[[L('【1/시】【자동】','「HP : 1/2 이하」일 때 ','statusself',{cond2:st2,dur:'3턴 동안 '})],[L('【1/시】【자동】','「HP : 1/2 이하」일 때 ','statusself',{cond2:st2,dur:''})]],5)}
 if(C.types.includes('물'))add('상태 변화',`아쿠아링 ${nm}`,`물 타입 → 「HP : 1/2 이하」일 때 「아쿠아링」 (1번)`,[[L('【1/시】【자동】','「HP : 1/2 이하」일 때 ','statusself',{cond2:'아쿠아링',dur:''})]],5);
 if(C.types.includes('풀'))add('상태 변화',`뿌리박기 ${nm}`,`풀 타입 → 늦게 행동했을 때 「뿌리박기」 (1번)`,[[L('【1/시】【자동】','상대보다 늦게 행동했을 때 ','statusself',{cond2:'뿌리박기',dur:''})],[L('【1/시】【자동】','「HP : 1/2 이하」일 때 ','statusself',{cond2:'뿌리박기',dur:''})]],5);
 if(C.types.includes('노말')||C.types.includes('고스트')||spdRole)add('상태 변화',`대타 ${nm}`,`죽어내밀기로 나온 턴 「대타출동」 (1번)`,[[L('【1/시】【자동】【등장 (죽어내밀기)】','','statusself',{cond2:'대타출동',dur:'턴 종료 시까지 '})],[L('【1/시】【자동】【등장 (죽어내밀기)】','「HP : 가득」일 때 ','statusself',{cond2:'대타출동',dur:'턴 종료 시까지 '})]],5);
 if(C.types.includes('고스트'))add('상태 변화',`길동무 ${nm}`,`고스트 → 「HP : 1/4 이하」일 때 턴 종료 시까지 「길동무」`,[[L('【1/시】【자동】','「HP : 1/4 이하」일 때 ','statusself',{cond2:'길동무',dur:'턴 종료 시까지 '})]],5);
 if(supRole||/디스럽터/.test(R)){add('상태 변화',`봉인의 ${nm}`,`방해형 → 정면을 2턴 동안 「회복봉인」 (사전 예고)`,[[L(ONE,'','statusd',{cond2:'회복봉인',dur:'2턴 동안 '})],[L(ONE,'','statusd',{cond2:'회복봉인',dur:'턴 종료 시까지 '})]],6);
  add('상태 변화',`도발의 ${nm}`,`방해형 → 상대가 변화기를 내보냈을 때 2턴 동안 「도발」`,[[L('【1/시】【자동】','상대가 「변화기」를 내보냈을 때 ','statusd',{cond2:'도발',dur:'2턴 동안 '})]],5)}
 if(supRole)add('상태 변화',`집중 전달`,`교대로 물러날 때 아군을 턴 종료 시까지 「집중」`,[[L('【퇴장 (통상 교대)】','','statusally',{cond2:'집중',dur:'턴 종료 시까지 '})],[L('【1/시】【퇴장 (통상 교대)】','','statusally',{cond2:'집중',dur:'턴 종료 시까지 '})]],5);
 /* 18. 특성 변화 */
 const WT_AB={맑음:'엽록소',비:'쓱쓱',모래바람:'모래헤치기',눈:'눈치우기'};const TY_AB={불꽃:'불꽃몸',전기:'정전기',독:'독가시',풀:'포자',물:'쓱쓱',얼음:'눈치우기',바위:'모래헤치기',땅:'모래헤치기',강철:'하드록',노말:'재생력',격투:'철주먹',에스퍼:'매직가드',비행:'가속',고스트:'프레셔',악:'틀깨기',드래곤:'틀깨기',페어리:'불면',벌레:'탈피'};
 const wab=wt&&WT_AB[wt];if(wab&&C.ability!==wab&&idx.abil.get(wab))add('특성 변화',`${wt}의 ${wab}`,`「날씨 : ${wt}」일 때만 특성이 「${wab}」로 (날씨 파티 연계)`,[[L('',`「날씨 : ${wt}」일 때 `,'abilself',{abn:wab,dur:''})],[L('【1/시】【자동】',`「날씨 : ${wt}」일 때 `,'abilself',{abn:wab,dur:'3턴 동안 '})]],7);
 const tab=TY_AB[t1]||TY_AB[t2];if(tab&&C.ability!==tab&&idx.abil.get(tab))add('특성 변화',`${tab} 각성`,`「${t1}」 계열 → 「HP : 1/2 이하」일 때 2턴 동안 특성이 「${tab}」로 (1번)`,[[L('【1/시】【자동】','「HP : 1/2 이하」일 때 ','abilself',{abn:tab,dur:'2턴 동안 '})],[L('【1/시】【자동】','「HP : 1/4 이하」일 때 ','abilself',{abn:tab,dur:'2턴 동안 '})]],6);
 if(atkRole||/디스럽터/.test(R)){add('특성 변화',`특성 봉쇄`,`정면의 특성을 턴 종료 시까지 무효 (사전 예고)`,[[L(ONE,'','abilnull',{dur:'턴 종료 시까지 '})],[L(ONE,'「HP : 1/2 이하」일 때 ','abilnull',{dur:'턴 종료 시까지 '})]],6);
  add('특성 변화',`무기력 부여`,`정면을 2턴 동안 「특성 : 무기력」으로 (HP 1/2 이하 시 공/특공 반감)`,[[L(ONE,'','abild',{abn:'무기력',dur:'2턴 동안 '})],[L(ONE,'「HP : 1/2 이하」일 때 ','abild',{abn:'무기력',dur:'2턴 동안 '})],[L(ONE,'「HP : 1/2 이하」일 때 ','abild',{abn:'무기력',dur:'턴 종료 시까지 '})]],5)}
 if(supRole||noRole||C.types.includes('에스퍼')||C.types.includes('고스트'))add('특성 변화',`모방의 ${nm}`,`죽어내밀기로 나오면 3턴 동안 정면의 특성을 복사 (1번)`,[[L('【1/시】【자동】【등장 (죽어내밀기)】','','abilcopy',{dur:'3턴 동안 '})],[L('【1/시】【자동】【등장 (죽어내밀기)】','','abilcopy',{dur:'2턴 동안 '})]],5);
 if(bulky)add('특성 변화',`재생의 ${nm}`,`단단함 → 「HP : 1/4 이하」일 때 「특성 : 재생력」으로 (1번)`,[[L('【1/시】【자동】','「HP : 1/4 이하」일 때 ','abilself',{abn:'재생력',dur:''})]],4);
 /* 파티 겹침 검사 */
 for(const o of out){const tg=prTags(o.txt),ek=prEffKeys(o.txt);o.warn=[];
  for(const q of C.otherPots){const ot=prTags(q.eff);const shared=tg.filter(x=>ot.includes(x)&&!/방호|수세|공세|유일|탈진|보급|N\/시|1\/시|자동|사전|선행/.test(x));if(shared.length)o.warn.push(`${q.who}의 「${q.n}」과 트리거 겹침`);
   const same=[...ek].filter(x=>prEffKeys(q.eff).has(x));if(same.length>=2)o.warn.push(`${q.who}의 「${q.n}」과 효과 겹침`)}
  for(const q of C.otherPots)if(q.n===o.title)o.warn.push('같은 이름이 파티에 있음')}
 const groups=[];for(const f of PR_FAM){const items=out.filter(o=>o.fam===f).sort((a,b)=>b.score-a.score).slice(0,3);if(items.length)groups.push({fam:f,items})}
 return groups}
function openPotRecommend(t,p,onPick,excl){const C=prCtx(t,p);const groups=prGenerate(C,excl);const flat=groups.flatMap(g=>g.items);const budget=excl?PR_BUDGET.excl:PR_BUDGET.race;
 const l=openModal(`<div class="mhead"><h2>포텐셜 추천 · ${esc(C.name)}</h2><span class="sp"></span><button class="btn ghost" data-x>닫기</button></div>
 <div class="mbody">${prCtxHTML(C)}<p class="small faint" style="margin:0 0 8px">DB를 뒤지지 않고 타입·기술·종족치·역할·특성·알그룹에서 계통별로 새 안을 짭니다. 모든 안은 <b>수지 검사</b>(효과값 − 조건값 ≤ 예산 ${budget})를 통과한 것만 보입니다. 기준점은 DB의 「델타 포스」(상시 비자속 1.5배 = 1.2)이고, 조건을 여러 개 섞으면 가장 센 것만 온전히 치고 나머지는 절반·1/4로만 쳐서, 능력치 상승·우선도·설치기·관통·풀죽음·가열·아군 전체 치유는 값을 높게 잡아 조건이 세지고, 전개·상태 변화·특성 변경은 지속 시간(턴 종료 시까지·2턴)으로 값을 깎습니다. 위력 강화·완화는 「타입 비일치 강화」만, ${excl?'<b>전용 칸</b>이라 【선행】 입력을 씁니다.':'종족 포텐셜은 【선행】 대신 【사전】 예고를 씁니다.'}</p>
 ${groups.map(g=>`<div class="small" style="margin:10px 0 4px;font-weight:600">${esc(g.fam)} <span class="faint">(${g.items.length})</span></div><div class="egrid">${g.items.map(x=>{const i=flat.indexOf(x);return `<div tabindex="0" role="button" data-kbd class="pkr" data-gen="${i}"><div><div class="t1"><b>${esc(x.title)}</b> <span class="small faint">${prBalanceHTML(x.bal,budget)}</span></div><div class="t2">${rich(x.txt)}</div><div class="small" style="margin-top:4px"><span class="okc">${esc(x.why)}</span>${x.warn.map(w=>` <span class="warn">− ${esc(w)}</span>`).join('')}</div></div></div>`}).join('')}</div>`).join('')||'<div class="empty">기술·타입을 먼저 넣어 주세요. 재료가 있어야 안을 짭니다.</div>'}</div>
 <div class="mfoot"><button class="btn" data-build>빈 제작기 열기</button><span class="sp"></span><button class="btn pri" data-x>닫기</button></div>`,{wide:true});
 l.addEventListener('click',e=>{if(e.target.closest('[data-x]'))return closeModal();
  const g=e.target.closest('[data-gen]');if(g){const x=flat[+g.dataset.gen];closeModal();openPotBuilder(t,p,onPick,excl,{name:x.title,lines:x.lines});return}
  if(e.target.closest('[data-build]')){closeModal();openPotBuilder(t,p,onPick,excl)}});
}
/* ===== 제작기 ===== */
function openPotBuilder(t,p,onPick,excl,preset){const C=prCtx(t,p);
 const tyOpts=[...C.types,...[...C.mtypes].filter(x=>!C.types.includes(x)),...S.db.types.map(x=>x[0]).filter(x=>!C.types.includes(x)&&!C.mtypes.has(x))];
 const mvOpts=C.moves.map(m=>m.n);
 const opt=(arr,sel)=>arr.map(v=>`<option ${v===sel?'selected':''}>${esc(v)}</option>`).join('');
 const grp=(groups,sel,blank)=>(blank?`<option value="" ${!sel?'selected':''}>${esc(blank)}</option>`:'')+groups.map(g=>`<optgroup label="${esc(g[0])}">${g[1].map(x=>`<option value="${esc(x[0])}" ${x[0]===sel?'selected':''}>${esc(x[1])}</option>`).join('')}</optgroup>`).join('');
 const lines=preset&&preset.lines?clone(preset.lines):[{trig:'',cond:'',eff:'boost',pr:{}}];
 const l=openModal(`<div class="mhead"><h2>포텐셜 제작 · ${esc(C.name)}</h2><span class="sp"></span><button class="btn ghost" data-x>닫기</button></div>
 <div class="mbody">${prCtxHTML(C)}
 <div class="fgrid" style="grid-template-columns:minmax(0,1fr) minmax(0,1.4fr)"><label class="lbl">종류(순서)<input data-kind value="${excl?'전용':'05. 속별'}" list="L-kinds2"></label><label class="lbl">이름<input data-name value="${esc(preset&&preset.name||'')}" placeholder="예: ${esc(C.name)}의 ○○"></label></div>
 <div data-lines></div>
 <div class="row" style="margin:6px 0"><button class="btn sm" data-addline>+ 효과 줄 추가 (①②…)</button><span class="small faint">복합 효과일 때만 줄을 나눕니다. 태그는 사전 순서로 자동 정리됩니다.</span></div>
 <div class="preview" data-prev></div><div class="small" data-chk></div></div>
 <div class="mfoot">${PR_HIDDEN?'':'<button class="btn" data-rec>← 추천으로</button>'}<span class="sp"></span><button class="btn" data-x>취소</button><button class="btn pri" data-use>편집기에 넣기</button></div>`,{wide:true});
 const lineHTML=(ln,i)=>{const E=PB_FLAT.find(e=>e[0]===ln.eff);const need=E[3];const P=Object.assign({},PB_DEF,{ty:tyOpts[0],mv:mvOpts[0]||'○'},ln.pr);
  const f=(k)=>{if(k==='ty')return `<label class="lbl">타입<select data-f="ty" data-i="${i}">${opt(tyOpts,P.ty)}</select></label>`;
   if(k==='mv')return `<label class="lbl">기술<input data-f="mv" data-i="${i}" list="L-mv${i}" value="${esc(P.mv)}"><datalist id="L-mv${i}">${opt(mvOpts)}</datalist></label>`;
   if(k==='mul')return `<label class="lbl">배율<input data-f="mul" data-i="${i}" value="${esc(ln.pr.mul||(/guard|multd/.test(ln.eff)?'0.85':'1.2'))}" inputmode="decimal" style="width:70px"></label>`;
   if(k==='cat')return `<label class="lbl">분류<select data-f="cat" data-i="${i}">${opt(['물리기','특수기','변화기','전체기','단일기','접촉기','선공기','후공기'],P.cat)}</select></label>`;
   if(k==='st')return `<label class="lbl">능력<select data-f="st" data-i="${i}">${opt(['공격','방어','특공','특방','스피드','명중','회피','공격/특공','방어/특방','모든 능력'],P.st)}</select></label>`;
   if(k==='n')return `<label class="lbl">N<input data-f="n" data-i="${i}" value="${esc(P.n)}" inputmode="numeric" style="width:56px"></label>`;
   if(k==='pr')return `<label class="lbl">확률<select data-f="pr" data-i="${i}">${opt(PB_PR,P.pr)}</select></label>`;
   if(k==='cond')return `<label class="lbl">상태 이상<select data-f="cond" data-i="${i}">${opt(PB_STATUS,P.cond)}</select></label>`;
   if(k==='cond2')return `<label class="lbl">상태 변화<select data-f="cond2" data-i="${i}">${opt(PB_STATUS2,P.cond2)}</select></label>`;
   if(k==='fr')return `<label class="lbl">비율<select data-f="fr" data-i="${i}">${opt(['1/16','1/8','1/6','1/4','1/3','1/2','모두'],P.fr)}</select></label>`;
   if(k==='wt')return `<label class="lbl">날씨<select data-f="wt" data-i="${i}">${opt(['맑음','비','모래바람','눈','짙은안개','밤','별하늘','큰가뭄','폭우','난기류','극한','깊은밤'],P.wt)}</select></label>`;
   if(k==='fd')return `<label class="lbl">필드<select data-f="fd" data-i="${i}">${opt(['그래스필드','일렉트릭필드','미스트필드','사이코필드'],P.fd)}</select></label>`;
   if(k==='rm')return `<label class="lbl">룸<select data-f="rm" data-i="${i}">${opt(['트릭룸','매직룸','원더룸','블랙룸'],P.rm)}</select></label>`;
   if(k==='dur')return `<label class="lbl">지속<select data-f="dur" data-i="${i}">${PB_DUR.map(x=>`<option value="${esc(x[0])}" ${x[0]===(ln.pr.dur||'')?'selected':''}>${esc(x[1])}</option>`).join('')}</select></label>`;
   if(k==='abn')return `<label class="lbl">특성<input data-f="abn" data-i="${i}" list="L-abn" value="${esc(P.abn)}" placeholder="특성 이름"><datalist id="L-abn">${S.db.abil.map(r=>`<option>${esc(r[1])}</option>`).join('')}</datalist></label>`;
   if(k==='hz')return `<label class="lbl">설치기<select data-f="hz" data-i="${i}">${opt(['스텔스록','압정뿌리기','독압정','끈적끈적네트'],P.hz)}</select></label>`;
   if(k==='wl')return `<label class="lbl">장벽<select data-f="wl" data-i="${i}">${opt(['리플렉터','빛의장막','오로라베일','신비의부적','흰안개'],P.wl)}</select></label>`;
   if(k==='rl')return `<label class="lbl">역할<select data-f="rl" data-i="${i}">${opt(['어태커','블로커','러너','킬러','어시스트','에이스'],P.rl)}</select></label>`;
   if(k==='txt')return `<label class="lbl" style="grid-column:1/-1">효과 문장<input data-f="txt" data-i="${i}" value="${esc(P.txt)}" placeholder="표기 문법대로 직접 적기"></label>`;return ''};
  return `<div class="panel" style="margin:6px 0;padding:8px"><div class="row small" style="margin-bottom:4px"><b>${lines.length>1?'①②③④⑤'[i]:'효과'}</b><span class="sp"></span>${lines.length>1?`<button class="btn sm ghost" data-del="${i}">✕</button>`:''}</div>
   <div class="fgrid" style="grid-template-columns:repeat(auto-fit,minmax(150px,1fr))"><label class="lbl">트리거 태그<select data-f="trig" data-i="${i}">${grp(PB_TRIG,ln.trig,'(없음 · 상시)')}</select></label>
   <label class="lbl">조건<select data-f="cond0" data-i="${i}">${grp(PB_COND,ln.cond,'(없음)')}</select></label>
   <label class="lbl">효과<select data-f="eff" data-i="${i}">${grp(PB_EFF,ln.eff)}</select></label>${need.map(f).join('')}</div></div>`};
 const build=()=>tagFix(prBuildText(lines.map(ln=>({trig:ln.trig,cond:ln.cond,eff:ln.eff,pr:Object.assign({ty:tyOpts[0],mv:mvOpts[0]||'○'},ln.pr)}))));
 const checks=(txt)=>{const out=[];const ek=prEffKeys(txt);const tg=prTags(txt);
  const h=banHits(txt);if(h.length)out.push(`<span class="warn">금지 키워드: ${h.map(esc).join(', ')}</span>`);
  tagLint(txt).forEach(x=>out.push(`<span class="warn">${esc(x)}</span>`));
  const R=C.roles.join(',');
  if(ek.has('위력 강화')&&R&&!/어태커|어쌔신|킬러|퀄러|디스럽터|타이트엔드/.test(R))out.push(`<span class="warn">위력 강화는 어태커 계열의 영역입니다 (대원칙 3) · 현재 역할 ${esc(R)}</span>`);
  if((ek.has('공격 상승')||ek.has('특공 상승')||ek.has('스피드 상승'))&&R&&/어태커/.test(R))out.push(`<span class="warn">능력 상승은 에이스·러너·블로커의 영역입니다 (대원칙 3)</span>`);
  const mulm=[...txt.matchAll(/강화\(([\d.]+)배\)/g)].map(m=>+m[1]);if(mulm.some(v=>v>=1.5)&&!tg.length&&!/일 때|했을 때/.test(txt))out.push(`<span class="warn">조건 없이 1.5배 이상 강화는 「소켓 2」 이상 소지품에 필적합니다 (대원칙 5)</span>`);
  if(/전체기/.test(txt)&&/C\+([3-9])/.test(txt))out.push(`<span class="warn">「전체기」는 「C : +3」 이상으로 만들 수 없습니다 (대원칙 7)</span>`);
  if(/모든 기술|자신의 기술이 급소|자신의 기술에 「우선도/.test(txt)&&!/육성/.test(R))out.push(`<span class="warn">둘 이상의 기술에 동시에 적용되는 효과는 육성형이 아닌 한 삼갑니다 (대원칙 6)</span>`);
  for(const o of C.otherPots){const ot=prTags(o.eff);const shared=tg.filter(x=>ot.includes(x)&&!/방호|수세|공세|유일|탈진|보급/.test(x));if(shared.length)out.push(`<span class="warn">${esc(o.who)}의 「${esc(o.n)}」과 트리거 ${shared.map(x=>'【'+x+'】').join('')} 겹침 (대원칙 1)</span>`);
   const same=[...ek].filter(x=>prEffKeys(o.eff).has(x));if(same.length>=2)out.push(`<span class="warn">${esc(o.who)}의 「${esc(o.n)}」과 효과 겹침: ${esc(same.join('·'))} (대원칙 2)</span>`)}
  for(const m of txt.matchAll(/「([^」:]+)」/g)){if(idx.moves.has(m[1])&&!C.moves.some(x=>x.n===m[1]))out.push(`<span class="warn">기술 「${esc(m[1])}」은 이 포켓몬에게 없습니다</span>`)}
  const tyIn=S.db.types.map(x=>x[0]).filter(k=>new RegExp('「타입 : '+k+'」|「'+k+'」(?=「|\\s*기술)|「(공격기|단일기|전체기|물리기|특수기|변화기|접촉기|선공기) : '+k+'」').test(txt));for(const k of tyIn)if(!C.types.includes(k)&&!C.mtypes.has(k))out.push(`<span class="warn">「${esc(k)}」 타입은 자신의 타입·기술에 없습니다</span>`);
  if(/○○/.test(txt))out.push(`<span class="warn">「○○」 자리를 채워 주세요</span>`);
  return out.length?out.join('<br>'):'<span class="okc">규칙 점검 이상 없음</span>'};
 const upd=()=>{const txt=build();const bal=prBalance(lines,{abWt:(C.abilEff.match(/「날씨 : ([^」]+)」/)||[])[1],abFd:(C.abilEff.match(/「필드 : ([^」]+)」/)||[])[1]});const budget=excl?PR_BUDGET.excl:PR_BUDGET.race;$('[data-prev]',l).innerHTML=`<b>${esc($('[data-name]',l).value||'(이름 없음)')}</b>${PR_HIDDEN?'':` <span class="small">${prBalanceHTML(bal,budget)}</span>`}<br>`+rich(txt);$('[data-chk]',l).innerHTML=checks(txt)+(!PR_HIDDEN&&bal.net>budget?`<br><span class="warn">수지 초과: 효과값 ${bal.ev}에 비해 조건값 ${bal.cc}이 약합니다 (예산 ${budget}) · 조건을 더 붙이거나 효과를 줄이세요</span>`:'')};
 const draw=()=>{$('[data-lines]',l).innerHTML=lines.map(lineHTML).join('');upd()};
 draw();
 const setF=el=>{const ln=lines[+el.dataset.i];if(!ln)return;const k=el.dataset.f;if(k==='trig')ln.trig=el.value;else if(k==='cond0')ln.cond=el.value;else if(k==='eff'){ln.eff=el.value;draw();return}else ln.pr[k]=el.value;upd()};
 l.addEventListener('input',e=>{const el=e.target;if(el.dataset.f&&el.dataset.i!=null&&el.tagName!=='SELECT')setF(el);else if(el.matches('[data-name]'))upd()});
 l.addEventListener('change',e=>{const el=e.target;if(el.dataset.f&&el.dataset.i!=null)setF(el)});
 l.addEventListener('click',e=>{if(e.target.closest('[data-x]'))return closeModal();
  if(e.target.closest('[data-rec]')){closeModal();openPotRecommend(t,p,onPick,excl);return}
  if(e.target.closest('[data-addline]')){if(lines.length<5){lines.push({trig:'',cond:'',eff:'rank',pr:{}});draw()}return}
  const d=e.target.closest('[data-del]');if(d){lines.splice(+d.dataset.del,1);draw();return}
  if(e.target.closest('[data-use]')){const txt=build();const name=$('[data-name]',l).value.trim();const kind=$('[data-kind]',l).value.trim();closeModal();onPick({kind,name,eff:txt})}});
}

/* ---------- 내 서명 · 비공개 (화면에서만 숨김: 비밀구가 맞는 브라우저와 GM 만 본다) ---------- */
const ME={name:'',hash:'',gm:false};
async function sha256hex(s){if(window.crypto&&crypto.subtle){const b=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(s));return [...new Uint8Array(b)].map(x=>x.toString(16).padStart(2,'0')).join('')}
 let h1=0x811c9dc5,h2=0x1b873593;for(const ch of String(s)){const c=ch.codePointAt(0);h1=Math.imul(h1^c,16777619)>>>0;h2=Math.imul(h2+c,2246822519)>>>0}return (h1.toString(16).padStart(8,'0')+h2.toString(16).padStart(8,'0')).repeat(4)}
const meHash=async secret=>(await sha256hex('mkm:'+String(secret||''))).slice(0,24);
async function meLoad(){let o=null;try{o=JSON.parse(lsGet('mkm_me')||'null')}catch(e){}
 if(o&&o.secret){ME.name=String(o.name||'');ME.hash=await meHash(o.secret);const gh=(window.MKM_CONFIG&&MKM_CONFIG.gmHash)||'';ME.gm=!!(gh&&ME.hash===gh)}else{ME.name='';ME.hash='';ME.gm=false}
 renderMe();if(S.ui.tab)refreshAll()}
function renderMe(){const b=$('#mebtn');if(!b)return;b.textContent=ME.hash?(ME.gm?'GM · ':'서명 · ')+(ME.name||'이름 없음'):'서명 없음';b.classList.toggle('on',!!ME.hash);b.title=ME.hash?'비공개 설정에 쓰는 내 서명. 눌러서 바꾸기':'비공개 트레이너를 만들거나 보려면 서명(이름 + 비밀구)을 적어 두세요'}
const canSee=o=>!o||!o.priv||ME.gm||!!(ME.hash&&o.owner===ME.hash);
const canEditPriv=o=>!o.priv||ME.gm||!!(ME.hash&&o.owner===ME.hash)||!o.owner;
/* 10-24 망령: 폴더 안의 폴더 — 폴더에 parent(상위 폴더 id). 지워졌거나 고리가 생긴 parent 는 맨 위로 본다 */
const fById=id=>id?S.folders.find(f=>f.id===id):null;
const fPar=f=>{if(!f||!f.parent)return '';const p=fById(f.parent);if(!p)return '';let c=p,n=0;while(c&&n++<50){if(c.id===f.id)return '';c=c.parent?fById(c.parent):null}return p.id};
const fKids=pid=>S.folders.filter(f=>fPar(f)===(pid||''));
const fDesc=id=>{const out=[];const walk=p=>{for(const k of fKids(p)){out.push(k.id);walk(k.id)}};walk(id);return out};
const fPath=f=>{const a=[];let c=f,n=0;while(c&&n++<50){a.unshift(c.name||'이름 없는 폴더');c=fById(fPar(c))}return a.join(' › ')};
const fVis=f=>{let c=f,n=0;while(c&&n++<50){if(!canSee(c))return false;c=fById(fPar(c))}return true};
const tVis=t=>canSee(t)&&fVis(S.folders.find(f=>f.id===tFolder(t)));
/* 폴더 고르기 목록: 나무 순서 · 들여쓰기 (skip = 그 폴더와 그 아래는 뺀다) */
function fTreeOpts(cur,skip){const out=[];const no=new Set(skip?[skip,...fDesc(skip)]:[]);const walk=(p,d)=>{for(const f of fKids(p)){if(no.has(f.id)||!fVis(f))continue;out.push(`<option value="${esc(f.id)}" ${cur===f.id?'selected':''}>${'  '.repeat(d)}${d?'└ ':''}${esc(f.name||'이름 없는 폴더')}</option>`);walk(f.id,d+1)}};walk('',0);return out.join('')}
function openMe(){let o=null;try{o=JSON.parse(lsGet('mkm_me')||'null')}catch(e){}o=o||{};
 const l=openModal(`<div class="mhead"><h2>내 서명</h2><span class="sp"></span><button class="btn ghost" data-x>닫기</button></div>
 <div class="mbody"><p class="small muted" style="margin:0 0 8px">비공개로 둔 폴더·트레이너는 같은 비밀구를 적은 브라우저와 GM 에게만 보입니다. 이름은 표시용, 비밀구가 열쇠입니다. 다른 기기에서도 같은 비밀구를 적으면 내 것이 보입니다. (화면에서만 숨기는 방식이라 DB 자체가 비밀이 되지는 않습니다)</p>
  <label class="lbl" for="me-name">이름<input id="me-name" value="${esc(o.name||'')}" maxlength="24" placeholder="표시 이름"></label>
  <label class="lbl" for="me-secret" style="margin-top:8px">비밀구<input id="me-secret" type="password" value="${esc(o.secret||'')}" maxlength="64" placeholder="나만 아는 문장" autocomplete="off"></label>
  <p class="small faint" style="margin:8px 0 0">GM 은 config.js 의 gmHash 와 비밀구가 맞으면 전부 봅니다. <button type="button" class="btn sm" id="me-gmhash">이 비밀구의 해시 보기</button> <span class="mono small" id="me-gmout"></span></p></div>
 <div class="mfoot"><button class="btn ghost" data-x="clear">서명 지우기</button><span class="sp"></span><button class="btn pri" data-x="ok">저장</button></div>`);
 $('#me-gmhash',l).onclick=async()=>{$('#me-gmout',l).textContent=await meHash($('#me-secret',l).value)};
 l.addEventListener('click',async e=>{const x=e.target.closest('[data-x]');if(!x)return;const v=x.dataset.x;
  if(v==='ok'){const name=$('#me-name',l).value.trim(),secret=$('#me-secret',l).value;if(!secret){toast('비밀구를 적어 주세요');return}lsSet('mkm_me',JSON.stringify({name,secret}));closeModal();await meLoad();toast(ME.gm?'GM 으로 서명했습니다':'서명을 저장했습니다');return}
  if(v==='clear'){try{localStorage.removeItem('mkm_me')}catch(e){}closeModal();await meLoad();return}
  closeModal()})}
document.addEventListener('click',e=>{if(e.target.closest('#mebtn'))openMe()});
document.addEventListener('click',e=>{const b=e.target.closest('[data-tip]');if(!b)return;openModal(`<div class="mhead"><h2>${esc(b.title||'설명')}</h2></div><div class="mbody"><p class="small" style="margin:0;line-height:1.6">${esc(b.dataset.tip)}</p></div><div class="mfoot"><span class="sp"></span><button class="btn pri" data-x>닫기</button></div>`).addEventListener('click',ev=>{if(ev.target.closest('[data-x]'))closeModal()})});
/* ---------- 렌더: 캐릭터 ---------- */
const FOLDER_SVG='<svg width="18" height="18" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true"><path d="M2 5.5A1.5 1.5 0 0 1 3.5 4h4l1.6 1.8h7.4A1.5 1.5 0 0 1 18 7.3v7.2a1.5 1.5 0 0 1-1.5 1.5h-13A1.5 1.5 0 0 1 2 14.5z"/></svg>';
/* 트레이너가 속한 폴더 id ('' = 폴더 없음 · 지워진 폴더를 가리키면 폴더 없음으로 본다) */
const tFolder=t=>t.folder&&S.folders.some(f=>f.id===t.folder)?t.folder:'';
const fOpen=fid=>!((S.ui.fclosed||{})[fid||'_none']);
const trVisible=t=>tVis(t)&&(!S.folders.length||(()=>{let c=fById(tFolder(t)),n=0;if(!c)return fOpen('');while(c&&n++<50){if(!fOpen(c.id))return false;c=fById(fPar(c))}return true})());
/* 10-24 망령: 폴더 머리를 카드 한 장으로 — 닫힌 폴더는 격자로 촘촘히, 연 폴더만 한 줄 전체. 꾸미기(색 · 아이콘 · 부제 · 무늬 · 배경 그림)는 트레이너 카드와 같은 틀 */
function folderHead(f,name,n,open,pv,kids){const fid=f?f.id:'',key=fid||'_none',d=(f&&f.deco)||{},pk=n.reduce((a,[t])=>a+t.pokemon.length,0);kids=kids||0;
 const av=n.slice(0,8).map(([t])=>`<span class="fch" title="${esc(t.name||'')}"><span class="fav">${safeImg(t.image)?`<img src="${safeImg(t.image)}" alt="" loading="lazy">`:esc([...(t.name||'?')][0]||'?')}</span><span class="fcn">${esc(t.name||'이름 없음')}</span></span>`).join('')+(n.length>8?`<span class="fch more">+${n.length-8}</span>`:'')||'<span class="fch none">아직 트레이너가 없다</span>';
 const A=pv?'':` data-ftog="${esc(key)}" data-fdrop="${esc(key)}" ${fid?'data-grab':''} tabindex="0" role="button" data-kbd aria-expanded="${open}" aria-label="${esc(name)} 폴더 펼치기/접기"`;
 return `<div class="tfh ftile tcard ${f?tDecoCls(f):''} ${fid?'':'fnone'}" style="${f?tDecoVars(f):''}"${A}><span class="caret">▸</span><span class="ficon">${d.icon?`<b class="fem">${esc(d.icon)}</b>`:FOLDER_SVG}</span>
  <div class="fmain"><div class="fl1"><span class="fname${fid?'':' muted'}">${esc(name)}</span>${fid?FAV.btn('f',fid):''}${f&&f.priv?`<span class="kindb privchip" title="${esc('비공개 · '+(f.ownerName||'')+(ME.gm?' (GM 열람)':''))}">🔒</span>`:''}</div>${d.title?`<div class="fsub">${esc(d.title)}</div>`:''}<div class="fmeta" title="${esc((kids?`하위 폴더 ${kids}개 · `:'')+`트레이너 ${n.length}명 · 포켓몬 ${pk}체`)}">${kids?`폴더 ${kids}개 · ${n.length}명 · ${pk}체`:`트레이너 ${n.length}명 · 포켓몬 ${pk}체`}</div></div>
  <div class="fbot"><div class="favs flist" data-n="${n.length}">${av}</div>
  ${pv?'':`<div class="facts"><button class="btn sm" data-act="addTin" data-f="${esc(fid)}" title="이 폴더에 트레이너 추가">+ 트레이너</button>${fid?`<button class="btn sm ghost fsubb" data-act="addFin" data-f="${esc(fid)}" title="이 폴더 안에 폴더 만들기">+ 폴더</button>`:''}${fid?`<span class="facts2"><button class="btn sm ghost fic" data-act="moveF" data-f="${esc(fid)}" title="다른 폴더 안으로 옮기기 · 맨 위로 꺼내기" aria-label="폴더 옮기기">📂</button><button class="btn sm ghost fic" data-act="decoF" data-f="${esc(fid)}" title="폴더 꾸미기 (색 · 아이콘 · 부제 · 무늬 · 배경 그림)" aria-label="폴더 꾸미기">🎨</button><button class="btn sm ghost fic" data-act="privF" data-f="${esc(fid)}" title="${f&&f.priv?'지금 비공개 — 눌러서 공개로':'지금 공개 — 눌러서 비공개로 (만든 사람과 GM 에게만 보임)'}" aria-label="${f&&f.priv?'공개로':'비공개로'}">${f&&f.priv?'🔒':'🌐'}</button><button class="btn sm ghost fic" data-act="renF" data-f="${esc(fid)}" title="이름 바꾸기" aria-label="이름 바꾸기">✏️</button><button class="btn sm ghost fic danger" data-act="delF" data-f="${esc(fid)}" title="폴더 삭제 (안의 트레이너는 「폴더 없음」으로)" aria-label="폴더 삭제">🗑</button></span>`:''}</div>`}</div></div>`}
/* ---------- 즐겨찾기 (10-26 망령): 폴더 · 트레이너에 ★ → 왼쪽 레일에서 바로 가기. 이 브라우저(localStorage mkm_fav)에만 ---------- */
const FAV={get(){try{return JSON.parse(localStorage.getItem('mkm_fav')||'[]')||[]}catch(e){return []}},set(v){lsSet('mkm_fav',JSON.stringify(v))},has(k,id){return this.get().some(f=>f.k===k&&f.id===id)},
 toggle(k,id){const L=this.get();const i=L.findIndex(f=>f.k===k&&f.id===id);if(i>=0)L.splice(i,1);else L.push({k,id});this.set(L);toast(i>=0?'즐겨찾기에서 뺐습니다':'즐겨찾기에 넣었습니다 ★');renderChar()},
 btn(k,id){const on=this.has(k,id);return `<button type="button" class="favstar${on?' on':''}" data-act="fav" data-fk="${k}" data-fid="${esc(id)}" title="${on?'즐겨찾기에서 빼기':'즐겨찾기에 넣기'}" aria-label="즐겨찾기">${on?'★':'☆'}</button>`},
 label(f){if(f.k==='f'){const x=fById(f.id);return x?(x.name||'폴더'):null}const t=S.trainers.find(t=>t.id===f.id);return t?(t.name||'트레이너'):null},
 go(f){S.ui.fclosed=S.ui.fclosed||{};const openChain=fid=>{let c=fById(fid),n=0;while(c&&n++<50){delete S.ui.fclosed[c.id];c=c.parent?fById(c.parent):null}};
  if(f.k==='f'){openChain(f.id)}else{const t=S.trainers.find(t=>t.id===f.id);if(!t)return toast('그 트레이너가 없습니다');if(t.folder)openChain(t.folder);else delete S.ui.fclosed._none;t.open=true}
  save();renderChar();requestAnimationFrame(()=>{const el=f.k==='f'?document.querySelector(`.tfold[data-fold="${CSS.escape(f.id)}"]`):document.getElementById('tr-'+f.id);if(el){el.scrollIntoView({behavior:'smooth',block:'start'});el.classList.add('favflash');setTimeout(()=>el.classList.remove('favflash'),1400)}})},
 rail(){const L=this.get().map(f=>({f,lab:this.label(f)})).filter(x=>x.lab!=null);const sv=localStorage.getItem('mkm_fav_open');const vis=sv?sv!=='0':innerWidth>=1700;
  return `<aside id="mkFav" class="${vis?'':'closed'}"><button type="button" class="favh" data-act="favtog" title="즐겨찾기 접기 · 펴기">★ 즐겨찾기 <small>${L.length}</small></button>${vis?`<div class="favl">${L.map((x,i)=>`<button type="button" class="favi" data-act="favgo" data-i="${i}"><i>${x.f.k==='f'?'📁':'🧑'}</i><span>${esc(x.lab)}</span><em data-act="favdel" data-i="${i}" title="빼기">×</em></button>`).join('')||'<div class="small faint" style="padding:8px 10px;line-height:1.5">폴더 · 트레이너 머리의 ☆ 를 누르면 여기 모입니다. 누르면 바로 갑니다.</div>'}</div>`:''}</aside>`}};
function renderChar(){const root=$('#v-char');
 const inF=fid=>S.trainers.map((t,ti)=>[t,ti]).filter(([t])=>tFolder(t)===fid&&tVis(t));const hiddenN=S.trainers.filter(t=>!tVis(t)).length;
 let body;
 if(!S.folders.length)body=`<div id="trs" data-sort="trainers" data-fid="">${S.trainers.map((t,ti)=>tVis(t)?trainerHTML(t,ti):'').join('')||'<div class="empty">트레이너가 없습니다. 「+ 트레이너」를 눌러 시작하세요.</div>'}</div>`;
 else{
  /* 10-24 망령: 폴더 안의 폴더 — 연 폴더 안에 하위 폴더 카드 격자, 그 아래 트레이너. 닫힌 카드의 얼굴 · 수는 하위 폴더까지 다 센다 */
  const grp=(fid,name)=>{const f=fById(fid);if(f&&!fVis(f))return '';const n=inF(fid),open=fOpen(fid),key=fid||'_none';const kids=fid?fKids(fid).filter(fVis):[];const all=fid?n.concat(...fDesc(fid).map(inF)):n;
   return `<div class="tfold ${open?'open':''} ${f&&f.priv?'priv':''} ${f&&fPar(f)?'sub':''}" ${fid?`data-si="${S.folders.indexOf(f)}"`:''} data-fold="${esc(key)}">${folderHead(f,name,all,open,0,kids.length)}
   ${open?`${kids.length?`<div class="tsubf" data-sort="folders">${kids.map(k=>grp(k.id,k.name||'이름 없는 폴더')).join('')}</div>`:''}<div class="tfb" data-sort="trainers" data-fid="${esc(fid)}">${n.map(([t,ti])=>trainerHTML(t,ti)).join('')}</div>`:''}</div>`};
  body=`<div id="trs" data-sort="folders">${fKids('').map(f=>grp(f.id,f.name||'이름 없는 폴더')).join('')}${grp('','폴더 없음')}</div>`}
 root.innerHTML=`${hiddenN?`<p class="small faint" style="margin:0 0 8px">🔒 비공개라서 안 보이는 트레이너 ${hiddenN}명 (내 것이면 「서명」에 같은 비밀구를 적으세요)</p>`:''}<div class="intro"><h1>캐릭터 시트</h1><p>트레이너 폴더마다 자질·포인트·PT 서머리를 관리하고, 그 아래에 포켓몬 시트를 자유롭게 추가합니다. 「+ 폴더」로 세션별 대분류를 만들고 트레이너를 끌어다 넣을 수 있습니다. ${SH.on?'모든 내용은 공유 DB에 자동 저장되어, 링크를 아는 사람 모두가 같이 보고 고칩니다.':'모든 내용은 이 브라우저에 자동 저장됩니다.'}</p>
 <button class="btn pri" data-act="addT">+ 트레이너</button><button class="btn" data-act="addF">+ 폴더</button><button class="btn" data-act="impText">복사용 텍스트 붙여넣기</button></div>
 ${body}${FAV.rail()}`;fitFlist(root)}
/* 폴더 카드 트레이너 칩: 한 줄에 이름까지 안 들어가면 얼굴만 (10-24 망령) — 글꼴이 늦게 오거나 창 크기가 바뀌면 다시 잰다 */
function fitFlist(root){const over=l=>l.scrollWidth>l.clientWidth+1;const run=()=>(root||document).querySelectorAll('.ftile .flist').forEach(l=>{l.classList.remove('ico');l.querySelectorAll('.fch.fx').forEach(x=>x.remove());const ch=[...l.querySelectorAll('.fch:not(.more):not(.none)')];ch.forEach(x=>x.style.display='');const mo=l.querySelector('.fch.more');if(mo)mo.style.display='';if(!l.clientWidth||!over(l))return;l.classList.add('ico');if(!over(l))return;const tot=+l.dataset.n||ch.length;const x=document.createElement('span');x.className='fch more fx';l.append(x);if(mo)mo.style.display='none';let vis=ch.length;while(vis>1){ch[--vis].style.display='none';x.textContent='+'+(tot-vis);if(!over(l))break}});run();setTimeout(run,350)}
{let ft=null;addEventListener('resize',()=>{clearTimeout(ft);ft=setTimeout(()=>{const r=document.getElementById('v-char');if(r)fitFlist(r)},150)})}
/* 이름 입력 창 */
function askText(title,label,val=''){return new Promise(res=>{const l=openModal(`<div class="mhead"><h2>${esc(title)}</h2></div><div class="mbody"><label class="lbl" for="ask-txt">${esc(label)}<input id="ask-txt" value="${esc(val)}" maxlength="60" autocomplete="off"></label></div><div class="mfoot"><span class="sp"></span><button class="btn" data-x="no">취소</button><button class="btn pri" data-x="ok">확인</button></div>`,{onClose:()=>res(null)});
 const inp=$('#ask-txt',l);setTimeout(()=>{inp.focus();inp.select()},40);
 const done=ok=>{layers[layers.length-1].onClose=null;closeModal();res(ok?inp.value.trim()||null:null)};
 inp.addEventListener('keydown',e=>{if(e.key==='Enter'&&!e.isComposing){e.preventDefault();done(true)}});
 l.addEventListener('click',e=>{const x=e.target.dataset.x;if(x)done(x==='ok')})})}
function rkChip(q,r){return `<span class="rk">${q[0]}<b style="background:${gcol(r)}">${esc(r)}</b></span>`}
/* 알그룹 선택지: 올드 타입 일람(실기 포켓몬)에 나오는 알그룹, 원작 도감 순 */
const EGG_ORDER=['괴수','수중1','벌레','비행','육상','요정','식물','인간형','수중3','광물','부정형','수중2','메타몽','드래곤','알미발견'];
function eggOpts(){const g=new Set();for(const r of (S.db&&S.db.old)||[])for(const x of [r[8],r[9]])if(x&&x!=='-')g.add(String(x).trim());
 const o=i=>{const k=EGG_ORDER.indexOf(i);return k<0?99:k};return ['-',...[...g].sort((a,b)=>o(a)-o(b)||KO.compare(a,b))]}
function sel(path,val,opts,o={}){return `<select data-p="${esc(path)}" ${o.id?`id="${esc(o.id)}"`:''} ${o.style?`style="${o.style}"`:''}>${opts.map(v=>`<option value="${esc(v)}" ${v===val?'selected':''}>${esc(v)}</option>`).join('')}${val&&!opts.includes(val)?`<option value="${esc(val)}" selected>${esc(val)}</option>`:''}</select>`}
function inp(path,val,o={}){return `<input data-p="${esc(path)}" value="${esc(val??'')}" ${o.id?`id="${esc(o.id)}"`:''} ${o.w?`style="width:${o.w}"`:''} ${o.ph?`placeholder="${esc(o.ph)}"`:''} ${o.num?'inputmode="decimal"':''} ${o.list?`list="${o.list}"`:''}>`}
/* 『고유 포텐셜』 카드 — 트레이너의 얼굴이라 크게: 색 · 아이콘 · 부제(칭호)로 꾸민다 (u.color · u.icon · u.sub, 오레마스 시트 카드도 같은 색으로) */
const UQ_COL=['#7b4fd6','#d6336c','#e8590c','#e0a800','#2f9e44','#0c8599','#1c7ed6','#495057'];
function uqCard(u,i,ti){const c=safeCss(u.color)||UQ_COL[0];
 return `<div class="uqc ${u.name?'':'vac'}" style="--uc:${c}" tabindex="0" role="button" data-kbd data-act="editU" data-i="${ti}" data-j="${i}"><div class="uqh"><span class="uqs">UNIQUE ${i+1}</span>${u.icon?`<span class="uqi">${esc(u.icon)}</span>`:''}<div class="uqt"><b class="uqn">${esc(u.name||'비어 있음 · 눌러서 작성')}</b>${u.sub?`<span class="uqsub">${esc(u.sub)}</span>`:''}</div><span class="sp"></span><button type="button" class="btn sm ghost" data-act="decoU" data-i="${ti}" data-j="${i}" title="색 · 아이콘 · 부제 꾸미기">🎨 꾸미기</button><button type="button" class="btn sm ghost" data-act="delU" data-i="${ti}" data-j="${i}" aria-label="삭제">✕</button></div>${u.name&&u.eff?`<div class="uqe">${rich(u.eff)}</div>`:''}</div>`}
function openUqDeco(T,j,done){const u=T.unique[j];if(!u)return;const st={color:safeCss(u.color)||UQ_COL[0],icon:u.icon||'',sub:u.sub||''};
 const l=openModal(`<div class="mhead"><h2>고유 포텐셜 꾸미기</h2></div><div class="mbody"><div class="uqprev" data-uqprev></div>
  <div class="lbl" style="margin-top:12px">색</div><div class="row uqsw" style="gap:6px;align-items:center">${UQ_COL.map(c=>`<button type="button" class="uqsw1" data-uc="${c}" style="background:${c}" aria-label="${c}"></button>`).join('')}<label class="small muted row" style="gap:4px">직접<input type="color" data-ucc value="${st.color.length===7?st.color:'#7b4fd6'}"></label></div>
  <label class="lbl" style="margin-top:10px">아이콘 <span class="small faint">이모지나 글자 1~2개 (예: ✦ 🜂 龍)</span><input data-uci value="${esc(st.icon)}" maxlength="4" autocomplete="off"></label>
  <label class="lbl" style="margin-top:8px">부제 · 칭호 <span class="small faint">이름 아래 작게 (예: 하늘을 가르는 자)</span><input data-ucs value="${esc(st.sub)}" maxlength="40" autocomplete="off"></label></div>
  <div class="mfoot"><button class="btn ghost" data-ucr>기본으로</button><span class="sp"></span><button class="btn" data-x="no">취소</button><button class="btn pri" data-x="ok">저장</button></div>`);
 const pv=()=>{$('[data-uqprev]',l).innerHTML=uqCard(Object.assign({},u,st),j,-1).replace(/<button[^>]*>.*?<\/button>/g,'');l.querySelectorAll('[data-uc]').forEach(x=>x.classList.toggle('on',x.dataset.uc===st.color))};pv();
 l.querySelectorAll('[data-uc]').forEach(x=>x.onclick=()=>{st.color=x.dataset.uc;$('[data-ucc]',l).value=st.color;pv()});
 $('[data-ucc]',l).oninput=e=>{st.color=e.target.value;pv()};$('[data-uci]',l).oninput=e=>{st.icon=e.target.value.trim();pv()};$('[data-ucs]',l).oninput=e=>{st.sub=e.target.value.trim();pv()};
 $('[data-ucr]',l).onclick=()=>{st.color=UQ_COL[0];st.icon='';st.sub='';$('[data-uci]',l).value='';$('[data-ucs]',l).value='';pv()};
 $('[data-x="no"]',l).onclick=()=>closeModal();
 $('[data-x="ok"]',l).onclick=()=>{if(st.color&&st.color!==UQ_COL[0])u.color=st.color;else delete u.color;if(st.icon)u.icon=st.icon;else delete u.icon;if(st.sub)u.sub=st.sub;else delete u.sub;closeModal();done()}}
/* 10-22 망령: 트레이너 카드 — 꾸미기(색 · 칭호 · 배경 그림 · 무늬) · 소지 포켓몬 초상 6칸 · 고유 포텐셜 */
const cssu=s=>String(s??'').replace(/[\s"'()\\<>]/g,c=>'%'+c.charCodeAt(0).toString(16).padStart(2,'0').toUpperCase());
const TD_PAT=[['','없음'],['stripe','줄무늬'],['dot','점'],['grid','격자'],['wave','물결']];
function tDecoVars(t){const d=t.deco||{};const c=safeCss(d.color);const bg=safeImg(d.bg);return [c?`--tc:${c}`:'',bg?`--tbg:url('${cssu(bg)}')`:''].filter(Boolean).join(';')}
function tDecoCls(t){const d=t.deco||{};return [safeCss(d.color)?'tdc':'',safeImg(d.bg)?'tdb':'',TD_PAT.some(x=>x[0]&&x[0]===d.pat)?'tdp-'+d.pat:''].filter(Boolean).join(' ')}
function tPartyHTML(t,ti){const ms=t.pokemon.slice(0,6);if(!ms.length)return '';const ring=p=>{const a=tyCol(p.t1)||'var(--sunk2)',b=tyCol(p.t2)||a;return `background:conic-gradient(${a} 0 50%,${b} 50% 100%)`};
 return `<div class="tparty" aria-label="소지 포켓몬">${ms.map((p,j)=>`<button type="button" class="tpm ${p.partner?'ptn':''}" data-act="tpk" data-i="${ti}" data-j="${j}" title="${esc((p.name||'(이름 없음)')+' · '+[p.t1,p.t2].filter(x=>x&&x!=='-').join('/')+(p.partner?' · 파트너':''))}"><span class="tpr" style="${ring(p)}"><span class="tpi">${safeImg(p.image)?`<img src="${safeImg(p.image)}" alt="" loading="lazy">`:`<b>${esc([...(p.name||'?')][0]||'?')}</b>`}</span></span>${p.partner?'<i class="tps">★</i>':''}<small>${esc(p.name||'')}</small>${baseTot(p)?`<em class="tpc ${prCls(prideOf(p))}" title="프라이드 ${esc(prideOf(p))} · 통솔점 ${prideCost(t,p)}${(p.partner||soloN(t)===2)&&prideCost(t,p)<pnum((prRow(prideOf(p))||[])[1],0)?' (파트너 할인)':''}"><b>${esc(prideOf(p))}</b><i>${prideCost(t,p)}</i></em>`:''}</button>`).join('')}${Array.from({length:Math.max(0,6-ms.length)},()=>'<span class="tpm empty"><span class="tpr"><span class="tpi"></span></span><small>&nbsp;</small></span>').join('')}</div>`}
function tUqHTML(t,ti){const U=(t.unique||[]).map((u,j)=>({u,j})).filter(x=>x.u&&x.u.name&&x.u.name.trim());if(!U.length)return '';
 return `<div class="tuql">${U.slice(0,3).map(({u,j})=>{const c=safeCss(u.color)||UQ_COL[0];return `<button type="button" class="tuqc" style="--uc:${c}" data-act="tuq" data-i="${ti}" data-j="${j}" title="${esc(String(u.eff||'').replace(/<br\s*\/?>/gi,' ').slice(0,300))}"><em>${u.icon?esc(u.icon):'UNIQUE'}</em><b>${esc(u.name)}</b>${u.sub?`<small>${esc(u.sub)}</small>`:''}</button>`}).join('')}${U.length>3?`<button type="button" class="tuqc more" data-act="tuq" data-i="${ti}" data-j="${U[3].j}" title="나머지 고유 포텐셜 보기">+${U.length-3}</button>`:''}</div>`}
/* 10-22 망령: 트레이너 카드의 고유 칩 → 고유 정보창. 위쪽 단추로 다른 고유로 넘기고, 편집 · 꾸미기로 바로 간다 */
function openUqInfo(T,j){const U=(T.unique||[]).map((u,k)=>({u,k})).filter(x=>x.u&&x.u.name&&x.u.name.trim());if(!U.length)return;let cur=U.some(x=>x.k===j)?j:U[0].k;
 const l=openModal(`<div class="mhead"><h2>고유 포텐셜 <span class="small muted" style="font-weight:400">${esc(T.name||'')}</span></h2><span class="sp"></span><button class="btn ghost" data-x>닫기</button></div><div class="mbody uqv-body"></div>`);
 const body=$('.uqv-body',l);
 const draw=()=>{const u=T.unique[cur]||{};const c=safeCss(u.color)||UQ_COL[0];
  body.innerHTML=`${U.length>1?`<div class="uqv-tabs">${U.map(({u:x,k})=>`<button type="button" class="uqv-tab ${k===cur?'on':''}" style="--uc:${safeCss(x.color)||UQ_COL[0]}" data-uqk="${k}">${x.icon?`<i>${esc(x.icon)}</i>`:''}${esc(x.name)}</button>`).join('')}</div>`:''}
   <div class="uqv" style="--uc:${c}"><div class="uqv-h"><span class="uqv-b">${u.icon?esc(u.icon):'UNIQUE'}</span><div><b class="uqv-n">『${esc(u.name)}』</b>${u.sub?`<div class="uqv-s">${esc(u.sub)}</div>`:''}</div></div>
    <div class="uqv-e">${u.eff?fxTxt(u.eff):'<span class="faint">효과가 비어 있다</span>'}</div>${u.auto?`<div class="uqv-a small muted">⚙ 자동화 구문 있음</div>`:''}</div>
   <div class="row" style="margin-top:12px;gap:6px"><span class="sp"></span><button class="btn sm ghost" data-uqdeco>🎨 꾸미기</button><button class="btn sm pri" data-uqedit>편집</button></div>`;
  body.querySelectorAll('[data-uqk]').forEach(b=>b.onclick=()=>{cur=+b.dataset.uqk;draw()});
  $('[data-uqedit]',body).onclick=()=>{closeModal();openPotEditor(T,null,{unique:cur})};
  $('[data-uqdeco]',body).onclick=()=>{closeModal();openUqDeco(T,cur,()=>refreshTrainer(T))}};
 draw();l.querySelectorAll('[data-x]').forEach(b=>b.onclick=()=>closeModal())}
/* 트레이너 상세 (10-26 망령): 백스토리 · 성격 · 말투 · 선호하는 전법 등 — t.bio=[{k,v}] · 오레마스 캐릭터 탭 「상세」에 그대로 */
/* 10-26 망령: 세션 노트 공개 칸과 하나로 — 노트 PC/NPC 시트의 공개 칸 = 이 「상세」(t.bio). 예전 노트 칸(t.rp)은 처음 열 때 여기로 옮겨진다 */
const BIO_DEF=['백스토리','성격','말투','겉모습','목표 · 동기','인간관계','선호하는 전법','메모'],BIO_NPC=['PL 이 아는 것'];
const bioDef=t=>t&&t.kind==='npc'?BIO_DEF.concat(BIO_NPC):BIO_DEF;
const RP2BIO=(t,k)=>({bg:'백스토리',goal:'목표 · 동기',bond:'인간관계',style:'말투',note:t&&t.kind==='npc'?'PL 이 아는 것':'메모'})[k];
function bioOf(t){const D=bioDef(t);const L=(Array.isArray(t.bio)?t.bio:[]).filter(x=>x&&(x.k||x.v)).map(x=>({k:String(x.k||''),v:String(x.v||'')}));
 const rp=t.rp||{};for(const k in rp){const lab=RP2BIO(t,k);const v=String(rp[k]||'').trim();if(!lab||!v)continue;const e=L.find(x=>x.k===lab);if(!e)L.push({k:lab,v});else if(!String(e.v).trim())e.v=v}
 for(const k of D)if(!L.some(x=>x.k===k))L.push({k,v:''});const o=k=>{const i=D.indexOf(k);return i<0?99:i};return L.sort((a,b)=>o(a.k)-o(b.k))}
const bioN=t=>bioOf(t).filter(x=>String(x.v||'').trim()).length;
function openBio(T,done){let L=bioOf(T);
 const row=(x,i)=>`<div class="bior" data-bi="${i}" style="border:1px solid var(--line,#ddd);border-radius:8px;padding:8px;display:flex;flex-direction:column;gap:6px">
  <div class="row" style="gap:6px;align-items:center">${bioDef(T).includes(x.k)?`<b style="flex:1">${esc(x.k)}</b>`:`<input data-bk value="${esc(x.k)}" placeholder="항목 이름 (예: 외모 · 좋아하는 것 · 대사)" style="flex:1;min-width:0">`}${bioDef(T).includes(x.k)?'':`<button type="button" class="btn sm ghost danger" data-bdel aria-label="이 항목 지우기">✕</button>`}</div>
  <textarea data-bv rows="${x.k==='백스토리'?7:3}" placeholder="${esc(x.k==='말투'?'예) 존댓말 · 말끝을 흐림 · 자주 쓰는 말':x.k==='선호하는 전법'?'예) 날씨 파티 · 교대전 · 먼저 깔고 버틴다':x.k==='성격'?'예) 겁이 많지만 동료를 위해서는 물러서지 않는다':'')}">${esc(x.v)}</textarea></div>`;
 const l=openModal(`<div class="mhead"><h2>상세 · ${esc(T.name||'트레이너')}</h2><span class="sp"></span><button class="btn ghost" data-x>닫기</button></div>
  <div class="mbody"><p class="small muted" style="margin:0">빈 칸은 보이지 않는다 · 세션 노트 PC/NPC 시트의 공개 칸과 같은 칸 · 오레마스 캐릭터 탭 「상세」에도 나온다 (「제작기 동기화」 뒤)</p><div data-bl style="display:flex;flex-direction:column;gap:8px;margin-top:8px"></div>
   <button type="button" class="btn sm" data-badd style="margin-top:8px">+ 항목</button></div>
  <div class="mfoot"><span class="sp"></span><button class="btn" data-x>취소</button><button class="btn pri" data-bsave>저장</button></div>`,{wide:true});
 const read=()=>{$$('[data-bi]',l).forEach(el=>{const x=L[+el.dataset.bi];if(!x)return;const k=$('[data-bk]',el);if(k)x.k=k.value.trim();x.v=$('[data-bv]',el).value})};
 const draw=()=>{$('[data-bl]',l).innerHTML=L.map(row).join('')};draw();
 l.addEventListener('click',e=>{if(e.target.closest('[data-x]'))return closeModal();
  if(e.target.closest('[data-badd]')){read();L.push({k:'',v:''});draw();const ins=$$('[data-bk]',l);if(ins.length)ins[ins.length-1].focus();return}
  const d=e.target.closest('[data-bdel]');if(d){read();L.splice(+d.closest('[data-bi]').dataset.bi,1);draw();return}
  if(e.target.closest('[data-bsave]')){read();T.bio=L.map(x=>({k:x.k.trim()||'메모',v:x.v.replace(/\s+$/,'')})).filter(x=>x.v.trim());delete T.rp;delete T.rpAt;closeModal();done&&done();toast('상세를 저장했습니다')}})}
function openTDeco(T,done,FD){const d=T.deco||{};const st={color:safeCss(d.color)||'',title:d.title||'',bg:safeImg(d.bg)||'',pat:d.pat||'',icon:d.icon||''};   /* FD: 폴더 꾸미기 (10-24) */
 const l=openModal(`<div class="mhead"><h2>${FD?'폴더 꾸미기':'트레이너 카드 꾸미기'}</h2></div><div class="mbody"><div class="tdprev" data-tdprev></div>
  <div class="lbl" style="margin-top:12px">카드 색</div><div class="row uqsw" style="gap:6px;align-items:center"><button type="button" class="uqsw1 none" data-tc="" aria-label="기본" title="기본">✕</button>${UQ_COL.map(c=>`<button type="button" class="uqsw1" data-tc="${c}" style="background:${c}" aria-label="${c}"></button>`).join('')}<label class="small muted row" style="gap:4px">직접<input type="color" data-tcc value="${st.color.length===7?st.color:'#7b4fd6'}"></label></div>
  ${FD?`<div class="lbl" style="margin-top:10px">아이콘 <span class="small faint">이모지 · 글자 하나 (비우면 폴더 모양)</span></div><div class="row" style="gap:4px;flex-wrap:wrap;align-items:center"><input data-tci value="${esc(st.icon)}" maxlength="4" style="width:64px;text-align:center" autocomplete="off">${['📁','⭐','🔥','💧','🌿','⚡','🌙','👑','🎲','⚔️','🏆','🎀'].map(x=>`<button type="button" class="btn sm ghost" data-tcip="${x}">${x}</button>`).join('')}</div>`:''}
  <label class="lbl" style="margin-top:10px">${FD?'부제 <span class="small faint">이름 아래 작게 (예: 3월 세션 · 화요일 팀)</span>':'칭호 <span class="small faint">이름 아래 작게 (예: 무진의 떠돌이 박사)</span>'}<input data-tct value="${esc(st.title)}" maxlength="40" autocomplete="off"></label>
  <div class="lbl" style="margin-top:10px">무늬</div><div class="row" style="gap:6px;flex-wrap:wrap">${TD_PAT.map(([k,n])=>`<button type="button" class="btn sm ${st.pat===k?'pri':''}" data-tp="${k}">${n}</button>`).join('')}</div>
  <div class="lbl" style="margin-top:10px">배경 그림 <span class="small faint">카드 오른쪽에 흐리게 · 클릭 · 끌어다 놓기 · 붙여넣기 · 주소</span></div>
  <div class="row" style="gap:6px;flex-wrap:nowrap"><input data-tcb value="${esc(/^data:/.test(st.bg)?'':st.bg)}" placeholder="${/^data:/.test(st.bg)?'(올린 그림)':'https://…'}" style="flex:1;min-width:0" autocomplete="off"><label class="btn sm">파일<input type="file" accept="image/*" data-tcf hidden></label><button type="button" class="btn sm ghost" data-tcx title="배경 그림 지우기">✕</button></div></div>
  <div class="mfoot"><button class="btn ghost" data-tcr>기본으로</button><span class="sp"></span><button class="btn" data-x="no">취소</button><button class="btn pri" data-x="ok">저장</button></div>`);
 const pv=()=>{const tt=Object.assign({},T,{deco:st});if(FD){const n=S.trainers.map((t,ti)=>[t,ti]).filter(([t])=>tFolder(t)===T.id);$('[data-tdprev]',l).innerHTML=`<div class="tfold">${folderHead(tt,T.name||'이름 없는 폴더',n,false,1)}</div>`;l.querySelectorAll('[data-tc]').forEach(x=>x.classList.toggle('on',x.dataset.tc===st.color));l.querySelectorAll('[data-tp]').forEach(x=>x.classList.toggle('pri',x.dataset.tp===st.pat));return}$('[data-tdprev]',l).innerHTML=`<div class="folder tdpw"><header class="fh tcard ${tDecoCls(tt)}" style="${tDecoVars(tt)}"><span class="avatar">${safeImg(T.image)?`<img src="${safeImg(T.image)}" alt="">`:esc([...(T.name||'?')][0]||'?')}</span><div class="tmain"><div class="tl1"><span class="tname">${esc(T.name)}</span></div>${st.title?`<div class="ttitle">${esc(st.title)}</div>`:''}<div class="tl3"><span class="row trk">${QUAL.map(q=>rkChip(q,T.ranks[q])).join('')}</span></div></div>${tPartyHTML(T,-1).replace(/data-act="tpk"/g,'')}</header></div>`;
  l.querySelectorAll('[data-tc]').forEach(x=>x.classList.toggle('on',x.dataset.tc===st.color));l.querySelectorAll('[data-tp]').forEach(x=>x.classList.toggle('pri',x.dataset.tp===st.pat))};pv();
 const setBg=f=>{if(!f||!/^image\//.test(f.type))return;readImg(f,1000,'image/webp',u=>{st.bg=u;$('[data-tcb]',l).value='';$('[data-tcb]',l).placeholder='(올린 그림)';pv();
  /* 10-23 이그레스: 고르자마자 공유 저장소에 올려 주소로 바꾼다 (저장을 먼저 누르면 예전처럼 저장 뒤에 옮긴다) */
  if(shHostOn())hostImg(FD?'fb':'tb',T.id,u).then(url=>{if(st.bg!==u)return;st.bg=url;$('[data-tcb]',l).value=url;pv()}).catch(e=>console.warn('[배경 그림]',e))})};
 l.querySelectorAll('[data-tc]').forEach(x=>x.onclick=()=>{st.color=x.dataset.tc;if(st.color)$('[data-tcc]',l).value=st.color;pv()});
 $('[data-tcc]',l).oninput=e=>{st.color=e.target.value;pv()};$('[data-tct]',l).oninput=e=>{st.title=e.target.value.trim();pv()};if(FD){$('[data-tci]',l).oninput=e=>{st.icon=e.target.value.trim();pv()};l.querySelectorAll('[data-tcip]').forEach(x=>x.onclick=()=>{st.icon=x.dataset.tcip;$('[data-tci]',l).value=st.icon;pv()})}
 l.querySelectorAll('[data-tp]').forEach(x=>x.onclick=()=>{st.pat=x.dataset.tp;pv()});
 $('[data-tcb]',l).onchange=e=>{const v=e.target.value.trim();if(!v||/^https?:\/\//.test(v)){st.bg=v;pv()}else toast('https:// 로 시작하는 주소를 넣어 주세요')};
 $('[data-tcf]',l).onchange=e=>setBg(e.target.files[0]);$('[data-tcx]',l).onclick=()=>{st.bg='';$('[data-tcb]',l).value='';$('[data-tcb]',l).placeholder='https://…';pv()};
 const box=$('.mbox',l)||l;box.addEventListener('dragover',e=>{e.preventDefault()});box.addEventListener('drop',e=>{const f=e.dataTransfer&&[...e.dataTransfer.files].find(x=>/^image\//.test(x.type));if(f){e.preventDefault();e.stopPropagation();setBg(f)}});
 box.addEventListener('paste',e=>{const it=[...(e.clipboardData&&e.clipboardData.items||[])].find(x=>x.type.startsWith('image/'));if(it){e.preventDefault();e.stopPropagation();setBg(it.getAsFile())}});
 $('[data-tcr]',l).onclick=()=>{st.color='';st.title='';st.bg='';st.pat='';st.icon='';if(FD)$('[data-tci]',l).value='';$('[data-tct]',l).value='';$('[data-tcb]',l).value='';pv()};
 $('[data-x="no"]',l).onclick=()=>closeModal();
 $('[data-x="ok"]',l).onclick=()=>{const o={};if(st.color)o.color=st.color;if(st.title)o.title=st.title;if(st.bg)o.bg=st.bg;if(st.pat)o.pat=st.pat;if(FD&&st.icon)o.icon=st.icon;if(Object.keys(o).length)T.deco=o;else delete T.deco;closeModal();done();
  if(o.bg&&/^data:/.test(o.bg)&&shHostOn())hostImg(FD?'fb':'tb',T.id,o.bg).then(url=>{if(!T.deco||T.deco.bg!==o.bg)return;T.deco.bg=url;save();if(FD)renderChar();else refreshTrainer(T)}).catch(e=>toast('배경 그림을 공유 저장소에 올리지 못해 시트 안에 넣었습니다 ('+e.message+')'))}}
/* html2canvas 1.4 는 color(srgb …) · oklch 같은 새 색 함수를 못 읽는다 (color-mix 의 계산 값이 그 꼴) → 복제본의 계산된 색을 rgba 로 바꿔 넣는다 (::before · ::after 는 규칙으로) */
const PNG_PROPS=['color','background-color','background-image','border-top-color','border-right-color','border-bottom-color','border-left-color','outline-color','text-decoration-color','box-shadow','text-shadow','fill','stroke'];
const PNG_BAD=/color\(|oklch\(|oklab\(|\blab\(|\blch\(/;
function pngRgb(v){v=String(v).replace(/color\(srgb\s+([\d.e-]+)\s+([\d.e-]+)\s+([\d.e-]+)(?:\s*\/\s*([\d.e-]+%?))?\)/g,(_,r,g,b,a)=>`rgba(${Math.round(r*255)},${Math.round(g*255)},${Math.round(b*255)},${a==null?1:/%$/.test(a)?parseFloat(a)/100:+a})`);
 if(PNG_BAD.test(v)){let cx=null;try{cx=document.createElement('canvas').getContext('2d')}catch(e){}v=v.replace(/(color|oklch|oklab|lab|lch)\([^()]*\)/g,m=>{if(!cx)return 'rgba(0,0,0,0)';cx.fillStyle='rgba(0,0,0,0)';cx.fillStyle=m;const f=String(cx.fillStyle);return /^(#|rgb)/.test(f)?f:'rgba(0,0,0,0)'})}return v}
function pngFix(cdoc,root){const W=cdoc.defaultView;if(!W)return;const css=[];let n=0;const els=[root,...root.querySelectorAll('*')];
 for(const el of els){const cs=W.getComputedStyle(el);for(const p of PNG_PROPS){const v=cs.getPropertyValue(p);if(v&&PNG_BAD.test(v))el.style.setProperty(p,pngRgb(v),'important')}
  for(const ps of ['::before','::after']){const c2=W.getComputedStyle(el,ps);if(!c2||c2.content==='none'||c2.content==='normal')continue;const fx=[];for(const p of PNG_PROPS){const v=c2.getPropertyValue(p);if(v&&PNG_BAD.test(v))fx.push(`${p}:${pngRgb(v)} !important`)}
   if(fx.length){const k='pngfx'+(n++);el.classList.add(k);css.push(`.${k}${ps}{${fx.join(';')}}`)}}}
 if(css.length){const s=cdoc.createElement('style');s.textContent=css.join('\n');cdoc.head.appendChild(s)}}

/* 10-22 망령: 포켓몬 한 장 요약 — 이름·타입·특성·기술·능력치·상성·전용·포텐셜을 한 화면에 (PNG 로 저장) */
function fxTxt(s){return esc(brN(s)).replace(/\n/g,'<br>').replace(/「([^」<]{1,40})」/g,'<span class="cq">「$1」</span>').replace(/『([^』<]{1,40})』/g,'<span class="cq2">『$1』</span>').replace(/【([^】<]{1,30})】/g,'<span class="cq3">【$1】</span>')}
function pokeCardHTML(t,p,ed){const E=(k,v,tt,x)=>ed?`<button type="button" class="pce${x?' '+x:''}" data-pce="${k}"${v!=null?` data-v="${esc(v)}"`:''} title="${esc(tt||'고치기')}">${x==='add'?'＋':x==='del'?'×':'✎'}</button>`:'';   /* 10-24 망령: 한 장 요약에서 바로 고치기 · 더하기 (ed) */const tys=[p.t1,p.t2,p.t3].filter(x=>x&&x!=='-').flatMap(tyParts);const ab=idx.abil.get(p.ability),it=itemRow(p);
 const tot=p.base.reduce((a,b)=>a+(+b||0),0);const cap=moveCap(t,p);
 const mv=p.moves.filter(m=>m.name&&!m.hide).map(m=>{const r=idx.moves.get(m.name)||[];   /* 「숨김」 기술은 한 장 요약에 안 나온다 */const g=i=>r[i]??'';const ti=typeInfo(g(5));return {name:m.name,ty:g(5),bg:ti&&safeCss(ti[1])||'var(--sunk2)',fg:ti&&safeCss(ti[2])||'var(--ink)',cat:g(6),pow:g(7),acc:g(8),range:g(9),prio:g(11),eff:g(13)}});
 const all=S.db.types.map(x=>x[0]).filter(x=>x&&x!=='-'&&tyChart()[x]);const mul={};for(const a of all)mul[a]=tyMult(a,tys);
 const grp=[[4,'4배','x4'],[2,'2배','x2'],[0.5,'1/2','h'],[0.25,'1/4','q'],[0,'무효','z']].map(([v,l,c])=>({l,c,list:all.filter(a=>v===4?mul[a]>=4:v===2?mul[a]===2:v===0.5?mul[a]===0.5:v===0.25?mul[a]>0&&mul[a]<=0.25:mul[a]===0)})).filter(g=>g.list.length);
 const pots=p.pots.map((n,i)=>({n,i,k:potKindOf(p,i),e:potEffOf(p,i)})).filter(x=>x.n&&x.n!=='-');const XL=exclAll(p);
 const sub=[roleOf(p),classOf(p),prideOf(p)?'프라이드 '+prideOf(p):''].filter(Boolean).join(' · ');
 return `<div class="pcd" style="${pkVars(p)}"><div class="pcd-l">
  <div class="pcd-hd"><div class="pcd-img">${safeImg(p.image)?`<img src="${safeImg(p.image)}" alt="">`:'<span class="pav ph0"></span>'}</div>
   <div class="pcd-ttl"><div class="pcd-nm">${p.partner?'<span class="pstar">★</span>':''}${esc(p.name||'(이름 없음)')}${genderGlyph(p.gender)}<span class="lvb">Lv.${lv(t,p)}</span>${E('name',null,'이름 고치기')}</div>
    <div class="pcd-sub">${esc(sub)}${t.name?` · <span class="faint">${esc(t.name)}</span>`:''}</div>
    <div class="pcd-tags"><span class="chips">${tchip(p.t1)}${tchip(p.t2)}${tchip(p.t3)}</span>${E('types',null,'타입 · 테라 · 알그룹 고치기')}${p.tera&&p.tera!=='-'?`<span class="pcd-k">테라</span><span class="chips">${tchip(p.tera)}</span>`:''}${[p.egg1,p.egg2].some(x=>x&&x!=='-')?`<span class="pcd-k">알그룹</span><span class="pcd-v">${esc([p.egg1,p.egg2].filter(x=>x&&x!=='-').join(' · '))}</span>`:''}</div>
   </div></div>
  <div class="pcd-ab"><span class="pcd-k">특성</span><b>${esc(p.ability||'-')}</b>${E('abil',null,'특성 고르기')}${ab?`<div class="pcd-e">${fxTxt(ab[2])}</div>`:''}</div>
  ${p.item||ed?`<div class="pcd-ab"><span class="pcd-k">도구</span><b>${esc(p.item||'-')}</b>${E('item',null,'도구 고르기')}${ed&&p.item?E('itemx',null,'도구 빼기','del'):''}${it?`<div class="pcd-e">${fxTxt(it[4])}</div>`:''}</div>`:''}${(p.items2||[]).filter(x=>x.item).map(x=>{const r=itemRow(x);return `<div class="pcd-ab"><span class="pcd-k">도구</span><b>${esc(x.item)}</b>${r?`<div class="pcd-e">${fxTxt(r[4])}</div>`:''}</div>`}).join('')}
  <div class="pcd-st">${STATS.map((sn,i)=>{const eb=effB(t,p)[i];const tip=buTip(t,p,i);const v=+eb||0,g=grade(eb);return `<div class="pcd-sr" ${tip?`title="${esc(tip)}"`:''}><span class="pcd-sl">${sn}</span><span class="pcd-bar"><i style="width:${Math.min(100,v/180*100)}%;background:${gcol(g)}"></i></span><b class="pcd-g" style="background:${gcol(g)}">${tip?'▲':''}${esc(g)}</b><span class="num pcd-sv">${p.base[i]===''?'-':v}</span><span class="num faint pcd-sa">${p.base[i]===''?'':stat(t,p,i)}</span></div>`}).join('')}<div class="pcd-tot small muted">${E('base',null,'종족치 고치기')}종족치 합 <b class="num">${tot}</b>${cap.cap!=null?` · 기술 ${capTxt(cap,'-','/')}`:''}</div></div>
   <div class="pcd-ty"><div class="pcd-h">받는 상성</div>${grp.length?grp.map(g=>`<div class="pcd-tg ${g.c}"><span>${g.l}</span><div class="chips">${g.list.map(a=>tchip(a)).join('')}</div></div>`).join(''):'<div class="small faint">타입이 없다</div>'}</div></div>
  <div class="pcd-flow"><div class="pcd-mvc">${mv.length||ed?`<div class="pcd-h">기술 <span class="faint">${mv.length}</span>${E('mvadd',null,'기술 검색 · 추가 · 빼기','add')}</div>${mv.map(m=>`<div class="pcd-m" style="--mb:${m.bg};--mf:${m.fg}"><div class="pcd-mh"><b>${esc(m.name)}</b><span class="pcd-mt">${esc(m.ty)}</span>${E('mved',m.name,'다른 기술로 바꾸기')}${E('mvdel',m.name,'이 기술 빼기','del')}</div><div class="pcd-mm">${esc(m.cat||'-')} · 위력 ${esc(m.pow||'-')} · 명중 ${esc(m.acc||'-')} · ${esc(m.range||'-')}${m.prio&&+m.prio?` · 우선 ${esc(m.prio)}`:''}</div>${m.eff&&m.eff!=='-'?`<div class="pcd-e">${fxTxt(m.eff)}</div>`:''}</div>`).join('')}`:''}
  </div><div class="pcd-ptc">${XL.length||ed?`<div class="pcd-h">전용 포텐셜${E('exadd',null,'전용 포텐셜 더하기','add')}</div>${XL.map(x=>`<div class="pcd-x"><b>『${esc(x.name)}』</b>${E('exed',x===p.excl?'excl':'x'+(p.exclX||[]).indexOf(x),'전용 포텐셜 고치기')}<div class="pcd-e">${fxTxt(x.eff)}</div></div>`).join('')}`:''}
  ${pots.length||ed?`<div class="pcd-h">포텐셜 <span class="faint">${pots.length}</span>${p.pots.some(n=>!n)?E('potadd',null,'빈 칸에 포텐셜 더하기','add'):''}</div><div class="pcd-ptg">${pots.map(x=>`<div class="pcd-p"><span class="pcd-pk">${esc(x.k||SLOTS[x.i]||'')}</span><b>『${esc(x.n)}』</b>${E('poted',x.i,'포텐셜 고치기')}${E('potdel',x.i,'이 포텐셜 빼기','del')}<div class="pcd-e">${fxTxt(x.e)}</div></div>`).join('')}</div>`:''}
  ${p.memo||ed?`<div class="pcd-h">메모${E('memo',null,'메모 고치기')}</div><div class="pcd-e pcd-memo">${esc(p.memo||'')}</div>`:''}</div></div></div>`}
/* 10-22 망령: 로그 탭(logtool/, 같은 출처 iframe)의 「제작기 그림 잇기」가 읽는 캐릭터 그림 목록 */
window.MKM_CHARS=()=>S.trainers.flatMap(t=>[{name:t.name,image:safeImg(t.image)||'',kind:'trainer'},...(t.pokemon||[]).map(p=>({name:p.name,image:safeImg(p.image)||'',kind:'poke'}))]).filter(x=>x.name&&x.image);
function goPoke(T,P){T.open=true;P.open=true;save();refreshTrainer(T);requestAnimationFrame(()=>{const el=document.getElementById('pk-'+P.id);if(el)el.scrollIntoView({behavior:'smooth',block:'start'})})}
function openPokeCard(t,p){const l=openModal(`<div class="mhead"><h2>한 장 요약</h2><span class="sp"></span><button class="btn sm" data-pced title="이 요약에서 바로 고치고 더한다 (✎ · ＋ · ×)">✎ 편집</button><button class="btn sm ghost" data-pcgo title="제작기에서 이 포켓몬 시트로 이동">시트로</button><button class="btn sm" data-pcpng title="이 요약을 그림 파일로 저장">PNG 저장</button><button class="btn sm ghost danger" data-pcdel title="이 포켓몬 시트를 지운다">삭제</button><button class="btn ghost" data-x>닫기</button></div><div class="mbody pcd-wrap">${pokeCardHTML(t,p)}</div>`,{wide:true});
 $('.mbox',l).classList.add('pcdbox');l.querySelectorAll('[data-x]').forEach(b=>b.onclick=()=>closeModal());
 /* 10-24 망령: 「✎ 편집」 — 요약 위에서 이름 · 특성 · 도구 · 기술 · 포텐셜 · 메모를 고치고 더한다. 고르기 창은 시트와 같은 것을 쓴다 */
 let ED=false;const wrap=$('.pcd-wrap',l);const depth=layers.length;
 const draw=()=>{if(!t.pokemon.includes(p))return;const sc=wrap.scrollTop;wrap.innerHTML=pokeCardHTML(t,p,ED);wrap.classList.toggle('pcd-ed',ED);wrap.scrollTop=sc;$('[data-pced]',l).classList.toggle('pri',ED);$('[data-pced]',l).textContent=ED?'✓ 편집 끝':'✎ 편집'};
 const done=()=>{save();try{refreshTrainer(t)}catch(e){}draw()};
 const back=()=>{const iv=setInterval(()=>{if(!l.isConnected){clearInterval(iv);return}if(layers.length<=depth){clearInterval(iv);done()}},200)};
 const askStr=(title,v,multi)=>new Promise(res=>{const m=openModal(`<div class="mhead"><h2>${esc(title)}</h2></div><div class="mbody">${multi?`<textarea data-as rows="6" style="width:100%">${esc(v||'')}</textarea>`:`<input data-as value="${esc(v||'')}" style="width:100%">`}</div><div class="mfoot"><span class="sp"></span><button class="btn" data-x="no">취소</button><button class="btn pri" data-x="ok">확인</button></div>`);const inp=$('[data-as]',m);setTimeout(()=>{inp.focus();inp.select&&inp.select()},30);
  if(!multi)inp.addEventListener('keydown',e=>{if(e.key==='Enter'&&!e.isComposing){e.preventDefault();const v2=inp.value;closeModal();res(v2)}});
  m.addEventListener('click',e=>{const x=e.target.closest('[data-x]');if(!x)return;const v2=x.dataset.x==='ok'?inp.value:null;closeModal();res(v2)})});
 $('[data-pced]',l).onclick=()=>{ED=!ED;draw()};
 wrap.addEventListener('click',async e=>{const b=e.target.closest('[data-pce]');if(!b||!ED)return;e.preventDefault();const k=b.dataset.pce,v=b.dataset.v;
  if(k==='name'){const n=await askStr('이름',p.name);if(n!=null){p.name=n.trim();done()}return}
  if(k==='memo'){const n=await askStr('메모',p.memo,true);if(n!=null){p.memo=n;done()}return}
  if(k==='abil'){openPicker('abil',{onPick:n=>{p.ability=n}});return back()}
  if(k==='item'){openPicker('items',{onPick:n=>{p.item=n}});return back()}
  if(k==='itemx'){p.item='';return done()}
  if(k==='mvadd'){openPicker('moves',{title:'기술 검색·추가',multi:true,hideOldOnly:!isOld(p),chosen:()=>new Set(p.moves.map(m=>m.name)),onPick:n=>{const m={name:n,half:false};p.moves.push(m);if(isBigMv(t,p,m))toast(`「${n}」 소켓 ${moveSock(p,m)} · ${bigMvRule(t)} · 경고만 띄우고 넣었습니다`)},onRemove:n=>{p.moves=p.moves.filter(m=>m.name!==n)}});return back()}
  if(k==='mved'){const ix=p.moves.findIndex(m=>m.name===v);if(ix<0)return;openPicker('moves',{title:`「${v}」 대신 넣을 기술`,hideOldOnly:!isOld(p),onPick:n=>{if(p.moves.some((m,j)=>j!==ix&&m.name===n))return toast('이미 있는 기술입니다');p.moves[ix]=Object.assign({},p.moves[ix],{name:n})}});return back()}
  if(k==='types'){const TY=S.db.types.map(x=>x[0]);const ty=TY.includes('-')?TY:['-',...TY];const EG=eggOpts();const sl=(f,lab,opts)=>`<label class="lbl">${lab}<select data-tf="${f}">${opts.map(o=>`<option value="${esc(o)}" ${o===(p[f]||'-')?'selected':''}>${esc(o)}</option>`).join('')}</select></label>`;
   const m=openModal(`<div class="mhead"><h2>타입 · 알그룹</h2></div><div class="mbody"><div class="fgrid">${sl('t1','타입1',ty)}${sl('t2','타입2',ty)}${sl('t3','타입3',ty)}${sl('tera','테라',ty)}${sl('egg1','알그룹1',EG)}${sl('egg2','알그룹2',EG)}</div></div><div class="mfoot"><span class="sp"></span><button class="btn" data-x="no">취소</button><button class="btn pri" data-x="ok">확인</button></div>`);
   m.addEventListener('click',ev=>{const x=ev.target.closest('[data-x]');if(!x)return;if(x.dataset.x==='ok')m.querySelectorAll('[data-tf]').forEach(se=>{p[se.dataset.tf]=se.value});closeModal();if(x.dataset.x==='ok')done()});return}
  if(k==='base'){const m=openModal(`<div class="mhead"><h2>종족치</h2></div><div class="mbody"><div class="fgrid">${STATS.map((sn,i)=>`<label class="lbl">${sn}<input type="number" min="0" step="1" data-bs="${i}" value="${esc(p.base[i]??'')}"></label>`).join('')}</div><div class="small muted" data-bst style="margin-top:6px"></div></div><div class="mfoot"><span class="sp"></span><button class="btn" data-x="no">취소</button><button class="btn pri" data-x="ok">확인</button></div>`);
   const sum=()=>{$('[data-bst]',m).textContent='합 '+[...m.querySelectorAll('[data-bs]')].reduce((a,i)=>a+(+i.value||0),0)};sum();m.addEventListener('input',sum);
   m.addEventListener('click',ev=>{const x=ev.target.closest('[data-x]');if(!x)return;if(x.dataset.x==='ok')m.querySelectorAll('[data-bs]').forEach(i=>{const v2=i.value.trim();p.base[+i.dataset.bs]=v2===''?'':String(Math.max(0,Math.round(+v2)||0))});closeModal();if(x.dataset.x==='ok')done()});return}
  if(k==='mvdel'){const ix=p.moves.findIndex(m=>m.name===v);if(ix>=0){p.moves.splice(ix,1);done()}return}
  if(k==='potadd'){const ix=p.pots.findIndex(n=>!n);if(ix<0)return toast('포텐셜 빈 칸이 없습니다');openPotEditor(t,p,ix);return back()}
  if(k==='poted'){openPotEditor(t,p,+v);return back()}
  if(k==='potdel'){const x=+v;if(!await ask(`포텐셜 「${esc(p.pots[x]||'')}」을(를) 뺄까요?`,'빼기'))return;p.pots[x]='';p.potEff[x]='';p.potKind[x]='';return done()}
  if(k==='exadd'){if(!p.excl||!p.excl.name){openPotEditor(t,p,'excl');return back()}p.exclX=p.exclX||[];p.exclX.push({name:'',eff:''});save();openPotEditor(t,p,{ex:p.exclX.length-1});return back()}
  if(k==='exed'){openPotEditor(t,p,v==='excl'?'excl':{ex:+String(v).slice(1)});return back()}});
 $('[data-pcgo]',l).onclick=()=>{closeModal();goPoke(t,p)};
 /* 10-24 망령: 트레이너 카드의 포켓몬 동그라미 → 한 장 요약에서도 바로 지울 수 있게 */
 $('[data-pcdel]',l).onclick=async()=>{const j=t.pokemon.indexOf(p);if(j<0)return;if(!await ask(`포켓몬 시트 「${esc(p.name||'이름 없음')}」을(를) 삭제할까요?<br><span class="small muted">${esc(t.name||'')} 의 ${j+1}번째 포켓몬 · 되돌릴 수 없습니다</span>`,'삭제'))return;t.pokemon.splice(j,1);save();closeModal();renderChar();toast(`「${p.name||'이름 없음'}」 삭제`)};
 $('[data-pcpng]',l).onclick=async()=>{if(ED){ED=false;draw()}const el=$('.pcd',l);try{if(!window.html2canvas)await new Promise((ok,no)=>{const sc=document.createElement('script');sc.src='https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js';sc.onload=ok;sc.onerror=()=>no(new Error('html2canvas 를 불러오지 못했다'));document.head.appendChild(sc)});
  const bg=getComputedStyle(MKROOT()).getPropertyValue('--surface')||'#fff';const cv=await window.html2canvas(el,{backgroundColor:bg.trim()||'#fff',scale:2,useCORS:true,onclone:(cd,ce)=>{try{pngFix(cd,ce)}catch(e){}}});const a=document.createElement('a');a.download=(p.name||'포켓몬')+'.png';a.href=cv.toDataURL('image/png');a.click()}catch(err){toast('PNG 로 저장하지 못했습니다 ('+err.message+')')}}}
/* 지시 체계 (10-23 망령): 명령 = ORDER(4식), 지령 = COMMAND(6령). t.orders={preset,tc,base}. 오레마스로 가져가면 이 설정으로 횟수가 채워진다 (오레마스 OM_ORDERS 와 같은 표) */
const TORD=(()=>{const CL=['기본-일반','기본-숙달','기본-숙달 (지시 A)','십계-영창 (지시 B)','십계-영창 (지시 A)','십계-영창 (지시 AA)','특수-방해','특수-야생','십계-영창 (지시 C)'];
 const OL=['협회식 4식','5계','칙령','주인의 칙령'];const LORD={0:['물러나!','피해라!','버텨라!','바꿔라!','맞춰라!'],1:['지킬 수 없다!','피할 수 없다!','버틸 수 없다!','맞출 수 없다!'],2:['물리결계','특수결계','정화의 법계','치유의 법계','윤회의 법계','파계'],3:['주인의 칙령']};
 const OK={0:['retreat','dodge','endure','return','snipe'],1:['retreat','dodge','endure','snipe'],2:['retreat','dodge','endure','return','snipe','special'],3:['retreat']};
 const ALL=['attack','defense','specialattack','specialdefense','speed','heal','accuracy','evasion'];const CK={0:ALL,1:ALL,2:ALL,3:ALL.slice(0,5),4:['attack','defense','specialattack','specialdefense','speed','accuracy','evasion'],5:['attack','defense','specialattack','specialdefense','speed','accuracy','evasion'],6:ALL,7:['attack','defense'],8:ALL.slice(0,5)};
 const SP=['공격','방어','특공','특방','민첩','회복','저격','회피'];const YC=['검의 영창','방패의 영창','관의 영창','잔의 영창','날개의 영창','촛불의 영창','장막의 영창'];
 const LCMD={0:SP.map(x=>x+'지령'),1:SP.map(x=>'숙달'+x+'지령'),2:SP.map(x=>'숙달'+x+'지령'),3:YC.slice(0,5),4:YC,5:YC,6:SP.map(x=>'방해'+x+'지령'),7:['주인의 호령 : 능력','주인의 호령 : 회복'],8:YC.slice(0,5)};
 const PRE=[['assoc','협회식'],['ten','십계'],['wild','야생'],['jam','방해'],['manual','직접 고름']];
 const tordOf=tc=>(tc>=3&&tc<=5)||tc===8?2:tc===6?1:tc===7?3:0;
 const rankLv=r=>{const b=String(r||'').replace(/[+\-]/g,'').toUpperCase();const m={E:0,D:0,C:1,B:2,A:3,AA:4,AAA:5,S:6,EX:6};return m.hasOwnProperty(b)?m[b]:1};
 const presetTc=(p,r)=>{const lv=rankLv(r);if(p==='assoc')return lv>=3?2:lv>=2?1:0;if(p==='ten')return lv>=4?5:lv>=3?4:lv>=2?3:8;if(p==='wild')return 7;if(p==='jam')return 6;return NaN};
 const zeros=(o,c)=>{let z=[];if(o===0)z=['special'];if(o===1)z=['return','special'];if(o===2)z=['heal'];if(o===3)z=['dodge','endure','return','snipe','special'];if(o===0&&c<=1)z.push('snipe','accuracy','evasion');if(o===0&&c===2)z.push('snipe');if(o===2&&c===3)z.push('special','accuracy','evasion');if(o===2&&c===4)z.push('special');if(o===2&&c===8)z.push('endure','return','snipe','special','accuracy','evasion');return z};
 const LO=['retreat','dodge','endure','return','snipe','special'],LC=ALL;const KO={retreat:'물러나',dodge:'피해라',endure:'버텨라',return:'바꿔라',snipe:'맞춰라',special:'특수',attack:'공격',defense:'방어',specialattack:'특공',specialdefense:'특방',speed:'스피드',heal:'회복',accuracy:'명중',evasion:'회피'};
 const nameOf=(kind,fam,k)=>{const keys=(kind==='o'?OK:CK)[fam]||[];const i=keys.indexOf(k);return i<0?'':((kind==='o'?LORD:LCMD)[fam]||[])[i]||''};
 return {CL,OL,LORD,OK,CK,LCMD,PRE,tordOf,presetTc,zeros,LO,LC,KO,nameOf,rankLv}})();
/* 1인 기준(2체): ORDER 는 soloOrd.o 개, COMMAND 는 soloOrd.c 개만 골라 쓴다 — 고른 항목만 기준 횟수, 나머지 0. t.orders.pick={o:[키],c:[키]} */
function soloOrdN(kind,t){const n=soloOrdN0(kind,t);return kind==='c'&&soloA(t)?Math.max(n,3):n}
function soloOrdN0(kind,t){if(soloN(t)===3){const R3=RULES().solo3||SOLO3_DEF;const v3=parseInt(R3[kind],10);return v3>=0?v3:+SOLO3_DEF[kind]}const R=RULES().soloOrd||SOLO_ORD_DEF;const v=parseInt(R[kind],10);return v>=0?v:+SOLO_ORD_DEF[kind]}
/* 10-27 망령: 1인 기준(2 · 3체)에서 지시 A 이상은 COMMAND(지령)를 3개 고르고, 그중 하나는 회피나 명중이어야 한다 */
const SOLO_A_MUST=['evasion','accuracy'];
function soloA(t){return !!soloN(t)&&TORD.rankLv((t.ranks||{})['지시'])>=3}
function soloMustOk(t,pk,avail){if(!soloA(t))return true;const can=SOLO_A_MUST.filter(k=>avail.includes(k));return !can.length||pk.some(k=>can.includes(k))}
function tOrdPick(t,kind){const pk=((t.orders||{}).pick||{})[kind];return Array.isArray(pk)?pk:[]}
function tOrdTc(t){const o=t.orders||{};if(o.preset==='manual')return Math.max(0,Math.min(8,+o.tc||0));return TORD.presetTc(o.preset,(t.ranks||{})['지시'])}
function tOrdHTML(t,ti){const o=t.orders||{};const p=o.preset||'';const rk=(t.ranks||{})['지시']||'C';const base=o.base==null||o.base===''?1:+o.base;
 const opts=`<option value="" ${!p?'selected':''}>정하지 않음 (오레마스 방 설정)</option>`+TORD.PRE.map(([k,n])=>{const tc=TORD.presetTc(k,rk);return `<option value="${k}" ${p===k?'selected':''}>${n}${isNaN(tc)?'':' → '+esc(TORD.CL[tc])}</option>`}).join('');
 let prev='';if(p){const tc=tOrdTc(t),to=TORD.tordOf(tc),z=TORD.zeros(to,tc);
  const ty=o.type||{};const avl={o:[],c:[]};const chips=kind=>{const keys=kind==='o'?TORD.LO:TORD.LC,def=kind==='o'?to:tc,L=kind==='o'?TORD.OL:TORD.CL;let exn=0;
   const h=keys.map(k=>{const v=ty[kind+'_'+k];const f=v==null?def:+v;const ex=f!==def;if(ex)exn++;const nm=TORD.nameOf(kind,f,k);const avail=!(!nm||(!ex&&z.includes(k)));const zero=!avail||(t.solo&&!tOrdPick(t,kind).includes(k));if(!nm&&!ex)return '';if(avail)avl[kind].push([k,nm]);
    return `<label class="ordc ed ${zero?'z':''} ${ex?'ex':''}" title="${esc(TORD.KO[k])} — 눌러서 이 항목만 다른 계열로${ex?' (지금 예외: '+L[f]+')':''}"><span>${esc(nm||TORD.KO[k])}</span><b>${zero?0:base}</b>${ex?'<i>예외</i>':''}<select data-tordx="${ti}" data-kind="${kind}" data-key="${k}" aria-label="${esc(TORD.KO[k])} 계열">${L.map((n,i)=>`<option value="${i}" ${f===i?'selected':''}>${esc(n)}${i===def?' (기본)':''} — ${esc(TORD.nameOf(kind,i,k)||'없음')}</option>`).join('')}</select></label>`}).join('');
   const add=keys.filter(k=>ty[kind+'_'+k]==null&&!TORD.nameOf(kind,def,k)&&L.some((_,i)=>TORD.nameOf(kind,i,k)));
   return h+(add.length?`<label class="ordc add" title="이 계열에 없는 항목을 다른 계열에서 가져온다"><span>＋ 다른 계열 항목</span><select data-tordadd="${ti}" data-kind="${kind}"><option value="">고르기</option>${add.map(k=>L.map((n,i)=>TORD.nameOf(kind,i,k)?`<option value="${k}:${i}">${esc(TORD.KO[k])} — ${esc(TORD.nameOf(kind,i,k))} (${esc(n)})</option>`:'').join('')).join('')}</select></label>`:'')+(exn?`<button type="button" class="btn xs ghost" data-act="tordReset" data-i="${ti}" data-kind="${kind}" title="예외 계열을 모두 지우고 기본으로">예외 ${exn}개 되돌리기</button>`:'')};
  /* 1인 기준: 쓸 수 있는 항목 중 정해진 수만 고른다 */
  const pickBar=kind=>{if(!t.solo)return '';const L=avl[kind],n=soloOrdN(kind,t),pk=tOrdPick(t,kind).filter(k=>L.some(x=>x[0]===k));const must=kind==='c'&&soloA(t)&&L.some(x=>SOLO_A_MUST.includes(x[0]));const mOk=kind!=='c'||soloMustOk(t,pk,L.map(x=>x[0]));const ok=pk.length===Math.min(n,L.length)&&mOk;
   return `<div class="ordpick ${ok?'':'need'}"><span class="small"><b>1인 기준${soloN(t)===3?' (3체)':''}</b> · ${L.length}개 중 <b>${n}</b>개 고르기 <b class="num">${pk.length}/${n}</b>${must?` · <b class="${mOk?'':'warn'}" title="지시 A 이상 1인 기준: 지령 셋 중 하나는 회피나 명중">회피 · 명중 중 1개 필수${mOk?' ✓':''}</b>`:''}</span>${L.map(([k,nm])=>`<button type="button" class="ordpb ${pk.includes(k)?'on':''}" data-act="tordPick" data-i="${ti}" data-kind="${kind}" data-key="${k}" aria-pressed="${pk.includes(k)}">${esc(nm)}</button>`).join('')}</div>`};
  prev=`<div class="ordp"><div><span class="ordk o">ORDER</span><b>명령 (4식)</b><span class="small muted">${esc(TORD.OL[to])} · 칩을 눌러 항목마다 계열을 바꾼다</span></div><div class="ordl">${chips('o')}</div>${pickBar('o')}
   <div><span class="ordk c">COMMAND</span><b>지령 (6령)</b><span class="small muted">${esc(TORD.CL[tc])}</span></div><div class="ordl">${chips('c')}</div>${pickBar('c')}</div>`}
 return `<div class="tord"><div class="tordh"><b>지시 체계</b><span class="ordk o">ORDER</span><span class="ordk c">COMMAND</span><span class="small muted">지시 ${esc(rk)}</span></div>
  <label class="plrow"><span>지령 종류</span><select data-tord="${ti}" data-k="preset">${opts}</select></label>
  ${p==='manual'?`<label class="plrow"><span>계열</span><select data-tord="${ti}" data-k="tc">${TORD.CL.map((n,i)=>`<option value="${i}" ${+o.tc===i?'selected':''}>${i+1}. ${esc(n)}</option>`).join('')}</select></label>`:''}
  ${p?`<label class="plrow"><span>기준 횟수</span><input type="number" min="0" max="9" style="width:64px;flex:none" data-tord="${ti}" data-k="base" value="${base}"><span class="small muted" style="font-weight:400">항목마다 이 횟수</span></label>${prev}`:'<p class="small muted" style="margin:6px 0 0">고르면 오레마스로 가져갈 때 명령(4식)·지령(6령) 계열과 횟수가 자동으로 맞춰진다.</p>'}</div>`}
/* 10-26 망령: 세션 노트와 주고받는 공개 칸(RP). 노트의 「⇪ 제작기로」 · 「⇩ 제작기에서」 와 같은 칸이다 */
const RP_PC=[['bg','배경 · 설정'],['goal','목표 · 동기'],['bond','인간관계'],['style','말투 · 겉모습'],['note','메모']],RP_NPC=[['bg','정체 · 설정'],['goal','원하는 것 · 동기'],['bond','인간관계'],['style','말투 · 겉모습'],['note','PL 이 아는 것']];
function rpFold(t,P){const L=t.kind==='npc'?RP_NPC:RP_PC;const rp=t.rp||{};const n=L.filter(([k])=>rp[k]).length;
 return `<details class="rpfold" ${n?'':''}><summary>세션 노트 공개 칸 <span class="small faint">${n?n+'칸 채움':'비어 있음'}${t.rpAt?' · 노트에서 '+new Date(t.rpAt).toLocaleDateString('ko-KR'):''}</span></summary><div class="rpg">${L.map(([k,l])=>`<label class="lbl"><span class="small muted">${l}</span><textarea data-p="${P}.rp.${k}" rows="2">${esc(rp[k]||'')}</textarea></label>`).join('')}</div><p class="small faint" style="margin:4px 0 0">세션 노트의 PC/NPC 시트와 주고받는 칸이에요. 비밀 칸 · GM 메모는 노트에만 있어요.</p></details>`}
function trainerHTML(t,ti){const P=`T.${ti}`;const use=pointUse(t);const iv=investCheck(t);const pu=ptSockets(t),pm=ptMax(t);
 return `<section class="folder ${t.open?'open':''}" id="tr-${t.id}" data-ti="${ti}" data-si="${ti}">
 <header class="fh tcard ${tDecoCls(t)}" style="${tDecoVars(t)}" data-tog="${P}" data-grab tabindex="0" role="button" data-kbd aria-expanded="${!!t.open}" aria-label="${esc(t.name||'트레이너')} 펼치기/접기"><span class="caret">▸</span><span class="avatar">${safeImg(t.image)?`<img src="${safeImg(t.image)}" alt="">`:esc([...(t.name||'?')][0]||'?')}</span>
  <div class="tmain"><div class="tl1"><span class="tname">${esc(t.name)}</span>${FAV.btn('t',t.id)}${t.kind==='npc'?'<span class="plchip npc" title="NPC — 오레마스 관계도에 NPC 노드로 들어간다">NPC</span>':''}${t.priv?`<span class="kindb privchip" title="${esc('비공개 · '+(t.ownerName||'')+(ME.gm?' (GM 열람)':''))}">🔒</span>`:''}${(t.pl||'').trim()?`<span class="plchip" title="PL">PL <b>${esc(t.pl.trim())}</b></span>`:''}</div>${(t.deco||{}).title?`<div class="ttitle">${esc(t.deco.title)}</div>`:''}
   <div class="tl3"><span class="row trk">${QUAL.map(q=>rkChip(q,t.ranks[q])).join('')}</span><span class="small muted tmeta">${(()=>{const n=(ptItems().find(r=>r[2]==='pride')||[])[0];if(!n)return `포켓몬 ${t.pokemon.length}체`;const u=Math.round((use[n]||0)*100)/100,m=+t.base[n]||0;return `통솔점 <b class="${u>m?'warn':''} num">${u}/${m}</b>`})()} · PT 기술점 <b class="${pu>pm?'warn':''} num">${pu}/${pm}</b></span></div></div>
  ${tPartyHTML(t,ti)}${tUqHTML(t,ti)}<span class="sp"></span>
  <div class="tacts">${S.folders.length?`<select class="tmove" data-tmove="${ti}" aria-label="폴더 이동" title="폴더 이동"><option value="">폴더 없음</option>${[fTreeOpts(tFolder(t))].join('')}</select>`:''}<button class="btn sm ghost" data-act="decoT" data-i="${ti}" title="카드 색 · 칭호 · 배경 그림 · 무늬">🎨 꾸미기</button><button class="btn sm ghost" data-act="privT" data-i="${ti}" title="비공개 트레이너는 만든 사람(같은 비밀구)과 GM 에게만 보입니다">${t.priv?'공개로':'비공개'}</button><button class="btn sm ghost" data-act="dupT" data-i="${ti}">복제</button><button class="btn sm ghost danger" data-act="delT" data-i="${ti}">삭제</button></div></header>
 ${t.open?`<div class="fb"><div class="tgrid">
  <div class="panel"><h3>프로필<span class="sp"></span><button class="btn sm" data-act="bioT" data-i="${ti}" title="백스토리 · 성격 · 말투 · 선호하는 전법 · 그 밖에 — 오레마스 캐릭터 탭에 그대로 보인다">상세${bioN(t)?` <b class="num">${bioN(t)}</b>`:''}</button></h3><label class="lbl" for="tn-${t.id}">이름${inp(P+'.name',t.name,{id:'tn-'+t.id})}</label>
   <div class="imgbox" style="margin-top:8px">${safeImg(t.image)?`<img src="${safeImg(t.image)}" alt="트레이너 이미지">`:'<span class="small">이미지 없음</span>'}</div>
   <div class="row" style="margin-top:6px"><label class="btn sm" for="img-${t.id}" tabindex="0" role="button" data-kbd>이미지 삽입</label><input type="file" id="img-${t.id}" accept="image/*" data-img="${ti}" hidden>${t.image?`<button class="btn sm ghost" data-act="noimg" data-i="${ti}">제거</button>`:''}</div>
   <h3 style="margin-top:14px"><span style="white-space:nowrap;flex:none">스탠딩</span> <span class="small muted" style="font-weight:normal">오레마스 무대용 · 전신 투명 PNG</span></h3>
   ${standsHtml(t,'t:'+ti)}</div>
  <div class="tright"><div class="panel"><h3>자질<span class="sp"></span><button class="btn sm" data-act="tpl" data-i="${ti}" title="랭크 템플릿(테이블·계산식 탭)을 포인트 기본값에 다시 적용">템플릿 다시 적용</button></h3>
   <table><tr><th>자질</th><th>랭크 <span class="small faint" style="font-weight:400">직접 입력 가능</span></th><th>상세 사항</th></tr>${QUAL.map(q=>`<tr><td><b>${q}</b></td><td>${inp(`${P}.ranks.${q}`,t.ranks[q],{w:'76px',list:'mk-ranks'})}</td><td>${inp(`${P}.detail.${q}`,t.detail[q],{ph:'메모'})}</td></tr>`).join('')}</table>
   <datalist id="mk-ranks">${RANKS.map(r=>`<option value="${r}">`).join('')}</datalist><div class="invest ${iv.msg.length?'bad':''}">${iv.msg.length?iv.msg.map(esc).join(' · '):`자질 투자 ${iv.steps}/${iv.allow}회 · 규칙 이상 없음`}</div>
   <p class="small muted" style="margin:6px 0 0">육성 ${esc(t.ranks['육성'])} → 기본 레벨 <b>${baseLevel(t.ranks['육성'])}</b> · 포켓몬 기술 소켓 상한 ${esc((sockRow(t.ranks['육성'])||[])[6]??'-')}</p>
   <label class="plrow"><span>PL</span>${inp(P+'.pl',t.pl,{ph:'플레이어 이름'})}</label>
   <label class="plrow" title="오레마스 방으로 가져갈 때 관계도·휴대폰에서 PC(플레이어)인지 NPC 인지"><span>구분</span><select data-p="${P}.kind"><option value="pc" ${t.kind!=='npc'?'selected':''}>PC (플레이어 캐릭터)</option><option value="npc" ${t.kind==='npc'?'selected':''}>NPC</option></select></label>${tOrdHTML(t,ti)}</div>
  <div class="panel"><h3>포인트<span class="sp"></span>${soloN(t)===3?`<span class="small muted" title="1인 기준 (3체) 파트너 수 — 테이블·계산식 「1인 기준 (3체)」">파트너 ${t.pokemon.filter(p=>p.partner).length}/${esc((RULES().solo3||SOLO3_DEF).partner)}</span>`:''}<select data-p="${P}.solo" class="solosel" title="6체 기준 / 1인 기준 — 바꾸면 포인트 기본값을 그 기준 템플릿으로 다시 맞춘다">${[['','6체 기준'],['2','1인 기준 (2체)'],['3','1인 기준 (3체)']].map(([v,l])=>`<option value="${v}" ${String(soloN(t)||'')===v?'selected':''}>${l}</option>`).join('')}</select></h3><table><tr><th>항목</th><th class="n">기본</th><th class="n">소모</th><th class="n">잔여</th></tr>
   ${ptItems().map(([k,d])=>{if(t.base[k]==null)t.base[k]=+d||0;const r=(+t.base[k]||0)-(use[k]||0);return `<tr><td>${esc(k)}</td><td class="n">${inp(`${P}.base.${seg(k)}`,t.base[k],{w:'52px',num:1})}</td><td class="n">${use[k]||0}</td><td class="n ${r<0?'warn':''}">${r}</td></tr>`}).join('')}</table>
   <div class="row" style="margin-top:8px"><b class="small">포인트 사용 항목</b><span class="sp"></span><button class="btn sm" data-act="addPt" data-i="${ti}">+ 항목</button></div>
   <p class="small muted" style="margin:6px 0 0">자동 소모 · ${ptItems().filter(x=>x[2]).map(([n,,a])=>`${esc(n)} ${autoUse(t,a)} (${esc(PTI_AUTO[a]||a)})`).join(' · ')||'없음'}</p>
   ${t.pts.map((n,i)=>{const r=idx.points.get(n);return `<div class="row small" style="margin-top:4px"><span style="flex:1;min-width:0"><b>${esc(n)}</b> <span class="muted">${r?esc(r[3]+' −'+r[6]):''}</span></span><button class="btn sm ghost" data-act="delPt" data-i="${ti}" data-j="${i}" aria-label="삭제">✕</button></div>`}).join('')||'<p class="small faint" style="margin:4px 0 0">사용한 항목이 없습니다.</p>'}${deckHtml(t,ti)}</div>
 </div></div>
 <div class="panel uqpanel"><h3>『고유 포텐셜』<span class="small muted" style="font-weight:400">능력 ${esc(t.ranks['능력'])} · 최대 ${esc(abilLimits(t.ranks['능력']).u)}개</span><span class="sp"></span><button class="btn sm" data-act="addU" data-i="${ti}">+ 고유 포텐셜</button></h3><div class="uql">
  ${t.unique.map((u,i)=>uqCard(u,i,ti)).join('')||'<p class="small faint" style="margin:4px 0 0">아직 없습니다 — 「+ 고유 포텐셜」</p>'}</div></div>
 <div class="panel">${fieldsHtml(t,`data-i="${ti}"`,'t')}</div>
 <div class="panel mksppanel">${spHtml(t,ti)}</div>
 <div class="panel mksppanel">${extHtml(t,ti)}</div>   <!-- 10-27 망령: 기능 확장 · 해석 차단 기본값 -->   <!-- 10-26 망령: SP · 서포터는 필드 전개처럼 따로 가로 칸 -->
 <div class="panel ptbar"><h3>PT 기술점<b class="num ${pu>pm?'warn':''}">${pu}</b><span class="small muted">/ 최대치</span>${inp(P+'.ptMax',t.ptMax,{w:'58px',num:1,ph:String(ptMaxDef(t))})}${t.solo?`<span class="small muted">1인 기준 (${soloN(t)}체)</span>`:''}<button class="btn sm pttyb" type="button" data-act="ptType" data-i="${ti}" title="이 PT의 타입 구성 · 공통 약점 · 보완 후보">🛡 타입 일관성</button><span class="sp"></span>${(()=>{const L=abilLimits(t.ranks['능력'],t.solo);const n=t.pokemon.reduce((a,p)=>a+exclAll(p).length,0);const per=strip(t.ranks['능력'])==='AAA'?2:1;const over=t.pokemon.filter(p=>exclAll(p).length>per).map(p=>p.name||'(이름 없음)');return `<span class="small" style="font-weight:500">전용 포텐셜 <b class="num ${n>L.x?'warn':''}">${n}</b> / ${esc(L.xs)}${over.length?` <span class="warn">· 1체에 ${per}개 초과: ${esc(over.join(', '))}</span>`:''} <span class="faint">· 능력 ${esc(t.ranks['능력'])}</span></span>`})()}<span class="small muted">· 할인 ${discUsed(t)} / ${esc(t.base['「기술 할인점」']??'-')}</span><button class="btn sm ghost" type="button" data-tip="PT 기술점은 각 포켓몬의 기술 소켓 합계이며, 『올드 타입』 계열은 기술 4개에 ${oldSock()}점으로 고정됩니다(테이블·계산식 탭에서 변경). 최대치를 비워 두면 육성 랭크의 「최대치」를 씁니다. 기술 옆 「할인」을 체크하면 「기술 할인점」이 1점씩 소모됩니다. 각 포켓몬의 역할·특성·소지품·종족치·프라이드·기술 소켓·전용 포텐셜은 아래 포켓몬 줄에 있습니다." title="설명">?</button></h3>
  <div class="meter ${pu>pm?'over':''}"><i style="width:${pm?Math.min(100,pu/pm*100):0}%"></i></div>${leadBar(t)}
  ${ptChecks(t).map(x=>`<p class="small warn" style="margin:6px 0 0">⚠ ${esc(x)}</p>`).join('')}</div>
 <div class="plist" data-sort="poke" data-i="${ti}">${t.pokemon.map((p,pi)=>pokeHTML(t,ti,p,pi)).join('')}</div>
 <div class="row"><button class="btn pri" data-act="addP" data-i="${ti}">+ 포켓몬 시트</button><button class="btn" data-act="addOld" data-i="${ti}">+ 올드 타입 일람에서 추가</button><button class="btn" data-act="impP" data-i="${ti}">복사용 텍스트로 불러오기</button></div>
 </div>`:''}</section>`}
const tyCol=n=>{const ti=typeInfo((tyParts(n)[0])||'');return ti&&safeCss(ti[1])||''};
const pkVars=p=>{const a=tyCol(p.t1),b=tyCol(p.t2)||a;return `--c1:${a||'var(--sunk2)'};--c2:${b||'var(--sunk2)'}`};
/* 능력치 육각형: 위부터 시계 방향 HP·공격·방어·스피드·특방·특공 (원작 순서) */
const RADAR_ORD=[0,1,2,5,4,3];
function radarBig(p){const R=62,cx=90,cy=82;const pt=(i,r)=>{const a=-Math.PI/2+i*Math.PI/3;return [cx+r*Math.cos(a),cy+r*Math.sin(a)]};const P2=a=>a.map(v=>v.toFixed(1)).join(',');
 const ring=f=>[0,1,2,3,4,5].map(i=>P2(pt(i,R*f))).join(' ');const vals=RADAR_ORD.map(i=>Math.min(1,(+p.base[i]||0)/180));const any=vals.some(v=>v>0);
 const lab=RADAR_ORD.map((si,i)=>{const [x,y]=pt(i,R+13);return `<text x="${x.toFixed(1)}" y="${(y+4).toFixed(1)}" text-anchor="middle" class="rl">${STATS[si]}</text><text x="${x.toFixed(1)}" y="${(y+15).toFixed(1)}" text-anchor="middle" class="rn">${esc(p.base[si]||'-')}</text>`}).join('');
 return `<svg class="radar big" viewBox="0 0 180 172" role="img" aria-label="종족치 육각형"><polygon points="${ring(1)}" class="rg"/><polygon points="${ring(2/3)}" class="rg"/><polygon points="${ring(1/3)}" class="rg"/>${[0,1,2,3,4,5].map(i=>{const [x,y]=pt(i,R);return `<line x1="${cx}" y1="${cy}" x2="${x.toFixed(1)}" y2="${y.toFixed(1)}" class="rg"/>`}).join('')}${any?`<polygon points="${vals.map((v,i)=>P2(pt(i,Math.max(2,v*R)))).join(' ')}" class="rv"/>`:''}${lab}</svg>`}
function radar(p){const R=25,cx=28,cy=28;const pt=(i,r)=>{const a=-Math.PI/2+i*Math.PI/3;return (cx+r*Math.cos(a)).toFixed(1)+','+(cy+r*Math.sin(a)).toFixed(1)};
 const ring=f=>[0,1,2,3,4,5].map(i=>pt(i,R*f)).join(' ');const vals=RADAR_ORD.map(i=>Math.min(1,(+p.base[i]||0)/180));const any=vals.some(v=>v>0);
 const poly=vals.map((v,i)=>pt(i,Math.max(1.5,v*R))).join(' ');
 return `<svg class="radar" viewBox="0 0 56 56" aria-hidden="true"><polygon points="${ring(1)}" class="rg"/><polygon points="${ring(.5)}" class="rg"/>${[0,1,2,3,4,5].map(i=>`<line x1="${cx}" y1="${cy}" x2="${pt(i,R).replace(',',' ').split(' ')[0]}" y2="${pt(i,R).split(',')[1]}" class="rg"/>`).join('')}${any?`<polygon points="${poly}" class="rv"/>`:''}</svg>`}
const genderGlyph=g=>g==='♂'?'<span class="gen m" title="수컷">♂</span>':g==='♀'?'<span class="gen f" title="암컷">♀</span>':g==='무성'?'<span class="gen n" title="무성">⚲</span>':'';
function ptStripHTML(t){return `<span class="ptstrip">${t.pokemon.map(p=>{const a=tyCol(p.t1),b=tyCol(p.t2)||a;return `<i style="background:linear-gradient(135deg,${a||'var(--sunk2)'} 50%,${b||'var(--sunk2)'} 50%)" title="${esc(p.name||'')} · ${esc([p.t1,p.t2].filter(x=>x&&x!=='-').join('/')||'타입 없음')}"></i>`}).join('')}</span>`}
function miniGrades(p,t){const eb=t?effB(t,p):p.base;return `<div class="minig">${STATS.map((s,i)=>{const g=grade(eb[i]);const tip=t?buTip(t,p,i):'';return `<span class="mg" title="${s} ${esc(p.base[i]||'-')}${tip?' — '+esc(tip):''}"><small>${s}</small><b style="background:${gcol(g)}">${esc(g)}</b></span>`}).join('')}</div>`}
function miniBars(p){return `<div class="mini">${STATS.map((s,i)=>{const v=+p.base[i]||0;const g=grade(p.base[i]);return `<div><span>${s.slice(0,2)}</span><i><b style="width:${Math.min(100,v/200*100)}%;background:${gcol(g)}"></b></i></div>`}).join('')}</div>`}
/* 목록 카드의 폼 보기: 폼 이름 버튼을 누르면 카드 요약(이름·타입·특성·종족치·그림)이 그 폼으로 보인다. 저장은 안 하고 한 번 더 누르거나 「원래」로 돌아온다 */
const FV={};
function formView(p){const k=FV[p.id];const f=k!=null&&(p.forms||[])[k];if(!f)return p;const has=v=>v&&v!=='-';
 return Object.assign({},p,{name:f.name||p.name,t1:has(f.t1)?f.t1:p.t1,t2:has(f.t1)?(f.t2||'-'):p.t2,t3:has(f.t1)?'-':p.t3,ability:f.ability||p.ability,base:(f.base||[]).some(x=>String(x)!=='')?f.base:p.base,image:f.image||p.image,_form:f})}
function formBtns(p,ti,pi){const fs=(p.forms||[]).filter(f=>f);if(!fs.length)return '';const k=FV[p.id];
 return `<div class="fmbs">${(p.forms||[]).map((f,i)=>f?`<button type="button" class="fmb ${k===i?'on':''}" data-act="fview" data-i="${ti}" data-j="${pi}" data-k="${i}" title="${esc((f.kind||'폼체인지')+(k===i?' — 눌러서 원래 모습으로':' — 눌러서 이 폼으로 보기'))}">${esc(f.name||'폼 '+(i+1))}</button>`:'').join('')}${k!=null&&(p.forms||[])[k]?`<button type="button" class="fmb back" data-act="fview" data-i="${ti}" data-j="${pi}" data-k="-1" title="원래 모습으로">↩ 원래</button>`:''}</div>`}
function pokeHTML(t,ti,p,pi){const v=formView(p);const P=`T.${ti}.pokemon.${pi}`;const c=moveCap(t,p);const filled=p.moves.filter(m=>m.name).length;const npot=p.pots.filter(x=>x).length+exclAll(p).length;
 const tot=v.base.reduce((a,b)=>a+(+b||0),0);
 const XL=exclAll(p);const abr=v.ability&&idx.abil?idx.abil.get(v.ability):null;const abE=abr?oneLn(abr[2]):'';
 return `<article class="pk ${p.open?'open':''} ${p.partner?'ptnr':''}" id="pk-${p.id}" data-si="${pi}" style="${pkVars(v)}">
 <div class="ph" data-tog="${P}" data-grab tabindex="0" role="button" data-kbd aria-expanded="${!!p.open}"><span class="pno"><small>No.</small>${String(pi+1).padStart(3,'0')}</span>
  <div class="row pmain" style="min-width:0;gap:9px;flex-wrap:nowrap"><button type="button" class="pavb" data-act="pimgPick" data-i="${ti}" data-j="${pi}" title="포켓몬 이미지 넣기 (클릭 · 끌어다 놓기 · 붙여넣기)">${safeImg(v.image)?`<img class="pav" src="${safeImg(v.image)}" alt="">`:'<span class="pav ph0" aria-hidden="true"></span>'}${v.partner?'<i class="pstb" aria-hidden="true">★</i>':''}</button><div style="min-width:0"><div class="pname">${v.partner?'<span class="pstar" title="파트너">★</span>':''}<span class="pnm">${esc(v.name||'(이름 없음)')}</span>${genderGlyph(v.gender)}${formBtns(p,ti,pi)}</div><div class="pnrow"><span class="chips pntypes">${tchip(v.t1)}${tchip(v.t2)}${tchip(v.t3)}</span><span class="lvb">Lv.${lv(t,v)}</span></div><div class="psub pscs"><span class="psc psr">${esc(roleOf(v)||'역할 없음')}</span>${classOf(v)?`<span class="psc psk">${esc(classOf(v))}</span>`:''}${prideOf(p)?`<span class="psc psp" title="프라이드 ${esc(prideOf(p))}${prideIsAuto(p)?' (자동)':''} · 통솔점 ${prideCost(t,p)}점"><i>프라이드</i><b>${esc(prideOf(p))}</b></span>`:''}${pokeChecks(t,p).some(c=>c.w)?' <span class="warn" title="기본·능력치 탭의 경고를 확인하세요">⚠</span>':''}</div></div></div>
  <div class="hide-s ptyab"><div class="pab"><span class="pabk">특성</span><b>${esc(v.ability||'특성 없음')}</b>${v.item?`<span class="faint"> · ${esc(v.item)}</span>`:''}</div>${abE?`<div class="pabe" title="${esc(abE)}">${esc(abE)}</div>`:''}</div>
  <div class="pexcl ${XL.length?'':'none'} ${XL.length>1?'multi':''}">${XL.map(x=>{const e=oneLn(x.eff);return `<div class="pxi"><div class="pxn"><span class="pxk">전용</span><b>${esc(x.name)}</b></div>${e?`<div class="pxe" title="${esc(e)}">${esc(e)}</div>`:''}</div>`}).join('')}</div>
  <div class="hide-s pkstat">${radar(v)}<div style="min-width:0">${miniGrades(v,t)}<div class="psub" style="margin-top:3px">종족치 합 <b class="num">${tot||'-'}</b>${(()=>{const pl=v._form?null:planRange(v);if(!pl||!tot)return '';return `<span class="${pl.ok?'faint':'warn'}" title="계산 종족치 / 계단 기준"> · 계산 ${fmtN(pl.ct)}/${pl.v}</span>`})()} · 기술 <span class="${c.cap!=null&&c.used>c.cap?'warn':''}">${capTxt(c,'-','/')}</span> · 포텐셜 ${npot}</div></div></div>
  <div class="pact"><button class="btn sm ghost" data-act="pcard" data-i="${ti}" data-j="${pi}" title="이 포켓몬을 한 장으로 요약해서 본다 (PNG 저장)">한 장</button><button class="btn sm ghost" data-act="copy" data-i="${ti}" data-j="${pi}" title="복사용 텍스트 복사">복사</button><button class="btn sm ghost" data-act="dupP" data-i="${ti}" data-j="${pi}">복제</button><button class="btn sm danger pdel" data-act="delP" data-i="${ti}" data-j="${pi}" title="이 포켓몬 시트 삭제">🗑 삭제</button></div></div>
 ${p.open?`<div class="pbody"><nav class="ptabs">${[['base','기본<span class="wide-only">·능력치</span>',''],['moves','기술',filled],['pots','포텐셜',npot],['tune','상세<span class="wide-only"> 조정</span>',tuneCount(p)||''],['text','<span class="wide-only">복사용 </span>텍스트','']].map(([k,n,cn])=>`<button data-ptab="${k}" data-i="${ti}" data-j="${pi}" class="${p.tab===k?'on':''}">${n}${cn!==''?`<span class="cnt">${cn}</span>`:''}</button>`).join('')}</nav>
 ${p.tab==='moves'?movesTab(t,ti,p,pi,P,c):p.tab==='pots'?potsTab(t,ti,p,pi):p.tab==='tune'?tuneTab(t,ti,p,pi):p.tab==='text'?textTab(t,ti,p,pi,P):baseTab(t,ti,p,pi,P)}</div>`:''}</article>`}
function baseTab(t,ti,p,pi,P){const ab=idx.abil.get(p.ability),it=itemRow(p),own=ownItem(p)&&!idx.items.get(p.item);const types=S.db.types.map(x=>x[0]);const tot=p.base.reduce((a,b)=>a+(+b||0),0);const id=p.id;
 return `<div class="bgrid"><div style="display:flex;flex-direction:column;gap:10px;min-width:0">
  <div class="row" style="gap:12px;align-items:center;flex-wrap:nowrap"><div class="pimg" data-act="pimgPick" data-i="${ti}" data-j="${pi}" data-pdrop="${ti}.${pi}" role="button" tabindex="0" data-kbd title="클릭하거나 그림을 끌어다 놓거나 Ctrl+V로 붙여넣기">${safeImg(p.image)?`<img src="${safeImg(p.image)}" alt="포켓몬 이미지">`:'<span class="small">이미지<br>클릭 · 끌어다 놓기 · 붙여넣기</span>'}</div>
   <div style="display:flex;flex-direction:column;gap:6px;min-width:0"><div class="row"><label class="btn sm" for="pimg-${id}" tabindex="0" role="button" data-kbd>이미지 삽입</label><input type="file" id="pimg-${id}" accept="image/*" data-pimg="${ti}.${pi}" hidden>${p.image?`<button class="btn sm ghost" data-act="noPimg" data-i="${ti}" data-j="${pi}">제거</button>`:''}</div>
   <button class="btn sm" data-act="pickOld" data-i="${ti}" data-j="${pi}" title="시트 「올드 타입 일람」의 타입·특성·알그룹·종족치를 채웁니다">올드 타입 일람에서 자동 입력</button></div></div>
  ${pStandsHtml(p,ti,pi)}
  <div class="fgrid">
   <label class="lbl" for="nm-${id}" style="grid-column:span 2">이름${inp(P+'.name',p.name,{id:'nm-'+id})}</label>
   <label class="lbl" for="dist-${id}">레벨 <span class="faint">기본 ${baseLevel(t.ranks['육성'])} + 분배</span><span class="row"><b class="num" style="font-size:15px">${lv(t,p)}</b>${inp(P+'.dist',p.dist,{id:'dist-'+id,w:'56px',num:1})}</span></label>
   <label class="lbl" for="pr-${id}">프라이드 <span class="faint">통솔점 ${prideCost(t,p)}</span><select data-p="${P}.pride" id="pr-${id}"><option value="" ${prideIsAuto(p)?'selected':''}>자동 (${esc(prideAuto(p))})</option>${[...(isOld(p)?[[PR().oldLow.lab]]:[]),...PR().rows].filter(r=>r&&r[0]).map(r=>`<option ${!prideIsAuto(p)&&prKey(p.pride)===r[0]?'selected':''}>${esc(r[0])}</option>`).join('')}</select></label>
   <label class="lbl" for="pt-${id}">파트너<span class="row small" style="min-height:30px"><input type="checkbox" id="pt-${id}" data-p="${P}.partner" ${p.partner?'checked':''}>통솔점 1 할인</span></label>
   <label class="lbl" for="ge-${id}">성별${sel(P+'.gender',p.gender,['-','♂','♀','무성'],{id:'ge-'+id})}</label>
   ${['t1','t2','t3','tera'].map((k,n)=>`<label class="lbl" for="${k}-${id}">${['타입1','타입2','타입3','테라스탈'][n]}${sel(`${P}.${k}`,p[k],types,{id:k+'-'+id})}</label>`).join('')}
   <label class="lbl" for="e1-${id}">알그룹1${sel(P+'.egg1',p.egg1||'-',eggOpts(),{id:'e1-'+id})}</label><label class="lbl" for="e2-${id}">알그룹2${sel(P+'.egg2',p.egg2||'-',eggOpts(),{id:'e2-'+id})}</label>
  </div>
  <div class="fgrid" style="grid-template-columns:minmax(0,1fr) minmax(0,1fr)">
   <div class="lbl">특성<button class="pickbtn" data-act="pickAbil" data-i="${ti}" data-j="${pi}">${p.ability?`<b>${esc(p.ability)}</b><span class="sp"></span><span class="faint small">${ab?'소켓 '+esc(ab[0]):'DB에 없음'}</span>`:'<span class="ph0">특성 검색…</span>'}</button></div>
   <div class="lbl">소지품<button class="pickbtn" data-act="pickItem" data-i="${ti}" data-j="${pi}">${p.item?`<b>${esc(p.item)}</b>${ilockChip(p.item)}<span class="sp"></span><span class="faint small">${own?'오리지널 · 시트에만':it?'소켓 '+esc(it[5]):'DB에 없음'}</span>`:'<span class="ph0">소지품 검색…</span>'}</button></div>
  </div>
  ${ab?`<div class="effbox"><b>${esc(p.ability)}</b> ${rich(ab[2])}<span class="fxrow">${fxAutoBtn(p,'trait',p.ability,ti,pi)}</span></div>`:p.ability?`<div class="effbox">DB에 없는 특성입니다. <button class="btn sm" data-act="newAbil" data-i="${ti}" data-j="${pi}">이 이름으로 오리지널 특성 만들기</button><span class="fxrow">${fxAutoBtn(p,'trait',p.ability,ti,pi)}</span></div>`:''}
  ${it?`<div class="effbox"><b>${esc(p.item)}</b> ${rich(it[4])} ${own?`<span class="faint">· 오리지널 (이 포켓몬만 · DB 에 없음)${it[3]==='O'?' · 소모품':''}</span> <button class="btn sm" data-act="ownItem" data-i="${ti}" data-j="${pi}">수정</button>`:it[6]&&it[6]!=='-'?`<span class="faint">· ${esc(it[6])}</span>`:''}<span class="fxrow">${fxAutoBtn(p,'item',p.item,ti,pi)}</span></div>`:p.item?`<div class="effbox"><b>${esc(p.item)}</b> DB에 없는 소지품입니다. <button class="btn sm" data-act="ownItem" data-i="${ti}" data-j="${pi}">이 포켓몬만 쓰는 오리지널로 효과 적기</button><span class="fxrow">${fxAutoBtn(p,'item',p.item,ti,pi)}</span></div>`:''}
  ${itemSlotsHtml(p,ti,pi)}
  ${formsHtml(t,ti,p,pi,P)}
 </div>
 <div class="panel" style="min-width:0"><h3>능력치<span class="sp"></span><span class="small muted">종족치 합 <b class="num">${tot}</b>${(()=>{const et=effB(t,p).reduce((a,b)=>a+(+b||0),0);return et!==tot?` → 특성 · 포텐셜 반영 <b class="num">${et}</b>`:''})()}${(()=>{const pl=planRange(p);if(!pl)return '';return ` · 계산 <b class="num${pl.ok?'':' warn'}">${fmtN(pl.ct)}</b> / ${esc(pl.lab)} ${pl.v}`})()}</span></h3>
  <div class="stwrap"><div class="bigr">${radarBig(p)}</div><div class="stats">${STATS.map((s,i)=>{const eb=effB(t,p)[i];const tip=buTip(t,p,i);const g=grade(eb);const v=+eb||0;return `<div class="st s${i}${tip?' bup':''}"><span class="k">${s}</span>${inp(`${P}.base.${i}`,p.base[i],{num:1,ph:'종족치'})}<div class="bar" data-drag="${P}.base.${i}" title="${esc(statTip(t,p,i))}"><i style="width:${Math.min(100,v/200*100)}%"></i>${statMarks(p,i)}<b class="knob" style="left:${Math.min(100,v/200*100)}%" aria-hidden="true"></b></div><span class="v">${stat(t,p,i)}</span><span class="gb" style="background:${gcol(g)}" ${tip?`title="${esc(tip)}"`:''}>${tip?'▲':''}${esc(g)}</span></div>`}).join('')}</div>${(()=>{const U=baseUp(t,p).up;return U.length?`<div class="bupnote small">${U.map(u=>`<span><b>${STATS[u.i]}</b> ${u.from} ${esc(grade(u.from))} → <b class="num">${u.to}</b> ${esc(grade(u.to))} <span class="faint">${esc(u.by.join(' · '))}</span></span>`).join('')}</div>`:''})()}</div>
  <div class="stfoot"><span>물리 내구 <b class="num">${(stat(t,p,0)*stat(t,p,2)).toLocaleString()}</b></span><span>특수 내구 <b class="num">${(stat(t,p,0)*stat(t,p,4)).toLocaleString()}</b></span><span class="faint">실수치 = 테이블(더블) 식 · Lv.${lv(t,p)}${p.ivs?' · 개체값 포함':''}</span>${isOld(p)?'':'<span class="stlg faint"><span><i class="lg-on"></i>줄무늬 = 계산에 더해지는 부분</span><span><i class="lg-dl"></i>쌍두 할인 (빼 줌)</span><span><i class="lg-off"></i>옅은 칸 = 그 구간이지만 지금은 0</span><span><i class="lg-fl"></i>하한</span><span>막대 위 숫자 = 그 칸 때문에 붙는 값</span><span>○ 손잡이를 끌어서 조절</span></span>'}</div>
  ${ivHtml(t,ti,p,pi)}
  ${calcPanel(t,p,P)}${(()=>{const ck=pokeChecks(t,p).filter(c=>c.w||c.k!=='calc');return ck.length?`<div class="checks">${ck.map(c=>`<div class="${c.w?'warn':'muted'}">${c.w?'⚠ ':'· '}${esc(c.t)}</div>`).join('')}</div>`:''})()}</div></div>`}
function movesTab(t,ti,p,pi,P,c){const ms=p.moves;const over=c.cap!=null&&c.used>c.cap;
 return `<div class="capline"><b>${c.mode==='count'?'기술 개수':'기술 소켓'}</b><span class="num ${over?'warn':''}">${capTxt(c,'종족치 입력 필요')}</span>${c.mode==='count'?`<span class="small muted">『${esc(classOf(p))}』 · PT 기술점 ${c.pt} 고정</span>`:''}${c.cap?`<div class="meter ${over?'over':''}"><i style="width:${Math.min(100,c.used/c.cap*100)}%"></i></div>`:''}
  <span class="small muted">상한 직접 지정</span>${inp(P+'.sockMax',p.sockMax,{w:'56px',num:1,ph:String(c.auto??'')})}${(()=>{const b=sockBonus(p);return `<span class="small muted" title="전용 · 포텐셜 · 특성 글의 「특성/기술 소켓 +0.5」를 자동으로 읽어요. 직접 적으면 그 값이 우선이에요${b.src.length?'\n'+b.src.join('\n'):''}">보너스 특성${inp(P+'.sockBonAb',p.sockBonAb,{w:'44px',num:1,ph:String(b.manual?'':b.ab||0)})} 기술${inp(P+'.sockBonMv',p.sockBonMv,{w:'44px',num:1,ph:String(b.manual?'':b.mv||0)})}${b.src.length?` <span class="faint">${esc(b.src.join(' · '))}</span>`:''}</span>`})()}<span class="sp"></span><button class="btn pri sm" data-act="pickMove" data-i="${ti}" data-j="${pi}">+ 기술 검색·추가</button></div>
 ${(()=>{const W=pokeChecks(t,p).filter(c=>c.k==='mv');return W.length?`<div class="checks">${W.map(c=>`<div class="warn">⚠ ${esc(c.t)}</div>`).join('')}</div>`:''})()}
 <div class="mlist" data-sort="moves" data-i="${ti}" data-j="${pi}">${ms.map((m,i)=>{const r=idx.moves.get(m.name);return `<div class="mv" data-si="${i}" data-grab style="border-left-color:${r&&tyCol(r[5])||'var(--line)'}"><div class="row mvt" style="gap:3px;flex-wrap:nowrap">${r?tchip(r[5])+`<span class="mcat ${r[6]==='물리'?'phy':r[6]==='특수'?'spe':'sta'}">${esc(r[6]||'')}</span>`:'<span class="kindb">DB 없음</span>'}</div><div class="mvn"><div class="nm"><span class="mvchip">${r?tchip(r[5]):'<span class="kindb">DB 없음</span>'}</span>${esc(m.name)}</div><div class="small muted rgwrap">${r?rangeGrid(r[9])+esc(r[6]+' · '+r[9]+(r[10]&&r[10]!=='-'?' · 접촉 '+r[10]:'')):''}</div></div>
  <div class="st2">${r?esc(r[7]):'-'}<small>위력</small></div><div class="st2">${r?esc(r[8]):'-'}<small>명중</small></div><div class="st2">${r?esc(r[11]):'-'}<small>우선도</small></div><div class="st2${isBigMv(t,p,m)?' warn':''}"${isBigMv(t,p,m)?` title="${esc(bigMvRule(t))}"`:''}>${isBigMv(t,p,m)?'⚠ ':''}${moveSock(p,m)}<small>소켓</small></div>
  <div class="ef">${r?rich(r[13]):''}</div><div class="row mva" style="gap:2px;flex-wrap:nowrap"><label class="small row" title="「기술 할인점」 1점을 써서 이 기술의 소켓을 0.5 할인합니다 (올드 타입 계열은 교배기·유전기 습득용)" style="gap:2px"><input type="checkbox" data-p="${P}.moves.${i}.half" ${m.half?'checked':''}>할인</label><label class="small row" title="켜면 이 기술은 한 장 요약 · 오레마스 한 장 요약 · 남의 도감에 안 나온다 (시트 · 배틀에는 그대로)" style="gap:2px"><input type="checkbox" data-p="${P}.moves.${i}.hide" ${m.hide?'checked':''}>숨김</label>
  ${r?`<button class="btn sm ghost" data-act="mvEdit" data-name="${esc(m.name)}">수정</button>`:''}<button class="btn sm ghost danger" data-act="mvDel" data-i="${ti}" data-j="${pi}" data-k="${i}" aria-label="삭제">✕</button></div></div>`}).join('')||'<div class="empty">기술이 없습니다. 「기술 검색·추가」로 DB에서 찾거나 오리지널 기술을 만드세요.</div>'}</div>`}
/* ---------- 상세 조정 탭 (10-22 망령): 이 포켓몬만의 상태 변화 사양 · 소지품 사양을 한곳에서 보고 고친다 ----------
   p.tune = {st:[{st:'아쿠아링',v:'1/6'}], item:'소지품 구문(js/fx/itemrule.js 꼴)', itemName:'그 구문을 쓴 소지품'}
   오레마스 import.js 가 st → 자동화 「상세 조정」의 「상태수정」 줄로, item → itemTune 으로 가져간다. 효과 글 · 「구문」 버튼으로 걸어 둔 것도 같이 보여 준다 */
const TUNE_ST=[['아쿠아링','AquaRing',1,8,'회복'],['뿌리박기','Ingrain',1,16,'회복'],['환희의노래','Chant',1,16,'회복'],['희망사항','Wish',1,2,'회복'],['씨뿌리기','LeechSeed',1,8,'흡수'],['독','Poison',1,8,'대미지'],['화상','Burn',1,16,'대미지'],['악몽','Nightmare',1,4,'대미지'],['저주','Curse',1,4,'대미지'],['조이기','Bind',1,8,'대미지']];
const FRAC_RE=/^\s*(\d+)\s*\/\s*(\d+)\s*$/;
function tuneOf(p){let t=p.tune;if(!t||typeof t!=='object')t=p.tune={};if(!Array.isArray(t.st))t.st=[];t.st=t.st.filter(x=>x&&TUNE_ST.some(r=>r[0]===x.st));t.item=String(t.item||'');t.itemName=String(t.itemName||'');if(!t.crit||typeof t.crit!=='object'||Array.isArray(t.crit))t.crit={};return t}
function tuneDsl(p){return tuneOf(p).st.filter(x=>FRAC_RE.test(x.v||'')&&+String(x.v).split('/')[1]>0).map(x=>`상태수정 ${x.st} ${String(x.v).replace(/\s+/g,'')}`).join('\n')}
function tuneCount(p){const t=tuneOf(p);return t.st.length+(t.item.trim()?1:0)+(Object.keys(t.crit).length?1:0)+(p.dexFw!=null&&p.dexFw!==''?1:0)}
/* 10-23 망령: 포켓몬마다 급소 규칙 — 오레마스가 불러오면 공격 창이 자동으로 쓴다 (critRule) */
const CRIT_TBL=[['','기본 표 (6.25 → 12.5 → 25 → 50 → 100%)'],['2','5세대 (6.25 → 12.5 → 25 → 33.3 → 50%)'],['1','6세대 (6.25 → 12.5 → 50 → 100%)'],['3','7세대 이후 (4.17 → 12.5 → 50 → 100%)']];
function tuneCritBox(T,D){const c=T.crit;return `<section class="tbox"><div class="row"><b>급소 규칙</b><span class="small muted">이 포켓몬만 · 오레마스 공격 창이 자동으로 쓴다</span></div>
  <div class="tcrit"><label>급소 표 <select data-tunecr="tbl" ${D}>${CRIT_TBL.map(([v,l])=>`<option value="${v}" ${String(c.tbl||'')===v?'selected':''}>${l}</option>`).join('')}</select></label>
   <label>급소 랭크 + <input type="number" class="mono" data-tunecr="add" ${D} value="${esc(c.add||'')}" placeholder="0" style="width:56px"></label>
   <label>받을 때 급소 방호 <input type="number" class="mono" data-tunecr="guard" ${D} value="${esc(c.guard||'')}" placeholder="0" style="width:56px"></label>
   <label>급소 대미지 <select data-tunecr="dmg" ${D}>${[['','기본 ×1.5 (6세대 이후)'],['2','×2 (5세대까지)'],['2.25','×2.25'],['2.5','×2.5'],['3','×3']].map(([v,l])=>`<option value="${v}" ${String(c.dmg||'')===v?'selected':''}>${l}</option>`).join('')}</select></label>
   <label class="row small"><input type="checkbox" data-tunecr="sure" ${D} ${c.sure?'checked':''}> 공격이 언제나 급소</label>
   <label class="row small"><input type="checkbox" data-tunecr="never" ${D} ${c.never?'checked':''}> 급소에 맞지 않는다</label></div>
  <p class="small faint" style="margin:6px 0 0">급소 랭크는 공격 창의 급소 단계에 더해지고, 방호는 이 포켓몬이 맞을 때 상대 급소 단계에서 빠진다. 비워 두면 룰 기본.</p></section>`}
/* 배틀 쪽 OM_FX.stMod 가 읽는 꼴로 시트를 옮겨 그대로 물어본다 (상세 조정 칸은 빼고: 글 · 구문에서 온 것만) */
function tuneMon(p){const K=OM_FX;const auto={};for(const k in (p.auto||{})){const v=String(p.auto[k]||'').trim();if(v)auto[FXK(k)]={dsl:v,ops:K.parse(v).ops}}
 const ab=idx.abil.get(p.ability),it=itemRow(p);
 return {auto,pots:p.pots.map((n,i)=>n&&n!=='-'?{name:String(n).replace(/『|』/g,''),eff:potEffOf(p,i)}:null).filter(Boolean),excl:p.excl&&p.excl.name?{name:p.excl.name,eff:p.excl.eff||''}:null,exclX:(p.exclX||[]).filter(x=>x&&x.name),ability:p.ability||'',abilityEff:ab?ab[2]:'',item:p.item||'',itemEff:it?it[4]:''}}
function tuneItemBase(p){const it=itemRow(p);const IR=window.OM_ITEMRULE;if(!it||!IR)return '';try{return IR.toText(IR.ruleOf(p.item,{eff:it[4],auto:it[7]||''}))}catch(e){return ''}}
function tuneItemPrev(dsl){const IR=window.OM_ITEMRULE;if(!IR||!dsl.trim())return '<span class="faint">비어 있음 — 소지품 DB 의 구문(없으면 효과 글)을 그대로 쓴다</span>';const r=IR.parse(dsl);const tx=IR.toText(r.rule);return (tx?`<b>읽은 결과</b><pre class="tpre">${esc(tx)}</pre>`:'<span class="warn">읽은 규칙이 없다</span>')+(r.errs.length?`<div class="warn">모르는 줄: ${esc(r.errs.join(' / '))}</div>`:'')}
/* 10-22 망령: 상세 조정에서 바로 구문을 걸 수 있게 — 이 포켓몬의 포텐셜 · 특성 · 소지품 목록 */
function tuneCands(p){const C=[];const add=(kind,name,slot,lab)=>{if(name&&name!=='-'&&!C.some(c=>FXK(c.name)===FXK(name)))C.push({kind,name,slot,lab})};
 add('pot',p.excl&&p.excl.name,'excl','전용');(p.exclX||[]).forEach((x,xi)=>add('pot',x&&x.name,'x'+xi,'전용 '+(xi+2)));(p.pots||[]).forEach((n,i)=>add('pot',n,i,'#'+(i+1)));
 add('trait',p.ability,null,'특성');add('item',p.item,null,'소지품');(p.items2||[]).forEach((x,xi)=>add('item',x&&x.item,null,'소지품 '+(xi+2)));return C}
function tuneTab(t,ti,p,pi){const T=tuneOf(p);const ok=fxReady();const D=`data-i="${ti}" data-j="${pi}"`;
 const mon=ok?tuneMon(p):null;
 const rows=TUNE_ST.map(([ko,en,n,d,kind])=>{const tu=T.st.find(x=>x.st===ko);let src=null;try{src=mon?OM_FX.stMod(mon,en):null}catch(e){}
  if(!tu&&!src)return '';const fin=tu&&FRAC_RE.test(tu.v)?String(tu.v).replace(/\s+/g,''):src?`${src.n}/${src.d}`:`${n}/${d}`;
  return `<tr><td><b>${esc(ko)}</b> <span class="small muted">${kind}</span></td><td class="mono">${n}/${d}</td><td>${src?`<span class="mono">${src.n}/${src.d}</span> <span class="small muted">『${esc(src.name)}』</span>`:'<span class="faint">—</span>'}</td>
   <td>${tu?`<span class="row" style="gap:4px;flex-wrap:nowrap"><input class="mono" data-tunest="${esc(ko)}" ${D} value="${esc(tu.v)}" style="width:64px" inputmode="numeric"><button class="btn sm ghost danger" data-act="tuneDel" ${D} data-k="${esc(ko)}" aria-label="지우기">✕</button></span>`:'<span class="faint">—</span>'}</td><td class="mono"><b>${esc(fin)}</b></td></tr>`}).join('');
 const left=TUNE_ST.filter(r=>!T.st.some(x=>x.st===r[0]));
 const it=itemRow(p);const base=ok?tuneItemBase(p):'';const stale=T.item.trim()&&T.itemName&&T.itemName!==p.item;
 const autos=Object.entries(p.auto||{}).filter(([k,v])=>String(v||'').trim());const td=tuneDsl(p);
 return `<div class="tune">
 <section class="tbox"><div class="row"><b>상태 변화 사양</b><span class="small muted">이 포켓몬만 · 배틀의 턴 종료 회복 · 대미지 계산에 쓰인다</span></div>
  ${ok?'':'<p class="small warn">자동화 구문 스크립트를 불러오는 중이라 효과 글에서 읽은 것은 아직 못 보여 준다</p>'}
  ${rows?`<div class="tscroll"><table class="ttbl"><thead><tr><th>상태</th><th>기본</th><th>효과 글 · 구문</th><th>상세 조정</th><th>배틀</th></tr></thead><tbody>${rows}</tbody></table></div>`:'<p class="small faint" style="margin:6px 0">바뀐 상태 변화가 없다 — 모두 기본값</p>'}
  ${left.length?`<div class="row" style="margin-top:6px;gap:6px"><select data-tuneadd="${p.id}">${left.map(([ko,en,n,d])=>`<option value="${esc(ko)}">${esc(ko)} (기본 ${n}/${d})</option>`).join('')}</select><input class="mono" data-tuneaddv="${p.id}" placeholder="1/6" style="width:64px" inputmode="numeric"><button class="btn pri sm" data-act="tuneAdd" ${D}>+ 추가</button></div>`:''}
  <p class="small faint" style="margin:6px 0 0">효과 글에 「아쿠아링」에 의한 회복량을 강화(1/8 → 1/6) 처럼 적어 두거나 「구문」에 상태수정 아쿠아링 1/6 을 써도 여기 잡힌다. 상세 조정 칸이 있으면 그것을 먼저 쓴다.</p></section>
 <section class="tbox"><div class="row"><b>소지품 사양</b>${p.item?`<span class="kindb">${esc(p.item)}</span>`:''}<span class="small muted">이 포켓몬이 들었을 때만</span></div>
  ${!p.item?`<div class="row" style="margin:6px 0;gap:6px"><span class="small faint">소지품이 없다</span><button class="btn pri sm" data-act="pickItem" ${D}>+ 소지품 고르기</button></div>`:`
  ${it?`<div class="small" style="margin:6px 0">${rich(it[4])}</div>`:''}
  ${base?`<details class="small"><summary>소지품 DB 구문 ${it&&String(it[7]||'').trim()?'':'(효과 글에서 읽은 것)'}</summary><pre class="tpre">${esc(base)}</pre></details>`:''}
  ${stale?`<p class="small warn">『${esc(T.itemName)}』용으로 적은 구문이다 — 지금 소지품과 달라 배틀에서 쓰이지 않는다</p>`:''}
  <textarea data-tuneitem="${p.id}" ${D} rows="3" placeholder="비우면 소지품 DB 구문 그대로 · 예) 턴 종료: 회복 1/8" style="width:100%;font-family:var(--mono,monospace);font-size:12.5px;margin-top:6px">${esc(T.item)}</textarea>
  <div class="small" id="tunePrev-${p.id}" style="margin-top:4px">${ok?tuneItemPrev(T.item):''}</div>
  <div class="row" style="margin-top:6px;gap:6px">${base?`<button class="btn sm" data-act="tuneItemCopy" ${D}>DB 구문 가져와 고치기</button>`:''}${T.item.trim()?`<button class="btn sm ghost" data-act="tuneItemClr" ${D}>비우기</button>`:''}<span class="sp"></span><span class="small muted">구문 꼴은 테이블 탭 · 소지품 DB 「구문」과 같다</span></div>`}</section>
 ${tuneCritBox(T,D)}
 ${tuneDexBox(t,p,D)}
 <section class="tbox"><div class="row"><b>걸어 둔 자동화 구문</b><span class="small muted">포텐셜 · 특성 · 소지품 칸의 「구문」 버튼에서 고친다</span></div>
  ${autos.length||td?`<div class="tauto">${autos.map(([k,v])=>`<div><span class="kindb">${esc(k)}</span> <button class="btn sm ghost" data-act="tuneFxK" ${D} data-name="${esc(k)}">고치기</button><pre class="tpre">${esc(String(v).trim())}</pre></div>`).join('')}${td?`<div><span class="kindb">상세 조정</span><pre class="tpre">${esc(td)}</pre></div>`:''}</div>`:'<p class="small faint" style="margin:6px 0">없다 (같은 이름의 레디메이드가 있으면 그것이 돈다)</p>'}
  ${(()=>{const C=tuneCands(p);return C.length?`<div class="row" style="margin-top:6px;gap:6px"><select data-tunefx="${p.id}">${C.map((c,ci)=>`<option value="${ci}">${esc(c.lab)} · ${esc(c.name)}${String((p.auto||{})[FXK(c.name)]||'').trim()?' (구문 있음)':((fxRm(c.kind,c.name)||{}).ops||[]).length?' (레디메이드)':''}</option>`).join('')}</select><button class="btn pri sm" data-act="tuneFx" ${D}>+ 구문 쓰기</button></div>`:'<p class="small faint" style="margin:6px 0 0">포텐셜 · 특성 · 소지품을 먼저 넣으면 여기서 구문을 걸 수 있다</p>'})()}</section>
 </div>`}
/* 10-22 망령: 포텐셜 탭을 웹툴(오레마스 시트) 카드처럼 — 슬롯 번호 · 분류 꼬리표 · 이름 · 효과 전문 (「」【】 강조, ① ② 줄 나눔) */
const POT_HUE={역할:'#e6b422',분류:'#8d96a8',주인:'#4fbf73',종족:'#4fbf73',속성:'#4aa3ff',속별:'#4aa3ff',유대:'#ff8ab4',선:'#38c6b4',회피:'#7aa3ee',내성:'#9b8cff',전술:'#ff8a5c',특권:'#b07cff',성격:'#ff8a5c',기술:'#ff5c8a',전용:'#ffd84a','4식':'#f0a24a','5식':'#f0a24a','6식':'#f0a24a','5계':'#5fb0ff','6령':'#e06c75','8령':'#e06c75'};
function potKindP(k){const m=String(k||'').trim().match(/^(\d+(?:\.\d+)*)\.\s*(.+)$/);return m?{no:m[1],lab:m[2].trim()}:{no:'',lab:String(k||'').trim()}}
function potFmtM(t){let h=esc(brN(t||'')).replace(/\\n/g,'\n');h=h.replace(/【([^】]*)】/g,'<b class="ptbk">【$1】</b>').replace(/「([^」]*)」/g,'<b class="ptqt">「$1」</b>').replace(/『([^』]*)』/g,'<b class="ptqt">『$1』</b>');
 const L=h.split('\n').map(x=>x.trim()).filter(Boolean);if(L.length<2&&!/^[①-⑳]/.test(L[0]||''))return h;
 return L.map(l=>{const m=l.match(/^([①-⑳]|\d+[.)])\s*(.*)$/);return m?`<div class="pkl"><i>${m[1]}</i><span>${m[2]}</span></div>`:`<div class="pkl"><span>${l}</span></div>`}).join('')}
function potCardM(o){const k=potKindP(o.kind);const hue=o.ex?POT_HUE.전용:(POT_HUE[k.lab]||'#3fc7c0');
 return `<div class="pot potc2${o.ex?' excl':''}${o.vac?' vac':''}" style="--ph:${hue}" tabindex="0" role="button" data-kbd data-act="editPot" ${o.D} data-k="${o.k}"${o.si!=null?` data-si="${o.si}" data-grab`:''}><div class="poth2"><span class="potk2"><em>${esc(o.slot)}</em>${k.lab?`<span>${esc(k.lab)}</span>`:o.vac||o.ex?'':'<span class="nok">종류 미지정</span>'}</span><b class="pn">${esc(o.name)}</b>${o.custom?'<span class="kindb">직접 작성</span>':''}${o.ban?'<span class="warn small">금지어</span>':''}<span class="sp"></span><span class="row pbtns" style="gap:2px;flex-wrap:nowrap">${o.btns||''}</span></div>${o.eff?`<div class="pe2">${potFmtM(o.eff)}</div>`:''}</div>`}
function potsTab(t,ti,p,pi){const exE=p.excl.eff;const D=`data-i="${ti}" data-j="${pi}"`;
 return `<div class="potl potl2" data-sort="pots" ${D}>${potCardM({ex:1,vac:!p.excl.name,D,k:'excl',slot:'전용',kind:'',name:p.excl.name||'전용 포텐셜 · 눌러서 작성',eff:exE,ban:banHits(exE).length,btns:fxAutoBtn(p,'pot',p.excl.name,ti,pi,'excl')})}
 ${(p.exclX||[]).map((x,xi)=>potCardM({ex:1,vac:!x.name,D,k:'x'+xi,slot:'전용 '+(xi+2),kind:'',name:x.name||'추가 전용 포텐셜 · 눌러서 작성',eff:x.eff,ban:banHits(x.eff).length,btns:fxAutoBtn(p,'pot',x.name,ti,pi,'x'+xi)+`<button class="btn sm ghost danger" data-act="potDel" ${D} data-k="x${xi}" aria-label="전용 칸 지우기">✕</button>`})).join('')}
 ${p.pots.map((n,i)=>{if(!n)return '';const r=potRow(n);const e=potEffOf(p,i);return potCardM({D,k:i,si:i,slot:'#'+(i+1),kind:potKindOf(p,i),name:n,eff:e,custom:!r||p.potEff[i],ban:banHits(e).length,btns:fxAutoBtn(p,'pot',n,ti,pi,i)+`<button class="btn sm ghost danger" data-act="potDel" ${D} data-k="${i}" aria-label="비우기">✕</button>`})}).join('')}</div>
 <div class="row" style="margin-top:8px">${p.pots.some(n=>!n)?`<button class="btn pri sm" data-act="addPot" data-i="${ti}" data-j="${pi}">+ 포텐셜 추가</button>`:''}<button class="btn sm" data-act="addEx" data-i="${ti}" data-j="${pi}" title="이 포켓몬에 전용 포텐셜 칸을 하나 더 만듭니다 (능력 AAA: 1체에게 2개까지)">+ 전용 칸</button><button class="btn sm" data-act="stpl" data-i="${ti}" data-j="${pi}" title="테이블·계산식 탭의 포켓몬 시트 템플릿(트레이너 자질 반영)으로 빠진 포텐셜 슬롯을 채웁니다">시트 템플릿 적용</button><span class="small muted">트레이너 자질에 맞는 기본 포텐셜 중 빠진 것만 빈 슬롯에 넣습니다</span></div>
 <p class="small faint" style="margin:8px 0 0">오른쪽 「구문」 버튼은 오레마스 배틀 자동화입니다 — <b>구문 ✓</b> 이 포켓몬만의 구문 있음 · <b>자동</b> 같은 이름의 레디메이드가 자동으로 돎 · <b>구문</b> 자동화 없음(써 넣을 수 있음). 줄을 누르면 편집 창이 열리고, 줄을 잡고 위아래로 끌면 순서를 바꿀 수 있습니다(휴대폰은 길게 누른 뒤 끌기). DB에서 고르거나, 태그 버튼을 써서 직접 작성할 수 있습니다. 복사용 텍스트에는 채워진 슬롯만 위에서부터 순서대로 들어갑니다.</p>
 ${fieldsHtml(p,`data-i="${ti}" data-j="${pi}"`,'p')}`}
function textTab(t,ti,p,pi,P){const s=copyText(t,p);return `<div class="row" style="margin-bottom:8px"><b>복사용 텍스트</b><span class="small muted">시트 「복사용 텍스트」 칸과 같은 규칙</span><span class="sp"></span><button class="btn pri sm" data-act="copy" data-i="${ti}" data-j="${pi}">복사</button></div>
 <div class="copybox">${esc(s)}</div><label class="lbl" for="memo-${p.id}" style="margin-top:10px">메모<textarea id="memo-${p.id}" data-p="${P}.memo" rows="3">${esc(p.memo)}</textarea></label>`}

/* ---------- 이벤트: 캐릭터 ---------- */
function getRef(path){const a=path.split('.').map(unseg);let o=S;if(a[0]==='T'){o=S.trainers;a.shift()}for(let i=0;i<a.length-1;i++){o=o==null?o:o[a[i]]}return[o,a[a.length-1]]}
function trOf(el){const s=el.closest('[data-ti]');return s?S.trainers[+s.dataset.ti]:null}
let rfBusy=false;
function focusKey(f){if(!f||f===document.body||!f.closest||!f.closest('#v-char'))return null;
 if(f.dataset&&f.dataset.p)return `[data-p="${CSS.escape(f.dataset.p)}"]`;if(f.id)return '#'+CSS.escape(f.id);
 const a=f.closest('[data-act],[data-ptab],[data-tog]');if(!a)return null;const at=['data-act','data-ptab','data-tog','data-i','data-j','data-k'].filter(x=>a.hasAttribute(x)).map(x=>`[${x}="${CSS.escape(a.getAttribute(x))}"]`).join('');return at||null}
function withFocus(fn){const f=document.activeElement;const key=focusKey(f);let ss=null,se=null;try{ss=f.selectionStart;se=f.selectionEnd}catch(e){}
 fn();if(!key)return;const n=document.querySelector(key);if(n&&n!==document.activeElement){n.focus({preventScroll:true});try{if(ss!=null)n.setSelectionRange(ss,se)}catch(e){}}}
function refreshTrainer(t){if(rfBusy)return;const ti=S.trainers.indexOf(t);const el=$('#tr-'+t.id);if(!el||!el.parentNode||ti<0)return renderChar();
 rfBusy=true;try{withFocus(()=>{try{el.outerHTML=trainerHTML(t,ti)}catch(e){renderChar()}})}finally{rfBusy=false}}
/* 로그 정리기 iframe 을 남은 창 높이에 딱 맞춘다 (휴대폰 아래 탭 막대는 뺀다) — 제작기 쪽은 스크롤이 없고 정리기 안에서만 스크롤 */
function fitLog(){for(const [fi,vi] of [['#logFrame','#v-log'],['#ruleFrame','#v-rule']]){const f=$(fi),v=$(vi);if(f&&v&&!v.hidden)fitFrame(f)}}   /* 10-23 망령: 룰북 탭도 창 높이에 맞춘다 */
function fitFrame(f){const top=f.getBoundingClientRect().top+window.scrollY;let bot=0;const tb=$('#mk .tabs');if(tb){const r=tb.getBoundingClientRect();if(getComputedStyle(tb).position==='fixed'&&r.top>innerHeight/2)bot=r.height}f.style.height=Math.max(420,Math.floor(innerHeight-top-bot))+'px'}
addEventListener('resize',()=>{clearTimeout(fitLog.t);fitLog.t=setTimeout(fitLog,80)});
const LOGV='20261026g';   /* 로그 정리기 판 (캐시 깨기) */
function refreshAll(){stApply();if(S.ui.tab==='log'){const f=$('#logFrame');if(f&&!f.getAttribute('src'))f.src='logtool/index.html?v='+LOGV;requestAnimationFrame(fitLog);return}if(S.ui.tab==='rule'){const f=$('#ruleFrame');if(f&&!f.getAttribute('src'))f.src='rulebook.html?v=20261025b';requestAnimationFrame(fitLog);return}if(S.ui.tab==='notes'){if(window.MKM_NOTES)MKM_NOTES.render();return}if(S.ui.tab==='char')renderChar();else if(S.ui.tab==='type')renderType();else if(S.ui.tab==='db')renderDB();else renderTbl()}
let rT=null;
let composing=false;
$('#v-char').addEventListener('compositionstart',()=>{composing=true;clearTimeout(rT)});
$('#v-char').addEventListener('compositionend',e=>{composing=false;const t=trOf(e.target);if(t&&e.target.tagName!=='TEXTAREA'){clearTimeout(rT);rT=setTimeout(()=>refreshTrainer(t),550)}});
$('#v-char').addEventListener('input',e=>{if(e.target.dataset.tuneitem){const t=S.trainers[+e.target.dataset.i];const P=t&&t.pokemon[+e.target.dataset.j];if(!P)return;const T0=tuneOf(P);T0.item=e.target.value;T0.itemName=T0.item.trim()?P.item:'';save();const pv=$('#tunePrev-'+P.id);if(pv&&fxReady())pv.innerHTML=tuneItemPrev(T0.item);return}
 const p=e.target.dataset.p;if(!p)return;if(/^T\.\d+\.rp\./.test(p)){const tt=S.trainers[+p.split('.')[1]];if(tt&&(!tt.rp||typeof tt.rp!=='object'))tt.rp={}}const[o,k]=getRef(p);if(!o)return;o[k]=e.target.type==='checkbox'?e.target.checked:e.target.value;save();
 const t=trOf(e.target);if(e.target.tagName==='TEXTAREA'||e.isComposing||composing)return;clearTimeout(rT);rT=setTimeout(()=>t&&refreshTrainer(t),550)});
/* 10-25 망령: 능력치 막대를 좌우로 끌어 종족치 조절 (0~200 눈금 · 놓으면 저장하고 다시 그림) */
{let dg=null;const valAt=(bar,x)=>{const r=bar.getBoundingClientRect();return Math.max(1,Math.min(200,Math.round((x-r.left)/r.width*200)))};
 const mv=e=>{if(!dg||e.pointerId!==dg.id)return;const v=valAt(dg.bar,e.clientX);dg.o[dg.k]=String(v);if(dg.inp)dg.inp.value=v;const fi=dg.bar.querySelector('i');if(fi)fi.style.width=Math.min(100,v/2)+'%';const kn=dg.bar.querySelector('.knob');if(kn)kn.style.left=Math.min(100,v/2)+'%';dg.bar.classList.add('dragging');dg.bar.title='종족치 '+v};
 $('#v-char').addEventListener('pointerdown',e=>{const bar=e.target.closest('.bar[data-drag]');if(!bar||e.button!==0)return;const path=bar.dataset.drag;const[o,k]=getRef(path);if(!o)return;e.preventDefault();try{bar.setPointerCapture(e.pointerId)}catch(err){}
  dg={bar,o,k,id:e.pointerId,t:trOf(bar),inp:bar.parentNode.querySelector(`[data-p="${CSS.escape(path)}"]`)};clearTimeout(rT);mv(e)});
 $('#v-char').addEventListener('pointermove',mv);
 const end=e=>{if(!dg||e.pointerId!==dg.id)return;const t=dg.t;dg.bar.classList.remove('dragging');dg=null;save();if(t)refreshTrainer(t)};$('#v-char').addEventListener('pointerup',end);$('#v-char').addEventListener('pointercancel',end)}
$('#v-char').addEventListener('change',e=>{const el=e.target;
 /* 10-27 망령: 기능 확장 · 해석 차단 */
 if(el.dataset.ext){const t=S.trainers[+el.dataset.i];const x=t&&(t.ext||[])[+el.dataset.k];if(!x)return;const f=el.dataset.ext;if(f==='lim')x.lim=Math.max(0,Math.min(9,Math.round(+el.value)||0));else if(f==='kind')x.kind=el.value==='extra'?'extra':'act';else if(f==='who')x.who=String(el.value||'');else if(f==='src')x.src=String(el.value||'').trim().slice(0,60);save();refreshTrainer(t);return}
 if(el.dataset.tdexfw!=null){const t=S.trainers[+el.dataset.i];if(!t)return;t.dexFw=el.value==='0'?'':el.value;save();refreshTrainer(t);return}
 if(el.dataset.tdexp!=null){const t=S.trainers[+el.dataset.i];if(!t)return;const o=Object.assign({},t.dexFwParts||{});if(el.checked)o[el.dataset.dexp]=1;else delete o[el.dataset.dexp];t.dexFwParts=o;save();return}
 if(el.dataset.dexfw){const t=S.trainers[+el.dataset.i];const P=t&&t.pokemon[+el.dataset.j];if(!P)return;if(el.dataset.dexfw==='lv'){if(el.value==='')delete P.dexFw;else P.dexFw=el.value;save();refreshTrainer(t);return}const o=Object.assign({},P.dexFwParts||{});if(el.checked)o[el.dataset.dexp]=1;else delete o[el.dataset.dexp];P.dexFwParts=o;save();return}
 if(el.dataset.tunecr){const t=S.trainers[+el.dataset.i];const P=t&&t.pokemon[+el.dataset.j];if(!P)return;const c=tuneOf(P).crit;const k=el.dataset.tunecr;const v=el.type==='checkbox'?el.checked:String(el.value).trim();if(v===''||v===false||(k!=='tbl'&&k!=='dmg'&&el.type==='number'&&!+v))delete c[k];else c[k]=el.type==='checkbox'?1:v;save();return}
 if(el.dataset.tunest){const t=S.trainers[+el.dataset.i];const P=t&&t.pokemon[+el.dataset.j];if(!P)return;const v=el.value.replace(/\s+/g,'');const x=tuneOf(P).st.find(q=>q.st===el.dataset.tunest);if(!x)return;if(!FRAC_RE.test(v)||!(+v.split('/')[1]>0)){toast('비율을 1/6 처럼 적어 주세요');el.value=x.v;return}x.v=v;save();refreshTrainer(t);return}
 if(el.dataset.sfiles){const fs=[...el.files];el.value='';stUpload(el.dataset.sfiles,fs);return}
 if(el.dataset.srep||el.dataset.sl!=null||el.dataset.spt!=null||el.dataset.skd!=null){const ref=el.dataset.srep||el.dataset.sl||el.dataset.spt||el.dataset.skd;const c=ref.lastIndexOf(':');const R=stRef(ref.slice(0,c));const s=R.o&&(R.o.stands||[])[+ref.slice(c+1)];if(!s)return;
  if(el.dataset.srep){const f=el.files[0];el.value='';if(!f)return;toast('올리는 중…');uploadStand(R.o,f).then(u=>{s.src=u;save();refreshTrainer(R.t);toast('그림을 바꿨습니다')}).catch(er=>toast('올리지 못했습니다: '+er.message));return}
  if(el.dataset.sl!=null)s.label=el.value.trim()||'기본';else if(el.dataset.spt!=null)s.point=+el.value||0;else{if(el.value)s.kind=el.value;else delete s.kind}save();return}
 if(el.dataset.ivs){const [a,b,k]=el.dataset.ivs.split('.').map(Number);const t=S.trainers[a];const P=t&&t.pokemon[b];if(!P)return;let v=Math.round(+el.value);if(!isFinite(v))v=0;v=Math.max(0,Math.min(31,v));if(!P.ivs)P.ivs=[0,0,0,0,0,0];P.ivs[k]=v;P.ivLog=Object.assign({},P.ivLog||{},{e:1});save();refreshTrainer(t);return}
 if(el.dataset.tordx!=null||el.dataset.tordadd!=null){const t=S.trainers[+(el.dataset.tordx??el.dataset.tordadd)];if(!t||!t.orders)return;const kind=el.dataset.kind;let k=el.dataset.key,f=+el.value;if(el.dataset.tordadd!=null){if(!el.value)return;[k,f]=el.value.split(':');f=+f}
  const o=Object.assign({},t.orders);const tc=tOrdTc(t),def=kind==='o'?TORD.tordOf(tc):tc;const ty=Object.assign({},o.type||{});if(f===def)delete ty[kind+'_'+k];else ty[kind+'_'+k]=f;if(Object.keys(ty).length)o.type=ty;else delete o.type;t.orders=o;save();refreshTrainer(t);return}
 if(el.dataset.tord!=null){const t=S.trainers[+el.dataset.tord];if(!t)return;const k=el.dataset.k;const o=Object.assign({},t.orders||{});if(k==='preset'){if(!el.value){delete t.orders;save();refreshTrainer(t);return}o.preset=el.value;if(o.preset==='manual'&&o.tc==null){const tc=TORD.presetTc((t.orders||{}).preset,(t.ranks||{})['지시']);o.tc=isNaN(tc)?0:tc}}else if(k==='tc')o.tc=+el.value||0;else o.base=Math.max(0,Math.min(9,Math.round(+el.value||0)));if(o.base==null)o.base=1;t.orders=o;save();refreshTrainer(t);return}
 if(el.dataset.tmove!=null){const t=trOfRow(el.closest('section.folder'))||S.trainers[+el.dataset.tmove];if(t){t.folder=el.value;S.ui.fclosed=S.ui.fclosed||{};delete S.ui.fclosed[el.value||'_none'];save();renderChar();const f=S.folders.find(x=>x.id===el.value);toast(`「${t.name}」 → ${f?f.name:'폴더 없음'}`)}return}
 if(el.dataset.p){const t=trOf(el);const m=el.dataset.p.match(/^T\.\d+\.ranks\.(.+)$/);if(m&&t){if(el.tagName==='INPUT'){const v=el.value.trim().toUpperCase().replace(/\s+/g,'').replace(/＋/g,'+').replace(/[－−]/g,'-')||'C';el.value=v;t.ranks[m[1]]=v}applyTpl(t,m[1]);save()}
  if(t&&/^T\.\d+\.solo$/.test(el.dataset.p)){for(const [n,d] of ptItems())t.base[n]=+d||0;if(t.solo===''||t.solo==='0')t.solo=false;else if(t.solo==='2')t.solo=true;else if(t.solo==='3')t.solo=3;applyTpl(t);save();toast(soloN(t)===3?'1인 기준 (3체) — 6체 기준의 절반으로 맞췄습니다':soloN(t)?'1인 기준 (2체) 템플릿을 적용했습니다':'6체 기준 템플릿을 적용했습니다')}clearTimeout(rT);if(t)setTimeout(()=>refreshTrainer(t),0);return}
 if(el.dataset.img){const f=el.files[0];if(!f)return;const t=S.trainers[+el.dataset.img];readImg(f,640,'image/webp',u=>setImgOf(t,'t',u,t))}
 if(el.dataset.stf){const f=el.files[0];if(!f)return;const t=S.trainers[+el.dataset.stf];uploadStand(t,f).then(u=>{const inp=$('#stu-'+t.id);if(inp)inp.value=u;const l=$('#stl-'+t.id);if(l&&!l.value)l.value=f.name.replace(/\.[^.]+$/,'');toast('올렸습니다 — 「추가」를 누르세요')}).catch(e=>toast('올리지 못했습니다: '+e.message));el.value=''}
 if(el.dataset.pstf){const f=el.files[0];if(!f)return;const [a,b]=el.dataset.pstf.split('.').map(Number);const t=S.trainers[a],p=t&&t.pokemon[b];if(!p)return;uploadStand(p,f).then(u=>{const inp=$('#pstu-'+p.id);if(inp)inp.value=u;const l=$('#pstl-'+p.id);if(l&&!l.value)l.value=f.name.replace(/\.[^.]+$/,'');toast('올렸습니다 — 「추가」를 누르세요')}).catch(e=>toast('올리지 못했습니다: '+e.message));el.value='';return}
 if(el.dataset.pimg){const f=el.files[0];if(!f)return;const [a,b]=el.dataset.pimg.split('.').map(Number);setPokeImg(a,b,f)}});
/* 스탠딩 그림을 공유 저장소(Supabase Storage, 버킷 oremas — 오레마스와 같은 프로젝트)에 올리고 공개 주소를 돌려준다 */
/* 10-26 용량 점검: 올리는 그림은 전부 webp 로 줄인다 (긴 변 2048 · 품질 .86 · 투명 배경 유지). gif · svg 는 그대로. 줄인 게 더 크면 원본 */
async function shrinkUpload(blob,maxSide){try{if(!/^image\/(png|jpe?g|webp|bmp)$/i.test(blob.type||''))return blob;const bmp=await createImageBitmap(blob);const sc=Math.min(1,(maxSide||2048)/Math.max(bmp.width,bmp.height));if(sc>=1&&blob.type==='image/webp')return blob;const cv=document.createElement('canvas');cv.width=Math.max(1,Math.round(bmp.width*sc));cv.height=Math.max(1,Math.round(bmp.height*sc));cv.getContext('2d').drawImage(bmp,0,0,cv.width,cv.height);const out=await new Promise(r=>cv.toBlob(r,'image/webp',.86));return out&&out.size<blob.size?out:blob}catch(e){return blob}}
async function putImg(path,blob){const c=window.MKM_CONFIG||{};if(!c.supabaseUrl||!c.supabaseKey)throw new Error('공유 저장소 설정이 없습니다 (js/config.js)');blob=await shrinkUpload(blob,2048);
 const ty=blob.type||'image/png';const ext=ty.includes('png')?'png':ty.includes('webp')?'webp':ty.includes('gif')?'gif':'jpg';const full=`${path}.${ext}`;const base=c.supabaseUrl.replace(/\/$/,'');
 const r=await fetch(`${base}/storage/v1/object/oremas/${full}`,{method:'POST',headers:{apikey:c.supabaseKey,Authorization:'Bearer '+c.supabaseKey,'Content-Type':ty,'x-upsert':'true','cache-control':'31536000'},body:blob});
 if(!r.ok){let m='';try{m=(await r.json()).message||''}catch(e){}if(/bucket not found/i.test(m))m='그림 저장소(버킷 oremas)가 없습니다 — supabase/schema.sql 을 다시 실행해 주세요';throw new Error(m||('HTTP '+r.status))}
 return `${base}/storage/v1/object/public/oremas/${full}`}
/* 스탠딩 그림(트레이너·포켓몬)을 공유 저장소(Supabase Storage, 버킷 oremas — 오레마스와 같은 프로젝트)에 원본 그대로 올리고 공개 주소를 돌려준다. 투명 배경이 그대로 남는다 */
async function uploadStand(o,f){if(!/^image\//.test(f.type))throw new Error('그림 파일만');if(f.size>5*1024*1024)throw new Error('5MB 이하만');return putImg(`stands/${o.id}_${Date.now().toString(36)}`,f)}
/* 시트 이미지(data URL)를 공유 저장소로: 문서가 1.5MB 를 넘지 않게 */
async function hostImg(tag,id,dataUrl){const b=await (await fetch(dataUrl)).blob();return putImg(`maker/${tag}_${id}_${Date.now().toString(36)}`,b)}
const shHostOn=()=>{try{return !!(SH.on&&SH.canWrite)}catch(e){return false}};
/* 10-23 이그레스: 예전에 시트 안(data URL)에 넣은 그림을 공유 저장소로 옮기고 주소만 남긴다 — 시트를 받을 때마다 그림까지 받지 않게.
   공유 DB 를 다 읽은 뒤 한 장씩 천천히. 못 옮긴 그림은 그대로 두고 다음에 열 때 다시 해 본다 */
let shMigBusy=false;
async function shMigrateImgs(){if(shMigBusy||!shHostOn())return;shMigBusy=true;let n=0;
 const isD=u=>/^data:image\//.test(String(u||''));const jobs=[];
 for(const f of S.folders)if(f.deco&&isD(f.deco.bg))jobs.push([f.deco,'bg','fb',f.id,null]);
 for(const t of S.trainers){if(isD(t.image))jobs.push([t,'image','t',t.id,t]);if(t.deco&&isD(t.deco.bg))jobs.push([t.deco,'bg','tb',t.id,t]);
  for(const p of t.pokemon||[]){if(isD(p.image))jobs.push([p,'image','p',p.id,t]);for(const fm of p.forms||[])if(fm&&isD(fm.image))jobs.push([fm,'image','p',fm.id||p.id,t])}}
 try{for(const [o,k,tag,id,t] of jobs){if(!shHostOn())break;const u=o[k];
   try{const url=await hostImg(tag,id,u);if(o[k]!==u)continue;o[k]=url;n++;save();if(t)refreshTrainer(t)}catch(e){console.warn('[그림 옮기기]',e)}}}
 finally{shMigBusy=false}
 if(n){renderAll();toast(`예전 시트 그림 ${n}장을 공유 저장소로 옮겼습니다`)}}
/* 10-23 이그레스: 공유 중이면 먼저 저장소에 올리고 주소만 저장한다 (예전엔 그림째 한 번 저장한 뒤 바꿔서, 그림 든 시트가 모두에게 한 번씩 갔다). 못 올리면 예전처럼 시트 안에 */
const IMG_TK=new WeakMap();
function setImgOf(o,tag,u,t){if(!shHostOn()){o.image=u;save();refreshTrainer(t);return}
 const tk={};IMG_TK.set(o,tk);toast('그림을 공유 저장소에 올리는 중…');
 hostImg(tag,o.id,u).then(url=>{if(IMG_TK.get(o)!==tk)return;o.image=url;save();refreshTrainer(t)})
  .catch(e=>{if(IMG_TK.get(o)!==tk)return;o.image=u;save();refreshTrainer(t);toast('그림을 공유 저장소에 올리지 못해 시트 안에 넣었습니다 ('+e.message+')')})}
/* 10-21 망령: 폼체인지·메가진화 그림도 포켓몬 그림처럼 (클릭 · 끌어다 놓기 · 붙여넣기) */
function setFormImg(key,f){const [a,b,k]=String(key).split('.').map(Number);const t=S.trainers[a],p=t&&t.pokemon[b],fm=p&&(p.forms||[])[k];if(!fm||!f||!/^image\//.test(f.type))return false;if(!fm.id)fm.id=(p.id||uid())+'_f'+uid();readImg(f,480,'image/webp',u=>{setImgOf(fm,'p',u,t);toast(`「${fm.name||'폼'}」 그림을 넣었습니다`)});return true}
document.addEventListener('drop',e=>{const z=e.target.closest&&e.target.closest('[data-fdrop]');if(!z)return;const f=e.dataTransfer&&e.dataTransfer.files&&[...e.dataTransfer.files].find(x=>/^image\//.test(x.type));if(!f)return;e.preventDefault();e.stopImmediatePropagation();setFormImg(z.dataset.fdrop,f)},true);
document.addEventListener('dragover',e=>{const z=e.target.closest&&e.target.closest('[data-fdrop]');document.querySelectorAll('.fmrow.fdz').forEach(x=>{if(x!==z)x.classList.remove('fdz')});if(z){e.preventDefault();z.classList.add('fdz')}},true);
document.addEventListener('dragleave',e=>{const z=e.target.closest&&e.target.closest('[data-fdrop]');if(z&&!z.contains(e.relatedTarget))z.classList.remove('fdz')},true);
document.addEventListener('drop',()=>document.querySelectorAll('.fmrow.fdz').forEach(x=>x.classList.remove('fdz')));
document.addEventListener('paste',e=>{const it=[...(e.clipboardData&&e.clipboardData.items||[])].find(x=>x.type.startsWith('image/'));if(!it)return;const ae=document.activeElement;if(ae&&ae.matches&&ae.matches('input,textarea,select'))return;
 const z=(ae&&ae.closest&&ae.closest('[data-fdrop]'))||(window.__hoverFm&&window.__hoverFm.isConnected?window.__hoverFm:null);if(!z)return;e.preventDefault();e.stopImmediatePropagation();setFormImg(z.dataset.fdrop,it.getAsFile())},true);
document.addEventListener('mouseover',e=>{window.__hoverFm=e.target.closest&&e.target.closest('[data-fdrop]')||null});
function setPokeImg(a,b,f){const t=S.trainers[a],p=t&&t.pokemon[b];if(!p||!f||!/^image\//.test(f.type))return false;readImg(f,480,'image/webp',u=>{setImgOf(p,'p',u,t);toast('이미지를 넣었습니다')});return true}
/* 끌어다 놓기 · 붙여넣기 (포켓몬 카드 위에서) */
document.addEventListener('dragover',e=>{if(e.target.closest&&e.target.closest('[data-pdrop],.pk'))e.preventDefault()});
document.addEventListener('drop',e=>{const z=e.target.closest&&(e.target.closest('[data-pdrop]')||e.target.closest('.pk'));if(!z)return;const f=e.dataTransfer&&e.dataTransfer.files&&e.dataTransfer.files[0];if(!f)return;e.preventDefault();
 const key=z.dataset.pdrop||(()=>{const art=z.closest('.pk');const pl=art&&art.closest('.plist');if(!pl)return null;return pl.dataset.i+'.'+[...pl.querySelectorAll(':scope>.pk')].indexOf(art)})();if(!key)return;const [a,b]=key.split('.').map(Number);setPokeImg(a,b,f)});
document.addEventListener('paste',e=>{const it=[...(e.clipboardData&&e.clipboardData.items||[])].find(x=>x.type.startsWith('image/'));if(!it)return;const ae=document.activeElement;if(ae&&ae.matches&&ae.matches('input,textarea,select')&&!ae.matches('[data-pdrop]'))return;
 const art=(ae&&ae.closest&&ae.closest('.pk'))||window.__hoverPk;if(!art)return;const pl=art.closest('.plist');if(!pl)return;const b=[...pl.querySelectorAll(':scope>.pk')].indexOf(art);if(b<0)return;e.preventDefault();setPokeImg(+pl.dataset.i,b,it.getAsFile())});
document.addEventListener('mouseover',e=>{const art=e.target.closest&&e.target.closest('.pk');if(art)window.__hoverPk=art});
/* 포켓몬 스탠딩 (오레마스 무대 · RP 에서 포켓몬이 말할 때) — 트레이너와 같은 모양 */
function pStandsHtml(p,ti,pi){
 return `<div class="pstands"><div class="row" style="gap:6px;align-items:baseline"><b class="small">스탠딩</b><span class="small muted">오레마스 무대용 · 투명 PNG 그대로 · 없으면 위 이미지로 선다</span></div>${standsHtml(p,'p:'+ti+'.'+pi)}</div>`}
/* 스탠딩 편집 (트레이너·포켓몬 공통): 카드에서 라벨·보정·모양을 바로 고치고, 그림 여러 장·폴더째 끌어 놓아 한 번에 올린다 (파일 이름 = 라벨, 같은 라벨은 그림만 교체) */
function standsHtml(o,key){const st=o.stands||[],a=+o.standActive||0;const K=`data-sk="${key}"`;
 return `<div class="stdw" data-sdz="${key}"><div class="stdz"><div class="stdzt"><b>그림을 여기로 끌어 놓기</b><span class="small muted">여러 장 · 폴더째 · 파일 이름이 라벨 · 같은 라벨은 그림만 바뀜</span></div>
  <div class="row" style="gap:4px"><label class="btn sm pri" tabindex="0" role="button" data-kbd>파일 고르기<input type="file" accept="image/png,image/webp,image/gif,image/jpeg" multiple data-sfiles="${key}" hidden></label><label class="btn sm" tabindex="0" role="button" data-kbd>폴더 올리기<input type="file" webkitdirectory multiple data-sfiles="${key}" hidden></label><span class="small muted" data-sprog="${key}"></span></div></div>
  ${st.length?`<div class="stgrid">${st.map((s,k)=>`<div class="stc ${k===a?'on':''}"><div class="stcp" data-act="sdef" ${K} data-k="${k}" title="눌러서 기본 그림으로">${s.src?`<img src="${esc(s.src)}" alt="" loading="lazy">`:''}${k===a?'<span class="stcon">기본</span>':''}</div>
   <div class="stcf"><input type="text" value="${esc(s.label||'')}" data-sl="${key}:${k}" placeholder="라벨" aria-label="라벨"><input type="number" value="${+s.point||0}" data-spt="${key}:${k}" title="보정 — 위로 올릴 px (음수면 내림)" aria-label="보정"></div>
   <div class="stcf"><select data-skd="${key}:${k}" title="오레마스 무대에 서는 모양 — 자동: 그림 비율 · 스탠딩: 틀 없이 전신 · 초상: 네모 틀">${[['','모양 자동'],['stand','스탠딩'],['portrait','초상 틀']].map(([v,n])=>`<option value="${v}" ${(s.kind||'')===v?'selected':''}>${n}</option>`).join('')}</select><label class="btn sm ghost" title="그림만 바꾸기" tabindex="0" role="button" data-kbd>교체<input type="file" accept="image/png,image/webp,image/gif,image/jpeg" data-srep="${key}:${k}" hidden></label><button type="button" class="btn sm ghost danger" data-act="sdel" ${K} data-k="${k}" aria-label="삭제">×</button></div></div>`).join('')}</div>`:'<div class="small muted" style="margin-top:6px">아직 없음 — 없으면 오레마스에서 위 이미지(초상)로 선다</div>'}
  <details class="stmore"><summary class="small muted">그림 주소로 추가</summary><div class="row" style="gap:4px;margin-top:4px"><input type="text" data-sul="${key}" placeholder="라벨" style="width:100px"><input type="text" data-suu="${key}" placeholder="https://…" style="flex:1;min-width:120px"><button type="button" class="btn sm" data-act="sadd" ${K}>추가</button></div></details></div>`}
function stRef(key){const [w,x]=String(key).split(':');if(w==='t'){const t=S.trainers[+x];return {o:t,t}}const [a,c]=String(x).split('.').map(Number);const t=S.trainers[a];return {o:t&&t.pokemon[c],t}}
const isImgF=f=>f&&(/^image\//.test(f.type||'')||/\.(png|webp|gif|jpe?g)$/i.test(f.name||''));
/* 끌어 놓은 파일·폴더 → 그림 파일 목록. items 는 drop 순간에만 읽히니 await 전에 entry 로 바꿔 둔다 */
async function dropImgFiles(dt){const ents=[...(dt.items||[])].map(it=>it.kind==='file'&&it.webkitGetAsEntry&&it.webkitGetAsEntry()).filter(Boolean);const plain=[...(dt.files||[])];if(!ents.length)return plain.filter(isImgF);const out=[];
 const walk=async e=>{if(e.isFile){const f=await new Promise((r,j)=>e.file(r,j));if(isImgF(f))out.push(f)}else if(e.isDirectory){const rd=e.createReader();for(;;){const xs=await new Promise((r,j)=>rd.readEntries(r,j));if(!xs.length)break;for(const x of xs)await walk(x)}}};
 for(const e of ents)await walk(e);return out}
async function stUpload(key,files){const R=stRef(key);if(!R.o)return;files=files.filter(isImgF).sort((x,y)=>(x.webkitRelativePath||x.name).localeCompare(y.webkitRelativePath||y.name,'ko',{numeric:true}));if(!files.length){toast('그림 파일이 없습니다');return}
 const urls=[];let done=0,fail=0,nx=0;const tick=()=>{const pg=$(`[data-sprog="${key}"]`);if(pg)pg.textContent=done<files.length?`올리는 중 ${done}/${files.length}${fail?` · 실패 ${fail}`:''}`:''};tick();
 const work=async()=>{while(nx<files.length){const k=nx++;try{urls[k]=await uploadStand(R.o,files[k])}catch(e){fail++;toast(files[k].name+' — '+e.message)}done++;tick()}};await Promise.all([work(),work(),work()]);
 const o=R.o;o.stands=o.stands||[];const had=o.stands.length;let add=0,rp=0;files.forEach((f,k)=>{const u=urls[k];if(!u)return;const label=f.name.replace(/\.[^.]+$/,'').trim()||'기본';const s=o.stands.find(x=>(x.label||'')===label);if(s){s.src=u;rp++}else{o.stands.push({label,src:u,point:0});add++}});
 if(!had&&o.stands.length)o.standActive=0;if(add||rp){save();refreshTrainer(R.t)}toast(`스탠딩 ${add}장 추가${rp?` · ${rp}장 교체`:''}${fail?` · ${fail}장 실패`:''}`)}
document.addEventListener('dragover',e=>{const z=e.target.closest&&e.target.closest('[data-sdz]');if(!z||!e.dataTransfer||![...e.dataTransfer.types].includes('Files'))return;e.preventDefault();e.dataTransfer.dropEffect='copy';z.classList.add('over')},true);
document.addEventListener('dragleave',e=>{const z=e.target.closest&&e.target.closest('[data-sdz]');if(z&&!z.contains(e.relatedTarget))z.classList.remove('over')},true);
document.addEventListener('drop',e=>{const z=e.target.closest&&e.target.closest('[data-sdz]');if(!z)return;e.preventDefault();e.stopImmediatePropagation();z.classList.remove('over');dropImgFiles(e.dataTransfer).then(fs=>stUpload(z.dataset.sdz,fs))},true);
function readImg(f,max,type,cb){const rd=new FileReader();rd.onload=()=>{const im=new Image();im.onload=()=>{const c=document.createElement('canvas'),s=Math.min(1,max/Math.max(im.width,im.height));c.width=Math.max(1,Math.round(im.width*s));c.height=Math.max(1,Math.round(im.height*s));const g=c.getContext('2d');if(type==='image/jpeg'){g.fillStyle='#fff';g.fillRect(0,0,c.width,c.height)}g.drawImage(im,0,0,c.width,c.height);let u=c.toDataURL(type,.85);if(type!=='image/jpeg'&&/^data:image\/jpeg/.test(u))u=c.toDataURL('image/png');cb(u)};im.onerror=()=>toast('이미지를 읽지 못했습니다');im.src=rd.result};rd.readAsDataURL(f)}
$('#v-char').addEventListener('click',async e=>{
 if(Date.now()-dragEnd<300)return;
 const ft=e.target.closest('[data-ftog]');if(ft&&!e.target.closest('button,input,select,label,textarea')){S.ui.fclosed=S.ui.fclosed||{};const k=ft.dataset.ftog;S.ui.fclosed[k]=!S.ui.fclosed[k];if(S.ui.fclosed[k]){const ids=k==='_none'?['']:[k,...fDesc(k)];for(const id of ids)if(id)S.ui.fclosed[id]=true;for(const t of S.trainers)if(ids.includes(tFolder(t))){t.open=false;for(const p of t.pokemon)p.open=false}}save();renderChar();return}
 const tg=e.target.closest('[data-tog]');if(tg&&!e.target.closest('button,input,select,label,textarea')){const[o,k]=getRef(tg.dataset.tog);o[k].open=!o[k].open;save();const t=trOf(tg);t?refreshTrainer(t):renderChar();return}
 const pt=e.target.closest('[data-ptab]');if(pt){const T=S.trainers[+pt.dataset.i];T.pokemon[+pt.dataset.j].tab=pt.dataset.ptab;save();refreshTrainer(T);return}
 const b=e.target.closest('[data-act]');if(!b)return;const i=+b.dataset.i,j=+b.dataset.j,k=b.dataset.k,T=S.trainers[i],P=T&&T.pokemon[j];
 const rf=()=>{save();T?refreshTrainer(T):renderChar()};
 switch(b.dataset.act){
  case 'fav':FAV.toggle(b.dataset.fk,b.dataset.fid);break;
  case 'favtog':lsSet('mkm_fav_open',localStorage.getItem('mkm_fav_open')==='0'?'1':'0');renderChar();break;
  case 'favgo':{const L=FAV.get().filter(f=>FAV.label(f)!=null);const f=L[+b.dataset.i];if(f)FAV.go(f);break}
  case 'favdel':{e.stopPropagation();const L=FAV.get().filter(f=>FAV.label(f)!=null);L.splice(+b.dataset.i,1);FAV.set(L);renderChar();break}
  case 'addT':S.trainers.push(newTrainer());S.ui.fclosed=S.ui.fclosed||{};delete S.ui.fclosed._none;save();renderChar();break;
  case 'addF':{const name=await askText('새 폴더','폴더 이름 (예: 3월 세션, PL 홍길동)');if(name){S.folders.push({id:uid(),name});save();renderChar()}break}
  case 'addTin':{const t=newTrainer();t.folder=b.dataset.f||'';S.trainers.push(t);S.ui.fclosed=S.ui.fclosed||{};delete S.ui.fclosed[b.dataset.f||'_none'];save();renderChar();break}
  case 'decoF':{const f=S.folders.find(x=>x.id===b.dataset.f);if(!f)break;openTDeco(f,()=>{save();renderChar()},1);break}
  case 'renF':{const f=S.folders.find(x=>x.id===b.dataset.f);if(!f)break;const name=await askText('폴더 이름 바꾸기','폴더 이름',f.name);if(name){f.name=name;save();renderChar()}break}
  case 'delF':{const f=S.folders.find(x=>x.id===b.dataset.f);if(!f)break;const n=S.trainers.filter(t=>t.folder===f.id).length;const up=fById(fPar(f));const kids=fKids(f.id);
   if(await ask(`폴더 「${esc(f.name)}」를 삭제할까요?<br><span class="small muted">안에 있던 트레이너 ${n}명${kids.length?`과 하위 폴더 ${kids.length}개`:''}는 지워지지 않고 ${up?`상위 폴더 「${esc(up.name||'')}」`:'「폴더 없음」'}으로 옮겨집니다.</span>`,'폴더 삭제')){S.trainers.forEach(t=>{if(t.folder===f.id)t.folder=up?up.id:''});kids.forEach(k=>{if(up)k.parent=up.id;else delete k.parent});S.folders=S.folders.filter(x=>x!==f);save();renderChar()}break}
  case 'addFin':{const p=fById(b.dataset.f);if(!p)break;const name=await askText('하위 폴더',`「${p.name||''}」 안에 만들 폴더 이름`);if(name){const at=S.folders.indexOf(p)+1+fDesc(p.id).length;S.folders.splice(at,0,{id:uid(),name,parent:p.id});S.ui.fclosed=S.ui.fclosed||{};delete S.ui.fclosed[p.id];save();renderChar()}break}
  case 'moveF':{const f=fById(b.dataset.f);if(!f)break;const v=await askFolder(`「${f.name||''}」 옮기기`,'어느 폴더 안으로 옮길까요?',fPar(f),f.id);if(v==null)break;if(v)f.parent=v;else delete f.parent;S.ui.fclosed=S.ui.fclosed||{};if(v)delete S.ui.fclosed[v];save();renderChar();const p=fById(v);toast(`「${f.name}」 → ${p?fPath(p):'맨 위'}`);break}
  case 'delT':if(await ask(`트레이너 「${esc(T.name)}」와 소속 포켓몬 ${T.pokemon.length}체를 모두 삭제할까요?`,'삭제')){S.trainers=S.trainers.filter(x=>x!==T);save();renderChar()}break;
  case 'dupT':{const c=clone(T);c.id=uid();c.name+=' (복사)';c.pokemon.forEach(p=>p.id=uid());S.trainers.splice(i+1,0,c);save();renderChar();break}
  case 'noimg':T.image='';rf();break;
  case 'ivHatch':if(P)openIvHatch(T,P);break;
  case 'ivClear':if(P&&await ask('개체값을 비울까요? (0 으로)','비우기')){delete P.ivs;delete P.ivLog;rf()}break;
  case 'fldAdd':case 'fldEdit':{if(e.target.closest('[data-act="fldDel"]'))break;const o=P||T;if(!o)break;openFieldEditor(o,b.dataset.act==='fldEdit'?+b.dataset.k:null,rf);break}
  case 'extAdd':{if(!T)break;T.ext=T.ext||[];openPicker('moves',{title:'기능 확장 기술',multi:true,hideOrig:false,chosen:()=>new Set((T.ext||[]).map(x=>x.mv)),onPick:n=>{if((T.ext||[]).length>=12)return toast('기능 확장은 12개까지');T.ext.push({mv:n,lim:1,kind:'act',who:'',src:''});rf()},onRemove:n=>{T.ext=(T.ext||[]).filter(x=>x.mv!==n);rf()}});break}
  case 'extDel':{const x=T&&(T.ext||[])[+b.dataset.k];if(!x)break;T.ext=T.ext.filter(y=>y!==x);rf();break}
  case 'spAdd':case 'spEdit':{if(e.target.closest('[data-act="spDel"]'))break;if(!T)break;openSpEditor(T,b.dataset.act==='spEdit'?+b.dataset.k:null,rf);break}
  case 'deckAdd':{if(!T)break;T.deck=T.deck||[];openPicker('cards',{title:'덱에 넣을 카드',multi:true,chosen:()=>new Set((T.deck||[]).map(x=>x.n)),onPick:n=>{const r=idx.cards&&idx.cards.get(n);T.deck.push({n,q:Math.max(1,Math.round(+(r&&r[7]))||1)});rf()},onRemove:n=>{T.deck=T.deck.filter(x=>x.n!==n);rf()}});break}
  case 'deckQ':{if(!T||!T.deck)break;const x=T.deck[+b.dataset.k];if(!x)break;x.q=Math.max(0,Math.min(99,(+x.q||0)+(+b.dataset.d||0)));rf();break}
  case 'deckCard':{if(!T||!T.deck)break;const x=T.deck[+b.dataset.k];if(!x)break;const i=S.db.cards.findIndex(r=>r[1]===x.n);if(i>=0)openEdit('cards',i,{onSaved:rf});else openEdit('cards',-1,{preset:{1:x.n},onSaved:rf});break}
  case 'deckDel':{if(!T||!T.deck)break;T.deck.splice(+b.dataset.k,1);rf();break}
  case 'tordPick':{const t=T;if(!t||!t.orders)break;const kind=b.dataset.kind,k=b.dataset.key,n=soloOrdN(kind,t);const o=Object.assign({},t.orders);const pk=Object.assign({},o.pick||{});let L=(Array.isArray(pk[kind])?pk[kind]:[]).slice();if(L.includes(k))L=L.filter(x=>x!==k);else{L.push(k);const need=kind==='c'&&soloA(t);while(L.length>n){let i=0;if(need&&L.filter(x=>SOLO_A_MUST.includes(x)).length===1){const j=L.findIndex(x=>!SOLO_A_MUST.includes(x)&&x!==k);if(j>=0)i=j}L.splice(i,1)}}   /* 지시 A: 넘쳐서 하나 뺄 때 하나뿐인 회피 · 명중은 남긴다 */pk[kind]=L;o.pick=pk;t.orders=o;rf();break}
  case 'spDel':{const x=T&&(T.sps||[])[+b.dataset.k];if(!x)break;if(await ask(`SP 『${esc(x.name)}』를 지울까요?`,'삭제')){T.sps=T.sps.filter(y=>y!==x);rf()}break}
  case 'fldDel':{const o=P||T;const f=o&&(o.fields||[])[+b.dataset.k];if(!f)break;if(await ask(`필드 《${esc(f.name)}》를 지울까요?`,'삭제')){o.fields=o.fields.filter(y=>y!==f);rf()}break}
  case 'sdef':case 'sdel':case 'sadd':{const R=stRef(b.dataset.sk);const o=R.o;if(!o)break;o.stands=o.stands||[];const k2=+b.dataset.k;
   if(b.dataset.act==='sdef')o.standActive=k2;
   else if(b.dataset.act==='sdel'){const s=o.stands[k2];if(!s||!await ask(`스탠딩 「${esc(s.label||'기본')}」을(를) 지울까요?`,'삭제'))break;o.stands.splice(k2,1);if(+o.standActive>k2||+o.standActive>=o.stands.length)o.standActive=Math.max(0,(+o.standActive||0)-1)}
   else{const u=(($(`[data-suu="${b.dataset.sk}"]`)||{}).value||'').trim();if(!/^https?:\/\//.test(u)){toast('그림 주소(https://…)가 필요합니다. 파일은 끌어 놓거나 「파일 고르기」로');break}const l=(($(`[data-sul="${b.dataset.sk}"]`)||{}).value||'').trim()||decodeURIComponent(u.split('?')[0].split('/').pop()||'').replace(/\.[^.]+$/,'')||'기본';o.stands.push({label:l,src:u,point:0});if(o.stands.length===1)o.standActive=0}
   save();refreshTrainer(R.t);break}
  case 'decoU':e.stopPropagation();openUqDeco(T,j,rf);break;
  case 'stadd':{const l=($('#stl-'+T.id)||{}).value||'',u=(($('#stu-'+T.id)||{}).value||'').trim();if(!/^https?:\/\//.test(u)){toast('그림 주소(https://…)가 필요합니다. 파일은 「올리기」로');break}T.stands=T.stands||[];T.stands.push({label:l.trim()||'기본',src:u,point:0});if(T.stands.length===1)T.standActive=0;rf();break}
  case 'stdef':T.standActive=+b.dataset.k;rf();break;
  case 'stkind':{const st=T.stands[+b.dataset.k];if(!st)break;const nx={'':'stand',stand:'portrait',portrait:''}[st.kind||''];if(nx)st.kind=nx;else delete st.kind;rf();break}
  case 'stedit':{const st=T.stands[+b.dataset.k];if(!st)break;const l=await askText('스탠딩 라벨','라벨',st.label);if(l==null)break;const u=await askText('그림 주소','주소',st.src);if(u==null||!/^https?:\/\//.test(u))break;const pt=await askText('보정 (위로 올릴 px, 음수면 내림)','보정',String(st.point||0));st.label=l.trim()||st.label;st.src=u.trim();st.point=+pt||0;rf();break}
  case 'stdel':{T.stands.splice(+b.dataset.k,1);if(T.standActive>=T.stands.length)T.standActive=Math.max(0,T.stands.length-1);rf();break}
  case 'tpl':if(await ask('테이블·계산식 탭의 랭크 템플릿 값으로 포인트 기본값을 덮어쓸까요?','적용',false)){applyTpl(T);rf();toast('템플릿을 적용했습니다')}break;
  case 'addPt':openPicker('points',{title:'포인트 사용 항목',onPick:n=>{T.pts.push(n);rf()}});break;
  case 'delPt':T.pts.splice(j,1);rf();break;
  case 'ptType':ptTypeModal(T);break;
  case 'addU':T.unique.push({name:'',eff:''});rf();openPotEditor(T,null,{unique:T.unique.length-1});break;
  case 'editU':if(e.target.closest('[data-act="delU"],[data-act="decoU"]'))break;openPotEditor(T,null,{unique:j});break;
  case 'delU':e.stopPropagation();T.unique.splice(j,1);rf();break;
  case 'tuneAdd':{const sel=$(`[data-tuneadd="${P.id}"]`),vi=$(`[data-tuneaddv="${P.id}"]`);const v=String((vi||{}).value||'').replace(/\s+/g,'');if(!sel||!FRAC_RE.test(v)||!(+v.split('/')[1]>0)){toast('비율을 1/6 처럼 적어 주세요');break}tuneOf(P).st.push({st:sel.value,v});rf();toast(`「${sel.value}」 ${v} — 이 포켓몬만`);break}
  case 'tuneDel':{const T0=tuneOf(P);T0.st=T0.st.filter(x=>x.st!==b.dataset.k);rf();break}
  case 'tuneItemCopy':{const T0=tuneOf(P);const bs=tuneItemBase(P);if(T0.item.trim()&&!await ask('지금 적어 둔 소지품 구문을 DB 구문으로 바꿀까요?','바꾸기'))break;T0.item=bs;T0.itemName=P.item;rf();break}
  case 'tuneItemClr':{const T0=tuneOf(P);T0.item='';T0.itemName='';rf();break}
  case 'addP':{const p=newPoke();applySheetTpl(T,p);T.pokemon.push(p);rf();break}
  case 'stpl':{const n=applySheetTpl(T,P);rf();toast(n?`템플릿 포텐셜 ${n}개를 넣었습니다`:'더 넣을 템플릿 포텐셜이 없습니다');break}
  case 'delP':if(await ask(`포켓몬 시트 「${esc(P.name||'이름 없음')}」을(를) 삭제할까요?`,'삭제')){T.pokemon=T.pokemon.filter(x=>x!==P);rf()}break;
  case 'dupP':{const c=clone(P);c.id=uid();T.pokemon.splice(j+1,0,c);rf();break}
  case 'noPimg':P.image='';rf();break;
  case 'pstadd':{const l=($('#pstl-'+P.id)||{}).value||'',u=(($('#pstu-'+P.id)||{}).value||'').trim();if(!/^https?:\/\//.test(u)){toast('그림 주소(https://…)가 필요합니다. 파일은 「올리기」로');break}P.stands=P.stands||[];P.stands.push({label:l.trim()||'기본',src:u,point:0});if(P.stands.length===1)P.standActive=0;rf();break}
  case 'pstdef':P.standActive=+b.dataset.k;rf();break;
  case 'pstkind':{const st=(P.stands||[])[+b.dataset.k];if(!st)break;const nx={'':'stand',stand:'portrait',portrait:''}[st.kind||''];if(nx)st.kind=nx;else delete st.kind;rf();break}
  case 'pstedit':{const st=(P.stands||[])[+b.dataset.k];if(!st)break;const l=await askText('스탠딩 라벨','라벨',st.label);if(l==null)break;const u=await askText('그림 주소','주소',st.src);if(u==null||!/^https?:\/\//.test(u))break;const pt=await askText('보정 (위로 올릴 px, 음수면 내림)','보정',String(st.point||0));st.label=l.trim()||st.label;st.src=u.trim();st.point=+pt||0;rf();break}
  case 'pstdel':{P.stands.splice(+b.dataset.k,1);if(P.standActive>=P.stands.length)P.standActive=Math.max(0,P.stands.length-1);rf();break}
  case 'privT':case 'privF':{const o=b.dataset.act==='privT'?T:S.folders.find(x=>x.id===b.dataset.f);if(!o)break;
   if(!ME.hash){toast('먼저 오른쪽 위 「서명」에 이름과 비밀구를 적어 주세요');openMe();break}
   if(!canEditPriv(o)){toast('만든 사람(또는 GM)만 바꿀 수 있습니다');break}
   if(o.priv){o.priv=false}else{o.priv=true;if(!o.owner){o.owner=ME.hash;o.ownerName=ME.name}}
   save();renderChar();toast(o.priv?'비공개로 두었습니다 · 같은 비밀구를 적은 브라우저와 GM 만 봅니다':'공개로 바꿨습니다');break}
  case 'tuneFx':{const C=tuneCands(P);const sel=$(`[data-tunefx="${P.id}"]`);const c=C[+((sel||{}).value)];if(c)fxOpen(T,P,c.kind,c.name,c.slot);break}
  case 'tuneFxK':{const C=tuneCands(P);const n=b.dataset.name;const c=C.find(x=>FXK(x.name)===n);fxOpen(T,P,c?c.kind:'pot',c?c.name:n,c?c.slot:null);break}
  case 'fx':{e.stopPropagation();const sl=b.dataset.slot;fxOpen(T,P,b.dataset.kind,b.dataset.name,sl===''?null:/^\d+$/.test(sl)?+sl:sl);break}
  case 'decoT':{e.stopPropagation();openTDeco(T,rf);break}
  case 'bioT':{e.stopPropagation();openBio(T,rf);break}
  case 'tpk':{e.stopPropagation();if(!P)break;openPokeCard(T,P);break}
  case 'tuq':{e.stopPropagation();openUqInfo(T,j);break}
  case 'fimgPick':{e.stopPropagation();let inp=$('#fimg-any');if(!inp){inp=document.createElement('input');inp.type='file';inp.accept='image/*';inp.id='fimg-any';inp.hidden=true;inp.addEventListener('change',()=>{const f=inp.files[0];if(f)setFormImg(inp.dataset.fimg,f)});MKROOT().appendChild(inp)}inp.dataset.fimg=`${b.dataset.i}.${b.dataset.j}.${b.dataset.k}`;inp.value='';inp.click();break}
  case 'fimgDel':{const fm=(P.forms||[])[+b.dataset.k];if(fm){fm.image='';rf()}break}
  case 'pimgPick':{e.stopPropagation();let inp=$('#pimg-any');if(!inp){inp=document.createElement('input');inp.type='file';inp.accept='image/*';inp.id='pimg-any';inp.hidden=true;inp.addEventListener('change',()=>{const f=inp.files[0];if(!f)return;const [a,b]=String(inp.dataset.pimg).split('.').map(Number);setPokeImg(a,b,f)});MKROOT().appendChild(inp)}inp.dataset.pimg=`${i}.${j}`;inp.value='';inp.click();break}
  case 'pickOld':openOldFill(T,P);break;
  case 'addForm':P.forms=P.forms||[];P.forms.push(newForm());rf();break;
  case 'tordReset':{const t=T;if(!t||!t.orders||!t.orders.type)break;const ty=Object.assign({},t.orders.type);for(const k of Object.keys(ty))if(k.startsWith(b.dataset.kind+'_'))delete ty[k];t.orders=Object.assign({},t.orders);if(Object.keys(ty).length)t.orders.type=ty;else delete t.orders.type;save();refreshTrainer(t);break}
  case 'addFormOld':openPicker('old',{title:'올드 타입 일람에서 폼 고르기',onPick:n=>{const r=idx.old.get(n);if(!r)return;P.forms=P.forms||[];P.forms.push(formFromOld(r));rf();toast(`「${r[1]}」 폼을 넣었습니다`)}});break;
  case 'delForm':{const k=+b.dataset.k;const f=(P.forms||[])[k];if(!f)break;if(await ask(`폼 「${esc(f.name||'이름 없음')}」을(를) 지울까요?`,'삭제')){P.forms=P.forms.filter(x=>x!==f);rf()}break}
  case 'addFormPot':{const f=(P.forms||[])[+b.dataset.k];if(!f)break;f.pots=f.pots||[];const used=f.pots.map(x=>+x.slot);let sl=[4,5,6,7,8].find(i=>!used.includes(i));if(sl==null)sl=0;f.pots.push({slot:sl,name:'',eff:''});rf();break}
  case 'delFormPot':{const f=(P.forms||[])[+b.dataset.k];if(!f)break;f.pots.splice(+b.dataset.x,1);rf();break}
  case 'pickFormPot':{const f=(P.forms||[])[+b.dataset.k];const x=f&&f.pots[+b.dataset.x];if(!x)break;openPicker('pots',{onPick:n=>{x.name=n;x.eff='';rf()}});break}
  case 'pickFormAbil':{const f=(P.forms||[])[+b.dataset.k];if(!f)break;openPicker('abil',{onPick:n=>{f.ability=n;rf()}});break}
  case 'addOld':openOldFill(T,null);break;
  case 'copy':copyStr(copyText(T,P));break;
  case 'pcard':e.stopPropagation();openPokeCard(T,P);break;
  case 'fview':{if(!P)break;const n=+k;if(n<0||FV[P.id]===n)delete FV[P.id];else FV[P.id]=n;refreshTrainer(T);break}
  case 'sessT':copySession([T]);break;
  case 'impP':openImport(T);break;
  case 'impText':openImport(null);break;
  case 'pickAbil':openPicker('abil',{onPick:n=>{P.ability=n;rf()}});break;
  case 'newAbil':openEdit('abil',-1,{preset:{1:P.ability},onSaved:n=>{P.ability=n;rf()}});break;
  case 'pickItem':openPicker('items',{onPick:n=>{P.item=n;rf()},onOrig:q=>openOwnItem(P,q,()=>{closeModal();rf()})});break;
  case 'ownItem':openOwnItem(P,P.item,rf);break;
  case 'addItemX':P.items2=P.items2||[];if(P.items2.length<2){P.items2.push({item:''});rf()}break;
  case 'delItemX':{const x=(P.items2||[])[+k];if(!x)break;if(x.item&&!await ask(`소지품 ${+k+2}번 칸(「${esc(x.item)}」)을 지울까요?`,'지우기'))break;P.items2.splice(+k,1);rf();break}
  case 'pickItemX':{const x=(P.items2||[])[+k];if(!x)break;openPicker('items',{onPick:n=>{x.item=n;if(x.itemOwn&&x.itemOwn.name!==n)delete x.itemOwn;rf()},onOrig:q=>openOwnItem(x,q,()=>{closeModal();rf()})});break}
  case 'ownItemX':{const x=(P.items2||[])[+k];if(x)openOwnItem(x,x.item,rf);break}
  case 'pickMove':openPicker('moves',{title:'기술 검색·추가',multi:true,hideOldOnly:!isOld(P),chosen:()=>new Set(P.moves.map(m=>m.name)),onPick:n=>{const m={name:n,half:false};P.moves.push(m);if(isBigMv(T,P,m))toast(`「${n}」 소켓 ${moveSock(P,m)} · ${bigMvRule(T)} · 경고만 띄우고 넣었습니다`);rf()},onRemove:n=>{P.moves=P.moves.filter(m=>m.name!==n);rf()}});break;
  case 'mvDel':P.moves.splice(+k,1);rf();break;
  case 'mvEdit':{const n=b.dataset.name;const ix=S.db.moves.findIndex(r=>r[2]===n);if(ix>=0)openEdit('moves',ix,{onSaved:()=>renderChar()});break}
  case 'editPot':if(e.target.closest('[data-act="potDel"]'))break;openPotEditor(T,P,k==='excl'?'excl':String(k)[0]==='x'?{ex:+String(k).slice(1)}:+k);break;
  case 'addEx':P.exclX=P.exclX||[];P.exclX.push({name:'',eff:''});save();refreshTrainer(T);openPotEditor(T,P,{ex:P.exclX.length-1});break;
case 'addPot':{const ix=P.pots.findIndex(n=>!n);if(ix>=0)openPotEditor(T,P,ix);break}
  case 'potDel':e.stopPropagation();if(String(k)[0]==='x'){P.exclX.splice(+String(k).slice(1),1);rf();break}{const x=+k;P.pots[x]='';P.potEff[x]='';P.potKind[x]='';rf()}break;
 }});

/* ---------- 드래그 정렬 (기술·포텐셜·포켓몬) ---------- */
let drag=null,dragEnd=0;
const NOGRAB='button,input,select,textarea,label,a,[contenteditable]';
document.addEventListener('pointerdown',e=>{if(e.button>0||drag)return;const g=e.target.closest('[data-grab]');if(!g||e.target.closest(NOGRAB))return;
 const item=g.closest('[data-si]'),list=item&&item.parentElement;if(!list||list.dataset.sort==null)return;
 drag={item,list,id:e.pointerId,x:e.clientX,y:e.clientY,on:false,touch:e.pointerType!=='mouse'};
 if(e.pointerType==='mouse')e.preventDefault();
 else drag.timer=setTimeout(()=>{if(drag&&!drag.on)startDrag()},350)});
function startDrag(){drag.on=true;drag.item.classList.add('dragging');MKROOT().classList.add('drag-on');if(navigator.vibrate)try{navigator.vibrate(15)}catch(_){}}
document.addEventListener('pointermove',e=>{if(!drag||e.pointerId!==drag.id)return;
 if(!drag.on){const d=Math.hypot(e.clientX-drag.x,e.clientY-drag.y);if(drag.touch){if(d>8){clearTimeout(drag.timer);drag=null}return}if(d<6)return;startDrag()}
 e.preventDefault();
 if(drag.list.dataset.sort==='trainers'&&S.folders.length){const el=document.elementFromPoint(e.clientX,e.clientY);const fh=el&&el.closest('[data-fdrop]');
  $$('.tfh.over').forEach(x=>{if(x!==fh)x.classList.remove('over')});
  if(fh){fh.classList.add('over');drag.fdrop=fh.dataset.fdrop;if(e.clientY<70)MKROOT().scrollBy(0,-16);else if(e.clientY>innerHeight-70)MKROOT().scrollBy(0,16);return}
  drag.fdrop=null;const ol=el&&el.closest('[data-sort="trainers"]');if(ol&&ol!==drag.list){ol.appendChild(drag.item);drag.list=ol}}
 /* 10-24 망령: 폴더를 다른 폴더 카드 가운데에 놓으면 그 안으로 (가장자리면 순서만 바꾼다). 「폴더 없음」 카드에 놓으면 맨 위로 꺼낸다 */
 if(drag.list.dataset.sort==='folders'){const el=document.elementFromPoint(e.clientX,e.clientY);const fh=el&&el.closest('.tfh[data-fdrop]');const me=S.folders[+drag.item.dataset.si];let ok=null;
  if(fh&&me&&!drag.item.contains(fh)){const k=fh.dataset.fdrop;const r=fh.getBoundingClientRect();const mx=r.width*.2,my=Math.min(r.height*.25,40);const mid=e.clientX>r.left+mx&&e.clientX<r.right-mx&&e.clientY>r.top+my&&e.clientY<r.bottom-my;
   if(k==='_none'?(mid&&!!fPar(me)):(mid&&k!==me.id&&!fDesc(me.id).includes(k)&&fPar(me)!==k))ok=k}
  $$('.tfh.over,.tfh.nest').forEach(x=>{if(!ok||x!==fh)x.classList.remove('over','nest')});drag.fdrop=ok;
  if(ok){fh.classList.add('over','nest');if(e.clientY<70)MKROOT().scrollBy(0,-16);else if(e.clientY>innerHeight-70)MKROOT().scrollBy(0,16);return}}
 const {item,list}=drag;
 const sibs=[...list.children].filter(x=>x!==item&&x.dataset.si!=null);let before=null;
 for(const x of sibs){const r=x.getBoundingClientRect();if(e.clientY<r.top+r.height/2){before=x;break}}
 if(before){if(item.nextElementSibling!==before)list.insertBefore(item,before)}else{const last=sibs[sibs.length-1];if(last&&last.nextElementSibling!==item)last.after(item)}
 if(e.clientY<70)MKROOT().scrollBy(0,-16);else if(e.clientY>innerHeight-70)MKROOT().scrollBy(0,16)},{passive:false});
document.addEventListener('touchmove',e=>{if(drag&&drag.on)e.preventDefault()},{passive:false});
document.addEventListener('contextmenu',e=>{if(drag&&drag.touch)e.preventDefault()});
function endDrag(e){if(!drag||e.pointerId!==drag.id)return;const d=drag;drag=null;clearTimeout(d.timer);if(!d.on)return;
 d.item.classList.remove('dragging');MKROOT().classList.remove('drag-on');dragEnd=Date.now();$$('.tfh.over,.tfh.nest').forEach(x=>x.classList.remove('over','nest'));
 if(d.list.dataset.sort==='folders'&&d.fdrop!=null){const f=S.folders[+d.item.dataset.si];if(f){const k=d.fdrop==='_none'?'':d.fdrop;if(k)f.parent=k;else delete f.parent;S.ui.fclosed=S.ui.fclosed||{};if(k)delete S.ui.fclosed[k];save();renderChar();const p=fById(k);toast(`「${f.name||'폴더'}」 → ${p?fPath(p)+' 안으로':'맨 위로'}`)}return}
 if(d.list.dataset.sort==='trainers'&&S.folders.length){moveTrainersFromDom(d);return}
 const order=[...d.list.children].filter(x=>x.dataset.si!=null).map(x=>+x.dataset.si);if(order.every((v,i)=>!i||order[i-1]<v))return;applySort(d.list,order)}
document.addEventListener('pointerup',endDrag);document.addEventListener('pointercancel',endDrag);
/* 폴더가 있을 때: 화면에 보이는 순서·소속대로 트레이너 목록을 다시 짠다 (접힌 폴더의 트레이너는 그대로 유지) */
/* 10-26 망령: 줄의 번호(data-si)가 아니라 id(section#tr-<id>)로 찾는다 — 공유 저장소에서 트레이너가 끼어들어 번호가 밀리면 엉뚱한 트레이너의 폴더가 바뀌던 사고를 막는다 */
const trOfRow=x=>{const id=x&&x.id&&x.id.startsWith('tr-')?x.id.slice(3):null;return (id&&S.trainers.find(t=>t.id===id))||(x&&x.dataset.si!=null?S.trainers[+x.dataset.si]:null)};
function moveTrainersFromDom(d){const moved=trOfRow(d.item);
 if(d.fdrop!=null){if(moved){moved.folder=d.fdrop==='_none'?'':d.fdrop;S.trainers=S.trainers.filter(t=>t!==moved).concat([moved]);S.ui.fclosed=S.ui.fclosed||{};const f=S.folders.find(x=>x.id===moved.folder);toast(`「${moved.name}」 → ${f?f.name:'폴더 없음'}`)}save();renderChar();return}
 const seen=new Set(),order=[];
 $$('#trs [data-sort="trainers"]').forEach(l=>{const fid=l.dataset.fid||'';[...l.children].forEach(x=>{if(x.dataset.si==null)return;const t=trOfRow(x);if(t&&!seen.has(t)){seen.add(t);t.folder=fid;order.push(t)}})});
 S.trainers.forEach(t=>{if(!seen.has(t))order.push(t)});S.trainers=order;save();renderChar()}
function applySort(list,order){const re=a=>order.map(i=>a[i]);const kind=list.dataset.sort;if(kind==='trainers'){/* 10-26 점검: 안 보이는(남의 비공개) 트레이너가 정렬에서 빠져 지워지던 것 */const picked=order.map(i=>S.trainers[i]).filter(Boolean);const rest=S.trainers.filter(t=>!picked.includes(t));S.trainers=picked.concat(rest);save();renderChar();return}
 if(kind==='folders'){const slots=[...order].sort((a,b)=>a-b);const nf=S.folders.slice();slots.forEach((p,k)=>{nf[p]=S.folders[order[k]]});S.folders=nf;save();renderChar();return}   /* 10-24: 하위 폴더 줄은 그 폴더들 자리끼리만 */const T=S.trainers[+list.dataset.i];if(!T)return;
 if(kind==='poke')T.pokemon=re(T.pokemon);
 else{const P=T.pokemon[+list.dataset.j];if(!P)return;if(kind==='moves')P.moves=re(P.moves);else if(kind==='pots'){const full=[...order,...P.pots.map((_,i)=>i).filter(i=>!order.includes(i))];for(const a of ['pots','potEff','potKind'])P[a]=full.map(i=>P[a][i])}}
 save();refreshTrainer(T)}

/* ---------- 올드 타입 일람 자동 입력 ---------- */
const REGF=['알로라','가라르','히스이','팔데아'];
function oldKind(r){if(r[10]==='O')return '메가진화';if(REGF.some(x=>String(r[1]).startsWith(x+' ')))return '리전 폼';return '올드 타입'}
function abilName(a){if(!a||a==='-')return '';if(idx.abil.has(a))return a;const n=a.replace(/\s/g,'');for(const k of idx.abil.keys())if(k.replace(/\s/g,'')===n)return k;return a}
function applyOld(p,r,ab,setKind){p.pride='';p.name=r[1];p.t1=r[3]||'-';p.t2=r[4]||'-';p.t3='-';p.ability=ab;p.egg1=r[8]||'-';p.egg2=r[9]||'-';p.base=r.slice(11,17).map(v=>String(v??''));
 if(setKind){let i=potIdx(p,'분류',1);if(i<0)i=!p.pots[1]?1:p.pots.findIndex(x=>!x);if(i>=0){p.pots[i]=oldKind(r);p.potEff[i]='';p.potKind[i]=''}}}
function openOldFill(T,P){openPicker('old',{title:'올드 타입 일람에서 포켓몬 선택',onPick:n=>{const r=idx.old.get(n);if(r)setTimeout(()=>openOldConfirm(T,P,r),0)}})}
function openOldConfirm(T,P,r){const abs=[[r[5],'특성1'],[r[6],'특성2'],[r[7],'숨겨진 특성']].filter(([a])=>a&&a!=='-');
 const k=oldKind(r);const tot=r.slice(11,17).reduce((a,b)=>a+(+b||0),0);
 const l=openModal(`<div class="mhead"><h2>「${esc(r[1])}」 자동 입력</h2><span class="sp"></span><button class="btn ghost" data-x>닫기</button></div>
 <div class="mbody"><div class="row">${tchip(r[3])}${tchip(r[4])}<span class="small muted">${esc(r[0])} · ${esc(r[2])} · 알그룹 ${esc(r[8])}${r[9]&&r[9]!=='-'?' / '+esc(r[9]):''}</span></div>
 <div class="small num">${STATS.map((s,i)=>esc(s)+' <b>'+esc(r[11+i])+'</b>').join(' · ')} · 합 <b>${tot}</b></div>
 <b class="small">특성 선택</b><div class="olab">${abs.map(([a,lab],i)=>{const n=abilName(a);const ar=idx.abil.get(n);return `<label class="oab"><input type="radio" name="oab" value="${esc(n)}" ${i===0?'checked':''}><span><b>${esc(n)}</b> <span class="kindb">${lab}</span>${ar?'':' <span class="warn small">DB에 없음</span>'}<br><span class="small muted">${ar?rich(ar[2]):''}</span></span></label>`}).join('')||'<span class="small muted">특성 정보가 없습니다.</span>'}</div>
 <label class="row small"><input type="checkbox" id="ok-kind" ${!P||!classOf(P)||OLDK.includes(classOf(P))?'checked':''}>포텐셜 #2(분류)를 『${esc(k)}』로 지정</label>
 ${P&&P.name?'<p class="small muted" style="margin:0">이름·타입·특성·알그룹·종족치를 덮어씁니다. 기술·다른 포텐셜·이미지는 그대로 둡니다.</p>':''}</div>
 <div class="mfoot"><span class="sp"></span><button class="btn" data-x>취소</button><button class="btn pri" data-ok autofocus>${P?'입력':'새 시트로 추가'}</button></div>`);
 l.addEventListener('click',e=>{if(e.target.closest('[data-x]'))return closeModal();if(!e.target.closest('[data-ok]'))return;
  const ab=($('input[name=oab]:checked',l)||{}).value||'';let p=P;if(!p){p=newPoke();applySheetTpl(T,p);T.pokemon.push(p)}
  applyOld(p,r,ab,$('#ok-kind',l).checked);p.open=true;p.tab='base';T.open=true;save();closeModal();refreshTrainer(T);toast(`「${r[1]}」 데이터를 입력했습니다`)})}

/* ---------- 텍스트 불러오기 ---------- */
function openImport(T){const l=openModal(`<div class="mhead"><h2>복사용 텍스트 불러오기</h2><span class="sp"></span><button class="btn ghost" data-x>닫기</button></div>
 <div class="mbody"><p class="small muted" style="margin:0">시트의 「복사용 텍스트」를 붙여넣으세요. 한 줄에 하나씩 여러 체를 한 번에 넣을 수 있습니다. DB에 없는 기술은 텍스트 안의 데이터로 오리지널 기술이 자동 등록됩니다.</p>
 ${T?'':`<label class="lbl" for="imp-t">넣을 트레이너<select id="imp-t">${S.trainers.map((t,i)=>`<option value="${i}">${esc(t.name)}</option>`).join('')}<option value="new">새 트레이너 만들기</option></select></label>`}
 <textarea id="imp-txt" rows="8" placeholder="싱잉 플로라;105;풀;독;-;-;음절초;…#" autofocus></textarea><div class="small" id="imp-info"></div></div>
 <div class="mfoot"><button class="btn" data-ex>예시 텍스트 넣기</button><span class="sp"></span><button class="btn" data-x>취소</button><button class="btn pri" data-go>불러오기</button></div>`);
 const ta=$('#imp-txt',l);const info=()=>{const n=splitCopies(ta.value).length;$('#imp-info',l).innerHTML=n?`<span class="okc">포켓몬 ${n}체 인식</span>`:'<span class="muted">인식된 텍스트가 없습니다</span>'};ta.addEventListener('input',info);
 l.addEventListener('click',e=>{if(e.target.closest('[data-x]'))return closeModal();if(e.target.closest('[data-ex]')){ta.value=EXAMPLE;info();return}
  if(e.target.closest('[data-go]')){const list=splitCopies(ta.value);if(!list.length)return toast('복사용 텍스트를 찾지 못했습니다');
   let tr=T;if(!tr){const v=$('#imp-t',l).value;if(v==='new'){tr=newTrainer();S.trainers.push(tr)}else tr=S.trainers[+v]}
   list.forEach(s=>{const p=parseCopy(s,tr);tr.pokemon.push(p)});tr.open=true;save();closeModal();renderChar();toast(`${list.length}체를 불러왔습니다`)}})}
function splitCopies(txt){return String(txt).split(/\r?\n/).map(s=>s.trim()).filter(isCopyText)}

/* ---------- 렌더: DB 관리 ---------- */
const dbs={k:'moves',q:'',type:'',cat:'',kind:'',mine:false,lim:150,f:{},pmin:'',pmax:'',fopen:false};
function dbResults(){const k=dbs.k,D=DBS[k];const rows=filterRows(k,dbs);
 return `<p class="small muted" style="margin:0 0 6px">${rows.length}건${rows.length>dbs.lim?` · 앞 ${dbs.lim}건 표시`:''} · 행을 누르면 수정 창이 열립니다</p>
 <div class="dbt"><table><tr>${D.show.map(c=>`<th>${esc(D.cols[c])}</th>`).join('')}</tr>
 ${rows.slice(0,dbs.lim).map(r=>{const i=S.db[k].indexOf(r);return `<tr data-dbedit="${i}" tabindex="0" data-kbd style="cursor:pointer">${D.show.map(c=>c===D.eff?`<td class="ef"><div class="efc">${rich(r[c])}</div></td>`:c===D.key?`<td class="b">${esc(r[c])}${S.custom[k].includes(r[c])?' <span class="kindb">오리지널</span>':''}${k==='moves'&&mvOldOnly(r)?' <span class="kindb">올드 전용</span>':''}</td>`:k==='cards'&&c===6?`<td style="width:44px">${cardImg(r[c])?`<img src="${esc(cardImg(r[c]))}" alt="" loading="lazy" style="width:36px;height:50px;object-fit:cover;border-radius:4px;display:block">`:`<span style="display:block;width:36px;height:50px;border-radius:4px;background:${cardCol(r[5])}"></span>`}</td>`:k==='st'&&c===12?`<td style="width:40px">${r[c]?`<img src="${esc(stIcon(r[c]))}" alt="" loading="lazy" style="width:32px;height:32px;object-fit:contain;display:block">`:''}</td>`:k==='rm'&&c===4?`<td style="white-space:nowrap">${(()=>{const v=String(r[4]==null?'':r[4]).trim();if(v!==''&&+v>0)return `<b>${esc(v)}%</b>`;const F=window.OM_FX;if(!F||!F.rmChance)return '<span class="faint">—</span>';let t=r[1]||'';if(!t&&F.effOf){const mm=String(r[0]||'').match(/^(특성|소지품)\s*:\s*(.+)$/);t=mm?F.effOf(mm[1]==='특성'?'trait':'item',mm[2]):(F.effOf('trait',r[0])||'')}const d=F.rmChance({text:t});return d?`<span class="muted" title="효과 글에서 읽은 확률">글 ${d}%</span>`:'<span class="faint">—</span>'})()}</td>`:k==='items'&&c===7?`<td class="ef"><div class="efc" style="white-space:pre-line;font-size:12px">${r[c]?esc(r[c]):'<span class="faint">—</span>'}</div></td>`:(k==='moves'&&c===5)||(k==='old'&&(c===3||c===4))?`<td>${tchip(r[c])}</td>`:`<td>${esc(r[c])}</td>`).join('')}</tr>`}).join('')}</table>
 ${rows.length>dbs.lim?`<div style="padding:8px"><button class="btn" data-dbmore>더 보기</button></div>`:''}</div>`}
function renderDB(){const k=dbs.k;
 const head=`<div class="intro"><h1>DB 관리</h1><p>기술·특성·소지품·포텐셜·올드 타입·포인트·레디메이드·상태 변화 DB를 검색하고 추가·수정·삭제합니다. 바뀐 내용은 캐릭터 시트의 검색 창과 계산, 맵툴 토큰 갱신에 바로 반영됩니다.</p></div>
 <div class="subtabs">${Object.entries(DBS).map(([kk,d])=>`<button data-dbk="${kk}" class="${kk===k?'on':''}">${d.t} DB<span class="c">${(kk==='rm'||kk==='st')&&!lazyOk(kk)?(FXST==='fail'?'!':'…'):S.db[kk].length}</span></button>`).join('')}<button data-dbk="mt" class="${k==='mt'?'on':''}">맵툴 DB 갱신</button></div>`;
 if(k==='mt'){dbs.ex=mtStrings();$('#v-db').innerHTML=head+mtPanel();return}
 const D=DBS[k];
 $('#v-db').innerHTML=head+`
 ${k==='rm'&&!rmLoaded()?`<div class="panel row" style="margin-bottom:10px"><span class="small ${FXST==='fail'?'warn':'muted'}" style="flex:1;min-width:200px">${FXST==='fail'?'레디메이드 기본 행(자동화 스크립트 js/fx/)을 불러오지 못했습니다. 아래에는 이 DB에서 직접 추가한 행만 보입니다.':'레디메이드 기본 행을 불러오는 중입니다…'}</span>${FXST==='fail'?'<button class="btn sm" data-fxretry>다시 불러오기</button>':''}</div>`:''}
 ${k==='st'?`<div class="panel row" style="margin-bottom:10px;gap:6px;flex-wrap:wrap"><span class="small muted" style="flex:1;min-width:220px">${stLoaded()?'오레마스는 배틀 화면 DB 창의 「제작기 새로고침」으로 고친 상태를 가져갑니다. 맵툴 「상태 변화 DB」의 「백업 · 불러오기」 JSON 과 같은 꼴이에요.':FXST==='fail'?'<span class="warn">상태 변화 기본 표(js/fx/states.js)를 불러오지 못했습니다.</span>':'상태 변화 기본 표를 불러오는 중입니다…'}</span><button class="btn sm" data-dbact="stimp">맵툴 JSON 불러오기</button><button class="btn sm" data-dbact="stexp">JSON 내보내기</button></div>`:''}
 ${k==='abil'||k==='items'||k==='old'||k==='moves'?`<div class="panel row" style="margin-bottom:10px"><span class="small muted" style="flex:1;min-width:200px">이 DB는 맵툴 라이브러리 토큰(${k==='abil'?'Lib:traits_multiple · Lib:pokemon':k==='items'?'Lib:item':k==='moves'?'Lib:skill · 기술 목록 문자열':'Lib:pokemon 「list_oldtype」'})과 연동됩니다. 고친 뒤 「맵툴 DB 갱신」에서 토큰을 새로 받으세요.</span><button class="btn sm" data-dbk="mt">맵툴 DB 갱신 열기</button></div>`:''}
 ${orphPanel(k)}
 <div class="row dbbar"><input id="dbq" type="search" enterkeyhint="search" placeholder="${D.t} 검색" value="${esc(dbs.q)}" style="flex:1 1 220px"><button type="button" class="btn ftog" data-dbftog aria-expanded="${dbs.fopen}">필터<b class="fn">${fCount(k,dbs)?' '+fCount(k,dbs):''}</b></button><button class="btn pri" data-dbact="add">+ 새 항목</button></div>
 <div class="row xfrow fwrap ${dbs.fopen?'on':''}" style="margin-bottom:8px">
  ${k==='moves'?`<select id="dbtype"><option value="">모든 타입</option>${S.db.types.map(t=>`<option ${dbs.type===t[0]?'selected':''}>${esc(t[0])}</option>`).join('')}</select><select id="dbcat"><option value="">모든 분류</option>${['물리','특수','변화'].map(c=>`<option ${dbs.cat===c?'selected':''}>${c}</option>`).join('')}</select>`:''}
  ${k==='pots'?xfHTML(k,dbs)+kindSelect(k,dbs,'id="dbkind"'):k==='items'||k==='old'?kindSelect(k,dbs,'id="dbkind"')+xfHTML(k,dbs):xfHTML(k,dbs)}
  <label class="row small"><input type="checkbox" id="dbmine" ${dbs.mine?'checked':''}>오리지널만 (${S.custom[k].length})</label>
  <span class="sp"></span><button class="btn" data-dbact="reset">원본으로 되돌리기</button></div>
 <div id="dbres">${dbResults()}</div>`}
function renderDBkeep(){keepFocus($('#v-db'),renderDB)}
/* 10-27 망령: 기본 DB 새 판에서 이름이 바뀌었거나 빠져 붙을 행이 없는 수정. 지우지 않고 여기 모아 둔다 */
const orphOf=k=>[...(SH.orph_ed||new Map())].filter(([,d])=>d&&d.kind===k);
function orphPanel(k){const L=orphOf(k);if(!L.length)return '';const D=DBS[k];
 return `<div class="panel" style="margin-bottom:10px;border-color:var(--warn)"><div class="small" style="margin-bottom:6px"><b class="warn">붙을 행이 없는 수정 ${L.length}개</b> <span class="muted">· 기본 DB 새 판에서 이름이 바뀌었거나 빠진 행입니다. 공유 DB 에 그대로 남아 있어요. 새 이름에 옮겨 붙이거나, 추가 행으로 살리거나, 버리세요.</span></div>
 ${L.map(([id,d])=>`<div class="row" style="gap:6px;flex-wrap:wrap;padding:4px 0;border-top:1px solid var(--line)"><b style="min-width:120px">${esc(d.key)}</b><span class="small muted" style="flex:1 1 200px;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${D.eff>=0?esc(String(d.row[D.eff]||'').replace(/\s+/g,' ').slice(0,80)):''}</span><button class="btn sm" data-orph="move" data-id="${esc(id)}">옮겨 붙이기</button><button class="btn sm" data-orph="add" data-id="${esc(id)}">추가 행으로 살리기</button><button class="btn sm danger" data-orph="drop" data-id="${esc(id)}">버리기</button></div>`).join('')}</div>`}
async function orphAct(act,id){const d=SH.orph_ed&&SH.orph_ed.get(id);if(!d)return;const k=d.kind,D=DBS[k];
 if(act==='drop'){if(!await ask(`「${esc(d.key)}」 수정을 버릴까요? 공유 DB 에서도 지워집니다.`,'버리기'))return}
 else if(act==='add'){if(S.db[k].some(r=>r[D.key]===d.key))return toast('같은 이름 행이 이미 있습니다 · 「옮겨 붙이기」를 쓰세요');S.db[k].unshift(clone(d.row));if(d.custom&&!S.custom[k].includes(d.key))S.custom[k].push(d.key)}
 else if(act==='move'){const n=(await askText('옮겨 붙이기',`「${d.key}」 수정을 붙일 ${D.cols[D.key]} (지금 DB에 있는 이름)`,d.key)||'').trim();if(!n)return;const i=S.db[k].findIndex(r=>r[D.key]===n);if(i<0)return toast(`「${n}」 이(가) ${D.t} DB에 없습니다`);
  if(!await ask(`「${esc(n)}」 행을 「${esc(d.key)}」 수정 내용으로 바꿀까요? (이름은 「${esc(n)}」 그대로)`,'옮겨 붙이기',false))return;const nr=clone(d.row);nr[D.key]=n;S.db[k][i]=nr;if(d.custom&&!S.custom[k].includes(n))S.custom[k].push(n)}
 SH.orph_ed.delete(id);SH.ed.delete(id);reindex();save(true);renderDB();toast(act==='drop'?'버렸습니다':'반영했습니다')}
$('#v-db').addEventListener('click',async e=>{const t=e.target;
 const kb=t.closest('[data-dbk]');if(kb){Object.assign(dbs,{k:kb.dataset.dbk,q:'',type:'',cat:'',kind:'',mine:false,lim:150,f:{},pmin:'',pmax:''});renderDB();return}
 if(t.closest('[data-dbmore]')){dbs.lim+=300;const r=$('#dbres');if(r)r.innerHTML=dbResults();return}
 const ft=t.closest('[data-dbftog]');if(ft){dbs.fopen=!dbs.fopen;$('#v-db .fwrap').classList.toggle('on',dbs.fopen);ft.setAttribute('aria-expanded',dbs.fopen);return}
 if(t.closest('[data-xfreset]')){Object.assign(dbs,{f:{},pmin:'',pmax:'',kind:'',type:'',cat:'',lim:150});renderDB();return}
 const ce=t.closest('[data-copyex]');if(ce){copyStr(dbs.ex[+ce.dataset.copyex][1]);return}
 const ed=t.closest('[data-dbedit]');if(ed){openEdit(dbs.k,+ed.dataset.dbedit);return}
 const ob=t.closest('[data-orph]');if(ob){orphAct(ob.dataset.orph,ob.dataset.id);return}
 const mb=t.closest('[data-mt]');if(mb){mb.dataset.mt==='build'?mtDownload(mb.dataset.k):mtImport(mb.dataset.k);return}
 const a=t.closest('[data-dbact]');if(!a)return;const k=dbs.k;
 if(a.dataset.dbact==='add')openEdit(k,-1);
 if(a.dataset.dbact==='stexp'){const o=stObjOf(S.db.st);const txt=JSON.stringify(o);try{await navigator.clipboard.writeText(txt)}catch(err){}const u=URL.createObjectURL(new Blob([JSON.stringify(o,null,1)],{type:'application/json'}));const el=document.createElement('a');el.href=u;el.download='상태변화DB.json';document.body.appendChild(el);el.click();el.remove();setTimeout(()=>URL.revokeObjectURL(u),2000);toast(`상태 ${Object.keys(o.st).length}개를 내보냈습니다 (클립보드에도 복사)`);return}
 if(a.dataset.dbact==='stimp'){const l=openModal(`<div class="mhead"><h2>맵툴 상태 변화 DB 불러오기</h2><span class="sp"></span><button class="btn ghost" data-x>닫기</button></div>
  <div class="mbody"><p class="small muted" style="margin:0 0 6px">맵툴 「상태 변화 DB」 창의 「백업 · 불러오기」에서 내보낸 JSON 을 붙여 넣거나 파일을 고르세요. 지금 표를 통째로 바꿉니다 (모두에게 공유).</p><input type="file" accept=".json,.txt,application/json" data-stf><textarea data-stt rows="10" placeholder='{"v":1,"groups":[…],"st":{…}}' style="width:100%;font-family:var(--mono,monospace);font-size:12px"></textarea><div class="small" data-stmsg></div></div>
  <div class="mfoot"><span class="sp"></span><button class="btn" data-x>취소</button><button class="btn pri" data-stgo>불러오기</button></div>`,{wide:true});
  const ta=$('[data-stt]',l),msg=$('[data-stmsg]',l);
  const chk=()=>{try{let o=JSON.parse(ta.value);if(o&&o.db&&o.db.st)o=o.db;if(!o||!o.st||typeof o.st!=='object')throw new Error('st 칸이 없습니다');const n=Object.keys(o.st).length;const old=new Set(S.db.st.map(r=>r[0]));const add=Object.keys(o.st).filter(k=>!old.has(k)).length;const gone=[...old].filter(k=>!o.st[k]).length;msg.innerHTML=`상태 ${n}개 · 새로 ${add}${gone?` · JSON 에 없는 ${gone}개는 그대로 둠`:''}`;return o}catch(err){msg.innerHTML=ta.value.trim()?`<span class="warn">읽지 못했습니다: ${esc(err.message)}</span>`:'';return null}};
  ta.addEventListener('input',chk);$('[data-stf]',l).addEventListener('change',async e=>{const f=e.target.files[0];if(!f)return;ta.value=await f.text();chk()});
  l.addEventListener('click',async e=>{if(e.target.closest('[data-x]'))return closeModal();if(!e.target.closest('[data-stgo]'))return;const o=chk();if(!o)return toast('JSON 을 확인해 주세요');
   const keep=S.db.st.filter(r=>r[0]&&!o.st[r[0]]);const icon=new Map(S.db.st.map(r=>[r[0],r[12]||'']));S.db.st=stRowsOf(o).map(r=>{if(!r[12]&&icon.get(r[0]))r[12]=icon.get(r[0]);return r}).concat(keep);const base=new Set((DEF.st||[]).map(r=>r[0]));S.custom.st=S.db.st.map(r=>r[0]).filter(k=>!base.has(k));reindex();save(true);stApply();closeModal();renderDB();toast(`상태 변화 DB 를 불러왔습니다 (${S.db.st.length}개)`)});return}
 if(a.dataset.dbact==='reset'&&await ask(`${DBS[k].t} DB를 원본 시트 값으로 되돌릴까요? 추가하거나 고친 내용(오리지널 ${S.custom[k].length}건 포함)이 사라집니다.`,'되돌리기')){S.db[k]=clone(DEF[k]);S.custom[k]=[];reindex();save(true);renderDB();toast('원본으로 되돌렸습니다')}});
let dqT;$('#v-db').addEventListener('input',e=>{if(e.target.id==='dbq'){clearTimeout(dqT);dqT=setTimeout(()=>{dbs.q=e.target.value;dbs.lim=150;const r=$('#dbres');if(r)r.innerHTML=dbResults()},220)}
 else if(e.target.dataset.pr){clearTimeout(dqT);dqT=setTimeout(()=>{dbs[e.target.dataset.pr]=e.target.value.trim();dbs.lim=150;const r=$('#dbres');if(r)r.innerHTML=dbResults();const fb=$('[data-dbftog] .fn');if(fb)fb.textContent=fCount(dbs.k,dbs)?' '+fCount(dbs.k,dbs):''},300)}});
$('#v-db').addEventListener('change',e=>{const id=e.target.id;
 if(e.target.dataset.xf){dbs.f[e.target.dataset.xf]=e.target.value;if(e.target.dataset.xf==='grp')dbs.kind='';dbs.lim=150;renderDBkeep();return}
 if(e.target.dataset.pr){if(dbs[e.target.dataset.pr]===e.target.value.trim())return;dbs[e.target.dataset.pr]=e.target.value.trim();dbs.lim=150;renderDBkeep();return}
 if(e.target.dataset.mtfile){const fs=[...e.target.files];e.target.value='';(async()=>{for(const f of fs)await mtLoad(f,e.target.dataset.mtfile)})();return}
 if(e.target.dataset.mtopt){const [kk,o]=e.target.dataset.mtopt.split('.');if(MT[kk]){MT[kk].opt[o]=e.target.checked;renderDB()}return}if(id==='dbtype')dbs.type=e.target.value;else if(id==='dbcat')dbs.cat=e.target.value;else if(id==='dbkind')dbs.kind=e.target.value;else if(id==='dbmine')dbs.mine=e.target.checked;else return;renderDBkeep()});

/* ---------- 맵툴 연동 (Lib:traits_multiple · Lib:item · Lib:pokemon) ---------- */
const MT={traits:null,item:null,pokemon:null,move:null};
const MT_INFO={traits:{lib:'Lib:traits_multiple',t:'특성 DB → 특성별 속성'},item:{lib:'Lib:item',t:'소지품 DB → 소지품별 속성'},pokemon:{lib:'Lib:pokemon',t:'list_trait_name · list_trait_effect · list_oldtype'},move:{lib:'Lib:skill',t:'기술 DB → 기술별 속성 · skill_meta · skill_info',re:/^lib:(moves?|skills?|waza|기술)$/i}};
const xesc=s=>String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&apos;');
const xun=s=>String(s).replace(/&(lt|gt|quot|apos|amp|#\d+|#x[0-9a-f]+);/gi,(m,a)=>a[0]==='#'?String.fromCodePoint(a[1]==='x'||a[1]==='X'?parseInt(a.slice(2),16):+a.slice(1)):({lt:'<',gt:'>',quot:'"',apos:"'",amp:'&'})[a.toLowerCase()]);
const mtTxt=s=>String(s??'').replace(/\r/g,'').replace(/\\n|\n/g,'<br>');
const mtSemi=s=>mtTxt(s).replace(/;/g,'；');
const mtProtected=k=>/^[A-Za-z0-9_\-]/.test(k)||/list$/i.test(k)||k==='entry_ment';
const mtGarbage=k=>(/[,;]/.test(k)&&k.length>30)||/[<>]/.test(k);
const KO=new Intl.Collator('ko');
function mtTraitNames(){return [...new Set(S.db.abil.map(r=>r[1]).filter(Boolean))].sort(KO.compare)}
function oldNames(){return [...new Set(S.db.old.filter(r=>r[1]&&r[10]!=='O').map(r=>r[1]))]}
function mvVal(r){const g=i=>String(r[i]??'').trim(),d=i=>g(i)||'-';let pw=g(7),nt=g(16);
 if(pw&&!/^-?\d+$/.test(pw)){nt='위력 '+pw+(nt&&nt!=='-'?' / '+nt:'');pw='0'}
 const t=g(5),en=!t||t==='-'?'':((typeInfo(t)||[])[3]||'');
 return mtTxt([g(2),d(5),d(6),pw||'-',d(8),d(9),d(10),d(11),d(12),d(13),d(14),d(15),nt||'-',d(17),en,g(18)||1,g(19)||1].join(';'))}
const pyJson=v=>Array.isArray(v)?'['+v.map(pyJson).join(', ')+']':v&&typeof v==='object'?'{'+Object.entries(v).map(([k,x])=>JSON.stringify(k)+': '+pyJson(x)).join(', ')+'}':JSON.stringify(v);
function itemVal(r){return (r[3]==='O'?'소모품/':'')+mtSemi(r[4])+';'+mtSemi(r[5])+';'+mtSemi(r[6])+';'}
function mtWant(kind){const m=new Map();
 if(kind==='traits')for(const r of S.db.abil){if(r[1]&&!m.has(r[1]))m.set(r[1],mtTxt(r[2]))}
 if(kind==='item')for(const r of S.db.items){if(r[1]&&!m.has(r[1]))m.set(r[1],itemVal(r))}
 if(kind==='move'){const meta={};for(const r of S.db.moves){if(r[2]&&!m.has(r[2])){m.set(r[2],mvVal(r));meta[r[2]]=[r[0],r[1],r[3],r[4]].map(x=>String(x??''))}}
  m.set('skill_meta',pyJson(meta));m.set('skill_info',pyJson({src:'망켓몬 캐릭터 제작기',n:Object.keys(meta).length}))}
 if(kind==='pokemon'){const n=mtTraitNames();m.set('list_trait_name',n.join(','));m.set('list_trait_effect',n.map(x=>mtSemi(idx.abil.get(x)[2])).join(';'));m.set('list_oldtype',JSON.stringify(oldNames()))}
 return m}
function mtStrings(){const it=S.db.items.filter(r=>r[1]);const w=mtWant('pokemon');
 return [['특성 이름 목록 · Lib:pokemon list_trait_name',w.get('list_trait_name')],['특성 효과 목록 · Lib:pokemon list_trait_effect',w.get('list_trait_effect')],
  ['소지품 이름 목록 (「;」 구분 · 소지품 DB 입력 매크로 이름 칸)',it.map(r=>r[1]).join(';')],['소지품 효과 목록 (「#」 구분 · 효과;소켓;비고;)',it.map(itemVal).join('#')],
  ['올드 타입 목록 · Lib:pokemon list_oldtype (메가진화 제외)',w.get('list_oldtype')],
  ['기술 목록 · Lib:skill 「데이터 입력」에 붙여넣기',[...new Map(S.db.moves.filter(r=>r[2]).map(r=>[r[2],r])).values()].map(mvVal).join('\n')]]}
function mtParse(xml){const a=xml.indexOf('<propertyMapCI>');if(a<0)return null;const s0=xml.indexOf('<store>',a),e=xml.indexOf('</store>',s0);if(s0<0||e<0)return null;const s=s0+7;
 const body=xml.slice(s,e);const re=/<entry>\s*<string>([^<]*)<\/string>\s*<net\.rptools\.CaseInsensitiveHashMap_-KeyValue>\s*<key>([^<]*)<\/key>(?:\s*<value class="string">([^<]*)<\/value>)?\s*<\/net\.rptools\.CaseInsensitiveHashMap_-KeyValue>\s*<\/entry>/g;
 const ents=[];let m;while((m=re.exec(body)))ents.push({a:m.index,b:re.lastIndex,str:m[1],key:xun(m[2]),val:m[3]==null?null:xun(m[3])});
 return {s,e,ents,ind:(body.match(/\n([ \t]*)<entry>/)||[0,'      '])[1]}}
function mtEntry(ind,key,val,str){const i2=ind+'  ',i3=ind+'    ';return `<entry>\n${i2}<string>${str!=null?str:xesc(key.toLowerCase())}</string>\n${i2}<net.rptools.CaseInsensitiveHashMap_-KeyValue>\n${i3}<key>${xesc(key)}</key>\n${i3}<value class="string">${xesc(val)}</value>\n${i2}</net.rptools.CaseInsensitiveHashMap_-KeyValue>\n${ind}</entry>`}
function mtCompare(kind){const T=MT[kind],want=mtWant(kind);const byK=new Map();for(const en of T.p.ents){const lk=en.key.toLowerCase();if(!byK.has(lk))byK.set(lk,en)}
 const add=[],chg=[];let same=0;for(const [k,v] of want){const en=byK.get(k.toLowerCase());if(!en)add.push(k);else if(en.val!==v)chg.push(k);else same++}
 const only=[],garbage=[];if(kind!=='pokemon'){const wl=new Set([...want.keys()].map(k=>k.toLowerCase()));for(const en of T.p.ents){if(mtGarbage(en.key))garbage.push(en.key);else if(!wl.has(en.key.toLowerCase())&&!mtProtected(en.key))only.push(en.key)}}
 return {want,tok:T.p.ents.length,same,add,chg,only,garbage}}
function mtBuildXml(kind){const T=MT[kind],c=mtCompare(kind);const wl=new Map();for(const [k,v] of c.want)wl.set(k.toLowerCase(),v);
 const chg=new Set(c.chg.map(k=>k.toLowerCase()));const del=new Set([...(T.opt.garbage?c.garbage:[]),...(T.opt.delOnly?c.only:[])]);
 const body=T.xml.slice(T.p.s,T.p.e);let out='',last=0;const done=new Set();
 for(const en of T.p.ents){const gap=body.slice(last,en.a);last=en.b;const lk=en.key.toLowerCase();
  if(del.has(en.key)){if(gap.trim())out+=gap;continue}
  out+=gap;if(chg.has(lk)&&!done.has(lk)){out+=mtEntry(T.p.ind,en.key,wl.get(lk),en.str);done.add(lk)}else out+=body.slice(en.a,en.b)}
 for(const k of c.add)out+='\n'+T.p.ind+mtEntry(T.p.ind,k,c.want.get(k));
 out+=body.slice(last);return {xml:T.xml.slice(0,T.p.s)+out+T.xml.slice(T.p.e),c,del:del.size}}
function loadJSZip(){return window.JSZip?Promise.resolve(window.JSZip):Promise.reject(new Error('nozip'))}
async function mtLoad(file,hint){let Z;try{Z=await loadJSZip()}catch(e){return toast('압축 라이브러리를 불러오지 못했습니다')}
 try{const zip=await Z.loadAsync(await file.arrayBuffer());const path=Object.keys(zip.files).find(n=>/(^|\/)content\.xml$/.test(n));if(!path)throw new Error('nocontent');
  const xml=await zip.file(path).async('string');mtSet(xml,{fileName:file.name,zip,path},hint)}catch(e){toast('rptok 파일을 읽지 못했습니다')}}
function mtSet(xml,o,hint){const name=xun((xml.match(/<name>([^<]*)<\/name>/)||[])[1]||'');
 const kind=Object.keys(MT_INFO).find(k=>MT_INFO[k].lib.toLowerCase()===name.toLowerCase()||(MT_INFO[k].re&&MT_INFO[k].re.test(name)))||(MT_INFO[hint]?hint:null);
 if(!kind){toast(`「${name||o.fileName}」은(는) 연동하는 라이브러리 토큰이 아닙니다`);return null}
 const p=mtParse(xml);if(!p){toast('토큰 속성을 찾지 못했습니다');return null}
 MT[kind]=Object.assign({name,xml,p,opt:{garbage:true,delOnly:false}},o);if(dbs.k==='mt')renderDB();toast(`${MT_INFO[kind].lib} 토큰을 읽었습니다 · 속성 ${p.ents.length}개`);return kind}
function mtCard(kind){const I=MT_INFO[kind],T=MT[kind];let body;
 if(!T)body=`<p class="small muted" style="margin:0">맵툴에서 「${I.lib}」 토큰을 오른쪽 클릭 → 「Save…」로 저장한 .rptok 파일을 올려 주세요.</p>`;
 else{const c=mtCompare(kind);const pk=kind==='pokemon';
  body=`<div class="small"><b>${esc(T.fileName)}</b> <span class="muted">· ${esc(T.name)}</span></div>
  <div class="mtstat"><span>DB에서 만든 항목</span><b class="num">${c.want.size}</b><span>토큰 속성 수</span><b class="num">${c.tok}</b><span>내용 같음</span><b class="num">${c.same}</b><span>새로 추가</span><b class="num ${c.add.length?'okc':''}">${c.add.length}</b><span>내용 변경</span><b class="num ${c.chg.length?'okc':''}">${c.chg.length}</b>${pk?'':`<span>토큰에만 있음</span><b class="num">${c.only.length}</b><span>잘못 들어간 목록형 키</span><b class="num ${c.garbage.length?'warn':''}">${c.garbage.length}</b>`}</div>
  ${c.add.length||c.chg.length?`<details><summary class="small">바뀌는 항목 ${c.add.length+c.chg.length}개 보기</summary><div class="small mtlist">${[...c.add.map(k=>'＋ '+k),...c.chg.map(k=>'～ '+k)].slice(0,400).map(esc).join('<br>')}</div></details>`:'<span class="small okc">DB와 토큰 내용이 같습니다.</span>'}
  ${pk?'':`${c.garbage.length?`<label class="row small"><input type="checkbox" data-mtopt="${kind}.garbage" ${T.opt.garbage?'checked':''}>잘못 들어간 목록형 키 ${c.garbage.length}개 지우기</label>`:''}
  ${c.only.length?`<label class="row small"><input type="checkbox" data-mtopt="${kind}.delOnly" ${T.opt.delOnly?'checked':''}>DB에 없는 항목 ${c.only.length}개 지우기 <span class="faint">(영문·…List 같은 매크로용 키는 제외)</span></label><details><summary class="small">토큰에만 있는 항목</summary><div class="small mtlist">${c.only.map(esc).join(', ')}</div></details>`:''}`}
  <div class="row"><button class="btn pri sm" data-mt="build" data-k="${kind}">갱신한 토큰 받기</button><button class="btn sm" data-mt="imp" data-k="${kind}" title="토큰에만 있는 항목을 이 제작기 DB로 가져옵니다">토큰 → DB 가져오기</button></div>`}
 return `<div class="panel"><h3>${I.lib}</h3><span class="small muted" style="margin-top:-6px">${I.t}</span>${body}<div class="row"><label class="btn sm ${T?'ghost':''}" for="mtf-${kind}">${T?'다른 파일 올리기':'토큰 파일 올리기'}</label><input type="file" id="mtf-${kind}" data-mtfile="${kind}" accept=".rptok,.zip" hidden></div></div>`}
function mtPanel(){return `<div class="panel" style="margin-bottom:10px"><h3>맵툴 라이브러리 토큰 갱신<span class="sp"></span><label class="btn pri sm" for="mtf-all">토큰 파일 한꺼번에 올리기</label><input type="file" id="mtf-all" data-mtfile="auto" accept=".rptok,.zip" multiple hidden></h3>
 <p class="small muted" style="margin:0">맵툴에서 라이브러리 토큰을 .rptok으로 저장해 올리면, 이 제작기의 특성·소지품·올드 타입·기술 DB로 토큰 속성을 고친 새 토큰 파일을 만들어 줍니다. 토큰 이름(Lib:…)을 읽어 알맞은 칸에 자동으로 들어갑니다. 받은 파일을 맵툴 맵에 끌어다 놓고 예전 라이브러리 토큰을 지우면 갱신이 끝납니다. 매크로·이미지·다른 속성은 그대로 둡니다.</p></div>
 <div class="mtgrid">${Object.keys(MT_INFO).map(mtCard).join('')}</div>
 <div class="panel" style="margin-top:10px"><h3>문자열 직접 복사<span class="small muted" style="font-weight:400">토큰 파일 없이 맵툴의 DB 입력 매크로에 붙여넣을 때</span></h3><div class="exgrid">${dbs.ex.map(([l,v],n)=>`<div><div class="row"><b class="small">${esc(l)}</b><span class="sp"></span><span class="small faint num">${v.length.toLocaleString()}자</span><button class="btn sm" data-copyex="${n}">복사</button></div><textarea readonly>${esc(v.length>20000?v.slice(0,20000)+' …(복사 버튼을 쓰세요)':v)}</textarea></div>`).join('')}</div></div>`}
async function saveBlob(name,blob,alt){
 try{if(window.claude&&claude.use){const d=await claude.use('downloads');if(d){try{await d.save({filename:name,data:blob});return 'ok'}catch(e){if(e&&e.code==='declined')return 'declined';if(!alt)throw e;await d.save({filename:alt,data:blob});return 'alt'}}}}catch(e){if(e&&e.code==='declined')return 'declined'}
 try{const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=name;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(a.href),4000);return 'ok'}catch(e){return 'fail'}}
async function mtDownload(kind){const T=MT[kind];if(!T)return;const {xml,c,del}=mtBuildXml(kind);
 if(!c.add.length&&!c.chg.length&&!del)return toast('바뀐 내용이 없습니다');
 if(!T.zip)return toast('압축 파일 정보가 없습니다');
 T.zip.file(T.path,xml);const blob=await T.zip.generateAsync({type:'blob',compression:'DEFLATE',mimeType:'application/octet-stream'});
 const base=String(T.fileName||MT_INFO[kind].lib.replace(':','_')).replace(/\.(rptok|zip)$/i,'');const r=await saveBlob(base+'.rptok',blob,base+'.rptok.zip');
 if(r==='alt')toast('.rptok 저장이 막혀 .zip으로 받았습니다 · 끝의 .zip을 지우고 맵툴에 넣으세요');else if(r==='ok')toast(`추가 ${c.add.length} · 변경 ${c.chg.length}${del?` · 삭제 ${del}`:''} — 토큰을 만들었습니다`);else if(r==='fail')toast('이 화면에서는 파일 저장을 할 수 없습니다')}
async function mtImport(kind){const T=MT[kind];if(!T)return;let rows=[],dk=kind==='item'?'items':kind==='move'?'moves':'abil';
 if(kind==='pokemon'){const g=k=>{const e=T.p.ents.find(x=>x.key.toLowerCase()===k);return e&&e.val||''};const n=g('list_trait_name').split(','),ef=g('list_trait_effect').split(';');
  if(n.length!==ef.length)return toast('list_trait_name과 list_trait_effect의 개수가 달라 가져올 수 없습니다');n.forEach((k,i)=>{if(k.trim())rows.push([k.trim(),ef[i]])})}
 else for(const en of T.p.ents)if(en.val!=null&&!mtGarbage(en.key)&&!mtProtected(en.key))rows.push([en.key,en.val]);
 const br=v=>String(v).replace(/<br\s*\/?>/gi,'\n');
 const parseItem=v=>{const c=v.startsWith('소모품/');const p=(c?v.slice(4):v).split(';');return {c,eff:br(p[0]||''),sock:p[1]||'',note:p[2]||''}};
 const isNew=([k])=>!idx[dk].has(k);
 const mvF=v=>{const f=br(v).split(';').map(x=>x.trim());while(f.length<17)f.push('');return f};
 const tmeta=(()=>{if(kind!=='move')return {};const e=T.p.ents.find(x=>x.key==='skill_meta');try{return e&&e.val?JSON.parse(e.val):{}}catch(_){return {}}})();
 const mvRow=(k,f,old)=>{const r=old||[String(3),'#오리지널, #가져옴',k,'','','','','','','','','','','','','','','','',''];[5,6,7,8,9,10,11,12,13,14,15,16,17].forEach((c,j)=>r[c]=f[j+1]);
  const pm=/^위력 (.+?)(?: \/ (.*))?$/.exec(r[16]);if(r[7]==='0'&&pm){r[7]=pm[1];r[16]=pm[2]||'-'}r[18]=f[15];r[19]=f[16];
  const mm=tmeta[k];if(Array.isArray(mm)){if(mm[0]!=null)r[0]=String(mm[0]);if(mm[1])r[1]=String(mm[1]);if(mm[2]!=null)r[3]=String(mm[2]);if(mm[3]!=null)r[4]=String(mm[3])}return r};
 const differs=([k,v])=>{const r=idx[dk].get(k);if(!r)return false;if(dk==='moves')return mvVal(r)!==v;return dk==='abil'?(kind==='pokemon'?mtSemi(r[2]):mtTxt(r[2]))!==v:itemVal(r)!==v};
 const nNew=rows.filter(isNew).length,nDiff=rows.filter(differs).length;
 if(!nNew&&!nDiff)return toast('가져올 항목이 없습니다');
 const m=await new Promise(res=>{const l=openModal(`<div class="mhead"><h2>토큰 → DB 가져오기</h2></div><div class="mbody"><p style="margin:0">${esc(T.name)}에서 DB에 없는 항목 <b>${nNew}</b>개, 내용이 다른 항목 <b>${nDiff}</b>개를 찾았습니다.</p><p class="small muted" style="margin:0">가져온 새 항목은 「오리지널」로 표시됩니다.${dk==='abil'?' 특성 소켓 값은 비어 있으니 DB에서 채워 주세요.':''}</p></div><div class="mfoot"><button class="btn" data-m="">취소</button><span class="sp"></span><button class="btn" data-m="new" ${nNew?'':'disabled'}>새 항목만 추가</button><button class="btn acc" data-m="all">다른 내용도 토큰 값으로 덮어쓰기</button></div>`,{onClose:()=>res('')});l.addEventListener('click',e=>{const v=e.target.dataset.m;if(v==null)return;layers[layers.length-1].onClose=null;closeModal();res(v)})});
 if(!m)return;let add=0,chg=0;
 for(const row of rows){const [k,v]=row;
  if(isNew(row)){if(dk==='moves')S.db.moves.push(mvRow(k,mvF(v)));else if(dk==='abil')S.db.abil.push(['',k,br(v),'X','X']);else{const p=parseItem(v);S.db.items.push(['기타',k,'',p.c?'O':'-',p.eff,p.sock,p.note])}if(!S.custom[dk].includes(k))S.custom[dk].push(k);add++;reindex()}
  else if(m==='all'&&differs(row)){const r=idx[dk].get(k);if(dk==='moves')mvRow(k,mvF(v),r);else if(dk==='abil')r[2]=br(v);else{const p=parseItem(v);r[3]=p.c?'O':(r[3]==='O'?'-':r[3]);r[4]=p.eff;r[5]=p.sock;r[6]=p.note}chg++}}
 reindex();save(true);renderDB();toast(`DB에 추가 ${add} · 덮어쓰기 ${chg}`)}

/* ---------- 렌더: 테이블 ---------- */
function rulesPanels(){const R=RULES(),I=R.invest;const inp=(k,l,w,ph)=>`<label class="row small" style="gap:4px">${l}<input data-p="db.rules.invest.${k}" value="${esc(I[k]??'')}" style="width:${w||'56px'}" ${ph?`placeholder="${esc(ph)}"`:''}></label>`;
 return `<div class="panel" style="grid-column:1/-1"><h3>룰 상수 · 자질 투자 규칙<span class="sp"></span><button class="btn sm" data-tact="ruInvReset">기본값</button></h3>
  <p class="small muted" style="margin:0 0 6px">기본·능력치 탭 「자질」의 투자 점검에 쓰입니다. 자질 이름은 지시·육성·통솔·능력, 여러 개는 쉼표, 조합은 「+」로 적습니다.</p>
  <div class="row" style="gap:14px;flex-wrap:wrap">${inp('allow','투자 횟수 (기본)')}${inp('allowD','「D」 조정 시 투자 횟수')}${inp('dMax','「D」로 내릴 수 있는 자질 수')}${inp('dPair','「D」 조정 시 합산 제한 자질','110px','육성+통솔')}${inp('dPairMax','그 합 상한')}${inp('banPair','「A」 이상 동시 금지 조합','150px','육성+능력')}${inp('banAA','「AA」 금지 자질','120px','육성,통솔')}</div></div>
 <div class="panel" style="grid-column:1/-1"><h3>룰 상수 · 고유·전용 포텐셜 개수<span class="sp"></span><button class="btn sm" data-tact="ruAbilAdd">+ 행</button><button class="btn sm" data-tact="ruAbilReset">기본값</button></h3>
  <p class="small muted" style="margin:0 0 6px">능력 랭크별 『고유 포텐셜』 칸 수와 전용 포텐셜 개수입니다. 「고유 칸 수」만큼 트레이너에 빈 고유 칸이 생기고, 전용 개수는 포켓몬 시트의 점검에 쓰입니다. 1인 기준 (2체) 트레이너는 오른쪽 두 칸을 씁니다.</p>
  <div class="tw"><table><tr><th>능력 랭크</th><th class="n">고유 칸 수</th><th>고유 표시</th><th class="n">전용 개수</th><th>전용 설명</th><th class="n">1인 전용</th><th>1인 전용 설명</th><th></th></tr>${R.abil.map((r,i)=>`<tr>${[0,1,2,3,4,5,6].map(j=>`<td${j===1||j===3||j===5?' class="n"':''}><input data-p="db.rules.abil.${i}.${j}" value="${esc(r[j]??'')}" style="width:${j===0?'56px':j===1||j===3||j===5?'52px':'100%'};${j===4||j===6?'min-width:200px':j===2?'min-width:110px':''}"></td>`).join('')}<td><button class="btn sm ghost danger" data-tact="ruAbilDel" data-i="${i}">×</button></td></tr>`).join('')}</table></div></div>
 <div class="panel" style="grid-column:1/-1"><h3>룰 상수 · 타입 상성표 (PT 일관성)<span class="sp"></span><button class="btn sm" data-tact="ruTyAdd">+ 타입</button><button class="btn sm" data-tact="ruTyReset">기본값</button></h3>
  <p class="small muted" style="margin:0 0 6px">타입 배분 탭의 공통 약점 · 못 막는 타입 계산에만 쓰입니다. 공격 타입마다 효과가 굉장한 / 별로인 / 없는 방어 타입을 쉼표로 적습니다.</p>
  <div class="tw" style="max-height:420px;overflow:auto"><table><tr><th>공격 타입</th><th>2배</th><th>1/2배</th><th>무효</th><th></th></tr>${R.ty.map((r,i)=>`<tr>${[0,1,2,3].map(j=>`<td><input data-p="db.rules.ty.${i}.${j}" value="${esc(r[j]??'')}" style="width:${j===0?'72px':'100%'};${j?'min-width:150px':''}"></td>`).join('')}<td><button class="btn sm ghost danger" data-tact="ruTyDel" data-i="${i}">×</button></td></tr>`).join('')}</table></div></div>`}
function roTable(title,head,rows){return `<div class="panel"><h3>${title}</h3><div class="tw" style="max-height:360px;overflow:auto"><table><tr>${head.map(h=>`<th>${h}</th>`).join('')}</tr>${rows.map(r=>`<tr>${r.map(x=>`<td class="num">${esc(x)}</td>`).join('')}</tr>`).join('')}</table></div></div>`}
function renderTbl(){$('#v-tbl').innerHTML=`<div class="intro"><h1>테이블·계산식</h1><p>시트 「테이블(더블)」의 계산 규칙과 랭크 템플릿, 포텐셜 태그 사전입니다. 템플릿과 태그 사전은 여기서 고치면 바로 적용됩니다.</p></div>
 <div class="cgrid">
 <div class="panel" style="grid-column:1/-1" id="banBox">${banBoxHTML()}</div>
 <div class="panel" style="grid-column:1/-1"><h3>실수치 계산식 · 테이블(더블) Q198:Q203</h3><div class="formula">레벨 = 육성 랭크 레벨(랭크→레벨 표 D열) + 분배 레벨<br>HP = ⌊ ⌊종족치 × 2 + 개체치 + 노력치/4⌋ × 레벨/100 ⌋ + 10 + 레벨<br>그 외 = ⌊ ( ⌊ ⌊종족치 × 2 + 개체치 + 노력치/4⌋ × 레벨/100 ⌋ + 5 ) × 성격 보정 ⌋<br><span class="faint">이 제작기는 개체치·노력치·성격을 쓰지 않으므로 각각 0 · 0 · 1.0으로 계산합니다. 복사용 텍스트의 노력치 칸은 빈칸으로 유지됩니다.</span></div></div>
 <div class="panel" style="grid-column:1/-1"><h3>랭크별 기초 템플릿<span class="sp"></span><button class="btn sm" data-tact="tplAdd">+ 행</button><button class="btn sm" data-tact="tplReset">기본값</button></h3>
  <p class="small muted" style="margin:0 0 6px">자질 랭크를 바꾸면 해당 자질의 행이 트레이너 포인트 기본값에 자동으로 들어갑니다. 「공통 / *」 행은 새 트레이너와 「템플릿 다시 적용」 때 들어갑니다. 트레이너의 「1인 기준 (2체)」가 켜져 있으면 「값 (1인)」을, 꺼져 있으면 「값 (6체)」를 씁니다. 1인 값은 룰북 「1인 기준 (2체)」 장의 시안이 기본값으로 들어가 있고, 빈 칸은 다시 열 때 기본값(없으면 6체 값)으로 채워집니다. 비고가 「추정」「시안」인 값은 룰북을 보고 맞춰 주세요.</p>
  <div class="tw"><table><tr><th>자질</th><th>랭크</th><th>항목</th><th class="n">값 (6체)</th><th class="n">값 (1인)</th><th class="n" title="비워 두면 6체 값 × 비율(아래 「1인 기준 (3체)」)로 계산">값 (3체)</th><th>비고</th><th></th></tr>${S.db.tpl.map((r,i)=>`<tr><td>${sel(`db.tpl.${i}.0`,r[0],['공통',...QUAL],{style:'width:76px'})}</td><td><input data-p="db.tpl.${i}.1" value="${esc(r[1])}" style="width:60px"></td><td><input data-p="db.tpl.${i}.2" value="${esc(r[2])}" list="L-tplitems"></td><td class="n"><input data-p="db.tpl.${i}.3" value="${esc(r[3])}" inputmode="decimal" style="width:60px"></td><td class="n"><input data-p="db.tpl.${i}.5" value="${esc(r[5]??'')}" inputmode="decimal" style="width:60px"></td><td class="n"><input data-p="db.tpl.${i}.6" value="${esc(r[6]??'')}" inputmode="decimal" style="width:60px" placeholder="${esc(String(s3val(r[3],r[5])))}" title="비워 두면 자동 (${esc(String(s3val(r[3],r[5])))})"></td><td><input data-p="db.tpl.${i}.4" value="${esc(r[4])}"></td><td><button class="btn sm ghost danger" data-tact="tplDel" data-i="${i}" aria-label="삭제">✕</button></td></tr>`).join('')}</table></div>
  <datalist id="L-tplitems">${ptItems().map(r=>`<option value="${esc(r[0])}">`).join('')}</datalist></div>
 ${prideRulePanel()}
 <div class="panel" style="grid-column:1/-1"><h3>트레이너 포인트 항목<span class="sp"></span><button class="btn sm" data-tact="ptiAdd">+ 항목</button><button class="btn sm" data-tact="ptiApply" title="모든 트레이너의 기본값을 이 표와 랭크 템플릿으로 다시 맞춥니다">모든 트레이너에 적용</button><button class="btn sm" data-tact="ptiReset">기본값</button></h3>
  <p class="small muted" style="margin:0 0 6px">캐릭터 시트의 「포인트」 표에 나오는 항목입니다. 기본값은 새 트레이너에 들어가고, 자질 랭크에 따라 바뀌는 값은 아래 「랭크별 기초 템플릿」이 덮어씁니다. 이름을 바꾸면 모든 트레이너의 같은 항목 이름도 함께 바뀝니다.</p>
  <div class="tw"><table><tr><th>항목 이름</th><th class="n">기본값</th><th>자동 소모</th><th></th></tr>${ptItems().map((r,i)=>`<tr><td><input data-pti="${i}.0" value="${esc(r[0])}"></td><td class="n"><input data-pti="${i}.1" value="${esc(r[1])}" inputmode="decimal" style="width:64px"></td><td><select data-pti="${i}.2">${Object.entries(PTI_AUTO).map(([v,l])=>`<option value="${v}" ${(r[2]||'')===v?'selected':''}>${esc(l)}</option>`).join('')}</select></td><td><button class="btn sm ghost danger" data-tact="ptiDel" data-i="${i}" aria-label="삭제">✕</button></td></tr>`).join('')}</table></div></div>
 <div class="panel" style="grid-column:1/-1"><h3>소지품 해금 표<span class="sp"></span><button class="btn sm" data-tact="ilAdd">+ 장소</button></h3>
  <p class="small muted" style="margin:0 0 6px">비워 두면 모든 소지품이 「기본」입니다. 장소마다 특제 품목을 쉼표로 적고, 조건이 채워지면 「열림」으로 바꾸세요. 소지품 검색 창에 잠김·열림 표시와 「해금」「장소」 필터가 생기고, 포켓몬 시트의 소지품 칸에도 표시됩니다.</p>
  <div class="tw"><table><tr><th>장소</th><th>특제 품목 (쉼표)</th><th>해금 조건</th><th>상태</th><th></th></tr>${(S.db.ilock||[]).map((r,i)=>`<tr><td><input data-p="db.ilock.${i}.0" value="${esc(r[0])}" style="width:150px"></td><td><input data-p="db.ilock.${i}.1" value="${esc(r[1])}" list="L-inames" style="width:100%;min-width:280px"></td><td><input data-p="db.ilock.${i}.2" value="${esc(r[2])}" style="min-width:200px"></td><td>${sel(`db.ilock.${i}.3`,r[3]||'잠김',['잠김','열림'],{style:'width:76px'})}</td><td><button class="btn sm ghost danger" data-tact="ilDel" data-i="${i}" aria-label="삭제">✕</button></td></tr>`).join('')}</table></div>
  <datalist id="L-inames">${S.db.items.filter(r=>r[1]).map(r=>`<option value="${esc(r[1])}">`).join('')}</datalist></div>
 <div class="panel" style="grid-column:1/-1"><h3>기술 소켓 규칙</h3><div class="row"><label class="row small" for="oldsock">『올드 타입』 계열(${OLDK.map(esc).join('·')})의 PT 기술점<input id="oldsock" data-p="db.oldSock" value="${esc(S.db.oldSock??5.5)}" inputmode="decimal" style="width:64px"></label><span class="small muted">룰북: 기술 4개만 익히고 PT 전체 기술 소켓에서 고정 5.5점 소모 · 「기술 할인」을 체크하면 교배기·유전기 1개 습득</span></div>
  <div class="row" style="margin-top:8px;gap:14px"><span class="small"><b>1인 기준 (2체) PT 기술점</b> · 육성 랭크별</span>${['D','C','B','A'].map(r=>`<label class="row small" style="gap:4px">${r}<input data-p="db.soloSock.${r}" value="${esc((S.db.soloSock||{})[r]??'')}" inputmode="decimal" style="width:56px"></label>`).join('')}<span class="small muted">룰북 「1인 기준 (2체)」 장 시안 · 6체 기준(32 / 34 / 35.5 / 37)의 1/3</span></div>
  <div class="row" style="margin-top:8px;gap:14px">${(()=>{const R=RULES();if(!R.soloOrd)R.soloOrd=clone(SOLO_ORD_DEF);return `<span class="small"><b>1인 기준 (2체) 지시 고르기</b> · 트레이너가 고르는 수</span><label class="row small" style="gap:4px">ORDER (4식 중)<input data-p="db.rules.soloOrd.o" value="${esc(R.soloOrd.o??'')}" inputmode="numeric" style="width:48px">개</label><label class="row small" style="gap:4px">COMMAND (6령 중)<input data-p="db.rules.soloOrd.c" value="${esc(R.soloOrd.c??'')}" inputmode="numeric" style="width:48px">개</label><span class="small muted">「1인 기준 (2체)」을 켠 트레이너는 시트의 지시 체계에서 이만큼만 골라 쓴다 · 고르지 않은 항목은 0회</span>`})()}</div>
  <div class="row" style="margin-top:8px;gap:12px;flex-wrap:wrap">${(()=>{const R=RULES();if(!R.solo3)R.solo3=clone(SOLO3_DEF);const Q=R.solo3;const inp3=(k,w,lab,mode)=>`<label class="row small" style="gap:4px">${lab}<input data-p="db.rules.solo3.${k}" value="${esc(Q[k]??'')}" inputmode="${mode||'decimal'}" style="width:${w}px"></label>`;
   return `<span class="small"><b>1인 기준 (3체)</b> · 6체 기준 자원 × 비율</span>${inp3('ratio',52,'비율')}${inp3('unit',48,'템플릿 단위')}<label class="row small" style="gap:4px">맞춤<select data-p="db.rules.solo3.round">${[['ceil','올림'],['round','반올림'],['floor','내림']].map(([v,l])=>`<option value="${v}" ${Q.round===v?'selected':''}>${l}</option>`).join('')}</select></label>${inp3('ptUnit',48,'PT 기술점 단위')}<label class="row small" style="gap:4px">2체와 6체가 같은 항목은 그대로<select data-p="db.rules.solo3.keep"><option value="1" ${Q.keep==='1'?'selected':''}>예</option><option value="0" ${Q.keep!=='1'?'selected':''}>아니오</option></select></label>${inp3('partner',40,'파트너','numeric')}${inp3('o',40,'ORDER 고르기','numeric')}${inp3('c',40,'COMMAND 고르기','numeric')}
    <span class="small muted" style="flex-basis:100%">예: 통솔 C 통솔점 6 → ${s3val(6,'')} · PT 기술점 육성 C ${(sockRow('C')||[])[4]??'?'} → ${s3num((+((sockRow('C')||[])[4])||0)*(+Q.ratio||0.5),'ptUnit')} · 【1/시】 3 → ${s3val(3,'1')} · 파트너 할인은 파트너에게만(6체와 같음). 「랭크별 기초 템플릿」의 「값 (3체)」에 숫자를 넣으면 그 값이 먼저다.</span>`})()}</div></div>
 <div class="panel" style="grid-column:1/-1"><h3>포켓몬 시트 템플릿<span class="sp"></span><button class="btn sm" data-tact="stplAll" title="모든 트레이너의 포켓몬 시트에서 빠진 템플릿 포텐셜만 빈 슬롯에 넣습니다 (와일드 역할은 건너뜀)">모든 포켓몬에 적용</button><button class="btn sm" data-tact="stplAdd">+ 행</button><button class="btn sm" data-tact="stplReset">기본값</button></h3>
  <p class="small muted" style="margin:0 0 6px">새 포켓몬 시트를 만들 때와 「시트 템플릿 적용」을 누를 때 들어가는 포텐셜입니다. 자질이 「기본」인 행은 항상, 나머지는 트레이너의 해당 자질이 그 랭크일 때 추가됩니다. 랭크는 「B」라고 쓰면 B 이상, 「C~B」처럼 쓰면 그 범위만입니다. 같은 이름이 여러 행이면 아래 행이 이깁니다.<br><b>대상</b> · 「전원」 「파트너」 「N체」(트레이너 포켓몬 중 N체까지) 「파트너 N체」. 「2체/1체」처럼 「/」로 나누면 1인 기준(2체) 트레이너는 뒤쪽을 씁니다. 1인 기준에서는 2체 모두 파트너로 봅니다.<br>같은 큰 종류(역할·종족 등)가 이미 채워져 있으면 그만큼 빼고 넣습니다. 『전용』은 능력 랭크에 따라 「+ 전용 칸」으로 따로 넣습니다.</p>
  <div class="tw"><table><tr><th>자질</th><th>랭크</th><th>종류(순서)</th><th>포텐셜 이름</th><th>대상</th><th>비고</th><th></th></tr>${(S.db.stpl||[]).map((r,i)=>`<tr><td>${sel(`db.stpl.${i}.0`,r[0],['기본',...QUAL],{style:'width:76px'})}</td><td><input data-p="db.stpl.${i}.1" value="${esc(r[1])}" style="width:60px" ${r[0]==='기본'?'disabled placeholder="-"':'placeholder="B · C~B"'}></td><td><input data-p="db.stpl.${i}.2" value="${esc(r[2])}" list="L-stplk" style="width:120px"></td><td><input data-p="db.stpl.${i}.3" value="${esc(r[3])}" list="L-stpln"></td><td><input data-p="db.stpl.${i}.5" value="${esc(r[5]??'')}" list="L-stplt" placeholder="전원" style="width:92px"></td><td><input data-p="db.stpl.${i}.4" value="${esc(r[4])}"></td><td><button class="btn sm ghost danger" data-tact="stplDel" data-i="${i}" aria-label="삭제">✕</button></td></tr>`).join('')}</table></div>
  <datalist id="L-stplt">${['전원','파트너','1체','2체','파트너 1체','파트너 2체','2체/1체','4체/전원'].map(k=>`<option value="${k}">`).join('')}</datalist><datalist id="L-stplk">${[...new Set(S.db.pots.map(r=>r[0]))].map(k=>`<option value="${esc(k)}">`).join('')}</datalist><datalist id="L-stpln">${S.db.pots.filter(r=>/포텐셜|○/.test(r[1])).map(r=>`<option value="${esc(r[1])}">`).join('')}</datalist></div>
 ${rulesPanels()}
 <div class="panel" style="grid-column:1/-1"><h3>포텐셜 태그 사전<span class="sp"></span><button class="btn sm" data-tact="tagAdd">+ 태그</button><button class="btn sm" data-tact="tagReset">기본값</button></h3>
  <p class="small muted" style="margin:0 0 6px">포텐셜·특성 편집 창의 태그 버튼이 이 목록으로 만들어집니다. 변형은 「|」로 구분하면 버튼을 눌렀을 때 고를 수 있습니다.</p>
  <div class="tw"><table><tr><th>태그</th><th>설명</th><th>변형 (| 구분)</th><th></th></tr>${S.db.tags.map((r,i)=>`<tr><td><input data-p="db.tags.${i}.0" value="${esc(r[0])}" style="width:110px"></td><td><input data-p="db.tags.${i}.1" value="${esc(r[1])}" style="width:100%;min-width:260px"></td><td><input data-p="db.tags.${i}.2" value="${esc(r[2])}" style="min-width:200px"></td><td><button class="btn sm ghost danger" data-tact="tagDel" data-i="${i}" aria-label="삭제">✕</button></td></tr>`).join('')}</table></div></div>
 ${roTable('소켓 등급표 · B103:H110',['등급','종족치 480','525','570','최대치','개인치','기술 소켓 상한'],S.db.sock)}
 ${roTable('랭크 → 레벨 · B112:E133',['랭크','C열','레벨','E열'],S.db.lvl)}
 ${roTable('종족치 등급 · B149:C175',['이상','등급'],S.db.grade)}
 ${roTable('타입',['타입','색','글자','영문'],S.db.types)}
 </div>`}
$('#v-tbl').addEventListener('input',e=>{const pt=e.target.dataset.pti;if(pt){const [i,c]=pt.split('.').map(Number);if(c===1){S.db.ptItems[i][1]=e.target.value;save(true)}return}const p=e.target.dataset.p;if(!p)return;const[o,k]=getRef(p);o[k]=e.target.value;save(true)});
$('#v-tbl').addEventListener('change',e=>{const pt=e.target.dataset.pti;if(pt){const [i,c]=pt.split('.').map(Number);const row=S.db.ptItems[i];
  if(c===0){const old=row[0],nw=e.target.value.trim();if(!nw||nw===old){e.target.value=old;return}if(S.db.ptItems.some((r,j)=>j!==i&&r[0]===nw)){toast('같은 이름의 항목이 있습니다');e.target.value=old;return}
   row[0]=nw;for(const t of S.trainers){if(old in t.base){t.base[nw]=t.base[old];delete t.base[old]}if(t.extra&&old in t.extra){t.extra[nw]=t.extra[old];delete t.extra[old]}}for(const r of S.db.tpl)if(r[2]===old)r[2]=nw;save();toast('항목 이름을 바꿨습니다')}
  else if(c===2)row[2]=e.target.value;else row[1]=e.target.value;save(true);return}if(e.target.dataset.p){save(true);if(/^db\.stpl\.\d+\.0$/.test(e.target.dataset.p))renderTbl()}});
/* 금지어 칸 */
$('#v-tbl').addEventListener('click',async e=>{const b=e.target.closest('[data-bw]');if(!b)return;const k=b.dataset.bw,i=+b.dataset.i;const L=banList();
 if(k==='add'){const inp=$('#banNew');const ws=inp.value.split(/[,，\n]/).map(x=>x.trim()).filter(Boolean);if(!ws.length)return toast('금지어를 적어 주세요');const have=new Set(L.map(x=>x.w));const nw=ws.filter(w=>!have.has(w));if(!nw.length)return toast('이미 있는 금지어입니다');banSet([...L,...nw.map(w=>({w}))]);inp.value='';banRefresh();toast(`금지어 ${nw.length}개 추가`);return}
 if(k==='del'){const w=L[i]&&L[i].w;if(!w)return;L.splice(i,1);banSet(L);BANED=-1;banRefresh();toast(`「${w}」 금지어를 뺐습니다`);return}
 if(k==='ed'){BANED=i;banRefresh();return}
 if(k==='edx'){BANED=-1;banRefresh();return}
 if(k==='edok'){const v=($('#banEd')||{}).value;const w=String(v||'').trim();if(!w){BANED=-1;return banRefresh()}if(L.some((x,j)=>j!==i&&x.w===w))return toast('이미 있는 금지어입니다');const old=L[i].w;L[i]=old===w?L[i]:{w};banSet(L);BANED=-1;banRefresh();if(old!==w)toast(`「${old}」 → 「${w}」`);return}
 if(k==='reset'){if(!await ask('금지어를 룰 시트 기본 목록으로 되돌릴까요? 추가하거나 고친 것은 사라집니다.','되돌리기'))return;S.db.ban=DEF.ban||'';save(true);BANED=-1;banRefresh();toast('기본 목록으로 되돌렸습니다');return}
 if(k==='scan'){const R=banScan();const o=$('#banScanOut');o.classList.toggle('muted',!R.length);o.innerHTML=R.length?`<b class="warn">${R.length}곳에서 걸렸습니다</b><ul class="banhits">${R.map(r=>`<li><b>${esc(r.t)}</b> · ${esc(r.p)} · 『${esc(r.n)}』 — <span class="warn">${r.h.map(esc).join(', ')}</span><div class="faint">${banMark(r.eff).replace(/\\n|\n/g,' / ')}</div></li>`).join('')}</ul>`:'<span class="okc">저장된 캐릭터에는 금지어가 없습니다</span>';return}});
/* 10-22 망령: 한글 조합 중에 다시 그리면 자모가 쪼개진다 (ㄱㅗㅇ…) — 조합이 끝난 뒤에 */
$('#v-tbl').addEventListener('compositionend',e=>{if(e.target.id==='banQ'){BANQ=e.target.value;banRefresh(true)}});
$('#v-tbl').addEventListener('input',e=>{const id=e.target.id;if(id==='banQ'){BANQ=e.target.value;if(e.isComposing)return;banRefresh(true);return}
 if(id==='banTest'){const v=e.target.value;const h=banHits(v);$('#banTestOut').innerHTML=!v.trim()?'':h.length?`<span class="warn">걸림: ${h.map(esc).join(', ')}</span><div class="bantest">${banMark(v).replace(/\n/g,'<br>')}</div>`:'<span class="okc">걸리는 금지어가 없습니다</span>'}});
$('#v-tbl').addEventListener('keydown',e=>{if(e.isComposing)return;if(e.target.id==='banNew'&&e.key==='Enter'){e.preventDefault();$('[data-bw="add"]').click()}if(e.target.id==='banEd'){if(e.key==='Enter'){e.preventDefault();$('[data-bw="edok"]').click()}if(e.key==='Escape'){BANED=-1;banRefresh()}}});
$('#v-tbl').addEventListener('change',e=>{if(e.target.id==='banRawTa'){BANED=-1;const t=$('#banBox details');const open=t&&t.open;banRefresh();const t2=$('#banBox details');if(t2&&open)t2.open=true}});
$('#v-tbl').addEventListener('click',async e=>{const b=e.target.closest('[data-tact]');if(!b)return;const a=b.dataset.tact,i=+b.dataset.i;
 if(a==='tplAdd')S.db.tpl.push(['지시','C','','','','']);if(a==='tplDel')S.db.tpl.splice(i,1);
 if(a==='prReset'){if(!await ask('종족치 · 프라이드 규칙을 룰북 기본값으로 되돌릴까요?','되돌리기'))return;S.db.pride=clone(PRIDE_DEF);S.db.prideExV=1}
 if(a==='prRowAdd'){prideMigrate(S.db);S.db.pride.rows.push(['','','','','1',''])}
 if(a==='prRowDel'){prideMigrate(S.db);S.db.pride.rows.splice(i,1)}
 if(a==='ptiAdd'){let n='새 항목',k=2;while(S.db.ptItems.some(r=>r[0]===n))n='새 항목 '+(k++);S.db.ptItems.push([n,'0',''])}
 if(a==='ptiDel'){const n=S.db.ptItems[i][0];if(!await ask(`포인트 항목 「${esc(n)}」을(를) 지울까요? 트레이너에 적힌 값도 함께 지워집니다.`,'삭제'))return;S.db.ptItems.splice(i,1);for(const t of S.trainers)delete t.base[n];save()}
 if(a==='ptiReset'){if(!await ask('포인트 항목을 기본값으로 되돌릴까요?','되돌리기'))return;S.db.ptItems=clone(PTI_DEF)}
 if(a==='ptiApply'){if(!await ask('모든 트레이너의 포인트 기본값을 이 표와 랭크 템플릿 값으로 덮어쓸까요?','적용',false))return;for(const t of S.trainers){for(const [n,d] of ptItems())t.base[n]=+d||0;applyTpl(t)}save();toast('모든 트레이너에 적용했습니다')}
 if(a==='ilAdd'){S.db.ilock=S.db.ilock||[];S.db.ilock.push(['','','','잠김'])}if(a==='ilDel')S.db.ilock.splice(i,1);
 if(a==='stplAdd')S.db.stpl.push(['육성','B','','','','전원']);
 if(a==='stplAll'){if(!await ask('모든 트레이너의 포켓몬 시트에 템플릿을 적용할까요? 빈 슬롯에 빠진 포텐셜만 넣고, 이미 적힌 포텐셜은 건드리지 않습니다. 와일드 역할 포켓몬은 건너뜁니다.','적용',false))return;const [n,k]=stplApplyAll();save(true);renderTbl();toast(n?`포켓몬 ${k}체에 포텐셜 ${n}개를 넣었습니다`:'더 넣을 템플릿 포텐셜이 없습니다');return}if(a==='stplDel')S.db.stpl.splice(i,1);
 if(a==='stplReset'){if(!await ask('포켓몬 시트 템플릿을 기본값으로 되돌릴까요?','되돌리기'))return;S.db.stpl=clone(STPL_DEF);S.db.stplV=STPL_V}
 if(a==='ruInvReset'){if(!await ask('자질 투자 규칙을 기본값으로 되돌릴까요?','되돌리기'))return;RULES().invest=clone(INVEST_DEF)}
 if(a==='ruAbilReset'){if(!await ask('고유·전용 포텐셜 개수를 기본값으로 되돌릴까요?','되돌리기'))return;RULES().abil=clone(ABIL_DEF)}
 if(a==='ruTyReset'){if(!await ask('타입 상성표를 기본값으로 되돌릴까요?','되돌리기'))return;RULES().ty=rulesDef().ty}
 if(a==='ruAbilAdd')RULES().abil.push(['','1','1','0','','0','']);if(a==='ruAbilDel')RULES().abil.splice(i,1);
 if(a==='ruTyAdd')RULES().ty.push(['','','','']);if(a==='ruTyDel')RULES().ty.splice(i,1);
 if(a==='tagAdd')S.db.tags.push(['새 태그','','']);if(a==='tagDel')S.db.tags.splice(i,1);
 if(a==='tplReset'){if(!await ask('랭크 템플릿을 기본값으로 되돌릴까요?','되돌리기'))return;S.db.tpl=clone(TPL_DEF);S.db.tplV=TPL_V}
 if(a==='tagReset'){if(!await ask('태그 사전을 기본값으로 되돌릴까요?','되돌리기'))return;S.db.tags=clone(TAGS_DEF)}
 save(true);renderTbl()});

/* ---------- 탭 ---------- */
/* 타입 배분 */
const TY_BASE=18;
function tyParts(v){if(!v||v==='-')return [];return (String(v).match(/[^()]+/g)||[]).map(x=>x.trim()).filter(x=>x&&x!=='-')}
function tyOpt(){const o=S.ui.ty||(S.ui.ty={});if(o.scope==null)o.scope='';if(!o.mode)o.mode='slot';if(o.t3==null)o.t3=1;if(o.tera==null)o.tera=0;if(!o.sort)o.sort='cnt';if(!Array.isArray(o.pick))o.pick=[];return o}
function tyMonTypes(p,o){const ks=['t1','t2'];if(o.t3)ks.push('t3');if(o.tera)ks.push('tera');const out=[];for(const k of ks)for(const x of tyParts(p[k]))if(!out.includes(x))out.push(x);return out}
function tyFmt(n){return Math.abs(n-Math.round(n))<1e-9?String(Math.round(n)):n.toFixed(1)}
function tyPct(n,d){return d?(n/d*100).toFixed(1)+'%':'-'}

/* 원작 18타입 상성표 기본값 (공격 타입 → {2배 타입, 1/2배 타입, 무효 타입}). PT 일관성(공통 약점) 계산에만 쓴다 · 고치는 곳은 테이블·계산식 탭 「룰 상수」 */
const TY_CHART={
 '노말':[[],['바위','강철'],['고스트']],
 '불꽃':[['풀','얼음','벌레','강철'],['불꽃','물','바위','드래곤'],[]],
 '물':[['불꽃','땅','바위'],['물','풀','드래곤'],[]],
 '전기':[['물','비행'],['전기','풀','드래곤'],['땅']],
 '풀':[['물','땅','바위'],['불꽃','풀','독','비행','벌레','드래곤','강철'],[]],
 '얼음':[['풀','땅','비행','드래곤'],['불꽃','물','얼음','강철'],[]],
 '격투':[['노말','얼음','바위','악','강철'],['독','비행','에스퍼','벌레','페어리'],['고스트']],
 '독':[['풀','페어리'],['독','땅','바위','고스트'],['강철']],
 '땅':[['불꽃','전기','독','바위','강철'],['풀','벌레'],['비행']],
 '비행':[['풀','격투','벌레'],['전기','바위','강철'],[]],
 '에스퍼':[['격투','독'],['에스퍼','강철'],['악']],
 '벌레':[['풀','에스퍼','악'],['불꽃','격투','독','비행','고스트','강철','페어리'],[]],
 '바위':[['불꽃','얼음','비행','벌레'],['격투','땅','강철'],[]],
 '고스트':[['에스퍼','고스트'],['악'],['노말']],
 '드래곤':[['드래곤'],['강철'],['페어리']],
 '악':[['에스퍼','고스트'],['격투','악','페어리'],[]],
 '강철':[['얼음','바위','페어리'],['불꽃','물','전기','강철'],[]],
 '페어리':[['격투','드래곤','악'],['불꽃','독','강철'],[]]};
/* 방어 타입 목록(t1·t2)에 공격 타입 atk 가 들어갈 때의 배율 */
let TYC=null,TYCK='';function tyChart(){const rows=RULES().ty;const k=JSON.stringify(rows);if(TYC&&TYCK===k)return TYC;const out={};for(const r of rows)if(r&&String(r[0]||'').trim())out[String(r[0]).trim()]=[ruleList(r[1]),ruleList(r[2]),ruleList(r[3])];TYC=out;TYCK=k;return out}
function tyMult(atk,defs){const c=tyChart()[atk];if(!c)return 1;let m=1;for(const d of defs){if(c[2].includes(d))return 0;if(c[0].includes(d))m*=2;else if(c[1].includes(d))m*=0.5}return m}
/* PT 한 벌의 타입 일관성: 구성·공통 약점·못 막는 타입 */
function ptTypeReport(t){const ps=t.pokemon;const n=ps.length;const cnt={},who={};const atkTypes=Object.keys(tyChart());
 const defs=ps.map(p=>[...tyParts(p.t1),...tyParts(p.t2)].filter((x,i,a)=>a.indexOf(x)===i));
 ps.forEach((p,i)=>{for(const x of defs[i]){cnt[x]=(cnt[x]||0)+1;(who[x]=who[x]||[]).push(p.name||'(이름 없음)')}});
 const comp=Object.keys(cnt).sort((a,b)=>cnt[b]-cnt[a]||KO.compare(a,b)).map(x=>({x,n:cnt[x],who:who[x]}));
 const weak=[],open=[];
 for(const a of atkTypes){const w=[],r=[];ps.forEach((p,i)=>{if(!defs[i].length)return;const mu=tyMult(a,defs[i]);if(mu>=2)w.push(p.name||'(이름 없음)');if(mu<1)r.push(p.name||'(이름 없음)')});
  if(w.length>=2||(n>0&&w.length===n))weak.push({x:a,n:w.length,who:w});if(!r.length&&n)open.push(a)}
 weak.sort((a,b)=>b.n-a.n||KO.compare(a.x,b.x));
 return{n,kinds:comp.length,comp,weak,open,typed:defs.filter(d=>d.length).length}}
function ptTypeCard(t){const r=ptTypeReport(t);const nm=esc(t.name||'트레이너');if(!r.n)return `<div class="ptc"><div class="ptch"><button type="button" class="lk" data-yact="open" data-v="${esc(t.id)}">${nm}</button><span class="small faint">포켓몬 없음</span></div></div>`;
 const half=Math.max(2,Math.ceil(r.n/2));
 const weakTxt=r.weak.length?r.weak.map(w=>`<span class="cb ${w.n>=half?'bad':''}" title="${w.who.map(esc).join('\n')}">${tchip(w.x)}<b>${w.n}</b>${w.n===r.n?'<small>전원</small>':''}</span>`).join(''):'<span class="small ok">2체 이상이 같이 약한 타입 없음</span>';
 const openTxt=r.open.length?r.open.map(tchip).join(''):'<span class="small ok">모든 타입을 누군가는 반감·무효로 받습니다</span>';
 return `<div class="ptc"><div class="ptch"><button type="button" class="lk" data-yact="open" data-v="${esc(t.id)}" title="캐릭터 시트에서 열기">${nm}</button><span class="small muted">${r.n}체 · 타입 ${r.kinds}종${t.solo?' · 1인 기준 ('+soloN(t)+'체)':''}${r.typed<r.n?` · 타입 미입력 ${r.n-r.typed}체`:''}</span><span class="ptstrip">${t.pokemon.map(p=>{const a=typeInfo(tyParts(p.t1)[0]),b=typeInfo(tyParts(p.t2)[0])||a;return `<i style="background:linear-gradient(135deg,${a&&safeCss(a[1])||'var(--sunk2)'} 50%,${b&&safeCss(b[1])||'var(--sunk2)'} 50%)" title="${esc(p.name||'')} · ${esc([p.t1,p.t2].filter(x=>x&&x!=='-').join('/'))}"></i>`}).join('')}</span></div>
  <div class="ptcr"><span class="k">구성</span><span class="v">${r.comp.map(e=>`<span class="cb" title="${e.who.map(esc).join('\n')}">${tchip(e.x)}<b>${e.n}</b></span>`).join('')}</span></div>
  <div class="ptcr"><span class="k">공통 약점</span><span class="v">${weakTxt}</span></div>
  <div class="ptcr"><span class="k">못 막는 타입</span><span class="v">${openTxt}</span></div></div>`}
/* 10-24 망령: 캐릭터 시트 PT 기술점 칸 「🛡 타입 일관성」 — 지금 PT 카드 + 보완 후보(공통 약점 · 못 막는 타입을 반감·무효로 받는 단일 타입) */
function ptTypeFill(t){const r=ptTypeReport(t);const tg=[...new Set([...r.weak.map(w=>w.x),...r.open])];if(!tg.length)return{tg,list:[]};const wk=new Set(r.weak.map(w=>w.x));
 const list=Object.keys(tyChart()).map(d=>{const cov=tg.filter(a=>tyMult(a,[d])<1);const worse=[...wk].filter(a=>tyMult(a,[d])>=2);return{d,cov,worse}}).filter(x=>x.cov.length).sort((a,b)=>(b.cov.length-b.worse.length)-(a.cov.length-a.worse.length)||b.cov.length-a.cov.length||KO.compare(a.d,b.d)).slice(0,6);
 return{tg,list}}
function ptTypeModal(t){const r=ptTypeReport(t);const f=ptTypeFill(t);
 const fill=!r.n?'':!f.tg.length?'<p class="small ok" style="margin:0">공통 약점도 못 막는 타입도 없어서 따로 보완할 곳이 없습니다</p>':f.list.length?`<div class="ptfill">${f.list.map(x=>`<div class="ptcr"><span class="k">${tchip(x.d)}</span><span class="v"><span class="small muted">막아 줌</span>${x.cov.map(tchip).join('')}${x.worse.length?`<span class="small warn" style="margin-left:4px">겹치는 약점</span>${x.worse.map(tchip).join('')}`:''}</span></div>`).join('')}</div>`:'<p class="small muted" style="margin:0">단일 타입 하나로 막을 수 있는 게 없습니다</p>';
 const l=openModal(`<div class="mhead"><h2>타입 일관성 · ${esc(t.name||'트레이너')}</h2><span class="sp"></span><button class="btn ghost" data-x>닫기</button></div><div class="mbody">${ptTypeCard(t)}
  ${r.n?`<h3 class="small" style="margin:12px 0 6px">보완 후보 <span class="faint" style="font-weight:400">공통 약점 · 못 막는 타입을 반감·무효로 받는 타입 (막는 수 − 겹치는 약점 순)</span></h3>${fill}`:''}
  <p class="small faint" style="margin:10px 0 0">원작 18타입 상성 · 타입1·타입2만 봅니다. 타입 탭에서 다른 트레이너와 같이 볼 수 있습니다.</p></div>`);
 l.addEventListener('click',e=>{if(e.target.closest('[data-x]'))return closeModal();if(e.target.closest('[data-yact="open"]'))closeModal()})}
function renderType(){const root=$('#v-type');if(!root)return;const o=tyOpt();
 const folders=S.folders.filter(f=>S.trainers.some(t=>tFolder(t)===f.id));const hasNone=S.trainers.some(t=>!tFolder(t));
 const tsel=o.scope.startsWith('t:')?o.scope.slice(2):'';if(tsel&&!S.trainers.some(t=>t.id===tsel))o.scope='';
 if(o.scope&&!tsel&&o.scope!=='_none'&&!S.folders.some(f=>f.id===o.scope))o.scope='';
 const inScope=t=>!o.scope||(tsel?t.id===tsel:o.scope==='_none'?!tFolder(t):tFolder(t)===o.scope);
 const groups=[];for(const f of S.folders){if(!fVis(f))continue;const ts=S.trainers.filter(t=>tFolder(t)===f.id&&inScope(t)&&tVis(t));if(ts.length)groups.push([f.name||'이름 없는 폴더',ts])}
 {const ts=S.trainers.filter(t=>!tFolder(t)&&inScope(t)&&tVis(t));if(ts.length)groups.push([S.folders.length?'폴더 없음':'',ts])}
 const base=S.db.types.slice(0,TY_BASE).map(x=>x[0]);
 const rows=[];const tot={};const names={};let mons=0,slots=0;const combos=new Map();
 for(const [,ts] of groups)for(const t of ts){const r={t,c:{},n:t.pokemon.length,mn:{}};
  for(const p of t.pokemon){const ty=tyMonTypes(p,o);mons++;if(!ty.length)continue;const w=o.mode==='mon'?1/ty.length:1;
   for(const x of ty){r.c[x]=(r.c[x]||0)+w;tot[x]=(tot[x]||0)+w;slots+=w;(r.mn[x]=r.mn[x]||[]).push(p.name||'(이름 없음)');(names[x]=names[x]||[]).push((p.name||'(이름 없음)')+' · '+(t.name||'트레이너'))}
   const ck=[...tyParts(p.t1),...tyParts(p.t2)].filter((x,i,a)=>a.indexOf(x)===i);if(ck.length){const key=ck.join('/');const e=combos.get(key)||{k:ck,n:0,who:[]};e.n++;e.who.push((p.name||'(이름 없음)')+' · '+(t.name||'트레이너'));combos.set(key,e)}}
  rows.push(r)}
 const extra=Object.keys(tot).filter(x=>!base.includes(x)).sort((a,b)=>KO.compare(a,b));const cols=base.concat(extra);
 const used=base.filter(x=>tot[x]>0).length;const avg=slots/TY_BASE;
 const missing=base.filter(x=>!tot[x]);const many=avg>0?cols.filter(x=>(tot[x]||0)>=avg*2&&(tot[x]||0)>=2):[];const few=base.filter(x=>tot[x]>0&&tot[x]<=Math.max(1,avg/2));
 const order=o.sort==='cnt'?cols.slice().sort((a,b)=>(tot[b]||0)-(tot[a]||0)||cols.indexOf(a)-cols.indexOf(b)):cols;
 const mx=Math.max(1,...cols.map(x=>tot[x]||0));
 const seg=(act,cur,list,label)=>`<span class="tyseg" role="radiogroup" aria-label="${esc(label)}">${list.map(([v,l])=>`<button type="button" role="radio" aria-checked="${cur===v}" data-yact="${act}" data-v="${esc(v)}">${esc(l)}</button>`).join('')}</span>`;
 const scopes=[['','전체']].concat(folders.map(f=>[f.id,f.name||'이름 없는 폴더'])).concat(hasNone&&S.folders.length?[['_none','폴더 없음']]:[]);const scopeCur=tsel?'t':o.scope;
 const bar=x=>{const v=tot[x]||0;return `<div class="tybar ${v?'':'zero'}" title="${esc(x)} ${tyFmt(v)} · ${tyPct(v,slots)}${names[x]?'\n'+names[x].map(esc).join('\n'):''}"><span>${tchip(x)}</span><span class="tr"><span class="fl" style="width:${(v/mx*100).toFixed(1)}%;background:${(typeInfo(x)&&safeCss(typeInfo(x)[1]))||'var(--muted)'}"></span>${avg>0&&!extra.includes(x)?`<span class="avg" style="left:${Math.min(100,avg/mx*100).toFixed(1)}%"></span>`:''}</span><span class="nv">${tyFmt(v)}<span>${tyPct(v,slots)}</span></span></div>`};
 const cmx=Math.max(1,...rows.flatMap(r=>cols.map(x=>r.c[x]||0)));
 const cell=(r,x)=>{const v=r.c[x]||0;if(!v)return `<td class="c z">·</td>`;const a=Math.round(14+v/cmx*40);return `<td class="c" style="background:color-mix(in srgb,var(--blue) ${a}%,transparent)" title="${esc(r.t.name||'트레이너')} · ${esc(x)} ${tyFmt(v)}\n${(r.mn[x]||[]).map(esc).join(', ')}">${tyFmt(v)}</td>`};
 const head=`<tr><th class="tn">트레이너</th>${cols.map(x=>`<th>${tchip(x)}</th>`).join('')}<th class="n">포켓몬</th><th class="n">타입 종류</th></tr>`;
 let body='';for(const [gn,ts] of groups){if(gn&&groups.length>1)body+=`<tr class="tyfh"><td class="tn">${esc(gn)}</td><td colspan="${cols.length+2}"></td></tr>`;
  for(const t of ts){const r=rows.find(z=>z.t===t);const kinds=cols.filter(x=>r.c[x]).length;body+=`<tr><td class="tn"><button type="button" class="lk" data-yact="open" data-v="${esc(t.id)}" title="캐릭터 시트에서 열기">${esc(t.name||'트레이너')}</button></td>${cols.map(x=>cell(r,x)).join('')}<td class="n">${r.n}</td><td class="n">${kinds}</td></tr>`}}
 const foot=`<tfoot><tr><td class="tn">합계</td>${cols.map(x=>`<td>${tyFmt(tot[x]||0)}</td>`).join('')}<td class="n">${mons}</td><td class="n">${used}</td></tr><tr><td class="tn">비율</td>${cols.map(x=>`<td class="small">${tot[x]?tyPct(tot[x],slots):'-'}</td>`).join('')}<td></td><td></td></tr></tfoot>`;
 const cl=[...combos.values()].sort((a,b)=>b.n-a.n||KO.compare(a.k.join('/'),b.k.join('/')));
 const empty=!mons;
 root.innerHTML=`<div class="intro"><h1>타입 배분</h1><p>트레이너별 포켓몬 타입 현황입니다. 캐릭터 시트의 타입1·타입2(·타입3)를 그대로 셉니다. 막대의 점선은 18타입에 고르게 나눴을 때의 평균입니다. 칸에 마우스를 올리면 해당 포켓몬이 보입니다.</p></div>
 <div class="tyctl"><span><span class="lab">범위</span>${seg('scope',scopeCur,scopes,'범위')}</span>
  <span><span class="lab">세는 방법</span>${seg('mode',o.mode,[['slot','타입마다 1'],['mon','포켓몬당 1']],'세는 방법')}</span>
  <span><span class="lab">정렬</span>${seg('sort',o.sort,[['cnt','많은 순'],['dex','타입 순']],'정렬')}</span>
  <label class="small row" style="gap:4px"><input type="checkbox" data-yact="t3" ${o.t3?'checked':''}>타입3 포함</label>
  <label class="small row" style="gap:4px"><input type="checkbox" data-yact="tera" ${o.tera?'checked':''}>테라스탈 포함</label>
  <span><span class="lab">트레이너</span><select data-ysel="trainer" style="max-width:220px"><option value="">전체 (폴더 범위)</option>${(S.folders.length?[...S.folders.filter(fVis).map(f=>[f.name||'이름 없는 폴더',S.trainers.filter(t=>tFolder(t)===f.id&&tVis(t))]),['폴더 없음',S.trainers.filter(t=>!tFolder(t)&&tVis(t))]]:[['',S.trainers.filter(tVis)]]).filter(([,ts])=>ts.length).map(([g,ts])=>(g?`<optgroup label="${esc(g)}">`:'')+ts.map(t=>`<option value="t:${esc(t.id)}" ${o.scope==='t:'+t.id?'selected':''}>${esc(t.name||'트레이너')}</option>`).join('')+(g?'</optgroup>':'')).join('')}</select></span></div>
 ${(()=>{const all=groups.flatMap(([,ts])=>ts);const picked=tsel?all:all.filter(t=>o.pick.includes(t.id));
  return `<div class="panel" style="margin-bottom:12px"><h3>PT별 타입 일관성 <span class="small muted" style="font-weight:400">타입 구성과 공통 약점 (원작 18타입 상성 · 타입1·타입2만)</span></h3>
  <p class="small faint" style="margin:2px 0 8px">보고 싶은 트레이너를 골라 주세요. 「구성」은 PT 안의 타입별 마릿수, 「공통 약점」은 2체 이상이 함께 2배 이상으로 맞는 공격 타입, 「못 막는 타입」은 PT의 누구도 반감·무효로 받지 못하는 공격 타입입니다.</p>
  ${tsel?'':`<div class="tchips" style="margin-bottom:8px">${all.map(t=>`<button type="button" class="${o.pick.includes(t.id)?'on':''}" data-yact="pick" data-v="${esc(t.id)}">${esc(t.name||'트레이너')}<span class="faint"> ${t.pokemon.length}</span></button>`).join('')}${all.length>1?`<button type="button" class="ghost" data-yact="pickAll">모두</button><button type="button" class="ghost" data-yact="pickNone">지우기</button>`:''}</div>`}
  ${picked.length?`<div class="ptcs">${picked.map(ptTypeCard).join('')}</div>`:`<div class="empty">위에서 트레이너를 고르면 그 PT의 타입 일관성이 여기에 뜹니다.</div>`}</div>`})()}
 ${empty?`<div class="empty">${rows.length?'이 범위의 트레이너에게 아직 포켓몬 시트가 없습니다. 캐릭터 시트에서 포켓몬을 추가하고 타입을 고르면 여기에 바로 집계됩니다.':'이 범위에 트레이너가 없습니다.'}</div>`:`
 <div class="tystats"><div class="tystat"><div class="k">트레이너</div><div class="v">${rows.length}<small>명</small></div></div>
  <div class="tystat"><div class="k">포켓몬</div><div class="v">${mons}<small>체</small></div></div>
  <div class="tystat"><div class="k">${o.mode==='mon'?'타입 점수 합':'타입 슬롯'}</div><div class="v">${tyFmt(slots)}</div></div>
  <div class="tystat"><div class="k">쓰인 타입</div><div class="v">${used}<small>/ 18</small></div></div>
  <div class="tystat"><div class="k">타입당 평균</div><div class="v">${avg.toFixed(1)}</div></div></div>
 <div class="tynotes">
  ${missing.length?`<div class="tynote"><b>아직 없는 타입 ${missing.length}</b>${missing.map(tchip).join('')}</div>`:`<div class="tynote"><b>18타입이 모두 한 번 이상 나왔습니다.</b></div>`}
  ${many.length?`<div class="tynote"><b>평균의 2배 이상</b>${many.map(x=>tchip(x)+`<span class="small muted">${tyFmt(tot[x])}</span>`).join('')}</div>`:''}
  ${few.length?`<div class="tynote"><b>평균의 절반 이하</b>${few.map(x=>tchip(x)+`<span class="small muted">${tyFmt(tot[x])}</span>`).join('')}</div>`:''}
 </div>
 <div class="tygrid"><div class="panel"><h3>전체 타입 분포</h3><div class="tybars">${order.map(bar).join('')}</div></div>
  <div class="panel"><h3>타입 조합 <span class="small muted">(타입1/타입2)</span></h3><p class="small faint" style="margin:2px 0 0">같은 조합이 2체 이상이면 붉게 표시합니다.</p><div class="tycombo">${cl.map(e=>`<span class="cb ${e.n>1?'dup':''}" title="${e.who.map(esc).join('\n')}">${e.k.map(tchip).join('')}<b>${e.n}</b></span>`).join('')||'<span class="small faint">없음</span>'}</div></div></div>
 <div class="panel"><h3>트레이너별 현황</h3><div class="tw"><table class="tymx"><thead>${head}</thead><tbody>${body}</tbody>${foot}</table></div></div>`}`}
$('#v-type').addEventListener('click',e=>{const b=e.target.closest('[data-yact]');if(!b||b.tagName==='INPUT')return;const o=tyOpt(),a=b.dataset.yact,v=b.dataset.v;
 if(a==='open'){const t=S.trainers.find(x=>x.id===v);if(!t)return;t.open=true;showTab('char');setTimeout(()=>{const el=document.getElementById('tr-'+t.id);if(el)el.scrollIntoView({block:'start'})},30);return}
 if(a==='pick'){const i=o.pick.indexOf(v);if(i<0)o.pick.push(v);else o.pick.splice(i,1);save();renderType();return}
 if(a==='pickAll'){o.pick=S.trainers.map(t=>t.id);save();renderType();return}if(a==='pickNone'){o.pick=[];save();renderType();return}
 if(a==='scope'||a==='mode'||a==='sort'){o[a]=v;save();renderType()}});
$('#v-type').addEventListener('change',e=>{const a=e.target.dataset.yact;if(a==='t3'||a==='tera'){tyOpt()[a]=e.target.checked?1:0;save();renderType()}
 if(e.target.dataset.ysel==='trainer'){tyOpt().scope=e.target.value||'';save();renderType()}});
function showTab(tab){if(!$('#v-'+tab))tab='char';S.ui.tab=tab;$$('#tabs button').forEach(b=>b.classList.toggle('on',b.dataset.tab===tab));
 $('#v-char').hidden=tab!=='char';$('#v-type').hidden=tab!=='type';$('#v-db').hidden=tab!=='db';$('#v-tbl').hidden=tab!=='tbl';{const vn=$('#v-notes');if(vn)vn.hidden=tab!=='notes'}{const vr=$('#v-rule');if(vr)vr.hidden=tab!=='rule'}{const vl=$('#v-log');if(vl)vl.hidden=tab!=='log'}refreshAll();save();MKROOT().scrollTo(0,0)}
$('#tabs').addEventListener('click',e=>{const b=e.target.closest('[data-tab]');if(b)showTab(b.dataset.tab)});
/* 좁은 화면: 파일 메뉴(엑셀·백업)는 「파일」 버튼으로 펼친다 */
const MTOP=()=>$('[data-toolsbtn]').closest('.top');
function toolsOpen(on){const top=MTOP();top.classList.toggle('tools-open',on);$('[data-toolsbtn]').setAttribute('aria-expanded',on)}
document.addEventListener('click',e=>{const tb=e.target.closest('[data-toolsbtn]');if(tb){toolsOpen(!MTOP().classList.contains('tools-open'));return}
 if(MTOP().classList.contains('tools-open')&&(!e.target.closest('.tools')||e.target.closest('.tools .btn')))setTimeout(()=>toolsOpen(false),0)});
/* 버튼이 아닌 줄(포켓몬 머리·포텐셜 줄·검색 결과·파일 라벨)도 Enter·Space로 누를 수 있게 */
document.addEventListener('keydown',e=>{if((e.key==='Enter'||e.key===' ')&&e.target.matches&&e.target.matches('[data-kbd]')&&!e.repeat){e.preventDefault();e.target.click()}});

/* ---------- 백업 · 엑셀 ---------- */
function customDB(){const o={};for(const k in DBS)o[k]=S.db[k].filter(r=>S.custom[k].includes(r[DBS[k].key]));return o}
function backupObj(){return {app:'mangketmon-maker',v:3,saved:new Date().toISOString(),trainers:S.trainers,folders:S.folders.map(folderOut),custom:S.custom,customRows:customDB(),dbEdits:[...dbEditDocs().values()],ban:S.db.ban??'',tpl:S.db.tpl,tplV:S.db.tplV||0,tags:S.db.tags,tagsV:S.db.tagsV||0,stpl:S.db.stpl,stplV:S.db.stplV||0,oldSock:S.db.oldSock,ptItems:S.db.ptItems,ptiV:S.db.ptiV||0,pride:S.db.pride,prideExV:S.db.prideExV||0,ilock:S.db.ilock||[],soloSock:S.db.soloSock||clone(SOLO_SOCK_DEF),tplSoloV:S.db.tplSoloV||0,rules:RULES()}}
const folderOut=f=>{const o={id:f.id,name:f.name||''};if(f.parent)o.parent=f.parent;if(f.deco&&typeof f.deco==='object'&&Object.keys(f.deco).length)o.deco=clone(f.deco);if(f.priv)o.priv=true;if(f.owner){o.owner=f.owner;o.ownerName=f.ownerName||''}return o};
/* dbEdits: 원본 DB와 다른 행(수정·추가·삭제). 덮어쓰기는 원본에서 다시 짓고, 추가는 지금 DB 위에 얹는다 */
function applyDbEdits(edits,fromDefault){for(const k in DBS){const eds=edits.filter(d=>d&&d.kind===k);if(!eds.length&&!fromDefault)continue;const K=DBS[k].key;
  let rows=fromDefault?clone(DEF[k]||[]):S.db[k];const cust=new Set(fromDefault?[]:S.custom[k]||[]);
  for(const d of eds){const i=rows.findIndex(r=>r[K]===d.key);
   if(d.deleted){if(i>=0)rows.splice(i,1);cust.delete(d.key);continue}
   if(!Array.isArray(d.row))continue;if(i>=0)rows[i]=clone(d.row);else rows.splice(d.pos>=0?Math.min(d.pos,rows.length):0,0,clone(d.row));if(d.custom)cust.add(d.key)}
  S.db[k]=rows;S.custom[k]=[...cust]}}
const freshIds=list=>list.map(t=>{t.id=uid();(t.pokemon||[]).forEach(p=>{p.id=uid()});return t});
function restore(o,mode){if(!o||o.app!=='mangketmon-maker'){if(o&&o.db&&o.trainers){const tr=(o.trainers||[]).map(fixT);if(mode==='add'){S.trainers=S.trainers.concat(freshIds(tr))}else{S.db=o.db;for(const k in DEF)if(!S.db[k])S.db[k]=clone(DEF[k]);if(!S.db.tags)S.db.tags=clone(TAGS_DEF);if(!S.db.tpl)S.db.tpl=clone(TPL_DEF);S.trainers=tr}}else throw new Error('형식')}
 else{if(Array.isArray(o.dbEdits))applyDbEdits(o.dbEdits,mode!=='add');if(o.ban!=null&&mode!=='add')S.db.ban=o.ban;
  for(const k in DBS){for(const r of (o.customRows&&o.customRows[k])||[]){const key=r[DBS[k].key];const i=S.db[k].findIndex(x=>x[DBS[k].key]===key);if(i>=0)S.db[k][i]=r;else S.db[k].unshift(r);if(!S.custom[k].includes(key))S.custom[k].push(key)}}
  if(o.tpl){S.db.tpl=o.tpl;if(o.tplSoloV!=null)S.db.tplSoloV=+o.tplSoloV||0}if(o.soloSock&&typeof o.soloSock==='object')S.db.soloSock=o.soloSock;if(o.rules&&typeof o.rules==='object')S.db.rules=o.rules;if(o.tags)S.db.tags=o.tags;if(o.stpl){S.db.stpl=stplMigrate(o.stpl,o.stplV);S.db.stplV=STPL_V}if(o.oldSock!=null)S.db.oldSock=o.oldSock;if(o.ptItems)S.db.ptItems=o.ptItems;if(o.pride){S.db.pride=o.pride;S.db.prideExV=o.prideExV||0;prideMigrate(S.db)}if(Array.isArray(o.ilock))S.db.ilock=o.ilock;if(Array.isArray(o.folders)){const fs=o.folders.filter(f=>f&&f.id).map(f=>folderOut({id:String(f.id),name:String(f.name||''),parent:f.parent?String(f.parent):'',deco:f.deco&&typeof f.deco==='object'?f.deco:null,priv:!!f.priv,owner:f.owner?String(f.owner):'',ownerName:String(f.ownerName||'')}));if(mode==='add'){for(const f of fs)if(!S.folders.some(x=>x.id===f.id))S.folders.push(f)}else S.folders=fs}
  tplNormalize(S.db);const tr=(o.trainers||[]).map(fixT);S.trainers=mode==='add'?S.trainers.concat(freshIds(tr)):tr}
 S.trainers.forEach(fixT);dedupeIds();reindex();save(true);refreshAll()}
/* 백업 불러오기: 바뀌는 내용 미리보기 · 「지금 목록에 추가」가 빨간 기본 버튼 · 덮어쓰기는 두 번 눌러야 함 · 불러오기 전 지금 데이터 자동 백업 */
function impStamp(){const d=new Date(),p=n=>String(n).padStart(2,'0');return `${d.getFullYear()}${p(d.getMonth()+1)}${p(d.getDate())}_${p(d.getHours())}${p(d.getMinutes())}${p(d.getSeconds())}`}
async function impAutoBackup(){const j=JSON.stringify(backupObj());try{localStorage.setItem('mkm_auto_backup_before_import',j)}catch(e){}
 await saveFile(`망켓몬_제작기_자동백업_${impStamp()}.json`,j)}
function impDiff(o){const ft=(o&&Array.isArray(o.trainers))?o.trainers:[],cur=S.trainers;
 const pk=l=>l.reduce((n,t)=>n+((t&&t.pokemon)||[]).length,0);
 const trl=l=>l.length?'<ul class="impl">'+l.map(t=>`<li>${esc((t&&t.name)||'(이름 없음)')} <span class="muted small">· 포켓몬 ${((t&&t.pokemon)||[]).length}</span></li>`).join('')+'</ul>':'<div class="muted small">없음</div>';
 const fe=(o&&Array.isArray(o.dbEdits))?o.dbEdits.filter(d=>d&&DBS[d.kind]):[];
 const fk=new Set(fe.map(d=>d.kind+'|'+d.key));
 const edl=(d,base)=>{const K=DBS[d.kind].key,has=(base[d.kind]||[]).some(r=>r[K]===d.key);return `<li>${esc(DBS[d.kind].t)} 「${esc(d.key)}」 <b>${d.deleted?'삭제':(has?'수정':'추가')}</b></li>`};
 const cr=[];if(o&&o.customRows)for(const k in DBS)for(const r of o.customRows[k]||[])cr.push(`<li>${esc(DBS[k].t)} 「${esc(r[DBS[k].key])}」 <b>직접 추가한 줄</b></li>`);
 const SETN={tpl:'랭크별 기초 템플릿',tags:'포텐셜 태그 사전',stpl:'포켓몬 시트 템플릿',oldSock:'『올드 타입』 PT 기술점',soloSock:'1인 기준 (2체) PT 기술점',ptItems:'트레이너 포인트 항목',pride:'프라이드 규칙',ilock:'소지품 해금 표',rules:'룰 상수 (자질 투자 · 포텐셜 개수 · 상성표)'};
 const sets=Object.keys(SETN).filter(k=>o&&o[k]!=null).map(k=>SETN[k]);
 const lost=[...dbEditDocs().values()].filter(d=>!fk.has(d.kind+'|'+d.key)&&DBS[d.kind]);
 const DEFB={};for(const k in DBS)DEFB[k]=DEF[k]||[];
 const det=(title,n,body,open)=>`<details class="impd"${open?' open':''}><summary>${title} <b>${n}</b></summary>${body}</details>`;
 const ul=a=>a.length?'<ul class="impl">'+a.join('')+'</ul>':'<div class="muted small">없음</div>';
 const add=det('추가되는 트레이너',ft.length+'명',trl(ft),true)
  +det('바뀌는 DB 줄',(fe.length+cr.length)+'줄',ul(fe.map(d=>edl(d,S.db)).concat(cr)),fe.length+cr.length<=30)
  +(sets.length?det('파일 값으로 바뀌는 설정',sets.length+'종',ul(sets.map(s=>`<li>${esc(s)}</li>`)),false):'')
  +'<div class="small" style="margin-top:4px">지워지는 트레이너 <b>없음</b></div>';
 const rep=det('<span class="impbad">지워지는 지금 트레이너</span>',cur.length+'명',trl(cur),true)
  +det('새로 들어오는 트레이너',ft.length+'명',trl(ft),false)
  +det('<span class="impbad">사라지는 지금 DB 수정</span>',lost.length+'줄',ul(lost.map(d=>`<li>${esc(DBS[d.kind].t)} 「${esc(d.key)}」</li>`)),false)
  +det('파일에서 들어오는 DB 줄',(fe.length+cr.length)+'줄',ul(fe.map(d=>edl(d,DEFB)).concat(cr)),false);
 return {ft:ft.length,fp:pk(ft),cur:cur.length,cp:pk(cur),add,rep}}
function chooseMode(o){return new Promise(res=>{const D=impDiff(o);let armed=false;
 const l=openModal(`<div class="mhead"><h2>백업 불러오기</h2></div><div class="mbody">
<p style="margin:0 0 8px">파일: 트레이너 <b>${D.ft}</b>명 · 포켓몬 <b>${D.fp}</b>마리${o&&o.saved?` <span class="muted small">(${esc(String(o.saved).replace('T',' ').slice(0,16))} 저장)</span>`:''}<br>지금: 트레이너 <b>${D.cur}</b>명 · 포켓몬 <b>${D.cp}</b>마리</p>
<div class="impbox"><div class="imph">「지금 목록에 추가」를 누르면</div>${D.add}</div>
<div class="impbox"><div class="imph impbad">「전체 덮어쓰기」를 누르면</div>${D.rep}</div>
<p class="small muted" style="margin:8px 0 0">어느 쪽을 눌러도, 불러오기 전에 지금 데이터를 「망켓몬_제작기_자동백업_날짜.json」 파일로 먼저 저장합니다.</p></div>
<div class="mfoot"><button class="btn" data-m="">취소</button><span class="sp"></span><button class="btn" data-m="replace">전체 덮어쓰기</button><button class="btn impadd" data-m="add" autofocus>지금 목록에 추가</button></div>`,{wide:true,onClose:()=>res('')});
 l.addEventListener('click',e=>{const b=e.target.closest('[data-m]');if(!b)return;const m=b.dataset.m;
  if(m==='replace'&&!armed){armed=true;b.classList.add('impbadbtn');b.textContent=D.cur?`정말 덮어쓰기? (지금 트레이너 ${D.cur}명 삭제)`:'정말 덮어쓰기?';return}
  layers[layers.length-1].onClose=null;closeModal();res(m)})})}
document.addEventListener('click',e=>{const b=e.target.closest('[data-act="bakOut"],[data-act="xlsxOut"]');if(!b)return;b.dataset.act==='bakOut'?saveFile('망켓몬_제작기_백업.json',JSON.stringify(backupObj())):exportXlsx()});
$('#bakIn').addEventListener('change',async e=>{const f=e.target.files[0];e.target.value='';if(!f)return;let o;try{o=JSON.parse(await f.text())}catch(err){toast('백업 파일 형식이 맞지 않습니다');return}
 if(!o||(o.app!=='mangketmon-maker'&&!(o.db&&o.trainers))){toast('백업 파일 형식이 맞지 않습니다');return}
 const m=await chooseMode(o);if(!m)return;
 try{await impAutoBackup()}catch(err){}
 try{restore(o,m);toast(m==='add'?'지금 목록에 추가했습니다 · 이전 데이터는 자동 백업 파일로 저장됨':'전체 덮어썼습니다 · 이전 데이터는 자동 백업 파일로 저장됨')}catch(err){toast('백업 파일 형식이 맞지 않습니다')}});
/* 엑셀(xlsx) 읽기·쓰기 — 외부 라이브러리 없이 JSZip으로 직접 처리 (오프라인 동작) */
const xlCol=i=>{let s='';i++;while(i){const m=(i-1)%26;s=String.fromCharCode(65+m)+s;i=Math.floor((i-1)/26)}return s};
const xlIdx=ref=>{const m=String(ref).match(/^[A-Z]+/);let n=0;for(const ch of m?m[0]:'A')n=n*26+ch.charCodeAt(0)-64;return n-1};
const xlEsc=v=>String(v).replace(/[\x00-\x08\x0B\x0C\x0E-\x1F]/g,'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
function xlSheet(aoa,cols){let x='<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">';
 if(cols&&cols.length)x+='<cols>'+cols.map((c,i)=>`<col min="${i+1}" max="${i+1}" width="${(c&&c.wch||10)+1}" customWidth="1"/>`).join('')+'</cols>';
 x+='<sheetData>';aoa.forEach((row,r)=>{if(!row||!row.length)return;x+=`<row r="${r+1}">`;row.forEach((v,c)=>{if(v==null||v==='')return;const ref=xlCol(c)+(r+1);
  if(typeof v==='number'&&isFinite(v))x+=`<c r="${ref}"><v>${v}</v></c>`;else{const t=String(v).slice(0,32767);x+=`<c r="${ref}" t="inlineStr"${/\n/.test(t)?' s="1"':''}><is><t xml:space="preserve">${xlEsc(t)}</t></is></c>`}});x+='</row>'});
 return x+'</sheetData></worksheet>'}
async function xlWrite(sheets){const Z=await loadJSZip();const z=new Z();const H='<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n';
 z.file('[Content_Types].xml',H+'<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>'+sheets.map((_,i)=>`<Override PartName="/xl/worksheets/sheet${i+1}.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>`).join('')+'</Types>');
 z.file('_rels/.rels',H+'<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>');
 z.file('xl/workbook.xml',H+'<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets>'+sheets.map((s,i)=>`<sheet name="${xlEsc(s.name).replace(/"/g,'&quot;')}" sheetId="${i+1}" r:id="rId${i+1}"/>`).join('')+'</sheets></workbook>');
 z.file('xl/_rels/workbook.xml.rels',H+'<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">'+sheets.map((_,i)=>`<Relationship Id="rId${i+1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet${i+1}.xml"/>`).join('')+`<Relationship Id="rId${sheets.length+1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>`);
 z.file('xl/styles.xml',H+'<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><fonts count="1"><font><sz val="11"/><name val="맑은 고딕"/></font></fonts><fills count="2"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill></fills><borders count="1"><border><left/><right/><top/><bottom/><diagonal/></border></borders><cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs><cellXfs count="2"><xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/><xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0" applyAlignment="1"><alignment wrapText="1" vertical="top"/></xf></cellXfs><cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles></styleSheet>');
 sheets.forEach((s,i)=>z.file(`xl/worksheets/sheet${i+1}.xml`,xlSheet(s.aoa,s.cols)));
 return z.generateAsync({type:'blob',compression:'DEFLATE',mimeType:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'})}
async function xlRead(buf){const Z=await loadJSZip();const z=await Z.loadAsync(buf);const DP=new DOMParser();
 const X=async p=>{const f=z.file(p)||z.file(Object.keys(z.files).find(n=>n.toLowerCase()===p.toLowerCase())||'\0');return f?DP.parseFromString(await f.async('string'),'application/xml'):null};
 const tag=(el,n)=>[...el.getElementsByTagNameNS('*',n)];
 const wb=await X('xl/workbook.xml');if(!wb)throw new Error('notxlsx');const rels=await X('xl/_rels/workbook.xml.rels');const rm={};if(rels)for(const r of tag(rels,'Relationship'))rm[r.getAttribute('Id')]=r.getAttribute('Target');
 const ssd=await X('xl/sharedStrings.xml');const ss=ssd?tag(ssd,'si').map(si=>tag(si,'t').filter(t=>!t.parentNode||t.parentNode.localName!=='rPh').map(t=>t.textContent).join('')):[];
 const out={SheetNames:[],rows:{}};
 for(const sh of tag(wb,'sheet')){const name=sh.getAttribute('name');const id=sh.getAttribute('r:id')||sh.getAttributeNS('http://schemas.openxmlformats.org/officeDocument/2006/relationships','id');
  let t=rm[id]||'';t=t.startsWith('/')?t.slice(1):'xl/'+t.replace(/^\.\//,'');const d=t?await X(t):null;const rows=[];
  if(d)for(const row of tag(d,'row')){const ri=(+row.getAttribute('r')||rows.length+1)-1;const arr=[];
   for(const c of tag(row,'c')){const ref=c.getAttribute('r');const ci=ref?xlIdx(ref):arr.length;const ty=c.getAttribute('t');let v=null;
    if(ty==='inlineStr')v=tag(c,'t').map(x=>x.textContent).join('');else{const ve=tag(c,'v')[0];v=ve?ve.textContent:null;if(ty==='s'&&v!=null)v=ss[+v]??''}
    if(v!=null)arr[ci]=v}
   rows[ri]=arr}
  out.SheetNames.push(name);out.rows[name]=rows}
 return out}
const shName=(s,used)=>{let n=String(s||'시트').replace(/[\[\]:*?/\\]/g,' ').replace(/^'+|'+$/g,'').slice(0,28).trim()||'시트';let b=n,i=2;while(used.has(n.toLowerCase()))n=b.slice(0,25)+' '+(i++);used.add(n.toLowerCase());return n};
async function exportXlsx(){const wb=[],used=new Set(['_backup']);
 const all=[['트레이너','#','이름','Lv','타입1','타입2','타입3','테라','특성','소지품',...STATS.map(s=>s+' 종족치'),...STATS.map(s=>s+' 실수치'),'역할','분류','기술','포텐셜','전용 포텐셜','복사용 텍스트']];
 for(const t of S.trainers){const aoa=[['트레이너',t.name],['지시',t.ranks['지시'],'육성',t.ranks['육성'],'통솔',t.ranks['통솔'],'능력',t.ranks['능력']],
   ['포인트',...Object.entries(t.base).flatMap(([k,v])=>[k,v])],['PT 기술점',ptSockets(t),'최대치',ptMax(t)],['고유 포텐셜',...t.unique.filter(u=>u.name).flatMap(u=>[u.name,brN(u.eff)])],[],all[0].slice(1)];
  t.pokemon.forEach((p,i)=>{const r=[i+1,p.name,lv(t,p),p.t1,p.t2,p.t3,p.tera,p.ability,p.item,...p.base.map(v=>v===''?'':+v),...STATS.map((_,k)=>stat(t,p,k)),roleOf(p),classOf(p),p.moves.map(m=>m.name).join('\n'),p.pots.filter(x=>x).join('\n'),exclAll(p).map(x=>x.name).join('\n'),copyText(t,p)];aoa.push(r);all.push([t.name,...r])});
  wb.push({name:shName(t.name,used),aoa,cols:[{wch:6},{wch:16},{wch:5},...Array(6).fill({wch:7}),{wch:12},...Array(12).fill({wch:7}),{wch:10},{wch:10},{wch:18},{wch:18},{wch:16},{wch:60}]})}
 wb.push({name:shName('전체 포켓몬',used),aoa:all});
 const cr=customDB();const ca=[];for(const k in DBS){if(!cr[k].length)continue;ca.push([DBS[k].t+' DB (오리지널)']);ca.push(DBS[k].cols);cr[k].forEach(r=>ca.push(r));ca.push([])}
 if(ca.length)wb.push({name:shName('오리지널 DB',used),aoa:ca});
 const js=JSON.stringify(backupObj());const ch=[['이 시트는 제작기로 다시 불러올 때 쓰는 백업 데이터입니다. 수정하지 마세요.']];for(let i=0;i<js.length;i+=30000)ch.push([js.slice(i,i+30000)]);
 wb.push({name:'_backup',aoa:ch});
 let blob;try{blob=await xlWrite(wb)}catch(e){return toast('엑셀 파일을 만들지 못했습니다')}await saveFile('망켓몬_캐릭터시트.xlsx',blob)}
$('#xlsxIn').addEventListener('change',async e=>{const f=e.target.files[0];e.target.value='';if(!f)return;
 try{const wb=await xlRead(await f.arrayBuffer());
  if(wb.rows['_backup']){const js=wb.rows['_backup'].slice(1).map(r=>(r&&r[0])||'').join('');
   const o=JSON.parse(js);const m=await chooseMode(o);if(m){try{await impAutoBackup()}catch(err){}restore(o,m);toast('엑셀을 불러왔습니다 · 이전 데이터는 자동 백업 파일로 저장됨')}return}
  const found=[];for(const sn of wb.SheetNames){const rows=wb.rows[sn];const list=[];
   for(const r of rows)for(const c of r||[]){if(c==null)continue;for(const s of String(c).split(/\r?\n/))if(isCopyText(s))list.push(s.trim())}
   if(list.length)found.push([sn,list])}
  if(!found.length)return toast('엑셀에서 복사용 텍스트를 찾지 못했습니다');
  const tot=found.reduce((a,[,l])=>a+l.length,0);
  if(!await ask(`시트 ${found.length}개에서 포켓몬 ${tot}체의 복사용 텍스트를 찾았습니다. 시트마다 트레이너 폴더를 새로 만들어 불러올까요?`,'불러오기',false))return;
  for(const [sn,list] of found){const t=newTrainer();t.name=sn;list.forEach(s=>t.pokemon.push(Object.assign(parseCopy(s,t),{open:false})));S.trainers.push(t)}
  save();showTab('char');toast(`${tot}체를 불러왔습니다`)}catch(err){toast('엑셀 파일을 읽지 못했습니다')}});

/* ---------- 공유 저장소 (여러 사람이 함께 보고 고치기) ----------
   trainers/<id>  {ord, data:트레이너(포켓몬 제외, pids=포켓몬 순서)}
   pokemon/<id>   {tid, data:포켓몬}
   dbedit/<kind>.<hex(key)>  {kind,key,row|deleted,custom,pos}  — 원본 DB와 다른 행만
   meta/settings  {tpl,tags,tagsV,ban}
   펼침·탭 같은 화면 상태(open, tab)는 사람마다 따로 둔다. */
const SH={on:false,ready:false,db:null,canWrite:true,init:{},buf:{},ed:new Map(),meta:null,synced:new Map(),flushing:false,again:false,dbDirty:true,dbDocs:null,last:''};
const SH_KINDS=['trainers','pokemon','dbedit','meta','folders'];
const UIK=new Set(['open','tab','effTxt','baseUp']);/* 10-26 점검: 공유에서 받은 effTxt · baseUp 이 눌러붙어 옛 값이 다시 올라가던 것 */
const nowHM=()=>new Date().toLocaleTimeString('ko-KR',{hour:'2-digit',minute:'2-digit'});
function shStatus(t){SH.last=t;const el=$('#saved');if(el)el.innerHTML=`<span class="shpill ${SH.canWrite?'':'ro'}">공유</span> ${esc(t)}`}
const canon=o=>JSON.stringify(o,(k,v)=>v&&typeof v==='object'&&!Array.isArray(v)?Object.fromEntries(Object.keys(v).sort().map(x=>[x,v[x]])):v);
function fnv(s){let h=2166136261;for(const c of String(s)){h^=c.codePointAt(0);h=Math.imul(h,16777619)>>>0}return h.toString(16)}
function keySeg(k){const h=[...new TextEncoder().encode(String(k))].map(b=>b.toString(16).padStart(2,'0')).join('');return h.length<=180?h:'h'+fnv(k)+h.slice(0,40)}
/* 오레마스가 시트를 가져갈 때 쓰는 효과 글 사본 (10-21 망령): 특성·포텐셜이 오레마스 DB 에 없거나 제작기에서 새로 만든 것이어도 시트에 보이는 글 그대로 */
function effSnap(p){try{const ab=p.ability?idx.abil&&idx.abil.get(p.ability):null;const it=itemRow(p);return {ab:ab?String(ab[2]||''):'',it:it?String(it[4]||''):'',itAuto:it?String(it[7]||''):'',itCons:it&&it[3]==='O'?1:0,its2:(p.items2||[]).map(x=>{const r=itemRow(x);return r?{it:String(r[4]||''),itAuto:String(r[7]||''),itCons:r[3]==='O'?1:0}:null}),pots:(p.pots||[]).map((n,i)=>n&&n!=='-'?String(potEffOf(p,i)||''):''),kinds:(p.pots||[]).map((n,i)=>n&&n!=='-'?String(potKindOf(p,i)||''):'')}}catch(e){return null}}
function stripUI(o){const c={};for(const k in o){if(UIK.has(k)||k[0]==='_'||k==='pokemon')continue;c[k]=clone(o[k])}return c}
let DEFJ=null,DEFJN=-1;function defJ(){const rn=(DEF.rm||[]).length*100000+(DEF.st||[]).length;if(DEFJ&&DEFJN===rn)return DEFJ;DEFJN=rn;DEFJ={};for(const k in DBS){const m=new Map();for(const r of DEF[k]||[]){const key=r[DBS[k].key];if(key!==''&&!m.has(key))m.set(key,rowJ(r))}DEFJ[k]=m}return DEFJ}
/* 행 비교: 뒤쪽 빈 칸은 없는 것과 같다 (10-24 레디메이드 「확률」 칸을 더해도 예전 행이 「바뀐 행」으로 잡히지 않게) */
function rowJ(r){const a=Array.isArray(r)?r.slice():r;if(Array.isArray(a))while(a.length&&(a[a.length-1]===''||a[a.length-1]==null))a.pop();return JSON.stringify(a)}
function dbEditDocs(out=new Map()){const dj=defJ();
 for(const k in DBS){if(!lazyOk(k))continue;/* 레디메이드 기본 행이 아직 없으면 비교하지 않는다 (915행이 전부 「바뀐 행」으로 잡히는 것 방지) */const seen=new Set(),cust=new Set(S.custom[k]||[]);
  S.db[k].forEach((r,ix)=>{const key=r[DBS[k].key];if(key===''||key==null||seen.has(key))return;seen.add(key);const d=dj[k].get(key);
   if(d===rowJ(r)&&!cust.has(key))return;out.set('dbedit/'+k+'.'+keySeg(key),{kind:k,key,row:r,custom:cust.has(key),pos:d?-1:ix})});
  for(const key of dj[k].keys())if(!seen.has(key))out.set('dbedit/'+k+'.'+keySeg(key),{kind:k,key,deleted:true})}
 return out}
function shDbDocs(){if(SH.dbDocs&&!SH.dbDirty)return SH.dbDocs;const out=dbEditDocs();
 const st=shSettings();for(const g in META_G){const o={};for(const k of META_G[g])o[k]=st[k];out.set('meta/set.'+g,o)}
 SH.dbDocs=out;SH.dbDirty=false;return out}
/* 테이블 탭 설정은 묶음마다 문서 하나(meta/set.tpl …). 두 사람이 서로 다른 표를 동시에 고쳐도 한쪽이 지워지지 않는다. 예전 문서 meta/settings 는 읽기만 하고 그대로 둔다 */
const META_G={tpl:['tpl','tplV','tplSoloV'],tags:['tags','tagsV'],ban:['ban'],stpl:['stpl','stplV'],oldSock:['oldSock'],soloSock:['soloSock'],ptItems:['ptItems','ptiV'],pride:['pride','prideExV'],ilock:['ilock'],rules:['rules']};
function shMetaGroups(){const st=shSettings(),out={};for(const g in META_G){const o={};for(const k of META_G[g])o[k]=st[k];out[g]=o}return out}
function shMetaMerge(){const L=SH.metaL&&typeof SH.metaL==='object'?SH.metaL:null;const G=SH.metaG||{};if(!L&&!Object.keys(G).length)return null;const m=Object.assign({},L||{});for(const g in G)Object.assign(m,G[g]||{});return m}
function shSettings(){return {tpl:S.db.tpl||[],tplV:S.db.tplV||0,tags:S.db.tags||[],tagsV:S.db.tagsV||0,ban:S.db.ban??'',stpl:S.db.stpl||[],stplV:S.db.stplV||0,oldSock:S.db.oldSock??5.5,ptItems:S.db.ptItems||PTI_DEF,ptiV:S.db.ptiV||0,pride:S.db.pride||PRIDE_DEF,prideExV:S.db.prideExV||0,tplSoloV:S.db.tplSoloV||0,soloSock:S.db.soloSock||SOLO_SOCK_DEF,ilock:S.db.ilock||[],rules:RULES()}}
function shWant(){const out=new Map();
 S.folders.forEach((f,i)=>{f._ord=i;const d={ord:i,name:f.name||''};if(f.parent)d.parent=f.parent;if(f.priv)d.priv=true;if(f.deco&&Object.keys(f.deco).length)d.deco=f.deco;if(f.owner){d.owner=f.owner;d.ownerName=f.ownerName||''}out.set('folders/'+f.id,d)});
 S.trainers.forEach((t,i)=>{const d=stripUI(t);d.pids=t.pokemon.map(p=>p.id);out.set('trainers/'+t.id,{ord:i,data:d});
  t.pokemon.forEach(p=>{const bu=baseUp(t,p);out.set('pokemon/'+p.id,{tid:t.id,data:Object.assign(stripUI(p),{effTxt:effSnap(p)},bu.up.length?{baseUp:{base:bu.base.map(v=>v===''?'':+v),up:bu.up.map(u=>({i:u.i,from:u.from,to:u.to,by:u.by}))}}:{})})})});
 for(const [id,d] of SH.orph_ed||[])out.set('dbedit/'+id,d);   /* 붙을 행이 없는 수정도 지우지 않는다. 같은 이름 행이 다시 생기면 아래 줄이 덮는다 */
 for(const [p,b] of shDbDocs())out.set(p,b);
 /* 레디메이드 기본 행을 아직 못 읽었으면, 받아 둔 레디메이드 수정 행은 그대로 둔다 (지우지 않게) */
 for(const lk of ['rm','st'])if(!lazyOk(lk))for(const [id,d] of SH.ed)if(d&&d.kind===lk)out.set('dbedit/'+id,d);
 if(SH.metaL)out.set('meta/settings',SH.metaL);return out}
async function runPool(jobs,n){let i=0;const w=async()=>{while(i<jobs.length){const j=jobs[i++];await j()}};await Promise.all(Array.from({length:Math.min(n,jobs.length)},w))}
const SH_ERR_KO={invalid_argument:'저장이 거부됨(권한 없음 또는 항목이 너무 큼)',resource_exhausted:'저장 요청이 너무 잦음',quota_exceeded:'공유 저장소 용량 초과',unavailable:'일시적인 연결 문제',revoked:'접근 권한이 바뀜',not_granted:'공유 저장소 사용이 허용되지 않음',capability_disabled:'공유 저장소를 쓸 수 없는 화면'};
function shErr(e){const c=(e&&e.code)||'unknown';const m=SH_ERR_KO[c]||('알 수 없는 오류: '+((e&&e.message)||c));SH.lastErr=c;
 if(c==='revoked'||c==='not_granted'||c==='capability_disabled'){SH.canWrite=false}
 if(!SH.toasted)SH.toasted=new Set();if(!SH.toasted.has(c)&&c!=='unavailable'&&c!=='resource_exhausted'){SH.toasted.add(c);toast('공유 저장: '+m)}
 console.warn('[공유 저장소]',c,e&&e.message);return c}
let shTimer=null,shBack=0,shLastFlush=0;
function shSchedule(ms){clearTimeout(shTimer);shTimer=setTimeout(()=>shFlush(),ms)}
async function shFlush(){if(!SH.on||!SH.ready)return;if(!SH.canWrite){shStatus('읽기 전용 · 고친 내용은 공유되지 않습니다');return}
 if(SH.flushing){SH.again=true;return}
 const wait=800-(Date.now()-shLastFlush);if(wait>0){shSchedule(wait);return}
 SH.flushing=true;shLastFlush=Date.now();let retry=false,hard=0;SH.bad=SH.bad||new Map();
 try{do{SH.again=false;const want=shWant();const jobs=[];
   for(const [p,b] of want){const j=canon(b);if(SH.synced.get(p)===j||SH.bad.get(p)===j)continue;
    if(j.length>1500000){if(shHostBig(p))continue;if(!SH.bigWarn){SH.bigWarn=true;toast('한 항목이 너무 커서 공유 저장하지 못했습니다 · 메모나 효과 글을 줄여 주세요')}SH.bad.set(p,j);continue}
    jobs.push(async()=>{try{await SH.db.doc(p).set(JSON.parse(j));SH.synced.set(p,j);SH.bad.delete(p)}catch(e){const c=shErr(e);if(c==='unavailable'||c==='resource_exhausted')retry=true;else{SH.bad.set(p,j);hard++}}})}
   for(const p of [...SH.synced.keys()])if(!want.has(p))jobs.push(async()=>{try{await SH.db.doc(p).delete();SH.synced.delete(p)}catch(e){const c=shErr(e);if(c==='unavailable'||c==='resource_exhausted')retry=true;else hard++}});
   if(jobs.length){shStatus(`저장 중… (${jobs.length})`);await runPool(jobs,2)}
  }while(SH.again&&!retry)}finally{SH.flushing=false}
 if(retry){shBack=Math.min(30000,(shBack||1500)*2);shStatus(`잠시 뒤 다시 저장합니다 (${SH_ERR_KO[SH.lastErr]||SH.lastErr})`);shSchedule(shBack);return}
 shBack=0;shStatus(hard?`저장 실패 ${hard}건 · ${SH_ERR_KO[SH.lastErr]||SH.lastErr}`:'저장됨 '+nowHM());if(SH.again)shSchedule(300)}
/* 1.5MB 를 넘는 문서: 안에 든 그림(data URL)을 공유 저장소로 옮기고 주소만 남긴 뒤 다시 저장한다 */
function shHostBig(path){SH.hosting=SH.hosting||new Set();if(SH.hosting.has(path))return true;const [kind,id]=[path.slice(0,path.indexOf('/')),path.slice(path.indexOf('/')+1)];
 let o=null,tag='';if(kind==='trainers'){o=S.trainers.find(t=>t.id===id);tag='t'}else if(kind==='pokemon'){for(const t of S.trainers){o=t.pokemon.find(p=>p.id===id);if(o)break}tag='p'}
 if(!o||!/^data:/.test(String(o.image||'')))return false;SH.hosting.add(path);toast('그림이 커서 공유 저장소로 옮기는 중…');
 hostImg(tag,o.id,o.image).then(u=>{o.image=u;save();renderAll();toast('그림을 공유 저장소로 옮겼습니다')}).catch(e=>{toast('그림을 옮기지 못했습니다: '+e.message+' · 이미지를 작게 바꿔 주세요');SH.bad.set(path,canon(shWant().get(path)))}).finally(()=>SH.hosting.delete(path));return true}
function replaceFields(o,d,keep){for(const k of Object.keys(o))if(!keep.has(k)&&k[0]!=='_'&&!(k in d))delete o[k];for(const k in d)if(!keep.has(k))o[k]=clone(d[k])}
const KEEP_T=new Set(['open','pokemon']),KEEP_P=new Set(['open','tab']);
function shPutTrainer(id,d){let t=S.trainers.find(x=>x.id===id);const data=clone(d.data||{});const pids=data.pids||[];delete data.pids;
 if(!t){t={id,open:false,pokemon:[]};S.trainers.push(t)}replaceFields(t,data,KEEP_T);t.id=id;t._ord=+d.ord||0;t._pids=pids;fixT(t);
 const all=new Map(t.pokemon.map(p=>[p.id,p]));for(const [pid,p] of SH.orph)if(p._tid===id){all.set(pid,p);SH.orph.delete(pid)}
 const list=pids.map(x=>all.get(x)).filter(Boolean);for(const p of all.values())if(!list.includes(p))list.push(p);t.pokemon=list}
function shPutPoke(id,d){let p=null,owner=null;for(const t of S.trainers){const x=t.pokemon.find(q=>q.id===id);if(x){p=x;owner=t;break}}if(!p)p=SH.orph.get(id);
 if(!p)p={id,open:false,tab:'base'};{const dd=clone(d.data||{});delete dd.effTxt;delete dd.baseUp;replaceFields(p,dd,KEEP_P)}p.id=id;p._tid=d.tid;fixP(p);
 const t=S.trainers.find(x=>x.id===d.tid);
 if(owner&&owner!==t)owner.pokemon=owner.pokemon.filter(q=>q!==p);
 if(t){if(!t.pokemon.includes(p)){const pos=(t._pids||[]).indexOf(id);if(pos>=0){const after=t.pokemon.filter(q=>(t._pids||[]).indexOf(q.id)>=0&&(t._pids||[]).indexOf(q.id)<pos).length;t.pokemon.splice(after,0,p)}else t.pokemon.push(p)}SH.orph.delete(id)}
 else SH.orph.set(id,p)}
function shDelTrainer(id){S.trainers=S.trainers.filter(t=>t.id!==id)}
function shDelPoke(id){for(const t of S.trainers)t.pokemon=t.pokemon.filter(p=>p.id!==id);SH.orph.delete(id)}
function shRebuildDB(){/* 아직 올리지 않은 내 설정 묶음은 받은 값으로 덮지 않는다 */const keepG={};if(SH.ready){const loc=shMetaGroups();for(const g in loc){const p='meta/set.'+g;if(SH.synced.has(p)&&SH.synced.get(p)!==canon(loc[g]))keepG[g]=clone(loc[g])}}
 const keepNonDb={};for(const k in DEF)if(!(k in DBS))keepNonDb[k]=clone(DEF[k]);
 const byKind={};for(const [id,d] of SH.ed){if(d&&d.kind)(byKind[d.kind]=byKind[d.kind]||[]).push([id,d])}
 /* 10-27 망령: DB 새 판이 올라와도 고친 것을 잃지 않게.
    · 기본 DB에 이름이 없어진 수정 → 버리지 않고 SH.orph_ed 에 남긴다 (공유 DB 에서도 지우지 않음 · DB 탭에서 살리기/옮겨 붙이기/버리기)
    · 직접 추가한 행과 같은 이름이 기본 DB에 생기면 → 추가한 행이 그 자리의 기본 행을 덮는다 (줄 순서와 상관없이)
    · 기본 DB 안에 같은 이름이 둘이면 수정은 첫 줄에만 */
 SH.orph_ed=new Map();
 for(const k in DBS){const eds=byKind[k]||[];const mods=new Map(),del=new Set(),adds=[],cust=[];const key=r=>r[DBS[k].key];const has=new Set((DEF[k]||[]).map(key));
  for(const [id,d] of eds){if(d.deleted)del.add(d.key);else if(Array.isArray(d.row)){if(d.pos>=0&&!has.has(d.key))adds.push(d);else if(has.has(d.key))mods.set(d.key,d.row);else if(lazyOk(k))SH.orph_ed.set(id,d)}if(d.custom&&!d.deleted&&(has.has(d.key)||d.pos>=0))cust.push(d.key)}
  const used=new Set();let rows=(DEF[k]||[]).filter(r=>!del.has(key(r))).map(r=>{const kk=key(r);if(mods.has(kk)&&!used.has(kk)){used.add(kk);return clone(mods.get(kk))}return clone(r)});
  adds.sort((a,b)=>a.pos-b.pos);for(const a of adds)rows.splice(Math.min(a.pos,rows.length),0,clone(a.row));
  S.db[k]=rows;S.custom[k]=cust}
 Object.assign(S.db,keepNonDb);const m=SH.meta;
 S.db.tpl=m&&m.tpl?((m.tplV||0)>=TPL_V?clone(m.tpl):verMerge(m.tpl,TPL_DEF,tplKey)):clone(TPL_DEF);S.db.tplV=TPL_V;S.db.tags=m&&m.tags?((m.tagsV||0)>=TAGS_V?clone(m.tags):verMerge(m.tags,TAGS_DEF,tagKey)):clone(TAGS_DEF);S.db.tagsV=TAGS_V;S.db.ban=m&&m.ban!=null?m.ban:DEF.ban;{const _sv=m&&m.stplV||0;S.db.stpl=stplMigrate(m&&m.stpl?clone(m.stpl):null,_sv);S.db.stplV=STPL_V;if(_sv<4&&_sv>0)SH.purge=true}S.db.oldSock=m&&m.oldSock!=null?m.oldSock:5.5;S.db.ptItems=m&&m.ptItems?clone(m.ptItems):clone(PTI_DEF);S.db.ptiV=m&&m.ptiV||0;ptiMigrate(S.db);S.db.pride=m&&m.pride?clone(m.pride):clone(PRIDE_DEF);S.db.prideExV=m&&m.prideExV||0;prideMigrate(S.db);
 S.db.tplSoloV=m&&m.tplSoloV||0;S.db.soloSock=m&&m.soloSock?clone(m.soloSock):null;S.db.ilock=m&&Array.isArray(m.ilock)?clone(m.ilock):[];S.db.rules=m&&m.rules&&typeof m.rules==='object'?clone(m.rules):null;tplNormalize(S.db);
 for(const g in keepG)Object.assign(S.db,keepG[g]);
 SH.dbDirty=true;reindex()}
/* base = 마지막으로 맞춘 문서, mine = 지금 내 화면의 문서, theirs = 방금 받은 남의 문서. 문서 칸과 data 안의 칸 하나하나를 비교해 내가 바꾼 칸만 내 값으로. 바꾼 칸이 없으면 null */
function shMerge(base,mine,theirs){const out=clone(theirs);let any=false;
 const M=(o,b,m,top)=>{b=b||{};m=m||{};for(const k of new Set([...Object.keys(m),...Object.keys(b)])){if(top&&k==='data')continue;if(canon(m[k])===canon(b[k]))continue;any=true;if(m[k]===undefined)delete o[k];else o[k]=clone(m[k])}};
 M(out,base,mine,true);out.data=out.data||{};M(out.data,base.data,mine.data,false);return any?out:null}
function shApplyDoc(kind,id,d){
 if(kind==='trainers'){d?shPutTrainer(id,d):shDelTrainer(id);return 't'}
 if(kind==='pokemon'){d?shPutPoke(id,d):shDelPoke(id);return 't'}
 if(kind==='dbedit'){d?SH.ed.set(id,d):SH.ed.delete(id);return 'd'}
 if(kind==='meta'){if(id==='settings')SH.metaL=d||null;else if(id.startsWith('set.')){SH.metaG=SH.metaG||{};if(d)SH.metaG[id.slice(4)]=d;else delete SH.metaG[id.slice(4)]}else return '';SH.meta=shMetaMerge();return 'd'}
 if(kind==='folders'){if(d){let f=S.folders.find(x=>x.id===id);if(!f){f={id};S.folders.push(f)}f.name=String(d.name||'');f._ord=+d.ord||0;f.priv=!!d.priv;if(d.parent)f.parent=String(d.parent);else delete f.parent;if(d.deco&&typeof d.deco==='object')f.deco=d.deco;else delete f.deco;if(d.owner){f.owner=String(d.owner);f.ownerName=String(d.ownerName||'')}else{delete f.owner;delete f.ownerName}}else{S.folders=S.folders.filter(x=>x.id!==id)}return 't'}}
function shAfter(paths,what){
 if(what.t){S.trainers.forEach((t,i)=>{if(t._ord==null)t._ord=i});S.trainers.sort((a,b)=>a._ord-b._ord);S.folders.forEach((f,i)=>{if(f._ord==null)f._ord=i});S.folders.sort((a,b)=>a._ord-b._ord)}
 if(what.d)shRebuildDB();
 const want=shWant();for(const p of paths){if(want.has(p))SH.synced.set(p,canon(want.get(p)));else SH.synced.delete(p)}
 /* 병합한 문서는 「받은 그대로」를 올라간 값으로 적어 둔다 → 합친 결과가 다음 저장 때 올라간다 */
 if(SH.mergeBase&&SH.mergeBase.size){for(const [p,j] of SH.mergeBase)SH.synced.set(p,j);SH.mergeBase.clear();shSchedule(300)}
 try{lsSet(K_T,JSON.stringify({trainers:S.trainers,folders:S.folders,ui:S.ui}));if(what.d)lsSet(K_DB,JSON.stringify({db:S.db,custom:S.custom}))}catch(e){}
 shRender(what);mkmChanged()}
let shRT=null,shRW={};
function shRender(what){shRW.t=shRW.t||what.t;shRW.d=shRW.d||what.d;clearTimeout(shRT);shRT=setTimeout(()=>{const w=shRW;shRW={};
 if(drag)return shRender(w);
 if(S.ui.tab==='char'){if(w.t||w.d){const a=document.activeElement;const typing=a&&a.matches&&a.matches('input,textarea,select')&&$('#v-char').contains(a);
   if(typing){const t=trOf(a);for(const tr of S.trainers)if(tr!==t){const el=$('#tr-'+tr.id);if(el)refreshTrainer(tr)}if(t)refreshTrainer(t);if($$('#trs section.folder').length!==S.trainers.filter(trVisible).length)renderChar()}else renderChar()}}
 else if(S.ui.tab==='type'){if((w.t||w.d)&&!layers.length)renderType()}
 else if(w.d&&!layers.length){if(S.ui.tab==='db'){const q=$('#dbq');const f=q&&document.activeElement===q;renderDB();if(f){const n=$('#dbq');n.focus();n.setSelectionRange(n.value.length,n.value.length)}}else if(!$('#v-tbl').contains(document.activeElement))renderTbl()}},120)}
async function shInit(){let db=null;try{db=window.MKM_STORE?await MKM_STORE.connect():null}catch(e){console.warn('[공유 DB]',e);toast('공유 DB에 연결하지 못했습니다: '+(e&&e.message||e))}
 if(!db){if(window.MKM_RULEBOOK)try{MKM_RULEBOOK.attach(null)}catch(e){}if(window.MKM_STORE&&MKM_STORE.configured())SH.failed=true;const el=$('#saved');if(el)el.textContent=window.MKM_STORE&&MKM_STORE.configured()?'공유 DB 연결 실패 · 이 브라우저에만 저장':'이 브라우저에만 저장 (js/config.js에 공유 DB 설정 없음)';return}
 SH.db=db;SH.on=true;SH.orph=new Map();if(window.MKM_NOTES)try{MKM_NOTES.attach(db)}catch(e){}if(window.MKM_RULEBOOK)try{MKM_RULEBOOK.attach(db,()=>SH.canWrite!==false)}catch(e){}shStatus('공유 저장소 연결 중…');
 SH.canWrite=db.canWrite!==false;
 for(const kind of SH_KINDS){SH.init[kind]=false;
  db.collection(kind).onSnapshot(snap=>{
   if(!SH.ready){SH.buf[kind]=snap.docs.map(d=>[d.id,d.data()]);SH.init[kind]=true;if(SH_KINDS.every(k=>SH.init[k]))shStart();return}
   const paths=[],what={};let W=null;for(const ch of snap.docChanges()){const id=ch.doc.id,p=kind+'/'+id;let d=ch.type==='removed'?null:ch.doc.data();
    if(d){const dj=canon(d);if(SH.synced.get(p)===dj)continue;W=W||shWant();const w=W.get(p);if(w&&canon(w)===dj){SH.synced.set(p,dj);continue}}if(!d&&!SH.synced.has(p))continue;
    /* 칸 단위 3-way 병합 (점검 6-3): 아직 못 올린 내 수정이 있는 시트에 남의 저장이 오면, 내가 바꾼 칸은 내 것으로 두고 나머지 칸만 받는다. 합친 결과는 shAfter 뒤에 다시 올린다 */
    if(d&&(kind==='trainers'||kind==='pokemon')){W=W||shWant();const mine=W.get(p),bj=SH.synced.get(p);
     if(mine&&bj&&canon(mine)!==bj){const theirs=canon(d);const mg=shMerge(JSON.parse(bj),mine,d);if(mg){d=mg;(SH.mergeBase=SH.mergeBase||new Map()).set(p,theirs)}}}
    const w=shApplyDoc(kind,id,d?clone(d):null);if(w)what[w]=true;paths.push(p)}
   if(paths.length)shAfter(paths,what)},
  e=>{shErr(e);if(!SH.ready&&!SH.init[kind]){SH.initFail=true;SH.buf[kind]=[];SH.init[kind]=true;if(SH_KINDS.every(k=>SH.init[k]))shStart()}})}}   /* 처음 읽기에 실패한 종류가 있으면 읽기 전용으로 시작한다 — 빈 목록으로 보고 기본값을 올려 모두의 설정을 덮지 않게. 이미 읽은 종류의 실시간 오류는 받은 내용을 지우지 않는다 */
async function shStart(){if(SH.ready||SH.starting)return;SH.starting=true;if(SH.initFail){SH.canWrite=false;toast('공유 DB를 다 읽지 못해 읽기 전용으로 열었습니다 · 새로고침해 주세요')}
 const B=SH.buf;const empty=SH_KINDS.every(k=>!(B[k]||[]).length);
 const ui=new Map();for(const t of S.trainers){ui.set(t.id,{open:t.open});for(const p of t.pokemon)ui.set(p.id,{open:p.open,tab:p.tab})}
 if(empty){const has=S.trainers.length||Object.keys(DBS).some(k=>(S.custom[k]||[]).length);
  let up=false;
  if(!up&&has&&!SH.initFail){lsSet('mkm_local_before_share',JSON.stringify(backupObj()));saveFile('망켓몬_제작기_이_브라우저_백업.json',JSON.stringify(backupObj()))}
  if(!up&&!SH.initFail){S.trainers=SH.canWrite?[sampleTrainer()]:[];S.folders=[];SH.ed=new Map();SH.meta=null;SH.metaL=null;SH.metaG={};shRebuildDB()}
  SH.synced=new Map();SH.ready=true;SH.dbDirty=true;renderAll();await shFlush();return}
 /* 지난번 공유 DB 에 못 붙어 이 브라우저에만 저장한 수정이 있으면, 공유 DB 내용으로 바꾸기 전에 백업 파일로 남긴다 (백업 불러오기 「지금 목록에 추가」로 되살린다) */
 if(lsGet('mkm_unsynced')&&S.trainers.length){const j=JSON.stringify(backupObj());lsSet('mkm_local_before_share',j);try{saveFile(`망켓몬_제작기_미전송_${impStamp()}.json`,j)}catch(e){}toast('지난번 공유 DB에 못 올린 수정을 백업 파일로 저장했습니다')}lsSet('mkm_unsynced','');
 S.trainers=[];S.folders=[];SH.orph=new Map();SH.ed=new Map();SH.meta=null;SH.metaL=null;SH.metaG={};
 for(const [id,d] of B.folders||[])shApplyDoc('folders',id,clone(d));S.folders.sort((a,b)=>a._ord-b._ord);
 for(const [id,d] of B.meta||[])shApplyDoc('meta',id,d);for(const [id,d] of B.dbedit||[])shApplyDoc('dbedit',id,clone(d));
 for(const [id,d] of B.trainers||[])shApplyDoc('trainers',id,clone(d));for(const [id,d] of B.pokemon||[])shApplyDoc('pokemon',id,clone(d));
 for(const t of S.trainers){const u=ui.get(t.id);if(u)t.open=u.open;for(const p of t.pokemon){const v=ui.get(p.id);if(v){p.open=v.open;p.tab=v.tab}}}
 const paths=[];for(const k of SH_KINDS)for(const [id] of B[k]||[])paths.push(k+'/'+id);
 SH.synced=new Map();SH.ready=true;shAfter(paths,{t:true,d:true});if(SH.purge){SH.purge=false;SH.synced.delete('meta/set.stpl');const n=stplPurge();if(n){SH.dbDirty=true;toast(`템플릿 『계제 포텐셜』 칸 ${n}개를 비웠습니다 (종족 포텐셜로 대체)`)}}renderAll();shStatus(SH.canWrite?'연결됨 · 함께 수정 중':'읽기 전용 · 보기만 가능합니다');
 shFlush();setTimeout(shMigrateImgs,4000)}
function renderAll(){if(S.ui.tab==='char')renderChar();else refreshAll()}

const MKROOT=()=>document.getElementById('mk')||document.body;
/* ---------- 세션 노트 연동: 같은 페이지의 세션 노트가 트레이너를 바로 읽는다 ---------- */
let mkmT=null;function mkmChanged(){clearTimeout(mkmT);mkmT=setTimeout(()=>window.dispatchEvent(new CustomEvent('mkm-change')),120)}
window.MKM={bundle:()=>sessionBundle(S.trainers),
 open(id){const t=S.trainers.find(x=>x.id===id);if(!t)return false;if(S.ui.tab!=='char')showTab('char');t.open=true;save();renderChar();
  const el=document.getElementById('tr-'+id);if(el){const r=MKROOT(),hd=r.querySelector('.top');r.scrollTo({top:Math.max(0,el.getBoundingClientRect().top-r.getBoundingClientRect().top+r.scrollTop-(hd?hd.offsetHeight:0)-10)});el.classList.add('flash');setTimeout(()=>el.classList.remove('flash'),1600)}return true}};

/* ---------- 시작 ---------- */
load();
/* 10-25 망령: 오레마스 「💾 로그 → 정리기에서 열기」 = 제작기 ?tab=log&oremas=방ID — 로그 정리기 탭을 열고 그 방 로그를 바로 불러온다. 주소의 값은 한 번 쓰고 지운다 */
{const q=new URLSearchParams(location.search);const om=q.get('oremas'),tb=q.get('tab'),vw=q.get('view');if(om||tb||vw){if(om||vw){S.ui.tab='log';const f=$('#logFrame');if(f)f.src='logtool/index.html?v='+LOGV+(om?'&oremas='+encodeURIComponent(om):'')+(vw?'&view='+encodeURIComponent(vw):'')}else if(tb&&$('#v-'+tb))S.ui.tab=tb;q.delete('oremas');q.delete('tab');q.delete('view');try{history.replaceState(null,'',location.pathname+(q.toString()?'?'+q:'')+location.hash)}catch(e){}}}
showTab(S.ui.tab||'char');
loadFx();
meLoad();
shInit();
/* 아직 공유 DB 에 올라가지 않은 수정이 있으면 탭을 닫기 전에 한 번 묻는다 (그 사이 저장을 한 번 더 시도) */
window.addEventListener('beforeunload',e=>{if(!SH.on||!SH.ready||!SH.canWrite)return;let dirty=!!SH.flushing;try{if(!dirty)for(const [p,b] of shWant()){const j=canon(b);if(SH.synced.get(p)!==j&&!(SH.bad&&SH.bad.get(p)===j)){dirty=true;break}}}catch(_){}if(dirty){try{shFlush()}catch(_){}e.preventDefault();e.returnValue=''}});
/* ---------- 폰: 숫자 칸 −/+ (포인트 기본값 · 분배 레벨 · 종족치). 손가락 화면에서만 버튼이 보인다. 꾹 누르면 계속 바뀐다 ---------- */
(()=>{const RE=/\.(base\.[^.]+|dist)$/;const root=document.getElementById('v-char');if(!root)return;
 const wrap=()=>{for(const i of root.querySelectorAll('input[data-p]')){if(!RE.test(i.dataset.p)||i.parentElement.classList.contains('stp'))continue;const w=document.createElement('span');w.className='stp';i.replaceWith(w);
  const mk=d=>{const b=document.createElement('button');b.type='button';b.className='stpb';b.dataset.stp=d;b.tabIndex=-1;b.textContent=d>0?'+':'−';b.setAttribute('aria-label',d>0?'1 올리기':'1 내리기');return b};w.append(mk(-1),i,mk(1))}};
 let q=0;new MutationObserver(()=>{if(q)return;q=requestAnimationFrame(()=>{q=0;wrap()})}).observe(root,{childList:true,subtree:true});wrap();
 const step=(sel,d)=>{const i=root.querySelector(sel);if(!i)return;const v=parseFloat(i.value);i.value=String(Math.max(0,Math.round(((isNaN(v)?0:v)+d)*10)/10));i.dispatchEvent(new Event('input',{bubbles:true}))};
 let T=null;const stop=()=>{if(!T)return;clearTimeout(T.t);clearInterval(T.iv);const i=root.querySelector(T.sel);T=null;if(i)i.dispatchEvent(new Event('change',{bubbles:true}))};
 root.addEventListener('pointerdown',e=>{const b=e.target.closest('.stpb');if(!b)return;e.preventDefault();const i=b.parentElement.querySelector('input[data-p]');if(!i)return;stop();const sel=`input[data-p="${CSS.escape(i.dataset.p)}"]`;const d=+b.dataset.stp;step(sel,d);T={sel,t:setTimeout(()=>{if(T)T.iv=setInterval(()=>step(sel,d),90)},420)}});
 for(const ev of ['pointerup','pointercancel','pointerleave'])root.addEventListener(ev,e=>{if(T&&(ev!=='pointerleave'||e.target.closest&&e.target.closest('.stpb')))stop()},true);
 root.addEventListener('click',e=>{if(e.target.closest('.stpb'))e.preventDefault()})})();
