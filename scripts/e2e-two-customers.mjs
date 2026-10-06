const customerBase = process.env.EXPO_PUBLIC_NOD_CUSTOMER_API_BASE_URL;
const customerKey = process.env.EXPO_PUBLIC_NOD_CUSTOMER_API_KEY;
const providerBase = process.env.EXPO_PUBLIC_API_BASE_URL;
const providerKey = process.env.EXPO_PUBLIC_NOD_PROVIDER_API_KEY;
const adminBase = process.env.EXPO_PUBLIC_NOD_ADMIN_API_BASE_URL;
const adminKey = process.env.EXPO_PUBLIC_NOD_ADMIN_API_KEY;
if (![customerBase, customerKey, providerBase, providerKey, adminBase, adminKey].every(Boolean)) throw new Error("Missing API configuration");

const stamp = Date.now();
const password = `NodQa${String(stamp).slice(-6)}x9`;
const results = [];
const tinyPng = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=";

async function call(base, key, method, path, body, token) {
  const response = await fetch(`${base}${path}`, {
    method,
    headers: { "Content-Type": "application/json", "x-api-key": key, ...(token ? { Authorization: `Bearer ${token}` } : {}) },
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

function observe(name, result, expected = [200, 201]) {
  const passed = expected.includes(result.response.status);
  results.push({ name, passed, status: result.response.status, error: passed ? null : result.data?.message ?? result.data?.error ?? result.data });
  return passed ? result.data : null;
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

async function createProfile(label, offset, pet) {
  const rutNumber = 50000000 + Number(String(stamp + offset).slice(-7));
  const email = `nod.qa+${stamp}-${label}@example.com`;
  record(`register ${label}`, await call(customerBase, customerKey, "POST", "/customers", {
    first_name: "NOD", last_name: `QA ${label}`, email, password, phone: `+569${String(rutNumber).slice(-8)}`,
    rut: rutFor(rutNumber), address: "Av. Providencia 1234", comuna: "Providencia", city: "Santiago"
  }));
  const session = record(`login ${label}`, await call(customerBase, customerKey, "POST", "/login", { email, password }));
  const token = session.access_token;
  const customerId = session.customer?.id ?? session.user?.id;
  const petResponse = record(`create pet ${label}`, await call(customerBase, customerKey, "POST", "/pets", {
    name: pet.name, species: "dog", breed: pet.breed, size: "mediano", age_years: pet.age, notes: "Perfil QA E2E"
  }, token));
  const petRecord = petResponse.pet ?? petResponse.data ?? petResponse;
  record(`social profile ${label}`, await call(customerBase, customerKey, "PUT", `/pets/${petRecord.id}/social-profile`, {
    display_name: pet.name, bio: pet.bio, species: "dog", breed: pet.breed, sex: pet.sex,
    birth_date: pet.birthDate, size: "medium", energy_level: "medium", temperament_tags: ["sociable", "juguetona"],
    looking_for: ["playdate", "walk"], vaccinated: true, sterilized: true, latitude: -33.4289,
    longitude: -70.6090, comuna: "Providencia", discovery_enabled: true
  }, token));
  return { email, token, customerId, petId: petRecord.id };
}

const first = await createProfile("luna", 0, { name: "Luna QA", breed: "Mestiza", age: 3, sex: "female", birthDate: "2023-01-15", bio: "Sociable y tranquila" });
const second = await createProfile("bruno", 17, { name: "Bruno QA", breed: "Labrador", age: 4, sex: "male", birthDate: "2022-02-20", bio: "Le encantan los paseos" });

const candidates = record("dating candidates", await call(customerBase, customerKey, "GET", `/discovery/candidates?pet_id=${first.petId}&limit=50`, undefined, first.token));
const candidateItems = candidates.items ?? candidates.candidates ?? [];
results.push({ name: "second pet is candidate", passed: candidateItems.some((item) => (item.pet_id ?? item.id) === second.petId), status: 200, error: null });

record("first like", await call(customerBase, customerKey, "POST", "/discovery/swipes", { actor_pet_id: first.petId, target_pet_id: second.petId, decision: "like" }, first.token));
const mutual = record("mutual like", await call(customerBase, customerKey, "POST", "/discovery/swipes", { actor_pet_id: second.petId, target_pet_id: first.petId, decision: "like" }, second.token));
const matchId = mutual.match?.id;
if (!mutual.matched || !matchId) throw new Error("Mutual match was not created");
record("match message send", await call(customerBase, customerKey, "POST", `/matches/${matchId}/messages`, { text: "Hola desde E2E NOD" }, first.token));
const messages = record("match message receive", await call(customerBase, customerKey, "GET", `/matches/${matchId}/messages?limit=20`, undefined, second.token));
results.push({ name: "match message delivered", passed: (messages.items ?? messages.messages ?? []).length > 0, status: 200, error: null });

const postPayload = record("community post", await call(customerBase, customerKey, "POST", "/posts", { caption: `E2E NOD ${stamp}`, media_base64: tinyPng, pet_id: first.petId, pet_type: "dog", location: "Providencia" }, first.token));
const postId = (postPayload.post ?? postPayload).id;
record("community like", await call(customerBase, customerKey, "POST", `/posts/${postId}/like`, {}, second.token));
record("community comment", await call(customerBase, customerKey, "POST", `/posts/${postId}/comments`, { content: "Comentario E2E", pet_id: second.petId }, second.token));

let housingBookingId = null;
const housingSearch = record("housing search", await call(providerBase, providerKey, "GET", "/search-hosting?comuna=Providencia&pets=1&page=1&page_size=50"));
const host = (housingSearch.items ?? housingSearch.hosts ?? [])[0];
if (host?.id) {
  record("housing detail", await call(providerBase, providerKey, "GET", `/get-hosting-host?id=${host.id}`));
  const checkIn = new Date(Date.now() + 20 * 86400000).toISOString().slice(0, 10);
  const checkOut = new Date(Date.now() + 22 * 86400000).toISOString().slice(0, 10);
  const nights = 2;
  const housing = observe("housing booking with customer JWT", await call(providerBase, providerKey, "POST", "/create-booking-request", {
    provider_id: host.provider_id,
    customer_id: first.customerId,
    service_id: "90e09214-ffeb-4a57-8ba7-e317c2be6d4e",
    price: Number(host.nightly_rate ?? 0) * nights,
    currency: host.currency ?? "CLP",
    starts_at: new Date(`${checkIn}T14:00:00`).toISOString(),
    ends_at: new Date(`${checkOut}T12:00:00`).toISOString(),
    payment_status: "unpaid",
    notes: `Reserva QA E2E; hosting_profile_id=${host.id}; pet_ids=${first.petId}`
  }, first.token));
  housingBookingId = (housing?.booking ?? housing)?.id ?? null;
  const listed = record("housing booking list", await call(providerBase, providerKey, "GET", `/get-customer-bookings?customer_id=${first.customerId}`));
  const listedBookings = Array.isArray(listed) ? listed : listed.bookings ?? listed.data ?? [];
  results.push({ name: "housing booking visible", passed: Boolean(housingBookingId && listedBookings.some((item) => (item.id ?? item.booking_id) === housingBookingId)), status: housingBookingId ? 200 : 401, error: housingBookingId ? null : "Booking was not created because Provider rejected the Customer JWT" });
  if (housingBookingId) record("housing booking cancel", await call(providerBase, providerKey, "POST", "/cancel-booking", { booking_id: housingBookingId, reason: "Limpieza E2E" }, first.token));
} else {
  results.push({ name: "housing inventory available", passed: false, status: 404, error: "Provider returned no active host inventory" });
}

let serviceBookingId = null;
const catalogResponse = record("service catalog", await call(adminBase, adminKey, "GET", "/get-families-with-services"));
const services = (catalogResponse.families ?? []).flatMap((family) => family.services ?? []);
let provider = null;
let serviceId = null;
for (const service of services) {
  const providersResponse = await call(customerBase, customerKey, "GET", `/providers?service_id=${encodeURIComponent(service.id)}`, undefined, first.token);
  if (!providersResponse.response.ok) continue;
  const candidate = (providersResponse.data.providers ?? [])[0];
  if (candidate?.id) { provider = candidate; serviceId = service.id; break; }
}
results.push({ name: "provider catalog", passed: Boolean(provider), status: provider ? 200 : 404, error: provider ? null : "No provider found for catalog services" });
if (provider?.id && serviceId) {
  const startsAt = new Date(Date.now() + 10 * 86400000).toISOString();
  const endsAt = new Date(Date.now() + 10 * 86400000 + 3600000).toISOString();
  const bookingPayload = record("service booking", await call(customerBase, customerKey, "POST", "/bookings", { provider_id: provider.id, pet_id: first.petId, service_id: serviceId, starts_at: startsAt, ends_at: endsAt, address: "Av. Providencia 1234", comuna: "Providencia", city: "Santiago" }, first.token));
  serviceBookingId = (bookingPayload.booking ?? bookingPayload.reservation ?? bookingPayload).id;
  if (serviceBookingId) {
    observe("booking chat open", await call(providerBase, providerKey, "POST", "/get-or-create-booking-chat", { booking_id: serviceBookingId }, first.token));
    observe("booking chat send", await call(providerBase, providerKey, "POST", "/send-chat-message", { booking_id: serviceBookingId, text: "Mensaje E2E de cliente" }, first.token));
    observe("booking chat list", await call(providerBase, providerKey, "GET", `/get-chat-messages?booking_id=${serviceBookingId}`, undefined, first.token));
    record("service booking cancel", await call(customerBase, customerKey, "POST", `/bookings/${serviceBookingId}/cancel`, { reason: "Limpieza E2E" }, first.token), [200, 201, 204]);
  }
} else {
  results.push({ name: "bookable provider available", passed: false, status: 404, error: "Provider catalog did not expose a service_id" });
}

console.log(JSON.stringify({
  summary: { passed: results.filter((item) => item.passed).length, total: results.length },
  created: { customers: [first.email, second.email], pets: [first.petId, second.petId], matchId, postId, housingBookingId, serviceBookingId },
  results
}, null, 2));
if (results.some((item) => !item.passed)) process.exitCode = 1;
