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

const { schemeCostingRequest } = await import('../lib/scheme-costing-service.ts');
const { schemeLearningRequest } = await import('../lib/scheme-learning-service.ts');

const sqlite = new DatabaseSync(':memory:');
const db = {
  prepare(sql) {
    const statement = sqlite.prepare(sql);
    return {
      bind(...args) {
        return {
          async run() { return statement.run(...args); },
          async first() { return statement.get(...args) ?? null; },
          async all() { return { results: statement.all(...args) }; },
        };
      },
    };
  },
};
for (const file of readdirSync(new URL('../drizzle/', import.meta.url)).filter((name) => name.endsWith('.sql')).sort())
  sqlite.exec(readFileSync(new URL('../drizzle/' + file, import.meta.url), 'utf8'));

const analysis = {
  schemaVersion: 1,
  summary: { groupType: 'student', projectName: null, travelDate: null, days: 1, location: null },
  participants: { total: 10, students: 10, children: 10, adults: null, parents: null, teachers: null, staff: null, notes: [] },
  activities: [{ name: '割水稻', normalizedName: '割水稻', category: '农事体验', time: null, durationMinutes: null, explicit: true, confidence: 'high', evidence: '方案活动' }],
  costCandidates: [
    { name: '午餐', normalizedName: '午餐', category: '餐饮', relatedActivity: '割水稻', source: 'explicit', quantity: null, unit: '人', billingHint: 'per_participant', requiredness: 'required', confidence: 'high', evidence: '统一用餐', reason: '方案明确午餐' },
    { name: '饮用水', normalizedName: '饮用水', category: '餐饮', relatedActivity: '割水稻', source: 'inferred', quantity: null, unit: '人', billingHint: 'per_participant', requiredness: 'possible', confidence: 'low', evidence: null, reason: '户外活动可能需要饮水' },
  ],
  missingInfo: [],
  warnings: [],
};

sqlite.prepare('INSERT INTO price_catalogs (id, owner_id, name, source, is_active, created_at, updated_at, version, import_hash) VALUES (?, NULL, ?, \'system\', 1, ?, ?, 1, ?)').run('system', '系统研学价格', '2026-04-01', '2026-04-01', 'system');
const priceInsert = 'INSERT INTO price_items (id, catalog_id, group_type, category, name, mode, amount, quantity, capacity, min_people, max_people, actual_only, note, sort_order, project_name, valid_from, valid_to) VALUES (?, ?, ?, ?, ?, ?, ?, 1, 1, 0, 10000, 0, \'\', 0, \'\', \'\', \'\')';
sqlite.prepare(priceInsert).run('lunch', 'system', 'student', '餐饮', '午餐', 'person', 25);
sqlite.prepare(priceInsert).run('student-lunch', 'system', 'student', '餐饮', '学生午餐', 'person', 30);

function saveScheme(owner, id) {
  sqlite.prepare('INSERT INTO scheme_documents (id, owner_id, title, file_name, file_type, raw_text, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)').run(id, owner, '割水稻方案', '方案.txt', 'txt', '方案正文', '2026-04-01', '2026-04-01');
  sqlite.prepare('INSERT INTO scheme_analyses (id, scheme_document_id, owner_id, analysis_json, model, prompt_version, source_text_hash, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)').run('analysis-' + id, id, owner, JSON.stringify(analysis), 'test-model', 'v1', 'hash-' + id, '2026-04-01');
}

async function callCost(method, owner, body, query = '') {
  return schemeCostingRequest(new Request('https://pricing.test/api/scheme-costing' + query, {
    method,
    headers: { Origin: 'https://pricing.test', 'Content-Type': 'application/json' },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  }), owner, () => db);
}

async function callLearning(method, owner, body, query = '') {
  return schemeLearningRequest(new Request('https://pricing.test/api/learning' + query, {
    method,
    headers: { Origin: 'https://pricing.test', 'Content-Type': 'application/json' },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  }), owner, () => db);
}

