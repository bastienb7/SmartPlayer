"use client";

import { TopBar } from "@/components/dashboard/sidebar";
import { StatCard } from "@/components/dashboard/stat-card";
import { Card, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Play, Eye, MousePointer, TrendingUp, Video, Clock } from "lucide-react";
import { formatNumber } from "@/lib/utils";

export default function DashboardPage() {
  const stats = {
    totalPlays: 12543,
    uniqueViewers: 8721,
    ctaClicks: 423,
    avgProgress: 67.3,
  };

  return (
    <div>
      <TopBar title="Overview" subtitle="Last 30 days" />

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard
          title="Total Plays"
          value={formatNumber(stats.totalPlays)}
          icon={<Play className="w-5 h-5" />}
          trend={{ value: 12.5 }}
          subtitle="vs last month"
          delay={0}
        />
        <StatCard
          title="Unique Viewers"
          value={formatNumber(stats.uniqueViewers)}
          icon={<Eye className="w-5 h-5" />}
          trend={{ value: 8.2 }}
          subtitle="vs last month"
          delay={75}
        />
        <StatCard
          title="CTA Clicks"
          value={formatNumber(stats.ctaClicks)}
          icon={<MousePointer className="w-5 h-5" />}
          trend={{ value: 23.1 }}
          subtitle="vs last month"
          delay={150}
        />
        <StatCard
          title="Avg. Watch"
          value={`${stats.avgProgress.toFixed(0)}%`}
          icon={<TrendingUp className="w-5 h-5" />}
          trend={{ value: 3.4 }}
          subtitle="of video watched"
          delay={225}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        {/* Revenue / Plays Chart */}
        <Card className="lg:col-span-2">
          <CardTitle>Plays Trend</CardTitle>
          <CardDescription>Monthly performance over time</CardDescription>
          <CardContent>
            <div className="h-64 mt-4 flex items-end gap-1 px-2">
              {[35, 42, 38, 55, 68, 72, 85, 92, 88, 95, 110, 125].map((v, i) => (
                <div key={i} className="flex-1 flex flex-col items-center gap-1">
                  <div
                    className="w-full rounded-t bg-gradient-to-t from-primary/80 to-primary/40 transition-all hover:from-primary hover:to-primary/60"
                    style={{ height: `${(v / 125) * 200}px` }}
                  />
                  <span className="text-[10px] text-muted-foreground">
                    {["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"][i]}
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Video Stats */}
        <Card>
          <CardTitle>Top Videos</CardTitle>
          <CardDescription>By total plays</CardDescription>
          <CardContent>
            <div className="space-y-4 mt-4">
              {[
                { title: "VSL - Product Launch", plays: 4523, pct: 100 },
                { title: "Webinar Replay", plays: 3210, pct: 71 },
                { title: "Sales Page Hero", plays: 2810, pct: 62 },
                { title: "Testimonial Reel", plays: 2000, pct: 44 },
              ].map((video, i) => (
                <div key={i} className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center text-xs font-bold text-muted-foreground flex-shrink-0">
                    {i + 1}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium truncate">{video.title}</div>
                    <div className="flex items-center gap-2 mt-1">
                      <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full"
                          style={{
                            width: `${video.pct}%`,
                            background: `linear-gradient(90deg, var(--color-primary), var(--color-secondary))`,
                          }}
                        />
                      </div>
                      <span className="text-xs text-muted-foreground w-12 text-right">
                        {formatNumber(video.plays)}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Videos + Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <div className="flex items-center justify-between mb-4">
            <CardTitle>Recent Videos</CardTitle>
            <a href="/dashboard/videos" className="text-sm text-primary hover:text-primary/80 flex items-center gap-1">
              View all <span className="text-xs">↗</span>
            </a>
          </div>
          <CardContent>
            <div className="space-y-3">
              {[
                { title: "VSL - Product Launch", status: "ready", time: "2 hours ago", plays: 4523 },
                { title: "Webinar Replay", status: "ready", time: "5 hours ago", plays: 1203 },
                { title: "Sales Page Hero", status: "processing", time: "1 day ago", plays: 0 },
              ].map((video, i) => (
                <div key={i} className="flex items-center gap-3 p-3 rounded-lg hover:bg-white/[0.02] transition-colors">
                  <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center flex-shrink-0">
                    <Video className="w-4 h-4 text-muted-foreground" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium truncate">{video.title}</div>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Clock className="w-3 h-3" />
                      {video.time}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {video.plays > 0 && (
                      <span className="text-sm font-medium">{formatNumber(video.plays)}</span>
                    )}
                    <Badge variant={video.status === "ready" ? "success" : "warning"}>
                      {video.status === "ready" ? "● Ready" : "◌ Processing"}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardTitle>Quick Actions</CardTitle>
          <CardContent>
            <div className="grid grid-cols-2 gap-3 mt-4">
              {[
                { label: "Upload Video", icon: "📤", href: "/dashboard/videos/upload", color: "from-primary/20 to-primary/5" },
                { label: "Create Funnel", icon: "🔄", href: "/dashboard/funnels", color: "from-secondary/20 to-secondary/5" },
                { label: "View Analytics", icon: "📊", href: "/dashboard/analytics", color: "from-chart-3/20 to-chart-3/5" },
                { label: "Settings", icon: "⚙️", href: "/dashboard/settings", color: "from-chart-4/20 to-chart-4/5" },
              ].map((action) => (
                <a
                  key={action.label}
                  href={action.href}
                  className={`flex flex-col items-center gap-2 p-4 rounded-xl bg-gradient-to-br ${action.color} border border-border hover:border-border-light transition-all hover:scale-[1.02]`}
                >
                  <span className="text-2xl">{action.icon}</span>
                  <span className="text-xs font-medium text-foreground">{action.label}</span>
                </a>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
