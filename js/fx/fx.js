/* ---------- 효과 엔진 (레디메이드 자동화) ----------
   맵툴 Lib:readymade 의 매크로를 「명령(op)」 목록으로 옮긴 것(data/readymade.js)을 실행한다.
   · 한국어 구문(DSL) ↔ op 목록 양방향 변환 (parse / unparse) — 포텐셜·특성·소지품에 손으로 써 넣거나, 생성기로 만든다.
   · 효과는 포켓몬의 m.fx 에 이름 붙은 항목으로 남고(위력 강화·완화, 우선도, 면역, 감소 무시, 비례 무시, 하늘 위 …),
     공격 창·HP 창·행동 순서·턴 종료가 자동으로 읽는다. 횟수·턴이 다 되면 저절로 사라진다.
   · 모두 순수 함수: 배틀 사본(b)과 문맥(ctx)을 받아 고치고 로그 줄을 돌려준다. 선택·확인이 필요하면 ctx.ask 로 묻는다 (async).
   대상(tgt): self 자신 · ally 아군 전체 · enemy 상대 전체 · others 자신 이외 · all 전체 · ally1 아군 1체 · adj 옆에 선 아군 · enemy1 상대 1체 · front 정면(맞은편 같은 에리어) ·
            randother 자신 이외 무작위 · randenemy 상대 무작위 · randall 전원 무작위 · area 지정 에리어(지령) */
"use strict";
 /* 10-26 제보(렌): 「상승」(랭크 +N)과 「강화」(배율 ×)를 가른다. lv '' = 랭크+배율(예전 그대로) · 'rank' = 랭크만 · 'mod' = 배율만. 글자도 한 곳에서 */
 const iuLabel=iu=>{const lv=iu.lv||'';if(iu.all)return lv==='rank'?'랭크 변화 무시':lv==='mod'?'배율 변화 무시':'변화 모두 무시';if(iu.dn)return lv==='rank'?'감소(랭크) 무시':lv==='mod'?'저하(배율) 무시':'감소·저하 무시';return lv==='rank'?'상승(랭크) 무시':lv==='mod'?'강화(배율) 무시':'상승·강화 무시'};
 const iuLv=w=>w==='rank'?' 랭크':w==='mod'?' 배율':'';
