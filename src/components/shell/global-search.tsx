"use client";

import { Input } from "@fluentui/react-components";
import { Search20Regular } from "@fluentui/react-icons";
import { usePathname, useRouter } from "next/navigation";
import { useDeferredValue, useEffect, useMemo, useState } from "react";
import { controlNavigation, mainNavigation } from "@/config/navigation";
import { useCurrentAccess } from "@/hooks/use-current-access";
import { canAccessRoute, type AppRoute } from "@/lib/access";
import { useERPStore } from "@/store/use-erp-store";

type SearchResult = {
  id: string;
  title: string;
  meta: string;
  href: AppRoute;
};

export function GlobalSearch() {
  const router = useRouter();
  const pathname = usePathname();
  const { role } = useCurrentAccess();
  const [value, setValue] = useState("");
  const [focused, setFocused] = useState(false);
  const deferredValue = useDeferredValue(value);
  const products = useERPStore((state) => state.products);
  const sales = useERPStore((state) => state.sales);
  const customers = useERPStore((state) => state.customers);
  const productionOrders = useERPStore((state) => state.productionOrders);
  const purchaseOrders = useERPStore((state) => state.purchaseOrders);
  const invoices = useERPStore((state) => state.invoices);
  const employees = useERPStore((state) => state.employees);
  const approvals = useERPStore((state) => state.approvals);

  useEffect(() => {
    setValue("");
    setFocused(false);
  }, [pathname]);

  const customerNames = useMemo(
    () => new Map(customers.map((customer) => [customer.id, customer.name])),
    [customers],
  );

  const results = useMemo(() => {
    const query = deferredValue.trim().toLowerCase();
    if (!role || query.length < 2) return [];

    const matches = (text: string) => text.toLowerCase().includes(query);
    const allowed = (href: AppRoute) => canAccessRoute(role, href);
    const found: SearchResult[] = [];
    const add = (result: SearchResult) => {
      if (found.length < 8) found.push(result);
    };

    for (const item of [...mainNavigation, ...controlNavigation]) {
      if (found.length >= 8) break;
      if (item.roles.includes(role) && matches(`${item.label} ${item.href}`)) {
        add({ id: `route-${item.href}`, title: item.label, meta: "Buka modul", href: item.href });
      }
    }

    if (found.length < 8 && allowed("/sales")) {
      for (const sale of sales) {
        if (found.length >= 8) break;
        const customerName = customerNames.get(sale.customerId) ?? sale.customerId;
        if (matches(`${sale.number} ${customerName} ${sale.status}`)) {
          add({ id: sale.id, title: sale.number, meta: `${customerName} · ${sale.status}`, href: "/sales" });
        }
      }
    }
    if (found.length < 8 && allowed("/master-data")) {
      for (const product of products) {
        if (found.length >= 8) break;
        if (matches(`${product.code} ${product.name} ${product.type}`)) {
          add({ id: product.id, title: `${product.code} · ${product.name}`, meta: product.type, href: "/master-data" });
        }
      }
    }
    if (found.length < 8 && allowed("/production")) {
      for (const order of productionOrders) {
        if (found.length >= 8) break;
        if (matches(`${order.batchNumber} ${order.status}`)) {
          add({ id: order.id, title: order.batchNumber, meta: `Produksi · ${order.status}`, href: "/production" });
        }
      }
    }
    if (found.length < 8 && allowed("/purchasing")) {
      for (const order of purchaseOrders) {
        if (found.length >= 8) break;
        if (matches(`${order.number} ${order.supplierNameSnapshot} ${order.status}`)) {
          add({ id: order.id, title: order.number, meta: `${order.supplierNameSnapshot} · ${order.status}`, href: "/purchasing" });
        }
      }
    }
    if (found.length < 8 && allowed("/finance")) {
      for (const invoice of invoices) {
        if (found.length >= 8) break;
        if (matches(`${invoice.number} ${invoice.party} ${invoice.status}`)) {
          add({ id: invoice.id, title: invoice.number, meta: `${invoice.party} · ${invoice.status}`, href: "/finance" });
        }
      }
    }
    if (found.length < 8 && allowed("/hr")) {
      for (const employee of employees) {
        if (found.length >= 8) break;
        if (matches(`${employee.number} ${employee.name} ${employee.department}`)) {
          add({ id: employee.id, title: employee.name, meta: `${employee.number} · ${employee.department}`, href: "/hr" });
        }
      }
    }
    if (found.length < 8 && allowed("/approvals")) {
      for (const approval of approvals) {
        if (found.length >= 8) break;
        if (matches(`${approval.reference} ${approval.title} ${approval.status}`)) {
          add({ id: approval.id, title: approval.reference, meta: `${approval.title} · ${approval.status}`, href: "/approvals" });
        }
      }
    }

    return found;
  }, [approvals, customerNames, deferredValue, employees, invoices, products, productionOrders, purchaseOrders, role, sales]);

  const openResult = (href: AppRoute) => {
    setValue("");
    setFocused(false);
    router.push(href);
  };

  return (
    <div className="relative hidden min-w-0 flex-1 md:block">
      <Input
        id="global-search"
        name="global-search"
        value={value}
        onChange={(_, data) => setValue(data.value)}
        onFocus={() => setFocused(true)}
        onBlur={() => window.setTimeout(() => setFocused(false), 120)}
        onKeyDown={(event) => {
          if (event.key === "Enter" && results[0]) {
            event.preventDefault();
            openResult(results[0].href);
          }
          if (event.key === "Escape") {
            setValue("");
            setFocused(false);
          }
        }}
        contentBefore={<Search20Regular />}
        placeholder="Cari transaksi, batch, produk..."
        aria-label="Pencarian global"
        className="w-full max-w-md"
      />
      {focused && value.trim().length >= 2 ? (
        <div className="absolute left-0 top-[calc(100%+0.5rem)] z-50 w-full max-w-md overflow-hidden rounded-xl border border-[var(--app-border)] bg-[var(--app-surface)] shadow-xl">
          {deferredValue !== value ? (
            <div className="px-4 py-5 text-center text-sm text-[var(--app-text-muted)]">Mencari…</div>
          ) : results.length ? results.map((result) => (
            <button
              key={`${result.href}-${result.id}`}
              type="button"
              className="focus-ring block w-full border-b border-[var(--app-border)] px-4 py-3 text-left transition-colors last:border-0 hover:bg-[var(--app-surface-2)]"
              onMouseDown={(event) => event.preventDefault()}
              onClick={() => openResult(result.href)}
            >
              <span className="block truncate text-sm font-semibold">{result.title}</span>
              <span className="mt-0.5 block truncate text-xs text-[var(--app-text-muted)]">{result.meta}</span>
            </button>
          )) : (
            <div className="px-4 py-5 text-center text-sm text-[var(--app-text-muted)]">
              Tidak ada hasil yang dapat diakses untuk “{value.trim()}”.
            </div>
          )}
        </div>
      ) : null}
    </div>
  );
}
