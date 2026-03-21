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

function BarRow({ label, value, max, tone = "var(--primary)" }) {
  const safeMax = Math.max(max || 1, 1);
  const widthPct = value <= 0 ? 0 : Math.max(6, (value / safeMax) * 100);

  return (
    <div style={{ marginBottom: 14 }}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          gap: 12,
          fontSize: 13,
          marginBottom: 6,
          flexWrap: "wrap",
        }}
      >
        <span style={{ color: "var(--text-soft)" }}>{label}</span>
        <strong>{value}</strong>
      </div>

      <div
        style={{
          height: 12,
          borderRadius: 999,
          background: "var(--surface-muted)",
          border: "1px solid var(--border)",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            width: `${widthPct}%`,
            height: "100%",
            background: tone,
            borderRadius: 999,
          }}
        />
      </div>
    </div>
  );
}

function HealthBadge({ label, ok }) {
  return (
    <div
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 8,
        padding: "8px 12px",
        borderRadius: 999,
        border: "1px solid var(--border)",
        background: ok ? "var(--success-bg)" : "var(--danger-bg)",
        color: ok ? "var(--success)" : "var(--danger)",
        fontSize: 13,
        fontWeight: 600,
      }}
    >
      <span
        style={{
          width: 8,
          height: 8,
          borderRadius: 999,
          background: ok ? "var(--success)" : "var(--danger)",
          display: "inline-block",
        }}
      />
      {label}
    </div>
  );
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

