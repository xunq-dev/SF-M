import { LEGACY_IDB_DB_NAME, LEGACY_IDB_KEYS } from "../app/legacySynapseOriginal";

const DB_NAME = "synapse-original-shell-media";
const DB_VERSION = 1;
const STORE = "kv";

export const VIDEO_KEY_MAIN = "backgroundVideo";
export const VIDEO_KEY_MAIN_SYNAPSE_ORIGINAL = "backgroundVideoSynapseOriginal";
export const VIDEO_KEY_MAIN_SYNAPSE_X = "backgroundVideoSynapseX";

export const IMAGE_KEY_MAIN = "backgroundImage";
export const IMAGE_KEY_MAIN_SYNAPSE_ORIGINAL = "backgroundImageSynapseOriginal";
export const IMAGE_KEY_MAIN_SYNAPSE_X = "backgroundImageSynapseX";

export const IMAGE_KEY_INIT = "initBackgroundImage";
export const IMAGE_KEY_INIT_SYNAPSE_ORIGINAL = "initBackgroundImageSynapseOriginal";
export const IMAGE_KEY_INIT_SYNAPSE_X = "initBackgroundImageSynapseX";

export const VIDEO_KEY_INIT = "initBackgroundVideo";
export const VIDEO_KEY_INIT_SYNAPSE_ORIGINAL = "initBackgroundVideoSynapseOriginal";
export const VIDEO_KEY_INIT_SYNAPSE_X = "initBackgroundVideoSynapseX";

export const IMAGE_KEY_CONFIRMATION = "confirmationBackgroundImage";

export const VIDEO_KEY_V3 = "v3BackgroundVideo";
export const IMAGE_KEY_V3 = "v3BackgroundImage";
export const IMAGE_KEY_V3_LOADING = "v3LoadingImage";

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onerror = () => reject(req.error ?? new Error("IDB open failed"));
    req.onsuccess = () => resolve(req.result);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE)) {
        db.createObjectStore(STORE);
      }
    };
  });
}

async function idbPutBlob(key: string, blob: Blob): Promise<void> {
  const db = await openDb();
  try {
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE, "readwrite");
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error ?? new Error("IDB transaction failed"));
      tx.objectStore(STORE).put(blob, key);
    });
  } finally {
    db.close();
  }
}

function openNamedDb(name: string): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(name, DB_VERSION);
    req.onerror = () => reject(req.error ?? new Error("IDB open failed"));
    req.onsuccess = () => resolve(req.result);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE)) {
        db.createObjectStore(STORE);
      }
    };
  });
}

async function idbGetBlobFromDb(dbName: string, key: string): Promise<Blob | undefined> {
  const db = await openNamedDb(dbName);
  try {
    return await new Promise((resolve, reject) => {
      const tx = db.transaction(STORE, "readonly");
      tx.onerror = () => reject(tx.error ?? new Error("IDB read failed"));
      const req = tx.objectStore(STORE).get(key);
      req.onsuccess = () => resolve(req.result as Blob | undefined);
    });
  } finally {
    db.close();
  }
}

async function idbGetBlob(key: string, legacyKey?: string): Promise<Blob | undefined> {
  const db = await openDb();
  try {
    const hit = await new Promise<Blob | undefined>((resolve, reject) => {
      const tx = db.transaction(STORE, "readonly");
      tx.onerror = () => reject(tx.error ?? new Error("IDB read failed"));
      const req = tx.objectStore(STORE).get(key);
      req.onsuccess = () => resolve(req.result as Blob | undefined);
    });
    if (hit) return hit;
  } finally {
    db.close();
  }
  if (!legacyKey) return undefined;
  const legacy = await idbGetBlobFromDb(LEGACY_IDB_DB_NAME, legacyKey);
  if (legacy) {
    await idbPutBlob(key, legacy);
    return legacy;
  }
  return undefined;
}

async function idbDeleteBlob(key: string): Promise<void> {
  const db = await openDb();
  try {
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE, "readwrite");
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error ?? new Error("IDB delete failed"));
      tx.objectStore(STORE).delete(key);
    });
  } finally {
    db.close();
  }
}

