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
const { costScheme, populationFacts } = await import('../lib/scheme-costing.ts');

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
for (const file of readdirSync(new URL('../drizzle/', import.meta.url))
  .filter((name) => name.endsWith('.sql')).sort())
  sqlite.exec(readFileSync(new URL('../drizzle/' + file, import.meta.url), 'utf8'));

const endpoint = 'https://pricing.test/api/scheme-costing';
const analysis = {
  schemaVersion: 1,
  summary: { groupType: 'student', projectName: '苏州江南农耕文化园', travelDate: '2026-05-01', days: 1, location: '苏州' },
  participants: { total: 64, students: 60, children: 60, adults: 4, parents: null, teachers: 4, staff: null, notes: [] },
  activities: [],
  costCandidates: [
    { name: '学生午餐', normalizedName: '午餐', category: '餐饮', relatedActivity: '午餐', source: 'explicit', quantity: null, unit: '人', billingHint: 'per_participant', requiredness: 'required', confidence: 'high', evidence: '中午统一用餐', reason: '方案明确写出统一用餐' },
    { name: '动物农场手工材料', normalizedName: '动物农场手工材料', category: '材料耗材', relatedActivity: '动物农场手工', source: 'inferred', quantity: null, unit: '份', billingHint: 'per_child', requiredness: 'possible', confidence: 'medium', evidence: null, reason: '手工活动可能需要材料' },
    { name: '活动保险', normalizedName: '保险', category: '保险', relatedActivity: null, source: 'inferred', quantity: null, unit: '人', billingHint: 'per_participant', requiredness: 'possible', confidence: 'medium', evidence: null, reason: '户外活动可能需要保险' },
    { name: '车辆', normalizedName: '车辆', category: '交通', relatedActivity: '往返交通', source: 'explicit', quantity: null, unit: '批', billingHint: 'capacity_batch', requiredness: 'required', confidence: 'high', evidence: '统一乘车', reason: '方案写明统一乘车' },
    { name: '演出', normalizedName: '演出', category: '表演/课程', relatedActivity: '动物表演', source: 'explicit', quantity: 1, unit: '场', billingHint: 'fixed', requiredness: 'possible', confidence: 'high', evidence: '动物表演', reason: '方案明确写出动物表演' },
    { name: '医疗应急物资', normalizedName: '医疗应急物资', category: '设备', relatedActivity: null, source: 'inferred', quantity: null, unit: '份', billingHint: 'per_child', requiredness: 'possible', confidence: 'low', evidence: null, reason: '没有可靠价格项目' },
    { name: '日期票', normalizedName: '日期票', category: '门票/场地', relatedActivity: null, source: 'explicit', quantity: 1, unit: '项', billingHint: 'fixed', requiredness: 'possible', confidence: 'high', evidence: '日期票', reason: '测试日期过滤' },
    { name: '其他景区门票', normalizedName: '其他景区门票', category: '门票/场地', relatedActivity: null, source: 'explicit', quantity: 1, unit: '项', billingHint: 'fixed', requiredness: 'possible', confidence: 'high', evidence: '门票', reason: '测试项目过滤' },
    { name: '大团活动', normalizedName: '大团活动', category: '表演/课程', relatedActivity: null, source: 'explicit', quantity: 1, unit: '场', billingHint: 'fixed', requiredness: 'possible', confidence: 'high', evidence: '大团活动', reason: '测试人数范围过滤' },
  ],
  missingInfo: [],
  warnings: [],
};

