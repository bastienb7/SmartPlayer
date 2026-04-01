"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { StatCard } from "@/components/dashboard/stat-card";
import { Card, CardTitle, CardContent } from "@/components/ui/card";
import { Play, Eye, MousePointer, TrendingUp, Loader2 } from "lucide-react";
import { formatNumber, formatDuration } from "@/lib/utils";
import { api } from "@/lib/api-client";

export default function AnalyticsPage() {
  const [stats, setStats] = useState({ totalPlays: 0, uniqueViewers: 0, ctaClicks: 0, avgProgress: 0 });
  const [daily, setDaily] = useState<any[]>([]);
  const [videos, setVideos] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      api.getAnalyticsOverview({}).catch(() => null),
      api.getDailyStats({}).catch(() => ({ daily: [] })),
      api.getVideos().catch(() => ({ videos: [] })),
    ])
      .then(([overview, dailyData, videosData]) => {
        if (overview) {
          setStats({
            totalPlays: overview.totalPlays ?? 0,
            uniqueViewers: overview.uniqueViewers ?? 0,
            ctaClicks: overview.ctaClicks ?? 0,
            avgProgress: overview.avgProgress ?? 0,
          });
        }
        setDaily(dailyData?.daily || []);
        setVideos((videosData?.videos || []).map((v: any) => ({
          ...v,
          createdAt: v.createdAt || v.created_at,
        })));
      })
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const maxDaily = daily.length > 0 ? Math.max(...daily.map((d: any) => d.plays || 0), 1) : 1;

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold">Analytics</h1>
        <p className="text-muted-foreground">Performance overview across all your videos.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        <StatCard title="Total Plays" value={formatNumber(stats.totalPlays)} icon={<Play className="w-5 h-5" />} />
        <StatCard title="Unique Viewers" value={formatNumber(stats.uniqueViewers)} icon={<Eye className="w-5 h-5" />} />
        <StatCard title="Total CTA Clicks" value={formatNumber(stats.ctaClicks)} icon={<MousePointer className="w-5 h-5" />} />
        <StatCard title="Avg. Watch" value={`${stats.avgProgress}%`} icon={<TrendingUp className="w-5 h-5" />} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Daily Chart */}
        <Card>
          <CardTitle className="mb-4">Plays Over Time</CardTitle>
          <CardContent>
            {daily.length > 0 ? (
              <>
                <div className="h-64 flex items-end gap-1">
                  {daily.slice(-30).map((d: any, i: number) => (
                    <div key={i} className="flex-1 flex flex-col items-center">
                      <div
                        className="w-full bg-primary/80 rounded-t transition-all hover:bg-primary"
                        style={{ height: `${(d.plays / maxDaily) * 220}px`, minHeight: d.plays > 0 ? "4px" : "0" }}
                        title={`${d.date}: ${d.plays} plays`}
                      />
                    </div>
                  ))}
                </div>
                <div className="flex justify-between text-xs text-muted-foreground mt-2">
                  <span>{daily[0]?.date}</span>
                  <span>{daily[daily.length - 1]?.date}</span>
                </div>
              </>
            ) : (
              <div className="h-64 flex items-center justify-center text-muted-foreground border border-dashed border-border rounded-lg">
                No play data yet
              </div>
            )}
          </CardContent>
        </Card>

        {/* Top Videos */}
        <Card>
          <CardTitle className="mb-4">All Videos</CardTitle>
          <CardContent>
            {videos.length > 0 ? (
              <div className="space-y-3">
                {videos.map((video: any, i: number) => (
                  <Link key={video.id} href={`/dashboard/videos/${video.id}/analytics`}>
                    <div className="flex items-center gap-4 p-2 rounded-lg hover:bg-white/[0.02] transition-colors">
                      <span className="text-sm font-medium text-muted-foreground w-6">{i + 1}</span>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium truncate">{video.title}</div>
                        <div className="text-xs text-muted-foreground">
                          {video.duration > 0 ? formatDuration(video.duration) : "—"} &middot; {video.status}
                        </div>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            ) : (
              <div className="text-sm text-muted-foreground text-center py-8">
                No videos yet
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
