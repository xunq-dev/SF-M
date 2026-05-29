import {
  idbDeleteV3LoadingImage,
  idbGetV3LoadingImage,
  idbPutV3LoadingImage,
} from "@/ui/idbVideo";
import {
  writeV3Theme,
  V3_DEFAULT_LOADING_IMAGE_URL,
  type V3ThemeLoading,
  type V3ThemeState,
} from "./v3Theme";

const MAX_IMAGE_BYTES = 1_500_000;

let cachedLoadingUrl: string | null = null;

function revokeCached(): void {
  if (cachedLoadingUrl) {
    URL.revokeObjectURL(cachedLoadingUrl);
    cachedLoadingUrl = null;
  }
}

async function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(String(r.result));
    r.onerror = () => reject(r.error ?? new Error("read failed"));
    r.readAsDataURL(file);
  });
}

export function v3HasCustomLoadingImage(loading: V3ThemeLoading): boolean {
  if (loading.hasStoredLoadingImage) return true;
  if (!loading.imageDataUrl) return false;
  return loading.imageDataUrl !== V3_DEFAULT_LOADING_IMAGE_URL;
}

export async function setV3LoadingImageFromFile(
  file: File,
): Promise<{ ok: true; theme: V3ThemeState } | { ok: false; error: string }> {
  if (!file.type.startsWith("image/")) {
    return { ok: false, error: "Choose an image file." };
  }
  if (file.size > MAX_IMAGE_BYTES) {
    return { ok: false, error: "Image too large (max 1.5MB for inline storage)." };
  }
  revokeCached();
  if (file.size > 400_000) {
    await idbPutV3LoadingImage(file);
    const theme = writeV3Theme({
      loading: {
        imageDataUrl: null,
        hasStoredLoadingImage: true,
        loadingImageFilename: file.name,
      },
    });
    return { ok: true, theme };
  }
  const dataUrl = await fileToDataUrl(file);
  await idbDeleteV3LoadingImage();
  const theme = writeV3Theme({
    loading: {
      imageDataUrl: dataUrl,
      hasStoredLoadingImage: false,
      loadingImageFilename: file.name,
    },
  });
  return { ok: true, theme };
}

export function resetV3LoadingImage(): V3ThemeState {
  revokeCached();
  void idbDeleteV3LoadingImage();
  return writeV3Theme({
    loading: {
      imageDataUrl: V3_DEFAULT_LOADING_IMAGE_URL,
      hasStoredLoadingImage: false,
      loadingImageFilename: null,
    },
  });
}

export async function resolveV3LoadingImageUrl(loading: V3ThemeLoading): Promise<string> {
  if (loading.imageDataUrl) return loading.imageDataUrl;
  if (loading.hasStoredLoadingImage) {
    if (cachedLoadingUrl) return cachedLoadingUrl;
    const blob = await idbGetV3LoadingImage();
    if (blob) {
      cachedLoadingUrl = URL.createObjectURL(blob);
      return cachedLoadingUrl;
    }
  }
  return V3_DEFAULT_LOADING_IMAGE_URL;
}

export function invalidateV3LoadingImageCache(): void {
  revokeCached();
}
