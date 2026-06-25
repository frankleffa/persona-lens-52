import * as React from "react";
import { cn } from "@/lib/utils";

export const Textarea = React.forwardRef<
  HTMLTextAreaElement,
  React.TextareaHTMLAttributes<HTMLTextAreaElement>
>(({ className, ...props }, ref) => {
  return (
    <textarea
      ref={ref}
      className={cn(
        "min-h-20 w-full rounded-md border border-input bg-surface px-3 py-2 text-sm text-foreground transition-colors placeholder:text-soft-foreground focus:border-border-strong focus:outline-none focus:ring-2 focus:ring-ring/40 disabled:opacity-50",
        className
      )}
      {...props}
    />
  );
});
Textarea.displayName = "Textarea";
