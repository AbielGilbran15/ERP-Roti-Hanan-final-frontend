import { describe, expect, it } from "vitest";
import { canAccessRoute, canManageMaster, canPerformAction, canViewMasterSection } from "@/lib/access";

describe("akses berdasarkan role", () => {
  it("memberi Owner akses ke seluruh rute utama", () => {
    expect(canAccessRoute("Owner", "/finance")).toBe(true);
    expect(canAccessRoute("Owner", "/approvals")).toBe(true);
    expect(canAccessRoute("Owner", "/users")).toBe(true);
  });

  it("membatasi Admin Penjualan/Sales ke modul operasional yang sesuai", () => {
    expect(canAccessRoute("Admin Penjualan/Sales", "/sales")).toBe(true);
    expect(canAccessRoute("Admin Penjualan/Sales", "/master-data")).toBe(true);
    expect(canAccessRoute("Admin Penjualan/Sales", "/finance")).toBe(false);
    expect(canAccessRoute("Admin Penjualan/Sales", "/approvals")).toBe(false);
  });

  it("mengizinkan Admin HR/Finance mengelola akun tanpa akses approval Owner", () => {
    expect(canAccessRoute("Admin HR/Finance", "/users")).toBe(true);
    expect(canAccessRoute("Admin HR/Finance", "/hr")).toBe(true);
    expect(canAccessRoute("Admin HR/Finance", "/approvals")).toBe(false);
  });

  it("membatasi bidang Master Data sesuai tanggung jawab role", () => {
    expect(canManageMaster("Admin Penjualan/Sales", "customer.profile")).toBe(true);
    expect(canManageMaster("Admin Penjualan/Sales", "customer.finance")).toBe(false);
    expect(canManageMaster("Admin Penjualan/Sales", "finished.price")).toBe(true);
    expect(canManageMaster("Staff Purchasing", "supplier.profile")).toBe(true);
    expect(canManageMaster("Staff Purchasing", "material.stock")).toBe(false);
    expect(canManageMaster("QC Inspector", "material.quality")).toBe(true);
    expect(canManageMaster("Admin HR/Finance", "customer.finance")).toBe(true);
  });

  it("hanya menampilkan bagian Master Data yang relevan untuk role", () => {
    expect(canViewMasterSection("Admin Penjualan/Sales", "customers")).toBe(true);
    expect(canViewMasterSection("Admin Penjualan/Sales", "suppliers")).toBe(false);
    expect(canViewMasterSection("Staff Purchasing", "materials")).toBe(true);
    expect(canViewMasterSection("Staff Purchasing", "finished-products")).toBe(false);
    expect(canViewMasterSection("Owner", "audit")).toBe(true);
    expect(canViewMasterSection(null, "customers")).toBe(false);
  });

  it("memisahkan akses baca modul dari izin menjalankan aksi", () => {
    expect(canAccessRoute("Staff Gudang", "/production")).toBe(true);
    expect(canPerformAction("Staff Gudang", "production.create")).toBe(false);
    expect(canAccessRoute("Staff Gudang", "/purchasing")).toBe(true);
    expect(canPerformAction("Staff Gudang", "purchasing.create")).toBe(false);
    expect(canAccessRoute("Admin HR/Finance", "/sales")).toBe(true);
    expect(canPerformAction("Admin HR/Finance", "sales.create")).toBe(false);
    expect(canPerformAction("Staff Gudang", "inventory.fulfillment")).toBe(true);
    expect(canPerformAction("QC Inspector", "quality.resolve")).toBe(true);
  });
});
