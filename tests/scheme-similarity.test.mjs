import assert from 'node:assert/strict';
import { registerHooks } from 'node:module';
import { DatabaseSync } from 'node:sqlite';
import { readFileSync, readdirSync } from 'node:fs';

registerHooks({
  resolve(source, context, nextResolve) {
    try { return nextResolve(source, context); }
    catch (error) {
      if (source.startsWith('./') && context.parentURL?.includes('/lib/')) return nextResolve(source + '.ts', context);
      throw error;
    }
  },
});

const { activityAliasRequest, activitySemanticRequest } = await import('../lib/activity-semantic-service.ts');
const { callActivitySemanticAi } = await import('../lib/activity-semantic.ts');
const { schemeSimilarityRequest } = await import('../lib/scheme-similarity-service.ts');
const { schemeCostingRequest } = await import('../lib/scheme-costing-service.ts');
const { scoreSchemeProfiles } = await import('../lib/scheme-similarity.ts');

const sqlite = new DatabaseSync(':memory:');
for (const file of readdirSync(new URL('../drizzle/', import.meta.url)).filter((name) => name.endsWith('.sql')).sort())
  sqlite.exec(readFileSync(new URL('../drizzle/' + file, import.meta.url), 'utf8'));
const db = {
  prepare(sql) {
    const statement = sqlite.prepare(sql);
    return { bind(...args) { return {
      async run() { return statement.run(...args); },
      async first() { return statement.get(...args) ?? null; },
      async all() { return { results: statement.all(...args) }; },
    }; } };
  },
};

function analysis({ activities, costs = [], groupType = 'student', total = 30, location = '苏州江南农耕文化园', days = 1 }) {
  return {
    schemaVersion: 1,
    summary: { groupType, projectName: location, travelDate: null, days, location },
    participants: { total, students: total, children: total, adults: null, parents: null, teachers: null, staff: null, notes: [] },
    activities: activities.map((name) => ({ name, normalizedName: name, category: name.includes('午餐') ? '餐饮' : '农事体验', time: null, durationMinutes: null, explicit: true, confidence: 'high', evidence: '测试活动' })),
    costCandidates: costs.map((name) => ({ name, normalizedName: name, category: name.includes('餐') ? '餐饮' : '材料耗材', relatedActivity: activities[0] ?? null, source: 'explicit', quantity: null, unit: '人', billingHint: 'per_participant', requiredness: 'required', confidence: 'high', evidence: '测试', reason: '测试成本' })),
    missingInfo: [], warnings: [],
  };
}

function saveScheme(owner, id, title, value, date = '2026-09-01T00:00:00.000Z') {
  sqlite.prepare(`INSERT INTO scheme_documents
    (id, owner_id, title, file_name, file_type, raw_text, created_at, updated_at)
    VALUES (?, ?, ?, ?, 'txt', '测试正文', ?, ?)`).run(id, owner, title, id + '.txt', date, date);
  sqlite.prepare(`INSERT INTO scheme_analyses
    (id, scheme_document_id, owner_id, analysis_json, model, prompt_version, source_text_hash, created_at)
    VALUES (?, ?, ?, ?, 'test-model', 'v1', ?, ?)`).run('analysis-' + id, id, owner, JSON.stringify(value), 'hash-' + id, date);
}

function confirmCost(owner, schemeId, activityName, costName, category = '材料耗材', billingHint = 'per_participant', priceItemId = 'historical-price') {
  const id = crypto.randomUUID();
  sqlite.prepare(`INSERT INTO scheme_confirmed_costs
    (id, owner_id, scheme_document_id, scheme_analysis_id, scheme_cost_estimate_id, confirmation_batch_id,
      item_key, activity_name, normalized_activity_name, cost_name, normalized_cost_name, category, billing_hint,
      requiredness, group_type, source, price_item_id, quantity, unit, adopted, note, confirmed_at, revoked_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'required', 'student', 'user_added', ?, 30, '人', 1, '', ?, NULL)`).run(
    id, owner, schemeId, 'analysis-' + schemeId, 'estimate-' + schemeId, 'batch-' + schemeId,
    id, activityName, activityName, costName, costName, category, billingHint, priceItemId, '2026-09-02T00:00:00.000Z',
  );
}

