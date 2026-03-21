const logger = require("../utils/logger");

function httpLog(req, res, next) {
  const start = Date.now();

  res.on("finish", () => {
    const latency = Date.now() - start;

    logger.info(
      {
        event: "http_request",
        request_id: req.requestId,
        method: req.method,
        path: req.originalUrl,
        status: res.statusCode,
        latency_ms: latency,
      },
      "HTTP request completed"
    );
  });

  next();
}

module.exports = { httpLog };