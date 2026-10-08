import { ApiError, apiRequest } from "./client";
import type {
  Customer,
  CustomerBooking,
  CustomerProvider,
  NotificationItem,
  Pet,
  ServiceLocation,
  ServicePhoto,
  SupportTicket,
  WalletTransaction
} from "../types/api";

type CustomerResponse = {
  customer?: Customer;
  data?: Customer;
};

type CustomersResponse = {
  customers?: Customer[];
  data?: Customer[];
  total?: number;
};

type PetsResponse = {
  pets?: Pet[];
  data?: Pet[];
};

type PetResponse = {
  pet?: Pet;
};

type ProvidersResponse = {
  providers?: CustomerProvider[];
  total?: number;
};

type BookingsResponse = {
  bookings?: CustomerBooking[];
  reservations?: CustomerBooking[];
  data?: CustomerBooking[];
};

type BookingResponse = CustomerBooking | {
  booking?: CustomerBooking;
  reservation?: CustomerBooking;
};

type RouteResponse = {
  route?: ServiceLocation[];
  locations?: ServiceLocation[];
  distance_meters?: number;
  duration_seconds?: number;
};

type PhotosResponse = {
  photos?: ServicePhoto[];
};

type WalletResponse = {
  transactions?: WalletTransaction[];
  purchases?: WalletTransaction[];
  payment_methods?: PaymentMethod[];
  benefits?: CustomerBenefit[];
};

export type PaymentMethod = {
  id: string;
  brand?: string | null;
  last4?: string | null;
  type?: string | null;
  is_default?: boolean;
};

export type CustomerBenefit = {
  id: string;
  title: string;
  description?: string | null;
  code?: string | null;
  expires_at?: string | null;
};

export async function listCustomers({
  limit = 50,
  offset = 0,
  search,
  accessToken
}: {
  limit?: number;
  offset?: number;
  search?: string | null;
  accessToken?: string | null;
}) {
  const response = await apiRequest<Customer[] | CustomersResponse>("/customers", {
    query: { limit, offset, search },
    apiKeyKind: "customer",
    accessToken
  });

  return Array.isArray(response) ? {
    customers: response,
    total: response.length
  } : {
    customers: response.customers ?? response.data ?? [],
    total: response.total ?? response.customers?.length ?? response.data?.length ?? 0
  };
}

export async function getCustomerProfile({
  customerId: _customerId,
  accessToken
}: {
  customerId: string;
  accessToken?: string | null;
}) {
  const response = await apiRequest<Customer | CustomerResponse | Customer[] | CustomersResponse>("/customers", {
    apiKeyKind: "customer",
    accessToken
  });

  if (Array.isArray(response)) return response[0];
  return hasOwn(response, "customer")
    ? response.customer as Customer | undefined
    : hasOwn(response, "data")
      ? (Array.isArray(response.data) ? response.data[0] : response.data) as Customer | undefined
      : hasOwn(response, "customers")
        ? (response.customers as Customer[] | undefined)?.[0]
      : response as Customer;
}

export async function updateCustomerProfile({ customerId, values, accessToken }: {
  customerId: string;
  values: Partial<Pick<Customer, "full_name" | "first_name" | "last_name" | "phone" | "rut" | "address" | "comuna" | "city">>;
  accessToken?: string | null;
}) {
  const response = await apiRequest<Customer | CustomerResponse>(`/customers/${customerId}`, {
    method: "PUT",
    body: values,
    apiKeyKind: "customer",
    accessToken
  });
  return hasOwn(response, "customer") ? response.customer as Customer : hasOwn(response, "data") ? response.data as Customer : response as Customer;
}

export async function getCustomerPets({
  customerId: _customerId,
  accessToken
}: {
  customerId: string;
  accessToken?: string | null;
}) {
  const response = await apiRequest<Pet[] | PetsResponse>("/pets", {
    apiKeyKind: "customer",
    accessToken
  });

  return Array.isArray(response) ? response : response.pets ?? response.data ?? [];
}

