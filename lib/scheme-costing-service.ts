import { sameOrigin } from './google-auth';
import {
  BILLING_HINTS,
  COST_CATEGORIES,
  activityNamesForAnalysis,
  normalizeActivityName,
  normalizeLearningCostName,
  type BillingHint,
  type CostCategory,
  type LearningSuggestion,
} from './scheme-learning';
import {
  GROUP_TYPES,
  parseSchemeAnalysis,
  type SchemeAnalysis,
} from './scheme-analysis-schema';
import {
  PRICE_SOURCES,
  costScheme,
  type AvailablePriceItem,
  type CostingCandidateMeta,
  type PricePreferenceCounts,
  type PriceSource,
  type SchemeCostingResult,
} from './scheme-costing';

const reply = (data: unknown, status = 200) =>
  Response.json(data, {
    status,
    headers: { 'Cache-Control': 'private, no-store', Vary: 'Cookie' },
  });

type SchemeRow = { id: string; raw_text: string };
type AnalysisRow = { id: string; analysis_json: string; created_at: string };
type CostingRow = {
  id: string;
  scheme_document_id: string;
  scheme_analysis_id: string;
  owner_id: string;
  price_source: string;
  match_json: string;
  known_cost_total: number;
  unresolved_count: number;
  created_at: string;
  updated_at: string;
};
type AliasRow = {
  alias_name: string;
  normalized_alias_name: string;
  canonical_name: string;
  normalized_canonical_name: string;
};
type TemplateRow = {
  id: string;
  activity_name: string;
  normalized_activity_name: string;
  group_type: string;
  cost_name: string;
  normalized_cost_name: string;
  category: string;
  billing_hint: string;
  requiredness: string;
  confidence_score: number;
  positive_count: number;
  negative_count: number;
  is_disabled: number;
};

type CostEdit = {
  name?: string;
  relatedActivity?: string | null;
  category?: CostCategory;
  billingHint?: BillingHint;
  quantity?: number | null;
  unit?: string | null;
  note?: string;
  removed?: boolean;
  removalAction?: 'removed' | 'not_applicable';
  priceItemId?: string | null;
};
type AddedCost = {
  key?: string;
  name: string;
  relatedActivity?: string | null;
  category: CostCategory;
  billingHint: BillingHint;
  quantity?: number | null;
  unit?: string | null;
  note?: string;
  source?: 'history' | 'user_added';
};

function stringValue(value: unknown, label: string, max = 100) {
  if (typeof value !== 'string' || !value.trim() || value.length > max)
    throw new Error(label + '无效');
  return value.trim();
}

function optionalString(value: unknown, label: string, max = 100) {
  if (value === undefined || value === null || value === '') return undefined;
  if (typeof value !== 'string' || value.length > max)
    throw new Error(label + '无效');
  return value.trim() || null;
}

function nullableNumber(value: unknown, label: string) {
  if (value === undefined) return undefined;
  if (value === null) return null;
  if (typeof value !== 'number' || !Number.isFinite(value) || value < 0 || value > 1000000)
    throw new Error(label + '无效');
  return value;
}

function enumValue<T extends readonly string[]>(value: unknown, values: T, label: string) {
  if (typeof value !== 'string' || !values.includes(value)) throw new Error(label + '无效');
  return value as T[number];
}

function parseEdit(value: unknown): CostEdit {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('成本编辑格式无效');
  const edit = value as Record<string, unknown>;
  const result: CostEdit = {};
  const name = optionalString(edit.name, '成本名称', 120);
  if (name !== undefined) {
    if (!name) throw new Error('成本名称不能为空');
    result.name = name;
  }
  const activity = optionalString(edit.relatedActivity, '对应活动', 120);
  if (activity !== undefined) result.relatedActivity = activity;
  if (edit.category !== undefined)
    result.category = enumValue(edit.category, COST_CATEGORIES, '成本分类');
  if (edit.billingHint !== undefined)
    result.billingHint = enumValue(edit.billingHint, BILLING_HINTS, '计费方式');
  const quantity = nullableNumber(edit.quantity, '数量');
  if (quantity !== undefined) result.quantity = quantity;
  const unit = optionalString(edit.unit, '数量单位', 30);
  if (unit !== undefined) result.unit = unit;
  const note = optionalString(edit.note, '备注', 240);
  if (note !== undefined) result.note = note ?? '';
  if (edit.removed !== undefined) {
    if (typeof edit.removed !== 'boolean') throw new Error('删除状态无效');
    result.removed = edit.removed;
  }
  if (edit.removalAction !== undefined)
    result.removalAction = enumValue(edit.removalAction, ['removed', 'not_applicable'] as const, '删除动作');
  if (edit.priceItemId !== undefined) {
    if (edit.priceItemId !== null) result.priceItemId = stringValue(edit.priceItemId, '价格项目编号');
    else result.priceItemId = null;
  }
  return result;
}

