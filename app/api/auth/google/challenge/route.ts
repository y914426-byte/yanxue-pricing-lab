import {env} from 'cloudflare:workers';
import {getDb} from '@/db';
import {googleAuthRequest} from '@/lib/google-auth';
export const dynamic='force-dynamic';
export async function POST(request:Request){return googleAuthRequest(request,getDb,env.GOOGLE_CLIENT_ID);}