export async function createCustomerPet({
  customerId: _customerId,
  name,
  species,
  breed,
  size,
  ageYears,
  notes,
  accessToken
}: {
  customerId: string;
  name: string;
  species?: string | null;
  breed?: string | null;
  size?: string | null;
  ageYears?: number | null;
  notes?: string | null;
  accessToken?: string | null;
}) {
  const response = await apiRequest<Pet | PetResponse>("/pets", {
    method: "POST",
    body: {
      name,
      species,
      breed,
      size,
      age_years: ageYears,
      notes
    },
    apiKeyKind: "customer",
    accessToken
  });

  return hasOwn(response, "pet") ? response.pet as Pet | undefined : response as Pet;
}

export async function searchProviders({
  serviceId,
  comuna,
  startsAt,
  accessToken
}: {
  serviceId?: string | null;
  comuna?: string | null;
  startsAt?: string | null;
  accessToken?: string | null;
}) {
  const response = await apiRequest<CustomerProvider[] | ProvidersResponse>("/providers", {
    query: { service_id: serviceId, comuna, starts_at: startsAt },
    apiKeyKind: "customer",
    warnOnError: false,
    accessToken
  }).catch((currentError) => {
    if (currentError instanceof ApiError && currentError.status === 404) {
      return { providers: [], total: 0 };
    }

    throw currentError;
  });

  const normalized = Array.isArray(response) ? { providers: response, total: response.length } : {
    providers: response.providers ?? [],
    total: response.total ?? response.providers?.length ?? 0
  };

  if (!serviceId || normalized.providers.length === 0) return normalized;

  const legacy = await apiRequest<{ providers?: Array<CustomerProvider & { services_completed?: number }> }>("/get-providers-by-service", {
    query: { service_id: serviceId },
    accessToken,
    warnOnError: false
  }).catch(() => ({ providers: [] }));
  const legacyById = new Map((legacy.providers ?? []).map((provider) => [provider.id, provider]));

  return {
    ...normalized,
    providers: normalized.providers.map((provider) => {
      const details = legacyById.get(provider.id);
      return details ? {
        ...provider,
        latitude: details.latitude,
        longitude: details.longitude,
        completed_services: provider.completed_services ?? details.services_completed
      } : provider;
    })
  };
}

export async function getCustomerBookings({
  customerId,
  accessToken
}: {
  customerId: string;
  accessToken?: string | null;
}) {
  const response = await apiRequest<CustomerBooking[] | BookingsResponse>("/get-customer-bookings", {
    query: { customer_id: customerId },
    accessToken
  });

  const bookings = Array.isArray(response) ? response : response.bookings ?? response.reservations ?? response.data ?? [];
  return bookings.map(hydrateProviderBookingMetadata);
}

export async function createBooking({
  customerId: _customerId,
  providerId,
  petId,
  petName,
  providerName,
  serviceId,
  startsAt,
  endsAt,
  address,
  comuna,
  city,
  latitude,
  longitude,
  price,
  currency,
  notes,
  accessToken
}: {
  customerId: string;
  providerId: string;
  petId?: string | null;
  petName?: string | null;
  providerName?: string | null;
  serviceId?: string | null;
  startsAt: string;
  endsAt: string;
  address: string;
  comuna?: string | null;
  city?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  price?: number | null;
  currency?: string | null;
  notes?: string | null;
  accessToken?: string | null;
}) {
  const response = await apiRequest<BookingResponse>("/create-booking-request", {
    method: "POST",
    body: {
      provider_id: providerId,
      service_id: serviceId,
      starts_at: startsAt,
      ends_at: endsAt,
      price,
      currency: currency ?? "CLP",
      notes: appendProviderBookingMetadata(notes, {
        pet_id: petId,
        pet_name: petName,
        provider_name: providerName,
        address,
        comuna,
        city,
        latitude,
        longitude,
        price,
        currency
      })
    },
    accessToken
  });

  const booking = getBookingFromResponse(response);
  return booking ? hydrateProviderBookingMetadata({
    ...booking,
    pet_id: booking.pet_id ?? petId,
    pet_name: booking.pet_name ?? petName,
    provider_name: booking.provider_name ?? providerName,
    address: booking.address ?? address,
    comuna: booking.comuna ?? comuna,
    city: booking.city ?? city,
    latitude: booking.latitude ?? latitude,
    longitude: booking.longitude ?? longitude
  }) : undefined;
}

