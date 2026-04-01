"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Upload, Play, Clock, MoreVertical, Loader2, AlertCircle } from "lucide-react";
import { formatDuration, formatDate } from "@/lib/utils";
import { api } from "@/lib/api-client";

interface Video {
  id: string;
  title: string;
  status: "uploading" | "processing" | "ready" | "error";
  duration: number;
  createdAt: string;
  plays?: number;
  thumbnailUrl?: string;
  features?: string[];
}

const statusBadge = {
  ready: { variant: "success" as const, label: "Ready" },
  processing: { variant: "warning" as const, label: "Processing" },
  uploading: { variant: "info" as const, label: "Uploading" },
  error: { variant: "error" as const, label: "Error" },
};

const featureColors: Record<string, string> = {
  Autoplay: "bg-emerald-500/15 text-emerald-400 border-emerald-500/20",
  "Smart Progress": "bg-blue-500/15 text-blue-400 border-blue-500/20",
  Resume: "bg-violet-500/15 text-violet-400 border-violet-500/20",
  CTA: "bg-amber-500/15 text-amber-400 border-amber-500/20",
  "Exit-Intent": "bg-rose-500/15 text-rose-400 border-rose-500/20",
  Pixels: "bg-cyan-500/15 text-cyan-400 border-cyan-500/20",
  Headlines: "bg-pink-500/15 text-pink-400 border-pink-500/20",
  Analytics: "bg-slate-500/15 text-slate-400 border-slate-500/20",
  "Mini-Hook": "bg-orange-500/15 text-orange-400 border-orange-500/20",
  "Turbo Speed": "bg-indigo-500/15 text-indigo-400 border-indigo-500/20",
  Recovery: "bg-teal-500/15 text-teal-400 border-teal-500/20",
  Chapters: "bg-purple-500/15 text-purple-400 border-purple-500/20",
  Countdown: "bg-red-500/15 text-red-400 border-red-500/20",
  "Social Proof": "bg-yellow-500/15 text-yellow-400 border-yellow-500/20",
  "Page Sync": "bg-lime-500/15 text-lime-400 border-lime-500/20",
};

export default function VideosPage() {
  const [videos, setVideos] = useState<Video[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    api.getVideosWithFeatures()
      .then((data) => setVideos((data.videos || []).map((v: any) => ({
        ...v,
        createdAt: v.createdAt || v.created_at,
        thumbnailUrl: v.thumbnailUrl || v.poster_url || v.posterUrl,
        features: v.features || [],
      }))))
      .catch(() => {
        // Fallback to regular endpoint if new one not available
        return api.getVideos().then((data) => setVideos((data.videos || []).map((v: any) => ({
          ...v,
          createdAt: v.createdAt || v.created_at,
          thumbnailUrl: v.thumbnailUrl || v.poster_url || v.posterUrl,
          features: [],
        }))));
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  // Auto-refresh while videos are processing
  useEffect(() => {
    const hasProcessing = videos.some((v) => v.status === "processing" || v.status === "uploading");
    if (!hasProcessing) return;
    const interval = setInterval(() => {
      api.getVideosWithFeatures()
        .catch(() => api.getVideos())
        .then((data) => setVideos((data.videos || []).map((v: any) => ({
          ...v,
          createdAt: v.createdAt || v.created_at,
          thumbnailUrl: v.thumbnailUrl || v.poster_url || v.posterUrl,
          features: v.features || [],
        }))))
        .catch(() => {});
    }, 5000);
    return () => clearInterval(interval);
  }, [videos]);

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold">Videos</h1>
          <p className="text-muted-foreground">Manage your video library.</p>
        </div>
        <Link href="/dashboard/videos/upload">
          <Button>
            <Upload className="w-4 h-4 mr-2" /> Upload Video
          </Button>
        </Link>
      </div>

      {loading && (
        <div className="flex items-center justify-center py-24">
          <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
        </div>
      )}

      {error && (
        <div className="flex items-center gap-3 p-4 rounded-lg bg-destructive/10 border border-destructive/30 text-destructive text-sm">
          <AlertCircle className="w-5 h-5 flex-shrink-0" />
          <span>Could not load videos: {error}</span>
        </div>
      )}

      {!loading && !error && videos.length === 0 && (
        <Card className="flex flex-col items-center gap-4 py-16 border-dashed">
          <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center">
            <Play className="w-8 h-8 text-muted-foreground" />
          </div>
          <div className="text-center">
            <p className="font-semibold">No videos yet</p>
            <p className="text-sm text-muted-foreground mt-1">Upload your first video to get started.</p>
          </div>
          <Link href="/dashboard/videos/upload">
            <Button>
              <Upload className="w-4 h-4 mr-2" /> Upload Video
            </Button>
          </Link>
        </Card>
      )}

      {!loading && !error && videos.length > 0 && (
        <div className="grid gap-4">
          {videos.map((video) => {
            const badge = statusBadge[video.status] || statusBadge.error;
            return (
              <Link key={video.id} href={`/dashboard/videos/${video.id}`}>
                <Card className="flex items-center gap-6 hover:border-primary/30 transition-colors cursor-pointer">
                  {/* Thumbnail */}
                  <div className="w-48 h-28 bg-muted rounded-lg flex items-center justify-center flex-shrink-0 overflow-hidden">
                    {video.thumbnailUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={video.thumbnailUrl} alt={video.title} className="w-full h-full object-cover" />
                    ) : (
                      <Play className="w-8 h-8 text-muted-foreground" />
                    )}
                  </div>
                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 mb-1">
                      <h3 className="text-base font-semibold truncate">{video.title}</h3>
                      <Badge variant={badge.variant}>{badge.label}</Badge>
                    </div>
                    <div className="flex items-center gap-4 text-sm text-muted-foreground mb-2">
                      {video.duration > 0 && (
                        <span className="flex items-center gap-1">
                          <Clock className="w-3.5 h-3.5" /> {formatDuration(video.duration)}
                        </span>
                      )}
                      <span>{formatDate(video.createdAt)}</span>
                      {(video.plays ?? 0) > 0 && <span>{video.plays!.toLocaleString()} plays</span>}
                    </div>
                    {/* Features */}
                    {video.features && video.features.length > 0 && (
                      <div className="flex flex-wrap gap-1.5">
                        {video.features.map((f) => (
                          <span
                            key={f}
                            className={`text-[10px] font-medium px-2 py-0.5 rounded-full border ${featureColors[f] || "bg-muted text-muted-foreground border-border"}`}
                          >
                            {f}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                  {/* Actions */}
                  <button className="p-2 hover:bg-muted rounded-lg" onClick={(e) => e.preventDefault()}>
                    <MoreVertical className="w-5 h-5 text-muted-foreground" />
                  </button>
                </Card>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
