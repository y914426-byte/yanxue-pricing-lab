import { population, type Cost, type GroupType, type Plan } from './pricing';

export const groupOptions = [
  { value: 'student', label: '学生团' },
  { value: 'family', label: '亲子团' },
  { value: 'senior', label: '老年团' },
  { value: 'adult', label: '成人团' },
  { value: 'company', label: '企业团' },
  { value: 'custom', label: '自定义' },
] as const;
export const modeOptions = [
  { value: 'fixed', label: '固定数量' },
  { value: 'person', label: '按参与人数' },
  { value: 'batch', label: '按容量分批' },
  { value: 'adult', label: '按成人' },
  { value: 'child', label: '按学生/儿童' },
  { value: 'family', label: '按家庭组数' },
] as const;
export const modeLabel = (mode: Cost['mode']) =>
  modeOptions.find((m) => m.value === mode)?.label ?? mode;
export type PriceRow = {
  groupType: GroupType;
  category: string;
  name: string;
  mode: Cost['mode'];
  amount: number;
  quantity: number;
  capacity: number;
  minPeople: number;
  maxPeople: number;
  actualOnly: boolean;
  note: string;
  projectName: string;
  validFrom: string;
  validTo: string;
};
export type PriceItem = PriceRow & {
  id: string;
  catalogId: string;
  sortOrder: number;
};
export type PriceCatalog = {
  id: string;
  name: string;
  source: 'system' | 'user';
  updatedAt: string;
  isActive: boolean;
  version: number;
  items: PriceItem[];
};
export const MAX_ROWS = 300;
export const MAX_IMPORT_BYTES = 512 * 1024;
export const uuidPattern =
  /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
export function validDate(value: string) {
  return (
    /^\d{4}-\d{2}-\d{2}$/.test(value) &&
    Number.isFinite(Date.parse(value)) &&
    new Date(value).toISOString().slice(0, 10) === value
  );
}

export function normalizeRow(input: unknown): PriceRow {
  if (!input || typeof input !== 'object' || Array.isArray(input))
    throw new Error('价格行格式无效');
  const r = input as Record<string, unknown>;
  const str = (key: string, max: number, required = false) => {
    const v = r[key] ?? '';
    if (
      typeof v !== 'string' ||
      v.trim().length > max ||
      (required && !v.trim())
    )
      throw new Error(`${key} 为空或超出长度限制`);
    return v.trim();
  };
  const num = (
    key: string,
    fallback: number | undefined,
    max: number,
    min = 0,
    integer = false,
  ) => {
    const v = r[key] ?? fallback;
    if (
      typeof v !== 'number' ||
      !Number.isFinite(v) ||
      v < min ||
      v > max ||
      (integer && !Number.isInteger(v))
    )
      throw new Error(`${key} 数值无效`);
    return v;
  };
  const groupType = str('groupType', 20, true) as GroupType,
    mode = str('mode', 20, true) as Cost['mode'];
  if (!groupOptions.some((g) => g.value === groupType))
    throw new Error('团体类型无法识别');
  if (!modeOptions.some((m) => m.value === mode))
    throw new Error('计费方式无法识别');
  if (mode === 'family' && groupType !== 'family')
    throw new Error('按家庭组数仅适用于亲子团');
  const validFrom = str('validFrom', 10),
    validTo = str('validTo', 10);
  if (
    (validFrom && !validDate(validFrom)) ||
    (validTo && !validDate(validTo)) ||
    (validFrom && validTo && validFrom > validTo)
  )
    throw new Error('有效期须为 YYYY-MM-DD，且结束日期不早于开始日期');
  const minPeople = num('minPeople', 0, 200000, 0, true),
    maxPeople = num('maxPeople', 200000, 200000, 0, true);
  if (maxPeople < minPeople) throw new Error('最高人数不能小于最低人数');
  if (r.actualOnly !== undefined && typeof r.actualOnly !== 'boolean')
    throw new Error('仅计入实际成本须为是或否');
  return {
    groupType,
    mode,
    name: str('name', 60, true),
    category: str('category', 40) || '其他',
    amount: num('amount', undefined, 10000000),
    quantity: num('quantity', 1, 10000),
    capacity: num('capacity', 1, 20000, 1, true),
    minPeople,
    maxPeople,
    actualOnly: r.actualOnly === true,
    note: str('note', 200),
    projectName: str('projectName', 80),
    validFrom,
    validTo,
  };
}

