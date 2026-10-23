/* ---------- 공유 DB 어댑터 (Supabase) ----------
   제작기(maker.js)의 공유 저장 코드는 Firestore 비슷한 아주 작은 인터페이스만 쓴다.
     db.collection(kind).onSnapshot(ok, err)   → 처음엔 {docs:[{id,data()}]}, 그 뒤엔 {docChanges():[{type,doc:{id,data()}}]}
     db.doc('kind/id').set(obj) / .delete()
   이 파일은 그 인터페이스를 Supabase 테이블 하나(docs: kind, id, data jsonb)로 구현한다.
   설정은 js/config.js 의 window.MKM_CONFIG 에서 읽는다. */
"use strict";
window.MKM_STORE=(()=>{
 const cfg=()=>window.MKM_CONFIG||{};
 const configured=()=>!!(cfg().supabaseUrl&&cfg().supabaseKey);
 const TABLE=()=>cfg().table||'docs';
 const PAGE=1000;
 function mapErr(e){
  const err=new Error((e&&(e.message||e.details))||String(e));const c=(e&&e.code)||'',st=e&&e.status;
  if(/fetch|network|NetworkError|Load failed|ECONN|timeout/i.test(err.message))err.code='unavailable';
  else if(c==='42501'||c==='PGRST301'||st===401||st===403)err.code='not_granted';
  else if(st===429)err.code='resource_exhausted';
  else if(c==='PGRST102'||c==='22023'||c==='54000'||st===413)err.code='invalid_argument';
  else if(c==='53100'||c==='53400')err.code='quota_exceeded';
  else err.code='unknown';
  err.raw=e;return err}
 const canon=o=>JSON.stringify(o,(k,v)=>v&&typeof v==='object'&&!Array.isArray(v)?Object.fromEntries(Object.keys(v).sort().map(x=>[x,v[x]])):v);
 const mkDoc=(id,data)=>({id,data:()=>data});

 function makeDB(client){
  const cols=new Map();
  /* since(ISO 시각)를 주면 그 뒤에 고쳐진 행만 (10-23 이그레스: 다시 맞출 때 그림 든 시트까지 전부 받지 않게) */
  async function fetchAll(kind,since){const out=[];let from=0;
   for(;;){let q=client.from(TABLE()).select('id,data,updated_at').eq('kind',kind);if(since)q=q.gt('updated_at',since);
    const r=await q.order('id').range(from,from+PAGE-1);
    if(r.error)throw mapErr(r.error);const rows=r.data||[];out.push(...rows);if(rows.length<PAGE)break;from+=PAGE}
   return out}
  /* 지금 있는 id 만 — 지워진 행 찾기용 (내용은 받지 않는다) */
  async function fetchIds(kind){const out=[];let from=0;
   for(;;){const r=await client.from(TABLE()).select('id').eq('kind',kind).order('id').range(from,from+PAGE-1);
    if(r.error)throw mapErr(r.error);const rows=r.data||[];for(const x of rows)out.push(x.id);if(rows.length<PAGE)break;from+=PAGE}
   return out}
  async function fetchOne(kind,id){const r=await client.from(TABLE()).select('id,data').eq('kind',kind).eq('id',id).maybeSingle();if(r.error)throw mapErr(r.error);return r.data}
  function collection(kind){
   if(cols.has(kind))return cols.get(kind);
   const st={cache:new Map(),cb:null,err:null,ready:false,chan:null,subs:0,resyncing:false,again:false,at:0};
   const seen=t=>{const ms=Date.parse(t||'');if(ms>st.at)st.at=ms};   /* 받은 행 중 가장 늦은 수정 시각 (서버 시계) */
   function emit(changes){if(changes.length&&st.cb)st.cb({docs:[...st.cache.entries()].map(([id,d])=>mkDoc(id,d)),docChanges:()=>changes})}
   function apply(id,data){const j=canon(data);const had=st.cache.has(id);if(had&&canon(st.cache.get(id))===j)return null;st.cache.set(id,data);return{type:had?'modified':'added',doc:mkDoc(id,data)}}
   function remove(id){if(!st.cache.has(id))return null;const d=st.cache.get(id);st.cache.delete(id);return{type:'removed',doc:mkDoc(id,d)}}
   async function resync(){if(st.resyncing){st.again=true;return}st.resyncing=true;
    try{do{st.again=false;
      /* 10-23 이그레스: 마지막으로 본 수정 시각 1분 전부터 바뀐 행만 받고, 지워진 행은 id 목록으로 찾는다. 본 적이 없으면 전부 */
      const since=st.at?new Date(st.at-60000).toISOString():null;
      const rows=await fetchAll(kind,since);const ids=since?new Set(await fetchIds(kind)):null;const got=new Set(),ch=[];
      for(const r of rows){got.add(r.id);seen(r.updated_at);const c=apply(r.id,r.data||{});if(c)ch.push(c)}
      for(const id of [...st.cache.keys()])if(!(ids?ids.has(id):got.has(id))){const c=remove(id);if(c)ch.push(c)}
      emit(ch)}while(st.again)}
    catch(e){if(st.err)st.err(mapErr(e))}
    finally{st.resyncing=false}}
   async function onRow(payload){
    try{
     if(payload.eventType==='DELETE'){/* Realtime 은 DELETE 에 kind 필터를 걸지 않으므로 다른 kind 의 삭제는 여기서 거른다 (replica identity full 이라 old 에 kind 가 있다) */const o=payload.old||{};if(o.kind!=null&&o.kind!==kind)return;const id=o.id;if(id==null)return resync();const c=remove(id);if(c)emit([c]);return}
     const n=payload.new||{};let id=n.id,data=n.data;seen(n.updated_at);
     if(id==null)return resync();
     if(data===undefined||(payload.errors&&payload.errors.length)){const row=await fetchOne(kind,id);if(!row){const c=remove(id);if(c)emit([c]);return}data=row.data}
     const c=apply(id,data||{});if(c)emit([c])}
    catch(e){if(st.err)st.err(mapErr(e))}}
   function subscribe(){
    st.chan=client.channel('docs:'+kind)
     .on('postgres_changes',{event:'*',schema:'public',table:TABLE(),filter:'kind=eq.'+kind},onRow)
     .subscribe(status=>{
      if(status==='SUBSCRIBED'){st.subs++;resync()}   /* 처음 읽은 뒤 구독이 붙기까지 사이의 남의 변경도 잡는다 (점검 6-5) — 10-23 부터는 그 사이 바뀐 행만 */
      else if(status==='CHANNEL_ERROR'||status==='TIMED_OUT'){if(st.err)st.err(Object.assign(new Error('realtime '+status),{code:'unavailable'}))}})}
   const col={onSnapshot(cb,err){st.cb=cb;st.err=err||null;
     (async()=>{try{const rows=await fetchAll(kind);for(const r of rows){st.cache.set(r.id,r.data||{});seen(r.updated_at)}st.ready=true;
       cb({docs:[...st.cache.entries()].map(([id,d])=>mkDoc(id,d)),docChanges:()=>[]});subscribe()}
      catch(e){if(err)err(mapErr(e))}})();
     return()=>{if(st.chan)client.removeChannel(st.chan)}},
    resync};
   cols.set(kind,col);return col}
  function doc(path){const i=path.indexOf('/');const kind=path.slice(0,i),id=path.slice(i+1);
   return{
    async set(data){const r=await client.from(TABLE()).upsert({kind,id,data},{onConflict:'kind,id'});if(r.error)throw mapErr(r.error)},
    async delete(){const r=await client.from(TABLE()).delete().eq('kind',kind).eq('id',id);if(r.error)throw mapErr(r.error)}}}
  // 창이 다시 보이거나 네트워크가 돌아오면 전체를 한 번 맞춰 본다
  const resyncAll=()=>{for(const c of cols.values())c.resync()};
  document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible')resyncAll()});
  window.addEventListener('online',resyncAll);
  return{collection,doc,canWrite:true,resyncAll}}

 async function connect(){
  if(!configured())return null;
  if(!window.supabase||!supabase.createClient)throw new Error('supabase-js를 불러오지 못했습니다');
  const client=supabase.createClient(cfg().supabaseUrl,cfg().supabaseKey,{realtime:{params:{eventsPerSecond:20}}});
  return makeDB(client)}
 return{connect,configured,makeDB,mapErr}})();
