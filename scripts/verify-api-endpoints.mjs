const baseUrl = process.env.EXPO_PUBLIC_NOD_CUSTOMER_API_BASE_URL;
const apiKey = process.env.EXPO_PUBLIC_NOD_CUSTOMER_API_KEY;

if (!baseUrl || !apiKey) {
  throw new Error("Missing customer API configuration");
}

const customerId = process.env.NOD_TEST_CUSTOMER_ID ?? "1af4a544-76a5-417a-b51e-eef757dde641";
const petId = process.env.NOD_TEST_PET_ID ?? "dd06bd63-b471-4fe5-b66d-d1da0df981c9";
const missingId = "00000000-0000-0000-0000-000000000000";

const checks = [
  ["candidates", "GET", `/discovery/candidates?pet_id=${petId}&customer_id=${customerId}&limit=2`],
  ["swipe", "POST", "/discovery/swipes", { actor_pet_id: missingId, customer_id: customerId, target_pet_id: missingId, decision: "pass" }],
  ["swipe undo", "POST", "/discovery/swipes/undo", { actor_pet_id: missingId, customer_id: customerId, target_pet_id: missingId }],
  ["matches", "GET", `/matches?pet_id=${petId}&customer_id=${customerId}&limit=2`],
  ["match messages", "GET", `/matches/${missingId}/messages?customer_id=${customerId}&limit=1`],
  ["send match message", "POST", `/matches/${missingId}/messages`, { customer_id: customerId, text: "NOD API smoke test" }],
  ["read match", "POST", `/matches/${missingId}/messages/read`, { customer_id: customerId }],
  ["delete match", "DELETE", `/matches/${missingId}?customer_id=${customerId}`],
  ["get preferences", "GET", `/pets/${petId}/discovery-preferences?customer_id=${customerId}`],
  ["put preferences", "PUT", `/pets/${missingId}/discovery-preferences`, { customer_id: customerId, max_distance_km: 10 }],
  ["get social profile", "GET", `/pets/${petId}/social-profile?customer_id=${customerId}`],
  ["put social profile", "PUT", `/pets/${missingId}/social-profile`, { customer_id: customerId, bio: "smoke-test" }],
  ["post social photo", "POST", `/pets/${missingId}/social-profile/photos`, { customer_id: customerId }],
  ["delete social photo", "DELETE", `/pets/${missingId}/social-profile/photos/${missingId}?customer_id=${customerId}`],
  ["block pet", "POST", "/discovery/blocks", { actor_pet_id: missingId, customer_id: customerId, target_pet_id: missingId }],
  ["unblock pet", "DELETE", `/discovery/blocks/${missingId}?actor_pet_id=${missingId}&customer_id=${customerId}`],
  ["list blocks", "GET", `/discovery/blocks?actor_pet_id=${petId}&customer_id=${customerId}`],
  ["report pet", "POST", "/discovery/reports", { actor_pet_id: missingId, customer_id: customerId, target_pet_id: missingId, reason: "other", details: "smoke-test" }],
  ["admin reports", "GET", "/admin/moderation/reports?status=pending&limit=1"],
  ["admin report", "GET", `/admin/moderation/reports/${missingId}`],
  ["resolve report", "POST", `/admin/moderation/reports/${missingId}/resolve`, {}],
  ["suspend user", "POST", `/admin/users/${missingId}/suspend`, { reason: "smoke-test" }],
  ["restore user", "POST", `/admin/users/${missingId}/restore`, {}],
  ["admin photos", "GET", "/admin/moderation/photos?status=pending&limit=1"],
  ["approve photo", "POST", `/admin/moderation/photos/${missingId}/approve`, {}],
  ["reject photo", "POST", `/admin/moderation/photos/${missingId}/reject`, { reason: "smoke-test" }],
  ["register push", "POST", "/register-push-token", { user_id: missingId, role: "customer", token: "ExponentPushToken[invalid-smoke-test-token]", platform: "android" }],
  ["unregister push", "POST", "/unregister-push-token", { user_id: missingId, token: "ExponentPushToken[invalid-smoke-test-token]" }],
  ["notifications", "GET", "/notifications?limit=1"],
  ["read notification", "POST", `/notifications/${missingId}/read`, {}],
  ["sos", "POST", "/safety/sos", {}],
  ["safety event", "GET", `/safety/events/${missingId}`],
  ["cancel safety event", "POST", `/safety/events/${missingId}/cancel`, { reason: "smoke-test" }],
  ["emergency contacts", "GET", `/customers/${customerId}/emergency-contacts`],
  ["create emergency contact", "POST", `/customers/${missingId}/emergency-contacts`, {}],
  ["update emergency contact", "PUT", `/customers/${missingId}/emergency-contacts/${missingId}`, { name: "Smoke Test" }],
  ["delete emergency contact", "DELETE", `/customers/${missingId}/emergency-contacts/${missingId}`],
  ["create tracking share", "POST", `/bookings/${missingId}/tracking-share`, { expires_in_minutes: 30 }],
  ["delete tracking share", "DELETE", `/bookings/${missingId}/tracking-share`],
  ["create dispute", "POST", `/bookings/${missingId}/disputes`, { reason: "other", description: "smoke-test" }],
  ["booking disputes", "GET", `/bookings/${missingId}/disputes`],
  ["dispute evidence", "POST", `/disputes/${missingId}/evidence`, { description: "smoke-test" }],
  ["resolve dispute", "POST", `/admin/disputes/${missingId}/resolve`, { resolution: "smoke-test" }],
  ["provider review", "POST", "/create-provider-review", { booking_id: missingId, customer_id: customerId, provider_id: missingId, rating: 5, comment: "smoke-test" }],
  ["booking eta", "GET", `/bookings/${missingId}/eta`],
  ["booking timeline", "GET", `/bookings/${missingId}/timeline`],
  ["moderate photo", "POST", "/internal/moderation/photos", { photo_id: missingId, url: "https://example.invalid/smoke-test.jpg" }],
  ["update customer", "PUT", `/customers/${missingId}`, { phone: "+56900000000" }],
  ["insurance plans", "GET", `/insurance-plans?customer_id=${customerId}&pet_id=${petId}`],
  ["insurance request", "POST", "/insurance-requests", { customer_id: missingId, pet_id: missingId, plan_id: "smoke-test" }],
  ["spots", "GET", `/spots?customer_id=${customerId}&limit=1`],
  ["medical profile", "GET", `/pets/${petId}/medical-profile?customer_id=${customerId}`]
];

function summarize(text) {
  try {
    const value = JSON.parse(text);
    return {
      error: value?.error,
      message: value?.message,
      keys: value && typeof value === "object" ? Object.keys(value).slice(0, 8) : []
    };
  } catch {
    return { text: text.slice(0, 160) };
  }
}

for (const [name, method, path, body] of checks) {
  try {
    const response = await fetch(`${baseUrl}${path}`, {
      method,
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey
      },
      body: body === undefined ? undefined : JSON.stringify(body),
      signal: AbortSignal.timeout(15000)
    });
    const text = await response.text();
    console.log(JSON.stringify({ name, method, path: path.split("?")[0], status: response.status, ...summarize(text) }));
  } catch (error) {
    console.log(JSON.stringify({ name, method, path: path.split("?")[0], status: "NETWORK_ERROR", message: error.message }));
  }
}