/** Main shell background video */
export async function idbPutBackgroundVideo(blob: Blob, shell: "default" | "synapseOriginal" | "synapseX" = "default"): Promise<void> {
  const key = shell === "synapseOriginal" ? VIDEO_KEY_MAIN_SYNAPSE_ORIGINAL : shell === "synapseX" ? VIDEO_KEY_MAIN_SYNAPSE_X : VIDEO_KEY_MAIN;
  return idbPutBlob(key, blob);
}

export async function idbGetBackgroundVideo(shell: "default" | "synapseOriginal" | "synapseX" = "default"): Promise<Blob | undefined> {
  const key = shell === "synapseOriginal" ? VIDEO_KEY_MAIN_SYNAPSE_ORIGINAL : shell === "synapseX" ? VIDEO_KEY_MAIN_SYNAPSE_X : VIDEO_KEY_MAIN;
  const legacy = shell === "synapseOriginal" ? LEGACY_IDB_KEYS.videoMain : undefined;
  return idbGetBlob(key, legacy);
}

export async function idbDeleteBackgroundVideo(shell: "default" | "synapseOriginal" | "synapseX" = "default"): Promise<void> {
  const key = shell === "synapseOriginal" ? VIDEO_KEY_MAIN_SYNAPSE_ORIGINAL : shell === "synapseX" ? VIDEO_KEY_MAIN_SYNAPSE_X : VIDEO_KEY_MAIN;
  return idbDeleteBlob(key);
}

/** Init / loading screen background video */
export async function idbPutInitBackgroundVideo(blob: Blob, shell: "default" | "synapseOriginal" | "synapseX" = "default"): Promise<void> {
  const key = shell === "synapseOriginal" ? VIDEO_KEY_INIT_SYNAPSE_ORIGINAL : shell === "synapseX" ? VIDEO_KEY_INIT_SYNAPSE_X : VIDEO_KEY_INIT;
  return idbPutBlob(key, blob);
}

export async function idbGetInitBackgroundVideo(shell: "default" | "synapseOriginal" | "synapseX" = "default"): Promise<Blob | undefined> {
  const key = shell === "synapseOriginal" ? VIDEO_KEY_INIT_SYNAPSE_ORIGINAL : shell === "synapseX" ? VIDEO_KEY_INIT_SYNAPSE_X : VIDEO_KEY_INIT;
  const legacy = shell === "synapseOriginal" ? LEGACY_IDB_KEYS.videoInit : undefined;
  return idbGetBlob(key, legacy);
}

export async function idbDeleteInitBackgroundVideo(shell: "default" | "synapseOriginal" | "synapseX" = "default"): Promise<void> {
  const key = shell === "synapseOriginal" ? VIDEO_KEY_INIT_SYNAPSE_ORIGINAL : shell === "synapseX" ? VIDEO_KEY_INIT_SYNAPSE_X : VIDEO_KEY_INIT;
  return idbDeleteBlob(key);
}

/** Main shell background image (blob; larger than localStorage data URLs) */
export async function idbPutBackgroundImage(blob: Blob, shell: "default" | "synapseOriginal" | "synapseX" = "default"): Promise<void> {
  const key = shell === "synapseOriginal" ? IMAGE_KEY_MAIN_SYNAPSE_ORIGINAL : shell === "synapseX" ? IMAGE_KEY_MAIN_SYNAPSE_X : IMAGE_KEY_MAIN;
  return idbPutBlob(key, blob);
}

export async function idbGetBackgroundImage(shell: "default" | "synapseOriginal" | "synapseX" = "default"): Promise<Blob | undefined> {
  const key = shell === "synapseOriginal" ? IMAGE_KEY_MAIN_SYNAPSE_ORIGINAL : shell === "synapseX" ? IMAGE_KEY_MAIN_SYNAPSE_X : IMAGE_KEY_MAIN;
  const legacy = shell === "synapseOriginal" ? LEGACY_IDB_KEYS.imageMain : undefined;
  return idbGetBlob(key, legacy);
}

