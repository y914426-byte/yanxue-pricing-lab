import {parseEstimate} from './estimate-input';
import {calculate} from './pricing';
const reply=(data:unknown,status=200)=>Response.json(data,{status,headers:{'Cache-Control':'private, no-store','Vary':'Cookie'}});
export async function estimateRequest(request:Request,owner:string|null,db:()=>D1Database){
 if(!owner)return reply({error:'请先登录，再保存或查询自己的项目'},401);
 const url=new URL(request.url);
 if(request.method==='POST'){
 if(request.headers.get('Origin')!==url.origin)return reply({error:'请求来源无效，请刷新页面后重试'},403);
 if(!request.headers.get('content-type')?.startsWith('application/json'))return reply({error:'请求格式无效'},415);
 let value;try{const reader=request.body?.getReader();let raw='';let size=0;const decoder=new TextDecoder();if(reader){while(true){const chunk=await reader.read();if(chunk.done)break;size+=chunk.value.byteLength;if(size>262144){await reader.cancel();return reply({error:'记录过大，请减少成本明细'},413);}raw+=decoder.decode(chunk.value,{stream:true});}raw+=decoder.decode();}value=parseEstimate(JSON.parse(raw));}catch(e){return reply({error:e instanceof Error?e.message:'估算格式无效'},400)}
 try{
 const database=db();const now=new Date().toISOString();
 await database.prepare('INSERT INTO estimates (id, owner_id, title, plan_json, created_at) VALUES (?, ?, ?, ?, ?) ON CONFLICT(id) DO NOTHING').bind(value.id,owner,value.title,JSON.stringify(value.plan),now).run();
 const row=await database.prepare('SELECT id, title, plan_json, created_at FROM estimates WHERE id = ? AND owner_id = ?').bind(value.id,owner).first<{id:string;title:string;plan_json:string;created_at:string}>();
 if(!row||row.title!==value.title||row.plan_json!==JSON.stringify(value.plan))return reply({error:'记录编号冲突，请重新保存'},409);
 return reply({id:row.id,createdAt:row.created_at},201);
 }catch{return reply({error:'云端保存失败，你的输入仍在页面中，请稍后重试'},503)}
 }
 if(request.method!=='GET')return reply({error:'不支持的操作'},405);
 try{
 const database=db();const id=url.searchParams.get('id');
 if(id){const row=await database.prepare('SELECT id, title, plan_json, created_at FROM estimates WHERE id = ? AND owner_id = ?').bind(id,owner).first<{id:string;title:string;plan_json:string;created_at:string}>();if(!row)return reply({error:'找不到这条项目记录'},404);return reply({...parseEstimate({id:row.id,title:row.title,plan:JSON.parse(row.plan_json)}),createdAt:row.created_at});}
 const query=(url.searchParams.get('q')??'').trim().slice(0,80);const offset=Number(url.searchParams.get('offset')??0);if(!Number.isSafeInteger(offset)||offset<0)return reply({error:'页码无效'},400);
 const {results}=await database.prepare('SELECT id, title, plan_json, created_at FROM estimates WHERE owner_id = ? AND instr(lower(title), lower(?)) > 0 ORDER BY created_at DESC, id DESC LIMIT 21 OFFSET ?').bind(owner,query,offset).all<{id:string;title:string;plan_json:string;created_at:string}>();
 return reply({items:results.slice(0,20).map(row=>{const {plan}=parseEstimate({id:row.id,title:row.title,plan:JSON.parse(row.plan_json)});const r=calculate(plan);return {id:row.id,title:row.title,createdAt:row.created_at,billing:plan.billing??'person',paying:plan.paying,price:plan.price,actual:r.actual,profit:r.profit};}),hasMore:results.length>20});
 }catch{return reply({error:'暂时无法读取云端记录，请稍后重试'},503)}
}