window.OM_FX=(()=>{
 const DB=()=>window.OM_DB||{}, B=()=>window.OM_BATTLE, S=()=>window.OM_STATS;
 /* 특성 바꾸기 · 되돌리기 (10-24 망령): 이름만 바꾸면 효과 글(abilityEff)이 예전 특성 그대로 남는다 — 새 특성은 DB 글, 되돌릴 땐 원래 글(제작기 사본 포함)로 */
 const abEff=n=>{const a=(DB().traits||{})[n]||{};return String(a.multi||a.single||'').replace(/<br\s*\/?>/gi,'\n')};
 /* 10-26 (서서 VS 마리 시험): 특성이 바뀌면 옛 특성이 걸어 둔 자기 효과(내진의 땅 반감 등)를 푼다 */
 function dropAbFx(m,old){if(!old||!m||!m.fx)return;const F=fx(m);const key=old+' ← '+m.name;const hit=e=>e&&(e.key===key||String(e.key||'').startsWith(key+' ('));for(const e of (F.mults||[]).filter(hit))unmult(m,e);F.mults=(F.mults||[]).filter(e=>!hit(e));for(const k of ['mods','noind','prio','immune','nodrop','chance'])if(Array.isArray(F[k]))F[k]=F[k].filter(e=>!hit(e))}
 function setAb(m,n,by){const old0=m.ability;if(old0&&old0!==(n||''))dropAbFx(m,old0);if(m.abilityOrig==null){m.abilityOrig=m.ability||'';m.abilityEffOrig=m.abilityEff||''}if(by!=null)m.abilityBy=by;m.ability=n||'';m.abilityEff=abEff(n);if(m.abilityOrig===m.ability)resetAb(m)}
 function resetAb(m){if(m.abilityOrig==null)return false;m.ability=m.abilityOrig;m.abilityEff=m.abilityEffOrig!=null?m.abilityEffOrig:abEff(m.ability);delete m.abilityOrig;delete m.abilityEffOrig;delete m.abilityBy;return true}
 const STATS=['attack','defense','specialattack','specialdefense','speed','accuracy','evasion','critical','critical_buff'];
 const STAT_KO={attack:'공격',defense:'방어',specialattack:'특공',specialdefense:'특방',speed:'스피드',accuracy:'명중',evasion:'회피',critical:'급소',critical_buff:'급소방호'};
 const KO_STAT={};for(const k in STAT_KO)KO_STAT[STAT_KO[k]]=k;KO_STAT['특수공격']='specialattack';KO_STAT['특수방어']='specialdefense';KO_STAT['민첩']='speed';KO_STAT['속도']='speed';
 const TGT_KO={self:'자신',ally:'아군 전체',allyx:'자신 제외 아군 전체',enemy:'상대 전체',others:'자신 이외',all:'전체',ally1:'아군 1체',adj:'옆 아군',enemy1:'상대 1체',front:'정면',syncally:'동조된 아군',syncfoe:'동조된 상대',randother:'자신 이외 무작위 1체',randenemy:'상대 무작위 1체',randall:'전원 무작위 1체',area:'지정 에리어'};
 const KO_TGT={대상:'enemy1',맞은대상:'enemy1',정면:'front',정면의상대:'front',옆아군:'adj',옆에선아군:'adj',자신:'self',아군전체:'ally',아군:'ally',상대전체:'enemy',상대:'enemy',자신이외:'others',자신제외아군전체:'allyx',자신제외아군:'allyx',전체:'all',아군1체:'ally1',아군1:'ally1',상대1체:'enemy1',상대1:'enemy1',무작위1:'randother',자신이외무작위:'randother',상대무작위:'randenemy',전원무작위:'randall',무작위1체:'randother',자신이외무작위1체:'randother',자신이외무작위1:'randother',상대무작위1체:'randenemy',상대무작위1:'randenemy',전원무작위1체:'randall',전원무작위1:'randall',에리어:'area',지정에리어:'area',동조아군:'syncally',동조된아군:'syncally',동조상대:'syncfoe',동조된상대:'syncfoe'};
 const TYPE_KO={Normal:'노말',Fire:'불꽃',Water:'물',Electric:'전기',Grass:'풀',Ice:'얼음',Fighting:'격투',Poison:'독',Ground:'땅',Flying:'비행',Psychic:'에스퍼',Bug:'벌레',Rock:'바위',Ghost:'고스트',Dragon:'드래곤',Dark:'악',Steel:'강철',Fairy:'페어리',God:'신',Shadow:'그림자',Wild:'야생'};
 const KO_TYPE={};for(const k in TYPE_KO)KO_TYPE[TYPE_KO[k]]=k;
 const NEG=['Poison','Toxic','Burn','Paralysis','Freeze','Sleep','SyrupBomb','Confusion','Flinch','Embrago','Silence','Seal','Powder','Oblivion','TraitBroken','Taunt','Encore','Attract','HealBlock','Disable','Torrment','MeanLook','Bind','OctoLock','Block','Curse','LeechSeed','SaltCure','Nightmare','Yawn','DeathCount','LockOn','Telekinesis'];
 const FUTURE=['FutureSight','SpontaneousCombustion','ThunderClouds','Rockfallism','StormWarning','TsunamiWarning','InsectInvasion','DoomDesire','SwarmAttack','DarknessOfTheEnd'];
 const ABN=['Poison','Toxic','Burn','Paralysis','Freeze','Sleep'];
 /* 11-06 망령: 「독」을 조건·치유·면역으로 쓰면 「맹독」도 포함 (「맹독」 지정은 맹독만) */
 const hasSt=(m,k)=>{const s=(m&&m.states)||{};return !!s[k]||(k==='Poison'&&!!s.Toxic)};
 const stWide=l=>Array.isArray(l)&&l.includes('Poison')&&!l.includes('Toxic')?l.concat(['Toxic']):l;
 const stDB=()=>((DB().states||{}).st)||{};
 const stKo=k=>(stDB()[k]||{}).ko||k;
 const stKoW=k=>String(stKo(k)).replace(/\s+/g,'');/* 구문에 쓸 때는 띄어쓰기를 뺀다 */
 function stEn(kor){kor=String(kor||'').trim();const st=stDB();if(st[kor])return kor;for(const k in st)if(st[k].ko===kor)return k;const nk=kor.replace(/\s+/g,'');if(nk)for(const k in st)if(String(st[k].ko||'').replace(/\s+/g,'')===nk)return k;return ''}
 /* 띄어쓰기가 든 상태 이름(「구멍 안」 등)도 한 낱말로 읽도록, 앞 낱말들을 이어 붙여 가장 긴 상태 이름을 찾는다 */
 function takeState(words){for(let n=Math.min(words.length,4);n>1;n--){const j=words.slice(0,n).join('');if(stEn(j)){words.splice(0,n);return stKo(stEn(j))}}return words.shift()}
 const typesOf=m=>(m.teraActive&&m.teraEn&&m.teraEn!=='-')?[m.teraEn]:(m.types||[]).filter(t=>t&&t!=='-');
 const frac=(base,v)=>{v=String(v||'').trim();const m=v.match(/^(\d+)\s*\/\s*(\d+)$/);if(m)return Math.max(1,Math.floor(base*+m[1]/+m[2]));const n=+v;return isNaN(n)?0:Math.floor(n)};
 const fx=m=>{m.fx=m.fx||{mods:[],noind:[],prio:[],immune:[],nodrop:[],roles:[]};for(const k of ['mods','noind','prio','immune','nodrop','roles','mults','chance','sp'])m.fx[k]=m.fx[k]||[];return m.fx};
 /* 11-03 망령 「다 해 보자」: 특수 효과(sp) — 추가 공격 · 변경 보호 · 특성 무시 · 기술 타입 · 지속 연장 · 해석 차단 · 무효 관통 · N할 회피 · 추가 효과 배율 · 끌어오기 · 반사.
    m.fx.sp = [{key, name, sp:종류, …}] — 웹툴 공격 창 · 상성 · 해석이 spOf(m, 종류) 로 읽는다 */
 const SP_KO={extra:'추가 공격',protect:'변경 보호',mold:'특성 무시',mvtype:'기술 타입',ext:'지속 연장',nodex:'해석 차단',scrappy:'무효 관통',evade:'회피',secx:'추가 효과',redirect:'끌어오기',bounce:'반사',keepdef:'수세 유지'};
 /* 11-05 망령 「가장 높은 · 낮은 능력치 — 종족치 랭크로 따지자 (실수치는 복잡)」: HP 를 뺀 다섯 능력치의 종족치(= 종족치 랭크 순서)로 고른다.
    같으면 공격 · 방어 · 특공 · 특방 · 스피드 순(원작 비스트부스트와 같은 순서). 종족치가 없으면 공격 */
 const PICK5=['attack','defense','specialattack','specialdefense','speed'];
 function pickStat(m,lo){const b=Array.isArray(m&&m.base)?m.base.map(v=>+v||0):null;if(!b||b.length<6)return 'attack';let bi=1;for(let i=2;i<=5;i++){if(lo?b[i]<b[bi]:b[i]>b[bi])bi=i}return PICK5[bi-1]}
 function spOf(m,kind){const t=curTurn();return ((m&&m.fx&&m.fx.sp)||[]).filter(e=>(!kind||e.sp===kind)&&!itemOff(m,e)&&!(e.until>=0&&t>e.until))}
 const tyK=ts=>(ts||[]).map(t=>TYPE_KO[t]||t).join('·');
 function spDesc(e){const f=[e.types&&e.types.length?tyK(e.types)+' 기술':'',e.tg&&e.tg.length?'「'+e.tg.join('」「')+'」':'',e.cat||''].filter(Boolean).join(' ');
  switch(e.sp){case 'extra':return `${f||'기술'}이 명중하면 ${e.n>1?e.n+'번':'1번'} 더 공격 (위력 ×${e.pw}${e.sure?' · 필중':''})`;case 'protect':return (e.what||['trait']).map(w=>w==='item'?'소지품':w==='type'?'타입':'특성').join(' · ')+'이(가) 바뀌거나 없어지지 않는다';case 'mold':return '자신의 기술이 상대의 특성을 무시한다';
   case 'mvtype':return `${e.mv?'「'+e.mv+'」':e.from?tyK([e.from])+' 기술':'모든 기술'} → ${tyK([e.to])} 기술`;case 'ext':return `${(e.what||[]).join('·')||'날씨 · 필드 · 벽'} 지속 +${e.n}턴`;case 'nodex':return '자신에 대한 데이터 해석을 막는다';
   case 'scrappy':return `${e.types&&e.types.length?tyK(e.types):'모든'} 기술이 ${[...(e.vs||[]).map(t=>'타입 : '+(TYPE_KO[t]||t)),...(e.float?['하늘 위']:[])].join(' · ')}에게도 명중`;case 'evade':return `${f||'공격'}을 ${e.pct}% 로 회피`;
   case 'secx':return `${f||'기술'}의 추가 효과 발생률 ×${e.v}`;case 'redirect':return `${f||'단일 대상 기술'}의 대상을 자신으로`;case 'bounce':return `${e.cat||'변화기'}를 되받아친다`;
   case 'keepdef':return `${e.hp?'「HP : '+e.hp+' 이하」일 때 ':''}${(e.mv||[]).length?'「'+e.mv.join('」「')+'」':(f||'공격 기술')}을 내보내도 【수세】가 적용된다`;default:return e.sp}}
 const WEATHERS=['맑음','비','모래바람','눈','싸라기눈','짙은안개','밤','별하늘','설경'];
 /* 11-04 감우 (망령 「높음 두 개 개선」): 빛의점토 · 바위 · 그라운드코트 같은 연장 소지품은 itemExt 가 +3 을 이미 준다 — 같은 소지품이 【소지품】 구문(지속연장)으로 또 건 ext 는 세지 않는다 (리플렉터 5+3+3=11 이던 것) */
 function spExt(self,what){let n=0;const by=[];const it0=itemExt(self,what);const nm=x=>String(x||'').replace(/[『』「」]/g,'').trim();for(const e of spOf(self,'ext')){if(it0&&nm(e.name)===nm(it0))continue;const W=e.what||[];if(!W.length||W.some(x=>x===what||(x==='날씨'&&WEATHERS.includes(what))||(x==='필드'&&/필드$/.test(what))||(x==='벽'&&['리플렉터','빛의장막','오로라베일'].includes(what)))){n+=+e.n||0;by.push(e.name)}}return {n,by}}
 const alive=m=>m&&m.hp&&m.hp.cur>0;

 /* ===== 레디메이드 찾기: 방 덮어쓰기(dbx.rm) → 기본 ===== */
 function rmAll(){const base=DB().readymade||{};const ov=(((window.OM_APP||{}).ST||{}).state||{}).dbx;const o=(ov&&ov.rm)||{};const ed=typeof window.MKM_RM==='function'?window.MKM_RM():null;/* 제작기 DB 관리의 레디메이드 행이 기본을 덮고, 방의 dbx.rm 이 그 위를 덮는다 */const all=Object.assign({},base,ed||{},o);for(const k in all)if(all[k]&&all[k].deleted)delete all[k];return all}
 function rm(name){if(!name)return null;const all=rmAll();name=String(name).replace(/『|』/g,'').trim();return all[name]||null}
 /* 포켓몬의 포텐셜/특성/소지품에 붙은 자동화: 개별 구문(m.auto[name]) → 레디메이드 */
 function autoOf(m,kind,name){name=String(name||'').replace(/『|』/g,'').trim();const own=(m&&m.auto||{})[name];if(own&&own.ops&&own.ops.length)return Object.assign({name,src:'own'},own);   /* 11-03 21:58 망령 「어태커 · 에이스 자동화가 안 들어가 있다」: 시트 구문 칸이 비었거나 못 읽는 글(ops 0개)이면 레디메이드로 넘어간다 — 예전엔 빈 시트 구문이 레디메이드를 가렸다 */
  if(kind==='pot'&&m&&m.tid){const bt=(((window.OM_APP||{}).ST||{}).state||{}).battle;const tr=bt&&bt.trainers&&bt.trainers[m.tid];const u=tr&&(tr.unique||[]).find(x=>x&&String(x.name||'').replace(/『|』/g,'').trim()===name);if(u&&u.auto&&u.auto.ops&&u.auto.ops.length)return Object.assign({name,src:'unique'},u.auto)}
  const key=kind==='trait'?'특성 : '+name:kind==='item'?'소지품 : '+name:name;const r=rm(key)||(kind!=='pot'?rm(name):null);if(!r)return null;
  /* 10-24 망령: 레디메이드 특성 · 소지품은 글(text)이 빈 것이 많아 확률(N할로) · 【등장】 표식을 못 읽었다 — 비었으면 DB 효과 글을 채워 준다 */
  if(!r.text&&kind!=='pot'){const t=effOf(kind,name);if(t)return Object.assign({name,src:'rm',key},r,{text:t,textDb:1})}
  return Object.assign({name,src:'rm',key},r)}
 /* 특성 · 소지품의 DB 효과 글: 오레마스(OM_DB.traits · items) → 제작기(MKM_DB.abil · items) */
 function effOf(kind,name){try{const D=window.OM_DB||{};const M=window.MKM_DB||{};
   if(kind==='trait'){const t=(D.traits||{})[name];if(t)return String(t.multi||t.single||'');const r=(M.abil||[]).find(x=>x&&x[1]===name);return r?String(r[2]||''):''}
   if(kind==='item'){const t=(D.items||{})[name];if(t)return String(t.eff||'');const r=(M.items||[]).find(x=>x&&x[1]===name);return r?String(r[4]||''):''}}catch(e){}return ''}
 /* 레디메이드 발동 확률: 레디메이드에 적어 둔 확률(p, 1~100)이 먼저, 없으면 효과 글(N할로 · N% 확률 · 저/중/고확률 · 드물게)에서. 0 = 확률 없음 */
 function rmChance(a,text){const p=a&&a.p;if(p!=null&&p!==''&&isFinite(+p)&&+p>0)return Math.min(100,+p);const t=String((a&&a.text)||text||'');const c=chanceOf(t);if(c)return c;const pl=timing(t).percent;return pl?percentOf(pl):0}

 /* ===== 대상 고르기 ===== */
 function sideMons(b,side){return Object.values(b.mons||{}).filter(m=>m.side===side&&m.entry&&alive(m))}
 /* 10-24 망령: 개인전 — 트레이너에 solo 가 켜져 있으면 같은 진영이어도 그 트레이너 혼자 한 편 (오레마스 OM_TEAM 과 같은 규칙) */
 function teamOf(b,m){const t=((b&&b.trainers)||{})[m&&m.tid];return t&&t.solo?'solo:'+m.tid:(m&&m.side)||''}
 /* 11-03 20:44 망령 「커맨더 · 옵저버 같은 【방호】 아군 배율」: 【유일】 — 같은 이름의 효과를 다른 포켓몬에게서 이미 받은 대상은 빼고 건다 (같은 효과가 겹치지 않게) */
 function uqHas(m,name,self){const nm=String(name||'').replace(/『|』/g,'').trim();if(!nm||!m||!m.fx)return false;const own=nm+' ← '+(self&&self.name);
  for(const k of HL)for(const e of (m.fx[k]||[])){const kk=String(e&&e.key||'');if(kk.startsWith(nm+' ← ')&&!kk.startsWith(own))return true}return false}
 /* 11-05 망령 「동조」: 필드 위 아군 · 상대 중 같은 『역할』끼리 맞선 것 (대치 성립). a = 동조된 아군 id, e = 동조된 상대 id, pairs = [아군 id, 상대 id, 역할]. rolesOf 를 안 주면 m.role + 역할 추가(fx.roles) */
 /* 11-05 망령 「역할은 분류로」: 역할 분류(계열). 동조 대치 · 각성체 대가 B-2(역할 막기) 는 이름이 아니라 분류로 맞춘다 (러너를 막으면 닌자 · 하이 러너도) */
 const ROLE_FAM={러너:['러너','닌자','하이 러너'],어태커:['어태커','하이 어태커','어쌔신','타이트엔드'],블로커:['블로커','하이 블로커','타이트엔드'],와일드:['와일드','와일드 보스','디멘션 보스'],에이스:['에이스','서브 에이스','링크 에이스','킬링 에이스'],서포터:['서포터','어시스트','옵저버','바운서','커맨더'],킬러:['킬러','퀄러','스프린터','디스럽터']};
 const RF_IDX={};for(const k in ROLE_FAM)for(const n of ROLE_FAM[k]){const q=n.replace(/\s/g,'');(RF_IDX[q]=RF_IDX[q]||[]).push(k)}   /* 11-05 22:12 망령: 어쌔신 = 어태커 · 타이트엔드 = 어태커 · 블로커 양쪽 · 와일드 · 와일드 보스 · 디멘션 보스 = 와일드(야생) · 베테랑 = 베테랑 */
 function roleFams(r){const n=String(r||'').replace(/『|』/g,'').trim();const k=n.replace(/\s/g,'');if(RF_IDX[k])return RF_IDX[k].slice();if(ROLE_FAM[k])return [k];for(const f in ROLE_FAM)if(k.endsWith(f))return [f];return n?[n]:[]}
 const roleFam=r=>roleFams(r)[0]||'';
 const rolesDef=m=>{const o=new Set(((m&&m.fx)||{}).roles||[]);const r=String((m&&m.role)||'').replace(/『|』/g,'').trim();if(r)o.add(r);return [...o]};
 function syncPairs(b,self,rolesOf){const R=rolesOf||rolesDef;const out={a:new Set(),e:new Set(),pairs:[]};if(!b||!self)return out;const tm=teamOf(b,self);const live=Object.values(b.mons||{}).filter(m=>m.entry&&alive(m));
  const al=live.filter(m=>teamOf(b,m)===tm),en=live.filter(m=>teamOf(b,m)!==tm);for(const a of al){const ra=[...new Set(R(a).flatMap(roleFams))].filter(r=>r&&r!=='바닐라');if(!ra.length)continue;for(const e of en){const hit=[...new Set(R(e).flatMap(roleFams))].find(r=>ra.includes(r));if(hit){out.a.add(a.id);out.e.add(e.id);out.pairs.push([a.id,e.id,hit])}}}return out}
 /* 11-09 대상타입: run 이 지금 줄의 op.ttype 을 RUNTT 에 두면 대상에서 그 타입만 남긴다 */let RUNTT=null;
 async function targets(b,self,tgt,ctx){const r=await targets0(b,self,tgt,ctx);const tt=RUNTT;return tt&&tt.length?(r||[]).filter(m=>m&&typesOf(m).some(t=>tt.includes(t))):r}
 async function targets0(b,self,tgt,ctx){if(ctx&&ctx.uniq){const r=await targets(b,self,tgt,Object.assign({},ctx,{uniq:0}));return r.filter(m=>m===self||!uqHas(m,ctx.name,self))}const tm=teamOf(b,self);const live=Object.values(b.mons||{}).filter(m=>m.entry&&alive(m));const allies=live.filter(m=>teamOf(b,m)===tm),enemies=live.filter(m=>teamOf(b,m)!==tm);
  const pick=async(list,label)=>{if(!list.length)return [];if(list.length===1)return [list[0]];if(ctx.pick)return [await ctx.pick(list,label)].filter(Boolean);return [list[0]]};
  const rnd=list=>list.length?[list[Math.floor(Math.random()*list.length)]]:[];
  switch(tgt){case 'self':return [self];case 'ally':return allies.length?allies:[self];case 'allyx':return allies.filter(m=>m.id!==self.id);   /* 10-27 드래곤옐 */case 'enemy':return enemies;case 'others':return [...allies,...enemies].filter(m=>m.id!==self.id);case 'all':return [...allies,...enemies];
   case 'ally1':return pick(allies.filter(m=>m.id!==self.id),'아군 1체');case 'ally1s':return pick(allies,'아군 1체');   /* 자신 포함 (트레이너 카드 · 10-26) */case 'enemy1':return pick(enemies,'상대 1체');case 'front':{/* 정면: 맞은편 진영의 같은 에리어 (좌 B ↔ 우 B) — 비었으면 상대 1체를 고른다 (10-26 FFA 시험) */const f=enemies.filter(m=>m.side!==self.side&&m.entry===self.entry);return f.length?[f[0]]:pick(enemies,'정면이 비었다 — 상대 1체')}case 'syncally':{const P=syncPairs(b,self,ctx&&ctx.rolesOf);return allies.filter(m=>P.a.has(m.id))}case 'syncfoe':{const P=syncPairs(b,self,ctx&&ctx.rolesOf);return enemies.filter(m=>P.e.has(m.id))}case 'randother':return rnd([...allies,...enemies].filter(m=>m.id!==self.id));case 'randenemy':return rnd(enemies);case 'randall':return rnd([...allies,...enemies]);
   case 'adj':{const AR=['a','b','c'];const i=AR.indexOf(self.entry);return allies.filter(m=>m.id!==self.id&&i>=0&&Math.abs(AR.indexOf(m.entry)-i)===1)}   /* 옆에 선 아군: 에리어 a-b-c 에서 바로 옆 칸 (B 는 A·C 둘 다) */
   case 'area':{if(ctx.area){const m=allies.find(x=>x.entry===ctx.area);if(m)return [m]}return pick(allies,'에리어')}default:return [self]}}

 /* ===== 실행 ===== */
 /* ctx: {b(사본), self(포켓몬), name(효과 이름), area?, pick(list,label)->mon, confirm(q)->bool, choose(labels,multi)->idx[]} */
 /* 지금 필드: run 중이면 그 사본을 본다 (필드의 상태이상 방어 · 매직룸) */
 let RUNB=null;let RUNSTK=0;   /* 11-07: 이미 걸린 효과를 「중첩」으로 다시 걸 때(ctx.stack>1) 같은 출처 배율도 겹친다 */
 function fieldNow(){const b=RUNB||(((window.OM_APP||{}).ST||{}).state||{}).battle||{};return b.field||{}}
 function magicRoom(){return +(((fieldNow().rooms)||{})['매직룸']||0)>0}
 /* 매직룸 동안 소지품에서 온 효과는 잠든다 (이름이 지금 소지품과 같은 항목) */
 /* 11-08 23:12 망령 「금제 · 서투름은 지닌 효과도 전부 꺼」: 소지품 칸 전부(2 · 3번 칸 포함) · 매직룸 또는 그 포켓몬이 금제 · 서투름(OM_FIELD.itemOff) */
 const itemNames=m=>m?[m.item,...((m.items2||[]).map(x=>x&&x.item))].map(n=>String(n||'').replace(/『|』/g,'').trim()).filter(Boolean):[];
 function itemsDead(m){const F=window.OM_FIELD;return F&&F.itemOff?F.itemOff(m):magicRoom()}
 function itemOff(m,e){return !!(m&&e&&itemNames(m).includes(String(e.name||'').replace(/『|』/g,'').trim())&&itemsDead(m))}
 /* 11-08 51-2: 지금 효과가 살아 있는 소지품을 지녔나 (매직룸 · 금제 · 서투름이면 없음) · 다 써서 칸에서 뺀다 */
 const holds=(m,n)=>!!m&&itemNames(m).includes(n)&&!itemsDead(m);
 function useItem(m,n){if(!m)return '';const nI=v=>String(v||'').replace(/『|』/g,'').trim();let k=0,sl=m;if(nI(m.item)!==n){const i=(m.items2||[]).findIndex(q=>q&&nI(q.item)===n);if(i<0)return '';k=i+1;sl=m.items2[i]}m.itemUsed=Object.assign({name:sl.item,eff:sl.itemEff||'',turn:curTurn()},k?{k}:{});try{removeByName(m,sl.item)}catch(e){}sl.item='';sl.itemEff='';if(k)delete sl.itemOwn;return `${m.name}의 「${n}」 — 다 써서 없어졌다`}
 /* 11-08 51-2 ㉓ 「특성 파괴」: 걸리면 특성을 접어 두고(m.abBroken) 풀리면 되돌린다 — 저장 직전(웹툴 saveBattle · saveMon) · 교대 정리 · 치유에서 맞춘다 */
 function abSync(m){if(!m)return '';const st=m.states||{};if(st.TraitBroken&&!m.abBroken){if(!m.ability)return '';m.abBroken={n:m.ability,e:m.abilityEff||''};try{dropAbFx(m,m.ability)}catch(e){}m.ability='';m.abilityEff='';return `${m.name} 특성 「${m.abBroken.n}」 — 파괴되어 효과가 없다`}
  if(!st.TraitBroken&&m.abBroken){m.ability=m.abBroken.n;m.abilityEff=m.abBroken.e;delete m.abBroken;return `${m.name} 특성 「${m.ability}」 — 되돌아왔다`}return ''}
 function groundedX(m){const F=window.OM_FIELD;return F&&F.grounded?F.grounded(m):!typesOf(m).includes('Flying')}
 /* 땅 위 포켓몬: 미스트필드는 상태 이상·혼란, 일렉트릭필드는 잠듦·하품을 막는다 */
 function sideObj(m,k){return !!(m&&m.side&&+((((fieldNow().objects)||{})[m.side]||{})[k]||0)>0)}
 /* 11-01 망령 「맑음일 때 얼음이 안 된다 · 밤일 때 잠듦이 안 된다」(맵툴 print_effect_weather): 맑음 · 큰가뭄 → 「얼음」 없음, 밤 · 깊은밤 → 고스트 · 악 타입 「잠듦」 없음 */
 function weatherBlock(m,en){const w=(fieldNow().weather||{}).type;if(!w||!m)return '';if(holds(m,'만능우산'))return '';   /* 11-08 51-2 ⑫ 만능우산: 날씨의 효과를 받지 않는다 *//* 11-07 에어록 · 날씨부정: 필드 위에 있는 한 날씨 효과 없음 */{const B0=RUNB||(((window.OM_APP||{}).ST||{}).state||{}).battle||{};if(Object.values(B0.mons||{}).some(x=>x&&x.entry&&x.hp&&x.hp.cur>0&&/에어록|날씨부정/.test(String(x.ability||''))))return ''}if((w==='맑음'||w==='큰가뭄')&&en==='Freeze')return w;if((w==='밤'||w==='깊은밤')&&en==='Sleep'&&typesOf(m).some(t=>t==='Ghost'||t==='Dark'))return w;return ''}
 function terrainBlock(m,en){const t=(fieldNow().terrain||{}).type;if(!t||!m||!groundedX(m))return '';if(t==='미스트필드'&&(ABN.includes(en)||en==='Confusion'))return t;if(t==='일렉트릭필드'&&(en==='Sleep'||en==='Yawn'))return t;return ''}
 /* 지속 턴 +3 소지품 (2026-10-23): 자신이 기술·특성으로 깐 날씨 · 필드 · 벽. 매직룸 중에는 없음 */
 const EXT_ITEM={'맑음':'뜨거운바위','비':'축축한바위','모래바람':'보송보송바위','눈':'차가운바위','싸라기눈':'차가운바위','별하늘':'별이박힌바위','밤':'거무칙칙한바위','짙은안개':'습한바위','필드':'그라운드코트','리플렉터':'빛의점토','빛의장막':'빛의점토','오로라베일':'빛의점토'};
 function itemExt(self,what){if(!self||itemsDead(self))return '';return itemNames(self).find(it=>EXT_ITEM[what]===it)||''}
 /* 이 효과의 중첩 한도: ctx.stack → 포켓몬 포텐셜 글 · 트레이너 고유 · 레디메이드 글의 【중첩 (N회)】. 없으면 1 */
 function stackOf(self,name,ctx){if(ctx&&+ctx.stack>0)return +ctx.stack;const nm=String(name||'').replace(/『|』/g,'').trim();const re=/【\s*중첩\s*\(\s*(\d+)\s*회\s*\)\s*】/;const T=[];
  if(self){for(const p of [...(self.pots||[]),self.excl,...(self.exclX||[])])if(p&&String(p.name||'').replace(/『|』/g,'').trim()===nm)T.push(p.eff);try{const bt=(((window.OM_APP||{}).ST||{}).state||{}).battle;const tr=bt&&bt.trainers&&bt.trainers[self.tid];const u=tr&&(tr.unique||[]).find(x=>x&&String(x.name||'').replace(/『|』/g,'').trim()===nm);if(u)T.push(u.eff)}catch(e){}}
  const r=rm(nm);if(r)T.push(r.t||r.text||r.eff||'');for(const t of T){const m=String(t||'').match(re);if(m)return Math.max(1,+m[1])}return 1}
 /* 11-08 「조건 명중」: h = {move, defTypes, moveTypes} (웹툴 공격 적용 뒤) */
  function hitOk(op,h){if(!op||!h)return false;const nm=x=>String(x||'').replace(/\s/g,'');if(op.mv&&op.mv.length&&!op.mv.some(x=>nm(x)===nm(h.move)))return false;if(op.ft&&op.ft.length&&!(h.defTypes||[]).some(t=>op.ft.includes(t)))return false;if(op.mt&&op.mt.length&&!(h.moveTypes||[]).some(t=>op.mt.includes(t)))return false;return true}
  function hitDesc(op){return [(op.mv||[]).length?'기술:'+op.mv.join(','):'',(op.ft||[]).length?'상대타입:'+op.ft.map(t=>TYPE_KO[t]||t).join(','):'',(op.mt||[]).length?'타입:'+op.mt.map(t=>TYPE_KO[t]||t).join(','):''].filter(Boolean).join(' ')}
  async function run(ops,ctx){const L=[];const SHEET_ONLY=(ops||[]).every(o=>o&&['baseup','statadd','none'].includes(o.k));   /* 시트 몫(종족치 · 실수치)은 그것만 있을 때만 알린다 — 다른 효과와 섞이면 조용히 */
 const b=ctx.b;const prevB=RUNB;RUNB=b;const prevS=RUNSTK;RUNSTK=+(ctx&&ctx.stack)>1?1:0;const self=ctx.self;const name=ctx.name||'효과';let stop=false;const STK=stackOf(self,name,ctx);
  for(let op of ops||[]){if(stop)break;/* let: 「날씨 무작위」가 op 를 바꿔 끼운다 */
   try{
    /* 10-23 망령: 줄 앞의 확률(「5할」 「30%」 「저확률」) — 이 줄만 굴린다 */
    if((op.p||op.pl)&&!ctx.noRoll){const base=op.p?+op.p:percentOf(op.pl);const rr=rollP(self,base,ctx);const lb=op.pl||(op.p%10===0?op.p/10+'할':op.p+'%');if(!rr.ok){L.push(`${lb} 판정 실패 (${rr.r}/${rr.p})${rr.adj} — ${unparse([Object.assign({},op,{p:0,pl:''})])[0]||''}`);continue}L.push(`${lb} 판정 성공 (${rr.r}/${rr.p})${rr.adj}`)}
    const hs=(op.hold||ctx.hold)&&self&&op.k!=='choice'?holdSnap(b):null;
    const prevTT=RUNTT;RUNTT=op.ttype&&op.ttype.length?op.ttype:null;try{await runOp(op)}finally{RUNTT=prevTT}
    if(hs)holdDiff(b,self,hs,name,ctx.uniq);
   }catch(e){L.push(`(${op.k} 처리 중 오류: ${e.message})`)}}
  for(const x of Object.values((b&&b.mons)||{})){const t=abSync(x);if(t)L.push(t)}
  RUNB=prevB;RUNSTK=prevS;const BL=stop?L.slice().reverse().find(x=>/발동하지 않았다/.test(x)):'';return Object.assign({lines:L,b},BL?{blocked:BL}:{});
  async function runOp(op){
    /* 11-02 망령 「고유나 포텐셜로 미래예지를 걸면?」: 「상태 미래예지 …」처럼 상태로만 적어도 예고 공격으로 — 상태만 걸면 다음 턴 끝에 「해제」만 뜨고 대미지가 없었다 */
    if(op.k==='state'&&!op.remove&&FUTURE.includes(stEn(op.state)||op.state))op=Object.assign({},op,{k:'future',state:stEn(op.state)||op.state,tgt:op.tgt||'enemy1'});
    switch(op.k){
     case 'none':break;case 'sk':break;case 'tsel':break;   /* 대상 지정 표시 (웹툴 지시 입력이 읽는다) */
     case 'confirm':{if(ctx.force){L.push(`(강제 발동 — 확인 「${op.q}」 건너뜀)`);break}const ok=ctx.confirm?await ctx.confirm(op.q):true;if(!ok){L.push(`「${name}」 조건을 만족하지 않아 발동하지 않았다 (${op.q})`);stop=true}break}
     case 'cond':{/* 11-09 망령 「혹시 모를 에러나 몇몇 효과를 대비해 강제로 발동도」: ctx.force 면 조건을 보지 않고 넘어간다 */if(ctx.force){L.push(`(강제 발동 — 「${(unparse([op])[0]||'조건')}」 건너뜀)`);break}let ok=true;if(op.c==='ally_fainted')ok=Object.values(b.mons||{}).some(m=>teamOf(b,m)===teamOf(b,self)&&m.id!==self.id&&m.hp.cur<=0);
       else if(op.c==='self_state'){ok=hasSt(self,op.st);if(!ok){L.push(`「${name}」 ${self.name}이(가) 「${stKo(op.st)}」 상태가 아니라 발동하지 않았다`);stop=true;break}}
       else if(op.c==='foe_type'){/* 11-04 감우 (망령 「높음 두 개 개선」 — 에리식톤 『폭식죄의 요살』 「적진에 「타입 : 풀, 페어리」가 있을 때」): 필드에 나와 있는 상대 중 그 타입이 하나라도 */const want=(op.types||[]).map(String);ok=Object.values(b.mons||{}).some(m=>m&&m.entry&&m.hp&&m.hp.cur>0&&teamOf(b,m)!==teamOf(b,self)&&(m.types||[]).some(t=>want.includes(t)));if(!ok){L.push(`「${name}」 적진에 「${want.map(t=>TYPE_KO[t]||t).join(' · ')}」 타입이 없어 발동하지 않았다`);stop=true}break}
       else if(op.c==='on_hit'){/* 11-08: 웹툴이 맞은 대상 정보(ctx.hit)를 줄 때만 본다 — 카드 「발동」으로 손으로 쓰면 그대로 이어 간다 */if(ctx.hit&&!hitOk(op,ctx.hit)){L.push(`「${name}」 명중 조건(${hitDesc(op)||'명중'})이 맞지 않아 발동하지 않았다`);stop=true}break}
       else if(op.c==='hazard'){const HA=['압정뿌리기','독압정','지뢰원','끈적끈적네트','기뢰'];const sd=op.foe?(self.side==='left'?'right':'left'):self.side;const O=(((b.field||{}).objects||{})[sd])||{};const hit=(op.v||[]).filter(k=>+O[k]>0&&(op.foe||((!HA.includes(k)||groundedX(self))&&!holds(self,'통굽부츠')&&!(k==='끈적끈적네트'&&nodropHit(self,'speed')))));   /* 자진: 땅 위 전용 설치기는 땅 위 · 통굽부츠면 아님 · 끈적끈적네트는 스피드가 실제로 내려갈 때(감소 무시가 없을 때)만 */if(!hit.length){L.push(`「${name}」 ${op.foe?'적진':'자진'}에 「${(op.v||[]).join(' · ')}」${op.foe?'':'(땅 위)'} 조건이 맞지 않아 발동하지 않았다`);stop=true}break}
       else if(/^(ally|pt_any|pt_all|foe|self)_(type|egg|item)$/.test(op.c)&&op.c!=='self_type'){const isT=/_type$/.test(op.c),isI=/_item$/.test(op.c);const want=isT?(op.types||[]):isI?(op.items||[]):(op.eggs||[]);const itHas=m=>{const ns=itemNames(m);return want.some(w=>/^(빈손|없음)$/.test(w)?!ns.length:ns.some(n=>n===w||n.includes(w)||(w==='나무열매'&&/열매$/.test(n))||(w==='쥬얼'&&/쥬얼$/.test(n))))};const has=m=>isT?typesOf(m).some(t=>want.includes(t)):isI?itHas(m):(m.egg||[]).some(g=>want.includes(g));const me=teamOf(b,self);const live=m=>m&&m.entry&&m.hp&&m.hp.cur>0;
        const pool=op.c.startsWith('ally')?Object.values(b.mons||{}).filter(m=>live(m)&&m.id!==self.id&&teamOf(b,m)===me):op.c.startsWith('foe')?Object.values(b.mons||{}).filter(m=>live(m)&&teamOf(b,m)!==me):op.c.startsWith('pt')?Object.values(b.mons||{}).filter(m=>m&&m.tid===self.tid):[self];
        const ok2=op.c.startsWith('pt_all')?pool.length>0&&pool.every(has):pool.some(has);const lab=want.map(t=>isT?(TYPE_KO[t]||t):t).join(' · ');
        if(!ok2){const who={ally:'필드 위 아군에',pt_any:'소지에',pt_all:'소지 전원이 모두',foe:'적진에',self:self.name+'에게'}[op.c.replace(/_(type|egg|item)$/,'')];const kd=isT?'타입':isI?'소지품':'알그룹';L.push(`「${name}」 ${who} 「${lab}」 ${kd}${op.c.startsWith('pt_all')?'은 아니라':'이 없어'} 발동하지 않았다`);stop=true}break}
       else if(op.c==='self_type'){const want=op.types||[];if(!typesOf(self).some(t=>want.includes(t))){L.push(`「${name}」 ${self.name}이(가) 「${want.map(t=>TYPE_KO[t]||t).join(' · ')}」 타입이 아니라 발동하지 않았다`);stop=true}break}
       else if(op.c==='used_item'){const u=ctx.used;if(u){const nm=String(u.name||u||'');const okU=(op.v||[]).some(v=>nm.includes(v)||(v==='나무열매'&&/열매$/.test(nm))||String(u.cat||'')===v);if(!okU){L.push(`「${name}」 쓴 소지품(「${nm}」)이 「${(op.v||[]).join(' · ')}」이(가) 아니라 발동하지 않았다`);stop=true}}break}
       else if(op.c==='hp_le')ok=self.hp.cur<=frac(self.hp.max,op.frac);if(!ok){L.push(`「${name}」 조건(${op.c==='ally_fainted'?'빈사 상태인 아군':'HP '+op.frac+' 이하'})을 만족하지 않아 발동하지 않았다`);stop=true}break}
     case 'choice':{let idx=[0];if(ctx.choose)idx=await ctx.choose(op.opts.map(o=>o.label),!!(op.multi||op.opts.some(o=>o.multi)));if(!idx||!idx.length){stop=true;break}
       for(const i of idx){const o=op.opts[i];if(!o)continue;const pl=timing(o.label).percent;const ch=ctx.noRoll||lineChance(o.ops)?0:(chanceOf(o.label)||(pl?percentOf(pl):0));if(ch&&(ch<100||(self&&self.fx&&(self.fx.chance||[]).length))){const rr=rollP(self,ch,ctx);if(!rr.ok){L.push(`▶ ${o.label} — ${rr.p}% 판정 실패 (${rr.r}/${rr.p})${rr.adj}`);continue}L.push(`▶ ${o.label} — ${rr.p}% 판정 성공 (${rr.r}/${rr.p})${rr.adj}`)}else L.push(`▶ ${o.label}`);const r=await run(o.ops,ctx);L.push(...r.lines)}break}
     case 'rank':case 'mult':{const ts=await targets(b,self,op.tgt,ctx);for(const m of ts){let o2=op;if(op.rnd){/* 무작위 능력치 (10-23 망령): 고를 능력 중 n개를 무작위로 */const pool=(op.rnd.pool||'5')==='7'?['attack','defense','specialattack','specialdefense','speed','accuracy','evasion']:['attack','defense','specialattack','specialdefense','speed'];const pk=[];const pp=pool.slice();for(let i=0;i<Math.min(+op.rnd.n||1,pp.length);i++)pk.push(pp.splice(Math.floor(Math.random()*pp.length),1)[0]);const st=Object.assign({},op.stats||{});for(const k of pk)st[k]=op.rnd.v;o2=Object.assign({},op,{stats:st});L.push(`🎲 무작위 → ${pk.map(k=>STAT_KO[k]).join(' · ')}`)}if(op.picks&&op.picks.length){let ref=m;if(op.from==='front'){const fr=(await targets(b,self,'front',ctx))[0];if(!fr){L.push(`${self.name} 「정면」에 상대가 없다 — 능력치를 고를 수 없다`);continue}ref=fr}const st=Object.assign({},o2.stats||{});for(const p of op.picks){const k=pickStat(ref,p.lo);const v=k==='speed'&&p.spd!=null?p.spd:p.v;st[k]=st[k]==null?v:(op.k==='rank'?st[k]+v:st[k]*v);L.push(`${ref===m?m.name:ref.name+' 기준'} 가장 ${p.lo?'낮은':'높은'} 능력치 → 「${STAT_KO[k]}」`)}o2=Object.assign({},o2,{stats:st})}L.push(...applyStats(m,o2,self,name))}break}
     case 'reset':{const ts=await targets(b,self,op.tgt||'self',ctx);for(const m of ts){if(op.what!=='mult'){m.rank={};delete m.tempRank}if(op.what!=='rank'){m.mod={};delete m.tempMod;if(m.fx)m.fx.mults=[]}L.push(`${m.name} ${op.what==='rank'?'랭크':op.what==='mult'?'배율':'랭크·배율'} 초기화`)}break}
     case 'boost':case 'guard':case 'eva':{const ts=await targets(b,self,op.tgt,ctx);for(const m of ts){const F=fx(m);const key0=name+' ← '+self.name;
       /* 11-07 망령 「하이 블로커 ② 가 중첩 패치로 사라졌다」: 같은 효과 안의 상시 줄(① 방호수세 ×0.75)과 이번 턴 줄(② 등장 ×0.6667 → 합쳐 0.5)이 같은 열쇠라 ② 가 ① 을 덮거나(그냥) ① 의 값으로 중첩됐다(0.75² = 0.563). 이번 턴 · N턴 줄은 열쇠를 따로 둔다 */
       const key=key0+(op.ed?' (견딤)':'')+(op.df?' (미룸)':'')+(op.turn?' (이번 턴)':op.tl>0?' ('+op.tl+'턴)':'');if(op.remove){F.mods=F.mods.filter(e=>{const k=String(e.key||'');return (e.kind&&e.kind!==op.k)||!(k===key0||(k.startsWith(key0+' (')&&!k.endsWith(' (다음 기술)')))});L.push(`${m.name} 「${name}」 ${op.k==='boost'?'위력 강화':op.k==='eva'?'회피 강화':'위력 완화'} 해제`);continue}
       const e={key,name,kind:op.k,v:+op.v||1,types:op.types||[],cat:op.cat||'all',eff:op.eff||'all',rng:op.rng||'all',uses:op.uses==null?-1:+op.uses,turn:op.turn?(+b.turn||0):-1,until:op.tl>0?(+b.turn||0)+op.tl-1:-1,ro:op.ro||[],st:op.st||'',tg:op.tg||[],sb:op.sb||'',pmin:+op.pmin||0,pmax:+op.pmax||0,cg:+op.cg||0,cr:+op.cr||0,cx:op.cx||'',eg:op.eg||'',ed:op.ed?1:0,df:op.df?1:0,hf:op.hf?1:0,mv:op.mv||[],ft:op.ft||[],acc:+op.acc||0,src:self.name};
       {const old=STK>1&&F.mods.find(x=>x.key===key&&(x.kind||e.kind)===e.kind);if(old){const n=Math.min(STK,(+old.stack||1)+1);e.v0=+old.v0||+old.v||1;e.stack=n;e.v=Math.round(Math.pow(e.v0,n)*1000)/1000}else if(STK>1){e.v0=e.v;e.stack=1}}
       /* 11-07 망령 「타이트엔드 위력 1.25배가 없다」: ① 위력 강화와 ② 완화가 같은 열쇠(이름 ← 포켓몬)라 ② 가 ① 을 지웠다 → 같은 종류(위력 · 완화 · 회피)끼리만 바꾼다 */
       F.mods=F.mods.filter(x=>x.key!==key||(x.kind&&x.kind!==e.kind));F.mods.push(e);L.push(`${m.name} ${modDesc(e)}${e.stack?` (중첩 ${e.stack}/${STK})`:''}`)}break}
     case 'state':{const en=stEn(op.state)||op.state;const ts=await targets(b,self,op.tgt,ctx);for(const m of ts)L.push(setState(m,en,op.count,op.forced,self,name));break}
     case 'statefx':{const en=stEn(op.state)||op.state;let ts=await targets(b,self,op.tgt,ctx);if(op.self)ts=[self];if(op.pick==='one'&&ts.length>1)ts=[ts[Math.floor(Math.random()*ts.length)]];
       for(const m of ts){const rr=rollP(self,+op.chance||100,ctx);if(rr.ok)L.push(setState(m,en,-1,0,self,name)+` (${rr.r}/${rr.p})${rr.adj}`);else L.push(`${m.name} 「${stKo(en)}」 실패 (${rr.r}/${rr.p})${rr.adj}`)}break}
     case 'cure':{let ts=await targets(b,self,op.tgt,ctx);if(op.self)ts=[self];const list=op.states==='negative'||!op.states?NEG:stWide(op.states);
       for(const m of ts){if(op.chance&&+op.chance<100){const rr=rollP(self,+op.chance,ctx);if(!rr.ok){L.push(`${m.name} 치유 실패 (${rr.r}/${rr.p})${rr.adj}`);continue}}
        const cured=[];for(const k of list)if((m.states||{})[k]){delete m.states[k];cured.push(stKo(k))}const abT=abSync(m);/* 10-24 망령: 부가 치유(열탕 · 화염방사의 「얼음」 치유 …)는 걸린 게 없으면 줄을 남기지 않는다 */if(cured.length)L.push(`${m.name} 「${cured.join('」「')}」 해제`);else if(list===NEG)L.push(`${m.name} 해제할 상태가 없다`);if(abT)L.push(abT)}break}
     case 'heal':{const ts=await targets(b,self,op.tgt||'self',ctx);for(const m of ts){if((m.states||{}).HealBlock){L.push(`${m.name} 「회복봉인」이라 회복하지 못함`);continue}if(op.ytype&&!typesOf(m).includes(op.ytype)){L.push(`${m.name} ${TYPE_KO[op.ytype]||op.ytype} 타입이 아니라 회복 없음`);continue}
       const v=op.value==='full'?m.hp.max-m.hp.cur:frac(m.hp.max,op.value);const h=Math.min(v,m.hp.max-m.hp.cur);m.hp.latest=m.hp.cur;m.hp.cur+=h;L.push(`${m.name} 「${name}」 회복 +${h} (HP ${m.hp.cur}/${m.hp.max})`)}break}
     case 'dmg':{const ts=await targets(b,self,op.tgt||'enemy1',ctx);for(const m of ts){if(op.st&&!hasSt(m,op.st)){L.push(`${m.name} 「${stKo(op.st)}」 상태가 아니라 대미지 없음`);continue}if(op.xtype&&typesOf(m).includes(op.xtype)){L.push(`${m.name} ${TYPE_KO[op.xtype]||op.xtype} 타입이라 대미지 없음`);continue}
       let v=0;if(op.basis==='cur')v=frac(m.hp.cur,op.value);else if(op.basis==='type'){const ats=(op.atypes&&op.atypes.length?op.atypes:[op.atype]).filter(Boolean);/* 복합 타입 (10-23 망령): 타입마다 상성을 곱한다 */const mul=ats.reduce((a,t)=>a*B().effectiveness([t],m,{}).value,1);if(mul<=0){L.push(`${m.name} ${ats.map(t=>TYPE_KO[t]||t).join('·')} 타입 효과 없음`);continue}v=Math.max(1,Math.floor(frac(m.hp.max,op.value)*mul))}else if(op.basis==='last')v=frac((self.lastDealt||{}).total||0,op.value);else v=frac(m.hp.max,op.value);
       if(noind(m,'')){L.push(`${m.name} 비례 대미지를 받지 않는다 (${noindName(m,'')})`);continue}const floor=(op.nofaint||noind(m,'noko'))?1:0;const d=Math.max(0,Math.min(v,m.hp.cur-floor));m.hp.latest=m.hp.cur;m.hp.cur-=d;L.push(`${m.name} 「${name}」 대미지 −${d} (HP ${m.hp.cur}/${m.hp.max})${m.hp.cur<=0?' 빈사!':''}`);if(m.hp.cur<=0)m.entry=''}break}
     case 'weather':{const f=field(b);/* 10-26: 「특성 : X」로 전개하는 「날씨」가 「날씨 : Y」가 된다 (폭풍요의 조작 등) */{const ov=[...((self&&self.pots)||[]),...(self&&self.excl?[self.excl]:[]),...((self&&self.exclX)||[])].map(p=>String((p&&p.eff)||'').match(/「특성\s*:\s*([^」]+)」(?:로|으로)\s*전개하는\s*「날씨」가\s*「날씨\s*:\s*([^」]+)」가\s*된다/)).find(r=>r&&self&&r[1].trim()===String(self.ability||'').trim());if(ov&&op.w)op=Object.assign({},op,{w:ov[2].trim()})}if(op.w==='random'){const W=['맑음','비','모래바람','눈','짙은안개','밤','별하늘'];op=Object.assign({},op,{w:W[Math.floor(Math.random()*W.length)]})}if(op.w&&(f.weather||{}).type===op.w){L.push(`날씨 「${op.w}」 — 이미 같은 날씨라 불발`);break}/* 11-05 망령: 같은 날씨 · 필드 · 룸 · 필드상태가 이미 전개되어 있으면 덮어써 턴을 새로 세지 않고 불발 */const ext=op.w&&+op.count<1000?itemExt(self,op.w):'';const sx=op.w&&+op.count<1000?spExt(self,op.w):{n:0,by:[]};f.weather={type:op.w||'',count:op.w?(+op.count||5)+(ext?3:0)+sx.n:0};if(sx.n)L.push(`「${sx.by.join('」「')}」 날씨 지속 +${sx.n}턴`);L.push(op.w?`날씨 「${op.w}」 ${op.count>=1000?'계속':((+op.count||5)+(ext?3:0)+sx.n)+'턴'}${ext?' (「'+ext+'」 +3)':''}`:'날씨 초기화');break}
     case 'terrain':{const f=field(b);if(op.room){if(!op.t){f.rooms={};L.push('룸 초기화')}else if(+((f.rooms||{})[op.t]||0)>0)L.push(`「${op.t}」 — 이미 전개되어 있어 불발`);else{f.rooms[op.t]=+op.count||5;L.push(`「${op.t}」 ${op.count>=1000?'계속':op.count+'턴'}`)}}else if(op.t&&(f.terrain||{}).type===op.t)L.push(`「${op.t}」 — 이미 같은 필드라 불발`);else{const ext=op.t&&+op.count<1000?itemExt(self,'필드'):'';const sx=op.t&&+op.count<1000?spExt(self,op.t):{n:0,by:[]};f.terrain={type:op.t||'',count:op.t?(+op.count||5)+(ext?3:0)+sx.n:0};if(sx.n)L.push(`「${sx.by.join('」「')}」 필드 지속 +${sx.n}턴`);L.push(op.t?`「${op.t}」 ${op.count>=1000?'계속':((+op.count||5)+(ext?3:0)+sx.n)+'턴'}${ext?' (「'+ext+'」 +3)':''}`:'필드 초기화')}break}
     case 'etc':{const f=field(b);if(!op.e){f.etc={};L.push('필드의 상태 초기화')}else if(+((f.etc||{})[op.e]||0)>0)L.push(`「${op.e}」 — 이미 전개되어 있어 불발`);else{f.etc[op.e]=+op.count||5;L.push(`「${op.e}」 ${op.count>=1000?'계속':op.count+'턴'}`)}break}
     case 'clearobj':{const f=field(b);const sides=op.side==='both'?['left','right']:[op.side==='enemy'?(self.side==='left'?'right':'left'):self.side];const G=OBJ_GROUP[op.what||'hazard']||[];
       for(const sd of sides){const o=f.objects[sd]=f.objects[sd]||{};const gone=Object.keys(o).filter(k=>+o[k]>0&&(op.what==='all'||G.includes(k)));for(const k of gone)delete o[k];L.push(`${sd==='left'?'좌측':'우측'} ${gone.length?'「'+gone.join('」「')+'」 철거':(({hazard:'설치기',wall:'장벽',all:'설치물'})[op.what||'hazard']||'설치물')+' 없음'}`)}break}
     case 'object':{const f=field(b);const side=op.side==='enemy'?(self.side==='left'?'right':'left'):self.side;f.objects[side]=f.objects[side]||{};const cur=+f.objects[side][op.o]||0;
       if(op.o==='압정뿌리기'||op.o==='독압정'){const mx=op.o==='압정뿌리기'?3:2;f.objects[side][op.o]=Math.min(mx,cur+1);L.push(`${side==='left'?'좌측':'우측'} 「${op.o}」 ${f.objects[side][op.o]}겹`)}else{const ext=+op.count<1000&&side===self.side?itemExt(self,op.o):'';const sx=+op.count<1000&&side===self.side?spExt(self,op.o):{n:0,by:[]};f.objects[side][op.o]=(+op.count||5)+(ext?3:0)+sx.n;if(sx.n)L.push(`「${sx.by.join('」「')}」 「${op.o}」 지속 +${sx.n}턴`);L.push(`${side==='left'?'좌측':'우측'} 「${op.o}」 ${op.count>=1000?'계속':((+op.count||5)+(ext?3:0)+sx.n)+'턴'}${ext?' (「'+ext+'」 +3)':''}`)}break}
     case 'type':{const ts=await targets(b,self,op.tgt||'self',ctx);for(const m of ts){if(op.mode==='reset'){if(m.typesOrig){m.types=m.typesOrig;delete m.typesOrig}m.typesKo=m.types.map(t=>TYPE_KO[t]||t);delete m.typeUntil;L.push(`${m.name} 타입 원래대로`);continue}{const pr=m.id!==self.id&&spOf(m,'protect').find(e=>(e.what||[]).includes('type'));if(pr){L.push(`${m.name} 「${pr.name}」 — 타입이 바뀌지 않는다`);continue}}   /* 11-08 망령 「일단 다 해」 51-2 ①: 타입가드 = 「보호 타입」 — 자신 이외로는 타입이 바뀌지 않는다 */if(m.teraActive&&m.teraEn&&m.teraEn!=='-'){L.push(`${m.name} 「테라스탈」 상태라 타입이 바뀌지 않는다`);continue}   /* 11-02 망령 (상태 「테라스탈」: 다른 효과로 타입이 바뀌지 않는다) */m.typesOrig=m.typesOrig||m.types.slice();m.typesBy=name;
       const add=(op.types||[]).map(t=>KO_TYPE[t]||t);if(op.mode==='set')m.types=add;else m.types=[...new Set([...m.types.filter(t=>t!=='-'),...add])];m.typesKo=m.types.map(t=>TYPE_KO[t]||t);   /* 11-06 감우: 한글 타입도 같이 — 미사그 A-1 판정이 옛 typesKo 를 보고 「아직 지정 타입」으로 읽던 것 */if(op.turns>0)m.typeUntil=(+b.turn||0)+op.turns-1;else delete m.typeUntil;L.push(`${m.name} 타입 ${op.mode==='set'?'→':'+'} ${add.map(t=>TYPE_KO[t]||t).join('/')}${op.turns>0?' ('+op.turns+'턴)':''}`)}break}
     case 'item':{const I=window.OM_ITEMS;if(!I||!I.itemOp){L.push(`소지품 ${({rob:'파괴(약탈)',break:'파괴',breakall:'모두 파괴',steal:'강탈',give:'건네주기',swap:'맞바꾸기',set:'지정 '+(op.name||''),add:'추가 '+(op.name||'')})[op.mode]||''} — 배틀 웹툴에서 처리`);break}const ts=await targets(b,self,op.tgt||'enemy1',ctx);const r=I.itemOp(b,self,ts,op,name);L.push(...(r.length?r:[`『${name}』 소지품 — 바뀐 것 없음`]));break}
     case 'trait':{const ts=await targets(b,self,op.tgt||'enemy1',ctx);for(const m of ts){if(op.mode==='reset'){resetAb(m);delete m.abUntil;L.push(`${m.name} 특성 원래대로`);continue}{const pr=m.id!==self.id&&spOf(m,'protect').find(e=>(e.what||['trait']).includes('trait'));if(pr){L.push(`${m.name} 「${pr.name}」 — 특성이 바뀌지 않는다`);continue}}setAb(m,op.tn,name);if(op.turns>0)m.abUntil=(+b.turn||0)+op.turns-1;else delete m.abUntil;L.push(`${m.name} 특성 → 「${op.tn}」${op.turns>0?' ('+op.turns+'턴)':''}`)}break}
     case 'future':{const en=stEn(op.state)||'FutureSight';const mv=op.mv||stKo(en);const md=(DB().moves||{})[mv]||{};const ts=await targets(b,self,op.tgt||'enemy1',ctx);
      const ak=/공격/.test(String(md.atk||''))&&!/특공/.test(String(md.atk||''))||/「공격」/.test(((stDB()[en]||{}).desc||[])[0]||'')?'attack':'specialattack';const SI={attack:1,specialattack:3};
      for(const m of ts){const st=m.states||{};const had=FUTURE.find(k=>st[k]);if(had){L.push(`${m.name} 이미 「${stKo(had)}」 예고가 걸려 있어 「${mv}」 실패`);continue}
       const r=setState(m,en,2,true,self,name);m.futRsv={st:en,mv,by:self.name,byId:self.id,area:self.side+'_'+self.entry,A:+((self.stats||[])[SI[ak]]||0),akey:ak,lv:+self.lv||50,pw:+op.pow||+md.pow||120,cat:ak==='attack'?'물리':'특수',typeEn:md.typeEn||'',atkTypes:typesOf(self),turn:+b.turn||0};
       L.push(`${m.name} 「${mv}」 예고 — 다음 턴 종료 때 ${self.name}의 ${ak==='attack'?'공격':'특공'} ${m.futRsv.A}로 덮친다 (교대하면 사라짐)`)}break}
     case 'transform':{if(op.mode==='reset'){L.push(untransform(self)||`${self.name} 변신 상태가 아니다`);break}const ts=await targets(b,self,op.tgt||'enemy1',ctx);const t=ts[0];if(!t||t.id===self.id){L.push('변신할 대상이 없다');break}
      if(self.xform){L.push(`${self.name} 이미 변신해 있다`);break}if(t.xform){L.push(`${t.name}은(는) 변신한 포켓몬이라 변신할 수 없다`);break}
      const keep=JSON.parse(JSON.stringify({types:self.types||[],ability:self.ability||'',abilityEff:self.abilityEff||'',stats:self.stats||[],rank:self.rank||{},moves:self.moves||[],image:self.image||''}));self.xform=Object.assign(keep,{by:t.name,name})
      if(self.ability)removeByName(self,self.ability);self.types=[...(t.types||[])];self.ability=t.ability||'';self.abilityEff=t.abilityEff||'';self.stats=[(self.stats||[])[0]].concat((t.stats||[]).slice(1));self.rank=JSON.parse(JSON.stringify(t.rank||{}));
      self.moves=JSON.parse(JSON.stringify(t.moves||[]));if(!op.keepImg&&t.image)self.image=t.image;L.push(`${self.name}은(는) ${t.name}(으)로 변신했다! 타입·특성·능력치(HP 빼고)·랭크·기술을 따라 했다`);break}
     case 'noind':{const ts=await targets(b,self,op.tgt||'self',ctx);for(const m of ts){const F=fx(m);const key=name+' ← '+self.name;if(op.mode==='off'){F.noind=F.noind.filter(e=>e.key!==key)}else if(op.mode==='clear'){F.noind=F.noind.filter(e=>e.kind!==(op.kind||''))}else{F.noind=F.noind.filter(e=>e.key!==key);F.noind.push({key,name,kind:op.kind||'',until:op.turns>0?(+b.turn||0)+op.turns-1:-1})}L.push(`${m.name} ${op.mode==='on'?'':'해제 — '}${NOIND_KO[op.kind||'']}`)}break}
     case 'prio':{const ts=await targets(b,self,op.tgt||'self',ctx);for(const m of ts){const F=fx(m);const key=name+' ← '+self.name;if(op.mode==='off'){F.prio=F.prio.filter(e=>e.key!==key)}else{const po=STK>1&&F.prio.find(e=>e.key===key);const pn=po?Math.min(STK,(+po.stack||1)+1):1;F.prio=F.prio.filter(e=>e.key!==key);F.prio.push({key,name,stack:STK>1?pn:undefined,v:(+op.v||0)*(STK>1&&(op.mode||'add')==='add'?pn:1),mode:op.mode||'add',cat:op.cat||'all',type:op.type||'',tag:op.tag||'',turn:op.dur==='turn'?(+b.turn||0):-1})}L.push(`${m.name} 우선도 ${op.mode==='set'?'= ':(op.v>0?'+':'')}${op.v} (${op.type?(TYPE_KO[op.type]||op.type)+' 타입 ':''}${op.cat&&op.cat!=='all'?op.cat+' ':''}${op.tag?'「'+op.tag+'」 ':''}기술${op.dur==='turn'?' · 이번 턴':''})`)}break}
     case 'immune':{const ts=await targets(b,self,op.tgt||'self',ctx);for(const m of ts){const F=fx(m);const key=name+' ← '+self.name;F.immune=F.immune.filter(e=>e.key!==key);if(op.mode!=='off')F.immune.push({key,name,states:op.states||[]});L.push(`${m.name} 「${(op.states||[]).map(stKo).join('」「')}」 면역${op.mode==='off'?' 해제':''}`)}break}
     case 'nodrop':{const ts=await targets(b,self,op.tgt||'self',ctx);for(const m of ts){const F=fx(m);const key=name+' ← '+self.name;F.nodrop=F.nodrop.filter(e=>e.key!==key);if(op.mode!=='off')F.nodrop.push(Object.assign({key,name,st:op.st||'',until:op.turns>0?(+b.turn||0)+op.turns-1:-1,ytype:op.ytype||'',ro:op.ro||[]},op.mod?{mod:1}:{}));L.push(`${m.name} ${op.st?STAT_KO[op.st]+' ':'능력 '}${op.mod?'감소 · 저하':'감소'} 무시${op.mode==='off'?' 해제':''}`)}break}
     case 'ignoreup':{const F=fx(self);const pv=F.ignoreUp;let dir=op.dir||'atk',scope=op.scope||'both';/* 같은 효과의 두 번째 줄(받음 + 공격시)은 덮어쓰지 않고 합친다 */if(op.on&&pv&&pv.name===name&&pv.dir!==dir){dir='both';scope=scope==='both'||pv.scope==='both'?'both':[...new Set((pv.scope+','+scope).split(','))].join(',')}const dn=op.dn||(pv&&pv.name===name&&pv.dn);const nu=op.on?Object.assign({dir,scope,ro:op.ro||[],name},op.all||(pv&&pv.name===name&&pv.all)?{all:1}:dn?{dn:1}:{},op.lv?{lv:op.lv}:(pv&&pv.name===name&&pv.lv?{lv:pv.lv}:{})):null;F.ignoreUp=nu;L.push(`${self.name} ${dir==='both'?'주고받을 때 상대의':dir==='recv'?'받을 때 상대의':'공격할 때 상대의'} ${scopeKo(op.scope)} ${iuLabel(nu||Object.assign({},op,{dn:op.dn,all:op.all}))}${op.on?'':' 해제'}`);break}
     case 'float':{const ts=await targets(b,self,op.tgt||'self',ctx);for(const m of ts){const F=fx(m);F.float=op.mode==='off'?null:{until:op.turns>0?(+b.turn||0)+op.turns-1:-1,name};L.push(`${m.name} 하늘 위${op.mode==='off'?' 해제':''}`)}break}
     case 'role':{const F=fx(self);if(op.mode==='clear')F.roles=[];else if(op.mode==='remove')F.roles=F.roles.filter(r=>!(op.roles||[]).includes(r));else F.roles=[...new Set([...F.roles,...(op.roles||[])])];F.rolesBy=F.roles.length?name:'';L.push(`${self.name} 역할 취급: ${F.roles.join('·')||'없음'}`);break}
     case 'pursuit':{if(op.immune){const ts=await targets(b,self,op.tgt||'self',ctx);for(const m of ts){m.flags=m.flags||{};m.flags.pursuitImmune=!!op.on;if(op.on)m.flags.pursuitImmuneBy=name;else delete m.flags.pursuitImmuneBy;L.push(`${m.name} 이번 턴 상대의 「따라가때리기」를 받지 않는다${op.on?'':' — 해제'}`)}break}self.flags=self.flags||{};self.flags.pursuit=!!op.on;if(op.on)self.flags.pursuitBy=name;else delete self.flags.pursuitBy;L.push(`${self.name} 다음 기술에 「따라가때리기」${op.on?'':' 해제'}`);break}
     /* 11-07 지마 「포텐셜로 건 효과 끄기 — 에이스가 무효화될 일이 있다」: 효과해제 [대상] [포텐셜|특성|소지품|전부|이름:X] — 그 출처가 건 fx(배율 · 위력 · 무시 · 우선도 · 역할 …)를 뗀다 */
     case 'fxoff':{const ts=await targets(b,self,op.tgt||'self',ctx);const nn=x=>String(x||'').replace(/[『』「」]/g,'').trim();
      for(const m of ts){const F=fx(m);const have=new Set();for(const k of ['mods','noind','prio','immune','nodrop','chance','sp','mults'])for(const e of F[k]||[])if(e&&e.name)have.add(e.name);if(F.ignoreUp&&F.ignoreUp.name)have.add(F.ignoreUp.name);if(F.float&&F.float.name)have.add(F.float.name);if(F.rolesBy)have.add(F.rolesBy);if(m.typesBy)have.add(m.typesBy);if(m.abilityBy)have.add(m.abilityBy);
       const t=(b.trainers||{})[m.tid]||{};const potN=new Set([...(m.pots||[]).map(p=>p&&p.name),...(m.excl?[m.excl.name]:[]),...(m.exclX||[]).map(x=>x&&x.name),...(t.unique||[]).map(u=>u&&u.name)].filter(Boolean).map(nn));
       const itN=new Set([m.item,...(m.items2||[]).map(x=>x&&x.item)].filter(Boolean).map(nn));const pick=n=>{const k=nn(n);if(op.name)return k===nn(op.name);if(op.what==='pot')return potN.has(k);if(op.what==='trait')return k===nn(m.ability);if(op.what==='item')return itN.has(k);return true};
       const gone=[];for(const n of have)if(pick(n)&&removeByName(m,n))gone.push(n);L.push(gone.length?`${m.name} 「${gone.join('」「')}」 효과 해제`:`${m.name} 해제할 ${({pot:'포텐셜',trait:'특성',item:'소지품'})[op.what]||''} 효과 없음`)}break}
     case 'resetstates':{const ts=await targets(b,self,op.tgt||'self',ctx);for(const m of ts){const list=op.group==='condition_abnormal'?ABN:NEG;const c=[];for(const k of list)if((m.states||{})[k]){delete m.states[k];c.push(stKo(k))}L.push(`${m.name} ${c.length?'「'+c.join('」「')+'」 해제':'해제할 상태 없음'}`)}break}
     case 'raid':{self.raid=Object.assign({},self.raid||{},{segments:+op.x||(self.raid||{}).segments||0,floor:op.floor,cure:op.cure,cstat:op.cstat,rup:op.rup});L.push(`${self.name} 레이드 배틀 설정 (구간 ${self.raid.segments||'?'})`);break}
     case 'dex':{const ts=await targets(b,self,'enemy1',ctx);const tg=ts[0];L.push(`「${name}」 데이터 해석${tg?' → '+tg.name:''}`);if(tg&&window.OM_DEX_UI&&ctx.viewer!==undefined)setTimeout(()=>window.OM_DEX_UI.analyze(ctx.viewer||self.tid,tg.id,{forced:true,free:true}),400);break}
     case 'sp':{const ts=op.tgt&&op.tgt!=='self'?await targets(b,self,op.tgt,ctx):[self];for(const m of ts){const F=fx(m);const key=name+'|'+op.sp+'|'+(op.mv||op.to||(op.types||[]).join('')||'');F.sp=F.sp.filter(e=>e.key!==key);const e=Object.assign({},op,{key,name});delete e.k;delete e.tgt;F.sp.push(e);L.push(`${m.name} 「${name}」 ${spDesc(e)}`)}break}
     case 'countdown':{L.push(...countdown(b,Math.max(1,+op.n||1),self,name));break}
     case 'forceswitch':{const ts=await targets(b,self,op.tgt||'enemy1',ctx);if(!ts.length){L.push(`「${name}」 강제 교대할 대상이 없다`);break}for(const t of ts){if(ctx.forceSwitch){const r=await ctx.forceSwitch(t,name);if(r)L.push(r)}else L.push(`${t.name} 「${name}」 강제 교대 — 「퇴장(특수) → 강제 교대」로`)}break}
     case 'freeswitch':{if(ctx.freeSwitch){const r=await ctx.freeSwitch(self,name);if(r)L.push(r)}else L.push(`${self.name} 임의 교대할 수 있다 — 교대 창에서`);break}
     case 'usemove':{L.push(`${self.name} 기술 「${op.mv}」를 내보낸다`+(op.top&&op.top.length?` (이때 「${op.top.map(k=>STAT_KO[k]||k).join('·')}」 가장 높은 종족치와 같은 랭크)`:''));if(ctx.useMove)ctx.useMove(self,op.mv,name,{top:op.top||[]});break}
     case 'statadd':if(!SHEET_ONLY)break;L.push(`${self.name} 실수치 ${op.stats.join('·')} ${op.copy?'= '+op.copy:(op.n>0?'+':'')+op.n} (제작기 시트의 실수치에 이미 들어가 있다)`);break;
     case 'statset':{const SI={공격:1,방어:2,특공:3,특방:4,스피드:5};const ix=op.stats.map(k=>SI[k]).filter(i=>i!=null);const keep=m=>{if(!Array.isArray(m.stats))return false;if(!m.statsOrig)m.statsOrig=m.stats.slice();return true};const nm=i=>['HP','공격','방어','특공','특방','스피드'][i];
      const ts=await targets(b,self,op.tgt||'self',ctx);
      if(op.mode==='swap'||op.mode==='avg'){for(const m of ts){if(m.id===self.id||!keep(m)||!keep(self))continue;const ch=[];for(const i of ix){const a=+self.stats[i]||0,c=+m.stats[i]||0;if(op.mode==='swap'){self.stats[i]=c;m.stats[i]=a}else{const v=Math.floor((a+c)/2);self.stats[i]=v;m.stats[i]=v}ch.push(`${nm(i)} ${self.name} ${a}→${self.stats[i]} · ${m.name} ${c}→${m.stats[i]}`)}L.push(`실수치 ${op.mode==='swap'?'교환':'평균'} — ${ch.join(' / ')} (교대하면 원래대로)`)}break}
      for(const m of ts){if(!keep(m))continue;if(op.mode==='flip'){const [i,j]=ix;const a=+m.stats[i]||0,c=+m.stats[j]||0;m.stats[i]=c;m.stats[j]=a;L.push(`${m.name} 실수치 ${nm(i)} ↔ ${nm(j)} (${a} ↔ ${c}) · 교대하면 원래대로`);continue}
       if(op.mode==='copy'){const j=SI[op.from];if(j==null)continue;const ch=[];for(const i of ix){if(i===j)continue;const a=+m.stats[i]||0;m.stats[i]=+m.stats[j]||a;ch.push(`${nm(i)} ${a}→${m.stats[i]}`)}L.push(`${m.name} 실수치 ${ch.join(' · ')} (= ${op.from} · 교대하면 원래대로)`);continue}
       const ch=[];for(const i of ix){const a=+m.stats[i]||0;const v=op.mode==='set'?+op.n:op.mode==='mul'?Math.floor(a*(+op.n||1)):a+(+op.n||0);m.stats[i]=Math.max(1,Math.round(v));ch.push(`${nm(i)} ${a}→${m.stats[i]}`)}L.push(`${m.name} 실수치 ${ch.join(' · ')} (교대하면 원래대로)`)}break}
     case 'baseup':if(!SHEET_ONLY)break;L.push(`${self.name} 종족치 ${op.stats.join('·')} ${op.top?'가장 높은 종족치와 같은 랭크':op.max?'범위 최대':(op.n>0?'+':'')+op.n+'랭크'} (제작기 시트의 종족치 · 실수치에 이미 들어가 있다)`);break;
     case 'stmod':L.push(`${self.name} 「${stKo(op.st)}」 사양 ${op.n}/${op.d} (시트에 적힌 값 — 턴 종료 때 자동으로 읽는다)`);break;
     case 'stcount':{/* 상태 턴 조정 (10-23 망령): 걸려 있는 상태의 남은 턴을 늘리거나 줄인다 (계속되는 상태 · 0 이하가 되면 풀린다) */const ts=await targets(b,self,op.tgt||'self',ctx);for(const m of ts){const st=m.states||{};const keys=op.st==='all'?Object.keys(st).filter(k=>st[k]):op.st==='neg'?Object.keys(st).filter(k=>st[k]&&NEG.includes(k)):stWide([op.st]).filter(k=>st[k]);const out=[];
       for(const k of keys){const v=+st[k];if(!(v>0&&v<1000))continue;const nv=op.mode==='set'?+op.v:v+(+op.v||0);if(nv<=0){delete st[k];out.push(`「${stKo(k)}」 해제`)}else{st[k]=Math.min(999,nv);out.push(`「${stKo(k)}」 ${v}→${st[k]}턴`)}}L.push(`${m.name} ${out.join(' · ')||'조정할 상태가 없다'}`)}break}
     case 'chance':{const ts=await targets(b,self,op.tgt||'self',ctx);for(const m of ts){const F=fx(m);const key=name+' ← '+self.name;F.chance=F.chance.filter(e=>e.key!==key);if(op.mode==='off'){L.push(`${m.name} 「${name}」 확률 보정 해제`);continue}
       F.chance.push({key,name,v:+op.v||0,sure:op.sure?1:0,uses:op.uses>0?+op.uses:-1,until:op.turns>0?(+b.turn||0)+op.turns-1:-1});L.push(`${m.name} 「${name}」 ${op.sure?'확률 효과가 반드시 발동':'발동 확률 '+(op.v>0?'+':'')+op.v+'%p'}${op.uses>0?' · '+op.uses+'회':''}${op.turns>0?' · '+op.turns+'턴':''}`)}break}
     case 'next':{const ts=await targets(b,self,op.tgt||'self',ctx);for(const m of ts){const F=fx(m);const key=name+' ← '+self.name+' (다음 기술)';F.mods=F.mods.filter(e=>e.key!==key);F.prio=F.prio.filter(e=>e.key!==key);
       const e={key,name,kind:'boost',v:+op.pw||1,types:[],cat:'all',eff:'all',rng:'all',uses:1,turn:-1,until:-1,ro:[],st:'',tg:[],sb:'',pmin:0,pmax:0,cg:0,cr:+op.cr||0,cx:op.cx||'',eg:'',src:self.name,next:1,sure:op.sure?1:0,uturn:op.uturn?1:0};F.mods.push(e);
       if(op.prio)F.prio.push({key,name,v:+op.prio,mode:'add',cat:'all',type:'',tag:'',turn:-1,next:1});if(op.pursuit){m.flags=m.flags||{};m.flags.pursuit=true;m.flags.pursuitBy=name}
       L.push(`${m.name} 다음 기술에 ${nextDesc(op)}`)}break}
     default:L.push(`(모르는 명령 ${op.k})`)}}}
 function nextTxt(e,m){const pr=m&&m.fx?(m.fx.prio||[]).find(x=>x.next&&x.key===e.key):null;return nextDesc({sure:e.sure,uturn:e.uturn,cr:e.cr,cx:e.cx,pw:e.v,prio:pr?pr.v:0,pursuit:m&&m.flags&&m.flags.pursuit&&m.flags.pursuitBy===e.name})}
 function nextDesc(op){const p=[];if(op.sure)p.push('필중');if(op.uturn)p.push('유턴(쓴 뒤 교대)');if(op.pursuit)p.push('추격');if(op.prio)p.push('우선도 '+(op.prio>0?'+':'')+op.prio);if(op.cr)p.push('급소 +'+op.cr);if(op.cx==='sure')p.push('확정 급소');if(op.pw&&+op.pw!==1)p.push('위력 ×'+op.pw);return p.join(' · ')||'(없음)'}
 /* 확률 굴림 (10-23 망령): 기본 % + 포켓몬의 확률 보정(「확률 +20」 · 「확률 반드시」) + 발동 때 손으로 고친 값(ctx.pSet · ctx.pAdd · ctx.pSure) */
 function rollP(self,base,ctx){ctx=ctx||{};let p=+base||0;const t=curTurn();let adj=0,sure=false;const used=[];
  for(const e of ((self&&self.fx&&self.fx.chance)||[])){if(e.until>=0&&t>e.until)continue;if(e.uses===0)continue;if(e.sure)sure=true;else adj+=+e.v||0;used.push(e)}
  if(ctx.pSet!=null&&ctx.pSet!=='')p=+ctx.pSet;if(ctx.pAdd)adj+=+ctx.pAdd;if(ctx.pSure)sure=true;
  const fin=sure?100:Math.max(0,Math.min(100,p+adj));const r=Math.floor(Math.random()*100)+1;
  for(const e of used)if(e.uses>0){e.uses--}if(self&&self.fx&&self.fx.chance)self.fx.chance=self.fx.chance.filter(e=>e.uses!==0);
  const note=sure?' · 반드시 발동':adj?` · 보정 ${adj>0?'+':''}${adj}%p`:(ctx.pSet!=null&&ctx.pSet!==''?' · 손으로 바꾼 확률':'');return {ok:r<=fin,r,p:fin,adj:note}}
 /* 줄 앞에 확률이 붙은 구문이 있나 (있으면 효과 글 전체 확률은 굴리지 않는다) */
 function lineChance(ops){return (ops||[]).some(o=>o&&(o.p||o.pl||(o.k==='choice'&&(o.opts||[]).some(x=>lineChance(x.ops)))))}
 /* ===== 「필드 위에 있는 한」 (10-23 망령): 그 효과가 바꾼 것을 기억했다가, 쓴 포켓몬이 필드를 떠나면 되돌린다 ===== */
 const HL=['mods','noind','prio','immune','nodrop','mults','chance'];
 function holdSnap(b){const s={mons:{},f:JSON.parse(JSON.stringify(b.field||{}))};for(const id in b.mons||{}){const m=b.mons[id];const F=m.fx||{};s.mons[id]={keys:HL.map(k=>(F[k]||[]).map(e=>e.key)),st:Object.assign({},m.states||{}),rank:Object.assign({},m.rank||{}),iu:F.ignoreUp?F.ignoreUp.name:'',fl:!!F.float,ty:!!m.typesOrig,ab:m.abilityOrig!=null,ro:(F.roles||[]).slice()}}return s}
 function holdDiff(b,self,s,name,uq){const H=self.holds=self.holds||[];const push=x=>H.push(Object.assign({name},uq?{uq:1}:{},x));
  for(const id in b.mons||{}){const m=b.mons[id];const o=s.mons[id];if(!o)continue;const F=m.fx||{};
   HL.forEach((k,i)=>{for(const e of (F[k]||[]))if(!o.keys[i].includes(e.key))push({mid:id,list:k,key:e.key,e:JSON.parse(JSON.stringify(e)),rel:id===self.id?'self':teamOf(b,m)===teamOf(b,self)?'ally':'enemy'})});
   for(const k in m.states||{})if(o.st[k]==null)push({mid:id,st:k});
   const dr={};for(const k in Object.assign({},o.rank,m.rank||{})){const d=(+((m.rank||{})[k])||0)-(+o.rank[k]||0);if(d)dr[k]=d}if(Object.keys(dr).length)push({mid:id,rank:dr});
   if(F.ignoreUp&&F.ignoreUp.name!==o.iu)push({mid:id,iu:F.ignoreUp.name});if(F.float&&!o.fl)push({mid:id,fl:1});if(m.typesOrig&&!o.ty)push({mid:id,ty:1});if(m.abilityOrig!=null&&!o.ab)push({mid:id,ab:1});
   const nr=(F.roles||[]).filter(r=>!o.ro.includes(r));if(nr.length)push({mid:id,ro:nr})}
  const f=b.field||{},g=s.f||{};if(f.weather&&f.weather.type&&f.weather.type!==((g.weather||{}).type))push({fld:'weather',v:f.weather.type});if(f.terrain&&f.terrain.type&&f.terrain.type!==((g.terrain||{}).type))push({fld:'terrain',v:f.terrain.type});
  for(const k in f.rooms||{})if(!(g.rooms||{})[k])push({fld:'rooms',v:k});for(const k in f.etc||{})if(!(g.etc||{})[k])push({fld:'etc',v:k});
  for(const sd of ['left','right'])for(const k in ((f.objects||{})[sd]||{}))if(!(((g.objects||{})[sd]||{})[k]))push({fld:'obj',sd,v:k})}
 /* 10-26 (서서 VS 마리 시험): 「필드 위에 있는 한」 효과(재앙의그릇 · 승리의별 …)는 나중에 들어온 포켓몬에게도 — 등장할 때 필드의 다른 포켓몬이 걸어 둔 효과를 같은 관계(아군/상대)로 옮겨 건다 */
 function reAura(b,nm){const L=[];if(!nm||!nm.entry)return L;for(const x of Object.values(b.mons||{})){if(!x||x.id===nm.id||!x.entry||!alive(x)||!(x.holds||[]).length)continue;const rel=teamOf(b,x)===teamOf(b,nm)?'ally':'enemy';const done=new Set();
   for(const h of x.holds){if(!h.list||!h.e||!h.rel||h.rel==='self'||h.rel!==rel||done.has(h.list+'|'+h.key))continue;done.add(h.list+'|'+h.key);const F=fx(nm);if((F[h.list]||[]).some(e=>e.key===h.key))continue;if(h.uq&&uqHas(nm,h.name,x))continue;const e=JSON.parse(JSON.stringify(h.e));F[h.list].push(e);
    if(h.list==='mults'){nm.mod=nm.mod||{};for(const k in e.stats||{}){nm.mod[k]=Math.round(((+nm.mod[k]||1)*(+e.stats[k]||1))*1000)/1000;if(Math.abs(nm.mod[k]-1)<0.002)delete nm.mod[k]}}
    x.holds.push(Object.assign({},h,{mid:nm.id}));L.push(`${nm.name} 「${h.name}」 ${h.list==='mults'?Object.entries(e.stats||{}).map(([k,v])=>(STAT_KO[k]||k)+' ×'+v).join(' · '):'효과'} — ${x.name}이(가) 필드에 있는 동안`)}}
  /* 「있는한」 기록이 없는 상시 효과(특성 · 포텐셜 이름으로 걸린 것)는 같은 관계의 다른 포켓몬에게 걸린 것을 본떠 건다 — 기술 효과는 옮기지 않는다 */
  for(const x of Object.values(b.mons||{})){if(!x||x.id===nm.id||!x.entry||!alive(x))continue;const srcN=new Set([x.ability,...((x.pots||[]).map(p=>p&&p.name)),...(x.excl?[x.excl.name]:[])].filter(Boolean).map(n=>String(n).replace(/『|』/g,'').trim()));const rel=teamOf(b,x)===teamOf(b,nm)?'ally':'enemy';
   for(const y of Object.values(b.mons||{})){if(!y||y.id===nm.id||y.id===x.id||!y.entry||!alive(y)||!y.fx)continue;if((teamOf(b,x)===teamOf(b,y)?'ally':'enemy')!==rel)continue;
    for(const k of HL)for(const e0 of (y.fx[k]||[])){const kk=String(e0.key||'');const tail=' ← '+x.name;if(!kk.endsWith(tail)||e0.temp||e0.next||(e0.until!=null&&+e0.until>=0)||(+e0.turn>0))continue;const nmS=kk.slice(0,-tail.length).trim();if(!srcN.has(nmS))continue;if((x.holds||[]).some(h=>h.name===nmS&&h.list))continue;   /* 「있는 한」 기록이 있는 효과는 위에서(【유일】까지 보고) 처리했다 */const F=fx(nm);if((F[k]||[]).some(e=>e.key===kk))continue;const e=JSON.parse(JSON.stringify(e0));F[k].push(e);
     if(k==='mults'){nm.mod=nm.mod||{};for(const s2 in e.stats||{}){nm.mod[s2]=Math.round(((+nm.mod[s2]||1)*(+e.stats[s2]||1))*1000)/1000;if(Math.abs(nm.mod[s2]-1)<0.002)delete nm.mod[s2]}}
     L.push(`${nm.name} 「${nmS}」 ${k==='mults'?Object.entries(e.stats||{}).map(([q,v])=>(STAT_KO[q]||q)+' ×'+v).join(' · '):'효과'} — ${x.name}이(가) 필드에 있는 동안`)}}}
  return L}
 /* 필드를 떠날 때 (교대 · 퇴장 · 빈사): 돌려줌 = 로그 줄 */
 function release(b,self){const H=(self&&self.holds)||[];if(!H.length)return [];const L=[];const names=new Set();
  for(const h of H){names.add(h.name);const m=h.mid?b.mons[h.mid]:null;
   if(h.list&&m&&m.fx){const F=fx(m);if(h.list==='mults'){for(const e of F.mults.filter(e=>e.key===h.key))unmult(m,e)}F[h.list]=F[h.list].filter(e=>e.key!==h.key)}
   else if(h.st&&m&&m.states)delete m.states[h.st];
   else if(h.rank&&m){m.rank=m.rank||{};for(const k in h.rank){const lim=k==='critical'?4:6;m.rank[k]=Math.max(-lim,Math.min(lim,(+m.rank[k]||0)-h.rank[k]));if(!m.rank[k])delete m.rank[k]}}
   else if(h.iu&&m&&m.fx&&m.fx.ignoreUp&&m.fx.ignoreUp.name===h.iu)m.fx.ignoreUp=null;
   else if(h.fl&&m&&m.fx)m.fx.float=null;else if(h.ty&&m&&m.typesOrig){m.types=m.typesOrig;delete m.typesOrig;delete m.typesBy}else if(h.ab&&m)resetAb(m);
   else if(h.ro&&m&&m.fx)m.fx.roles=(m.fx.roles||[]).filter(r=>!h.ro.includes(r));
   else if(h.fld){const f=field(b);if(h.fld==='weather'&&f.weather.type===h.v)f.weather={type:'',count:0};else if(h.fld==='terrain'&&f.terrain.type===h.v)f.terrain={type:'',count:0};else if(h.fld==='rooms')delete f.rooms[h.v];else if(h.fld==='etc')delete f.etc[h.v];else if(h.fld==='obj'&&f.objects[h.sd])delete f.objects[h.sd][h.v]}}
  self.holds=[];if(self.fxDone)for(const n of names)delete self.fxDone[n];
  L.push(`${self.name} 필드를 떠나 「${[...names].join('」「')}」 효과가 풀렸다`);return L}
 const NOIND_KO={'':'비례 대미지를 받지 않는다',noko:'비례 대미지로는 빈사가 되지 않는다',hazard:'설치기를 무시한다',hazdmg:'설치기의 비례 대미지를 받지 않는다',recoil:'반동 비례 대미지를 받지 않는다',switch:'강제 교대를 받지 않는다',freesw:'교대 제한을 받지 않고 반드시 교대할 수 있다'};
 const OBJ_GROUP={hazard:['압정뿌리기','독압정','지뢰원','끈적끈적네트','기뢰','트램펄린','스텔스록','불기둥','장미원','가시원','얼음꼬챙이','전기발판','아이스번','저주의묘','악의소굴','전파탑'],wall:['리플렉터','빛의장막','오로라베일','얼음의장벽']};
 function field(b){b.field=Object.assign({weather:{type:'',count:0},terrain:{type:'',count:0},rooms:{},etc:{},objects:{left:{},right:{}}},b.field||{});b.field.objects=b.field.objects||{left:{},right:{}};return b.field}
 function applyStats(m,op,self,name){const L=[];const isMult=op.k==='mult';const parts=[];const UPS={};
  for(const k in op.stats){let v=+op.stats[k];if(!v)continue;
   if(!isMult){ /* 랭크 */
    /* 능력반전: 랭크 변화를 거꾸로 (급소·강제 설정은 그대로) */
    if((m.states||{}).reverse&&k!=='critical'&&k!=='critical_buff'&&op.mode!=='set'){v=-v;parts.push('능력반전')}
    if(v<0&&!op.forced&&m.id!==self.id){const nd=nodropHit(m,k)||(sideObj(m,'흰안개')?'흰안개':'')||((m.states||{}).Substitute?'대타출동':'');if(nd){L.push(`${m.name} ${STAT_KO[k]} 감소 무시 (${nd})`);continue}}
    if(k==='critical_buff'){m.critBuff=(+m.critBuff||0)+v;parts.push(`급소 방호 ${v>0?'+':''}${v}`);continue}
    m.rank=m.rank||{};const lim=k==='critical'?4:6;const before=+m.rank[k]||0;const after=Math.max(-lim,Math.min(lim,before+v));m.rank[k]=after;if(after>before&&!op.mirror&&k!=='critical')UPS[k]=after-before;if(op.temp){m.tempRank=m.tempRank||{};m.tempRank[k]=(+m.tempRank[k]||0)+(after-before)}
    parts.push(`${STAT_KO[k]} ${v>0?'+':''}${v}${after!==before+v?' (한계 '+after+')':''}`)}
   else{if(v<1&&!op.forced&&m.id!==self.id){const nd=nodropHit(m,k,1);if(nd){L.push(`${m.name} ${STAT_KO[k]} 저하 무시 (${nd})`);continue}}   /* 11-09: 「감소무시 … 저하」 — 남이 건 배율 저하(×1 미만)도 막는다 */
    /* 10-26 망령: 같은 출처(같은 효과 ← 같은 포켓몬)의 같은 능력 배율은 겹치지 않는다 — 상시 · 고유를 다시 눌러 0.75×0.75 가 되던 것 */{const F0=fx(m);const e0=F0.mults.find(x=>x.key===name+' ← '+self.name);if(e0&&e0.stats&&e0.stats[k]!=null&&!RUNSTK){L.push(`${m.name} 「${name}」 ${STAT_KO[k]} 배율은 이미 걸려 있다`);continue}}
    m.mod=m.mod||{};m.mod[k]=Math.round(((+m.mod[k]||1)*v)*1000)/1000;if(op.temp){m.tempMod=m.tempMod||{};m.tempMod[k]=Math.round(((+m.tempMod[k]||1)*v)*1000)/1000}parts.push(`${STAT_KO[k]} ×${v}`);
    /* 배율 출처를 남겨서 나중에 해제할 수 있게 */ const F=fx(m);const key=name+' ← '+self.name;let e=F.mults.find(x=>x.key===key);if(!e){e={key,name,stats:{},temp:!!op.temp};F.mults.push(e)}e.stats[k]=Math.round(((+e.stats[k]||1)*v)*1000)/1000}}
  if(parts.length)L.push(`${m.name} 「${name}」 ${parts.join(' · ')}${op.temp?' (턴 종료까지)':''}`);
  /* 11-08 51-2 ⑭ 흉내허브: 상대의 랭크가 오르면 지닌 포켓몬도 똑같이 올리고 다 쓴다 */
  if(Object.keys(UPS).length&&!op.temp&&RUNB&&m.side){for(const x of Object.values(RUNB.mons||{})){if(!x||x.id===m.id||!x.entry||!alive(x)||!x.side||x.side===m.side||!holds(x,'흉내허브'))continue;L.push(...applyStats(x,{k:'rank',stats:Object.assign({},UPS),mirror:1,forced:1},x,'흉내허브'));L.push(useItem(x,'흉내허브'))}}
  return L}
 /* 11-05 망령 「기술 초읽기류 — 미래예지 같은 건 안 건드리고, T 카운트를 +1 하면서 필드의 상태 T 를 줄이는 느낌」:
    필드 위 포켓몬 · 필드의 「남은 턴」을 n 만큼 당긴다 (턴 번호는 그대로).
    · 포켓몬 상태: 턴으로 줄어드는 것(상태 DB prog turn · once, 기술로 주는 것 · 얼음 제외)을 −n, 0 이 되면 풀림. 예고 공격(미래예지 계 futRsv)은 그대로.
      죽음의카운트 0 → 빈사 · 하품 · 동면 0 → 잠듦 · 얼음.
    · 【지연】 · 나온 지 몇 턴(inT)을 n 만큼 앞당김 (= T 카운트 +n) · 지속 턴이 있는 효과(until) · 타입 · 특성 변경 지속도 −n (이미 지났으면 바로 끝).
    · 필드: 날씨 · 필드 · 룸 · 그 밖(중력 …) · 진영 효과(리플렉터 · 순풍 …)를 −n. 설치기(겹 수)는 그대로 */
 function countdown(b,n,self,name){const L=[];const t=+b.turn||0;const SD=((window.OM_DB||{}).states||{}).st||{};const live=Object.values(b.mons||{}).filter(m=>m&&m.entry&&alive(m));
  L.push(`${self?self.name+' ':''}「${name||'초읽기'}」 — 모든 턴 카운트 −${n}`);
  for(const m of live){const st=m.states||(m.states={});const rel=[];
   for(const k of Object.keys(st)){const v=+st[k];if(!(v>0&&v<1000))continue;if(m.futRsv&&m.futRsv.st===k)continue;
    if(k==='DeathCount'){if(v<=n){st[k]=0;delete st[k];m.hp.cur=0;L.push(`${m.name} 「죽음의카운트」 0 — 쓰러졌다!`)}else{st[k]=v-n;L.push(`${m.name} 「죽음의카운트」 ${v} → ${v-n}`)}continue}
    if(k==='Yawn'||k==='Hibernation'){if(v<=n){delete st[k];const to=k==='Yawn'?'Sleep':'Freeze';L.push(`${m.name} 「${stKo(k)}」 → `+setState(m,to,0,false,self,name))}else st[k]=v-n;continue}
    const d=SD[k]||{};if(!(d.prog==='turn'||d.prog==='once')||d.prog==='move'||k==='Freeze')continue;
    if(v-n<=0){delete st[k];rel.push(stKo(k))}else st[k]=v-n}
   if(rel.length)L.push(`${m.name} 「${rel.join('」「')}」 풀림`);
   if(m.inT!=null)m.inT=(+m.inT||t)-n;
   if(m.typeUntil!=null)m.typeUntil=+m.typeUntil-n;if(m.abUntil!=null)m.abUntil=+m.abUntil-n;
   const F=m.fx;if(F){const gone=[];const dn=arr=>(arr||[]).filter(e=>{if(e&&e.until>=0){e.until-=n;if(e.until<t){if(e.name)gone.push(e.name);return false}}return true});
    F.mods=dn(F.mods);F.noind=dn(F.noind);F.nodrop=dn(F.nodrop);if(F.chance)F.chance=dn(F.chance);if(F.sp)F.sp=dn(F.sp);if(F.float&&F.float.until>=0){F.float.until-=n;if(F.float.until<t)F.float=null}
    if(gone.length)L.push(`${m.name} 「${[...new Set(gone)].join('」「')}」 끝`)}}
  const f=field(b);const HZ=new Set(((window.OM_FIELD||{}).HAZ||[]).map(h=>h.k));
  for(const [key,ko] of [['weather','날씨'],['terrain','필드']]){const w=f[key]||{};if(w.type&&w.count>0&&w.count<1000){w.count-=n;if(w.count<=0){L.push(`${ko} 「${w.type}」 끝`);w.type='';w.count=0}}}
  const dec=(o,lab)=>{for(const k of Object.keys(o||{})){const v=+o[k];if(!(v>0&&v<1000))continue;if(v-n<=0){delete o[k];L.push(`${lab}「${k}」 끝`)}else o[k]=v-n}};
  dec(f.rooms,'');dec(f.etc,'');for(const sd of ['left','right']){const o=(f.objects||{})[sd]||{};for(const k of Object.keys(o)){if(HZ.has(k))continue;const v=+o[k];if(!(v>0&&v<1000))continue;if(v-n<=0){delete o[k];L.push(`${sd==='left'?'좌측':'우측'} 「${k}」 끝`)}else o[k]=v-n}}
  return L}
 function setState(m,en,count,forced,self,name){if(!en)return `${m.name} 모르는 상태`;m.states=m.states||{};if(m.states[en])return `${m.name} 이미 「${stKo(en)}」`;
  if(!forced){const im=immuneHit(m,en);if(im)return `${m.name} 「${stKo(en)}」 면역 (${im})`;const tb=terrainBlock(m,en);if(tb)return `${m.name} 땅 위에 있어서 「${tb}」가 「${stKo(en)}」을(를) 막았다`;const wb=weatherBlock(m,en);if(wb)return `${m.name} 「날씨 : ${wb}」라 「${stKo(en)}」 상태가 되지 않는다`;
   if(m.states.Comatose&&ABN.includes(en))return `${m.name} 「몽유」라 「${stKo(en)}」이 되지 않음`;
   const fromOther=!self||self.id!==m.id;
   if(fromOther&&sideObj(m,'신비의부적')&&(ABN.includes(en)||en==='Confusion'))return `${m.name} 「신비의부적」이 「${stKo(en)}」을(를) 막았다`;
   if(fromOther&&m.states.Substitute&&NEG.includes(en))return `${m.name} 「대타출동」이 「${stKo(en)}」을(를) 막았다`;if(ABN.includes(en)&&ABN.some(k=>m.states[k]))return `${m.name} 이미 상태 이상이라 「${stKo(en)}」이 되지 않음`;
   if(en==='Burn'&&typesOf(m).includes('Fire'))return `${m.name} 불꽃 타입이라 「화상」 없음`;if((en==='Poison'||en==='Toxic')&&(typesOf(m).includes('Poison')||typesOf(m).includes('Steel')))return `${m.name} 독·강철 타입이라 「${stKo(en)}」 없음`;if(en==='Paralysis'&&typesOf(m).includes('Electric'))return `${m.name} 전기 타입이라 「마비」 없음`;if(en==='Freeze'&&typesOf(m).includes('Ice')&&(fieldNow().weather||{}).type!=='극한')return `${m.name} 얼음 타입이라 「얼음」 없음`}   /* 11-01: 「날씨 : 극한」은 「얼음」 상태 내성을 무효화 */
  /* 11-08 51-2 ㉓: 「이 특성은 변경(파괴)되지 않는다」(변경 보호 특성)는 특성 파괴를 막는다 · ㉑ 떨어뜨리기는 이미 땅 위면 걸리지 않는다 */
  if(!forced&&en==='TraitBroken'&&(!self||self.id!==m.id)){const pr=spOf(m,'protect').find(e=>(e.what||['trait']).includes('trait'));if(pr)return `${m.name} 「${pr.name}」 — 특성이 파괴되지 않는다`}
  if(!forced&&en==='SmackDown'&&groundedX(m))return `${m.name} 이미 땅 위라 「${stKo(en)}」 상태가 되지 않는다`;
  const d=stDB()[en]||{};let c=count!=null&&+count>0?+count:(d.min>=1000||!d.min?1000:(+d.max>+d.min&&+d.max<1000?+d.min+Math.floor(Math.random()*(+d.max-+d.min+1)):+d.min));
  /* 11-08 51-2 ⑩ 끈기갈고리손톱: 건 쪽이 지니면 「조이기 : 4~5턴」이 늘 5턴 · ⑪ 조이기를 건 쪽을 남긴다(조임밴드 1/6) */
  let ext='';if(en==='Bind'&&self&&self.id!==m.id){if(!(count!=null&&+count>0)&&holds(self,'끈기갈고리손톱')){c=5;ext=` (「끈기갈고리손톱」 ${self.name})`}m.bindFrom=self.id}
  if((en==='LockOn'||en==='Gaze')&&self&&self.id!==m.id)m.lockFrom=self.id;   /* ⑰ 건 포켓몬의 기술만 필중 */
  m.states[en]=c;
  if(en==='SmackDown'){const off=['MagnetRise','Telekinesis','Fly'].filter(k=>m.states[k]);for(const k of off)delete m.states[k];if(m.fx&&m.fx.float)m.fx.float=null;if(off.length)ext+=` · 「${off.map(stKo).join('」「')}」 해제`}
  if(en==='TraitBroken'){const t=abSync(m);if(t)ext+=' · '+t}
  /* 씨뿌리기: 드레인은 씨를 뿌린 에리어로 (맵툴 seed_src_set) */
  if(en==='LeechSeed'){if(self&&self.id!==m.id&&self.entry)m.seedFrom=self.side+'_'+self.entry;else delete m.seedFrom}
  return `${m.name} 「${stKo(en)}」${c<1000?' '+c+'턴':''}${ext}${(d.desc||[]).length?' — '+d.desc.join(' '):''}`}
 function immuneHit(m,en){for(const e of (m.fx&&m.fx.immune)||[]){if(itemOff(m,e))continue;if(e.states.includes(en)||(en==='Toxic'&&e.states.includes('Poison'))||(e.states.includes('abnormal')&&ABN.includes(en)))return e.name}return ''}
 function nodropHit(m,stat,mod){const t=+(((window.OM_APP||{}).ST||{}).state||{}).battle?.turn||0;for(const e of (m.fx&&m.fx.nodrop)||[]){if(e.until>=0&&t>e.until)continue;if(mod&&!e.mod)continue;if(!e.st||e.st===stat)return e.name}if(mod)return '';
  /* 10-25 망령: 소지품 「클리어참」 — 자신 이외로 인해 능력이 떨어지지 않는다 (레디메이드 없이도, 매직룸이면 무효) */
  if(m&&itemNames(m).includes('클리어참')&&!itemsDead(m))return '클리어참';return ''}
 function noind(m,kind){const t=curTurn();for(const e of (m.fx&&m.fx.noind)||[]){if(e.until>=0&&t>e.until)continue;if(itemOff(m,e))continue;if(e.kind===kind||(e.kind===''&&kind!=='switch'&&kind!=='freesw'))return true}return false}   /* 강제 교대 무시(switch)는 「비례 대미지 무시」에 딸려 오지 않는다 */
 function noindName(m,kind){for(const e of (m.fx&&m.fx.noind)||[]){if(itemOff(m,e))continue;if(e.kind===kind||(e.kind===''&&kind!=='switch'&&kind!=='freesw'))return e.name}return ''}
 /* 10-22 망령: 포켓몬마다 상태 변화 사양 바꾸기 — 시트(포텐셜 · 전용 · 특성 · 소지품)에 적어 둔 것만, 배틀 중엔 손대지 않는다.
    ① 효과 글: 『수선녀의 요술』 「아쿠아링」에 의한 회복량을 강화(1/8 → 1/6)한다 처럼 「상태」 … (a/b → c/d)
    ② 자동화 구문: 상태수정 아쿠아링 1/6
    돌려줌 {n,d,name} 또는 null. 턴 종료 처리(field.js)가 아쿠아링 · 뿌리박기 · 독 · 화상 … 의 비율을 이걸로 바꾼다 */
 const RE_STMOD=/「([^」]+)」\s*(?:에\s*의한|에\s*따른|로\s*인한|으로\s*인한|의)[^(（\n]{0,24}[(（]\s*\d+\s*\/\s*\d+\s*(?:→|->|⇒|=>|➜)\s*(\d+)\s*\/\s*(\d+)\s*[)）]/g;
 function stMod(m,en){if(!m||!en)return null;
  for(const k in (m.auto||{}))for(const op of ((m.auto[k]||{}).ops||[]))if(op&&op.k==='stmod'&&op.st===en)return {n:+op.n,d:+op.d,name:k};
  const src=[...(m.pots||[]).filter(p=>p&&p.name&&!p.ph).map(p=>[p.name,p.eff]),...(m.excl?[[m.excl.name,m.excl.eff]]:[]),...(m.exclX||[]).map(x=>[x.name,x.eff]),[m.ability,m.abilityEff],...(itemsDead(m)?[]:[[m.item,m.itemEff],...((m.items2||[]).filter(x=>x&&x.item).map(x=>[x.item,x.itemEff]))])];
  for(const [name,eff] of src){if(!name||!eff)continue;for(const r of String(eff).matchAll(RE_STMOD))if(stEn(r[1])===en&&+r[3]>0)return {n:+r[2],d:+r[3],name:String(name).replace(/『|』/g,'')}}
  return null}
 function floating(m){const f=m.fx&&m.fx.float;if(!f)return false;const t=curTurn();return !(f.until>=0&&t>f.until)}
 function curTurn(){return +((((window.OM_APP||{}).ST||{}).state||{}).battle||{}).turn||0}
 function modDesc(e){const parts=[];if(e.types&&e.types.length)parts.push(e.types.map(t=>TYPE_KO[t]||t).join('·'));else parts.push('모든 타입');if(e.cat==='physical')parts.push('물리');if(e.cat==='special')parts.push('특수');
  if(e.eff==='super')parts.push('효과 굉장');if(e.eff==='weak')parts.push('효과 별로');if(e.eff==='normal')parts.push('상성 1배');if(e.rng==='single')parts.push('단일기');if(e.rng==='multi')parts.push('전체기');
  if(e.sb==='stab')parts.push('타입 일치');if(e.sb==='nonstab')parts.push('타입 비일치');if(e.tg&&e.tg.length)parts.push('「'+e.tg.join('」「')+'」 기술');if(e.pmin)parts.push('위력 '+e.pmin+' 이상');if(e.pmax)parts.push('위력 '+e.pmax+' 이하');
  if(e.ro&&e.ro.length)parts.push('『'+e.ro.join('』『')+'』 상대');if(e.st==='def')parts.push('【수세】');if(e.st==='off')parts.push('【공세】');if(e.cg)parts.push('급소 방호 '+e.cg);if(e.cr)parts.push('급소 C+'+e.cr);if(e.cx==='sure')parts.push('확정 급소');if(e.cx==='none')parts.push('급소에 맞지 않음');if(e.ed)parts.push('그 기술로 「빈사」 되지 않음');if(e.df)parts.push('「빈사」가 될 대미지를 자신의 행동 뒤로 미룸');if(e.mv&&e.mv.length)parts.push('「'+e.mv.join('」「')+'」만');if(e.ft&&e.ft.length)parts.push('상대 '+e.ft.map(t=>TYPE_KO[t]||t).join('·')+' 타입');if(+e.acc&&+e.acc!==1)parts.push('명중 ×'+e.acc);
  const dur=e.uses>0?'남은 '+e.uses+'회':e.turn>=0?'이번 턴':e.until>=0?(e.until-curTurn()+1)+'턴':'해제 전까지';
  return `「${e.name}」 ${e.kind==='boost'?'위력 강화':e.kind==='eva'?'회피 강화':'위력 완화'} ×${e.v} (${parts.join(' / ')} / ${dur})`}

 /* ===== 공격 계산이 읽는 것: 강화(공격 쪽)·완화(받는 쪽)·급소 ===== */
 function liveMods(m){const t=curTurn();return ((m.fx&&m.fx.mods)||[]).filter(e=>!(e.uses===0)&&!(e.turn>=0&&e.turn<t)&&!(e.until>=0&&t>e.until)&&!itemOff(m,e))}
 function matchMod(e,q){ /* q: {types[], cat('물리'|'특수'|'변화'), eff(mult), single, stab, tags[], pow, roles[], egg, stance} */
  if(e.types.length&&!(q.types||[]).some(t=>e.types.includes(t)))return false;
  if(e.cat==='physical'&&q.cat!=='물리')return false;if(e.cat==='special'&&q.cat!=='특수')return false;
  if(e.eff==='super'&&!(q.eff>1))return false;if(e.eff==='weak'&&!(q.eff<1&&q.eff>0))return false;if(e.eff==='normal'&&q.eff!==1)return false;
  if(e.rng==='single'&&q.single===false)return false;if(e.rng==='multi'&&q.single!==false)return false;
  if(e.sb==='stab'&&!q.stab)return false;if(e.sb==='nonstab'&&q.stab)return false;
  if(e.tg&&e.tg.length&&!(q.tags||[]).some(t=>e.tg.includes(t)))return false;
  if(e.pmin&&!(q.pow>=e.pmin))return false;if(e.pmax&&!(q.pow<=e.pmax))return false;
  if(e.ro&&e.ro.length&&!(q.roles||[]).some(r=>e.ro.includes(r)))return false;
  if(e.eg&&!(q.egg||[]).some(g=>e.eg.split(',').includes(g)))return false;
  /* 11-08: 기술 이름 조건(기술:) · 상대 타입 조건(상대타입: — 위력 강화는 맞는 쪽, 완화 · 회피는 때리는 쪽 타입) */
  if(e.mv&&e.mv.length){const nm=x=>String(x||'').replace(/\s/g,'');if(!e.mv.some(x=>nm(x)===nm(q.move)))return false}
  if(e.ft&&e.ft.length){const ft=e.kind==='boost'?(q.defTypes||[]):(q.atkTypes||[]);if(!ft.some(t=>e.ft.includes(t)))return false}
  /* 10-26 망령: 【수세】 = 효과를 가진 쪽이 공격을 지시받지 않았을 때, 【공세】 = 그 상대(대상)가 공격을 지시받지 않았을 때.
     q.atkAtk · q.defAtk = 공격하는 쪽 · 맞는 쪽이 이번 턴 공격을 지시받았나 (오레마스가 공개된 지시로 채운다). 없으면 예전처럼 따지지 않는다 */
  if(e.st&&(q.atkAtk!==undefined||q.defAtk!==undefined)){const hold=e.kind!=='boost'?(!!q.defAtk&&!q.defKeep):(!!q.atkAtk&&!q.atkKeep),   /* 11-06 수세유지: q.atkKeep · q.defKeep = 그 쪽이 【수세】를 지킨 채 공격 (자신의 【수세】만 — 상대의 【공세】 판정은 그대로) */other=e.kind!=='boost'?!!q.atkAtk:!!q.defAtk;if(e.st==='def'&&hold)return false;if(e.st==='off'&&other)return false}
  else if(e.st&&q.stance&&e.st!==q.stance)return false;return true}
 function attackMods(atk,def,q){const out={boost:1,guard:1,cg:0,cr:0,cx:'',names:[]};
  for(const e of liveMods(atk)){if(e.kind!=='boost')continue;if(+e.acc&&+e.v===1&&!e.cr&&!e.cx&&!e.sure&&!e.next)continue;   /* 명중만 바꾸는 줄은 accMods 몫 */const qq=Object.assign({},q,{roles:(def.fx&&def.fx.roles)||[],egg:def.egg||[]});if(!matchMod(e,qq))continue;out.boost*=e.v;out.cr+=e.cr||0;if(e.cx)out.cx=e.cx;if(e.sure)out.sure=1;if(e.uturn)out.uturn=1;out.names.push({key:e.key,kind:e.kind,who:atk.id,txt:e.next?`${atk.name} 「${e.name}」 다음 기술: ${nextTxt(e)}`:`${atk.name} 「${e.name}」 ×${e.v}`})}
  const MOLD=atk&&def&&atk.id!==def.id&&spOf(atk,'mold').length>0;const defAb=String((def&&def.ability)||'').replace(/『|』/g,'').trim();
  for(const e of liveMods(def)){if(e.kind!=='guard')continue;if(e.hf&&!(def.hp&&+def.hp.cur>=+def.hp.max))continue;   /* 11-03: 「HP : 가득」일 때만 (익스펜션 : 드래곤 · 멀티스케일 꼴) */if(MOLD&&defAb&&e.name===defAb){out.names.push({key:'_mold',who:atk.id,txt:`${atk.name} 특성 무시 — ${def.name} 「${defAb}」 완화 무시`});continue}const qq=Object.assign({},q,{roles:(atk.fx&&atk.fx.roles)||[],egg:atk.egg||[]});if(!matchMod(e,qq))continue;const onlyCx=+e.v===1&&!e.cg;if(onlyCx&&(atk.id===def.id||(q&&q.cat==='변화')))continue;/* 급소만 막는 효과(조가비갑옷 …)는 자기 기술 · 변화기에선 이름을 안 띄운다 */out.guard*=e.v;if(e.ed)out.endure=1;if(e.df)out.defer=e.name||'미루기';out.cg+=e.cg||0;if(e.cx==='none')out.cx='none';out.names.push({key:e.key,kind:e.kind,who:def.id,txt:`${def.name} 「${e.name}」 ${e.df?'빈사 대미지를 행동 뒤로':e.ed?(+e.v===1?'':'×'+e.v+' · ')+'빈사 견딤':onlyCx&&e.cx==='none'?'급소 없음':'×'+e.v}`})}
  out.boost=Math.round(out.boost*1000)/1000;out.guard=Math.round(out.guard*1000)/1000;return out}
 /* 11-05 망령 「약점회피 같은 건 자동화 못 시켜?」: 조건부 회피 강화 (구문 「회피 ×1.1 굉장」) — 맞는 쪽(def)의 것만, 조건은 위력 완화와 같은 matchMod. 오레마스 명중 판정이 evaMult 로 곱한다 */
 /* 11-08 망령 「특정 기술일 때 명중률 강화(뇌선인의 뇌법 · 킥의오니 …)」: 때리는 쪽 위력 강화 줄의 「명중×N」 — 조건은 matchMod 그대로. 오레마스 명중 판정이 accMult 에 곱한다 */
 function accMods(atk,def,q){const out={v:1,names:[]};for(const e of liveMods(atk)){if(e.kind!=='boost'||!(+e.acc)||+e.acc===1)continue;const qq=Object.assign({},q,{roles:(def.fx&&def.fx.roles)||[],egg:def.egg||[]});if(!matchMod(e,qq))continue;out.v*=+e.acc;out.names.push({key:e.key+'|acc',kind:'acc',who:atk.id,txt:`${atk.name} 「${e.name}」 명중 ×${e.acc}`})}out.v=Math.round(out.v*1000)/1000;return out}
 function evaMods(atk,def,q){const out={v:1,names:[]};for(const e of liveMods(def)){if(e.kind!=='eva')continue;const qq=Object.assign({},q,{roles:(atk.fx&&atk.fx.roles)||[],egg:atk.egg||[]});if(!matchMod(e,qq))continue;out.v*=e.v;out.names.push({key:e.key,kind:e.kind,who:def.id,txt:`${def.name} 「${e.name}」 회피 ×${e.v}`})}out.v=Math.round(out.v*1000)/1000;return out}
 /* 쓴 뒤: 횟수 있는 항목을 깎는다 (b 사본의 포켓몬에) */
 function consume(b,names){for(const n of names||[]){const m=b.mons[n.who];if(!m||!m.fx)continue;const e=m.fx.mods.find(x=>x.key===n.key&&(!n.kind||!x.kind||x.kind===n.kind));if(!e)continue;if(e.uses>0){e.uses--;if(e.uses===0){m.fx.mods=m.fx.mods.filter(x=>x!==e);if(e.next){m.fx.prio=(m.fx.prio||[]).filter(x=>x.key!==e.key);if(m.flags&&m.flags.pursuitBy===e.name){delete m.flags.pursuit;delete m.flags.pursuitBy}}}}}}
 /* 다음 기술 필중 · 유턴 (공격 창이 명중 전에 본다) */
 function nextOf(m){const t=curTurn();return ((m&&m.fx&&m.fx.mods)||[]).filter(e=>e.next&&e.uses!==0&&!itemOff(m,e))}
 function prioOf(m,mv){let p=+(mv&&mv.prio)||0;let set=null;const t=curTurn();{const st=(m&&m.states)||{};if(st.GlassShoes)p+=0.5;if(st.Positioning)p+=1}   /* 11-08 51-2 ㉒ 유리구두 +0.5 · 자세잡기 +1 (기술을 내보내면 웹툴 공격 적용이 푼다) *//* 11-07 망령 「복합기는 첫째 · 둘째 타입 관계없다」: 「X 타입 기술」 우선도 조건은 기술의 모든 타입 중 하나라도 맞으면 */const TS=window.OM_STATS;const mty=[mv&&mv.typeEn,...String((mv&&mv.type)||'').split(/[()/,]/).map(x=>x.trim()).filter(Boolean).map(x=>TS&&TS.typeEn?TS.typeEn(x):x)].filter(Boolean);for(const e of (m.fx&&m.fx.prio)||[]){if(e.turn>=0&&e.turn<t)continue;if(itemOff(m,e))continue;if(e.cat&&e.cat!=='all'&&e.cat!==mv.cat)continue;if(e.type&&!mty.includes(e.type))continue;if(e.tag&&!e.tag.split(',').some(x=>String(mv.tag||mv.name||'').includes(x.trim())))continue;if(e.mode==='set')set=e.v;else p+=e.v}return set!=null?set:p}
 /* 턴 종료: 기한 지난 항목 정리 */
 function turnEnd(b){const t=+b.turn||0;const L=[];for(const id in b.mons||{}){const m=b.mons[id];
  /* 11-03 21:01 망령 「타입변경 · 특성변경 턴제 지정」: 「타입 변경 물 2턴」 · 「특성 변경 ○○ 2턴」 — 그 턴 종료 때 원래대로 */
  if(m.typeUntil!=null&&t>=+m.typeUntil){if(m.typesOrig){m.types=m.typesOrig;delete m.typesOrig;delete m.typesBy;m.typesKo=m.types.map(t=>TYPE_KO[t]||t)}delete m.typeUntil;L.push(`${m.name} 타입 원래대로 (지속 끝)`)}
  if(m.abUntil!=null&&t>=+m.abUntil){if(resetAb(m))L.push(`${m.name} 특성 원래대로 (지속 끝)`);delete m.abUntil}
  if(!m.fx)continue;const F=m.fx;
  const gone=[];F.mods=F.mods.filter(e=>{const dead=(e.turn>=0&&e.turn<=t)||(e.until>=0&&t>=e.until)||e.uses===0;if(dead)gone.push(e.name);return !dead});
  F.noind=F.noind.filter(e=>!(e.until>=0&&t>=e.until));F.nodrop=F.nodrop.filter(e=>!(e.until>=0&&t>=e.until));if(F.chance)F.chance=F.chance.filter(e=>!(e.until>=0&&t>=e.until));if(F.sp)F.sp=F.sp.filter(e=>!(e.until>=0&&t>=e.until));F.prio=F.prio.filter(e=>!(e.turn>=0&&e.turn<=t));if(F.float&&F.float.until>=0&&t>=F.float.until)F.float=null;
  if(gone.length)L.push(`${m.name} 「${gone.join('」「')}」 끝`)}return L}

 /* ===== 포켓몬 카드에 보여 줄 효과 칩 ===== */
 function chips(m){const out=[];for(const e of liveMods(m))out.push(e.next?{t:'다음 기술',title:e.name+' — 다음 기술에 '+nextTxt(e,m),id:'mods:'+e.key,name:e.name}:{t:`${e.kind==='boost'?'위력':e.kind==='eva'?'회피':'피해'} ×${e.v}${e.kind==='eva'&&e.eff==='super'?' (약점)':''}`,title:modDesc(e),id:'mods:'+e.key,name:e.name});for(const e of (m.fx&&m.fx.noind)||[])out.push({t:e.kind==='switch'?'교대 무시':e.kind==='freesw'?'반드시 교대':'비례 무시',title:e.name+' — '+NOIND_KO[e.kind||''],id:'noind:'+e.key,name:e.name});
  for(const e of (m.fx&&m.fx.prio)||[])if(!e.next)out.push({t:`우선도 ${e.mode==='set'?'=':(e.v>0?'+':'')}${e.v}`,title:e.name,id:'prio:'+e.key,name:e.name});for(const e of (m.fx&&m.fx.immune)||[])out.push({t:'면역 '+e.states.map(stKo).join('·'),title:e.name,id:'immune:'+e.key,name:e.name});
  for(const e of (m.fx&&m.fx.nodrop)||[])out.push({t:(e.st?STAT_KO[e.st]+' ':'')+'감소 무시',title:e.name,id:'nodrop:'+e.key,name:e.name});for(const e of (m.fx&&m.fx.mults)||[])out.push({t:'배율 '+multLabel(e.stats),title:e.name+' — '+Object.entries(e.stats).map(([k,v])=>(STAT_KO[k]||k)+' ×'+v).join(' · ')+(e.temp?' (턴 종료까지)':''),id:'mults:'+e.key,name:e.name});
  for(const e of spOf(m))out.push({t:SP_KO[e.sp]||e.sp,title:e.name+' — '+spDesc(e),id:'sp:'+e.key,name:e.name});
  for(const e of (m.fx&&m.fx.chance)||[])out.push({t:e.sure?'확률 반드시':'확률 '+(e.v>0?'+':'')+e.v+'%p',title:e.name+' — 확률 효과 '+(e.sure?'반드시 발동':'발동 확률 보정')+(e.uses>0?' · 남은 '+e.uses+'회':''),id:'chance:'+e.key,name:e.name});
  if(m.fx&&m.fx.ignoreUp){const iu=m.fx.ignoreUp;out.push({t:iuLabel(iu),title:(iu.name||'')+' — '+(iu.dir==='recv'?'받을 때':iu.dir==='both'?'주고받을 때':'공격할 때')+' 상대의 '+scopeKo(iu.scope)+' '+iuLabel(iu)+' (상승·감소 = 랭크, 강화·저하 = 배율)',id:'ignoreUp',name:iu.name||iuLabel(iu)})}if(floating(m))out.push({t:'하늘 위',title:((m.fx&&m.fx.float&&m.fx.float.name)||'')+' — 땅 위 효과를 받지 않는다',id:'float',name:(m.fx&&m.fx.float&&m.fx.float.name)||'하늘 위'});
  if(m.fx&&m.fx.roles&&m.fx.roles.length)out.push({t:'역할 '+m.fx.roles.join('·'),title:(m.fx.rolesBy||'')+' 역할 취급',id:'roles',name:m.fx.rolesBy||'역할 취급'});if(m.typesOrig)out.push({t:'타입 변경',title:(m.typesBy||'')+' — 원래 '+m.typesOrig.map(t=>TYPE_KO[t]||t).join('/'),id:'types',name:m.typesBy||'타입 변경'});if(m.abilityOrig!=null)out.push({t:'특성 변경',title:(m.abilityBy||'')+' — 원래 '+(m.abilityOrig||'없음'),id:'ability',name:m.abilityBy||'특성 변경'});
  if(m.flags&&m.flags.pursuitImmune)out.push({t:'추격 무시',title:(m.flags.pursuitImmuneBy||'')+' — 이번 턴 교대해도 상대의 「따라가때리기」를 받지 않는다. 턴 종료에 풀린다',id:'pursuitImmune',name:m.flags.pursuitImmuneBy||''});
  if(m.flags&&m.flags.pursuit)out.push({t:'추격',title:(m.flags.pursuitBy||'')+' — 따라가때리기(Pursuit): 다음 기술에서 상대가 교대하려 하면 교대 전에 먼저 때린다. 턴 종료에 풀린다',id:'pursuit',name:m.flags.pursuitBy||'추격'});/* 10-26 제보: 같은 효과가 두 길(특성 + 포텐셜 등)로 들어오면 칩이 둘 — 글자와 이름이 같으면 하나로 */{const seen=new Set();for(let i=out.length-1;i>=0;i--){const k=out[i].t+'|'+(out[i].name||'');if(seen.has(k))out.splice(i,1);else seen.add(k)}}return out}
 /* 배율 칩 짧은 글: 5능력이 같은 값이면 「능력 ×1.33」, 나머지는 따로 */
 function multLabel(st){const five=['attack','defense','specialattack','specialdefense','speed'];const out=[];const v5=five.map(k=>st[k]);if(v5.every(v=>v!=null)&&v5.every(v=>v===v5[0])){out.push('능력 ×'+v5[0]);for(const k in st)if(!five.includes(k))out.push((STAT_KO[k]||k)+' ×'+st[k])}else{const by={};for(const k in st)(by[st[k]]=by[st[k]]||[]).push(STAT_KO[k]||k);for(const v in by)out.push(by[v].map(x=>x.replace('스피드','스')).join('·')+' ×'+v)}return out.join(' ')}
 /* 출처(포텐셜 이름) 가 같은 효과를 한꺼번에 해제 — 디스럽터처럼 여러 효과가 묶인 것 */
 function removeByName(m,name){const F=fx(m);let n=0;for(const k of ['mods','noind','prio','immune','nodrop','chance','sp']){const b=F[k].length;F[k]=F[k].filter(e=>e.name!==name);n+=b-F[k].length}
  for(const e of F.mults.filter(e=>e.name===name)){unmult(m,e);n++}F.mults=F.mults.filter(e=>e.name!==name);
  if(F.ignoreUp&&F.ignoreUp.name===name){F.ignoreUp=null;n++}if(F.float&&F.float.name===name){F.float=null;n++}if(F.roles.length&&F.rolesBy===name){F.roles=[];F.rolesBy='';n++}
  if(m.typesOrig&&m.typesBy===name){m.types=m.typesOrig;delete m.typesOrig;delete m.typesBy;n++}if(m.abilityOrig!=null&&m.abilityBy===name){resetAb(m);n++}
  if(m.flags&&m.flags.pursuit&&m.flags.pursuitBy===name){delete m.flags.pursuit;delete m.flags.pursuitBy;n++}if(m.flags&&m.flags.pursuitImmune&&m.flags.pursuitImmuneBy===name){delete m.flags.pursuitImmune;delete m.flags.pursuitImmuneBy;n++}return n}
 function unmult(m,e){m.mod=m.mod||{};for(const k in e.stats){const v=+e.stats[k]||1;m.mod[k]=Math.round(((+m.mod[k]||1)/v)*1000)/1000;if(Math.abs(m.mod[k]-1)<0.002)delete m.mod[k];if(e.temp&&m.tempMod&&m.tempMod[k]!=null){m.tempMod[k]=Math.round(((+m.tempMod[k]||1)/v)*1000)/1000;if(Math.abs(m.tempMod[k]-1)<0.002)delete m.tempMod[k]}}}
 /* 효과 하나 해제 (id 는 chips 의 id) */
 function remove(m,id){const F=fx(m);const [kind,key]=id.split(/:(.+)/);if(['mods','noind','prio','immune','nodrop','chance','sp'].includes(kind)){F[kind]=F[kind].filter(e=>e.key!==key);if(kind==='mods')F.prio=F.prio.filter(e=>!(e.next&&e.key===key));return true}
  if(kind==='mults'){const e=F.mults.find(x=>x.key===key);if(e)unmult(m,e);F.mults=F.mults.filter(x=>x.key!==key);return true}
  if(kind==='ignoreUp'){F.ignoreUp=null;return true}if(kind==='float'){F.float=null;return true}if(kind==='roles'){F.roles=[];return true}if(kind==='types'){if(m.typesOrig){m.types=m.typesOrig;delete m.typesOrig}return true}if(kind==='ability'){resetAb(m);return true}if(kind==='pursuit'){if(m.flags)delete m.flags.pursuit;return true}if(kind==='pursuitImmune'){if(m.flags){delete m.flags.pursuitImmune;delete m.flags.pursuitImmuneBy}return true}return false}
 function untransform(m){const x=m&&m.xform;if(!x)return '';if(m.ability&&m.ability!==x.ability)removeByName(m,m.ability);m.types=x.types;m.ability=x.ability;m.abilityEff=x.abilityEff;m.stats=x.stats;m.rank=x.rank;m.moves=x.moves;m.image=x.image;delete m.xform;return `${m.name} 변신이 풀렸다`}
 function removeAll(m){untransform(m);const F=fx(m);for(const e of F.mults)unmult(m,e);F.mults=[];F.mods=[];F.noind=[];F.prio=[];F.immune=[];F.nodrop=[];F.chance=[];F.sp=[];F.ignoreUp=null;F.float=null;F.roles=[];if(m.typesOrig){m.types=m.typesOrig;delete m.typesOrig}resetAb(m);if(m.flags){delete m.flags.pursuit;delete m.flags.pursuitBy;delete m.flags.pursuitImmune;delete m.flags.pursuitImmuneBy}if(m.typesBy)delete m.typesBy;if(m.abilityBy)delete m.abilityBy;F.rolesBy=''}

 /* ===== 발동 시점·확률 (효과 글의 표식) ===== */
 function timing(text){const t=String(text||'');const out={entry:/【등장】/.test(t),passive:/【상시】/.test(t),turnEnd:/【턴 종료】|턴 종료 시/.test(t),pre:/【선행】/.test(t),uses:(t.match(/【(\d+)\/시】/)||[])[1]||'',percent:''};
  for(const [k,v] of [['드물게','드물게'],['저확률','저확률'],['중확률','중확률'],['고확률','고확률']])if(t.includes(k))out.percent=v;return out}
 /* 「N할로」 · 「N% 확률로」 (10-24 망령): 글에 적힌 확률 → % (없으면 0). 「HP 를 3할 회복」 같은 양은 「할로」 · 「확률」 꼴이 아니라 잡히지 않는다 */
 function chanceOf(text){const t=String(text||'');let x=t.match(/(\d+(?:\.\d+)?)\s*할(?:의\s*확률)?\s*로/)||t.match(/(\d+(?:\.\d+)?)\s*할\s*[:：]/)||t.match(/(\d+(?:\.\d+)?)\s*할의\s*확률/);if(x)return Math.min(100,+x[1]*10);x=t.match(/^\s*[①-⑩]?\s*(\d+(?:\.\d+)?)\s*%\s*[:：]/);if(x)return Math.min(100,+x[1]);x=t.match(/(\d+(?:\.\d+)?)\s*%\s*(?:의\s*)?확률/)||t.match(/확률\s*(\d+(?:\.\d+)?)\s*%/);if(x)return Math.min(100,+x[1]);return 0}
 /* 확률 표식 → %: 오레마스 방 설정(rp.pct)이 있으면 그것, 없으면 룰 DB(const campaign.percent_*), 그것도 없으면 기본값. 제작기에는 OM_APP 이 없어 룰 DB 값을 쓴다 */
 function percentBase(label){const C=(DB().const||{}).campaign||{};const v=C['percent_'+label];if(v==null||v==='')return {드물게:10,저확률:30,중확률:50,고확률:60}[label]||100;return +v>1?+v:+v*100}
 function percentOf(label){const R=((((window.OM_APP||{}).ST||{}).state||{}).rp||{}).pct||{};const rv=R[label];if(rv!=null&&rv!==''&&isFinite(+rv))return Math.max(0,Math.min(100,+rv));return percentBase(label)}

 /* ===== 한국어 구문 ↔ op ===== */
 const TGT_WORDS=Object.keys(KO_TGT).sort((a,b)=>b.length-a.length);
 function tgtOf(words){for(let i=0;i<words.length;i++){const w=words[i].replace(/\s/g,'');const k=KO_TGT[w];if(k){words.splice(i,1);return k}}return null}
 const SCOPE_KO={def:'방어',eva:'회피',atk:'공격',acc:'명중'};function scopeKo(s){return s==='both'||!s?'방어·회피·공격·명중':String(s).split(',').map(x=>SCOPE_KO[x]||x).join('·')}
 /* 줄 앞 확률 「5할」 「30%」 「저확률」 (뒤에 「로」 「:」 붙어도 됨) · 줄 끝 「있는한」(필드 위에 있는 한) — 어느 명령에나 붙는다 */
 const HOLD_W=/(^|\s)(있는한|필드위에있는한|필드에있는한|필드위동안|\[있는한\])(?=\s|$)/;
 function parseLine(line){line=String(line||'').trim();if(!line||line.startsWith('#'))return null;let p=0,pl='',hold=0;
  let x=line.match(/^(\d+(?:\.\d+)?)\s*(할|%)(?:\s*확률)?\s*(?:로)?\s*[:：]?\s+(?=\S)/);if(x){p=Math.min(100,x[2]==='할'?+x[1]*10:+x[1]);line=line.slice(x[0].length)}else if((x=line.match(/^(드물게|저확률|중확률|고확률)\s*(?:로)?\s*[:：]?\s+(?=\S)/))){pl=x[1];line=line.slice(x[0].length)}
  if(HOLD_W.test(line)){hold=1;line=line.replace(HOLD_W,' ').trim()}
  /* 11-09 망령: 줄 끝 「대상타입:벌레」 — 그 줄의 대상 중 그 타입인 포켓몬에게만 (어느 명령에나) */let tt=null;{const q=line.match(/(^|\s)대상타입[:：](\S+)/);if(q){tt=q[2].split(/[,·/]/).map(x=>x.trim()).filter(Boolean).map(x=>KO_TYPE[x]||x);line=line.replace(q[0],' ').trim()}}
  /* 11-03 특수 효과(sp) 구문 뒤의 대상 낱말(아군전체 · 상대전체 …) — 없으면 자신 */
  let spT=null;{const ws=line.split(/\s+/);if(SP_HEADS.has(ws[0])&&!(ws[0]==='회피'&&!ws.some(w=>/^\d+(할|%)$/.test(w)))){const rest=ws.slice(1);const t=tgtOf(rest);if(t){spT=t;line=[ws[0]].concat(rest).join(' ')}}}
  const op=parseLine0(line);if(op&&op.k!=='?'){if(p)op.p=p;if(pl)op.pl=pl;if(hold)op.hold=1;if(tt&&tt.length)op.ttype=tt;if(spT&&spT!=='self'&&op.k==='sp')op.tgt=spT}return op}
 const SP_HEADS=new Set(['추가공격','보호','특성무시','해석차단','기술타입','지속연장','명중확장','회피','추가효과','끌어오기','반사']);
 function parseLine0(line){line=line.trim();if(!line||line.startsWith('#'))return null;line=line.replace(/^미루기(?=\s|$)/,'완화 ×1 미룸');   /* 11-09 망령 「빈사가 될 대미지를 자신의 행동 이후로 미룬다」: 미루기 = 완화 ×1 미룸 */const words=line.split(/\s+/);const head=words.shift();
  const n=s=>{const m=String(s).match(/-?\d+(\.\d+)?/);return m?+m[0]:0};const turns=()=>{const i=words.findIndex(w=>/^\d+턴$/.test(w));if(i<0)return null;const v=+words[i].replace('턴','');words.splice(i,1);return v};const has=w=>{const i=words.indexOf(w);if(i<0)return false;words.splice(i,1);return true};
  const tagW=()=>{const i=words.findIndex(w=>/^태그[:：]/.test(w));if(i<0)return [];const v=words.splice(i,1)[0].replace(/^태그[:：]/,'');return v.split(/[,·]/).map(x=>x.trim()).filter(Boolean)};
  const types=()=>{const i=words.findIndex(w=>/^타입[:：]?/.test(w));if(i<0)return [];let v=words[i].replace(/^타입[:：]?/,'');if(!v&&words[i+1]){v=words[i+1];words.splice(i,2)}else words.splice(i,1);return v.split(/[,/·]/).map(x=>KO_TYPE[x.trim()]||x.trim()).filter(Boolean)};
  const spEvade=()=>{const pi=words.findIndex(w=>/^\d+(할|%)$/.test(w));const pw=words.splice(pi,1)[0];const pct=/할$/.test(pw)?+pw.replace('할','')*10:+pw.replace('%','');return {k:'sp',sp:'evade',pct,types:types(),tg:tagW(),cat:has('물리')?'물리':has('특수')?'특수':has('접촉')?'접촉':''}};
  switch(head){
   /* 11-07 망령 「전용 · 고유 입력에 대상 지정」: 「대상지정 [상대1체|아군1체|자신포함아군1체|아무나1체]」 — 효과는 없고, 웹툴 지시 입력에서 이 포텐셜을 선행 입력할 때 대상을 찍게 한다. 발동하면 구문의 「상대 1체」 · 「아군 1체」 를 그 대상으로 */
   case '대상지정':{const w=words.join('').replace(/\s/g,'');const t=/자신포함|본인포함/.test(w)?'ally1s':/아무나|누구나|전체1체|전원1체/.test(w)?'any1':/아군/.test(w)?'ally1':'enemy1';return {k:'tsel',tgt:t}}
   case '랭크':case '배율':{const tgt=tgtOf(words)||'self';const temp=has('임시')||has('턴종료까지');const forced=has('강제');const p7=has('명중회피포함')||has('7능력');const from=has('기준:정면')||has('기준정면')||has('정면기준')?'front':'';const stats={};let rnd=null;const picks=[];let spdV=null;for(const w of words){{/* 11-05 망령 「가장 높은 · 낮은 능력치 (상승 · 저하)」: 최고+1 · 최고-1 · 최저×0.67 · 스피드면×1.5 */const pm=w.match(/^(최고|최저)\s*([+\-×x*])\s*(\d+(?:\.\d+)?)$/);if(pm){if(head==='랭크'&&/[×x*]/.test(pm[2])||head==='배율'&&/[+\-]/.test(pm[2]))return {k:'?',raw:line,why:head==='랭크'?'랭크는 최고+1 · 최저-1 처럼 적어요':'배율은 최고×1.3 처럼 적어요'};picks.push({lo:pm[1]==='최저'?1:0,v:pm[2]==='-'?-+pm[3]:+pm[3]});continue}const sm=w.match(/^스피드면\s*([+\-×x*])\s*(\d+(?:\.\d+)?)$/);if(sm){spdV=sm[1]==='-'?-+sm[2]:+sm[2];continue}}let m=w.match(/^무작위(\d+)?(?:개)?\s*([+\-×x*])\s*(\d+(?:\.\d+)?)$/);if(m){rnd={n:+m[1]||1,v:m[2]==='-'?-+m[3]:+m[3]};continue}m=w.match(/^(.+?)\s*([+\-×x*])\s*(\d+(?:\.\d+)?)$/);if(!m)continue;const k=KO_STAT[m[1]];if(!k)continue;/* 10-26 점검: 랭크는 ±, 배율은 × 만 — 섞이면 모르는 줄로 */if(head==='랭크'&&/[×x*]/.test(m[2])||head==='배율'&&/[+\-]/.test(m[2]))return {k:'?',raw:line,why:head==='랭크'?'랭크는 +1 · -1 처럼 적어요 (×는 배율)':'배율은 ×1.5 처럼 적어요 (+는 랭크)'};if(head==='배율'&&+m[3]===1)continue;stats[k]=m[2]==='-'?-+m[3]:+m[3]}if(rnd&&p7)rnd.pool='7';if(spdV!=null)picks.forEach(p=>p.spd=spdV);if(!rnd&&!picks.length&&!Object.keys(stats).length)return {k:'?',raw:line,why:'능력치와 값을 못 읽었어요'};return Object.assign({k:head==='랭크'?'rank':'mult',tgt,stats},rnd?{rnd}:{},picks.length?{picks}:{},picks.length&&from?{from}:{},temp?{temp:1}:{},forced?{forced:1}:{})}
   case '초기화':{const what=words.includes('배율')?'mult':words.includes('랭크')?'rank':'all';return {k:'reset',what,tgt:tgtOf(words)||'self'}}
   case '위력':case '완화':case '회피':{if(head==='회피'&&words.some(w=>/^\d+(할|%)$/.test(w)))return spEvade(words);   /* 11-06: 「회피 2할」(특수 효과 회피 — 칼솜씨 · 행운)이 아래 회피 강화(×) 줄로 읽혀 ×1 이 되던 것 */
    const op={k:head==='위력'?'boost':head==='회피'?'eva':'guard',tgt:'self',v:1,types:[],cat:'all',eff:'all',rng:'all',uses:-1,turn:0,tl:0,ro:[],st:'',tg:[],sb:''};const vi=words.findIndex(w=>/^[×x*]?\d+(\.\d+)?$/.test(w));if(vi>=0){op.v=n(words[vi]);words.splice(vi,1)}
    op.tgt=tgtOf(words)||'self';op.types=types();if(has('물리'))op.cat='physical';if(has('특수'))op.cat='special';if(has('굉장'))op.eff='super';if(has('별로'))op.eff='weak';if(has('보통'))op.eff='normal';if(has('단일'))op.rng='single';if(has('전체기'))op.rng='multi';if(has('자속'))op.sb='stab';if(has('비자속'))op.sb='nonstab';if(has('이번턴'))op.turn=1;if(has('수세'))op.st='def';if(has('공세'))op.st='off';if(has('확정급소'))op.cx='sure';if(has('급소없음'))op.cx='none';if(has('견딤'))op.ed=1;if(has('미룸'))op.df=1;if(has('해제'))op.remove=1;if(has('HP가득'))op.hf=1;
    const tl=turns();if(tl!=null)op.tl=tl;const ui=words.findIndex(w=>/^\d+회$/.test(w));if(ui>=0){op.uses=+words[ui].replace('회','');words.splice(ui,1)}
    for(let i=words.length-1;i>=0;i--){const w=words[i];let m;if((m=w.match(/^태그[:：]?(.+)$/))){op.tg=m[1].split(/[,·]/).filter(Boolean);words.splice(i,1)}else if((m=w.match(/^역할[:：]?(.+)$/))){op.ro=m[1].split(/[,·]/).filter(Boolean);words.splice(i,1)}else if((m=w.match(/^위력[≥>=]+(\d+)$/))){op.pmin=+m[1];words.splice(i,1)}else if((m=w.match(/^위력[≤<=]+(\d+)$/))){op.pmax=+m[1];words.splice(i,1)}else if((m=w.match(/^급소방호(\d+)$/))){op.cg=+m[1];words.splice(i,1)}else if((m=w.match(/^급소\+(\d+)$/))){op.cr=+m[1];words.splice(i,1)}else if((m=w.match(/^알그룹[:：]?(.+)$/))){op.eg=m[1];words.splice(i,1)}
      /* 11-08 망령 「특정 기술일 때는 웹툴 손봐서 — 많이 써」: 기술:이름,이름 · 상대타입:물,불꽃 · 명중×1.1 */
      else if((m=w.match(/^기술[:：](.+)$/))){op.mv=m[1].split(/[,·]/).map(x=>x.trim()).filter(Boolean);words.splice(i,1)}else if((m=w.match(/^상대타입[:：](.+)$/))){op.ft=m[1].split(/[,/·]/).map(x=>KO_TYPE[x.trim()]||x.trim()).filter(Boolean);words.splice(i,1)}else if((m=w.match(/^명중[×x*](\d+(?:\.\d+)?)$/))){op.acc=+m[1];words.splice(i,1)}}
    return op}
   case '상태':{const state=takeState(words);const forced=has('강제');const tl=turns();return {k:'state',state,tgt:tgtOf(words)||'enemy1',count:tl!=null?tl:-1,forced:forced?1:0}}
   case '상태확률':{const state=takeState(words);const ci=words.findIndex(w=>/^\d+%$/.test(w));const chance=ci>=0?+words.splice(ci,1)[0].replace('%',''):100;const pick=has('1체')?'one':'';return {k:'statefx',state,tgt:tgtOf(words)||'enemy1',chance,pick,ask:'',self:0}}
   case '치유':{const ci=words.findIndex(w=>/^\d+%$/.test(w));const chance=ci>=0?+words.splice(ci,1)[0].replace('%',''):100;const tgt=tgtOf(words)||'self';const rest=words.join(',').split(/[,·]/).map(x=>x.trim()).filter(Boolean);const states=(!rest.length||rest.includes('이상')||rest.includes('전부'))?'negative':rest.map(x=>stEn(x)||x);return {k:'cure',tgt,states,chance,self:0}}
   case '회복':{const v=words.find(w=>/^\d+\/\d+$|^\d+$|^전부$/.test(w))||'1/4';words.splice(words.indexOf(v),1);const ty=types();return Object.assign({k:'heal',tgt:tgtOf(words)||'self',value:v==='전부'?'full':v},ty.length?{ytype:ty[0]}:{})}
   case '피해':{const v=words.find(w=>/^\d+\/\d+$|^\d+$/.test(w))||'1/8';words.splice(words.indexOf(v),1);const op={k:'dmg',tgt:'enemy1',value:v,basis:'max'};if(has('현재'))op.basis='cur';if(has('직전'))op.basis='last';if(has('빈사없음'))op.nofaint=1;const ty=types();if(ty.length){op.basis='type';op.atype=ty[0];if(ty.length>1)op.atypes=ty}const xi=words.findIndex(w=>/^제외[:：]?/.test(w));if(xi>=0){op.xtype=KO_TYPE[words[xi].replace(/^제외[:：]?/,'')]||'';words.splice(xi,1)}const si=words.findIndex(w=>/^상태[:：]/.test(w));if(si>=0){op.st=stEn(words[si].replace(/^상태[:：]/,''))||'';words.splice(si,1)}op.tgt=tgtOf(words)||'enemy1';return op}
   case '철거':{const sd=words.includes('상대')?'enemy':words.includes('양쪽')?'both':'self';return {k:'clearobj',side:sd,what:words.includes('장벽')?'wall':words.includes('전부')?'all':'hazard'}}
   case '날씨':{const w=words.shift()||'';if(w==='해제'||w==='초기화')return {k:'weather',w:'',count:0};const c=words.find(x=>/^\d+$|^계속$/.test(x));return {k:'weather',w:w==='무작위'?'random':w,count:c==='계속'?1000:(+c||5)}}
   case '필드':case '룸':{const t=words.shift()||'';if(t==='해제'||t==='초기화')return {k:'terrain',t:'',room:head==='룸',count:0};const c=words.find(x=>/^\d+$|^계속$/.test(x));return {k:'terrain',t,room:head==='룸'||/룸$/.test(t),count:c==='계속'?1000:(+c||5)}}
   case '필드상태':{const e=words.shift()||'';if(e==='해제')return {k:'etc',e:'',count:0};const c=words.find(x=>/^\d+$|^계속$/.test(x));return {k:'etc',e,count:c==='계속'?1000:(+c||5)}}
   case '설치기':{let side='ally';if(has('상대')||has('적진'))side='enemy';has('아군');has('자진');const o=words.shift()||'';const c=words.find(x=>/^\d+$|^계속$/.test(x));return {k:'object',side,o,count:c==='계속'?1000:(+c||5)}}
   case '타입':{const tn=turns();const tgt=tgtOf(words)||'self';let mode='add';if(has('변경'))mode='set';if(has('원래')||has('해제'))mode='reset';has('추가');const ts=words.join(',').split(/[,/·]/).map(x=>KO_TYPE[x.trim()]||x.trim()).filter(Boolean);return Object.assign({k:'type',tgt,mode,types:ts},tn>0&&mode!=='reset'?{turns:tn}:{})}
   /* 11-08 망령 「소지품 파괴 · 변경 · 추가」: 「소지품 파괴|모두파괴|강탈|주기|교환|지정 이름 [대상]」 (붙여 써도 됨: 소지품파괴 상대1체) — 웹툴 OM_ITEMS.itemOp 가 처리 (점착 · 보호 소지품 · 못 빼는 소지품 · 대역인형 검사 같은 길) */
   case '소지품':case '소지품파괴약탈':case '소지품파괴':case '소지품모두파괴':case '소지품전부파괴':case '소지품강탈':case '소지품약탈':case '소지품빼앗기':case '소지품주기':case '소지품건네주기':case '소지품교환':case '소지품맞바꾸기':case '소지품바꾸기':case '소지품지정':case '소지품변경':case '소지품추가':case '소지품더하기':{
    let w=head.replace(/^소지품/,'');if(!w)w=words.shift()||'';const tgt=tgtOf(words)||'enemy1';const M={파괴약탈:'rob','파괴(약탈)':'rob',파괴:'break',부수기:'break',모두파괴:'breakall',전부파괴:'breakall',강탈:'steal',약탈:'steal',빼앗기:'steal',주기:'give',건네주기:'give',교환:'swap',맞바꾸기:'swap',바꾸기:'swap',지정:'set',변경:'set',추가:'add',더하기:'add'};
    if(w==='모두'||w==='전부'){if(words[0]==='파괴')words.shift();w='모두파괴'}const mode=M[w];if(!mode)return {k:'?',raw:line,why:'소지품 뒤에 파괴 · 모두파괴 · 파괴약탈 · 강탈 · 주기 · 교환 · 지정 · 추가 중 하나'};
    if(mode==='set'||mode==='add'){const nmw=words.join(' ').replace(/^「|」$/g,'').trim();if(!nmw)return {k:'?',raw:line,why:(mode==='add'?'소지품추가':'소지품지정')+' 뒤에 소지품 이름'};return {k:'item',mode,tgt,name:nmw}}return {k:'item',mode,tgt}}
   case '특성':{const tu=turns();const tgt=tgtOf(words)||'enemy1';let mode='set';if(has('원래')||has('해제'))mode='reset';has('변경');return Object.assign({k:'trait',tgt,mode,tn:words.join(' ')},tu>0&&mode!=='reset'?{turns:tu}:{})}
   case '반드시':case '반드시교대':{has('교대');const tgt=tgtOf(words)||'self';const tl=turns();return {k:'noind',tgt,mode:has('해제')?'off':'on',kind:'freesw',turns:tl!=null?tl:-1}}
   case '예고':{const state=takeState(words);const pi=words.indexOf('위력');let pow=0;if(pi>=0){pow=n(words[pi+1]||'');words.splice(pi,2)}const ki=words.indexOf('기술');let mv='';if(ki>=0){mv=words[ki+1]||'';words.splice(ki,2)}return {k:'future',state:stEn(state)||state,mv,pow,tgt:tgtOf(words)||'enemy1'}}
   case '변신':{if(has('해제')||has('원래'))return {k:'transform',mode:'reset'};return {k:'transform',tgt:tgtOf(words)||'enemy1',keepImg:has('그림유지')?1:0}}
   case '교대무시':{const tgt=tgtOf(words)||'self';const tl=turns();return {k:'noind',tgt,mode:has('해제')?'off':'on',kind:'switch',turns:tl!=null?tl:-1}}
   case '비례무시':{const tgt=tgtOf(words)||'self';const tl=turns();let kind='';if(has('빈사'))kind='noko';if(has('설치기'))kind='hazard';if(has('설치기피해'))kind='hazdmg';if(has('반동'))kind='recoil';const mode=has('해제')?'off':'on';return {k:'noind',tgt,mode,kind,turns:tl!=null?tl:-1}}
   case '우선도':{const vi=words.findIndex(w=>/^[+\-=]?\d+(\.\d+)?$/.test(w));let v=0,mode='add';if(vi>=0){const w=words.splice(vi,1)[0];if(w.startsWith('='))mode='set';v=n(w)}const tgt=tgtOf(words)||'self';const ty=types();let cat='all';if(has('물리'))cat='물리';if(has('특수'))cat='특수';if(has('변화'))cat='변화';const dur=has('이번턴')?'turn':'keep';if(has('해제'))mode='off';const ti=words.findIndex(w=>/^태그[:：]?/.test(w));const tag=ti>=0?words.splice(ti,1)[0].replace(/^태그[:：]?/,''):'';return {k:'prio',tgt,mode,v,cat,type:ty[0]||'',dur,tag}}
   case '면역':{const tgt=tgtOf(words)||'self';const mode=has('해제')?'off':'on';const states=words.join(',').split(/[,·]/).map(x=>x.trim()).filter(Boolean).map(x=>x==='이상'?'abnormal':(stEn(x)||x));return {k:'immune',tgt,mode,states}}
   case '감소무시':{const tgt=tgtOf(words)||'self';const tl=turns();const mode=has('해제')?'off':'on';/* 11-09 망령 「감소(저하)하지 않는다 — 배율 저하도 막아야지」: 「저하」 · 「배율」 · 「모두」가 있으면 배율 저하(×1 미만)도 막는다 */const mod=has('저하')||has('배율')||has('모두')?1:0;const st=KO_STAT[words.find(w=>KO_STAT[w])||'']||'';return Object.assign({k:'nodrop',tgt,mode,st,turns:tl!=null?tl:-1,ytype:'',ro:[]},mod?{mod:1}:{})}
   case '강화무시':{/* 받음 · 공격시 둘 다 쓰거나 「양방향」이면 주고받을 때 모두 (천진) */const rv=has('받음')||has('받을때'),av=has('공격시'),bo=has('양방향');const dir=bo||(rv&&av)?'both':rv?'recv':'atk';const sc=[];if(has('방어'))sc.push('def');if(has('회피'))sc.push('eva');if(has('공격'))sc.push('atk');if(has('명중'))sc.push('acc');let scope=sc.length?sc.join(','):'both';if(has('양쪽')||has('전부'))scope='both';const dnW=has('감소')||has('저하')||has('하락');const upW=has('상승');const ri=words.findIndex(w=>/^역할[:：]?/.test(w));const ro=ri>=0?words.splice(ri,1)[0].replace(/^역할[:：]?/,'').split(',').filter(Boolean):[];const allR=has('모두')||(dnW&&upW);const lv=has('랭크')?'rank':has('배율')?'mod':'';return Object.assign({k:'ignoreup',dir,scope,on:has('해제')?0:1,mode:0,ro},allR?{all:1}:dnW?{dn:1}:{},lv?{lv}:{})}
   case '하늘위':{const tgt=tgtOf(words)||'self';const tl=turns();return {k:'float',tgt,mode:has('해제')?'off':'on',turns:tl!=null?tl:-1}}
   case '역할':{let mode='add';if(has('제거'))mode='remove';if(has('초기화'))mode='clear';has('추가');return {k:'role',mode,roles:words.join(',').split(/[,·]/).map(x=>x.trim()).filter(Boolean)}}
   case '추격':{const im=has('무시')?1:0;return {k:'pursuit',on:has('해제')?0:1,hide:has('숨김')?1:0,immune:im,tgt:im?(tgtOf(words)||'self'):'self'}}
   case '추격무시':return {k:'pursuit',on:has('해제')?0:1,hide:has('숨김')?1:0,immune:1,tgt:'self'};
   case '확률':case '확률보정':{const tgt=tgtOf(words)||'self';const tl=turns();const ui=words.findIndex(w=>/^\d+회$/.test(w));const uses=ui>=0?+words.splice(ui,1)[0].replace('회',''):-1;if(has('해제'))return {k:'chance',tgt,mode:'off'};if(has('반드시')||has('확정'))return {k:'chance',tgt,sure:1,v:0,uses,turns:tl!=null?tl:-1};const vi=words.findIndex(w=>/^[+\-]?\d+(\.\d+)?(%|%p|할)?$/.test(w));let v=0;if(vi>=0){const w=words.splice(vi,1)[0];v=/할$/.test(w)?n(w)*10:n(w)}return {k:'chance',tgt,v,uses,turns:tl!=null?tl:-1}}
   case '다음기술':case '다음':{has('기술');const tgt=tgtOf(words)||'self';const op={k:'next',tgt};if(has('필중'))op.sure=1;if(has('유턴'))op.uturn=1;if(has('추격'))op.pursuit=1;if(has('확정급소'))op.cx='sure';for(const w of words){let m;if((m=w.match(/^우선도([+\-]\d+)$/)))op.prio=+m[1];else if((m=w.match(/^급소\+(\d+)$/)))op.cr=+m[1];else if((m=w.match(/^위력[×x*](\d+(?:\.\d+)?)$/)))op.pw=+m[1]}return op}
   case '효과해제':case '효과끄기':{const nm=(()=>{const i=words.findIndex(w=>/^이름[:：]/.test(w));return i<0?'':words.splice(i,1)[0].replace(/^이름[:：]/,'')})();const tgt=tgtOf(words)||'self';const what=has('포텐셜')||has('전용')||has('고유')?'pot':has('특성')?'trait':has('소지품')?'item':(has('전부'),'all');return Object.assign({k:'fxoff',what,tgt},nm?{name:nm}:{})}
   case '상태초기화':return {k:'resetstates',tgt:tgtOf(words)||'self',group:has('전부')?'negative':'condition_abnormal'};
   case '은열쇠':return {k:'sk',fx:words.join(' ')};   /* 11-05 망령 「카드 DB 에 자동화 구문 넣어서 웹툴에서 다 자동화」: 은열쇠 카드 효과 — 오레마스 js/sk3_fx.js 가 읽는다 (체크 · 던전 · 배틀 자리마다). fx.run 에서는 아무것도 안 함 */
   case '없음':return {k:'none'};   /* 11-03 22:40 망령 「공용 포텐셜 다 자동화」: 배틀 효과가 없는 포텐셜(바닐라 · 베테랑 · 풍작술 …) — 「자동화 확인」에 「배틀 효과 없음」으로 */
   case '확인':return {k:'confirm',q:words.join(' ').replace(/^["“]|["”]$/g,'')};
   case '상태턴':{const tgt=tgtOf(words)||'self';const vi=words.findIndex(w=>/^[+\-=]\d+$/.test(w));let v=0,mode='add';if(vi>=0){const w=words.splice(vi,1)[0];if(w[0]==='=')mode='set';v=n(w)}const rest=words.join('');const st=rest==='전부'||rest==='모두'?'all':rest==='부정'||rest==='이상'?'neg':stEn(rest)||rest;return {k:'stcount',tgt,st,v,mode}}
   case '조건':{/* 11-08 망령: 조건 명중 [기술:이름,…] [상대타입:물,…] [타입:바위,…] — 자신의 기술이 맞았을 때 (웹툴이 공격을 적용한 뒤 맞은 대상마다 본다) */if(/^명중/.test(words[0]||'')){const op={k:'cond',c:'on_hit'};const ws=words.join(' ').replace(/^명중\s*(?:했을\s*때)?/,'').trim().split(/\s+/).filter(Boolean);for(const x of ws){let q;if((q=x.match(/^기술[:：](.+)$/)))op.mv=q[1].split(/[,·]/).map(y=>y.trim()).filter(Boolean);else if((q=x.match(/^(?:상대|대상)타입[:：](.+)$/)))op.ft=q[1].split(/[,/·]/).map(y=>KO_TYPE[y.trim()]||y.trim()).filter(Boolean);else if((q=x.match(/^(?:기술)?타입[:：](.+)$/)))op.mt=q[1].split(/[,/·]/).map(y=>KO_TYPE[y.trim()]||y.trim()).filter(Boolean)}return op}const w=words.join('');if(/아군빈사/.test(w))return {k:'cond',c:'ally_fainted'};
   /* 11-09 망령 「일반 포텐셜 구문에도 넣어서 자동화 범위 늘리자」: 조건 설치기:끈적끈적네트 (자진 · 땅 위 전용 설치기면 땅 위일 때만) · 조건 적진설치기:X · 조건 타입:벌레 (자신의 타입) · 조건 소모:나무열매 (방금 쓴 소지품 — 웹툴 「소지품 소모」 계기가 알려 준다) */
   {const hz=w.match(/^(적진)?설치기[:：](.+)$/);if(hz)return {k:'cond',c:'hazard',v:hz[2].split(/[,·/]/).map(x=>x.trim()).filter(Boolean),foe:hz[1]?1:0}}
   /* 11-09 망령 「아군 타입 · PT 타입 · 알그룹도 다 넣어 두자」: 조건 아군타입:풀 (자신을 뺀 필드 위 아군 중 하나라도) · 조건 PT타입:풀 (소지 전원이 그 타입 — 벤치 포함) · 조건 PT에타입:풀 (소지에 하나라도) · 조건 아군알그룹:X · 조건 적진알그룹:X · 조건 알그룹:X (자신) */
   {const q=w.match(/^(아군|PT에|PT|적진|상대)?(타입|알그룹|소지품)[:：](.+)$/i);if(q&&(q[1]||q[2]!=='타입')){const isT=q[2]==='타입',isI=q[2]==='소지품';const v=q[3].split(/[,·/]/).map(x=>x.trim()).filter(Boolean).map(x=>isT?(KO_TYPE[x]||x):x);const wh=(q[1]==='상대'?'적진':(q[1]||'자신')).toUpperCase();const c={'아군':'ally','PT에':'pt_any','PT':'pt_all','적진':'foe','자신':'self'}[wh]+(isT?'_type':isI?'_item':'_egg');if(v.length&&c!=='foe_type')return isT?{k:'cond',c,types:v}:isI?{k:'cond',c,items:v}:{k:'cond',c,eggs:v}}}   /* 11-09 망령 「소지품 조건 — 상대 · 자기 · 아군의 소지품이 ~일 때」: 조건 소지품:X · 아군소지품 · 적진(상대)소지품 · PT소지품 · PT에소지품 (나무열매 = 「…열매」 · 쥬얼 = 「…쥬얼」 · 빈손 = 아무것도 안 지님) */
   {const ty=w.match(/^(?:자신)?타입[:：](.+)$/);if(ty){const ts=ty[1].split(/[,·/]/).map(x=>x.trim()).filter(Boolean).map(x=>KO_TYPE[x]||x);if(ts.length)return {k:'cond',c:'self_type',types:ts}}}
   {const us=w.match(/^(?:소모|소지품소모|사용)[:：](.+)$/);if(us)return {k:'cond',c:'used_item',v:us[1].split(/[,·/]/).map(x=>x.trim()).filter(Boolean)}}{const ft=w.match(/^적진타입[:：]?(.+)$/);if(ft){const ts=ft[1].split(/[,·/]/).map(x=>x.trim()).filter(Boolean).map(x=>KO_TYPE[x]||x);if(ts.length)return {k:'cond',c:'foe_type',types:ts}}}{const sm=w.match(/^(?:자신)?상태[:：](.+)$/);if(sm)return {k:'cond',c:'self_state',st:stEn(sm[1])||sm[1]}}const m=w.match(/HP[≤<=]+(\d+\/\d+)/);if(m)return {k:'cond',c:'hp_le',frac:m[1]};return {k:'confirm',q:words.join(' ')}}
   case '해석':return {k:'dex',mode:'scouter'};
   case '레이드':{const m=words.join(' ').match(/구간[:：]?(\d+)/);return {k:'raid',on:1,x:m?+m[1]:'',cond:'cap',floor:1,cure:1,cstat:1,rup:1,rmod:0}}
   /* ----- 11-03 특수 효과(sp) 구문 ----- */
   case '추가공격':{const op={k:'sp',sp:'extra',types:types(),tg:tagW(),cat:has('물리')?'물리':has('특수')?'특수':'',pw:0.25,sure:has('명중판정')?0:1,n:1};const pi=words.findIndex(w=>/^위력/.test(w));if(pi>=0){const v=words.splice(pi,1)[0].replace(/^위력[×x*]?/,'');op.pw=/\//.test(v)?(+v.split('/')[0])/(+v.split('/')[1]||1):(+v||0.25)}const ni=words.findIndex(w=>/^\d+(번|회)$/.test(w));if(ni>=0)op.n=+words.splice(ni,1)[0].replace(/\D/g,'')||1;return op}
   case '보호':{const w=[];if(has('특성'))w.push('trait');if(has('소지품'))w.push('item');if(has('타입'))w.push('type');return {k:'sp',sp:'protect',what:w.length?w:['trait']}}
   case '특성무시':return {k:'sp',sp:'mold'};
   case '해석차단':return {k:'sp',sp:'nodex'};
   case '기술타입':{const fr=types();const to=KO_TYPE[words[words.length-1]]||'';if(!to)return {k:'?',raw:line};words.pop();const mv=words.join(' ').trim();return {k:'sp',sp:'mvtype',mv:mv==='전부'?'':mv,from:fr[0]||'',to}}
   case '지속연장':{const ni=words.findIndex(w=>/^\+?\d+(턴)?$/.test(w));const nn=ni>=0?+words.splice(ni,1)[0].replace(/\D/g,''):3;const what=words.join(',').split(/[,·]/).map(x=>x.trim()).filter(Boolean);return {k:'sp',sp:'ext',what,n:nn||3}}
   case '명중확장':{const fl=has('하늘위');const t0=words.shift()||'';const ts=t0==='전부'?[]:[KO_TYPE[t0]||t0].filter(Boolean);const vs=words.join(',').split(/[,·]/).map(x=>KO_TYPE[x.trim()]||'').filter(Boolean);if(!vs.length&&!fl)return {k:'?',raw:line};return {k:'sp',sp:'scrappy',types:ts,vs,float:fl?1:0}}
   case '추가효과':{const vi=words.findIndex(w=>/^[×x*]?\d+(\.\d+)?$/.test(w));const v=vi>=0?+words.splice(vi,1)[0].replace(/[×x*]/,''):2;return {k:'sp',sp:'secx',v,types:types(),tg:tagW()}}
   case '끌어오기':return {k:'sp',sp:'redirect',types:types(),tg:tagW(),cat:has('변화기')?'변화':has('물리')?'물리':has('특수')?'특수':''};
   case '반사':{has('변화기');return {k:'sp',sp:'bounce',cat:'변화'}}
   /* 11-06 망령 「『HP : 1/2 이하』일 때 『우드혼』을 내보낼 때 【수세】가 적용된다」: 공격을 지시받아도 그 기술이면 자신의 【수세】 효과가 켜진 채.
      수세유지 [기술:우드혼,…] [타입:풀] [물리|특수] [HP≤1/2] — 기술 · 타입 · 분류를 안 쓰면 모든 공격 기술 */
   case '수세유지':{const hi=words.findIndex(w=>/^HP\s*[≤<=]+\s*\d+\/\d+$/.test(w));const hp=hi>=0?words.splice(hi,1)[0].replace(/^HP\s*[≤<=]+\s*/,''):'';const mi=words.findIndex(w=>/^기술[:：]/.test(w));const mv=mi>=0?words.splice(mi,1)[0].replace(/^기술[:：]/,'').split(/[,·]/).map(x=>x.trim()).filter(Boolean):[];const ty=types();const cat=has('물리')?'물리':has('특수')?'특수':'';const rest=words.join(' ').trim();if(rest&&!mv.length)mv.push(...rest.split(/[,·]/).map(x=>x.trim()).filter(Boolean));return {k:'sp',sp:'keepdef',mv,types:ty,cat,hp}}
   case '임의교대':return {k:'freeswitch'};
   /* 11-08 망령 「돌던지기가 물 타입에 명중하면 대상을 강제 교대」: 강제교대 [대상 · 상대1체 · 상대전체 …] — 배턴터치 없이, 벤치에서 무작위 1마리 (흡반 · 뿌리박기 · 교대무시는 웹툴이 막는다) */
   case '강제교대':{const tgt=tgtOf(words)||'enemy1';return {k:'forceswitch',tgt}}
   case '초읽기':{const n=+((words.join(' ').match(/\d+/)||[])[0]||1);return {k:'countdown',n:Math.max(1,n)}}   /* 11-05 망령 「초읽기」 */
   case '기술사용':{const ti=words.findIndex(w=>/^최고[:：]/.test(w));let top=[];if(ti>=0){top=words.splice(ti,1)[0].replace(/^최고[:：]/,'').split(/[,·\/]/).map(x=>KO_STAT[x.trim()]||'').filter(Boolean)}const mv=words.join(' ').replace(/[「」]/g,'').trim();if(!mv)return {k:'?',raw:line};const op={k:'usemove',mv};if(top.length)op.top=top;return op}   /* 11-03 망령: 「이때, 「공격」을 가장 높은 종족치와 같은 랭크로」 = 그 기술 한 번만 → 최고:공격 */
   case '종족치':{/* 시트 종족치: 종족치 방어,특방 +1 · 종족치 스피드 최대 — 제작기가 시트 종족치 · 실수치에 넣는다 (배틀 중엔 바꾸지 않는다) */const all=words.join(' ');const mx=/최대/.test(all);const tp=/최고/.test(all);const mm=all.match(/(^|\s)([+\-]?\d+)/);const nn=mm?+mm[2]:1;const st=[];for(const w of words)for(const s of w.split(/[,\/·]/)){const t=s.trim().toUpperCase()==='HP'?'HP':s.trim();if(['HP','공격','방어','특공','특방','스피드'].includes(t)&&!st.includes(t))st.push(t)}if(!st.length||(!mx&&!tp&&!nn))return {k:'?',raw:line};if(tp)return {k:'baseup',stats:st,n:0,max:0,top:1};return {k:'baseup',stats:st,n:mx?0:nn,max:mx?1:0}}
   /* 11-02 망령 「실수치 변경 매크로」: 시트형(제작기 시트 실수치에 더함) · 배틀형(배틀 중 실수치 · 교대하면 원래대로) */
   case '실수치':{const st=[];for(const w of words)for(const x of w.split(/[,\/·]/)){const t=x.trim().toUpperCase()==='HP'?'HP':x.trim();if(['HP','공격','방어','특공','특방','스피드'].includes(t)&&!st.includes(t))st.push(t)}const cpm=words.join(' ').match(/=\s*(공격|방어|특공|특방|스피드)/);if(cpm){const st2=st.filter(x=>x!=='HP'&&x!==cpm[1]);if(!st2.length)return {k:'?',raw:line};return {k:'statadd',stats:st2,copy:cpm[1]}}const mm=words.join(' ').match(/(^|\s)([+\-]\d+)/);if(!st.length||!mm)return {k:'?',raw:line};return {k:'statadd',stats:st,n:+mm[2]}}
   case '실수치변경':{const tg=tgtOf(words);const st=[];for(const w of words)for(const x of w.split(/[,\/·]/)){const t=x.trim();if(['공격','방어','특공','특방','스피드'].includes(t)&&!st.includes(t))st.push(t)}const all=words.join(' ');let mode='',n=0,m,from='';
    if((m=all.match(/=\s*(공격|방어|특공|특방|스피드)/))){mode='copy';from=m[1];const k=st.indexOf(from);if(k>=0)st.splice(k,1)}else if((m=all.match(/(^|\s)=\s*(\d+)/))){mode='set';n=+m[2]}else if((m=all.match(/(^|\s)([+\-]\d+)/))){mode='add';n=+m[2]}else if((m=all.match(/[×x*]\s*(\d+(?:\.\d+)?)/))){mode='mul';n=+m[1]}else if(/교환/.test(all))mode='swap';else if(/평균/.test(all))mode='avg';else if(/맞바꿈|서로/.test(all))mode='flip';
    if(!st.length||!mode||(mode==='flip'&&st.length!==2))return {k:'?',raw:line};return Object.assign({k:'statset',stats:st,mode,n,tgt:tg||(mode==='swap'||mode==='avg'?'enemy1':'self')},from?{from}:{})}
   case '상태수정':case '상태사양':{const st=stEn(takeState(words));const f=words.map(w=>w.match(/^(\d+)\s*\/\s*(\d+)$/)).find(Boolean);if(!st||!f)return {k:'?',raw:line};return {k:'stmod',st,n:+f[1],d:+f[2]}}
   default:return {k:'?',raw:line}}}
 /* 여러 줄 구문: 「선택:」 뒤의 「- 라벨 → 구문; 구문」 줄들은 선택지 */
 /* 「선택:」 은 하나만, 「선택 여럿:」(복수 선택: · 다중 선택:) 은 여러 개를 고를 수 있다 */
 const CHO=/^(선택|(복수|다중)\s*선택|선택\s*\(?(여럿|복수|다중)\)?)[:：]?$/,CHM=/복수|다중|여럿/;
 function parse(text){const ops=[];const errs=[];let choice=null;
  /* 「;」 는 줄바꿈과 같지만, 선택지 줄(「- 라벨 → …」) 안의 「;」 는 그 선택지의 명령 구분으로 남긴다 */
  /* 10-23 망령: 「선택」 다음 줄이 「-」 없이 바로 구문이면(캐스터: 선택 / 랭크 아군1체 특공+1 / 랭크 아군1체 특방+1) 그 줄 하나하나가 선택지 — 빈 줄에서 끝 */
  const lines=[];let inChoice=false,bare=null;for(const row of String(text||'').split('\n')){const t=row.trim();if(CHO.test(t)){inChoice=true;bare=null;lines.push(t);continue}if(inChoice&&/^[-·•]/.test(t)){if(bare==null)bare=false;lines.push(t);continue}if(inChoice&&t&&bare!==false){bare=true;lines.push('- '+t+' → '+t);continue}inChoice=false;bare=null;for(const part of row.split(';')){const pt=part.trim();if(CHO.test(pt))inChoice=true;lines.push(part)}}
  for(const raw of lines){const line=raw.trim();if(!line)continue;
   if(CHO.test(line)){choice={k:'choice',opts:[]};if(CHM.test(line))choice.multi=1;ops.push(choice);continue}
   if(choice&&/^[-·•]/.test(line)){const t=line.replace(/^[-·•]\s*/,'');const ai=t.search(/→|->/);const label=(ai<0?t:t.slice(0,ai)).trim();const body=ai<0?'':t.slice(ai).replace(/^(→|->)/,'');const sub=[];for(const seg of body.split(/[;；]\s*|[,，]\s*(?=[가-힣]+\s)/)){const op=parseLine(seg);if(op&&op.k!=='?')sub.push(op);else if(op)errs.push(op.raw)}choice.opts.push({label,ops:sub});continue}
   choice=null;const op=parseLine(line);if(!op)continue;if(op.k==='?')errs.push(op.raw+(op.why?' — '+op.why:''));else ops.push(op)}
  return {ops,errs}}
 function unparse(ops){const L0=unparse0(ops);return L0.map((s,i)=>{const op=(ops||[])[i]||{};if(op.k==='choice')return s;return (op.p?(op.p%10===0?op.p/10+'할 ':op.p+'% '):op.pl?op.pl+' ':'')+s+(op.ttype&&op.ttype.length?' 대상타입:'+op.ttype.map(t=>TYPE_KO[t]||t).join(','):'')+(op.hold?' 있는한':'')})}
 function unparse0(ops){const L=[];const tg=t=>t&&t!=='self'?' '+(TGT_KO[t]||t).replace(/\s/g,''):'';const ty=ts=>ts&&ts.length?' 타입:'+ts.map(t=>TYPE_KO[t]||t).join(','):'';
  const tga=t=>' '+(TGT_KO[t||'enemy1']||t).replace(/\s/g,'');
  for(const op of ops||[]){switch(op.k){
   case 'rank':case 'mult':L.push((op.k==='rank'?'랭크':'배율')+tg(op.tgt)+' '+[...Object.entries(op.stats||{}).map(([k,v])=>STAT_KO[k]+(op.k==='rank'?(v>0?'+':'')+v:'×'+v)),...(op.rnd?['무작위'+(op.rnd.n>1?op.rnd.n+'개':'')+(op.k==='rank'?(op.rnd.v>0?'+':'')+op.rnd.v:'×'+op.rnd.v)]:[]),...((op.picks||[]).map(p=>(p.lo?'최저':'최고')+(op.k==='rank'?(p.v>0?'+':'')+p.v:'×'+p.v))),...((op.picks||[]).some(p=>p.spd!=null)?['스피드면'+(op.k==='rank'?(op.picks[0].spd>0?'+':'')+op.picks[0].spd:'×'+op.picks[0].spd)]:[]),...(op.from==='front'?['기준:정면']:[])].join(' ')+(op.rnd&&op.rnd.pool==='7'?' 명중회피포함':'')+(op.temp?' 임시':'')+(op.forced?' 강제':''));break;
   case 'reset':L.push('초기화 '+({rank:'랭크',mult:'배율'}[op.what]||'전부')+tg(op.tgt));break;
   case 'boost':case 'guard':case 'eva':{let s=(op.k==='boost'?'위력':op.k==='eva'?'회피':'완화')+' ×'+op.v+tg(op.tgt)+ty(op.types);if(op.cat==='physical')s+=' 물리';if(op.cat==='special')s+=' 특수';if(op.eff==='super')s+=' 굉장';if(op.eff==='weak')s+=' 별로';if(op.eff==='normal')s+=' 보통';if(op.rng==='single')s+=' 단일';if(op.rng==='multi')s+=' 전체기';if(op.sb==='stab')s+=' 자속';if(op.sb==='nonstab')s+=' 비자속';if(op.tg&&op.tg.length)s+=' 태그:'+op.tg.join(',');if(op.pmin)s+=' 위력≥'+op.pmin;if(op.pmax)s+=' 위력≤'+op.pmax;if(op.ro&&op.ro.length)s+=' 역할:'+op.ro.join(',');if(op.st==='def')s+=' 수세';if(op.st==='off')s+=' 공세';if(op.cg)s+=' 급소방호'+op.cg;if(op.cr)s+=' 급소+'+op.cr;if(op.cx==='sure')s+=' 확정급소';if(op.cx==='none')s+=' 급소없음';if(op.ed)s+=' 견딤';if(op.df)s+=' 미룸';if(op.hf)s+=' HP가득';if(op.eg)s+=' 알그룹:'+op.eg;if(op.mv&&op.mv.length)s+=' 기술:'+op.mv.join(',');if(op.ft&&op.ft.length)s+=' 상대타입:'+op.ft.map(t=>TYPE_KO[t]||t).join(',');if(op.acc&&+op.acc!==1)s+=' 명중×'+op.acc;if(op.uses>0)s+=' '+op.uses+'회';if(op.turn)s+=' 이번턴';if(op.tl>0)s+=' '+op.tl+'턴';if(op.remove)s+=' 해제';L.push(s);break}
   case 'state':L.push('상태 '+stKoW(op.state)+tga(op.tgt)+(op.count>0?' '+op.count+'턴':'')+(op.forced?' 강제':''));break;
   case 'statefx':L.push('상태확률 '+stKoW(op.state)+' '+op.chance+'%'+tga(op.tgt)+(op.pick==='one'?' 1체':''));break;
   case 'cure':L.push('치유'+tg(op.tgt)+' '+(op.states==='negative'?'이상':op.states.map(stKoW).join(','))+(op.chance&&op.chance<100?' '+op.chance+'%':''));break;
   case 'heal':L.push('회복 '+(op.value==='full'?'전부':op.value)+tg(op.tgt)+(op.ytype?ty([op.ytype]):''));break;
   case 'dmg':L.push('피해 '+op.value+tga(op.tgt)+(op.basis==='cur'?' 현재':op.basis==='last'?' 직전':op.basis==='type'?ty(op.atypes&&op.atypes.length?op.atypes:[op.atype]):'')+(op.xtype?' 제외:'+(TYPE_KO[op.xtype]||op.xtype):'')+(op.st?' 상태:'+stKo(op.st):'')+(op.nofaint?' 빈사없음':''));break;
   case 'weather':L.push(op.w?'날씨 '+(op.w==='random'?'무작위':op.w)+' '+(op.count>=1000?'계속':op.count):'날씨 해제');break;
   case 'terrain':L.push((op.room?'룸 ':'필드 ')+(op.t?op.t+' '+(op.count>=1000?'계속':op.count):'해제'));break;
   case 'etc':L.push('필드상태 '+(op.e?op.e+' '+(op.count>=1000?'계속':op.count):'해제'));break;
   case 'clearobj':L.push('철거 '+(op.side==='enemy'?'상대 ':op.side==='both'?'양쪽 ':'아군 ')+(({hazard:'설치기',wall:'장벽',all:'전부'})[op.what||'hazard']));break;
   case 'object':L.push('설치기 '+(op.side==='enemy'?'상대 ':'아군 ')+op.o+(op.count&&op.count!==5?' '+(op.count>=1000?'계속':op.count):''));break;
   case 'type':L.push('타입'+tg(op.tgt)+' '+({add:'추가',set:'변경',reset:'원래'})[op.mode]+(op.mode==='reset'?'':' '+(op.types||[]).map(t=>TYPE_KO[t]||t).join(','))+(op.turns>0?' '+op.turns+'턴':''));break;
   case 'trait':L.push('특성'+tga(op.tgt)+' '+(op.mode==='reset'?'원래':'변경 '+op.tn)+(op.turns>0?' '+op.turns+'턴':''));break;
   case 'item':L.push('소지품'+({rob:'파괴약탈',break:'파괴',breakall:'모두파괴',steal:'강탈',give:'주기',swap:'교환',set:'지정',add:'추가'})[op.mode]+tga(op.tgt)+(op.mode==='set'||op.mode==='add'?' '+(op.name||''):''));break;
   case 'future':L.push('예고 '+stKoW(op.state)+(op.mv&&op.mv!==stKo(op.state)?' 기술 '+op.mv:'')+(op.pow?' 위력 '+op.pow:'')+tga(op.tgt||'enemy1'));break;
   case 'transform':L.push(op.mode==='reset'?'변신 해제':'변신'+tga(op.tgt||'enemy1')+(op.keepImg?' 그림유지':''));break;
   case 'noind':if(op.kind==='freesw'){L.push('반드시 교대'+tg(op.tgt)+(op.turns>0?' '+op.turns+'턴':'')+(op.mode==='off'?' 해제':''));break}if(op.kind==='switch'){L.push('교대무시'+tg(op.tgt)+(op.turns>0?' '+op.turns+'턴':'')+(op.mode==='off'?' 해제':''));break}L.push('비례무시'+tg(op.tgt)+({'':'',noko:' 빈사',hazard:' 설치기',hazdmg:' 설치기피해',recoil:' 반동'})[op.kind||'']+(op.turns>0?' '+op.turns+'턴':'')+(op.mode==='off'?' 해제':''));break;
   case 'prio':L.push('우선도 '+(op.mode==='set'?'=':(op.v>0?'+':''))+op.v+tg(op.tgt)+(op.type?ty([op.type]):'')+(op.cat&&op.cat!=='all'?' '+op.cat:'')+(op.tag?' 태그:'+op.tag:'')+(op.dur==='turn'?' 이번턴':'')+(op.mode==='off'?' 해제':''));break;
   case 'immune':L.push('면역'+tg(op.tgt)+' '+(op.states||[]).map(s=>s==='abnormal'?'이상':stKoW(s)).join(',')+(op.mode==='off'?' 해제':''));break;
   case 'nodrop':L.push('감소무시'+tg(op.tgt)+(op.st?' '+STAT_KO[op.st]:'')+(op.mod?' 저하':'')+(op.turns>0?' '+op.turns+'턴':'')+(op.mode==='off'?' 해제':''));break;
   case 'ignoreup':L.push('강화무시 '+(op.dir==='both'?'양방향':op.dir==='recv'?'받음':'공격시')+' '+(op.scope==='both'||!op.scope?'양쪽':String(op.scope).split(',').map(x=>SCOPE_KO[x]||x).join(' '))+(op.all?' 모두':op.dn?' 감소':'')+iuLv(op.lv)+(op.ro&&op.ro.length?' 역할:'+op.ro.join(','):'')+(op.on?'':' 해제'));break;
   case 'float':L.push('하늘위'+tg(op.tgt)+(op.turns>0?' '+op.turns+'턴':'')+(op.mode==='off'?' 해제':''));break;
   case 'role':L.push('역할 '+({add:'추가',remove:'제거',clear:'초기화'})[op.mode]+' '+(op.roles||[]).join(','));break;
   case 'pursuit':L.push('추격'+(op.immune?' 무시'+tg(op.tgt):'')+(op.on?'':' 해제')+(op.hide?' 숨김':''));break;
   case 'fxoff':L.push('효과해제'+tg(op.tgt)+(op.name?' 이름:'+op.name:' '+({pot:'포텐셜',trait:'특성',item:'소지품'}[op.what]||'전부')));break;
   case 'resetstates':L.push('상태초기화'+tg(op.tgt)+(op.group==='negative'?' 전부':''));break;
   case 'confirm':L.push('확인 "'+op.q+'"');break;
   case 'tsel':L.push('대상지정 '+({enemy1:'상대1체',ally1:'아군1체',ally1s:'자신포함아군1체',any1:'아무나1체'}[op.tgt]||'상대1체'));break;
   case 'none':L.push('없음');break;case 'sk':L.push('은열쇠 '+(op.fx||''));break;
   case 'cond':L.push('조건 '+(op.c==='on_hit'?'명중'+(hitDesc(op)?' '+hitDesc(op):''):op.c==='ally_fainted'?'아군빈사':op.c==='self_state'?'상태:'+stKoW(op.st):op.c==='foe_type'?'적진타입 '+(op.types||[]).map(t=>TYPE_KO[t]||t).join(','):op.c==='hazard'?(op.foe?'적진설치기:':'설치기:')+(op.v||[]).join(','):op.c==='self_type'?'타입:'+(op.types||[]).map(t=>TYPE_KO[t]||t).join(','):/^(ally|pt_any|pt_all|foe|self)_(type|egg|item)$/.test(op.c)?({ally:'아군',pt_any:'PT에',pt_all:'PT',foe:'적진',self:''})[op.c.replace(/_(type|egg|item)$/,'')]+(/_type$/.test(op.c)?'타입:'+(op.types||[]).map(t=>TYPE_KO[t]||t).join(','):/_item$/.test(op.c)?'소지품:'+(op.items||[]).join(','):'알그룹:'+(op.eggs||[]).join(',')):op.c==='used_item'?'소모:'+(op.v||[]).join(','):'HP≤'+op.frac));break;
   case 'stcount':L.push('상태턴'+tg(op.tgt)+' '+(op.st==='all'?'전부':op.st==='neg'?'부정':stKoW(op.st))+' '+(op.mode==='set'?'=':(op.v>=0?'+':''))+op.v);break;
   case 'choice':L.push((op.multi?'선택 여럿:':'선택:')+'\n'+op.opts.map(o=>'- '+o.label+' → '+unparse(o.ops).join('; ')).join('\n'));break;
   case 'chance':L.push(op.mode==='off'?'확률 해제'+tg(op.tgt):'확률 '+(op.sure?'반드시':(op.v>0?'+':'')+op.v+'%')+tg(op.tgt)+(op.uses>0?' '+op.uses+'회':'')+(op.turns>0?' '+op.turns+'턴':''));break;
   case 'next':L.push('다음기술'+tg(op.tgt)+(op.sure?' 필중':'')+(op.uturn?' 유턴':'')+(op.pursuit?' 추격':'')+(op.prio?' 우선도'+(op.prio>0?'+':'')+op.prio:'')+(op.cr?' 급소+'+op.cr:'')+(op.cx==='sure'?' 확정급소':'')+(op.pw&&+op.pw!==1?' 위력×'+op.pw:''));break;
   case 'raid':L.push('레이드'+(op.x?' 구간:'+op.x:''));break;case 'dex':L.push('해석');break;
   case 'baseup':L.push('종족치 '+op.stats.join(',')+' '+(op.top?'최고':op.max?'최대':(op.n>0?'+':'')+op.n));break;
   case 'sp':{const T=op.types&&op.types.length?' 타입:'+op.types.map(t=>TYPE_KO[t]||t).join(','):'',G=op.tg&&op.tg.length?' 태그:'+op.tg.join(','):'',C=op.cat?' '+op.cat:'';
    L.push(({extra:()=>'추가공격'+T+G+C+(+op.pw!==0.25?' 위력×'+op.pw:'')+(op.sure?'':' 명중판정')+(op.n>1?' '+op.n+'번':''),protect:()=>'보호 '+(op.what||['trait']).map(w=>w==='item'?'소지품':w==='type'?'타입':'특성').join(' '),mold:()=>'특성무시',nodex:()=>'해석차단',
     mvtype:()=>'기술타입 '+(op.from?'타입:'+(TYPE_KO[op.from]||op.from):(op.mv||'전부'))+' '+(TYPE_KO[op.to]||op.to),ext:()=>'지속연장 '+((op.what||[]).join(',')||'날씨')+' +'+op.n,scrappy:()=>'명중확장 '+(op.types&&op.types.length?(TYPE_KO[op.types[0]]||op.types[0]):'전부')+((op.vs||[]).length?' '+op.vs.map(t=>TYPE_KO[t]||t).join(','):'')+(op.float?' 하늘위':''),
     evade:()=>'회피 '+(op.pct%10===0?op.pct/10+'할':op.pct+'%')+T+G+C,secx:()=>'추가효과 ×'+op.v+T+G,redirect:()=>'끌어오기'+T+G+(op.cat?' '+(op.cat==='변화'?'변화기':op.cat):''),bounce:()=>'반사 변화기',keepdef:()=>'수세유지'+((op.mv||[]).length?' 기술:'+op.mv.join(','):'')+T+C+(op.hp?' HP≤'+op.hp:'')}[op.sp]||(()=>'# '+JSON.stringify(op)))()+(op.tgt&&op.tgt!=='self'?' '+(TGT_KO[op.tgt]||op.tgt).replace(/\s/g,''):''));break}
   case 'freeswitch':L.push('임의교대');break;
   case 'forceswitch':L.push('강제교대'+tga(op.tgt));break;
   case 'countdown':L.push('초읽기'+(+op.n>1?' '+op.n:''));break;
   case 'usemove':L.push('기술사용 '+op.mv+(op.top&&op.top.length?' 최고:'+op.top.map(k=>STAT_KO[k]||k).join(','):''));break;
   case 'statadd':L.push('실수치 '+op.stats.join(',')+' '+(op.copy?'='+op.copy:(op.n>0?'+':'')+op.n));break;
   case 'statset':L.push('실수치변경 '+op.stats.join(',')+' '+({add:(op.n>0?'+':'')+op.n,set:'='+op.n,mul:'×'+op.n,swap:'교환',avg:'평균',flip:'맞바꿈',copy:'='+(op.from||'')}[op.mode]||'')+tga(op.tgt||'self'));break;
   case 'stmod':L.push('상태수정 '+stKoW(op.st)+' '+op.n+'/'+op.d);break;
   default:L.push('# '+JSON.stringify(op))}}
  return L}
 /* 사람이 읽는 설명 (미리보기·로그) */
 function describe(ops){return unparse(ops)}
 return {nodropHit,hitOk,hitDesc,syncPairs,roleFam,roleFams,ROLE_FAM,spOf,spDesc,SP_KO,reAura,effOf,rmChance,rollP,lineChance,release,nextOf,scopeKo,chanceOf,setAb,resetAb,stMod,untransform,FUTURE,rm,rmAll,autoOf,run,attackMods,evaMods,accMods,consume,prioOf,turnEnd,chips,remove,removeAll,removeByName,timing,percentOf,percentBase,parse,unparse,describe,noind,noindName,floating,terrainBlock,weatherBlock,magicRoom,itemOff,abSync,holds,useItem,immuneHit,nodropHit,liveMods,modDesc,TGT_KO,STAT_KO,TYPE_KO,NEG,ABN,stEn,stKo};
})();
