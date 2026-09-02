import { localDateKey } from "@/lib/date";
import type { CostOfGoodsSold, Expense, Payroll, Product, Sale, SalesReturn } from "@/lib/types";

export const postedSaleStatuses = ["Selesai", "Retur Sebagian", "Diretur"] as const;

export const isPostedSale = (sale: Sale) =>
  postedSaleStatuses.some((status) => status === sale.status);

export const postedSaleDateKey = (sale: Sale) =>
  localDateKey(sale.receivedAt ?? sale.createdAt);

export const calculateMonthlyOperatingProfit = ({
  monthKey,
  payrollPeriod,
  sales,
  salesReturns,
  costOfGoodsSold,
  expenses,
  payrolls,
}: {
  monthKey: string;
  payrollPeriod: string;
  sales: Sale[];
  salesReturns: SalesReturn[];
  costOfGoodsSold: CostOfGoodsSold[];
  expenses: Expense[];
  payrolls: Payroll[];
}) => {
  const grossRevenue = sales
    .filter((sale) => isPostedSale(sale) && postedSaleDateKey(sale).startsWith(monthKey))
    .reduce((sum, sale) => sum + sale.total, 0);
  const returns = salesReturns
    .filter((item) => localDateKey(item.createdAt).startsWith(monthKey))
    .reduce((sum, item) => sum + item.returnValue, 0);
  const hpp = costOfGoodsSold
    .filter((item) => item.date.startsWith(monthKey))
    .reduce((sum, item) => sum + item.amount, 0);
  const postedExpenses = expenses
    .filter((item) => item.date.startsWith(monthKey) && ["Disetujui", "Dibayar"].includes(item.status))
    .reduce((sum, item) => sum + item.amount, 0);
  const payroll = payrolls
    .filter((item) => item.period.toLocaleLowerCase("id-ID") === payrollPeriod.toLocaleLowerCase("id-ID") && ["Disetujui", "Dibayar", "Dikunci"].includes(item.status))
    .reduce((sum, item) => sum + item.netPay, 0);
  const netRevenue = grossRevenue - returns;

  return {
    grossRevenue,
    returns,
    netRevenue,
    hpp,
    postedExpenses,
    payroll,
    profit: netRevenue - hpp - postedExpenses - payroll,
  };
};

export const buildAutomaticHppForSale = (
  sale: Sale,
  products: Product[],
): CostOfGoodsSold[] => {
  if (!isPostedSale(sale)) return [];

  const date = postedSaleDateKey(sale);
  return sale.items.map((line, index) => {
    const product = products.find((item) => item.id === line.productId);
    const unitCost = product?.cost ?? 0;
    return {
      id: `hpp-auto-${sale.id}-${line.productId}`,
      number: `HPP-${sale.number}-${String(index + 1).padStart(2, "0")}`,
      date,
      productId: line.productId,
      productNameSnapshot: product?.name ?? line.productId,
      quantity: line.quantity,
      unitCost,
      description: `HPP otomatis dari transaksi selesai ${sale.number}`,
      amount: line.quantity * unitCost,
      source: "Otomatis Penjualan",
      saleId: sale.id,
      reference: sale.number,
    };
  });
};

export const mergeAutomaticSaleHpp = (
  current: CostOfGoodsSold[],
  sale: Sale,
  products: Product[],
) => {
  const additions = buildAutomaticHppForSale(sale, products).filter(
    (candidate) => !current.some((item) => item.id === candidate.id),
  );
  return additions.length ? [...additions, ...current] : current;
};

export const buildAutomaticHppForReturn = (
  salesReturn: SalesReturn,
  products: Product[],
): CostOfGoodsSold[] => salesReturn.items.map((line, index) => {
  const product = products.find((item) => item.id === line.productId);
  const unitCost = product?.cost ?? 0;
  return {
    id: `hpp-return-${salesReturn.id}-${line.productId}`,
    number: `HPP-${salesReturn.number}-${String(index + 1).padStart(2, "0")}`,
    date: localDateKey(salesReturn.createdAt),
    productId: line.productId,
    productNameSnapshot: product?.name ?? line.productId,
    quantity: -line.quantity,
    unitCost,
    description: `Pembalik HPP otomatis dari retur ${salesReturn.number}`,
    amount: -(line.quantity * unitCost),
    source: "Otomatis Retur",
    saleId: salesReturn.saleId,
    reference: salesReturn.number,
  };
});
