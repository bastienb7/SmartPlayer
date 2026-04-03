"use client";

import { use, useEffect, useState } from "react";
import { Card, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Save, Loader2, Check, AlertCircle, Sliders, Play, Pause,
  Monitor, Smartphone, Maximize2, Minimize2, RotateCcw, Wifi, EyeOff,
} from "lucide-react";
import { api } from "@/lib/api-client";

// ─── Types ────────────────────────────────────────────────────────────────────

type StartupQuality = "auto" | "low" | "medium" | "high";

interface PlaybackConfig {
  smartPause: boolean;
  restartAfterEnd: boolean;
  startupQuality: StartupQuality;
  focusedFullscreen: {
    enableDesktop: boolean;
    enableMobile: boolean;
    expandOnPlay: boolean;
    minimizeOnPause: boolean;
  };
}

const defaultConfig: PlaybackConfig = {
  smartPause: true,
  restartAfterEnd: false,
  startupQuality: "auto",
  focusedFullscreen: {
    enableDesktop: false,
    enableMobile: false,
    expandOnPlay: false,
    minimizeOnPause: false,
  },
};

// ─── Toggle ───────────────────────────────────────────────────────────────────

function Toggle({ label, description, enabled, onToggle, icon }: {
  label: string; description: string; enabled: boolean;
  onToggle: (v: boolean) => void; icon?: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between py-3.5 border-b border-border last:border-0">
      <div className="flex items-center gap-3">
        {icon && <span className="text-muted-foreground flex-shrink-0">{icon}</span>}
        <div>
          <div className="font-medium text-sm">{label}</div>
          <div className="text-xs text-muted-foreground">{description}</div>
        </div>
      </div>
      <button
        onClick={() => onToggle(!enabled)}
        className={`relative w-11 h-6 rounded-full transition-colors flex-shrink-0 ml-4 ${enabled ? "bg-primary" : "bg-muted"}`}
      >
        <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full transition-transform ${enabled ? "translate-x-5" : ""}`} />
      </button>
    </div>
  );
}

// ─── Quality selector ─────────────────────────────────────────────────────────

const qualityOptions: { value: StartupQuality; label: string; badge: string; description: string }[] = [
  { value: "auto", label: "Automatic", badge: "AUTO", description: "Best quality for the viewer's connection speed" },
  { value: "low", label: "Low — 360p", badge: "360p", description: "Fastest load, ideal for slow connections" },
  { value: "medium", label: "Medium — 480p", badge: "480p", description: "Balance between quality and performance" },
  { value: "high", label: "High — 720p+", badge: "720p", description: "Maximum visual quality when available" },
];

// ─── Live Preview ─────────────────────────────────────────────────────────────

function PlaybackPreview({ config, posterUrl }: { config: PlaybackConfig; posterUrl: string }) {
  const [state, setState] = useState<"playing" | "paused" | "ended" | "tabswitched" | "fullscreen">("paused");

  const qualityBadge = qualityOptions.find((q) => q.value === config.startupQuality)?.badge || "AUTO";

  return (
    <div className="space-y-4">
      {/* Simulated player */}
      <div className="relative w-full rounded-xl overflow-hidden bg-black" style={{ aspectRatio: "16/9" }}>
        {posterUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={posterUrl} alt="" className={`absolute inset-0 w-full h-full object-cover transition-all duration-500 ${state === "tabswitched" ? "opacity-40 blur-sm" : "opacity-100"}`} />
        ) : (
          <div className="absolute inset-0 bg-gradient-to-br from-gray-900 to-gray-800" />
        )}

        {/* Quality badge */}
        <div className="absolute top-3 right-3 z-20">
          <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-black/70 text-white/80 font-mono">{qualityBadge}</span>
        </div>

        {/* Smart Pause overlay */}
        {state === "tabswitched" && config.smartPause && (
          <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-2 bg-black/60">
            <EyeOff className="w-8 h-8 text-white/70" />
            <p className="text-white text-sm font-medium">Paused — tab not active</p>
            <p className="text-white/50 text-xs">Will resume when you return</p>
          </div>
        )}

        {/* Ended overlay */}
        {state === "ended" && (
          <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-3 bg-black/70">
            {config.restartAfterEnd ? (
              <>
                <RotateCcw className="w-8 h-8 text-primary animate-spin" style={{ animationDuration: "2s" }} />
                <p className="text-white text-sm font-medium">Restarting…</p>
              </>
            ) : (
              <>
                <div className="w-14 h-14 rounded-full bg-white/10 flex items-center justify-center">
                  <RotateCcw className="w-6 h-6 text-white/60" />
                </div>
                <p className="text-white/70 text-sm">Video ended</p>
              </>
            )}
          </div>
        )}

        {/* Focused fullscreen expand hint */}
        {state === "fullscreen" && (
          <div className="absolute inset-0 z-10 flex items-center justify-center bg-black/40">
            <div className="border-2 border-white/30 rounded-lg w-[85%] h-[80%] flex items-center justify-center">
              <p className="text-white/70 text-xs">Focused fullscreen active</p>
            </div>
          </div>
        )}

        {/* Controls bar */}
        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent px-3 pb-2 pt-4">
          <div className="h-1 rounded-full bg-white/20 mb-2">
            <div className="h-full w-[35%] rounded-full bg-primary" />
          </div>
          <div className="flex items-center gap-2 text-white/80">
            <button onClick={() => setState(state === "playing" ? "paused" : "playing")}>
              {state === "playing"
                ? <Pause className="w-4 h-4" fill="currentColor" />
                : <Play className="w-4 h-4" fill="currentColor" />}
            </button>
            <span className="text-xs font-mono">1:45 / 5:02</span>
            <div className="flex-1" />
            <Maximize2 className="w-3.5 h-3.5" />
          </div>
        </div>
      </div>

      {/* Simulation buttons */}
      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => setState("playing")}
          className={`text-xs px-3 py-1.5 rounded-lg border transition-colors ${state === "playing" ? "border-primary bg-primary/10 text-primary" : "border-border hover:border-primary/40"}`}
        >
          ▶ Play
        </button>
        <button
          onClick={() => setState("paused")}
          className={`text-xs px-3 py-1.5 rounded-lg border transition-colors ${state === "paused" ? "border-primary bg-primary/10 text-primary" : "border-border hover:border-primary/40"}`}
        >
          ⏸ Pause {config.focusedFullscreen.minimizeOnPause ? "→ minimize" : ""}
        </button>
        {config.smartPause && (
          <button
            onClick={() => setState("tabswitched")}
            className={`text-xs px-3 py-1.5 rounded-lg border transition-colors ${state === "tabswitched" ? "border-amber-500 bg-amber-500/10 text-amber-400" : "border-border hover:border-amber-500/40"}`}
          >
            🔀 Switch tab
          </button>
        )}
        <button
          onClick={() => setState("ended")}
          className={`text-xs px-3 py-1.5 rounded-lg border transition-colors ${state === "ended" ? "border-primary bg-primary/10 text-primary" : "border-border hover:border-primary/40"}`}
        >
          ⏹ End video {config.restartAfterEnd ? "→ restart" : ""}
        </button>
        {(config.focusedFullscreen.enableDesktop || config.focusedFullscreen.enableMobile) && (
          <button
            onClick={() => setState("fullscreen")}
            className={`text-xs px-3 py-1.5 rounded-lg border transition-colors ${state === "fullscreen" ? "border-primary bg-primary/10 text-primary" : "border-border hover:border-primary/40"}`}
          >
            ⛶ Fullscreen
          </button>
        )}
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function PlaybackOptionsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [config, setConfig] = useState<PlaybackConfig>(defaultConfig);
  const [posterUrl, setPosterUrl] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");

  const set = (key: keyof PlaybackConfig, value: any) =>
    setConfig((c) => ({ ...c, [key]: value }));

  const setFF = (key: keyof PlaybackConfig["focusedFullscreen"], value: boolean) =>
    setConfig((c) => ({ ...c, focusedFullscreen: { ...c.focusedFullscreen, [key]: value } }));

  useEffect(() => {
    Promise.all([
      api.getPlayerConfig(id),
      api.getVideo(id).catch(() => null),
    ]).then(([player, videoData]) => {
      if (player.playbackConfig && typeof player.playbackConfig === "object") {
        setConfig({ ...defaultConfig, ...player.playbackConfig, focusedFullscreen: { ...defaultConfig.focusedFullscreen, ...player.playbackConfig.focusedFullscreen } });
      }
      const v = videoData?.video || videoData;
      if (v) setPosterUrl(v.posterUrl || v.poster_url || "");
    })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [id]);

  const handleSave = async () => {
    setSaving(true);
    setError("");
    try {
      await api.updatePlayerConfig(id, { playbackConfig: config });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const ffEnabled = config.focusedFullscreen.enableDesktop || config.focusedFullscreen.enableMobile;

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Sliders className="w-6 h-6 text-primary" /> Playback Options
          </h1>
          <p className="text-muted-foreground">Fine-tune how the video behaves during and after playback.</p>
        </div>
        <Button onClick={handleSave} disabled={saving}>
          {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : saved ? <Check className="w-4 h-4 mr-2" /> : <Save className="w-4 h-4 mr-2" />}
          {saved ? "Saved!" : "Save"}
        </Button>
      </div>

      {error && (
        <div className="flex items-center gap-2 p-3 rounded-lg bg-destructive/10 border border-destructive/30 text-destructive text-sm">
          <AlertCircle className="w-4 h-4" /> {error}
        </div>
      )}

      <div className="grid grid-cols-1 xl:grid-cols-[1fr_400px] gap-6 items-start">

        {/* ── LEFT: Settings ──────────────────────────────────────────────── */}
        <div className="flex flex-col gap-6">

          {/* GENERAL BEHAVIOR */}
          <Card>
            <CardTitle className="mb-4">General Behavior</CardTitle>
            <CardContent>
              <Toggle
                label="Smart Pause"
                description="Automatically pauses when the viewer switches tabs and resumes when they return"
                enabled={config.smartPause}
                onToggle={(v) => set("smartPause", v)}
                icon={<EyeOff className="w-4 h-4" />}
              />
              <Toggle
                label="Restart After End"
                description="The video loops back to the beginning automatically once it finishes"
                enabled={config.restartAfterEnd}
                onToggle={(v) => set("restartAfterEnd", v)}
                icon={<RotateCcw className="w-4 h-4" />}
              />
            </CardContent>
          </Card>

          {/* STARTUP QUALITY */}
          <Card>
            <CardTitle className="mb-1 flex items-center gap-2">
              <Wifi className="w-5 h-5 text-primary" /> Video Startup Quality
            </CardTitle>
            <p className="text-sm text-muted-foreground mb-4 px-0">
              Defines the quality at which the video starts. May adjust automatically based on the viewer's connection.
            </p>
            <CardContent>
              <div className="space-y-2">
                {qualityOptions.map((opt) => (
                  <button
                    key={opt.value}
                    onClick={() => set("startupQuality", opt.value)}
                    className={`w-full flex items-center gap-3 p-3 rounded-lg border text-left transition-all ${config.startupQuality === opt.value ? "border-primary bg-primary/5" : "border-border hover:border-primary/30"}`}
                  >
                    <div className={`w-4 h-4 rounded-full border-2 flex-shrink-0 flex items-center justify-center ${config.startupQuality === opt.value ? "border-primary" : "border-muted-foreground/40"}`}>
                      {config.startupQuality === opt.value && <div className="w-2 h-2 rounded-full bg-primary" />}
                    </div>
                    <span className={`text-xs font-mono font-bold w-10 flex-shrink-0 ${config.startupQuality === opt.value ? "text-primary" : "text-muted-foreground"}`}>
                      {opt.badge}
                    </span>
                    <div>
                      <div className="text-sm font-medium">{opt.label}</div>
                      <div className="text-xs text-muted-foreground">{opt.description}</div>
                    </div>
                  </button>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* FOCUSED FULLSCREEN */}
          <Card>
            <CardTitle className="mb-1 flex items-center gap-2">
              <Maximize2 className="w-5 h-5 text-primary" /> Focused Fullscreen
            </CardTitle>
            <p className="text-sm text-muted-foreground mb-4">
              Displays the video in a custom fullscreen, offering more control over the viewing experience.
            </p>
            <CardContent>
              <Toggle
                label="Enable on Desktop"
                description="Activates focused fullscreen for desktop viewers"
                enabled={config.focusedFullscreen.enableDesktop}
                onToggle={(v) => setFF("enableDesktop", v)}
                icon={<Monitor className="w-4 h-4" />}
              />
              <Toggle
                label="Enable on Mobile"
                description="Activates focused fullscreen for mobile viewers"
                enabled={config.focusedFullscreen.enableMobile}
                onToggle={(v) => setFF("enableMobile", v)}
                icon={<Smartphone className="w-4 h-4" />}
              />
              {ffEnabled && (
                <>
                  <Toggle
                    label="Expand On Play"
                    description="Automatically expands to fullscreen the moment play is pressed"
                    enabled={config.focusedFullscreen.expandOnPlay}
                    onToggle={(v) => setFF("expandOnPlay", v)}
                    icon={<Maximize2 className="w-4 h-4" />}
                  />
                  <Toggle
                    label="Minimize On Pause"
                    description="Collapses the player back to its normal size when the viewer pauses"
                    enabled={config.focusedFullscreen.minimizeOnPause}
                    onToggle={(v) => setFF("minimizeOnPause", v)}
                    icon={<Minimize2 className="w-4 h-4" />}
                  />
                </>
              )}
            </CardContent>
          </Card>
        </div>

        {/* ── RIGHT: Sticky live preview ─────────────────────────────────── */}
        <div className="xl:sticky xl:top-6">
          <Card className="overflow-hidden">
            <div className="px-4 pt-4 pb-3 flex items-center justify-between border-b border-border">
              <span className="text-sm font-semibold">Live Preview</span>
              <span className="text-xs text-muted-foreground">Click buttons to simulate</span>
            </div>
            <div className="p-4">
              <PlaybackPreview config={config} posterUrl={posterUrl} />
            </div>
            <div className="px-4 py-3 border-t border-border bg-muted/20">
              <div className="flex flex-wrap gap-2">
                {config.smartPause && <span className="text-[10px] font-medium px-2 py-0.5 rounded-full border bg-blue-500/10 text-blue-400 border-blue-500/20">Smart Pause</span>}
                {config.restartAfterEnd && <span className="text-[10px] font-medium px-2 py-0.5 rounded-full border bg-violet-500/10 text-violet-400 border-violet-500/20">Auto Restart</span>}
                {config.startupQuality !== "auto" && <span className="text-[10px] font-medium px-2 py-0.5 rounded-full border bg-amber-500/10 text-amber-400 border-amber-500/20">Quality: {qualityOptions.find(q => q.value === config.startupQuality)?.badge}</span>}
                {ffEnabled && <span className="text-[10px] font-medium px-2 py-0.5 rounded-full border bg-emerald-500/10 text-emerald-400 border-emerald-500/20">Focused Fullscreen</span>}
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