try {
  const costingPanelSource = readFileSync(
    new URL('../components/scheme-costing.tsx', import.meta.url),
    'utf8',
  );
  assert.match(costingPanelSource, /SchemeLink as Link/);
  assert.doesNotMatch(costingPanelSource, /from 'next\/link'/);
  const learningPageSource = readFileSync(
    new URL('../app/learning/page.tsx', import.meta.url),
    'utf8',
  );
  assert.match(learningPageSource, /SchemeLink as Link/);
  assert.doesNotMatch(learningPageSource, /from 'next\/link'/);

  assert.equal((await callLearning('POST', null, { action: 'confirm', schemeId: 'x' })).status, 401);
  const firstScheme = 'scheme-alice-0';
  saveScheme('alice', firstScheme);
  const initial = await callCost('POST', 'alice', { schemeId: firstScheme, priceSource: 'system' });
  assert.equal(initial.status, 201);
  await initial.json();
  assert.equal(sqlite.prepare('SELECT COUNT(*) AS count FROM activity_cost_templates WHERE owner_id = ?').get('alice').count, 0);

  const edited = await callCost('POST', 'alice', {
    schemeId: firstScheme,
    priceSource: 'system',
    edits: {
      '0': { name: '学生午餐', relatedActivity: '割水稻' },
      '1': { removed: true, removalAction: 'removed' },
    },
    addedCosts: [{ key: 'added-certificate', name: '研学证书', relatedActivity: '割水稻', category: '材料耗材', billingHint: 'fixed', quantity: 10, unit: '份', note: '用户补充', source: 'user_added' }],
  });
  assert.equal(edited.status, 201);
  const editedBody = await edited.json();
  assert.equal(editedBody.costing.items[0].selected.priceItemId, 'student-lunch');
  assert.equal(editedBody.costing.items[1].removed, true);
  assert.equal(editedBody.costing.items[2].origin, 'user_added');
  const confirmation = await callLearning('POST', 'alice', { action: 'confirm', schemeId: firstScheme, schemeCostEstimateId: editedBody.id });
  assert.equal(confirmation.status, 201);
  const confirmationBody = await confirmation.json();
  assert.equal(confirmationBody.summary.newRelations, 2);
  assert.equal(sqlite.prepare('SELECT COUNT(*) AS count FROM scheme_learning_feedback WHERE owner_id = ? AND action = ?').get('alice', 'renamed').count, 1);
  assert.equal(sqlite.prepare('SELECT COUNT(*) AS count FROM scheme_learning_feedback WHERE owner_id = ? AND action = ?').get('alice', 'removed').count, 1);
  assert.equal(sqlite.prepare('SELECT COUNT(*) AS count FROM scheme_learning_feedback WHERE owner_id = ? AND action = ?').get('alice', 'added').count, 1);
  assert.equal(sqlite.prepare('SELECT COUNT(*) AS count FROM scheme_learning_feedback WHERE owner_id = ? AND action = ?').get('alice', 'price_confirmed').count, 1);
  assert.equal(sqlite.prepare('SELECT COUNT(*) AS count FROM scheme_confirmed_costs WHERE owner_id = ?').get('alice').count, 3);
  assert.equal((await callLearning('POST', 'alice', { action: 'confirm', schemeId: firstScheme, schemeCostEstimateId: editedBody.id })).status, 409);

  const knowledge = await callLearning('GET', 'alice');
  const knowledgeBody = await knowledge.json();
  assert.equal(knowledge.status, 200);
  assert.equal(knowledgeBody.templates.some((item) => item.costName === '学生午餐' && item.positiveCount === 1), true);
  assert.equal(knowledgeBody.templates.some((item) => item.costName === '饮用水' && item.negativeCount === 1 && item.level === 'low'), true);
  assert.equal(knowledgeBody.recentBatches.length, 1);

  const alias = await callLearning('POST', 'alice', { action: 'alias_create', aliasName: '水稻收割体验', canonicalName: '割水稻' });
  assert.equal(alias.status, 200);
  assert.equal((await callLearning('GET', 'bob')).json instanceof Function, true);
  const bobKnowledge = await (await callLearning('GET', 'bob')).json();
  assert.equal(bobKnowledge.templates.length, 0);
  assert.equal((await callLearning('POST', 'bob', { action: 'revoke', batchId: confirmationBody.batchId })).status, 404);

  const confirmedBatchIds = [confirmationBody.batchId];
  for (let index = 1; index <= 3; index += 1) {
    const schemeId = 'scheme-alice-' + index;
    saveScheme('alice', schemeId);
    const costing = await callCost('POST', 'alice', { schemeId, priceSource: 'system', edits: { '0': { name: '学生午餐' }, '1': { removed: true, removalAction: 'not_applicable' } } });
    const costingBody = await costing.json();
    const result = await callLearning('POST', 'alice', { action: 'confirm', schemeId, schemeCostEstimateId: costingBody.id });
    assert.equal(result.status, 201);
    confirmedBatchIds.push((await result.json()).batchId);
  }
  const high = await (await callLearning('GET', 'alice')).json();
  const lunchTemplate = high.templates.find((item) => item.costName === '午餐');
  assert.equal(lunchTemplate, undefined);
  const studentLunch = high.templates.find((item) => item.costName === '学生午餐');
  assert.equal(studentLunch.positiveCount, 4);
  assert.equal(studentLunch.level, 'high');
  assert.equal(high.aliases.some((item) => item.aliasName === '水稻收割体验'), true);

  const disabledTemplate = studentLunch;
  const update = await callLearning('POST', 'alice', { action: 'template_update', templateId: disabledTemplate.id, costName: '学生团队餐', disabled: true });
  assert.equal(update.status, 200);
  const afterUpdate = await (await callLearning('GET', 'alice')).json();
  assert.equal(afterUpdate.templates.find((item) => item.id === disabledTemplate.id).costName, '学生团队餐');
  assert.equal(afterUpdate.templates.find((item) => item.id === disabledTemplate.id).isDisabled, true);

  const revoke = await callLearning('POST', 'alice', { action: 'revoke', batchId: confirmedBatchIds.at(-1) });
  assert.equal(revoke.status, 200);
  const afterRevoke = await (await callLearning('GET', 'alice')).json();
  assert.equal(afterRevoke.templates.find((item) => item.id === disabledTemplate.id).positiveCount, 3);

  sqlite.prepare('DELETE FROM scheme_documents WHERE id = ?').run(firstScheme);
  const afterSchemeDelete = await (await callLearning('GET', 'alice')).json();
  assert.equal(afterSchemeDelete.templates.length > 0, true);
  assert.equal((await callLearning('POST', 'alice', { action: 'alias_delete', aliasId: afterSchemeDelete.aliases[0].id })).status, 200);

  console.log('Passed: feedback gating, edit/add/remove/rename events, personal isolation, high/low recommendations, aliases, price feedback, revoke and scheme deletion retention.');
} finally {
  sqlite.close();
}

