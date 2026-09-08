import {env} from 'cloudflare:workers';
import {getDb} from '@/db';
import {getGoogleUser,authReply} from '@/lib/google-auth';
export const dynamic='force-dynamic';
export async function GET(request:Request){try{const user=await getGoogleUser(request,getDb);return authReply({user:user?{displayName:user.displayName,email:user.email}:null,clientId:env.GOOGLE_CLIENT_ID??null});}catch{return authReply({error:'账号服务暂不可用，请稍后重试'},503);}}
