import { callOpenAIJson } from './ai/openai';

export type ActivitySemanticAiResult = {
  candidate: string | null;
  similar: boolean;
  confidence: number;
  reason: string;
};

const RESPONSE_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['candidate', 'similar', 'confidence', 'reason'],
  properties: {
    candidate: { type: ['string', 'null'] },
    similar: { type: 'boolean' },
    confidence: { type: 'number', minimum: 0, maximum: 1 },
    reason: { type: 'string' },
  },
} as const;

function parseResult(value: unknown, candidates: string[]): ActivitySemanticAiResult {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('活动语义结果无效');
  const row = value as Record<string, unknown>;
  if (typeof row.similar !== 'boolean') throw new Error('活动语义判断无效');
  if (typeof row.confidence !== 'number' || !Number.isFinite(row.confidence) || row.confidence < 0 || row.confidence > 1)
    throw new Error('活动语义置信度无效');
  if (typeof row.reason !== 'string' || !row.reason.trim() || row.reason.length > 240)
    throw new Error('活动语义理由无效');
  if (row.candidate !== null && (typeof row.candidate !== 'string' || !candidates.includes(row.candidate)))
    throw new Error('活动语义候选不在允许范围内');
  if (row.similar && row.candidate === null) throw new Error('活动语义候选缺失');
  return {
    candidate: row.candidate as string | null,
    similar: row.similar,
    confidence: row.confidence,
    reason: row.reason.trim(),
  };
}

export async function callActivitySemanticAi(options: {
  apiKey: string;
  baseUrl: string;
  model: string;
  activityName: string;
  category: string | null;
  context: string | null;
  candidates: string[];
  signal: AbortSignal;
  fetchImpl?: typeof fetch;
}) {
  const candidates = options.candidates.slice(0, 8);
  const value = await callOpenAIJson({
    apiKey: options.apiKey,
    baseUrl: options.baseUrl,
    model: options.model,
    systemPrompt:
      '你只判断两个研学活动名称是否代表同一类实际业务活动。只能从给定候选中选择；名称相近但实施内容明显不同应判为 false。你不能修改数据，也不能生成成本或价格。',
    userText: JSON.stringify({
      activityName: options.activityName,
      category: options.category,
      context: options.context?.slice(0, 160) ?? null,
      canonicalCandidates: candidates,
    }),
    responseSchema: RESPONSE_SCHEMA as unknown as Record<string, unknown>,
    responseName: 'activity_semantic_candidate',
    maxOutputTokens: 500,
    signal: options.signal,
    fetchImpl: options.fetchImpl,
  });
  return parseResult(value, candidates);
}
