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
  Textarea,
} from "@fluentui/react-components";
import { Add20Regular, Edit20Regular } from "@fluentui/react-icons";
import { useMemo, useState } from "react";
import { DataTable } from "@/components/ui/data-table";
import { SectionPanel } from "@/components/ui/section-panel";
import { StatusBadge } from "@/components/ui/status-badge";
import { useAppToast } from "@/components/ui/app-toast";
import { useCurrentAccess } from "@/hooks/use-current-access";
import { canManageMaster } from "@/lib/access";
import { bySortOrder } from "@/lib/product-classification";
import type { FinishedProductCategory, FinishedProductTypeDefinition, FinishedProductVariant } from "@/lib/types";
import { useERPStore } from "@/store/use-erp-store";

const emptyCategory = (sequence: number): FinishedProductCategory => ({
  id: "",
  code: `KAT-${String(sequence).padStart(2, "0")}`,
  name: "",
  requiresType: true,
  requiresVariant: true,
  sortOrder: sequence,
  isActive: true,
});

const emptyType = (categoryId: string, sequence: number): FinishedProductTypeDefinition => ({
  id: "",
  categoryId,
  code: `TIPE-${String(sequence).padStart(2, "0")}`,
  name: "",
  sortOrder: sequence,
  isActive: true,
});

const emptyVariant = (typeId: string, sequence: number): FinishedProductVariant => ({
  id: "",
  typeId,
  code: `VAR-${String(sequence).padStart(2, "0")}`,
  name: "",
  description: "",
  sortOrder: sequence,
  isActive: true,
});

