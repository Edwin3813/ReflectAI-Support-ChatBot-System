import { useEffect, useState } from "react";

export default function HealthCheck() {
  const [data, setData] = useState(null);
  const [err, setErr] = useState("");

  useEffect(() => {
    fetch("http://localhost:5000/health")
      .then((r) => r.json())
      .then(setData)
      .catch((e) => setErr(String(e)));
  }, []);

  if (err) return <div>❌ Error: {err}</div>;
  if (!data) return <div>Loading health…</div>;

  return (
    <div style={{ fontFamily: "sans-serif", padding: 16 }}>
      <h2>Backend Health</h2>
      <pre>{JSON.stringify(data, null, 2)}</pre>
    </div>
  );
}
