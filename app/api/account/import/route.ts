import {getGoogleUser,authReply} from '@/lib/google-auth';
import {importLegacyRecords} from '@/lib/account-import';
import {getChatGPTUser,chatGPTSignInPath} from '@/app/chatgpt-auth';
import {getDb} from '@/db';
export const dynamic='force-dynamic';
export async function GET(request:Request){try{const google=await getGoogleUser(request,getDb);if(!google)return authReply({error:'请先回到首页使用 Google 登录'},401);const legacy=await getChatGPTUser();const count=legacy?await getDb().prepare('SELECT COUNT(*) AS count FROM estimates WHERE owner_id = ?').bind(legacy.userId).first<{count:number}>():null;return authReply({google:google.email,legacy:legacy?.email??null,count:count?.count??0,verifyLegacy:chatGPTSignInPath('/account/import')});}catch{return authReply({error:'暂时无法查询旧版记录，请稍后重试'},503);}}
export async function POST(request:Request){try{return importLegacyRecords(request,await getGoogleUser(request,getDb),await getChatGPTUser(),getDb());}catch{return authReply({error:'账号验证暂不可用，请重试'},503);}}
