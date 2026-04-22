import { Link } from "react-router-dom";

function HeroStat({ value, label }) {
  return (
    <div
      className="card"
      style={{
        padding: 18,
        minWidth: 160,
        textAlign: "center",
        background: "rgba(255,255,255,0.72)",
        backdropFilter: "blur(10px)",
      }}
    >
      <div
        style={{
          fontSize: 28,
          fontWeight: 800,
          letterSpacing: "-0.03em",
          marginBottom: 6,
        }}
      >
        {value}
      </div>
      <div
        style={{
          fontSize: 13,
          color: "var(--text-muted)",
        }}
      >
        {label}
      </div>
    </div>
  );
}

function FeatureCard({ title, text, icon }) {
  return (
    <div className="card" style={{ padding: 22, height: "100%" }}>
      <div
        style={{
          width: 48,
          height: 48,
          borderRadius: 14,
          display: "grid",
          placeItems: "center",
          fontSize: 22,
          background: "rgba(37, 99, 235, 0.10)",
          marginBottom: 14,
        }}
      >
        {icon}
      </div>

      <h3 style={{ margin: 0, marginBottom: 10, fontSize: 18 }}>{title}</h3>
      <p
        style={{
          margin: 0,
          color: "var(--text-soft)",
          lineHeight: 1.6,
          fontSize: 14,
        }}
      >
        {text}
      </p>
    </div>
  );
}

function StepCard({ number, title, text }) {
  return (
    <div className="card" style={{ padding: 22, height: "100%" }}>
      <div
        style={{
          width: 42,
          height: 42,
          borderRadius: 999,
          display: "grid",
          placeItems: "center",
          fontSize: 14,
          fontWeight: 800,
          background: "var(--text)",
          color: "#fff",
          marginBottom: 14,
        }}
      >
        {number}
      </div>

      <h3 style={{ margin: 0, marginBottom: 10, fontSize: 18 }}>{title}</h3>
      <p
        style={{
          margin: 0,
          color: "var(--text-soft)",
          lineHeight: 1.6,
          fontSize: 14,
        }}
      >
        {text}
      </p>
    </div>
  );
}

function SectionHeading({ eyebrow, title, subtitle, center = false }) {
  return (
    <div
      style={{
        marginBottom: 24,
        textAlign: center ? "center" : "left",
      }}
    >
      {eyebrow ? (
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
          {eyebrow}
        </div>
      ) : null}

      <h2
        style={{
          margin: 0,
          fontSize: "clamp(28px, 4vw, 46px)",
          lineHeight: 1.05,
          letterSpacing: "-0.04em",
          marginBottom: 10,
        }}
      >
        {title}
      </h2>

      {subtitle ? (
        <p
          style={{
            margin: 0,
            color: "var(--text-soft)",
            lineHeight: 1.7,
            fontSize: 16,
            maxWidth: center ? 760 : 680,
            marginInline: center ? "auto" : 0,
          }}
        >
          {subtitle}
        </p>
      ) : null}
    </div>
  );
}

