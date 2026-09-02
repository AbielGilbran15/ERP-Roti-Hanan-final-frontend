"use client";

import type { ColumnDef } from "@tanstack/react-table";
import {
  Button,
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
} from "@fluentui/react-components";
import {
  ArrowRight20Regular,
  ArrowSwap24Regular,
  Box24Regular,
  BuildingFactory24Regular,
  Clock24Regular,
  VehicleTruck24Regular,
  Warning24Regular,
} from "@fluentui/react-icons";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { StockCountLineEditor } from "@/components/inventory/stock-count-line-editor";
import { DataTable } from "@/components/ui/data-table";
import { MetricStrip } from "@/components/ui/metric-strip";
import { PageHeader } from "@/components/ui/page-header";
import { SectionPanel } from "@/components/ui/section-panel";
import { StatusBadge } from "@/components/ui/status-badge";
import { useAppToast } from "@/components/ui/app-toast";
import { useCurrentAccess } from "@/hooks/use-current-access";
import { useMetricSection } from "@/hooks/use-metric-section";
import { canPerformAction } from "@/lib/access";
import { formatCurrency, formatDate, formatNumber } from "@/lib/format";
import { downloadDeliveryAttachment, saveDeliveryAttachments } from "@/lib/delivery-attachments";
import { calculateStockCountVariance, createStockCountDrafts, parseStockCountQuantity, type StockCountDrafts } from "@/lib/stock-count";
import type { DeliveryIssueType, DeliveryResolution, ProductionOrder, Sale, SalesReturnCondition, StockCount, StockItem, StockMovement } from "@/lib/types";
import { useERPStore, type FulfillmentAdvanceResult } from "@/store/use-erp-store";

type FulfillmentIssue = {
  saleId: string;
  result: Extract<FulfillmentAdvanceResult, { ok: false }>;
};

const maxAttachmentSize = 10 * 1024 * 1024;
const acceptedAttachmentTypes = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
];
const acceptedAttachmentExtensions = [".jpg", ".jpeg", ".png", ".webp", ".pdf", ".doc", ".docx"];

const inventoryMetricSections = {
  "inventory-requests": "requests",
  "inventory-materials": "materials",
  "inventory-finished": "finished",
  "inventory-movements": "movements",
  "inventory-fulfillment": "fulfillment",
} as const;

const isAcceptedAttachment = (file: File) =>
  acceptedAttachmentTypes.includes(file.type) ||
  acceptedAttachmentExtensions.some((extension) => file.name.toLowerCase().endsWith(extension));

const formatFileSize = (size: number) => size < 1024 * 1024
  ? `${Math.ceil(size / 1024)} KB`
  : `${(size / (1024 * 1024)).toFixed(1)} MB`;

const stockStatusCopy = (status: StockItem["status"]) => {
  switch (status) {
    case "Tersedia":
      return { label: "Siap dipakai", detail: "Dapat dialokasikan" };
    case "Staging Produksi":
      return { label: "Diserahkan ke Produksi", detail: "Sudah keluar dari stok gudang" };
    case "Rusak":
      return { label: "Rusak", detail: "Tidak boleh dipakai atau dijual" };
    case "Dalam Pengiriman":
      return { label: "Dalam pengiriman", detail: "Belum diterima tujuan" };
    default:
      return { label: status, detail: "Status operasional lot" };
  }
};

