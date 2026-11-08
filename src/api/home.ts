import { apiRequest } from "./client";
import { env } from "../config/env";

export type HomeServiceQuestion = {
  id: string;
  key?: string;
  label: string;
  type: "SINGLE_CHOICE" | "MULTI_CHOICE" | "TEXT" | "NUMBER" | "BOOLEAN";
  required?: boolean;
  options?: Array<{ label: string; value: string }>;
};

export type HomeService = {
  id: string;
  name: string;
  family: "hogar";
  description?: string;
  icon?: string;
  questions: HomeServiceQuestion[];
};

export type HomeServiceRequest = {
  id: string;
  service_id: string;
  title: string;
  description?: string;
  commune?: string;
  status: string;
  payment_status?: string;
  created_at: string;
  quotes_count?: number;
};

export type HomeQuote = {
  id: string;
  request_id: string;
  provider_id: string;
  provider_name: string;
  provider_avatar?: string | null;
  years_experience?: number;
  rating?: number;
  labor_amount: number;
  materials_amount: number;
  travel_amount: number;
  discount_amount: number;
  total_amount: number;
  currency: string;
  warranty_days?: number;
  estimated_duration_hours?: number;
  description?: string;
  valid_until?: string;
  status: string;
};

export type HomeAddress = {
  street: string;
  number: string;
  unit?: string;
  commune: string;
  city: string;
  region: string;
  latitude: number;
  longitude: number;
};

export type HomeChatMessage = {
  id: string;
  body: string;
  sender_id?: string;
  created_at: string;
  read_at?: string | null;
};

type Envelope<T> = { data: T; meta?: Record<string, unknown> };

const api = <T>(path: string, options: Parameters<typeof apiRequest>[1] = {}) =>
  apiRequest<Envelope<T>>(path, { ...options, apiKeyKind: "customer", baseUrlOverride: env.homeApiBaseUrl, omitApiKey: true });

export async function getHomeCatalog(accessToken?: string | null) {
  const response = await api<HomeService[] | { data: HomeService[] }>("/home-service-requests", {
    query: { resource: "catalog" },
    accessToken
  });
  return Array.isArray(response.data) ? response.data : response.data.data;
}

export async function getHomeRequests(accessToken?: string | null, page = 1, limit = 20) {
  const response = await api<HomeServiceRequest[]>("/home-service-requests", {
    query: { page, limit },
    accessToken
  });
  return response.data;
}

export async function getHomeRequest(requestId: string, accessToken?: string | null) {
  const response = await api<HomeServiceRequest>("/home-service-requests", {
    query: { id: requestId },
    accessToken
  });
  return response.data;
}

export async function createHomeRequest(input: Record<string, unknown>, accessToken: string, idempotencyKey: string) {
  const response = await api<HomeServiceRequest>("/home-service-requests", {
    method: "POST",
    body: input,
    accessToken,
    headers: { "Idempotency-Key": idempotencyKey }
  } as Parameters<typeof apiRequest>[1]);
  return response.data;
}

export async function cancelHomeRequest(requestId: string, accessToken: string, idempotencyKey: string) {
  const response = await api<HomeServiceRequest>("/home-service-requests", {
    method: "POST",
    query: { id: requestId, action: "cancel" },
    accessToken,
    headers: { "Idempotency-Key": idempotencyKey }
  } as Parameters<typeof apiRequest>[1]);
  return response.data;
}

export async function getHomeQuotes(requestId: string, accessToken?: string | null) {
  const response = await api<HomeQuote[]>("/home-service-requests", {
    query: { resource: "quotes", id: requestId },
    accessToken
  });
  return response.data;
}

export async function acceptHomeQuote(quoteId: string, accessToken: string, idempotencyKey: string) {
  const response = await api<HomeServiceRequest>("/home-service-requests", {
    method: "POST",
    query: { resource: "quotes", id: quoteId, action: "accept" },
    accessToken,
    headers: { "Idempotency-Key": idempotencyKey }
  } as Parameters<typeof apiRequest>[1]);
  return response.data;
}

