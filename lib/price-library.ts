import {
  authReply,
  hashToken,
  sameOrigin,
  type GoogleUser,
} from './google-auth';
import {
  groupOptions,
  normalizeRow,
  MAX_IMPORT_BYTES,
  MAX_ROWS,
  uuidPattern,
  type PriceCatalog,
  type PriceItem,
} from './price-data';

export function isPriceAdmin(
  user: GoogleUser | null,
  allowlist: string | undefined,
) {
  return (
    !!user &&
    !!allowlist
      ?.split(',')
      .map((v) => v.trim().toLowerCase())
      .filter(Boolean)
      .includes(user.email.toLowerCase())
  );
}
async function body(request: Request) {
  const reader = request.body?.getReader();
  if (!reader) throw new Error('请求内容为空');
  let size = 0,
    text = '';
  const decoder = new TextDecoder();
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.byteLength;
    if (size > MAX_IMPORT_BYTES) {
      await reader.cancel();
      throw new Error('价格表不能超过 512 KB');
    }
    text += decoder.decode(value, { stream: true });
  }
  const parsed = JSON.parse(text + decoder.decode());
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed))
    throw new Error('请求格式无效');
  return parsed as Record<string, unknown>;
}
async function seed(db: D1Database) {
  // Migrations own schema. Never resurrect a deliberately disabled sample library.
  if (
    await db
      .prepare('SELECT id FROM price_catalogs WHERE id = ?')
      .bind('system-default-v1')
      .first()
  )
    return;
  const now = new Date().toISOString();
  const rows = [
    {
      id: 'sys-stu-ticket',
      groupType: 'student',
      name: '学生团门票',
      category: '门票',
      mode: 'child',
      amount: 30,
    },
    {
      id: 'sys-stu-insurance',
      groupType: 'student',
      name: '活动保险',
      category: '保险',
      mode: 'person',
      amount: 5,
    },
    {
      id: 'sys-stu-bus',
      groupType: 'student',
      name: '50座大巴',
      category: '交通',
      mode: 'batch',
      amount: 1200,
      capacity: 50,
    },
    {
      id: 'sys-family-ticket',
      groupType: 'family',
      name: '亲子套票',
      category: '门票',
      mode: 'family',
      amount: 68,
    },
  ];
  await db.batch([
    db
      .prepare(
        "INSERT INTO price_catalogs(id,owner_id,name,source,is_active,created_at,updated_at) VALUES(?,NULL,?,'system',1,?,?) ON CONFLICT(id) DO NOTHING",
      )
      .bind('system-default-v1', '系统示例价格库（请核实）', now, now),
    ...rows.map((r, i) =>
      db
        .prepare(
          'INSERT INTO price_items(id,catalog_id,group_type,category,name,mode,amount,capacity,note,sort_order) VALUES(?,?,?,?,?,?,?,?,?,?) ON CONFLICT(id) DO NOTHING',
        )
        .bind(
          r.id,
          'system-default-v1',
          r.groupType,
          r.category,
          r.name,
          r.mode,
          r.amount,
          r.capacity ?? 1,
          '仅供演示，非实际报价；单价按整次活动填写',
          i,
        ),
    ),
  ]);
}
type CatalogRow = {
  id: string;
  owner_id: string | null;
  name: string;
  source: 'system' | 'user';
  is_active: number;
  updated_at: string;
  version: number;
  import_hash: string;
};
function item(r: Record<string, unknown>): PriceItem {
  return {
    id: String(r.id),
    catalogId: String(r.catalog_id),
    sortOrder: Number(r.sort_order),
    ...normalizeRow({
      groupType: r.group_type,
      category: r.category,
      name: r.name,
      mode: r.mode,
      amount: r.amount,
      quantity: r.quantity,
      capacity: r.capacity,
      minPeople: r.min_people,
      maxPeople: r.max_people,
      actualOnly: !!r.actual_only,
      note: r.note,
      projectName: r.project_name,
      validFrom: r.valid_from,
      validTo: r.valid_to,
    }),
  };
}

