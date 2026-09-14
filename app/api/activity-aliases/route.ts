import { getDb } from '@/db';
import { getGoogleUser, authReply } from '@/lib/google-auth';
import { activityAliasRequest } from '@/lib/activity-semantic-service';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    const user = await getGoogleUser(request, getDb);
    return await activityAliasRequest(request, user?.userId ?? null, getDb);
  } catch {
    return authReply({ error: '活动标准化服务暂不可用，请稍后重试' }, 503);
  }
}
