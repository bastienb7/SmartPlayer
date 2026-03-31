"use client";

import { StatCard } from "@/components/dashboard/stat-card";
import { Card, CardTitle, CardContent } from "@/components/ui/card";
import { Play, Eye, MousePointer, TrendingUp } from "lucide-react";
import { formatNumber } from "@/lib/utils";

export default function AnalyticsPage() {
  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold">Analytics</h1>
        <p className="text-muted-foreground">Performance overview across all your videos.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        <StatCard title="Total Plays" value={formatNumber(12543)} icon={<Play className="w-5 h-5" />} trend={{ value: 12.5, label: "" }} subtitle="vs last month" />
        <StatCard title="Unique Viewers" value={formatNumber(8721)} icon={<Eye className="w-5 h-5" />} trend={{ value: 8.2, label: "" }} subtitle="vs last month" />
        <StatCard title="Total CTA Clicks" value={formatNumber(1247)} icon={<MousePointer className="w-5 h-5" />} trend={{ value: 23.1, label: "" }} subtitle="vs last month" />
        <StatCard title="Avg. Watch" value="67%" icon={<TrendingUp className="w-5 h-5" />} trend={{ value: 3.4, label: "" }} subtitle="of video watched" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardTitle className="mb-4">Plays Over Time</CardTitle>
          <CardContent>
            <div className="h-64 flex items-center justify-center text-muted-foreground border border-dashed border-border rounded-lg">
              Daily plays chart — Recharts + ClickHouse data
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardTitle className="mb-4">Top Videos</CardTitle>
          <CardContent>
            <div className="space-y-3">
              {[
                { title: "VSL - Product Launch", plays: 4523, progress: 67 },
                { title: "Webinar Replay", plays: 3210, progress: 45 },
                { title: "Sales Page Hero", plays: 2810, progress: 72 },
                { title: "Testimonial Reel", plays: 2000, progress: 58 },
              ].map((video, i) => (
                <div key={i} className="flex items-center gap-4">
                  <span className="text-sm font-medium text-muted-foreground w-6">{i + 1}</span>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium truncate">{video.title}</div>
                    <div className="text-xs text-muted-foreground">{video.plays.toLocaleString()} plays &middot; {video.progress}% avg watch</div>
                  </div>
                  <div className="w-24 h-2 bg-muted rounded-full overflow-hidden">
                    <div className="h-full bg-primary rounded-full" style={{ width: `${(video.plays / 4523) * 100}%` }} />
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
