import { useRef, type ReactNode } from "react";
import { cn } from "../components/ui/utils";
import {
  useShellFitLineFontSize,
  type UseShellFitLineFontSizeOptions,
} from "../hooks/useShellFitLineFontSize";

/**
 * One-line label: grows with global text step when there is room, otherwise shrinks
 * so copy does not wrap inside the parent (parent should set width / min-w-0).
 */
export function ShellFitLine({
  basePx,
  className,
  children,
  fitOptions,
}: {
  basePx: number;
  className?: string;
  children: ReactNode;
  /** Optional floor px etc. */
  fitOptions?: UseShellFitLineFontSizeOptions;
}) {
  const ref = useRef<HTMLSpanElement>(null);
  useShellFitLineFontSize(ref, basePx, [children, basePx, fitOptions], fitOptions);
  return (
    <span
      ref={ref}
      data-shell-fit-line
      className={cn(
        "inline-block min-w-0 max-w-full whitespace-nowrap align-bottom",
        className,
      )}
    >
      {children}
    </span>
  );
}
