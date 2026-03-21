// server/scripts/migrate.js
const fs = require("fs");
const path = require("path");
const { db, DB_PATH } = require("../src/db/db");

function runSqlFile(filePath) {
  const sql = fs.readFileSync(filePath, "utf-8");
  db.exec(sql);
}

function main() {
  const migrationsDir = path.join(__dirname, "..", "src", "db", "migrations");
  const files = fs
    .readdirSync(migrationsDir)
    .filter((f) => f.endsWith(".sql"))
    .sort();

  if (files.length === 0) {
    console.log("❌ No migration .sql files found in", migrationsDir);
    process.exit(1);
  }

  for (const f of files) {
    const full = path.join(migrationsDir, f);
    console.log("▶ Running migration:", f);
    runSqlFile(full);
  }

  console.log("✅ Migrations complete");
  console.log("📦 DB file:", DB_PATH);
}

main();