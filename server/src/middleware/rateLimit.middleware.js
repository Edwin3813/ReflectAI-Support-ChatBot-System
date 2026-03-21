// server/src/middleware/rateLimit.middleware.js
const rateLimit = require("express-rate-limit");
const { ipKeyGenerator } = require("express-rate-limit");

// Helper: user id from JWT (set by requireAuth middleware)
function getUserId(req) {
  return req.user?.userId ? String(req.user.userId) : null;
}

// General API limiter (per-IP)
const apiLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 min
  max: 120, // 120 req/min per IP
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => ipKeyGenerator(req), // ✅ IPv6-safe
  message: { error: "Too many requests. Please try again shortly." },
});

// Login limiter (anti-bruteforce, per-IP)
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 min
  max: 10, // 10 attempts / 15 min per IP
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => ipKeyGenerator(req), // ✅ IPv6-safe
  message: { error: "Too many login attempts. Try again later." },
});

// Chat limiter per IP (fallback)
const chatIpLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 min
  max: 30, // 30 chat req/min per IP
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => ipKeyGenerator(req), // ✅ IPv6-safe
  message: { error: "Too many chat requests. Please slow down." },
});

// Chat limiter per user (preferred). Falls back to IP safely.
const chatUserLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 min
  max: 20, // 20 chat req/min per user
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => {
    const uid = getUserId(req);
    return uid ? `user:${uid}` : `ip:${ipKeyGenerator(req)}`; // ✅ IPv6-safe fallback
  },
  message: { error: "Too many chat requests. Please slow down." },
});

module.exports = {
  apiLimiter,
  loginLimiter,
  chatIpLimiter,
  chatUserLimiter,
};