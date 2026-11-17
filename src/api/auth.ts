import { apiRequest } from "./client";
import { env } from "../config/env";
import type {
  Customer,
  LoginResponse,
  RegisterCustomerPayload,
  RegisterCustomerResponse,
  RegisterProviderPayload,
  RegisterProviderResponse
} from "../types/api";

export function loginWithPassword(email: string, password: string, apiKeyKind?: "provider" | "customer", warnOnError = true) {
  return apiRequest<LoginResponse>("/login", {
    method: "POST",
    body: { email, password },
    apiKeyKind,
    warnOnError
  });
}

export function loginWithGoogleToken(idToken: string, role: "customer" | "provider") {
  return apiRequest<LoginResponse>(role === "customer" ? "/auth/google" : "/auth-google", {
    method: "POST",
    body: { id_token: idToken },
    apiKeyKind: role
  });
}

export type AbaiCodeRequestResponse = {
  challenge_id?: string;
  expires_in?: number;
  masked_destination?: string;
  channel?: "sms" | "whatsapp";
  message?: string;
};

export function requestAbaiLoginCode(phone: string) {
  return apiRequest<AbaiCodeRequestResponse>(env.abaiAuthRequestPath, {
    method: "POST",
    body: { phone, channel: "whatsapp" },
    apiKeyKind: "customer"
  });
}

export function verifyAbaiLoginCode(phone: string, code: string, challengeId?: string) {
  return apiRequest<LoginResponse>(env.abaiAuthVerifyPath, {
    method: "POST",
    body: { phone, code, challenge_id: challengeId },
    apiKeyKind: "customer"
  });
}

export function refreshLogin(refreshToken: string, role: "provider" | "customer" = "provider") {
  return apiRequest<LoginResponse>("/login", {
    method: "POST",
    body: { refresh_token: refreshToken },
    apiKeyKind: role
  });
}

export function registerProvider(payload: RegisterProviderPayload) {
  return apiRequest<RegisterProviderResponse>("/register-provider", {
    method: "POST",
    body: payload
  });
}

export function registerCustomer(payload: RegisterCustomerPayload) {
  return apiRequest<RegisterCustomerResponse | Customer | { data?: Customer }>("/customers", {
    method: "POST",
    body: payload,
    apiKeyKind: "customer"
  }).then((response) => normalizeCustomerRegistrationResponse(response, payload));
}

function normalizeCustomerRegistrationResponse(
  response: RegisterCustomerResponse | Customer | { data?: Customer },
  payload: RegisterCustomerPayload
): RegisterCustomerResponse {
  if (hasCustomer(response)) {
    return response;
  }

  const customer = hasDataCustomer(response) ? response.data : response as Customer;
  return {
    user_id: customer.id,
    email: customer.email ?? payload.email,
    customer
  };
}

function hasCustomer(response: RegisterCustomerResponse | Customer | { data?: Customer }): response is RegisterCustomerResponse {
  return typeof response === "object" && response !== null && "customer" in response && Boolean(response.customer);
}

function hasDataCustomer(response: RegisterCustomerResponse | Customer | { data?: Customer }): response is { data: Customer } {
  return typeof response === "object" && response !== null && "data" in response && Boolean(response.data);
}
