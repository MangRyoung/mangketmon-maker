/* ---------- 던전 생성 (11-15 망령 「제작기에서 PL 들도 던전 생성을 해볼 수 있게 · 던전은 난이도별로 템플릿 시트 적용」) ----------
   누구나(서명이 없어도) 던전을 만들고 고친다. 공유 DB kind 'dungeon' 한 문서 = 던전 하나:
     {d: 웹툴 던전 가져오기 형식 {n, st, r, l, mq, a, o}, tier: s1|s2|s3, owner, ownerName, pub, at, seed}
   웹툴 던전 탭 「JSON 가져오기」 → 「제작기에서 만든 던전」 목록에서 그대로 가져간다 (방의 w = 야생 시트 설계).
   난이도 템플릿 = 미사그 던전 적 스펙 (노트 65 · 룰북 던전 탐색장 「미사그 대학 던전」, 11-11 확정):
     구성 · 레벨(분배레벨 dist 로) · 프라이드(통솔점 합) · 『계제』 칸 수 · 미궁 포텐셜 수 · 야생 포텐셜 수 · 레이드.
   야생 시트는 「빈 뼈대」만 — 포켓몬 · 기술 · 포텐셜 내용은 만든 사람이 채운다. 『계제』(gye) · 야생 포텐셜(wp)은 웹툴에서 전용 칸으로 들어간다.
   11-16 망령 「세션 노트에 잘 정비해 둔 포켓몬 제작 UI 를 왜 내다 버리나」: 방의 야생 시트 = **제작기 트레이너 한 명**(r.mk = 트레이너 id, 「던전 야생 / 던전 이름」 폴더).
     포켓몬은 제작기 포켓몬 시트 그대로 — 고치기는 노트처럼 제작기 한 장 창(?focus=&p=&embed=1). 『계제』 · 야생 포텐셜 = 그 포켓몬의 전용 칸(excl · exclX).
     생성기가 만든 뼈대(r.w)는 편집을 열 때 제작기 트레이너로 옮긴다. 웹툴 가져오기는 r.mk 의 제작기 트레이너를 읽어 야생 시트로 만든다. */
