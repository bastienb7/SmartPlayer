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
}

const statusBadge = {
  ready: { variant: "success" as const, label: "● Ready" },
  processing: { variant: "warning" as const, label: "◌ Processing" },
  uploading: { variant: "info" as const, label: "↑ Uploading" },
  error: { variant: "error" as const, label: "✕ Error" },
};

export default function VideosPage() {
  const [videos, setVideos] = useState<Video[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    api.getVideos()
      .then((data) => setVideos((data.videos || []).map((v: any) => ({
        ...v,
        createdAt: v.createdAt || v.created_at,
        thumbnailUrl: v.thumbnailUrl || v.poster_url || v.posterUrl,
      }))))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

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
                  <div className="w-40 h-24 bg-muted rounded-lg flex items-center justify-center flex-shrink-0 overflow-hidden">
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
                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      {video.duration > 0 && (
                        <span className="flex items-center gap-1">
                          <Clock className="w-3.5 h-3.5" /> {formatDuration(video.duration)}
                        </span>
                      )}
                      <span>{formatDate(video.createdAt)}</span>
                      {(video.plays ?? 0) > 0 && <span>{video.plays!.toLocaleString()} plays</span>}
                    </div>
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
