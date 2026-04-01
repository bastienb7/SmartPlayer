"use client";

import { use, useEffect, useState } from "react";
import { Card, CardTitle, CardContent } from "@/components/ui/card";
import { StatCard } from "@/components/dashboard/stat-card";
import { Play, Eye, MousePointer, TrendingUp, Loader2, AlertCircle } from "lucide-react";
import { formatNumber } from "@/lib/utils";
import { api } from "@/lib/api-client";

export default function VideoAnalyticsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [stats, setStats] = useState({ totalPlays: 0, uniqueViewers: 0, ctaClicks: 0, avgProgress: 0 });
  const [retention, setRetention] = useState<Array<{ bucket: number; viewers: number }>>([]);
  const [daily, setDaily] = useState<Array<{ date: string; plays: number; completions: number; uniqueViewers: number }>>([]);

  useEffect(() => {
    Promise.all([
      api.getAnalyticsOverview({ videoId: id }).catch(() => null),
      api.getRetention(id).catch(() => ({ retention: [] })),
      api.getDailyStats({ videoId: id }).catch(() => ({ daily: [] })),
    ])
      .then(([overview, retentionData, dailyData]) => {
        if (overview) {
          setStats({
            totalPlays: overview.totalPlays ?? 0,
            uniqueViewers: overview.uniqueViewers ?? 0,
            ctaClicks: overview.ctaClicks ?? 0,
            avgProgress: overview.avgProgress ?? 0,
          });
        }
        if (retentionData?.retention?.length) {
          setRetention(retentionData.retention);
        }
        if (dailyData?.daily?.length) {
          setDaily(dailyData.daily);
        }
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center gap-3 p-4 rounded-lg bg-destructive/10 border border-destructive/30 text-destructive text-sm">
        <AlertCircle className="w-5 h-5" /> {error}
      </div>
    );
  }

  const completionRate = stats.totalPlays > 0 ? stats.avgProgress : 0;
  const maxViewers = retention.length > 0 ? Math.max(...retention.map((r) => r.viewers)) : 1;
  const maxDailyPlays = daily.length > 0 ? Math.max(...daily.map((d) => d.plays), 1) : 1;

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold">Video Analytics</h1>
        <p className="text-muted-foreground">Detailed performance metrics for this video.</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        <StatCard title="Total Plays" value={formatNumber(stats.totalPlays)} icon={<Play className="w-5 h-5" />} />
        <StatCard title="Unique Viewers" value={formatNumber(stats.uniqueViewers)} icon={<Eye className="w-5 h-5" />} />
        <StatCard title="CTA Clicks" value={formatNumber(stats.ctaClicks)} icon={<MousePointer className="w-5 h-5" />} />
        <StatCard title="Avg. Watch" value={`${completionRate.toFixed(0)}%`} icon={<TrendingUp className="w-5 h-5" />} />
      </div>

      {/* Retention Curve */}
      <Card className="mb-6">
        <CardTitle className="mb-6">Retention Curve</CardTitle>
        <CardContent>
          {retention.length > 0 ? (
            <>
              <div className="h-64 flex items-end gap-1">
                {retention.map((point) => (
                  <div key={point.bucket} className="flex-1 flex flex-col items-center gap-1">
                    <div
                      className="w-full bg-primary/80 rounded-t transition-all hover:bg-primary"
                      style={{ height: `${(point.viewers / maxViewers) * 220}px` }}
                      title={`${point.bucket}%: ${point.viewers} viewers`}
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
            </>
          ) : (
            <div className="h-48 flex items-center justify-center text-muted-foreground border border-dashed border-border rounded-lg">
              No retention data yet. Data will appear once viewers start watching.
            </div>
          )}
        </CardContent>
      </Card>

      {/* Daily Plays Chart */}
      <Card>
        <CardTitle className="mb-4">Plays Over Time</CardTitle>
        <CardContent>
          {daily.length > 0 ? (
            <>
              <div className="h-48 flex items-end gap-1">
                {daily.map((day) => (
                  <div key={day.date} className="flex-1 flex flex-col items-center gap-1">
                    <div
                      className="w-full bg-secondary/80 rounded-t transition-all hover:bg-secondary"
                      style={{ height: `${(day.plays / maxDailyPlays) * 170}px`, minHeight: day.plays > 0 ? "4px" : "0" }}
                      title={`${day.date}: ${day.plays} plays`}
                    />
                  </div>
                ))}
              </div>
              <div className="flex justify-between text-xs text-muted-foreground mt-2 px-1">
                <span>{daily[0]?.date}</span>
                <span>{daily[daily.length - 1]?.date}</span>
              </div>
            </>
          ) : (
            <div className="h-48 flex items-center justify-center text-muted-foreground border border-dashed border-border rounded-lg">
              No daily data yet. Data will appear once viewers start watching.
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
