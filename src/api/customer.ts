import { ApiError, apiRequest } from "./client";
import type {
  Customer,
  CustomerBooking,
  CustomerProvider,
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
  customerId,
  accessToken
}: {
  customerId: string;
  accessToken?: string | null;
}) {
  const response = await apiRequest<Customer | CustomerResponse>(`/customers/${customerId}`, {
    apiKeyKind: "customer",
    accessToken
  });

  return hasOwn(response, "customer")
    ? response.customer as Customer | undefined
    : hasOwn(response, "data")
      ? response.data as Customer | undefined
      : response as Customer;
}

export async function updateCustomerProfile({ customerId, values, accessToken }: {
  customerId: string;
  values: Partial<Pick<Customer, "full_name" | "first_name" | "last_name" | "phone" | "address" | "comuna" | "city">>;
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
  customerId,
  accessToken
}: {
  customerId: string;
  accessToken?: string | null;
}) {
  const response = await apiRequest<Pet[] | PetsResponse>("/pets", {
    query: { customer_id: customerId },
    apiKeyKind: "customer",
    accessToken
  });

  return Array.isArray(response) ? response : response.pets ?? response.data ?? [];
}

export async function createCustomerPet({
  customerId,
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
      customer_id: customerId,
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
  const response = await apiRequest<CustomerBooking[] | BookingsResponse>("/bookings", {
    query: { customer_id: customerId },
    apiKeyKind: "customer",
    accessToken
  });

  return Array.isArray(response) ? response : response.bookings ?? response.reservations ?? response.data ?? [];
}

export async function createBooking({
  customerId,
  providerId,
  petId,
  serviceId,
  startsAt,
  endsAt,
  address,
  notes,
  accessToken
}: {
  customerId: string;
  providerId: string;
  petId?: string | null;
  serviceId?: string | null;
  startsAt: string;
  endsAt: string;
  address: string;
  notes?: string | null;
  accessToken?: string | null;
}) {
  const response = await apiRequest<BookingResponse>("/bookings", {
    method: "POST",
    body: {
      customer_id: customerId,
      provider_id: providerId,
      pet_id: petId,
      service_id: serviceId,
      starts_at: startsAt,
      ends_at: endsAt,
      address,
      notes
    },
    apiKeyKind: "customer",
    accessToken
  });

  return getBookingFromResponse(response);
}

export async function cancelCustomerBooking({
  bookingId,
  reason,
  accessToken
}: {
  bookingId: string;
  reason?: string;
  accessToken?: string | null;
}) {
  const response = await apiRequest<BookingResponse>(`/bookings/${bookingId}/cancel`, {
    method: "POST",
    body: { reason },
    apiKeyKind: "customer",
    warnOnError: false,
    accessToken
  }).catch((currentError) => {
    if (currentError instanceof ApiError && currentError.status === 404) {
      return apiRequest<BookingResponse>("/cancel-booking", {
        method: "POST",
        body: { booking_id: bookingId, reason },
        apiKeyKind: "customer",
        accessToken
      });
    }

    throw currentError;
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
  const response = await apiRequest<ServiceLocation[] | RouteResponse>(`/bookings/${bookingId}/route`, {
    query: { booking_id: bookingId },
    apiKeyKind: "customer",
    warnOnError: false,
    accessToken
  }).catch((currentError) => {
    if (currentError instanceof ApiError && currentError.status === 404) {
      return apiRequest<ServiceLocation[] | RouteResponse>("/get-service-route", {
        query: { booking_id: bookingId },
        apiKeyKind: "customer",
        accessToken
      });
    }

    throw currentError;
  });

  if (Array.isArray(response)) {
    return { route: response, distance_meters: undefined, duration_seconds: undefined };
  }

  return {
    route: response.route ?? response.locations ?? [],
    distance_meters: response.distance_meters,
    duration_seconds: response.duration_seconds
  };
}

export async function getCustomerServicePhotos({
  bookingId,
  accessToken
}: {
  bookingId: string;
  accessToken?: string | null;
}) {
  const response = await apiRequest<ServicePhoto[] | PhotosResponse>(`/bookings/${bookingId}/photos`, {
    query: { booking_id: bookingId },
    apiKeyKind: "customer",
    warnOnError: false,
    accessToken
  }).catch((currentError) => {
    if (currentError instanceof ApiError && currentError.status === 404) {
      return apiRequest<ServicePhoto[] | PhotosResponse>("/get-service-photos", {
        query: { booking_id: bookingId },
        apiKeyKind: "customer",
        accessToken
      });
    }

    throw currentError;
  });

  return Array.isArray(response) ? response : response.photos ?? [];
}

export async function getCustomerWallet({
  customerId,
  accessToken
}: {
  customerId: string;
  accessToken?: string | null;
}) {
  const purchases = await apiRequest<WalletTransaction[] | { purchases?: WalletTransaction[]; data?: WalletTransaction[] }>("/purchases", {
    query: { customer_id: customerId },
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
  customerId,
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
      user_id: customerId,
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

export function createCustomerReview({ customerId, bookingId, providerId, rating, comment, accessToken }: {
  customerId: string; bookingId: string; providerId: string; rating: number; comment?: string | null; accessToken?: string | null;
}) {
  return apiRequest("/create-provider-review", {
    method: "POST",
    body: { customer_id: customerId, booking_id: bookingId, provider_id: providerId, rating, comment },
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

function hasOwn<T extends object, K extends PropertyKey>(value: T, key: K): value is T & Record<K, unknown> {
  return Object.prototype.hasOwnProperty.call(value, key);
}
