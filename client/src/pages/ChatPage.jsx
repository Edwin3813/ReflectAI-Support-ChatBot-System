import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { apiGet, apiPost } from "../api/authApi";
import SafetyBanner from "../components/SafetyBanner";
import AppShell from "../components/AppShell";

const SYSTEM_WELCOME =
  "Hi — I’m ReflectAI. Ask a question and I’ll answer using the knowledge base with citations.\n\nIf you’re in immediate danger, call 999 (UK).";

function formatTime(ts) {
  try {
    return new Date(ts).toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return "";
  }
}

function formatDateLabel(ts) {
  try {
    return new Date(ts).toLocaleDateString([], {
      day: "2-digit",
      month: "short",
    });
  } catch {
    return "";
  }
}

function useIsMobile(breakpoint = 900) {
  const [isMobile, setIsMobile] = useState(() => {
    if (typeof window === "undefined") return false;
    return window.innerWidth <= breakpoint;
  });

  useEffect(() => {
    function onResize() {
      setIsMobile(window.innerWidth <= breakpoint);
    }

    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, [breakpoint]);

  return isMobile;
}

function makeMessage(role, text, extra = {}) {
  return {
    id: crypto.randomUUID(),
    role,
    text,
    citations: [],
    flags: null,
    meta: null,
    feedback: null,
    retryable: false,
    retryText: "",
    createdAt: new Date().toISOString(),
    ...extra,
  };
}

function makeNewSession() {
  const now = new Date().toISOString();
  return {
    id: crypto.randomUUID(),
    title: "New conversation",
    createdAt: now,
    updatedAt: now,
    messages: [makeMessage("assistant", SYSTEM_WELCOME)],
  };
}

function deriveTitle(messages) {
  const firstUser = messages.find((m) => m.role === "user" && m.text?.trim());
  if (!firstUser) return "New conversation";

  const clean = firstUser.text.trim().replace(/\s+/g, " ");
  return clean.length > 42 ? `${clean.slice(0, 42)}…` : clean;
}

function Bubble({ role, timestamp, children, isMobile }) {
  const isUser = role === "user";
  const label = isUser ? "You" : "ReflectAI";

  return (
    <div
      style={{
        display: "flex",
        justifyContent: isUser ? "flex-end" : "flex-start",
        margin: "12px 0",
      }}
    >
      <div
        style={{
          maxWidth: isMobile ? "100%" : isUser ? "80%" : "86%",
          width: "fit-content",
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: isUser ? "flex-end" : "flex-start",
            alignItems: "center",
            gap: 8,
            marginBottom: 6,
            fontSize: 12,
            color: "var(--text-muted)",
            flexWrap: "wrap",
          }}
        >
          {!isUser && <span style={{ fontWeight: 700 }}>{label}</span>}
          <span>{formatTime(timestamp)}</span>
          {isUser && <span style={{ fontWeight: 700 }}>{label}</span>}
        </div>

        <div
          style={{
            padding: "12px 14px",
            borderRadius: 16,
            border: "1px solid var(--border)",
            background: isUser ? "var(--text)" : "var(--surface)",
            color: isUser ? "#fff" : "var(--text)",
            whiteSpace: "pre-wrap",
            lineHeight: 1.55,
            boxShadow: "var(--shadow-sm)",
            wordBreak: "break-word",
          }}
        >
          {children}
        </div>
      </div>
    </div>
  );
}

function Pill({ children }) {
  return <span className="pill">{children}</span>;
}

function CitationMetaPill({ children }) {
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        padding: "4px 8px",
        borderRadius: 999,
        fontSize: 11,
        fontWeight: 700,
        background: "var(--surface)",
        border: "1px solid var(--border)",
        color: "var(--text-soft)",
      }}
    >
      {children}
    </span>
  );
}

