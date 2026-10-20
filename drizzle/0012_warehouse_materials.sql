-- 0012_warehouse_materials.sql
-- 研学仓库现有物资明细表（含物资名称、所在区块、库存量、分类、规格等）

CREATE TABLE IF NOT EXISTS learning_warehouse_materials (
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
);

CREATE INDEX IF NOT EXISTS idx_learning_warehouse_materials_name ON learning_warehouse_materials(name);
CREATE INDEX IF NOT EXISTS idx_learning_warehouse_materials_zone ON learning_warehouse_materials(zone);
CREATE INDEX IF NOT EXISTS idx_learning_warehouse_materials_category ON learning_warehouse_materials(category);
