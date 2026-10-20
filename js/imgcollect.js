/* ---------- 이미지 수집: 제작기 포켓몬마다 포트레이트 칸을 두고, 붙여넣기로 모아 PC에 저장한다 ----------
   원본 이미지와 진행 상황은 이 브라우저(IndexedDB)에만 보관한다. 대표 칸의 고른 그림은 제작기 그림(320px WebP)으로도 넣는다. */
const IC=(()=>{
const DBN='mkm-imgcollect';let dbp=null;
const idb=()=>dbp||(dbp=new Promise((res,rej)=>{const o=indexedDB.open(DBN,1);o.onupgradeneeded=()=>{o.result.createObjectStore('kv');o.result.createObjectStore('blobs')};o.onsuccess=()=>res(o.result);o.onerror=()=>rej(o.error)}));
async function tx(st,mode,fn){const d=await idb();return new Promise((res,rej)=>{const t=d.transaction(st,mode),r=fn(t.objectStore(st));t.oncomplete=()=>res(r&&r.result);t.onerror=()=>rej(t.error);t.onabort=()=>rej(t.error)})}
const B={get:(s,k)=>tx(s,'readonly',o=>o.get(k)),put:(s,k,v)=>tx(s,'readwrite',o=>o.put(v,k)),del:(s,k)=>tx(s,'readwrite',o=>o.delete(k))};
const fresh=()=>({slots:[{id:'main',name:'포트레이트'}],cells:{},hiddenT:[],hiddenF:[],opts:{filter:'all',fmt:'orig',nameRule:'file',advance:true,mkFill:true},sel:{p:'',s:'main'}});
let C=fresh(),ready=false,stT=null,q='',dir=null;
const keep=()=>{clearTimeout(stT);stT=setTimeout(()=>B.put('kv','state',C).catch(()=>toast('이 브라우저에 보관하지 못했습니다')),250)};
const ck=(p,s)=>p+'|'+s, cell=(p,s)=>C.cells[ck(p,s)]||null, mkCell=(p,s)=>C.cells[ck(p,s)]||(C.cells[ck(p,s)]={cands:[],pick:0,name:'',saved:null});
const pickOf=c=>c&&c.cands.length?c.cands[Math.min(c.pick,c.cands.length-1)]:null;
const pN=p=>p.name||'(이름 없음)';
let edP='';
const tyList=()=>{const a=(S.db.types||[]).map(x=>x[0]).filter(x=>x&&x!=='-');return ['-',...a.filter((x,i)=>a.indexOf(x)===i)]};
const roleTxt=p=>{try{return typeof roleOf==='function'?roleOf(p)||'':''}catch(e){return ''}};
const types=p=>[p.t1,p.t2,p.t3].filter(x=>x&&x!=='-').join(' · ');
const all=()=>S.trainers.flatMap(t=>(t.pokemon||[]).map(p=>({t,p})));
const find=id=>all().find(x=>x.p.id===id)||null;
const tHid=t=>C.hiddenT.includes(t.id)||C.hiddenF.includes(t.folder||'');
const canShare=()=>!(typeof SH!=='undefined'&&SH.on&&!SH.canWrite);
const V=()=>$('#v-img');
const urls=new Map();
async function url(k){if(urls.has(k))return urls.get(k);const b=await B.get('blobs',k);if(!b)return '';const u=URL.createObjectURL(b);urls.set(k,u);return u}
const fill=r=>$$('img[data-key]',r).forEach(async im=>{const u=await url(im.dataset.key);if(u)im.src=u});
function loadImg(b){return new Promise((res,rej)=>{const u=URL.createObjectURL(b),im=new Image();im.onload=()=>{res(im);setTimeout(()=>URL.revokeObjectURL(u),1000)};im.onerror=()=>{URL.revokeObjectURL(u);rej(new Error('img'))};im.src=u})}
function scaled(im,max){const s=Math.min(1,max/Math.max(im.naturalWidth,im.naturalHeight)),c=document.createElement('canvas');c.width=Math.max(1,Math.round(im.naturalWidth*s));c.height=Math.max(1,Math.round(im.naturalHeight*s));const g=c.getContext('2d');g.imageSmoothingQuality='high';g.drawImage(im,0,0,c.width,c.height);return c}
const toBlob=(c,t,qq)=>new Promise(r=>c.toBlob(r,t,qq));
const uidI=()=>Math.random().toString(36).slice(2,10)+Date.now().toString(36).slice(-4);

/* ----- 상태 계산 */
function pState(p){let f=0,s=0;for(const sl of C.slots){const c=cell(p.id,sl.id);if(pickOf(c)){f++;if(isSaved(p,sl,c))s++}}return {f,s}}
function vis(){const ql=q.trim().toLowerCase(),fl=C.opts.filter,out=[];
 for(const t of S.trainers){if(tHid(t))continue;const th=ql&&String(t.name||'').toLowerCase().includes(ql);
  for(const p of t.pokemon||[]){if(ql&&!th&&!pN(p).toLowerCase().includes(ql))continue;const st=pState(p);
   if(fl==='empty'&&st.f===C.slots.length)continue;if(fl==='full'&&st.f<C.slots.length)continue;if(fl==='unsaved'&&!(st.f>st.s))continue;out.push({t,p})}}
 return out}
/* ----- 저장 이름 */
const clean=s=>String(s||'').replace(/[\\/:*?"<>|\x00-\x1f]/g,'_').replace(/[. ]+$/,'').trim();
function defName(p,sl,c){const cd=pickOf(c),i=C.slots.indexOf(sl);return clean(C.opts.nameRule==='file'&&cd&&cd.name&&!cd.pasted?cd.name:pN(p)+(i>0?'_'+sl.name:''))||'이미지'}
const stem=(p,sl,c)=>clean(c&&c.name)||defName(p,sl,c);
const MIME={'image/png':'png','image/jpeg':'jpg','image/webp':'webp','image/gif':'gif','image/avif':'avif','image/bmp':'bmp'};
const ext=cd=>C.opts.fmt!=='orig'?C.opts.fmt:(MIME[cd.type]||'png');
const sig=(p,sl,c)=>{const cd=pickOf(c);return cd?[cd.key,ext(cd),stem(p,sl,c)].join('|'):''};
const isSaved=(p,sl,c)=>!!(c&&c.saved&&c.saved.sig===sig(p,sl,c));
async function outBlob(cd){const b=await B.get('blobs',cd.key),f=C.opts.fmt;if(f==='orig'&&MIME[cd.type])return b;
 const im=await loadImg(b),c=document.createElement('canvas');c.width=im.naturalWidth;c.height=im.naturalHeight;const g=c.getContext('2d');if(f==='jpg'){g.fillStyle='#fff';g.fillRect(0,0,c.width,c.height)}g.drawImage(im,0,0);
 return toBlob(c,f==='jpg'?'image/jpeg':f==='webp'?'image/webp':'image/png',.92)}

/* ----- 이미지 넣기 */
async function add(blob,name,pid,sid,o={}){
 const tp=find(pid);if(!tp)return false;let im;try{im=await loadImg(blob)}catch(e){toast('열 수 없는 이미지입니다');return false}
 const key=uidI();await B.put('blobs',key,blob);await B.put('blobs',key+'_t',(await toBlob(scaled(im,240),'image/webp',.85))||blob);
 const c=mkCell(pid,sid),was=!c.cands.length;c.cands.push({key,name:name||'',w:im.naturalWidth,h:im.naturalHeight,type:blob.type||'',pasted:!!o.pasted});c.pick=c.cands.length-1;
 keep();if(sid===C.slots[0].id)await toMaker(tp.p,c,false);
 if(was&&C.opts.advance&&!o.stay)nextEmpty(false,pid,sid,true);
 render();return true}
async function addFiles(fs,pid,sid){const ims=[...fs].filter(f=>f.type.startsWith('image/')||/\.(png|jpe?g|webp|gif|avif|bmp)$/i.test(f.name));if(!ims.length)return false;
 for(let i=0;i<ims.length;i++)await add(ims[i],ims[i].name.replace(/\.[^.]+$/,''),pid,sid,{stay:i<ims.length-1});return true}
async function addUrl(u,pid,sid){try{const r=await fetch(u);if(!r.ok)throw 0;const b=await r.blob();if(!b.type.startsWith('image/'))throw 0;return add(b,decodeURIComponent((new URL(u).pathname.split('/').pop()||'').replace(/\.[^.]+$/,'')),pid,sid)}
 catch(e){toast('그 사이트는 끌어오기를 막아 뒀습니다. 이미지 복사 → Ctrl+V로 넣어 주세요');return false}}
/* 대표 칸 그림을 제작기 그림으로 (제작기와 같은 320px WebP). 제작기 그림이 비었거나 이 수집기가 넣은 것일 때만 자동으로 바꾼다 */
async function toMaker(p,c,force){
 const cd=pickOf(c);if(!cd||!canShare())return false;
 if(!force&&(!C.opts.mkFill||(p.image&&p.image!==c.mkImg)))return false;
 const im=await loadImg(await B.get('blobs',cd.key)),u=scaled(im,320).toDataURL('image/webp',.85);
 p.image=u;c.mkImg=u;keep();save();return true}

/* ----- 고르기 */
function sel(pid,sid){if(pid!==C.sel.p&&edP!==pid)edP='';C.sel={p:pid,s:sid||C.sel.s};if(!C.slots.some(s=>s.id===C.sel.s))C.sel.s=C.slots[0].id;keep();render();
 const el=$(`.ic-card[data-p="${CSS.escape(pid)}"]`,V());if(el)el.scrollIntoView({block:'nearest',behavior:'smooth'})}
function nextEmpty(fromStart,pid,sid,quiet){const o=[];for(const {t,p} of all())if(!tHid(t))for(const s of C.slots)o.push([p.id,s.id]);if(!o.length)return false;
 const i=fromStart?-1:o.findIndex(([a,b])=>a===(pid||C.sel.p)&&b===(sid||C.sel.s));
 for(let k=1;k<=o.length;k++){const [a,b]=o[(i+k+o.length)%o.length];if(!pickOf(cell(a,b))){if(quiet){C.sel={p:a,s:b};keep()}else sel(a,b);return true}}
 toast('빈 칸이 없습니다. 다 모았어요!');return false}
function step(d){const v=vis();if(!v.length)return;let i=v.findIndex(x=>x.p.id===C.sel.p);i=i<0?0:(i+d+v.length)%v.length;sel(v[i].p.id)}

/* ----- PC에 저장 */
async function dl(blob,name){
 try{if(window.claude&&claude.use){const d=await claude.use('downloads');if(d){await d.save({filename:name,data:blob});return true}}}catch(e){if(e&&e.code==='declined'){toast('저장을 취소했습니다');return false}}
 const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=name;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(a.href),4000);return true}
async function dirOk(){if(!dir)return false;try{let p=await dir.queryPermission({mode:'readwrite'});if(p!=='granted')p=await dir.requestPermission({mode:'readwrite'});return p==='granted'}catch(e){return false}}
async function writeDir(rel,st,ex,blob,prev){let d=dir;if(rel)d=await dir.getDirectoryHandle(rel,{create:true});let n=`${st}.${ex}`;
 const re=new RegExp('^'+(rel?rel+'/':'').concat(st).replace(/[.*+?^${}()|[\]\\]/g,'\\$&')+'(_\\d+)?\\.'+ex+'$');
 if(prev&&re.test(prev))n=prev.split('/').pop();else{let k=2;for(;;){try{await d.getFileHandle(n);n=`${st}_${k++}.${ex}`}catch(e){break}}}
 const w=await(await d.getFileHandle(n,{create:true})).createWritable();await w.write(blob);await w.close();return (rel?rel+'/':'')+n}
const subOf=t=>clean(t.name)||'트레이너';
async function saveOne(t,p,sl,quiet){const c=cell(p.id,sl.id),cd=pickOf(c);if(!cd)return false;
 if(dir&&!await dirOk())throw new Error('perm');
 const b=await outBlob(cd),ex=ext(cd),st=stem(p,sl,c);let path;
 if(dir)path=await writeDir(subOf(t),st,ex,b,c.saved&&c.saved.path);else{path=`${st}.${ex}`;if(!await dl(b,path))return false}
 c.saved={sig:sig(p,sl,c),path,at:Date.now()};keep();if(!quiet){render();toast(`${dir?dir.name+'/':''}${path} 저장`)}return true}
async function saveAll(){const jobs=[];for(const {t,p} of all())if(!tHid(t))for(const sl of C.slots){const c=cell(p.id,sl.id);if(pickOf(c)&&!isSaved(p,sl,c))jobs.push([t,p,sl])}
 if(!jobs.length){toast('새로 저장할 칸이 없습니다');return}
 if(dir){if(!await dirOk()){toast('저장 폴더 권한이 없습니다. 폴더를 다시 골라 주세요');return}let ok=0;for(const [t,p,sl] of jobs){try{await saveOne(t,p,sl,true);ok++}catch(e){}}render();toast(`${dir.name} 폴더에 ${ok}장 저장`);return}
 if(typeof JSZip==='undefined'){toast('ZIP을 만들 수 없습니다. 한 장씩 저장해 주세요');return}
 const z=new JSZip(),used=new Set();
 for(const [t,p,sl] of jobs){const c=cell(p.id,sl.id),cd=pickOf(c),ex=ext(cd),base=subOf(t)+'/'+stem(p,sl,c);let n=`${base}.${ex}`,k=2;while(used.has(n))n=`${base}_${k++}.${ex}`;used.add(n);z.file(n,await outBlob(cd));c.saved={sig:sig(p,sl,c),path:n,at:Date.now()}}
 const blob=await z.generateAsync({type:'blob'});if(await dl(blob,'포켓몬_이미지.zip')){keep();render();toast(`${jobs.length}장을 ZIP 하나로 저장했습니다 (트레이너별 폴더)`)}}
async function pickDir(){try{dir=await showDirectoryPicker({id:'mkm-img',mode:'readwrite'});B.put('kv','dir',dir).catch(()=>{});render()}
 catch(e){if(e&&e.name==='AbortError')return;C.opts.noDir=true;keep();render();toast('이 화면에서는 폴더를 직접 고를 수 없어 다운로드로 저장합니다')}}

/* ----- 그리기 */
function render(){const v=V();if(!v||v.hidden)return;
 const act=document.activeElement;if(act&&act.closest&&act.closest('#v-img .ic-pane')&&act.matches('input[type=text],textarea,select')){renderGrid();renderSide();renderProg();return}
 if(!$('.ic-work',v))shell();renderProg();renderSide();renderGrid();renderPane()}
function shell(){V().innerHTML=`<div class="ic-top"><div class="ic-prog"><div class="ic-bar"><i class="sv"></i><i class="fl"></i></div><span class="pt"></span></div>
 <div class="ic-seg" data-ic="filter">${[['all','전부'],['empty','빈 칸 있음'],['full','다 참'],['unsaved','저장 안 됨']].map(([k,l])=>`<button type="button" data-v="${k}">${l}</button>`).join('')}</div>
 <input type="search" data-ic="q" placeholder="포켓몬·트레이너 찾기" aria-label="찾기"><span style="flex:1"></span>
 <span class="small muted" data-ic="dirlbl"></span><button class="btn sm" type="button" data-ic="pickdir">폴더 고르기</button><button class="btn sm" type="button" data-ic="cleardir" hidden>다운로드로</button>
 <select data-ic="fmt" aria-label="확장자"><option value="orig">원본 그대로</option><option value="png">PNG · 투명 유지</option><option value="webp">WebP · 용량 작음</option><option value="jpg">JPG · 투명 없음</option></select>
 <button class="btn acc" type="button" data-ic="saveall">채운 칸 전부 저장</button><button class="btn" type="button" data-ic="set">설정</button></div>
 <div class="ic-work"><nav class="panel ic-side" aria-label="트레이너"></nav><div class="ic-grid"></div><aside class="panel ic-pane"></aside></div>
 <input type="file" data-ic="file" accept="image/*" multiple hidden>`}
function renderProg(){const v=V();let tot=0,f=0,s=0;for(const {t,p} of all()){if(tHid(t))continue;tot+=C.slots.length;const st=pState(p);f+=st.f;s+=st.s}
 $('.ic-bar .sv',v).style.width=tot?s/tot*100+'%':'0';$('.ic-bar .fl',v).style.width=tot?(f-s)/tot*100+'%':'0';$('.ic-prog .pt',v).textContent=`${f}/${tot}칸 채움 · ${s} 저장`;
 $$('[data-ic=filter] button',v).forEach(b=>b.setAttribute('aria-pressed',b.dataset.v===C.opts.filter));$('[data-ic=fmt]',v).value=C.opts.fmt;
 const can=!!window.showDirectoryPicker&&!C.opts.noDir;$('[data-ic=pickdir]',v).hidden=!can;$('[data-ic=cleardir]',v).hidden=!dir;$('[data-ic=dirlbl]',v).textContent='저장할 곳: '+(dir?dir.name:'다운로드')}
function renderSide(){const v=V(),gr=new Map(),fn=id=>(S.folders.find(f=>f.id===id)||{}).name||'폴더 없음';
 for(const t of S.trainers){const k=S.folders.some(f=>f.id===t.folder)?t.folder:'';if(!gr.has(k))gr.set(k,[]);gr.get(k).push(t)}
 const ord=[...S.folders.map(f=>f.id).filter(id=>gr.has(id)),...(gr.has('')?['']:[])];let h='';
 for(const fid of ord){const fh=C.hiddenF.includes(fid);if(ord.length>1||fid)h+=`<div class="ic-fold"><span>${esc(fn(fid))}</span><button type="button" class="ic-eye" data-hf="${esc(fid)}">${fh?'보이기':'숨기기'}</button></div>`;if(fh)continue;
  for(const t of gr.get(fid)){const off=C.hiddenT.includes(t.id);let tot=0,f=0;for(const p of t.pokemon||[]){tot+=C.slots.length;f+=pState(p).f}
   h+=`<div class="ic-tr${off?' off':''}${tot&&f===tot?' done':''}" data-t="${esc(t.id)}"><span class="nm" title="${esc(t.name)}">${esc(t.name||'이름 없음')}</span><span class="ct">${f}/${tot}</span><button type="button" class="ic-eye" data-ht="${esc(t.id)}">${off?'보이기':'숨기기'}</button></div>`}}
 $('.ic-side',v).innerHTML=h||'<p class="small muted">트레이너가 없습니다.</p>'}
function slotH(p,sl){const c=cell(p.id,sl.id),cd=pickOf(c),on=C.sel.p===p.id&&C.sel.s===sl.id,first=sl===C.slots[0];
 const inner=cd?`<img alt="" data-key="${esc(cd.key)}_t">`:(first&&p.image?`<img class="mk" alt="" src="${esc(p.image)}">`:'')+(C.slots.length>1?'':`<span class="lb">+ ${esc(sl.name)}</span>`);
 return `<div class="ic-slot${cd?' full ic-chk':''}${on?' on':''}" data-p="${esc(p.id)}" data-s="${esc(sl.id)}" title="${esc(sl.name)}">${inner}${C.slots.length>1?`<span class="k">${esc(sl.name)}</span>`:''}${c&&c.cands.length>1?`<span class="n">${c.cands.length}</span>`:''}</div>`}
function renderGrid(){const v=V(),by=new Map();for(const x of vis()){if(!by.has(x.t.id))by.set(x.t.id,{t:x.t,ps:[]});by.get(x.t.id).ps.push(x.p)}let h='';
 for(const {t,ps} of by.values()){let tot=0,f=0;for(const p of t.pokemon||[]){tot+=C.slots.length;f+=pState(p).f}
  h+=`<section class="ic-tg" data-tg="${esc(t.id)}"><h3>${esc(t.name||'이름 없음')}<span>${f}/${tot}</span></h3><div class="ic-cards">`;
  for(const p of ps){const st=pState(p),cl=!st.f?'':st.s===C.slots.length?'saved':st.f===C.slots.length?'fill':'part';
   h+=`<div class="ic-card${C.sel.p===p.id?' sel':''}" data-p="${esc(p.id)}"><span class="ic-st ${cl}"></span><div class="ic-slots n${Math.min(C.slots.length,4)}">${C.slots.map(sl=>slotH(p,sl)).join('')}</div><div><div class="nm" data-ed-open="${esc(p.id)}" title="눌러서 이름·타입·설명 고치기">${esc(pN(p))}${p.partner?' ★':''}</div><div class="sub">${esc([types(p),roleTxt(p)].filter(Boolean).join(' · '))}</div></div></div>`}
  h+='</div></section>'}
 const g=$('.ic-grid',v);g.innerHTML=h||`<p class="muted" style="padding:20px">${C.opts.filter==='empty'?'빈 칸이 없습니다. 다 모았어요!':'보여 줄 포켓몬이 없습니다.'}</p>`;fill(g)}
function renderPane(){const v=V(),pane=$('.ic-pane',v),tp=find(C.sel.p);
 if(!tp){pane.innerHTML=`<h2 style="margin:0;font-size:16px">포켓몬을 골라 주세요</h2><p class="small muted" style="margin:0">칸을 누르고 Ctrl+V로 이미지를 넣습니다. 넣으면 다음 빈 칸으로 넘어갑니다.</p><div><button class="btn acc" type="button" data-pa="first">첫 빈 칸으로</button></div>`;return}
 const {t,p}=tp;const ro=roleTxt(p);let h=`<div class="ic-who"><div class="ic-edit-hit" data-pa="edit" title="눌러서 이름·타입·설명 고치기"><h2>${esc(pN(p))}${p.partner?' ★':''}</h2><div class="small muted">${esc(t.name)}${types(p)?' · '+esc(types(p)):''}${ro?' · '+esc(ro):''}${p.ability?' · '+esc(p.ability):''}</div></div>${p.image?`<img class="ic-mkimg ic-chk" src="${esc(p.image)}" alt="제작기 그림" title="지금 제작기에 들어 있는 그림">`:''}</div>`;
 if(edP===p.id){const ro2=!canShare(),tl=tyList(),opt=v=>{const l=tl.includes(v||'-')?tl:[...tl,v];return l.map(x=>`<option${(v||'-')===x?' selected':''}>${esc(x)}</option>`).join('')};
  h+=`<div class="ic-ed">${ro2?'<p class="small muted w3" style="margin:0">읽기 전용이라 고칠 수 없습니다.</p>':''}
  <label class="w3">이름<input type="text" data-ed="name" value="${esc(p.name)}" spellcheck="false" autocomplete="off"${ro2?' disabled':''}></label>
  ${['t1','t2','t3'].map((k,n)=>`<label>타입${n+1}<select data-ed="${k}"${ro2?' disabled':''}>${opt(p[k])}</select></label>`).join('')}
  <label class="w3">특성<input type="text" data-ed="ability" value="${esc(p.ability)}" spellcheck="false" autocomplete="off"${ro2?' disabled':''}></label>
  <label class="w3">설명<textarea data-ed="memo" rows="8"${ro2?' disabled':''}>${esc(p.memo)}</textarea></label>
  <div class="row"><span class="small muted">고치면 바로 제작기에 저장됩니다.</span><button class="btn sm" type="button" data-pa="edit">다 고침</button></div></div>`}
 else if(p.memo)h+=`<p class="ic-memo" data-pa="edit" title="눌러서 고치기">${esc(p.memo)}</p>`;
 else h+=`<p class="ic-memo" data-pa="edit" title="눌러서 고치기" style="font-style:italic">설명 없음 · 눌러서 이름·타입·설명 고치기</p>`;
 for(const sl of C.slots){const c=cell(p.id,sl.id),cd=pickOf(c),on=C.sel.s===sl.id,first=sl===C.slots[0];
  h+=`<div class="ic-ps${on?' on':''}" data-s="${esc(sl.id)}"><div class="hd"><h4>${esc(sl.name)}${first&&C.slots.length>1?' <span class="small faint">대표</span>':''}</h4>${on?'<span class="small muted">Ctrl+V가 여기로 들어갑니다</span>':`<button class="btn sm" type="button" data-pa="slot" data-s="${esc(sl.id)}">여기에 넣기</button>`}</div>`;
  if(cd){const ex=ext(cd),sv=isSaved(p,sl,c);
   h+=`<div class="ic-big ic-chk" data-s="${esc(sl.id)}"><img alt="" data-key="${esc(cd.key)}"></div><div class="ic-meta">${cd.w}×${cd.h} · ${esc(cd.pasted?'붙여넣기':(cd.name||'이름 없음'))}</div>
   <div class="ic-cands">${c.cands.map((x,i)=>`<button type="button" class="ic-cand ic-chk${i===c.pick?' pick':''}" data-pa="pick" data-i="${i}" data-s="${esc(sl.id)}" title="${i===c.pick?'지금 고른 후보':'이 후보로 바꾸기'}"><img alt="" data-key="${esc(x.key)}_t"></button>`).join('')}<button type="button" class="ic-plus" data-pa="file" data-s="${esc(sl.id)}" title="파일에서 후보 더하기">+</button></div>
   <label class="small muted" for="icn-${esc(sl.id)}">저장할 이름</label><div class="ic-name"><input type="text" id="icn-${esc(sl.id)}" data-nm="${esc(sl.id)}" value="${esc(c.name)}" placeholder="${esc(defName(p,sl,c))}" spellcheck="false" autocomplete="off"><span class="ext">.${esc(ex)}</span></div>
   <div class="row"><button class="btn acc" type="button" data-pa="save" data-s="${esc(sl.id)}">${sv?'다시 저장':'PC에 저장'}</button>${first&&canShare()&&c.mkImg!==p.image?`<button class="btn sm" type="button" data-pa="mk" data-s="${esc(sl.id)}">제작기 그림으로</button>`:''}<button class="btn sm" type="button" data-pa="rm" data-s="${esc(sl.id)}">이 후보 빼기</button></div>
   <div class="ic-svst${sv?' ok':''}">${sv?'저장됨: '+esc(c.saved.path):c.saved?'저장한 뒤 바뀌었습니다 ('+esc(c.saved.path)+')':'아직 저장 안 함'}</div>`}
  else h+=`<div class="ic-big empty" data-s="${esc(sl.id)}" data-pa="file" role="button" tabindex="0"><div>이미지를 복사한 뒤 <b>Ctrl+V</b><br>또는 파일·이미지를 여기로 끌어다 놓기<br><span class="small">눌러서 파일 고르기</span></div></div>`;
  h+='</div>'}
 h+=`<div class="row"><button class="btn" type="button" data-pa="prev">이전</button><button class="btn" type="button" data-pa="next">다음</button><button class="btn pri" type="button" data-pa="empty">다음 빈 칸</button><button class="btn sm" type="button" data-pa="open">제작기에서 열기</button></div>
 <label class="ic-cb"><input type="checkbox" data-pa="adv"${C.opts.advance?' checked':''}> 빈 칸에 넣으면 다음 빈 칸으로 넘어가기</label>
 <div class="ic-keys"><span><kbd>Ctrl</kbd>+<kbd>V</kbd> 넣기</span><span><kbd>←</kbd><kbd>→</kbd> 이전·다음</span><span><kbd>N</kbd> 다음 빈 칸</span>${C.slots.length>1?`<span><kbd>1</kbd>~<kbd>${Math.min(9,C.slots.length)}</kbd> 종류</span>`:''}</div>`;
 pane.innerHTML=h;fill(pane)}

/* ----- 설정 창 */
function settings(){const l=openModal(`<div class="mhead"><h2>이미지 수집 설정</h2></div><div class="mbody" style="display:grid;gap:14px">
 <div style="display:grid;gap:6px"><b class="small">포켓몬마다 필요한 이미지</b><div class="ic-slotEd" data-ic="sed"></div><div class="row"><button class="btn sm" type="button" data-x="sadd">+ 종류 더하기</button><span class="small muted">맨 위가 대표 이미지입니다.</span></div></div>
 <div style="display:grid;gap:6px"><b class="small">저장 이름 기본값</b><select data-x="rule"><option value="file">원래 파일 이름 (붙여넣기는 포켓몬 이름)</option><option value="poke">포켓몬 이름</option></select><span class="small muted">이름은 포켓몬마다 오른쪽 칸에서 바꿀 수 있습니다. 「전부 저장」은 트레이너별 폴더로 묶은 ZIP 하나로 받습니다.</span></div>
 <label class="ic-cb"><input type="checkbox" data-x="mk"> 대표 이미지를 제작기 그림으로도 넣기 (제작기 그림이 비어 있을 때만)</label>
 <div style="display:grid;gap:6px"><b class="small">숨긴 트레이너</b><div class="row" data-ic="hid"></div></div>
 <p class="small muted" style="margin:0">원본 이미지와 진행 상황은 이 브라우저에만 보관됩니다. 다른 PC나 계정에서 열면 비어 있습니다(제작기 그림은 공유됨).</p>
 </div><div class="mfoot"><span class="sp"></span><button class="btn" data-x="close">닫기</button></div>`);
 const draw=()=>{$('[data-ic=sed]',l).innerHTML=C.slots.map((s,i)=>`<div class="r"><span class="bd">${i?i+1:'대표'}</span><input type="text" value="${esc(s.name)}" data-sn="${esc(s.id)}">${i?`<button class="btn sm" type="button" data-x="sup" data-id="${esc(s.id)}">↑</button>`:''}${C.slots.length>1?`<button class="btn sm" type="button" data-x="sdel" data-id="${esc(s.id)}">빼기</button>`:''}</div>`).join('');
  $('[data-x=rule]',l).value=C.opts.nameRule;$('[data-x=mk]',l).checked=C.opts.mkFill;
  const hid=[...C.hiddenT.map(id=>{const t=S.trainers.find(x=>x.id===id);return t?`<button class="btn sm" type="button" data-x="unt" data-id="${esc(id)}">${esc(t.name)} 보이기</button>`:''}),...C.hiddenF.map(id=>`<button class="btn sm" type="button" data-x="unf" data-id="${esc(id)}">${esc((S.folders.find(f=>f.id===id)||{}).name||'폴더 없음')} 보이기</button>`)].join('');
  $('[data-ic=hid]',l).innerHTML=hid||'<span class="small muted">없습니다. 왼쪽 목록에서 안 쓰는 트레이너를 숨길 수 있습니다.</span>'};
 draw();
 l.addEventListener('input',e=>{const i=e.target.closest('[data-sn]');if(i){C.slots.find(s=>s.id===i.dataset.sn).name=i.value.trim()||'이미지';keep();render()}});
 l.addEventListener('change',e=>{const x=e.target.dataset.x;if(x==='rule'){C.opts.nameRule=e.target.value;keep();render()}if(x==='mk'){C.opts.mkFill=e.target.checked;keep()}});
 l.addEventListener('click',e=>{const b=e.target.closest('[data-x]');if(!b||b.tagName==='SELECT'||b.tagName==='INPUT')return;const x=b.dataset.x,id=b.dataset.id;
  if(x==='close')return closeModal();
  if(x==='sadd')C.slots.push({id:uidI(),name:['토큰','스탠딩','이로치','전신'][C.slots.length-1]||'이미지 '+(C.slots.length+1)});
  if(x==='sup'){const i=C.slots.findIndex(s=>s.id===id);[C.slots[i-1],C.slots[i]]=[C.slots[i],C.slots[i-1]]}
  if(x==='sdel'){const used=Object.keys(C.cells).some(k=>k.endsWith('|'+id)&&C.cells[k].cands.length);if(used&&!b.classList.contains('armed')){b.classList.add('armed');b.textContent='이미지도 지움';return}
   for(const k of Object.keys(C.cells))if(k.endsWith('|'+id)){for(const c of C.cells[k].cands)drop(c.key);delete C.cells[k]}C.slots=C.slots.filter(s=>s.id!==id);if(C.sel.s===id)C.sel.s=C.slots[0].id}
  if(x==='unt')C.hiddenT=C.hiddenT.filter(v=>v!==id);if(x==='unf')C.hiddenF=C.hiddenF.filter(v=>v!==id);
  keep();draw();render()})}
function drop(k){for(const x of [k,k+'_t']){B.del('blobs',x).catch(()=>{});if(urls.has(x)){URL.revokeObjectURL(urls.get(x));urls.delete(x)}}}

/* ----- 조작 */
let fileTo=null;
function bind(){const v=V();
 v.addEventListener('click',async e=>{
  const ic=e.target.closest('[data-ic]');
  if(ic){const k=ic.dataset.ic;
   if(k==='filter'){const b=e.target.closest('button');if(b){C.opts.filter=b.dataset.v;keep();render()}return}
   if(k==='pickdir')return pickDir();if(k==='cleardir'){dir=null;B.del('kv','dir').catch(()=>{});render();return}
   if(k==='saveall'){ic.disabled=true;try{await saveAll()}finally{ic.disabled=false}return}if(k==='set')return settings()}
  const hf=e.target.closest('[data-hf]');if(hf){const id=hf.dataset.hf,i=C.hiddenF.indexOf(id);i<0?C.hiddenF.push(id):C.hiddenF.splice(i,1);keep();render();return}
  const ht=e.target.closest('[data-ht]');if(ht){const id=ht.dataset.ht,i=C.hiddenT.indexOf(id);i<0?C.hiddenT.push(id):C.hiddenT.splice(i,1);keep();render();return}
  const tr=e.target.closest('.ic-tr');if(tr){if(C.opts.filter!=='all'||q){C.opts.filter='all';q='';$('[data-ic=q]',v).value='';render()}const el=$(`[data-tg="${CSS.escape(tr.dataset.t)}"]`,v);if(el)el.scrollIntoView({block:'start',behavior:'smooth'});return}
  const pa=e.target.closest('[data-pa]');
  if(pa){const a=pa.dataset.pa,sid=pa.dataset.s,tp=find(C.sel.p);
   if(a==='first')return nextEmpty(true);if(a==='memo')return pa.classList.toggle('open');
   if(a==='edit'){edP=edP===C.sel.p?'':C.sel.p;renderPane();if(edP){const f=$('.ic-ed [data-ed=name]',V());if(f&&!f.disabled)f.focus()}return}if(a==='adv'){C.opts.advance=pa.checked;keep();return}
   if(a==='prev')return step(-1);if(a==='next')return step(1);if(a==='empty')return nextEmpty(false);
   if(a==='open'){if(tp&&window.MKM)MKM.open(tp.t.id);return}
   if(a==='slot')return sel(C.sel.p,sid);
   if(a==='file'){fileTo=[C.sel.p,sid];$('[data-ic=file]',v).click();return}
   const c=cell(C.sel.p,sid);if(!tp||!c)return;
   if(a==='pick'){c.pick=+pa.dataset.i;C.sel.s=sid;keep();if(sid===C.slots[0].id)await toMaker(tp.p,c,false);render();return}
   if(a==='mk'){if(await toMaker(tp.p,c,true)){toast('제작기 그림으로 넣었습니다');render()}return}
   if(a==='save'){pa.disabled=true;try{await saveOne(tp.t,tp.p,C.slots.find(s=>s.id===sid))}catch(err){toast(err.message==='perm'?'저장 폴더 권한이 없습니다. 폴더를 다시 골라 주세요':'저장하지 못했습니다')}pa.disabled=false;render();return}
   if(a==='rm'){if(!pa.classList.contains('armed')){pa.classList.add('armed');pa.textContent='정말 빼기';setTimeout(()=>{if(pa.isConnected){pa.classList.remove('armed');pa.textContent='이 후보 빼기'}},3000);return}
    const [x]=c.cands.splice(c.pick,1);c.pick=Math.max(0,c.pick-1);drop(x.key);if(!c.cands.length)c.saved=null;keep();render();return}
   return}
  const eo=e.target.closest('[data-ed-open]');if(eo){edP=eo.dataset.edOpen;return sel(eo.dataset.edOpen)}
  const sl=e.target.closest('.ic-slot');if(sl)return sel(sl.dataset.p,sl.dataset.s);
  const cd=e.target.closest('.ic-card');if(cd)return sel(cd.dataset.p);
  const ps=e.target.closest('.ic-ps');if(ps&&!e.target.closest('input,button')&&C.sel.s!==ps.dataset.s)sel(C.sel.p,ps.dataset.s)});
 v.addEventListener('input',e=>{if(e.target.dataset.ic==='q'){q=e.target.value;renderGrid();return}
  const ed=e.target.closest('[data-ed]');if(ed){const tp=find(C.sel.p);if(!tp||!canShare())return;tp.p[ed.dataset.ed]=ed.tagName==='SELECT'?(ed.value||'-'):ed.value;save();
   if(ed.dataset.ed!=='memo'){renderGrid();renderSide();const who=$('.ic-who .ic-edit-hit',V());if(who){$('h2',who).textContent=pN(tp.p)+(tp.p.partner?' ★':'');const ro=roleTxt(tp.p);$('.small',who).textContent=[tp.t.name,types(tp.p),ro,tp.p.ability].filter(Boolean).join(' · ')}}return}
  const nm=e.target.closest('[data-nm]');if(!nm)return;const c=cell(C.sel.p,nm.dataset.nm);c.name=nm.value;keep();
  const tp=find(C.sel.p),sl=C.slots.find(s=>s.id===nm.dataset.nm),st=$('.ic-svst',nm.closest('.ic-ps')),sv=isSaved(tp.p,sl,c);st.className='ic-svst'+(sv?' ok':'');st.textContent=sv?'저장됨: '+c.saved.path:c.saved?'이름이 바뀌었습니다. 다시 저장하면 새 이름으로 씁니다':'아직 저장 안 함';renderProg()});
 v.addEventListener('change',e=>{if(e.target.dataset.ic==='fmt'){C.opts.fmt=e.target.value;keep();render()}
  if(e.target.dataset.ic==='file'){const fs=[...e.target.files];e.target.value='';if(fileTo&&fs.length)addFiles(fs,...fileTo);fileTo=null}});
 v.addEventListener('keydown',e=>{if((e.key==='Enter'||e.key===' ')&&e.target.matches('.ic-big.empty')){e.preventDefault();e.target.click()}});
 v.addEventListener('dragover',e=>{e.preventDefault();$$('.over',v).forEach(x=>x.classList.remove('over'));const t=e.target.closest('.ic-slot,.ic-big');if(t)t.classList.add('over')});
 v.addEventListener('dragleave',e=>{const t=e.target.closest&&e.target.closest('.ic-slot,.ic-big');if(t)t.classList.remove('over')});
 v.addEventListener('drop',async e=>{e.preventDefault();$$('.over',v).forEach(x=>x.classList.remove('over'));const dt=e.dataTransfer,fs=[...(dt.files||[])];
  const sl=e.target.closest('.ic-slot'),bg=e.target.closest('.ic-big');let pid=C.sel.p,sid=C.sel.s;
  if(sl){pid=sl.dataset.p;sid=sl.dataset.s}else if(bg)sid=bg.dataset.s;
  if(!pid){if(!nextEmpty(true))return;pid=C.sel.p;sid=C.sel.s}C.sel={p:pid,s:sid};
  if(fs.length){if(!await addFiles(fs,pid,sid))toast('이미지 파일이 아닙니다');return}
  const u=(dt.getData('text/uri-list')||dt.getData('text/plain')||'').split('\n').map(s=>s.trim()).find(s=>/^https?:/i.test(s));if(u)addUrl(u,pid,sid)});
 document.addEventListener('paste',async e=>{const v2=V();if(!v2||v2.hidden||$('#mk').hidden||layers.length)return;const dt=e.clipboardData;if(!dt)return;
  const fs=[...dt.items].filter(i=>i.kind==='file'&&i.type.startsWith('image/')).map(i=>i.getAsFile()).filter(Boolean);
  if(fs.length){e.preventDefault();if(!C.sel.p&&!nextEmpty(true))return;for(let i=0;i<fs.length;i++)await add(fs[i],'',C.sel.p,C.sel.s,{pasted:true,stay:i<fs.length-1});return}
  if(e.target.closest&&e.target.closest('input,textarea'))return;const t=dt.getData('text/plain').trim();if(/^https?:\/\/\S+$/i.test(t)&&C.sel.p){e.preventDefault();addUrl(t,C.sel.p,C.sel.s)}});
 document.addEventListener('keydown',e=>{const v2=V();if(!v2||v2.hidden||$('#mk').hidden||layers.length||e.ctrlKey||e.metaKey||e.altKey)return;if(e.target.closest&&e.target.closest('input,textarea,select'))return;
  if(e.key==='Escape'&&edP){edP='';renderPane();return}
  if(e.key==='ArrowRight'){e.preventDefault();step(1)}else if(e.key==='ArrowLeft'){e.preventDefault();step(-1)}else if(e.key==='n'||e.key==='N'){e.preventDefault();nextEmpty(false)}
  else if(/^[1-9]$/.test(e.key)&&C.sel.p){const s=C.slots[+e.key-1];if(s)sel(C.sel.p,s.id)}})}

async function init(){try{const st=await B.get('kv','state');if(st){C=Object.assign(fresh(),st);C.opts=Object.assign(fresh().opts,st.opts||{})}const d=await B.get('kv','dir');if(d)dir=d}catch(e){}
 ready=true;bind();render()}
init();
return {render:()=>{if(ready)render()}};
})();
function renderImg(){IC.render()}