function parseAddedCost(value: unknown): AddedCost {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('新增成本格式无效');
  const item = value as Record<string, unknown>;
  const name = stringValue(item.name, '新增成本名称', 120);
  const activity = optionalString(item.relatedActivity, '对应活动', 120);
  const unit = optionalString(item.unit, '数量单位', 30);
  const note = optionalString(item.note, '备注', 240);
  const key = optionalString(item.key, '成本编号', 100);
  const source = item.source === undefined ? 'user_added' : enumValue(item.source, ['history', 'user_added'] as const, '成本来源');
  const quantity = nullableNumber(item.quantity, '数量');
  return {
    key: key ?? undefined,
    name,
    relatedActivity: activity,
    category: enumValue(item.category, COST_CATEGORIES, '成本分类'),
    billingHint: enumValue(item.billingHint, BILLING_HINTS, '计费方式'),
    quantity,
    unit,
    note: note ?? '',
    source,
  };
}

async function parseBody(request: Request) {
  const reader = request.body?.getReader();
  if (!reader) throw new Error('请求内容为空');
  let size = 0;
  let raw = '';
  const decoder = new TextDecoder();
  while (true) {
    const chunk = await reader.read();
    if (chunk.done) break;
    size += chunk.value.byteLength;
    if (size > 256 * 1024) {
      await reader.cancel();
      throw new Error('请求内容过大');
    }
    raw += decoder.decode(chunk.value, { stream: true });
  }
  const value: unknown = JSON.parse(raw + decoder.decode());
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('请求格式无效');
  const body = value as Record<string, unknown>;
  const schemeId = stringValue(body.schemeId, '方案编号');
  const priceSource = body.priceSource ?? 'personal_first';
  if (typeof priceSource !== 'string' || !PRICE_SOURCES.includes(priceSource as PriceSource))
    throw new Error('价格来源无效');
  if (body.force !== undefined && typeof body.force !== 'boolean') throw new Error('force 参数无效');
  let groupType: Exclude<SchemeAnalysis['summary']['groupType'], 'unknown'> | undefined;
  if (body.groupType !== undefined) {
    if (body.groupType === 'unknown' || typeof body.groupType !== 'string' || !GROUP_TYPES.includes(body.groupType as SchemeAnalysis['summary']['groupType']))
      throw new Error('团体类型无效');
    groupType = body.groupType as Exclude<SchemeAnalysis['summary']['groupType'], 'unknown'>;
  }
  const decisions: Record<string, string | null> = {};
  if (body.decisions !== undefined) {
    if (!body.decisions || typeof body.decisions !== 'object' || Array.isArray(body.decisions)) throw new Error('价格选择格式无效');
    for (const [key, selected] of Object.entries(body.decisions as Record<string, unknown>)) {
      if (!/^[A-Za-z0-9_-]{1,100}$/.test(key) || (selected !== null && typeof selected !== 'string')) throw new Error('价格选择格式无效');
      if (typeof selected === 'string' && (!selected || selected.length > 100)) throw new Error('价格选择格式无效');
      decisions[key] = selected as string | null;
    }
  }
  const edits: Record<string, CostEdit> = {};
  if (body.edits !== undefined) {
    if (!body.edits || typeof body.edits !== 'object' || Array.isArray(body.edits)) throw new Error('成本编辑格式无效');
    for (const [key, value] of Object.entries(body.edits as Record<string, unknown>)) {
      if (!/^(?:\d{1,3}|added-[A-Za-z0-9_-]{1,80})$/.test(key)) throw new Error('成本编号无效');
      edits[key] = parseEdit(value);
      if (Object.prototype.hasOwnProperty.call(edits[key], 'priceItemId')) decisions[key] = edits[key].priceItemId ?? null;
    }
  }
  const addedCosts: AddedCost[] = [];
  if (body.addedCosts !== undefined) {
    if (!Array.isArray(body.addedCosts) || body.addedCosts.length > 100) throw new Error('新增成本格式无效');
    for (const value of body.addedCosts) addedCosts.push(parseAddedCost(value));
  }
  return {
    schemeId,
    priceSource: priceSource as PriceSource,
    groupType,
    decisions,
    edits,
    addedCosts,
  };
}

