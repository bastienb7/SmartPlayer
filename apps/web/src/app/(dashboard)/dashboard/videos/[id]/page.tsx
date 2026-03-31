"use client";

import { use } from "react";
import Link from "next/link";
import { Card, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { StatCard } from "@/components/dashboard/stat-card";
import {
  Play, Eye, MousePointer, Clock, Code, Settings, BarChart3, Copy, Check, Type,
} from "lucide-react";
import { useState } from "react";
import { formatDuration, formatNumber } from "@/lib/utils";

// TODO: Replace with TanStack Query
const mockVideo = {
  id: "v1",
  title: "VSL - Product Launch 2025",
  status: "ready",
  duration: 634,
  width: 1920,
  height: 1080,
  hlsUrl: "https://cdn.smartplayer.io/org1/v1/hls/master.m3u8",
  posterUrl: "https://cdn.smartplayer.io/org1/v1/poster.jpg",
  createdAt: "2026-03-15T10:30:00Z",
};

const mockStats = {
  plays: 4523,
  viewers: 3210,
  ctaClicks: 423,
  avgProgress: 67,
};

export default function VideoDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [copied, setCopied] = useState(false);

  const embedCode = `<div id="smartplayer-${id}" data-api="https://api.smartplayer.io"></div>\n<script src="https://cdn.smartplayer.io/v1/sp.min.js" defer></script>`;

  const copyEmbed = () => {
    navigator.clipboard.writeText(embedCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <h1 className="text-2xl font-bold">{mockVideo.title}</h1>
            <Badge variant="success">{mockVideo.status}</Badge>
          </div>
          <p className="text-muted-foreground">
            {mockVideo.width}x{mockVideo.height} &middot; {formatDuration(mockVideo.duration)}
          </p>
        </div>
        <div className="flex gap-3">
          <Link href={`/dashboard/videos/${id}/headlines`}>
            <Button variant="outline">
              <Type className="w-4 h-4 mr-2" /> Headlines
            </Button>
          </Link>
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
        <StatCard title="Total Plays" value={formatNumber(mockStats.plays)} icon={<Play className="w-5 h-5" />} />
        <StatCard title="Unique Viewers" value={formatNumber(mockStats.viewers)} icon={<Eye className="w-5 h-5" />} />
        <StatCard title="CTA Clicks" value={formatNumber(mockStats.ctaClicks)} icon={<MousePointer className="w-5 h-5" />} />
        <StatCard title="Avg. Watch" value={`${mockStats.avgProgress}%`} icon={<Clock className="w-5 h-5" />} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Preview */}
        <Card>
          <CardTitle className="mb-4">Preview</CardTitle>
          <CardContent>
            <div className="aspect-video bg-black rounded-lg flex items-center justify-center">
              <Play className="w-12 h-12 text-muted-foreground" />
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
              Copy this code and paste it into your website to embed the player.
            </p>
            <div className="relative">
              <pre className="bg-muted rounded-lg p-4 text-sm text-foreground overflow-x-auto font-mono">
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
    </div>
  );
}
