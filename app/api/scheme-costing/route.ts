import { getDb } from '@/db';
import { getGoogleUser, authReply } from '@/lib/google-auth';
import { schemeCostingRequest } from '@/lib/scheme-costing-service';

export const dynamic = 'force-dynamic';

async function handle(request: Request) {
  try {
    const user = await getGoogleUser(request, getDb);
    return await schemeCostingRequest(request, user?.userId ?? null, getDb);
  } catch {
    return authReply({ error: '成本匹配服务暂不可用，请稍后重试' }, 503);
  }
}

export { handle as GET, handle as POST };


