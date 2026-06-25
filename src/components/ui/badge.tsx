import * as React from "react";
import { cn } from "@/lib/utils";

type Variant = "neutral" | "brand" | "success" | "warning" | "danger";

const variants: Record<Variant, string> = {
  neutral: "bg-surface-2 text-muted-foreground border-border",
  brand: "bg-primary-soft text-primary border-transparent",
  success: "bg-[color-mix(in_srgb,var(--success)_14%,transparent)] text-success border-transparent",
  warning: "bg-[color-mix(in_srgb,var(--warning)_14%,transparent)] text-warning border-transparent",
  danger: "bg-[color-mix(in_srgb,var(--destructive)_14%,transparent)] text-destructive border-transparent",
};

export function Badge({
  className,
  variant = "neutral",
  dot = false,
  children,
  ...props
}: React.ComponentProps<"span"> & { variant?: Variant; dot?: boolean }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium",
        variants[variant],
        className
      )}
      {...props}
    >
      {dot && (
        <span className="size-1.5 rounded-full bg-current" aria-hidden />
      )}
      {children}
    </span>
  );
}
