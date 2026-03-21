import { Link, useLocation } from "react-router-dom";

function NavButton({ to, label, active }) {
  return (
    <Link
      to={to}
      className={`btn ${active ? "btn-primary" : ""}`}
      style={{ textDecoration: "none" }}
    >
      {label}
    </Link>
  );
}

export default function AppShell({ title, subtitle, right, children }) {
  const location = useLocation();

  const navItems = [
    { to: "/", label: "Home" },
    { to: "/chat", label: "Chat" },
    { to: "/admin/metrics", label: "Metrics" },
    { to: "/admin/feedback", label: "Feedback" },
  ];

  return (
    <div className="page-shell">
      <div className="page-container">
        <div
          className="card"
          style={{
            padding: 14,
            marginBottom: 18,
            display: "flex",
            justifyContent: "space-between",
            gap: 12,
            flexWrap: "wrap",
            alignItems: "center",
            background: "var(--surface-soft)",
            backdropFilter: "blur(12px)",
          }}
        >
          <Link
            to="/"
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 10,
              fontWeight: 800,
              fontSize: 16,
              textDecoration: "none",
              color: "var(--text)",
            }}
          >
            <div
              style={{
                width: 36,
                height: 36,
                borderRadius: 12,
                display: "grid",
                placeItems: "center",
                background: "linear-gradient(135deg, #2563eb, #7c3aed)",
                color: "#fff",
                boxShadow: "0 10px 22px rgba(37, 99, 235, 0.18)",
                flexShrink: 0,
              }}
            >
              R
            </div>
            <span>ReflectAI</span>
          </Link>

          <div
            style={{
              display: "flex",
              gap: 10,
              flexWrap: "wrap",
              alignItems: "center",
            }}
          >
            {navItems.map((item) => (
              <NavButton
                key={item.to}
                to={item.to}
                label={item.label}
                active={location.pathname === item.to}
              />
            ))}
          </div>
        </div>

        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-start",
            gap: 16,
            marginBottom: 20,
            flexWrap: "wrap",
          }}
        >
          <div>
            <h1 className="section-title">{title}</h1>
            {subtitle ? <p className="section-subtitle">{subtitle}</p> : null}
          </div>

          {right ? <div>{right}</div> : null}
        </div>

        {children}
      </div>
    </div>
  );
}