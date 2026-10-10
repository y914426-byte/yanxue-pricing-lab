import { env } from 'cloudflare:workers';
import { getDb } from '@/db';
import { getGoogleUser, authReply } from '@/lib/google-auth';
import { priceLibraryRequest } from '@/lib/price-library';
import { checkCalendarUserRole } from '@/lib/calendar-auth';

export const dynamic = 'force-dynamic';

async function handle(request: Request) {
  try {
    const db = getDb();
    const user = await getGoogleUser(request, getDb);
    let adminEmails = (env as unknown as Record<string, unknown>).PRICE_ADMIN_EMAILS as string | undefined;

    if (user?.email) {
      const roleInfo = await checkCalendarUserRole(db, user.email);
      if (roleInfo.isAdmin) {
        adminEmails = adminEmails ? `${adminEmails},${user.email}` : user.email;
      }
    }

    return await priceLibraryRequest(request, user, getDb, adminEmails);
  } catch {
    return authReply({ error: '价格库暂不可用，请稍后重试' }, 503);
  }
}
export const GET=handle;
export const POST=handle;
export const PATCH=handle;
