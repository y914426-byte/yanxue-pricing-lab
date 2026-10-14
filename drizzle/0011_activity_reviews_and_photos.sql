-- 0011_activity_reviews_and_photos.sql
-- 活动执行复盘表、团队优化讨论评论表与活动现场照片表

CREATE TABLE IF NOT EXISTS learning_calendar_reviews (
  id TEXT PRIMARY KEY NOT NULL,
  event_id TEXT NOT NULL UNIQUE,
  event_title TEXT NOT NULL,
  event_date TEXT NOT NULL,
  actual_participants INTEGER,
  overall_rating INTEGER DEFAULT 5,
  highlights TEXT NOT NULL DEFAULT '',
  issues TEXT NOT NULL DEFAULT '',
  optimizations TEXT NOT NULL DEFAULT '',
  action_status TEXT NOT NULL DEFAULT 'open',
  updated_by_email TEXT NOT NULL,
  updated_by_name TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_learning_calendar_reviews_date ON learning_calendar_reviews(event_date DESC);
CREATE INDEX IF NOT EXISTS idx_learning_calendar_reviews_status ON learning_calendar_reviews(action_status);

CREATE TABLE IF NOT EXISTS learning_calendar_review_comments (
  id TEXT PRIMARY KEY NOT NULL,
  event_id TEXT NOT NULL,
  review_id TEXT NOT NULL,
  author_email TEXT NOT NULL,
  author_name TEXT NOT NULL,
  author_role TEXT NOT NULL DEFAULT 'member',
  content TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'optimization',
  created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_learning_calendar_review_comments_event ON learning_calendar_review_comments(event_id);
CREATE INDEX IF NOT EXISTS idx_learning_calendar_review_comments_review ON learning_calendar_review_comments(review_id);

CREATE TABLE IF NOT EXISTS learning_calendar_photos (
  id TEXT PRIMARY KEY NOT NULL,
  event_id TEXT NOT NULL,
  event_date TEXT NOT NULL,
  image_url TEXT NOT NULL,
  caption TEXT NOT NULL DEFAULT '',
  uploaded_by_email TEXT NOT NULL,
  created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_learning_calendar_photos_event ON learning_calendar_photos(event_id);
CREATE INDEX IF NOT EXISTS idx_learning_calendar_photos_date ON learning_calendar_photos(event_date DESC);
