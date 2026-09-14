import { normalizeActivityName } from './scheme-learning';

export const ACTIVITY_SEMANTIC_CONFIG = {
  deterministicSuggestionThreshold: 0.62,
  aiCandidateLimit: 8,
  aiRequestsPerHour: 12,
} as const;

export type ActivityAliasRecord = {
  aliasName: string;
  normalizedAliasName: string;
  canonicalName: string;
  normalizedCanonicalName: string;
};

function grams(value: string) {
  const normalized = normalizeActivityName(value);
  if (normalized.length < 2) return new Set(normalized ? [normalized] : []);
  return new Set(Array.from({ length: normalized.length - 1 }, (_, index) => normalized.slice(index, index + 2)));
}

export function activityTextSimilarity(left: string, right: string) {
  const a = normalizeActivityName(left);
  const b = normalizeActivityName(right);
  if (!a || !b) return 0;
  if (a === b) return 1;
  const shorter = a.length <= b.length ? a : b;
  const longer = a.length > b.length ? a : b;
  if (shorter.length >= 3 && longer.includes(shorter)) return 0.82;
  const leftGrams = grams(a);
  const rightGrams = grams(b);
  let overlap = 0;
  for (const gram of leftGrams) if (rightGrams.has(gram)) overlap += 1;
  return leftGrams.size + rightGrams.size ? (2 * overlap) / (leftGrams.size + rightGrams.size) : 0;
}

export function resolveCanonicalActivity(name: string, aliases: ActivityAliasRecord[]) {
  const normalized = normalizeActivityName(name);
  const match = aliases.find((alias) => alias.normalizedAliasName === normalized);
  return match
    ? { name: match.canonicalName, normalizedName: match.normalizedCanonicalName, source: 'alias' as const }
    : { name: name.trim(), normalizedName: normalized, source: 'original' as const };
}

export function rankActivityCandidates(activityName: string, candidates: string[]) {
  const normalizedActivity = normalizeActivityName(activityName);
  const seen = new Set<string>();
  return candidates
    .map((candidate) => ({
      candidate: candidate.trim(),
      normalizedCandidate: normalizeActivityName(candidate),
      score: activityTextSimilarity(activityName, candidate),
    }))
    .filter((item) => item.candidate && item.normalizedCandidate !== normalizedActivity)
    .filter((item) => {
      if (seen.has(item.normalizedCandidate)) return false;
      seen.add(item.normalizedCandidate);
      return true;
    })
    .sort((left, right) => right.score - left.score || left.candidate.localeCompare(right.candidate, 'zh-CN'));
}