function CitationCard({ citation, isMobile }) {
  const trustTone =
    citation?.trust_level === "high"
      ? "var(--success)"
      : citation?.trust_level === "medium"
      ? "var(--warning)"
      : "var(--text-muted)";

  return (
    <div
      style={{
        border: "1px solid var(--border)",
        borderRadius: "var(--radius-md)",
        background: "var(--surface-muted)",
        padding: 12,
        minWidth: isMobile ? "100%" : 220,
        maxWidth: isMobile ? "100%" : 320,
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          gap: 10,
          alignItems: "flex-start",
          marginBottom: 6,
          flexWrap: "wrap",
        }}
      >
        <div style={{ minWidth: 0 }}>
          <div
            style={{
              fontSize: 12,
              fontWeight: 800,
              marginBottom: 2,
              color: "var(--text)",
            }}
          >
            {citation.ref}
          </div>

          <div
            style={{
              fontSize: 13,
              fontWeight: 700,
              color: "var(--text)",
              lineHeight: 1.35,
            }}
          >
            {citation.title || citation.source}
          </div>
        </div>

        <div
          style={{
            fontSize: 11,
            fontWeight: 700,
            color: trustTone,
            whiteSpace: "nowrap",
          }}
        >
          {citation.trust_level ? `${citation.trust_level} trust` : ""}
        </div>
      </div>

      <div
        style={{
          fontSize: 12,
          color: "var(--text-soft)",
          marginBottom: 8,
        }}
      >
        {citation.source}
      </div>

      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          gap: 6,
          marginBottom: citation.url ? 8 : 0,
        }}
      >
        {citation.category ? (
          <CitationMetaPill>{citation.category}</CitationMetaPill>
        ) : null}

        {citation.collection ? (
          <CitationMetaPill>{citation.collection}</CitationMetaPill>
        ) : null}

        {citation.chunk !== undefined && citation.chunk !== null ? (
          <CitationMetaPill>chunk {citation.chunk}</CitationMetaPill>
        ) : null}
      </div>

      {citation.url ? (
        <a
          href={citation.url}
          target="_blank"
          rel="noreferrer"
          style={{
            fontSize: 12,
            fontWeight: 700,
            color: "var(--primary)",
            textDecoration: "none",
          }}
        >
          View source
        </a>
      ) : null}
    </div>
  );
}

function Citations({ citations, isMobile }) {
  if (!citations || citations.length === 0) return null;

  return (
    <div style={{ marginTop: 12 }}>
      <div
        style={{
          fontSize: 12,
          fontWeight: 700,
          marginBottom: 8,
          color: "var(--text-soft)",
        }}
      >
        Sources
      </div>

      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          gap: 8,
        }}
      >
        {citations.map((c) => (
          <CitationCard
            key={`${c.ref}-${c.chunk}-${c.source_id || c.source || "src"}`}
            citation={c}
            isMobile={isMobile}
          />
        ))}
      </div>
    </div>
  );
}

