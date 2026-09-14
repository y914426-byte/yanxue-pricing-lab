import { sameOrigin } from './google-auth';
import { callActivitySemanticAi, type ActivitySemanticAiResult } from './activity-semantic';
import {
  ACTIVITY_SEMANTIC_CONFIG,
  rankActivityCandidates,
  resolveCanonicalActivity,
  type ActivityAliasRecord,
} from './activity-similarity';
import { parseSchemeAnalysis, type SchemeAnalysis } from './scheme-analysis-schema';
import { normalizeActivityName } from './scheme-learning';

const reply = (data: unknown, status = 200) =>
  Response.json(data, { status, headers: { 'Cache-Control': 'private, no-store', Vary: 'Cookie' } });

type SemanticConfig = {
  apiKey?: string;
  model: string;
  baseUrl: string;
  callSemantic?: (options: {
    activityName: string;
    category: string | null;
    context: string | null;
    candidates: string[];
  }) => Promise<ActivitySemanticAiResult>;
};

type AnalysisRow = { id: string; analysis_json: string };
type AliasRow = {
  id: string;
  alias_name: string;
  normalized_alias_name: string;
  canonical_name: string;
  normalized_canonical_name: string;
  is_active: number;
};
type FeedbackRow = {
  id: string;
  activity_name: string;
  normalized_activity_name: string;
  candidate_name: string;
  normalized_candidate_name: string;
  decision: 'accepted' | 'rejected' | 'independent' | null;
  source: string;
  confidence: number | null;
  reason: string;
};

export type ActivitySemanticStatus = {
  activityName: string;
  normalizedActivityName: string;
  category: string | null;
  status: 'resolved' | 'suggested' | 'independent' | 'unresolved' | 'no_match';
  canonicalName: string | null;
  candidateName: string | null;
  confidence: number | null;
  reason: string | null;
  source: 'alias' | 'canonical' | 'deterministic' | 'ai' | 'cache' | 'user' | null;
  canAskAi: boolean;
};

function stringValue(value: unknown, label: string, max = 120) {
  if (typeof value !== 'string' || !value.trim() || value.length > max) throw new Error(label + '无效');
  return value.trim();
}

async function parseBody(request: Request) {
  if (!request.headers.get('content-type')?.startsWith('application/json')) throw new Error('请使用 JSON 格式提交');
  const text = await request.text();
  if (new TextEncoder().encode(text).byteLength > 32 * 1024) throw new Error('请求内容过大');
  const value: unknown = JSON.parse(text);
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('请求格式无效');
  return value as Record<string, unknown>;
}

async function loadAnalysis(db: D1Database, owner: string, schemeId: string) {
  const scheme = await db.prepare('SELECT id FROM scheme_documents WHERE id = ? AND owner_id = ?').bind(schemeId, owner).first();
  if (!scheme) return null;
  const row = await db.prepare(`SELECT id, analysis_json FROM scheme_analyses
    WHERE scheme_document_id = ? AND owner_id = ? ORDER BY created_at DESC, id DESC LIMIT 1`).bind(schemeId, owner).first<AnalysisRow>();
  if (!row) return { row: null, analysis: null };
  return { row, analysis: parseSchemeAnalysis(JSON.parse(row.analysis_json)) };
}

