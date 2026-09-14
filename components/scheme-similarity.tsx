'use client';

import { useCallback, useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';

export type SimilarSchemeCostSuggestion = {
  key: string;
  costName: string;
  normalizedCostName: string;
  activityName: string;
  category: string;
  billingHint: string;
  requiredness: string;
  schemeCount: number;
  totalSchemes: number;
  frequency: number;
  level: 'high' | 'low';
  source: 'similar_scheme';
};

type SimilarScheme = {
  schemeId: string;
  title: string;
  analysisDate: string;
  score: number;
  level: 'high' | 'medium';
  confirmed: boolean;
  commonActivities: string[];
  reasons: string[];
  activities: string[];
  confirmedCosts: Array<{ costName: string; activityName: string }>;
};
type SimilarityResponse = {
  similarSchemes: SimilarScheme[];
  costSuggestions: SimilarSchemeCostSuggestion[];
  confirmedSampleCount: number;
  sampleWarning: string | null;
  error?: string;
};

async function request<T>(url: string) {
  const response = await fetch(url, { cache: 'no-store' });
  const data = (await response.json()) as T & { error?: string };
  if (!response.ok) throw new Error(data.error || '读取历史相似方案失败');
  return data;
}

export function SchemeSimilarityPanel({
  schemeId,
  canAdopt,
  adoptedNames,
  onAdopt,
}: {
  schemeId: string;
  canAdopt: boolean;
  adoptedNames: string[];
  onAdopt: (suggestion: SimilarSchemeCostSuggestion) => void;
}) {
  const [data, setData] = useState<SimilarityResponse | null>(null);
  const [error, setError] = useState('');
  const load = useCallback(async () => {
    try {
      setData(await request<SimilarityResponse>('/api/scheme-similarity?schemeId=' + encodeURIComponent(schemeId)));
      setError('');
    } catch (reason) {
      const text = reason instanceof Error ? reason.message : '读取历史相似方案失败';
      if (text !== '请先完成智能成本分析') setError(text);
    }
  }, [schemeId]);

  useEffect(() => {
    const initialLoad = window.setTimeout(() => void load(), 0);
    const refresh = (event: Event) => {
      const detail = (event as CustomEvent<{ schemeId?: string }>).detail;
      if (!detail?.schemeId || detail.schemeId === schemeId) void load();
    };
    window.addEventListener('activity-alias-updated', refresh);
    window.addEventListener('scheme-analysis-updated', refresh);
    window.addEventListener('scheme-learning-updated', refresh);
    return () => {
      window.clearTimeout(initialLoad);
      window.removeEventListener('activity-alias-updated', refresh);
      window.removeEventListener('scheme-analysis-updated', refresh);
      window.removeEventListener('scheme-learning-updated', refresh);
    };
  }, [load, schemeId]);

  if (!data && !error) return null;
  return <section className="scheme-similarity-panel" aria-labelledby="similar-schemes-heading">
    <div className="section-title"><div><h3 id="similar-schemes-heading">历史相似方案</h3><p className="muted">使用标准活动集合确定性评分，只参考当前账号历史。</p></div><span className="tag">最多 5 份</span></div>
    {error && <div className="error-box" role="alert">{error}</div>}
    {data && <>
      {data.sampleWarning && <p className="scheme-costing-warning">{data.sampleWarning}</p>}
      {data.similarSchemes.length === 0 ? <p className="analysis-note">暂未找到达到展示阈值的历史方案。</p> : <div className="similar-scheme-grid">
        {data.similarSchemes.map((scheme) => <article key={scheme.schemeId}>
          <div className="similar-scheme-title"><div><strong>{scheme.title}</strong><small>{scheme.confirmed ? '已确认历史方案' : '普通历史方案'} · {new Date(scheme.analysisDate).toLocaleDateString('zh-CN')}</small></div><span>{Math.round(scheme.score * 100)}%</span></div>
          <p>共同活动：{scheme.commonActivities.length ? scheme.commonActivities.join('、') : '无完全相同的标准活动'}</p>
          <ul>{scheme.reasons.map((reason) => <li key={reason}>{reason}</li>)}</ul>
          <details><summary>查看历史方案</summary><p>活动：{scheme.activities.join('、') || '未记录'}</p><p>已确认成本：{scheme.confirmedCosts.map((cost) => cost.costName).join('、') || '无人工确认成本'}</p></details>
        </article>)}
      </div>}
      {data.costSuggestions.length > 0 && <section className="similar-cost-suggestions"><div className="section-title"><h4>相似方案经验</h4><span className="tag">采用后仍重新匹配当前价格库</span></div><div className="learning-suggestion-grid">
        {data.costSuggestions.map((suggestion) => {
          const adopted = adoptedNames.includes(suggestion.normalizedCostName);
          return <article key={suggestion.key}><div><strong>{suggestion.costName}</strong><small>{suggestion.activityName} · {suggestion.level === 'high' ? '高频' : '低频'} · {suggestion.schemeCount}/{suggestion.totalSchemes} 份确认方案</small></div><Button variant="outline" size="sm" disabled={adopted} onClick={() => onAdopt(suggestion)}>{adopted ? '已在本次成本中' : canAdopt ? '采用并匹配当前价格' : '采用并开始价格匹配'}</Button></article>;
        })}
      </div></section>}
    </>}
  </section>;
}