function MessageActions({
  text,
  feedback,
  onFeedback,
  onRetry,
  retryable,
  retrying,
}) {
  const [copied, setCopied] = useState(false);
  const [sendingFeedback, setSendingFeedback] = useState(false);

  async function copyText() {
    try {
      await navigator.clipboard.writeText(text || "");
      setCopied(true);
      setTimeout(() => setCopied(false), 1200);
    } catch {
      setCopied(false);
    }
  }

  async function submitFeedback(value) {
    if (sendingFeedback || feedback) return;

    try {
      setSendingFeedback(true);
      await apiPost("/feedback", {
        rating: value === "up" ? 1 : -1,
      });
      onFeedback?.(value);
    } catch (err) {
      console.error("Feedback error:", err);
    } finally {
      setSendingFeedback(false);
    }
  }

  return (
    <div
      style={{
        display: "flex",
        gap: 8,
        flexWrap: "wrap",
        marginTop: 12,
        alignItems: "center",
      }}
    >
      <button type="button" className="btn" onClick={copyText}>
        {copied ? "Copied" : "Copy"}
      </button>

      {retryable ? (
        <button
          type="button"
          className="btn"
          onClick={onRetry}
          disabled={retrying}
        >
          {retrying ? "Retrying..." : "Retry"}
        </button>
      ) : null}

      {!retryable ? (
        <>
          <button
            type="button"
            className={`btn ${feedback === "up" ? "btn-primary" : ""}`}
            onClick={() => submitFeedback("up")}
            disabled={sendingFeedback || !!feedback}
            title="Mark this answer as helpful"
          >
            {sendingFeedback && !feedback ? "Sending..." : "👍 Helpful"}
          </button>

          <button
            type="button"
            className={`btn ${feedback === "down" ? "btn-danger-soft" : ""}`}
            onClick={() => submitFeedback("down")}
            disabled={sendingFeedback || !!feedback}
            title="Mark this answer as not helpful"
          >
            👎 Not helpful
          </button>
        </>
      ) : null}

      {feedback && !retryable ? (
        <span
          style={{
            fontSize: 12,
            color: "var(--text-muted)",
          }}
        >
          Thanks for your feedback
        </span>
      ) : null}
    </div>
  );
}

function SessionItem({ session, active, onSelect, onDelete }) {
  return (
    <div
      style={{
        border: active ? "1px solid var(--primary)" : "1px solid var(--border)",
        background: active ? "rgba(37, 99, 235, 0.06)" : "var(--surface)",
        borderRadius: "var(--radius-md)",
        padding: 12,
        cursor: "pointer",
        transition: "0.18s ease",
      }}
      onClick={() => onSelect(session.id)}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          gap: 10,
          alignItems: "flex-start",
        }}
      >
        <div style={{ minWidth: 0 }}>
          <div
            style={{
              fontSize: 14,
              fontWeight: 700,
              color: "var(--text)",
              marginBottom: 4,
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
          >
            {session.title}
          </div>

          <div
            style={{
              fontSize: 12,
              color: "var(--text-muted)",
            }}
          >
            {formatDateLabel(session.updatedAt)} · {session.messages.length} msgs
          </div>
        </div>

        <button
          type="button"
          className="btn"
          style={{
            padding: "4px 8px",
            fontSize: 12,
          }}
          onClick={(e) => {
            e.stopPropagation();
            onDelete(session.id);
          }}
        >
          Delete
        </button>
      </div>
    </div>
  );
}

function EmptyChatState() {
  return (
    <div
      style={{
        height: "100%",
        display: "grid",
        placeItems: "center",
        color: "var(--text-muted)",
        textAlign: "center",
        padding: 24,
      }}
    >
      <div style={{ maxWidth: 520 }}>
        <div
          style={{
            width: 64,
            height: 64,
            margin: "0 auto 16px auto",
            borderRadius: 20,
            display: "grid",
            placeItems: "center",
            background: "var(--primary-soft)",
            color: "var(--primary)",
            fontWeight: 800,
            fontSize: 24,
          }}
        >
          R
        </div>

        <div
          style={{
            fontSize: 22,
            fontWeight: 800,
            color: "var(--text)",
            marginBottom: 10,
            letterSpacing: "-0.03em",
          }}
        >
          Start a new ReflectAI conversation
        </div>

        <div
          style={{
            fontSize: 14,
            lineHeight: 1.7,
          }}
        >
          Ask about anxiety, stress, sleep, grounding techniques, low mood, or
          support resources. Answers use the knowledge base and show citations
          when relevant.
        </div>
      </div>
    </div>
  );
}

