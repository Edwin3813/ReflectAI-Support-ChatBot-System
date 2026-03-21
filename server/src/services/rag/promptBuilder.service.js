// server/src/services/rag/promptBuilder.service.js

function normalizeWhitespace(s) {
  return String(s || "")
    .replace(/\s+/g, " ")
    .trim();
}

function truncate(s, maxChars) {
  const text = String(s || "");
  if (text.length <= maxChars) return text;
  return text.slice(0, maxChars).trimEnd() + "…";
}

function isTrustedResult(r) {
  const trust = String(r?.trust_level || "").toLowerCase();
  return trust === "high" || trust === "medium";
}

/**
 * Build a clean "context pack" from retrieved chunks.
 * Keeps citations aligned with what we include.
 */
function buildContextPack(results, opts = {}) {
  const {
    topK = 3,
    maxChunkChars = 650,
    maxTotalChars = 1600,
    minUsefulChars = 40,
  } = opts;

  const cleaned = (results || [])
    .map((r) => ({
      text: normalizeWhitespace(r.text),
      source: r.source || "Unknown source",
      source_id: r.source_id || null,
      title: r.title || null,
      url: r.url || null,
      collection: r.collection || "support",
      category: r.category || "general",
      trust_level: r.trust_level || "unknown",
      reviewed_at: r.reviewed_at || null,
      chunk: r.chunk,
      distance: r.distance,
    }))
    .filter((r) => r.text.length >= minUsefulChars)
    .filter((r) => isTrustedResult(r))
    .sort((a, b) => (a.distance ?? 999) - (b.distance ?? 999));

  const seen = new Set();
  const unique = [];

  for (const r of cleaned) {
    const key = `${r.source_id || r.source}::${r.chunk}::${r.text.toLowerCase()}`;
    if (seen.has(key)) continue;
    seen.add(key);
    unique.push(r);
    if (unique.length >= topK) break;
  }

  const selected = [];
  let total = 0;

  for (const r of unique) {
    const clipped = truncate(r.text, maxChunkChars);
    if (total + clipped.length > maxTotalChars) break;

    selected.push({ ...r, text: clipped });
    total += clipped.length;
  }

  const context =
    selected.length === 0
      ? ""
      : selected
          .map(
            (r, idx) =>
              `[S${idx + 1}] (${r.source}, ${r.category}, chunk ${r.chunk}) ${r.text}`
          )
          .join("\n\n");

  const citations = selected.map((r, idx) => ({
    ref: `S${idx + 1}`,
    source: r.source,
    source_id: r.source_id,
    title: r.title,
    url: r.url,
    collection: r.collection,
    category: r.category,
    trust_level: r.trust_level,
    reviewed_at: r.reviewed_at,
    chunk: r.chunk,
    distance: r.distance,
  }));

  return {
    selected,
    context,
    citations,
  };
}

/**
 * Knowledge-base-only fallback answer.
 * Keeps output grounded and concise.
 */
function buildGroundedAnswer(userMessage, pack) {
  const { selected, citations } = pack;

  if (!selected || selected.length === 0) {
    return {
      answer:
        "I couldn’t find a relevant passage in the knowledge base for that question yet. If you rephrase it or add a bit more detail, I can try again.",
      citations: [],
    };
  }

  const msg = String(userMessage || "").toLowerCase();

  if (msg.includes("number")) {
    for (let i = 0; i < selected.length; i++) {
      const text = selected[i].text;
      const ref = citations[i]?.ref || `S${i + 1}`;

      const m = text.match(/\b\d{3}\s?\d{3}\b/);
      if (m) {
        return {
          answer: `From the knowledge base: ${m[0]}. [${ref}]`,
          citations: [citations[i]],
        };
      }
    }
  }

  const keyLines = selected.map(
    (r, idx) => `• ${r.text} [${citations[idx].ref}]`
  );

  const answer =
    `Here’s what I found in the knowledge base:\n\n` + keyLines.join("\n");

  return { answer, citations };
}

module.exports = {
  buildContextPack,
  buildGroundedAnswer,
};