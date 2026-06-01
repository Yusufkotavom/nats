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
    <div className={cn("w-full max-w-full overflow-x-auto", className)}>
      <div className={cn("w-full max-w-none", minWidthClassName)}>{children}</div>
    </div>
  );
}
