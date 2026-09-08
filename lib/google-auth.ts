import {createRemoteJWKSet,jwtVerify,type JWTVerifyGetKey} from 'jose';
const googleKeys=createRemoteJWKSet(new URL('https://www.googleapis.com/oauth2/v3/certs'));
export type GoogleUser={userId:string;displayName:string;email:string};
export async function verifyGoogleCredential(credential:string,clientId:string,nonce:string,keys:JWTVerifyGetKey=googleKeys):Promise<GoogleUser>{
 const {payload}=await jwtVerify(credential,keys,{algorithms:['RS256'],audience:clientId,issuer:['https://accounts.google.com','accounts.google.com'],requiredClaims:['sub','exp','iat','nonce'],maxTokenAge:'10m',clockTolerance:5});
 if(payload.nonce!==nonce||typeof payload.sub!=='string'||!payload.sub||payload.sub.length>255||typeof payload.email!=='string'||payload.email.length>320||payload.email_verified!==true)throw new Error('Google 身份验证失败');
 return {userId:'google:'+payload.sub,displayName:typeof payload.name==='string'&&payload.name.trim()?payload.name.trim().slice(0,100):payload.email,email:payload.email};
}
export const noStore={'Cache-Control':'private, no-store','Vary':'Cookie'};
export const authReply=(value:unknown,status=200)=>Response.json(value,{status,headers:noStore});
export function sameOrigin(request:Request){return request.headers.get('Origin')===new URL(request.url).origin;}
export function randomToken(){return Array.from(crypto.getRandomValues(new Uint8Array(32)),b=>b.toString(16).padStart(2,'0')).join('');}
export async function hashToken(value:string){return Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(value))),b=>b.toString(16).padStart(2,'0')).join('');}
export function cookieName(request:Request,kind:'session'|'nonce'){return (new URL(request.url).protocol==='https:'?'__Host-':'local-')+'pricing-'+kind;}
export function readCookie(request:Request,kind:'session'|'nonce'){const name=cookieName(request,kind);const part=(request.headers.get('cookie')??'').split(';').map(v=>v.trim()).find(v=>v.startsWith(name+'='));const value=part?.slice(name.length+1);return value&&/^[a-f0-9]{64}$/.test(value)?value:null;}
export function authCookie(request:Request,kind:'session'|'nonce',value:string,seconds:number){return cookieName(request,kind)+'='+value+'; Path=/; HttpOnly; SameSite=Lax; Max-Age='+seconds+(new URL(request.url).protocol==='https:'?'; Secure':'');}
export async function getGoogleUser(request:Request,db:()=>D1Database):Promise<GoogleUser|null>{
 const token=readCookie(request,'session');if(!token)return null;
 const row=await db().prepare('SELECT owner_id, display_name, email FROM google_sessions WHERE token_hash = ? AND expires_at > ?').bind(await hashToken(token),Date.now()).first<{owner_id:string;display_name:string;email:string}>();
 return row?{userId:row.owner_id,displayName:row.display_name,email:row.email}:null;
}
export async function limitedJson(request:Request){const reader=request.body?.getReader();if(!reader)throw new Error('Empty body');const decoder=new TextDecoder();let text='',size=0;while(true){const item=await reader.read();if(item.done)break;size+=item.value.byteLength;if(size>16384){await reader.cancel();throw new Error('Body too large');}text+=decoder.decode(item.value,{stream:true});}text+=decoder.decode();return JSON.parse(text) as Record<string,unknown>;}
export async function googleAuthRequest(request:Request,db:()=>D1Database,clientId:string|undefined,verify=verifyGoogleCredential){
 if(!sameOrigin(request))return authReply({error:'请求来源无效，请刷新页面后重试'},403);
 if(!clientId||!clientId.endsWith('.apps.googleusercontent.com'))return authReply({error:'Google 登录暂不可用'},503);
 try{
 const database=db();const now=Date.now();
 if(new URL(request.url).pathname.endsWith('/challenge')){
 const nonce=randomToken();await database.batch([
 database.prepare('DELETE FROM google_challenges WHERE nonce_hash IN (SELECT nonce_hash FROM google_challenges WHERE expires_at <= ? LIMIT 1000)').bind(now),
 database.prepare('INSERT INTO google_challenges (nonce_hash, expires_at) VALUES (?, ?)').bind(await hashToken(nonce),now+600000)
 ]);
 const response=authReply({nonce});response.headers.append('Set-Cookie',authCookie(request,'nonce',nonce,600));return response;
 }
 if(!request.headers.get('content-type')?.startsWith('application/json'))return authReply({error:'请求格式无效'},415);
 let data;try{data=await limitedJson(request);}catch{return authReply({error:'登录凭据格式无效'},400);}
 const nonce=readCookie(request,'nonce');if(!nonce||typeof data.credential!=='string'||data.credential.length>15000)return authReply({error:'登录请求已失效，请重新点击登录'},401);
 const nonceHash=await hashToken(nonce);const challenge=await database.prepare('SELECT nonce_hash FROM google_challenges WHERE nonce_hash = ? AND expires_at > ?').bind(nonceHash,now).first();
 if(!challenge)return authReply({error:'登录请求已过期，请重新点击登录'},401);
 let user:GoogleUser;try{user=await verify(data.credential,clientId,nonce);}catch{return authReply({error:'Google 身份验证未通过，请重新登录'},401);}
 const consumed=await database.prepare('DELETE FROM google_challenges WHERE nonce_hash = ? AND expires_at > ? RETURNING nonce_hash').bind(nonceHash,Date.now()).first();
 if(!consumed)return authReply({error:'登录请求已使用，请重新登录'},401);
 const token=randomToken();const old=readCookie(request,'session');const statements=[
 database.prepare('INSERT INTO google_sessions (token_hash, owner_id, display_name, email, expires_at) VALUES (?, ?, ?, ?, ?)').bind(await hashToken(token),user.userId,user.displayName,user.email,now+604800000),
 database.prepare('DELETE FROM google_sessions WHERE token_hash IN (SELECT token_hash FROM google_sessions WHERE expires_at <= ? LIMIT 1000)').bind(now)
 ];if(old)statements.push(database.prepare('DELETE FROM google_sessions WHERE token_hash = ?').bind(await hashToken(old)));
 await database.batch(statements);
 const response=authReply({user:{displayName:user.displayName,email:user.email}});response.headers.append('Set-Cookie',authCookie(request,'session',token,604800));response.headers.append('Set-Cookie',authCookie(request,'nonce','',0));return response;
 }catch{return authReply({error:'暂时无法完成登录，请稍后重试'},503);}
}
export async function logoutRequest(request:Request,db:()=>D1Database){
 if(!sameOrigin(request))return authReply({error:'请求来源无效'},403);
 try{const token=readCookie(request,'session');if(token)await db().prepare('DELETE FROM google_sessions WHERE token_hash = ?').bind(await hashToken(token)).run();const response=authReply({ok:true});response.headers.append('Set-Cookie',authCookie(request,'session','',0));return response;}catch{return authReply({error:'退出失败，请重试'},503);}
}
