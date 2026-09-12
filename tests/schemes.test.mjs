import assert from 'node:assert/strict';
import { registerHooks } from 'node:module';
import { DatabaseSync } from 'node:sqlite';
import { readFileSync, readdirSync } from 'node:fs';
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
const { schemeRequest } = await import('../lib/scheme-service.ts');
const { validateSchemeFile, MAX_TEXT_LENGTH } =
  await import('../lib/scheme-input.ts');
const { parseSchemeFile } = await import('../lib/scheme-parser.ts');
const sqlite = new DatabaseSync(':memory:');
const db = {
  prepare(sql) {
    const s = sqlite.prepare(sql);
    return {
      bind(...args) {
        return {
          async run() {
            return s.run(...args);
          },
          async first() {
            return s.get(...args) ?? null;
          },
          async all() {
            return { results: s.all(...args) };
          },
        };
      },
    };
  },
};
const endpoint = 'https://pricing.test/api/schemes';
const call = (
  method = 'GET',
  owner = 'alice',
  body,
  query = '',
  origin = 'https://pricing.test',
) =>
  schemeRequest(
    new Request(endpoint + query, {
      method,
      headers: { Origin: origin, 'Content-Type': 'application/json' },
      ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    }),
    owner,
    () => db,
  );
const input = {
  title: '水稻研学',
  fileName: '方案.txt',
  fileType: 'txt',
  rawText: '9:30 集合\n10:00 割水稻\n<script>alert(1)</script>',
};
try {
  for (const f of readdirSync(new URL('../drizzle/', import.meta.url))
    .filter((f) => f.endsWith('.sql'))
    .sort())
    sqlite.exec(
      readFileSync(new URL('../drizzle/' + f, import.meta.url), 'utf8'),
    );
  assert.equal((await call('POST', null, input)).status, 401);
  assert.equal((await call('GET', null)).status, 401);
  assert.equal(
    (await call('POST', 'alice', input, '', 'https://evil.test')).status,
    403,
  );
  for (const patch of [
    { rawText: '' },
    { rawText: '  ' },
    { title: '' },
    { rawText: 'a'.repeat(MAX_TEXT_LENGTH + 1) },
    { fileType: 'pdf' },
    { fileName: 'x.pdf' },
    { title: 'a'.repeat(121) },
  ])
    assert.equal(
      (await call('POST', 'alice', { ...input, ...patch })).status,
      400,
    );
  const response = await call('POST', 'alice', { ...input, ownerId: 'bob' });
  assert.equal(response.status, 201);
  const { id } = await response.json();
  const restored = await (
    await call('GET', 'alice', undefined, '?id=' + id)
  ).json();
  assert.equal(restored.rawText, input.rawText);
  assert.equal(restored.title, input.title);
  assert.equal(
    (await call('GET', 'bob', undefined, '?id=' + id + '&ownerId=alice'))
      .status,
    404,
  );
  assert.deepEqual(
    (await (await call('GET', 'bob', undefined, '?ownerId=alice')).json())
      .items,
    [],
  );
  assert.equal(
    (await call('DELETE', 'bob', undefined, '?id=' + id)).status,
    404,
  );
  assert.equal(
    (await call('DELETE', null, undefined, '?id=' + id)).status,
    401,
  );
  assert.equal(
    (await call('DELETE', 'alice', undefined, '?id=' + id, 'https://evil.test'))
      .status,
    403,
  );
  assert.equal(
    (await call('DELETE', 'alice', undefined, '?id=' + id)).status,
    200,
  );
  assert.equal(
    (await call('GET', 'alice', undefined, '?id=' + id)).status,
    404,
  );
  assert.equal(
    (await call('DELETE', 'alice', undefined, '?id=' + id)).status,
    404,
  );
  for (let i = 0; i < 21; i++)
    assert.equal((await call('POST', 'alice', input)).status, 201);
  const page = await (await call()).json();
  assert.equal(page.items.length, 20);
  assert.equal(page.hasMore, true);
  assert.equal('rawText' in page.items[0], false);
  assert.equal(
    (await (await call('GET', 'alice', undefined, '?offset=20')).json()).items
      .length,
    1,
  );
  assert.equal(
    (await call('GET', 'alice', undefined, '?offset=-1')).status,
    400,
  );
  assert.equal(
    (await call('POST', 'alice', { ...input, rawText: 'x'.repeat(650001) }))
      .status,
    413,
  );
  assert.throws(() =>
    validateSchemeFile({ name: 'x.pdf', size: 12, type: 'application/pdf' }),
  );
  assert.throws(() =>
    validateSchemeFile({
      name: 'x.txt',
      size: 6 * 1024 * 1024,
      type: 'text/plain',
    }),
  );
  assert.throws(() =>
    validateSchemeFile({ name: 'x.txt', size: 12, type: 'text/html' }),
  );
  assert.equal(
    validateSchemeFile({ name: 'x.DOCX', size: 12, type: '' }),
    'docx',
  );
  assert.equal(
    (
      await parseSchemeFile(
        new File(['活动流程'], '方案.txt', { type: 'text/plain' }),
      )
    ).rawText,
    '活动流程',
  );
  await assert.rejects(() => parseSchemeFile(new File([''], 'x.txt')));
  await assert.rejects(() =>
    parseSchemeFile(new File(['not a zip'], 'x.docx')),
  );
  await assert.rejects(() =>
    parseSchemeFile(new File([new Uint8Array([255])], 'x.txt')),
  );
  await assert.rejects(() =>
    parseSchemeFile(new File(['a'.repeat(MAX_TEXT_LENGTH + 1)], 'x.txt')),
  );
  const failure = await schemeRequest(new Request(endpoint), 'alice', () => {
    throw new Error('offline');
  });
  assert.equal(failure.status, 503);
  console.log(
    'Passed: scheme persistence, owner isolation, ignored forged owner, deletion, auth, CSRF, validation, body limit, pagination and TXT parsing.',
  );
} finally {
  sqlite.close();
}
