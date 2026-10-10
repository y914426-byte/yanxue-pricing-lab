import { env } from 'cloudflare:workers';
import { getDb } from '@/db';
import { 
  authReply, 
  randomToken, 
  hashToken, 
  readCookie, 
  authCookie, 
} from '@/lib/google-auth';
import { ensurePermissionsSchema, isRootAdminEmail, checkCalendarUserRole } from '@/lib/calendar-auth';

export type QQUser = {
  userId: string;
  qqNumber?: string;
  displayName: string;
  email: string;
  department?: string;
  avatarUrl?: string;
};

/**
 * 为 QQ 注册/登录用户创建系统 Session 并记录到团队名录
 */
export async function createQQSession(
  request: Request,
  user: QQUser
): Promise<Response> {
  const db = getDb();
  await ensurePermissionsSchema(db);

  const now = Date.now();
  const nowIso = new Date(now).toISOString();
  const token = randomToken();
  const old = readCookie(request, 'session');

  // 判断是否为主管理员
  const isAdmin = isRootAdminEmail(user.email);
  const role = isAdmin ? 'admin' : 'editor';
  const department = user.department || (isAdmin ? '研学运营管理' : '带队研学导师');
  const qqNum = user.qqNumber || (user.email.endsWith('@qq.com') ? user.email.split('@')[0] : '');

  const statements = [
    // 1. 记录或更新登录会话
    db
      .prepare(
        'INSERT INTO google_sessions (token_hash, owner_id, display_name, email, expires_at) VALUES (?, ?, ?, ?, ?)'
      )
      .bind(
        await hashToken(token),
        user.userId,
        user.displayName,
        user.email,
        now + 604800000 // 7天有效
      ),
    // 2. 清理过期会话
    db
      .prepare(
        'DELETE FROM google_sessions WHERE token_hash IN (SELECT token_hash FROM google_sessions WHERE expires_at <= ? LIMIT 1000)'
      )
      .bind(now),
    // 3. 登记入团队注册名册表 (新成员注册 / 老成员更新活跃时间)
    db
      .prepare(`
        INSERT INTO team_registered_users (email, qq_number, display_name, role, department, avatar_url, created_at, last_login_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(email) DO UPDATE SET
          display_name = excluded.display_name,
          department = excluded.department,
          avatar_url = excluded.avatar_url,
          last_login_at = excluded.last_login_at
      `)
      .bind(
        user.email,
        qqNum,
        user.displayName,
        role,
        department,
        user.avatarUrl || (qqNum ? `https://q1.qlogo.cn/g?b=qq&nk=${qqNum}&s=100` : undefined),
        nowIso,
        nowIso
      ),
  ];

  if (old) {
    statements.push(
      db
        .prepare('DELETE FROM google_sessions WHERE token_hash = ?')
        .bind(await hashToken(old))
    );
  }

  await db.batch(statements);

  // 获取真实权限角色
  const roleInfo = await checkCalendarUserRole(db, user.email);

  const response = authReply({
    ok: true,
    user: {
      displayName: user.displayName,
      email: user.email,
      provider: 'qq',
      avatarUrl: user.avatarUrl || `https://q1.qlogo.cn/g?b=qq&nk=${user.qqNumber}&s=100`,
      role: roleInfo.role,
      isAdmin: roleInfo.isAdmin,
      canEdit: roleInfo.canEdit,
    },
  });

  // 写入 Session Cookie
  response.headers.append('Set-Cookie', authCookie(request, 'session', token, 604800));
  return response;
}

/**
 * 校验 QQ 号并规范化用户资料 (支持 5~12 位数字 QQ 号或直接 QQ 邮箱)
 */
export function normalizeQQAccount(
  qqInput: string,
  customNick?: string,
  department?: string
): QQUser {
  const cleaned = qqInput.trim().replace(/@qq\.com$/i, '');
  if (!/^\d{5,12}$/.test(cleaned)) {
    throw new Error('请输入正确的 5~12 位数字 QQ 号码');
  }
  const email = `${cleaned}@qq.com`;
  const displayName = customNick?.trim() ? customNick.trim() : `导师_${cleaned.slice(-4)}`;
  const avatarUrl = `https://q1.qlogo.cn/g?b=qq&nk=${cleaned}&s=100`;

  return {
    userId: `qq:${cleaned}`,
    qqNumber: cleaned,
    displayName,
    email,
    department: department?.trim() || '带队导师',
    avatarUrl,
  };
}
