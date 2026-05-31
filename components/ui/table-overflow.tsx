import * as React from "react";
import { cn } from "@/lib/utils";

export function TableOverflow({
  className,
  minWidthClassName,
  children,
}: {
  className?: string;
  minWidthClassName: string;
  children: React.ReactNode;
}) {
  return (
    <div className={cn("w-full overflow-x-auto", className)}>
      <div className={cn("w-full", minWidthClassName)}>{children}</div>
    </div>
  );
}
