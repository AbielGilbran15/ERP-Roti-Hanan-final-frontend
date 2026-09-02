"use client";

import type { ColumnDef } from "@tanstack/react-table";
import { Input } from "@fluentui/react-components";
import { createContext, useCallback, useContext, useMemo, type Dispatch, type SetStateAction } from "react";
import { DataTable } from "@/components/ui/data-table";
import { formatNumber } from "@/lib/format";
import type { StockCountDrafts } from "@/lib/stock-count";
import type { StockCountLine } from "@/lib/types";

type StockCountProduct = {
  id: string;
  name: string;
  stockUnit: string;
};

type StockCountDraftContextValue = {
  canEdit: boolean;
  drafts: StockCountDrafts;
  setQuantity: (lineId: string, quantity: string) => void;
  setReason: (lineId: string, reason: string) => void;
};

const StockCountDraftContext = createContext<StockCountDraftContextValue | null>(null);

const useStockCountDraft = (lineId: string) => {
  const context = useContext(StockCountDraftContext);
  if (!context) throw new Error("Editor stok opname harus berada di dalam StockCountDraftContext.");

  return {
    ...context,
    draft: context.drafts[lineId] ?? { quantity: "", reason: "" },
  };
};

function QuantityCell({ lineId, productName, unit }: { lineId: string; productName: string; unit: string }) {
  const { canEdit, draft, setQuantity } = useStockCountDraft(lineId);

  return (
    <Input
      type="text"
      inputMode="decimal"
      autoComplete="off"
      value={draft.quantity}
      onChange={(_, data) => setQuantity(lineId, data.value)}
      readOnly={!canEdit}
      aria-label={`Hasil fisik ${productName}`}
      contentAfter={<span className="text-xs text-[var(--app-text-muted)]">{unit}</span>}
    />
  );
}

function ReasonCell({ lineId, productName }: { lineId: string; productName: string }) {
  const { canEdit, draft, setReason } = useStockCountDraft(lineId);

  return (
    <Input
      value={draft.reason}
      onChange={(_, data) => setReason(lineId, data.value)}
      placeholder="Wajib bila berbeda"
      readOnly={!canEdit}
      aria-label={`Alasan selisih ${productName}`}
    />
  );
}

export function StockCountLineEditor({
  lines,
  products,
  drafts,
  setDrafts,
  canEdit,
}: {
  lines: StockCountLine[];
  products: StockCountProduct[];
  drafts: StockCountDrafts;
  setDrafts: Dispatch<SetStateAction<StockCountDrafts>>;
  canEdit: boolean;
}) {
  const setQuantity = useCallback((lineId: string, quantity: string) => {
    setDrafts((current) => ({
      ...current,
      [lineId]: { quantity, reason: current[lineId]?.reason ?? "" },
    }));
  }, [setDrafts]);

  const setReason = useCallback((lineId: string, reason: string) => {
    setDrafts((current) => ({
      ...current,
      [lineId]: { quantity: current[lineId]?.quantity ?? "", reason },
    }));
  }, [setDrafts]);

  const contextValue = useMemo(() => ({ canEdit, drafts, setQuantity, setReason }), [canEdit, drafts, setQuantity, setReason]);

  const columns = useMemo<ColumnDef<StockCountLine>[]>(() => {
    const productById = new Map(products.map((product) => [product.id, product]));
    const productFor = (productId: string) => productById.get(productId);

    return [
      {
        header: "Barang",
        accessorFn: (row) => productFor(row.productId)?.name ?? row.productId,
        cell: ({ row }) => {
          const product = productFor(row.original.productId);
          return <div><p className="font-medium">{product?.name ?? row.original.productId}</p><p className="mt-0.5 font-mono text-[11px] text-[var(--app-text-muted)]">{row.original.lot}</p></div>;
        },
      },
      {
        header: "Sistem",
        accessorKey: "systemQty",
        cell: ({ row }) => <span className="tabular">{formatNumber(row.original.systemQty)} {productFor(row.original.productId)?.stockUnit}</span>,
      },
      {
        header: "Fisik",
        id: "countedQty",
        cell: ({ row }) => {
          const product = productFor(row.original.productId);
          return <QuantityCell lineId={row.original.id} productName={product?.name ?? row.original.productId} unit={product?.stockUnit ?? ""} />;
        },
      },
      {
        header: "Alasan selisih",
        id: "reason",
        cell: ({ row }) => <ReasonCell lineId={row.original.id} productName={productFor(row.original.productId)?.name ?? row.original.productId} />,
      },
    ];
  }, [products]);

  return (
    <StockCountDraftContext.Provider value={contextValue}>
      <DataTable
        data={lines}
        columns={columns}
        searchPlaceholder="Cari barang atau lot..."
        emptyTitle="Tidak ada lot"
        emptyDescription="Dokumen ini tidak memiliki lot untuk dihitung."
      />
    </StockCountDraftContext.Provider>
  );
}
