"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardTitle, CardContent } from "@/components/ui/card";
import { Upload, Film, CheckCircle, Loader2 } from "lucide-react";
import { api } from "@/lib/api-client";

type UploadState = "idle" | "selected" | "uploading" | "processing" | "done" | "error";

export default function UploadPage() {
  const router = useRouter();
  const [file, setFile] = useState<File | null>(null);
  const [title, setTitle] = useState("");
  const [state, setState] = useState<UploadState>("idle");
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState("");

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    const dropped = e.dataTransfer.files[0];
    if (dropped?.type.startsWith("video/")) {
      setFile(dropped);
      setTitle(dropped.name.replace(/\.[^.]+$/, ""));
      setState("selected");
    }
  }, []);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0];
    if (selected) {
      setFile(selected);
      setTitle(selected.name.replace(/\.[^.]+$/, ""));
      setState("selected");
    }
  };

  const handleUpload = async () => {
    if (!file || !title) return;

    try {
      setState("uploading");
      setProgress(10);

      // 1. Create video record + get presigned URL
      const { video, uploadUrl } = await api.createVideo({
        title,
        contentType: file.type || "video/mp4",
      });

      setProgress(20);

      // 2. Upload file directly to S3
      await fetch(uploadUrl, {
        method: "PUT",
        body: file,
        headers: { "Content-Type": file.type || "video/mp4" },
      });

      setProgress(80);

      // 3. Confirm upload → triggers transcoding
      setState("processing");
      await api.confirmUpload(video.id);
      setProgress(80);

      // 4. Poll status every 3s until ready or error
      const videoId = video.id;
      const poll = setInterval(async () => {
        try {
          const data = await api.getVideo(videoId);
          const v = data.video || data;
          if (v.status === "ready") {
            clearInterval(poll);
            setProgress(100);
            setState("done");
            setTimeout(() => router.push(`/dashboard/videos/${videoId}`), 1500);
          } else if (v.status === "error") {
            clearInterval(poll);
            setState("error");
            setError("Transcoding failed. Please try uploading again.");
          }
        } catch { /* ignore polling errors */ }
      }, 3000);

      // Safety: stop polling after 10 minutes
      setTimeout(() => clearInterval(poll), 600_000);
    } catch (err: any) {
      setState("error");
      setError(err.message || "Upload failed");
    }
  };

  return (
    <div className="max-w-2xl">
      <div className="mb-8">
        <h1 className="text-2xl font-bold">Upload Video</h1>
        <p className="text-muted-foreground">Upload a video to start using SmartPlayer features.</p>
      </div>

      {/* Drop zone */}
      {state === "idle" && (
        <Card
          className="border-2 border-dashed border-border hover:border-primary/50 transition-colors cursor-pointer"
          onDragOver={(e) => e.preventDefault()}
          onDrop={handleDrop}
          onClick={() => document.getElementById("file-input")?.click()}
        >
          <div className="flex flex-col items-center gap-4 py-12">
            <Upload className="w-12 h-12 text-muted-foreground" />
            <div className="text-center">
              <p className="font-medium">Drop your video here or click to browse</p>
              <p className="text-sm text-muted-foreground mt-1">MP4, MOV, WebM up to 5GB</p>
            </div>
          </div>
          <input
            id="file-input"
            type="file"
            accept="video/*"
            className="hidden"
            onChange={handleFileSelect}
          />
        </Card>
      )}

      {/* Selected / Uploading */}
      {state !== "idle" && (
        <Card>
          <CardContent>
            <div className="flex items-center gap-4 mb-6">
              <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center">
                {state === "done" ? (
                  <CheckCircle className="w-6 h-6 text-success" />
                ) : (
                  <Film className="w-6 h-6 text-primary" />
                )}
              </div>
              <div className="flex-1">
                <p className="font-medium">{file?.name}</p>
                <p className="text-sm text-muted-foreground">
                  {file && `${(file.size / 1_000_000).toFixed(1)} MB`}
                  {state === "processing" && " — Transcoding..."}
                  {state === "done" && " — Ready!"}
                </p>
              </div>
            </div>

            {/* Title input */}
            {(state === "selected" || state === "error") && (
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium mb-1.5 block">Video Title</label>
                  <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="My amazing video" />
                </div>
                {error && <p className="text-sm text-destructive">{error}</p>}
                <Button onClick={handleUpload} disabled={!title} className="w-full">
                  <Upload className="w-4 h-4 mr-2" /> Upload & Process
                </Button>
              </div>
            )}

            {/* Progress bar */}
            {(state === "uploading" || state === "processing") && (
              <div className="space-y-3">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">
                    {state === "uploading" ? "Uploading..." : "Transcoding to HLS..."}
                  </span>
                  <span className="font-medium">{progress}%</span>
                </div>
                <div className="h-2 bg-muted rounded-full overflow-hidden">
                  <div
                    className="h-full bg-primary rounded-full transition-all duration-500"
                    style={{ width: `${progress}%` }}
                  />
                </div>
                {state === "processing" && (
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Generating HLS renditions (360p, 480p, 720p, 1080p)...
                    </div>
                    <p className="text-xs text-muted-foreground">
                      This takes 1-3 minutes depending on video size. You can leave this page — transcoding continues in the background.
                    </p>
                  </div>
                )}
              </div>
            )}

            {state === "done" && (
              <p className="text-sm text-success font-medium">
                Video uploaded successfully! Redirecting to video settings...
              </p>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
