/* ---------- VELVET 테마: P4(기본) · P3 · P5 · 망각 ----------
   html[data-vt] 만 바꾸고, 겉모습은 css/vtheme.css 가 덮는다. 고른 테마는 이 브라우저(localStorage mk_vt)에 남는다.
   고르는 단추: 위 띠 「백업 불러오기」 옆 (휴대폰은 「파일 ▾」 안). */
"use strict";
window.MK_VT=(()=>{
 const K='mk_vt',L=[['p5','P5'],['p3','P3'],['p4','P4'],['mm','망각']];
 /* 10-24 망령: 기본을 P4 로 — 그 전에 골라 둔 테마도 한 번만 P4 로 돌려 놓는다 (그 뒤 고른 건 그대로) */
 try{if(localStorage.getItem(K+'_d')!=='p4'){localStorage.setItem(K+'_d','p4');localStorage.removeItem(K)}}catch(e){}
 const get=()=>{try{const v=localStorage.getItem(K);return L.some(x=>x[0]===v)?v:'p4'}catch(e){return 'p4'}};
 const set=v=>{if(!L.some(x=>x[0]===v))v='p4';document.documentElement.setAttribute('data-vt',v);try{localStorage.setItem(K,v)}catch(e){}
  document.querySelectorAll('.vtsw button').forEach(b=>b.classList.toggle('on',b.dataset.vt===v))};
 document.documentElement.setAttribute('data-vt',get());
 const sw=()=>{const s=document.createElement('span');s.className='vtsw';s.title='화면 테마 (VELVET P5 · P3 · P4)';
  s.innerHTML=L.map(([k,l])=>`<button type="button" data-vt="${k}" class="${k===get()?'on':''}">${l}</button>`).join('');
  s.onclick=e=>{const b=e.target.closest('[data-vt]');if(b)set(b.dataset.vt)};return s};
 let q=0;const put=()=>{q=0;const t=document.querySelector('#tools');if(t&&!t.querySelector('.vtsw')){const r=t.querySelector('#saved');if(r)t.insertBefore(sw(),r);else t.appendChild(sw())}};
 new MutationObserver(()=>{if(!q)q=requestAnimationFrame(put)}).observe(document.documentElement,{childList:true,subtree:true});
 return {get,set}})();
