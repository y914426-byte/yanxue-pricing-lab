import type { SchemeAnalysis } from './scheme-analysis-schema';

export const SCHEME_SIMILARITY_CONFIG = {
  weights: { activities: 0.6, groupType: 0.15, place: 0.1, participants: 0.1, days: 0.05 },
  highThreshold: 0.75,
  mediumThreshold: 0.55,
  historyLimit: 200,
  displayLimit: 5,
  highFrequencyMinimum: 2,
  highFrequencyRatio: 0.67,
  sufficientConfirmedSamples: 3,
} as const;

export type ParticipantBucket = '1-20' | '21-40' | '41-80' | '81-120' | '120+';

export type SchemeProfile = {
  schemeId: string;
  analysisId: string;
  title: string;
  analysisDate: string;
  groupType: SchemeAnalysis['summary']['groupType'];
  projectName: string | null;
  location: string | null;
  days: number | null;
  participantBucket: ParticipantBucket | null;
  activities: string[];
  canonicalActivities: string[];
  confirmed: boolean;
};

export function participantTotal(analysis: SchemeAnalysis) {
  if (analysis.participants.total !== null) return analysis.participants.total;
  const roles = [analysis.participants.students, analysis.participants.children, analysis.participants.adults,
    analysis.participants.parents, analysis.participants.teachers, analysis.participants.staff];
  const known = roles.filter((value): value is number => value !== null);
  return known.length ? known.reduce((sum, value) => sum + value, 0) : null;
}

export function participantBucket(total: number | null): ParticipantBucket | null {
  if (total === null) return null;
  if (total <= 20) return '1-20';
  if (total <= 40) return '21-40';
  if (total <= 80) return '41-80';
  if (total <= 120) return '81-120';
  return '120+';
}

function jaccard(left: string[], right: string[]) {
  const a = new Set(left);
  const b = new Set(right);
  const union = new Set([...a, ...b]);
  if (!union.size) return 0;
  let intersection = 0;
  for (const value of a) if (b.has(value)) intersection += 1;
  return intersection / union.size;
}

function normalizedPlace(value: string | null) {
  return value?.normalize('NFKC').toLocaleLowerCase('zh-CN').replace(/\s+/g, '') ?? '';
}

function groupScore(left: SchemeProfile['groupType'], right: SchemeProfile['groupType']) {
  if (left === right && left !== 'unknown') return 1;
  if (left === 'unknown' || right === 'unknown') return 0.5;
  return 0;
}

function placeScore(left: SchemeProfile, right: SchemeProfile) {
  const leftValues = [normalizedPlace(left.projectName), normalizedPlace(left.location)].filter(Boolean);
  const rightValues = [normalizedPlace(right.projectName), normalizedPlace(right.location)].filter(Boolean);
  if (!leftValues.length || !rightValues.length) return 0.4;
  if (leftValues.some((value) => rightValues.includes(value))) return 1;
  if (leftValues.some((value) => rightValues.some((other) => value.length >= 4 && (value.includes(other) || other.includes(value))))) return 0.75;
  return 0;
}

function participantScore(left: ParticipantBucket | null, right: ParticipantBucket | null) {
  if (!left || !right) return 0.5;
  const buckets: ParticipantBucket[] = ['1-20', '21-40', '41-80', '81-120', '120+'];
  const distance = Math.abs(buckets.indexOf(left) - buckets.indexOf(right));
  return distance === 0 ? 1 : distance === 1 ? 0.65 : distance === 2 ? 0.25 : 0;
}

function dayScore(left: number | null, right: number | null) {
  if (left === null || right === null) return 0.5;
  if (left === right) return 1;
  return Math.abs(left - right) === 1 ? 0.4 : 0;
}

export function scoreSchemeProfiles(current: SchemeProfile, historical: SchemeProfile) {
  const activities = jaccard(current.canonicalActivities, historical.canonicalActivities);
  const groupType = groupScore(current.groupType, historical.groupType);
  const place = placeScore(current, historical);
  const participants = participantScore(current.participantBucket, historical.participantBucket);
  const days = dayScore(current.days, historical.days);
  const weights = SCHEME_SIMILARITY_CONFIG.weights;
  const score = activities * weights.activities + groupType * weights.groupType + place * weights.place +
    participants * weights.participants + days * weights.days;
  const historicalSet = new Set(historical.canonicalActivities);
  const commonActivities = current.canonicalActivities.filter((activity) => historicalSet.has(activity));
  const reasons = [
    ...(commonActivities.length ? ['共同标准活动 ' + commonActivities.length + ' 项'] : []),
    ...(groupType === 1 ? ['团体类型相同'] : []),
    ...(place === 1 ? ['同一景区或地点'] : place >= 0.75 ? ['景区或地点名称接近'] : []),
    ...(participants === 1 ? ['人数规模相同'] : participants >= 0.65 ? ['人数规模接近'] : []),
    ...(days === 1 ? ['行程天数相同'] : []),
  ];
  return {
    score,
    level: score >= SCHEME_SIMILARITY_CONFIG.highThreshold ? ('high' as const) : ('medium' as const),
    commonActivities,
    reasons,
    breakdown: { activities, groupType, place, participants, days },
  };
}
