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
/* 포텐셜 종류 표기를 「번호. 이름」 하나로 (00.1.역할 → 00.1. 역할, 14.특권 → 14. 특권). 필터·템플릿 매칭이 갈라지지 않게 */
const normKind=k=>String(k==null?'':k).replace(/^(\d+(?:\.\d+)*\.)\s*(?=\S)/,'$1 ');
for(const r of DEF.pots||[])if(r)r[0]=normKind(r[0]);
/* 제작기에서 고친 레디메이드 → fx.js 가 기본 대신 쓴다 (행이 바뀐 것만 다시 파싱) */
const RMC=new Map();window.MKM_RM=()=>{const rows=(S&&S.db&&S.db.rm)||[];const out={};for(const r of rows){const key=r[0];if(!key)continue;const sig=r[1]+'\u0001'+r[2]+'\u0001'+r[3];let c=RMC.get(key);if(!c||c.sig!==sig){c={sig,v:{text:r[1]||'',ops:window.OM_FX?window.OM_FX.parse(r[2]||'').ops:[],manual:r[3]==='O'?1:0}};RMC.set(key,c)}out[key]=c.v}return out};
/* 레디메이드 DB: data/readymade.js 를 행으로 (이름 · 효과 글 · 구문 · 손으로). 수정은 다른 DB 처럼 dbedit 로 공유되고, 오레마스가 「제작기 새로고침」으로 가져간다 */
if(!Array.isArray(DEF.rm))DEF.rm=[];/* 행은 fx 스크립트를 불러온 뒤 rmInit 이 채운다 */
function rmInit(){if(!(window.OM_DB&&window.OM_DB.readymade&&window.OM_FX))return false;if(!DEF.rm||!DEF.rm.length){DEFJ=null;DEF.rm=Object.keys(window.OM_DB.readymade).sort((a,b)=>a.localeCompare(b,'ko')).map(n=>{const r=window.OM_DB.readymade[n];return [n,String(r.text||''),window.OM_FX.unparse(r.ops||[]).join('\n'),r.manual?'O':'']})}
 /* 공유 모드: 레디메이드 기본 행이 이제 생겼으니 받아 둔 수정 행(dbedit/rm.*)을 그 위에 다시 짠다 */
 let shr=false;try{shr=SH.ready}catch(e){}if(shr){shRebuildDB();return true}
 if(S.db&&(!S.db.rm||!S.db.rm.length)){S.db.rm=clone(DEF.rm);if(!S.custom.rm)S.custom.rm=[];reindex()}return true}
const rmLoaded=()=>!!(DEF.rm&&DEF.rm.length);

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
const TPL_DEF=[
 ['공통','*','메인','4','기존 시트 기본값','4'],
 ['통솔','D','통솔점','6','룰북 · 1인(2체)은 6체의 1/3 반올림','2'],['통솔','C','통솔점','6','룰북 · 1인(2체)은 6체의 1/3 반올림','2'],['통솔','B-','통솔점','7','룰북 · 1인(2체)은 6체의 1/3 반올림','2'],['통솔','B','통솔점','8','룰북 · 1인(2체)은 6체의 1/3 반올림','3'],['통솔','A','통솔점','10','룰북 · 1인(2체)은 6체의 1/3 반올림','3'],['통솔','AA','통솔점','12','룰북 · 1인(2체)은 6체의 1/3 반올림','4'],
 ['육성','D','분배레벨','5','룰북 · 1인(2체)은 6체의 1/3 반올림','2'],['육성','C','분배레벨','10','룰북 · 1인(2체)은 6체의 1/3 반올림','3'],['육성','B-','분배레벨','10','룰북 · 1인(2체)은 6체의 1/3 반올림','3'],['육성','B','분배레벨','15','룰북 · 1인(2체)은 6체의 1/3 반올림','5'],['육성','A','분배레벨','20','룰북 · 1인(2체)은 6체의 1/3 반올림','7'],
 ['공통','*','「기술 할인점」','6','공통 요소 · 1인(2체)은 6의 1/3 = 2','2'],['공통','*','【1/시】','3','공통 요소 · 1인은 1','1']
];
const TPL_V=3;
/* 1인 기준(2체)의 PT 기술점 · 육성 랭크별. 테이블·계산식 탭에서 고친다 */
const SOLO_SOCK_DEF={D:'11',C:'11.5',B:'12',A:'12.5'};
/* 템플릿 행을 [자질,랭크,항목,값(6체),비고,값(1인)] 6칸으로 맞추고, 빈 1인 값은 기본값(없으면 6체 값)으로 채운다. 로컬·공유 저장소 어느 쪽에서 왔든 같은 처리 */
function tplNormalize(db){const strip0=r=>String(r||'').replace(/[+-]/g,'');
 if(!Array.isArray(db.tpl))db.tpl=clone(TPL_DEF);
 for(const r of db.tpl)while(r.length<6)r.push('');
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
 items:{t:'소지품',key:1,cols:['종류','도구','별칭','소모(O)','효과','소켓','비고'],show:[1,0,2,3,5,4,6],eff:4},
 pots:{t:'포텐셜',key:1,cols:['종류(순서)','이름','효과','비고'],show:[1,0,2,3],eff:2},
 old:{t:'올드 타입',key:1,cols:['지역','포켓몬','Name','타입1','타입2','특성1','특성2','숨겨진 특성','알그룹1','알그룹2','메가','HP','공격','방어','특공','특방','스피드'],show:[1,0,3,4,5,6,7,8,9,11,12,13,14,15,16],eff:-1},
 points:{t:'포인트',key:4,cols:['번호','분류','세부','소모 항목','이름','효과','소모 포인트','상시 공개'],show:[4,1,2,3,6,5,7],eff:5},
 rm:{t:'레디메이드',key:0,cols:['이름','효과 글','구문','손으로'],show:[0,1,2,3],eff:1}
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
 if(!S.db.tags||(S.db.tagsV||0)<TAGS_V){S.db.tags=clone(TAGS_DEF);S.db.tagsV=TAGS_V}
 S.custom.old=S.custom.old||[];for(const k in DBS)if(!S.custom[k])S.custom[k]=[];
 if(S.db.oldSock==null)S.db.oldSock=5.5;
 if(!S.db.ptItems)S.db.ptItems=clone(PTI_DEF);
 if(!S.db.pride)S.db.pride=clone(PRIDE_DEF);prideMigrate(S.db);ptiMigrate(S.db);
 if(!S.db.tpl||(S.db.tplV||0)<TPL_V){S.db.tpl=clone(TPL_DEF);S.db.tplV=TPL_V}
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
function lv(t,p){return baseLevel(t.ranks['육성'])+(+p.dist||0)}
/* 테이블(더블) Q198:Q203 — 개체치·노력치·성격 미사용(0 / 0 / 1.0) */
function stat(t,p,i){const b=+p.base[i]||0,L=lv(t,p);const core=Math.floor(Math.floor(b*2)*(L/100));return i===0?core+10+L:core+5}
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
 if(!OLDK.includes(k)&&dualType(p)){const fr=filled.map(m=>moveSock(p,m)).filter(v=>v<=1);if(fr.length)used-=Math.max(...fr)}
 let mode='socket',cap;
 if(OLDK.includes(k)){mode='count';cap=4;return {used:filled.length,cap:p.sockMax!==''&&p.sockMax!=null?+p.sockMax:cap,mode,auto:cap,pt:oldSock()}}
 if(['적응종','델타종'].includes(k))cap=7;
 else{const gs=S.db.sock.map(x=>x[0]);const g=s=>{const m=(grade(s)||'').match(/[A-Z]+/);const i=m?gs.indexOf(m[0]):-1;return i<0?99:i};
  const i=Math.min(g(p.base[1]),g(p.base[3]));
  if(i===99)cap=null;else{const tot=p.base.reduce((a,b)=>a+(+b||0),0);cap=+S.db.sock[i][tot>=570?3:tot>=525?2:1]}}
 const ov=p.sockMax!==''&&p.sockMax!=null;return {used,cap:ov?+p.sockMax:cap,mode,auto:cap,ov}}
const oldSock=()=>{const v=+(S.db.oldSock??5.5);return isNaN(v)?5.5:v};
const capTxt=(c,none='-',sep=' / ')=>c.mode==='count'?`${c.used}개(${c.pt})`:`${c.used}${sep}${c.cap??none}`;
function ptSockets(t){let u=0;for(const p of t.pokemon){const c=moveCap(t,p);u+=c.mode==='count'?c.pt:c.used}return Math.round(u*100)/100}
/* 룰북 「포켓몬 제작」: 프라이드 표 — 테이블·계산식 탭에서 고친다 */
const PRIDE_DEF={rows:[['C','480','1','1','40','50','괄호 값: 종족치 525 · 특성 TO 0.5'],['B','525','2','1','45','55','괄호 값: 종족치 480 · 특성 TO 1.5'],['A','570','3','1.5','50','60','괄호 값: 종족치 525 · 특성 TO 2'],['EX','630','4','2','55','65','본가 전설종 또는 그에 준하는 스펙']],hiCap:600,fire:110,dual:95,sum3:150,friendly:6};
const PR=()=>(S.db&&S.db.pride)||PRIDE_DEF;
function prideMigrate(db){const pr=db&&db.pride;if(!pr||!Array.isArray(pr.rows)||db.prideExV)return;if(!pr.rows.some(r=>r[0]==='EX'))pr.rows.push(clone(PRIDE_DEF.rows.find(r=>r[0]==='EX')));db.prideExV=1}
const prRow=k=>PR().rows.find(r=>r[0]===k);
const isOld=p=>OLDK.includes(classOf(p));
const baseTot=p=>p.base.reduce((a,b)=>a+(+b||0),0);
function prideAuto(p){const tot=baseTot(p);const rows=[...PR().rows].filter(r=>r[0]).sort((a,b)=>+a[1]-+b[1]);if(!rows.length)return 'C';if(!tot)return rows[0][0];
 if(isOld(p)){let r=rows[0];for(const x of rows)if(+x[1]<=tot)r=x;return r[0]}
 const s=abSock(p);const fit=s==null?rows:rows.filter(x=>s<=planOf(x,s).to);const cand=fit.length?fit:rows;
 let best=cand[0];for(const x of cand)if(Math.abs(tot-planOf(x,s).tot)<=Math.abs(tot-planOf(best,s).tot))best=x;return best[0]}
/* 룰북 「포켓몬 제작」 괄호 값: 특성 소켓에 따라 종족치 합과 특성 TO가 바뀐다 (C 525·0.5 / B 480·1.5 / A 525·2). 값은 프라이드 표 비고 칸에서 읽는다 */
function prideAlt(r){const m=String(r&&r[6]||'').match(/종족치\s*(\d+)[^\d]*?특성\s*TO\s*([\d.]+)/);return m?{tot:+m[1],to:+m[2]}:null}
function abSock(p){const ab=idx.abil&&idx.abil.get(p.ability);return ab&&ab[0]!==''&&!isNaN(+ab[0])?+ab[0]:null}
function planOf(r,s){const b={tot:+r[1],to:+r[3],alt:false};const a=prideAlt(r);if(!a||s==null)return b;const A={tot:a.tot,to:a.to,alt:true};if(a.to>b.to)return s>b.to&&s<=a.to?A:b;return s<=a.to?A:b}
function planTot(p){if(isOld(p))return null;const r=prRow(prideOf(p));return r?planOf(r,abSock(p)):null}
function planRange(p){const pl=planTot(p);if(!pl)return null;const hi=prideOf(p)==='A'&&!pl.alt?Math.max(pl.tot,+PR().hiCap||pl.tot):pl.tot;return {lo:pl.tot,hi,alt:pl.alt,to:pl.to}}
function prideOf(p){const v=strip(p.pride);return prRow(v)?v:prideAuto(p)}
const prideIsAuto=p=>!prRow(strip(p.pride));
/* 룰북: 프라이드 C/B/A/EX = 통솔점 1/2/3/4, 통솔 C 이상이면 파트너는 1점 할인 */
function prideCost(t,p){const r=prRow(prideOf(p));const c=r?+r[2]||0:0;return Math.max(0,c-(p.partner&&(RV[strip(t.ranks['통솔'])]??0)>=0?1:0))}
/* 메인: 자질을 C에서 한 단계 올릴 때마다 1점 */
function dualType(p){const pr=PR();const a=+p.base[1]||0,c=+p.base[3]||0;if(a<pr.dual||c<pr.dual)return false;
 const cats=new Set(p.moves.filter(m=>m.name).map(m=>(idx.moves.get(m.name)||[])[6]));return cats.has('물리')&&cats.has('특수')}
function pokeChecks(t,p){const out=[],pr=PR(),pk=prideOf(p),row=prRow(pk);const tot=baseTot(p);const w=(x)=>out.push({w:1,t:x}),i=(x)=>out.push({w:0,t:x});
 if(!tot)return out;
 i(`종족치 합 ${tot} → 프라이드 ${pk}${prideIsAuto(p)?` (자동 · ${isOld(p)?'올드 타입이라 버림':'반올림'})`:' (직접 지정)'} · 통솔점 ${prideCost(t,p)}`);
 if(pk==='A'&&tot>pr.hiCap)w(`프라이드 A는 종족치 합 ${pr.hiCap}까지입니다 · 그 이상은 EX`);
 if(pk==='EX')i(`프라이드 EX · 본가 전설종이나 그에 준하는 스펙 자리입니다`);
 if(!row)return out;
 const ab=idx.abil.get(p.ability);const pl=planRange(p);if(ab&&ab[0]!==''&&!isNaN(+ab[0])&&!isOld(p)&&pl){if(+ab[0]>pl.to)w(`특성 소켓 ${ab[0]}이(가) 특성 TO ${pl.to}을(를) 넘습니다`);else i(`특성 소켓 ${ab[0]} / 특성 TO ${pl.to}${pl.alt?' (괄호 값 적용)':''}`)}
 if(pl&&(tot<pl.lo||tot>pl.hi))w(`종족치 합 ${tot} · 규칙상 예정 합계 ${pl.lo}${pl.hi!==pl.lo?'~'+pl.hi:''}${pl.alt?` (특성 소켓 ${abSock(p)} → 괄호 값)`:''}`);
 const old=isOld(p);const mn=+row[4];if(!old){const low=p.base.map((v,k)=>[STATS[k],+v||0]).filter(([,v])=>v<mn);if(low.length)w(`최소종족치 ${mn} 미만: ${low.map(([n,v])=>n+' '+v).join(', ')}`);
 const atMin=p.base.filter(v=>v!==''&&grade(+v)===grade(mn)).length;if(atMin>1)w(`최소종족치(${grade(mn)}) 구간의 종족치가 ${atMin}개입니다 · 1체당 1개만`)}
 const s3=(+p.base[1]||0)+(+p.base[3]||0)+(+p.base[5]||0);if(!old&&s3<pr.sum3)w(`공격+특공+스피드 합 ${s3} · 최소 ${pr.sum3}`);
 const fire=+row[5];const A=+p.base[1]||0,C=+p.base[3]||0;
 if(!old&&A>=pr.fire&&C<fire)w(`화력균형: 공격 ${A}(고화력)이라 특공이 ${fire} 이상이어야 합니다 (현재 ${C})`);
 if(!old&&C>=pr.fire&&A<fire)w(`화력균형: 특공 ${C}(고화력)이라 공격이 ${fire} 이상이어야 합니다 (현재 ${A})`);
 if(dualType(p))i(`쌍두형: 기술 소켓 1 이하 기술 1개 무료 (자동 반영)`);
 if(p.pots.some(n=>n&&/포켓\s*파워/.test(n)))w('『포켓 파워』 속별은 금지입니다');
 {const fl=+(prRow('C')||[0,480])[1]+(+pr.friendly||0);if(isOld(p)&&tot<=fl)i(`『프렌들리 몬스터』 취득 가능 (종족치 합 ${tot} ≤ ${fl})`)}
 return out}