export default function HomePage() {
  return (
    <div
      style={{
        minHeight: "100vh",
        background:
          "linear-gradient(180deg, #eef6ff 0%, #f8fbff 28%, #ffffff 58%, #f7f9fc 100%)",
      }}
    >
      <header
        style={{
          position: "sticky",
          top: 0,
          zIndex: 20,
          backdropFilter: "blur(14px)",
          background: "rgba(255,255,255,0.78)",
          borderBottom: "1px solid rgba(15, 23, 42, 0.06)",
        }}
      >
        <div
          className="page-container"
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 16,
            paddingTop: 16,
            paddingBottom: 16,
          }}
        >
          <Link
            to="/"
            style={{
              textDecoration: "none",
              color: "var(--text)",
              display: "flex",
              alignItems: "center",
              gap: 10,
              fontWeight: 800,
              fontSize: 18,
              letterSpacing: "-0.02em",
            }}
          >
            <div
              style={{
                width: 38,
                height: 38,
                borderRadius: 12,
                display: "grid",
                placeItems: "center",
                background: "linear-gradient(135deg, #2563eb, #7c3aed)",
                color: "#fff",
                boxShadow: "0 10px 24px rgba(37, 99, 235, 0.18)",
              }}
            >
              R
            </div>
            ReflectAI-Support-ChatBot-System
          </Link>

          <nav
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              flexWrap: "wrap",
            }}
          >
            <a href="#features" className="btn" style={{ textDecoration: "none" }}>
              Features
            </a>
            <a href="#how-it-works" className="btn" style={{ textDecoration: "none" }}>
              How it works
            </a>
            <Link to="/login" className="btn" style={{ textDecoration: "none" }}>
              Log in
            </Link>
            <Link
              to="/register"
              className="btn btn-primary"
              style={{ textDecoration: "none" }}
            >
              Get started
            </Link>
          </nav>
        </div>
      </header>

      <main>
        <section
          style={{
            paddingTop: 54,
            paddingBottom: 42,
          }}
        >
          <div
            className="page-container"
            style={{
              display: "grid",
              gridTemplateColumns: "1.1fr 0.9fr",
              gap: 28,
              alignItems: "center",
            }}
          >
            <div>
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
                Evidence-informed • Safety-aware • Privacy-first
              </div>

              <h1
                style={{
                  margin: 0,
                  fontSize: "clamp(42px, 7vw, 72px)",
                  lineHeight: 0.98,
                  letterSpacing: "-0.05em",
                  maxWidth: 760,
                  marginBottom: 18,
                }}
              >
                Calm, grounded support when you need a place to reflect.
              </h1>

              <p
                style={{
                  fontSize: 18,
                  lineHeight: 1.75,
                  color: "var(--text-soft)",
                  maxWidth: 700,
                  margin: 0,
                  marginBottom: 24,
                }}
              >
                ReflectAI is a mental health support chatbot built to provide
                knowledge-grounded answers, safety-aware responses, and a calm,
                modern experience for everyday emotional support.
              </p>

              <div
                style={{
                  display: "flex",
                  gap: 12,
                  flexWrap: "wrap",
                  marginBottom: 18,
                }}
              >
                <Link
                  to="/register"
                  className="btn btn-primary"
                  style={{
                    textDecoration: "none",
                    padding: "13px 18px",
                    fontSize: 15,
                  }}
                >
                  Start with ReflectAI
                </Link>

                <Link
                  to="/login"
                  className="btn"
                  style={{
                    textDecoration: "none",
                    padding: "13px 18px",
                    fontSize: 15,
                  }}
                >
                  Continue to your account
                </Link>
              </div>

              <div
                style={{
                  display: "flex",
                  flexWrap: "wrap",
                  gap: 10,
                  color: "var(--text-muted)",
                  fontSize: 13,
                }}
              >
                <span className="pill">RAG-powered answers</span>
                <span className="pill">Citations included</span>
                <span className="pill">Crisis-aware guardrails</span>
                <span className="pill">No raw chat storage</span>
              </div>
            </div>

            <div>
              <div
                className="card"
                style={{
                  padding: 18,
                  borderRadius: 28,
                  background:
                    "linear-gradient(180deg, rgba(255,255,255,0.94), rgba(255,255,255,0.88))",
                  boxShadow: "0 30px 80px rgba(15, 23, 42, 0.10)",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    gap: 8,
                    marginBottom: 14,
                  }}
                >
                  <span
                    style={{
                      width: 10,
                      height: 10,
                      borderRadius: 999,
                      background: "#fca5a5",
                    }}
                  />
                  <span
                    style={{
                      width: 10,
                      height: 10,
                      borderRadius: 999,
                      background: "#fcd34d",
                    }}
                  />
                  <span
                    style={{
                      width: 10,
                      height: 10,
                      borderRadius: 999,
                      background: "#86efac",
                    }}
                  />
                </div>

                <div
                  style={{
                    display: "grid",
                    gap: 12,
                  }}
                >
                  <div
                    style={{
                      alignSelf: "start",
                      maxWidth: "78%",
                      padding: "14px 16px",
                      borderRadius: 18,
                      background: "var(--surface-muted)",
                      border: "1px solid var(--border)",
                      lineHeight: 1.55,
                    }}
                  >
                    I’ve been feeling overwhelmed lately and I can’t seem to switch
                    off my thoughts.
                  </div>

                  <div
                    style={{
                      justifySelf: "end",
                      maxWidth: "82%",
                      padding: "14px 16px",
                      borderRadius: 18,
                      background: "linear-gradient(135deg, #1d4ed8, #2563eb)",
                      color: "#fff",
                      lineHeight: 1.6,
                      boxShadow: "0 18px 30px rgba(37, 99, 235, 0.18)",
                    }}
                  >
                    You’re not alone in that feeling. We can slow it down together.
                    Try a simple grounding step: name 5 things you can see, 4 you
                    can feel, and 3 you can hear. I can also share evidence-based
                    coping ideas and relevant support resources.
                  </div>

                  <div
                    style={{
                      display: "flex",
                      gap: 10,
                      flexWrap: "wrap",
                      marginTop: 6,
                    }}
                  >
                    <HeroStat value="Private" label="No raw chat storage" />
                    <HeroStat value="Grounded" label="Answers with sources" />
                    <HeroStat value="Safer" label="Crisis-aware responses" />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section id="features" style={{ paddingTop: 28, paddingBottom: 38 }}>
          <div className="page-container">
            <SectionHeading
              eyebrow="Why ReflectAI"
              title="Support that feels modern, structured, and calm."
              subtitle="Designed for clarity and trust, ReflectAI combines a polished chat experience with safer AI behavior, grounded retrieval, and transparent citations."
              center
            />

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
                gap: 16,
              }}
            >
              <FeatureCard
                icon="🧠"
                title="Grounded answers"
                text="Responses are informed by a knowledge base and presented with citations, helping users understand where guidance comes from."
              />
              <FeatureCard
                icon="🛡️"
                title="Safety-aware by design"
                text="Crisis detection, emergency guidance, and refusal patterns help reduce harmful or overconfident responses."
              />
              <FeatureCard
                icon="🔒"
                title="Privacy-first system"
                text="ReflectAI is designed around minimal data retention, storing metrics and feedback instead of raw chat history on the server."
              />
              <FeatureCard
                icon="📈"
                title="Transparent operations"
                text="Built-in admin metrics and feedback workflows help monitor performance, fallback use, and user response quality."
              />
            </div>
          </div>
        </section>

        <section id="how-it-works" style={{ paddingTop: 24, paddingBottom: 42 }}>
          <div className="page-container">
            <SectionHeading
              eyebrow="How it works"
              title="A simple support journey from question to grounded response."
              subtitle="The experience is intentionally easy to understand: ask, retrieve, respond, and protect."
            />

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
                gap: 16,
              }}
            >
              <StepCard
                number="01"
                title="Ask naturally"
                text="Users can speak in everyday language about stress, emotions, coping, or support questions."
              />
              <StepCard
                number="02"
                title="Retrieve trusted context"
                text="ReflectAI searches its knowledge base to gather the most relevant supporting material before answering."
              />
              <StepCard
                number="03"
                title="Respond with guardrails"
                text="The system generates a supportive answer, includes citations, and applies safety checks before returning it."
              />
            </div>
          </div>
        </section>

        <section style={{ paddingTop: 10, paddingBottom: 42 }}>
          <div className="page-container">
            <div
              className="card"
              style={{
                padding: 28,
                borderRadius: 28,
                background:
                  "linear-gradient(135deg, rgba(37, 99, 235, 0.08), rgba(124, 58, 237, 0.08))",
              }}
            >
              <SectionHeading
                eyebrow="Important"
                title="ReflectAI is for support, not emergency or diagnostic care."
                subtitle="If someone is in immediate danger, they should contact emergency services right away. ReflectAI is designed to support, guide, and signpost — not replace professional crisis intervention."
              />

              <div
                style={{
                  display: "flex",
                  gap: 12,
                  flexWrap: "wrap",
                }}
              >
                <Link
                  to="/register"
                  className="btn btn-primary"
                  style={{ textDecoration: "none" }}
                >
                  Create account
                </Link>
                <Link
                  to="/login"
                  className="btn"
                  style={{ textDecoration: "none" }}
                >
                  Log in
                </Link>
              </div>
            </div>
          </div>
        </section>
      </main>

      <footer
        style={{
          borderTop: "1px solid var(--border)",
          background: "rgba(255,255,255,0.7)",
        }}
      >
        <div
          className="page-container"
          style={{
            display: "flex",
            justifyContent: "space-between",
            gap: 16,
            flexWrap: "wrap",
            paddingTop: 18,
            paddingBottom: 18,
            color: "var(--text-muted)",
            fontSize: 13,
          }}
        >
          <span>© ReflectAI Support Chatbot System</span>
          <span>Calm design • Safer AI • Knowledge-grounded support</span>
        </div>
      </footer>
    </div>
  );
}