import { normalizeLearningCostName } from './scheme-learning';
import { normalizeActivityName } from './scheme-learning';
import { resolveCanonicalActivity, type ActivityAliasRecord } from './activity-similarity';
import { parseSchemeAnalysis, type SchemeAnalysis } from './scheme-analysis-schema';
import {
  SCHEME_SIMILARITY_CONFIG,
  participantBucket,
  participantTotal,
  scoreSchemeProfiles,
  type SchemeProfile,
} from './scheme-similarity';

const reply = (data: unknown, status = 200) =>
  Response.json(data, { status, headers: { 'Cache-Control': 'private, no-store', Vary: 'Cookie' } });

type AnalysisDocumentRow = {
  scheme_id: string;
  title: string;
  analysis_id: string;
  analysis_json: string;
  analysis_created_at: string;
};
type ConfirmedCostRow = {
  scheme_document_id: string;
  confirmation_batch_id: string;
  activity_name: string;
  normalized_activity_name: string;
  cost_name: string;
  normalized_cost_name: string;
  category: string;
  billing_hint: string;
  requiredness: string;
  source: string;
  confirmed_at: string;
};

function stringValue(value: string | null, label: string, max = 120) {
  if (!value || !value.trim() || value.length > max) throw new Error(label + '无效');
  return value.trim();
}

function buildProfile(row: AnalysisDocumentRow, analysis: SchemeAnalysis, aliases: ActivityAliasRecord[], confirmed: boolean): SchemeProfile {
  const activities = [...new Set(analysis.activities.map((activity) => activity.name.trim()).filter(Boolean))];
  const canonical = new Map<string, string>();
  for (const activity of activities) {
    const resolved = resolveCanonicalActivity(activity, aliases);
    if (resolved.normalizedName) canonical.set(resolved.normalizedName, resolved.name);
  }
  return {
    schemeId: row.scheme_id,
    analysisId: row.analysis_id,
    title: row.title,
    analysisDate: row.analysis_created_at,
    groupType: analysis.summary.groupType,
    projectName: analysis.summary.projectName,
    location: analysis.summary.location,
    days: analysis.summary.days,
    participantBucket: participantBucket(participantTotal(analysis)),
    activities,
    canonicalActivities: [...canonical.keys()],
    confirmed,
  };
}

function latestConfirmedCosts(rows: ConfirmedCostRow[]) {
  const latestBatch = new Map<string, string>();
  const grouped = new Map<string, ConfirmedCostRow[]>();
  for (const row of rows) {
    if (!latestBatch.has(row.scheme_document_id)) latestBatch.set(row.scheme_document_id, row.confirmation_batch_id);
    if (latestBatch.get(row.scheme_document_id) !== row.confirmation_batch_id) continue;
    (grouped.get(row.scheme_document_id) ?? grouped.set(row.scheme_document_id, []).get(row.scheme_document_id)!).push(row);
  }
  return grouped;
}

