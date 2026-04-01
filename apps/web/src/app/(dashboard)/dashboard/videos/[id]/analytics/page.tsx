"use client";

import { use, useEffect, useState } from "react";
import { Card, CardTitle, CardContent } from "@/components/ui/card";
import { StatCard } from "@/components/dashboard/stat-card";
import { Badge } from "@/components/ui/badge";
import {
  Play, Eye, MousePointer, TrendingUp, Loader2, AlertCircle, Clock,
  Pause, ArrowRightLeft, Target, Users, Monitor, Smartphone, BarChart3,
} from "lucide-react";
import { formatNumber } from "@/lib/utils";
import { api } from "@/lib/api-client";

function formatWatchTime(seconds: number): string {
  if (!seconds || seconds <= 0) return "0s";
  const m = Math.floor(seconds / 60);
  const s = Math.round(seconds % 60);
  return m > 0 ? `${m}m ${s}s` : `${s}s`;
}

export default function VideoAnalyticsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [overview, setOverview] = useState<any>(null);
  const [details, setDetails] = useState<any>(null);
  const [retention, setRetention] = useState<any[]>([]);
  const [heatmap, setHeatmap] = useState<any[]>([]);
  const [dropoff, setDropoff] = useState<any[]>([]);
  const [daily, setDaily] = useState<any[]>([]);
  const [variants, setVariants] = useState<any[]>([]);

  useEffect(() => {
    Promise.all([
      api.getAnalyticsOverview({ videoId: id }).catch(() => null),
      api.getAnalyticsDetails(id).catch(() => null),
      api.getRetention(id).catch(() => ({ retention: [] })),
      api.getAnalyticsHeatmap(id).catch(() => ({ heatmap: [] })),
      api.getAnalyticsDropoff(id).catch(() => ({ dropoff: [] })),
      api.getDailyStats({ videoId: id }).catch(() => ({ daily: [] })),
      api.getAnalyticsVariants(id).catch(() => ({ variants: [] })),
    ])
      .then(([ov, det, ret, hm, df, dy, vr]) => {
        setOverview(ov);
        setDetails(det);
        setRetention(ret?.retention || []);
        setHeatmap(hm?.heatmap || []);
        setDropoff(df?.dropoff || []);
        setDaily(dy?.daily || []);
        setVariants(vr?.variants || []);
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

  const totalPlays = overview?.totalPlays ?? 0;
  const uniqueViewers = overview?.uniqueViewers ?? 0;
  const avgProgress = overview?.avgProgress ?? 0;
  const ctaClicks = overview?.ctaClicks ?? 0;
  const totalPauses = details?.totalPauses ?? 0;
  const totalSeeks = details?.totalSeeks ?? 0;
  const avgWatchTime = details?.avgWatchTimeSeconds ?? 0;
  const completionRate = details?.completionRate ?? 0;
  const ctaCTR = details?.ctaCTR ?? 0;
  const returningViewers = details?.returningViewers ?? 0;
  const mobileCount = details?.mobileCount ?? 0;
  const desktopCount = details?.desktopCount ?? 0;

  const isEmpty = totalPlays === 0;

  if (isEmpty) {
    return (
      <div>
        <div className="mb-8">
          <h1 className="text-2xl font-bold">Analytics</h1>
          <p className="text-muted-foreground">Detailed performance metrics for this video.</p>
        </div>
        <Card>
          <div className="flex flex-col items-center gap-4 py-16">
            <BarChart3 className="w-16 h-16 text-muted-foreground" />
            <div className="text-center">
              <p className="font-semibold mb-1">No data yet</p>
              <p className="text-sm text-muted-foreground max-w-md">
                Embed the player on your page to start collecting analytics. Data will appear here after the first viewers.
              </p>
            </div>
          </div>
        </Card>
      </div>
    );
  }

  // Retention chart helpers
  const maxRetention = retention.length > 0 ? Math.max(...retention.map((r: any) => r.viewers || 0), 1) : 1;

  // Heatmap color
  const heatmapColor = (intensity: number) => {
    if (intensity >= 80) return "bg-emerald-400/80";
    if (intensity >= 60) return "bg-emerald-500/60";
    if (intensity >= 30) return "bg-amber-500/60";
    return "bg-red-500/60";
  };

  // Dropoff helpers
  const maxDropoff = dropoff.length > 0 ? Math.max(...dropoff.map((d: any) => d.sessions || 0), 1) : 1;

  // Daily helpers
  const maxDailyPlays = daily.length > 0 ? Math.max(...daily.map((d: any) => d.plays || 0), 1) : 1;
  const maxDailyCTA = daily.length > 0 ? Math.max(...daily.map((d: any) => d.cta_clicks || 0), 1) : 1;

  // Find biggest drop in retention
  let biggestDropBucket = -1;
  let biggestDropPct = 0;
  for (let i = 1; i < retention.length; i++) {
    const prev = retention[i - 1]?.viewers || 0;
    const curr = retention[i]?.viewers || 0;
    if (prev > 0) {
      const drop = ((prev - curr) / prev) * 100;
      if (drop > biggestDropPct) {
        biggestDropPct = drop;
        biggestDropBucket = retention[i]?.bucket ?? i * 5;
      }
    }
  }

  // Device total
  const deviceTotal = mobileCount + desktopCount;
  const mobilePct = deviceTotal > 0 ? Math.round((mobileCount / deviceTotal) * 100) : 0;
  const desktopPct = deviceTotal > 0 ? 100 - mobilePct : 0;

  // Best variant
  const bestVariant = variants.length >= 2
    ? variants.reduce((best: any, v: any) => (v.completionRate || 0) > (best.completionRate || 0) ? v : best, variants[0])
    : null;

  return (
    <div>
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold">Analytics</h1>
        <p className="text-muted-foreground">Detailed performance metrics for this video.</p>
      </div>

      {/* === KPI Cards Row 1 === */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
        <StatCard title="Total Plays" value={formatNumber(totalPlays)} icon={<Play className="w-5 h-5" />} delay={0} />
        <StatCard title="Unique Viewers" value={formatNumber(uniqueViewers)} icon={<Eye className="w-5 h-5" />} delay={50} />
        <StatCard title="Avg Watch Time" value={formatWatchTime(avgWatchTime)} icon={<Clock className="w-5 h-5" />} delay={100} />
        <StatCard title="Completion Rate" value={`${completionRate.toFixed(1)}%`} icon={<TrendingUp className="w-5 h-5" />} delay={150} />
      </div>

      {/* === KPI Cards Row 2 === */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <StatCard title="Total Pauses" value={formatNumber(totalPauses)} icon={<Pause className="w-5 h-5" />} delay={200} />
        <StatCard title="Total Seeks" value={formatNumber(totalSeeks)} icon={<ArrowRightLeft className="w-5 h-5" />} delay={250} />
        <StatCard title="CTA CTR" value={ctaCTR > 0 ? `${ctaCTR.toFixed(1)}%` : "--"} icon={<Target className="w-5 h-5" />} delay={300} />
        <StatCard title="Returning Viewers" value={formatNumber(returningViewers)} icon={<Users className="w-5 h-5" />} delay={350} />
      </div>

      {/* === Retention Curve === */}
      <Card className="mb-6">
        <CardTitle className="mb-4">Watch Time Curve</CardTitle>
        <CardContent>
          {retention.length > 0 ? (
            <>
              <div className="h-48 flex items-end gap-px">
                {retention.map((r: any) => {
                  const pct = (r.viewers / maxRetention) * 100;
                  return (
                    <div key={r.bucket ?? r.progress_bucket} className="flex-1 flex flex-col justify-end h-full">
                      <div
                        className="w-full rounded-t bg-gradient-to-t from-primary/50 to-primary transition-all hover:from-primary/70 hover:to-primary"
                        style={{ height: `${pct}%`, minHeight: r.viewers > 0 ? "2px" : "0" }}
                        title={`${r.bucket ?? r.progress_bucket}% : ${r.viewers} viewers`}
                      />
                    </div>
                  );
                })}
              </div>
              <div className="flex justify-between text-xs text-muted-foreground mt-2">
                <span>0%</span><span>25%</span><span>50%</span><span>75%</span><span>100%</span>
              </div>
              {biggestDropBucket >= 0 && (
                <p className="text-xs text-amber-400 mt-3">
                  Biggest drop-off at <span className="font-semibold">{biggestDropBucket}%</span> of the video ({biggestDropPct.toFixed(0)}% of viewers left here)
                </p>
              )}
            </>
          ) : (
            <div className="h-48 flex items-center justify-center text-muted-foreground border border-dashed border-border rounded-lg">
              No retention data yet
            </div>
          )}
        </CardContent>
      </Card>

      {/* === Heatmap === */}
      {heatmap.length > 0 && (
        <Card className="mb-6">
          <CardTitle className="mb-4">Engagement Heatmap</CardTitle>
          <CardContent>
            <div className="flex gap-0.5 h-10 rounded-lg overflow-hidden">
              {heatmap.map((h: any) => (
                <div
                  key={h.bucket}
                  className={`flex-1 ${heatmapColor(h.intensity || 0)} transition-all hover:opacity-80`}
                  title={`${h.bucket}% — ${h.viewers} viewers, ${h.pauses} pauses, ${h.seeks} seeks`}
                />
              ))}
            </div>
            <div className="flex justify-between text-xs text-muted-foreground mt-2">
              <span>0%</span><span>25%</span><span>50%</span><span>75%</span><span>100%</span>
            </div>
            <div className="flex items-center gap-2 mt-3 text-xs text-muted-foreground">
              <div className="flex items-center gap-1"><div className="w-3 h-3 rounded bg-red-500/60" /> Drop-off</div>
              <div className="flex items-center gap-1"><div className="w-3 h-3 rounded bg-amber-500/60" /> Medium</div>
              <div className="flex items-center gap-1"><div className="w-3 h-3 rounded bg-emerald-500/60" /> Engaged</div>
              <div className="flex items-center gap-1"><div className="w-3 h-3 rounded bg-emerald-400/80" /> Very engaged</div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* === Drop-off Funnel === */}
      {dropoff.length > 0 && (
        <Card className="mb-6">
          <CardTitle className="mb-4">Drop-off Funnel</CardTitle>
          <CardContent>
            <div className="space-y-1.5">
              {dropoff.map((d: any, i: number) => {
                const widthPct = (d.sessions / maxDropoff) * 100;
                const prevSessions = i > 0 ? dropoff[i - 1].sessions : d.sessions;
                const lossPct = prevSessions > 0 ? Math.round(((prevSessions - d.sessions) / prevSessions) * 100) : 0;
                // Color gradient from green to red
                const hue = Math.round((1 - i / Math.max(dropoff.length - 1, 1)) * 120);
                return (
                  <div key={d.bucket} className="flex items-center gap-3">
                    <span className="text-xs text-muted-foreground w-8 text-right">{d.bucket}%</span>
                    <div className="flex-1 h-7 bg-muted rounded overflow-hidden">
                      <div
                        className="h-full rounded transition-all"
                        style={{ width: `${widthPct}%`, backgroundColor: `hsl(${hue}, 70%, 50%)` }}
                        title={`${d.bucket}%: ${d.sessions} sessions`}
                      />
                    </div>
                    <span className="text-xs font-medium w-12 text-right">{d.sessions}</span>
                    {i > 0 && lossPct > 0 && (
                      <span className="text-xs text-red-400 w-10">-{lossPct}%</span>
                    )}
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* === Daily Stats (2 columns) === */}
      {daily.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          {/* Plays per day */}
          <Card>
            <CardTitle className="mb-4">Plays per Day</CardTitle>
            <CardContent>
              <div className="h-40 flex items-end gap-0.5">
                {daily.slice(-30).map((d: any, i: number) => (
                  <div key={i} className="flex-1">
                    <div
                      className="w-full bg-secondary/70 rounded-t hover:bg-secondary transition-all"
                      style={{ height: `${(d.plays / maxDailyPlays) * 140}px`, minHeight: d.plays > 0 ? "2px" : "0" }}
                      title={`${d.date}: ${d.plays} plays`}
                    />
                  </div>
                ))}
              </div>
              <div className="flex justify-between text-xs text-muted-foreground mt-2">
                <span>{daily[0]?.date}</span>
                <span>{daily[daily.length - 1]?.date}</span>
              </div>
            </CardContent>
          </Card>

          {/* CTA clicks per day */}
          <Card>
            <CardTitle className="mb-4">CTA Clicks per Day</CardTitle>
            <CardContent>
              <div className="h-40 flex items-end gap-0.5">
                {daily.slice(-30).map((d: any, i: number) => (
                  <div key={i} className="flex-1">
                    <div
                      className="w-full bg-primary/70 rounded-t hover:bg-primary transition-all"
                      style={{ height: `${maxDailyCTA > 0 ? (d.cta_clicks / maxDailyCTA) * 140 : 0}px`, minHeight: (d.cta_clicks || 0) > 0 ? "2px" : "0" }}
                      title={`${d.date}: ${d.cta_clicks || 0} CTA clicks`}
                    />
                  </div>
                ))}
              </div>
              <div className="flex justify-between text-xs text-muted-foreground mt-2">
                <span>{daily[0]?.date}</span>
                <span>{daily[daily.length - 1]?.date}</span>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* === Device Breakdown === */}
      {deviceTotal > 0 && (
        <Card className="mb-6">
          <CardTitle className="mb-4">Device Breakdown</CardTitle>
          <CardContent>
            <div className="flex gap-8 justify-center">
              {/* Desktop */}
              <div className="flex flex-col items-center gap-3">
                <div className="relative w-28 h-28">
                  <svg viewBox="0 0 36 36" className="w-28 h-28 -rotate-90">
                    <circle cx="18" cy="18" r="15.9" fill="none" stroke="currentColor" strokeWidth="3" className="text-muted" />
                    <circle cx="18" cy="18" r="15.9" fill="none" stroke="currentColor" strokeWidth="3" className="text-primary"
                      strokeDasharray={`${desktopPct} ${100 - desktopPct}`} strokeLinecap="round" />
                  </svg>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className="text-lg font-bold">{desktopPct}%</span>
                  </div>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <Monitor className="w-4 h-4 text-primary" />
                  <span>Desktop ({desktopCount})</span>
                </div>
              </div>

              {/* Mobile */}
              <div className="flex flex-col items-center gap-3">
                <div className="relative w-28 h-28">
                  <svg viewBox="0 0 36 36" className="w-28 h-28 -rotate-90">
                    <circle cx="18" cy="18" r="15.9" fill="none" stroke="currentColor" strokeWidth="3" className="text-muted" />
                    <circle cx="18" cy="18" r="15.9" fill="none" stroke="currentColor" strokeWidth="3" className="text-secondary"
                      strokeDasharray={`${mobilePct} ${100 - mobilePct}`} strokeLinecap="round" />
                  </svg>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className="text-lg font-bold">{mobilePct}%</span>
                  </div>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <Smartphone className="w-4 h-4 text-secondary" />
                  <span>Mobile ({mobileCount})</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* === A/B Variants === */}
      {variants.length >= 2 && (
        <Card>
          <CardTitle className="mb-4">A/B Comparison</CardTitle>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left py-2 px-3 text-muted-foreground font-medium">Variant</th>
                    <th className="text-right py-2 px-3 text-muted-foreground font-medium">Sessions</th>
                    <th className="text-right py-2 px-3 text-muted-foreground font-medium">Avg Watch</th>
                    <th className="text-right py-2 px-3 text-muted-foreground font-medium">Completion</th>
                    <th className="text-right py-2 px-3 text-muted-foreground font-medium">CTA Clicks</th>
                  </tr>
                </thead>
                <tbody>
                  {variants.map((v: any) => {
                    const isBest = bestVariant && v.variant_id === bestVariant.variant_id;
                    return (
                      <tr key={v.variant_id || "control"} className={`border-b border-border/50 ${isBest ? "bg-primary/5" : ""}`}>
                        <td className="py-2.5 px-3">
                          <div className="flex items-center gap-2">
                            <span className="font-medium">{v.variant_id || "Control"}</span>
                            {isBest && <Badge variant="success">Best</Badge>}
                          </div>
                        </td>
                        <td className="text-right py-2.5 px-3">{v.sessions}</td>
                        <td className="text-right py-2.5 px-3">{(v.avgProgress || 0).toFixed(0)}%</td>
                        <td className="text-right py-2.5 px-3">{(v.completionRate || 0).toFixed(1)}%</td>
                        <td className="text-right py-2.5 px-3">{v.ctaClicks || 0}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
