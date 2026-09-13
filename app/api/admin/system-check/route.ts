import { env } from 'cloudflare:workers';
import { getDb } from '@/db';
import { getGoogleUser, authReply } from '@/lib/google-auth';
import { isPriceAdmin } from '@/lib/price-library';
import { systemCheckRequest } from '@/lib/system-check-service';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const user = await getGoogleUser(request, getDb);
    return systemCheckRequest(request, user, {
      env: {
        DB: env.DB,
        GOOGLE_CLIENT_ID: env.GOOGLE_CLIENT_ID,
        PRICE_ADMIN_EMAILS: env.PRICE_ADMIN_EMAILS,
        OPENAI_API_KEY: env.OPENAI_API_KEY,
        AI_ANALYSIS_MODEL: env.AI_ANALYSIS_MODEL,
        OPENAI_API_BASE: env.OPENAI_API_BASE,
      },
      isAdmin: (current) => isPriceAdmin(current, env.PRICE_ADMIN_EMAILS),
    });
  } catch {
    return authReply({ error: '系统检查暂不可用，请稍后重试' }, 503);
  }
}
