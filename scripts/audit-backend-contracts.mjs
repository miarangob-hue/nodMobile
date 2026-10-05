const env = process.env;
const missing = "00000000-0000-0000-0000-000000000000";

const targets = {
  customer: { base: env.EXPO_PUBLIC_NOD_CUSTOMER_API_BASE_URL, key: env.EXPO_PUBLIC_NOD_CUSTOMER_API_KEY },
  provider: { base: env.EXPO_PUBLIC_API_BASE_URL, key: env.EXPO_PUBLIC_NOD_PROVIDER_API_KEY },
  admin: { base: env.EXPO_PUBLIC_NOD_ADMIN_API_BASE_URL, key: env.EXPO_PUBLIC_NOD_ADMIN_API_KEY }
};

if (Object.values(targets).some(({ base, key }) => !base || !key)) throw new Error("Missing API configuration");

const checks = [
  // Catálogos y autenticación
  ["admin", "familias y servicios", "GET", "/get-families-with-services"],
  ["admin", "bancos", "GET", "/get-banks"],
  ["admin", "tipos de cuenta bancaria", "GET", `/get-bank-account-types?bank_id=${missing}`],
  ["admin", "servicio básico", "GET", `/get-service-by-id-basic?service_id=${missing}`],
  ["provider", "conteo proveedores por servicio", "GET", "/get-service-provider-counts"],
  ["customer", "login cliente", "POST", "/login", { email: "invalid@example.invalid", password: "invalid" }],
  ["provider", "login proveedor", "POST", "/login", { email: "invalid@example.invalid", password: "invalid" }],
  ["provider", "registro proveedor", "POST", "/register-provider", {}],

  // Cliente, mascotas, reservas y soporte
  ["customer", "listar clientes", "GET", "/customers?limit=1"],
  ["customer", "perfil cliente", "GET", `/customers/${missing}`],
  ["customer", "actualizar cliente", "PUT", `/customers/${missing}`, { phone: "+56900000000" }],
  ["customer", "listar mascotas", "GET", `/pets?customer_id=${missing}`],
  ["customer", "crear mascota", "POST", "/pets", { customer_id: missing, name: "QA" }],
  ["customer", "buscar proveedores", "GET", "/providers?comuna=Providencia"],
  ["provider", "reservas cliente", "GET", `/get-customer-bookings?customer_id=${missing}`],
  ["provider", "crear reserva", "POST", "/create-booking-request", { customer_id: missing, provider_id: missing, starts_at: new Date().toISOString(), ends_at: new Date(Date.now() + 3600000).toISOString(), address: "QA" }],
  ["provider", "cancelar reserva", "POST", "/cancel-booking", { booking_id: missing, customer_id: missing, reason: "qa" }],
  ["customer", "ruta cliente", "GET", `/bookings/${missing}/route`],
  ["customer", "fotos cliente", "GET", `/bookings/${missing}/photos`],
  ["customer", "compras cliente", "GET", `/purchases?customer_id=${missing}`],
  ["customer", "crear ticket cliente", "POST", "/create-support-ticket", { user_id: missing, category: "other", subject: "QA", message: "QA" }],
  ["customer", "solicitud eliminación actual", "GET", "/account-deletion-requests/current"],
  ["customer", "crear solicitud eliminación", "POST", "/account-deletion-requests", { reason: "qa" }],

  // Créditos NOD y Mercado Pago
  ["customer", "wallet", "GET", "/wallet"],
  ["customer", "recarga wallet", "POST", "/wallet/topups", { package_id: missing }],
  ["customer", "pago con créditos", "POST", "/wallet/payments", { booking_id: missing }],
  ["customer", "checkout Mercado Pago", "POST", "/payments/checkout", { booking_id: missing }],
  ["customer", "estado pago reserva", "GET", `/payments/bookings/${missing}`],

  // Residencial
  ["customer", "buscar residencial", "GET", "/hosting/search?comuna=Providencia&pets=1"],
  ["customer", "detalle residencial", "GET", `/hosting/hosts/${missing}`],
  ["customer", "crear reserva residencial", "POST", "/hosting/bookings", { hosting_profile_id: missing, customer_id: missing, check_in: "2026-10-10", check_out: "2026-10-11", pet_ids: [missing] }],
  ["customer", "mis estadías", "GET", "/hosting/bookings/my-bookings"],
  ["customer", "estado estadía", "PUT", `/hosting/bookings/${missing}/status`, { status: "CANCELLED" }],

  // Comunidad
  ["customer", "feed comunidad", "GET", `/feed?filter=for_you&user_id=${missing}&pet_type=all&page=1&limit=1`],
  ["customer", "crear publicación", "POST", "/posts", { caption: "QA", pet_type: "dog" }],
  ["customer", "like publicación", "POST", `/posts/${missing}/like`, {}],
  ["customer", "comentario publicación", "POST", `/posts/${missing}/comments`, { content: "QA" }],
  ["customer", "listar spots", "GET", `/spots?customer_id=${missing}&limit=1`],
  ["customer", "crear spot", "POST", "/spots", { customer_id: missing, title: "QA", category: "other" }],

  // Proveedor y ejecución
  ["provider", "pasos onboarding", "GET", "/get-onboarding-steps"],
  ["provider", "onboarding proveedor", "GET", `/get-provider-onboarding?provider_id=${missing}`],
  ["provider", "rechazos proveedor", "GET", `/get-provider-rejections?provider_id=${missing}`],
  ["provider", "reservas proveedor", "GET", `/get-provider-bookings?provider_id=${missing}`],
  ["provider", "dashboard proveedor", "GET", `/get-provider-dashboard?provider_id=${missing}`],
  ["provider", "saldo proveedor", "GET", `/get-provider-balance?provider_id=${missing}`],
  ["provider", "rendimiento proveedor", "GET", `/get-provider-performance?provider_id=${missing}`],
  ["provider", "payouts proveedor", "GET", `/get-provider-payouts?provider_id=${missing}`],
  ["provider", "movimientos proveedor", "GET", `/get-wallet-transactions?provider_id=${missing}`],
  ["provider", "cuentas bancarias", "GET", `/get-provider-bank-accounts?provider_id=${missing}`],
  ["provider", "documentos proveedor", "GET", `/get-provider-documents?provider_id=${missing}`],
  ["provider", "reseñas proveedor", "GET", `/get-provider-reviews?provider_id=${missing}`],
  ["provider", "resumen reseñas", "GET", `/get-provider-review-summary?provider_id=${missing}`],
  ["provider", "disponibilidad", "GET", `/get-provider-availability?provider_id=${missing}`],
  ["provider", "aceptar reserva", "POST", "/accept-booking", { booking_id: missing, provider_id: missing }],
  ["provider", "rechazar reserva", "POST", "/reject-booking", { booking_id: missing, provider_id: missing, reason: "qa" }],
  ["provider", "iniciar servicio", "POST", "/start-service", { booking_id: missing }],
  ["provider", "pausar servicio", "POST", "/pause-service", { booking_id: missing }],
  ["provider", "reanudar servicio", "POST", "/resume-service", { booking_id: missing }],
  ["provider", "completar servicio", "POST", "/complete-service", { booking_id: missing }],
  ["provider", "actualizar GPS", "POST", "/update-service-location", { booking_id: missing, latitude: -33.4, longitude: -70.6 }],
  ["provider", "ruta servicio", "GET", `/get-service-route?booking_id=${missing}`],
  ["provider", "fotos servicio", "GET", `/get-service-photos?booking_id=${missing}`],
  ["provider", "incidentes servicio", "GET", `/get-service-incidents?booking_id=${missing}`],
  ["provider", "resumen servicio", "GET", `/get-service-summary?booking_id=${missing}`],
  ["provider", "crear informe servicio", "POST", "/create-service-report", { booking_id: missing, pet_status: "ok" }],
  ["provider", "enviar informe servicio", "POST", "/submit-service-report", { report_id: missing }],

  // Chat, notificaciones, seguridad y push
  ["provider", "crear/obtener chat reserva", "POST", "/get-or-create-booking-chat", { booking_id: missing }],
  ["provider", "mensajes chat reserva", "GET", `/get-chat-messages?chat_id=${missing}`],
  ["provider", "enviar chat reserva", "POST", "/send-chat-message", { chat_id: missing, sender_id: missing, text: "QA" }],
  ["provider", "marcar chat leído", "POST", "/mark-chat-read", { chat_id: missing, user_id: missing }],
  ["provider", "notificaciones proveedor", "GET", `/get-notifications?user_id=${missing}`],
  ["provider", "marcar notificación", "POST", "/mark-notification-read", { notification_id: missing }],
  ["customer", "registrar push", "POST", "/register-push-token", { user_id: missing, role: "customer", token: "ExponentPushToken[qa]", platform: "android" }],
  ["customer", "desregistrar push", "POST", "/unregister-push-token", { user_id: missing, token: "ExponentPushToken[qa]" }],
  ["provider", "alerta emergencia", "POST", "/create-emergency-alert", { booking_id: missing, user_id: missing, type: "sos" }],
  ["provider", "contactos emergencia", "GET", `/get-emergency-contacts?booking_id=${missing}`],
  ["provider", "cobertura veterinaria", "GET", `/get-veterinary-coverage?booking_id=${missing}&provider_id=${missing}`],
  ["provider", "solicitar payout", "POST", "/request-provider-payout", { provider_id: missing, amount: 1000, currency: "CLP" }]
];