const columns: Record<string, string[]> = {
  groupType: ['团体类型', 'groupType'],
  category: ['分类', 'category'],
  name: ['项目名称', '费用名称', 'name'],
  mode: ['计费方式', 'mode'],
  amount: ['单价', 'amount'],
  quantity: ['数量', 'quantity'],
  capacity: ['批次容量', 'capacity'],
  minPeople: ['最低人数', 'minPeople'],
  maxPeople: ['最高人数', 'maxPeople'],
  note: ['备注', 'note'],
  actualOnly: ['仅计入实际成本', 'actualOnly'],
  projectName: ['景区/项目', '景区', '适用项目', 'projectName'],
  validFrom: ['生效日期', 'validFrom'],
  validTo: ['失效日期', 'validTo'],
};
export type ImportPreview = {
  rows: PriceRow[];
  errors: string[];
  total: number;
};
function cellText(value: unknown): string {
  if (value === null || value === undefined) return '';
  if (value instanceof Date) {
    if (!Number.isFinite(value.getTime())) throw new Error('日期无效');
    return value.toISOString().slice(0, 10);
  }
  if (['string', 'number', 'boolean'].includes(typeof value))
    return String(value as string | number | boolean).trim();
  throw new Error('单元格须为文本、数字或日期');
}
export function previewMatrix(matrix: unknown[][]): ImportPreview {
  const [header, ...body] = matrix;
  if (!header) throw new Error('表格为空');
  const headers = header.map((v) => cellText(v).replace(/^\uFEFF/, ''));
  const positions: Record<string, number> = {};
  for (const [key, names] of Object.entries(columns)) {
    const hits = headers.flatMap((h, i) => (names.includes(h) ? [i] : []));
    if (hits.length > 1) throw new Error(`表头重复：${names[0]}`);
    positions[key] = hits[0] ?? -1;
  }
  for (const key of ['groupType', 'name', 'mode', 'amount'])
    if (positions[key] < 0) throw new Error(`缺少必填表头：${columns[key][0]}`);
  const rows: PriceRow[] = [],
    errors: string[] = [];
  let total = 0;
  const seen = new Set<string>();
  body.forEach((cells, i) => {
    if (cells.every((v) => v === null || v === undefined || v === '')) return;
    total++;
    if (total > MAX_ROWS) return;
    try {
      if (cells.every((v) => cellText(v) === '')) {
        total--;
        return;
      }
      if (cells.slice(headers.length).some((v) => cellText(v) !== ''))
        throw new Error('数据列多于表头，请检查逗号或引号');
      const r: Record<string, string | number | boolean> = {};
      for (const [key, position] of Object.entries(positions)) {
        if (position < 0) continue;
        const v = cells[position];
        if (cellText(v) === '') continue;
        r[key] = cellText(v);
      }
      if (r.amount === undefined)
        throw new Error('单价不能为空；免费项目请填写 0');
      for (const key of [
        'amount',
        'quantity',
        'capacity',
        'minPeople',
        'maxPeople',
      ])
        if (r[key] !== undefined) {
          if (!/^(?:\d+(?:\.\d+)?|\.\d+)$/.test(String(r[key])))
            throw new Error(`${columns[key][0]} 须填写非负数字`);
          r[key] = Number(r[key]);
        }
      r.groupType =
        groupOptions.find(
          (g) => g.value === r.groupType || g.label === r.groupType,
        )?.value ?? r.groupType;
      const aliases: Record<string, string> = {
        按人数: 'person',
        按儿童: 'child',
        按学生: 'child',
        按家庭: 'family',
      };
      r.mode =
        modeOptions.find((m) => m.value === r.mode || m.label === r.mode)
          ?.value ??
        aliases[String(r.mode)] ??
        r.mode;
      if (r.actualOnly !== undefined) {
        if (
          !['是', '否', 'true', 'false', '1', '0'].includes(
            String(r.actualOnly),
          )
        )
          throw new Error('仅计入实际成本须为是或否');
        r.actualOnly = ['是', 'true', '1'].includes(String(r.actualOnly));
      }
      const row = normalizeRow(r),
        key = JSON.stringify(row);
      if (seen.has(key)) throw new Error('与前面的价格行完全重复');
      seen.add(key);
      rows.push(row);
    } catch (e) {
      errors.push(
        `第 ${i + 2} 行：${e instanceof Error ? e.message : '数据无效'}`,
      );
    }
  });
  if (!total) errors.push('至少需要 1 行价格数据');
  if (total > MAX_ROWS)
    errors.push(`一次最多导入 ${MAX_ROWS} 行，请拆分价格表`);
  return { rows, errors, total };
}

