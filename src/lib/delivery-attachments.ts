import type { DeliveryAttachment } from "@/lib/types";

const databaseName = "erp-hanan-delivery-attachments";
const storeName = "attachments";

type StoredAttachment = {
  key: string;
  blob: Blob;
};

const openDatabase = () => new Promise<IDBDatabase>((resolve, reject) => {
  const request = window.indexedDB.open(databaseName, 1);
  request.onupgradeneeded = () => {
    const database = request.result;
    if (!database.objectStoreNames.contains(storeName)) database.createObjectStore(storeName, { keyPath: "key" });
  };
  request.onsuccess = () => resolve(request.result);
  request.onerror = () => reject(request.error ?? new Error("Penyimpanan lampiran tidak tersedia."));
});

const putBlob = async (key: string, blob: Blob) => {
  const database = await openDatabase();
  await new Promise<void>((resolve, reject) => {
    const transaction = database.transaction(storeName, "readwrite");
    transaction.objectStore(storeName).put({ key, blob } satisfies StoredAttachment);
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error ?? new Error("Lampiran gagal disimpan."));
  });
  database.close();
};

const getBlob = async (key: string) => {
  const database = await openDatabase();
  const stored = await new Promise<StoredAttachment | undefined>((resolve, reject) => {
    const request = database.transaction(storeName, "readonly").objectStore(storeName).get(key);
    request.onsuccess = () => resolve(request.result as StoredAttachment | undefined);
    request.onerror = () => reject(request.error ?? new Error("Lampiran gagal dibaca."));
  });
  database.close();
  return stored?.blob;
};

export const saveDeliveryAttachments = async (saleId: string, files: File[]): Promise<DeliveryAttachment[]> => {
  if (!window.indexedDB) throw new Error("Browser ini tidak mendukung penyimpanan lampiran lokal.");
  const uploadedAt = new Date().toISOString();
  return Promise.all(files.map(async (file, index) => {
    const id = `delivery-file-${crypto.randomUUID()}`;
    const storageKey = `delivery/${saleId}/${id}`;
    await putBlob(storageKey, file);
    return { id, name: file.name, mimeType: file.type || "application/octet-stream", size: file.size, uploadedAt, storageKey };
  }));
};

export const downloadDeliveryAttachment = async (attachment: DeliveryAttachment) => {
  if (!attachment.storageKey) throw new Error("Lampiran ini berasal dari data lama dan tidak memiliki berkas tersimpan.");
  const blob = await getBlob(attachment.storageKey);
  if (!blob) throw new Error("Berkas tidak ditemukan pada perangkat ini.");
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = attachment.name;
  anchor.click();
  URL.revokeObjectURL(url);
};
