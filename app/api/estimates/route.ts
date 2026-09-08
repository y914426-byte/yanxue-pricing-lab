import {getChatGPTUser} from '@/app/chatgpt-auth';
import {getDb} from '@/db';
import {estimateRequest} from '@/lib/estimate-service';
export const dynamic='force-dynamic';
async function handle(request:Request){const user=await getChatGPTUser();return estimateRequest(request,user?.userId??null,getDb);}
export {handle as GET,handle as POST};
