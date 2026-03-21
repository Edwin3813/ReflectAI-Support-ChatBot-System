import { useEffect, useMemo, useState } from "react";
import AppShell from "../components/AppShell";
import { apiGet } from "../api/authApi";

function MetricCard({ label, value, hint }) {
  return (
    <div
      className="card"
      style={{
        padding: 18,
        background: "linear-gradient(180deg, rgba(255,255,255,0.96), rgba(255,255,255,0.9))",
      }}
    >
      <div
        style={{
          fontSize: 13,
          color: "var(--text-muted)",
          marginBottom: 8,
        }}
      >
        {label}
      </div>

      <div
        style={{
          fontSize: 28,
          fontWeight: 800,
          letterSpacing: "-0.02em",
          marginBottom: 6,
        }}
      >
        {value}
      </div>

      {hint ? (
        <div
          style={{
            fontSize: 12,
            color: "var(--text-soft)",
            lineHeight: 1.6,
          }}
        >
          {hint}
        </div>
      ) : null}
    </div>
  );
}

function SectionCard({ title, subtitle, children, right }) {
  return (
    <div
      className="card"
      style={{
        padding: 20,
        background: "linear-gradient(180deg, rgba(255,255,255,0.96), rgba(255,255,255,0.9))",
      }}
    >
      <div
        style={{
          marginBottom: 14,
          display: "flex",
          justifyContent: "space-between",
          gap: 12,
          alignItems: "flex-start",
          flexWrap: "wrap",
        }}
      >
        <div>
          <h3
            style={{
              margin: 0,
              marginBottom: 4,
              fontSize: 18,
              letterSpacing: "-0.02em",
            }}
          >
            {title}
          </h3>
          {subtitle ? (
            <div style={{ fontSize: 13, color: "var(--text-muted)", lineHeight: 1.6 }}>
              {subtitle}
            </div>
          ) : null}
        </div>

        {right ? <div>{right}</div> : null}
      </div>
      {children}
    </div>
  );
}

function FeedbackBadge({ rating }) {
  const positive = Number(rating) === 1;

  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        minWidth: 90,
        padding: "6px 10px",
        borderRadius: 999,
        fontSize: 12,
        fontWeight: 700,
        border: positive ? "1px solid #bbf7d0" : "1px solid #fecaca",
        background: positive ? "var(--success-bg)" : "var(--danger-bg)",
        color: positive ? "var(--success)" : "var(--danger)",
      }}
    >
      {positive ? "Positive" : "Negative"}
    </span>
  );
}

function formatDateTime(value) {
  try {
    return new Date(value).toLocaleString();
  } catch {
    return value || "-";
  }
}

function useIsMobile(breakpoint = 960) {
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

export default function AdminFeedbackPage() {
  const isMobile = useIsMobile();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [showOnlyTagged, setShowOnlyTagged] = useState(false);

  async function loadFeedback(isRefresh = false) {
    try {
      setError("");
      if (isRefresh) setRefreshing(true);
      else setLoading(true);

      const res = await apiGet("/admin/feedback");
      setData(res);
    } catch (e) {
      setError(e?.message || "Failed to load feedback.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  useEffect(() => {
    loadFeedback();
  }, []);

  const rows = data?.feedback || [];

  const summary = useMemo(() => {
    const total = rows.length;
    const positive = rows.filter((r) => Number(r.rating) === 1).length;
    const negative = rows.filter((r) => Number(r.rating) === -1).length;
    const tagged = rows.filter((r) => r.tags && String(r.tags).trim()).length;

    return { total, positive, negative, tagged };
  }, [rows]);

  const filteredRows = useMemo(() => {
    if (!showOnlyTagged) return rows;
    return rows.filter((r) => r.tags && String(r.tags).trim());
  }, [rows, showOnlyTagged]);

  return (
    <AppShell
      title="Admin Feedback"
      subtitle="Review user feedback captured from the ReflectAI chat experience."
      right={
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <button
            className="btn"
            onClick={() => setShowOnlyTagged((prev) => !prev)}
          >
            {showOnlyTagged ? "Show all feedback" : "Show tagged only"}
          </button>
          <button
            className="btn btn-primary"
            onClick={() => loadFeedback(true)}
            disabled={refreshing}
          >
            {refreshing ? "Refreshing..." : "Refresh"}
          </button>
        </div>
      }
    >
      {error ? (
        <div className="alert alert-danger" style={{ marginBottom: 16 }}>
          {error}
        </div>
      ) : null}

      {loading ? (
        <div className="card" style={{ padding: 24 }}>
          Loading feedback...
        </div>
      ) : (
        <>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
              gap: 16,
              marginBottom: 16,
            }}
          >
            <MetricCard
              label="Total feedback entries"
              value={summary.total}
              hint="All stored feedback rows"
            />
            <MetricCard
              label="Positive feedback"
              value={summary.positive}
              hint="Helpful responses"
            />
            <MetricCard
              label="Negative feedback"
              value={summary.negative}
              hint="Not helpful responses"
            />
            <MetricCard
              label="Tagged entries"
              value={summary.tagged}
              hint="Feedback with extra labels or notes"
            />
          </div>

          <SectionCard
            title="Feedback review table"
            subtitle="Privacy-safe feedback records from SQLite"
            right={
              <div
                style={{
                  fontSize: 12,
                  color: "var(--text-muted)",
                  paddingTop: 2,
                }}
              >
                Showing {filteredRows.length} of {rows.length}
              </div>
            }
          >
            {filteredRows.length === 0 ? (
              <div
                style={{
                  border: "1px dashed var(--border)",
                  borderRadius: "var(--radius-lg)",
                  padding: 20,
                  color: "var(--text-muted)",
                  background: "var(--surface-muted)",
                }}
              >
                {rows.length === 0
                  ? "No feedback has been recorded yet."
                  : "No tagged feedback entries match the current filter."}
              </div>
            ) : (
              <div className="table-wrap">
                <table className="table-clean">
                  <thead>
                    <tr>
                      <th style={thStyle}>Created</th>
                      <th style={thStyle}>User</th>
                      <th style={thStyle}>Rating</th>
                      {!isMobile ? <th style={thStyle}>Tags</th> : null}
                    </tr>
                  </thead>
                  <tbody>
                    {filteredRows.map((row) => (
                      <tr key={row.id}>
                        <td style={tdStyle}>
                          <div>{formatDateTime(row.created_at)}</div>
                          {isMobile && row.tags ? (
                            <div
                              style={{
                                marginTop: 6,
                                fontSize: 12,
                                color: "var(--text-soft)",
                                lineHeight: 1.5,
                              }}
                            >
                              <strong>Tags:</strong> {row.tags}
                            </div>
                          ) : null}
                        </td>
                        <td style={tdStyle}>{row.user_id || "-"}</td>
                        <td style={tdStyle}>
                          <FeedbackBadge rating={row.rating} />
                        </td>
                        {!isMobile ? (
                          <td style={tdStyle}>{row.tags || "-"}</td>
                        ) : null}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </SectionCard>
        </>
      )}
    </AppShell>
  );
}

const thStyle = {
  textAlign: "left",
  padding: "12px 14px",
  fontSize: 13,
  color: "var(--text-soft)",
  borderBottom: "1px solid var(--border)",
};

const tdStyle = {
  padding: "12px 14px",
  fontSize: 14,
  borderBottom: "1px solid var(--border)",
  verticalAlign: "top",
};