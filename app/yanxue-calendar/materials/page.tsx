'use client';

import { useEffect, useMemo, useState } from 'react';
import { GoogleSignIn } from '@/components/google-sign-in';
import { QQSignIn } from '@/components/qq-sign-in';
import { GlobalNav } from '@/components/global-nav';
import { Printer, PackageCheck, AlertCircle, Calendar as CalendarIcon, ArrowRight } from 'lucide-react';

type M = { name: string; qty: string; note: string; done: boolean };
type E = { id: string; date: string; name: string; audience: string; people: number; place: string; status: string; flow: string; materials: M[]; note: string };
type A = { user: { displayName: string; email: string } | null; clientId: string | null };
type Use = { eventId: string; materialIndex: number; date: string; eventName: string; qty: string; done: boolean; note: string };
type Item = { name: string; unit: string; total: number; uses: Use[] };

function parseQty(q: string) {
  const m = String(q || '').trim().match(/([0-9]+(?:\.[0-9]+)?)\s*(.*)$/);
  return m ? { num: Number(m[1]), unit: m[2] || '' } : { num: 0, unit: '' };
}

const errorText = (value: string) =>
  value.includes('no such table: learning_calendar_events')
    ? '日历数据表尚未初始化，请先应用 0009_learning_calendar.sql 迁移。'
    : value;

