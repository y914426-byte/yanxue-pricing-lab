import assert from 'node:assert/strict';
import { registerHooks, createRequire } from 'node:module';
import { DatabaseSync } from 'node:sqlite';
import { readFileSync, readdirSync, mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
registerHooks({
  resolve(s, c, next) {
    try {
      return next(s, c);
    } catch (e) {
      if (s.startsWith('./') && c.parentURL?.includes('/lib/'))
        return next(s + '.ts', c);
      throw e;
    }
  },
});
const {
  parseDelimited,
  previewMatrix,
  normalizeRow,
  matchesPrice,
  adoptPrices,
} = await import('../lib/price-data.ts');
const { priceLibraryRequest, isPriceAdmin } =
  await import('../lib/price-library.ts');
const { parseEstimate } = await import('../lib/estimate-input.ts');
const { estimateRequest } = await import('../lib/estimate-service.ts');
const { demo, population, calculate } = await import('../lib/pricing.ts');
const alice = {
    userId: 'google:alice',
    email: 'alice@example.invalid',
    displayName: 'Alice',
  },
  bob = {
    userId: 'google:bob',
    email: 'bob@example.invalid',
    displayName: 'Bob',
  };
const row = normalizeRow({
  groupType: 'student',
  name: '学生票',
  category: '门票',
  mode: 'child',
  amount: 30,
  projectName: '基地A',
  validFrom: '2026-09-01',
  validTo: '2026-09-30',
  minPeople: 20,
  maxPeople: 50,
});
const dir = mkdtempSync(join(tmpdir(), 'price-library-'));
let sqlite = new DatabaseSync(join(dir, 'db.sqlite'));
let failBatch = false,
  beforeBatch = null;
const db = {
  prepare(sql) {
    const statement = (args = []) => ({
      bind(...values) {
        return statement(values);
      },
      async run() {
        return sqlite.prepare(sql).run(...args);
      },
      async first() {
        return sqlite.prepare(sql).get(...args) ?? null;
      },
      async all() {
        return { results: sqlite.prepare(sql).all(...args) };
      },
    });
    return statement();
  },
  async batch(statements) {
    if (beforeBatch) {
      const fn = beforeBatch;
      beforeBatch = null;
      fn();
    }
    sqlite.exec('BEGIN');
    try {
      const result = [];
      for (let i = 0; i < statements.length; i++) {
        result.push(await statements[i].run());
        if (failBatch && i === 0) throw new Error('test failure');
      }
      sqlite.exec('COMMIT');
      return result;
    } catch (e) {
      sqlite.exec('ROLLBACK');
      throw e;
    }
  },
};
const origin = 'https://pricing.test',
  endpoint = origin + '/api/price-library';
const call = (query = '', user = null) =>
  priceLibraryRequest(
    new Request(endpoint + query),
    user,
    () => db,
    alice.email,
  );
const send = (body, user = alice, method = 'POST', source = origin) =>
  priceLibraryRequest(
    new Request(endpoint, {
      method: method === 'PATCH' ? 'PATCH' : 'POST',
      headers: { Origin: source, 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    }),
    user,
    () => db,
    alice.email,
  );
const payload = (changes = {}) => ({
  id: crypto.randomUUID(),
  name: '学生团秋季价',
  source: 'user',
  rows: [row],
  ...changes,
});
const count = () =>
  sqlite.prepare('SELECT count(*) AS n FROM price_catalogs').get().n;
try {
  const migrations = readdirSync(new URL('../drizzle/', import.meta.url))
    .filter((f) => f.endsWith('.sql'))
    .sort();
  const journal = JSON.parse(
    readFileSync(
      new URL('../drizzle/meta/_journal.json', import.meta.url),
      'utf8',
    ),
  );
  assert.deepEqual(
    journal.entries.map((e) => e.tag + '.sql'),
    migrations,
  );
  for (const f of migrations)
    sqlite.exec(
      readFileSync(new URL('../drizzle/' + f, import.meta.url), 'utf8'),
    );
  assert.deepEqual(
    sqlite.prepare('PRAGMA integrity_check').get(),
    Object.assign(Object.create(null), { integrity_check: 'ok' }),
  );
  // Import parsing must distinguish missing prices from genuinely free entries.
  assert.equal(
    previewMatrix(
      parseDelimited('团体类型,项目名称,计费方式,单价\n学生团,门票,按学生,0'),
    ).rows[0].amount,
    0,
  );
  for (const data of [
    '学生团,门票,按学生,',
    '拼错团型,门票,按学生,30',
    '学生团,门票,拼错单位,30',
    '学生团,门票,按学生,-1',
    '学生团,门票,按学生,Infinity',
  ])
    assert.ok(
      previewMatrix(parseDelimited('团体类型,项目名称,计费方式,单价\n' + data))
        .errors.length,
    );
  assert.throws(() =>
    previewMatrix([
      ['团体类型', '项目名称', '计费方式'],
      ['学生团', '票', '按学生'],
    ]),
  );
  assert.throws(() =>
    previewMatrix([['团体类型', '项目名称', '计费方式', '单价', 'amount']]),
  );
  const csv =
    '\uFEFF团体类型,项目名称,计费方式,单价,备注\r\n学生团,"基地,学生票",按学生,30,"第一行\n第二行 ""引号"""';
  const parsed = previewMatrix(parseDelimited(csv));
  assert.equal(parsed.errors.length, 0);
  assert.equal(parsed.rows[0].name, '基地,学生票');
  assert.equal(parsed.rows[0].note, '第一行\n第二行 "引号"');
  assert.throws(() => parseDelimited('a,b\n"unterminated'));
  assert.throws(() => normalizeRow({ ...row, validFrom: '2026-02-30' }));
  assert.throws(() => normalizeRow({ ...row, validTo: '2026-08-01' }));
  assert.throws(() => normalizeRow({ ...row, quantity: 10001 }));
  assert.throws(() => normalizeRow({ ...row, mode: 'family' }));
  assert.equal(normalizeRow({ ...row, quantity: 0 }).quantity, 0);
  const template = previewMatrix(
    parseDelimited(
      readFileSync(
        new URL('../public/price-template.csv', import.meta.url),
        'utf8',
      ),
    ),
  );
  assert.equal(template.errors.length, 0);
  assert.equal(template.rows.length, 3);
  // Real XLSX bytes through the production library, including two selectable sheets.
  const require = createRequire(import.meta.resolve('read-excel-file/node'));
  const { zipSync, strToU8 } = require('fflate');
  const cells = ['团体类型', '项目名称', '计费方式', '单价']
    .map(
      (s, i) => `<c r="${'ABCD'[i]}1" t="inlineStr"><is><t>${s}</t></is></c>`,
    )
    .join('');
  const sheet = `<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetData><row r="1">${cells}</row><row r="2"><c r="A2" t="inlineStr"><is><t>学生团</t></is></c><c r="B2" t="inlineStr"><is><t>Excel门票</t></is></c><c r="C2" t="inlineStr"><is><t>按学生</t></is></c><c r="D2"><v>28.5</v></c></row></sheetData></worksheet>`;
  const files = {
    '[Content_Types].xml':
      '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="xml" ContentType="application/xml"/><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/></Types>',
    '_rels/.rels':
      '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>',
    'xl/workbook.xml':
      '<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets><sheet name="学生团" sheetId="1" r:id="rId1"/><sheet name="备用价格" sheetId="2" r:id="rId2"/></sheets></workbook>',
    'xl/_rels/workbook.xml.rels':
      '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/><Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet2.xml"/></Relationships>',
    'xl/worksheets/sheet1.xml': sheet,
    'xl/worksheets/sheet2.xml': sheet,
  };
  const bytes = zipSync(
    Object.fromEntries(Object.entries(files).map(([k, v]) => [k, strToU8(v)])),
  );
  const { default: readXlsx } = await import('read-excel-file/node');
  const sheets = await readXlsx(Buffer.from(bytes));
  assert.equal(sheets.length, 2);
  assert.equal(previewMatrix(sheets[0].data).rows[0].amount, 28.5);
  // Authentication, ownership and immutable import identifiers.
  assert.equal(isPriceAdmin(alice, ' ALICE@example.invalid '), true);
  assert.equal(isPriceAdmin(alice, undefined), false);
  assert.equal((await call('?source=typo')).status, 400);
  assert.equal((await call('?source=user')).status, 200);
  assert.equal((await (await call('?source=user')).json()).needsLogin, true);
  assert.equal((await send(payload(), null)).status, 401);
  assert.equal(
    (await send(payload(), alice, 'POST', 'https://evil.test')).status,
    403,
  );
  assert.equal((await send(payload({ source: 'system' }), bob)).status, 403);
  assert.equal((await call('?source=system&manage=1', bob)).status, 403);
  assert.equal((await call()).status, 200);
  const seeded = count();
  await call();
  assert.equal(count(), seeded);
  const a = payload();
  assert.equal((await send(a)).status, 201);
  assert.equal((await send(a)).status, 201);
  assert.equal(count(), seeded + 1);
  assert.equal((await send({ ...a, name: 'conflict' })).status, 409);
  assert.equal((await send(a, bob)).status, 409);
  assert.equal(
    (await (await call('?source=user&catalog=' + a.id, bob)).json()).catalogs
      .length,
    0,
  );
  assert.equal(
    (await send({ id: a.id, version: 1, isActive: false }, bob, 'PATCH'))
      .status,
    404,
  );
  assert.equal(
    (await send(payload({ replacesId: a.id, version: 1 }), bob)).status,
    404,
  );
  const publicPrice = payload({ source: 'system' });
  assert.equal((await send(publicPrice)).status, 201);
  const publicResponse = await (
    await call('?source=system&catalog=' + publicPrice.id)
  ).json();
  assert.equal(
    publicResponse.catalogs.find((c) => c.id === publicPrice.id).items[0]
      .amount,
    30,
  );
  // Preview and adoption: actual people (not families), bounds, dates, units, zero quantity.
  const result = await (
    await call('?source=user&catalog=' + a.id, alice)
  ).json();
  const catalog = result.catalogs[0],
    price = catalog.items[0];
  const plan = {
    ...demo,
    costs: [],
    priceProject: '基地A',
    travelDate: '2026-09-01',
    priceSource: 'user',
    priceCatalogId: a.id,
  };
  assert.ok(matchesPrice(price, plan));
  assert.ok(matchesPrice(price, { ...plan, travelDate: '2026-09-30' }));
  for (const patch of [
    { travelDate: '' },
    { travelDate: '2026-10-01' },
    { priceProject: '基地B' },
    { paying: 49 },
    { paying: 17 },
    { groupType: 'adult' },
  ])
    assert.equal(matchesPrice(price, { ...plan, ...patch }), false);
  assert.equal(
    matchesPrice(
      { ...price, groupType: 'family', minPeople: 60, maxPeople: 62 },
      {
        ...plan,
        billing: 'family',
        groupType: 'family',
        paying: 20,
        adultsPerFamily: 1,
        childrenPerFamily: 2,
      },
    ),
    true,
  );
  const adopted = adoptPrices(plan, catalog, [price]);
  assert.equal(calculate(adopted).subtotal, 1200);
  assert.equal(adopted.costs[0].priceOrigin.unitPrice, 30);
  assert.equal(adoptPrices(adopted, catalog, [price]).costs.length, 1);
  const zero = adoptPrices(plan, catalog, [
    { ...price, mode: 'fixed', quantity: 0 },
  ]);
  assert.equal(calculate(zero).subtotal, 0);
  assert.throws(() =>
    adoptPrices(
      {
        ...plan,
        costs: Array.from({ length: 100 }, (_, i) => ({
          ...demo.costs[0],
          name: String(i),
        })),
      },
      catalog,
      [price],
    ),
  );
  assert.deepEqual(population({ ...demo, groupType: 'adult' }), {
    adults: 42,
    children: 0,
    families: 0,
    attendees: 42,
  });
  // Historical quote preserves provenance after library replacement and reopening DB.
  const record = {
    id: crypto.randomUUID(),
    title: '采用价格库',
    plan: adopted,
  };
  assert.deepEqual(parseEstimate(record).plan, adopted);
  const saved = await estimateRequest(
    new Request(origin + '/api/estimates', {
      method: 'POST',
      headers: { Origin: origin, 'Content-Type': 'application/json' },
      body: JSON.stringify(record),
    }),
    alice.userId,
    () => db,
  );
  assert.equal(saved.status, 201);
  const replacement = payload({
    replacesId: a.id,
    version: 1,
    rows: [{ ...row, amount: 45 }],
  });
  assert.equal((await send(replacement)).status, 201);
  assert.equal((await send(replacement)).status, 201);
  assert.equal(
    sqlite.prepare('SELECT is_active FROM price_catalogs WHERE id=?').get(a.id)
      .is_active,
    0,
  );
  assert.equal(
    (await send(payload({ replacesId: a.id, version: 1 }))).status,
    409,
  );
  sqlite.close();
  sqlite = new DatabaseSync(join(dir, 'db.sqlite'));
  const restored = await estimateRequest(
    new Request(origin + '/api/estimates?id=' + record.id),
    alice.userId,
    () => db,
  );
  assert.deepEqual((await restored.json()).plan, adopted);
  assert.equal(
    (
      await send(
        { id: replacement.id, version: 2, isActive: false },
        alice,
        'PATCH',
      )
    ).status,
    200,
  );
  assert.equal(
    (
      await send(
        { id: replacement.id, version: 2, isActive: true },
        alice,
        'PATCH',
      )
    ).status,
    409,
  );
  assert.equal(
    (
      await send(
        { id: replacement.id, version: 3, isActive: true },
        alice,
        'PATCH',
      )
    ).status,
    200,
  );
  // 300 rows fit the endpoint size and query limits; any validation or batch failure is atomic.
  const bulk = payload({
    rows: Array.from({ length: 300 }, (_, i) => ({
      ...row,
      name: '门票 ' + i,
    })),
  });
  assert.equal((await send(bulk)).status, 201);
  assert.equal(
    sqlite
      .prepare('SELECT count(*) AS n FROM price_items WHERE catalog_id=?')
      .get(bulk.id).n,
    300,
  );
  assert.equal(
    (await send(payload({ rows: Array(301).fill(row) }))).status,
    400,
  );
  const n = count();
  failBatch = true;
  assert.equal((await send(payload())).status, 503);
  failBatch = false;
  assert.equal(count(), n);
  const concurrent = payload({ replacesId: bulk.id, version: 1 });
  beforeBatch = () =>
    sqlite
      .prepare('UPDATE price_catalogs SET version=2 WHERE id=?')
      .run(bulk.id);
  assert.equal((await send(concurrent)).status, 409);
  assert.equal(count(), n);
  assert.equal(
    sqlite
      .prepare('SELECT is_active FROM price_catalogs WHERE id=?')
      .get(bulk.id).is_active,
    1,
  );
  for (const bad of [
    null,
    [],
    {},
    payload({ rows: [{ ...row, amount: '' }] }),
    payload({ rows: [row, row] }),
    payload({ name: 'x'.repeat(81) }),
  ])
    assert.equal((await send(bad)).status, 400);
  const offline = await priceLibraryRequest(
    new Request(endpoint),
    alice,
    () => {
      throw new Error('private database detail');
    },
    alice.email,
  );
  assert.equal(offline.status, 503);
  assert.doesNotMatch(await offline.text(), /private database detail/);
  assert.equal(
    (
      await send(
        { id: 'system-default-v1', version: 1, isActive: false },
        alice,
        'PATCH',
      )
    ).status,
    200,
  );
  await call();
  assert.equal(
    sqlite
      .prepare('SELECT is_active FROM price_catalogs WHERE id=?')
      .get('system-default-v1').is_active,
    0,
  );
  console.log(
    'Passed: CSV/TSV/XLSX parsing, validation, dates and population matching, admin and account isolation, retry idempotency, atomic 300-row imports, concurrent version conflicts, disable/restore, quote provenance and persistence.',
  );
} finally {
  sqlite.close();
  rmSync(dir, { recursive: true, force: true });
}
