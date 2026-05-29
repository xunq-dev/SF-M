import { useState } from "react";

type ScriptHubCardThumbProps = {
  src: string;
  fallbackBg: string;
  className?: string;
};

/**
 * Script Hub / ScriptBlox card left column: cover image with solid fallback on error.
 */
export function ScriptHubCardThumb({ src, fallbackBg, className }: ScriptHubCardThumbProps) {
  const [failed, setFailed] = useState(false);

  return (
    <div
      className={`relative h-[7rem] w-full min-w-0 flex-shrink-0 overflow-hidden ${className ?? ""}`}
    >
      {!failed ? (
        <img
          src={src}
          alt=""
          loading="lazy"
          className="h-full w-full object-cover"
          onError={() => setFailed(true)}
        />
      ) : null}
      {failed ? (
        <div className="absolute inset-0" style={{ backgroundColor: fallbackBg }} aria-hidden />
      ) : null}
    </div>
  );
}
