"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Upload, Play, Clock, MoreVertical } from "lucide-react";
import { formatDuration, formatDate } from "@/lib/utils";

// TODO: Replace with TanStack Query + api.getVideos()
const mockVideos = [
  { id: "v1", title: "VSL - Product Launch 2025", status: "ready", duration: 634, createdAt: "2026-03-15T10:30:00Z", plays: 4523 },
  { id: "v2", title: "Webinar Replay - Marketing Masterclass", status: "ready", duration: 3245, createdAt: "2026-03-20T14:00:00Z", plays: 1203 },
  { id: "v3", title: "Sales Page Hero Video", status: "processing", duration: 0, createdAt: "2026-03-30T09:15:00Z", plays: 0 },
];

const statusBadge = {
  ready: { variant: "success" as const, label: "Ready" },
  processing: { variant: "warning" as const, label: "Processing" },
  uploading: { variant: "info" as const, label: "Uploading" },
  error: { variant: "error" as const, label: "Error" },
};

export default function VideosPage() {
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

      {/* Video Grid */}
      <div className="grid gap-4">
        {mockVideos.map((video) => {
          const badge = statusBadge[video.status as keyof typeof statusBadge];
          return (
            <Link key={video.id} href={`/dashboard/videos/${video.id}`}>
              <Card className="flex items-center gap-6 hover:border-primary/30 transition-colors cursor-pointer">
                {/* Thumbnail */}
                <div className="w-40 h-24 bg-muted rounded-lg flex items-center justify-center flex-shrink-0">
                  <Play className="w-8 h-8 text-muted-foreground" />
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
                    {video.plays > 0 && <span>{video.plays.toLocaleString()} plays</span>}
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
    </div>
  );
}
