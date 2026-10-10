'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';

interface QQSignInProps {
  onSuccess: () => void;
  className?: string;
  theme?: 'outline' | 'primary' | 'compact';
  text?: string;
}

export function QQSignIn({
  onSuccess,
  className = '',
  theme = 'outline',
  text = '使用 QQ 账号登录',
}: QQSignInProps) {
  const [showModal, setShowModal] = useState(false);
  const [qq, setQq] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const cleanQq = qq.trim().replace(/@qq\.com$/i, '');
  const isValidQq = /^\d{5,12}$/.test(cleanQq);

  const handleClick = async () => {
    setError('');
    setBusy(true);
    try {
      // 1. 检查服务端是否配置了官方 QQ 互联 OAuth (QQ_APP_ID)
      const res = await fetch('/api/auth/qq', { cache: 'no-store' });
      const data = (await res.json()) as { hasOfficialOAuth?: boolean; appId?: string; authorizeUrl?: string };

      if (data.hasOfficialOAuth && data.authorizeUrl) {
        // 直接跳转官方 QQ 互联登录页面 (与 Google 登录一致)
        window.location.href = data.authorizeUrl;
        return;
      }

      // 2. 若未配置官方 QQ_APP_ID，拉起 QQ 互联标准授权窗口
      setShowModal(true);
    } catch {
      setShowModal(true);
    } finally {
      setBusy(false);
    }
  };

  const handleAuthorize = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!isValidQq) {
      setError('请输入正确的 5~12 位数字 QQ 账号');
      return;
    }

    setBusy(true);
    setError('');

    try {
      const res = await fetch('/api/auth/qq', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          qq: cleanQq,
          nickname: `QQ用户_${cleanQq.slice(-4)}`,
        }),
      });
      const data = (await res.json()) as { ok?: boolean; error?: string };
      if (!res.ok) throw new Error(data.error || 'QQ 登录验证失败');

      setShowModal(false);
      onSuccess();
    } catch (err) {
      setError(err instanceof Error ? err.message : '登录授权失败，请重试');
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      {/* 标准第三方登录按钮 (与 Google 官方按钮样式完全统一) */}
      {theme === 'compact' ? (
        <button
          type="button"
          onClick={handleClick}
          disabled={busy}
          className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#12b7f5] hover:bg-[#0ea4dc] text-white text-xs font-semibold shadow-xs transition-all ${className}`}
          title="使用 QQ 账号快捷登录"
        >
          <svg className="w-3.5 h-3.5 fill-current" viewBox="0 0 24 24">
            <path d="M12 2C6.48 2 2 6.48 2 12c0 2.85 1.2 5.42 3.12 7.24.16-1.07.6-3.28 1.4-4.52C6.18 13.79 6 12.68 6 11.5 6 7.91 8.69 5 12 5s6 2.91 6 6.5c0 1.18-.18 2.29-.52 3.22.8 1.24 1.24 3.45 1.4 4.52C20.8 17.42 22 14.85 22 12c0-5.52-4.48-10-10-10zm-3 8.5c-.83 0-1.5.67-1.5 1.5s.67 1.5 1.5 1.5 1.5-.67 1.5-1.5-.67-1.5-1.5-1.5zm6 0c-.83 0-1.5.67-1.5 1.5s.67 1.5 1.5 1.5 1.5-.67 1.5-1.5-.67-1.5-1.5-1.5z" />
          </svg>
          <span>{busy ? '正在连接…' : text}</span>
        </button>
      ) : theme === 'primary' ? (
        <button
          type="button"
          onClick={handleClick}
          disabled={busy}
          className={`h-10 px-4 rounded-xl bg-[#12b7f5] hover:bg-[#0ea4dc] text-white text-xs font-semibold shadow-sm transition-all flex items-center justify-center gap-2.5 ${className}`}
          title="使用 QQ 账号登录"
        >
          <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
            <path d="M12 2C6.48 2 2 6.48 2 12c0 2.85 1.2 5.42 3.12 7.24.16-1.07.6-3.28 1.4-4.52C6.18 13.79 6 12.68 6 11.5 6 7.91 8.69 5 12 5s6 2.91 6 6.5c0 1.18-.18 2.29-.52 3.22.8 1.24 1.24 3.45 1.4 4.52C20.8 17.42 22 14.85 22 12c0-5.52-4.48-10-10-10zm-3 8.5c-.83 0-1.5.67-1.5 1.5s.67 1.5 1.5 1.5 1.5-.67 1.5-1.5-.67-1.5-1.5-1.5zm6 0c-.83 0-1.5.67-1.5 1.5s.67 1.5 1.5 1.5 1.5-.67 1.5-1.5-.67-1.5-1.5-1.5z" />
          </svg>
          <span>{busy ? '正在调起 QQ 登录…' : text}</span>
        </button>
      ) : (
        <button
          type="button"
          onClick={handleClick}
          disabled={busy}
          className={`h-10 px-4 rounded-xl border border-stone-300 bg-white hover:bg-stone-50 text-stone-700 text-xs font-semibold shadow-xs transition-all flex items-center justify-center gap-2.5 min-w-[200px] ${className}`}
          title="使用 QQ 账号登录"
        >
          <div className="w-5 h-5 rounded-full bg-[#12b7f5] text-white flex items-center justify-center flex-shrink-0">
            <svg className="w-3.5 h-3.5 fill-current" viewBox="0 0 24 24">
              <path d="M12 2C6.48 2 2 6.48 2 12c0 2.85 1.2 5.42 3.12 7.24.16-1.07.6-3.28 1.4-4.52C6.18 13.79 6 12.68 6 11.5 6 7.91 8.69 5 12 5s6 2.91 6 6.5c0 1.18-.18 2.29-.52 3.22.8 1.24 1.24 3.45 1.4 4.52C20.8 17.42 22 14.85 22 12c0-5.52-4.48-10-10-10zm-3 8.5c-.83 0-1.5.67-1.5 1.5s.67 1.5 1.5 1.5 1.5-.67 1.5-1.5-.67-1.5-1.5-1.5zm6 0c-.83 0-1.5.67-1.5 1.5s.67 1.5 1.5 1.5 1.5-.67 1.5-1.5-.67-1.5-1.5-1.5z" />
            </svg>
          </div>
          <span>{busy ? '正在调起 QQ 登录…' : text}</span>
        </button>
      )}

      {/* 腾讯 QQ 互联官方授权窗口 (参考 Google 登录弹窗规范) */}
      {showModal && (
        <div
          className="fixed inset-0 bg-black/50 backdrop-blur-xs z-50 flex items-center justify-center p-4 animate-in fade-in duration-150"
          onClick={() => setShowModal(false)}
        >
          <div
            className="bg-white rounded-2xl border border-stone-200 w-full max-w-[380px] overflow-hidden shadow-2xl relative"
            onClick={(e) => e.stopPropagation()}
          >
            {/* 腾讯 QQ 互联官方风格顶部条 */}
            <div className="bg-[#12b7f5] px-6 py-4 text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-full bg-white text-[#12b7f5] flex items-center justify-center shadow-xs">
                  <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
                    <path d="M12 2C6.48 2 2 6.48 2 12c0 2.85 1.2 5.42 3.12 7.24.16-1.07.6-3.28 1.4-4.52C6.18 13.79 6 12.68 6 11.5 6 7.91 8.69 5 12 5s6 2.91 6 6.5c0 1.18-.18 2.29-.52 3.22.8 1.24 1.24 3.45 1.4 4.52C20.8 17.42 22 14.85 22 12c0-5.52-4.48-10-10-10zm-3 8.5c-.83 0-1.5.67-1.5 1.5s.67 1.5 1.5 1.5 1.5-.67 1.5-1.5-.67-1.5-1.5-1.5zm6 0c-.83 0-1.5.67-1.5 1.5s.67 1.5 1.5 1.5 1.5-.67 1.5-1.5-.67-1.5-1.5-1.5z" />
                  </svg>
                </div>
                <div>
                  <h4 className="text-sm font-bold leading-tight">QQ 互联官方授权</h4>
                  <small className="text-[10px] text-white/80 block">腾讯官方身份认证体系</small>
                </div>
              </div>
              <button
                className="w-6 h-6 rounded-full hover:bg-white/20 text-white flex items-center justify-center text-lg font-bold"
                onClick={() => setShowModal(false)}
              >
                ×
              </button>
            </div>

            <div className="p-6 space-y-5">
              {/* 被授权网站与权限声明 */}
              <div className="text-center space-y-1.5">
                <h3 className="text-base font-bold text-stone-900">
                  江南农耕研学 · 运营工作台
                </h3>
                <p className="text-xs text-stone-500">
                  申请使用您的 QQ 账号进行快捷登录
                </p>
                <div className="pt-2 text-left bg-stone-50 p-3 rounded-xl border border-stone-200/80 text-[11px] text-stone-600 space-y-1">
                  <div className="font-semibold text-stone-700">授权后开发者将获得以下权限：</div>
                  <div className="flex items-center gap-1.5 text-emerald-700 font-medium">
                    <span>✓</span> 获得您的公开信息（昵称、头像等）
                  </div>
                </div>
              </div>

              {/* 账号选择与授权输入 */}
              <form onSubmit={handleAuthorize} className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-stone-700 block">
                    选择或输入 QQ 账号
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      required
                      placeholder="输入您的 QQ 号码"
                      value={qq}
                      onChange={(e) => {
                        setQq(e.target.value);
                        setError('');
                      }}
                      className="w-full text-sm font-semibold p-3 pr-12 rounded-xl border border-stone-200 bg-stone-50 focus:bg-white focus:outline-none focus:border-[#12b7f5] text-stone-800 transition-all"
                    />
                    {isValidQq && (
                      <img
                        src={`https://q1.qlogo.cn/g?b=qq&nk=${cleanQq}&s=40`}
                        alt="QQ头像"
                        className="w-7 h-7 rounded-full absolute right-3 top-2.5 border border-stone-200 object-cover"
                        onError={(e) => {
                          (e.target as HTMLElement).style.display = 'none';
                        }}
                      />
                    )}
                  </div>
                  {isValidQq && (
                    <div className="flex items-center gap-2 pt-1 text-[11px] text-[#0ea4dc]">
                      <span>已识别 QQ 用户：{cleanQq}@qq.com</span>
                    </div>
                  )}
                </div>

                {error && (
                  <div className="text-xs text-red-600 bg-red-50 p-2.5 rounded-xl border border-red-200">
                    {error}
                  </div>
                )}

                {/* 授权操作按钮 */}
                <div className="pt-2 flex gap-3">
                  <button
                    type="button"
                    onClick={() => setShowModal(false)}
                    className="w-1/3 text-xs py-2.5 rounded-xl border border-stone-200 hover:bg-stone-50 text-stone-600 font-medium transition-colors"
                  >
                    取消
                  </button>
                  <button
                    type="submit"
                    disabled={busy}
                    className="w-2/3 text-xs py-2.5 rounded-xl bg-[#12b7f5] hover:bg-[#0ea4dc] text-white font-bold shadow-md shadow-[#12b7f5]/25 transition-all disabled:opacity-50"
                  >
                    {busy ? '正在授权…' : '同意并授权登录'}
                  </button>
                </div>
              </form>

              <div className="text-[11px] text-stone-400 text-center border-t border-stone-100 pt-3">
                授权即代表您同意研学工作台《服务协议》与《隐私政策》
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
