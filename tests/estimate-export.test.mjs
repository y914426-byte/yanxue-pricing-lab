import assert from 'node:assert/strict';
import {registerHooks} from 'node:module';
import readXlsxFile from 'read-excel-file/node';
registerHooks({resolve(specifier,context,next){try{return next(specifier,context);}catch(e){if(specifier.startsWith('./')&&context.parentURL?.includes('/lib/'))return next(specifier+'.ts',context);throw e;}}});
const {exportEstimate}=await import('../lib/estimate-export.ts');
const {demo,calculate}=await import('../lib/pricing.ts');
const base={id:crypto.randomUUID(),title:'秋季研学 / 成本:估算',createdAt:'2026-09-12T11:00:00.000Z',plan:demo};
for(const plan of [demo,{...demo,billing:'family',groupType:'family',adultsPerFamily:1,childrenPerFamily:2,commission:4,reserve:8,costs:demo.costs.map((c,i)=>i===2?{...c,mode:'child',name:'=SUM(A1:A2)'}:c)},{...demo,paying:0,costs:[]}]){
 const file=await exportEstimate({...base,plan});
 assert.ok(file.filename.endsWith('.xlsx'));assert.ok(!/[<>:"/\\|?*]/.test(file.filename));
 const buffer=Buffer.from(await file.content.arrayBuffer());assert.equal(buffer.subarray(0,2).toString(),'PK');
 const sheets=await readXlsxFile(buffer);
 const overview=sheets.find(s=>s.sheet==='估算概览').data,details=sheets.find(s=>s.sheet==='成本明细').data;
 const rows=new Map(overview.map(row=>[row[0],row[1]])),r=calculate(plan);
 assert.equal(rows.get('项目名称'),base.title);assert.equal(rows.get('实际成本'),r.actual);assert.equal(rows.get('总收入'),r.revenue);assert.equal(rows.get('实际毛利'),r.profit);assert.equal(rows.get('实际毛利率'),r.margin??'—');assert.equal(rows.get('收费数量'),plan.paying);
 assert.equal(details.length,plan.costs.length+2);assert.equal(details.at(-1)[5],r.subtotal);
 r.items.forEach((c,i)=>{assert.equal(details[i+1][0],c.name);assert.equal(details[i+1][2],c.amount);assert.equal(details[i+1][5],c.total);});
}
console.log('Passed: real XLSX readback, Chinese sheet names, numeric totals, family pricing, zero revenue, empty costs, filename sanitization and formula-like text.');
