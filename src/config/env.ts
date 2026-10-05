const defaultBaseUrl = "https://qhekasefqqoiibjvhfvy.supabase.co/functions/v1";
const defaultCatalogBaseUrl = "https://uzirhdcwtylpmpbfjkzv.supabase.co/functions/v1";
const defaultCustomerBaseUrl = "https://erssscbpzsosmvpusnru.supabase.co/functions/v1/nod-api";

export const env = {
  googleWebClientId: process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID ?? "",
  googleIosClientId: process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID ?? "",
  mercadoPagoEnabled: process.env.EXPO_PUBLIC_MERCADOPAGO_ENABLED === "true",
  apiBaseUrl: process.env.EXPO_PUBLIC_API_BASE_URL ?? defaultBaseUrl,
  providerApiKey:
    process.env.EXPO_PUBLIC_NOD_PROVIDER_API_KEY ??
    process.env.EXPO_PUBLIC_NOD_API_KEY ??
    "",
  customerApiKey:
    process.env.EXPO_PUBLIC_NOD_CUSTOMER_API_KEY ??
    process.env.EXPO_PUBLIC_NOD_CLIENT_API_KEY ??
    "",
  customerApiBaseUrl: process.env.EXPO_PUBLIC_NOD_CUSTOMER_API_BASE_URL ?? defaultCustomerBaseUrl,
  adminApiBaseUrl: process.env.EXPO_PUBLIC_NOD_ADMIN_API_BASE_URL ?? defaultCatalogBaseUrl,
  adminApiKey: process.env.EXPO_PUBLIC_NOD_ADMIN_API_KEY ?? ""
};

export function assertRuntimeConfig(role: "provider" | "customer" = "provider") {
  if (role === "customer" && !env.customerApiKey) {
    throw new Error("Missing EXPO_PUBLIC_NOD_CUSTOMER_API_KEY. Copy .env.example to .env and set the customer API key.");
  }
  if (role === "provider" && !env.providerApiKey) {
    throw new Error("Missing EXPO_PUBLIC_NOD_PROVIDER_API_KEY. Copy .env.example to .env and set the provider API key.");
  }
}
