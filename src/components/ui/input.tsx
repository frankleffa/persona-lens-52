import * as React from "react";
import { cn } from "@/lib/utils";

export const Input = React.forwardRef<
  HTMLInputElement,
  React.InputHTMLAttributes<HTMLInputElement>
>(({ className, type, ...props }, ref) => {
  return (
    <input
      type={type}
      ref={ref}
      className={cn(
        "h-10 w-full rounded-md border border-input bg-surface px-3 text-sm text-foreground transition-colors placeholder:text-soft-foreground focus:border-border-strong focus:outline-none focus:ring-2 focus:ring-ring/40 disabled:opacity-50",
        className
      )}
      {...props}
    />
  );
});
Input.displayName = "Input";
