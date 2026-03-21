const { db } = require("../src/db/db");
const row = db.prepare("SELECT COUNT(*) as c FROM feedback").get();
console.log("feedback count:", row.c);