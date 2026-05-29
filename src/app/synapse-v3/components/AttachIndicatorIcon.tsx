import { V3_HOLLYWOOD_FLUENT_ICONS } from "../remake-assets/v3HollywoodFluentIcons";

type AttachIndicatorIconProps = {
  connected: boolean;
  onColor: string;
  offColor: string;
  size?: number;
};

const VIEW_SIZE = V3_HOLLYWOOD_FLUENT_ICONS.plugConnected20Filled.width;

export function AttachIndicatorIcon({
  connected,
  onColor,
  offColor,
  size = 18,
}: AttachIndicatorIconProps) {
  const color = connected ? onColor : offColor;
  const iconName = connected ? "plugConnected20Filled" : "plugDisconnected20Filled";
  const paths = V3_HOLLYWOOD_FLUENT_ICONS[iconName].paths;
  const filterId = connected ? "attach-glow-on" : "attach-glow-off";
  const glowOpacity = connected ? 0.5 : 0.3;

  return (
    <svg
      viewBox={`0 0 ${VIEW_SIZE} ${VIEW_SIZE}`}
      width={size}
      height={size}
      fill={color}
      aria-hidden
      style={{ overflow: "visible" }}
    >
      <defs>
        <filter id={filterId} x="-30%" y="-30%" width="160%" height="160%">
          <feGaussianBlur stdDeviation={connected ? 1.4 : 1.1} result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>
      <g filter={`url(#${filterId})`} opacity={glowOpacity}>
        {paths.map((d) => (
          <path key={`glow-${d.slice(0, 20)}`} d={d} />
        ))}
      </g>
      {paths.map((d) => (
        <path key={d.slice(0, 20)} d={d} />
      ))}
    </svg>
  );
}
