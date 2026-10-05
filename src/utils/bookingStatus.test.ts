import { describe, expect, it } from "vitest";
import { canProviderAcceptStatus, isActiveStatus, isTerminalStatus, isUpcomingStatus } from "./bookingStatus";

describe("estados de reserva", () => {
  it.each(["pending", "requested", "scheduled", "accepted"])("clasifica %s como próxima", (status) => {
    expect(isUpcomingStatus(status)).toBe(true);
  });

  it.each(["in progress", "started", "paused"])("clasifica %s como activa", (status) => {
    expect(isActiveStatus(status)).toBe(true);
  });

  it.each(["completed", "cancelled", "rejected"])("clasifica %s como terminal", (status) => {
    expect(isTerminalStatus(status)).toBe(true);
  });

  it("impide aceptar estados de pago o terminados", () => {
    expect(canProviderAcceptStatus("awaiting_provider")).toBe(true);
    expect(canProviderAcceptStatus("pending_payment")).toBe(false);
    expect(canProviderAcceptStatus("completed")).toBe(false);
  });
});
