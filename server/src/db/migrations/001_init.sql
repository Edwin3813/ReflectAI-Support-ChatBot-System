-- 001_init.sql

CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS feedback (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  rating INTEGER NOT NULL,           -- e.g. +1 / -1
  tags TEXT,                         -- optional short labels
  created_at TEXT NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS metrics_events (
  id TEXT PRIMARY KEY,
  request_id TEXT NOT NULL,
  user_id TEXT,
  blocked INTEGER NOT NULL,          -- 0/1
  used_llm INTEGER NOT NULL,         -- 0/1
  fallback INTEGER NOT NULL,         -- 0/1
  reason TEXT,
  latency_ms INTEGER,
  created_at TEXT NOT NULL
);