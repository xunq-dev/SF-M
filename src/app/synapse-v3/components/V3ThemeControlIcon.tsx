import {
  V3_THEME_CONTROL_VIEW_SIZE,
  v3ThemeControlPaths,
} from "../remake-assets/v3FreshIconPaths";

type V3ThemeControlIconProps = {
  size?: number;
  color?: string;
  className?: string;
};

export function V3ThemeControlIcon({
  size = 18,
  color = "var(--v3-topbar-nav-icon, #ffffff)",
  className,
}: V3ThemeControlIconProps) {
  return (
    <svg
      viewBox={`0 0 ${V3_THEME_CONTROL_VIEW_SIZE} ${V3_THEME_CONTROL_VIEW_SIZE}`}
      width={size}
      height={size}
      fill={color}
      aria-hidden
      className={className}
    >
      {v3ThemeControlPaths.map((d) => (
        <path key={d.slice(0, 24)} d={d} fillRule="nonzero" />
      ))}
    </svg>
  );
}

export { v3ThemeControlPaths, V3_THEME_CONTROL_VIEW_SIZE };
