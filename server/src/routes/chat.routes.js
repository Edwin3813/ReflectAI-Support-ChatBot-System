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

async function retrieveContext(req, query, mode = "support", topK = 5) {
  const res = await fetch(`${RAG_SERVICE_URL}/retrieve`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-request-id": req.requestId,
    },
    body: JSON.stringify({ query, top_k: topK, mode }),
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
  "can", "could", "should", "would", "will", "may", "might", "please", "tell", "about", "some"
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

function isSupportResourceQuery(message) {
  const text = String(message || "").toLowerCase();

  const resourceTerms = [
    "samaritans",
    "helpline",
    "hotline",
    "phone number",
    "number",
    "contact",
    "call",
    "support line",
    "crisis line",
    "116 123",
  ];

  return resourceTerms.some((term) => text.includes(term));
}

function buildQueryVariants(message, supportResourceQuery) {
  if (!supportResourceQuery) return [message];

  const base = String(message || "").trim();
  return [
    base,
    `${base} support contact phone number helpline`,
    "Samaritans 116 123 support contact UK",
    "Samaritans phone number UK",
  ];
}

function scoreResult(result, querySet) {
  const text = String(result?.text || "");
  const metaBits = [
    result?.source,
    result?.title,
    result?.category,
    result?.source_id,
  ]
    .filter(Boolean)
    .join(" ");

  const haystackTokens = new Set(tokenize(`${text} ${metaBits}`));

  let overlap = 0;
  for (const t of querySet) {
    if (haystackTokens.has(t)) overlap += 1;
  }

  return overlap;
}

function isNamedResourceMatch(result, queryText) {
  const q = String(queryText || "").toLowerCase();
  const source = String(result?.source || "").toLowerCase();
  const title = String(result?.title || "").toLowerCase();
  const category = String(result?.category || "").toLowerCase();
  const text = String(result?.text || "").toLowerCase();

  if (q.includes("samaritans")) {
    return (
      source.includes("samaritans") ||
      title.includes("samaritans") ||
      text.includes("samaritans")
    );
  }

  if (q.includes("helpline") || q.includes("phone number") || q.includes("contact") || q.includes("number")) {
    return (
      category.includes("support-resources") ||
      text.includes("116 123") ||
      source.includes("samaritans") ||
      title.includes("samaritans")
    );
  }

  return false;
}

function filterResultsByRelevance(results, message, options = {}) {
  const {
    maxDistance = 2.5,
    allowAllIfNoQueryTokens = true,
    minimumOverlap = 1,
    allowCategoryBypass = false,
  } = options;

  const queryText = String(message || "");
  const queryTokens = tokenize(queryText);
  const querySet = new Set(queryTokens);

  const filteredResults = (results || []).filter((r) => {
    const d = r.distance ?? 999;

    const category = String(r?.category || "").toLowerCase();
    const title = String(r?.title || "").toLowerCase();
    const source = String(r?.source || "").toLowerCase();

    const supportResourceLike =
      category.includes("support-resources") ||
      title.includes("samaritans") ||
      source.includes("samaritans");

    if (isNamedResourceMatch(r, queryText)) {
      return true;
    }

    if (d > maxDistance && !(allowCategoryBypass && supportResourceLike)) {
      return false;
    }

    if (querySet.size === 0) return allowAllIfNoQueryTokens;

    const overlap = scoreResult(r, querySet);

    if (overlap >= minimumOverlap) return true;

    if (allowCategoryBypass && supportResourceLike && overlap >= 1) {
      return true;
    }

    return false;
  });

  filteredResults.sort((a, b) => {
    const aDirect = isNamedResourceMatch(a, queryText) ? 1 : 0;
    const bDirect = isNamedResourceMatch(b, queryText) ? 1 : 0;
    if (bDirect !== aDirect) return bDirect - aDirect;

    const aOverlap = scoreResult(a, querySet);
    const bOverlap = scoreResult(b, querySet);

    if (bOverlap !== aOverlap) return bOverlap - aOverlap;
    return (a.distance ?? 999) - (b.distance ?? 999);
  });

  return { filteredResults, queryTokens };
}

async function retrieveWithFallbackModes(req, message, safetyFlags) {
  const supportResourceQuery = isSupportResourceQuery(message);
  const crisisLike = isCrisisLike(safetyFlags);

  const modePlan = crisisLike
    ? [{ mode: "crisis", topK: 8, maxDistance: 5.0 }]
    : supportResourceQuery
    ? [
        { mode: "support", topK: 25, maxDistance: 999, allowCategoryBypass: true },
        { mode: "crisis", topK: 10, maxDistance: 999, allowCategoryBypass: true },
      ]
    : [{ mode: "support", topK: 5, maxDistance: 2.5 }];

  const queryVariants = buildQueryVariants(message, supportResourceQuery);

  let finalResults = [];
  let retrievalModeUsed = modePlan[0].mode;
  let queryTokens = [];

  for (const variant of queryVariants) {
    for (const plan of modePlan) {
      const data = await retrieveContext(req, variant, plan.mode, plan.topK);
      const results = data.results || [];

      const { filteredResults, queryTokens: qTokens } = filterResultsByRelevance(results, message, {
        maxDistance: plan.maxDistance ?? 2.5,
        allowCategoryBypass: !!plan.allowCategoryBypass,
      });

      if (filteredResults.length > 0) {
        finalResults = filteredResults;
        retrievalModeUsed = plan.mode;
        queryTokens = qTokens;
        break;
      }

      retrievalModeUsed = plan.mode;
      queryTokens = qTokens;
    }

    if (finalResults.length > 0) break;
  }

  return {
    finalResults,
    retrievalModeUsed,
    queryTokens,
    supportResourceQuery,
  };
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
    const { finalResults, retrievalModeUsed, queryTokens, supportResourceQuery } =
      await retrieveWithFallbackModes(req, message, safety.flags);

    logger.info(
      {
        event: "chat_retrieval_filtered",
        request_id: requestId,
        user_id: req.user?.userId,
        retrieval_mode: retrievalModeUsed,
        support_resource_query: supportResourceQuery,
        query_tokens: queryTokens,
        kept: finalResults.length,
      },
      "Retrieval results filtered"
    );

    const pack = buildContextPack(finalResults, {
      topK: supportResourceQuery ? 4 : 3,
      maxChunkChars: 650,
      maxTotalChars: supportResourceQuery ? 2200 : 1600,
    });

    if (!pack.context || pack.citations.length === 0) {
      const latency = Date.now() - start;

      logger.info(
        {
          event: "chat_no_context",
          request_id: requestId,
          user_id: req.user?.userId,
          retrieval_mode: retrievalModeUsed,
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
        retrieval_mode: retrievalModeUsed,
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
          retrieval_mode: retrievalModeUsed,
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