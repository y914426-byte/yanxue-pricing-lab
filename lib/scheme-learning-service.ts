import { sameOrigin } from './google-auth';
import {
  LEARNING_CONFIDENCE_THRESHOLD,
  LEARNING_PROMOTION_THRESHOLD,
  LEARNING_OPERATIONS,
  COSTING_SOURCES,
  confidenceAndLevel,
  normalizeActivityName,
  normalizeLearningCostName,
  type LearningAction,
  type LearningOperation,
} from './scheme-learning';

const reply = (data: unknown, status = 200) =>
  Response.json(data, {
    status,
    headers: { 'Cache-Control': 'private, no-store', Vary: 'Cookie' },
  });

type CostingRow = {
  id: string;
  scheme_document_id: string;
  scheme_analysis_id: string;
  owner_id: string;
  match_json: string;
};
type FeedbackRow = {
  learning_batch_id: string;
  item_key: string;
  action: LearningAction;
  activity_name: string;
  normalized_activity_name: string;
  final_cost_name: string;
  normalized_cost_name: string;
  category: string;
  billing_hint: string;
  requiredness: string;
  group_type: string;
  source: string;
  price_item_id: string | null;
  scheme_document_id: string;
  quantity: number | null;
  unit: string | null;
  note: string;
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
  created_at: string;
  updated_at: string;
};

type StoredCostingItem = {
  key?: unknown;
  candidateIndex?: unknown;
  origin?: unknown;
  originalName?: unknown;
  removed?: unknown;
  removalAction?: unknown;
  name?: unknown;
  normalizedName?: unknown;
  relatedActivity?: unknown;
  category?: unknown;
  billingHint?: unknown;
  requiredness?: unknown;
  selected?: { priceItemId?: unknown } | null;
  quantity?: unknown;
  unitPrice?: unknown;
  total?: unknown;
  unit?: unknown;
  note?: unknown;
};
type StoredCostingPayload = {
  groupType?: unknown;
  items?: unknown;
};

function stringValue(value: unknown, label: string, max = 120) {
  if (typeof value !== 'string' || !value.trim() || value.length > max) throw new Error(label + '无效');
  return value.trim();
}

function optionalString(value: unknown, label: string, max = 120) {
  if (value === undefined || value === null || value === '') return null;
  if (typeof value !== 'string' || value.length > max) throw new Error(label + '无效');
  return value.trim() || null;
}

async function parseBody(request: Request) {
  const reader = request.body?.getReader();
  if (!reader) throw new Error('请求内容为空');
  let raw = '';
  let size = 0;
  const decoder = new TextDecoder();
  while (true) {
    const chunk = await reader.read();
    if (chunk.done) break;
    size += chunk.value.byteLength;
    if (size > 192 * 1024) {
      await reader.cancel();
      throw new Error('请求内容过大');
    }
    raw += decoder.decode(chunk.value, { stream: true });
  }
  const value: unknown = JSON.parse(raw + decoder.decode());
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('请求格式无效');
  const body = value as Record<string, unknown>;
  const action = body.action;
  if (typeof action !== 'string' || !LEARNING_OPERATIONS.includes(action as LearningOperation)) throw new Error('学习操作无效');
  return { body, action: action as LearningOperation };
}

function relationKey(activity: string, cost: string, groupType: string) {
  return [activity, cost, groupType].join('\u0001');
}

function eventKey(row: FeedbackRow) {
  return row.learning_batch_id + '\u0001' + row.item_key;
}

function positiveAction(action: LearningAction) {
  return action === 'accepted' || action === 'added' || action === 'renamed';
}

function negativeAction(action: LearningAction) {
  return action === 'removed' || action === 'not_applicable';
}

