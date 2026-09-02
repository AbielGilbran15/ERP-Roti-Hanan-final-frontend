import { describe, expect, it } from "vitest";
import { calculateStockCountVariance, createStockCountDrafts, parseStockCountQuantity } from "@/lib/stock-count";
import type { StockCountLine } from "@/lib/types";

describe("stok opname", () => {
  it("membedakan input kosong dari angka nol", () => {
    expect(parseStockCountQuantity("")).toBeNull();
    expect(parseStockCountQuantity("   ")).toBeNull();
    expect(parseStockCountQuantity("0")).toBe(0);
  });

  it("menerima desimal titik maupun koma", () => {
    expect(parseStockCountQuantity("376.5")).toBe(376.5);
    expect(parseStockCountQuantity("376,5")).toBe(376.5);
    expect(parseStockCountQuantity("-1")).toBeNull();
    expect(parseStockCountQuantity("12kg")).toBeNull();
  });

  it("membangun kembali draft dari progres tersimpan", () => {
    const lines: StockCountLine[] = [{
      id: "line-1",
      stockId: "stock-1",
      productId: "raw-flour",
      warehouse: "Gudang Bahan Baku",
      lot: "TPG-001",
      systemQty: 376,
      countedQty: 375.5,
      varianceQty: -0.5,
      reason: "Susut",
    }];

    expect(createStockCountDrafts(lines)).toEqual({
      "line-1": { quantity: "375.5", reason: "Susut" },
    });
    expect(calculateStockCountVariance(375.5, 376)).toBe(-0.5);
  });
});
