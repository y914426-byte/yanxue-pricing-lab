export const GROUP_TYPES = [
  'student',
  'family',
  'senior',
  'adult',
  'company',
  'custom',
  'unknown',
] as const;
export type GroupType = (typeof GROUP_TYPES)[number];

export const ACTIVITY_CATEGORIES = [
  '景区游览',
  '农事体验',
  '手工体验',
  '课程研学',
  '演艺观看',
  '体育活动',
  '餐饮',
  '交通',
  '住宿',
  '其他',
] as const;
export type ActivityCategory = (typeof ACTIVITY_CATEGORIES)[number];

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

export const CONFIDENCES = ['high', 'medium', 'low'] as const;
export type Confidence = (typeof CONFIDENCES)[number];

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

export const COST_SOURCES = ['explicit', 'inferred'] as const;
export type CostSource = (typeof COST_SOURCES)[number];

export const REQUIREDNESS = ['required', 'possible'] as const;
export type Requiredness = (typeof REQUIREDNESS)[number];

export type SchemeAnalysis = {
  schemaVersion: 1;
  summary: {
    groupType: GroupType;
    projectName: string | null;
    travelDate: string | null;
    days: number | null;
    location: string | null;
  };
  participants: {
    total: number | null;
    students: number | null;
    children: number | null;
    adults: number | null;
    parents: number | null;
    teachers: number | null;
    staff: number | null;
    notes: string[];
  };
  activities: Array<{
    name: string;
    normalizedName: string;
    category: ActivityCategory;
    time: string | null;
    durationMinutes: number | null;
    explicit: boolean;
    confidence: Confidence;
    evidence: string | null;
  }>;
  costCandidates: Array<{
    name: string;
    normalizedName: string;
    category: CostCategory;
    relatedActivity: string | null;
    source: CostSource;
    quantity: number | null;
    unit: string | null;
    billingHint: BillingHint;
    requiredness: Requiredness;
    confidence: Confidence;
    evidence: string | null;
    reason: string;
  }>;
  missingInfo: string[];
  warnings: string[];
};

type JsonObject = Record<string, unknown>;

const isObject = (value: unknown): value is JsonObject =>
  !!value && typeof value === 'object' && !Array.isArray(value);

const requireObject = (value: unknown, label: string): JsonObject => {
  if (!isObject(value)) throw new Error(label + '必须是对象');
  return value;
};

const requiredString = (value: unknown, label: string, max = 240): string => {
  if (typeof value !== 'string' || !value.trim()) throw new Error(label + '不能为空');
  if (value.length > max) throw new Error(label + '过长');
  return value;
};

const nullableString = (value: unknown, label: string, max = 240): string | null => {
  if (value === null) return null;
  return requiredString(value, label, max);
};

const nullableNumber = (
  value: unknown,
  label: string,
  integer = false,
): number | null => {
  if (value === null) return null;
  if (
    typeof value !== 'number' ||
    !Number.isFinite(value) ||
    value < 0 ||
    (integer && !Number.isInteger(value))
  )
    throw new Error(label + '必须是非负数字或 null');
  return value;
};

const requiredEnum = <T extends string>(
  value: unknown,
  values: readonly T[],
  label: string,
): T => {
  if (typeof value !== 'string' || !values.includes(value as T))
    throw new Error(label + '取值无效');
  return value as T;
};

const stringArray = (value: unknown, label: string, maxItems = 100): string[] => {
  if (!Array.isArray(value) || value.length > maxItems)
    throw new Error(label + '必须是有限字符串数组');
  return value.map((item, index) => requiredString(item, label + '[' + index + ']', 500));
};

