'use client';
import { useRef, useState } from 'react';
import Link from 'next/link';
import { SchemeAccount } from '@/components/scheme-account';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { parseSchemeFile } from '@/lib/scheme-parser';
import { parseSchemeInput, type SchemeInput } from '@/lib/scheme-input';
export default function SchemeImport() {
  const [loggedIn, setLoggedIn] = useState(false),
    [draft, setDraft] = useState<SchemeInput | null>(null),
    [busy, setBusy] = useState(false),
    [message, setMessage] = useState(''),
    [saved, setSaved] = useState('');
  const lock = useRef(false);
  async function upload(file?: File) {
    if (!file || lock.current) return;
    lock.current = true;
    setBusy(true);
    setDraft(null);
    setSaved('');
    setMessage('正在解析…');
    try {
      setDraft(await parseSchemeFile(file));
      setMessage('解析完成，请核对文字后保存。');
    } catch (e) {
      setMessage(e instanceof Error ? e.message : '解析失败，请重新上传');
    } finally {
      lock.current = false;
      setBusy(false);
    }
  }
  async function save() {
    if (!loggedIn) {
      setMessage('请先在上方使用 Google 登录，再保存方案。');
      return;
    }
    if (!draft || lock.current) return;
    lock.current = true;
    setBusy(true);
    try {
      const value = parseSchemeInput(draft);
      const r = await fetch('/api/schemes', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(value),
        }),
        data = (await r.json()) as { id: string; error?: string };
      if (!r.ok) throw new Error(data.error || '保存失败');
      setSaved(data.id);
      setMessage('方案已保存。');
    } catch (e) {
      setMessage(e instanceof Error ? e.message : '保存失败，请重试');
    } finally {
      lock.current = false;
      setBusy(false);
    }
  }
  return (
    <main className="workspace scheme-workspace">
      <nav className="scheme-actions">
        <Link className="price-link" href="/">
          ← 返回研学定价台
        </Link>
        <Link className="price-link" href="/schemes">
          我的方案
        </Link>
      </nav>
      <div className="page-title">
        <div>
          <h1>导入研学方案</h1>
          <p>上传、预览并保存活动方案，方便随时查阅。</p>
        </div>
      </div>
      <SchemeAccount onChange={setLoggedIn} />
      <section className="panel scheme-panel">
        <label className="field">
          <span>{draft ? '重新上传方案' : '选择方案文件'}</span>
          <input
            type="file"
            accept=".docx,.txt"
            disabled={busy}
            onChange={(e) => {
              void upload(e.target.files?.[0]);
              e.target.value = '';
            }}
          />
        </label>
        <p className="muted">
          支持 DOCX、UTF-8 TXT，最大 5 MB，正文最多 10 万字符。暂不支持
          PDF、扫描件或图片识别。只保存解析文本，不保存原始文件。
        </p>
        {draft && (
          <>
            <label className="field" htmlFor="scheme-title">
              <span>方案名称</span>
              <Input
                id="scheme-title"
                maxLength={120}
                value={draft.title}
                disabled={busy || !!saved}
                onChange={(e) => setDraft({ ...draft, title: e.target.value })}
              />
            </label>
            <h2>文字预览 · {draft.rawText.length} 字符</h2>
            <pre className="scheme-text">{draft.rawText}</pre>
            <Button disabled={busy || !!saved} onClick={save}>
              {busy ? '处理中…' : saved ? '已保存' : '保存方案'}
            </Button>
          </>
        )}
        <output aria-live="polite">{message}</output>
        {saved && (
          <Link
            className="price-link"
            href={'/schemes?id=' + encodeURIComponent(saved)}
          >
            查看已保存方案 →
          </Link>
        )}
      </section>
    </main>
  );
}
