const customerBase = process.env.EXPO_PUBLIC_NOD_CUSTOMER_API_BASE_URL;
const customerKey = process.env.EXPO_PUBLIC_NOD_CUSTOMER_API_KEY;
const providerBase = process.env.EXPO_PUBLIC_API_BASE_URL;
const providerKey = process.env.EXPO_PUBLIC_NOD_PROVIDER_API_KEY;
const providerProjectUrl = process.env.NOD_E2E_PROVIDER_PROJECT_URL;
const providerAnonKey = process.env.NOD_E2E_PROVIDER_ANON_KEY;
const providerEmail = process.env.NOD_E2E_PROVIDER_EMAIL;
const providerPassword = process.env.NOD_E2E_PASSWORD;
const testEmailBase = process.env.NOD_E2E_TEST_EMAIL_BASE;

if (![customerBase, customerKey, providerBase, providerKey, providerProjectUrl, providerAnonKey, providerEmail, providerPassword, testEmailBase].every(Boolean)) {
  throw new Error("Missing residential/dating E2E configuration");
}

const stamp = Date.now();
const password = `NodQa${String(stamp).slice(-6)}a`;
const results = [];

async function call(base, key, method, path, body, token) {
  const response = await fetch(`${base}${path}`, {
    method,
    headers: { "Content-Type": "application/json", "x-api-key": key, ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    body: body === undefined ? undefined : JSON.stringify(body),
    signal: AbortSignal.timeout(30000)
  });
  const text = await response.text();
  let data;
  try { data = text ? JSON.parse(text) : null; } catch { data = { text }; }
  return { response, data };
}

function check(name, result, expected = [200, 201]) {
  const passed = expected.includes(result.response.status);
  results.push({ name, passed, status: result.response.status, error: passed ? null : result.data?.error ?? result.data?.message ?? result.data });
  if (!passed) throw new Error(`${name}: HTTP ${result.response.status}`);
  return result.data;
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

function qaEmail(label) {
  const [local, domain] = testEmailBase.split("@");
  return `${local}+nodqa-${stamp}-${label}@${domain}`;
}

async function createCustomer(label, rutNumber, pet) {
  const email = qaEmail(label);
  const registration = await call(customerBase, customerKey, "POST", "/customers", {
    first_name: "NOD",
    last_name: `QA ${label}`,
    email,
    password,
    phone: `+569${String(rutNumber).slice(-8)}`,
    rut: rutFor(rutNumber),
    address: "Av. Providencia 1234",
    comuna: "Providencia",
    city: "Santiago"
  });
  const registered = check(`register customer ${label}`, registration);
  const customerId = registered.customer?.id ?? registered.data?.id ?? registered.id ?? registered.user_id;
  const login = check(`login customer ${label}`, await call(customerBase, customerKey, "POST", "/login", { email, password }));
  const token = login.access_token ?? login.session?.access_token;
  const sessionCustomerId = login.customer?.id ?? login.user?.id ?? customerId;
  const createdPet = check(`create pet ${label}`, await call(customerBase, customerKey, "POST", "/pets", {
    customer_id: sessionCustomerId,
    name: pet.name,
    species: "dog",
    breed: pet.breed,
    size: pet.petSize,
    age_years: pet.age,
    notes: "Cuenta técnica E2E NOD"
  }, token));
  const petRecord = createdPet.pet ?? createdPet.data ?? createdPet;
  const profile = check(`publish social profile ${label}`, await call(customerBase, customerKey, "PUT", `/pets/${petRecord.id}/social-profile`, {
    customer_id: sessionCustomerId,
    display_name: pet.name,
    bio: pet.bio,
    species: "dog",
    breed: pet.breed,
    sex: pet.sex,
    birth_date: pet.birthDate,
    size: pet.socialSize,
    energy_level: "medium",
    temperament_tags: ["sociable", "juguetona"],
    looking_for: ["playdate", "walk"],
    vaccinated: true,
    sterilized: true,
    latitude: -33.4289,
    longitude: -70.6090,
    comuna: "Providencia",
    discovery_enabled: true
  }, token));
  return { email, password, customerId: sessionCustomerId, token, petId: petRecord.id, profile };
}

const providerLogin = check("login hosting provider", await call(providerBase, providerKey, "POST", "/login", { email: providerEmail, password: providerPassword }));
const providerToken = providerLogin.access_token ?? providerLogin.session?.access_token;
const providerId = providerLogin.provider?.id ?? providerLogin.user?.id;

const restResponse = await fetch(`${providerProjectUrl}/rest/v1/hosting_profiles?on_conflict=provider_id`, {
  method: "POST",
  headers: {
    apikey: providerAnonKey,
    Authorization: `Bearer ${providerToken}`,
    "Content-Type": "application/json",
    Prefer: "resolution=merge-duplicates,return=representation"
  },
  body: JSON.stringify({
    provider_id: providerId,
    host_name: "NOD Residencial QA",
    title: "Casa NOD con patio en Providencia",
    bio: "Perfil residencial publicado para pruebas integrales de NOD Mobile.",
    property_type: "Casa",
    has_yard: true,
    max_pets_capacity: 3,
    accepted_pet_types: ["Perros"],
    accepted_pet_sizes: ["Pequeño", "Mediano", "Grande"],
    nightly_rate: 25000,
    extra_pet_rate: 8000,
    pickup_service_rate: 5000,
    rules_and_amenities: { supervision_24_7: true, emergency_transport: true, amenities: ["Patio", "Camas"] },
    photos: [],
    address: "Av. Providencia 1234",
    comuna: "Providencia",
    is_active: true
  }),
  signal: AbortSignal.timeout(30000)
});
const restText = await restResponse.text();
let restData;
try { restData = restText ? JSON.parse(restText) : null; } catch { restData = { text: restText }; }
const published = check("publish hosting profile", { response: restResponse, data: restData });
const hostingId = (Array.isArray(published) ? published[0] : published)?.id;

const search = check("search published hosting", await call(providerBase, providerKey, "GET", "/search-hosting?comuna=Providencia&page=1&page_size=20"));
const hosts = search.items ?? [];
const foundHost = hosts.find((host) => host.id === hostingId || host.provider_id === providerId);
results.push({ name: "hosting appears in search", passed: Boolean(foundHost), status: foundHost ? 200 : 404, error: foundHost ? null : "Published host not returned" });
if (!foundHost) throw new Error("Published hosting profile not visible in search");
check("hosting detail", await call(providerBase, providerKey, "GET", `/get-hosting-host?id=${foundHost.id}`));

const first = await createCustomer("luna", 60000000 + Number(String(stamp).slice(-6)), {
  name: "Luna QA", breed: "Mestiza", petSize: "mediano", socialSize: "medium", age: 3, sex: "female", birthDate: "2023-01-15", bio: "Sociable y tranquila"
});
const second = await createCustomer("bruno", 70000000 + Number(String(stamp + 7).slice(-6)), {
  name: "Bruno QA", breed: "Labrador", petSize: "mediano", socialSize: "medium", age: 4, sex: "male", birthDate: "2022-02-20", bio: "Le encantan los paseos"
});

const feed = check("dating candidates", await call(customerBase, customerKey, "GET", `/discovery/candidates?pet_id=${first.petId}&customer_id=${first.customerId}&limit=30`, undefined, first.token));
const candidates = feed.items ?? feed.candidates ?? [];
results.push({ name: "second pet appears as candidate", passed: candidates.some((candidate) => candidate.pet_id === second.petId), status: 200, error: null });

check("first dating like", await call(customerBase, customerKey, "POST", "/discovery/swipes", {
  actor_pet_id: first.petId, customer_id: first.customerId, target_pet_id: second.petId, decision: "like"
}, first.token));
const mutual = check("mutual dating like", await call(customerBase, customerKey, "POST", "/discovery/swipes", {
  actor_pet_id: second.petId, customer_id: second.customerId, target_pet_id: first.petId, decision: "like"
}, second.token));
const match = mutual.match;
results.push({ name: "mutual match created", passed: Boolean(mutual.matched && match?.id), status: mutual.matched ? 200 : 409, error: mutual.matched ? null : "No mutual match" });
if (!match?.id) throw new Error("Mutual match was not created");
check("dating chat message", await call(customerBase, customerKey, "POST", `/matches/${match.id}/messages`, {
  customer_id: first.customerId, text: "Hola desde la prueba E2E NOD"
}, first.token));
const messages = check("dating chat list", await call(customerBase, customerKey, "GET", `/matches/${match.id}/messages?customer_id=${second.customerId}&limit=20`, undefined, second.token));
results.push({ name: "dating message delivered", passed: (messages.items ?? messages.messages ?? []).length > 0, status: 200, error: null });

console.log(JSON.stringify({
  summary: { passed: results.filter((item) => item.passed).length, total: results.length },
  created: { hostingId, providerId, customers: [first.email, second.email], pets: [first.petId, second.petId], matchId: match.id },
  results
}, null, 2));
if (results.some((item) => !item.passed)) process.exitCode = 1;
