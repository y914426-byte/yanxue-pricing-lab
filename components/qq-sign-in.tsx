'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';

interface QQSignInProps {
  onSuccess: () => void;
  className?: string;
}

export function QQSignIn({ onSuccess, className = '' }: QQSignInProps) {
  const [showModal, setShowModal] = useState(false);
  const [qq, setQq] = useState('');
  const [nickname, setNickname] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const handleLogin = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const cleanQq = qq.trim().replace(/@qq\.com$/i, '');
    if (!/^\d{5,12}$/.test(cleanQq)) {
      setError('请输入正确的 5~12 位数字 QQ 账号');
      return;
    }

    setBusy(true);
    setError('');

    try {
      const res = await fetch('/api/auth/qq', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ qq: cleanQq, nickname: nickname.trim() }),
      });
      const data = (await res.json()) as { ok?: boolean; error?: string };
      if (!res.ok) throw new Error(data.error || 'QQ 登录失败');

      setShowModal(false);
      onSuccess();
    } catch (err) {
      setError(err instanceof Error ? err.message : '登录失败，请重试');
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setShowModal(true)}
        className={`inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-[#12b7f5] hover:bg-[#0ea4dc] text-white text-xs font-semibold shadow-sm transition-all ${className}`}
        title="使用 QQ 账号快捷登录"
      >
        <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
          <path d="M12 2C6.48 2 2 6.48 2 12c0 2.85 1.2 5.42 3.12 7.24.16-1.07.6-3.28 1.4-4.52C6.18 13.79 6 12.68 6 11.5 6 7.91 8.69 5 12 5s6 2.91 6 6.5c0 1.18-.18 2.29-.52 3.22.8 1.24 1.24 3.45 1.4 4.52C20.8 17.42 22 14.85 22 12c0-5.52-4.48-10-10-10zm-3 8.5c-.83 0-1.5.67-1.5 1.5s.67 1.5 1.5 1.5 1.5-.67 1.5-1.5-.67-1.5-1.5-1.5zm6 0c-.83 0-1.5.67-1.5 1.5s.67 1.5 1.5 1.5 1.5-.67 1.5-1.5-.67-1.5-1.5-1.5z" />
        </svg>
        <span>QQ 快捷登录</span>
      </button>

      {showModal && (
        <div
          className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          onClick={() => setShowModal(false)}
        >
          <div
            className="bg-white rounded-2xl border border-stone-200 w-full max-w-sm p-6 space-y-5 shadow-2xl relative"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              className="absolute right-4 top-4 text-stone-400 hover:text-stone-700 text-xl font-bold"
              onClick={() => setShowModal(false)}
            >
              ×
            </button>

            <div className="text-center space-y-1">
              <div className="w-12 h-12 rounded-2xl bg-[#12b7f5]/10 text-[#12b7f5] flex items-center justify-center mx-auto text-2xl shadow-sm">
                🐧
              </div>
              <h3 className="text-lg font-serif font-bold text-stone-900">
                QQ 账号快捷登录
              </h3>
              <p className="text-xs text-stone-500">
                输入您的 QQ 账号，快速同步并登录研学运营工作台
              </p>
            </div>

            <form onSubmit={handleLogin} className="space-y-4">
              <div className="space-y-1">
                <label className="text-xs font-bold text-stone-700 block">
                  QQ 号码 / 邮箱
                </label>
                <div className="relative">
                  <input
                    type="text"
                    required
                    placeholder="例如：12345678"
                    value={qq}
                    onChange={(e) => {
                      setQq(e.target.value);
                      setError('');
                    }}
                    className="w-full text-xs p-2.5 rounded-lg border border-stone-200 bg-stone-50 focus:bg-white focus:outline-none focus:border-[#12b7f5]"
                  />
                  {/^\d{5,12}$/.test(qq.trim()) && (
                    <img
                      src={`https://q1.qlogo.cn/g?b=qq&nk=${qq.trim()}&s=40`}
                      alt="QQ头像"
                      className="w-6 h-6 rounded-full absolute right-2.5 top-2 border border-stone-200"
                      onError={(e) => {
                        (e.target as HTMLElement).style.display = 'none';
                      }}
                    />
                  )}
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-stone-700 block">
                  带队称呼 / 昵称（选填）
                </label>
                <input
                  type="text"
                  placeholder="例如：张导师 / 李老师"
                  value={nickname}
                  onChange={(e) => setNickname(e.target.value)}
                  className="w-full text-xs p-2.5 rounded-lg border border-stone-200 bg-stone-50 focus:bg-white focus:outline-none focus:border-[#12b7f5]"
                />
              </div>

              {error && (
                <div className="text-xs text-red-600 bg-red-50 p-2 rounded-lg border border-red-100">
                  {error}
                </div>
              )}

              <div className="pt-2 flex gap-2">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="w-1/3 text-xs py-2 rounded-lg border border-stone-200 hover:bg-stone-50 text-stone-600"
                >
                  取消
                </button>
                <button
                  type="submit"
                  disabled={busy}
                  className="w-2/3 text-xs py-2 rounded-lg bg-[#12b7f5] hover:bg-[#0ea4dc] text-white font-semibold shadow-sm transition-colors disabled:opacity-50"
                >
                  {busy ? '正在登录…' : '立即登录工作台'}
                </button>
              </div>
            </form>

            <div className="text-[11px] text-stone-400 text-center border-t border-stone-100 pt-3">
              登录后将自动关联至您的个人方案库与排期日历
            </div>
          </div>
        </div>
      )}
    </>
  );
}
