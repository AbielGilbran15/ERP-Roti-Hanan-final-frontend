import { beforeEach, describe, expect, it } from "vitest";
import { users as demoUsers } from "@/data/mock-data";
import { useERPStore } from "@/store/use-erp-store";

const login = (username: string) => {
  expect(useERPStore.getState().login(username, "hanan123")).toEqual({ ok: true });
};

describe("alur ERP final", () => {
  beforeEach(() => {
    localStorage.clear();
    useERPStore.getState().resetDemo();
  });

  it("menerima seluruh akun demo tanpa role pemeriksa mutu", () => {
    expect(demoUsers.map((user) => user.role)).not.toContain("QC Inspector");
    for (const user of demoUsers) {
      login(user.username);
      expect(useERPStore.getState().currentUserId).toBe(user.id);
      useERPStore.getState().logout();
    }
  });

  it("mengonversi stok minimum dari Satuan Isi ke Satuan Stok", () => {
    login("asep");
    const topping = useERPStore.getState().products.find((product) => product.id === "topping-cokelat")!;
    const saved = useERPStore.getState().saveProduct({
      ...topping,
      purchaseContentUnit: "Kg",
      stockUnit: "Gram",
      minStockInputValue: 10,
      minStockInputUnit: "Kg",
    });

    expect(saved.minStockInputValue).toBe(10);
    expect(saved.minStockInputUnit).toBe("Kg");
    expect(saved.minStock).toBe(10000);
    expect(saved.stockUnit).toBe("Gram");
  });

  it("menyimpan HPP pada Master Barang Jadi", () => {
    login("asep");
    const product = useERPStore.getState().products.find((item) => item.id === "prd-roti-cokelat")!;
    const saved = useERPStore.getState().saveProduct({ ...product, cost: 5250 });

    expect(saved.cost).toBe(5250);
    const stockValue = useERPStore.getState().stocks
      .filter((stock) => stock.productId === saved.id && stock.warehouse === "Gudang Produk Jadi")
      .reduce((sum, stock) => sum + stock.onHand * saved.cost, 0);
    expect(stockValue).toBeGreaterThan(0);
  });

  it("memproses biaya besar dan payroll langsung oleh Finance", () => {
    login("siti.finance");
    useERPStore.getState().addExpense("Produksi", "Perawatan", "Teknisi Oven", 900000);
    useERPStore.getState().runPayroll();

    expect(useERPStore.getState().expenses[0]).toMatchObject({ amount: 900000, status: "Disetujui" });
    expect(useERPStore.getState().payrolls.every((item) => item.status === "Disetujui")).toBe(true);
    expect("approvals" in useERPStore.getState()).toBe(false);
  });

  it("memblokir penjualan langsung saat stok kurang tetapi menerima pesanan agen", () => {
    login("sales.pusat");
    expect(() => useERPStore.getState().addSale({
      salesAdminId: "usr-rina",
      customerId: "cust-sari",
      items: [{ productId: "prd-roti-susu", quantity: 999999 }],
      discount: 0,
      paymentMethod: "Tunai",
    })).toThrow(/stok Barang Jadi/i);

    const order = useERPStore.getState().addAgentOrder({
      salesAdminId: "usr-rina",
      customerId: "cust-sari",
      items: [{ productId: "prd-roti-susu", quantity: 999999 }],
      discount: 0,
      paymentMethod: "Transfer",
      orderSource: "WhatsApp",
      fulfillmentMethod: "Diambil",
      paidAmount: 0,
      neededAt: "2026-09-10T08:00:00+07:00",
    });

    expect(order.status).toBe("Menunggu Produksi");
    expect(order.stockAllocations?.length).toBeGreaterThan(0);
    expect(useERPStore.getState().stocks.every((stock) => stock.reserved <= stock.onHand)).toBe(true);
  });

  it("menjalankan batch manual, mencatat multi-SKU, waste, dan alokasi pesanan otomatis", () => {
    login("produksi.pusat");
    const batch = useERPStore.getState().addProductionOrder([
      { productId: "raw-tepung", quantity: 1 },
      { productId: "topping-cokelat", quantity: 1000 },
      { productId: "pack-plastik", quantity: 10 },
    ], "Tinggi", "Batch uji manual");

    expect(batch.materials.map((item) => item.role)).toEqual(["Bahan Baku", "Bahan Baku Toping", "Kemasan"]);
    expect(batch.materials.map((item) => item.requestedQty)).toEqual([1, 1000, 10]);
    expect(batch.outputs).toEqual([]);
    expect(batch).not.toHaveProperty("targetQty");
    expect(batch).not.toHaveProperty("recipeId");

    useERPStore.getState().logout();
    login("gudang.pusat");
    useERPStore.getState().reviewProductionRequest(batch.id, "Disetujui");
    expect(useERPStore.getState().productionOrders.find((item) => item.id === batch.id)?.status).toBe("Disetujui Gudang");

    useERPStore.getState().logout();
    login("produksi.pusat");
    useERPStore.getState().confirmProductionMaterials(batch.id);
    useERPStore.getState().advanceProduction(batch.id);
    useERPStore.getState().finalizeProduction(batch.id, {
      outputs: [
        { productId: "prd-pisang", goodQty: 100, failedQty: 0, failureReason: "" },
        { productId: "prd-roti-cokelat", goodQty: 20, failedQty: 2, failureReason: "Bentuk tidak sesuai" },
      ],
      notes: "Dua SKU dari satu batch.",
    });

    const completed = useERPStore.getState().productionOrders.find((item) => item.id === batch.id)!;
    expect(completed.status).toBe("Selesai");
    expect(completed.outputs).toHaveLength(2);
    expect(completed.outputs.reduce((sum, output) => sum + output.goodQty, 0)).toBe(120);
    expect(completed.outputs.reduce((sum, output) => sum + output.failedQty, 0)).toBe(2);

    const pisangStock = useERPStore.getState().stocks.find((stock) => stock.referenceId === batch.id && stock.productId === "prd-pisang");
    expect(pisangStock).toMatchObject({ warehouse: "Gudang Produk Jadi", status: "Tersedia", onHand: 100, reserved: 90 });
    const waitingOrder = useERPStore.getState().sales.find((sale) => sale.id === "sale-005")!;
    expect(waitingOrder.status).toBe("Siap Dipenuhi");
    expect(waitingOrder.stockAllocations).toContainEqual(expect.objectContaining({
      productId: "prd-pisang",
      quantity: 90,
      productionOrderId: batch.id,
    }));
    expect(useERPStore.getState().stockMovements).toContainEqual(expect.objectContaining({
      type: "Waste Produksi",
      productId: "prd-roti-cokelat",
      quantity: 2,
      notes: "Bentuk tidak sesuai",
    }));
  });

  it("meneruskan kekurangan batch dari Gudang ke Purchasing", () => {
    login("produksi.pusat");
    const batch = useERPStore.getState().addProductionOrder([{ productId: "raw-tepung", quantity: 999999 }], "Mendesak");
    useERPStore.getState().logout();
    login("gudang.pusat");
    useERPStore.getState().reviewProductionRequest(batch.id, "Disetujui");

    expect(useERPStore.getState().productionOrders.find((item) => item.id === batch.id)?.status).toBe("Kekurangan Bahan");
    const request = useERPStore.getState().requestMaterialPurchase(batch.id);
    expect(request.items[0]).toMatchObject({ productId: "raw-tepung" });
    expect(request.items[0].quantity).toBeGreaterThan(0);
    expect(useERPStore.getState().productionOrders.find((item) => item.id === batch.id)?.status).toBe("Menunggu Pembelian");
  });

  it("membuat PO berstatus Dipesan dan menerima stok langsung ke Gudang Bahan", () => {
    login("purchasing.pusat");
    const order = useERPStore.getState().addPurchaseOrder("sup-sumber", [
      { productId: "raw-tepung", quantity: 1, unitPrice: 310000 },
    ]);
    expect(order.status).toBe("Dipesan");

    const receipt = useERPStore.getState().receivePurchaseOrder(order.id);
    expect(receipt.status).toBe("Selesai");
    expect(receipt.items).toHaveLength(1);
    expect(receipt.items[0]).not.toHaveProperty("qualityInspectionId");
    expect(useERPStore.getState().stocks.find((stock) => stock.id === receipt.items[0].stockItemId)).toMatchObject({
      warehouse: "Gudang Bahan",
      status: "Tersedia",
      onHand: 25,
    });
  });

  it("memposting koreksi stok langsung setelah hitung fisik lengkap", () => {
    login("gudang.pusat");
    const count = useERPStore.getState().createStockCount("Gudang Bahan");
    const firstLine = count.lines[0];
    for (const line of count.lines) {
      useERPStore.getState().updateStockCountLine(
        count.id,
        line.id,
        line.id === firstLine.id ? line.systemQty + 5 : line.systemQty,
        line.id === firstLine.id ? "Selisih hitung fisik" : "",
      );
    }
    useERPStore.getState().submitStockCount(count.id);
    expect(useERPStore.getState().stockCounts.find((item) => item.id === count.id)?.status).toBe("Siap Diposting");

    useERPStore.getState().postStockCount(count.id);
    expect(useERPStore.getState().stockCounts.find((item) => item.id === count.id)?.status).toBe("Diposting");
    expect(useERPStore.getState().stocks.find((stock) => stock.id === firstLine.stockId)?.onHand).toBe(firstLine.systemQty + 5);
  });
});
