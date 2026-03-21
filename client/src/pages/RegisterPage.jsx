import { useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { apiPost } from "../api/authApi";

function AuthFeature({ title, text }) {
  return (
    <div
      className="card"
      style={{
        padding: 16,
        background: "rgba(255,255,255,0.72)",
        backdropFilter: "blur(10px)",
      }}
    >
      <div
        style={{
          fontSize: 14,
          fontWeight: 700,
          marginBottom: 6,
          color: "var(--text)",
        }}
      >
        {title}
      </div>
      <div
        style={{
          fontSize: 13,
          lineHeight: 1.6,
          color: "var(--text-soft)",
        }}
      >
        {text}
      </div>
    </div>
  );
}

export default function RegisterPage() {
  const nav = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [msg, setMsg] = useState("");
  const [err, setErr] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const emailError = useMemo(() => {
    if (!email) return "";
    const ok = /\S+@\S+\.\S+/.test(email.trim());
    return ok ? "" : "Enter a valid email address.";
  }, [email]);

  const passwordHint = useMemo(() => {
    if (!password) return "";
    if (password.length < 8) return "Use at least 8 characters.";
    return "";
  }, [password]);

  const confirmError = useMemo(() => {
    if (!confirmPassword) return "";
    if (password !== confirmPassword) return "Passwords do not match.";
    return "";
  }, [password, confirmPassword]);

  async function onSubmit(e) {
    e.preventDefault();
    setErr("");
    setMsg("");

    if (!email.trim() || !password.trim() || !confirmPassword.trim()) {
      setErr("Please complete all fields.");
      return;
    }

    if (emailError) {
      setErr(emailError);
      return;
    }

    if (password.length < 8) {
      setErr("Password must be at least 8 characters long.");
      return;
    }

    if (password !== confirmPassword) {
      setErr("Passwords do not match.");
      return;
    }

    setSubmitting(true);

    try {
      await apiPost("/auth/register", {
        email: email.trim(),
        password,
      });

      setMsg("Account created successfully. Redirecting to login...");
      setTimeout(() => nav("/login"), 1000);
    } catch (e) {
      setErr(e.message || "Registration failed. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div
      style={{
        minHeight: "100vh",
        background:
          "linear-gradient(180deg, #eef6ff 0%, #f8fbff 28%, #ffffff 58%, #f7f9fc 100%)",
      }}
    >
      <div
        className="page-container"
        style={{
          minHeight: "100vh",
          display: "grid",
          gridTemplateColumns: "1.05fr 0.95fr",
          gap: 24,
          alignItems: "center",
          paddingTop: 28,
          paddingBottom: 28,
        }}
      >
        <div>
          <Link
            to="/"
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 10,
              textDecoration: "none",
              color: "var(--text)",
              marginBottom: 20,
            }}
          >
            <div
              style={{
                width: 42,
                height: 42,
                borderRadius: 14,
                display: "grid",
                placeItems: "center",
                background: "linear-gradient(135deg, #2563eb, #7c3aed)",
                color: "#fff",
                fontWeight: 800,
                boxShadow: "0 14px 28px rgba(37, 99, 235, 0.18)",
              }}
            >
              R
            </div>
            <span style={{ fontSize: 18, fontWeight: 800 }}>ReflectAI</span>
          </Link>

          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 8,
              border: "1px solid rgba(37, 99, 235, 0.15)",
              background: "rgba(37, 99, 235, 0.06)",
              color: "var(--primary)",
              borderRadius: 999,
              padding: "8px 12px",
              fontSize: 12,
              fontWeight: 700,
              marginBottom: 18,
            }}
          >
            Private access • Safety-first design • Grounded support
          </div>

          <h1
            style={{
              margin: 0,
              marginBottom: 14,
              fontSize: "clamp(34px, 5vw, 58px)",
              lineHeight: 1.02,
              letterSpacing: "-0.04em",
              color: "var(--text)",
              maxWidth: 620,
            }}
          >
            Create your ReflectAI account and begin with confidence.
          </h1>

          <p
            style={{
              margin: 0,
              marginBottom: 22,
              maxWidth: 620,
              fontSize: 16,
              lineHeight: 1.75,
              color: "var(--text-soft)",
            }}
          >
            Set up access to a safer mental health support experience with
            grounded responses, transparent citations, and privacy-first design.
          </p>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
              gap: 14,
              maxWidth: 700,
            }}
          >
            <AuthFeature
              title="Trusted support content"
              text="ReflectAI uses reviewed knowledge sources to help reduce misinformation and improve transparency."
            />
            <AuthFeature
              title="Safer product experience"
              text="Crisis-aware escalation and refusal logic help keep support boundaries clear and responsible."
            />
            <AuthFeature
              title="Modern, privacy-first flow"
              text="Your account gives access to chat, feedback, and session continuity without storing raw chats on the server."
            />
          </div>
        </div>

        <div
          className="card"
          style={{
            maxWidth: 480,
            width: "100%",
            margin: "0 auto",
            padding: 28,
            borderRadius: 28,
            background:
              "linear-gradient(180deg, rgba(255,255,255,0.96), rgba(255,255,255,0.90))",
            boxShadow: "0 28px 70px rgba(15, 23, 42, 0.10)",
          }}
        >
          <div style={{ marginBottom: 20 }}>
            <div
              style={{
                fontSize: 12,
                fontWeight: 800,
                letterSpacing: "0.08em",
                textTransform: "uppercase",
                color: "var(--primary)",
                marginBottom: 10,
              }}
            >
              Create account
            </div>

            <h2
              style={{
                margin: 0,
                marginBottom: 8,
                fontSize: 30,
                letterSpacing: "-0.03em",
              }}
            >
              Join ReflectAI
            </h2>

            <p
              style={{
                margin: 0,
                fontSize: 14,
                lineHeight: 1.7,
                color: "var(--text-muted)",
              }}
            >
              Create your account to access the ReflectAI support chat
              experience.
            </p>
          </div>

          {err ? (
            <div className="alert alert-danger" style={{ marginBottom: 16 }}>
              {err}
            </div>
          ) : null}

          {msg ? (
            <div className="alert alert-success" style={{ marginBottom: 16 }}>
              {msg}
            </div>
          ) : null}

          <form onSubmit={onSubmit} style={{ display: "grid", gap: 14 }}>
            <label style={{ display: "grid", gap: 6 }}>
              <span style={{ fontSize: 14, fontWeight: 700 }}>
                Email address
              </span>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="input"
                placeholder="you@example.com"
                autoComplete="email"
              />
              {emailError ? (
                <span
                  style={{
                    fontSize: 12,
                    color: "var(--danger)",
                  }}
                >
                  {emailError}
                </span>
              ) : null}
            </label>

            <label style={{ display: "grid", gap: 6 }}>
              <span style={{ fontSize: 14, fontWeight: 700 }}>Password</span>

              <div style={{ position: "relative" }}>
                <input
                  type={showPassword ? "text" : "password"}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="input"
                  placeholder="Create a password"
                  autoComplete="new-password"
                  style={{ paddingRight: 90 }}
                />

                <button
                  type="button"
                  className="btn"
                  onClick={() => setShowPassword((prev) => !prev)}
                  style={{
                    position: "absolute",
                    right: 6,
                    top: 6,
                    padding: "6px 10px",
                    fontSize: 12,
                  }}
                >
                  {showPassword ? "Hide" : "Show"}
                </button>
              </div>

              {passwordHint ? (
                <span
                  style={{
                    fontSize: 12,
                    color: "var(--danger)",
                  }}
                >
                  {passwordHint}
                </span>
              ) : null}
            </label>

            <label style={{ display: "grid", gap: 6 }}>
              <span style={{ fontSize: 14, fontWeight: 700 }}>
                Confirm password
              </span>
              <input
                type={showPassword ? "text" : "password"}
                required
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="input"
                placeholder="Re-enter your password"
                autoComplete="new-password"
              />
              {confirmError ? (
                <span
                  style={{
                    fontSize: 12,
                    color: "var(--danger)",
                  }}
                >
                  {confirmError}
                </span>
              ) : null}
            </label>

            <button
              type="submit"
              className="btn btn-primary"
              disabled={submitting}
              style={{
                width: "100%",
                padding: "12px 16px",
                opacity: submitting ? 0.75 : 1,
                cursor: submitting ? "not-allowed" : "pointer",
                marginTop: 4,
              }}
            >
              {submitting ? "Creating account..." : "Create account"}
            </button>
          </form>

          <div
            style={{
              marginTop: 18,
              paddingTop: 16,
              borderTop: "1px solid var(--border)",
              fontSize: 14,
              color: "var(--text-soft)",
            }}
          >
            Already have an account?{" "}
            <Link
              to="/login"
              style={{ color: "var(--primary)", fontWeight: 700 }}
            >
              Log in
            </Link>
          </div>

          <div
            style={{
              marginTop: 16,
              fontSize: 12,
              color: "var(--text-muted)",
              lineHeight: 1.6,
            }}
          >
            ReflectAI provides supportive information, not diagnosis or emergency
            care. If you are in immediate danger, call 999.
          </div>
        </div>
      </div>
    </div>
  );
}