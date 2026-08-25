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
  Add20Regular,
  Cart24Regular,
  CheckmarkCircle24Regular,
  Clock24Regular,
  Delete20Regular,
  Money24Regular,
  People24Regular,
  Print24Regular,
  Receipt24Regular,
  Search20Regular,
  Subtract20Regular,
} from "@fluentui/react-icons";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { DataTable } from "@/components/ui/data-table";
import { MetricStrip } from "@/components/ui/metric-strip";
import { PageHeader } from "@/components/ui/page-header";
import { SectionPanel } from "@/components/ui/section-panel";
import { StatusBadge } from "@/components/ui/status-badge";
import { useAppToast } from "@/components/ui/app-toast";
import { formatCurrency, formatDateTime, formatNumber } from "@/lib/format";
import { canPerformAction } from "@/lib/access";
import { defaultNeededAt, localDateKey } from "@/lib/date";
import type { Customer, OrderSource, Product, Sale, SalesShift } from "@/lib/types";
import { useCurrentAccess } from "@/hooks/use-current-access";
import { getUnitDefinition } from "@/lib/units";
import { useERPStore } from "@/store/use-erp-store";

const customerPrice = (products: Product[], productId: string, customer?: Customer) => {
  const product = products.find((item) => item.id === productId);
  if (!product || product.type !== "Produk Jadi" || !product.isActive) return 0;
  return customer?.category === "Agen 1" ? product.agent1Price : product.agent2Price;
};

