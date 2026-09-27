import { env } from "../config/env";

export type CatalogOption = {
  label: string;
  submitValue?: string;
  value: string;
};

type CatalogRequestOptions = {
  query?: Record<string, string | undefined | null>;
};

type Bank = {
  id?: string;
  name?: string;
  code?: string | null;
  country?: string | null;
  display_order?: number | null;
};

type Service = {
  id?: string;
  name?: string;
  description?: string | null;
  family_id?: string | null;
};

type ServiceFamily = {
  id?: string;
  name?: string;
  description?: string | null;
  services?: Service[];
};

type ServiceProviderCount = {
  service_id?: string;
  service_name?: string;
  provider_count?: number;
};

type ServiceProviderCountFamily = {
  services?: ServiceProviderCount[];
};

type BankAccountType = {
  id?: string;
  name?: string;
  code?: string | null;
  description?: string | null;
  display_order?: number | null;
};

function buildCatalogUrl(path: string, query?: CatalogRequestOptions["query"]) {
  const url = new URL(`${env.adminApiBaseUrl}${path}`);

  Object.entries(query ?? {}).forEach(([key, value]) => {
    if (value) {
      url.searchParams.set(key, value);
    }
  });

  return url.toString();
}

async function catalogRequest<T>(path: string, options: CatalogRequestOptions = {}) {
  if (!env.adminApiKey) {
    throw new Error("Missing EXPO_PUBLIC_NOD_ADMIN_API_KEY.");
  }

  const response = await fetch(buildCatalogUrl(path, options.query), {
    headers: {
      "x-api-key": env.adminApiKey
    }
  });

  if (!response.ok) {
    throw new Error(`Catalog request failed with status ${response.status}`);
  }

  return (await response.json()) as T;
}

export async function getBankOptions() {
  const response = await catalogRequest<{ banks?: Bank[] }>("/get-banks");
  return toOptions(response.banks);
}

export async function getBankAccountTypeOptions(bankId: string) {
  const response = await catalogRequest<{ account_types?: BankAccountType[] }>(
    "/get-bank-account-types",
    { query: { bank_id: bankId } }
  );
  return toOptions(response.account_types);
}

export async function getServiceOptionsByFamily(familyId: string) {
  const response = await catalogRequest<{ services?: Service[] }>("/get-services-by-family", {
    query: { family_id: familyId }
  });
  return toOptions(response.services);
}

export async function getServiceOptions() {
  const [response, providerCounts] = await Promise.all([
    catalogRequest<{ families?: ServiceFamily[] }>("/get-families-with-services"),
    getServiceProviderCounts().catch(() => [])
  ]);
  const services = response.families?.flatMap((family) => family.services ?? []) ?? [];
  const options = toOptions(services);

  return options.map((option) => {
    const availableService = providerCounts.find((service) =>
      Boolean(service.service_id) &&
      (service.provider_count ?? 0) > 0 &&
      normalizeServiceName(service.service_name) === normalizeServiceName(option.label)
    );

    return availableService?.service_id
      ? { ...option, value: availableService.service_id }
      : option;
  });
}

async function getServiceProviderCounts() {
  const response = await fetch(`${env.apiBaseUrl}/get-service-provider-counts`, {
    headers: {
      "x-api-key": env.providerApiKey
    }
  });

  if (!response.ok) {
    throw new Error(`Provider count request failed with status ${response.status}`);
  }

  const body = await response.json() as { families?: ServiceProviderCountFamily[] };
  return body.families?.flatMap((family) => family.services ?? []) ?? [];
}

function normalizeServiceName(value?: string | null) {
  return String(value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase();
}

export async function getServiceFamilyId(serviceId: string) {
  const response = await catalogRequest<{ service?: Service }>("/get-service-by-id-basic", {
    query: { service_id: serviceId }
  });

  return response.service?.family_id ?? null;
}

function toOptions(items: Array<Bank | Service | BankAccountType> | undefined): CatalogOption[] {
  return [...(items ?? [])]
    .sort((a, b) => {
      const orderA = "display_order" in a ? a.display_order ?? 0 : 0;
      const orderB = "display_order" in b ? b.display_order ?? 0 : 0;
      return orderA - orderB || String(a.name ?? "").localeCompare(String(b.name ?? ""));
    })
    .map((item): CatalogOption | null => {
      if (!item.id || !item.name) {
        return null;
      }

      return {
        label: item.name,
        submitValue: item.name,
        value: item.id
      };
    })
    .filter((option): option is CatalogOption => option != null);
}
