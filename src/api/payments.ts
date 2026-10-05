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

export function createWalletTopUp({ accessToken, packageId }: { accessToken?: string | null; packageId: string }) {
  return apiRequest<PaymentCheckout>("/wallet/topups", {
    method: "POST",
    body: { package_id: packageId },
    apiKeyKind: "customer",
    accessToken
  });
}

export function payBookingWithNodCredits({ accessToken, bookingId }: { accessToken?: string | null; bookingId: string }) {
  return apiRequest<{ ok: boolean; booking_id: string; amount_debited: number; remaining_balance: number; status: string }>("/wallet/payments", {
    method: "POST",
    body: { booking_id: bookingId },
    apiKeyKind: "customer",
    accessToken
  });
}

export function createMercadoPagoCheckout({ accessToken, bookingId }: { accessToken?: string | null; bookingId: string }) {
  return apiRequest<PaymentCheckout>("/payments/checkout", {
    method: "POST",
    body: { booking_id: bookingId },
    apiKeyKind: "customer",
    accessToken
  });
}

export function getBookingPayment({ accessToken, bookingId }: { accessToken?: string | null; bookingId: string }) {
  return apiRequest<BookingPayment>(`/payments/bookings/${bookingId}`, {
    apiKeyKind: "customer",
    accessToken
  });
}