"use strict";
window.MK_DG=(()=>{
 const ENV=()=>window.MKM_ENV||{};
 const esc=s=>String(s??'').replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
 const toast=m=>{try{ENV().toast(m)}catch(e){}};
 const clone=o=>JSON.parse(JSON.stringify(o));
 const uid=p=>p+Date.now().toString(36).slice(-5)+Math.random().toString(36).slice(2,6);
 const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));

 /* ── 난이도 템플릿 ── pre = 사전 배틀 방마다 머릿수, boss = 보스방 머릿수(보스 포함) */
 const TPL={
  s1:{n:'사건 1',sub:'2 + 2 + 4 · 레이드 2',pre:[2,2],boss:4,raid:2,lv:{pre:-5,esc:-5,boss:5},gye:{pre:0,esc:1,boss:2},mq:1,wp:1,escP:['C+','C+','C'],tgt:8,rest:false,chk:[10,10,12],seq:['entry','check','b0','check','b1','check','boss']},
  s2:{n:'사건 2',sub:'4 + 4 · 레이드 3',pre:[4],boss:4,raid:3,lv:{pre:-5,esc:0,boss:5},gye:{pre:0,esc:1,boss:2},mq:1,wp:2,escP:['B','C+','C+'],tgt:9,rest:false,chk:[10,12,12],seq:['entry','check','check','b0','check','boss']},
  s3:{n:'사건 3',sub:'2 + 6 · 보스 앞 중간 휴식 · 레이드 3',pre:[2],boss:6,raid:3,lv:{pre:-5,esc:0,boss:10},gye:{pre:1,esc:2,boss:3},mq:2,wp:3,escP:['B','B','C+','C+','C'],tgt:10,rest:true,chk:[12,12,15],seq:['entry','check','b0','check','check','rest','boss']}};
 const PRIDES=['D','C','C+','B','B+','A','EX'];
 const PCOST0={D:.5,C:1,'C+':1.5,B:2,'B+':2.5,A:3,EX:4};
 const pcost=k=>{try{const c=ENV().prideCost&&ENV().prideCost(k);if(c!=null&&Number.isFinite(+c))return +c}catch(e){}return PCOST0[k]??1};
 const AUTO={8:'easy',10:'normal',12:'hard',15:'vhard'};
 const STATS=['지시','육성','통솔','능력'];

 /* ── 테마 (시뮬 자동 생성기 테마를 줄여 옮김) ── */
 const TH={
  폐가:{a:'안개 · 폐가',name:['비 새는 고아원','불 꺼진 여관','숲 속의 폐가','흐느끼는 저택'],entry:['녹슨 철문','무너진 현관'],battle:['현관 홀','삐걱이는 계단','긴 복도','무도회장'],check:['서재','잠긴 다락','지하 저장고','기도실'],side:['먼지 쌓인 창고','깨진 온실','하인 방'],boss:['주인의 침실','지하 예배실'],chk:{지시:['흩어진 일기장의 순서를 맞춘다','거울 장치의 각도를 맞춘다'],육성:['겁먹은 야생 포켓몬을 달랜다','곰팡이 독을 가려낸다'],통솔:['무너지는 계단을 함께 건넌다','어둠 속에서 대열을 지킨다'],능력:['흐느끼는 소리의 근원을 찾는다','닫힌 문을 힘으로 연다']}},
  동굴:{a:'어둠 · 동굴',name:['메아리 굴','수정 갱도','검은모래 동굴','이끼 낀 갱도'],entry:['갱도 입구','바위틈'],battle:['박쥐 굴','지하 호수','갈림길 광장','수정 회랑'],check:['좁은 틈','무너진 갱목 길','물이 찬 굴','종유석 지대'],side:['광부 창고','작은 물웅덩이','곰팡이 굴'],boss:['가장 깊은 동공','수정 심장부'],chk:{지시:['메아리로 길을 찾는다','무너질 바위를 읽는다'],육성:['야생의 발자국을 쫓는다','다친 포켓몬을 응급 처치한다'],통솔:['물길을 함께 건넌다','겁먹은 포켓몬을 진정시킨다'],능력:['낙석을 막아 선다','어둠 속 기척을 읽는다']}},
  숲:{a:'안개 · 숲',name:['속삭이는 숲','버섯 골짜기','안개 숲','고목의 숲'],entry:['숲 어귀','이정표 앞'],battle:['덤불 사이','쓰러진 고목','버섯 군락','개울가'],check:['가시덤불','늪지','덩굴 터널','안개 낀 공터'],side:['버려진 덫','이끼 바위','다람쥐 굴'],boss:['고목의 뿌리','숲의 심장'],chk:{지시:['안개 속 표식을 따라간다','덩굴의 매듭을 푼다'],육성:['독초와 약초를 가려낸다','야생의 흔적을 쫓는다'],통솔:['늪을 함께 건넌다','안개 속에서 대열을 지킨다'],능력:['쓰러진 나무를 치운다','숲의 속삭임을 듣는다']}},
  연구소:{a:'폐허 · 연구소',name:['폐쇄된 사육 센터','버려진 연구소','봉쇄된 실험동','지하 관측소'],entry:['정문 게이트','화물 승강기'],battle:['조립 라인','사육실','통제실 앞','격리 복도'],check:['보안 문','전원실','오염 구역','기록실'],side:['비품실','샘플 냉동고','서버실'],boss:['중앙 실험실','원자로 구역'],chk:{지시:['보안 장치의 암호를 푼다','배전반 회로를 다시 잇는다'],육성:['오염된 공기를 견딘다','실험체의 상태를 살핀다'],통솔:['정전 속에서 대열을 지킨다','겁먹은 실험체를 달랜다'],능력:['막힌 셔터를 들어 올린다','감시 장치를 피한다']}},
  수로:{a:'어둠 · 지하 수로',name:['성벽 아래 수로','잊힌 하수도','운하 밑 터널','물방울 지하도'],entry:['수로 입구','철창 하수구'],battle:['물이 고인 광장','쥐 떼 통로','무너진 수문','합류 지점'],check:['좁은 배수관','물살 센 다리','잠긴 수문','미끄러운 계단'],side:['밀수품 창고','버려진 배','작은 제단'],boss:['거대 저수조','수로의 심장'],chk:{지시:['수문 장치의 순서를 맞춘다','물길 지도를 읽는다'],육성:['더러운 물을 견딘다','다친 포켓몬을 응급 처치한다'],통솔:['물살 속에서 서로를 붙잡는다','어둠 속에서 대열을 지킨다'],능력:['녹슨 철창을 비튼다','물속의 기척을 읽는다']}}};
 const TY={entry:['입구','⛩','#59b6ff'],room:['통로','◇','#8fa3bf'],battle:['조우 구역','☠','#ff4d5e'],trap:['함정·기믹','⚙','#ffa53a'],puzzle:['수수께끼','✦','#c58bff'],treasure:['보물','◆','#e0b800'],safe:['세이프룸','☗','#2fbf88'],boss:['심층부','♛','#ff2a6d']};
 const RK=[['','—'],['long','긴 휴식'],['mid','중간 휴식'],['breath','숨돌리기']];

 /* ── 씨앗 난수 ── */
 function rngOf(seed){let a=(+seed||1)>>>0;return()=>{a|=0;a=a+0x6D2B79F5|0;let t=Math.imul(a^a>>>15,1|a);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296}}

 /* ── 격자 배치 (시뮬 autogen.js walkGrid · gridPath 를 옮김: 7×5, 웹툴 편집 판 1000×640 안) ── */
 const GRID={cols:7,rows:5,x0:80,dx:140,y0:65,dy:130};
 const DIRS=[[1,0],[0,1],[-1,0],[0,-1]];
 const ck=(c,r)=>c+','+r;
 function walkGrid(rng,n,turn){const C=GRID.cols,Rw=GRID.rows,inb=(c,r)=>c>=0&&r>=0&&c<C&&r<Rw;
  for(let t=0;t<300;t++){const st=[Math.floor(rng()*C),Math.floor(rng()*Rw)],used=new Set([ck(...st)]),path=[st];let steps=0;
   const go=dir=>{if(path.length===n)return true;if(++steps>4000)return false;const [c,r]=path[path.length-1];
    const ord=[0,1,2,3].filter(i=>dir<0||i!==(dir+2)%4).map(i=>({i,w:(dir<0||i===dir?1-turn:turn/2)*(0.5+rng())})).sort((a,b)=>b.w-a.w);
    for(const {i} of ord){const nc=c+DIRS[i][0],nr=r+DIRS[i][1];if(!inb(nc,nr)||used.has(ck(nc,nr)))continue;used.add(ck(nc,nr));path.push([nc,nr]);if(go(i))return true;path.pop();used.delete(ck(nc,nr))}return false};
   if(go(-1))return {path,used}}
  return null}
 function gridPath(rng,a,b,k,used){const P=[a];const seen=new Set([ck(...a)]);
  const go=()=>{const [c,r]=P[P.length-1];const left=k-(P.length-1);const d=Math.abs(c-b[0])+Math.abs(r-b[1]);if(d>left||(left-d)%2)return false;if(left===0)return c===b[0]&&r===b[1];
   for(const i of [0,1,2,3].sort(()=>rng()-0.5)){const nc=c+DIRS[i][0],nr=r+DIRS[i][1];if(nc<0||nr<0||nc>=GRID.cols||nr>=GRID.rows)continue;const kk=ck(nc,nr);const end=nc===b[0]&&nr===b[1];if(end?left!==1:(used.has(kk)||seen.has(kk)))continue;seen.add(kk);P.push([nc,nr]);if(go())return true;P.pop();seen.delete(kk)}return false};
  return go()?P:null}
 const xy=([c,r])=>({x:GRID.x0+c*GRID.dx,y:GRID.y0+r*GRID.dy});
 const lk=(a,b)=>[a,b].sort().join('~');

 /* ── 야생 시트 뼈대 ── role: pre(사전 몹) · esc(보스방 졸개) · boss */
 function slot(role,i,T){const s={role,name:'',t1:'-',t2:'-',base:[60,60,60,60,60,60],ability:'',moves:[],pride:'C',dist:0,boss:false,pots:[],gye:[]};fit(s,role,i,T);return s}
 function fit(s,role,i,T){s.role=role;s.pride=role==='boss'?'A':role==='esc'?(T.escP[i]||'C'):'C';s.dist=T.lv[role];s.boss=role==='boss';
  const keep=(s.pots||[]).filter(p=>!/^와일드( 보스)?$|^레이드 배틀/.test(p));s.pots=(role==='boss'?['와일드 보스','레이드 배틀 : '+T.raid]:['와일드']).concat(keep);
  const n=T.gye[role];const g=(s.gye||[]).filter(x=>x&&(x.name||x.eff));while(g.length<n)g.push({name:'',eff:''});s.gye=g.slice(0,Math.max(n,g.filter(x=>x.name||x.eff).length));return s}
 function wild(nm,role,n,T){return {name:(role==='pre'?'야생 · ':'야생 보스 · ')+nm,rank:'C',mons:Array.from({length:n},(_,i)=>i===0&&role!=='pre'?slot('boss',0,T):slot(role==='pre'?'pre':'esc',role==='pre'?i:i-1,T))}}
 /* 야생 포텐셜(wp) 칸: 보스 → 졸개 → 사전 몹 순으로 템플릿 개수만큼 */
 function wpFit(d,T){const L=[];for(const id of roomOrder(d)){const r=d.r[id];if(r&&r.w)for(const m of r.w.mons)L.push(m)}L.sort((a,b)=>({boss:0,esc:1,pre:2}[a.role]??3)-({boss:0,esc:1,pre:2}[b.role]??3));
  let left=T.wp;for(const m of L){const filled=m.wp&&(m.wp.name||m.wp.eff);if(left>0){if(!m.wp)m.wp={name:'',eff:''};left--}else if(!filled)delete m.wp}}
 function mqFit(d,T){const q=(d.mq||[]).filter(x=>x&&(x.name||x.eff));while(q.length<T.mq)q.push({name:'',eff:''});d.mq=q}

 /* ── 제작기 트레이너 = 방의 야생 시트 ── */
 const mS=()=>{try{return ENV().S&&ENV().S()}catch(e){return null}};
 const TR=id=>{const S=mS();return S&&id?S.trainers.find(t=>t.id===id)||null:null};
 const potNames=p=>(p.pots||[]).map(v=>String(v||'').trim()).filter(Boolean);
 const isBossP=p=>potNames(p).includes('와일드 보스');
 const exN=p=>((p.excl&&p.excl.name)?1:0)+(Array.isArray(p.exclX)?p.exclX.filter(e=>e&&e.name).length:0);
 const prOf=p=>{if(p.pride)return p.pride;try{return ENV().prideOf(p)||'C'}catch(e){return 'C'}};
 /* 방의 야생 → [{name, pride, boss, role, ex(이름 있는 전용 수), p(제작기 포켓몬)|m(뼈대)}] */
 function monsOf(r){if(!r)return [];if(r.mk){const t=TR(r.mk);if(!t)return [];return t.pokemon.map(p=>{const boss=r.t==='boss'&&isBossP(p);return {name:p.nick||p.name||'',pride:prOf(p),boss,role:r.t==='boss'?(boss?'boss':'esc'):'pre',ex:exN(p),p}})}
  if(r.w)return r.w.mons.map(m=>({name:m.name,pride:m.pride,boss:!!m.boss,role:m.role||'pre',ex:(m.gye||[]).filter(g=>g.name).length+(m.wp&&m.wp.name?1:0),m}));return []}
 /* 11-23 22:43 망령 「기록보관소 지하 서고에 만들어 둔 조우 포켓몬이 (세션 노트에) 연결 안 되어 있다」: 11-16 부터 방의 야생은 r.mk(제작기 트레이너)뿐이라
    세션 노트(fromOm — 방의 w 만 읽는다)로 받으면 조우가 비었다. 저장할 때 r.mk 방에 그 트레이너의 사본 w(야생 시트 꼴)를 같이 적는다 —
    제작기 화면은 받을 때 다시 떼어 r.mk 만 쓴다. 야생 시트를 고친 뒤에도 사본이 따라가도록 던전 탭을 그릴 때 견줘 다르면 다시 저장(snapSync). */
 function pToSlot(p,r){const boss=r.t==='boss'&&isBossP(p);const ex=[p.excl,...(p.exclX||[])].filter(g=>g&&(g.name||g.eff)).map(g=>({name:g.name||'',eff:String(g.eff||'')}));
  return {role:r.t==='boss'?(boss?'boss':'esc'):'pre',name:p.nick||p.name||'',t1:p.t1||'-',t2:p.t2||'-',base:(p.base||[]).slice(0,6).map(v=>+v||0),ability:p.ability||'',moves:(p.moves||[]).map(m=>m&&!m.hide&&(m.name||m)).filter(z=>z&&typeof z==='string'),pride:prOf(p),dist:+p.dist||0,boss,pots:potNames(p),gye:ex}}
 function snapOf(r){const t=r&&r.mk?TR(r.mk):null;if(!t)return null;return {name:t.name||('야생 · '+(r.n||'')),rank:'C',mons:(t.pokemon||[]).map(p=>pToSlot(p,r))}}
 function withSnap(x){try{const y=clone(x);for(const r of Object.values((y.d||{}).r||{})){const w=snapOf(r);if(w)r.w=w}return y}catch(e){return x}}
 const snapKey=(x,live)=>{try{const o={};for(const [id,r] of Object.entries((x.d||{}).r||{}))if(r&&r.mk){const w=live?snapOf(r):r.w;if(live&&!w)continue;o[id]=w||null}return JSON.stringify(o)}catch(e){return ''}};
 function snapSync(){try{if(!db()||!mkReady())return;for(const [id,x] of Object.entries(ST.docs||{})){if(!x||!x.d||!canEd(x)||ST.dirty.has(id))continue;{const MK=Object.values(x.d.r||{}).filter(r=>r&&r.mk);if(!MK.length||!MK.every(r=>TR(r.mk)))continue}const now=snapKey(x,1);if(now&&now!=='{}'&&now!==(ST.wsnap||{})[id]){ST.wsnap=ST.wsnap||{};ST.wsnap[id]=now;touch(id)}}}catch(e){}}
 function fitP(p,role,i,T){p.pride=role==='boss'?'A':role==='esc'?(T.escP[i]||'C'):'C';p.dist=T.lv[role];
  const keep=potNames(p).filter(v=>!/^와일드( 보스)?$|^레이드 배틀/.test(v));const L=(role==='boss'?['와일드 보스','레이드 배틀 : '+T.raid]:['와일드']).concat(keep);
  const n=Math.max(20,(p.pots||[]).length);const pe=p.potEff||[],pk=p.potKind||[];const oldE={},oldK={};(p.pots||[]).forEach((v,j)=>{if(v){oldE[String(v).trim()]=pe[j]||'';oldK[String(v).trim()]=pk[j]||''}});
  p.pots=Array.from({length:n},(_,j)=>L[j]||'');p.potEff=p.pots.map(v=>v?(oldE[v]||''):'');p.potKind=p.pots.map(v=>v?(oldK[v]||''):'');return p}
 function newP(role,i,T){const E=ENV();const p=E.newPoke();p.open=false;return fitP(p,role,i,T)}
 /* 생성기 뼈대(slot) → 제작기 포켓몬 */
 function slotToP(s,T){const p=newP(s.role||'pre',0,T);p.name=s.name||'';p.t1=s.t1||'-';p.t2=s.t2||'-';p.ability=s.ability||'';p.moves=(s.moves||[]).map(n=>({name:n,half:false}));p.pride=s.pride||p.pride;p.dist=+s.dist||0;
  if(s.name&&!spOf(s.name)&&Array.isArray(s.base))p.base=s.base.slice(0,6).map(v=>String(v));   /* DB 에 없는 새 몬스터만 종족치를 옮긴다 */
  const keep=(s.pots||[]).filter(Boolean);p.pots=Array.from({length:20},(_,j)=>keep[j]||'');p.potEff=p.pots.map(()=>'');p.potKind=p.pots.map(()=>'');
  const ex=[...(s.gye||[]),...(s.wp?[s.wp]:[])].filter(g=>g&&(g.name||g.eff));if(ex[0])p.excl={name:ex[0].name||'',eff:ex[0].eff||''};p.exclX=ex.slice(1).map(g=>({name:g.name||'',eff:g.eff||''}));return p}
 /* 폴더: 뿌리 「던전 야생」(dgRoot) · 던전마다 하나(dgId). 11-16: 예전 표시가 안 남던 폴더도 이름 · 그 던전 트레이너의 폴더로 찾는다(겹쳐 만들지 않게) */
 function folderFor(id,x){const S=mS();if(!S)return '';const E=ENV();
  let f=S.folders.find(f=>f&&f.dgId===id);if(!f){const g=S.trainers.find(t=>t&&t.wild&&t.dgId===id&&t.folder);if(g)f=S.folders.find(q=>q&&q.id===g.folder);if(f)f.dgId=id}
  if(f)return f.id;
  let root=S.folders.find(f=>f&&f.dgRoot)||S.folders.find(f=>f&&!f.parent&&f.name==='던전 야생');if(!root){root={id:E.uid(),name:'던전 야생',deco:{icon:'🗺',title:'제작기 「던전 생성」 탭이 만든 야생 시트 — 던전마다 폴더 하나'}};S.folders.push(root)}root.dgRoot=true;
  f={id:E.uid(),name:(x&&x.d&&x.d.n)||'던전',parent:root.id,dgId:id};S.folders.push(f);return f.id}
 function mkGroup(id,x,rid,r,mons){const E=ENV();const S=mS();if(!S)return '';const t=E.newTrainer();t.open=false;t.name=(r.t==='boss'?'야생 보스 · ':'야생 · ')+(r.n||'방');t.kind='npc';t.folder=folderFor(id,x);
  t.ranks={지시:'D',육성:'C',통솔:'D',능력:'D'};t.wild=true;t.dgId=id;t.dgRoom=rid;t.pokemon=mons||[];S.trainers.push(t);return t.id}
 /* 뼈대(r.w)를 제작기 트레이너로 옮긴다 — 편집할 수 있고 제작기가 다 불러왔을 때 */
 const mkReady=()=>{const E=ENV();if(!mS())return false;if(!db())return true;return !!(E.shOn&&E.shOn()&&E.canWrite&&E.canWrite())};
 function materialize(id){const x=ST.docs[id];if(!x||!canEd(x)||!mkReady())return 0;const T=TPL[x.tier]||TPL.s1;let n=0;
  for(const [rid,r] of Object.entries(x.d.r||{})){if(!r||r.mk||!r.w)continue;const tid=mkGroup(id,x,rid,r,r.w.mons.map(s=>slotToP(s,T)));if(!tid)continue;r.mk=tid;delete r.w;n++}
  if(n){ENV().save();touch(id)}return n}
 const groupsOf=id=>{const S=mS();return S?S.trainers.filter(t=>t&&t.wild&&t.dgId===id):[]};
 function dropGroups(id,only){const S=mS();if(!S)return 0;const before=S.trainers.length;S.trainers=S.trainers.filter(t=>!(t&&t.wild&&t.dgId===id&&(!only||only.includes(t.id))));const n=before-S.trainers.length;if(n)ENV().save();return n}

 /* 시작 방에서 가까운 순 (보스방은 맨 뒤) */
 function roomOrder(d){const adj={};for(const k of Object.keys(d.l||{})){const [a,b]=k.split('~');(adj[a]=adj[a]||[]).push(b);(adj[b]=adj[b]||[]).push(a)}
  const seen=new Set([d.st]),q=[d.st],out=[];while(q.length){const c=q.shift();if(!d.r[c])continue;out.push(c);for(const n of adj[c]||[])if(!seen.has(n)){seen.add(n);q.push(n)}}
  for(const id of Object.keys(d.r))if(!seen.has(id))out.push(id);return out}

 /* ── 생성 ── */
 /* 11-16 망령 「테마는 선택 외에 입력도 가능하게」: 목록에 없는 테마를 적으면 어느 테마에도 맞는 방 이름 · 체크 글로 만들고(이름은 어차피 손질), 분위기(a) · 던전 이름에 적은 테마를 쓴다 */
 const TH_FREE=t=>({a:t,name:[t+' 깊은 곳',t+'의 안쪽','잊힌 '+t,t+' 어딘가'],entry:['들머리','입구'],battle:['넓은 터','좁은 길목','갈림길','막다른 곳'],check:['막힌 길','수상한 자리','낡은 장치','갈라진 틈'],side:['숨은 구석','외진 곳','버려진 자리'],boss:['가장 깊은 곳','주인의 자리'],chk:{지시:['흩어진 단서를 차례대로 맞춘다','장치가 움직이는 규칙을 읽는다'],육성:['겁먹은 야생 포켓몬을 달랜다','해로운 것을 가려낸다'],통솔:['위험한 길을 함께 건넌다','흩어지지 않게 대열을 지킨다'],능력:['수상한 기척의 근원을 찾는다','막힌 길을 힘으로 연다']}});
 function generate(o){const T=TPL[o.tier]||TPL.s1;const tn=String(o.theme||'').trim().slice(0,20);const th=TH[tn]||(tn?TH_FREE(tn):TH.폐가);const seed=+o.seed||Math.floor(Math.random()*1e6);const rng=rngOf(seed);const pick=a=>a[Math.floor(rng()*a.length)];
  const used=new Set();const nm=a=>{const L=a.filter(x=>!used.has(x));const v=L.length?pick(L):pick(a);used.add(v);return v};
  const stats=[...STATS].sort(()=>rng()-0.5);let si=0,ci=0;const chkT=[...T.chk].sort(()=>rng()-0.5);
  const mkCheck=(id)=>{const st=stats[si++%4];const lab=nm(th.chk[st]);const tg=chkT[ci++%chkT.length];return {n:nm(th.check),t:pick(['puzzle','trap','room']),m:'',sk:{v:4,label:lab,name:lab,stat:st,target:tg,scene:'field',auto:AUTO[tg]}}};
  const rooms=[];
  T.seq.forEach((k,i)=>{const id=k==='entry'?'entry':k==='boss'?'boss':'m'+i;let r;
   if(k==='entry')r={n:nm(th.entry),t:'entry',m:'던전의 입구.'};
   else if(k==='boss'){const n=nm(th.boss);r={n,t:'boss',m:'던전의 주인이 기다린다.',w:wild(n,'boss',T.boss,T)}}
   else if(k==='rest')r={n:'숨 고르는 곳',t:'safe',rk:'mid',m:'보스 앞 중간 휴식.'};
   else if(k[0]==='b'){const n=nm(th.battle);r={n,t:'battle',m:'',w:wild(n,'pre',T.pre[+k.slice(1)]||2,T)}}
   else r=mkCheck(id);
   rooms.push([id,r])});
  const d={n:o.name||pick(th.name),a:th.a,o:o.owner||'',st:'entry',r:{},l:{},mq:[]};
  const main=rooms.map(x=>x[0]);rooms.forEach(([id,r])=>d.r[id]=r);
  /* 배치: 본길 + 다른 길 하나(체크 1 · 숨은 물건 1) + 곁방 보물 하나 — 들어간 만큼 */
  let best=null;
  for(let t=0;t<200;t++){const w=walkGrid(rng,main.length,0.3+rng()*0.5);if(!w)continue;const cells={};main.forEach((id,i)=>cells[id]=w.path[i]);const usedC=new Set(w.used);const links={};main.forEach((id,i)=>{if(i)links[lk(main[i-1],id)]=1});
   let alt=null;const cand=[];for(let i=1;i<main.length-2;i++)for(const L of [1,2]){const j=i+L+1;if(j>=main.length-1)continue;cand.push([i,j])}
   for(const [i,j] of cand.sort(()=>rng()-0.5)){const p=gridPath(rng,cells[main[i]],cells[main[j]],(j-i)+2,usedC);if(p){alt={i,j,p};break}}
   let side=null;{const hosts=main.filter(id=>id!=='entry'&&id!=='boss');for(const h of hosts.sort(()=>rng()-0.5)){const [c,r]=cells[h];for(const [dx,dy] of DIRS){const nc=c+dx,nr=r+dy;if(nc>=0&&nr>=0&&nc<GRID.cols&&nr<GRID.rows&&!usedC.has(ck(nc,nr))&&!(alt&&alt.p.some(q=>q[0]===nc&&q[1]===nr))){side={h,cell:[nc,nr]};break}}if(side)break}}
   const score=(alt?2:0)+(side?1:0);if(!best||score>best.score)best={score,cells,links,alt,side};if(score===3)break}
  if(!best)throw new Error('배치를 만들지 못했어요 — 씨앗을 바꿔 다시');
  const {cells,links}=best;
  if(best.alt){const {i,j,p}=best.alt;const ids=[];p.slice(1,-1).forEach((cell,k)=>{const id='g'+(k+1);ids.push(id);cells[id]=cell;const last=k===p.length-3;d.r[id]=k===0?Object.assign(mkCheck(id),{m:'돌아가는 길.'}):last?{n:'숨은 물건이 있는 길',t:'room',m:'살피면 소지품 · 열매 하나(GM 이 정한다). 체크 없음.'}:{n:'돌아가는 통로',t:'room',m:''}});
   let prev=main[i];for(const id of ids){links[lk(prev,id)]=1;prev=id}links[lk(prev,main[j])]=1}
  if(best.side){const id='s1';cells[id]=best.side.cell;d.r[id]={n:nm(th.side),t:'treasure',m:'곁방 — 보물이나 단서 하나(GM 이 정한다).'};links[lk(best.side.h,id)]=1}
  for(const [id,c] of Object.entries(cells))if(d.r[id])Object.assign(d.r[id],xy(c));d.l=links;
  wpFit(d,T);mqFit(d,T);return {d,seed}}

 /* ── 템플릿 시트 적용 (빠진 것만 채움 — 고른 포켓몬 · 기술 · 써 둔 포텐셜은 남긴다) ── */
 function applyTpl(doc,did){const T=TPL[doc.tier]||TPL.s1;const d=doc.d;const ord=roomOrder(d);let pi=0;const log=[];let mkCh=false;
  for(const id of ord){const r=d.r[id];if(!r)continue;
   if(did&&mkReady()&&(r.t==='battle'||r.t==='boss')&&(r.mk||!r.w)){/* 제작기 트레이너 */let t=TR(r.mk);if(!t){const tid=mkGroup(did,doc,id,r,[]);r.mk=tid;t=TR(tid)}if(!t)continue;mkCh=true;
    if(r.t==='battle'){const n=T.pre[pi]??T.pre[T.pre.length-1];pi++;while(t.pokemon.length<n)t.pokemon.push(newP('pre',t.pokemon.length,T));if(t.pokemon.length>n)log.push(`「${r.n}」 ${t.pokemon.length}체 (템플릿 ${n}체)`);t.pokemon.forEach((p,i)=>fitP(p,'pre',i,T))}
    else{while(t.pokemon.length<T.boss)t.pokemon.push(newP(t.pokemon.length?'esc':'boss',Math.max(0,t.pokemon.length-1),T));if(t.pokemon.length>T.boss)log.push(`「${r.n}」 ${t.pokemon.length}체 (템플릿 ${T.boss}체)`);
     let bi=t.pokemon.findIndex(isBossP);if(bi<0)bi=0;let ei=0;t.pokemon.forEach((p,i)=>{if(i===bi)fitP(p,'boss',0,T);else fitP(p,'esc',ei++,T)})}
    continue}
   if(r.mk){const t=TR(r.mk);if(t){mkCh=true;t.pokemon.forEach((p,i)=>fitP(p,'pre',i,T))}continue}
   if(r.t==='battle'){const n=T.pre[pi]??T.pre[T.pre.length-1];pi++;if(!r.w)r.w={name:'야생 · '+r.n,rank:'C',mons:[]};while(r.w.mons.length<n)r.w.mons.push(slot('pre',r.w.mons.length,T));if(r.w.mons.length>n)log.push(`「${r.n}」 ${r.w.mons.length}체 (템플릿 ${n}체)`);r.w.mons.forEach((m,i)=>fit(m,'pre',i,T))}
   else if(r.t==='boss'){if(!r.w)r.w={name:'야생 보스 · '+r.n,rank:'C',mons:[]};while(r.w.mons.length<T.boss)r.w.mons.push(slot(r.w.mons.length?'esc':'boss',Math.max(0,r.w.mons.length-1),T));if(r.w.mons.length>T.boss)log.push(`「${r.n}」 ${r.w.mons.length}체 (템플릿 ${T.boss}체)`);r.w.mons.forEach((m,i)=>fit(m,i===0?'boss':'esc',i-1,T))}
   else if(r.w&&r.t!=='battle'&&r.t!=='boss'){/* 다른 방에 남은 야생 → 사전 몹 */r.w.mons.forEach((m,i)=>fit(m,'pre',i,T))}}
  if(mkCh)ENV().save();
  if(pi<T.pre.length)log.push(`조우 방 ${pi}개 (템플릿 ${T.pre.length}개)`);
  if(T.rest&&!Object.values(d.r).some(r=>r.t==='safe'&&r.rk))log.push('보스 앞 중간 휴식(세이프룸)이 없음');
  wpFit(d,T);mqFit(d,T);return log}

 /* ── 검사 ── */
 function check(doc){const T=TPL[doc.tier]||TPL.s1;const d=doc.d;const ms=[];for(const id of roomOrder(d)){const r=d.r[id];monsOf(r).forEach(m=>ms.push([r,m]))}
  const noBoss=ms.filter(([,m])=>!m.boss),boss=ms.filter(([,m])=>m.boss);
  const sum=a=>Math.round(a.reduce((x,[,m])=>x+pcost(m.pride),0)*100)/100;
  const s0=sum(noBoss),s1=sum(ms);const exN0=ms.reduce((x,[,m])=>x+m.ex,0),exT=ms.reduce((x,[,m])=>x+T.gye[m.role||'pre'],0)+T.wp;
  const mqN=(d.mq||[]).filter(x=>x.name).length;const empty=ms.filter(([,m])=>!m.name).length;
  const nb=Object.values(d.r).filter(r=>r.t==='battle').length;
  return [
   {ok:s0===T.tgt,t:`통솔점 합 (보스 빼고) ${s0} / ${T.tgt}`},
   {ok:s1===T.tgt+3,t:`통솔점 합 (보스 포함) ${s1} / ${T.tgt+3}`},
   {ok:boss.length===1,t:`보스 ${boss.length}체 (1체)`},
   {ok:nb===T.pre.length,t:`조우 방 ${nb}개 (${T.pre.length}개)`},
   {ok:empty===0,t:empty?`포켓몬을 안 고른 칸 ${empty}`:'포켓몬 모두 고름'},
   {ok:exN0>=exT,t:`야생 포텐셜 칸 (『계제』 포함) ${exN0} / ${exT}`},
   {ok:mqN===T.mq,t:`미궁 포텐셜 ${mqN} / ${T.mq}`}]}

 /* ── 저장소 ── */
 const ST={docs:{},sub:false,view:'list',id:'',sel:'',linkFrom:'',dirty:new Map(),saveT:null,newO:null};
 function me(){const M=(ENV().me&&ENV().me())||{};let k=M.hash||'';if(!k){try{k=localStorage.getItem('mkdg_dev')||'';if(!k){k='dev_'+Math.random().toString(36).slice(2,12);localStorage.setItem('mkdg_dev',k)}}catch(e){k='dev_tmp'}}
  let n=M.name||'';if(!n){try{n=localStorage.getItem('mkdg_name')||''}catch(e){}}return {key:k,name:n,gm:!!M.gm}}
 const db=()=>ENV().db&&ENV().db();
 function subscribe(){if(ST.sub)return;const D=db();if(!D){if(!ST.local){ST.local=true;try{Object.assign(ST.docs,JSON.parse(localStorage.getItem('mkdg_local')||'{}'))}catch(e){}}return}
  ST.sub=true;D.collection('dungeon').onSnapshot(snap=>{const next={};for(const x of snap.docs){const dd=x.data();try{ST.wsnap=ST.wsnap||{};ST.wsnap[x.id]=snapKey(dd);for(const r of Object.values((dd.d||{}).r||{}))if(r&&r.mk&&r.w)delete r.w}catch(e){}next[x.id]=dd}
   for(const [id,t] of ST.dirty)if(Date.now()-t<4000&&ST.docs[id])next[id]=ST.docs[id];   /* 막 고친 것은 내 사본 그대로 */
   ST.docs=next;if(document.getElementById('v-dg')&&!document.getElementById('v-dg').hidden&&!document.activeElement?.closest?.('#v-dg'))render()},e=>{console.warn('[던전]',e);ST.sub=false})}
 function canEd(x){const M=me();return !!x&&(M.gm||x.owner===M.key)}
 function touch(id){const x=ST.docs[id];if(!x)return;x.at=Date.now();ST.dirty.set(id,Date.now());clearTimeout(ST.saveT);ST.saveT=setTimeout(flush,700)}
 async function flush(){const D=db();const ids=[...ST.dirty.keys()];if(!D){try{localStorage.setItem('mkdg_local',JSON.stringify(ST.docs))}catch(e){}return}
  for(const id of ids){const x=ST.docs[id];try{if(x)await D.doc('dungeon/'+id).set(withSnap(x))}catch(e){toast('던전 저장 실패: '+(e.message||e));return}}}
 async function del(id){const D=db();delete ST.docs[id];ST.dirty.delete(id);if(D){try{await D.doc('dungeon/'+id).delete()}catch(e){toast('지우기 실패: '+(e.message||e))}}else try{localStorage.setItem('mkdg_local',JSON.stringify(ST.docs))}catch(e){}}

 /* ── 화면 ── */
 const root=()=>document.getElementById('v-dg');
 function render(o){const el=root();if(!el)return;subscribe();snapSync();if(!ST.sub&&db()===null&&!ST.poll){ST.poll=setTimeout(()=>{ST.poll=null;if(!el.hidden)render({soft:true})},1500)}if(o&&o.soft&&el.contains(document.activeElement)&&/INPUT|TEXTAREA|SELECT/.test(document.activeElement.tagName))return;el.innerHTML=ST.view==='ed'&&ST.docs[ST.id]?edHTML():listHTML();if(ST.view==='ed')bindMap()}
 function listHTML(){const M=me();const all=Object.entries(ST.docs).filter(([,x])=>x&&x.d);const mine=all.filter(([,x])=>x.owner===M.key),other=all.filter(([,x])=>x.owner!==M.key&&(x.pub||M.gm));
  const card=([id,x])=>{const T=TPL[x.tier]||TPL.s1;const nr=Object.keys(x.d.r||{}).length;const c=check(x);const bad=c.filter(q=>!q.ok).length;
   return `<div class="dgc"><div class="dgc-h"><b>${esc(x.d.n||'이름 없는 던전')}</b><span class="dgt ${esc(x.tier)}">${esc(T.n)}</span>${x.pub?'<span class="dgpub">공개</span>':''}</div>
    <div class="small muted">${esc(x.d.a||'')} · 방 ${nr} · ${esc(x.ownerName||'이름 없음')} · ${bad?`<span class="dgwarn">템플릿 확인 ${bad}</span>`:'<span class="dgok">템플릿 맞음</span>'}</div>
    <div class="row dgc-a"><button class="btn sm pri" data-dg="open" data-id="${esc(id)}">${canEd(x)?'열기 · 고치기':'보기'}</button><button class="btn sm ghost" data-dg="card" data-id="${esc(id)}" title="지도 · 방 · 야생 시트를 한 장으로 (PNG 저장)">▤ 한 장</button><button class="btn sm ghost" data-dg="dup" data-id="${esc(id)}">복제</button>${canEd(x)?`<span class="sp"></span><button class="btn sm ghost" data-dg="del" data-id="${esc(id)}">지우기</button>`:''}</div></div>`};
  return `<div class="dgwrap"><div class="row dg-top"><h2>던전 생성</h2><span class="small muted">난이도 템플릿(미사그 사건 1 · 2 · 3)으로 지도와 야생 시트 뼈대를 만들고 손으로 고친다. 웹툴 던전 탭 「JSON 가져오기 → 제작기에서 만든 던전」으로 가져간다.</span><span class="sp"></span><button class="btn sm pri" data-dg="new">＋ 새 던전 생성</button></div>
   ${db()?'':'<p class="dgwarn small">공유 DB 에 연결되지 않아 이 브라우저에만 저장돼요. 웹툴로 가져가려면 연결이 필요해요.</p>'}
   ${tplTable()}
   <h3>내 던전 <span class="small muted">${mine.length}</span></h3>${mine.length?`<div class="dggrid">${mine.map(card).join('')}</div>`:'<p class="small muted">아직 없어요. 「＋ 새 던전 생성」을 눌러 보세요.</p>'}
   ${other.length?`<h3>${M.gm?'다른 사람 던전':'공개된 던전'} <span class="small muted">${other.length}</span></h3><div class="dggrid">${other.map(card).join('')}</div>`:''}</div>`}
 function tplTable(){const row=(k,f)=>`<tr><th>${k}</th>${['s1','s2','s3'].map(t=>`<td>${f(TPL[t])}</td>`).join('')}</tr>`;const lv=v=>v>0?'+'+v:v===0?'±0':v;
  return `<details class="dgtpl"><summary>난이도 템플릿 표 (미사그 던전 적 스펙 · 11-11 확정)</summary><div class="dgtbl"><table><thead><tr><th></th>${['s1','s2','s3'].map(t=>`<th>${TPL[t].n}</th>`).join('')}</tr></thead><tbody>
   ${row('구성',T=>esc(T.sub))}${row('Lv (사전 / 졸개 / 보스)',T=>`${lv(T.lv.pre)} / ${lv(T.lv.esc)} / ${lv(T.lv.boss)}`)}${row('프라이드',T=>`사전 C · 졸개 ${T.escP.join(' · ')} · 보스 A`)}${row('통솔점 합 (보스 빼고 · 포함)',T=>`${T.tgt} · ${T.tgt+3}`)}${row('『계제』 (사전 / 졸개 / 보스)',T=>`${T.gye.pre} / ${T.gye.esc} / ${T.gye.boss}`)}${row('미궁 포텐셜',T=>T.mq)}${row('야생 포텐셜 (던전 합)',T=>T.wp)}${row('스킬 체크 목표',T=>T.chk.join(' · '))}
   </tbody></table></div><p class="small muted">Lv 은 일행 기준 가감(분배레벨 칸). 『계제』 · 야생 포텐셜 · 미궁 포텐셜은 칸만 만들고 내용은 직접 쓴다.</p></details>`}

 function newDlg(){const M=me();const O=ENV().openModal;const h=`<div class="mhead"><h2>새 던전 생성</h2></div><div class="mbody dgnew">
   <label>던전 이름 <input id="dgnN" placeholder="비우면 테마에서 골라요"></label>
   <label>난이도 템플릿 <select id="dgnT">${['s1','s2','s3'].map(t=>`<option value="${t}">${TPL[t].n} — ${esc(TPL[t].sub)}</option>`).join('')}</select></label>
   <label>테마 <input id="dgnH" list="dgnHL" maxlength="20" placeholder="고르거나 직접 적어요" autocomplete="off"><datalist id="dgnHL">${Object.keys(TH).map(k=>`<option value="${k}"></option>`).join('')}</datalist></label>
   <label>만든 사람 <input id="dgnO" value="${esc(M.name)}" placeholder="이름"></label>
   <label>씨앗 <input id="dgnS" inputmode="numeric" placeholder="비우면 무작위 — 같은 씨앗이면 같은 지도"></label>
   <label class="row"><input type="checkbox" id="dgnP"> 다른 사람도 볼 수 있게 공개</label>
   </div><div class="mfoot"><span class="sp"></span><button class="btn ghost" data-dg="cancel">취소</button><button class="btn pri" data-dg="mk">만들기</button></div>`;
  if(O)O(h);else toast('창을 열 수 없어요')}
 function make(){const v=id=>(document.getElementById(id)||{}).value||'';const M=me();const name=v('dgnO').trim();if(name){try{localStorage.setItem('mkdg_name',name)}catch(e){}}
  let res;try{res=generate({tier:v('dgnT'),theme:v('dgnH').trim()||'폐가',name:v('dgnN').trim(),seed:v('dgnS'),owner:name})}catch(e){return toast(e.message)}
  const id=uid('dg');ST.docs[id]={d:res.d,tier:v('dgnT')||'s1',theme:v('dgnH').trim().slice(0,20)||'폐가',seed:res.seed,owner:M.key,ownerName:name||M.name||'',pub:!!(document.getElementById('dgnP')||{}).checked,at:Date.now()};
  touch(id);materialize(id);try{ENV().closeModal()}catch(e){}ST.view='ed';ST.id=id;ST.sel='';render();toast('던전을 만들었어요 — 방을 눌러 고치세요 (야생 시트는 제작기 「던전 야생」 폴더)')}

 /* ── 편집 ── */
 function edHTML(){const x=ST.docs[ST.id];if(Object.values(x.d.r||{}).some(r=>r&&r.w&&!r.mk))materialize(ST.id);const d=x.d;const E=canEd(x);const T=TPL[x.tier]||TPL.s1;const dis=E?'':'disabled';
  const c=check(x);
  return `<div class="dgwrap dged"><div class="row dg-top"><button class="btn sm ghost" data-dg="back">← 목록</button>
    <input class="dgname" data-f="n" value="${esc(d.n)}" ${dis} aria-label="던전 이름">
    <select data-f="tier" ${dis} aria-label="난이도 템플릿">${['s1','s2','s3'].map(t=>`<option value="${t}" ${x.tier===t?'selected':''}>${TPL[t].n}</option>`).join('')}</select>
    <span class="small muted">${esc(T.sub)} · ${esc(d.a||'')} · ${esc(x.ownerName||'')}</span><span class="sp"></span>
    ${E?`<label class="small row"><input type="checkbox" data-f="pub" ${x.pub?'checked':''}> 공개</label><button class="btn sm pri" data-dg="tpl" title="템플릿대로 레벨 · 프라이드 · 『계제』 칸 · 야생/미궁 포텐셜 칸 · 머릿수를 맞춘다 (고른 포켓몬 · 기술 · 써 둔 포텐셜은 남긴다)">템플릿 시트 적용</button><button class="btn sm ghost" data-dg="regen">지도 다시 생성</button>`:''}
    <button class="btn sm ghost" data-dg="card" title="지도 · 방 · 야생 시트를 한 장으로 (PNG 저장)">▤ 한 장</button><button class="btn sm ghost" data-dg="json">JSON 복사</button></div>
   <div class="dgchk">${c.map(q=>`<span class="${q.ok?'dgok':'dgwarn'}">${q.ok?'✓':'!'} ${esc(q.t)}</span>`).join('')}${d.fe&&d.fe.name?`<span class="dgfei">⛰ ${esc(feText(d.fe))}</span>`:''}</div>
   <div class="dged-b"><div class="dgmap-w">${mapSVG(d)}${E?`<div class="row small muted dgmap-a"><button class="btn sm ghost" data-dg="addroom" ${ST.sel?'':'disabled'}>＋ 고른 방 옆에 방</button><button class="btn sm ${ST.linkFrom?'pri':'ghost'}" data-dg="link" ${ST.sel?'':'disabled'}>${ST.linkFrom?'이을 방을 누르세요 (취소)':'통로 잇기 · 끊기'}</button><span>방을 누르면 고친다 · 끌어서 옮긴다</span></div>`:''}</div>
    <div class="dgpanel">${ST.sel&&d.r[ST.sel]?roomHTML(x,ST.sel,E):mqHTML(x,E)}</div></div></div>`}
 function mapSVG(d){const R=d.r||{};const lines=Object.keys(d.l||{}).map(k=>{const [a,b]=k.split('~');const A=R[a],B=R[b];if(!A||!B)return '';return `<line x1="${A.x}" y1="${A.y}" x2="${B.x}" y2="${B.y}"/>`}).join('');
  const nodes=Object.entries(R).map(([id,r])=>{const t=TY[r.t]||TY.room;const n=monsOf(r).length;return `<g class="dgn ${ST.sel===id?'on':''} ${ST.linkFrom===id?'lf':''}" data-room="${esc(id)}" transform="translate(${r.x},${r.y})"><circle r="${r.t==='boss'?30:24}" fill="${t[2]}"/><text class="ic" y="6">${t[1]}</text><text class="nm" y="${r.t==='boss'?48:42}">${esc(String(r.n||'').slice(0,10))}</text>${n?`<text class="cnt" x="20" y="-16">${n}</text>`:''}${id===d.st?'<text class="st" x="-26" y="-20">시작</text>':''}</g>`}).join('');
  const P=Object.values(R);let vb='0 0 1000 640';if(P.length&&!ST.drag){const xs=P.map(r=>r.x),ys=P.map(r=>r.y);let x0=Math.max(0,Math.min(...xs)-80),x1=Math.min(1000,Math.max(...xs)+80),y0=Math.max(0,Math.min(...ys)-60),y1=Math.min(640,Math.max(...ys)+70);if(x1-x0<420){const c=(x0+x1)/2;x0=c-210;x1=c+210}if(y1-y0<260){const c=(y0+y1)/2;y0=c-130;y1=c+130}vb=`${Math.round(x0)} ${Math.round(y0)} ${Math.round(x1-x0)} ${Math.round(y1-y0)}`}
  return `<svg class="dgmap" viewBox="${vb}" role="img" aria-label="던전 지도"><g class="ln">${lines}</g>${nodes}</svg>`}
 function roomHTML(x,id,E){const r=x.d.r[id];const dis=E?'':'disabled';const T=TPL[x.tier]||TPL.s1;
  const sk=r.sk;return `<div class="dgrp"><div class="row"><b>방</b><span class="sp"></span>${E&&id!==x.d.st?`<button class="btn sm ghost" data-dg="start">시작 방으로</button><button class="btn sm ghost" data-dg="delroom">이 방 지우기</button>`:''}<button class="btn sm ghost" data-dg="unsel">닫기</button></div>
   <label>이름 <input data-r="n" value="${esc(r.n)}" ${dis}></label>
   <label>종류 <select data-r="t" ${dis}>${Object.entries(TY).map(([k,v])=>`<option value="${k}" ${r.t===k?'selected':''}>${v[1]} ${v[0]}</option>`).join('')}</select></label>
   ${r.t==='safe'?`<label>휴식 <select data-r="rk" ${dis}>${RK.map(([k,v])=>`<option value="${k}" ${(r.rk||'')===k?'selected':''}>${v}</option>`).join('')}</select></label>`:''}
   <label>GM 메모 <textarea data-r="m" rows="2" ${dis}>${esc(r.m||'')}</textarea></label>
   ${['room','trap','puzzle'].includes(r.t)?`<div class="dgsk"><label class="row"><input type="checkbox" data-r="hassk" ${sk?'checked':''} ${dis}> 스킬 체크</label>${sk?`<label>내용 <input data-k="label" value="${esc(sk.label||'')}" ${dis}></label><div class="row"><label>자질 <select data-k="stat" ${dis}>${STATS.map(s=>`<option ${sk.stat===s?'selected':''}>${s}</option>`).join('')}</select></label><label>목표 <select data-k="target" ${dis}>${[8,10,12,15].map(v=>`<option value="${v}" ${+sk.target===v?'selected':''}>${v} (${({8:'쉬움',10:'보통',12:'어려움',15:'매우 어려움'})[v]})</option>`).join('')}</select></label></div>`:''}</div>`:''}
   ${r.mk?mkWildHTML(r,E,T):r.w?wildHTML(r,E,T):(['battle','boss'].includes(r.t)?`<p class="small muted">야생 시트가 없어요. 「템플릿 시트 적용」을 누르면 템플릿 머릿수만큼 생겨요.</p>`:'')}</div>`}
 /* 제작기 트레이너 야생 시트 — 요약 카드 + 「제작기 시트로 고치기」(노트와 같은 한 장 창) */
 function mkWildHTML(r,E,T){const t=TR(r.mk);const RL={pre:'사전 몹',esc:'졸개',boss:'보스'};
  if(!t)return `<div class="dgw"><b>야생 시트</b><p class="small dgwarn">제작기 트레이너(${esc(r.mk)})를 찾지 못했어요 — 지워졌거나 아직 불러오는 중이에요.${E?' 「템플릿 시트 적용」을 누르면 새로 만들어요.':''}</p></div>`;
  const L=monsOf(r);const lvOf=p=>{try{return ENV().lvOf(t,p)}catch(e){return null}};
  return `<div class="dgw"><div class="row"><b>야생 시트</b><span class="small muted">${L.length}체 · 통솔점 ${Math.round(L.reduce((a,m)=>a+pcost(m.pride),0)*100)/100}</span><span class="sp"></span>${E&&L.length<6?'<button class="btn sm ghost" data-dg="addmon">＋ 1체</button>':''}</div>
   <p class="small muted" style="margin:0">제작기 트레이너 「${esc(t.name)}」 — 캐릭터 제작 탭 「던전 야생 / ${esc((ST.docs[ST.id]||{}).d?.n||'')}」 폴더에도 있어요. 포켓몬은 제작기 시트 그대로 고쳐요.</p>
   ${L.map((m,i)=>{const p=m.p;const ty=[p.t1,p.t2].filter(v=>v&&v!=='-').join(' · ');const lv=lvOf(p);const mv=(p.moves||[]).map(x=>x&&x.name).filter(Boolean);const ex=[p.excl,...(p.exclX||[])].filter(e=>e&&e.name).map(e=>'『'+e.name+'』');const need=T.gye[m.role]||0;
    return `<div class="dgm dgmk" data-mi="${i}"><div class="row"><span class="dgrole ${m.role}">${RL[m.role]||''}</span><b class="dgmn">${m.name?esc(m.name):'<span class="dgwarn">포켓몬 안 고름</span>'}</b>${ty?`<span class="small muted">${esc(ty)}</span>`:''}<span class="sp"></span>
      <button class="btn sm ${E?'pri':'ghost'}" data-dg="ped" data-pid="${esc(p.id)}">${E?'✎ 제작기 시트로 고치기':'시트 보기'}</button>${E?`<button class="btn sm ghost" data-dg="delmon" title="이 포켓몬 빼기">✕</button>`:''}</div>
     <div class="small dgmk-l">프라이드 <b>${esc(m.pride||'-')}</b> · 분배 ${(+p.dist||0)>0?'+':''}${+p.dist||0}${lv!=null?` (Lv ${lv})`:''}${p.ability?' · 특성 '+esc(p.ability):''} · 기술 ${mv.length}${mv.length?' — '+esc(mv.slice(0,4).join(', '))+(mv.length>4?' …':''):''}</div>
     <div class="small dgmk-l">포텐셜 ${esc(potNames(p).join(' · ')||'-')}</div>
     <div class="small dgmk-l ${m.ex>=need?'':'dgwarn'}">야생 포텐셜 ${ex.length?esc(ex.join(' ')):'없음'}${need?` · 『계제』 ${need}칸 권장`:''}</div></div>`}).join('')}</div>`}
 /* 11-16 PL 제보 「야생 시트에 종족치 · 타입 칸이 없다」: 이름이 제작기 DB 에 있으면 자동으로 채우고, 새로 만든 몬스터는 손으로 — 타입 2칸 · 종족치 6칸 */
 const TYK=['-','노말','불꽃','물','전기','풀','얼음','격투','독','땅','비행','에스퍼','벌레','바위','고스트','드래곤','악','강철','페어리'],BSN=['HP','공격','방어','특공','특방','스피드'];
 function wildHTML(r,E,T){const dis=E?'':'disabled';const RL={pre:'사전 몹',esc:'졸개',boss:'보스'};
  return `<div class="dgw"><div class="row"><b>야생 시트</b><span class="small muted">${r.w.mons.length}체 · 통솔점 ${Math.round(r.w.mons.reduce((a,m)=>a+pcost(m.pride),0)*100)/100}</span><span class="sp"></span>${E&&r.w.mons.length<6?'<button class="btn sm ghost" data-dg="addmon">＋ 1체</button>':''}</div>
   ${r.w.mons.map((m,i)=>{const sp=spOf(m.name);const ab=sp?[sp[5],sp[6],sp[7]].filter(a=>a&&a!=='-'):[];
    return `<div class="dgm" data-mi="${i}"><div class="row"><span class="dgrole ${m.role}">${RL[m.role]||''}</span><input class="dgsp" data-m="name" list="dgSpList" value="${esc(m.name)}" placeholder="포켓몬 이름" ${dis}><span class="sp"></span>${E?`<button class="btn sm ghost" data-dg="delmon" title="이 칸 빼기">✕</button>`:''}</div>
     <div class="row dgm-r"><label>타입 <select data-m="t1" ${dis}>${TYK.map(t=>`<option value="${t}" ${(m.t1||'-')===t?'selected':''}>${t==='-'?'—':t}</option>`).join('')}</select><select data-m="t2" ${dis}>${TYK.map(t=>`<option value="${t}" ${(m.t2||'-')===t?'selected':''}>${t==='-'?'—':t}</option>`).join('')}</select></label></div>
     <div class="dgbs">${BSN.map((n,bi)=>`<label>${n}<input type="number" min="1" max="255" data-m="b${bi}" value="${(m.base||[])[bi]??60}" ${dis}></label>`).join('')}<span class="small muted">합 ${(m.base||[]).slice(0,6).reduce((a,v)=>a+(+v||0),0)}</span></div>
     <div class="row dgm-r"><label>프라이드 <select data-m="pride" ${dis}>${PRIDES.map(p=>`<option ${m.pride===p?'selected':''}>${p}</option>`).join('')}</select></label><label>Lv ± <input type="number" data-m="dist" value="${+m.dist||0}" style="width:60px" ${dis}></label>
      <label>특성 ${ab.length?`<select data-m="ability" ${dis}><option value=""></option>${ab.map(a=>`<option ${m.ability===a?'selected':''}>${esc(a)}</option>`).join('')}</select>`:`<input data-m="ability" value="${esc(m.ability||'')}" ${dis}>`}</label></div>
     <label>기술 <input data-m="moves" value="${esc((m.moves||[]).join(', '))}" placeholder="쉼표로 — 몸통박치기, 전광석화" ${dis}></label>
     <div class="small muted">포텐셜 ${esc((m.pots||[]).join(' · '))}</div>
     ${(m.gye||[]).map((g,gi)=>`<div class="row dgpo"><span class="dgtag">『계제』${gi+1}</span><input data-g="${gi}" data-gf="name" value="${esc(g.name)}" placeholder="이름" ${dis}><input data-g="${gi}" data-gf="eff" value="${esc(g.eff)}" placeholder="효과" ${dis}></div>`).join('')}
     ${m.wp?`<div class="row dgpo"><span class="dgtag wp">야생 포텐셜</span><input data-wp="name" value="${esc(m.wp.name)}" placeholder="이름" ${dis}><input data-wp="eff" value="${esc(m.wp.eff)}" placeholder="효과" ${dis}></div>`:''}</div>`}).join('')}</div>`}
 function mqHTML(x,E){const dis=E?'':'disabled';const d=x.d;
  return `<div class="dgrp"><b>던전 전체</b><p class="small muted">지도의 방을 누르면 그 방을 고쳐요.</p>
   <b class="small">『미궁 포텐셜』 — 조우 때 야생 쪽 고유로 붙는다</b>${(d.mq||[]).map((q,i)=>`<div class="row dgpo"><span class="dgtag mq">미궁 ${i+1}</span><input data-q="${i}" data-qf="name" value="${esc(q.name)}" placeholder="이름" ${dis}><input data-q="${i}" data-qf="eff" value="${esc(q.eff)}" placeholder="효과" ${dis}></div>`).join('')}
   ${feHTML(d,dis)}
   <label>테마 · 분위기 <input data-f="a" value="${esc(d.a||'')}" ${dis}></label></div>`}
 /* 11-16 망령 「필드 효과 칸 따로 — 필드 효과는 필드 효과지」 → 08:51 「트레이너가 전개하는 필드랑 비슷한 것」: d.fe = 필드 전개 칸 하나
    {type 0 필드|1 스타디움|2 이계, name, loc, img, eff(한 줄에 하나), count(지속 턴 · 비우면 무한), color(타입 en), h 0|1|2} — 트레이너 시트 「필드 전개」와 같은 꼴.
    미궁 포텐셜과 따로(템플릿 개수에 안 셈). 웹툴은 이 던전의 조우마다 배틀 시작 때 야생 쪽이 전개한 것처럼 깐다 */
 const FE_K=['필드','스타디움','이계'],FE_TY=[['','—'],['Normal','노말'],['Fire','불꽃'],['Water','물'],['Electric','전기'],['Grass','풀'],['Ice','얼음'],['Fighting','격투'],['Poison','독'],['Ground','땅'],['Flying','비행'],['Psychic','에스퍼'],['Bug','벌레'],['Rock','바위'],['Ghost','고스트'],['Dragon','드래곤'],['Dark','악'],['Steel','강철'],['Fairy','페어리']];
 const feText=fe=>fe&&fe.name?`《${FE_K[+fe.type||0]}/${fe.name}》${fe.count?' · '+fe.count+'턴':' · 무한'}`:'';
 function feHTML(d,dis){const fe=d.fe||{type:0};const opt=(L,v)=>L.map(([k,n])=>`<option value="${esc(k)}" ${String(v??'')===String(k)?'selected':''}>${esc(n)}</option>`).join('');
  return `<div class="dgfe"><b class="small">⛰ 필드 효과 — 트레이너의 필드 전개와 같은 꼴. 이 던전의 배틀마다 처음에 야생 쪽이 전개 (미궁 포텐셜과 따로 · 이름을 비우면 없음)</b>
   <div class="row dgfe-r"><label>종류 <select data-fe="type" ${dis}>${opt(FE_K.map((k,i)=>[i,k]),fe.type||0)}</select></label><label class="grow">이름 <input data-fe="name" value="${esc(fe.name||'')}" placeholder="예: 젖은 지하 수로" ${dis}></label></div>
   <div class="row dgfe-r"><label>지역 <input data-fe="loc" value="${esc(fe.loc||'')}" placeholder="예: 론디니움" style="width:110px" ${dis}></label><label>지속 턴 <input type="number" min="0" max="99" data-fe="count" value="${esc(fe.count||'')}" placeholder="무한" style="width:64px" ${dis}></label><label>타입 색 <select data-fe="color" ${dis}>${opt(FE_TY,fe.color||'')}</select></label></div>
   <div class="row dgfe-r"><label class="grow">H <select data-fe="h" ${dis}>${opt([[0,'없음'],[1,'야생은 이 필드의 효과를 받지 않음'],[2,'야생의 상대가 받는 효과는 무효 (야생만 받음)']],fe.h||0)}</select></label></div>
   <label class="dgfe-e">효과 (한 줄에 하나)<textarea data-fe="eff" rows="3" placeholder="예: 「땅」 타입 기술의 위력 ×0.8&#10;턴 종료 시 「물」 타입이 아닌 포켓몬은 HP 1/16 감소" ${dis}>${esc(fe.eff||'')}</textarea></label>
   <label class="dgfe-e">배경 (그림 주소 · 웹툴 배경 이름 — 비워도 됨)<input data-fe="img" value="${esc(fe.img||'')}" ${dis}></label></div>`}
 function feRead(){const box=root().querySelector('.dgfe');if(!box)return null;const q=k=>box.querySelector(`[data-fe="${k}"]`).value;
  const nm=q('name').trim().replace(/[《》『』]/g,'').replace(/^(이계|필드|스타디움)\//,'').slice(0,30);if(!nm)return null;const o={type:+q('type')||0,name:nm};
  const loc=q('loc').trim().slice(0,40),eff=q('eff').slice(0,1500),img=q('img').trim().slice(0,600),c=Math.round(+q('count')),col=q('color'),h=+q('h');
  if(loc)o.loc=loc;if(eff.trim())o.eff=eff;if(img)o.img=img;if(c>0)o.count=Math.min(c,99);if(col)o.color=col;if(h===1||h===2)o.h=h;return o}
 const SPX={};function spOf(n){if(!n)return null;if(SPX[n]!==undefined)return SPX[n];const L=((ENV().data&&ENV().data())||window.MKM_DB||{}).old||[];return SPX[n]=L.find(r=>r[1]===n)||null}
 function spList(){if(document.getElementById('dgSpList'))return;const L=(window.MKM_DB||{}).old||[];const dl=document.createElement('datalist');dl.id='dgSpList';dl.innerHTML=L.map(r=>`<option value="${esc(r[1])}">`).join('');document.body.appendChild(dl)}

 /* 제작기 한 장 창 (세션 노트 「제작기로 고치기」 NT_MONED 와 같은 길: ?focus=<트레이너>&p=<포켓몬>&embed=1 · 닫을 때 {mkm:'flush'} → {mkm:'flushed'}) */
 let PEDOPEN=false;
 async function openPoke(tid,pid){if(PEDOPEN||document.getElementById('dgEmbF'))return;PEDOPEN=true;try{await openPoke0(tid,pid)}finally{PEDOPEN=false}}   /* 두 번 눌러 창이 겹치면 아래 창이 「저장하는 중…」으로 남던 것 */
 async function openPoke0(tid,pid){const E=ENV();if(E.flushNow){toast('제작기에 올리는 중…');const ok=await E.flushNow();if(!ok)toast('아직 다 올라가지 않았어요 — 창이 비어 보이면 잠시 뒤 다시 열어 주세요')}
  const src=location.pathname+'?'+new URLSearchParams({focus:tid,p:pid,embed:'1',t:Date.now().toString(36)}).toString();
  E.openModal(`<div class="mhead"><h2>야생 시트 — 제작기 화면</h2><span class="sp"></span><a class="btn sm ghost" href="${esc(src.replace(/&embed=1/,''))}" target="_blank" rel="noopener">새 창 ↗</a><button class="btn sm pri" data-dg="pedx">저장하고 닫기</button></div><div class="dgemb"><iframe id="dgEmbF" title="제작기" src="${esc(src)}"></iframe></div>`,{wide:true})}
 let PEDBUSY=false;
 /* 11-16 09:21 PL 제보 「저장하는 중… 이 안 사라진다」: 창 위에 다른 창(제작기 알림 등)이 뜨면 closeModal 이 그쪽을 닫아 이 창이 남았다 → 이 창의 layer 를 콕 집어 닫는다(closeLayer).
    그리고 「저장하고 닫기」를 누르면 창은 바로 숨기고(안의 제작기는 살아 있어 저장을 마저 한다) 저장 확인이 오면(또는 12초) 치운다 */
 async function closePoke(){if(PEDBUSY)return;const f=document.getElementById('dgEmbF');const E=ENV();if(!f){try{E.closeModal()}catch(e){}return}const lay=f.closest('.layer');PEDBUSY=true;
  if(lay)lay.style.visibility='hidden';toast('제작기에 저장하는 중…');
  const ok=await new Promise(res=>{let done=false;const on=e=>{const d=e.data;if(!d||d.mkm!=='flushed'||e.source!==f.contentWindow)return;done=true;window.removeEventListener('message',on);res(d.ok!==false)};window.addEventListener('message',on);
   try{f.contentWindow.postMessage({mkm:'flush'},'*')}catch(e){}setTimeout(()=>{if(!done){window.removeEventListener('message',on);res(false)}},12000)});
  try{if(E.closeLayer&&lay)E.closeLayer(lay);else if(lay)lay.remove();else E.closeModal()}catch(e){try{lay&&lay.remove()}catch(_){}}PEDBUSY=false;
  toast(ok?'제작기에 저장했어요':'제작기 저장을 다 확인하지 못했어요 — 잠시 뒤 다시 열어 확인해 주세요');setTimeout(()=>render({soft:true}),900);setTimeout(()=>render({soft:true}),3000)}
 /* 지도: 누르기 · 끌기 */
 function bindMap(){spList();const svg=root().querySelector('.dgmap');if(!svg)return;const x=ST.docs[ST.id];const E=canEd(x);let drag=null;
  const pt=e=>{const p=svg.createSVGPoint();p.x=e.clientX;p.y=e.clientY;return p.matrixTransform(svg.getScreenCTM().inverse())};
  svg.addEventListener('pointerdown',e=>{const g=e.target.closest('[data-room]');if(!g)return;const id=g.dataset.room;
   if(ST.linkFrom&&E){if(id!==ST.linkFrom){const k=lk(ST.linkFrom,id);if(x.d.l[k])delete x.d.l[k];else x.d.l[k]=1;touch(ST.id)}ST.linkFrom='';render();return}
   drag={id,moved:false,p:pt(e)};if(E)svg.setPointerCapture(e.pointerId)});
  svg.addEventListener('pointermove',e=>{if(!drag||!E)return;const p=pt(e);if(!drag.moved&&Math.hypot(p.x-drag.p.x,p.y-drag.p.y)<6)return;drag.moved=true;const r=x.d.r[drag.id];r.x=clamp(Math.round(p.x),30,970);r.y=clamp(Math.round(p.y),30,600);
   const g=svg.querySelector(`[data-room="${CSS.escape(drag.id)}"]`);if(g)g.setAttribute('transform',`translate(${r.x},${r.y})`);svg.querySelectorAll('.ln line').forEach(l=>l.remove());svg.querySelector('.ln').innerHTML=Object.keys(x.d.l).map(k=>{const [a,b]=k.split('~');const A=x.d.r[a],B=x.d.r[b];return A&&B?`<line x1="${A.x}" y1="${A.y}" x2="${B.x}" y2="${B.y}"/>`:''}).join('')});
  svg.addEventListener('pointerup',()=>{if(!drag)return;const {id,moved}=drag;drag=null;if(moved){touch(ST.id);return}ST.sel=id;render()})}

 /* 입력 */
 function onInput(e){const t=e.target;if(!t.closest||!t.closest('#v-dg'))return;const x=ST.docs[ST.id];if(!x||!canEd(x))return;const d=x.d;const r=ST.sel&&d.r[ST.sel];let re=false;
  if(t.dataset.f){const f=t.dataset.f;if(f==='n'||f==='a')d[f]=t.value;if(f==='n'&&e.type==='change'){const S=mS();const fo=S&&S.folders.find(q=>q&&q.dgId===ST.id);if(fo){fo.name=d.n||'던전';ENV().save()}}else if(f==='pub')x.pub=t.checked;else if(f==='tier'){x.tier=t.value;re=true}}
  else if(t.dataset.r&&r){const f=t.dataset.r;if(f==='hassk'){if(t.checked)r.sk={v:4,label:'',name:'',stat:'지시',target:10,scene:'field',auto:'normal'};else delete r.sk;re=true}
   else if(f==='t'){r.t=t.value;if(r.t!=='safe')delete r.rk;re=true}else if(f==='rk'){if(t.value)r.rk=t.value;else delete r.rk}else r[f]=t.value;if(f==='n'){re=e.type==='change';if(re&&r.mk){const g=TR(r.mk);if(g){g.name=(r.t==='boss'?'야생 보스 · ':'야생 · ')+(r.n||'방');ENV().save()}}}}
  else if(t.dataset.k&&r&&r.sk){const f=t.dataset.k;if(f==='target'){r.sk.target=+t.value;r.sk.auto=AUTO[+t.value]}else{r.sk[f]=t.value;if(f==='label')r.sk.name=t.value}}
  else if(t.dataset.fe){const fe=feRead();if(fe)d.fe=fe;else delete d.fe;re=t.tagName==="SELECT"}
  else if(t.dataset.q!=null){const q=d.mq[+t.dataset.q];if(q)q[t.dataset.qf]=t.value}
  else{const box=t.closest('[data-mi]');if(box&&r&&r.w){const m=r.w.mons[+box.dataset.mi];if(!m)return;
   if(t.dataset.m){const f=t.dataset.m;if(f==='moves')m.moves=t.value.split(/[,，]/).map(s=>s.trim()).filter(Boolean).slice(0,8);else if(f==='dist')m.dist=clamp(Math.round(+t.value||0),-30,60);else if(f==='pride'){m.pride=t.value;re=true}
    else if(f==='t1'||f==='t2'){m[f]=TYK.includes(t.value)?t.value:'-';if(m.t1==='-'&&m.t2!=='-'){m.t1=m.t2;m.t2='-'}if(m.t1===m.t2)m.t2='-';re=true}
    else if(/^b[0-5]$/.test(f)){if(!Array.isArray(m.base))m.base=[60,60,60,60,60,60];m.base[+f[1]]=clamp(Math.round(+t.value||1),1,255);re=e.type==='change'}
    else if(f==='name'){m.name=t.value.trim();const sp=spOf(m.name);if(sp&&e.type==='change'){m.t1=sp[3]||'-';m.t2=sp[4]&&sp[4]!==''?sp[4]:'-';m.base=sp.slice(11,17).map(v=>+v||60);if(!m.ability)m.ability=sp[5]&&sp[5]!=='-'?sp[5]:'';re=true}}
    else m[f]=t.value}
   else if(t.dataset.g!=null){const g=m.gye[+t.dataset.g];if(g)g[t.dataset.gf]=t.value}else if(t.dataset.wp&&m.wp)m.wp[t.dataset.wp]=t.value}}
  touch(ST.id);if(re&&e.type==='change')render()}
 /* 11-17 망령 「던전도 한 장 요약」: 지도 · 던전 전체(테마 · 『미궁 포텐셜』 · 필드 효과) · 방마다(종류 · 휴식 · 스킬 체크 · 야생 시트) 를 한 장으로, PNG 저장 (제작기 cardPng).
    GM 메모는 고칠 수 있는 사람만, 「GM 메모」 체크로 넣고 뺀다 (PL 에게 그림을 줄 때 빼기) */
 function cardMap(d){const a=ST.sel,b=ST.linkFrom,c=ST.drag;ST.sel='';ST.linkFrom='';ST.drag=null;try{return mapSVG(d).replace('class="dgmap"','class="dgmap dgmap-s"')}finally{ST.sel=a;ST.linkFrom=b;ST.drag=c}}
 function cardHTML(x,gm){const d=x.d;const T=TPL[x.tier]||TPL.s1;const ord=roomOrder(d);const RL={pre:'사전 몹',esc:'졸개',boss:'보스'};const lvOf=(t,p)=>{try{return ENV().lvOf(t,p)}catch(e){return null}};
  const allM=ord.flatMap(id=>monsOf(d.r[id]));const fe=d.fe&&d.fe.name?d.fe:null;
  const mon=(r,m)=>{const p=m.p;const t=r.mk?TR(r.mk):null;if(!p)return `<div class="dgcd-m"><span class="dgrole ${m.role}">${RL[m.role]||''}</span><b>${esc(m.name||'(안 고름)')}</b> <span class="small muted">프라이드 ${esc(m.pride||'-')}</span></div>`;
   const ty=[p.t1,p.t2].filter(v=>v&&v!=='-');const lv=t?lvOf(t,p):null;const mv=(p.moves||[]).map(z=>z&&!z.hide&&z.name).filter(Boolean);const ex=[p.excl,...(p.exclX||[])].filter(e=>e&&e.name);
   return `<div class="dgcd-m"><div class="row"><span class="dgrole ${m.role}">${RL[m.role]||''}</span><b>${esc(m.name||'(안 고름)')}</b>${ty.length?`<span class="small muted">${esc(ty.join(' · '))}</span>`:''}<span class="sp"></span><span class="small">프라이드 <b>${esc(m.pride||'-')}</b>${lv!=null?` · Lv ${lv}`:''}</span></div>
    <div class="small dgcd-l">${p.ability?'특성 '+esc(p.ability):''}${p.item?' · 도구 '+esc(p.item):''}${mv.length?' · '+esc(mv.join(', ')):''}</div>
    ${ex.map(e=>`<div class="small dgcd-l"><b>『${esc(e.name)}』</b> ${esc(String(e.eff||'').replace(/<br\s*\/?>/gi,' '))}</div>`).join('')}</div>`};
  const room=(id,i)=>{const r=d.r[id];const ty=TY[r.t]||TY.room;const sk=r.sk;const L=monsOf(r);const rk=r.t==='safe'&&r.rk?(RK.find(z=>z[0]===r.rk)||[])[1]:'';
   return `<div class="dgcd-r" style="--rc:${ty[2]}"><div class="row dgcd-rh"><span class="dgcd-no">${i+1}</span><span class="dgcd-ic">${ty[1]}</span><b>${esc(r.n||'(이름 없음)')}</b><span class="small muted">${esc(ty[0])}${id===d.st?' · 시작':''}${rk?' · '+esc(rk):''}</span></div>
    ${sk?`<div class="small dgcd-l">스킬 체크 — 「${esc(sk.stat||'')}」 목표 ${esc(sk.target||'')}${sk.label?` · ${esc(sk.label)}`:''}</div>`:''}
    ${gm&&r.m?`<div class="small dgcd-l dgcd-gm">GM 메모 · ${esc(r.m)}</div>`:''}
    ${L.length?`<div class="dgcd-ms">${L.map(m=>mon(r,m)).join('')}</div>`:''}</div>`};
  return `<div class="dgcd"><div class="dgcd-hd"><div><div class="dgcd-nm">${esc(d.n||'던전')}</div><div class="small muted">${esc(T.n)} · ${esc(T.sub||'')}${x.ownerName?' · '+esc(x.ownerName):''}</div></div><span class="sp"></span>
    <div class="dgcd-st"><span><b>${ord.length}</b> 방</span><span><b>${ord.filter(id=>['battle','boss'].includes(d.r[id].t)).length}</b> 조우</span><span><b>${allM.length}</b> 야생</span><span>통솔점 <b>${Math.round(allM.reduce((a,m)=>a+pcost(m.pride),0)*100)/100}</b></span></div></div>
   <div class="dgcd-top"><div class="dgcd-map">${cardMap(d)}</div><div class="dgcd-all">
    ${d.a?`<div class="dgcd-h">테마 · 분위기</div><div class="small">${esc(d.a)}</div>`:''}
    ${(d.mq||[]).some(q=>q&&q.name)?`<div class="dgcd-h">『미궁 포텐셜』</div>${d.mq.filter(q=>q&&q.name).map(q=>`<div class="small dgcd-l"><b>『${esc(q.name)}』</b> ${esc(q.eff||'')}</div>`).join('')}`:''}
    ${fe?`<div class="dgcd-h">필드 효과</div><div class="small dgcd-l"><b>${esc(feText(fe))}</b>${fe.loc?` · ${esc(fe.loc)}`:''}</div>${String(fe.eff||'').split('\n').filter(z=>z.trim()).map(z=>`<div class="small dgcd-l">${esc(z)}</div>`).join('')}`:''}
   </div></div>
   <div class="dgcd-h">방 <span class="faint">${ord.length}</span></div><div class="dgcd-rs">${ord.map(room).join('')}</div></div>`}
 function openCard(id){const x=ST.docs[id];if(!x)return;if(Object.values(x.d.r||{}).some(r=>r&&r.w&&!r.mk)&&canEd(x))materialize(id);const E=ENV();const can=canEd(x);let gm=can;
  const l=E.openModal(`<div class="mhead"><h2>한 장 요약 <span class="small muted">던전</span></h2><span class="sp"></span>${can?'<label class="small row" title="방마다 적은 GM 메모를 요약에 넣는다 — PL 에게 줄 그림이면 끄기"><input type="checkbox" data-dgcgm checked> GM 메모</label>':''}<button class="btn sm" data-dgcdc title="이 요약을 그림으로 만들어 디스코드의 정해 둔 스레드에 올린다 (웹툴 설정 「디스코드」 탭에서 이어 둔 곳) — GM 메모 체크를 먼저 확인">디코로</button><button class="btn sm" data-dgcpng title="이 요약을 그림 파일로 저장">PNG 저장</button><button class="btn ghost" data-x>닫기</button></div><div class="mbody pcd-wrap dgcd-wrap">${cardHTML(x,gm)}</div>`,{wide:true});
  const box=l.querySelector('.mbox');if(box)box.classList.add('pcdbox');l.querySelectorAll('[data-x]').forEach(b=>b.onclick=()=>E.closeModal());
  const wrap=l.querySelector('.dgcd-wrap');const cb=l.querySelector('[data-dgcgm]');if(cb)cb.onchange=()=>{gm=cb.checked;wrap.innerHTML=cardHTML(ST.docs[id]||x,gm)};
  l.querySelector('[data-dgcdc]').onclick=()=>{const el=wrap.querySelector('.dgcd');const X=ST.docs[id]||x;const T=TPL[X.tier]||TPL.s1;if(E.cardDc)E.cardDc(l.querySelector('[data-dgcdc]'),el,{id:'dg_'+id,title:X.d.n||'던전',sub:'던전 한 장 요약 · '+T.n,who:{n:X.ownerName||X.d.n||''},foot:`${X.d.n||'던전'} · 던전 한 장 요약`});else toast('제작기를 새로고침해 주세요')};
  l.querySelector('[data-dgcpng]').onclick=()=>{const el=wrap.querySelector('.dgcd');if(E.cardPng)E.cardPng(el,(x.d.n||'던전')+'_한장요약',`${x.d.n||'던전'} · 던전 한 장 요약`);else toast('제작기를 새로고침해 주세요')}}
 async function onClick(e){const b=e.target.closest('[data-dg]');if(!b||!b.closest('#v-dg,.mbox'))return;const k=b.dataset.dg;const x=ST.docs[ST.id];
  if(k==='pedx')return closePoke();
  if(k==='new')return newDlg();if(k==='mk')return make();if(k==='cancel'){try{ENV().closeModal()}catch(_){}return}
  if(k==='card')return openCard(b.dataset.id||ST.id);
  if(k==='open'){ST.view='ed';ST.id=b.dataset.id;ST.sel='';ST.linkFrom='';return render()}
  if(k==='back'){await flush();ST.view='list';return render()}
  if(k==='dup'){const s=ST.docs[b.dataset.id];if(!s)return;const M=me();const id=uid('dg');const c=clone(s);c.owner=M.key;c.ownerName=M.name||c.ownerName;c.pub=false;c.d.n=(c.d.n||'던전')+' (복제)';c.at=Date.now();ST.docs[id]=c;
   /* 야생 시트(제작기 트레이너)도 새로 복사 — 원본을 같이 고치지 않게 */if(mkReady()){const E2=ENV();let n=0;for(const [rid,r] of Object.entries(c.d.r||{})){if(!r||!r.mk)continue;const src=TR(r.mk);if(!src){delete r.mk;continue}const ps=src.pokemon.map(p=>Object.assign(clone(p),{id:E2.uid()}));r.mk=mkGroup(id,c,rid,r,ps);n++}if(n)E2.save()}
   touch(id);ST.view='ed';ST.id=id;ST.sel='';toast('내 던전으로 복제했어요');return render()}
  if(k==='del'){const s=ST.docs[b.dataset.id];if(!s||!canEd(s))return;const g=groupsOf(b.dataset.id);if(!confirm(`「${s.d.n||'던전'}」 을 지울까요?${g.length?`\n야생 시트(제작기 트레이너) ${g.length}명도 같이 지워요.`:''} (30일 안에는 되살릴 수 있어요)`))return;dropGroups(b.dataset.id);await del(b.dataset.id);return render()}
  if(!x)return;const E=canEd(x);const d=x.d;
  if(k==='json'){const t=JSON.stringify(d,null,1);try{await navigator.clipboard.writeText(t);toast('웹툴 던전 JSON 을 복사했어요')}catch(_){prompt('복사하세요',t)}return}
  if(k==='ped'){const r0=ST.sel&&d.r[ST.sel];if(r0&&r0.mk)openPoke(r0.mk,b.dataset.pid);return}
  if(!E)return;
  if(k==='tpl'){const log=applyTpl(x,ST.id);touch(ST.id);render();toast(log.length?'템플릿 적용 · 확인: '+log.join(' / '):'템플릿대로 맞췄어요');return}
  if(k==='regen'){if(!confirm('지도와 방을 새로 만들어요. 지금 방 · 야생 시트(제작기 트레이너)는 사라져요. 계속할까요?'))return;try{const res=generate({tier:x.tier,theme:x.theme||'폐가',name:d.n,owner:x.ownerName});dropGroups(ST.id);x.d=res.d;x.seed=res.seed;ST.sel='';touch(ST.id);materialize(ST.id);render()}catch(err){toast(err.message)}return}
  if(k==='unsel'){ST.sel='';ST.linkFrom='';return render()}
  if(k==='link'){ST.linkFrom=ST.linkFrom?'':ST.sel;return render()}
  if(k==='start'&&ST.sel){d.st=ST.sel;touch(ST.id);return render()}
  if(k==='addroom'&&ST.sel){const a=d.r[ST.sel];const id='x'+Math.random().toString(36).slice(2,6);let px=a.x+140,py=a.y;if(px>970){px=a.x-140}d.r[id]={n:'새 방',t:'room',m:'',x:clamp(px,30,970),y:clamp(py,30,600)};d.l[lk(ST.sel,id)]=1;ST.sel=id;touch(ST.id);return render()}
  if(k==='delroom'&&ST.sel&&ST.sel!==d.st){const rr=d.r[ST.sel];if(!confirm(`「${rr.n}」 방을 지울까요?${rr.mk?' 야생 시트(제작기 트레이너)도 같이 지워요.':''}`))return;if(rr.mk)dropGroups(ST.id,[rr.mk]);delete d.r[ST.sel];for(const kk of Object.keys(d.l))if(kk.split('~').includes(ST.sel))delete d.l[kk];ST.sel='';touch(ST.id);return render()}
  const r=ST.sel&&d.r[ST.sel];const T=TPL[x.tier]||TPL.s1;
  if(k==='addmon'&&r&&r.mk){const g=TR(r.mk);if(!g)return;const role=r.t==='boss'?(g.pokemon.some(isBossP)?'esc':'boss'):'pre';const p=newP(role,g.pokemon.filter(q=>!isBossP(q)).length,T);g.pokemon.push(p);ENV().save();render();return openPoke(g.id,p.id)}
  if(k==='delmon'&&r&&r.mk){const g=TR(r.mk);if(!g)return;const i=+b.closest('[data-mi]').dataset.mi;const p=g.pokemon[i];if(!p)return;if(!confirm(`「${p.nick||p.name||'빈 칸'}」 을 이 야생 시트에서 뺄까요?`))return;g.pokemon.splice(i,1);ENV().save();return render()}
  if(k==='addmon'&&r&&r.w){r.w.mons.push(slot(r.t==='boss'?'esc':'pre',r.w.mons.length,T));touch(ST.id);return render()}
  if(k==='delmon'&&r&&r.w){const i=+b.closest('[data-mi]').dataset.mi;r.w.mons.splice(i,1);if(!r.w.mons.length)delete r.w;touch(ST.id);return render()}}
 setTimeout(()=>{const el=root();if(el&&!el.hidden)render()},0);
 document.addEventListener('input',onInput);document.addEventListener('change',onInput);document.addEventListener('click',onClick);
 return {render,generate,applyTpl,check,TPL,cardHTML,openCard}})();
