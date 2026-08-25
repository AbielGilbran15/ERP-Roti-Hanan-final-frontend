import { describe, expect, it } from "vitest";
import { calculatePurchaseConversion, convertUnit, describeUnitCompatibility } from "@/lib/units";

describe("konversi satuan otomatis", () => {
  it("mengonversi satuan berat dalam kelompok yang sama", () => {
    expect(convertUnit(15, "Kg", "Gram")).toBe(15000);
    expect(convertUnit(1500, "Gram", "Kg")).toBe(1.5);
    expect(convertUnit(1, "Ton", "Kg")).toBe(1000);
  });

  it("mengonversi volume dan jumlah memakai faktor standar", () => {
    expect(convertUnit(2, "Liter", "Ml")).toBe(2000);
    expect(convertUnit(3, "Lusin", "Pcs")).toBe(36);
    expect(convertUnit(2, "Gross", "Pcs")).toBe(288);
  });

  it("menghitung isi satu kemasan ke satuan stok", () => {
    expect(calculatePurchaseConversion(15, "Kg", "Gram")).toBe(15000);
    expect(calculatePurchaseConversion(100, "Pcs", "Pcs")).toBe(100);
  });

  it("menolak konversi beda kelompok dan antar-kemasan", () => {
    expect(convertUnit(1, "Kg", "Liter")).toBeNull();
    expect(convertUnit(1, "Liter", "Pcs")).toBeNull();
    expect(convertUnit(1, "Pack", "Pcs")).toBeNull();
    expect(describeUnitCompatibility("Kg", "Liter")).toMatch(/tidak dapat dikonversi/i);
  });
});
