'use client';
import { useRef, useState } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
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
import {
  parseDelimited,
  previewMatrix,
  modeLabel,
  groupOptions,
  type ImportPreview,
  type PriceCatalog,
  type PriceRow,
} from '@/lib/price-data';
import { money } from '@/lib/pricing';

const headers = [
  '团体类型',
  '分类',
  '项目名称',
  '计费方式',
  '单价',
  '数量',
  '批次容量',
  '最低人数',
  '最高人数',
  '备注',
  '仅计入实际成本',
  '景区/项目',
  '生效日期',
  '失效日期',
];
const keys: (keyof PriceRow)[] = [
  'groupType',
  'category',
  'name',
  'mode',
  'amount',
  'quantity',
  'capacity',
  'minPeople',
  'maxPeople',
  'note',
  'actualOnly',
  'projectName',
  'validFrom',
  'validTo',
];
function toText(rows: PriceRow[]) {
  return [headers, ...rows.map((row) => keys.map((k) => String(row[k])))]
    .map((r) => r.map((v) => '"' + v.replaceAll('"', '""') + '"').join(','))
    .join('\r\n');
}
export function PriceImport({
  source,
  existing,
  onDone,
  onCancel,
}: {
  source: 'system' | 'user';
  existing?: PriceCatalog;
  onDone: (id: string) => void;
  onCancel: () => void;
}) {
  const initial = existing ? toText(existing.items) : '';
  const [name, setName] = useState(existing?.name ?? '我的价格表'),
    [text, setText] = useState(initial);
  const [preview, setPreview] = useState<ImportPreview | null>(
    initial ? previewMatrix(parseDelimited(initial)) : null,
  );
  const [sheets, setSheets] = useState<{ sheet: string; data: unknown[][] }[]>(
      [],
    ),
    [sheet, setSheet] = useState('0');
  const [busy, setBusy] = useState(false),
    [error, setError] = useState(''),
    [fileName, setFileName] = useState('');
  const pending = useRef<{ body: string; id: string } | null>(null),
    sequence = useRef(0);
  function inspect(matrix: unknown[][]) {
    try {
      setPreview(previewMatrix(matrix));
      setError('');
    } catch (e) {
      setPreview(null);
      setError(e instanceof Error ? e.message : '无法识别表格');
    }
  }
  function paste(value: string) {
    sequence.current++;
    setSheets([]);
    setFileName('');
    setText(value);
    setPreview(null);
    try {
      inspect(parseDelimited(value));
    } catch (e) {
      setError(e instanceof Error ? e.message : '无法识别表格');
    }
  }
  async function upload(file: File) {
    const token = ++sequence.current;
    setBusy(true);
    setError('');
    setPreview(null);
    setSheets([]);
    setText('');
    setFileName(file.name);
    try {
      if (file.size > 2 * 1024 * 1024)
        throw new Error('文件不能超过 2 MB，请拆分价格表');
      if (/\.xlsx$/i.test(file.name)) {
        const { default: read } = await import('read-excel-file/browser');
        const result = await read(file);
        if (token !== sequence.current) return;
        if (!result.length) throw new Error('Excel 文件没有工作表');
        setSheets(result);
        setSheet('0');
        inspect(result[0].data);
      } else if (/\.(csv|tsv)$/i.test(file.name)) {
        const buffer = await file.arrayBuffer();
        let value: string;
        try {
          value = new TextDecoder('utf-8', { fatal: true }).decode(buffer);
        } catch {
          value = new TextDecoder('gb18030', { fatal: true }).decode(buffer);
        }
        if (token !== sequence.current) return;
        setText(value);
        inspect(parseDelimited(value));
      } else
        throw new Error('支持 .xlsx、.csv、.tsv；旧版 .xls 请先另存为 .xlsx');
    } catch (e) {
      if (token === sequence.current) {
        setPreview(null);
        setError(e instanceof Error ? e.message : '读取文件失败');
      }
    } finally {
      if (token === sequence.current) setBusy(false);
    }
  }
  async function save() {
    if (busy || !preview?.rows.length || preview.errors.length) return;
    setBusy(true);
    setError('');
    try {
      const payload = {
        source,
        name: name.trim(),
        rows: preview.rows,
        ...(existing
          ? { replacesId: existing.id, version: existing.version }
          : {}),
      };
      const body = JSON.stringify(payload);
      if (pending.current?.body !== body)
        pending.current = { body, id: crypto.randomUUID() };
      const response = await fetch('/api/price-library', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...payload, id: pending.current.id }),
      });
      const data = (await response.json()) as { error?: string; id: string };
      if (!response.ok) throw new Error(data.error || '保存失败');
      onDone(data.id);
    } catch (e) {
      setError(e instanceof Error ? e.message : '保存失败，请重试');
    } finally {
      setBusy(false);
    }
  }
  return (
    <section className="price-import" aria-label="导入价格表">
      <h3>
        {existing
          ? '编辑价格表并保存新版'
          : source === 'system'
            ? '导入系统价格库'
            : '导入我的价格库'}
      </h3>
      <p>
        单价按整次活动填写；保险或餐饮按天报价时，请先合并整次人均费用。人数范围按实际参与人数判断。
      </p>
      <label className="field" htmlFor="import-name">
        <span>价格表名称</span>
        <Input
          id="import-name"
          value={name}
          maxLength={80}
          disabled={busy}
          onChange={(e) => setName(e.target.value)}
        />
      </label>
      <div className="price-actions">
        <a href="/price-template.csv" download className="price-link">
          下载 CSV 模板
        </a>
        <label className="field" htmlFor="import-file">
          <span>上传 Excel / CSV 文件</span>
          <Input
            id="import-file"
            type="file"
            accept=".xlsx,.csv,.tsv"
            disabled={busy}
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) void upload(file);
              e.target.value = '';
            }}
          />
        </label>
      </div>
      {sheets.length > 0 && (
        <label className="field">
          <span>工作表 · {fileName}</span>
          <Select
            items={sheets.map((s, i) => ({ value: String(i), label: s.sheet }))}
            value={sheet}
            disabled={busy}
            onValueChange={(v) => {
              if (v !== null) {
                setSheet(v);
                inspect(sheets[Number(v)].data);
              }
            }}
          >
            <SelectTrigger aria-label="选择工作表">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {sheets.map((s, i) => (
                <SelectItem key={i} value={String(i)}>
                  {s.sheet}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </label>
      )}
      <label className="field">
        <span>或粘贴 CSV / 从 Excel 复制的表格（含表头）</span>
        <textarea
          rows={6}
          value={text}
          disabled={busy}
          onChange={(e) => paste(e.target.value)}
          placeholder="必填表头：团体类型、项目名称、计费方式、单价"
        />
      </label>
      {error && (
        <p role="alert" className="error-box">
          {error}
        </p>
      )}
      {preview && (
        <>
          <output>
            共 {preview.total} 行，{preview.rows.length} 行有效，
            {preview.errors.length} 个错误。
            {preview.errors.length > 0
              ? '请修正全部错误后再导入。'
              : '请核对价格和计费方式后确认。'}
          </output>
          {preview.errors.length > 0 && (
            <ul className="error-box">
              {preview.errors.map((e, i) => (
                <li key={i}>{e}</li>
              ))}
            </ul>
          )}
          {preview.rows.length > 0 && (
            <div className="price-preview">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>团型 / 项目</TableHead>
                    <TableHead>费用</TableHead>
                    <TableHead>单价 / 元</TableHead>
                    <TableHead>计费方式</TableHead>
                    <TableHead>人数范围</TableHead>
                    <TableHead>有效期</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {preview.rows.map((r, i) => (
                    <TableRow key={i}>
                      <TableCell>
                        {
                          groupOptions.find((g) => g.value === r.groupType)
                            ?.label
                        }
                        <br />
                        {r.projectName || '通用项目'}
                      </TableCell>
                      <TableCell>
                        {r.name}
                        <small>{r.note}</small>
                      </TableCell>
                      <TableCell>{money(r.amount)}</TableCell>
                      <TableCell>
                        {modeLabel(r.mode)}
                        {r.mode === 'fixed'
                          ? ` × ${r.quantity}`
                          : r.mode === 'batch'
                            ? `（${r.capacity} 人/批）`
                            : ''}
                        {r.actualOnly && ' · 仅实际成本'}
                      </TableCell>
                      <TableCell>
                        {r.minPeople}–{r.maxPeople} 人
                      </TableCell>
                      <TableCell>
                        {r.validFrom || '不限'} 至 {r.validTo || '不限'}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </>
      )}
      {existing && <p>保存新版后，旧版将停用，历史估算保留原价格。</p>}
      <div className="price-actions">
        <Button
          disabled={
            busy ||
            !name.trim() ||
            !preview?.rows.length ||
            !!preview.errors.length
          }
          onClick={save}
        >
          {busy
            ? '正在处理…'
            : source === 'system'
              ? '确认保存为系统价格'
              : '确认保存到我的价格库'}
        </Button>
        <Button variant="outline" disabled={busy} onClick={onCancel}>
          取消
        </Button>
      </div>
    </section>
  );
}
