import {getDb} from '@/db';
import {estimateRequest} from '@/lib/estimate-service';
import {getGoogleUser,authReply} from '@/lib/google-auth';
export const dynamic='force-dynamic';
async function handle(request:Request){try{const user=await getGoogleUser(request,getDb);return estimateRequest(request,user?.userId??null,getDb);}catch{return authReply({error:'账号服务暂不可用，请稍后重试'},503);}}
export {handle as GET,handle as POST};
