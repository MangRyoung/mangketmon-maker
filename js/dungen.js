/* ---------- 던전 생성 (11-15 망령 「제작기에서 PL 들도 던전 생성을 해볼 수 있게 · 던전은 난이도별로 템플릿 시트 적용」) ----------
   누구나(서명이 없어도) 던전을 만들고 고친다. 공유 DB kind 'dungeon' 한 문서 = 던전 하나:
     {d: 웹툴 던전 가져오기 형식 {n, st, r, l, mq, a, o}, tier: s1|s2|s3, owner, ownerName, pub, at, seed}
   웹툴 던전 탭 「JSON 가져오기」 → 「제작기에서 만든 던전」 목록에서 그대로 가져간다 (방의 w = 야생 시트 설계).
   난이도 템플릿 = 미사그 던전 적 스펙 (노트 65 · 룰북 던전 탐색장 「미사그 대학 던전」, 11-11 확정):
     구성 · 레벨(분배레벨 dist 로) · 프라이드(통솔점 합) · 『계제』 칸 수 · 미궁 포텐셜 수 · 야생 포텐셜 수 · 레이드.
   야생 시트는 「빈 뼈대」만 — 포켓몬 · 기술 · 포텐셜 내용은 만든 사람이 채운다. 『계제』(gye) · 야생 포텐셜(wp)은 웹툴에서 전용 칸으로 들어간다. */
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

 /* 시작 방에서 가까운 순 (보스방은 맨 뒤) */
 function roomOrder(d){const adj={};for(const k of Object.keys(d.l||{})){const [a,b]=k.split('~');(adj[a]=adj[a]||[]).push(b);(adj[b]=adj[b]||[]).push(a)}
  const seen=new Set([d.st]),q=[d.st],out=[];while(q.length){const c=q.shift();if(!d.r[c])continue;out.push(c);for(const n of adj[c]||[])if(!seen.has(n)){seen.add(n);q.push(n)}}
  for(const id of Object.keys(d.r))if(!seen.has(id))out.push(id);return out}

 /* ── 생성 ── */
 function generate(o){const T=TPL[o.tier]||TPL.s1;const th=TH[o.theme]||TH.폐가;const seed=+o.seed||Math.floor(Math.random()*1e6);const rng=rngOf(seed);const pick=a=>a[Math.floor(rng()*a.length)];
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
 function applyTpl(doc){const T=TPL[doc.tier]||TPL.s1;const d=doc.d;const ord=roomOrder(d);let pi=0;const log=[];
  for(const id of ord){const r=d.r[id];if(!r)continue;
   if(r.t==='battle'){const n=T.pre[pi]??T.pre[T.pre.length-1];pi++;if(!r.w)r.w={name:'야생 · '+r.n,rank:'C',mons:[]};while(r.w.mons.length<n)r.w.mons.push(slot('pre',r.w.mons.length,T));if(r.w.mons.length>n)log.push(`「${r.n}」 ${r.w.mons.length}체 (템플릿 ${n}체)`);r.w.mons.forEach((m,i)=>fit(m,'pre',i,T))}
   else if(r.t==='boss'){if(!r.w)r.w={name:'야생 보스 · '+r.n,rank:'C',mons:[]};while(r.w.mons.length<T.boss)r.w.mons.push(slot(r.w.mons.length?'esc':'boss',Math.max(0,r.w.mons.length-1),T));if(r.w.mons.length>T.boss)log.push(`「${r.n}」 ${r.w.mons.length}체 (템플릿 ${T.boss}체)`);r.w.mons.forEach((m,i)=>fit(m,i===0?'boss':'esc',i-1,T))}
   else if(r.w&&r.t!=='battle'&&r.t!=='boss'){/* 다른 방에 남은 야생 → 사전 몹 */r.w.mons.forEach((m,i)=>fit(m,'pre',i,T))}}
  if(pi<T.pre.length)log.push(`조우 방 ${pi}개 (템플릿 ${T.pre.length}개)`);
  if(T.rest&&!Object.values(d.r).some(r=>r.t==='safe'&&r.rk))log.push('보스 앞 중간 휴식(세이프룸)이 없음');
  wpFit(d,T);mqFit(d,T);return log}

 /* ── 검사 ── */
 function check(doc){const T=TPL[doc.tier]||TPL.s1;const d=doc.d;const ms=[];for(const id of roomOrder(d)){const r=d.r[id];if(r&&r.w)r.w.mons.forEach(m=>ms.push([r,m]))}
  const noBoss=ms.filter(([,m])=>!m.boss),boss=ms.filter(([,m])=>m.boss);
  const sum=a=>Math.round(a.reduce((x,[,m])=>x+pcost(m.pride),0)*100)/100;
  const s0=sum(noBoss),s1=sum(ms);const gyeN=ms.reduce((x,[,m])=>x+(m.gye||[]).filter(g=>g.name).length,0),gyeT=ms.reduce((x,[,m])=>x+T.gye[m.role||'pre'],0);
  const wpN=ms.filter(([,m])=>m.wp&&m.wp.name).length;const mqN=(d.mq||[]).filter(x=>x.name).length;const empty=ms.filter(([,m])=>!m.name).length;
  const nb=Object.values(d.r).filter(r=>r.t==='battle').length;
  return [
   {ok:s0===T.tgt,t:`통솔점 합 (보스 빼고) ${s0} / ${T.tgt}`},
   {ok:s1===T.tgt+3,t:`통솔점 합 (보스 포함) ${s1} / ${T.tgt+3}`},
   {ok:boss.length===1,t:`보스 ${boss.length}체 (1체)`},
   {ok:nb===T.pre.length,t:`조우 방 ${nb}개 (${T.pre.length}개)`},
   {ok:empty===0,t:empty?`포켓몬을 안 고른 칸 ${empty}`:'포켓몬 모두 고름'},
   {ok:gyeN>=gyeT,t:`『계제』 ${gyeN} / ${gyeT}`},
   {ok:wpN===T.wp,t:`야생 포텐셜 ${wpN} / ${T.wp}`},
   {ok:mqN===T.mq,t:`미궁 포텐셜 ${mqN} / ${T.mq}`}]}

 /* ── 저장소 ── */
 const ST={docs:{},sub:false,view:'list',id:'',sel:'',linkFrom:'',dirty:new Map(),saveT:null,newO:null};
 function me(){const M=(ENV().me&&ENV().me())||{};let k=M.hash||'';if(!k){try{k=localStorage.getItem('mkdg_dev')||'';if(!k){k='dev_'+Math.random().toString(36).slice(2,12);localStorage.setItem('mkdg_dev',k)}}catch(e){k='dev_tmp'}}
  let n=M.name||'';if(!n){try{n=localStorage.getItem('mkdg_name')||''}catch(e){}}return {key:k,name:n,gm:!!M.gm}}
 const db=()=>ENV().db&&ENV().db();
 function subscribe(){if(ST.sub)return;const D=db();if(!D){if(!ST.local){ST.local=true;try{Object.assign(ST.docs,JSON.parse(localStorage.getItem('mkdg_local')||'{}'))}catch(e){}}return}
  ST.sub=true;D.collection('dungeon').onSnapshot(snap=>{const next={};for(const x of snap.docs){next[x.id]=x.data()}
   for(const [id,t] of ST.dirty)if(Date.now()-t<4000&&ST.docs[id])next[id]=ST.docs[id];   /* 막 고친 것은 내 사본 그대로 */
   ST.docs=next;if(document.getElementById('v-dg')&&!document.getElementById('v-dg').hidden&&!document.activeElement?.closest?.('#v-dg'))render()},e=>{console.warn('[던전]',e);ST.sub=false})}
 function canEd(x){const M=me();return !!x&&(M.gm||x.owner===M.key)}
 function touch(id){const x=ST.docs[id];if(!x)return;x.at=Date.now();ST.dirty.set(id,Date.now());clearTimeout(ST.saveT);ST.saveT=setTimeout(flush,700)}
 async function flush(){const D=db();const ids=[...ST.dirty.keys()];if(!D){try{localStorage.setItem('mkdg_local',JSON.stringify(ST.docs))}catch(e){}return}
  for(const id of ids){const x=ST.docs[id];try{if(x)await D.doc('dungeon/'+id).set(x)}catch(e){toast('던전 저장 실패: '+(e.message||e));return}}}
 async function del(id){const D=db();delete ST.docs[id];ST.dirty.delete(id);if(D){try{await D.doc('dungeon/'+id).delete()}catch(e){toast('지우기 실패: '+(e.message||e))}}else try{localStorage.setItem('mkdg_local',JSON.stringify(ST.docs))}catch(e){}}

 /* ── 화면 ── */
 const root=()=>document.getElementById('v-dg');
 function render(o){const el=root();if(!el)return;subscribe();if(!ST.sub&&db()===null&&!ST.poll){ST.poll=setTimeout(()=>{ST.poll=null;if(!el.hidden)render({soft:true})},1500)}if(o&&o.soft&&el.contains(document.activeElement)&&/INPUT|TEXTAREA|SELECT/.test(document.activeElement.tagName))return;el.innerHTML=ST.view==='ed'&&ST.docs[ST.id]?edHTML():listHTML();if(ST.view==='ed')bindMap()}
 function listHTML(){const M=me();const all=Object.entries(ST.docs).filter(([,x])=>x&&x.d);const mine=all.filter(([,x])=>x.owner===M.key),other=all.filter(([,x])=>x.owner!==M.key&&(x.pub||M.gm));
  const card=([id,x])=>{const T=TPL[x.tier]||TPL.s1;const nr=Object.keys(x.d.r||{}).length;const c=check(x);const bad=c.filter(q=>!q.ok).length;
   return `<div class="dgc"><div class="dgc-h"><b>${esc(x.d.n||'이름 없는 던전')}</b><span class="dgt ${esc(x.tier)}">${esc(T.n)}</span>${x.pub?'<span class="dgpub">공개</span>':''}</div>
    <div class="small muted">${esc(x.d.a||'')} · 방 ${nr} · ${esc(x.ownerName||'이름 없음')} · ${bad?`<span class="dgwarn">템플릿 확인 ${bad}</span>`:'<span class="dgok">템플릿 맞음</span>'}</div>
    <div class="row dgc-a"><button class="btn sm pri" data-dg="open" data-id="${esc(id)}">${canEd(x)?'열기 · 고치기':'보기'}</button><button class="btn sm ghost" data-dg="dup" data-id="${esc(id)}">복제</button>${canEd(x)?`<span class="sp"></span><button class="btn sm ghost" data-dg="del" data-id="${esc(id)}">지우기</button>`:''}</div></div>`};
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
   <label>테마 <select id="dgnH">${Object.keys(TH).map(k=>`<option>${k}</option>`).join('')}</select></label>
   <label>만든 사람 <input id="dgnO" value="${esc(M.name)}" placeholder="이름"></label>
   <label>씨앗 <input id="dgnS" inputmode="numeric" placeholder="비우면 무작위 — 같은 씨앗이면 같은 지도"></label>
   <label class="row"><input type="checkbox" id="dgnP"> 다른 사람도 볼 수 있게 공개</label>
   </div><div class="mfoot"><span class="sp"></span><button class="btn ghost" data-dg="cancel">취소</button><button class="btn pri" data-dg="mk">만들기</button></div>`;
  if(O)O(h);else toast('창을 열 수 없어요')}
 function make(){const v=id=>(document.getElementById(id)||{}).value||'';const M=me();const name=v('dgnO').trim();if(name){try{localStorage.setItem('mkdg_name',name)}catch(e){}}
  let res;try{res=generate({tier:v('dgnT'),theme:v('dgnH'),name:v('dgnN').trim(),seed:v('dgnS'),owner:name})}catch(e){return toast(e.message)}
  const id=uid('dg');ST.docs[id]={d:res.d,tier:v('dgnT')||'s1',theme:v('dgnH'),seed:res.seed,owner:M.key,ownerName:name||M.name||'',pub:!!(document.getElementById('dgnP')||{}).checked,at:Date.now()};
  touch(id);try{ENV().closeModal()}catch(e){}ST.view='ed';ST.id=id;ST.sel='';render();toast('던전을 만들었어요 — 방을 눌러 고치세요')}

 /* ── 편집 ── */
 function edHTML(){const x=ST.docs[ST.id];const d=x.d;const E=canEd(x);const T=TPL[x.tier]||TPL.s1;const dis=E?'':'disabled';
  const c=check(x);
  return `<div class="dgwrap dged"><div class="row dg-top"><button class="btn sm ghost" data-dg="back">← 목록</button>
    <input class="dgname" data-f="n" value="${esc(d.n)}" ${dis} aria-label="던전 이름">
    <select data-f="tier" ${dis} aria-label="난이도 템플릿">${['s1','s2','s3'].map(t=>`<option value="${t}" ${x.tier===t?'selected':''}>${TPL[t].n}</option>`).join('')}</select>
    <span class="small muted">${esc(T.sub)} · ${esc(d.a||'')} · ${esc(x.ownerName||'')}</span><span class="sp"></span>
    ${E?`<label class="small row"><input type="checkbox" data-f="pub" ${x.pub?'checked':''}> 공개</label><button class="btn sm pri" data-dg="tpl" title="템플릿대로 레벨 · 프라이드 · 『계제』 칸 · 야생/미궁 포텐셜 칸 · 머릿수를 맞춘다 (고른 포켓몬 · 기술 · 써 둔 포텐셜은 남긴다)">템플릿 시트 적용</button><button class="btn sm ghost" data-dg="regen">지도 다시 생성</button>`:''}
    <button class="btn sm ghost" data-dg="json">JSON 복사</button></div>
   <div class="dgchk">${c.map(q=>`<span class="${q.ok?'dgok':'dgwarn'}">${q.ok?'✓':'!'} ${esc(q.t)}</span>`).join('')}</div>
   <div class="dged-b"><div class="dgmap-w">${mapSVG(d)}${E?`<div class="row small muted dgmap-a"><button class="btn sm ghost" data-dg="addroom" ${ST.sel?'':'disabled'}>＋ 고른 방 옆에 방</button><button class="btn sm ${ST.linkFrom?'pri':'ghost'}" data-dg="link" ${ST.sel?'':'disabled'}>${ST.linkFrom?'이을 방을 누르세요 (취소)':'통로 잇기 · 끊기'}</button><span>방을 누르면 고친다 · 끌어서 옮긴다</span></div>`:''}</div>
    <div class="dgpanel">${ST.sel&&d.r[ST.sel]?roomHTML(x,ST.sel,E):mqHTML(x,E)}</div></div></div>`}
 function mapSVG(d){const R=d.r||{};const lines=Object.keys(d.l||{}).map(k=>{const [a,b]=k.split('~');const A=R[a],B=R[b];if(!A||!B)return '';return `<line x1="${A.x}" y1="${A.y}" x2="${B.x}" y2="${B.y}"/>`}).join('');
  const nodes=Object.entries(R).map(([id,r])=>{const t=TY[r.t]||TY.room;const n=r.w?r.w.mons.length:0;return `<g class="dgn ${ST.sel===id?'on':''} ${ST.linkFrom===id?'lf':''}" data-room="${esc(id)}" transform="translate(${r.x},${r.y})"><circle r="${r.t==='boss'?30:24}" fill="${t[2]}"/><text class="ic" y="6">${t[1]}</text><text class="nm" y="${r.t==='boss'?48:42}">${esc(String(r.n||'').slice(0,10))}</text>${n?`<text class="cnt" x="20" y="-16">${n}</text>`:''}${id===d.st?'<text class="st" x="-26" y="-20">시작</text>':''}</g>`}).join('');
  const P=Object.values(R);let vb='0 0 1000 640';if(P.length&&!ST.drag){const xs=P.map(r=>r.x),ys=P.map(r=>r.y);let x0=Math.max(0,Math.min(...xs)-80),x1=Math.min(1000,Math.max(...xs)+80),y0=Math.max(0,Math.min(...ys)-60),y1=Math.min(640,Math.max(...ys)+70);if(x1-x0<420){const c=(x0+x1)/2;x0=c-210;x1=c+210}if(y1-y0<260){const c=(y0+y1)/2;y0=c-130;y1=c+130}vb=`${Math.round(x0)} ${Math.round(y0)} ${Math.round(x1-x0)} ${Math.round(y1-y0)}`}
  return `<svg class="dgmap" viewBox="${vb}" role="img" aria-label="던전 지도"><g class="ln">${lines}</g>${nodes}</svg>`}
 function roomHTML(x,id,E){const r=x.d.r[id];const dis=E?'':'disabled';const T=TPL[x.tier]||TPL.s1;
  const sk=r.sk;return `<div class="dgrp"><div class="row"><b>방</b><span class="sp"></span>${E&&id!==x.d.st?`<button class="btn sm ghost" data-dg="start">시작 방으로</button><button class="btn sm ghost" data-dg="delroom">이 방 지우기</button>`:''}<button class="btn sm ghost" data-dg="unsel">닫기</button></div>
   <label>이름 <input data-r="n" value="${esc(r.n)}" ${dis}></label>
   <label>종류 <select data-r="t" ${dis}>${Object.entries(TY).map(([k,v])=>`<option value="${k}" ${r.t===k?'selected':''}>${v[1]} ${v[0]}</option>`).join('')}</select></label>
   ${r.t==='safe'?`<label>휴식 <select data-r="rk" ${dis}>${RK.map(([k,v])=>`<option value="${k}" ${(r.rk||'')===k?'selected':''}>${v}</option>`).join('')}</select></label>`:''}
   <label>GM 메모 <textarea data-r="m" rows="2" ${dis}>${esc(r.m||'')}</textarea></label>
   ${['room','trap','puzzle'].includes(r.t)?`<div class="dgsk"><label class="row"><input type="checkbox" data-r="hassk" ${sk?'checked':''} ${dis}> 스킬 체크</label>${sk?`<label>내용 <input data-k="label" value="${esc(sk.label||'')}" ${dis}></label><div class="row"><label>자질 <select data-k="stat" ${dis}>${STATS.map(s=>`<option ${sk.stat===s?'selected':''}>${s}</option>`).join('')}</select></label><label>목표 <select data-k="target" ${dis}>${[8,10,12,15].map(v=>`<option value="${v}" ${+sk.target===v?'selected':''}>${v} (${({8:'쉬움',10:'보통',12:'어려움',15:'매우 어려움'})[v]})</option>`).join('')}</select></label></div>`:''}</div>`:''}
   ${r.w?wildHTML(r,E,T):(['battle','boss'].includes(r.t)?`<p class="small muted">야생 시트가 없어요. 「템플릿 시트 적용」을 누르면 템플릿 머릿수만큼 생겨요.</p>`:'')}</div>`}
 function wildHTML(r,E,T){const dis=E?'':'disabled';const RL={pre:'사전 몹',esc:'졸개',boss:'보스'};
  return `<div class="dgw"><div class="row"><b>야생 시트</b><span class="small muted">${r.w.mons.length}체 · 통솔점 ${Math.round(r.w.mons.reduce((a,m)=>a+pcost(m.pride),0)*100)/100}</span><span class="sp"></span>${E&&r.w.mons.length<6?'<button class="btn sm ghost" data-dg="addmon">＋ 1체</button>':''}</div>
   ${r.w.mons.map((m,i)=>{const sp=spOf(m.name);const ab=sp?[sp[5],sp[6],sp[7]].filter(a=>a&&a!=='-'):[];
    return `<div class="dgm" data-mi="${i}"><div class="row"><span class="dgrole ${m.role}">${RL[m.role]||''}</span><input class="dgsp" data-m="name" list="dgSpList" value="${esc(m.name)}" placeholder="포켓몬 이름" ${dis}>${m.t1&&m.t1!=='-'?`<span class="small muted">${esc(m.t1)}${m.t2&&m.t2!=='-'?' · '+esc(m.t2):''}</span>`:''}<span class="sp"></span>${E?`<button class="btn sm ghost" data-dg="delmon" title="이 칸 빼기">✕</button>`:''}</div>
     <div class="row dgm-r"><label>프라이드 <select data-m="pride" ${dis}>${PRIDES.map(p=>`<option ${m.pride===p?'selected':''}>${p}</option>`).join('')}</select></label><label>Lv ± <input type="number" data-m="dist" value="${+m.dist||0}" style="width:60px" ${dis}></label>
      <label>특성 ${ab.length?`<select data-m="ability" ${dis}><option value=""></option>${ab.map(a=>`<option ${m.ability===a?'selected':''}>${esc(a)}</option>`).join('')}</select>`:`<input data-m="ability" value="${esc(m.ability||'')}" ${dis}>`}</label></div>
     <label>기술 <input data-m="moves" value="${esc((m.moves||[]).join(', '))}" placeholder="쉼표로 — 몸통박치기, 전광석화" ${dis}></label>
     <div class="small muted">포텐셜 ${esc((m.pots||[]).join(' · '))}</div>
     ${(m.gye||[]).map((g,gi)=>`<div class="row dgpo"><span class="dgtag">『계제』${gi+1}</span><input data-g="${gi}" data-gf="name" value="${esc(g.name)}" placeholder="이름" ${dis}><input data-g="${gi}" data-gf="eff" value="${esc(g.eff)}" placeholder="효과" ${dis}></div>`).join('')}
     ${m.wp?`<div class="row dgpo"><span class="dgtag wp">야생 포텐셜</span><input data-wp="name" value="${esc(m.wp.name)}" placeholder="이름" ${dis}><input data-wp="eff" value="${esc(m.wp.eff)}" placeholder="효과" ${dis}></div>`:''}</div>`}).join('')}</div>`}
 function mqHTML(x,E){const dis=E?'':'disabled';const d=x.d;
  return `<div class="dgrp"><b>던전 전체</b><p class="small muted">지도의 방을 누르면 그 방을 고쳐요.</p>
   <b class="small">『미궁 포텐셜』 — 조우 때 야생 쪽 고유로 붙는다</b>${(d.mq||[]).map((q,i)=>`<div class="row dgpo"><span class="dgtag mq">미궁 ${i+1}</span><input data-q="${i}" data-qf="name" value="${esc(q.name)}" placeholder="이름" ${dis}><input data-q="${i}" data-qf="eff" value="${esc(q.eff)}" placeholder="효과" ${dis}></div>`).join('')}
   <label>테마 · 분위기 <input data-f="a" value="${esc(d.a||'')}" ${dis}></label></div>`}
 const SPX={};function spOf(n){if(!n)return null;if(SPX[n]!==undefined)return SPX[n];const L=((ENV().data&&ENV().data())||window.MKM_DB||{}).old||[];return SPX[n]=L.find(r=>r[1]===n)||null}
 function spList(){if(document.getElementById('dgSpList'))return;const L=(window.MKM_DB||{}).old||[];const dl=document.createElement('datalist');dl.id='dgSpList';dl.innerHTML=L.map(r=>`<option value="${esc(r[1])}">`).join('');document.body.appendChild(dl)}

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
  if(t.dataset.f){const f=t.dataset.f;if(f==='n'||f==='a')d[f]=t.value;else if(f==='pub')x.pub=t.checked;else if(f==='tier'){x.tier=t.value;re=true}}
  else if(t.dataset.r&&r){const f=t.dataset.r;if(f==='hassk'){if(t.checked)r.sk={v:4,label:'',name:'',stat:'지시',target:10,scene:'field',auto:'normal'};else delete r.sk;re=true}
   else if(f==='t'){r.t=t.value;if(r.t!=='safe')delete r.rk;re=true}else if(f==='rk'){if(t.value)r.rk=t.value;else delete r.rk}else r[f]=t.value;if(f==='n')re=e.type==='change'}
  else if(t.dataset.k&&r&&r.sk){const f=t.dataset.k;if(f==='target'){r.sk.target=+t.value;r.sk.auto=AUTO[+t.value]}else{r.sk[f]=t.value;if(f==='label')r.sk.name=t.value}}
  else if(t.dataset.q!=null){const q=d.mq[+t.dataset.q];if(q)q[t.dataset.qf]=t.value}
  else{const box=t.closest('[data-mi]');if(box&&r&&r.w){const m=r.w.mons[+box.dataset.mi];if(!m)return;
   if(t.dataset.m){const f=t.dataset.m;if(f==='moves')m.moves=t.value.split(/[,，]/).map(s=>s.trim()).filter(Boolean).slice(0,8);else if(f==='dist')m.dist=clamp(Math.round(+t.value||0),-30,60);else if(f==='pride'){m.pride=t.value;re=true}
    else if(f==='name'){m.name=t.value.trim();const sp=spOf(m.name);if(sp&&e.type==='change'){m.t1=sp[3]||'-';m.t2=sp[4]&&sp[4]!==''?sp[4]:'-';m.base=sp.slice(11,17).map(v=>+v||60);if(!m.ability)m.ability=sp[5]&&sp[5]!=='-'?sp[5]:'';re=true}}
    else m[f]=t.value}
   else if(t.dataset.g!=null){const g=m.gye[+t.dataset.g];if(g)g[t.dataset.gf]=t.value}else if(t.dataset.wp&&m.wp)m.wp[t.dataset.wp]=t.value}}
  touch(ST.id);if(re&&e.type==='change')render()}
 async function onClick(e){const b=e.target.closest('[data-dg]');if(!b||!b.closest('#v-dg,.mbox'))return;const k=b.dataset.dg;const x=ST.docs[ST.id];
  if(k==='new')return newDlg();if(k==='mk')return make();if(k==='cancel'){try{ENV().closeModal()}catch(_){}return}
  if(k==='open'){ST.view='ed';ST.id=b.dataset.id;ST.sel='';ST.linkFrom='';return render()}
  if(k==='back'){await flush();ST.view='list';return render()}
  if(k==='dup'){const s=ST.docs[b.dataset.id];if(!s)return;const M=me();const id=uid('dg');const c=clone(s);c.owner=M.key;c.ownerName=M.name||c.ownerName;c.pub=false;c.d.n=(c.d.n||'던전')+' (복제)';c.at=Date.now();ST.docs[id]=c;touch(id);ST.view='ed';ST.id=id;ST.sel='';toast('내 던전으로 복제했어요');return render()}
  if(k==='del'){const s=ST.docs[b.dataset.id];if(!s||!canEd(s))return;if(!confirm(`「${s.d.n||'던전'}」 을 지울까요? (30일 안에는 되살릴 수 있어요)`))return;await del(b.dataset.id);return render()}
  if(!x)return;const E=canEd(x);const d=x.d;
  if(k==='json'){const t=JSON.stringify(d,null,1);try{await navigator.clipboard.writeText(t);toast('웹툴 던전 JSON 을 복사했어요')}catch(_){prompt('복사하세요',t)}return}
  if(!E)return;
  if(k==='tpl'){const log=applyTpl(x);touch(ST.id);render();toast(log.length?'템플릿 적용 · 확인: '+log.join(' / '):'템플릿대로 맞췄어요');return}
  if(k==='regen'){if(!confirm('지도와 방을 새로 만들어요. 지금 방 · 야생 시트는 사라져요. 계속할까요?'))return;try{const res=generate({tier:x.tier,theme:x.theme||'폐가',name:d.n,owner:x.ownerName});x.d=res.d;x.seed=res.seed;ST.sel='';touch(ST.id);render()}catch(err){toast(err.message)}return}
  if(k==='unsel'){ST.sel='';ST.linkFrom='';return render()}
  if(k==='link'){ST.linkFrom=ST.linkFrom?'':ST.sel;return render()}
  if(k==='start'&&ST.sel){d.st=ST.sel;touch(ST.id);return render()}
  if(k==='addroom'&&ST.sel){const a=d.r[ST.sel];const id='x'+Math.random().toString(36).slice(2,6);let px=a.x+140,py=a.y;if(px>970){px=a.x-140}d.r[id]={n:'새 방',t:'room',m:'',x:clamp(px,30,970),y:clamp(py,30,600)};d.l[lk(ST.sel,id)]=1;ST.sel=id;touch(ST.id);return render()}
  if(k==='delroom'&&ST.sel&&ST.sel!==d.st){if(!confirm(`「${d.r[ST.sel].n}」 방을 지울까요?`))return;delete d.r[ST.sel];for(const kk of Object.keys(d.l))if(kk.split('~').includes(ST.sel))delete d.l[kk];ST.sel='';touch(ST.id);return render()}
  const r=ST.sel&&d.r[ST.sel];const T=TPL[x.tier]||TPL.s1;
  if(k==='addmon'&&r&&r.w){r.w.mons.push(slot(r.t==='boss'?'esc':'pre',r.w.mons.length,T));touch(ST.id);return render()}
  if(k==='delmon'&&r&&r.w){const i=+b.closest('[data-mi]').dataset.mi;r.w.mons.splice(i,1);if(!r.w.mons.length)delete r.w;touch(ST.id);return render()}}
 setTimeout(()=>{const el=root();if(el&&!el.hidden)render()},0);
 document.addEventListener('input',onInput);document.addEventListener('change',onInput);document.addEventListener('click',onClick);
 return {render,generate,applyTpl,check,TPL}})();
