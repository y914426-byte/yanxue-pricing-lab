import {authReply,sameOrigin,type GoogleUser} from './google-auth';
export async function importLegacyRecords(request:Request,google:GoogleUser|null,legacy:{userId:string;email:string}|null,database:D1Database){
 if(!sameOrigin(request))return authReply({error:'请求来源无效'},403);
 if(!google||!legacy)return authReply({error:'请先分别验证 Google 账号和原账号'},401);
 try{await database.batch([
 database.prepare('INSERT INTO account_links (legacy_owner, google_owner, linked_at) VALUES (?, ?, ?) ON CONFLICT DO NOTHING').bind(legacy.userId,google.userId,new Date().toISOString()),
 database.prepare('UPDATE estimates SET owner_id = ? WHERE owner_id = ? AND EXISTS (SELECT 1 FROM account_links WHERE legacy_owner = ? AND google_owner = ?)').bind(google.userId,legacy.userId,legacy.userId,google.userId)
 ]);
 const link=await database.prepare('SELECT google_owner FROM account_links WHERE legacy_owner = ?').bind(legacy.userId).first<{google_owner:string}>();
 if(link?.google_owner!==google.userId)return authReply({error:'其中一个账号已经关联了其他账号，未转移任何记录'},409);
 return authReply({ok:true});
 }catch{return authReply({error:'导入暂未完成，旧记录仍保留，请稍后重试'},503);}
}
