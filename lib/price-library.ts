import {getDb} from '@/db';
import {authReply,getGoogleUser,limitedJson,sameOrigin} from '@/lib/google-auth';
import type {Cost,GroupType} from '@/lib/pricing';

export type PriceItem={id:string;catalogId:string;groupType:GroupType;category:string;name:string;mode:Cost['mode'];amount:number;quantity:number;capacity:number;minPeople:number;maxPeople:number;actualOnly:boolean;note:string;sortOrder:number};
export type PriceCatalog={id:string;name:string;source:'system'|'user';updatedAt:string;items:PriceItem[]};

const modes=new Set(['fixed','person','batch','adult','child','family']);
const groups=new Set(['student','family','senior','adult','company','custom']);

async function ensureSchema(){const db=getDb();await db.batch([
 db.prepare(`CREATE TABLE IF NOT EXISTS price_catalogs (id TEXT PRIMARY KEY, owner_id TEXT, name TEXT NOT NULL, source TEXT NOT NULL, is_active INTEGER NOT NULL DEFAULT 1, created_at TEXT NOT NULL, updated_at TEXT NOT NULL)`),
 db.prepare(`CREATE INDEX IF NOT EXISTS idx_price_catalogs_owner_source ON price_catalogs(owner_id,source,updated_at)`),
 db.prepare(`CREATE TABLE IF NOT EXISTS price_items (id TEXT PRIMARY KEY, catalog_id TEXT NOT NULL, group_type TEXT NOT NULL, category TEXT NOT NULL, name TEXT NOT NULL, mode TEXT NOT NULL, amount REAL NOT NULL, quantity REAL NOT NULL DEFAULT 1, capacity INTEGER NOT NULL DEFAULT 1, min_people INTEGER NOT NULL DEFAULT 0, max_people INTEGER NOT NULL DEFAULT 10000, actual_only INTEGER NOT NULL DEFAULT 0, note TEXT NOT NULL DEFAULT '', sort_order INTEGER NOT NULL DEFAULT 0)`),
 db.prepare(`CREATE INDEX IF NOT EXISTS idx_price_items_catalog_group ON price_items(catalog_id,group_type,sort_order)`)
]);}

async function seedSystemCatalog(){const db=getDb();const existing=await db.prepare(`SELECT id FROM price_catalogs WHERE source='system' AND is_active=1 LIMIT 1`).first<{id:string}>();if(existing)return;
 const id='system-default-v1',now=new Date().toISOString();
 const rows=[
 ['sys-stu-ticket','student','门票','学生团门票','child',30,1,1,'平台示例价，请按实际政策维护'],
 ['sys-stu-insurance','student','保险','活动保险','person',5,1,1,'平台示例价'],
 ['sys-stu-meal','student','餐饮','学生午餐','person',35,1,1,'平台示例价'],
 ['sys-stu-bus','student','交通','50座大巴','batch',1200,1,50,'平台示例价'],
 ['sys-family-ticket','family','门票','亲子套票','family',68,1,1,'平台示例价'],
 ['sys-family-insurance','family','保险','活动保险','person',5,1,1,'平台示例价'],
 ['sys-senior-ticket','senior','门票','老年团门票','person',25,1,1,'平台示例价']
 ] as const;
 const statements=[db.prepare(`INSERT INTO price_catalogs(id,owner_id,name,source,is_active,created_at,updated_at) VALUES(?,NULL,?,'system',1,?,?)`).bind(id,'平台标准价格库',now,now)];
 rows.forEach((r,i)=>statements.push(db.prepare(`INSERT INTO price_items(id,catalog_id,group_type,category,name,mode,amount,quantity,capacity,min_people,max_people,actual_only,note,sort_order) VALUES(?,?,?,?,?,?,?,?,?,0,10000,0,?,?)`).bind(r[0],id,r[1],r[2],r[3],r[4],r[5],r[6],r[7],r[8],i)));
 await db.batch(statements);
}

function rowToItem(r:Record<string,unknown>):PriceItem{return {id:String(r.id),catalogId:String(r.catalog_id),groupType:r.group_type as GroupType,category:String(r.category),name:String(r.name),mode:r.mode as Cost['mode'],amount:Number(r.amount),quantity:Number(r.quantity),capacity:Number(r.capacity),minPeople:Number(r.min_people),maxPeople:Number(r.max_people),actualOnly:Boolean(r.actual_only),note:String(r.note??''),sortOrder:Number(r.sort_order)};}

