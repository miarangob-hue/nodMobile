import { describe, expect, it } from "vitest";
import { normalizeBookingStatus, normalizeText } from "./normalization";

describe("normalización", () => {
  it("iguala comunas con tildes, mayúsculas y espacios", () => {
    expect(normalizeText("  ÑUÑOA ")).toBe("nunoa");
    expect(normalizeText("San José de Maipo")).toBe("san jose de maipo");
  });

  it("normaliza estados del backend", () => {
    expect(normalizeBookingStatus(" In Progress ")).toBe("in_progress");
    expect(normalizeBookingStatus("pending-provider")).toBe("pending_provider");
  });
});
