-- 0010_admin_permissions.sql
-- 研学后台团队权限管理表与名册表

CREATE TABLE IF NOT EXISTS calendar_authorized_users (
  email TEXT PRIMARY KEY NOT NULL,
  role TEXT NOT NULL DEFAULT 'editor',
  display_name TEXT NOT NULL DEFAULT '',
  department TEXT NOT NULL DEFAULT '研学项目组',
  added_by TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS team_registered_users (
  email TEXT PRIMARY KEY NOT NULL,
  qq_number TEXT,
  display_name TEXT NOT NULL DEFAULT '',
  role TEXT NOT NULL DEFAULT 'editor',
  department TEXT NOT NULL DEFAULT '带队导师',
  avatar_url TEXT,
  created_at TEXT NOT NULL,
  last_login_at TEXT NOT NULL
);