export default function Materials() {
  const [events, setEvents] = useState<E[]>([]);
  const [month, setMonth] = useState(new Date().toISOString().slice(0, 7));
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [account, setAccount] = useState<A | null | undefined>(undefined);
  const [canEdit, setCanEdit] = useState(false);
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<'all' | 'pending' | 'ready'>('all');
  const [saving, setSaving] = useState('');
  const [drafts, setDrafts] = useState<Record<string, { qty?: string; note?: string }>>({});

  const load = async (showLoading = true) => {
    if (showLoading) setLoading(true);
    try {
      const r = await fetch('/api/learning-calendar', { cache: 'no-store' });
      const d = (await r.json()) as any;
      if (!r.ok) throw new Error(d.error || '读取失败');
      setEvents(d.events || []);
      setCanEdit(!!d.canEdit);
      setError('');
    } catch (e) {
      setError(errorText(e instanceof Error ? e.message : '读取失败'));
    } finally {
      if (showLoading) setLoading(false);
    }
  };

  const loadAccount = async () => {
    try {
      const r = await fetch('/api/account', { cache: 'no-store' });
      const d = (await r.json()) as any;
      if (!r.ok) throw new Error();
      setAccount(d);
    } catch {
      setAccount(null);
    }
  };

  const signOut = async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    setCanEdit(false);
    await loadAccount();
    await load();
  };

  useEffect(() => {
    void load();
    void loadAccount();
  }, []);

  const monthEvents = useMemo(() => events.filter((e) => e.date.startsWith(month)), [events, month]);

  const items = useMemo(() => {
    const map = new Map<string, Item>();
    for (const e of monthEvents) {
      for (const [i, m] of (e.materials || []).entries()) {
        const name = String(m.name || '').trim();
        if (!name) continue;
        const q = parseQty(m.qty);
        const item = map.get(name) || { name, unit: q.unit, total: 0, uses: [] };
        if (q.unit && !item.unit) item.unit = q.unit;
        item.total += q.num;
        item.uses.push({
          eventId: e.id,
          materialIndex: i,
          date: e.date,
          eventName: e.name,
          qty: String(m.qty || ''),
          done: !!m.done,
          note: String(m.note || ''),
        });
        map.set(name, item);
      }
    }
    return [...map.values()].sort((a, b) => b.total - a.total || a.name.localeCompare(b.name, 'zh-CN'));
  }, [monthEvents]);

  const visible = useMemo(
    () =>
      items
        .map((item) => ({
          ...item,
          uses: item.uses.filter(
            (use) =>
              (!query ||
                `${item.name} ${use.eventName} ${use.note}`.toLowerCase().includes(query.trim().toLowerCase())) &&
              (filter === 'all' || (filter === 'pending' ? !use.done : use.done))
          ),
        }))
        .filter((item) => item.uses.length > 0),
    [items, query, filter]
  );

  const uses = items.flatMap((item) => item.uses);
  const pending = uses.filter((x) => !x.done).length;
  const ready = uses.length - pending;
  const people = monthEvents.reduce((sum, e) => sum + Number(e.people || 0), 0);

  const shift = (n: number) => {
    const [y, m] = month.split('-').map(Number);
    const d = new Date(y, m - 1 + n, 1);
    setMonth(d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0'));
  };

  const updateUse = async (use: Use, patch: Partial<Pick<M, 'qty' | 'note' | 'done'>>) => {
    if (!canEdit) return;
    const key = use.eventId + ':' + use.materialIndex;
    const source = events.find((e) => e.id === use.eventId);
    if (!source) return;
    setSaving(key);
    setError('');
    const next = {
      ...source,
      materials: source.materials.map((m, i) => (i === use.materialIndex ? { ...m, ...patch } : m)),
    };
    try {
      const r = await fetch('/api/learning-calendar', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(next),
      });
      const d = (await r.json()) as any;
      if (!r.ok) throw new Error(d.error || '保存失败');
      setDrafts((old) => ({
        ...old,
        [key]: {
          ...old[key],
          ...(patch.qty !== undefined ? { qty: undefined } : {}),
          ...(patch.note !== undefined ? { note: undefined } : {}),
        },
      }));
      await load(false);
    } catch (e) {
      setError(errorText(e instanceof Error ? e.message : '保存失败'));
    } finally {
      setSaving('');
    }
  };

  const commitField = async (use: Use, field: 'qty' | 'note') => {
    const key = use.eventId + ':' + use.materialIndex;
    const value = drafts[key]?.[field] ?? use[field];
    if (value !== use[field]) {
      await updateUse(use, field === 'qty' ? { qty: value } : { note: value });
    } else {
      setDrafts((old) => ({ ...old, [key]: { ...old[key], [field]: undefined } }));
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#f8f7f2] text-[#1e2c22]">
      <GlobalNav
        active="materials"
        extraRight={
          <button
            type="button"
            onClick={() => window.print()}
            className="global-btn-cta"
            style={{ background: '#ffffff', color: '#27563c', border: '1px solid #e3ded2' }}
          >
            <Printer className="w-4 h-4" /> 打印备货清单
          </button>
        }
      />
      <style>{materialsStyles}</style>

      <main className="flex-1 max-w-[1440px] w-full mx-auto px-6 sm:px-8 py-8 space-y-6">
        {/* 顶部标题区 */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4 pb-2 border-b border-[#e3ded2]">
          <div>
            <span className="text-xs font-bold text-[#5d6e62] tracking-wider uppercase">
              OPERATIONS · MATERIALS HUB
            </span>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-[#1e2c22] mt-1">
              研学物资准备中心
            </h1>
            <p className="text-xs sm:text-sm text-[#5d6e62] mt-1">
              按月汇总全园活动物资需求；后勤与带班导师协同备货，直观勾选准备状态。
            </p>
          </div>

          <div className="flex items-center gap-3 flex-wrap">
            {account?.user ? (
              <span className="text-xs px-3 py-1.5 rounded-lg bg-white border border-[#e3ded2] text-[#5d6e62]">
                当前登录：<strong className="text-[#1e2c22]">{account.user.email}</strong>
                {canEdit ? (
                  <span className="ml-1.5 text-[#27563c] font-bold">（管理员）</span>
                ) : (
                  <span className="ml-1.5 text-amber-600 font-bold">（访客只读）</span>
                )}
              </span>
            ) : (
              <div className="flex items-center gap-2 flex-wrap">
                {account?.clientId && (
                  <GoogleSignIn
                    clientId={account.clientId}
                    onSuccess={() => {
                      void (async () => {
                        await loadAccount();
                        await load();
                      })();
                    }}
                  />
                )}
                <QQSignIn
                  onSuccess={() => {
                    void (async () => {
                      await loadAccount();
                      await load();
                    })();
                  }}
                />
              </div>
            )}

            {account?.user && (
              <button
                className="text-xs px-3 py-1.5 rounded-lg border border-[#e3ded2] bg-white hover:bg-gray-50 text-[#5d6e62]"
                onClick={signOut}
              >
                切换账号
              </button>
            )}
          </div>
        </div>

        {error && (
          <div className="p-3.5 bg-red-50 text-red-700 text-xs rounded-xl border border-red-200 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* 汇总统计看板 */}
        <section className="grid grid-cols-2 sm:grid-cols-5 gap-4">
          <div className="p-4 rounded-xl bg-white border border-[#e3ded2] shadow-sm">
            <span className="text-xs text-[#5d6e62]">本月活动场次</span>
            <strong className="block text-2xl font-extrabold text-[#1e2c22] mt-1">
              {monthEvents.length} <small className="text-xs font-normal text-[#5d6e62]">场</small>
            </strong>
          </div>
          <div className="p-4 rounded-xl bg-white border border-[#e3ded2] shadow-sm">
            <span className="text-xs text-[#5d6e62]">物资品类总数</span>
            <strong className="block text-2xl font-extrabold text-[#27563c] mt-1">
              {items.length} <small className="text-xs font-normal text-[#5d6e62]">项</small>
            </strong>
          </div>
          <div className="p-4 rounded-xl bg-white border border-[#e3ded2] shadow-sm">
            <span className="text-xs text-[#5d6e62]">待准备事项</span>
            <strong className="block text-2xl font-extrabold text-[#d97706] mt-1">
              {pending} <small className="text-xs font-normal text-[#5d6e62]">项</small>
            </strong>
          </div>
          <div className="p-4 rounded-xl bg-white border border-[#e3ded2] shadow-sm">
            <span className="text-xs text-[#5d6e62]">已就绪完成</span>
            <strong className="block text-2xl font-extrabold text-[#16a34a] mt-1">
              {ready} <small className="text-xs font-normal text-[#5d6e62]">项</small>
            </strong>
          </div>
          <div className="p-4 rounded-xl bg-white border border-[#e3ded2] shadow-sm col-span-2 sm:col-span-1">
            <span className="text-xs text-[#5d6e62]">预计参与总人数</span>
            <strong className="block text-2xl font-extrabold text-[#1e2c22] mt-1">
              {people} <small className="text-xs font-normal text-[#5d6e62]">人</small>
            </strong>
          </div>
        </section>

        {/* 筛选与操作栏 */}
        <div className="p-4 rounded-xl bg-white border border-[#e3ded2] shadow-sm flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <button
              aria-label="上个月"
              onClick={() => shift(-1)}
              className="px-2 py-1 rounded-lg border border-[#e3ded2] bg-[#f8f7f2] hover:bg-white text-xs font-bold"
            >
              ‹
            </button>
            <strong className="text-base font-bold text-[#1e2c22] px-2">
              {month.slice(0, 4)} 年 {Number(month.slice(5))} 月
            </strong>
            <button
              aria-label="下个月"
              onClick={() => shift(1)}
              className="px-2 py-1 rounded-lg border border-[#e3ded2] bg-[#f8f7f2] hover:bg-white text-xs font-bold"
            >
              ›
            </button>
            <button
              onClick={() => setMonth(new Date().toISOString().slice(0, 7))}
              className="text-xs font-semibold px-2.5 py-1.5 rounded-lg border border-[#e3ded2] bg-[#f8f7f2] hover:bg-white text-[#27563c]"
            >
              回到本月
            </button>
          </div>

          <input
            placeholder="搜索物资品名、对应活动或备注…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="flex-1 max-w-sm text-xs px-3 py-2 rounded-lg border border-[#e3ded2] bg-[#f8f7f2] focus:bg-white focus:outline-none focus:border-[#27563c]"
          />

          <div className="flex rounded-lg border border-[#e3ded2] p-0.5 bg-[#f8f7f2] text-xs">
            <button
              className={`px-3 py-1.5 rounded-md font-semibold transition-colors ${
                filter === 'all' ? 'bg-white text-[#27563c] shadow-sm' : 'text-[#5d6e62]'
              }`}
              onClick={() => setFilter('all')}
            >
              全部 ({items.length})
            </button>
            <button
              className={`px-3 py-1.5 rounded-md font-semibold transition-colors ${
                filter === 'pending' ? 'bg-white text-[#d97706] shadow-sm' : 'text-[#5d6e62]'
              }`}
              onClick={() => setFilter('pending')}
            >
              待准备 ({pending})
            </button>
            <button
              className={`px-3 py-1.5 rounded-md font-semibold transition-colors ${
                filter === 'ready' ? 'bg-white text-[#16a34a] shadow-sm' : 'text-[#5d6e62]'
              }`}
              onClick={() => setFilter('ready')}
            >
              已就绪 ({ready})
            </button>
          </div>
        </div>

        {!canEdit && (
          <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-800 flex justify-between items-center">
            <span>
              {account?.user
                ? '当前登录账号没有物资备货的修改权限。'
                : '以管理员账号登录后，可直接在下方勾选物资准备完成状态。'}
            </span>
            <a href="/yanxue-calendar" className="text-[#27563c] font-bold hover:underline">
              前往活动排期日历 →
            </a>
          </div>
        )}

        {/* 物资卡片列表 */}
        {loading ? (
          <div className="py-20 text-center text-xs text-[#5d6e62]">正在读取物资清单…</div>
        ) : visible.length === 0 ? (
          <div className="py-20 bg-white rounded-2xl border border-dashed border-[#e3ded2] text-center space-y-3">
            <PackageCheck className="w-10 h-10 mx-auto text-[#8b998e]" />
            <p className="text-sm font-semibold text-[#1e2c22]">
              {items.length === 0 ? '本月暂无活动填写物资需求。' : '没有符合当前搜索和筛选条件的物资。'}
            </p>
            {canEdit && (
              <a
                href="/yanxue-calendar"
                className="inline-flex items-center gap-1.5 text-xs font-bold text-[#27563c] hover:underline"
              >
                返回活动日历添加或编辑物资 →
              </a>
            )}
          </div>
        ) : (
          <section className="space-y-4">
            {visible.map((item) => (
              <article
                key={item.name}
                className="bg-white rounded-2xl border border-[#e3ded2] shadow-sm overflow-hidden"
              >
                <header className="p-4 bg-[#fbfaf7] border-b border-[#e3ded2] flex justify-between items-center">
                  <div>
                    <h2 className="text-base font-bold text-[#1e2c22]">{item.name}</h2>
                    {item.unit && (
                      <small className="text-xs text-[#5d6e62]">计量单位：{item.unit}</small>
                    )}
                  </div>
                  <strong className="text-base font-extrabold text-[#27563c]">
                    月度总需：{item.total ? item.total + (item.unit ? ' ' + item.unit : '') : item.uses.map((x) => x.qty).join('、')}
                  </strong>
                </header>

                <div className="divide-y divide-[#f1eee5]">
                  {item.uses.map((use) => {
                    const key = use.eventId + ':' + use.materialIndex;
                    return (
                      <div
                        key={key}
                        className="p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-[#faf9f5] transition-colors"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <time className="text-xs font-bold text-[#27563c] w-20 flex-shrink-0">
                            {use.date}
                          </time>
                          <strong className="text-xs font-bold text-[#1e2c22] truncate max-w-xs">
                            {use.eventName}
                          </strong>
                        </div>

                        <div className="flex items-center gap-4 flex-1 justify-end">
                          {canEdit ? (
                            <div className="flex items-center gap-2 text-xs">
                              <label className="flex items-center gap-1 text-[#5d6e62]">
                                <span>数量:</span>
                                <input
                                  value={drafts[key]?.qty ?? use.qty}
                                  disabled={saving === key}
                                  onChange={(e) =>
                                    setDrafts((old) => ({
                                      ...old,
                                      [key]: { ...old[key], qty: e.target.value },
                                    }))
                                  }
                                  onBlur={() => void commitField(use, 'qty')}
                                  onKeyDown={(e) => {
                                    if (e.key === 'Enter') e.currentTarget.blur();
                                  }}
                                  className="w-24 p-1 rounded border border-[#e3ded2] bg-white text-xs"
                                />
                              </label>
                              <label className="flex items-center gap-1 text-[#5d6e62]">
                                <span>备注:</span>
                                <input
                                  value={drafts[key]?.note ?? use.note}
                                  disabled={saving === key}
                                  onChange={(e) =>
                                    setDrafts((old) => ({
                                      ...old,
                                      [key]: { ...old[key], note: e.target.value },
                                    }))
                                  }
                                  onBlur={() => void commitField(use, 'note')}
                                  onKeyDown={(e) => {
                                    if (e.key === 'Enter') e.currentTarget.blur();
                                  }}
                                  className="w-32 p-1 rounded border border-[#e3ded2] bg-white text-xs"
                                />
                              </label>
                            </div>
                          ) : (
                            <div className="text-xs text-[#5d6e62]">
                              <span>{use.qty || '未填数量'}</span>
                              {use.note && <span className="ml-1 text-[#8b998e]">（{use.note}）</span>}
                            </div>
                          )}

                          <button
                            disabled={!canEdit || saving === key}
                            onClick={() => void updateUse(use, { done: !use.done })}
                            className={`text-xs px-3 py-1.5 rounded-full font-bold transition-colors ${
                              use.done
                                ? 'bg-[#edf5ef] text-[#27563c] border border-[#c9e3d2]'
                                : 'bg-[#fef7ec] text-[#d97706] border border-[#f7dfbe]'
                            }`}
                          >
                            {saving === key ? '保存中…' : use.done ? '✓ 已就绪' : '○ 待准备'}
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </article>
            ))}
          </section>
        )}
      </main>

      <footer className="global-footer">
        <div className="global-footer-inner">
          <div>
            <strong>江南农耕研学 · 物资准备中心</strong>
            <span className="ml-3 text-xs text-[#5d6e62]">
              同名物资自动合并需求，各场活动独立保存状态。
            </span>
          </div>
          <span>© 2026 江南农耕文化研学项目组</span>
        </div>
      </footer>
    </div>
  );
}

const materialsStyles = `
  @media print {
    .global-topbar, .global-footer, .controls, .account-tools, button {
      display: none !important;
    }
    body {
      background: white !important;
    }
  }
`;
