import { env } from "../config/env";
import type { ApiErrorBody } from "../types/api";

type RequestOptions = {
  method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  query?: Record<string, string | number | boolean | undefined | null>;
  body?: unknown;
  accessToken?: string | null;
  apiKeyKind?: "provider" | "customer";
  warnOnError?: boolean;
};

export class ApiError extends Error {
  status: number;
  body: unknown;

  constructor(status: number, body: unknown) {
    const parsed = body as ApiErrorBody;
    super(parsed?.error ?? parsed?.message ?? `API request failed with status ${status}`);
    this.name = "ApiError";
    this.status = status;
    this.body = body;
  }
}

function getBaseUrl(apiKeyKind: RequestOptions["apiKeyKind"]) {
  if (apiKeyKind === "customer") {
    return env.customerApiBaseUrl;
  }

  return env.apiBaseUrl;
}

function buildUrl(path: string, query?: RequestOptions["query"], apiKeyKind?: RequestOptions["apiKeyKind"]) {
  const url = new URL(`${getBaseUrl(apiKeyKind)}${path}`);

  Object.entries(query ?? {}).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "") {
      url.searchParams.set(key, String(value));
    }
  });

  return url.toString();
}

function getApiKey(apiKeyKind: RequestOptions["apiKeyKind"]) {
  if (apiKeyKind === "customer") {
    return env.customerApiKey || env.providerApiKey;
  }

  return env.providerApiKey;
}

function buildHeaders(accessToken?: string | null, contentType?: string, apiKeyKind?: RequestOptions["apiKeyKind"]) {
  const headers: Record<string, string> = {
    "x-api-key": getApiKey(apiKeyKind)
  };

  if (contentType) {
    headers["Content-Type"] = contentType;
  }

  if (accessToken) {
    headers.Authorization = `Bearer ${accessToken}`;
  }

  return headers;
}

async function parseResponse(path: string, method: string, response: Response, warnOnError = true) {
  const text = await response.text();
  let body: unknown = null;

  try {
    body = text ? JSON.parse(text) : null;
  } catch {
    body = text ? { message: text } : null;
  }

  if (!response.ok) {
    if (warnOnError) {
      console.warn("[NOD API]", {
        path,
        method,
        status: response.status,
        body
      });
    }
    throw new ApiError(response.status, body);
  }

  return body;
}

export async function apiRequest<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const url = buildUrl(path, options.query, options.apiKeyKind);
  const method = options.method ?? "GET";
  const response = await fetch(url, {
    method,
    headers: buildHeaders(options.accessToken, "application/json", options.apiKeyKind),
    body: options.body ? JSON.stringify(options.body) : undefined
  });

  return (await parseResponse(path, method, response, options.warnOnError)) as T;
}

export async function apiFormRequest<T>(
  path: string,
  formData: FormData,
  accessToken?: string | null,
  apiKeyKind?: RequestOptions["apiKeyKind"]
): Promise<T> {
  const method = "POST";
  const response = await fetch(buildUrl(path, undefined, apiKeyKind), {
    method,
    headers: buildHeaders(accessToken, undefined, apiKeyKind),
    body: formData
  });

  return (await parseResponse(path, method, response)) as T;
}
