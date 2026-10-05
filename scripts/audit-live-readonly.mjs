const providerBase = process.env.EXPO_PUBLIC_API_BASE_URL;
const providerKey = process.env.EXPO_PUBLIC_NOD_PROVIDER_API_KEY;
const customerBase = process.env.EXPO_PUBLIC_NOD_CUSTOMER_API_BASE_URL;
const customerKey = process.env.EXPO_PUBLIC_NOD_CUSTOMER_API_KEY;
const customerId = process.env.NOD_TEST_CUSTOMER_ID ?? "1af4a544-76a5-417a-b51e-eef757dde641";

async function call(base, key, path, method = "GET") {
  const response = await fetch(`${base}${path}`, { method, headers: { "x-api-key": key, "Content-Type": "application/json" }, signal: AbortSignal.timeout(20000) });
  const text = await response.text();
  let data;
  try { data = text ? JSON.parse(text) : null; } catch { data = text; }
  return { status: response.status, data };
}

const listed = await call(providerBase, providerKey, `/get-customer-bookings?customer_id=${customerId}`);
const bookings = Array.isArray(listed.data) ? listed.data : listed.data?.bookings ?? listed.data?.data ?? [];
const booking = bookings.find((item) => item.provider_id && (item.id || item.booking_id || item.reservation_id));
const bookingId = booking?.id ?? booking?.booking_id ?? booking?.reservation_id;
const providerId = booking?.provider_id;
const serviceId = booking?.service_id ?? booking?.product_id;

const checks = [];
if (providerId) {
  for (const [name, path] of [
    ["dashboard", `/get-provider-dashboard?provider_id=${providerId}`],
    ["balance", `/get-provider-balance?provider_id=${providerId}`],
    ["performance", `/get-provider-performance?provider_id=${providerId}`],
    ["wallet transactions", `/get-wallet-transactions?provider_id=${providerId}`],
    ["bank accounts", `/get-provider-bank-accounts?provider_id=${providerId}`],
    ["documents", `/get-provider-documents?provider_id=${providerId}`],
    ["reviews", `/get-provider-reviews?provider_id=${providerId}`],
    ["review summary", `/get-provider-review-summary?provider_id=${providerId}`],
    ["availability", `/get-provider-availability?provider_id=${providerId}`]
  ]) checks.push([name, await call(providerBase, providerKey, path)]);
}
if (bookingId) {
  for (const [name, base, key, path] of [
    ["customer route", customerBase, customerKey, `/bookings/${bookingId}/route`],
    ["customer photos", customerBase, customerKey, `/bookings/${bookingId}/photos`],
    ["provider route", providerBase, providerKey, `/get-service-route?booking_id=${bookingId}`],
    ["provider photos", providerBase, providerKey, `/get-service-photos?booking_id=${bookingId}`],
    ["provider incidents", providerBase, providerKey, `/get-service-incidents?booking_id=${bookingId}`],
    ["provider summary", providerBase, providerKey, `/get-service-summary?booking_id=${bookingId}`]
  ]) checks.push([name, await call(base, key, path)]);
}
if (serviceId) checks.push(["providers search", await call(customerBase, customerKey, `/providers?service_id=${serviceId}&comuna=Providencia`)]);

const output = checks.map(([name, result]) => ({
  name,
  status: result.status,
  code: result.data?.code ?? null,
  error: result.data?.error ?? null,
  message: result.data?.message ?? null,
  keys: result.data && typeof result.data === "object" ? Object.keys(result.data).slice(0, 8) : []
}));
console.log(JSON.stringify({ source: { bookings: bookings.length, hasBooking: Boolean(bookingId), hasProvider: Boolean(providerId), hasService: Boolean(serviceId) }, results: output }, null, 2));
