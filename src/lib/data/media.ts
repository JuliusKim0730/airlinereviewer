"use client";

import { useEffect, useState } from "react";

// Local media store for development mode. Blobs live in IndexedDB and are
// referenced as "idb:<key>"; real deployments upload to Supabase Storage instead.

const DB_NAME = "tview-media";
const STORE = "blobs";

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => req.result.createObjectStore(STORE);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function tx<T>(mode: IDBTransactionMode, run: (store: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const req = run(db.transaction(STORE, mode).objectStore(STORE));
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export async function putLocalMedia(blob: Blob): Promise<string> {
  const key = crypto.randomUUID();
  await tx("readwrite", (s) => s.put(blob, key));
  return `idb:${key}`;
}

export async function deleteLocalMedia(url: string): Promise<void> {
  if (url.startsWith("idb:")) await tx("readwrite", (s) => s.delete(url.slice(4)));
}

/** Resolve a stored media reference to something an <img>/<video> can show. */
export function useMediaUrl(url: string | null): string | null {
  const [resolved, setResolved] = useState<{ key: string; src: string } | null>(null);
  useEffect(() => {
    if (!url?.startsWith("idb:")) return;
    let objectUrl: string | null = null;
    let alive = true;
    tx<Blob | undefined>("readonly", (s) => s.get(url.slice(4))).then((blob) => {
      if (!alive || !blob) return;
      objectUrl = URL.createObjectURL(blob);
      setResolved({ key: url, src: objectUrl });
    });
    return () => {
      alive = false;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [url]);
  if (!url) return null;
  if (!url.startsWith("idb:")) return url;
  return resolved?.key === url ? resolved.src : null;
}

/** Shrink a photo before upload: longest side 1280px, JPEG. Videos pass through. */
export async function prepareImage(file: Blob, maxSide = 1280): Promise<Blob> {
  if (!file.type.startsWith("image/")) return file;
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, maxSide / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  canvas.getContext("2d")!.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  return new Promise((resolve) => canvas.toBlob((b) => resolve(b ?? file), "image/jpeg", 0.82));
}