export async function priceLibraryGet(request:Request){try{await ensureSchema();await seedSystemCatalog();const user=await getGoogleUser(request,getDb);const url=new URL(request.url);const source=url.searchParams.get('source')==='user'?'user':'system';const group=(url.searchParams.get('group')||'student') as GroupType;if(!groups.has(group))return authReply({error:'团体类型无效'},400);if(source==='user'&&!user)return authReply({catalogs:[],needsLogin:true});
 const db=getDb();const catalogs=await db.prepare(source==='system'?`SELECT id,name,source,updated_at FROM price_catalogs WHERE source='system' AND is_active=1 ORDER BY updated_at DESC`:`SELECT id,name,source,updated_at FROM price_catalogs WHERE source='user' AND owner_id=? AND is_active=1 ORDER BY updated_at DESC`).bind(...(source==='user'?[user!.userId]:[])).all<Record<string,unknown>>();
 const output:PriceCatalog[]=[];for(const c of catalogs.results){const items=await db.prepare(`SELECT * FROM price_items WHERE catalog_id=? AND group_type=? ORDER BY sort_order,name`).bind(c.id,group).all<Record<string,unknown>>();output.push({id:String(c.id),name:String(c.name),source:c.source as 'system'|'user',updatedAt:String(c.updated_at),items:items.results.map(rowToItem)});}return authReply({catalogs:output,needsLogin:false});
 }catch{return authReply({error:'价格库暂不可用，请稍后重试'},503);}}

export async function priceLibraryPost(request:Request){if(!sameOrigin(request))return authReply({error:'请求来源无效，请刷新页面后重试'},403);try{await ensureSchema();const user=await getGoogleUser(request,getDb);if(!user)return authReply({error:'请先登录后再导入个人价格库'},401);if(!request.headers.get('content-type')?.startsWith('application/json'))return authReply({error:'请求格式无效'},415);const data=await limitedJson(request);const name=typeof data.name==='string'?data.name.trim():'';const rows=Array.isArray(data.rows)?data.rows:[];if(!name||name.length>80)return authReply({error:'价格库名称须为 1–80 字'},400);if(rows.length<1||rows.length>300)return authReply({error:'一次请导入 1–300 条价格'},400);
 const normalized=rows.map((raw,i)=>{if(!raw||typeof raw!=='object'||Array.isArray(raw))throw new Error(`第 ${i+1} 行格式无效`);const r=raw as Record<string,unknown>;const group=String(r.groupType??'student'),mode=String(r.mode??'person'),itemName=String(r.name??'').trim(),category=String(r.category??'其他').trim()||'其他',amount=Number(r.amount),quantity=Number(r.quantity??1),capacity=Number(r.capacity??1),minPeople=Number(r.minPeople??0),maxPeople=Number(r.maxPeople??10000),note=String(r.note??'').slice(0,200);if(!groups.has(group)||!modes.has(mode)||!itemName||itemName.length>60||!Number.isFinite(amount)||amount<0||amount>10000000||!Number.isFinite(quantity)||quantity<0||!Number.isInteger(capacity)||capacity<1||!Number.isInteger(minPeople)||!Number.isInteger(maxPeople)||minPeople<0||maxPeople<minPeople)throw new Error(`第 ${i+1} 行数据无效`);return {group,mode,itemName,category,amount,quantity,capacity,minPeople,maxPeople,note,actualOnly:r.actualOnly===true};});
 const db=getDb(),id=crypto.randomUUID(),now=new Date().toISOString();const statements=[db.prepare(`INSERT INTO price_catalogs(id,owner_id,name,source,is_active,created_at,updated_at) VALUES(?,?,?,'user',1,?,?)`).bind(id,user.userId,name,now,now)];normalized.forEach((r,i)=>statements.push(db.prepare(`INSERT INTO price_items(id,catalog_id,group_type,category,name,mode,amount,quantity,capacity,min_people,max_people,actual_only,note,sort_order) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?)`).bind(crypto.randomUUID(),id,r.group,r.category,r.itemName,r.mode,r.amount,r.quantity,r.capacity,r.minPeople,r.maxPeople,r.actualOnly?1:0,r.note,i)));await db.batch(statements);return authReply({ok:true,id,count:normalized.length});
 }catch(e){return authReply({error:e instanceof Error?e.message:'导入失败，请检查数据'},400);}}
