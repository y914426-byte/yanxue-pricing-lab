import { getDb } from '@/db';
import { authReply, getGoogleUser, sameOrigin } from '@/lib/google-auth';
import { checkCalendarUserRole } from '@/lib/calendar-auth';

export const dynamic = 'force-dynamic';

export type WarehouseMaterialRow = {
  id: string;
  name: string;
  zone: string;
  category: string;
  quantity: number;
  unit: string;
  safe_quantity: number;
  specification: string;
  unit_price: number;
  supplier: string;
  status: string;
  note: string;
  updated_by_email: string;
  created_at: string;
  updated_at: string;
};

let schemaReady: Promise<void> | undefined;

export async function ensureWarehouseMaterialsSchema(db: ReturnType<typeof getDb>) {
  if (!schemaReady) {
    schemaReady = (async () => {
      await db.prepare(`CREATE TABLE IF NOT EXISTS learning_warehouse_materials (
        id TEXT PRIMARY KEY NOT NULL,
        name TEXT NOT NULL,
        zone TEXT NOT NULL DEFAULT '',
        category TEXT NOT NULL DEFAULT '常规物资',
        quantity REAL NOT NULL DEFAULT 0,
        unit TEXT NOT NULL DEFAULT '件',
        safe_quantity REAL NOT NULL DEFAULT 0,
        specification TEXT NOT NULL DEFAULT '',
        unit_price REAL NOT NULL DEFAULT 0,
        supplier TEXT NOT NULL DEFAULT '',
        status TEXT NOT NULL DEFAULT 'normal',
        note TEXT NOT NULL DEFAULT '',
        updated_by_email TEXT NOT NULL DEFAULT '',
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      )`).run();

      await db.prepare('CREATE INDEX IF NOT EXISTS idx_learning_warehouse_materials_name ON learning_warehouse_materials(name)').run();
      await db.prepare('CREATE INDEX IF NOT EXISTS idx_learning_warehouse_materials_zone ON learning_warehouse_materials(zone)').run();
      await db.prepare('CREATE INDEX IF NOT EXISTS idx_learning_warehouse_materials_category ON learning_warehouse_materials(category)').run();
    })();
  }
  try {
    await schemaReady;
  } catch (error) {
    schemaReady = undefined;
    throw error;
  }
}

