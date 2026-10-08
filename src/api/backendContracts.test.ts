import { afterEach, describe, expect, it, vi } from "vitest";
import { createBooking, getCustomerBookings } from "./customer";
import { getCommunityFeed } from "./community";
import { createHostingBooking, searchHosting } from "./hosting";
import { getProviderBalance, sendChatMessage } from "./provider";

function mockJsonResponse(body: unknown) {
  const fetchMock = vi.fn().mockResolvedValue({
    ok: true,
    status: 200,
    text: async () => JSON.stringify(body)
  });
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

afterEach(() => vi.unstubAllGlobals());

describe("session-scoped backend contracts", () => {
  it("lists customer bookings through nod-api with API key and Bearer", async () => {
    const fetchMock = mockJsonResponse({ bookings: [] });

    await getCustomerBookings({ customerId: "customer-id", accessToken: "customer-token" });

    const [url, options] = fetchMock.mock.calls[0];
    expect(url).toContain("/nod-api/bookings");
    expect(url).not.toContain("customer_id");
    expect(options.headers.Authorization).toBe("Bearer customer-token");
    expect(options.headers["x-api-key"]).toBeDefined();
  });

  it("creates bookings without trusting a caller-supplied customer id", async () => {
    const fetchMock = mockJsonResponse({ booking: { id: "booking-id", status: "pending" } });

    await createBooking({
      customerId: "untrusted-customer-id",
      providerId: "selected-provider-id",
      startsAt: "2026-10-10T10:00:00.000Z",
      endsAt: "2026-10-10T11:00:00.000Z",
      address: "Providencia",
      accessToken: "customer-token"
    });

    const [url, options] = fetchMock.mock.calls[0];
    const body = JSON.parse(options.body);
    expect(url).toContain("/nod-api/bookings");
    expect(body.customer_id).toBeUndefined();
    expect(body.provider_id).toBe("selected-provider-id");
    expect(options.headers.Authorization).toBe("Bearer customer-token");
  });

  it("keeps both authentication headers for the social feed", async () => {
    const fetchMock = mockJsonResponse({ posts: [] });

    await getCommunityFeed({ userId: "ignored-user-id", accessToken: "customer-token" });

    const [url, options] = fetchMock.mock.calls[0];
    expect(url).not.toContain("user_id");
    expect(options.headers.Authorization).toBe("Bearer customer-token");
    expect(options.headers["x-api-key"]).toBeDefined();
  });

  it("loads provider financial data from the authenticated identity", async () => {
    const fetchMock = mockJsonResponse({ balance: { available: 0 } });

    await getProviderBalance({ providerId: "ignored-provider-id", accessToken: "provider-token" });

    const [url, options] = fetchMock.mock.calls[0];
    expect(url).not.toContain("provider_id");
    expect(options.headers.Authorization).toBe("Bearer provider-token");
    expect(options.headers["x-api-key"]).toBeDefined();
  });

  it("loads housing directly from Provider as its single source of truth", async () => {
    const fetchMock = mockJsonResponse({ items: [{ id: "host-id", provider_id: "provider-id" }], total: 1 });

    const result = await searchHosting({ comuna: "Providencia", accessToken: "customer-token" });

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock.mock.calls[0][0]).toContain("/search-hosting");
    expect(fetchMock.mock.calls[0][0]).not.toContain("/nod-api/");
    expect(result.items[0]).toMatchObject({ id: "host-id", provider_id: "provider-id" });
  });

  it("creates housing with the authenticated Customer identity instead of a caller id", async () => {
    const fetchMock = mockJsonResponse({ booking: { id: "housing-booking", status: "pending" } });

    await createHostingBooking({
      hostingProfileId: "host-id",
      providerId: "provider-id",
      customerId: "untrusted-customer-id",
      checkIn: "2026-12-10",
      checkOut: "2026-12-12",
      petIds: ["pet-id"],
      price: 50000,
      accessToken: "customer-token"
    });

    const [url, options] = fetchMock.mock.calls[0];
    const body = JSON.parse(options.body);
    expect(url).toContain("/create-booking-request");
    expect(body.customer_id).toBeUndefined();
    expect(body.payment_status).toBeUndefined();
    expect(options.headers.Authorization).toBe("Bearer customer-token");
  });

  it("sends booking chat content using the deployed body field", async () => {
    const fetchMock = mockJsonResponse({ message: { id: "message-id", chat_id: "chat-id", sender_id: "customer-id", body: "Hola", created_at: "2026-10-08T00:00:00Z" } });

    await sendChatMessage({ chatId: "booking-id", senderId: "customer-id", text: "Hola", accessToken: "customer-token" });

    const [, options] = fetchMock.mock.calls[0];
    expect(JSON.parse(options.body)).toEqual({ booking_id: "booking-id", body: "Hola" });
  });
});
