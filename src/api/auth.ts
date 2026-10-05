import { apiRequest } from "./client";
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