function addCatalog(id, owner, source, name, items) {
  sqlite.prepare('INSERT INTO price_catalogs (id, owner_id, name, source, is_active, created_at, updated_at, version, import_hash) VALUES (?, ?, ?, ?, 1, ?, ?, 1, ?)').run(id, source === 'user' ? owner : null, name, source, '2026-04-01T00:00:00.000Z', '2026-04-01T00:00:00.000Z', id);
  const insert = 'INSERT INTO price_items (id, catalog_id, group_type, category, name, mode, amount, quantity, capacity, min_people, max_people, actual_only, note, sort_order, project_name, valid_from, valid_to) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?, ?, ?, ?, ?)';
  for (const [index, item] of items.entries())
    sqlite.prepare(insert).run(item.id, id, item.groupType ?? 'student', item.category, item.name, item.mode, item.amount, item.quantity ?? 1, item.capacity ?? 1, item.minPeople ?? 0, item.maxPeople ?? 10000, '', index, item.projectName ?? '', item.validFrom ?? '', item.validTo ?? '');
}
addCatalog('alice-personal', 'alice', 'user', 'Alice 价格库', [
  { id: 'alice-lunch', name: '午餐', category: '餐饮', mode: 'person', amount: 25 },
  { id: 'alice-material', name: '动物手工材料', category: '材料耗材', mode: 'child', amount: 6 },
]);
addCatalog('system-main', null, 'system', '系统研学价格库', [
  { id: 'system-lunch', name: '午餐', category: '餐饮', mode: 'person', amount: 30 },
  { id: 'system-insurance', name: '保险', category: '保险', mode: 'person', amount: 5 },
  { id: 'system-vehicle', name: '车辆', category: '交通', mode: 'batch', amount: 800, capacity: 45 },
  { id: 'system-performance-a', name: '演出', category: '表演/课程', mode: 'fixed', amount: 100 },
  { id: 'system-performance-b', name: '演出', category: '表演/课程', mode: 'fixed', amount: 200 },
  { id: 'system-date', name: '日期票', category: '门票/场地', mode: 'fixed', amount: 10, validFrom: '2025-01-01', validTo: '2025-12-31' },
  { id: 'system-other-project', name: '其他景区门票', category: '门票/场地', mode: 'fixed', amount: 20, projectName: '其他景区' },
  { id: 'system-large-group', name: '大团活动', category: '课程研学', mode: 'fixed', amount: 20, minPeople: 100, maxPeople: 200 },
]);
addCatalog('bob-personal', 'bob', 'user', 'Bob 价格库', [
  { id: 'bob-private-lunch', name: '私有午餐', category: '餐饮', mode: 'person', amount: 1 },
]);

function saveScheme(owner, id = 'scheme-' + owner) {
  sqlite.prepare('INSERT INTO scheme_documents (id, owner_id, title, file_name, file_type, raw_text, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)').run(id, owner, '农耕研学', '农耕研学.txt', 'txt', '60名儿童 + 4名老师', '2026-04-01T00:00:00.000Z', '2026-04-01T00:00:00.000Z');
  sqlite.prepare('INSERT INTO scheme_analyses (id, scheme_document_id, owner_id, analysis_json, model, prompt_version, source_text_hash, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)').run('analysis-' + id, id, owner, JSON.stringify(analysis), 'test-model', 'v1', 'hash-' + id, '2026-04-01T00:00:00.000Z');
  return id;
}
async function call(method, owner, body, query = '') {
  return schemeCostingRequest(new Request(endpoint + query, {
    method,
    headers: { Origin: 'https://pricing.test', 'Content-Type': 'application/json' },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  }), owner, () => db);
}

