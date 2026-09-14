import {
  DEFAULT_AI_ANALYSIS_MODEL,
  DEFAULT_OPENAI_API_BASE,
  analyzeScheme,
  SCHEME_ANALYSIS_PROMPT_VERSION,
  sourceTextHash,
  type AnalyzerConfig,
} from './scheme-analyzer';
import { parseSchemeAnalysis, type SchemeAnalysis } from './scheme-analysis-schema';
import { OpenAIError } from './ai/openai';

const reply = (data: unknown, status = 200) =>
  Response.json(data, {
    status,
    headers: { 'Cache-Control': 'private, no-store', Vary: 'Cookie' },
  });

type AnalysisRow = {
  id: string;
  scheme_document_id: string;
  owner_id: string;
  analysis_json: string;
  model: string;
  prompt_version: string;
  source_text_hash: string;
  created_at: string;
};

type SchemeRow = { id: string; raw_text: string };

export type SchemeAnalysisRequestOptions = {
  apiKey?: string;
  model?: string;
  baseUrl?: string;
  analyzer?: (rawText: string, config: AnalyzerConfig) => Promise<SchemeAnalysis>;
  now?: () => Date;
  fetchImpl?: typeof fetch;
  timeoutMs?: number;
};

function analysisResponse(row: AnalysisRow) {
  let analysis: SchemeAnalysis;
  try {
    analysis = parseSchemeAnalysis(JSON.parse(row.analysis_json) as unknown);
  } catch {
    throw new Error('保存的分析结果无效');
  }
  return {
    analysis,
    analysisId: row.id,
    model: row.model,
    promptVersion: row.prompt_version,
    sourceTextHash: row.source_text_hash,
    createdAt: row.created_at,
  };
}

async function parsePostBody(request: Request) {
  if (!request.headers.get('content-type')?.startsWith('application/json'))
    throw new Error('请使用 JSON 格式提交分析请求');
  const reader = request.body?.getReader();
  if (!reader) throw new Error('分析请求不能为空');
  const decoder = new TextDecoder();
  let text = '';
  let size = 0;
  while (true) {
    const chunk = await reader.read();
    if (chunk.done) break;
    size += chunk.value.byteLength;
    if (size > 16384) {
      await reader.cancel();
      throw new Error('分析请求过大');
    }
    text += decoder.decode(chunk.value, { stream: true });
  }
  text += decoder.decode();
  const value: unknown = JSON.parse(text);
  if (!value || typeof value !== 'object' || Array.isArray(value))
    throw new Error('分析请求格式无效');
  const body = value as Record<string, unknown>;
  if (typeof body.schemeId !== 'string' || !body.schemeId || body.schemeId.length > 100)
    throw new Error('方案编号无效');
  if (body.force !== undefined && typeof body.force !== 'boolean')
    throw new Error('force 参数无效');
  return { schemeId: body.schemeId, force: body.force === true };
}

function modelName(value: string | undefined) {
  const model = value?.trim() || DEFAULT_AI_ANALYSIS_MODEL;
  if (model.length > 200) throw new Error('AI 模型配置无效');
  return model;
}

function baseUrl(value: string | undefined) {
  const base = value?.trim() || DEFAULT_OPENAI_API_BASE;
  const parsed = new URL(base);
  if (!['http:', 'https:'].includes(parsed.protocol))
    throw new Error('OpenAI 地址配置无效');
  return base.replace(/\/$/, '');
}