function ptChecks(t){const n=t.pokemon.filter(p=>p.base.filter(v=>v!==''&&/^D/.test(grade(+v))).length>=2).length;return n>1?[`D 등급 종족치가 2개 이상인 포켓몬이 ${n}체입니다 · 여러 체 넣지 않습니다`]:[]}
const rankSteps=t=>QUAL.reduce((a,q)=>a+Math.max(0,RV[strip(t.ranks[q])]??0),0);
const discUsed=t=>t.pokemon.reduce((a,p)=>a+p.moves.filter(m=>m.name&&m.half).length,0);
function ptMaxDef(t){if(t.solo){const v=(S.db.soloSock||{})[strip(t.ranks['육성'])];if(v!=null&&v!=='')return +v}const r=sockRow(t.ranks['육성']);return r?+r[4]:0}
function ptMax(t){if(t.ptMax!==''&&t.ptMax!=null)return +t.ptMax;return ptMaxDef(t)}
/* 트레이너 포인트 항목: [이름, 기본값, 자동 소모 방식] — 테이블·계산식 탭에서 고친다 */
const PTI_DEF=[['메인','4','rank'],['통솔점','6','pride'],['「기술 할인점」','6','disc'],['【1/시】','3','once'],['분배레벨','10','dist']];
function ptiMigrate(db){if((db.ptiV||0)<1){for(const r of db.ptItems||[])if(r[0]==='【1/시】'&&!r[2])r[2]='once';db.ptiV=1}}
const PTI_AUTO={'':'없음',rank:'자질 투자 (C에서 한 단계당 1)',pride:'포켓몬 프라이드 (C1·B2·A3·EX4, 파트너 −1)',disc:'기술 「할인」 체크 수',dist:'포켓몬 분배 레벨 합',once:'포켓몬 【1/시】 포텐셜 수 (전용 제외)'};
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
function rulesDef(){return {invest:clone(INVEST_DEF),abil:clone(ABIL_DEF),ty:Object.entries(TY_CHART).map(([a,c])=>[a,c[0].join(','),c[1].join(','),c[2].join(',')])}}
function rulesNormalize(db){const d=rulesDef();if(!db.rules||typeof db.rules!=='object'||Array.isArray(db.rules))db.rules={};const R=db.rules;
 if(!R.invest||typeof R.invest!=='object')R.invest={};for(const k in d.invest)if(R.invest[k]==null)R.invest[k]=d.invest[k];
 if(!Array.isArray(R.abil)||!R.abil.length)R.abil=d.abil;for(const r of R.abil)while(r.length<7)r.push('');
 if(!Array.isArray(R.ty)||!R.ty.length)R.ty=d.ty;for(const r of R.ty)while(r.length<4)r.push('');return R}
const RULES=()=>{const R=S.db&&S.db.rules;return R&&R.invest&&Array.isArray(R.abil)&&Array.isArray(R.ty)?R:rulesNormalize(S.db)};
function abilRow(r){const L=RULES().abil;return L.find(x=>x[0]===r)||L.find(x=>x[0]===strip(r))||L.find(x=>x[0]==='C')||ABIL_DEF[1]}
const uniqNeed=r=>{const n=parseInt(abilRow(r)[1],10);return n>=0?n:1};
function abilLimits(r,solo){const a=abilRow(r);if(solo)return {u:a[2],x:+a[5]||0,xs:a[6]+' · 1인 기준'};return abilLimitsBase(r)}
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
완화 ×0.75 … (받는 쪽, 위력과 같은 조건)
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
 const ab=idx.abil&&idx.abil.get(p.ability),it=idx.items&&idx.items.get(p.item);
 const hasBase=p.base.some(v=>v!==''&&v!=null);
 const moves=p.moves.filter(m=>m.name).map(m=>{const r=idx.moves.get(m.name)||[];const g=i=>r[i]??'';useT(g(5));
  return {name:m.name,type:g(5),cat:g(6),pow:String(g(7)),acc:String(g(8)),range:g(9),contact:g(10),prio:String(g(11)),eff:brN(g(13)),sock:String(g(0))}});
 return {id:p.id,name:p.name||'',gender:p.gender||'-',lv:lv(t,p),types:tys,tera:p.tera||'-',ability:p.ability||'',abilEff:ab?brN(ab[2]):'',item:p.item||'',itemEff:it?brN(it[4]):'',
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
window.OM_APP=window.OM_APP||{openModal:h=>openModal(h,{wide:true}),closeModal:()=>closeModal(),toast:t=>toast(t),ST:{role:'player',state:{}},set:async()=>false};
let fxLoadP=null,FXST='';/* '' 불러오는 중 · ok · fail */
function loadFx(){if(fxReady())return Promise.resolve(true);if(fxLoadP)return fxLoadP;
 const one=src=>new Promise((res,rej)=>{const s=document.createElement('script');s.src=FX_SRC+src;s.onload=()=>res();s.onerror=()=>rej(new Error(src));document.head.appendChild(s)});
 FXST='';fxLoadP=(async()=>{try{await one('states.js');await one('readymade.js');await one('fx.js');await one('fx_ui.js');FXST='ok';rmInit();if(S.ui&&S.ui.tab)refreshAll();return true}catch(e){console.warn('[구문] 자동화 스크립트를 불러오지 못함',e);FXST='fail';toast('자동화 구문 스크립트를 불러오지 못했습니다 · 「구문 ⟳」을 눌러 다시 시도');if(S.ui&&S.ui.tab)refreshAll();return false}})();return fxLoadP}
function fxRetry(){if(fxReady())return;fxLoadP=null;toast('구문 스크립트를 다시 불러옵니다…');loadFx();if(S.ui&&S.ui.tab)refreshAll()}
document.addEventListener('click',e=>{const b=e.target.closest&&e.target.closest('[data-fxretry]');if(!b)return;e.preventDefault();e.stopPropagation();fxRetry()},true);
const fxRetryBtn=()=>FXST==='fail'?'<button type="button" class="btn sm ghost" data-fxretry title="자동화 구문 스크립트를 불러오지 못했습니다 — 눌러서 다시 시도">구문 ⟳</button>':'';
function fxEffOf(p,kind,name,slot){if(kind==='trait'){const r=idx.abil.get(name);return r?r[2]:''}if(kind==='item'){const r=idx.items.get(name);return r?r[4]:''}
 if(slot==='excl')return p.excl.eff||'';if(typeof slot==='string'&&slot[0]==='x'){const x=(p.exclX||[])[+slot.slice(1)];return x?x.eff:''}if(typeof slot==='number')return potEffOf(p,slot);const i=p.pots.indexOf(name);return i>=0?potEffOf(p,i):''}
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
 const rows=all.filter(r=>{const tg=stplTarget(r.tg,t&&t.solo);if(tg.partner&&!p.partner)return false;
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
 base:Array(6).fill(''),ev:Array(6).fill(''),pots:Array(20).fill(''),potEff:Array(20).fill(''),potKind:Array(20).fill(''),excl:{name:'',eff:''},exclX:[],moves:[],sockMax:'',memo:'',image:'',stands:[],standActive:0,partner:false,auto:{}}}
function fixP(p){const n=newPoke();for(const k in n)if(p[k]==null)p[k]=n[k];
 for(const k of ['pots','potEff','potKind'])while(p[k].length<20)p[k].push('');
 p.moves=(p.moves||[]).filter(m=>m&&m.name);p.exclX=(Array.isArray(p.exclX)?p.exclX:[]).filter(x=>x&&typeof x==='object').map(x=>({name:String(x.name||''),eff:String(x.eff||'')}));delete p.iv;delete p.nature;p.image=safeImg(p.image);p.stands=standsFix(p.stands);if(!(+p.standActive>=0)||+p.standActive>=p.stands.length)p.standActive=0;p.potKind=p.potKind.map(k=>k?normKind(k):'');if(!p.auto||typeof p.auto!=='object')p.auto={};if(!p.id)p.id=uid();return p}
const standsFix=a=>(Array.isArray(a)?a:[]).filter(x=>x&&typeof x==='object'&&/^https?:\/\//.test(String(x.src||''))).map(x=>Object.assign({label:String(x.label||'기본').slice(0,40),src:String(x.src),point:+x.point||0},x.kind==='stand'||x.kind==='portrait'?{kind:x.kind}:{}));
function newTrainer(){const t={id:uid(),open:true,name:'새 트레이너',kind:'pc',pl:'',folder:'',image:'',ranks:{지시:'C',육성:'C',통솔:'C',능력:'C'},detail:{지시:'',육성:'',통솔:'',능력:''},solo:false,
 pts:[],extra:{},base:Object.fromEntries(ptItems().map(([n,d])=>[n,+d||0])),unique:[{name:'',eff:''}],ptMax:'',pokemon:[]};applyTpl(t);return t}
function fixT(t){if(t.base)delete t.base['소지품 소켓'];const n=newTrainer();for(const k in n)if(t[k]==null)t[k]=n[k];for(const k in n.base)if(t.base[k]==null)t.base[k]=n.base[k];
 if(t.extra){for(const k in t.extra)if(!+t.extra[k])delete t.extra[k]}t.image=safeImg(t.image);if(!t.id)t.id=uid();t.stands=standsFix(t.stands);if(!(+t.standActive>=0))t.standActive=0;t.pokemon.forEach(fixP);return t}
/* 같은 id가 두 번 나오면(예전 백업을 「추가」로 불러온 경우 등) 뒤의 것에 새 id를 준다 */
function dedupeIds(){const seen=new Set();for(const t of S.trainers){if(seen.has('t'+t.id))t.id=uid();seen.add('t'+t.id);for(const p of t.pokemon){if(seen.has('p'+p.id))p.id=uid();seen.add('p'+p.id)}}}
function applyTpl(t,only){const rows=S.db.tpl;for(const r of rows){const [q,rk,item,v6,,v1]=r;const val=t.solo&&v1!=null&&v1!==''?v1:v6;if(!item)continue;
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
function ask(msg,okLabel='확인',danger=true){return new Promise(res=>{const l=openModal(`<div class="mhead"><h2>확인</h2></div><div class="mbody"><p style="margin:0">${msg}</p></div><div class="mfoot"><span class="sp"></span><button class="btn" data-x="no" ${danger?'autofocus':''}>취소</button><button class="btn ${danger?'acc':'pri'}" data-x="ok" ${danger?'':'autofocus'}>${okLabel}</button></div>`,{onClose:()=>res(false)});
 l.addEventListener('click',e=>{const x=e.target.dataset.x;if(!x)return;layers[layers.length-1].onClose=null;closeModal();res(x==='ok')})})}
async function copyStr(s){try{await navigator.clipboard.writeText(s);toast('복사했습니다')}catch(e){const l=openModal(`<div class="mhead"><h2>직접 복사</h2></div><div class="mbody"><p class="small muted" style="margin:0">자동 복사가 막혀 있습니다. 아래 내용을 선택해 복사하세요.</p><textarea rows="6" readonly>${esc(s)}</textarea></div><div class="mfoot"><span class="sp"></span><button class="btn" data-x>닫기</button></div>`);const ta=$('textarea',l);ta.select();l.addEventListener('click',e=>{if(e.target.dataset.x!=null)closeModal()})}}
async function saveFile(filename,data){
 try{if(window.claude&&claude.use){const d=await claude.use('downloads');if(d){await d.save({filename,data});return}}}catch(e){if(e&&e.code==='declined')return toast('저장을 취소했습니다');}
 try{const blob=data instanceof Blob?data:new Blob([data]);const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=filename;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(a.href),4000)}catch(e){toast('이 화면에서는 파일 저장을 할 수 없습니다')}}
function rich(s){return esc(brN(s)).replace(/\\n|\n/g,'<br>').replace(/【([^】]*)】/g,'<span class="tg">$1</span>')}
const banRe=()=>{try{return S.db.ban?new RegExp(S.db.ban):null}catch(e){return null}};
function banHits(s){const re=banRe();if(!re||!s)return [];const g=new RegExp(re.source,'g');return [...new Set(String(s).match(g)||[])]}

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
 if(kind==='moves')return `<div tabindex="0" role="button" data-kbd class="pkr ${sel?'sel':''}" data-pick="${esc(r[2])}"><div><div class="t1">${tchip(r[5])}<b>${esc(r[2])}</b><span class="kindb">${esc(r[6])}</span>${S.custom.moves.includes(r[2])?'<span class="kindb">오리지널</span>':''}</div><div class="t2">${rich(r[13])}</div></div><div class="meta">${rangeGrid(r[9])}<span>위력 ${esc(r[7])} · 명중 ${esc(r[8])}</span><span>${esc(r[9])} · 우선도 ${esc(r[11])} · 소켓 <b>${esc(r[0])}</b></span></div></div>`;
 if(kind==='abil')return `<div tabindex="0" role="button" data-kbd class="pkr ${sel?'sel':''}" data-pick="${esc(r[1])}"><div><div class="t1"><b>${esc(r[1])}</b>${r[3]==='O'?'<span class="kindb">틀깨기 대상</span>':''}${r[4]==='O'?'<span class="kindb">방호</span>':''}${fxRmChip('trait',r[1])}</div><div class="t2">${rich(r[2])}</div></div><div class="meta">소켓 <b>${esc(r[0])}</b></div></div>`;
 if(kind==='items')return `<div tabindex="0" role="button" data-kbd class="pkr ${sel?'sel':''}" data-pick="${esc(r[1])}"><div><div class="t1"><b>${esc(r[1])}</b><span class="kindb">${esc(r[0])}</span>${r[3]==='O'?'<span class="kindb">소모</span>':''}${ilockChip(r[1])}${fxRmChip('item',r[1])}</div><div class="t2">${rich(r[4])}${r[6]&&r[6]!=='-'?` <span class="faint">· ${esc(r[6])}</span>`:''}</div></div><div class="meta">소켓 <b>${esc(r[5])}</b></div></div>`;
 if(kind==='old'){const tot=r.slice(11,17).reduce((a,b)=>a+(+b||0),0);return `<div tabindex="0" role="button" data-kbd class="pkr ${sel?'sel':''}" data-pick="${esc(r[1])}"><div><div class="t1">${tchip(r[3])}${tchip(r[4])}<b>${esc(r[1])}</b>${r[10]==='O'?'<span class="kindb">메가</span>':''}<span class="kindb">${esc(r[0])}</span></div><div class="t2">${[r[5],r[6],r[7]].filter(a=>a&&a!=='-').map(esc).join(' / ')} · 알그룹 ${esc(r[8])}${r[9]&&r[9]!=='-'?' / '+esc(r[9]):''} <span class="faint">${esc(r[2])}</span></div></div><div class="meta num"><span>${r.slice(11,17).map(esc).join('-')}</span><span>합 <b>${tot}</b></span></div></div>`}
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
  if(e.target.closest('[data-more]')){st.lim+=200;draw();return}
  if(e.target.closest('[data-xfreset]')){st.f={};st.pmin='';st.pmax='';st.kind='';st.cat='';st.type='';draw();return}
  const r=e.target.closest('[data-pick]');if(r){onPick(r.dataset.pick);draw()}});
 draw();return draw}
function pickerShell(kind,st){return `<div class="row pkhead"><input data-pkq type="search" enterkeyhint="search" placeholder="${DBS[kind].t} 이름·효과 검색" value="${esc(st.q)}" style="flex:1" autofocus><span class="small muted" data-pkcount></span><button type="button" class="btn sm ftog" data-pkftog aria-expanded="false">필터<b class="fn" data-pkfn></b></button></div><div class="fwrap" data-pkfwrap><div data-pkfilters></div></div><div class="pkrows" data-pkrows></div>`}
/* 필터를 다시 그려도 쓰던 칸에 초점과 커서를 돌려놓는다 */
function keepFocus(root,fn){const a=document.activeElement;let key=null,ss=null,se=null;
 if(a&&root.contains(a)){for(const at of ['data-xf','data-pr','data-fc','data-fk','data-fn','data-fm','data-ft','data-pkq'])if(a.hasAttribute(at)){key=`[${at}${a.getAttribute(at)?`="${CSS.escape(a.getAttribute(at))}"`:''}]`;break}
  if(!key&&a.id)key='#'+CSS.escape(a.id);try{ss=a.selectionStart;se=a.selectionEnd}catch(e){}}
 fn();if(!key)return;const n=root.querySelector(key);if(n&&n!==document.activeElement){n.focus({preventScroll:true});try{if(ss!=null)n.setSelectionRange(ss,se)}catch(e){}}}
function fCount(kind,st){let n=Object.values(st.f||{}).filter(Boolean).length;for(const k of ['type','cat','kind'])if(st[k])n++;if(st.pmin!==''&&st.pmin!=null)n++;if(st.pmax!==''&&st.pmax!=null)n++;if(st.mine)n++;return n}
function openPicker(kind,{title,multi,chosen,onPick,onRemove}={}){
 const st={q:'',lim:120,type:'',cat:'',kind:'',mine:false,nameOnly:false,f:{},pmin:'',pmax:''};
 const l=openModal(`<div class="mhead"><h2>${esc(title||DBS[kind].t+' 선택')}</h2><span class="sp"></span><button class="btn ghost" data-x>닫기</button></div>
  <div class="mbody">${pickerShell(kind,st)}${multi?'<p class="small muted" style="margin:0">클릭하면 추가되고, 이미 추가된 항목(파란색)을 다시 누르면 빠집니다. 창은 닫기 전까지 열려 있습니다.</p>':''}</div>
  <div class="mfoot"><button class="btn" data-orig>+ 오리지널 ${DBS[kind].t} 만들기</button><span class="sp"></span><button class="btn pri" data-x>${multi?'완료':'닫기'}</button></div>`,{wide:true});
 const redraw=mountPicker(l,kind,st,{chosen,onPick:n=>{if(multi&&chosen&&chosen().has(n)&&onRemove)onRemove(n);else onPick(n);if(!multi)closeModal()}});
 l.addEventListener('click',e=>{if(e.target.closest('[data-x]'))closeModal();
  if(e.target.closest('[data-orig]'))openEdit(kind,-1,{preset:{[DBS[kind].key]:st.q},onSaved:n=>{onPick(n);if(multi)redraw();else closeModal()}})})}

