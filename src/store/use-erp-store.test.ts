import { beforeEach, describe, expect, it } from "vitest";
import { users as demoUsers } from "@/data/mock-data";
import { useERPStore } from "@/store/use-erp-store";

describe("alur state ERP dummy", () => {
  beforeEach(() => {
    localStorage.clear();
    useERPStore.getState().resetDemo();
  });

  it("menerima login dengan username atau Gmail dan menolak password salah", () => {
    expect(useERPStore.getState().login("asep", "hanan123")).toEqual({ ok: true });
    useERPStore.getState().logout();
    expect(useERPStore.getState().login("asep.hanan@gmail.com", "hanan123")).toEqual({ ok: true });
    useERPStore.getState().logout();
    expect(useERPStore.getState().login("asep", "salah")).toEqual({
      ok: false,
      message: "Email, username, atau password tidak sesuai.",
    });
  });

  it.each(demoUsers.map((user) => [user.role, user.username, user.id]))(
    "menerima akun demo untuk role %s",
    (_, username, userId) => {
      expect(useERPStore.getState().login(username, "hanan123")).toEqual({ ok: true });
      expect(useERPStore.getState().currentUserId).toBe(userId);
      useERPStore.getState().logout();
    },
  );

  it("membuat approval untuk biaya besar dan meneruskan keputusan ke biaya asal", () => {
    expect(useERPStore.getState().login("siti.finance", "hanan123")).toEqual({ ok: true });
    useERPStore.getState().addExpense("Produksi", "Perawatan", "Teknisi Oven", 900000);
    const expense = useERPStore.getState().expenses[0];
    const approval = useERPStore.getState().approvals.find((item) => item.reference === expense.number);

    expect(expense.status).toBe("Menunggu Persetujuan");
    expect(approval?.type).toBe("Biaya");

    useERPStore.getState().logout();
    expect(useERPStore.getState().login("asep", "hanan123")).toEqual({ ok: true });
    useERPStore.getState().decideApproval(approval!.id, "Disetujui");
    expect(useERPStore.getState().expenses.find((item) => item.id === expense.id)?.status).toBe("Disetujui");
  });

  it("mengajukan payroll sebagai satu approval dan memperbarui semua slip", () => {
    expect(useERPStore.getState().login("siti.finance", "hanan123")).toEqual({ ok: true });
    useERPStore.getState().runPayroll();
    const approval = useERPStore.getState().approvals.find((item) => item.type === "Payroll");

    expect(approval?.status).toBe("Menunggu");
    expect(useERPStore.getState().payrolls.every((item) => item.status === "Menunggu Persetujuan")).toBe(true);

    useERPStore.getState().logout();
    expect(useERPStore.getState().login("asep", "hanan123")).toEqual({ ok: true });
    useERPStore.getState().decideApproval(approval!.id, "Disetujui");
    expect(useERPStore.getState().payrolls.every((item) => item.status === "Disetujui")).toBe(true);
  });

  it("mengonversi satuan beli PO ke satuan stok lalu menahannya di karantina QC", () => {
    expect(useERPStore.getState().login("purchasing.pusat", "hanan123")).toEqual({ ok: true });
    useERPStore.getState().receivePurchaseOrder("po-001");
    const inspections = useERPStore.getState().qualityInspections.filter((item) => item.reference === "PO-PST-260823-017");
    const flourInspection = inspections.find((item) => item.itemName === "Tepung Terigu");
    const yeastInspection = inspections.find((item) => item.itemName === "Ragi");
    const flourStock = useERPStore.getState().stocks.find((item) => item.lot === flourInspection?.lot);
    const yeastStock = useERPStore.getState().stocks.find((item) => item.lot === yeastInspection?.lot);

    expect(inspections).toHaveLength(2);
    expect(flourStock?.onHand).toBe(50);
    expect(yeastStock?.onHand).toBe(1500);
    expect(flourStock?.status).toBe("Karantina");
    expect(yeastStock?.status).toBe("Karantina");

    useERPStore.getState().logout();
    expect(useERPStore.getState().login("qc.pusat", "hanan123")).toEqual({ ok: true });
    useERPStore.getState().resolveInspection(flourInspection!.id, "Lulus");
    expect(useERPStore.getState().stocks.find((item) => item.id === flourStock?.id)?.status).toBe("Tersedia");
    expect(useERPStore.getState().stocks.find((item) => item.id === yeastStock?.id)?.status).toBe("Karantina");
  });

  it("menghitung otomatis isi kemasan, konversi satuan, PO, dan stok masuk", () => {
    expect(useERPStore.getState().login("asep", "hanan123")).toEqual({ ok: true });
    const template = useERPStore.getState().products.find((item) => item.id === "raw-tepung")!;
    const material = useERPStore.getState().saveProduct({
      ...template,
      id: "",
      code: "BB-099",
      name: "Tepung Kemasan Uji",
      purchaseUnit: "Karung",
      purchaseContentValue: 15,
      purchaseContentUnit: "Kg",
      stockUnit: "Gram",
      conversionValue: 123,
      purchasePrice: 300000,
      minStock: 30000,
      isActive: true,
    });

    expect(material.conversionValue).toBe(15000);
    expect(material.cost).toBe(20);

    const created = useERPStore.getState().addPurchaseOrder("sup-sumber", [
      { productId: material.id, quantity: 2, unitPrice: 300000 },
      { productId: "raw-ragi", quantity: 3, unitPrice: 40000 },
    ]);
    const order = useERPStore.getState().purchaseOrders[0];
    expect(created.id).toBe(order.id);
    expect(order.items).toHaveLength(2);
    expect(order.total).toBe(720000);
    expect(order.items[0]).toMatchObject({
      quantity: 2,
      purchaseUnit: "Karung",
      purchaseContentValue: 15,
      purchaseContentUnit: "Kg",
      stockUnit: "Gram",
      conversionValue: 15000,
    });

    useERPStore.getState().receivePurchaseOrder(order.id);
    const received = useERPStore.getState().stocks.find((item) => item.productId === material.id);
    const ragiReceived = useERPStore.getState().stocks.find((item) => item.productId === "raw-ragi" && item.id.startsWith("stk-po-"));
    const inspections = useERPStore.getState().qualityInspections.filter((item) => item.reference === order.number);
    expect(received?.onHand).toBe(30000);
    expect(received?.status).toBe("Karantina");
    expect(ragiReceived?.onHand).toBe(1500);
    expect(inspections).toHaveLength(2);
  });

  it("menolak satuan isi dan stok dari kelompok berbeda", () => {
    expect(useERPStore.getState().login("asep", "hanan123")).toEqual({ ok: true });
    const template = useERPStore.getState().products.find((item) => item.id === "raw-tepung")!;
    expect(() => useERPStore.getState().saveProduct({
      ...template,
      id: "",
      code: "BB-098",
      name: "Konversi Tidak Valid",
      purchaseContentValue: 15,
      purchaseContentUnit: "Kg",
      stockUnit: "Liter",
      isActive: false,
    })).toThrow(/tidak dapat dikonversi/i);
  });

  it("menggunakan harga sesuai kategori Agen 1 dan Agen 2", () => {
    expect(useERPStore.getState().login("sales.pusat", "hanan123")).toEqual({ ok: true });
    const agent1Order = useERPStore.getState().addAgentOrder({
      salesAdminId: "usr-rina",
      customerId: "cust-koperasi",
      items: [{ productId: "prd-roti-susu", quantity: 1 }],
      discount: 0,
      paymentMethod: "Transfer",
      orderSource: "WhatsApp",
      fulfillmentMethod: "Diambil",
      paidAmount: 0,
      neededAt: "2026-08-24T08:00:00+07:00",
    });
    const agent2Order = useERPStore.getState().addAgentOrder({
      salesAdminId: "usr-rina",
      customerId: "cust-sari",
      items: [{ productId: "prd-roti-susu", quantity: 1 }],
      discount: 0,
      paymentMethod: "Tunai",
      orderSource: "Telepon",
      fulfillmentMethod: "Diambil",
      paidAmount: 8500,
      neededAt: "2026-08-24T08:00:00+07:00",
    });

    expect(agent1Order.customerCategory).toBe("Agen 1");
    expect(agent1Order.total).toBe(8000);
    expect(agent2Order.customerCategory).toBe("Agen 2");
    expect(agent2Order.total).toBe(8500);

    const categoryPriceOrder = useERPStore.getState().addAgentOrder({
      salesAdminId: "usr-rina",
      customerId: "cust-koperasi",
      items: [{ productId: "prd-tawar", quantity: 1 }],
      discount: 0,
      paymentMethod: "Cicilan",
      orderSource: "Datang Langsung",
      fulfillmentMethod: "Diambil",
      paidAmount: 5000,
      neededAt: "2026-08-24T08:00:00+07:00",
    });
    expect(categoryPriceOrder.total).toBe(17000);
    expect(categoryPriceOrder.items[0].unitPrice).toBe(17000);
    expect(categoryPriceOrder.customerCategory).toBe("Agen 1");
    expect(categoryPriceOrder.paymentTermsDaysSnapshot).toBe(14);
    expect(categoryPriceOrder.creditLimitSnapshot).toBe(15000000);
    expect(categoryPriceOrder.paidAmount).toBe(5000);
  });

  it("menyatukan beberapa produk agen dalam satu pesanan dan satu invoice", () => {
    expect(useERPStore.getState().login("sales.pusat", "hanan123")).toEqual({ ok: true });
    const order = useERPStore.getState().addAgentOrder({
      salesAdminId: "usr-rina",
      customerId: "cust-koperasi",
      items: [
        { productId: "prd-roti-susu", quantity: 1 },
        { productId: "prd-tawar", quantity: 1 },
      ],
      discount: 0,
      paymentMethod: "Transfer",
      orderSource: "WhatsApp",
      fulfillmentMethod: "Diambil",
      paidAmount: 25000,
      neededAt: "2026-08-24T08:00:00+07:00",
    });

    expect(order.items).toHaveLength(2);
    expect(order.subtotal).toBe(25000);
    expect(order.total).toBe(25000);
    expect(order.status).toBe("Siap Dipenuhi");

    useERPStore.getState().logout();
    expect(useERPStore.getState().login("gudang.pusat", "hanan123")).toEqual({ ok: true });
    useERPStore.getState().advanceFulfillment(order.id);
    const invoices = useERPStore.getState().invoices.filter((invoice) => invoice.source === order.number);

    expect(useERPStore.getState().sales.find((sale) => sale.id === order.id)?.status).toBe("Selesai");
    expect(invoices).toHaveLength(1);
    expect(invoices[0].total).toBe(25000);
    expect(invoices[0].status).toBe("Lunas");
  });

  it("menolak transaksi yang melewati batas kredit pelanggan", () => {
    expect(useERPStore.getState().login("sales.pusat", "hanan123")).toEqual({ ok: true });
    expect(() => useERPStore.getState().addAgentOrder({
      salesAdminId: "usr-rina",
      customerId: "cust-sari",
      items: [{ productId: "prd-roti-susu", quantity: 1 }],
      discount: 0,
      paymentMethod: "Kredit/Tempo",
      orderSource: "WhatsApp",
      fulfillmentMethod: "Diambil",
      paidAmount: 0,
      neededAt: "2026-08-24T08:00:00+07:00",
    })).toThrow(/kredit/i);
  });

  it("menolak jumlah pecahan untuk Barang Jadi bersatuan Pcs", () => {
    expect(useERPStore.getState().login("sales.pusat", "hanan123")).toEqual({ ok: true });
    expect(() => useERPStore.getState().addAgentOrder({
      salesAdminId: "usr-rina",
      customerId: "cust-sari",
      items: [{ productId: "prd-roti-susu", quantity: 0.5 }],
      discount: 0,
      paymentMethod: "Tunai",
      orderSource: "Datang Langsung",
      fulfillmentMethod: "Diambil",
      paidAmount: 4250,
      neededAt: "2026-08-24T08:00:00+07:00",
    })).toThrow(/bilangan bulat/i);
  });

  it("membatasi perubahan Master Pelanggan sesuai bagian role dan mencatat audit", () => {
    expect(useERPStore.getState().login("sales.pusat", "hanan123")).toEqual({ ok: true });
    const original = useERPStore.getState().customers.find((item) => item.id === "cust-koperasi")!;
    useERPStore.getState().saveCustomer({
      ...original,
      name: "Koperasi Sejahtera Utama",
      creditLimit: 99000000,
    });

    const afterSales = useERPStore.getState().customers.find((item) => item.id === original.id)!;
    expect(afterSales.name).toBe("Koperasi Sejahtera Utama");
    expect(afterSales.creditLimit).toBe(15000000);
    expect(useERPStore.getState().auditLogs[0].actorName).toBe("Rina Marlina");

    useERPStore.getState().logout();
    expect(useERPStore.getState().login("siti.finance", "hanan123")).toEqual({ ok: true });
    useERPStore.getState().saveCustomer({
      ...afterSales,
      name: "Nama tidak boleh berubah oleh Finance",
      paymentTermsDays: 21,
      creditLimit: 18000000,
    });

    const afterFinance = useERPStore.getState().customers.find((item) => item.id === original.id)!;
    expect(afterFinance.name).toBe("Koperasi Sejahtera Utama");
    expect(afterFinance.paymentTermsDays).toBe(21);
    expect(afterFinance.creditLimit).toBe(18000000);
    expect(useERPStore.getState().auditLogs[0].changes.join(" ")).toMatch(/Tempo|Batas kredit/);
  });

  it("mengizinkan Purchasing mengubah data beli bahan tetapi mempertahankan bidang Gudang dan QC", () => {
    expect(useERPStore.getState().login("purchasing.pusat", "hanan123")).toEqual({ ok: true });
    const flour = useERPStore.getState().products.find((item) => item.id === "raw-tepung")!;
    useERPStore.getState().saveProduct({
      ...flour,
      purchasePrice: 325000,
      conversionValue: 25,
      minStock: 999,
      requiresQc: false,
    });

    const updated = useERPStore.getState().products.find((item) => item.id === flour.id)!;
    expect(updated.purchasePrice).toBe(325000);
    expect(updated.cost).toBe(13000);
    expect(updated.minStock).toBe(50);
    expect(updated.requiresQc).toBe(true);

    const created = useERPStore.getState().saveProduct({
      ...flour,
      id: "",
      code: "BB-099",
      name: "Bahan Baru",
      purchaseUnit: "Sak",
      stockUnit: "Kg",
      conversionValue: 10,
      purchasePrice: 100000,
      minStock: 500,
      shelfLifeDays: 60,
      requiresQc: false,
      isActive: true,
    });
    expect(created.stockUnit).toBe("");
    expect(created.minStock).toBe(0);
    expect(created.shelfLifeDays).toBe(0);
    expect(created.requiresQc).toBe(true);
    expect(created.isActive).toBe(false);
  });

  it("menjaga termin supplier baru tetap menjadi kewenangan Finance", () => {
    expect(useERPStore.getState().login("purchasing.pusat", "hanan123")).toEqual({ ok: true });
    const template = useERPStore.getState().suppliers[0];
    const created = useERPStore.getState().saveSupplier({
      ...template,
      id: "",
      code: "SUP-099",
      name: "Supplier Baru",
      paymentTermsDays: 45,
    });

    expect(created.paymentTermsDays).toBe(0);
    expect(created.isActive).toBe(template.isActive);
  });

  it("baru menyelesaikan pesanan kirim setelah penerimaan agen dikonfirmasi", () => {
    expect(useERPStore.getState().login("gudang.pusat", "hanan123")).toEqual({ ok: true });
    expect(useERPStore.getState().sales.find((item) => item.id === "sale-004")?.status).toBe("Dalam Pengiriman");
    expect(useERPStore.getState().stocks.some((item) => item.referenceId === "sale-004")).toBe(true);

    useERPStore.getState().confirmDelivery("sale-004", "Surat jalan diterima agen", undefined, [
      {
        id: "attachment-001",
        name: "surat-jalan.pdf",
        mimeType: "application/pdf",
        size: 24576,
        uploadedAt: "2026-08-23T11:00:00+07:00",
      },
    ]);

    const completed = useERPStore.getState().sales.find((item) => item.id === "sale-004");
    expect(completed?.status).toBe("Selesai");
    expect(completed?.receivedAt).toBeTruthy();
    expect(completed?.deliveryAttachments?.[0].name).toBe("surat-jalan.pdf");
    expect(useERPStore.getState().stocks.some((item) => item.referenceId === "sale-004")).toBe(false);
  });

  it("menolak aksi mutasi dari role yang hanya memiliki akses baca", () => {
    expect(useERPStore.getState().login("gudang.pusat", "hanan123")).toEqual({ ok: true });
    expect(() => useERPStore.getState().addPurchaseOrder("sup-sumber", [{ productId: "raw-tepung", quantity: 1, unitPrice: 300000 }])).toThrow(/Purchasing/i);
    expect(() => useERPStore.getState().addProductionOrder("prd-roti-susu", 100, "Normal")).toThrow(/Produksi/i);
    expect(() => useERPStore.getState().addSale({
      salesAdminId: "usr-yudi",
      customerId: "cust-sari",
      items: [{ productId: "prd-roti-susu", quantity: 1 }],
      discount: 0,
      paymentMethod: "Tunai",
    })).toThrow(/Penjualan/i);
  });

  it("menolak target produksi negatif, nol, pecahan, atau bukan angka", () => {
    expect(useERPStore.getState().login("produksi.pusat", "hanan123")).toEqual({ ok: true });
    for (const invalid of [-25, 0, 2.5, Number.NaN]) {
      expect(() => useERPStore.getState().addProductionOrder("prd-roti-susu", invalid, "Normal")).toThrow(/bilangan bulat/i);
    }
    expect(useERPStore.getState().productionOrders.some((order) => order.targetQty <= 0)).toBe(false);
  });

  it("menolak diskon POS yang membuat transaksi gratis atau negatif", () => {
    expect(useERPStore.getState().login("sales.pusat", "hanan123")).toEqual({ ok: true });
    const beforeStock = useERPStore.getState().stocks.find((stock) => stock.productId === "prd-roti-cokelat" && stock.warehouse === "Gudang Produk Jadi")?.onHand;
    expect(() => useERPStore.getState().addSale({
      salesAdminId: "usr-rina",
      customerId: "cust-sari",
      items: [{ productId: "prd-roti-cokelat", quantity: 1 }],
      discount: 999999,
      paymentMethod: "Tunai",
    })).toThrow(/diskon/i);
    expect(useERPStore.getState().stocks.find((stock) => stock.productId === "prd-roti-cokelat" && stock.warehouse === "Gudang Produk Jadi")?.onHand).toBe(beforeStock);
  });

  it("mencatat Tunai, QRIS, dan Transfer sebagai lunas untuk agen tanpa kredit", () => {
    expect(useERPStore.getState().login("sales.pusat", "hanan123")).toEqual({ ok: true });
    for (const paymentMethod of ["Tunai", "QRIS", "Transfer"] as const) {
      const order = useERPStore.getState().addAgentOrder({
        salesAdminId: "usr-rina",
        customerId: "cust-berkah",
        items: [{ productId: "prd-roti-cokelat", quantity: 1 }],
        discount: 0,
        paymentMethod,
        orderSource: "WhatsApp",
        fulfillmentMethod: "Dikirim",
        paidAmount: 0,
        neededAt: "2026-08-26T08:00:00+07:00",
      });
      expect(order.paidAmount).toBe(order.total);
      expect(order.dueDate).toBeUndefined();
    }
  });

  it("menolak format email pengguna yang tidak valid di lapisan store", () => {
    expect(useERPStore.getState().login("asep", "hanan123")).toEqual({ ok: true });
    expect(() => useERPStore.getState().addUser({
      name: "Akun Uji",
      email: "bukan-email",
      username: "akun.uji",
      phone: "08123456789",
      role: "Admin Penjualan/Sales",
    })).toThrow(/email|gmail/i);
  });

  it("memperbarui jumlah notifikasi saat dibaca satu per satu atau sekaligus", () => {
    const initialUnread = useERPStore.getState().notifications.filter((item) => !item.read);
    expect(initialUnread.length).toBeGreaterThan(0);

    useERPStore.getState().markNotificationRead(initialUnread[0].id);
    expect(useERPStore.getState().notifications.filter((item) => !item.read)).toHaveLength(initialUnread.length - 1);

    useERPStore.getState().markAllNotificationsRead();
    expect(useERPStore.getState().notifications.every((item) => item.read)).toBe(true);
  });
});
