import { getDb } from '@/db';
import { authReply, getGoogleUser, sameOrigin } from '@/lib/google-auth';
import {
  checkCalendarUserRole,
  ensurePermissionsSchema,
  type AuthorizedUser,
} from '@/lib/calendar-auth';

export const dynamic = 'force-dynamic';

async function handle(request: Request) {
  try {
    const db = getDb();
    await ensurePermissionsSchema(db);
    const user = await getGoogleUser(request, getDb);
    const roleInfo = await checkCalendarUserRole(db, user?.email);

    const method = request.method.toUpperCase();

    // GET: 获取所有被授权的协作者列表
    if (method === 'GET') {
      const rows = await db
        .prepare('SELECT email, role, display_name, added_by, created_at FROM calendar_authorized_users ORDER BY created_at DESC')
        .all<AuthorizedUser>();

      return authReply({
        users: rows.results ?? [],
        currentUserRole: roleInfo,
      });
    }

    if (!sameOrigin(request)) {
      return authReply({ error: '请求来源无效' }, 403);
    }

    // 只有具有 isAdmin 权限的管理员才能添加或删除协作者
    if (!roleInfo.isAdmin) {
      return authReply({ error: '只有系统管理员才有权限管理其他协作者' }, 403);
    }

    // POST: 添加或修改协作者权限
    if (method === 'POST') {
      if (!request.headers.get('content-type')?.startsWith('application/json')) {
        return authReply({ error: '请求格式无效' }, 415);
      }
      const body = (await request.json()) as Record<string, unknown>;
      const targetEmail = String(body.email ?? '').trim().toLowerCase();
      const targetRole = String(body.role ?? 'editor').toLowerCase();
      const displayName = String(body.display_name ?? '').trim();

      if (!targetEmail || !targetEmail.includes('@')) {
        return authReply({ error: '请输入有效的邮箱地址' }, 400);
      }
      if (!['admin', 'editor', 'viewer'].includes(targetRole)) {
        return authReply({ error: '权限角色无效，可选 admin / editor / viewer' }, 400);
      }

      const now = new Date().toISOString();
      await db
        .prepare(
          `INSERT INTO calendar_authorized_users (email, role, display_name, added_by, created_at)
           VALUES (?, ?, ?, ?, ?)
           ON CONFLICT(email) DO UPDATE SET
             role = excluded.role,
             display_name = excluded.display_name,
             added_by = excluded.added_by`
        )
        .bind(targetEmail, targetRole, displayName, user?.email || 'admin', now)
        .run();

      return authReply({ ok: true, email: targetEmail, role: targetRole });
    }

    // DELETE: 移除协作者权限
    if (method === 'DELETE') {
      const url = new URL(request.url);
      const email = url.searchParams.get('email')?.trim().toLowerCase();
      if (!email) {
        return authReply({ error: '缺少邮箱参数' }, 400);
      }

      await db
        .prepare('DELETE FROM calendar_authorized_users WHERE LOWER(email) = ?')
        .bind(email)
        .run();

      return authReply({ ok: true });
    }

    return authReply({ error: '不支持的请求方法' }, 405);
  } catch (error) {
    return authReply(
      { error: error instanceof Error ? error.message : '权限管理服务暂不可用' },
      500
    );
  }
}

export { handle as GET, handle as POST, handle as DELETE };