async function loadContext(db: D1Database, owner: string) {
  const [aliasesResult, feedbackResult, confirmedResult, templatesResult] = await Promise.all([
    db.prepare(`SELECT id, alias_name, normalized_alias_name, canonical_name,
      normalized_canonical_name, is_active FROM activity_aliases WHERE owner_id = ?`).bind(owner).all<AliasRow>(),
    db.prepare(`SELECT id, activity_name, normalized_activity_name, candidate_name,
      normalized_candidate_name, decision, source, confidence, reason
      FROM activity_alias_feedback WHERE owner_id = ? ORDER BY updated_at DESC, id DESC LIMIT 2000`).bind(owner).all<FeedbackRow>(),
    db.prepare(`SELECT activity_name, normalized_activity_name FROM scheme_confirmed_costs
      WHERE owner_id = ? AND adopted = 1 AND revoked_at IS NULL ORDER BY confirmed_at DESC LIMIT 2000`).bind(owner).all<{ activity_name: string; normalized_activity_name: string }>(),
    db.prepare(`SELECT activity_name, normalized_activity_name FROM activity_cost_templates
      WHERE owner_id = ? ORDER BY updated_at DESC LIMIT 1000`).bind(owner).all<{ activity_name: string; normalized_activity_name: string }>(),
  ]);
  const aliases: ActivityAliasRecord[] = aliasesResult.results.filter((row) => !!row.is_active).map((row) => ({
    aliasName: row.alias_name,
    normalizedAliasName: row.normalized_alias_name,
    canonicalName: row.canonical_name,
    normalizedCanonicalName: row.normalized_canonical_name,
  }));
  const canonicalByNormalized = new Map<string, string>();
  for (const alias of aliases) canonicalByNormalized.set(alias.normalizedCanonicalName, alias.canonicalName);
  for (const row of [...confirmedResult.results, ...templatesResult.results]) {
    const resolved = resolveCanonicalActivity(row.activity_name, aliases);
    if (resolved.normalizedName) canonicalByNormalized.set(resolved.normalizedName, resolved.name);
  }
  for (const row of feedbackResult.results) {
    if (row.decision === 'independent') canonicalByNormalized.set(row.normalized_activity_name, row.activity_name);
  }
  return { aliases, aliasRows: aliasesResult.results, feedback: feedbackResult.results, canonicalByNormalized };
}

function statusForActivity(
  activity: SchemeAnalysis['activities'][number],
  context: Awaited<ReturnType<typeof loadContext>>,
): ActivitySemanticStatus {
  const normalized = normalizeActivityName(activity.name);
  const alias = context.aliases.find((row) => row.normalizedAliasName === normalized);
  if (alias) return {
    activityName: activity.name, normalizedActivityName: normalized, category: activity.category,
    status: 'resolved', canonicalName: alias.canonicalName, candidateName: alias.canonicalName,
    confidence: 1, reason: '已命中你确认过的活动别名。', source: 'alias', canAskAi: false,
  };
  const independent = context.feedback.find((row) => row.normalized_activity_name === normalized && row.decision === 'independent');
  if (independent) return {
    activityName: activity.name, normalizedActivityName: normalized, category: activity.category,
    status: 'independent', canonicalName: activity.name, candidateName: null, confidence: 1,
    reason: '你已将它确认为独立标准活动。', source: 'user', canAskAi: false,
  };
  const canonical = context.canonicalByNormalized.get(normalized);
  if (canonical) return {
    activityName: activity.name, normalizedActivityName: normalized, category: activity.category,
    status: 'resolved', canonicalName: canonical, candidateName: canonical, confidence: 1,
    reason: '活动标准化文字完全命中。', source: 'canonical', canAskAi: false,
  };
  const feedback = context.feedback.filter((row) => row.normalized_activity_name === normalized);
  const cached = feedback.find((row) => row.decision === null && row.source === 'ai');
  if (cached) return {
    activityName: activity.name, normalizedActivityName: normalized, category: activity.category,
    status: 'suggested', canonicalName: null, candidateName: cached.candidate_name,
    confidence: cached.confidence, reason: cached.reason, source: 'cache', canAskAi: false,
  };
  const cachedNoMatch = feedback.find((row) => row.decision === null && row.source === 'ai_negative');
  if (cachedNoMatch) return {
    activityName: activity.name, normalizedActivityName: normalized, category: activity.category,
    status: 'no_match', canonicalName: null, candidateName: null, confidence: cachedNoMatch.confidence,
    reason: cachedNoMatch.reason, source: 'cache', canAskAi: false,
  };
  const rejected = new Set(feedback.filter((row) => row.decision === 'rejected').map((row) => row.normalized_candidate_name));
  const ranked = rankActivityCandidates(activity.name, [...context.canonicalByNormalized.values()])
    .filter((row) => !rejected.has(row.normalizedCandidate));
  const deterministic = ranked[0];
  if (deterministic && deterministic.score >= ACTIVITY_SEMANTIC_CONFIG.deterministicSuggestionThreshold) return {
    activityName: activity.name, normalizedActivityName: normalized, category: activity.category,
    status: 'suggested', canonicalName: null, candidateName: deterministic.candidate,
    confidence: deterministic.score, reason: '活动名称存在明确的核心文字重合。', source: 'deterministic', canAskAi: false,
  };
  return {
    activityName: activity.name, normalizedActivityName: normalized, category: activity.category,
    status: 'unresolved', canonicalName: null, candidateName: null, confidence: null, reason: null,
    source: null, canAskAi: ranked.length > 0,
  };
}

