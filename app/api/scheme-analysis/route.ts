import { getDb } from '@/db';
import { env } from 'cloudflare:workers';
import { getGoogleUser, authReply } from '@/lib/google-auth';
import { schemeAnalysisRequest } from '@/lib/scheme-analysis-service';

export const dynamic = 'force-dynamic';

async function handle(request: Request) {
  try {
    const user = await getGoogleUser(request, getDb);
    return await schemeAnalysisRequest(request, user?.userId ?? null, getDb, {
      apiKey: env.OPENAI_API_KEY,
      model: env.AI_ANALYSIS_MODEL,
      baseUrl: env.OPENAI_API_BASE,
    });
  } catch {
    return authReply({ error: '智能分析服务暂不可用，请稍后重试。' }, 503);
  }
}

export { handle as GET, handle as POST };
