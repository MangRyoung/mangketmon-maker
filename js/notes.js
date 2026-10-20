/* ---------- 업뎃 노트: 오레마스 · 제작기 · 로그 정리기 업데이트 현황 ----------
   공유 DB 문서 notes/<id> {app,date,title,body,by,at,deleted?}. 기본 기록(SEED)은 이 파일에 두고, 같은 id 의 문서가 있으면 그것이 덮는다.
   공유 DB 가 없으면 이 브라우저(localStorage)에만 저장한다. */
"use strict";
window.MKM_NOTES=(()=>{
 const APPS={oremas:{ko:'오레마스',col:'#2B5FB4'},maker:{ko:'제작기',col:'#1E8A62'},logtool:{ko:'로그 정리기',col:'#B4651B'}};
 const SEED=[
  {id:'s20261020a',app:'oremas',date:'2026-10-20',title:'모바일·시트·알까기',body:'알까기, 재연결 때 다시 읽기, 영창·호령, 시트 입력, 공지 배너\n건의·제보 탭\n모바일 배틀 조작판 접기, 화자 버튼 자리 옮김, 시트 아랫줄 배치\nGM 채팅 화자 고르기 · 전용 포텐셜은 주인과 GM 만 보이게'},
  {id:'s20261020b',app:'oremas',date:'2026-10-20',title:'배틀 창 다듬기',body:'급소 소지품 자동 반영, 기술 부가효과 굴림, GM↔PL 권한 전환\n변칙 위력 기술(헤비봄버·자이로볼 등) 대상마다 자동 계산, 에리어 교대 버튼\n턴 마무리 단계 포텐셜 발동 묻기 · 포켓몬 상세 창 · 채팅 공격 로그 카드'},
  {id:'s20261020c',app:'oremas',date:'2026-10-20',title:'기술 자동화',body:'기술 효과 글을 읽어 부가효과·반동·드레인·자폭을 굴리고 적용\n날씨·필드·룸·설치기·철거 자동, 강제 교대(흡반·뿌리박기 등은 막힘)·임의 교대\nDB 상세에 「자동 / 손으로」 요약'},
  {id:'s20261020d',app:'oremas',date:'2026-10-20',title:'따라가때리기(추격)',body:'교대하는 상대에게 먼저 발동: 행동 순서 로그·컷인, 위력 2배 기술은 2배\n선행 입력에 묻은 추격: 지시의 「추격」 칸, 선행 포텐셜·지령·명령의 추격/추격 무시를 비밀로 저장'},
  {id:'s20261020e',app:'oremas',date:'2026-10-20',title:'내 설정',body:'휴대폰 「설정」 앱 · 설정 창 탭(내 설정 / 방 설정)\nBGM·효과음 정지, 알림음 고르기·음량, 화면을 보고 있으면 알림음 안 울림\n스탠딩·컷인 크기, 단축키'},
  {id:'s20261020f',app:'oremas',date:'2026-10-20',title:'날씨·필드·룸',body:'모래바람 턴 끝 1/16 · 바위 특방 1.5, 눈·싸라기눈 얼음 방어 1.5 (싸라기눈 턴 끝 대미지 없음)\n필드는 땅 위만: 강화·미스트필드 드래곤 반감·상태이상 방어, 일렉트릭필드 잠듦 방어, 사이코필드 선공기 무효\n매직룸 소지품 무효 · 원더룸 방어↔특방 · 블랙룸 공격 기술 고스트'},
  {id:'s20261020g',app:'oremas',date:'2026-10-20',title:'폼체인지·메가진화',body:'배틀 카드 「✦ 폼」: 이름·타입·특성·실수치·그림·포텐셜 칸을 바꾸고 원래대로\n교대하면 돌아오는 폼 · 메가진화 1회 경고 · 새 특성/포텐셜의 등장 구문 바로 발동'},
  {id:'s20261020h',app:'maker',date:'2026-10-20',title:'구문 엔진',body:'옆에 선 아군(adj) 대상 · 날씨 무작위 오류 고침\n기술 자동화(moveauto.js) · 교대무시 · 추격 무시 · 철거 구문\n필드 상태이상 방어 · 매직룸 동안 소지품 효과 정지'},
  {id:'s20261020i',app:'maker',date:'2026-10-20',title:'폼체인지 칸',body:'시트 기본 탭에 「폼체인지 · 메가진화」: 올드 타입 일람에서 채우기, 타입·특성·종족치·그림·조건\n폼마다 포텐셜 칸 교체 (종족·속별 등) — 이름 직접 입력, 효과 글, 구문 버튼\n업뎃 노트 탭'},
  {id:'s20261021a',app:'oremas',date:'2026-10-21',title:'맵툴 빠진 기능 채우기',body:'배틀 결과 정리: HP·빈사·상태 이상·포텐셜 횟수·쓴 소지품을 시트에 돌려줌 · 시트 「회복」 버튼\n소지품 소모 · 되돌리기 (열매 자동)\n교대 제한 경고 (검은눈빛·조이기 등 · 고스트·아름다운허물·반드시 교대 예외)\n예고 공격 10종(미래예지 등): 다음 턴 종료에 자동 발동 · 교대하면 사라짐\n몽유·신비의부적·대타출동·흰안개·능력반전이 실제로 막음'},
  {id:'s20261021d',app:'maker',date:'2026-10-21',title:'모바일 · 도감 카드',body:'폰: 탭을 화면 아래 고정 탭바로 · 숫자 칸 −/+ 버튼(꾹 누르면 계속)\n포켓몬 시트 머리를 도감 카드처럼 (No.001 · 몬스터볼 무늬 · 폰에서도 타입 칩)\n능력치 큰 육각형(값 표시) · 막대를 타입 색으로\n폰: 자질 메모 · 스탠딩 입력을 세로로'},
  {id:'s20261021e',app:'oremas',date:'2026-10-21',title:'배틀 화면 다듬기',body:'HP 막대가 줄어들고 빨간 잔상이 따라옴\n폰: 카드 버튼은 공격·HP 만, 나머지는 「⋯」 · 소지품 이름 한 줄\n폰: 지시 입력이 화면 밖이면 「✎ 지시 입력」 버튼\n첫 화면 맨 위에 최근 방 (몇 시간 전 · 목록에서 빼기)'},
  {id:'s20261021c',app:'maker',date:'2026-10-21',title:'상태 변화 아이콘 · 반드시 교대 레디메이드',body:'상태 변화 DB 에 아이콘 칸: 표에서 보이고, 파일 이름·주소·그림 파일로 넣기 (오레마스에도 반영)\n「어둠안」 → 「어둠 안」\n반드시 교대 레디메이드: 연막탄 · 순결의향로 · 도망발 · 도주 · 이상한 부리 (도망태세·탈피는 효과 글로 인식)'},
  {id:'s20261021b',app:'maker',date:'2026-10-21',title:'상태 변화 DB · 새 구문',body:'DB 관리에 상태 변화 DB 탭 · 맵툴 JSON 불러오기/내보내기 · 오레마스 「제작기 새로고침」으로 반영\n구문: 반드시 교대 · 예고 <상태> · 변신 / 변신 해제\n레디메이드: 기술 : 변신 · 특성 : 괴짜 · 소지품 : 아름다운허물'},
  {id:'s20261022a',app:'oremas',date:'2026-10-22',title:'공격 창 · 상태 창 · 지시 입력 정리',body:'공격 창: 기술 효과 전문 상자, 굴리기 전 예상 대미지(남은 HP 막대·확정 몇 타), 보정 칸을 급소·배율·능력·상성·기타로 묶고 바꾼 값만 위에 칩으로(✕ 로 되돌림)\n체크칸은 토글 칩으로, 굴리기·적용 줄은 창 아래에 고정 (폰에선 큰 버튼)\n상태 창: 걸린 상태를 칩으로(턴 −/+ · ✕), 고르는 칸은 아이콘 타일\n포텐셜 남은 횟수를 ●●○ 점으로, 지시 입력의 전용 포텐셜·지령·명령·일반 포텐셜 칸을 접고 고른 것만 요약'},
  {id:'s20261022b',app:'oremas',date:'2026-10-22',title:'배틀 단축키',body:'내 설정 단축키에 「배틀」 묶음: 턴 진행 N · 다음 행동 ] · 이전 행동 [ · 지금 차례 공격 A · HP H · 랭크·상태 S · 지시 입력으로 C · 준비 완료 Y · 4식 6령 Q · 모두 공개 O · 필드 F · 턴 종료 처리 E\n「배틀 창」 묶음: 공격 창 굴리기 R · 공격·상태 창 적용 Enter\n모두 다른 키로 바꿀 수 있고, 겹친 키는 노랗게 · 「단축키만 기본으로」'},
  {id:'s20261022c',app:'oremas',date:'2026-10-22',title:'상세 창 상성 · 단축키 끄기',body:'포켓몬 상세 창: 랭크·배율·상태·효과를 오른쪽 위로, 아래 줄에 능력(3×2 큰 칸)과 상성판(약점 / 내성·무효, 큰 타입 칩)을 나란히\n내 설정 단축키에 「단축키 쓰기」 스위치 (끄면 모든 단축키가 멈춤)\n배틀 카드 포텐셜 칩: 이름이 한 글자씩 세로로 접히던 것 → 한 줄(넘치면 …)'},
  {id:'s20261022d',app:'oremas',date:'2026-10-22',title:'포텐셜 발동 · 포텐셜 설정',body:'배틀 버튼 「4식 6령」 → 「포텐셜 발동」 (지령·명령·고유·전용을 여기서 발동)\n「지령 설정」 → 「포텐셜 설정」: 지령·명령 아래에 고유 포텐셜(트레이너)·전용 포텐셜(포켓몬마다) 남은 횟수 −/+'},
  {id:'s20261022e',app:'oremas',date:'2026-10-22',title:'상세 창 배치 · 벤치 아래 현황',body:'상세 창: 상성은 오른쪽 위(약점 / 내성·무효), 랭크·배율·상태·효과는 능력 옆 넓은 칸\n배틀: 내 쪽 벤치 아래에 행동 순서 세로 목록(지금 차례 강조 · HP · 누르면 그 차례로 · 다음 행동 ▶), 순서가 정해지기 전엔 트레이너별 READY·공개 현황'}];
 const LS='mkm_notes_local';
 let DB=null,docs=new Map(),flt='',editing=null,ready=false;
 const $=(s,r)=>(r||document).querySelector(s);
 const esc=s=>String(s??'').replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
 const today=()=>{const d=new Date();return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0')};
 const toast=m=>{const t=$('#toast');if(!t)return;t.textContent=m;t.classList.add('on');clearTimeout(toast.t);toast.t=setTimeout(()=>t.classList.remove('on'),1800)};
 function loadLocal(){try{const o=JSON.parse(localStorage.getItem(LS)||'{}');for(const k in o)docs.set(k,o[k])}catch(e){}}
 function saveLocal(){try{localStorage.setItem(LS,JSON.stringify(Object.fromEntries(docs)))}catch(e){}}
 function list(){const m=new Map(SEED.map(x=>[x.id,x]));for(const [id,d] of docs)m.set(id,Object.assign({id},d));
  return [...m.values()].filter(x=>!x.deleted&&(!flt||x.app===flt)).sort((a,b)=>String(b.date).localeCompare(String(a.date))||(+b.at||0)-(+a.at||0)||String(b.id).localeCompare(String(a.id)))}
 async function put(id,d){docs.set(id,d);if(DB){try{await DB.doc('notes/'+id).set(d)}catch(e){toast('저장하지 못했습니다: '+(e.message||e));return false}}else saveLocal();render();return true}
 function attach(db){DB=db;try{db.collection('notes').onSnapshot(snap=>{const ch=snap.docChanges?snap.docChanges():null;
   if(!ch||!ready){docs=new Map();for(const d of snap.docs||[])docs.set(d.id,d.data());ready=true}
   else for(const c of ch){if(c.type==='removed')docs.delete(c.doc.id);else docs.set(c.doc.id,c.doc.data())}
   if(!document.getElementById('v-notes').hidden&&!editing)render()},e=>console.warn('[업뎃 노트]',e))}catch(e){console.warn('[업뎃 노트]',e)}}
 const lines=b=>String(b||'').split(/\r?\n/).map(s=>s.replace(/^\s*[-·•]\s*/,'').trim()).filter(Boolean);
 function card(x){const a=APPS[x.app]||{ko:x.app||'기타',col:'var(--muted)'};
  return `<article class="nt" style="--nc:${a.col}"><header><span class="ntapp">${esc(a.ko)}</span><b>${esc(x.title||'(제목 없음)')}</b><span class="sp"></span>${x.by?`<span class="faint small">${esc(x.by)}</span>`:''}<button class="btn sm ghost" data-nt="edit" data-id="${esc(x.id)}" title="고치기">✎</button></header>
   <ul>${lines(x.body).map(l=>`<li>${esc(l)}</li>`).join('')}</ul></article>`}
 function form(x){x=x||{app:flt||'oremas',date:today(),title:'',body:''};
  return `<div class="ntform panel"><div class="row" style="gap:6px;flex-wrap:wrap"><select data-nf="app">${Object.entries(APPS).map(([k,v])=>`<option value="${k}" ${x.app===k?'selected':''}>${v.ko}</option>`).join('')}</select><input type="date" data-nf="date" value="${esc(x.date||today())}"><input data-nf="title" placeholder="제목 (예: 폼체인지)" value="${esc(x.title)}" style="flex:1;min-width:140px"></div>
   <textarea data-nf="body" rows="5" placeholder="한 줄에 하나씩 적으면 목록이 됩니다">${esc(x.body)}</textarea>
   <div class="row" style="gap:6px">${x.id?'<button class="btn sm ghost" data-nt="del">지우기</button>':''}<span class="sp"></span><button class="btn sm" data-nt="cancel">취소</button><button class="btn sm pri" data-nt="save">저장</button></div></div>`}
 function render(){const el=document.getElementById('v-notes');if(!el)return;const L=list();const by=new Map();for(const x of L){if(!by.has(x.date))by.set(x.date,[]);by.get(x.date).push(x)}
  el.innerHTML=`<div class="ntwrap"><div class="row nthead"><h2>업뎃 노트</h2><span class="muted small">${DB?'모두에게 공유':'이 브라우저에만 저장'}</span><span class="sp"></span><button class="btn sm pri" data-nt="new">+ 새 노트</button></div>
   <div class="row ntf">${[['','전체'],...Object.entries(APPS).map(([k,v])=>[k,v.ko])].map(([k,v])=>`<button class="ntchip ${flt===k?'on':''}" data-ntf="${k}">${v}</button>`).join('')}</div>
   ${editing==='new'?form(null):''}
   ${L.length?[...by].map(([d,xs])=>`<section class="ntday"><h3>${esc(d)}</h3>${xs.map(x=>editing===x.id?form(x):card(x)).join('')}</section>`).join(''):'<div class="empty">아직 기록이 없습니다.</div>'}</div>`}
 function curForm(){const el=$('#v-notes .ntform');if(!el)return null;const v=k=>($(`[data-nf="${k}"]`,el)||{}).value||'';return {app:v('app'),date:v('date')||today(),title:v('title').trim(),body:v('body').trim()}}
 function bind(){const el=document.getElementById('v-notes');if(!el||el.dataset.bound)return;el.dataset.bound=1;
  el.addEventListener('click',async e=>{const f=e.target.closest('[data-ntf]');if(f){flt=f.dataset.ntf;render();return}
   const b=e.target.closest('[data-nt]');if(!b)return;const k=b.dataset.nt;
   if(k==='new'){editing='new';render();const t=$('#v-notes [data-nf="title"]');if(t)t.focus();return}
   if(k==='edit'){editing=b.dataset.id;render();return}
   if(k==='cancel'){editing=null;render();return}
   if(k==='del'){if(!confirm('이 노트를 지울까요?'))return;const id=editing;editing=null;await put(id,{deleted:true,at:Date.now()});return}
   if(k==='save'){const x=curForm();if(!x)return;if(!x.title&&!x.body)return toast('제목이나 내용을 적어 주세요');const id=editing==='new'?'n'+Date.now().toString(36)+Math.random().toString(36).slice(2,6):editing;
    let by='';try{by=(JSON.parse(localStorage.getItem('mkm_me')||'{}').name)||''}catch(err){}
    editing=null;if(await put(id,Object.assign(x,{by,at:Date.now()})))toast('업뎃 노트를 저장했습니다')}})}
 function show(){bind();render()}
 loadLocal();
 return {attach,render:show,SEED,APPS};
})();
