import { describe, expect, it } from "vitest";
import {
  assertWorkflowTransition,
  expenseTransitions,
  goodsReceiptTransitions,
  payrollTransitions,
  productionTransitions,
  purchaseOrderTransitions,
  stockCountTransitions,
} from "@/lib/workflows";

describe("workflow final tanpa pemeriksaan mutu dan Persetujuan Owner", () => {
  it("menyelesaikan produksi langsung dari Berjalan ke Selesai", () => {
    expect(() => assertWorkflowTransition("produksi", productionTransitions, "Berjalan", "Selesai")).not.toThrow();
    expect(productionTransitions.Berjalan).toEqual(["Selesai"]);
  });

  it("memproses PO dan penerimaan langsung", () => {
    expect(purchaseOrderTransitions.Draft).toEqual(["Dipesan"]);
    expect(goodsReceiptTransitions["Diterima Fisik"]).toEqual(["Selesai"]);
  });

  it("memproses biaya, payroll, dan koreksi stok tanpa keputusan Owner", () => {
    expect(expenseTransitions.Draft).toEqual(["Disetujui"]);
    expect(payrollTransitions.Draft).toEqual(["Disetujui"]);
    expect(stockCountTransitions["Sedang Dihitung"]).toEqual(["Siap Diposting"]);
  });

  it("menolak transisi yang melompati tahapan operasional", () => {
    expect(() => assertWorkflowTransition("produksi", productionTransitions, "Menunggu Gudang", "Berjalan")).toThrow(/tidak diizinkan/i);
    expect(() => assertWorkflowTransition("stok opname", stockCountTransitions, "Sedang Dihitung", "Diposting")).toThrow(/tidak diizinkan/i);
  });
});
