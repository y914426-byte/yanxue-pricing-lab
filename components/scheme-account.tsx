'use client';
import { useCallback, useEffect, useState } from 'react';
import { GoogleSignIn } from '@/components/google-sign-in';
import { QQSignIn } from '@/components/qq-sign-in';
import { Button } from '@/components/ui/button';

export function SchemeAccount({
  onChange,
}: {
  onChange: (loggedIn: boolean) => void;
}) {
  const [account, setAccount] = useState<{
    user: { email: string } | null;
    clientId: string | null;
  } | null>(null);
  const [error, setError] = useState('');

  const refresh = useCallback(async () => {
    try {
      const r = await fetch('/api/account', { cache: 'no-store' }),
        data = (await r.json()) as {
          user: { email: string } | null;
          clientId: string | null;
          error?: string;
        };
      if (!r.ok) throw new Error(data.error || '账号读取失败');
      setAccount(data);
      setError('');
      onChange(!!data.user);
    } catch (e) {
      setAccount(null);
      onChange(false);
      setError(e instanceof Error ? e.message : '账号读取失败');
    }
  }, [onChange]);

  useEffect(() => {
    void Promise.resolve().then(refresh);
  }, [refresh]);

  const signOut = async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    await refresh();
  };

  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-full bg-emerald-100/80 text-emerald-800 flex items-center justify-center font-bold text-sm">
          👤
        </div>
        <div>
          <h3 className="text-xs font-bold text-stone-500 uppercase tracking-wider">
            当前操作账号
          </h3>
          {error ? (
            <p className="text-xs text-red-600 mt-0.5">
              {error} <Button size="sm" variant="outline" className="ml-2 h-6 text-xs" onClick={refresh}>重试</Button>
            </p>
          ) : !account ? (
            <p className="text-xs text-stone-400 mt-0.5">正在读取账号…</p>
          ) : account.user ? (
            <p className="text-xs text-stone-800 mt-0.5 font-medium">
              <strong className="text-stone-900">{account.user.email}</strong>
              <span className="ml-2 text-stone-400">已登录</span>
            </p>
          ) : (
            <p className="text-xs text-stone-500 mt-0.5">
              无需登录即可上传预览教案；保存和查看我的方案支持 Google 或 QQ 账号登录。
            </p>
          )}
        </div>
      </div>

      <div className="flex items-center gap-2.5 flex-wrap">
        {account?.user ? (
          <button
            onClick={signOut}
            className="text-xs px-3 py-1.5 rounded-lg border border-stone-200 bg-white hover:bg-stone-50 text-stone-600 shadow-sm transition-colors"
          >
            退出账号
          </button>
        ) : (
          <div className="flex items-center gap-2 flex-wrap">
            {account?.clientId && (
              <GoogleSignIn
                clientId={account.clientId}
                onSuccess={() => void refresh()}
              />
            )}
            <QQSignIn onSuccess={() => void refresh()} />
          </div>
        )}
      </div>
    </div>
  );
}
