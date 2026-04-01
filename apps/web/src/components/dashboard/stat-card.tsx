import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { TrendingUp, TrendingDown } from "lucide-react";
import type { ReactNode } from "react";

interface StatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon?: ReactNode;
  trend?: { value: number; label?: string };
  className?: string;
  delay?: number;
}

export function StatCard({ title, value, subtitle, icon, trend, className, delay = 0 }: StatCardProps) {
  const isPositive = trend && trend.value >= 0;

  return (
    <Card
      className={cn(
        "relative overflow-hidden opacity-0 animate-fade-in",
        className
      )}
      style={{ animationDelay: `${delay}ms`, animationFillMode: "forwards" }}
    >
      <div className="flex items-start justify-between mb-3">
        <span className="text-sm text-muted-foreground font-medium">{title}</span>
        {icon && (
          <span className="text-muted-foreground/50">{icon}</span>
        )}
      </div>
      <div className="flex items-end gap-3">
        <span className="text-3xl font-bold text-foreground tracking-tight">{value}</span>
        {trend && (
          <span
            className={cn(
              "flex items-center gap-0.5 text-sm font-medium pb-0.5",
              isPositive ? "text-success" : "text-destructive"
            )}
          >
            {isPositive ? (
              <TrendingUp className="w-3.5 h-3.5" />
            ) : (
              <TrendingDown className="w-3.5 h-3.5" />
            )}
            {isPositive && "+"}
            {trend.value}%
          </span>
        )}
      </div>
      {subtitle && (
        <span className="text-xs text-muted-foreground mt-1 block">{subtitle}</span>
      )}
      {/* Subtle gradient glow at top */}
      <div
        className={cn(
          "absolute top-0 left-0 right-0 h-[1px]",
          isPositive
            ? "bg-gradient-to-r from-transparent via-success/50 to-transparent"
            : trend
            ? "bg-gradient-to-r from-transparent via-destructive/50 to-transparent"
            : "bg-gradient-to-r from-transparent via-primary/30 to-transparent"
        )}
      />
    </Card>
  );
}
