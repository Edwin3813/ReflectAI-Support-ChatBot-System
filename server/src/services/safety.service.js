// server/src/services/safety.service.js

function normalize(text = "") {
  return String(text).toLowerCase();
}

function includesAny(text, terms) {
  return terms.some((t) => text.includes(t));
}

// --- Standard UX footer (disclaimer) ---
function standardDisclaimerFooter() {
  return [
    "",
    "---",
    "ReflectAI provides supportive information, not medical diagnosis or treatment.",
    "If symptoms persist or worsen, consider contacting a GP/clinician or local health services.",
  ].join("\n");
}

// ---------- Crisis + escalation (high priority) ----------
const CRISIS_TERMS = [
  "suicide",
  "kill myself",
  "end my life",
  "self harm",
  "self-harm",
  "harm myself",
  "hurt myself",
  "want to die",
  "die tonight",
  "overdose",
  "cut myself",
  "cutting",
  "take my life",
  "i don't want to live",
];

const EMERGENCY_TERMS = [
  "right now",
  "tonight",
  "immediately",
  "can't keep myself safe",
  "cant keep myself safe",
  "plan to",
  "i have a plan",
  "i'm going to",
  "im going to",
  "i will do it",
];

function crisisResponse(isUrgent) {
  const urgentLine = isUrgent
    ? "**If you feel you might act on these thoughts or you’re in immediate danger, call 999 (UK) now or go to A&E.**"
    : "If you feel at risk of harming yourself, please reach out for urgent support.";

  return [
    "I’m really sorry you’re feeling this way. You don’t have to face this alone.",
    urgentLine,
    "",
    "**UK & ROI support (24/7):**",
    "- **Samaritans:** call **116 123** (free) or email **jo@samaritans.org**",
    "- **NHS 111 (England):** call **111** for urgent advice (or local equivalent in Scotland/Wales/NI)",
    "- **Emergency:** call **999** (or **112**)",
    "",
    "If you’re outside the UK/ROI, contact your local emergency number or a local crisis line.",
    "",
    "If you can, please tell me: **are you safe right now?**",
    standardDisclaimerFooter(),
  ].join("\n");
}

// ---------- Refusals: instructions for harm (separate from crisis) ----------
const SELF_HARM_INSTRUCTION_TERMS = [
  "how to kill myself",
  "how do i kill myself",
  "best way to die",
  "ways to die",
  "suicide method",
  "suicide methods",
  "self harm method",
  "self-harm method",
  "how to self harm",
  "how to self-harm",
  "how to cut myself",
  "how to overdose",
];

const VIOLENCE_INSTRUCTION_TERMS = [
  "how to kill someone",
  "how do i kill someone",
  "how to hurt someone",
  "how do i hurt someone",
  "how to make a bomb",
  "how do i make a bomb",
];

function harmInstructionRefusalResponse() {
  return [
    "I can’t help with instructions for self-harm or harming others.",
    "",
    "If you’re feeling overwhelmed or at risk, you deserve support right now.",
    "",
    "**UK & ROI (24/7):** Samaritans **116 123** (free) or email **jo@samaritans.org**.",
    "**Emergency:** call **999** (or **112**) if you’re in immediate danger.",
    standardDisclaimerFooter(),
  ].join("\n");
}

// ---------- Medical / diagnosis refusal (soft) ----------
const DIAGNOSIS_TERMS = [
  "diagnose me",
  "what do i have",
  "do i have",
  "am i bipolar",
  "am i depressed",
  "am i autistic",
  "am i adhd",
  "diagnosis",
];

const MEDICAL_ADVICE_TERMS = [
  "what medication",
  "dose",
  "dosage",
  "prescribe",
  "should i take",
  "side effects",
  "mix with alcohol",
  "stop taking",
];

function medicalRefusalResponse() {
  return [
    "I can’t diagnose conditions or give personalised medical advice, but I can still help.",
    "",
    "If you share what you’re experiencing (symptoms, how long it’s been going on, and what’s making it worse/better), I can:",
    "- suggest general coping strategies",
    "- help you prepare questions for a GP/therapist",
    "- point you to reliable resources",
    standardDisclaimerFooter(),
  ].join("\n");
}

// ---------- Prompt injection signals (log-only for now) ----------
const INJECTION_TERMS = [
  "ignore the rules",
  "ignore all rules",
  "ignore instructions",
  "reveal the system prompt",
  "show the system prompt",
  "hidden instructions",
  "act as",
];

function assessInput(message) {
  const text = normalize(message);

  // 1) Crisis escalation (highest priority)
  const crisis = includesAny(text, CRISIS_TERMS);
  if (crisis) {
    const urgent = includesAny(text, EMERGENCY_TERMS);

    return {
      action: "CRISIS",
      flags: {
        crisis: true,
        suicidal: true,
        self_harm: true,
        urgent_help: urgent,
        refusal: false,
        injection: false,
      },
      safeAnswer: crisisResponse(urgent),
    };
  }

  // 2) Refuse harm instructions
  const harmInstructions =
    includesAny(text, SELF_HARM_INSTRUCTION_TERMS) ||
    includesAny(text, VIOLENCE_INSTRUCTION_TERMS);

  if (harmInstructions) {
    return {
      action: "BLOCK",
      flags: {
        crisis: false,
        suicidal: false,
        self_harm: false,
        urgent_help: false,
        refusal: true,
        injection: false,
      },
      safeAnswer: harmInstructionRefusalResponse(),
    };
  }

  // 3) Refuse medical diagnosis/advice (soft refusal)
  const wantsDiagnosis = includesAny(text, DIAGNOSIS_TERMS);
  const wantsMedicalAdvice = includesAny(text, MEDICAL_ADVICE_TERMS);

  if (wantsDiagnosis || wantsMedicalAdvice) {
    return {
      action: "REFUSE_MEDICAL",
      flags: {
        crisis: false,
        suicidal: false,
        self_harm: false,
        urgent_help: false,
        refusal: true,
        injection: false,
      },
      safeAnswer: medicalRefusalResponse(),
    };
  }

  // 4) Injection (do not block; just flag for logging/metrics)
  const injection = includesAny(text, INJECTION_TERMS);

  return {
    action: "ALLOW",
    flags: {
      crisis: false,
      suicidal: false,
      self_harm: false,
      urgent_help: false,
      refusal: false,
      injection,
    },
    safeAnswer: null,
  };
}

module.exports = { assessInput };