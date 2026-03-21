const express = require("express");
const { requireAuth } = require("../middleware/auth.middleware");
const {
  getAdminMetrics,
  getFeedbackList,
} = require("../controllers/admin.controller");

const router = express.Router();

router.get("/metrics", requireAuth, getAdminMetrics);
router.get("/feedback", requireAuth, getFeedbackList);

module.exports = router;