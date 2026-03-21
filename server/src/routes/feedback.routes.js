const express = require("express");
const { requireAuth } = require("../middleware/auth.middleware");
const { db } = require("../db/db");

const router = express.Router();

function makeId() {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

/**
 * POST /feedback
 * Body:
 * {
 *   rating: 1 or -1,
 *   tags: "optional short text"
 * }
 *
 * Privacy rule: DO NOT store raw chat messages here.
 */
router.post("/", requireAuth, (req, res) => {
  const { rating, tags } = req.body || {};

  if (rating !== 1 && rating !== -1) {
    return res.status(400).json({ error: "rating must be 1 or -1" });
  }

  const row = {
    id: makeId(),
    user_id: String(req.user.userId),
    rating,
    tags: tags ? String(tags).slice(0, 120) : null,
    created_at: new Date().toISOString(),
  };

  db.prepare(
    `INSERT INTO feedback (id, user_id, rating, tags, created_at)
     VALUES (@id, @user_id, @rating, @tags, @created_at)`
  ).run(row);

  return res.json({ status: "ok" });
});

module.exports = router;