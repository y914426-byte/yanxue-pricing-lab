import { env } from 'cloudflare:workers';
import { getDb } from '@/db';
import { getGoogleUser, authReply } from '@/lib/google-auth';
import { activitySemanticRequest } from '@/lib/activity-semantic-service';
import { DEFAULT_AI_ANALYSIS_MODEL, DEFAULT_OPENAI_API_BASE } from '@/lib/scheme-analyzer';

export const dynamic = 'force-dynamic';

async function handle(request: Request) {
  try {
    const user = await getGoogleUser(request, getDb);
    return await activitySemanticRequest(request, user?.userId ?? null, getDb, {
      apiKey: env.OPENAI_API_KEY,
      model: env.AI_ANALYSIS_MODEL?.trim() || DEFAULT_AI_ANALYSIS_MODEL,
      baseUrl: env.OPENAI_API_BASE?.trim() || DEFAULT_OPENAI_API_BASE,
    });
  } catch {
    return authReply({ error: '活动语义服务暂不可用，请稍后重试' }, 503);
  }
}

export { handle as GET, handle as POST };
