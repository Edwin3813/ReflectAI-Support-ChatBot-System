const express = require("express");
const { requireAuth } = require("../middleware/auth.middleware");
const { assessInput } = require("../services/safety.service");
const {
  buildContextPack,
  buildGroundedAnswer,
} = require("../services/rag/promptBuilder.service");
const { generateRagAnswerJson } = require("../services/rag/llm.service");
const logger = require("../utils/logger");
const { recordChat, recordChatError } = require("../services/metrics.service");
const { chatUserLimiter } = require("../middleware/rateLimit.middleware");
const { insertChatMetricsEvent } = require("../services/dbMetrics.service");

const router = express.Router();

const RAG_SERVICE_URL = process.env.RAG_SERVICE_URL || "http://127.0.0.1:8001";

async function retrieveContext(req, query, mode = "support") {
  const res = await fetch(`${RAG_SERVICE_URL}/retrieve`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-request-id": req.requestId,
    },
    body: JSON.stringify({ query, top_k: 3, mode }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`RAG retrieve failed: HTTP ${res.status} - ${text}`);
  }

  return res.json();
}

function postSafetyGate(answerText) {
  const t = String(answerText || "").toLowerCase();
  const risky = ["how to kill", "suicide method", "harm yourself", "self-harm method"];
  const hit = risky.some((k) => t.includes(k));
  return { ok: !hit };
}

const STOPWORDS = new Set([
  "the", "and", "for", "that", "with", "this", "from", "what", "which", "when", "where", "who",
  "why", "how", "is", "are", "was", "were", "be", "been", "being", "do", "does", "did", "a", "an",
  "of", "to", "in", "on", "at", "by", "as", "it", "its", "i", "you", "your", "me", "my", "we", "our",
  "can", "could", "should", "would", "will", "may", "might", "please", "tell"
]);

function tokenize(s) {
  return String(s || "")
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .map((t) => t.trim())
    .filter((t) => t.length >= 3 && !STOPWORDS.has(t));
}

function isCrisisLike(flags) {
  return !!(flags?.crisis || flags?.suicidal || flags?.self_harm || flags?.urgent_help);
}

function isTrustedResult(result) {
  const trust = String(result?.trust_level || "").toLowerCase();
  return trust === "high" || trust === "medium";
}

function filterResultsByRelevance(results, message, options = {}) {
  const {
    maxDistance = 2.5,
    allowAllIfNoQueryTokens = true,
  } = options;

  const queryTokens = tokenize(message);
  const querySet = new Set(queryTokens);

  const filteredResults = (results || []).filter((r) => {
    const d = r.distance ?? 999;
    if (d > maxDistance) return false;
    if (!isTrustedResult(r)) return false;

    if (querySet.size === 0) return allowAllIfNoQueryTokens;

    const docTokens = new Set(tokenize(r.text));
    for (const t of querySet) {
      if (docTokens.has(t)) return true;
    }
    return false;
  });

  return { filteredResults, queryTokens };
}

function hasEnoughConfidence(filteredResults, retrievalMode) {
  if (!filteredResults || filteredResults.length === 0) return false;

  const maxDistance = retrievalMode === "crisis" ? 3.0 : 2.5;
  const bestDistance = Math.min(...filteredResults.map((r) => r.distance ?? 999));
  const trustedCount = filteredResults.filter(isTrustedResult).length;

  if (trustedCount === 0) return false;
  if (bestDistance > maxDistance) return false;

  return true;
}

