import type { SchemeAnalysis } from './scheme-analysis-schema';

export const LEARNING_PROMOTION_THRESHOLD = 3;
export const LEARNING_CONFIDENCE_THRESHOLD = 0.7;

export const LEARNING_ACTIONS = [
  'accepted',
  'removed',
  'added',
  'renamed',
  'price_confirmed',
  'not_applicable',
] as const;
export type LearningAction = (typeof LEARNING_ACTIONS)[number];

export const LEARNING_OPERATIONS = [
  'confirm',
  'revoke',
  'alias_create',
  'alias_delete',
  'template_update',
] as const;
export type LearningOperation = (typeof LEARNING_OPERATIONS)[number];

export const COSTING_SOURCES = [
  'scheme_explicit',
  'ai_suggestion',
  'history',
  'user_added',
] as const;
export type CostingSource = (typeof COSTING_SOURCES)[number];

export const COST_CATEGORIES = [
  '门票/场地',
  '餐饮',
  '交通',
  '住宿',
  '人工',
  '材料耗材',
  '保险',
  '设备',
  '表演/课程',
  '其他',
] as const;
export type CostCategory = (typeof COST_CATEGORIES)[number];

export const BILLING_HINTS = [
  'fixed',
  'per_participant',
  'capacity_batch',
  'per_adult',
  'per_child',
  'per_family',
  'unknown',
] as const;
export type BillingHint = (typeof BILLING_HINTS)[number];

export type LearningLevel = 'high' | 'low';

export type LearningTemplate = {
  id: string;
  ownerId: string;
  activityName: string;
  normalizedActivityName: string;
  groupType: string;
  costName: string;
  normalizedCostName: string;
  category: string;
  billingHint: string;
  requiredness: string;
  confidenceScore: number;
  positiveCount: number;
  negativeCount: number;
  isDisabled: boolean;
  level: LearningLevel;
};

export type LearningSuggestion = Omit<
  LearningTemplate,
  'id' | 'ownerId' | 'isDisabled'
> & {
  source: 'history';
  activityDisplayName: string;
};

export type ActivityAlias = {
  id: string;
  aliasName: string;
  normalizedAliasName: string;
  canonicalName: string;
  normalizedCanonicalName: string;
  isActive: boolean;
};

export type LearningBatch = {
  batchId: string;
  schemeId: string;
  schemeCostEstimateId: string;
  createdAt: string;
  revokedAt: string | null;
  relationCount: number;
};

const normalizeForLookup = (value: string) =>
  value
    .normalize('NFKC')
    .toLocaleLowerCase('zh-CN')
    .replace(/[\s,，、。.!！?？:：;；()（）【】{}<>《》"'‘’“”·/\\_-]/g, '');

export function normalizeActivityName(value: string) {
  return normalizeForLookup(value.trim());
}

export function normalizeLearningCostName(value: string) {
  let normalized = normalizeForLookup(value.trim());
  if (normalized.endsWith('费用')) normalized = normalized.slice(0, -2);
  else if (normalized.endsWith('费')) normalized = normalized.slice(0, -1);
  return normalized;
}

export function confidenceAndLevel(positiveCount: number, negativeCount: number) {
  const total = positiveCount + negativeCount;
  const confidenceScore = total ? positiveCount / total : 0;
  return {
    confidenceScore,
    level:
      positiveCount >= LEARNING_PROMOTION_THRESHOLD &&
      confidenceScore >= LEARNING_CONFIDENCE_THRESHOLD
        ? ('high' as const)
        : ('low' as const),
  };
}

export function groupLabel(groupType: string | null | undefined) {
  const labels: Record<string, string> = {
    student: '学生团',
    family: '亲子团',
    senior: '老年团',
    adult: '成人团',
    company: '企业团',
    custom: '自定义团体',
  };
  return groupType ? labels[groupType] ?? groupType : '不限团型';
}

export function activityNamesForAnalysis(analysis: SchemeAnalysis) {
  const values = [
    ...analysis.activities.map((activity) => activity.name),
    ...analysis.costCandidates
      .map((candidate) => candidate.relatedActivity)
      .filter((value): value is string => !!value),
  ];
  return [...new Set(values.map((value) => value.trim()).filter(Boolean))];
}

