"use client";

import type { ColumnDef } from "@tanstack/react-table";
import {
  Button,
  Checkbox,
  Dialog,
  DialogActions,
  DialogBody,
  DialogContent,
  DialogSurface,
  DialogTitle,
  Field,
  Input,
  Select,
  Tab,
  TabList,
  Textarea,
} from "@fluentui/react-components";
import {
  Add20Regular,
  Box24Regular,
  Database24Regular,
  Edit20Regular,
  Food24Regular,
  History24Regular,
  People24Regular,
} from "@fluentui/react-icons";
import { useEffect, useMemo, useState } from "react";
import { DataTable } from "@/components/ui/data-table";
import { ProductClassificationPanel } from "@/components/master-data/product-classification-panel";
import { MetricStrip, type MetricItem } from "@/components/ui/metric-strip";
import { PageHeader } from "@/components/ui/page-header";
import { SectionPanel } from "@/components/ui/section-panel";
import { StatusBadge } from "@/components/ui/status-badge";
import { useAppToast } from "@/components/ui/app-toast";
import { useCurrentAccess } from "@/hooks/use-current-access";
import { useMetricSection } from "@/hooks/use-metric-section";
import { canManageMaster, canViewMasterSection } from "@/lib/access";
import { formatCurrency, formatDateTime, formatNumber } from "@/lib/format";
import {
  buildFinishedProductName,
  formatProductClassification,
  getFinishedProductCategory,
  getFinishedProductVariant,
  getTypesForCategory,
  getVariantsForType,
} from "@/lib/product-classification";
import type { AuditLog, Customer, CustomerCategory, Product, Supplier } from "@/lib/types";
import { calculatePurchaseConversion, convertUnit, describeUnitCompatibility, unitGroups, type UnitFamily } from "@/lib/units";
import { useERPStore } from "@/store/use-erp-store";

type MasterTab = "agent-1" | "agent-2" | "suppliers" | "materials" | "product-classification" | "finished-products" | "audit";

const masterMetricSections: Readonly<Record<string, MasterTab>> = {
  "master-agents": "agent-1",
  "master-suppliers": "suppliers",
  "master-materials": "materials",
  "master-classification": "product-classification",
  "master-finished-products": "finished-products",
  "master-audit": "audit",
};

const emptyCustomer = (category: CustomerCategory, sequence: number): Customer => ({
  id: "",
  code: `${category === "Agen 1" ? "AG1" : "AG2"}-${String(sequence).padStart(3, "0")}`,
  name: "",
  contactName: "",
  category,
  phone: "",
  address: "",
  city: "",
  paymentTermsDays: 0,
  creditLimit: 0,
  notes: "",
  isActive: true,
});

const emptySupplier = (sequence: number): Supplier => ({
  id: "",
  code: `SUP-${String(sequence).padStart(3, "0")}`,
  name: "",
  contactName: "",
  phone: "",
  address: "",
  city: "",
  paymentTermsDays: 0,
  notes: "",
  isActive: true,
});

const emptyMaterial = (sequence: number): Product => ({
  id: "",
  code: `BB-${String(sequence).padStart(3, "0")}`,
  name: "",
  type: "Bahan Baku",
  purchaseUnit: "Karung",
  purchaseContentValue: 1,
  purchaseContentUnit: "Kg",
  stockUnit: "",
  conversionValue: 0,
  purchasePrice: 0,
  agent1Price: 0,
  agent2Price: 0,
  cost: 0,
  shelfLifeDays: 0,
  minStockInputValue: 0,
  minStockInputUnit: "Kg",
  minStock: 0,
  notes: "",
  isActive: false,
});

const emptyFinishedProduct = (sequence: number, categoryId: string): Product => ({
  id: "",
  code: `RJ-${String(sequence).padStart(3, "0")}`,
  name: "",
  type: "Produk Jadi",
  finishedProductCategoryId: categoryId,
  stockUnit: categoryId === "finished-category-roti-box" ? "Box" : "",
  conversionValue: 1,
  purchasePrice: 0,
  salesUnit: categoryId === "finished-category-roti-box" ? "Box" : "",
  contentQuantity: undefined,
  contentUnit: undefined,
  packagingDescription: "",
  weightValue: 0,
  weightUnit: "Gram",
  agent1Price: 0,
  agent2Price: 0,
  cost: 0,
  shelfLifeDays: 3,
  minStock: 0,
  notes: "",
  isActive: false,
});

function EditButton({ label, onClick }: { label: string; onClick: () => void }) {
  return <Button size="small" appearance="subtle" icon={<Edit20Regular />} onClick={onClick}>{label}</Button>;
}

function PermissionNote({ children }: { children: React.ReactNode }) {
  return <p className="rounded-lg border border-[var(--app-border)] bg-[var(--app-surface-2)] px-3 py-2 text-xs leading-5 text-[var(--app-text-muted)]">{children}</p>;
}

function UnitOptions({ families }: { families?: UnitFamily[] }) {
  return (
    <>
      <option value="">Pilih satuan</option>
      {unitGroups.filter((group) => !families || families.includes(group.label)).map((group) => (
        <optgroup key={group.label} label={group.label}>
          {group.units.map((unit) => <option key={unit} value={unit}>{unit}</option>)}
        </optgroup>
      ))}
    </>
  );
}