async function cacheSemanticResult(
  db: D1Database,
  owner: string,
  activityName: string,
  candidateName: string,
  result: ActivitySemanticAiResult,
) {
  const now = new Date().toISOString();
  await db.prepare(`INSERT INTO activity_alias_feedback
    (id, owner_id, activity_name, normalized_activity_name, candidate_name, normalized_candidate_name,
      decision, source, confidence, reason, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, NULL, ?, ?, ?, ?, ?)
    ON CONFLICT(owner_id, normalized_activity_name, normalized_candidate_name) DO UPDATE SET
      activity_name = excluded.activity_name, candidate_name = excluded.candidate_name, decision = NULL,
      source = excluded.source, confidence = excluded.confidence, reason = excluded.reason, updated_at = excluded.updated_at`).bind(
    crypto.randomUUID(), owner, activityName, normalizeActivityName(activityName), candidateName,
    normalizeActivityName(candidateName), result.similar ? 'ai' : 'ai_negative', result.confidence,
    result.reason, now, now,
  ).run();
}

export async function activitySemanticRequest(
  request: Request,
  owner: string | null,
  getDb: () => D1Database,
  config: SemanticConfig,
) {
  if (!owner) return reply({ error: '请先登录，再判断活动语义' }, 401);
  if (!['GET', 'POST'].includes(request.method)) return reply({ error: '不支持的操作' }, 405);
  if (request.method === 'POST' && !sameOrigin(request)) return reply({ error: '请求来源无效，请刷新后重试' }, 403);
  try {
    const url = new URL(request.url);
    let schemeId: string;
    let requestedActivity: string | null = null;
    if (request.method === 'GET') schemeId = stringValue(url.searchParams.get('schemeId'), '方案编号');
    else {
      const body = await parseBody(request);
      schemeId = stringValue(body.schemeId, '方案编号');
      requestedActivity = stringValue(body.activityName, '活动名称');
    }
    const db = getDb();
    const loaded = await loadAnalysis(db, owner, schemeId);
    if (!loaded) return reply({ error: '方案不存在或无权访问' }, 404);
    if (!loaded.analysis || !loaded.row) return reply({ error: '请先完成智能成本分析' }, 409);
    const context = await loadContext(db, owner);
    const statuses = loaded.analysis.activities.map((activity) => statusForActivity(activity, context));
    if (request.method === 'GET') return reply({ schemeId, analysisId: loaded.row.id, activities: statuses });
    const normalizedRequested = normalizeActivityName(requestedActivity!);
    const activity = loaded.analysis.activities.find((item) => normalizeActivityName(item.name) === normalizedRequested);
    if (!activity) return reply({ error: '该活动不属于当前最新分析结果' }, 400);
    const existing = statuses.find((item) => item.normalizedActivityName === normalizedRequested)!;
    if (existing.status !== 'unresolved' || !existing.canAskAi) return reply({ activity: existing, cached: existing.source === 'cache' });
    const rejected = new Set(context.feedback.filter((row) => row.normalized_activity_name === normalizedRequested && row.decision === 'rejected').map((row) => row.normalized_candidate_name));
    const candidates = rankActivityCandidates(activity.name, [...context.canonicalByNormalized.values()])
      .filter((row) => !rejected.has(row.normalizedCandidate))
      .slice(0, ACTIVITY_SEMANTIC_CONFIG.aiCandidateLimit)
      .map((row) => row.candidate);
    if (!candidates.length) return reply({ activity: { ...existing, status: 'no_match', canAskAi: false } });
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
    const recent = await db.prepare(`SELECT COUNT(*) AS count FROM activity_alias_feedback
      WHERE owner_id = ? AND source IN ('ai', 'ai_negative') AND created_at >= ?`).bind(owner, oneHourAgo).first<{ count: number }>();
    if (Number(recent?.count ?? 0) >= ACTIVITY_SEMANTIC_CONFIG.aiRequestsPerHour)
      return reply({ error: '活动语义判断次数较多，请稍后再试。已有分析和价格匹配不受影响。' }, 429);
    let result: ActivitySemanticAiResult;
    try {
      if (config.callSemantic) result = await config.callSemantic({
        activityName: activity.name, category: activity.category, context: activity.evidence, candidates,
      });
      else {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 20000);
        try {
          result = await callActivitySemanticAi({
            apiKey: config.apiKey ?? '', baseUrl: config.baseUrl, model: config.model,
            activityName: activity.name, category: activity.category, context: activity.evidence,
            candidates, signal: controller.signal,
          });
        } finally { clearTimeout(timeout); }
      }
    } catch {
      return reply({ error: '活动语义候选暂时不可用，不影响方案分析、历史知识和价格匹配。' }, 503);
    }
    const candidateName = result.candidate ?? candidates[0];
    await cacheSemanticResult(db, owner, activity.name, candidateName, result);
    return reply({ activity: result.similar ? {
      ...existing, status: 'suggested', candidateName, confidence: result.confidence,
      reason: result.reason, source: 'ai', canAskAi: false,
    } : {
      ...existing, status: 'no_match', candidateName: null, confidence: result.confidence,
      reason: result.reason, source: 'ai', canAskAi: false,
    }, cached: false });
  } catch (error) {
    return reply({ error: error instanceof Error ? error.message : '活动语义服务暂不可用，请稍后重试' }, 400);
  }
}

