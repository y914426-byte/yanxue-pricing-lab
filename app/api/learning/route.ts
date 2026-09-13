import { getDb } from '@/db';
import { getGoogleUser, authReply } from '@/lib/google-auth';
import { schemeLearningRequest } from '@/lib/scheme-learning-service';

export const dynamic = 'force-dynamic';

async function handle(request: Request) {
  try {
    const user = await getGoogleUser(request, getDb);
    return await schemeLearningRequest(request, user?.userId ?? null, getDb);
  } catch {
    return authReply({ error: '知识库服务暂不可用，请稍后重试' }, 503);
  }
}

export { handle as GET, handle as POST };

