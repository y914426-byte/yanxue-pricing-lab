import {env} from 'cloudflare:workers';
import {getDb} from '@/db';
import {getGoogleUser,authReply} from '@/lib/google-auth';
import {priceLibraryRequest} from '@/lib/price-library';
export const dynamic='force-dynamic';
async function handle(request:Request){try{return await priceLibraryRequest(request,await getGoogleUser(request,getDb),getDb,env.PRICE_ADMIN_EMAILS);}catch{return authReply({error:'价格库暂不可用，请稍后重试'},503);}}
export const GET=handle;
export const POST=handle;
export const PATCH=handle;
