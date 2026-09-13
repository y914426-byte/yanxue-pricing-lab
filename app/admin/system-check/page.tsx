'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';

type CheckResponse = {
  checkedAt: string;
  configuration: {
    google: { configured: boolean };
    openai: { apiKeyConfigured: boolean; model: string; apiConfigured: boolean; usingDefaultApi: boolean };
    db: { bindingConfigured: boolean; queryOk: boolean };
  };
  tables: Record<string, { present: boolean; migrationHint: string | null }>;
  services: Record<string, { status: string; message: string }>;
  migrationHints: string[];
  error?: string;
};

const tableLabels: Record<string, string> = {
  estimates: 'estimates',
  google_sessions: 'google_sessions',
  price_catalogs: 'price_catalogs',
  price_items: 'price_items',
  scheme_documents: 'scheme_documents',
  scheme_analyses: 'scheme_analyses',
  scheme_cost_estimates: 'scheme_cost_estimates',
  activity_cost_templates: 'activity_cost_templates',
  scheme_learning_feedback: 'scheme_learning_feedback',
  scheme_confirmed_costs: 'scheme_confirmed_costs',
  activity_aliases: 'activity_aliases',
  cost_price_aliases: 'cost_price_aliases',
};

const serviceLabels: Record<string, string> = {
  schemeImport: '方案导入服务',
  aiAnalysis: 'AI分析服务',
  priceMatching: '价格匹配服务',
  learning: '学习服务',
  estimateHistory: '历史估算服务',
};

function Check({ ok }: { ok: boolean }) {
  return <span aria-label={ok ? '已就绪' : '未就绪'}>{ok ? '✅' : '❌'}</span>;
}

export default function SystemCheckPage() {
  const [data, setData] = useState<CheckResponse | null>(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(true);

  async function load() {
    setBusy(true);
    setError('');
    try {
      const response = await fetch('/api/admin/system-check', { cache: 'no-store' });
      const value = (await response.json()) as CheckResponse;
      if (!response.ok) throw new Error(value.error || '系统检查暂不可用，请稍后重试');
      setData(value);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : '系统检查暂不可用，请稍后重试');
    } finally {
      setBusy(false);
    }
  }

  useEffect(() => {
    void Promise.resolve().then(load);
  }, []);

  return (
    <main className="workspace system-check-page">
      <nav className="scheme-actions">
        <Link className="price-link" href="/">← 返回研学定价台</Link>
        <Link className="price-link" href="/schemes">我的方案</Link>
      </nav>
      <div className="page-title">
        <div><span className="eyebrow">PRODUCTION ACCEPTANCE</span><h1>系统检查</h1></div>
        <Button variant="outline" disabled={busy} onClick={() => void load()}>{busy ? '检查中…' : '重新检查'}</Button>
      </div>
      {error && <div className="error-box" role="alert">{error}</div>}
      {data && (
        <>
          <section className="panel system-check-card">
            <h2>运行时配置</h2>
            <div className="system-check-grid">
              <p>Google 登录 <Check ok={data.configuration.google.configured} /> {data.configuration.google.configured ? '已配置' : '未配置'}</p>
              <p>OPENAI_API_KEY <Check ok={data.configuration.openai.apiKeyConfigured} /> {data.configuration.openai.apiKeyConfigured ? '已配置' : '未配置'}</p>
              <p>模型：<code>{data.configuration.openai.model}</code></p>
              <p>OpenAI API <Check ok={data.configuration.openai.apiConfigured} /> {data.configuration.openai.apiConfigured ? (data.configuration.openai.usingDefaultApi ? '已使用默认地址' : '已配置') : '未配置'}</p>
              <p>D1 DB binding <Check ok={data.configuration.db.bindingConfigured} /> {data.configuration.db.bindingConfigured ? '已配置' : '未配置'}</p>
              <p>D1 只读查询 <Check ok={data.configuration.db.queryOk} /> {data.configuration.db.queryOk ? '正常' : '未执行或失败'}</p>
            </div>
          </section>
          <section className="panel system-check-card">
            <h2>数据库表</h2>
            <div className="system-check-table-list">
              {Object.entries(tableLabels).map(([name, label]) => <p key={name}><Check ok={!!data.tables[name]?.present} /> {label}{!data.tables[name]?.present && data.tables[name]?.migrationHint && <small>{data.tables[name].migrationHint}</small>}</p>)}
            </div>
          </section>
          <section className="panel system-check-card">
            <h2>功能链路</h2>
            <div className="system-check-table-list">
              {Object.entries(serviceLabels).map(([name, label]) => <p key={name}><Check ok={data.services[name]?.status === 'ready'} /> {label}：{data.services[name]?.message}</p>)}
            </div>
          </section>
          {data.migrationHints.length > 0 && <section className="system-check-warning" role="alert"><strong>需要人工执行 migration</strong><ul>{data.migrationHints.map((hint) => <li key={hint}>{hint}</li>)}</ul><p>此页面只读检查，不会自动执行 migration。</p></section>}
          <p className="analysis-note">检查时间：{new Date(data.checkedAt).toLocaleString('zh-CN')}。系统不会在检查过程中调用 OpenAI。</p>
        </>
      )}
    </main>
  );
}
