import { apiRequest } from "./client";
import type { WalletTransaction } from "../types/api";

export type PaymentCheckout = {
  payment_id?: string | null;
  topup_id?: string | null;
  booking_id?: string | null;
  package_id?: string | null;
  preference_id?: string | null;
  checkout_url: string;
  sandbox_checkout_url?: string | null;
  status: string;
  amount?: number | null;
  credits?: number | null;
  currency?: string | null;
  simulated?: boolean;
};

type PaymentCheckoutApiResponse = Partial<PaymentCheckout> & {
  init_point?: string | null;
  sandbox_init_point?: string | null;
  payment?: {
    id?: string | null;
    booking_id?: string | null;
    status?: string | null;
    amount?: number | null;
    currency?: string | null;
  } | null;
};

export type BookingPayment = {
  id?: string | null;
  booking_id: string;
  method?: string | null;
  status: string;
  gross_amount?: number | null;
  platform_fee?: number | null;
  provider_net_amount?: number | null;
  currency?: string | null;
  paid_at?: string | null;
};

type BookingPaymentApiResponse = Partial<BookingPayment> & {
  payment_status?: string | null;
  price_amount?: number | null;
  payment?: (Partial<BookingPayment> & { payment_status?: string | null }) | null;
};

export type NodWallet = {
  wallet_id?: string | null;
  available_credits: number;
  pending_credits: number;
  currency: "CLP" | string;
};

export type CreditPackage = {
  id: string;
  name: string;
  credits: number;
  bonus_credits: number;
  total_credits: number;
  price_amount: number;
  currency: "CLP" | string;
};

export type WalletSummary = {
  wallet: NodWallet;
  packages: CreditPackage[];
  transactions: WalletTransaction[];
};

type WalletApiResponse = NodWallet & {
  packages?: Array<Partial<CreditPackage> & { id: string }>;
  transactions?: WalletTransaction[];
};

export async function getNodWallet(accessToken?: string | null): Promise<WalletSummary> {
  const response = await apiRequest<WalletApiResponse>("/wallet", {
    apiKeyKind: "customer",
    accessToken
  });

  return {
    wallet: {
      wallet_id: response.wallet_id,
      available_credits: Number(response.available_credits ?? 0),
      pending_credits: Number(response.pending_credits ?? 0),
      currency: response.currency ?? "CLP"
    },
    packages: (response.packages ?? []).map((item) => ({
      id: item.id,
      name: item.name ?? "Pack de Créditos NOD",
      credits: Number(item.credits ?? 0),
      bonus_credits: Number(item.bonus_credits ?? 0),
      total_credits: Number(item.total_credits ?? item.credits ?? 0),
      price_amount: Number(item.price_amount ?? 0),
      currency: item.currency ?? "CLP"
    })),
    transactions: response.transactions ?? []
  };
}

export async function createWalletTopUp({ accessToken, packageId }: { accessToken?: string | null; packageId: string }) {
  const response = await apiRequest<PaymentCheckoutApiResponse>("/wallet/topups", {
    method: "POST",
    body: { package_id: packageId },
    apiKeyKind: "customer",
    accessToken
  });
  return normalizeCheckout(response);
}

export function payBookingWithNodCredits({ accessToken, bookingId, idempotencyKey }: { accessToken?: string | null; bookingId: string; idempotencyKey?: string }) {
  return apiRequest<{ ok?: boolean; booking_id?: string; amount_debited?: number; remaining_balance?: number; status?: string; replayed?: boolean; payment?: unknown; balance?: unknown }>("/wallet/payments", {
    method: "POST",
    body: { booking_id: bookingId, idempotency_key: idempotencyKey ?? `mobile-booking-${bookingId}` },
    apiKeyKind: "customer",
    accessToken
  });
}

export async function createMercadoPagoCheckout({ accessToken, bookingId }: { accessToken?: string | null; bookingId: string }) {
  const response = await apiRequest<PaymentCheckoutApiResponse>("/payments/checkout", {
    method: "POST",
    body: { booking_id: bookingId },
    apiKeyKind: "customer",
    accessToken
  });
  return normalizeCheckout(response);
}

export async function getBookingPayment({ accessToken, bookingId }: { accessToken?: string | null; bookingId: string }) {
  const response = await apiRequest<BookingPaymentApiResponse>(`/payments/bookings/${bookingId}`, {
    apiKeyKind: "customer",
    accessToken
  });
  const payment = response.payment ?? {};
  return {
    ...payment,
    ...response,
    id: response.id ?? payment.id ?? null,
    booking_id: response.booking_id ?? payment.booking_id ?? bookingId,
    status: response.payment_status ?? response.status ?? payment.payment_status ?? payment.status ?? "unpaid",
    method: response.method ?? payment.method ?? null,
    gross_amount: response.gross_amount ?? payment.gross_amount ?? response.price_amount ?? null,
    platform_fee: response.platform_fee ?? payment.platform_fee ?? null,
    provider_net_amount: response.provider_net_amount ?? payment.provider_net_amount ?? null,
    currency: response.currency ?? payment.currency ?? null,
    paid_at: response.paid_at ?? payment.paid_at ?? null
  } satisfies BookingPayment;
}

function normalizeCheckout(response: PaymentCheckoutApiResponse): PaymentCheckout {
  const payment = response.payment ?? {};
  return {
    ...response,
    payment_id: response.payment_id ?? payment.id ?? null,
    booking_id: response.booking_id ?? payment.booking_id ?? null,
    preference_id: response.preference_id ?? null,
    checkout_url: response.checkout_url ?? response.init_point ?? "",
    sandbox_checkout_url: response.sandbox_checkout_url ?? response.sandbox_init_point ?? null,
    status: response.status ?? payment.status ?? "pending",
    amount: response.amount ?? payment.amount ?? null,
    currency: response.currency ?? payment.currency ?? null
  };
}
