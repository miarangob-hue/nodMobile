const base = process.env.EXPO_PUBLIC_API_BASE_URL;
const key = process.env.EXPO_PUBLIC_NOD_PROVIDER_API_KEY;
const customerBase = process.env.EXPO_PUBLIC_NOD_CUSTOMER_API_BASE_URL;
const customerKey = process.env.EXPO_PUBLIC_NOD_CUSTOMER_API_KEY;
const missing = "00000000-0000-0000-0000-000000000000";
const checks = [
  [base, key, "perfil proveedor update", "POST", "/update-provider-profile", { provider_id: missing, bio: "qa" }],
  [base, key, "pricing proveedor", "GET", `/update-provider-pricing?provider_id=${missing}`],
  [base, key, "crear cuenta bancaria", "POST", "/create-provider-bank-account", { provider_id: missing, bank_name: "QA", account_number: "0" }],
  [base, key, "resumen tributario", "GET", `/get-provider-tax-summary?provider_id=${missing}`],
  [base, key, "tickets soporte proveedor", "GET", `/list-support-tickets?user_id=${missing}`],
  [base, key, "ticket soporte proveedor", "POST", "/create-support-ticket", { user_id: missing, category: "other", subject: "QA", message: "QA" }],
  [base, key, "subir archivo", "POST", "/upload-file", { provider_id: missing, document_type: "qa", file_name: "qa.png", mime_type: "image/png", file_base64: "data:image/png;base64,AA==" }],
  [base, key, "crear incidente", "POST", "/create-service-incident", { booking_id: missing, type: "other" }],
  [base, key, "subir foto servicio", "POST", "/upload-service-photo", { booking_id: missing, type: "during", photo_base64: "AA==", photo_mime: "image/png" }],
  [customerBase, customerKey, "eliminar dispositivo push", "DELETE", `/push-devices/${missing}`],
  [customerBase, customerKey, "notificaciones cliente", "GET", `/notifications?customer_id=${missing}&limit=1`],
  [customerBase, customerKey, "marcar notificación cliente", "POST", `/notifications/${missing}/read`, { customer_id: missing }],
  [customerBase, customerKey, "planes seguro", "GET", `/insurance-plans?customer_id=${missing}&pet_id=${missing}`],
  [customerBase, customerKey, "ficha médica", "GET", `/pets/${missing}/medical-profile?customer_id=${missing}`]
];

const output = [];
for (const [target, apiKey, name, method, path, body] of checks) {
  try {
    const response = await fetch(`${target}${path}`, { method, headers: { "Content-Type": "application/json", "x-api-key": apiKey }, body: body === undefined ? undefined : JSON.stringify(body), signal: AbortSignal.timeout(20000) });
    const text = await response.text(); let data;
    try { data = text ? JSON.parse(text) : null; } catch { data = text; }
    output.push({ name, status: response.status, code: data?.code ?? null, error: data?.error ?? null, message: data?.message ?? null, keys: data && typeof data === "object" ? Object.keys(data).slice(0, 8) : [] });
  } catch (error) { output.push({ name, status: "NETWORK_ERROR", message: error.message }); }
}
console.log(JSON.stringify(output, null, 2));