export async function idbDeleteBackgroundImage(shell: "default" | "synapseOriginal" | "synapseX" = "default"): Promise<void> {
  const key = shell === "synapseOriginal" ? IMAGE_KEY_MAIN_SYNAPSE_ORIGINAL : shell === "synapseX" ? IMAGE_KEY_MAIN_SYNAPSE_X : IMAGE_KEY_MAIN;
  return idbDeleteBlob(key);
}

/** Init / loading screen background image */
export async function idbPutInitBackgroundImage(blob: Blob, shell: "default" | "synapseOriginal" | "synapseX" = "default"): Promise<void> {
  const key = shell === "synapseOriginal" ? IMAGE_KEY_INIT_SYNAPSE_ORIGINAL : shell === "synapseX" ? IMAGE_KEY_INIT_SYNAPSE_X : IMAGE_KEY_INIT;
  return idbPutBlob(key, blob);
}

export async function idbGetInitBackgroundImage(shell: "default" | "synapseOriginal" | "synapseX" = "default"): Promise<Blob | undefined> {
  const key = shell === "synapseOriginal" ? IMAGE_KEY_INIT_SYNAPSE_ORIGINAL : shell === "synapseX" ? IMAGE_KEY_INIT_SYNAPSE_X : IMAGE_KEY_INIT;
  const legacy = shell === "synapseOriginal" ? LEGACY_IDB_KEYS.imageInit : undefined;
  return idbGetBlob(key, legacy);
}

export async function idbDeleteInitBackgroundImage(shell: "default" | "synapseOriginal" | "synapseX" = "default"): Promise<void> {
  const key = shell === "synapseOriginal" ? IMAGE_KEY_INIT_SYNAPSE_ORIGINAL : shell === "synapseX" ? IMAGE_KEY_INIT_SYNAPSE_X : IMAGE_KEY_INIT;
  return idbDeleteBlob(key);
}

/** Confirmation dialog background image (Clear / close-all prompts) */
export async function idbPutConfirmationBackgroundImage(blob: Blob): Promise<void> {
  return idbPutBlob(IMAGE_KEY_CONFIRMATION, blob);
}

export async function idbGetConfirmationBackgroundImage(): Promise<Blob | undefined> {
  return idbGetBlob(IMAGE_KEY_CONFIRMATION);
}

export async function idbDeleteConfirmationBackgroundImage(): Promise<void> {
  return idbDeleteBlob(IMAGE_KEY_CONFIRMATION);
}

/** V3 shell background video */
export async function idbPutV3BackgroundVideo(blob: Blob): Promise<void> {
  return idbPutBlob(VIDEO_KEY_V3, blob);
}

export async function idbGetV3BackgroundVideo(): Promise<Blob | undefined> {
  return idbGetBlob(VIDEO_KEY_V3);
}

export async function idbDeleteV3BackgroundVideo(): Promise<void> {
  return idbDeleteBlob(VIDEO_KEY_V3);
}

/** V3 shell background image (blob) */
export async function idbPutV3BackgroundImage(blob: Blob): Promise<void> {
  return idbPutBlob(IMAGE_KEY_V3, blob);
}

export async function idbGetV3BackgroundImage(): Promise<Blob | undefined> {
  return idbGetBlob(IMAGE_KEY_V3);
}

export async function idbDeleteV3BackgroundImage(): Promise<void> {
  return idbDeleteBlob(IMAGE_KEY_V3);
}

/** V3 startup loading splash image (blob) */
export async function idbPutV3LoadingImage(blob: Blob): Promise<void> {
  return idbPutBlob(IMAGE_KEY_V3_LOADING, blob);
}

export async function idbGetV3LoadingImage(): Promise<Blob | undefined> {
  return idbGetBlob(IMAGE_KEY_V3_LOADING);
}

export async function idbDeleteV3LoadingImage(): Promise<void> {
  return idbDeleteBlob(IMAGE_KEY_V3_LOADING);
}
