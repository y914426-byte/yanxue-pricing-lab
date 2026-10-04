CREATE TABLE IF NOT EXISTS learning_calendar_events (
  id TEXT PRIMARY KEY NOT NULL,
  event_date TEXT NOT NULL,
  name TEXT NOT NULL,
  audience TEXT NOT NULL DEFAULT '',
  people INTEGER NOT NULL DEFAULT 0,
  place TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'pending',
  flow TEXT NOT NULL DEFAULT '',
  materials_json TEXT NOT NULL DEFAULT '[]',
  note TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_learning_calendar_events_date ON learning_calendar_events(event_date);
CREATE INDEX IF NOT EXISTS idx_learning_calendar_events_status_date ON learning_calendar_events(status,event_date);

INSERT OR IGNORE INTO learning_calendar_events (id,event_date,name,audience,people,place,status,flow,materials_json,note,created_at,updated_at) VALUES
('calendar-demo-20261008','2026-10-08','水稻收割体验','小学生',120,'水稻田','confirmed','09:30 签到\n10:00 水稻知识课程\n10:30 水稻收割\n11:30 烧菜饭\n13:30 稻草手工\n14:30 动物农场','[{"name":"儿童手套","qty":"130副","note":"备用10副","done":false},{"name":"镰刀","qty":"30把","note":"提前检查","done":false},{"name":"稻草手工材料包","qty":"130份","note":"提前分装","done":false}]','示例活动，可直接编辑。','2026-10-04T00:00:00.000Z','2026-10-04T00:00:00.000Z'),
('calendar-demo-20261010','2026-10-10','农耕秋收研学','幼儿园',80,'农耕园','pending','09:30 入园\n10:00 秋收小游戏\n11:00 喂动物\n11:30 午餐','[{"name":"小篮子","qty":"40个","note":"亲子共用","done":false},{"name":"儿童手套","qty":"90副","note":"备用10副","done":false},{"name":"动物饲料","qty":"80份","note":"分装","done":false}]','','2026-10-04T00:00:00.000Z','2026-10-04T00:00:00.000Z'),
('calendar-demo-20261015','2026-10-15','大地密码','初中生',150,'农耕园','confirmed','08:30 签到\n09:00 大地密码课程\n10:30 分组任务\n12:00 午餐','[{"name":"任务卡","qty":"160份","note":"备用10份","done":false},{"name":"扩音器","qty":"3台","note":"活动现场","done":false}]','','2026-10-04T00:00:00.000Z','2026-10-04T00:00:00.000Z');