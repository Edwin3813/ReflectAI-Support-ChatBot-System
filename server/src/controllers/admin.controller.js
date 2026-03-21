const { db } = require("../db/db");
const { getMetrics } = require("../services/metrics.service");

function getAdminMetrics(req, res) {
  return res.json({
    status: "ok",
    time: new Date().toISOString(),
    metrics: getMetrics(),
  });
}

function getFeedbackList(req, res) {
  const rows = db
    .prepare(
      `
      SELECT id, user_id, rating, tags, created_at
      FROM feedback
      ORDER BY datetime(created_at) DESC
      `
    )
    .all();

  return res.json({
    status: "ok",
    count: rows.length,
    feedback: rows,
  });
}

module.exports = {
  getAdminMetrics,
  getFeedbackList,
};