async function feedbackRows(db: D1Database, owner: string) {
  const { results } = await db.prepare(`SELECT learning_batch_id, item_key, action, activity_name,
    normalized_activity_name, final_cost_name, normalized_cost_name, category, billing_hint,
    requiredness, group_type, source, price_item_id, scheme_document_id, quantity, unit, note
    FROM scheme_learning_feedback WHERE owner_id = ? AND revoked_at IS NULL ORDER BY created_at, id`).bind(owner).all<FeedbackRow>();
  return results;
}

function templateMap(rows: TemplateRow[]) {
  return new Map(rows.map((row) => [relationKey(row.normalized_activity_name, row.normalized_cost_name, row.group_type), row]));
}

async function currentTemplates(db: D1Database, owner: string) {
  const { results } = await db.prepare('SELECT * FROM activity_cost_templates WHERE owner_id = ?').bind(owner).all<TemplateRow>();
  return results;
}

async function rebuildPriceAliases(db: D1Database, owner: string, rows: FeedbackRow[], now: string) {
  type AliasAggregate = { costName: string; normalizedCostName: string; priceItemId: string; events: Set<string> };
  const aggregates = new Map<string, AliasAggregate>();
  for (const row of rows) {
    if (row.action !== 'price_confirmed' || !row.price_item_id) continue;
    const key = row.normalized_cost_name + '\u0001' + row.price_item_id;
    const aggregate = aggregates.get(key) ?? {
      costName: row.final_cost_name,
      normalizedCostName: row.normalized_cost_name,
      priceItemId: row.price_item_id,
      events: new Set<string>(),
    };
    aggregate.events.add(eventKey(row));
    aggregate.costName = row.final_cost_name;
    aggregates.set(key, aggregate);
  }
  const existingResult = await db.prepare('SELECT * FROM cost_price_aliases WHERE owner_id = ?').bind(owner).all<Record<string, unknown>>();
  const existing = new Map(existingResult.results.map((row) => [String(row.normalized_cost_name) + '\u0001' + String(row.price_item_id), row]));
  const activeKeys = new Set(aggregates.keys());
  for (const aggregate of aggregates.values()) {
    const key = aggregate.normalizedCostName + '\u0001' + aggregate.priceItemId;
    const row = existing.get(key);
    const positiveCount = aggregate.events.size;
    if (row) {
      await db.prepare(`UPDATE cost_price_aliases SET cost_name = ?, positive_count = ?, updated_at = ?
        WHERE id = ? AND owner_id = ?`).bind(aggregate.costName, positiveCount, now, row.id, owner).run();
    } else {
      await db.prepare(`INSERT INTO cost_price_aliases
        (id, owner_id, cost_name, normalized_cost_name, price_item_id, positive_count, negative_count, is_disabled, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, 0, 0, ?, ?)`).bind(crypto.randomUUID(), owner, aggregate.costName, aggregate.normalizedCostName, aggregate.priceItemId, positiveCount, now, now).run();
    }
  }
  for (const row of existingResult.results) {
    const key = String(row.normalized_cost_name) + '\u0001' + String(row.price_item_id);
    if (!activeKeys.has(key)) await db.prepare('DELETE FROM cost_price_aliases WHERE id = ? AND owner_id = ?').bind(row.id, owner).run();
  }
}

