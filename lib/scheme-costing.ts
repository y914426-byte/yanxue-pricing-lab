import { costTotal, type Cost } from './pricing';
import type { SchemeAnalysis } from './scheme-analysis-schema';

export const PRICE_SOURCES = ['system', 'personal', 'personal_first'] as const;
export type PriceSource = (typeof PRICE_SOURCES)[number];
export type PriceItemSource = 'system' | 'personal';
export type MatchStatus =
  | 'exact'
  | 'normalized'
  | 'suggested'
  | 'multiple'
  | 'unmatched'
  | 'info_insufficient';
export type MatchDecision = 'auto' | 'accepted' | 'rejected' | 'none';
export type MatchQuality = 'exact' | 'normalized' | 'suggested' | 'manual';

export type AvailablePriceItem = {
  id: string;
  catalogId: string;
  catalogName: string;
  catalogVersion: number;
  source: PriceItemSource;
  groupType: string;
  category: string;
  name: string;
  mode: 'fixed' | 'person' | 'batch' | 'adult' | 'child' | 'family';
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

export type PriceSnapshot = {
  priceItemId: string;
  catalogId: string;
  catalogName: string;
  catalogVersion: number;
  source: PriceItemSource;
  priceName: string;
  category: string;
  mode: AvailablePriceItem['mode'];
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

export type PriceOption = {
  price: PriceSnapshot;
  match: MatchQuality;
  score: number;
  reason: string;
};

export type SchemeCostMatch = {
  candidateIndex: number;
  name: string;
  normalizedName: string;
  category: string;
  relatedActivity: string | null;
  requiredness: 'required' | 'possible';
  billingHint: string;
  candidateQuantity: number | null;
  candidateUnit: string | null;
  status: MatchStatus;
  decision: MatchDecision;
  matchQuality: MatchQuality | null;
  reason: string;
  options: PriceOption[];
  selected: PriceSnapshot | null;
  quantity: number | null;
  quantityLabel: string | null;
  unitPrice: number | null;
  total: number | null;
};

export type PopulationFacts = {
  attendees: number | null;
  students: number | null;
  children: number | null;
  adults: number | null;
  families: number | null;
  reliablePaying: number | null;
  reliableFree: number | null;
};

export type SchemeCostingResult = {
  schemaVersion: 1;
  analysisId: string;
  priceSource: PriceSource;
  groupType: Exclude<SchemeAnalysis['summary']['groupType'], 'unknown'> | null;
  groupTypeSource: 'analysis' | 'manual' | 'unknown';
  projectName: string | null;
  travelDate: string | null;
  participants: PopulationFacts;
  items: SchemeCostMatch[];
  knownCostTotal: number;
  unresolvedCount: number;
  counts: {
    matched: number;
    suggested: number;
    multiple: number;
    unmatched: number;
    infoInsufficient: number;
  };
  allRequiredResolved: boolean;
  knownPerPerson: number | null;
  warnings: string[];
};

const normalizeText = (value: string) =>
  value
    .normalize('NFKC')
    .toLocaleLowerCase('zh-CN')
    .replace(/[\s,，、。.!！?？:：;；()（）【】{}<>《》"'‘’“”·/\\_-]/g, '');

export function normalizeMatchName(value: string) {
  let result = normalizeText(value);
  if (result.endsWith('费用')) result = result.slice(0, -2);
  else if (result.endsWith('费')) result = result.slice(0, -1);
  return result;
}

function grams(value: string) {
  if (value.length < 2) return new Set(value ? [value] : []);
  return new Set(Array.from({ length: value.length - 1 }, (_, i) => value.slice(i, i + 2)));
}

function categorySimilarity(left: string, right: string) {
  const a = normalizeMatchName(left);
  const b = normalizeMatchName(right);
  return !!a && !!b && (a === b || a.includes(b) || b.includes(a));
}

function nameMatch(candidate: SchemeAnalysis['costCandidates'][number], item: AvailablePriceItem) {
  const rawCandidate = candidate.name.trim();
  const rawItem = item.name.trim();
  const candidateNames = [candidate.name, candidate.normalizedName]
    .map(normalizeMatchName)
    .filter(Boolean);
  const itemName = normalizeMatchName(item.name);
  if (rawCandidate === rawItem) return { kind: 'exact' as const, score: 1 };
  if (candidateNames.includes(itemName)) return { kind: 'normalized' as const, score: 0.95 };
  if (!itemName || !candidateNames.length) return { kind: 'none' as const, score: 0 };
  const candidateName = candidateNames[0];
  const direct = candidateName.includes(itemName) || itemName.includes(candidateName);
  const left = grams(candidateName);
  const right = grams(itemName);
  let common = 0;
  for (const value of left) if (right.has(value)) common += 1;
  const dice = left.size + right.size ? (2 * common) / (left.size + right.size) : 0;
  const score = Math.min(
    0.89,
    Math.max(
      direct ? 0.62 : 0,
      dice + (categorySimilarity(candidate.category, item.category) ? 0.24 : 0),
    ),
  );
  return score >= 0.35
    ? { kind: 'suggested' as const, score }
    : { kind: 'none' as const, score };
}

function snapshot(item: AvailablePriceItem): PriceSnapshot {
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
    actualOnly: item.actualOnly,
    note: item.note,
    projectName: item.projectName,
    validFrom: item.validFrom,
    validTo: item.validTo,
  };
}

function sameProject(itemProject: string, projectName: string | null, location: string | null) {
  if (!itemProject) return true;
  const item = normalizeMatchName(itemProject);
  const context = [projectName, location]
    .filter((value): value is string => !!value)
    .map(normalizeMatchName)
    .filter(Boolean);
  return context.some((value) => value === item || value.includes(item) || item.includes(value));
}

function inDateRange(item: AvailablePriceItem, date: string | null) {
  if (!item.validFrom && !item.validTo) return true;
  if (!date) return false;
  return (!item.validFrom || item.validFrom <= date) && (!item.validTo || item.validTo >= date);
}

function modeForHint(hint: SchemeAnalysis['costCandidates'][number]['billingHint']) {
  const modes: Record<Exclude<typeof hint, 'unknown'>, AvailablePriceItem['mode']> = {
    fixed: 'fixed',
    per_participant: 'person',
    capacity_batch: 'batch',
    per_adult: 'adult',
    per_child: 'child',
    per_family: 'family',
  };
  return hint === 'unknown' ? null : modes[hint];
}

function safeSum(values: Array<number | null>) {
  const present = values.filter((value): value is number => value !== null);
  return present.length ? present.reduce((sum, value) => sum + value, 0) : null;
}

export function populationFacts(
  analysis: SchemeAnalysis,
  groupType: Exclude<SchemeAnalysis['summary']['groupType'], 'unknown'> | null,
): PopulationFacts {
  const p = analysis.participants;
  const students = p.students ?? p.children;
  const children = p.children ?? p.students;
  const adults = p.adults ?? safeSum([p.parents, p.teachers, p.staff]);
  let attendees = p.total;
  if (attendees === null) {
    const main =
      students ??
      (groupType === 'adult' || groupType === 'senior' || groupType === 'company'
        ? adults
        : null);
    attendees = main === null || main === undefined ? adults : main + (adults ?? 0);
  }
  const reliablePaying =
    groupType === 'student'
      ? students
      : groupType === 'family'
        ? null
        : attendees;
  const reliableFree =
    groupType === 'student' && attendees !== null && students !== null && attendees >= students
      ? attendees - students
      : groupType === 'student'
        ? p.teachers ?? p.staff
        : groupType === 'family'
          ? null
          : 0;
  return {
    attendees,
    students,
    children,
    adults,
    families: null,
    reliablePaying: reliablePaying ?? null,
    reliableFree: reliableFree ?? null,
  };
}

function quantityFor(
  mode: AvailablePriceItem['mode'],
  item: AvailablePriceItem,
  candidate: SchemeAnalysis['costCandidates'][number],
  facts: PopulationFacts,
) {
  if (mode === 'fixed')
    return {
      quantity: candidate.quantity ?? item.quantity,
      label: (candidate.quantity ?? item.quantity) + (candidate.unit ?? '份'),
    };
  if (mode === 'person') {
    const quantity = candidate.quantity ?? facts.attendees;
    return { quantity, label: quantity === null ? null : quantity + '人' };
  }
  if (mode === 'batch') {
    const quantity = facts.attendees === null ? null : Math.ceil(facts.attendees / item.capacity);
    return { quantity, label: quantity === null ? null : quantity + '批（' + facts.attendees + '人）' };
  }
  if (mode === 'adult') {
    const quantity = candidate.quantity ?? facts.adults;
    return { quantity, label: quantity === null ? null : quantity + '成人' };
  }
  if (mode === 'child') {
    const quantity = candidate.quantity ?? facts.children;
    return { quantity, label: quantity === null ? null : quantity + '学生/儿童' };
  }
  const quantity = candidate.quantity ?? facts.families;
  return { quantity, label: quantity === null ? null : quantity + '组' };
}

function totalFor(
  item: AvailablePriceItem,
  quantity: number | null,
  facts: PopulationFacts,
) {
  if (quantity === null) return null;
  const cost: Cost = {
    id: item.id,
    name: item.name,
    mode: item.mode,
    amount: item.amount,
    quantity: item.mode === 'fixed' ? quantity : 1,
    capacity: item.capacity,
    actualOnly: item.actualOnly,
  };
  return costTotal(
    cost,
    item.mode === 'person' ? quantity : facts.attendees ?? 0,
    item.mode === 'adult' ? quantity : facts.adults ?? 0,
    item.mode === 'child' ? quantity : facts.children ?? 0,
    item.mode === 'family' ? facts.families ?? quantity : facts.families ?? 0,
  );
}

function optionReason(item: AvailablePriceItem, issues: string[]) {
  const suffix = issues.length ? '；' + issues.join('；') : '';
  return item.source === 'personal' ? '来自我的价格库' + suffix : '来自系统价格库' + suffix;
}

type Evaluated = {
  item: AvailablePriceItem;
  option: PriceOption;
  autoEligible: boolean;
  issues: string[];
};

function evaluate(
  candidate: SchemeAnalysis['costCandidates'][number],
  item: AvailablePriceItem,
  analysis: SchemeAnalysis,
  groupType: Exclude<SchemeAnalysis['summary']['groupType'], 'unknown'> | null,
  facts: PopulationFacts,
): Evaluated | null {
  const match = nameMatch(candidate, item);
  if (match.kind === 'none') return null;
  const issues: string[] = [];
  let autoEligible = true;
  if (!groupType) {
    autoEligible = false;
    issues.push('团体类型待确认');
  } else if (item.groupType !== groupType) {
    return null;
  }
  if (item.projectName) {
    const contextKnown = !!analysis.summary.projectName || !!analysis.summary.location;
    if (!sameProject(item.projectName, analysis.summary.projectName, analysis.summary.location)) return null;
    if (!contextKnown) {
      autoEligible = false;
      issues.push('适用项目待确认');
    }
  }
  if (item.validFrom || item.validTo) {
    if (!inDateRange(item, analysis.summary.travelDate)) {
      if (analysis.summary.travelDate) return null;
      autoEligible = false;
      issues.push('有效期待确认');
    }
  }
  if (facts.attendees !== null) {
    if (facts.attendees < item.minPeople || facts.attendees > item.maxPeople) return null;
  } else if (item.minPeople > 0 || item.maxPeople < 10000) {
    autoEligible = false;
    issues.push('人数范围待确认');
  }
  const expectedMode = modeForHint(candidate.billingHint);
  if (expectedMode && expectedMode !== item.mode) {
    autoEligible = false;
    issues.push('计费方式待确认');
  }
  if (match.kind === 'suggested') autoEligible = false;
  const quality: MatchQuality =
    match.kind === 'exact' || match.kind === 'normalized' || match.kind === 'suggested'
      ? match.kind
      : 'suggested';
  return {
    item,
    autoEligible,
    issues,
    option: {
      price: snapshot(item),
      match: quality,
      score: match.score,
      reason: optionReason(item, issues),
    },
  };
}

function sourcePriority(options: Evaluated[], source: PriceSource) {
  if (source !== 'personal_first') return options;
  const autoOptions = options.filter((item) => item.autoEligible);
  const pool = autoOptions.length ? autoOptions : options;
  const rank = (item: Evaluated) =>
    item.option.match === 'exact' ? 3 : item.option.match === 'normalized' ? 2 : 1;
  const bestRank = Math.max(...pool.map(rank));
  const best = pool.filter((item) => rank(item) === bestRank);
  const personal = best.filter((item) => item.item.source === 'personal');
  return personal.length ? personal : best;
}

function selectedById(value: string | null | undefined, items: AvailablePriceItem[], source: PriceSource) {
  if (!value) return null;
  return (
    items.find(
      (item) =>
        item.id === value &&
        (source === 'system'
          ? item.source === 'system'
          : source === 'personal'
            ? item.source === 'personal'
            : true),
    ) ?? null
  );
}

function matchOne(
  candidate: SchemeAnalysis['costCandidates'][number],
  index: number,
  analysis: SchemeAnalysis,
  items: AvailablePriceItem[],
  source: PriceSource,
  groupType: Exclude<SchemeAnalysis['summary']['groupType'], 'unknown'> | null,
  facts: PopulationFacts,
  decisions: Record<string, string | null>,
): SchemeCostMatch {
  const evaluated = items
    .filter((item) =>
      source === 'system'
        ? item.source === 'system'
        : source === 'personal'
          ? item.source === 'personal'
          : true,
    )
    .map((item) => evaluate(candidate, item, analysis, groupType, facts))
    .filter((item): item is Evaluated => !!item);
  const prioritized = sourcePriority(evaluated, source).sort(
    (a, b) => b.option.score - a.option.score || a.item.id.localeCompare(b.item.id),
  );
  const explicitDecision = Object.prototype.hasOwnProperty.call(decisions, String(index))
    ? decisions[String(index)]
    : undefined;
  const base = {
    candidateIndex: index,
    name: candidate.name,
    normalizedName: candidate.normalizedName,
    category: candidate.category,
    relatedActivity: candidate.relatedActivity,
    requiredness: candidate.requiredness,
    billingHint: candidate.billingHint,
    candidateQuantity: candidate.quantity,
    candidateUnit: candidate.unit,
    options: prioritized.slice(0, 10).map((entry) => entry.option),
    selected: null,
    quantity: null,
    quantityLabel: null,
    unitPrice: null,
    total: null,
    decision: 'none' as MatchDecision,
    matchQuality: null,
  };
  if (explicitDecision === null) {
    return {
      ...base,
      status: 'unmatched',
      decision: 'rejected',
      reason: '用户选择不匹配，等待手动询价。',
    };
  }
  if (explicitDecision !== undefined) {
    if (!groupType)
      return {
        ...base,
        status: 'info_insufficient',
        reason: '团体类型待确认后才能采用价格。',
      };
    const selectedItem = selectedById(explicitDecision, items, source);
    if (!selectedItem)
      return {
        ...base,
        status: 'unmatched',
        reason: '选择的价格项目不可用或已失效。',
      };
    const quantity = quantityFor(selectedItem.mode, selectedItem, candidate, facts);
    const total = totalFor(selectedItem, quantity.quantity, facts);
    return {
      ...base,
      status: total === null ? 'info_insufficient' : 'normalized',
      decision: 'accepted',
      matchQuality: 'manual',
      selected: snapshot(selectedItem),
      quantity: quantity.quantity,
      quantityLabel: quantity.label,
      unitPrice: selectedItem.amount,
      total,
      reason: total === null ? '已选择价格，但数量待确认。' : '用户已采用价格库项目。',
    };
  }
  if (!prioritized.length)
    return {
      ...base,
      status: 'unmatched',
      reason: '没有找到可靠的价格项目，请询价或从价格库选择。',
    };
  const exact = prioritized.filter(
    (entry) => entry.option.match === 'exact' || entry.option.match === 'normalized',
  );
  if (exact.length > 1)
    return {
      ...base,
      status: 'multiple',
      reason: '发现多个同样合理的价格，请选择后计算。',
    };
  const best = prioritized[0];
  if (!best.autoEligible || best.option.match === 'suggested') {
    const similar = prioritized.filter(
      (entry) =>
        entry.option.match === 'suggested' &&
        Math.abs(entry.option.score - best.option.score) < 0.04,
    );
    const status: MatchStatus = similar.length > 1
      ? 'multiple'
      : best.issues.length
        ? 'info_insufficient'
        : 'suggested';
    return {
      ...base,
      status,
      reason:
        status === 'multiple'
          ? '发现多个相似价格，请选择。'
          : best.issues.length
            ? best.issues.join('；')
            : '名称相似但无法完全确认，请点击“采用”。',
    };
  }
  const quantity = quantityFor(best.item.mode, best.item, candidate, facts);
  const total = totalFor(best.item, quantity.quantity, facts);
  return {
    ...base,
    status:
      total === null
        ? 'info_insufficient'
        : best.option.match === 'manual'
          ? 'normalized'
          : best.option.match,
    decision: total === null ? 'none' : 'auto',
    matchQuality: best.option.match,
    selected: total === null ? null : best.option.price,
    quantity: quantity.quantity,
    quantityLabel: quantity.label,
    unitPrice: best.item.amount,
    total,
    reason: total === null ? '价格已找到，但数量待确认。' : '名称、团型、项目、日期和人数条件均满足。',
  };
}

export function costScheme(
  analysis: SchemeAnalysis,
  analysisId: string,
  availableItems: AvailablePriceItem[],
  source: PriceSource,
  decisions: Record<string, string | null> = {},
  groupTypeOverride?: Exclude<SchemeAnalysis['summary']['groupType'], 'unknown'>,
): SchemeCostingResult {
  const analysisGroup = analysis.summary.groupType === 'unknown' ? null : analysis.summary.groupType;
  const groupType = groupTypeOverride ?? analysisGroup;
  const groupTypeSource = groupTypeOverride ? 'manual' : analysisGroup ? 'analysis' : 'unknown';
  const participants = populationFacts(analysis, groupType);
  const items = analysis.costCandidates.map((candidate, index) =>
    matchOne(candidate, index, analysis, availableItems, source, groupType, participants, decisions),
  );
  const knownCostTotal = items.reduce((sum, item) => sum + (item.total ?? 0), 0);
  const counts = {
    matched: items.filter((item) => item.total !== null).length,
    suggested: items.filter((item) => item.status === 'suggested').length,
    multiple: items.filter((item) => item.status === 'multiple').length,
    unmatched: items.filter((item) => item.status === 'unmatched').length,
    infoInsufficient: items.filter((item) => item.status === 'info_insufficient').length,
  };
  const unresolvedCount = items.filter((item) => item.total === null).length;
  const allRequiredResolved = items.every(
    (item) => item.requiredness !== 'required' || item.total !== null,
  );
  return {
    schemaVersion: 1,
    analysisId,
    priceSource: source,
    groupType,
    groupTypeSource,
    projectName: analysis.summary.projectName,
    travelDate: analysis.summary.travelDate,
    participants,
    items,
    knownCostTotal,
    unresolvedCount,
    counts,
    allRequiredResolved,
    knownPerPerson:
      participants.attendees && participants.attendees > 0
        ? knownCostTotal / participants.attendees
        : null,
    warnings: [
      ...(groupType ? [] : ['团体类型待确认，尚未自动采用任何团型价格。']),
      ...(unresolvedCount
        ? ['当前仍有 ' + unresolvedCount + ' 项成本未确定，已知成本小计不代表完整总成本。']
        : []),
    ],
  };
}

export function formatPriceSource(source: PriceSource) {
  return source === 'system'
    ? '系统价格库'
    : source === 'personal'
      ? '我的价格库'
      : '我的价格库优先 + 系统价格库兜底';
}

