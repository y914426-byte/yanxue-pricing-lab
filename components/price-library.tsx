'use client';
import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Database } from 'lucide-react';
import { money, population, type Plan } from '@/lib/pricing';
import {
  adoptPrices,
  matchesPrice,
  groupOptions,
  modeLabel,
  type PriceCatalog,
  type PriceItem,
} from '@/lib/price-data';
import { PriceImport } from './price-import';
type Api = {
  catalogs: PriceCatalog[];
  selectedId?: string | null;
  needsLogin?: boolean;
  canManageSystem: boolean;
  error?: string;
};
export function PriceLibrary({
  plan,
  onPlan,
  management = false,
}: {
  plan: Plan;
  onPlan: (plan: Plan) => void;
  management?: boolean;
}) {
  const source = plan.priceSource ?? (management ? 'user' : 'system'),
    group =
      plan.groupType ?? (plan.billing === 'family' ? 'family' : 'student');
  const [data, setData] = useState<Api | null>(null),
    [revision, setRevision] = useState(0),
    [error, setError] = useState(''),
    [message, setMessage] = useState('');
  const [importing, setImporting] = useState(false),
    [editing, setEditing] = useState<PriceCatalog | undefined>(),
    [changing, setChanging] = useState(false);
  const [pending, setPending] = useState<PriceCatalog | null>(null);
  const requestKey = JSON.stringify([
    source,
    group,
    plan.priceCatalogId,
    management,
    revision,
  ]);
  const [loadedKey, setLoadedKey] = useState('');
  const loading = loadedKey !== requestKey;
  const ready = !loading && !error;
  useEffect(() => {
    const refresh = () => setRevision((v) => v + 1);
    window.addEventListener('pricing-account-changed', refresh);
    return () => window.removeEventListener('pricing-account-changed', refresh);
  }, []);
  useEffect(() => {
    const controller = new AbortController();
    const query = new URLSearchParams({
      source,
      group,
      ...(management ? { manage: '1' } : {}),
      ...(plan.priceCatalogId ? { catalog: plan.priceCatalogId } : {}),
    });
    fetch('/api/price-library?' + query, {
      cache: 'no-store',
      signal: controller.signal,
    })
      .then(async (r) => {
        const value = (await r.json()) as Api;
        if (!r.ok || value.error) throw new Error(value.error || '读取失败');
        return value;
      })
      .then((value) => {
        if (!controller.signal.aborted) {
          setData(value);
          setError('');
          setLoadedKey(requestKey);
        }
      })
      .catch((e) => {
        if (!controller.signal.aborted) {
          setData(null);
          setError(e.message || '读取失败');
          setLoadedKey(requestKey);
        }
      });
    return () => controller.abort();
  }, [source, group, plan.priceCatalogId, management, revision, requestKey]);
  const catalog = ready
    ? data?.catalogs.find((c) => c.id === data.selectedId)
    : undefined;
  const eligible = useMemo(
    () =>
      catalog?.isActive
        ? catalog.items.filter((i) => matchesPrice(i, plan))
        : [],
    [catalog, plan],
  );
  const projects = [
    ...new Set(
      (catalog?.items ?? []).map((i) => i.projectName).filter(Boolean),
    ),
  ];
  const ambiguous =
    new Set(eligible.map((i) => i.name)).size !== eligible.length;
  function selectSource(value: 'system' | 'user') {
    setImporting(false);
    setEditing(undefined);
    setMessage('');
    onPlan({ ...plan, priceSource: value, priceCatalogId: '' });
  }
  function adopt(items: PriceItem[]) {
    if (!catalog || !ready) return;
    try {
      const next = adoptPrices(plan, catalog, items),
        count = next.costs.length - plan.costs.length;
      onPlan(next);
      setMessage(
        count
          ? `已加入 ${count} 项；同名或已采用项目已跳过。`
          : '同名或相同来源项目已存在，请在成本明细中核对，避免重复计费。',
      );
    } catch (e) {
      setMessage(e instanceof Error ? e.message : '无法采用价格');
    }
  }
  async function toggle() {
    if (!pending) return;
    setChanging(true);
    setError('');
    try {
      const res = await fetch('/api/price-library', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: pending.id,
          version: pending.version,
          isActive: !pending.isActive,
        }),
      });
      const value = (await res.json()) as { error?: string };
      if (!res.ok) throw new Error(value.error);
      setPending(null);
      setRevision((v) => v + 1);
      setMessage('价格库状态已更新。');
    } catch (e) {
      setError(e instanceof Error ? e.message : '保存失败');
    } finally {
      setChanging(false);
    }
  }
  return (
    <section
      className="panel price-library"
      aria-labelledby="price-library-heading"
    >
      <div className="editor-heading">
        <div>
          <div className="section-title">
            <Database size={20} />
            <h2 id="price-library-heading">
              {management ? '管理价格库' : '价格数据库'}
            </h2>
          </div>
          <p className="muted">
            {management
              ? '导入、编辑与停用价格表。个人价格仅自己可见。'
              : '选择来源后自动匹配参考价格，点击采用加入成本明细。'}
          </p>
        </div>
        <div className="price-actions">
          {!management && (
            <Link className="price-link" href="/prices">
              管理 / 导入价格库
            </Link>
          )}
          <Button
            variant="outline"
            onClick={() => setRevision((v) => v + 1)}
            disabled={loading}
          >
            刷新
          </Button>
        </div>
      </div>
      <div className="two-fields">
        <label className="field" htmlFor="price-source">
          <span>价格来源</span>
          <Select
            items={[
              { value: 'system', label: '系统价格库' },
              { value: 'user', label: '我的价格库' },
            ]}
            value={source}
            disabled={changing || importing}
            onValueChange={(v) => v && selectSource(v as 'system' | 'user')}
          >
            <SelectTrigger id="price-source" aria-label="价格来源">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="system">系统价格库</SelectItem>
              <SelectItem value="user">我的价格库</SelectItem>
            </SelectContent>
          </Select>
        </label>
        {!management && (
          <label className="field" htmlFor="price-group">
            <span>团体类型</span>
            <Select
              items={groupOptions}
              value={group}
              onValueChange={(v) => {
                if (v)
                  onPlan({
                    ...plan,
                    groupType: v as Plan['groupType'],
                    billing: v === 'family' ? 'family' : 'person',
                  });
              }}
            >
              <SelectTrigger id="price-group" aria-label="团体类型">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {groupOptions.map((g) => (
                  <SelectItem key={g.value} value={g.value}>
                    {g.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </label>
        )}
      </div>
      {loading && <output>正在读取价格库…</output>}
      {error && (
        <p role="alert" className="error-box">
          {error}
        </p>
      )}
      {data?.needsLogin && <p>请先在页面上方登录，再导入和使用个人价格库。</p>}
      {ready && !!data?.catalogs.length && (
        <label className="field" htmlFor="price-catalog">
          <span>价格表（最近 100 份）</span>
          <Select
            items={data.catalogs.map((c) => ({
              value: c.id,
              label: `${c.name} · v${c.version}${c.isActive ? '' : ' · 已停用'}`,
            }))}
            value={catalog?.id ?? ''}
            disabled={importing || changing}
            onValueChange={(v) => v && onPlan({ ...plan, priceCatalogId: v })}
          >
            <SelectTrigger id="price-catalog" aria-label="价格表">
              <SelectValue placeholder="请选择价格表" />
            </SelectTrigger>
            <SelectContent>
              {data.catalogs.map((c) => (
                <SelectItem key={c.id} value={c.id}>
                  {c.name} · v{c.version}
                  {c.isActive ? '' : ' · 已停用'}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </label>
      )}
      {!management && catalog && (
        <>
          <div className="two-fields">
            <label className="field" htmlFor="price-project">
              <span>景区 / 项目</span>
              <Input
                id="price-project"
                list="price-project-options"
                maxLength={80}
                value={plan.priceProject ?? ''}
                placeholder="留空仅显示通用价格"
                onChange={(e) =>
                  onPlan({ ...plan, priceProject: e.target.value })
                }
              />
              <datalist id="price-project-options" aria-label="可用景区或项目">
                {projects.map((p) => (
                  <option key={p} value={p}>{p}</option>
                ))}
              </datalist>
            </label>
            <label className="field" htmlFor="price-date">
              <span>出行日期</span>
              <Input
                id="price-date"
                type="date"
                value={plan.travelDate ?? ''}
                onChange={(e) =>
                  onPlan({ ...plan, travelDate: e.target.value })
                }
              />
            </label>
          </div>
          <p className="price-note">
            人数范围按实际参与的 {population(plan).attendees}{' '}
            人匹配。未填日期时，有有效期的价格不会显示。已有成本保留，请核对同类费用。
          </p>
          {plan.costs.some(
            (c) =>
              c.priceOrigin &&
              (c.priceOrigin.travelDate !== (plan.travelDate ?? '') ||
                c.priceOrigin.catalogId !== catalog.id),
          ) && (
            <p className="price-note">
              部分成本来自其他价格表或出行日期，请核对已采用价格。
            </p>
          )}
        </>
      )}
      {management && ready && (source === 'user' || data?.canManageSystem) && (
        <div className="price-actions">
          <Button
            disabled={importing || changing}
            onClick={() => {
              setEditing(undefined);
              setImporting(true);
            }}
          >
            导入{source === 'system' ? '系统' : '个人'}价格表
          </Button>
          {catalog && (
            <>
              <Button
                variant="outline"
                disabled={importing || changing}
                onClick={() => {
                  setEditing(catalog);
                  setImporting(true);
                }}
              >
                编辑 / 更新价格表
              </Button>
              <Button
                variant="outline"
                disabled={importing || changing}
                onClick={() => setPending(catalog)}
              >
                {catalog.isActive ? '停用' : '恢复'}价格表
              </Button>
            </>
          )}
        </div>
      )}
      {pending && (
        <div className="restore-prompt">
          <p>
            确认{pending.isActive ? '停用' : '恢复'}“{pending.name}”？
            {pending.isActive
              ? '停用后将不再推荐，历史估算保留原价格。'
              : '恢复后将重新参与价格推荐。'}
          </p>
          <Button disabled={changing} onClick={toggle}>
            确认
          </Button>
          <Button
            variant="outline"
            disabled={changing}
            onClick={() => setPending(null)}
          >
            取消
          </Button>
        </div>
      )}
      {importing && (
        <PriceImport
          key={editing?.id ?? source}
          source={source}
          existing={editing}
          onCancel={() => setImporting(false)}
          onDone={(id) => {
            setImporting(false);
            setEditing(undefined);
            onPlan({ ...plan, priceCatalogId: id });
            setRevision((v) => v + 1);
            setMessage('价格表已保存，可以返回测算页面采用价格。');
          }}
        />
      )}
      {message && <output className="history-message">{message}</output>}
      {!management && ambiguous && (
        <p className="price-note">
          匹配到同名的不同价格，请逐项选择，避免自动采用不适合的报价。
        </p>
      )}
      {catalog && !importing && (
        <>
          <div className="editor-heading">
            <div>
              <strong>
                {catalog.name} · v{catalog.version}
              </strong>
              <p className="price-note">
                {management
                  ? `${catalog.items.length} 条价格`
                  : `已匹配 ${eligible.length} 条价格`}{' '}
                · 单价按整次活动填写
              </p>
            </div>
            {!management && (
              <Button
                disabled={!eligible.length || ambiguous}
                onClick={() => adopt(eligible)}
              >
                采用全部匹配价格
              </Button>
            )}
          </div>
          {(management ? catalog.items : eligible).length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>费用 / 适用项目</TableHead>
                  <TableHead>计费方式</TableHead>
                  <TableHead>参考单价 / 元</TableHead>
                  <TableHead>有效期 / 备注</TableHead>
                  {!management && <TableHead>操作</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {(management ? catalog.items : eligible).map((i) => (
                  <TableRow key={i.id}>
                    <TableCell>
                      <strong>{i.name}</strong>
                      <small>
                        {i.category} ·{' '}
                        {
                          groupOptions.find((g) => g.value === i.groupType)
                            ?.label
                        }{' '}
                        · {i.projectName || '通用'}
                      </small>
                    </TableCell>
                    <TableCell>
                      {modeLabel(i.mode)}
                      {i.mode === 'fixed'
                        ? ` × ${i.quantity}`
                        : i.mode === 'batch'
                          ? `（${i.capacity} 人/批）`
                          : ''}
                    </TableCell>
                    <TableCell>¥{money(i.amount)}</TableCell>
                    <TableCell>
                      {i.validFrom || '不限'} 至 {i.validTo || '不限'}
                      <small>{i.note || '—'}</small>
                    </TableCell>
                    {!management && (
                      <TableCell>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => adopt([i])}
                        >
                          采用
                        </Button>
                      </TableCell>
                    )}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <p className="history-empty">
              暂无匹配价格。请核对团型、项目、日期或人数，也可以切换价格库。
            </p>
          )}
        </>
      )}
      {ready && !data?.catalogs.length && !data?.needsLogin && (
        <p className="history-empty">还没有价格表，请先导入。</p>
      )}
    </section>
  );
}
