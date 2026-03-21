import { useState } from "react";

export default function SafetyBanner() {
  const [showMore, setShowMore] = useState(false);

  return (
    <div
      className="card"
      style={{
        marginBottom: 16,
        padding: 16,
        background:
          "linear-gradient(135deg, rgba(255, 251, 235, 0.92), rgba(255, 255, 255, 0.96))",
        border: "1px solid #fde68a",
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          gap: 12,
          alignItems: "flex-start",
          flexWrap: "wrap",
        }}
      >
        <div style={{ maxWidth: 820 }}>
          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 8,
              marginBottom: 10,
            }}
          >
            <span
              style={{
                width: 10,
                height: 10,
                borderRadius: 999,
                background: "var(--warning)",
                display: "inline-block",
              }}
            />
            <span
              style={{
                fontSize: 13,
                fontWeight: 800,
                letterSpacing: "0.04em",
                textTransform: "uppercase",
                color: "var(--warning)",
              }}
            >
              Safety and support
            </span>
          </div>

          <div
            style={{
              fontWeight: 800,
              fontSize: 18,
              marginBottom: 8,
              color: "var(--text)",
              letterSpacing: "-0.02em",
            }}
          >
            ReflectAI offers supportive information, not diagnosis or emergency care.
          </div>

          <div
            style={{
              color: "var(--text-soft)",
              lineHeight: 1.7,
              fontSize: 14,
            }}
          >
            Responses are grounded in the knowledge base where possible and may
            include safety-aware guidance. For urgent or life-threatening
            situations, use real-world emergency and crisis services immediately.
          </div>
        </div>

        <button
          type="button"
          className="btn"
          onClick={() => setShowMore((prev) => !prev)}
          aria-expanded={showMore}
        >
          {showMore ? "Hide details" : "How this works"}
        </button>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
          gap: 10,
          marginTop: 14,
        }}
      >
        <div
          style={{
            border: "1px solid #fde68a",
            background: "rgba(255,255,255,0.72)",
            borderRadius: "var(--radius-md)",
            padding: 12,
          }}
        >
          <div
            style={{
              fontSize: 12,
              fontWeight: 800,
              color: "var(--warning)",
              textTransform: "uppercase",
              letterSpacing: "0.04em",
              marginBottom: 4,
            }}
          >
            Immediate danger
          </div>
          <div style={{ fontSize: 14, color: "var(--text)" }}>
            Call <strong>999</strong> in the UK if there is immediate danger or a
            life-threatening emergency.
          </div>
        </div>

        <div
          style={{
            border: "1px solid #fde68a",
            background: "rgba(255,255,255,0.72)",
            borderRadius: "var(--radius-md)",
            padding: 12,
          }}
        >
          <div
            style={{
              fontSize: 12,
              fontWeight: 800,
              color: "var(--warning)",
              textTransform: "uppercase",
              letterSpacing: "0.04em",
              marginBottom: 4,
            }}
          >
            Urgent emotional support
          </div>
          <div style={{ fontSize: 14, color: "var(--text)" }}>
            Contact <strong>Samaritans 116 123</strong> free, 24/7, if you need
            urgent emotional support.
          </div>
        </div>

        <div
          style={{
            border: "1px solid #fde68a",
            background: "rgba(255,255,255,0.72)",
            borderRadius: "var(--radius-md)",
            padding: 12,
          }}
        >
          <div
            style={{
              fontSize: 12,
              fontWeight: 800,
              color: "var(--warning)",
              textTransform: "uppercase",
              letterSpacing: "0.04em",
              marginBottom: 4,
            }}
          >
            Service scope
          </div>
          <div style={{ fontSize: 14, color: "var(--text)" }}>
            ReflectAI can explain, guide, and signpost, but it does not replace a
            clinician, therapist, GP, or emergency service.
          </div>
        </div>
      </div>

      {showMore ? (
        <div
          style={{
            marginTop: 14,
            paddingTop: 14,
            borderTop: "1px solid #fde68a",
            display: "grid",
            gap: 10,
          }}
        >
          <div>
            <div
              style={{
                fontSize: 13,
                fontWeight: 700,
                marginBottom: 4,
                color: "var(--text)",
              }}
            >
              What ReflectAI does
            </div>
            <div
              style={{
                fontSize: 14,
                color: "var(--text-soft)",
                lineHeight: 1.7,
              }}
            >
              It retrieves approved support content, generates grounded answers,
              shows citations when available, and applies safety checks before
              returning responses.
            </div>
          </div>

          <div>
            <div
              style={{
                fontSize: 13,
                fontWeight: 700,
                marginBottom: 4,
                color: "var(--text)",
              }}
            >
              What ReflectAI does not do
            </div>
            <div
              style={{
                fontSize: 14,
                color: "var(--text-soft)",
                lineHeight: 1.7,
              }}
            >
              It does not diagnose mental health conditions, prescribe treatment,
              replace urgent care, or guarantee that every question can be answered
              from the knowledge base.
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}