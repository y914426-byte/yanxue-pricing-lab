'use client';
import { useEffect, useState } from 'react';
import { SchemeLink as Link } from '@/components/scheme-link';
import { useSearchParams } from 'next/navigation';
import { SchemeAccount } from '@/components/scheme-account';
import { SchemeAnalysisPanel } from '@/components/scheme-analysis';
import { SchemeCostingPanel } from '@/components/scheme-costing';
import { SchemeWorkflow } from '@/components/scheme-workflow';
import { Button } from '@/components/ui/button';
import { GlobalNav } from '@/components/global-nav';
import type { SchemeSummary, SchemeDocument } from '@/lib/scheme-input';
export default function Schemes() {
  const selectedId = useSearchParams().get('id');
  const [loggedIn, setLoggedIn] = useState(false),
    [items, setItems] = useState<SchemeSummary[]>([]),
    [detail, setDetail] = useState<SchemeDocument | null>(null),
    [offset, setOffset] = useState(0),
    [hasMore, setHasMore] = useState(false),
    [busy, setBusy] = useState(false),
    [message, setMessage] = useState(''),
    [retry, setRetry] = useState(0);
  useEffect(() => {
    if (!loggedIn) return;
    const controller = new AbortController();
    void Promise.resolve().then(() => {
      if (controller.signal.aborted) return;
      setBusy(true);
      setMessage('');
      const id = selectedId;
      setDetail(null);
      fetch(
        '/api/schemes?' +
          (id ? 'id=' + encodeURIComponent(id) : 'offset=' + offset),
        { cache: 'no-store', signal: controller.signal },
      )
        .then(async (r) => {
          const data = (await r.json()) as SchemeDocument & {
            items: SchemeSummary[];
            hasMore: boolean;
            error?: string;
          };
          if (!r.ok) throw new Error(data.error || '读取失败');
          if (!controller.signal.aborted) {
            if (id) setDetail(data);
            else {
              setItems(data.items);
              setHasMore(data.hasMore);
            }
          }
        })
        .catch((e) => {
          if (!controller.signal.aborted)
            setMessage(e instanceof Error ? e.message : '读取失败');
        })
        .finally(() => {
          if (!controller.signal.aborted) setBusy(false);
        });
    });
    return () => controller.abort();
  }, [loggedIn, offset, retry, selectedId]);
  async function remove(item: SchemeSummary) {
    if (!window.confirm('确定删除“' + item.title + '”吗？删除后无法恢复。'))
      return;
    setBusy(true);
    setMessage('');
    try {
      const r = await fetch('/api/schemes?id=' + encodeURIComponent(item.id), {
          method: 'DELETE',
        }),
        data = (await r.json()) as { error?: string };
      if (!r.ok) throw new Error(data.error || '删除失败');
      if (detail) {
        window.location.assign('/schemes');
        return;
      }
      if (items.length === 1 && offset > 0) setOffset(Math.max(0, offset - 20));
      else setRetry((v) => v + 1);
    } catch (e) {
      setMessage(e instanceof Error ? e.message : '删除失败');
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="min-h-screen bg-[#f8f7f2] flex flex-col">
      <GlobalNav active="schemes" />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-8 w-full flex-1">
        <div className="flex flex-col md:flex-row md:items-center justify-between pb-6 mb-6 border-b border-stone-200/80 gap-4">
          <div>
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-emerald-800 mb-1">
              <span>🌾 研学教案与策划资源中心</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-serif font-bold text-stone-900 tracking-tight">
              {detail ? detail.title : '研学方案知识库'}
            </h1>
            <p className="text-sm text-stone-600 mt-1">
              {detail ? `文件源：${detail.fileName} · 导入于 ${new Date(detail.createdAt).toLocaleString('zh-CN')}` : '集中沉淀江南农耕课程教案、实践手册与行程规划，支持智能解析研学成本。'}
            </p>
          </div>
          <div className="flex items-center gap-3">
            {detail ? (
              <a
                href="/schemes"
                className="inline-flex items-center px-4 py-2 border border-stone-300 text-stone-700 bg-white hover:bg-stone-50 rounded-lg text-sm font-medium shadow-sm transition-colors"
              >
                ← 返回方案列表
              </a>
            ) : (
              <a
                href="/scheme-import"
                className="inline-flex items-center px-4 py-2.5 bg-emerald-800 text-white hover:bg-emerald-900 rounded-lg text-sm font-medium shadow-sm transition-all"
              >
                ＋ 导入新方案
              </a>
            )}
          </div>
        </div>

        <div className="mb-6 bg-white rounded-xl border border-stone-200/80 p-4 shadow-sm">
          <SchemeAccount onChange={setLoggedIn} />
        </div>

        {message && (
          <div className="mb-6 p-4 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 flex items-center justify-between shadow-sm">
            <span>{message}</span>
            <Button variant="outline" size="sm" onClick={() => setRetry((v) => v + 1)}>
              重新读取
            </Button>
          </div>
        )}

        {loggedIn &&
          (busy ? (
            <div className="text-center py-16 bg-white rounded-xl border border-stone-200/80 shadow-sm text-stone-500">
              <span className="inline-block animate-spin mr-2">⏳</span> 正在加载方案数据…
            </div>
          ) : detail ? (
            <section className="space-y-6">
              <div className="bg-white rounded-xl border border-stone-200/80 p-6 shadow-sm">
                <div className="flex items-center justify-between pb-4 border-b border-stone-100 mb-6">
                  <div>
                    <h2 className="text-xl font-serif font-bold text-stone-900">{detail.title}</h2>
                    <p className="text-xs text-stone-500 mt-1">
                      原始文件：{detail.fileName} · 建立时间：{new Date(detail.createdAt).toLocaleString('zh-CN')}
                    </p>
                  </div>
                  <Button variant="outline" className="text-red-600 border-red-200 hover:bg-red-50" onClick={() => void remove(detail)}>
                    删除此方案
                  </Button>
                </div>

                <div className="mb-6">
                  <SchemeWorkflow schemeId={detail.id} />
                </div>

                <div className="my-6">
                  <h3 className="text-sm font-bold text-stone-800 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                    <span>📄</span> 方案正文原文（已提取）
                  </h3>
                  <div className="bg-stone-50/80 border border-stone-200 rounded-xl p-5 text-sm text-stone-800 max-h-96 overflow-y-auto font-mono whitespace-pre-wrap leading-relaxed shadow-inner">
                    {detail.rawText}
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-6 pt-4 border-t border-stone-100">
                  <SchemeAnalysisPanel schemeId={detail.id} />
                  <SchemeCostingPanel schemeId={detail.id} />
                </div>
              </div>
            </section>
          ) : (
            <>
              {items.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {items.map((item) => (
                    <article
                      key={item.id}
                      className="bg-white rounded-xl border border-stone-200/80 p-5 shadow-sm hover:shadow-md hover:border-emerald-700/40 transition-all flex flex-col justify-between"
                    >
                      <div>
                        <div className="flex items-center justify-between text-xs text-stone-500 mb-2">
                          <span className="bg-emerald-50 text-emerald-800 px-2.5 py-0.5 rounded-full font-medium border border-emerald-200/60">
                            研学教案
                          </span>
                          <span>{new Date(item.createdAt).toLocaleDateString('zh-CN')}</span>
                        </div>
                        <h2 className="text-lg font-serif font-bold text-stone-900 mb-2 line-clamp-1">
                          {item.title}
                        </h2>
                        <p className="text-xs text-stone-500 line-clamp-1 mb-4">
                          📄 {item.fileName}
                        </p>
                      </div>

                      <div className="pt-4 border-t border-stone-100 flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <Link
                            className="inline-flex items-center px-3 py-1.5 bg-emerald-50 text-emerald-800 hover:bg-emerald-100 rounded-lg text-xs font-semibold transition-colors"
                            href={'/schemes?id=' + encodeURIComponent(item.id)}
                          >
                            查看详情
                          </Link>
                          <Link
                            className="inline-flex items-center px-3 py-1.5 border border-stone-200 text-stone-700 hover:bg-stone-50 rounded-lg text-xs font-medium transition-colors"
                            href={'/schemes?id=' + encodeURIComponent(item.id)}
                          >
                            成本分析
                          </Link>
                        </div>
                        <button
                          type="button"
                          className="text-xs text-stone-400 hover:text-red-600 transition-colors px-2 py-1"
                          onClick={() => void remove(item)}
                        >
                          删除
                        </button>
                      </div>
                    </article>
                  ))}
                </div>
              ) : (
                <div className="text-center py-16 bg-white rounded-xl border border-dashed border-stone-300 shadow-sm">
                  <div className="w-16 h-16 rounded-full bg-emerald-50 text-emerald-800 flex items-center justify-center text-3xl mx-auto mb-4">
                    🌾
                  </div>
                  <h3 className="text-lg font-serif font-bold text-stone-900 mb-1">暂无保存的研学方案</h3>
                  <p className="text-sm text-stone-500 mb-6 max-w-sm mx-auto">
                    支持一键上传 Word/TXT 教案，后台自动解析行程与研学物资需求。
                  </p>
                  <a
                    href="/scheme-import"
                    className="inline-flex items-center px-5 py-2.5 bg-emerald-800 text-white hover:bg-emerald-900 rounded-lg text-sm font-medium shadow-sm transition-all"
                  >
                    立即导入第一份方案
                  </a>
                </div>
              )}

              {items.length > 0 && (
                <div className="flex items-center justify-between pt-6 mt-6 border-t border-stone-200/80">
                  <Button
                    variant="outline"
                    disabled={offset === 0}
                    onClick={() => setOffset((v) => Math.max(0, v - 20))}
                  >
                    上一页
                  </Button>
                  <span className="text-xs text-stone-500 font-medium">第 {Math.floor(offset / 20) + 1} 页</span>
                  <Button
                    variant="outline"
                    disabled={!hasMore}
                    onClick={() => setOffset((v) => v + 20)}
                  >
                    下一页
                  </Button>
                </div>
              )}
            </>
          ))}
      </main>
    </div>
  );
}
