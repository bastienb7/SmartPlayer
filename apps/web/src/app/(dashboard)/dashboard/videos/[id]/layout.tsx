"use client";

import { use, useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ArrowLeft, ChevronRight } from "lucide-react";
import { api } from "@/lib/api-client";

const featureNames: Record<string, string> = {
  player: "Player Settings",
  headlines: "Headlines A/B",
  cta: "CTAs",
  "exit-intent": "Exit-Intent",
  pixels: "Tracking Pixels",
  resume: "Resume Play",
  chapters: "Chapters",
  countdown: "Countdown",
  "social-proof": "Social Proof",
  "page-sync": "Page Sync",
  "traffic-filter": "Traffic Filter",
  playback: "Playback Options",
  polls: "Interactive Polls",
  analytics: "Analytics",
};

export default function VideoDetailLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const pathname = usePathname();
  const [videoTitle, setVideoTitle] = useState("");

  useEffect(() => {
    api.getVideo(id)
      .then((data) => {
        const v = data.video || data;
        setVideoTitle(v.title || "");
      })
      .catch(() => {});
  }, [id]);

  // Determine if we're on a sub-page (feature page) or the main video detail
  const segments = pathname.split("/").filter(Boolean);
  // /dashboard/videos/[id] = 3 segments, /dashboard/videos/[id]/player = 4 segments
  const isSubPage = segments.length > 3;
  const currentFeature = isSubPage ? segments[segments.length - 1] : null;
  const featureLabel = currentFeature ? featureNames[currentFeature] || currentFeature : null;

  return (
    <div>
      {/* Navigation bar — always visible */}
      <div className="flex items-center gap-2 mb-6 text-sm">
        <Link
          href="/dashboard/videos"
          className="text-muted-foreground hover:text-foreground transition-colors"
        >
          Videos
        </Link>
        <ChevronRight className="w-3.5 h-3.5 text-muted-foreground" />
        <Link
          href={`/dashboard/videos/${id}`}
          className={`transition-colors ${isSubPage ? "text-muted-foreground hover:text-foreground" : "text-foreground font-medium"}`}
        >
          {videoTitle || "Video"}
        </Link>
        {featureLabel && (
          <>
            <ChevronRight className="w-3.5 h-3.5 text-muted-foreground" />
            <span className="text-foreground font-medium">{featureLabel}</span>
          </>
        )}
      </div>

      {/* Back button for sub-pages */}
      {isSubPage && (
        <Link
          href={`/dashboard/videos/${id}`}
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors mb-4"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to video
        </Link>
      )}

      {children}
    </div>
  );
}