function mapRow(row: WarehouseMaterialRow) {
  return {
    id: row.id,
    name: row.name,
    zone: row.zone || '',
    category: row.category || '常规物资',
    quantity: Number(row.quantity ?? 0),
    unit: row.unit || '件',
    safeQuantity: Number(row.safe_quantity ?? 0),
    specification: row.specification || '',
    unitPrice: Number(row.unit_price ?? 0),
    supplier: row.supplier || '',
    status: row.status || 'normal',
    note: row.note || '',
    updatedByEmail: row.updated_by_email || '',
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

async function handle(request: Request) {
  try {
    const db = getDb();
    await ensureWarehouseMaterialsSchema(db);

    const method = request.method.toUpperCase();
    const user = await getGoogleUser(request, getDb);
    const roleInfo = await checkCalendarUserRole(db, user?.email);

    // GET: 获取仓库物资明细、区块列表、统计指标
    if (method === 'GET') {
      const rows = await db
        .prepare('SELECT * FROM learning_warehouse_materials ORDER BY zone ASC, category ASC, name ASC')
        .all<WarehouseMaterialRow>();

      const items = (rows.results ?? []).map(mapRow);

      // 提取所有已存在的去重区块与分类
      const zoneSet = new Set<string>();
      const categorySet = new Set<string>();
      let totalQty = 0;
      let lowStockCount = 0;

      for (const item of items) {
        if (item.zone.trim()) zoneSet.add(item.zone.trim());
        if (item.category.trim()) categorySet.add(item.category.trim());
        totalQty += item.quantity;
        if (item.quantity <= (item.safeQuantity || 0) && (item.safeQuantity > 0 || item.quantity === 0)) {
          lowStockCount++;
        }
      }

      return authReply({
        items,
        zones: Array.from(zoneSet).sort(),
        categories: Array.from(categorySet).sort(),
        stats: {
          totalCount: items.length,
          totalQuantity: Math.round(totalQty * 100) / 100,
          zoneCount: zoneSet.size,
          lowStockCount,
        },
        canEdit: roleInfo.canEdit,
        isAdmin: roleInfo.isAdmin,
        userRole: roleInfo.role,
        user: user ? { displayName: user.displayName, email: user.email } : null,
      });
    }

    // 写操作检查来源与权限
    if (!sameOrigin(request)) {
      return authReply({ error: '请求来源无效' }, 403);
    }

    if (!user || !roleInfo.canEdit) {
      return authReply(
        { error: '当前账号没有研学仓库物资的编辑权限。请联系管理员分配权限，或切换至管理员邮箱登录。' },
        403
      );
    }

    if (!request.headers.get('content-type')?.startsWith('application/json')) {
      return authReply({ error: '请求格式无效' }, 415);
    }

    const body = (await request.json()) as Record<string, any>;
    const now = new Date().toISOString();

    // POST: 新增物资 或 批量导入预设
    if (method === 'POST') {
      // 批量初始化导入
      if (Array.isArray(body.batch) && body.batch.length > 0) {
        const statements = body.batch.map((raw: any) => {
          const id = crypto.randomUUID();
          const name = String(raw.name ?? '').trim();
          const zone = String(raw.zone ?? '').trim();
          const category = String(raw.category ?? '常规物资').trim();
          const quantity = Number(raw.quantity ?? 0) || 0;
          const unit = String(raw.unit ?? '件').trim() || '件';
          const safeQuantity = Number(raw.safeQuantity ?? 0) || 0;
          const specification = String(raw.specification ?? '').trim();
          const unitPrice = Number(raw.unitPrice ?? 0) || 0;
          const supplier = String(raw.supplier ?? '').trim();
          const status = String(raw.status ?? 'normal').trim();
          const note = String(raw.note ?? '').trim();

          return db
            .prepare(
              `INSERT INTO learning_warehouse_materials 
              (id, name, zone, category, quantity, unit, safe_quantity, specification, unit_price, supplier, status, note, updated_by_email, created_at, updated_at) 
              VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
            )
            .bind(
              id,
              name,
              zone,
              category,
              quantity,
              unit,
              safeQuantity,
              specification,
              unitPrice,
              supplier,
              status,
              note,
              user.email,
              now,
              now
            );
        });

        await db.batch(statements);
        return authReply({ ok: true, count: body.batch.length });
      }

      // 单条新增
      const id = typeof body.id === 'string' && body.id ? body.id : crypto.randomUUID();
      const name = String(body.name ?? '').trim();
      const zone = String(body.zone ?? '').trim(); // 物资所在区块（核心输入）
      if (!name) {
        return authReply({ error: '物资名称不能为空' }, 400);
      }

      const category = String(body.category ?? '常规物资').trim() || '常规物资';
      const quantity = Number(body.quantity ?? 0) || 0;
      const unit = String(body.unit ?? '件').trim() || '件';
      const safeQuantity = Number(body.safeQuantity ?? 0) || 0;
      const specification = String(body.specification ?? '').trim();
      const unitPrice = Number(body.unitPrice ?? 0) || 0;
      const supplier = String(body.supplier ?? '').trim();
      const status = String(body.status ?? 'normal').trim() || 'normal';
      const note = String(body.note ?? '').trim();

      await db
        .prepare(
          `INSERT INTO learning_warehouse_materials 
          (id, name, zone, category, quantity, unit, safe_quantity, specification, unit_price, supplier, status, note, updated_by_email, created_at, updated_at) 
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
        )
        .bind(
          id,
          name,
          zone,
          category,
          quantity,
          unit,
          safeQuantity,
          specification,
          unitPrice,
          supplier,
          status,
          note,
          user.email,
          now,
          now
        )
        .run();

      return authReply({ ok: true, id });
    }

    // PUT: 修改物资（支持完整修改 或 单独修改所在区块/库存等）
    if (method === 'PUT') {
      const id = String(body.id ?? '').trim();
      if (!id) return authReply({ error: '缺少物资ID' }, 400);

      // 查询原有记录
      const existing = await db
        .prepare('SELECT * FROM learning_warehouse_materials WHERE id = ?')
        .bind(id)
        .first<WarehouseMaterialRow>();

      if (!existing) {
        return authReply({ error: '未找到该物资记录' }, 404);
      }

      const name = body.name !== undefined ? String(body.name).trim() : existing.name;
      const zone = body.zone !== undefined ? String(body.zone).trim() : existing.zone;
      const category = body.category !== undefined ? String(body.category).trim() : existing.category;
      const quantity = body.quantity !== undefined ? (Number(body.quantity) || 0) : existing.quantity;
      const unit = body.unit !== undefined ? String(body.unit).trim() : existing.unit;
      const safeQuantity = body.safeQuantity !== undefined ? (Number(body.safeQuantity) || 0) : existing.safe_quantity;
      const specification = body.specification !== undefined ? String(body.specification).trim() : existing.specification;
      const unitPrice = body.unitPrice !== undefined ? (Number(body.unitPrice) || 0) : existing.unit_price;
      const supplier = body.supplier !== undefined ? String(body.supplier).trim() : existing.supplier;
      const status = body.status !== undefined ? String(body.status).trim() : existing.status;
      const note = body.note !== undefined ? String(body.note).trim() : existing.note;

      if (!name) return authReply({ error: '物资名称不能为空' }, 400);

      await db
        .prepare(
          `UPDATE learning_warehouse_materials SET 
            name = ?, 
            zone = ?, 
            category = ?, 
            quantity = ?, 
            unit = ?, 
            safe_quantity = ?, 
            specification = ?, 
            unit_price = ?, 
            supplier = ?, 
            status = ?, 
            note = ?, 
            updated_by_email = ?, 
            updated_at = ? 
          WHERE id = ?`
        )
        .bind(
          name,
          zone,
          category,
          quantity,
          unit,
          safeQuantity,
          specification,
          unitPrice,
          supplier,
          status,
          note,
          user.email,
          now,
          id
        )
        .run();

      return authReply({ ok: true, id });
    }

    // DELETE: 删除物资
    if (method === 'DELETE') {
      const id = String(body.id ?? '').trim();
      if (!id) return authReply({ error: '缺少物资ID' }, 400);

      await db
        .prepare('DELETE FROM learning_warehouse_materials WHERE id = ?')
        .bind(id)
        .run();

      return authReply({ ok: true });
    }

    return authReply({ error: '不支持的请求方法' }, 405);
  } catch (error) {
    return authReply(
      { error: error instanceof Error ? error.message : '研学仓库物资服务暂不可用' },
      503
    );
  }
}

export { handle as GET, handle as POST, handle as PUT, handle as DELETE };
