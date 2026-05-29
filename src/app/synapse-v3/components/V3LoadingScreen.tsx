import { useEffect, useState } from "react";
import TopBarBrandMark from "@/app/components/TopBarBrandMark";
import { isTopBarIconMarkPreset, resolveTopBarLogoUrl } from "@/branding";
import imgLogo from "../remake-assets/v3-logo.png";
import {
  invalidateV3LoadingImageCache,
  resolveV3LoadingImageUrl,
} from "../v3ThemeLoading";
import {
  useV3Theme,
  V3_DEFAULT_LOADING_IMAGE_URL,
  V3_DEFAULT_TOP_BAR_LOGO_PRESET,
  V3_THEME_CHANGED_EVENT,
  type V3ThemeBranding,
} from "../v3Theme";

function resolveV3BrandingLogoUrl(branding: V3ThemeBranding): string {
  if (branding.logoDataUrl) return branding.logoDataUrl;
  if (branding.topBarLogoPreset === V3_DEFAULT_TOP_BAR_LOGO_PRESET) return imgLogo;
  return resolveTopBarLogoUrl({
    logoDataUrl: null,
    topBarLogoPreset: branding.topBarLogoPreset,
  });
}

export function V3LoadingScreen() {
  const theme = useV3Theme();
  const [bgUrl, setBgUrl] = useState(V3_DEFAULT_LOADING_IMAGE_URL);
  const branding = theme.branding;
  const logoSrc = resolveV3BrandingLogoUrl(branding);
  const logoIconMark =
    branding.logoMode === "image" &&
    !branding.logoDataUrl &&
    branding.topBarLogoPreset !== V3_DEFAULT_TOP_BAR_LOGO_PRESET &&
    isTopBarIconMarkPreset(branding.topBarLogoPreset);
  const textLogo = {
    text: branding.logoText,
    color: branding.logoTextColor,
    fontId: branding.logoTextFontId,
    sizePx: branding.logoTextSizePx,
    weight: branding.logoTextWeight,
    letterSpacing: branding.logoTextLetterSpacing,
  };

  useEffect(() => {
    let cancelled = false;
    const load = () => {
      void resolveV3LoadingImageUrl(theme.loading).then((url) => {
        if (!cancelled) setBgUrl(url);
      });
    };
    load();
    const onThemeChange = () => {
      invalidateV3LoadingImageCache();
      load();
    };
    window.addEventListener(V3_THEME_CHANGED_EVENT, onThemeChange);
    return () => {
      cancelled = true;
      window.removeEventListener(V3_THEME_CHANGED_EVENT, onThemeChange);
    };
  }, [theme.loading]);

  return (
    <div className="size-full relative">
      <img
        alt=""
        src={bgUrl}
        className="absolute inset-0 w-full h-full object-cover rounded-[7px] pointer-events-none"
        draggable={false}
      />
      <div
        className="absolute inset-0 rounded-[7px] border pointer-events-none"
        style={{
          borderColor: "var(--v3-shell-border, #2b2d2c)",
          boxShadow: "var(--v3-shell-edge-shadow)",
        }}
      />

      <div
        className="absolute flex items-center justify-center"
        style={{
          left:
            branding.logoMode === "text"
              ? "calc(50% - 90px)"
              : logoIconMark
                ? "calc(50% - 19px)"
                : "calc(50% - 90.5px)",
          top:
            branding.logoMode === "text"
              ? "calc(50% - 44px)"
              : logoIconMark
                ? "calc(50% - 48px)"
                : "calc(50% - 42.5px)",
          width: branding.logoMode === "text" ? 180 : logoIconMark ? 38 : 181,
          height: branding.logoMode === "text" ? 28 : logoIconMark ? 38 : 38,
          filter: "drop-shadow(0px 4px 8.5px rgba(0,0,0,0.43))",
        }}
      >
        <TopBarBrandMark
          mode={branding.logoMode}
          imageSrc={logoSrc}
          iconMark={logoIconMark}
          textLogo={textLogo}
          alt="SYNAPSE"
          className="w-full h-full object-contain pointer-events-none"
        />
      </div>

      <div
        className="absolute animate-spin"
        style={{
          left: "calc(50% - 14.5px)",
          top: "calc(50% + 12.5px)",
          width: 29,
          height: 29,
          borderRadius: "50%",
          border: "2px solid rgba(255,255,255,0.9)",
          borderTopColor: "#8E4B0C",
        }}
      />
    </div>
  );
}
