'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  formatPriceSource,
  PRICE_SOURCES,
  type PriceOption,
  type PriceSnapshot,
  type PriceSource,
  type SchemeCostingResult,
  type SchemeCostMatch,
} from '@/lib/scheme-costing';
import { money, type Plan } from '@/lib/pricing';

type CostingResponse = {
  costing: SchemeCostingResult | null;
  error?: string;
  code?: string;
};

type SearchItem = PriceSnapshot;

const groupOptions = [
  ['student', '学生团'],
  ['family', '亲子团'],
  ['senior', '老年团'],
  ['adult', '成人团'],
  ['company', '企业团'],
  ['custom', '自定义'],
] as const;

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

function optionText(option: PriceOption) {
  return option.price.priceName + ' · ¥' + money(option.price.amount) + '/' + option.price.mode;
}

async function request<T>(url: string, init?: RequestInit) {
  const response = await fetch(url, { ...init, cache: 'no-store' });
  const data = (await response.json()) as T & { error?: string };
  if (!response.ok) throw new Error(data.error || '操作失败，请重试');
  return data;
}

function priceForMode(snapshot: PriceSnapshot, item: SchemeCostMatch) {
  if (snapshot.mode === 'fixed')
    return item.quantity ?? snapshot.quantity;
  return item.quantity ?? 1;
}

