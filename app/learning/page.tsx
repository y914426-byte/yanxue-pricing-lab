'use client';

import { useEffect, useState } from 'react';
import { SchemeLink as Link } from '@/components/scheme-link';
import { Button } from '@/components/ui/button';
import { groupLabel } from '@/lib/scheme-learning';

type Template = {
  id: string;
  activityName: string;
  groupType: string;
  costName: string;
  category: string;
  billingHint: string;
  positiveCount: number;
  negativeCount: number;
  confidenceScore: number;
  level: 'high' | 'low';
  isDisabled: boolean;
  schemeCount: number;
};
type Alias = {
  id: string;
  aliasName: string;
  normalizedAliasName: string;
  canonicalName: string;
  isActive: boolean;
};
type StandardActivity = {
  canonicalName: string;
  normalizedCanonicalName: string;
  aliases: Alias[];
};
type Batch = {
  batchId: string;
  schemeId: string;
  createdAt: string;
  revokedAt: string | null;
  relationCount: number;
};
type KnowledgeResponse = {
  templates: Template[];
  aliases: Alias[];
  standardActivities: StandardActivity[];
  recentBatches: Batch[];
  thresholds: { positiveCount: number; confidence: number };
};

async function request<T>(url: string, init?: RequestInit) {
  const response = await fetch(url, { ...init, cache: 'no-store' });
  const data = (await response.json()) as T & { error?: string };
  if (!response.ok) throw new Error(data.error || '操作失败，请重试');
  return data;
}

function percent(value: number) {
  return Math.round(value * 100) + '%';
}