export default function SalesPage() {
  const router = useRouter();
  const { user, role } = useCurrentAccess();
  const [tab, setTab] = useState("pos");
  const [search, setSearch] = useState("");
  const [cart, setCart] = useState<Record<string, number>>({});
  const [customerId, setCustomerId] = useState("cust-sari");
  const [discount, setDiscount] = useState("0");
  const [paymentMethod, setPaymentMethod] = useState<Sale["paymentMethod"]>("Tunai");
  const [orderOpen, setOrderOpen] = useState(false);
  const [orderCustomerId, setOrderCustomerId] = useState("cust-koperasi");
  const [orderSearch, setOrderSearch] = useState("");
  const [orderCart, setOrderCart] = useState<Record<string, number>>({});
  const [orderDiscount, setOrderDiscount] = useState("0");
  const [orderSource, setOrderSource] = useState<Exclude<OrderSource, "POS">>("WhatsApp");
  const [fulfillmentMethod, setFulfillmentMethod] = useState<Sale["fulfillmentMethod"]>("Dikirim");
  const [orderPayment, setOrderPayment] = useState<Sale["paymentMethod"]>("Transfer");
  const [paidAmount, setPaidAmount] = useState("0");
  const [neededAt, setNeededAt] = useState(defaultNeededAt);
  const [closeShiftId, setCloseShiftId] = useState<string | null>(null);
  const [actualCash, setActualCash] = useState("0");
  const toast = useAppToast();

  const stocks = useERPStore((state) => state.stocks);
  const customers = useERPStore((state) => state.customers);
  const sales = useERPStore((state) => state.sales);
  const salesShifts = useERPStore((state) => state.salesShifts);
  const users = useERPStore((state) => state.users);
  const products = useERPStore((state) => state.products);
  const invoices = useERPStore((state) => state.invoices);
  const addSale = useERPStore((state) => state.addSale);
  const addAgentOrder = useERPStore((state) => state.addAgentOrder);
  const closeSalesShift = useERPStore((state) => state.closeSalesShift);
  const canManageSales = canPerformAction(role, "sales.create");
  const canCloseShift = canPerformAction(role, "sales.shift.close");

  useEffect(() => {
    if (!canManageSales && tab === "pos") setTab("history");
  }, [canManageSales, tab]);

  const selectedCustomer = customers.find((item) => item.id === customerId);
  const orderCustomer = customers.find((item) => item.id === orderCustomerId);
  const finishedProducts = products.filter(
    (product) => product.type === "Produk Jadi" && product.isActive && `${product.code} ${product.name}`.toLowerCase().includes(search.toLowerCase()),
  );
  const orderProducts = products.filter(
    (product) => product.type === "Produk Jadi" && product.isActive && `${product.code} ${product.name}`.toLowerCase().includes(orderSearch.toLowerCase()),
  );
  const availableFor = (productId: string) =>
    stocks
      .filter(
        (stock) =>
          stock.productId === productId &&
          stock.warehouse === "Gudang Produk Jadi" &&
          stock.status === "Tersedia",
      )
      .reduce((sum, stock) => sum + Math.max(stock.onHand - stock.reserved, 0), 0);

  const cartLines = Object.entries(cart)
    .filter(([, quantity]) => quantity > 0)
    .map(([productId, quantity]) => ({ product: products.find((item) => item.id === productId)!, quantity }));
  const subtotal = cartLines.reduce(
    (sum, line) => sum + customerPrice(products, line.product.id, selectedCustomer) * line.quantity,
    0,
  );
  const discountNumber = Number(discount);
  const discountInvalid = !Number.isFinite(discountNumber) || discountNumber < 0 || discountNumber > subtotal || (cartLines.length > 0 && subtotal - discountNumber <= 0);
  const total = Math.max(subtotal - (Number.isFinite(discountNumber) ? discountNumber : 0), 0);
  const completedSales = sales.filter((sale) => sale.status === "Selesai" || sale.status === "Diretur");
  const activeOrders = sales.filter((sale) => !["Selesai", "Diretur"].includes(sale.status));
  const todayKey = localDateKey();
  const todaySales = completedSales.filter((sale) => localDateKey(sale.createdAt) === todayKey);
  const todayTotal = todaySales.reduce((sum, sale) => sum + sale.total, 0);
  const averageTicket = todaySales.length ? todayTotal / todaySales.length : 0;
  const customerExposure = (selectedId?: string) => {
    if (!selectedId) return 0;
    const invoicedSources = new Set(invoices.filter((invoice) => invoice.customerId === selectedId).map((invoice) => invoice.source));
    const invoiceBalance = invoices.filter((invoice) => invoice.type === "Piutang" && invoice.customerId === selectedId && invoice.status !== "Lunas").reduce((sum, invoice) => sum + invoice.total - invoice.paid, 0);
    const orderBalance = sales.filter((sale) => sale.customerId === selectedId && !invoicedSources.has(sale.number) && !["Diretur", "Bermasalah"].includes(sale.status)).reduce((sum, sale) => sum + Math.max(sale.total - sale.paidAmount, 0), 0);
    return invoiceBalance + orderBalance;
  };
  const selectedExposure = customerExposure(selectedCustomer?.id);
  const selectedRemainingCredit = Math.max((selectedCustomer?.creditLimit ?? 0) - selectedExposure, 0);
  const orderCartLines = Object.entries(orderCart)
    .filter(([, quantity]) => quantity > 0)
    .map(([productId, quantity]) => ({ product: products.find((item) => item.id === productId)!, quantity }));
  const orderSubtotal = orderCartLines.reduce(
    (sum, line) => sum + customerPrice(products, line.product.id, orderCustomer) * line.quantity,
    0,
  );
  const orderDiscountNumber = Number(orderDiscount);
  const orderDiscountInvalid = !Number.isFinite(orderDiscountNumber) || orderDiscountNumber < 0 || orderDiscountNumber > orderSubtotal;
  const orderDiscountValue = Math.min(Math.max(Number.isFinite(orderDiscountNumber) ? orderDiscountNumber : 0, 0), orderSubtotal);
  const orderValue = orderSubtotal - orderDiscountValue;
  const orderUsesCredit = orderPayment === "Kredit/Tempo" || orderPayment === "Cicilan";
  const paidAmountNumber = Number(paidAmount);
  const creditPaidAmount = Math.min(Math.max(Number.isFinite(paidAmountNumber) ? paidAmountNumber : 0, 0), orderValue);
  const effectivePaidAmount = orderUsesCredit ? creditPaidAmount : orderValue;
  const unpaidAmount = Math.max(orderValue - effectivePaidAmount, 0);
  const remainingCredit = Math.max((orderCustomer?.creditLimit ?? 0) - customerExposure(orderCustomer?.id), 0);
  const paymentError = orderUsesCredit && unpaidAmount > 0
    ? (orderCustomer?.paymentTermsDays ?? 0) <= 0 || (orderCustomer?.creditLimit ?? 0) <= 0
      ? `${orderCustomer?.name ?? "Agen"} tidak memiliki fasilitas kredit/tempo aktif.`
      : unpaidAmount > remainingCredit
        ? `Sisa tagihan melebihi kredit tersedia ${formatCurrency(remainingCredit)}.`
        : ""
    : "";
  const orderHasEnoughStock = orderCartLines.length > 0 && orderCartLines.every(
    (line) => availableFor(line.product.id) >= line.quantity,
  );

  const addToCart = (productId: string) => {
    const available = availableFor(productId);
    setCart((current) => ({ ...current, [productId]: Math.min((current[productId] ?? 0) + 1, available) }));
  };

  const addToOrderCart = (productId: string) => {
    setOrderCart((current) => ({ ...current, [productId]: (current[productId] ?? 0) + 1 }));
  };

  const saleColumns = useMemo<ColumnDef<Sale>[]>(
    () => [
      {
        header: "Nomor",
        accessorKey: "number",
        cell: ({ getValue }) => <span className="font-mono text-xs font-semibold">{String(getValue())}</span>,
      },
      { header: "Waktu", accessorKey: "createdAt", cell: ({ getValue }) => formatDateTime(String(getValue())) },
      { header: "Agen", accessorFn: (row) => customers.find((item) => item.id === row.customerId)?.name ?? row.customerId },
      { header: "Kategori", accessorKey: "customerCategory", cell: ({ getValue }) => <StatusBadge status={String(getValue())} /> },
      {
        header: "Isi pesanan",
        accessorFn: (row) => row.items.map((line) => products.find((product) => product.id === line.productId)?.name ?? line.productId).join(", "),
        cell: ({ row }) => (
          <div className="min-w-36">
            <p className="text-sm font-medium">{row.original.items.length} produk</p>
            <p className="mt-0.5 max-w-56 truncate text-xs text-[var(--app-text-muted)]">
              {row.original.items.map((line) => `${products.find((product) => product.id === line.productId)?.name ?? line.productId} × ${formatNumber(line.quantity)}`).join(" · ")}
            </p>
          </div>
        ),
      },
      { header: "Sumber", accessorKey: "orderSource" },
      { header: "Pemenuhan", accessorKey: "fulfillmentMethod" },
      { header: "Pembayaran", accessorKey: "paymentMethod" },
      {
        header: "Total",
        accessorKey: "total",
        cell: ({ getValue }) => <span className="tabular font-semibold">{formatCurrency(Number(getValue()))}</span>,
      },
      { header: "Status", accessorKey: "status", cell: ({ getValue }) => <StatusBadge status={String(getValue())} /> },
    ],
    [customers, products],
  );

  const shiftColumns = useMemo<ColumnDef<SalesShift>[]>(
    () => [
      { header: "Admin Penjualan", accessorFn: (row) => users.find((item) => item.id === row.salesAdminId)?.name ?? row.salesAdminId },
      { header: "Dibuka", accessorKey: "openedAt", cell: ({ getValue }) => formatDateTime(String(getValue())) },
      { header: "Kas awal", accessorKey: "openingCash", cell: ({ getValue }) => <span className="tabular">{formatCurrency(Number(getValue()))}</span> },
      { header: "Kas seharusnya", accessorKey: "expectedCash", cell: ({ getValue }) => <span className="tabular font-semibold">{formatCurrency(Number(getValue()))}</span> },
      { header: "Status", accessorKey: "status", cell: ({ getValue }) => <StatusBadge status={String(getValue())} /> },
      {
        id: "action",
        header: "Tindakan",
        cell: ({ row }) =>
          canCloseShift && row.original.status === "Buka" ? (
            <Button
              size="small"
              appearance="primary"
              onClick={() => {
                setCloseShiftId(row.original.id);
                setActualCash(String(row.original.expectedCash));
              }}
            >
              Tutup shift
            </Button>
          ) : null,
      },
    ],
    [canCloseShift, users],
  );

  const selectedShift = salesShifts.find((shift) => shift.id === closeShiftId);

  return (
    <div className="space-y-5">
      <PageHeader
        title="Penjualan & POS"
        description="Catat transaksi B2B dari satu pusat, gunakan harga Agen 1 atau Agen 2, lalu pantau pemenuhannya."
        actions={canManageSales ? <Button icon={<Receipt24Regular />} onClick={() => setOrderOpen(true)}>Input pesanan agen</Button> : null}
      />

      <MetricStrip
        items={[
          { label: "Penjualan hari ini", value: formatCurrency(todayTotal), detail: `${todaySales.length} transaksi selesai`, trend: todaySales.length ? "up" : "neutral", icon: <Money24Regular />, onClick: () => setTab("history") },
          { label: "Rata-rata transaksi", value: formatCurrency(averageTicket), detail: "Per transaksi selesai", trend: "neutral", icon: <Receipt24Regular />, onClick: () => setTab("history") },
          { label: "Pesanan aktif", value: String(activeOrders.length), detail: `${formatCurrency(activeOrders.reduce((sum, sale) => sum + sale.total, 0))} nilai pesanan`, trend: "neutral", icon: <Clock24Regular />, onClick: () => setTab("orders") },
          { label: "Agen B2B", value: String(customers.length), detail: `${customers.filter((item) => item.category === "Agen 1").length} Agen 1 · ${customers.filter((item) => item.category === "Agen 2").length} Agen 2`, trend: "neutral", icon: <People24Regular />, onClick: () => router.push("/master-data") },
        ]}
      />

      <TabList selectedValue={tab} onTabSelect={(_, data) => setTab(String(data.value))} className="overflow-x-auto">
        {canManageSales ? <Tab value="pos">POS pusat</Tab> : null}
        <Tab value="orders">Pesanan agen</Tab>
        <Tab value="history">Riwayat penjualan</Tab>
        <Tab value="shift">Shift POS</Tab>
      </TabList>

      {tab === "pos" && canManageSales ? (
        <div className="grid gap-5 xl:grid-cols-[minmax(0,1.35fr)_minmax(340px,0.65fr)]">
          <SectionPanel title="Pilih produk" description="Stok siap jual di Gudang Produk Jadi">
            <Input
              value={search}
              onChange={(_, data) => setSearch(data.value)}
              contentBefore={<Search20Regular />}
              placeholder="Cari kode atau nama produk..."
              className="mb-4 w-full max-w-sm"
            />
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {finishedProducts.map((product) => {
                const available = availableFor(product.id);
                const price = customerPrice(products, product.id, selectedCustomer);
                return (
                  <button
                    key={product.id}
                    type="button"
                    className="group rounded-xl border border-[var(--app-border)] bg-[var(--app-surface)] p-4 text-left transition-colors hover:border-[var(--app-accent)] disabled:cursor-not-allowed disabled:opacity-50"
                    disabled={available <= 0 || price <= 0}
                    onClick={() => addToCart(product.id)}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <span className="grid size-9 place-items-center rounded-lg bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200"><Cart24Regular /></span>
                      <span className="tabular text-xs text-[var(--app-text-muted)]">{available} tersedia</span>
                    </div>
                    <h3 className="mt-4 text-sm font-semibold">{product.name}</h3>
                    <p className="mt-1 font-mono text-[11px] text-[var(--app-text-muted)]">{product.code}</p>
                    <p className="tabular mt-3 text-base font-semibold text-[var(--app-accent)]">{formatCurrency(price)}</p>
                  </button>
                );
              })}
            </div>
          </SectionPanel>

          <SectionPanel title="Keranjang" description={`${cartLines.length} jenis produk`} noPadding>
            <div className="max-h-[420px] overflow-y-auto">
              {cartLines.length ? cartLines.map((line) => {
                const price = customerPrice(products, line.product.id, selectedCustomer);
                const available = availableFor(line.product.id);
                const unitFamily = getUnitDefinition(line.product.stockUnit)?.family;
                const requiresWholeQuantity = unitFamily === "Jumlah" || unitFamily === "Kemasan";
                const minimumQuantity = requiresWholeQuantity ? 1 : 0.001;
                return (
                  <div key={line.product.id} className="border-b border-[var(--app-border)] px-4 py-3.5 last:border-0">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0"><p className="truncate text-sm font-medium">{line.product.name}</p><p className="tabular mt-1 text-xs text-[var(--app-text-muted)]">{formatCurrency(price)} × {line.quantity}</p></div>
                      <p className="tabular text-sm font-semibold">{formatCurrency(price * line.quantity)}</p>
                    </div>
                    <div className="mt-3 flex items-center gap-1">
                      <Button size="small" appearance="subtle" icon={<Subtract20Regular />} aria-label={`Kurangi ${line.product.name}`} onClick={() => setCart((current) => ({ ...current, [line.product.id]: Math.max(line.quantity - 1, 0) }))} />
                      <Input
                        type="number"
                        min={minimumQuantity}
                        max={available}
                        step={requiresWholeQuantity ? 1 : "any"}
                        value={String(line.quantity)}
                        aria-label={`Jumlah ${line.product.name}`}
                        className="!w-20"
                        onFocus={(event) => event.currentTarget.select()}
                        onChange={(_, data) => {
                          const parsed = Number(data.value);
                          if (!Number.isFinite(parsed) || parsed < minimumQuantity) return;
                          const normalized = requiresWholeQuantity ? Math.floor(parsed) : parsed;
                          setCart((current) => ({ ...current, [line.product.id]: Math.min(normalized, available) }));
                        }}
                        onBlur={() => setCart((current) => ({
                          ...current,
                          [line.product.id]: Math.min(Math.max(current[line.product.id] || minimumQuantity, minimumQuantity), available),
                        }))}
                      />
                      <Button size="small" appearance="subtle" icon={<Add20Regular />} aria-label={`Tambah ${line.product.name}`} disabled={line.quantity >= available} onClick={() => addToCart(line.product.id)} />
                      <Button size="small" appearance="subtle" icon={<Delete20Regular />} aria-label={`Hapus ${line.product.name}`} className="ml-auto" onClick={() => setCart((current) => ({ ...current, [line.product.id]: 0 }))} />
                    </div>
                  </div>
                );
              }) : (
                <div className="flex min-h-52 flex-col items-center justify-center px-5 text-center"><Cart24Regular className="text-[var(--app-accent)]" /><p className="mt-3 text-sm font-semibold">Keranjang masih kosong</p><p className="mt-1 text-xs text-[var(--app-text-muted)]">Pilih produk untuk memulai transaksi.</p></div>
              )}
            </div>
            <div className="space-y-3 border-t border-[var(--app-border)] p-4">
              <Field label="Pelanggan B2B">
                <Select value={customerId} onChange={(event) => { setCustomerId(event.target.value); setCart({}); }}>
                  {customers.filter((item) => item.isActive).map((item) => <option key={item.id} value={item.id}>{item.name} — {item.category}</option>)}
                </Select>
              </Field>
              <div className="rounded-lg bg-[var(--app-surface-2)] p-3 text-xs">
                <div className="flex items-center justify-between gap-3"><span className="text-[var(--app-text-muted)]">Harga otomatis</span><strong>{selectedCustomer?.category === "Agen 1" ? "Harga Agen 1" : "Harga Agen 2"}</strong></div>
                <div className="mt-2 grid grid-cols-3 gap-2 border-t border-[var(--app-border)] pt-2">
                  <div><span className="block text-[var(--app-text-muted)]">Tempo</span><strong>{selectedCustomer?.paymentTermsDays ?? 0} hari</strong></div>
                  <div><span className="block text-[var(--app-text-muted)]">Piutang</span><strong className="tabular">{formatCurrency(selectedExposure)}</strong></div>
                  <div><span className="block text-[var(--app-text-muted)]">Sisa kredit</span><strong className="tabular">{formatCurrency(selectedRemainingCredit)}</strong></div>
                </div>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <Field
                  label="Diskon"
                  validationState={discountInvalid ? "error" : "none"}
                  validationMessage={discountInvalid ? "Diskon harus berada di antara Rp0 dan subtotal, serta total harus lebih dari nol." : undefined}
                >
                  <Input type="number" min="0" max={subtotal} value={discount} onChange={(_, data) => setDiscount(data.value)} />
                </Field>
                <Field label="Pembayaran"><Select value={paymentMethod} onChange={(event) => setPaymentMethod(event.target.value as Sale["paymentMethod"])}><option>Tunai</option><option>QRIS</option><option>Transfer</option><option>Cicilan</option><option>Kredit/Tempo</option></Select></Field>
              </div>
              <dl className="space-y-2 border-t border-[var(--app-border)] pt-3 text-sm">
                <div className="flex justify-between"><dt className="text-[var(--app-text-muted)]">Subtotal</dt><dd className="tabular">{formatCurrency(subtotal)}</dd></div>
                <div className="flex justify-between text-base font-semibold"><dt>Total</dt><dd className="tabular">{formatCurrency(total)}</dd></div>
              </dl>
              <Button
                appearance="primary"
                size="large"
                icon={<CheckmarkCircle24Regular />}
                className="!w-full"
                disabled={!cartLines.length || !user || !selectedCustomer || discountInvalid}
                onClick={() => {
                  if (!user || !selectedCustomer) return;
                  try {
                    const sale = addSale({ salesAdminId: user.id, customerId: selectedCustomer.id, items: cartLines.map((line) => ({ productId: line.product.id, quantity: line.quantity })), discount: discountNumber, paymentMethod });
                    setCart({});
                    setDiscount("0");
                    toast("Transaksi selesai", `${sale.number} | ${formatCurrency(sale.total)}`);
                  } catch (error) {
                    toast("Transaksi tidak dapat diselesaikan", error instanceof Error ? error.message : "Periksa stok, harga, dan batas kredit.");
                  }
                }}
              >
                Bayar {formatCurrency(total)}
              </Button>
            </div>
          </SectionPanel>
        </div>
      ) : null}

      {tab === "orders" ? (
        <SectionPanel title="Pesanan agen aktif" description="Pesanan selesai setelah diambil atau dikonfirmasi diterima agen." action={canManageSales ? <Button appearance="primary" size="small" icon={<Add20Regular />} onClick={() => setOrderOpen(true)}>Input pesanan</Button> : null} noPadding>
          <DataTable data={activeOrders} columns={saleColumns} searchPlaceholder="Cari nomor, agen, atau kategori..." emptyTitle="Tidak ada pesanan aktif" emptyDescription="Semua pesanan agen telah selesai dipenuhi." />
        </SectionPanel>
      ) : null}
      {tab === "history" ? <SectionPanel noPadding><DataTable data={completedSales} columns={saleColumns} searchPlaceholder="Cari transaksi, agen, atau metode bayar..." /></SectionPanel> : null}
      {tab === "shift" ? <SectionPanel noPadding><DataTable data={salesShifts} columns={shiftColumns} searchPlaceholder="Cari admin penjualan..." /></SectionPanel> : null}

      <Dialog open={canManageSales && orderOpen} onOpenChange={(_, data) => setOrderOpen(data.open)}>
        <DialogSurface className="!max-w-5xl">
          <DialogBody>
            <DialogTitle>Input pesanan agen</DialogTitle>
            <DialogContent className="max-h-[72vh] space-y-4 overflow-y-auto pr-1">
              <Field label="Pelanggan B2B"><Select value={orderCustomerId} onChange={(event) => setOrderCustomerId(event.target.value)}>{customers.filter((item) => item.isActive).map((item) => <option key={item.id} value={item.id}>{item.name} — {item.category}</option>)}</Select></Field>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                <Field label="Sumber pesanan"><Select value={orderSource} onChange={(event) => setOrderSource(event.target.value as Exclude<OrderSource, "POS">)}><option>WhatsApp</option><option>Telepon</option><option>Datang Langsung</option></Select></Field>
                <Field label="Pemenuhan"><Select value={fulfillmentMethod} onChange={(event) => setFulfillmentMethod(event.target.value as Sale["fulfillmentMethod"])}><option>Diambil</option><option>Dikirim</option></Select></Field>
                <Field label="Dibutuhkan"><Input type="datetime-local" value={neededAt} onChange={(_, data) => setNeededAt(data.value)} /></Field>
              </div>

              <div className="grid gap-4 lg:grid-cols-[minmax(0,1.15fr)_minmax(320px,0.85fr)]">
                <section className="rounded-xl border border-[var(--app-border)] p-3">
                  <div className="mb-3">
                    <h3 className="text-sm font-semibold">Pilih produk</h3>
                    <p className="mt-0.5 text-xs text-[var(--app-text-muted)]">Boleh melebihi stok tersedia; kekurangannya akan menunggu produksi.</p>
                  </div>
                  <Input
                    value={orderSearch}
                    onChange={(_, data) => setOrderSearch(data.value)}
                    contentBefore={<Search20Regular />}
                    placeholder="Cari kode atau nama produk..."
                    className="mb-3 w-full"
                  />
                  <div className="grid max-h-72 gap-2 overflow-y-auto pr-1 sm:grid-cols-2">
                    {orderProducts.map((product) => {
                      const available = availableFor(product.id);
                      const price = customerPrice(products, product.id, orderCustomer);
                      const quantityInCart = orderCart[product.id] ?? 0;
                      return (
                        <button
                          key={product.id}
                          type="button"
                          className="rounded-lg border border-[var(--app-border)] bg-[var(--app-surface)] p-3 text-left transition-colors hover:border-[var(--app-accent)] disabled:cursor-not-allowed disabled:opacity-50"
                          disabled={price <= 0}
                          onClick={() => addToOrderCart(product.id)}
                        >
                          <div className="flex items-start justify-between gap-2">
                            <span className="font-mono text-[11px] text-[var(--app-text-muted)]">{product.code}</span>
                            <span className="tabular text-[11px] text-[var(--app-text-muted)]">{formatNumber(available)} {product.stockUnit} tersedia</span>
                          </div>
                          <p className="mt-2 text-sm font-semibold">{product.name}</p>
                          <div className="mt-2 flex items-end justify-between gap-2">
                            <span className="tabular text-sm font-semibold text-[var(--app-accent)]">{formatCurrency(price)}</span>
                            {quantityInCart > 0 ? <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[11px] font-semibold text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200">{formatNumber(quantityInCart)} dipilih</span> : null}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </section>

                <section className="overflow-hidden rounded-xl border border-[var(--app-border)]">
                  <div className="border-b border-[var(--app-border)] px-3 py-2.5">
                    <h3 className="text-sm font-semibold">Keranjang pesanan</h3>
                    <p className="mt-0.5 text-xs text-[var(--app-text-muted)]">{orderCartLines.length} jenis produk · satu nomor pesanan</p>
                  </div>
                  <div className="max-h-80 overflow-y-auto">
                    {orderCartLines.length ? orderCartLines.map((line) => {
                      const price = customerPrice(products, line.product.id, orderCustomer);
                      const available = availableFor(line.product.id);
                      const unitFamily = getUnitDefinition(line.product.stockUnit)?.family;
                      const requiresWholeQuantity = unitFamily === "Jumlah" || unitFamily === "Kemasan";
                      const minimumQuantity = requiresWholeQuantity ? 1 : 0.001;
                      const shortage = Math.max(line.quantity - available, 0);
                      return (
                        <div key={line.product.id} className="border-b border-[var(--app-border)] px-3 py-3 last:border-0">
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0">
                              <p className="truncate text-sm font-medium">{line.product.name}</p>
                              <p className="tabular mt-0.5 text-xs text-[var(--app-text-muted)]">{formatCurrency(price)} × {formatNumber(line.quantity)} {line.product.stockUnit}</p>
                            </div>
                            <p className="tabular shrink-0 text-sm font-semibold">{formatCurrency(price * line.quantity)}</p>
                          </div>
                          <p className={`mt-1 text-[11px] ${shortage > 0 ? "text-amber-700 dark:text-amber-300" : "text-emerald-700 dark:text-emerald-300"}`}>
                            {shortage > 0 ? `Perlu produksi ${formatNumber(shortage)} ${line.product.stockUnit}` : `Stok cukup · tersedia ${formatNumber(available)} ${line.product.stockUnit}`}
                          </p>
                          <div className="mt-2 flex items-center gap-1">
                            <Button size="small" appearance="subtle" icon={<Subtract20Regular />} aria-label={`Kurangi ${line.product.name}`} onClick={() => setOrderCart((current) => ({ ...current, [line.product.id]: Math.max(line.quantity - 1, 0) }))} />
                            <Input
                              type="number"
                              min={minimumQuantity}
                              step={requiresWholeQuantity ? 1 : "any"}
                              value={String(line.quantity)}
                              aria-label={`Jumlah pesanan ${line.product.name}`}
                              contentAfter={line.product.stockUnit}
                              className="!w-32"
                              onFocus={(event) => event.currentTarget.select()}
                              onChange={(_, data) => {
                                const parsed = Number(data.value);
                                if (!Number.isFinite(parsed) || parsed < minimumQuantity) return;
                                const normalized = requiresWholeQuantity ? Math.floor(parsed) : parsed;
                                setOrderCart((current) => ({ ...current, [line.product.id]: normalized }));
                              }}
                            />
                            <Button size="small" appearance="subtle" icon={<Add20Regular />} aria-label={`Tambah ${line.product.name}`} onClick={() => addToOrderCart(line.product.id)} />
                            <Button size="small" appearance="subtle" icon={<Delete20Regular />} aria-label={`Hapus ${line.product.name}`} className="ml-auto" onClick={() => setOrderCart((current) => ({ ...current, [line.product.id]: 0 }))} />
                          </div>
                        </div>
                      );
                    }) : (
                      <div className="flex min-h-52 flex-col items-center justify-center px-5 text-center">
                        <Cart24Regular className="text-[var(--app-accent)]" />
                        <p className="mt-3 text-sm font-semibold">Keranjang masih kosong</p>
                        <p className="mt-1 text-xs text-[var(--app-text-muted)]">Pilih beberapa produk di sebelah kiri.</p>
                      </div>
                    )}
                  </div>
                </section>
              </div>

              <div className="grid gap-3 sm:grid-cols-3">
                <Field label="Pembayaran"><Select value={orderPayment} onChange={(event) => setOrderPayment(event.target.value as Sale["paymentMethod"])}><option>Tunai</option><option>QRIS</option><option>Transfer</option><option>Cicilan</option><option>Kredit/Tempo</option></Select></Field>
                <Field label="Diskon pesanan" validationState={orderDiscountInvalid ? "error" : "none"} validationMessage={orderDiscountInvalid ? "Diskon tidak boleh melebihi subtotal." : undefined}><Input type="number" min="0" max={orderSubtotal} value={orderDiscount} onChange={(_, data) => setOrderDiscount(data.value)} /></Field>
                <Field
                  label={orderUsesCredit ? "DP / sudah dibayar" : "Pembayaran tercatat"}
                  validationState={paymentError ? "error" : "none"}
                  validationMessage={paymentError || undefined}
                  hint={!orderUsesCredit ? "Tunai, QRIS, dan Transfer otomatis dicatat lunas." : undefined}
                >
                  <Input
                    type="number"
                    min="0"
                    max={orderValue}
                    disabled={!orderUsesCredit}
                    value={orderUsesCredit ? paidAmount : String(effectivePaidAmount)}
                    onChange={(_, data) => setPaidAmount(data.value)}
                  />
                </Field>
              </div>
              <div className="rounded-lg bg-[var(--app-surface-2)] p-3 text-sm">
                <div className="grid gap-2 sm:grid-cols-3">
                  <div><span className="block text-xs text-[var(--app-text-muted)]">Subtotal</span><strong className="tabular">{formatCurrency(orderSubtotal)}</strong></div>
                  <div><span className="block text-xs text-[var(--app-text-muted)]">Diskon</span><strong className="tabular">{formatCurrency(orderDiscountValue)}</strong></div>
                  <div><span className="block text-xs text-[var(--app-text-muted)]">Total satu pesanan</span><strong className="tabular text-base">{formatCurrency(orderValue)}</strong></div>
                </div>
                <div className="mt-2 flex flex-wrap items-center justify-between gap-2 border-t border-[var(--app-border)] pt-2 text-xs text-[var(--app-text-muted)]">
                  <span>{orderCustomer?.category === "Agen 1" ? "Harga Agen 1" : "Harga Agen 2"} · Tempo {orderCustomer?.paymentTermsDays ?? 0} hari · Sisa kredit {formatCurrency(remainingCredit)} · Dibayar {formatCurrency(effectivePaidAmount)}</span>
                  <strong className={orderHasEnoughStock ? "text-emerald-700 dark:text-emerald-300" : "text-amber-700 dark:text-amber-300"}>{orderCartLines.length ? (orderHasEnoughStock ? "Prediksi: Siap Dipenuhi" : "Prediksi: Menunggu Produksi") : "Pilih produk"}</strong>
                </div>
              </div>
            </DialogContent>
            <DialogActions>
              <Button appearance="secondary" onClick={() => setOrderOpen(false)}>Batal</Button>
              <Button
                appearance="primary"
                disabled={!user || !orderCustomer || !orderCartLines.length || !neededAt || orderValue <= 0 || orderDiscountInvalid || Boolean(paymentError)}
                onClick={() => {
                  if (!user || !orderCustomer) return;
                  try {
                    const order = addAgentOrder({ salesAdminId: user.id, customerId: orderCustomer.id, items: orderCartLines.map((line) => ({ productId: line.product.id, quantity: line.quantity })), discount: orderDiscountValue, paymentMethod: orderPayment, orderSource, fulfillmentMethod, paidAmount: effectivePaidAmount, neededAt: new Date(neededAt).toISOString() });
                    setOrderCart({});
                    setOrderSearch("");
                    setOrderDiscount("0");
                    setPaidAmount("0");
                    setOrderOpen(false);
                    setTab("orders");
                    toast("Pesanan agen dibuat", `${order.number} · ${order.items.length} produk · ${order.status}`);
                  } catch (error) {
                    toast("Pesanan tidak dapat dibuat", error instanceof Error ? error.message : "Periksa harga, pembayaran, dan batas kredit.");
                  }
                }}
              >
                Simpan 1 pesanan · {formatCurrency(orderValue)}
              </Button>
            </DialogActions>
          </DialogBody>
        </DialogSurface>
      </Dialog>

      <Dialog open={Boolean(closeShiftId)} onOpenChange={(_, data) => !data.open && setCloseShiftId(null)}>
        <DialogSurface>
          <DialogBody>
            <DialogTitle>Tutup shift POS</DialogTitle>
            <DialogContent className="space-y-4">
              <div className="rounded-lg bg-[var(--app-surface-2)] p-4"><p className="text-xs text-[var(--app-text-muted)]">Kas seharusnya</p><p className="tabular mt-1 text-xl font-semibold">{formatCurrency(selectedShift?.expectedCash ?? 0)}</p></div>
              <Field label="Uang fisik"><Input type="number" value={actualCash} onChange={(_, data) => setActualCash(data.value)} /></Field>
              <p className="text-sm text-[var(--app-text-muted)]">Selisih: <span className="tabular font-semibold text-[var(--app-text)]">{formatCurrency((Number(actualCash) || 0) - (selectedShift?.expectedCash ?? 0))}</span></p>
            </DialogContent>
            <DialogActions>
              <Button appearance="secondary" onClick={() => setCloseShiftId(null)}>Batal</Button>
              <Button appearance="primary" icon={<Print24Regular />} onClick={() => { if (!closeShiftId) return; closeSalesShift(closeShiftId, Number(actualCash) || 0); setCloseShiftId(null); toast("Shift POS ditutup", "Ringkasan kas telah dibuat."); }}>Tutup dan cetak</Button>
            </DialogActions>
          </DialogBody>
        </DialogSurface>
      </Dialog>
    </div>
  );
}
