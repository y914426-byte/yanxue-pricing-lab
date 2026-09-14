import { getDb } from '@/db';
import { getGoogleUser, authReply } from '@/lib/google-auth';
import { schemeSimilarityRequest } from '@/lib/scheme-similarity-service';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const user = await getGoogleUser(request, getDb);
    return await schemeSimilarityRequest(request, user?.userId ?? null, getDb);
  } catch {
    return authReply({ error: '历史相似方案服务暂不可用，请稍后重试' }, 503);
  }
}
