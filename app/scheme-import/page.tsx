'use client';
import { useRef, useState } from 'react';
import { SchemeLink as Link } from '@/components/scheme-link';
import { SchemeAccount } from '@/components/scheme-account';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { GlobalNav } from '@/components/global-nav';
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
      setMessage('请先在上方使用账号登录，再保存方案。');
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
      setMessage('方案已成功保存至您的方案库！');
    } catch (e) {
      setMessage(e instanceof Error ? e.message : '保存失败，请重试');
    } finally {
      lock.current = false;
      setBusy(false);
    }
  }

  return (
    <div className="min-h-screen bg-[#f8f7f2] flex flex-col">
      <GlobalNav active="import" />
      <main className="max-w-4xl mx-auto px-4 sm:px-6 py-8 w-full flex-1">
        <div className="flex flex-col md:flex-row md:items-center justify-between pb-6 mb-6 border-b border-stone-200/80 gap-4">
          <div>
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-emerald-800 mb-1">
              <span>🌾 研学教案快速入库</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-serif font-bold text-stone-900 tracking-tight">
              导入研学方案
            </h1>
            <p className="text-sm text-stone-600 mt-1">
              支持上传 DOCX 或 TXT 文本，系统将自动清洗正文、识别流程并为成本测算做准备。
            </p>
          </div>
          <div className="flex items-center gap-3">
            <a
              href="/schemes"
              className="inline-flex items-center px-4 py-2 border border-stone-300 text-stone-700 bg-white hover:bg-stone-50 rounded-lg text-sm font-medium shadow-sm transition-colors"
            >
              我的方案库 →
            </a>
          </div>
        </div>

        <div className="mb-6 bg-white rounded-xl border border-stone-200/80 p-4 shadow-sm">
          <SchemeAccount onChange={setLoggedIn} />
        </div>

        <section className="bg-white rounded-xl border border-stone-200/80 p-6 sm:p-8 shadow-sm">
          <div className="border-2 border-dashed border-stone-200 hover:border-emerald-600/60 rounded-xl p-8 text-center bg-stone-50/50 hover:bg-emerald-50/20 transition-all">
            <div className="w-16 h-16 rounded-full bg-emerald-100/70 text-emerald-800 flex items-center justify-center text-3xl mx-auto mb-4 shadow-sm">
              📄
            </div>
            <h3 className="text-base font-bold text-stone-900 mb-1">
              {draft ? '点击替换当前文件' : '选择研学方案教案文件'}
            </h3>
            <p className="text-xs text-stone-500 mb-4">
              支持 DOCX、UTF-8 TXT，最大 5 MB（正文建议在 10 万字以内）
            </p>
            <label className="inline-flex items-center px-5 py-2.5 bg-emerald-800 text-white hover:bg-emerald-900 rounded-lg text-sm font-medium shadow-sm transition-all cursor-pointer">
              <span>{draft ? '重新选择方案文件' : '浏览本地文件'}</span>
              <input
                type="file"
                className="hidden"
                accept=".docx,.txt"
                disabled={busy}
                onChange={(e) => {
                  void upload(e.target.files?.[0]);
                  e.target.value = '';
                }}
              />
            </label>
          </div>

          <div className="mt-4 text-xs text-stone-500 bg-amber-50/70 border border-amber-200/60 rounded-lg p-3">
            💡 <strong>温馨提示：</strong>后台主要提取活动环节、物资需求及日程清单；暂不支持扫描件及图片 OCR 识别。
          </div>

          {draft && (
            <div className="mt-8 pt-6 border-t border-stone-100 space-y-6">
              <div>
                <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-2" htmlFor="scheme-title">
                  方案标题
                </label>
                <Input
                  id="scheme-title"
                  className="bg-white border-stone-200 text-stone-900 font-medium"
                  maxLength={120}
                  value={draft.title}
                  disabled={busy || !!saved}
                  onChange={(e) => setDraft({ ...draft, title: e.target.value })}
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <h4 className="text-xs font-bold text-stone-700 uppercase tracking-wider">
                    正文文字预览
                  </h4>
                  <span className="text-xs text-stone-500 font-mono">
                    已提取 {draft.rawText.length.toLocaleString()} 字符
                  </span>
                </div>
                <div className="bg-stone-50/80 border border-stone-200 rounded-xl p-4 text-sm text-stone-800 max-h-80 overflow-y-auto font-mono whitespace-pre-wrap leading-relaxed shadow-inner">
                  {draft.rawText}
                </div>
              </div>

              <div className="flex items-center gap-3 pt-2">
                <Button
                  className="bg-emerald-800 hover:bg-emerald-900 text-white px-6 py-2"
                  disabled={busy || !!saved}
                  onClick={save}
                >
                  {busy ? '正在保存…' : saved ? '✓ 方案已保存' : '确认并保存方案'}
                </Button>
                {saved && (
                  <span className="text-xs font-medium text-emerald-800">
                    方案已被安全收录进数据库
                  </span>
                )}
              </div>
            </div>
          )}

          {message && (
            <div className={`mt-6 p-4 rounded-xl text-sm ${saved ? 'bg-emerald-50 text-emerald-900 border border-emerald-200' : 'bg-stone-100 text-stone-700 border border-stone-200'}`}>
              {message}
            </div>
          )}

          {saved && (
            <div className="mt-6 p-5 bg-emerald-50/80 rounded-xl border border-emerald-200/80 flex flex-col sm:flex-row items-center justify-between gap-4">
              <div>
                <div className="font-bold text-emerald-950 text-sm">方案已成功保存！</div>
                <div className="text-xs text-emerald-800 mt-0.5">您可以直接查看详情，或使用 AI 助手一键提取课程成本。</div>
              </div>
              <div className="flex items-center gap-3">
                <Link
                  className="inline-flex items-center px-4 py-2 bg-emerald-800 text-white hover:bg-emerald-900 rounded-lg text-xs font-semibold shadow-sm transition-all"
                  href={'/schemes?id=' + encodeURIComponent(saved)}
                >
                  查看已保存方案 →
                </Link>
                <Link
                  className="inline-flex items-center px-4 py-2 border border-emerald-700/30 text-emerald-900 bg-white hover:bg-emerald-50 rounded-lg text-xs font-medium transition-all"
                  href={'/schemes?id=' + encodeURIComponent(saved)}
                >
                  立即分析成本
                </Link>
              </div>
            </div>
          )}
        </section>
      </main>
    </div>
  );
}

