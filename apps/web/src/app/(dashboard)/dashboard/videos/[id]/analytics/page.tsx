"use client";

import { use } from "react";
import { Card, CardTitle, CardContent } from "@/components/ui/card";
import { StatCard } from "@/components/dashboard/stat-card";
import { Play, Eye, MousePointer, TrendingUp } from "lucide-react";
import { formatNumber } from "@/lib/utils";

// TODO: Replace with TanStack Query + api.getRetention() / api.getDailyStats()
const mockRetention = [
  { bucket: 0, viewers: 100 }, { bucket: 5, viewers: 95 }, { bucket: 10, viewers: 88 },
  { bucket: 15, viewers: 82 }, { bucket: 20, viewers: 76 }, { bucket: 25, viewers: 70 },
  { bucket: 30, viewers: 65 }, { bucket: 35, viewers: 60 }, { bucket: 40, viewers: 55 },
  { bucket: 45, viewers: 50 }, { bucket: 50, viewers: 46 }, { bucket: 55, viewers: 42 },
  { bucket: 60, viewers: 38 }, { bucket: 65, viewers: 34 }, { bucket: 70, viewers: 30 },
  { bucket: 75, viewers: 27 }, { bucket: 80, viewers: 24 }, { bucket: 85, viewers: 21 },
  { bucket: 90, viewers: 18 }, { bucket: 95, viewers: 15 }, { bucket: 100, viewers: 12 },
];

export default function VideoAnalyticsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);

  const maxViewers = Math.max(...mockRetention.map((r) => r.viewers));

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold">Video Analytics</h1>
        <p className="text-muted-foreground">Detailed performance metrics for this video.</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        <StatCard title="Total Plays" value={formatNumber(4523)} icon={<Play className="w-5 h-5" />} />
        <StatCard title="Unique Viewers" value={formatNumber(3210)} icon={<Eye className="w-5 h-5" />} />
        <StatCard title="CTA Clicks" value={formatNumber(423)} icon={<MousePointer className="w-5 h-5" />} />
        <StatCard title="Completion Rate" value="12%" icon={<TrendingUp className="w-5 h-5" />} />
      </div>

      {/* Retention Curve */}
      <Card className="mb-6">
        <CardTitle className="mb-6">Retention Curve</CardTitle>
        <CardContent>
          <div className="h-64 flex items-end gap-1">
            {mockRetention.map((point) => (
              <div key={point.bucket} className="flex-1 flex flex-col items-center gap-1">
                <div
                  className="w-full bg-primary/80 rounded-t transition-all hover:bg-primary"
                  style={{ height: `${(point.viewers / maxViewers) * 220}px` }}
                  title={`${point.bucket}%: ${point.viewers}% viewers`}
                />
              </div>
            ))}
          </div>
          <div className="flex justify-between text-xs text-muted-foreground mt-2 px-1">
            <span>0%</span>
            <span>25%</span>
            <span>50%</span>
            <span>75%</span>
            <span>100%</span>
          </div>
          <p className="text-center text-sm text-muted-foreground mt-3">
            Video Progress &rarr;
          </p>
        </CardContent>
      </Card>

      {/* Daily Plays Chart Placeholder */}
      <Card>
        <CardTitle className="mb-4">Plays Over Time</CardTitle>
        <CardContent>
          <div className="h-48 flex items-center justify-center text-muted-foreground border border-dashed border-border rounded-lg">
            Daily plays chart — will use Recharts with real ClickHouse data
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
