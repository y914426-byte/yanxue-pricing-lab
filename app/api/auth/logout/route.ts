import {getDb} from '@/db';
import {logoutRequest} from '@/lib/google-auth';
export const dynamic='force-dynamic';
export async function POST(request:Request){return logoutRequest(request,getDb);}
