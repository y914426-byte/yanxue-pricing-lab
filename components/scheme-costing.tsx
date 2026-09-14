'use client';

import { useEffect, useState } from 'react';
import { SchemeLink as Link } from '@/components/scheme-link';
import { Button } from '@/components/ui/button';
import {
  BILLING_HINTS,
  COST_CATEGORIES,
  groupLabel,
  type BillingHint,
  type CostCategory,
  type LearningSuggestion,
} from '@/lib/scheme-learning';
import {
  type PriceOption,
  type PriceSnapshot,
  type PriceSource,
  type SchemeCostingResult,
  type SchemeCostMatch,
} from '@/lib/scheme-costing';
import { formatPriceSource, PRICE_SOURCES } from '@/lib/scheme-costing';
import { money, type Plan } from '@/lib/pricing';

type CostingResponse = {
  id?: string;
  costing: SchemeCostingResult | null;
  stale?: boolean;
  latestSchemeAnalysisId?: string;
  historySuggestions?: LearningSuggestion[];
  error?: string;
  code?: string;
};
type SearchItem = PriceSnapshot;
type LearningResponse = {
  latestForScheme?: {
    batchId: string;
    schemeId: string;
    schemeCostEstimateId: string;
    createdAt: string;
    revokedAt: string | null;
  } | null;
};

const groupOptions = [
  ['student', '学生团'],
  ['family', '亲子团'],
  ['senior', '老年团'],
  ['adult', '成人团'],
  ['company', '企业团'],
  ['custom', '自定义'],
] as const;
const billingLabels: Record<BillingHint, string> = {
  fixed: '固定数量',
  per_participant: '按参与人数',
  capacity_batch: '按容量分批',
  per_adult: '按成人',
  per_child: '按学生/儿童',
  per_family: '按家庭组',
  unknown: '待确认',
};
const statusLabel: Record<SchemeCostMatch['status'], string> = {
  exact: '已匹配',
  normalized: '已匹配',
  suggested: '推荐匹配',
  multiple: '多个价格',
  unmatched: '待询价',
  info_insufficient: '信息不足',
};
const statusClass: Record<SchemeCostMatch['status'], string> = {
  exact: 'match-ok',
  normalized: 'match-ok',
  suggested: 'match-suggested',
  multiple: 'match-multiple',
  unmatched: 'match-unmatched',
  info_insufficient: 'match-info',
};

function sourceLabel(source: PriceSnapshot['source']) {
  return source === 'personal' ? '我的价格库' : '系统价格库';
}

function originLabel(origin: SchemeCostMatch['origin']) {
  return origin === 'scheme_explicit'
    ? '方案明确'
    : origin === 'ai_suggestion'
      ? 'AI建议'
      : origin === 'history'
        ? '历史学习'
        : '用户新增';
}

function optionText(option: PriceOption) {
  return option.price.priceName + ' · ¥' + money(option.price.amount) + ' · ' + billingLabels[option.price.mode === 'person' ? 'per_participant' : option.price.mode === 'batch' ? 'capacity_batch' : option.price.mode === 'adult' ? 'per_adult' : option.price.mode === 'child' ? 'per_child' : option.price.mode === 'family' ? 'per_family' : 'fixed'];
}

async function request<T>(url: string, init?: RequestInit) {
  const response = await fetch(url, { ...init, cache: 'no-store' });
  const data = (await response.json()) as T & { error?: string };
  if (!response.ok) throw new Error(data.error || '操作失败，请重试');
  return data;
}

function priceForMode(snapshot: PriceSnapshot, item: SchemeCostMatch) {
  if (snapshot.mode === 'fixed') return item.quantity ?? snapshot.quantity;
  return item.quantity ?? 1;
}

function numberOrNull(value: string) {
  if (!value.trim()) return null;
  const number = Number(value);
  return Number.isFinite(number) && number >= 0 ? number : null;
}

