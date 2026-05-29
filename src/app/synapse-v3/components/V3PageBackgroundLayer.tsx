import { useEffect, useState, type CSSProperties } from "react";
import {
  invalidateV3BackgroundMediaCache,
  resolveV3BackgroundMediaUrl,
  v3HasBackgroundMedia,
  v3OverlayMediaFilter,
} from "../v3ThemeBackground";
import { useV3Theme, V3_THEME_CHANGED_EVENT } from "../v3Theme";

/**
 * Shell-wide wallpaper (image or video) behind all V3 pages.
 * Matches Synapse X overlay layering (behind vs on top).
 */
export function V3PageBackgroundLayer() {
  const theme = useV3Theme();
  const { overlay, shell } = theme;
  const [mediaUrl, setMediaUrl] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      if (!v3HasBackgroundMedia(overlay)) {
        setMediaUrl(null);
        return;
      }
      const url = await resolveV3BackgroundMediaUrl(overlay);
      if (!cancelled) setMediaUrl(url);
    };
    void load();
    return () => {
      cancelled = true;
    };
  }, [overlay]);

  useEffect(() => {
    const onChange = () => {
      invalidateV3BackgroundMediaCache();
      void resolveV3BackgroundMediaUrl(theme.overlay).then(setMediaUrl);
    };
    window.addEventListener(V3_THEME_CHANGED_EVENT, onChange);
    return () => window.removeEventListener(V3_THEME_CHANGED_EVENT, onChange);
  }, [theme.overlay]);

  if (!mediaUrl || overlay.backgroundMode === "none") return null;

  const isTop = overlay.mode === "top";
  const opacity = isTop ? Math.min(overlay.opacity, 0.7) : overlay.opacity;
  const filter = v3OverlayMediaFilter(overlay);
  const position = `${overlay.position.x}% ${overlay.position.y}%`;

  const mediaStyle: CSSProperties = {
    objectFit: "cover",
    objectPosition: position,
    filter: filter !== "none" ? filter : undefined,
    width: "100%",
    height: "100%",
  };

  return (
    <>
      {!isTop && overlay.pageScrimOpacity > 0 && (
        <div
          className="pointer-events-none absolute inset-0 z-[2]"
          style={{
            backgroundColor: shell.pageBg,
            opacity: overlay.pageScrimOpacity,
          }}
          aria-hidden
        />
      )}
      {overlay.backgroundMode === "video" ? (
        <video
          className={`pointer-events-none absolute inset-0 ${isTop ? "z-[999]" : "z-[1]"}`}
          style={{ ...mediaStyle, opacity }}
          src={mediaUrl}
          autoPlay
          loop
          muted
          playsInline
          aria-hidden
        />
      ) : (
        <img
          className={`pointer-events-none absolute inset-0 ${isTop ? "z-[999]" : "z-[1]"}`}
          style={{ ...mediaStyle, opacity }}
          src={mediaUrl}
          alt=""
          draggable={false}
          aria-hidden
        />
      )}
    </>
  );
}