export async function cancelCustomerBooking({
  bookingId,
  customerId: _customerId,
  reason,
  refundDestination: _refundDestination,
  accessToken
}: {
  bookingId: string;
  customerId: string;
  reason?: string;
  refundDestination?: "original_payment_method" | "nod_credits";
  accessToken?: string | null;
}) {
  const response = await apiRequest<BookingResponse>("/cancel-booking", {
    method: "POST",
    body: {
      booking_id: bookingId,
      reason
    },
    accessToken
  });

  return getBookingFromResponse(response);
}

export async function getCustomerServiceRoute({
  bookingId,
  accessToken
}: {
  bookingId: string;
  accessToken?: string | null;
}) {
  const response = await apiRequest<ServiceLocation[] | RouteResponse>("/get-service-route", {
    query: { booking_id: bookingId },
    accessToken
  });

  const normalized = Array.isArray(response) ? {
    route: response,
    distance_meters: undefined,
    duration_seconds: undefined
  } : {
    route: response.route ?? response.locations ?? [],
    distance_meters: response.distance_meters,
    duration_seconds: response.duration_seconds
  };

  return normalized;
}

export async function getCustomerServicePhotos({
  bookingId,
  accessToken
}: {
  bookingId: string;
  accessToken?: string | null;
}) {
  const response = await apiRequest<ServicePhoto[] | PhotosResponse>("/get-service-photos", {
    query: { booking_id: bookingId },
    warnOnError: false,
    accessToken
  });

  return Array.isArray(response) ? response : response.photos ?? [];
}

export async function getCustomerWallet({
  customerId: _customerId,
  accessToken
}: {
  customerId: string;
  accessToken?: string | null;
}) {
  const purchases = await apiRequest<WalletTransaction[] | { purchases?: WalletTransaction[]; data?: WalletTransaction[] }>("/purchases", {
    apiKeyKind: "customer",
    accessToken
  }).catch((): { purchases?: WalletTransaction[]; data?: WalletTransaction[] } => ({ purchases: [] }));

  const transactions = Array.isArray(purchases) ? purchases : purchases.purchases ?? purchases.data ?? [];

  return {
    transactions,
    purchases: transactions,
    payment_methods: [],
    benefits: []
  };
}

export async function createCustomerSupportTicket({
  customerId: _customerId,
  bookingId,
  category,
  subject,
  message,
  accessToken
}: {
  customerId: string;
  bookingId?: string | null;
  category: string;
  subject: string;
  message: string;
  accessToken?: string | null;
}) {
  const response = await apiRequest<SupportTicket | { ticket?: SupportTicket }>("/create-support-ticket", {
    method: "POST",
    body: {
      booking_id: bookingId,
      category,
      subject,
      message
    },
    apiKeyKind: "customer",
    accessToken
  });

  return hasOwn(response, "ticket") ? response.ticket as SupportTicket | undefined : response as SupportTicket;
}

export async function getCustomerNotifications(accessToken?: string | null, limit = 30, offset = 0) {
  const response = await apiRequest<NotificationItem[] | { notifications?: NotificationItem[]; data?: NotificationItem[]; total?: number }>("/notifications", {
    query: { limit, offset },
    apiKeyKind: "customer",
    accessToken
  });
  const notifications = Array.isArray(response) ? response : response.notifications ?? response.data ?? [];
  return { notifications, total: Array.isArray(response) ? response.length : response.total ?? notifications.length };
}

export function markCustomerNotificationRead(notificationId: string, accessToken?: string | null) {
  return apiRequest<{ ok: boolean; read_at?: string }>(`/notifications/${encodeURIComponent(notificationId)}/read`, {
    method: "POST",
    body: {},
    apiKeyKind: "customer",
    accessToken
  });
}

