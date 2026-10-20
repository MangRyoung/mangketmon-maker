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
  {id:'s20261020i',app:'maker',date:'2026-10-20',title:'폼체인지 칸',body:'시트 기본 탭에 「폼체인지 · 메가진화」: 올드 타입 일람에서 채우기, 타입·특성·종족치·그림·조건\n폼마다 포텐셜 칸 교체 (종족·속별 등) — 이름 직접 입력, 효과 글, 구문 버튼\n업뎃 노트 탭'}];
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
