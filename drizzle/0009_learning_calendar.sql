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