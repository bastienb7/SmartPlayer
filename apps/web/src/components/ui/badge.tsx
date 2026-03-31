import { cn } from "@/lib/utils";
import type { HTMLAttributes } from "react";

interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: "default" | "success" | "warning" | "error" | "info";
}

export function Badge({ className, variant = "default", ...props }: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium",
        {
          "bg-muted text-muted-foreground": variant === "default",
          "bg-success/15 text-success": variant === "success",
          "bg-yellow-500/15 text-yellow-500": variant === "warning",
          "bg-destructive/15 text-destructive": variant === "error",
          "bg-primary/15 text-primary": variant === "info",
        },
        className
      )}
      {...props}
    />
  );
}
