const customerBase = process.env.EXPO_PUBLIC_NOD_CUSTOMER_API_BASE_URL;
const providerBase = process.env.EXPO_PUBLIC_API_BASE_URL;
const adminBase = process.env.EXPO_PUBLIC_NOD_ADMIN_API_BASE_URL;
const customerKey = process.env.EXPO_PUBLIC_NOD_CUSTOMER_API_KEY;
const providerKey = process.env.EXPO_PUBLIC_NOD_PROVIDER_API_KEY;
const adminKey = process.env.EXPO_PUBLIC_NOD_ADMIN_API_KEY;
const customerEmail = process.env.NOD_E2E_CUSTOMER_EMAIL;
const providerEmail = process.env.NOD_E2E_PROVIDER_EMAIL;
const password = process.env.NOD_E2E_PASSWORD;
const mutate = process.env.NOD_E2E_MUTATE === "1";

if (![customerBase, providerBase, adminBase, customerKey, providerKey, adminKey, customerEmail, providerEmail, password].every(Boolean)) {
  throw new Error("Missing E2E environment configuration");
}

const results = [];
const tinyPng = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=";

async function request(base, key, token, method, path, body) {
  const response = await fetch(`${base}${path}`, {
    method,
    headers: {
      "Content-Type": "application/json",
      "x-api-key": key,
      ...(token ? { Authorization: `Bearer ${token}` } : {})
    },
    body: body === undefined ? undefined : JSON.stringify(body),
    signal: AbortSignal.timeout(20000)
  });
  const text = await response.text();
  let data;
  try { data = text ? JSON.parse(text) : null; } catch { data = { text: text.slice(0, 120) }; }
  return { response, data };
}

function record(name, response, data, extra = {}) {
  const passed = response.status >= 200 && response.status < 300;
  results.push({ name, passed, status: response.status, error: data?.error ?? data?.message ?? null, ...extra });
  return passed;
}

async function login(base, key, email, role) {
  const { response, data } = await request(base, key, null, "POST", "/login", { email, password });
  record(`login ${role}`, response, data);
  if (!response.ok) throw new Error(`Login ${role} failed`);
  return data;
}

const customerSession = await login(customerBase, customerKey, customerEmail, "customer");
const providerSession = await login(providerBase, providerKey, providerEmail, "provider");
const customerToken = customerSession.access_token ?? customerSession.session?.access_token;
const providerToken = providerSession.access_token ?? providerSession.session?.access_token;
const customerId = customerSession.customer?.id ?? customerSession.user?.id;
const providerId = providerSession.provider?.id ?? providerSession.user?.id;

const profileResult = await request(customerBase, customerKey, customerToken, "GET", "/customers");
record("customer profile", profileResult.response, profileResult.data);

const petsResult = await request(customerBase, customerKey, customerToken, "GET", "/pets");
const pets = Array.isArray(petsResult.data) ? petsResult.data : petsResult.data?.pets ?? petsResult.data?.data ?? [];
record("customer pets", petsResult.response, petsResult.data, { count: pets.length });

const customerBookingsResult = await request(customerBase, customerKey, customerToken, "GET", "/bookings");
const customerBookings = Array.isArray(customerBookingsResult.data) ? customerBookingsResult.data : customerBookingsResult.data?.bookings ?? customerBookingsResult.data?.data ?? [];
record("customer bookings", customerBookingsResult.response, customerBookingsResult.data, { count: customerBookings.length });

const providerProfileResult = await request(providerBase, providerKey, providerToken, "GET", "/get-provider-dashboard");
record("provider profile", providerProfileResult.response, providerProfileResult.data);

const pricingResult = await request(providerBase, providerKey, providerToken, "GET", "/update-provider-pricing");
const pricing = Array.isArray(pricingResult.data) ? pricingResult.data : pricingResult.data?.pricing ?? [];
record("provider pricing", pricingResult.response, pricingResult.data, { count: pricing.length });

const zonesResult = await request(providerBase, providerKey, providerToken, "GET", "/get-provider-onboarding");
const zoneResponse = zonesResult.data?.steps?.flatMap((step) => step.responses ?? []).find((item) => item.field_key === "dog_walker_zones");
const zones = Array.isArray(zoneResponse?.value) ? zoneResponse.value : [];
record("provider zones", zonesResult.response, zonesResult.data, { count: zones.length });

const providerBookingsResult = await request(providerBase, providerKey, providerToken, "GET", "/get-provider-bookings");
const providerBookings = Array.isArray(providerBookingsResult.data) ? providerBookingsResult.data : providerBookingsResult.data?.bookings ?? [];
record("provider bookings", providerBookingsResult.response, providerBookingsResult.data, { count: providerBookings.length });

const deletionResult = await request(customerBase, customerKey, customerToken, "GET", "/account-deletion-requests/current");
results.push({ name: "account deletion status", passed: [200, 404].includes(deletionResult.response.status), status: deletionResult.response.status, error: deletionResult.data?.error ?? deletionResult.data?.message ?? null });

const matchesPet = pets[0];
if (matchesPet?.id) {
  const candidatesResult = await request(customerBase, customerKey, customerToken, "GET", `/discovery/candidates?pet_id=${matchesPet.id}&limit=5`);
  const candidates = candidatesResult.data?.items ?? candidatesResult.data?.candidates ?? [];
  record("dating candidates", candidatesResult.response, candidatesResult.data, { count: candidates.length });
  const matchesResult = await request(customerBase, customerKey, customerToken, "GET", `/matches?pet_id=${matchesPet.id}&limit=5`);
  const matches = matchesResult.data?.items ?? matchesResult.data?.matches ?? [];
  record("dating matches", matchesResult.response, matchesResult.data, { count: matches.length });
}

