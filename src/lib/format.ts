import { format, formatDistanceToNowStrict } from "date-fns";
import { id } from "date-fns/locale";

export const formatCurrency = (value: number) =>
  new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(value);

export const formatCompactCurrency = (value: number) =>
  new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(value);

export const formatNumber = (value: number, maximumFractionDigits = 0) =>
  new Intl.NumberFormat("id-ID", { maximumFractionDigits }).format(value);

export const formatDate = (value?: string, pattern = "dd MMM yyyy") => {
  if (!value) return "-";
  return format(new Date(value), pattern, { locale: id });
};

export const formatDateTime = (value?: string) => formatDate(value, "dd MMM yyyy, HH:mm");

export const formatRelative = (value: string) =>
  formatDistanceToNowStrict(new Date(value), { addSuffix: true, locale: id });

export const initials = (name: string) =>
  name
    .split(" ")
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();
