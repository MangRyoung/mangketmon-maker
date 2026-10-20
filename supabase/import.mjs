// 기존 데이터(seed.json)를 Supabase docs 테이블에 넣는다. 한 번만 쓰는 스크립트.
//   node supabase/import.mjs <SUPABASE_URL> <ANON_KEY> [seed.json]
// 이미 같은 kind/id 가 있으면 덮어쓴다.
import fs from 'node:fs';
const [url,key,file='supabase/seed.json']=process.argv.slice(2);
if(!url||!key){console.error('사용법: node supabase/import.mjs <SUPABASE_URL> <ANON_KEY> [seed.json]');process.exit(1)}
const rows=JSON.parse(fs.readFileSync(file,'utf8'));
const H={'apikey':key,'Authorization':'Bearer '+key,'Content-Type':'application/json','Prefer':'resolution=merge-duplicates,return=minimal'};
let n=0;
for(let i=0;i<rows.length;i+=50){
  const chunk=rows.slice(i,i+50);
  const r=await fetch(url.replace(/\/$/,'')+'/rest/v1/docs?on_conflict=kind,id',{method:'POST',headers:H,body:JSON.stringify(chunk)});
  if(!r.ok){console.error('실패',r.status,await r.text());process.exit(1)}
  n+=chunk.length;console.log(n+'/'+rows.length);
}
console.log('완료:',n,'건');
