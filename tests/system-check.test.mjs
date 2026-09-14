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

const { systemCheckRequest } = await import('../lib/system-check-service.ts');
const { schemeCostingRequest } = await import('../lib/scheme-costing-service.ts');
const { schemeLearningRequest } = await import('../lib/scheme-learning-service.ts');

const migrationFiles = readdirSync(new URL('../drizzle/', import.meta.url))
  .filter((name) => name.endsWith('.sql'))
  .sort();

function makeDb(lastMigration = migrationFiles.length - 1) {
  const sqlite = new DatabaseSync(':memory:');
  for (const file of migrationFiles.slice(0, lastMigration + 1))
    sqlite.exec(readFileSync(new URL('../drizzle/' + file, import.meta.url), 'utf8'));
  return {
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
    sqlite,
  };
}

function checkRequest(db, user = { userId: 'google:admin', displayName: 'Admin', email: 'admin@example.test' }, env = {}) {
  return systemCheckRequest(
    new Request('https://pricing.test/api/admin/system-check', {
      headers: { Origin: 'https://pricing.test' },
    }),
    user,
    {
      env: { DB: db, GOOGLE_CLIENT_ID: 'configured.apps.googleusercontent.com', OPENAI_API_KEY: 'secret-value', AI_ANALYSIS_MODEL: 'gpt-5.6-luna', OPENAI_API_BASE: 'https://api.openai.com/v1', ...env },
      isAdmin: (current) => current.email === 'admin@example.test',
    },
  );
}

for (const [lastMigration, missing, hint] of [[4, 'scheme_analyses', '0005_careful_jean_grey.sql'], [5, 'scheme_cost_estimates', '0006_organic_micromax.sql'], [6, 'activity_cost_templates', '0007_faulty_arclight.sql'], [7, 'activity_alias_feedback', '0008_last_edwin_jarvis.sql']]) {
  const response = await checkRequest(makeDb(lastMigration));
  assert.equal(response.status, 200);
  const body = await response.json();
  assert.equal(body.tables[missing].present, false);
  assert.ok(body.migrationHints.includes('需要执行 ' + hint));
}

assert.equal((await systemCheckRequest(new Request('https://pricing.test/api/admin/system-check', { headers: { Origin: 'https://pricing.test' } }), null, { env: {}, isAdmin: () => false })).status, 401);
assert.equal((await checkRequest(makeDb(), { userId: 'google:user', displayName: 'User', email: 'user@example.test' })).status, 403);

const fullCheck = await checkRequest(makeDb());
assert.equal(fullCheck.status, 200);
const fullBody = await fullCheck.json();
assert.equal(fullBody.configuration.openai.apiKeyConfigured, true);
assert.equal(fullBody.configuration.openai.model, 'gpt-5.6-luna');
assert.equal(fullBody.tables.scheme_analyses.present, true);
assert.equal(fullBody.tables.scheme_learning_feedback.present, true);
assert.equal(fullBody.tables.activity_alias_feedback.present, true);
assert.equal(JSON.stringify(fullBody).includes('secret-value'), false);
assert.equal(Object.hasOwn(fullBody.configuration.openai, 'apiKey'), false);

function minimalAnalysis() {
  return {
    schemaVersion: 1,
    summary: { groupType: 'student', projectName: null, travelDate: null, days: null, location: null },
    participants: { total: null, students: null, children: null, adults: null, parents: null, teachers: null, staff: null, notes: [] },
    activities: [], costCandidates: [{ name: '测试成本', normalizedName: '测试成本', category: '其他', relatedActivity: null, source: 'explicit', quantity: null, unit: '项', billingHint: 'fixed', requiredness: 'possible', confidence: 'high', evidence: '测试正文', reason: '版本一致性测试' }], missingInfo: [], warnings: [],
  };
}

const versionDb = makeDb().sqlite;
const db = {
  prepare(sql) {
    const statement = versionDb.prepare(sql);
    return { bind(...args) { return { async run() { return statement.run(...args); }, async first() { return statement.get(...args) ?? null; }, async all() { return { results: statement.all(...args) }; } }; }, };
  },
};
versionDb.prepare('INSERT INTO scheme_documents (id, owner_id, title, file_name, file_type, raw_text, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)').run('scheme-version', 'alice', '版本检查', 'version.txt', 'txt', '正文', '2026-04-01T00:00:00.000Z', '2026-04-01T00:00:00.000Z');
const analysisJson = JSON.stringify(minimalAnalysis());
versionDb.prepare('INSERT INTO scheme_analyses (id, scheme_document_id, owner_id, analysis_json, model, prompt_version, source_text_hash, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)').run('analysis-a', 'scheme-version', 'alice', analysisJson, 'test-model', 'v1', 'hash-a', '2026-04-01T00:00:00.000Z');
const endpoint = 'https://pricing.test/api/scheme-costing';
const callCosting = (method, body, query = '') => schemeCostingRequest(new Request(endpoint + query, { method, headers: { Origin: 'https://pricing.test', 'Content-Type': 'application/json' }, ...(body === undefined ? {} : { body: JSON.stringify(body) }) }), 'alice', () => db);
const callLearning = (body) => schemeLearningRequest(new Request('https://pricing.test/api/learning', { method: 'POST', headers: { Origin: 'https://pricing.test', 'Content-Type': 'application/json' }, body: JSON.stringify(body) }), 'alice', () => db);

const firstCosting = await callCosting('POST', { schemeId: 'scheme-version', priceSource: 'system' });
assert.equal(firstCosting.status, 201);
const firstCostingBody = await firstCosting.json();
versionDb.prepare('INSERT INTO scheme_analyses (id, scheme_document_id, owner_id, analysis_json, model, prompt_version, source_text_hash, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)').run('analysis-b', 'scheme-version', 'alice', analysisJson, 'test-model', 'v1', 'hash-b', '2026-04-02T00:00:00.000Z');
const staleCosting = await callCosting('GET', undefined, '?schemeId=scheme-version');
const staleBody = await staleCosting.json();
assert.equal(staleBody.stale, true);
assert.equal(staleBody.schemeAnalysisId, 'analysis-a');
const oldLearning = await callLearning({ action: 'confirm', schemeId: 'scheme-version', schemeCostEstimateId: firstCostingBody.id });
assert.equal(oldLearning.status, 409);
const secondCosting = await callCosting('POST', { schemeId: 'scheme-version', priceSource: 'system' });
assert.equal(secondCosting.status, 201);
const secondCostingBody = await secondCosting.json();
assert.notEqual(secondCostingBody.id, firstCostingBody.id);
const currentLearning = await callLearning({ action: 'confirm', schemeId: 'scheme-version', schemeCostEstimateId: secondCostingBody.id });
assert.equal(currentLearning.status, 201);
assert.equal(versionDb.prepare('SELECT COUNT(*) AS count FROM scheme_cost_estimates WHERE scheme_document_id = ?').get('scheme-version').count, 2);
assert.equal(versionDb.prepare('SELECT scheme_analysis_id FROM scheme_confirmed_costs WHERE scheme_cost_estimate_id = ?').get(secondCostingBody.id).scheme_analysis_id, 'analysis-b');

console.log('system-check and costing version tests passed');
const systemCheckPageSource = readFileSync(
  new URL('../app/admin/system-check/page.tsx', import.meta.url),
  'utf8',
);
assert.match(systemCheckPageSource, /SchemeLink as Link/);
assert.doesNotMatch(systemCheckPageSource, /from 'next\/link'/);
