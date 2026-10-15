const base = process.env.EXPO_PUBLIC_API_BASE_URL;
const apiKey = process.env.EXPO_PUBLIC_NOD_PROVIDER_API_KEY;

if (!base || !apiKey) throw new Error("Missing Provider API configuration");

const stamp = Date.now();
const email = `nod.provider.qa+${stamp}@example.com`;
const password = `NodProvider${String(stamp).slice(-6)}x9`;
const rutNumber = 46000000 + Number(String(stamp).slice(-6));
const results = [];

function rutFor(number) {
  let sum = 0;
  let multiplier = 2;
  for (const digit of String(number).split("").reverse()) {
    sum += Number(digit) * multiplier;
    multiplier = multiplier === 7 ? 2 : multiplier + 1;
  }
  const value = 11 - (sum % 11);
  return `${number}-${value === 11 ? "0" : value === 10 ? "K" : value}`;
}

async function call(method, path, body, token) {
  const response = await fetch(`${base}${path}`, {
    method,
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
      ...(token ? { Authorization: `Bearer ${token}` } : {})
    },
    body: body === undefined ? undefined : JSON.stringify(body),
    signal: AbortSignal.timeout(30000)
  });
  const text = await response.text();
  let data;
  try { data = text ? JSON.parse(text) : null; } catch { data = { text: text.slice(0, 300) }; }
  return { response, data };
}

function check(name, result, expected = [200, 201]) {
  const passed = expected.includes(result.response.status);
  results.push({ name, passed, status: result.response.status, error: passed ? null : result.data?.error ?? result.data?.message ?? result.data });
  if (!passed) throw new Error(`${name}: HTTP ${result.response.status} ${JSON.stringify(result.data)}`);
  return result.data;
}

try {
  const registration = check("register provider", await call("POST", "/register-provider", {
    rut: rutFor(rutNumber),
    first_name: "NOD",
    last_name: "Provider QA",
    email,
    password,
    phone: `+569${String(rutNumber).slice(-8)}`,
    legal_entity_type: "natural"
  }));
  const login = check("login provider", await call("POST", "/login", { email, password }));
  const token = login.access_token;
  const providerId = login.provider?.id ?? registration.provider?.id;
  if (!token || !providerId) throw new Error("Provider session did not include token and provider id");

  const steps = check("load onboarding steps", await call("GET", "/get-onboarding-steps", undefined, token));
  results.push({ name: "onboarding has active steps", passed: Array.isArray(steps.steps) && steps.steps.length > 0, status: 200, error: null });
  if (!Array.isArray(steps.steps) || steps.steps.length === 0) throw new Error("Provider onboarding returned no steps");

  const progressPath = `/get-provider-onboarding?provider_id=${encodeURIComponent(providerId)}`;
  const rejectionPath = `/get-provider-rejections?provider_id=${encodeURIComponent(providerId)}`;
  check("load provider onboarding", await call("GET", progressPath, undefined, token));
  check("load provider rejections", await call("GET", rejectionPath, undefined, token));

  check("save service category", await call("POST", "/submit-provider-onboarding", {
    provider_id: providerId,
    step_key: "category",
    answers: { service_category: ["dog_walker"] },
    status: "completed",
    submit_for_review: false
  }, token));
  check("save dog walker details", await call("POST", "/submit-provider-onboarding", {
    provider_id: providerId,
    step_key: "cat_dog_walker",
    answers: {
      dog_walker_group_size: "3",
      dog_walker_sizes: ["small", "medium", "large"],
      dog_walker_zones: ["Providencia"]
    },
    status: "completed",
    submit_for_review: false
  }, token));

  const progress = check("reload provider onboarding", await call("GET", progressPath, undefined, token));
  const completedKeys = (progress.steps ?? []).filter((step) => step.status === "completed").map((step) => step.key);
  const persisted = completedKeys.includes("category") && completedKeys.includes("cat_dog_walker");
  results.push({ name: "onboarding answers persist", passed: persisted, status: persisted ? 200 : 409, error: persisted ? null : completedKeys });
  if (!persisted) throw new Error("Saved onboarding steps were not returned as completed");

  console.log(JSON.stringify({ summary: { passed: results.filter((item) => item.passed).length, total: results.length }, created: { email, providerId }, results }, null, 2));
} catch (error) {
  console.log(JSON.stringify({ summary: { passed: results.filter((item) => item.passed).length, total: results.length }, created: { email }, results, fatal: error instanceof Error ? error.message : String(error) }, null, 2));
  process.exitCode = 1;
}
