'use client';
import { useEffect, useState } from 'react';
import { SchemeLink as Link } from '@/components/scheme-link';
import { useSearchParams } from 'next/navigation';
import { SchemeAccount } from '@/components/scheme-account';
import { Button } from '@/components/ui/button';
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
    <main className="workspace scheme-workspace">
      <nav className="scheme-actions">
        <Link className="price-link" href="/">
          ← 返回研学定价台
        </Link>
        <Link className="price-link" href="/scheme-import">
          导入研学方案
        </Link>
        <Link className="price-link" href="/schemes">
          我的方案
        </Link>
      </nav>
      <div className="page-title">
        <h1>{detail ? '方案详情' : '我的方案'}</h1>
      </div>
      <SchemeAccount onChange={setLoggedIn} />
      {message && (
        <output>
          {message}{' '}
          <Button variant="outline" onClick={() => setRetry((v) => v + 1)}>
            重新读取
          </Button>
        </output>
      )}
      {loggedIn &&
        (busy ? (
          <output>正在处理…</output>
        ) : detail ? (
          <section className="panel scheme-panel">
            <h2>{detail.title}</h2>
            <p>
              {detail.fileName} ·{' '}
              {new Date(detail.createdAt).toLocaleString('zh-CN')}
            </p>
            <pre className="scheme-text">{detail.rawText}</pre>
            <div className="scheme-actions">
              <Button
                onClick={() => setMessage('AI 成本分析功能将在下一阶段启用。')}
              >
                智能分析成本
              </Button>
              <Button variant="outline" onClick={() => void remove(detail)}>
                删除方案
              </Button>
            </div>
          </section>
        ) : (
          <>
            <section className="scheme-list">
              {items.map((item) => (
                <article className="panel scheme-panel" key={item.id}>
                  <h2>{item.title}</h2>
                  <p>{item.fileName}</p>
                  <p>
                    导入时间：{new Date(item.createdAt).toLocaleString('zh-CN')}
                  </p>
                  <div className="scheme-actions">
                    <Link
                      className="price-link"
                      href={'/schemes?id=' + encodeURIComponent(item.id)}
                    >
                      查看
                    </Link>
                    <Button variant="outline" onClick={() => void remove(item)}>
                      删除
                    </Button>
                  </div>
                </article>
              ))}
            </section>
            {!items.length && !message && (
              <p>还没有保存的方案，先导入一份吧。</p>
            )}
            <div className="scheme-actions">
              <Button
                variant="outline"
                disabled={offset === 0}
                onClick={() => setOffset((v) => Math.max(0, v - 20))}
              >
                上一页
              </Button>
              <Button
                variant="outline"
                disabled={!hasMore}
                onClick={() => setOffset((v) => v + 20)}
              >
                下一页
              </Button>
            </div>
          </>
        ))}
    </main>
  );
}