async function rebuildKnowledge(db: D1Database, owner: string, now: string) {
  const rows = await feedbackRows(db, owner);
  type Aggregate = {
    activityName: string;
    normalizedActivityName: string;
    groupType: string;
    costName: string;
    normalizedCostName: string;
    category: string;
    billingHint: string;
    requiredness: string;
    positive: Set<string>;
    negative: Set<string>;
  };
  const aggregates = new Map<string, Aggregate>();
  for (const row of rows) {
    if (row.action === 'price_confirmed') continue;
    const key = relationKey(row.normalized_activity_name, row.normalized_cost_name, row.group_type);
    const aggregate = aggregates.get(key) ?? {
      activityName: row.activity_name,
      normalizedActivityName: row.normalized_activity_name,
      groupType: row.group_type,
      costName: row.final_cost_name,
      normalizedCostName: row.normalized_cost_name,
      category: row.category,
      billingHint: row.billing_hint,
      requiredness: row.requiredness,
      positive: new Set<string>(),
      negative: new Set<string>(),
    };
    aggregate.activityName = row.activity_name;
    aggregate.costName = row.final_cost_name;
    aggregate.category = row.category;
    aggregate.billingHint = row.billing_hint;
    aggregate.requiredness = row.requiredness;
    if (positiveAction(row.action)) aggregate.positive.add(eventKey(row));
    if (negativeAction(row.action)) aggregate.negative.add(eventKey(row));
    aggregates.set(key, aggregate);
  }
  const existingRows = await currentTemplates(db, owner);
  const existing = templateMap(existingRows);
  const activeKeys = new Set(aggregates.keys());
  for (const aggregate of aggregates.values()) {
    const key = relationKey(aggregate.normalizedActivityName, aggregate.normalizedCostName, aggregate.groupType);
    const positiveCount = aggregate.positive.size;
    const negativeCount = aggregate.negative.size;
    const confidenceScore = positiveCount + negativeCount ? positiveCount / (positiveCount + negativeCount) : 0;
    const row = existing.get(key);
    if (row) {
      await db.prepare(`UPDATE activity_cost_templates SET activity_name = ?, cost_name = ?, category = ?,
        billing_hint = ?, requiredness = ?, confidence_score = ?, positive_count = ?, negative_count = ?, updated_at = ?
        WHERE id = ? AND owner_id = ?`).bind(aggregate.activityName, aggregate.costName, aggregate.category, aggregate.billingHint, aggregate.requiredness, confidenceScore, positiveCount, negativeCount, now, row.id, owner).run();
    } else {
      await db.prepare(`INSERT INTO activity_cost_templates
        (id, owner_id, activity_name, normalized_activity_name, group_type, cost_name, normalized_cost_name,
        category, billing_hint, requiredness, confidence_score, positive_count, negative_count, is_disabled, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?, ?)`).bind(crypto.randomUUID(), owner, aggregate.activityName, aggregate.normalizedActivityName, aggregate.groupType, aggregate.costName, aggregate.normalizedCostName, aggregate.category, aggregate.billingHint, aggregate.requiredness, confidenceScore, positiveCount, negativeCount, now, now).run();
    }
  }
  for (const row of existingRows) {
    const key = relationKey(row.normalized_activity_name, row.normalized_cost_name, row.group_type);
    if (!activeKeys.has(key)) await db.prepare('DELETE FROM activity_cost_templates WHERE id = ? AND owner_id = ?').bind(row.id, owner).run();
  }
  await rebuildPriceAliases(db, owner, rows, now);
  return { rows, before: existingRows };
}

function parseStoredPayload(row: CostingRow) {
  const value: unknown = JSON.parse(row.match_json);
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('成本匹配结果无效');
  const payload = value as StoredCostingPayload;
  const items = payload.items;
  if (!Array.isArray(items) || items.length > 200) throw new Error('成本匹配结果无效');
  for (const item of items) {
    if (!item || typeof item !== 'object' || Array.isArray(item)) throw new Error('成本匹配结果无效');
    const value = item as StoredCostingItem;
    if (typeof value.name !== 'string' || typeof value.category !== 'string' || typeof value.billingHint !== 'string' || typeof value.requiredness !== 'string') throw new Error('成本匹配结果无效');
    if (typeof value.key !== 'string') value.key = typeof value.candidateIndex === 'number' ? String(value.candidateIndex) : null;
    if (typeof value.originalName !== 'string') value.originalName = value.name;
    if (typeof value.key !== 'string' || typeof value.originalName !== 'string') throw new Error('成本匹配结果无效');
  }
  return { payload, items: items as StoredCostingItem[] };
}

function itemActivity(item: StoredCostingItem) {
  return typeof item.relatedActivity === 'string' && item.relatedActivity.trim() ? item.relatedActivity.trim() : '全天公共成本';
}

