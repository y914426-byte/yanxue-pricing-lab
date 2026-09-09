'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { PriceLibrary } from '@/components/price-library';
import { GoogleSignIn } from '@/components/google-sign-in';
import { Button } from '@/components/ui/button';
import { demo, type Plan } from '@/lib/pricing';
type Account = {
  user: { displayName: string; email: string } | null;
  clientId: string | null;
};
export default function PriceManagement() {
  const [plan, setPlan] = useState<Plan>({ ...demo, priceSource: 'user' }),
    [account, setAccount] = useState<Account | null>(null),
    [error, setError] = useState('');
  async function refresh() {
    try {
      const r = await fetch('/api/account', { cache: 'no-store' }),
        value = (await r.json()) as Account & { error?: string };
      if (!r.ok) throw new Error(value.error);
      setAccount(value);
      setError('');
      window.dispatchEvent(new Event('pricing-account-changed'));
    } catch (e) {
      setError(e instanceof Error ? e.message : '账号读取失败');
    }
  }
  useEffect(() => {
    void Promise.resolve().then(refresh);
  }, []);
  return (
    <main className="workspace price-management">
      <Link href="/" className="price-link">
        ← 返回研学定价台
      </Link>
      <div className="page-title">
        <div>
          <h1>价格库后台</h1>
          <p>导入自己的价格表，或由管理员维护全站系统价格。</p>
        </div>
      </div>
      <section className="panel price-account">
        <h2>登录账号</h2>
        {error ? (
          <p role="alert">
            {error} <Button onClick={refresh}>重试</Button>
          </p>
        ) : !account ? (
          <p>正在读取账号…</p>
        ) : account.user ? (
          <p>
            {account.user.displayName} · {account.user.email}
          </p>
        ) : account.clientId ? (
          <GoogleSignIn
            clientId={account.clientId}
            onSuccess={() => void refresh()}
          />
        ) : (
          <p role="alert">Google 登录暂不可用，请稍后重试。</p>
        )}
      </section>
      {account?.user && (
        <PriceLibrary management plan={plan} onPlan={setPlan} />
      )}
    </main>
  );
}
