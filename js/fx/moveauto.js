/* ---------- 기술 자동화: 기술 DB 효과 글 → 자동 적용 데이터 ----------
   효과 글을 문장마다 읽어서 아는 꼴만 op 로 바꾼다. 모르는 문장(조건부·특수 처리)은 notes 로 남겨 손으로 처리하게 한다.
   · 레디메이드 「기술 : 이름」 이 있으면 그것이 이긴다 (DB 관리에서 손으로 고친 자동화).
   결과 {groups, recoil, drain, notes, src}
    groups: [{n:확률(할, 10=확정), sec:「N할」로 적힌 부가효과(은밀망토·하늘의은총 대상), label, who:'target'|'once', ops, oneOf?:[ops…], when:'hit'|'use'}]
            who='target' 은 맞은 대상마다 굴리고, 'once' 는 기술 한 번에 한 번 (자신·상대 전체 같은 것)
            op.tgt 'target' = 이 기술을 맞은 대상 (적용할 때 실제 포켓몬으로 바꾼다)
    recoil: {frac:'1/3', basis:'dealt'|'max', when:'hit'|'miss'}   drain: '1/2' (가한 대미지 비례 회복) */
"use strict";
window.OM_MOVEAUTO=(()=>{
 const FX=()=>window.OM_FX;
 const KO_STAT={공격:'attack',방어:'defense',특공:'specialattack',특방:'specialdefense',스피드:'speed',명중:'accuracy',회피:'evasion',C:'critical',급소:'critical'};
 const COND=/(때|라면|경우|이라면|으면|않으면|하면|이성에게|중 무작위|무작위한|에 따라|만큼 오른|비례해)/;
 const TAG_ONLY=/^(「[^」]+」)+\s*기술$/;
 const SILENT=/^「필중기」$|^「우선도」\s*[+-]\d+$|^「연속 제한[^」]*」$|^기술이 급소에 맞기 쉽다|^「(차지|설치기|다이브)」 기술$|^「연속기\s*:[^」]*」$|^통상기$|^「설치기」$|무시하지만 위력이 저하/;
 const statsOf=s=>{const o={};for(const k of String(s).split(/[\/,·]/).map(x=>x.trim()).filter(Boolean)){if(!KO_STAT[k])return null;o[KO_STAT[k]]=1}return Object.keys(o).length?o:null};
 const ALIAS={바인드:'Bind'};
 const stEn=k=>ALIAS[k]||(FX()?FX().stEn(k):'');
 const turnsOf=s=>{const m=s.match(/(\d+)(?:~(\d+))?턴\s*동안/);return m?(m[2]?{min:+m[1],max:+m[2]}:{min:+m[1],max:+m[1]}):null};

 /* 한 문장에서 랭크 변화들: 「공격/방어 : +1」 · 「공격/특공」-1 · 「반동 (특공) : -2」 */
 function ranks(s){const out=[];const re=/「(반동\s*\(([^)]+)\)|[^」:]+?)\s*(?::\s*([+-]\d+))?」\s*([+-]\d+)?/g;let m;
  while((m=re.exec(s))){const v=m[3]||m[4];if(!v)continue;const recoil=!!m[2];const st=statsOf(recoil?m[2]:m[1]);if(!st)continue;const stats={};for(const k in st)stats[k]=+v;out.push({stats,recoil,at:m.index})}
  return out}
 /* 한 문장에서 상태: 「화상」 · 「독」「혼란」 · 「화상/마비/얼음」 중 하나 */
 function states(s){const out=[];const re=/「([^」]+)」/g;let m;while((m=re.exec(s))){const parts=m[1].split('/').map(x=>x.trim());const en=parts.map(stEn);if(en.every(Boolean))out.push({en,at:m.index})}return out}

 function whoFor(s,v,mv){
  if(/자신의|자신에게|자신은|사용 후 자신|자신이/.test(s))return 'self';
  if(/상대 전체(에게|의|를)/.test(s))return 'enemy';
  if(/아군 전체(에게|의|를)/.test(s))return 'ally';
  if(/대상(에게|의|을|를|은)/.test(s))return 'target';
  const r=String(mv.range||'');if(r==='자신'||r==='자진')return 'self';
  if(mv.cat==='변화')return 'target';
  return v>0?'self':'target'}

 function parse(mv){
  mv=mv||{};const name=String(mv.name||'').trim();
  const R=FX()&&FX().rm?FX().rm('기술 : '+name):null;
  if(R&&R.ops&&R.ops.length)return {groups:[{n:10,label:'레디메이드 「기술 : '+name+'」',who:'once',ops:R.ops,when:'hit'}],recoil:null,drain:null,notes:[],src:'rm'};
  const txt=String(mv.eff||'').replace(/\r/g,'').replace(/\n+/g,' ');
  const sents=txt.split(/[.。](?!\d)/).map(x=>x.trim()).filter(Boolean);
  const groups=[],notes=[];let recoil=null,drain=null,critSure=false,selfFaint=false;
  for(let s of sents){
   if(TAG_ONLY.test(s)||SILENT.test(s))continue;
   const hitOnly=/^명중 후\s*/.test(s);s=s.replace(/^명중 후\s*/,'').replace(/^사용 후\s*(?=자신)/,'');
   /* 반동 비례 대미지 */
   let m=s.match(/^(명중하지 않았을 때\s*)?「반동 비례 대미지\s*:\s*(최대\s*HP\s*)?(\d+\/\d+)」$/)||s.match(/^(명중하지 않았을 때\s*)?공격 후\s*「반동 비례 대미지\s*:\s*(최대\s*HP\s*)?(\d+\/\d+)」$/);
   if(m){recoil={frac:m[3],basis:m[2]?'max':'dealt',when:m[1]?'miss':'hit'};continue}
   m=s.match(/^(\d+\/\d+)의 드레인$/);if(m){drain=m[1];continue}
   m=s.match(/^(?:자신의\s*)?「HP」를\s*(\d+\/\d+)만큼 회복한다$/);if(m){groups.push({n:10,label:'HP '+m[1]+' 회복',who:'once',ops:[{k:'heal',tgt:'self',value:m[1]}],when:'use'});continue}
   if(/^반드시 급소에 맞는다$/.test(s)){critSure=true;continue}
   if(/^사용 후 「빈사」 상태가 된다$/.test(s)){selfFaint=true;continue}
   if(/^사용자와 대상의 「얼음」을 치유한다$/.test(s)){groups.push({n:10,label:s,who:'once',ops:[{k:'cure',tgt:'self',states:['Freeze']}],when:'hit'},{n:10,label:s,who:'target',ops:[{k:'cure',tgt:'target',states:['Freeze']}],when:'hit'});continue}
   m=s.match(/^「HP」를 (\d+\/\d+)만큼 소비하여\s*(.+)$/);if(m){groups.push({n:10,label:'HP '+m[1]+' 소비',who:'once',ops:[{k:'dmg',tgt:'self',value:m[1],nofaint:1}],when:'use'});s=m[2]}
   m=s.match(/^(대상|상대 전체)의 「얼음」을 치유한다$/);if(m){groups.push({n:10,label:s,who:m[1]==='대상'?'target':'once',ops:[{k:'cure',tgt:m[1]==='대상'?'target':'enemy',states:['Freeze']}],when:'hit'});continue}
   m=s.match(/^대상에게 「현재 HP」의 (\d+\/\d+)만큼의 비례 대미지를 입힌다$/);if(m){groups.push({n:10,label:s,who:'target',ops:[{k:'dmg',tgt:'target',basis:'cur',value:m[1]}],when:'hit'});continue}
   if(COND.test(s)&&!/^(\d+)할/.test(s)){notes.push(s);continue}
   /* 확률: 맨 앞 N할 (한 문장에 하나) */
   let n=10;const cm=s.match(/^(\d+)할\s*(?:의\s*확률로\s*)?/);if(cm){n=+cm[1];s=s.slice(cm[0].length)}
   if(COND.test(s)){notes.push((cm?cm[0]:'')+s);continue}
   const rk=ranks(s),st=states(s);
   const rest=s.replace(/「[^」]*」\s*([+-]\d+)?/g,'').replace(/\s+/g,' ').trim();
   /* 남는 말이 아는 꼴(대상에게, 상태로 만든다 …)뿐일 때만 자동 */
   const okRest=/^(대상에게|대상의|대상을|자신의|자신에게|상대 전체에게|상대 전체를|상대 전체의|아군 전체의|아군 전체에게|아군의|사용 후 자신의|\d+(~\d+)?턴 동안|상태로 만든다|상태가 된다|중 하나|한다|,|\s)*$/.test(rest);
   if(!okRest||(!rk.length&&!st.length)){notes.push((cm?cm[0]:'')+s);continue}
   const label=(n<10?n+'할 ':'')+s;
   const byWho={};const add=(who,op)=>{(byWho[who]=byWho[who]||[]).push(op)};
   for(const r of rk){const v=+Object.values(r.stats)[0];const who=r.recoil?'self':whoFor(s,v,mv);add(who,{k:'rank',tgt:who,stats:r.stats})}
   let oneOf=null;const tt=turnsOf(s);
   for(const x of st){const who=whoFor(s,-1,mv);
    const mk=en=>({k:'state',tgt:who,state:en,count:tt?(tt.min+Math.floor(Math.random()*(tt.max-tt.min+1))):undefined});
    if(x.en.length>1&&/중 하나/.test(s)){oneOf={who,ops:x.en.map(en=>[mk(en)])};continue}
    for(const en of x.en)add(who,mk(en))}
   if(oneOf)groups.push({n,sec:!!cm,label,who:oneOf.who==='target'?'target':'once',ops:[],oneOf:oneOf.ops,when:'hit'});
   for(const who in byWho)groups.push({n,sec:!!cm,label,who:who==='target'?'target':'once',ops:byWho[who],when:'hit'})}
  return {groups,recoil,drain,critSure,selfFaint,notes,src:'parse'}}

 /* 사람이 읽는 한 줄 요약 */
 function describe(a){if(!a)return '';const L=[];
  for(const g of a.groups){const body=g.oneOf?g.oneOf.map(o=>FX().unparse(o).join(' ')).join(' 또는 '):FX().unparse(g.ops).join(' / ');L.push((g.n<10?g.n+'할 ':'')+body)}
  if(a.recoil)L.push(`반동 ${a.recoil.basis==='max'?'최대 HP ':'가한 대미지 '}${a.recoil.frac}${a.recoil.when==='miss'?' (빗나갔을 때)':''}`);
  if(a.drain)L.push(`드레인 ${a.drain}`);if(a.selfFaint)L.push('사용 후 자신 빈사');if(a.critSure)L.push('확정 급소');return L.join(' · ').replace(/ target/g,' 대상')}
 const auto=a=>!!a&&!!(a.groups.length||a.recoil||a.drain||a.selfFaint||a.critSure);
 return {parse,describe,auto}})();
