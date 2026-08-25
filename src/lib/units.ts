export type UnitFamily = "Berat" | "Volume" | "Jumlah" | "Kemasan";

export type UnitDefinition = {
  name: string;
  family: UnitFamily;
  factorToBase: number;
  automatic: boolean;
};

export const unitDefinitions: UnitDefinition[] = [
  { name: "Ton", family: "Berat", factorToBase: 1_000_000, automatic: true },
  { name: "Kg", family: "Berat", factorToBase: 1_000, automatic: true },
  { name: "Gram", family: "Berat", factorToBase: 1, automatic: true },
  { name: "Mg", family: "Berat", factorToBase: 0.001, automatic: true },
  { name: "Liter", family: "Volume", factorToBase: 1_000, automatic: true },
  { name: "Ml", family: "Volume", factorToBase: 1, automatic: true },
  { name: "Pcs", family: "Jumlah", factorToBase: 1, automatic: true },
  { name: "Lusin", family: "Jumlah", factorToBase: 12, automatic: true },
  { name: "Kodi", family: "Jumlah", factorToBase: 20, automatic: true },
  { name: "Gross", family: "Jumlah", factorToBase: 144, automatic: true },
  { name: "Karung", family: "Kemasan", factorToBase: 1, automatic: false },
  { name: "Sak", family: "Kemasan", factorToBase: 1, automatic: false },
  { name: "Pack", family: "Kemasan", factorToBase: 1, automatic: false },
  { name: "Dus", family: "Kemasan", factorToBase: 1, automatic: false },
  { name: "Karton", family: "Kemasan", factorToBase: 1, automatic: false },
  { name: "Botol", family: "Kemasan", factorToBase: 1, automatic: false },
  { name: "Kaleng", family: "Kemasan", factorToBase: 1, automatic: false },
  { name: "Roll", family: "Kemasan", factorToBase: 1, automatic: false },
];

export const unitGroups: Array<{ label: UnitFamily; units: string[] }> = [
  { label: "Berat", units: ["Ton", "Kg", "Gram", "Mg"] },
  { label: "Volume", units: ["Liter", "Ml"] },
  { label: "Jumlah", units: ["Pcs", "Lusin", "Kodi", "Gross"] },
  { label: "Kemasan", units: ["Karung", "Sak", "Pack", "Dus", "Karton", "Botol", "Kaleng", "Roll"] },
];

export const getUnitDefinition = (unit: string) =>
  unitDefinitions.find((definition) => definition.name === unit);

export const convertUnit = (value: number, fromUnit: string, toUnit: string): number | null => {
  if (!Number.isFinite(value) || value < 0 || !fromUnit || !toUnit) return null;
  if (fromUnit === toUnit) return value;

  const from = getUnitDefinition(fromUnit);
  const to = getUnitDefinition(toUnit);
  if (!from || !to || from.family !== to.family || !from.automatic || !to.automatic) return null;

  return value * (from.factorToBase / to.factorToBase);
};

export const calculatePurchaseConversion = (
  contentValue: number,
  contentUnit: string,
  stockUnit: string,
) => convertUnit(contentValue, contentUnit, stockUnit);

export const describeUnitCompatibility = (fromUnit: string, toUnit: string) => {
  const from = getUnitDefinition(fromUnit);
  const to = getUnitDefinition(toUnit);
  if (!from || !to) return "Pilih satuan isi dan satuan stok dari daftar.";
  if (fromUnit === toUnit) return `Tidak memerlukan konversi tambahan karena keduanya memakai ${fromUnit}.`;
  if (from.family !== to.family) return `${fromUnit} (${from.family}) tidak dapat dikonversi ke ${toUnit} (${to.family}).`;
  if (!from.automatic || !to.automatic) return "Satuan kemasan tidak memiliki faktor otomatis; isi kemasan harus dinyatakan dalam satuan stok yang sama.";
  return `Konversi ${fromUnit} ke ${toUnit} dihitung otomatis oleh sistem.`;
};