export async function priceLibraryRequest(
  request: Request,
  user: GoogleUser | null,
  getDb: () => D1Database,
  adminEmails?: string,
) {
  const url = new URL(request.url),
    canManageSystem = isPriceAdmin(user, adminEmails);
  if (request.method === 'GET') {
    const source = url.searchParams.get('source') ?? 'system',
      manage = url.searchParams.get('manage') === '1',
      group = url.searchParams.get('group') ?? 'student';
    if (
      !['system', 'user'].includes(source) ||
      !groupOptions.some((g) => g.value === group)
    )
      return authReply({ error: '价格来源或团体类型无效' }, 400);
    if (manage && (!user || (source === 'system' && !canManageSystem)))
      return authReply({ error: '没有管理此价格库的权限' }, user ? 403 : 401);
    if (source === 'user' && !user)
      return authReply({
        catalogs: [],
        needsLogin: true,
        canManageSystem: false,
      });
    try {
      const db = getDb();
      await seed(db);
      const { results } = await db
        .prepare(
          `SELECT * FROM price_catalogs WHERE source = ? ${source === 'user' ? 'AND owner_id = ?' : ''} ${manage ? '' : 'AND is_active = 1'} ORDER BY updated_at DESC,id DESC LIMIT 100`,
        )
        .bind(source, ...(source === 'user' ? [user!.userId] : []))
        .all<CatalogRow>();
      const selected = url.searchParams.get('catalog') ?? results[0]?.id;
      const catalogs: PriceCatalog[] = results.map((c) => ({
        id: c.id,
        name: c.name,
        source: c.source,
        isActive: !!c.is_active,
        updatedAt: c.updated_at,
        version: c.version,
        items: [],
      }));
      const catalog = catalogs.find((c) => c.id === selected);
      if (catalog) {
        const rows = await db
          .prepare(
            `SELECT * FROM price_items WHERE catalog_id = ? ${manage ? '' : 'AND group_type = ?'} ORDER BY sort_order,id LIMIT 301`,
          )
          .bind(catalog.id, ...(manage ? [] : [group]))
          .all<Record<string, unknown>>();
        catalog.items = rows.results.map(item);
      }
      return authReply({
        catalogs,
        selectedId: catalog?.id ?? null,
        needsLogin: false,
        canManageSystem,
      });
    } catch {
      return authReply({ error: '价格库暂不可用，请稍后重试' }, 503);
    }
  }
  if (!['POST', 'PATCH'].includes(request.method))
    return authReply({ error: '不支持的操作' }, 405);
  if (!sameOrigin(request))
    return authReply({ error: '请求来源无效，请刷新后重试' }, 403);
  if (!user) return authReply({ error: '请先登录后管理价格库' }, 401);
  if (!request.headers.get('content-type')?.startsWith('application/json'))
    return authReply({ error: '请求格式无效' }, 415);
  let data: Record<string, unknown>;
  try {
    data = await body(request);
  } catch (e) {
    return authReply(
      { error: e instanceof Error ? e.message : '请求内容无效' },
      400,
    );
  }
  if (request.method === 'PATCH') {
    if (
      typeof data.id !== 'string' ||
      typeof data.isActive !== 'boolean' ||
      !Number.isSafeInteger(data.version)
    )
      return authReply({ error: '价格库状态格式无效' }, 400);
    try {
      const db = getDb(),
        catalog = await db
          .prepare('SELECT * FROM price_catalogs WHERE id = ?')
          .bind(data.id)
          .first<CatalogRow>();
      if (
        !catalog ||
        (catalog.source === 'user'
          ? catalog.owner_id !== user.userId
          : !canManageSystem)
      )
        return authReply({ error: '找不到可管理的价格库' }, 404);
      const updated = await db
        .prepare(
          'UPDATE price_catalogs SET is_active = ?,version = version + 1,updated_at = ? WHERE id = ? AND version = ? RETURNING id',
        )
        .bind(
          data.isActive ? 1 : 0,
          new Date().toISOString(),
          catalog.id,
          data.version,
        )
        .first();
      return updated
        ? authReply({ ok: true })
        : authReply({ error: '价格库已被修改，请刷新后重试' }, 409);
    } catch {
      return authReply({ error: '保存失败，请稍后重试' }, 503);
    }
  }
  const source = data.source ?? 'user';
  if (source !== 'system' && source !== 'user')
    return authReply({ error: '价格来源无效' }, 400);
  if (source === 'system' && !canManageSystem)
    return authReply({ error: '只有管理员可以导入系统价格' }, 403);
  let rows;
  const name = typeof data.name === 'string' ? data.name.trim() : '';
  try {
    if (typeof data.id !== 'string' || !uuidPattern.test(data.id))
      throw new Error('导入编号无效');
    if (!name || name.length > 80) throw new Error('价格库名称须为 1–80 字');
    if (
      !Array.isArray(data.rows) ||
      data.rows.length < 1 ||
      data.rows.length > MAX_ROWS
    )
      throw new Error('一次请导入 1–300 条价格');
    rows = data.rows.map((r, i) => {
      try {
        return normalizeRow(r);
      } catch (e) {
        throw new Error(
          `第 ${i + 1} 条：${e instanceof Error ? e.message : '格式无效'}`,
        );
      }
    });
    if (new Set(rows.map((r) => JSON.stringify(r))).size !== rows.length)
      throw new Error('价格表包含完全重复的行');
    if (
      data.replacesId !== undefined &&
      (typeof data.replacesId !== 'string' ||
        !data.replacesId ||
        !Number.isSafeInteger(data.version))
    )
      throw new Error('原价格库版本无效');
  } catch (e) {
    return authReply(
      { error: e instanceof Error ? e.message : '价格数据无效' },
      400,
    );
  }
  try {
    const db = getDb(),
      id = data.id as string,
      now = new Date().toISOString();
    const fingerprint = await hashToken(
      JSON.stringify({
        owner: user.userId,
        source,
        name,
        rows,
        replacesId: data.replacesId ?? null,
        version: data.version ?? null,
      }),
    );
    const previous = await db
      .prepare('SELECT * FROM price_catalogs WHERE id = ?')
      .bind(id)
      .first<CatalogRow>();
    if (previous)
      return previous.import_hash === fingerprint
        ? authReply({ ok: true, id, count: rows.length }, 201)
        : authReply({ error: '导入编号冲突，请重新预览' }, 409);
    let parent: CatalogRow | null = null;
    if (data.replacesId) {
      parent = await db
        .prepare('SELECT * FROM price_catalogs WHERE id = ?')
        .bind(data.replacesId)
        .first<CatalogRow>();
      if (
        !parent ||
        parent.source !== source ||
        (source === 'user' && parent.owner_id !== user.userId)
      )
        return authReply({ error: '找不到可更新的价格库' }, 404);
      if (parent.version !== data.version)
        return authReply({ error: '价格库已变更，请刷新后重新编辑' }, 409);
    }
    const owner = source === 'user' ? user.userId : null;
    const statements = [
      db
        .prepare(
          `INSERT INTO price_catalogs(id,owner_id,name,source,is_active,created_at,updated_at,version,import_hash) SELECT ?,?,?,?,1,?,?,?,? ${parent ? 'WHERE EXISTS(SELECT 1 FROM price_catalogs WHERE id = ? AND version = ?)' : ''} ON CONFLICT(id) DO NOTHING`,
        )
        .bind(
          id,
          owner,
          name,
          source,
          now,
          now,
          parent ? parent.version + 1 : 1,
          fingerprint,
          ...(parent ? [parent.id, parent.version] : []),
        ),
    ];
    // One bounded JSON parameter keeps 300-row imports below D1 query/bind limits.
    statements.push(
      db
        .prepare(`INSERT INTO price_items(id,catalog_id,group_type,category,name,mode,amount,quantity,capacity,min_people,max_people,actual_only,note,sort_order,project_name,valid_from,valid_to)
      SELECT ? || ':' || key, ?, json_extract(value,'$.groupType'), json_extract(value,'$.category'), json_extract(value,'$.name'), json_extract(value,'$.mode'), json_extract(value,'$.amount'), json_extract(value,'$.quantity'), json_extract(value,'$.capacity'), json_extract(value,'$.minPeople'), json_extract(value,'$.maxPeople'), json_extract(value,'$.actualOnly'), json_extract(value,'$.note'), key, json_extract(value,'$.projectName'), json_extract(value,'$.validFrom'), json_extract(value,'$.validTo')
      FROM json_each(?) WHERE EXISTS(SELECT 1 FROM price_catalogs WHERE id = ? AND import_hash = ?) ON CONFLICT(id) DO NOTHING`)
        .bind(id, id, JSON.stringify(rows), id, fingerprint),
    );
    if (parent)
      statements.push(
        db
          .prepare(
            'UPDATE price_catalogs SET is_active = 0,version = version + 1,updated_at = ? WHERE id = ? AND version = ? AND EXISTS(SELECT 1 FROM price_catalogs WHERE id = ? AND import_hash = ?)',
          )
          .bind(now, parent.id, parent.version, id, fingerprint),
      );
    await db.batch(statements);
    const saved = await db
      .prepare('SELECT import_hash FROM price_catalogs WHERE id = ?')
      .bind(id)
      .first<{ import_hash: string }>();
    if (saved?.import_hash !== fingerprint)
      return authReply({ error: '价格库已变更，请刷新后重试' }, 409);
    return authReply({ ok: true, id, count: rows.length }, 201);
  } catch {
    return authReply(
      { error: '导入暂未完成，请重试；相同请求不会重复写入' },
      503,
    );
  }
}