export default function LearningPage() {
  const [data, setData] = useState<KnowledgeResponse | null>(null);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const [alias, setAlias] = useState({ aliasName: '', canonicalName: '' });
  const [names, setNames] = useState<Record<string, string>>({});
  const [aliasCanonicalNames, setAliasCanonicalNames] = useState<Record<string, string>>({});

  async function load() {
    setError('');
    try {
      const next = await request<KnowledgeResponse>('/api/learning');
      setData(next);
      setNames(
        Object.fromEntries(
          next.templates.map((item) => [item.id, item.costName]),
        ),
      );
      setAliasCanonicalNames(Object.fromEntries(next.aliases.map((item) => [item.id, item.canonicalName])));
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : '读取知识库失败');
    }
  }

  useEffect(() => {
    void Promise.resolve().then(load);
  }, []);

  async function updateTemplate(template: Template, disabled?: boolean) {
    const costName = names[template.id]?.trim();
    if (!costName) return;
    setBusy(true);
    setError('');
    try {
      await request('/api/activity-aliases', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'template_update',
          templateId: template.id,
          costName,
          ...(disabled === undefined ? {} : { disabled }),
        }),
      });
      setMessage('知识关系已更新，后续历史建议会使用最新设置。');
      await load();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : '更新知识关系失败');
    } finally {
      setBusy(false);
    }
  }

  async function saveAlias() {
    if (!alias.aliasName.trim() || !alias.canonicalName.trim()) return;
    setBusy(true);
    setError('');
    try {
      await request('/api/learning', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'accept',
          activityName: alias.aliasName,
          canonicalName: alias.canonicalName,
        }),
      });
      setAlias({ aliasName: '', canonicalName: '' });
      setMessage('活动别名已保存。系统以后会把它作为个人确认过的归一化参考。');
      await load();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : '保存活动别名失败');
    } finally {
      setBusy(false);
    }
  }

  async function deleteAlias(id: string) {
    setBusy(true);
    setError('');
    try {
      await request('/api/activity-aliases', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'delete', aliasId: id }),
      });
      await load();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : '停用活动别名失败');
    } finally {
      setBusy(false);
    }
  }

  async function updateAlias(item: Alias) {
    const canonicalName = aliasCanonicalNames[item.id]?.trim();
    if (!canonicalName) return;
    setBusy(true);
    setError('');
    try {
      await request('/api/activity-aliases', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'update', aliasId: item.id, canonicalName }),
      });
      setMessage('活动别名归属已更新；原方案正文和历史 AI 分析保持不变。');
      await load();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : '更新活动别名失败');
    } finally {
      setBusy(false);
    }
  }

  async function revoke(batchId: string) {
    if (!window.confirm('撤销后，这批反馈将不再影响个人知识库。是否继续？'))
      return;
    setBusy(true);
    setError('');
    try {
      await request('/api/learning', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'revoke', batchId }),
      });
      setMessage('已撤销学习批次，统计已重新计算。');
      await load();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : '撤销学习失败');
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="workspace learning-workspace">
      <nav className="scheme-actions">
        <Link className="price-link" href="/">
          研学定价台
        </Link>
        <Link className="price-link" href="/schemes">
          我的方案
        </Link>
        <Link className="price-link" href="/scheme-import">
          导入方案
        </Link>
      </nav>
      <div className="page-title">
        <div>
          <p className="eyebrow">个人业务知识</p>
          <h1>成本知识库</h1>
        </div>
        <span className="live">
          <i />
          仅影响当前账号
        </span>
      </div>
      {error && (
        <div className="error-box" role="alert">
          {error}
        </div>
      )}
      {message && (
        <output className="history-message" style={{ display: 'block' }}>
          {message}
        </output>
      )}
      {!data ? (
        <section className="panel">
          <p>正在读取个人知识库…</p>
        </section>
      ) : (
        <>
          <section className="panel learning-intro">
            <h2>历史确认如何生效</h2>
            <p>
              只有你在方案页面点击“确认并学习”后的结果才会进入这里。高频推荐阈值为确认至少{' '}
              {data.thresholds.positiveCount} 次，且确认占比至少{' '}
              {percent(data.thresholds.confidence)}
              ；历史建议不会自动计入成本，也不会保存价格金额。
            </p>
          </section>
          <section
            className="panel"
            aria-labelledby="learning-relations-heading"
          >
            <div className="section-title">
              <h2 id="learning-relations-heading">已学习活动与成本关系</h2>
              <span className="tag">{data.templates.length} 条关系</span>
            </div>
            {data.templates.length === 0 ? (
              <p className="analysis-note">
                还没有个人学习关系。完成一次方案确认后，活动成本关系会出现在这里。
              </p>
            ) : (
              <div className="analysis-table-wrap">
                <table className="analysis-table learning-table">
                  <thead>
                    <tr>
                      <th>活动</th>
                      <th>成本关系</th>
                      <th>确认 / 不适用</th>
                      <th>推荐级别</th>
                      <th>操作</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.templates.map((template) => (
                      <tr
                        key={template.id}
                        className={
                          template.isDisabled ? 'learning-disabled' : ''
                        }
                      >
                        <td>
                          <strong>{template.activityName}</strong>
                          <small>
                            {groupLabel(template.groupType)} ·{' '}
                            {template.schemeCount} 份方案
                          </small>
                        </td>
                        <td>
                          <input
                            className="knowledge-name-input"
                            aria-label={template.activityName + ' 标准成本名称'}
                            value={names[template.id] ?? template.costName}
                            maxLength={120}
                            disabled={busy}
                            onChange={(event) =>
                              setNames({
                                ...names,
                                [template.id]: event.target.value,
                              })
                            }
                          />
                          <small>
                            {template.category} · {template.billingHint}
                          </small>
                        </td>
                        <td>
                          {template.positiveCount} / {template.negativeCount}
                          <small>
                            置信度 {percent(template.confidenceScore)}
                          </small>
                        </td>
                        <td>
                          <span
                            className={
                              'learning-level ' +
                              (template.level === 'high'
                                ? 'learning-high'
                                : 'learning-low')
                            }
                          >
                            {template.isDisabled
                              ? '已禁用'
                              : template.level === 'high'
                                ? '历史高频'
                                : '低频建议'}
                          </span>
                        </td>
                        <td>
                          <div className="knowledge-actions">
                            <Button
                              variant="outline"
                              size="sm"
                              aria-label={template.activityName + ' 保存成本名称'}
                              disabled={busy}
                              onClick={() => void updateTemplate(template)}
                            >
                              {template.costName === names[template.id]
                                ? '保存'
                                : '改名并保存'}
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              aria-label={template.activityName + (template.isDisabled ? ' 启用推荐' : ' 禁用推荐')}
                              disabled={busy}
                              onClick={() =>
                                void updateTemplate(
                                  template,
                                  !template.isDisabled,
                                )
                              }
                            >
                              {template.isDisabled ? '启用推荐' : '禁用推荐'}
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
          <section className="panel" aria-labelledby="activity-normalization-heading">
            <div className="section-title">
              <h2 id="activity-normalization-heading">活动标准化</h2>
              <span className="tag">人工确认后生效</span>
            </div>
            <p className="muted">
              例如把“萌宠农场
              DIY”人工归一为“动物农场”。修改只影响查询和学习层，不会改写原方案正文或历史分析。
            </p>
            <div className="alias-form">
              <label>
                活动别名
                <input
                  value={alias.aliasName}
                  maxLength={120}
                  placeholder="萌宠农场DIY"
                  onChange={(event) =>
                    setAlias({ ...alias, aliasName: event.target.value })
                  }
                />
              </label>
              <label>
                标准活动名称
                <input
                  value={alias.canonicalName}
                  maxLength={120}
                  placeholder="动物农场"
                  onChange={(event) =>
                    setAlias({ ...alias, canonicalName: event.target.value })
                  }
                />
              </label>
              <Button
                disabled={
                  busy || !alias.aliasName.trim() || !alias.canonicalName.trim()
                }
                onClick={() => void saveAlias()}
              >
                保存别名
              </Button>
            </div>
            {data.standardActivities.length === 0 ? <p className="analysis-note">暂无标准活动。可手动添加别名，或在方案页确认活动归类。</p> : (
              <div className="canonical-activity-list">
                {data.standardActivities.map((activity) => <article key={activity.normalizedCanonicalName}>
                  <div className="canonical-activity-title"><strong>标准活动：{activity.canonicalName}</strong><span className="tag">{activity.aliases.length} 个别名</span></div>
                  {activity.aliases.length === 0 ? <p className="analysis-note">当前作为独立标准活动。</p> : <div className="alias-list">
                    {activity.aliases.map((item) => <div key={item.id}>
                      <span className="alias-name">{item.aliasName} →</span>
                      <input aria-label={item.aliasName + ' 标准活动名称'} value={aliasCanonicalNames[item.id] ?? item.canonicalName} maxLength={120} disabled={busy} onChange={(event) => setAliasCanonicalNames({ ...aliasCanonicalNames, [item.id]: event.target.value })}/>
                      <div className="knowledge-actions">
                        <Button variant="outline" size="sm" disabled={busy || !aliasCanonicalNames[item.id]?.trim()} onClick={() => void updateAlias(item)}>修改归属</Button>
                        <Button variant="ghost" size="sm" disabled={busy} onClick={() => void deleteAlias(item.id)}>停用</Button>
                      </div>
                    </div>)}
                  </div>}
                </article>)}
              </div>
            )}
          </section>
          <section className="panel">
            <div className="section-title">
              <h2>最近学习批次</h2>
              <span className="tag">可撤销</span>
            </div>
            {data.recentBatches.length === 0 ? (
              <p className="analysis-note">暂无学习批次。</p>
            ) : (
              <div className="batch-list">
                {data.recentBatches.map((batch) => (
                  <div key={batch.batchId}>
                    <span>
                      <strong>
                        {new Date(batch.createdAt).toLocaleString('zh-CN')}
                      </strong>
                      <small>
                        方案 {batch.schemeId} · {batch.relationCount} 条确认关系
                        {batch.revokedAt ? ' · 已撤销' : ''}
                      </small>
                    </span>
                    {!batch.revokedAt && (
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={busy}
                        onClick={() => void revoke(batch.batchId)}
                      >
                        撤销本批次
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </section>
        </>
      )}
    </main>
  );
}