function toPriceItem(row: Record<string, unknown>): AvailablePriceItem {
  return {
    id: String(row.id),
    catalogId: String(row.catalog_id),
    catalogName: String(row.catalog_name),
    catalogVersion: Number(row.catalog_version ?? 1),
    source: row.catalog_source === 'user' ? 'personal' : 'system',
    groupType: String(row.group_type),
    category: String(row.category),
    name: String(row.name),
    mode: String(row.mode) as AvailablePriceItem['mode'],
    amount: Number(row.amount),
    quantity: Number(row.quantity),
    capacity: Number(row.capacity),
    minPeople: Number(row.min_people),
    maxPeople: Number(row.max_people),
    actualOnly: !!row.actual_only,
    note: typeof row.note === 'string' ? row.note : '',
    projectName: typeof row.project_name === 'string' ? row.project_name : '',
    validFrom: typeof row.valid_from === 'string' ? row.valid_from : '',
    validTo: typeof row.valid_to === 'string' ? row.valid_to : '',
  };
}

async function loadOwnedScheme(db: D1Database, schemeId: string, owner: string) {
  return await db.prepare('SELECT id, raw_text FROM scheme_documents WHERE id = ? AND owner_id = ?').bind(schemeId, owner).first<SchemeRow>();
}

async function loadLatestAnalysis(db: D1Database, schemeId: string, owner: string) {
  return await db.prepare('SELECT id, analysis_json, created_at FROM scheme_analyses WHERE scheme_document_id = ? AND owner_id = ? ORDER BY created_at DESC, id DESC LIMIT 1').bind(schemeId, owner).first<AnalysisRow>();
}

async function loadAvailableItems(db: D1Database, owner: string, source: PriceSource) {
  const sourceClause = source === 'system'
    ? "AND pc.source = 'system'"
    : source === 'personal'
      ? "AND pc.source = 'user' AND pc.owner_id = ?"
      : "AND (pc.source = 'system' OR (pc.source = 'user' AND pc.owner_id = ?))";
  const bindings = source === 'system' ? [] : [owner];
  const { results } = await db.prepare(`SELECT pi.*, pc.name AS catalog_name, pc.version AS catalog_version, pc.source AS catalog_source
    FROM price_items pi JOIN price_catalogs pc ON pc.id = pi.catalog_id
    WHERE pc.is_active = 1 ${sourceClause}
    ORDER BY pc.updated_at DESC, pi.sort_order, pi.id LIMIT 3000`).bind(...bindings).all<Record<string, unknown>>();
  return results.map(toPriceItem);
}

async function loadLearningContext(db: D1Database, owner: string, analysis: SchemeAnalysis) {
  const aliasesResult = await db.prepare('SELECT alias_name, normalized_alias_name, canonical_name, normalized_canonical_name FROM activity_aliases WHERE owner_id = ? AND is_active = 1').bind(owner).all<AliasRow>();
  const aliases = aliasesResult.results;
  const resolveActivity = (name: string) => {
    const normalized = normalizeActivityName(name);
    return aliases.find((alias) => alias.normalized_alias_name === normalized)?.normalized_canonical_name ?? normalized;
  };
  const requested = activityNamesForAnalysis(analysis);
  const canonicalNames = new Set(requested.map(resolveActivity).filter(Boolean));
  const { results } = await db.prepare('SELECT * FROM activity_cost_templates WHERE owner_id = ? AND is_disabled = 0 ORDER BY positive_count DESC, confidence_score DESC, updated_at DESC LIMIT 1000').bind(owner).all<TemplateRow>();
  const suggestions: LearningSuggestion[] = [];
  const seen = new Set<string>();
  for (const row of results) {
    if (!canonicalNames.has(row.normalized_activity_name)) continue;
    if (analysis.summary.groupType !== 'unknown' && row.group_type && row.group_type !== analysis.summary.groupType) continue;
    const sourceName = requested.find((name) => resolveActivity(name) === row.normalized_activity_name) ?? row.activity_name;
    const key = [row.normalized_activity_name, row.normalized_cost_name, row.group_type].join('|');
    if (seen.has(key)) continue;
    seen.add(key);
    suggestions.push({
      activityName: row.activity_name,
      activityDisplayName: sourceName,
      normalizedActivityName: row.normalized_activity_name,
      groupType: row.group_type,
      costName: row.cost_name,
      normalizedCostName: row.normalized_cost_name,
      category: row.category,
      billingHint: row.billing_hint,
      requiredness: row.requiredness,
      confidenceScore: Number(row.confidence_score),
      positiveCount: Number(row.positive_count),
      negativeCount: Number(row.negative_count),
      level: row.positive_count >= 3 && row.confidence_score >= 0.7 ? 'high' : 'low',
      source: 'history',
    });
  }
  return suggestions;
}

