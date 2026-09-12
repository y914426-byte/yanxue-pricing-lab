import { parseSchemeInput } from './scheme-input';
const reply = (data: unknown, status = 200) =>
  Response.json(data, {
    status,
    headers: { 'Cache-Control': 'private, no-store', Vary: 'Cookie' },
  });
const columns =
  'id, title, file_name AS fileName, file_type AS fileType, created_at AS createdAt, updated_at AS updatedAt';
export async function schemeRequest(
  request: Request,
  owner: string | null,
  db: () => D1Database,
) {
  if (!owner)
    return reply(
      { error: '请先使用 Google 登录，再保存或查看自己的方案' },
      401,
    );
  const url = new URL(request.url);
  if (
    ['POST', 'DELETE'].includes(request.method) &&
    request.headers.get('Origin') !== url.origin
  )
    return reply({ error: '请求来源无效，请刷新页面后重试' }, 403);
  if (request.method === 'POST') {
    if (!request.headers.get('content-type')?.startsWith('application/json'))
      return reply({ error: '请使用 JSON 格式提交方案' }, 415);
    let value;
    try {
      const reader = request.body?.getReader();
      let raw = '',
        size = 0;
      const decoder = new TextDecoder();
      if (reader)
        while (true) {
          const chunk = await reader.read();
          if (chunk.done) break;
          size += chunk.value.byteLength;
          if (size > 650000) {
            await reader.cancel();
            return reply({ error: '方案请求过大，请精简正文' }, 413);
          }
          raw += decoder.decode(chunk.value, { stream: true });
        }
      raw += decoder.decode();
      value = parseSchemeInput(JSON.parse(raw));
    } catch (e) {
      return reply(
        { error: e instanceof Error ? e.message : '方案格式无效' },
        400,
      );
    }
    try {
      const id = crypto.randomUUID(),
        now = new Date().toISOString();
      await db()
        .prepare(
          'INSERT INTO scheme_documents (id, owner_id, title, file_name, file_type, raw_text, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
        )
        .bind(
          id,
          owner,
          value.title,
          value.fileName,
          value.fileType,
          value.rawText,
          now,
          now,
        )
        .run();
      return reply({ id, createdAt: now }, 201);
    } catch {
      return reply(
        { error: '保存失败，请稍后重试。解析文本仍保留在当前页面。' },
        503,
      );
    }
  }
  const id = url.searchParams.get('id');
  if (id !== null && (!id || id.length > 100))
    return reply({ error: '方案编号无效' }, 400);
  try {
    if (request.method === 'DELETE') {
      if (!id) return reply({ error: '请提供方案编号' }, 400);
      const row = await db()
        .prepare(
          'DELETE FROM scheme_documents WHERE id = ? AND owner_id = ? RETURNING id',
        )
        .bind(id, owner)
        .first();
      return row
        ? reply({ deleted: true })
        : reply({ error: '方案不存在或无权访问' }, 404);
    }
    if (request.method !== 'GET') return reply({ error: '不支持的操作' }, 405);
    if (id) {
      const row = await db()
        .prepare(
          `SELECT ${columns}, raw_text AS rawText FROM scheme_documents WHERE id = ? AND owner_id = ?`,
        )
        .bind(id, owner)
        .first();
      return row ? reply(row) : reply({ error: '方案不存在或无权访问' }, 404);
    }
    const offset = Number(url.searchParams.get('offset') ?? 0);
    if (!Number.isSafeInteger(offset) || offset < 0)
      return reply({ error: '页码无效' }, 400);
    const { results } = await db()
      .prepare(
        `SELECT ${columns} FROM scheme_documents WHERE owner_id = ? ORDER BY created_at DESC, id DESC LIMIT 21 OFFSET ?`,
      )
      .bind(owner, offset)
      .all();
    return reply({ items: results.slice(0, 20), hasMore: results.length > 20 });
  } catch {
    return reply({ error: '方案服务暂不可用，请稍后重试' }, 503);
  }
}