try {
  assert.equal((await call('POST', null, { schemeId: 'x' })).status, 401);
  const scheme = saveScheme('alice');
  assert.equal((await call('GET', 'bob', undefined, '?schemeId=' + scheme)).status, 404);
  assert.equal((await call('POST', 'bob', { schemeId: scheme, priceSource: 'personal_first' })).status, 404);

  const first = await call('POST', 'alice', { schemeId: scheme, priceSource: 'personal_first' });
  assert.equal(first.status, 201);
  const firstBody = await first.json();
  const firstResult = firstBody.costing;
  assert.equal(firstResult.items[0].status, 'normalized');
  assert.equal(firstResult.items[0].selected.priceItemId, 'alice-lunch');
  assert.equal(firstResult.items[0].unitPrice, 25);
  assert.equal(firstResult.items[0].total, 1600);
  assert.equal(firstResult.items[1].status, 'suggested');
  assert.equal(firstResult.items[1].total, null);
  assert.equal(firstResult.items[2].selected.priceItemId, 'system-insurance');
  assert.equal(firstResult.items[2].total, 320);
  assert.equal(firstResult.items[3].total, 1600);
  assert.equal(firstResult.items[4].status, 'multiple');
  assert.equal(firstResult.items[4].total, null);
  assert.equal(firstResult.items[5].status, 'unmatched');
  assert.equal(firstResult.items[6].status, 'unmatched');
  assert.equal(firstResult.items[7].status, 'unmatched');
  assert.equal(firstResult.items[8].status, 'unmatched');
  assert.equal(firstResult.knownCostTotal, 3520);
  assert.equal(firstResult.counts.matched, 3);
  assert.equal(firstResult.allRequiredResolved, true);

  const search = await call('GET', 'alice', undefined, '?schemeId=' + scheme + '&priceSource=personal_first&search=私有午餐');
  assert.equal(search.status, 200);
  assert.equal((await search.json()).items.length, 0);

  sqlite.prepare('UPDATE price_items SET amount = 99 WHERE id = ?').run('alice-lunch');
  const old = await call('GET', 'alice', undefined, '?schemeId=' + scheme);
  assert.equal((await old.json()).costing.items[0].unitPrice, 25);

  const adopted = await call('POST', 'alice', { schemeId: scheme, priceSource: 'personal_first', decisions: { '1': 'alice-material' } });
  assert.equal(adopted.status, 201);
  const adoptedBody = await adopted.json();
  assert.equal(adoptedBody.costing.items[1].decision, 'accepted');
  assert.equal(adoptedBody.costing.items[1].total, 360);
  assert.equal(adoptedBody.costing.items[0].unitPrice, 99);
  assert.equal(adoptedBody.costing.knownCostTotal, 8616);
  assert.equal(sqlite.prepare('SELECT COUNT(*) AS count FROM scheme_cost_estimates WHERE scheme_document_id = ?').get(scheme).count, 2);

  const unknownScheme = saveScheme('alice', 'scheme-unknown');
  sqlite.prepare('UPDATE scheme_analyses SET analysis_json = ? WHERE scheme_document_id = ?').run(JSON.stringify({ ...analysis, summary: { ...analysis.summary, groupType: 'unknown' }, costCandidates: [analysis.costCandidates[0]] }), unknownScheme);
  const unknown = await call('POST', 'alice', { schemeId: unknownScheme, priceSource: 'system' });
  assert.equal((await unknown.json()).costing.items[0].status, 'info_insufficient');
  const manualGroup = await call('POST', 'alice', { schemeId: unknownScheme, priceSource: 'system', groupType: 'student' });
  assert.equal((await manualGroup.json()).costing.items[0].total, 1920);

  const modeBase = { ...analysis, costCandidates: [] };
  const modeAnalysis = { ...modeBase, costCandidates: [
    { ...analysis.costCandidates[0], name: '固定材料', normalizedName: '固定材料', quantity: 2, billingHint: 'fixed' },
    { ...analysis.costCandidates[0], name: '按人材料', normalizedName: '按人材料', billingHint: 'per_participant' },
    { ...analysis.costCandidates[0], name: '分批车辆', normalizedName: '分批车辆', billingHint: 'capacity_batch' },
    { ...analysis.costCandidates[0], name: '成人服务', normalizedName: '成人服务', billingHint: 'per_adult' },
    { ...analysis.costCandidates[0], name: '儿童服务', normalizedName: '儿童服务', billingHint: 'per_child' },
  ]};
  const modeItems = [
    { id: 'fixed', name: '固定材料', mode: 'fixed', amount: 10, quantity: 1 },
    { id: 'person', name: '按人材料', mode: 'person', amount: 2 },
    { id: 'batch', name: '分批车辆', mode: 'batch', amount: 100, capacity: 45 },
    { id: 'adult', name: '成人服务', mode: 'adult', amount: 3 },
    { id: 'child', name: '儿童服务', mode: 'child', amount: 4 },
  ].map((item) => ({ ...item, catalogId: 'test', catalogName: 'test', catalogVersion: 1, source: 'system', groupType: 'student', category: '其他', capacity: item.capacity ?? 1, minPeople: 0, maxPeople: 10000, actualOnly: false, note: '', projectName: '', validFrom: '', validTo: '' }));
  assert.deepEqual(costScheme(modeAnalysis, 'mode-analysis', modeItems, 'system').items.map((item) => item.total), [20, 128, 200, 12, 240]);

  const familyAnalysis = { ...analysis, summary: { ...analysis.summary, groupType: 'family' }, costCandidates: [{ ...analysis.costCandidates[0], name: '家庭体验', normalizedName: '家庭体验', quantity: 5, billingHint: 'per_family' }] };
  const familyItem = { ...modeItems[0], id: 'family', name: '家庭体验', groupType: 'family', mode: 'family', amount: 7 };
  assert.equal(costScheme(familyAnalysis, 'family-analysis', [familyItem], 'system').items[0].total, 35);
  assert.equal(populationFacts(familyAnalysis, 'family').families, null);

  console.log('Passed: scheme costing isolation, source priority/fallback, name match levels, filtering, quantity modes, snapshots, manual adoption and unknown group handling.');
} finally {
  sqlite.close();
}

