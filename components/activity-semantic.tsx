'use client';

import { useCallback, useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import type { ActivitySemanticStatus } from '@/lib/activity-semantic-service';

type SemanticResponse = { activities: ActivitySemanticStatus[]; error?: string };

async function request<T>(url: string, init?: RequestInit) {
  const response = await fetch(url, { ...init, cache: 'no-store' });
  const data = (await response.json()) as T & { error?: string };
  if (!response.ok) throw new Error(data.error || '活动标准化操作失败');
  return data;
}

function sourceLabel(source: ActivitySemanticStatus['source']) {
  return source === 'alias' ? '已确认别名' : source === 'canonical' ? '标准名称命中'
    : source === 'deterministic' ? '文字规则候选' : source === 'ai' || source === 'cache' ? 'AI语义候选' : '用户确认';
}

export function ActivitySemanticPanel({ schemeId }: { schemeId: string }) {
  const [activities, setActivities] = useState<ActivitySemanticStatus[]>([]);
  const [busy, setBusy] = useState('');
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  const load = useCallback(async () => {
    try {
      const data = await request<SemanticResponse>('/api/activity-semantic?schemeId=' + encodeURIComponent(schemeId));
      setActivities(data.activities);
      setError('');
    } catch (reason) {
      const text = reason instanceof Error ? reason.message : '读取活动标准化状态失败';
      if (text !== '请先完成智能成本分析') setError(text);
    }
  }, [schemeId]);

  useEffect(() => {
    const initialLoad = window.setTimeout(() => void load(), 0);
    const refresh = (event: Event) => {
      const detail = (event as CustomEvent<{ schemeId?: string }>).detail;
      if (!detail?.schemeId || detail.schemeId === schemeId) void load();
    };
    window.addEventListener('scheme-analysis-updated', refresh);
    window.addEventListener('activity-alias-updated', refresh);
    return () => {
      window.clearTimeout(initialLoad);
      window.removeEventListener('scheme-analysis-updated', refresh);
      window.removeEventListener('activity-alias-updated', refresh);
    };
  }, [load, schemeId]);

  async function askAi(activityName: string) {
    setBusy(activityName);
    setError('');
    try {
      const data = await request<{ activity: ActivitySemanticStatus }>('/api/activity-semantic', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ schemeId, activityName }),
      });
      setActivities((current) => current.map((item) => item.activityName === activityName ? data.activity : item));
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'AI活动语义候选暂时不可用');
    } finally { setBusy(''); }
  }

  async function decide(activity: ActivitySemanticStatus, action: 'accept' | 'reject' | 'independent') {
    setBusy(activity.activityName);
    setError('');
    try {
      await request('/api/activity-aliases', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(action === 'accept'
          ? { action, activityName: activity.activityName, canonicalName: activity.candidateName }
          : action === 'reject'
            ? { action, activityName: activity.activityName, candidateName: activity.candidateName }
            : { action, activityName: activity.activityName }),
      });
      setMessage(action === 'accept' ? '活动归类已确认，历史相似方案已重新计算。'
        : action === 'reject' ? '已记录“不是同一活动”，以后不会重复推荐该映射。'
          : '已建立独立标准活动。');
      window.dispatchEvent(new CustomEvent('activity-alias-updated', { detail: { schemeId } }));
      await load();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : '保存活动判断失败');
    } finally { setBusy(''); }
  }

  if (!activities.length && !error) return null;
  return (
    <section className="activity-semantic-panel" aria-labelledby="activity-semantic-heading">
      <div className="section-title">
        <div><h3 id="activity-semantic-heading">活动语义归一</h3><p className="muted">AI只提出候选；确认后才写入你的活动别名。</p></div>
        <span className="tag">Similarity V1</span>
      </div>
      {error && <div className="error-box" role="alert">{error}</div>}
      {message && <output className="history-message">{message}</output>}
      <div className="activity-semantic-list">
        {activities.map((activity) => <article key={activity.normalizedActivityName}>
          <div>
            <strong>{activity.activityName}</strong>
            <small>{activity.category ?? '未分类'}{activity.source ? ' · ' + sourceLabel(activity.source) : ''}</small>
          </div>
          <div className="semantic-result">
            {activity.status === 'suggested' && <><span>可能对应：<strong>{activity.candidateName}</strong></span><small>{activity.reason}{activity.confidence !== null ? ' · ' + Math.round(activity.confidence * 100) + '%' : ''}</small></>}
            {activity.status === 'resolved' && <span>标准活动：<strong>{activity.canonicalName}</strong></span>}
            {activity.status === 'independent' && <span>独立标准活动</span>}
            {activity.status === 'no_match' && <span>暂未发现可靠的相似活动</span>}
            {activity.status === 'unresolved' && <span>尚未归一</span>}
          </div>
          <div className="semantic-actions">
            {activity.status === 'suggested' && <>
              <Button size="sm" disabled={!!busy} onClick={() => void decide(activity, 'accept')}>确认归类</Button>
              <Button variant="outline" size="sm" disabled={!!busy} onClick={() => void decide(activity, 'reject')}>不是同一活动</Button>
            </>}
            {activity.status === 'unresolved' && activity.canAskAi && <Button variant="outline" size="sm" disabled={!!busy} onClick={() => void askAi(activity.activityName)}>{busy === activity.activityName ? '正在判断…' : 'AI查找候选'}</Button>}
            {(activity.status === 'suggested' || activity.status === 'unresolved' || activity.status === 'no_match') && <Button variant="ghost" size="sm" disabled={!!busy} onClick={() => void decide(activity, 'independent')}>新建独立活动</Button>}
          </div>
        </article>)}
      </div>
    </section>
  );
}
