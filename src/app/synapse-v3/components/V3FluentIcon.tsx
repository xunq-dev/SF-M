import {
  V3_HOLLYWOOD_FLUENT_ICONS,
  type V3HollywoodFluentIconName,
} from "../remake-assets/v3HollywoodFluentIcons";

type V3FluentIconProps = {
  name: V3HollywoodFluentIconName;
  size?: number;
  color?: string;
  className?: string;
};

export function V3FluentIcon({
  name,
  size = 20,
  color = "currentColor",
  className,
}: V3FluentIconProps) {
  const icon = V3_HOLLYWOOD_FLUENT_ICONS[name];

  return (
    <svg
      viewBox={`0 0 ${icon.width} ${icon.height}`}
      width={size}
      height={size}
      fill={color}
      className={className}
      aria-hidden
    >
      {icon.paths.map((d) => (
        <path key={d.slice(0, 24)} d={d} />
      ))}
    </svg>
  );
}
