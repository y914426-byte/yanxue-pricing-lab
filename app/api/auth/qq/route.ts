import { env } from 'cloudflare:workers';
import { authReply, sameOrigin } from '@/lib/google-auth';
import { createQQSession, normalizeQQAccount } from '@/lib/qq-auth';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get('code');
  const redirectTarget = url.searchParams.get('redirect') || '/';

  // 1. 如果有官方 QQ OAuth 回调 code，且配置了 QQ_APP_ID / QQ_APP_KEY
  const qqAppId = (env as Record<string, unknown>).QQ_APP_ID;
  const qqAppKey = (env as Record<string, unknown>).QQ_APP_KEY;

  if (code && typeof qqAppId === 'string' && typeof qqAppKey === 'string') {
    try {
      const redirectUri = `${url.origin}/api/auth/qq`;
      // 获取 access_token
      const tokenUrl = `https://graph.qq.com/oauth2.0/token?grant_type=authorization_code&client_id=${qqAppId}&client_secret=${qqAppKey}&code=${code}&redirect_uri=${encodeURIComponent(redirectUri)}&fmt=json`;
      const tokenRes = await fetch(tokenUrl);
      const tokenData = (await tokenRes.json()) as { access_token?: string };

      if (!tokenData.access_token) {
        return Response.redirect(`${url.origin}/?auth_error=${encodeURIComponent('获取 QQ 授权令牌失败')}`, 302);
      }

      // 获取 openid
      const openIdRes = await fetch(`https://graph.qq.com/oauth2.0/me?access_token=${tokenData.access_token}&fmt=json`);
      const openIdData = (await openIdRes.json()) as { openid?: string };

      if (!openIdData.openid) {
        return Response.redirect(`${url.origin}/?auth_error=${encodeURIComponent('获取 QQ 用户标识失败')}`, 302);
      }

      // 获取用户资料
      const userRes = await fetch(`https://graph.qq.com/user/get_user_info?access_token=${tokenData.access_token}&oauth_consumer_key=${qqAppId}&openid=${openIdData.openid}`);
      const userData = (await userRes.json()) as { nickname?: string; figureurl_qq_1?: string };

      const qqUser = {
        userId: `qq:${openIdData.openid}`,
        displayName: userData.nickname || `QQ用户_${openIdData.openid.slice(-4)}`,
        email: `${openIdData.openid.slice(0, 10)}@qq.com`,
        avatarUrl: userData.figureurl_qq_1,
      };

      const sessionResponse = await createQQSession(request, qqUser);
      // 将 session cookie 附带在重定向响应上
      const setCookie = sessionResponse.headers.get('Set-Cookie');
      const response = Response.redirect(`${url.origin}${redirectTarget}`, 302);
      if (setCookie) {
        response.headers.set('Set-Cookie', setCookie);
      }
      return response;
    } catch (e) {
      return Response.redirect(`${url.origin}/?auth_error=${encodeURIComponent('QQ 登录处理失败，请重试')}`, 302);
    }
  }

  // 返回当前的配置情况
  return authReply({
    hasOfficialOAuth: !!(qqAppId && qqAppKey),
    appId: typeof qqAppId === 'string' ? qqAppId : null,
  });
}

export async function POST(request: Request) {
  if (!sameOrigin(request)) {
    return authReply({ error: '请求来源无效' }, 403);
  }

  try {
    if (!request.headers.get('content-type')?.startsWith('application/json')) {
      return authReply({ error: '请求格式无效' }, 415);
    }

    const body = (await request.json()) as Record<string, unknown>;
    const qqNumber = String(body.qq ?? '').trim();
    const nickname = String(body.nickname ?? '').trim();

    if (!qqNumber) {
      return authReply({ error: '请输入 QQ 账号' }, 400);
    }

    const user = normalizeQQAccount(qqNumber, nickname);
    return await createQQSession(request, user);
  } catch (error) {
    return authReply(
      { error: error instanceof Error ? error.message : 'QQ 登录验证失败' },
      400
    );
  }
}