export async function schemeAnalysisRequest(
  request: Request,
  owner: string | null,
  db: () => D1Database,
  options: SchemeAnalysisRequestOptions = {},
) {
  if (!owner)
    return reply({ error: '请先使用 Google 登录，再分析自己的方案' }, 401);

  const url = new URL(request.url);
  if (request.method !== 'GET' && request.method !== 'POST')
    return reply({ error: '不支持的操作' }, 405);
  if (
    request.method === 'POST' &&
    request.headers.get('Origin') !== url.origin
  )
    return reply({ error: '请求来源无效，请刷新页面后重试' }, 403);

  let schemeId: string;
  let force = false;
  if (request.method === 'GET') {
    schemeId = url.searchParams.get('schemeId') ?? '';
    if (!schemeId || schemeId.length > 100)
      return reply({ error: '方案编号无效' }, 400);
  } else {
    try {
      ({ schemeId, force } = await parsePostBody(request));
    } catch (error) {
      return reply(
        { error: error instanceof Error ? error.message : '分析请求格式无效' },
        400,
      );
    }
  }

  try {
    const scheme = await db()
      .prepare('SELECT id, raw_text FROM scheme_documents WHERE id = ? AND owner_id = ?')
      .bind(schemeId, owner)
      .first() as SchemeRow | null;
    if (!scheme) return reply({ error: '方案不存在或无权访问' }, 404);

    if (request.method === 'GET') {
      const row = await db()
        .prepare(
          'SELECT id, scheme_document_id, owner_id, analysis_json, model, prompt_version, source_text_hash, created_at FROM scheme_analyses WHERE scheme_document_id = ? AND owner_id = ? ORDER BY created_at DESC, id DESC LIMIT 1',
        )
        .bind(schemeId, owner)
        .first() as AnalysisRow | null;
      return row ? reply(analysisResponse(row)) : reply({ analysis: null });
    }

    const model = modelName(options.model);
    const promptVersion = SCHEME_ANALYSIS_PROMPT_VERSION;
    const hash = await sourceTextHash(scheme.raw_text);

    if (!force) {
      const cached = await db()
        .prepare(
          'SELECT id, scheme_document_id, owner_id, analysis_json, model, prompt_version, source_text_hash, created_at FROM scheme_analyses WHERE scheme_document_id = ? AND owner_id = ? AND source_text_hash = ? AND model = ? AND prompt_version = ? ORDER BY created_at DESC, id DESC LIMIT 1',
        )
        .bind(schemeId, owner, hash, model, promptVersion)
        .first() as AnalysisRow | null;
      if (cached) return reply({ ...analysisResponse(cached), cached: true });
    }

    const now = options.now ?? (() => new Date());
    const createdAt = now();
    const windowStart = new Date(createdAt.getTime() - 60 * 60 * 1000).toISOString();
    const countRow = await db()
      .prepare(
        'SELECT COUNT(*) AS count FROM scheme_analyses WHERE owner_id = ? AND created_at >= ?',
      )
      .bind(owner, windowStart)
      .first() as { count: number | string } | null;
    if (Number(countRow?.count ?? 0) >= 10)
      return reply({ error: '智能分析次数较多，请稍后再试。' }, 429);

    const config: AnalyzerConfig = {
      apiKey: options.apiKey,
      model,
      baseUrl: baseUrl(options.baseUrl),
      fetchImpl: options.fetchImpl,
      timeoutMs: options.timeoutMs,
    };
    let analysis: SchemeAnalysis;
    try {
      analysis = options.analyzer
        ? await options.analyzer(scheme.raw_text, config)
        : await analyzeScheme(scheme.raw_text, config);
      analysis = parseSchemeAnalysis(analysis);
    } catch (error) {
      console.error('Scheme analysis failed', {
        kind: error instanceof OpenAIError ? error.kind : 'validation',
        status: error instanceof OpenAIError ? error.status : null,
      });
      return reply(
        {
          error:
            '智能分析暂时失败，原方案没有受到影响，请稍后重试。',
        },
        503,
      );
    }

    const id = crypto.randomUUID();
    await db()
      .prepare(
        'INSERT INTO scheme_analyses (id, scheme_document_id, owner_id, analysis_json, model, prompt_version, source_text_hash, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      )
      .bind(
        id,
        schemeId,
        owner,
        JSON.stringify(analysis),
        model,
        promptVersion,
        hash,
        createdAt.toISOString(),
      )
      .run();

    return reply({
      ...analysisResponse({
        id,
        scheme_document_id: schemeId,
        owner_id: owner,
        analysis_json: JSON.stringify(analysis),
        model,
        prompt_version: promptVersion,
        source_text_hash: hash,
        created_at: createdAt.toISOString(),
      }),
      cached: false,
    }, 201);
  } catch {
    return reply({ error: '智能分析服务暂不可用，请稍后重试。' }, 503);
  }
}

