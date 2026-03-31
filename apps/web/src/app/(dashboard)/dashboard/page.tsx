"use client";

import { StatCard } from "@/components/dashboard/stat-card";
import { Card, CardTitle, CardContent } from "@/components/ui/card";
import { Play, Eye, MousePointer, TrendingUp } from "lucide-react";
import { formatNumber } from "@/lib/utils";

export default function DashboardPage() {
  // TODO: fetch from API with TanStack Query
  const stats = {
    totalPlays: 12543,
    uniqueViewers: 8721,
    ctaClicks: 423,
    avgProgress: 67.3,
  };

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold">Dashboard</h1>
        <p className="text-muted-foreground">Overview of your video performance.</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard
          title="Total Plays"
          value={formatNumber(stats.totalPlays)}
          icon={<Play className="w-5 h-5" />}
          trend={{ value: 12.5, label: "vs last month" }}
          subtitle="vs last month"
        />
        <StatCard
          title="Unique Viewers"
          value={formatNumber(stats.uniqueViewers)}
          icon={<Eye className="w-5 h-5" />}
          trend={{ value: 8.2, label: "vs last month" }}
          subtitle="vs last month"
        />
        <StatCard
          title="CTA Clicks"
          value={formatNumber(stats.ctaClicks)}
          icon={<MousePointer className="w-5 h-5" />}
          trend={{ value: 23.1, label: "vs last month" }}
          subtitle="vs last month"
        />
        <StatCard
          title="Avg. Watch"
          value={`${stats.avgProgress.toFixed(0)}%`}
          icon={<TrendingUp className="w-5 h-5" />}
          trend={{ value: 3.4, label: "vs last month" }}
          subtitle="of video watched"
        />
      </div>

      {/* Placeholder chart area */}
      <Card>
        <CardTitle className="mb-4">Plays Over Time</CardTitle>
        <CardContent>
          <div className="h-64 flex items-center justify-center text-muted-foreground border border-dashed border-border rounded-lg">
            Chart will render here with real data from ClickHouse
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
