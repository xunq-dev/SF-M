import { getUiFontStack } from "@/ui/uiFontStacks";

export type LogoMode = "image" | "text";

export type TextLogoStyle = {
  text: string;
  color: string;
  fontId: string;
  sizePx: number;
  weight: number;
  letterSpacing: number;
};

export type TopBarBrandMarkProps = {
  mode: LogoMode;
  imageSrc?: string;
  iconMark?: boolean;
  textLogo?: TextLogoStyle;
  alt?: string;
  className?: string;
  frameStyle?: React.CSSProperties;
};

export default function TopBarBrandMark({
  mode,
  imageSrc,
  iconMark = false,
  textLogo,
  alt = "Brand",
  className = "w-full h-full object-contain object-left",
  frameStyle,
}: TopBarBrandMarkProps) {
  if (mode === "text" && textLogo) {
    return (
      <span
        className="block min-w-0 max-w-full truncate leading-none"
        style={{
          color: textLogo.color,
          fontFamily: getUiFontStack(textLogo.fontId),
          fontSize: textLogo.sizePx,
          fontWeight: textLogo.weight,
          letterSpacing: textLogo.letterSpacing,
          ...frameStyle,
        }}
      >
        {textLogo.text}
      </span>
    );
  }

  if (!imageSrc) return null;

  return (
    <img
      alt={alt}
      src={imageSrc}
      className={iconMark ? `${className} object-contain object-left` : className}
      draggable={false}
    />
  );
}
