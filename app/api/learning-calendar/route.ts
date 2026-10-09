import { env } from 'cloudflare:workers';
import { getDb } from '@/db';
import { authReply, getGoogleUser, sameOrigin } from '@/lib/google-auth';

export const dynamic = 'force-dynamic';

type EventRow = {
  id:string; event_date:string; name:string; audience:string; people:number; place:string;
  status:string; flow:string; materials_json:string; note:string; created_at:string; updated_at:string;
};

function map(row:EventRow){
  let materials:unknown[]=[];
  try{materials=JSON.parse(row.materials_json||'[]')}catch{}
  return {...row, date:row.event_date, materials};
}

async function handle(request:Request){
  try{
    const db=getDb();
    const url=new URL(request.url);
    const method=request.method.toUpperCase();
    if(method==='GET'){
      const rows=await db.prepare('SELECT * FROM learning_calendar_events ORDER BY event_date ASC, id ASC').all<EventRow>();
      const user=await getGoogleUser(request,getDb);
      const adminEmail=(env as Record<string,unknown>).CALENDAR_ADMIN_EMAIL;
      const canEdit=!!user && typeof adminEmail==='string' && adminEmail.trim().toLowerCase()===user.email.toLowerCase();
      return authReply({events:(rows.results??[]).map(map),canEdit,user:user?{displayName:user.displayName,email:user.email}:null});
    }
    if(!sameOrigin(request))return authReply({error:'请求来源无效'},403);
    const user=await getGoogleUser(request,getDb);
    const adminEmail=(env as Record<string,unknown>).CALENDAR_ADMIN_EMAIL;
    if(!user || typeof adminEmail!=='string' || adminEmail.trim().toLowerCase()!==user.email.toLowerCase())
      return authReply({error:'当前 Google 账号没有日历编辑权限。请确认已登录 Cloudflare Pages 中 CALENDAR_ADMIN_EMAIL 对应的管理员邮箱。'},403);
    if(!request.headers.get('content-type')?.startsWith('application/json'))return authReply({error:'请求格式无效'},415);
    const body=await request.json() as Record<string,unknown>;
    const now=new Date().toISOString();
    if(method==='POST'){
      const id=typeof body.id==='string'&&body.id?body.id:crypto.randomUUID();
      const date=String(body.date??'').slice(0,10),name=String(body.name??'').trim();
      if(!/^\d{4}-\d{2}-\d{2}$/.test(date)||!name)return authReply({error:'日期和活动名称不能为空'},400);
      const materials=Array.isArray(body.materials)?body.materials:[];
      await db.prepare('INSERT INTO learning_calendar_events (id,event_date,name,audience,people,place,status,flow,materials_json,note,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?)')
        .bind(id,date,name,String(body.audience??''),Number(body.people??0)||0,String(body.place??''),String(body.status??'pending'),String(body.flow??''),JSON.stringify(materials),String(body.note??''),now,now).run();
      return authReply({ok:true,id});
    }
    if(method==='PUT'){
      const id=String(body.id??''); if(!id)return authReply({error:'缺少活动ID'},400);
      const materials=Array.isArray(body.materials)?body.materials:[];
      await db.prepare('UPDATE learning_calendar_events SET event_date=?,name=?,audience=?,people=?,place=?,status=?,flow=?,materials_json=?,note=?,updated_at=? WHERE id=?')
        .bind(String(body.date??'').slice(0,10),String(body.name??'').trim(),String(body.audience??''),Number(body.people??0)||0,String(body.place??''),String(body.status??'pending'),String(body.flow??''),JSON.stringify(materials),String(body.note??''),now,id).run();
      return authReply({ok:true});
    }
    if(method==='DELETE'){
      const id=String(body.id??'');if(!id)return authReply({error:'缺少活动ID'},400);
      await db.prepare('DELETE FROM learning_calendar_events WHERE id=?').bind(id).run();
      return authReply({ok:true});
    }
    return authReply({error:'不支持的请求'},405);
  }catch(error){
    return authReply({error:error instanceof Error?error.message:'研学日历服务暂不可用'},503);
  }
}
export {handle as GET,handle as POST,handle as PUT,handle as DELETE};