export function createCustomerReview({ customerId: _customerId, bookingId, providerId, rating, comment, accessToken }: {
  customerId: string; bookingId: string; providerId: string; rating: number; comment?: string | null; accessToken?: string | null;
}) {
  return apiRequest("/create-provider-review", {
    method: "POST",
    body: { booking_id: bookingId, provider_id: providerId, rating, comment },
    apiKeyKind: "customer",
    accessToken
  });
}

export type AccountDeletionRequest = {
  id: string;
  status: string;
  requested_at?: string | null;
  scheduled_for?: string | null;
  reason?: string | null;
};

export async function createAccountDeletionRequest({ reason, accessToken }: {
  reason?: string | null;
  accessToken?: string | null;
}) {
  const response = await apiRequest<AccountDeletionRequest | { request?: AccountDeletionRequest }>("/account-deletion-requests", {
    method: "POST",
    body: { reason },
    apiKeyKind: "customer",
    accessToken
  });

  return hasOwn(response, "request") ? response.request as AccountDeletionRequest | undefined : response as AccountDeletionRequest;
}

export async function getCurrentAccountDeletionRequest(accessToken?: string | null) {
  const response = await apiRequest<AccountDeletionRequest | { request?: AccountDeletionRequest }>("/account-deletion-requests/current", {
    apiKeyKind: "customer",
    warnOnError: false,
    accessToken
  }).catch((error) => {
    if (error instanceof ApiError && error.status === 404) return null;
    throw error;
  });

  if (!response) return null;
  return hasOwn(response, "request") ? response.request as AccountDeletionRequest | undefined ?? null : response as AccountDeletionRequest;
}

export async function cancelAccountDeletionRequest(requestId: string, accessToken?: string | null) {
  return apiRequest<{ ok: boolean; status?: string }>(`/account-deletion-requests/${encodeURIComponent(requestId)}/cancel`, {
    method: "POST",
    body: {},
    apiKeyKind: "customer",
    accessToken
  });
}

function getBookingFromResponse(response: BookingResponse | null | undefined) {
  if (!response) {
    return undefined;
  }

  if (hasOwn(response, "booking")) {
    return response.booking as CustomerBooking | undefined;
  }

  if (hasOwn(response, "reservation")) {
    return response.reservation as CustomerBooking | undefined;
  }

  return response as CustomerBooking;
}

const providerBookingMetadataPrefix = "[NOD_MOBILE_META]";

type ProviderBookingMetadata = Pick<CustomerBooking,
  "pet_id" | "pet_name" | "provider_name" | "address" | "comuna" | "city" | "latitude" | "longitude" | "price" | "currency"
>;

function appendProviderBookingMetadata(notes: string | null | undefined, metadata: ProviderBookingMetadata) {
  const encoded = JSON.stringify(metadata);
  return [notes?.trim(), `${providerBookingMetadataPrefix}${encoded}`].filter(Boolean).join("\n");
}

function hydrateProviderBookingMetadata(booking: CustomerBooking) {
  const marker = booking.notes?.lastIndexOf(providerBookingMetadataPrefix) ?? -1;
  if (marker < 0) return booking;

  try {
    const metadata = JSON.parse(booking.notes!.slice(marker + providerBookingMetadataPrefix.length)) as ProviderBookingMetadata;
    return {
      ...metadata,
      ...booking,
      pet_id: booking.pet_id ?? metadata.pet_id,
      pet_name: booking.pet_name ?? metadata.pet_name,
      provider_name: booking.provider_name ?? metadata.provider_name,
      address: booking.address ?? metadata.address,
      comuna: booking.comuna ?? metadata.comuna,
      city: booking.city ?? metadata.city,
      latitude: booking.latitude ?? metadata.latitude,
      longitude: booking.longitude ?? metadata.longitude,
      price: booking.price ?? metadata.price,
      currency: booking.currency ?? metadata.currency,
      notes: booking.notes!.slice(0, marker).trim() || null
    };
  } catch {
    return booking;
  }
}

function hasOwn<T extends object, K extends PropertyKey>(value: T, key: K): value is T & Record<K, unknown> {
  return Object.prototype.hasOwnProperty.call(value, key);
}