async function loadPricePreferences(db: D1Database, owner: string): Promise<PricePreferenceCounts> {
  const { results } = await db.prepare('SELECT normalized_cost_name, price_item_id, positive_count FROM cost_price_aliases WHERE owner_id = ? AND is_disabled = 0').bind(owner).all<{ normalized_cost_name: string; price_item_id: string; positive_count: number }>();
  const output: PricePreferenceCounts = {};
  for (const row of results) (output[row.normalized_cost_name] ??= {})[row.price_item_id] = Number(row.positive_count);
  return output;
}

function editedAnalysis(
  analysis: SchemeAnalysis,
  edits: Record<string, CostEdit>,
  addedCosts: AddedCost[],
) {
  const candidateMeta: Record<number, CostingCandidateMeta> = {};
  const candidates = analysis.costCandidates.map((candidate, index) => {
    const edit = edits[String(index)];
    candidateMeta[index] = {
      key: String(index),
      origin: candidate.source === 'explicit' ? 'scheme_explicit' : 'ai_suggestion',
      originalName: candidate.name,
      removed: edit?.removed ?? false,
      removalAction: edit?.removalAction,
      note: edit?.note,
    };
    if (!edit) return candidate;
    const name = edit.name ?? candidate.name;
    return {
      ...candidate,
      name,
      normalizedName: normalizeLearningCostName(name),
      relatedActivity: edit.relatedActivity === undefined ? candidate.relatedActivity : edit.relatedActivity,
      category: edit.category ?? candidate.category,
      billingHint: edit.billingHint ?? candidate.billingHint,
      quantity: edit.quantity === undefined ? candidate.quantity : edit.quantity,
      unit: edit.unit === undefined ? candidate.unit : edit.unit,
    };
  });
  for (const added of addedCosts) {
    const index = candidates.length;
    const key = added.key && /^added-[A-Za-z0-9_-]{1,80}$/.test(added.key) ? added.key : 'added-' + crypto.randomUUID();
    candidates.push({
      name: added.name,
      normalizedName: normalizeLearningCostName(added.name),
      category: added.category,
      relatedActivity: added.relatedActivity ?? null,
      source: 'inferred',
      quantity: added.quantity ?? null,
      unit: added.unit ?? null,
      billingHint: added.billingHint,
      requiredness: 'possible',
      confidence: 'high',
      evidence: null,
      reason: added.note || '用户新增成本项目。',
    });
    candidateMeta[index] = {
      key,
      origin: added.source ?? 'user_added',
      originalName: added.name,
      note: added.note,
    };
  }
  return {
    analysis: { ...analysis, costCandidates: candidates },
    candidateMeta,
  };
}

