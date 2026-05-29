import {
  idbDeleteV3BackgroundImage,
  idbDeleteV3BackgroundVideo,
  idbGetV3BackgroundImage,
  idbGetV3BackgroundVideo,
  idbPutV3BackgroundImage,
  idbPutV3BackgroundVideo,
} from "@/ui/idbVideo";
import {
  readV3Theme,
  writeV3Theme,
  type V3ThemeOverlay,
  type V3ThemeState,
} from "./v3Theme";

const MAX_IMAGE_BYTES = 1_500_000;
const MAX_VIDEO_BYTES = 40_000_000;

let cachedVideoUrl: string | null = null;
let cachedImageUrl: string | null = null;

function revokeCached(): void {
  if (cachedVideoUrl) {
    URL.revokeObjectURL(cachedVideoUrl);
    cachedVideoUrl = null;
  }
  if (cachedImageUrl) {
    URL.revokeObjectURL(cachedImageUrl);
    cachedImageUrl = null;
  }
}

export function v3OverlayMediaFilter(overlay: V3ThemeOverlay): string | undefined {
  const parts: string[] = [];
  if (overlay.mediaBlurPx > 0) parts.push(`blur(${overlay.mediaBlurPx}px)`);
  if (overlay.mediaSaturate !== 1) parts.push(`saturate(${overlay.mediaSaturate})`);
  return parts.length ? parts.join(" ") : undefined;
}

async function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(String(r.result));
    r.onerror = () => reject(r.error ?? new Error("read failed"));
    r.readAsDataURL(file);
  });
}

export async function setV3BackgroundImageFromFile(
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
    await idbPutV3BackgroundImage(file);
    await idbDeleteV3BackgroundVideo();
    const theme = writeV3Theme({
      overlay: {
        backgroundMode: "image",
        imageDataUrl: null,
        hasStoredBackgroundImage: true,
        backgroundImageFilename: file.name,
        hasStoredVideo: false,
        videoFilename: null,
      },
    });
    return { ok: true, theme };
  }
  const dataUrl = await fileToDataUrl(file);
  await idbDeleteV3BackgroundImage();
  await idbDeleteV3BackgroundVideo();
  const theme = writeV3Theme({
    overlay: {
      backgroundMode: "image",
      imageDataUrl: dataUrl,
      hasStoredBackgroundImage: false,
      backgroundImageFilename: file.name,
      hasStoredVideo: false,
      videoFilename: null,
    },
  });
  return { ok: true, theme };
}

export async function setV3BackgroundVideoFromFile(
  file: File,
): Promise<{ ok: true; theme: V3ThemeState } | { ok: false; error: string }> {
  if (!file.type.startsWith("video/")) {
    return { ok: false, error: "Choose a video file." };
  }
  if (file.size > MAX_VIDEO_BYTES) {
    return { ok: false, error: "Video too large (max 40MB)." };
  }
  revokeCached();
  await idbDeleteV3BackgroundImage();
  await idbPutV3BackgroundVideo(file);
  const theme = writeV3Theme({
    overlay: {
      backgroundMode: "video",
      imageDataUrl: null,
      hasStoredBackgroundImage: false,
      backgroundImageFilename: null,
      hasStoredVideo: true,
      videoFilename: file.name,
    },
  });
  return { ok: true, theme };
}

export function clearV3BackgroundMedia(): V3ThemeState {
  revokeCached();
  void idbDeleteV3BackgroundImage();
  void idbDeleteV3BackgroundVideo();
  return writeV3Theme({
    overlay: {
      backgroundMode: "none",
      imageDataUrl: null,
      hasStoredBackgroundImage: false,
      backgroundImageFilename: null,
      hasStoredVideo: false,
      videoFilename: null,
    },
  });
}

/** Resolve wallpaper URL for rendering (image data URL, IDB blob URL, or null). */
export async function resolveV3BackgroundMediaUrl(
  overlay: V3ThemeOverlay,
): Promise<string | null> {
  if (overlay.backgroundMode === "none") return null;
  if (overlay.backgroundMode === "image") {
    if (overlay.imageDataUrl) return overlay.imageDataUrl;
    if (overlay.hasStoredBackgroundImage) {
      if (cachedImageUrl) return cachedImageUrl;
      const blob = await idbGetV3BackgroundImage();
      if (!blob) return null;
      cachedImageUrl = URL.createObjectURL(blob);
      return cachedImageUrl;
    }
    return null;
  }
  if (overlay.backgroundMode === "video" && overlay.hasStoredVideo) {
    if (cachedVideoUrl) return cachedVideoUrl;
    const blob = await idbGetV3BackgroundVideo();
    if (!blob) return null;
    cachedVideoUrl = URL.createObjectURL(blob);
    return cachedVideoUrl;
  }
  return null;
}

export function invalidateV3BackgroundMediaCache(): void {
  revokeCached();
}

/** Whether overlay has visible media configured. */
export function v3HasBackgroundMedia(overlay: V3ThemeOverlay): boolean {
  if (overlay.backgroundMode === "image") {
    return !!overlay.imageDataUrl || overlay.hasStoredBackgroundImage;
  }
  if (overlay.backgroundMode === "video") return overlay.hasStoredVideo;
  return false;
}
