// server/src/services/dbMetrics.service.js
const { db } = require("../db/db");

function makeId() {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

/**
 * Stores one chat "event" in SQLite.
 * meta shape (from /chat):
 * {
 *   request_id, blocked, used_llm, fallback, reason, latency_ms
 * }
 */
function insertChatMetricsEvent({ userId, meta }) {
  if (!meta || !meta.request_id) return;

  const row = {
    id: makeId(),
    request_id: String(meta.request_id),
    user_id: userId ? String(userId) : null,
    blocked: meta.blocked ? 1 : 0,
    used_llm: meta.used_llm ? 1 : 0,
    fallback: meta.fallback ? 1 : 0,
    reason: meta.reason ? String(meta.reason) : null,
    latency_ms:
      typeof meta.latency_ms === "number" ? Math.round(meta.latency_ms) : null,
    created_at: new Date().toISOString(),
  };

  db.prepare(
    `INSERT INTO metrics_events
      (id, request_id, user_id, blocked, used_llm, fallback, reason, latency_ms, created_at)
     VALUES
      (@id, @request_id, @user_id, @blocked, @used_llm, @fallback, @reason, @latency_ms, @created_at)`
  ).run(row);
}

module.exports = { insertChatMetricsEvent };