router.post("/", requireAuth, chatUserLimiter, async (req, res) => {
  const start = Date.now();
  const requestId = req.requestId;

  const { message } = req.body || {};
  if (!message) return res.status(400).json({ error: "message is required" });

  logger.info(
    {
      event: "chat_request_start",
      request_id: requestId,
      user_id: req.user?.userId,
      message_length: String(message).length,
    },
    "Chat request received"
  );

  const safety = assessInput(message);

  logger.info(
    {
      event: "chat_safety_decision",
      request_id: requestId,
      user_id: req.user?.userId,
      safety_action: safety.action,
      flags: safety.flags,
    },
    "Safety gate evaluated"
  );

  if (safety.action !== "ALLOW") {
    const latency = Date.now() - start;

    logger.warn(
      {
        event: "chat_blocked",
        request_id: requestId,
        user_id: req.user?.userId,
        flags: safety.flags,
        latency_ms: latency,
      },
      "Chat blocked by safety gate"
    );

    const meta = {
      request_id: requestId,
      blocked: true,
      used_llm: false,
      fallback: false,
      reason: "pre_safety_block",
      latency_ms: latency,
    };

    recordChat(meta);
    insertChatMetricsEvent({ userId: req.user?.userId, meta });

    return res.json({
      answer: safety.safeAnswer,
      citations: [],
      flags: safety.flags,
      meta,
    });
  }

  try {
    const retrievalMode = isCrisisLike(safety.flags) ? "crisis" : "support";

    const data = await retrieveContext(req, message, retrievalMode);
    const results = data.results || [];

    const bestDistance =
      results.length > 0
        ? Math.min(...results.map((r) => r.distance ?? 999))
        : null;

    logger.info(
      {
        event: "chat_retrieval_done",
        request_id: requestId,
        user_id: req.user?.userId,
        retrieval_mode: retrievalMode,
        retrieval_count: results.length,
        retrieval_best_distance: bestDistance,
      },
      "Retrieval completed"
    );

    const { filteredResults, queryTokens } = filterResultsByRelevance(results, message, {
      maxDistance: retrievalMode === "crisis" ? 3.0 : 2.5,
    });

    logger.info(
      {
        event: "chat_retrieval_filtered",
        request_id: requestId,
        user_id: req.user?.userId,
        retrieval_mode: retrievalMode,
        query_tokens: queryTokens,
        kept: filteredResults.length,
        dropped: results.length - filteredResults.length,
      },
      "Retrieval results filtered"
    );

    if (!hasEnoughConfidence(filteredResults, retrievalMode)) {
      const latency = Date.now() - start;

      logger.info(
        {
          event: "chat_low_confidence_context",
          request_id: requestId,
          user_id: req.user?.userId,
          retrieval_mode: retrievalMode,
          latency_ms: latency,
        },
        "Retrieval confidence too low"
      );

      const meta = {
        request_id: requestId,
        blocked: false,
        used_llm: false,
        fallback: false,
        reason: "low_confidence_context",
        latency_ms: latency,
      };

      recordChat(meta);
      insertChatMetricsEvent({ userId: req.user?.userId, meta });

      return res.json({
        answer:
          "I couldn’t find reliable information in the knowledge base for that question yet.",
        citations: [],
        flags: safety.flags,
        meta,
      });
    }

    const pack = buildContextPack(filteredResults, {
      topK: 3,
      maxChunkChars: 650,
      maxTotalChars: 1600,
    });

    if (!pack.context || pack.citations.length === 0) {
      const latency = Date.now() - start;

      logger.info(
        {
          event: "chat_no_context",
          request_id: requestId,
          user_id: req.user?.userId,
          retrieval_mode: retrievalMode,
          latency_ms: latency,
        },
        "No relevant context"
      );

      const meta = {
        request_id: requestId,
        blocked: false,
        used_llm: false,
        fallback: false,
        reason: "no_retrieval_context",
        latency_ms: latency,
      };

      recordChat(meta);
      insertChatMetricsEvent({ userId: req.user?.userId, meta });

      return res.json({
        answer:
          "I couldn’t find reliable information in the knowledge base for that question yet.",
        citations: [],
        flags: safety.flags,
        meta,
      });
    }

    const knownIds = pack.citations.map((c) => c.ref);

    logger.info(
      {
        event: "chat_llm_attempt",
        request_id: requestId,
        user_id: req.user?.userId,
        retrieval_mode: retrievalMode,
        allowed_citations: knownIds,
      },
      "Attempting LLM call"
    );

    try {
      const llm = await generateRagAnswerJson({
        userMessage: message,
        context: pack.context,
        knownCitationIds: knownIds,
      });

      const allowed = new Set(knownIds);
      const cleanedIds = (llm.citation_ids || []).filter((id) => allowed.has(id));

      const finalAnswer = llm.answer;
      const finalCitations = pack.citations.filter((c) => cleanedIds.includes(c.ref));

      logger.info(
        {
          event: "chat_llm_returned",
          request_id: requestId,
          user_id: req.user?.userId,
          llm_citation_ids: llm.citation_ids,
          valid_citation_ids: cleanedIds,
        },
        "LLM returned structured answer"
      );

      if (cleanedIds.length === 0 && pack.citations.length > 0) {
        const fallback = buildGroundedAnswer(message, pack);
        const latency = Date.now() - start;

        logger.warn(
          {
            event: "chat_llm_invalid_citations_fallback",
            request_id: requestId,
            user_id: req.user?.userId,
            latency_ms: latency,
          },
          "Invalid citations fallback"
        );

        const meta = {
          request_id: requestId,
          blocked: false,
          used_llm: false,
          fallback: true,
          reason: "llm_invalid_citations",
          latency_ms: latency,
        };

        recordChat(meta);
        insertChatMetricsEvent({ userId: req.user?.userId, meta });

        return res.json({
          answer: fallback.answer,
          citations: fallback.citations,
          flags: safety.flags,
          meta,
        });
      }

      const post = postSafetyGate(finalAnswer);
      if (!post.ok) {
        const fallback = buildGroundedAnswer(message, pack);
        const latency = Date.now() - start;

        logger.warn(
          {
            event: "chat_post_safety_block_fallback",
            request_id: requestId,
            user_id: req.user?.userId,
            latency_ms: latency,
          },
          "Post safety fallback"
        );

        const meta = {
          request_id: requestId,
          blocked: false,
          used_llm: false,
          fallback: true,
          reason: "post_safety_block",
          latency_ms: latency,
        };

        recordChat(meta);
        insertChatMetricsEvent({ userId: req.user?.userId, meta });

        return res.json({
          answer: fallback.answer,
          citations: fallback.citations,
          flags: safety.flags,
          meta,
        });
      }

      const latency = Date.now() - start;

      logger.info(
        {
          event: "chat_success_llm",
          request_id: requestId,
          user_id: req.user?.userId,
          retrieval_mode: retrievalMode,
          latency_ms: latency,
        },
        "Chat completed using LLM"
      );

      const meta = {
        request_id: requestId,
        blocked: false,
        used_llm: true,
        fallback: false,
        reason: "llm_ok",
        latency_ms: latency,
      };

      recordChat(meta);
      insertChatMetricsEvent({ userId: req.user?.userId, meta });

      return res.json({
        answer: finalAnswer,
        citations: finalCitations,
        flags: safety.flags,
        meta,
      });
    } catch (e) {
      const fallback = buildGroundedAnswer(message, pack);
      const latency = Date.now() - start;

      logger.error(
        {
          event: "chat_llm_error_fallback",
          request_id: requestId,
          user_id: req.user?.userId,
          error: e?.message,
          latency_ms: latency,
        },
        "LLM failed"
      );

      const meta = {
        request_id: requestId,
        blocked: false,
        used_llm: false,
        fallback: true,
        reason: "llm_error",
        latency_ms: latency,
      };

      recordChat(meta);
      insertChatMetricsEvent({ userId: req.user?.userId, meta });

      return res.json({
        answer:
          `${fallback.answer}\n\n` +
          "(The AI model is temporarily unavailable, so I used a knowledge-base-only fallback.)",
        citations: fallback.citations,
        flags: safety.flags,
        meta,
      });
    }
  } catch (err) {
    logger.error(
      {
        event: "chat_route_error",
        request_id: requestId,
        user_id: req.user?.userId,
        error: err?.message,
      },
      "Chat route error"
    );

    recordChatError();

    return res.status(500).json({ error: err.message });
  }
});

module.exports = router;