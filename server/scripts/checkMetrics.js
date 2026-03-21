// server/scripts/checkMetrics.js
const { db, DB_PATH } = require("../src/db/db");

const row = db.prepare("SELECT COUNT(*) as c FROM metrics_events").get();

console.log("DB:", DB_PATH);
console.log("metrics_events count:", row.c);