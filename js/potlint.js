/* ---------- 포텐셜 워딩 도우미 (2026-10-24 망령: 뉴비가 포텐셜 문장을 어려워한다) ----------
   포텐셜 DB(576개)의 문장 꼴을 기준으로, 처음 쓰는 사람이 자주 틀리는 표현을 찾아 고칠 안을 내고(check / fix / fixAll),
   고친 문장에서 오레마스 자동화 구문(js/fx/fx.js 의 한국어 구문)으로 옮길 수 있는 줄을 추천한다(suggest).
   규칙은 DB 문장 꼴: 【1/시】【선행】/효과 · 「공격 : +1」한다 · 「스피드」를 강화(1.5배)한다 · 받을 대미지를 완화(0.75배)한다 ·
   「HP : 1/2 이하」일 때 · 턴 종료 시까지 · 2턴 동안 · 「화상」 상태로 만든다 · 급소에 맞기 쉬워진다(C+1) · ①② 번호 · 「~한다.」 끝맺음 */
"use strict";
window.MKM_POTLINT=(()=>{
 const STAT={'공격력':'공격','공격':'공격','방어력':'방어','방어':'방어','특수공격':'특공','특수 공격':'특공','특공':'특공','특수방어':'특방','특수 방어':'특방','특방':'특방','스피드':'스피드','속도':'스피드','민첩':'스피드','스피드':'스피드','명중률':'명중','명중':'명중','회피율':'회피','회피':'회피'};
 const STAT_RE='공격력|공격|방어력|방어|특수 ?공격|특공|특수 ?방어|특방|스피드|속도|민첩|명중률|명중|회피율|회피';
 const stat=s=>STAT[String(s).replace(/\s+/g,s.includes('특수')?' ':'')]||STAT[String(s).replace(/\s+/g,'')]||s;
 const PCT={50:'1/2',25:'1/4',33:'1/3',75:'3/4',20:'1/5',10:'1/10',66:'2/3',67:'2/3'};
 const NUM={'한':1,'두':2,'세':3,'네':4,'1':1,'2':2,'3':3,'4':4,'5':5,'6':6};
 const ST_VERB=[[/화상을 ?입힌다|화상을 ?입게 한다|화상 상태 ?이상을 ?(?:건다|부여한다)/g,'화상'],[/마비시킨다|마비를 ?건다|마비 상태 ?이상을 ?(?:건다|부여한다)/g,'마비'],[/잠재운다|잠들게 한다|수면 상태로 만든다/g,'잠듦'],[/혼란시킨다|혼란을 ?건다/g,'혼란'],[/(?:중독시킨다|독을 ?건다|독에 걸리게 한다)/g,'독'],[/맹독을 ?건다/g,'맹독'],[/얼린다|얼어붙게 한다/g,'얼음'],[/풀죽게 한다|풀죽인다/g,'풀죽음']];
 const r1=n=>Math.round(n*100)/100;
 const end=e=>/고$/.test(e||'')?'하고':/며$/.test(e||'')?'하며':'한다';
 /* 규칙: re(g) · msg · to(…match) → 바꿀 글. skip(match, text, index) 이면 건너뛴다 */
 const RULES=[
  {id:'polite',msg:'끝맺음은 「~한다」 꼴로 (DB 문장은 모두 평서형)',re:/(합니다|됩니다|입니다|해요|돼요|예요|이에요)(?=[.\s」)]|$)/g,to:m=>({'합니다':'한다','됩니다':'된다','입니다':'이다','해요':'한다','돼요':'된다','예요':'이다','이에요':'이다'})[m]},
  {id:'noun-end',msg:'「~함 / ~됨」 대신 「~한다 / ~된다」',re:/(\S)(함|됨)(?=\.|$|\n)/g,skip:m=>/^포함$/.test(m),to:(m,a,b)=>a+(b==='함'?'한다':'된다')},
  {id:'stat-word',msg:'능력치 이름은 「공격 · 방어 · 특공 · 특방 · 스피드 · 명중 · 회피」',re:/(공격력|방어력|특수 ?공격|특수 ?방어)(?!\s*:)/g,to:m=>stat(m)},
  {id:'hp-word',msg:'「체력」은 「HP」',re:/체력/g,to:()=>'HP'},
  {id:'dmg-word',msg:'「데미지 / 피해량」은 「대미지」',re:/데미지|피해량/g,to:()=>'대미지'},
  {id:'rank',msg:'랭크 변화는 「스탯 : +n」한다 꼴로',re:new RegExp(`(?:「)?(${STAT_RE})(?:」)?(?:을|를|이|가|의)?\\s*([+-]?\\d|한|두|세)\\s*(?:랭크|단계|칸)\\s*(상승|올린다|올라간다|오른다|증가|하락|내린다|내려간다|떨어진다|감소)(시킨다|한다|된다|시키고|하고|되고|시키며|하며|되며)?`,'g'),
   skip:(m,t,i)=>/종족치.{0,8}$/.test(t.slice(Math.max(0,i-12),i))||/「[^」]*\/$/.test(t.slice(Math.max(0,i-30),i))||/^[^「]*」/.test(m)&&/「[^」]*$/.test(t.slice(0,i)),to:(m,s,n,v,e)=>{const d=/하락|내린|내려|떨어|감소/.test(v)?'-':'+';return `「${stat(s)} : ${d}${NUM[String(n).replace(/[+-]/,'')]||String(n).replace(/[+-]/,'')}」${end(e)}`}},
  {id:'rank-all',msg:'모든 능력치 랭크는 「공격/방어/특공/특방/스피드 : +n」한다',re:/(?:모든 능력치|전 ?능력치?)(?:을|를|이|가|의)?\s*([+-]?\d|한|두)\s*(?:랭크|단계|칸)\s*(상승|올린다|올라간다|오른다|증가|하락|내린다|내려간다|떨어진다|감소)(시킨다|한다|된다|시키고|하고|되고|시키며|하며|되며)?/g,
   to:(m,n,v,e)=>`「공격/방어/특공/특방/스피드 : ${/하락|내린|내려|떨어|감소/.test(v)?'-':'+'}${NUM[String(n).replace(/[+-]/,'')]||String(n).replace(/[+-]/,'')}」${end(e)}`},
  {id:'rank-raw',msg:'랭크 변화는 「스탯 : +n」 꼴로 (낫표 · 띄어쓰기)',re:new RegExp(`(?<![「\\w])(${STAT_RE})\\s*([+-])\\s*(\\d)(?![\\d.배]|」)`,'g'),to:(m,s,d,n)=>`「${stat(s)} : ${d}${n}」`},
  {id:'rank-space',msg:'「스탯 : +n」 띄어쓰기',re:new RegExp(`「(${STAT_RE}|HP)\\s*:\\s*([+-]?\\d[^」]*)」`,'g'),skip:m=>/「\S+ : \S/.test(m),to:(m,s,v)=>`「${stat(s)} : ${v.trim()}」`},
  {id:'mult-pct',msg:'퍼센트 대신 배율로: 「스탯」을 강화(n배)한다',re:new RegExp(`(?:「)?(${STAT_RE})(?:」)?(?:을|를|이|가)?\\s*(\\d+)\\s*%\\s*(증가|상승|올린다|늘어난다|강화)(한다|된다|시킨다|하고|되고|시키고|하며|되며)?`,'g'),to:(m,s,p,v,e)=>`「${stat(s)}」를 강화(${r1(1+ +p/100)}배)${end(e)}`},
  {id:'mult-x',msg:'배율은 「스탯」을 강화(n배)한다 꼴로',re:new RegExp(`(?:「)?(${STAT_RE})(?:」)?(?:을|를|이|가)?\\s*(\\d+(?:\\.\\d+)?)\\s*배(?:로)?\\s*(증가|상승|올린다|늘어난다|늘린다)(한다|된다|시킨다|하고|되고|시키고|하며|되며)?`,'g'),to:(m,s,x,v,e)=>`「${stat(s)}」를 강화(${x}배)${end(e)}`},
  {id:'mult-bracket',msg:'능력치 이름은 낫표로: 「스피드」를 강화(n배)',re:new RegExp(`(?<![「\\w])(${STAT_RE})(을|를|이|가) (강화|저하)\\(`,'g'),skip:(m,t,i)=>/의 $/.test(t.slice(Math.max(0,i-2),i))||/^명중/.test(m),to:(m,s,j,v)=>`「${stat(s)}」${j} ${v}(`},
  {id:'stat-bracket',msg:'능력치는 낫표로: 「스피드」를 (금지어: 스피드를 · 공격은 …)',re:/(?<![「\w가-힣\/])(공격|방어|특공|특방|스피드|명중|회피)(은|는|이|가|을|를|으로|로)(?=[\s.,]|$)/g,skip:(m,t,i)=>/」의 $/.test(t.slice(Math.max(0,i-3),i))||/^공격(?:으로|로)$/.test(m)||/^공격/.test(m)&&(/(?:추가|상대의) $/.test(t.slice(Math.max(0,i-4),i))||/^\S+\s*(?:받|참|명중|내보|회피|맞|막|피하|할 때|했을)/.test(t.slice(i,i+12))),to:(m,s,j)=>`「${s}」${j}`},
  {id:'kind-word',msg:'기술 분류는 「물리기 · 특수기 · 접촉기 · 변화기」',re:/(?<!「)(물리|특수|접촉|변화) ?기술/g,to:(m,k)=>`「${k}기」`},
  {id:'all-stat',msg:'「전능력」은 「모든 능력치」',re:/전 ?능력치?/g,to:()=>'모든 능력치'},
  {id:'spacing',msg:'띄어쓰기: 종료 시 · 개시 시 · 상태 이상',re:/(종료|개시)시(\s*까지)?|상태이상|상태변화/g,to:(m,a,b)=>a?a+' 시'+(b?'까지':''):m==='상태이상'?'상태 이상':'상태 변화'},
  {id:'pow-pct',msg:'위력 · 대미지 증가는 「기술의 대미지를 강화(n배)한다」',re:/(「[^」]+기」의 |기술의 )?(?:위력|대미지|공격 대미지)(?:이|가|을|를)?\s*(\d+)\s*%\s*(?:증가|상승|강화)(?:한다|된다)?/g,to:(m,pre,p)=>`${pre&&pre[0]==='「'?pre:'기술의 '}대미지를 강화(${r1(1+ +p/100)}배)한다`},
  {id:'pow-x',msg:'위력 · 대미지 증가는 「기술의 대미지를 강화(n배)한다」',re:/(「[^」]+기」의 |기술의 )?(?:위력|대미지)(?:이|가|을|를)?\s*(\d+(?:\.\d+)?)\s*배(?:로)?\s*(?:증가|상승|된다|늘어난다)(?:한다)?/g,to:(m,pre,x)=>`${pre&&pre[0]==='「'?pre:'기술의 '}대미지를 강화(${x}배)한다`},
  {id:'guard-pct',msg:'받는 대미지 감소는 「기술로 받을 대미지를 완화(n배)한다」',re:/받는 (?:대미지|피해)(?:가|를)?\s*(\d+)\s*%\s*(?:감소|줄어든다|줄인다|경감)(?:한다|된다|시킨다)?/g,to:(m,p)=>`기술로 받을 대미지를 완화(${r1(1-p/100)}배)한다`},
  {id:'guard-x',msg:'받는 대미지 감소는 「기술로 받을 대미지를 완화(n배)한다」',re:/받는 (?:대미지|피해)(?:가|를)?\s*(\d?\.\d+)\s*배(?:로)?\s*(?:감소|줄어든다|줄인다|된다)(?:한다)?/g,to:(m,x)=>`기술로 받을 대미지를 완화(${x}배)한다`},
  {id:'half',msg:'「반으로 줄인다」는 「반감한다」',re:/받는 (?:대미지|피해)를? (?:반으로|절반으로) 줄인다/g,to:()=>'기술로 받을 대미지를 반감한다'},
  {id:'hp-cond',msg:'HP 조건은 「HP : 1/2 이하」일 때 꼴로',re:/(?:「)?HP(?:」)?(?:가|이)?\s*(절반|반|\d+\s*%|\d\/\d)\s*(이하|미만|이상|초과)(?:가 되었을 때|일 때|이면|라면|일때)/g,to:(m,v,c)=>{v=v.replace(/\s/g,'');const f=v==='절반'||v==='반'?'1/2':/%/.test(v)?(PCT[parseInt(v)]||v):v;return `「HP : ${f} ${c==='미만'?'이하':c==='초과'?'이상':c}」일 때`}},
  {id:'hp-full',msg:'「HP가 가득일 때」는 「HP : 가득」일 때',re:/HP(?:가|이)?\s*(?:가득|최대|풀)(?:일 때|이면|일때)/g,to:()=>'「HP : 가득」일 때'},
  {id:'turn-end',msg:'「이번 턴 동안 / 턴 끝까지」는 「턴 종료 시까지」',re:/이번 턴 (?:동안|끝까지|종료까지)|턴(?:이)? 끝날 때까지|턴 끝까지|해당 턴 동안|턴 종료까지/g,to:()=>'턴 종료 시까지'},
  {id:'turns',msg:'턴 수는 「n턴 동안」',re:/(\d)\s*턴\s*(?:간|동안만|동안|동안에)(?!\s*동안)/g,skip:m=>/^\d턴 동안$/.test(m),to:(m,n)=>`${n}턴 동안`},
  {id:'uses',msg:'횟수 제한은 맨 앞 태그 【1/시】',re:/\s*[(\[]?\s*(\d|한)\s*(?:회|번)\s*(?:한정|만 ?사용(?: 가능)?|사용 가능|용)\s*[)\]]?\s*[.,]?/g,to:()=>''},
  {id:'chance',msg:'확률은 「n할 : 상태」를 부여한다 꼴로',re:/(\d)0\s*%\s*(?:의\s*)?확률로\s*(?:대상을\s*|상대를\s*)?「?([가-힣]+)」?\s*(?:상태로 만든다|상태를 ?(?:건다|부여한다)|상태이상을 ?(?:건다|부여한다))/g,to:(m,n,s)=>`「${n}할 : ${s}」을 부여한다`},
  {id:'state-verb',msg:'상태 이상은 「상태」 상태로 만든다',re:null},
  {id:'crit',msg:'급소는 「급소에 맞기 쉬워진다(C+n)」',re:/급소(?:율|확률)?(?:이|가|을|를)?\s*(?:(\d)\s*(?:랭크|단계)\s*)?(?:상승|증가|올라간다|올린다)(?:한다|된다)?|급소에 잘 맞는다/g,to:(m,n)=>`급소에 맞기 쉬워진다(C+${n||1})`},
  {id:'tag-bracket',msg:'태그는 겹낫표 【】로 (【1/시】 【선행】 …)',re:/[\[(<]\s*(\d\s*\/\s*시|선행|등장|방호|수세|공세|유일|탈진|상시|야생|임의|지연)\s*[\])>]/g,to:(m,w)=>`【${w.replace(/\s+/g,'')}】`},
  {id:'quote',msg:'키워드는 낫표 「」로 (따옴표 · 대괄호 대신)',re:/[“"'‘\[]([가-힣A-Za-z0-9 :+\-\/]{1,12})[”"'’\]]/g,skip:m=>/^[\[(<]\s*(\d\s*\/\s*시|선행|등장|방호|수세|공세|유일|탈진|상시|야생|임의|지연)\s*[\])>]$/.test(m),to:(m,w)=>`「${w}」`},
  {id:'tag-slash',msg:'태그 뒤에는 「/」를 붙이고 효과를 쓴다 (【1/시】【선행】/효과)',re:/((?:【[^】]+】)+)\s*[:：]?\s*(?=[^【/\s①-⑩])/g,skip:(m,t,i)=>{const b=t.slice(0,i).replace(/[ \t]+$/,'');return b.length>0&&!/[\n①-⑩]$/.test(b)},to:(m,tags)=>tags+'/'},
  {id:'number',msg:'효과가 여럿이면 ①②③ 번호',re:/(^|\n)\s*(?:\(?([1-9])[.)]|([1-9])\s*-)\s*/g,to:(m,pre,a,b)=>pre+'①②③④⑤⑥⑦⑧⑨'[(+(a||b))-1]},
  {id:'period',msg:'문장 끝에 마침표',re:/([가-힣)」』】])\s*$/g,skip:(m,t)=>t.trim().length<6||!/(?:한다|된다|않는다|진다|있다|없다|든다|난다|른다|운다|인다|킨다)\s*\S?\s*$/.test(t.trim().replace(/[)」』】]+$/,'')),to:(m,c)=>c+'.'}];
 /* 상태 이상 동사 꼴 → 「X」 상태로 만든다 */
 function stateFix(t,collect){for(const [re,s] of ST_VERB){re.lastIndex=0;let m;while((m=re.exec(t))){if(collect)collect.push({id:'state-verb',msg:`상태 이상은 「${s}」 상태로 만든다`,from:m[0],to:`「${s}」 상태로 만든다`})}t=t.replace(re,`「${s}」 상태로 만든다`)}return t}
 function check(text){text=String(text||'');const out=[];
  for(const R of RULES){if(R.id==='state-verb'){stateFix(text,out);continue}R.re.lastIndex=0;let m;
   while((m=R.re.exec(text))){if(!m[0]){R.re.lastIndex++;continue}if(R.skip&&R.skip(m[0],text,m.index))continue;const to=R.to(...m);if(to===m[0])continue;out.push({id:R.id,msg:R.msg,from:m[0],to,at:m.index})}}
  /* 횟수 표현을 지웠으면 맨 앞에 【1/시】 */
  if(out.some(x=>x.id==='uses')&&!/【\d\/시】/.test(text)){const m=text.match(/(\d|한)\s*(?:회|번)/);const n=m?(NUM[m[1]]||m[1]):1;out.push({id:'uses-tag',msg:'횟수 제한은 맨 앞 태그 【n/시】',from:'',to:`【${n}/시】`,at:0})}
  return out}
 function fixAll(text){let t=String(text||'');const hadUse=check(t).find(x=>x.id==='uses-tag');
  for(const R of RULES){if(R.id==='state-verb'){t=stateFix(t);continue}t=t.replace(R.re,(...a)=>{const m=a[0],i=a[a.length-2],s=a[a.length-1];if(R.skip&&R.skip(m,s,i))return m;return R.to(...a)})}
  if(hadUse){t=t.trim();t=(/^【/.test(t)?hadUse.to+t:hadUse.to+'/'+t)}
  return t.replace(/[ \t]{2,}/g,' ').replace(/\s+\./g,'.')}
 function fixOne(text,f){if(!f)return text;if(f.id==='uses-tag'){const t=String(text).trim();return /^【/.test(t)?f.to+t:f.to+'/'+t}const i=String(text).indexOf(f.from,Math.max(0,(f.at||0)-2));if(i<0)return text;return text.slice(0,i)+f.to+text.slice(i+f.from.length)}

 /* ===== 자동화 구문 추천 ===== */
 const ST_EN={'공격':'공격','방어':'방어','특공':'특공','특방':'특방','스피드':'스피드','명중':'명중','회피':'회피'};
 function tgtOf(c){if(/아군 전체/.test(c))return '아군전체';if(/상대 전체|적진 전체/.test(c))return '상대전체';if(/(?:^|[\s/】])아군에게/.test(c)||(/(?:^|[\s/】])아군의/.test(c)&&/턴 종료 시까지/.test(c)))return '지정에리어';if(/(?:^|[\s/】])아군(?:의|을|를)/.test(c))return '아군1체';if(/(?:^|[\s/】])(?:상대|정면|대상)(?:에게|의|을|를)/.test(c))return '상대1체';return ''}
 function clauses(text){const t=String(text||'').replace(/<br\s*\/?>/g,'\n');return t.split(/(?=[①②③④⑤⑥⑦⑧⑨])|\n/).map(s=>s.trim()).filter(Boolean)}
 function suggest(text){const lines=[],why=[];const F=window.OM_FX;const all=String(text||'');
  for(const c0 of clauses(all)){const tags=(c0.match(/【[^】]+】/g)||[]).join('');const c=c0.replace(/^[①-⑨]/,'').replace(/^(?:【[^】]+】)+\s*\/?/,'');const tg=tgtOf(c);const temp=/턴 종료 시까지|턴 종료시 까지/.test(c);const turns=(c.match(/(\d)턴 동안/)||[])[1];
   const L=[];let m;
   /* 랭크 */
   const rk=[...c.matchAll(/「((?:공격|방어|특공|특방|스피드|명중|회피)(?:\/(?:공격|방어|특공|특방|스피드|명중|회피))*) : ([+-]\d)」/g)];
   if(rk.length&&/한다|된다/.test(c)&&!/종족치/.test(c)){const parts=[];for(const x of rk)for(const s of x[1].split('/'))parts.push(ST_EN[s]+x[2]);L.push(`랭크${tg?' '+tg:''} ${parts.join(' ')}${temp?' 임시':''}`)}
   /* 배율 */
   const mul=[];for(const x of c.matchAll(/(모든 능력치|「([^」]+)」)(?:을|를|이|가)? 강화\((\d+(?:\.\d+)?)배\)/g)){const ss=x[1]==='모든 능력치'?['공격','방어','특공','특방','스피드']:x[2].split('/');if(ss.every(s=>ST_EN[s]))for(const s of ss)mul.push(`${s}×${x[3]}`)}
   for(const x of c.matchAll(/「([^」]+)」(?:을|를) (\d+(?:\.\d+)?)배로 만든다/g)){const ss=x[1].split('/');if(ss.every(s=>ST_EN[s]))for(const s of ss)mul.push(`${s}×${x[2]}`)}
   if(mul.length)L.push(`배율${tg&&tg!=='상대1체'?' '+tg:''} ${mul.join(' ')}${temp?' 임시':''}`);
   /* 위력 */
   if((m=c.match(/(?:기술|「[^」]+기」|「[^」]+」 기술)(?:의|이 주는)? (?:대미지|위력)(?:을|를) 강화\((\d+(?:\.\d+)?)배\)/))){let s=`위력 ×${m[1]}`;const ty=c.match(/「([가-힣]+)」 기술/);if(/「단일기」/.test(c))s+=' 단일';if(/「전체기」/.test(c))s+=' 전체기';if(/「물리기」/.test(c))s+=' 물리';if(/「특수기」/.test(c))s+=' 특수';if(ty&&!/단일기|전체기|물리기|특수기|접촉기/.test(ty[1]))s+=' 타입:'+ty[1];if(/비일치|자속이 아닌/.test(c))s+=' 비자속';const cr=c.match(/\(C\+(\d)\)/);if(cr)s+=' 급소+'+cr[1];if(/【공세】/.test(tags+c0))s+=' 공세';L.push(s)}
   else if((m=c.match(/\(C\+(\d)\)/))){const ty=c.match(/「([가-힣]+)」 기술/);L.push(`위력 ×1${ty?' 타입:'+ty[1]:''} 급소+${m[1]}`)}
   /* 완화 */
   if((m=c.match(/받을 대미지를 완화\((\d?\.\d+)배\)/))||/받을 대미지를 반감/.test(c)){let s=`완화 ×${m?m[1]:'0.5'}`;if(/상성 : 2배?~8배/.test(c))s+=' 굉장';if(/「전체기」/.test(c))s+=' 전체기';if(/【수세】/.test(tags+c0))s+=' 수세';if(turns)s+=` ${turns}턴`;else if(temp)s+=' 이번턴';L.push(s)}
   else if((m=c.match(/「전체기」의 위력을 저하\((\d?\.\d+)배\)/)))L.push(`완화 ×${m[1]} 전체기${/【수세】/.test(tags+c0)?' 수세':''}`);
   /* 회복 · 치유 */
   if((m=c.match(/「HP」를 (\d+\/\d+)만큼 회복/)))L.push(`회복 ${m[1]}${tg&&tg!=='상대1체'?' '+tg:''}`);
   if(/상태 이상.*치유|치유한다/.test(c)&&/상태 이상/.test(c))L.push(`치유${tg?' '+tg:''} 이상`);
   /* 상태 */
   for(const x of c.matchAll(/「(\d)할 : ([가-힣]+)」(?:을|를) 부여/g))L.push(`상태확률 ${x[2]} ${x[1]}0% 상대1체`);
   if((m=c.match(/((?:「[가-힣]+」\s*)+)\s*상태로 만든다/))&&!/할 :/.test(c)){const sts=[...m[1].matchAll(/「([가-힣]+)」/g)].map(x=>x[1]);for(const s of sts)L.push(`상태 ${s} ${/자신을|자신이/.test(c)?'자신':'상대1체'}${turns?` ${turns}턴`:''}`)}
   if((m=c.match(/((?:「[가-힣]+」\s*)+)\s*상태가 되지 않는다/))){const sts=[...m[1].matchAll(/「([가-힣]+)」/g)].map(x=>x[1]);L.push(`면역 ${sts.join(',')}`)}
   if(/비례 대미지를 (?:받지 않는다|무시)/.test(c))L.push('비례무시');
   if((m=c.match(/「(리플렉터|빛의장막|오로라베일|신비의부적|순풍)」(?:을|를) (?:\d턴 동안 )?전개/)))L.push(`설치기 아군 ${m[1]}${turns?' '+turns:''}`);
   if((m=c.match(/「(?:날씨 : )?(맑음|비|모래바람|싸라기눈|설경)」(?:을|를)? ?(?:(\d)턴 동안 )?(?:전개|으로 만든다|로 만든다)/)))L.push(`날씨 ${m[1]} ${m[2]||5}`);
   if((m=c.match(/「(?:필드 : )?([가-힣]+필드)」(?:을|를)? ?(?:(\d)턴 동안 )?전개/)))L.push(`필드 ${m[1]} ${m[2]||5}`);
   if((m=c.match(/「우선도 : ([+-]\d(?:\.\d)?)」/)))L.push(`우선도 ${m[1]}${temp?' 이번턴':''}`);
   if((m=c.match(/「HP : (\d\/\d) 이하」일 때/))&&L.length)L.unshift(`조건 HP≤${m[1]}`);
   /* 구문으로 읽히는 줄만 */
   for(const s of L){if(F&&F.parse){const r=F.parse(s);if(!r.ops.length||(r.errs&&r.errs.length))continue}if(!lines.includes(s)){lines.push(s);why.push(c0.length>60?c0.slice(0,60)+'…':c0)}}}
  /* 다른 줄에서 나온 「위력 ×1 급소+n」은 같은 위력 줄에 붙인다 */
  {const bi=lines.findIndex(s=>/^위력 ×(?!1(?:\s|$))/.test(s)),ci=lines.findIndex(s=>/^위력 ×1 급소\+\d$/.test(s));if(bi>=0&&ci>=0){lines[bi]+=' '+lines[ci].replace(/^위력 ×1 /,'');lines.splice(ci,1);why.splice(ci,1)}}
  const timing=/【등장/.test(all)?'【등장】이 있어 오레마스에서 나올 때 자동으로 걸린다':/【상시】/.test(all)?'【상시】라 늘 켜져 있다':'배틀의 포텐셜 칸 「발동」 버튼으로 건다';
  return {lines,why,timing}}
 return {check,fixAll,fixOne,suggest,clauses}})();
