import assert from 'node:assert/strict';
import {registerHooks} from 'node:module';
import {DatabaseSync} from 'node:sqlite';
import {readdirSync,readFileSync} from 'node:fs';
import {generateKeyPair,exportJWK,createLocalJWKSet,SignJWT} from 'jose';
registerHooks({resolve(s,c,next){try{return next(s,c)}catch(e){if(s.startsWith('./')&&c.parentURL?.includes('/lib/'))return next(s+'.ts',c);throw e;}}});
const {googleAuthRequest,getGoogleUser,verifyGoogleCredential,logoutRequest,cookieName,hashToken}=await import('../lib/google-auth.ts');
const {importLegacyRecords}=await import('../lib/account-import.ts');
const sqlite=new DatabaseSync(':memory:');
for(const f of readdirSync(new URL('../drizzle/',import.meta.url)).filter(x=>x.endsWith('.sql')))sqlite.exec(readFileSync(new URL('../drizzle/'+f,import.meta.url),'utf8'));
const db={
 prepare(sql){
  return {bind(...args){
   const s=sqlite.prepare(sql);
   return {
    async run(){return s.run(...args)},
    async first(){return s.get(...args)??null},
    async all(){return {results:s.all(...args)}}
   };
  }};
 },
 async batch(statements){
  sqlite.exec('BEGIN');
  try{const rows=[];for(const s of statements)rows.push(await s.run());sqlite.exec('COMMIT');return rows;}
  catch(e){sqlite.exec('ROLLBACK');throw e;}
 }
};
const {privateKey,publicKey}=await generateKeyPair('RS256');const jwk=await exportJWK(publicKey);jwk.kid='test-key';const keys=createLocalJWKSet({keys:[jwk]});
const client='test.apps.googleusercontent.com',origin='https://pricing.test';
const req=(path,body,cookie='',source=origin)=>new Request(origin+path,{method:'POST',headers:{Origin:source,Cookie:cookie,'Content-Type':'application/json'},body:body===undefined?undefined:JSON.stringify(body)});
const verify=(token,id,nonce)=>verifyGoogleCredential(token,id,nonce,keys);
const challenge=async()=>{const r=await googleAuthRequest(req('/api/auth/google/challenge'),()=>db,client,verify);assert.equal(r.status,200);return {nonce:(await r.json()).nonce,cookie:r.headers.getSetCookie()[0].split(';')[0]};};
const token=(nonce,extra={},aud=client)=>new SignJWT({email:'test@example.invalid',email_verified:true,name:'Test User',nonce,...extra}).setProtectedHeader({alg:'RS256',kid:'test-key'}).setSubject('user-123').setIssuedAt().setIssuer('https://accounts.google.com').setAudience(aud).setExpirationTime('5m').sign(privateKey);
try{
 assert.equal((await googleAuthRequest(req('/api/auth/google/challenge',undefined,'','https://evil.test'),()=>db,client,verify)).status,403);
 const c=await challenge();const valid=await token(c.nonce);
 assert.equal((await googleAuthRequest(req('/api/auth/google',{credential:valid}),()=>db,client,verify)).status,401);
 assert.equal((await googleAuthRequest(req('/api/auth/google',{credential:await token('wrong')},c.cookie),()=>db,client,verify)).status,401);
 assert.equal((await googleAuthRequest(req('/api/auth/google',{credential:await token(c.nonce,{},'wrong-audience')},c.cookie),()=>db,client,verify)).status,401);
 await assert.rejects(verify(await token(c.nonce,{email_verified:false}),client,c.nonce));
 const expired=await new SignJWT({email:'test@example.invalid',email_verified:true,nonce:c.nonce}).setProtectedHeader({alg:'RS256',kid:'test-key'}).setSubject('x').setIssuedAt().setIssuer('https://accounts.google.com').setAudience(client).setExpirationTime(Math.floor(Date.now()/1000)-60).sign(privateKey);await assert.rejects(verify(expired,client,c.nonce));
 const impostor=await generateKeyPair('RS256');const forged=await new SignJWT({nonce:c.nonce}).setProtectedHeader({alg:'RS256',kid:'test-key'}).setSubject('x').setIssuedAt().setIssuer('https://accounts.google.com').setAudience(client).setExpirationTime('5m').sign(impostor.privateKey);await assert.rejects(verify(forged,client,c.nonce));
 const login=await googleAuthRequest(req('/api/auth/google',{credential:valid},c.cookie),()=>db,client,verify);assert.equal(login.status,200);
 const sessionHeader=login.headers.getSetCookie().find(x=>x.startsWith('__Host-pricing-session='));assert.match(sessionHeader,/HttpOnly/);assert.match(sessionHeader,/Secure/);assert.match(sessionHeader,/SameSite=Lax/);const cookie=sessionHeader.split(';')[0];
 const current=()=>getGoogleUser(new Request(origin+'/api/account',{headers:{Cookie:cookie}}),()=>db);
 assert.equal((await current()).userId,'google:user-123');
 assert.equal(await getGoogleUser(new Request(origin+'/api/account',{headers:{'oai-authenticated-user-id':'spoof','oai-authenticated-user-email':'spoof@test.invalid'}}),()=>db),null);
 assert.equal((await googleAuthRequest(req('/api/auth/google',{credential:valid},c.cookie),()=>db,client,verify)).status,401);
 const stored=sqlite.prepare('SELECT token_hash FROM google_sessions').get().token_hash;assert.notEqual(stored,cookie.split('=')[1]);assert.equal(stored,await hashToken(cookie.split('=')[1]));
 sqlite.prepare('INSERT INTO estimates (id,owner_id,title,plan_json,created_at) VALUES (?,?,?,?,?)').run('old','legacy-one','旧项目','{}',new Date().toISOString());
 const google=await current(),legacy={userId:'legacy-one',email:'old@example.invalid'};
 assert.equal((await importLegacyRecords(req('/api/account/import'),google,null,db)).status,401);
 assert.equal(sqlite.prepare('SELECT owner_id FROM estimates WHERE id=?').get('old').owner_id,'legacy-one');
 assert.equal((await importLegacyRecords(req('/api/account/import'),google,legacy,db)).status,200);
 assert.equal(sqlite.prepare('SELECT owner_id FROM estimates WHERE id=?').get('old').owner_id,google.userId);
 assert.equal((await importLegacyRecords(req('/api/account/import'),{...google,userId:'google:attacker'},legacy,db)).status,409);
 assert.equal((await importLegacyRecords(req('/api/account/import'),google,legacy,db)).status,200);
 assert.equal((await logoutRequest(req('/api/auth/logout',undefined,cookie),()=>db)).status,200);assert.equal(await current(),null);
 console.log('Passed: signed Google JWT validation, audience/nonce/expiry/signature rejection, CSRF, challenge replay denial, secure hashed sessions, logout and dual-account migration.');
}finally{sqlite.close();}