export function parseSchemeAnalysis(value: unknown): SchemeAnalysis {
  const root = requireObject(value, '分析结果');
  if (root.schemaVersion !== 1) throw new Error('分析结果版本无效');

  const summary = requireObject(root.summary, 'summary');
  const participants = requireObject(root.participants, 'participants');
  const activitiesValue = root.activities;
  const costsValue = root.costCandidates;
  if (!Array.isArray(activitiesValue) || activitiesValue.length > 100)
    throw new Error('activities 必须是有限数组');
  if (!Array.isArray(costsValue) || costsValue.length > 100)
    throw new Error('costCandidates 必须是有限数组');

  const activities = activitiesValue.map((item, index) => {
    const activity = requireObject(item, 'activities[' + index + ']');
    return {
      name: requiredString(activity.name, '活动名称'),
      normalizedName: requiredString(activity.normalizedName, '活动标准名称'),
      category: requiredEnum(activity.category, ACTIVITY_CATEGORIES, '活动分类'),
      time: nullableString(activity.time, '活动时间', 100),
      durationMinutes: nullableNumber(activity.durationMinutes, '活动时长', true),
      explicit: typeof activity.explicit === 'boolean'
        ? activity.explicit
        : (() => { throw new Error('活动明确性必须是布尔值'); })(),
      confidence: requiredEnum(activity.confidence, CONFIDENCES, '活动置信度'),
      evidence: nullableString(activity.evidence, '活动证据', 500),
    };
  });

  const costCandidates = costsValue.map((item, index) => {
    const cost = requireObject(item, 'costCandidates[' + index + ']');
    return {
      name: requiredString(cost.name, '成本名称'),
      normalizedName: requiredString(cost.normalizedName, '成本标准名称'),
      category: requiredEnum(cost.category, COST_CATEGORIES, '成本分类'),
      relatedActivity: nullableString(cost.relatedActivity, '对应活动', 240),
      source: requiredEnum(cost.source, COST_SOURCES, '成本来源'),
      quantity: nullableNumber(cost.quantity, '成本数量'),
      unit: nullableString(cost.unit, '成本单位', 80),
      billingHint: requiredEnum(cost.billingHint, BILLING_HINTS, '计费提示'),
      requiredness: requiredEnum(cost.requiredness, REQUIREDNESS, '必要性'),
      confidence: requiredEnum(cost.confidence, CONFIDENCES, '成本置信度'),
      evidence: nullableString(cost.evidence, '成本证据', 500),
      reason: requiredString(cost.reason, '成本理由', 500),
    };
  });

  return {
    schemaVersion: 1,
    summary: {
      groupType: requiredEnum(summary.groupType, GROUP_TYPES, '团体类型'),
      projectName: nullableString(summary.projectName, '项目名称'),
      travelDate: nullableString(summary.travelDate, '出行日期', 100),
      days: nullableNumber(summary.days, '天数', true),
      location: nullableString(summary.location, '地点'),
    },
    participants: {
      total: nullableNumber(participants.total, '总人数', true),
      students: nullableNumber(participants.students, '学生人数', true),
      children: nullableNumber(participants.children, '儿童人数', true),
      adults: nullableNumber(participants.adults, '成人数', true),
      parents: nullableNumber(participants.parents, '家长数', true),
      teachers: nullableNumber(participants.teachers, '老师数', true),
      staff: nullableNumber(participants.staff, '工作人员数', true),
      notes: stringArray(participants.notes, '人数备注', 50),
    },
    activities,
    costCandidates,
    missingInfo: stringArray(root.missingInfo, '待确认信息'),
    warnings: stringArray(root.warnings, '警告'),
  };
}

export function isSchemeAnalysis(value: unknown): value is SchemeAnalysis {
  try {
    parseSchemeAnalysis(value);
    return true;
  } catch {
    return false;
  }
}

const nullableText = { type: ['string', 'null'] };
const nullableNonNegativeNumber = { type: ['number', 'null'] };
export const SCHEME_ANALYSIS_JSON_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: [
    'schemaVersion',
    'summary',
    'participants',
    'activities',
    'costCandidates',
    'missingInfo',
    'warnings',
  ],
  properties: {
    schemaVersion: { type: 'integer', const: 1 },
    summary: {
      type: 'object',
      additionalProperties: false,
      required: ['groupType', 'projectName', 'travelDate', 'days', 'location'],
      properties: {
        groupType: { type: 'string', enum: [...GROUP_TYPES] },
        projectName: nullableText,
        travelDate: nullableText,
        days: nullableNonNegativeNumber,
        location: nullableText,
      },
    },
    participants: {
      type: 'object',
      additionalProperties: false,
      required: [
        'total',
        'students',
        'children',
        'adults',
        'parents',
        'teachers',
        'staff',
        'notes',
      ],
      properties: {
        total: nullableNonNegativeNumber,
        students: nullableNonNegativeNumber,
        children: nullableNonNegativeNumber,
        adults: nullableNonNegativeNumber,
        parents: nullableNonNegativeNumber,
        teachers: nullableNonNegativeNumber,
        staff: nullableNonNegativeNumber,
        notes: { type: 'array', items: { type: 'string' } },
      },
    },
    activities: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        required: [
          'name',
          'normalizedName',
          'category',
          'time',
          'durationMinutes',
          'explicit',
          'confidence',
          'evidence',
        ],
        properties: {
          name: { type: 'string' },
          normalizedName: { type: 'string' },
          category: { type: 'string', enum: [...ACTIVITY_CATEGORIES] },
          time: nullableText,
          durationMinutes: nullableNonNegativeNumber,
          explicit: { type: 'boolean' },
          confidence: { type: 'string', enum: [...CONFIDENCES] },
          evidence: nullableText,
        },
      },
    },
    costCandidates: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        required: [
          'name',
          'normalizedName',
          'category',
          'relatedActivity',
          'source',
          'quantity',
          'unit',
          'billingHint',
          'requiredness',
          'confidence',
          'evidence',
          'reason',
        ],
        properties: {
          name: { type: 'string' },
          normalizedName: { type: 'string' },
          category: { type: 'string', enum: [...COST_CATEGORIES] },
          relatedActivity: nullableText,
          source: { type: 'string', enum: [...COST_SOURCES] },
          quantity: nullableNonNegativeNumber,
          unit: nullableText,
          billingHint: { type: 'string', enum: [...BILLING_HINTS] },
          requiredness: { type: 'string', enum: [...REQUIREDNESS] },
          confidence: { type: 'string', enum: [...CONFIDENCES] },
          evidence: nullableText,
          reason: { type: 'string' },
        },
      },
    },
    missingInfo: { type: 'array', items: { type: 'string' } },
    warnings: { type: 'array', items: { type: 'string' } },
  },
} as const;
