type GradientLiveEditHitZonesProps = {
  enabled: boolean;
  fromPath: string;
  toPath: string;
  liveAttr?: string;
  className?: string;
};

/** Invisible top/bottom halves for targeting gradient color stops during live edit. */
export function GradientLiveEditHitZones({
  enabled,
  fromPath,
  toPath,
  liveAttr = "data-shell-live",
  className = "absolute inset-x-0 z-[2]",
}: GradientLiveEditHitZonesProps) {
  if (!enabled) return null;

  const fromProps = { [liveAttr]: fromPath };
  const toProps = { [liveAttr]: toPath };

  return (
    <>
      <div className={`${className} top-0 h-1/2`} {...fromProps} aria-hidden />
      <div className={`${className} bottom-0 h-1/2`} {...toProps} aria-hidden />
    </>
  );
}