// CSV/TSV with escaped quotes, embedded separators and multiline quoted cells.
export function parseDelimited(text: string): unknown[][] {
  if (new TextEncoder().encode(text).length > MAX_IMPORT_BYTES)
    throw new Error('文本不能超过 512 KB');
  text = text.replace(/^\uFEFF/, '');
  const separator = text.split(/\r?\n/, 1)[0].includes('\t') ? '\t' : ',';
  const rows: string[][] = [];
  let row: string[] = [],
    cell = '',
    quoted = false,
    closed = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (quoted) {
      if (c === '"') {
        if (text[i + 1] === '"') {
          cell += '"';
          i++;
        } else {
          quoted = false;
          closed = true;
        }
      } else cell += c;
      continue;
    }
    if (c === '"') {
      if (cell || closed) throw new Error('引号格式无效');
      quoted = true;
      continue;
    }
    if (c === separator) {
      row.push(cell);
      cell = '';
      closed = false;
      continue;
    }
    if (c === '\n' || c === '\r') {
      if (c === '\r' && text[i + 1] === '\n') i++;
      row.push(cell);
      rows.push(row);
      row = [];
      cell = '';
      closed = false;
      continue;
    }
    if (closed) {
      if (c === ' ') continue;
      throw new Error('引号结束后出现无效字符');
    }
    cell += c;
  }
  if (quoted) throw new Error('引号未闭合');
  row.push(cell);
  rows.push(row);
  return rows;
}

export function matchesPrice(item: PriceItem, plan: Plan) {
  const count = population(plan).attendees;
  if (
    !Number.isFinite(count) ||
    count < item.minPeople ||
    count > item.maxPeople
  )
    return false;
  if (
    item.groupType !==
    (plan.groupType ?? (plan.billing === 'family' ? 'family' : 'student'))
  )
    return false;
  if (item.projectName && item.projectName !== plan.priceProject) return false;
  if (item.validFrom || item.validTo) {
    if (!plan.travelDate || !validDate(plan.travelDate)) return false;
    if (item.validFrom && plan.travelDate < item.validFrom) return false;
    if (item.validTo && plan.travelDate > item.validTo) return false;
  }
  return item.mode !== 'family' || plan.billing === 'family';
}

export function adoptPrices(
  plan: Plan,
  catalog: PriceCatalog,
  items: PriceItem[],
): Plan {
  const additions: Cost[] = [];
  for (const item of items) {
    if (!matchesPrice(item, plan))
      throw new Error('匹配条件已变化，请重新选择价格');
    if (
      plan.costs.some(
        (c) => c.name === item.name || c.priceOrigin?.itemId === item.id,
      ) ||
      additions.some((c) => c.name === item.name)
    )
      continue;
    additions.push({
      id: crypto.randomUUID(),
      name: item.name,
      mode: item.mode,
      amount: item.amount,
      quantity: item.quantity,
      capacity: item.capacity,
      actualOnly: item.actualOnly,
      priceOrigin: {
        catalogId: catalog.id,
        catalogName: catalog.name,
        itemId: item.id,
        source: catalog.source,
        version: catalog.version,
        unitPrice: item.amount,
        adoptedAt: new Date().toISOString(),
        projectName: item.projectName,
        travelDate: plan.travelDate ?? '',
      },
    });
  }
  if (plan.costs.length + additions.length > 100)
    throw new Error('加入后超过 100 项成本，请先精简成本明细');
  return { ...plan, costs: [...plan.costs, ...additions] };
}
