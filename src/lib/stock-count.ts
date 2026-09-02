import type { StockCountLine } from "@/lib/types";

export type StockCountDraft = {
  quantity: string;
  reason: string;
};

export type StockCountDrafts = Record<string, StockCountDraft>;

export const createStockCountDrafts = (lines: StockCountLine[]): StockCountDrafts =>
  Object.fromEntries(lines.map((line) => [line.id, {
    quantity: line.countedQty === undefined ? "" : String(line.countedQty),
    reason: line.reason ?? "",
  }]));

export const parseStockCountQuantity = (value: string): number | null => {
  const normalized = value.trim().replace(",", ".");
  if (!normalized || !/^(?:\d+(?:\.\d*)?|\.\d+)$/.test(normalized)) return null;

  const quantity = Number(normalized);
  return Number.isFinite(quantity) && quantity >= 0 ? quantity : null;
};

export const calculateStockCountVariance = (countedQty: number, systemQty: number) =>
  Math.round((countedQty - systemQty + Number.EPSILON) * 1_000_000) / 1_000_000;