export default function ChatPage() {
  const nav = useNavigate();
  const isMobile = useIsMobile();
  const [me, setMe] = useState(null);

  const [sessions, setSessions] = useState([]);
  const [activeSessionId, setActiveSessionId] = useState(null);

  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [retryingMessageId, setRetryingMessageId] = useState(null);
  const [error, setError] = useState(null);
  const [historyReady, setHistoryReady] = useState(false);
  const [showHistory, setShowHistory] = useState(false);

  const listRef = useRef(null);

  const activeSession =
    sessions.find((s) => s.id === activeSessionId) || null;

  const messages = activeSession?.messages || [];

  function storageKey(email) {
    return `reflectai_chat_sessions_${email}`;
  }

  useEffect(() => {
    apiGet("/me")
      .then((data) => setMe(data.user))
      .catch(() => {
        localStorage.removeItem("token");
        nav("/login");
      });
  }, [nav]);

  useEffect(() => {
    if (!me?.email) return;

    try {
      const raw = localStorage.getItem(storageKey(me.email));
      const parsed = raw ? JSON.parse(raw) : [];

      if (Array.isArray(parsed) && parsed.length > 0) {
        setSessions(parsed);
        setActiveSessionId(parsed[0].id);
      } else {
        const starter = makeNewSession();
        setSessions([starter]);
        setActiveSessionId(starter.id);
      }
    } catch {
      const starter = makeNewSession();
      setSessions([starter]);
      setActiveSessionId(starter.id);
    } finally {
      setHistoryReady(true);
    }
  }, [me]);

  useEffect(() => {
    if (!historyReady || !me?.email) return;
    localStorage.setItem(storageKey(me.email), JSON.stringify(sessions));
  }, [sessions, me, historyReady]);

  useEffect(() => {
    if (!listRef.current) return;
    listRef.current.scrollTop = listRef.current.scrollHeight;
  }, [messages, sending, retryingMessageId]);

  useEffect(() => {
    if (!isMobile) {
      setShowHistory(false);
    }
  }, [isMobile]);

  function logout() {
    localStorage.removeItem("token");
    nav("/login");
  }

  function createSession() {
    const next = makeNewSession();
    setSessions((prev) => [next, ...prev]);
    setActiveSessionId(next.id);
    setInput("");
    setError(null);
    setShowHistory(false);
  }

  function clearConversation() {
    updateActiveSession((session) => ({
      ...session,
      messages: [makeMessage("assistant", SYSTEM_WELCOME)],
    }));
    setError(null);
  }

  function deleteSession(sessionId) {
    setSessions((prev) => {
      const filtered = prev.filter((s) => s.id !== sessionId);

      if (filtered.length === 0) {
        const fallback = makeNewSession();
        setActiveSessionId(fallback.id);
        return [fallback];
      }

      if (sessionId === activeSessionId) {
        setActiveSessionId(filtered[0].id);
      }

      return filtered;
    });
  }

  function updateActiveSession(updater) {
    setSessions((prev) =>
      prev.map((session) => {
        if (session.id !== activeSessionId) return session;
        const nextSession = updater(session);
        return {
          ...nextSession,
          title: deriveTitle(nextSession.messages),
          updatedAt: new Date().toISOString(),
        };
      })
    );
  }

  function setMessageFeedback(messageId, value) {
    updateActiveSession((session) => ({
      ...session,
      messages: session.messages.map((message) =>
        message.id === messageId
          ? {
              ...message,
              feedback: value,
            }
          : message
      ),
    }));
  }

  const canSend = useMemo(
    () => input.trim().length > 0 && !sending && !!activeSessionId,
    [input, sending, activeSessionId]
  );

  async function sendMessageText(text) {
    const data = await apiPost("/chat", { message: text });

    return makeMessage("assistant", data.answer || "(no answer returned)", {
      citations: data.citations || [],
      flags: data.flags || null,
      meta: data.meta || null,
      retryable: false,
      retryText: "",
    });
  }

  async function send() {
    const text = input.trim();
    if (!text || sending || !activeSessionId) return;

    setError(null);
    setSending(true);
    setInput("");

    const userMsg = makeMessage("user", text);
    updateActiveSession((session) => ({
      ...session,
      messages: [...session.messages, userMsg],
    }));

    try {
      const assistantMsg = await sendMessageText(text);

      updateActiveSession((session) => ({
        ...session,
        messages: [...session.messages, assistantMsg],
      }));
    } catch (e) {
      setError(e?.message || "Chat request failed");

      const fallbackMsg = makeMessage(
        "assistant",
        "Sorry — I couldn’t complete that request right now.\n\nTry again in a moment.",
        {
          retryable: true,
          retryText: text,
        }
      );

      updateActiveSession((session) => ({
        ...session,
        messages: [...session.messages, fallbackMsg],
      }));
    } finally {
      setSending(false);
    }
  }

  async function retryMessage(messageId, retryText) {
    if (!retryText || retryingMessageId) return;

    setRetryingMessageId(messageId);
    setError(null);

    try {
      const replacementMsg = await sendMessageText(retryText);

      updateActiveSession((session) => ({
        ...session,
        messages: session.messages.map((message) =>
          message.id === messageId ? replacementMsg : message
        ),
      }));
    } catch (e) {
      setError(e?.message || "Retry failed");
    } finally {
      setRetryingMessageId(null);
    }
  }

  function onKeyDown(e) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  }

  if (!me || !historyReady) {
    return <div style={{ padding: 24 }}>Loading…</div>;
  }

  return (
    <AppShell
      title="ReflectAI Chat"
      subtitle={`Signed in as ${me.email}`}
      right={
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          {isMobile ? (
            <button
              onClick={() => setShowHistory((prev) => !prev)}
              className="btn"
            >
              {showHistory ? "Hide history" : "Show history"}
            </button>
          ) : null}

          <button onClick={createSession} className="btn btn-primary">
            New chat
          </button>
          <button onClick={clearConversation} className="btn">
            Clear conversation
          </button>
          <button onClick={logout} className="btn btn-danger-soft">
            Log out
          </button>
        </div>
      }
    >
      <SafetyBanner />

      <div
        style={{
          display: "grid",
          gridTemplateColumns: isMobile ? "1fr" : "280px 1fr",
          gap: 16,
          alignItems: "start",
        }}
      >
        {(!isMobile || showHistory) && (
          <div className="card" style={{ padding: 14 }}>
            <div
              style={{
                fontSize: 13,
                fontWeight: 700,
                color: "var(--text-soft)",
                marginBottom: 12,
              }}
            >
              Conversation history
            </div>

            <div
              style={{
                display: "grid",
                gap: 10,
                maxHeight: isMobile ? 280 : 620,
                overflowY: "auto",
              }}
            >
              {sessions.map((session) => (
                <SessionItem
                  key={session.id}
                  session={session}
                  active={session.id === activeSessionId}
                  onSelect={(id) => {
                    setActiveSessionId(id);
                    if (isMobile) setShowHistory(false);
                  }}
                  onDelete={deleteSession}
                />
              ))}
            </div>
          </div>
        )}

        <div className="card" style={{ padding: isMobile ? 12 : 16 }}>
          <div
            ref={listRef}
            style={{
              border: "1px solid var(--border)",
              borderRadius: "var(--radius-lg)",
              padding: isMobile ? 10 : 14,
              height: isMobile ? 58 : 500,
              minHeight: isMobile ? 420 : 500,
              overflowY: "auto",
              background: "var(--surface-muted)",
            }}
          >
            {messages.length === 0 ? (
              <EmptyChatState />
            ) : (
              messages.map((m) => (
                <div key={m.id}>
                  <Bubble
                    role={m.role}
                    timestamp={m.createdAt}
                    isMobile={isMobile}
                  >
                    {m.text}

                    {m.role === "assistant" && (
                      <>
                        <Citations citations={m.citations} isMobile={isMobile} />

                        {m.flags && (
                          <div
                            style={{
                              marginTop: 12,
                              display: "flex",
                              flexWrap: "wrap",
                              gap: 8,
                            }}
                          >
                            {m.flags.crisis && <Pill>crisis</Pill>}
                            {m.flags.refusal && <Pill>refusal</Pill>}
                            {m.flags.injection && <Pill>injection</Pill>}
                            {m.flags.urgent_help && <Pill>urgent help</Pill>}
                          </div>
                        )}

                        {m.flags?.crisis && (
                          <div
                            className="alert alert-warning"
                            style={{ marginTop: 12 }}
                          >
                            This response includes crisis-aware support guidance.
                            If there is immediate danger, call 999.
                          </div>
                        )}

                        {m.meta?.request_id && (
                          <div
                            style={{
                              marginTop: 12,
                              fontSize: 12,
                              color: "var(--text-muted)",
                              wordBreak: "break-word",
                            }}
                          >
                            request_id: <code>{m.meta.request_id}</code>
                            {typeof m.meta.latency_ms === "number" && (
                              <>
                                {" "}
                                · latency: <b>{m.meta.latency_ms}ms</b>
                              </>
                            )}
                            {m.meta.fallback && <span> · fallback</span>}
                            {m.meta.used_llm && <span> · llm</span>}
                            {m.meta.blocked && <span> · blocked</span>}
                          </div>
                        )}

                        <MessageActions
                          text={m.text}
                          feedback={m.feedback}
                          retryable={m.retryable}
                          retrying={retryingMessageId === m.id}
                          onRetry={() => retryMessage(m.id, m.retryText)}
                          onFeedback={(value) => setMessageFeedback(m.id, value)}
                        />
                      </>
                    )}
                  </Bubble>
                </div>
              ))
            )}

            {sending && (
              <Bubble
                role="assistant"
                timestamp={new Date().toISOString()}
                isMobile={isMobile}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <span
                    style={{
                      width: 10,
                      height: 10,
                      borderRadius: 999,
                      background: "var(--primary)",
                      display: "inline-block",
                      opacity: 0.8,
                    }}
                  />
                  <span style={{ opacity: 0.85 }}>
                    ReflectAI is preparing a response...
                  </span>
                </div>
              </Bubble>
            )}
          </div>

          <div style={{ marginTop: 14 }}>
            {error ? (
              <div className="alert alert-danger" style={{ marginBottom: 10 }}>
                {error}
              </div>
            ) : null}

            <div
              className="card"
              style={{
                padding: 12,
                borderRadius: "var(--radius-lg)",
                boxShadow: "none",
              }}
            >
              <div
                style={{
                  display: "flex",
                  gap: 10,
                  alignItems: "flex-end",
                  flexDirection: isMobile ? "column" : "row",
                }}
              >
                <textarea
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={onKeyDown}
                  placeholder="Type your message… (Enter to send, Shift+Enter for new line)"
                  rows={2}
                  className="textarea"
                  style={{
                    flex: 1,
                    resize: "none",
                    minHeight: 56,
                    width: "100%",
                  }}
                />

                <button
                  onClick={send}
                  disabled={!canSend}
                  className={`btn ${canSend ? "btn-primary" : ""}`}
                  style={{
                    minWidth: isMobile ? "100%" : 88,
                    width: isMobile ? "100%" : "auto",
                    opacity: canSend ? 1 : 0.6,
                    cursor: canSend ? "pointer" : "not-allowed",
                  }}
                >
                  Send
                </button>
              </div>
            </div>

            <div
              style={{
                marginTop: 8,
                fontSize: 12,
                color: "var(--text-muted)",
                display: "flex",
                justifyContent: "space-between",
                gap: 12,
                flexWrap: "wrap",
              }}
            >
              <span>
                Tip: Ask about anxiety, stress, sleep, grounding, low mood, or
                Samaritans support.
              </span>
              <span>Enter to send · Shift + Enter for a new line</span>
            </div>
          </div>
        </div>
      </div>
    </AppShell>
  );
}