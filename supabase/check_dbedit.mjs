// 기본 DB(data/db.js) 새 판을 올리기 전에, 공유 DB 의 수정(dbedit)과 부딪치는 행을 미리 본다. 읽기만 한다.
//   node supabase/check_dbedit.mjs
// 「붙을 행 없음」: 새 판에 그 이름이 없다 → 제작기 DB 탭 위 「붙을 행이 없는 수정」으로 간다 (이름을 바꿨다면 옮겨 붙이기)
// 「행 통째 고정」: 고친 행이 새 판의 다른 칸 변경까지 막는다 (고친 칸 외에 다른 칸이 다르면 표시)
import fs from 'node:fs';
import vm from 'node:vm';
const cfgSrc=fs.readFileSync(new URL('../js/config.js',import.meta.url),'utf8');
const ctx={window:{}};vm.runInNewContext(cfgSrc,ctx);vm.runInNewContext(fs.readFileSync(new URL('../data/db.js',import.meta.url),'utf8'),ctx);
const {supabaseUrl:url,supabaseKey:key,table='docs'}=ctx.window.MKM_CONFIG,D=ctx.window.MKM_DB;
const K={moves:2,abil:1,items:1,pots:1,old:1,points:4,cards:1};
const r=await fetch(`${url}/rest/v1/${table}?kind=eq.dbedit&select=id,data`,{headers:{apikey:key,Authorization:'Bearer '+key}});
if(!r.ok){console.error('읽기 실패',r.status,await r.text());process.exit(1)}
const rows=await r.json();const out={orph:[],wide:[]};
for(const {data:d} of rows){if(!d||d.deleted||!(d.kind in K)||!Array.isArray(d.row))continue;
  const base=(D[d.kind]||[]).find(x=>x[K[d.kind]]===d.key);
  if(!base){if(!(d.pos>=0))out.orph.push(`${d.kind} 「${d.key}」`);continue}
  const diff=[];for(let i=0;i<Math.max(base.length,d.row.length);i++)if(String(base[i]??'')!==String(d.row[i]??''))diff.push(i);
  if(diff.length>1)out.wide.push(`${d.kind} 「${d.key}」 칸 ${diff.join(',')}`)}
console.log(`수정 문서 ${rows.length}개`);
console.log(`붙을 행 없음 ${out.orph.length}개`+(out.orph.length?'\n  '+out.orph.join('\n  '):''));
console.log(`두 칸 이상 다른 행 ${out.wide.length}개 (새 판 변경이 가려질 수 있음)`+(out.wide.length?'\n  '+out.wide.join('\n  '):''));