function summarize(data) {
  if (!data || typeof data !== "object") return { body: String(data ?? "").slice(0, 100) };
  return { error: data.error ?? null, message: data.message ?? null, keys: Object.keys(data).slice(0, 8) };
}

const results = [];
for (const [targetName, name, method, path, body] of checks) {
  const target = targets[targetName];
  try {
    const response = await fetch(`${target.base}${path}`, {
      method,
      headers: { "Content-Type": "application/json", "x-api-key": target.key },
      body: body === undefined ? undefined : JSON.stringify(body),
      signal: AbortSignal.timeout(20000)
    });
    const text = await response.text();
    let data;
    try { data = text ? JSON.parse(text) : null; } catch { data = text; }
    const summary = summarize(data);
    const unknown = response.status === 404 && /unknown endpoint|requested function was not found|not found route|cannot (get|post|put|delete)/i.test(`${summary.error} ${summary.message} ${summary.body}`);
    results.push({ target: targetName, name, method, path: path.split("?")[0], status: response.status, exists: !unknown, ...summary });
  } catch (error) {
    results.push({ target: targetName, name, method, path: path.split("?")[0], status: "NETWORK_ERROR", exists: false, message: error.message });
  }
}

const webhookUrl = `${targets.customer.base.replace(/\/nod-api$/, "")}/mercadopago-webhook`;
try {
  const response = await fetch(webhookUrl, { method: "POST", headers: { "Content-Type": "application/json" }, body: "{}", signal: AbortSignal.timeout(20000) });
  const data = await response.json().catch(() => ({}));
  results.push({ target: "webhook", name: "webhook Mercado Pago", method: "POST", path: "/mercadopago-webhook", status: response.status, exists: response.status === 401 && data?.error === "invalid_signature", ...summarize(data) });
} catch (error) {
  results.push({ target: "webhook", name: "webhook Mercado Pago", status: "NETWORK_ERROR", exists: false, message: error.message });
}

const missingEndpoints = results.filter((item) => !item.exists);
console.log(JSON.stringify({ summary: { total: results.length, responding: results.length - missingEndpoints.length, missing: missingEndpoints.length }, missingEndpoints, results }, null, 2));
if (missingEndpoints.length) process.exitCode = 1;
