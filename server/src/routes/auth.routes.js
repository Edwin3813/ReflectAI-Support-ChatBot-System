const express = require("express");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");

const { loginLimiter } = require("../middleware/rateLimit.middleware");
const { db } = require("../db/db");

const router = express.Router();

function makeId() {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

router.post("/register", async (req, res) => {
  const { email, password } = req.body || {};

  if (!email || !password) {
    return res.status(400).json({ error: "Email and password are required" });
  }

  const normalizedEmail = String(email).trim().toLowerCase();

  const existing = db
    .prepare("SELECT id FROM users WHERE email = ?")
    .get(normalizedEmail);

  if (existing) return res.status(409).json({ error: "Email already registered" });

  const passwordHash = await bcrypt.hash(password, 12);

  const newUser = {
    id: makeId(),
    email: normalizedEmail,
    password_hash: passwordHash,
    created_at: new Date().toISOString(),
  };

  db.prepare(
    "INSERT INTO users (id, email, password_hash, created_at) VALUES (?, ?, ?, ?)"
  ).run(newUser.id, newUser.email, newUser.password_hash, newUser.created_at);

  return res.status(201).json({ message: "Registered" });
});

// ✅ Apply brute-force protection here
router.post("/login", loginLimiter, async (req, res) => {
  const { email, password } = req.body || {};

  if (!email || !password) {
    return res.status(400).json({ error: "Email and password are required" });
  }

  const normalizedEmail = String(email).trim().toLowerCase();

  const user = db
    .prepare("SELECT id, email, password_hash FROM users WHERE email = ?")
    .get(normalizedEmail);

  if (!user) return res.status(401).json({ error: "Invalid credentials" });

  const ok = await bcrypt.compare(password, user.password_hash);
  if (!ok) return res.status(401).json({ error: "Invalid credentials" });

  const token = jwt.sign(
    { userId: user.id, email: user.email },
    process.env.JWT_SECRET,
    { expiresIn: "2h" }
  );

  return res.json({ token });
});

module.exports = router;