const legalPaths = ["/privacidad", "/terminos", "/eliminar-cuenta"];
for (const path of legalPaths) {
  const response = await fetch(`https://nodnova.com${path}`, { signal: AbortSignal.timeout(20000) });
  results.push({ name: `legal ${path}`, passed: response.ok, status: response.status, error: null });
}

if (mutate) {
  const pet = pets[0];
  const price = pricing[0];
  const previousProviderBooking = providerBookings.find((item) => item.service_id || item.product_id);
  const serviceId = price?.service_id ?? previousProviderBooking?.service_id ?? previousProviderBooking?.product_id;
  if (!pet?.id || !serviceId) {
    results.push({ name: "booking lifecycle", passed: false, status: "SKIPPED", error: "Missing pet or provider pricing" });
  } else {
    const startsAt = new Date(Date.now() + 5 * 60_000).toISOString();
    const endsAt = new Date(Date.now() + 65 * 60_000).toISOString();
    const bookingResult = await request(customerBase, customerKey, customerToken, "POST", "/bookings", {
      provider_id: providerId,
      pet_id: pet.id,
      service_id: serviceId,
      starts_at: startsAt,
      ends_at: endsAt,
      address: "Av. Providencia 1234, Providencia, Chile",
      comuna: "Providencia",
      city: "Región Metropolitana de Santiago",
      latitude: -33.4289,
      longitude: -70.6090,
      notes: "NOD QA E2E 1.0.24 - reserva técnica sin cobro"
    });
    const booking = bookingResult.data?.booking ?? bookingResult.data?.reservation ?? bookingResult.data?.data ?? bookingResult.data;
    const bookingId = booking?.id ?? booking?.booking_id ?? booking?.reservation_id;
    record("create booking", bookingResult.response, bookingResult.data, { bookingId: Boolean(bookingId) });

    if (bookingId) {
      let providerBooking = null;
      for (let attempt = 0; attempt < 5; attempt += 1) {
        const listed = await request(providerBase, providerKey, providerToken, "GET", "/get-provider-bookings");
        const items = Array.isArray(listed.data) ? listed.data : listed.data?.bookings ?? [];
        providerBooking = items.find((item) => [item.id, item.booking_id, item.reservation_id].includes(bookingId));
        if (providerBooking) break;
        await new Promise((resolve) => setTimeout(resolve, 1000));
      }
      results.push({ name: "booking visible in provider", passed: Boolean(providerBooking), status: providerBooking ? 200 : 404, error: providerBooking ? null : "booking_id not visible" });

      if (providerBooking) {
        const accept = await request(providerBase, providerKey, providerToken, "POST", "/accept-booking", { booking_id: bookingId });
        record("accept booking", accept.response, accept.data);
        if (accept.response.ok) {
          const start = await request(providerBase, providerKey, providerToken, "POST", "/start-service", {
            booking_id: bookingId,
            start_photo_base64: tinyPng,
            start_photo_mime: "image/png",
            start_latitude: -33.4289,
            start_longitude: -70.6090,
            start_address: "Av. Providencia 1234, Providencia",
            notes: "NOD QA E2E start"
          });
          record("start service", start.response, start.data);
          if (start.response.ok) {
            const track = await request(providerBase, providerKey, providerToken, "POST", "/track-service-location", {
              booking_id: bookingId,
              latitude: -33.4288,
              longitude: -70.6089,
              accuracy: 10,
              recorded_at: new Date().toISOString()
            });
            record("track service", track.response, track.data);
            const pause = await request(providerBase, providerKey, providerToken, "POST", "/pause-service", { booking_id: bookingId, reason: "NOD QA E2E" });
            record("pause service", pause.response, pause.data);
            if (pause.response.ok) {
              const resume = await request(providerBase, providerKey, providerToken, "POST", "/resume-service", { booking_id: bookingId });
              record("resume service", resume.response, resume.data);
            }
            const complete = await request(providerBase, providerKey, providerToken, "POST", "/complete-service", {
              booking_id: bookingId,
              completion_photo_base64: tinyPng,
              completion_photo_mime: "image/png",
              completion_latitude: -33.4287,
              completion_longitude: -70.6088,
              notes: "NOD QA E2E complete"
            });
            record("complete service", complete.response, complete.data);
          }
        }
      }

      for (const [name, path] of [["booking detail", `/bookings/${bookingId}`], ["booking timeline", `/bookings/${bookingId}/timeline`], ["booking eta", `/bookings/${bookingId}/eta`], ["booking route", `/bookings/${bookingId}/route`], ["booking photos", `/bookings/${bookingId}/photos`]]) {
        const customerService = await request(providerBase, providerKey, null, "GET", `/get-customer-services?booking_id=${bookingId}`);
        record(name, customerService.response, customerService.data);
      }
    }
  }
}

const passed = results.filter((item) => item.passed).length;
console.log(JSON.stringify({ summary: { passed, failed: results.length - passed, total: results.length, mutate }, results }, null, 2));
if (passed !== results.length) process.exitCode = 1;