const origin = 'https://pricing.test';
function jsonRequest(path, body) {
  return new Request(origin + path, { method: 'POST', headers: { Origin: origin, 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
}
const aliasCall = (owner, body) => activityAliasRequest(jsonRequest('/api/activity-aliases', body), owner, () => db);
const similarityCall = (owner, schemeId) => schemeSimilarityRequest(new Request(origin + '/api/scheme-similarity?schemeId=' + schemeId), owner, () => db);
const semanticCall = (owner, body, callSemantic) => activitySemanticRequest(jsonRequest('/api/activity-semantic', body), owner, () => db, {
  apiKey: 'test', model: 'deepseek-v4-flash', baseUrl: 'https://api.deepseek.com', callSemantic,
});

try {
  let semanticTransportBody;
  const semanticTransport = await callActivitySemanticAi({
    apiKey: 'deepseek-secret', baseUrl: 'https://api.deepseek.com', model: 'deepseek-v4-flash',
    activityName: '水稻收割体验', category: '农事体验', context: '10:00 水稻收割体验',
    candidates: ['割水稻'], signal: new AbortController().signal,
    fetchImpl: async (url, init) => {
      assert.equal(url, 'https://api.deepseek.com/responses');
      assert.equal(init.headers.Authorization, 'Bearer deepseek-secret');
      semanticTransportBody = JSON.parse(init.body);
      return new Response(JSON.stringify({ output: [{ content: [{ type: 'output_text', text: JSON.stringify({ candidate: '割水稻', similar: true, confidence: 0.92, reason: '均为水稻人工收割体验' }) }] }] }), { status: 200 });
    },
  });
  assert.equal(semanticTransport.candidate, '割水稻');
  assert.equal(semanticTransportBody.max_output_tokens, 500);
  assert.equal(semanticTransportBody.text.format.type, 'json_object');
  assert.equal(JSON.stringify(semanticTransportBody).includes('scheme_document'), false, '语义判断不得发送完整方案正文');

  const profile = (schemeId, activities) => ({ schemeId, analysisId: schemeId, title: schemeId, analysisDate: '', groupType: 'student', projectName: '农场', location: '农场', days: 1, participantBucket: '21-40', activities, canonicalActivities: activities, confirmed: true });
  const beforePure = scoreSchemeProfiles(profile('a', ['水稻收割体验', '动物投喂', '午餐']), profile('b', ['割水稻', '动物投喂', '午餐']));
  const afterPure = scoreSchemeProfiles(profile('a', ['割水稻', '动物投喂', '午餐']), profile('b', ['割水稻', '动物投喂', '午餐']));
  assert.ok(afterPure.score > beforePure.score);
  assert.equal(afterPure.commonActivities.length, 3);

  saveScheme('alice', 'history-a', '幼儿园秋季农耕研学', analysis({ activities: ['割水稻', '动物投喂', '午餐'], costs: ['午餐'] }));
  confirmCost('alice', 'history-a', '割水稻', '劳保手套');
  confirmCost('alice', 'history-a', '割水稻', '农具使用', '设备', 'fixed');
  saveScheme('alice', 'current-b', '幼儿园秋收体验', analysis({ activities: ['水稻收割体验', '萌宠喂养', '午餐'], costs: ['午餐'] }), '2026-09-03T00:00:00.000Z');

  const beforeAlias = await (await similarityCall('alice', 'current-b')).json();
  assert.equal(beforeAlias.similarSchemes.length, 0, '两个未归一活动不应凭方案类型误报相似');
  assert.equal((await aliasCall('alice', { action: 'accept', activityName: '水稻收割体验', canonicalName: '割水稻' })).status, 200);
  assert.equal((await aliasCall('alice', { action: 'accept', activityName: '萌宠喂养', canonicalName: '动物投喂' })).status, 200);
  const afterAliasResponse = await similarityCall('alice', 'current-b');
  assert.equal(afterAliasResponse.status, 200);
  const afterAlias = await afterAliasResponse.json();
  assert.equal(afterAlias.similarSchemes[0].schemeId, 'history-a');
  assert.equal(afterAlias.similarSchemes[0].commonActivities.length, 3);
  assert.equal(afterAlias.similarSchemes[0].confirmed, true);
  assert.equal(afterAlias.costSuggestions.some((item) => item.costName === '劳保手套'), true);
  assert.equal(afterAlias.sampleWarning.includes('样本较少'), true);
  assert.equal(JSON.stringify(afterAlias.costSuggestions).includes('amount'), false, '相似方案接口不得返回历史价格金额');

  assert.equal((await similarityCall('bob', 'current-b')).status, 404, '其他账号不能读取 Alice 的方案');
  saveScheme('bob', 'bob-current', 'Bob方案', analysis({ activities: ['水稻收割体验', '动物投喂', '午餐'] }));
  saveScheme('bob', 'bob-history', 'Bob历史', analysis({ activities: ['割水稻', '动物投喂', '午餐'] }));
  confirmCost('bob', 'bob-history', '割水稻', 'Bob成本');
  const bobSimilarity = await (await similarityCall('bob', 'bob-current')).json();
  assert.equal(bobSimilarity.similarSchemes[0].commonActivities.includes('割水稻'), false, 'Alice 的 alias 不得影响 Bob');
  assert.ok(bobSimilarity.similarSchemes[0].score < afterAlias.similarSchemes[0].score);

  saveScheme('semantic', 'semantic-history', '语义历史', analysis({ activities: ['割水稻'] }));
  confirmCost('semantic', 'semantic-history', '割水稻', '农具');
  saveScheme('semantic', 'semantic-current', '语义当前', analysis({ activities: ['秋收稻作'] }));
  let aiCalls = 0;
  const firstSemantic = await semanticCall('semantic', { schemeId: 'semantic-current', activityName: '秋收稻作' }, async ({ candidates }) => {
    aiCalls += 1;
    assert.deepEqual(candidates, ['割水稻']);
    return { candidate: '割水稻', similar: true, confidence: 0.91, reason: '均属于水稻成熟后的人工收割体验' };
  });
  assert.equal(firstSemantic.status, 200);
  assert.equal((await firstSemantic.json()).activity.source, 'ai');
  const cachedSemantic = await semanticCall('semantic', { schemeId: 'semantic-current', activityName: '秋收稻作' }, async () => {
    aiCalls += 1;
    throw new Error('缓存未命中');
  });
  assert.equal(cachedSemantic.status, 200);
  assert.equal((await cachedSemantic.json()).cached, true);
  assert.equal(aiCalls, 1, '同一活动候选不应重复调用 AI');

  saveScheme('rejecter', 'reject-history', '拒绝历史', analysis({ activities: ['割水稻'] }));
  confirmCost('rejecter', 'reject-history', '割水稻', '农具');
  saveScheme('rejecter', 'reject-current', '拒绝当前', analysis({ activities: ['稻田障碍赛'] }));
  assert.equal((await aliasCall('rejecter', { action: 'reject', activityName: '稻田障碍赛', candidateName: '割水稻' })).status, 200);
  let rejectedAiCalls = 0;
  const rejected = await semanticCall('rejecter', { schemeId: 'reject-current', activityName: '稻田障碍赛' }, async () => {
    rejectedAiCalls += 1;
    throw new Error('不应调用');
  });
  assert.equal(rejected.status, 200);
  assert.equal(rejectedAiCalls, 0);

  saveScheme('failure', 'failure-history', '失败历史', analysis({ activities: ['割水稻'] }));
  confirmCost('failure', 'failure-history', '割水稻', '农具');
  saveScheme('failure', 'failure-current', '失败当前', analysis({ activities: ['秋收稻作'] }));
  const failedAi = await semanticCall('failure', { schemeId: 'failure-current', activityName: '秋收稻作' }, async () => { throw new Error('provider down'); });
  assert.equal(failedAi.status, 503);
  assert.equal((await similarityCall('failure', 'failure-current')).status, 200, '语义 AI 失败不得影响相似方案服务');

  saveScheme('alice', 'sports', '体育急救方案', analysis({ activities: ['射击', '篮球', '急救'], costs: [], location: '城市体育馆' }), '2026-09-04T00:00:00.000Z');
  const sports = await (await similarityCall('alice', 'sports')).json();
  assert.equal(sports.similarSchemes.some((item) => item.schemeId === 'history-a'), false);

  sqlite.prepare(`INSERT INTO price_catalogs
    (id, owner_id, name, source, is_active, created_at, updated_at, version, import_hash)
    VALUES ('system-current', NULL, '当前系统价格', 'system', 1, '2026-09-01', '2026-09-01', 1, 'hash')`).run();
  sqlite.prepare(`INSERT INTO price_items
    (id, catalog_id, group_type, category, name, mode, amount, quantity, capacity, min_people, max_people,
      actual_only, note, sort_order, project_name, valid_from, valid_to)
    VALUES ('gloves-current', 'system-current', 'student', '材料耗材', '劳保手套', 'person', 28, 1, 1, 0, 10000, 0, '', 0, '', '', '')`).run();
  const costing = await schemeCostingRequest(jsonRequest('/api/scheme-costing', {
    schemeId: 'current-b', priceSource: 'system',
    addedCosts: [{ key: 'added-similar-gloves', name: '劳保手套', relatedActivity: '割水稻', category: '材料耗材', billingHint: 'per_participant', quantity: null, unit: '人', note: '相似方案建议', source: 'similar_scheme' }],
  }), 'alice', () => db);
  assert.equal(costing.status, 201);
  const costingBody = await costing.json();
  const gloves = costingBody.costing.items.find((item) => item.name === '劳保手套');
  assert.equal(gloves.origin, 'similar_scheme');
  assert.equal(gloves.unitPrice, 28, '采用相似方案成本后必须使用当前 price_items 价格');
  assert.equal(gloves.total, 840);

  const componentSource = readFileSync(new URL('../components/scheme-costing.tsx', import.meta.url), 'utf8');
  assert.match(componentSource, /相似方案建议/);
  assert.match(componentSource, /ActivitySemanticPanel/);
  assert.match(readFileSync(new URL('../app/learning/page.tsx', import.meta.url), 'utf8'), /活动标准化/);

  console.log('Passed: activity alias accept/reject/cache, deterministic similarity, owner isolation, sample warning, AI failure isolation, similar-cost adoption and current-price safety.');
} finally {
  sqlite.close();
}
