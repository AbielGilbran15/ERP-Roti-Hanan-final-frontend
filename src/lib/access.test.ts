import { describe, expect, it } from "vitest";
import { canAccessRoute, canManageMaster, canPerformAction, canViewMasterSection, routeAccess } from "@/lib/access";

describe("akses berdasarkan role final", () => {
  it("tidak memiliki rute Persetujuan dan memberi Owner akses ke seluruh rute yang tersisa", () => {
    expect(Object.keys(routeAccess)).not.toContain("/approvals");
    expect(canAccessRoute("Owner", "/finance")).toBe(true);
    expect(canAccessRoute("Owner", "/production")).toBe(true);
    expect(canAccessRoute("Owner", "/users")).toBe(true);
  });

  it("memakai satu role Staff Gudang untuk kedua gudang dan pemenuhan", () => {
    expect(canAccessRoute("Staff Gudang", "/inventory")).toBe(true);
    expect(canPerformAction("Staff Gudang", "inventory.production.review")).toBe(true);
    expect(canPerformAction("Staff Gudang", "inventory.fulfillment")).toBe(true);
    expect(canPerformAction("Staff Gudang", "inventory.stock-count")).toBe(true);
    expect(canPerformAction("Staff Gudang", "production.create")).toBe(false);
  });

  it("membatasi aksi produksi kepada Staff Produksi", () => {
    expect(canAccessRoute("Staff Produksi", "/production")).toBe(true);
    expect(canPerformAction("Staff Produksi", "production.create")).toBe(true);
    expect(canPerformAction("Staff Produksi", "production.material.confirm")).toBe(true);
    expect(canPerformAction("Staff Produksi", "production.finalize")).toBe(true);
  });

  it("membagi pengelolaan Master Data termasuk HPP Barang Jadi", () => {
    expect(canManageMaster("Staff Purchasing", "material.purchase")).toBe(true);
    expect(canManageMaster("Staff Gudang", "material.stock")).toBe(true);
    expect(canManageMaster("Staff Produksi", "finished.production")).toBe(true);
    expect(canManageMaster("Admin Penjualan/Sales", "finished.price")).toBe(true);
    expect(canManageMaster("Admin HR/Finance", "finished.cost")).toBe(true);
    expect(canManageMaster("Staff Produksi", "finished.cost")).toBe(false);
  });

  it("hanya menampilkan bagian Master Data yang masih berlaku", () => {
    expect(canViewMasterSection("Staff Purchasing", "materials")).toBe(true);
    expect(canViewMasterSection("Staff Produksi", "product-classification")).toBe(true);
    expect(canViewMasterSection("Admin HR/Finance", "finished-products")).toBe(true);
    expect(canViewMasterSection("Owner", "audit")).toBe(true);
    expect(canViewMasterSection(null, "customers")).toBe(false);
  });
});
