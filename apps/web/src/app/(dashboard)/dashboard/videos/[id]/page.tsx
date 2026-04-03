"use client";

import { use, useEffect, useState, useRef } from "react";
import Link from "next/link";
import { Card, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { StatCard } from "@/components/dashboard/stat-card";
import {
  Play, Eye, MousePointer, Clock, Code, Settings, BarChart3, Copy, Check,
  Type, Loader2, AlertCircle, Zap, MousePointer2, Repeat, Layers, Gauge,
  Timer, Shield, Filter,
} from "lucide-react";
import { formatDuration, formatNumber } from "@/lib/utils";
import { api } from "@/lib/api-client";

const featureLinks = [
  { href: "player", icon: Settings, label: "Player Settings" },
  { href: "headlines", icon: Type, label: "Headlines A/B" },
  { href: "cta", icon: MousePointer, label: "CTAs" },
  { href: "exit-intent", icon: Zap, label: "Exit-Intent" },
  { href: "pixels", icon: Shield, label: "Pixels" },
  { href: "resume", icon: Repeat, label: "Resume Play" },
  { href: "chapters", icon: Layers, label: "Chapters" },
  { href: "countdown", icon: Timer, label: "Countdown" },
  { href: "social-proof", icon: MousePointer2, label: "Social Proof" },
  { href: "page-sync", icon: Gauge, label: "Page Sync" },
  { href: "traffic-filter", icon: Filter, label: "Traffic Filter" },
];

function VideoPlayer({ src, posterUrl }: { src?: string; posterUrl?: string }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const hlsRef = useRef<any>(null);

  useEffect(() => {
    const video = videoRef.current;
    if (!video || !src) return;

    const isHLS = src.includes(".m3u8");

    if (isHLS) {
      // Dynamic import to avoid SSR issues
      import("hls.js").then(({ default: Hls }) => {
        if (Hls.isSupported()) {
          const hls = new Hls({ startLevel: -1 });
          hlsRef.current = hls;
          hls.loadSource(src);
          hls.attachMedia(video);
        } else if (video.canPlayType("application/vnd.apple.mpegurl")) {
          video.src = src;
        }
      }).catch(() => {
        // Fallback: try native
        video.src = src;
      });
    } else {
      // Direct MP4 or other format
      video.src = src;
    }

    return () => {
      if (hlsRef.current) {
        hlsRef.current.destroy();
        hlsRef.current = null;
      }
    };
  }, [src]);

  return (
    <video
      ref={videoRef}
      controls
      playsInline
      poster={posterUrl}
      className="w-full h-full rounded-lg bg-black"
    />
  );
}

export default function VideoDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [video, setVideo] = useState<any>(null);
  const [stats, setStats] = useState({ plays: 0, viewers: 0, ctaClicks: 0, avgProgress: 0 });
  const [activeFeatures, setActiveFeatures] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    Promise.all([
      api.getVideo(id),
      api.getAnalyticsOverview({ videoId: id }).catch(() => null),
      api.getPlayerConfig(id).catch(() => null),
    ])
      .then(([videoData, analyticsData, playerConfig]) => {
        const v = videoData.video || videoData;
        setVideo({
          ...v,
          hlsUrl: v.hlsUrl || v.hls_url,
          posterUrl: v.posterUrl || v.poster_url,
          sourceKey: v.sourceKey || v.source_key,
          sizeBytes: v.sizeBytes || v.size_bytes,
          createdAt: v.createdAt || v.created_at,
          updatedAt: v.updatedAt || v.updated_at,
        });

        // Determine which features are active
        if (playerConfig) {
          const active = new Set<string>();
          // Player settings is always "active"
          active.add("player");
          const p = playerConfig;
          if (p.autoplayConfig?.enabled) active.add("player");
          const headlines = p.headlinesConfig;
          if (headlines && headlines.variants && headlines.variants.length > 0) active.add("headlines");
          const ctas = p.ctaConfig;
          if (Array.isArray(ctas) && ctas.length > 0) active.add("cta");
          const exit = p.exitIntentConfig;
          if (exit && (exit.enabled || exit.message)) active.add("exit-intent");
          const pxls = p.pixelConfig;
          if (Array.isArray(pxls) && pxls.length > 0) active.add("pixels");
          if (p.resumePlayConfig?.enabled) active.add("resume");
          const chapters = p.chaptersConfig;
          if (Array.isArray(chapters) && chapters.length > 0) active.add("chapters");
          const countdown = p.countdownConfig;
          if (countdown && countdown.enabled) active.add("countdown");
          const social = p.socialProofConfig;
          if (Array.isArray(social) && social.length > 0) active.add("social-proof");
          const pageSync = p.pageSyncConfig;
          if (Array.isArray(pageSync) && pageSync.length > 0) active.add("page-sync");
          const traffic = p.trafficFilterConfig;
          if (traffic && traffic.enabled) active.add("traffic-filter");
          if (p.analyticsEnabled) active.add("player");
          setActiveFeatures(active);
        }
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

  const baseUrl = typeof window !== "undefined" ? window.location.origin : "";
  const embedCode = `<div id="smartplayer-${id}" data-api="${baseUrl}"></div>\n<script src="${baseUrl}/sp/smartplayer.min.js" defer></script>`;

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
            <div className="aspect-video bg-black rounded-lg overflow-hidden">
              {video.status === "ready" && video.hlsUrl ? (
                <VideoPlayer src={video.hlsUrl} posterUrl={video.posterUrl} />
              ) : video.posterUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={video.posterUrl} alt={video.title} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  {video.status === "processing" ? (
                    <div className="flex flex-col items-center gap-2">
                      <Loader2 className="w-10 h-10 animate-spin text-muted-foreground" />
                      <span className="text-sm text-muted-foreground">Transcoding...</span>
                    </div>
                  ) : (
                    <Play className="w-12 h-12 text-muted-foreground" />
                  )}
                </div>
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
            {featureLinks.map((f) => {
              const isActive = activeFeatures.has(f.href);
              return (
                <Link
                  key={f.href}
                  href={`/dashboard/videos/${id}/${f.href}`}
                  className={`relative flex flex-col items-center gap-2 p-4 rounded-xl border transition-all group ${
                    isActive
                      ? "border-primary/30 bg-primary/5 hover:border-primary/50 hover:bg-primary/10"
                      : "border-border hover:border-border hover:bg-white/[0.02]"
                  }`}
                >
                  {isActive && (
                    <div className="absolute top-2 right-2 w-2 h-2 rounded-full bg-primary" />
                  )}
                  <f.icon className={`w-5 h-5 transition-colors ${
                    isActive
                      ? "text-primary"
                      : "text-muted-foreground group-hover:text-foreground"
                  }`} />
                  <span className={`text-xs font-medium text-center ${isActive ? "text-foreground" : ""}`}>{f.label}</span>
                  {isActive && (
                    <span className="text-[9px] text-primary font-medium">Active</span>
                  )}
                </Link>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
