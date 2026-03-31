export interface Video {
  id: string;
  orgId: string;
  title: string;
  status: "uploading" | "processing" | "ready" | "error";
  sourceUrl: string;
  hlsUrl?: string;
  posterUrl?: string;
  duration?: number;
  width?: number;
  height?: number;
  sizeBytes?: number;
  createdAt: string;
  updatedAt: string;
}

export interface VideoRendition {
  quality: "360p" | "480p" | "720p" | "1080p";
  url: string;
  width: number;
  height: number;
  bitrate: number;
}
