"use client";

import { use, useEffect, useState } from "react";
import Link from "next/link";
import { Card, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { StatCard } from "@/components/dashboard/stat-card";
import {
  Play, Eye, MousePointer, Clock, Code, Settings, BarChart3, Copy, Check,
  Type, Loader2, AlertCircle, Zap, MousePointer2, Repeat, Layers, Gauge,
  Timer, Shield,
} from "lucide-react";
import { useState as useLocalState } from "react";
import { formatDuration, formatNumber } from "@/lib/utils";
import { api } from "@/lib/api-client";

const featureLinks = [
  { href: "player", icon: Settings, label: "Player Settings" },
  { href: "headlines", icon: Type, label: "Headlines A/B" },
  { href: "ctas", icon: MousePointer, label: "CTAs" },
  { href: "exit-intent", icon: Zap, label: "Exit-Intent" },
  { href: "pixels", icon: Shield, label: "Pixels" },
  { href: "resume", icon: Repeat, label: "Resume Play" },
  { href: "chapters", icon: Layers, label: "Chapters" },
  { href: "countdown", icon: Timer, label: "Countdown" },
  { href: "social-proof", icon: MousePointer2, label: "Social Proof" },
  { href: "page-sync", icon: Gauge, label: "Page Sync" },
];

export default function VideoDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [video, setVideo] = useState<any>(null);
  const [stats, setStats] = useState({ plays: 0, viewers: 0, ctaClicks: 0, avgProgress: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    Promise.all([
      api.getVideo(id),
      api.getAnalyticsOverview({ videoId: id }).catch(() => null),
    ])
      .then(([videoData, analyticsData]) => {
        setVideo(videoData.video || videoData);
        if (analyticsData) {
          setStats({
            plays: analyticsData.totalPlays ?? 0,
            viewers: analyticsData.uniqueViewers ?? 0,
            ctaClicks: analyticsData.ctaClicks ?? 0,
            avgProgress: analyticsData.avgProgress ?? 0,
          });
        }
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [id]);

  const embedCode = `<div id="smartplayer-${id}"></div>\n<script src="/sp/smartplayer.min.js" data-video="${id}" defer></script>`;

  const copyEmbed = () => {
    navigator.clipboard.writeText(embedCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

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
        <AlertCircle className="w-5 h-5 flex-shrink-0" />
        <span>Could not load video: {error}</span>
      </div>
    );
  }

  if (!video) return null;

  const statusVariant: Record<string, any> = {
    ready: "success", processing: "warning", uploading: "info", error: "error",
  };

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <h1 className="text-2xl font-bold">{video.title}</h1>
            <Badge variant={statusVariant[video.status] || "default"}>{video.status}</Badge>
          </div>
          <p className="text-muted-foreground">
            {video.width && video.height ? `${video.width}x${video.height} · ` : ""}
            {video.duration > 0 ? formatDuration(video.duration) : "Processing..."}
          </p>
        </div>
        <div className="flex gap-3">
          <Link href={`/dashboard/videos/${id}/analytics`}>
            <Button variant="outline">
              <BarChart3 className="w-4 h-4 mr-2" /> Analytics
            </Button>
          </Link>
          <Link href={`/dashboard/videos/${id}/player`}>
            <Button variant="outline">
              <Settings className="w-4 h-4 mr-2" /> Player Settings
            </Button>
          </Link>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        <StatCard title="Total Plays" value={formatNumber(stats.plays)} icon={<Play className="w-5 h-5" />} delay={0} />
        <StatCard title="Unique Viewers" value={formatNumber(stats.viewers)} icon={<Eye className="w-5 h-5" />} delay={75} />
        <StatCard title="CTA Clicks" value={formatNumber(stats.ctaClicks)} icon={<MousePointer className="w-5 h-5" />} delay={150} />
        <StatCard title="Avg. Watch" value={`${stats.avgProgress.toFixed(0)}%`} icon={<Clock className="w-5 h-5" />} delay={225} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* Preview */}
        <Card>
          <CardTitle className="mb-4">Preview</CardTitle>
          <CardContent>
            <div className="aspect-video bg-black rounded-lg flex items-center justify-center overflow-hidden">
              {video.posterUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={video.posterUrl} alt={video.title} className="w-full h-full object-cover" />
              ) : (
                <Play className="w-12 h-12 text-muted-foreground" />
              )}
            </div>
          </CardContent>
        </Card>

        {/* Embed Code */}
        <Card>
          <CardTitle className="flex items-center gap-2 mb-4">
            <Code className="w-5 h-5" /> Embed Code
          </CardTitle>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-4">
              Copy and paste this into your webpage to embed the SmartPlayer.
            </p>
            <div className="relative">
              <pre className="bg-muted rounded-lg p-4 text-xs text-foreground overflow-x-auto font-mono leading-relaxed">
                {embedCode}
              </pre>
              <Button
                variant="secondary"
                size="sm"
                className="absolute top-3 right-3"
                onClick={copyEmbed}
              >
                {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Feature editors */}
      <Card>
        <CardTitle className="mb-4">Features</CardTitle>
        <CardContent>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
            {featureLinks.map((f) => (
              <Link
                key={f.href}
                href={`/dashboard/videos/${id}/${f.href}`}
                className="flex flex-col items-center gap-2 p-4 rounded-xl border border-border hover:border-primary/40 hover:bg-primary/5 transition-all group"
              >
                <f.icon className="w-5 h-5 text-muted-foreground group-hover:text-primary transition-colors" />
                <span className="text-xs font-medium text-center">{f.label}</span>
              </Link>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
