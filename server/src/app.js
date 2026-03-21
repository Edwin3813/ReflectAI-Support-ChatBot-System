require("dotenv").config();

const express = require("express");
const cors = require("cors");
const helmet = require("helmet");

const { requestId } = require("./middleware/requestId.middleware");
const { httpLog } = require("./middleware/httpLog.middleware");
const { apiLimiter } = require("./middleware/rateLimit.middleware");
const { requireAuth } = require("./middleware/auth.middleware");

const metricsRoutes = require("./routes/metrics.routes");
const authRoutes = require("./routes/auth.routes");
const chatRoutes = require("./routes/chat.routes");
const feedbackRoutes = require("./routes/feedback.routes");
const adminRoutes = require("./routes/admin.routes");

const logger = require("./utils/logger");

const app = express();

// Security middleware
app.use(helmet());
app.use(cors());

// Parse JSON body
app.use(express.json());
app.use(requestId);
app.use(httpLog);

// Rate limit before routes
app.use(apiLimiter);

// Routes
app.use("/metrics", metricsRoutes);
app.use("/auth", authRoutes);
app.use("/chat", chatRoutes);
app.use("/feedback", feedbackRoutes);
app.use("/admin", adminRoutes);

// Protected route
app.get("/me", requireAuth, (req, res) => {
  res.json({ user: req.user });
});

/// Root endpoint
app.get("/", (req, res) => {
  res.json({
    status: "ok",
    service: "reflectai-api",
    message: "ReflectAI API is running",
    time: new Date().toISOString(),
  });
});

// Health check endpoint
app.get("/health", (req, res) => {
  res.json({
    status: "ok",
    service: "reflectai-api",
    time: new Date().toISOString(),
  });
});

// Start server
const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  logger.info(
    {
      event: "server_start",
      port: PORT,
      service: "reflectai-api",
    },
    "API server started"
  );
});