async function loadEstimate(db: D1Database, owner: string, schemeId: string, estimateId: string | null) {
  if (estimateId) return await db.prepare('SELECT id, scheme_document_id, scheme_analysis_id, owner_id, match_json FROM scheme_cost_estimates WHERE id = ? AND scheme_document_id = ? AND owner_id = ?').bind(estimateId, schemeId, owner).first<CostingRow>();
  return await db.prepare('SELECT id, scheme_document_id, scheme_analysis_id, owner_id, match_json FROM scheme_cost_estimates WHERE scheme_document_id = ? AND owner_id = ? ORDER BY updated_at DESC, id DESC LIMIT 1').bind(schemeId, owner).first<CostingRow>();
}

async function learningSummary(db: D1Database, owner: string, schemeId: string | null) {
  const rows = await currentTemplates(db, owner);
  const feedback = await feedbackRows(db, owner);
  const schemeCounts = new Map<string, Set<string>>();
  for (const row of feedback) {
    if (row.action === 'price_confirmed') continue;
    const key = row.normalized_activity_name;
    (schemeCounts.get(key) ?? schemeCounts.set(key, new Set()).get(key)!).add(row.scheme_document_id);
  }
  const aliases = await db.prepare('SELECT id, alias_name, normalized_alias_name, canonical_name, normalized_canonical_name, is_active FROM activity_aliases WHERE owner_id = ? ORDER BY updated_at DESC, id DESC').bind(owner).all<Record<string, unknown>>();
  const batches = await db.prepare(`SELECT confirmation_batch_id, scheme_document_id, scheme_cost_estimate_id,
    MIN(confirmed_at) AS created_at, MAX(revoked_at) AS revoked_at, COUNT(*) AS relation_count
    FROM scheme_confirmed_costs WHERE owner_id = ? GROUP BY confirmation_batch_id
    ORDER BY created_at DESC LIMIT 30`).bind(owner).all<Record<string, unknown>>();
  let latestForScheme = null;
  if (schemeId) {
    latestForScheme = batches.results.find((row) => row.scheme_document_id === schemeId) ?? null;
  }
  return {
    templates: rows.map((row) => ({
      id: row.id,
      activityName: row.activity_name,
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
      isDisabled: !!row.is_disabled,
      level: confidenceAndLevel(Number(row.positive_count), Number(row.negative_count)).level,
      schemeCount: schemeCounts.get(row.normalized_activity_name)?.size ?? 0,
    })),
    activities: [...new Set(rows.map((row) => row.normalized_activity_name))].map((normalizedActivityName) => {
      const row = rows.find((item) => item.normalized_activity_name === normalizedActivityName);
      return { activityName: row?.activity_name ?? normalizedActivityName, normalizedActivityName, schemeCount: schemeCounts.get(normalizedActivityName)?.size ?? 0 };
    }),
    aliases: aliases.results.map((row) => ({ id: row.id, aliasName: row.alias_name, normalizedAliasName: row.normalized_alias_name, canonicalName: row.canonical_name, normalizedCanonicalName: row.normalized_canonical_name, isActive: !!row.is_active })),
    recentBatches: batches.results.map((row) => ({ batchId: row.confirmation_batch_id, schemeId: row.scheme_document_id, schemeCostEstimateId: row.scheme_cost_estimate_id, createdAt: row.created_at, revokedAt: row.revoked_at, relationCount: Number(row.relation_count) })),
    latestForScheme: latestForScheme ? { batchId: latestForScheme.confirmation_batch_id, schemeId: latestForScheme.scheme_document_id, schemeCostEstimateId: latestForScheme.scheme_cost_estimate_id, createdAt: latestForScheme.created_at, revokedAt: latestForScheme.revoked_at, relationCount: Number(latestForScheme.relation_count) } : null,
    thresholds: { positiveCount: LEARNING_PROMOTION_THRESHOLD, confidence: LEARNING_CONFIDENCE_THRESHOLD },
  };
}

