const customerBase = process.env.EXPO_PUBLIC_NOD_CUSTOMER_API_BASE_URL;
const customerKey = process.env.EXPO_PUBLIC_NOD_CUSTOMER_API_KEY;
const providerBase = process.env.EXPO_PUBLIC_API_BASE_URL;
const providerKey = process.env.EXPO_PUBLIC_NOD_PROVIDER_API_KEY;
const customerEmail = process.env.NOD_E2E_CUSTOMER_EMAIL;
const customerPassword = process.env.NOD_E2E_CUSTOMER_PASSWORD;
const providerEmail = process.env.NOD_E2E_PROVIDER_EMAIL;
const providerPassword = process.env.NOD_E2E_PROVIDER_PASSWORD;
const hostingProfileId = process.env.NOD_E2E_HOSTING_PROFILE_ID;

if (![customerBase, customerKey, providerBase, providerKey, customerEmail, customerPassword, providerEmail, providerPassword, hostingProfileId].every(Boolean)) throw new Error("Falta configuración E2E");

const results = [];
async function call(base, key, method, path, body, token) {
  const response = await fetch(`${base}${path}`, { method, headers: { "Content-Type": "application/json", ...(key ? { "x-api-key": key } : {}), ...(token ? { Authorization: `Bearer ${token}` } : {}) }, body: body === undefined ? undefined : JSON.stringify(body), signal: AbortSignal.timeout(30000) });
  const text = await response.text(); let data;
  try { data = text ? JSON.parse(text) : null; } catch { data = { text }; }
  return { response, data };
}
function check(name, result, expected = [200, 201]) {
  const passed = expected.includes(result.response.status);
  results.push({ name, passed, status: result.response.status, error: passed ? null : result.data?.message ?? result.data?.error ?? result.data });
  if (!passed) throw new Error(`${name}: HTTP ${result.response.status} ${JSON.stringify(result.data)}`);
  return result.data;
}

const customerLogin = check("login cliente", await call(customerBase, customerKey, "POST", "/login", { email: customerEmail, password: customerPassword }));
const customerToken = customerLogin.access_token ?? customerLogin.session?.access_token;
const customerId = customerLogin.customer?.id ?? customerLogin.user?.id;
const petsPayload = check("listar mascotas", await call(customerBase, customerKey, "GET", `/pets?customer_id=${customerId}`, undefined, customerToken));
const pet = (petsPayload.pets ?? petsPayload.items ?? petsPayload.data ?? petsPayload)[0];
if (!pet?.id) throw new Error("La cuenta de prueba no tiene mascota");

const search = check("buscar residencial", await call(customerBase, null, "GET", "/hosting/search?comuna=Providencia&pets=1", undefined, customerToken));
const hosts = search.items ?? search.hosts ?? [];
if (!hosts.some((item) => item.id === hostingProfileId)) throw new Error("El residencial QA no aparece en búsqueda");
check("detalle residencial", await call(customerBase, null, "GET", `/hosting/hosts/${hostingProfileId}`, undefined, customerToken));

const start = new Date(Date.now() + 4 * 86400000).toISOString().slice(0, 10);
const end = new Date(Date.now() + 6 * 86400000).toISOString().slice(0, 10);
const createdPayload = check("crear reserva residencial", await call(customerBase, null, "POST", "/hosting/bookings", { hosting_profile_id: hostingProfileId, customer_id: customerId, check_in: start, check_out: end, pet_ids: [pet.id], pickup_required: false, special_instructions: "Prueba E2E NOD Mobile" }, customerToken));
const booking = createdPayload.booking ?? createdPayload;
check("listar mis estadías", await call(customerBase, null, "GET", "/hosting/bookings/my-bookings", undefined, customerToken));

const postPayload = check("publicar en comunidad", await call(customerBase, null, "POST", "/posts", { caption: `Prueba integral NOD ${Date.now()}`, pet_id: pet.id, pet_type: "dog", location: "Providencia" }, customerToken));
const post = postPayload.post ?? postPayload;
check("leer feed", await call(customerBase, null, "GET", `/feed?filter=for_you&user_id=${customerId}&pet_type=all&page=1&limit=30`, undefined, customerToken));
check("reaccionar publicación", await call(customerBase, null, "POST", `/posts/${post.id}/like`, {}, customerToken));
check("comentar publicación", await call(customerBase, null, "POST", `/posts/${post.id}/comments`, { content: "Comentario automático E2E", pet_id: pet.id }, customerToken));

const providerLogin = check("login proveedor", await call(providerBase, providerKey, "POST", "/login", { email: providerEmail, password: providerPassword }));
const providerToken = providerLogin.access_token ?? providerLogin.session?.access_token;
const providerBookingList = await call(customerBase, null, "GET", "/hosting/bookings/my-bookings", undefined, providerToken);
results.push({ name: "proveedor lista estadías", passed: providerBookingList.response.ok, status: providerBookingList.response.status, error: providerBookingList.response.ok ? null : providerBookingList.data });
let completed = false;
if (providerBookingList.response.ok) {
  for (const status of ["CONFIRMED", "IN_PROGRESS", "COMPLETED"]) check(`residencial ${status}`, await call(customerBase, null, "PUT", `/hosting/bookings/${booking.id}/status`, { status }, providerToken));
  completed = true;
} else {
  check("cancelar reserva como cliente", await call(customerBase, null, "PUT", `/hosting/bookings/${booking.id}/status`, { status: "CANCELLED" }, customerToken));
}

console.log(JSON.stringify({ summary: { passed: results.filter((item) => item.passed).length, total: results.length }, created: { bookingId: booking.id, postId: post.id, completed }, results }, null, 2));
if (results.some((item) => !item.passed)) process.exitCode = 1;
