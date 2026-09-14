import assert from 'node:assert/strict';
import { registerHooks } from 'node:module';
import { DatabaseSync } from 'node:sqlite';
import { readFileSync, readdirSync } from 'node:fs';

registerHooks({
  resolve(source, context, nextResolve) {
    try {
      return nextResolve(source, context);
    } catch (error) {
      if (source.startsWith('./') && context.parentURL?.includes('/lib/'))
        return nextResolve(source + '.ts', context);
      throw error;
    }
  },
});

const { schemeAnalysisRequest } = await import('../lib/scheme-analysis-service.ts');
const { sourceTextHash } = await import('../lib/scheme-analyzer.ts');
const { callOpenAIJson, OpenAIError } = await import('../lib/ai/openai.ts');

const sqlite = new DatabaseSync(':memory:');
const db = {
  prepare(sql) {
    const statement = sqlite.prepare(sql);
    return {
      bind(...args) {
        return {
          async run() {
            return statement.run(...args);
          },
          async first() {
            return statement.get(...args) ?? null;
          },
          async all() {
            return { results: statement.all(...args) };
          },
        };
      },
    };
  },
};
for (const file of readdirSync(new URL('../drizzle/', import.meta.url))
  .filter((file) => file.endsWith('.sql'))
  .sort()) {
  sqlite.exec(readFileSync(new URL('../drizzle/' + file, import.meta.url), 'utf8'));
}

const endpoint = 'https://pricing.test/api/scheme-analysis';
const rawText = '苏州农耕研学\n60名儿童，4名老师\n10:00 割水稻\n中午统一用餐';
const input = {
  title: '农耕研学',
  fileName: '农耕研学.txt',
  fileType: 'txt',
  rawText,
};
const validAnalysis = {
  schemaVersion: 1,
  summary: {
    groupType: 'student',
    projectName: '农耕研学',
    travelDate: null,
    days: 1,
    location: '苏州',
  },
  participants: {
    total: 64,
    students: 60,
    children: null,
    adults: 4,
    parents: null,
    teachers: 4,
    staff: null,
    notes: [],
  },
  activities: [
    {
      name: '割水稻',
      normalizedName: '割水稻',
      category: '农事体验',
      time: '10:00',
      durationMinutes: null,
      explicit: true,
      confidence: 'high',
      evidence: '10:00 割水稻',
    },
  ],
  costCandidates: [
    {
      name: '学生午餐',
      normalizedName: '午餐',
      category: '餐饮',
      relatedActivity: '午餐',
      source: 'explicit',
      quantity: 60,
      unit: '人',
      billingHint: 'per_participant',
      requiredness: 'required',
      confidence: 'high',
      evidence: '中午统一用餐',
      reason: '方案明确写出统一用餐',
    },
  ],
  missingInfo: ['保险是否统一购买未明确'],
  warnings: [],
};

async function call(method, owner, body, query = '', options = {}) {
  return schemeAnalysisRequest(
    new Request(endpoint + query, {
      method,
      headers: {
        Origin: 'https://pricing.test',
        'Content-Type': 'application/json',
      },
      ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    }),
    owner,
    () => db,
    options,
  );
}

async function saveScheme(owner, suffix = '') {
  const id = 'scheme-' + owner + '-' + suffix + '-' + crypto.randomUUID();
  await db
    .prepare(
      'INSERT INTO scheme_documents (id, owner_id, title, file_name, file_type, raw_text, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
    )
    .bind(
      id,
      owner,
      input.title,
      input.fileName,
      input.fileType,
      input.rawText,
      new Date().toISOString(),
      new Date().toISOString(),
    )
    .run();
  return id;
}

