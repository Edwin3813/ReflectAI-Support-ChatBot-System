// server/src/db/db.js
const path = require("path");
const fs = require("fs");
const Database = require("better-sqlite3");

const DB_DIR = path.join(__dirname, "..", "storage", "db");
const DB_PATH = path.join(DB_DIR, "reflectai.sqlite");

if (!fs.existsSync(DB_DIR)) {
  fs.mkdirSync(DB_DIR, { recursive: true });
}

// Create/open DB file
const db = new Database(DB_PATH);

// Recommended pragmas for reliability (safe defaults)
db.pragma("journal_mode = WAL");
db.pragma("foreign_keys = ON");

module.exports = { db, DB_PATH };