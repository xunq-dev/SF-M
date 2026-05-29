import { useRef, type ReactNode } from "react";
import { cn } from "../components/ui/utils";
import {
  useShellFitBlockFontSize,
  type UseShellFitBlockFontSizeOptions,
} from "../hooks/useShellFitBlockFontSize";

type ShellFitBlockProps = {
  basePx: number;
  className?: string;
  children: ReactNode;
  fitOptions?: UseShellFitBlockFontSizeOptions;
};

/**
 * Multi-line copy in a bounded region: font scales down (floor `minPx`) so text stays inside the parent.
 * Parent should set width; for vertical fitting use a fixed height (e.g. absolute inset or max-h).
 */
export function ShellFitBlock({ basePx, className, children, fitOptions }: ShellFitBlockProps) {
  const ref = useRef<HTMLDivElement>(null);
  useShellFitBlockFontSize(ref, basePx, [children, basePx, fitOptions], fitOptions);
  return (
    <div
      ref={ref}
      data-shell-fit-block
      className={cn(
        "box-border min-h-0 min-w-0 w-full max-w-full overflow-hidden break-words [overflow-wrap:anywhere]",
        className,
      )}
    >
      {children}
    </div>
  );
}