try {
  const responsePayload = {
    output: [
      {
        content: [
          { type: 'output_text', text: JSON.stringify(validAnalysis) },
        ],
      },
    ],
  };
  let deepSeekRequest;
  const deepSeekResult = await callOpenAIJson({
    apiKey: 'deepseek-test-key',
    baseUrl: 'https://api.deepseek.com',
    model: 'deepseek-v4-flash',
    systemPrompt: '输出 JSON',
    userText: '<scheme_document>测试</scheme_document>',
    responseSchema: { type: 'object', properties: { schemaVersion: { const: 1 } } },
    signal: new AbortController().signal,
    fetchImpl: async (url, init) => {
      deepSeekRequest = { url, body: JSON.parse(init.body) };
      return Response.json(responsePayload);
    },
  });
  assert.deepEqual(deepSeekResult, validAnalysis);
  assert.equal(deepSeekRequest.url, 'https://api.deepseek.com/responses');
  assert.equal(deepSeekRequest.body.text.format.type, 'json_object');
  assert.equal(deepSeekRequest.body.reasoning.effort, 'none');
  assert.equal(deepSeekRequest.body.max_output_tokens, 6000);
  assert.match(deepSeekRequest.body.input[0].content[0].text, /schemaVersion/);

  let openAIRequest;
  await callOpenAIJson({
    apiKey: 'openai-test-key',
    baseUrl: 'https://api.openai.com/v1',
    model: 'test-model',
    systemPrompt: '输出 JSON',
    userText: '测试',
    responseSchema: { type: 'object' },
    signal: new AbortController().signal,
    fetchImpl: async (url, init) => {
      openAIRequest = { url, body: JSON.parse(init.body) };
      return Response.json(responsePayload);
    },
  });
  assert.equal(openAIRequest.url, 'https://api.openai.com/v1/responses');
  assert.equal(openAIRequest.body.text.format.type, 'json_schema');
  assert.equal(openAIRequest.body.text.format.strict, true);
  assert.equal(openAIRequest.body.reasoning, undefined);

  await assert.rejects(
    callOpenAIJson({
      apiKey: 'test-key',
      baseUrl: 'https://api.deepseek.com',
      model: 'deepseek-v4-flash',
      systemPrompt: '输出 JSON',
      userText: '测试',
      responseSchema: { type: 'object' },
      signal: new AbortController().signal,
      fetchImpl: async () => Response.json({ error: {} }, { status: 401 }),
    }),
    (error) =>
      error instanceof OpenAIError && error.kind === 'http' && error.status === 401,
  );

  assert.equal((await call('POST', null, { schemeId: 'x' })).status, 401);
  assert.equal((await call('GET', 'alice', undefined, '?schemeId=missing')).status, 404);

  const bobScheme = await saveScheme('bob', 'private');
  assert.equal(
    (await call('GET', 'alice', undefined, '?schemeId=' + bobScheme)).status,
    404,
  );
  assert.equal(
    (
      await call('POST', 'alice', { schemeId: bobScheme }, '', {
        apiKey: 'test-key',
        analyzer: async () => validAnalysis,
      })
    ).status,
    404,
  );

  const missingKeyScheme = await saveScheme('alice', 'missing-key');
  const missingKey = await call('POST', 'alice', { schemeId: missingKeyScheme });
  assert.equal(missingKey.status, 503);
  assert.match((await missingKey.json()).error, /暂时失败/);
  assert.equal(
    sqlite
      .prepare('SELECT COUNT(*) AS count FROM scheme_analyses WHERE scheme_document_id = ?')
      .get(missingKeyScheme).count,
    0,
  );

  const timeoutScheme = await saveScheme('alice', 'timeout');
  const timeout = await call('POST', 'alice', { schemeId: timeoutScheme }, '', {
    apiKey: 'test-key',
    analyzer: async () => {
      throw new Error('timeout');
    },
  });
  assert.equal(timeout.status, 503);
  assert.equal(
    sqlite
      .prepare('SELECT COUNT(*) AS count FROM scheme_analyses WHERE scheme_document_id = ?')
      .get(timeoutScheme).count,
    0,
  );

  const invalidJsonScheme = await saveScheme('alice', 'invalid-json');
  const invalidJson = await call(
    'POST',
    'alice',
    { schemeId: invalidJsonScheme },
    '',
    { apiKey: 'test-key', analyzer: async () => '{not-json' },
  );
  assert.equal(invalidJson.status, 503);

  const invalidSchemaScheme = await saveScheme('alice', 'invalid-schema');
  const invalidSchema = await call(
    'POST',
    'alice',
    { schemeId: invalidSchemaScheme },
    '',
    { apiKey: 'test-key', analyzer: async () => ({ schemaVersion: 999 }) },
  );
  assert.equal(invalidSchema.status, 503);
  assert.equal(
    sqlite
      .prepare('SELECT COUNT(*) AS count FROM scheme_analyses WHERE scheme_document_id = ?')
      .get(invalidSchemaScheme).count,
    0,
  );

  const scheme = await saveScheme('alice', 'success');
  let calls = 0;
  let receivedText = '';
  const analyzer = async (text, config) => {
    calls += 1;
    receivedText = text;
    assert.equal(config.model, 'test-model');
    assert.equal(config.baseUrl, 'https://api.openai.com/v1');
    return validAnalysis;
  };
  const success = await call(
    'POST',
    'alice',
    { schemeId: scheme, rawText: 'forged', ownerId: 'bob', model: 'evil' },
    '',
    { apiKey: 'test-key', model: 'test-model', analyzer },
  );
  assert.equal(success.status, 201);
  const successBody = await success.json();
  assert.equal(successBody.cached, false);
  assert.equal(receivedText, rawText);
  assert.equal(successBody.model, 'test-model');
  assert.equal(successBody.promptVersion, 'v1');
  assert.equal(successBody.sourceTextHash, await sourceTextHash(rawText));
  assert.equal(successBody.analysis.participants.children, null);
  assert.equal(successBody.analysis.summary.groupType, 'student');

  const cached = await call(
    'POST',
    'alice',
    { schemeId: scheme },
    '',
    { apiKey: 'test-key', model: 'test-model', analyzer },
  );
  assert.equal(cached.status, 200);
  assert.equal((await cached.json()).cached, true);
  assert.equal(calls, 1);

  const latest = await call('GET', 'alice', undefined, '?schemeId=' + scheme);
  assert.equal(latest.status, 200);
  assert.equal((await latest.json()).analysis.summary.projectName, '农耕研学');

  const forced = await call(
    'POST',
    'alice',
    { schemeId: scheme, force: true },
    '',
    { apiKey: 'test-key', model: 'test-model', analyzer },
  );
  assert.equal(forced.status, 201);
  assert.equal((await forced.json()).cached, false);
  assert.equal(calls, 2);
  assert.equal(
    sqlite
      .prepare('SELECT COUNT(*) AS count FROM scheme_analyses WHERE scheme_document_id = ?')
      .get(scheme).count,
    2,
  );

  const unknownScheme = await saveScheme('alice', 'unknown');
  const unknown = await call(
    'POST',
    'alice',
    { schemeId: unknownScheme },
    '',
    {
      apiKey: 'test-key',
      analyzer: async () => ({
        ...validAnalysis,
        summary: { ...validAnalysis.summary, groupType: 'unknown' },
      }),
    },
  );
  assert.equal(unknown.status, 201);
  assert.equal((await unknown.json()).analysis.summary.groupType, 'unknown');

  console.log(
    'Passed: OpenAI/DeepSeek Responses transports, scheme analysis auth isolation, config failure, timeout, invalid JSON/schema, persistence, hash, model, prompt version, cache, force history and nullable fields.',
  );
} finally {
  sqlite.close();
}

