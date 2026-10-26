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
 const TGT_KO={self:'자신',ally:'아군 전체',enemy:'상대 전체',others:'자신 이외',all:'전체',ally1:'아군 1체',adj:'옆 아군',enemy1:'상대 1체',front:'정면',randother:'자신 이외 무작위 1체',randenemy:'상대 무작위 1체',randall:'전원 무작위 1체',area:'지정 에리어'};
 const KO_TGT={정면:'front',정면의상대:'front',옆아군:'adj',옆에선아군:'adj',자신:'self',아군전체:'ally',아군:'ally',상대전체:'enemy',상대:'enemy',자신이외:'others',전체:'all',아군1체:'ally1',아군1:'ally1',상대1체:'enemy1',상대1:'enemy1',무작위1:'randother',자신이외무작위:'randother',상대무작위:'randenemy',전원무작위:'randall',무작위1체:'randother',자신이외무작위1체:'randother',자신이외무작위1:'randother',상대무작위1체:'randenemy',상대무작위1:'randenemy',전원무작위1체:'randall',전원무작위1:'randall',에리어:'area',지정에리어:'area'};
 const TYPE_KO={Normal:'노말',Fire:'불꽃',Water:'물',Electric:'전기',Grass:'풀',Ice:'얼음',Fighting:'격투',Poison:'독',Ground:'땅',Flying:'비행',Psychic:'에스퍼',Bug:'벌레',Rock:'바위',Ghost:'고스트',Dragon:'드래곤',Dark:'악',Steel:'강철',Fairy:'페어리',God:'신',Shadow:'그림자',Wild:'야생'};
 const KO_TYPE={};for(const k in TYPE_KO)KO_TYPE[TYPE_KO[k]]=k;
 const NEG=['Poison','Toxic','Burn','Paralysis','Freeze','Sleep','SyrupBomb','Confusion','Flinch','Embrago','Silence','Seal','Powder','Oblivion','TraitBroken','Taunt','Encore','Attract','HealBlock','Disable','Torrment','MeanLook','Bind','OctoLock','Block','Curse','LeechSeed','SaltCure','Nightmare','Yawn','DeathCount','LockOn','Telekinesis'];
 const FUTURE=['FutureSight','SpontaneousCombustion','ThunderClouds','Rockfallism','StormWarning','TsunamiWarning','InsectInvasion','DoomDesire','SwarmAttack','DarknessOfTheEnd'];
 const ABN=['Poison','Toxic','Burn','Paralysis','Freeze','Sleep'];
 const stDB=()=>((DB().states||{}).st)||{};
 const stKo=k=>(stDB()[k]||{}).ko||k;
 const stKoW=k=>String(stKo(k)).replace(/\s+/g,'');/* 구문에 쓸 때는 띄어쓰기를 뺀다 */
 function stEn(kor){kor=String(kor||'').trim();const st=stDB();if(st[kor])return kor;for(const k in st)if(st[k].ko===kor)return k;const nk=kor.replace(/\s+/g,'');if(nk)for(const k in st)if(String(st[k].ko||'').replace(/\s+/g,'')===nk)return k;return ''}
 /* 띄어쓰기가 든 상태 이름(「구멍 안」 등)도 한 낱말로 읽도록, 앞 낱말들을 이어 붙여 가장 긴 상태 이름을 찾는다 */
 function takeState(words){for(let n=Math.min(words.length,4);n>1;n--){const j=words.slice(0,n).join('');if(stEn(j)){words.splice(0,n);return stKo(stEn(j))}}return words.shift()}
 const typesOf=m=>(m.teraActive&&m.teraEn&&m.teraEn!=='-')?[m.teraEn]:(m.types||[]).filter(t=>t&&t!=='-');
 const frac=(base,v)=>{v=String(v||'').trim();const m=v.match(/^(\d+)\s*\/\s*(\d+)$/);if(m)return Math.max(1,Math.floor(base*+m[1]/+m[2]));const n=+v;return isNaN(n)?0:Math.floor(n)};
 const fx=m=>{m.fx=m.fx||{mods:[],noind:[],prio:[],immune:[],nodrop:[],roles:[]};for(const k of ['mods','noind','prio','immune','nodrop','roles','mults','chance'])m.fx[k]=m.fx[k]||[];return m.fx};
 const alive=m=>m&&m.hp&&m.hp.cur>0;

 /* ===== 레디메이드 찾기: 방 덮어쓰기(dbx.rm) → 기본 ===== */
 function rmAll(){const base=DB().readymade||{};const ov=(((window.OM_APP||{}).ST||{}).state||{}).dbx;const o=(ov&&ov.rm)||{};const ed=typeof window.MKM_RM==='function'?window.MKM_RM():null;/* 제작기 DB 관리의 레디메이드 행이 기본을 덮고, 방의 dbx.rm 이 그 위를 덮는다 */const all=Object.assign({},base,ed||{},o);for(const k in all)if(all[k]&&all[k].deleted)delete all[k];return all}
 function rm(name){if(!name)return null;const all=rmAll();name=String(name).replace(/『|』/g,'').trim();return all[name]||null}
 /* 포켓몬의 포텐셜/특성/소지품에 붙은 자동화: 개별 구문(m.auto[name]) → 레디메이드 */
 function autoOf(m,kind,name){name=String(name||'').replace(/『|』/g,'').trim();const own=(m&&m.auto||{})[name];if(own&&own.ops)return Object.assign({name,src:'own'},own);
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
 async function targets(b,self,tgt,ctx){const tm=teamOf(b,self);const live=Object.values(b.mons||{}).filter(m=>m.entry&&alive(m));const allies=live.filter(m=>teamOf(b,m)===tm),enemies=live.filter(m=>teamOf(b,m)!==tm);
  const pick=async(list,label)=>{if(!list.length)return [];if(list.length===1)return [list[0]];if(ctx.pick)return [await ctx.pick(list,label)].filter(Boolean);return [list[0]]};
  const rnd=list=>list.length?[list[Math.floor(Math.random()*list.length)]]:[];
  switch(tgt){case 'self':return [self];case 'ally':return allies.length?allies:[self];case 'enemy':return enemies;case 'others':return [...allies,...enemies].filter(m=>m.id!==self.id);case 'all':return [...allies,...enemies];
   case 'ally1':return pick(allies.filter(m=>m.id!==self.id),'아군 1체');case 'ally1s':return pick(allies,'아군 1체');   /* 자신 포함 (트레이너 카드 · 10-26) */case 'enemy1':return pick(enemies,'상대 1체');case 'front':{/* 정면: 맞은편 진영의 같은 에리어 (좌 B ↔ 우 B) — 비었으면 상대 1체를 고른다 (10-26 FFA 시험) */const f=enemies.filter(m=>m.side!==self.side&&m.entry===self.entry);return f.length?[f[0]]:pick(enemies,'정면이 비었다 — 상대 1체')}case 'randother':return rnd([...allies,...enemies].filter(m=>m.id!==self.id));case 'randenemy':return rnd(enemies);case 'randall':return rnd([...allies,...enemies]);
   case 'adj':{const AR=['a','b','c'];const i=AR.indexOf(self.entry);return allies.filter(m=>m.id!==self.id&&i>=0&&Math.abs(AR.indexOf(m.entry)-i)===1)}   /* 옆에 선 아군: 에리어 a-b-c 에서 바로 옆 칸 (B 는 A·C 둘 다) */
   case 'area':{if(ctx.area){const m=allies.find(x=>x.entry===ctx.area);if(m)return [m]}return pick(allies,'에리어')}default:return [self]}}

 /* ===== 실행 ===== */
 /* ctx: {b(사본), self(포켓몬), name(효과 이름), area?, pick(list,label)->mon, confirm(q)->bool, choose(labels,multi)->idx[]} */
 /* 지금 필드: run 중이면 그 사본을 본다 (필드의 상태이상 방어 · 매직룸) */
 let RUNB=null;
 function fieldNow(){const b=RUNB||(((window.OM_APP||{}).ST||{}).state||{}).battle||{};return b.field||{}}
 function magicRoom(){return +(((fieldNow().rooms)||{})['매직룸']||0)>0}
 /* 매직룸 동안 소지품에서 온 효과는 잠든다 (이름이 지금 소지품과 같은 항목) */
 function itemOff(m,e){return !!(m&&m.item&&e&&e.name===String(m.item).replace(/『|』/g,'').trim()&&magicRoom())}
 function groundedX(m){const F=window.OM_FIELD;return F&&F.grounded?F.grounded(m):!typesOf(m).includes('Flying')}
 /* 땅 위 포켓몬: 미스트필드는 상태 이상·혼란, 일렉트릭필드는 잠듦·하품을 막는다 */
 function sideObj(m,k){return !!(m&&m.side&&+((((fieldNow().objects)||{})[m.side]||{})[k]||0)>0)}
 function terrainBlock(m,en){const t=(fieldNow().terrain||{}).type;if(!t||!m||!groundedX(m))return '';if(t==='미스트필드'&&(ABN.includes(en)||en==='Confusion'))return t;if(t==='일렉트릭필드'&&(en==='Sleep'||en==='Yawn'))return t;return ''}
 /* 지속 턴 +3 소지품 (2026-10-23): 자신이 기술·특성으로 깐 날씨 · 필드 · 벽. 매직룸 중에는 없음 */
 const EXT_ITEM={'맑음':'뜨거운바위','비':'축축한바위','모래바람':'보송보송바위','눈':'차가운바위','싸라기눈':'차가운바위','별하늘':'별이박힌바위','밤':'거무칙칙한바위','짙은안개':'습한바위','필드':'그라운드코트','리플렉터':'빛의점토','빛의장막':'빛의점토','오로라베일':'빛의점토'};
 function itemExt(self,what){const it=self&&self.item?String(self.item).replace(/『|』/g,'').trim():'';return it&&EXT_ITEM[what]===it&&!magicRoom()?it:''}
 /* 이 효과의 중첩 한도: ctx.stack → 포켓몬 포텐셜 글 · 트레이너 고유 · 레디메이드 글의 【중첩 (N회)】. 없으면 1 */
 function stackOf(self,name,ctx){if(ctx&&+ctx.stack>0)return +ctx.stack;const nm=String(name||'').replace(/『|』/g,'').trim();const re=/【\s*중첩\s*\(\s*(\d+)\s*회\s*\)\s*】/;const T=[];
  if(self){for(const p of [...(self.pots||[]),self.excl,...(self.exclX||[])])if(p&&String(p.name||'').replace(/『|』/g,'').trim()===nm)T.push(p.eff);try{const bt=(((window.OM_APP||{}).ST||{}).state||{}).battle;const tr=bt&&bt.trainers&&bt.trainers[self.tid];const u=tr&&(tr.unique||[]).find(x=>x&&String(x.name||'').replace(/『|』/g,'').trim()===nm);if(u)T.push(u.eff)}catch(e){}}
  const r=rm(nm);if(r)T.push(r.t||r.text||r.eff||'');for(const t of T){const m=String(t||'').match(re);if(m)return Math.max(1,+m[1])}return 1}
 async function run(ops,ctx){const L=[];const b=ctx.b;const prevB=RUNB;RUNB=b;const self=ctx.self;const name=ctx.name||'효과';let stop=false;const STK=stackOf(self,name,ctx);
  for(let op of ops||[]){if(stop)break;/* let: 「날씨 무작위」가 op 를 바꿔 끼운다 */
   try{
    /* 10-23 망령: 줄 앞의 확률(「5할」 「30%」 「저확률」) — 이 줄만 굴린다 */
    if((op.p||op.pl)&&!ctx.noRoll){const base=op.p?+op.p:percentOf(op.pl);const rr=rollP(self,base,ctx);const lb=op.pl||(op.p%10===0?op.p/10+'할':op.p+'%');if(!rr.ok){L.push(`${lb} 판정 실패 (${rr.r}/${rr.p})${rr.adj} — ${unparse([Object.assign({},op,{p:0,pl:''})])[0]||''}`);continue}L.push(`${lb} 판정 성공 (${rr.r}/${rr.p})${rr.adj}`)}
    const hs=(op.hold||ctx.hold)&&self&&op.k!=='choice'?holdSnap(b):null;
    await runOp(op);
    if(hs)holdDiff(b,self,hs,name);
   }catch(e){L.push(`(${op.k} 처리 중 오류: ${e.message})`)}}
  RUNB=prevB;return {lines:L,b};
  async function runOp(op){
    switch(op.k){
     case 'confirm':{const ok=ctx.confirm?await ctx.confirm(op.q):true;if(!ok){L.push(`「${name}」 조건을 만족하지 않아 발동하지 않았다 (${op.q})`);stop=true}break}
     case 'cond':{let ok=true;if(op.c==='ally_fainted')ok=Object.values(b.mons||{}).some(m=>teamOf(b,m)===teamOf(b,self)&&m.id!==self.id&&m.hp.cur<=0);
       else if(op.c==='self_state'){ok=!!((self.states||{})[op.st]);if(!ok){L.push(`「${name}」 ${self.name}이(가) 「${stKo(op.st)}」 상태가 아니라 발동하지 않았다`);stop=true;break}}
       else if(op.c==='hp_le')ok=self.hp.cur<=frac(self.hp.max,op.frac);if(!ok){L.push(`「${name}」 조건(${op.c==='ally_fainted'?'빈사 상태인 아군':'HP '+op.frac+' 이하'})을 만족하지 않아 발동하지 않았다`);stop=true}break}
     case 'choice':{let idx=[0];if(ctx.choose)idx=await ctx.choose(op.opts.map(o=>o.label),!!(op.multi||op.opts.some(o=>o.multi)));if(!idx||!idx.length){stop=true;break}
       for(const i of idx){const o=op.opts[i];if(!o)continue;const pl=timing(o.label).percent;const ch=ctx.noRoll||lineChance(o.ops)?0:(chanceOf(o.label)||(pl?percentOf(pl):0));if(ch&&(ch<100||(self&&self.fx&&(self.fx.chance||[]).length))){const rr=rollP(self,ch,ctx);if(!rr.ok){L.push(`▶ ${o.label} — ${rr.p}% 판정 실패 (${rr.r}/${rr.p})${rr.adj}`);continue}L.push(`▶ ${o.label} — ${rr.p}% 판정 성공 (${rr.r}/${rr.p})${rr.adj}`)}else L.push(`▶ ${o.label}`);const r=await run(o.ops,ctx);L.push(...r.lines)}break}
     case 'rank':case 'mult':{const ts=await targets(b,self,op.tgt,ctx);for(const m of ts){let o2=op;if(op.rnd){/* 무작위 능력치 (10-23 망령): 고를 능력 중 n개를 무작위로 */const pool=(op.rnd.pool||'5')==='7'?['attack','defense','specialattack','specialdefense','speed','accuracy','evasion']:['attack','defense','specialattack','specialdefense','speed'];const pk=[];const pp=pool.slice();for(let i=0;i<Math.min(+op.rnd.n||1,pp.length);i++)pk.push(pp.splice(Math.floor(Math.random()*pp.length),1)[0]);const st=Object.assign({},op.stats||{});for(const k of pk)st[k]=op.rnd.v;o2=Object.assign({},op,{stats:st});L.push(`🎲 무작위 → ${pk.map(k=>STAT_KO[k]).join(' · ')}`)}L.push(...applyStats(m,o2,self,name))}break}
     case 'reset':{const ts=await targets(b,self,op.tgt||'self',ctx);for(const m of ts){if(op.what!=='mult'){m.rank={};delete m.tempRank}if(op.what!=='rank'){m.mod={};delete m.tempMod;if(m.fx)m.fx.mults=[]}L.push(`${m.name} ${op.what==='rank'?'랭크':op.what==='mult'?'배율':'랭크·배율'} 초기화`)}break}
     case 'boost':case 'guard':{const ts=await targets(b,self,op.tgt,ctx);for(const m of ts){const F=fx(m);const key=name+' ← '+self.name+(op.ed?' (견딤)':'');if(op.remove){F.mods=F.mods.filter(e=>e.key!==key&&e.key!==key+' (견딤)');L.push(`${m.name} 「${name}」 ${op.k==='boost'?'위력 강화':'위력 완화'} 해제`);continue}
       const e={key,name,kind:op.k,v:+op.v||1,types:op.types||[],cat:op.cat||'all',eff:op.eff||'all',rng:op.rng||'all',uses:op.uses==null?-1:+op.uses,turn:op.turn?(+b.turn||0):-1,until:op.tl>0?(+b.turn||0)+op.tl-1:-1,ro:op.ro||[],st:op.st||'',tg:op.tg||[],sb:op.sb||'',pmin:+op.pmin||0,pmax:+op.pmax||0,cg:+op.cg||0,cr:+op.cr||0,cx:op.cx||'',eg:op.eg||'',ed:op.ed?1:0,src:self.name};
       {const old=STK>1&&F.mods.find(x=>x.key===key);if(old){const n=Math.min(STK,(+old.stack||1)+1);e.v0=+old.v0||+old.v||1;e.stack=n;e.v=Math.round(Math.pow(e.v0,n)*1000)/1000}else if(STK>1){e.v0=e.v;e.stack=1}}
       F.mods=F.mods.filter(x=>x.key!==key);F.mods.push(e);L.push(`${m.name} ${modDesc(e)}${e.stack?` (중첩 ${e.stack}/${STK})`:''}`)}break}
     case 'state':{const en=stEn(op.state)||op.state;const ts=await targets(b,self,op.tgt,ctx);for(const m of ts)L.push(setState(m,en,op.count,op.forced,self,name));break}
     case 'statefx':{const en=stEn(op.state)||op.state;let ts=await targets(b,self,op.tgt,ctx);if(op.self)ts=[self];if(op.pick==='one'&&ts.length>1)ts=[ts[Math.floor(Math.random()*ts.length)]];
       for(const m of ts){const rr=rollP(self,+op.chance||100,ctx);if(rr.ok)L.push(setState(m,en,-1,0,self,name)+` (${rr.r}/${rr.p})${rr.adj}`);else L.push(`${m.name} 「${stKo(en)}」 실패 (${rr.r}/${rr.p})${rr.adj}`)}break}
     case 'cure':{let ts=await targets(b,self,op.tgt,ctx);if(op.self)ts=[self];const list=op.states==='negative'||!op.states?NEG:op.states;
       for(const m of ts){if(op.chance&&+op.chance<100){const rr=rollP(self,+op.chance,ctx);if(!rr.ok){L.push(`${m.name} 치유 실패 (${rr.r}/${rr.p})${rr.adj}`);continue}}
        const cured=[];for(const k of list)if((m.states||{})[k]){delete m.states[k];cured.push(stKo(k))}/* 10-24 망령: 부가 치유(열탕 · 화염방사의 「얼음」 치유 …)는 걸린 게 없으면 줄을 남기지 않는다 */if(cured.length)L.push(`${m.name} 「${cured.join('」「')}」 해제`);else if(list===NEG)L.push(`${m.name} 해제할 상태가 없다`)}break}
     case 'heal':{const ts=await targets(b,self,op.tgt||'self',ctx);for(const m of ts){if((m.states||{}).HealBlock){L.push(`${m.name} 「회복봉인」이라 회복하지 못함`);continue}if(op.ytype&&!typesOf(m).includes(op.ytype)){L.push(`${m.name} ${TYPE_KO[op.ytype]||op.ytype} 타입이 아니라 회복 없음`);continue}
       const v=op.value==='full'?m.hp.max-m.hp.cur:frac(m.hp.max,op.value);const h=Math.min(v,m.hp.max-m.hp.cur);m.hp.latest=m.hp.cur;m.hp.cur+=h;L.push(`${m.name} 「${name}」 회복 +${h} (HP ${m.hp.cur}/${m.hp.max})`)}break}
     case 'dmg':{const ts=await targets(b,self,op.tgt||'enemy1',ctx);for(const m of ts){if(op.st&&!(m.states||{})[op.st]){L.push(`${m.name} 「${stKo(op.st)}」 상태가 아니라 대미지 없음`);continue}if(op.xtype&&typesOf(m).includes(op.xtype)){L.push(`${m.name} ${TYPE_KO[op.xtype]||op.xtype} 타입이라 대미지 없음`);continue}
       let v=0;if(op.basis==='cur')v=frac(m.hp.cur,op.value);else if(op.basis==='type'){const ats=(op.atypes&&op.atypes.length?op.atypes:[op.atype]).filter(Boolean);/* 복합 타입 (10-23 망령): 타입마다 상성을 곱한다 */const mul=ats.reduce((a,t)=>a*B().effectiveness([t],m,{}).value,1);if(mul<=0){L.push(`${m.name} ${ats.map(t=>TYPE_KO[t]||t).join('·')} 타입 효과 없음`);continue}v=Math.max(1,Math.floor(frac(m.hp.max,op.value)*mul))}else if(op.basis==='last')v=frac((self.lastDealt||{}).total||0,op.value);else v=frac(m.hp.max,op.value);
       if(noind(m,'')){L.push(`${m.name} 비례 대미지를 받지 않는다 (${noindName(m,'')})`);continue}const floor=(op.nofaint||noind(m,'noko'))?1:0;const d=Math.max(0,Math.min(v,m.hp.cur-floor));m.hp.latest=m.hp.cur;m.hp.cur-=d;L.push(`${m.name} 「${name}」 대미지 −${d} (HP ${m.hp.cur}/${m.hp.max})${m.hp.cur<=0?' 빈사!':''}`);if(m.hp.cur<=0)m.entry=''}break}
     case 'weather':{const f=field(b);/* 10-26: 「특성 : X」로 전개하는 「날씨」가 「날씨 : Y」가 된다 (폭풍요의 조작 등) */{const ov=[...((self&&self.pots)||[]),...(self&&self.excl?[self.excl]:[]),...((self&&self.exclX)||[])].map(p=>String((p&&p.eff)||'').match(/「특성\s*:\s*([^」]+)」(?:로|으로)\s*전개하는\s*「날씨」가\s*「날씨\s*:\s*([^」]+)」가\s*된다/)).find(r=>r&&self&&r[1].trim()===String(self.ability||'').trim());if(ov&&op.w)op=Object.assign({},op,{w:ov[2].trim()})}if(op.w==='random'){const W=['맑음','비','모래바람','눈','짙은안개','밤','별하늘'];op=Object.assign({},op,{w:W[Math.floor(Math.random()*W.length)]})}const ext=op.w&&+op.count<1000?itemExt(self,op.w):'';f.weather={type:op.w||'',count:op.w?(+op.count||5)+(ext?3:0):0};L.push(op.w?`날씨 「${op.w}」 ${op.count>=1000?'계속':((+op.count||5)+(ext?3:0))+'턴'}${ext?' (「'+ext+'」 +3)':''}`:'날씨 초기화');break}
     case 'terrain':{const f=field(b);if(op.room){if(!op.t){f.rooms={};L.push('룸 초기화')}else{f.rooms[op.t]=+op.count||5;L.push(`「${op.t}」 ${op.count>=1000?'계속':op.count+'턴'}`)}}else{const ext=op.t&&+op.count<1000?itemExt(self,'필드'):'';f.terrain={type:op.t||'',count:op.t?(+op.count||5)+(ext?3:0):0};L.push(op.t?`「${op.t}」 ${op.count>=1000?'계속':((+op.count||5)+(ext?3:0))+'턴'}${ext?' (「'+ext+'」 +3)':''}`:'필드 초기화')}break}
     case 'etc':{const f=field(b);if(!op.e){f.etc={};L.push('필드의 상태 초기화')}else{f.etc[op.e]=+op.count||5;L.push(`「${op.e}」 ${op.count>=1000?'계속':op.count+'턴'}`)}break}
     case 'clearobj':{const f=field(b);const sides=op.side==='both'?['left','right']:[op.side==='enemy'?(self.side==='left'?'right':'left'):self.side];const G=OBJ_GROUP[op.what||'hazard']||[];
       for(const sd of sides){const o=f.objects[sd]=f.objects[sd]||{};const gone=Object.keys(o).filter(k=>+o[k]>0&&(op.what==='all'||G.includes(k)));for(const k of gone)delete o[k];L.push(`${sd==='left'?'좌측':'우측'} ${gone.length?'「'+gone.join('」「')+'」 철거':(({hazard:'설치기',wall:'장벽',all:'설치물'})[op.what||'hazard']||'설치물')+' 없음'}`)}break}
     case 'object':{const f=field(b);const side=op.side==='enemy'?(self.side==='left'?'right':'left'):self.side;f.objects[side]=f.objects[side]||{};const cur=+f.objects[side][op.o]||0;
       if(op.o==='압정뿌리기'||op.o==='독압정'){const mx=op.o==='압정뿌리기'?3:2;f.objects[side][op.o]=Math.min(mx,cur+1);L.push(`${side==='left'?'좌측':'우측'} 「${op.o}」 ${f.objects[side][op.o]}겹`)}else{const ext=+op.count<1000&&side===self.side?itemExt(self,op.o):'';f.objects[side][op.o]=(+op.count||5)+(ext?3:0);L.push(`${side==='left'?'좌측':'우측'} 「${op.o}」 ${op.count>=1000?'계속':((+op.count||5)+(ext?3:0))+'턴'}${ext?' (「'+ext+'」 +3)':''}`)}break}
     case 'type':{const ts=await targets(b,self,op.tgt||'self',ctx);for(const m of ts){if(op.mode==='reset'){if(m.typesOrig){m.types=m.typesOrig;delete m.typesOrig}L.push(`${m.name} 타입 원래대로`);continue}m.typesOrig=m.typesOrig||m.types.slice();m.typesBy=name;
       const add=(op.types||[]).map(t=>KO_TYPE[t]||t);if(op.mode==='set')m.types=add;else m.types=[...new Set([...m.types.filter(t=>t!=='-'),...add])];L.push(`${m.name} 타입 ${op.mode==='set'?'→':'+'} ${add.map(t=>TYPE_KO[t]||t).join('/')}`)}break}
     case 'trait':{const ts=await targets(b,self,op.tgt||'enemy1',ctx);for(const m of ts){if(op.mode==='reset'){resetAb(m);L.push(`${m.name} 특성 원래대로`);continue}setAb(m,op.tn,name);L.push(`${m.name} 특성 → 「${op.tn}」`)}break}
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
     case 'nodrop':{const ts=await targets(b,self,op.tgt||'self',ctx);for(const m of ts){const F=fx(m);const key=name+' ← '+self.name;F.nodrop=F.nodrop.filter(e=>e.key!==key);if(op.mode!=='off')F.nodrop.push({key,name,st:op.st||'',until:op.turns>0?(+b.turn||0)+op.turns-1:-1,ytype:op.ytype||'',ro:op.ro||[]});L.push(`${m.name} ${op.st?STAT_KO[op.st]+' ':'능력 '}감소 무시${op.mode==='off'?' 해제':''}`)}break}
     case 'ignoreup':{const F=fx(self);const pv=F.ignoreUp;let dir=op.dir||'atk',scope=op.scope||'both';/* 같은 효과의 두 번째 줄(받음 + 공격시)은 덮어쓰지 않고 합친다 */if(op.on&&pv&&pv.name===name&&pv.dir!==dir){dir='both';scope=scope==='both'||pv.scope==='both'?'both':[...new Set((pv.scope+','+scope).split(','))].join(',')}const dn=op.dn||(pv&&pv.name===name&&pv.dn);const nu=op.on?Object.assign({dir,scope,ro:op.ro||[],name},op.all||(pv&&pv.name===name&&pv.all)?{all:1}:dn?{dn:1}:{},op.lv?{lv:op.lv}:(pv&&pv.name===name&&pv.lv?{lv:pv.lv}:{})):null;F.ignoreUp=nu;L.push(`${self.name} ${dir==='both'?'주고받을 때 상대의':dir==='recv'?'받을 때 상대의':'공격할 때 상대의'} ${scopeKo(op.scope)} ${iuLabel(nu||Object.assign({},op,{dn:op.dn,all:op.all}))}${op.on?'':' 해제'}`);break}
     case 'float':{const ts=await targets(b,self,op.tgt||'self',ctx);for(const m of ts){const F=fx(m);F.float=op.mode==='off'?null:{until:op.turns>0?(+b.turn||0)+op.turns-1:-1,name};L.push(`${m.name} 하늘 위${op.mode==='off'?' 해제':''}`)}break}
     case 'role':{const F=fx(self);if(op.mode==='clear')F.roles=[];else if(op.mode==='remove')F.roles=F.roles.filter(r=>!(op.roles||[]).includes(r));else F.roles=[...new Set([...F.roles,...(op.roles||[])])];F.rolesBy=F.roles.length?name:'';L.push(`${self.name} 역할 취급: ${F.roles.join('·')||'없음'}`);break}
     case 'pursuit':{if(op.immune){const ts=await targets(b,self,op.tgt||'self',ctx);for(const m of ts){m.flags=m.flags||{};m.flags.pursuitImmune=!!op.on;if(op.on)m.flags.pursuitImmuneBy=name;else delete m.flags.pursuitImmuneBy;L.push(`${m.name} 이번 턴 상대의 「따라가때리기」를 받지 않는다${op.on?'':' — 해제'}`)}break}self.flags=self.flags||{};self.flags.pursuit=!!op.on;if(op.on)self.flags.pursuitBy=name;else delete self.flags.pursuitBy;L.push(`${self.name} 다음 기술에 「따라가때리기」${op.on?'':' 해제'}`);break}
     case 'resetstates':{const ts=await targets(b,self,op.tgt||'self',ctx);for(const m of ts){const list=op.group==='condition_abnormal'?ABN:NEG;const c=[];for(const k of list)if((m.states||{})[k]){delete m.states[k];c.push(stKo(k))}L.push(`${m.name} ${c.length?'「'+c.join('」「')+'」 해제':'해제할 상태 없음'}`)}break}
     case 'raid':{self.raid=Object.assign({},self.raid||{},{segments:+op.x||(self.raid||{}).segments||0,floor:op.floor,cure:op.cure,cstat:op.cstat,rup:op.rup});L.push(`${self.name} 레이드 배틀 설정 (구간 ${self.raid.segments||'?'})`);break}
     case 'dex':{const ts=await targets(b,self,'enemy1',ctx);const tg=ts[0];L.push(`「${name}」 데이터 해석${tg?' → '+tg.name:''}`);if(tg&&window.OM_DEX_UI&&ctx.viewer!==undefined)setTimeout(()=>window.OM_DEX_UI.analyze(ctx.viewer||self.tid,tg.id,{forced:true,free:true}),400);break}
     case 'baseup':L.push(`${self.name} 종족치 ${op.stats.join('·')} ${op.max?'범위 최대':(op.n>0?'+':'')+op.n+'랭크'} (제작기 시트의 종족치 · 실수치에 이미 들어가 있다)`);break;
     case 'stmod':L.push(`${self.name} 「${stKo(op.st)}」 사양 ${op.n}/${op.d} (시트에 적힌 값 — 턴 종료 때 자동으로 읽는다)`);break;
     case 'stcount':{/* 상태 턴 조정 (10-23 망령): 걸려 있는 상태의 남은 턴을 늘리거나 줄인다 (계속되는 상태 · 0 이하가 되면 풀린다) */const ts=await targets(b,self,op.tgt||'self',ctx);for(const m of ts){const st=m.states||{};const keys=op.st==='all'?Object.keys(st).filter(k=>st[k]):op.st==='neg'?Object.keys(st).filter(k=>st[k]&&NEG.includes(k)):[op.st].filter(k=>st[k]);const out=[];
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
 function holdDiff(b,self,s,name){const H=self.holds=self.holds||[];const push=x=>H.push(Object.assign({name},x));
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
   for(const h of x.holds){if(!h.list||!h.e||!h.rel||h.rel==='self'||h.rel!==rel||done.has(h.list+'|'+h.key))continue;done.add(h.list+'|'+h.key);const F=fx(nm);if((F[h.list]||[]).some(e=>e.key===h.key))continue;const e=JSON.parse(JSON.stringify(h.e));F[h.list].push(e);
    if(h.list==='mults'){nm.mod=nm.mod||{};for(const k in e.stats||{}){nm.mod[k]=Math.round(((+nm.mod[k]||1)*(+e.stats[k]||1))*1000)/1000;if(Math.abs(nm.mod[k]-1)<0.002)delete nm.mod[k]}}
    x.holds.push(Object.assign({},h,{mid:nm.id}));L.push(`${nm.name} 「${h.name}」 ${h.list==='mults'?Object.entries(e.stats||{}).map(([k,v])=>(STAT_KO[k]||k)+' ×'+v).join(' · '):'효과'} — ${x.name}이(가) 필드에 있는 동안`)}}
  /* 「있는한」 기록이 없는 상시 효과(특성 · 포텐셜 이름으로 걸린 것)는 같은 관계의 다른 포켓몬에게 걸린 것을 본떠 건다 — 기술 효과는 옮기지 않는다 */
  for(const x of Object.values(b.mons||{})){if(!x||x.id===nm.id||!x.entry||!alive(x))continue;const srcN=new Set([x.ability,...((x.pots||[]).map(p=>p&&p.name)),...(x.excl?[x.excl.name]:[])].filter(Boolean).map(n=>String(n).replace(/『|』/g,'').trim()));const rel=teamOf(b,x)===teamOf(b,nm)?'ally':'enemy';
   for(const y of Object.values(b.mons||{})){if(!y||y.id===nm.id||y.id===x.id||!y.entry||!alive(y)||!y.fx)continue;if((teamOf(b,x)===teamOf(b,y)?'ally':'enemy')!==rel)continue;
    for(const k of HL)for(const e0 of (y.fx[k]||[])){const kk=String(e0.key||'');const tail=' ← '+x.name;if(!kk.endsWith(tail)||e0.temp||e0.next||(e0.until!=null&&+e0.until>=0)||(+e0.turn>0))continue;const nmS=kk.slice(0,-tail.length).trim();if(!srcN.has(nmS))continue;const F=fx(nm);if((F[k]||[]).some(e=>e.key===kk))continue;const e=JSON.parse(JSON.stringify(e0));F[k].push(e);
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
 function applyStats(m,op,self,name){const L=[];const isMult=op.k==='mult';const parts=[];
  for(const k in op.stats){let v=+op.stats[k];if(!v)continue;
   if(!isMult){ /* 랭크 */
    /* 능력반전: 랭크 변화를 거꾸로 (급소·강제 설정은 그대로) */
    if((m.states||{}).reverse&&k!=='critical'&&k!=='critical_buff'&&op.mode!=='set'){v=-v;parts.push('능력반전')}
    if(v<0&&!op.forced&&m.id!==self.id){const nd=nodropHit(m,k)||(sideObj(m,'흰안개')?'흰안개':'')||((m.states||{}).Substitute?'대타출동':'');if(nd){L.push(`${m.name} ${STAT_KO[k]} 감소 무시 (${nd})`);continue}}
    if(k==='critical_buff'){m.critBuff=(+m.critBuff||0)+v;parts.push(`급소 방호 ${v>0?'+':''}${v}`);continue}
    m.rank=m.rank||{};const lim=k==='critical'?4:6;const before=+m.rank[k]||0;const after=Math.max(-lim,Math.min(lim,before+v));m.rank[k]=after;if(op.temp){m.tempRank=m.tempRank||{};m.tempRank[k]=(+m.tempRank[k]||0)+(after-before)}
    parts.push(`${STAT_KO[k]} ${v>0?'+':''}${v}${after!==before+v?' (한계 '+after+')':''}`)}
   else{/* 10-26 망령: 같은 출처(같은 효과 ← 같은 포켓몬)의 같은 능력 배율은 겹치지 않는다 — 상시 · 고유를 다시 눌러 0.75×0.75 가 되던 것 */{const F0=fx(m);const e0=F0.mults.find(x=>x.key===name+' ← '+self.name);if(e0&&e0.stats&&e0.stats[k]!=null){L.push(`${m.name} 「${name}」 ${STAT_KO[k]} 배율은 이미 걸려 있다`);continue}}
    m.mod=m.mod||{};m.mod[k]=Math.round(((+m.mod[k]||1)*v)*1000)/1000;if(op.temp){m.tempMod=m.tempMod||{};m.tempMod[k]=Math.round(((+m.tempMod[k]||1)*v)*1000)/1000}parts.push(`${STAT_KO[k]} ×${v}`);
    /* 배율 출처를 남겨서 나중에 해제할 수 있게 */ const F=fx(m);const key=name+' ← '+self.name;let e=F.mults.find(x=>x.key===key);if(!e){e={key,name,stats:{},temp:!!op.temp};F.mults.push(e)}e.stats[k]=Math.round(((+e.stats[k]||1)*v)*1000)/1000}}
  if(parts.length)L.push(`${m.name} 「${name}」 ${parts.join(' · ')}${op.temp?' (턴 종료까지)':''}`);return L}
 function setState(m,en,count,forced,self,name){if(!en)return `${m.name} 모르는 상태`;m.states=m.states||{};if(m.states[en])return `${m.name} 이미 「${stKo(en)}」`;
  if(!forced){const im=immuneHit(m,en);if(im)return `${m.name} 「${stKo(en)}」 면역 (${im})`;const tb=terrainBlock(m,en);if(tb)return `${m.name} 땅 위에 있어서 「${tb}」가 「${stKo(en)}」을(를) 막았다`;
   if(m.states.Comatose&&ABN.includes(en))return `${m.name} 「몽유」라 「${stKo(en)}」이 되지 않음`;
   const fromOther=!self||self.id!==m.id;
   if(fromOther&&sideObj(m,'신비의부적')&&(ABN.includes(en)||en==='Confusion'))return `${m.name} 「신비의부적」이 「${stKo(en)}」을(를) 막았다`;
   if(fromOther&&m.states.Substitute&&NEG.includes(en))return `${m.name} 「대타출동」이 「${stKo(en)}」을(를) 막았다`;if(ABN.includes(en)&&ABN.some(k=>m.states[k]))return `${m.name} 이미 상태 이상이라 「${stKo(en)}」이 되지 않음`;
   if(en==='Burn'&&typesOf(m).includes('Fire'))return `${m.name} 불꽃 타입이라 「화상」 없음`;if((en==='Poison'||en==='Toxic')&&(typesOf(m).includes('Poison')||typesOf(m).includes('Steel')))return `${m.name} 독·강철 타입이라 「${stKo(en)}」 없음`;if(en==='Paralysis'&&typesOf(m).includes('Electric'))return `${m.name} 전기 타입이라 「마비」 없음`;if(en==='Freeze'&&typesOf(m).includes('Ice'))return `${m.name} 얼음 타입이라 「얼음」 없음`}
  const d=stDB()[en]||{};const c=count!=null&&+count>0?+count:(d.min>=1000||!d.min?1000:(+d.max>+d.min&&+d.max<1000?+d.min+Math.floor(Math.random()*(+d.max-+d.min+1)):+d.min));m.states[en]=c;
  /* 씨뿌리기: 드레인은 씨를 뿌린 에리어로 (맵툴 seed_src_set) */
  if(en==='LeechSeed'){if(self&&self.id!==m.id&&self.entry)m.seedFrom=self.side+'_'+self.entry;else delete m.seedFrom}
  return `${m.name} 「${stKo(en)}」${c<1000?' '+c+'턴':''}${(d.desc||[]).length?' — '+d.desc.join(' '):''}`}
 function immuneHit(m,en){for(const e of (m.fx&&m.fx.immune)||[]){if(itemOff(m,e))continue;if(e.states.includes(en)||(e.states.includes('abnormal')&&ABN.includes(en)))return e.name}return ''}
 function nodropHit(m,stat){const t=+(((window.OM_APP||{}).ST||{}).state||{}).battle?.turn||0;for(const e of (m.fx&&m.fx.nodrop)||[]){if(e.until>=0&&t>e.until)continue;if(!e.st||e.st===stat)return e.name}
  /* 10-25 망령: 소지품 「클리어참」 — 자신 이외로 인해 능력이 떨어지지 않는다 (레디메이드 없이도, 매직룸이면 무효) */
  if(m&&[m.item,...((m.items2||[]).map(x=>x&&x.item))].some(n=>String(n||'').replace(/『|』/g,'').trim()==='클리어참')&&!magicRoom())return '클리어참';return ''}
 function noind(m,kind){const t=curTurn();for(const e of (m.fx&&m.fx.noind)||[]){if(e.until>=0&&t>e.until)continue;if(itemOff(m,e))continue;if(e.kind===kind||(e.kind===''&&kind!=='switch'&&kind!=='freesw'))return true}return false}   /* 강제 교대 무시(switch)는 「비례 대미지 무시」에 딸려 오지 않는다 */
 function noindName(m,kind){for(const e of (m.fx&&m.fx.noind)||[]){if(itemOff(m,e))continue;if(e.kind===kind||(e.kind===''&&kind!=='switch'&&kind!=='freesw'))return e.name}return ''}
 /* 10-22 망령: 포켓몬마다 상태 변화 사양 바꾸기 — 시트(포텐셜 · 전용 · 특성 · 소지품)에 적어 둔 것만, 배틀 중엔 손대지 않는다.
    ① 효과 글: 『수선녀의 요술』 「아쿠아링」에 의한 회복량을 강화(1/8 → 1/6)한다 처럼 「상태」 … (a/b → c/d)
    ② 자동화 구문: 상태수정 아쿠아링 1/6
    돌려줌 {n,d,name} 또는 null. 턴 종료 처리(field.js)가 아쿠아링 · 뿌리박기 · 독 · 화상 … 의 비율을 이걸로 바꾼다 */
 const RE_STMOD=/「([^」]+)」\s*(?:에\s*의한|에\s*따른|로\s*인한|으로\s*인한|의)[^(（\n]{0,24}[(（]\s*\d+\s*\/\s*\d+\s*(?:→|->|⇒|=>|➜)\s*(\d+)\s*\/\s*(\d+)\s*[)）]/g;
 function stMod(m,en){if(!m||!en)return null;
  for(const k in (m.auto||{}))for(const op of ((m.auto[k]||{}).ops||[]))if(op&&op.k==='stmod'&&op.st===en)return {n:+op.n,d:+op.d,name:k};
  const src=[...(m.pots||[]).filter(p=>p&&p.name&&!p.ph).map(p=>[p.name,p.eff]),...(m.excl?[[m.excl.name,m.excl.eff]]:[]),...(m.exclX||[]).map(x=>[x.name,x.eff]),[m.ability,m.abilityEff],...(magicRoom()?[]:[[m.item,m.itemEff]])];
  for(const [name,eff] of src){if(!name||!eff)continue;for(const r of String(eff).matchAll(RE_STMOD))if(stEn(r[1])===en&&+r[3]>0)return {n:+r[2],d:+r[3],name:String(name).replace(/『|』/g,'')}}
  return null}
 function floating(m){const f=m.fx&&m.fx.float;if(!f)return false;const t=curTurn();return !(f.until>=0&&t>f.until)}
 function curTurn(){return +((((window.OM_APP||{}).ST||{}).state||{}).battle||{}).turn||0}
 function modDesc(e){const parts=[];if(e.types&&e.types.length)parts.push(e.types.map(t=>TYPE_KO[t]||t).join('·'));else parts.push('모든 타입');if(e.cat==='physical')parts.push('물리');if(e.cat==='special')parts.push('특수');
  if(e.eff==='super')parts.push('효과 굉장');if(e.eff==='weak')parts.push('효과 별로');if(e.eff==='normal')parts.push('상성 1배');if(e.rng==='single')parts.push('단일기');if(e.rng==='multi')parts.push('전체기');
  if(e.sb==='stab')parts.push('타입 일치');if(e.sb==='nonstab')parts.push('타입 비일치');if(e.tg&&e.tg.length)parts.push('「'+e.tg.join('」「')+'」 기술');if(e.pmin)parts.push('위력 '+e.pmin+' 이상');if(e.pmax)parts.push('위력 '+e.pmax+' 이하');
  if(e.ro&&e.ro.length)parts.push('『'+e.ro.join('』『')+'』 상대');if(e.st==='def')parts.push('【수세】');if(e.st==='off')parts.push('【공세】');if(e.cg)parts.push('급소 방호 '+e.cg);if(e.cr)parts.push('급소 C+'+e.cr);if(e.cx==='sure')parts.push('확정 급소');if(e.cx==='none')parts.push('급소에 맞지 않음');if(e.ed)parts.push('그 기술로 「빈사」 되지 않음');
  const dur=e.uses>0?'남은 '+e.uses+'회':e.turn>=0?'이번 턴':e.until>=0?(e.until-curTurn()+1)+'턴':'해제 전까지';
  return `「${e.name}」 ${e.kind==='boost'?'위력 강화':'위력 완화'} ×${e.v} (${parts.join(' / ')} / ${dur})`}

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
  if(e.st&&q.stance&&e.st!==q.stance)return false;return true}
 function attackMods(atk,def,q){const out={boost:1,guard:1,cg:0,cr:0,cx:'',names:[]};
  for(const e of liveMods(atk)){if(e.kind!=='boost')continue;const qq=Object.assign({},q,{roles:(def.fx&&def.fx.roles)||[],egg:def.egg||[]});if(!matchMod(e,qq))continue;out.boost*=e.v;out.cr+=e.cr||0;if(e.cx)out.cx=e.cx;if(e.sure)out.sure=1;if(e.uturn)out.uturn=1;out.names.push({key:e.key,who:atk.id,txt:e.next?`${atk.name} 「${e.name}」 다음 기술: ${nextTxt(e)}`:`${atk.name} 「${e.name}」 ×${e.v}`})}
  for(const e of liveMods(def)){if(e.kind!=='guard')continue;const qq=Object.assign({},q,{roles:(atk.fx&&atk.fx.roles)||[],egg:atk.egg||[]});if(!matchMod(e,qq))continue;const onlyCx=+e.v===1&&!e.cg;if(onlyCx&&(atk.id===def.id||(q&&q.cat==='변화')))continue;/* 급소만 막는 효과(조가비갑옷 …)는 자기 기술 · 변화기에선 이름을 안 띄운다 */out.guard*=e.v;if(e.ed)out.endure=1;out.cg+=e.cg||0;if(e.cx==='none')out.cx='none';out.names.push({key:e.key,who:def.id,txt:`${def.name} 「${e.name}」 ${e.ed?(+e.v===1?'':'×'+e.v+' · ')+'빈사 견딤':onlyCx&&e.cx==='none'?'급소 없음':'×'+e.v}`})}
  out.boost=Math.round(out.boost*1000)/1000;out.guard=Math.round(out.guard*1000)/1000;return out}
 /* 쓴 뒤: 횟수 있는 항목을 깎는다 (b 사본의 포켓몬에) */
 function consume(b,names){for(const n of names||[]){const m=b.mons[n.who];if(!m||!m.fx)continue;const e=m.fx.mods.find(x=>x.key===n.key);if(!e)continue;if(e.uses>0){e.uses--;if(e.uses===0){m.fx.mods=m.fx.mods.filter(x=>x!==e);if(e.next){m.fx.prio=(m.fx.prio||[]).filter(x=>x.key!==e.key);if(m.flags&&m.flags.pursuitBy===e.name){delete m.flags.pursuit;delete m.flags.pursuitBy}}}}}}
 /* 다음 기술 필중 · 유턴 (공격 창이 명중 전에 본다) */
 function nextOf(m){const t=curTurn();return ((m&&m.fx&&m.fx.mods)||[]).filter(e=>e.next&&e.uses!==0&&!itemOff(m,e))}
 function prioOf(m,mv){let p=+(mv&&mv.prio)||0;let set=null;const t=curTurn();for(const e of (m.fx&&m.fx.prio)||[]){if(e.turn>=0&&e.turn<t)continue;if(itemOff(m,e))continue;if(e.cat&&e.cat!=='all'&&e.cat!==mv.cat)continue;if(e.type&&e.type!==mv.typeEn)continue;if(e.tag&&!e.tag.split(',').some(x=>String(mv.tag||mv.name||'').includes(x.trim())))continue;if(e.mode==='set')set=e.v;else p+=e.v}return set!=null?set:p}
 /* 턴 종료: 기한 지난 항목 정리 */
 function turnEnd(b){const t=+b.turn||0;const L=[];for(const id in b.mons||{}){const m=b.mons[id];if(!m.fx)continue;const F=m.fx;
  const gone=[];F.mods=F.mods.filter(e=>{const dead=(e.turn>=0&&e.turn<=t)||(e.until>=0&&t>=e.until)||e.uses===0;if(dead)gone.push(e.name);return !dead});
  F.noind=F.noind.filter(e=>!(e.until>=0&&t>=e.until));F.nodrop=F.nodrop.filter(e=>!(e.until>=0&&t>=e.until));if(F.chance)F.chance=F.chance.filter(e=>!(e.until>=0&&t>=e.until));F.prio=F.prio.filter(e=>!(e.turn>=0&&e.turn<=t));if(F.float&&F.float.until>=0&&t>=F.float.until)F.float=null;
  if(gone.length)L.push(`${m.name} 「${gone.join('」「')}」 끝`)}return L}

 /* ===== 포켓몬 카드에 보여 줄 효과 칩 ===== */
 function chips(m){const out=[];for(const e of liveMods(m))out.push(e.next?{t:'다음 기술',title:e.name+' — 다음 기술에 '+nextTxt(e,m),id:'mods:'+e.key,name:e.name}:{t:`${e.kind==='boost'?'위력':'피해'} ×${e.v}`,title:modDesc(e),id:'mods:'+e.key,name:e.name});for(const e of (m.fx&&m.fx.noind)||[])out.push({t:e.kind==='switch'?'교대 무시':e.kind==='freesw'?'반드시 교대':'비례 무시',title:e.name+' — '+NOIND_KO[e.kind||''],id:'noind:'+e.key,name:e.name});
  for(const e of (m.fx&&m.fx.prio)||[])if(!e.next)out.push({t:`우선도 ${e.mode==='set'?'=':(e.v>0?'+':'')}${e.v}`,title:e.name,id:'prio:'+e.key,name:e.name});for(const e of (m.fx&&m.fx.immune)||[])out.push({t:'면역 '+e.states.map(stKo).join('·'),title:e.name,id:'immune:'+e.key,name:e.name});
  for(const e of (m.fx&&m.fx.nodrop)||[])out.push({t:(e.st?STAT_KO[e.st]+' ':'')+'감소 무시',title:e.name,id:'nodrop:'+e.key,name:e.name});for(const e of (m.fx&&m.fx.mults)||[])out.push({t:'배율 '+multLabel(e.stats),title:e.name+' — '+Object.entries(e.stats).map(([k,v])=>(STAT_KO[k]||k)+' ×'+v).join(' · ')+(e.temp?' (턴 종료까지)':''),id:'mults:'+e.key,name:e.name});
  for(const e of (m.fx&&m.fx.chance)||[])out.push({t:e.sure?'확률 반드시':'확률 '+(e.v>0?'+':'')+e.v+'%p',title:e.name+' — 확률 효과 '+(e.sure?'반드시 발동':'발동 확률 보정')+(e.uses>0?' · 남은 '+e.uses+'회':''),id:'chance:'+e.key,name:e.name});
  if(m.fx&&m.fx.ignoreUp){const iu=m.fx.ignoreUp;out.push({t:iuLabel(iu),title:(iu.name||'')+' — '+(iu.dir==='recv'?'받을 때':iu.dir==='both'?'주고받을 때':'공격할 때')+' 상대의 '+scopeKo(iu.scope)+' '+iuLabel(iu)+' (상승·감소 = 랭크, 강화·저하 = 배율)',id:'ignoreUp',name:iu.name||iuLabel(iu)})}if(floating(m))out.push({t:'하늘 위',title:((m.fx&&m.fx.float&&m.fx.float.name)||'')+' — 땅 위 효과를 받지 않는다',id:'float',name:(m.fx&&m.fx.float&&m.fx.float.name)||'하늘 위'});
  if(m.fx&&m.fx.roles&&m.fx.roles.length)out.push({t:'역할 '+m.fx.roles.join('·'),title:(m.fx.rolesBy||'')+' 역할 취급',id:'roles',name:m.fx.rolesBy||'역할 취급'});if(m.typesOrig)out.push({t:'타입 변경',title:(m.typesBy||'')+' — 원래 '+m.typesOrig.map(t=>TYPE_KO[t]||t).join('/'),id:'types',name:m.typesBy||'타입 변경'});if(m.abilityOrig!=null)out.push({t:'특성 변경',title:(m.abilityBy||'')+' — 원래 '+(m.abilityOrig||'없음'),id:'ability',name:m.abilityBy||'특성 변경'});
  if(m.flags&&m.flags.pursuitImmune)out.push({t:'추격 무시',title:(m.flags.pursuitImmuneBy||'')+' — 이번 턴 교대해도 상대의 「따라가때리기」를 받지 않는다. 턴 종료에 풀린다',id:'pursuitImmune',name:m.flags.pursuitImmuneBy||''});
  if(m.flags&&m.flags.pursuit)out.push({t:'추격',title:(m.flags.pursuitBy||'')+' — 따라가때리기(Pursuit): 다음 기술에서 상대가 교대하려 하면 교대 전에 먼저 때린다. 턴 종료에 풀린다',id:'pursuit',name:m.flags.pursuitBy||'추격'});/* 10-26 제보: 같은 효과가 두 길(특성 + 포텐셜 등)로 들어오면 칩이 둘 — 글자와 이름이 같으면 하나로 */{const seen=new Set();for(let i=out.length-1;i>=0;i--){const k=out[i].t+'|'+(out[i].name||'');if(seen.has(k))out.splice(i,1);else seen.add(k)}}return out}
 /* 배율 칩 짧은 글: 5능력이 같은 값이면 「능력 ×1.33」, 나머지는 따로 */
 function multLabel(st){const five=['attack','defense','specialattack','specialdefense','speed'];const out=[];const v5=five.map(k=>st[k]);if(v5.every(v=>v!=null)&&v5.every(v=>v===v5[0])){out.push('능력 ×'+v5[0]);for(const k in st)if(!five.includes(k))out.push((STAT_KO[k]||k)+' ×'+st[k])}else{const by={};for(const k in st)(by[st[k]]=by[st[k]]||[]).push(STAT_KO[k]||k);for(const v in by)out.push(by[v].map(x=>x.replace('스피드','스')).join('·')+' ×'+v)}return out.join(' ')}
 /* 출처(포텐셜 이름) 가 같은 효과를 한꺼번에 해제 — 디스럽터처럼 여러 효과가 묶인 것 */
 function removeByName(m,name){const F=fx(m);let n=0;for(const k of ['mods','noind','prio','immune','nodrop','chance']){const b=F[k].length;F[k]=F[k].filter(e=>e.name!==name);n+=b-F[k].length}
  for(const e of F.mults.filter(e=>e.name===name)){unmult(m,e);n++}F.mults=F.mults.filter(e=>e.name!==name);
  if(F.ignoreUp&&F.ignoreUp.name===name){F.ignoreUp=null;n++}if(F.float&&F.float.name===name){F.float=null;n++}if(F.roles.length&&F.rolesBy===name){F.roles=[];F.rolesBy='';n++}
  if(m.typesOrig&&m.typesBy===name){m.types=m.typesOrig;delete m.typesOrig;delete m.typesBy;n++}if(m.abilityOrig!=null&&m.abilityBy===name){resetAb(m);n++}
  if(m.flags&&m.flags.pursuit&&m.flags.pursuitBy===name){delete m.flags.pursuit;delete m.flags.pursuitBy;n++}if(m.flags&&m.flags.pursuitImmune&&m.flags.pursuitImmuneBy===name){delete m.flags.pursuitImmune;delete m.flags.pursuitImmuneBy;n++}return n}
 function unmult(m,e){m.mod=m.mod||{};for(const k in e.stats){const v=+e.stats[k]||1;m.mod[k]=Math.round(((+m.mod[k]||1)/v)*1000)/1000;if(Math.abs(m.mod[k]-1)<0.002)delete m.mod[k];if(e.temp&&m.tempMod&&m.tempMod[k]!=null){m.tempMod[k]=Math.round(((+m.tempMod[k]||1)/v)*1000)/1000;if(Math.abs(m.tempMod[k]-1)<0.002)delete m.tempMod[k]}}}
 /* 효과 하나 해제 (id 는 chips 의 id) */
 function remove(m,id){const F=fx(m);const [kind,key]=id.split(/:(.+)/);if(['mods','noind','prio','immune','nodrop','chance'].includes(kind)){F[kind]=F[kind].filter(e=>e.key!==key);if(kind==='mods')F.prio=F.prio.filter(e=>!(e.next&&e.key===key));return true}
  if(kind==='mults'){const e=F.mults.find(x=>x.key===key);if(e)unmult(m,e);F.mults=F.mults.filter(x=>x.key!==key);return true}
  if(kind==='ignoreUp'){F.ignoreUp=null;return true}if(kind==='float'){F.float=null;return true}if(kind==='roles'){F.roles=[];return true}if(kind==='types'){if(m.typesOrig){m.types=m.typesOrig;delete m.typesOrig}return true}if(kind==='ability'){resetAb(m);return true}if(kind==='pursuit'){if(m.flags)delete m.flags.pursuit;return true}if(kind==='pursuitImmune'){if(m.flags){delete m.flags.pursuitImmune;delete m.flags.pursuitImmuneBy}return true}return false}
 function untransform(m){const x=m&&m.xform;if(!x)return '';if(m.ability&&m.ability!==x.ability)removeByName(m,m.ability);m.types=x.types;m.ability=x.ability;m.abilityEff=x.abilityEff;m.stats=x.stats;m.rank=x.rank;m.moves=x.moves;m.image=x.image;delete m.xform;return `${m.name} 변신이 풀렸다`}
 function removeAll(m){untransform(m);const F=fx(m);for(const e of F.mults)unmult(m,e);F.mults=[];F.mods=[];F.noind=[];F.prio=[];F.immune=[];F.nodrop=[];F.chance=[];F.ignoreUp=null;F.float=null;F.roles=[];if(m.typesOrig){m.types=m.typesOrig;delete m.typesOrig}resetAb(m);if(m.flags){delete m.flags.pursuit;delete m.flags.pursuitBy;delete m.flags.pursuitImmune;delete m.flags.pursuitImmuneBy}if(m.typesBy)delete m.typesBy;if(m.abilityBy)delete m.abilityBy;F.rolesBy=''}

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
  const op=parseLine0(line);if(op&&op.k!=='?'){if(p)op.p=p;if(pl)op.pl=pl;if(hold)op.hold=1}return op}
 function parseLine0(line){line=line.trim();if(!line||line.startsWith('#'))return null;const words=line.split(/\s+/);const head=words.shift();
  const n=s=>{const m=String(s).match(/-?\d+(\.\d+)?/);return m?+m[0]:0};const turns=()=>{const i=words.findIndex(w=>/^\d+턴$/.test(w));if(i<0)return null;const v=+words[i].replace('턴','');words.splice(i,1);return v};const has=w=>{const i=words.indexOf(w);if(i<0)return false;words.splice(i,1);return true};
  const types=()=>{const i=words.findIndex(w=>/^타입[:：]?/.test(w));if(i<0)return [];let v=words[i].replace(/^타입[:：]?/,'');if(!v&&words[i+1]){v=words[i+1];words.splice(i,2)}else words.splice(i,1);return v.split(/[,/·]/).map(x=>KO_TYPE[x.trim()]||x.trim()).filter(Boolean)};
  switch(head){
   case '랭크':case '배율':{const tgt=tgtOf(words)||'self';const temp=has('임시')||has('턴종료까지');const forced=has('강제');const p7=has('명중회피포함')||has('7능력');const stats={};let rnd=null;for(const w of words){let m=w.match(/^무작위(\d+)?(?:개)?\s*([+\-×x*])\s*(\d+(?:\.\d+)?)$/);if(m){rnd={n:+m[1]||1,v:m[2]==='-'?-+m[3]:+m[3]};continue}m=w.match(/^(.+?)\s*([+\-×x*])\s*(\d+(?:\.\d+)?)$/);if(!m)continue;const k=KO_STAT[m[1]];if(!k)continue;/* 10-26 점검: 랭크는 ±, 배율은 × 만 — 섞이면 모르는 줄로 */if(head==='랭크'&&/[×x*]/.test(m[2])||head==='배율'&&/[+\-]/.test(m[2]))return {k:'?',raw:line,why:head==='랭크'?'랭크는 +1 · -1 처럼 적어요 (×는 배율)':'배율은 ×1.5 처럼 적어요 (+는 랭크)'};if(head==='배율'&&+m[3]===1)continue;stats[k]=m[2]==='-'?-+m[3]:+m[3]}if(rnd&&p7)rnd.pool='7';if(!rnd&&!Object.keys(stats).length)return {k:'?',raw:line,why:'능력치와 값을 못 읽었어요'};return Object.assign({k:head==='랭크'?'rank':'mult',tgt,stats},rnd?{rnd}:{},temp?{temp:1}:{},forced?{forced:1}:{})}
   case '초기화':{const what=words.includes('배율')?'mult':words.includes('랭크')?'rank':'all';return {k:'reset',what,tgt:tgtOf(words)||'self'}}
   case '위력':case '완화':{const op={k:head==='위력'?'boost':'guard',tgt:'self',v:1,types:[],cat:'all',eff:'all',rng:'all',uses:-1,turn:0,tl:0,ro:[],st:'',tg:[],sb:''};const vi=words.findIndex(w=>/^[×x*]?\d+(\.\d+)?$/.test(w));if(vi>=0){op.v=n(words[vi]);words.splice(vi,1)}
    op.tgt=tgtOf(words)||'self';op.types=types();if(has('물리'))op.cat='physical';if(has('특수'))op.cat='special';if(has('굉장'))op.eff='super';if(has('별로'))op.eff='weak';if(has('보통'))op.eff='normal';if(has('단일'))op.rng='single';if(has('전체기'))op.rng='multi';if(has('자속'))op.sb='stab';if(has('비자속'))op.sb='nonstab';if(has('이번턴'))op.turn=1;if(has('수세'))op.st='def';if(has('공세'))op.st='off';if(has('확정급소'))op.cx='sure';if(has('급소없음'))op.cx='none';if(has('견딤'))op.ed=1;if(has('해제'))op.remove=1;
    const tl=turns();if(tl!=null)op.tl=tl;const ui=words.findIndex(w=>/^\d+회$/.test(w));if(ui>=0){op.uses=+words[ui].replace('회','');words.splice(ui,1)}
    for(let i=words.length-1;i>=0;i--){const w=words[i];let m;if((m=w.match(/^태그[:：]?(.+)$/))){op.tg=m[1].split(/[,·]/).filter(Boolean);words.splice(i,1)}else if((m=w.match(/^역할[:：]?(.+)$/))){op.ro=m[1].split(/[,·]/).filter(Boolean);words.splice(i,1)}else if((m=w.match(/^위력[≥>=]+(\d+)$/))){op.pmin=+m[1];words.splice(i,1)}else if((m=w.match(/^위력[≤<=]+(\d+)$/))){op.pmax=+m[1];words.splice(i,1)}else if((m=w.match(/^급소방호(\d+)$/))){op.cg=+m[1];words.splice(i,1)}else if((m=w.match(/^급소\+(\d+)$/))){op.cr=+m[1];words.splice(i,1)}else if((m=w.match(/^알그룹[:：]?(.+)$/))){op.eg=m[1];words.splice(i,1)}}
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
   case '타입':{const tgt=tgtOf(words)||'self';let mode='add';if(has('변경'))mode='set';if(has('원래')||has('해제'))mode='reset';has('추가');const ts=words.join(',').split(/[,/·]/).map(x=>KO_TYPE[x.trim()]||x.trim()).filter(Boolean);return {k:'type',tgt,mode,types:ts}}
   case '특성':{const tgt=tgtOf(words)||'enemy1';let mode='set';if(has('원래')||has('해제'))mode='reset';has('변경');return {k:'trait',tgt,mode,tn:words.join(' ')}}
   case '반드시':case '반드시교대':{has('교대');const tgt=tgtOf(words)||'self';const tl=turns();return {k:'noind',tgt,mode:has('해제')?'off':'on',kind:'freesw',turns:tl!=null?tl:-1}}
   case '예고':{const state=takeState(words);const pi=words.indexOf('위력');let pow=0;if(pi>=0){pow=n(words[pi+1]||'');words.splice(pi,2)}const ki=words.indexOf('기술');let mv='';if(ki>=0){mv=words[ki+1]||'';words.splice(ki,2)}return {k:'future',state:stEn(state)||state,mv,pow,tgt:tgtOf(words)||'enemy1'}}
   case '변신':{if(has('해제')||has('원래'))return {k:'transform',mode:'reset'};return {k:'transform',tgt:tgtOf(words)||'enemy1',keepImg:has('그림유지')?1:0}}
   case '교대무시':{const tgt=tgtOf(words)||'self';const tl=turns();return {k:'noind',tgt,mode:has('해제')?'off':'on',kind:'switch',turns:tl!=null?tl:-1}}
   case '비례무시':{const tgt=tgtOf(words)||'self';const tl=turns();let kind='';if(has('빈사'))kind='noko';if(has('설치기'))kind='hazard';if(has('설치기피해'))kind='hazdmg';if(has('반동'))kind='recoil';const mode=has('해제')?'off':'on';return {k:'noind',tgt,mode,kind,turns:tl!=null?tl:-1}}
   case '우선도':{const vi=words.findIndex(w=>/^[+\-=]?\d+(\.\d+)?$/.test(w));let v=0,mode='add';if(vi>=0){const w=words.splice(vi,1)[0];if(w.startsWith('='))mode='set';v=n(w)}const tgt=tgtOf(words)||'self';const ty=types();let cat='all';if(has('물리'))cat='물리';if(has('특수'))cat='특수';if(has('변화'))cat='변화';const dur=has('이번턴')?'turn':'keep';if(has('해제'))mode='off';const ti=words.findIndex(w=>/^태그[:：]?/.test(w));const tag=ti>=0?words.splice(ti,1)[0].replace(/^태그[:：]?/,''):'';return {k:'prio',tgt,mode,v,cat,type:ty[0]||'',dur,tag}}
   case '면역':{const tgt=tgtOf(words)||'self';const mode=has('해제')?'off':'on';const states=words.join(',').split(/[,·]/).map(x=>x.trim()).filter(Boolean).map(x=>x==='이상'?'abnormal':(stEn(x)||x));return {k:'immune',tgt,mode,states}}
   case '감소무시':{const tgt=tgtOf(words)||'self';const tl=turns();const mode=has('해제')?'off':'on';const st=KO_STAT[words[0]]||'';return {k:'nodrop',tgt,mode,st,turns:tl!=null?tl:-1,ytype:'',ro:[]}}
   case '강화무시':{/* 받음 · 공격시 둘 다 쓰거나 「양방향」이면 주고받을 때 모두 (천진) */const rv=has('받음')||has('받을때'),av=has('공격시'),bo=has('양방향');const dir=bo||(rv&&av)?'both':rv?'recv':'atk';const sc=[];if(has('방어'))sc.push('def');if(has('회피'))sc.push('eva');if(has('공격'))sc.push('atk');if(has('명중'))sc.push('acc');let scope=sc.length?sc.join(','):'both';if(has('양쪽')||has('전부'))scope='both';const dnW=has('감소')||has('저하')||has('하락');const upW=has('상승');const ri=words.findIndex(w=>/^역할[:：]?/.test(w));const ro=ri>=0?words.splice(ri,1)[0].replace(/^역할[:：]?/,'').split(',').filter(Boolean):[];const allR=has('모두')||(dnW&&upW);const lv=has('랭크')?'rank':has('배율')?'mod':'';return Object.assign({k:'ignoreup',dir,scope,on:has('해제')?0:1,mode:0,ro},allR?{all:1}:dnW?{dn:1}:{},lv?{lv}:{})}
   case '하늘위':{const tgt=tgtOf(words)||'self';const tl=turns();return {k:'float',tgt,mode:has('해제')?'off':'on',turns:tl!=null?tl:-1}}
   case '역할':{let mode='add';if(has('제거'))mode='remove';if(has('초기화'))mode='clear';has('추가');return {k:'role',mode,roles:words.join(',').split(/[,·]/).map(x=>x.trim()).filter(Boolean)}}
   case '추격':{const im=has('무시')?1:0;return {k:'pursuit',on:has('해제')?0:1,hide:has('숨김')?1:0,immune:im,tgt:im?(tgtOf(words)||'self'):'self'}}
   case '추격무시':return {k:'pursuit',on:has('해제')?0:1,hide:has('숨김')?1:0,immune:1,tgt:'self'};
   case '확률':case '확률보정':{const tgt=tgtOf(words)||'self';const tl=turns();const ui=words.findIndex(w=>/^\d+회$/.test(w));const uses=ui>=0?+words.splice(ui,1)[0].replace('회',''):-1;if(has('해제'))return {k:'chance',tgt,mode:'off'};if(has('반드시')||has('확정'))return {k:'chance',tgt,sure:1,v:0,uses,turns:tl!=null?tl:-1};const vi=words.findIndex(w=>/^[+\-]?\d+(\.\d+)?(%|%p|할)?$/.test(w));let v=0;if(vi>=0){const w=words.splice(vi,1)[0];v=/할$/.test(w)?n(w)*10:n(w)}return {k:'chance',tgt,v,uses,turns:tl!=null?tl:-1}}
   case '다음기술':case '다음':{has('기술');const tgt=tgtOf(words)||'self';const op={k:'next',tgt};if(has('필중'))op.sure=1;if(has('유턴'))op.uturn=1;if(has('추격'))op.pursuit=1;if(has('확정급소'))op.cx='sure';for(const w of words){let m;if((m=w.match(/^우선도([+\-]\d+)$/)))op.prio=+m[1];else if((m=w.match(/^급소\+(\d+)$/)))op.cr=+m[1];else if((m=w.match(/^위력[×x*](\d+(?:\.\d+)?)$/)))op.pw=+m[1]}return op}
   case '상태초기화':return {k:'resetstates',tgt:tgtOf(words)||'self',group:has('전부')?'negative':'condition_abnormal'};
   case '확인':return {k:'confirm',q:words.join(' ').replace(/^["“]|["”]$/g,'')};
   case '상태턴':{const tgt=tgtOf(words)||'self';const vi=words.findIndex(w=>/^[+\-=]\d+$/.test(w));let v=0,mode='add';if(vi>=0){const w=words.splice(vi,1)[0];if(w[0]==='=')mode='set';v=n(w)}const rest=words.join('');const st=rest==='전부'||rest==='모두'?'all':rest==='부정'||rest==='이상'?'neg':stEn(rest)||rest;return {k:'stcount',tgt,st,v,mode}}
   case '조건':{const w=words.join('');if(/아군빈사/.test(w))return {k:'cond',c:'ally_fainted'};{const sm=w.match(/^(?:자신)?상태[:：](.+)$/);if(sm)return {k:'cond',c:'self_state',st:stEn(sm[1])||sm[1]}}const m=w.match(/HP[≤<=]+(\d+\/\d+)/);if(m)return {k:'cond',c:'hp_le',frac:m[1]};return {k:'confirm',q:words.join(' ')}}
   case '해석':return {k:'dex',mode:'scouter'};
   case '레이드':{const m=words.join(' ').match(/구간[:：]?(\d+)/);return {k:'raid',on:1,x:m?+m[1]:'',cond:'cap',floor:1,cure:1,cstat:1,rup:1,rmod:0}}
   case '종족치':{/* 시트 종족치: 종족치 방어,특방 +1 · 종족치 스피드 최대 — 제작기가 시트 종족치 · 실수치에 넣는다 (배틀 중엔 바꾸지 않는다) */const all=words.join(' ');const mx=/최대/.test(all);const mm=all.match(/(^|\s)([+\-]?\d+)/);const nn=mm?+mm[2]:1;const st=[];for(const w of words)for(const s of w.split(/[,\/·]/)){const t=s.trim().toUpperCase()==='HP'?'HP':s.trim();if(['HP','공격','방어','특공','특방','스피드'].includes(t)&&!st.includes(t))st.push(t)}if(!st.length||(!mx&&!nn))return {k:'?',raw:line};return {k:'baseup',stats:st,n:mx?0:nn,max:mx?1:0}}
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
 function unparse(ops){const L0=unparse0(ops);return L0.map((s,i)=>{const op=(ops||[])[i]||{};if(op.k==='choice')return s;return (op.p?(op.p%10===0?op.p/10+'할 ':op.p+'% '):op.pl?op.pl+' ':'')+s+(op.hold?' 있는한':'')})}
 function unparse0(ops){const L=[];const tg=t=>t&&t!=='self'?' '+(TGT_KO[t]||t).replace(/\s/g,''):'';const ty=ts=>ts&&ts.length?' 타입:'+ts.map(t=>TYPE_KO[t]||t).join(','):'';
  const tga=t=>' '+(TGT_KO[t||'enemy1']||t).replace(/\s/g,'');
  for(const op of ops||[]){switch(op.k){
   case 'rank':case 'mult':L.push((op.k==='rank'?'랭크':'배율')+tg(op.tgt)+' '+[...Object.entries(op.stats||{}).map(([k,v])=>STAT_KO[k]+(op.k==='rank'?(v>0?'+':'')+v:'×'+v)),...(op.rnd?['무작위'+(op.rnd.n>1?op.rnd.n+'개':'')+(op.k==='rank'?(op.rnd.v>0?'+':'')+op.rnd.v:'×'+op.rnd.v)]:[])].join(' ')+(op.rnd&&op.rnd.pool==='7'?' 명중회피포함':'')+(op.temp?' 임시':'')+(op.forced?' 강제':''));break;
   case 'reset':L.push('초기화 '+({rank:'랭크',mult:'배율'}[op.what]||'전부')+tg(op.tgt));break;
   case 'boost':case 'guard':{let s=(op.k==='boost'?'위력':'완화')+' ×'+op.v+tg(op.tgt)+ty(op.types);if(op.cat==='physical')s+=' 물리';if(op.cat==='special')s+=' 특수';if(op.eff==='super')s+=' 굉장';if(op.eff==='weak')s+=' 별로';if(op.eff==='normal')s+=' 보통';if(op.rng==='single')s+=' 단일';if(op.rng==='multi')s+=' 전체기';if(op.sb==='stab')s+=' 자속';if(op.sb==='nonstab')s+=' 비자속';if(op.tg&&op.tg.length)s+=' 태그:'+op.tg.join(',');if(op.pmin)s+=' 위력≥'+op.pmin;if(op.pmax)s+=' 위력≤'+op.pmax;if(op.ro&&op.ro.length)s+=' 역할:'+op.ro.join(',');if(op.st==='def')s+=' 수세';if(op.st==='off')s+=' 공세';if(op.cg)s+=' 급소방호'+op.cg;if(op.cr)s+=' 급소+'+op.cr;if(op.cx==='sure')s+=' 확정급소';if(op.cx==='none')s+=' 급소없음';if(op.ed)s+=' 견딤';if(op.eg)s+=' 알그룹:'+op.eg;if(op.uses>0)s+=' '+op.uses+'회';if(op.turn)s+=' 이번턴';if(op.tl>0)s+=' '+op.tl+'턴';if(op.remove)s+=' 해제';L.push(s);break}
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
   case 'type':L.push('타입'+tg(op.tgt)+' '+({add:'추가',set:'변경',reset:'원래'})[op.mode]+(op.mode==='reset'?'':' '+(op.types||[]).map(t=>TYPE_KO[t]||t).join(',')));break;
   case 'trait':L.push('특성'+tga(op.tgt)+' '+(op.mode==='reset'?'원래':'변경 '+op.tn));break;
   case 'future':L.push('예고 '+stKoW(op.state)+(op.mv&&op.mv!==stKo(op.state)?' 기술 '+op.mv:'')+(op.pow?' 위력 '+op.pow:'')+tga(op.tgt||'enemy1'));break;
   case 'transform':L.push(op.mode==='reset'?'변신 해제':'변신'+tga(op.tgt||'enemy1')+(op.keepImg?' 그림유지':''));break;
   case 'noind':if(op.kind==='freesw'){L.push('반드시 교대'+tg(op.tgt)+(op.turns>0?' '+op.turns+'턴':'')+(op.mode==='off'?' 해제':''));break}if(op.kind==='switch'){L.push('교대무시'+tg(op.tgt)+(op.turns>0?' '+op.turns+'턴':'')+(op.mode==='off'?' 해제':''));break}L.push('비례무시'+tg(op.tgt)+({'':'',noko:' 빈사',hazard:' 설치기',hazdmg:' 설치기피해',recoil:' 반동'})[op.kind||'']+(op.turns>0?' '+op.turns+'턴':'')+(op.mode==='off'?' 해제':''));break;
   case 'prio':L.push('우선도 '+(op.mode==='set'?'=':(op.v>0?'+':''))+op.v+tg(op.tgt)+(op.type?ty([op.type]):'')+(op.cat&&op.cat!=='all'?' '+op.cat:'')+(op.tag?' 태그:'+op.tag:'')+(op.dur==='turn'?' 이번턴':'')+(op.mode==='off'?' 해제':''));break;
   case 'immune':L.push('면역'+tg(op.tgt)+' '+(op.states||[]).map(s=>s==='abnormal'?'이상':stKoW(s)).join(',')+(op.mode==='off'?' 해제':''));break;
   case 'nodrop':L.push('감소무시'+tg(op.tgt)+(op.st?' '+STAT_KO[op.st]:'')+(op.turns>0?' '+op.turns+'턴':'')+(op.mode==='off'?' 해제':''));break;
   case 'ignoreup':L.push('강화무시 '+(op.dir==='both'?'양방향':op.dir==='recv'?'받음':'공격시')+' '+(op.scope==='both'||!op.scope?'양쪽':String(op.scope).split(',').map(x=>SCOPE_KO[x]||x).join(' '))+(op.all?' 모두':op.dn?' 감소':'')+iuLv(op.lv)+(op.ro&&op.ro.length?' 역할:'+op.ro.join(','):'')+(op.on?'':' 해제'));break;
   case 'float':L.push('하늘위'+tg(op.tgt)+(op.turns>0?' '+op.turns+'턴':'')+(op.mode==='off'?' 해제':''));break;
   case 'role':L.push('역할 '+({add:'추가',remove:'제거',clear:'초기화'})[op.mode]+' '+(op.roles||[]).join(','));break;
   case 'pursuit':L.push('추격'+(op.immune?' 무시'+tg(op.tgt):'')+(op.on?'':' 해제')+(op.hide?' 숨김':''));break;
   case 'resetstates':L.push('상태초기화'+tg(op.tgt)+(op.group==='negative'?' 전부':''));break;
   case 'confirm':L.push('확인 "'+op.q+'"');break;
   case 'cond':L.push('조건 '+(op.c==='ally_fainted'?'아군빈사':op.c==='self_state'?'상태:'+stKoW(op.st):'HP≤'+op.frac));break;
   case 'stcount':L.push('상태턴'+tg(op.tgt)+' '+(op.st==='all'?'전부':op.st==='neg'?'부정':stKoW(op.st))+' '+(op.mode==='set'?'=':(op.v>=0?'+':''))+op.v);break;
   case 'choice':L.push((op.multi?'선택 여럿:':'선택:')+'\n'+op.opts.map(o=>'- '+o.label+' → '+unparse(o.ops).join('; ')).join('\n'));break;
   case 'chance':L.push(op.mode==='off'?'확률 해제'+tg(op.tgt):'확률 '+(op.sure?'반드시':(op.v>0?'+':'')+op.v+'%')+tg(op.tgt)+(op.uses>0?' '+op.uses+'회':'')+(op.turns>0?' '+op.turns+'턴':''));break;
   case 'next':L.push('다음기술'+tg(op.tgt)+(op.sure?' 필중':'')+(op.uturn?' 유턴':'')+(op.pursuit?' 추격':'')+(op.prio?' 우선도'+(op.prio>0?'+':'')+op.prio:'')+(op.cr?' 급소+'+op.cr:'')+(op.cx==='sure'?' 확정급소':'')+(op.pw&&+op.pw!==1?' 위력×'+op.pw:''));break;
   case 'raid':L.push('레이드'+(op.x?' 구간:'+op.x:''));break;case 'dex':L.push('해석');break;
   case 'baseup':L.push('종족치 '+op.stats.join(',')+' '+(op.max?'최대':(op.n>0?'+':'')+op.n));break;
   case 'stmod':L.push('상태수정 '+stKoW(op.st)+' '+op.n+'/'+op.d);break;
   default:L.push('# '+JSON.stringify(op))}}
  return L}
 /* 사람이 읽는 설명 (미리보기·로그) */
 function describe(ops){return unparse(ops)}
 return {reAura,effOf,rmChance,rollP,lineChance,release,nextOf,scopeKo,chanceOf,setAb,resetAb,stMod,untransform,FUTURE,rm,rmAll,autoOf,run,attackMods,consume,prioOf,turnEnd,chips,remove,removeAll,removeByName,timing,percentOf,percentBase,parse,unparse,describe,noind,noindName,floating,terrainBlock,magicRoom,itemOff,immuneHit,nodropHit,liveMods,modDesc,TGT_KO,STAT_KO,TYPE_KO,NEG,ABN,stEn,stKo};
})();
