import assert from 'node:assert/strict';
import {registerHooks} from 'node:module';
import {DatabaseSync} from 'node:sqlite';
import {mkdtempSync,readFileSync,readdirSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
registerHooks({resolve(specifier,context,next){try{return next(specifier,context);}catch(e){if(specifier.startsWith('./')&&context.parentURL?.includes('/lib/'))return next(specifier+'.ts',context);throw e;}}});
const {estimateRequest}=await import('../lib/estimate-service.ts');
const {demo}=await import('../lib/pricing.ts');
const dir=mkdtempSync(join(tmpdir(),'pricing-test-'));let sqlite=new DatabaseSync(join(dir,'test.sqlite'));
const db = {
 prepare(sql) {
  const s=sqlite.prepare(sql);
  return {bind(...args) {
   return {
    async run(){return s.run(...args)},
    async first(){return s.get(...args)??null},
    async all(){return {results:s.all(...args)}}
   };
  }};
 }
};
const endpoint='https://pricing.test/api/estimates';
const call=(user,query='')=>estimateRequest(new Request(endpoint+query),user,()=>db);
const post=(body,user='alice',origin='https://pricing.test')=>estimateRequest(new Request(endpoint,{method:'POST',headers:{Origin:origin,'Content-Type':'application/json'},body:JSON.stringify(body)}),user,()=>db);
try{
 for(const file of readdirSync(new URL('../drizzle/',import.meta.url)).filter(f=>f.endsWith('.sql')))sqlite.exec(readFileSync(new URL('../drizzle/'+file,import.meta.url),'utf8'));
 assert.equal((await call(null)).status,401);
 const record={id:crypto.randomUUID(),title:'秋季自然探索',plan:structuredClone(demo)};
 assert.equal((await post(record,null)).status,401);assert.equal((await post(record,'alice','https://evil.test')).status,403);
 assert.equal((await post({...record,title:'  '})).status,400);assert.equal((await post({...record,plan:{}})).status,400);
 assert.equal((await post({...record,plan:{...demo,costs:[null]}})).status,400);
 assert.equal((await post(record)).status,201);assert.equal((await post(record)).status,201);
 assert.equal((await post({...record,title:'冲突'})).status,409);assert.equal((await post(record,'bob')).status,409);
 assert.equal((await call('bob','?id='+record.id)).status,404);assert.deepEqual((await (await call('bob')).json()).items,[]);
 const list=await (await call('alice','?q='+encodeURIComponent('自然'))).json();assert.equal(list.items.length,1);assert.equal(list.items[0].actual,7796);
 assert.equal((await (await call('alice','?q='+encodeURIComponent("' OR 1=1 --"))).json()).items.length,0);
 sqlite.close();sqlite=new DatabaseSync(join(dir,'test.sqlite'));
 const restored=await (await call('alice','?id='+record.id)).json();assert.deepEqual(restored.plan,demo);assert.equal(restored.title,record.title);
 for(let i=0;i<22;i++)assert.equal((await post({...record,id:crypto.randomUUID(),title:'新估算 '+i})).status,201);
 const first=await (await call('alice')).json(),second=await (await call('alice','?offset=20')).json();assert.equal(first.items.length,20);assert.equal(first.hasMore,true);assert.equal(second.items.length,3);assert.equal(second.hasMore,false);assert.equal(new Set([...first.items,...second.items].map(x=>x.id)).size,23);
 assert.equal((await call('alice','?offset=-1')).status,400);
 const failure=await estimateRequest(new Request(endpoint),'alice',()=>{throw new Error('offline')});assert.equal(failure.status,503);
 const familyRecord={id:crypto.randomUUID(),title:'亲子一大两小',plan:{...demo,billing:'family',adultsPerFamily:1,childrenPerFamily:2,commission:4,reserve:8,costs:demo.costs.map((c,i)=>i===2?{...c,mode:'child'}:c)}};
 assert.equal((await post(familyRecord)).status,201);
 assert.deepEqual((await (await call('alice','?id='+familyRecord.id)).json()).plan,familyRecord.plan);
 const familyList=await (await call('alice','?q='+encodeURIComponent('亲子'))).json();assert.equal(familyList.items[0].billing,'family');
 assert.equal((await post({...familyRecord,id:crypto.randomUUID(),plan:{...familyRecord.plan,adultsPerFamily:'2'}})).status,400);
 const mutate=(method,body,user='alice',origin='https://pricing.test',id=record.id)=>estimateRequest(new Request(endpoint+(method==='DELETE'?'?id='+id:''),{method,headers:{Origin:origin,'Content-Type':'application/json'},...(method==='PUT'?{body:JSON.stringify(body)}:{})}),user,()=>db);
 const changed={...record,title:'修改后的项目',plan:{...demo,price:399}};
 for(const method of ['PUT','DELETE']){
  assert.equal((await mutate(method,changed,null)).status,401);
  assert.equal((await mutate(method,changed,'alice','https://evil.test')).status,403);
  assert.equal((await mutate(method,changed,'bob')).status,404);
 }
 assert.equal((await mutate('PUT',{...changed,plan:{}})).status,400);
 assert.equal((await mutate('PUT',changed)).status,200);
 assert.equal((await mutate('PUT',changed)).status,200);
 const updated=await (await call('alice','?id='+record.id)).json();
 assert.equal(updated.createdAt,restored.createdAt);assert.equal(updated.title,changed.title);assert.deepEqual(updated.plan,changed.plan);
 const updatedList=await (await call('alice','?q='+encodeURIComponent(changed.title))).json();assert.equal(updatedList.items.length,1);assert.equal(updatedList.items[0].price,399);
 assert.equal((await mutate('DELETE')).status,200);assert.equal((await call('alice','?id='+record.id)).status,404);
 assert.equal((await mutate('DELETE')).status,404);assert.equal((await mutate('PUT',changed)).status,404);
 assert.equal((await call('alice','?id='+familyRecord.id)).status,200);
 console.log('Passed: SQLite migration, persistence after reopen, owner isolation, authentication, CSRF, malformed data, retry idempotency, search, pagination and outage response.');
}finally{sqlite.close();rmSync(dir,{recursive:true,force:true});}