export function ProductClassificationPanel() {
  const { role } = useCurrentAccess();
  const toast = useAppToast();
  const categories = useERPStore((state) => state.finishedProductCategories);
  const types = useERPStore((state) => state.finishedProductTypes);
  const variants = useERPStore((state) => state.finishedProductVariants);
  const products = useERPStore((state) => state.products);
  const saveCategory = useERPStore((state) => state.saveFinishedProductCategory);
  const saveType = useERPStore((state) => state.saveFinishedProductType);
  const saveVariant = useERPStore((state) => state.saveFinishedProductVariant);
  const canEdit = canManageMaster(role, "finished.classification");
  const [categoryDraft, setCategoryDraft] = useState<FinishedProductCategory | null>(null);
  const [typeDraft, setTypeDraft] = useState<FinishedProductTypeDefinition | null>(null);
  const [variantDraft, setVariantDraft] = useState<FinishedProductVariant | null>(null);

  const sortedCategories = useMemo(() => [...categories].sort(bySortOrder), [categories]);
  const sortedTypes = useMemo(() => [...types].sort((a, b) => {
    const categoryOrder = (categories.find((item) => item.id === a.categoryId)?.sortOrder ?? 0) - (categories.find((item) => item.id === b.categoryId)?.sortOrder ?? 0);
    return categoryOrder || bySortOrder(a, b);
  }), [categories, types]);
  const sortedVariants = useMemo(() => [...variants].sort((a, b) => {
    const typeOrder = sortedTypes.findIndex((item) => item.id === a.typeId) - sortedTypes.findIndex((item) => item.id === b.typeId);
    return typeOrder || bySortOrder(a, b);
  }), [sortedTypes, variants]);

  const hierarchy = sortedCategories.map((category) => ({
    category,
    types: sortedTypes.filter((type) => type.categoryId === category.id).map((type) => ({
      type,
      variants: sortedVariants.filter((variant) => variant.typeId === type.id),
    })),
  }));

  const categoryColumns = useMemo<ColumnDef<FinishedProductCategory>[]>(() => [
    { header: "Kategori", accessorFn: (row) => `${row.code} ${row.name}`, cell: ({ row }) => <div><p className="font-medium">{row.original.name}</p><p className="font-mono text-[11px] text-[var(--app-text-muted)]">{row.original.code}</p></div> },
    { header: "Struktur", accessorFn: (row) => `${row.requiresType} ${row.requiresVariant}`, cell: ({ row }) => row.original.requiresType ? <span>Tipe → {row.original.requiresVariant ? "Varian" : "SKU"}</span> : <span>Langsung menjadi SKU</span> },
    { header: "Isi", accessorFn: (row) => types.filter((item) => item.categoryId === row.id).length, cell: ({ row }) => <span>{types.filter((item) => item.categoryId === row.original.id).length} tipe · {products.filter((item) => item.finishedProductCategoryId === row.original.id).length} SKU</span> },
    { header: "Urutan", accessorKey: "sortOrder" },
    { header: "Status", accessorKey: "isActive", cell: ({ getValue }) => <StatusBadge status={getValue() ? "Aktif" : "Nonaktif"} /> },
    ...(canEdit ? [{ id: "action", header: "Tindakan", cell: ({ row }: { row: { original: FinishedProductCategory } }) => <Button size="small" appearance="subtle" icon={<Edit20Regular />} onClick={() => setCategoryDraft({ ...row.original })}>Kelola</Button> }] : []),
  ], [canEdit, products, types]);

  const typeColumns = useMemo<ColumnDef<FinishedProductTypeDefinition>[]>(() => [
    { header: "Tipe", accessorFn: (row) => `${row.code} ${row.name}`, cell: ({ row }) => <div><p className="font-medium">{row.original.name}</p><p className="font-mono text-[11px] text-[var(--app-text-muted)]">{row.original.code}</p></div> },
    { header: "Kategori induk", accessorFn: (row) => categories.find((item) => item.id === row.categoryId)?.name ?? "—" },
    { header: "Varian", accessorFn: (row) => variants.filter((item) => item.typeId === row.id).length, cell: ({ row }) => `${variants.filter((item) => item.typeId === row.original.id).length} varian` },
    { header: "Urutan", accessorKey: "sortOrder" },
    { header: "Status", accessorKey: "isActive", cell: ({ getValue }) => <StatusBadge status={getValue() ? "Aktif" : "Nonaktif"} /> },
    ...(canEdit ? [{ id: "action", header: "Tindakan", cell: ({ row }: { row: { original: FinishedProductTypeDefinition } }) => <Button size="small" appearance="subtle" icon={<Edit20Regular />} onClick={() => setTypeDraft({ ...row.original })}>Kelola</Button> }] : []),
  ], [canEdit, categories, variants]);

  const variantColumns = useMemo<ColumnDef<FinishedProductVariant>[]>(() => [
    { header: "Varian", accessorFn: (row) => `${row.code} ${row.name} ${row.description}`, cell: ({ row }) => <div className="max-w-[300px]"><p className="font-medium">{row.original.name}</p><p className="font-mono text-[11px] text-[var(--app-text-muted)]">{row.original.code}</p>{row.original.description ? <p className="mt-1 text-xs leading-5 text-[var(--app-text-muted)]">{row.original.description}</p> : null}</div> },
    { header: "Tipe / Kategori", accessorFn: (row) => {
      const type = types.find((item) => item.id === row.typeId);
      const category = categories.find((item) => item.id === type?.categoryId);
      return `${category?.name ?? "—"} ${type?.name ?? "—"}`;
    }, cell: ({ row }) => {
      const type = types.find((item) => item.id === row.original.typeId);
      const category = categories.find((item) => item.id === type?.categoryId);
      return <div><p>{type?.name ?? "—"}</p><p className="text-xs text-[var(--app-text-muted)]">{category?.name ?? "—"}</p></div>;
    } },
    { header: "Urutan", accessorKey: "sortOrder" },
    { header: "Status", accessorKey: "isActive", cell: ({ getValue }) => <StatusBadge status={getValue() ? "Aktif" : "Nonaktif"} /> },
    ...(canEdit ? [{ id: "action", header: "Tindakan", cell: ({ row }: { row: { original: FinishedProductVariant } }) => <Button size="small" appearance="subtle" icon={<Edit20Regular />} onClick={() => setVariantDraft({ ...row.original })}>Kelola</Button> }] : []),
  ], [canEdit, categories, types]);

  const persistCategory = () => {
    if (!categoryDraft) return;
    try {
      const saved = saveCategory(categoryDraft);
      setCategoryDraft(null);
      toast("Kategori tersimpan", `${saved.code} — ${saved.name}`);
    } catch (error) {
      toast("Kategori tidak dapat disimpan", error instanceof Error ? error.message : "Periksa kembali data kategori.");
    }
  };
  const persistType = () => {
    if (!typeDraft) return;
    try {
      const saved = saveType(typeDraft);
      setTypeDraft(null);
      toast("Tipe tersimpan", `${saved.code} — ${saved.name}`);
    } catch (error) {
      toast("Tipe tidak dapat disimpan", error instanceof Error ? error.message : "Periksa kembali data tipe.");
    }
  };
  const persistVariant = () => {
    if (!variantDraft) return;
    try {
      const saved = saveVariant(variantDraft);
      setVariantDraft(null);
      toast("Varian tersimpan", `${saved.code} — ${saved.name}`);
    } catch (error) {
      toast("Varian tidak dapat disimpan", error instanceof Error ? error.message : "Periksa kembali data varian.");
    }
  };

  const typeCategories = sortedCategories.filter((item) => item.requiresType);
  const variantTypes = sortedTypes.filter((type) => categories.find((category) => category.id === type.categoryId)?.requiresVariant);

  return (
    <div className="space-y-5">
      <div className="rounded-xl border border-[var(--app-border)] bg-[var(--app-surface-2)]/45 p-4">
        <p className="text-sm font-semibold">Hierarki Barang Jadi</p>
        <p className="mt-1 text-xs leading-5 text-[var(--app-text-muted)]">Kategori, tipe, dan varian adalah master yang dapat berubah. Record yang sudah dipakai cukup dinonaktifkan agar histori tetap utuh.</p>
        <div className="mt-4 grid gap-3 lg:grid-cols-2">
          {hierarchy.map(({ category, types: categoryTypes }) => (
            <div key={category.id} className="rounded-lg border border-[var(--app-border)] bg-[var(--app-surface)] p-3">
              <div className="flex items-center justify-between gap-3"><div><p className="font-medium">{category.name}</p><p className="font-mono text-[10px] text-[var(--app-text-muted)]">{category.code}</p></div><StatusBadge status={category.isActive ? "Aktif" : "Nonaktif"} /></div>
              {categoryTypes.length ? <div className="mt-3 space-y-2">{categoryTypes.map(({ type, variants: typeVariants }) => <div key={type.id} className="rounded-md bg-[var(--app-surface-2)] px-3 py-2 text-xs"><strong>{type.name}</strong><span className="text-[var(--app-text-muted)]"> · {typeVariants.length} varian</span><p className="mt-1 line-clamp-2 text-[var(--app-text-muted)]">{typeVariants.map((item) => item.name).join(", ") || "Belum ada varian"}</p></div>)}</div> : <p className="mt-3 text-xs text-[var(--app-text-muted)]">Kategori langsung menjadi satu SKU tanpa tipe dan varian.</p>}
            </div>
          ))}
        </div>
      </div>

      <SectionPanel title="Kategori roti" description="Tingkat pertama, misalnya Roti Black Forest dan Roti Box." action={canEdit ? <Button appearance="primary" size="small" icon={<Add20Regular />} onClick={() => setCategoryDraft(emptyCategory(categories.length + 1))}>Tambah kategori</Button> : undefined} noPadding>
        <DataTable data={sortedCategories} columns={categoryColumns} searchPlaceholder="Cari kode atau nama kategori..." />
      </SectionPanel>
      <SectionPanel title="Tipe" description="Setiap tipe hanya berada di bawah satu kategori." action={canEdit && typeCategories.length ? <Button appearance="primary" size="small" icon={<Add20Regular />} onClick={() => setTypeDraft(emptyType(typeCategories[0].id, types.length + 1))}>Tambah tipe</Button> : undefined} noPadding>
        <DataTable data={sortedTypes} columns={typeColumns} searchPlaceholder="Cari tipe atau kategori induk..." />
      </SectionPanel>
      <SectionPanel title="Varian" description="Setiap varian hanya berada di bawah satu tipe; nama yang sama boleh digunakan pada tipe berbeda." action={canEdit && variantTypes.length ? <Button appearance="primary" size="small" icon={<Add20Regular />} onClick={() => setVariantDraft(emptyVariant(variantTypes[0].id, variants.length + 1))}>Tambah varian</Button> : undefined} noPadding>
        <DataTable data={sortedVariants} columns={variantColumns} searchPlaceholder="Cari varian, tipe, kategori, atau deskripsi..." />
      </SectionPanel>

      <Dialog open={Boolean(categoryDraft)} onOpenChange={(_, data) => !data.open && setCategoryDraft(null)}><DialogSurface><DialogBody><DialogTitle>{categoryDraft?.id ? "Kelola kategori" : "Tambah kategori"}</DialogTitle><DialogContent className="space-y-4">
        <div className="grid gap-3 sm:grid-cols-2"><Field label="Kode" required><Input value={categoryDraft?.code ?? ""} onChange={(_, data) => setCategoryDraft((current) => current ? { ...current, code: data.value } : current)} /></Field><Field label="Urutan"><Input type="number" min="0" value={String(categoryDraft?.sortOrder ?? 0)} onChange={(_, data) => setCategoryDraft((current) => current ? { ...current, sortOrder: Number(data.value) || 0 } : current)} /></Field></div>
        <Field label="Nama kategori" required><Input value={categoryDraft?.name ?? ""} onChange={(_, data) => setCategoryDraft((current) => current ? { ...current, name: data.value } : current)} /></Field>
        <div className="flex flex-wrap gap-5"><Checkbox checked={categoryDraft?.requiresType ?? false} label="Mewajibkan tipe" onChange={(_, data) => setCategoryDraft((current) => current ? { ...current, requiresType: Boolean(data.checked), requiresVariant: Boolean(data.checked) ? current.requiresVariant : false } : current)} /><Checkbox checked={categoryDraft?.requiresVariant ?? false} disabled={!categoryDraft?.requiresType} label="Mewajibkan varian" onChange={(_, data) => setCategoryDraft((current) => current ? { ...current, requiresVariant: Boolean(data.checked) } : current)} /><Checkbox checked={categoryDraft?.isActive ?? false} label="Status aktif" onChange={(_, data) => setCategoryDraft((current) => current ? { ...current, isActive: Boolean(data.checked) } : current)} /></div>
      </DialogContent><DialogActions><Button appearance="secondary" onClick={() => setCategoryDraft(null)}>Batal</Button><Button appearance="primary" onClick={persistCategory}>Simpan</Button></DialogActions></DialogBody></DialogSurface></Dialog>

      <Dialog open={Boolean(typeDraft)} onOpenChange={(_, data) => !data.open && setTypeDraft(null)}><DialogSurface><DialogBody><DialogTitle>{typeDraft?.id ? "Kelola tipe" : "Tambah tipe"}</DialogTitle><DialogContent className="space-y-4">
        <Field label="Kategori induk" required><Select value={typeDraft?.categoryId ?? ""} onChange={(event) => setTypeDraft((current) => current ? { ...current, categoryId: event.target.value } : current)}>{typeCategories.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</Select></Field>
        <div className="grid gap-3 sm:grid-cols-2"><Field label="Kode" required><Input value={typeDraft?.code ?? ""} onChange={(_, data) => setTypeDraft((current) => current ? { ...current, code: data.value } : current)} /></Field><Field label="Urutan"><Input type="number" min="0" value={String(typeDraft?.sortOrder ?? 0)} onChange={(_, data) => setTypeDraft((current) => current ? { ...current, sortOrder: Number(data.value) || 0 } : current)} /></Field></div>
        <Field label="Nama tipe" required><Input value={typeDraft?.name ?? ""} onChange={(_, data) => setTypeDraft((current) => current ? { ...current, name: data.value } : current)} /></Field>
        <Checkbox checked={typeDraft?.isActive ?? false} label="Status aktif" onChange={(_, data) => setTypeDraft((current) => current ? { ...current, isActive: Boolean(data.checked) } : current)} />
      </DialogContent><DialogActions><Button appearance="secondary" onClick={() => setTypeDraft(null)}>Batal</Button><Button appearance="primary" onClick={persistType}>Simpan</Button></DialogActions></DialogBody></DialogSurface></Dialog>

      <Dialog open={Boolean(variantDraft)} onOpenChange={(_, data) => !data.open && setVariantDraft(null)}><DialogSurface><DialogBody><DialogTitle>{variantDraft?.id ? "Kelola varian" : "Tambah varian"}</DialogTitle><DialogContent className="space-y-4">
        <Field label="Tipe induk" required><Select value={variantDraft?.typeId ?? ""} onChange={(event) => setVariantDraft((current) => current ? { ...current, typeId: event.target.value } : current)}>{variantTypes.map((item) => { const category = categories.find((candidate) => candidate.id === item.categoryId); return <option key={item.id} value={item.id}>{category?.name} / {item.name}</option>; })}</Select></Field>
        <div className="grid gap-3 sm:grid-cols-2"><Field label="Kode" required><Input value={variantDraft?.code ?? ""} onChange={(_, data) => setVariantDraft((current) => current ? { ...current, code: data.value } : current)} /></Field><Field label="Urutan"><Input type="number" min="0" value={String(variantDraft?.sortOrder ?? 0)} onChange={(_, data) => setVariantDraft((current) => current ? { ...current, sortOrder: Number(data.value) || 0 } : current)} /></Field></div>
        <Field label="Nama varian" required><Input value={variantDraft?.name ?? ""} onChange={(_, data) => setVariantDraft((current) => current ? { ...current, name: data.value } : current)} /></Field>
        <Field label="Deskripsi"><Textarea resize="vertical" value={variantDraft?.description ?? ""} onChange={(_, data) => setVariantDraft((current) => current ? { ...current, description: data.value } : current)} /></Field>
        <Checkbox checked={variantDraft?.isActive ?? false} label="Status aktif" onChange={(_, data) => setVariantDraft((current) => current ? { ...current, isActive: Boolean(data.checked) } : current)} />
      </DialogContent><DialogActions><Button appearance="secondary" onClick={() => setVariantDraft(null)}>Batal</Button><Button appearance="primary" onClick={persistVariant}>Simpan</Button></DialogActions></DialogBody></DialogSurface></Dialog>
    </div>
  );
}