export async function schemeSimilarityRequest(request: Request, owner: string | null, getDb: () => D1Database) {
  if (!owner) return reply({ error: '请先登录，再查看历史相似方案' }, 401);
  if (request.method !== 'GET') return reply({ error: '不支持的操作' }, 405);
  try {
    const schemeId = stringValue(new URL(request.url).searchParams.get('schemeId'), '方案编号');
    const db = getDb();
    const [currentResult, analysisResult, aliasResult, confirmedResult] = await Promise.all([
      db.prepare(`SELECT sd.id AS scheme_id, sd.title, sa.id AS analysis_id,
        sa.analysis_json, sa.created_at AS analysis_created_at
        FROM scheme_documents sd JOIN scheme_analyses sa ON sa.scheme_document_id = sd.id
        WHERE sd.id = ? AND sd.owner_id = ? AND sa.owner_id = ?
        ORDER BY sa.created_at DESC, sa.id DESC LIMIT 1`).bind(schemeId, owner, owner).first<AnalysisDocumentRow>(),
      db.prepare(`SELECT sd.id AS scheme_id, sd.title, sa.id AS analysis_id,
        sa.analysis_json, sa.created_at AS analysis_created_at
        FROM scheme_documents sd JOIN scheme_analyses sa ON sa.scheme_document_id = sd.id
        WHERE sd.owner_id = ? AND sa.owner_id = ?
        ORDER BY sa.created_at DESC, sa.id DESC LIMIT 600`).bind(owner, owner).all<AnalysisDocumentRow>(),
      db.prepare(`SELECT alias_name, normalized_alias_name, canonical_name, normalized_canonical_name
        FROM activity_aliases WHERE owner_id = ? AND is_active = 1`).bind(owner).all<Record<string, string>>(),
      db.prepare(`SELECT scheme_document_id, confirmation_batch_id, activity_name, normalized_activity_name,
        cost_name, normalized_cost_name, category, billing_hint, requiredness, source, confirmed_at
        FROM scheme_confirmed_costs WHERE owner_id = ? AND adopted = 1 AND revoked_at IS NULL
        ORDER BY confirmed_at DESC, id DESC LIMIT 5000`).bind(owner).all<ConfirmedCostRow>(),
    ]);
    const aliases: ActivityAliasRecord[] = aliasResult.results.map((row) => ({
      aliasName: row.alias_name,
      normalizedAliasName: row.normalized_alias_name,
      canonicalName: row.canonical_name,
      normalizedCanonicalName: row.normalized_canonical_name,
    }));
    const confirmedByScheme = latestConfirmedCosts(confirmedResult.results);
    const latestRows: AnalysisDocumentRow[] = [];
    const seen = new Set<string>();
    for (const row of analysisResult.results) {
      if (seen.has(row.scheme_id)) continue;
      seen.add(row.scheme_id);
      latestRows.push(row);
      if (latestRows.length >= SCHEME_SIMILARITY_CONFIG.historyLimit + 1) break;
    }
    const rowsToParse = currentResult && !latestRows.some((row) => row.scheme_id === currentResult.scheme_id)
      ? [currentResult, ...latestRows]
      : latestRows;
    const parsed = rowsToParse.flatMap((row) => {
      try { return [{ row, analysis: parseSchemeAnalysis(JSON.parse(row.analysis_json)) }]; }
      catch { return []; }
    });
    const currentEntry = parsed.find((entry) => entry.row.scheme_id === schemeId);
    if (!currentEntry) {
      const owned = await db.prepare('SELECT id FROM scheme_documents WHERE id = ? AND owner_id = ?').bind(schemeId, owner).first();
      return owned ? reply({ error: '请先完成智能成本分析' }, 409) : reply({ error: '方案不存在或无权访问' }, 404);
    }
    const current = buildProfile(currentEntry.row, currentEntry.analysis, aliases, confirmedByScheme.has(schemeId));
    const scored = parsed
      .filter((entry) => entry.row.scheme_id !== schemeId)
      .map((entry) => {
        const profile = buildProfile(entry.row, entry.analysis, aliases, confirmedByScheme.has(entry.row.scheme_id));
        return { profile, similarity: scoreSchemeProfiles(current, profile) };
      })
      .filter((item) => item.similarity.score >= SCHEME_SIMILARITY_CONFIG.mediumThreshold)
      .sort((left, right) => Number(right.profile.confirmed) - Number(left.profile.confirmed) || right.similarity.score - left.similarity.score)
      .slice(0, SCHEME_SIMILARITY_CONFIG.displayLimit);
    const similarSchemes = scored.map(({ profile, similarity }) => {
      const confirmedCosts = confirmedByScheme.get(profile.schemeId) ?? [];
      return {
        schemeId: profile.schemeId,
        title: profile.title,
        analysisDate: profile.analysisDate,
        score: similarity.score,
        level: similarity.level,
        confirmed: profile.confirmed,
        commonActivities: similarity.commonActivities,
        reasons: similarity.reasons,
        activities: profile.activities,
        canonicalActivities: profile.canonicalActivities,
        confirmedCosts: confirmedCosts.map((row) => ({
          costName: row.cost_name,
          activityName: resolveCanonicalActivity(row.activity_name, aliases).name,
          category: row.category,
          billingHint: row.billing_hint,
          requiredness: row.requiredness,
          source: row.source,
        })),
        breakdown: similarity.breakdown,
      };
    });
    const confirmedSimilar = similarSchemes.filter((scheme) => scheme.confirmed);
    const currentCosts = new Set(currentEntry.analysis.costCandidates.map((cost) => normalizeLearningCostName(cost.name)));
    type CostAggregate = {
      costName: string;
      normalizedCostName: string;
      category: string;
      billingHint: string;
      requiredness: string;
      activityName: string;
      schemeIds: Set<string>;
    };
    const aggregates = new Map<string, CostAggregate>();
    for (const scheme of confirmedSimilar) {
      const seenCosts = new Set<string>();
      for (const cost of scheme.confirmedCosts) {
        const normalizedCost = normalizeLearningCostName(cost.costName);
        if (!normalizedCost || currentCosts.has(normalizedCost) || seenCosts.has(normalizedCost)) continue;
        seenCosts.add(normalizedCost);
        const currentAggregate = aggregates.get(normalizedCost) ?? {
          costName: cost.costName,
          normalizedCostName: normalizedCost,
          category: cost.category,
          billingHint: cost.billingHint,
          requiredness: cost.requiredness,
          activityName: cost.activityName,
          schemeIds: new Set<string>(),
        };
        currentAggregate.schemeIds.add(scheme.schemeId);
        aggregates.set(normalizedCost, currentAggregate);
      }
    }
    const denominator = confirmedSimilar.length;
    const costSuggestions = [...aggregates.values()].map((item) => {
      const schemeCount = item.schemeIds.size;
      const frequency = denominator ? schemeCount / denominator : 0;
      return {
        key: item.normalizedCostName + '|' + normalizeActivityName(item.activityName),
        costName: item.costName,
        normalizedCostName: item.normalizedCostName,
        activityName: item.activityName,
        category: item.category,
        billingHint: item.billingHint,
        requiredness: item.requiredness,
        schemeCount,
        totalSchemes: denominator,
        frequency,
        level: schemeCount >= SCHEME_SIMILARITY_CONFIG.highFrequencyMinimum && frequency >= SCHEME_SIMILARITY_CONFIG.highFrequencyRatio ? 'high' : 'low',
        source: 'similar_scheme' as const,
      };
    }).sort((left, right) => right.schemeCount - left.schemeCount || right.frequency - left.frequency || left.costName.localeCompare(right.costName, 'zh-CN'));
    return reply({
      schemeId,
      profile: current,
      similarSchemes,
      costSuggestions,
      confirmedSampleCount: denominator,
      sampleWarning: denominator < SCHEME_SIMILARITY_CONFIG.sufficientConfirmedSamples
        ? '历史方案样本较少，当前相似方案建议仅供参考。'
        : null,
      thresholds: {
        high: SCHEME_SIMILARITY_CONFIG.highThreshold,
        medium: SCHEME_SIMILARITY_CONFIG.mediumThreshold,
      },
    });
  } catch (error) {
    return reply({ error: error instanceof Error ? error.message : '历史相似方案服务暂不可用，请稍后重试' }, 400);
  }
}