export default function MasterDataPage() {
  const { role } = useCurrentAccess();
  const toast = useAppToast();
  const customers = useERPStore((state) => state.customers);
  const suppliers = useERPStore((state) => state.suppliers);
  const products = useERPStore((state) => state.products);
  const finishedProductCategories = useERPStore((state) => state.finishedProductCategories);
  const finishedProductTypes = useERPStore((state) => state.finishedProductTypes);
  const finishedProductVariants = useERPStore((state) => state.finishedProductVariants);
  const auditLogs = useERPStore((state) => state.auditLogs);
  const saveCustomer = useERPStore((state) => state.saveCustomer);
  const saveSupplier = useERPStore((state) => state.saveSupplier);
  const saveProduct = useERPStore((state) => state.saveProduct);

  const tabs = useMemo<Array<{ value: MasterTab; label: string }>>(() => {
    const result: Array<{ value: MasterTab; label: string }> = [];
    if (canViewMasterSection(role, "customers")) result.push({ value: "agent-1", label: "Agen 1" }, { value: "agent-2", label: "Agen 2" });
    if (canViewMasterSection(role, "suppliers")) result.push({ value: "suppliers", label: "Supplier" });
    if (canViewMasterSection(role, "materials")) result.push({ value: "materials", label: "Barang/Bahan" });
    if (canViewMasterSection(role, "product-classification")) result.push({ value: "product-classification", label: "Klasifikasi Produk" });
    if (canViewMasterSection(role, "finished-products")) result.push({ value: "finished-products", label: "Barang Jadi" });
    if (canViewMasterSection(role, "audit")) result.push({ value: "audit", label: "Riwayat perubahan" });
    return result;
  }, [role]);

  const [tab, setTab] = useState<MasterTab>(tabs[0]?.value ?? "materials");
  const [customerDraft, setCustomerDraft] = useState<Customer | null>(null);
  const [supplierDraft, setSupplierDraft] = useState<Supplier | null>(null);
  const [productDraft, setProductDraft] = useState<Product | null>(null);
  const [finishedCategoryFilter, setFinishedCategoryFilter] = useState("all");
  const [finishedTypeFilter, setFinishedTypeFilter] = useState("all");
  const [finishedVariantFilter, setFinishedVariantFilter] = useState("all");

  useEffect(() => {
    if (!tabs.some((item) => item.value === tab)) setTab(tabs[0]?.value ?? "materials");
  }, [tab, tabs]);
  useMetricSection(masterMetricSections, setTab);

  const materials = products.filter((product) => product.type !== "Produk Jadi");
  const finishedProducts = products.filter((product) => product.type === "Produk Jadi");
  const classificationData = useMemo(() => ({
    categories: finishedProductCategories,
    types: finishedProductTypes,
    variants: finishedProductVariants,
  }), [finishedProductCategories, finishedProductTypes, finishedProductVariants]);
  const filteredFinishedProducts = finishedProducts.filter((product) =>
    (finishedCategoryFilter === "all" || product.finishedProductCategoryId === finishedCategoryFilter) &&
    (finishedTypeFilter === "all" || product.finishedProductTypeId === finishedTypeFilter) &&
    (finishedVariantFilter === "all" || product.finishedProductVariantId === finishedVariantFilter),
  );
  const customerProfile = canManageMaster(role, "customer.profile");
  const customerFinance = canManageMaster(role, "customer.finance");
  const supplierProfile = canManageMaster(role, "supplier.profile");
  const supplierFinance = canManageMaster(role, "supplier.finance");
  const materialPurchase = canManageMaster(role, "material.purchase");
  const materialStock = canManageMaster(role, "material.stock");
  const finishedProduction = canManageMaster(role, "finished.production");
  const finishedStock = canManageMaster(role, "finished.stock");
  const finishedPrice = canManageMaster(role, "finished.price");
  const finishedCost = canManageMaster(role, "finished.cost");
  const draftCategory = productDraft?.type === "Produk Jadi" ? getFinishedProductCategory(classificationData, productDraft.finishedProductCategoryId) : undefined;
  const draftTypes = productDraft?.type === "Produk Jadi" ? getTypesForCategory(classificationData, productDraft.finishedProductCategoryId) : [];
  const draftVariants = productDraft?.type === "Produk Jadi" ? getVariantsForType(classificationData, productDraft.finishedProductTypeId) : [];
  const draftVariant = productDraft?.type === "Produk Jadi" ? getFinishedProductVariant(classificationData, productDraft.finishedProductVariantId) : undefined;
  const isDraftRotiBox = draftCategory?.id === "finished-category-roti-box";
  const finishedTypeFilterOptions = finishedProductTypes.filter((item) => finishedCategoryFilter === "all" || item.categoryId === finishedCategoryFilter);
  const finishedVariantFilterOptions = finishedProductVariants.filter((item) => {
    if (finishedTypeFilter !== "all") return item.typeId === finishedTypeFilter;
    if (finishedCategoryFilter === "all") return true;
    return finishedProductTypes.some((type) => type.id === item.typeId && type.categoryId === finishedCategoryFilter);
  });
  const materialAutomaticConversion = productDraft?.type !== "Produk Jadi" && productDraft?.stockUnit
    ? calculatePurchaseConversion(
        productDraft.purchaseContentValue ?? 0,
        productDraft.purchaseContentUnit ?? "",
        productDraft.stockUnit,
      )
    : null;
  const materialMinimumInStockUnit = productDraft?.type !== "Produk Jadi" && productDraft?.stockUnit
    ? convertUnit(productDraft.minStockInputValue ?? 0, productDraft.purchaseContentUnit ?? "", productDraft.stockUnit)
    : null;

  const openNewCustomer = (category: CustomerCategory) => {
    const count = customers.filter((customer) => customer.category === category).length;
    setCustomerDraft(emptyCustomer(category, count + 1));
  };

  const customerColumns = useMemo<ColumnDef<Customer>[]>(() => [
    { header: "Kode", accessorKey: "code", cell: ({ getValue }) => <span className="font-mono text-xs font-semibold">{String(getValue())}</span> },
    { header: "Pelanggan", accessorFn: (row) => `${row.name} ${row.contactName}`, cell: ({ row }) => <div><p className="font-medium">{row.original.name}</p><p className="text-xs text-[var(--app-text-muted)]">{row.original.contactName} · {row.original.phone}</p></div> },
    { header: "Alamat", accessorFn: (row) => `${row.address} ${row.city}`, cell: ({ row }) => <div className="max-w-[230px]"><p>{row.original.city}</p><p className="truncate text-xs text-[var(--app-text-muted)]">{row.original.address}</p></div> },
    { header: "Tempo", accessorKey: "paymentTermsDays", cell: ({ getValue }) => `${Number(getValue())} hari` },
    { header: "Batas kredit", accessorKey: "creditLimit", cell: ({ getValue }) => <span className="tabular">{formatCurrency(Number(getValue()))}</span> },
    { header: "Status", accessorKey: "isActive", cell: ({ getValue }) => <StatusBadge status={getValue() ? "Aktif" : "Nonaktif"} /> },
    ...(customerProfile || customerFinance ? [{ id: "action", header: "Tindakan", cell: ({ row }: { row: { original: Customer } }) => <EditButton label="Kelola" onClick={() => setCustomerDraft({ ...row.original })} /> }] : []),
  ], [customerFinance, customerProfile]);

  const supplierColumns = useMemo<ColumnDef<Supplier>[]>(() => [
    { header: "Kode", accessorKey: "code", cell: ({ getValue }) => <span className="font-mono text-xs font-semibold">{String(getValue())}</span> },
    { header: "Supplier", accessorFn: (row) => `${row.name} ${row.contactName}`, cell: ({ row }) => <div><p className="font-medium">{row.original.name}</p><p className="text-xs text-[var(--app-text-muted)]">{row.original.contactName} · {row.original.phone}</p></div> },
    { header: "Kota", accessorKey: "city" },
    { header: "Tempo", accessorKey: "paymentTermsDays", cell: ({ getValue }) => `${Number(getValue())} hari` },
    { header: "Catatan", accessorKey: "notes", cell: ({ getValue }) => <span className="block max-w-[230px] truncate text-xs text-[var(--app-text-muted)]">{String(getValue()) || "—"}</span> },
    { header: "Status", accessorKey: "isActive", cell: ({ getValue }) => <StatusBadge status={getValue() ? "Aktif" : "Nonaktif"} /> },
    ...(supplierProfile || supplierFinance ? [{ id: "action", header: "Tindakan", cell: ({ row }: { row: { original: Supplier } }) => <EditButton label="Kelola" onClick={() => setSupplierDraft({ ...row.original })} /> }] : []),
  ], [supplierFinance, supplierProfile]);

  const materialColumns = useMemo<ColumnDef<Product>[]>(() => [
    { header: "Barang/Bahan", accessorFn: (row) => `${row.code} ${row.name}`, cell: ({ row }) => <div><p className="font-medium">{row.original.name}</p><p className="font-mono text-[11px] text-[var(--app-text-muted)]">{row.original.code} · {row.original.type}</p></div> },
    { header: "Konversi otomatis", accessorFn: (row) => `${row.purchaseUnit} ${row.purchaseContentUnit} ${row.stockUnit}`, cell: ({ row }) => <div><p>1 {row.original.purchaseUnit} = <strong className="tabular">{formatNumber(row.original.purchaseContentValue ?? 0, 6)}</strong> {row.original.purchaseContentUnit}</p><p className="text-xs text-[var(--app-text-muted)]">Hasil: {formatNumber(row.original.conversionValue, 6)} {row.original.stockUnit}/ {row.original.purchaseUnit}</p></div> },
    { header: "Harga beli", accessorKey: "purchasePrice", cell: ({ row }) => <div><p className="tabular font-medium">{formatCurrency(row.original.purchasePrice)}/{row.original.purchaseUnit}</p><p className="tabular text-xs text-[var(--app-text-muted)]">{formatCurrency(row.original.cost)}/{row.original.stockUnit}</p></div> },
    { header: "Stok minimum", accessorKey: "minStock", cell: ({ row }) => <div><p className="tabular font-medium">{formatNumber(row.original.minStockInputValue ?? 0)} {row.original.minStockInputUnit ?? row.original.purchaseContentUnit}</p><p className="tabular text-xs text-[var(--app-text-muted)]">Hasil: {formatNumber(row.original.minStock)} {row.original.stockUnit}</p></div> },
    { header: "Umur simpan", accessorKey: "shelfLifeDays", cell: ({ getValue }) => `${Number(getValue())} hari` },
    { header: "Status", accessorKey: "isActive", cell: ({ getValue }) => <StatusBadge status={getValue() ? "Aktif" : "Nonaktif"} /> },
    ...(materialPurchase || materialStock ? [{ id: "action", header: "Tindakan", cell: ({ row }: { row: { original: Product } }) => <EditButton label="Kelola" onClick={() => setProductDraft({ ...row.original, minStockInputValue: row.original.minStockInputValue ?? row.original.minStock, minStockInputUnit: row.original.purchaseContentUnit })} /> }] : []),
  ], [materialPurchase, materialStock]);

  const finishedColumns = useMemo<ColumnDef<Product>[]>(() => [
    { header: "Barang Jadi", accessorFn: (row) => `${row.code} ${row.name} ${formatProductClassification(row, classificationData)}`, cell: ({ row }) => <div><p className="font-medium">{row.original.name}</p><p className="font-mono text-[11px] text-[var(--app-text-muted)]">{row.original.code}</p><p className="mt-1 text-xs text-[var(--app-text-muted)]">{formatProductClassification(row.original, classificationData)}</p></div> },
    { header: "Satuan / Isi / Berat", accessorFn: (row) => `${row.salesUnit} ${row.contentQuantity} ${row.weightValue}`, cell: ({ row }) => <div><p>{row.original.salesUnit || "Belum ditentukan"}</p><p className="tabular text-xs text-[var(--app-text-muted)]">{row.original.contentQuantity ? `${formatNumber(row.original.contentQuantity)} ${row.original.contentUnit ?? "Roti"} / ${row.original.salesUnit}` : "Jumlah isi belum diketahui"}</p><p className="tabular text-xs text-[var(--app-text-muted)]">{row.original.weightValue ? `${formatNumber(row.original.weightValue)} ${row.original.weightUnit}` : "Berat belum diisi"}</p></div> },
    { header: "Umur / Minimum", accessorFn: (row) => `${row.shelfLifeDays} ${row.minStock}`, cell: ({ row }) => <div><p>{row.original.shelfLifeDays} hari</p><p className="tabular text-xs text-[var(--app-text-muted)]">Min. {formatNumber(row.original.minStock)} {row.original.stockUnit}</p></div> },
    { header: "Harga Agen 1", accessorKey: "agent1Price", cell: ({ getValue }) => <span className="tabular font-medium">{formatCurrency(Number(getValue()))}</span> },
    { header: "Harga Agen 2", accessorKey: "agent2Price", cell: ({ getValue }) => <span className="tabular font-medium">{formatCurrency(Number(getValue()))}</span> },
    { header: "HPP", accessorKey: "cost", cell: ({ row }) => <span className="tabular font-medium">{formatCurrency(row.original.cost)}/{row.original.stockUnit}</span> },
    { header: "Status", accessorKey: "isActive", cell: ({ row }) => <div className="space-y-1"><StatusBadge status={row.original.isActive ? "Aktif" : "Nonaktif"} />{!row.original.isActive && (!row.original.salesUnit || !row.original.weightValue || !row.original.agent1Price || !row.original.agent2Price) ? <p className="text-[10px] text-[var(--app-text-muted)]">Draft belum lengkap</p> : null}</div> },
    ...(finishedProduction || finishedStock || finishedPrice || finishedCost ? [{ id: "action", header: "Tindakan", cell: ({ row }: { row: { original: Product } }) => <EditButton label="Kelola" onClick={() => setProductDraft({ ...row.original })} /> }] : []),
  ], [classificationData, finishedCost, finishedPrice, finishedProduction, finishedStock]);

  const auditColumns = useMemo<ColumnDef<AuditLog>[]>(() => [
    { header: "Waktu", accessorKey: "createdAt", cell: ({ getValue }) => formatDateTime(String(getValue())) },
    { header: "Master", accessorKey: "entityType", cell: ({ getValue }) => <StatusBadge status={String(getValue())} /> },
    { header: "Record", accessorKey: "recordLabel", cell: ({ getValue }) => <span className="font-medium">{String(getValue())}</span> },
    { header: "Perubahan", accessorFn: (row) => row.changes.join(" "), cell: ({ row }) => <ul className="max-w-[420px] space-y-1 text-xs text-[var(--app-text-muted)]">{row.original.changes.map((change) => <li key={change}>• {change}</li>)}</ul> },
    { header: "Pelaku", accessorKey: "actorName" },
  ], []);

  const saveCustomerDraft = () => {
    if (!customerDraft) return;
    try {
      const saved = saveCustomer(customerDraft);
      setCustomerDraft(null);
      toast("Master pelanggan tersimpan", `${saved.code} — ${saved.name}`);
    } catch (error) {
      toast("Pelanggan tidak dapat disimpan", error instanceof Error ? error.message : "Periksa kembali data pelanggan.");
    }
  };

  const saveSupplierDraft = () => {
    if (!supplierDraft) return;
    try {
      const saved = saveSupplier(supplierDraft);
      setSupplierDraft(null);
      toast("Master supplier tersimpan", `${saved.code} — ${saved.name}`);
    } catch (error) {
      toast("Supplier tidak dapat disimpan", error instanceof Error ? error.message : "Periksa kembali data supplier.");
    }
  };

  const saveProductDraft = () => {
    if (!productDraft) return;
    try {
      const saved = saveProduct(productDraft);
      setProductDraft(null);
      toast("Master barang tersimpan", `${saved.code} — ${saved.name}`);
    } catch (error) {
      toast("Barang tidak dapat disimpan", error instanceof Error ? error.message : "Periksa kembali detail barang.");
    }
  };

  const customerCategory = tab === "agent-2" ? "Agen 2" : "Agen 1";
  const customerData = customers.filter((customer) => customer.category === customerCategory);
  const metricItems: MetricItem[] = [];
  if (canViewMasterSection(role, "customers")) metricItems.push({ label: "Agen aktif", value: String(customers.filter((item) => item.isActive).length), detail: `${customers.filter((item) => item.category === "Agen 1").length} Agen 1 · ${customers.filter((item) => item.category === "Agen 2").length} Agen 2`, trend: "neutral", icon: <People24Regular />, onClick: () => setTab("agent-1"), targetId: "master-agents" });
  if (canViewMasterSection(role, "suppliers")) metricItems.push({ label: "Supplier aktif", value: String(suppliers.filter((item) => item.isActive).length), detail: `${suppliers.length} supplier terdaftar`, trend: "neutral", icon: <Database24Regular />, onClick: () => setTab("suppliers"), targetId: "master-suppliers" });
  if (canViewMasterSection(role, "materials")) metricItems.push({ label: "Barang/Bahan", value: String(materials.length), detail: "Bahan Baku · Toping · Kemasan", trend: "neutral", icon: <Box24Regular />, onClick: () => setTab("materials"), targetId: "master-materials" });
  if (canViewMasterSection(role, "finished-products")) metricItems.push({ label: "Barang Jadi", value: String(finishedProducts.length), detail: `${finishedProducts.filter((item) => item.cost > 0).length} SKU memiliki HPP`, trend: "neutral", icon: <Food24Regular />, onClick: () => setTab("finished-products"), targetId: "master-finished-products" });

  return (
    <div className="space-y-5">
      <PageHeader title="Master Data" description={`Satu sumber data bersama. ${role} hanya dapat mengelola bagian yang menjadi tanggung jawabnya; perubahan sensitif dicatat pada riwayat.`} />

      <MetricStrip items={metricItems} />

      <TabList selectedValue={tab} onTabSelect={(_, data) => setTab(data.value as MasterTab)} className="overflow-x-auto">
        {tabs.map((item) => <Tab key={item.value} value={item.value}>{item.label}</Tab>)}
      </TabList>

      {tab === "agent-1" || tab === "agent-2" ? (
        <SectionPanel
          id="master-agents"
          title={`Master ${customerCategory}`}
          description="Identitas dikelola Sales; tempo dan batas kredit dikelola Finance. Pelanggan nonaktif tetap ada pada histori."
          action={customerProfile ? <Button appearance="primary" size="small" icon={<Add20Regular />} onClick={() => openNewCustomer(customerCategory)}>Tambah {customerCategory}</Button> : undefined}
          noPadding
        >
          <DataTable data={customerData} columns={customerColumns} searchPlaceholder={`Cari kode, nama, kontak, atau kota ${customerCategory}...`} emptyTitle={`Belum ada ${customerCategory}`} emptyDescription="Tambahkan pelanggan pertama untuk kategori ini." />
        </SectionPanel>
      ) : null}

      {tab === "suppliers" ? (
        <SectionPanel id="master-suppliers" title="Master Supplier" description="Kode supplier unik dipakai oleh PO, penerimaan barang, utang, dan evaluasi supplier." action={supplierProfile ? <Button appearance="primary" size="small" icon={<Add20Regular />} onClick={() => setSupplierDraft(emptySupplier(suppliers.length + 1))}>Tambah supplier</Button> : undefined} noPadding>
          <DataTable data={suppliers} columns={supplierColumns} searchPlaceholder="Cari kode, supplier, kontak, atau kota..." />
        </SectionPanel>
      ) : null}

      {tab === "materials" ? (
        <SectionPanel id="master-materials" title="Master Barang/Bahan" description="Kelola Bahan Baku, Bahan Baku Toping, dan Kemasan. Pembelian memakai satuan beli; stok selalu memakai satuan stok." action={materialPurchase ? <Button appearance="primary" size="small" icon={<Add20Regular />} onClick={() => setProductDraft(emptyMaterial(materials.length + 1))}>Tambah barang/bahan</Button> : undefined} noPadding>
          <DataTable data={materials} columns={materialColumns} searchPlaceholder="Cari kode, nama, jenis, atau satuan..." />
        </SectionPanel>
      ) : null}

      {tab === "product-classification" ? <div id="master-classification" className="scroll-mt-24"><ProductClassificationPanel /></div> : null}

      {tab === "finished-products" ? (
        <SectionPanel id="master-finished-products" title="Master Barang Jadi / SKU" description="Setiap kombinasi akhir kategori, tipe, dan varian menjadi satu SKU. Seluruh Roti Box memakai satuan Box; jumlah roti per box boleh belum diisi." action={finishedProduction ? <Button appearance="primary" size="small" icon={<Add20Regular />} onClick={() => setProductDraft(emptyFinishedProduct(finishedProducts.length + 1, finishedProductCategories.find((item) => item.id === "finished-category-roti-box")?.id ?? finishedProductCategories[0]?.id ?? ""))}>Tambah SKU</Button> : undefined} noPadding>
          <div className="grid gap-3 border-b border-[var(--app-border)] p-4 sm:grid-cols-3">
            <Field label="Kategori"><Select value={finishedCategoryFilter} onChange={(event) => { setFinishedCategoryFilter(event.target.value); setFinishedTypeFilter("all"); setFinishedVariantFilter("all"); }}><option value="all">Semua kategori</option>{finishedProductCategories.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</Select></Field>
            <Field label="Tipe"><Select value={finishedTypeFilter} onChange={(event) => { setFinishedTypeFilter(event.target.value); setFinishedVariantFilter("all"); }}><option value="all">Semua tipe</option>{finishedTypeFilterOptions.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</Select></Field>
            <Field label="Varian"><Select value={finishedVariantFilter} onChange={(event) => setFinishedVariantFilter(event.target.value)}><option value="all">Semua varian</option>{finishedVariantFilterOptions.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</Select></Field>
          </div>
          <DataTable data={filteredFinishedProducts} columns={finishedColumns} searchPlaceholder="Cari kode, SKU, kategori, tipe, varian, atau harga..." />
        </SectionPanel>
      ) : null}

      {tab === "audit" ? (
        <SectionPanel id="master-audit" title="Riwayat perubahan Master Data" description="Nilai lama/baru, pelaku, dan waktu perubahan tersimpan dan tidak dapat diedit." noPadding>
          <DataTable data={auditLogs} columns={auditColumns} searchPlaceholder="Cari master, record, perubahan, atau pelaku..." emptyTitle="Belum ada perubahan" emptyDescription="Perubahan Master Data akan muncul di sini." />
        </SectionPanel>
      ) : null}

      <Dialog open={Boolean(customerDraft)} onOpenChange={(_, data) => !data.open && setCustomerDraft(null)}>
        <DialogSurface>
          <DialogBody>
            <DialogTitle>{customerDraft?.id ? "Kelola pelanggan" : `Tambah ${customerDraft?.category ?? "pelanggan"}`}</DialogTitle>
            <DialogContent className="space-y-4">
              <PermissionNote>Sales mengelola identitas dan status. Finance mengelola tempo serta batas kredit. Field di luar hak role ditampilkan read-only.</PermissionNote>
              <div className="grid gap-3 sm:grid-cols-2">
                <Field label="Kode pelanggan" required><Input value={customerDraft?.code ?? ""} disabled={!customerProfile} onChange={(_, data) => setCustomerDraft((current) => current ? { ...current, code: data.value } : current)} /></Field>
                <Field label="Kategori" required><Select value={customerDraft?.category ?? "Agen 1"} disabled={!customerProfile || !customerDraft?.id} onChange={(event) => setCustomerDraft((current) => current ? { ...current, category: event.target.value as CustomerCategory } : current)}><option>Agen 1</option><option>Agen 2</option></Select></Field>
              </div>
              <Field label="Nama pelanggan" required><Input value={customerDraft?.name ?? ""} disabled={!customerProfile} onChange={(_, data) => setCustomerDraft((current) => current ? { ...current, name: data.value } : current)} /></Field>
              <div className="grid gap-3 sm:grid-cols-2">
                <Field label="Nama kontak" required><Input value={customerDraft?.contactName ?? ""} disabled={!customerProfile} onChange={(_, data) => setCustomerDraft((current) => current ? { ...current, contactName: data.value } : current)} /></Field>
                <Field label="Nomor HP" required><Input value={customerDraft?.phone ?? ""} disabled={!customerProfile} onChange={(_, data) => setCustomerDraft((current) => current ? { ...current, phone: data.value } : current)} /></Field>
              </div>
              <Field label="Alamat" required><Textarea value={customerDraft?.address ?? ""} disabled={!customerProfile} resize="vertical" onChange={(_, data) => setCustomerDraft((current) => current ? { ...current, address: data.value } : current)} /></Field>
              <Field label="Kota" required><Input value={customerDraft?.city ?? ""} disabled={!customerProfile} onChange={(_, data) => setCustomerDraft((current) => current ? { ...current, city: data.value } : current)} /></Field>
              <div className="grid gap-3 sm:grid-cols-2">
                <Field label="Tempo pembayaran" hint="0 hari berarti tunai."><Input type="number" min="0" value={String(customerDraft?.paymentTermsDays ?? 0)} disabled={!customerFinance} contentAfter="hari" onChange={(_, data) => setCustomerDraft((current) => current ? { ...current, paymentTermsDays: Number(data.value) || 0 } : current)} /></Field>
                <Field label="Batas kredit" hint="Maksimum hutang/piutang terbuka."><Input type="number" min="0" value={String(customerDraft?.creditLimit ?? 0)} disabled={!customerFinance} onChange={(_, data) => setCustomerDraft((current) => current ? { ...current, creditLimit: Number(data.value) || 0 } : current)} /></Field>
              </div>
              <Field label="Catatan"><Textarea value={customerDraft?.notes ?? ""} disabled={!customerProfile} resize="vertical" onChange={(_, data) => setCustomerDraft((current) => current ? { ...current, notes: data.value } : current)} /></Field>
              <Checkbox checked={customerDraft?.isActive ?? false} disabled={!customerProfile} onChange={(_, data) => setCustomerDraft((current) => current ? { ...current, isActive: Boolean(data.checked) } : current)} label="Status aktif" />
            </DialogContent>
            <DialogActions><Button appearance="secondary" onClick={() => setCustomerDraft(null)}>Batal</Button><Button appearance="primary" onClick={saveCustomerDraft}>Simpan</Button></DialogActions>
          </DialogBody>
        </DialogSurface>
      </Dialog>

      <Dialog open={Boolean(supplierDraft)} onOpenChange={(_, data) => !data.open && setSupplierDraft(null)}>
        <DialogSurface>
          <DialogBody>
            <DialogTitle>{supplierDraft?.id ? "Kelola supplier" : "Tambah supplier"}</DialogTitle>
            <DialogContent className="space-y-4">
              <PermissionNote>Purchasing mengelola identitas supplier. Finance mengelola tempo pembayaran pada record yang sama.</PermissionNote>
              <div className="grid gap-3 sm:grid-cols-2">
                <Field label="Kode supplier" required><Input value={supplierDraft?.code ?? ""} disabled={!supplierProfile} onChange={(_, data) => setSupplierDraft((current) => current ? { ...current, code: data.value } : current)} /></Field>
                <Field label="Tempo pembayaran" hint="0 hari berarti tunai."><Input type="number" min="0" value={String(supplierDraft?.paymentTermsDays ?? 0)} disabled={!supplierFinance} contentAfter="hari" onChange={(_, data) => setSupplierDraft((current) => current ? { ...current, paymentTermsDays: Number(data.value) || 0 } : current)} /></Field>
              </div>
              <Field label="Nama supplier" required><Input value={supplierDraft?.name ?? ""} disabled={!supplierProfile} onChange={(_, data) => setSupplierDraft((current) => current ? { ...current, name: data.value } : current)} /></Field>
              <div className="grid gap-3 sm:grid-cols-2">
                <Field label="Nama kontak" required><Input value={supplierDraft?.contactName ?? ""} disabled={!supplierProfile} onChange={(_, data) => setSupplierDraft((current) => current ? { ...current, contactName: data.value } : current)} /></Field>
                <Field label="Nomor HP" required><Input value={supplierDraft?.phone ?? ""} disabled={!supplierProfile} onChange={(_, data) => setSupplierDraft((current) => current ? { ...current, phone: data.value } : current)} /></Field>
              </div>
              <Field label="Alamat" required><Textarea value={supplierDraft?.address ?? ""} disabled={!supplierProfile} resize="vertical" onChange={(_, data) => setSupplierDraft((current) => current ? { ...current, address: data.value } : current)} /></Field>
              <Field label="Kota" required><Input value={supplierDraft?.city ?? ""} disabled={!supplierProfile} onChange={(_, data) => setSupplierDraft((current) => current ? { ...current, city: data.value } : current)} /></Field>
              <Field label="Catatan"><Textarea value={supplierDraft?.notes ?? ""} disabled={!supplierProfile} resize="vertical" onChange={(_, data) => setSupplierDraft((current) => current ? { ...current, notes: data.value } : current)} /></Field>
              <Checkbox checked={supplierDraft?.isActive ?? false} disabled={!supplierProfile} onChange={(_, data) => setSupplierDraft((current) => current ? { ...current, isActive: Boolean(data.checked) } : current)} label="Status aktif" />
            </DialogContent>
            <DialogActions><Button appearance="secondary" onClick={() => setSupplierDraft(null)}>Batal</Button><Button appearance="primary" onClick={saveSupplierDraft}>Simpan</Button></DialogActions>
          </DialogBody>
        </DialogSurface>
      </Dialog>

      <Dialog open={Boolean(productDraft)} onOpenChange={(_, data) => !data.open && setProductDraft(null)}>
        <DialogSurface className="erp-dialog--medium">
          <DialogBody>
            <DialogTitle>{productDraft?.id ? `Kelola ${productDraft.type === "Produk Jadi" ? "Barang Jadi" : "Barang/Bahan"}` : `Tambah ${productDraft?.type === "Produk Jadi" ? "Barang Jadi" : "Barang/Bahan"}`}</DialogTitle>
            <DialogContent className="space-y-4">
              {productDraft?.type === "Produk Jadi" ? (
                <>
                  <PermissionNote>Produksi mengelola klasifikasi dan spesifikasi, Gudang mengelola stok minimum, Sales mengelola dua harga kategori, dan Finance/Owner mengelola HPP master.</PermissionNote>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <Field label="Kode SKU" required><Input value={productDraft.code} disabled={!finishedProduction} onChange={(_, data) => setProductDraft((current) => current ? { ...current, code: data.value } : current)} /></Field>
                    <Field label="Kategori" required><Select value={productDraft.finishedProductCategoryId ?? ""} disabled={!finishedProduction} onChange={(event) => setProductDraft((current) => {
                      if (!current) return current;
                      const categoryId = event.target.value;
                      const next = { ...current, finishedProductCategoryId: categoryId, finishedProductTypeId: undefined, finishedProductVariantId: undefined };
                      if (categoryId === "finished-category-roti-box") Object.assign(next, { salesUnit: "Box", stockUnit: "Box" });
                      else Object.assign(next, { salesUnit: "", stockUnit: "", contentQuantity: undefined, contentUnit: undefined });
                      return { ...next, name: buildFinishedProductName(next, classificationData) };
                    })}><option value="">Pilih kategori</option>{finishedProductCategories.map((item) => <option key={item.id} value={item.id} disabled={!item.isActive && item.id !== productDraft.finishedProductCategoryId}>{item.name}</option>)}</Select></Field>
                  </div>
                  {draftCategory?.requiresType ? <div className="grid gap-3 sm:grid-cols-2">
                    <Field label="Tipe" required><Select value={productDraft.finishedProductTypeId ?? ""} disabled={!finishedProduction} onChange={(event) => setProductDraft((current) => {
                      if (!current) return current;
                      const next = { ...current, finishedProductTypeId: event.target.value || undefined, finishedProductVariantId: undefined };
                      return { ...next, name: buildFinishedProductName(next, classificationData) };
                    })}><option value="">Pilih tipe</option>{draftTypes.map((item) => <option key={item.id} value={item.id} disabled={!item.isActive && item.id !== productDraft.finishedProductTypeId}>{item.name}</option>)}</Select></Field>
                    {draftCategory.requiresVariant ? <Field label="Varian" required><Select value={productDraft.finishedProductVariantId ?? ""} disabled={!finishedProduction || !productDraft.finishedProductTypeId} onChange={(event) => setProductDraft((current) => {
                      if (!current) return current;
                      const next = { ...current, finishedProductVariantId: event.target.value || undefined };
                      return { ...next, name: buildFinishedProductName(next, classificationData) };
                    })}><option value="">Pilih varian</option>{draftVariants.map((item) => <option key={item.id} value={item.id} disabled={!item.isActive && item.id !== productDraft.finishedProductVariantId}>{item.name}</option>)}</Select></Field> : null}
                  </div> : null}
                  <Field label="Nama SKU" hint="Dibentuk otomatis dari kategori, tipe, dan varian."><Input readOnly value={productDraft.name || buildFinishedProductName(productDraft, classificationData)} /></Field>
                  {draftVariant?.description ? <div className="rounded-lg border border-[var(--app-border)] bg-[var(--app-surface-2)] p-3 text-xs leading-5"><strong>Deskripsi varian:</strong> {draftVariant.description}</div> : null}
                  <div className="grid gap-3 sm:grid-cols-3">
                    <Field label="Satuan jual/stok" required={productDraft.isActive} hint={isDraftRotiBox ? "Terkunci sesuai Q47." : "Roti Black Forest belum dikonfirmasi (Q52)."}>{isDraftRotiBox ? <Input readOnly value="Box" /> : <Select value={productDraft.salesUnit ?? ""} disabled={!finishedProduction} onChange={(event) => setProductDraft((current) => current ? { ...current, salesUnit: event.target.value, stockUnit: event.target.value } : current)}><UnitOptions /></Select>}</Field>
                    <Field label="Berat" required={productDraft.isActive}><Input type="number" min="0" value={productDraft.weightValue ? String(productDraft.weightValue) : ""} disabled={!finishedProduction} onChange={(_, data) => setProductDraft((current) => current ? { ...current, weightValue: Number(data.value) || 0 } : current)} /></Field>
                    <Field label="Satuan berat" required={productDraft.isActive}><Select value={productDraft.weightUnit ?? ""} disabled={!finishedProduction} onChange={(event) => setProductDraft((current) => current ? { ...current, weightUnit: event.target.value } : current)}><UnitOptions families={["Berat"]} /></Select></Field>
                  </div>
                  {isDraftRotiBox ? <Field label="Jumlah roti per box (opsional)" hint="Boleh kosong sampai jumlah isi diketahui; stok dan penjualan tetap dihitung dalam Box."><Input type="number" min="1" step="1" value={productDraft.contentQuantity ? String(productDraft.contentQuantity) : ""} disabled={!finishedProduction} contentAfter="Roti / Box" onChange={(_, data) => setProductDraft((current) => current ? { ...current, contentQuantity: data.value ? Number(data.value) : undefined, contentUnit: data.value ? "Roti" : undefined } : current)} /></Field> : null}
                  <Field label="Deskripsi kemasan"><Textarea value={productDraft.packagingDescription ?? ""} disabled={!finishedProduction} resize="vertical" onChange={(_, data) => setProductDraft((current) => current ? { ...current, packagingDescription: data.value } : current)} /></Field>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <Field label="Umur simpan"><Input type="number" min="0" value={String(productDraft.shelfLifeDays)} disabled={!finishedProduction} contentAfter="hari" onChange={(_, data) => setProductDraft((current) => current ? { ...current, shelfLifeDays: Number(data.value) || 0 } : current)} /></Field>
                    <Field label="Stok minimum"><Input type="number" min="0" value={String(productDraft.minStock)} disabled={!finishedStock} contentAfter={productDraft.stockUnit} onChange={(_, data) => setProductDraft((current) => current ? { ...current, minStock: Number(data.value) || 0 } : current)} /></Field>
                  </div>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <Field label="Harga Agen 1" required={productDraft.isActive}><Input type="number" min="0" value={String(productDraft.agent1Price)} disabled={!finishedPrice} contentAfter={`/${productDraft.salesUnit || "satuan"}`} onChange={(_, data) => setProductDraft((current) => current ? { ...current, agent1Price: Number(data.value) || 0 } : current)} /></Field>
                    <Field label="Harga Agen 2" required={productDraft.isActive}><Input type="number" min="0" value={String(productDraft.agent2Price)} disabled={!finishedPrice} contentAfter={`/${productDraft.salesUnit || "satuan"}`} onChange={(_, data) => setProductDraft((current) => current ? { ...current, agent2Price: Number(data.value) || 0 } : current)} /></Field>
                  </div>
                  <Field label="HPP per satuan stok" required={productDraft.isActive} hint="Dipakai untuk menghitung nilai Gudang Produk Jadi dan laba kotor."><Input type="number" min="0" value={String(productDraft.cost)} disabled={!finishedCost} contentAfter={`/${productDraft.stockUnit || "satuan"}`} onChange={(_, data) => setProductDraft((current) => current ? { ...current, cost: Number(data.value) || 0 } : current)} /></Field>
                  <Field label="Catatan"><Textarea value={productDraft.notes} disabled={!finishedProduction} resize="vertical" onChange={(_, data) => setProductDraft((current) => current ? { ...current, notes: data.value } : current)} /></Field>
                  <Checkbox checked={productDraft.isActive} disabled={!finishedProduction} onChange={(_, data) => setProductDraft((current) => current ? { ...current, isActive: Boolean(data.checked) } : current)} label="Status aktif" />
                </>
              ) : productDraft ? (
                <>
                  <PermissionNote>Purchasing mengisi satuan beli serta isi setiap kemasan. Gudang memilih satuan stok dan mengisi stok minimum dalam Satuan Isi; sistem menampilkan hasil konversinya ke Satuan Stok.</PermissionNote>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <Field label="Kode barang" required><Input value={productDraft.code} disabled={!materialPurchase} onChange={(_, data) => setProductDraft((current) => current ? { ...current, code: data.value } : current)} /></Field>
                    <Field label="Jenis" required><Select value={productDraft.type} disabled={!materialPurchase} onChange={(event) => setProductDraft((current) => current ? { ...current, type: event.target.value as Product["type"] } : current)}><option>Bahan Baku</option><option>Bahan Baku Toping</option><option>Kemasan</option></Select></Field>
                  </div>
                  <Field label="Nama barang" required><Input value={productDraft.name} disabled={!materialPurchase} onChange={(_, data) => setProductDraft((current) => current ? { ...current, name: data.value } : current)} /></Field>
                  <div className="grid gap-3 sm:grid-cols-3">
                    <Field label="Satuan beli" required><Select value={productDraft.purchaseUnit ?? ""} disabled={!materialPurchase} onChange={(event) => setProductDraft((current) => current ? { ...current, purchaseUnit: event.target.value } : current)}><UnitOptions /></Select></Field>
                    <Field label={`Isi per ${productDraft.purchaseUnit || "satuan beli"}`} required><Input type="number" min="0.0001" step="any" value={String(productDraft.purchaseContentValue ?? 0)} disabled={!materialPurchase} onChange={(_, data) => setProductDraft((current) => current ? { ...current, purchaseContentValue: Number(data.value) || 0 } : current)} /></Field>
                    <Field label="Satuan isi" required><Select value={productDraft.purchaseContentUnit ?? ""} disabled={!materialPurchase} onChange={(event) => setProductDraft((current) => current ? { ...current, purchaseContentUnit: event.target.value } : current)}><UnitOptions /></Select></Field>
                  </div>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <Field label="Satuan stok" required><Select value={productDraft.stockUnit} disabled={!materialStock} onChange={(event) => setProductDraft((current) => current ? { ...current, stockUnit: event.target.value } : current)}><UnitOptions /></Select></Field>
                    <Field label={`Nilai konversi otomatis per ${productDraft.purchaseUnit || "satuan beli"}`}><Input readOnly value={materialAutomaticConversion === null ? "Belum valid" : `${formatNumber(materialAutomaticConversion, 6)} ${productDraft.stockUnit}`} /></Field>
                  </div>
                  <div className={`rounded-lg border p-3 text-sm ${productDraft.stockUnit && materialAutomaticConversion === null ? "border-red-300 bg-red-50 text-red-800" : "border-[var(--app-border)]"}`}>
                    <strong>1 {productDraft.purchaseUnit || "satuan beli"} berisi {formatNumber(productDraft.purchaseContentValue ?? 0, 6)} {productDraft.purchaseContentUnit || "satuan isi"}</strong>
                    <p className="mt-1 text-xs">{describeUnitCompatibility(productDraft.purchaseContentUnit ?? "", productDraft.stockUnit)}</p>
                    {materialAutomaticConversion !== null ? <p className="tabular mt-2 font-medium">Hasil akhir: 1 {productDraft.purchaseUnit} = {formatNumber(materialAutomaticConversion, 6)} {productDraft.stockUnit}. Jika membeli 2 {productDraft.purchaseUnit}, stok bertambah {formatNumber(2 * materialAutomaticConversion, 6)} {productDraft.stockUnit}.</p> : null}
                  </div>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <Field label={`Harga beli per ${productDraft.purchaseUnit || "satuan beli"}`}><Input type="number" min="0" value={String(productDraft.purchasePrice)} disabled={!materialPurchase} onChange={(_, data) => setProductDraft((current) => current ? { ...current, purchasePrice: Number(data.value) || 0 } : current)} /></Field>
                    <Field label={`Biaya per ${productDraft.stockUnit || "satuan stok"}`}><Input readOnly value={formatCurrency(materialAutomaticConversion && materialAutomaticConversion > 0 ? productDraft.purchasePrice / materialAutomaticConversion : 0)} /></Field>
                  </div>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <Field label="Stok minimum dalam Satuan Isi" hint={`Masukkan dalam ${productDraft.purchaseContentUnit || "Satuan Isi"}; sistem menyimpan saldo batas minimum dalam ${productDraft.stockUnit || "Satuan Stok"}.`}><Input type="number" min="0" step="any" value={String(productDraft.minStockInputValue ?? 0)} disabled={!materialStock} contentAfter={productDraft.purchaseContentUnit || "Satuan Isi"} onChange={(_, data) => setProductDraft((current) => current ? { ...current, minStockInputValue: Number(data.value) || 0, minStockInputUnit: current.purchaseContentUnit } : current)} /></Field>
                    <Field label="Umur simpan"><Input type="number" min="0" value={String(productDraft.shelfLifeDays)} disabled={!materialStock} contentAfter="hari" onChange={(_, data) => setProductDraft((current) => current ? { ...current, shelfLifeDays: Number(data.value) || 0 } : current)} /></Field>
                  </div>
                  <div className="rounded-lg border border-[var(--app-border)] bg-[var(--app-surface-2)] p-3 text-sm">
                    <p className="text-xs text-[var(--app-text-muted)]">Hasil konversi stok minimum</p>
                    <p className="tabular mt-1 font-semibold">{formatNumber(productDraft.minStockInputValue ?? 0)} {productDraft.purchaseContentUnit || "Satuan Isi"} = {materialMinimumInStockUnit === null ? "konversi belum valid" : `${formatNumber(materialMinimumInStockUnit, 6)} ${productDraft.stockUnit}`}</p>
                  </div>
                  <Field label="Catatan"><Textarea value={productDraft.notes} disabled={!materialPurchase} resize="vertical" onChange={(_, data) => setProductDraft((current) => current ? { ...current, notes: data.value } : current)} /></Field>
                  <Checkbox checked={productDraft.isActive} disabled={!materialStock} onChange={(_, data) => setProductDraft((current) => current ? { ...current, isActive: Boolean(data.checked) } : current)} label="Status aktif" />
                </>
              ) : null}
            </DialogContent>
            <DialogActions><Button appearance="secondary" onClick={() => setProductDraft(null)}>Batal</Button><Button appearance="primary" onClick={saveProductDraft}>Simpan</Button></DialogActions>
          </DialogBody>
        </DialogSurface>
      </Dialog>
    </div>
  );
}
