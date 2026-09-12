'use client';
import { useCallback, useEffect, useState } from 'react';
import { GoogleSignIn } from '@/components/google-sign-in';
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
  return (
    <section className="panel scheme-panel">
      <h2>登录账号</h2>
      {error ? (
        <p role="alert">
          {error} <Button onClick={refresh}>重试</Button>
        </p>
      ) : !account ? (
        <p>正在读取账号…</p>
      ) : account.user ? (
        <p>{account.user.email}</p>
      ) : (
        <>
          <p>无需登录即可上传预览；保存和查看我的方案需要 Google 登录。</p>
          {account.clientId ? (
            <GoogleSignIn
              clientId={account.clientId}
              onSuccess={() => void refresh()}
            />
          ) : (
            <p>Google 登录暂不可用，请稍后重试。</p>
          )}
        </>
      )}
    </section>
  );
}
