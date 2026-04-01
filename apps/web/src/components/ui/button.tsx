"use client";

import { cn } from "@/lib/utils";
import { forwardRef, type ButtonHTMLAttributes } from "react";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "ghost" | "destructive" | "outline" | "glow";
  size?: "sm" | "md" | "lg" | "icon";
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "primary", size = "md", ...props }, ref) => {
    return (
      <button
        ref={ref}
        className={cn(
          "inline-flex items-center justify-center font-medium rounded-lg transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-primary/30 disabled:opacity-50 disabled:pointer-events-none cursor-pointer",
          {
            "bg-primary text-white hover:bg-primary/90 hover:shadow-[0_0_20px_rgba(16,185,129,0.3)] active:scale-[0.98]": variant === "primary",
            "bg-muted text-foreground hover:bg-muted/80 hover:border-border-light": variant === "secondary",
            "hover:bg-white/5 text-foreground": variant === "ghost",
            "bg-destructive text-white hover:bg-destructive/90": variant === "destructive",
            "border border-border text-foreground hover:bg-white/5 hover:border-primary/40": variant === "outline",
            "bg-primary text-white hover:bg-primary/90 shadow-[0_0_20px_rgba(16,185,129,0.25)] hover:shadow-[0_0_30px_rgba(16,185,129,0.4)] active:scale-[0.98]": variant === "glow",
          },
          {
            "h-8 px-3 text-xs gap-1.5": size === "sm",
            "h-10 px-4 text-sm gap-2": size === "md",
            "h-12 px-6 text-base gap-2.5": size === "lg",
            "h-9 w-9 p-0": size === "icon",
          },
          className
        )}
        {...props}
      />
    );
  }
);
Button.displayName = "Button";
