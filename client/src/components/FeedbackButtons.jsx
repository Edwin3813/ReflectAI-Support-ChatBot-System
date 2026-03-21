import { useState } from "react";
import { apiPost } from "../api/authApi";

export default function FeedbackButtons() {
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);

  async function sendFeedback(rating) {
    if (sent || loading) return;

    try {
      setLoading(true);

      await apiPost("/feedback", {
        rating,
      });

      setSent(true);
    } catch (err) {
      console.error("Feedback error:", err);
      alert("Failed to send feedback");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ display: "flex", gap: 8, marginTop: 6 }}>
      <button
        className="btn"
        onClick={() => sendFeedback(1)}
        disabled={sent || loading}
      >
        👍
      </button>

      <button
        className="btn"
        onClick={() => sendFeedback(-1)}
        disabled={sent || loading}
      >
        👎
      </button>

      {sent ? (
        <span style={{ fontSize: 12, color: "var(--text-muted)" }}>
          Thanks for your feedback
        </span>
      ) : null}
    </div>
  );
}