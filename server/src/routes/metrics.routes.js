const express = require("express");
const { getMetrics } = require("../services/metrics.service");

const router = express.Router();

router.get("/", (req, res) => {
  res.json({
    status: "ok",
    time: new Date().toISOString(),
    metrics: getMetrics(),
  });
});

module.exports = router;