/* ---------- 룰북 탭 저장소 ----------
   룰북 탭의 rulebook.html(iframe, 같은 출처)이 parent.MKM_RULEBOOK 으로 읽고 쓴다.
   공유 DB 문서 하나 rulebook/main = {title, subtitle, updated, chapters, rev} 에 둔다.
   아직 저장한 적이 없으면 null → rulebook.html 안에 들어 있는 기본 내용을 그대로 보여 준다.
   공유 DB 가 없으면 이 브라우저(localStorage)에만 저장한다. */
"use strict";
window.MKM_RULEBOOK=(()=>{
 const LS='mkm_rulebook_local';
 let DB=null,canW=()=>true,cur=null,ready=false;const subs=new Set(),waits=[];
 const local=()=>{try{const s=localStorage.getItem(LS);return s?JSON.parse(s):null}catch(e){return null}};
 function emit(){for(const f of [...subs]){try{f(cur)}catch(e){subs.delete(f)}}}   /* 닫힌 iframe 의 콜백은 버린다 */
 function done(){if(ready)return;ready=true;while(waits.length)waits.shift()(cur)}
 function attach(db,canWrite){
  DB=db||null;if(canWrite)canW=canWrite;
  if(!DB){cur=local();done();emit();return}
  DB.collection('rulebook').onSnapshot(snap=>{
   if(!ready){const d=snap.docs.find(x=>x.id==='main');cur=d?d.data():null;done();emit();return}
   let hit=false;for(const c of snap.docChanges())if(c.doc.id==='main'){cur=c.type==='removed'?null:c.doc.data();hit=true}
   if(hit)emit()},
  e=>{console.warn('[룰북]',e);if(!ready){cur=null;done()}})}
 function load(){return ready?Promise.resolve(cur):new Promise(r=>waits.push(r))}
 function onChange(f){subs.add(f);return()=>subs.delete(f)}
 function canEdit(){return DB?canW()!==false:true}
 async function save(data,baseRev){
  if(!canEdit())throw Object.assign(new Error('읽기 전용'),{code:'not_writer'});
  const now=(cur&&cur.rev)||0;if(now!==(baseRev||0))throw Object.assign(new Error('다른 곳에서 먼저 저장됨'),{code:'conflict'});
  const doc={title:data.title||'',subtitle:data.subtitle||'',updated:data.updated||'',chapters:data.chapters||[],rev:now+1};
  if(DB)await DB.doc('rulebook/main').set(doc);
  else localStorage.setItem(LS,JSON.stringify(doc));
  cur=doc;return doc.rev}
 return{attach,load,onChange,canEdit,save}})();