async function confirmLearning(db: D1Database, owner: string, body: Record<string, unknown>) {
  const schemeId = stringValue(body.schemeId, '方案编号');
  const requestedEstimate = optionalString(body.schemeCostEstimateId, '成本匹配编号');
  const estimate = await loadEstimate(db, owner, schemeId, requestedEstimate);
  if (!estimate) return reply({ error: '成本匹配记录不存在或无权访问' }, 404);
  const previous = await db.prepare('SELECT confirmation_batch_id FROM scheme_confirmed_costs WHERE owner_id = ? AND scheme_cost_estimate_id = ? AND revoked_at IS NULL LIMIT 1').bind(owner, estimate.id).first();
  if (previous) return reply({ error: '本次成本匹配已经确认过；如有修改，请先保存新的成本匹配结果' }, 409);
  const stored = parseStoredPayload(estimate);
  const items = stored.items;
  const groupType = typeof stored.payload.groupType === 'string' ? stored.payload.groupType : '';
  const batchId = crypto.randomUUID();
  const now = new Date().toISOString();
  let relations = 0;
  let priceFeedback = 0;
  for (const item of items) {
    const activity = itemActivity(item);
    const normalizedActivity = normalizeActivityName(activity);
    const originalName = String(item.originalName);
    const finalName = String(item.name).trim();
    const normalizedCost = normalizeLearningCostName(finalName);
    const origin = typeof item.origin === 'string' && COSTING_SOURCES.includes(item.origin as (typeof COSTING_SOURCES)[number]) ? item.origin : 'ai_suggestion';
    const removed = item.removed === true;
    const action: LearningAction = removed
      ? (item.removalAction === 'removed' ? 'removed' : 'not_applicable')
      : origin === 'user_added'
        ? 'added'
        : normalizeLearningCostName(originalName) !== normalizedCost
          ? 'renamed'
          : 'accepted';
    const selectedId = item.selected && typeof item.selected.priceItemId === 'string' ? item.selected.priceItemId : null;
    await db.prepare(`INSERT INTO scheme_confirmed_costs
      (id, owner_id, scheme_document_id, scheme_analysis_id, scheme_cost_estimate_id, confirmation_batch_id,
      item_key, activity_name, normalized_activity_name, cost_name, normalized_cost_name, category, billing_hint,
      requiredness, group_type, source, price_item_id, quantity, unit, adopted, note, confirmed_at, revoked_at)
      SELECT ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NULL`).bind(
      crypto.randomUUID(), owner, schemeId, estimate.scheme_analysis_id, estimate.id, batchId, String(item.key), activity, normalizedActivity, finalName, normalizedCost, String(item.category), String(item.billingHint), String(item.requiredness), groupType, origin, selectedId, typeof item.quantity === 'number' ? item.quantity : null, typeof item.unit === 'string' ? item.unit : null, removed ? 0 : 1, typeof item.note === 'string' ? item.note : '', now,
    ).run();
    await db.prepare(`INSERT INTO scheme_learning_feedback
      (id, owner_id, scheme_document_id, scheme_analysis_id, scheme_cost_estimate_id, learning_batch_id, item_key,
      action, activity_name, normalized_activity_name, original_cost_name, final_cost_name, normalized_cost_name,
      category, billing_hint, requiredness, group_type, source, price_item_id, quantity, unit, note, created_at, revoked_at)
      SELECT ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NULL`).bind(
      crypto.randomUUID(), owner, schemeId, estimate.scheme_analysis_id, estimate.id, batchId, String(item.key), action, activity, normalizedActivity, originalName, finalName, normalizedCost, String(item.category), String(item.billingHint), String(item.requiredness), groupType, origin, selectedId, typeof item.quantity === 'number' ? item.quantity : null, typeof item.unit === 'string' ? item.unit : null, typeof item.note === 'string' ? item.note : '', now,
    ).run();
    if (!removed) {
      relations += 1;
      if (selectedId) {
        priceFeedback += 1;
        await db.prepare(`INSERT INTO scheme_learning_feedback
          (id, owner_id, scheme_document_id, scheme_analysis_id, scheme_cost_estimate_id, learning_batch_id, item_key,
          action, activity_name, normalized_activity_name, original_cost_name, final_cost_name, normalized_cost_name,
          category, billing_hint, requiredness, group_type, source, price_item_id, quantity, unit, note, created_at, revoked_at)
          SELECT ?, ?, ?, ?, ?, ?, ?, 'price_confirmed', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NULL`).bind(
          crypto.randomUUID(), owner, schemeId, estimate.scheme_analysis_id, estimate.id, batchId, String(item.key), activity, normalizedActivity, originalName, finalName, normalizedCost, String(item.category), String(item.billingHint), String(item.requiredness), groupType, origin, selectedId, typeof item.quantity === 'number' ? item.quantity : null, typeof item.unit === 'string' ? item.unit : null, typeof item.note === 'string' ? item.note : '', now,
        ).run();
      }
    }
  }
  const before = templateMap(await currentTemplates(db, owner));
  const rebuilt = await rebuildKnowledge(db, owner, now);
  const after = templateMap(await currentTemplates(db, owner));
  const batchFeedback = rebuilt.rows.filter((row) => row.learning_batch_id === batchId && row.action !== 'price_confirmed');
  const touched = new Map<string, boolean>();
  for (const row of batchFeedback) {
    const key = relationKey(row.normalized_activity_name, row.normalized_cost_name, row.group_type);
    if (negativeAction(row.action)) touched.set(key, true);
  }
  const summary = { newRelations: 0, reinforcedRelations: 0, loweredRecommendations: 0 };
  for (const row of batchFeedback) {
    const key = relationKey(row.normalized_activity_name, row.normalized_cost_name, row.group_type);
    if (touched.has(key) && negativeAction(row.action)) continue;
    const oldRow = before.get(key);
    const newRow = after.get(key);
    if (!newRow) continue;
    if (!oldRow || oldRow.positive_count === 0) summary.newRelations += 1;
    else if (newRow.positive_count > oldRow.positive_count) summary.reinforcedRelations += 1;
  }
  summary.loweredRecommendations = touched.size;
  return reply({ batchId, schemeId, schemeCostEstimateId: estimate.id, relations, priceFeedback, summary, message: '本次方案已用于完善你的成本知识库。' }, 201);
}

