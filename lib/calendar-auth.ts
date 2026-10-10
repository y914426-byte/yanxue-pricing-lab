import { env } from 'cloudflare:workers';
import { getDb } from '@/db';

export type UserRole = 'admin' | 'editor' | 'viewer';

export type AuthorizedUser = {
  email: string;
  role: UserRole;
  display_name: string;
  added_by: string;
  created_at: string;
};

export type TeamRegisteredUser = {
  email: string;
  qq_number?: string;
  display_name: string;
  role: UserRole;
  department: string;
  avatar_url?: string;
  created_at: string;
  last_login_at: string;
};

let schemaReady: Promise<void> | undefined;

export async function ensurePermissionsSchema(db: ReturnType<typeof getDb>) {
  if (!schemaReady) {
    schemaReady = (async () => {
      // 1. 协作者与管理员授权表
      await db.prepare(`CREATE TABLE IF NOT EXISTS calendar_authorized_users (
        email TEXT PRIMARY KEY NOT NULL,
        role TEXT NOT NULL DEFAULT 'editor',
        display_name TEXT NOT NULL DEFAULT '',
        added_by TEXT NOT NULL DEFAULT '',
        created_at TEXT NOT NULL
      )`).run();

      // 2. 团队注册用户名册表 (支持 QQ 注册与 Google 注册成员)
      await db.prepare(`CREATE TABLE IF NOT EXISTS team_registered_users (
        email TEXT PRIMARY KEY NOT NULL,
        qq_number TEXT,
        display_name TEXT NOT NULL DEFAULT '',
        role TEXT NOT NULL DEFAULT 'editor',
        department TEXT NOT NULL DEFAULT '带队导师',
        avatar_url TEXT,
        created_at TEXT NOT NULL,
        last_login_at TEXT NOT NULL
      )`).run();
    })();
  }
  try {
    await schemaReady;
  } catch (error) {
    schemaReady = undefined;
    throw error;
  }
}

/**
 * 判断是否为主管理员邮箱 (支持 QQ 邮箱与 Google 邮箱)
 */
export function isRootAdminEmail(email?: string | null): boolean {
  if (!email) return false;
  const normalized = email.trim().toLowerCase();
  
  // 检查环境变量配置 (支持逗号分隔多个邮箱)
  const configured = (env as unknown as Record<string, unknown>).CALENDAR_ADMIN_EMAIL;
  if (typeof configured === 'string') {
    const list = configured.toLowerCase().split(',').map((s) => s.trim());
    if (list.includes(normalized)) return true;
  }

  // 兼顾默认管理员账号 (无论使用 Google 还是 QQ 登录)
  if (
    normalized === 'y914426@gmail.com' || 
    normalized === 'y914426@qq.com'
  ) {
    return true;
  }

  return false;
}

/**
 * 校验当前用户在研学系统中的角色与权限
 */
export async function checkCalendarUserRole(
  db: ReturnType<typeof getDb>,
  userEmail?: string | null
): Promise<{ canEdit: boolean; isAdmin: boolean; role: UserRole }> {
  if (!userEmail) {
    return { canEdit: false, isAdmin: false, role: 'viewer' };
  }
  const email = userEmail.trim().toLowerCase();

  // 1. 检查是否为主管理员
  if (isRootAdminEmail(email)) {
    return { canEdit: true, isAdmin: true, role: 'admin' };
  }

  // 2. 检查数据库已授权用户表
  await ensurePermissionsSchema(db);
  const row = await db
    .prepare('SELECT role FROM calendar_authorized_users WHERE LOWER(email) = ?')
    .bind(email)
    .first<{ role: string }>();

  if (row) {
    const role = (row.role || 'editor') as UserRole;
    return {
      canEdit: role === 'admin' || role === 'editor',
      isAdmin: role === 'admin',
      role,
    };
  }

  return { canEdit: false, isAdmin: false, role: 'viewer' };
}