export function SchemeCostingPanel({ schemeId }: { schemeId: string }) {
  const [costing, setCosting] = useState<CostingResponse['costing']>(null);
  const [source, setSource] = useState<PriceSource>('personal_first');
  const [manualGroupType, setManualGroupType] = useState('');
  const [decisions, setDecisions] = useState<Record<string, string | null>>({});
  const [loaded, setLoaded] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [manualIndex, setManualIndex] = useState<number | null>(null);
  const [search, setSearch] = useState('');
  const [searchItems, setSearchItems] = useState<SearchItem[]>([]);
  const [searching, setSearching] = useState(false);

  useEffect(() => {
    const controller = new AbortController();
    void request<CostingResponse>(
      '/api/scheme-costing?schemeId=' + encodeURIComponent(schemeId),
      { signal: controller.signal },
    )
      .then((data) => {
        if (controller.signal.aborted) return;
        setError('');
        setCosting(data.costing);
        if (data.costing?.priceSource) setSource(data.costing.priceSource);
        if (data.costing?.groupTypeSource === 'manual' && data.costing.groupType)
          setManualGroupType(data.costing.groupType);
      })
      .catch((reason) => {
        if (!controller.signal.aborted)
          setError(reason instanceof Error ? reason.message : '读取成本匹配结果失败');
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoaded(true);
      });
    return () => controller.abort();
  }, [schemeId]);

  async function runMatching(
    nextDecisions = decisions,
    confirm = !!costing,
  ) {
    if (busy) return;
    if (
      confirm &&
      !window.confirm(
        '重新匹配会使用当前最新价格库。原有成本匹配记录会保留。是否继续？',
      )
    )
      return;
    setBusy(true);
    setError('');
    try {
      const data = await request<CostingResponse & { costing: SchemeCostingResult }>(
        '/api/scheme-costing',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            schemeId,
            priceSource: source,
            ...(manualGroupType ? { groupType: manualGroupType } : {}),
            ...(Object.keys(nextDecisions).length ? { decisions: nextDecisions } : {}),
          }),
        },
      );
      setCosting(data.costing);
      setDecisions({});
      setManualIndex(null);
      setSearchItems([]);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : '价格匹配失败，请稍后重试');
    } finally {
      setBusy(false);
    }
  }

  async function searchPrices(value = search) {
    if (!value.trim()) {
      setSearchItems([]);
      return;
    }
    setSearching(true);
    setError('');
    try {
      const data = await request<{ items: SearchItem[] }>(
        '/api/scheme-costing?schemeId=' +
          encodeURIComponent(schemeId) +
          '&priceSource=' +
          encodeURIComponent(source) +
          '&search=' +
          encodeURIComponent(value.trim()),
      );
      setSearchItems(data.items);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : '搜索价格库失败');
    } finally {
      setSearching(false);
    }
  }

  function choose(itemIndex: number, priceItemId: string) {
    const next = { ...decisions, [String(itemIndex)]: priceItemId };
    setDecisions(next);
    void runMatching(next, false);
  }

  function reject(itemIndex: number) {
    const next = { ...decisions, [String(itemIndex)]: null };
    setDecisions(next);
    void runMatching(next, false);
  }

  function bringToPricing() {
    if (!costing) return;
    const costs = costing.items
      .filter((item) => item.total !== null && item.selected && item.quantity !== null)
      .map((item) => {
        const selected = item.selected!;
        return {
          id: crypto.randomUUID(),
          name: item.name,
          mode: selected.mode,
          amount: selected.amount,
          quantity: priceForMode(selected, item),
          capacity: selected.capacity,
          actualOnly: selected.actualOnly,
          priceOrigin: {
            catalogId: selected.catalogId,
            catalogName: selected.catalogName,
            itemId: selected.priceItemId,
            source: (selected.source === 'personal' ? 'user' : 'system') as 'user' | 'system',
            version: selected.catalogVersion,
            unitPrice: selected.amount,
            adoptedAt: new Date().toISOString(),
            projectName: selected.projectName,
            travelDate: selected.validFrom,
          },
        };
      });
    const plan: Plan = {
      groupType: costing.groupType ?? undefined,
      paying: costing.participants.reliablePaying ?? 0,
      free: costing.participants.reliableFree ?? 0,
      price: 0,
      tax: 0,
      target: 25,
      costs,
    };
    const pending = costing.items
      .filter((item) => item.total === null)
      .map((item) => item.name + '（' + statusLabel[item.status] + '）');
    try {
      sessionStorage.setItem(
        'pricing-login-draft',
        JSON.stringify({
          id: crypto.randomUUID(),
          title: (costing.projectName || '方案成本核算').slice(0, 80),
          plan,
        }),
      );
      sessionStorage.setItem('pricing-scheme-pending-costs', JSON.stringify(pending));
      window.location.assign('/');
    } catch {
      setError('无法带入研学定价台，请检查浏览器存储权限');
    }
  }

  if (!loaded) return <section className="panel scheme-costing"><p>正在读取成本匹配结果…</p></section>;

  return (
    <section className="panel scheme-costing" aria-labelledby="scheme-costing-heading">
      <div className="scheme-costing-heading">
        <div>
          <span className="eyebrow">价格库核算</span>
          <h2 id="scheme-costing-heading">成本匹配与核算</h2>
          <p>价格和金额只来自当前可用的价格库，不使用 AI 生成或估算价格。</p>
        </div>
        <div className="scheme-costing-actions">
          <label>
            <span>价格匹配来源</span>
            <select
              value={source}
              disabled={busy}
              onChange={(event) => setSource(event.target.value as PriceSource)}
            >
              {PRICE_SOURCES.map((value) => (
                <option key={value} value={value}>
                  {formatPriceSource(value)}
                </option>
              ))}
            </select>
          </label>
          <Button disabled={busy} onClick={() => void runMatching()}>
            {busy ? '正在匹配价格…' : costing ? '重新匹配价格' : '匹配现有价格'}
          </Button>
        </div>
      </div>

      {error && (
        <div className="error-box" role="alert">
          {error}
        </div>
      )}

      {costing && (
        <>
          <div className="scheme-costing-context">
            <span>
              团体：
              {costing.groupType ? (
                groupOptions.find(([value]) => value === costing.groupType)?.[1]
              ) : (
                '待确认'
              )}
            </span>
            <label>
              <span>手动选择团型</span>
              <select
                value={manualGroupType}
                disabled={busy}
                onChange={(event) => setManualGroupType(event.target.value)}
              >
                <option value="">使用 AI 识别结果</option>
                {groupOptions.map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </label>
            <span>地点：{costing.projectName || '待确认'}</span>
            <span>参与人数：{costing.participants.attendees ?? '待确认'}</span>
            <span>来源：{formatPriceSource(costing.priceSource)}</span>
          </div>

          <div className="scheme-costing-summary">
            <span>已自动匹配：<strong>{costing.counts.matched}</strong> 项</span>
            <span>需要选择：<strong>{costing.counts.suggested + costing.counts.multiple}</strong> 项</span>
            <span>待询价：<strong>{costing.counts.unmatched}</strong> 项</span>
            <span>信息不足：<strong>{costing.counts.infoInsufficient}</strong> 项</span>
            <span className="known-total">
              已知成本小计：<strong>¥{money(costing.knownCostTotal)}</strong>
            </span>
          </div>

          <div className="analysis-table-wrap">
            <table className="analysis-table costing-table">
              <thead>
                <tr>
                  <th>成本项目</th>
                  <th>对应活动</th>
                  <th>数量</th>
                  <th>单价</th>
                  <th>金额</th>
                  <th>状态</th>
                  <th>价格来源</th>
                  <th>操作</th>
                </tr>
              </thead>
              <tbody>
                {costing.items.map((item) => (
                  <tr key={item.candidateIndex}>
                    <td>
                      <strong>{item.name}</strong>
                      <small>{item.reason}</small>
                    </td>
                    <td>{item.relatedActivity || '公共成本'}</td>
                    <td>{item.quantityLabel || '待确认'}</td>
                    <td>{item.unitPrice === null ? '—' : '¥' + money(item.unitPrice)}</td>
                    <td>{item.total === null ? '—' : '¥' + money(item.total)}</td>
                    <td>
                      <span className={'match-status ' + statusClass[item.status]}>
                        {statusLabel[item.status]}
                      </span>
                    </td>
                    <td>
                      {item.selected ? (
                        <>
                          {sourceLabel(item.selected.source)}
                          <small>{item.selected.catalogName}</small>
                        </>
                      ) : '—'}
                    </td>
                    <td>
                      {item.total !== null ? (
                        <small>已加入小计</small>
                      ) : (
                        <div className="match-actions">
                          {item.options.slice(0, 3).map((option) => (
                            <div key={option.price.priceItemId}>
                              <span>{optionText(option)}</span>
                              <Button
                                variant="outline"
                                size="sm"
                                disabled={busy}
                                onClick={() => choose(item.candidateIndex, option.price.priceItemId)}
                              >
                                采用
                              </Button>
                            </div>
                          ))}
                          <Button
                            variant="outline"
                            size="sm"
                            disabled={busy}
                            onClick={() => {
                              setManualIndex(item.candidateIndex);
                              setSearch(item.name);
                              void searchPrices(item.name);
                            }}
                          >
                            从价格库选择
                          </Button>
                          {item.options.length > 0 && (
                            <Button
                              variant="ghost"
                              size="sm"
                              disabled={busy}
                              onClick={() => reject(item.candidateIndex)}
                            >
                              不匹配
                            </Button>
                          )}
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {manualIndex !== null && (
            <div className="scheme-price-search">
              <div>
                <h3>从价格库选择</h3>
                <p>只显示当前账号有权限使用的价格项目。</p>
              </div>
              <div className="scheme-price-search-row">
                <input
                  value={search}
                  maxLength={80}
                  placeholder="搜索价格项目名称"
                  onChange={(event) => setSearch(event.target.value)}
                />
                <Button disabled={searching || busy} onClick={() => void searchPrices()}>
                  {searching ? '搜索中…' : '搜索'}
                </Button>
                <Button variant="ghost" onClick={() => setManualIndex(null)}>
                  关闭
                </Button>
              </div>
              {searchItems.length > 0 && (
                <div className="scheme-price-search-results">
                  {searchItems.map((item) => (
                    <div key={item.priceItemId}>
                      <span>
                        <strong>{item.priceName}</strong> · ¥{money(item.amount)} · {sourceLabel(item.source)}
                        {item.projectName ? ' · ' + item.projectName : ''}
                      </span>
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={busy}
                        onClick={() => choose(manualIndex, item.priceItemId)}
                      >
                        采用
                      </Button>
                    </div>
                  ))}
                </div>
              )}
              {!searching && search.length > 0 && searchItems.length === 0 && (
                <p className="analysis-note">没有找到可用价格项目。</p>
              )}
            </div>
          )}

          {costing.warnings.map((warning) => (
            <p className="scheme-costing-warning" key={warning}>{warning}</p>
          ))}
          <div className="scheme-costing-footer">
            <div>
              {costing.knownPerPerson === null ? (
                <span>已知人均成本：待确认</span>
              ) : (
                <span>已知人均成本：¥{money(costing.knownPerPerson)} / 人</span>
              )}
              {!costing.allRequiredResolved && (
                <small>不包含尚未确定的成本项目</small>
              )}
            </div>
            {costing.allRequiredResolved && (
              <strong>当前可计算总成本：¥{money(costing.knownCostTotal)}</strong>
            )}
            <Button disabled={busy || !costing.items.some((item) => item.total !== null)} onClick={bringToPricing}>
              带入研学定价台
            </Button>
          </div>
        </>
      )}
      {!costing && !error && (
        <p className="analysis-note">请先完成智能成本分析，然后点击“匹配现有价格”。</p>
      )}
      {costing && costing.items.length === 0 && (
        <p className="analysis-note">分析结果没有成本候选项，暂时没有可匹配内容。</p>
      )}
    </section>
  );
}