export async function schemeLearningRequest(request: Request, owner: string | null, getDb: () => D1Database) {
  if (!owner) return reply({ error: '请先登录，再管理个人成本知识库' }, 401);
  const url = new URL(request.url);
  if (!['GET', 'POST'].includes(request.method)) return reply({ error: '不支持的操作' }, 405);
  if (request.method === 'POST' && !sameOrigin(request)) return reply({ error: '请求来源无效，请刷新后重试' }, 403);
  try {
    const db = getDb();
    if (request.method === 'GET') {
      const schemeId = url.searchParams.get('schemeId');
      if (schemeId && schemeId.length > 100) return reply({ error: '方案编号无效' }, 400);
      return reply(await learningSummary(db, owner, schemeId));
    }
    const { body, action } = await parseBody(request);
    if (action === 'confirm') return await confirmLearning(db, owner, body);
    if (action === 'revoke') {
      const batchId = stringValue(body.batchId, '学习批次编号', 100);
      const existing = await db.prepare('SELECT confirmation_batch_id FROM scheme_confirmed_costs WHERE owner_id = ? AND confirmation_batch_id = ? LIMIT 1').bind(owner, batchId).first();
      if (!existing) return reply({ error: '学习批次不存在或无权访问' }, 404);
      const now = new Date().toISOString();
      await db.prepare('UPDATE scheme_learning_feedback SET revoked_at = ? WHERE owner_id = ? AND learning_batch_id = ? AND revoked_at IS NULL').bind(now, owner, batchId).run();
      await db.prepare('UPDATE scheme_confirmed_costs SET revoked_at = ? WHERE owner_id = ? AND confirmation_batch_id = ? AND revoked_at IS NULL').bind(now, owner, batchId).run();
      await rebuildKnowledge(db, owner, now);
      return reply({ revoked: true, batchId, message: '已撤销本次学习，个人知识库统计已重新计算。' });
    }
    if (action === 'alias_create') {
      const aliasName = stringValue(body.aliasName, '活动别名');
      const canonicalName = stringValue(body.canonicalName, '标准活动名称');
      const normalizedAliasName = normalizeActivityName(aliasName);
      const normalizedCanonicalName = normalizeActivityName(canonicalName);
      if (!normalizedAliasName || !normalizedCanonicalName || normalizedAliasName === normalizedCanonicalName) return reply({ error: '活动别名和标准名称需要不同' }, 400);
      const now = new Date().toISOString();
      await db.prepare(`INSERT INTO activity_aliases
        (id, owner_id, alias_name, normalized_alias_name, canonical_name, normalized_canonical_name, is_active, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, 1, ?, ?)
        ON CONFLICT(owner_id, normalized_alias_name) DO UPDATE SET alias_name = excluded.alias_name,
        canonical_name = excluded.canonical_name, normalized_canonical_name = excluded.normalized_canonical_name,
        is_active = 1, updated_at = excluded.updated_at`).bind(crypto.randomUUID(), owner, aliasName, normalizedAliasName, canonicalName, normalizedCanonicalName, now, now).run();
      return reply({ saved: true, aliasName, canonicalName });
    }
    if (action === 'alias_delete') {
      const id = stringValue(body.aliasId, '活动别名编号');
      const row = await db.prepare('UPDATE activity_aliases SET is_active = 0, updated_at = ? WHERE id = ? AND owner_id = ? RETURNING id').bind(new Date().toISOString(), id, owner).first();
      return row ? reply({ deleted: true }) : reply({ error: '活动别名不存在或无权访问' }, 404);
    }
    if (action === 'template_update') {
      const id = stringValue(body.templateId, '知识关系编号');
      const name = optionalString(body.costName, '标准成本名称');
      const disabled = body.disabled;
      if (disabled !== undefined && typeof disabled !== 'boolean') return reply({ error: '禁用状态无效' }, 400);
      const current = await db.prepare('SELECT normalized_activity_name, normalized_cost_name FROM activity_cost_templates WHERE id = ? AND owner_id = ?').bind(id, owner).first<{ normalized_activity_name: string; normalized_cost_name: string }>();
      if (!current) return reply({ error: '知识关系不存在或无权访问' }, 404);
      const now = new Date().toISOString();
      if (name) {
        const normalized = normalizeLearningCostName(name);
        await db.prepare('UPDATE activity_cost_templates SET cost_name = ?, normalized_cost_name = ?, updated_at = ? WHERE id = ? AND owner_id = ?').bind(name, normalized, now, id, owner).run();
        await db.prepare('UPDATE scheme_learning_feedback SET final_cost_name = ?, normalized_cost_name = ? WHERE owner_id = ? AND normalized_activity_name = ? AND normalized_cost_name = ?').bind(name, normalized, owner, current.normalized_activity_name, current.normalized_cost_name).run();
      }
      if (disabled !== undefined) await db.prepare('UPDATE activity_cost_templates SET is_disabled = ?, updated_at = ? WHERE id = ? AND owner_id = ?').bind(disabled ? 1 : 0, now, id, owner).run();
      return reply({ saved: true });
    }
    return reply({ error: '不支持的学习动作' }, 400);
  } catch (error) {
    return reply({ error: error instanceof Error ? error.message : '个人知识库服务暂不可用，请稍后重试' }, 503);
  }
}