export async function payHomeRequest(requestId: string, accessToken: string, idempotencyKey: string) {
  const response = await api<{ payment_id: string; request_id: string; payment_status: string }>("/home-service-requests", {
    method: "POST",
    query: { id: requestId, action: "pay" },
    body: {},
    accessToken,
    headers: { "Idempotency-Key": idempotencyKey }
  } as Parameters<typeof apiRequest>[1]);
  return response.data;
}

export async function completeHomeRequest(requestId: string, accessToken: string, idempotencyKey: string) {
  const response = await api<HomeServiceRequest>("/home-service-requests", {
    method: "POST",
    query: { id: requestId, action: "complete" },
    body: {},
    accessToken,
    headers: { "Idempotency-Key": idempotencyKey }
  } as Parameters<typeof apiRequest>[1]);
  return response.data;
}

export async function reviewHomeRequest(requestId: string, body: Record<string, unknown>, accessToken: string, idempotencyKey: string) {
  const response = await api<HomeServiceRequest>("/home-service-requests", {
    method: "POST",
    query: { id: requestId, action: "review" },
    body,
    accessToken,
    headers: { "Idempotency-Key": idempotencyKey }
  } as Parameters<typeof apiRequest>[1]);
  return response.data;
}

export async function disputeHomeRequest(requestId: string, reason: string, accessToken: string, idempotencyKey: string) {
  const response = await api<HomeServiceRequest>("/home-service-requests", {
    method: "POST",
    query: { id: requestId, action: "dispute" },
    body: { reason },
    accessToken,
    headers: { "Idempotency-Key": idempotencyKey }
  } as Parameters<typeof apiRequest>[1]);
  return response.data;
}

export async function getHomeChat(requestId: string, accessToken?: string | null, page = 1) {
  const response = await api<HomeChatMessage[]>("/home-service-requests", {
    query: { resource: "chat", id: requestId, page },
    accessToken
  });
  return response.data;
}

export async function sendHomeChat(requestId: string, body: string, accessToken: string, idempotencyKey: string) {
  const response = await api<HomeChatMessage>("/home-service-requests", {
    method: "POST",
    query: { resource: "chat", id: requestId },
    body: { body },
    accessToken,
    headers: { "Idempotency-Key": idempotencyKey }
  } as Parameters<typeof apiRequest>[1]);
  return response.data;
}

export type HomeOpportunity = HomeServiceRequest & {
  match_id: string;
  distance_km?: number;
  customer_area?: string;
};

export async function getProviderHomeOpportunities(accessToken?: string | null) {
  const response = await apiRequest<{ data: HomeOpportunity[] }>("/provider-home-matches", {
    query: { page: 1, limit: 20, status: "SENT" },
    accessToken,
    apiKeyKind: "provider",
    baseUrlOverride: env.apiBaseUrl,
    omitApiKey: true
  });
  return response.data;
}

export async function acceptProviderHomeOpportunity(matchId: string, accessToken: string, idempotencyKey: string) {
  return apiRequest<{ data: HomeOpportunity }>(`/provider-home-matches/${matchId}/accept`, {
    method: "POST",
    accessToken,
    apiKeyKind: "provider",
    baseUrlOverride: env.apiBaseUrl,
    omitApiKey: true,
    headers: { "Idempotency-Key": idempotencyKey }
  });
}

export async function rejectProviderHomeOpportunity(matchId: string, accessToken: string, idempotencyKey: string) {
  return apiRequest<{ data: HomeOpportunity }>(`/provider-home-matches/${matchId}/reject`, {
    method: "POST",
    body: { reason: "No disponible" },
    accessToken,
    apiKeyKind: "provider",
    baseUrlOverride: env.apiBaseUrl,
    omitApiKey: true,
    headers: { "Idempotency-Key": idempotencyKey }
  });
}

export async function createProviderHomeQuote(input: Record<string, unknown>, accessToken: string, idempotencyKey: string) {
  return apiRequest<{ data: HomeQuote }>("/home-quotes", {
    method: "POST",
    body: input,
    accessToken,
    apiKeyKind: "provider",
    baseUrlOverride: env.apiBaseUrl,
    omitApiKey: true,
    headers: { "Idempotency-Key": idempotencyKey }
  });
}
