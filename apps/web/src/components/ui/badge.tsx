import { cn } from "@/lib/utils";
import type { HTMLAttributes } from "react";

interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: "default" | "success" | "warning" | "error" | "info" | "outline";
}

export function Badge({ className, variant = "default", ...props }: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium",
        {
          "bg-white/8 text-muted-foreground border border-border": variant === "default",
          "bg-success/12 text-success": variant === "success",
          "bg-warning/12 text-warning": variant === "warning",
          "bg-destructive/12 text-destructive": variant === "error",
          "bg-info/12 text-info": variant === "info",
          "border border-border text-muted-foreground": variant === "outline",
        },
        className
      )}
      {...props}
    />
  );
}
