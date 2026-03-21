const crypto = require("crypto");

function requestId(req, res, next) {
     // Use incoming request id if provided (useful behind proxies)

  const incoming = req.headers["x-request-id"];

  const id =
    typeof incoming === "string" && incoming.trim()
      ? incoming.trim()
      : crypto.randomUUID();

  req.requestId = id;
  // Return it to the client for debugging

  res.setHeader("X-Request-Id", id);

  next();
}

module.exports = { requestId };