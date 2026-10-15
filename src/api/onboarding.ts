import { apiRequest } from "./client";
import type {
  OnboardingStep,
  ProviderOnboardingResponse,
  ProviderRejectionsResponse,
  SubmitOnboardingPayload
} from "../types/api";

export function getOnboardingSteps(serviceCategory?: string, accessToken?: string | null) {
  return apiRequest<{ steps: OnboardingStep[] }>("/get-onboarding-steps", {
    query: { service_category: serviceCategory },
    accessToken
  });
}

export function getProviderOnboarding(providerId: string, accessToken?: string | null) {
  return apiRequest<ProviderOnboardingResponse>("/get-provider-onboarding", {
    query: { provider_id: providerId },
    accessToken
  });
}

export function getProviderRejections(providerId: string, accessToken?: string | null) {
  return apiRequest<ProviderRejectionsResponse>("/get-provider-rejections", {
    query: { provider_id: providerId },
    accessToken
  });
}

export function submitProviderOnboarding(
  payload: SubmitOnboardingPayload,
  accessToken?: string | null
) {
  return apiRequest<{ provider_id: string; step: unknown | null; status: string }>(
    "/submit-provider-onboarding",
    {
      method: "POST",
      body: payload,
      accessToken
    }
  );
}

export async function getChileanComunas(accessToken?: string | null) {
  const response = await getOnboardingSteps(undefined, accessToken);
  const comunaField = response.steps.flatMap((step) => step.fields).find((field) => field.field_type === "comunas");
  const rawOptions = comunaField?.options as unknown;
  if (!Array.isArray(rawOptions)) return [];

  return rawOptions.flatMap((group) => {
    if (!group || typeof group !== "object") return [];
    const record = group as { region?: unknown; comunas?: unknown };
    if (!Array.isArray(record.comunas)) return [];
    return record.comunas.map((comuna) => ({ comuna: String(comuna), region: String(record.region ?? "Chile") }));
  });
}
