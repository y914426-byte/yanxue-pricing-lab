/**
 * 研学活动日历与复盘共享权限判定工具（兼容客户端与服务端）
 * 不引入任何服务端专用运行时依赖（如 cloudflare:workers），确保客户端安全打包。
 */

/**
 * 校验是否为主管理员邮箱（支持 QQ 邮箱与 Google 邮箱）
 */
export function isRootAdminEmail(email?: string | null): boolean {
  if (!email) return false;
  const normalized = email.trim().toLowerCase();

  // 默认主管理员账号（无论使用 Google 还是 QQ 登录）
  if (
    normalized === 'y914426@gmail.com' ||
    normalized === 'y914426@qq.com'
  ) {
    return true;
  }

  // 客户端公开环境变量支持
  if (typeof process !== 'undefined' && process.env?.NEXT_PUBLIC_ADMIN_EMAILS) {
    const list = process.env.NEXT_PUBLIC_ADMIN_EMAILS.toLowerCase().split(',').map((s) => s.trim());
    if (list.includes(normalized)) return true;
  }

  return false;
}

/**
 * 校验用户是否拥有上传/删除活动照片的权限（严格限制仅主管理员本人拥有）
 */
export function canUploadActivityPhotos(userEmail?: string | null): boolean {
  return isRootAdminEmail(userEmail);
}

/**
 * 校验用户是否拥有填写复盘或发表优化讨论的权限（团队成员与管理员均可）
 */
export function canParticipateInReview(userEmail?: string | null): boolean {
  if (!userEmail) return false;
  return Boolean(userEmail.trim().includes('@'));
}
