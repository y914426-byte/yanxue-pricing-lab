import { env } from 'cloudflare:workers';
import { getDb } from '@/db';
import { getGoogleUser, authReply } from '@/lib/google-auth';
import { checkCalendarUserRole } from '@/lib/calendar-auth';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const user = await getGoogleUser(request, getDb);
    if (!user) {
      return authReply({
        user: null,
        clientId: (env as unknown as Record<string, unknown>).GOOGLE_CLIENT_ID ?? null,
      });
    }

    const db = getDb();
    const roleInfo = await checkCalendarUserRole(db, user.email);

    // 计算头像与类型
    let avatarUrl: string | undefined;
    const isQQ = user.email.toLowerCase().endsWith('@qq.com');
    if (isQQ) {
      const qqNum = user.email.split('@')[0];
      avatarUrl = `https://q1.qlogo.cn/g?b=qq&nk=${qqNum}&s=100`;
    }

    return authReply({
      user: {
        displayName: user.displayName,
        email: user.email,
        isQQ,
        avatarUrl,
        role: roleInfo.role,
        isAdmin: roleInfo.isAdmin,
        canEdit: roleInfo.canEdit,
      },
      clientId: (env as unknown as Record<string, unknown>).GOOGLE_CLIENT_ID ?? null,
    });
  } catch {
    return authReply({ error: '账号服务暂不可用，请稍后重试' }, 503);
  }
}
