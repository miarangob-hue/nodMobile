const customerBase = process.env.EXPO_PUBLIC_NOD_CUSTOMER_API_BASE_URL;
const customerKey = process.env.EXPO_PUBLIC_NOD_CUSTOMER_API_KEY;
const homeBase = process.env.EXPO_PUBLIC_NOD_HOME_API_BASE_URL ?? "https://erssscbpzsosmvpusnru.supabase.co/functions/v1";
const providerBase = process.env.EXPO_PUBLIC_API_BASE_URL;

if (!customerBase || !customerKey || !providerBase) {
  throw new Error("Missing customer/provider API configuration");
}

const stamp = Date.now();
const password = `NodHomeQa${String(stamp).slice(-7)}x9`;
const email = `nod.home.qa+${stamp}@example.com`;
const results = [];

async function call(base, path, { method = "GET", body, token, headers = {}, key } = {}) {
  const response = await fetch(`${base}${path}`, {
    method,
    headers: {
      "Content-Type": "application/json",
      ...(key ? { "x-api-key": key } : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...headers
    },
    body: body === undefined ? undefined : JSON.stringify(body),
    signal: AbortSignal.timeout(30000)
  });
  const text = await response.text();
  let data;
  try { data = text ? JSON.parse(text) : null; } catch { data = { text: text.slice(0, 300) }; }
  return { response, data };
}

function record(name, result, expected = [200, 201]) {
  const passed = expected.includes(result.response.status);
  results.push({ name, passed, status: result.response.status, error: passed ? null : result.data?.message ?? result.data?.error ?? result.data });
  if (!passed) throw new Error(`${name}: HTTP ${result.response.status} ${JSON.stringify(result.data)}`);
  return result.data;
}

function unwrap(value) {
  return value?.data ?? value;
}

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

const rutNumber = 51000000 + Number(String(stamp).slice(-6));
const customer = record("register disposable customer", await call(customerBase, "/customers", {
  method: "POST",
  key: customerKey,
  body: {
    first_name: "NOD",
    last_name: "Home QA",
    email,
    password,
    phone: `+569${String(rutNumber).slice(-8)}`,
    rut: rutFor(rutNumber),
    address: "Av. Providencia 1234",
    comuna: "Providencia",
    city: "Santiago"
  }
}));

const session = record("login disposable customer", await call(customerBase, "/login", {
  method: "POST",
  key: customerKey,
  body: { email, password }
}));
const token = session.access_token;
if (!token) throw new Error("Customer login did not return access_token");

const catalogResponse = record("Home catalog", await call(homeBase, "/home-service-requests?resource=catalog", { token }));
const catalog = unwrap(catalogResponse);
if (!Array.isArray(catalog) || catalog.length < 2) throw new Error("Home catalog did not return at least two services");
results.push({ name: "Home catalog has dynamic services", passed: true, status: 200, count: catalog.length });

const selectedService = catalog[0];
const firstQuestion = selectedService.questions?.find((question) => question.type === "SINGLE_CHOICE" && question.required);
const answers = firstQuestion ? { [firstQuestion.key ?? firstQuestion.id]: firstQuestion.options?.[0]?.value ?? "OTHER" } : {};
const idempotencyKey = `e2e-home-${stamp}`;
const requestPayload = {
  serviceId: selectedService.id,
  title: `E2E Home ${selectedService.name}`,
  description: "Solicitud creada y cancelada automáticamente durante E2E.",
  address: "Av. Providencia 1234, unidad QA",
  commune: "Providencia",
  city: "Santiago",
  region: "Región Metropolitana",
  latitude: -33.4289,
  longitude: -70.609,
  answers,
  photos: [],
  urgency: "FLEXIBLE",
  preferredDates: [],
  preferredTimeWindows: [],
  currency: "CLP",
  publish: true
};

const createdResponse = record("create Home request", await call(homeBase, "/home-service-requests", {
  method: "POST",
  token,
  headers: { "Idempotency-Key": idempotencyKey },
  body: requestPayload
}));
const created = unwrap(createdResponse);
const requestId = created.id ?? created.request_id;
if (!requestId) throw new Error("Home create response did not return request id");

const replayRaw = await call(homeBase, "/home-service-requests", {
  method: "POST",
  token,
  headers: { "Idempotency-Key": idempotencyKey },
  body: requestPayload
});
const replayed = unwrap(record("replay Home request with same idempotency key", replayRaw));
results.push({ name: "idempotent Home create returns same request", passed: (replayed.id ?? replayed.request_id) === requestId, status: replayRaw.response.status, requestId });

const listedResponse = record("list Home requests", await call(homeBase, "/home-service-requests?page=1&limit=20", { token }));
const listed = unwrap(listedResponse);
const listItems = Array.isArray(listed) ? listed : listed.items ?? listed.requests ?? [];
results.push({ name: "created Home request appears in list", passed: listItems.some((item) => item.id === requestId), status: 200, requestId });

const detailResponse = record("get Home request detail", await call(homeBase, `/home-service-requests?id=${requestId}`, { token }));
const detail = unwrap(detailResponse);
results.push({ name: "Home detail keeps selected service", passed: detail.service_id === selectedService.id || detail.serviceId === selectedService.id, status: 200, requestId });

record("cancel Home request", await call(homeBase, `/home-service-requests?id=${requestId}&action=cancel`, {
  method: "POST",
  token,
  headers: { "Idempotency-Key": `e2e-home-cancel-${stamp}` },
  body: {}
}));

const providerGuard = await call(providerBase, "/provider-home-matches?page=1&limit=1&status=SENT", { key: process.env.EXPO_PUBLIC_NOD_PROVIDER_API_KEY });
results.push({
  name: "Provider Home endpoint requires JWT",
  passed: [401, 403].includes(providerGuard.response.status),
  status: providerGuard.response.status,
  error: [401, 403].includes(providerGuard.response.status) ? null : providerGuard.data?.message ?? providerGuard.data?.error
});

console.log(JSON.stringify({
  summary: { passed: results.filter((item) => item.passed).length, total: results.length },
  created: { email, requestId, serviceId: selectedService.id },
  results
}, null, 2));

if (results.some((item) => !item.passed)) process.exitCode = 1;
