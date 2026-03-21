const metrics = {
  chat_total: 0,
  chat_blocked: 0,
  chat_no_context: 0,
  chat_fallback: 0,
  chat_used_llm: 0,
  chat_errors: 0,

  latency_total_ms: 0,
  latency_count: 0,
};

function recordChat(meta) {
  metrics.chat_total++;

  if (meta?.blocked) metrics.chat_blocked++;
  if (meta?.reason === "no_retrieval_context") metrics.chat_no_context++;
  if (meta?.fallback) metrics.chat_fallback++;
  if (meta?.used_llm) metrics.chat_used_llm++;

  if (typeof meta?.latency_ms === "number") {
    metrics.latency_total_ms += meta.latency_ms;
    metrics.latency_count += 1;
  }
}

function recordChatError() {
  metrics.chat_errors++;
}

function getMetrics() {
  const avg_latency_ms =
    metrics.latency_count > 0
      ? Math.round(metrics.latency_total_ms / metrics.latency_count)
      : 0;

  return {
    ...metrics,
    avg_latency_ms,
  };
}

module.exports = {
  recordChat,
  recordChatError,
  getMetrics,
};