function parseStoredResult(row: CostingRow) {
  const result = JSON.parse(row.match_json) as SchemeCostingResult;
  return {
    id: row.id,
    schemeId: row.scheme_document_id,
    schemeAnalysisId: row.scheme_analysis_id,
    ownerId: row.owner_id,
    priceSource: row.price_source,
    costing: result,
    knownCostTotal: row.known_cost_total,
    unresolvedCount: row.unresolved_count,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function serializeSearchItem(item: AvailablePriceItem) {
  return {
    priceItemId: item.id,
    catalogId: item.catalogId,
    catalogName: item.catalogName,
    catalogVersion: item.catalogVersion,
    source: item.source,
    priceName: item.name,
    category: item.category,
    mode: item.mode,
    amount: item.amount,
    quantity: item.quantity,
    capacity: item.capacity,
    minPeople: item.minPeople,
    maxPeople: item.maxPeople,
    projectName: item.projectName,
    validFrom: item.validFrom,
    validTo: item.validTo,
    note: item.note,
  };
}

export async function schemeCostingRequest(request: Request, owner: string | null, getDb: () => D1Database) {
  if (!owner) return reply({ error: '请先登录，再匹配方案成本' }, 401);
  const url = new URL(request.url);
  if (!['GET', 'POST'].includes(request.method)) return reply({ error: '不支持的操作' }, 405);
  if (request.method === 'POST' && !sameOrigin(request)) return reply({ error: '请求来源无效，请刷新后重试' }, 403);
  let schemeId: string;
  let source: PriceSource = 'personal_first';
  let groupType: Exclude<SchemeAnalysis['summary']['groupType'], 'unknown'> | undefined;
  let decisions: Record<string, string | null> = {};
  let edits: Record<string, CostEdit> = {};
  let addedCosts: AddedCost[] = [];
  if (request.method === 'GET') {
    try {
      schemeId = stringValue(url.searchParams.get('schemeId'), '方案编号');
      const requested = url.searchParams.get('priceSource');
      if (requested) source = enumValue(requested, PRICE_SOURCES, '价格来源') as PriceSource;
    } catch (error) {
      return reply({ error: error instanceof Error ? error.message : '请求格式无效' }, 400);
    }
  } else {
    try {
      ({ schemeId, priceSource: source, groupType, decisions, edits, addedCosts } = await parseBody(request));
    } catch (error) {
      return reply({ error: error instanceof Error ? error.message : '请求格式无效' }, 400);
    }
  }
  try {
    const db = getDb();
    const scheme = await loadOwnedScheme(db, schemeId, owner);
    if (!scheme) return reply({ error: '方案不存在或无权访问' }, 404);
    const analysisRow = await loadLatestAnalysis(db, schemeId, owner);
    if (!analysisRow) return reply({ error: '请先完成智能成本分析', code: 'ANALYSIS_REQUIRED' }, 409);
    let analysis: SchemeAnalysis;
    try {
      analysis = parseSchemeAnalysis(JSON.parse(analysisRow.analysis_json));
    } catch {
      return reply({ error: '方案分析结果无效，请重新分析方案' }, 503);
    }
    const historySuggestions = await loadLearningContext(db, owner, analysis);
    const search = request.method === 'GET' ? (url.searchParams.get('search')?.trim() ?? null) : null;
    if (search !== null) {
      const items = await loadAvailableItems(db, owner, source);
      const query = search.slice(0, 80).toLocaleLowerCase('zh-CN');
      return reply({
        priceSource: source,
        items: items.filter((item) => [item.name, item.category, item.projectName].join(' ').toLocaleLowerCase('zh-CN').includes(query)).slice(0, 100).map(serializeSearchItem),
      });
    }
    if (request.method === 'GET') {
      const row = await db.prepare('SELECT * FROM scheme_cost_estimates WHERE scheme_document_id = ? AND owner_id = ? ORDER BY updated_at DESC, id DESC LIMIT 1').bind(schemeId, owner).first<CostingRow>();
      return row
        ? reply({ ...parseStoredResult(row), historySuggestions })
        : reply({ costing: null, schemeId, schemeAnalysisId: analysisRow.id, priceSource: null, historySuggestions });
    }
    const items = await loadAvailableItems(db, owner, source);
    const preferenceCounts = await loadPricePreferences(db, owner);
    const review = editedAnalysis(analysis, edits, addedCosts);
    const result = costScheme(review.analysis, analysisRow.id, items, source, decisions, groupType, {
      candidateMeta: review.candidateMeta,
      pricePreferenceCounts: preferenceCounts,
      historySuggestions,
    });
    const id = crypto.randomUUID();
    const now = new Date().toISOString();
    await db.prepare(`INSERT INTO scheme_cost_estimates
      (id, owner_id, scheme_document_id, scheme_analysis_id, price_source, match_json, known_cost_total, unresolved_count, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`).bind(id, owner, schemeId, analysisRow.id, source, JSON.stringify(result), result.knownCostTotal, result.unresolvedCount, now, now).run();
    return reply({ id, schemeId, schemeAnalysisId: analysisRow.id, priceSource: source, costing: result, knownCostTotal: result.knownCostTotal, unresolvedCount: result.unresolvedCount, createdAt: now, updatedAt: now }, 201);
  } catch {
    return reply({ error: '成本匹配服务暂不可用，请稍后重试' }, 503);
  }
}

