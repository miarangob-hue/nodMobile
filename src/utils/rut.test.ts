import { describe, expect, it } from "vitest";
import { formatChileanRut, getChileanRutVerifier, isValidChileanRut, normalizeChileanRut } from "./rut";

describe("RUT chileno", () => {
  it.each(["12.345.678-5", "12345678-5", "6.376.437-K", "6376437-k"])("valida %s", (rut) => {
    expect(isValidChileanRut(rut)).toBe(true);
  });

  it.each(["12.345.678-4", "123456785", "1-8", "abc"])("rechaza %s", (rut) => {
    expect(isValidChileanRut(rut)).toBe(false);
  });

  it("formatea, normaliza y calcula módulo 11", () => {
    expect(formatChileanRut("123456785")).toBe("12.345.678-5");
    expect(normalizeChileanRut(" 6.376.437-k ")).toBe("6376437-K");
    expect(getChileanRutVerifier("6376437")).toBe("K");
  });
});
