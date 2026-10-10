import { env } from 'cloudflare:workers';
import { getDb } from '@/db';
import { 
  authReply, 
  randomToken, 
  hashToken, 
  readCookie, 
  authCookie, 
  sameOrigin 
} from '@/lib/google-auth';

export type QQUser = {
  userId: string;
  displayName: string;
  email: string;
  avatarUrl?: string;
};

/**
 * 为 QQ 用户创建系统 Session 并返回响应
 */
export async function createQQSession(
  request: Request,
  user: QQUser
): Promise<Response> {
  const db = getDb();
  const now = Date.now();
  const token = randomToken();
  const old = readCookie(request, 'session');

  const statements = [
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
    db
      .prepare(
        'DELETE FROM google_sessions WHERE token_hash IN (SELECT token_hash FROM google_sessions WHERE expires_at <= ? LIMIT 1000)'
      )
      .bind(now),
  ];

  if (old) {
    statements.push(
      db
        .prepare('DELETE FROM google_sessions WHERE token_hash = ?')
        .bind(await hashToken(old))
    );
  }

  await db.batch(statements);

  const response = authReply({
    ok: true,
    user: {
      displayName: user.displayName,
      email: user.email,
      provider: 'qq',
    },
  });

  // 写入 Session Cookie
  response.headers.append('Set-Cookie', authCookie(request, 'session', token, 604800));
  return response;
}

/**
 * 校验 QQ 号并规范化用户资料
 */
export function normalizeQQAccount(qqInput: string, customNick?: string): QQUser {
  const cleaned = qqInput.trim().replace(/@qq\.com$/i, '');
  if (!/^\d{5,12}$/.test(cleaned)) {
    throw new Error('请输入正确的 5~12 位 QQ 号码');
  }
  const email = `${cleaned}@qq.com`;
  const displayName = customNick?.trim() ? customNick.trim() : `QQ用户_${cleaned.slice(-4)}`;
  const avatarUrl = `https://q1.qlogo.cn/g?b=qq&nk=${cleaned}&s=100`;

  return {
    userId: `qq:${cleaned}`,
    displayName,
    email,
    avatarUrl,
  };
}
