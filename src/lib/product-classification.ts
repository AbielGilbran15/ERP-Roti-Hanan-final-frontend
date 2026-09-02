import type {
  FinishedProductCategory,
  FinishedProductTypeDefinition,
  FinishedProductVariant,
  Product,
} from "@/lib/types";

export type ProductClassificationData = {
  categories: FinishedProductCategory[];
  types: FinishedProductTypeDefinition[];
  variants: FinishedProductVariant[];
};

export const bySortOrder = <T extends { sortOrder: number; name: string }>(a: T, b: T) =>
  a.sortOrder - b.sortOrder || a.name.localeCompare(b.name, "id");

export const getFinishedProductCategory = (data: ProductClassificationData, id?: string) =>
  data.categories.find((item) => item.id === id);

export const getFinishedProductType = (data: ProductClassificationData, id?: string) =>
  data.types.find((item) => item.id === id);

export const getFinishedProductVariant = (data: ProductClassificationData, id?: string) =>
  data.variants.find((item) => item.id === id);

export const getTypesForCategory = (data: ProductClassificationData, categoryId?: string, activeOnly = false) =>
  data.types
    .filter((item) => item.categoryId === categoryId && (!activeOnly || item.isActive))
    .sort(bySortOrder);

export const getVariantsForType = (data: ProductClassificationData, typeId?: string, activeOnly = false) =>
  data.variants
    .filter((item) => item.typeId === typeId && (!activeOnly || item.isActive))
    .sort(bySortOrder);

export const formatProductClassification = (product: Product, data: ProductClassificationData) => {
  const category = getFinishedProductCategory(data, product.finishedProductCategoryId)?.name;
  const type = getFinishedProductType(data, product.finishedProductTypeId)?.name;
  const variant = getFinishedProductVariant(data, product.finishedProductVariantId)?.name;
  return [category, type, variant].filter(Boolean).join(" / ") || "Belum diklasifikasikan";
};

export const buildFinishedProductName = (product: Product, data: ProductClassificationData) =>
  formatProductClassification(product, data).replaceAll(" / ", " — ");

export const productClassificationKey = (product: Product) =>
  [product.finishedProductCategoryId ?? "", product.finishedProductTypeId ?? "", product.finishedProductVariantId ?? ""].join("::");
