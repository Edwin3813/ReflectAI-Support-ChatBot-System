const fs = require("fs");
const path = require("path");

const API_BASE = "http://localhost:5000";
const LOGIN_EMAIL = "dockeruser@example.com";
const LOGIN_PASSWORD = "Pass1234!";

async function login() {
  const res = await fetch(`${API_BASE}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      email: LOGIN_EMAIL,
      password: LOGIN_PASSWORD,
    }),
  });

  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Login failed");
  return data.token;
}

async function askQuestion(token, message) {
  const start = Date.now();

  const res = await fetch(`${API_BASE}/chat`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ message }),
  });

  const latency = Date.now() - start;
  const data = await res.json();

  return {
    ok: res.ok,
    latency,
    data,
  };
}

function checkCase(testCase, result) {
  const answer = String(result.data?.answer || "");
  const blocked = Boolean(result.data?.meta?.blocked);

  const containsOk = (testCase.expected_contains || []).every((term) =>
    answer.toLowerCase().includes(term.toLowerCase())
  );

  const blockedOk = blocked === testCase.expected_blocked;

  return {
    pass: containsOk && blockedOk,
    containsOk,
    blockedOk,
    blocked,
    answer,
  };
}

async function main() {
  const filePath = path.join(__dirname, "eval_cases.json");
  const cases = JSON.parse(fs.readFileSync(filePath, "utf-8"));

  const token = await login();

  let passed = 0;
  const results = [];

  for (const testCase of cases) {
    const result = await askQuestion(token, testCase.question);
    const check = checkCase(testCase, result);

    if (check.pass) passed++;

    results.push({
      id: testCase.id,
      type: testCase.type,
      question: testCase.question,
      pass: check.pass,
      latency_ms: result.latency,
      blocked: check.blocked,
      containsOk: check.containsOk,
      blockedOk: check.blockedOk,
      answer: check.answer,
    });
  }

  console.log("\n=== EVALUATION RESULTS ===");
  console.table(
    results.map((r) => ({
      id: r.id,
      type: r.type,
      pass: r.pass,
      latency_ms: r.latency_ms,
      blocked: r.blocked,
    }))
  );

  console.log(`\nPassed ${passed}/${cases.length} tests`);
}

main().catch((err) => {
  console.error("Evaluation failed:", err.message);
  process.exit(1);
});