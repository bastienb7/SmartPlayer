"use client";

import { useState, useCallback, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Upload, Film, CheckCircle, Loader2, FolderPlus, Folder, Play, Clock,
  Search, Grid3X3, List, Trash2, X, Plus, Tag, AlertCircle,
} from "lucide-react";
import { formatDuration, formatDate } from "@/lib/utils";
import { api } from "@/lib/api-client";

type UploadState = "idle" | "selected" | "uploading" | "processing" | "done" | "error";

const categories = [
  { value: "all", label: "All", color: "" },
  { value: "hook", label: "Hook", color: "bg-violet-500/20 text-violet-400 border-violet-500/30" },
  { value: "body", label: "Body", color: "bg-blue-500/20 text-blue-400 border-blue-500/30" },
  { value: "cta", label: "CTA", color: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30" },
  { value: "bonus", label: "Bonus", color: "bg-amber-500/20 text-amber-400 border-amber-500/30" },
  { value: "custom", label: "Custom", color: "bg-slate-500/20 text-slate-400 border-slate-500/30" },
];

export default function UploadPage() {
  const router = useRouter();

  // Upload state
  const [file, setFile] = useState<File | null>(null);
  const [title, setTitle] = useState("");
  const [uploadCategory, setUploadCategory] = useState("custom");
  const [state, setState] = useState<UploadState>("idle");
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState("");

  // Library state
  const [videos, setVideos] = useState<any[]>([]);
  const [folders, setFolders] = useState<any[]>([]);
  const [loadingLib, setLoadingLib] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterCategory, setFilterCategory] = useState("all");
  const [filterFolder, setFilterFolder] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [showNewFolder, setShowNewFolder] = useState(false);
  const [newFolderName, setNewFolderName] = useState("");

  // Load library
  useEffect(() => {
    Promise.all([
      api.getVideos().catch(() => ({ videos: [] })),
      api.getFolders().catch(() => ({ folders: [] })),
    ]).then(([vData, fData]) => {
      setVideos((vData.videos || []).map((v: any) => ({
        ...v,
        createdAt: v.createdAt || v.created_at,
        posterUrl: v.posterUrl || v.poster_url,
        category: v.category || "custom",
      })));
      setFolders(fData.folders || []);
    }).finally(() => setLoadingLib(false));
  }, []);

  // Upload handlers
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
      const { video, uploadUrl } = await api.createVideo({ title, contentType: file.type || "video/mp4" });
      setProgress(20);
      await fetch(uploadUrl, { method: "PUT", body: file, headers: { "Content-Type": file.type || "video/mp4" } });
      setProgress(75);

      // Set category
      if (uploadCategory !== "custom") {
        await api.organizeVideo(video.id, { category: uploadCategory }).catch(() => {});
      }

      setState("processing");
      await api.confirmUpload(video.id);
      setProgress(80);

      const videoId = video.id;
      const poll = setInterval(async () => {
        try {
          const data = await api.getVideo(videoId);
          const v = data.video || data;
          if (v.status === "ready") {
            clearInterval(poll);
            setProgress(100);
            setState("done");
            // Add to local library
            setVideos((prev) => [{ ...v, createdAt: v.created_at, posterUrl: v.poster_url, category: uploadCategory }, ...prev]);
            setTimeout(() => { setState("idle"); setFile(null); setTitle(""); }, 3000);
          } else if (v.status === "error") {
            clearInterval(poll);
            setState("error");
            setError("Transcoding failed.");
          }
        } catch { /* ignore */ }
      }, 3000);
      setTimeout(() => clearInterval(poll), 600_000);
    } catch (err: any) {
      setState("error");
      setError(err.message || "Upload failed");
    }
  };

  const handleCreateFolder = async () => {
    if (!newFolderName.trim()) return;
    try {
      const data = await api.createFolder({ name: newFolderName });
      setFolders([...folders, data.folder]);
      setNewFolderName("");
      setShowNewFolder(false);
    } catch { /* ignore */ }
  };

  const handleDeleteFolder = async (folderId: string) => {
    if (!confirm("Delete this folder? Videos inside won't be deleted.")) return;
    await api.deleteFolder(folderId).catch(() => {});
    setFolders(folders.filter((f) => f.id !== folderId));
    if (filterFolder === folderId) setFilterFolder(null);
  };

  const handleMoveToFolder = async (videoId: string, folderId: string | null) => {
    await api.organizeVideo(videoId, { folder_id: folderId }).catch(() => {});
    setVideos(videos.map((v) => v.id === videoId ? { ...v, folder_id: folderId } : v));
  };

  const handleSetCategory = async (videoId: string, category: string) => {
    await api.organizeVideo(videoId, { category }).catch(() => {});
    setVideos(videos.map((v) => v.id === videoId ? { ...v, category } : v));
  };

  // Filtered videos
  const filtered = videos.filter((v) => {
    if (searchQuery && !v.title?.toLowerCase().includes(searchQuery.toLowerCase())) return false;
    if (filterCategory !== "all" && v.category !== filterCategory) return false;
    if (filterFolder && v.folder_id !== filterFolder) return false;
    if (filterFolder === "__none__" && v.folder_id) return false;
    return true;
  });

  const getCatStyle = (cat: string) => categories.find((c) => c.value === cat)?.color || categories[5].color;

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold">Video Library</h1>
          <p className="text-muted-foreground">Upload, organize, and manage all your videos.</p>
        </div>
      </div>

      {/* ===== UPLOAD SECTION ===== */}
      <Card className="mb-8">
        <CardTitle className="flex items-center gap-2 mb-4">
          <Upload className="w-5 h-5 text-primary" /> Upload New Video
        </CardTitle>
        <CardContent className="p-0">
          {state === "idle" && (
            <div
              className="border-2 border-dashed border-border hover:border-primary/50 transition-colors cursor-pointer rounded-lg p-8"
              onDragOver={(e) => e.preventDefault()}
              onDrop={handleDrop}
              onClick={() => document.getElementById("file-input")?.click()}
            >
              <div className="flex flex-col items-center gap-3">
                <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center">
                  <Upload className="w-7 h-7 text-primary" />
                </div>
                <div className="text-center">
                  <p className="font-medium">Drop your video here or click to browse</p>
                  <p className="text-sm text-muted-foreground mt-1">MP4, MOV, WebM &middot; Up to 5GB &middot; Auto-transcoded to HLS multi-quality</p>
                </div>
              </div>
              <input id="file-input" type="file" accept="video/*" className="hidden" onChange={handleFileSelect} />
            </div>
          )}

          {state === "selected" && (
            <div className="space-y-4">
              <div className="flex items-center gap-4 p-3 bg-muted/30 rounded-lg">
                <Film className="w-8 h-8 text-primary flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="font-medium truncate">{file?.name}</p>
                  <p className="text-xs text-muted-foreground">{file && `${(file.size / 1_000_000).toFixed(1)} MB`}</p>
                </div>
                <Button variant="ghost" size="icon" onClick={() => { setState("idle"); setFile(null); }}>
                  <X className="w-4 h-4" />
                </Button>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium mb-1.5 block">Video Title</label>
                  <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="My amazing video" />
                </div>
                <div>
                  <label className="text-sm font-medium mb-1.5 block">Category</label>
                  <select value={uploadCategory} onChange={(e) => setUploadCategory(e.target.value)} className="w-full h-10 rounded-lg border border-border bg-background px-3 text-sm">
                    {categories.filter((c) => c.value !== "all").map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
                  </select>
                </div>
              </div>
              {error && <div className="flex items-center gap-2 text-sm text-destructive"><AlertCircle className="w-4 h-4" /> {error}</div>}
              <Button onClick={handleUpload} disabled={!title} className="w-full">
                <Upload className="w-4 h-4 mr-2" /> Upload & Transcode
              </Button>
            </div>
          )}

          {(state === "uploading" || state === "processing") && (
            <div className="space-y-3 p-2">
              <div className="flex items-center gap-4">
                <Loader2 className="w-6 h-6 animate-spin text-primary flex-shrink-0" />
                <div className="flex-1">
                  <p className="font-medium text-sm">{state === "uploading" ? "Uploading..." : "Transcoding to HLS..."}</p>
                  <p className="text-xs text-muted-foreground">{file?.name} &middot; {file && `${(file.size / 1_000_000).toFixed(1)} MB`}</p>
                </div>
                <span className="text-sm font-medium text-primary">{progress}%</span>
              </div>
              <div className="h-2 bg-muted rounded-full overflow-hidden">
                <div className="h-full bg-primary rounded-full transition-all duration-500" style={{ width: `${progress}%` }} />
              </div>
              {state === "processing" && (
                <p className="text-xs text-muted-foreground">Generating 360p, 480p, 720p, 1080p. Takes 1-3 min. You can leave this page.</p>
              )}
            </div>
          )}

          {state === "done" && (
            <div className="flex items-center gap-3 p-3 bg-primary/10 rounded-lg">
              <CheckCircle className="w-6 h-6 text-primary" />
              <div>
                <p className="text-sm font-medium text-primary">Video uploaded and transcoded successfully!</p>
                <p className="text-xs text-muted-foreground">It will appear in your library below.</p>
              </div>
            </div>
          )}

          {state === "error" && (
            <div className="flex items-center gap-3 p-3">
              <AlertCircle className="w-5 h-5 text-destructive" />
              <p className="text-sm text-destructive">{error}</p>
              <Button variant="outline" size="sm" onClick={() => { setState("idle"); setError(""); }}>Retry</Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* ===== LIBRARY ===== */}
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold">Library ({videos.length} videos)</h2>
        <div className="flex items-center gap-2">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="Search..." className="pl-8 w-48 h-9" />
          </div>
          {/* View toggle */}
          <div className="flex border border-border rounded-lg overflow-hidden">
            <button onClick={() => setViewMode("grid")} className={`p-2 ${viewMode === "grid" ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-muted"}`}>
              <Grid3X3 className="w-4 h-4" />
            </button>
            <button onClick={() => setViewMode("list")} className={`p-2 ${viewMode === "list" ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-muted"}`}>
              <List className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Category filters */}
      <div className="flex gap-2 mb-4 flex-wrap">
        {categories.map((c) => (
          <button
            key={c.value}
            onClick={() => setFilterCategory(c.value)}
            className={`text-xs px-3 py-1.5 rounded-full border transition-colors ${filterCategory === c.value ? "bg-primary text-white border-primary" : "border-border bg-background hover:bg-muted"}`}
          >
            {c.label}
            {c.value !== "all" && <span className="ml-1 opacity-60">({videos.filter((v) => c.value === "all" || v.category === c.value).length})</span>}
          </button>
        ))}
      </div>

      <div className="flex gap-6">
        {/* Sidebar: Folders */}
        <div className="w-48 flex-shrink-0">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-muted-foreground uppercase">Folders</span>
            <button onClick={() => setShowNewFolder(true)} className="text-muted-foreground hover:text-primary">
              <FolderPlus className="w-4 h-4" />
            </button>
          </div>

          <button onClick={() => setFilterFolder(null)} className={`flex items-center gap-2 w-full text-left px-2 py-1.5 rounded text-sm transition-colors ${filterFolder === null ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-muted"}`}>
            <Folder className="w-4 h-4" /> All Videos
          </button>
          <button onClick={() => setFilterFolder("__none__")} className={`flex items-center gap-2 w-full text-left px-2 py-1.5 rounded text-sm transition-colors ${filterFolder === "__none__" ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-muted"}`}>
            <Folder className="w-4 h-4" /> Uncategorized
          </button>

          {folders.map((f) => (
            <div key={f.id} className="group flex items-center">
              <button onClick={() => setFilterFolder(f.id)} className={`flex items-center gap-2 flex-1 text-left px-2 py-1.5 rounded text-sm transition-colors ${filterFolder === f.id ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-muted"}`}>
                <Folder className="w-4 h-4" style={{ color: f.color }} /> {f.name}
                <span className="text-[10px] opacity-50">{f.video_count || 0}</span>
              </button>
              <button onClick={() => handleDeleteFolder(f.id)} className="hidden group-hover:block text-destructive p-1">
                <Trash2 className="w-3 h-3" />
              </button>
            </div>
          ))}

          {showNewFolder && (
            <div className="flex items-center gap-1 mt-1">
              <Input value={newFolderName} onChange={(e) => setNewFolderName(e.target.value)} placeholder="Folder name" className="h-7 text-xs" autoFocus onKeyDown={(e) => e.key === "Enter" && handleCreateFolder()} />
              <button onClick={handleCreateFolder} className="text-primary"><Plus className="w-4 h-4" /></button>
              <button onClick={() => setShowNewFolder(false)} className="text-muted-foreground"><X className="w-4 h-4" /></button>
            </div>
          )}
        </div>

        {/* Main: Video grid/list */}
        <div className="flex-1 min-w-0">
          {loadingLib ? (
            <div className="flex items-center justify-center py-16"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-16 text-muted-foreground">
              <Film className="w-10 h-10 mx-auto mb-3 opacity-40" />
              <p>{searchQuery || filterCategory !== "all" || filterFolder ? "No videos match your filters." : "No videos yet. Upload one above."}</p>
            </div>
          ) : viewMode === "grid" ? (
            <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
              {filtered.map((v) => (
                <Link key={v.id} href={`/dashboard/videos/${v.id}`}>
                  <div className="group rounded-xl border border-border hover:border-primary/40 transition-all overflow-hidden bg-card">
                    <div className="aspect-video bg-black relative">
                      {v.posterUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={v.posterUrl} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center"><Play className="w-8 h-8 text-muted-foreground" /></div>
                      )}
                      {v.duration > 0 && (
                        <span className="absolute bottom-2 right-2 bg-black/70 text-white text-[10px] px-1.5 py-0.5 rounded">{formatDuration(v.duration)}</span>
                      )}
                      <Badge variant={v.status === "ready" ? "success" : v.status === "processing" ? "warning" : "error"} className="absolute top-2 left-2 text-[10px]">
                        {v.status}
                      </Badge>
                    </div>
                    <div className="p-3">
                      <p className="text-sm font-medium truncate">{v.title}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <span className={`text-[10px] px-1.5 py-0.5 rounded-full border ${getCatStyle(v.category)}`}>{v.category}</span>
                        <span className="text-[10px] text-muted-foreground">{formatDate(v.createdAt)}</span>
                      </div>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <div className="space-y-2">
              {filtered.map((v) => (
                <Link key={v.id} href={`/dashboard/videos/${v.id}`}>
                  <div className="flex items-center gap-4 p-3 rounded-lg border border-border hover:border-primary/40 transition-colors">
                    <div className="w-24 h-14 bg-black rounded flex-shrink-0 overflow-hidden flex items-center justify-center">
                      {v.posterUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={v.posterUrl} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <Play className="w-5 h-5 text-muted-foreground" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{v.title}</p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className={`text-[10px] px-1.5 py-0.5 rounded-full border ${getCatStyle(v.category)}`}>{v.category}</span>
                        {v.duration > 0 && <span className="text-xs text-muted-foreground flex items-center gap-1"><Clock className="w-3 h-3" />{formatDuration(v.duration)}</span>}
                        <span className="text-xs text-muted-foreground">{formatDate(v.createdAt)}</span>
                      </div>
                    </div>
                    <Badge variant={v.status === "ready" ? "success" : v.status === "processing" ? "warning" : "error"} className="text-[10px]">
                      {v.status}
                    </Badge>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