export function SchemeCostingPanel({ schemeId }: { schemeId: string }) {
  const [costing, setCosting] = useState<CostingResponse['costing']>(null);
  const [costingId, setCostingId] = useState<string | null>(null);
  const [historySuggestions, setHistorySuggestions] = useState<LearningSuggestion[]>([]);
  const [source, setSource] = useState<PriceSource>('personal_first');
  const [manualGroupType, setManualGroupType] = useState('');
  const [decisions, setDecisions] = useState<Record<string, string | null>>({});
  const [loaded, setLoaded] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [dirty, setDirty] = useState(false);
  const [manualKey, setManualKey] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [searchItems, setSearchItems] = useState<SearchItem[]>([]);
  const [searching, setSearching] = useState(false);
  const [latestBatch, setLatestBatch] = useState<LearningResponse['latestForScheme']>(null);
  const [stale, setStale] = useState(false);
  const [adding, setAdding] = useState(false);
  const [draft, setDraft] = useState({ name: '', activity: '', category: '其他' as CostCategory, billingHint: 'unknown' as BillingHint, quantity: '', unit: '', note: '' });

  useEffect(() => {
    const controller = new AbortController();
    const loadCosting = () => request<CostingResponse>('/api/scheme-costing?schemeId=' + encodeURIComponent(schemeId), { signal: controller.signal })
      .then((data) => {
        if (controller.signal.aborted) return;
        setError('');
        setCosting(data.costing);
        setCostingId(data.id ?? null);
        setStale(data.stale === true);
        setHistorySuggestions(data.historySuggestions ?? data.costing?.historySuggestions ?? []);
        if (data.costing?.priceSource) setSource(data.costing.priceSource);
        if (data.costing?.groupTypeSource === 'manual' && data.costing.groupType) setManualGroupType(data.costing.groupType);
      })
      .catch((reason) => {
        if (!controller.signal.aborted) setError(reason instanceof Error ? reason.message : '读取成本匹配结果失败');
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoaded(true);
      });
    void loadCosting();
    const onAnalysisUpdated = (event: Event) => {
      const detail = (event as CustomEvent<{ schemeId?: string }>).detail;
      if (detail?.schemeId === schemeId) void loadCosting();
    };
    window.addEventListener('scheme-analysis-updated', onAnalysisUpdated);
    void request<LearningResponse>('/api/learning?schemeId=' + encodeURIComponent(schemeId))
      .then((data) => setLatestBatch(data.latestForScheme ?? null))
      .catch(() => undefined);
    return () => {
      controller.abort();
      window.removeEventListener('scheme-analysis-updated', onAnalysisUpdated);
    };
  }, [schemeId]);

  function reviewPayload(value: SchemeCostingResult | null) {
    if (!value) return {};
    const edits: Record<string, unknown> = {};
    const addedCosts: Record<string, unknown>[] = [];
    for (const item of value.items) {
      const edit = {
        name: item.name,
        relatedActivity: item.relatedActivity,
        category: item.category,
        billingHint: item.billingHint,
        quantity: item.candidateQuantity,
        unit: item.candidateUnit,
        note: item.note,
        removed: item.removed,
        removalAction: item.removalAction ?? undefined,
      };
      if (item.origin === 'user_added' || item.origin === 'history') {
        addedCosts.push({ key: item.key, ...edit, source: item.origin });
      } else {
        edits[item.key] = edit;
      }
    }
    return { edits, addedCosts };
  }

  async function runMatching(nextDecisions = decisions, confirm = !!costing) {
    if (busy) return null;
    if (confirm && !window.confirm('重新匹配会使用当前最新价格库。原有成本匹配记录会保留。是否继续？')) return null;
    setBusy(true);
    setError('');
    setMessage('');
    try {
      const data = await request<CostingResponse & { costing: SchemeCostingResult }>('/api/scheme-costing', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          schemeId,
          priceSource: source,
          ...(manualGroupType ? { groupType: manualGroupType } : {}),
          ...(Object.keys(nextDecisions).length ? { decisions: nextDecisions } : {}),
          ...reviewPayload(costing),
        }),
      });
      setCosting(data.costing);
      setCostingId(data.id ?? null);
      setStale(false);
      setHistorySuggestions(data.costing.historySuggestions ?? []);
      setDecisions({});
      setManualKey(null);
      setSearchItems([]);
      setDirty(false);
      window.dispatchEvent(new CustomEvent('scheme-costing-updated', { detail: { schemeId } }));
      return { costing: data.costing, id: data.id ?? null };
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : '价格匹配失败，请稍后重试');
      return null;
    } finally {
      setBusy(false);
    }
  }

  function updateItem(key: string, patch: Partial<SchemeCostMatch>) {
    setCosting((current) => current ? {
      ...current,
      items: current.items.map((item) => item.key === key ? {
        ...item,
        ...patch,
        ...(Object.keys(patch).some((name) => ['name', 'relatedActivity', 'category', 'billingHint', 'candidateQuantity', 'candidateUnit'].includes(name)) ? {
          options: [], selected: null, quantity: null, quantityLabel: null, unitPrice: null, total: null, decision: 'none', matchQuality: null, status: 'unmatched' as const,
        } : {}),
      } : item),
    } : current);
    setDirty(true);
  }

  function addCost() {
    if (!draft.name.trim() || !costing) return;
    const key = 'added-' + crypto.randomUUID();
    const quantity = numberOrNull(draft.quantity);
    const item: SchemeCostMatch = {
      key,
      candidateIndex: -1,
      origin: 'user_added',
      originalName: draft.name.trim(),
      removed: false,
      removalAction: null,
      note: draft.note.trim(),
      name: draft.name.trim(),
      normalizedName: draft.name.trim(),
      category: draft.category,
      relatedActivity: draft.activity.trim() || null,
      requiredness: 'possible',
      billingHint: draft.billingHint,
      candidateQuantity: quantity,
      candidateUnit: draft.unit.trim() || null,
      status: 'unmatched',
      decision: 'none',
      matchQuality: null,
      reason: draft.note.trim() || '用户新增成本项目。',
      options: [],
      selected: null,
      quantity: null,
      quantityLabel: null,
      unitPrice: null,
      total: null,
    };
    setCosting({ ...costing, items: [...costing.items, item] });
    setDraft({ name: '', activity: '', category: '其他', billingHint: 'unknown', quantity: '', unit: '', note: '' });
    setAdding(false);
    setDirty(true);
  }

  function addHistorySuggestion(suggestion: LearningSuggestion) {
    if (!costing || costing.items.some((item) => item.name === suggestion.costName && item.relatedActivity === suggestion.activityDisplayName)) return;
    setCosting({
      ...costing,
      items: [...costing.items, {
        key: 'added-' + crypto.randomUUID(), candidateIndex: -1, origin: 'history', originalName: suggestion.costName, removed: false, removalAction: null,
        note: '由历史学习建议加入本次方案。', name: suggestion.costName, normalizedName: suggestion.normalizedCostName, category: suggestion.category, relatedActivity: suggestion.activityDisplayName,
        requiredness: suggestion.requiredness === 'required' ? 'required' : 'possible', billingHint: suggestion.billingHint, candidateQuantity: null, candidateUnit: null,
        status: 'unmatched', decision: 'none', matchQuality: null, reason: '历史学习建议，需用户确认后才计入本次方案。', options: [], selected: null, quantity: null, quantityLabel: null, unitPrice: null, total: null,
      }],
    });
    setDirty(true);
  }

  async function searchPrices(value = search) {
    if (!value.trim()) { setSearchItems([]); return; }
    setSearching(true);
    setError('');
    try {
      const data = await request<{ items: SearchItem[] }>('/api/scheme-costing?schemeId=' + encodeURIComponent(schemeId) + '&priceSource=' + encodeURIComponent(source) + '&search=' + encodeURIComponent(value.trim()));
      setSearchItems(data.items);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : '搜索价格库失败');
    } finally {
      setSearching(false);
    }
  }

  function choose(key: string, priceItemId: string) {
    const next = { ...decisions, [key]: priceItemId };
    setDecisions(next);
    void runMatching(next, false);
  }

  function reject(key: string) {
    const next = { ...decisions, [key]: null };
    setDecisions(next);
    void runMatching(next, false);
  }

  async function confirmLearning() {
    if (!costing || busy || stale) return;
    setError('');
    setMessage('');
    try {
      let estimateId = costingId;
      if (dirty) {
        const saved = await runMatching({}, false);
        if (!saved) return;
        estimateId = saved.id;
      }
      if (!estimateId) throw new Error('请先保存本次成本匹配结果');
      setBusy(true);
      const data = await request<LearningResponse & { batchId: string; summary: { newRelations: number; reinforcedRelations: number; loweredRecommendations: number }; message: string }>('/api/learning', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'confirm', schemeId, schemeCostEstimateId: estimateId }),
      });
      setLatestBatch({ batchId: data.batchId, schemeId, schemeCostEstimateId: estimateId, createdAt: new Date().toISOString(), revokedAt: null });
      window.dispatchEvent(new CustomEvent('scheme-learning-updated', { detail: { schemeId } }));
      setMessage(data.message + ' 新增关系 ' + data.summary.newRelations + ' 条，强化关系 ' + data.summary.reinforcedRelations + ' 条，降低推荐 ' + data.summary.loweredRecommendations + ' 条。');
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : '保存学习反馈失败，请稍后重试');
    } finally {
      setBusy(false);
    }
  }

  async function revokeLearning() {
    if (!latestBatch || busy || !window.confirm('撤销本次学习后，这批反馈将不再影响个人知识库。是否继续？')) return;
    setBusy(true);
    setError('');
    try {
      await request('/api/learning', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'revoke', batchId: latestBatch.batchId }) });
      setLatestBatch(null);
      setMessage('已撤销本次学习，个人知识库统计已重新计算。');
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : '撤销学习失败，请稍后重试');
    } finally {
      setBusy(false);
    }
  }

  function bringToPricing() {
    if (!costing || stale) return;
    const costs = costing.items.filter((item) => !item.removed && item.total !== null && item.selected && item.quantity !== null).map((item) => {
      const selected = item.selected!;
      return {
        id: crypto.randomUUID(), name: item.name, mode: selected.mode, amount: selected.amount, quantity: priceForMode(selected, item), capacity: selected.capacity, actualOnly: selected.actualOnly,
        priceOrigin: { catalogId: selected.catalogId, catalogName: selected.catalogName, itemId: selected.priceItemId, source: (selected.source === 'personal' ? 'user' : 'system') as 'user' | 'system', version: selected.catalogVersion, unitPrice: selected.amount, adoptedAt: new Date().toISOString(), projectName: selected.projectName, travelDate: costing.travelDate ?? '' },
      };
    });
    const plan: Plan = { groupType: costing.groupType ?? undefined, paying: costing.participants.reliablePaying ?? 0, free: costing.participants.reliableFree ?? 0, price: 0, tax: 0, target: 25, costs };
    const pending = costing.items.filter((item) => item.removed || item.total === null).map((item) => item.name + '（' + (item.removed ? '本次不适用' : statusLabel[item.status]) + '）');
    try {
      sessionStorage.setItem('pricing-login-draft', JSON.stringify({ id: crypto.randomUUID(), title: (costing.projectName || '方案成本核算').slice(0, 80), plan }));
      sessionStorage.setItem('pricing-scheme-pending-costs', JSON.stringify(pending));
      window.location.assign('/');
    } catch { setError('无法带入研学定价台，请检查浏览器存储权限'); }
  }

  if (!loaded) return <section className="panel scheme-costing"><p>正在读取成本匹配结果…</p></section>;

  return (
    <section className="panel scheme-costing" aria-labelledby="scheme-costing-heading">
      <div className="scheme-costing-heading">
        <div>
          <span className="eyebrow">价格库核算与个人反馈</span>
          <h2 id="scheme-costing-heading">成本匹配与核算</h2>
          <p>价格和金额只来自当前可用价格库；历史学习只影响建议排序，不会生成价格。</p>
        </div>
        <div className="scheme-costing-actions">
          <label><span>价格匹配来源</span><select value={source} disabled={busy} onChange={(event) => setSource(event.target.value as PriceSource)}>{PRICE_SOURCES.map((value) => <option key={value} value={value}>{formatPriceSource(value)}</option>)}</select></label>
          <Button disabled={busy} onClick={() => void runMatching()}>{busy ? '正在匹配价格…' : costing ? '重新匹配价格' : '匹配现有价格'}</Button>
        </div>
      </div>
      {stale && <p className="scheme-costing-warning" role="alert">方案已重新分析，请重新匹配价格。旧成本快照仍保留为历史记录，本次不能继续确认学习或带入定价台。</p>}
      {error && <div className="error-box" role="alert">{error}</div>}
      {message && <output className="history-message" style={{ display: 'block' }}>{message}</output>}
      {historySuggestions.length > 0 && <section className="learning-suggestions"><div className="section-title"><h3>历史学习建议</h3><span className="tag">仅供参考，不会自动加入</span></div><div className="learning-suggestion-grid">{historySuggestions.map((suggestion) => <article key={suggestion.normalizedActivityName + suggestion.normalizedCostName + suggestion.groupType}><div><strong>{suggestion.costName}</strong><small>{suggestion.activityDisplayName} · {suggestion.level === 'high' ? '历史高频' : '低频建议'} · 确认 {suggestion.positiveCount} 次 / 不适用 {suggestion.negativeCount} 次</small></div>{costing && <Button variant="outline" size="sm" disabled={busy || costing.items.some((item) => item.name === suggestion.costName && item.relatedActivity === suggestion.activityDisplayName)} onClick={() => addHistorySuggestion(suggestion)}>添加到成本</Button>}</article>)}</div></section>}
      {costing && <>
        <div className="scheme-costing-context">
          <span>团体：{costing.groupType ? groupLabel(costing.groupType) : '待确认'}</span>
          <label><span>手动选择团型</span><select value={manualGroupType} disabled={busy} onChange={(event) => { setManualGroupType(event.target.value); setDirty(true); }}><option value="">使用 AI 识别结果</option>{groupOptions.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
          <span>地点：{costing.projectName || '待确认'}</span><span>参与人数：{costing.participants.attendees ?? '待确认'}</span><span>来源：{formatPriceSource(costing.priceSource)}</span>
        </div>
        <div className="scheme-costing-summary"><span>已匹配：<strong>{costing.counts.matched}</strong> 项</span><span>需要选择：<strong>{costing.counts.suggested + costing.counts.multiple}</strong> 项</span><span>待询价：<strong>{costing.counts.unmatched}</strong> 项</span><span>信息不足：<strong>{costing.counts.infoInsufficient}</strong> 项</span><span>本次不适用：<strong>{costing.counts.removed}</strong> 项</span><span className="known-total">已知成本小计：<strong>¥{money(costing.knownCostTotal)}</strong></span></div>
        <div className="analysis-table-wrap"><table className="analysis-table costing-table"><thead><tr><th>成本项目</th><th>对应活动</th><th>分类 / 计费</th><th>数量</th><th>单价</th><th>金额</th><th>状态 / 来源</th><th>操作</th></tr></thead><tbody>{costing.items.map((item) => <tr className={item.removed ? 'costing-removed' : ''} key={item.key}>
          <td><input className="costing-edit-input" maxLength={120} value={item.name} disabled={busy || item.removed} aria-label={item.name + ' 成本名称'} onChange={(event) => updateItem(item.key, { name: event.target.value })}/><small>{item.reason}</small>{item.originalName !== item.name && <small>原名称：{item.originalName}</small>}</td>
          <td><input className="costing-edit-input" maxLength={120} value={item.relatedActivity ?? ''} disabled={busy || item.removed} placeholder="公共成本" aria-label={item.name + ' 对应活动'} onChange={(event) => updateItem(item.key, { relatedActivity: event.target.value.trim() || null })}/></td>
          <td><select className="costing-edit-select" value={item.category} disabled={busy || item.removed} aria-label={item.name + ' 分类'} onChange={(event) => updateItem(item.key, { category: event.target.value as CostCategory })}>{COST_CATEGORIES.map((value) => <option key={value} value={value}>{value}</option>)}</select><select className="costing-edit-select" value={item.billingHint} disabled={busy || item.removed} aria-label={item.name + ' 计费方式'} onChange={(event) => updateItem(item.key, { billingHint: event.target.value as BillingHint })}>{BILLING_HINTS.map((value) => <option key={value} value={value}>{billingLabels[value]}</option>)}</select></td>
          <td>{item.removed ? '—' : <><input className="costing-edit-number" type="number" min="0" max="1000000" step="any" value={item.candidateQuantity ?? ''} disabled={busy} aria-label={item.name + ' 数量'} placeholder="自动" onChange={(event) => updateItem(item.key, { candidateQuantity: numberOrNull(event.target.value) })}/><small>{item.candidateUnit || '自动按计费方式'}</small></>}</td>
          <td>{item.unitPrice === null ? '—' : '¥' + money(item.unitPrice)}</td><td>{item.total === null ? '—' : '¥' + money(item.total)}</td>
          <td><span className={'match-status ' + statusClass[item.status]}>{item.removed ? '本次不适用' : statusLabel[item.status]}</span><small>{originLabel(item.origin)}</small>{item.selected && <small>{sourceLabel(item.selected.source)} · {item.selected.catalogName}</small>}</td>
          <td><div className="match-actions">{!item.removed && item.total !== null && <small>已加入小计</small>}{!item.removed && item.total === null && item.options.slice(0, 3).map((option) => <div key={option.price.priceItemId}><span>{optionText(option)}</span><Button variant="outline" size="sm" disabled={busy} onClick={() => choose(item.key, option.price.priceItemId)}>采用</Button></div>)}{!item.removed && <><Button variant="outline" size="sm" disabled={busy} onClick={() => { setManualKey(item.key); setSearch(item.name); void searchPrices(item.name); }}>从价格库选择</Button>{item.options.length > 0 && <Button variant="ghost" size="sm" disabled={busy} onClick={() => reject(item.key)}>不匹配</Button>}<Button variant="ghost" size="sm" disabled={busy} onClick={() => updateItem(item.key, { removed: true, removalAction: 'not_applicable' })}>不适用</Button></>}{item.removed && <Button variant="ghost" size="sm" disabled={busy} onClick={() => updateItem(item.key, { removed: false, removalAction: null })}>恢复</Button>}</div></td>
        </tr>)}</tbody></table></div>
        <div className="costing-edit-toolbar"><Button variant="outline" disabled={busy} onClick={() => setAdding((value) => !value)}>＋ 添加成本</Button><Button variant="outline" disabled={busy || !dirty} onClick={() => void runMatching({}, false)}>保存成本修改</Button><span>删除、不适用、改名和活动调整会先保存在本次匹配快照，点击“确认并学习”后才会进入个人知识库。</span></div>
        {adding && <div className="costing-add-form"><h3>添加遗漏成本</h3><div className="costing-add-grid"><label>成本名称<input value={draft.name} maxLength={120} onChange={(event) => setDraft({ ...draft, name: event.target.value })}/></label><label>对应活动<input value={draft.activity} maxLength={120} placeholder="公共成本" onChange={(event) => setDraft({ ...draft, activity: event.target.value })}/></label><label>分类<select value={draft.category} onChange={(event) => setDraft({ ...draft, category: event.target.value as CostCategory })}>{COST_CATEGORIES.map((value) => <option key={value} value={value}>{value}</option>)}</select></label><label>计费方式<select value={draft.billingHint} onChange={(event) => setDraft({ ...draft, billingHint: event.target.value as BillingHint })}>{BILLING_HINTS.map((value) => <option key={value} value={value}>{billingLabels[value]}</option>)}</select></label><label>数量（可留空）<input type="number" min="0" max="1000000" value={draft.quantity} onChange={(event) => setDraft({ ...draft, quantity: event.target.value })}/></label><label>单位<input value={draft.unit} maxLength={30} placeholder="人 / 份 / 场" onChange={(event) => setDraft({ ...draft, unit: event.target.value })}/></label><label className="costing-add-wide">备注<input value={draft.note} maxLength={240} onChange={(event) => setDraft({ ...draft, note: event.target.value })}/></label></div><Button disabled={!draft.name.trim()} onClick={addCost}>加入本次成本</Button></div>}
        {manualKey !== null && <div className="scheme-price-search"><h3>从价格库选择</h3><p>只显示当前账号有权限使用的价格项目，选择后才会计入本次成本。</p><div className="scheme-price-search-row"><input value={search} maxLength={80} placeholder="搜索价格项目名称" onChange={(event) => setSearch(event.target.value)}/><Button disabled={searching || busy} onClick={() => void searchPrices()}>{searching ? '搜索中…' : '搜索'}</Button><Button variant="ghost" onClick={() => setManualKey(null)}>关闭</Button></div>{searchItems.length > 0 && <div className="scheme-price-search-results">{searchItems.map((item) => <div key={item.priceItemId}><span><strong>{item.priceName}</strong> · ¥{money(item.amount)} · {sourceLabel(item.source)}{item.projectName ? ' · ' + item.projectName : ''}</span><Button variant="outline" size="sm" disabled={busy} onClick={() => choose(manualKey, item.priceItemId)}>采用</Button></div>)}</div>}{!searching && search.length > 0 && searchItems.length === 0 && <p className="analysis-note">没有找到可用价格项目。</p>}</div>}
        {costing.warnings.map((warning) => <p className="scheme-costing-warning" key={warning}>{warning}</p>)}
        <div className="scheme-costing-footer"><div>{costing.knownPerPerson === null ? <span>已知人均成本：待确认</span> : <span>已知人均成本：¥{money(costing.knownPerPerson)} / 人</span>}<small>{costing.unresolvedCount > 0 ? '不包含尚未确定的成本项目' : '当前所有未移除项目均已确定数量和价格'}</small></div>{costing.allRequiredResolved && <strong>当前可计算总成本：¥{money(costing.knownCostTotal)}</strong>}<Button disabled={busy || stale || !costing.items.some((item) => !item.removed && item.total !== null)} onClick={bringToPricing}>带入研学定价台</Button><Button disabled={busy || stale} onClick={() => void confirmLearning()}>确认并学习</Button>{latestBatch && !latestBatch.revokedAt && <Button variant="ghost" disabled={busy} onClick={() => void revokeLearning()}>撤销本次学习</Button>}</div>
      </>}
      {!costing && !error && <p className="analysis-note">请先完成智能成本分析，然后点击“匹配现有价格”。</p>}
      {costing && costing.items.length === 0 && <p className="analysis-note">分析结果没有成本候选项，暂时没有可匹配内容。</p>}
      <p className="learning-center-link"><Link href="/learning">进入成本知识库，查看和管理个人学习结果 →</Link></p>
    </section>
  );
}

