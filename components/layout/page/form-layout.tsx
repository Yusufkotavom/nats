import { cn } from "@/lib/utils";

export function PageFormLayout({
  className,
  ...props
}: React.ComponentProps<"div">) {
  return (
    <div
      className={cn("flex flex-1 flex-col gap-2 p-4 pt-0", className)}
      {...props}
    />
  );
}

export function PageFormHeader({
  className,
  ...props
}: React.ComponentProps<"div">) {
  return (
    <div
      className={cn(
        "flex flex-col items-start justify-between gap-3 md:flex-row md:items-center md:gap-4",
        className,
      )}
      {...props}
    />
  );
}

export function PageFormTitle({
  className,
  title,
  children,
  ...props
}: React.ComponentProps<"h2"> & { title?: React.ReactNode }) {
  return (
    <h2
      className={cn("text-lg font-bold tracking-tight", className)}
      {...props}
    >
      {title || children}
    </h2>
  );
}

export function PageFormActions({
  className,
  ...props
}: React.ComponentProps<"div">) {
  return (
    <div
      className={cn(
        "flex w-full flex-wrap items-center justify-start gap-2 md:w-auto md:justify-end",
        className,
      )}
      {...props}
    />
  );
}

export function PageFormContent({
  className,
  ...props
}: React.ComponentProps<"div">) {
  return (
    <div
      className={cn(
        "rounded-lg border bg-card p-4 text-card-foreground shadow-sm md:p-6",
        className
      )}
      {...props}
    />
  );
}
