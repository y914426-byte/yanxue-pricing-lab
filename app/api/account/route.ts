import {getChatGPTUser,chatGPTSignInPath,chatGPTSignOutPath} from '@/app/chatgpt-auth';
export const dynamic='force-dynamic';
export async function GET(){const user=await getChatGPTUser();return Response.json({user:user?{displayName:user.displayName}:null,signIn:chatGPTSignInPath('/'),signOut:chatGPTSignOutPath('/')},{headers:{'Cache-Control':'private, no-store','Vary':'Cookie'}});}