async function saveFeedback(
  db: D1Database,
  owner: string,
  activityName: string,
  candidateName: string,
  decision: 'accepted' | 'rejected' | 'independent',
  reason: string,
) {
  const now = new Date().toISOString();
  await db.prepare(`INSERT INTO activity_alias_feedback
    (id, owner_id, activity_name, normalized_activity_name, candidate_name, normalized_candidate_name,
      decision, source, confidence, reason, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, 'user', 1, ?, ?, ?)
    ON CONFLICT(owner_id, normalized_activity_name, normalized_candidate_name) DO UPDATE SET
      activity_name = excluded.activity_name, candidate_name = excluded.candidate_name,
      decision = excluded.decision, source = 'user', confidence = 1, reason = excluded.reason,
      updated_at = excluded.updated_at`).bind(
    crypto.randomUUID(), owner, activityName, normalizeActivityName(activityName), candidateName,
    normalizeActivityName(candidateName), decision, reason, now, now,
  ).run();
}

export async function activityAliasRequest(request: Request, owner: string | null, getDb: () => D1Database) {
  if (!owner) return reply({ error: '请先登录，再管理活动标准化' }, 401);
  if (request.method !== 'POST') return reply({ error: '不支持的操作' }, 405);
  if (!sameOrigin(request)) return reply({ error: '请求来源无效，请刷新后重试' }, 403);
  try {
    const body = await parseBody(request);
    const action = stringValue(body.action, '操作', 30);
    const db = getDb();
    if (action === 'accept') {
      const activityName = stringValue(body.activityName, '活动名称');
      const canonicalName = stringValue(body.canonicalName, '标准活动名称');
      const normalizedActivity = normalizeActivityName(activityName);
      const normalizedCanonical = normalizeActivityName(canonicalName);
      if (normalizedActivity === normalizedCanonical) return reply({ error: '相同名称无需建立别名' }, 400);
      const now = new Date().toISOString();
      await db.prepare(`INSERT INTO activity_aliases
        (id, owner_id, alias_name, normalized_alias_name, canonical_name, normalized_canonical_name, is_active, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, 1, ?, ?)
        ON CONFLICT(owner_id, normalized_alias_name) DO UPDATE SET alias_name = excluded.alias_name,
          canonical_name = excluded.canonical_name, normalized_canonical_name = excluded.normalized_canonical_name,
          is_active = 1, updated_at = excluded.updated_at`).bind(
        crypto.randomUUID(), owner, activityName, normalizedActivity, canonicalName, normalizedCanonical, now, now,
      ).run();
      await saveFeedback(db, owner, activityName, canonicalName, 'accepted', '用户确认归类');
      return reply({ saved: true, activityName, canonicalName });
    }
    if (action === 'reject') {
      const activityName = stringValue(body.activityName, '活动名称');
      const candidateName = stringValue(body.candidateName, '候选活动名称');
      await saveFeedback(db, owner, activityName, candidateName, 'rejected', '用户确认不是同一活动');
      return reply({ saved: true, decision: 'rejected' });
    }
    if (action === 'independent') {
      const activityName = stringValue(body.activityName, '活动名称');
      const normalized = normalizeActivityName(activityName);
      await db.prepare('UPDATE activity_aliases SET is_active = 0, updated_at = ? WHERE owner_id = ? AND normalized_alias_name = ?')
        .bind(new Date().toISOString(), owner, normalized).run();
      await saveFeedback(db, owner, activityName, activityName, 'independent', '用户确认为独立标准活动');
      return reply({ saved: true, decision: 'independent', canonicalName: activityName });
    }
    if (action === 'update') {
      const aliasId = stringValue(body.aliasId, '别名编号');
      const canonicalName = stringValue(body.canonicalName, '标准活动名称');
      const row = await db.prepare(`SELECT alias_name, canonical_name FROM activity_aliases
        WHERE id = ? AND owner_id = ?`).bind(aliasId, owner).first<{ alias_name: string; canonical_name: string }>();
      if (!row) return reply({ error: '活动别名不存在或无权访问' }, 404);
      if (normalizeActivityName(row.alias_name) === normalizeActivityName(canonicalName))
        return reply({ error: '别名与标准活动名称不能相同；如需独立活动，请选择“新建独立活动”' }, 400);
      const now = new Date().toISOString();
      await db.prepare(`UPDATE activity_aliases SET canonical_name = ?, normalized_canonical_name = ?,
        is_active = 1, updated_at = ? WHERE id = ? AND owner_id = ?`).bind(
        canonicalName, normalizeActivityName(canonicalName), now, aliasId, owner,
      ).run();
      if (normalizeActivityName(row.canonical_name) !== normalizeActivityName(canonicalName))
        await saveFeedback(db, owner, row.alias_name, row.canonical_name, 'rejected', '用户修改了别名归属');
      await saveFeedback(db, owner, row.alias_name, canonicalName, 'accepted', '用户修改并确认别名归属');
      return reply({ saved: true });
    }
    if (action === 'delete') {
      const aliasId = stringValue(body.aliasId, '别名编号');
      const row = await db.prepare(`SELECT alias_name, canonical_name FROM activity_aliases
        WHERE id = ? AND owner_id = ?`).bind(aliasId, owner).first<{ alias_name: string; canonical_name: string }>();
      if (!row) return reply({ error: '活动别名不存在或无权访问' }, 404);
      await db.prepare('UPDATE activity_aliases SET is_active = 0, updated_at = ? WHERE id = ? AND owner_id = ?')
        .bind(new Date().toISOString(), aliasId, owner).run();
      await saveFeedback(db, owner, row.alias_name, row.canonical_name, 'rejected', '用户停用了错误别名');
      return reply({ deleted: true });
    }
    return reply({ error: '不支持的活动标准化操作' }, 400);
  } catch (error) {
    return reply({ error: error instanceof Error ? error.message : '活动标准化服务暂不可用，请稍后重试' }, 400);
  }
}
