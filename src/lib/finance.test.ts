import { describe, expect, it } from "vitest";
import {
  costOfGoodsSold,
  expenses,
  payrolls,
  products,
  sales,
} from "@/data/mock-data";
import {
  buildAutomaticHppForSale,
  calculateMonthlyOperatingProfit,
} from "@/lib/finance";

describe("perhitungan profit dan HPP", () => {
  it("membuat HPP dari jumlah yang benar-benar selesai terjual", () => {
    const sale = sales.find((item) => item.id === "sale-001")!;
    const hpp = buildAutomaticHppForSale(sale, products);

    expect(hpp).toMatchObject([
      { productId: "prd-roti-susu", quantity: 12, unitCost: 4120, amount: 49440, source: "Otomatis Penjualan" },
      { productId: "prd-roti-cokelat", quantity: 8, unitCost: 4680, amount: 37440, source: "Otomatis Penjualan" },
    ]);
  });

  it("menghasilkan profit demo yang konsisten dari penjualan, HPP, dan biaya periode yang sama", () => {
    const result = calculateMonthlyOperatingProfit({
      monthKey: "2026-08",
      payrollPeriod: "Agustus 2026",
      sales,
      salesReturns: [],
      costOfGoodsSold,
      expenses,
      payrolls,
    });

    expect(result).toEqual({
      grossRevenue: 5968000,
      returns: 0,
      netRevenue: 5968000,
      hpp: 2917680,
      postedExpenses: 3630000,
      payroll: 0,
      profit: -579680,
    });
  });
});