export default function AdminMetricsPage() {
  const isMobile = useIsMobile();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [showRaw, setShowRaw] = useState(false);

  async function loadMetrics(isRefresh = false) {
    try {
      setError("");
      if (isRefresh) setRefreshing(true);
      else setLoading(true);

      const res = await apiGet("/admin/metrics");
      setData(res);
    } catch (e) {
      setError(e?.message || "Failed to load metrics.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  useEffect(() => {
    loadMetrics();
  }, []);

  const metrics = data?.metrics || {};

  const chartData = useMemo(() => {
    return [
      {
        label: "Total chats",
        value: Number(metrics.chat_total || 0),
        tone: "var(--primary)",
      },
      {
        label: "Safety blocked",
        value: Number(metrics.chat_blocked || 0),
        tone: "var(--warning)",
      },
      {
        label: "No context",
        value: Number(metrics.chat_no_context || 0),
        tone: "#7c3aed",
      },
      {
        label: "Fallback used",
        value: Number(metrics.chat_fallback || 0),
        tone: "#ea580c",
      },
      {
        label: "LLM used",
        value: Number(metrics.chat_used_llm || 0),
        tone: "var(--success)",
      },
      {
        label: "Errors",
        value: Number(metrics.chat_errors || 0),
        tone: "var(--danger)",
      },
    ];
  }, [metrics]);

  const maxChartValue = Math.max(...chartData.map((d) => d.value), 1);

  const avgLatency = Number(metrics.avg_latency_ms || 0);
  const latencyStatus =
    avgLatency <= 300
      ? "Excellent"
      : avgLatency <= 1000
      ? "Healthy"
      : avgLatency <= 2500
      ? "Moderate"
      : "High";

  const fallbackRate =
    Number(metrics.chat_total || 0) > 0
      ? Math.round(
          (Number(metrics.chat_fallback || 0) /
            Number(metrics.chat_total || 1)) *
            100
        )
      : 0;

  const errorRate =
    Number(metrics.chat_total || 0) > 0
      ? Math.round(
          (Number(metrics.chat_errors || 0) /
            Number(metrics.chat_total || 1)) *
            100
        )
      : 0;

  const systemHealthy = errorRate < 10 && avgLatency < 2500;

  return (
    <AppShell
      title="Admin Metrics"
      subtitle="Operational overview of ReflectAI system activity."
      right={
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <button className="btn" onClick={() => setShowRaw((prev) => !prev)}>
            {showRaw ? "Hide raw data" : "Show raw data"}
          </button>
          <button
            className="btn btn-primary"
            onClick={() => loadMetrics(true)}
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
          Loading metrics...
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
              label="Total chat requests"
              value={metrics.chat_total ?? 0}
              hint="All chat calls received"
            />
            <MetricCard
              label="Safety blocked"
              value={metrics.chat_blocked ?? 0}
              hint="Requests stopped by the safety layer"
            />
            <MetricCard
              label="Fallback used"
              value={metrics.chat_fallback ?? 0}
              hint="Responses served without LLM success"
            />
            <MetricCard
              label="LLM used"
              value={metrics.chat_used_llm ?? 0}
              hint="Requests completed with model output"
            />
            <MetricCard
              label="Chat errors"
              value={metrics.chat_errors ?? 0}
              hint="Route-level failures"
            />
            <MetricCard
              label="Average latency"
              value={`${metrics.avg_latency_ms ?? 0} ms`}
              hint="Average end-to-end response time"
            />
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: isMobile ? "1fr" : "1.2fr 0.8fr",
              gap: 16,
              marginBottom: 16,
            }}
          >
            <SectionCard
              title="Usage distribution"
              subtitle="Relative activity across major system behaviours"
            >
              {chartData.map((item) => (
                <BarRow
                  key={item.label}
                  label={item.label}
                  value={item.value}
                  max={maxChartValue}
                  tone={item.tone}
                />
              ))}
            </SectionCard>

            <SectionCard
              title="System health"
              subtitle="Quick operational interpretation of current metrics"
            >
              <div
                style={{
                  display: "flex",
                  flexWrap: "wrap",
                  gap: 10,
                  marginBottom: 16,
                }}
              >
                <HealthBadge
                  label={systemHealthy ? "System healthy" : "Attention needed"}
                  ok={systemHealthy}
                />
                <HealthBadge
                  label={errorRate < 10 ? "Low error rate" : "Elevated errors"}
                  ok={errorRate < 10}
                />
                <HealthBadge
                  label={
                    avgLatency < 2500 ? "Latency acceptable" : "Latency high"
                  }
                  ok={avgLatency < 2500}
                />
              </div>

              <div
                style={{
                  display: "grid",
                  gap: 12,
                  fontSize: 14,
                }}
              >
                <div>
                  <strong>Latency status:</strong>{" "}
                  <span style={{ color: "var(--text-soft)" }}>
                    {latencyStatus}
                  </span>
                </div>
                <div>
                  <strong>Fallback rate:</strong>{" "}
                  <span style={{ color: "var(--text-soft)" }}>
                    {fallbackRate}%
                  </span>
                </div>
                <div>
                  <strong>Error rate:</strong>{" "}
                  <span style={{ color: "var(--text-soft)" }}>
                    {errorRate}%
                  </span>
                </div>
                <div>
                  <strong>Latency samples:</strong>{" "}
                  <span style={{ color: "var(--text-soft)" }}>
                    {metrics.latency_count ?? 0}
                  </span>
                </div>
              </div>

              <div style={{ marginTop: 18 }}>
                <div
                  style={{
                    fontSize: 12,
                    color: "var(--text-muted)",
                    marginBottom: 6,
                  }}
                >
                  Average latency visual
                </div>

                <div
                  style={{
                    height: 14,
                    borderRadius: 999,
                    overflow: "hidden",
                    background: "var(--surface-muted)",
                    border: "1px solid var(--border)",
                  }}
                >
                  <div
                    style={{
                      width: `${Math.min((avgLatency / 3000) * 100, 100)}%`,
                      height: "100%",
                      background:
                        avgLatency <= 300
                          ? "var(--success)"
                          : avgLatency <= 1000
                          ? "var(--primary)"
                          : avgLatency <= 2500
                          ? "#ea580c"
                          : "var(--danger)",
                    }}
                  />
                </div>
              </div>
            </SectionCard>
          </div>

          {showRaw ? (
            <SectionCard
              title="Raw Metrics Snapshot"
              subtitle="Current API response returned by the metrics endpoint"
            >
              <div
                style={{
                  border: "1px solid var(--border)",
                  borderRadius: "var(--radius-lg)",
                  background: "var(--surface-muted)",
                  padding: 16,
                  overflowX: "auto",
                }}
              >
                <pre
                  style={{
                    margin: 0,
                    fontSize: 13,
                    color: "var(--text)",
                    whiteSpace: "pre-wrap",
                    wordBreak: "break-word",
                  }}
                >
                  {JSON.stringify(data, null, 2)}
                </pre>
              </div>
            </SectionCard>
          ) : null}
        </>
      )}
    </AppShell>
  );
}