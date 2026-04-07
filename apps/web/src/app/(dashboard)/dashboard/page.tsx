"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { TopBar } from "@/components/dashboard/sidebar";
import { useI18n } from "@/lib/i18n";
import { StatCard } from "@/components/dashboard/stat-card";
import { Card, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Play, Eye, MousePointer, TrendingUp, Video, Clock, Loader2 } from "lucide-react";
import { formatNumber, formatDate, formatDuration } from "@/lib/utils";
import { api } from "@/lib/api-client";

export default function DashboardPage() {
  const { t } = useI18n();
  const [stats, setStats] = useState({ totalPlays: 0, uniqueViewers: 0, ctaClicks: 0, avgProgress: 0 });
  const [videos, setVideos] = useState<any[]>([]);
  const [daily, setDaily] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      api.getAnalyticsOverview({}).catch(() => null),
      api.getVideos().catch(() => ({ videos: [] })),
      api.getDailyStats({}).catch(() => ({ daily: [] })),
    ])
      .then(([overview, videosData, dailyData]) => {
        if (overview) {
          setStats({
            totalPlays: overview.totalPlays ?? 0,
            uniqueViewers: overview.uniqueViewers ?? 0,
            ctaClicks: overview.ctaClicks ?? 0,
            avgProgress: overview.avgProgress ?? 0,
          });
        }
        const vids = (videosData?.videos || []).map((v: any) => ({
          ...v,
          createdAt: v.createdAt || v.created_at,
          posterUrl: v.posterUrl || v.poster_url,
        }));
        setVideos(vids);
        setDaily(dailyData?.daily || []);
      })
      .finally(() => setLoading(false));
  }, []);

  const maxDaily = daily.length > 0 ? Math.max(...daily.map((d: any) => d.plays || 0), 1) : 1;
  const topVideos = [...videos].sort((a, b) => (b.plays || 0) - (a.plays || 0)).slice(0, 4);
  const recentVideos = videos.slice(0, 3);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div>
      <TopBar title={t("overview")} subtitle={t("allTimeStats")} />

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard title={t("totalPlays")} value={formatNumber(stats.totalPlays)} icon={<Play className="w-5 h-5" />} delay={0} />
        <StatCard title={t("uniqueViewers")} value={formatNumber(stats.uniqueViewers)} icon={<Eye className="w-5 h-5" />} delay={75} />
        <StatCard title={t("ctaClicks")} value={formatNumber(stats.ctaClicks)} icon={<MousePointer className="w-5 h-5" />} delay={150} />
        <StatCard title={t("avgWatch")} value={`${stats.avgProgress}%`} icon={<TrendingUp className="w-5 h-5" />} delay={225} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        {/* Daily Plays Chart */}
        <Card className="lg:col-span-2">
          <CardTitle>{t("playsTrend")}</CardTitle>
          <CardDescription>{t("dailyPerformance")}</CardDescription>
          <CardContent>
            {daily.length > 0 ? (
              <div className="h-64 mt-4 flex items-end gap-1 px-2">
                {daily.slice(-30).map((d: any, i: number) => (
                  <div key={i} className="flex-1 flex flex-col items-center gap-1">
                    <div
                      className="w-full rounded-t bg-gradient-to-t from-primary/80 to-primary/40 transition-all hover:from-primary hover:to-primary/60"
                      style={{ height: `${(d.plays / maxDaily) * 200}px`, minHeight: d.plays > 0 ? "4px" : "0" }}
                      title={`${d.date}: ${d.plays} plays`}
                    />
                  </div>
                ))}
              </div>
            ) : (
              <div className="h-64 mt-4 flex items-center justify-center text-muted-foreground border border-dashed border-border rounded-lg">
                {t("noPlayData")}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Top Videos */}
        <Card>
          <CardTitle>{t("topVideos")}</CardTitle>
          <CardDescription>{t("byTotalPlays")}</CardDescription>
          <CardContent>
            {topVideos.length > 0 ? (
              <div className="space-y-4 mt-4">
                {topVideos.map((video: any, i: number) => (
                  <Link key={video.id} href={`/dashboard/videos/${video.id}`}>
                    <div className="flex items-center gap-3 hover:bg-white/[0.02] rounded-lg p-1 transition-colors">
                      <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center text-xs font-bold text-muted-foreground flex-shrink-0">
                        {i + 1}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium truncate">{video.title}</div>
                        <div className="text-xs text-muted-foreground">
                          {video.duration > 0 ? formatDuration(video.duration) : "—"}
                        </div>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            ) : (
              <div className="mt-4 text-sm text-muted-foreground text-center py-8">
                {t("noVideosYet")}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Recent Videos + Quick Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <div className="flex items-center justify-between mb-4">
            <CardTitle>{t("recentVideos")}</CardTitle>
            <Link href="/dashboard/videos" className="text-sm text-primary hover:text-primary/80">
              {t("viewAll")} &rarr;
            </Link>
          </div>
          <CardContent>
            {recentVideos.length > 0 ? (
              <div className="space-y-3">
                {recentVideos.map((video: any) => {
                  const statusMap: Record<string, any> = {
                    ready: { variant: "success", label: "Ready" },
                    processing: { variant: "warning", label: "Processing" },
                    uploading: { variant: "info", label: "Uploading" },
                    error: { variant: "error", label: "Error" },
                  };
                  const badge = statusMap[video.status] || statusMap.error;
                  return (
                    <Link key={video.id} href={`/dashboard/videos/${video.id}`}>
                      <div className="flex items-center gap-3 p-3 rounded-lg hover:bg-white/[0.02] transition-colors">
                        <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center flex-shrink-0 overflow-hidden">
                          {video.posterUrl ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={video.posterUrl} alt="" className="w-full h-full object-cover" />
                          ) : (
                            <Video className="w-4 h-4 text-muted-foreground" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-medium truncate">{video.title}</div>
                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <Clock className="w-3 h-3" /> {formatDate(video.createdAt)}
                          </div>
                        </div>
                        <Badge variant={badge.variant}>{badge.label}</Badge>
                      </div>
                    </Link>
                  );
                })}
              </div>
            ) : (
              <div className="text-sm text-muted-foreground text-center py-8">
                {t("noVideosUploaded")}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardTitle>{t("quickActions")}</CardTitle>
          <CardContent>
            <div className="grid grid-cols-2 gap-3 mt-4">
              {[
                { label: t("uploadVideo"), icon: "📤", href: "/dashboard/videos/upload", color: "from-primary/20 to-primary/5" },
                { label: t("viewAnalytics"), icon: "📊", href: "/dashboard/analytics", color: "from-secondary/20 to-secondary/5" },
                { label: t("allVideos"), icon: "🎬", href: "/dashboard/videos", color: "from-chart-3/20 to-chart-3/5" },
                { label: t("settings"), icon: "⚙️", href: "/dashboard/settings", color: "from-chart-4/20 to-chart-4/5" },
              ].map((action) => (
                <Link
                  key={action.label}
                  href={action.href}
                  className={`flex flex-col items-center gap-2 p-4 rounded-xl bg-gradient-to-br ${action.color} border border-border hover:border-border-light transition-all hover:scale-[1.02]`}
                >
                  <span className="text-2xl">{action.icon}</span>
                  <span className="text-xs font-medium text-foreground">{action.label}</span>
                </Link>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
