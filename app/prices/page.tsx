'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { PriceLibrary } from '@/components/price-library';
import { GoogleSignIn } from '@/components/google-sign-in';
import { QQSignIn } from '@/components/qq-sign-in';
import { Button } from '@/components/ui/button';
import { GlobalNav } from '@/components/global-nav';
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
    <div className="min-h-screen bg-[#f8f7f2] flex flex-col">
      <GlobalNav active="prices" />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-8 w-full flex-1">
        <div className="flex flex-col md:flex-row md:items-center justify-between pb-6 mb-6 border-b border-stone-200/80 gap-4">
          <div>
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-emerald-800 mb-1">
              <span>🌾 研学成本基准标准</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-serif font-bold text-stone-900 tracking-tight">
              研学价格数据库
            </h1>
            <p className="text-sm text-stone-600 mt-1">
              导入和维护导师课时费、物料单价、交通大巴费及餐饮住宿等基准价格体系。
            </p>
          </div>
          <div className="flex items-center gap-3">
            <a
              href="/pricing"
              className="inline-flex items-center px-4 py-2 border border-stone-300 text-stone-700 bg-white hover:bg-stone-50 rounded-lg text-sm font-medium shadow-sm transition-colors"
            >
              ← 返回研学定价台
            </a>
          </div>
        </div>

        <section className="bg-white rounded-xl border border-stone-200/80 p-5 shadow-sm mb-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-emerald-100/70 text-emerald-800 flex items-center justify-center font-bold text-sm">
                👤
              </div>
              <div>
                <h3 className="text-sm font-bold text-stone-900">当前操作账号</h3>
                {error ? (
                  <p className="text-xs text-red-600 mt-0.5">
                    {error} <Button size="sm" variant="outline" className="ml-2 h-6 text-xs" onClick={refresh}>重试</Button>
                  </p>
                ) : !account ? (
                  <p className="text-xs text-stone-400 mt-0.5">正在读取账号…</p>
                ) : account.user ? (
                  <p className="text-xs text-stone-600 mt-0.5">
                    <strong className="text-stone-900">{account.user.displayName}</strong> · {account.user.email}
                  </p>
                ) : (
                  <div className="mt-2 flex items-center gap-2 flex-wrap">
                    {account.clientId && (
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
          </div>
        </section>

        {account?.user ? (
          <div className="bg-white rounded-xl border border-stone-200/80 p-6 shadow-sm">
            <PriceLibrary management plan={plan} onPlan={setPlan} />
          </div>
        ) : (
          <div className="bg-white rounded-xl border border-dashed border-stone-300 p-12 text-center shadow-sm">
            <div className="text-4xl mb-3">🔒</div>
            <h3 className="text-base font-bold text-stone-900 mb-1">价格库维护需账号登录</h3>
            <p className="text-xs text-stone-500 max-w-md mx-auto">
              登录后可批量编辑研学物料基准价、导入 CSV 价格表或同步自定义收费项。
            </p>
          </div>
        )}
      </main>
    </div>
  );
}