/* ---------- DB 항목 편집 ---------- */
function fieldHTML(kind,n,v){const c=DBS[kind].cols[n];const id=`f-${kind}-${n}`;
 if(kind==='rm'&&n===2)return `<label class="lbl" for="${id}" style="grid-column:1/-1">${c} <span class="small muted">한 줄에 명령 하나 · 오레마스 자동화</span><textarea id="${id}" data-f="${n}" rows="5" style="font-family:var(--mono,monospace);font-size:12.5px">${esc(v||'')}</textarea><span class="small" data-rmprev></span><details><summary class="small">구문 도움말</summary><pre class="small" style="white-space:pre-wrap">${esc(typeof AUTO_HELP==='string'?AUTO_HELP:'')}</pre></details></label>`;
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
 <div class="mfoot">${i>=0?'<button class="btn danger" data-del>삭제</button>':''}<span class="sp"></span><button class="btn" data-x>취소</button><button class="btn pri" data-save>저장</button></div>`,{wide:true});
 const rgi=kind==='moves'?$('[data-f="9"]',l):null;if(rgi)rgi.addEventListener('input',()=>{$('[data-rg]',l).innerHTML=rangeGrid(rgi.value)});
 if(kind==='rm'&&window.OM_FX){const ds=$('[data-f="2"]',l),pv=$('[data-rmprev]',l);const up=()=>{const r=window.OM_FX.parse(ds.value);pv.innerHTML=(r.ops.length?'미리보기: '+esc(window.OM_FX.unparse(r.ops).join(' / ')):'<span class="muted">구문 없음</span>')+(r.errs&&r.errs.length?` <span class="warn">모르는 줄: ${esc(r.errs.join(' / '))}</span>`:'')};ds.addEventListener('input',up);up()}
 const ta=D.eff>=0?$(`[data-f="${D.eff}"]`,l):null;
 if(ta){bindTagbar(l,()=>ta);
 const upd=()=>{$('[data-prev]',l).innerHTML='<span class="small faint">미리보기</span><br>'+rich(ta.value);const h=banHits(ta.value);$('[data-banwarn]',l).innerHTML=(h.length?`<span class="warn">금지 키워드: ${h.map(esc).join(', ')}</span>`:'')+lintHTML(ta.value)};
 ta.addEventListener('input',upd);upd()}
 const okey=i>=0?r[D.key]:null;const cur=()=>okey==null?-1:S.db[kind].findIndex(x=>x[D.key]===okey);
 l.addEventListener('click',async e=>{if(e.target.closest('[data-x]'))return closeModal();
  if(e.target.closest('[data-del]')){if(await ask(`「${esc(r[D.key])}」을(를) DB에서 삭제할까요?`,'삭제')){const ii=cur();if(ii>=0)S.db[kind].splice(ii,1);reindex();save(true);closeModal();refreshAll()}return}
  if(e.target.closest('[data-save]')){if(okey!=null){i=cur();if(i<0)return toast('이 항목은 다른 사람이 지웠습니다')}const nr=D.cols.map((_,n)=>{const el=$(`[data-f="${n}"]`,l);return el?el.value:''});nr[D.key]=nr[D.key].trim();
   if(!nr[D.key])return toast(D.cols[D.key]+'을(를) 입력하세요');
   const dup=S.db[kind].findIndex(x=>x[D.key]===nr[D.key]);if(dup>=0&&dup!==i)return toast('같은 이름이 이미 DB에 있습니다');
   if(i<0){S.db[kind].unshift(nr);if(!S.custom[kind].includes(nr[D.key]))S.custom[kind].push(nr[D.key])}
   else{const old=S.db[kind][i][D.key];S.db[kind][i]=nr;const ci=S.custom[kind].indexOf(old);if(ci>=0)S.custom[kind][ci]=nr[D.key];
    if(old!==nr[D.key]){const n=renameRefs(kind,old,nr[D.key]);if(n){save();setTimeout(()=>toast(`캐릭터 시트 ${n}곳의 이름도 바꿨습니다`),1900)}}}
   reindex();save(true);closeModal();toast('DB에 저장했습니다');onSaved?onSaved(nr[D.key]):refreshAll()}})}
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
  <label class="lbl" for="pe-eff">효과${tagbarHTML()}<textarea id="pe-eff" rows="6">${esc(brN(cur.eff))}</textarea></label>
  <div class="preview" data-prev></div><div class="small" data-ban></div>
  ${isEx||isU?'':`<label class="row small"><input type="checkbox" id="pe-db">포텐셜 DB에도 저장 (같은 이름이 있으면 덮어씀)</label>`}
  ${window.OM_FX?`<details class="autobox" ${(isU?String((t.unique[slot.unique]||{}).auto||''):autoDsl(p,cur.name))?'open':''}><summary>⚙ 자동화 구문 <span class="small muted" data-autohint></span></summary>
   <div class="small muted" style="margin:4px 0">오레마스(배틀 웹툴)에서 이 포텐셜을 쓸 때 자동으로 처리할 내용. 같은 이름의 레디메이드가 있으면 비워 둬도 그것이 돈다. 한 줄에 명령 하나 — 예: <code>랭크 공격+1 임시</code> · <code>위력 ×1.3 타입:불꽃 물리</code> · <code>상태확률 화상 30% 상대1체</code></div>
   <pre class="small" data-autorm style="white-space:pre-wrap;background:var(--bg2,#f4f4f6);padding:6px;border-radius:6px;margin:0 0 6px"></pre>
   <textarea id="pe-auto" rows="4" style="width:100%;font-family:var(--mono,monospace);font-size:12.5px" placeholder="(비우면 레디메이드 자동)">${esc(isU?String((t.unique[slot.unique]||{}).auto||''):autoDsl(p,cur.name))}</textarea>
   <div class="small" data-autoprev style="white-space:pre-wrap;margin-top:4px"></div>
   <details><summary class="small">구문 도움말</summary><pre class="small" style="white-space:pre-wrap">${esc(AUTO_HELP)}</pre></details></details>`:''}</div></div></div>
 <div class="mfoot"><button class="btn danger" data-clear>슬롯 비우기</button>${isU||PR_HIDDEN?'':'<button class="btn" data-rec title="이 포켓몬의 타입·기술·종족치·역할에서 계통별 포텐셜 안을 짜고 수지 검사">✨ 추천</button>'}${isU?'':'<button class="btn" data-build title="트리거·조건·효과를 골라 새 포텐셜 문장 만들기">🛠 제작</button>'}<span class="sp"></span><button class="btn" data-x>취소</button><button class="btn pri" data-apply>적용</button></div>`,{wide:true});
 const ta=$('#pe-eff',l);bindTagbar(l,()=>ta);
 const autoUpd=()=>{const K=window.OM_FX;if(!K)return;const nm=$('#pe-name',l).value.trim().replace(/『|』/g,'');const base=nm?K.rm(nm):null;const rmEl=$('[data-autorm]',l),hint=$('[data-autohint]',l),pv=$('[data-autoprev]',l),ta2=$('#pe-auto',l);if(!ta2)return;
  rmEl.textContent=base&&base.ops&&base.ops.length?'레디메이드 자동: '+K.unparse(base.ops).join(' / ')+(base.manual?' (자동화 미지원 — 손으로)':''):'같은 이름의 레디메이드 없음';
  const r=K.parse(ta2.value);pv.innerHTML=(r.ops.length?'미리보기: '+esc(K.unparse(r.ops).join(' / ')):'')+(r.errs.length?` <span class="warn">모르는 줄: ${esc(r.errs.join(' / '))}</span>`:'');hint.textContent=r.ops.length?'구문 있음':(base&&base.ops&&base.ops.length&&!base.manual?'레디메이드 자동':'없음')};
 autoUpd();l.addEventListener('input',e=>{if(e.target.id==='pe-auto'||e.target.id==='pe-name')autoUpd()});
 const fill=o=>{$('#pe-name',l).value=o.name||'';ta.value=o.eff||'';const k=$('#pe-kind',l);if(k&&o.kind)k.value=o.kind;upd();seg('edit')};
 const upd=()=>{$('[data-prev]',l).innerHTML=`<b>${esc($('#pe-name',l).value||'(이름 없음)')}</b><br>`+rich(ta.value);const h=banHits(ta.value);$('[data-ban]',l).innerHTML=(h.length?`<span class="warn">금지 키워드 감지: ${h.map(esc).join(', ')}</span>`:'<span class="okc">금지 키워드 없음</span>')+lintHTML(ta.value)};
 l.addEventListener('input',e=>{if(e.target.id==='pe-eff'||e.target.id==='pe-name')upd()});upd();
 const seg=v=>{$('.split',l).dataset.seg=v;$$('[data-seg]',l).forEach(b=>{if(b.tagName==='BUTTON')b.classList.toggle('on',b.dataset.seg===v)})};
 l.addEventListener('click',e=>{const b=e.target.closest('button[data-seg]');if(b)seg(b.dataset.seg)});
 mountPicker(l,'pots',st,{onPick:n=>{const r=potRow(n);$('#pe-name',l).value=n;ta.value=brN(r[2]);const k=$('#pe-kind',l);if(k)k.value=r[0];upd();if(matchMedia('(max-width:700px)').matches){seg('edit');toast(`「${n}」을(를) 불러왔습니다`)}}});
 const commit=(name,eff,kind)=>{if(isEx){if(xi!=null&&!name)p.exclX.splice(xi,1);else{exO.name=name;exO.eff=eff}}else if(isU){const ta2=$('#pe-auto',l);const dsl=ta2?ta2.value.trim():'';t.unique[slot.unique]=dsl?{name,eff,auto:dsl}:{name,eff}}else{
   const r=potRow(name);p.pots[slot]=name;p.potEff[slot]=r&&brN(r[2]).trim()===eff.trim()?'':eff;p.potKind[slot]=r&&r[0]===kind?'':kind}
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
const fVis=f=>canSee(f);
const tVis=t=>canSee(t)&&canSee(S.folders.find(f=>f.id===tFolder(t)));
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
const trVisible=t=>tVis(t)&&(!S.folders.length||fOpen(tFolder(t)));
function renderChar(){const root=$('#v-char');
 const inF=fid=>S.trainers.map((t,ti)=>[t,ti]).filter(([t])=>tFolder(t)===fid&&tVis(t));const hiddenN=S.trainers.filter(t=>!tVis(t)).length;
 let body;
 if(!S.folders.length)body=`<div id="trs" data-sort="trainers" data-fid="">${S.trainers.map((t,ti)=>tVis(t)?trainerHTML(t,ti):'').join('')||'<div class="empty">트레이너가 없습니다. 「+ 트레이너」를 눌러 시작하세요.</div>'}</div>`;
 else{
  const grp=(fid,name,fi)=>{const f=S.folders.find(x=>x.id===fid);if(f&&!fVis(f))return '';const n=inF(fid),open=fOpen(fid),pk=n.reduce((a,[t])=>a+t.pokemon.length,0),key=fid||'_none';
   return `<div class="tfold ${open?'open':''} ${f&&f.priv?'priv':''}" ${fid?`data-si="${fi}"`:''} data-fold="${esc(key)}">
   <div class="tfh" data-ftog="${esc(key)}" data-fdrop="${esc(key)}" ${fid?'data-grab':''} tabindex="0" role="button" data-kbd aria-expanded="${open}" aria-label="${esc(name)} 폴더 펼치기/접기"><span class="caret">▸</span>${fid?`<span class="ficon">${FOLDER_SVG}</span>`:''}<span class="fname${fid?'':' muted'}">${esc(name)}</span>${f&&f.priv?`<span class="kindb privchip" title="${esc('비공개 · '+(f.ownerName||'')+(ME.gm?' (GM 열람)':''))}">🔒 비공개</span>`:''}<span class="small muted">트레이너 ${n.length}명 · 포켓몬 ${pk}체</span><span class="sp"></span>
    <button class="btn sm" data-act="addTin" data-f="${esc(fid)}">+ 트레이너</button>${fid?`<button class="btn sm ghost" data-act="privF" data-f="${esc(fid)}" title="비공개 폴더는 만든 사람과 GM 에게만 보입니다">${f&&f.priv?'공개로':'비공개'}</button><button class="btn sm ghost" data-act="renF" data-f="${esc(fid)}">이름 바꾸기</button><button class="btn sm ghost danger" data-act="delF" data-f="${esc(fid)}">폴더 삭제</button>`:''}</div>
   ${open?`<div class="tfb" data-sort="trainers" data-fid="${esc(fid)}">${n.map(([t,ti])=>trainerHTML(t,ti)).join('')}</div>`:''}</div>`};
  body=`<div id="trs" data-sort="folders">${S.folders.map((f,fi)=>grp(f.id,f.name||'이름 없는 폴더',fi)).join('')}${grp('','폴더 없음')}</div>`}
 root.innerHTML=`${hiddenN?`<p class="small faint" style="margin:0 0 8px">🔒 비공개라서 안 보이는 트레이너 ${hiddenN}명 (내 것이면 「서명」에 같은 비밀구를 적으세요)</p>`:''}<div class="intro"><h1>캐릭터 시트</h1><p>트레이너 폴더마다 자질·포인트·PT 서머리를 관리하고, 그 아래에 포켓몬 시트를 자유롭게 추가합니다. 「+ 폴더」로 세션별 대분류를 만들고 트레이너를 끌어다 넣을 수 있습니다. ${SH.on?'모든 내용은 공유 DB에 자동 저장되어, 링크를 아는 사람 모두가 같이 보고 고칩니다.':'모든 내용은 이 브라우저에 자동 저장됩니다.'}</p>
 <button class="btn pri" data-act="addT">+ 트레이너</button><button class="btn" data-act="addF">+ 폴더</button><button class="btn" data-act="impText">복사용 텍스트 붙여넣기</button></div>
 ${body}`}
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
function trainerHTML(t,ti){const P=`T.${ti}`;const use=pointUse(t);const iv=investCheck(t);const pu=ptSockets(t),pm=ptMax(t);
 return `<section class="folder ${t.open?'open':''}" id="tr-${t.id}" data-ti="${ti}" data-si="${ti}">
 <header class="fh" data-tog="${P}" data-grab tabindex="0" role="button" data-kbd aria-expanded="${!!t.open}" aria-label="${esc(t.name||'트레이너')} 펼치기/접기"><span class="caret">▸</span><span class="avatar">${safeImg(t.image)?`<img src="${safeImg(t.image)}" alt="">`:esc([...(t.name||'?')][0]||'?')}</span>
  <span class="tname">${esc(t.name)}</span>${t.kind==='npc'?'<span class="plchip npc" title="NPC — 오레마스 관계도에 NPC 노드로 들어간다">NPC</span>':''}${t.priv?`<span class="kindb privchip" title="${esc('비공개 · '+(t.ownerName||'')+(ME.gm?' (GM 열람)':''))}">🔒</span>`:''}${(t.pl||'').trim()?`<span class="plchip" title="PL">PL <b>${esc(t.pl.trim())}</b></span>`:''}<span class="row">${QUAL.map(q=>rkChip(q,t.ranks[q])).join('')}</span>${t.pokemon.length?ptStripHTML(t):''}
  <span class="small muted">포켓몬 ${t.pokemon.length}체 · PT 기술점 <b class="${pu>pm?'warn':''} num">${pu}/${pm}</b></span><span class="sp"></span>
  ${S.folders.length?`<select class="tmove" data-tmove="${ti}" aria-label="폴더 이동" title="폴더 이동"><option value="">폴더 없음</option>${S.folders.map(f=>`<option value="${esc(f.id)}" ${tFolder(t)===f.id?'selected':''}>${esc(f.name||'이름 없는 폴더')}</option>`).join('')}</select>`:''}<button class="btn sm ghost" data-act="privT" data-i="${ti}" title="비공개 트레이너는 만든 사람(같은 비밀구)과 GM 에게만 보입니다">${t.priv?'공개로':'비공개'}</button><button class="btn sm ghost" data-act="dupT" data-i="${ti}">복제</button><button class="btn sm ghost danger" data-act="delT" data-i="${ti}">삭제</button></header>
 ${t.open?`<div class="fb"><div class="tgrid">
  <div class="panel"><h3>프로필</h3><label class="lbl" for="tn-${t.id}">이름${inp(P+'.name',t.name,{id:'tn-'+t.id})}</label>
   <div class="imgbox" style="margin-top:8px">${safeImg(t.image)?`<img src="${safeImg(t.image)}" alt="트레이너 이미지">`:'<span class="small">이미지 없음</span>'}</div>
   <div class="row" style="margin-top:6px"><label class="btn sm" for="img-${t.id}" tabindex="0" role="button" data-kbd>이미지 삽입</label><input type="file" id="img-${t.id}" accept="image/*" data-img="${ti}" hidden>${t.image?`<button class="btn sm ghost" data-act="noimg" data-i="${ti}">제거</button>`:''}</div>
   <h3 style="margin-top:14px"><span style="white-space:nowrap;flex:none">스탠딩</span> <span class="small muted" style="font-weight:normal">오레마스 무대용 · 전신 투명 PNG · 주소로 저장</span></h3>
   <div class="stands">${(t.stands||[]).map((st,k)=>`<div class="stand ${k===(+t.standActive||0)?'on':''}"><div class="sth" style="background-image:url('${esc(st.src)}')"></div><div class="stb"><b>${esc(st.label)}</b>${k===(+t.standActive||0)?' <span class="tag">기본</span>':''}<div class="small muted" style="word-break:break-all">${esc(st.src.length>48?st.src.slice(0,46)+'…':st.src)}${st.point?' · 보정 '+st.point:''}</div></div><div class="row" style="flex-wrap:nowrap;gap:4px"><button type="button" class="btn sm ghost" data-act="stkind" data-i="${ti}" data-k="${k}" title="오레마스 무대에 서는 모양 — 자동: 그림 비율로 정함 · 스탠딩: 틀 없이 전신 · 초상: 네모 틀">${st.kind==='stand'?'스탠딩':st.kind==='portrait'?'초상 틀':'모양: 자동'}</button><button type="button" class="btn sm ghost" data-act="stdef" data-i="${ti}" data-k="${k}" title="무대에 기본으로 서는 그림">기본</button><button type="button" class="btn sm ghost" data-act="stedit" data-i="${ti}" data-k="${k}">수정</button><button type="button" class="btn sm ghost danger" data-act="stdel" data-i="${ti}" data-k="${k}">×</button></div></div>`).join('')||'<div class="small muted">아직 없음 — 없으면 오레마스에서 위 이미지(초상)로 선다</div>'}</div>
   <div class="row" style="margin-top:6px;gap:4px"><input type="text" id="stl-${t.id}" placeholder="라벨 (기본·웃음…)" style="width:110px"><input type="text" id="stu-${t.id}" placeholder="그림 주소 https://…" style="flex:1;min-width:120px"><label class="btn sm" for="stf-${t.id}" tabindex="0" role="button" data-kbd title="공유 저장소(Supabase)에 올리고 주소를 채운다">올리기</label><input type="file" id="stf-${t.id}" accept="image/*" data-stf="${ti}" hidden><button type="button" class="btn sm" data-act="stadd" data-i="${ti}">추가</button></div></div>
  <div class="tright"><div class="panel"><h3>자질<span class="sp"></span><button class="btn sm" data-act="tpl" data-i="${ti}" title="랭크 템플릿(테이블·계산식 탭)을 포인트 기본값에 다시 적용">템플릿 다시 적용</button></h3>
   <table><tr><th>자질</th><th>랭크</th><th>상세 사항</th></tr>${QUAL.map(q=>`<tr><td><b>${q}</b></td><td>${sel(`${P}.ranks.${q}`,t.ranks[q],RANKS,{style:'width:76px'})}</td><td>${inp(`${P}.detail.${q}`,t.detail[q],{ph:'메모'})}</td></tr>`).join('')}</table>
   <div class="invest ${iv.msg.length?'bad':''}">${iv.msg.length?iv.msg.map(esc).join(' · '):`자질 투자 ${iv.steps}/${iv.allow}회 · 규칙 이상 없음`}</div>
   <p class="small muted" style="margin:6px 0 0">육성 ${esc(t.ranks['육성'])} → 기본 레벨 <b>${baseLevel(t.ranks['육성'])}</b> · 포켓몬 기술 소켓 상한 ${esc((sockRow(t.ranks['육성'])||[])[6]??'-')}</p>
   <label class="plrow"><span>PL</span>${inp(P+'.pl',t.pl,{ph:'플레이어 이름'})}</label>
   <label class="plrow" title="오레마스 방으로 가져갈 때 관계도·휴대폰에서 PC(플레이어)인지 NPC 인지"><span>구분</span><select data-p="${P}.kind"><option value="pc" ${t.kind!=='npc'?'selected':''}>PC (플레이어 캐릭터)</option><option value="npc" ${t.kind==='npc'?'selected':''}>NPC</option></select></label></div>
  <div class="panel"><h3>포인트<span class="sp"></span><label class="row small" style="gap:4px;font-weight:500"><input type="checkbox" data-p="${P}.solo" ${t.solo?'checked':''}>1인 기준 (2체)</label></h3><table><tr><th>항목</th><th class="n">기본</th><th class="n">소모</th><th class="n">잔여</th></tr>
   ${ptItems().map(([k,d])=>{if(t.base[k]==null)t.base[k]=+d||0;const r=(+t.base[k]||0)-(use[k]||0);return `<tr><td>${esc(k)}</td><td class="n">${inp(`${P}.base.${seg(k)}`,t.base[k],{w:'52px',num:1})}</td><td class="n">${use[k]||0}</td><td class="n ${r<0?'warn':''}">${r}</td></tr>`}).join('')}</table>
   <div class="row" style="margin-top:8px"><b class="small">포인트 사용 항목</b><span class="sp"></span><button class="btn sm" data-act="addPt" data-i="${ti}">+ 항목</button></div>
   <p class="small muted" style="margin:6px 0 0">자동 소모 · ${ptItems().filter(x=>x[2]).map(([n,,a])=>`${esc(n)} ${autoUse(t,a)} (${esc(PTI_AUTO[a]||a)})`).join(' · ')||'없음'}</p>
   ${t.pts.map((n,i)=>{const r=idx.points.get(n);return `<div class="row small" style="margin-top:4px"><span style="flex:1;min-width:0"><b>${esc(n)}</b> <span class="muted">${r?esc(r[3]+' −'+r[6]):''}</span></span><button class="btn sm ghost" data-act="delPt" data-i="${ti}" data-j="${i}" aria-label="삭제">✕</button></div>`}).join('')||'<p class="small faint" style="margin:4px 0 0">사용한 항목이 없습니다.</p>'}</div>
 </div></div>
 <div class="panel"><h3>『고유 포텐셜』<span class="small muted" style="font-weight:400">능력 ${esc(t.ranks['능력'])} · 최대 ${esc(abilLimits(t.ranks['능력']).u)}개</span><span class="sp"></span><button class="btn sm" data-act="addU" data-i="${ti}">+ 고유 포텐셜</button></h3><div class="potl">
  ${t.unique.map((u,i)=>`<div class="pot ${u.name?'':'vac'}" tabindex="0" role="button" data-kbd data-act="editU" data-i="${ti}" data-j="${i}"><span class="sl">고유 ${i+1}</span><span class="pn">${esc(u.name||'비어 있음 · 눌러서 작성')}</span><span class="pe">${rich(u.eff)}</span><button class="btn sm ghost" data-act="delU" data-i="${ti}" data-j="${i}" aria-label="삭제">✕</button></div>`).join('')}</div></div>
 <div class="panel ptbar"><h3>PT 기술점<b class="num ${pu>pm?'warn':''}">${pu}</b><span class="small muted">/ 최대치</span>${inp(P+'.ptMax',t.ptMax,{w:'58px',num:1,ph:String(ptMaxDef(t))})}${t.solo?'<span class="small muted">1인 기준</span>':''}<span class="sp"></span>${(()=>{const L=abilLimits(t.ranks['능력'],t.solo);const n=t.pokemon.reduce((a,p)=>a+exclAll(p).length,0);const per=strip(t.ranks['능력'])==='AAA'?2:1;const over=t.pokemon.filter(p=>exclAll(p).length>per).map(p=>p.name||'(이름 없음)');return `<span class="small" style="font-weight:500">전용 포텐셜 <b class="num ${n>L.x?'warn':''}">${n}</b> / ${esc(L.xs)}${over.length?` <span class="warn">· 1체에 ${per}개 초과: ${esc(over.join(', '))}</span>`:''} <span class="faint">· 능력 ${esc(t.ranks['능력'])}</span></span>`})()}<span class="small muted">· 할인 ${discUsed(t)} / ${esc(t.base['「기술 할인점」']??'-')}</span><button class="btn sm ghost" type="button" data-tip="PT 기술점은 각 포켓몬의 기술 소켓 합계이며, 『올드 타입』 계열은 기술 4개에 ${oldSock()}점으로 고정됩니다(테이블·계산식 탭에서 변경). 최대치를 비워 두면 육성 랭크의 「최대치」를 씁니다. 기술 옆 「할인」을 체크하면 「기술 할인점」이 1점씩 소모됩니다. 각 포켓몬의 역할·특성·소지품·종족치·프라이드·기술 소켓·전용 포텐셜은 아래 포켓몬 줄에 있습니다." title="설명">?</button></h3>
  <div class="meter ${pu>pm?'over':''}"><i style="width:${pm?Math.min(100,pu/pm*100):0}%"></i></div>
  ${ptChecks(t).map(x=>`<p class="small warn" style="margin:6px 0 0">⚠ ${esc(x)}</p>`).join('')}</div>
 <div class="plist" data-sort="poke" data-i="${ti}">${t.pokemon.map((p,pi)=>pokeHTML(t,ti,p,pi)).join('')}</div>
 <div class="row"><button class="btn pri" data-act="addP" data-i="${ti}">+ 포켓몬 시트</button><button class="btn" data-act="addOld" data-i="${ti}">+ 올드 타입 일람에서 추가</button><button class="btn" data-act="impP" data-i="${ti}">복사용 텍스트로 불러오기</button></div>
 </div>`:''}</section>`}
const tyCol=n=>{const ti=typeInfo((tyParts(n)[0])||'');return ti&&safeCss(ti[1])||''};
const pkVars=p=>{const a=tyCol(p.t1),b=tyCol(p.t2)||a;return `--c1:${a||'var(--sunk2)'};--c2:${b||'var(--sunk2)'}`};
/* 능력치 육각형: 위부터 시계 방향 HP·공격·방어·스피드·특방·특공 (원작 순서) */
const RADAR_ORD=[0,1,2,5,4,3];
function radar(p){const R=25,cx=28,cy=28;const pt=(i,r)=>{const a=-Math.PI/2+i*Math.PI/3;return (cx+r*Math.cos(a)).toFixed(1)+','+(cy+r*Math.sin(a)).toFixed(1)};
 const ring=f=>[0,1,2,3,4,5].map(i=>pt(i,R*f)).join(' ');const vals=RADAR_ORD.map(i=>Math.min(1,(+p.base[i]||0)/180));const any=vals.some(v=>v>0);
 const poly=vals.map((v,i)=>pt(i,Math.max(1.5,v*R))).join(' ');
 return `<svg class="radar" viewBox="0 0 56 56" aria-hidden="true"><polygon points="${ring(1)}" class="rg"/><polygon points="${ring(.5)}" class="rg"/>${[0,1,2,3,4,5].map(i=>`<line x1="${cx}" y1="${cy}" x2="${pt(i,R).replace(',',' ').split(' ')[0]}" y2="${pt(i,R).split(',')[1]}" class="rg"/>`).join('')}${any?`<polygon points="${poly}" class="rv"/>`:''}</svg>`}
const genderGlyph=g=>g==='♂'?'<span class="gen m" title="수컷">♂</span>':g==='♀'?'<span class="gen f" title="암컷">♀</span>':g==='무성'?'<span class="gen n" title="무성">⚲</span>':'';
function ptStripHTML(t){return `<span class="ptstrip">${t.pokemon.map(p=>{const a=tyCol(p.t1),b=tyCol(p.t2)||a;return `<i style="background:linear-gradient(135deg,${a||'var(--sunk2)'} 50%,${b||'var(--sunk2)'} 50%)" title="${esc(p.name||'')} · ${esc([p.t1,p.t2].filter(x=>x&&x!=='-').join('/')||'타입 없음')}"></i>`}).join('')}</span>`}
function miniGrades(p){return `<div class="minig">${STATS.map((s,i)=>{const g=grade(p.base[i]);return `<span class="mg" title="${s} ${esc(p.base[i]||'-')}"><small>${s}</small><b style="background:${gcol(g)}">${esc(g)}</b></span>`}).join('')}</div>`}
function miniBars(p){return `<div class="mini">${STATS.map((s,i)=>{const v=+p.base[i]||0;const g=grade(p.base[i]);return `<div><span>${s.slice(0,2)}</span><i><b style="width:${Math.min(100,v/200*100)}%;background:${gcol(g)}"></b></i></div>`}).join('')}</div>`}
function pokeHTML(t,ti,p,pi){const P=`T.${ti}.pokemon.${pi}`;const c=moveCap(t,p);const filled=p.moves.filter(m=>m.name).length;const npot=p.pots.filter(x=>x).length+exclAll(p).length;
 const tot=p.base.reduce((a,b)=>a+(+b||0),0);
 return `<article class="pk ${p.open?'open':''}" id="pk-${p.id}" data-si="${pi}" style="${pkVars(p)}">
 <div class="ph" data-tog="${P}" data-grab tabindex="0" role="button" data-kbd aria-expanded="${!!p.open}"><span class="pno">${pi+1}</span>
  <div class="row" style="min-width:0;gap:9px;flex-wrap:nowrap"><button type="button" class="pavb" data-act="pimgPick" data-i="${ti}" data-j="${pi}" title="포켓몬 이미지 넣기 (클릭 · 끌어다 놓기 · 붙여넣기)">${safeImg(p.image)?`<img class="pav" src="${safeImg(p.image)}" alt="">`:'<span class="pav ph0" aria-hidden="true"></span>'}</button><div style="min-width:0"><div class="pname">${esc(p.name||'(이름 없음)')}${genderGlyph(p.gender)}<span class="lvb">Lv.${lv(t,p)}</span>${p.partner?' <span class="kindb ptn">파트너</span>':''}</div><div class="psub">${esc(roleOf(p)||'역할 없음')}${classOf(p)?' · '+esc(classOf(p)):''}${prideOf(p)?` · 프라이드 ${esc(prideOf(p))}${prideIsAuto(p)?'<span class="faint">(자동)</span>':''} <span class="faint">${prideCost(t,p)}점</span>`:''}${pokeChecks(t,p).some(c=>c.w)?' <span class="warn" title="기본·능력치 탭의 경고를 확인하세요">⚠</span>':''}</div></div></div>
  <div class="hide-s" style="min-width:0"><div class="chips">${tchip(p.t1)}${tchip(p.t2)}${tchip(p.t3)}</div><div class="psub">${esc(p.ability||'특성 없음')}${p.item?' · '+esc(p.item):''}</div></div>
  <div class="hide-s pkstat">${radar(p)}<div style="min-width:0">${miniGrades(p)}<div class="psub" style="margin-top:3px">종족치 합 <b class="num">${tot||'-'}</b>${(()=>{const pl=planRange(p);if(!pl||!tot)return '';const ok=tot>=pl.lo&&tot<=pl.hi;return `<span class="${ok?'faint':'warn'}" title="규칙상 예정 합계"> / ${pl.lo}${pl.hi!==pl.lo?'~'+pl.hi:''}</span>`})()} · 기술 <span class="${c.cap!=null&&c.used>c.cap?'warn':''}">${capTxt(c,'-','/')}</span> · 포텐셜 ${npot}${exclAll(p).length?` · 전용 ${esc(exclAll(p).map(x=>'『'+x.name+'』').join(''))}`:''}</div></div></div>
  <div class="pact"><button class="btn sm ghost" data-act="copy" data-i="${ti}" data-j="${pi}" title="복사용 텍스트 복사">복사</button><button class="btn sm ghost" data-act="dupP" data-i="${ti}" data-j="${pi}">복제</button><button class="btn sm ghost danger" data-act="delP" data-i="${ti}" data-j="${pi}">삭제</button></div></div>
 ${p.open?`<div class="pbody"><nav class="ptabs">${[['base','기본<span class="wide-only">·능력치</span>',''],['moves','기술',filled],['pots','포텐셜',npot],['text','<span class="wide-only">복사용 </span>텍스트','']].map(([k,n,cn])=>`<button data-ptab="${k}" data-i="${ti}" data-j="${pi}" class="${p.tab===k?'on':''}">${n}${cn!==''?`<span class="cnt">${cn}</span>`:''}</button>`).join('')}</nav>
 ${p.tab==='moves'?movesTab(t,ti,p,pi,P,c):p.tab==='pots'?potsTab(t,ti,p,pi):p.tab==='text'?textTab(t,ti,p,pi,P):baseTab(t,ti,p,pi,P)}</div>`:''}</article>`}
function baseTab(t,ti,p,pi,P){const ab=idx.abil.get(p.ability),it=idx.items.get(p.item);const types=S.db.types.map(x=>x[0]);const tot=p.base.reduce((a,b)=>a+(+b||0),0);const id=p.id;
 return `<div class="bgrid"><div style="display:flex;flex-direction:column;gap:10px;min-width:0">
  <div class="row" style="gap:12px;align-items:center;flex-wrap:nowrap"><div class="pimg" data-act="pimgPick" data-i="${ti}" data-j="${pi}" data-pdrop="${ti}.${pi}" role="button" tabindex="0" data-kbd title="클릭하거나 그림을 끌어다 놓거나 Ctrl+V로 붙여넣기">${safeImg(p.image)?`<img src="${safeImg(p.image)}" alt="포켓몬 이미지">`:'<span class="small">이미지<br>클릭 · 끌어다 놓기 · 붙여넣기</span>'}</div>
   <div style="display:flex;flex-direction:column;gap:6px;min-width:0"><div class="row"><label class="btn sm" for="pimg-${id}" tabindex="0" role="button" data-kbd>이미지 삽입</label><input type="file" id="pimg-${id}" accept="image/*" data-pimg="${ti}.${pi}" hidden>${p.image?`<button class="btn sm ghost" data-act="noPimg" data-i="${ti}" data-j="${pi}">제거</button>`:''}</div>
   <button class="btn sm" data-act="pickOld" data-i="${ti}" data-j="${pi}" title="시트 「올드 타입 일람」의 타입·특성·알그룹·종족치를 채웁니다">올드 타입 일람에서 자동 입력</button></div></div>
  ${pStandsHtml(p,ti,pi)}
  <div class="fgrid">
   <label class="lbl" for="nm-${id}" style="grid-column:span 2">이름${inp(P+'.name',p.name,{id:'nm-'+id})}</label>
   <label class="lbl" for="dist-${id}">레벨 <span class="faint">기본 ${baseLevel(t.ranks['육성'])} + 분배</span><span class="row"><b class="num" style="font-size:15px">${lv(t,p)}</b>${inp(P+'.dist',p.dist,{id:'dist-'+id,w:'56px',num:1})}</span></label>
   <label class="lbl" for="pr-${id}">프라이드 <span class="faint">통솔점 ${prideCost(t,p)}</span><select data-p="${P}.pride" id="pr-${id}"><option value="" ${prideIsAuto(p)?'selected':''}>자동 (${esc(prideAuto(p))})</option>${PR().rows.map(r=>`<option ${!prideIsAuto(p)&&strip(p.pride)===r[0]?'selected':''}>${esc(r[0])}</option>`).join('')}</select></label>
   <label class="lbl" for="pt-${id}">파트너<span class="row small" style="min-height:30px"><input type="checkbox" id="pt-${id}" data-p="${P}.partner" ${p.partner?'checked':''}>통솔점 1 할인</span></label>
   <label class="lbl" for="ge-${id}">성별${sel(P+'.gender',p.gender,['-','♂','♀','무성'],{id:'ge-'+id})}</label>
   ${['t1','t2','t3','tera'].map((k,n)=>`<label class="lbl" for="${k}-${id}">${['타입1','타입2','타입3','테라스탈'][n]}${sel(`${P}.${k}`,p[k],types,{id:k+'-'+id})}</label>`).join('')}
   <label class="lbl" for="e1-${id}">알그룹1${sel(P+'.egg1',p.egg1||'-',eggOpts(),{id:'e1-'+id})}</label><label class="lbl" for="e2-${id}">알그룹2${sel(P+'.egg2',p.egg2||'-',eggOpts(),{id:'e2-'+id})}</label>
  </div>
  <div class="fgrid" style="grid-template-columns:minmax(0,1fr) minmax(0,1fr)">
   <div class="lbl">특성<button class="pickbtn" data-act="pickAbil" data-i="${ti}" data-j="${pi}">${p.ability?`<b>${esc(p.ability)}</b><span class="sp"></span><span class="faint small">${ab?'소켓 '+esc(ab[0]):'DB에 없음'}</span>`:'<span class="ph0">특성 검색…</span>'}</button></div>
   <div class="lbl">소지품<button class="pickbtn" data-act="pickItem" data-i="${ti}" data-j="${pi}">${p.item?`<b>${esc(p.item)}</b>${ilockChip(p.item)}<span class="sp"></span><span class="faint small">${it?'소켓 '+esc(it[5]):'DB에 없음'}</span>`:'<span class="ph0">소지품 검색…</span>'}</button></div>
  </div>
  ${ab?`<div class="effbox"><b>${esc(p.ability)}</b> ${rich(ab[2])}<span class="fxrow">${fxAutoBtn(p,'trait',p.ability,ti,pi)}</span></div>`:p.ability?`<div class="effbox">DB에 없는 특성입니다. <button class="btn sm" data-act="newAbil" data-i="${ti}" data-j="${pi}">이 이름으로 오리지널 특성 만들기</button><span class="fxrow">${fxAutoBtn(p,'trait',p.ability,ti,pi)}</span></div>`:''}
  ${it?`<div class="effbox"><b>${esc(p.item)}</b> ${rich(it[4])} ${it[6]&&it[6]!=='-'?`<span class="faint">· ${esc(it[6])}</span>`:''}<span class="fxrow">${fxAutoBtn(p,'item',p.item,ti,pi)}</span></div>`:p.item?`<div class="effbox"><b>${esc(p.item)}</b><span class="fxrow">${fxAutoBtn(p,'item',p.item,ti,pi)}</span></div>`:''}
 </div>
 <div class="panel" style="min-width:0"><h3>능력치<span class="sp"></span><span class="small muted">종족치 합 <b class="num">${tot}</b>${(()=>{const pl=planRange(p);if(!pl)return '';const ok=tot>=pl.lo&&tot<=pl.hi;return ` · 예정 <b class="num${ok?'':' warn'}">${pl.lo}${pl.hi!==pl.lo?'~'+pl.hi:''}</b>${pl.alt?' <span class="faint">(괄호 값)</span>':''}`})()}</span></h3>
  <div class="stats">${STATS.map((s,i)=>{const g=grade(p.base[i]);const v=+p.base[i]||0;return `<div class="st s${i}"><span class="k">${s}</span>${inp(`${P}.base.${i}`,p.base[i],{num:1,ph:'종족치'})}<div class="bar"><i style="width:${Math.min(100,v/200*100)}%;background:${gcol(g)}"></i></div><span class="v">${stat(t,p,i)}</span><span class="gb" style="background:${gcol(g)}">${esc(g)}</span></div>`}).join('')}</div>
  <div class="stfoot"><span>물리 내구 <b class="num">${(stat(t,p,0)*stat(t,p,2)).toLocaleString()}</b></span><span>특수 내구 <b class="num">${(stat(t,p,0)*stat(t,p,4)).toLocaleString()}</b></span><span class="faint">실수치 = 테이블(더블) 식 · Lv.${lv(t,p)}</span></div>
  ${(()=>{const ck=pokeChecks(t,p);return ck.length?`<div class="checks">${ck.map(c=>`<div class="${c.w?'warn':'muted'}">${c.w?'⚠ ':'· '}${esc(c.t)}</div>`).join('')}</div>`:''})()}</div></div>`}
function movesTab(t,ti,p,pi,P,c){const ms=p.moves;const over=c.cap!=null&&c.used>c.cap;
 return `<div class="capline"><b>${c.mode==='count'?'기술 개수':'기술 소켓'}</b><span class="num ${over?'warn':''}">${capTxt(c,'종족치 입력 필요')}</span>${c.mode==='count'?`<span class="small muted">『${esc(classOf(p))}』 · PT 기술점 ${c.pt} 고정</span>`:''}${c.cap?`<div class="meter ${over?'over':''}"><i style="width:${Math.min(100,c.used/c.cap*100)}%"></i></div>`:''}
  <span class="small muted">상한 직접 지정</span>${inp(P+'.sockMax',p.sockMax,{w:'56px',num:1,ph:String(c.auto??'')})}<span class="sp"></span><button class="btn pri sm" data-act="pickMove" data-i="${ti}" data-j="${pi}">+ 기술 검색·추가</button></div>
 <div class="mlist" data-sort="moves" data-i="${ti}" data-j="${pi}">${ms.map((m,i)=>{const r=idx.moves.get(m.name);return `<div class="mv" data-si="${i}" data-grab style="border-left-color:${r&&tyCol(r[5])||'var(--line)'}"><div class="row mvt" style="gap:3px;flex-wrap:nowrap">${r?tchip(r[5])+`<span class="mcat ${r[6]==='물리'?'phy':r[6]==='특수'?'spe':'sta'}">${esc(r[6]||'')}</span>`:'<span class="kindb">DB 없음</span>'}</div><div class="mvn"><div class="nm"><span class="mvchip">${r?tchip(r[5]):'<span class="kindb">DB 없음</span>'}</span>${esc(m.name)}</div><div class="small muted rgwrap">${r?rangeGrid(r[9])+esc(r[6]+' · '+r[9]+(r[10]&&r[10]!=='-'?' · 접촉 '+r[10]:'')):''}</div></div>
  <div class="st2">${r?esc(r[7]):'-'}<small>위력</small></div><div class="st2">${r?esc(r[8]):'-'}<small>명중</small></div><div class="st2">${r?esc(r[11]):'-'}<small>우선도</small></div><div class="st2">${moveSock(p,m)}<small>소켓</small></div>
  <div class="ef">${r?rich(r[13]):''}</div><div class="row mva" style="gap:2px;flex-wrap:nowrap"><label class="small row" title="「기술 할인점」 1점을 써서 이 기술의 소켓을 0.5 할인합니다 (올드 타입 계열은 교배기·유전기 습득용)" style="gap:2px"><input type="checkbox" data-p="${P}.moves.${i}.half" ${m.half?'checked':''}>할인</label>
  ${r?`<button class="btn sm ghost" data-act="mvEdit" data-name="${esc(m.name)}">수정</button>`:''}<button class="btn sm ghost danger" data-act="mvDel" data-i="${ti}" data-j="${pi}" data-k="${i}" aria-label="삭제">✕</button></div></div>`}).join('')||'<div class="empty">기술이 없습니다. 「기술 검색·추가」로 DB에서 찾거나 오리지널 기술을 만드세요.</div>'}</div>`}
function potsTab(t,ti,p,pi){const exE=p.excl.eff;
 return `<div class="potl" data-sort="pots" data-i="${ti}" data-j="${pi}"><div class="pot excl ${p.excl.name?'':'vac'}" tabindex="0" role="button" data-kbd data-act="editPot" data-i="${ti}" data-j="${pi}" data-k="excl"><span class="sl">전용</span><span class="pn">${esc(p.excl.name||'전용 포텐셜 · 눌러서 작성')}</span><span class="pe">${rich(exE)}${banHits(exE).length?' <span class="warn">금지어</span>':''}</span><span class="row" style="gap:2px;flex-wrap:nowrap">${fxAutoBtn(p,'pot',p.excl.name,ti,pi,'excl')}</span></div>
 ${(p.exclX||[]).map((x,xi)=>`<div class="pot excl ${x.name?'':'vac'}" tabindex="0" role="button" data-kbd data-act="editPot" data-i="${ti}" data-j="${pi}" data-k="x${xi}"><span class="sl">전용 ${xi+2}</span><span class="pn">${esc(x.name||'추가 전용 포텐셜 · 눌러서 작성')}</span><span class="pe">${rich(x.eff)}${banHits(x.eff).length?' <span class="warn">금지어</span>':''}</span><span class="row" style="gap:2px;flex-wrap:nowrap">${fxAutoBtn(p,'pot',x.name,ti,pi,'x'+xi)}<button class="btn sm ghost danger" data-act="potDel" data-i="${ti}" data-j="${pi}" data-k="x${xi}" aria-label="전용 칸 지우기">✕</button></span></div>`).join('')}
 ${p.pots.map((n,i)=>{if(!n)return '';const r=potRow(n);const e=potEffOf(p,i);const k=potKindOf(p,i);const custom=n&&(!r||p.potEff[i]);return `<div class="pot ${n?'':'vac'}" tabindex="0" role="button" data-kbd data-act="editPot" data-i="${ti}" data-j="${pi}" data-k="${i}" data-si="${i}" data-grab><span class="sl">#${i+1}</span><span><span class="pn">${esc(n||'비어 있음')}</span>${n?`<br><span class="kindb">${esc(k||'종류 미지정')}</span>${custom?' <span class="kindb">직접 작성</span>':''}`:''}</span><span class="pe">${rich(e)}${banHits(e).length?' <span class="warn">금지어</span>':''}</span><span class="row" style="gap:2px;flex-wrap:nowrap">${n?fxAutoBtn(p,'pot',n,ti,pi,i):''}${n?`<button class="btn sm ghost danger" data-act="potDel" data-i="${ti}" data-j="${pi}" data-k="${i}" aria-label="비우기">✕</button>`:''}</span></div>`}).join('')}</div>
 <div class="row" style="margin-top:8px">${p.pots.some(n=>!n)?`<button class="btn pri sm" data-act="addPot" data-i="${ti}" data-j="${pi}">+ 포텐셜 추가</button>`:''}<button class="btn sm" data-act="addEx" data-i="${ti}" data-j="${pi}" title="이 포켓몬에 전용 포텐셜 칸을 하나 더 만듭니다 (능력 AAA: 1체에게 2개까지)">+ 전용 칸</button><button class="btn sm" data-act="stpl" data-i="${ti}" data-j="${pi}" title="테이블·계산식 탭의 포켓몬 시트 템플릿(트레이너 자질 반영)으로 빠진 포텐셜 슬롯을 채웁니다">시트 템플릿 적용</button><span class="small muted">트레이너 자질에 맞는 기본 포텐셜 중 빠진 것만 빈 슬롯에 넣습니다</span></div>
 <p class="small faint" style="margin:8px 0 0">오른쪽 「구문」 버튼은 오레마스 배틀 자동화입니다 — <b>구문 ✓</b> 이 포켓몬만의 구문 있음 · <b>자동</b> 같은 이름의 레디메이드가 자동으로 돎 · <b>구문</b> 자동화 없음(써 넣을 수 있음). 줄을 누르면 편집 창이 열리고, 줄을 잡고 위아래로 끌면 순서를 바꿀 수 있습니다(휴대폰은 길게 누른 뒤 끌기). DB에서 고르거나, 태그 버튼을 써서 직접 작성할 수 있습니다. 복사용 텍스트에는 채워진 슬롯만 위에서부터 순서대로 들어갑니다.</p>`}
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
function refreshAll(){if(S.ui.tab==='char')renderChar();else if(S.ui.tab==='type')renderType();else if(S.ui.tab==='db')renderDB();else renderTbl()}
let rT=null;
let composing=false;
$('#v-char').addEventListener('compositionstart',()=>{composing=true;clearTimeout(rT)});
$('#v-char').addEventListener('compositionend',e=>{composing=false;const t=trOf(e.target);if(t&&e.target.tagName!=='TEXTAREA'){clearTimeout(rT);rT=setTimeout(()=>refreshTrainer(t),550)}});
$('#v-char').addEventListener('input',e=>{const p=e.target.dataset.p;if(!p)return;const[o,k]=getRef(p);if(!o)return;o[k]=e.target.type==='checkbox'?e.target.checked:e.target.value;save();
 const t=trOf(e.target);if(e.target.tagName==='TEXTAREA'||e.isComposing||composing)return;clearTimeout(rT);rT=setTimeout(()=>t&&refreshTrainer(t),550)});
$('#v-char').addEventListener('change',e=>{const el=e.target;
 if(el.dataset.tmove!=null){const t=S.trainers[+el.dataset.tmove];if(t){t.folder=el.value;S.ui.fclosed=S.ui.fclosed||{};delete S.ui.fclosed[el.value||'_none'];save();renderChar();const f=S.folders.find(x=>x.id===el.value);toast(`「${t.name}」 → ${f?f.name:'폴더 없음'}`)}return}
 if(el.dataset.p){const t=trOf(el);const m=el.dataset.p.match(/^T\.\d+\.ranks\.(.+)$/);if(m&&t){applyTpl(t,m[1]);save()}
  if(t&&/^T\.\d+\.solo$/.test(el.dataset.p)){for(const [n,d] of ptItems())t.base[n]=+d||0;applyTpl(t);save();toast(t.solo?'1인 기준 (2체) 템플릿을 적용했습니다':'6체 기준 템플릿을 적용했습니다')}clearTimeout(rT);if(t)setTimeout(()=>refreshTrainer(t),0);return}
 if(el.dataset.img){const f=el.files[0];if(!f)return;const t=S.trainers[+el.dataset.img];readImg(f,640,'image/webp',u=>setImgOf(t,'t',u,t))}
 if(el.dataset.stf){const f=el.files[0];if(!f)return;const t=S.trainers[+el.dataset.stf];uploadStand(t,f).then(u=>{const inp=$('#stu-'+t.id);if(inp)inp.value=u;const l=$('#stl-'+t.id);if(l&&!l.value)l.value=f.name.replace(/\.[^.]+$/,'');toast('올렸습니다 — 「추가」를 누르세요')}).catch(e=>toast('올리지 못했습니다: '+e.message));el.value=''}
 if(el.dataset.pstf){const f=el.files[0];if(!f)return;const [a,b]=el.dataset.pstf.split('.').map(Number);const t=S.trainers[a],p=t&&t.pokemon[b];if(!p)return;uploadStand(p,f).then(u=>{const inp=$('#pstu-'+p.id);if(inp)inp.value=u;const l=$('#pstl-'+p.id);if(l&&!l.value)l.value=f.name.replace(/\.[^.]+$/,'');toast('올렸습니다 — 「추가」를 누르세요')}).catch(e=>toast('올리지 못했습니다: '+e.message));el.value='';return}
 if(el.dataset.pimg){const f=el.files[0];if(!f)return;const [a,b]=el.dataset.pimg.split('.').map(Number);setPokeImg(a,b,f)}});
/* 스탠딩 그림을 공유 저장소(Supabase Storage, 버킷 oremas — 오레마스와 같은 프로젝트)에 올리고 공개 주소를 돌려준다 */
async function putImg(path,blob){const c=window.MKM_CONFIG||{};if(!c.supabaseUrl||!c.supabaseKey)throw new Error('공유 저장소 설정이 없습니다 (js/config.js)');
 const ty=blob.type||'image/png';const ext=ty.includes('png')?'png':ty.includes('webp')?'webp':ty.includes('gif')?'gif':'jpg';const full=`${path}.${ext}`;const base=c.supabaseUrl.replace(/\/$/,'');
 const r=await fetch(`${base}/storage/v1/object/oremas/${full}`,{method:'POST',headers:{apikey:c.supabaseKey,Authorization:'Bearer '+c.supabaseKey,'Content-Type':ty,'x-upsert':'true','cache-control':'3600'},body:blob});
 if(!r.ok){let m='';try{m=(await r.json()).message||''}catch(e){}if(/bucket not found/i.test(m))m='그림 저장소(버킷 oremas)가 없습니다 — supabase/schema.sql 을 다시 실행해 주세요';throw new Error(m||('HTTP '+r.status))}
 return `${base}/storage/v1/object/public/oremas/${full}`}
/* 스탠딩 그림(트레이너·포켓몬)을 공유 저장소(Supabase Storage, 버킷 oremas — 오레마스와 같은 프로젝트)에 원본 그대로 올리고 공개 주소를 돌려준다. 투명 배경이 그대로 남는다 */
async function uploadStand(o,f){if(!/^image\//.test(f.type))throw new Error('그림 파일만');if(f.size>5*1024*1024)throw new Error('5MB 이하만');return putImg(`stands/${o.id}_${Date.now().toString(36)}`,f)}
/* 시트 이미지(data URL)를 공유 저장소로: 문서가 1.5MB 를 넘지 않게 */
async function hostImg(tag,id,dataUrl){const b=await (await fetch(dataUrl)).blob();return putImg(`maker/${tag}_${id}_${Date.now().toString(36)}`,b)}
const shHostOn=()=>{try{return !!(SH.on&&SH.canWrite)}catch(e){return false}};
function setImgOf(o,tag,u,t){o.image=u;save();refreshTrainer(t);if(!shHostOn())return;hostImg(tag,o.id,u).then(url=>{if(o.image!==u)return;o.image=url;save();refreshTrainer(t)}).catch(e=>toast('그림을 공유 저장소에 올리지 못해 시트 안에 넣었습니다 ('+e.message+')'))}
function setPokeImg(a,b,f){const t=S.trainers[a],p=t&&t.pokemon[b];if(!p||!f||!/^image\//.test(f.type))return false;readImg(f,480,'image/webp',u=>{setImgOf(p,'p',u,t);toast('이미지를 넣었습니다')});return true}
/* 끌어다 놓기 · 붙여넣기 (포켓몬 카드 위에서) */
document.addEventListener('dragover',e=>{if(e.target.closest&&e.target.closest('[data-pdrop],.pk'))e.preventDefault()});
document.addEventListener('drop',e=>{const z=e.target.closest&&(e.target.closest('[data-pdrop]')||e.target.closest('.pk'));if(!z)return;const f=e.dataTransfer&&e.dataTransfer.files&&e.dataTransfer.files[0];if(!f)return;e.preventDefault();
 const key=z.dataset.pdrop||(()=>{const art=z.closest('.pk');const pl=art&&art.closest('.plist');if(!pl)return null;return pl.dataset.i+'.'+[...pl.querySelectorAll(':scope>.pk')].indexOf(art)})();if(!key)return;const [a,b]=key.split('.').map(Number);setPokeImg(a,b,f)});
document.addEventListener('paste',e=>{const it=[...(e.clipboardData&&e.clipboardData.items||[])].find(x=>x.type.startsWith('image/'));if(!it)return;const ae=document.activeElement;if(ae&&ae.matches&&ae.matches('input,textarea,select')&&!ae.matches('[data-pdrop]'))return;
 const art=(ae&&ae.closest&&ae.closest('.pk'))||window.__hoverPk;if(!art)return;const pl=art.closest('.plist');if(!pl)return;const b=[...pl.querySelectorAll(':scope>.pk')].indexOf(art);if(b<0)return;e.preventDefault();setPokeImg(+pl.dataset.i,b,it.getAsFile())});
document.addEventListener('mouseover',e=>{const art=e.target.closest&&e.target.closest('.pk');if(art)window.__hoverPk=art});
/* 포켓몬 스탠딩 (오레마스 무대 · RP 에서 포켓몬이 말할 때) — 트레이너와 같은 모양 */
function pStandsHtml(p,ti,pi){const st=p.stands||[],a=+p.standActive||0;const D=`data-i="${ti}" data-j="${pi}"`;
 return `<div class="pstands"><div class="row" style="gap:6px;align-items:baseline"><b class="small">스탠딩</b><span class="small muted">오레마스 무대용 · 투명 PNG 그대로 · 없으면 위 이미지로 선다</span></div>
 <div class="stands">${st.map((s,k)=>`<div class="stand ${k===a?'on':''}"><div class="sth" style="background-image:url('${esc(s.src)}')"></div><div class="stb"><b>${esc(s.label)}</b>${k===a?' <span class="tag">기본</span>':''}<div class="small muted" style="word-break:break-all">${esc(s.src.length>48?s.src.slice(0,46)+'…':s.src)}${s.point?' · 보정 '+s.point:''}</div></div><div class="row" style="flex-wrap:nowrap;gap:4px"><button type="button" class="btn sm ghost" data-act="pstkind" ${D} data-k="${k}" title="무대에 서는 모양 — 자동: 그림 비율로 정함 · 스탠딩: 틀 없이 전신 · 초상: 네모 틀">${s.kind==='stand'?'스탠딩':s.kind==='portrait'?'초상 틀':'모양: 자동'}</button><button type="button" class="btn sm ghost" data-act="pstdef" ${D} data-k="${k}">기본</button><button type="button" class="btn sm ghost" data-act="pstedit" ${D} data-k="${k}">수정</button><button type="button" class="btn sm ghost danger" data-act="pstdel" ${D} data-k="${k}">×</button></div></div>`).join('')}</div>
 <div class="row" style="margin-top:6px;gap:4px"><input type="text" id="pstl-${p.id}" placeholder="라벨 (기본·화남…)" style="width:110px"><input type="text" id="pstu-${p.id}" placeholder="그림 주소 https://…" style="flex:1;min-width:120px"><label class="btn sm" for="pstf-${p.id}" tabindex="0" role="button" data-kbd title="공유 저장소(Supabase)에 원본 그대로 올리고 주소를 채운다">올리기</label><input type="file" id="pstf-${p.id}" accept="image/png,image/webp,image/gif,image/jpeg" data-pstf="${ti}.${pi}" hidden><button type="button" class="btn sm" data-act="pstadd" ${D}>추가</button></div></div>`}
function readImg(f,max,type,cb){const rd=new FileReader();rd.onload=()=>{const im=new Image();im.onload=()=>{const c=document.createElement('canvas'),s=Math.min(1,max/Math.max(im.width,im.height));c.width=Math.max(1,Math.round(im.width*s));c.height=Math.max(1,Math.round(im.height*s));const g=c.getContext('2d');if(type==='image/jpeg'){g.fillStyle='#fff';g.fillRect(0,0,c.width,c.height)}g.drawImage(im,0,0,c.width,c.height);let u=c.toDataURL(type,.85);if(type!=='image/jpeg'&&/^data:image\/jpeg/.test(u))u=c.toDataURL('image/png');cb(u)};im.onerror=()=>toast('이미지를 읽지 못했습니다');im.src=rd.result};rd.readAsDataURL(f)}
$('#v-char').addEventListener('click',async e=>{
 if(Date.now()-dragEnd<300)return;
 const ft=e.target.closest('[data-ftog]');if(ft&&!e.target.closest('button,input,select,label,textarea')){S.ui.fclosed=S.ui.fclosed||{};const k=ft.dataset.ftog;S.ui.fclosed[k]=!S.ui.fclosed[k];save();renderChar();return}
 const tg=e.target.closest('[data-tog]');if(tg&&!e.target.closest('button,input,select,label,textarea')){const[o,k]=getRef(tg.dataset.tog);o[k].open=!o[k].open;save();const t=trOf(tg);t?refreshTrainer(t):renderChar();return}
 const pt=e.target.closest('[data-ptab]');if(pt){const T=S.trainers[+pt.dataset.i];T.pokemon[+pt.dataset.j].tab=pt.dataset.ptab;save();refreshTrainer(T);return}
 const b=e.target.closest('[data-act]');if(!b)return;const i=+b.dataset.i,j=+b.dataset.j,k=b.dataset.k,T=S.trainers[i],P=T&&T.pokemon[j];
 const rf=()=>{save();T?refreshTrainer(T):renderChar()};
 switch(b.dataset.act){
  case 'addT':S.trainers.push(newTrainer());S.ui.fclosed=S.ui.fclosed||{};delete S.ui.fclosed._none;save();renderChar();break;
  case 'addF':{const name=await askText('새 폴더','폴더 이름 (예: 3월 세션, PL 홍길동)');if(name){S.folders.push({id:uid(),name});save();renderChar()}break}
  case 'addTin':{const t=newTrainer();t.folder=b.dataset.f||'';S.trainers.push(t);S.ui.fclosed=S.ui.fclosed||{};delete S.ui.fclosed[b.dataset.f||'_none'];save();renderChar();break}
  case 'renF':{const f=S.folders.find(x=>x.id===b.dataset.f);if(!f)break;const name=await askText('폴더 이름 바꾸기','폴더 이름',f.name);if(name){f.name=name;save();renderChar()}break}
  case 'delF':{const f=S.folders.find(x=>x.id===b.dataset.f);if(!f)break;const n=S.trainers.filter(t=>t.folder===f.id).length;
   if(await ask(`폴더 「${esc(f.name)}」를 삭제할까요?<br><span class="small muted">안에 있던 트레이너 ${n}명은 지워지지 않고 「폴더 없음」으로 옮겨집니다.</span>`,'폴더 삭제')){S.trainers.forEach(t=>{if(t.folder===f.id)t.folder=''});S.folders=S.folders.filter(x=>x!==f);save();renderChar()}break}
  case 'delT':if(await ask(`트레이너 「${esc(T.name)}」와 소속 포켓몬 ${T.pokemon.length}체를 모두 삭제할까요?`,'삭제')){S.trainers.splice(i,1);save();renderChar()}break;
  case 'dupT':{const c=clone(T);c.id=uid();c.name+=' (복사)';c.pokemon.forEach(p=>p.id=uid());S.trainers.splice(i+1,0,c);save();renderChar();break}
  case 'noimg':T.image='';rf();break;
  case 'stadd':{const l=($('#stl-'+T.id)||{}).value||'',u=(($('#stu-'+T.id)||{}).value||'').trim();if(!/^https?:\/\//.test(u)){toast('그림 주소(https://…)가 필요합니다. 파일은 「올리기」로');break}T.stands=T.stands||[];T.stands.push({label:l.trim()||'기본',src:u,point:0});if(T.stands.length===1)T.standActive=0;rf();break}
  case 'stdef':T.standActive=+b.dataset.k;rf();break;
  case 'stkind':{const st=T.stands[+b.dataset.k];if(!st)break;const nx={'':'stand',stand:'portrait',portrait:''}[st.kind||''];if(nx)st.kind=nx;else delete st.kind;rf();break}
  case 'stedit':{const st=T.stands[+b.dataset.k];if(!st)break;const l=await askText('스탠딩 라벨','라벨',st.label);if(l==null)break;const u=await askText('그림 주소','주소',st.src);if(u==null||!/^https?:\/\//.test(u))break;const pt=await askText('보정 (위로 올릴 px, 음수면 내림)','보정',String(st.point||0));st.label=l.trim()||st.label;st.src=u.trim();st.point=+pt||0;rf();break}
  case 'stdel':{T.stands.splice(+b.dataset.k,1);if(T.standActive>=T.stands.length)T.standActive=Math.max(0,T.stands.length-1);rf();break}
  case 'tpl':if(await ask('테이블·계산식 탭의 랭크 템플릿 값으로 포인트 기본값을 덮어쓸까요?','적용',false)){applyTpl(T);rf();toast('템플릿을 적용했습니다')}break;
  case 'addPt':openPicker('points',{title:'포인트 사용 항목',onPick:n=>{T.pts.push(n);rf()}});break;
  case 'delPt':T.pts.splice(j,1);rf();break;
  case 'addU':T.unique.push({name:'',eff:''});rf();openPotEditor(T,null,{unique:T.unique.length-1});break;
  case 'editU':if(e.target.closest('[data-act="delU"]'))break;openPotEditor(T,null,{unique:j});break;
  case 'delU':e.stopPropagation();T.unique.splice(j,1);rf();break;
  case 'addP':{const p=newPoke();applySheetTpl(T,p);T.pokemon.push(p);rf();break}
  case 'stpl':{const n=applySheetTpl(T,P);rf();toast(n?`템플릿 포텐셜 ${n}개를 넣었습니다`:'더 넣을 템플릿 포텐셜이 없습니다');break}
  case 'delP':if(await ask(`포켓몬 시트 「${esc(P.name||'이름 없음')}」을(를) 삭제할까요?`,'삭제')){T.pokemon.splice(j,1);rf()}break;
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
  case 'fx':{e.stopPropagation();const sl=b.dataset.slot;fxOpen(T,P,b.dataset.kind,b.dataset.name,sl===''?null:/^\d+$/.test(sl)?+sl:sl);break}
  case 'pimgPick':{e.stopPropagation();let inp=$('#pimg-any');if(!inp){inp=document.createElement('input');inp.type='file';inp.accept='image/*';inp.id='pimg-any';inp.hidden=true;inp.addEventListener('change',()=>{const f=inp.files[0];if(!f)return;const [a,b]=String(inp.dataset.pimg).split('.').map(Number);setPokeImg(a,b,f)});MKROOT().appendChild(inp)}inp.dataset.pimg=`${i}.${j}`;inp.value='';inp.click();break}
  case 'pickOld':openOldFill(T,P);break;
  case 'addOld':openOldFill(T,null);break;
  case 'copy':copyStr(copyText(T,P));break;
  case 'sessT':copySession([T]);break;
  case 'impP':openImport(T);break;
  case 'impText':openImport(null);break;
  case 'pickAbil':openPicker('abil',{onPick:n=>{P.ability=n;rf()}});break;
  case 'newAbil':openEdit('abil',-1,{preset:{1:P.ability},onSaved:n=>{P.ability=n;rf()}});break;
  case 'pickItem':openPicker('items',{onPick:n=>{P.item=n;rf()}});break;
  case 'pickMove':openPicker('moves',{title:'기술 검색·추가',multi:true,chosen:()=>new Set(P.moves.map(m=>m.name)),onPick:n=>{P.moves.push({name:n,half:false});rf()},onRemove:n=>{P.moves=P.moves.filter(m=>m.name!==n);rf()}});break;
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
 const {item,list}=drag;
 const sibs=[...list.children].filter(x=>x!==item&&x.dataset.si!=null);let before=null;
 for(const x of sibs){const r=x.getBoundingClientRect();if(e.clientY<r.top+r.height/2){before=x;break}}
 if(before){if(item.nextElementSibling!==before)list.insertBefore(item,before)}else{const last=sibs[sibs.length-1];if(last&&last.nextElementSibling!==item)last.after(item)}
 if(e.clientY<70)MKROOT().scrollBy(0,-16);else if(e.clientY>innerHeight-70)MKROOT().scrollBy(0,16)},{passive:false});
document.addEventListener('touchmove',e=>{if(drag&&drag.on)e.preventDefault()},{passive:false});
document.addEventListener('contextmenu',e=>{if(drag&&drag.touch)e.preventDefault()});
function endDrag(e){if(!drag||e.pointerId!==drag.id)return;const d=drag;drag=null;clearTimeout(d.timer);if(!d.on)return;
 d.item.classList.remove('dragging');MKROOT().classList.remove('drag-on');dragEnd=Date.now();$$('.tfh.over').forEach(x=>x.classList.remove('over'));
 if(d.list.dataset.sort==='trainers'&&S.folders.length){moveTrainersFromDom(d);return}
 const order=[...d.list.children].filter(x=>x.dataset.si!=null).map(x=>+x.dataset.si);if(order.every((v,i)=>v===i))return;applySort(d.list,order)}
document.addEventListener('pointerup',endDrag);document.addEventListener('pointercancel',endDrag);
/* 폴더가 있을 때: 화면에 보이는 순서·소속대로 트레이너 목록을 다시 짠다 (접힌 폴더의 트레이너는 그대로 유지) */
function moveTrainersFromDom(d){const moved=S.trainers[+d.item.dataset.si];
 if(d.fdrop!=null){if(moved){moved.folder=d.fdrop==='_none'?'':d.fdrop;S.trainers=S.trainers.filter(t=>t!==moved).concat([moved]);S.ui.fclosed=S.ui.fclosed||{};const f=S.folders.find(x=>x.id===moved.folder);toast(`「${moved.name}」 → ${f?f.name:'폴더 없음'}`)}save();renderChar();return}
 const seen=new Set(),order=[];
 $$('#trs [data-sort="trainers"]').forEach(l=>{const fid=l.dataset.fid||'';[...l.children].forEach(x=>{if(x.dataset.si==null)return;const t=S.trainers[+x.dataset.si];if(t&&!seen.has(t)){seen.add(t);t.folder=fid;order.push(t)}})});
 S.trainers.forEach(t=>{if(!seen.has(t))order.push(t)});S.trainers=order;save();renderChar()}
function applySort(list,order){const re=a=>order.map(i=>a[i]);const kind=list.dataset.sort;if(kind==='trainers'){S.trainers=re(S.trainers);save();renderChar();return}
 if(kind==='folders'){S.folders=re(S.folders);save();renderChar();return}const T=S.trainers[+list.dataset.i];if(!T)return;
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
 ${rows.slice(0,dbs.lim).map(r=>{const i=S.db[k].indexOf(r);return `<tr data-dbedit="${i}" tabindex="0" data-kbd style="cursor:pointer">${D.show.map(c=>c===D.eff?`<td class="ef"><div class="efc">${rich(r[c])}</div></td>`:c===D.key?`<td class="b">${esc(r[c])}${S.custom[k].includes(r[c])?' <span class="kindb">오리지널</span>':''}</td>`:(k==='moves'&&c===5)||(k==='old'&&(c===3||c===4))?`<td>${tchip(r[c])}</td>`:`<td>${esc(r[c])}</td>`).join('')}</tr>`}).join('')}</table>
 ${rows.length>dbs.lim?`<div style="padding:8px"><button class="btn" data-dbmore>더 보기</button></div>`:''}</div>`}
function renderDB(){const k=dbs.k;
 const head=`<div class="intro"><h1>DB 관리</h1><p>기술·특성·소지품·포텐셜·올드 타입·포인트 DB를 검색하고 추가·수정·삭제합니다. 바뀐 내용은 캐릭터 시트의 검색 창과 계산, 맵툴 토큰 갱신에 바로 반영됩니다.</p></div>
 <div class="subtabs">${Object.entries(DBS).map(([kk,d])=>`<button data-dbk="${kk}" class="${kk===k?'on':''}">${d.t} DB<span class="c">${kk==='rm'&&!rmLoaded()?(FXST==='fail'?'!':'…'):S.db[kk].length}</span></button>`).join('')}<button data-dbk="mt" class="${k==='mt'?'on':''}">맵툴 DB 갱신</button></div>`;
 if(k==='mt'){dbs.ex=mtStrings();$('#v-db').innerHTML=head+mtPanel();return}
 const D=DBS[k];
 $('#v-db').innerHTML=head+`
 ${k==='rm'&&!rmLoaded()?`<div class="panel row" style="margin-bottom:10px"><span class="small ${FXST==='fail'?'warn':'muted'}" style="flex:1;min-width:200px">${FXST==='fail'?'레디메이드 기본 행(자동화 스크립트 js/fx/)을 불러오지 못했습니다. 아래에는 이 DB에서 직접 추가한 행만 보입니다.':'레디메이드 기본 행을 불러오는 중입니다…'}</span>${FXST==='fail'?'<button class="btn sm" data-fxretry>다시 불러오기</button>':''}</div>`:''}
 ${k==='abil'||k==='items'||k==='old'||k==='moves'?`<div class="panel row" style="margin-bottom:10px"><span class="small muted" style="flex:1;min-width:200px">이 DB는 맵툴 라이브러리 토큰(${k==='abil'?'Lib:traits_multiple · Lib:pokemon':k==='items'?'Lib:item':k==='moves'?'Lib:skill · 기술 목록 문자열':'Lib:pokemon 「list_oldtype」'})과 연동됩니다. 고친 뒤 「맵툴 DB 갱신」에서 토큰을 새로 받으세요.</span><button class="btn sm" data-dbk="mt">맵툴 DB 갱신 열기</button></div>`:''}
 <div class="row dbbar"><input id="dbq" type="search" enterkeyhint="search" placeholder="${D.t} 검색" value="${esc(dbs.q)}" style="flex:1 1 220px"><button type="button" class="btn ftog" data-dbftog aria-expanded="${dbs.fopen}">필터<b class="fn">${fCount(k,dbs)?' '+fCount(k,dbs):''}</b></button><button class="btn pri" data-dbact="add">+ 새 항목</button></div>
 <div class="row xfrow fwrap ${dbs.fopen?'on':''}" style="margin-bottom:8px">
  ${k==='moves'?`<select id="dbtype"><option value="">모든 타입</option>${S.db.types.map(t=>`<option ${dbs.type===t[0]?'selected':''}>${esc(t[0])}</option>`).join('')}</select><select id="dbcat"><option value="">모든 분류</option>${['물리','특수','변화'].map(c=>`<option ${dbs.cat===c?'selected':''}>${c}</option>`).join('')}</select>`:''}
  ${k==='pots'?xfHTML(k,dbs)+kindSelect(k,dbs,'id="dbkind"'):k==='items'||k==='old'?kindSelect(k,dbs,'id="dbkind"')+xfHTML(k,dbs):xfHTML(k,dbs)}
  <label class="row small"><input type="checkbox" id="dbmine" ${dbs.mine?'checked':''}>오리지널만 (${S.custom[k].length})</label>
  <span class="sp"></span><button class="btn" data-dbact="reset">원본으로 되돌리기</button></div>
 <div id="dbres">${dbResults()}</div>`}
function renderDBkeep(){keepFocus($('#v-db'),renderDB)}
$('#v-db').addEventListener('click',async e=>{const t=e.target;
 const kb=t.closest('[data-dbk]');if(kb){Object.assign(dbs,{k:kb.dataset.dbk,q:'',type:'',cat:'',kind:'',mine:false,lim:150,f:{},pmin:'',pmax:''});renderDB();return}
 if(t.closest('[data-dbmore]')){dbs.lim+=300;const r=$('#dbres');if(r)r.innerHTML=dbResults();return}
 const ft=t.closest('[data-dbftog]');if(ft){dbs.fopen=!dbs.fopen;$('#v-db .fwrap').classList.toggle('on',dbs.fopen);ft.setAttribute('aria-expanded',dbs.fopen);return}
 if(t.closest('[data-xfreset]')){Object.assign(dbs,{f:{},pmin:'',pmax:'',kind:'',type:'',cat:'',lim:150});renderDB();return}
 const ce=t.closest('[data-copyex]');if(ce){copyStr(dbs.ex[+ce.dataset.copyex][1]);return}
 const ed=t.closest('[data-dbedit]');if(ed){openEdit(dbs.k,+ed.dataset.dbedit);return}
 const mb=t.closest('[data-mt]');if(mb){mb.dataset.mt==='build'?mtDownload(mb.dataset.k):mtImport(mb.dataset.k);return}
 const a=t.closest('[data-dbact]');if(!a)return;const k=dbs.k;
 if(a.dataset.dbact==='add')openEdit(k,-1);
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
 <div class="panel" style="grid-column:1/-1"><h3>실수치 계산식 · 테이블(더블) Q198:Q203</h3><div class="formula">레벨 = 육성 랭크 레벨(랭크→레벨 표 D열) + 분배 레벨<br>HP = ⌊ ⌊종족치 × 2 + 개체치 + 노력치/4⌋ × 레벨/100 ⌋ + 10 + 레벨<br>그 외 = ⌊ ( ⌊ ⌊종족치 × 2 + 개체치 + 노력치/4⌋ × 레벨/100 ⌋ + 5 ) × 성격 보정 ⌋<br><span class="faint">이 제작기는 개체치·노력치·성격을 쓰지 않으므로 각각 0 · 0 · 1.0으로 계산합니다. 복사용 텍스트의 노력치 칸은 빈칸으로 유지됩니다.</span></div></div>
 <div class="panel" style="grid-column:1/-1"><h3>랭크별 기초 템플릿<span class="sp"></span><button class="btn sm" data-tact="tplAdd">+ 행</button><button class="btn sm" data-tact="tplReset">기본값</button></h3>
  <p class="small muted" style="margin:0 0 6px">자질 랭크를 바꾸면 해당 자질의 행이 트레이너 포인트 기본값에 자동으로 들어갑니다. 「공통 / *」 행은 새 트레이너와 「템플릿 다시 적용」 때 들어갑니다. 트레이너의 「1인 기준 (2체)」가 켜져 있으면 「값 (1인)」을, 꺼져 있으면 「값 (6체)」를 씁니다. 1인 값은 룰북 「1인 기준 (2체)」 장의 시안이 기본값으로 들어가 있고, 빈 칸은 다시 열 때 기본값(없으면 6체 값)으로 채워집니다. 비고가 「추정」「시안」인 값은 룰북을 보고 맞춰 주세요.</p>
  <div class="tw"><table><tr><th>자질</th><th>랭크</th><th>항목</th><th class="n">값 (6체)</th><th class="n">값 (1인)</th><th>비고</th><th></th></tr>${S.db.tpl.map((r,i)=>`<tr><td>${sel(`db.tpl.${i}.0`,r[0],['공통',...QUAL],{style:'width:76px'})}</td><td><input data-p="db.tpl.${i}.1" value="${esc(r[1])}" style="width:60px"></td><td><input data-p="db.tpl.${i}.2" value="${esc(r[2])}" list="L-tplitems"></td><td class="n"><input data-p="db.tpl.${i}.3" value="${esc(r[3])}" inputmode="decimal" style="width:60px"></td><td class="n"><input data-p="db.tpl.${i}.5" value="${esc(r[5]??'')}" inputmode="decimal" style="width:60px"></td><td><input data-p="db.tpl.${i}.4" value="${esc(r[4])}"></td><td><button class="btn sm ghost danger" data-tact="tplDel" data-i="${i}" aria-label="삭제">✕</button></td></tr>`).join('')}</table></div>
  <datalist id="L-tplitems">${ptItems().map(r=>`<option value="${esc(r[0])}">`).join('')}</datalist></div>
 <div class="panel" style="grid-column:1/-1"><h3>프라이드 규칙 · 룰북 「포켓몬 제작」<span class="sp"></span><button class="btn sm" data-tact="prReset">기본값</button></h3>
  <p class="small muted" style="margin:0 0 6px">포켓몬의 프라이드를 「자동」으로 두면 종족치 합에서 가장 가까운 기준으로 반올림하고, 『올드 타입』 계열은 버림합니다. 통솔점·특성 TO·최소종족치·화력균형은 기본·능력치 탭의 점검과 포인트 자동 소모에 쓰입니다.</p>
  <div class="tw"><table><tr><th>프라이드</th><th class="n">종족치 합</th><th class="n">통솔점</th><th class="n">특성 TO</th><th class="n">최소종족치</th><th class="n">화력균형</th><th>비고</th></tr>${PR().rows.map((r,i)=>`<tr>${r.map((v,j)=>`<td${j&&j<6?' class="n"':''}><input data-p="db.pride.rows.${i}.${j}" value="${esc(v)}" style="width:${j===0?'48px':j===6?'100%':'64px'}" ${j&&j<6?'inputmode="decimal"':''}></td>`).join('')}</tr>`).join('')}</table></div>
  <div class="row small" style="margin-top:8px;gap:14px">${[['hiCap','프라이드 A 종족치 상한'],['fire','고화력 기준 (공격·특공)'],['dual','쌍두형 기준 (공격·특공 모두)'],['sum3','공격+특공+스피드 최소'],['friendly','『프렌들리 몬스터』: C 기준 +']].map(([k,l])=>`<label class="row" style="gap:4px">${l}<input data-p="db.pride.${k}" value="${esc(PR()[k])}" inputmode="decimal" style="width:56px"></label>`).join('')}</div></div>
 <div class="panel" style="grid-column:1/-1"><h3>트레이너 포인트 항목<span class="sp"></span><button class="btn sm" data-tact="ptiAdd">+ 항목</button><button class="btn sm" data-tact="ptiApply" title="모든 트레이너의 기본값을 이 표와 랭크 템플릿으로 다시 맞춥니다">모든 트레이너에 적용</button><button class="btn sm" data-tact="ptiReset">기본값</button></h3>
  <p class="small muted" style="margin:0 0 6px">캐릭터 시트의 「포인트」 표에 나오는 항목입니다. 기본값은 새 트레이너에 들어가고, 자질 랭크에 따라 바뀌는 값은 아래 「랭크별 기초 템플릿」이 덮어씁니다. 이름을 바꾸면 모든 트레이너의 같은 항목 이름도 함께 바뀝니다.</p>
  <div class="tw"><table><tr><th>항목 이름</th><th class="n">기본값</th><th>자동 소모</th><th></th></tr>${ptItems().map((r,i)=>`<tr><td><input data-pti="${i}.0" value="${esc(r[0])}"></td><td class="n"><input data-pti="${i}.1" value="${esc(r[1])}" inputmode="decimal" style="width:64px"></td><td><select data-pti="${i}.2">${Object.entries(PTI_AUTO).map(([v,l])=>`<option value="${v}" ${(r[2]||'')===v?'selected':''}>${esc(l)}</option>`).join('')}</select></td><td><button class="btn sm ghost danger" data-tact="ptiDel" data-i="${i}" aria-label="삭제">✕</button></td></tr>`).join('')}</table></div></div>
 <div class="panel" style="grid-column:1/-1"><h3>소지품 해금 표<span class="sp"></span><button class="btn sm" data-tact="ilAdd">+ 장소</button></h3>
  <p class="small muted" style="margin:0 0 6px">비워 두면 모든 소지품이 「기본」입니다. 장소마다 특제 품목을 쉼표로 적고, 조건이 채워지면 「열림」으로 바꾸세요. 소지품 검색 창에 잠김·열림 표시와 「해금」「장소」 필터가 생기고, 포켓몬 시트의 소지품 칸에도 표시됩니다.</p>
  <div class="tw"><table><tr><th>장소</th><th>특제 품목 (쉼표)</th><th>해금 조건</th><th>상태</th><th></th></tr>${(S.db.ilock||[]).map((r,i)=>`<tr><td><input data-p="db.ilock.${i}.0" value="${esc(r[0])}" style="width:150px"></td><td><input data-p="db.ilock.${i}.1" value="${esc(r[1])}" list="L-inames" style="width:100%;min-width:280px"></td><td><input data-p="db.ilock.${i}.2" value="${esc(r[2])}" style="min-width:200px"></td><td>${sel(`db.ilock.${i}.3`,r[3]||'잠김',['잠김','열림'],{style:'width:76px'})}</td><td><button class="btn sm ghost danger" data-tact="ilDel" data-i="${i}" aria-label="삭제">✕</button></td></tr>`).join('')}</table></div>
  <datalist id="L-inames">${S.db.items.filter(r=>r[1]).map(r=>`<option value="${esc(r[1])}">`).join('')}</datalist></div>
 <div class="panel" style="grid-column:1/-1"><h3>기술 소켓 규칙</h3><div class="row"><label class="row small" for="oldsock">『올드 타입』 계열(${OLDK.map(esc).join('·')})의 PT 기술점<input id="oldsock" data-p="db.oldSock" value="${esc(S.db.oldSock??5.5)}" inputmode="decimal" style="width:64px"></label><span class="small muted">룰북: 기술 4개만 익히고 PT 전체 기술 소켓에서 고정 5.5점 소모 · 「기술 할인」을 체크하면 교배기·유전기 1개 습득</span></div>
  <div class="row" style="margin-top:8px;gap:14px"><span class="small"><b>1인 기준 (2체) PT 기술점</b> · 육성 랭크별</span>${['D','C','B','A'].map(r=>`<label class="row small" style="gap:4px">${r}<input data-p="db.soloSock.${r}" value="${esc((S.db.soloSock||{})[r]??'')}" inputmode="decimal" style="width:56px"></label>`).join('')}<span class="small muted">룰북 「1인 기준 (2체)」 장 시안 · 6체 기준(32 / 34 / 35.5 / 37)의 1/3</span></div></div>
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
 <div class="panel" style="grid-column:1/-1"><h3>금지 키워드 · BQ2</h3><p class="small muted" style="margin:0 0 6px">포텐셜 효과에 이 정규식과 맞는 표현이 있으면 편집 창과 슬롯에 경고가 뜹니다.</p><textarea data-p="db.ban" rows="4" class="mono" style="font-size:12px">${esc(S.db.ban)}</textarea></div>
 </div>`}
$('#v-tbl').addEventListener('input',e=>{const pt=e.target.dataset.pti;if(pt){const [i,c]=pt.split('.').map(Number);if(c===1){S.db.ptItems[i][1]=e.target.value;save(true)}return}const p=e.target.dataset.p;if(!p)return;const[o,k]=getRef(p);o[k]=e.target.value;save(true)});
$('#v-tbl').addEventListener('change',e=>{const pt=e.target.dataset.pti;if(pt){const [i,c]=pt.split('.').map(Number);const row=S.db.ptItems[i];
  if(c===0){const old=row[0],nw=e.target.value.trim();if(!nw||nw===old){e.target.value=old;return}if(S.db.ptItems.some((r,j)=>j!==i&&r[0]===nw)){toast('같은 이름의 항목이 있습니다');e.target.value=old;return}
   row[0]=nw;for(const t of S.trainers){if(old in t.base){t.base[nw]=t.base[old];delete t.base[old]}if(t.extra&&old in t.extra){t.extra[nw]=t.extra[old];delete t.extra[old]}}for(const r of S.db.tpl)if(r[2]===old)r[2]=nw;save();toast('항목 이름을 바꿨습니다')}
  else if(c===2)row[2]=e.target.value;else row[1]=e.target.value;save(true);return}if(e.target.dataset.p){save(true);if(/^db\.stpl\.\d+\.0$/.test(e.target.dataset.p))renderTbl()}});
$('#v-tbl').addEventListener('click',async e=>{const b=e.target.closest('[data-tact]');if(!b)return;const a=b.dataset.tact,i=+b.dataset.i;
 if(a==='tplAdd')S.db.tpl.push(['지시','C','','','','']);if(a==='tplDel')S.db.tpl.splice(i,1);
 if(a==='prReset'){if(!await ask('프라이드 규칙을 룰북 기본값으로 되돌릴까요?','되돌리기'))return;S.db.pride=clone(PRIDE_DEF);S.db.prideExV=1}
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
 return `<div class="ptc"><div class="ptch"><button type="button" class="lk" data-yact="open" data-v="${esc(t.id)}" title="캐릭터 시트에서 열기">${nm}</button><span class="small muted">${r.n}체 · 타입 ${r.kinds}종${t.solo?' · 1인 기준':''}${r.typed<r.n?` · 타입 미입력 ${r.n-r.typed}체`:''}</span><span class="ptstrip">${t.pokemon.map(p=>{const a=typeInfo(tyParts(p.t1)[0]),b=typeInfo(tyParts(p.t2)[0])||a;return `<i style="background:linear-gradient(135deg,${a&&safeCss(a[1])||'var(--sunk2)'} 50%,${b&&safeCss(b[1])||'var(--sunk2)'} 50%)" title="${esc(p.name||'')} · ${esc([p.t1,p.t2].filter(x=>x&&x!=='-').join('/'))}"></i>`}).join('')}</span></div>
  <div class="ptcr"><span class="k">구성</span><span class="v">${r.comp.map(e=>`<span class="cb" title="${e.who.map(esc).join('\n')}">${tchip(e.x)}<b>${e.n}</b></span>`).join('')}</span></div>
  <div class="ptcr"><span class="k">공통 약점</span><span class="v">${weakTxt}</span></div>
  <div class="ptcr"><span class="k">못 막는 타입</span><span class="v">${openTxt}</span></div></div>`}
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
 $('#v-char').hidden=tab!=='char';$('#v-type').hidden=tab!=='type';$('#v-db').hidden=tab!=='db';$('#v-tbl').hidden=tab!=='tbl';refreshAll();save();MKROOT().scrollTo(0,0)}
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
const folderOut=f=>{const o={id:f.id,name:f.name||''};if(f.priv)o.priv=true;if(f.owner){o.owner=f.owner;o.ownerName=f.ownerName||''}return o};
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
  if(o.tpl){S.db.tpl=o.tpl;if(o.tplSoloV!=null)S.db.tplSoloV=+o.tplSoloV||0}if(o.soloSock&&typeof o.soloSock==='object')S.db.soloSock=o.soloSock;if(o.rules&&typeof o.rules==='object')S.db.rules=o.rules;if(o.tags)S.db.tags=o.tags;if(o.stpl){S.db.stpl=stplMigrate(o.stpl,o.stplV);S.db.stplV=STPL_V}if(o.oldSock!=null)S.db.oldSock=o.oldSock;if(o.ptItems)S.db.ptItems=o.ptItems;if(o.pride){S.db.pride=o.pride;S.db.prideExV=o.prideExV||0;prideMigrate(S.db)}if(Array.isArray(o.ilock))S.db.ilock=o.ilock;if(Array.isArray(o.folders)){const fs=o.folders.filter(f=>f&&f.id).map(f=>folderOut({id:String(f.id),name:String(f.name||''),priv:!!f.priv,owner:f.owner?String(f.owner):'',ownerName:String(f.ownerName||'')}));if(mode==='add'){for(const f of fs)if(!S.folders.some(x=>x.id===f.id))S.folders.push(f)}else S.folders=fs}
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
const UIK=new Set(['open','tab']);
const nowHM=()=>new Date().toLocaleTimeString('ko-KR',{hour:'2-digit',minute:'2-digit'});
function shStatus(t){SH.last=t;const el=$('#saved');if(el)el.innerHTML=`<span class="shpill ${SH.canWrite?'':'ro'}">공유</span> ${esc(t)}`}
const canon=o=>JSON.stringify(o,(k,v)=>v&&typeof v==='object'&&!Array.isArray(v)?Object.fromEntries(Object.keys(v).sort().map(x=>[x,v[x]])):v);
function fnv(s){let h=2166136261;for(const c of String(s)){h^=c.codePointAt(0);h=Math.imul(h,16777619)>>>0}return h.toString(16)}
function keySeg(k){const h=[...new TextEncoder().encode(String(k))].map(b=>b.toString(16).padStart(2,'0')).join('');return h.length<=180?h:'h'+fnv(k)+h.slice(0,40)}
function stripUI(o){const c={};for(const k in o){if(UIK.has(k)||k[0]==='_'||k==='pokemon')continue;c[k]=clone(o[k])}return c}
let DEFJ=null,DEFJN=-1;function defJ(){const rn=(DEF.rm||[]).length;if(DEFJ&&DEFJN===rn)return DEFJ;DEFJN=rn;DEFJ={};for(const k in DBS){const m=new Map();for(const r of DEF[k]||[]){const key=r[DBS[k].key];if(key!==''&&!m.has(key))m.set(key,JSON.stringify(r))}DEFJ[k]=m}return DEFJ}
function dbEditDocs(out=new Map()){const dj=defJ();
 for(const k in DBS){if(k==='rm'&&!rmLoaded())continue;/* 레디메이드 기본 행이 아직 없으면 비교하지 않는다 (915행이 전부 「바뀐 행」으로 잡히는 것 방지) */const seen=new Set(),cust=new Set(S.custom[k]||[]);
  S.db[k].forEach((r,ix)=>{const key=r[DBS[k].key];if(key===''||key==null||seen.has(key))return;seen.add(key);const d=dj[k].get(key);
   if(d===JSON.stringify(r))return;out.set('dbedit/'+k+'.'+keySeg(key),{kind:k,key,row:r,custom:cust.has(key),pos:d?-1:ix})});
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
 S.folders.forEach((f,i)=>{f._ord=i;const d={ord:i,name:f.name||''};if(f.priv)d.priv=true;if(f.owner){d.owner=f.owner;d.ownerName=f.ownerName||''}out.set('folders/'+f.id,d)});
 S.trainers.forEach((t,i)=>{const d=stripUI(t);d.pids=t.pokemon.map(p=>p.id);out.set('trainers/'+t.id,{ord:i,data:d});
  t.pokemon.forEach(p=>out.set('pokemon/'+p.id,{tid:t.id,data:stripUI(p)}))});
 for(const [p,b] of shDbDocs())out.set(p,b);
 /* 레디메이드 기본 행을 아직 못 읽었으면, 받아 둔 레디메이드 수정 행은 그대로 둔다 (지우지 않게) */
 if(!rmLoaded())for(const [id,d] of SH.ed)if(d&&d.kind==='rm')out.set('dbedit/'+id,d);
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
 if(!p)p={id,open:false,tab:'base'};replaceFields(p,clone(d.data||{}),KEEP_P);p.id=id;p._tid=d.tid;fixP(p);
 const t=S.trainers.find(x=>x.id===d.tid);
 if(owner&&owner!==t)owner.pokemon=owner.pokemon.filter(q=>q!==p);
 if(t){if(!t.pokemon.includes(p)){const pos=(t._pids||[]).indexOf(id);if(pos>=0){const after=t.pokemon.filter(q=>(t._pids||[]).indexOf(q.id)>=0&&(t._pids||[]).indexOf(q.id)<pos).length;t.pokemon.splice(after,0,p)}else t.pokemon.push(p)}SH.orph.delete(id)}
 else SH.orph.set(id,p)}
function shDelTrainer(id){S.trainers=S.trainers.filter(t=>t.id!==id)}
function shDelPoke(id){for(const t of S.trainers)t.pokemon=t.pokemon.filter(p=>p.id!==id);SH.orph.delete(id)}
function shRebuildDB(){/* 아직 올리지 않은 내 설정 묶음은 받은 값으로 덮지 않는다 */const keepG={};if(SH.ready){const loc=shMetaGroups();for(const g in loc){const p='meta/set.'+g;if(SH.synced.has(p)&&SH.synced.get(p)!==canon(loc[g]))keepG[g]=clone(loc[g])}}
 const keepNonDb={};for(const k in DEF)if(!(k in DBS))keepNonDb[k]=clone(DEF[k]);
 const byKind={};for(const d of SH.ed.values()){(byKind[d.kind]=byKind[d.kind]||[]).push(d)}
 for(const k in DBS){const eds=byKind[k]||[];const mods=new Map(),del=new Set(),adds=[],cust=[];
  for(const d of eds){if(d.deleted)del.add(d.key);else if(Array.isArray(d.row)){if(d.pos>=0)adds.push(d);else mods.set(d.key,d.row)}if(d.custom&&!d.deleted)cust.push(d.key)}
  const key=r=>r[DBS[k].key];let rows=(DEF[k]||[]).filter(r=>!del.has(key(r))).map(r=>mods.has(key(r))?clone(mods.get(key(r))):clone(r));
  adds.sort((a,b)=>a.pos-b.pos);for(const a of adds)rows.splice(Math.min(a.pos,rows.length),0,clone(a.row));
  S.db[k]=rows;S.custom[k]=cust}
 Object.assign(S.db,keepNonDb);const m=SH.meta;
 S.db.tpl=m&&m.tpl&&(m.tplV||0)>=TPL_V?clone(m.tpl):clone(TPL_DEF);S.db.tplV=TPL_V;S.db.tags=m&&m.tags&&(m.tagsV||0)>=TAGS_V?clone(m.tags):clone(TAGS_DEF);S.db.tagsV=TAGS_V;S.db.ban=m&&m.ban!=null?m.ban:DEF.ban;{const _sv=m&&m.stplV||0;S.db.stpl=stplMigrate(m&&m.stpl?clone(m.stpl):null,_sv);S.db.stplV=STPL_V;if(_sv<4&&_sv>0)SH.purge=true}S.db.oldSock=m&&m.oldSock!=null?m.oldSock:5.5;S.db.ptItems=m&&m.ptItems?clone(m.ptItems):clone(PTI_DEF);S.db.ptiV=m&&m.ptiV||0;ptiMigrate(S.db);S.db.pride=m&&m.pride?clone(m.pride):clone(PRIDE_DEF);S.db.prideExV=m&&m.prideExV||0;prideMigrate(S.db);
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
 if(kind==='folders'){if(d){let f=S.folders.find(x=>x.id===id);if(!f){f={id};S.folders.push(f)}f.name=String(d.name||'');f._ord=+d.ord||0;f.priv=!!d.priv;if(d.owner){f.owner=String(d.owner);f.ownerName=String(d.ownerName||'')}else{delete f.owner;delete f.ownerName}}else{S.folders=S.folders.filter(x=>x.id!==id)}return 't'}}
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
 if(!db){if(window.MKM_STORE&&MKM_STORE.configured())SH.failed=true;const el=$('#saved');if(el)el.textContent=window.MKM_STORE&&MKM_STORE.configured()?'공유 DB 연결 실패 · 이 브라우저에만 저장':'이 브라우저에만 저장 (js/config.js에 공유 DB 설정 없음)';return}
 SH.db=db;SH.on=true;SH.orph=new Map();shStatus('공유 저장소 연결 중…');
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
 shFlush()}
function renderAll(){if(S.ui.tab==='char')renderChar();else refreshAll()}

const MKROOT=()=>document.getElementById('mk')||document.body;
/* ---------- 세션 노트 연동: 같은 페이지의 세션 노트가 트레이너를 바로 읽는다 ---------- */
let mkmT=null;function mkmChanged(){clearTimeout(mkmT);mkmT=setTimeout(()=>window.dispatchEvent(new CustomEvent('mkm-change')),120)}
window.MKM={bundle:()=>sessionBundle(S.trainers),
 open(id){const t=S.trainers.find(x=>x.id===id);if(!t)return false;if(S.ui.tab!=='char')showTab('char');t.open=true;save();renderChar();
  const el=document.getElementById('tr-'+id);if(el){const r=MKROOT(),hd=r.querySelector('.top');r.scrollTo({top:Math.max(0,el.getBoundingClientRect().top-r.getBoundingClientRect().top+r.scrollTop-(hd?hd.offsetHeight:0)-10)});el.classList.add('flash');setTimeout(()=>el.classList.remove('flash'),1600)}return true}};

/* ---------- 시작 ---------- */
load();
showTab(S.ui.tab||'char');
loadFx();
meLoad();
shInit();
/* 아직 공유 DB 에 올라가지 않은 수정이 있으면 탭을 닫기 전에 한 번 묻는다 (그 사이 저장을 한 번 더 시도) */
window.addEventListener('beforeunload',e=>{if(!SH.on||!SH.ready||!SH.canWrite)return;let dirty=!!SH.flushing;try{if(!dirty)for(const [p,b] of shWant()){const j=canon(b);if(SH.synced.get(p)!==j&&!(SH.bad&&SH.bad.get(p)===j)){dirty=true;break}}}catch(_){}if(dirty){try{shFlush()}catch(_){}e.preventDefault();e.returnValue=''}});