export default function InventoryPage() {
  const router = useRouter();
  const [tab, setTab] = useState("requests");
  const [requestToDefer, setRequestToDefer] = useState<string | null>(null);
  const [deferHours, setDeferHours] = useState("2");
  const [deferReason, setDeferReason] = useState("");
  const [now, setNow] = useState(() => Date.now());
  const [deliveryId, setDeliveryId] = useState<string | null>(null);
  const [fulfillmentIssue, setFulfillmentIssue] = useState<FulfillmentIssue | null>(null);
  const [deliveryProof, setDeliveryProof] = useState("");
  const [deliveryIssue, setDeliveryIssue] = useState("");
  const [deliveryIssueType, setDeliveryIssueType] = useState<DeliveryIssueType>("Rusak");
  const [deliveryFiles, setDeliveryFiles] = useState<File[]>([]);
  const [resolutionSaleId, setResolutionSaleId] = useState<string | null>(null);
  const [deliveryResolution, setDeliveryResolution] = useState<DeliveryResolution>("Diterima dengan Catatan");
  const [resolutionNote, setResolutionNote] = useState("");
  const [returnQuantities, setReturnQuantities] = useState<Record<string, string>>({});
  const [returnConditions, setReturnConditions] = useState<Record<string, SalesReturnCondition>>({});
  const [stockCountDialogOpen, setStockCountDialogOpen] = useState(false);
  const [stockCountWarehouse, setStockCountWarehouse] = useState("Gudang Bahan");
  const [selectedStockCountId, setSelectedStockCountId] = useState<string | null>(null);
  const [countDrafts, setCountDrafts] = useState<StockCountDrafts>({});
  const stockCountPanelRef = useRef<HTMLDivElement>(null);
  const toast = useAppToast();
  const { role } = useCurrentAccess();
  const canManageFulfillment = canPerformAction(role, "inventory.fulfillment");
  const canReviewProductionRequest = canPerformAction(role, "inventory.production.review");
  const canRequestPurchase = canPerformAction(role, "inventory.production.purchase-request");
  const canManageStockCount = canPerformAction(role, "inventory.stock-count");
  const stocks = useERPStore((state) => state.stocks);
  const stockMovements = useERPStore((state) => state.stockMovements);
  const stockCounts = useERPStore((state) => state.stockCounts);
  const productionOrders = useERPStore((state) => state.productionOrders);
  const sales = useERPStore((state) => state.sales);
  const customers = useERPStore((state) => state.customers);
  const products = useERPStore((state) => state.products);
  const productName = (id: string) => products.find((product) => product.id === id)?.name ?? id;
  const advanceFulfillment = useERPStore((state) => state.advanceFulfillment);
  const confirmDelivery = useERPStore((state) => state.confirmDelivery);
  const resolveDeliveryIssue = useERPStore((state) => state.resolveDeliveryIssue);
  const createSalesReturn = useERPStore((state) => state.createSalesReturn);
  const reviewProductionRequest = useERPStore((state) => state.reviewProductionRequest);
  const requestMaterialPurchase = useERPStore((state) => state.requestMaterialPurchase);
  const createStockCount = useERPStore((state) => state.createStockCount);
  const updateStockCountLine = useERPStore((state) => state.updateStockCountLine);
  const submitStockCount = useERPStore((state) => state.submitStockCount);
  const postStockCount = useERPStore((state) => state.postStockCount);

  useMetricSection(inventoryMetricSections, setTab);

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 30_000);
    return () => window.clearInterval(timer);
  }, []);

  const materialProducts = products.filter((product) => product.type !== "Produk Jadi" && product.isActive);
  const finishedProducts = products.filter((product) => product.type === "Produk Jadi" && product.isActive);
  const materialStocks = stocks.filter((stock) => materialProducts.some((product) => product.id === stock.productId));
  const finishedStocks = stocks.filter((stock) => finishedProducts.some((product) => product.id === stock.productId) && stock.warehouse === "Gudang Produk Jadi");
  const availableMaterialLots = materialStocks.filter((stock) => stock.status === "Tersedia");
  const lowStock = products.filter((product) => product.isActive).filter((product) => {
    const available = stocks
      .filter((stock) => stock.productId === product.id && stock.status === "Tersedia")
      .reduce((sum, stock) => sum + Math.max(stock.onHand - stock.reserved, 0), 0);
    return available < product.minStock;
  });
  const lowStockRows = lowStock.map((product) => {
    const available = stocks
      .filter((stock) => stock.productId === product.id && stock.status === "Tersedia")
      .reduce((sum, stock) => sum + Math.max(stock.onHand - stock.reserved, 0), 0);
    return {
      productId: product.id,
      productName: product.name,
      code: product.code,
      type: product.type,
      available,
      minimum: product.minStock,
      shortage: Math.max(product.minStock - available, 0),
      unit: product.stockUnit,
    };
  });
  const fulfillmentOrders = sales.filter((sale) => !["Selesai", "Diretur"].includes(sale.status));
  const documentedDeliveries = sales.filter((sale) => (sale.deliveryAttachments?.length ?? 0) > 0);
  const inDelivery = sales.filter((sale) => sale.status === "Dalam Pengiriman");
  const requestStatuses: ProductionOrder["status"][] = ["Menunggu Gudang", "Ditunda Gudang", "Kekurangan Bahan", "Menunggu Pembelian"];
  const materialRequests = productionOrders.filter((order) => {
    if (!requestStatuses.includes(order.status)) return false;
    if (order.status !== "Ditunda Gudang" || !order.materialRequestExpiresAt) return true;
    return new Date(order.materialRequestExpiresAt).getTime() > now;
  });

  const requestCountdown = (order: ProductionOrder) => {
    if (!order.materialRequestExpiresAt) return "Tanpa batas waktu";
    const remaining = new Date(order.materialRequestExpiresAt).getTime() - now;
    if (remaining <= 0) return "Kedaluwarsa dari antrean";
    const hours = Math.floor(remaining / 3_600_000);
    const minutes = Math.ceil((remaining % 3_600_000) / 60_000);
    return `${hours}j ${minutes}m tersisa`;
  };

  const materialPositions = materialProducts.map((product) => {
    const productStocks = stocks.filter((stock) => stock.productId === product.id);
    const activeRequirements = productionOrders
      .filter((order) => order.status !== "Selesai")
      .flatMap((order) => order.materials)
      .filter((requirement) => requirement.materialProductId === product.id);
    return {
      productId: product.id,
      type: product.type,
      unit: product.stockUnit,
      onHand: productStocks.reduce((sum, stock) => sum + stock.onHand, 0),
      available: productStocks.filter((stock) => stock.status === "Tersedia").reduce((sum, stock) => sum + Math.max(stock.onHand - stock.reserved, 0), 0),
      reserved: productStocks.filter((stock) => stock.status === "Tersedia").reduce((sum, stock) => sum + stock.reserved, 0),
      staging: productStocks.filter((stock) => stock.status === "Staging Produksi").reduce((sum, stock) => sum + stock.onHand, 0),
      requested: activeRequirements.reduce((sum, requirement) => sum + requirement.requestedQty, 0),
      shortage: activeRequirements.reduce((sum, requirement) => sum + requirement.shortageQty, 0),
    };
  });
  const finishedPositions = finishedProducts.map((product) => {
    const productStocks = finishedStocks.filter((stock) => stock.productId === product.id && stock.status === "Tersedia");
    const onHand = productStocks.reduce((sum, stock) => sum + stock.onHand, 0);
    const reserved = productStocks.reduce((sum, stock) => sum + stock.reserved, 0);
    return {
      productId: product.id,
      code: product.code,
      unit: product.stockUnit,
      onHand,
      reserved,
      available: Math.max(onHand - reserved, 0),
      hpp: product.cost,
      value: onHand * product.cost,
      lots: productStocks.length,
    };
  });
  const finishedInventoryValue = finishedPositions.reduce((sum, item) => sum + item.value, 0);
  const selectedStockCount = stockCounts.find((count) => count.id === selectedStockCountId);

  useEffect(() => {
    if (!selectedStockCount) return;
    setCountDrafts(createStockCountDrafts(selectedStockCount.lines));
  }, [selectedStockCount?.id]);

  const openStockCount = useCallback((count: StockCount) => {
    setSelectedStockCountId(count.id);
    setCountDrafts(createStockCountDrafts(count.lines));
    window.requestAnimationFrame(() => stockCountPanelRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }));
  }, []);

  const materialRequestColumns = useMemo<ColumnDef<ProductionOrder>[]>(() => [
    {
      header: "Permintaan / batch",
      accessorFn: (row) => `${row.materialRequestNumber} ${row.batchNumber}`,
      cell: ({ row }) => <div><p className="font-mono text-xs font-semibold">{row.original.materialRequestNumber ?? "Dokumen lama"}</p><p className="mt-0.5 font-mono text-[11px] text-[var(--app-text-muted)]">{row.original.batchNumber}</p></div>,
    },
    { header: "Kategori diminta", accessorFn: (row) => [...new Set(row.materials.map((item) => item.role))].join(" "), cell: ({ row }) => <div className="flex min-w-[170px] flex-wrap gap-1">{[...new Set(row.original.materials.map((item) => item.role))].map((type) => <StatusBadge key={type} status={type} />)}</div> },
    {
      header: "Bahan diminta",
      accessorFn: (row) => row.materials.map((item) => productName(item.materialProductId)).join(" "),
      cell: ({ row }) => <div className="space-y-1">{row.original.materials.map((item) => {
        const product = products.find((candidate) => candidate.id === item.materialProductId);
        const available = stocks.filter((stock) => stock.productId === item.materialProductId && stock.status === "Tersedia").reduce((sum, stock) => sum + stock.onHand, 0);
        return <p key={item.id} className="flex min-w-[240px] items-center justify-between gap-3 text-xs"><span>{product?.name}</span><span className={available + 0.000001 < item.requestedQty ? "tabular font-semibold text-red-700 dark:text-red-300" : "tabular text-[var(--app-text-muted)]"}>{formatNumber(item.requestedQty)} {product?.stockUnit}</span></p>;
      })}</div>,
    },
    { header: "Prioritas", accessorKey: "priority", cell: ({ getValue }) => <StatusBadge status={String(getValue())} /> },
    { header: "Status", accessorKey: "status", cell: ({ row }) => <div><StatusBadge status={row.original.status} />{row.original.materialRequestNote ? <p className="mt-1 max-w-56 text-[11px] leading-4 text-[var(--app-text-muted)]">{row.original.materialRequestNote}</p> : null}</div> },
    { header: "Batas waktu", accessorKey: "materialRequestExpiresAt", cell: ({ row }) => <div><p className="text-xs font-medium">{requestCountdown(row.original)}</p>{row.original.materialRequestExpiresAt ? <p className="mt-0.5 text-[11px] text-[var(--app-text-muted)]">{formatDate(row.original.materialRequestExpiresAt, "dd MMM, HH:mm")}</p> : null}</div> },
    {
      id: "action",
      header: "Tindakan Gudang",
      cell: ({ row }) => {
        const order = row.original;
        if (!canReviewProductionRequest) return <span className="text-xs text-[var(--app-text-muted)]">Hanya lihat</span>;
        return <div className="flex min-w-[230px] flex-wrap gap-1.5">
          <Button size="small" appearance="primary" onClick={() => {
            try {
              reviewProductionRequest(order.id, "Disetujui", undefined, "Stok diperiksa oleh Gudang.");
              const current = useERPStore.getState().productionOrders.find((item) => item.id === order.id);
              toast(current?.status === "Disetujui Gudang" ? "Permintaan disetujui" : "Stok belum mencukupi", current?.status === "Disetujui Gudang" ? "Produksi perlu mengonfirmasi penerimaan; stok belum berkurang." : "Teruskan kekurangan bahan ke Purchasing.", current?.status === "Disetujui Gudang" ? "success" : "warning");
            } catch (error) {
              toast("Permintaan tidak dapat diproses", error instanceof Error ? error.message : "Periksa stok bahan.", "error");
            }
          }}>{order.status === "Menunggu Pembelian" ? "Periksa ulang stok" : "Konfirmasi"}</Button>
          {order.status === "Kekurangan Bahan" && canRequestPurchase ? <Button size="small" appearance="secondary" onClick={() => {
            try {
              const request = requestMaterialPurchase(order.id);
              toast("Diteruskan ke Purchasing", `${request.number} · ${request.items.length} bahan.`);
            } catch (error) {
              toast("Tidak dapat diteruskan", error instanceof Error ? error.message : "Periksa data kekurangan.", "error");
            }
          }}>Ke Purchasing</Button> : null}
          {order.status !== "Menunggu Pembelian" ? <Button size="small" appearance="subtle" onClick={() => { setRequestToDefer(order.id); setDeferHours("2"); setDeferReason(""); }}>Tunda</Button> : null}
        </div>;
      },
    },
  ], [canRequestPurchase, canReviewProductionRequest, now, products, requestMaterialPurchase, reviewProductionRequest, stocks, toast]);

  const stockColumns = useMemo<ColumnDef<StockItem>[]>(
    () => [
      {
        header: "Barang",
        accessorFn: (row) => productName(row.productId),
        cell: ({ row }) => (
          <div>
            <p className="font-medium">{productName(row.original.productId)}</p>
            <p className="mt-0.5 font-mono text-[11px] text-[var(--app-text-muted)]">{products.find((item) => item.id === row.original.productId)?.code}</p>
          </div>
        ),
      },
      { header: "Lot", accessorKey: "lot", cell: ({ getValue }) => <span className="font-mono text-xs">{String(getValue())}</span> },
      { header: "Kedaluwarsa", accessorKey: "expiryDate", cell: ({ getValue }) => getValue() ? formatDate(String(getValue())) : "—" },
      { header: "Fisik", accessorKey: "onHand", cell: ({ row }) => <div className="text-right"><span className="tabular font-semibold">{formatNumber(row.original.onHand)}</span><span className="ml-1 text-xs text-[var(--app-text-muted)]">{products.find((item) => item.id === row.original.productId)?.stockUnit}</span></div> },
      { header: "Direservasi", accessorKey: "reserved", cell: ({ row }) => <div className="text-right"><span className="tabular">{formatNumber(row.original.reserved)}</span><span className="ml-1 text-xs text-[var(--app-text-muted)]">{products.find((item) => item.id === row.original.productId)?.stockUnit}</span></div> },
      {
        header: "Tersedia",
        accessorFn: (row) => row.status === "Tersedia" ? row.onHand - row.reserved : 0,
        cell: ({ row }) => (
          <div className="text-right">
            <span className="tabular font-semibold">{formatNumber(row.original.status === "Tersedia" ? row.original.onHand - row.original.reserved : 0)}</span>
            <span className="ml-1 text-xs text-[var(--app-text-muted)]">{products.find((item) => item.id === row.original.productId)?.stockUnit}</span>
          </div>
        ),
      },
      {
        header: "Status operasional",
        accessorKey: "status",
        cell: ({ row }) => {
          const copy = stockStatusCopy(row.original.status);
          return <div><StatusBadge status={copy.label} /><p className="mt-1 text-[11px] text-[var(--app-text-muted)]">{copy.detail}</p></div>;
        },
      },
    ],
    [products],
  );

  const lowStockColumns = useMemo<ColumnDef<(typeof lowStockRows)[number]>[]>(() => [
    { header: "Barang", accessorFn: (row) => `${row.code} ${row.productName}`, cell: ({ row }) => <div><p className="font-medium">{row.original.productName}</p><p className="mt-0.5 font-mono text-[11px] text-[var(--app-text-muted)]">{row.original.code}</p></div> },
    { header: "Siap dipakai", accessorKey: "available", cell: ({ row }) => <span className="tabular font-semibold">{formatNumber(row.original.available)} {row.original.unit}</span> },
    { header: "Batas minimum", accessorKey: "minimum", cell: ({ row }) => <span className="tabular">{formatNumber(row.original.minimum)} {row.original.unit}</span> },
    { header: "Kekurangan", accessorKey: "shortage", cell: ({ row }) => <span className="tabular font-semibold text-red-700 dark:text-red-300">{formatNumber(row.original.shortage)} {row.original.unit}</span> },
    { header: "Arti", id: "meaning", cell: () => <span className="text-xs text-[var(--app-text-muted)]">Stok siap dipakai lebih kecil daripada batas minimum di Master Barang.</span> },
  ], []);

  const materialColumns = useMemo<ColumnDef<(typeof materialPositions)[number]>[]>(() => [
    { header: "Barang/Bahan", accessorFn: (row) => productName(row.productId), cell: ({ row }) => <div><p className="font-medium">{productName(row.original.productId)}</p><p className="mt-0.5 text-[11px] text-[var(--app-text-muted)]">{row.original.type} · {products.find((item) => item.id === row.original.productId)?.code}</p></div> },
    { header: "Fisik", accessorKey: "onHand", cell: ({ row }) => <span className="tabular">{formatNumber(row.original.onHand)} {row.original.unit}</span> },
    { header: "Tersedia", accessorKey: "available", cell: ({ row }) => <span className="tabular font-semibold">{formatNumber(row.original.available)} {row.original.unit}</span> },
    { header: "Staging produksi", accessorKey: "staging", cell: ({ row }) => <span className="tabular">{formatNumber(row.original.staging)} {row.original.unit}</span> },
    { header: "Diminta batch aktif", accessorKey: "requested", cell: ({ row }) => <div className="text-right"><span className="tabular">{formatNumber(row.original.requested)} {row.original.unit}</span>{row.original.shortage > 0 ? <p className="mt-0.5 text-[11px] font-semibold text-red-700 dark:text-red-300">Kurang {formatNumber(row.original.shortage)} {row.original.unit}</p> : null}</div> },
    {
      header: "Status",
      accessorFn: (row) => {
        const minStock = products.find((item) => item.id === row.productId)?.minStock ?? 0;
        if (row.shortage > 0 || row.available + 0.000001 < row.requested) return "Tidak mencukupi";
        if (row.available < minStock) return "Di bawah stok minimum";
        return "Aman";
      },
      cell: ({ getValue }) => <StatusBadge status={String(getValue())} />,
    },
  ], [products]);

  const finishedColumns = useMemo<ColumnDef<(typeof finishedPositions)[number]>[]>(() => [
    { header: "Barang Jadi", accessorFn: (row) => `${row.code} ${productName(row.productId)}`, cell: ({ row }) => <div><p className="font-medium">{productName(row.original.productId)}</p><p className="font-mono text-[11px] text-[var(--app-text-muted)]">{row.original.code} · {row.original.lots} lot</p></div> },
    { header: "Fisik", accessorKey: "onHand", cell: ({ row }) => <span className="tabular font-semibold">{formatNumber(row.original.onHand)} {row.original.unit}</span> },
    { header: "Direservasi pesanan", accessorKey: "reserved", cell: ({ row }) => <span className="tabular">{formatNumber(row.original.reserved)} {row.original.unit}</span> },
    { header: "Stok bebas", accessorKey: "available", cell: ({ row }) => <span className="tabular font-semibold text-emerald-700 dark:text-emerald-300">{formatNumber(row.original.available)} {row.original.unit}</span> },
    { header: "HPP master", accessorKey: "hpp", cell: ({ row }) => <span className="tabular">{formatCurrency(row.original.hpp)}/{row.original.unit}</span> },
    { header: "Nilai stok", accessorKey: "value", cell: ({ row }) => <strong className="tabular">{formatCurrency(row.original.value)}</strong> },
  ], [products]);

  const movementColumns = useMemo<ColumnDef<StockMovement>[]>(() => [
    { header: "Waktu", accessorKey: "createdAt", cell: ({ getValue }) => formatDate(String(getValue()), "dd MMM, HH:mm") },
    {
      header: "Jenis pergerakan",
      accessorKey: "type",
      cell: ({ getValue }) => <StatusBadge status={String(getValue())} />,
    },
    { header: "Barang", accessorFn: (row) => productName(row.productId), cell: ({ row }) => <div><p className="font-medium">{productName(row.original.productId)}</p><p className="mt-0.5 font-mono text-[11px] text-[var(--app-text-muted)]">{row.original.lot}</p></div> },
    { header: "Kuantitas", accessorKey: "quantity", cell: ({ row }) => <span className="tabular font-semibold">{formatNumber(row.original.quantity)} {row.original.unit}</span> },
    { header: "Dari", accessorKey: "fromWarehouse", cell: ({ getValue }) => String(getValue() ?? "—") },
    { header: "Ke", accessorKey: "toWarehouse", cell: ({ getValue }) => String(getValue() ?? "Dikonsumsi / waste") },
    { header: "Referensi", accessorKey: "reference", cell: ({ getValue }) => <span className="font-mono text-xs">{String(getValue())}</span> },
    { header: "Catatan", accessorKey: "notes", cell: ({ getValue }) => String(getValue() ?? "—") },
  ], [products]);

  const stockCountColumns = useMemo<ColumnDef<StockCount>[]>(() => [
    { header: "Dokumen", accessorKey: "number", cell: ({ row }) => <div><p className="font-mono text-xs font-semibold">{row.original.number}</p><p className="mt-0.5 text-[11px] text-[var(--app-text-muted)]">{row.original.warehouse}</p></div> },
    { header: "Dibuat", accessorKey: "createdAt", cell: ({ getValue }) => formatDate(String(getValue()), "dd MMM, HH:mm") },
    { header: "Progres", accessorFn: (row) => `${row.lines.filter((line) => line.countedQty !== undefined).length}/${row.lines.length}`, cell: ({ row }) => <span className="tabular">{row.original.lines.filter((line) => line.countedQty !== undefined).length} / {row.original.lines.length} lot</span> },
    { header: "Selisih", accessorFn: (row) => row.lines.filter((line) => line.varianceQty !== 0).length, cell: ({ getValue }) => <span className="tabular">{String(getValue())} lot</span> },
    { header: "Status", accessorKey: "status", cell: ({ getValue }) => <StatusBadge status={String(getValue())} /> },
    {
      id: "action",
      header: "Tindakan",
      cell: ({ row }) => {
        const isOpen = selectedStockCount?.id === row.original.id;
        return <Button size="small" appearance={isOpen ? "primary" : "subtle"} onClick={() => openStockCount(row.original)}>{isOpen ? "Buka lagi" : "Buka"}</Button>;
      },
    },
  ], [openStockCount, selectedStockCount?.id]);

  const saveAndSubmitStockCount = () => {
    if (!selectedStockCount) return;
    try {
      const parsedLines = selectedStockCount.lines.map((line) => {
        const draft = countDrafts[line.id];
        const countedQty = parseStockCountQuantity(draft?.quantity ?? "");
        const itemName = productName(line.productId);
        if (countedQty === null) throw new Error(`Isi hasil fisik ${itemName} · lot ${line.lot} dengan angka nol atau lebih.`);

        const reason = draft?.reason.trim() ?? "";
        if (calculateStockCountVariance(countedQty, line.systemQty) !== 0 && !reason) {
          throw new Error(`Isi alasan selisih ${itemName} · lot ${line.lot}.`);
        }
        return { line, countedQty, reason };
      });

      parsedLines.forEach(({ line, countedQty, reason }) => {
        updateStockCountLine(selectedStockCount.id, line.id, countedQty, reason);
      });
      submitStockCount(selectedStockCount.id);
      toast("Stok opname siap diposting", "Selisih dan alasannya telah dicatat; Staff Gudang dapat langsung memposting koreksi.");
    } catch (error) {
      toast("Stok opname belum dapat diajukan", error instanceof Error ? error.message : "Lengkapi hasil hitung.", "error");
    }
  };

  const fulfillmentColumns = useMemo<ColumnDef<Sale>[]>(
    () => [
      { header: "Pesanan", accessorKey: "number", cell: ({ getValue }) => <span className="font-mono text-xs font-semibold">{String(getValue())}</span> },
      { header: "Agen", accessorFn: (row) => customers.find((item) => item.id === row.customerId)?.name ?? row.customerId },
      { header: "Kategori", accessorKey: "customerCategory", cell: ({ getValue }) => <StatusBadge status={String(getValue())} /> },
      { header: "Metode", accessorKey: "fulfillmentMethod" },
      { header: "Dibutuhkan", accessorKey: "neededAt", cell: ({ getValue }) => getValue() ? formatDate(String(getValue()), "dd MMM, HH:mm") : "—" },
      { header: "Isi", accessorFn: (row) => row.items.map((item) => `${productName(item.productId)} ${item.quantity}`).join(", ") },
      { header: "Status", accessorKey: "status", cell: ({ getValue }) => <StatusBadge status={String(getValue())} /> },
      {
        id: "action",
        header: "Tindakan",
        cell: ({ row }) => {
          const sale = row.original;
          if (!canManageFulfillment) return <span className="text-xs text-[var(--app-text-muted)]">Hanya lihat</span>;
          if (sale.status === "Bermasalah") return <Button size="small" appearance="primary" onClick={() => {
            setResolutionSaleId(sale.id);
            setDeliveryResolution(sale.deliveryIssueType === "Retur" ? "Retur" : "Diterima dengan Catatan");
            setResolutionNote("");
            setReturnQuantities(Object.fromEntries(sale.items.map((item) => [item.productId, sale.deliveryIssueType === "Retur" ? String(item.quantity) : "0"])));
            setReturnConditions(Object.fromEntries(sale.items.map((item) => [item.productId, sale.deliveryIssueType === "Rusak" ? "Rusak" : "Layak Jual"])));
          }}>Selesaikan masalah</Button>;
          if (sale.status === "Dalam Pengiriman") {
            return <Button size="small" appearance="primary" onClick={() => { setDeliveryId(sale.id); setDeliveryProof(""); setDeliveryIssue(""); setDeliveryFiles([]); }}>Konfirmasi diterima</Button>;
          }
          const label = sale.status === "Menunggu Produksi"
            ? "Cek kesiapan"
            : sale.fulfillmentMethod === "Dikirim"
              ? "Kirim"
              : "Serah terima";
          return (
            <Button
              size="small"
              appearance="subtle"
              icon={<ArrowRight20Regular />}
              onClick={() => {
                const result = advanceFulfillment(sale.id);
                if (!result.ok) {
                  if (result.shortages.length) setFulfillmentIssue({ saleId: sale.id, result });
                  toast("Pesanan belum dapat diproses", result.message, "warning");
                  return;
                }
                toast(
                  result.status === "Siap Dipenuhi" ? "Pesanan siap dipenuhi" : "Pemenuhan diperbarui",
                  `${sale.number} · ${result.message}`,
                  "success",
                );
              }}
            >
              {label}
            </Button>
          );
        },
      },
    ],
    [advanceFulfillment, canManageFulfillment, customers, products, toast],
  );

  const deliveryDocumentColumns = useMemo<ColumnDef<Sale>[]>(() => [
    { header: "Pesanan", accessorKey: "number", cell: ({ getValue }) => <span className="font-mono text-xs font-semibold">{String(getValue())}</span> },
    { header: "Status", accessorKey: "status", cell: ({ getValue }) => <StatusBadge status={String(getValue())} /> },
    { header: "Bukti", id: "attachments", cell: ({ row }) => <div className="flex flex-wrap gap-1.5">{row.original.deliveryAttachments?.map((attachment) => <Button key={attachment.id} size="small" appearance="subtle" onClick={() => { void downloadDeliveryAttachment(attachment).catch((error) => toast("Lampiran tidak dapat dibuka", error instanceof Error ? error.message : "Coba lagi.", "error")); }}>{attachment.name}</Button>)}</div> },
  ], [toast]);

  const selectedDelivery = sales.find((sale) => sale.id === deliveryId);
  const resolutionSale = sales.find((sale) => sale.id === resolutionSaleId);

  return (
    <div className="space-y-5">
      <PageHeader
        title="Inventori & Gudang"
        description="Satu modul dengan saldo dan transaksi terpisah untuk Gudang Bahan serta Gudang Produk Jadi. Keduanya dioperasikan oleh role Staff Gudang."
      />

      <MetricStrip
        items={[
          { label: "Permintaan bahan", value: String(materialRequests.length), detail: "Menunggu keputusan Gudang", trend: materialRequests.length ? "down" : "neutral", icon: <BuildingFactory24Regular />, onClick: () => setTab("requests"), targetId: "inventory-requests" },
          { label: "Gudang Bahan", value: String(materialProducts.length), detail: `${availableMaterialLots.length} lot siap dipakai · kuantitas saja`, trend: "neutral", icon: <Box24Regular />, onClick: () => setTab("materials"), targetId: "inventory-materials" },
          { label: "Gudang Produk Jadi", value: formatCurrency(finishedInventoryValue), detail: `${finishedStocks.length} lot · stok × HPP master`, trend: "neutral", icon: <Box24Regular />, onClick: () => setTab("finished"), targetId: "inventory-finished" },
          { label: "Di bawah minimum", value: String(lowStock.length), detail: `${lowStock.length} jenis barang perlu diperiksa`, trend: lowStock.length ? "down" : "up", icon: <Warning24Regular />, onClick: () => setTab("materials"), targetId: "inventory-materials" },
          { label: "Batch memakai bahan", value: String(productionOrders.filter((order) => ["Bahan Dikonfirmasi", "Berjalan"].includes(order.status)).length), detail: `${stockMovements.filter((movement) => movement.type.includes("Produksi")).length} pergerakan terkait`, trend: "neutral", icon: <BuildingFactory24Regular />, onClick: () => setTab("movements"), targetId: "inventory-movements" },
          { label: "Dalam pengiriman", value: String(inDelivery.length), detail: "Menunggu konfirmasi agen", trend: "neutral", icon: <VehicleTruck24Regular />, onClick: () => setTab("fulfillment"), targetId: "inventory-fulfillment" },
        ]}
      />

      <TabList selectedValue={tab} onTabSelect={(_, data) => setTab(String(data.value))} className="overflow-x-auto">
        <Tab value="requests">Permintaan Produksi</Tab>
        <Tab value="materials">Gudang Bahan</Tab>
        <Tab value="finished">Gudang Produk Jadi</Tab>
        <Tab value="movements">Pergerakan stok</Tab>
        <Tab value="fulfillment">Pemenuhan agen</Tab>
        <Tab value="count">Stok opname</Tab>
      </TabList>

      {tab === "requests" ? <SectionPanel id="inventory-requests" title="Antrean permintaan bahan Produksi" description="Konfirmasi Gudang belum mengurangi stok. Stok baru berkurang setelah Produksi mengonfirmasi serah-terima." noPadding><DataTable data={materialRequests} columns={materialRequestColumns} searchPlaceholder="Cari permintaan, batch, kategori, atau bahan..." emptyTitle="Tidak ada permintaan aktif" emptyDescription="Permintaan yang sudah diproses atau melewati waktu tunda tidak tampil di antrean." /></SectionPanel> : null}
      {tab === "materials" ? <div id="inventory-materials" className="space-y-5">
        <SectionPanel title="Gudang Bahan" description="Saldo Bahan Baku, Bahan Baku Toping, dan Kemasan ditampilkan sebagai kuantitas tanpa nilai rupiah." noPadding><DataTable data={materialPositions} columns={materialColumns} searchPlaceholder="Cari bahan baku, toping, atau kemasan..." /></SectionPanel>
        <SectionPanel title="Bahan di bawah batas minimum" description="Angka pada kartu adalah jumlah jenis barang, bukan penjumlahan Kg, Gram, dan Pcs." noPadding>
          <div className="border-b border-[var(--app-border)] bg-[var(--app-surface-2)]/45 px-4 py-3 text-xs leading-5 text-[var(--app-text-muted)] md:px-5">
            Cara hitung per barang: <strong className="text-[var(--app-text)]">stok siap dipakai = jumlah pada lot berstatus Tersedia − jumlah yang direservasi</strong>. Jika hasilnya lebih kecil dari batas minimum yang diinput di Master Barang, barang tersebut dihitung satu kali dalam kartu ini. Kuantitas pada tabel tetap memakai satuan masing-masing barang.
          </div>
          <DataTable data={lowStockRows.filter((item) => item.type !== "Produk Jadi")} columns={lowStockColumns} searchPlaceholder="Cari bahan di bawah minimum..." emptyTitle="Semua stok bahan aman" emptyDescription="Tidak ada bahan aktif dengan stok siap pakai di bawah batas minimum." />
        </SectionPanel>
        <SectionPanel title="Lot Gudang Bahan dan staging Produksi" description="Status menunjukkan lot yang masih tersedia atau sudah diserahterimakan ke Produksi." noPadding><DataTable data={materialStocks} columns={stockColumns} searchPlaceholder="Cari bahan, lot, atau status..." /></SectionPanel>
      </div> : null}
      {tab === "finished" ? <div id="inventory-finished" className="space-y-5">
        <SectionPanel title="Gudang Produk Jadi" description={`Nilai persediaan ${formatCurrency(finishedInventoryValue)} dihitung dari stok fisik × HPP pada Master Barang Jadi.`} noPadding><DataTable data={finishedPositions} columns={finishedColumns} searchPlaceholder="Cari SKU Barang Jadi..." /></SectionPanel>
        <SectionPanel title="Lot Barang Jadi" description="Hasil berhasil produksi langsung tersedia; reservasi menunjukkan stok yang sudah dijanjikan ke pesanan agen." noPadding><DataTable data={finishedStocks} columns={stockColumns} searchPlaceholder="Cari Barang Jadi, lot, atau status..." /></SectionPanel>
        <SectionPanel title="Barang Jadi di bawah batas minimum" noPadding><DataTable data={lowStockRows.filter((item) => item.type === "Produk Jadi")} columns={lowStockColumns} searchPlaceholder="Cari Barang Jadi di bawah minimum..." emptyTitle="Semua stok Barang Jadi aman" emptyDescription="Tidak ada Barang Jadi aktif di bawah stok minimum." /></SectionPanel>
      </div> : null}
      {tab === "movements" ? <SectionPanel id="inventory-movements" title="Ledger pergerakan stok" description="Penerimaan pembelian, serah-terima bahan, konsumsi batch, output Barang Jadi, waste, penjualan, dan koreksi tercatat sebagai riwayat." action={<ArrowSwap24Regular className="text-[var(--app-accent)]" />} noPadding><DataTable data={stockMovements} columns={movementColumns} searchPlaceholder="Cari pergerakan, barang, lot, atau referensi..." /></SectionPanel> : null}
      {tab === "fulfillment" ? (
        <div id="inventory-fulfillment" className="scroll-mt-24 space-y-5"><SectionPanel title="Pemenuhan pesanan agen" description="Stok dikurangi saat diserahkan. Pesanan kirim baru selesai setelah penerimaan dikonfirmasi." noPadding>
          <DataTable data={fulfillmentOrders} columns={fulfillmentColumns} searchPlaceholder="Cari pesanan, agen, atau kategori..." emptyTitle="Tidak ada pemenuhan aktif" emptyDescription="Semua pesanan sudah diterima agen." />
        </SectionPanel><SectionPanel title="Bukti penerimaan tersimpan" description="Berkas disimpan lokal pada perangkat demo ini dan dapat diunduh kembali." noPadding><DataTable data={documentedDeliveries} columns={deliveryDocumentColumns} searchPlaceholder="Cari pesanan atau berkas..." emptyTitle="Belum ada bukti penerimaan" emptyDescription="Konfirmasi pengiriman dengan dokumen atau foto akan tampil di sini." /></SectionPanel></div>
      ) : null}
      {tab === "count" ? (
        <div className="space-y-5">
          <SectionPanel title="Dokumen stok opname" description="Buat hitung fisik per gudang. Selisih wajib memiliki alasan dan dapat langsung diposting oleh Staff Gudang berwenang." action={canManageStockCount ? <Button size="small" appearance="primary" onClick={() => setStockCountDialogOpen(true)}>Buat stok opname</Button> : null} noPadding>
            <DataTable data={stockCounts} columns={stockCountColumns} searchPlaceholder="Cari nomor atau area gudang..." emptyTitle="Belum ada stok opname" emptyDescription="Mulai hitung fisik dari salah satu area gudang." />
          </SectionPanel>
          {selectedStockCount ? <div ref={stockCountPanelRef}><SectionPanel title={`Hitung fisik · ${selectedStockCount.number}`} description={`${selectedStockCount.warehouse} · ${selectedStockCount.status === "Sedang Dihitung" ? "isi hasil fisik setiap lot, lalu siapkan posting." : "detail hasil hitung tersimpan (hanya-baca)."}`} action={<div className="flex flex-wrap gap-2">{canManageStockCount && selectedStockCount.status === "Sedang Dihitung" ? <Button size="small" appearance="primary" onClick={saveAndSubmitStockCount}>Simpan & siapkan posting</Button> : null}{canManageStockCount && selectedStockCount.status === "Siap Diposting" ? <Button size="small" appearance="primary" onClick={() => { try { postStockCount(selectedStockCount.id); toast("Stok opname diposting", `${selectedStockCount.number} telah memperbarui saldo dan ledger stok.`); } catch (error) { toast("Stok opname belum dapat diposting", error instanceof Error ? error.message : "Coba lagi.", "error"); } }}>Posting koreksi</Button> : null}</div>} noPadding>
            <StockCountLineEditor
              lines={selectedStockCount.lines}
              products={products}
              drafts={countDrafts}
              setDrafts={setCountDrafts}
              canEdit={canManageStockCount && selectedStockCount.status === "Sedang Dihitung"}
            />
          </SectionPanel></div> : null}
        </div>
      ) : null}

      <Dialog open={stockCountDialogOpen} onOpenChange={(_, data) => setStockCountDialogOpen(data.open)}>
        <DialogSurface><DialogBody><DialogTitle>Buat stok opname</DialogTitle><DialogContent className="space-y-4"><Field label="Gudang"><Select value={stockCountWarehouse} onChange={(event) => setStockCountWarehouse(event.target.value)}><option>Gudang Bahan</option><option>Gudang Produk Jadi</option></Select></Field><p className="text-xs text-[var(--app-text-muted)]">Saldo sistem diambil per lot ketika dokumen dibuat. Perubahan setelahnya tidak mengubah baseline opname.</p></DialogContent><DialogActions><Button appearance="secondary" onClick={() => setStockCountDialogOpen(false)}>Batal</Button><Button appearance="primary" onClick={() => { try { const count = createStockCount(stockCountWarehouse); openStockCount(count); setStockCountDialogOpen(false); toast("Stok opname dibuat", `${count.number} siap diisi.`); } catch (error) { toast("Tidak dapat membuat stok opname", error instanceof Error ? error.message : "Coba lagi.", "error"); } }}>Buat</Button></DialogActions></DialogBody></DialogSurface>
      </Dialog>

      <Dialog open={Boolean(fulfillmentIssue)} onOpenChange={(_, data) => { if (!data.open) setFulfillmentIssue(null); }}>
        <DialogSurface className="erp-dialog--wide">
          <DialogBody>
            <DialogTitle>Pesanan belum siap dipenuhi</DialogTitle>
            <DialogContent className="space-y-4">
              <div className="rounded-lg bg-[var(--app-surface-2)] p-3 text-sm">
                <p className="font-mono font-semibold">{sales.find((sale) => sale.id === fulfillmentIssue?.saleId)?.number}</p>
                <p className="mt-1 text-xs leading-5 text-[var(--app-text-muted)]">Status tetap Menunggu Produksi karena stok Barang Jadi yang sudah direservasi belum memenuhi seluruh isi pesanan.</p>
              </div>
              <div className="space-y-3">
                {fulfillmentIssue?.result.shortages.map((item) => (
                  <article key={item.productId} className="rounded-xl border border-[var(--app-border)] p-4">
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div><p className="text-sm font-semibold">{item.productName}</p><p className="mt-1 text-xs text-[var(--app-text-muted)]">Kebutuhan pesanan {formatNumber(item.required)} {item.unit}</p></div>
                      <StatusBadge status={`Kurang ${formatNumber(item.shortage)} ${item.unit}`} />
                    </div>
                    <dl className="mt-4 grid grid-cols-2 gap-3 text-xs sm:grid-cols-3">
                      <div><dt className="text-[var(--app-text-muted)]">Sudah direservasi</dt><dd className="tabular mt-1 font-semibold">{formatNumber(item.available)} {item.unit}</dd></div>
                      <div><dt className="text-[var(--app-text-muted)]">Total kebutuhan</dt><dd className="tabular mt-1 font-semibold">{formatNumber(item.required)} {item.unit}</dd></div>
                      <div><dt className="text-[var(--app-text-muted)]">Masih kurang</dt><dd className="tabular mt-1 font-semibold text-red-700 dark:text-red-300">{formatNumber(item.shortage)} {item.unit}</dd></div>
                    </dl>
                  </article>
                ))}
              </div>
              <p className="text-xs leading-5 text-[var(--app-text-muted)]">Selesaikan batch yang menghasilkan SKU tersebut. Hasil berhasil akan otomatis dialokasikan berdasarkan tanggal kebutuhan terdekat lalu pesanan terlama.</p>
            </DialogContent>
            <DialogActions>
              <Button appearance="secondary" onClick={() => setFulfillmentIssue(null)}>Tutup</Button>
              <Button appearance="primary" onClick={() => { setFulfillmentIssue(null); router.push("/production#production-batches"); }}>Buka Produksi</Button>
            </DialogActions>
          </DialogBody>
        </DialogSurface>
      </Dialog>

      <Dialog open={canReviewProductionRequest && Boolean(requestToDefer)} onOpenChange={(_, data) => !data.open && setRequestToDefer(null)}>
        <DialogSurface className="erp-dialog">
          <DialogBody>
            <DialogTitle>Tunda permintaan bahan</DialogTitle>
            <DialogContent className="space-y-4">
              <div className="rounded-lg bg-[var(--app-surface-2)] p-3 text-xs leading-5 text-[var(--app-text-muted)]">
                Permintaan akan menampilkan hitung mundur dan hilang dari antrean aktif setelah waktu tunda berakhir. Riwayatnya tetap tersimpan pada batch Produksi.
              </div>
              <Field label="Durasi penundaan" required>
                <Select value={deferHours} onChange={(event) => setDeferHours(event.target.value)}>
                  <option value="0.5">30 menit</option>
                  <option value="1">1 jam</option>
                  <option value="2">2 jam</option>
                  <option value="4">4 jam</option>
                  <option value="8">8 jam</option>
                  <option value="24">24 jam</option>
                </Select>
              </Field>
              <Field label="Alasan penundaan" required>
                <Input value={deferReason} onChange={(_, data) => setDeferReason(data.value)} placeholder="Contoh: menunggu verifikasi lot fisik" />
              </Field>
            </DialogContent>
            <DialogActions>
              <Button appearance="secondary" onClick={() => setRequestToDefer(null)}>Batal</Button>
              <Button appearance="primary" disabled={!requestToDefer || !deferReason.trim()} onClick={() => {
                if (!requestToDefer) return;
                try {
                  reviewProductionRequest(requestToDefer, "Ditunda", Number(deferHours), deferReason);
                  setRequestToDefer(null);
                  toast("Permintaan ditunda", `Hitung mundur ${deferHours} jam dimulai.`, "warning");
                } catch (error) {
                  toast("Permintaan tidak dapat ditunda", error instanceof Error ? error.message : "Periksa durasi penundaan.", "error");
                }
              }}>Simpan penundaan</Button>
            </DialogActions>
          </DialogBody>
        </DialogSurface>
      </Dialog>

      <Dialog open={canManageFulfillment && Boolean(deliveryId)} onOpenChange={(_, data) => !data.open && setDeliveryId(null)}>
        <DialogSurface>
          <DialogBody>
            <DialogTitle>Konfirmasi penerimaan agen</DialogTitle>
            <DialogContent className="space-y-4">
              <div className="rounded-lg bg-[var(--app-surface-2)] p-3 text-sm">
                <p className="font-mono font-semibold">{selectedDelivery?.number}</p>
                <p className="mt-1 text-xs text-[var(--app-text-muted)]">Penjualan dan stok pengiriman dinyatakan selesai setelah agen menerima barang.</p>
              </div>
              <Field label="Keterangan bukti penerimaan" required><Input value={deliveryProof} onChange={(_, data) => setDeliveryProof(data.value)} placeholder="Contoh: surat jalan diterima Pak Dedi" /></Field>
              <Field label="Dokumen atau foto" hint="JPG, PNG, WebP, PDF, DOC, atau DOCX. Maksimal 10 MB per berkas.">
                <input
                  type="file"
                  multiple
                  accept="image/jpeg,image/png,image/webp,application/pdf,.doc,.docx"
                  className="block min-w-0 w-full overflow-hidden rounded-lg border border-[var(--app-border)] bg-[var(--app-surface)] text-sm text-[var(--app-text-muted)] file:mr-3 file:max-w-full file:border-0 file:border-r file:border-[var(--app-border)] file:bg-[var(--app-surface-2)] file:px-3 file:py-2.5 file:text-sm file:font-semibold file:text-[var(--app-text)] hover:file:bg-[var(--app-canvas)]"
                  onChange={(event) => {
                    const selectedFiles = Array.from(event.target.files ?? []);
                    const validFiles = selectedFiles.filter(
                      (file) => isAcceptedAttachment(file) && file.size <= maxAttachmentSize,
                    );
                    if (validFiles.length !== selectedFiles.length) {
                      toast("Sebagian berkas tidak diterima", "Gunakan format yang didukung dengan ukuran maksimal 10 MB.");
                    }
                    setDeliveryFiles(validFiles);
                  }}
                />
              </Field>
              {deliveryFiles.length ? (
                <div className="space-y-2 rounded-lg border border-[var(--app-border)] p-3">
                  {deliveryFiles.map((file, index) => (
                    <div key={`${file.name}-${file.lastModified}`} className="flex items-center justify-between gap-3 text-xs">
                      <div className="min-w-0">
                        <p className="truncate font-medium text-[var(--app-text)]">{file.name}</p>
                        <p className="mt-0.5 text-[var(--app-text-muted)]">{formatFileSize(file.size)}</p>
                      </div>
                      <Button size="small" appearance="subtle" onClick={() => setDeliveryFiles((current) => current.filter((_, itemIndex) => itemIndex !== index))}>Hapus</Button>
                    </div>
                  ))}
                </div>
              ) : null}
              <Field label="Masalah pengiriman" hint="Kosongkan jika barang diterima dengan baik."><Input value={deliveryIssue} onChange={(_, data) => setDeliveryIssue(data.value)} placeholder="Contoh: 2 kemasan rusak" /></Field>
              {deliveryIssue.trim() ? <Field label="Jenis masalah"><Select value={deliveryIssueType} onChange={(event) => setDeliveryIssueType(event.target.value as DeliveryIssueType)}><option>Selisih</option><option>Rusak</option><option>Retur</option></Select></Field> : null}
            </DialogContent>
            <DialogActions>
              <Button appearance="secondary" onClick={() => setDeliveryId(null)}>Batal</Button>
              <Button
                appearance="primary"
                disabled={!deliveryProof.trim() || !deliveryId}
                onClick={() => {
                  if (!deliveryId) return;
                  void saveDeliveryAttachments(deliveryId, deliveryFiles).then((attachments) => {
                    confirmDelivery(deliveryId, deliveryProof, deliveryIssue, attachments, deliveryIssueType);
                    setDeliveryId(null);
                    toast(deliveryIssue.trim() ? "Pengiriman ditandai bermasalah" : "Penerimaan dikonfirmasi", selectedDelivery?.number ?? "Pesanan agen");
                  }).catch((error) => toast("Bukti pengiriman tidak dapat disimpan", error instanceof Error ? error.message : "Coba lagi.", "error"));
                }}
              >
                Simpan konfirmasi
              </Button>
            </DialogActions>
          </DialogBody>
        </DialogSurface>
      </Dialog>

      <Dialog open={canManageFulfillment && Boolean(resolutionSale)} onOpenChange={(_, data) => !data.open && setResolutionSaleId(null)}>
        <DialogSurface className="erp-dialog--wide">
          <DialogBody>
            <DialogTitle>Selesaikan masalah pengiriman</DialogTitle>
            <DialogContent className="max-h-[70vh] space-y-4 overflow-y-auto">
              <div className="rounded-lg bg-[var(--app-surface-2)] p-3 text-sm">
                <p className="font-mono font-semibold">{resolutionSale?.number}</p>
                <p className="mt-1 text-xs text-red-700 dark:text-red-300">{resolutionSale?.deliveryIssueType} · {resolutionSale?.deliveryIssue}</p>
              </div>
              <Field label="Resolusi"><Select value={deliveryResolution} onChange={(event) => setDeliveryResolution(event.target.value as DeliveryResolution)}><option>Diterima dengan Catatan</option><option>Kirim Pengganti</option><option>Retur</option></Select></Field>
              {deliveryResolution === "Retur" ? <div className="space-y-3">
                {resolutionSale?.items.map((item) => <div key={item.productId} className="grid gap-2 rounded-lg border border-[var(--app-border)] p-3 sm:grid-cols-[minmax(0,1fr)_140px_150px] sm:items-end">
                  <div><p className="text-sm font-semibold">{productName(item.productId)}</p><p className="mt-1 text-xs text-[var(--app-text-muted)]">Maksimal {formatNumber(item.quantity)}</p></div>
                  <Field label="Jumlah retur"><Input type="number" min="0" max={item.quantity} value={returnQuantities[item.productId] ?? "0"} onChange={(_, data) => setReturnQuantities((current) => ({ ...current, [item.productId]: data.value }))} /></Field>
                  <Field label="Kondisi"><Select value={returnConditions[item.productId] ?? "Layak Jual"} onChange={(event) => setReturnConditions((current) => ({ ...current, [item.productId]: event.target.value as SalesReturnCondition }))}><option>Layak Jual</option><option>Rusak</option></Select></Field>
                </div>)}
              </div> : null}
              <Field label={deliveryResolution === "Retur" ? "Alasan retur" : "Catatan penyelesaian"} required><Input value={resolutionNote} onChange={(_, data) => setResolutionNote(data.value)} placeholder="Jelaskan hasil verifikasi dan tindakan yang diambil" /></Field>
            </DialogContent>
            <DialogActions>
              <Button appearance="secondary" onClick={() => setResolutionSaleId(null)}>Batal</Button>
              <Button appearance="primary" disabled={!resolutionNote.trim() || !resolutionSale} onClick={() => {
                if (!resolutionSale) return;
                try {
                  if (deliveryResolution === "Retur") {
                    const items = resolutionSale.items.map((item) => ({ productId: item.productId, quantity: Number(returnQuantities[item.productId] ?? 0), condition: returnConditions[item.productId] ?? "Layak Jual" as const })).filter((item) => item.quantity > 0);
                    const salesReturn = createSalesReturn(resolutionSale.id, items, resolutionNote);
                    toast("Retur diterima", `${salesReturn.number} · ${salesReturn.status}`);
                  } else {
                    resolveDeliveryIssue(resolutionSale.id, deliveryResolution, resolutionNote);
                    toast("Masalah pengiriman selesai", `${resolutionSale.number} · ${deliveryResolution}`);
                  }
                  setResolutionSaleId(null);
                } catch (error) {
                  toast("Resolusi belum dapat disimpan", error instanceof Error ? error.message : "Periksa data resolusi.", "error");
                }
              }}>Simpan resolusi</Button>
            </DialogActions>
          </DialogBody>
        </DialogSurface>
      </Dialog>
    </div>
  );
}
